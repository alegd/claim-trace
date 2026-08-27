"use client";

import { useState } from "react";
import type { AuditedClaim } from "@/lib/pipeline/run";
import type { Verdict } from "@/lib/pipeline/verify";

const VERDICT_LABELS: Record<Verdict, string> = {
  supported: "Supported",
  partial: "Partial",
  unsupported: "Unsupported"
};

const VERDICT_STYLES: Record<Verdict, string> = {
  supported: "border-emerald-300 bg-emerald-50",
  partial: "border-amber-300 bg-amber-50",
  unsupported: "border-rose-300 bg-rose-50"
};

const VERDICT_BADGE_STYLES: Record<Verdict, string> = {
  supported: "bg-emerald-600 text-white",
  partial: "bg-amber-600 text-white",
  unsupported: "bg-rose-600 text-white"
};

const PANEL_STYLES =
  "h-80 w-full resize-none rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900 focus:border-slate-500 focus:outline-none";

interface AuditorProps {
  initialTranscript: string;
  initialDraft: string;
}

export function Auditor({ initialTranscript, initialDraft }: AuditorProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [draft, setDraft] = useState(initialDraft);
  const [claims, setClaims] = useState<AuditedClaim[] | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit(): Promise<void> {
    setIsAuditing(true);
    setError(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, draft })
      });

      if (!response.ok) {
        throw new Error(`The audit failed with status ${response.status}.`);
      }

      const result = (await response.json()) as { claims: AuditedClaim[] };
      setClaims(result.claims);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The audit failed.");
    } finally {
      setIsAuditing(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Claim Trace</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Paste a source and a text derived from it. Every statement is marked supported, partial or
          unsupported, with the fragment of the source that backs it.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Source transcript
          </span>
          <textarea
            className={PANEL_STYLES}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Derived draft
          </span>
          <textarea
            className={PANEL_STYLES}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleAudit}
          disabled={isAuditing}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isAuditing ? "Auditing…" : "Audit"}
        </button>
        {error !== null && <p className="text-sm text-rose-700">{error}</p>}
      </div>

      {claims !== null && (
        <ol className="flex flex-col gap-3">
          {claims.map((claim) => (
            <li
              key={claim.id}
              className={`flex flex-col gap-2 rounded-lg border p-4 ${VERDICT_STYLES[claim.verdict]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-900">{claim.text}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_BADGE_STYLES[claim.verdict]}`}
                >
                  {VERDICT_LABELS[claim.verdict]}
                </span>
              </div>

              <p className="text-xs text-slate-600">{claim.reasoning}</p>

              {claim.quote !== null && (
                <blockquote className="border-l-2 border-slate-400 pl-3 font-mono text-xs text-slate-700">
                  {claim.quote}
                </blockquote>
              )}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
