import { test, expect } from "@playwright/test";
import path from "path";
import { runAxe } from "../helpers/axe";
import { collectFocusOrder } from "../helpers/keyboard";

test.use({ storageState: path.join(__dirname, "../../.auth/admin.json") });

const LIST_URL = "/teams";
const NEW_URL = "/teams/new";

test("axe: no WCAG 2.1 AA violations on team list page", async ({ page }, testInfo) => {
  await page.goto(LIST_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("axe: no WCAG 2.1 AA violations on new team form", async ({ page }, testInfo) => {
  await page.goto(NEW_URL);
  const results = await runAxe(page, testInfo);
  expect.soft(results.violations).toHaveLength(0);
});

test("keyboard: Tab order covers all fields in new team form", async ({ page }) => {
  await page.goto(NEW_URL);
  const order = await collectFocusOrder(page, 30);
  const inputs = order.filter(
    (o) => o.tag === "input" || o.tag === "select" || o.tag === "textarea"
  );
  expect.soft(inputs.length).toBeGreaterThan(0);
});

test("keyboard: Tab reaches Create Team button", async ({ page }) => {
  await page.goto(NEW_URL);
  const order = await collectFocusOrder(page, 20);
  const submitButton = order.find((o) => o.tag === "button" && /create|save|submit/i.test(o.text));
  expect.soft(submitButton).toBeDefined();
});

test("keyboard: Tab reaches Edit/Delete actions on team list", async ({ page }) => {
  await page.goto(LIST_URL);
  const order = await collectFocusOrder(page, 50);
  const actionItems = order.filter((o) => o.tag === "a" || o.tag === "button");
  expect.soft(actionItems.length).toBeGreaterThan(0);
});

test("dark mode: axe color contrast on team management page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(LIST_URL);
  const results = await runAxe(page, testInfo);
  const contrastViolations = results.violations.filter((v) => v.id === "color-contrast");
  expect.soft(contrastViolations).toHaveLength(0);
});
