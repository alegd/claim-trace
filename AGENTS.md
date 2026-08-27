Rules for any agent working in this repo. Also consumed by GGA in CI.

## GUARDRAILS

Dual purpose: these are the agent's rules and also the file GGA consumes as the
standard in CI.

Rules the agent must not break without asking for explicit confirmation:

**DO NOT build:**

- Vector DB (pgvector, Pinecone, Chroma). Retrieval is in-memory cosine.
- Streaming of results. The response is a single JSON at the end.
- Authentication, users, sessions.
- File upload. Textareas only.
- Asserts against live LLM output, React component tests, or any test whose
  purpose is to raise a coverage number. The permitted tests are exactly four
  files, written BEFORE the code they test: `chunks.test.ts` (offset
  invariant), `retrieve.test.ts` (cosine with known vectors), `spans.test.ts`
  (the four levels of the cascade) and `run.test.ts` (integration with
  `llm.ts` stubbed with canned responses from the fixture).
- Abstractions for "when it scales". If an abstraction seam with a single
  implementation appears (a provider/adapter/strategy indirection), it gets
  deleted. This is about indirection layers, not about TypeScript `interface`
  declarations, which are covered under Code conventions.

**DO respect:**

- `src/lib/pipeline/*` imports nothing from Next.js. Zero `next/*`, zero
  `NextRequest`. It is pure TypeScript. The route handler is transport and
  nothing more.
- The whole pipeline is `async` and free of global state.
- A task is done when it passes its acceptance criterion, not when it "works".
- If a task runs 5 minutes past its window, stop and report.

**Stack decision already made:** Next.js App Router in a single app, with the
pipeline isolated in framework-free modules. Discarded alternative: a separate
NestJS. Reasoning in DECISIONS.md.

---

## Code conventions

- `PascalCase` for components, `camelCase` for variables, functions and hooks,
  `kebab-case` for other files, `UPPER_SNAKE_CASE` for module-level constants
  and environment variables.
- Functions start with a verb. Booleans use `is` / `has` / `can` prefixes.
  Event handlers use the `handle` prefix.
- No magic numbers. The top-k, the fuzzy threshold, the concurrency limit and
  the input caps are named constants.
- No abbreviations except `API`, `URL`, `i`, `j`, `err`, `ctx`.
- TypeScript everywhere, functional only, no classes.
- `interface` for object shapes, `type` for everything else. `Claim`, `Chunk`
  and `Verification` are interfaces; `Verdict` is a union and stays a `type`.
  Declaring an object shape as an `interface` is not the abstraction seam the
  guardrails forbid.
- Explicit return types on exported functions. Named exports only, except where
  a framework mandates a default export (Next.js pages, layouts and configs).
- Guard clauses and early returns for edge cases. Never swallow an error to
  return an empty result.
- No TODOs, placeholders or half-finished code. Admit uncertainty and ask
  instead of guessing.
