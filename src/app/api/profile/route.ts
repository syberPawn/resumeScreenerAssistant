import { verifiedContacts } from "@/lib/contact-check";
import { UNKNOWN_CANDIDATE } from "@/lib/limits";
import { messages } from "@/lib/messages";
import { aiProfileSchema, profileRequestSchema } from "@/lib/schemas";
import { env } from "@/lib/server/env";
import { generateStructured } from "@/lib/server/gemini";
import { errorResponse, json, readJson } from "@/lib/server/http";
import { buildUserContent, PROFILE_INSTRUCTION, PROFILE_RESPONSE_SCHEMA } from "@/lib/server/prompts";
import { analysisErrorResponse, checkBothTexts } from "@/lib/server/route-helpers";
import { signProfile } from "@/lib/server/signing";
import type { Profile, ProfileResult } from "@/lib/types";

// POST /api/profile: checks both texts, confirms with Gemini that they are a resume and a job description,
// and returns the profile with a signature.

export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const parsed = profileRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse(400, "REQUEST_INVALID", messages.requestInvalid());

  const resumeText = parsed.data.resumeText.trim();
  const jobDescriptionText = parsed.data.jobDescriptionText.trim();
  const textError = checkBothTexts({ resume: resumeText, jobDescription: jobDescriptionText });
  if (textError) return textError;

  try {
    const { data: ai } = await generateStructured({
      instruction: PROFILE_INSTRUCTION,
      content: buildUserContent(resumeText, jobDescriptionText),
      responseSchema: PROFILE_RESPONSE_SCHEMA,
      outputSchema: aiProfileSchema,
    });

    if (!ai.isJobDescription) {
      return errorResponse(422, "NOT_JOB_DESCRIPTION", messages.notJobDescription(), "jobDescription");
    }
    if (!ai.isResume) return errorResponse(422, "NOT_RESUME", messages.notResume(), "resume");

    const profile: Profile = {
      name: ai.name ?? UNKNOWN_CANDIDATE,
      currentRole: ai.currentRole,
      yearsOfExperience: ai.yearsOfExperience,
      location: ai.location,
      // Kept only if they appear in the resume, because the model can invent them.
      ...verifiedContacts(resumeText, ai.email, ai.phone),
    };
    const signature = signProfile(profile, resumeText, jobDescriptionText, env.profileSigningSecret);
    return json<ProfileResult>({ profile, signature });
  } catch (error) {
    return analysisErrorResponse("profile", error);
  }
}
