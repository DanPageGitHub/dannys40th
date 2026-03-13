/**
 * Hero Diagnostics Debug Panel — tailored to current hero (copy-edits-only version)
 * Loaded only when window.__debugMode is true. Key 3 toggles visibility.
 * Breakpoints match styles.css hero media: 560–599, 600–700, 720–760, 760–800, 768–1200, 900+, etc.
 */
(function() {
  'use strict';
  if (!window.__debugMode) return;

  const STORAGE_KEY = 'heroDebug_';
  const CROP_REGISTERED = 8;
  const CROP_SLIGHT = 24;
  const DEBOUNCE_MS = 150;
  const CROP_BASE_SCALE = 1.32;

  // Breakpoints match this version's hero-tune media in styles.css
  function getBreakpointLabel(w) {
    if (w < 560) return 'mobile (<560)';
    if (w < 600) return '560–599 (tune 582)';
    if (w < 700) return '600–700 (above fold)';
    if (w < 720) return '700–719';
    if (w < 760) return '720–760 (tune 740)';
    if (w < 800) return '760–800 (iPad 768)';
    if (w < 900) return '800–899';
    if (w < 1024) return '900–1023';
    if (w < 1200) return '1024–1199';
    if (w < 1440) return '1200–1439';
    if (w < 1920) return '1440–1919';
    if (w < 2560) return '1920–2559 (2K)';
    return '2560+ (4K)';
  }

  function getActiveMedia(w) {
    const mq = [];
    if (w >= 560 && w < 600) mq.push('560–599');
    if (w >= 600 && w <= 700) mq.push('600–700');
    if (w >= 720 && w <= 760) mq.push('720–760');
    if (w >= 760 && w <= 800) mq.push('760–800');
    if (w >= 768 && w <= 1200) mq.push('768–1200');
    if (w >= 600) mq.push('600+ (badge line)');
    if (w >= 768) mq.push('768+ (desktop vars)');
    if (w >= 900) mq.push('900+');
    if (w >= 1024) mq.push('1024+');
    if (w >= 1200) mq.push('1200+');
    if (w >= 1440) mq.push('1440+');
    if (w >= 1920) mq.push('1920+');
    if (w >= 2560) mq.push('2560+');
    return mq.length ? mq.join(', ') : 'base';
  }

  function getZoomEstimate() {
    try {
      const ratio = window.outerWidth / window.innerWidth;
      if (ratio > 0 && ratio < 3) return Math.round(ratio * 100) + '%';
    } catch (_) {}
    return 'unknown';
  }

  function getUASummary() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Edge';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return ua.slice(0, 30) + '...';
  }

  function estimateLineCount(el) {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 16;
    return Math.max(1, Math.round(el.scrollHeight / lh));
  }

  function countVenueLines(venue) {
    if (!venue) return 0;
    const line1 = venue.querySelector('.hero-venue-line1');
    const line2 = venue.querySelector('.hero-venue-line2');
    const line3 = venue.querySelector('.hero-venue-line3');
    let n = 0;
    if (line1 && line1.offsetParent !== null) n++;
    if (line2 && line2.offsetParent !== null) n++;
    if (line3 && line3.offsetParent !== null) n++;
    if (n > 0) return n;
    return estimateLineCount(venue);
  }

  function countSubtitleLines(sub) {
    if (!sub) return 0;
    const l1 = sub.querySelector('.title-hand-line1');
    const l2 = sub.querySelector('.title-hand-line2');
    if (l1 && l2) {
      const r1 = l1.getBoundingClientRect();
      const r2 = l2.getBoundingClientRect();
      return r1.bottom <= r2.top ? 2 : 1;
    }
    return estimateLineCount(sub);
  }

  function getVisibleSun(hero) {
    if (!hero) return null;
    return hero.classList.contains('hero-symbol-crop')
      ? hero.querySelector('.hero-symbol--crop')
      : hero.querySelector('.hero-symbol--wheel');
  }

  function loadStored(key, def) {
    try {
      const v = localStorage.getItem(STORAGE_KEY + key);
      return v !== null ? JSON.parse(v) : def;
    } catch (_) { return def; }
  }

  function saveStored(key, val) {
    try { localStorage.setItem(STORAGE_KEY + key, JSON.stringify(val)); } catch (_) {}
  }

  function debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  let panel, outlinesOn = false, crosshairsOn = false;
  const toggles = {
    outlines: false,
    hideCrop: false,
    hideBg: false,
    freezeVideo: false,
    dimOverlays: false,
    crosshairs: false
  };

  function buildPanel() {
    panel = document.createElement('div');
    panel.id = 'heroDiagnosticsPanel';
    panel.style.cssText = [
      'display:block',
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'z-index:605',
      'width:min(320px,90vw)',
      'max-height:70vh',
      'overflow-y:auto',
      'background:rgba(14,13,11,0.95)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'border:1px solid rgba(184,115,51,0.35)',
      'border-radius:3px',
      'padding:12px 14px 14px',
      'font-family:"Libre Baskerville",Georgia,serif',
      'color:rgba(232,223,200,0.9)',
      'font-size:0.72rem',
      'letter-spacing:0.05em',
      'user-select:text',
      'pointer-events:all'
    ].join(';');

    const section = (title, content) =>
      `<div class="hdp-section" style="margin-bottom:12px;border-bottom:1px solid rgba(184,115,51,0.2);padding-bottom:8px">
        <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.12em;color:#b87333;margin-bottom:6px">${title}</div>
        ${content}
      </div>`;

    const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:2px"><span style="opacity:0.8">${k}</span><span id="hdp_${k.replace(/\s/g,'_')}" style="color:#d4954a;text-align:right">${v}</span></div>`;

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(184,115,51,0.3);padding-bottom:8px">
        <span style="font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;color:#b87333">Hero Diagnostics</span>
        <span style="font-size:0.65rem;opacity:0.5">3 toggle</span>
      </div>

      ${section('Environment', `
        ${row('innerWidth', '-')}
        ${row('innerHeight', '-')}
        ${row('breakpoint', '-')}
        ${row('activeMedia', '-')}
        ${row('heroSymbol', '-')}
        ${row('DPR', '-')}
        ${row('zoom', '-')}
        ${row('UA', '-')}
      `)}

      ${section('Hero state', `
        ${row('mode', '-')}
        ${row('minHeight', '-')}
        ${row('height', '-')}
        ${row('padTop', '-')}
        ${row('padBottom', '-')}
        ${row('padSides', '-')}
        ${row('emptyBelowCTA', '-')}
      `)}

      ${section('Measurements', `
        ${row('hero_wxh', '-')}
        ${row('content_wxh', '-')}
        ${row('sun_wxh', '-')}
        ${row('badge_wxh', '-')}
        ${row('h1_wxh', '-')}
        ${row('venue_wxh', '-')}
        ${row('cta_wxh', '-')}
        ${row('nav_wxh', '-')}
      `)}

      ${section('Wrap / overflow', `
        ${row('titleWraps', '-')}
        ${row('titleLines', '-')}
        ${row('subtitleWraps', '-')}
        ${row('subtitleLines', '-')}
        ${row('venueWraps', '-')}
        ${row('venueLines', '-')}
        ${row('badgeWraps', '-')}
        ${row('navOverflows', '-')}
        ${row('bodyOverflow', '-')}
        ${row('heroContentOverflow', '-')}
        ${row('ctaClipped', '-')}
      `)}

      ${section('Crop circle', `
        ${row('contentCentre', '-')}
        ${row('sunCentre', '-')}
        ${row('offsetX', '-')}
        ${row('offsetY', '-')}
        ${row('status', '-')}
      `)}

      ${section('Warnings', `
        <div id="hdp_warnings" style="min-height:24px"></div>
      `)}

      ${section('Debug toggles', `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <button id="hdp_btn_outlines" class="hdp-btn">Outlines</button>
          <button id="hdp_btn_hideCrop" class="hdp-btn">Hide crop</button>
          <button id="hdp_btn_hideBg" class="hdp-btn">Hide bg</button>
          <button id="hdp_btn_freezeVideo" class="hdp-btn">Freeze video</button>
          <button id="hdp_btn_dimOverlays" class="hdp-btn">Dim overlays</button>
          <button id="hdp_btn_crosshairs" class="hdp-btn">Crosshairs</button>
        </div>
      `)}

      ${section('Sliders', `
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;opacity:0.7;margin-bottom:2px"><span>Hero pad top</span><span id="hdp_slider_padTop_val">0</span></div>
          <input type="range" id="hdp_slider_padTop" min="0" max="200" value="0" step="2" style="width:100%;accent-color:#b87333">
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;opacity:0.7;margin-bottom:2px"><span>Hero pad bottom</span><span id="hdp_slider_padBottom_val">0</span></div>
          <input type="range" id="hdp_slider_padBottom" min="0" max="200" value="0" step="2" style="width:100%;accent-color:#b87333">
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;opacity:0.7;margin-bottom:2px"><span>Crop scale %</span><span id="hdp_slider_cropScale_val">100</span></div>
          <input type="range" id="hdp_slider_cropScale" min="50" max="200" value="100" step="5" style="width:100%;accent-color:#b87333">
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;opacity:0.7;margin-bottom:2px"><span>Content max (0=default)</span><span id="hdp_slider_contentMax_val">0</span></div>
          <input type="range" id="hdp_slider_contentMax" min="0" max="1400" value="0" step="20" style="width:100%;accent-color:#b87333">
        </div>
        <button id="hdp_btn_resetSliders" class="hdp-btn" style="margin-top:4px;width:100%">Reset sliders</button>
      `)}

      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="hdp_btn_refresh" class="hdp-btn">Refresh</button>
        <button id="hdp_btn_export" class="hdp-btn">Copy all</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .hdp-btn{font-family:'Libre Baskerville',serif;font-size:0.68rem;padding:4px 8px;background:rgba(184,115,51,0.15);border:1px solid rgba(184,115,51,0.4);border-radius:2px;color:#d4954a;cursor:pointer;transition:background 0.2s}
      .hdp-btn:hover{background:rgba(184,115,51,0.25)}
      .hdp-btn.active{background:rgba(184,115,51,0.35);border-color:rgba(184,115,51,0.6)}
      #heroDiagnosticsPanel .hdp-section:last-of-type{border-bottom:none}
    `;
    document.head.appendChild(style);

    document.body.appendChild(panel);

    ['outlines','hideCrop','hideBg','freezeVideo','dimOverlays','crosshairs'].forEach(name => {
      const btn = document.getElementById('hdp_btn_' + name);
      if (!btn) return;
      btn.addEventListener('click', () => {
        toggles[name] = !toggles[name];
        btn.classList.toggle('active', toggles[name]);
        applyToggles();
        saveStored('toggles', toggles);
        recompute();
      });
    });

    document.getElementById('hdp_btn_resetSliders').addEventListener('click', resetSliders);
    document.getElementById('hdp_btn_refresh').addEventListener('click', recompute);
    document.getElementById('hdp_btn_export').addEventListener('click', doExport);

    function updateSliderLabels() {
      const vals = getSliderValues();
      const v = (id, val) => { const el = document.getElementById('hdp_slider_' + id + '_val'); if (el) el.textContent = val; };
      v('padTop', vals.padTop);
      v('padBottom', vals.padBottom);
      v('cropScale', vals.cropScale);
      v('contentMax', vals.contentMax === 0 ? 'default' : vals.contentMax);
    }
    window.__hdpUpdateSliderLabels = updateSliderLabels;
    ['padTop','padBottom','cropScale','contentMax'].forEach(id => {
      const el = document.getElementById('hdp_slider_' + id);
      if (el) {
        el.addEventListener('input', () => { applySliders(); updateSliderLabels(); });
      }
    });
    updateSliderLabels();

    const open = loadStored('open', true);
    panel.style.display = open ? 'block' : 'none';
    const pos = loadStored('position', null);
    if (pos) { panel.style.left = pos.left + 'px'; panel.style.bottom = 'auto'; panel.style.top = pos.top + 'px'; panel.style.right = 'auto'; }
    Object.assign(toggles, loadStored('toggles', {}));
    document.querySelectorAll('[id^="hdp_btn_"]').forEach(btn => {
      const m = btn.id.match(/hdp_btn_(.+)/);
      if (m && toggles[m[1]]) btn.classList.add('active');
    });
  }

  function setVal(id, v) {
    const el = document.getElementById('hdp_' + id);
    if (el) el.textContent = v;
  }

  function applyToggles() {
    const hero = document.getElementById('hero');
    const sun = getVisibleSun(hero);
    const heroBackdrop = document.getElementById('heroBackdrop');
    const video = heroBackdrop && heroBackdrop.querySelector('video');

    document.body.classList.toggle('hdp-outlines', toggles.outlines);
    if (sun) sun.style.visibility = toggles.hideCrop ? 'hidden' : '';
    if (heroBackdrop) heroBackdrop.style.visibility = toggles.hideBg ? 'hidden' : '';
    if (video) {
      if (toggles.freezeVideo) video.pause();
      else if (video.paused && video.readyState >= 2) video.play();
    }
    document.body.classList.toggle('hdp-dim', toggles.dimOverlays);
    document.body.classList.toggle('hdp-crosshairs', toggles.crosshairs);
  }

  const outlineStyles = `
    body.hdp-outlines #hero{outline:2px solid #c44}
    body.hdp-outlines .hero-content{outline:2px solid #2e7b7a}
    body.hdp-outlines .hero-symbol{outline:2px solid #c8a96e}
    body.hdp-outlines .badge{outline:2px solid #b87333}
    body.hdp-outlines #hero h1{outline:2px solid #a0462a}
    body.hdp-outlines .hero-venue{outline:2px solid #4aadab}
    body.hdp-outlines .hero-cta{outline:2px solid #d4954a}
    body.hdp-outlines nav{outline:2px solid #5ecfcd}
    body.hdp-dim .hero-fog{opacity:0.3}
    body.hdp-dim .hero-backdrop::after{opacity:0.5}
  `;

  const crosshairStyles = `
    body.hdp-crosshairs::after{content:'';position:fixed;top:50%;left:50%;width:2px;height:100vh;background:rgba(255,0,0,0.4);transform:translate(-50%,-50%);pointer-events:none;z-index:9999}
    body.hdp-crosshairs::before{content:'';position:fixed;top:50%;left:50%;width:100vw;height:2px;background:rgba(255,0,0,0.4);transform:translate(-50%,-50%);pointer-events:none;z-index:9999}
  `;

  function injectOutlineStyles() {
    if (document.getElementById('hdp-outline-styles')) return;
    const s = document.createElement('style');
    s.id = 'hdp-outline-styles';
    s.textContent = outlineStyles + crosshairStyles;
    document.head.appendChild(s);
  }

  function resetSliders() {
    const padTop = document.getElementById('hdp_slider_padTop');
    const padBottom = document.getElementById('hdp_slider_padBottom');
    const cropScale = document.getElementById('hdp_slider_cropScale');
    const contentMax = document.getElementById('hdp_slider_contentMax');
    if (padTop) padTop.value = 0;
    if (padBottom) padBottom.value = 0;
    if (cropScale) cropScale.value = 100;
    if (contentMax) contentMax.value = 0;
    applySliders();
    if (window.__hdpUpdateSliderLabels) window.__hdpUpdateSliderLabels();
  }

  function applySliders() {
    const hero = document.getElementById('hero');
    const content = hero && hero.querySelector('.hero-content');
    const root = document.documentElement;
    const padTopEl = document.getElementById('hdp_slider_padTop');
    const padBottomEl = document.getElementById('hdp_slider_padBottom');
    const cropScaleEl = document.getElementById('hdp_slider_cropScale');
    const contentMaxEl = document.getElementById('hdp_slider_contentMax');
    if (!padTopEl || !padBottomEl || !cropScaleEl || !contentMaxEl) return;

    const padTop = parseInt(padTopEl.value, 10) || 0;
    const padBottom = parseInt(padBottomEl.value, 10) || 0;
    const cropScale = parseInt(cropScaleEl.value, 10) || 100;
    const contentMax = parseInt(contentMaxEl.value, 10) || 0;

    if (hero) {
      hero.style.paddingTop = padTop ? (padTop + 'px') : '';
      hero.style.paddingBottom = padBottom ? (padBottom + 'px') : '';
    }
    if (cropScale === 100) {
      root.style.removeProperty('--hero-symbol-scale');
    } else {
      root.style.setProperty('--hero-symbol-scale', String(CROP_BASE_SCALE * cropScale / 100), 'important');
    }
    if (content) {
      content.style.maxWidth = contentMax ? (contentMax + 'px') : '';
    }
  }

  function getSliderValues() {
    const padTopEl = document.getElementById('hdp_slider_padTop');
    const padBottomEl = document.getElementById('hdp_slider_padBottom');
    const cropScaleEl = document.getElementById('hdp_slider_cropScale');
    const contentMaxEl = document.getElementById('hdp_slider_contentMax');
    return {
      padTop: padTopEl ? parseInt(padTopEl.value, 10) : 0,
      padBottom: padBottomEl ? parseInt(padBottomEl.value, 10) : 0,
      cropScale: cropScaleEl ? parseInt(cropScaleEl.value, 10) : 100,
      contentMax: contentMaxEl ? parseInt(contentMaxEl.value, 10) : 0
    };
  }

  function doExport() {
    const hero = document.getElementById('hero');
    const content = hero && hero.querySelector('.hero-content');
    const sun = getVisibleSun(hero);
    const badge = hero && hero.querySelector('.badge');
    const h1 = hero && hero.querySelector('h1');
    const sub = hero && hero.querySelector('.title-hand');
    const venue = hero && hero.querySelector('.hero-venue');
    const cta = hero && hero.querySelector('.hero-cta');
    const nav = document.querySelector('.nav-inner');

    const data = {
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      dpr: window.devicePixelRatio,
      breakpoint: getBreakpointLabel(window.innerWidth),
      activeMedia: getActiveMedia(window.innerWidth),
      heroSymbol: hero && hero.classList.contains('hero-symbol-crop') ? 'crop' : 'wheel',
      zoom: getZoomEstimate(),
      heroHeight: hero ? hero.getBoundingClientRect().height : 0,
      contentWidth: content ? content.getBoundingClientRect().width : 0,
      sunWidth: sun ? sun.getBoundingClientRect().width : 0,
      titleLines: estimateLineCount(h1),
      subtitleLines: countSubtitleLines(sub),
      venueLines: countVenueLines(venue),
      badgeWraps: badge ? (estimateLineCount(badge) > 1) : false,
      navOverflow: nav ? (nav.scrollWidth > nav.clientWidth) : false,
      cropOffsetX: 0,
      cropOffsetY: 0,
      emptyBelowCTA: 0,
      sliders: getSliderValues(),
      toggles: Object.assign({}, toggles),
      timestamp: new Date().toISOString()
    };

    if (content && sun) {
      const cr = content.getBoundingClientRect();
      const sr = sun.getBoundingClientRect();
      data.cropOffsetX = Math.round((sr.left + sr.width / 2) - (cr.left + cr.width / 2));
      data.cropOffsetY = Math.round((sr.top + sr.height / 2) - (cr.top + cr.height / 2));
    }
    if (cta && hero) {
      const cr = cta.getBoundingClientRect();
      const hr = hero.getBoundingClientRect();
      data.emptyBelowCTA = Math.round(hr.bottom - cr.bottom);
    }

    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('hdp_btn_export');
      if (btn) { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy all'; }, 1500); }
    });
  }

  function recompute() {
    if (!panel || !document.body.contains(panel)) return;

    const hero = document.getElementById('hero');
    const content = hero && hero.querySelector('.hero-content');
    const sun = getVisibleSun(hero);
    const badge = hero && hero.querySelector('.badge');
    const h1 = hero && hero.querySelector('h1');
    const sub = hero && hero.querySelector('.title-hand');
    const venue = hero && hero.querySelector('.hero-venue');
    const cta = hero && hero.querySelector('.hero-cta');
    const nav = document.querySelector('nav');
    const navInner = document.querySelector('.nav-inner');

    const iw = window.innerWidth;
    const ih = window.innerHeight;

    setVal('innerWidth', iw);
    setVal('innerHeight', ih);
    setVal('breakpoint', getBreakpointLabel(iw));
    setVal('activeMedia', getActiveMedia(iw));
    setVal('heroSymbol', hero && hero.classList.contains('hero-symbol-crop') ? 'crop' : 'wheel');
    setVal('DPR', String(window.devicePixelRatio || 1));
    setVal('zoom', getZoomEstimate());
    setVal('UA', getUASummary());

    if (hero) {
      const cs = getComputedStyle(hero);
      const minH = cs.minHeight;
      const hr = hero.getBoundingClientRect();
      const padT = parseInt(cs.paddingTop, 10) || 0;
      const padB = parseInt(cs.paddingBottom, 10) || 0;
      const padS = parseInt(cs.paddingLeft, 10) || 0;

      const mode = minH === 'auto' || (hero.offsetHeight < 500) ? 'compact' : 'full';
      setVal('mode', mode);
      setVal('minHeight', minH);
      setVal('height', Math.round(hr.height) + 'px');
      setVal('padTop', padT + 'px');
      setVal('padBottom', padB + 'px');
      setVal('padSides', padS + 'px');

      let emptyBelow = '-';
      if (cta) {
        const cr = cta.getBoundingClientRect();
        emptyBelow = Math.round(hr.bottom - cr.bottom) + 'px';
      }
      setVal('emptyBelowCTA', emptyBelow);
    }

    const rect = (el, label) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setVal(label, Math.round(r.width) + ' x ' + Math.round(r.height));
    };
    rect(hero, 'hero_wxh');
    rect(content, 'content_wxh');
    rect(sun, 'sun_wxh');
    rect(badge, 'badge_wxh');
    rect(h1, 'h1_wxh');
    rect(venue, 'venue_wxh');
    rect(cta, 'cta_wxh');
    rect(nav, 'nav_wxh');

    const titleLines = estimateLineCount(h1);
    const subLines = countSubtitleLines(sub);
    const venueLines = countVenueLines(venue);
    const badgeLines = badge ? estimateLineCount(badge) : 0;

    setVal('titleWraps', titleLines > 1 ? 'yes' : 'no');
    setVal('titleLines', String(titleLines));
    setVal('subtitleWraps', subLines > 1 ? 'yes' : 'no');
    setVal('subtitleLines', String(subLines));
    setVal('venueWraps', venueLines > 1 ? 'yes' : 'no');
    setVal('venueLines', String(venueLines));
    setVal('badgeWraps', badgeLines > 1 ? 'yes' : 'no');

    const navOverflows = navInner && navInner.scrollWidth > navInner.clientWidth;
    setVal('navOverflows', navOverflows ? 'yes' : 'no');

    const bodyOverflow = document.documentElement.scrollWidth > iw;
    setVal('bodyOverflow', bodyOverflow ? 'yes' : 'no');

    let heroContentOverflow = 'no';
    if (content && content.getBoundingClientRect().width > iw) heroContentOverflow = 'yes';
    setVal('heroContentOverflow', heroContentOverflow);

    let ctaClipped = 'no';
    if (cta) {
      const cr = cta.getBoundingClientRect();
      if (cr.right > iw || cr.left < 0 || cr.bottom > ih) ctaClipped = 'yes';
    }
    setVal('ctaClipped', ctaClipped);

    if (content && sun) {
      const cr = content.getBoundingClientRect();
      const sr = sun.getBoundingClientRect();
      const cx = cr.left + cr.width / 2;
      const cy = cr.top + cr.height / 2;
      const sx = sr.left + sr.width / 2;
      const sy = sr.top + sr.height / 2;
      const dx = Math.abs(sx - cx);
      const dy = Math.abs(sy - cy);

      setVal('contentCentre', Math.round(cx) + ', ' + Math.round(cy));
      setVal('sunCentre', Math.round(sx) + ', ' + Math.round(sy));
      setVal('offsetX', Math.round(sx - cx) + 'px');
      setVal('offsetY', Math.round(sy - cy) + 'px');

      const maxOff = Math.max(dx, dy);
      let status = 'registered';
      if (maxOff > CROP_SLIGHT) status = 'clearly offset';
      else if (maxOff > CROP_REGISTERED) status = 'slightly offset';
      setVal('status', status);
    }

    const warnings = [];
    if (document.documentElement.scrollWidth > iw) warnings.push({ text: 'Body horizontal overflow', color: '#c44' });
    if (badge && estimateLineCount(badge) > 1) warnings.push({ text: 'Badge wrapping', color: '#c84' });
    if (navInner && navInner.scrollWidth > navInner.clientWidth) warnings.push({ text: 'Nav overflow', color: '#c84' });
    if (content && content.getBoundingClientRect().width > iw) warnings.push({ text: 'Hero content overflow', color: '#c44' });
    if (content && sun) {
      const cr = content.getBoundingClientRect();
      const sr = sun.getBoundingClientRect();
      const dx = Math.abs((sr.left + sr.width/2) - (cr.left + cr.width/2));
      const dy = Math.abs((sr.top + sr.height/2) - (cr.top + cr.height/2));
      if (Math.max(dx, dy) > CROP_SLIGHT) warnings.push({ text: 'Crop circle offset', color: '#c84' });
    }
    if (cta && hero) {
      const gap = hero.getBoundingClientRect().bottom - cta.getBoundingClientRect().bottom;
      if (gap > 120) warnings.push({ text: 'Excessive empty space below CTA', color: '#a80' });
    }

    const warnEl = document.getElementById('hdp_warnings');
    if (warnEl) {
      warnEl.innerHTML = warnings.length
        ? warnings.map(w => `<span style="display:block;color:${w.color};font-size:0.7rem;margin-bottom:2px">${w.text}</span>`).join('')
        : '<span style="opacity:0.5">None</span>';
    }
  }

  function init() {
    injectOutlineStyles();
    buildPanel();
    applyToggles();
    recompute();

    const debouncedRecompute = debounce(recompute, DEBOUNCE_MS);
    window.addEventListener('resize', debouncedRecompute);
    window.addEventListener('orientationchange', debouncedRecompute);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(debouncedRecompute);
    }

    window.__heroDebugRecompute = recompute;

    document.addEventListener('keydown', e => {
      if (!window.__debugMode) return;
      if (e.key === '3') {
        const p = document.getElementById('heroDiagnosticsPanel');
        if (p) {
          const hidden = p.style.display === 'none';
          p.style.display = hidden ? 'block' : 'none';
          saveStored('open', hidden);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
