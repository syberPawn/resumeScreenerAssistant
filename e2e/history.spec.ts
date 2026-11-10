import { expect, PROFILE, savedAnalysis, test } from "./fixtures";

const PRIYA = savedAnalysis("aaaaaaaa-0000-4000-8000-000000000001", PROFILE, 84, "2026-11-10T09:00:00Z");
const RAHUL = savedAnalysis(
  "aaaaaaaa-0000-4000-8000-000000000002",
  { ...PROFILE, name: "Rahul Verma", email: null },
  92,
  "2026-11-09T09:00:00Z",
);
const ANITA = savedAnalysis(
  "aaaaaaaa-0000-4000-8000-000000000003",
  { ...PROFILE, name: "Anita Desai", email: null },
  55,
  "2026-11-08T09:00:00Z",
);

test.beforeEach(({ api }) => {
  api.analyses = [PRIYA, RAHUL, ANITA];
});

const rows = (page: import("@playwright/test").Page) => page.locator("tbody tr");

test("score ranges and name search with suggestions", async ({ page }) => {
  await page.goto("/history");
  await expect(rows(page)).toHaveCount(3);

  await page.getByText("90–100").click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Rahul Verma");

  await page.getByText("Below 70").click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Anita Desai");

  await page.getByText("All", { exact: true }).click();
  await expect(rows(page)).toHaveCount(3);

  // Suggestions appear from 2 characters; choosing one searches for that name.
  const search = page.getByRole("combobox", { name: "Search by candidate name" });
  await search.fill("pr");
  const option = page.getByRole("option", { name: "Priya Sharma" });
  await expect(option).toBeVisible();
  await option.click();
  await expect(search).toHaveValue("Priya Sharma");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Priya Sharma");
});

test("opening an entry shows the saved report and profile card", async ({ page }) => {
  await page.goto("/history");
  await page.getByRole("link", { name: "Rahul Verma" }).click();

  await expect(page).toHaveURL(/\/analyses\/aaaaaaaa-0000-4000-8000-000000000002$/);
  await expect(page.getByRole("heading", { name: "Rahul Verma" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Match score" })).toContainText("92 / 100");
  await expect(page.getByRole("heading", { name: "Top gaps" })).toBeVisible();
});

test("deleting one entry needs confirmation, and Enter cancels by default", async ({ page, api }) => {
  await page.goto("/history");
  const deleteButton = page.getByRole("button", { name: "Delete the analysis for Priya Sharma" });

  // Cancel has focus when the dialog opens, so pressing Enter deletes nothing.
  await deleteButton.click();
  const dialog = page.getByRole("dialog", { name: "Delete this analysis?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("will be permanently deleted. This can't be undone.");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  expect(api.deletedIds).toHaveLength(0);
  await expect(rows(page)).toHaveCount(3);

  // Confirming deletes it.
  await deleteButton.click();
  await dialog.getByRole("button", { name: "Delete analysis" }).click();
  await expect(page.getByText("Analysis deleted.")).toBeVisible();
  await expect(rows(page)).toHaveCount(2);
  expect(api.deletedIds).toEqual([PRIYA.id]);
});

test("deleting all history names the count and sends the confirmation value", async ({ page, api }) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Delete all history" }).click();

  const dialog = page.getByRole("dialog", { name: "Delete all history?" });
  await expect(dialog).toContainText("All 3 saved analyses will be permanently deleted");
  await dialog.getByRole("button", { name: "Delete all 3 analyses" }).click();

  await expect(page.getByText("All history deleted.")).toBeVisible();
  await expect(page.getByText("No analyses saved yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete all history" })).toBeHidden();
  expect(api.deleteAllRequests).toEqual([{ confirm: "delete-all" }]);
});
