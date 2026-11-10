"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileTextIcon, UploadIcon } from "@/components/icons";
import { hasTypedText, panelError, type PanelState } from "@/lib/client/panel-state";
import { button, errorText } from "@/lib/client/ui";
import { LIMITS } from "@/lib/limits";
import { fileSize, kindTitle, megabytes, messages } from "@/lib/messages";
import type { InputKind } from "@/lib/types";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Props {
  kind: InputKind;
  state: PanelState;
  onFile: (file: File) => void;
  onRemove: () => void;
  onClearText: () => void;
}

/**
 * The panel's file upload. While text is typed, every way of adding a file is blocked:
 * the button, the keyboard and dragging a file onto the panel.
 */
export function FileInput({ kind, state, onFile, onRemove, onClearText }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const blocked = hasTypedText(state);
  const canAdd = state.status === "empty";
  const error = panelError(state);

  function chooseFile() {
    if (canAdd) inputRef.current?.click();
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = canAdd ? "copy" : "none";
    if (canAdd) setDragging(true);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (canAdd && file) onFile(file);
  }

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={`${kindTitle(kind)} file`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file && canAdd) onFile(file);
        }}
      />

      {state.status === "reading" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5">
          <p className="text-sm text-zinc-700" role="status">
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent align-middle" />
            Reading {state.fileName}…
          </p>
          <button type="button" className={button.secondary} onClick={onRemove}>
            Remove file
          </button>
        </div>
      )}

      {state.status === "fileReady" && (
        <div
          className={
            "flex items-center justify-between gap-3 rounded-xl border bg-indigo-50/40 px-4 py-5 " +
            (error ? "border-red-500" : "border-indigo-200")
          }
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">{state.file.name}</p>
            <p className="text-sm text-zinc-500">
              {fileSize(state.file.sizeBytes)}
              {state.file.pages !== null && ` · ${state.file.pages} ${state.file.pages === 1 ? "page" : "pages"}`}
              {!error && <span className="ml-2 font-medium text-green-700">✓ Ready</span>}
            </p>
          </div>
          <button type="button" className={button.secondary} onClick={onRemove}>
            Remove file
          </button>
        </div>
      )}

      {(state.status === "empty" || blocked) && (
        <div
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={
            "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-5 py-6 text-center transition-colors " +
            (dragging
              ? "border-indigo-500 bg-indigo-50"
              : blocked
                ? "border-zinc-200 bg-zinc-50"
                : "border-indigo-200 bg-indigo-50/40 hover:border-indigo-300")
          }
        >
          <FileTextIcon className={blocked ? "h-7 w-7 text-zinc-300" : "h-7 w-7 text-indigo-500"} />
          <p className={blocked ? "text-sm text-zinc-400" : "text-sm text-zinc-700"}>Drag &amp; drop a file here, or</p>
          <button
            type="button"
            className={`${button.secondary} rounded-full`}
            aria-disabled={!canAdd || undefined}
            aria-describedby={`${id}-hint`}
            onClick={chooseFile}
          >
            <UploadIcon className="h-4 w-4" />
            Choose file
          </button>
          <p id={`${id}-hint`} className={blocked ? "text-sm font-medium text-zinc-700" : "text-xs text-zinc-500"}>
            {blocked
              ? messages.clearTextToUpload()
              : `PDF or Word (.docx), up to ${megabytes(LIMITS.fileBytes).replace(".0", "")} MB and ${LIMITS.pdfPages} pages`}
          </p>
          {blocked && (
            <button type="button" className={button.link} onClick={onClearText}>
              Clear text
            </button>
          )}
        </div>
      )}

      {error && state.status !== "typing" && state.status !== "textReady" && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}
