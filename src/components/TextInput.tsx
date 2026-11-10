"use client";

import { useId } from "react";
import { hasFile, panelError, panelText, type PanelState } from "@/lib/client/panel-state";
import { button, errorText } from "@/lib/client/ui";
import { LIMITS } from "@/lib/limits";
import { kindLabel, messages } from "@/lib/messages";
import type { InputKind } from "@/lib/types";

interface Props {
  kind: InputKind;
  state: PanelState;
  labelledBy: string;
  onChange: (text: string) => void;
  onDone: () => void;
}

/**
 * The panel's text box with a live character counter and a Done button.
 * It is read-only while a file is uploaded. The browser's maxLength is not used, because it cuts pasted text silently.
 */
export function TextInput({ kind, state, labelledBy, onChange, onDone }: Props) {
  const id = useId();
  const fileMode = hasFile(state);
  const text = fileMode ? "" : panelText(state);
  const length = text.trim().length;
  const max = LIMITS[kind].maxChars;
  const over = length > max;
  const canConfirm = state.status === "typing" && !over;
  const error = fileMode ? null : panelError(state);
  const confirmed = state.status === "textReady" && !error;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        id={`${id}-text`}
        aria-labelledby={labelledBy}
        aria-describedby={`${id}-counter ${id}-message`}
        aria-invalid={over || Boolean(error) || undefined}
        aria-disabled={fileMode || undefined}
        readOnly={fileMode}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder={fileMode ? messages.removeFileToType() : `Type or paste the ${kindLabel(kind)}`}
        rows={12}
        className={
          "w-full resize-y rounded-md border bg-white p-3 text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 " +
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 " +
          "aria-disabled:cursor-not-allowed aria-disabled:bg-zinc-100 " +
          (over || error ? "border-red-500" : "border-zinc-300")
        }
      />

      <div className={fileMode ? "hidden" : "flex flex-wrap items-center justify-between gap-2"}>
        <p id={`${id}-counter`} className={over ? "text-sm font-medium text-red-700" : "text-sm text-zinc-500"}>
          {length.toLocaleString("en-US")} / {max.toLocaleString("en-US")} characters
        </p>
        <div className="flex items-center gap-3">
          {confirmed && (
            <span className="text-sm font-medium text-green-700">
              <span aria-hidden="true">✓ </span>Text confirmed
            </span>
          )}
          <button
            type="button"
            className={button.secondary}
            aria-disabled={!canConfirm || undefined}
            onClick={() => canConfirm && onDone()}
          >
            Done
          </button>
        </div>
      </div>

      <div id={`${id}-message`}>
        {fileMode && <p className="text-sm text-zinc-600">{messages.removeFileToType()}</p>}
        {over && (
          <p role="alert" className={errorText}>
            {messages.tooLong(kind, length)}
          </p>
        )}
        {!over && error && (
          <p role="alert" className={errorText}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
