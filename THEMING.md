# Theming Guide

This project uses a flexible CSS variable-based theming system that makes it easy to update the entire color scheme.

## Current Color Palette: Blue Lagoon

**Source**: [Coolors - Blue Lagoon](https://coolors.co/palette/00a6fb-0582ca-006494-003554-051923)

### Palette Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Vivid Cerulean | `#00A6FB` | Accent colors, highlights, active states |
| Honolulu Blue | `#0582CA` | Primary buttons, links, main brand color |
| Sea Blue | `#006494` | Muted text, secondary elements |
| Prussian Blue | `#003554` | Dark mode cards, secondary backgrounds |
| Rich Black | `#051923` | Text color, dark mode background |

## How to Change the Color Scheme

### Quick Method: Update a Single File

All colors are defined in `app/globals.css`. To change the entire color scheme:

1. **Open** `app/globals.css`
2. **Update** the HSL values in the `:root` section (light mode)
3. **Update** the HSL values in the `.dark` section (dark mode)
4. **Save** and the entire app updates automatically!

### Example: Switching to a New Palette

Let's say you found a new palette on [Coolors.co](https://coolors.co):

```
https://coolors.co/palette/ff6b6b-4ecdc4-45b7d1-f7fff7-1a535c
```

#### Step 1: Convert HEX to HSL

Use a tool like [Coolors HSL Converter](https://coolors.co/gradient-maker) or any online converter.

Example conversions:
- `#FF6B6B` → `hsl(0, 100%, 71%)`
- `#4ECDC4` → `hsl(174, 63%, 56%)`
- `#45B7D1` → `hsl(194, 61%, 55%)`
- `#F7FFF7` → `hsl(120, 100%, 98%)`
- `#1A535C` → `hsl(188, 56%, 22%)`

#### Step 2: Update globals.css

```css
:root {
  /* Update these HSL values */
  --primary: 194 61% 55%;        /* #45B7D1 - Your main brand color */
  --accent: 174 63% 56%;         /* #4ECDC4 - Accent/highlights */
  --foreground: 188 56% 22%;     /* #1A535C - Text color */
  /* ... update other variables as needed */
}
```

#### Step 3: Update the Documentation

Update the color reference comment at the top of `globals.css` and this file with your new palette info.

## Color Variable Reference

### Semantic Color Tokens

These are the main colors you'll update when changing themes:

| Variable | Purpose | Example Usage |
|----------|---------|---------------|
| `--primary` | Main brand color | Buttons, links, primary actions |
| `--secondary` | Secondary actions | Secondary buttons, less prominent UI |
| `--accent` | Highlights & emphasis | Hover states, active items, badges |
| `--muted` | Background variations | Cards, sidebars, subtle backgrounds |
| `--foreground` | Main text color | Body text, headings |
| `--background` | Page background | App background |
| `--border` | Borders & dividers | Card borders, separators |
| `--destructive` | Errors & warnings | Delete buttons, error messages |

### How Colors are Applied

The system uses CSS variables that automatically apply to Tailwind utility classes:

```jsx
// These automatically use your theme colors:
<Button className="bg-primary text-primary-foreground">
  Uses --primary color
</Button>

<div className="bg-accent text-accent-foreground">
  Uses --accent color
</div>

<Card className="border-border bg-card">
  Uses --border and --card colors
</Card>
```

## Dark Mode

Dark mode colors are automatically applied when the `dark` class is added to the `<html>` element.

To toggle dark mode programmatically:

```javascript
// Enable dark mode
document.documentElement.classList.add('dark');

// Disable dark mode
document.documentElement.classList.remove('dark');
```

## Tips for Choosing a Color Scheme

1. **Contrast**: Ensure sufficient contrast between text and background (WCAG AA standard: 4.5:1)
2. **Consistency**: Use 3-5 main colors to keep the UI cohesive
3. **Test Both Modes**: Always check your colors in both light and dark mode
4. **Use Coolors**: Great for finding and generating color palettes
5. **Accessibility**: Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Color Palette Resources

- [Coolors.co](https://coolors.co) - Generate and browse color palettes
- [Adobe Color](https://color.adobe.com) - Create color schemes
- [Realtime Colors](https://realtimecolors.com) - Preview colors on a live site
- [Paletton](https://paletton.com) - Color scheme designer
- [Tailwind Color Generator](https://uicolors.app/create) - Generate Tailwind-compatible palettes

## Extending the Theme

### Adding Custom Colors

If you need additional custom colors beyond the semantic tokens:

```css
/* In app/globals.css */
:root {
  --success: 142 71% 45%;  /* Green for success states */
  --warning: 38 92% 50%;   /* Orange for warnings */
  --info: 199 89% 48%;     /* Blue for info messages */
}
```

Then use them in your components:

```jsx
<div className="bg-[hsl(var(--success))]">Success!</div>
```

Or add them to `tailwind.config.ts`:

```typescript
// tailwind.config.ts
colors: {
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
}
```

Then use as normal Tailwind classes:

```jsx
<div className="bg-success text-white">Success!</div>
```

## Troubleshooting

**Colors not updating?**
- Clear your browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Restart your development server (`npm run dev`)
- Check for typos in HSL values (should be format: `H S% L%`)

**Colors look wrong?**
- Verify HSL conversion is correct
- Check that you updated both `:root` and `.dark` sections
- Ensure values don't have extra characters (like `deg` or `%` in wrong places)

**Want to preview before committing?**
- Use browser DevTools to temporarily edit CSS variables
- Test with `document.documentElement.style.setProperty('--primary', '200 100% 49%')`
