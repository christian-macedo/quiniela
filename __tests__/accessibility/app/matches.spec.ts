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

test("axe: no WCAG 2.1 AA violations on matches page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/matches`);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: match cards are focusable via Tab", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/matches`);
  const order = await collectFocusOrder(page, 40);
  const interactiveItems = order.filter((o) => o.tag === "a" || o.tag === "button");
  expect.soft(interactiveItems.length).toBeGreaterThan(0);
});

test("accessibility: team logo images have alt text", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/matches`);
  const images = page.locator("img");
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute("alt");
    const ariaHidden = await img.getAttribute("aria-hidden");
    // Image must have alt text OR be explicitly aria-hidden (decorative)
    const isAccessible = alt !== null || ariaHidden === "true";
    expect.soft(isAccessible).toBe(true);
  }
});

test("dark mode: axe color contrast on matches page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/tournaments/${tournamentId}/matches`);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
