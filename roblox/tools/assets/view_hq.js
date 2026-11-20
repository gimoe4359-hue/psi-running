#!/usr/bin/env node
// 고품질 공유 미리보기: gongyoo_hq.js 로 조각·텍스처를 만들고 여러 각도에서 찍는다.
//   NODE_MODULES=<three·meshoptimizer 가 설치된 node_modules> node view_hq.js <출력폴더> [pose]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const HERE = __dirname;
const NM = process.env.NODE_MODULES || path.resolve(HERE, '..', '..', 'node_modules');

const PAGE = `<!doctype html><html><head><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/","meshopt":"/meshopt/meshopt_simplifier.js"}}</script><style>body{margin:0;background:#222}</style></head><body><script type="module">
import * as THREE from 'three';
import { buildGongYooHQ } from '/gongyoo_hq.js';
const t0 = performance.now();
const res = await buildGongYooHQ();
window.BUILD_MS = performance.now() - t0;
const W = 800, H = 1100;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color(0x3a3e46);
sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a342e, 1.1));
const key = new THREE.DirectionalLight(0xfff2e0, 2.4); key.position.set(-4, 7, -6); sc.add(key);
const rim = new THREE.DirectionalLight(0xbfd4ff, 1.2); rim.position.set(5, 5, 6); sc.add(rim);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(6, 2, -4); sc.add(fill);
const loader = new THREE.TextureLoader();
const stats = [];
for (const m of res.meshes) {
  const col = new THREE.Color().setRGB(m.color[0] / 255, m.color[1] / 255, m.color[2] / 255, THREE.SRGBColorSpace);
  const opt = { color: col, roughness: m.material === 'Metal' ? 0.35 : m.material === 'Fabric' ? 0.92 : m.material === 'Leather' ? 0.6 : 0.62, metalness: m.material === 'Metal' ? 0.85 : 0 };
  if (m.texture) { const tx = await loader.loadAsync(res.textures[m.texture]); tx.flipY = false; tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8; opt.map = tx; opt.color = new THREE.Color(1, 1, 1); }
  if (m.transparency) { opt.transparent = true; opt.opacity = 1 - m.transparency; }
  const me = new THREE.Mesh(m.geo, new THREE.MeshStandardMaterial(opt));
  me.name = m.partName;
  sc.add(me);
  stats.push(m.partName + ' ' + ((m.geo.index ? m.geo.index.count : m.geo.attributes.position.count) / 3));
}
window.STATS = stats;
window.TEXTURES = res.textures;
const shots = [
  ['front', [0, 2.7, -13.5], [0, 2.55, 0], 26],
  ['three4', [-7.2, 3.3, -10.8], [0, 2.6, 0], 26],
  ['side', [-13, 2.8, 0], [0, 2.55, 0], 26],
  ['back', [3, 3.2, 12.5], [0, 2.6, 0], 26],
  ['face', [0, 4.75, -2.6], [0, 4.72, 0], 18],
  ['face34', [-1.55, 4.85, -2.05], [0, 4.72, -0.05], 18],
  ['faceside', [-2.6, 4.75, -0.2], [0, 4.72, -0.05], 18],
  ['hands', [-2.2, 2.6, -2.6], [-0.6, 2.4, 0], 30],
];
window.SHOTS = {};
for (const [name, p, t, fov] of shots) {
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.05, 100); cam.position.set(...p); cam.lookAt(...t);
  r.render(sc, cam); window.SHOTS[name] = r.domElement.toDataURL('image/png');
}
window.READY = true;
</script></body></html>`;

(async () => {
  const out = process.argv[2] || 'hq_preview';
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = null;
    if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
    if (u.startsWith('/three/')) f = path.join(NM, 'three', u.slice(7));
    else if (u.startsWith('/meshopt/')) f = path.join(NM, 'meshoptimizer', u.slice(9));
    else f = path.join(HERE, path.basename(u));
    if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 900000, polling: 1000 });
  const { shots, stats, ms, tex } = await page.evaluate(() => ({ shots: window.SHOTS, stats: window.STATS, ms: window.BUILD_MS, tex: window.TEXTURES }));
  console.log('build', (ms / 1000).toFixed(1) + 's');
  console.log(stats.join('\n'));
  for (const [k, v] of Object.entries(shots)) fs.writeFileSync(path.join(out, k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
  fs.mkdirSync(path.join(out, 'tex'), { recursive: true });
  for (const [k, v] of Object.entries(tex)) fs.writeFileSync(path.join(out, 'tex', k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
