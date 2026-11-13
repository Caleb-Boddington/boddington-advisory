// Boddington Advisory, The Signet. One gold seal, four scenes, chosen by <body data-scene>:
//   hero      home page: seal centre-stage, turns to present the teasers as you scroll
//   services  seal in a side column, turns to present each service, guilloche rings open one per service
//   contact   the wax finale: seal presses into green wax, the impression carries the contact card
//   still     text pages: seal rests in the margin, drifts away as you read
// Everything is procedural: no models, no HDRIs, no network. Only ./vendor/three.module.min.js is imported.
import * as THREE from 'three';

const html = document.documentElement;
const canvas = document.getElementById('gl');
const hint = document.getElementById('hint');
const card = document.getElementById('card');
const scene_name = document.body.dataset.scene || 'still';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) html.classList.add('reduced');

// WebGL check: no WebGL means the plain page (same text, SVG mark).
const probe = document.createElement('canvas');
const hasGL = !!(canvas && (probe.getContext('webgl2') || probe.getContext('webgl')));
if (!hasGL) { html.classList.add('nogl'); }
else { window.__signetBooted = true; init().catch(err => { console.error(err); html.classList.add('nogl'); }); }

async function init() {
  const GOLD = 0xb8955a;
  const TAU = Math.PI * 2;

  // Renderer, scene, camera
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  // Procedural environment: softbox panels rendered into a PMREM so the gold has something to reflect.
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x0e2620);
    const panel = (color, w, h, pos, look) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(look); env.add(m);
    };
    const o = new THREE.Vector3();
    panel(0xfff3dd, 9, 4, new THREE.Vector3(0, 7, 2), o);
    panel(0xdbe8df, 3.5, 8, new THREE.Vector3(-8, 1.5, 3), o);
    panel(0xe3bf7c, 2.2, 9, new THREE.Vector3(8, 0.5, -1), o);
    panel(0xf6efe0, 5, 1.2, new THREE.Vector3(0, 0.6, 9), o);
    panel(0x071a15, 20, 20, new THREE.Vector3(0, -9, 0), o);
    env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x1a3a31, side: THREE.BackSide })));
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
  }

  // Lights: a key, a soft fill, and the glint that follows the pointer.
  const key = new THREE.DirectionalLight(0xfff4e2, 2.4); key.position.set(3, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9dccf, 0.6); fill.position.set(-5, 2, 3); scene.add(fill);
  const glint = new THREE.PointLight(0xffecc8, 28, 14, 2); glint.position.set(0, 1, 3.5); scene.add(glint);

  // Fonts for the engraving canvases
  await Promise.race([
    Promise.all([
      document.fonts.load('italic 600 100px "Libre Bodoni"'),
      document.fonts.load('italic 500 100px "Libre Bodoni"'),
      document.fonts.load('600 40px "Libre Bodoni"')
    ]),
    new Promise(r => setTimeout(r, 2500))
  ]);

  // Engraving: the BA seal drawn once on canvas, used as height (bump), colour and roughness.
  // Coordinates follow the letterhead seal's 300-unit viewBox so the mark matches.
  function drawSeal(ctx, S, opts) {
    const k = S / 300, cx = 150 * k, cy = 150 * k;
    const { base, line, text, hatch, mono } = opts;
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    ctx.lineCap = 'round';
    const circle = (r, w, style) => { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, TAU); ctx.lineWidth = w * k; ctx.strokeStyle = style; ctx.stroke(); };
    circle(139, 1.6, line); circle(133, 0.8, line); circle(104, 0.9, line); circle(97, 2.2, line);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 95 * k, 0, TAU); ctx.arc(cx, cy, 80 * k, 0, TAU, true); ctx.clip();
    ctx.strokeStyle = hatch; ctx.lineWidth = 0.6 * k;
    for (let d = -S; d < 2 * S; d += 3.2 * k) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + S, S); ctx.stroke(); }
    ctx.restore();
    circle(80, 1.2, line);
    const arc = (str, r, startDeg, letterDeg, flip) => {
      ctx.save(); ctx.translate(cx, cy);
      ctx.font = `600 ${13.5 * k}px "Libre Bodoni", Didot, Georgia, serif`;
      ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const n = str.length, total = letterDeg * (n - 1);
      for (let i = 0; i < n; i++) {
        const a = (startDeg + (flip ? total - i * letterDeg : i * letterDeg)) * Math.PI / 180;
        ctx.save(); ctx.rotate(a); ctx.translate(0, -r * k); ctx.rotate(flip ? Math.PI : 0);
        ctx.fillText(str[i], 0, 0); ctx.restore();
      }
      ctx.restore();
    };
    arc('BODDINGTON · ADVISORY', 118, -74, 7.4, false);
    arc('EST · 2026 · SURREY', 123, 180 - 52.5, 6.2, true);
    ctx.fillStyle = text;
    [[30, 150], [270, 150]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.moveTo(x * k, (y - 4) * k); ctx.lineTo((x + 4) * k, y * k); ctx.lineTo(x * k, (y + 4) * k); ctx.lineTo((x - 4) * k, y * k); ctx.closePath(); ctx.fill();
    });
    ctx.strokeStyle = line; ctx.lineWidth = 1.1 * k;
    const seg = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1 * k, y1 * k); ctx.lineTo(x2 * k, y2 * k); ctx.stroke(); };
    seg(70, 150, 78, 150); seg(230, 150, 222, 150); seg(150, 70, 150, 78); seg(150, 230, 150, 222);
    seg(86, 118, 98, 130); seg(98, 130, 108, 130); seg(214, 182, 202, 170); seg(202, 170, 192, 170);
    ctx.beginPath(); ctx.arc(86 * k, 118 * k, 2.6 * k, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(214 * k, 182 * k, 2.6 * k, 0, TAU); ctx.fill();
    const sx = 0.8, ox = 70, oy = 70;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = mono;
    ctx.font = `italic 600 ${132 * sx * k}px "Libre Bodoni", Didot, Georgia, serif`;
    ctx.fillText('B', (ox + 86 * sx) * k, (oy + 140 * sx) * k);
    ctx.font = `italic 500 ${104 * sx * k}px "Libre Bodoni", Didot, Georgia, serif`;
    ctx.lineWidth = 5 * sx * k; ctx.strokeStyle = base; ctx.lineJoin = 'round';
    ctx.strokeText('A', (ox + 122 * sx) * k, (oy + 150 * sx) * k);
    ctx.fillText('A', (ox + 122 * sx) * k, (oy + 150 * sx) * k);
  }
  function makeCanvas(S) { const c = document.createElement('canvas'); c.width = c.height = S; return c; }
  const S = 1024;
  const hC = makeCanvas(S); drawSeal(hC.getContext('2d'), S, { base: '#9a9a9a', line: '#1a1a1a', text: '#0a0a0a', hatch: '#454545', mono: '#000000' });
  const hB = makeCanvas(S), hBX = hB.getContext('2d'); hBX.filter = 'blur(1.6px)'; hBX.drawImage(hC, 0, 0);
  const cC = makeCanvas(S); drawSeal(cC.getContext('2d'), S, { base: '#d1aa68', line: '#6a4d22', text: '#5a4119', hatch: '#9c7b41', mono: '#4a3414' });
  const rC = makeCanvas(S); drawSeal(rC.getContext('2d'), S, { base: '#262626', line: '#8a8a8a', text: '#909090', hatch: '#606060', mono: '#9a9a9a' });
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const bumpTex = new THREE.CanvasTexture(hB); bumpTex.anisotropy = aniso;
  const colorTex = new THREE.CanvasTexture(cC); colorTex.colorSpace = THREE.SRGBColorSpace; colorTex.anisotropy = aniso;
  const roughTex = new THREE.CanvasTexture(rC); roughTex.anisotropy = aniso;

  // The seal: a lathe body plus a flat engraved face.
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xd1aa68, metalness: 1, roughness: 0.24, envMapIntensity: 1.25, reflectivity: 1 });
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: colorTex, metalness: 1, roughness: 1, roughnessMap: roughTex,
    bumpMap: bumpTex, bumpScale: 0.035, envMapIntensity: 1.3
  });
  const rawProfile = [
    [1.0, 0.0], [1.0, 0.2], [0.97, 0.3], [0.86, 0.38], [0.62, 0.48], [0.4, 0.62], [0.3, 0.82],
    [0.29, 1.02], [0.36, 1.26], [0.46, 1.5], [0.5, 1.74], [0.46, 1.98], [0.34, 2.17], [0.16, 2.28], [0.0, 2.3]
  ];
  const spline = new THREE.CatmullRomCurve3(rawProfile.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal', 0.5);
  const pts = spline.getSpacedPoints(90).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].set(1.0, 0); pts[pts.length - 1].set(0, 2.3);
  const profile = [new THREE.Vector2(0.95, 0), new THREE.Vector2(0.995, 0.035), ...pts.filter(p => p.y > 0.07)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), goldMat);
  const faceGeo = new THREE.CircleGeometry(0.952, 128); faceGeo.rotateX(Math.PI / 2);
  const face = new THREE.Mesh(faceGeo, faceMat); face.position.y = 0.0005;
  const sealBody = new THREE.Group(); sealBody.add(body, face); sealBody.rotation.x = -Math.PI / 2;
  const sealTilt = new THREE.Group(); sealTilt.add(sealBody);
  const sealPivot = new THREE.Group(); sealPivot.add(sealTilt);
  scene.add(sealPivot);

  // Guilloche: engraved rosettes in gold line-work, sets that open as you read.
  function rosette(R, n, amp, phase, m, amp2) {
    const N = 720, arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU;
      const r = R * (1 + amp * Math.sin(n * a + phase) + (amp2 || 0) * Math.sin((m || 1) * a));
      arr[i * 3] = Math.cos(a) * r; arr[i * 3 + 1] = Math.sin(a) * r; arr[i * 3 + 2] = 0;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return g;
  }
  const ringSpecs = [
    [[1.35, 24, 0.025, 0, 3, 0.01], [1.42, 24, 0.025, Math.PI, 3, 0.01], [1.6, 0, 0, 0], [1.75, 36, 0.012, 0], [1.78, 36, 0.012, Math.PI]],
    [[2.1, 0, 0, 0], [2.3, 18, 0.04, 0, 5, 0.012], [2.3, 18, 0.04, Math.PI, 5, 0.012], [2.55, 48, 0.008, 0], [2.62, 0, 0, 0]],
    [[2.95, 0, 0, 0], [3.2, 30, 0.03, 0, 7, 0.015], [3.2, 30, 0.03, Math.PI, 7, 0.015], [3.5, 60, 0.006, 0], [3.56, 0, 0, 0]],
    [[3.9, 0, 0, 0], [4.15, 42, 0.02, 0, 9, 0.012], [4.15, 42, 0.02, Math.PI, 9, 0.012], [4.45, 72, 0.005, 0]]
  ];
  const ringSets = ringSpecs.map((set, i) => {
    const g = new THREE.Group();
    set.forEach((s, j) => {
      const mat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false });
      const l = new THREE.LineLoop(rosette(...s), mat); l.userData.base = j % 2 ? 0.28 : 0.42; g.add(l);
    });
    g.position.z = -0.9 - i * 0.25; g.scale.setScalar(0.001); g.visible = false;
    scene.add(g); return g;
  });
  const pulseMat = new THREE.LineBasicMaterial({ color: 0xe6c88a, transparent: true, opacity: 0, depthWrite: false });
  const pulse = new THREE.LineLoop(rosette(1.0, 40, 0.012, 0), pulseMat); pulse.visible = false; scene.add(pulse);

  // The wax (contact page only): a soft-edged disc of racing-green wax the seal presses into.
  const waxTop = 0.15;
  let wax = null, impMat = null;
  if (scene_name === 'contact') {
    const waxShape = new THREE.Shape();
    for (let i = 0; i <= 160; i++) {
      const a = i / 160 * TAU, r = 1.62 + 0.05 * Math.sin(3 * a + 0.4) + 0.035 * Math.sin(7 * a + 2.1) + 0.02 * Math.sin(11 * a);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? waxShape.lineTo(x, y) : waxShape.moveTo(x, y);
    }
    const waxGeo = new THREE.ExtrudeGeometry(waxShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.08, bevelSegments: 6, curveSegments: 8 });
    const waxMat = new THREE.MeshPhysicalMaterial({ color: 0x0f2b24, roughness: 0.28, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
    const wC = makeCanvas(S); drawSeal(wC.getContext('2d'), S, { base: '#0b2119', line: '#1e4d3f', text: '#1e4d3f', hatch: '#143a2f', mono: '#245a49' });
    const waxTex = new THREE.CanvasTexture(wC); waxTex.colorSpace = THREE.SRGBColorSpace;
    impMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, map: waxTex, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.1,
      bumpMap: bumpTex, bumpScale: 0.0, transparent: true, opacity: 0
    });
    const imp = new THREE.Mesh(new THREE.CircleGeometry(0.98, 96), impMat); imp.position.z = 0.1 + 0.05 + 0.0015;
    wax = new THREE.Group(); wax.add(new THREE.Mesh(waxGeo, waxMat), imp); wax.rotation.x = -Math.PI / 2; wax.visible = false;
    scene.add(wax);
  }

  // Keyframes. Each scene lists keys as [chapter id, position within it (0..1), params]; 'contact' is driven by a
  // 0..1 press value instead of scroll. Chapters are the page's [data-chapter] sections.
  const chapters = {};
  document.querySelectorAll('[data-chapter]').forEach(el => chapters[el.dataset.chapter] = el);
  const P = (o) => Object.assign({
    sx: 0, sy: 0.5, sz: 0, yaw: 0, pitch: 0, roll: 0, scale: 1,
    cx: 0, cy: 0.5, cz: 6.4, lx: 0, ly: 0.4, lz: 0,
    ring: 0, waxY: -3.5, press: 0, lift: 1, reveal: 0, side: 0
  }, o);
  const SIDE = (yaw, pitch, ring, extra) => P(Object.assign({ sx: 2.35, sy: 0.25, yaw, pitch, scale: 0.86, cx: 0.5, cy: 0.45, cz: 6.4, lx: 0.85, ly: 0.15, ring }, extra || {}));
  let TEMPLATE;
  if (scene_name === 'hero') {
    TEMPLATE = [
      ['hero', 0, P({ sy: 1.05, cy: 0.5, cz: 7.0, ly: 0.35 })],
      ['services', 0, P({ sx: 1.85, sy: 0.15, yaw: 0.8, pitch: -0.08, roll: 0.08, cx: 0.35, cy: 0.35, cz: 6.3, lx: 0.55, ly: 0.15, ring: 1 })],
      ['about', 0, P({ sx: -1.85, sy: 0.15, yaw: -0.8, pitch: 0.1, roll: -0.08, cx: -0.35, cy: 0.35, cz: 6.1, lx: -0.55, ly: 0.15, ring: 2 })],
      ['contact', 0, P({ sx: 2.95, sy: 0.9, yaw: 0.55, pitch: -0.1, scale: 0.76, cx: 0.3, cy: 0.4, cz: 6.4, lx: 0.5, ly: 0.15, ring: 3 })]
    ];
  } else if (scene_name === 'services') {
    const ids = Object.keys(chapters);
    const poses = [[-0.45, 0.05, 0], [-0.9, -0.1, 1], [-0.3, 0.14, 2], [-1.0, -0.16, 3], [-0.55, 0.18, 4]];
    TEMPLATE = ids.map((id, i) => { const p = poses[Math.min(i, poses.length - 1)]; return [id, 0, SIDE(p[0], p[1], p[2])]; });
  } else if (scene_name === 'contact') {
    TEMPLATE = [
      ['contact', 0, P({ sx: 0, sy: 2.0, sz: 0, yaw: 0, pitch: Math.PI / 2, scale: 1, cx: 0, cy: 3.8, cz: 6.8, lx: 0, ly: 0.1, ring: 3, waxY: -0.5, press: 0, lift: 0 })],
      ['contact', 0.42, P({ sx: 0, sy: -0.5 + waxTop + 0.005, yaw: 0, pitch: Math.PI / 2, cx: 0, cy: 4.0, cz: 6.4, lx: 0, ly: -0.1, ring: 3, waxY: -0.5, press: 1, lift: 0 })],
      ['contact', 0.56, P({ sx: 0, sy: -0.5 + waxTop + 0.005, yaw: 0, pitch: Math.PI / 2, cx: 0, cy: 4.1, cz: 6.3, lx: 0, ly: -0.1, ring: 3, waxY: -0.5, press: 1, lift: 0 })],
      ['contact', 1, P({ sx: 0, sy: 0.3, sz: -0.2, yaw: 0, pitch: Math.PI / 2 - 0.35, roll: 0, side: 1, cx: 0, cy: 4.6, cz: 6.0, lx: 0, ly: -0.7, ring: 3, waxY: -0.5, press: 1, lift: 0, reveal: 1 })]
    ];
  } else {
    const first = Object.keys(chapters)[0] || 'main';
    TEMPLATE = [[first, 0, SIDE(-0.42, 0.08, 1, { sx: 2.4, scale: 0.72, sy: 0.4 })]];
  }
  let keys = [];
  function buildKeys() {
    const vh = window.innerHeight;
    if (scene_name === 'contact') { keys = TEMPLATE.map(([, at, p]) => ({ s: at, p })); return; }
    keys = TEMPLATE.map(([id, at, p]) => {
      const el = chapters[id]; const top = el ? el.offsetTop : 0, h = el ? el.offsetHeight : vh;
      return { s: top + at * Math.max(0, h - vh), p };
    }).sort((a, b) => a.s - b.s);
  }
  const smooth = t => t * t * (3 - 2 * t);
  const cur = P({});
  function sampleKeys(v) {
    if (v <= keys[0].s) { Object.assign(cur, keys[0].p); return; }
    const last = keys[keys.length - 1];
    if (v >= last.s) { Object.assign(cur, last.p); return; }
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (v >= a.s && v <= b.s) {
        const t = smooth((v - a.s) / Math.max(1e-6, b.s - a.s));
        for (const k in cur) cur[k] = a.p[k] + (b.p[k] - a.p[k]) * t;
        return;
      }
    }
  }

  // Interaction state
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false, lastX: 0, lastY: 0, moved: 0, id: null };
  let userYaw = 0, userPitch = 0, spinVel = 0, pitchVel = 0;
  const stamp = { t: 2, kick: 0 };
  let scrollSmooth = window.scrollY, aspect = 1, phone = 0, pressU = 0;

  canvas.addEventListener('pointerdown', e => {
    pointer.down = true; pointer.id = e.pointerId; pointer.lastX = e.clientX; pointer.lastY = e.clientY; pointer.moved = 0;
    canvas.classList.add('dragging'); spinVel = 0; pitchVel = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  const endDrag = e => {
    if (!pointer.down) return;
    pointer.down = false; canvas.classList.remove('dragging');
    if (pointer.moved < 6 && e.type === 'pointerup') doStamp();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointermove', e => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    if (pointer.down && e.pointerId === pointer.id) {
      const dx = e.clientX - pointer.lastX, dy = e.clientY - pointer.lastY;
      pointer.moved += Math.abs(dx) + Math.abs(dy);
      pointer.lastX = e.clientX; pointer.lastY = e.clientY;
      const k = 0.0085;
      userYaw += dx * k; userPitch += dy * k * 0.6;
      spinVel = spinVel * 0.5 + dx * k * 0.5; pitchVel = pitchVel * 0.5 + dy * k * 0.3;
    }
  }, { passive: true });
  function doStamp() { if (reduced) return; if (stamp.t < 0.45) return; stamp.t = 0; }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    aspect = w / h; phone = aspect < 1 ? 1 : 0;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? Math.min(60, 35 / Math.max(aspect, 0.42) * 0.72) : 35;
    camera.updateProjectionMatrix();
    buildKeys();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', buildKeys);
  resize();

  const clock = new THREE.Clock();
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _look = new THREE.Vector3(), _camBase = new THREE.Vector3();
  let hintGone = false;
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if (hint && matchMedia('(pointer: coarse)').matches) hint.innerHTML = 'Drag to turn &nbsp;·&nbsp; Scroll to read &nbsp;·&nbsp; Tap to stamp';
  // keyboard: the contact buttons are reachable from the top; focusing them jumps the scene to the end
  let forceEnd = false;
  if (card) card.addEventListener('focusin', () => { forceEnd = true; });

  function frame() {
    const realDt = clock.getDelta(), dt = Math.min(0.05, realDt), t = clock.elapsedTime;
    const ease = 1 - Math.exp(-dt * 7);

    // scroll (or, on the contact page, the press that plays by itself)
    const sy = window.scrollY;
    scrollSmooth += (sy - scrollSmooth) * (reduced ? 1 : 1 - Math.exp(-realDt * 6));
    if (scene_name === 'contact') {
      pressU = (reduced || forceEnd) ? 1 : Math.min(1, Math.max(0, (t - 0.8) / 3.4));
      sampleKeys(smooth(pressU));
    } else sampleKeys(scrollSmooth);
    const vh = window.innerHeight;
    for (const el of reveals) { const r = el.getBoundingClientRect(); if (r.top < vh * 0.9 && r.bottom > 0) { el.classList.add('in'); } }
    if (hint && !hintGone && sy > 40) { hintGone = true; hint.classList.add('gone'); }

    // pointer tilt + glint
    pointer.x += (pointer.tx - pointer.x) * ease; pointer.y += (pointer.ty - pointer.y) * ease;
    glint.position.set(pointer.x * 3.2 + cur.sx * 0.5, pointer.y * 2.4 + 1.2, 3.2);
    glint.intensity = 22 + 10 * (0.5 + 0.5 * Math.sin(t * 0.7));

    // drag inertia, then settle back to face front
    if (!pointer.down) {
      userYaw += spinVel; userPitch += pitchVel;
      spinVel *= Math.pow(0.08, dt); pitchVel *= Math.pow(0.02, dt);
      const nearest = Math.round(userYaw / TAU) * TAU;
      userYaw += (nearest - userYaw) * (1 - Math.exp(-dt * 0.9)) * (Math.abs(spinVel) < 0.02 ? 1 : 0);
      userPitch += (0 - userPitch) * (1 - Math.exp(-dt * 2.2));
    }

    // stamp: a quick press along the face normal, a camera kick, a pulse of line-work
    let press = 0;
    if (stamp.t < 2) {
      stamp.t += dt;
      const u = stamp.t;
      if (u < 0.16) press = Math.pow(u / 0.16, 2);
      else if (u < 0.75) { const w = (u - 0.16) / 0.59; press = 1 - smooth(w); }
      if (u >= 0.16 && u - dt < 0.16) stamp.kick = 1;
      pulse.visible = u > 0.14 && u < 1.1;
      if (pulse.visible) { const w = (u - 0.14) / 0.96; pulse.scale.setScalar(1 + w * 2.2); pulseMat.opacity = (1 - w) * 0.55; }
    } else pulse.visible = false;
    stamp.kick *= Math.pow(0.004, dt);

    // seal placement
    const inWax = cur.press;
    const idleBob = reduced ? 0 : Math.sin(t * 0.9) * 0.05 * (1 - inWax);
    const idleYaw = reduced ? 0 : Math.sin(t * 0.35) * 0.06 * (1 - inWax);
    const xScale = phone ? 0.22 : 1;
    // text pages: the seal drifts up and away as you read on
    const drift = scene_name === 'still' ? scrollSmooth * 0.0035 : 0;
    const driftYaw = scene_name === 'still' ? scrollSmooth * 0.0012 : 0;
    sealPivot.position.set(cur.sx * xScale, cur.sy + idleBob + drift + cur.side * (phone ? 1.9 : 4.2), cur.sz - cur.side * (phone ? 0.7 : 0.8));
    sealPivot.scale.setScalar(cur.scale * (phone ? 0.82 : 1));
    sealPivot.rotation.set(cur.pitch + userPitch * (1 - inWax), cur.yaw + idleYaw + driftYaw + userYaw * (1 - inWax), cur.roll);
    sealTilt.rotation.set(-pointer.y * 0.16 * (1 - inWax), pointer.x * 0.22 * (1 - inWax), 0);
    sealTilt.getWorldQuaternion(_q); _v.set(0, 0, 1).applyQuaternion(_q);
    sealPivot.position.addScaledVector(_v, press * (inWax > 0.9 ? 0.05 : 0.5));

    // wax
    if (wax) {
      wax.visible = cur.waxY > -3;
      wax.position.set(0, cur.waxY, 0);
      const squash = inWax > 0.9 ? press * 0.035 : 0;
      wax.scale.set(1 + squash, 1 + squash, 1 - squash * 2);
      const impression = Math.max(0, (inWax - 0.45) / 0.55);
      impMat.opacity = impression;
      impMat.bumpScale = -0.06 * impression - press * 0.01 * (inWax > 0.9 ? 1 : 0);
    }
    if (card) {
      const cardOn = cur.reveal > 0.35;
      if (card.classList.contains('on') !== cardOn) card.classList.toggle('on', cardOn);
    }

    // guilloche rings open one set per chapter and drift slowly
    ringSets.forEach((g, i) => {
      const open = Math.max(0, Math.min(1, cur.ring - i));
      g.visible = open > 0.001;
      if (!g.visible) return;
      g.scale.setScalar(0.2 + 0.8 * smooth(open));
      g.position.x = sealPivot.position.x * (1 - inWax); g.position.y = (sealPivot.position.y - drift) * (1 - inWax) + inWax * -0.2;
      g.rotation.z = (i % 2 ? -1 : 1) * t * 0.03 * (reduced ? 0 : 1);
      const fade = Math.max(0, 1 - drift * 0.45);
      g.children.forEach(l => { l.material.opacity = l.userData.base * smooth(open) * (1 - inWax * 0.7) * fade; });
    });
    pulse.position.copy(sealPivot.position); pulse.quaternion.copy(_q);

    // camera: keyframed, pushed back on phones for the wax, kicked by the stamp
    _look.set(cur.lx * xScale, cur.ly - cur.lift * phone * 1.1, cur.lz);
    _camBase.set(cur.cx * xScale, cur.cy, cur.cz);
    if (phone) { const d = 1 + (1 - cur.lift) * 0.7; _camBase.sub(_look).multiplyScalar(d).add(_look); }
    camera.position.copy(_camBase);
    camera.position.z += stamp.kick * 0.12; camera.position.y -= stamp.kick * 0.03;
    camera.lookAt(_look);
    camera.rotation.z += stamp.kick * 0.012;

    renderer.render(scene, camera);
  }

  canvas.classList.add('on');
  if (reduced) {
    // Calm fallback: a still frame, redrawn on scroll and resize only.
    const still = () => { frame(); };
    still(); window.addEventListener('scroll', still, { passive: true }); window.addEventListener('resize', still);
    window.addEventListener('load', still);
    return;
  }
  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });
  function loop() { if (!running) return; frame(); requestAnimationFrame(loop); }
  loop();
}
