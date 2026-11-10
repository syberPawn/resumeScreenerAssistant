// Calls our own API routes and turns every outcome into either data or a plain message for HR.

import { messages } from "@/lib/messages";
import type { ApiErrorBody } from "@/lib/types";

export type ApiFailure = ApiErrorBody["error"] & { status: number };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

/**
 * @param fallbackMessage shown when the response is not one of ours, for example Vercel's own
 * non-JSON 413 response for a body over 4.5 MB.
 */
export async function apiRequest<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { ok: false, error: { status: 0, code: "NO_CONNECTION", message: messages.noConnection() } };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (response.ok && body !== undefined) return { ok: true, data: body as T };

  const error = (body as Partial<ApiErrorBody> | undefined)?.error;
  if (error && typeof error.message === "string" && typeof error.code === "string") {
    return { ok: false, error: { ...error, status: response.status } };
  }
  return {
    ok: false,
    error: { status: response.status, code: response.status === 413 ? "FILE_TOO_LARGE" : "UNEXPECTED", message: fallbackMessage },
  };
}

export function postJson(body: unknown, signal?: AbortSignal): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal };
}
