# Claude Code: Agents, Skills & Documentation Reference

This document describes every agent, skill, and documentation file available in the Quiniela project, how they load into context, and when to use each one.

## How Context Loading Works

Understanding when content is available to Claude determines how effectively each resource is used.

| Mechanism                     | Loaded Into Main Context           | Full Content Available                                    |
| ----------------------------- | ---------------------------------- | --------------------------------------------------------- |
| **CLAUDE.md**                 | Entire file, every conversation    | Always                                                    |
| **Skill** (`.claude/skills/`) | Description only (first paragraph) | When auto-invoked by Claude or manually via `/skill-name` |
| **Agent** (`.claude/agents/`) | Nothing in main context            | Only when spawned as a subprocess via the Task tool       |
| **Docs** (`docs/`)            | Nothing                            | Only when explicitly read by Claude or an agent           |

**Key implications:**

- CLAUDE.md is the primary enforcement layer — it's always present and covers conventions, architecture, testing, and more.
- Skill descriptions influence the main conversation (Claude sees them and can auto-invoke the full content when relevant).
- Agent descriptions are only used for Task tool delegation decisions — they do not influence how Claude writes code in the main conversation.
- Agents with `skills: [...]` in their frontmatter get those skills pre-loaded when spawned.

---

## Agents

Agents are isolated subprocesses spawned via the Task tool. They run in their own context with a focused persona, specific model, and structured output format. Use agents for structured post-hoc review processes where isolation from the main conversation is desirable.

### code-reviewer

**File:** `.claude/agents/code-reviewer.md`
**Model:** Sonnet | **Color:** Cyan

**Purpose:** Comprehensive code review against project standards. Evaluates recently written or modified code for quality, security, adherence to conventions, and best practices. Returns a structured verdict (APPROVED / APPROVED WITH MINOR CHANGES / CHANGES REQUESTED).

**Pre-loaded skills:** `typescript-conventions` — full conventions are available in the agent's context without needing to read the file.

**When to use:**

- After implementing a new feature (API route, component, utility)
- After fixing a bug that touched multiple files
- After refactoring existing code
- Before opening a PR, to catch issues early
- When you want a structured pass/fail verdict on code quality

**What it checks:**

1. Architecture & component patterns (Server vs Client boundaries, Supabase client usage)
2. Type safety & code quality (no `any`, unused variables, naming)
3. Date & time handling (project utilities required, no raw `new Date()` for display)
4. Security & authorization (auth checks, admin guards, privacy utilities, RLS awareness)
5. Toast notifications & UX (`useFeatureToast()`, correct namespaces, promise pattern)
6. Image handling (Next.js `<Image>`, `uploadImage`/`generateImageFilename`)
7. Localization (EN + ES translations, namespaced by feature)
8. Database & schema (migration in `supabase/migrations/` if schema changed, transactions for multi-step ops)
9. Testing (co-located tests, `vi.hoisted()` Supabase mock pattern)
10. Error handling (try-catch + console.error + status codes in API routes)
11. Imports & path aliases (`@/` aliases, no server imports in client components)
12. Scoring logic (point rules from CLAUDE.md)

**Output format:** Summary, What's Done Well, Critical Issues, Warnings, Suggestions, Verdict.

**Example trigger:**

```
User: "I've added a new POST /api/predictions/bulk route."
Claude spawns code-reviewer agent to review the new route.
```

---

### code-improver

**File:** `.claude/agents/code-improver.md`
**Model:** Sonnet | **Color:** Purple

**Purpose:** Analyzes code for readability issues, performance bottlenecks, and best practice violations. Provides detailed explanations and improved versions of problematic code sections. Educational in tone — explains the _why_ behind each suggestion.

**Pre-loaded skills:** `typescript-conventions` — full conventions are available in the agent's context without needing to read the file.

**When to use:**

- After writing new code and wanting feedback on quality
- When you suspect a file has readability or performance issues
- After adding a new API route, component, or utility and wanting improvement suggestions
- When you want before/after code snippets showing how to improve specific sections
- Proactively, after significant code is written (Claude will often trigger this automatically)

**What it analyzes:**

1. **Readability** — naming clarity, code structure, logical flow, complexity reduction (early returns, guard clauses), magic numbers/strings
2. **Performance** — unnecessary re-renders, N+1 queries, missing indexes, over-fetching, large bundle imports, missing `key` props, unoptimized images
3. **Best Practices & Conventions** — TypeScript type safety, React patterns, Next.js patterns, Supabase patterns, security, error handling, accessibility

**Output format:** Per-issue structured blocks with Category, Severity, Explanation, Current Code, Improved Version, and Why This Is Better. Includes a "What's Already Good" section and Priority Action Items.

**Example trigger:**

```
User: "Done implementing the PredictionForm component."
Claude spawns code-improver agent to scan for improvements.
```

---

### code-reviewer vs code-improver: When to Use Which

| Scenario                                                  | Use                                      |
| --------------------------------------------------------- | ---------------------------------------- |
| Need a pass/fail verdict before merging                   | **code-reviewer**                        |
| Want educational feedback with before/after examples      | **code-improver**                        |
| Checking security and authorization correctness           | **code-reviewer**                        |
| Looking for performance optimizations                     | **code-improver**                        |
| Verifying all project conventions are followed            | **code-reviewer**                        |
| Understanding how to write better code in a specific area | **code-improver**                        |
| Post-implementation review (proactive)                    | Either — Claude chooses based on context |

Both agents cross-reference `CLAUDE.md` and `typescript-conventions.md`. Since agents don't receive CLAUDE.md automatically, both have the `skills: [typescript-conventions]` field to pre-load conventions. They can also read any project file via their available tools (Glob, Grep, Read).

---

## Skills

Skills are specialized knowledge files. Their description (first paragraph) is always visible in the main conversation, allowing Claude to auto-invoke the full content when relevant. Skills can also be pre-loaded into agents via the `skills:` frontmatter field.

### typescript-conventions

**File:** `.claude/skills/typescript-conventions.md`

**Purpose:** Concrete, pattern-driven TypeScript conventions derived from the actual codebase. Every rule is backed by existing code. Supplements CLAUDE.md with deeper detail on coding patterns.

**When it activates:** Claude sees the description in every conversation and auto-invokes the full content when writing or reviewing TypeScript code. Also pre-loaded into both agents.

**What it covers:**

| Section                          | Key Rules                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **File & Directory Conventions** | kebab-case files, feature-based directories, co-located tests, centralized types                                                            |
| **Import Conventions**           | Ordering pattern (React → lib → domain → types → UI → Next.js), `@/` aliases required, no cross-boundary imports                            |
| **Type System**                  | Central types in `types/database.ts`, `Pick<>` for narrowed types, no `any`, props interfaces above components                              |
| **Naming Conventions**           | camelCase variables (descriptive, no abbreviations), meaningful query aliases, `is`/`has` boolean prefixes, descriptive error suffixes      |
| **Function Patterns**            | Named exports only, JSDoc on public utilities, guard clauses over nesting, `NextResponse \| null` middleware pattern                        |
| **Component Patterns**           | Server Components by default, `"use client"` only for interactivity, never edit `/components/ui`, feature-scoped directories                |
| **API Route Patterns**           | try-catch wrapping entire handler, consistent `{ error: "message" }` responses, standard status codes (401/403/404/500)                     |
| **Data Access Patterns**         | Three Supabase client types (server async, client sync, admin bypass), always destructure `{ data, error }`, null-check results             |
| **Date Handling**                | UTC storage, format utilities for display, `isPastDate()`/`isFutureDate()` for comparisons                                                  |
| **Toast & User Feedback**        | `useFeatureToast(namespace)`, no `alert()`, no `console.error` as user feedback                                                             |
| **Error Handling**               | API: try-catch + console.error + status code; Middleware: `NextResponse \| null`; Supabase: always check `{ error }`                        |
| **Privacy & Security**           | Never expose email publicly, `sanitizeUserForPublic()`, explicit `.select()` field lists, middleware guards at handler top                  |
| **Code Hygiene**                 | No unused variables/imports, no dead code, no backwards-compatibility shims, no over-engineering, Prettier handles formatting               |
| **Localization**                 | All user-facing strings in EN + ES, organized by feature area, namespaced keys, `getTranslations()` (server) / `useTranslations()` (client) |

---

## Documentation Files

These files are not automatically loaded into any context. Claude or agents read them on demand when working on related areas. CLAUDE.md cross-references all of them.

### CLAUDE.md (Project Root)

**File:** `CLAUDE.md`
**Loaded:** Always, in every conversation.

The primary project reference. Covers the full tech stack, architecture, development commands, database schema, project structure, scoring logic, API routes, testing patterns, git hooks, and all conventions. This is the single most important file — it's the foundation that agents and skills build on.

**Sections:** Quick Reference, Tech Stack, Requirements, Development Commands, Local Supabase Setup, Component Patterns, Toast Notifications, Date Handling, Supabase Configuration, Database Architecture, Project Structure, Authorization & Security, Image Uploads, Theming, Scoring Logic, API Routes, Best Practices, Git Hooks, Testing, Common Gotchas, Troubleshooting.

### AUTHORIZATION.md

**File:** `docs/AUTHORIZATION.md`
**Referenced by:** CLAUDE.md, code-reviewer, code-improver, typescript-conventions

Comprehensive guide to authentication, authorization, privacy, and security patterns.

**When to read:**

- Adding or modifying API routes (to choose correct middleware pattern)
- Working with user data display (privacy utilities)
- Adding new database tables (RLS policy templates)
- Debugging auth/permission errors (401, 403)
- Understanding the multi-layer protection model
- Working with admin operations or user deactivation

**Key content:**

- Multi-layer protection model (App Layout → API Middleware → RLS → Application Code)
- API route protection patterns with decision matrix
- Admin utilities (`isAdmin`, `requireAdmin`, `createAdminClient`)
- User status & deactivation (effects across all layers)
- Privacy utilities (`maskEmail`, `sanitizeUserForPublic`, `getPublicUserDisplay`)
- Per-table RLS policy summary and storage bucket policies
- Key SQL functions (`is_admin()`, `handle_new_user()`, `tournament_rankings` view)
- Common scenarios (new API route, new page, new table)

### TOASTS.md

**File:** `docs/TOASTS.md`
**Referenced by:** CLAUDE.md, code-reviewer

Complete guide to the toast notification system.

**When to read:**

- Adding user feedback to any feature
- Creating new toast message keys
- Using the promise pattern for async operations
- Debugging toast display issues (wrong messages, missing translations)
- Working with feature-specific vs common message namespaces

**Key content:**

- `useFeatureToast(namespace)` API reference
- Message organization (feature-specific vs `common:` prefix vs `status:` prefix)
- Promise pattern for loading → success/error transitions
- Complete examples by feature area (teams, matches, predictions, profile, admin)
- Best practices (feature-specific over generic, appropriate toast types)
- Sonner configuration (`richColors`, `position`, `closeButton`)

### THEMING.md

**File:** `docs/THEMING.md`
**Referenced by:** CLAUDE.md

Guide to the CSS variable-based theming system.

**When to read:**

- Changing the application color scheme
- Adding custom colors beyond the semantic tokens
- Debugging color rendering issues
- Understanding how Tailwind utility classes map to CSS variables

**Key content:**

- Current palette (Blue Lagoon from Coolors.co) with hex codes and usage
- How to change colors (single file: `app/globals.css`)
- Semantic color tokens reference (primary, secondary, accent, muted, etc.)
- Dark mode implementation
- HEX to HSL conversion workflow
- Extending the theme with custom colors
- Color palette resources (Coolors, Adobe Color, Realtime Colors)

### MIGRATION_INSTRUCTIONS.md

**File:** `docs/MIGRATION_INSTRUCTIONS.md`
**Referenced by:** None (standalone)

Documents the migration from table-based to view-based tournament rankings.

**When to read:**

- Understanding why `tournament_rankings` is a VIEW, not a table
- Applying the rankings migration to a fresh or existing database
- Debugging ranking calculation issues
- Considering rollback of the view-based approach

**Key content:**

- What changed (table → dynamic view) and why
- Three migration methods (Dashboard SQL, psql, Supabase CLI)
- Code changes made (removed upsert logic from API routes)
- Rollback instructions

---

## Cross-Reference Map

Shows which resources reference which, helping you understand the dependency chain.

```
CLAUDE.md (always loaded)
├── references → docs/AUTHORIZATION.md
├── references → docs/TOASTS.md
├── references → docs/THEMING.md
├── references → .claude/skills/typescript-conventions.md
└── references → supabase/migrations/

code-reviewer (agent)
├── pre-loads → typescript-conventions (skill)
├── references → CLAUDE.md (must read via tools)
├── references → docs/AUTHORIZATION.md (must read via tools)
└── references → docs/TOASTS.md (must read via tools)

code-improver (agent)
├── pre-loads → typescript-conventions (skill)
├── references → CLAUDE.md (must read via tools)
└── references → docs/AUTHORIZATION.md (must read via tools)

typescript-conventions (skill)
├── description always in main context
└── full content auto-invoked when writing TypeScript
```

---

## Quick Decision Guide

| I want to...                                              | Use                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Get a structured pass/fail code review                    | Spawn **code-reviewer** agent                                         |
| Get educational improvement suggestions with before/after | Spawn **code-improver** agent                                         |
| Ensure conventions while writing code                     | Handled automatically (CLAUDE.md + **typescript-conventions** skill)  |
| Add correct auth/middleware to a new API route            | Read **AUTHORIZATION.md**                                             |
| Add toast notifications to a feature                      | Read **TOASTS.md**                                                    |
| Change the app's color scheme                             | Read **THEMING.md**                                                   |
| Understand the rankings view migration                    | Read **MIGRATION_INSTRUCTIONS.md**                                    |
| Set up a fresh database                                   | Follow **CLAUDE.md** → Database section + `.claude/rules/database.md` |
| Write or review tests                                     | Follow **CLAUDE.md** → Testing section                                |
