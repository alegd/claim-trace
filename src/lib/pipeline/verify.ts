import { complete } from "../llm";
import type { Claim } from "./claims";
import type { Retrieval, ScoredChunk } from "./retrieve";

export type Verdict = "supported" | "partial" | "unsupported";

export interface Verification {
  claimId: string;
  verdict: Verdict;
  chunkId: string | null;
  quote: string | null;
  reasoning: string;
}

const CONCURRENCY_LIMIT = 4;
const VERDICTS: readonly string[] = ["supported", "partial", "unsupported"];

const VERIFICATION_SYSTEM = `You audit a single CLAIM against the SOURCE PASSAGES taken from a transcript.

Choose exactly one verdict:
- "supported": one passage states the claim, including any figure it carries.
- "partial": one passage supports part of the claim but not all of it. The direction is right while a figure, date or qualifier is missing, unstated or different.
- "unsupported": no passage states the claim. Use this when the claim is only an inference drawn across several passages, however reasonable that inference is.

Rules:
- Judge only against the passages given. Never use outside knowledge.
- Support must come from a single passage. Do not combine passages to build it.
- "quote" is copied from that passage character for character. Do not normalise punctuation, correct spelling, expand anything or cut a word in half.
- When the verdict is "unsupported", set "chunkId" and "quote" to null.
- Never invent character offsets or positions. You return text, never indices.
- "reasoning" is a single sentence.

Return only JSON of the form {"verdict":"...","chunkId":"...","quote":"...","reasoning":"..."}. No prose, no markdown, no explanation.`;

function isVerdict(value: unknown): value is Verdict {
  return typeof value === "string" && VERDICTS.includes(value);
}

function buildVerificationPrompt(claim: Claim, chunks: ScoredChunk[]): string {
  const passages = chunks
    .map((scored) => `[${scored.chunk.id}] ${scored.chunk.speaker}: ${scored.chunk.text}`)
    .join("\n\n");

  return `CLAIM:\n${claim.text}\n\nSOURCE PASSAGES:\n${passages}`;
}

function parseVerification(raw: string, claimId: string): Verification {
  const parsed = JSON.parse(raw) as Record<string, unknown> | null;

  if (!isVerdict(parsed?.verdict)) {
    throw new Error(
      `Verification of ${claimId} returned an unknown verdict: ${JSON.stringify(parsed?.verdict)}`
    );
  }
  if (typeof parsed?.reasoning !== "string") {
    throw new Error(`Verification of ${claimId} returned no reasoning`);
  }

  return {
    claimId,
    verdict: parsed.verdict,
    chunkId: typeof parsed.chunkId === "string" ? parsed.chunkId : null,
    quote: typeof parsed.quote === "string" ? parsed.quote : null,
    reasoning: parsed.reasoning
  };
}

async function verifyClaim(claim: Claim, chunks: ScoredChunk[]): Promise<Verification> {
  if (chunks.length === 0) {
    return {
      claimId: claim.id,
      verdict: "unsupported",
      chunkId: null,
      quote: null,
      reasoning: "No source passage was retrieved for this claim."
    };
  }

  const raw = await complete(VERIFICATION_SYSTEM, buildVerificationPrompt(claim, chunks));
  return parseVerification(raw, claim.id);
}

export async function verifyClaims(
  claims: Claim[],
  retrievals: Retrieval[]
): Promise<Verification[]> {
  const chunksByClaim = new Map(
    retrievals.map((retrieval) => [retrieval.claimId, retrieval.chunks])
  );
  const verifications: Verification[] = [];

  for (let i = 0; i < claims.length; i += CONCURRENCY_LIMIT) {
    const batch = claims.slice(i, i + CONCURRENCY_LIMIT);
    const verified = await Promise.all(
      batch.map((claim) => verifyClaim(claim, chunksByClaim.get(claim.id) ?? []))
    );
    verifications.push(...verified);
  }

  return verifications;
}
