// Screenshot the NEW views from the approved design (BPD elements, CSHS pre/post, Service elements, Coach View scripts).
// Runs against the example TWX parsed into output/.
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

    console.log('[2] Launching Chromium...');
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    console.log('[3] Loading app...');
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.nav-item', { timeout: 15000 });
    await waitFor(5000); // data load

    async function shot(name) {
      const f = path.join(SHOTS, `${name}.png`);
      await page.screenshot({ path: f, fullPage: false });
      console.log(`  saved ${f}`);
    }

    // Navigate to By Type
    await page.click('text=By Type');
    await waitFor(800);

    // 1. BPD — expand "Business Process Definition", click OrderDetails
    console.log('[4] BPD Elements (OrderDetails)...');
    await page.click('text=Business Process Definition');
    await waitFor(800);
    await shot('v3-01-bpd-type-expanded');
    const bpdItem = page.locator('.accordion-item-row').first();
    if (await bpdItem.count() > 0) {
      await bpdItem.click();
      await waitFor(1200);
      await shot('v3-02-bpd-section3');
      // Click Elements sub-tab
      const elementsTab = page.locator('.section-3-subnav-btn:has-text("Elements")').first();
      if (await elementsTab.count() > 0) {
        await elementsTab.click();
        await waitFor(800);
        await shot('v3-03-bpd-elements');
      }
    }

    // Close drawer, collapse BPD, expand CSHS
    const closeBtn = page.locator('.section-3-close').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await waitFor(500);

    // 2. CSHS — expand "CSHS", click OrderDetailsCSHS
    console.log('[5] CSHS Elements (OrderDetailsCSHS)...');
    await page.click('text=CSHS');
    await waitFor(800);
    await shot('v3-04-cshs-type-expanded');
    const cshsItem = page.locator('.accordion-item-row').first();
    if (await cshsItem.count() > 0) {
      await cshsItem.click();
      await waitFor(1200);
      await shot('v3-05-cshs-section3');
      const elementsTab = page.locator('.section-3-subnav-btn:has-text("Elements")').first();
      if (await elementsTab.count() > 0) {
        await elementsTab.click();
        await waitFor(800);
        await shot('v3-06-cshs-elements');
      }
    }

    // Close drawer, collapse CSHS
    const closeBtn2 = page.locator('.section-3-close').first();
    if (await closeBtn2.count() > 0) await closeBtn2.click();
    await waitFor(500);

    // 3. Service — expand "Service", click Deployment Service Flow
    console.log('[6] Service Elements (Deployment Service Flow)...');
    await page.click('text=Service');
    await waitFor(800);
    const svcItem = page.locator('.accordion-item-row').first();
    if (await svcItem.count() > 0) {
      await svcItem.click();
      await waitFor(1200);
      await shot('v3-07-service-section3');
      const elementsTab = page.locator('.section-3-subnav-btn:has-text("Elements")').first();
      if (await elementsTab.count() > 0) {
        await elementsTab.click();
        await waitFor(800);
        await shot('v3-08-service-elements');
      }
    }

    // Close drawer
    const closeBtn3 = page.locator('.section-3-close').first();
    if (await closeBtn3.count() > 0) await closeBtn3.click();
    await waitFor(500);

    // 4. Coach View — expand "Coach View", click orderDetailsView
    console.log('[7] Coach View Scripts (orderDetailsView)...');
    await page.click('text=Coach View');
    await waitFor(800);
    const cvItem = page.locator('.accordion-item-row').first();
    if (await cvItem.count() > 0) {
      await cvItem.click();
      await waitFor(1200);
      await shot('v3-09-coachview-section3');
      const scriptsTab = page.locator('.section-3-subnav-btn:has-text("Scripts")').first();
      if (await scriptsTab.count() > 0) {
        await scriptsTab.click();
        await waitFor(800);
        await shot('v3-10-coachview-scripts');
      }
    }

    console.log('Done. Screenshots in', SHOTS);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { server.kill(); await waitFor(500); }
  }
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
