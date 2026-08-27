import { chunkTranscript } from "./chunks";
import { extractClaims } from "./claims";
import { retrieve } from "./retrieve";
import { locateQuote, type Span } from "./spans";
import { verifyClaims, type Verdict } from "./verify";

export interface AuditedClaim {
  id: string;
  text: string;
  verdict: Verdict;
  quote: string | null;
  reasoning: string;
  span: Span | null;
}

export interface AuditResult {
  claims: AuditedClaim[];
}

const MAX_CLAIMS = 40;

export async function runAudit(transcript: string, draft: string): Promise<AuditResult> {
  const chunks = chunkTranscript(transcript);
  const claims = await extractClaims(draft);

  if (claims.length > MAX_CLAIMS) {
    throw new Error(
      `The draft produced ${claims.length} claims, above the limit of ${MAX_CLAIMS}. Verification is one model call per claim, so the work is capped rather than truncated.`
    );
  }

  const retrievals = await retrieve(claims, chunks);
  const verifications = await verifyClaims(claims, retrievals);

  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]));

  return {
    claims: verifications.map((verification) => {
      const claim = claimsById.get(verification.claimId);
      if (claim === undefined) {
        throw new Error(`Verification references unknown claim ${verification.claimId}`);
      }

      const chunk =
        verification.chunkId === null ? undefined : chunksById.get(verification.chunkId);

      return {
        id: claim.id,
        text: claim.text,
        verdict: verification.verdict,
        quote: verification.quote,
        reasoning: verification.reasoning,
        span:
          verification.quote !== null && chunk !== undefined
            ? locateQuote(verification.quote, chunk)
            : null
      };
    })
  };
}
