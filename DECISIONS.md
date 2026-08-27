# Decision log

What I decided myself, what I delegated to the agent, what I rejected of what
the agent proposed, and what I chose not to build. One page. Filled in while
working, not afterwards.

---

## I decided

Decisions taken before opening the editor, with their discarded alternative.

**No vector DB.** A transcript is ~200 chunks. In-memory cosine over an array
resolves in under a millisecond. The threshold where pgvector starts paying for
its operational complexity is in the order of tens of thousands of chunks
persisted across sessions, and this product does not live there yet. When it
does, the change touches one function: `retrieve()`.

**Cheap retrieval, expensive verification.** Lexical only loses every
paraphrase. Semantic only gives false confidence when two sentences talk about
the same topic and say different things, which is exactly the failure that
hurts most in a QC tool. Embeddings for the top-k, one verification call per
claim over only those k.

**Precision over recall.** Synthesised claims, the ones that summarise three
separate turns into one sentence, come out as unsupported. They are false
positives and I accept them: in QC, a hallucination that passes the filter
costs far more than one extra mark a human dismisses in two seconds.
*(Live case in the fixture: claim 4.)*

**I compute the offsets, not the model.** The model returns `chunk_id` and the
literal quote. It always invents the character indices. A mapping cascade with
four levels and explicitly degraded confidence, visible in the UI as a dashed
border. It is designing for the model's probable failure instead of assuming it
returns what I asked for.

**Next.js in a single app, framework-free pipeline.** `src/lib/pipeline/*` imports
nothing from Next. The route handler is 12 lines of transport. I discarded a
separate NestJS because the scaffold costs me 20 of the 100 minutes and adds
nothing to the problem. The day it is needed, the pipeline moves as-is into a
controller.

**Test-first where the code is deterministic, evals where it is not.**
Red-green TDD in the pure modules: the offset invariant before the chunking,
the cosine before the function, the four levels of the cascade before
implementing it. Plus an integration test of `run()` with `llm.ts` stubbed,
cheap because the interface is two functions. No assert against live model
output: on that boundary a test is either fragile or lying, and what belongs
there are evals and golden fixtures (here, the verdict rehearsal in
production). I set no coverage threshold: the high coverage of `src/lib/pipeline`
came out as a by-product of test-first, not as a goal. In a team repo with a
long life I would put TDD as the norm and a threshold as the safety net; here
the criterion was risk against cost.

**Minimal CI set up before the build, over the empty scaffold.** Lint,
typecheck, build, the spans test and GGA with `--ci` validating against
AGENTS.md. GGA as an informational job, not blocking: in a 100-minute build I
do not delegate veto rights to an automated reviewer; in a team repo I would
make it blocking. AGENTS.md is the human intent codified and GGA is what makes
it observable on every push.

**Provider-agnostic SDK, because the pipeline needs two providers.** Anthropic
does not offer an embedding model - their own documentation says so and points
at Voyage AI. `embed()` therefore cannot exist on the Anthropic SDK, and T3
(chunking, embeddings, cosine retrieval) had no implementation path as
originally planned. The Vercel AI SDK gives one uniform surface over both
providers: `generateText` with `Output.json()` for verification on Claude,
`embedMany` for retrieval on OpenAI. This is not the provider indirection the
guardrails forbid - `llm.ts` stays two plain functions, and swapping either
provider is one line. Discarded alternative: Anthropic SDK plus a hand-written
`fetch` to Voyage, which is fewer packages but two different HTTP shapes inside
the one module the integration test stubs.

**No temperature on the verification call.** The plan specified temperature 0
for verdict stability. `temperature`, `top_p` and `top_k` are removed on Opus 5,
Opus 4.8/4.7 and Sonnet 5 - sending them returns a 400. The mechanism does not
exist any more, so stability is enforced by forced JSON output and a tight
prompt, and confirmed empirically by the verdict rehearsal in production. That
rehearsal moved from prudent to load-bearing.

**Vercel for deployment.** The reference platform for Next.js: import the repo,
set two environment variables, push. Coolify was the original choice and still
works, but it needs build and proxy configuration that Vercel does not, and the
deploy step is on the never-cut list. This does not breach the no-new-tooling
rule because it is a platform already used before, not one being debuted. Worth
recording precisely: the Vercel AI SDK played no part in this. It is an
Apache-2.0 npm package with no platform coupling, and the pipeline would have
deployed to Coolify unchanged.

**The provider is configuration, not an abstraction.** Both calls now resolve
through `createProviderRegistry({ anthropic, openai })` and read
`COMPLETION_MODEL` / `EMBEDDING_MODEL` as `provider:model` strings, defaulting
to OpenAI on both. Swapping provider is an environment variable in Vercel, with
no code change and no deploy. The trigger was noticing that a hardcoded
`openai(...)` meant editing source to change vendor. The important part is the
diagnosis: that is not a missing abstraction, it is configuration living in the
wrong place, and the two have different cures. The AI SDK **is** the provider
abstraction - `generateText({ model })` already accepts any vendor - so a
hand-written `LLMProvider` interface would have been a second indirection on
top of the first, which is exactly the seam the guardrails delete. Discarded
alternative: that interface, rejected as forbidden by the guardrails and
redundant against the SDK. `llm.ts` stays two plain functions.

The other discarded alternative is the shorter one, and it is the reason this
entry exists. Current AI SDK docs write embeddings as
`embedMany({ model: 'openai/text-embedding-3-small' })` - a plain string, no
provider import, no registry, which is strictly less code than what is here.
It is rejected because of what that string does: *"by default, the global
provider is set to the Vercel AI Gateway"*. Plain model ids route through
Vercel's gateway rather than calling the provider directly, which would make
the claim two sections below - that the SDK is an Apache-2.0 package with no
platform coupling that would deploy to Coolify unchanged - simply false, and
would move authentication from the `OPENAI_API_KEY` already in the project
environment to gateway credentials. The registry keeps the calls pointed at the
providers directly. Shortest is not the same as least coupled.

**Verification on OpenAI, not Claude.** The original split - Claude verifies,
OpenAI embeds - was justified by Anthropic having no embedding model, and that
reasoning still holds for `embed()`. It never implied Claude had to own
`complete()`. With the registry in place the choice is a default, not a
commitment, and `ANTHROPIC_API_KEY` is only needed if `COMPLETION_MODEL` points
back at Anthropic. Cost of reversing: one environment variable.

**`agentRules: false` in `next.config.ts`.** Next 16 appends a generated block
into `AGENTS.md` on every `next dev` run. In this repo `AGENTS.md` is not a
convenience file: it is the standard GGA validates against in CI. A framework
silently editing the file that defines the rules corrupts the reviewer's input
and produces a dirty tree on every boot. The flag is Next's own documented
opt-out (`config-shared.d.ts`, `agentRules?: boolean`, default `true`).
Discarded alternative: let it write and gitignore the diff, which desynchronises
the local standard from the one CI reads.

**`run.test.ts` was written after `run.ts`, breaking my own ordering rule.**
AGENTS.md says all four permitted test files are written before the code they
test. PLAN.md sequences T5 (spans, `run.ts`, route) before T5b (`run.test.ts`).
The two documents disagree and I followed the plan, so the orchestrator existed
untested. Faced with deleting fifty lines of orchestration already verified
end to end by the curl gate, or writing the test late and recording the breach,
I chose to record it: a rewrite would have reproduced near-identical code to buy
confidence the gate had already given me. The other three test files were
genuinely red first, and that is where test-first was doing design work rather
than ceremony.

The late test still earned its place within a minute of existing: it caught
`retrieve()` calling the embedding model when the claim list was empty. The
function guarded against zero chunks but not zero claims, so an empty draft
embedded all ten transcript chunks for nobody - real latency and real money for
a result that was always going to be empty. Fixed with a guard clause and pinned
by a unit test in `retrieve.test.ts`, where the bug actually lived, rather than
only end to end. Written first, that test would have caught it earlier. Written
late, it still caught it - which is an argument for the test, not for the
ordering.

**New tools only with a gate.** Engram (agent memory) came in as optional with
a 15-minute budget to record, in the heat of the moment, what I reject from the
agent. If it does not pass the gate, it falls back to manual mode with no
drama. General rule: no tooling is debuted inside the build window.

---

## I delegated to the agent

_(Fill in during execution. What I asked for and what prompt I used.)_

| Task | Prompt / instruction | Accepted without changes |
|---|---|---|
| | | |
| | | |

Save 2 or 3 real prompts from the planner and the reviewer exactly as they came
out. Reconstructing them afterwards shows.

---

## I rejected from the agent

_(Fill in during execution. This column is the one that proves the harness is
not driving me.)_

| It proposed | Rejected because |
|---|---|
| GGA in CI: remove `agentRules: false` from `next.config.ts`, claiming it is not a `NextConfig` property and would fail `tsc --noEmit` | Hallucinated. The property is declared in `next/dist/server/config-shared.d.ts:1574` with `@default true` and an explicit opt-out note, and the `checks` job ran `pnpm typecheck` green on the same commit that GGA said would not compile. Kept, and its intent written up above so the finding does not recur. Its second point — that an unexplained `agentRules: false` looks like an attempt to influence agent behaviour — was a fair instinct on an undocumented flag, and is what the write-up answers |
| An env-var validator in `llm.ts`: a `ModelId` type guard plus a `readModelId` throwing its own error (mine, caught by Ale mid-task) | Fifteen lines to duplicate what the library already does. The SDK exports `NoSuchProviderError` and fails with a readable message on a bad `provider:model` string. Two typed constants replaced it. Defensive parsing is earned against untrusted model output, not against my own environment file |
| Segmentation prompt that split every sentence into atomic facts (mine, caught by the acceptance criterion) | It returned 8 claims where the fixture is designed around 5, breaking the verdict table downstream. The unit is the sentence, because the user audits the draft as written and each sentence gets one verdict and one highlighted span. Over-splitting also multiplies the per-claim verification calls |
| `openai.textEmbeddingModel()` in `llm.ts` (mine, caught by Ale on review) | Deprecated in `@ai-sdk/openai` 4.0.50 in favour of `openai.embeddingModel()`. I had verified the symbol existed in the installed types but not whether it was on its way out. Existing and being current are two different checks |
| | |

Likely candidates, in case they show up: an `EmbeddingProvider` interface with a
single implementation, a `try/catch` that swallows the error and returns an
empty array, tests outside the four agreed files (asserts against the live LLM,
React component tests, tests to raise coverage), a `useEffect` that fires the
audit on mount.

---

## Did not build

| Discarded | Reason |
|---|---|
| Streaming results claim by claim | Time sink. The audit takes ~8s and an honest spinner is worth the same in a demo |
| Authentication | Nothing to protect yet |
| File upload | The textarea proves the same thing and does not drag in PDF parsing |
| E2E | Six LLM calls in the flow: either it is flaky or it demands mocking the whole model, and the real flow is already covered by the integration test with a stub plus the rehearsal in production |
| Coverage threshold | In ~300 lines where much of it touches an LLM, chasing a number is only achieved by testing mocks or React components. The coverage of `src/lib/pipeline` ended up high as a by-product of test-first |
| Local GGA hook | A reviewer that blocks commits in 10-minute windows sabotages the build. It lives in CI |
| | |

---

## What would break first at scale

1. The single embeddings batch. With 2-hour transcripts you have to split and
   cache by chunk hash.
2. One call per claim. With 80 claims that is 80 calls. That is where you group
   claims sharing a top-k.
3. The in-memory cosine, once documents persist across sessions and you have to
   search over the whole corpus and not over a single document.

