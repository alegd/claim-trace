import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Chunk } from "./chunks";
import { retrieve } from "./retrieve";

const { embed } = vi.hoisted(() => ({ embed: vi.fn() }));

vi.mock("../llm", () => ({ embed }));

function buildChunk(id: string, text: string): Chunk {
  return { id, speaker: "EXPERT", text, start: 0, end: text.length };
}

const IDENTICAL_TO_CLAIM = [1, 0];
const ORTHOGONAL_TO_CLAIM = [0, 1];
const PARTIALLY_ALIGNED_TO_CLAIM = [0.6, 0.8];

describe("retrieve", () => {
  beforeEach(() => {
    embed.mockReset();
  });

  test("ranks chunks by cosine similarity to the claim, closest first", async () => {
    embed.mockResolvedValue([
      IDENTICAL_TO_CLAIM,
      ORTHOGONAL_TO_CLAIM,
      PARTIALLY_ALIGNED_TO_CLAIM,
      IDENTICAL_TO_CLAIM,
    ]);

    const [retrieval] = await retrieve(
      [{ id: "c1", text: "the claim" }],
      [
        buildChunk("k1", "orthogonal turn"),
        buildChunk("k2", "partially aligned turn"),
        buildChunk("k3", "identical turn"),
      ],
    );

    expect(retrieval.claimId).toBe("c1");
    expect(retrieval.chunks.map((scored) => scored.chunk.id)).toEqual([
      "k3",
      "k2",
      "k1",
    ]);
  });

  test("scores an identical vector at 1 and an orthogonal vector at 0", async () => {
    embed.mockResolvedValue([
      IDENTICAL_TO_CLAIM,
      IDENTICAL_TO_CLAIM,
      ORTHOGONAL_TO_CLAIM,
    ]);

    const [retrieval] = await retrieve(
      [{ id: "c1", text: "the claim" }],
      [buildChunk("k1", "identical turn"), buildChunk("k2", "orthogonal turn")],
    );

    expect(retrieval.chunks[0].score).toBeCloseTo(1);
    expect(retrieval.chunks[1].score).toBeCloseTo(0);
  });

  test("returns at most k chunks per claim", async () => {
    embed.mockResolvedValue([
      IDENTICAL_TO_CLAIM,
      IDENTICAL_TO_CLAIM,
      PARTIALLY_ALIGNED_TO_CLAIM,
      ORTHOGONAL_TO_CLAIM,
    ]);

    const [retrieval] = await retrieve(
      [{ id: "c1", text: "the claim" }],
      [
        buildChunk("k1", "one"),
        buildChunk("k2", "two"),
        buildChunk("k3", "three"),
      ],
      2,
    );

    expect(retrieval.chunks).toHaveLength(2);
  });

  test("embeds claims and chunks in a single batch", async () => {
    embed.mockResolvedValue([
      IDENTICAL_TO_CLAIM,
      IDENTICAL_TO_CLAIM,
      ORTHOGONAL_TO_CLAIM,
    ]);

    await retrieve(
      [{ id: "c1", text: "the claim" }],
      [buildChunk("k1", "first turn"), buildChunk("k2", "second turn")],
    );

    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed).toHaveBeenCalledWith([
      "the claim",
      "first turn",
      "second turn",
    ]);
  });

  test("does not call the embedding model when there are no claims", async () => {
    const retrievals = await retrieve([], [buildChunk("k1", "a turn")]);

    expect(embed).not.toHaveBeenCalled();
    expect(retrievals).toEqual([]);
  });

  test("does not call the embedding model when there are no chunks", async () => {
    const retrievals = await retrieve([{ id: "c1", text: "the claim" }], []);

    expect(embed).not.toHaveBeenCalled();
    expect(retrievals).toEqual([{ claimId: "c1", chunks: [] }]);
  });
});
