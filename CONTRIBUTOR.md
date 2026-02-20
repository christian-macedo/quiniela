# Contributing to Quiniela

This file documents the AI-assisted code quality tooling available in this repository — specifically the two specialized Claude Code agents that help maintain code quality and project standards.

For code conventions, architecture patterns, database rules, and everything else, see [CLAUDE.md](./CLAUDE.md). This file is specifically about the agents and when to use them.

---

## AI Agents Overview

The project ships two sub-agents in `.claude/agents/` that Claude Code can invoke automatically or on demand. They are complementary: one teaches, one audits.

| Agent           | Purpose                                                                                                                                             | Color  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `code-improver` | Analyzes recently written code for readability, performance, and best-practice violations — with before/after examples and educational explanations | Purple |
| `code-reviewer` | Reviews code for quality, security, and project standard compliance — issues a formal APPROVED / CHANGES REQUESTED verdict                          | Cyan   |

---

## `code-improver`

### What It Does

Reviews recently written or modified code and provides structured improvement suggestions across three dimensions: **readability**, **performance**, and **best practices**. Every issue comes with the exact current code, an improved version, and a plain-English explanation of why the change is better.

### Benefits

- Shows **before/after code comparisons** for every issue — no vague advice
- Labels severity (**Critical → Low**) so you know what to tackle first
- Includes a **"What's Already Good"** section — reinforces patterns worth repeating
- Explains the _why_ behind each suggestion, making it a learning tool
- Catches project-specific anti-patterns: wrong Supabase client, `new Date()` for display, `<img>` instead of `<Image>`, missing `useFeatureToast`, hardcoded strings, etc.
- Ends with a **Priority Action Items** list so next steps are clear

### Recommended Scenarios

- After writing a new utility function in `lib/utils/`
- After adding a new API route under `app/api/`
- After implementing a new React component
- After writing a new custom hook in `lib/hooks/`
- When you want a **learning-focused** review with detailed explanations rather than a pass/fail verdict
- When a utility or hook will be reused widely and correctness matters

### Examples

**Example 1 — New utility function:**
You write `lib/utils/predictions.ts` with a helper that calculates prediction accuracy. You ask the agent to review it. It finds that a variable named `p` should be `prediction`, that a `for` loop over an array could use `reduce` for clarity, and that a direct `new Date()` comparison should use `isPastDate()` from `@/lib/utils/date`. Each issue includes a corrected snippet. The "What's Already Good" section notes your null-checks and consistent return types.

**Example 2 — New API route (proactive):**
You add `app/api/matches/[matchId]/score/route.ts` and tell Claude you're done. The agent runs proactively and catches that `createClient()` is called without `await` (the server client requires `await`). This would silently fail at runtime. Severity: Critical. The fix is shown inline.

**Example 3 — New component:**
You finish `components/rankings/RankingsTable.tsx`. The agent flags two Medium issues: a raw `<img>` tag for team logos (should be `<Image>` from `next/image`) and a sorted list that recomputes on every render (should be wrapped in `useMemo`). It also flags a Low issue: a hardcoded "No results" string that needs to go through `useTranslations`.

### Dos and Don'ts

**Do:**

- Trigger it after completing a logical unit of work — a function, a route, a component
- Read the "Why This Is Better" sections — they are the learning value
- Run it on utility files and hooks that other parts of the app will depend on
- Ask it to review a specific file path when you want targeted feedback (e.g., "review `lib/utils/scoring.ts`")

**Don't:**

- Don't ask it to review the entire codebase at once — it's scoped to recently written or changed code
- Don't let Low/Medium severity issues accumulate indefinitely — they compound over time
- Don't skip it just because Prettier already ran — Prettier only formats syntax, not logic or architecture
- Don't apply its suggestions to files in `/components/ui` — those are managed by the shadcn CLI and should not be edited directly

---

## `code-reviewer`

### What It Does

Reviews recently written or modified code against a **12-category standards checklist** and issues a formal verdict: **APPROVED**, **APPROVED WITH MINOR CHANGES**, or **CHANGES REQUESTED**. It is designed to slot into a pull request workflow as a pre-merge gate.

The 12 categories: Architecture & Component Patterns, Type Safety & Code Quality, Date & Time Handling, Security & Authorization, Toast Notifications & UX, Image Handling, Localization, Database & Schema, Testing, Error Handling, Imports & Path Aliases, Scoring Logic.

### Benefits

- Issues a **formal merge verdict** — integrates naturally into a PR review process
- **Prioritizes security first**: auth checks, admin guards, active-user enforcement, privacy leaks
- Catches **missing translations** — untranslated strings are user-facing bugs in the Spanish locale
- Flags missing `bootstrap.sql` updates when schema changes are present
- Checks that **deactivated users are blocked at every layer** — a critical multi-level safety requirement in this app
- Provides structured output: Critical Issues → Warnings → Suggestions — so you know exactly what must be fixed vs. what's optional

### Recommended Scenarios

- Before merging a PR — treat the verdict as a gate
- After implementing a new feature end-to-end
- After fixing a bug that touched auth, scoring, or RLS logic
- After refactoring a module that multiple components depend on
- When adding a new database table or column (catches missing `bootstrap.sql` updates)
- When touching any user-facing API route (security checklist runs automatically)

### Examples

**Example 1 — New API route:**
You add a bulk prediction submission endpoint at `app/api/predictions/bulk/route.ts`. The reviewer catches two Critical Issues: `checkUserActive()` is missing (deactivated users could submit predictions), and the response body includes the full user object — exposing the `email` field publicly. Both must be fixed before merge. The verdict is CHANGES REQUESTED.

**Example 2 — Scoring utility refactor:**
You refactor `calculatePoints` in `lib/utils/scoring.ts` to support a new multiplier field. The reviewer verifies the point rules are intact (exact score = 3pts, correct winner + goal difference = 2pts, correct winner only = 1pt, incorrect = 0pts) and that the multiplier is correctly applied. It notes the refactor looks correct and issues APPROVED WITH MINOR CHANGES — a missing test for the multiplier edge case.

**Example 3 — New component:**
You build `components/rankings/RankingsTable.tsx`. The reviewer flags a Warning for using a raw `<img>` tag instead of `<Image>`, and a second Warning for missing Spanish translations in `messages/es/rankings.json`. It also notes the component is a Server Component (correct, since it just displays data) and the Supabase query selects only public fields. Verdict: APPROVED WITH MINOR CHANGES.

### Dos and Don'ts

**Do:**

- Treat a **CHANGES REQUESTED** verdict seriously — resolve all Critical Issues before merging
- Run it on the specific files changed, not the whole codebase
- Use it as a **pre-PR gate** for any change touching auth, scoring, RLS, or user-facing APIs
- Address the **Critical Issues** section first before looking at Warnings or Suggestions
- Run it after any schema change to catch missing `supabase/bootstrap.sql` updates

**Don't:**

- Don't rely on it instead of writing tests — it flags missing tests but does not write them for you
- Don't confuse it with `code-improver`: this agent enforces **standards compliance**; `code-improver` teaches **quality improvements**
- Don't run it on WIP or draft code — use it on complete, ready-to-review work
- Don't ignore localization warnings — missing Spanish translations are bugs that affect real users

---

## Choosing the Right Agent

| Question                                      | `code-improver` | `code-reviewer` |
| --------------------------------------------- | :-------------: | :-------------: |
| I want to learn and get detailed explanations |       ✅        |                 |
| I need a formal pass/fail verdict for a PR    |                 |       ✅        |
| I just wrote a utility function or hook       |       ✅        |                 |
| I'm checking a feature before merging         |                 |       ✅        |
| I want before/after code examples             |       ✅        |                 |
| I want a security and standards audit         |                 |       ✅        |
| I touched auth, scoring, or RLS logic         |       ✅        |       ✅        |

### Can I run both?

Yes — they are complementary, not redundant. `code-improver` gives you teaching and polish; `code-reviewer` gives you a compliance verdict. Running both on a new feature gives maximum coverage: you catch quality and learning opportunities _and_ get a formal standards sign-off before the PR goes up.
