import { beforeEach, describe, expect, it, vi } from "vitest";

// The database is replaced, so these tests need no Supabase project.
const listAnalyses = vi.fn();
const getAnalysis = vi.fn();
const deleteAnalysis = vi.fn();
const suggestCandidateNames = vi.fn();

vi.mock("@/lib/server/analyses-repo", () => ({
  listAnalyses: (...args: unknown[]) => listAnalyses(...args),
  getAnalysis: (...args: unknown[]) => getAnalysis(...args),
  deleteAnalysis: (...args: unknown[]) => deleteAnalysis(...args),
  suggestCandidateNames: (...args: unknown[]) => suggestCandidateNames(...args),
  insertAnalysis: vi.fn(),
  deleteAllAnalyses: vi.fn(),
}));

const { GET: listRoute } = await import("@/app/api/analyses/route");
const { GET: getRoute, DELETE: deleteRoute } = await import("@/app/api/analyses/[id]/route");
const { GET: suggestRoute } = await import("@/app/api/candidates/suggest/route");

const ID = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/analyses/[id]">;
const get = (path: string) => new Request(`http://localhost${path}`);

beforeEach(() => {
  listAnalyses.mockReset();
  getAnalysis.mockReset();
  deleteAnalysis.mockReset();
  suggestCandidateNames.mockReset();
});

describe("GET /api/analyses (History list)", () => {
  const page = { items: [], total: 0, overallTotal: 0, page: 1, pageSize: 20 };

  it("uses newest-first defaults when no filter is given", async () => {
    listAnalyses.mockResolvedValueOnce(page);
    const response = await listRoute(get("/api/analyses"));
    expect(response.status).toBe(200);
    expect(listAnalyses).toHaveBeenCalledWith({ range: "all", q: "", page: 1 });
  });

  it("passes a fixed score range, a trimmed name search and the page", async () => {
    listAnalyses.mockResolvedValueOnce(page);
    await listRoute(get("/api/analyses?range=90-100&q=%20Priya%20&page=2"));
    expect(listAnalyses).toHaveBeenCalledWith({ range: "90-100", q: "Priya", page: 2 });
  });

  it("rejects a range that is not one of the four fixed ranges", async () => {
    const response = await listRoute(get("/api/analyses?range=0-100"));
    expect(response.status).toBe(400);
    expect(listAnalyses).not.toHaveBeenCalled();
  });

  it("rejects an invalid page number", async () => {
    expect((await listRoute(get("/api/analyses?page=0"))).status).toBe(400);
    expect((await listRoute(get("/api/analyses?page=abc"))).status).toBe(400);
  });

  it("shows the History message when the database fails", async () => {
    listAnalyses.mockRejectedValueOnce(new Error("connection refused"));
    const response = await listRoute(get("/api/analyses"));
    expect(response.status).toBe(500);
    expect((await response.json()).error.message).toBe("History couldn't be loaded. Try again.");
  });
});

describe("GET /api/analyses/{id}", () => {
  it("returns a saved analysis", async () => {
    getAnalysis.mockResolvedValueOnce({ id: ID, matchScore: 84 });
    const response = await getRoute(get(`/api/analyses/${ID}`), ctx(ID));
    expect(response.status).toBe(200);
    expect(getAnalysis).toHaveBeenCalledWith(ID);
  });

  it("returns not found for an unknown ID", async () => {
    getAnalysis.mockResolvedValueOnce(null);
    const response = await getRoute(get(`/api/analyses/${ID}`), ctx(ID));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("rejects an invalid ID without querying the database", async () => {
    const response = await getRoute(get("/api/analyses/not-a-uuid"), ctx("not-a-uuid"));
    expect(response.status).toBe(404);
    expect(getAnalysis).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/analyses/{id}", () => {
  it("deletes one analysis", async () => {
    deleteAnalysis.mockResolvedValueOnce(true);
    const response = await deleteRoute(new Request(`http://localhost/api/analyses/${ID}`, { method: "DELETE" }), ctx(ID));
    expect(await response.json()).toEqual({ deleted: 1 });
  });

  it("returns not found when the analysis is already gone", async () => {
    deleteAnalysis.mockResolvedValueOnce(false);
    const response = await deleteRoute(new Request(`http://localhost/api/analyses/${ID}`, { method: "DELETE" }), ctx(ID));
    expect(response.status).toBe(404);
  });

  it("rejects an invalid ID without touching the database", async () => {
    const response = await deleteRoute(new Request("http://localhost/api/analyses/1", { method: "DELETE" }), ctx("1"));
    expect(response.status).toBe(404);
    expect(deleteAnalysis).not.toHaveBeenCalled();
  });
});

describe("GET /api/candidates/suggest", () => {
  it("returns nothing below 2 characters, without querying", async () => {
    const response = await suggestRoute(get("/api/candidates/suggest?q=P"));
    expect(await response.json()).toEqual({ names: [] });
    expect(suggestCandidateNames).not.toHaveBeenCalled();
  });

  it("returns matching names", async () => {
    suggestCandidateNames.mockResolvedValueOnce(["Priya Sharma", "Priyanka Rao"]);
    const response = await suggestRoute(get("/api/candidates/suggest?q=pri"));
    expect(await response.json()).toEqual({ names: ["Priya Sharma", "Priyanka Rao"] });
    expect(suggestCandidateNames).toHaveBeenCalledWith("pri");
  });

  it("returns an empty list instead of an error when the database fails", async () => {
    suggestCandidateNames.mockRejectedValueOnce(new Error("timeout"));
    const response = await suggestRoute(get("/api/candidates/suggest?q=pri"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ names: [] });
  });
});
