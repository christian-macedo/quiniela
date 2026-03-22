import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

const PAGE_URL = "/tournaments";

test("axe: no WCAG 2.1 AA violations on tournaments page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("finding A01: tournaments page is missing landmark elements", async ({ page }) => {
  await page.goto(PAGE_URL);
  // Assert that <main> landmark is absent — documents Finding A01
  const mainCount = await page.locator("main").count();
  expect.soft(mainCount).toBeGreaterThan(0); // Expected to FAIL — Finding A01
});

test("finding A02: no skip-to-content link", async ({ page }) => {
  await page.goto(PAGE_URL);
  // The first Tab press should land on a skip link
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  const text = await focused.innerText().catch(() => "");
  const isSkipLink = /skip|jump to/i.test(text);
  expect.soft(isSkipLink).toBe(true); // Expected to FAIL — Finding A02
});

test("keyboard: tournament card links have discernible text", async ({ page }) => {
  await page.goto(PAGE_URL);
  const links = page.locator('a[href*="/tournaments/"]');
  const count = await links.count();
  if (count === 0) {
    // No tournaments in seed — skip assertion
    return;
  }
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const text = await link.innerText().catch(() => "");
    const ariaLabel = await link.getAttribute("aria-label");
    const ariaLabelledBy = await link.getAttribute("aria-labelledby");
    const hasAccessibleName = text.trim().length > 0 || !!ariaLabel || !!ariaLabelledBy;
    expect.soft(hasAccessibleName).toBe(true);
  }
});

test("keyboard: Tab order cycles through card links", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 30);
  const linkItems = order.filter((o) => o.tag === "a");
  expect.soft(linkItems.length).toBeGreaterThan(0);
});

test("dark mode: axe color contrast on tournaments page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});

test("prefers-reduced-motion: animate-* elements have 0s duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE_URL);
  const animatedEl = page.locator('[class*="animate-"]').first();
  const count = await animatedEl.count();
  if (count === 0) return; // No animated elements on this page
  const duration = await animatedEl.evaluate((el) => getComputedStyle(el).animationDuration);
  // Documents Finding A09: expected "0s" if prefers-reduced-motion is respected
  expect.soft(duration).toBe("0s");
});
