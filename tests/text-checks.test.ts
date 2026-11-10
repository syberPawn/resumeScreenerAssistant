import { describe, expect, it } from "vitest";
import { checkText, countWords, hasContent, letterShare, normalizeExtractedText, textProblemMessage } from "@/lib/text-checks";
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "./helpers/fixtures";

describe("hasContent", () => {
  it("treats spaces and line breaks only as empty", () => {
    expect(hasContent("   \n\t  ")).toBe(false);
    expect(hasContent("  a ")).toBe(true);
  });
});

describe("countWords and letterShare", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("  one two\nthree\tfour  ")).toBe(4);
    expect(countWords("")).toBe(0);
  });

  it("counts letters in any language, including combining marks", () => {
    expect(letterShare("नमस्ते दुनिया")).toBe(1);
    expect(letterShare("1234!!!!")).toBe(0);
  });
});

describe("checkText", () => {
  it("accepts a normal resume and job description", () => {
    expect(checkText("resume", SAMPLE_RESUME)).toBeNull();
    expect(checkText("jobDescription", SAMPLE_JOB_DESCRIPTION)).toBeNull();
  });

  it("rejects empty text", () => {
    expect(checkText("resume", "   ")).toEqual({ code: "EMPTY" });
  });

  it("rejects text under the word minimum, with the count", () => {
    expect(checkText("resume", "Just a few words here")).toEqual({ code: "TOO_SHORT", words: 5 });
    expect(checkText("jobDescription", "Data analyst wanted")).toEqual({ code: "TOO_SHORT", words: 3 });
  });

  it("rejects text over the character limit before anything else, with the count", () => {
    const long = "word ".repeat(5000); // 25,000 characters
    expect(checkText("resume", long)).toEqual({ code: "TOO_LONG", characters: long.trim().length });
  });

  it("rejects text that is mostly numbers or symbols", () => {
    const symbols = Array.from({ length: 60 }, (_, i) => `${i}#!${i}`).join(" ");
    expect(checkText("resume", symbols)).toEqual({ code: "MOSTLY_SYMBOLS" });
  });
});

describe("textProblemMessage", () => {
  it("states the number against the limit", () => {
    expect(textProblemMessage("resume", { code: "TOO_LONG", characters: 23450 })).toBe(
      "This resume is too long: 23,450 characters. The limit is 20,000. Shorten it to continue.",
    );
    expect(textProblemMessage("jobDescription", { code: "TOO_SHORT", words: 12 })).toBe(
      "This job description is too short to analyse: 12 words. It needs at least 20 words.",
    );
  });
});

describe("normalizeExtractedText", () => {
  it("collapses spaces and blank lines", () => {
    expect(normalizeExtractedText("  a   b \r\n\r\n\r\n\r\n c  ")).toBe("a b\n\nc");
  });
});
