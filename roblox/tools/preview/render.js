// 미리보기 렌더러 v2: build/map.json(게임과 같은 맵 데이터)을 three.js로 그린다.
// Roblox 화면 캡처가 아니라, 같은 파트·지형·색·재질·조명을 Roblox Future 조명과 비슷하게 흉내 낸 것.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const DEG = Math.PI / 180;
const W = 1600, H = 900;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, W / H, 0.2, 5000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.45, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(new SMAAPass(W, H));
const pmrem = new THREE.PMREMGenerator(renderer);

// ───────── 재질 텍스처 (높이맵 → 색 + 노멀맵) ─────────
let rs = 7;
const rr = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
function mkCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function normalFrom(c, strength) {
  const s = c.width, g = c.getContext('2d'), src = g.getImageData(0, 0, s, s).data;
  const out = document.createElement('canvas'); out.width = out.height = s;
  const og = out.getContext('2d'), img = og.createImageData(s, s), d = img.data;
  const hgt = (x, y) => src[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (hgt(x + 1, y) - hgt(x - 1, y)) * strength, dy = (hgt(x, y + 1) - hgt(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * s + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return out;
}
function noise(g, s, n, a, b, sz = 1) {
  for (let i = 0; i < n; i++) { const v = a + rr() * (b - a); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rr() * s, rr() * s, sz, sz); }
}
function blur(c, px) { return mkCanvas(c.width, (g) => { g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.filter = 'none'; }); }
const TEXDEF = {
  Concrete: [14, 2.5, (g, s) => { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s); noise(g, s, 14000, 190, 255, 2); }],
  Plaster: [10, 1.2, (g, s) => { g.fillStyle = '#efefef'; g.fillRect(0, 0, s, s); noise(g, s, 6000, 215, 255, 3); }],
  Brick: [7, 5, (g, s) => {
    g.fillStyle = '#9a948e'; g.fillRect(0, 0, s, s);
    const bh = s / 8, bw = s / 4;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const v = 205 + rr() * 50; g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.95})`; g.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6); }
    noise(g, s, 4000, 150, 255, 1);
  }],
  WoodPlanks: [10, 3, (g, s) => {
    for (let i = 0; i < 8; i++) {
      const v = 205 + rr() * 50; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, i * s / 8, s, s / 8);
      for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(0,0,0,${0.03 + rr() * 0.06})`; g.fillRect(0, i * s / 8 + rr() * s / 8, s, 1); }
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, i * s / 8, s, 2); g.fillRect(((i * 97) % 5) * s / 5, i * s / 8, 2, s / 8);
    }
  }],
  Wood: [6, 1.5, (g, s) => { g.fillStyle = '#eee'; g.fillRect(0, 0, s, s); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rr() * 0.08})`; g.fillRect(0, rr() * s, s, 1 + rr() * 2); } }],
  Asphalt: [8, 2.5, (g, s) => { g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, s, s); noise(g, s, 26000, 140, 255, 1); noise(g, s, 1500, 90, 140, 2); }],
  Pavement: [8, 4, (g, s) => {
    g.fillStyle = '#6c6c6c'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 215 + rr() * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x * s / 4 + 2, y * s / 4 + 2, s / 4 - 4, s / 4 - 4); }
    noise(g, s, 6000, 180, 255, 1);
  }],
  CeramicTiles: [6, 4, (g, s) => {
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 238 + rr() * 17; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x * s / 4 + 2, y * s / 4 + 2, s / 4 - 4, s / 4 - 4); }
  }],
  Marble: [10, 1, (g, s) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, s, s); noise(g, s, 7000, 195, 255, 3); g.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 4; i++) { g.fillRect(0, i * s / 4, s, 1); g.fillRect(i * s / 4, 0, 1, s); } }],
  Granite: [6, 2, (g, s) => { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s); noise(g, s, 14000, 130, 255, 2); }],
  Fabric: [3, 1.5, (g, s) => { g.fillStyle = '#eee'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(0,0,0,0.09)'; for (let i = 0; i < s; i += 3) { g.fillRect(0, i, s, 1); g.fillRect(i, 0, 1, s); } }],
  Carpet: [3, 2, (g, s) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, s, s); noise(g, s, 20000, 170, 255, 1); }],
  Leather: [3, 1.5, (g, s) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s, s); noise(g, s, 5000, 200, 255, 3); }],
  Rubber: [4, 1, (g, s) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s); noise(g, s, 9000, 200, 255, 1); }],
  Metal: [6, 0.6, (g, s) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, s, s); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(0,0,0,${rr() * 0.06})`; g.fillRect(0, rr() * s, s, 1); } }],
  Slate: [8, 2, (g, s) => { g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s); noise(g, s, 8000, 190, 255, 3); }],
  DiamondPlate: [3, 4, (g, s) => { g.fillStyle = '#bbb'; g.fillRect(0, 0, s, s); g.fillStyle = '#fff'; for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) g.fillRect(x + ((y / 16) % 2) * 8, y, 6, 2); }],
  Grass: [10, 2, (g, s) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s); noise(g, s, 22000, 140, 255, 2); }],
  LeafyGrass: [5, 3.5, (g, s) => { g.fillStyle = '#ccc'; g.fillRect(0, 0, s, s); for (let i = 0; i < 900; i++) { const v = 130 + rr() * 125; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(rr() * s, rr() * s, 3 + rr() * 5, 1.5 + rr() * 2.5, rr() * 3, 0, 7); g.fill(); } }],
  Ground: [12, 2.5, (g, s) => { g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, s, s); noise(g, s, 20000, 160, 255, 2); noise(g, s, 600, 120, 170, 3); }],
  Rock: [20, 4, (g, s) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, s, s); noise(g, s, 12000, 120, 255, 4); }],
};
const TEX = {};
for (const k in TEXDEF) {
  const [scale, nstr, draw] = TEXDEF[k];
  const c = mkCanvas(256, draw);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const nm = new THREE.CanvasTexture(normalFrom(blur(c, 0.6), nstr));
  nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.anisotropy = 8;
  TEX[k] = { map, nm, scale };
}
const ROUGH = { SmoothPlastic: 0.42, Plastic: 0.6, Metal: 0.38, Glass: 0.04, Foil: 0.15, DiamondPlate: 0.35, Marble: 0.25, CeramicTiles: 0.22, Leather: 0.55, Rubber: 0.9 };
const METAL = { Metal: 0.6, Foil: 0.85, DiamondPlate: 0.65 };

// ───────── 지오메트리 ─────────
function wedgeGeo() {
  // Roblox WedgePart: 바닥 전체 + 뒤(+Z) 세로면, 경사면은 앞(-Z)·위를 본다
  const v = [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5]];
  const tris = [[0, 1, 2], [1, 3, 2], [2, 3, 4], [3, 5, 4], [0, 4, 1], [1, 4, 5], [0, 2, 4], [1, 5, 3]];
  const pos = [];
  tris.forEach((t) => t.forEach((i) => pos.push(...v[i])));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
const geoCache = {};
function baseGeo(shape) {
  if (geoCache[shape]) return geoCache[shape];
  let g;
  if (shape === 1) g = new THREE.SphereGeometry(0.5, 24, 16).toNonIndexed();
  else if (shape === 2) { g = new THREE.CylinderGeometry(0.5, 0.5, 1, 28).toNonIndexed(); g.rotateZ(Math.PI / 2); }
  else if (shape === 3) g = wedgeGeo();
  else g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  if (g.attributes.uv) g.deleteAttribute('uv');
  return (geoCache[shape] = g);
}
function partMatrix(p) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(...p.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.r[0] * DEG, p.r[1] * DEG, p.r[2] * DEG, 'XYZ')), new THREE.Vector3(1, 1, 1));
  return m;
}
function worldUV(g, color) {
  const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
  const uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    if (ax >= ay && ax >= az) { uv[i * 2] = z; uv[i * 2 + 1] = y; } else if (ay >= az) { uv[i * 2] = x; uv[i * 2 + 1] = z; } else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
    col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function partGeometry(p) {
  const g = baseGeo(p.sh).clone();
  let s = p.s;
  if (p.sh === 1) { const d = Math.min(...s); s = [d, d, d]; }
  if (p.sh === 2) { const d = Math.min(s[1], s[2]); s = [s[0], d, d]; }
  g.scale(s[0], s[1], s[2]);
  g.applyMatrix4(partMatrix(p));
  return worldUV(g, p.color);
}
function makeMaterial(mat, t, refl) {
  if (mat === 'Neon') return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: t > 0, opacity: 1 - t * 0.6, color: new THREE.Color(1.15, 1.15, 1.15) });
  const T = TEX[mat];
  const sc = T ? 1 / T.scale : 1;
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: ROUGH[mat] ?? 0.82, metalness: METAL[mat] ?? 0,
    transparent: t > 0, opacity: 1 - t, depthWrite: t < 0.3, envMapIntensity: 0.6,
  });
  if (T) {
    m.map = T.map.clone(); m.map.repeat.set(sc, sc); m.map.needsUpdate = true;
    m.normalMap = T.nm.clone(); m.normalMap.repeat.set(sc, sc); m.normalMap.needsUpdate = true;
    m.normalScale.set(0.8, 0.8);
  }
  if (mat === 'Glass') { m.roughness = 0.03; m.metalness = 0.1; m.envMapIntensity = 1.4; }
  if (refl > 0) { m.roughness = Math.max(0.02, Math.min(m.roughness, 0.25 - refl * 0.2)); m.metalness = Math.max(m.metalness, refl * 0.9); m.envMapIntensity = 1 + refl * 2; }
  return m;
}

// ───────── 데이터 ─────────
const data = await (await fetch('/map.json')).json();
const toColor = (i) => { const [r, g, b] = data.colors[i]; return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); };
const P = data.parts.map((a) => ({
  g: a[0], name: a[1], s: [a[2], a[3], a[4]], p: [a[5], a[6], a[7]], r: [a[8], a[9], a[10]],
  color: toColor(a[11]), mat: data.mats[a[12]], t: a[13], sh: a[14], flags: a[15], refl: a[16] || 0,
}));
const groupPath = data.groups;
const tagsOf = {};
data.tags.forEach(([i, t]) => (tagsOf[t] = tagsOf[t] || []).push(i));

const MOVABLE = ['School/IntroCar', 'School/Gate/MainGate'];
const ORIGIN = { 'School/IntroCar': [40.5, 0, 162], 'School/Gate/MainGate': [0, 0, 0] };
const movableOf = (gi) => MOVABLE.find((m) => groupPath[gi] === m || groupPath[gi].startsWith(m + '/'));
const movRoots = {};
MOVABLE.forEach((m) => { const o = new THREE.Group(); scene.add(o); movRoots[m] = o; });
const buckets = {};
P.forEach((p, i) => {
  if (p.flags & 8 || p.t >= 0.99) return;
  const key = `${movableOf(p.g) || ''}|${p.mat}|${Math.round(p.t * 20)}|${Math.round(p.refl * 10)}`;
  (buckets[key] = buckets[key] || []).push(i);
});
for (const key in buckets) {
  const [mv, mat, tq, rq] = key.split('|');
  const ids = buckets[key];
  for (let k = 0; k < ids.length; k += 6000) {
    const mesh = new THREE.Mesh(mergeGeometries(ids.slice(k, k + 6000).map((i) => partGeometry(P[i]))), makeMaterial(mat, +tq / 20, +rq / 10));
    mesh.castShadow = mat !== 'Glass' && mat !== 'Neon' && +tq < 10;
    mesh.receiveShadow = true;
    if (+tq > 0) mesh.renderOrder = 2;
    (mv ? movRoots[mv] : scene).add(mesh);
  }
}

// ───────── 지형 ─────────
const TCOL = { Grass: [92, 104, 58], LeafyGrass: [84, 92, 52], Ground: [150, 128, 98], Pavement: [140, 138, 132], Rock: [108, 104, 98] };
const regions = [];
data.terrain.forEach((t, i) => {
  const [op, mat, x, y, z, sx, sy, sz] = t;
  const col = new THREE.Color().setRGB(...(TCOL[mat] || [120, 120, 120]).map((v) => v / 255), THREE.SRGBColorSpace);
  let g;
  if (op === 1) { g = new THREE.SphereGeometry(sx, 64, 32).toNonIndexed(); g.translate(x, y, z); }
  else { g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y + i * 0.03, z); }
  g.deleteAttribute('uv');
  worldUV(g, col);
  const m = makeMaterial(mat, 0, 0);
  m.roughness = 0.95;
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true; mesh.castShadow = op === 1;
  scene.add(mesh);
  if (op === 0) regions.push({ mat, x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2 });
});
function terrainMatAt(x, z) {
  let m = null;
  for (const r of regions) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) m = r.mat;
  return m;
}
// 풀잎 (Roblox Terrain.Decoration 처럼 짧은 잔디)
let grassMesh = null;
function placeGrass(center, radius, count) {
  if (grassMesh) { scene.remove(grassMesh); grassMesh.geometry.dispose(); grassMesh = null; }
  if (!count) return;
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.07, 0, 0, 0.07, 0, 0, 0, 1, 0.02], 3));
  blade.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const base = new THREE.Color().setRGB(92 / 255, 104 / 255, 58 / 255, THREE.SRGBColorSpace);
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * radius;
    const x = center[0] + Math.cos(a) * d, z = center[2] + Math.sin(a) * d;
    if (terrainMatAt(x, z) !== 'Grass') continue;
    e.set((rr() - 0.5) * 0.5, rr() * Math.PI, (rr() - 0.5) * 0.5);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1 + rr(), 0.9 + rr() * 1.1, 1));
    mesh.setMatrixAt(n, m);
    c.copy(base).multiplyScalar(0.75 + rr() * 0.5);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  scene.add(mesh);
  grassMesh = mesh;
}

// ───────── SurfaceGui 글씨 ─────────
const FONT = { GothamBlack: '900 X KRB', GothamBold: '700 X KR', Merriweather: '700 X KR', PatrickHand: '400 X KR', Arial: '400 X KR', Code: '400 X monospace' };
await document.fonts.load('700 20px KR', '가');
await document.fonts.load('900 20px KRB', '가');
await document.fonts.load('400 20px KR', '가');
function faceInfo(face, s) {
  switch (face) {
    case 'Front': return [s[0], s[1], [0, 0, -s[2] / 2 - 0.015], [0, Math.PI, 0]];
    case 'Back': return [s[0], s[1], [0, 0, s[2] / 2 + 0.015], [0, 0, 0]];
    case 'Left': return [s[2], s[1], [-s[0] / 2 - 0.015, 0, 0], [0, -Math.PI / 2, 0]];
    case 'Right': return [s[2], s[1], [s[0] / 2 + 0.015, 0, 0], [0, Math.PI / 2, 0]];
    case 'Top': return [s[0], s[2], [0, s[1] / 2 + 0.015, 0], [-Math.PI / 2, 0, 0]];
    default: return [s[0], s[2], [0, -s[1] / 2 - 0.015, 0], [Math.PI / 2, 0, 0]];
  }
}
const textMeshes = [];
function drawText(rec) {
  const [pi, face, text, tc, bc, bgT, font, lit, align, pps] = rec;
  const p = P[pi];
  const [fw, fh, lp, lr] = faceInfo(face, p.s);
  const scale = Math.min(pps * 1.5, 1600 / Math.max(fw, fh));
  const cw = Math.max(8, Math.round(fw * scale)), ch = Math.max(8, Math.round(fh * scale));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
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
    if (lines.every((l) => g.measureText(l).width <= cw * 0.96) && lines.length * size * 1.22 <= ch * 0.94) { best = { size, lines }; break; }
  }
  if (best) {
    g.font = fam.replace('X', best.size + 'px');
    g.fillStyle = col(tc); g.textBaseline = 'middle'; g.textAlign = align === 'Left' ? 'left' : 'center';
    const lh = best.size * 1.22, y0 = ch / 2 - (best.lines.length * lh) / 2 + lh / 2;
    best.lines.forEach((l, i) => g.fillText(l, align === 'Left' ? cw * 0.03 : cw / 2, y0 + i * lh));
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = lit >= 1 ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8 })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  if (lit > 0 && lit < 1) mat.color.setScalar(0.5 + lit * 0.5);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat);
  mesh.position.set(...lp); mesh.rotation.set(...lr);
  const holder = new THREE.Group(); holder.applyMatrix4(partMatrix(p)); holder.add(mesh);
  const mv = movableOf(p.g);
  (mv ? movRoots[mv] : scene).add(holder);
  textMeshes.push({ pi, holder, rec });
}
data.texts.forEach(drawText);
window.setText = (tag, text, color) => {
  (tagsOf[tag] || []).forEach((pi) => {
    const tm = textMeshes.find((x) => x.pi === pi);
    if (!tm) return;
    tm.holder.parent.remove(tm.holder);
    const rec = [...tm.rec]; rec[2] = text;
    if (color) { data.colors.push(color); rec[3] = data.colors.length - 1; }
    tm.rec = rec;
    textMeshes.splice(textMeshes.indexOf(tm), 1);
    drawText(rec);
  });
};

// ───────── 조명 ─────────
const lightDefs = data.lights.map(([pi, type, range, bright, colI, en, face, angle, shadows]) => {
  const p = P[pi];
  const m = partMatrix(p);
  const dl = { Front: [0, 0, -1], Back: [0, 0, 1], Left: [-1, 0, 0], Right: [1, 0, 0], Top: [0, 1, 0], Bottom: [0, -1, 0] }[face] || [0, -1, 0];
  const dir = new THREE.Vector3(...dl).transformDirection(m);
  const pos = new THREE.Vector3(...p.p);
  if (type === 2) pos.addScaledVector(dir, 0.4);
  return { type, range, bright, color: toColor(colI), en: en && bright > 0, dir, pos, angle, shadows, mv: movableOf(p.g) };
});
let activeLights = [];
function setupLights(center, maxN, o) {
  activeLights.forEach((l) => { l.parent.remove(l); if (l.target && l.target.parent) l.target.parent.remove(l.target); l.dispose && l.dispose(); });
  activeLights = [];
  const c = new THREE.Vector3(...center);
  const k = o.lightScale ?? 1;
  lightDefs.filter((l) => l.en).map((l) => {
    const wp = l.pos.clone(); if (l.mv) wp.applyMatrix4(movRoots[l.mv].matrixWorld);
    return { l, d: wp.distanceTo(c) };
  }).sort((a, b) => a.d - b.d).slice(0, maxN).forEach(({ l }, idx) => {
    let light;
    if (l.type === 1 || l.type === 2) {
      const ang = Math.min(l.angle, l.type === 2 ? 120 : 170);
      light = new THREE.SpotLight(l.color, l.bright * (l.type === 2 ? 70 : 220) * k, l.range * 2.0, Math.min(1.45, (ang / 2) * DEG), 0.6, 1.6);
      light.position.copy(l.pos);
      light.target.position.copy(l.pos.clone().addScaledVector(l.dir, 10));
    } else {
      light = new THREE.PointLight(l.color, l.bright * 70 * k, l.range * 1.6, 1.6);
      light.position.copy(l.pos);
    }
    if (l.shadows && idx < (o.shadowLights ?? 2)) { light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -0.0008; light.shadow.normalBias = 0.03; }
    const parent = l.mv ? movRoots[l.mv] : scene;
    parent.add(light); if (light.target) parent.add(light.target);
    activeLights.push(light);
  });
}

// ───────── 하늘 · 분위기 ─────────
const hemi = new THREE.HemisphereLight(0x8899cc, 0x221a14, 0.4);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xaabbee, 0.8);
moon.castShadow = true; moon.shadow.mapSize.set(4096, 4096); moon.shadow.bias = -0.0003; moon.shadow.normalBias = 0.04;
scene.add(moon, moon.target);
const moonDir = new THREE.Vector3(0.4, 0.6, -0.7).normalize();
let moonMesh;
function makeSky(stops, stars, moonVec) {
  const c = document.createElement('canvas'); c.width = 4096; c.height = 2048;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 2048);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, 4096, 2048);
  if (stars) for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.7 + 0.15) * stars})`; g.fillRect(Math.random() * 4096, Math.random() * 900, 1, 1); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = tex;
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  if (moonMesh) { scene.remove(moonMesh); moonMesh = null; }
  if (moonVec) {
    moonMesh = new THREE.Mesh(new THREE.SphereGeometry(34, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4), toneMapped: false, fog: false }));
    moonMesh.position.copy(moonVec.clone().normalize().multiplyScalar(3000));
    scene.add(moonMesh);
  }
}
window.setMood = (mood) => {
  if (mood === 'dusk') {
    moonDir.set(-0.85, 0.16, 0.35).normalize();
    makeSky([[0, '#1c2448'], [0.3, '#5b4a78'], [0.44, '#e88a5c'], [0.5, '#f2b27a'], [0.52, '#4a3a40'], [1, '#2a2226']], 0.1, null);
    scene.fog = new THREE.FogExp2(0x7a6070, 0.0009);
    hemi.color.set(0xb4a8c8); hemi.groundColor.set(0x3a2c24); hemi.intensity = 1.0;
    moon.color.set(0xffb070); moon.intensity = 2.6;
    renderer.toneMappingExposure = 1.0; bloom.strength = 0.45;
  } else if (mood === 'studio') {
    moonDir.set(0.3, 0.6, -0.8).normalize();
    makeSky([[0, '#1a2238'], [0.5, '#2a3350'], [1, '#141a2a']], 0, null);
    scene.fog = null;
    hemi.color.set(0xffffff); hemi.groundColor.set(0x404050); hemi.intensity = 1.6;
    moon.color.set(0xffffff); moon.intensity = 2.4;
    renderer.toneMappingExposure = 1.0; bloom.strength = 0.3;
  } else {
    moonDir.set(0.35, 0.55, -0.75).normalize();
    makeSky([[0, '#02040a'], [0.35, '#0a1226'], [0.47, '#1a2440'], [0.5, '#141a2a'], [1, '#0a0c12']], 1, moonDir);
    scene.fog = new THREE.FogExp2(0x0d1426, 0.0022);
    hemi.color.set(0x6070a0); hemi.groundColor.set(0x101218); hemi.intensity = 0.55;
    moon.color.set(0xa8bcf0); moon.intensity = 0.9;
    renderer.toneMappingExposure = 1.35; bloom.strength = 0.75;
  }
};

// ───────── 미리보기 전용 소품 ─────────
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
  ['R', 'L', 'U', 'D', 'B', 'F'].forEach((f, fi) => {
    const [x, y, rw, rh] = layout[f];
    for (let k = 0; k < 4; k++) { const i = fi * 4 + k; const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, (x + u * rw) / TW, 1 - (y + (1 - v) * rh) / TH); }
  });
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
}
function faceTexture() {
  const c = mkCanvas(256, (g) => {
    g.fillStyle = '#e8c4a0'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#2a1e18'; g.fillRect(70, 96, 40, 9); g.fillRect(146, 96, 40, 9);
    g.beginPath(); g.ellipse(92, 128, 9, 12, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(164, 128, 9, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.fillRect(94, 121, 4, 4); g.fillRect(166, 121, 4, 4);
    g.strokeStyle = '#7a4a3a'; g.lineWidth = 6; g.beginPath(); g.arc(128, 168, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeGuard() {
  const root = new THREE.Group();
  const torso = templBox(2, 2, 1, TORSO, shirtTex); torso.position.y = 3;
  const rArm = templBox(1, 2, 1, RLIMB, shirtTex); rArm.position.set(1.5, 3, 0);
  const lArm = templBox(1, 2, 1, LLIMB, shirtTex); lArm.position.set(-1.5, 3, 0);
  const rLeg = templBox(1, 2, 1, RLIMB, pantsTex); rLeg.position.set(0.5, 1, 0);
  const lLeg = templBox(1, 2, 1, LLIMB, pantsTex); lLeg.position.set(-0.5, 1, 0);
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8c4a0, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.2, 1.15), [skin, skin, skin, skin, skin, new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.7 })]);
  head.position.y = 4.6;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.45, 1.24), new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 0.9 })); hair.position.set(0, 5.05, 0.05);
  const navy = new THREE.MeshStandardMaterial({ color: 0x1e2742, roughness: 0.7 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.7, 0.55, 24), navy); cap.position.y = 5.45;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0x111111 })); band.position.y = 5.22;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.3 })); visor.position.set(0, 5.18, -0.75); visor.rotation.x = 0.2;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0xdeb84a, metalness: 0.8, roughness: 0.3 })); badge.position.set(0, 5.5, -0.78);
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 })); fl.rotation.x = Math.PI / 2; fl.position.set(1.5, 2.1, -0.6);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false })); lens.position.set(1.5, 2.1, -1.26); lens.rotation.y = Math.PI;
  root.add(torso, rArm, lArm, rLeg, lLeg, head, hair, cap, band, visor, badge, fl, lens);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData.flashlight = () => {
    const s = new THREE.SpotLight(0xfff2d0, 700, 120, 20 * DEG, 0.5, 1.4);
    s.position.set(1.5, 2.1, -1.3); s.target.position.set(1.5, 0, -30); s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
    root.add(s, s.target);
  };
  return root;
}
function makeStudent() {
  const root = new THREE.Group();
  const uni = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.9 });
  const skirt = new THREE.MeshStandardMaterial({ color: 0x3a1a1e, roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.9 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xbfb8b0, roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; root.add(m); };
  add(new THREE.BoxGeometry(2, 2, 1), uni, 0, 3, 0); add(new THREE.BoxGeometry(0.5, 0.9, 0.05), white, 0, 3.5, -0.52);
  add(new THREE.BoxGeometry(2.1, 0.9, 1.1), skirt, 0, 1.75, 0);
  add(new THREE.BoxGeometry(0.8, 1.4, 0.8), pale, 0.5, 0.7, 0); add(new THREE.BoxGeometry(0.8, 1.4, 0.8), pale, -0.5, 0.7, 0);
  add(new THREE.BoxGeometry(1, 2, 1), uni, 1.5, 3, 0); add(new THREE.BoxGeometry(1, 2, 1), uni, -1.5, 3, 0);
  add(new THREE.BoxGeometry(1.2, 1.2, 1.2), pale, 0, 4.6, 0);
  add(new THREE.BoxGeometry(1.35, 2.6, 0.25), hairMat, 0, 4.0, -0.68); add(new THREE.BoxGeometry(1.35, 0.5, 1.35), hairMat, 0, 5.3, 0); add(new THREE.BoxGeometry(1.35, 2.6, 1.1), hairMat, 0, 4.0, 0.15);
  return root;
}
function makeChair() {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xd6bc92, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.6, roughness: 0.4 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; root.add(m); };
  add(new THREE.BoxGeometry(1.6, 0.15, 1.7), wood, 0, 1.62, 0); add(new THREE.BoxGeometry(1.6, 1.4, 0.15), wood, 0, 2.6, 0.8);
  [[-0.7, -0.75], [0.7, -0.75], [-0.7, 0.75], [0.7, 0.75]].forEach(([x, z]) => add(new THREE.BoxGeometry(0.12, 1.6, 0.12), metal, x, 0.8, z));
  return root;
}
const extras = [];
window.clearExtras = () => { extras.forEach((e) => e.parent.remove(e)); extras.length = 0; };
window.addExtra = (kind, pos, ry = 0, opt = {}) => {
  const o = kind === 'guard' ? makeGuard() : kind === 'student' ? makeStudent() : makeChair();
  o.position.set(...pos); o.rotation.y = ry * DEG; o.scale.setScalar(opt.scale || 1);
  if (kind === 'guard' && opt.flashlight) o.userData.flashlight();
  scene.add(o); extras.push(o);
};
window.moveGroup = (name, pos, ryDeg) => {
  const g = movRoots[name], o = ORIGIN[name];
  const m = new THREE.Matrix4().makeTranslation(pos[0], pos[1], pos[2]).multiply(new THREE.Matrix4().makeRotationY(ryDeg * DEG)).multiply(new THREE.Matrix4().makeTranslation(-o[0], -o[1], -o[2]));
  g.matrixAutoUpdate = false; g.matrix.copy(m); g.updateMatrixWorld(true);
};
window.driverEye = () => {
  const i = (tagsOf.DriverEye || [])[0];
  const v = new THREE.Vector3(...P[i].p).applyMatrix4(movRoots['School/IntroCar'].matrixWorld);
  return [v.x, v.y, v.z];
};

let camFlash = null;
window.shot = (o) => {
  camera.fov = o.fov || 55;
  camera.position.set(...o.pos);
  camera.lookAt(new THREE.Vector3(...o.target));
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  setupLights(o.lightCenter || o.target, o.maxLights ?? 16, o);
  const t = new THREE.Vector3(...(o.shadowCenter || o.target));
  const dir = o.moonDir ? new THREE.Vector3(...o.moonDir).normalize() : moonDir;
  moon.target.position.copy(t); moon.position.copy(t.clone().addScaledVector(dir, 900));
  const sc = moon.shadow.camera, R = o.shadowRadius || 200;
  sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 10; sc.far = 2400; sc.updateProjectionMatrix();
  if (camFlash) { scene.remove(camFlash, camFlash.target); camFlash = null; }
  if (o.flashlight) {
    camFlash = new THREE.SpotLight(0xfff0d0, o.flashlight, 160, 24 * DEG, 0.55, 1.3);
    camFlash.position.set(o.pos[0], o.pos[1] - 0.8, o.pos[2]);
    camFlash.target.position.set(...o.target);
    camFlash.castShadow = true; camFlash.shadow.mapSize.set(1024, 1024); camFlash.shadow.bias = -0.001;
    scene.add(camFlash, camFlash.target);
  }
  if (o.fog !== undefined && scene.fog) scene.fog.density = o.fog;
  placeGrass(o.grassCenter || o.pos, o.grassRadius || 110, o.grass ?? 60000);
  composer.render();
  return true;
};
window.READY = true;
