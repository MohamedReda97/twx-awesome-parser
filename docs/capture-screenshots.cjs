// Capture screenshots of the running app for visual verification (v2 — 3-pane layouts).
// Temporary tool, not part of the application. Safe to delete after use.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs', 'screenshots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = 'C:/Users/Admin/AppData/Local/ms-playwright/chromium-1140/chrome-win/chrome.exe';

function waitFor(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let server = null;
  let browser = null;
  try {
    // 1. Start the server
    console.log('[1] Starting server...');
    server = spawn('node', ['app.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let port = null;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server start timeout')), 15000);
      server.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[server] ${text}`);
        const m = text.match(/Server running at http:\/\/localhost:(\d+)/);
        if (m) { port = m[1]; clearTimeout(timer); resolve(); }
      });
      server.stderr.on('data', (data) => process.stderr.write(`[server err] ${data}`));
    });
    console.log(`Server on port ${port}`);
    const url = `http://localhost:${port}`;

    // 2. Launch the browser
    console.log('[2] Launching Chromium...');
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));

    // 3. Navigate and wait for the app shell
    console.log('[3] Loading app...');
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.nav-item', { timeout: 15000 });
    await waitFor(4000); // data load

    async function shot(name) {
      const f = path.join(SHOTS, `${name}.png`);
      await page.screenshot({ path: f, fullPage: false });
      console.log(`  saved ${f}`);
    }

    // 4. Summary
    console.log('[4] Summary...');
    await page.click('text=Summary').catch(() => {});
    await waitFor(800);
    await shot('v2-01-summary');

    // 5. By Type — all collapsed (per user)
    console.log('[5] By Type (all collapsed)...');
    await page.click('text=By Type');
    await waitFor(800);
    await shot('v2-02-by-type-collapsed');

    // 6. By Type — Coach Views expanded (accordion)
    console.log('[6] By Type (Coach Views expanded)...');
    await page.click('text=Coach Views');
    await waitFor(800);
    await shot('v2-03-by-type-accordion');

    // 7. By Type — item selected, Section 3 shows details
    console.log('[7] By Type (item selected, Section 3)...');
    const byTypeItem = page.locator('.accordion-item-row').first();
    if (await byTypeItem.count() > 0) {
      await byTypeItem.click();
      await waitFor(1200);
      await shot('v2-04-by-type-section3');
    } else {
      console.warn('  no accordion item found');
    }

    // 8. By Type — Variables sub-tab in Section 3
    console.log('[8] By Type (Section 3, Variables sub-tab)...');
    const varsTab = page.locator('.section-3-subnav-btn:has-text("Variables")').first();
    if (await varsTab.count() > 0) {
      await varsTab.click();
      await waitFor(800);
      await shot('v2-05-by-type-variables');
    }

    // 9. Toolkits — default (toolkits list expanded, per user)
    console.log('[9] Toolkits (default, toolkits expanded)...');
    await page.click('text=Toolkits');
    await waitFor(800);
    await shot('v2-06-toolkits-default');

    // 10. Toolkits — clicked a toolkit, shows types
    console.log('[10] Toolkits (toolkit selected, types list)...');
    const toolkitRow = page.locator('.toolkit-row').first();
    if (await toolkitRow.count() > 0) {
      await toolkitRow.click();
      await waitFor(800);
      await shot('v2-07-toolkits-types');

      // 11. Toolkits — clicked a type, shows items
      console.log('[11] Toolkits (type expanded, items)...');
      const typeRow = page.locator('.toolkit-type-row').first();
      if (await typeRow.count() > 0) {
        await typeRow.click();
        await waitFor(800);
        await shot('v2-08-toolkits-items');
      }

      // 12. Toolkits — clicked an item, Section 3 shows details
      console.log('[12] Toolkits (item selected, Section 3)...');
      const tkItem = page.locator('.toolkit-item-row').first();
      if (await tkItem.count() > 0) {
        await tkItem.click();
        await waitFor(1200);
        await shot('v2-09-toolkits-section3');
      }
    } else {
      console.warn('  no toolkit row found');
    }

    // 13. Dependencies
    console.log('[13] Dependencies...');
    await page.click('text=Dependencies');
    await waitFor(1200);
    await shot('v2-10-dependencies');

    // 14. Search tab
    console.log('[14] Search...');
    await page.click('text=Search');
    await waitFor(800);
    await shot('v2-11-search');

    // 15. Settings
    console.log('[15] Settings...');
    await page.click('text=Settings');
    await waitFor(800);
    await shot('v2-12-settings');

    console.log('Done. Screenshots in', SHOTS);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { server.kill(); await waitFor(500); }
  }
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
