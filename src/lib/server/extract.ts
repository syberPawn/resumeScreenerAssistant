import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { LIMITS } from "@/lib/limits";
import { zipUncompressedSize } from "./file-type";

// Text extraction for .pdf (unpdf) and .docx (mammoth). Files are only held in memory and never stored.

export type ExtractionFailure = "DAMAGED_OR_PROTECTED" | "TOO_MANY_PAGES" | "TIMEOUT";

export class ExtractionError extends Error {
  constructor(
    readonly failure: ExtractionFailure,
    readonly pages?: number,
  ) {
    super(failure);
    this.name = "ExtractionError";
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ExtractionError("TIMEOUT")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function readPdf(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch {
    // Damaged files and password-protected files both fail here.
    throw new ExtractionError("DAMAGED_OR_PROTECTED");
  }
  try {
    // The page count is read before any page text, so a 500-page file is rejected quickly.
    if (pdf.numPages > LIMITS.pdfPages) throw new ExtractionError("TOO_MANY_PAGES", pdf.numPages);
    const { text } = await extractText(pdf, { mergePages: true });
    return { text, pages: pdf.numPages };
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError("DAMAGED_OR_PROTECTED");
  } finally {
    // Frees the parsed document from memory.
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}

async function readDocx(bytes: Uint8Array): Promise<{ text: string }> {
  // A small .docx can unpack to gigabytes, so the listed sizes are checked before mammoth opens it.
  const size = zipUncompressedSize(bytes);
  if (size === null || size > LIMITS.docxMaxUncompressedBytes) throw new ExtractionError("DAMAGED_OR_PROTECTED");
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { text: result.value };
  } catch {
    throw new ExtractionError("DAMAGED_OR_PROTECTED");
  }
}

export async function extractPdfText(bytes: Uint8Array) {
  return withTimeout(readPdf(bytes), LIMITS.extractTimeoutMs);
}

export async function extractDocxText(bytes: Uint8Array) {
  return withTimeout(readDocx(bytes), LIMITS.extractTimeoutMs);
}
