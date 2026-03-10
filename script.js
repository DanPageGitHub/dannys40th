// Debug mode: set to true when you want debug panel keyboard shortcuts (1, 2, 3, 9, R, arrows).
// In Cursor: change to true and save, or in console: window.__debugMode = true
window.__debugMode = false;

document.addEventListener('DOMContentLoaded', function() {

// In-page links: scroll without showing hash in URL
(function() {
  function cleanUrl() { history.replaceState(null, '', window.location.pathname + window.location.search); }
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); cleanUrl(); }
  }
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = (a.getAttribute('href') || '').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToId(id);
  });
  if (window.location.hash) scrollToId(window.location.hash.slice(1));
})();

// Badge sun: use custom image if present, else fallback to inline SVG
(function() {
  var img = document.querySelector('.badge-sun');
  if (!img) return;
  var fallbackSvg = '<svg style="display:inline;vertical-align:middle;margin-right:0.6em;width:0.9em;height:0.9em;" fill="none" viewBox="0 0 22 22" stroke="#b87333" stroke-width="1" opacity="0.85"><circle cx="11" cy="11" r="3" fill="none"/><line x1="11" y1="2" x2="11" y2="5"/><line x1="11" y1="17" x2="11" y2="20"/><line x1="2" y1="11" x2="5" y2="11"/><line x1="17" y1="11" x2="20" y2="11"/><line x1="4.2" y1="4.2" x2="6.2" y2="6.2"/><line x1="15.8" y1="15.8" x2="17.8" y2="17.8"/><line x1="15.8" y1="4.2" x2="17.8" y2="6.2"/><line x1="4.2" y1="15.8" x2="6.2" y2="17.8"/></svg>';
  img.onerror = function() {
    var span = document.createElement('span');
    span.innerHTML = fallbackSvg;
    img.parentNode.replaceChild(span, img);
  };
})();

const I = {
  crop_circle:      'images/crop_circle.jpg',
  dj_shot:          'images/dj_shot.jpg',
  goat_mask:        'images/goat_mask.jpg',
  danny_sign:       'images/danny_sign.jpg',
  danny_crown:      'images/danny_crown.jpg',
  film_group:       'images/film_group.jpg',
  bus_selfie:       'images/bus_selfie.jpg',
  bell_tents:       'images/bell_tents.jpg',
  pub_exterior:     'images/pub_exterior.jpg',
  pub_canal_side:   'images/the-barge-crop-circle-mecca.jpg',
  barge_sunny_canal:'images/bargeinnpubgallery.jpg',
  kenver_40th_1:    'images/kenver40th1.jpg',
  kenver_40th_2:    'images/Kenver40th2.jpg',
  canal_narrowboat: 'images/canal_narrowboat.jpg',
  white_horse:      'images/white_horse.jpg',
  rusty_crop_circle:'images/rustycropcircle.jpg',
  sunset_hero:      'images/Barge-Danny-Hero.jpg',
  // High-res B&B bedroom image (WebP) for the B&B section photo slot
  bnb_room:         'images/BnbBedroom.webp',
};

// Photo filter tuning (must be before setPhoto calls)
let photoSat = 0.72, photoSep = 0.18, photoBrt = 0.92;
let djSat = 0.72, djSep = 0.18, djBrt = 0.92;

// IMAGES
function setPhoto(id, key, pos, bf, fit, sepiaOverride) {
  const wrap = document.getElementById(id);
  if (!wrap || !I[key]) return;
  // Always show a single image per slot
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  const img = document.createElement('img');
  img.src = I[key]; img.alt = '';
  const b = bf || '0.92';
  const objectFit = fit || 'cover';
  const sep = sepiaOverride !== undefined ? sepiaOverride : photoSep;
  img.style.cssText = `width:100%;height:100%;object-fit:${objectFit};display:block;filter:saturate(0.72) sepia(${sep}) brightness(${b});transition:opacity 0.8s ease,filter 0.6s,transform 0.7s;opacity:1;`;
  if (pos) img.style.objectPosition = pos;
  const isDJ = wrap.classList.contains('photo-dj');
  wrap.insertBefore(img, wrap.firstChild);
  wrap.addEventListener('mouseenter', () => img.style.filter = 'saturate(0.88) sepia(0.08) brightness(1.04)');
  wrap.addEventListener('mouseleave', () => {
    if(isDJ) img.style.filter = `saturate(${djSat}) sepia(${djSep}) brightness(${djBrt})`;
    else img.style.filter = `saturate(${photoSat}) sepia(${sep}) brightness(${b})`;
  });
}

// heroBg is now a video iframe
setPhoto('pDJ','dj_shot','center 50%');
setPhoto('pBnbRoom','bnb_room','center 40%');

// Venue carousel (Where We're Going) — rotate through key images without stretching
(function(){
  const heroId = 'pHero';
  const heroEl = document.getElementById(heroId);
  if(!heroEl) return;
  const sequence = [
    // Start on the pub exterior, then rotate through canal, crop-circle mecca, sunny canal day, Kenver portrait, Danny, Kenver landscape, and a DJ shot
    ['pub_exterior','center center'],
    ['pub_canal_side','center center'],
    ['crop_circle','center 45%'],
    ['barge_sunny_canal','center 55%'],
    ['kenver_40th_1','center 50%'],
    ['rusty_crop_circle','center 50%'],
    ['danny_sign','center 40%'],
    ['kenver_40th_2','center 50%'],
    ['dj_shot','center 50%'],
  ];
  let idx = 0;

  function createImg(key,pos){
    const img = document.createElement('img');
    img.src = I[key];
    img.alt = '';
    // New slide starts transparent; both slides cross-fade via opacity.
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;filter:saturate(0.75) sepia(0.18) brightness(0.94);transition:opacity 1.2s ease,filter 0.6s,transform 0.7s;opacity:0;';
    if(pos) img.style.objectPosition = pos;
    return img;
  }

  const FADE_MS = 1200;
  const HOLD_MS = 3200; // steady time each image stays fully visible
  let slideVisibleAt = 0; // when current slide became fully visible (time-based scheduling)

  // Initialise with first image if empty
  if(!heroEl.querySelector('img')){
    const [k,p] = sequence[0];
    const first = createImg(k,p);
    first.style.opacity = '1';
    heroEl.appendChild(first);
    slideVisibleAt = Date.now();
  }

  function fadeTo(nextIdx, done){
    const [key,pos] = sequence[nextIdx];
    const current = heroEl.querySelector('img');
    const next = createImg(key,pos);
    heroEl.appendChild(next);
    // Only start crossfade once the new image has loaded, so we never fade to black.
    const doCrossfade = () => {
      void next.offsetWidth;
      next.style.opacity = '1';
      if(current){
        current.style.opacity = '0';
        setTimeout(() => {
          if(current.parentNode === heroEl){
            heroEl.removeChild(current);
          }
          slideVisibleAt = Date.now();
          if(typeof done === 'function') done();
        }, FADE_MS + 50);
      } else {
        slideVisibleAt = Date.now();
        if(typeof done === 'function') done();
      }
    };

    if(next.complete){
      doCrossfade();
    } else {
      next.addEventListener('load', doCrossfade);
    }
  }

  function scheduleNext(){
    const elapsed = Date.now() - slideVisibleAt;
    const wait = Math.max(0, HOLD_MS - elapsed);
    setTimeout(() => {
      idx = (idx + 1) % sequence.length;
      fadeTo(idx, scheduleNext);
    }, wait);
  }

  scheduleNext();
})();

// Parallax backgrounds
const px1 = document.getElementById('pxImg1');
if(px1) px1.style.backgroundImage = `url(${I.canal_narrowboat})`;

function updateParallax() {
  const strip = document.getElementById('pxStrip1');
  const img = document.getElementById('pxImg1');
  if(!strip||!img) return;
  const rect = strip.getBoundingClientRect();
  const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
  img.style.transform = `translateY(${(progress - 0.5) * 80}px)`;
}
let parallaxScheduled = false;
function scheduleParallax() {
  if (parallaxScheduled) return;
  parallaxScheduled = true;
  requestAnimationFrame(function() {
    parallaxScheduled = false;
    updateParallax();
  });
}
window.addEventListener('scroll', scheduleParallax, {passive:true});
updateParallax();

// White horse icon
const aHI = document.getElementById('aHorseIcon');
if(aHI) {
  const img = document.createElement('img');
  img.src = I.white_horse;
  img.style.cssText = 'width:48px;height:28px;object-fit:cover;object-position:center 40%;border-radius:2px;filter:saturate(0.4) sepia(0.4) brightness(0.75);display:block;margin:0 auto 8px;';
  aHI.replaceWith(img);
}

// Goat lurks in schedule section
(function(){
  const sched = document.getElementById('schedule');
  if(!sched) return;
  const lurk = document.createElement('img');
  lurk.src = I.goat_mask;
  lurk.style.cssText = 'position:absolute;right:-20px;bottom:0;width:165px;opacity:0;filter:saturate(0.2) sepia(0.6) brightness(0.4);pointer-events:none;z-index:0;transition:opacity 1.5s ease;transform:scaleX(-1);';
  sched.parentElement.style.position = 'relative';
  sched.parentElement.style.overflow = 'hidden';
  sched.parentElement.appendChild(lurk);
  sched.parentElement.addEventListener('mouseenter', () => lurk.style.opacity = '0.13');
  sched.parentElement.addEventListener('mouseleave', () => lurk.style.opacity = '0');
})();

// RUNE BAND — scrolling rows (populate all .rune-scroll). Config is read by tick and by rune debug panel. Defaults match 4K rune-tune.
window.__runeConfig = window.__runeConfig || { periodMs: 21000, travelPct: 29.5 };
(function(){
  const scrollContainers = document.querySelectorAll('.rune-scroll');
  if(!scrollContainers.length) return;
  const syms = [
    `<svg width="90" height="90" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="22" stroke="#b87333" stroke-width="1"/><circle cx="26" cy="26" r="13" stroke="#b87333" stroke-width="1"/><circle cx="26" cy="26" r="5" stroke="#b87333" stroke-width="1"/><line x1="26" y1="4" x2="26" y2="48" stroke="#b87333" stroke-width="0.8"/><line x1="4" y1="26" x2="48" y2="26" stroke="#b87333" stroke-width="0.8"/><line x1="10" y1="10" x2="42" y2="42" stroke="#b87333" stroke-width="0.6"/><line x1="42" y1="10" x2="10" y2="42" stroke="#b87333" stroke-width="0.6"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 46 46" fill="none"><circle cx="23" cy="23" r="19" stroke="#b87333" stroke-width="0.8"/><path d="M23 4 C28 4 38 13 38 23 C38 33 28 42 23 42" stroke="#b87333" stroke-width="0.8" fill="none"/><path d="M23 4 C18 4 8 13 8 23 C8 33 18 42 23 42" stroke="#b87333" stroke-width="0.8" fill="none" stroke-dasharray="3 2"/><circle cx="23" cy="23" r="3" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="78" viewBox="0 0 48 42" fill="none"><path d="M2 21 C8 6 16 2 24 2 C32 2 40 6 46 21 C40 36 32 40 24 40 C16 40 8 36 2 21Z" stroke="#b87333" stroke-width="0.8" fill="none"/><circle cx="24" cy="21" r="7" stroke="#b87333" stroke-width="0.8"/><circle cx="24" cy="21" r="2.5" fill="#b87333" opacity="0.5"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 40 50" fill="none"><path d="M30 8 C22 8 14 14 14 25 C14 32 18 38 24 40 C18 38 10 32 10 22 C10 12 18 4 28 6" stroke="#b87333" stroke-width="0.9" fill="none"/><circle cx="20" cy="25" r="4" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="18" stroke="#b87333" stroke-width="0.8"/><line x1="22" y1="4" x2="22" y2="40" stroke="#b87333" stroke-width="0.7"/><line x1="4" y1="22" x2="40" y2="22" stroke="#b87333" stroke-width="0.7"/><circle cx="22" cy="22" r="4" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 42 48" fill="none"><path d="M32 10 C24 10 16 17 16 25 C16 30 19 35 24 37" stroke="#b87333" stroke-width="0.9" fill="none"/><path d="M10 38 C18 38 26 31 26 23 C26 18 23 13 18 11" stroke="#b87333" stroke-width="0.9" fill="none" stroke-dasharray="3 2"/><circle cx="21" cy="24" r="2" fill="#b87333" opacity="0.6"/></svg>`,
    /* Crop circle glyph pulled from external SVG asset */
    `<img src="images/crop-circle-glyph-thick.svg" alt="" class="rune-img">`,
  ];
  // Repeat the set many times so very wide screens never "run out" of runes
  const double = [...syms, ...syms, ...syms, ...syms, ...syms, ...syms];
  scrollContainers.forEach(scroll => {
    double.forEach(s => {
      const tmp = document.createElement('div');
      tmp.innerHTML = s;
      const el = tmp.querySelector('svg, img');
      if(el) {
        /* margin and size controlled by CSS per breakpoint (rune-tune) */
        scroll.appendChild(el);
      }
    });
    scroll.classList.add('rune-scroll--js');
  });

  // Scroll time only advances while visible; cap delta per frame so a stalled frame never causes a visible skip
  const RUNE_MAX_DELTA_MS = 80;
  let runeScrollTime = 0;
  let runeLastTime = performance.now();
  function tickRune(now) {
    now = typeof now === 'number' ? now : performance.now();
    const root = document.documentElement;
    const periodFromCss = getComputedStyle(root).getPropertyValue('--rune-period-ms').trim();
    const travelFromCss = getComputedStyle(root).getPropertyValue('--rune-travel-pct').trim();
    const period = periodFromCss ? parseFloat(periodFromCss) : ((window.__runeConfig && window.__runeConfig.periodMs) || 21000);
    const travel = travelFromCss ? parseFloat(travelFromCss) : ((window.__runeConfig && window.__runeConfig.travelPct) || 29.5);
    if(!document.hidden){
      let delta = now - runeLastTime;
      if(delta > RUNE_MAX_DELTA_MS) delta = RUNE_MAX_DELTA_MS;
      runeScrollTime += delta;
      runeScrollTime = runeScrollTime % period;
    }
    runeLastTime = now;
    const t = (runeScrollTime / period) * travel;
    scrollContainers.forEach(el => { el.style.transform = `translateX(-${t}%)`; });
    requestAnimationFrame(tickRune);
  }
  requestAnimationFrame(tickRune);
})();

// MIC / BEAT DETECTION
let micOn = false;
let micAnalyser = null;
let micDataArray = null;
let micBassArray = null;
let micTrebleArray = null;
let micAvg = 0;
let bassAvg = 0;
let midAvg  = 0;
let trebleAvg = 0;
let beatSpeedScroll = 1;
let beatSpeedHero   = 1;
let beatDensityAdd  = 0;   // additive density bonus from treble
let beatSwayAdd     = 0;   // additive sway bonus from bass
let beatCooldown    = 0;
let beatThreshold   = 1.65;
let beatSpikeSize   = 2.5;
let beatDensitySpike = 8;
let beatSwaySpike    = 0.04;
// Mic routing toggles
let bassToSpeed     = true;
let bassToSway      = true;
let bassToDensity   = false;
let midToSpeed      = false;
let midToSway       = false;
let midToDensity    = false;
let trebleToSpeed   = false;
let trebleToSway    = false;
let trebleToDensity = true;
// Freq band config (FFT bin indices, fftSize=512 → 256 bins, ~43Hz each)
let bassStart  = 0;   let bassEnd    = 10;
let midStart   = 10;  let midEnd     = 30;
let trebleStart= 30;  let trebleEnd  = 80;
let normCeil   = 80;  // divisor for normalisation (was hardcoded 80)
let minAvgGate = 2;   // minimum rolling avg before ratio fires

// DEBUG PANEL
const SITE_DEFAULTS = {
  lineDensity: 1, geoSpeed: 0.55, geoOpacity: 0.85, geoLineWidth: 0.65,
  lateralAmp: 0.008, tunnelStrength: 1.5, moteCount: 20, floatCount: 12,
  wispsOn: false, motesOn: true, scrollGeoOn: true,
};
const VIS_DEFAULTS = {
  lineDensity: 18, geoSpeed: 1.0, geoOpacity: 1.0, geoLineWidth: 1.0,
  lateralAmp: 0.018, tunnelStrength: 1.8, moteCount: 55, floatCount: 0,
  wispsOn: false, motesOn: true, scrollGeoOn: true,
};
let lineDensity    = SITE_DEFAULTS.lineDensity;
let geoSpeed       = SITE_DEFAULTS.geoSpeed;
let geoOpacity     = SITE_DEFAULTS.geoOpacity;
let geoLineWidth   = SITE_DEFAULTS.geoLineWidth;
let lateralAmp     = SITE_DEFAULTS.lateralAmp;
let tunnelStrength = SITE_DEFAULTS.tunnelStrength;
let moteCount      = SITE_DEFAULTS.moteCount;
let wispsOn        = SITE_DEFAULTS.wispsOn;
let motesOn        = SITE_DEFAULTS.motesOn;
let scrollGeoOn    = SITE_DEFAULTS.scrollGeoOn;
let floatCount     = SITE_DEFAULTS.floatCount;

// Spark (bottom motes) tuning
let sparkFlashFreq  = 0.002;
let sparkMaxHeight  = 0.25;   // y fraction — sparks reset when they reach above this
// Floater tuning
let floatOpacity    = 0.5;

let inFullscreen = false;

(function(){
  const panel = document.createElement('div');
  panel.id = 'debugPanel';
  panel.style.cssText = [
    'position:fixed','top:60px','right:0','z-index:600','width:210px',
    'background:rgba(14,13,11,0.9)','backdrop-filter:blur(8px)','-webkit-backdrop-filter:blur(8px)',
    'border-left:1px solid rgba(184,115,51,0.25)','border-bottom:1px solid rgba(184,115,51,0.25)',
    'border-top:1px solid rgba(184,115,51,0.25)','border-radius:3px 0 0 3px',
    'padding:14px 14px 16px','font-family:Caveat,cursive','color:rgba(232,223,200,0.75)',
    'font-size:0.82rem','letter-spacing:0.06em','pointer-events:all','user-select:none',
    'transition:opacity 0.25s',
  ].join(';');

  const btnBase = 'font-family:Caveat,cursive;font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;background:none;border:1px solid rgba(184,115,51,0.2);border-radius:2px;padding:2px 7px;cursor:pointer;transition:all 0.2s;';

  function row(label, id, control) {
    return `<div class="dbrow" data-rowid="${id}" style="margin-bottom:9px;border-radius:2px;padding:2px 4px;transition:background 0.12s">`
      + `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">`
      + `<span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">${label}</span>`
      + `<span id="lbl_${id}" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>`
      + `</div>${control}</div>`;
  }
  function sl(id, min, max, val, step) {
    return `<input type="range" id="${id}" min="${min}" max="${max}" value="${val}" step="${step}" style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">`;
  }
  function rtog(id, on) {
    return `<button id="${id}" style="width:100%;padding:2px 0;background:${on?'rgba(184,115,51,0.2)':'rgba(232,223,200,0.03)'};border:1px solid rgba(184,115,51,${on?'0.45':'0.12'});border-radius:2px;color:${on?'#d4954a':'rgba(232,223,200,0.2)'};font-family:Caveat,cursive;font-size:0.72rem;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s">${on?'●':'○'}</button>`;
  }
  function tog(id, on) {
    return `<button id="${id}" style="width:100%;padding:4px 0;background:${on?'rgba(184,115,51,0.25)':'rgba(232,223,200,0.04)'};border:1px solid rgba(184,115,51,${on?'0.5':'0.18'});border-radius:2px;color:${on?'#d4954a':'rgba(232,223,200,0.35)'};font-family:Caveat,cursive;font-size:0.8rem;letter-spacing:0.1em;cursor:pointer;transition:all 0.2s">${on?'ON':'OFF'}</button>`;
  }

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(184,115,51,0.2);padding-bottom:8px;gap:5px">
      <span style="font-size:0.88rem;letter-spacing:0.14em;text-transform:uppercase;color:#b87333;flex:1">✦ Visualiser</span>
      <button id="ctl_fullscreen" style="${btnBase}color:rgba(74,173,171,0.7)">⛶ Full</button>
      <button id="ctl_reset" style="${btnBase}color:rgba(184,115,51,0.6)">Reset</button>
    </div>
    <div id="dp_hint" style="font-size:0.68rem;letter-spacing:0.07em;opacity:0.3;text-align:center;margin-bottom:9px">↑↓ row &nbsp;·&nbsp; ←→ adjust &nbsp;·&nbsp; 1 hide</div>
    ${row('Geo Density',    'density',   sl('ctl_density',   1,   36,  18,    1))}
    ${row('Geo Speed',      'speed',     sl('ctl_speed',     0.1,  4,   1,    0.05))}
    ${row('Geo Opacity',    'opacity',   sl('ctl_opacity',   0.1,  3,   1,    0.05))}
    ${row('Line Thickness', 'lwidth',    sl('ctl_lwidth',    0.2,  4,   1,    0.1))}
    ${row('Lateral Sway',   'lateral',   sl('ctl_lateral',   0,    0.08,0.018,0.002))}
    ${row('Tunnel Drift',   'tunnel',    sl('ctl_tunnel',    0,    4,   1.8,  0.1))}
    ${row('Mote Count',     'motecount', sl('ctl_motecount', 0,  120,  55,    1))}
    <div class="dbrow" data-rowid="toggles" style="border-radius:2px;padding:2px 4px;transition:background 0.12s">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px">
        <div><div style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem;margin-bottom:4px">Motes</div>${tog('ctl_motes', true)}</div>
        <div><div style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem;margin-bottom:4px">Wisps</div>${tog('ctl_wisps', false)}</div>
      </div>
    </div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(184,115,51,0.12)">
      <div style="display:grid;grid-template-columns:1fr;gap:8px">
        <div><div style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem;margin-bottom:4px">Scroll Geo</div>${tog('ctl_scroll_geo', true)}</div>
      </div>
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(184,115,51,0.15)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">🎙 Mic React</span>
        <button id="ctl_mic" style="font-family:Caveat,cursive;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;background:rgba(232,223,200,0.04);border:1px solid rgba(184,115,51,0.18);border-radius:2px;color:rgba(232,223,200,0.35);cursor:pointer;transition:all 0.2s">OFF</button>
      </div>
      <div style="height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;margin-bottom:10px">
        <div id="mic_level" style="height:100%;width:0%;background:rgba(184,115,51,0.55);border-radius:2px;transition:width 0.05s,background 0.1s"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.07em;text-align:center">BASS</div>
        <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.07em;text-align:center">MID</div>
        <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.07em;text-align:center">TREBLE</div>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
          <div id="mic_bass" style="height:100%;width:0%;background:rgba(160,70,42,0.7);border-radius:2px;transition:width 0.05s"></div>
        </div>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
          <div id="mic_mid" style="height:100%;width:0%;background:rgba(184,130,51,0.75);border-radius:2px;transition:width 0.05s"></div>
        </div>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
          <div id="mic_treble" style="height:100%;width:0%;background:rgba(46,123,122,0.7);border-radius:2px;transition:width 0.05s"></div>
        </div>
      </div>
      <div style="margin-bottom:9px">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:4px;align-items:center">
          <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.06em"></div>
          <div style="font-size:0.65rem;opacity:0.45;letter-spacing:0.06em;text-align:center">SPEED</div>
          <div style="font-size:0.65rem;opacity:0.45;letter-spacing:0.06em;text-align:center">SWAY</div>
          <div style="font-size:0.65rem;opacity:0.45;letter-spacing:0.06em;text-align:center">DENS</div>
          <div style="font-size:0.68rem;opacity:0.5;letter-spacing:0.06em;color:rgba(160,70,42,0.8)">BASS</div>
          <div style="text-align:center">${rtog('ctl_bass_speed',   true)}</div>
          <div style="text-align:center">${rtog('ctl_bass_sway',    true)}</div>
          <div style="text-align:center">${rtog('ctl_bass_density', false)}</div>
          <div style="font-size:0.68rem;opacity:0.5;letter-spacing:0.06em;color:rgba(184,130,51,0.9)">MID</div>
          <div style="text-align:center">${rtog('ctl_mid_speed',   false)}</div>
          <div style="text-align:center">${rtog('ctl_mid_sway',    false)}</div>
          <div style="text-align:center">${rtog('ctl_mid_density', false)}</div>
          <div style="font-size:0.68rem;opacity:0.5;letter-spacing:0.06em;color:rgba(46,123,122,0.9)">TREBLE</div>
          <div style="text-align:center">${rtog('ctl_treble_speed',   false)}</div>
          <div style="text-align:center">${rtog('ctl_treble_sway',    false)}</div>
          <div style="text-align:center">${rtog('ctl_treble_density', true)}</div>
        </div>
      </div>
      <div style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Sensitivity</span>
          <span id="lbl_threshold" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
        </div>
        <input type="range" id="ctl_threshold" min="1.1" max="2.5" value="1.65" step="0.05" style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">
      </div>
      <div style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Spike Size</span>
          <span id="lbl_spike" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
        </div>
        <input type="range" id="ctl_spike" min="1" max="6" value="2.5" step="0.1" style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">
      </div>
      <div style="margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Density Spike</span>
          <span id="lbl_dspike" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
        </div>
        <input type="range" id="ctl_dspike" min="0" max="24" value="8" step="1" style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Sway Spike</span>
          <span id="lbl_sspike" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
        </div>
        <input type="range" id="ctl_sspike" min="0" max="0.15" value="0.04" step="0.005" style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';

  function lbl(id, val) { const el=document.getElementById('lbl_'+id); if(el) el.textContent=val; }

  function styleRtog(btn, on) {
    if(!btn) return;
    btn.textContent   = on ? '●' : '○';
    btn.style.background  = on ? 'rgba(184,115,51,0.2)' : 'rgba(232,223,200,0.03)';
    btn.style.borderColor = on ? 'rgba(184,115,51,0.45)' : 'rgba(184,115,51,0.12)';
    btn.style.color       = on ? '#d4954a' : 'rgba(232,223,200,0.2)';
  }
  function styleToggle(btn, on) {
    btn.textContent = on?'ON':'OFF';
    btn.style.background  = on?'rgba(184,115,51,0.25)':'rgba(232,223,200,0.04)';
    btn.style.borderColor = on?'rgba(184,115,51,0.5)':'rgba(184,115,51,0.18)';
    btn.style.color       = on?'#d4954a':'rgba(232,223,200,0.35)';
  }

  function applyDefaults() {
    lineDensity=VIS_DEFAULTS.lineDensity; geoSpeed=VIS_DEFAULTS.geoSpeed;
    geoOpacity=VIS_DEFAULTS.geoOpacity; geoLineWidth=VIS_DEFAULTS.geoLineWidth;
    lateralAmp=VIS_DEFAULTS.lateralAmp; tunnelStrength=VIS_DEFAULTS.tunnelStrength;
    moteCount=VIS_DEFAULTS.moteCount; floatCount=VIS_DEFAULTS.floatCount;
    wispsOn=VIS_DEFAULTS.wispsOn; motesOn=VIS_DEFAULTS.motesOn;
    scrollGeoOn=VIS_DEFAULTS.scrollGeoOn;
    beatThreshold=1.65; beatSpikeSize=2.5; beatDensitySpike=8; beatSwaySpike=0.04;
    document.getElementById('ctl_density').value   = lineDensity;
    document.getElementById('ctl_speed').value     = geoSpeed;
    document.getElementById('ctl_opacity').value   = geoOpacity;
    document.getElementById('ctl_lwidth').value    = geoLineWidth;
    document.getElementById('ctl_lateral').value   = lateralAmp;
    document.getElementById('ctl_tunnel').value    = tunnelStrength;
    document.getElementById('ctl_motecount').value = moteCount;
    lbl('density',   lineDensity);
    lbl('speed',     geoSpeed.toFixed(2)+'×');
    lbl('opacity',   geoOpacity.toFixed(2)+'×');
    lbl('lwidth',    geoLineWidth.toFixed(1)+'×');
    lbl('lateral',   lateralAmp.toFixed(3));
    lbl('tunnel',    tunnelStrength.toFixed(1));
    lbl('motecount', moteCount);
    styleToggle(document.getElementById('ctl_motes'), motesOn);
    styleToggle(document.getElementById('ctl_wisps'), wispsOn);
    bassToSpeed=true; bassToSway=true; bassToDensity=false;
    midToSpeed=false; midToSway=false; midToDensity=true;
    trebleToSpeed=false; trebleToSway=false; trebleToDensity=true;
    [['ctl_bass_speed',bassToSpeed],['ctl_bass_sway',bassToSway],['ctl_bass_density',bassToDensity],
     ['ctl_mid_speed',midToSpeed],['ctl_mid_sway',midToSway],['ctl_mid_density',midToDensity],
     ['ctl_treble_speed',trebleToSpeed],['ctl_treble_sway',trebleToSway],['ctl_treble_density',trebleToDensity]]
    .forEach(([id,on])=>{ const el=document.getElementById(id); if(el) styleRtog(el,on); });
    styleToggle(document.getElementById('ctl_scroll_geo'), scrollGeoOn);
    const tEl=document.getElementById('lbl_threshold'); if(tEl) tEl.textContent=beatThreshold.toFixed(2);
    const sEl=document.getElementById('lbl_spike');     if(sEl) sEl.textContent=beatSpikeSize.toFixed(1)+'×';
    const dEl=document.getElementById('lbl_dspike');    if(dEl) dEl.textContent=beatDensitySpike;
    const wEl=document.getElementById('lbl_sspike');    if(wEl) wEl.textContent=beatSwaySpike.toFixed(3);
    const thEl=document.getElementById('ctl_threshold'); if(thEl) thEl.value=beatThreshold;
    const spEl=document.getElementById('ctl_spike');     if(spEl) spEl.value=beatSpikeSize;
    const dsEl=document.getElementById('ctl_dspike');    if(dsEl) dsEl.value=beatDensitySpike;
    const ssEl=document.getElementById('ctl_sspike');    if(ssEl) ssEl.value=beatSwaySpike;
  }
  function applySiteDefaults() {
    lineDensity=SITE_DEFAULTS.lineDensity; geoSpeed=SITE_DEFAULTS.geoSpeed;
    geoOpacity=SITE_DEFAULTS.geoOpacity; geoLineWidth=SITE_DEFAULTS.geoLineWidth;
    lateralAmp=SITE_DEFAULTS.lateralAmp; tunnelStrength=SITE_DEFAULTS.tunnelStrength;
    moteCount=SITE_DEFAULTS.moteCount; floatCount=SITE_DEFAULTS.floatCount;
    wispsOn=SITE_DEFAULTS.wispsOn; motesOn=SITE_DEFAULTS.motesOn;
    scrollGeoOn=SITE_DEFAULTS.scrollGeoOn;
    bassToSpeed=false; bassToSway=false; bassToDensity=false;
    midToSpeed=false; midToSway=false; midToDensity=false;
    trebleToSpeed=false; trebleToSway=false; trebleToDensity=false;
    if(panel.style.opacity === '1') {
      document.getElementById('ctl_density').value   = lineDensity;
      document.getElementById('ctl_speed').value     = geoSpeed;
      document.getElementById('ctl_opacity').value   = geoOpacity;
      document.getElementById('ctl_lwidth').value    = geoLineWidth;
      document.getElementById('ctl_lateral').value   = lateralAmp;
      document.getElementById('ctl_tunnel').value    = tunnelStrength;
      document.getElementById('ctl_motecount').value = moteCount;
      lbl('density',   lineDensity);
      lbl('speed',     geoSpeed.toFixed(2)+'×');
      lbl('opacity',   geoOpacity.toFixed(2)+'×');
      lbl('lwidth',    geoLineWidth.toFixed(1)+'×');
      lbl('lateral',   lateralAmp.toFixed(3));
      lbl('tunnel',    tunnelStrength.toFixed(1));
      lbl('motecount', moteCount);
      styleToggle(document.getElementById('ctl_motes'), motesOn);
      styleToggle(document.getElementById('ctl_wisps'), wispsOn);
      [['ctl_bass_speed',bassToSpeed],['ctl_bass_sway',bassToSway],['ctl_bass_density',bassToDensity],
       ['ctl_mid_speed',midToSpeed],['ctl_mid_sway',midToSway],['ctl_mid_density',midToDensity],
       ['ctl_treble_speed',trebleToSpeed],['ctl_treble_sway',trebleToSway],['ctl_treble_density',trebleToDensity]]
      .forEach(([id,on])=>{ const el=document.getElementById(id); if(el) styleRtog(el,on); });
      styleToggle(document.getElementById('ctl_scroll_geo'), scrollGeoOn);
    }
  }
  applyDefaults();
  applySiteDefaults();

  // Slider + toggle event handlers
  document.getElementById('ctl_density').addEventListener('input',   function(){ lineDensity=parseInt(this.value);      lbl('density',   lineDensity); });
  document.getElementById('ctl_speed').addEventListener('input',     function(){ geoSpeed=parseFloat(this.value);       lbl('speed',     geoSpeed.toFixed(2)+'×'); });
  document.getElementById('ctl_opacity').addEventListener('input',   function(){ geoOpacity=parseFloat(this.value);     lbl('opacity',   geoOpacity.toFixed(2)+'×'); });
  document.getElementById('ctl_lwidth').addEventListener('input',    function(){ geoLineWidth=parseFloat(this.value);   lbl('lwidth',    geoLineWidth.toFixed(1)+'×'); });
  document.getElementById('ctl_lateral').addEventListener('input',   function(){ lateralAmp=parseFloat(this.value);     lbl('lateral',   lateralAmp.toFixed(3)); });
  document.getElementById('ctl_tunnel').addEventListener('input',    function(){ tunnelStrength=parseFloat(this.value); lbl('tunnel',    tunnelStrength.toFixed(1)); });
  document.getElementById('ctl_motecount').addEventListener('input', function(){ moteCount=parseInt(this.value);        lbl('motecount', moteCount); });
  document.getElementById('ctl_motes').addEventListener('click',     function(){ motesOn=!motesOn;       styleToggle(this, motesOn); });
  document.getElementById('ctl_wisps').addEventListener('click',     function(){ wispsOn=!wispsOn;       styleToggle(this, wispsOn); });
  document.getElementById('ctl_scroll_geo').addEventListener('click',function(){ scrollGeoOn=!scrollGeoOn; styleToggle(this, scrollGeoOn); });
  // Mic routing toggles — each is fully independent
  document.getElementById('ctl_bass_speed').addEventListener('click',     function(){ bassToSpeed=!bassToSpeed;       styleRtog(this,bassToSpeed); });
  document.getElementById('ctl_bass_sway').addEventListener('click',      function(){ bassToSway=!bassToSway;         styleRtog(this,bassToSway); });
  document.getElementById('ctl_bass_density').addEventListener('click',   function(){ bassToDensity=!bassToDensity;   styleRtog(this,bassToDensity); });
  document.getElementById('ctl_mid_speed').addEventListener('click',      function(){ midToSpeed=!midToSpeed;         styleRtog(this,midToSpeed); });
  document.getElementById('ctl_mid_sway').addEventListener('click',       function(){ midToSway=!midToSway;           styleRtog(this,midToSway); });
  document.getElementById('ctl_mid_density').addEventListener('click',    function(){ midToDensity=!midToDensity;     styleRtog(this,midToDensity); });
  document.getElementById('ctl_treble_speed').addEventListener('click',   function(){ trebleToSpeed=!trebleToSpeed;   styleRtog(this,trebleToSpeed); });
  document.getElementById('ctl_treble_sway').addEventListener('click',    function(){ trebleToSway=!trebleToSway;     styleRtog(this,trebleToSway); });
  document.getElementById('ctl_treble_density').addEventListener('click', function(){ trebleToDensity=!trebleToDensity; styleRtog(this,trebleToDensity); });
  document.getElementById('ctl_reset').addEventListener('click',     applyDefaults);
  document.getElementById('ctl_reset').addEventListener('mouseenter',function(){ this.style.color='rgba(184,115,51,0.9)'; this.style.borderColor='rgba(184,115,51,0.5)'; });
  document.getElementById('ctl_reset').addEventListener('mouseleave',function(){ this.style.color='rgba(184,115,51,0.6)'; this.style.borderColor='rgba(184,115,51,0.2)'; });

  // Mic toggle
  document.getElementById('ctl_mic').addEventListener('click', async function() {
    if(micOn) {
      micOn = false; micAnalyser = null; micDataArray = null;
      this.textContent = 'OFF';
      this.style.background='rgba(232,223,200,0.04)'; this.style.borderColor='rgba(184,115,51,0.18)'; this.style.color='rgba(232,223,200,0.35)';
      ['mic_level','mic_bass','mic_mid','mic_treble'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.width='0%'; });
    } else {
      this.textContent = '...';
      const ok = await enableMic();
      if(ok) {
        this.textContent='ON'; this.style.background='rgba(74,173,171,0.2)'; this.style.borderColor='rgba(74,173,171,0.5)'; this.style.color='rgba(74,173,171,0.9)';
      } else {
        this.textContent='DENIED'; this.style.color='rgba(160,70,42,0.8)'; this.style.borderColor='rgba(160,70,42,0.4)';
      }
    }
  });
  document.getElementById('ctl_threshold').addEventListener('input', function(){
    beatThreshold=parseFloat(this.value);
    const el=document.getElementById('lbl_threshold'); if(el) el.textContent=beatThreshold.toFixed(2);
  });
  document.getElementById('ctl_spike').addEventListener('input', function(){
    beatSpikeSize=parseFloat(this.value);
    const el=document.getElementById('lbl_spike'); if(el) el.textContent=beatSpikeSize.toFixed(1)+'×';
  });
  document.getElementById('ctl_dspike').addEventListener('input', function(){
    beatDensitySpike=parseInt(this.value);
    const el=document.getElementById('lbl_dspike'); if(el) el.textContent=beatDensitySpike;
  });
  document.getElementById('ctl_sspike').addEventListener('input', function(){
    beatSwaySpike=parseFloat(this.value);
    const el=document.getElementById('lbl_sspike'); if(el) el.textContent=beatSwaySpike.toFixed(3);
  });

  // ── FULLSCREEN ───────────────────────────────────────────────────
  // inFullscreen is declared at module scope (above) so the draw loop can read it
  // Snapshot of geo state before entering fullscreen so we can restore on exit
  let fsSnapshot = null;

  const FS_PRESET = { geoLineWidth:1.0, wispsOn:false, geoOpacity:1.0 };

  function applyFsPreset() {
    geoLineWidth = FS_PRESET.geoLineWidth;
    wispsOn      = FS_PRESET.wispsOn;
    geoOpacity   = FS_PRESET.geoOpacity;
    const lw = document.getElementById('ctl_lwidth');   if(lw) { lw.value=geoLineWidth; lbl('lwidth', geoLineWidth.toFixed(1)+'×'); }
    const op = document.getElementById('ctl_opacity');  if(op) { op.value=geoOpacity;   lbl('opacity', geoOpacity.toFixed(2)+'×'); }
    styleToggle(document.getElementById('ctl_wisps'),    wispsOn);
  }

  function snapshotGeo() {
    return { geoLineWidth, wispsOn, geoOpacity };
  }

  function restoreGeo(snap) {
    geoLineWidth = snap.geoLineWidth;
    wispsOn      = snap.wispsOn;
    geoOpacity   = snap.geoOpacity;
    const lw = document.getElementById('ctl_lwidth');   if(lw) { lw.value=geoLineWidth; lbl('lwidth', geoLineWidth.toFixed(1)+'×'); }
    const op = document.getElementById('ctl_opacity');  if(op) { op.value=geoOpacity;   lbl('opacity', geoOpacity.toFixed(2)+'×'); }
    styleToggle(document.getElementById('ctl_wisps'),    wispsOn);
  }

  function enterFullscreen() {
    inFullscreen = true;
    smoothScroll = 0;
    fsSnapshot = snapshotGeo();
    applyFsPreset();
    document.body.style.overflow = 'hidden';
    const cvs = document.getElementById('bgCanvas');
    if(cvs){ cvs.style.position='fixed'; cvs.style.inset='0'; cvs.style.zIndex='1'; }
    Array.from(document.body.children).forEach(el => {
      if(el.id !== 'debugPanel' && el !== cvs){
        el.dataset.fsSave = el.style.display||'';
        el.style.display = 'none';
      }
    });
    panel.style.top = '20px';
    const fb = document.getElementById('ctl_fullscreen');
    fb.textContent = '✕ Exit'; fb.style.color = 'rgba(160,70,42,0.85)';
  }

  function exitFullscreen() {
    inFullscreen = false;
    if(fsSnapshot) { restoreGeo(fsSnapshot); fsSnapshot = null; }
    document.body.style.overflow = '';
    const cvs = document.getElementById('bgCanvas');
    if(cvs){ cvs.style.position=''; cvs.style.inset=''; cvs.style.zIndex=''; }
    Array.from(document.body.children).forEach(el => {
      if('fsSave' in el.dataset){ el.style.display=el.dataset.fsSave; delete el.dataset.fsSave; }
    });
    panel.style.top = '60px';
    const fb = document.getElementById('ctl_fullscreen');
    fb.textContent = '⛶ Full'; fb.style.color = 'rgba(74,173,171,0.7)';
  }

  document.getElementById('ctl_fullscreen').addEventListener('click', ()=> inFullscreen ? exitFullscreen() : enterFullscreen());

  // ── ARROW KEY NAVIGATION ─────────────────────────────────────────
  const ROWS = ['density','speed','opacity','lwidth','lateral','tunnel','motecount','toggles','geo'];
  const CFG = {
    density:   { type:'slider', id:'ctl_density',   step:1,     min:1,    max:36   },
    speed:     { type:'slider', id:'ctl_speed',     step:0.05,  min:0.1,  max:4    },
    opacity:   { type:'slider', id:'ctl_opacity',   step:0.05,  min:0.1,  max:3    },
    lwidth:    { type:'slider', id:'ctl_lwidth',    step:0.1,   min:0.2,  max:4    },
    lateral:   { type:'slider', id:'ctl_lateral',   step:0.002, min:0,    max:0.08 },
    tunnel:    { type:'slider', id:'ctl_tunnel',    step:0.1,   min:0,    max:4    },
    motecount: { type:'slider', id:'ctl_motecount', step:1,     min:0,    max:120  },
    toggles:   { type:'toggles', ids:['ctl_motes','ctl_wisps'], cur:0 },
    geo:       { type:'toggles', ids:['ctl_scroll_geo'], cur:0 },
  };

  let curRow = 0;

  function setRowHighlight(idx) {
    document.querySelectorAll('.dbrow').forEach((r,i) => {
      r.style.background = i===idx ? 'rgba(184,115,51,0.1)' : '';
      r.style.outline    = i===idx ? '1px solid rgba(184,115,51,0.2)' : '';
    });
  }
  setRowHighlight(curRow);

  document.addEventListener('keydown', e => {
    // Escape — exit fullscreen (always on)
    if(e.key === 'Escape' && inFullscreen) { exitFullscreen(); return; }
    if (!window.__debugMode) return;

    // 1 — main debug panel, 2 — freq band panel
    if(e.key === '2') {
      const fp = document.getElementById('freqPanel');
      if(fp) fp.style.display = fp.style.display === 'none' ? 'block' : 'none';
      return;
    }
    if(e.key === '1') {
      const hidden = panel.style.opacity === '0';
      panel.style.opacity = hidden ? '1' : '0';
      panel.style.pointerEvents = hidden ? 'all' : 'none';
      if(hidden) applyDefaults(); else applySiteDefaults();
      return;
    }

    // Arrow keys — only when no text input focused
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();

      if(e.key === 'ArrowUp') {
        curRow = (curRow - 1 + ROWS.length) % ROWS.length;
        CFG.toggles.cur = 0;
        setRowHighlight(curRow);
        return;
      }
      if(e.key === 'ArrowDown') {
        curRow = (curRow + 1) % ROWS.length;
        CFG.toggles.cur = 0;
        setRowHighlight(curRow);
        return;
      }

      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const cfg = CFG[ROWS[curRow]];

      if(cfg.type === 'slider') {
        const el = document.getElementById(cfg.id);
        const v = Math.min(cfg.max, Math.max(cfg.min, parseFloat(el.value) + cfg.step * dir));
        el.value = v;
        el.dispatchEvent(new Event('input'));
      } else if(cfg.type === 'toggles') {
        // Left/right picks which toggle; fires it
        cfg.cur = (cfg.cur + (dir===1?1:-1) + cfg.ids.length) % cfg.ids.length;
        document.getElementById(cfg.ids[cfg.cur]).click();
      }
    }
  });

})();

// HERO TUNING PANEL — padding, type sizes, wheel size per viewport
(function(){
  const panel = document.createElement('div');
  panel.id = 'heroTuningPanel';
  panel.style.cssText = [
    'position:fixed','bottom:20px','left:20px','z-index:610','width:260px',
    'background:rgba(14,13,11,0.95)','backdrop-filter:blur(8px)','-webkit-backdrop-filter:blur(8px)',
    'border:1px solid rgba(74,173,171,0.5)','border-radius:3px',
  'padding:12px 14px 14px','font-family:\"Libre Baskerville\",Georgia,serif',
  'color:rgba(232,223,200,0.85)','font-size:0.75rem','letter-spacing:0.06em',
  'pointer-events:all','user-select:text','opacity:0','transition:opacity 0.2s',
  'max-height:70vh','overflow-y:auto'
  ].join(';');

  function row(label, id, min, max, step) {
    return `<label style="display:block;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span>${label}</span>
        <span id="hero_lbl_${id}" style="color:#4aadab"></span>
      </div>
      <input type="range" id="hero_${id}" min="${min}" max="${max}" step="${step}" style="width:100%;accent-color:#4aadab">
    </label>`;
  }

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(74,173,171,0.4);padding-bottom:6px">
      <span style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.12em;color:#4aadab">Hero tuning</span>
      <span id="hero_bp" style="font-size:0.7rem;opacity:0.75"></span>
    </div>

    <div style="margin:4px 0 2px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.16em;color:rgba(232,223,200,0.65);border-bottom:1px solid rgba(74,173,171,0.3);padding-bottom:2px;">Layout</div>
    ${row('Hero pad top','padTop',0,400,2)}
    ${row('Hero pad bottom','padBottom',0,400,2)}
    ${row('Hero pad X','padSides',0,120,2)}
    ${row('Wheel scale','wheelScale',80,320,2)}

    <div style="margin:6px 0 2px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.16em;color:rgba(232,223,200,0.65);border-bottom:1px solid rgba(74,173,171,0.3);padding-bottom:2px;">Title & copy</div>
    ${row('Title offset','titleTop',-200,200,2)}
    ${row('Title size','h1Size',56,320,1)}
    ${row('Subtitle offset','subTop',-200,200,2)}
    ${row('Subtitle size','subSize',32,144,1)}
    ${row('Venue offset','venueTop',-200,200,2)}
    ${row('Venue size','venueSize',24,120,1)}
    ${row('CTA offset','ctaTop',-200,200,2)}
    ${row('CTA text size','ctaSize',28,120,1)}
    ${row('CTA box pad','ctaBox',0,240,2)}

    <div style="margin:6px 0 2px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.16em;color:rgba(232,223,200,0.65);border-bottom:1px solid rgba(74,173,171,0.3);padding-bottom:2px;">Date line</div>
    ${row('Date offset','badgeTop',-200,200,2)}
    ${row('Date text size','badgeSize',24,160,1)}
    ${row('Date box pad','badgeBox',0,260,2)}

    <div style="margin:6px 0 2px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.16em;color:rgba(232,223,200,0.65);border-bottom:1px solid rgba(74,173,171,0.3);padding-bottom:2px;">Nav bar</div>
    ${row('Nav pad Y','navPad',0,80,1)}
    ${row('Nav font size','navFont',8,32,0.5)}
    ${row('Nav text pad Y','navTextPad',-20,40,1)}
    ${row('Nav letter spacing','navLetter',0,40,0.5)}
    ${row('Nav max width','navMax',400,1600,10)}

    <button id="hero_copy" style="margin-top:8px;width:100%;padding:6px 0;border-radius:2px;border:1px solid rgba(74,173,171,0.6);background:rgba(74,173,171,0.08);color:#4aadab;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer">Copy current hero settings</button>
    <div style="margin-top:4px;font-size:0.68rem;opacity:0.6;">Press 3 to toggle panel. Values are per current viewport width.</div>
  `;
  document.body.appendChild(panel);

  const hero = document.getElementById('hero');
  const nav = document.querySelector('nav');
  const navInner = document.querySelector('.nav-inner');
  const badge = hero ? hero.querySelector('.badge') : null;
  const h1 = hero ? hero.querySelector('h1') : null;
  const sub = hero ? hero.querySelector('.title-hand') : null;
  const venue = hero ? hero.querySelector('.hero-venue') : null;
  const cta = hero ? hero.querySelector('.hero-cta') : null;
  const root = document.documentElement;

  function px(num){ return Math.round(num) + 'px'; }
  function setLbl(id, val, suffix){ const el=document.getElementById('hero_lbl_'+id); if(el) el.textContent=val + (suffix||''); }

  function syncFromDOM() {
    if(!hero || !badge || !h1 || !sub || !venue || !cta || !nav || !navInner) return;
    const sHero = getComputedStyle(hero);
    const sBadge = getComputedStyle(badge);
    const sH1 = getComputedStyle(h1);
    const sSub = getComputedStyle(sub);
    const sVenue = getComputedStyle(venue);
    const sCta = getComputedStyle(cta);
    const sunScale = parseFloat(getComputedStyle(root).getPropertyValue('--hero-sun-scale') || '1');
    const sNav = getComputedStyle(nav);
    const sNavInner = getComputedStyle(navInner);
    const firstNavLink = nav.querySelector('a');
    const sNavLink = firstNavLink ? getComputedStyle(firstNavLink) : null;

    const padTop = parseInt(sHero.paddingTop,10) || 0;
    const padBottom = parseInt(sHero.paddingBottom,10) || 0;
    const padSides = parseInt(sHero.paddingLeft,10) || 0;
    const navPad = parseInt(sNav.paddingTop,10) || 0;
    const navMax = parseInt(sNavInner.maxWidth,10) || navInner.clientWidth || 0;
    const badgeTop = parseInt(sBadge.marginTop,10) || 0;
    const h1Top = parseInt(sH1.marginTop,10) || 0;
    const subTop = parseInt(sSub.marginTop,10) || 0;
    const venueTop = parseInt(sVenue.marginTop,10) || 0;
    const ctaTop = parseInt(sCta.marginTop,10) || 0;
    const badgeSize = parseFloat(sBadge.fontSize) || 0;
    const badgeBox = parseInt(sBadge.paddingTop,10) || 0;
    const navFont = sNavLink ? parseFloat(sNavLink.fontSize) || 0 : 0;
    const h1Size = parseFloat(sH1.fontSize) || 0;
    const subSize = parseFloat(sSub.fontSize) || 0;
    const venueSize = parseFloat(sVenue.fontSize) || 0;
    const ctaSize = parseFloat(sCta.fontSize) || 0;
    const ctaPadY = parseInt(sCta.paddingTop,10) || 0;
    // Use nav link margin for vertical row spacing so we can go negative safely
    const navTextPad = sNavLink ? parseInt(sNavLink.marginTop,10) || 0 : 0;

    document.getElementById('hero_padTop').value = padTop;
    document.getElementById('hero_padBottom').value = padBottom;
    document.getElementById('hero_padSides').value = padSides;
    document.getElementById('hero_navPad').value = navPad;
    document.getElementById('hero_navMax').value = navMax;
    document.getElementById('hero_badgeTop').value = badgeTop;
    document.getElementById('hero_badgeSize').value = badgeSize;
    document.getElementById('hero_badgeBox').value = badgeBox;
    if(navFont) document.getElementById('hero_navFont').value = navFont;
    const navLetter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-letter-spacing')) || 0;
    document.getElementById('hero_navLetter').value = navLetter * 100; // store as "hundredths of em" for finer control
    document.getElementById('hero_navTextPad').value = navTextPad;
    document.getElementById('hero_titleTop').value = h1Top;
    document.getElementById('hero_subTop').value = subTop;
    document.getElementById('hero_venueTop').value = venueTop;
    document.getElementById('hero_ctaTop').value = ctaTop;
    document.getElementById('hero_h1Size').value = h1Size;
    document.getElementById('hero_subSize').value = subSize;
    document.getElementById('hero_venueSize').value = venueSize;
    document.getElementById('hero_ctaSize').value = ctaSize;
    document.getElementById('hero_wheelScale').value = sunScale * 100;
    document.getElementById('hero_ctaBox').value = ctaPadY;

    setLbl('padTop', padTop,'px');
    setLbl('padBottom', padBottom,'px');
    setLbl('padSides', padSides,'px');
    setLbl('navPad', navPad,'px');
    setLbl('navMax', navMax,'px');
    setLbl('badgeTop', badgeTop,'px');
    setLbl('badgeSize', Math.round(badgeSize),'px');
    setLbl('badgeBox', badgeBox,'px');
    if(navFont) setLbl('navFont', Math.round(navFont),'px');
    setLbl('navLetter', navLetter.toFixed(2),'em');
    setLbl('navTextPad', navTextPad,'px');
    setLbl('titleTop', h1Top,'px');
    setLbl('subTop', subTop,'px');
    setLbl('venueTop', venueTop,'px');
    setLbl('ctaTop', ctaTop,'px');
    setLbl('h1Size', Math.round(h1Size),'px');
    setLbl('subSize', Math.round(subSize),'px');
    setLbl('venueSize', Math.round(venueSize),'px');
    setLbl('ctaSize', Math.round(ctaSize),'px');
    setLbl('ctaBox', ctaPadY,'px');
    setLbl('wheelScale', (sunScale).toFixed(2),'×');

    const bp = window.innerWidth;
    const bpEl = document.getElementById('hero_bp');
    if(bpEl) bpEl.textContent = `${bp}px`;
  }

  const MOBILE_BREAKPOINT = 700;

  function applyFromControls() {
    if(!hero || !badge || !h1 || !sub || !venue || !cta || !nav || !navInner) return;
    const padTop = parseInt(document.getElementById('hero_padTop').value,10);
    const padBottom = parseInt(document.getElementById('hero_padBottom').value,10);
    const padSides = parseInt(document.getElementById('hero_padSides').value,10);
    const navPad = parseInt(document.getElementById('hero_navPad').value,10);
    const navMax = parseInt(document.getElementById('hero_navMax').value,10);
    const badgeTop = parseInt(document.getElementById('hero_badgeTop').value,10);
    const badgeSize = parseInt(document.getElementById('hero_badgeSize').value,10);
    const badgeBox = parseInt(document.getElementById('hero_badgeBox').value,10);
    const h1Top = parseInt(document.getElementById('hero_titleTop').value,10);
    const subTop = parseInt(document.getElementById('hero_subTop').value,10);
    const venueTop = parseInt(document.getElementById('hero_venueTop').value,10);
    const ctaTop = parseInt(document.getElementById('hero_ctaTop').value,10);
    const h1Size = parseInt(document.getElementById('hero_h1Size').value,10);
    const subSize = parseInt(document.getElementById('hero_subSize').value,10);
    const venueSize = parseInt(document.getElementById('hero_venueSize').value,10);
    const ctaSize = parseInt(document.getElementById('hero_ctaSize').value,10);
    const wheelPct = parseInt(document.getElementById('hero_wheelScale').value,10);
    const ctaBox = parseInt(document.getElementById('hero_ctaBox').value,10);
    const navFont = parseFloat(document.getElementById('hero_navFont').value);
    const navLetter = parseFloat(document.getElementById('hero_navLetter').value) / 100;
    const navTextPad = parseInt(document.getElementById('hero_navTextPad').value,10);

    hero.style.paddingTop = px(padTop);
    hero.style.paddingBottom = px(padBottom);
    if(!isNaN(padSides)){
      hero.style.paddingLeft = px(padSides);
      hero.style.paddingRight = px(padSides);
    }
    nav.style.paddingTop = px(navPad);
    nav.style.paddingBottom = px(navPad);
    if(navMax){ navInner.style.maxWidth = px(navMax); }
    badge.style.marginTop = px(badgeTop);
    badge.style.fontSize = px(badgeSize);
    badge.style.padding = px(badgeBox) + ' ' + px(badgeBox * 2);
    h1.style.marginTop = px(h1Top);
    sub.style.marginTop = px(subTop);
    venue.style.marginTop = px(venueTop);
    cta.style.marginTop = px(ctaTop);
    h1.style.fontSize = px(h1Size);
    sub.style.fontSize = px(subSize);
    venue.style.fontSize = px(venueSize);
    cta.style.fontSize = px(ctaSize);
    // Use vertical padding slider and derive horizontal padding as 2× for a stable shape
    cta.style.padding = px(ctaBox) + ' ' + px(ctaBox * 2);
    if(navFont){
      nav.querySelectorAll('a').forEach(a => {
        a.style.fontSize = px(navFont);
      });
    }
    if(!isNaN(navTextPad)){
      nav.querySelectorAll('a').forEach(a => {
        a.style.marginTop = px(navTextPad);
        a.style.marginBottom = px(navTextPad);
      });
    }
    document.documentElement.style.setProperty('--nav-letter-spacing', navLetter + 'em');
    root.style.setProperty('--hero-sun-scale', (wheelPct/100).toFixed(2));

    setLbl('padTop', padTop,'px');
    setLbl('padBottom', padBottom,'px');
    setLbl('padSides', padSides,'px');
    setLbl('navPad', navPad,'px');
    setLbl('navMax', navMax,'px');
    setLbl('badgeTop', badgeTop,'px');
    setLbl('badgeSize', badgeSize,'px');
    setLbl('badgeBox', badgeBox,'px');
    setLbl('titleTop', h1Top,'px');
    setLbl('subTop', subTop,'px');
    setLbl('venueTop', venueTop,'px');
    setLbl('ctaTop', ctaTop,'px');
    setLbl('h1Size', h1Size,'px');
    setLbl('subSize', subSize,'px');
    setLbl('venueSize', venueSize,'px');
    setLbl('ctaSize', ctaSize,'px');
    setLbl('ctaBox', ctaBox,'px');
    setLbl('wheelScale', (wheelPct/100).toFixed(2),'×');
    if(navFont) setLbl('navFont', Math.round(navFont),'px');
    setLbl('navLetter', navLetter.toFixed(2),'em');
    if(!isNaN(navTextPad)) setLbl('navTextPad', navTextPad,'px');
  }

  function clearHeroPanelInlineStyles() {
    if(!hero || !nav || !navInner) return;
    hero.style.removeProperty('padding-top');
    hero.style.removeProperty('padding-bottom');
    hero.style.removeProperty('padding-left');
    hero.style.removeProperty('padding-right');
    nav.style.removeProperty('padding-top');
    nav.style.removeProperty('padding-bottom');
    navInner.style.removeProperty('max-width');
    if(badge){ badge.style.removeProperty('margin-top'); badge.style.removeProperty('font-size'); badge.style.removeProperty('padding'); }
    if(h1){ h1.style.removeProperty('margin-top'); h1.style.removeProperty('font-size'); }
    if(sub){ sub.style.removeProperty('margin-top'); sub.style.removeProperty('font-size'); }
    if(venue){ venue.style.removeProperty('margin-top'); venue.style.removeProperty('font-size'); }
    if(cta){ cta.style.removeProperty('margin-top'); cta.style.removeProperty('font-size'); cta.style.removeProperty('padding'); }
    nav.querySelectorAll('a').forEach(a => {
      a.style.removeProperty('font-size');
      a.style.removeProperty('margin-top');
      a.style.removeProperty('margin-bottom');
    });
    root.style.removeProperty('--nav-letter-spacing');
    root.style.removeProperty('--hero-sun-scale');
  }

  let lastViewportWidth = window.innerWidth;
  window.addEventListener('resize', function() {
    const w = window.innerWidth;
    if(w <= MOBILE_BREAKPOINT && lastViewportWidth > MOBILE_BREAKPOINT) clearHeroPanelInlineStyles();
    lastViewportWidth = w;
  });

  ['padTop','padBottom','padSides','navPad','navFont','navTextPad','navLetter','navMax','badgeTop','badgeSize','badgeBox','titleTop','subTop','venueTop','ctaTop','h1Size','subSize','venueSize','ctaSize','ctaBox','wheelScale'].forEach(id => {
    const el = panel.querySelector('#hero_'+id);
    if(el) el.addEventListener('input', applyFromControls);
  });

  const copyBtn = panel.querySelector('#hero_copy');
  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      const w = window.innerWidth;
      const payload = {
        width: w,
        padTop: parseInt(document.getElementById('hero_padTop').value,10),
        padBottom: parseInt(document.getElementById('hero_padBottom').value,10),
        padSides: parseInt(document.getElementById('hero_padSides').value,10),
        navPad: parseInt(document.getElementById('hero_navPad').value,10),
        navFont: parseFloat(document.getElementById('hero_navFont').value),
        navLetter: parseFloat(document.getElementById('hero_navLetter').value) / 100,
        navMax: parseInt(document.getElementById('hero_navMax').value,10),
        navTextPad: parseInt(document.getElementById('hero_navTextPad').value,10),
        badgeTop: parseInt(document.getElementById('hero_badgeTop').value,10),
        badgeSize: parseInt(document.getElementById('hero_badgeSize').value,10),
        badgeBox: parseInt(document.getElementById('hero_badgeBox').value,10),
        titleTop: parseInt(document.getElementById('hero_titleTop').value,10),
        subTop: parseInt(document.getElementById('hero_subTop').value,10),
        venueTop: parseInt(document.getElementById('hero_venueTop').value,10),
        ctaTop: parseInt(document.getElementById('hero_ctaTop').value,10),
        h1Size: parseInt(document.getElementById('hero_h1Size').value,10),
        subSize: parseInt(document.getElementById('hero_subSize').value,10),
        venueSize: parseInt(document.getElementById('hero_venueSize').value,10),
        ctaSize: parseInt(document.getElementById('hero_ctaSize').value,10),
        ctaBox: parseInt(document.getElementById('hero_ctaBox').value,10),
        wheelScale: parseInt(document.getElementById('hero_wheelScale').value,10) / 100
      };
      const text = 'hero-tune ' + JSON.stringify(payload, null, 2);
      if(navigator.clipboard && navigator.clipboard.writeText){
        try { await navigator.clipboard.writeText(text); }
        catch(e){ /* ignore */ }
      }
    });
  }

  function togglePanel() {
    if(panel.style.opacity === '1'){
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
      if(window.innerWidth <= MOBILE_BREAKPOINT) clearHeroPanelInlineStyles();
    } else {
      syncFromDOM();
      panel.style.opacity = '1';
      panel.style.pointerEvents = 'all';
    }
  }

  document.addEventListener('keydown', e => {
    if (!window.__debugMode) return;
    if(e.key === '3'){
      e.preventDefault();
      togglePanel();
    }
  });

})();

// RUNE BAR DEBUG PANEL — press R to toggle; Copy outputs rune-tune JSON for pasting into CSS/script
(function(){
  const DEFAULTS = {
    scrollOpacity: 0.54,
    periodSec: 55,
    travelPct: 33.33,
    bandPadY: 6,
    bandBorderOpacity: 0.16,
    bandFrostRadial: 0.08,
    bandFrostLinear: 0.035,
    bandFrostAfter: 0.02,
    trackGlowRadial: 0.12,
    trackGlowLinear: 0.075,
    trackBorderOpacity: 0.2,
    trackShadowHighlight: 0.04,
    grainOpacity: 0.05,
    trackAfterOpacity: 0.05,
    runeSize: 90,
    runeGap: 60,
    bandFrostLinearBottom: 0.035
  };
  let styleEl = null;
  function ensureStyle() {
    if(!styleEl){
      styleEl = document.createElement('style');
      styleEl.id = 'rune-debug-style';
      document.head.appendChild(styleEl);
    }
    return styleEl;
  }
  function applyRuneStyles(v){
    const cfg = window.__runeConfig;
    if(cfg){
      cfg.periodMs = (v.periodSec || DEFAULTS.periodSec) * 1000;
      cfg.travelPct = v.travelPct !== undefined ? v.travelPct : DEFAULTS.travelPct;
    }
    const s = v || DEFAULTS;
    const bandPad = s.bandPadY ?? DEFAULTS.bandPadY;
    const bandBorder = s.bandBorderOpacity ?? DEFAULTS.bandBorderOpacity;
    const bandRad = s.bandFrostRadial ?? DEFAULTS.bandFrostRadial;
    const bandLin = s.bandFrostLinear ?? DEFAULTS.bandFrostLinear;
    const bandAfter = s.bandFrostAfter ?? DEFAULTS.bandFrostAfter;
    const trackRad = s.trackGlowRadial ?? DEFAULTS.trackGlowRadial;
    const trackLin = s.trackGlowLinear ?? DEFAULTS.trackGlowLinear;
    const trackBorder = s.trackBorderOpacity ?? DEFAULTS.trackBorderOpacity;
    const trackShadow = s.trackShadowHighlight ?? DEFAULTS.trackShadowHighlight;
    const grain = s.grainOpacity ?? DEFAULTS.grainOpacity;
    const trackAfter = s.trackAfterOpacity ?? DEFAULTS.trackAfterOpacity;
    const runeSize = s.runeSize ?? DEFAULTS.runeSize;
    const runeGap = s.runeGap ?? DEFAULTS.runeGap;
    const scrollOp = s.scrollOpacity ?? DEFAULTS.scrollOpacity;
    ensureStyle();
    const enc = (n) => Math.round(n * 100) / 100;
    styleEl.textContent = `
.rune-band{ padding:${bandPad}px 0 !important; border-top-color:rgba(184,115,51,${enc(bandBorder)}) !important; border-bottom-color:rgba(184,115,51,${enc(bandBorder)}) !important; }
.rune-band::before{ background:radial-gradient(ellipse at 50% 50%,rgba(46,123,122,${enc(bandRad)}) 0%,transparent 60%),linear-gradient(to bottom,rgba(46,123,122,${enc(bandLin)}) 0,transparent 35%,transparent 65%,rgba(46,123,122,${enc(bandLin)}) 100%) !important; }
.rune-band::after{ background:linear-gradient(135deg,rgba(46,123,122,${enc(bandAfter)}) 0%,transparent 50%,rgba(160,70,42,${enc(bandAfter)}) 100%) !important; }
.rune-track{ background-image:radial-gradient(ellipse at 50% 50%,rgba(46,123,122,${enc(trackRad)}) 0%,rgba(10,9,7,1) 80%),linear-gradient(to bottom,rgba(46,123,122,${enc(trackLin)}) 0,transparent 40%,transparent 60%,rgba(46,123,122,${enc(trackLin)}) 100%) !important; border-top-color:rgba(184,115,51,${enc(trackBorder)}) !important; border-bottom-color:rgba(184,115,51,${enc(trackBorder)}) !important; box-shadow:0 2px 4px rgba(0,0,0,0.7),0 -1px 0 rgba(232,223,200,${enc(trackShadow)}) !important; }
.rune-track::before{ background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='${enc(grain)}'/%3E%3C/svg%3E") !important; }
.rune-track::after{ background:linear-gradient(135deg,rgba(46,123,122,${enc(trackAfter)}) 0%,transparent 50%,rgba(160,70,42,${enc(trackAfter)}) 100%) !important; }
.rune-scroll{ opacity:${enc(scrollOp)} !important; }
.rune-scroll > *{ margin-right:${runeGap}px !important; }
.rune-scroll svg,.rune-scroll .rune-img{ width:${runeSize}px !important; height:auto !important; }
`;
  }
  function row(label, id, min, max, step, def) {
    const d = def !== undefined ? def : (typeof min === 'number' && min >= 0 && max > min ? min : 0);
    return `<label style="display:block;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span>${label}</span>
        <span id="rune_lbl_${id}" style="font-variant-numeric:tabular-nums">${d}</span>
      </div>
      <input type="range" id="rune_${id}" min="${min}" max="${max}" step="${step}" value="${d}" style="width:100%;accent-color:rgba(74,173,171,0.8)">
    </label>`;
  }
  const panel = document.createElement('div');
  panel.id = 'runeDebugPanel';
  panel.style.cssText = [
    'position:fixed','top:20px','right:20px','z-index:610','width:280px',
    'background:rgba(14,13,11,0.96)','backdrop-filter:blur(8px)','-webkit-backdrop-filter:blur(8px)',
    'border:1px solid rgba(184,115,51,0.45)','border-radius:3px',
    'padding:12px 14px 14px','font-family:\"Libre Baskerville\",Georgia,serif',
    'color:rgba(232,223,200,0.9)','font-size:0.72rem','letter-spacing:0.05em',
    'pointer-events:none','user-select:text','opacity:0','transition:opacity 0.2s',
    'max-height:85vh','overflow-y:auto'
  ].join(';');
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid rgba(184,115,51,0.4);padding-bottom:6px">
      <span style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.12em;color:var(--copper-l,#d4954a)">Rune bar</span>
    </div>
    <div style="margin:4px 0 2px;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(232,223,200,0.6);">Scroll</div>
    ${row('Scroll opacity','scrollOpacity',0,1,0.01,0.54)}
    ${row('Period (s)','periodSec',10,120,1,55)}
    ${row('Travel %','travelPct',10,50,0.5,33.33)}
    <div style="margin:6px 0 2px;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(232,223,200,0.6);">Outer band</div>
    ${row('Band pad Y','bandPadY',0,24,1,6)}
    ${row('Band border opacity','bandBorderOpacity',0,0.6,0.01,0.16)}
    ${row('Frost radial','bandFrostRadial',0,0.25,0.005,0.08)}
    ${row('Frost linear','bandFrostLinear',0,0.12,0.005,0.035)}
    ${row('Frost after','bandFrostAfter',0,0.08,0.005,0.02)}
    <div style="margin:6px 0 2px;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(232,223,200,0.6);">Inner track (glow)</div>
    ${row('Track glow radial','trackGlowRadial',0,0.3,0.01,0.12)}
    ${row('Track glow linear','trackGlowLinear',0,0.2,0.005,0.075)}
    ${row('Track border opacity','trackBorderOpacity',0,0.6,0.01,0.2)}
    ${row('Track shadow highlight','trackShadowHighlight',0,0.15,0.01,0.04)}
    <div style="margin:6px 0 2px;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(232,223,200,0.6);">Grain & overlay</div>
    ${row('Grain opacity','grainOpacity',0,0.2,0.01,0.05)}
    ${row('Track after opacity','trackAfterOpacity',0,0.15,0.005,0.05)}
    <div style="margin:6px 0 2px;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.14em;color:rgba(232,223,200,0.6);">Symbols</div>
    ${row('Rune size (px)','runeSize',40,160,2,90)}
    ${row('Gap between runes','runeGap',20,120,2,60)}
    <button id="rune_copy" style="margin-top:10px;width:100%;padding:8px 0;border-radius:2px;border:1px solid rgba(184,115,51,0.6);background:rgba(184,115,51,0.1);color:#d4954a;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer">Copy rune settings</button>
    <div style="margin-top:6px;font-size:0.65rem;opacity:0.65;">Press R to toggle. Paste JSON into script or bake into CSS.</div>
  `;
  document.body.appendChild(panel);
  function getValues() {
    const num = (id, def) => { const el = document.getElementById('rune_'+id); const v = el ? parseFloat(el.value) : def; return el && el.type === 'range' ? v : (el ? parseFloat(el.value) || def : def); };
    return {
      scrollOpacity: num('scrollOpacity', DEFAULTS.scrollOpacity),
      periodSec: num('periodSec', DEFAULTS.periodSec),
      travelPct: num('travelPct', DEFAULTS.travelPct),
      bandPadY: num('bandPadY', DEFAULTS.bandPadY),
      bandBorderOpacity: num('bandBorderOpacity', DEFAULTS.bandBorderOpacity),
      bandFrostRadial: num('bandFrostRadial', DEFAULTS.bandFrostRadial),
      bandFrostLinear: num('bandFrostLinear', DEFAULTS.bandFrostLinear),
      bandFrostAfter: num('bandFrostAfter', DEFAULTS.bandFrostAfter),
      trackGlowRadial: num('trackGlowRadial', DEFAULTS.trackGlowRadial),
      trackGlowLinear: num('trackGlowLinear', DEFAULTS.trackGlowLinear),
      trackBorderOpacity: num('trackBorderOpacity', DEFAULTS.trackBorderOpacity),
      trackShadowHighlight: num('trackShadowHighlight', DEFAULTS.trackShadowHighlight),
      grainOpacity: num('grainOpacity', DEFAULTS.grainOpacity),
      trackAfterOpacity: num('trackAfterOpacity', DEFAULTS.trackAfterOpacity),
      runeSize: num('runeSize', DEFAULTS.runeSize),
      runeGap: num('runeGap', DEFAULTS.runeGap)
    };
  }
  function syncLabels() {
    const v = getValues();
    const intIds = ['periodSec','bandPadY','runeSize','runeGap'];
    ['scrollOpacity','periodSec','travelPct','bandPadY','bandBorderOpacity','bandFrostRadial','bandFrostLinear','bandFrostAfter','trackGlowRadial','trackGlowLinear','trackBorderOpacity','trackShadowHighlight','grainOpacity','trackAfterOpacity','runeSize','runeGap'].forEach(id => {
      const el = document.getElementById('rune_lbl_'+id);
      if(!el) return;
      const val = v[id];
      if(val == null) { el.textContent = ''; return; }
      el.textContent = intIds.includes(id) ? Math.round(val) : (id === 'travelPct' ? Number(val).toFixed(2) : Number(val).toFixed(3));
    });
  }
  function onInput() {
    const v = getValues();
    applyRuneStyles(v);
    syncLabels();
  }
  ['scrollOpacity','periodSec','travelPct','bandPadY','bandBorderOpacity','bandFrostRadial','bandFrostLinear','bandFrostAfter','trackGlowRadial','trackGlowLinear','trackBorderOpacity','trackShadowHighlight','grainOpacity','trackAfterOpacity','runeSize','runeGap'].forEach(id => {
    const el = document.getElementById('rune_'+id);
    if(el) el.addEventListener('input', onInput);
  });
  document.getElementById('rune_copy').addEventListener('click', async () => {
    const payload = getValues();
    const text = 'rune-tune ' + JSON.stringify(payload, null, 2);
    if(navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); document.getElementById('rune_copy').textContent = 'Copied!'; setTimeout(() => { document.getElementById('rune_copy').textContent = 'Copy rune settings'; }, 1200); } catch(e){}
    }
  });
  function togglePanel() {
    const visible = panel.style.opacity === '1';
    if(visible){
      panel.style.opacity = '0';
      panel.style.pointerEvents = 'none';
      if(styleEl) styleEl.remove(); styleEl = null;
      if(window.__runeConfig){ window.__runeConfig.periodMs = DEFAULTS.periodSec * 1000; window.__runeConfig.travelPct = DEFAULTS.travelPct; }
    } else {
      panel.style.opacity = '1';
      panel.style.pointerEvents = 'all';
      onInput();
    }
  }
  document.addEventListener('keydown', e => {
    if (!window.__debugMode) return;
    if(e.key === 'r' || e.key === 'R'){
      e.preventDefault();
      togglePanel();
    }
  });
})();

function getFreqBand(analyser, dataArray, startBin, endBin) {
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for(let i = startBin; i < endBin; i++) sum += dataArray[i];
  return sum / (endBin - startBin);
}

function updateBeat(now) {
  // Always decay spikes toward base
  beatSpeedScroll += (1 - beatSpeedScroll) * 0.06;
  beatSpeedHero   += (1 - beatSpeedHero)   * 0.09;
  beatDensityAdd  += (0 - beatDensityAdd)  * 0.08;
  beatSwayAdd     += (0 - beatSwayAdd)     * 0.07;

  if(!micOn || !micAnalyser) return;

  const bass   = getFreqBand(micAnalyser, micDataArray, bassStart, bassEnd);
  const mid    = getFreqBand(micAnalyser, micDataArray, midStart,  midEnd);
  const treble = getFreqBand(micAnalyser, micDataArray, trebleStart, trebleEnd);
  const overall = (bass + treble) / 2;

  bassAvg   += (bass   - bassAvg)   * 0.04;
  midAvg    += (mid    - midAvg)    * 0.04;
  trebleAvg += (treble - trebleAvg) * 0.04;
  micAvg    += (overall - micAvg)   * 0.04;

  const bassRatio   = bassAvg   > minAvgGate ? bass   / bassAvg   : 1;
  const trebleRatio = trebleAvg > minAvgGate ? treble / trebleAvg : 1;

  const trebleNorm = Math.min(1, treble / normCeil);
  const midNorm    = Math.min(1, mid    / normCeil);
  const bassNorm   = Math.min(1, bass   / normCeil);
  const midRatio   = midAvg > minAvgGate ? mid / midAvg : 1;

  // Continuous routing
  if(trebleToDensity) beatDensityAdd += (trebleNorm * beatDensitySpike - beatDensityAdd) * 0.15;
  if(midToDensity)    beatDensityAdd += (midNorm    * beatDensitySpike - beatDensityAdd) * 0.15;
  if(bassToDensity)   beatDensityAdd += (bassNorm   * beatDensitySpike - beatDensityAdd) * 0.15;
  if(bassToSway)      beatSwayAdd    += (bassNorm   * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if(midToSway)       beatSwayAdd    += (midNorm    * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if(trebleToSway)    beatSwayAdd    += (trebleNorm * beatSwaySpike    - beatSwayAdd)    * 0.12;

  // Beat spike detection — fires on whichever band(s) cross threshold
  const bassHit   = bassRatio   > beatThreshold;
  const midHit    = midRatio    > beatThreshold;
  const trebleHit = trebleRatio > beatThreshold;
  const shouldFire = (bassHit || midHit || trebleHit) && now > beatCooldown;

  if(shouldFire) {
    beatCooldown = now + 180;
    if((bassHit && bassToSpeed) || (midHit && midToSpeed) || (trebleHit && trebleToSpeed)) {
      beatSpeedScroll = geoSpeed * (beatSpikeSize + Math.random() * 2.0);
      beatSpeedHero   = geoSpeed * (beatSpikeSize * 0.72 + Math.random() * 2.5);
    }
    if((bassHit && bassToSway) || (midHit && midToSway) || (trebleHit && trebleToSway))
      beatSwayAdd = beatSwaySpike * (1.5 + Math.random());
    if((bassHit && bassToDensity) || (midHit && midToDensity) || (trebleHit && trebleToDensity))
      beatDensityAdd = beatDensitySpike * (1.5 + Math.random());
  }

  // Update meters
  const lvlEl = document.getElementById('mic_level');
  if(lvlEl) {
    lvlEl.style.width = Math.min(100, (overall / 60) * 100) + '%';
    lvlEl.style.background = bassRatio > beatThreshold ? 'rgba(160,70,42,0.95)' : 'rgba(184,115,51,0.55)';
  }
  const bassEl = document.getElementById('mic_bass');
  if(bassEl) bassEl.style.width = Math.min(100, (bass / 80) * 100) + '%';
  const midEl = document.getElementById('mic_mid');
  if(midEl) midEl.style.width = Math.min(100, (mid / 70) * 100) + '%';
  const trebleEl = document.getElementById('mic_treble');
  if(trebleEl) trebleEl.style.width = Math.min(100, (treble / 60) * 100) + '%';
}

async function enableMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaStreamSource(stream);
    micAnalyser = actx.createAnalyser();
    micAnalyser.fftSize = 512;
    micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
    src.connect(micAnalyser);
    micOn = true; micAvg = 0; bassAvg = 0; midAvg = 0; trebleAvg = 0;
    return true;
  } catch(e) {
    console.warn('Mic access denied:', e);
    return false;
  }
}

// CANVAS — sacred geometry with 3D rotation + motes
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize(); window.addEventListener('resize', resize);
const TEAL=[46,123,122],COPPER=[184,115,51],RUST=[160,70,42],GOLD=[200,169,110];
function rgb(c,a){return `rgba(${c[0]},${c[1]},${c[2]},${a})`;}

// 3D rotation helpers — project a point rotated on X and Z axes onto 2D canvas
function project3D(px, py, pz, rotX, rotZ) {
  // Rotate around Z axis
  const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
  const x1 = px*cosZ - py*sinZ;
  const y1 = px*sinZ + py*cosZ;
  const z1 = pz;
  // Rotate around X axis
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const x2 = x1;
  const y2 = y1*cosX - z1*sinX;
  const z2 = y1*sinX + z1*cosX;
  // Simple perspective
  const fov = 2.8;
  const scale = fov / (fov + z2);
  return { x: x2*scale, y: y2*scale, s: scale };
}

// Draw a circle in 3D by sampling points around it
function draw3DArc(cx, cy, r, rotX, rotZ, startAng, endAng, steps) {
  const pts = [];
  const n = steps || 64;
  for(let i=0; i<=n; i++){
    const a = startAng + (endAng-startAng)*(i/n);
    const p = project3D(Math.cos(a)*r, Math.sin(a)*r, 0, rotX, rotZ);
    pts.push({x: cx+p.x, y: cy+p.y});
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

// Draw a 3D line from (ax,ay,0) to (bx,by,0)
function draw3DLine(cx, cy, ax, ay, bx, by, rotX, rotZ) {
  const pa = project3D(ax, ay, 0, rotX, rotZ);
  const pb = project3D(bx, by, 0, rotX, rotZ);
  ctx.beginPath();
  ctx.moveTo(cx+pa.x, cy+pa.y);
  ctx.lineTo(cx+pb.x, cy+pb.y);
  ctx.stroke();
}

const geomDefs = [
  // Big compass wheels: visualiser only, hidden in normal site mode
  { sym:6,  phase:0,    speed:0.000065, phase2:0,    speed2:-0.000042, maxAlpha:0.22, col:COPPER, x:0.38, y:0.42, size:3.8, period:70000, site:false },
  { sym:8,  phase:1.1,  speed:0.000048, phase2:0.5,  speed2: 0.000035, maxAlpha:0.18, col:TEAL,   x:0.62, y:0.55, size:4.2, period:85000, site:false },
  // Smaller geo layers (last two shared, the rust asterisk is visualiser-only)
  { sym:5,  phase:3.3,  speed:0.000078, phase2:1.2,  speed2:-0.000055, maxAlpha:0.16, col:GOLD,   x:0.45, y:0.62, size:3.2, period:60000 },
  { sym:7,  phase:2.2,  speed:0.000055, phase2:0.8,  speed2: 0.000044, maxAlpha:0.14, col:RUST,   x:0.58, y:0.38, size:4.6, period:90000, site:false },
  { sym:12, phase:5.1,  speed:0.000038, phase2:2.1,  speed2:-0.000028, maxAlpha:0.12, col:GOLD,   x:0.35, y:0.35, size:5.0, period:100000 },
];

function drawGeom(g, now) {
  const scrollReveal = 1;
  const formDur = g.period * 0.12, dissolveDur = g.period * 0.12;
  const holdDur = g.period - formDur - dissolveDur;
  const elapsed = ((now * 0.65 + g.phase*3000) % g.period + g.period) % g.period;
  let alpha;
  if(elapsed < formDur) alpha = (elapsed/formDur) * g.maxAlpha;
  else if(elapsed < formDur+holdDur) alpha = g.maxAlpha;
  else alpha = (1-(elapsed-formDur-holdDur)/dissolveDur)*g.maxAlpha;
  if(alpha <= 0.002) return;
  alpha *= scrollReveal * geoOpacity;

  // Scroll tunnel — shapes drift outward from centre as you scroll
  // Uses smoothScroll (lerped each frame) for gradual ramp
  const drift = smoothScroll * tunnelStrength;
  const lateralSway = Math.sin(now * 0.00008 + g.phase * 1.7) * (lateralAmp + beatSwayAdd) * W;
  const mouseLateral = (smoothMouseX - 0.5) * W * MOUSE_LATERAL_SCALE;
  const mouseVertical = (smoothMouseY - 0.5) * H * MOUSE_VERTICAL_SCALE;
  const cx = W * 0.5 + (g.x - 0.5) * W * (1 + drift) + lateralSway + mouseLateral;
  const cy = H * 0.5 + (g.y - 0.5) * H * (1 + drift) + mouseVertical;
  const R = Math.min(W, H) * g.size;
  const rot1 = g.phase  + now * g.speed * geoSpeed * beatSpeedScroll;
  const rot2 = g.phase2 + now * g.speed2 * geoSpeed * beatSpeedScroll;
  const sym = g.sym;
  const wedge = Math.PI * 2 / sym;

  ctx.save();
  ctx.strokeStyle = rgb(g.col, alpha);

  // Draw a single arm's worth of geometry, then stamp it sym times around the centre
  // This is the actual kaleidoscope/VJ technique
  function drawArm(rot) {
    // Nested cardioid-like spiral of circles along the arm
    const steps = Math.round(lineDensity + beatDensityAdd);
    for(let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Position along arm — exponential spacing for fractal feel
      const r = R * Math.pow(t, 1.4);
      // Each circle's radius shrinks as we go out — self-similar
      const cr = R * 0.38 * Math.pow(1 - t * 0.6, 1.2);
      if(cr < 1) continue;

      // Two interleaved spirals for complexity
      const a1 = rot + t * Math.PI * 3.2;
      const a2 = rot - t * Math.PI * 2.1 + Math.PI / sym;

      const x1 = cx + Math.cos(a1) * r;
      const y1 = cy + Math.sin(a1) * r;
      const x2 = cx + Math.cos(a2) * r * 0.72;
      const y2 = cy + Math.sin(a2) * r * 0.72;

      ctx.lineWidth = 0.5 * (1 - t * 0.5) * geoLineWidth;
      ctx.beginPath(); ctx.arc(x1, y1, cr, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 0.3 * (1 - t * 0.5) * geoLineWidth;
      ctx.beginPath(); ctx.arc(x2, y2 * 0.85, cr * 0.618, 0, Math.PI * 2); ctx.stroke();
    }

    // Concentric rings at key golden ratio radii — the anchor structure
    ctx.lineWidth = 0.6 * geoLineWidth;
    [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0.146].forEach(f => {
      ctx.beginPath(); ctx.arc(cx, cy, R * f, rot, rot + wedge); ctx.stroke();
    });

    // Radial lines — just two per arm so they frame rather than dominate
    ctx.lineWidth = 0.25 * geoLineWidth;
    ctx.strokeStyle = rgb(g.col, alpha * 0.4);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rot) * R, cy + Math.sin(rot) * R); ctx.stroke();
  }

  // Stamp the arm sym times with kaleidoscope symmetry
  for(let s = 0; s < sym; s++) {
    const angle = s * wedge;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    // Mirror every other slice for true kaleidoscope effect
    if(s % 2 === 1) {
      ctx.translate(cx, cy);
      ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = rgb(g.col, alpha);
    drawArm(rot1);
    // Second counter-rotating layer at lower opacity
    ctx.strokeStyle = rgb(g.col, alpha * 0.45);
    drawArm(rot2);
    ctx.restore();
  }

  ctx.restore();
}


// Sparks — spawn at bottom, drift up, occasional flash, cap at sparkMaxHeight
const sparks = Array.from({length:80},()=>({x:Math.random(),y:0.85+Math.random()*0.2,r:0.7+Math.random()*2,col:[TEAL,COPPER,GOLD,RUST][Math.floor(Math.random()*4)],vx:(Math.random()-0.5)*0.00009,vy:-(0.00007+Math.random()*0.00014),phase:Math.random()*Math.PI*2,speed:0.004+Math.random()*0.007,life:Math.random(),maxLife:0.4+Math.random()*0.5}));
// Floaters — ambient throughout canvas, gentle drift, no flash
const floaters = Array.from({length:40},()=>({x:Math.random(),y:Math.random(),r:1.5+Math.random()*3,col:[TEAL,COPPER,GOLD,RUST][Math.floor(Math.random()*4)],vx:(Math.random()-0.5)*0.0002,vy:-(0.0001+Math.random()*0.0003),phase:Math.random()*Math.PI*2,speed:0.003+Math.random()*0.005}));
const wisps = Array.from({length:4},()=>({x:Math.random(),y:0.3+Math.random()*0.6,w:0.35+Math.random()*0.45,h:0.04+Math.random()*0.07,col:Math.random()>0.5?TEAL:COPPER,vx:(Math.random()-0.5)*0.00005,phase:Math.random()*Math.PI*2,speed:0.0005+Math.random()*0.0006}));

// Bouncing runes — rune-band style symbols (all 6 SVG rune bar types) drifting in the background (site mode only).
// Small, crisp strokes that echo the rune bar rather than big bokeh blobs.
const RUNE_FLOAT_COUNT = 0;
const RUNE_BOUNCE_MARGIN = 0.028;
const runeFloaters = Array.from({length:RUNE_FLOAT_COUNT}, () => ({
  x: 0.08 + Math.random() * 0.84,
  y: 0.08 + Math.random() * 0.84,
  vx: (Math.random() - 0.5) * 0.00055,
  vy: (Math.random() - 0.5) * 0.0005,
  // Small so they read as rune glyphs, but large enough to actually notice
  size: 0.004 + Math.random() * 0.008,
  type: Math.floor(Math.random() * 6),
  rot: Math.random() * Math.PI * 2
}));
function drawRuneShape(ctx, type, pxScale) {
  const u = 0.5; // unit radius for shapes (match rune bar SVGs)
  // Line width scales very gently with on-screen size so strokes stay crisp
  ctx.lineWidth = 0.9 + (pxScale || 1) * 0.04;
  ctx.lineCap = 'round';
  if (type === 0) {
    // Rune bar sym 0: target — 3 circles, cross, X
    ctx.beginPath(); ctx.arc(0, 0, u * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.52, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -u); ctx.lineTo(0, u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u, 0); ctx.lineTo(u, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u * 0.77, -u * 0.77); ctx.lineTo(u * 0.77, u * 0.77); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(u * 0.77, -u * 0.77); ctx.lineTo(-u * 0.77, u * 0.77); ctx.stroke();
  } else if (type === 1) {
    // Rune bar sym 1: circle + two arcs (left/right) + inner circle
    ctx.beginPath(); ctx.arc(0, 0, u * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -u);
    ctx.bezierCurveTo(u * 0.22, -u, u * 0.65, 0, 0, u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -u);
    ctx.bezierCurveTo(-u * 0.22, -u, -u * 0.65, 0, 0, u);
    ctx.stroke();
  } else if (type === 2) {
    // Rune bar sym 2: diamond/eye + circle + dot
    ctx.beginPath();
    ctx.moveTo(0, -u); ctx.lineTo(u * 0.96, 0); ctx.lineTo(0, u); ctx.lineTo(-u * 0.96, 0); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.33, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(0, 0, u * 0.12, 0, Math.PI * 2); ctx.fill();
  } else if (type === 3) {
    // Rune bar sym 3: spiral/comma + circle
    ctx.beginPath();
    ctx.moveTo(u * 0.48, -u * 0.32);
    ctx.bezierCurveTo(u * 0.04, -u * 0.32, -u * 0.22, -u * 0.08, -u * 0.22, u * 0.17);
    ctx.bezierCurveTo(-u * 0.22, u * 0.35, u * 0.04, u * 0.52, u * 0.22, u * 0.48);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.32, 0, Math.PI * 2); ctx.stroke();
  } else if (type === 4) {
    // Rune bar sym 4: circle + cross + small inner circle
    ctx.beginPath(); ctx.arc(0, 0, u * 0.9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -u); ctx.lineTo(0, u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u, 0); ctx.lineTo(u, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, u * 0.18, 0, Math.PI * 2); ctx.stroke();
  } else {
    // Rune bar sym 5: two curves + centre dot
    ctx.beginPath();
    ctx.moveTo(u * 0.52, -u * 0.42);
    ctx.bezierCurveTo(u * 0.13, -u * 0.42, -u * 0.13, -u * 0.15, -u * 0.13, u * 0.04);
    ctx.bezierCurveTo(-u * 0.13, u * 0.25, u * 0.04, u * 0.35, u * 0.13, u * 0.31);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-u * 0.42, u * 0.35);
    ctx.bezierCurveTo(-u * 0.13, u * 0.35, u * 0.13, u * 0.08, u * 0.13, -u * 0.1);
    ctx.bezierCurveTo(u * 0.13, -u * 0.31, -u * 0.04, -u * 0.4, -u * 0.13, -u * 0.35);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(0, 0, u * 0.1, 0, Math.PI * 2); ctx.fill();
  }
}
function drawBouncingRune(r) {
  const px = r.x * W;
  const py = r.y * H;
  const s = r.size * Math.min(W, H);
  ctx.save();
  // Brighter so they are clearly visible over the tunnel, but still behind main geo
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = rgb(COPPER, 1);
  ctx.translate(px, py);
  ctx.rotate(r.rot);
  ctx.scale(s, s);
  drawRuneShape(ctx, r.type, s);
  ctx.restore();
}

let t=0;
let smoothScroll = 0; // lerped scroll fraction for tunnel drift

// Mouse-follow for tunnel — normalized 0..1, two-stage lerp for more delay + smoother motion
let mouseX = 0.5, mouseY = 0.5;
let midMouseX = 0.5, midMouseY = 0.5;   // first stage: catches mouse
let smoothMouseX = 0.5, smoothMouseY = 0.5;  // second stage: slower, smoother
const MOUSE_LERP_MID = 0.032;   // how fast mid follows raw (first stage)
const MOUSE_LERP_SMOOTH = 0.006;  // how fast smooth follows mid (more delay, smoother)
const MOUSE_LATERAL_SCALE = 0.14;
const MOUSE_VERTICAL_SCALE = 0.11;
window.addEventListener('mousemove', function(e) {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});

function draw(){
  ctx.clearRect(0,0,W,H);
  const now = performance.now();
  updateBeat(now);
  // Lerp scroll fraction toward actual value — slightly faster so scroll feels more responsive
  if(!inFullscreen) {
    const totalH = document.body.scrollHeight - window.innerHeight;
    const targetScroll = totalH > 0 ? window.scrollY / totalH : 0;
    smoothScroll += (targetScroll - smoothScroll) * 0.018;
  }
  midMouseX += (mouseX - midMouseX) * MOUSE_LERP_MID;
  midMouseY += (mouseY - midMouseY) * MOUSE_LERP_MID;
  smoothMouseX += (midMouseX - smoothMouseX) * MOUSE_LERP_SMOOTH;
  smoothMouseY += (midMouseY - smoothMouseY) * MOUSE_LERP_SMOOTH;
  // In site mode, skip the big compass wheels (geo defs with site:false). In fullscreen visualiser, draw all.
  if(scrollGeoOn) {
    const activeGeoms = inFullscreen ? geomDefs : geomDefs.filter(g => g.site !== false);
    activeGeoms.forEach(g => drawGeom(g, now));
  }
  if(wispsOn) wisps.forEach(w=>{
    w.x+=w.vx;
    if(w.x<-0.4)w.x=1.2;if(w.x>1.2)w.x=-0.4;
    const p=1+0.06*Math.sin(t*w.speed*1000+w.phase);
    const g=ctx.createRadialGradient(w.x*W,w.y*H,0,w.x*W,w.y*H,w.w*W*p);
    g.addColorStop(0,rgb(w.col,0.04));g.addColorStop(0.5,rgb(w.col,0.015));g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(w.x*W,w.y*H,w.w*W*p,w.h*H*p,0,0,Math.PI*2);ctx.fill();
  });
  if(motesOn) {
    // Sparks — bottom origin, occasional flash, cap at sparkMaxHeight
    sparks.slice(0, moteCount).forEach(m=>{
      m.x+=m.vx+Math.sin(t*m.speed*500+m.phase)*0.00006;
      m.y+=m.vy;
      m.life+=m.speed*0.45;
      if(m.y<sparkMaxHeight||m.life>m.maxLife){m.x=Math.random();m.y=0.85+Math.random()*0.2;m.life=0;m.col=[TEAL,COPPER,GOLD,RUST][Math.floor(Math.random()*4)];}
      const rel=m.life/m.maxLife;
      let a=rel<0.2?rel/0.2:rel>0.75?1-(rel-0.75)/0.25:1;
      a*=0.5;
      if(Math.random()<sparkFlashFreq)a*=0.2+Math.random()*0.8;
      const g=ctx.createRadialGradient(m.x*W,m.y*H,0,m.x*W,m.y*H,m.r*2.5);
      g.addColorStop(0,rgb(m.col,a));g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x*W,m.y*H,m.r*2.5,0,Math.PI*2);ctx.fill();
    });
    // Floaters — ambient throughout, gentle drift, no flash
    floaters.slice(0, floatCount).forEach(m=>{
      m.x+=m.vx+Math.sin(t*m.speed*300+m.phase)*0.00003;
      m.y+=m.vy;
      if(m.y<-0.05){m.x=Math.random();m.y=1.05;}
      const g=ctx.createRadialGradient(m.x*W,m.y*H,0,m.x*W,m.y*H,m.r*6);
      g.addColorStop(0,rgb(m.col,0.55*floatOpacity));g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x*W,m.y*H,m.r*6,0,Math.PI*2);ctx.fill();
    });
  }
  // Bouncing runes — update position with bounce, then draw (site mode only; hide in fullscreen visualiser)
  if (!inFullscreen) {
    const margin = RUNE_BOUNCE_MARGIN;
    runeFloaters.forEach(r => {
      r.x += r.vx;
      r.y += r.vy;
      if (r.x < margin) { r.x = margin; r.vx = Math.abs(r.vx); }
      if (r.x > 1 - margin) { r.x = 1 - margin; r.vx = -Math.abs(r.vx); }
      if (r.y < margin) { r.y = margin; r.vy = Math.abs(r.vy); }
      if (r.y > 1 - margin) { r.y = 1 - margin; r.vy = -Math.abs(r.vy); }
      // Slow, gentle rotation so they feel like drifting symbols rather than blobs
      r.rot += 0.00008;
      drawBouncingRune(r);
    });
  }
  t+=0.016;
  requestAnimationFrame(draw);
}
draw();

// PHOTO FILTER HELPERS
function updatePhotoFilters() {
  const f = `saturate(${photoSat}) sepia(${photoSep}) brightness(${photoBrt})`;
  document.querySelectorAll('.photo-hero-wrap img,.photo-sm img,.lineup-hero:not(.photo-dj) img').forEach(img => {
    img.style.filter = f;
  });
}
function updateDJFilter() {
  const f = `saturate(${djSat}) sepia(${djSep}) brightness(${djBrt})`;
  const img = document.querySelector('.photo-dj img');
  if(img) img.style.filter = f;
}

// SCROLL REVEAL
const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}});},{threshold:0.07});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// Amplify scroll only when multiplier is not 1.0; otherwise native scroll avoids flicker at top/bottom
const SCROLL_MULTIPLIER = 1.0;
if (SCROLL_MULTIPLIER !== 1.0) {
  window.addEventListener('wheel', function(e) {
    const dy = e.deltaY * SCROLL_MULTIPLIER;
    if (Math.abs(dy) > 0.5) {
      e.preventDefault();
      window.scrollBy(0, dy);
    }
  }, { passive: false });
}

// VIDEO — autoplay on scroll into view
const videoWrap = document.getElementById('videoWrap');
if(videoWrap) {
  const iframe = videoWrap.querySelector('iframe');
  if(iframe) {
    const vidObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(e.isIntersecting) {
          const src = iframe.src;
          if(!src.includes('autoplay')) {
            iframe.src = src + (src.includes('?') ? '&' : '?') + 'autoplay=1&muted=1&loop=1';
          }
          vidObs.unobserve(e.target);
        }
      });
    }, {threshold: 0.3});
    vidObs.observe(videoWrap);
  }
}


// ── FREQ BAND PANEL (key 2) ──────────────────────────────────────────────────
(function(){
  const fp = document.createElement('div');
  fp.id = 'freqPanel';
  fp.style.cssText = [
    'display:none','position:fixed','top:60px','left:0','z-index:600','width:240px',
    'background:rgba(14,13,11,0.93)','backdrop-filter:blur(10px)','-webkit-backdrop-filter:blur(10px)',
    'border-right:1px solid rgba(184,115,51,0.25)','border-bottom:1px solid rgba(184,115,51,0.25)',
    'border-top:1px solid rgba(184,115,51,0.25)','border-radius:0 3px 3px 0',
    'padding:14px 16px 16px','font-family:Caveat,cursive','color:rgba(232,223,200,0.75)',
    'font-size:0.82rem','letter-spacing:0.06em','user-select:none',
  ].join(';');

  fp.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(184,115,51,0.2);padding-bottom:8px">
      <span style="font-size:0.88rem;letter-spacing:0.14em;text-transform:uppercase;color:#b87333">◈ Freq Bands</span>
      <span style="font-size:0.68rem;opacity:0.3;letter-spacing:0.07em">2 close</span>
    </div>
    <div style="margin-bottom:10px">
      <canvas id="freq_canvas" width="208" height="48" style="width:100%;border-radius:2px;display:block"></canvas>
    </div>
    <div style="font-size:0.68rem;opacity:0.35;letter-spacing:0.07em;margin-bottom:5px;text-transform:uppercase">drag handles · bins 0–128</div>
    <div id="freq_ruler" style="position:relative;height:28px;border-radius:3px;margin-bottom:6px;background:rgba(255,255,255,0.04);box-sizing:border-box;overflow:visible">
      <div id="fr_bass"   style="position:absolute;top:0;bottom:0;left:0;background:rgba(160,70,42,0.7);border-radius:3px 0 0 3px;pointer-events:none"></div>
      <div id="fr_mid"    style="position:absolute;top:0;bottom:0;background:rgba(184,130,51,0.65);pointer-events:none"></div>
      <div id="fr_treble" style="position:absolute;top:0;bottom:0;background:rgba(46,123,122,0.7);pointer-events:none"></div>
      <div id="fr_h1" style="position:absolute;top:-2px;bottom:-2px;width:5px;margin-left:-3px;background:#b87333;cursor:ew-resize;border-radius:3px;z-index:2"></div>
      <div id="fr_h2" style="position:absolute;top:-2px;bottom:-2px;width:5px;margin-left:-3px;background:#b87333;cursor:ew-resize;border-radius:3px;z-index:2"></div>
      <div id="fr_h3" style="position:absolute;top:-2px;bottom:-2px;width:5px;margin-left:-3px;background:rgba(184,115,51,0.5);cursor:ew-resize;border-radius:3px;z-index:2"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:0.72rem">
      <span style="color:rgba(160,70,42,0.95)">B <span id="flbl_bass" style="color:#b87333"></span></span>
      <span style="color:rgba(184,130,51,0.95)">M <span id="flbl_mid" style="color:#b87333"></span></span>
      <span style="color:rgba(46,123,122,0.95)">T <span id="flbl_treble" style="color:#b87333"></span></span>
    </div>
    <div style="border-top:1px solid rgba(184,115,51,0.12);padding-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Norm Ceiling</span>
        <span id="flbl_norm" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
      </div>
      <input type="range" id="f_norm" min="20" max="255" value="80" step="5" style="width:100%;box-sizing:border-box;accent-color:#b87333;height:3px;cursor:pointer;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem">Min Avg Gate</span>
        <span id="flbl_gate" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
      </div>
      <input type="range" id="f_gate" min="1" max="40" value="2" step="1" style="width:100%;box-sizing:border-box;accent-color:#b87333;height:3px;cursor:pointer">
    </div>
  `;
  document.body.appendChild(fp);

  function flbl(id, val) { const el=document.getElementById('flbl_'+id); if(el) el.textContent=val; }

  function updateRuler() {
    const pct = v => (v / 128 * 100).toFixed(2) + '%';
    document.getElementById('fr_bass').style.width   = pct(bassEnd);
    document.getElementById('fr_mid').style.left     = pct(midStart);
    document.getElementById('fr_mid').style.width    = pct(midEnd - midStart);
    document.getElementById('fr_treble').style.left  = pct(trebleStart);
    document.getElementById('fr_treble').style.width = pct(trebleEnd - trebleStart);
    document.getElementById('fr_h1').style.left = pct(bassEnd);
    document.getElementById('fr_h2').style.left = pct(midEnd);
    document.getElementById('fr_h3').style.left = pct(trebleEnd);
    flbl('bass',   `${bassStart}–${bassEnd}`);
    flbl('mid',    `${midStart}–${midEnd}`);
    flbl('treble', `${trebleStart}–${trebleEnd}`);
    flbl('norm',   normCeil);
    flbl('gate',   minAvgGate);
  }
  updateRuler();

  // Draggable handles
  const ruler = document.getElementById('freq_ruler');
  let dragging = null;

  function startDrag(e, which) {
    e.preventDefault();
    dragging = which;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup',   endDrag);
  }
  document.getElementById('fr_h1').addEventListener('mousedown', e => startDrag(e, 1));
  document.getElementById('fr_h2').addEventListener('mousedown', e => startDrag(e, 2));
  document.getElementById('fr_h3').addEventListener('mousedown', e => startDrag(e, 3));

  function onDrag(e) {
    if(dragging === null) return;
    const rect = ruler.getBoundingClientRect();
    const bin = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 128);
    if(dragging === 1) {
      // bass/mid boundary: bassEnd = midStart
      const v = Math.max(1, Math.min(midEnd - 1, bin));
      bassEnd = v; midStart = v;
    } else if(dragging === 2) {
      // mid/treble boundary: midEnd = trebleStart
      const v = Math.max(bassEnd + 1, Math.min(trebleEnd - 1, bin));
      midEnd = v; trebleStart = v;
    } else {
      // treble end
      trebleEnd = Math.max(trebleStart + 1, Math.min(127, bin));
    }
    updateRuler();
  }
  function endDrag() {
    dragging = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup',   endDrag);
  }

  // Spectrum canvas
  const fcanvas = document.getElementById('freq_canvas');
  const fctx    = fcanvas.getContext('2d');

  function drawFreqCanvas() {
    fctx.clearRect(0,0,208,48);
    if(!micAnalyser || !micDataArray) {
      fctx.fillStyle='rgba(255,255,255,0.04)';
      fctx.fillRect(0,0,208,48);
      fctx.fillStyle='rgba(232,223,200,0.15)';
      fctx.font='11px Caveat,cursive';
      fctx.textAlign='center';
      fctx.fillText('mic off', 104, 28);
      requestAnimationFrame(drawFreqCanvas);
      return;
    }
    micAnalyser.getByteFrequencyData(micDataArray);
    const bins = Math.min(128, micDataArray.length);
    const bw = 208 / bins;
    for(let i=0; i<bins; i++) {
      const h = (micDataArray[i]/255)*48;
      let col;
      if(i >= bassStart && i < bassEnd)         col = 'rgba(160,70,42,0.85)';
      else if(i >= midStart && i < midEnd)       col = 'rgba(184,130,51,0.75)';
      else if(i >= trebleStart && i < trebleEnd) col = 'rgba(46,123,122,0.85)';
      else                                        col = 'rgba(255,255,255,0.08)';
      fctx.fillStyle = col;
      fctx.fillRect(i*bw, 48-h, bw-0.5, h);
    }
    requestAnimationFrame(drawFreqCanvas);
  }
  drawFreqCanvas();

  document.getElementById('f_norm').addEventListener('input', function(){
    normCeil = parseInt(this.value); updateRuler();
  });
  document.getElementById('f_gate').addEventListener('input', function(){
    minAvgGate = parseInt(this.value); updateRuler();
  });
})();

// ── SITE TUNING PANEL (key 9) ────────────────────────────────────────────────
(function(){
  const sp = document.createElement('div');
  sp.id = 'siteTunePanel';
  sp.style.cssText = [
    'display:none','position:fixed','bottom:20px','left:0','z-index:600','width:230px',
    'background:rgba(14,13,11,0.93)','backdrop-filter:blur(10px)','-webkit-backdrop-filter:blur(10px)',
    'border-right:1px solid rgba(184,115,51,0.25)','border-top:1px solid rgba(184,115,51,0.25)',
    'border-bottom:1px solid rgba(184,115,51,0.25)','border-radius:0 3px 3px 0',
    'padding:14px 16px 16px','font-family:Caveat,cursive','color:rgba(232,223,200,0.92)',
    'font-size:0.9rem','letter-spacing:0.06em','user-select:none',
  ].join(';');

  function row9(label, id, min, max, val, step) {
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="text-transform:uppercase;letter-spacing:0.08em;color:rgba(232,223,200,0.7);font-size:0.8rem">${label}</span>
        <span id="s9lbl_${id}" style="color:#d4954a;font-size:0.88rem;min-width:44px;text-align:right;font-weight:bold">${val}</span>
      </div>
      <input type="range" id="s9_${id}" min="${min}" max="${max}" value="${val}" step="${step}"
        style="width:100%;accent-color:#b87333;opacity:0.8;cursor:pointer;height:3px">
    </div>`;
  }

  sp.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(184,115,51,0.2);padding-bottom:8px">
      <span style="font-size:0.88rem;letter-spacing:0.14em;text-transform:uppercase;color:#b87333">✦ Site Tuning</span>
      <button id="s9_copy" style="font-family:Caveat,cursive;font-size:0.75rem;letter-spacing:0.1em;background:none;border:1px solid rgba(184,115,51,0.3);border-radius:2px;padding:2px 8px;color:rgba(184,115,51,0.7);cursor:pointer">📋 Copy</button>
    </div>
    <div style="font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(184,115,51,0.85);margin-bottom:6px">Sparks</div>
    ${row9('Count',       'spark_count',  0,  80,  20,   1)}
    ${row9('Max Height',  'spark_height', 0,  0.9, 0.25, 0.01)}
    ${row9('Flash Freq',  'spark_flash',  0,  0.02,0.002,0.001)}
    <div style="font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(184,115,51,0.85);margin:8px 0 6px">Floaters</div>
    ${row9('Count',   'float_count',   0,  40,  12,  1)}
    ${row9('Opacity', 'float_opacity', 0,  1.0, 0.5, 0.05)}
    <div style="font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(184,115,51,0.85);margin:8px 0 6px">Photos</div>
    ${row9('Saturate', 'ph_sat', 0, 1.5, 0.72, 0.01)}
    ${row9('Sepia',    'ph_sep', 0, 1.0, 0.18, 0.01)}
    ${row9('Bright',   'ph_brt', 0, 1.5, 0.92, 0.01)}
    <div style="font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(184,115,51,0.85);margin:8px 0 6px">Danny &amp; Joe Photo</div>
    ${row9('Saturate', 'dj_sat', 0, 1.5, 0.72, 0.01)}
    ${row9('Sepia',    'dj_sep', 0, 1.0, 0.18, 0.01)}
    ${row9('Bright',   'dj_brt', 0, 1.5, 0.92, 0.01)}
    <div style="font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(184,115,51,0.85);margin:8px 0 6px">Hero Video</div>
    ${row9('Brightness', 'hero_brt', 0.05, 0.8, 0.25, 0.01)}
  `;
  document.body.appendChild(sp);

  function slbl(id, val) { const el=document.getElementById('s9lbl_'+id); if(el) el.textContent=val; }

  document.getElementById('s9_spark_count').addEventListener('input', function(){
    moteCount=parseInt(this.value); slbl('spark_count', moteCount);
  });
  document.getElementById('s9_spark_height').addEventListener('input', function(){
    sparkMaxHeight=parseFloat(this.value); slbl('spark_height', sparkMaxHeight.toFixed(2));
  });
  document.getElementById('s9_spark_flash').addEventListener('input', function(){
    sparkFlashFreq=parseFloat(this.value); slbl('spark_flash', sparkFlashFreq.toFixed(3));
  });
  document.getElementById('s9_float_count').addEventListener('input', function(){
    floatCount=parseInt(this.value); slbl('float_count', floatCount);
  });
  document.getElementById('s9_float_opacity').addEventListener('input', function(){
    floatOpacity=parseFloat(this.value); slbl('float_opacity', floatOpacity.toFixed(2));
  });
  document.getElementById('s9_ph_sat').addEventListener('input', function(){
    photoSat=parseFloat(this.value); slbl('ph_sat', photoSat.toFixed(2)); updatePhotoFilters();
  });
  document.getElementById('s9_ph_sep').addEventListener('input', function(){
    photoSep=parseFloat(this.value); slbl('ph_sep', photoSep.toFixed(2)); updatePhotoFilters();
  });
  document.getElementById('s9_ph_brt').addEventListener('input', function(){
    photoBrt=parseFloat(this.value); slbl('ph_brt', photoBrt.toFixed(2)); updatePhotoFilters();
  });
  document.getElementById('s9_dj_sat').addEventListener('input', function(){
    djSat=parseFloat(this.value); slbl('dj_sat', djSat.toFixed(2)); updateDJFilter();
  });
  document.getElementById('s9_dj_sep').addEventListener('input', function(){
    djSep=parseFloat(this.value); slbl('dj_sep', djSep.toFixed(2)); updateDJFilter();
  });
  document.getElementById('s9_dj_brt').addEventListener('input', function(){
    djBrt=parseFloat(this.value); slbl('dj_brt', djBrt.toFixed(2)); updateDJFilter();
  });
  document.getElementById('s9_hero_brt').addEventListener('input', function(){
    const v=parseFloat(this.value); slbl('hero_brt', v.toFixed(2));
    const hb=document.getElementById('heroBg');
    if(hb) hb.style.filter=`brightness(${v}) saturate(0.5) sepia(0.5) blur(1.5px)`;
  });

  document.getElementById('s9_copy').addEventListener('click', function(){
    const vals = [
      `sparkCount:${moteCount}`,
      `sparkMaxHeight:${sparkMaxHeight.toFixed(2)}`,
      `sparkFlashFreq:${sparkFlashFreq.toFixed(3)}`,
      `floatCount:${floatCount}`,
      `floatOpacity:${floatOpacity.toFixed(2)}`,
      `photoSat:${photoSat.toFixed(2)}`,
      `photoSep:${photoSep.toFixed(2)}`,
      `photoBrt:${photoBrt.toFixed(2)}`,
      `djSat:${djSat.toFixed(2)}`,
      `djSep:${djSep.toFixed(2)}`,
      `djBrt:${djBrt.toFixed(2)}`,
      `heroBrt:${document.getElementById('s9_hero_brt').value}`,
    ].join('  ');
    navigator.clipboard.writeText(vals).then(()=>{
      this.textContent='✓ Copied';
      setTimeout(()=>{ this.textContent='📋 Copy'; },1800);
    });
  });

  document.addEventListener('keydown', e => {
    if (!window.__debugMode) return;
    if(e.key === '9') {
      sp.style.display = sp.style.display === 'none' ? 'block' : 'none';
    }
  });
})();

// FAQ accordion + expand all
(function() {
  var list = document.querySelector('#faq .faq-list');
  var expandBtn = document.getElementById('faqExpandAll');
  if (!list || !expandBtn) return;
  var items = list.querySelectorAll('.faq-item');
  function allOpen() {
    for (var i = 0; i < items.length; i++) { if (!items[i].classList.contains('faq-item--open')) return false; }
    return true;
  }
  function updateExpandLabel() {
    expandBtn.textContent = allOpen() ? 'Collapse all' : 'Expand all';
    expandBtn.setAttribute('aria-label', allOpen() ? 'Collapse all FAQ answers' : 'Expand all FAQ answers');
  }
  list.addEventListener('click', function(e) {
    var trigger = e.target.closest('.faq-trigger');
    if (!trigger) return;
    var item = trigger.closest('.faq-item');
    if (!item) return;
    e.preventDefault();
    var open = item.classList.toggle('faq-item--open');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    updateExpandLabel();
  });
  expandBtn.addEventListener('click', function() {
    var openAll = !allOpen();
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var trigger = item.querySelector('.faq-trigger');
      if (openAll) {
        item.classList.add('faq-item--open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
      } else {
        item.classList.remove('faq-item--open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    }
    updateExpandLabel();
  });
  updateExpandLabel();
})();

});