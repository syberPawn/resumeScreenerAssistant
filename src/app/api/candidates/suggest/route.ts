import { suggestQuerySchema } from "@/lib/schemas";
import { suggestCandidateNames } from "@/lib/server/analyses-repo";
import { json, logError } from "@/lib/server/http";

// GET /api/candidates/suggest?q=: candidate names for the History search box.
// Suggestions are a convenience, so any problem returns an empty list instead of an error.

export async function GET(request: Request): Promise<Response> {
  const parsed = suggestQuerySchema.safeParse({ q: new URL(request.url).searchParams.get("q") ?? "" });
  if (!parsed.success) return json({ names: [] });

  try {
    return json({ names: await suggestCandidateNames(parsed.data.q) });
  } catch (error) {
    logError("candidates:suggest", error);
    return json({ names: [] });
  }
}
