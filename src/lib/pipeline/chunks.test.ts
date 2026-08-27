import { describe, expect, test } from "vitest";
import { TRANSCRIPT } from "../fixture";
import { chunkTranscript } from "./chunks";

describe("chunkTranscript", () => {
  test("every chunk slices back to its own text from the original transcript", () => {
    const chunks = chunkTranscript(TRANSCRIPT);

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(TRANSCRIPT.slice(chunk.start, chunk.end)).toBe(chunk.text);
    }
  });

  test("splits the transcript into one chunk per speaker turn", () => {
    expect(chunkTranscript(TRANSCRIPT)).toHaveLength(10);
  });

  test("records the speaker of each turn without leaving the label in the text", () => {
    const [firstTurn, secondTurn] = chunkTranscript(TRANSCRIPT);

    expect(firstTurn.speaker).toBe("ANALYST");
    expect(firstTurn.text).toBe(
      "How did the cost per delivery evolve between 2021 and 2023?",
    );
    expect(secondTurn.speaker).toBe("EXPERT");
    expect(secondTurn.text.startsWith("In 2021 we were at around 4.80")).toBe(
      true,
    );
  });

  test("gives every chunk a distinct id", () => {
    const ids = chunkTranscript(TRANSCRIPT).map((chunk) => chunk.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test("returns no chunks for a transcript with no speaker turns", () => {
    expect(chunkTranscript("   ")).toEqual([]);
  });
});
