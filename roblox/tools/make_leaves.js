#!/usr/bin/env node
// 나뭇잎 뭉치 그림 (투명 배경 PNG 512px): 은행잎·느티나무잎·솔잎
//   node make_leaves.js → roblox/textures/leaf_ginkgo.png, leaf_zelkova.png, leaf_pine.png + build/leaves_sheet.png
// 나무는 잎 하나하나를 파트로 만들 수 없어서, 실제 잎 수백 장을 그린 그림을 얇은 판 여러 장에 붙여 잎 뭉치를 만든다.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'textures');

const PAGE = String.raw`
<canvas id="c" width="512" height="512"></canvas>
<script>
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const S = 512, C = S / 2;
// 뭉치 안에서 잎 자리 고르기: 가운데가 빽빽하고 가장자리는 들쑥날쑥 (둥근 덩어리 + 작은 덩어리 몇 개)
function spot(r, blobs) {
  for (;;) {
    const b = blobs[Math.floor(r() * blobs.length)];
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * b[2];
    const x = b[0] + Math.cos(a) * d, y = b[1] + Math.sin(a) * d;
    if (x > 12 && x < S - 12 && y > 12 && y < S - 12) return [x, y, d / b[2]];
  }
}
function blobsOf(r, n, big) {
  const out = [[C, C + 10, big]];
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = big * (0.45 + r() * 0.35); out.push([C + Math.cos(a) * d, C + Math.sin(a) * d * 0.85, big * (0.35 + r() * 0.25)]); }
  return out;
}
function shade(base, v) { return 'rgb(' + base.map((c) => Math.max(0, Math.min(255, Math.round(c * v)))).join(',') + ')'; }
// 잔가지 몇 개 (가운데에서 바깥으로)
function twigs(x, r, col, n) {
  x.strokeStyle = col; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, len = 120 + r() * 110;
    let px = C, py = C + 30, w = 7;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 1; k <= 6; k++) { const t = k / 6; px = C + Math.cos(a + Math.sin(k) * 0.2) * len * t; py = C + 30 + Math.sin(a) * len * t * 0.8 - t * 30; x.lineWidth = w * (1 - t * 0.7); x.lineTo(px, py); }
    x.stroke();
  }
}
const L = {};
// 은행잎: 노란 부채꼴, 가운데 갈라짐, 짧은 잎자루
L.ginkgo = () => {
  const c = document.getElementById('c'), x = c.getContext('2d'); x.clearRect(0, 0, S, S);
  const r = rng(5), blobs = blobsOf(r, 6, 175);
  twigs(x, r, 'rgb(70,56,44)', 6);
  const pal = [[236, 196, 52], [226, 178, 36], [244, 214, 84], [214, 160, 30], [200, 170, 60]];
  for (let i = 0; i < 900; i++) {
    const [px, py, d] = spot(r, blobs), s = 9 + r() * 8, rot = r() * Math.PI * 2, base = pal[Math.floor(r() * pal.length)];
    const v = 0.62 + (1 - d) * 0.25 + r() * 0.22 - (py / S) * 0.12;
    x.save(); x.translate(px, py); x.rotate(rot);
    x.fillStyle = shade(base, v);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(-s * 0.95, -s * 0.75); x.quadraticCurveTo(-s * 0.5, -s * 1.25, 0, -s * 1.05); x.quadraticCurveTo(s * 0.5, -s * 1.25, s * 0.95, -s * 0.75); x.closePath(); x.fill();
    x.strokeStyle = shade(base, v * 0.7); x.lineWidth = 1; x.beginPath(); x.moveTo(0, -s * 1.05); x.lineTo(0, -s * 0.55); x.stroke();
    x.strokeStyle = 'rgba(90,70,40,0.8)'; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, s * 0.45); x.stroke();
    x.restore();
  }
  return c.toDataURL('image/png');
};
// 느티나무잎: 작고 갸름한 타원 + 톱니, 주황·적갈색 단풍
L.zelkova = () => {
  const c = document.getElementById('c'), x = c.getContext('2d'); x.clearRect(0, 0, S, S);
  const r = rng(9), blobs = blobsOf(r, 7, 180);
  twigs(x, r, 'rgb(66,52,42)', 8);
  const pal = [[204, 104, 40], [186, 82, 34], [222, 140, 56], [160, 70, 36], [196, 120, 50], [150, 110, 50]];
  for (let i = 0; i < 1300; i++) {
    const [px, py, d] = spot(r, blobs), s = 6 + r() * 6, rot = r() * Math.PI * 2, base = pal[Math.floor(r() * pal.length)];
    const v = 0.6 + (1 - d) * 0.25 + r() * 0.22 - (py / S) * 0.12;
    x.save(); x.translate(px, py); x.rotate(rot);
    x.fillStyle = shade(base, v);
    x.beginPath(); x.moveTo(0, -s * 1.3);
    for (let k = 0; k <= 8; k++) { const t = k / 8, yy = -s * 1.3 + t * s * 2.3, w = Math.sin(t * Math.PI) * s * 0.55 + (k % 2) * 0.8; x.lineTo(w, yy); }
    for (let k = 8; k >= 0; k--) { const t = k / 8, yy = -s * 1.3 + t * s * 2.3, w = Math.sin(t * Math.PI) * s * 0.55 + (k % 2) * 0.8; x.lineTo(-w, yy); }
    x.closePath(); x.fill();
    x.strokeStyle = shade(base, v * 0.72); x.lineWidth = 0.8; x.beginPath(); x.moveTo(0, -s * 1.2); x.lineTo(0, s); x.stroke();
    x.restore();
  }
  return c.toDataURL('image/png');
};
// 솔잎: 짙은 초록 바늘잎 다발이 가지를 따라 붙음
L.pine = () => {
  const c = document.getElementById('c'), x = c.getContext('2d'); x.clearRect(0, 0, S, S);
  const r = rng(13), blobs = blobsOf(r, 5, 170);
  twigs(x, r, 'rgb(96,60,44)', 7);
  const pal = [[44, 74, 46], [36, 64, 40], [58, 90, 54], [30, 54, 36], [70, 96, 58]];
  x.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const [px, py, d] = spot(r, blobs), base = pal[Math.floor(r() * pal.length)], v = 0.65 + (1 - d) * 0.3 + r() * 0.2 - (py / S) * 0.1;
    const n = 7 + Math.floor(r() * 6), rot = r() * Math.PI * 2;
    x.strokeStyle = shade(base, v); x.lineWidth = 1.6;
    for (let k = 0; k < n; k++) { const a = rot + (k / n - 0.5) * 1.6, len = 12 + r() * 10; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke(); }
  }
  return c.toDataURL('image/png');
};
window.L = L; window.READY = true;
</script>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(PAGE);
  await page.waitForFunction(() => window.READY === true);
  const names = ['ginkgo', 'zelkova', 'pine'];
  const urls = [];
  for (const n of names) {
    const url = await page.evaluate((k) => window.L[k](), n);
    urls.push(url);
    fs.writeFileSync(path.join(OUT, `leaf_${n}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote leaf_' + n);
  }
  const sheet = await page.evaluate(async (list) => {
    const c = document.createElement('canvas'); c.width = 512 * list.length; c.height = 512; const x = c.getContext('2d');
    x.fillStyle = '#7fa6c9'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < list.length; i++) { const img = new Image(); img.src = list[i]; await img.decode(); x.drawImage(img, i * 512, 0); }
    return c.toDataURL('image/png');
  }, urls);
  fs.writeFileSync(path.join(ROOT, 'build', 'leaves_sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
