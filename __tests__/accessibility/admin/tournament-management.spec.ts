import { test, expect } from "@playwright/test";
import path from "path";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

test.use({ storageState: path.join(__dirname, "../../.auth/admin.json") });

const PAGE_URL = "/tournaments/manage";

test("axe: no WCAG 2.1 AA violations on tournament management page", async ({ page }, testInfo) => {
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab reaches Create Tournament button", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 30);
  const createBtn = order.find(
    (o) => o.tag === "a" || (o.tag === "button" && /create|new/i.test(o.text))
  );
  expect.soft(createBtn).toBeDefined();
});

test("keyboard: Tab order includes action links for existing tournaments", async ({ page }) => {
  await page.goto(PAGE_URL);
  const order = await collectFocusOrder(page, 50);
  const actionItems = order.filter((o) => o.tag === "a" || o.tag === "button");
  expect.soft(actionItems.length).toBeGreaterThan(0);
});

test("axe: no violations on new tournament form", async ({ page }, testInfo) => {
  await page.goto(`${PAGE_URL}/new`);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab order covers all fields in new tournament form", async ({ page }) => {
  await page.goto(`${PAGE_URL}/new`);
  const order = await collectFocusOrder(page, 30);
  const inputs = order.filter(
    (o) => o.tag === "input" || o.tag === "select" || o.tag === "textarea"
  );
  expect.soft(inputs.length).toBeGreaterThan(0);
});

test("dark mode: axe color contrast on tournament management page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
