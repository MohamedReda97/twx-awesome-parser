# Theme

## Compact token summary

- UI: restrained technical application, light mode, Inter sans-serif and system monospace
- Page/card: `#ffffff`; sidebar: `#f8fafc`
- Text: primary `#0f172a`, secondary `#64748b`, tertiary `#94a3b8`
- Borders: `#e2e8f0`; hover surface: `#f1f5f9`
- Accent: indigo `#4f46e5`
- Critical: `#dc2626` on `#fef2f2`
- Warning: `#854d0e` on `#fef9c3`
- Success: `#166534` on `#dcfce7`
- Corners: 4px controls, 6px cards
- Motion: short 120–180ms functional transitions

## Raw token source

Source: `twx-viewer-new.css`

```css
:root {
  --bg-page: #ffffff;
  --bg-sidebar: #f8fafc;
  --bg-card: #ffffff;
  --border: #e2e8f0;
  --border-hover: #cbd5e1;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --accent: #4f46e5;
  --hover-bg: #f1f5f9;
  --active-bg: #f1f5f9;
  --row-hover: #f8fafc;
  --divider: #f1f5f9;
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", Menlo, monospace;
  --error: #dc2626;
  --error-bg: #fef2f2;
  --error-border: #fecaca;
  --success: #22c55e;
  --success-bg: #dcfce7;
  --success-text: #166534;
  --warning-bg: #fef9c3;
  --warning-text: #854d0e;
  --info-bg: #eef2ff;
  --cyan-bg: #ecfeff;
  --cyan-text: #155e75;
  --amber-bg: #fffbeb;
  --amber-text: #b45309;
}
```

The complete source remains in `twx-viewer-new.css`; pass its relevant ranges directly to design generation.
