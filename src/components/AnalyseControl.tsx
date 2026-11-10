"use client";

import { useId } from "react";
import { checklistStatus, isPanelReady, type PanelState } from "@/lib/client/panel-state";
import { button } from "@/lib/client/ui";
import { kindTitle } from "@/lib/messages";

interface Props {
  jobDescription: PanelState;
  resume: PanelState;
  onAnalyse: () => void;
  /** Called when Analyse is clicked before both panels are ready. */
  onNotReady: () => void;
}

/**
 * The Analyse button with a checklist of what each panel still needs.
 * The button uses aria-disabled, so it stays focusable and is announced together with the checklist.
 */
export function AnalyseControl({ jobDescription, resume, onAnalyse, onNotReady }: Props) {
  const id = useId();
  const ready = isPanelReady(jobDescription) && isPanelReady(resume);
  const lines = [
    { kind: "jobDescription" as const, ...checklistStatus(jobDescription) },
    { kind: "resume" as const, ...checklistStatus(resume) },
  ];

  return (
    <div className="relative z-10 flex flex-col items-center gap-3 bg-zinc-50 px-6 py-2">
      <button
        type="button"
        className={`${button.primary} px-10 py-3 text-base`}
        aria-disabled={!ready || undefined}
        aria-describedby={`${id}-checklist`}
        onClick={() => (ready ? onAnalyse() : onNotReady())}
      >
        Analyse
      </button>
      <ul id={`${id}-checklist`} aria-live="polite" className="flex flex-col gap-1 text-sm">
        {lines.map((line) => (
          <li key={line.kind} className={line.ready ? "text-green-700" : "text-zinc-700"}>
            <span aria-hidden="true" className="mr-1.5 inline-block w-4 text-center">
              {line.ready ? "✓" : "○"}
            </span>
            {kindTitle(line.kind)}: {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
