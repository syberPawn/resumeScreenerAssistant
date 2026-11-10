import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/extract/route";
import { buildDocx, buildPdf, SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "./helpers/fixtures";

async function upload(bytes: Uint8Array | string, name: string, kind = "resume") {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", new File([bytes as BlobPart], name));
  const response = await POST(new Request("http://localhost/api/extract", { method: "POST", body: form }));
  return { status: response.status, body: await response.json() };
}

describe("POST /api/extract", () => {
  it("extracts text from a PDF and reports its page count", async () => {
    const { status, body } = await upload(buildPdf([SAMPLE_RESUME]), "cv.pdf");
    expect(status).toBe(200);
    expect(body.pages).toBe(1);
    expect(body.text).toContain("Priya Sharma");
  });

  it("extracts text from a .docx file", async () => {
    const { status, body } = await upload(buildDocx([SAMPLE_JOB_DESCRIPTION]), "job.docx", "jobDescription");
    expect(status).toBe(200);
    expect(body.pages).toBeNull();
    expect(body.text).toContain("Data Analyst");
  });

  it("rejects a PDF over 10 pages before reading its text", async () => {
    const pages = Array.from({ length: 12 }, () => SAMPLE_RESUME);
    const { status, body } = await upload(buildPdf(pages), "long.pdf");
    expect(status).toBe(422);
    expect(body.error).toEqual({
      code: "TOO_MANY_PAGES",
      field: "resume",
      message: "This PDF has 12 pages. The limit is 10 pages. Upload a shorter file or paste the text.",
    });
  });

  it("rejects a blank PDF with the no-text message", async () => {
    const { body } = await upload(buildPdf([""]), "blank.pdf");
    expect(body.error.code).toBe("NO_TEXT_FOUND");
  });

  it("rejects an empty file", async () => {
    const { body } = await upload(new Uint8Array(0), "cv.pdf");
    expect(body.error.code).toBe("EMPTY_FILE");
  });

  it("rejects a renamed file by its first bytes", async () => {
    const { body } = await upload("just some plain text pretending to be a pdf", "cv.pdf");
    expect(body.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects .doc files with the save-as-.docx message", async () => {
    const { body } = await upload("anything", "cv.doc");
    expect(body.error.code).toBe("DOC_NOT_SUPPORTED");
  });

  it("rejects a damaged PDF", async () => {
    const { body } = await upload("%PDF-1.4\nthis is not really a pdf", "cv.pdf");
    expect(body.error.code).toBe("DAMAGED_OR_PROTECTED");
  });

  it("rejects a .docx that would unpack to a huge size", async () => {
    const { body } = await upload(buildDocx([SAMPLE_RESUME], { declaredDocumentSize: 4_000_000_000 }), "bomb.docx");
    expect(body.error.code).toBe("DAMAGED_OR_PROTECTED");
  });

  it("applies the text checks to extracted text", async () => {
    const { body } = await upload(buildDocx(["Only a few words"]), "short.docx");
    expect(body.error.code).toBe("TEXT_TOO_SHORT");
    expect(body.error.message).toBe("This resume is too short to analyse: 4 words. It needs at least 50 words.");
  });

  it("rejects a request without a file", async () => {
    const form = new FormData();
    form.append("kind", "resume");
    const response = await POST(new Request("http://localhost/api/extract", { method: "POST", body: form }));
    expect(response.status).toBe(400);
  });
});
