import { DRAFT, TRANSCRIPT } from "../src/lib/fixture";
import { chunkTranscript } from "../src/lib/pipeline/chunks";
import { extractClaims } from "../src/lib/pipeline/claims";
import { retrieve } from "../src/lib/pipeline/retrieve";
import { verifyClaims } from "../src/lib/pipeline/verify";

async function runProbe(): Promise<void> {
  const startedAt = Date.now();
  const chunks = chunkTranscript(TRANSCRIPT);
  const claims = await extractClaims(DRAFT);
  const retrievals = await retrieve(claims, chunks);
  const verifications = await verifyClaims(claims, retrievals);

  console.log(`${chunks.length} chunks, ${claims.length} claims, ${Date.now() - startedAt}ms\n`);

  for (const retrieval of retrievals) {
    const scores = retrieval.chunks
      .map((scored) => `${scored.chunk.id} ${scored.score.toFixed(3)}`)
      .join("  ");
    console.log(`${retrieval.claimId} retrieved: ${scores}`);
  }
  console.log("");

  for (const verification of verifications) {
    const claim = claims.find((candidate) => candidate.id === verification.claimId);
    console.log(`${verification.claimId} ${verification.verdict.toUpperCase()}`);
    console.log(`  claim:  ${claim?.text}`);
    console.log(`  chunk:  ${verification.chunkId ?? "-"}`);
    console.log(`  quote:  ${verification.quote ?? "-"}`);
    console.log(`  why:    ${verification.reasoning}\n`);
  }

  console.log(verifications.map((verification) => verification.verdict).join(", "));
}

runProbe();
