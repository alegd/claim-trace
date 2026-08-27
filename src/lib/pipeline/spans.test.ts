import { describe, expect, test } from "vitest";
import { TRANSCRIPT } from "../fixture";
import { chunkTranscript, type Chunk } from "./chunks";
import { locateQuote } from "./spans";

const TYPOGRAPHIC_TRANSCRIPT = `ANALYST: opening question?

EXPERT: He said “we    cut
costs” and it stuck.`;

const DRIFTING_TRANSCRIPT = `ANALYST: opening question?

EXPERT: We raised the variable pay tied to completed deliveries and we changed the morning shift.`;

function getSecondTurn(transcript: string): Chunk {
  return chunkTranscript(transcript)[1];
}

describe("locateQuote", () => {
  test("finds a quote copied verbatim and reports exact confidence", () => {
    const chunk = chunkTranscript(TRANSCRIPT)[1];
    const quote = "4.80 euros per delivery in urban zones";

    const span = locateQuote(quote, chunk);

    expect(span.confidence).toBe("exact");
    expect(TRANSCRIPT.slice(span.start, span.end)).toBe(quote);
  });

  test("finds a quote whose typographic quotes were normalised, mapping back to the original characters", () => {
    const chunk = getSecondTurn(TYPOGRAPHIC_TRANSCRIPT);
    const quote = 'He said "we cut costs" and it stuck.';

    const span = locateQuote(quote, chunk);

    expect(span.confidence).toBe("exact");
    expect(TYPOGRAPHIC_TRANSCRIPT.slice(span.start, span.end)).toBe(
      "He said “we    cut\ncosts” and it stuck."
    );
  });

  test("falls back to the best overlapping window when the quote drifted from the source", () => {
    const chunk = getSecondTurn(DRIFTING_TRANSCRIPT);
    const quote = "We raised variable pay tied to completed deliveries";

    const span = locateQuote(quote, chunk);

    expect(span.confidence).toBe("fuzzy");
    expect(DRIFTING_TRANSCRIPT.slice(span.start, span.end)).toBe(
      "We raised the variable pay tied to completed deliveries"
    );
  });

  test("falls back to the whole chunk when the quote overlaps nothing", () => {
    const chunk = getSecondTurn(DRIFTING_TRANSCRIPT);

    const span = locateQuote("entirely unrelated wording about something else", chunk);

    expect(span.confidence).toBe("chunk");
    expect(span.start).toBe(chunk.start);
    expect(span.end).toBe(chunk.end);
    expect(DRIFTING_TRANSCRIPT.slice(span.start, span.end)).toBe(chunk.text);
  });
});
