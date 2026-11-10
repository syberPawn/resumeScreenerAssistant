import { test as base, expect, type Locator, type Page, type Route } from "@playwright/test";
import type { HistoryItem, Profile, SavedAnalysis } from "../src/lib/types";

// Test setup shared by every E2E test.
// - Any request to a host other than localhost is blocked, so a test can never reach the internet.
// - Calls to the profile, analysis, History and suggestion routes are answered here with fixed data,
//   so Gemini and Supabase are never contacted. File upload (/api/extract) runs for real, since it
//   uses no outside service.

export const PROFILE: Profile = {
  name: "Priya Sharma",
  currentRole: "Senior Data Analyst",
  yearsOfExperience: 6,
  location: "Bengaluru, India",
  email: "priya.sharma@example.com",
  phone: null,
};

const REPORT = {
  matchingSkills: ["SQL", "Python", "Tableau", "A/B testing", "dbt"],
  gaps: ["Power BI", "Retail domain depth", "Team leadership at scale"],
  interviewQuestions: [
    "Walk us through a dashboard you built end to end.",
    "How did you design the demand forecasts at Acme Retail?",
    "How would you approach learning Power BI quickly?",
  ],
};

export function savedAnalysis(id: string, profile: Profile, matchScore: number, createdAt: string): SavedAnalysis {
  return { id, createdAt, jobTitle: "Data Analyst", matchScore, profile, report: REPORT };
}

interface ApiError {
  status: number;
  code: string;
  message: string;
  field?: "resume" | "jobDescription";
}

export class MockApi {
  /** Saved analyses, newest first. */
  analyses: SavedAnalysis[] = [];
  /** When set, the profile request fails with this error. */
  profileError: ApiError | null = null;
  /** When set, the analysis request waits until this promise resolves, so the loading state can be checked. */
  holdAnalysis: Promise<void> | null = null;
  /** Bodies sent to POST /api/analyses. */
  analysisRequests: Record<string, unknown>[] = [];
  /** Bodies sent to DELETE /api/analyses (delete all). */
  deleteAllRequests: unknown[] = [];
  /** IDs sent to DELETE /api/analyses/{id}. */
  deletedIds: string[] = [];

  constructor(private readonly page: Page) {}

  async install() {
    await this.page.route(/\/api\/profile$/, (route) => this.profile(route));
    await this.page.route(/\/api\/analyses(\?.*)?$/, (route) => this.collection(route));
    await this.page.route(/\/api\/analyses\/[^/?]+$/, (route) => this.single(route));
    await this.page.route(/\/api\/candidates\/suggest\?.*$/, (route) => this.suggest(route));
  }

  private fail(route: Route, error: ApiError) {
    const { status, ...body } = error;
    return route.fulfill({ status, json: { error: body } });
  }

  private async profile(route: Route) {
    if (this.profileError) return this.fail(route, this.profileError);
    return route.fulfill({ json: { profile: PROFILE, signature: "a".repeat(64) } });
  }

  private async collection(route: Route) {
    const request = route.request();
    const method = request.method();

    if (method === "POST") {
      this.analysisRequests.push(request.postDataJSON());
      if (this.holdAnalysis) await this.holdAnalysis;
      const saved = savedAnalysis("11111111-2222-4333-8444-555555555555", PROFILE, 84, new Date().toISOString());
      this.analyses.unshift(saved);
      return route.fulfill({ status: 201, json: saved });
    }

    if (method === "DELETE") {
      this.deleteAllRequests.push(request.postDataJSON());
      const deleted = this.analyses.length;
      this.analyses = [];
      return route.fulfill({ json: { deleted } });
    }

    // GET: the History list, with the same ranges, search and paging as the real route.
    const params = new URL(request.url()).searchParams;
    const range = params.get("range") ?? "all";
    const q = (params.get("q") ?? "").toLowerCase();
    const page = Number(params.get("page") ?? 1);
    const bounds: Record<string, [number, number]> = { "below-70": [0, 69], "70-89": [70, 89], "90-100": [90, 100] };
    const matching = this.analyses.filter((a) => {
      const [min, max] = bounds[range] ?? [0, 100];
      return a.matchScore >= min && a.matchScore <= max && a.profile.name.toLowerCase().includes(q);
    });
    const items: HistoryItem[] = matching.slice((page - 1) * 20, page * 20).map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      candidateName: a.profile.name,
      jobTitle: a.jobTitle,
      matchScore: a.matchScore,
    }));
    return route.fulfill({
      json: { items, total: matching.length, overallTotal: this.analyses.length, page, pageSize: 20 },
    });
  }

  private async single(route: Route) {
    const id = new URL(route.request().url()).pathname.split("/").pop()!;
    const found = this.analyses.find((a) => a.id === id);
    const notFound: ApiError = {
      status: 404,
      code: "NOT_FOUND",
      message: "This analysis wasn't found. It may have been deleted, or the link is wrong. Open it from History.",
    };
    if (!found) return this.fail(route, notFound);
    if (route.request().method() === "DELETE") {
      this.deletedIds.push(id);
      this.analyses = this.analyses.filter((a) => a.id !== id);
      return route.fulfill({ json: { deleted: 1 } });
    }
    return route.fulfill({ json: found });
  }

  private async suggest(route: Route) {
    const q = (new URL(route.request().url()).searchParams.get("q") ?? "").toLowerCase();
    const names = [...new Set(this.analyses.map((a) => a.profile.name))].filter((n) => n.toLowerCase().includes(q));
    return route.fulfill({ json: { names: names.slice(0, 8) } });
  }
}

export const test = base.extend<{ api: MockApi }>({
  page: async ({ page }, provide) => {
    await page.route(
      (url) => url.hostname !== "localhost",
      (route) => route.abort(),
    );
    await provide(page);
  },
  api: async ({ page }, provide) => {
    const api = new MockApi(page);
    await api.install();
    await provide(api);
  },
});

export { expect };

/** Uploads a file the way a user does: click "Choose file" and pick it in the file chooser. */
export async function uploadFile(page: Page, group: Locator, name: string, buffer: Uint8Array) {
  const chooser = page.waitForEvent("filechooser");
  await group.getByRole("button", { name: "Choose file" }).click();
  await (await chooser).setFiles({ name, mimeType: "application/pdf", buffer: Buffer.from(buffer) });
}

/** Panels and their parts on the Home page. */
export function homePage(page: Page) {
  return {
    jobDescription: page.getByRole("region", { name: "Job description" }),
    resume: page.getByRole("region", { name: "Candidate resume" }),
    jobDescriptionFile: page.getByRole("group", { name: "Job description file" }),
    resumeFile: page.getByRole("group", { name: "Resume file" }),
    analyse: page.getByRole("button", { name: "Analyse" }),
  };
}
