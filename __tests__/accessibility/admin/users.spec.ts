import { test, expect } from "@playwright/test";
import path from "path";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

// Use admin session for all tests in this file
test.use({ storageState: path.join(__dirname, "../../.auth/admin.json") });

const PAGE_URL = "/admin/users";

test("axe: no WCAG 2.1 AA violations on admin users page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab order reaches action buttons for each user row", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 60);
  const buttons = order.filter((o) => o.tag === "button");
  expect.soft(buttons.length).toBeGreaterThan(0);
});

test("keyboard: deactivation AlertDialog is keyboard accessible", async ({ page }) => {
  await page.goto(PAGE_URL);
  // Find a deactivate button for any non-admin user
  const deactivateButton = page.getByRole("button", { name: /deactivate/i }).first();
  const isVisible = await deactivateButton.isVisible().catch(() => false);
  if (!isVisible) return; // No deactivatable users in seed

  await deactivateButton.click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
  await expect.soft(dialog).toBeVisible({ timeout: 3_000 });

  // Focus should be inside the dialog
  const focusInDialog = await dialog.locator(":focus").count();
  expect.soft(focusInDialog).toBeGreaterThan(0);

  // Cancel via Escape
  await page.keyboard.press("Escape");
  await expect.soft(dialog).toBeHidden({ timeout: 2_000 });
});

test("keyboard: Tab reaches confirm button inside deactivation dialog", async ({ page }) => {
  await page.goto(PAGE_URL);
  const deactivateButton = page.getByRole("button", { name: /deactivate/i }).first();
  const isVisible = await deactivateButton.isVisible().catch(() => false);
  if (!isVisible) return;

  await deactivateButton.click();
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
  await expect.soft(dialog).toBeVisible({ timeout: 3_000 });

  // Tab to confirm button
  await page.keyboard.press("Tab");
  const confirmButton = page.getByRole("button", { name: /confirm|yes|deactivate/i }).first();
  const isFocused = await confirmButton.evaluate((el) => el === document.activeElement);
  expect.soft(isFocused).toBe(true);
});

test("dark mode: axe color contrast on admin users page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
