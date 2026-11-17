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
const OUT = process.env.OUT_DIR || path.join(ROOT, 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };

function resolve(url) {
  url = decodeURIComponent(url.split('?')[0]);
  if (url === '/') return path.join(HERE, 'index.html');
  if (url === '/render.js') return path.join(HERE, 'render.js');
  if (url === '/map.json') return path.join(ROOT, 'build', 'map.json');
  if (url.startsWith('/clothes/')) return path.join(ROOT, 'clothes', path.basename(url));
  if (url.startsWith('/three/')) return path.join(NM, 'three', url.slice(7));
  if (url.startsWith('/fonts/')) return path.join(NM, '@fontsource', 'noto-sans-kr', 'files', path.basename(url));
  if (url === '/SongcheonAssets.glb') return path.join(ROOT, 'assets', 'SongcheonAssets.glb');
  if (url === '/text_atlas.json') return path.join(ROOT, 'build', 'text_atlas.json');
  if (url.startsWith('/text_atlas/')) return path.join(ROOT, 'text_atlas', path.basename(url));
  if (url === '/assets_meta.json') return path.join(ROOT, 'build', 'assets_meta.json');
  if (url.startsWith('/textures/')) return path.join(ROOT, 'textures', path.basename(url));
  return null;
}

const SHOTS = [
  { name: '01_전체_해질녘', mood: 'dusk', pos: [190, 110, 215], target: [-40, 0, -60], fov: 55, shadowRadius: 420, shadowCenter: [0, 0, 0], maxLights: 8, lightScale: 0.4, grass: 0 },
  { name: '02_전체_밤', mood: 'night', pos: [-230, 95, 222], target: [10, 0, -70], fov: 55, shadowRadius: 420, shadowCenter: [0, 0, 0], maxLights: 16, grass: 0 },
  { name: '03_인트로_운전석', mood: 'night', car: [[-180, 0.22, 233], -90], pov: true, fov: 68, lightCenter: [-172, 3, 233], maxLights: 10, shadowLights: 2, grassCenter: [-160, 0, 190] },
  { name: '04_인트로_도로', mood: 'night', car: [[-140, 0.22, 233], -90], pos: [-174, 4.2, 247.5], target: [-120, 3, 229], fov: 50, lightCenter: [-135, 3, 233], maxLights: 12, shadowLights: 2, grassCenter: [-160, 0, 190] },
  { name: '05_인트로_정문', mood: 'night', car: [[0, 0.56, 205], 0], gateOpen: true, pos: [-22, 6, 168], target: [1, 3.5, 202], fov: 50, lightCenter: [3, 3, 200], maxLights: 14, shadowLights: 2 },
  { name: '06_경비실', mood: 'night', pos: [19, 5.6, 158], target: [30, 4.6, 177], fov: 48, lightCenter: [30, 6, 180], maxLights: 10 },
  { name: '07_경비실_안', pos: [23.6, 6.6, 178.2], target: [33.5, 4.4, 187.6], fov: 78, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '07e_경비실_CCTV', pos: [31.6, 5.6, 184.6], target: [32.3, 4.6, 188.6], fov: 70, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '07f_경비실_전화기', flashlight: 25, pos: [24.55, 5.15, 186.55], target: [23.85, 3.55, 188.05], fov: 46, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '07b_경비실_책상_수첩', pos: [26.6, 6.5, 184.9], target: [27.0, 3.6, 188.4], fov: 70, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '07c_경비실_문쪽', pos: [26.5, 6.4, 187.6], target: [35.5, 4.2, 177.6], fov: 76, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '07d_수첩_근무수칙', notebook: 1, pos: [27.0, 6.3, 185.2], target: [26.9, 3.4, 188.3], fov: 62, mood: 'night', lightCenter: [29.5, 8, 183], maxLights: 6, lightScale: 0.14, grass: 0, fog: 0.003 },
  { name: '08_복도_학생', mood: 'night', extras: [['ghost', [-25, 13.5, -167.4], -90]], pos: [-2, 18.7, -167.0], target: [-120, 17.4, -167.6], fov: 58, flashlight: 140, lightCenter: [-40, 20, -167], maxLights: 8, lightScale: 0.12, grass: 0, fog: 0.004 },
  { name: '09_교실_칠판', mood: 'night', roomLights: ['2-2'], pos: [-44.2, 19.2, -143.6], target: [-70.6, 18.9, -151.2], fov: 66, moonDir: [0.3, 0.55, 1], lightCenter: [-56, 21, -150], maxLights: 16, lightScale: 1, shadowLights: 2, grass: 0, fog: 0.002 },
  { name: '09b_교실_밤_칠판경고', mood: 'night', show: ['BoardWarning'], hide: ['F2/2-2/Chalk'], pos: [-46.5, 19.0, -146.5], target: [-70.6, 18.6, -150.5], fov: 62, flashlight: 240, moonDir: [0.3, 0.55, 1], lightCenter: [-55, 20, -150], maxLights: 4, lightScale: 0.2, grass: 0, fog: 0.003 },
  { name: '09c_교실_천장TV', mood: 'night', roomLights: ['2-2'], pos: [-63.6, 17.0, -143.4], target: [-68.2, 22.2, -140.9], fov: 60, moonDir: [0.3, 0.55, 1], lightCenter: [-62, 21, -144], maxLights: 12, lightScale: 1, shadowLights: 2, grass: 0, fog: 0.002 },
  { name: '09d_복도_미닫이문', mood: 'night', roomLights: ['2-2'], pos: [-46.2, 18.6, -170.7], target: [-45.0, 18.0, -163.2], fov: 60, flashlight: 35, lightCenter: [-45, 20, -166], maxLights: 10, lightScale: 0.7, grass: 0, fog: 0.002 },
  { name: '09e_복도_미닫이문_열림', mood: 'night', roomLights: ['2-2'], pos: [-58.5, 18.6, -170.4], target: [-67.5, 17.6, -163.2], fov: 58, flashlight: 70, lightCenter: [-64, 20, -166], maxLights: 10, lightScale: 0.7, grass: 0, fog: 0.002 },
  { name: '10_화장실_3층', mood: 'night', show: ['RestroomBlood'], pos: [104.5, 31, -160], target: [128, 29.5, -146], fov: 66, flashlight: 300, lightCenter: [115, 32, -150], maxLights: 4, lightScale: 0.2, moonDir: [0.3, 0.55, 1], grass: 0 , fog: 0.003 },
  { name: '11_4층_복도', mood: 'night', show: ['FourthFloor'], extras: [['ghost', [-90, 38.62, -146], 90]], pos: [-14, 43.6, -143.6], target: [-60, 42.4, -146.6], fov: 66, flashlight: 70, lightCenter: [-30, 44, -146], maxLights: 6, lightScale: 0.6, shadowLights: 2, grass: 0, fog: 0.007 },
  { name: '11b_4층_책걸상더미', mood: 'night', show: ['FourthFloor'], extras: [['ghost', [-90, 38.62, -146], 90]], pos: [-36, 43.6, -144.2], target: [-70, 42.6, -146.6], fov: 62, flashlight: 60, lightCenter: [-50, 44, -146], maxLights: 6, lightScale: 0.5, shadowLights: 2, grass: 0, fog: 0.012 },
  { name: '11c_4층_끝', mood: 'night', show: ['FourthFloor'], extras: [['ghost', [-90, 38.62, -146], 90]], pos: [-79, 43.4, -145.6], target: [-97, 42.6, -146], fov: 62, flashlight: 50, lightCenter: [-84, 44, -146], maxLights: 6, lightScale: 0.5, shadowLights: 2, grass: 0, fog: 0.012 },
  { name: '12_운동장_의자', mood: 'night', extras: [['chair', [-113, 0, 48], 166]], pos: [-122, 5.6, 84], target: [-108, 3.8, 10], fov: 55, flashlight: 160, lightCenter: [-60, 5, 100], maxLights: 12, shadowRadius: 300, grassCenter: [-150, 0, 80] },
  { name: '13_플레이어_공유_스킨', mood: 'studio', extras: [['guard', [-2.3, 300, 0], 0], ['guard', [2.3, 300, 0], 180]], pos: [0, 303.3, -11.5], target: [0, 302.7, 0], fov: 36, maxLights: 0, shadowCenter: [0, 300, 0], shadowRadius: 20, grass: 0 },
  { name: '14_CCTV_4번_2층복도', mood: 'night', cctv: { cam: 4, label: 'CAM 4   2F 복도', time: '2026-11-14  01:13:52' }, fov: 72, extras: [['ghost', [111.6, 13.5, -169.8], -90]], lightCenter: [104, 20, -167], maxLights: 10, lightScale: 0.6, grass: 0, fog: 0.004 },
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
  // 기본은 메시 팩을 가져온 뒤의 모습. PACK=0 이면 가져오기 전(파트만) 모습
  const pack = process.env.PACK !== '0';
  await page.goto(`http://127.0.0.1:${port}/${pack ? '?pack=1' : ''}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SHOTS) {
    if (only.length && !only.some((o) => s.name.includes(o))) continue;
    const t0 = Date.now();
    await page.evaluate((s) => {
      window.setMood(s.mood);
      window.clearExtras();
      window.moveGroup('School/IntroCar', s.car ? s.car[0] : [40.5, 0, 62], s.car ? s.car[1] : 0);
      if (s.pov) {
        const e = window.driverEye();
        s.pos = e;
        const a = (s.car[1] * Math.PI) / 180;
        s.target = [e[0] - Math.sin(a) * 40, e[1] - 2.2, e[2] - Math.cos(a) * 40];
      }
      if (s.cctv) { const v = window.cctvView(s.cctv.cam); s.pos = v.pos; s.target = v.target; }
      if (s.stall) window.setText('StallDoor3', s.stall);
      window.moveGroup('School/Gate/MainGate', s.gateOpen ? [-28, 0, 0] : [0, 0, 0], 0);
      if (s.board) window.setText('Blackboard', s.board);
      if (s.stairText) window.setText('StairSign', s.stairText);
      (s.extras || []).forEach((e) => window.addExtra(e[0], e[1], e[2], e[3] || {}));
      const ok = window.shot(s);
      if (s.cctv) window.cctvOverlay(s.cctv.label, s.cctv.time);
      if (s.notebook) window.notebookOverlay(s.notebook === 9);
      return ok;
    }, s);
    await page.waitForTimeout(200);
    const file = path.join(OUT, `${s.name}.png`);
    await page.locator(s.cctv || s.notebook ? '#cctv' : 'canvas').first().screenshot({ path: file });
    console.log('saved', s.name, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
