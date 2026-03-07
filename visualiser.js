// ── VISUALISER.JS — standalone mobile kaleidoscope ───────────────────────────
// Extracted from script.js. No particles (sparks/floaters/wisps). No site code.
// Two modes: ambient (time-based) and sound-reactive (mic + beat detection).

'use strict';

// ── STATE ─────────────────────────────────────────────────────────────────────
let soundMode    = false;  // false = ambient, true = sound-reactive
let geoOn        = true;

// Visualiser parameters — line thickness and opacity always full
let lineDensity  = 12;     // overridden per mode on switch
let geoSpeed     = 0.55;
let geoScale     = 1.0;    // global size multiplier; vertical swipe (0.3–2.5)
const geoOpacity = 1.0;    // fixed: always full
const geoLineWidth = 2.5;  // fixed: always full
let lateralAmp   = 0.008;

// Mic / beat detection state
let micOn        = false;
let micAnalyser  = null;
let micDataArray = null;
let micStream    = null;
let micAvg = 0, bassAvg = 0, midAvg = 0, trebleAvg = 0;
let beatSpeedScroll = 1;
let beatDensityAdd  = 0;
let beatSwayAdd     = 0;
let beatCooldown    = 0;

// Fixed routing: bass→speed+sway, treble→density (best defaults, no UI needed)
const beatThreshold    = 1.65;
const beatSpikeSize    = 2.5;
const beatDensitySpike = 8;
const beatSwaySpike    = 0.04;
const bassStart = 0,  bassEnd = 10;
const midStart  = 10, midEnd  = 30;
const trebleStart = 30, trebleEnd = 80;
const normCeil  = 80;
const minAvgGate = 2;

// Mic sensitivity presets (affects threshold multiplier)
const MIC_SENSITIVITY = [
  { label: 'Low',  threshold: 2.0, spikeSize: 1.8 },
  { label: 'Med',  threshold: 1.65, spikeSize: 2.5 },
  { label: 'High', threshold: 1.3,  spikeSize: 3.5 },
];
let micSensIdx = 1; // default Med
let activeBeatThreshold = beatThreshold;
let activeSpikeSize     = beatSpikeSize;

// Mode defaults
const AMBIENT_DEFAULTS = { geoSpeed: 0.55, lineDensity: 12 };
const SOUND_DEFAULTS   = { geoSpeed: 1.0,  lineDensity: 18 };

// ── CANVAS ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

const TEAL   = [46, 123, 122];
const COPPER = [184, 115, 51];
const RUST   = [160, 70, 42];
const GOLD   = [200, 169, 110];
function rgb(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

// ── PALETTE SYSTEM ────────────────────────────────────────────────────────────
// Each palette has 4 colours with strong hue contrast between slots:
// a=primary, b=complement/contrast, c=highlight, d=deep accent
const PALETTES = [
  // Earthen: warm copper against cool teal, gold vs deep crimson
  { name: 'Earthen',  a: [184,115, 51], b: [ 46,123,122], c: [220,180, 70], d: [130, 35, 35] },
  // Amethyst: violet + golden split-complement + teal + deep plum
  { name: 'Amethyst', a: [120, 45,195], b: [200,160, 20], c: [ 50,165,135], d: [ 70, 12,140] },
  // Ocean: deep blue + warm amber complement + aqua + raspberry
  { name: 'Ocean',    a: [ 18, 92,210], b: [220,115, 25], c: [ 22,178,165], d: [160, 28, 95] },
  // Verdant: vivid green + crimson complement + lime + indigo
  { name: 'Verdant',  a: [ 22,158, 72], b: [188, 45, 45], c: [140,210, 35], d: [ 65, 30,168] },
  // Ember: vermillion + cobalt complement + amber + deep rose
  { name: 'Ember',    a: [225, 55, 18], b: [ 18, 90,190], c: [248,158, 18], d: [158, 18, 65] },
  // Dusk: hot magenta + teal complement + violet + lime
  { name: 'Dusk',     a: [208, 32,145], b: [ 32,162,128], c: [ 95, 18,182], d: [158,215, 30] },
  // Aurora: electric green + vivid violet + cyan + deep magenta
  { name: 'Aurora',   a: [ 42,222, 88], b: [145, 22,208], c: [ 12,208,228], d: [208, 40,155] },
];
// Which palette slot each geomDef uses (matches original COPPER/TEAL/GOLD/RUST/GOLD order)
const GEO_SLOTS = ['a', 'b', 'c', 'd', 'c'];

let paletteIdx      = 0;
let paletteProgress = 1.0; // 0→1 during cross-fade, 1 = fully at target
let paletteFrom     = null; // colour snapshot at transition start
let paletteTo       = PALETTES[0];

function cyclePalette() {
  // Snapshot current geomDef colours as the "from" state
  paletteFrom = {
    a: [...geomDefs[0].col],
    b: [...geomDefs[1].col],
    c: [...geomDefs[2].col],
    d: [...geomDefs[3].col],
  };
  paletteIdx  = (paletteIdx + 1) % PALETTES.length;
  paletteTo   = PALETTES[paletteIdx];
  paletteProgress = 0.0;
  const btn = document.getElementById('btnPalette');
  if (btn) btn.textContent = paletteTo.name;
  debouncedSave();
}

// ── STATE PERSISTENCE ─────────────────────────────────────────────────────────
let saveTimer = null;
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem('vis_auto', JSON.stringify({ paletteIdx, lineDensity, geoSpeed, geoScale }));
    } catch(e) {}
  }, 800);
}

function applyState(s, animate) {
  if (!s) return;
  if (s.paletteIdx != null && s.paletteIdx !== paletteIdx) {
    if (animate) {
      paletteFrom = { a:[...geomDefs[0].col], b:[...geomDefs[1].col], c:[...geomDefs[2].col], d:[...geomDefs[3].col] };
      paletteProgress = 0.0;
    } else {
      paletteProgress = 1.0;
    }
    paletteIdx = s.paletteIdx;
    paletteTo  = PALETTES[paletteIdx] || PALETTES[0];
    if (!animate) geomDefs.forEach((g, i) => { g.col = [...paletteTo[GEO_SLOTS[i]]]; });
    const btn = document.getElementById('btnPalette');
    if (btn) btn.textContent = paletteTo.name;
  }
  if (s.lineDensity != null) lineDensity = Math.max(1,  Math.min(36,  s.lineDensity));
  if (s.geoSpeed    != null) geoSpeed    = Math.max(0.1, Math.min(4.0, s.geoSpeed));
  if (s.geoScale    != null) geoScale    = Math.max(0.3, Math.min(2.5, s.geoScale));
}

function loadAutoState() {
  try {
    const raw = localStorage.getItem('vis_auto');
    if (raw) applyState(JSON.parse(raw), false);
  } catch(e) {}
}

// Preset slots ─ tap to load, hold 500ms to save
function savePreset(slot) {
  try {
    localStorage.setItem(`vis_preset_${slot}`, JSON.stringify({
      paletteIdx, lineDensity, geoSpeed, geoScale, paletteName: paletteTo.name,
    }));
    updatePresetButtons();
  } catch(e) {}
}

function loadPreset(slot) {
  try {
    const raw = localStorage.getItem(`vis_preset_${slot}`);
    if (!raw) return false;
    applyState(JSON.parse(raw), true);
    debouncedSave();
    return true;
  } catch(e) { return false; }
}

function updatePresetButtons() {
  document.querySelectorAll('.btnSlot').forEach((btn, i) => {
    try {
      const raw = localStorage.getItem(`vis_preset_${i}`);
      if (raw) {
        const s = JSON.parse(raw);
        btn.textContent = s.paletteName || `Slot ${i + 1}`;
        btn.classList.add('filled');
      } else {
        btn.textContent = `Slot ${i + 1}`;
        btn.classList.remove('filled');
      }
    } catch(e) {}
  });
}

function updatePaletteTransition(dt) {
  if (paletteProgress >= 1.0 || !paletteFrom) return;
  paletteProgress = Math.min(1.0, paletteProgress + dt / 1500); // 1.5 s cross-fade
  const t = paletteProgress;
  const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // smooth ease-in-out
  geomDefs.forEach((g, i) => {
    const slot = GEO_SLOTS[i];
    const fr   = paletteFrom[slot];
    const to   = paletteTo[slot];
    g.col = [
      Math.round(fr[0] + (to[0] - fr[0]) * ease),
      Math.round(fr[1] + (to[1] - fr[1]) * ease),
      Math.round(fr[2] + (to[2] - fr[2]) * ease),
    ];
  });
  if (paletteProgress >= 1.0) {
    geomDefs.forEach((g, i) => { g.col = [...paletteTo[GEO_SLOTS[i]]]; });
  }
}

// ── GEOMETRY DEFINITIONS ──────────────────────────────────────────────────────
const geomDefs = [
  { sym:6,  phase:0,   speed:0.000065, phase2:0,   speed2:-0.000042, maxAlpha:0.85, col:COPPER, x:0.38, y:0.42, size:3.8, period:70000 },
  { sym:8,  phase:1.1, speed:0.000048, phase2:0.5, speed2: 0.000035, maxAlpha:0.80, col:TEAL,   x:0.62, y:0.55, size:4.2, period:85000 },
  { sym:5,  phase:3.3, speed:0.000078, phase2:1.2, speed2:-0.000055, maxAlpha:0.75, col:GOLD,   x:0.45, y:0.62, size:3.2, period:60000 },
  { sym:7,  phase:2.2, speed:0.000055, phase2:0.8, speed2: 0.000044, maxAlpha:0.75, col:RUST,   x:0.58, y:0.38, size:4.6, period:90000 },
  { sym:12, phase:5.1, speed:0.000038, phase2:2.1, speed2:-0.000028, maxAlpha:0.70, col:GOLD,   x:0.35, y:0.35, size:5.0, period:100000 },
];

// ── DRAW GEOMETRY ─────────────────────────────────────────────────────────────
function drawGeom(g, now) {
  const formDur    = g.period * 0.12;
  const dissolveDur = g.period * 0.12;
  const holdDur    = g.period - formDur - dissolveDur;
  const elapsed    = ((now * 0.65 + g.phase * 3000) % g.period + g.period) % g.period;

  let alpha;
  if (elapsed < formDur)
    alpha = (elapsed / formDur) * g.maxAlpha;
  else if (elapsed < formDur + holdDur)
    alpha = g.maxAlpha;
  else
    alpha = (1 - (elapsed - formDur - holdDur) / dissolveDur) * g.maxAlpha;

  if (alpha <= 0.002) return;
  alpha *= geoOpacity;

  const lateralSway = Math.sin(now * 0.00008 + g.phase * 1.7) * (lateralAmp + beatSwayAdd) * W;
  const cx = W * 0.5 + (g.x - 0.5) * W + lateralSway;
  const cy = H * 0.5 + (g.y - 0.5) * H;
  const R  = Math.min(W, H) * g.size * geoScale;
  const rot1 = g.phase  + now * g.speed  * geoSpeed * beatSpeedScroll;
  const rot2 = g.phase2 + now * g.speed2 * geoSpeed * beatSpeedScroll;
  const sym  = g.sym;
  const wedge = Math.PI * 2 / sym;

  ctx.save();
  ctx.strokeStyle = rgb(g.col, alpha);

  function drawArm(rot) {
    const steps = Math.round(lineDensity + beatDensityAdd);
    for (let i = 1; i <= steps; i++) {
      const t  = i / steps;
      const r  = R * Math.pow(t, 1.4);
      const cr = R * 0.38 * Math.pow(1 - t * 0.6, 1.2);
      if (cr < 1) continue;

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

    ctx.lineWidth = 0.6 * geoLineWidth;
    [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0.146].forEach(f => {
      ctx.beginPath(); ctx.arc(cx, cy, R * f, rot, rot + wedge); ctx.stroke();
    });

    ctx.lineWidth = 0.25 * geoLineWidth;
    ctx.strokeStyle = rgb(g.col, alpha * 0.4);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(rot) * R, cy + Math.sin(rot) * R); ctx.stroke();
  }

  for (let s = 0; s < sym; s++) {
    const angle = s * wedge;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
    if (s % 2 === 1) {
      ctx.translate(cx, cy);
      ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }
    ctx.strokeStyle = rgb(g.col, alpha);
    drawArm(rot1);
    ctx.strokeStyle = rgb(g.col, alpha * 0.45);
    drawArm(rot2);
    ctx.restore();
  }

  ctx.restore();
}

// ── AUDIO / BEAT DETECTION ────────────────────────────────────────────────────
function getFreqBand(analyser, dataArray, startBin, endBin) {
  analyser.getByteFrequencyData(dataArray);
  let sum = 0;
  for (let i = startBin; i < endBin; i++) sum += dataArray[i];
  return sum / (endBin - startBin);
}

function updateBeat(now) {
  // Always decay toward neutral each frame
  beatSpeedScroll += (1 - beatSpeedScroll) * 0.06;
  beatDensityAdd  += (0 - beatDensityAdd)  * 0.08;
  beatSwayAdd     += (0 - beatSwayAdd)     * 0.07;

  if (!micOn || !micAnalyser) return;

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
  const trebleNorm  = Math.min(1, treble / normCeil);
  const bassNorm    = Math.min(1, bass   / normCeil);

  // Continuous routing: bass→sway, treble→density
  beatSwayAdd    += (bassNorm   * beatSwaySpike    - beatSwayAdd)    * 0.12;
  beatDensityAdd += (trebleNorm * beatDensitySpike - beatDensityAdd) * 0.15;

  // Beat spike: bass and treble cross threshold
  const bassHit   = bassRatio   > activeBeatThreshold;
  const trebleHit = trebleRatio > activeBeatThreshold;
  if ((bassHit || trebleHit) && now > beatCooldown) {
    beatCooldown = now + 180;
    if (bassHit) {
      beatSpeedScroll = geoSpeed * (activeSpikeSize + Math.random() * 2.0);
      beatSwayAdd = beatSwaySpike * (1.5 + Math.random());
    }
    if (trebleHit) beatDensityAdd = beatDensitySpike * (1.5 + Math.random());
  }

  // Mic indicator pulse
  const dot = document.getElementById('micDot');
  if (dot) {
    const energy = Math.min(1, overall / 60);
    dot.style.opacity = 0.4 + energy * 0.6;
    dot.style.transform = `scale(${1 + energy * 0.5})`;
  }
}

async function enableMic() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaStreamSource(micStream);
    micAnalyser = actx.createAnalyser();
    micAnalyser.fftSize = 512;
    micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
    src.connect(micAnalyser);
    micOn = true;
    micAvg = 0; bassAvg = 0; midAvg = 0; trebleAvg = 0;
    return true;
  } catch(e) {
    console.warn('Mic access denied:', e);
    return false;
  }
}

function disableMic() {
  micOn = false;
  micAnalyser = null;
  micDataArray = null;
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  beatSpeedScroll = 1;
  beatDensityAdd  = 0;
  beatSwayAdd     = 0;
}

// ── ANIMATION LOOP ────────────────────────────────────────────────────────────
let t = 0;
let lastFrameTime = performance.now();
function draw() {
  ctx.clearRect(0, 0, W, H);
  const now = performance.now();
  const dt  = Math.min(now - lastFrameTime, 100); // cap at 100ms to avoid jumps on tab resume
  lastFrameTime = now;
  updateBeat(now);
  updatePaletteTransition(dt);
  if (geoOn) geomDefs.forEach(g => drawGeom(g, now));
  t += 0.016;
  requestAnimationFrame(draw);
}
draw();

// ── MODE SWITCHING ────────────────────────────────────────────────────────────
async function setMode(sound) {
  soundMode = sound;
  const btn = document.getElementById('btnMode');
  const micDot = document.getElementById('micDot');
  const sensRow = document.getElementById('sensSetting');

  if (sound) {
    Object.assign({ geoSpeed, lineDensity }, SOUND_DEFAULTS);
    geoSpeed    = SOUND_DEFAULTS.geoSpeed;
    lineDensity = SOUND_DEFAULTS.lineDensity;
    const ok = await enableMic();
    if (ok) {
      if (btn)    btn.textContent = 'Mic: ON';
      if (micDot) micDot.style.display = 'block';
      if (sensRow) sensRow.style.display = 'flex';
    } else {
      soundMode = false;
      if (btn)    btn.textContent = 'Sound';
      if (micDot) micDot.style.display = 'none';
      if (sensRow) sensRow.style.display = 'none';
    }
  } else {
    disableMic();
    geoSpeed    = AMBIENT_DEFAULTS.geoSpeed;
    lineDensity = AMBIENT_DEFAULTS.lineDensity;
    if (btn)    btn.textContent = 'Sound';
    if (micDot) micDot.style.display = 'none';
    if (sensRow) sensRow.style.display = 'none';
  }
  updateHUDState();
}

function cycleSensitivity() {
  micSensIdx = (micSensIdx + 1) % MIC_SENSITIVITY.length;
  const s = MIC_SENSITIVITY[micSensIdx];
  activeBeatThreshold = s.threshold;
  activeSpikeSize     = s.spikeSize;
  const el = document.getElementById('btnSens');
  if (el) el.textContent = `Sens: ${s.label}`;
}

function resetDefaults() {
  const d = soundMode ? SOUND_DEFAULTS : AMBIENT_DEFAULTS;
  geoSpeed    = d.geoSpeed;
  lineDensity = d.lineDensity;
  geoScale    = 1.0;
  geoOn       = true;
  updateHUDState();
  debouncedSave();
}

function updateHUDState() {
  const btnGeo = document.getElementById('btnGeo');
  if (btnGeo) btnGeo.textContent = geoOn ? 'Geo: ON' : 'Geo: OFF';
}

// ── HUD ───────────────────────────────────────────────────────────────────────
const hud = document.getElementById('hud');
let hudVisible  = false;
let hudTimeout  = null;

function showHUD() {
  if (!hud) return;
  hudVisible = true;
  hud.classList.add('visible');
  resetHUDTimer();
}

function hideHUD() {
  if (!hud) return;
  hudVisible = false;
  hud.classList.remove('visible');
  if (hudTimeout) { clearTimeout(hudTimeout); hudTimeout = null; }
}

function resetHUDTimer() {
  if (hudTimeout) clearTimeout(hudTimeout);
  hudTimeout = setTimeout(hideHUD, 4000);
}

function toggleHUD() {
  if (hudVisible) hideHUD();
  else showHUD();
}

// ── INFO OVERLAY ──────────────────────────────────────────────────────────────
const infoOverlay = document.getElementById('infoOverlay');

function showInfo() {
  if (infoOverlay) infoOverlay.classList.add('visible');
}
function hideInfo() {
  if (infoOverlay) infoOverlay.classList.remove('visible');
}

document.getElementById('btnInfoClose')?.addEventListener('click', hideInfo);
document.getElementById('btnInfo')?.addEventListener('click', showInfo);

// Wire up HUD buttons
document.getElementById('btnMode')?.addEventListener('click', () => {
  setMode(!soundMode);
  resetHUDTimer();
});
document.getElementById('btnSens')?.addEventListener('click', () => {
  cycleSensitivity();
  resetHUDTimer();
});
document.getElementById('btnReset')?.addEventListener('click', () => {
  resetDefaults();
  resetHUDTimer();
});
document.getElementById('btnPalette')?.addEventListener('click', () => {
  cyclePalette();
  resetHUDTimer();
});

// Preset slots — tap to load, hold 500ms to save
document.querySelectorAll('.btnSlot').forEach((btn) => {
  const slot = parseInt(btn.dataset.slot, 10);
  let holdTimer = null;
  let didHold   = false;

  btn.addEventListener('pointerdown', () => {
    didHold   = false;
    holdTimer = setTimeout(() => {
      didHold = true;
      savePreset(slot);
      btn.textContent = 'Saved!';
      setTimeout(() => updatePresetButtons(), 700);
      resetHUDTimer();
    }, 500);
  });

  btn.addEventListener('pointerup', () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (!didHold) {
      const loaded = loadPreset(slot);
      if (!loaded) {
        const prev = btn.textContent;
        btn.textContent = '(empty)';
        setTimeout(() => { btn.textContent = prev; }, 700);
      }
      resetHUDTimer();
    }
  });

  btn.addEventListener('pointercancel', () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  });
});

// Restore last session state and initialise preset button labels
loadAutoState();
updatePresetButtons();
document.getElementById('btnFullscreen')?.addEventListener('click', () => {
  toggleFullscreen();
  resetHUDTimer();
});

// Fullscreen
function toggleFullscreen() {
  const btn = document.getElementById('btnFullscreen');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    if (btn) btn.textContent = 'Exit Full';
  } else {
    document.exitFullscreen().catch(() => {});
    if (btn) btn.textContent = 'Fullscreen';
  }
}
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btnFullscreen');
  if (btn) btn.textContent = document.fullscreenElement ? 'Exit Full' : 'Fullscreen';
});

// ── TOUCH GESTURES ────────────────────────────────────────────────────────────
// Single-finger swipe L/R → lineDensity (1–36)
// Single-finger swipe U/D → geoScale (0.3–2.5)   [axis-locked per gesture]
// Pinch in/out → geoSpeed (0.1–4.0)
// Double-tap → toggle HUD
// Long-press (500ms) → fullscreen

let touches = {};        // active touches by id
let lastTapTime = 0;
let longPressTimer = null;
let gestureStartDist = null;
let gestureStartSpeed = null;
let swipeStartX = null;
let swipeStartY = null;
let swipeStartDensity = null;
let swipeStartScale = null;
let swipeAxis = null;    // null | 'h' | 'v' — locked once first move detected
let gestureConsumed = false;

canvas.addEventListener('touchstart', onTouchStart, { passive: false });
canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
canvas.addEventListener('touchcancel',onTouchEnd,   { passive: false });

function onTouchStart(e) {
  e.preventDefault();
  for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };

  const count = Object.keys(touches).length;
  gestureConsumed = false;

  if (count === 1) {
    const touch = e.changedTouches[0];
    swipeStartX       = touch.clientX;
    swipeStartY       = touch.clientY;
    swipeStartDensity = lineDensity;
    swipeStartScale   = geoScale;
    swipeAxis         = null;

    // Double-tap detection
    const now = Date.now();
    if (now - lastTapTime < 300) {
      toggleHUD();
      gestureConsumed = true;
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }

    // Long-press for fullscreen
    longPressTimer = setTimeout(() => {
      toggleFullscreen();
      gestureConsumed = true;
    }, 500);

  } else if (count === 2) {
    // Cancel long-press on two-finger gesture
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    const pts = Object.values(touches);
    gestureStartDist  = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    gestureStartSpeed = geoSpeed;
    swipeStartX = null; // disable swipe while pinching
    swipeAxis   = null;
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (touches[t.identifier]) touches[t.identifier] = { x: t.clientX, y: t.clientY };
  }

  const count = Object.keys(touches).length;

  if (count === 1 && swipeStartX !== null && !gestureConsumed) {
    // Cancel long-press if moved
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;

    // Lock to one axis on first significant movement
    if (!swipeAxis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipeAxis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }

    if (swipeAxis === 'h') {
      // Horizontal → line density (1–36); ~300px = full range
      lineDensity = Math.max(1, Math.min(36, Math.round(swipeStartDensity + (dx / 300) * 35)));
      debouncedSave();
    } else if (swipeAxis === 'v') {
      // Vertical → geo scale (0.3–2.5); swipe up = grow; full screen height ≈ 2× change
      geoScale = Math.max(0.3, Math.min(2.5, swipeStartScale + (-dy / H) * 1.8));
      debouncedSave();
    }

  } else if (count === 2 && gestureStartDist !== null) {
    const pts = Object.values(touches);
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    const ratio = dist / gestureStartDist;
    geoSpeed = Math.max(0.1, Math.min(4.0, gestureStartSpeed * ratio));
    debouncedSave();
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }

  for (const t of e.changedTouches) delete touches[t.identifier];

  const count = Object.keys(touches).length;
  if (count < 2) {
    gestureStartDist  = null;
    gestureStartSpeed = null;
  }
  if (count === 0) {
    swipeStartX       = null;
    swipeStartY       = null;
    swipeStartDensity = null;
    swipeStartScale   = null;
    swipeAxis         = null;
    gestureConsumed   = false;
  }
}
