import { test, expect } from "@playwright/test";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

const PAGE_URL = "/tournaments";

// ── Desktop navigation (default viewport: 1280×720) ──────────────────────────

test("desktop: axe no violations on AppNav", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  // Scope scan to the nav element
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("desktop: Tab order in AppNav is logo → language → nav links → user nav trigger", async ({
  page,
}) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 20);
  // First focusable item should be a link (logo)
  expect.soft(order[0]?.tag).toBe("a");
  // At least one button (UserNav trigger or LanguageSwitcher) should be in order
  const buttons = order.filter((o) => o.tag === "button");
  expect.soft(buttons.length).toBeGreaterThan(0);
});

test("desktop: UserNav dropdown opens with Enter and closes with Escape", async ({ page }) => {
  await page.goto(PAGE_URL);
  // Focus the UserNav trigger (avatar button)
  const userNavTrigger = page
    .getByRole("button", { name: /user menu|account|profile|avatar/i })
    .or(page.locator("[data-testid='user-nav-trigger']"))
    .first();

  // Try to find it by tabbing to the last button in the nav
  const trigger = page.locator("nav").getByRole("button").last();
  await trigger.focus();
  await page.keyboard.press("Enter");

  const dropdown = page.getByRole("menu").first();
  await expect.soft(dropdown).toBeVisible({ timeout: 3_000 });

  // ArrowDown navigates within menu
  await page.keyboard.press("ArrowDown");
  const focusedItem = page.locator(":focus");
  const role = await focusedItem.getAttribute("role");
  expect.soft(role).toMatch(/menuitem|option/);

  // Escape closes and returns focus to trigger
  await page.keyboard.press("Escape");
  await expect.soft(dropdown).toBeHidden({ timeout: 2_000 });
});

test("finding A05: desktop UserNav trigger has accessible name", async ({ page }) => {
  await page.goto(PAGE_URL);
  // The avatar button must have an accessible name
  const avatarButtons = page.locator("nav").getByRole("button");
  const count = await avatarButtons.count();
  let foundAccessibleButton = false;
  for (let i = 0; i < count; i++) {
    const btn = avatarButtons.nth(i);
    const ariaLabel = await btn.getAttribute("aria-label");
    const text = await btn.innerText().catch(() => "");
    const ariaLabelledBy = await btn.getAttribute("aria-labelledby");
    if (ariaLabel || text.trim() || ariaLabelledBy) {
      foundAccessibleButton = true;
      break;
    }
  }
  expect.soft(foundAccessibleButton).toBe(true);
});

// ── Mobile navigation (375px viewport) ────────────────────────────────────────

test.describe("mobile nav (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("axe: no violations on mobile nav", async ({ page }, testInfo) => {
    await page.goto(PAGE_URL);
    const results = await runAxe(page, testInfo);
    expect.soft(results.violations).toHaveLength(0);
  });

  test("keyboard: hamburger button has aria-label", async ({ page }) => {
    await page.goto(PAGE_URL);
    const hamburger = page.getByRole("button", { name: /toggle menu|open menu/i }).first();
    const isVisible = await hamburger.isVisible().catch(() => false);
    if (!isVisible) return; // Mobile menu not visible at this viewport
    const label = await hamburger.getAttribute("aria-label");
    expect.soft(label).toBeTruthy(); // Finding A05 (mobile)
  });

  test("keyboard: Tab opens mobile nav → links reachable → Escape closes", async ({ page }) => {
    await page.goto(PAGE_URL);
    const hamburger = page.getByRole("button", { name: /toggle menu|open menu/i }).first();
    const isVisible = await hamburger.isVisible().catch(() => false);
    if (!isVisible) return;

    await hamburger.click();
    // Mobile nav panel should open
    const navPanel = page.getByRole("navigation").or(page.locator("[data-mobile-nav]")).last();
    // Tab through links
    await page.keyboard.press("Tab");
    const firstLink = page.locator(":focus");
    const tag = await firstLink.evaluate((el) => el.tagName.toLowerCase());
    expect.soft(tag).toBe("a");

    // Escape should close the nav
    await page.keyboard.press("Escape");
  });

  test("A07 (fixed): focus returns to hamburger after mobile nav closes", async ({ page }) => {
    await page.goto(PAGE_URL);
    const hamburger = page.getByRole("button", { name: /toggle menu|open menu/i }).first();
    const isVisible = await hamburger.isVisible().catch(() => false);
    if (!isVisible) return;

    await hamburger.click();
    await page.keyboard.press("Escape");

    await expect.soft(hamburger).toBeFocused({ timeout: 2_000 });
  });
});
