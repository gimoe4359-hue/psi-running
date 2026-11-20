#!/usr/bin/env node
// 충돌 검사: 문을 모두 닫았을 때 복도에서 걸어서 갈 수 있는 곳을 채워 본다 (층별 지도 출력).
// 벽이나 닫힌 문을 지나 교실 안까지 채워지면 그 벽·문에 구멍이 있다는 뜻이다.
//   node audit_collision.js [층 바닥 y] [시작 x] [시작 z]
'use strict';
const fs = require('fs');
const path = require('path');
const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'map.json'), 'utf8'));
const L = parseFloat(process.argv[2] ?? '1'), SX = parseFloat(process.argv[3] ?? '-20'), SZ = parseFloat(process.argv[4] ?? '-167');
const E = (k, d) => parseFloat(process.env[k] ?? d);
const X0 = E("X0", -140), X1 = E("X1", 140), Z0 = E("Z0", -178), Z1 = E("Z1", -128), STEP = 0.5, HALF = 0.5; // 사람 몸통 반폭 0.5
const Y0 = L + E("YA", 1.3), Y1 = L + E("YB", 4.8); // 넘어갈 수 없는 높이의 물체만
const open = {}, slide = {};
for (const a of m.attrs) { if (a[1] === 'Open') open[a[0]] = a[2]; if (a[1] === 'SlideX') slide[a[0]] = a[2]; }
const rad = Math.PI / 180;
const boxes = [];
m.parts.forEach((p, i) => {
  const fl = p[15];
  if (fl & 1 || fl & 8) return;
  if (m.groups[p[0]].includes('AnomalyProps')) return;
  let [sx, sy, sz, x, y, z, rx, ry, rz] = p.slice(2, 11);
  if (p[1] === 'DoorLeaf' && open[i] && slide[i] !== undefined) x -= slide[i]; // 문은 닫힌 자리로
  let hx = sx / 2, hy = sy / 2, hz = sz / 2;
  if (rx || ry || rz) { // 회전한 파트: CFrame.Angles(rx,ry,rz) = Rx*Ry*Rz 의 바깥 상자
    const cx = Math.cos(rx * rad), sxn = Math.sin(rx * rad), cy = Math.cos(ry * rad), syn = Math.sin(ry * rad), cz = Math.cos(rz * rad), szn = Math.sin(rz * rad);
    const R = [[cy * cz, -cy * szn, syn], [cx * szn + sxn * syn * cz, cx * cz - sxn * syn * szn, -sxn * cy], [sxn * szn - cx * syn * cz, sxn * cz + cx * syn * szn, cx * cy]];
    const h = [hx, hy, hz];
    [hx, hy, hz] = R.map((row) => Math.abs(row[0]) * h[0] + Math.abs(row[1]) * h[1] + Math.abs(row[2]) * h[2]);
  }
  if (y + hy <= Y0 || y - hy >= Y1) return;
  if (x + hx < X0 || x - hx > X1 || z + hz < Z0 || z - hz > Z1) return;
  boxes.push([x - hx - HALF, x + hx + HALF, z - hz - HALF, z + hz + HALF]);
});
const NX = Math.round((X1 - X0) / STEP), NZ = Math.round((Z1 - Z0) / STEP);
const blocked = new Uint8Array(NX * NZ);
for (const [a, b, c, d] of boxes) {
  const i0 = Math.max(0, Math.ceil((a - X0) / STEP)), i1 = Math.min(NX - 1, Math.floor((b - X0) / STEP));
  const k0 = Math.max(0, Math.ceil((c - Z0) / STEP)), k1 = Math.min(NZ - 1, Math.floor((d - Z0) / STEP));
  for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) blocked[k * NX + i] = 1;
}
const seen = new Uint8Array(NX * NZ);
const si = Math.round((SX - X0) / STEP), sk = Math.round((SZ - Z0) / STEP);
const q = [sk * NX + si]; seen[q[0]] = 1;
if (blocked[q[0]]) console.log('시작점이 막혀 있음');
while (q.length) {
  const c = q.pop(), i = c % NX, k = (c - i) / NX;
  for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = i + di, nk = k + dk;
    if (ni < 0 || nk < 0 || ni >= NX || nk >= NZ) continue;
    const n = nk * NX + ni;
    if (!seen[n] && !blocked[n]) { seen[n] = 1; q.push(n); }
  }
}
// 2스터드 칸으로 줄여 출력: '#'=막힘, '.'=걸어서 닿음, ' '=닿지 않음
const D = E("D", 4);
for (let k = 0; k < NZ; k += D) {
  let row = '';
  for (let i = 0; i < NX; i += D) {
    let r = 0, b = 0;
    for (let a = 0; a < D; a++) for (let c = 0; c < D; c++) { const n = (k + a) * NX + i + c; if (seen[n]) r++; else if (blocked[n]) b++; }
    row += r ? '.' : b ? '#' : ' ';
  }
  console.log(String(Math.round(Z0 + k * STEP)).padStart(5) + ' ' + row);
}
