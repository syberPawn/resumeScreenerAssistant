import "server-only";

// Server-only settings. None of these may start with NEXT_PUBLIC_, which would send them to the browser.
// Values are read when first used, so a missing one fails the request clearly instead of the build.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get geminiApiKey() {
    return required("GEMINI_API_KEY");
  },
  get geminiPrimaryModel() {
    return required("GEMINI_PRIMARY_MODEL");
  },
  get geminiFallbackModel() {
    return required("GEMINI_FALLBACK_MODEL");
  },
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get profileSigningSecret() {
    const secret = required("PROFILE_SIGNING_SECRET");
    if (secret.length < 32) throw new Error("PROFILE_SIGNING_SECRET must be at least 32 characters");
    return secret;
  },
};
