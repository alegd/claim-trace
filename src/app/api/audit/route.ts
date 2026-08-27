import { runAudit } from "@/lib/pipeline/run";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { transcript?: unknown; draft?: unknown };

  if (typeof body.transcript !== "string" || typeof body.draft !== "string") {
    return Response.json(
      { error: "transcript and draft are required strings" },
      { status: 400 }
    );
  }

  return Response.json(await runAudit(body.transcript, body.draft));
}
