import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

const PAGE_URL = "/profile";

test("axe: no WCAG 2.1 AA violations on profile page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab order reaches all profile form fields", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 30);
  const inputs = order.filter((o) => o.tag === "input" || o.tag === "textarea");
  expect.soft(inputs.length).toBeGreaterThan(0);
});

test("finding A08: decorative icons are aria-hidden", async ({ page }) => {
  await page.goto(PAGE_URL);
  // SVG icons used decoratively should be aria-hidden
  const svgs = page.locator("svg");
  const count = await svgs.count();
  let decorativeWithoutHidden = 0;
  for (let i = 0; i < count; i++) {
    const svg = svgs.nth(i);
    const ariaHidden = await svg.getAttribute("aria-hidden");
    const ariaLabel = await svg.getAttribute("aria-label");
    const role = await svg.getAttribute("role");
    const title = await svg.locator("title").count();
    // Decorative SVG: no accessible name and no aria-hidden
    const hasAccessibleName = !!ariaLabel || role === "img" || title > 0;
    if (!hasAccessibleName && ariaHidden !== "true") {
      decorativeWithoutHidden++;
    }
  }
  // Documents Finding A08: decorative icons should be aria-hidden
  expect.soft(decorativeWithoutHidden).toBe(0);
});

test("keyboard: AlertDialog (deactivation) traps focus correctly", async ({ page }) => {
  await page.goto(PAGE_URL);
  // Find a button that opens a destructive/deactivation dialog
  const dangerButton = page.getByRole("button", { name: /deactivate|delete account/i }).first();
  const hasDangerButton = await dangerButton.isVisible().catch(() => false);
  if (!hasDangerButton) return; // Feature not on this page for this user

  await dangerButton.click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
  await expect.soft(dialog).toBeVisible({ timeout: 3_000 });

  // Tab inside dialog — focus must stay within the dialog
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  const isInDialog = await dialog.locator(":focus").count();
  expect.soft(isInDialog).toBeGreaterThan(0);

  // Escape should close the dialog
  await page.keyboard.press("Escape");
  await expect.soft(dialog).toBeHidden({ timeout: 2_000 });
});

test("prefers-reduced-motion: animated elements have 0s duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE_URL);
  const animatedEl = page.locator('[class*="animate-"]').first();
  const count = await animatedEl.count();
  if (count === 0) return;
  const duration = await animatedEl.evaluate((el) => getComputedStyle(el).animationDuration);
  expect.soft(duration).toBe("0s"); // Documents Finding A09
});

test("dark mode: axe color contrast on profile page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
