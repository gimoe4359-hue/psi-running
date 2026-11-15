#!/usr/bin/env node
// 손글씨 → 획(stroke) 데이터
// Roblox는 한글을 어떤 글꼴로 지정해도 기본 고딕체로 그려서, 칠판 분필 글씨나 피 글씨 느낌을 낼 수 없다.
// 그래서 실제 손글씨 글꼴(나눔손글씨 펜, 동해 독도 등)을 브라우저에서 그린 뒤
// 뼈대(가운데 선)만 뽑아 "획 목록"으로 저장한다. generate.js가 이 획을 얇은 파트로 벽·칠판·거울에 그린다.
//
//   NODE_MODULES=<@fontsource 글꼴들이 설치된 node_modules> node make_text.js
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const NM = process.env.NODE_MODULES;
const OUT = path.join(__dirname, 'text_strokes.json');

// 쓸 문구들. font: 분필 = Nanum Pen Script, 피 = East Sea Dokdo
const PHRASES = {
  date: ['11월 13일 (금)', 'Nanum Pen Script'],
  duty1: ['주번  김민지 · 이서준', 'Nanum Pen Script'],
  duty2: ['주번  박하은 · 최도윤', 'Nanum Pen Script'],
  duty3: ['주번  정수아 · 강지호', 'Nanum Pen Script'],
  note1: ['기말고사 D-18', 'Nanum Pen Script'],
  note2: ['수행평가 제출 (월)', 'Nanum Pen Script'],
  note3: ['청소 당번 1분단', 'Nanum Pen Script'],
  note4: ['떠들면 이름 적음', 'Nanum Pen Script'],
  note5: ['숙제 수학익힘 84쪽', 'Nanum Pen Script'],
  self: ['자습', 'Nanum Pen Script'],
  dontlook: ['뒤를 돌아보지 마', 'Nanum Pen Script'],
  openme: ['열어줘', 'East Sea Dokdo'],
  stay: ['너도 남아', 'East Sea Dokdo'],
  motto: ['늦게까지 남지 말자', 'Nanum Brush Script'],
  mottoTitle: ['급훈', 'Nanum Brush Script'],
};

const FONT_DIRS = { 'Nanum Pen Script': 'nanum-pen-script', 'East Sea Dokdo': 'east-sea-dokdo', 'Nanum Brush Script': 'nanum-brush-script' };
const PX = 220; // 렌더링 글자 크기

// ───────── 이미지 처리 ─────────
function zhangSuen(img, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const del = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!img[y * w + x]) continue;
        const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
        const p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
        let A = 0;
        for (let i = 0; i < 8; i++) if (!seq[i] && seq[i + 1]) A++;
        if (A !== 1) continue;
        if (step === 0 && (p2 * p4 * p6 || p4 * p6 * p8)) continue;
        if (step === 1 && (p2 * p4 * p8 || p2 * p6 * p8)) continue;
        del.push(y * w + x);
      }
      if (del.length) changed = true;
      del.forEach((i) => (img[i] = 0));
    }
  }
  return img;
}
// 대각선 계단 모양의 군더더기 픽셀 제거 (연결은 유지)
function cleanStairs(img, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (!img[y * w + x]) continue;
    const N = at(x, y - 1), S = at(x, y + 1), E = at(x + 1, y), Wd = at(x - 1, y);
    if ((N && E && !at(x - 1, y + 1) && !S && !Wd) || (N && Wd && !at(x + 1, y + 1) && !S && !E) ||
        (S && E && !at(x - 1, y - 1) && !N && !Wd) || (S && Wd && !at(x + 1, y - 1) && !N && !E)) img[y * w + x] = 0;
  }
  return img;
}
function distanceField(mask, w, h) {
  // 2-pass 근사 유클리드 거리 (3-4 chamfer)
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0;
  const idx = (x, y) => y * w + x;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = d[idx(x, y)];
    if (!v) continue;
    if (x > 0) v = Math.min(v, d[idx(x - 1, y)] + 3);
    if (y > 0) v = Math.min(v, d[idx(x, y - 1)] + 3);
    if (x > 0 && y > 0) v = Math.min(v, d[idx(x - 1, y - 1)] + 4);
    if (x < w - 1 && y > 0) v = Math.min(v, d[idx(x + 1, y - 1)] + 4);
    d[idx(x, y)] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    let v = d[idx(x, y)];
    if (!v) continue;
    if (x < w - 1) v = Math.min(v, d[idx(x + 1, y)] + 3);
    if (y < h - 1) v = Math.min(v, d[idx(x, y + 1)] + 3);
    if (x < w - 1 && y < h - 1) v = Math.min(v, d[idx(x + 1, y + 1)] + 4);
    if (x > 0 && y < h - 1) v = Math.min(v, d[idx(x - 1, y + 1)] + 4);
    d[idx(x, y)] = v;
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let best = -1, bi = 0;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const dist = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (dist > best) { best = dist; bi = i; }
  }
  if (best > eps) {
    const l = rdp(pts.slice(0, bi + 1), eps), r = rdp(pts.slice(bi), eps);
    return l.slice(0, -1).concat(r);
  }
  return [a, b];
}
function trace(skel, w, h, dist) {
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && skel[y * w + x];
  const nbrs = (x, y) => {
    const r = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && on(x + dx, y + dy)) r.push([x + dx, y + dy]);
    return r;
  };
  const deg = (x, y) => nbrs(x, y).length;
  const key = (x, y) => y * w + x;
  const visitedEdge = new Set();
  const ek = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const lines = [];
  const isNode = (x, y) => deg(x, y) !== 2;
  const walk = (sx, sy, nx, ny) => {
    const pts = [[sx, sy]];
    let px = sx, py = sy, cx = nx, cy = ny;
    visitedEdge.add(ek(key(px, py), key(cx, cy)));
    for (let guard = 0; guard < 20000; guard++) {
      pts.push([cx, cy]);
      if (isNode(cx, cy) && !(cx === sx && cy === sy && pts.length > 2)) break;
      const next = nbrs(cx, cy).filter(([x, y]) => !(x === px && y === py) && !visitedEdge.has(ek(key(cx, cy), key(x, y))));
      if (!next.length) break;
      // 직진에 가까운 이웃을 고른다
      next.sort((a, b) => (Math.abs(a[0] - cx) + Math.abs(a[1] - cy)) - (Math.abs(b[0] - cx) + Math.abs(b[1] - cy)));
      const [x2, y2] = next[0];
      visitedEdge.add(ek(key(cx, cy), key(x2, y2)));
      px = cx; py = cy; cx = x2; cy = y2;
      if (cx === sx && cy === sy) { pts.push([cx, cy]); break; }
    }
    return pts;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y) || !isNode(x, y)) continue;
    nbrs(x, y).forEach(([nx, ny]) => {
      if (visitedEdge.has(ek(key(x, y), key(nx, ny)))) return;
      lines.push(walk(x, y, nx, ny));
    });
  }
  // 고리 모양(노드 없는 원)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    const n = nbrs(x, y).filter(([nx, ny]) => !visitedEdge.has(ek(key(x, y), key(nx, ny))));
    if (n.length) lines.push(walk(x, y, n[0][0], n[0][1]));
  }
  const thick = (x, y) => Math.max(1, dist[y * w + x] * 2);
  return lines.filter((l) => l.length > 1).map((l) => l.map(([x, y]) => [x, y, thick(x, y)]));
}
function processMask(mask, w, h) {
  const dist = distanceField(mask, w, h);
  const skel = cleanStairs(zhangSuen(Uint8Array.from(mask), w, h), w, h);
  let lines = trace(skel, w, h, dist);
  // 짧은 잔가지 제거
  const avgT = lines.flat().reduce((s, p) => s + p[2], 0) / Math.max(1, lines.flat().length);
  lines = lines.filter((l) => {
    let len = 0;
    for (let i = 1; i < l.length; i++) len += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
    return len > avgT * 0.9;
  });
  // 단순화 (닫힌 고리 'ㅇ'은 반으로 나눠서 단순화해야 점으로 뭉개지지 않음)
  return lines.map((l) => {
    const pts = l.map((p) => [p[0], p[1], p[2]]);
    const a = pts[0], b = pts[pts.length - 1];
    if (pts.length > 6 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 3) {
      const m = Math.floor(pts.length / 2);
      const l1 = rdp(pts.slice(0, m + 1), 1.0), l2 = rdp(pts.slice(m), 1.0);
      return l1.slice(0, -1).concat(l2);
    }
    return rdp(pts, 1.4);
  });
}

async function main() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f = null;
    if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><html><head></head><body></body></html>'); return; }
    if (u.startsWith('/fonts/')) f = path.join(NM, '@fontsource', u.slice(7));
    if (!f || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': f.endsWith('.css') ? 'text/css' : 'font/woff2' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  for (const dir of Object.values(FONT_DIRS)) await page.addStyleTag({ url: `/fonts/${dir}/index.css` });
  const out = {};
  for (const [id, [text, font]] of Object.entries(PHRASES)) {
    const res = await page.evaluate(async ({ text, font, PX }) => {
      await document.fonts.load(`${PX}px "${font}"`, text);
      const c = document.createElement('canvas');
      const g = c.getContext('2d');
      g.font = `${PX}px "${font}"`;
      const m = g.measureText(text);
      const w = Math.ceil(m.width + PX * 0.4), h = Math.ceil(PX * 1.5);
      c.width = w; c.height = h;
      g.font = `${PX}px "${font}"`;
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textBaseline = 'middle';
      g.fillText(text, PX * 0.2, h / 2);
      const d = g.getImageData(0, 0, w, h).data;
      const mask = new Array(w * h);
      for (let i = 0; i < w * h; i++) mask[i] = d[i * 4] > 150 ? 1 : 0;
      return { w, h, mask, ok: document.fonts.check(`${PX}px "${font}"`, text) };
    }, { text, font, PX });
    const lines = processMask(res.mask, res.w, res.h);
    // em 단위로 정규화, 가운데 정렬
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    lines.flat().forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const r = (v) => Math.round(v * 1000) / 1000;
    out[id] = {
      text, font, fontLoaded: res.ok,
      w: r((maxX - minX) / PX), h: r((maxY - minY) / PX),
      strokes: lines.map((l) => l.map(([x, y, t]) => [r((x - cx) / PX), r(-(y - cy) / PX), r(t / PX)])),
    };
    console.log(id, text, font, 'strokes', lines.length, 'points', lines.flat().length, res.ok ? '' : '(font missing!)');
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
