import { DRAFT, TRANSCRIPT } from "../src/lib/fixture";
import { chunkTranscript } from "../src/lib/pipeline/chunks";
import { extractClaims } from "../src/lib/pipeline/claims";
import { retrieve } from "../src/lib/pipeline/retrieve";

const PREVIEW_LENGTH = 90;

async function runProbe(): Promise<void> {
  const chunks = chunkTranscript(TRANSCRIPT);
  const claims = await extractClaims(DRAFT);
  const retrievals = await retrieve(claims, chunks);

  console.log(`${chunks.length} chunks, ${claims.length} claims`);

  for (const retrieval of retrievals) {
    const claim = claims.find((candidate) => candidate.id === retrieval.claimId);
    console.log(`\n${retrieval.claimId}: ${claim?.text}`);
    for (const scored of retrieval.chunks) {
      console.log(
        `  ${scored.score.toFixed(3)} [${scored.chunk.id} ${scored.chunk.speaker} ${scored.chunk.start}-${scored.chunk.end}] ${scored.chunk.text.slice(0, PREVIEW_LENGTH)}`,
      );
    }
  }
}

runProbe();
