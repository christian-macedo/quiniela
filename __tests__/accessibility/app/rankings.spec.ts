import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";
import { getFirstTournamentFromPage } from "../helpers/seed";

let tournamentId: string | null = null;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  tournamentId = await getFirstTournamentFromPage(page);
  await page.close();
});

test("axe: no WCAG 2.1 AA violations on rankings page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/rankings`);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("finding A04: rankings uses div-based layout instead of semantic table", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/rankings`);

  // Check whether a semantic <table> element is present
  const tableCount = await page.locator("table").count();
  // Expected to FAIL — Finding A04: div layout instead of <table>
  expect.soft(tableCount).toBeGreaterThan(0);

  // Additionally, axe should flag the missing table/landmark role
  // (already captured in the axe scan above)
});

test("keyboard: ranking row links are focusable via Tab", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/rankings`);
  const order = await collectFocusOrder(page, 40);
  const linkItems = order.filter((o) => o.tag === "a");
  // Each player row should be a link or contain a link
  expect.soft(linkItems.length).toBeGreaterThan(0);
});

test("dark mode: axe color contrast on rankings page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/tournaments/${tournamentId}/rankings`);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
