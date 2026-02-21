# Git Hooks & Code Quality Automation

This project uses Husky with lint-staged and Prettier to enforce code quality automatically.

## Pre-commit Checks (runs on every commit)

**Automated via lint-staged:**

- Prettier formatting (auto-formats all staged files)
- ESLint validation (auto-fixes when possible)

**What gets formatted:**

- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
- JSON, CSS, Markdown files

**Performance:** ~2-4 seconds per commit (only checks staged files)

## Pre-push Checks (runs before pushing to remote)

- TypeScript type checking (`tsc --noEmit`)
- Full production build (`npm run build`)

**Performance:** ~20-30 seconds per push

## Manual Commands

```bash
# Format entire project
npm run format

# Check if files are formatted (no changes)
npm run format:check

# Fix all ESLint errors
npm run lint:fix

# Type check without building
npm run type-check
```

## Prettier Configuration

Located in `.prettierrc`:

- 2-space indentation
- Semicolons required
- Double quotes for consistency with JSX
- 100-character line width
- Auto line endings (handles Windows/Unix)

## Bypassing Hooks (Emergency Only)

**When to use:** Critical hotfixes, WIP commits that need to be saved urgently

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency: bypass hooks"

# Skip pre-push hooks
git push --no-verify
```

**Important:** Use sparingly! Bypassed commits can break CI/CD or introduce linting errors.

## Troubleshooting

**Hooks not running:**

```bash
# Verify git hooks path
git config core.hooksPath  # Should output: .husky/_

# Reinstall hooks
npx husky install
```

**Formatting conflicts:**

```bash
# Format your local files
npm run format

# Check what's different
git diff
```

**Slow commits (rare):**

- Check how many files are staged: `git diff --cached --name-only`
- If formatting many files at once, consider committing in smaller batches
- Typical commit times: 2-4 seconds

**Pre-push taking too long:**

- Type checking and builds are comprehensive (20-30s is normal)
- Consider if you can break commits into smaller logical units
- Use `--no-verify` only for urgent hotfixes
