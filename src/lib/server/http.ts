import "server-only";

import type { ApiErrorBody, InputKind } from "@/lib/types";

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function errorResponse(status: number, code: string, message: string, field?: InputKind): Response {
  const body: ApiErrorBody = { error: { code, message, ...(field ? { field } : {}) } };
  return Response.json(body, { status, headers: NO_STORE });
}

/** Reads a JSON body, returning undefined when it is missing or not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Logs an error without personal data: only its type, status, code and a short message.
 * Never pass request bodies, resume text, prompts or AI responses here.
 */
export function logError(context: string, error: unknown): void {
  const e = error as { name?: string; status?: number; code?: string; message?: string } | undefined;
  console.error(
    JSON.stringify({
      context,
      name: e?.name,
      status: e?.status,
      code: e?.code,
      message: typeof e?.message === "string" ? e.message.slice(0, 200) : undefined,
    }),
  );
}
