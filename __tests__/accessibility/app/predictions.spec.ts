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

test("axe: no WCAG 2.1 AA violations on predictions page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/predictions`);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("finding A03: score inputs have no label or aria-label", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/predictions`);

  // Find all number inputs (score fields in the prediction form)
  const numberInputs = page.locator('input[type="number"]');
  const count = await numberInputs.count();

  if (count === 0) {
    // No active matches with prediction forms — skip
    return;
  }

  for (let i = 0; i < count; i++) {
    const input = numberInputs.nth(i);
    const id = await input.getAttribute("id");
    const ariaLabel = await input.getAttribute("aria-label");
    const ariaLabelledBy = await input.getAttribute("aria-labelledby");

    // Check for associated <label> via htmlFor
    let hasLabel = false;
    if (id) {
      const labelCount = await page.locator(`label[for="${id}"]`).count();
      hasLabel = labelCount > 0;
    }

    const hasAccessibleName = hasLabel || !!ariaLabel || !!ariaLabelledBy;
    // Expected to FAIL for home/away score inputs — Finding A03
    expect.soft(hasAccessibleName).toBe(true);
  }
});

test("keyboard: Tab order goes home score → away score → submit", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/predictions`);
  const order = await collectFocusOrder(page, 50);

  const numberInputIndices = order
    .map((o, i) => (o.tag === "input" ? i : -1))
    .filter((i) => i >= 0);

  if (numberInputIndices.length >= 2) {
    // First two inputs should be score fields; they should be consecutive or near-consecutive
    expect.soft(numberInputIndices[1] - numberInputIndices[0]).toBeLessThanOrEqual(3);
  }
});

test("keyboard: locked prediction inputs are skipped by Tab", async ({ page }) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.goto(`/tournaments/${tournamentId}/predictions`);

  // Disabled inputs should not appear in Tab order
  const disabledInputs = page.locator("input[disabled]");
  const count = await disabledInputs.count();

  if (count === 0) return; // No locked matches

  for (let i = 0; i < count; i++) {
    const input = disabledInputs.nth(i);
    // Disabled inputs must not receive focus
    await input.focus().catch(() => {});
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("disabled"));
    expect.soft(focused).toBeNull();
  }
});

test("dark mode: axe color contrast on predictions page", async ({ page }, testInfo) => {
  if (!tournamentId) {
    test.skip(true, "No tournament found in seed data");
    return;
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/tournaments/${tournamentId}/predictions`);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
