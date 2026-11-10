import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Profile } from "@/lib/types";

// Signed profile.
// The signature covers the profile and both texts, so POST /api/analyses can confirm the profile is the one
// Gemini produced for exactly these texts, which also passed the input checks.

function payload(profile: Profile, resumeText: string, jobDescriptionText: string): string {
  // A fixed-order array, so the same values always produce the same string.
  return JSON.stringify([
    "v1",
    profile.name,
    profile.currentRole,
    profile.yearsOfExperience,
    profile.location,
    profile.email,
    profile.phone,
    resumeText,
    jobDescriptionText,
  ]);
}

export function signProfile(profile: Profile, resumeText: string, jobDescriptionText: string, secret: string): string {
  return createHmac("sha256", secret).update(payload(profile, resumeText, jobDescriptionText)).digest("hex");
}

export function verifyProfileSignature(
  profile: Profile,
  resumeText: string,
  jobDescriptionText: string,
  signature: string,
  secret: string,
): boolean {
  const expected = Buffer.from(signProfile(profile, resumeText, jobDescriptionText, secret), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
