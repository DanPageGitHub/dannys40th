/**
 * Capture hero above-the-fold at each breakpoint for visual QA.
 * Usage: npm run serve (in one terminal), then npm run hero-screenshots.
 * Saves to screenshots/hero-{width}.png — check badge/subtitle stay one line, all hero above fold.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = path.join(__dirname, '..', 'screenshots');

// Widths matching CSS breakpoints; height = 16:10 so "above the fold" is consistent
const VIEWPORTS = [
  { w: 500, h: 313 },
  { w: 600, h: 375 },
  { w: 768, h: 480 },
  { w: 900, h: 563 },
  { w: 1024, h: 640 },
  { w: 1200, h: 750 },
  { w: 1400, h: 875 },
  { w: 1600, h: 1000 },
  { w: 1920, h: 1200 },
  { w: 2560, h: 1600 },
  { w: 3840, h: 2160 }, // 4K reference
];

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const { w, h } of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(600);
    const file = path.join(OUT_DIR, `hero-${w}.png`);
    await page.screenshot({ path: file, fullPage: false });
    await page.close();
    console.log(`Saved ${file}`);
  }

  await context.close();
  await browser.close();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
