// ── VISUALISER2.JS — Viz2 combined visualiser ─────────────────────────────────
// Geodes-only. Tunnel drift, tab audio, 6 preset slots, wide ranges.
// Two modes: ambient (time-based) and sound-reactive (mic or tab + beat detection).

'use strict';

// No-op until pane module sets it
window.viz2RefreshPane = function() {};

// ── STATE ─────────────────────────────────────────────────────────────────────
let soundMode    = false;  // false = ambient, true = sound-reactive
let geoOn        = true;

// Visualiser parameters — line thickness and opacity always full
let lineDensity  = 12;     // overridden per mode on switch
let geoSpeed     = 0.55;
let geoScale     = 1.0;    // global size multiplier; vertical swipe (0.3–2.5)
const geoOpacity = 1.0;    // fixed: always full
const geoLineWidth = 5.0;  // fixed: always full
let lateralAmp   = 0.008;
const TUNNEL_MAX = 2;     // cap so geodes stay on screen
let tunnelStrength = 0;   // 0–TUNNEL_MAX drift (shapes move outward)
let smoothDrift  = 0;     // smoothed toward tunnelStrength

// Gyro parallax
let gyroOn      = false;
let gyroX       = 0;        // smoothed -1…1, maps to GYRO_MAX_PX per depth unit
let gyroY       = 0;
let gyroTargetX = 0;
let gyroTargetY = 0;
let gyroBaseGamma = null;   // calibration capture on first reading
let gyroBaseBeta  = null;
const GYRO_RANGE  = 28;     // degrees of tilt = full effect
const GYRO_MAX_PX = 65;     // pixel shift for depth=1 geode at full tilt

// Drag / mouse state (declared here — draw loop reads these before their definition site)
let dragLockActive  = false;
let draggedGeomIdx  = -1;
let mouseDragActive  = false;
let mouseDragGeomIdx = -1;

// Mic / beat detection state
let micOn        = false;
let micAnalyser  = null;
let micDataArray = null;
let micStream    = null;
let tabStream    = null;   // getDisplayMedia stream when using tab audio
let audioContext = null;   // shared for mic and tab
let audioSourceMode = 'mic'; // 'mic' | 'tab'
let micAvg = 0, bassAvg = 0, midAvg = 0, trebleAvg = 0;
let beatSpeedScroll = 1;
let beatDensityAdd  = 0;
let beatSwayAdd     = 0;
let beatCooldown    = 0;

// Configurable routing: which band drives speed / sway / density (toggle per cell)
let bassToSpeed   = true;
let bassToSway    = true;
let bassToDensity = false;
let midToSpeed    = false;
let midToSway     = false;
let midToDensity  = false;
let trebleToSpeed = false;
let trebleToSway  = false;
let trebleToDensity = true;
const beatThreshold    = 1.65;
const beatSpikeSize    = 2.5;
const beatDensitySpike = 8;
const beatSwaySpike    = 0.04;
// FFT has 256 bins (fftSize 512). Defaults use full range so high end is active.
let bassStart = 0,  bassEnd = 15;   // bins 0–14 (~0–1.3 kHz)
let midStart  = 15, midEnd  = 55;   // bins 15–54 (~1.3–4.7 kHz)
let trebleStart = 55, trebleEnd = 256; // bins 55–255 (~4.7–22 kHz)
let normCeil  = 80;
let minAvgGate = 2;

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

// Detect pointer type: coarse = touch/mobile, fine = mouse/desktop
const isMobile = window.matchMedia('(pointer: coarse)').matches;

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
      localStorage.setItem('vis2_auto', JSON.stringify({
        paletteIdx, lineDensity, geoSpeed, geoScale, lateralAmp, tunnelStrength,
        positions: geomDefs.map(g => ({ x: g.x, y: g.y })),
        routing: { bassToSpeed, bassToSway, bassToDensity, midToSpeed, midToSway, midToDensity, trebleToSpeed, trebleToSway, trebleToDensity },
        qualityMode,
      }));
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
  if (s.lineDensity != null) lineDensity = Math.max(1, Math.min(128, s.lineDensity));
  if (s.geoSpeed    != null) geoSpeed    = Math.max(0.05, Math.min(12, s.geoSpeed));
  if (s.geoScale    != null) geoScale    = Math.max(0.2, Math.min(6, s.geoScale));
  if (s.lateralAmp  != null) lateralAmp  = Math.max(0, Math.min(0.05, s.lateralAmp));
  if (s.tunnelStrength != null) tunnelStrength = Math.max(0, Math.min(TUNNEL_MAX, s.tunnelStrength));
  if (Array.isArray(s.positions)) s.positions.forEach((p, i) => {
    if (geomDefs[i] && typeof p === 'object' && p !== null && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      geomDefs[i].x = Math.max(0.02, Math.min(0.98, p.x));
      geomDefs[i].y = Math.max(0.02, Math.min(0.98, p.y));
    }
  });
  if (s.routing) {
    if (s.routing.bassToSpeed != null)   bassToSpeed   = s.routing.bassToSpeed;
    if (s.routing.bassToSway != null)    bassToSway    = s.routing.bassToSway;
    if (s.routing.bassToDensity != null) bassToDensity = s.routing.bassToDensity;
    if (s.routing.midToSpeed != null)    midToSpeed    = s.routing.midToSpeed;
    if (s.routing.midToSway != null)     midToSway     = s.routing.midToSway;
    if (s.routing.midToDensity != null)  midToDensity  = s.routing.midToDensity;
    if (s.routing.trebleToSpeed != null) trebleToSpeed = s.routing.trebleToSpeed;
    if (s.routing.trebleToSway != null)  trebleToSway  = s.routing.trebleToSway;
    if (s.routing.trebleToDensity != null) trebleToDensity = s.routing.trebleToDensity;
    updateRoutingUI();
  }
  if (s.qualityMode && ['full', 'half', 'low'].includes(s.qualityMode)) setQualityMode(s.qualityMode);
  if (s.freqBands) {
    const b = s.freqBands;
    const B = 256;
    if (b.bassEnd != null)   { bassEnd = Math.max(1, Math.min(B - 2, b.bassEnd)); midStart = bassEnd; }
    if (b.midEnd != null)    { midEnd = Math.max(bassEnd + 1, Math.min(B - 1, b.midEnd)); trebleStart = midEnd; }
    if (b.trebleEnd != null) { trebleEnd = Math.max(trebleStart + 1, Math.min(B, b.trebleEnd)); }
    if (b.normCeil != null)  normCeil = Math.max(20, Math.min(255, b.normCeil));
    if (b.minAvgGate != null) minAvgGate = Math.max(1, Math.min(40, b.minAvgGate));
    if (window.viz2UpdateFreqRuler) window.viz2UpdateFreqRuler();
  }
}

function loadAutoState() {
  try {
    const raw = localStorage.getItem('vis2_auto');
    if (!raw) return;
    const data = JSON.parse(raw);
    applyState(data, false);
  } catch (e) {
    // Corrupt or legacy saved state can break the page in normal Chrome; incognito has no data so it works. Clear it.
    try { localStorage.removeItem('vis2_auto'); } catch (_) {}
  }
}

// Preset slots ─ tap to load, hold 500ms to save
function savePreset(slot) {
  try {
    localStorage.setItem(`vis2_preset_${slot}`, JSON.stringify({
      paletteIdx, lineDensity, geoSpeed, geoScale, lateralAmp, tunnelStrength, paletteName: paletteTo.name,
      positions: geomDefs.map(g => ({ x: g.x, y: g.y })),
    }));
    updatePresetButtons();
  } catch(e) {}
}

function loadPreset(slot) {
  try {
    const raw = localStorage.getItem(`vis2_preset_${slot}`);
    if (!raw) return false;
    applyState(JSON.parse(raw), true);
    debouncedSave();
    return true;
  } catch(e) { return false; }
}

function updatePresetButtons() {
  document.querySelectorAll('.btnSlot').forEach((btn, i) => {
    try {
      const raw = localStorage.getItem(`vis2_preset_${i}`);
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
// depth: 0=background (barely moves with gyro), 1=foreground (moves most)
const geomDefs = [
  { sym:6,  phase:0,   speed:0.000065, phase2:0,   speed2:-0.000042, maxAlpha:0.85, col:COPPER, x:0.38, y:0.42, size:3.8, period:70000,  depth:0.40 },
  { sym:8,  phase:1.1, speed:0.000048, phase2:0.5, speed2: 0.000035, maxAlpha:0.80, col:TEAL,   x:0.62, y:0.55, size:4.2, period:85000,  depth:0.60 },
  { sym:5,  phase:3.3, speed:0.000078, phase2:1.2, speed2:-0.000055, maxAlpha:0.75, col:GOLD,   x:0.45, y:0.62, size:3.2, period:60000,  depth:0.85 },
  { sym:7,  phase:2.2, speed:0.000055, phase2:0.8, speed2: 0.000044, maxAlpha:0.75, col:RUST,   x:0.58, y:0.38, size:4.6, period:90000,  depth:0.28 },
  { sym:12, phase:5.1, speed:0.000038, phase2:2.1, speed2:-0.000028, maxAlpha:0.70, col:GOLD,   x:0.35, y:0.35, size:5.0, period:100000, depth:0.06 },
];

// Capture default positions so Reset can restore them
const defaultPositions = geomDefs.map(g => ({ x: g.x, y: g.y }));

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
  const drift = 1 + smoothDrift;
  const cx = W * 0.5 + (g.x - 0.5) * W * drift + lateralSway + gyroX * g.depth * GYRO_MAX_PX;
  const cy = H * 0.5 + (g.y - 0.5) * H * drift                + gyroY * g.depth * GYRO_MAX_PX;
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
  if (audioContext && audioContext.state === 'suspended') audioContext.resume().catch(() => {});

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
  const midNorm     = Math.min(1, mid    / normCeil);
  const midRatio    = midAvg > minAvgGate ? mid / midAvg : 1;

  // Continuous routing (configurable)
  if (bassToSway)    beatSwayAdd    += (bassNorm   * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if (midToSway)     beatSwayAdd    += (midNorm    * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if (trebleToSway)  beatSwayAdd    += (trebleNorm * beatSwaySpike    - beatSwayAdd)    * 0.12;
  if (bassToDensity) beatDensityAdd += (bassNorm   * beatDensitySpike - beatDensityAdd) * 0.15;
  if (midToDensity)  beatDensityAdd += (midNorm    * beatDensitySpike - beatDensityAdd) * 0.15;
  if (trebleToDensity) beatDensityAdd += (trebleNorm * beatDensitySpike - beatDensityAdd) * 0.15;

  // Beat spike: any band crossing threshold can fire (according to routing)
  const bassHit   = bassRatio   > activeBeatThreshold;
  const midHit    = midRatio    > activeBeatThreshold;
  const trebleHit = trebleRatio > activeBeatThreshold;
  if ((bassHit || midHit || trebleHit) && now > beatCooldown) {
    beatCooldown = now + 180;
    if ((bassHit && bassToSpeed) || (midHit && midToSpeed) || (trebleHit && trebleToSpeed)) {
      beatSpeedScroll = geoSpeed * (activeSpikeSize + Math.random() * 2.0);
    }
    if ((bassHit && bassToSway) || (midHit && midToSway) || (trebleHit && trebleToSway)) {
      beatSwayAdd = beatSwaySpike * (1.5 + Math.random());
    }
    if ((bassHit && bassToDensity) || (midHit && midToDensity) || (trebleHit && trebleToDensity)) {
      beatDensityAdd = beatDensitySpike * (1.5 + Math.random());
    }
  }

  // Mic indicator pulse
  const dot = document.getElementById('micDot');
  if (dot) {
    const energy = Math.min(1, overall / 60);
    dot.style.opacity = 0.4 + energy * 0.6;
    dot.style.transform = `scale(${1 + energy * 0.5})`;
  }
}

let streamSourceNode = null; // MediaStreamSourceNode for current stream; disconnect when switching

function connectStreamToAnalyser(stream) {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (streamSourceNode) {
    try { streamSourceNode.disconnect(); } catch (_) {}
    streamSourceNode = null;
  }
  streamSourceNode = audioContext.createMediaStreamSource(stream);
  if (!micAnalyser) {
    micAnalyser = audioContext.createAnalyser();
    micAnalyser.fftSize = 512;
    micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
  }
  streamSourceNode.connect(micAnalyser);
  micOn = true;
  micAvg = 0; bassAvg = 0; midAvg = 0; trebleAvg = 0;
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}

async function enableMic() {
  try {
    if (tabStream) {
      tabStream.getTracks().forEach(t => t.stop());
      tabStream = null;
    }
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    connectStreamToAnalyser(micStream);
    audioSourceMode = 'mic';
    return true;
  } catch(e) {
    console.warn('Mic access denied:', e);
    return false;
  }
}

async function enableTabAudio() {
  try {
    if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      console.warn('Tab capture not supported');
      return false;
    }
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    tabStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    // Keep video tracks alive; stopping them can cause some browsers to end the entire capture after a few seconds
    connectStreamToAnalyser(tabStream);
    audioSourceMode = 'tab';
    tabStream.getTracks().forEach(t => {
      t.onended = () => {
        if (soundMode && tabStream) {
          disableMic();
          soundMode = false;
          updateAudioSourceUI();
          const modeBtn = document.getElementById('btnMode');
          if (modeBtn) modeBtn.textContent = 'Sound';
          updateHUDState();
        }
      };
    });
    return true;
  } catch(e) {
    console.warn('Tab capture failed:', e);
    return false;
  }
}

function disableMic() {
  micOn = false;
  if (streamSourceNode) {
    try { streamSourceNode.disconnect(); } catch (_) {}
    streamSourceNode = null;
  }
  micAnalyser = null;
  micDataArray = null;
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (tabStream) {
    tabStream.getTracks().forEach(t => t.stop());
    tabStream = null;
  }
  beatSpeedScroll = 1;
  beatDensityAdd  = 0;
  beatSwayAdd     = 0;
}

function restoreFullscreenIfNeeded(wasFullscreen) {
  if (wasFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

// ── QUALITY / FPS MODE ────────────────────────────────────────────────────────
// full = every frame, half = every 2nd, low = every 3rd (reduces CPU/GPU load)
let qualityMode = 'full';
let qualitySkip = 1;
let frameCount = 0;

function setQualityMode(mode) {
  qualityMode = mode;
  qualitySkip = mode === 'full' ? 1 : mode === 'half' ? 2 : 3;
  document.querySelectorAll('.quality-btn').forEach(btn => {
    if (!btn.id) return;
    const active = (btn.id === 'btnQualityFull' && mode === 'full') || (btn.id === 'btnQualityHalf' && mode === 'half') || (btn.id === 'btnQualityLow' && mode === 'low');
    btn.classList.toggle('active', active);
  });
  debouncedSave();
}

// ── ANIMATION LOOP ────────────────────────────────────────────────────────────
let t = 0;
let lastFrameTime = performance.now();
let rafId = null;

function draw() {
  if (document.hidden) {
    rafId = requestAnimationFrame(draw);
    return;
  }
  const now = performance.now();
  const dt  = Math.min(now - lastFrameTime, 100);
  lastFrameTime = now;
  frameCount++;

  smoothDrift += (tunnelStrength - smoothDrift) * 0.05;
  gyroX += (gyroTargetX - gyroX) * 0.08;
  gyroY += (gyroTargetY - gyroY) * 0.08;

  updateBeat(now);
  if (frameCount % qualitySkip !== 0) {
    rafId = requestAnimationFrame(draw);
    return;
  }
  ctx.clearRect(0, 0, W, H);
  updatePaletteTransition(dt);
  if (geoOn) geomDefs.forEach(g => drawGeom(g, now));

  // Drag indicator: dashed ring at whichever geode is being dragged
  const activeDragIdx = (dragLockActive && draggedGeomIdx >= 0)   ? draggedGeomIdx
                      : (mouseDragActive && mouseDragGeomIdx >= 0) ? mouseDragGeomIdx : -1;
  if (activeDragIdx >= 0) {
    const g  = geomDefs[activeDragIdx];
    const drift = 1 + smoothDrift;
    const cx = W * 0.5 + (g.x - 0.5) * W * drift + gyroX * g.depth * GYRO_MAX_PX;
    const cy = H * 0.5 + (g.y - 0.5) * H * drift + gyroY * g.depth * GYRO_MAX_PX;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(W, H) * 0.045, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  t += 0.016;
  rafId = requestAnimationFrame(draw);
}
draw();

// ── MODE SWITCHING ────────────────────────────────────────────────────────────
function hasActiveStreamForCurrentSource() {
  if (audioSourceMode === 'tab') return !!(tabStream && tabStream.active);
  return !!(micStream && micStream.active);
}

async function setMode(sound) {
  soundMode = sound;
  const btn = document.getElementById('btnMode');
  const micDot = document.getElementById('micDot');
  const sensRow = document.getElementById('sensSetting');

  if (sound) {
    geoSpeed    = SOUND_DEFAULTS.geoSpeed;
    lineDensity = SOUND_DEFAULTS.lineDensity;
    if (hasActiveStreamForCurrentSource()) {
      if (btn)    btn.textContent = 'Sound: ON';
      if (micDot) micDot.style.display = 'block';
      if (sensRow) sensRow.style.display = 'flex';
    } else {
      const wasFullscreen = !!document.fullscreenElement;
      const ok = audioSourceMode === 'tab' ? await enableTabAudio() : await enableMic();
      restoreFullscreenIfNeeded(wasFullscreen);
      if (ok) {
        if (btn)    btn.textContent = 'Sound: ON';
        if (micDot) micDot.style.display = 'block';
        if (sensRow) sensRow.style.display = 'flex';
      } else {
        soundMode = false;
        if (btn)    btn.textContent = 'Sound';
        if (micDot) micDot.style.display = 'none';
        if (sensRow) sensRow.style.display = 'none';
      }
    }
  } else {
    disableMic();
    geoSpeed    = AMBIENT_DEFAULTS.geoSpeed;
    lineDensity = AMBIENT_DEFAULTS.lineDensity;
    if (btn)    btn.textContent = 'Sound';
    if (micDot) micDot.style.display = 'none';
    if (sensRow) sensRow.style.display = 'none';
  }
  syncSlidersFromState();
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

const VIZ2_DEFAULTS = {
  lineDensity: 12,
  geoSpeed: 0.55,
  lateralAmp: 0.008,
  tunnelStrength: 0,
  geoScale: 1.0,
};

function resetDefaults() {
  const d = soundMode ? SOUND_DEFAULTS : AMBIENT_DEFAULTS;
  geoSpeed       = d.geoSpeed;
  lineDensity    = d.lineDensity;
  geoScale       = VIZ2_DEFAULTS.geoScale;
  lateralAmp     = VIZ2_DEFAULTS.lateralAmp;
  tunnelStrength = VIZ2_DEFAULTS.tunnelStrength;
  geoOn          = true;
  geomDefs.forEach((g, i) => { g.x = defaultPositions[i].x; g.y = defaultPositions[i].y; });
  syncSlidersFromState();
  updateHUDState();
  debouncedSave();
}

function syncSlidersFromState() {
  const el = (id, value) => { const e = document.getElementById(id); if (e && e.type === 'range') e.value = value; };
  el('sliderDensity', lineDensity);
  el('sliderSpeed', geoSpeed);
  el('sliderLateral', lateralAmp);
  el('sliderTunnel', tunnelStrength);
  el('sliderScale', geoScale);
  const val = (id, text) => { const e = document.getElementById(id); if (e) e.textContent = text; };
  val('valDensity', String(lineDensity));
  val('valSpeed', geoSpeed.toFixed(2));
  val('valLateral', lateralAmp.toFixed(3));
  val('valTunnel', tunnelStrength.toFixed(1));
  val('valScale', geoScale.toFixed(2));
  if (typeof window.viz2RefreshPane === 'function') window.viz2RefreshPane();
}

function updateHUDState() {
  const btnGeo = document.getElementById('btnGeo');
  if (btnGeo) btnGeo.textContent = geoOn ? 'Geo: ON' : 'Geo: OFF';
  syncSlidersFromState();
}

function updateRoutingUI() {
  const map = [
    ['rt_bass_speed',   bassToSpeed],   ['rt_bass_sway',    bassToSway],   ['rt_bass_density', bassToDensity],
    ['rt_mid_speed',    midToSpeed],    ['rt_mid_sway',     midToSway],    ['rt_mid_density',  midToDensity],
    ['rt_treble_speed', trebleToSpeed], ['rt_treble_sway',  trebleToSway], ['rt_treble_density', trebleToDensity],
  ];
  map.forEach(([id, on]) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('on', on);
      el.textContent = on ? '\u25CF' : '\u25CB';
      el.dataset.on = on ? 'true' : 'false';
    }
  });
}

// ── HUD ───────────────────────────────────────────────────────────────────────
const hud = document.getElementById('hud');
let hudVisible  = false;
function showHUD() {
  if (!hud) return;
  hudVisible = true;
  hud.classList.add('visible');
}

function hideHUD() {
  if (!hud) return;
  hudVisible = false;
  hud.classList.remove('visible');
}

function toggleHUD() {
  if (hudVisible) hideHUD();
  else showHUD();
}

// ── GYRO PARALLAX ─────────────────────────────────────────────────────────────
function onDeviceOrientation(e) {
  const gamma = e.gamma ?? 0;
  const beta  = e.beta  ?? 0;
  // Capture first reading as neutral (calibrates to whatever angle the phone is held)
  if (gyroBaseGamma === null) { gyroBaseGamma = gamma; gyroBaseBeta = beta; return; }
  gyroTargetX = Math.max(-1, Math.min(1, (gamma - gyroBaseGamma) / GYRO_RANGE));
  gyroTargetY = Math.max(-1, Math.min(1, (beta  - gyroBaseBeta)  / GYRO_RANGE));
}

async function enableGyro() {
  // iOS 13+ requires explicit permission from a user gesture
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false;
    } catch(e) { return false; }
  }
  gyroBaseGamma = null; // reset calibration
  gyroBaseBeta  = null;
  window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
  gyroOn = true;
  return true;
}

function disableGyro() {
  window.removeEventListener('deviceorientation', onDeviceOrientation);
  gyroOn      = false;
  gyroTargetX = 0;
  gyroTargetY = 0;
}

async function toggleGyro() {
  if (gyroOn) {
    disableGyro();
  } else {
    const ok = await enableGyro();
    if (!ok) {
      const btn = document.getElementById('btnGyro');
      if (btn) {
        btn.textContent = 'No sensor';
        setTimeout(() => { btn.textContent = 'Gyro: OFF'; }, 1800);
      }
      return;
    }
  }
  const btn = document.getElementById('btnGyro');
  if (btn) btn.textContent = gyroOn ? 'Gyro: ON' : 'Gyro: OFF';
}

// ── DRAG TO REPOSITION ────────────────────────────────────────────────────────
const DRAG_HIT_FRAC = 0.22; // fraction of min(W,H) — hit radius for lock detection

function findNearestGeode(tx, ty) {
  const hitR = Math.min(W, H) * DRAG_HIT_FRAC;
  let nearest = -1, minDist = Infinity;
  const drift = 1 + smoothDrift;
  geomDefs.forEach((g, i) => {
    const cx = W * 0.5 + (g.x - 0.5) * W * drift + gyroX * g.depth * GYRO_MAX_PX;
    const cy = H * 0.5 + (g.y - 0.5) * H * drift + gyroY * g.depth * GYRO_MAX_PX;
    const d  = Math.hypot(tx - cx, ty - cy);
    if (d < minDist && d < hitR) { minDist = d; nearest = i; }
  });
  return nearest;
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

document.getElementById('btnHideHUD')?.addEventListener('click', hideHUD);

// Wire up HUD buttons
document.getElementById('btnMode')?.addEventListener('click', () => {
  setMode(!soundMode);
});
document.getElementById('btnSens')?.addEventListener('click', () => {
  cycleSensitivity();
});
document.getElementById('btnReset')?.addEventListener('click', () => {
  resetDefaults();
});
document.getElementById('btnPalette')?.addEventListener('click', () => {
  cyclePalette();
});
document.getElementById('btnGyro')?.addEventListener('click', () => {
  toggleGyro();
});

document.getElementById('btnGeo')?.addEventListener('click', () => {
  geoOn = !geoOn;
  updateHUDState();
  debouncedSave();
});

function wireRoutingToggle(id, getter, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !getter();
    setter(next);
    updateRoutingUI();
    debouncedSave();
  });
}
wireRoutingToggle('rt_bass_speed',   () => bassToSpeed,   v => { bassToSpeed   = v; });
wireRoutingToggle('rt_bass_sway',    () => bassToSway,    v => { bassToSway    = v; });
wireRoutingToggle('rt_bass_density', () => bassToDensity, v => { bassToDensity = v; });
wireRoutingToggle('rt_mid_speed',    () => midToSpeed,    v => { midToSpeed    = v; });
wireRoutingToggle('rt_mid_sway',     () => midToSway,     v => { midToSway     = v; });
wireRoutingToggle('rt_mid_density',  () => midToDensity, v => { midToDensity  = v; });
wireRoutingToggle('rt_treble_speed', () => trebleToSpeed, v => { trebleToSpeed = v; });
wireRoutingToggle('rt_treble_sway',  () => trebleToSway,  v => { trebleToSway  = v; });
wireRoutingToggle('rt_treble_density', () => trebleToDensity, v => { trebleToDensity = v; });

document.getElementById('btnQualityFull')?.addEventListener('click', () => setQualityMode('full'));
document.getElementById('btnQualityHalf')?.addEventListener('click', () => setQualityMode('half'));
document.getElementById('btnQualityLow')?.addEventListener('click', () => setQualityMode('low'));

function updateAudioSourceUI() {
  const micBtn = document.getElementById('btnAudioMic');
  const tabBtn = document.getElementById('btnAudioTab');
  if (micBtn) micBtn.classList.toggle('active', audioSourceMode === 'mic');
  if (tabBtn) tabBtn.classList.toggle('active', audioSourceMode === 'tab');
}

document.getElementById('btnAudioMic')?.addEventListener('click', async () => {
  if (audioSourceMode === 'mic') return;
  audioSourceMode = 'mic';
  updateAudioSourceUI();
  if (soundMode) {
    const wasFullscreen = !!document.fullscreenElement;
    disableMic();
    await enableMic();
    restoreFullscreenIfNeeded(wasFullscreen);
  }
});

document.getElementById('btnAudioTab')?.addEventListener('click', async () => {
  if (audioSourceMode === 'tab') return;
  audioSourceMode = 'tab';
  updateAudioSourceUI();
  if (soundMode) {
    const wasFullscreen = !!document.fullscreenElement;
    disableMic();
    const ok = await enableTabAudio();
    restoreFullscreenIfNeeded(wasFullscreen);
    if (!ok) {
      soundMode = false;
      const modeBtn = document.getElementById('btnMode');
      if (modeBtn) modeBtn.textContent = 'Sound';
      const micDot = document.getElementById('micDot');
      if (micDot) micDot.style.display = 'none';
      const sensRow = document.getElementById('sensSetting');
      if (sensRow) sensRow.style.display = 'none';
      updateHUDState();
    }
  }
});

function applySlider(id, setter, parse) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const v = parse(el.value);
    if (v != null) { setter(v); syncSlidersFromState(); debouncedSave(); }
  });
}
applySlider('sliderDensity', v => { lineDensity = v; }, v => Math.max(1, Math.min(128, parseInt(v, 10))));
applySlider('sliderSpeed',    v => { geoSpeed = v; },    v => Math.max(0.05, Math.min(12, parseFloat(v))));
applySlider('sliderLateral',  v => { lateralAmp = v; }, v => Math.max(0, Math.min(0.05, parseFloat(v))));
applySlider('sliderTunnel',   v => { tunnelStrength = v; }, v => Math.max(0, Math.min(TUNNEL_MAX, parseFloat(v))));
applySlider('sliderScale',    v => { geoScale = v; },    v => Math.max(0.2, Math.min(6, parseFloat(v))));

function wireReset(btnId, defaults) {
  document.getElementById(btnId)?.addEventListener('click', () => {
    if (defaults.lineDensity != null) lineDensity = defaults.lineDensity;
    if (defaults.geoSpeed != null) geoSpeed = defaults.geoSpeed;
    if (defaults.lateralAmp != null) lateralAmp = defaults.lateralAmp;
    if (defaults.tunnelStrength != null) tunnelStrength = defaults.tunnelStrength;
    if (defaults.geoScale != null) geoScale = defaults.geoScale;
    syncSlidersFromState();
    debouncedSave();
  });
}
wireReset('resetDensity', { lineDensity: VIZ2_DEFAULTS.lineDensity });
wireReset('resetSpeed',   { geoSpeed: VIZ2_DEFAULTS.geoSpeed });
wireReset('resetLateral', { lateralAmp: VIZ2_DEFAULTS.lateralAmp });
wireReset('resetTunnel',  { tunnelStrength: VIZ2_DEFAULTS.tunnelStrength });
wireReset('resetScale',   { geoScale: VIZ2_DEFAULTS.geoScale });
function wireSliderDblclick(sliderId, defaults) {
  const el = document.getElementById(sliderId);
  if (!el) return;
  el.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (defaults.lineDensity != null) lineDensity = defaults.lineDensity;
    if (defaults.geoSpeed != null) geoSpeed = defaults.geoSpeed;
    if (defaults.lateralAmp != null) lateralAmp = defaults.lateralAmp;
    if (defaults.tunnelStrength != null) tunnelStrength = defaults.tunnelStrength;
    if (defaults.geoScale != null) geoScale = defaults.geoScale;
    syncSlidersFromState();
    debouncedSave();
  });
}
wireSliderDblclick('sliderDensity', { lineDensity: VIZ2_DEFAULTS.lineDensity });
wireSliderDblclick('sliderSpeed',   { geoSpeed: VIZ2_DEFAULTS.geoSpeed });
wireSliderDblclick('sliderLateral', { lateralAmp: VIZ2_DEFAULTS.lateralAmp });
wireSliderDblclick('sliderTunnel',  { tunnelStrength: VIZ2_DEFAULTS.tunnelStrength });
wireSliderDblclick('sliderScale',   { geoScale: VIZ2_DEFAULTS.geoScale });

document.getElementById('btnRandomise')?.addEventListener('click', () => {
  lineDensity = Math.max(1, Math.min(128, Math.round(1 + Math.random() * 60)));
  geoSpeed = Math.max(0.05, Math.min(12, 0.05 + Math.random() * 11.95));
  lateralAmp = Math.max(0, Math.min(0.05, Math.random() * 0.05));
  tunnelStrength = Math.max(0, Math.min(TUNNEL_MAX, Math.random() * TUNNEL_MAX));
  geoScale = Math.max(0.2, Math.min(6, 0.2 + Math.random() * 5.8));
  paletteIdx = Math.floor(Math.random() * PALETTES.length);
  paletteTo = PALETTES[paletteIdx];
  paletteFrom = { a:[...geomDefs[0].col], b:[...geomDefs[1].col], c:[...geomDefs[2].col], d:[...geomDefs[3].col] };
  paletteProgress = 0;
  // On desktop keep geos focused in the centre; on mobile allow full spread
  const margin = isMobile ? 0.02 : 0.22;
  const span  = isMobile ? 0.96 : 0.56;
  geomDefs.forEach(g => {
    g.x = margin + Math.random() * span;
    g.y = margin + Math.random() * span;
  });
  const btn = document.getElementById('btnPalette');
  if (btn) btn.textContent = paletteTo.name;
  syncSlidersFromState();
  debouncedSave();
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
    }
  });

  btn.addEventListener('pointercancel', () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  });
});

document.getElementById('btnFullscreen')?.addEventListener('click', () => {
  toggleFullscreen();
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
// Single-finger swipe L/R   → lineDensity (1–36)           [axis-locked]
// Single-finger swipe U/D   → geoScale (0.3–2.5)           [axis-locked]
// Single-finger hold 2s near geode centre → drag to reposition
// Single-finger hold 0.5s elsewhere      → fullscreen
// Pinch in/out              → geoSpeed (0.1–4.0)
// Double-tap                → toggle HUD

let touches = {};
let lastTapTime = 0;
let longPressTimer = null;   // 0.5s fullscreen (when not near a geode)
let dragLockTimer  = null;   // 2s drag lock (when near a geode)
let gestureStartDist  = null;
let gestureStartSpeed = null;
let swipeStartX = null;
let swipeStartY = null;
let swipeStartDensity = null;
let swipeStartScale   = null;
let swipeAxis = null;        // null | 'h' | 'v'
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

    if (!gestureConsumed) {
      const nearIdx = findNearestGeode(touch.clientX, touch.clientY);
      if (nearIdx >= 0) {
        // Near a geode: 2s hold locks it for dragging
        dragLockTimer = setTimeout(() => {
          draggedGeomIdx = nearIdx;
          dragLockActive = true;
          gestureConsumed = true;
        }, 2000);
      } else {
        // Open space: 0.5s hold → fullscreen
        longPressTimer = setTimeout(() => {
          toggleFullscreen();
          gestureConsumed = true;
        }, 500);
      }
    }

  } else if (count === 2) {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (dragLockTimer)  { clearTimeout(dragLockTimer);  dragLockTimer  = null; }
    const pts = Object.values(touches);
    gestureStartDist  = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    gestureStartSpeed = geoSpeed;
    swipeStartX = null;
    swipeAxis   = null;
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (touches[t.identifier]) touches[t.identifier] = { x: t.clientX, y: t.clientY };
  }

  const count = Object.keys(touches).length;

  if (count === 1 && swipeStartX !== null) {
    const touch = e.changedTouches[0];
    const dx    = touch.clientX - swipeStartX;
    const dy    = touch.clientY - swipeStartY;

    if (dragLockActive && draggedGeomIdx >= 0) {
      // Drag the locked geode's normalised position
      geomDefs[draggedGeomIdx].x = Math.max(0.02, Math.min(0.98, touch.clientX / W));
      geomDefs[draggedGeomIdx].y = Math.max(0.02, Math.min(0.98, touch.clientY / H));
      return; // skip swipe handling
    }

    // Any movement cancels the pending hold timers
    if (Math.hypot(dx, dy) > 8) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (dragLockTimer)  { clearTimeout(dragLockTimer);  dragLockTimer  = null; }
    }

    if (!gestureConsumed) {
      if (!swipeAxis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        swipeAxis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      if (swipeAxis === 'h') {
        lineDensity = Math.max(1, Math.min(128, Math.round(swipeStartDensity + (dx / 300) * 127)));
        debouncedSave();
      } else if (swipeAxis === 'v') {
        geoScale = Math.max(0.2, Math.min(6, swipeStartScale + (-dy / H) * 5.8));
        debouncedSave();
      }
    }

  } else if (count === 2 && gestureStartDist !== null) {
    const pts = Object.values(touches);
    const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    geoSpeed = Math.max(0.05, Math.min(12, gestureStartSpeed * (dist / gestureStartDist)));
    debouncedSave();
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (dragLockTimer)  { clearTimeout(dragLockTimer);  dragLockTimer  = null; }

  for (const t of e.changedTouches) delete touches[t.identifier];

  const count = Object.keys(touches).length;
  if (count < 2) { gestureStartDist = null; gestureStartSpeed = null; }
  if (count === 0) {
    if (dragLockActive) {
      dragLockActive = false;
      draggedGeomIdx = -1;
      debouncedSave();
    }
    swipeStartX = swipeStartY = swipeStartDensity = swipeStartScale = swipeAxis = null;
    gestureConsumed = false;
  }
}

// ── MOUSE DRAG (desktop) ──────────────────────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  const nearIdx = findNearestGeode(e.clientX, e.clientY);
  if (nearIdx >= 0) {
    mouseDragGeomIdx = nearIdx;
    mouseDragActive  = true;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

canvas.addEventListener('mousemove', e => {
  if (mouseDragActive && mouseDragGeomIdx >= 0) {
    geomDefs[mouseDragGeomIdx].x = Math.max(0.02, Math.min(0.98, e.clientX / W));
    geomDefs[mouseDragGeomIdx].y = Math.max(0.02, Math.min(0.98, e.clientY / H));
  } else {
    canvas.style.cursor = findNearestGeode(e.clientX, e.clientY) >= 0 ? 'grab' : 'default';
  }
});

function endMouseDrag() {
  if (mouseDragActive) { mouseDragActive = false; mouseDragGeomIdx = -1; debouncedSave(); }
  canvas.style.cursor = 'default';
}
canvas.addEventListener('mouseup',    endMouseDrag);
canvas.addEventListener('mouseleave', endMouseDrag);

// ── FREQ BAND PANEL (key 2) ────────────────────────────────────────────────────
(function() {
  const fp = document.createElement('div');
  fp.id = 'freqPanel';
  fp.style.cssText = [
    'display:none', 'position:fixed', 'top:20px', 'left:0', 'z-index:110', 'width:240px',
    'background:rgba(14,13,11,0.95)', 'backdrop-filter:blur(10px)', '-webkit-backdrop-filter:blur(10px)',
    'border-right:1px solid rgba(184,115,51,0.25)', 'border-bottom:1px solid rgba(184,115,51,0.25)',
    'border-top:1px solid rgba(184,115,51,0.25)', 'border-radius:0 3px 3px 0',
    'padding:14px 16px 16px', 'font-family:Georgia,serif', 'color:#fff',
    'font-size:0.82rem', 'letter-spacing:0.06em', 'user-select:none',
    'pointer-events:auto', 'touch-action:manipulation', 'isolation:isolate',
  ].join(';');
  fp.addEventListener('pointerdown', e => e.stopPropagation(), true);
  fp.addEventListener('mousedown', e => e.stopPropagation(), true);
  fp.addEventListener('touchstart', e => e.stopPropagation(), true);

  fp.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(184,115,51,0.2);padding-bottom:8px">
      <span style="font-size:0.88rem;letter-spacing:0.14em;text-transform:uppercase;color:#b87333">Freq Bands</span>
      <span style="font-size:0.68rem;opacity:0.5;letter-spacing:0.07em">2 close</span>
    </div>
    <div style="margin-bottom:10px">
      <canvas id="freq_canvas" width="208" height="48" style="width:100%;border-radius:2px;display:block"></canvas>
    </div>
    <div style="font-size:0.68rem;opacity:0.5;letter-spacing:0.07em;margin-bottom:5px;text-transform:uppercase">drag handles, bins 0–256</div>
    <div id="freq_ruler" style="position:relative;height:28px;border-radius:3px;margin-bottom:6px;background:rgba(255,255,255,0.06);box-sizing:border-box;overflow:visible">
      <div id="fr_bass"   style="position:absolute;top:0;bottom:0;left:0;background:rgba(160,70,42,0.7);border-radius:3px 0 0 3px;pointer-events:none"></div>
      <div id="fr_mid"    style="position:absolute;top:0;bottom:0;background:rgba(184,130,51,0.65);pointer-events:none"></div>
      <div id="fr_treble" style="position:absolute;top:0;bottom:0;background:rgba(46,123,122,0.7);pointer-events:none"></div>
      <div id="fr_h1" style="position:absolute;top:-4px;bottom:-4px;width:14px;margin-left:-7px;background:#b87333;cursor:ew-resize;border-radius:3px;z-index:2;touch-action:none"></div>
      <div id="fr_h2" style="position:absolute;top:-4px;bottom:-4px;width:14px;margin-left:-7px;background:#b87333;cursor:ew-resize;border-radius:3px;z-index:2;touch-action:none"></div>
      <div id="fr_h3" style="position:absolute;top:-4px;bottom:-4px;width:14px;margin-left:-7px;background:rgba(184,115,51,0.6);cursor:ew-resize;border-radius:3px;z-index:2;touch-action:none"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:14px;font-size:0.72rem;color:#fff">
      <span style="color:rgba(160,70,42,0.95)">B <span id="flbl_bass" style="color:#b87333"></span></span>
      <span style="color:rgba(184,130,51,0.95)">M <span id="flbl_mid" style="color:#b87333"></span></span>
      <span style="color:rgba(46,123,122,0.95)">T <span id="flbl_treble" style="color:#b87333"></span></span>
    </div>
    <div style="border-top:1px solid rgba(184,115,51,0.2);padding-top:10px;pointer-events:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.8;font-size:0.75rem;color:#fff">Norm Ceiling</span>
        <span id="flbl_norm" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
      </div>
      <div style="padding:10px 0;margin-bottom:4px;cursor:pointer">
        <input type="range" id="f_norm" min="20" max="255" value="80" step="5" style="width:100%;box-sizing:border-box;accent-color:#b87333;height:6px;cursor:pointer;pointer-events:auto;display:block">
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.8;font-size:0.75rem;color:#fff">Min Avg Gate</span>
        <span id="flbl_gate" style="color:#b87333;min-width:36px;text-align:right;font-size:0.8rem"></span>
      </div>
      <div style="padding:10px 0;cursor:pointer">
        <input type="range" id="f_gate" min="1" max="40" value="2" step="1" style="width:100%;box-sizing:border-box;accent-color:#b87333;height:6px;cursor:pointer;pointer-events:auto;display:block">
      </div>
    </div>
  `;
  const hud = document.getElementById('hud');
  (hud || document.body).appendChild(fp);

  function flbl(id, val) { const el = document.getElementById('flbl_' + id); if (el) el.textContent = val; }

  const BIN_MAX = 256;
  function updateRuler() {
    const pct = v => (v / BIN_MAX * 100).toFixed(2) + '%';
    const frBass = document.getElementById('fr_bass');
    const frMid = document.getElementById('fr_mid');
    const frTreble = document.getElementById('fr_treble');
    const frH1 = document.getElementById('fr_h1');
    const frH2 = document.getElementById('fr_h2');
    const frH3 = document.getElementById('fr_h3');
    if (frBass) frBass.style.width = pct(bassEnd);
    if (frMid) { frMid.style.left = pct(midStart); frMid.style.width = pct(midEnd - midStart); }
    if (frTreble) { frTreble.style.left = pct(trebleStart); frTreble.style.width = pct(trebleEnd - trebleStart); }
    if (frH1) frH1.style.left = pct(bassEnd);
    if (frH2) frH2.style.left = pct(midEnd);
    if (frH3) frH3.style.left = pct(trebleEnd);
    flbl('bass', bassStart + '\u2013' + bassEnd);
    flbl('mid', midStart + '\u2013' + midEnd);
    flbl('treble', trebleStart + '\u2013' + trebleEnd);
    flbl('norm', normCeil);
    flbl('gate', minAvgGate);
    const fn = document.getElementById('f_norm');
    const fg = document.getElementById('f_gate');
    if (fn) fn.value = normCeil;
    if (fg) fg.value = minAvgGate;
  }
  updateRuler();

  const ruler = document.getElementById('freq_ruler');
  let dragging = null;

  function clientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function startDrag(e, which) {
    e.preventDefault();
    e.stopPropagation();
    dragging = which;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);
  }
  function endDrag() {
    dragging = null;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
    document.removeEventListener('touchcancel', endDrag);
  }
  function onDrag(e) {
    if (dragging === null) return;
    e.preventDefault();
    const rect = ruler.getBoundingClientRect();
    const x = clientX(e);
    const bin = Math.round(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * BIN_MAX);
    if (dragging === 1) {
      const v = Math.max(1, Math.min(midEnd - 1, bin));
      bassEnd = v; midStart = v;
    } else if (dragging === 2) {
      const v = Math.max(bassEnd + 1, Math.min(trebleEnd - 1, bin));
      midEnd = v; trebleStart = v;
    } else {
      trebleEnd = Math.max(trebleStart + 1, Math.min(BIN_MAX, bin));
    }
    updateRuler();
  }

  ['fr_h1', 'fr_h2', 'fr_h3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('mousedown', e => startDrag(e, i + 1));
    el.addEventListener('touchstart', e => startDrag(e, i + 1), { passive: false });
  });

  const fcanvas = document.getElementById('freq_canvas');
  const fctx = fcanvas.getContext('2d');

  function drawFreqCanvas() {
    fctx.clearRect(0, 0, 208, 48);
    if (!micAnalyser || !micDataArray) {
      fctx.fillStyle = 'rgba(255,255,255,0.06)';
      fctx.fillRect(0, 0, 208, 48);
      fctx.fillStyle = 'rgba(255,255,255,0.4)';
      fctx.font = '11px Georgia, serif';
      fctx.textAlign = 'center';
      fctx.fillText('mic off', 104, 28);
      requestAnimationFrame(drawFreqCanvas);
      return;
    }
    micAnalyser.getByteFrequencyData(micDataArray);
    const bins = Math.min(256, micDataArray.length);
    const bw = 208 / bins;
    for (let i = 0; i < bins; i++) {
      const h = (micDataArray[i] / 255) * 48;
      let col;
      if (i >= bassStart && i < bassEnd) col = 'rgba(160,70,42,0.85)';
      else if (i >= midStart && i < midEnd) col = 'rgba(184,130,51,0.75)';
      else if (i >= trebleStart && i < trebleEnd) col = 'rgba(46,123,122,0.85)';
      else col = 'rgba(255,255,255,0.1)';
      fctx.fillStyle = col;
      fctx.fillRect(i * bw, 48 - h, bw - 0.5, h);
    }
    requestAnimationFrame(drawFreqCanvas);
  }
  drawFreqCanvas();

  document.getElementById('f_norm').addEventListener('input', function() {
    normCeil = parseInt(this.value, 10);
    updateRuler();
  });
  document.getElementById('f_gate').addEventListener('input', function() {
    minAvgGate = parseInt(this.value, 10);
    updateRuler();
  });

  window.toggleFreqPanel = function() {
    const panel = document.getElementById('freqPanel');
    const hudEl = document.getElementById('hud');
    if (panel) {
      const show = panel.style.display === 'none';
      panel.style.display = show ? 'block' : 'none';
      if (show && hudEl) hudEl.classList.add('visible');
    }
  };
  window.viz2UpdateFreqRuler = updateRuler;
})();

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────────
// h       → toggle HUD          f       → fullscreen
// p       → cycle palette       s       → toggle sound mode
// r       → reset               g       → toggle gyro
// ← →     → density ±1          ↑ ↓     → scale ±0.05
// + =     → speed +0.1          - _     → speed −0.1
// 1/2/3   → load preset         Shift+1/2/3 → save preset
// ? or i  → toggle info         Escape  → close info
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case '?': case 'i': case 'I':
      infoOverlay.classList.contains('visible') ? hideInfo() : showInfo(); break;
    case 'Escape': hideInfo(); break;

    case 'h': case 'H':
      toggleHUD(); break;
    case 'f': case 'F':
      toggleFullscreen(); break;
    case 'p': case 'P':
      cyclePalette(); showHUD();  break;
    case 's': case 'S':
      setMode(!soundMode); showHUD();  break;
    case 'r': case 'R':
      resetDefaults(); showHUD();  break;
    case 'g': case 'G':
      toggleGyro(); showHUD();  break;

    case 'ArrowLeft':
      e.preventDefault();
      lineDensity = Math.max(1, lineDensity - 1); syncSlidersFromState(); debouncedSave(); break;
    case 'ArrowRight':
      e.preventDefault();
      lineDensity = Math.min(128, lineDensity + 1); syncSlidersFromState(); debouncedSave(); break;
    case 'ArrowUp':
      e.preventDefault();
      geoScale = Math.max(0.2, Math.min(6, +(geoScale + 0.05).toFixed(2))); syncSlidersFromState(); debouncedSave(); break;
    case 'ArrowDown':
      e.preventDefault();
      geoScale = Math.max(0.2, Math.min(6, +(geoScale - 0.05).toFixed(2))); syncSlidersFromState(); debouncedSave(); break;

    case '+': case '=':
      geoSpeed = Math.max(0.05, Math.min(12, +(geoSpeed + 0.1).toFixed(2))); syncSlidersFromState(); debouncedSave(); break;
    case '-': case '_':
      geoSpeed = Math.max(0.05, Math.min(12, +(geoSpeed - 0.1).toFixed(2))); syncSlidersFromState(); debouncedSave(); break;

    case '1': e.shiftKey ? savePreset(0) : loadPreset(0); showHUD();  break;
    case '2': if (e.shiftKey) { savePreset(1); showHUD(); } else { if (window.toggleFreqPanel) window.toggleFreqPanel(); } break;
    case '3': e.shiftKey ? savePreset(2) : loadPreset(2); showHUD();  break;
    case '4': e.shiftKey ? savePreset(3) : loadPreset(3); showHUD();  break;
    case '5': e.shiftKey ? savePreset(4) : loadPreset(4); showHUD();  break;
    case '6': e.shiftKey ? savePreset(5) : loadPreset(5); showHUD();  break;
    case '!': savePreset(0); showHUD();  break;
    case '@': savePreset(1); showHUD();  break;
    case '#': savePreset(2); showHUD();  break;
  }
});

// ── DEFAULT BANK (from viz2-defaults.json) ─────────────────────────────────────
let defaultPresets = [];

function loadDefaultPreset(preset) {
  applyState(preset, true);
  if (preset.soundMode === false) {
    soundMode = false;
    disableMic();
    const btn = document.getElementById('btnMode');
    if (btn) btn.textContent = 'Sound';
    const dot = document.getElementById('micDot');
    if (dot) dot.style.display = 'none';
    const sensRow = document.getElementById('sensSetting');
    if (sensRow) sensRow.style.display = 'none';
  } else if (preset.soundMode === true) {
    setMode(true);
  }
  syncSlidersFromState();
  updateHUDState();
  debouncedSave();
}

function fetchDefaultBank() {
  fetch('presets/viz2-defaults.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(arr => {
      defaultPresets = arr;
      window.viz2DefaultPresets = arr;
      if (window.viz2PaneAddGenrePresets) window.viz2PaneAddGenrePresets(arr);
      const container = document.getElementById('defaultPresetButtons');
      const row = document.getElementById('defaultBankRow');
      if (container && row) {
        container.innerHTML = '';
        arr.forEach((p) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btnSlot';
          btn.textContent = p.name;
          btn.addEventListener('click', () => loadDefaultPreset(p));
          container.appendChild(btn);
        });
        row.style.display = 'flex';
      }
    })
    .catch(() => {});
}

// ── VIZ2 GLOBALS FOR TWEAKPANE ────────────────────────────────────────────────
window.viz2Globals = {
  get lineDensity() { return lineDensity; }, set lineDensity(v) { lineDensity = v; },
  get geoSpeed() { return geoSpeed; }, set geoSpeed(v) { geoSpeed = v; },
  get lateralAmp() { return lateralAmp; }, set lateralAmp(v) { lateralAmp = v; },
  get tunnelStrength() { return tunnelStrength; }, set tunnelStrength(v) { tunnelStrength = Math.max(0, Math.min(TUNNEL_MAX, v)); },
  get geoScale() { return geoScale; }, set geoScale(v) { geoScale = v; },
  get geoOn() { return geoOn; }, set geoOn(v) { geoOn = v; },
  get soundMode() { return soundMode; }, set soundMode(v) { soundMode = v; },
  get audioSourceMode() { return audioSourceMode; }, set audioSourceMode(v) { audioSourceMode = v; },
  get qualityMode() { return qualityMode; }, set qualityMode(v) { qualityMode = v; },
  get bassToSpeed() { return bassToSpeed; }, set bassToSpeed(v) { bassToSpeed = v; },
  get bassToSway() { return bassToSway; }, set bassToSway(v) { bassToSway = v; },
  get bassToDensity() { return bassToDensity; }, set bassToDensity(v) { bassToDensity = v; },
  get midToSpeed() { return midToSpeed; }, set midToSpeed(v) { midToSpeed = v; },
  get midToSway() { return midToSway; }, set midToSway(v) { midToSway = v; },
  get midToDensity() { return midToDensity; }, set midToDensity(v) { midToDensity = v; },
  get trebleToSpeed() { return trebleToSpeed; }, set trebleToSpeed(v) { trebleToSpeed = v; },
  get trebleToSway() { return trebleToSway; }, set trebleToSway(v) { trebleToSway = v; },
  get trebleToDensity() { return trebleToDensity; }, set trebleToDensity(v) { trebleToDensity = v; },
  get micSensIdx() { return micSensIdx; }, set micSensIdx(v) { micSensIdx = v; activeBeatThreshold = MIC_SENSITIVITY[v].threshold; activeSpikeSize = MIC_SENSITIVITY[v].spikeSize; },
};
window.debouncedSave = debouncedSave;
window.viz2SetMode = setMode;
window.viz2SetQualityMode = setQualityMode;
window.viz2Reset = resetDefaults;
window.viz2CyclePalette = cyclePalette;
window.viz2ToggleGyro = toggleGyro;
window.viz2HideHUD = hideHUD;
window.viz2LoadPreset = loadPreset;
window.viz2SavePreset = savePreset;
window.viz2LoadDefaultPreset = loadDefaultPreset;
window.viz2GetPaletteName = () => (PALETTES[paletteIdx] && PALETTES[paletteIdx].name) || 'Earthen';
window.viz2Randomise = () => {
  lineDensity = Math.max(1, Math.min(128, Math.round(1 + Math.random() * 60)));
  geoSpeed = Math.max(0.05, Math.min(12, 0.05 + Math.random() * 11.95));
  lateralAmp = Math.max(0, Math.min(0.05, Math.random() * 0.05));
  tunnelStrength = Math.max(0, Math.min(TUNNEL_MAX, Math.random() * TUNNEL_MAX));
  geoScale = Math.max(0.2, Math.min(6, 0.2 + Math.random() * 5.8));
  paletteIdx = Math.floor(Math.random() * PALETTES.length);
  paletteTo = PALETTES[paletteIdx];
  paletteFrom = { a: [...geomDefs[0].col], b: [...geomDefs[1].col], c: [...geomDefs[2].col], d: [...geomDefs[3].col] };
  paletteProgress = 0;
  const margin = isMobile ? 0.02 : 0.22;
  const span = isMobile ? 0.96 : 0.56;
  geomDefs.forEach(g => {
    g.x = margin + Math.random() * span;
    g.y = margin + Math.random() * span;
  });
  debouncedSave();
};
window.viz2Fullscreen = toggleFullscreen;
window.viz2SetAudioSource = async function(mode) {
  if (audioSourceMode === mode) return;
  audioSourceMode = mode;
  if (soundMode) {
    const wasFullscreen = !!document.fullscreenElement;
    disableMic();
    if (mode === 'mic') {
      await enableMic();
    } else {
      const ok = await enableTabAudio();
      if (!ok) {
        soundMode = false;
        const micDot = document.getElementById('micDot');
        if (micDot) micDot.style.display = 'none';
        const sensRow = document.getElementById('sensSetting');
        if (sensRow) sensRow.style.display = 'none';
        if (typeof window.viz2RefreshPane === 'function') window.viz2RefreshPane();
        return;
      }
    }
    restoreFullscreenIfNeeded(wasFullscreen);
  }
  if (typeof window.viz2RefreshPane === 'function') window.viz2RefreshPane();
};

// ── MOBILE / DESKTOP INIT ────────────────────────────────────────────────────
loadAutoState();
syncSlidersFromState();
updatePresetButtons();
updateRoutingUI();

if (!isMobile) fetchDefaultBank();

updateAudioSourceUI();

if (!isMobile) {
  document.body.classList.add('is-desktop');
  // Gyro button: no sensor on desktop, hide it
  const gyroBtn = document.getElementById('btnGyro');
  if (gyroBtn) gyroBtn.style.display = 'none';
  // Gesture guide: swap for keyboard equivalents
  const guide = document.getElementById('gestureGuide');
  if (guide) guide.innerHTML =
    '<span>← → density</span><span>↑ ↓ scale</span><span>+ − speed</span>';
  // Hint text
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'click & drag shapes  ·  press ? for controls';
  // Auto-dismiss hint on first mouse move
  document.addEventListener('mousemove', () => {
    const h = document.getElementById('hint'); if (h) h.classList.add('gone');
  }, { once: true });
} else {
  document.body.classList.add('is-mobile');
}
