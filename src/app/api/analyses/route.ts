import { messages } from "@/lib/messages";
import { aiReportSchema, analysisRequestSchema, deleteAllSchema, listQuerySchema } from "@/lib/schemas";
import { deleteAllAnalyses, insertAnalysis, listAnalyses } from "@/lib/server/analyses-repo";
import { env } from "@/lib/server/env";
import { generateStructured } from "@/lib/server/gemini";
import { errorResponse, json, logError, readJson } from "@/lib/server/http";
import { buildUserContent, REPORT_INSTRUCTION, REPORT_RESPONSE_SCHEMA } from "@/lib/server/prompts";
import { analysisErrorResponse, checkBothTexts } from "@/lib/server/route-helpers";
import { verifyProfileSignature } from "@/lib/server/signing";
import type { HistoryPage, SavedAnalysis } from "@/lib/types";

export const maxDuration = 60;

// POST /api/analyses: checks the signed profile, generates the report, saves it and returns it.
// A row is written only when the report succeeds.
export async function POST(request: Request): Promise<Response> {
  const parsed = analysisRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, "REQUEST_INVALID", messages.requestRejected());

  const { profile, signature } = parsed.data;
  const resumeText = parsed.data.resumeText.trim();
  const jobDescriptionText = parsed.data.jobDescriptionText.trim();
  const textError = checkBothTexts({ resume: resumeText, jobDescription: jobDescriptionText });
  if (textError) return textError;

  try {
    // Rejects an edited profile, or one sent with texts other than those it was produced from.
    if (!verifyProfileSignature(profile, resumeText, jobDescriptionText, signature, env.profileSigningSecret)) {
      return errorResponse(403, "SIGNATURE_INVALID", messages.requestRejected());
    }

    const { data: report, model } = await generateStructured({
      instruction: REPORT_INSTRUCTION,
      content: buildUserContent(resumeText, jobDescriptionText),
      responseSchema: REPORT_RESPONSE_SCHEMA,
      outputSchema: aiReportSchema,
    });

    const saved = await insertAnalysis({
      profile,
      jobTitle: report.jobTitle,
      jobDescription: jobDescriptionText,
      matchScore: report.matchScore,
      report: {
        matchingSkills: report.matchingSkills,
        gaps: report.gaps,
        interviewQuestions: report.interviewQuestions,
      },
      modelUsed: model,
    });
    return json<SavedAnalysis>(saved, 201);
  } catch (error) {
    return analysisErrorResponse("analyses:create", error);
  }
}

// GET /api/analyses: History list with score range, name search and paging.
export async function GET(request: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) return errorResponse(400, "REQUEST_INVALID", messages.historyLoadFailed());

  try {
    return json<HistoryPage>(await listAnalyses(parsed.data));
  } catch (error) {
    logError("analyses:list", error);
    return errorResponse(500, "HISTORY_LOAD_FAILED", messages.historyLoadFailed());
  }
}

// DELETE /api/analyses: deletes all history. Requires { "confirm": "delete-all" } in the body.
export async function DELETE(request: Request): Promise<Response> {
  const parsed = deleteAllSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, "CONFIRMATION_REQUIRED", messages.deleteAllFailed());

  try {
    return json({ deleted: await deleteAllAnalyses() });
  } catch (error) {
    logError("analyses:delete-all", error);
    return errorResponse(500, "DELETE_FAILED", messages.deleteAllFailed());
  }
}
