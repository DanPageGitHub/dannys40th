'use strict';

(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 1;
  let H = 1;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);
  let lastTime = performance.now();
  let startTime = performance.now();
  let paused = false;

  const PALETTES = [
    {
      name: 'Rust',
      bg: [4, 7, 11],
      discA: [178, 86, 42],
      discB: [92, 38, 20],
      glow: [231, 170, 77],
      haze: [18, 82, 112],
      holes: [2, 2, 5],
      rim: [168, 118, 62],
    },
    {
      name: 'Oxide',
      bg: [6, 7, 10],
      discA: [164, 55, 35],
      discB: [88, 22, 18],
      glow: [255, 152, 67],
      haze: [22, 68, 93],
      holes: [4, 3, 7],
      rim: [145, 84, 44],
    },
    {
      name: 'Verdigris',
      bg: [4, 9, 12],
      discA: [89, 130, 116],
      discB: [29, 66, 63],
      glow: [214, 148, 80],
      haze: [116, 53, 44],
      holes: [3, 5, 8],
      rim: [129, 134, 101],
    },
    {
      name: 'Dusk',
      bg: [7, 8, 13],
      discA: [145, 64, 120],
      discB: [69, 29, 86],
      glow: [89, 175, 165],
      haze: [173, 89, 46],
      holes: [4, 3, 7],
      rim: [121, 98, 156],
    },
  ];

  const state = {
    paletteIndex: 0,
    motion: 0.82,
    density: 1.0,
    clusters: 1,
    seed: (Math.random() * 1e9) | 0,
    soundMode: false,
    bass: 0,
    treble: 0,
  };

  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let freqData = null;

  const composition = {
    discs: [],
    grainSeed: 0,
  };

  function rgb(c, a = 1) {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rebuild();
  }

  function overlaps(circle, placed, gap) {
    for (let i = 0; i < placed.length; i += 1) {
      const o = placed[i];
      const dx = circle.x - o.x;
      const dy = circle.y - o.y;
      const d = circle.r + o.r + gap;
      if ((dx * dx) + (dy * dy) < d * d) return true;
    }
    return false;
  }

  function insideDisc(circle, radius, edgePad) {
    return Math.hypot(circle.x, circle.y) + circle.r + edgePad <= radius;
  }

  function tryPlaceAlongSpiral(placed, circle, discRadius, gap, edgePad) {
    if (!insideDisc(circle, discRadius, edgePad)) return false;
    if (overlaps(circle, placed, gap)) return false;
    placed.push(circle);
    return true;
  }

  function buildDisc(rand, discRadius, clusterIndex, totalClusters) {
    const circles = [];
    const armCount = Math.floor(lerp(4, 6.999, rand()));
    const turns = lerp(2.9, 4.45, rand());
    const direction = rand() > 0.5 ? 1 : -1;
    const startAngle = rand() * Math.PI * 2;
    const edgePad = discRadius * 0.018;
    const gap = discRadius * lerp(0.0045, 0.0078, rand());
    const baseMinR = discRadius * 0.0105;
    const baseMaxR = discRadius * 0.094;
    const armRows = Math.round(lerp(18, 26, rand()) * state.density);
    const fillPasses = Math.round(lerp(180, 290, rand()) * state.density);
    const laneSpread = discRadius * lerp(0.015, 0.026, rand());

    for (let arm = 0; arm < armCount; arm += 1) {
      const armOffset = startAngle + ((Math.PI * 2) / armCount) * arm;
      const lanePhase = rand() * Math.PI * 2;
      let previous = null;

      for (let i = 0; i < armRows; i += 1) {
        const t = i / Math.max(1, armRows - 1);
        const radialT = Math.pow(t, lerp(0.88, 1.06, rand()));
        const dist = lerp(discRadius * 0.11, discRadius * 0.9, radialT);
        const spiralAngle = armOffset + direction * turns * radialT * Math.PI * 2;
        const laneOffset = Math.sin(radialT * Math.PI * 3.2 + lanePhase) * laneSpread * (0.35 + radialT * 0.85);
        const x = Math.cos(spiralAngle) * dist + Math.cos(spiralAngle + Math.PI / 2) * laneOffset;
        const y = Math.sin(spiralAngle) * dist + Math.sin(spiralAngle + Math.PI / 2) * laneOffset;

        const sizeWave = 0.7 + 0.3 * Math.sin(radialT * Math.PI * 4 + lanePhase);
        let r = lerp(baseMaxR, baseMinR, Math.pow(radialT, 0.84)) * sizeWave;
        if (previous) {
          const ideal = previous.r * lerp(0.6, 0.95, rand());
          r = lerp(r, ideal, 0.35);
        }
        r = clamp(r, baseMinR, baseMaxR * 1.02);

        const placed = tryPlaceAlongSpiral(circles, { x, y, r, arm, t: radialT }, discRadius, gap * 0.24, edgePad);
        if (placed) previous = circles[circles.length - 1];
      }
    }

    for (let pass = 0; pass < fillPasses; pass += 1) {
      const arm = Math.floor(rand() * armCount);
      const armOffset = startAngle + ((Math.PI * 2) / armCount) * arm;
      const t = Math.pow(rand(), lerp(0.78, 1.18, rand()));
      const dist = lerp(discRadius * 0.08, discRadius * 0.92, t);
      const localTwist = direction * turns * t * Math.PI * 2;
      const neighbourBlend = lerp(-0.46, 0.46, rand()) * ((Math.PI * 2) / armCount);
      const angle = armOffset + localTwist + neighbourBlend;
      const laneOffset = lerp(-laneSpread * 1.9, laneSpread * 1.9, rand()) * (0.25 + t);
      const x = Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * laneOffset;
      const y = Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * laneOffset;
      const edge = discRadius - Math.hypot(x, y) - edgePad;
      if (edge <= baseMinR) continue;

      const maxAllowed = Math.min(baseMaxR * lerp(0.32, 0.72, rand()), edge);
      const r = lerp(baseMinR, maxAllowed, 1 - Math.pow(rand(), lerp(1.7, 3.4, rand())));
      if (r < baseMinR) continue;

      tryPlaceAlongSpiral(circles, { x, y, r, arm, t }, discRadius, gap * 0.12, edgePad);
    }

    const animatedCircles = circles.map((circle, index) => {
      const theta = Math.atan2(circle.y, circle.x);
      const distN = Math.hypot(circle.x, circle.y) / discRadius;
      return {
        ...circle,
        index,
        theta,
        distN,
        phase: rand() * Math.PI * 2,
        tangentialAmp: lerp(0.8, 4.6, rand()) * (0.25 + distN) * state.motion,
        radialAmp: lerp(0.6, 2.8, rand()) * (0.18 + distN * 0.9) * state.motion,
        pulseAmp: lerp(0.008, 0.05, rand()) * (0.45 + (1 - distN) * 0.5) * state.motion,
        speed: lerp(0.34, 0.92, rand()),
        opacity: lerp(0.9, 1, rand()),
      };
    });

    const discScale = totalClusters === 1 ? 1 : lerp(0.55, 0.82, rand());
    const xBase = totalClusters === 1
      ? 0.5
      : lerp(0.22, 0.78, (clusterIndex + rand()) / totalClusters);
    const yBase = totalClusters === 1 ? 0.52 : lerp(0.26, 0.74, rand());

    return {
      cx: W * xBase,
      cy: H * yBase,
      radius: discRadius * discScale,
      originalRadius: discRadius,
      armCount,
      turns,
      direction,
      rotationBase: rand() * Math.PI * 2,
      rotationSpeed: lerp(-0.00008, 0.00008, rand()) * state.motion,
      swayX: (totalClusters === 1 ? lerp(10, 20, rand()) : lerp(14, 34, rand())) * state.motion,
      swayY: (totalClusters === 1 ? lerp(8, 18, rand()) : lerp(12, 28, rand())) * state.motion,
      pulse: lerp(0.008, 0.026, rand()) * state.motion,
      circles: animatedCircles,
      innerGlowOffset: rand() * Math.PI * 2,
      texturePhase: rand() * Math.PI * 2,
    };
  }

  function rebuild() {
    const rand = mulberry32(state.seed);
    composition.discs = [];
    const minDim = Math.min(W, H);
    const totalClusters = Math.max(1, Math.round(state.clusters));
    const baseRadius = totalClusters === 1
      ? minDim * 0.47
      : minDim * lerp(0.28, 0.39, rand());

    for (let i = 0; i < totalClusters; i += 1) {
      composition.discs.push(buildDisc(rand, baseRadius, i, totalClusters));
    }

    composition.grainSeed = rand() * 99999;
    updateHud();
  }

  function updateAudio() {
    if (!analyser || !freqData) {
      state.bass = lerp(state.bass, 0, 0.08);
      state.treble = lerp(state.treble, 0, 0.08);
      return;
    }

    analyser.getByteFrequencyData(freqData);
    let bass = 0;
    let treble = 0;
    const bassLimit = Math.max(4, Math.floor(freqData.length * 0.08));
    const trebleStart = Math.floor(freqData.length * 0.45);

    for (let i = 0; i < bassLimit; i += 1) bass += freqData[i];
    bass /= bassLimit * 255;
    for (let i = trebleStart; i < freqData.length; i += 1) treble += freqData[i];
    treble /= Math.max(1, (freqData.length - trebleStart) * 255);

    state.bass = lerp(state.bass, bass, 0.16);
    state.treble = lerp(state.treble, treble, 0.12);
  }

  async function toggleMic() {
    if (state.soundMode) {
      state.soundMode = false;
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
      }
      analyser = null;
      freqData = null;
      updateButtons();
      return;
    }

    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') await audioContext.resume();
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const source = audioContext.createMediaStreamSource(micStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.86;
      source.connect(analyser);
      freqData = new Uint8Array(analyser.frequencyBinCount);
      state.soundMode = true;
      updateButtons();
    } catch (error) {
      console.warn('Microphone unavailable', error);
      state.soundMode = false;
      updateButtons();
    }
  }

  function drawBackground(palette) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, rgb(palette.bg, 1));
    bg.addColorStop(0.55, rgb([palette.bg[0] + 3, palette.bg[1] + 4, palette.bg[2] + 9], 1));
    bg.addColorStop(1, rgb(palette.bg, 1));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const haze = ctx.createRadialGradient(W * 0.72, H * 0.28, 0, W * 0.72, H * 0.28, Math.max(W, H) * 0.7);
    haze.addColorStop(0, rgb(palette.haze, 0.16));
    haze.addColorStop(0.42, rgb(palette.haze, 0.08));
    haze.addColorStop(1, rgb(palette.haze, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  }

  function drawDisc(disc, time, palette) {
    const bassPush = state.soundMode ? state.bass * 28 : 0;
    const treblePush = state.soundMode ? state.treble * 14 : 0;
    const swayX = Math.sin(time * 0.00023 + disc.rotationBase) * disc.swayX;
    const swayY = Math.cos(time * 0.00019 + disc.rotationBase * 1.17) * disc.swayY;
    const pulse = 1 + Math.sin(time * 0.0002 + disc.rotationBase * 0.6) * disc.pulse + state.bass * 0.025;
    const rotation = disc.rotationBase + time * disc.rotationSpeed + Math.sin(time * 0.00009 + disc.rotationBase) * 0.04 * state.motion;
    const radius = disc.radius * pulse + bassPush;
    const cx = disc.cx + swayX;
    const cy = disc.cy + swayY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const discGrad = ctx.createRadialGradient(-radius * 0.18, -radius * 0.12, radius * 0.12, 0, 0, radius * 1.02);
    discGrad.addColorStop(0, rgb(palette.glow, 0.18));
    discGrad.addColorStop(0.18, rgb(palette.discA, 0.95));
    discGrad.addColorStop(0.7, rgb(palette.discB, 0.96));
    discGrad.addColorStop(1, rgb(palette.discB, 0.74));

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = discGrad;
    ctx.shadowColor = rgb(palette.glow, 0.14);
    ctx.shadowBlur = radius * 0.08;
    ctx.fill();
    ctx.shadowBlur = 0;

    const sheen = ctx.createLinearGradient(-radius, -radius * 0.5, radius, radius * 0.75);
    sheen.addColorStop(0, 'rgba(255,255,255,0.00)');
    sheen.addColorStop(0.46, 'rgba(255,255,255,0.00)');
    sheen.addColorStop(0.55, `rgba(${palette.glow[0]}, ${palette.glow[1]}, ${palette.glow[2]}, 0.18)`);
    sheen.addColorStop(0.62, 'rgba(255,255,255,0.00)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.00)');
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.996, 0, Math.PI * 2);
    ctx.fillStyle = sheen;
    ctx.fill();

    ctx.strokeStyle = rgb(palette.rim, 0.14);
    ctx.lineWidth = Math.max(1, radius * 0.0035);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.995, 0, Math.PI * 2);
    ctx.stroke();

    const textureBands = 14;
    for (let i = 0; i < textureBands; i += 1) {
      const angle = ((Math.PI * 2) / textureBands) * i + disc.texturePhase + time * 0.00003;
      const alpha = 0.02 + 0.02 * Math.sin(time * 0.00007 + i);
      ctx.strokeStyle = `rgba(255, 248, 234, ${alpha})`;
      ctx.lineWidth = Math.max(1, radius * 0.0013);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius * 0.04, Math.sin(angle) * radius * 0.04, radius * (0.74 + i * 0.01), angle - 0.7, angle + 0.7);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'destination-out';
    const motionBoost = 1 + treblePush * 0.001;
    for (let i = 0; i < disc.circles.length; i += 1) {
      const c = disc.circles[i];
      const flow = time * 0.00042 * c.speed + c.phase;
      const localRotation = disc.direction * 0.4 * c.t + Math.sin(flow + c.arm * 0.9) * 0.08;
      const tangential = Math.sin(flow) * c.tangentialAmp * motionBoost;
      const radial = Math.cos(flow * 0.87 + c.arm) * c.radialAmp * motionBoost;
      const pulseR = c.r * (1 + Math.sin(flow * 0.78 + c.phase) * c.pulseAmp + state.bass * 0.07);

      const baseAngle = c.theta + localRotation;
      const dist = c.distN * radius + radial;
      const x = Math.cos(baseAngle) * dist + Math.cos(baseAngle + Math.PI / 2) * tangential;
      const y = Math.sin(baseAngle) * dist + Math.sin(baseAngle + Math.PI / 2) * tangential;

      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, pulseR), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < disc.circles.length; i += 1) {
      const c = disc.circles[i];
      if (i % 6 !== 0) continue;
      const flow = time * 0.00042 * c.speed + c.phase;
      const tangential = Math.sin(flow) * c.tangentialAmp;
      const radial = Math.cos(flow * 0.87 + c.arm) * c.radialAmp;
      const baseAngle = c.theta + disc.direction * 0.4 * c.t;
      const dist = c.distN * radius + radial;
      const x = Math.cos(baseAngle) * dist + Math.cos(baseAngle + Math.PI / 2) * tangential;
      const y = Math.sin(baseAngle) * dist + Math.sin(baseAngle + Math.PI / 2) * tangential;
      const rr = c.r * (1 + Math.sin(flow * 0.7) * c.pulseAmp * 0.8);

      ctx.fillStyle = rgb(palette.glow, 0.04);
      ctx.beginPath();
      ctx.arc(x, y, rr * 1.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawForeground(palette) {
    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.16, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, 'rgba(0,0,0,0.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    const grainCount = Math.floor((W * H) / 15000);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < grainCount; i += 1) {
      const x = (Math.sin(i * 127.1 + composition.grainSeed) * 43758.5453 % 1 + 1) % 1 * W;
      const y = (Math.sin(i * 311.7 + composition.grainSeed * 0.7) * 12758.5453 % 1 + 1) % 1 * H;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function render(now) {
    if (!paused) lastTime = now;
    const time = paused ? lastTime : now;
    const palette = PALETTES[state.paletteIndex % PALETTES.length];
    updateAudio();
    drawBackground(palette);

    for (let i = 0; i < composition.discs.length; i += 1) {
      drawDisc(composition.discs[i], time, palette);
    }

    drawForeground(palette);
    updateHud();
    requestAnimationFrame(render);
  }

  function regenerate() {
    state.seed = (Math.random() * 1e9) | 0;
    rebuild();
  }

  function cyclePalette() {
    state.paletteIndex = (state.paletteIndex + 1) % PALETTES.length;
    updateHud();
  }

  function updateButtons() {
    const pauseButton = document.getElementById('togglePause');
    const soundButton = document.getElementById('toggleSound');
    if (pauseButton) pauseButton.textContent = paused ? 'Resume' : 'Pause';
    if (soundButton) soundButton.textContent = state.soundMode ? 'Mic on' : 'Mic off';
  }

  function updateHud() {
    const info = document.getElementById('hudInfo');
    if (!info) return;
    const palette = PALETTES[state.paletteIndex % PALETTES.length];
    const circleCount = composition.discs.reduce((sum, disc) => sum + disc.circles.length, 0);
    const arms = composition.discs.map(d => d.armCount).join(' / ');
    info.textContent = `${palette.name} • ${composition.discs.length} disc${composition.discs.length > 1 ? 's' : ''} • ${circleCount} cut-outs • spiral arms ${arms}`;
  }

  function bindUI() {
    const pauseButton = document.getElementById('togglePause');
    const regenerateButton = document.getElementById('regenerate');
    const paletteButton = document.getElementById('cyclePalette');
    const soundButton = document.getElementById('toggleSound');
    const motionRange = document.getElementById('motionRange');
    const densityRange = document.getElementById('densityRange');
    const clusterRange = document.getElementById('clusterRange');

    if (pauseButton) pauseButton.addEventListener('click', () => {
      paused = !paused;
      updateButtons();
    });

    if (regenerateButton) regenerateButton.addEventListener('click', regenerate);
    if (paletteButton) paletteButton.addEventListener('click', cyclePalette);
    if (soundButton) soundButton.addEventListener('click', toggleMic);

    if (motionRange) {
      motionRange.value = String(state.motion);
      motionRange.addEventListener('input', event => {
        state.motion = Number(event.target.value);
        rebuild();
      });
    }

    if (densityRange) {
      densityRange.value = String(state.density);
      densityRange.addEventListener('input', event => {
        state.density = Number(event.target.value);
        rebuild();
      });
    }

    if (clusterRange) {
      clusterRange.value = String(state.clusters);
      clusterRange.addEventListener('input', event => {
        state.clusters = Number(event.target.value);
        rebuild();
      });
    }

    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (key === ' ') {
        event.preventDefault();
        paused = !paused;
        updateButtons();
      } else if (key === 'r') {
        regenerate();
      } else if (key === 'p') {
        cyclePalette();
      } else if (key === 'm') {
        toggleMic();
      }
    });

    updateButtons();
  }

  bindUI();
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(render);
})();
