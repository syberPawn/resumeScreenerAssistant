"use client";

import { useId } from "react";
import { SparklesIcon } from "@/components/icons";
import { checklistStatus, isPanelReady, panelError, type PanelState } from "@/lib/client/panel-state";
import { kindTitle } from "@/lib/messages";

interface Props {
  jobDescription: PanelState;
  resume: PanelState;
  onAnalyse: () => void;
  /** Called when Analyse is clicked before both panels are ready. */
  onNotReady: () => void;
}

/** Status dot: green when ready, red on an error, a slow pulse while waiting. */
function Dot({ state }: { state: PanelState }) {
  const tone = isPanelReady(state)
    ? "bg-emerald-400"
    : panelError(state)
      ? "bg-red-400"
      : "bg-white/70 motion-safe:animate-pulse";
  return <span className={`h-2 w-2 rounded-full ${tone}`} />;
}

/**
 * The round Analyse button, layered over the partition line between the two panels.
 * Two dots inside it show whether the job description (JD) and the resume are ready.
 * The full status of each panel is announced to screen readers and shown as a tooltip.
 */
export function AnalyseControl({ jobDescription, resume, onAnalyse, onNotReady }: Props) {
  const id = useId();
  const ready = isPanelReady(jobDescription) && isPanelReady(resume);
  const lines = [
    { kind: "jobDescription" as const, label: "JD", state: jobDescription, ...checklistStatus(jobDescription) },
    { kind: "resume" as const, label: "Resume", state: resume, ...checklistStatus(resume) },
  ];
  const summary = lines.map((line) => `${kindTitle(line.kind)}: ${line.text}`).join(" · ");

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        title={summary}
        aria-disabled={!ready || undefined}
        aria-describedby={`${id}-status`}
        onClick={() => (ready ? onAnalyse() : onNotReady())}
        className={
          "flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-full text-white shadow-xl ring-[6px] ring-zinc-50 transition " +
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 " +
          (ready
            ? "bg-gradient-to-br from-indigo-600 to-violet-600 hover:scale-105 hover:shadow-2xl"
            : "cursor-not-allowed bg-gradient-to-br from-indigo-300 to-violet-300")
        }
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <SparklesIcon className="h-4 w-4" />
          Analyse
        </span>
        <span aria-hidden="true" className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-wide">
          {lines.map((line) => (
            <span key={line.kind} className="flex items-center gap-1">
              <Dot state={line.state} />
              {line.label}
            </span>
          ))}
        </span>
      </button>
      <ul id={`${id}-status`} aria-live="polite" className="sr-only">
        {lines.map((line) => (
          <li key={line.kind}>
            {kindTitle(line.kind)}: {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
