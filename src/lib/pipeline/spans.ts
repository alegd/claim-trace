import type { Chunk } from "./chunks";

export type SpanConfidence = "exact" | "fuzzy" | "chunk";

export interface Span {
  start: number;
  end: number;
  confidence: SpanConfidence;
}

const FUZZY_THRESHOLD = 0.75;

const TYPOGRAPHIC_REPLACEMENTS: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-"
};

interface NormalisedText {
  text: string;
  sourceOffsets: number[];
}

interface Token {
  text: string;
  start: number;
  end: number;
}

function normalise(text: string): NormalisedText {
  const characters: string[] = [];
  const sourceOffsets: number[] = [];
  let previousWasWhitespace = false;

  for (let i = 0; i < text.length; i++) {
    const original = text[i];

    if (/\s/.test(original)) {
      if (!previousWasWhitespace) {
        characters.push(" ");
        sourceOffsets.push(i);
      }
      previousWasWhitespace = true;
      continue;
    }

    previousWasWhitespace = false;
    for (const character of (TYPOGRAPHIC_REPLACEMENTS[original] ?? original).toLowerCase()) {
      characters.push(character);
      sourceOffsets.push(i);
    }
  }

  return { text: characters.join(""), sourceOffsets };
}

function tokenize(text: string): Token[] {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    text: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length
  }));
}

function locateNormalised(quote: string, chunk: Chunk): Span | null {
  const normalisedChunk = normalise(chunk.text);
  const normalisedQuote = normalise(quote);

  if (normalisedQuote.text.length === 0) return null;

  const at = normalisedChunk.text.indexOf(normalisedQuote.text);
  if (at === -1) return null;

  const lastSourceOffset = normalisedChunk.sourceOffsets[at + normalisedQuote.text.length - 1];

  return {
    start: chunk.start + normalisedChunk.sourceOffsets[at],
    end: chunk.start + lastSourceOffset + 1,
    confidence: "exact"
  };
}

function locateBestOverlap(quote: string, chunk: Chunk): Span | null {
  const quoteTokens = tokenize(quote);
  const chunkTokens = tokenize(chunk.text);
  if (quoteTokens.length === 0 || chunkTokens.length === 0) return null;

  const wanted = new Set(quoteTokens.map((token) => token.text));
  let bestScore = 0;
  let bestWindow: Token[] = [];

  for (let start = 0; start < chunkTokens.length; start++) {
    for (let end = start + 1; end <= chunkTokens.length; end++) {
      const window = chunkTokens.slice(start, end);
      const matches = window.filter((token) => wanted.has(token.text)).length;
      const score = matches / Math.max(window.length, quoteTokens.length);

      if (score > bestScore) {
        bestScore = score;
        bestWindow = window;
      }
    }
  }

  if (bestScore < FUZZY_THRESHOLD) return null;

  return {
    start: chunk.start + bestWindow[0].start,
    end: chunk.start + bestWindow[bestWindow.length - 1].end,
    confidence: "fuzzy"
  };
}

export function locateQuote(quote: string, chunk: Chunk): Span {
  const trimmedQuote = quote.trim();

  const exactAt = chunk.text.indexOf(trimmedQuote);
  if (trimmedQuote.length > 0 && exactAt !== -1) {
    return {
      start: chunk.start + exactAt,
      end: chunk.start + exactAt + trimmedQuote.length,
      confidence: "exact"
    };
  }

  return (
    locateNormalised(trimmedQuote, chunk) ??
    locateBestOverlap(trimmedQuote, chunk) ?? {
      start: chunk.start,
      end: chunk.end,
      confidence: "chunk"
    }
  );
}
