/**
 * Hero check vs reference image: 2K = exact match; other viewports as close as possible.
 * Validates: what's visible (all hero content fully in view), line counts (badge 1, subtitle 1,
 * venue ≤2, CTA 1), wheel (.hero-sun) centered and in view. Nav bar can wrap (ignored).
 * Run with server up: npm run serve, then npm run hero-check.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = path.join(__dirname, '..', 'screenshots');
const RESULTS_FILE = path.join(__dirname, 'hero-check-results.json');

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

async function checkHero(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const fullyInView = (rect, vw, vh) => rect.top >= 0 && rect.bottom <= vh && rect.left >= 0 && rect.right <= vw;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nav = document.querySelector('nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const navBottom = navRect ? navRect.bottom : 0;
    const badge = document.querySelector('.hero-content .badge');
    const h1 = document.querySelector('.hero-content h1');
    const titleHand = document.querySelector('.hero-content .title-hand');
    const venue = document.querySelector('.hero-content .hero-venue');
    const cta = document.querySelector('.hero-cta');
    const wheel = document.querySelector('.hero-sun');

    const getRect = (el) => (el ? el.getBoundingClientRect() : null);
    const getLines = (el) => (el ? el.getClientRects().length : 0);

    const badgeRect = getRect(badge);
    const h1Rect = getRect(h1);
    const titleHandRect = getRect(titleHand);
    const venueRect = getRect(venue);
    const ctaRect = getRect(cta);
    const wheelRect = getRect(wheel);

    // Badge visibility: the entire date bar (sun, text, moon, box) must be fully in the viewport
    // and sit below the fixed nav, so it can't be hidden behind it.
    const badgeVisible = badgeRect && fullyInView(badgeRect, vw, vh) && badgeRect.top >= navBottom;
    const h1Visible = h1Rect && fullyInView(h1Rect, vw, vh);
    const subtitleVisible = titleHandRect && fullyInView(titleHandRect, vw, vh);
    const venueVisible = venueRect && fullyInView(venueRect, vw, vh);
    const ctaVisible = ctaRect && ctaRect.bottom <= vh && ctaRect.top >= 0 && ctaRect.left >= 0 && ctaRect.right <= vw;

    const h1Lines = getLines(h1);
    const badgeLines = getLines(badge);
    const subtitleLines = getLines(titleHand);
    const venueLines = getLines(venue);
    const ctaLines = getLines(cta);

    const h1OneLine = h1Lines <= 1;
    const badgeOneLine = badgeLines <= 1;
    const subtitleOneLine = subtitleLines <= 1;
    const venueAtMostTwo = venueLines <= 2;
    const ctaOneLine = ctaLines <= 1;

    const wheelInView = wheelRect && wheelRect.top < vh && wheelRect.bottom > 0 && wheelRect.left < vw && wheelRect.right > 0;
    const wheelCenterX = wheelRect ? (wheelRect.left + wheelRect.right) / 2 : 0;
    const wheelCenterY = wheelRect ? (wheelRect.top + wheelRect.bottom) / 2 : 0;
    const wheelCentered = wheelInView && (wheelCenterX >= vw * 0.25 && wheelCenterX <= vw * 0.75 && wheelCenterY >= vh * 0.3 && wheelCenterY <= vh * 0.7);

    const allVisible = badgeVisible && h1Visible && subtitleVisible && venueVisible && ctaVisible;

    // For desktop / large viewports (2K and above), the main title must stay on a single line.
    const requireSingleLineTitle = vw >= 1920;
    // Only require the wheel to be centered on wider desktops; on mid-width views we just care that it's present.
    const requireCenteredWheel = vw >= 1400;
    const linesOk =
      badgeOneLine &&
      subtitleOneLine &&
      venueAtMostTwo &&
      ctaOneLine &&
      (!requireSingleLineTitle || h1OneLine);

    const debug = !allVisible ? {
      vw,
      vh,
      badgeRect: badgeRect ? { top: badgeRect.top, right: badgeRect.right, bottom: badgeRect.bottom, left: badgeRect.left } : null,
      ctaRect: ctaRect ? { top: ctaRect.top, right: ctaRect.right, bottom: ctaRect.bottom, left: ctaRect.left } : null,
    } : null;

    return {
      allVisible,
      badgeVisible,
      h1Visible,
      subtitleVisible,
      venueVisible,
      ctaVisible,
      h1Lines,
      badgeLines,
      subtitleLines,
      venueLines,
      ctaLines,
      h1OneLine,
      badgeOneLine,
      subtitleOneLine,
      venueAtMostTwo,
      ctaOneLine,
      linesOk,
      wheelInView,
      wheelCentered,
      ctaAboveFold: ctaVisible,
      debug,
    };
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];

  for (const { w, h } of VIEWPORTS) {
    const page = await context.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(600);

    const file = path.join(OUT_DIR, `hero-${w}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const check = await checkHero(page);
    await page.close();

    const requireCenteredWheel = w >= 1400;
    const wheelOk = check.wheelInView && (!requireCenteredWheel || check.wheelCentered);
    const pass =
      check.allVisible &&
      check.linesOk &&
      wheelOk;
    results.push({ width: w, height: h, ...check, pass });

    const status = pass ? 'OK' : 'FAIL';
    const why = pass ? '' : [
      !check.allVisible && 'notAllVisible',
      !check.linesOk && 'lineCounts',
      !check.wheelInView && 'wheelOutOfView',
      !check.wheelCentered && 'wheelNotCentered',
    ].filter(Boolean).join(', ');
    console.log(
      `hero-${w}.png ${status}  visible=${check.allVisible}` +
      ` lines(h1/badge/sub/venue/cta)=${check.h1Lines}/${check.badgeLines}/${check.subtitleLines}/${check.venueLines}/${check.ctaLines}` +
      ` wheel=${check.wheelInView}/${check.wheelCentered}` +
      (why ? `  [${why}]` : '')
    );
  }

  await context.close();
  await browser.close();

  const allPass = results.every((r) => r.pass);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ results, allPass }, null, 2));

  // Also write a human-readable markdown report so you can inspect results without opening JSON.
  const reportLines = [];
  reportLines.push('# Hero layout report');
  reportLines.push('');
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push('');
  reportLines.push('| Width | Height | Status | h1 lines | Notes |');
  reportLines.push('|-------|--------|--------|----------|-------|');
  for (const r of results) {
    const status = r.pass ? 'OK' : 'FAIL';
    const notes = [];
    if (!r.allVisible) notes.push('visibility');
    if (!r.linesOk) notes.push('line counts');
    if (!r.wheelInView) notes.push('wheel out of view');
    if (!r.wheelCentered) notes.push('wheel position');
    reportLines.push(`| ${r.width} | ${r.height} | ${status} | ${r.h1Lines} | ${notes.join(', ') || ''} |`);
  }
  const REPORT_FILE = path.join(__dirname, 'hero-report.md');
  fs.writeFileSync(REPORT_FILE, reportLines.join('\n'));

  console.log('\nResults written to scripts/hero-check-results.json and scripts/hero-report.md');
  if (!allPass) {
    const failed = results.filter((r) => !r.pass).map((r) => `${r.width}(${[
      !r.allVisible && 'visible',
      !r.linesOk && 'lines',
      !r.wheelInView && 'wheel',
      !r.wheelCentered && 'wheelPos',
    ].filter(Boolean).join(',')})`);
    console.error('Failed viewports:', failed.join(' '));
    process.exit(1);
  }
  console.log('All viewports passed (reference image criteria).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
