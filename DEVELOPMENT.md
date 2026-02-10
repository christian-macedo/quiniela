# Development Best Practices

This document outlines the safeguards and best practices to prevent common development issues like JSON syntax errors, build failures, and TypeScript errors.

## Table of Contents

- [Automated Safeguards](#automated-safeguards)
- [Manual Verification](#manual-verification)
- [Editor Setup](#editor-setup)
- [Common Issues & Prevention](#common-issues--prevention)
- [Quick Reference](#quick-reference)

## Automated Safeguards

### Pre-commit Hooks (husky)

**Status**: ✅ **ACTIVE**

The project uses [husky](https://typicode.github.io/husky/) to automatically run checks before every commit. This prevents broken code from being committed.

#### What Gets Checked

When you run `git commit`, the following checks run automatically:

1. **JSON Validation** - Validates `messages/en.json` and `messages/es.json`
2. **Linting** - Runs ESLint to catch code quality issues
3. **Build** - Runs production build to catch TypeScript and import errors

#### How It Works

```bash
# When you commit...
git add .
git commit -m "feat: add new feature"

# Husky automatically runs:
# 🔍 Running pre-commit checks...
# ✓ messages/en.json is valid JSON
# ✓ messages/es.json is valid JSON
# 📝 Running linter...
# ✔ No ESLint warnings or errors
# 🔨 Running build...
# ✓ Compiled successfully
# ✅ All pre-commit checks passed!
```

**If any check fails, the commit is blocked.** Fix the errors and try again.

#### Bypassing Pre-commit Hooks (Not Recommended)

In rare cases where you need to bypass hooks (e.g., work-in-progress commits):

```bash
git commit --no-verify -m "wip: incomplete work"
```

⚠️ **Warning**: Only use `--no-verify` for WIP commits on feature branches. Never push broken code to main.

### Validation Scripts

#### `npm run validate:json`

Validates all translation files are valid JSON.

```bash
npm run validate:json

# Output:
# 🔍 Validating translation files...
# ✓ messages/en.json is valid JSON
# ✓ messages/es.json is valid JSON
# ✅ All translation files are valid
```

**When to run manually:**
- After editing translation files
- Before committing if you bypassed hooks
- During troubleshooting

#### `npm run precommit`

Runs all pre-commit checks manually without committing:

```bash
npm run precommit

# Equivalent to:
# npm run validate:json && npm run lint && npm run build
```

**When to use:**
- Before pushing to remote
- After making significant changes
- To verify everything passes before creating a PR

## Manual Verification

Even with automated checks, follow this workflow:

### Before Every Commit

```bash
# 1. Validate JSON (if you edited translations)
npm run validate:json

# 2. Run linter
npm run lint

# 3. Run build
npm run build

# 4. Stage changes
git add .

# 5. Commit (hooks will run automatically)
git commit -m "feat: description"
```

### Before Pushing

```bash
# Full verification
npm run precommit

# If all checks pass, push
git push
```

### Before Creating a Pull Request

```bash
# Ensure everything builds and passes
npm run validate:json
npm run lint
npm run build

# If using development server, restart it
# Ctrl+C to stop
npm run dev
```

## Editor Setup

### VSCode Configuration

Create or update `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.json": "jsonc"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Recommended VSCode Extensions

Install these extensions for real-time error detection:

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Shows TypeScript/JavaScript errors inline
   - Auto-fixes on save

2. **Error Lens** (`usernamehw.errorlens`)
   - Displays errors inline (very visible)
   - Prevents committing broken code

3. **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`)
   - Makes TypeScript errors easier to understand

4. **JSON Language Features** (built-in)
   - Validates JSON syntax in real-time
   - Shows errors immediately

### Install Extensions

```bash
# Install all recommended extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension usernamehw.errorlens
code --install-extension yoavbls.pretty-ts-errors
```

Or use the VSCode Extensions panel and search for each extension.

## Common Issues & Prevention

### Issue 1: JSON Syntax Errors

**Problem**: Missing commas, trailing commas, invalid syntax in translation files.

**Prevention**:
- ✅ Use VSCode's built-in JSON validation (shows red squiggles)
- ✅ Pre-commit hook validates JSON before allowing commit
- ✅ Run `npm run validate:json` after editing translations

**Example**:
```json
// ❌ BAD - Missing comma
{
  "key1": "value1"
  "key2": "value2"
}

// ✅ GOOD
{
  "key1": "value1",
  "key2": "value2"
}
```

### Issue 2: TypeScript Type Errors

**Problem**: Calling functions with wrong number/types of arguments.

**Prevention**:
- ✅ VSCode shows type errors in real-time (red squiggles)
- ✅ `npm run build` catches all type errors before commit
- ✅ Pre-commit hook blocks commits with type errors

**Example**:
```typescript
// ❌ BAD - toast.success() only takes 1 argument
toast.success('message.key', { extra: 'param' });

// ✅ GOOD
toast.success('message.key');
```

### Issue 3: Missing Dependencies

**Problem**: Importing packages that aren't installed in package.json.

**Prevention**:
- ✅ `npm run build` fails if imports are unresolved
- ✅ Always run `npm install package-name` before using imports
- ✅ Pre-commit hook catches missing dependencies

**Example**:
```bash
# Install before importing
npm install some-package

# Then import in code
import { something } from 'some-package';
```

### Issue 4: Unused Variables/Imports

**Problem**: Declaring variables or importing modules that aren't used.

**Prevention**:
- ✅ ESLint shows warnings for unused variables
- ✅ VSCode dims unused variables (gray text)
- ✅ `npm run lint` fails if there are unused variables

**Fix**:
```typescript
// ❌ BAD - userName is never used
const userName = user.name;
const userId = user.id;
console.log(userId);

// ✅ GOOD - Only declare what you use
const userId = user.id;
console.log(userId);
```

### Issue 5: Translation Key Structure Changes

**Problem**: Moving translation keys to different nested levels breaks existing code.

**Prevention**:
- ✅ Keep translation structure consistent
- ✅ Document structure in TOASTS.md
- ✅ Search codebase before moving keys: `grep -r "old.key.path"`

**Example**:
```typescript
// If translations changed from:
// admin.messages.success.adminGranted
// To:
// admin.success.adminGranted

// Update the useFeatureToast call
const toast = useFeatureToast('admin');
toast.success('success.adminGranted'); // Not 'messages.success.adminGranted'
```

## Quick Reference

### Development Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run dev` | Start development server | Daily development |
| `npm run build` | Production build | Before committing |
| `npm run lint` | Check code quality | Before committing |
| `npm run validate:json` | Validate translation files | After editing JSON |
| `npm run precommit` | Run all checks manually | Before pushing |

### Git Workflow

```bash
# 1. Make changes to code
# 2. Validate manually (optional, hooks will run anyway)
npm run precommit

# 3. Stage changes
git add .

# 4. Commit (hooks run automatically)
git commit -m "type: description"

# 5. If hooks fail, fix errors and try again
# 6. Push to remote
git push
```

### Troubleshooting

#### Pre-commit hooks not running

```bash
# Reinstall husky
rm -rf .husky
npm run prepare
```

#### JSON validation fails

```bash
# Find the syntax error
npm run validate:json

# Fix the error in the file
# Re-run validation
npm run validate:json
```

#### Build fails locally

```bash
# Clean build artifacts
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

#### Bypass hooks for emergency commit

```bash
# Only use for WIP commits on feature branches
git commit --no-verify -m "wip: incomplete work"
```

## Summary

**The safeguards are now active!** Every commit automatically:

1. ✅ Validates JSON syntax
2. ✅ Runs linting checks
3. ✅ Verifies build succeeds

**You cannot commit broken code** unless you explicitly bypass with `--no-verify`.

**Best practice**: Let the hooks do their job. If a check fails, fix the issue rather than bypassing the hook.
