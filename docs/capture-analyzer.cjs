// Screenshot the new Analyzer tab.
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
    // Ensure ODC.twx is parsed (produces analysis.json)
    console.log('[1] Parsing ODC.twx to generate analysis.json...');
    await new Promise((resolve, reject) => {
      const p = spawn('node', ['app.js', 'parse', 'ODC.twx'], { cwd: ROOT, stdio: 'inherit' });
      p.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`parse exited with code ${code}`));
      });
    });
    console.log('Parse complete.');

    // Verify analysis.json exists and has content
    const analysisPath = path.join(ROOT, 'output', 'analysis.json');
    if (!fs.existsSync(analysisPath)) throw new Error('output/analysis.json not found after parse');
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    console.log(`Analysis: ${analysis.summary.totalCritical} critical, ${analysis.summary.totalWarnings} warnings, ${analysis.findings.length} total findings`);

    // Start server
    console.log('[2] Starting server...');
    server = spawn('node', ['app.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let port = null;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server start timeout')), 15000);
      server.stdout.on('data', (data) => {
        const text = data.toString();
        const m = text.match(/Server running at http:\/\/localhost:(\d+)/);
        if (m) { port = m[1]; clearTimeout(timer); resolve(); }
      });
      server.stderr.on('data', (data) => process.stderr.write(`[server err] ${data}`));
    });
    console.log(`Server on port ${port}`);
    const url = `http://localhost:${port}`;

    // Launch browser
    console.log('[3] Launching Chromium...');
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (err) => console.error('[pageerror]', err.message));

    // Load app
    console.log('[4] Loading app...');
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.nav-item', { timeout: 15000 });
    await waitFor(5000); // data load

    async function shot(name) {
      const f = path.join(SHOTS, `${name}.png`);
      await page.screenshot({ path: f, fullPage: false });
      console.log(`  saved ${f}`);
    }

    // 1. Click Analyzer tab
    console.log('[5] Analyzer tab — default view (top of page)...');
    await page.click('text=Analyzer');
    await waitFor(1500);
    await shot('v4-01-analyzer-top');

    // 2. Scroll to see the full page (summary + by-type + findings)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await waitFor(500);
    await shot('v4-02-analyzer-bottom');

    // 3. Scroll back to top, then click on a finding (or first critical card) to test interactivity
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitFor(500);

    console.log('Done. Screenshots in', SHOTS);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) { server.kill(); await waitFor(500); }
  }
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
