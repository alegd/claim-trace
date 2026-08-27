import { runAudit } from "@/lib/pipeline/run";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { transcript?: unknown; draft?: unknown };

    if (typeof body.transcript !== "string" || body.transcript.trim().length === 0) {
      return Response.json({ error: "A source transcript is required." }, { status: 400 });
    }

    if (typeof body.draft !== "string" || body.draft.trim().length === 0) {
      return Response.json({ error: "A derived draft is required." }, { status: 400 });
    }

    return Response.json(await runAudit(body.transcript, body.draft));
  } catch (err) {
    console.error("Audit failed", err);
    return Response.json({ error: "The audit could not be completed." }, { status: 500 });
  }
}
