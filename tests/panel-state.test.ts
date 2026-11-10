import { describe, expect, it } from "vitest";
import {
  checkFileBeforeUpload,
  checklistStatus,
  EMPTY_PANEL,
  isPanelReady,
  panelReducer,
  type PanelAction,
  type PanelState,
} from "@/lib/client/panel-state";
import { SAMPLE_RESUME } from "./helpers/fixtures";

const run = (state: PanelState, ...actions: PanelAction[]) =>
  actions.reduce((s, action) => panelReducer("resume", s, action), state);

const extracted: PanelAction = {
  type: "fileExtracted",
  result: { text: SAMPLE_RESUME, fileName: "cv.pdf", sizeBytes: 1000, pages: 1 },
};

describe("one source per panel", () => {
  it("blocks uploading while text is typed", () => {
    const typed = run(EMPTY_PANEL, { type: "typed", text: "Some text" });
    expect(run(typed, { type: "fileStarted", fileName: "cv.pdf" })).toBe(typed);
  });

  it("blocks uploading while confirmed text is present", () => {
    const confirmed = run(EMPTY_PANEL, { type: "typed", text: SAMPLE_RESUME }, { type: "confirmText" });
    expect(confirmed.status).toBe("textReady");
    expect(run(confirmed, { type: "fileStarted", fileName: "cv.pdf" })).toBe(confirmed);
  });

  it("blocks typing while a file is being read or is uploaded", () => {
    const reading = run(EMPTY_PANEL, { type: "fileStarted", fileName: "cv.pdf" });
    expect(run(reading, { type: "typed", text: "x" })).toBe(reading);
    const ready = run(reading, extracted);
    expect(run(ready, { type: "typed", text: "x" })).toBe(ready);
  });

  it("allows uploading again after the text is cleared", () => {
    const state = run(EMPTY_PANEL, { type: "typed", text: "Some text" }, { type: "clearText" }, { type: "fileStarted", fileName: "cv.pdf" });
    expect(state.status).toBe("reading");
  });

  it("treats text made only of spaces as empty", () => {
    expect(run(EMPTY_PANEL, { type: "typed", text: "   \n " })).toEqual(EMPTY_PANEL);
  });

  it("ignores a finished upload that was removed while reading", () => {
    const state = run(EMPTY_PANEL, { type: "fileStarted", fileName: "cv.pdf" }, { type: "removeFile" }, extracted);
    expect(state).toEqual(EMPTY_PANEL);
  });
});

describe("readiness and the Analyse checklist", () => {
  it("is not ready until Done is clicked and the checks pass", () => {
    const typed = run(EMPTY_PANEL, { type: "typed", text: "Too short" });
    expect(isPanelReady(typed)).toBe(false);
    expect(checklistStatus(typed).text).toBe("click Done to confirm the text");

    const failed = run(typed, { type: "confirmText" });
    expect(failed.status).toBe("typing");
    expect(checklistStatus(failed).text).toBe("fix the problem shown in the panel");
  });

  it("returns to not confirmed when confirmed text is edited", () => {
    const state = run(EMPTY_PANEL, { type: "typed", text: SAMPLE_RESUME }, { type: "confirmText" }, { type: "typed", text: `${SAMPLE_RESUME} more` });
    expect(state.status).toBe("typing");
    expect(isPanelReady(state)).toBe(false);
  });

  it("is ready once a file is extracted, and not ready after the server rejects it", () => {
    const ready = run(EMPTY_PANEL, { type: "fileStarted", fileName: "cv.pdf" }, extracted);
    expect(isPanelReady(ready)).toBe(true);
    const rejected = run(ready, { type: "serverRejected", error: "This doesn't look like a resume." });
    expect(isPanelReady(rejected)).toBe(false);
  });

  it("returns to empty with the message after a file error", () => {
    const state = run(EMPTY_PANEL, { type: "fileStarted", fileName: "cv.pdf" }, { type: "fileRejected", error: "No text was found." });
    expect(state).toEqual({ status: "empty", error: "No text was found." });
    expect(checklistStatus(state).text).toBe("fix the problem shown in the panel");
  });
});

describe("checkFileBeforeUpload", () => {
  const file = (name: string, size: number) => new File([new Uint8Array(size)], name);

  it("checks emptiness, size and extension", () => {
    expect(checkFileBeforeUpload(file("cv.pdf", 0), 100)).toMatch(/empty/);
    expect(checkFileBeforeUpload(file("cv.pdf", 200), 100)).toMatch(/The limit is 4 MB/);
    expect(checkFileBeforeUpload(file("cv.doc", 10), 100)).toMatch(/\.doc/);
    expect(checkFileBeforeUpload(file("cv.txt", 10), 100)).toMatch(/isn't supported/);
    expect(checkFileBeforeUpload(file("CV.PDF", 10), 100)).toBeNull();
  });
});
