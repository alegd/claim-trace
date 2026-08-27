"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditedClaim } from "@/lib/pipeline/run";
import type { Span, SpanConfidence } from "@/lib/pipeline/spans";
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

const SPAN_STYLES: Record<SpanConfidence, string> = {
  exact: "bg-amber-200 ring-1 ring-amber-600",
  fuzzy: "bg-amber-100 border border-dashed border-amber-700",
  chunk: "bg-amber-50 border border-dashed border-amber-700"
};

const SPAN_TITLES: Record<SpanConfidence, string> = {
  exact: "Exact match: the quote was found in the source character for character.",
  fuzzy: "Approximate match: the closest overlapping wording, not a literal one.",
  chunk: "Whole turn: the quote could not be located precisely inside it."
};

const PANEL_STYLES =
  "h-80 w-full overflow-auto rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900";

interface AuditorProps {
  initialTranscript: string;
  initialDraft: string;
}

interface HighlightedTranscriptProps {
  transcript: string;
  span: Span | null;
}

function HighlightedTranscript({ transcript, span }: HighlightedTranscriptProps) {
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [span]);

  if (span === null) {
    return <pre className={`${PANEL_STYLES} whitespace-pre-wrap`}>{transcript}</pre>;
  }

  return (
    <pre className={`${PANEL_STYLES} whitespace-pre-wrap`}>
      {transcript.slice(0, span.start)}
      <mark
        ref={markRef}
        title={SPAN_TITLES[span.confidence]}
        className={`rounded-sm text-slate-900 ${SPAN_STYLES[span.confidence]}`}
      >
        {transcript.slice(span.start, span.end)}
      </mark>
      {transcript.slice(span.end)}
    </pre>
  );
}

export function Auditor({ initialTranscript, initialDraft }: AuditorProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [draft, setDraft] = useState(initialDraft);
  const [claims, setClaims] = useState<AuditedClaim[] | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClaim = claims?.find((claim) => claim.id === selectedClaimId) ?? null;
  const canAudit = transcript.trim().length > 0 && draft.trim().length > 0;

  async function handleAudit(): Promise<void> {
    setIsAuditing(true);
    setError(null);
    setSelectedClaimId(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, draft })
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(failure?.error ?? `The audit failed with status ${response.status}.`);
      }

      const result = (await response.json()) as { claims: AuditedClaim[] };
      setClaims(result.claims);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The audit failed.");
    } finally {
      setIsAuditing(false);
    }
  }

  function handleEditTranscript(): void {
    setClaims(null);
    setSelectedClaimId(null);
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
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Source transcript
            </span>
            {claims !== null && (
              <button
                type="button"
                onClick={handleEditTranscript}
                className="text-xs font-medium text-slate-500 underline hover:text-slate-900"
              >
                Edit
              </button>
            )}
          </div>
          {claims === null ? (
            <textarea
              className={`${PANEL_STYLES} resize-none focus:border-slate-500 focus:outline-none`}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
          ) : (
            <HighlightedTranscript transcript={transcript} span={selectedClaim?.span ?? null} />
          )}
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Derived draft
          </span>
          <textarea
            className={`${PANEL_STYLES} resize-none focus:border-slate-500 focus:outline-none`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleAudit}
          disabled={isAuditing || !canAudit}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isAuditing ? "Auditing…" : "Audit"}
        </button>
        {claims !== null && (
          <p className="text-xs text-slate-500">
            Select a claim to highlight the fragment that backs it.
          </p>
        )}
        {error !== null && <p className="text-sm text-rose-700">{error}</p>}
      </div>

      {claims !== null && (
        <ol className="flex flex-col gap-3">
          {claims.map((claim) => (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => setSelectedClaimId(claim.id)}
                disabled={claim.span === null}
                className={`flex w-full flex-col gap-2 rounded-lg border p-4 text-left enabled:cursor-pointer disabled:cursor-default ${VERDICT_STYLES[claim.verdict]} ${
                  claim.id === selectedClaimId ? "ring-2 ring-slate-900" : ""
                }`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="text-sm text-slate-900">{claim.text}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_BADGE_STYLES[claim.verdict]}`}
                  >
                    {VERDICT_LABELS[claim.verdict]}
                  </span>
                </span>

                <span className="text-xs text-slate-600">{claim.reasoning}</span>

                {claim.span !== null && (
                  <span className="text-xs font-medium text-slate-500">
                    {SPAN_TITLES[claim.span.confidence]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
