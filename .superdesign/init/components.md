# Shared UI components

The viewer is a vanilla HTML/CSS/JavaScript application. It has no component framework or shared component directory. Reusable patterns are CSS classes rendered by `twx-viewer-new.js`.

## Button pattern

Source: `twx-viewer-new.css`

```css
.btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:32px; padding:0 12px; border:0; border-radius:4px; font-family:var(--font-sans); font-size:13px; font-weight:500; cursor:pointer; }
.btn-primary { background:var(--accent); color:#fff; }
.btn-secondary { background:var(--hover-bg); color:var(--text-secondary); border:1px solid var(--border); }
```

## Card pattern

Source: `twx-viewer-new.css`

```css
.card { background:var(--bg-card); border:1px solid var(--border); border-radius:6px; }
.card-header { min-height:48px; padding:0 20px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
.card-title { font-size:13px; font-weight:600; color:var(--text-primary); }
```
