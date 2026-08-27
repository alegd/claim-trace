import { DRAFT } from "../src/lib/fixture";
import { extractClaims } from "../src/lib/pipeline/claims";

async function runProbe(): Promise<void> {
  const startedAt = Date.now();
  const claims = await extractClaims(DRAFT);
  console.log(`${claims.length} claims in ${Date.now() - startedAt}ms`);
  for (const claim of claims) {
    console.log(`${claim.id}: ${claim.text}`);
  }
}

runProbe();
