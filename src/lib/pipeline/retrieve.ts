import { cosineSimilarity } from "ai";
import { embed } from "../llm";
import type { Claim } from "./claims";
import type { Chunk } from "./chunks";

const TOP_K = 4;

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

export interface Retrieval {
  claimId: string;
  chunks: ScoredChunk[];
}

export async function retrieve(
  claims: Claim[],
  chunks: Chunk[],
  topK: number = TOP_K
): Promise<Retrieval[]> {
  if (claims.length === 0 || chunks.length === 0) {
    return claims.map((claim) => ({ claimId: claim.id, chunks: [] }));
  }

  const vectors = await embed([
    ...claims.map((claim) => claim.text),
    ...chunks.map((chunk) => chunk.text)
  ]);
  const claimVectors = vectors.slice(0, claims.length);
  const chunkVectors = vectors.slice(claims.length);

  return claims.map((claim, claimIndex) => ({
    claimId: claim.id,
    chunks: chunks
      .map((chunk, chunkIndex) => ({
        chunk,
        score: cosineSimilarity(claimVectors[claimIndex], chunkVectors[chunkIndex])
      }))
      .sort((first, second) => second.score - first.score)
      .slice(0, topK)
  }));
}
