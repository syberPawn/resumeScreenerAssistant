// Input limits and other fixed values.
// Used by both the browser and the server, so they always agree.

export const LIMITS = {
  /** Largest uploaded file, in bytes (4 MB, under Vercel's 4.5 MB request limit). */
  fileBytes: 4 * 1024 * 1024,
  /** Most pages a PDF may have. */
  pdfPages: 10,
  resume: { minWords: 50, maxChars: 20_000 },
  jobDescription: { minWords: 20, maxChars: 10_000 },
  /** Share of non-space characters that must be letters (any language). */
  minLetterShare: 0.6,
  /** How long text extraction may take before giving up. */
  extractTimeoutMs: 10_000,
  /** Largest total uncompressed size of a .docx file, to stop zip bombs. */
  docxMaxUncompressedBytes: 50 * 1024 * 1024,
  /** History rows per page. */
  historyPageSize: 20,
  /** Autocomplete starts after this many characters. */
  suggestMinChars: 2,
  /** Autocomplete waits this long after typing stops. */
  suggestDebounceMs: 250,
} as const;

export const UNKNOWN_CANDIDATE = "Unknown candidate";
