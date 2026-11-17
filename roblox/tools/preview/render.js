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
  Wood: [6, 1.5, (g, s) => { g.fillStyle = '#eee'; g.fillRect(0, 0, s, s); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.015 + rr() * 0.04})`; g.fillRect(0, rr() * s, s, 1); } }],
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
  Granite: [5, 0.8, (g, s) => {
    // 인조석(테라조): 밝은 바탕에 크고 작은 돌 조각
    g.fillStyle = '#e6e4de'; g.fillRect(0, 0, s, s);
    noise(g, s, 9000, 205, 250, 1);
    for (let i = 0; i < 1400; i++) {
      const v = rr() < 0.5 ? 130 + rr() * 60 : 235 + rr() * 20;
      g.fillStyle = `rgb(${v},${v * (0.97 + rr() * 0.06)},${v * (0.92 + rr() * 0.06)})`;
      g.beginPath(); g.ellipse(rr() * s, rr() * s, 0.8 + rr() * 2.4, 0.6 + rr() * 1.8, rr() * 3, 0, 7); g.fill();
    }
  }],
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
const ROUGH = { SmoothPlastic: 0.42, Plastic: 0.6, Metal: 0.38, Glass: 0.04, Foil: 0.15, DiamondPlate: 0.35, Marble: 0.25, CeramicTiles: 0.22, Leather: 0.55, Rubber: 0.9, Granite: 0.35 };
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
// 손글씨 그림 글자 아틀라스 (게임에서 Config.TEXT_ATLAS_IDS 에 그림을 올린 뒤의 모습)
const textAtlas = await (await fetch('/text_atlas.json')).json();
const atlasImgs = await Promise.all(Array.from({ length: textAtlas.count }, (_, i) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `/text_atlas/atlas_${i + 1}.png`; })));
const atlasDraw = (g, key, x, y, w, h) => { const e = textAtlas.entries[key]; if (e) g.drawImage(atlasImgs[e.atlas - 1], e.x, e.y, e.w, e.h, x, y, w, h); };
const attrOf = {};
data.attrs.forEach(([i, k, v]) => ((attrOf[i] = attrOf[i] || {})[k] = v));

// ───────── 메시 팩 (?pack=1): Studio에서 assets/SongcheonAssets.glb 를 가져온 뒤의 모습 ─────────
// AssetLibrary.Apply 와 같은 규칙: SwapAnchor 가 있는 묶음의 파트는 숨기고(남기는 파트는 투명 충돌용), 그 자리에 템플릿 메시를 놓는다.
const PACK = new URLSearchParams(location.search).get('pack') === '1';
let packMeta = null;
const packGeo = {};
const swapped = new Set();
const swapShow = {};
if (PACK) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  packMeta = await (await fetch('/assets_meta.json')).json();
  const gltf = await new GLTFLoader().loadAsync('/SongcheonAssets.glb');
  gltf.scene.traverse((o) => { if (o.isMesh) packGeo[o.name] = o.geometry; });
  (tagsOf.SwapAnchor || []).forEach((i) => { const t = (attrOf[i] || {}).Template; if (t && packMeta[t]) { swapped.add(data.parts[i][0]); swapShow[data.parts[i][0]] = packMeta[t].show || []; } });
}

const MOVABLE = ['School/IntroCar', 'School/Gate/MainGate'];
const ORIGIN = { 'School/IntroCar': [40.5, 0, 62], 'School/Gate/MainGate': [0, 0, 0] };
const movableOf = (gi) => MOVABLE.find((m) => groupPath[gi] === m || groupPath[gi].startsWith(m + '/'));
const movRoots = {};
MOVABLE.forEach((m) => { const o = new THREE.Group(); scene.add(o); movRoots[m] = o; });
// 켜고 끄는 묶음: 이상현상 소품(기본 숨김, Roblox에선 ServerStorage에 있다가 이상현상 때만 나옴), 교실 칠판 글씨(기본 보임)
const TOGGLES = {};
const isPropKey = (k) => k.startsWith('School/AnomalyProps/');
const toggleOf = (gi) => {
  const g = groupPath[gi];
  if (isPropKey(g)) return g.split('/').slice(0, 3).join('/');
  const m = g.match(/^(School\/MainBuilding\/F\d\/[^/]+\/Chalk)(\/|$)/);
  return m ? m[1] : null;
};
const toggleRoot = (key) => {
  if (!TOGGLES[key]) { const o = new THREE.Group(); o.visible = !isPropKey(key); scene.add(o); TOGGLES[key] = o; }
  return TOGGLES[key];
};
const rootFor = (gi) => { const mv = movableOf(gi); if (mv) return movRoots[mv]; const tg = toggleOf(gi); return tg ? toggleRoot(tg) : scene; };
const roomOf = (gi) => { const m = groupPath[gi].match(/^School\/MainBuilding\/F\d\/([^/]+)/); return m ? m[1] : null; };
// ───────── 실사 텍스처 (SurfaceTextures.lua 와 같은 규칙) ─────────
const SURF = { paint: [12, 12], lower: [8, 8], brick: [3.0, 3.6], floor: [6, 6], wood: [5, 5], ceiling: [4, 4], concrete: [10, 10] };
const SURF_FLOOR = { CorridorFloor: 'floor', HallFloor: 'floor', Landing: 'floor', StairFloor: 'floor', WingFloor: 'wood', Floor: 'wood' };
const SURF_ON = new URLSearchParams(location.search).get('surf') !== '0';
const surfTex = {};
if (SURF_ON) {
  const ld = new THREE.TextureLoader();
  await Promise.all(Object.keys(SURF).map(async (k) => {
    try { const t = await ld.loadAsync(`/textures/${k}.png`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; surfTex[k] = t; } catch (e) { /* 없으면 기본 재질 */ }
  }));
}
function surfKind(p) {
  if (!SURF_ON || p.t > 0.05 || p.s[0] * p.s[1] * p.s[2] < 2) return null;
  const g = groupPath[p.g];
  if (!(g.startsWith('School/MainBuilding') || g.startsWith('School/Gym'))) return null;
  let k = null;
  if (SURF_FLOOR[p.name]) k = SURF_FLOOR[p.name];
  else if (p.name === 'CeilingTile') k = 'ceiling';
  else if (p.name === 'Wainscot') k = 'lower';
  else if (p.mat === 'Brick') k = 'brick';
  else if (p.mat === 'Plaster') k = 'paint';
  else if (p.mat === 'Concrete' && ['FloorBand', 'Sunshade', 'SunshadeLip', 'GymBand', 'ParapetCap', 'Canopy'].includes(p.name)) k = 'concrete';
  return k && surfTex[k] ? k : null;
}
// ───────── 나뭇잎 판 (LeafCards: 투명 판 + 잎 그림) ─────────
const LEAF_IMG = { LeafG: 'leaf_ginkgo', LeafZ: 'leaf_zelkova', LeafP: 'leaf_pine' };
{
  const ld = new THREE.TextureLoader(), groupsL = {};
  P.forEach((p) => { if (LEAF_IMG[p.name]) (groupsL[p.name] = groupsL[p.name] || []).push(p); });
  for (const nm in groupsL) {
    let tex = null;
    try { tex = await ld.loadAsync(`/textures/${LEAF_IMG[nm]}.png`); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; } catch (e) { continue; }
    const geos = groupsL[nm].map((p) => {
      const g = new THREE.PlaneGeometry(p.s[0], p.s[1]);
      g.applyMatrix4(partMatrix(p));
      const col = new Float32Array(g.attributes.position.count * 3);
      for (let k = 0; k < col.length; k += 3) { col[k] = p.color.r; col[k + 1] = p.color.g; col[k + 2] = p.color.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.85 }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
    scene.add(mesh);
  }
}
const buckets = {};
P.forEach((p, i) => {
  if (p.flags & 8 || p.t >= 0.99) return;
  if (swapped.has(p.g) && !(swapShow[p.g] || []).includes(p.name)) return;
  if (p.name === 'TBar' && surfTex.ceiling) return;
  const key = `${movableOf(p.g) || ''}|${toggleOf(p.g) || ''}|${p.mat}|${Math.round(p.t * 20)}|${Math.round(p.refl * 10)}|${surfKind(p) || ''}`;
  (buckets[key] = buckets[key] || []).push(i);
});
for (const key in buckets) {
  const [mv, tg, mat, tq, rq, sk] = key.split('|');
  const ids = buckets[key];
  for (let k = 0; k < ids.length; k += 6000) {
    let mtl;
    if (sk) {
      const t = surfTex[sk].clone(); t.repeat.set(1 / SURF[sk][0], 1 / SURF[sk][1]); t.needsUpdate = true;
      mtl = new THREE.MeshStandardMaterial({ map: t, roughness: sk === 'floor' ? 0.45 : sk === 'lower' ? 0.55 : 0.9, metalness: 0, envMapIntensity: 0.6 });
    } else mtl = makeMaterial(mat, +tq / 20, +rq / 10);
    const mesh = new THREE.Mesh(mergeGeometries(ids.slice(k, k + 6000).map((i) => partGeometry(P[i]))), mtl);
    mesh.castShadow = mat !== 'Glass' && mat !== 'Neon' && +tq < 10;
    mesh.receiveShadow = true;
    if (+tq > 0) mesh.renderOrder = 2;
    (mv ? movRoots[mv] : tg ? toggleRoot(tg) : scene).add(mesh);
  }
}

const barkTex = {};
for (const k of ['bark', 'pinebark']) { try { const t = await new THREE.TextureLoader().loadAsync(`/textures/${k}.png`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; barkTex[k] = t; } catch (e) { /* 없음 */ } }
function packMaterial(m) {
  if (m.bark && barkTex[m.bark]) return new THREE.MeshStandardMaterial({ map: barkTex[m.bark], roughness: 0.95 });
  const leafy = /Leaves|Hair/.test(m.mesh);
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(m.color[0] / 255, m.color[1] / 255, m.color[2] / 255, THREE.SRGBColorSpace),
    roughness: leafy ? 0.78 : ROUGH[m.material] ?? 0.82, metalness: METAL[m.material] ?? 0,
    transparent: (m.transparency || 0) > 0, opacity: 1 - (m.transparency || 0),
  });
}
function packLocal(m) {
  const geo = packGeo[m.mesh];
  geo.computeBoundingBox();
  const sz = new THREE.Vector3(); geo.boundingBox.getSize(sz);
  return new THREE.Matrix4().compose(new THREE.Vector3(...m.pos), new THREE.Quaternion(),
    new THREE.Vector3(m.size[0] / Math.max(sz.x, 1e-4), m.size[1] / Math.max(sz.y, 1e-4), m.size[2] / Math.max(sz.z, 1e-4)));
}
if (PACK) {
  const inst = {};
  (tagsOf.SwapAnchor || []).forEach((i) => {
    const a = attrOf[i] || {}, spec = packMeta[a.Template];
    if (!spec) return;
    const sc = a.Scale || 1;
    const am = partMatrix(P[i]).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    spec.meshes.forEach((m) => { if (packGeo[m.mesh]) (inst[m.mesh] = inst[m.mesh] || { m, list: [] }).list.push(am.clone().multiply(packLocal(m))); });
  });
  for (const key in inst) {
    const { m, list } = inst[key];
    const im = new THREE.InstancedMesh(packGeo[key], packMaterial(m), list.length);
    list.forEach((mm, k) => im.setMatrixAt(k, mm));
    im.castShadow = m.shadow !== false; im.receiveShadow = true;
    scene.add(im);
  }
}
function makeGhostMesh() {
  const spec = packMeta && packMeta.Ghost;
  if (!spec) return null;
  const root = new THREE.Group();
  spec.meshes.forEach((m) => {
    if (!packGeo[m.mesh]) return;
    const mesh = new THREE.Mesh(packGeo[m.mesh], packMaterial(m));
    mesh.applyMatrix4(packLocal(m)); mesh.castShadow = true; mesh.receiveShadow = true;
    root.add(mesh);
  });
  return root;
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
  if (font === 'Atlas') atlasDraw(g, text, 0, 0, cw, ch);
  const fam = FONT[font] || '700 X KR';
  const lines0 = String(text).split('\n');
  let best = null;
  for (let size = font === 'Atlas' ? 0 : Math.floor(ch * 0.9); size >= 6; size -= Math.max(1, Math.floor(size / 20))) {
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
  rootFor(p.g).add(holder);
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
  return { type, range, bright, color: toColor(colI), en: en && bright > 0, dir, pos, angle, shadows, mv: movableOf(p.g), room: roomOf(p.g), name: p.name, tg: toggleOf(p.g) };
});
let activeLights = [];
function setupLights(center, maxN, o) {
  activeLights.forEach((l) => { l.parent.remove(l); if (l.target && l.target.parent) l.target.parent.remove(l.target); l.dispose && l.dispose(); });
  activeLights = [];
  const c = new THREE.Vector3(...center);
  const k = o.lightScale ?? 1;
  // 스위치로 켠 방: 그 방의 형광등 조명(LampBody)을 Roblox 스크립트와 같은 밝기(1.2)로 켠다
  const litRooms = new Set(o.roomLights || []);
  const isLit = (l) => l.en || (litRooms.has(l.room) && ['LampBody', 'BoardLampBody', 'LampFill'].includes(l.name));
  lightDefs.filter(isLit).filter((l) => !l.tg || (TOGGLES[l.tg] && TOGGLES[l.tg].visible)).map((l) => (l.en ? l : { ...l, bright: l.type === 0 ? 0.5 : 1.2 })).map((l) => {
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
  const o = kind === 'guard' ? makeGuard() : kind === 'student' ? makeStudent() : kind === 'ghost' ? (makeGhostMesh() || makeStudent()) : makeChair();
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

// 스위치로 켠 방의 형광등 관(Tube)을 Neon처럼 빛나게
let tubeGlow = null;
function setTubeGlow(rooms) {
  if (tubeGlow) { scene.remove(tubeGlow); tubeGlow.geometry.dispose(); tubeGlow = null; }
  const ids = [];
  P.forEach((p, i) => { if (p.name === 'Tube' && rooms.has(roomOf(p.g))) ids.push(i); });
  if (!ids.length) return;
  const glowCol = new THREE.Color().setRGB(246 / 255, 248 / 255, 1, THREE.SRGBColorSpace);
  tubeGlow = new THREE.Mesh(mergeGeometries(ids.map((i) => partGeometry({ ...P[i], s: P[i].s.map((v) => v * 1.03), color: glowCol }))), makeMaterial('Neon', 0, 0));
  scene.add(tubeGlow);
}

// ───────── 근무 수칙 수첩 (게임 Client 의 drawRulePage 와 같은 배치: 줄마다 아틀라스 그림) ─────────
function drawRulePage(g, pageIndex, x0, y0, em, gap, showNine) {
  (textAtlas.notebook[pageIndex] || []).forEach((line, li) => {
    if (!line.key || (line.kind === 'nine' && !showNine)) return;
    const e = textAtlas.entries[line.key], h = em * (line.kind === 'title' ? 1.25 : 1), w = h * e.w / e.h;
    atlasDraw(g, line.key, x0 + line.indent * em, y0 + (li + 0.5) * gap - h * 0.62, w, h);
  });
}
(tagsOf.RulesNotebookPage || []).forEach((i) => {
  const p = P[i], pps = 150, w = Math.round(p.s[0] * pps), h = Math.round(p.s[2] * pps);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const gap = h / 15.5;
  drawRulePage(c.getContext('2d'), ((attrOf[i] || {}).Page || 1) - 1, w * 0.1, gap * 0.9, gap * 0.78, gap, false);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.s[0], p.s[2]), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
  mesh.position.set(0, p.s[1] / 2 + 0.004, 0); mesh.rotation.set(-Math.PI / 2, 0, 0);
  const holder = new THREE.Group(); holder.applyMatrix4(partMatrix(p)); holder.add(mesh); scene.add(holder);
});
// R 키로 여는 수첩 화면
window.notebookOverlay = (showNine) => {
  const c = document.createElement('canvas');
  c.id = 'cctv'; c.width = W; c.height = H; c.style.cssText = 'position:absolute;left:0;top:0';
  document.body.appendChild(c);
  const g = c.getContext('2d');
  g.drawImage(renderer.domElement, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, W, H);
  const ox = (W - 820) / 2, oy = (H - 560) / 2;
  g.fillStyle = 'rgb(44,52,86)'; g.beginPath(); g.roundRect(ox, oy, 820, 560, 10); g.fill();
  [14, 414].forEach((px, pi) => {
    g.fillStyle = 'rgb(250,246,230)'; g.fillRect(ox + px, oy + 14, 392, 480);
    g.fillStyle = 'rgba(150,180,214,0.65)'; for (let i = 1; i <= 14; i++) g.fillRect(ox + px, oy + 14 + 26 + i * 32, 392, 1);
    g.fillStyle = 'rgba(220,110,110,0.7)'; g.fillRect(ox + px + 34, oy + 14, 1, 480);
    drawRulePage(g, pi, ox + px + 44, oy + 14 + 26, 25, 32, showNine);
  });
  g.fillStyle = 'rgb(196,188,166)'; g.fillRect(ox + 404, oy + 14, 12, 480);
  g.fillStyle = 'rgb(170,174,180)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.roundRect(ox + 398, oy + 30 + i * 40, 24, 7, 4); g.fill(); }
  g.fillStyle = 'rgb(226,216,190)'; g.beginPath(); g.roundRect(ox + 330, oy + 510, 160, 36, 6); g.fill();
  g.fillStyle = 'rgb(40,34,28)'; g.font = '700 16px KR'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('수첩 덮기 (R)', ox + 410, oy + 528);
  return true;
};

// ───────── CCTV 화면 (게임의 CCTV 보기 모드와 같은 필터·글자) ─────────
window.cctvView = (camNo) => {
  const i = (tagsOf.CCTVCam || []).find((k) => (attrOf[k] || {}).Cam === camNo);
  const m = partMatrix(P[i]);
  const fwd = new THREE.Vector3(0, 0, -1).transformDirection(m);
  return { pos: P[i].p, target: [P[i].p[0] + fwd.x * 50, P[i].p[1] + fwd.y * 50, P[i].p[2] + fwd.z * 50] };
};
window.cctvClear = () => { const c = document.getElementById('cctv'); if (c) c.remove(); };
window.cctvOverlay = (label, time) => {
  const c = document.createElement('canvas');
  c.id = 'cctv'; c.width = W; c.height = H; c.style.cssText = 'position:absolute;left:0;top:0';
  document.body.appendChild(c);
  const g = c.getContext('2d');
  g.filter = 'grayscale(0.9) contrast(1.32) brightness(1.08) blur(1px)';
  g.drawImage(renderer.domElement, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(214,236,218)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, (i * H) / 90, W, 2); }
  for (let i = 0; i < 2500; i++) { const v = Math.floor(rr() * 255); g.fillStyle = `rgba(${v},${v},${v},0.08)`; g.fillRect(rr() * W, rr() * H, 2, 2); }
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 3;
  g.font = '30px monospace'; g.fillStyle = 'rgb(235,242,235)'; g.textAlign = 'left'; g.fillText(label, 40, 64);
  g.fillStyle = 'rgb(255,50,50)'; g.textAlign = 'right'; g.fillText('\u25CF REC', W - 40, 64);
  g.font = '26px monospace'; g.fillStyle = 'rgb(235,242,235)'; g.textAlign = 'left'; g.fillText(time, 40, H - 46);
  g.font = '18px KR'; g.textAlign = 'right'; g.fillStyle = 'rgb(200,212,200)'; g.fillText('\u25C0 A    D \u25B6   카메라 바꾸기        E  나가기', W - 40, H - 42);
  return true;
};

let camFlash = null;
window.shot = (o) => {
  window.cctvClear();
  Object.entries(TOGGLES).forEach(([key, g]) => { g.visible = !isPropKey(key); });
  const match = (want) => Object.keys(TOGGLES).filter((key) => key === want || key.endsWith('/' + want));
  (o.show || []).forEach((w) => match(w).forEach((key) => (TOGGLES[key].visible = true)));
  (o.hide || []).forEach((w) => match(w).forEach((key) => (TOGGLES[key].visible = false)));
  setTubeGlow(new Set(o.roomLights || []));
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
