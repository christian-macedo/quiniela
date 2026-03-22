import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import type { AxeResults } from "axe-core";

/**
 * Runs an axe-core scan on the current page.
 * Attaches the full JSON results to the Playwright HTML report.
 * Returns the AxeResults object so tests can assert on violations.
 *
 * All WCAG 2.1 AA rules are enabled by default.
 */
export async function runAxe(page: Page, testInfo: TestInfo): Promise<AxeResults> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  // Attach raw JSON so the HTML report includes full violation details
  await testInfo.attach("axe-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  return results;
}

/**
 * Filters axe violations by rule ID.
 * Useful for asserting known issues without failing on unrelated rules.
 */
export function filterViolations(results: AxeResults, ruleIds: string[]) {
  return results.violations.filter((v) => ruleIds.includes(v.id));
}
