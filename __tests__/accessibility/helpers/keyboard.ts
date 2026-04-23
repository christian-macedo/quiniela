import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Presses Tab `count` times and returns the locator of the final focused element.
 */
export async function tabThrough(page: Page, count: number): Promise<Locator> {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
  }
  return page.locator(":focus");
}

/**
 * Asserts that the currently focused element has a visible focus ring.
 * Checks for a non-zero outline width or box-shadow that indicates focus styling.
 */
export async function expectVisibleFocusRing(page: Page): Promise<void> {
  const focusedEl = page.locator(":focus");
  const outlineWidth = await focusedEl.evaluate((el) => {
    const style = getComputedStyle(el);
    return parseFloat(style.outlineWidth);
  });
  const boxShadow = await focusedEl.evaluate((el) => getComputedStyle(el).boxShadow);

  const hasFocusRing = outlineWidth > 0 || (boxShadow !== "none" && boxShadow !== "");
  expect.soft(hasFocusRing).toBe(true);
}

/**
 * Tabs through all focusable elements on the page, collecting their
 * accessible names and tag names. Stops when focus loops back to the start
 * or after `maxTabs` iterations.
 */
export async function collectFocusOrder(
  page: Page,
  maxTabs = 50
): Promise<Array<{ tag: string; text: string; ariaLabel: string | null }>> {
  // Focus the first interactive element
  await page.keyboard.press("Tab");

  const order: Array<{ tag: string; text: string; ariaLabel: string | null }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < maxTabs; i++) {
    const info = await page.locator(":focus").evaluate((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el as HTMLElement).innerText?.trim().slice(0, 80) || "",
      ariaLabel: el.getAttribute("aria-label"),
      id: el.id || el.getAttribute("data-testid") || "",
    }));

    const key = `${info.tag}:${info.text}:${info.ariaLabel}:${info.id}`;
    if (seen.has(key) && i > 0) break; // Focus looped
    seen.add(key);

    order.push({ tag: info.tag, text: info.text, ariaLabel: info.ariaLabel });
    await page.keyboard.press("Tab");
  }

  return order;
}
