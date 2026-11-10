// Shapes shared by the browser and the server.

export type InputKind = "resume" | "jobDescription";

export interface Profile {
  name: string;
  currentRole: string | null;
  yearsOfExperience: number | null;
  location: string | null;
  email: string | null;
  phone: string | null;
}

export interface Report {
  matchingSkills: string[];
  gaps: string[];
  interviewQuestions: string[];
}

/** A completed analysis, as returned by the API. */
export interface SavedAnalysis {
  id: string;
  createdAt: string;
  jobTitle: string | null;
  matchScore: number;
  profile: Profile;
  report: Report;
}

/** One row of the History list. */
export interface HistoryItem {
  id: string;
  createdAt: string;
  candidateName: string;
  jobTitle: string | null;
  matchScore: number;
}

export interface HistoryPage {
  items: HistoryItem[];
  /** Entries matching the current search and filter. */
  total: number;
  /** All saved entries, used by "Delete all history". */
  overallTotal: number;
  page: number;
  pageSize: number;
}

export type ScoreRange = "all" | "below-70" | "70-89" | "90-100";

export interface ExtractResult {
  text: string;
  fileName: string;
  sizeBytes: number;
  pages: number | null;
}

export interface ProfileResult {
  profile: Profile;
  signature: string;
}

/** Error body returned by every API route. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** The panel the problem belongs to, when there is one. */
    field?: InputKind;
  };
}
