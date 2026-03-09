/**
 * Viz2 control panel via Tweakpane. Load after visualiser2.js.
 * Uses window.viz2Globals (get/set), window.debouncedSave, window.viz2* actions.
 */
let pane;
try {
  const mod = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.js');
  const Pane = mod.Pane ?? mod.default?.Pane ?? mod.default;
  if (typeof Pane !== 'function') throw new Error('Tweakpane Pane not found');

  const container = document.getElementById('paneContainer');
  if (!container) throw new Error('No paneContainer');

  const g = window.viz2Globals;
  if (!g) throw new Error('viz2Globals not ready');

// Params object bound to the pane (single source for UI)
const params = {
  density: g.lineDensity,
  speed: g.geoSpeed,
  lateral: g.lateralAmp,
  tunnel: g.tunnelStrength,
  scale: g.geoScale,
  geo: g.geoOn,
  sound: g.soundMode,
  audioSource: g.audioSourceMode,
  quality: g.qualityMode,
  sourceLabel: g.audioSourceMode === 'mic' ? 'Mic' : 'Tab',
  qualityLabel: (g.qualityMode === 'full' ? 'Full' : g.qualityMode === 'half' ? 'Half' : 'Low'),
  sensLabel: ['Low', 'Med', 'High'][g.micSensIdx],
  bassToSpeed: g.bassToSpeed,
  bassToSway: g.bassToSway,
  bassToDensity: g.bassToDensity,
  midToSpeed: g.midToSpeed,
  midToSway: g.midToSway,
  midToDensity: g.midToDensity,
  trebleToSpeed: g.trebleToSpeed,
  trebleToSway: g.trebleToSway,
  trebleToDensity: g.trebleToDensity,
  sens: ['Low', 'Med', 'High'][g.micSensIdx],
  palette: window.viz2GetPaletteName ? window.viz2GetPaletteName() : 'Earthen',
};

  pane = new Pane({
    title: 'Viz2',
    container,
    expanded: true,
  });

  // Title-bar collapse icon = hide panel entirely (slide HUD away)
  requestAnimationFrame(() => {
    const root = pane.element || container.firstElementChild;
    if (root) {
      const firstRow = root.firstElementChild;
      const collapseBtn = firstRow?.querySelector('button');
      if (collapseBtn) {
        collapseBtn.setAttribute('title', 'Hide panel');
        collapseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.viz2HideHUD) window.viz2HideHUD();
        }, true);
      }
    }
  });

// Theme: deep black, copper accent — no grey
container.classList.add('viz2-pane-theme');
const style = document.createElement('style');
style.textContent = `
  .viz2-pane-theme {
    --tp-base-background-color: #0e0d0b;
    --tp-base-shadow-color: rgba(0, 0, 0, 0.5);
    --tp-button-background-color: rgba(184, 115, 51, 0.25);
    --tp-button-background-color-hover: rgba(184, 115, 51, 0.4);
    --tp-button-background-color-active: rgba(184, 115, 51, 0.5);
    --tp-button-foreground-color: #e8dfc8;
    --tp-input-background-color: rgba(255, 255, 255, 0.08);
    --tp-input-background-color-focus: rgba(255, 255, 255, 0.12);
    --tp-input-foreground-color: #e8dfc8;
    --tp-label-foreground-color: rgba(232, 223, 200, 0.95);
    --tp-separator-color: rgba(184, 115, 51, 0.3);
  }
  .viz2-pane-theme .tp-dfwv {
    font-family: Georgia, 'Libre Baskerville', serif;
    font-size: 0.85rem;
  }
  .viz2-pane-theme .tp-ticv {
    color: rgba(232, 223, 200, 0.8);
  }
  .viz2-pane-theme [class*="tp-v"] {
    background: #0e0d0b !important;
  }
  .viz2-pane-theme [class*="tp-rot"] {
    background: #0e0d0b !important;
  }
  .viz2-pane-theme [class*="tp-hed"],
  .viz2-pane-theme [class*="tp-hdr"],
  .viz2-pane-theme [class*="tp-ttl"] {
    background: #0e0d0b !important;
    color: #b87333 !important;
    border-color: rgba(184, 115, 51, 0.25) !important;
  }
  /* Compact: minimal padding and row height */
  .viz2-pane-theme [class*="tp-"] { padding: 1px 3px; }
  .viz2-pane-theme [class*="tp-bl"] { min-height: 0; padding-top: 0; padding-bottom: 0; }
  .viz2-pane-theme [class*="tp-fld"] { padding-top: 1px; padding-bottom: 1px; }
  .viz2-pane-theme [class*="tp-rot"] { padding: 2px 4px 4px; }
  .viz2-pane-theme .tp-dfwv { font-size: 0.72rem; }
  .viz2-pane-theme input, .viz2-pane-theme button { padding: 2px 5px; min-height: 20px; font-size: 0.68rem; }
  .viz2-pane-theme label { font-size: 0.68rem; }
  .viz2-pane-theme [class*="tp-hed"], .viz2-pane-theme [class*="tp-ttl"] { padding: 2px 4px; min-height: 0; }
  /* No yellow/white on white or grey: force inputs and text to dark bg + parchment/copper only */
  .viz2-pane-theme select,
  .viz2-pane-theme [class*="tp-lst"],
  .viz2-pane-theme [class*="tp-sel"],
  .viz2-pane-theme [class*="tp-inp"] {
    background: #0e0d0b !important;
    color: #e8dfc8 !important;
    border-color: rgba(184, 115, 51, 0.35) !important;
  }
  .viz2-pane-theme select option {
    background: #0e0d0b;
    color: #e8dfc8;
  }
  .viz2-pane-theme .tp-ticv,
  .viz2-pane-theme .tp-txtv {
    color: #e8dfc8 !important;
    background: transparent !important;
  }
  /* Active state: copper glow (like Mic when selected) */
  .viz2-pane-theme .viz2-active,
  .viz2-pane-theme button.viz2-active {
    box-shadow: 0 0 10px rgba(184, 115, 51, 0.55), 0 0 4px rgba(184, 115, 51, 0.4) !important;
    border-color: rgba(184, 115, 51, 0.65) !important;
    background: rgba(184, 115, 51, 0.3) !important;
  }
  .viz2-pane-theme .viz2-active-row {
    box-shadow: 0 0 8px rgba(184, 115, 51, 0.4);
  }
`;
document.head.appendChild(style);

  function updateActiveGlow() {
    const root = pane.element || container;
    if (!root) return;
    root.querySelectorAll('.viz2-active, .viz2-active-row').forEach(el => { el.classList.remove('viz2-active', 'viz2-active-row'); });
    const allButtons = root.querySelectorAll('button');
    const micBtn = Array.from(allButtons).find(b => b.textContent.trim() === 'Mic');
    if (micBtn) {
      let el = micBtn.parentElement;
      while (el && el !== root) {
        const audioBtns = Array.from(el.querySelectorAll('button'));
        const texts = audioBtns.map(b => b.textContent.trim());
        if (texts.includes('Mic') && texts.includes('Full') && texts.includes('Med') && audioBtns.length >= 8) {
          const srcIdx = params.sourceLabel === 'Tab' ? 1 : 0;
          const qualIdx = params.qualityLabel === 'Full' ? 2 : params.qualityLabel === 'Half' ? 3 : 4;
          const sensIdx = params.sensLabel === 'Low' ? 5 : params.sensLabel === 'Med' ? 6 : 7;
          if (audioBtns[srcIdx]) audioBtns[srcIdx].classList.add('viz2-active');
          if (audioBtns[qualIdx]) audioBtns[qualIdx].classList.add('viz2-active');
          if (audioBtns[sensIdx]) audioBtns[sensIdx].classList.add('viz2-active');
          break;
        }
        el = el.parentElement;
      }
    }
    // Genre: glow the active genre preset until user changes sliders
    const activeGenre = window.viz2ActiveGenreName;
    if (activeGenre) {
      const genreHead = Array.from(root.querySelectorAll('[class*="tp-hed"], [class*="tp-ttl"]')).find(h => (h.textContent || '').trim() === 'Genre');
      const genreFolderEl = genreHead && (genreHead.closest('[class*="tp-fld"]') || genreHead.parentElement);
      if (genreFolderEl) genreFolderEl.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim() === activeGenre) btn.classList.add('viz2-active');
      });
    }
    root.querySelectorAll('[class*="tp-bl"]').forEach(blade => {
      const label = blade.querySelector('[class*="tp-lbl"]') || blade.querySelector('label') || blade.querySelector('[class*="tp-tic"]');
      const text = (label && label.textContent || '').trim();
      if (text.indexOf('Sound') !== -1) blade.classList.toggle('viz2-active-row', !!params.sound);
      else if (text.indexOf('Geo') !== -1) blade.classList.toggle('viz2-active-row', !!params.geo);
    });
    Array.from(root.querySelectorAll('[class*="tp-fld"]')).forEach(fld => {
      const title = fld.querySelector('[class*="tp-hed"]') || fld.querySelector('[class*="tp-ttl"]');
      if (title && title.textContent.trim().toLowerCase().includes('routing')) {
        fld.querySelectorAll('[class*="tp-bl"]').forEach((blade, i) => {
          const keys = ['bassToSpeed','bassToSway','bassToDensity','midToSpeed','midToSway','midToDensity','trebleToSpeed','trebleToSway','trebleToDensity'];
          if (params[keys[i]] !== undefined) blade.classList.toggle('viz2-active-row', !!params[keys[i]]);
        });
      }
    });
  }
  function scheduleGlow() { requestAnimationFrame(() => updateActiveGlow()); }
  function clearGenreGlow() { window.viz2ActiveGenreName = ''; scheduleGlow(); }

function syncToGlobals() {
  g.lineDensity = params.density;
  g.geoSpeed = params.speed;
  g.lateralAmp = params.lateral;
  g.tunnelStrength = params.tunnel;
  g.geoScale = params.scale;
  g.geoOn = params.geo;
  g.soundMode = params.sound;
  g.audioSourceMode = params.audioSource;
  g.qualityMode = params.quality;
  g.bassToSpeed = params.bassToSpeed;
  g.bassToSway = params.bassToSway;
  g.bassToDensity = params.bassToDensity;
  g.midToSpeed = params.midToSpeed;
  g.midToSway = params.midToSway;
  g.midToDensity = params.midToDensity;
  g.trebleToSpeed = params.trebleToSpeed;
  g.trebleToSway = params.trebleToSway;
  g.trebleToDensity = params.trebleToDensity;
  if (window.debouncedSave) window.debouncedSave();
}

function syncFromGlobals() {
  params.density = g.lineDensity;
  params.speed = g.geoSpeed;
  params.lateral = g.lateralAmp;
  params.tunnel = g.tunnelStrength;
  params.scale = g.geoScale;
  params.geo = g.geoOn;
  params.sound = g.soundMode;
  params.audioSource = g.audioSourceMode;
  params.quality = g.qualityMode;
  params.bassToSpeed = g.bassToSpeed;
  params.bassToSway = g.bassToSway;
  params.bassToDensity = g.bassToDensity;
  params.midToSpeed = g.midToSpeed;
  params.midToSway = g.midToSway;
  params.midToDensity = g.midToDensity;
  params.trebleToSpeed = g.trebleToSpeed;
  params.trebleToSway = g.trebleToSway;
  params.trebleToDensity = g.trebleToDensity;
  params.sens = ['Low', 'Med', 'High'][g.micSensIdx];
  params.sensLabel = params.sens;
  params.sourceLabel = g.audioSourceMode === 'mic' ? 'Mic' : 'Tab';
  params.qualityLabel = (g.qualityMode === 'full' ? 'Full' : g.qualityMode === 'half' ? 'Half' : 'Low');
  if (window.viz2GetPaletteName) params.palette = window.viz2GetPaletteName();
}

// Genre (desktop): folder created here; buttons added when viz2-defaults.json loads
const genreFolder = pane.addFolder({ title: 'Genre', expanded: true });

// Motion
const motionFolder = pane.addFolder({ title: 'Motion', expanded: true });
motionFolder.addBinding(params, 'speed', { min: 0.05, max: 12, step: 0.05, label: 'Speed' })
  .on('change', () => { syncToGlobals(); clearGenreGlow(); });
motionFolder.addBinding(params, 'lateral', { min: 0, max: 0.05, step: 0.001, label: 'Lateral' })
  .on('change', () => { syncToGlobals(); clearGenreGlow(); });

// Shape
const shapeFolder = pane.addFolder({ title: 'Shape', expanded: true });
shapeFolder.addBinding(params, 'density', { min: 1, max: 128, step: 1, label: 'Density' })
  .on('change', () => { syncToGlobals(); clearGenreGlow(); });
shapeFolder.addBinding(params, 'tunnel', { min: 0, max: 2, step: 0.1, label: 'Tunnel' })
  .on('change', () => { syncToGlobals(); clearGenreGlow(); });
shapeFolder.addBinding(params, 'scale', { min: 0.2, max: 6, step: 0.05, label: 'Scale' })
  .on('change', () => { syncToGlobals(); clearGenreGlow(); });
shapeFolder.addBinding(params, 'geo', { label: 'Geo on' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });

// Audio
const audioFolder = pane.addFolder({ title: 'Audio', expanded: true });
audioFolder.addBinding(params, 'sound', { label: 'Sound on' }).on('change', () => {
  syncToGlobals(); clearGenreGlow();
  if (window.viz2SetMode) window.viz2SetMode(params.sound);
});
audioFolder.addBinding(params, 'sourceLabel', { label: 'Source', readonly: true });
audioFolder.addButton({ title: 'Mic' }).on('click', () => {
  params.audioSource = 'mic'; params.sourceLabel = 'Mic'; syncToGlobals();
  if (window.viz2SetAudioSource) window.viz2SetAudioSource('mic');
  pane.refresh(); scheduleGlow();
});
audioFolder.addButton({ title: 'Tab' }).on('click', () => {
  params.audioSource = 'tab'; params.sourceLabel = 'Tab'; syncToGlobals();
  if (window.viz2SetAudioSource) window.viz2SetAudioSource('tab');
  pane.refresh(); scheduleGlow();
});
audioFolder.addBinding(params, 'qualityLabel', { label: 'Quality', readonly: true });
audioFolder.addButton({ title: 'Full' }).on('click', () => {
  params.quality = 'full'; params.qualityLabel = 'Full'; syncToGlobals();
  if (window.viz2SetQualityMode) window.viz2SetQualityMode('full');
  pane.refresh(); scheduleGlow();
});
audioFolder.addButton({ title: 'Half' }).on('click', () => {
  params.quality = 'half'; params.qualityLabel = 'Half'; syncToGlobals();
  if (window.viz2SetQualityMode) window.viz2SetQualityMode('half');
  pane.refresh(); scheduleGlow();
});
audioFolder.addButton({ title: 'Low' }).on('click', () => {
  params.quality = 'low'; params.qualityLabel = 'Low'; syncToGlobals();
  if (window.viz2SetQualityMode) window.viz2SetQualityMode('low');
  pane.refresh(); scheduleGlow();
});
audioFolder.addBinding(params, 'sensLabel', { label: 'Sensitivity', readonly: true });
audioFolder.addButton({ title: 'Low' }).on('click', () => {
  params.sens = 'Low'; params.sensLabel = 'Low'; g.micSensIdx = 0; syncToGlobals();
  if (window.debouncedSave) window.debouncedSave();
  pane.refresh(); scheduleGlow();
});
audioFolder.addButton({ title: 'Med' }).on('click', () => {
  params.sens = 'Med'; params.sensLabel = 'Med'; g.micSensIdx = 1; syncToGlobals();
  if (window.debouncedSave) window.debouncedSave();
  pane.refresh(); scheduleGlow();
});
audioFolder.addButton({ title: 'High' }).on('click', () => {
  params.sens = 'High'; params.sensLabel = 'High'; g.micSensIdx = 2; syncToGlobals();
  if (window.debouncedSave) window.debouncedSave();
  pane.refresh(); scheduleGlow();
});

// Routing
const routingFolder = pane.addFolder({ title: 'Mic routing', expanded: false });
routingFolder.addBinding(params, 'bassToSpeed', { label: 'Bass → Speed' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'bassToSway', { label: 'Bass → Sway' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'bassToDensity', { label: 'Bass → Density' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'midToSpeed', { label: 'Mid → Speed' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'midToSway', { label: 'Mid → Sway' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'midToDensity', { label: 'Mid → Density' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'trebleToSpeed', { label: 'Treble → Speed' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'trebleToSway', { label: 'Treble → Sway' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });
routingFolder.addBinding(params, 'trebleToDensity', { label: 'Treble → Density' }).on('change', () => { syncToGlobals(); clearGenreGlow(); });

// Actions
const actionsFolder = pane.addFolder({ title: 'Actions', expanded: true });
actionsFolder.addBinding(params, 'palette', { label: 'Palette', readonly: true });
actionsFolder.addButton({ title: 'Hide panel' }).on('click', () => {
  if (window.viz2HideHUD) window.viz2HideHUD();
});
actionsFolder.addButton({ title: 'Cycle palette' }).on('click', () => {
  if (window.viz2CyclePalette) window.viz2CyclePalette();
  if (window.viz2GetPaletteName) params.palette = window.viz2GetPaletteName();
  clearGenreGlow();
  pane.refresh();
  scheduleGlow();
});
actionsFolder.addButton({ title: 'Random' }).on('click', () => {
  if (window.viz2Randomise) window.viz2Randomise();
  syncFromGlobals(); clearGenreGlow();
  pane.refresh(); scheduleGlow();
});
actionsFolder.addButton({ title: 'Reset' }).on('click', () => {
  if (window.viz2Reset) window.viz2Reset();
  syncFromGlobals(); clearGenreGlow();
  pane.refresh(); scheduleGlow();
});
actionsFolder.addButton({ title: 'Fullscreen' }).on('click', () => {
  if (window.viz2Fullscreen) window.viz2Fullscreen();
});
if (document.body.classList.contains('is-mobile')) {
  actionsFolder.addButton({ title: 'Gyro' }).on('click', () => {
    if (window.viz2ToggleGyro) window.viz2ToggleGyro();
    syncFromGlobals();
    pane.refresh();
  });
}

// Presets
const presetFolder = pane.addFolder({ title: 'Presets', expanded: false });
for (let i = 0; i < 6; i++) {
  const slot = i;
  presetFolder.addButton({ title: `Load ${slot + 1}` }).on('click', () => {
    if (window.viz2LoadPreset) window.viz2LoadPreset(slot);
    syncFromGlobals(); clearGenreGlow();
    if (window.viz2GetPaletteName) params.palette = window.viz2GetPaletteName();
    pane.refresh(); scheduleGlow();
  });
  presetFolder.addButton({ title: `Save ${slot + 1}` }).on('click', () => {
    if (window.viz2SavePreset) window.viz2SavePreset(slot);
  });
}

// Genre bank: main script calls this when presets/viz2-defaults.json has loaded
window.viz2PaneAddGenrePresets = function(presets) {
  if (!presets || !presets.length || !genreFolder) return;
  presets.forEach((p) => {
    genreFolder.addButton({ title: p.name }).on('click', () => {
      if (window.viz2LoadDefaultPreset) window.viz2LoadDefaultPreset(p);
      window.viz2ActiveGenreName = p.name;
      syncFromGlobals();
      if (window.viz2GetPaletteName) params.palette = window.viz2GetPaletteName();
      pane.refresh();
      if (typeof scheduleGlow === 'function') scheduleGlow();
    });
  });
};
if (window.viz2DefaultPresets && window.viz2DefaultPresets.length) window.viz2PaneAddGenrePresets(window.viz2DefaultPresets);

// Refresh: copy globals → params, then refresh pane
  window.viz2RefreshPane = function() {
    syncFromGlobals();
    pane.refresh();
    requestAnimationFrame(() => updateActiveGlow());
  };
  requestAnimationFrame(() => updateActiveGlow());
} catch (e) {
  console.error('Viz2 Tweakpane failed:', e);
  const container = document.getElementById('paneContainer');
  if (container) container.innerHTML = '<p style="color:#fff;padding:12px;">Controls failed to load. Use keyboard (H, P, S, R, 1–6) or refresh.</p>';
}
