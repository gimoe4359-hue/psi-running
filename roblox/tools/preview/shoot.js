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
  { name: '01_전체_해질녘', mood: 'dusk', pos: [190, 110, 215], target: [-40, 0, -60], fov: 55, shadowRadius: 420, shadowCenter: [0, 0, 0], maxLights: 8, lightScale: 0.4, grass: 0 },
  { name: '02_전체_밤', mood: 'night', pos: [-230, 95, 222], target: [10, 0, -70], fov: 55, shadowRadius: 420, shadowCenter: [0, 0, 0], maxLights: 16, grass: 0 },
  { name: '03_인트로_운전석', mood: 'night', car: [[-180, 0.22, 233], -90], pov: true, fov: 68, lightCenter: [-172, 3, 233], maxLights: 10, shadowLights: 2, grassCenter: [-160, 0, 190] },
  { name: '04_인트로_도로', mood: 'night', car: [[-140, 0.22, 233], -90], pos: [-174, 4.2, 247.5], target: [-120, 3, 229], fov: 50, lightCenter: [-135, 3, 233], maxLights: 12, shadowLights: 2, grassCenter: [-160, 0, 190] },
  { name: '05_인트로_정문', mood: 'night', car: [[0, 0.56, 205], 0], gateOpen: true, pos: [-22, 6, 168], target: [1, 3.5, 202], fov: 50, lightCenter: [3, 3, 200], maxLights: 14, shadowLights: 2 },
  { name: '06_경비실_공유', mood: 'night', extras: [['guard', [31, 0, 172], 40]], pos: [19, 5.6, 158], target: [30, 4.6, 177], fov: 48, lightCenter: [30, 6, 180], maxLights: 10 },
  { name: '07_경비실_안_근무수칙', mood: 'night', pos: [23.6, 6.4, 178.6], target: [37.5, 5.2, 183.6], fov: 74, lightCenter: [29.5, 8, 183], maxLights: 4, lightScale: 0.12, grass: 0 , fog: 0.003 },
  { name: '08_복도_학생', mood: 'night', extras: [['student', [-36, 13.5, -168], -90]], pos: [-2, 18.7, -167.0], target: [-120, 17.4, -167.6], fov: 58, flashlight: 140, lightCenter: [-40, 20, -167], maxLights: 8, lightScale: 0.12, grass: 0, fog: 0.004 },
  { name: '09_교실_칠판', mood: 'night', board: '뒤를 보지 마', pos: [-43.5, 19.2, -140], target: [-70, 18.2, -151], fov: 64, flashlight: 380, moonDir: [0.3, 0.55, 1], lightCenter: [-55, 20, -150], maxLights: 4, lightScale: 0.2, grass: 0 , fog: 0.003 },
  { name: '10_화장실_3층', mood: 'night', stall: '똑 똑', pos: [104.5, 31, -160], target: [128, 29.5, -146], fov: 66, flashlight: 300, lightCenter: [115, 32, -150], maxLights: 4, lightScale: 0.2, moonDir: [0.3, 0.55, 1], grass: 0 , fog: 0.003 },
  { name: '11_계단_4층', mood: 'night', stairText: '4F ↑', pos: [2.6, 31.2, -138.6], target: [2.6, 36.2, -158], fov: 66, flashlight: 90, lightScale: 0.1, lightCenter: [3, 34, -150], maxLights: 4, grass: 0 , fog: 0.003 },
  { name: '12_운동장_의자', mood: 'night', extras: [['chair', [-113, 0, 48], 166]], pos: [-122, 5.6, 84], target: [-108, 3.8, 10], fov: 55, flashlight: 160, lightCenter: [-60, 5, 100], maxLights: 12, shadowRadius: 300, grassCenter: [-150, 0, 80] },
  { name: '13_공유_스킨', mood: 'studio', extras: [['guard', [-2.3, 300, 0], 0], ['guard', [2.3, 300, 0], 180]], pos: [0, 303.3, -11.5], target: [0, 302.7, 0], fov: 36, maxLights: 0, shadowCenter: [0, 300, 0], shadowRadius: 20, grass: 0 },
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
      window.moveGroup('School/IntroCar', s.car ? s.car[0] : [40.5, 0, 162], s.car ? s.car[1] : 0);
      if (s.pov) {
        const e = window.driverEye();
        s.pos = e;
        const a = (s.car[1] * Math.PI) / 180;
        s.target = [e[0] - Math.sin(a) * 40, e[1] - 2.2, e[2] - Math.cos(a) * 40];
      }
      if (s.stall) window.setText('StallDoor3', s.stall);
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
