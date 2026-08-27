import { complete } from "../llm";

export interface Claim {
  id: string;
  text: string;
}

const SEGMENTATION_SYSTEM = `You split a draft into the factual claims it makes, so that each one can be checked against a source document.

Rules:
- The unit is the sentence. Every sentence that asserts something checkable becomes exactly one claim. Do not decompose a sentence further, even when it bundles several facts: the reader audits the draft as written, sentence by sentence.
- Keep the sentence's own wording. Copy figures, percentages, currency amounts, dates and proper nouns exactly as they appear. Never round, convert, normalise or rephrase them.
- Resolve a pronoun only when the sentence would otherwise be unintelligible on its own.
- Skip sentences that are questions, or pure opinion that asserts nothing checkable.
- Preserve the reading order of the draft.

Return only JSON of the form {"claims":[{"id":"c1","text":"..."}]}, with ids c1, c2, c3 in order. No prose, no markdown, no explanation.`;

function parseClaim(value: unknown, index: number): Claim {
  const candidate = value as Partial<Claim> | null;
  if (typeof candidate?.id !== "string" || typeof candidate?.text !== "string") {
    throw new Error(
      `Claim segmentation returned a malformed claim at position ${index}: ${JSON.stringify(value)}`
    );
  }
  return { id: candidate.id, text: candidate.text };
}

export async function extractClaims(draft: string): Promise<Claim[]> {
  if (draft.trim().length === 0) return [];

  const raw = await complete(SEGMENTATION_SYSTEM, draft);
  const parsed: unknown = JSON.parse(raw);
  const claims = (parsed as { claims?: unknown })?.claims;

  if (!Array.isArray(claims)) {
    throw new Error(`Claim segmentation returned no claims array. Received: ${raw.slice(0, 200)}`);
  }

  return claims.map(parseClaim);
}
