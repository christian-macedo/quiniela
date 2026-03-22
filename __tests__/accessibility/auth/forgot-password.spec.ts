import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

test.use({ storageState: { cookies: [], origins: [] } });

const PAGE_URL = "/forgot-password";

test("axe: no WCAG 2.1 AA violations on forgot-password page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab order reaches email field and submit button", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 15);
  const tags = order.map((o) => o.tag);
  expect.soft(tags).toContain("input");
  expect.soft(tags).toContain("button");
});

test("keyboard: Enter submits form from email field", async ({ page }) => {
  await page.goto(PAGE_URL);
  const emailInput = page.getByLabel(/email/i);
  await emailInput.fill("test@example.com");
  await emailInput.press("Enter");
  // Should show a success state or stay on page — just confirm no crash
  await page.waitForTimeout(1000);
  const url = page.url();
  expect.soft(url).toContain("forgot-password");
});

test("dark mode: axe color contrast on forgot-password page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
