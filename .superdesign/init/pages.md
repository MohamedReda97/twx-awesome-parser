# Page dependency trees

## `/` — TWX viewer

Entry: `twx-viewer-new.html`

- `twx-viewer-new.html`
  - `twx-viewer-new.css`
  - `twx-viewer-new.js`
    - JSON endpoints served by `src/server/web-server.js`

## `/presentation` — requested technical walkthrough

New target. It should reuse the visual tokens from `twx-viewer-new.css` while remaining independent of the product shell.
