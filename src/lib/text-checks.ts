// Basic text checks, run in the browser and again on the server. Gemini then confirms the meaning
// (is it really a resume, is it really a job description) in the profile request.

import { LIMITS } from "./limits";
import { messages } from "./messages";
import type { InputKind } from "./types";

/** True when the text has at least one character that is not a space or line break. */
export function hasContent(text: string): boolean {
  return /\S/.test(text);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Share of non-space characters that are letters in any language (including combining marks). */
export function letterShare(text: string): number {
  const nonSpace = text.replace(/\s+/g, "");
  if (!nonSpace) return 0;
  const letters = nonSpace.match(/[\p{L}\p{M}]/gu)?.length ?? 0;
  return letters / nonSpace.length;
}

/** Tidies extracted text: collapses runs of spaces and blank lines, and trims the ends. */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type TextProblem =
  | { code: "EMPTY" }
  | { code: "TOO_LONG"; characters: number }
  | { code: "TOO_SHORT"; words: number }
  | { code: "MOSTLY_SYMBOLS" };

/** Returns the first problem with the text, or null when it passes. */
export function checkText(kind: InputKind, text: string): TextProblem | null {
  const trimmed = text.trim();
  if (!hasContent(trimmed)) return { code: "EMPTY" };
  if (trimmed.length > LIMITS[kind].maxChars) return { code: "TOO_LONG", characters: trimmed.length };
  const words = countWords(trimmed);
  if (words < LIMITS[kind].minWords) return { code: "TOO_SHORT", words };
  if (letterShare(trimmed) < LIMITS.minLetterShare) return { code: "MOSTLY_SYMBOLS" };
  return null;
}

export function textProblemMessage(kind: InputKind, problem: TextProblem): string {
  switch (problem.code) {
    case "EMPTY":
      return messages.tooShort(kind, 0);
    case "TOO_LONG":
      return messages.tooLong(kind, problem.characters);
    case "TOO_SHORT":
      return messages.tooShort(kind, problem.words);
    case "MOSTLY_SYMBOLS":
      return messages.mostlySymbols(kind);
  }
}
