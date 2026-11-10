import { LIMITS } from "@/lib/limits";
import { messages } from "@/lib/messages";
import { inputKindSchema } from "@/lib/schemas";
import { errorResponse, json, logError } from "@/lib/server/http";
import { ExtractionError, extractDocxText, extractPdfText } from "@/lib/server/extract";
import { detectFileType, extensionOf } from "@/lib/server/file-type";
import { checkText, hasContent, normalizeExtractedText, textProblemMessage } from "@/lib/text-checks";
import type { ExtractResult } from "@/lib/types";

// POST /api/extract: receives one file and returns its plain text.
// The file is held only in memory and discarded when the request ends.

export const maxDuration = 30;

// Room for the multipart form around the file itself.
const MAX_BODY_BYTES = LIMITS.fileBytes + 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "FILE_TOO_LARGE", messages.fileTooLarge(declaredLength));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, "REQUEST_INVALID", messages.requestInvalid());
  }

  const kindResult = inputKindSchema.safeParse(form.get("kind"));
  const file = form.get("file");
  if (!kindResult.success || !(file instanceof File)) {
    return errorResponse(400, "REQUEST_INVALID", messages.requestInvalid());
  }
  const kind = kindResult.data;
  const reject = (status: number, code: string, message: string) => errorResponse(status, code, message, kind);

  // Checks run cheapest first and stop at the first failure.
  if (file.size === 0) return reject(422, "EMPTY_FILE", messages.emptyFile());
  if (file.size > LIMITS.fileBytes) return reject(413, "FILE_TOO_LARGE", messages.fileTooLarge(file.size));

  const extension = extensionOf(file.name);
  if (extension === "doc") return reject(415, "DOC_NOT_SUPPORTED", messages.docNotSupported());
  if (extension !== "pdf" && extension !== "docx") return reject(415, "UNSUPPORTED_TYPE", messages.unsupportedType());

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectFileType(bytes);
  if (extension === "docx" && detected === "ole") {
    // Password-protected .docx files are stored in the old Office format.
    return reject(422, "DAMAGED_OR_PROTECTED", messages.damagedOrProtected());
  }
  if ((extension === "pdf" && detected !== "pdf") || (extension === "docx" && detected !== "zip")) {
    return reject(415, "UNSUPPORTED_TYPE", messages.unsupportedType());
  }

  let rawText: string;
  let pages: number | null = null;
  try {
    if (extension === "pdf") {
      const result = await extractPdfText(bytes);
      rawText = result.text;
      pages = result.pages;
    } else {
      rawText = (await extractDocxText(bytes)).text;
    }
  } catch (error) {
    if (error instanceof ExtractionError) {
      if (error.failure === "TOO_MANY_PAGES") {
        return reject(422, "TOO_MANY_PAGES", messages.tooManyPages(error.pages ?? 0));
      }
      if (error.failure === "TIMEOUT") return reject(422, "EXTRACTION_TIMEOUT", messages.extractionTimeout());
    } else {
      logError("extract", error);
    }
    return reject(422, "DAMAGED_OR_PROTECTED", messages.damagedOrProtected());
  }

  const text = normalizeExtractedText(rawText);
  if (!hasContent(text)) return reject(422, "NO_TEXT_FOUND", messages.noTextFound());

  const problem = checkText(kind, text);
  if (problem) return reject(422, `TEXT_${problem.code}`, textProblemMessage(kind, problem));

  return json<ExtractResult>({ text, fileName: file.name.slice(0, 255), sizeBytes: file.size, pages });
}
