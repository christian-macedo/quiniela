#!/usr/bin/env tsx
/**
 * generate-summary.ts
 *
 * Reads test-results/results.json (Playwright JSON reporter output) and
 * extracts embedded axe-core JSON attachments from each test result.
 * Produces audit-report.md in the project root.
 *
 * Usage:
 *   tsx __tests__/accessibility/reports/generate-summary.ts
 *   npm run audit:a11y:summary
 */

import fs from "fs";
import path from "path";

// ── Types ──────────────────────────────────────────────────────────────────────

interface AxeViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
  description: string;
  helpUrl: string;
  nodes: Array<{ html: string; failureSummary: string }>;
}

interface AxeResults {
  url: string;
  violations: AxeViolation[];
  passes: unknown[];
  incomplete: unknown[];
}

interface PlaywrightAttachment {
  name: string;
  contentType: string;
  body?: string;
  path?: string;
}

interface PlaywrightTestResult {
  status: string;
  attachments?: PlaywrightAttachment[];
  error?: { message: string };
}

interface PlaywrightTest {
  title: string;
  status?: string;
  results?: PlaywrightTestResult[];
  tests?: PlaywrightTest[];
  suites?: PlaywrightTest[];
}

interface PlaywrightReport {
  suites: PlaywrightTest[];
  stats: {
    expected: number;
    unexpected: number;
    skipped: number;
    flaky: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const RESULTS_PATH = path.join(process.cwd(), "test-results", "results.json");
const OUTPUT_PATH = path.join(process.cwd(), "audit-report.md");

function readResultsJson(): PlaywrightReport | null {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error(`❌  ${RESULTS_PATH} not found. Run 'npm run audit:a11y' first.`);
    return null;
  }
  return JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8")) as PlaywrightReport;
}

/** Recursively walks the test suite tree and returns all leaf tests. */
function collectTests(node: PlaywrightTest): PlaywrightTest[] {
  const tests: PlaywrightTest[] = [];
  if (node.results) tests.push(node);
  for (const child of node.tests ?? []) tests.push(...collectTests(child));
  for (const child of node.suites ?? []) tests.push(...collectTests(child));
  return tests;
}

/** Extracts axe JSON attachments from a test's results. */
function extractAxeResults(test: PlaywrightTest): AxeResults[] {
  const axeResults: AxeResults[] = [];
  for (const result of test.results ?? []) {
    for (const attachment of result.attachments ?? []) {
      if (attachment.name === "axe-results" && attachment.contentType === "application/json") {
        try {
          const raw = attachment.body
            ? Buffer.from(attachment.body, "base64").toString("utf-8")
            : attachment.path
              ? fs.readFileSync(attachment.path, "utf-8")
              : null;
          if (raw) axeResults.push(JSON.parse(raw) as AxeResults);
        } catch {
          // Skip malformed attachments
        }
      }
    }
  }
  return axeResults;
}

/** Groups violations by WCAG criterion derived from helpUrl tags. */
interface ViolationSummary {
  id: string;
  impact: string;
  description: string;
  helpUrl: string;
  pages: string[];
  occurrences: number;
}

function aggregateViolations(
  allResults: Array<{ url: string; violations: AxeViolation[] }>
): ViolationSummary[] {
  const map = new Map<string, ViolationSummary>();
  for (const { url, violations } of allResults) {
    for (const v of violations) {
      const existing = map.get(v.id);
      if (existing) {
        existing.occurrences += v.nodes.length;
        if (!existing.pages.includes(url)) existing.pages.push(url);
      } else {
        map.set(v.id, {
          id: v.id,
          impact: v.impact ?? "unknown",
          description: v.description,
          helpUrl: v.helpUrl,
          pages: [url],
          occurrences: v.nodes.length,
        });
      }
    }
  }
  // Sort by impact: critical > serious > moderate > minor
  const IMPACT_ORDER = ["critical", "serious", "moderate", "minor", "unknown"];
  return [...map.values()].sort(
    (a, b) => IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const report = readResultsJson();
  if (!report) process.exit(1);

  const allTests = report.suites.flatMap(collectTests);

  // Collect all axe results across every test
  const allAxeResults: Array<{ url: string; violations: AxeViolation[] }> = [];
  const keyboardFindings: Array<{ test: string; status: string; detail: string }> = [];

  for (const t of allTests) {
    const axe = extractAxeResults(t);
    for (const a of axe) {
      allAxeResults.push({ url: a.url, violations: a.violations });
    }

    // Capture keyboard navigation findings from failed tests
    const isKeyboardTest = /keyboard|focus|tab|finding a0/i.test(t.title);
    if (isKeyboardTest) {
      const status = t.results?.[0]?.status ?? "unknown";
      const errorMsg = t.results?.[0]?.error?.message ?? "";
      if (status === "failed" || status === "unexpected") {
        keyboardFindings.push({ test: t.title, status, detail: errorMsg.slice(0, 200) });
      }
    }
  }

  const violations = aggregateViolations(allAxeResults);
  const criticalCount = violations.filter((v) => v.impact === "critical").length;
  const seriousCount = violations.filter((v) => v.impact === "serious").length;
  const moderateCount = violations.filter((v) => v.impact === "moderate").length;
  const minorCount = violations.filter((v) => v.impact === "minor").length;
  const totalTests = allTests.length;
  const passed = allTests.filter((t) => t.results?.[0]?.status === "passed").length;
  const failed = allTests.filter(
    (t) => t.results?.[0]?.status === "failed" || t.results?.[0]?.status === "unexpected"
  ).length;
  const skipped = allTests.filter((t) => t.results?.[0]?.status === "skipped").length;

  // Per-page summary
  const pageMap = new Map<string, { violations: number; hasCritical: boolean }>();
  for (const { url, violations: vs } of allAxeResults) {
    const page = url.replace(/^https?:\/\/[^/]+/, "") || "/";
    const existing = pageMap.get(page) ?? { violations: 0, hasCritical: false };
    existing.violations += vs.length;
    existing.hasCritical = existing.hasCritical || vs.some((v) => v.impact === "critical");
    pageMap.set(page, existing);
  }

  // ── Build Markdown ────────────────────────────────────────────────────────

  const now = new Date().toISOString().split("T")[0];
  const lines: string[] = [];

  lines.push(`# Quiniela Accessibility Audit Report`);
  lines.push(``);
  lines.push(`**Generated:** ${now}  `);
  lines.push(`**Standard:** WCAG 2.1 AA  `);
  lines.push(`**Tool:** Playwright + axe-core  `);
  lines.push(`**Browsers tested:** Chromium (Desktop)  `);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Executive Summary
  lines.push(`## Executive Summary`);
  lines.push(``);
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Tests run | ${totalTests} |`);
  lines.push(`| Tests passed | ${passed} |`);
  lines.push(`| Tests failed | ${failed} |`);
  lines.push(`| Tests skipped | ${skipped} |`);
  lines.push(`| Unique axe rule violations | ${violations.length} |`);
  lines.push(`| Critical impact | ${criticalCount} |`);
  lines.push(`| Serious impact | ${seriousCount} |`);
  lines.push(`| Moderate impact | ${moderateCount} |`);
  lines.push(`| Minor impact | ${minorCount} |`);
  lines.push(``);

  if (criticalCount > 0 || seriousCount > 0) {
    lines.push(
      `> ⚠️  **${criticalCount + seriousCount} critical/serious violations require remediation before launch.**`
    );
  } else {
    lines.push(`> ✅  No critical or serious violations found.`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Automated Scan Findings
  lines.push(`## Automated Scan Findings (axe-core)`);
  lines.push(``);
  if (violations.length === 0) {
    lines.push(`No axe-core violations detected across all scanned pages.`);
  } else {
    lines.push(`| Rule ID | Impact | Description | Pages Affected | Occurrences |`);
    lines.push(`|---------|--------|-------------|----------------|-------------|`);
    for (const v of violations) {
      const pages = v.pages.join(", ");
      lines.push(`| \`${v.id}\` | ${v.impact} | ${v.description} | ${pages} | ${v.occurrences} |`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Pre-identified Findings
  lines.push(`## Pre-Identified Findings`);
  lines.push(``);
  lines.push(`These issues were identified via code analysis and validated by automated tests.`);
  lines.push(``);
  lines.push(`| ID | Location | Issue | Test Result |`);
  lines.push(`|----|----------|-------|-------------|`);

  const preIdentified = [
    {
      id: "A01",
      location: "`app/(app)/layout.tsx`",
      issue: "No `<main>`, `<header>`, or `<footer>` landmarks — bare `<div>` wrapper",
    },
    { id: "A02", location: "All pages", issue: "No skip-to-content link" },
    {
      id: "A03",
      location: "`prediction-form.tsx:84-104`",
      issue: 'Score `<Input type="number">` have no `<label>` or `aria-label`',
    },
    {
      id: "A04",
      location: "Rankings page",
      issue: "Div-based layout instead of semantic `<table>`",
    },
    {
      id: "A05",
      location: "AppNav (mobile) + UserNav trigger",
      issue: "Avatar/hamburger trigger button lacks accessible name",
    },
    {
      id: "A06",
      location: "`login/page.tsx:132`",
      issue: 'Error `<div>` has no `role="alert"` — not announced to screen readers',
    },
    {
      id: "A07",
      location: "`mobile-nav.tsx`",
      issue: "After close, focus doesn't return to hamburger trigger",
    },
    {
      id: "A08",
      location: "Profile page",
      issue: "Decorative icons (Fingerprint, etc.) may not be `aria-hidden`",
    },
    {
      id: "A09",
      location: "`globals.css`",
      issue: "No `prefers-reduced-motion` handling for `animate-*` CSS animations",
    },
    {
      id: "A10",
      location: "Dark mode (all pages)",
      issue: "Potential color contrast issues (`--primary` blue on dark blue surfaces)",
    },
  ];

  for (const finding of preIdentified) {
    const testMatch = keyboardFindings.find((k) =>
      k.test.toLowerCase().includes(finding.id.toLowerCase())
    );
    const status = testMatch ? `❌ Confirmed (test failed)` : `See test results`;
    lines.push(`| **${finding.id}** | ${finding.location} | ${finding.issue} | ${status} |`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Keyboard Navigation Findings
  lines.push(`## Keyboard Navigation Findings`);
  lines.push(``);
  if (keyboardFindings.length === 0) {
    lines.push(`No keyboard navigation failures detected.`);
  } else {
    lines.push(`| Test | Status | Detail |`);
    lines.push(`|------|--------|--------|`);
    for (const kf of keyboardFindings) {
      lines.push(`| ${kf.test} | ${kf.status} | ${kf.detail.replace(/\n/g, " ").slice(0, 150)} |`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Per-Page Summary
  lines.push(`## Per-Page Summary`);
  lines.push(``);
  if (pageMap.size === 0) {
    lines.push(`No per-page data available.`);
  } else {
    lines.push(`| Page | Violations | Has Critical |`);
    lines.push(`|------|------------|--------------|`);
    for (const [page, data] of [...pageMap.entries()].sort()) {
      lines.push(`| \`${page}\` | ${data.violations} | ${data.hasCritical ? "❌ Yes" : "✅ No"} |`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Recommended Remediation Priority`);
  lines.push(``);
  lines.push(`1. **Critical (immediate)**: Fix all \`critical\`-impact axe violations`);
  lines.push(
    `2. **High**: A01 — Add \`<main>\`, \`<header>\`, \`<nav>\` landmarks to \`app/(app)/layout.tsx\``
  );
  lines.push(`3. **High**: A02 — Add a skip-to-content link before the nav`);
  lines.push(`4. **High**: A03 — Add \`aria-label\` to score inputs in \`prediction-form.tsx\``);
  lines.push(`5. **Medium**: A06 — Add \`role="alert"\` to login error div`);
  lines.push(`6. **Medium**: A07 — Return focus to hamburger trigger after mobile nav close`);
  lines.push(`7. **Medium**: A04 — Use semantic \`<table>\` for the rankings layout`);
  lines.push(`8. **Low**: A05 — Add \`aria-label\` to avatar/hamburger buttons`);
  lines.push(`9. **Low**: A08 — Add \`aria-hidden="true"\` to decorative icons`);
  lines.push(`10. **Low**: A09 — Add \`prefers-reduced-motion\` CSS query for animations`);
  lines.push(`11. **Low**: A10 — Audit dark mode color contrast values`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Generated by \`npm run audit:a11y:summary\`*`);

  fs.writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");
  console.log(`✅  audit-report.md written to ${OUTPUT_PATH}`);
  console.log(
    `   ${violations.length} violation types found (${criticalCount} critical, ${seriousCount} serious, ${moderateCount} moderate, ${minorCount} minor)`
  );
}

main();
