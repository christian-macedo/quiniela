# Supply-Chain & Dependency Security

This project enforces a three-layer dependency security model: local install hardening, a pre-push
audit gate, and a CI audit job. All three layers must remain consistent.

---

## Registry & Install Policy

All dependencies resolve exclusively from `https://registry.npmjs.org/`, enforced by `.npmrc`.

`ignore-scripts=true` is set globally in `.npmrc`. This is intentional and safe: Husky operates via
`git config core.hookspath` (set in `.git/config`) and does not use npm lifecycle scripts. Do not
add a `"prepare": "husky"` script to `package.json` — it is not needed and conflicts with this setting.

When installing new dependencies:

- Check the package's audit status after install: `npm audit --omit=dev`
- Never use `--ignore-scripts=false` unless you have reviewed the install scripts of the package
- Never use `npm install --force` or `npm install --legacy-peer-deps`

---

## Audit Thresholds

| Context             | Command                                       | Threshold | Scope        |
| ------------------- | --------------------------------------------- | --------- | ------------ |
| Pre-push hook       | `npm audit --omit=dev --audit-level=high`     | high+     | runtime deps |
| CI (GitHub Actions) | `npm audit --omit=dev --audit-level=moderate` | moderate+ | runtime deps |
| Daily check         | `npm run audit:deps`                          | high+     | runtime deps |
| Full sweep          | `npm run audit:deps:full`                     | moderate+ | runtime deps |

`--omit=dev` excludes dev tooling (Vite, Rollup, Playwright, etc.) from scope. Use `--production`
is deprecated in npm 11 — always use `--omit=dev` instead.

---

## Responding to Vulnerabilities

**Fix available (`npm audit fix`):** Run it. Commit the updated `package-lock.json` with the pattern:
`chore: npm audit fix — resolve N vulnerabilities (Month YYYY)`

**Breaking fix only (`npm audit fix --force`):** Do not run blindly. Read the changelog, check whether
the vulnerable code path is actually used in this project, then do a controlled upgrade:
`npm install <package>@<safe-version>` followed by `npm test` and `npm run type-check`.

**No fix available:** Open a GitHub issue to track resolution. If the vulnerability affects a runtime
code path, add a comment explaining the risk and the expected fix timeline.

---

## CI Behavior

The `.github/workflows/security.yml` workflow runs on every push to `main` and every PR targeting
`main`. Two independent jobs:

- **Dependency Audit**: `npm ci --ignore-scripts` → `npm audit --omit=dev --audit-level=moderate`
- **Type Check & Unit Tests**: `npm ci --ignore-scripts` → `npm run type-check` → `npm test`

Both jobs must pass before merging. The build step is excluded from CI — `NEXT_PUBLIC_*` vars are
baked in at Next.js build time and are not stored in GitHub secrets. The build is gated by the
pre-push hook on developer machines.

---

## What Claude Should and Should Not Do

**Do:**

- Run `npm run audit:deps` after any `npm install` or dependency update before committing
- Propose `npm audit fix` when vulnerabilities are reported
- Use `--omit=dev` (not `--production`) in all audit commands

**Do not:**

- Use `npm audit fix --force` in any automated hook or script
- Add `--ignore-scripts=false` to any install command without explicit user instruction
- Add a `"prepare": "husky"` script — Husky does not need it in this project
- Suggest Snyk, audit-ci, or third-party audit tools — this project uses only built-in npm tooling
- Use `--legacy-peer-deps` or `--force` flags on install commands
