# Accessibility (WCAG 2.1 AA)

All UI code must meet WCAG 2.1 AA. The accessibility audit (issues #48–#51) identified four recurring failure categories. Avoid reintroducing them.

---

## 1. Landmark Elements & Page Structure

Every page must have exactly one `<main>` landmark. Use semantic HTML over `<div>` wrappers.

```tsx
// ✅ Correct — app/(app)/layout.tsx or page wrapper
<header>…</header>
<main id="main-content">
  {children}
</main>
<footer>…</footer>

// ❌ Wrong — bare div wrappers
<div>{children}</div>
```

### Skip-to-content link

Every layout that renders a nav must include a skip link as the **first child of `<body>`**:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded focus:shadow"
>
  Skip to main content
</a>
```

---

## 2. Interactive Elements Must Have Accessible Names

Every `<button>`, `<a>`, and interactive Radix trigger **must** have a visible label or `aria-label` / `aria-labelledby`.

### Icon-only buttons

```tsx
// ✅ Correct
<Button variant="ghost" size="icon" aria-label="Open navigation menu">
  <Menu className="h-5 w-5" aria-hidden="true" />
</Button>

// ❌ Wrong — no name, icon not hidden
<Button variant="ghost" size="icon">
  <Menu className="h-5 w-5" />
</Button>
```

### Radix `<Select>` / `SelectTrigger`

Radix `<Select>` renders a `role="combobox"` button. Without visible text it will fail the `button-name` axe rule (critical, WCAG 4.1.2). Always pass `aria-label` or wrap in a `<label>`:

```tsx
// ✅ Option A — aria-label on the trigger
<Select>
  <SelectTrigger aria-label="Select tournament status">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  …
</Select>

// ✅ Option B — associate a visible <label> with htmlFor + id
<label htmlFor="status-select">Status</label>
<Select>
  <SelectTrigger id="status-select">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  …
</Select>
```

### Avatar / user menu triggers

```tsx
// ✅
<DropdownMenuTrigger asChild>
  <Button variant="ghost" size="icon" aria-label={`${userName}'s account menu`}>
    <Avatar>…</Avatar>
  </Button>
</DropdownMenuTrigger>
```

---

## 3. Form Labels

Every form input must have an associated label. Never rely on `placeholder` as a substitute.

```tsx
// ✅ Visible label
<label htmlFor="home-score">Home score</label>
<Input id="home-score" type="number" … />

// ✅ aria-label when a visible label isn't appropriate
<Input
  type="number"
  aria-label={`${homeTeam.name} predicted score`}
  …
/>

// ❌ Placeholder only — not accessible
<Input type="number" placeholder="0" />
```

---

## 4. Semantic HTML for Data

Use `<table>` for tabular data (rankings, standings, stats). Do not use div grids for data that has row/column relationships.

```tsx
// ✅
<table>
  <thead>
    <tr>
      <th scope="col">Rank</th>
      <th scope="col">Player</th>
      <th scope="col">Points</th>
    </tr>
  </thead>
  <tbody>
    {rankings.map((r) => (
      <tr key={r.user_id}>
        <td>{r.rank}</td>
        <td>{r.screen_name}</td>
        <td>{r.total_points}</td>
      </tr>
    ))}
  </tbody>
</table>

// ❌ Div grid — not exposed as a table to screen readers
<div className="grid grid-cols-3">…</div>
```

---

## 5. ARIA Live Regions for Errors & Status

Error messages and async status updates must be announced to screen readers.

```tsx
// ✅ Form error — role="alert" triggers immediate announcement
{
  error && (
    <div role="alert" className="text-destructive text-sm">
      {error}
    </div>
  );
}

// ✅ Non-urgent status (e.g., loading complete) — use aria-live="polite"
<div aria-live="polite" aria-atomic="true">
  {status}
</div>;

// ❌ Silent error — screen readers won't announce this
{
  error && <div className="text-destructive text-sm">{error}</div>;
}
```

---

## 6. Decorative Icons

Icons that are purely decorative must be hidden from the accessibility tree. Icons that convey meaning must have a label.

```tsx
// ✅ Decorative icon (accompanies visible text)
<Fingerprint className="h-5 w-5" aria-hidden="true" />

// ✅ Meaningful icon (no accompanying text)
<Star className="h-5 w-5" aria-label="Favorited" />

// ❌ Decorative icon without aria-hidden — pollutes the a11y tree
<Fingerprint className="h-5 w-5" />
```

---

## 7. Focus Management

When UI elements open/close (modals, drawers, mobile nav), focus must be managed correctly.

- **On open**: move focus to the first interactive element inside the opened element, or to the container with `autoFocus`.
- **On close**: return focus to the trigger that opened the element.

Radix `<Dialog>` and `<Sheet>` handle this automatically. For custom implementations:

```tsx
// Return focus to trigger on close
const triggerRef = useRef<HTMLButtonElement>(null);

function handleClose() {
  setOpen(false);
  triggerRef.current?.focus();
}

<Button ref={triggerRef} onClick={() => setOpen(true)}>
  Open menu
</Button>;
```

---

## 8. Color Contrast

All text must meet WCAG AA contrast ratios: **4.5:1** for normal text, **3:1** for large text (18pt+ or 14pt+ bold).

- Always verify new color combinations in both light **and dark** modes using a contrast checker before finalizing.
- Avoid placing `--primary` (blue) text or icons directly on `--primary` backgrounds.
- Do not use color alone to convey meaning (add icons, labels, or patterns alongside color).
- The shadcn/ui design tokens in `globals.css` are the source of truth — if a new color is needed, define it there as a CSS variable in both `:root` and `.dark`, not as a raw Tailwind value.

---

## 9. Reduced Motion

Respect the user's operating system motion preference. Wrap CSS animations with a `prefers-reduced-motion` media query.

```css
/* ✅ In globals.css — wrap all animate-* utilities */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

For JS-driven animations (e.g., Framer Motion), read the preference:

```tsx
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

---

## Quick Checklist (use during code review)

| #   | Check                                                            |
| --- | ---------------------------------------------------------------- |
| 1   | Page has `<main id="main-content">` and a skip link              |
| 2   | All `<button>` and link elements have an accessible name         |
| 3   | Radix `<SelectTrigger>` has `aria-label` or associated `<label>` |
| 4   | All form inputs have a `<label>` or `aria-label`                 |
| 5   | Tabular data uses `<table>` with `<th scope>`                    |
| 6   | Error messages use `role="alert"`                                |
| 7   | Decorative icons have `aria-hidden="true"`                       |
| 8   | Modal/drawer close returns focus to the trigger                  |
| 9   | Text contrast checked in both light and dark mode                |
| 10  | New animations respect `prefers-reduced-motion`                  |
