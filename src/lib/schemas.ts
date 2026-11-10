// Zod schemas for request bodies, query parameters and AI output.
// Every route validates its input with these before doing anything else.

import { z } from "zod";
import { LIMITS } from "./limits";

// A generous cap on raw request text. The friendly limits are checked by checkText().
const MAX_RAW_TEXT = 100_000;

export const inputKindSchema = z.enum(["resume", "jobDescription"]);

const nullableText = (max: number) => z.string().max(max).nullable();

export const profileSchema = z
  .object({
    name: z.string().min(1).max(200),
    currentRole: nullableText(200),
    yearsOfExperience: z.number().min(0).max(80).nullable(),
    location: nullableText(200),
    email: nullableText(254),
    phone: nullableText(50),
  })
  .strict();

export const profileRequestSchema = z
  .object({
    resumeText: z.string().max(MAX_RAW_TEXT),
    jobDescriptionText: z.string().max(MAX_RAW_TEXT),
  })
  .strict();

export const analysisRequestSchema = profileRequestSchema
  .extend({
    profile: profileSchema,
    signature: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();

export const scoreRangeSchema = z.enum(["all", "below-70", "70-89", "90-100"]);

/** Score bounds for each fixed History range. 90 belongs to the top range, so no score falls in two. */
export const SCORE_RANGES = {
  "below-70": [0, 69],
  "70-89": [70, 89],
  "90-100": [90, 100],
} as const;

export const listQuerySchema = z.object({
  range: scoreRangeSchema.default("all"),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(LIMITS.suggestMinChars).max(100),
});

export const idSchema = z.uuid();

export const deleteAllSchema = z.object({ confirm: z.literal("delete-all") }).strict();

// ---------- AI output ----------
// The model can return values slightly off the schema, so these schemas tidy what is safe to tidy
// (trim text, cut lists to their maximum, read "5+" as 5) and reject the rest.

const tidy = (s: string) => s.trim().replace(/\s+/g, " ");

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const text = tidy(value);
      return text ? text.slice(0, max) : null;
    });

const textList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string())
    .transform((items) => items.map(tidy).filter(Boolean).slice(0, maxItems).map((s) => s.slice(0, maxLength)));

function toYears(value: unknown): number | null {
  const n =
    typeof value === "number" ? value : typeof value === "string" ? Number(value.match(/\d+(\.\d+)?/)?.[0]) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 80) return null;
  return Math.round(n * 10) / 10;
}

export const aiProfileSchema = z.object({
  isResume: z.boolean(),
  isJobDescription: z.boolean(),
  name: optionalText(200),
  currentRole: optionalText(200),
  yearsOfExperience: z.union([z.number(), z.string(), z.null()]).optional().transform(toYears),
  location: optionalText(200),
  email: optionalText(254),
  phone: optionalText(50),
});

export const aiReportSchema = z.object({
  jobTitle: optionalText(200),
  matchScore: z
    .number()
    .transform((n) => Math.round(n))
    .pipe(z.number().int().min(0).max(100)),
  matchingSkills: textList(5, 200),
  gaps: textList(3, 300),
  interviewQuestions: textList(3, 500).pipe(z.array(z.string()).length(3)),
});

export type AiProfile = z.infer<typeof aiProfileSchema>;
export type AiReport = z.infer<typeof aiReportSchema>;
