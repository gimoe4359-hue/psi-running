#!/usr/bin/env node
// 에셋 만들기: assets/SongcheonAssets.glb + AssetLibrary/Templates.lua + build/assets_meta.json
//   NODE_MODULES=<three가 설치된 node_modules> node build_assets.js [Ghost Trees DeskSet]
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..');
const NM = process.env.NODE_MODULES;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

function luaValue(v, ind = '') {
  if (Array.isArray(v)) return '{ ' + v.map((x) => luaValue(x, ind)).join(', ') + ' }';
  if (v && typeof v === 'object') {
    const inner = Object.entries(v).map(([k, x]) => `${ind}\t${/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `["${k}"]`} = ${luaValue(x, ind + '\t')},`).join('\n');
    return `{\n${inner}\n${ind}}`;
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

(async () => {
  const which = process.argv.slice(2);
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = null;
    if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(`<!doctype html><html><head><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/","meshopt":"/meshopt/meshopt_simplifier.js"}}</script></head><body><script type="module" src="/factory.js"></script></body></html>`); return; }
    if (u.startsWith('/three/')) f = path.join(NM, 'three', u.slice(7));
    else if (u.startsWith('/meshopt/')) f = path.join(NM, 'meshoptimizer', u.slice(9));
    else f = path.join(HERE, path.basename(u));
    if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.FACTORY_READY === true, null, { timeout: 120000 });
  const t0 = Date.now();
  page.setDefaultTimeout(0);
  const res = await page.evaluate(async (w) => window.exportAll(w.length ? w : null), which);
  console.log('built in', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'triangles', res.tri);
  for (const [name, t] of Object.entries(res.meta)) {
    console.log(' ', name, t.meshes.map((m) => `${m.mesh}(${m.tris})`).join(' '));
    t.meshes.forEach((m) => { if (m.tris > 10000) console.log('   !! over 10k triangles:', m.mesh); });
  }
  fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
  const texDir = path.join(ROOT, 'textures', 'gongyoo_hq');
  if (Object.keys(res.textures || {}).length) fs.mkdirSync(texDir, { recursive: true });
  for (const [k, v] of Object.entries(res.textures || {})) fs.writeFileSync(path.join(texDir, k + '.png'), Buffer.from(v.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(ROOT, 'assets', 'SongcheonAssets.glb'), Buffer.from(res.glb, 'base64'));
  fs.writeFileSync(path.join(ROOT, 'build', 'assets_meta.json'), JSON.stringify(res.meta));
  const lua = '-- 자동 생성 파일 (tools/assets/build_assets.js). 메시 템플릿 정보.\n-- size/pos 단위는 stud, pos는 템플릿 기준점(발밑·밑동 등)에서의 위치.\nreturn ' + luaValue(res.meta) + '\n';
  fs.writeFileSync(path.join(ROOT, 'src', 'ServerScriptService', 'AssetLibrary', 'Templates.lua'), lua);
  console.log('glb', (fs.statSync(path.join(ROOT, 'assets', 'SongcheonAssets.glb')).size / 1e6).toFixed(2), 'MB');
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
