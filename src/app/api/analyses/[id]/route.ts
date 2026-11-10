import { messages } from "@/lib/messages";
import { idSchema } from "@/lib/schemas";
import { deleteAnalysis, getAnalysis } from "@/lib/server/analyses-repo";
import { errorResponse, json, logError } from "@/lib/server/http";
import type { SavedAnalysis } from "@/lib/types";

// GET returns one saved analysis; DELETE removes it permanently.

export async function GET(_request: Request, ctx: RouteContext<"/api/analyses/[id]">): Promise<Response> {
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(404, "NOT_FOUND", messages.analysisNotFound());

  try {
    const analysis = await getAnalysis(id.data);
    if (!analysis) return errorResponse(404, "NOT_FOUND", messages.analysisNotFound());
    return json<SavedAnalysis>(analysis);
  } catch (error) {
    logError("analyses:get", error);
    return errorResponse(500, "LOAD_FAILED", messages.historyLoadFailed());
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/analyses/[id]">): Promise<Response> {
  const id = idSchema.safeParse((await ctx.params).id);
  if (!id.success) return errorResponse(404, "NOT_FOUND", messages.analysisNotFound());

  try {
    const deleted = await deleteAnalysis(id.data);
    if (!deleted) return errorResponse(404, "NOT_FOUND", messages.analysisNotFound());
    return json({ deleted: 1 });
  } catch (error) {
    logError("analyses:delete", error);
    return errorResponse(500, "DELETE_FAILED", messages.deleteOneFailed());
  }
}
