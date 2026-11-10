// Every message HR can see, in one place.
// Each one says what is wrong, gives the actual number against the limit, and says what to do next.

import { LIMITS } from "./limits";
import type { InputKind } from "./types";

const number = (n: number) => n.toLocaleString("en-US");

/** "resume" or "job description", for use inside sentences. */
export function kindLabel(kind: InputKind): string {
  return kind === "resume" ? "resume" : "job description";
}

/** "Resume" or "Job description", for headings and checklist lines. */
export function kindTitle(kind: InputKind): string {
  return kind === "resume" ? "Resume" : "Job description";
}

export function megabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** A readable file size: KB below 1 MB, otherwise MB. */
export function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${megabytes(bytes)} MB`;
}

export const messages = {
  // Panel: files
  emptyFile: () => "This file is empty. Choose another file or paste the text.",
  docNotSupported: () =>
    "Older Word files (.doc) aren't supported. Save it as .docx and upload it again, or paste the text.",
  unsupportedType: () =>
    "This file type isn't supported. Upload a PDF or Word (.docx) file, or paste the text.",
  fileTooLarge: (bytes: number) =>
    `This file is ${megabytes(bytes)} MB. The limit is 4 MB. Upload a smaller file or paste the text.`,
  damagedOrProtected: () =>
    "This file can't be opened. It may be damaged or password-protected. Remove the password and upload it again, or paste the text.",
  tooManyPages: (pages: number) =>
    `This PDF has ${number(pages)} pages. The limit is ${LIMITS.pdfPages} pages. Upload a shorter file or paste the text.`,
  extractionTimeout: () =>
    "This file took too long to read. Upload a smaller file or paste the text.",
  noTextFound: () =>
    "No text was found in this file. It may be blank or a scanned image. Upload a file with selectable text, or paste the text.",

  // Panel: text
  tooShort: (kind: InputKind, words: number) =>
    `This ${kindLabel(kind)} is too short to analyse: ${number(words)} ${words === 1 ? "word" : "words"}. It needs at least ${LIMITS[kind].minWords} words.`,
  tooLong: (kind: InputKind, characters: number) =>
    `This ${kindLabel(kind)} is too long: ${number(characters)} characters. The limit is ${number(LIMITS[kind].maxChars)}. Shorten it to continue.`,
  mostlySymbols: (kind: InputKind) =>
    `This text is mostly numbers or symbols. Check that the ${kindLabel(kind)} text was pasted correctly.`,
  notResume: () => "This doesn't look like a resume. Check that the candidate's resume is in this panel.",
  notJobDescription: () =>
    "This doesn't look like a job description. Check that the job description is in this panel.",

  // Panel: switching between typing and uploading
  clearTextToUpload: () => "Clear the typed text to upload a file instead.",
  removeFileToType: () => "A file is uploaded. Remove it to type instead.",

  // In place of the report
  analysisFailed: () => "The analysis couldn't be completed. Your inputs are kept, so you can try again.",
  aiLimit: () =>
    "The AI usage limit has been reached. Wait a few minutes and try again. If it keeps happening, the daily limit is used up and resets the next day.",
  noConnection: () => "The server couldn't be reached. Check your internet connection and try again.",
  requestRejected: () => "This analysis couldn't be saved. Return to the Home page and start again.",
  requestInvalid: () => "The request couldn't be processed. Reload the page and try again.",

  // History and report pages
  analysisNotFound: () =>
    "This analysis wasn't found. It may have been deleted, or the link is wrong. Open it from History.",
  historyLoadFailed: () => "History couldn't be loaded. Try again.",
  deleteOneFailed: () => "The analysis couldn't be deleted. Try again.",
  deleteAllFailed: () => "History couldn't be deleted. Try again.",
  deletedOne: () => "Analysis deleted.",
  deletedAll: () => "All history deleted.",
} as const;
