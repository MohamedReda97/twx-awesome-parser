# Shared layout

The entire product shell is defined by `twx-viewer-new.html`; page bodies are injected into `#content` by `twx-viewer-new.js`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TWX Parser</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="twx-viewer-new.css">
</head>
<body>
  <div class="progress-bar" id="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
  <aside class="sidebar">
    <div class="sidebar-header"><span class="wordmark">T·W·X</span></div>
    <nav class="sidebar-nav" id="sidebar-nav"></nav>
  </aside>
  <div class="main-area">
    <header class="topbar">
      <div class="topbar-left">
        <span class="topbar-title" id="topbar-title">TWX Parser</span>
        <span class="topbar-subtitle" id="topbar-subtitle">Upload a .twx file to begin</span>
      </div>
      <div class="topbar-right">
        <input type="text" class="search-input" id="quick-search" placeholder="Search objects…" aria-label="Filter objects">
        <button class="icon-btn" id="topbar-settings-btn" aria-label="Settings"></button>
      </div>
    </header>
    <main class="content" id="content"></main>
  </div>
  <input type="file" id="twx-file-input" accept=".twx" style="display:none">
  <div class="drawer-overlay" id="drawer-overlay"></div>
  <div class="drawer" id="drawer">
    <div class="drawer-header"><div class="drawer-header-info"><div class="drawer-header-name" id="drawer-name"></div><div class="drawer-header-meta" id="drawer-meta"></div></div><button class="drawer-close" id="drawer-close" aria-label="Close"></button></div>
    <div class="drawer-subnav" id="drawer-subnav"></div>
    <div class="drawer-body" id="drawer-body"></div>
  </div>
  <script src="twx-viewer-new.js"></script>
</body>
</html>
```
