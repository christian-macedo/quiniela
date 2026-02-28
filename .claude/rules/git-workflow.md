# Git Hooks & Code Quality Automation

Husky + lint-staged + Prettier enforce code quality automatically.

## Pre-commit (every commit, ~2-4s)

- Prettier formatting on staged files
- ESLint validation (auto-fixes when possible)
- Formats: `.ts`, `.tsx`, `.js`, `.jsx`, JSON, CSS, Markdown

## Pre-push (before push, ~20-30s)

- TypeScript type checking (`tsc --noEmit`)
- Full production build (`npm run build`)

## Branch Naming Convention

`<user>/<description>` — e.g., `iakor/34-admin-authorization`

Use kebab-case for the description. Include the issue number as a prefix when the branch addresses a specific GitHub issue.

## Manual Commands

```bash
npm run format        # Format entire project
npm run format:check  # Check formatting (no changes)
npm run lint:fix      # Fix all ESLint errors
npm run type-check    # Type check without building
```

## Prettier Config (`.prettierrc`)

2-space indent, semicolons, double quotes, 100-char width, auto line endings.

## Bypassing Hooks (Emergency Only)

```bash
git commit --no-verify -m "emergency: bypass hooks"
git push --no-verify
```

Use sparingly — bypassed commits can break CI/CD.

## Troubleshooting

- **Hooks not running**: Verify `git config core.hooksPath` outputs `.husky/_`. Reinstall: `npx husky install`
- **Formatting conflicts**: Run `npm run format` then check `git diff`
- **Slow commits**: Check staged file count with `git diff --cached --name-only`; commit in smaller batches
- **Pre-push slow**: 20-30s is normal for type check + build
