# Theming Guide

CSS variable-based theming system. All colors defined in one file: `app/globals.css`.

## Current Palette: Blue Lagoon

Source: [Coolors](https://coolors.co/palette/00a6fb-0582ca-006494-003554-051923)

| Color          | Hex       | Usage                                  |
| -------------- | --------- | -------------------------------------- |
| Vivid Cerulean | `#00A6FB` | Accents, highlights, active states     |
| Honolulu Blue  | `#0582CA` | Primary buttons, links, brand color    |
| Sea Blue       | `#006494` | Muted text, secondary elements         |
| Prussian Blue  | `#003554` | Dark mode cards, secondary backgrounds |
| Rich Black     | `#051923` | Text color, dark mode background       |

## Changing Colors

1. Open `app/globals.css`
2. Update HSL values in `:root` (light mode) and `.dark` (dark mode)
3. Save — the entire app updates automatically

To convert HEX to HSL, use any online converter. Format: `H S% L%` (no `deg` or extra `%`).

## Color Variable Reference

| Variable        | Purpose            | Example                        |
| --------------- | ------------------ | ------------------------------ |
| `--primary`     | Brand color        | Buttons, links                 |
| `--secondary`   | Secondary actions  | Secondary buttons              |
| `--accent`      | Highlights         | Hover states, badges           |
| `--muted`       | Subtle backgrounds | Cards, sidebars                |
| `--foreground`  | Text color         | Body text, headings            |
| `--background`  | Page background    | App background                 |
| `--border`      | Borders            | Card borders, separators       |
| `--destructive` | Errors             | Delete buttons, error messages |

Colors map to Tailwind classes automatically: `bg-primary`, `text-foreground`, `border-border`, etc.

## Dark Mode

Applied via `dark` class on `<html>`. Toggle: `document.documentElement.classList.toggle('dark')`.

## Adding Custom Colors

```css
/* In app/globals.css */
:root {
  --success: 142 71% 45%;
}
```

Use directly: `bg-[hsl(var(--success))]`, or add to `tailwind.config.ts` for `bg-success`.

## Troubleshooting

- **Colors not updating**: Clear cache, restart dev server, check HSL format
- **Colors look wrong**: Verify conversion, check both `:root` and `.dark` sections
- **Preview before committing**: Use DevTools: `document.documentElement.style.setProperty('--primary', '200 100% 49%')`
