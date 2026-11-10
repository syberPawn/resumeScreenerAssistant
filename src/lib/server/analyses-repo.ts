import "server-only";

import { LIMITS } from "@/lib/limits";
import { SCORE_RANGES } from "@/lib/schemas";
import type { HistoryItem, HistoryPage, Profile, Report, SavedAnalysis, ScoreRange } from "@/lib/types";
import { db } from "./supabase";

// All database access for the analyses table.
// Queries use the query builder only; user input is never pasted into filter strings.

const TABLE = "analyses";
const SAVED_COLUMNS = "id, created_at, candidate_name, profile, job_title, match_score, report";
const LIST_COLUMNS = "id, created_at, candidate_name, job_title, match_score";

type StoredProfile = Omit<Profile, "name">;

interface SavedRow {
  id: string;
  created_at: string;
  candidate_name: string;
  profile: StoredProfile;
  job_title: string | null;
  match_score: number;
  report: Report;
}

interface ListRow {
  id: string;
  created_at: string;
  candidate_name: string;
  job_title: string | null;
  match_score: number;
}

export class DatabaseError extends Error {
  constructor(readonly code: string | undefined, message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Only the code and message are kept. Postgres error details can contain the row's personal data.
function fail(error: { code?: string; message: string }): never {
  throw new DatabaseError(error.code, error.message);
}

function toSaved(row: SavedRow): SavedAnalysis {
  return {
    id: row.id,
    createdAt: row.created_at,
    jobTitle: row.job_title,
    matchScore: row.match_score,
    profile: { name: row.candidate_name, ...row.profile },
    report: row.report,
  };
}

function toItem(row: ListRow): HistoryItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    candidateName: row.candidate_name,
    jobTitle: row.job_title,
    matchScore: row.match_score,
  };
}

/** Escapes LIKE wildcards. "*" is removed because the Supabase API treats it as a wildcard too. */
export function escapeLike(text: string): string {
  return text.replace(/\*/g, "").replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function insertAnalysis(input: {
  profile: Profile;
  jobTitle: string | null;
  jobDescription: string;
  matchScore: number;
  report: Report;
  modelUsed: string;
}): Promise<SavedAnalysis> {
  const { name, ...profile } = input.profile;
  const { data, error } = await db()
    .from(TABLE)
    .insert({
      candidate_name: name,
      profile,
      job_title: input.jobTitle,
      job_description: input.jobDescription,
      match_score: input.matchScore,
      report: input.report,
      model_used: input.modelUsed,
    })
    .select(SAVED_COLUMNS)
    .single<SavedRow>();
  if (error) fail(error);
  return toSaved(data);
}

export async function getAnalysis(id: string): Promise<SavedAnalysis | null> {
  const { data, error } = await db().from(TABLE).select(SAVED_COLUMNS).eq("id", id).maybeSingle<SavedRow>();
  if (error) fail(error);
  return data ? toSaved(data) : null;
}

async function countAll(): Promise<number> {
  const { count, error } = await db().from(TABLE).select("id", { count: "exact", head: true });
  if (error) fail(error);
  return count ?? 0;
}

export async function listAnalyses(options: { range: ScoreRange; q: string; page: number }): Promise<HistoryPage> {
  const pageSize = LIMITS.historyPageSize;
  const from = (options.page - 1) * pageSize;

  let query = db()
    .from(TABLE)
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (options.range !== "all") {
    const [min, max] = SCORE_RANGES[options.range];
    query = query.gte("match_score", min).lte("match_score", max);
  }
  const search = escapeLike(options.q);
  if (search) query = query.ilike("candidate_name", `%${search}%`);

  const [{ data, count, error }, overallTotal] = await Promise.all([query, countAll()]);
  // PGRST103: the page is past the last result, for example after entries were deleted.
  if (error && error.code !== "PGRST103") fail(error);

  return {
    items: error ? [] : (data as ListRow[]).map(toItem),
    total: error ? 0 : (count ?? 0),
    overallTotal,
    page: options.page,
    pageSize,
  };
}

/** Returns true when a row was deleted. */
export async function deleteAnalysis(id: string): Promise<boolean> {
  const { count, error } = await db().from(TABLE).delete({ count: "exact" }).eq("id", id);
  if (error) fail(error);
  return (count ?? 0) > 0;
}

/** Deletes every saved analysis and returns how many were deleted. */
export async function deleteAllAnalyses(): Promise<number> {
  // An explicit filter that matches every row, since a delete without a filter may be refused.
  const { count, error } = await db().from(TABLE).delete({ count: "exact" }).not("id", "is", null);
  if (error) fail(error);
  return count ?? 0;
}

/** Up to 8 distinct names containing the text, names starting with it first (database function). */
export async function suggestCandidateNames(q: string): Promise<string[]> {
  const { data, error } = await db().rpc("suggest_candidate_names", { search: q });
  if (error) fail(error);
  return ((data ?? []) as { suggestion: string }[]).map((row) => row.suggestion);
}
