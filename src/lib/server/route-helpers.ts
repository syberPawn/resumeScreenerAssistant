import "server-only";

import { messages } from "@/lib/messages";
import { checkText, textProblemMessage } from "@/lib/text-checks";
import type { InputKind } from "@/lib/types";
import { AiError } from "./gemini";
import { errorResponse, logError } from "./http";

/** Runs the basic checks on both texts. Returns an error response for the first panel that fails. */
export function checkBothTexts(texts: Record<InputKind, string>): Response | null {
  // Job description first, matching the panel order on the Home page.
  for (const kind of ["jobDescription", "resume"] as const) {
    const problem = checkText(kind, texts[kind]);
    if (problem) return errorResponse(422, `TEXT_${problem.code}`, textProblemMessage(kind, problem), kind);
  }
  return null;
}

/** Turns an AI failure or an unexpected error into the matching message. */
export function analysisErrorResponse(context: string, error: unknown): Response {
  if (error instanceof AiError) {
    return error.failure === "RATE_LIMIT"
      ? errorResponse(429, "AI_LIMIT", messages.aiLimit())
      : errorResponse(502, "ANALYSIS_FAILED", messages.analysisFailed());
  }
  logError(context, error);
  return errorResponse(500, "ANALYSIS_FAILED", messages.analysisFailed());
}
