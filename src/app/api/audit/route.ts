import { isTooManyClaimsError, runAudit } from "@/lib/pipeline/run";

const MAX_TRANSCRIPT_CHARACTERS = 100_000;
const MAX_DRAFT_CHARACTERS = 10_000;

export async function POST(request: Request): Promise<Response> {
  let body: { transcript?: unknown; draft?: unknown };

  try {
    body = (await request.json()) as { transcript?: unknown; draft?: unknown };
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return Response.json({ error: "The request body must be a JSON object." }, { status: 400 });
  }

  try {
    if (typeof body.transcript !== "string" || body.transcript.trim().length === 0) {
      return Response.json({ error: "A source transcript is required." }, { status: 400 });
    }

    if (typeof body.draft !== "string" || body.draft.trim().length === 0) {
      return Response.json({ error: "A derived draft is required." }, { status: 400 });
    }

    if (body.transcript.length > MAX_TRANSCRIPT_CHARACTERS) {
      return Response.json(
        { error: `The transcript exceeds ${MAX_TRANSCRIPT_CHARACTERS} characters.` },
        { status: 413 }
      );
    }

    if (body.draft.length > MAX_DRAFT_CHARACTERS) {
      return Response.json(
        { error: `The draft exceeds ${MAX_DRAFT_CHARACTERS} characters.` },
        { status: 413 }
      );
    }

    return Response.json(await runAudit(body.transcript, body.draft));
  } catch (err) {
    if (isTooManyClaimsError(err)) {
      return Response.json({ error: (err as Error).message }, { status: 413 });
    }

    console.error("Audit failed", err);
    return Response.json({ error: "The audit could not be completed." }, { status: 500 });
  }
}
