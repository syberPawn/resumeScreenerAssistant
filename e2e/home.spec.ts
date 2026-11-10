import { buildPdf, SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "../tests/helpers/fixtures";
import { expect, homePage, test, uploadFile } from "./fixtures";

test("main flow: upload and type, analyse, see the card first, then the report, then Reviewed", async ({ page, api }) => {
  const home = homePage(page);
  await page.goto("/");

  // Job description by file upload; the real /api/extract reads it.
  await uploadFile(page, home.jobDescriptionFile, "job-description.pdf", buildPdf([SAMPLE_JOB_DESCRIPTION]));
  await expect(home.jobDescriptionFile.getByText("job-description.pdf")).toBeVisible();
  await expect(page.getByText("Job description: ready")).toBeVisible();

  // Resume by typing, then Done.
  await home.resume.getByRole("textbox").fill(SAMPLE_RESUME);
  await expect(page.getByText("Resume: click Done to confirm the text")).toBeVisible();
  await home.resume.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Resume: ready")).toBeVisible();

  // Hold the report so the "card first" state can be checked.
  let releaseReport!: () => void;
  api.holdAnalysis = new Promise((resolve) => (releaseReport = resolve));
  await home.analyse.click();

  await expect(page.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();
  await expect(page.getByText("Analysing the resume against the job description…")).toBeVisible();

  releaseReport();
  await expect(page.getByRole("region", { name: "Match score" })).toContainText("84 / 100");
  await expect(page.getByRole("heading", { name: "Top matching skills" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suggested interview questions" })).toBeVisible();
  await expect(page).toHaveURL(/\/analyses\/11111111-2222-4333-8444-555555555555$/);

  // The report request carried the signed profile and the extracted job description text.
  expect(api.analysisRequests[0]).toMatchObject({
    signature: "a".repeat(64),
    profile: { name: "Priya Sharma" },
    resumeText: SAMPLE_RESUME,
  });
  expect(String(api.analysisRequests[0].jobDescriptionText)).toContain("Data Analyst");

  // Reviewed returns to a cleared Home page.
  await page.getByRole("button", { name: "Reviewed" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Job description: not added yet")).toBeVisible();
  await expect(page.getByText("Resume: not added yet")).toBeVisible();
});

test("one source per panel: typing blocks upload, a file locks the text box", async ({ page }) => {
  const home = homePage(page);
  await page.goto("/");

  // Typed text makes the upload unavailable, with the reason shown.
  await home.jobDescription.getByRole("textbox").fill("Some typed text");
  const chooseFile = home.jobDescriptionFile.getByRole("button", { name: "Choose file" });
  await expect(chooseFile).toHaveAttribute("aria-disabled", "true");
  await expect(home.jobDescriptionFile.getByText("Clear the typed text to upload a file instead.")).toBeVisible();

  // Clicking it anyway does not open the file chooser.
  const chooserOpened = page.waitForEvent("filechooser", { timeout: 1500 }).then(
    () => true,
    () => false,
  );
  await chooseFile.click({ force: true });
  expect(await chooserOpened).toBe(false);

  // Clear text makes uploading available again.
  await home.jobDescriptionFile.getByRole("button", { name: "Clear text" }).click();
  await expect(chooseFile).not.toHaveAttribute("aria-disabled");

  // An uploaded file locks the text box until the file is removed.
  await uploadFile(page, home.jobDescriptionFile, "job-description.pdf", buildPdf([SAMPLE_JOB_DESCRIPTION]));
  const textBox = home.jobDescription.getByRole("textbox");
  await expect(textBox).toHaveAttribute("readonly", "");
  await expect(home.jobDescription.getByText("A file is uploaded. Remove it to type instead.").first()).toBeVisible();

  await home.jobDescriptionFile.getByRole("button", { name: "Remove file" }).click();
  await expect(textBox).not.toHaveAttribute("readonly");
  await textBox.fill("Typing works again");
  await expect(textBox).toHaveValue("Typing works again");
});

test("Analyse explains what is missing and does not run early", async ({ page, api }) => {
  const home = homePage(page);
  await page.goto("/");

  await expect(home.analyse).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByText("Job description: not added yet")).toBeVisible();

  // Clicking it moves focus to the first panel that is not ready, and sends nothing.
  await home.analyse.click({ force: true });
  await expect(page.getByRole("heading", { name: "Job description" })).toBeFocused();
  expect(api.analysisRequests).toHaveLength(0);
});

test("text limits show clear messages with the numbers", async ({ page }) => {
  const home = homePage(page);
  await page.goto("/");

  // Too short.
  await home.jobDescription.getByRole("textbox").fill("Data Analyst needed");
  await home.jobDescription.getByRole("button", { name: "Done" }).click();
  await expect(
    home.jobDescription.getByText("This job description is too short to analyse: 3 words. It needs at least 20 words."),
  ).toBeVisible();

  // Too long: counter turns red, the message gives the count, and Done is unavailable.
  const longText = "word ".repeat(4100);
  await home.resume.getByRole("textbox").fill(longText);
  await expect(home.resume.getByText("20,499 / 20,000 characters")).toBeVisible();
  await expect(
    home.resume.getByText("This resume is too long: 20,499 characters. The limit is 20,000. Shorten it to continue."),
  ).toBeVisible();
  await expect(home.resume.getByRole("button", { name: "Done" })).toHaveAttribute("aria-disabled", "true");
});

test("a PDF over 10 pages is rejected with the page count", async ({ page }) => {
  const home = homePage(page);
  await page.goto("/");

  const longPdf = buildPdf(Array.from({ length: 12 }, () => SAMPLE_RESUME));
  await uploadFile(page, home.resumeFile, "long-resume.pdf", longPdf);
  await expect(
    home.resumeFile.getByText("This PDF has 12 pages. The limit is 10 pages. Upload a shorter file or paste the text."),
  ).toBeVisible();
  await expect(page.getByText("Resume: fix the problem shown in the panel")).toBeVisible();
});

test("text that is not a resume returns to the panel with the message", async ({ page, api }) => {
  const home = homePage(page);
  await page.goto("/");

  api.profileError = {
    status: 422,
    code: "NOT_RESUME",
    field: "resume",
    message: "This doesn't look like a resume. Check that the candidate's resume is in this panel.",
  };

  await home.jobDescription.getByRole("textbox").fill(SAMPLE_JOB_DESCRIPTION);
  await home.jobDescription.getByRole("button", { name: "Done" }).click();
  await home.resume.getByRole("textbox").fill(SAMPLE_RESUME);
  await home.resume.getByRole("button", { name: "Done" }).click();
  await home.analyse.click();

  await expect(home.resume.getByText("This doesn't look like a resume.", { exact: false })).toBeVisible();
  await expect(page.getByText("Resume: fix the problem shown in the panel")).toBeVisible();
  await expect(home.resume.getByRole("textbox")).toHaveValue(SAMPLE_RESUME);
  expect(api.analysisRequests).toHaveLength(0);
});
