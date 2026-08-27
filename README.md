# Claim Trace

Paste a source transcript and a text derived from it. Every statement in the
derived text comes back marked **supported**, **partial** or **unsupported**,
with the exact fragment of the source that backs it highlighted in place.

**Live:** https://claims.gueden.com — preloaded with a
fixture, so it runs in one click.

---

## The moment worth looking at

The fixture's draft ends with a sentence that sounds unremarkable:

> The company expects to reach 3.00 euros per delivery in 2025.

It appears nowhere in the source. Retrieval alone is confidently wrong about
it - the nearest passage scores **0.633**, because it also discusses euros per
delivery, and says 4.80 falling to 3.60 across 2021-2023. A tool that stopped at
semantic similarity would wave this through. The second stage catches it.

That is the whole argument for the two-stage design, and it is why retrieval is
cheap and verification is expensive.

## The claim it gets wrong, deliberately

> The main driver of the margin improvement was operational, not technological.

This is **true**, and the tool marks it unsupported. It is assembled from three
separate turns and no single passage states it. That is precision chosen over
recall: in quality control, a hallucination that slips through costs far more
than one extra flag a human dismisses in two seconds.

It is also the least stable verdict in the system. Across five runs of the
fixture it came back `unsupported` four times and `partial` once, quoting the
turn about turnover eating margin - which does support the *operational* half of
the claim, just not the *not technological* half. The boundary between
"partially stated" and "inferred" is genuinely fuzzy, and the tool wavers
exactly where a careful human would. Every span offset was correct in every run.

## How it works

Five stages, all framework-free TypeScript under `src/lib/pipeline/`:

1. **Segment** the draft into one claim per sentence, figures preserved literally.
2. **Chunk** the transcript by speaker turn, recording character offsets into the
   original string. Everything downstream depends on these being right.
3. **Retrieve** the nearest turns per claim: one embeddings batch, in-memory
   cosine, top 4.
4. **Verify** each claim against only its own top-4 turns. Support must come from
   a single passage; combining passages to build support is what produces the
   unsupported verdict above.
5. **Map** the returned quote back to absolute offsets through a four-level
   cascade - exact, normalised, fuzzy, whole-turn - each carrying its own
   confidence label. Approximate matches are drawn with a dashed border, so the
   interface distinguishes what the system knows from what it approximated.

The model returns a chunk id and a literal quote. It never returns character
positions, because it invents them. Offsets are computed here.

## Running it

```bash
pnpm install
echo "OPENAI_API_KEY=sk-..." > .env.local
pnpm dev
```

Optional: `COMPLETION_MODEL` and `EMBEDDING_MODEL` take `provider:model` strings
and default to `openai:gpt-5.6` and `openai:text-embedding-3-small`. Switching
provider is an environment variable, not a code change.

```bash
pnpm test        # 20 tests, four files
pnpm typecheck
pnpm lint
```

An audit is 7 model calls - one segmentation, one embeddings batch, one
verification per claim at concurrency 4 - and takes about 13 seconds end to end.

## What was deliberately not built

No vector database, no streaming, no authentication, no file upload, no
end-to-end tests, no coverage threshold, and no provider abstraction layer. Each
of those has a reason, and the reasons are in **[DECISIONS.md](DECISIONS.md)**
alongside what was delegated to the agent, what the agent proposed that was
rejected, and what would break first at scale.

Three of the five rejected items are the agent's own mistakes, caught in review
or by an acceptance criterion. Two are findings from the automated reviewer in
CI that did not survive checking. The guardrails it works under are in
**[AGENTS.md](AGENTS.md)**, which is also the standard CI validates every push
against.
