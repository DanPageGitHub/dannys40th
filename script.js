document.addEventListener('DOMContentLoaded', function() {

const I = {
  crop_circle:     'images/crop_circle.jpg',
  dj_shot:         'images/dj_shot.jpg',
  goat_mask:       'images/goat_mask.jpg',
  danny_sign:      'images/danny_sign.jpg',
  danny_crown:     'images/danny_crown.jpg',
  film_group:      'images/film_group.jpg',
  bus_selfie:      'images/bus_selfie.jpg',
  bell_tents:      'images/bell_tents.jpg',
  pub_exterior:    'images/pub_exterior.jpg',
  pub_canal_side:  'images/pub_canal_side.jpg',
  canal_narrowboat:'images/canal_narrowboat.jpg',
  white_horse:     'images/white_horse.jpg',
  sunset_hero:     'images/sunset_hero.jpg',
  bnb_room:        'images/bnb_room.jpg',
  bnb_bath:        'images/bnb_bath.jpg',
};


// IMAGES
function setPhoto(id, key, pos, bf) {
  const wrap = document.getElementById(id);
  if (!wrap || !I[key]) return;
  const img = document.createElement('img');
  img.src = I[key]; img.alt = '';
  const b = bf || '0.86';
  img.style.cssText = `width:100%;height:100%;object-fit:cover;display:block;filter:saturate(0.62) sepia(0.28) brightness(${b});transition:filter 0.6s,transform 0.7s;`;
  if (pos) img.style.objectPosition = pos;
  wrap.insertBefore(img, wrap.firstChild);
  wrap.addEventListener('mouseenter', () => img.style.filter = 'saturate(0.78) sepia(0.12) brightness(0.95)');
  wrap.addEventListener('mouseleave', () => img.style.filter = `saturate(0.62) sepia(0.28) brightness(${b})`);
}

document.getElementById('heroBg').style.backgroundImage = `url(${I.sunset_hero})`;
setPhoto('pHero','canal_narrowboat','center 45%');
setPhoto('pPub','pub_canal_side','center 60%');
setPhoto('pTents','bell_tents','center 50%');
setPhoto('pSign','danny_sign','center 55%');
setPhoto('pHorse','white_horse','center 45%');
setPhoto('pDJ','dj_shot','center 40%');
setPhoto('pBnbRoom','bnb_room','center 40%');
setPhoto('pBnbBath','bnb_bath','center 40%');

// Parallax backgrounds
const px1 = document.getElementById('pxImg1');
const px2 = document.getElementById('pxImg2');
if(px1) px1.style.backgroundImage = `url(${I.canal_narrowboat})`;
if(px2) px2.style.backgroundImage = `url(${I.white_horse})`;

function updateParallax() {
  [['pxStrip1','pxImg1'],['pxStrip2','pxImg2']].forEach(([sid,iid]) => {
    const strip = document.getElementById(sid);
    const img = document.getElementById(iid);
    if(!strip||!img) return;
    const rect = strip.getBoundingClientRect();
    const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    img.style.transform = `translateY(${(progress - 0.5) * 80}px)`;
  });
}
window.addEventListener('scroll', updateParallax, {passive:true});
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

// RUNE BAND — single scrolling row, no clone
(function(){
  const scroll = document.getElementById('runeScroll');
  if(!scroll) return;
  const syms = [
    `<svg width="90" height="90" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="22" stroke="#b87333" stroke-width="1"/><circle cx="26" cy="26" r="13" stroke="#b87333" stroke-width="1"/><circle cx="26" cy="26" r="5" stroke="#b87333" stroke-width="1"/><line x1="26" y1="4" x2="26" y2="48" stroke="#b87333" stroke-width="0.8"/><line x1="4" y1="26" x2="48" y2="26" stroke="#b87333" stroke-width="0.8"/><line x1="10" y1="10" x2="42" y2="42" stroke="#b87333" stroke-width="0.6"/><line x1="42" y1="10" x2="10" y2="42" stroke="#b87333" stroke-width="0.6"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 44 44" fill="none"><path d="M22 4 L24.5 17 L37 11 L28 22 L37 33 L24.5 27 L22 40 L19.5 27 L7 33 L16 22 L7 11 L19.5 17 Z" stroke="#b87333" stroke-width="0.9" fill="none"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 46 46" fill="none"><circle cx="23" cy="23" r="19" stroke="#b87333" stroke-width="0.8"/><path d="M23 4 C28 4 38 13 38 23 C38 33 28 42 23 42" stroke="#b87333" stroke-width="0.8" fill="none"/><path d="M23 4 C18 4 8 13 8 23 C8 33 18 42 23 42" stroke="#b87333" stroke-width="0.8" fill="none" stroke-dasharray="3 2"/><circle cx="23" cy="23" r="3" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="78" viewBox="0 0 48 42" fill="none"><path d="M2 21 C8 6 16 2 24 2 C32 2 40 6 46 21 C40 36 32 40 24 40 C16 40 8 36 2 21Z" stroke="#b87333" stroke-width="0.8" fill="none"/><circle cx="24" cy="21" r="7" stroke="#b87333" stroke-width="0.8"/><circle cx="24" cy="21" r="2.5" fill="#b87333" opacity="0.5"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 40 50" fill="none"><path d="M30 8 C22 8 14 14 14 25 C14 32 18 38 24 40 C18 38 10 32 10 22 C10 12 18 4 28 6" stroke="#b87333" stroke-width="0.9" fill="none"/><circle cx="20" cy="25" r="4" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="22" r="18" stroke="#b87333" stroke-width="0.8"/><line x1="22" y1="4" x2="22" y2="40" stroke="#b87333" stroke-width="0.7"/><line x1="4" y1="22" x2="40" y2="22" stroke="#b87333" stroke-width="0.7"/><circle cx="22" cy="22" r="4" stroke="#b87333" stroke-width="0.8"/></svg>`,
    `<svg width="90" height="90" viewBox="0 0 42 48" fill="none"><path d="M32 10 C24 10 16 17 16 25 C16 30 19 35 24 37" stroke="#b87333" stroke-width="0.9" fill="none"/><path d="M10 38 C18 38 26 31 26 23 C26 18 23 13 18 11" stroke="#b87333" stroke-width="0.9" fill="none" stroke-dasharray="3 2"/><circle cx="21" cy="24" r="2" fill="#b87333" opacity="0.6"/></svg>`,
  ];
  // Repeat set twice inside the single element so translateX(-50%) loops perfectly
  const double = [...syms, ...syms];
  double.forEach(s => {
    const tmp = document.createElement('div');
    tmp.innerHTML = s;
    const svg = tmp.querySelector('svg');
    if(svg) scroll.appendChild(svg);
  });
})();

// MIC / BEAT DETECTION
let micOn = false;
let micAnalyser = null;
let micDataArray = null;
let micBassArray = null;
let micTrebleArray = null;
let micAvg = 0;
let bassAvg = 0;
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
let trebleToSpeed   = false;
let trebleToSway    = false;
let trebleToDensity = true;

// DEBUG PANEL
const DEFAULTS = {
  lineDensity: 18, geoSpeed: 1.0, geoOpacity: 1.0, geoLineWidth: 1.0,
  lateralAmp: 0.018, tunnelStrength: 1.8, moteCount: 55,
  wispsOn: false, motesOn: true,
  heroGeoOn: true, scrollGeoOn: true,
};
let lineDensity    = DEFAULTS.lineDensity;
let geoSpeed       = DEFAULTS.geoSpeed;
let geoOpacity     = DEFAULTS.geoOpacity;
let geoLineWidth   = DEFAULTS.geoLineWidth;
let lateralAmp     = DEFAULTS.lateralAmp;
let tunnelStrength = DEFAULTS.tunnelStrength;
let moteCount      = DEFAULTS.moteCount;
let wispsOn        = DEFAULTS.wispsOn;
let motesOn        = DEFAULTS.motesOn;
let heroGeoOn      = DEFAULTS.heroGeoOn;
let scrollGeoOn    = DEFAULTS.scrollGeoOn;

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
    ${row('Geo Density',    'density',   sl('ctl_density',   4,   36,  18,    1))}
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.55;font-size:0.75rem;margin-bottom:4px">Hero Geo</div>${tog('ctl_hero_geo', true)}</div>
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
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.07em;text-align:center">BASS</div>
        <div style="font-size:0.68rem;opacity:0.4;letter-spacing:0.07em;text-align:center">TREBLE</div>
        <div style="height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
          <div id="mic_bass" style="height:100%;width:0%;background:rgba(160,70,42,0.7);border-radius:2px;transition:width 0.05s"></div>
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
    lineDensity=DEFAULTS.lineDensity; geoSpeed=DEFAULTS.geoSpeed;
    geoOpacity=DEFAULTS.geoOpacity; geoLineWidth=DEFAULTS.geoLineWidth;
    lateralAmp=DEFAULTS.lateralAmp; tunnelStrength=DEFAULTS.tunnelStrength;
    moteCount=DEFAULTS.moteCount; wispsOn=DEFAULTS.wispsOn; motesOn=DEFAULTS.motesOn;
    heroGeoOn=DEFAULTS.heroGeoOn; scrollGeoOn=DEFAULTS.scrollGeoOn;
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
    styleToggle(document.getElementById('ctl_hero_geo'), heroGeoOn);
    bassToSpeed=true; bassToSway=true; bassToDensity=false;
    trebleToSpeed=false; trebleToSway=false; trebleToDensity=true;
    [['ctl_bass_speed',bassToSpeed],['ctl_bass_sway',bassToSway],['ctl_bass_density',bassToDensity],
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
  applyDefaults();

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
  document.getElementById('ctl_hero_geo').addEventListener('click',  function(){ heroGeoOn=!heroGeoOn;   styleToggle(this, heroGeoOn); });
  document.getElementById('ctl_scroll_geo').addEventListener('click',function(){ scrollGeoOn=!scrollGeoOn; styleToggle(this, scrollGeoOn); });
  // Mic routing toggles — each is fully independent
  document.getElementById('ctl_bass_speed').addEventListener('click',     function(){ bassToSpeed=!bassToSpeed;       styleRtog(this,bassToSpeed); });
  document.getElementById('ctl_bass_sway').addEventListener('click',      function(){ bassToSway=!bassToSway;         styleRtog(this,bassToSway); });
  document.getElementById('ctl_bass_density').addEventListener('click',   function(){ bassToDensity=!bassToDensity;   styleRtog(this,bassToDensity); });
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
      ['mic_level','mic_bass','mic_treble'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.width='0%'; });
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

  function enterFullscreen() {
    inFullscreen = true;
    smoothScroll = 0; // reset so geo centres on screen
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
    density:   { type:'slider', id:'ctl_density',   step:1,     min:4,    max:36   },
    speed:     { type:'slider', id:'ctl_speed',     step:0.05,  min:0.1,  max:4    },
    opacity:   { type:'slider', id:'ctl_opacity',   step:0.05,  min:0.1,  max:3    },
    lwidth:    { type:'slider', id:'ctl_lwidth',    step:0.1,   min:0.2,  max:4    },
    lateral:   { type:'slider', id:'ctl_lateral',   step:0.002, min:0,    max:0.08 },
    tunnel:    { type:'slider', id:'ctl_tunnel',    step:0.1,   min:0,    max:4    },
    motecount: { type:'slider', id:'ctl_motecount', step:1,     min:0,    max:120  },
    toggles:   { type:'toggles', ids:['ctl_motes','ctl_wisps'], cur:0 },
    geo:       { type:'toggles', ids:['ctl_hero_geo','ctl_scroll_geo'], cur:0 },
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
    // 1 — toggle panel visibility
    if(e.key === '1') {
      const hidden = panel.style.opacity === '0';
      panel.style.opacity = hidden ? '1' : '0';
      panel.style.pointerEvents = hidden ? 'all' : 'none';
      return;
    }

    // Escape — exit fullscreen
    if(e.key === 'Escape' && inFullscreen) { exitFullscreen(); return; }

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

  // Bass: bins ~0-10 (0-430Hz), Treble: bins ~30-80 (1.2-3.4kHz)
  const bass   = getFreqBand(micAnalyser, micDataArray, 0, 10);
  const treble = getFreqBand(micAnalyser, micDataArray, 30, 80);
  const overall = (bass + treble) / 2;

  bassAvg   += (bass   - bassAvg)   * 0.04;
  trebleAvg += (treble - trebleAvg) * 0.04;
  micAvg    += (overall - micAvg)   * 0.04;

  const bassRatio   = bassAvg   > 2 ? bass   / bassAvg   : 1;
  const trebleRatio = trebleAvg > 2 ? treble / trebleAvg : 1;

  const trebleNorm = Math.min(1, treble / 80);
  const bassNorm   = Math.min(1, bass   / 80);

  // Continuous routing
  if(trebleToDensity) beatDensityAdd += (trebleNorm * beatDensitySpike - beatDensityAdd) * 0.15;
  if(bassToDensity)   beatDensityAdd += (bassNorm   * beatDensitySpike - beatDensityAdd) * 0.15;
  if(bassToSway)      beatSwayAdd    += (bassNorm   * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if(trebleToSway)    beatSwayAdd    += (trebleNorm * beatSwaySpike    - beatSwayAdd)    * 0.12;

  // Beat spike detection — fires on whichever band(s) cross threshold
  const bassHit   = bassRatio   > beatThreshold;
  const trebleHit = trebleRatio > beatThreshold;
  const shouldFire = (bassHit || trebleHit) && now > beatCooldown;

  if(shouldFire) {
    beatCooldown = now + 180;
    if((bassHit   && bassToSpeed)   || (trebleHit && trebleToSpeed)) {
      beatSpeedScroll = geoSpeed * (beatSpikeSize + Math.random() * 2.0);
      beatSpeedHero   = geoSpeed * (beatSpikeSize * 0.72 + Math.random() * 2.5);
    }
    if((bassHit   && bassToSway)    || (trebleHit && trebleToSway))
      beatSwayAdd = beatSwaySpike * (1.5 + Math.random());
    if((bassHit   && bassToDensity) || (trebleHit && trebleToDensity))
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
    micOn = true; micAvg = 0; bassAvg = 0; trebleAvg = 0;
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
  { sym:6,  phase:0,    speed:0.000065, phase2:0,    speed2:-0.000042, maxAlpha:0.22, col:COPPER, x:0.38, y:0.42, size:3.8, period:70000 },
  { sym:8,  phase:1.1,  speed:0.000048, phase2:0.5,  speed2: 0.000035, maxAlpha:0.18, col:TEAL,   x:0.62, y:0.55, size:4.2, period:85000 },
  { sym:5,  phase:3.3,  speed:0.000078, phase2:1.2,  speed2:-0.000055, maxAlpha:0.16, col:GOLD,   x:0.45, y:0.62, size:3.2, period:60000 },
  { sym:7,  phase:2.2,  speed:0.000055, phase2:0.8,  speed2: 0.000044, maxAlpha:0.14, col:RUST,   x:0.58, y:0.38, size:4.6, period:90000 },
  { sym:12, phase:5.1,  speed:0.000038, phase2:2.1,  speed2:-0.000028, maxAlpha:0.12, col:GOLD,   x:0.35, y:0.35, size:5.0, period:100000 },
];

function drawGeom(g, now) {
  const scrollReveal = inFullscreen ? 1 : Math.min(1, Math.max(0, (window.scrollY - H*0.4) / (H*0.4)));
  if(scrollReveal <= 0) return;
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
  const cx = W * 0.5 + (g.x - 0.5) * W * (1 + drift) + lateralSway;
  const cy = H * 0.5 + (g.y - 0.5) * H * (1 + drift);
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


const motes = Array.from({length:55},()=>({x:Math.random(),y:Math.random(),r:0.7+Math.random()*2,col:[TEAL,COPPER,GOLD,RUST][Math.floor(Math.random()*4)],vx:(Math.random()-0.5)*0.00009,vy:-(0.00007+Math.random()*0.00014),phase:Math.random()*Math.PI*2,speed:0.004+Math.random()*0.007,life:Math.random(),maxLife:0.4+Math.random()*0.5}));
const wisps = Array.from({length:4},()=>({x:Math.random(),y:0.3+Math.random()*0.6,w:0.35+Math.random()*0.45,h:0.04+Math.random()*0.07,col:Math.random()>0.5?TEAL:COPPER,vx:(Math.random()-0.5)*0.00005,phase:Math.random()*Math.PI*2,speed:0.0005+Math.random()*0.0006}));

let t=0;
let smoothScroll = 0; // lerped scroll fraction for tunnel drift

// Original flat 2D geometry — hero only, fades out as you scroll
// Hero geometry — now fully 3D, fades out as you scroll
const heroGeom = [
  { rings:[1,0.618,0.382], spokes:5, phase:0,   rotSpeedX:0.00009, rotSpeedZ:0.00005, rotOffX:1.4,  rotOffZ:0.6,  maxAlpha:0.07,  col:COPPER, x:0.15, y:0.4,  size:0.22, period:18000 },
  { rings:[1,0.5,0.25],    spokes:6, phase:2.1, rotSpeedX:0.00007, rotSpeedZ:0.00009, rotOffX:0.3,  rotOffZ:2.1,  maxAlpha:0.055, col:TEAL,   x:0.82, y:0.6,  size:0.18, period:21000 },
  { rings:[1,0.707,0.35],  spokes:4, phase:4.4, rotSpeedX:0.00012, rotSpeedZ:0.00004, rotOffX:2.0,  rotOffZ:1.1,  maxAlpha:0.045, col:GOLD,   x:0.5,  y:0.15, size:0.15, period:24000 },
];

function drawHeroGeom(g, now) {
  const scrollFade = inFullscreen ? 1 : Math.max(0, 1 - window.scrollY / (H * 0.6));
  if(scrollFade <= 0) return;
  const alpha = g.maxAlpha * scrollFade;

  const cx = g.x*W, cy = g.y*H;
  const base = Math.min(W,H)*g.size;
  const rotX = g.rotOffX + now*g.rotSpeedX*beatSpeedHero + Math.sin(now*0.00005 + g.phase)*0.3;
  const rotZ = g.rotOffZ + now*g.rotSpeedZ*beatSpeedHero + Math.cos(now*0.00004 + g.phase)*0.2;

  function draw3DCircleH(ocx, ocy, ocz, r, steps) {
    steps = steps || 72;
    ctx.beginPath();
    for(let i=0; i<=steps; i++){
      const a = (i/steps)*Math.PI*2;
      const px = ocx + Math.cos(a)*r;
      const py = ocy;
      const pz = ocz + Math.sin(a)*r;
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
      const x1 = px*cosZ - py*sinZ;
      const y1 = px*sinZ + py*cosZ;
      const z1 = pz;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const x2 = x1;
      const y2 = y1*cosX - z1*sinX;
      const z2 = y1*sinX + z1*cosX;
      const fov = 2.8;
      const scale = fov/(fov+z2);
      if(i===0) ctx.moveTo(cx+x2*scale, cy+y2*scale);
      else ctx.lineTo(cx+x2*scale, cy+y2*scale);
    }
    ctx.stroke();
  }

  ctx.save();
  ctx.strokeStyle = rgb(g.col, alpha);
  ctx.lineWidth = 0.9;
  g.rings.forEach(r => draw3DCircleH(0, 0, 0, base*r, 96));
  ctx.lineWidth = 0.5;
  for(let s=0; s<g.spokes; s++){
    const ang = (s/g.spokes)*Math.PI*2;
    const ox = Math.cos(ang)*base*0.5;
    const oz = Math.sin(ang)*base*0.5;
    draw3DCircleH(ox, 0, oz, base*0.5, 56);
  }
  ctx.lineWidth = 0.18;
  ctx.strokeStyle = rgb(g.col, alpha*0.2);
  for(let s=0; s<g.spokes; s++){
    const ang = (s/g.spokes)*Math.PI*2;
    draw3DLine(cx, cy, 0, 0, Math.cos(ang)*base, Math.sin(ang)*base, rotX, rotZ);
  }
  ctx.restore();
}


function draw(){
  ctx.clearRect(0,0,W,H);
  const now = performance.now();
  updateBeat(now);
  // Lerp scroll fraction toward actual value — ~3s ramp at 60fps (0.008 per frame)
  if(!inFullscreen) {
    const totalH = document.body.scrollHeight - window.innerHeight;
    const targetScroll = totalH > 0 ? window.scrollY / totalH : 0;
    smoothScroll += (targetScroll - smoothScroll) * 0.008;
  }
  if(heroGeoOn)  heroGeom.forEach(g => drawHeroGeom(g, now));
  if(scrollGeoOn) geomDefs.forEach(g => drawGeom(g, now));
  if(wispsOn) wisps.forEach(w=>{
    w.x+=w.vx;
    if(w.x<-0.4)w.x=1.2;if(w.x>1.2)w.x=-0.4;
    const p=1+0.06*Math.sin(t*w.speed*1000+w.phase);
    const g=ctx.createRadialGradient(w.x*W,w.y*H,0,w.x*W,w.y*H,w.w*W*p);
    g.addColorStop(0,rgb(w.col,0.04));g.addColorStop(0.5,rgb(w.col,0.015));g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(w.x*W,w.y*H,w.w*W*p,w.h*H*p,0,0,Math.PI*2);ctx.fill();
  });
  if(motesOn) motes.slice(0, moteCount).forEach(m=>{
    m.x+=m.vx+Math.sin(t*m.speed*500+m.phase)*0.00006;
    m.y+=m.vy;
    m.life+=m.speed*0.45;
    if(m.y<-0.05||m.life>m.maxLife){m.x=Math.random();m.y=0.9+Math.random()*0.15;m.life=0;m.col=[TEAL,COPPER,GOLD,RUST][Math.floor(Math.random()*4)];}
    const rel=m.life/m.maxLife;
    let a=rel<0.2?rel/0.2:rel>0.75?1-(rel-0.75)/0.25:1;
    a*=0.5;
    if(Math.random()<0.002)a*=0.2+Math.random()*0.8;
    const g=ctx.createRadialGradient(m.x*W,m.y*H,0,m.x*W,m.y*H,m.r*2.5);
    g.addColorStop(0,rgb(m.col,a));g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x*W,m.y*H,m.r*2.5,0,Math.PI*2);ctx.fill();
  });
  t+=0.016;
  requestAnimationFrame(draw);
}
draw();

// SCROLL REVEAL
const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}});},{threshold:0.07});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

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

});