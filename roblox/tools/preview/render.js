// 미리보기 렌더러: build/map.json(게임과 같은 맵 데이터)을 three.js로 그린다.
// Roblox 화면 그 자체는 아니고, 같은 파트·색·재질·조명을 비슷하게 흉내 낸 것.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const DEG = Math.PI / 180;
const W = 1600, H = 900;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.3, 4000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ───────── 재질 텍스처 (캔버스로 절차 생성) ─────────
function canvasTex(size, draw, scale) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.scale = scale;
  return t;
}
let rs = 7;
const rr = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
function speckle(g, s, n, a, b, sz = 1) {
  for (let i = 0; i < n; i++) {
    const v = a + rr() * (b - a);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rr() * s, rr() * s, sz, sz);
  }
}
const TEX = {
  Concrete: canvasTex(256, (g, s) => { g.fillStyle = '#ececec'; g.fillRect(0, 0, s, s); speckle(g, s, 9000, 205, 255, 2); }, 14),
  Brick: canvasTex(256, (g, s) => {
    g.fillStyle = '#d8d0c8'; g.fillRect(0, 0, s, s);
    const bh = s / 8, bw = s / 4;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
      const v = 200 + rr() * 55;
      g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.95})`;
      g.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6);
    }
  }, 6),
  WoodPlanks: canvasTex(256, (g, s) => {
    for (let i = 0; i < 8; i++) {
      const v = 200 + rr() * 55;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, i * s / 8, s, s / 8);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, i * s / 8, s, 2);
      g.fillRect(((i * 97) % 5) * s / 5, i * s / 8, 2, s / 8);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, i * s / 8 + rr() * s / 8, s, 1); }
    }
  }, 9),
  Wood: canvasTex(256, (g, s) => { g.fillStyle = '#eee'; g.fillRect(0, 0, s, s); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + rr() * 0.08})`; g.fillRect(0, rr() * s, s, 1 + rr() * 2); } }, 5),
  Grass: canvasTex(256, (g, s) => { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s); speckle(g, s, 14000, 150, 255, 2); }, 10),
  LeafyGrass: canvasTex(256, (g, s) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, s, s); speckle(g, s, 6000, 120, 255, 4); }, 6),
  Asphalt: canvasTex(256, (g, s) => { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, s, s); speckle(g, s, 16000, 150, 255, 1); }, 6),
  Pavement: canvasTex(256, (g, s) => { g.fillStyle = '#efefef'; g.fillRect(0, 0, s, s); speckle(g, s, 5000, 210, 255, 2); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) { g.fillRect(0, i * s / 4, s, 2); g.fillRect(i * s / 4, 0, 2, s); } }, 10),
  Marble: canvasTex(256, (g, s) => { g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, s, s); speckle(g, s, 5000, 200, 255, 3); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 4; i++) { g.fillRect(0, i * s / 4, s, 1); g.fillRect(i * s / 4, 0, 1, s); } }, 8),
  Ground: canvasTex(256, (g, s) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s); speckle(g, s, 12000, 170, 255, 2); }, 12),
  Granite: canvasTex(256, (g, s) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s, s); speckle(g, s, 9000, 140, 255, 2); }, 6),
  Fabric: canvasTex(128, (g, s) => { g.fillStyle = '#eee'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < s; i += 3) { g.fillRect(0, i, s, 1); g.fillRect(i, 0, 1, s); } }, 3),
  Metal: canvasTex(256, (g, s) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, s, s); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${rr() * 0.07})`; g.fillRect(0, rr() * s, s, 1); } }, 6),
  Slate: canvasTex(256, (g, s) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s, s); speckle(g, s, 6000, 190, 255, 3); }, 8),
  DiamondPlate: canvasTex(128, (g, s) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, s, s); g.fillStyle = '#fff'; for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) g.fillRect(x + ((y / 16) % 2) * 8, y, 6, 2); }, 3),
};
TEX.Plastic = null; TEX.SmoothPlastic = null;
const ROUGH = { SmoothPlastic: 0.45, Plastic: 0.6, Metal: 0.45, Glass: 0.05, Foil: 0.2, DiamondPlate: 0.4, Marble: 0.35 };
const METAL = { Metal: 0.55, Foil: 0.8, DiamondPlate: 0.6 };

// ───────── 지오메트리 ─────────
const geoCache = {};
function baseGeo(shape) {
  if (geoCache[shape]) return geoCache[shape];
  let g;
  if (shape === 1) g = new THREE.SphereGeometry(0.5, 20, 14);
  else if (shape === 2) { g = new THREE.CylinderGeometry(0.5, 0.5, 1, 24); g.rotateZ(Math.PI / 2); }
  else g = new THREE.BoxGeometry(1, 1, 1);
  g = g.toNonIndexed();
  return (geoCache[shape] = g);
}
function partMatrix(p) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.r[0] * DEG, p.r[1] * DEG, p.r[2] * DEG, 'XYZ'));
  m.compose(new THREE.Vector3(...p.p), q, new THREE.Vector3(1, 1, 1));
  return m;
}
function partGeometry(p) {
  const g = baseGeo(p.sh).clone();
  let s = p.s;
  if (p.sh === 1) { const d = Math.min(...s); s = [d, d, d]; }
  if (p.sh === 2) { const d = Math.min(s[1], s[2]); s = [s[0], d, d]; }
  g.scale(s[0], s[1], s[2]);
  g.applyMatrix4(partMatrix(p));
  // 월드 좌표 기반 UV (박스 매핑)
  const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
  const uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const c = p.color;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; }
    else if (ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; }
    else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function makeMaterial(mat, t) {
  if (mat === 'Neon') return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: t > 0, opacity: 1 - t * 0.5 });
  const tex = TEX[mat];
  let map = null;
  if (tex) { map = tex.clone(); map.needsUpdate = true; map.repeat.set(1 / tex.userData.scale, 1 / tex.userData.scale); }
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, map, roughness: ROUGH[mat] ?? 0.85, metalness: METAL[mat] ?? 0.0,
    transparent: t > 0, opacity: 1 - t, depthWrite: t < 0.3,
  });
  if (mat === 'Glass') { m.roughness = 0.05; m.metalness = 0.3; m.envMapIntensity = 1; }
  return m;
}

// ───────── 데이터 로드 ─────────
const data = await (await fetch('/map.json')).json();
const toColor = (i) => { const [r, g, b] = data.colors[i]; return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); };
const P = data.parts.map((a) => ({
  g: a[0], name: a[1], s: [a[2], a[3], a[4]], p: [a[5], a[6], a[7]], r: [a[8], a[9], a[10]],
  color: toColor(a[11]), mat: data.mats[a[12]], t: a[13], sh: a[14], flags: a[15],
}));
const groupPath = data.groups;
const tagsOf = {};
data.tags.forEach(([i, t]) => (tagsOf[t] = tagsOf[t] || []).push(i));
window.__P = P;

// 따로 움직일 그룹 (차, 정문, 동상)
const MOVABLE = ['School/IntroCar', 'School/Gate/MainGate'];
const movableOf = (gi) => MOVABLE.find((m) => groupPath[gi] === m || groupPath[gi].startsWith(m + '/'));
const buckets = {};
P.forEach((p, i) => {
  if (p.flags & 8) return;
  if (p.t >= 0.99) return;
  const mv = movableOf(p.g) || '';
  const key = `${mv}|${p.mat}|${Math.round(p.t * 20)}`;
  (buckets[key] = buckets[key] || []).push(i);
});
const movRoots = {};
MOVABLE.forEach((m) => { const o = new THREE.Group(); o.name = m; scene.add(o); movRoots[m] = o; });
for (const key in buckets) {
  const [mv, mat, tq] = key.split('|');
  const t = +tq / 20;
  const ids = buckets[key];
  for (let k = 0; k < ids.length; k += 4000) {
    const geo = mergeGeometries(ids.slice(k, k + 4000).map((i) => partGeometry(P[i])));
    const mesh = new THREE.Mesh(geo, makeMaterial(mat, t));
    mesh.castShadow = mat !== 'Glass' && mat !== 'Neon' && t < 0.5;
    mesh.receiveShadow = true;
    if (t > 0) mesh.renderOrder = 2;
    (mv ? movRoots[mv] : scene).add(mesh);
  }
}

// ───────── SurfaceGui 글씨 ─────────
const FONT = { GothamBlack: '900 X KRB', GothamBold: '700 X KR', Merriweather: '700 X KR', PatrickHand: '400 X KR', Arial: '400 X KR' };
await document.fonts.load('700 20px KR', '가');
await document.fonts.load('900 20px KRB', '가');
await document.fonts.load('400 20px KR', '가');
function faceInfo(face, s) {
  // [폭, 높이, 로컬 위치, 회전]
  switch (face) {
    case 'Front': return [s[0], s[1], [0, 0, -s[2] / 2 - 0.02], [0, Math.PI, 0]];
    case 'Back': return [s[0], s[1], [0, 0, s[2] / 2 + 0.02], [0, 0, 0]];
    case 'Left': return [s[2], s[1], [-s[0] / 2 - 0.02, 0, 0], [0, -Math.PI / 2, 0]];
    case 'Right': return [s[2], s[1], [s[0] / 2 + 0.02, 0, 0], [0, Math.PI / 2, 0]];
    case 'Top': return [s[0], s[2], [0, s[1] / 2 + 0.02, 0], [-Math.PI / 2, 0, 0]];
    default: return [s[0], s[2], [0, -s[1] / 2 - 0.02, 0], [Math.PI / 2, 0, 0]];
  }
}
const textMeshes = [];
function drawText(rec) {
  const [pi, face, text, tc, bc, bgT, font, lit, align, pps] = rec;
  const p = P[pi];
  const [fw, fh, lp, lr] = faceInfo(face, p.s);
  const scale = Math.min(pps, 1400 / Math.max(fw, fh));
  const cw = Math.max(8, Math.round(fw * scale)), ch = Math.max(8, Math.round(fh * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  const col = (i, a = 1) => `rgba(${data.colors[i].join(',')},${a})`;
  if (bgT < 1) { g.fillStyle = col(bc, 1 - bgT); g.fillRect(0, 0, cw, ch); }
  const fam = FONT[font] || '700 X KR';
  const lines0 = String(text).split('\n');
  let best = null;
  for (let size = Math.floor(ch * 0.9); size >= 6; size -= Math.max(1, Math.floor(size / 20))) {
    g.font = fam.replace('X', size + 'px');
    const lines = [];
    lines0.forEach((ln) => {
      let curL = '';
      for (const word of ln.split(' ')) {
        const tryL = curL ? curL + ' ' + word : word;
        if (g.measureText(tryL).width > cw * 0.94 && curL) { lines.push(curL); curL = word; } else curL = tryL;
      }
      lines.push(curL);
    });
    const ok = lines.every((l) => g.measureText(l).width <= cw * 0.96) && lines.length * size * 1.22 <= ch * 0.94;
    if (ok) { best = { size, lines }; break; }
  }
  if (best) {
    g.font = fam.replace('X', best.size + 'px');
    g.fillStyle = col(tc);
    g.textBaseline = 'middle';
    g.textAlign = align === 'Left' ? 'left' : 'center';
    const lh = best.size * 1.22, y0 = ch / 2 - (best.lines.length * lh) / 2 + lh / 2;
    best.lines.forEach((l, i) => g.fillText(l, align === 'Left' ? cw * 0.03 : cw / 2, y0 + i * lh));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = lit >= 1 ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8 })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  if (lit > 0 && lit < 1) mat.color.setScalar(0.45 + lit * 0.4);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat);
  mesh.position.set(...lp);
  mesh.rotation.set(...lr);
  const holder = new THREE.Group();
  holder.applyMatrix4(partMatrix(p));
  holder.add(mesh);
  const mv = movableOf(p.g);
  (mv ? movRoots[mv] : scene).add(holder);
  textMeshes.push({ pi, mesh, canvas: c, rec });
}
data.texts.forEach(drawText);
window.setText = (tag, text) => {
  (tagsOf[tag] || []).forEach((pi) => {
    const tm = textMeshes.find((x) => x.pi === pi);
    if (!tm) return;
    tm.mesh.parent.parent.remove(tm.mesh.parent);
    const rec = [...tm.rec]; rec[2] = text;
    drawText(rec);
  });
};

// ───────── 조명 데이터 ─────────
const lightDefs = data.lights.map(([pi, type, range, bright, colI, en, face, angle, shadows]) => {
  const p = P[pi];
  const m = partMatrix(p);
  const dirLocal = { Front: [0, 0, -1], Back: [0, 0, 1], Left: [-1, 0, 0], Right: [1, 0, 0], Top: [0, 1, 0], Bottom: [0, -1, 0] }[face] || [0, -1, 0];
  const dir = new THREE.Vector3(...dirLocal).transformDirection(m);
  const pos = new THREE.Vector3(...p.p);
  if (type === 2) pos.addScaledVector(dir, 0.6);
  return { pi, type, range, bright, color: toColor(colI), en: en && bright > 0, dir, pos, angle, shadows, mv: movableOf(p.g) };
});
let activeLights = [];
function setupLights(center, maxN, opts) {
  activeLights.forEach((l) => { l.parent.remove(l); l.dispose && l.dispose(); });
  activeLights = [];
  const c = new THREE.Vector3(...center);
  const cand = lightDefs.filter((l) => l.en).map((l) => {
    const wp = l.pos.clone();
    if (l.mv) wp.applyMatrix4(movRoots[l.mv].matrixWorld);
    return { l, d: wp.distanceTo(c) };
  }).sort((a, b) => a.d - b.d).slice(0, maxN);
  cand.forEach(({ l }) => {
    let light;
    const k = opts.lightScale ?? 1;
    if (l.type === 1) {
      light = new THREE.SpotLight(l.color, l.bright * 260 * k, l.range * 2.2, (l.angle / 2) * DEG, 0.45, 1.6);
      light.position.copy(l.pos);
      light.target.position.copy(l.pos.clone().addScaledVector(l.dir, 10));
      if (l.shadows && opts.spotShadows) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.0005; }
    } else {
      light = new THREE.PointLight(l.color, l.bright * 90 * k, l.range * 1.6, 1.6);
      light.position.copy(l.pos);
    }
    const parent = l.mv ? movRoots[l.mv] : scene;
    parent.add(light);
    if (light.target) parent.add(light.target);
    activeLights.push(light);
  });
}

// ───────── 하늘 · 분위기 ─────────
const hemi = new THREE.HemisphereLight(0x8899cc, 0x221a14, 0.4);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xaabbee, 0.8);
moon.castShadow = true;
moon.shadow.mapSize.set(4096, 4096);
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.05;
scene.add(moon, moon.target);
let skyMesh;
let moonDir = new THREE.Vector3(300, 420, -700).normalize();
function makeSky(top, mid, bottom, stars, moonDir) {
  if (skyMesh) scene.remove(skyMesh);
  const c = document.createElement('canvas');
  c.width = 4096; c.height = 2048;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 2048);
  gr.addColorStop(0, top); gr.addColorStop(0.42, mid); gr.addColorStop(0.5, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4096, 2048);
  if (stars) for (let i = 0; i < 1400; i++) {
    const a = Math.random() * 0.8 + 0.2;
    g.fillStyle = `rgba(255,255,255,${a * stars})`;
    const s = Math.random() < 0.05 ? 2 : 1;
    g.fillRect(Math.random() * 4096, Math.random() * 940, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = tex;
  scene.environment = tex;
  if (moonDir) {
    const geo = new THREE.SphereGeometry(40, 32, 16);
    skyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff6dd, toneMapped: false }));
    skyMesh.position.copy(new THREE.Vector3(...moonDir).normalize().multiplyScalar(2600));
    scene.add(skyMesh);
  }
}
window.setMood = (mood) => {
  if (mood === 'dusk') {
    makeSky('#28305a', '#e07a52', '#3a3040', 0.15, null);
    scene.fog = new THREE.FogExp2(0x5a4a58, 0.0011);
    hemi.color.set(0xb0a0c0); hemi.groundColor.set(0x3a2c24); hemi.intensity = 1.1;
    moon.color.set(0xffb070); moon.intensity = 2.0;
    moonDir.set(-700, 160, 300).normalize();
    renderer.toneMappingExposure = 1.0;
    bloom.strength = 0.55;
  } else if (mood === 'studio') {
    makeSky('#1a2238', '#2a3350', '#141a2a', 0, null);
    scene.fog = null;
    hemi.color.set(0xffffff); hemi.groundColor.set(0x404050); hemi.intensity = 1.6;
    moon.color.set(0xffffff); moon.intensity = 2.4; moonDir.set(30, 80, -120).normalize();
    renderer.toneMappingExposure = 1.0;
    bloom.strength = 0.3;
  } else {
    makeSky('#02040a', '#0c1428', '#0a0e18', 1, [0.45, 0.55, -1]);
    scene.fog = new THREE.FogExp2(0x0a1020, 0.0019);
    hemi.color.set(0x6a7cac); hemi.groundColor.set(0x14141c); hemi.intensity = 0.8;
    moon.color.set(0xa8bcf0); moon.intensity = 1.0;
    moonDir.set(300, 420, -700).normalize();
    renderer.toneMappingExposure = 1.45;
    bloom.strength = 0.9;
  }
};

// ───────── 미리보기 전용 소품: 공유(캐릭터), 학생 그림자, 의자 ─────────
const loader = new THREE.TextureLoader();
const shirtTex = await loader.loadAsync('/clothes/guard_shirt.png');
const pantsTex = await loader.loadAsync('/clothes/guard_pants.png');
[shirtTex, pantsTex].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; });
const TW = 585, TH = 559;
const TORSO = { U: [231, 8, 128, 64], L: [165, 74, 64, 128], F: [231, 74, 128, 128], R: [361, 74, 64, 128], B: [427, 74, 128, 128], D: [231, 204, 128, 64] };
const RLIMB = { U: [217, 289, 64, 64], L: [19, 355, 64, 128], B: [85, 355, 64, 128], R: [151, 355, 64, 128], F: [217, 355, 64, 128], D: [217, 485, 64, 64] };
const LLIMB = { U: [308, 289, 64, 64], F: [308, 355, 64, 128], L: [374, 355, 64, 128], B: [440, 355, 64, 128], R: [506, 355, 64, 128], D: [308, 485, 64, 64] };
function templBox(w, h, d, layout, tex) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // BoxGeometry 면 순서: +X, -X, +Y, -Y, +Z, -Z  → 캐릭터는 -Z가 앞
  ['R', 'L', 'U', 'D', 'B', 'F'].forEach((f, fi) => {
    const [x, y, rw, rh] = layout[f];
    for (let k = 0; k < 4; k++) {
      const i = fi * 4 + k;
      const u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, (x + u * rw) / TW, 1 - (y + (1 - v) * rh) / TH);
    }
  });
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
}
function faceTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e8c4a0'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#2a1e18';
  g.fillRect(70, 96, 40, 9); g.fillRect(146, 96, 40, 9); // 눈썹
  g.beginPath(); g.ellipse(92, 128, 9, 12, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(164, 128, 9, 12, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.fillRect(94, 121, 4, 4); g.fillRect(166, 121, 4, 4);
  g.strokeStyle = '#7a4a3a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 168, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeGuard() {
  const root = new THREE.Group();
  const torso = templBox(2, 2, 1, TORSO, shirtTex); torso.position.y = 3;
  const pantsTorso = templBox(2.02, 0.5, 1.02, TORSO, pantsTex); pantsTorso.position.y = 2.25; pantsTorso.visible = false;
  const rArm = templBox(1, 2, 1, RLIMB, shirtTex); rArm.position.set(1.5, 3, 0);
  const lArm = templBox(1, 2, 1, LLIMB, shirtTex); lArm.position.set(-1.5, 3, 0);
  const rLeg = templBox(1, 2, 1, RLIMB, pantsTex); rLeg.position.set(0.5, 1, 0);
  const lLeg = templBox(1, 2, 1, LLIMB, pantsTex); lLeg.position.set(-0.5, 1, 0);
  // 머리
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a0, roughness: 0.7 });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.2, 1.15), [skin, skin, skin, skin, skin, faceMat]);
  head.position.y = 4.6;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.45, 1.24), new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 0.9 }));
  hair.position.set(0, 5.05, 0.05);
  // 경비 모자
  const navy = new THREE.MeshStandardMaterial({ color: 0x1e2742, roughness: 0.7 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.7, 0.55, 24), navy); cap.position.y = 5.45;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0x111111 })); band.position.y = 5.22;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3 }));
  visor.position.set(0, 5.18, -0.75); visor.rotation.x = 0.2;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0xdeb84a, metalness: 0.8, roughness: 0.3 }));
  badge.position.set(0, 5.5, -0.78);
  // 손전등 (오른손)
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 }));
  fl.rotation.x = Math.PI / 2; fl.position.set(1.5, 2.1, -0.6);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false }));
  lens.position.set(1.5, 2.1, -1.26); lens.rotation.y = Math.PI;
  root.add(torso, pantsTorso, rArm, lArm, rLeg, lLeg, head, hair, cap, band, visor, badge, fl, lens);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData.flashlight = () => {
    const s = new THREE.SpotLight(0xfff2d0, 900, 120, 20 * DEG, 0.5, 1.4);
    s.position.set(1.5, 2.1, -1.3);
    s.target.position.set(1.5, 0, -30);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
    root.add(s, s.target);
  };
  return root;
}
function makeStudent() {
  // 이상현상: 교복 입은 학생 (얼굴이 보이지 않는다)
  const root = new THREE.Group();
  const uni = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.9 });
  const skirt = new THREE.MeshStandardMaterial({ color: 0x3a1a1e, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.9 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xbfb8b0, roughness: 0.9 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; root.add(m); return m; };
  add(new THREE.BoxGeometry(2, 2, 1), uni, 0, 3, 0);
  add(new THREE.BoxGeometry(0.5, 0.9, 0.05), white, 0, 3.5, -0.52);
  add(new THREE.BoxGeometry(2.1, 0.9, 1.1), skirt, 0, 1.75, 0);
  add(new THREE.BoxGeometry(0.8, 1.4, 0.8), pale, 0.5, 0.7, 0);
  add(new THREE.BoxGeometry(0.8, 1.4, 0.8), pale, -0.5, 0.7, 0);
  add(new THREE.BoxGeometry(1, 2, 1), uni, 1.5, 3, 0);
  add(new THREE.BoxGeometry(1, 2, 1), uni, -1.5, 3, 0);
  add(new THREE.BoxGeometry(1.2, 1.2, 1.2), pale, 0, 4.6, 0);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
  add(new THREE.BoxGeometry(1.35, 2.6, 0.25), hairMat, 0, 4.0, -0.68); // 얼굴을 덮은 긴 머리
  add(new THREE.BoxGeometry(1.35, 0.5, 1.35), hairMat, 0, 5.3, 0);
  add(new THREE.BoxGeometry(1.35, 2.6, 1.1), hairMat, 0, 4.0, 0.15);
  return root;
}
function makeChair() {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xc4a070, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.6, roughness: 0.4 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m); };
  add(new THREE.BoxGeometry(1.6, 0.15, 1.7), wood, 0, 1.62, 0);
  add(new THREE.BoxGeometry(1.6, 1.4, 0.15), wood, 0, 2.6, 0.8);
  [[-0.7, -0.75], [0.7, -0.75], [-0.7, 0.75], [0.7, 0.75]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.12, 1.6, 0.12), metal, x, 0.8, z));
  return root;
}
const extras = [];
window.clearExtras = () => { extras.forEach((e) => e.parent.remove(e)); extras.length = 0; };
window.addExtra = (kind, pos, ry = 0, opt = {}) => {
  const o = kind === 'guard' ? makeGuard() : kind === 'student' ? makeStudent() : makeChair();
  o.position.set(...pos);
  o.rotation.y = ry * DEG;
  o.scale.setScalar(opt.scale || 1);
  if (kind === 'guard' && opt.flashlight) o.userData.flashlight();
  scene.add(o);
  extras.push(o);
};
window.moveGroup = (name, pos, ryDeg) => {
  const g = movRoots[name];
  // 원래 놓인 자리 기준으로 옮기기: IntroCar 원래 (43.8,0,159) ry 0 / MainGate (0,0,0)
  const origin = name === 'School/IntroCar' ? new THREE.Vector3(43.8, 0, 159) : new THREE.Vector3(0, 0, 0);
  const m = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2])
    .multiply(new THREE.Matrix4().makeRotationY(ryDeg * DEG))
    .multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
  g.matrixAutoUpdate = false;
  g.matrix.copy(m);
  g.updateMatrixWorld(true);
};
window.setNeonOff = () => {};

let camFlash = null;
window.shot = (o) => {
  camera.fov = o.fov || 55;
  camera.position.set(...o.pos);
  camera.lookAt(new THREE.Vector3(...o.target));
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  setupLights(o.lightCenter || o.target, o.maxLights ?? 20, o);
  // 달빛 그림자 범위를 장면에 맞춤
  const t = new THREE.Vector3(...(o.shadowCenter || o.target));
  const dir = (o.moonDir ? new THREE.Vector3(...o.moonDir).normalize() : moonDir);
  moon.target.position.copy(t);
  moon.position.copy(t.clone().addScaledVector(dir, 900));
  const sc = moon.shadow.camera, R = o.shadowRadius || 260;
  sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 10; sc.far = 2400;
  sc.updateProjectionMatrix();
  if (camFlash) { scene.remove(camFlash, camFlash.target); camFlash = null; }
  if (o.flashlight) {
    camFlash = new THREE.SpotLight(0xfff0d0, o.flashlight, 160, 24 * DEG, 0.55, 1.3);
    camFlash.position.set(o.pos[0] + 0.8, o.pos[1] - 1.2, o.pos[2]);
    camFlash.target.position.set(...o.target);
    camFlash.castShadow = true;
    camFlash.shadow.mapSize.set(1024, 1024);
    scene.add(camFlash, camFlash.target);
  }
  composer.render();
  return true;
};
window.READY = true;
