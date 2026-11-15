#!/usr/bin/env node
// 미리보기 스크린샷 찍기
//   NODE_MODULES=<three, @fontsource/noto-sans-kr 가 설치된 node_modules> node shoot.js [샷이름...]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');
const NM = process.env.NODE_MODULES || path.join(ROOT, 'node_modules');
const OUT = path.join(ROOT, 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };

function resolve(url) {
  url = decodeURIComponent(url.split('?')[0]);
  if (url === '/') return path.join(HERE, 'index.html');
  if (url === '/render.js') return path.join(HERE, 'render.js');
  if (url === '/map.json') return path.join(ROOT, 'build', 'map.json');
  if (url.startsWith('/clothes/')) return path.join(ROOT, 'clothes', path.basename(url));
  if (url.startsWith('/three/')) return path.join(NM, 'three', url.slice(7));
  if (url.startsWith('/fonts/')) return path.join(NM, '@fontsource', 'noto-sans-kr', 'files', path.basename(url));
  return null;
}

const SHOTS = [
  { name: '01_전체_해질녘', mood: 'dusk', pos: [210, 120, 235], target: [-40, 0, -50], fov: 55, shadowRadius: 460, shadowCenter: [0, 0, 0], maxLights: 10, lightScale: 0.5 },
  { name: '02_전체_밤', mood: 'night', pos: [-235, 105, 232], target: [10, 0, -60], fov: 55, shadowRadius: 460, shadowCenter: [0, 0, 0], maxLights: 24 },
  { name: '03_인트로_도로', mood: 'night', car: [[-150, 0.25, 233], -90], pos: [-205, 5.5, 246], target: [-118, 4, 224], fov: 52, spotShadows: true, lightCenter: [-140, 4, 232], maxLights: 16 },
  { name: '04_인트로_정문', mood: 'night', car: [[0, 0.62, 203], 0], gateOpen: true, pos: [-26, 8, 162], target: [2, 4, 200], fov: 55, lightCenter: [5, 4, 195], spotShadows: true, maxLights: 18 },
  { name: '05_경비실_공유', mood: 'night', extras: [['guard', [30.5, 0.7, 174.5], 41, { flashlight: true }]], pos: [18.5, 6.2, 160.5], target: [29.5, 5, 178], fov: 50, lightCenter: [29, 5, 182], maxLights: 16 },
  { name: '06_경비실_안_근무수칙', mood: 'night', pos: [24.2, 6.8, 179.6], target: [35.3, 5.4, 184.4], fov: 72, lightCenter: [29, 6, 184], maxLights: 8, lightScale: 0.07 },
  { name: '07_복도_이상현상', mood: 'night', extras: [['student', [-104, 15, -170], -90]], pos: [-40, 20.3, -168.2], target: [-140, 19.2, -168.8], fov: 58, flashlight: 500, lightCenter: [-80, 20, -168], maxLights: 10, lightScale: 0.08 },
  { name: '08_교실_칠판', mood: 'night', board: '뒤를 보지 마', pos: [-50, 21.5, -129.8], target: [-79, 20.2, -146], fov: 62, flashlight: 520, moonDir: [0.3, 0.55, 1], lightCenter: [-60, 20, -144], maxLights: 6 },
  { name: '09_운동장_의자', mood: 'night', extras: [['chair', [-111, 0.15, 45], 160]], pos: [-122, 6.2, 82], target: [-106, 4.2, 10], fov: 55, flashlight: 160, lightCenter: [-60, 5, 100], maxLights: 16, shadowRadius: 300 },
  { name: '10_계단_4층', mood: 'night', stairText: '4F ↑', pos: [3, 34.6, -133], target: [3.3, 39.2, -156.7], fov: 66, flashlight: 90, lightScale: 0.1, lightCenter: [3, 36, -150], maxLights: 6 },
  { name: '11_공유_스킨', mood: 'studio', extras: [['guard', [-2.3, 300, 0], 0], ['guard', [2.3, 300, 0], 180]], pos: [0, 303.3, -11.5], target: [0, 302.7, 0], fov: 36, maxLights: 0, shadowCenter: [0, 300, 0], shadowRadius: 20 },
];

async function main() {
  const only = process.argv.slice(2);
  const server = http.createServer((req, res) => {
    const f = resolve(req.url);
    if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SHOTS) {
    if (only.length && !only.some((o) => s.name.includes(o))) continue;
    const t0 = Date.now();
    await page.evaluate((s) => {
      window.setMood(s.mood);
      window.clearExtras();
      window.moveGroup('School/IntroCar', s.car ? s.car[0] : [43.8, 0, 159], s.car ? s.car[1] : 0);
      window.moveGroup('School/Gate/MainGate', s.gateOpen ? [-28, 0, 0] : [0, 0, 0], 0);
      if (s.board) window.setText('Blackboard', s.board);
      if (s.stairText) window.setText('StairSign', s.stairText);
      (s.extras || []).forEach((e) => window.addExtra(e[0], e[1], e[2], e[3] || {}));
      return window.shot(s);
    }, s);
    await page.waitForTimeout(200);
    const file = path.join(OUT, `${s.name}.png`);
    await page.locator('canvas').screenshot({ path: file });
    console.log('saved', s.name, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
