'use strict';

(() => {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) {
    console.error('Canvas #bgCanvas not found');
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0;
  let H = 0;
  let DPR = Math.min(window.devicePixelRatio || 1, 2);

  const PALETTES = [
    {
      name: 'Earthen',
      bg: [7, 8, 11],
      blobA: [166, 82, 45],
      blobB: [97, 42, 24],
      accent: [224, 172, 83],
      haze: [33, 91, 91],
    },
    {
      name: 'Oxide',
      bg: [8, 9, 14],
      blobA: [178, 52, 35],
      blobB: [88, 20, 16],
      accent: [235, 146, 55],
      haze: [22, 102, 133],
    },
    {
      name: 'Dusk',
      bg: [7, 8, 13],
      blobA: [140, 43, 112],
      blobB: [70, 22, 88],
      accent: [86, 182, 165],
      haze: [191, 94, 43],
    },
    {
      name: 'Verdigris',
      bg: [6, 10, 12],
      blobA: [42, 126, 116],
      blobB: [15, 61, 66],
      accent: [204, 134, 68],
      haze: [170, 65, 56],
    },
  ];

  let paletteIndex = 0;
  let soundMode = false;
  let paused = false;
  let audioContext = null;
  let analyser = null;
  let micStream = null;
  let freqData = null;
  let smoothedBass = 0;
  let smoothedTreble = 0;
  let pulseBoost = 0;
  let densityBoost = 0;
  let swayBoost = 0;

  const state = {
    clusterCount: 2,
    holeDensity: 1.0,
    motion: 0.85,
    grain: 0.04,
    drift: 1.0,
    vignette: 0.28,
    spiralStrength: 1.0,
  };

  const clusters = [];
  let animationStart = performance.now();
  let lastFrame = performance.now();

  function rgb(c, a = 1) {
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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
      const other = placed[i];
      const dx = circle.x - other.x;
      const dy = circle.y - other.y;
      const minD = circle.r + other.r + gap;
      if ((dx * dx) + (dy * dy) < minD * minD) return true;
    }
    return false;
  }

  function insideCluster(circle, baseRadius, edgePad) {
    return Math.hypot(circle.x, circle.y) + circle.r + edgePad <= baseRadius;
  }

  function makeSpiralPackedCircles(rand, baseRadius, minR, maxR, gap, targetCount) {
    const placed = [];
    const spiralBias = state.spiralStrength;
    const armCount = Math.floor(lerp(3, 5.999, rand()));
    const turns = lerp(2.9, 4.6, rand()) * lerp(0.98, 1.22, spiralBias);
    const direction = rand() > 0.5 ? 1 : -1;
    const armPhase = rand() * Math.PI * 2;
    const edgePad = gap * 1.15;
    const chainGap = gap * lerp(0.1, 0.45, rand());
    const armPull = lerp(0.55, 0.9, rand());
    const perArm = Math.round(targetCount * lerp(0.52, 0.68, rand()) / armCount);

    for (let arm = 0; arm < armCount; arm += 1) {
      const armOffset = armPhase + ((Math.PI * 2) / armCount) * arm;
      let angle = armOffset + direction * lerp(0.08, 0.22, rand());
      let dist = baseRadius * lerp(0.12, 0.22, rand());
      let previous = null;

      for (let i = 0; i < perArm; i += 1) {
        const t = i / Math.max(1, perArm - 1);
        const idealR = clamp(
          lerp(maxR * lerp(0.72, 1.02, rand()), minR * lerp(0.95, 1.18, rand()), Math.pow(t, 0.82)),
          minR,
          maxR
        );

        let r = idealR;
        if (previous) {
          const tighten = lerp(0.9, 1.06, rand());
          const targetStep = (previous.r + r + chainGap) * tighten;
          const radialTerm = Math.max(0.18, dist);
          const angleStep = (targetStep / radialTerm) * direction * armPull;
          angle += angleStep;
          dist += targetStep * lerp(0.26, 0.46, rand());
        }

        const spineAngle = armOffset + direction * turns * (dist / baseRadius) * Math.PI * 2;
        angle = lerp(angle, spineAngle, previous ? lerp(0.18, 0.36, rand()) : 1);

        const laneOffset = (rand() - 0.5) * baseRadius * 0.012 * (0.4 + t);
        const x = Math.cos(angle) * dist + Math.cos(angle + Math.PI / 2) * laneOffset;
        const y = Math.sin(angle) * dist + Math.sin(angle + Math.PI / 2) * laneOffset;
        const candidate = { x, y, r };

        if (
          r >= minR &&
          insideCluster(candidate, baseRadius, edgePad) &&
          !overlaps(candidate, placed, gap * 0.2)
        ) {
          placed.push(candidate);
          previous = candidate;
        } else if (previous) {
          angle += direction * 0.045;
          dist += r * 0.18;
        }
      }
    }

    const fillerTarget = Math.round(targetCount * 0.35);
    const fillerTries = targetCount * 120;
    let fillerCount = 0;
    for (let i = 0; i < fillerTries && placed.length < targetCount && fillerCount < fillerTarget; i += 1) {
      const t = rand();
      const arm = Math.floor(rand() * armCount);
      const baseAngle = armPhase + ((Math.PI * 2) / armCount) * arm + direction * turns * Math.pow(t, 0.92) * Math.PI * 2;
      const dist = baseRadius * 0.06 + (baseRadius * 0.86) * Math.pow(t, lerp(0.88, 1.04, rand()));
      const offset = lerp(-baseRadius * 0.04, baseRadius * 0.04, rand());
      const x = Math.cos(baseAngle) * dist + Math.cos(baseAngle + Math.PI / 2) * offset;
      const y = Math.sin(baseAngle) * dist + Math.sin(baseAngle + Math.PI / 2) * offset;
      const edge = baseRadius - Math.hypot(x, y);
      const allowed = clamp(edge - edgePad, minR, maxR * 0.72);
      if (allowed < minR) continue;

      const radiusBias = Math.pow(rand(), lerp(1.9, 3.6, rand()));
      const r = lerp(minR, allowed, 1 - radiusBias);
      const candidate = { x, y, r };
      if (!insideCluster(candidate, baseRadius, edgePad)) continue;
      if (!overlaps(candidate, placed, gap * 0.28)) {
        placed.push(candidate);
        fillerCount += 1;
      }
    }

    return { placed, armCount, turns, direction, armPhase };
  }

  function buildCluster(seed, index) {
    const rand = mulberry32(seed);
    const minDim = Math.min(W, H);
    const baseRadius = minDim * lerp(0.28, 0.45, rand()) * lerp(0.92, 1.1, state.holeDensity);
    const x = index === 0 ? lerp(0.38, 0.58, rand()) : lerp(0.22, 0.78, rand());
    const y = index === 0 ? lerp(0.36, 0.62, rand()) : lerp(0.22, 0.78, rand());
    const depth = lerp(0.18, 1.0, rand());
    const driftX = lerp(20, 52, rand()) * state.motion;
    const driftY = lerp(12, 34, rand()) * state.motion;
    const pulse = lerp(0.012, 0.05, rand()) * state.motion;
    const wobble = lerp(0.4, 1.0, rand());
    const blobScale = lerp(1.1, 1.22, rand());
    const edgeSoftness = lerp(0.18, 0.28, rand());
    const rotation = rand() * Math.PI * 2;
    const rotationSpeed = lerp(-0.00006, 0.00006, rand()) * state.drift;

    const minR = baseRadius * lerp(0.011, 0.019, rand());
    const maxR = baseRadius * lerp(0.075, 0.135, rand());
    const targetCount = Math.round(lerp(110, 180, rand()) * state.holeDensity);
    const gap = lerp(1.6, 4.4, rand()) * (minDim / 900);

    const packed = makeSpiralPackedCircles(rand, baseRadius, minR, maxR, gap, targetCount);
    const circles = packed.placed.map((c, i) => {
      const theta = Math.atan2(c.y, c.x);
      const dist = Math.hypot(c.x, c.y) / Math.max(1, baseRadius);
      const armWave = Math.sin(theta * packed.armCount + dist * packed.turns * Math.PI * 2);
      return {
        ...c,
        seed: rand() * Math.PI * 2,
        speed: lerp(0.00018, 0.00062, rand()) * (0.7 + depth * 0.5),
        wx: lerp(0.8, 4.6, rand()) * state.motion,
        wy: lerp(0.8, 4.6, rand()) * state.motion,
        pulse: lerp(0.004, 0.02, rand()) * state.motion,
        tilt: lerp(-0.35, 0.35, rand()),
        shimmer: lerp(0.08, 0.3, rand()),
        order: i,
        theta,
        dist,
        armWave,
        orbit: lerp(0.35, 1.15, rand()),
      };
    });

    return {
      seed,
      index,
      x,
      y,
      depth,
      baseRadius,
      driftX,
      driftY,
      pulse,
      wobble,
      blobScale,
      edgeSoftness,
      rotation,
      rotationSpeed,
      circles,
      armCount: packed.armCount,
      turns: packed.turns,
      direction: packed.direction,
      armPhase: packed.armPhase,
    };
  }

  function rebuild() {
    clusters.length = 0;
    const count = Math.max(1, Math.round(state.clusterCount));
    for (let i = 0; i < count; i += 1) {
      clusters.push(buildCluster(((i + 1) * 92837111) ^ (W * 73856093) ^ (H * 19349663), i));
    }
  }

  function getAudioEnergy() {
    if (!analyser || !freqData) return;

    analyser.getByteFrequencyData(freqData);
    let bass = 0;
    let treble = 0;
    const bassEnd = Math.max(4, Math.floor(freqData.length * 0.08));
    const trebleStart = Math.floor(freqData.length * 0.24);
    const trebleEnd = Math.floor(freqData.length * 0.7);

    for (let i = 0; i < bassEnd; i += 1) bass += freqData[i];
    for (let i = trebleStart; i < trebleEnd; i += 1) treble += freqData[i];

    bass /= bassEnd;
    treble /= Math.max(1, trebleEnd - trebleStart);

    smoothedBass += (bass - smoothedBass) * 0.08;
    smoothedTreble += (treble - smoothedTreble) * 0.08;

    pulseBoost += (((smoothedBass / 255) * 0.9) - pulseBoost) * 0.08;
    densityBoost += (((smoothedTreble / 255) * 0.9) - densityBoost) * 0.08;
    swayBoost += (((smoothedBass / 255) * 1.2) - swayBoost) * 0.08;
  }

  function drawBackground() {
    const palette = PALETTES[paletteIndex];
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, rgb(palette.bg, 1));
    bg.addColorStop(1, rgb([
      clamp(palette.bg[0] + 8, 0, 255),
      clamp(palette.bg[1] + 7, 0, 255),
      clamp(palette.bg[2] + 12, 0, 255),
    ], 1));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const haze = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, Math.max(W, H) * 0.8);
    haze.addColorStop(0, rgb(palette.haze, 0.16));
    haze.addColorStop(1, rgb(palette.haze, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCluster(cluster, now) {
    const palette = PALETTES[paletteIndex];
    const minDim = Math.min(W, H);
    const time = now - animationStart;
    const swirlPhase = time * 0.00008 * cluster.direction;

    const cx = (W * cluster.x)
      + Math.sin(time * 0.00013 * cluster.wobble + cluster.seed) * cluster.driftX * (0.55 + swayBoost * 0.9)
      + Math.cos(time * 0.00007 + cluster.seed * 0.6) * cluster.driftX * 0.18;

    const cy = (H * cluster.y)
      + Math.cos(time * 0.00011 * cluster.wobble + cluster.seed * 1.7) * cluster.driftY * (0.55 + swayBoost * 0.65)
      + Math.sin(time * 0.00009 + cluster.seed * 0.5) * cluster.driftY * 0.14;

    const baseR = cluster.baseRadius * (1 + Math.sin(time * 0.0002 + cluster.seed) * cluster.pulse * (1 + pulseBoost * 0.8));
    const rot = cluster.rotation + (time * cluster.rotationSpeed);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    const blobGradient = ctx.createRadialGradient(
      -baseR * 0.28,
      -baseR * 0.22,
      baseR * 0.08,
      0,
      0,
      baseR * cluster.blobScale
    );
    blobGradient.addColorStop(0, rgb(palette.accent, 0.22));
    blobGradient.addColorStop(0.24, rgb(palette.blobA, 0.93));
    blobGradient.addColorStop(0.82, rgb(palette.blobB, 0.92));
    blobGradient.addColorStop(1, rgb(palette.blobB, 0));

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = blobGradient;
    ctx.beginPath();
    ctx.arc(0, 0, baseR * cluster.blobScale, 0, Math.PI * 2);
    ctx.fill();

    const ringGradient = ctx.createRadialGradient(0, 0, baseR * 0.65, 0, 0, baseR * (cluster.blobScale + 0.1));
    ringGradient.addColorStop(0, rgb(palette.accent, 0));
    ringGradient.addColorStop(0.88, rgb(palette.accent, 0.06 + cluster.edgeSoftness * 0.18));
    ringGradient.addColorStop(1, rgb(palette.accent, 0));
    ctx.strokeStyle = ringGradient;
    ctx.lineWidth = Math.max(1, minDim * 0.0012);
    ctx.beginPath();
    ctx.arc(0, 0, baseR * (cluster.blobScale - 0.02), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < cluster.circles.length; i += 1) {
      const circle = cluster.circles[i];
      const localT = time * circle.speed * state.drift * (1 + pulseBoost * 0.4);
      const spiralDrift = swirlPhase * circle.orbit * (0.2 + circle.dist * 0.9);
      const angle = circle.theta + spiralDrift + Math.sin(localT + circle.seed) * 0.018 * (1 + swayBoost * 0.6);
      const radiusFromCentre = circle.dist * baseR + Math.sin(localT * 0.7 + circle.seed * 1.3) * baseR * 0.008 * (1 + circle.dist);
      const spinePull = Math.sin((angle * cluster.armCount) + (circle.dist * cluster.turns * Math.PI * 2) + localT * 0.45) * baseR * 0.012 * state.spiralStrength;

      const x = Math.cos(angle) * radiusFromCentre + Math.cos(angle + Math.PI / 2) * spinePull + Math.sin(localT * 0.41 + circle.seed) * circle.wx * (0.5 + swayBoost * 0.55);
      const y = Math.sin(angle) * radiusFromCentre + Math.sin(angle + Math.PI / 2) * spinePull + Math.cos(localT * 0.47 + circle.seed * 1.4) * circle.wy * (0.5 + swayBoost * 0.45);
      const radius = circle.r * (1 + Math.sin(localT * 1.2 + circle.seed) * (circle.pulse + pulseBoost * 0.012));

      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, radius), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgb(palette.accent, 0.025 + densityBoost * 0.08);
    ctx.lineWidth = Math.max(0.6, minDim * 0.00065);

    const highlightCount = Math.round(cluster.circles.length * (0.1 + densityBoost * 0.08));
    for (let i = 0; i < highlightCount; i += 1) {
      const circle = cluster.circles[(i * 9) % cluster.circles.length];
      const localT = time * circle.speed * state.drift;
      const spiralDrift = swirlPhase * circle.orbit * (0.2 + circle.dist * 0.9);
      const angle = circle.theta + spiralDrift;
      const radiusFromCentre = circle.dist * baseR;
      const x = Math.cos(angle) * radiusFromCentre;
      const y = Math.sin(angle) * radiusFromCentre;
      const radius = circle.r * (1 + Math.sin(localT * 1.2 + circle.seed) * circle.pulse);
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.84, circle.tilt - 0.7, circle.tilt + 0.45);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawGrain() {
    const palette = PALETTES[paletteIndex];
    const alpha = state.grain;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 80; i += 1) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() * 1.2;
      ctx.fillStyle = rgb(palette.accent, alpha * Math.random() * 0.35);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette() {
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.18, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, `rgba(0, 0, 0, ${state.vignette})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  function tick(now) {
    if (!paused) {
      const dt = Math.min(60, now - lastFrame);
      lastFrame = now;
      getAudioEnergy();
      pulseBoost *= 0.985;
      densityBoost *= 0.985;
      swayBoost *= 0.986;

      drawBackground();
      for (let i = 0; i < clusters.length; i += 1) drawCluster(clusters[i], now + (i * 1200));
      if (dt > 0) drawGrain();
      drawVignette();
      updateHud();
    }

    requestAnimationFrame(tick);
  }

  async function enableSound() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(micStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      freqData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      soundMode = true;
      setButtonState();
    } catch (error) {
      console.warn('Microphone access denied or unavailable', error);
      soundMode = false;
      analyser = null;
      freqData = null;
      setButtonState();
    }
  }

  function disableSound() {
    soundMode = false;
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    analyser = null;
    freqData = null;
    pulseBoost = 0;
    densityBoost = 0;
    swayBoost = 0;
    setButtonState();
  }

  function setButtonState() {
    const soundBtn = document.getElementById('toggleSound');
    const pauseBtn = document.getElementById('togglePause');
    const paletteBtn = document.getElementById('cyclePalette');
    if (soundBtn) soundBtn.textContent = soundMode ? 'Mic on' : 'Mic off';
    if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if (paletteBtn) paletteBtn.textContent = `Palette: ${PALETTES[paletteIndex].name}`;
  }

  function updateHud() {
    const info = document.getElementById('hudInfo');
    if (!info) return;
    info.textContent = `${clusters.length} clusters • ${clusters.reduce((sum, c) => sum + c.circles.length, 0)} cut-outs • ${PALETTES[paletteIndex].name}`;
  }

  function bindUI() {
    document.getElementById('togglePause')?.addEventListener('click', () => {
      paused = !paused;
      setButtonState();
    });

    document.getElementById('cyclePalette')?.addEventListener('click', () => {
      paletteIndex = (paletteIndex + 1) % PALETTES.length;
      setButtonState();
    });

    document.getElementById('regenerate')?.addEventListener('click', () => {
      rebuild();
    });

    document.getElementById('toggleSound')?.addEventListener('click', async () => {
      if (soundMode) disableSound();
      else await enableSound();
    });

    document.getElementById('motionRange')?.addEventListener('input', (e) => {
      state.motion = clamp(Number(e.target.value), 0, 2);
      rebuild();
    });

    document.getElementById('densityRange')?.addEventListener('input', (e) => {
      state.holeDensity = clamp(Number(e.target.value), 0.4, 1.4);
      rebuild();
    });

    document.getElementById('clusterRange')?.addEventListener('input', (e) => {
      state.clusterCount = clamp(Number(e.target.value), 1, 5);
      rebuild();
    });

    window.addEventListener('keydown', async (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        paused = !paused;
        setButtonState();
      }
      if (e.key.toLowerCase() === 'p') {
        paletteIndex = (paletteIndex + 1) % PALETTES.length;
        setButtonState();
      }
      if (e.key.toLowerCase() === 'r') rebuild();
      if (e.key.toLowerCase() === 'm') {
        if (soundMode) disableSound();
        else await enableSound();
      }
    });
  }

  bindUI();
  setButtonState();
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);
})();
