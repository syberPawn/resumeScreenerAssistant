// One state value per panel.
// Every control's availability is worked out from this value, so a panel can never hold typed text and
// a file at the same time. Actions that are not allowed in the current state are ignored here, not just
// hidden in the page.

import { messages } from "@/lib/messages";
import { checkText, hasContent, textProblemMessage } from "@/lib/text-checks";
import type { ExtractResult, InputKind } from "@/lib/types";

export interface UploadedFile {
  name: string;
  sizeBytes: number;
  pages: number | null;
}

export type PanelState =
  | { status: "empty"; error: string | null }
  | { status: "typing"; text: string; error: string | null }
  | { status: "textReady"; text: string; error: string | null }
  | { status: "reading"; fileName: string }
  | { status: "fileReady"; text: string; file: UploadedFile; error: string | null };

export type PanelAction =
  | { type: "typed"; text: string }
  | { type: "confirmText" }
  | { type: "clearText" }
  | { type: "fileStarted"; fileName: string }
  | { type: "fileRejected"; error: string }
  | { type: "fileExtracted"; result: ExtractResult }
  | { type: "removeFile" }
  | { type: "serverRejected"; error: string }
  | { type: "reset" };

export const EMPTY_PANEL: PanelState = { status: "empty", error: null };

export function panelReducer(kind: InputKind, state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "typed":
      // Typing is blocked while a file is being read or is uploaded.
      if (state.status === "reading" || state.status === "fileReady") return state;
      return hasContent(action.text) ? { status: "typing", text: action.text, error: null } : EMPTY_PANEL;

    case "confirmText": {
      if (state.status !== "typing") return state;
      const problem = checkText(kind, state.text);
      return problem
        ? { ...state, error: textProblemMessage(kind, problem) }
        : { status: "textReady", text: state.text, error: null };
    }

    case "clearText":
      return state.status === "typing" || state.status === "textReady" ? EMPTY_PANEL : state;

    case "fileStarted":
      // Uploading is blocked while there is typed text.
      return state.status === "empty" ? { status: "reading", fileName: action.fileName } : state;

    case "fileRejected":
      // After a file error the file is not kept, and the panel returns to empty with the message shown.
      return state.status === "empty" || state.status === "reading" ? { status: "empty", error: action.error } : state;

    case "fileExtracted":
      // Ignored if the upload was removed while it was being read.
      if (state.status !== "reading") return state;
      return {
        status: "fileReady",
        text: action.result.text,
        file: { name: action.result.fileName, sizeBytes: action.result.sizeBytes, pages: action.result.pages },
        error: null,
      };

    case "removeFile":
      return state.status === "fileReady" || state.status === "reading" ? EMPTY_PANEL : state;

    case "serverRejected":
      return state.status === "textReady" || state.status === "fileReady" ? { ...state, error: action.error } : state;

    case "reset":
      return EMPTY_PANEL;
  }
}

export function isPanelReady(state: PanelState): boolean {
  return (state.status === "textReady" || state.status === "fileReady") && !state.error;
}

export function panelText(state: PanelState): string {
  return state.status === "typing" || state.status === "textReady" || state.status === "fileReady" ? state.text : "";
}

export function hasTypedText(state: PanelState): boolean {
  return state.status === "typing" || state.status === "textReady";
}

export function hasFile(state: PanelState): boolean {
  return state.status === "reading" || state.status === "fileReady";
}

export function panelError(state: PanelState): string | null {
  return state.status === "reading" ? null : state.error;
}

/** The checklist line under Analyse for this panel. */
export function checklistStatus(state: PanelState): { ready: boolean; text: string } {
  if (isPanelReady(state)) return { ready: true, text: "ready" };
  if (panelError(state)) return { ready: false, text: "fix the problem shown in the panel" };
  switch (state.status) {
    case "typing":
      return { ready: false, text: "click Done to confirm the text" };
    case "reading":
      return { ready: false, text: "reading the file…" };
    default:
      return { ready: false, text: "not added yet" };
  }
}

/** Checks done in the browser before a file is sent; the server repeats them. */
export function checkFileBeforeUpload(file: File, maxBytes: number): string | null {
  if (file.size === 0) return messages.emptyFile();
  if (file.size > maxBytes) return messages.fileTooLarge(file.size);
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (extension === "doc") return messages.docNotSupported();
  if (extension !== "pdf" && extension !== "docx") return messages.unsupportedType();
  return null;
}
