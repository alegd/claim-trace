import { beforeEach, describe, expect, test, vi } from "vitest";
import { DRAFT, TRANSCRIPT } from "../fixture";
import { chunkTranscript } from "./chunks";
import { runAudit } from "./run";

const { complete, embed } = vi.hoisted(() => ({
  complete: vi.fn(),
  embed: vi.fn()
}));

vi.mock("../llm", () => ({ complete, embed }));

const CANNED_CLAIMS = [
  {
    id: "c1",
    text: "Between 2021 and the end of 2023 the cost per delivery in urban zones went from 4.80 to 3.60 euros."
  },
  {
    id: "c2",
    text: "Automated sorting was deployed in only two hubs, Madrid and Barcelona, and the rest of the network remained manual."
  },
  {
    id: "c3",
    text: "Driver turnover fell below 40% after introducing variable pay tied to deliveries."
  },
  { id: "c4", text: "The main driver of the margin improvement was operational, not technological." },
  { id: "c5", text: "The company expects to reach 3.00 euros per delivery in 2025." }
];

const CANNED_VERDICTS: Record<string, unknown> = {
  c1: {
    verdict: "supported",
    chunkId: "k2",
    quote:
      "In 2021 we were at around 4.80 euros per delivery in urban zones. By the end of 2023 we had brought it down to 3.60.",
    reasoning: "The passage states both figures."
  },
  c2: {
    verdict: "supported",
    chunkId: "k4",
    quote:
      "We put automated sorting into two hubs, Madrid and Barcelona, and there we did notice something, but the rest of the network stayed manual until I left.",
    reasoning: "The passage names both hubs."
  },
  c3: {
    verdict: "partial",
    chunkId: "k8",
    quote:
      "We raised the variable pay tied to completed deliveries and we changed the morning shift. It dropped, but I cannot give you the exact number because it landed after my time.",
    reasoning: "The passage reports a drop without the figure."
  },
  c4: {
    verdict: "unsupported",
    chunkId: null,
    quote: null,
    reasoning: "No single passage states it."
  },
  c5: {
    verdict: "unsupported",
    chunkId: null,
    quote: null,
    reasoning: "No passage mentions a 2025 forecast."
  }
};

const CLAIM_VECTOR = [1, 0];
const SUPPORTING_CHUNK_VECTOR = [1, 0];
const OTHER_CHUNK_VECTOR = [0, 1];
const SUPPORTING_CHUNK_IDS = ["k2", "k4", "k8"];

describe("runAudit", () => {
  beforeEach(() => {
    complete.mockReset();
    embed.mockReset();

    complete.mockImplementation(async (_system: string, user: string) => {
      if (!user.startsWith("CLAIM:")) {
        return JSON.stringify({ claims: CANNED_CLAIMS });
      }
      const claim = CANNED_CLAIMS.find((candidate) => user.includes(candidate.text));
      if (claim === undefined) throw new Error(`Unexpected verification prompt: ${user}`);
      return JSON.stringify(CANNED_VERDICTS[claim.id]);
    });

    embed.mockImplementation(async (texts: string[]) => {
      const chunks = chunkTranscript(TRANSCRIPT);
      return texts.map((text) => {
        const chunk = chunks.find((candidate) => candidate.text === text);
        if (chunk === undefined) return CLAIM_VECTOR;
        return SUPPORTING_CHUNK_IDS.includes(chunk.id)
          ? SUPPORTING_CHUNK_VECTOR
          : OTHER_CHUNK_VECTOR;
      });
    });
  });

  test("returns every claim of the draft in reading order with its verdict", async () => {
    const result = await runAudit(TRANSCRIPT, DRAFT);

    expect(result.claims.map((claim) => claim.id)).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    expect(result.claims.map((claim) => claim.verdict)).toEqual([
      "supported",
      "supported",
      "partial",
      "unsupported",
      "unsupported"
    ]);
  });

  test("maps every quote to a span that slices back out of the original transcript", async () => {
    const result = await runAudit(TRANSCRIPT, DRAFT);

    for (const claim of result.claims) {
      if (claim.quote === null) continue;
      expect(claim.span).not.toBeNull();
      expect(TRANSCRIPT.slice(claim.span!.start, claim.span!.end)).toBe(claim.quote);
    }
  });

  test("leaves unsupported claims without a span", async () => {
    const result = await runAudit(TRANSCRIPT, DRAFT);
    const unsupported = result.claims.filter((claim) => claim.verdict === "unsupported");

    expect(unsupported).toHaveLength(2);
    for (const claim of unsupported) {
      expect(claim.quote).toBeNull();
      expect(claim.span).toBeNull();
    }
  });

  test("embeds once and verifies once per claim", async () => {
    await runAudit(TRANSCRIPT, DRAFT);

    expect(embed).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(CANNED_CLAIMS.length + 1);
  });

  test("returns no claims for an empty draft without calling the models", async () => {
    const result = await runAudit(TRANSCRIPT, "   ");

    expect(result.claims).toEqual([]);
    expect(complete).not.toHaveBeenCalled();
    expect(embed).not.toHaveBeenCalled();
  });
});
