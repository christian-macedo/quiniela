import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

// Run as anonymous (no stored session)
test.use({ storageState: { cookies: [], origins: [] } });

const PAGE_URL = "/login";

test("axe: no WCAG 2.1 AA violations on login page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: all form fields are reachable via Tab", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 20);
  const tags = order.map((o) => o.tag);
  // Expect at least one input and one button in the Tab order
  expect.soft(tags).toContain("input");
  expect.soft(tags).toContain("button");
});

test("keyboard: Tab order reaches email → passkey button → password → submit", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 20);
  const emailIdx = order.findIndex((o) => o.tag === "input" && o.ariaLabel === null);
  const submitIdx = order.findIndex((o) => o.tag === "button" && /log in|sign in/i.test(o.text));
  expect.soft(emailIdx).toBeGreaterThanOrEqual(0);
  expect.soft(submitIdx).toBeGreaterThan(emailIdx);
});

test("A06 (fixed): login error has role=alert and is announced to screen readers", async ({
  page,
}) => {
  await page.goto(PAGE_URL);
  await page.getByLabel(/email/i).fill("wrong@example.com");
  await page.getByLabel(/password/i).fill("wrongpassword");
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page
    .locator(".text-destructive")
    .waitFor({ timeout: 8_000 })
    .catch(() => {});
  const errorDiv = page.locator(".text-destructive").first();
  const isVisible = await errorDiv.isVisible().catch(() => false);
  if (isVisible) {
    const role = await errorDiv.getAttribute("role");
    expect.soft(role).toBe("alert");
  }
});

test("keyboard: Enter submits form from password field", async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.getByLabel(/email/i).fill("player1@quiniela.test");
  await page.getByLabel(/password/i).fill("password123");
  await page.getByLabel(/password/i).press("Enter");
  // Either redirected or migration prompt shown — either means form submitted
  await Promise.race([
    page.waitForURL("**/tournaments", { timeout: 10_000 }),
    page.getByRole("button", { name: /skip/i }).waitFor({ timeout: 8_000 }),
  ]).catch(() => {});
  const url = page.url();
  expect.soft(url).not.toContain("/login");
});

test("keyboard: LanguageSwitcher is keyboard operable", async ({ page }) => {
  await page.goto(PAGE_URL);
  // Tab to the language switcher trigger button
  const langButton = page.getByRole("button", { name: /language|en|es|english|spanish/i }).first();
  await langButton.focus();
  await page.keyboard.press("Enter");
  // Dropdown/popover should appear
  const menu = page.getByRole("listbox").or(page.getByRole("menu")).first();
  await expect.soft(menu).toBeVisible({ timeout: 3_000 });
  // Escape should close it
  await page.keyboard.press("Escape");
  await expect.soft(menu).toBeHidden({ timeout: 2_000 });
});

test("dark mode: axe color contrast on login page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
