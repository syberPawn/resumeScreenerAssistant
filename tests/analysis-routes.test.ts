import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "./helpers/fixtures";

// Gemini and the database are replaced, so these tests need no keys and make no network calls.
const generateStructured = vi.fn();
const insertAnalysis = vi.fn();
const deleteAllAnalyses = vi.fn();

vi.mock("@/lib/server/gemini", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/gemini")>();
  return { ...original, generateStructured: (...args: unknown[]) => generateStructured(...args) };
});
vi.mock("@/lib/server/analyses-repo", () => ({
  insertAnalysis: (...args: unknown[]) => insertAnalysis(...args),
  deleteAllAnalyses: () => deleteAllAnalyses(),
  listAnalyses: vi.fn(),
}));

process.env.PROFILE_SIGNING_SECRET = "s".repeat(64);

const { POST: postProfile } = await import("@/app/api/profile/route");
const { POST: postAnalysis, DELETE: deleteAll } = await import("@/app/api/analyses/route");
const { AiError } = await import("@/lib/server/gemini");

const json = (body: unknown, method = "POST") =>
  new Request("http://localhost/api", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const texts = { resumeText: SAMPLE_RESUME, jobDescriptionText: SAMPLE_JOB_DESCRIPTION };

const aiProfile = {
  isResume: true,
  isJobDescription: true,
  name: "Priya Sharma",
  currentRole: "Senior Data Analyst",
  yearsOfExperience: 6,
  location: "Bengaluru, India",
  email: "priya.sharma@example.com",
  phone: "+1 555 0100 999", // invented: not in the resume
};

const aiReport = {
  jobTitle: "Data Analyst",
  matchScore: 84,
  matchingSkills: ["SQL", "Python"],
  gaps: ["Power BI"],
  interviewQuestions: ["Q1", "Q2", "Q3"],
};

async function getSignedProfile() {
  generateStructured.mockResolvedValueOnce({ data: aiProfile, model: "primary" });
  const response = await postProfile(json(texts));
  return response.json();
}

beforeEach(() => {
  generateStructured.mockReset();
  insertAnalysis.mockReset();
  deleteAllAnalyses.mockReset();
});

describe("POST /api/profile", () => {
  it("returns a signed profile, dropping contact details not in the resume", async () => {
    const body = await getSignedProfile();
    expect(body.profile.name).toBe("Priya Sharma");
    expect(body.profile.email).toBe("priya.sharma@example.com");
    expect(body.profile.phone).toBeNull();
    expect(body.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a blank resume without calling Gemini", async () => {
    const response = await postProfile(json({ ...texts, resumeText: "   " }));
    expect(response.status).toBe(422);
    expect((await response.json()).error.field).toBe("resume");
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("rejects text that Gemini judges is not a resume", async () => {
    generateStructured.mockResolvedValueOnce({ data: { ...aiProfile, isResume: false }, model: "primary" });
    const body = await (await postProfile(json(texts))).json();
    expect(body.error).toMatchObject({ code: "NOT_RESUME", field: "resume" });
  });

  it("saves a missing name as Unknown candidate", async () => {
    generateStructured.mockResolvedValueOnce({ data: { ...aiProfile, name: null }, model: "primary" });
    const body = await (await postProfile(json(texts))).json();
    expect(body.profile.name).toBe("Unknown candidate");
  });

  it("shows the usage-limit message when both models are rate limited", async () => {
    generateStructured.mockRejectedValueOnce(new AiError("RATE_LIMIT"));
    const response = await postProfile(json(texts));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("AI_LIMIT");
  });

  it("rejects unexpected fields", async () => {
    const response = await postProfile(json({ ...texts, extra: true }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/analyses", () => {
  it("saves the report for a correctly signed profile", async () => {
    const signed = await getSignedProfile();
    generateStructured.mockResolvedValueOnce({ data: aiReport, model: "primary" });
    insertAnalysis.mockImplementationOnce(async (input) => ({ id: "x", createdAt: "now", ...input }));

    const response = await postAnalysis(json({ ...texts, ...signed }));
    expect(response.status).toBe(201);
    expect(insertAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ profile: signed.profile, matchScore: 84, modelUsed: "primary" }),
    );
  });

  it("rejects an edited profile and saves nothing", async () => {
    const signed = await getSignedProfile();
    const response = await postAnalysis(json({ ...texts, ...signed, profile: { ...signed.profile, name: "Made Up" } }));
    expect(response.status).toBe(403);
    expect(insertAnalysis).not.toHaveBeenCalled();
  });

  it("rejects a signed profile sent with a different resume", async () => {
    const signed = await getSignedProfile();
    const otherResume = `${SAMPLE_RESUME} Also managed a budget of two million dollars.`;
    const response = await postAnalysis(json({ ...texts, resumeText: otherResume, ...signed }));
    expect(response.status).toBe(403);
    expect(insertAnalysis).not.toHaveBeenCalled();
  });

  it("saves nothing when the report fails", async () => {
    const signed = await getSignedProfile();
    generateStructured.mockRejectedValueOnce(new AiError("FAILED"));
    const response = await postAnalysis(json({ ...texts, ...signed }));
    expect(response.status).toBe(502);
    expect(insertAnalysis).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/analyses", () => {
  it("requires the explicit confirmation value", async () => {
    expect((await deleteAll(json({}, "DELETE"))).status).toBe(400);
    expect(deleteAllAnalyses).not.toHaveBeenCalled();

    deleteAllAnalyses.mockResolvedValueOnce(3);
    const response = await deleteAll(json({ confirm: "delete-all" }, "DELETE"));
    expect(await response.json()).toEqual({ deleted: 3 });
  });
});
