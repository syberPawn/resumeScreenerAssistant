import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import type { z } from "zod";
import { env } from "./env";
import { logError } from "./http";

// Gemini calls with structured output and one fallback model.
// Fall back only on a rate limit, a server error or a timeout. Anything else fails straight away.

/** Each call's time limit. Primary plus fallback must fit inside the route's maxDuration. */
const CALL_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 8192;

export type AiFailure = "RATE_LIMIT" | "FAILED";

export class AiError extends Error {
  constructor(readonly failure: AiFailure) {
    super(failure);
    this.name = "AiError";
  }
}

class InvalidOutputError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "InvalidOutputError";
  }
}

let client: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

/** Gemini 2.x models take a thinking budget; Gemini 3 and later take a thinking level. */
function thinkingFor(model: string): ThinkingConfig {
  return /^gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.LOW };
}

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  const name = (error as Error | undefined)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

async function callModel(model: string, instruction: string, content: string, schema: object): Promise<unknown> {
  // Temperature is left at its default: Google advises keeping Gemini 3 models at 1.0.
  const response = await getClient().models.generateContent({
    model,
    contents: content,
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: thinkingFor(model),
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  const text = response.text;
  // Safety blocks, empty answers and cut-off JSON all count as failures.
  if (!text) throw new InvalidOutputError(`empty response (${finishReason ?? "no candidate"})`);
  if (finishReason && finishReason !== "STOP") throw new InvalidOutputError(`finish reason ${finishReason}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidOutputError("response is not valid JSON");
  }
}

export async function generateStructured<S extends z.ZodType>(options: {
  instruction: string;
  content: string;
  responseSchema: object;
  outputSchema: S;
}): Promise<{ data: z.output<S>; model: string }> {
  const models = [env.geminiPrimaryModel, env.geminiFallbackModel];
  let sawRateLimit = false;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const raw = await callModel(model, options.instruction, options.content, options.responseSchema);
      const parsed = options.outputSchema.safeParse(raw);
      if (!parsed.success) throw new InvalidOutputError("response does not match the schema");
      return { data: parsed.data, model };
    } catch (error) {
      logError(`gemini:${model}`, error);
      if (error instanceof ApiError && error.status === 429) sawRateLimit = true;
      const isLast = i === models.length - 1;
      if (isLast || !isRetryable(error)) throw new AiError(sawRateLimit ? "RATE_LIMIT" : "FAILED");
    }
  }
  throw new AiError("FAILED");
}
