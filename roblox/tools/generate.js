#!/usr/bin/env node
// 송천고등학교 야간 경비 — 맵 생성기 v2 (사실적인 버전)
//
// 맵 전체를 "파트 + 지형(Terrain)" 목록으로 만든 다음
//   1) Roblox용 Luau 모듈 (src/ServerScriptService/SchoolBuilder/MapData*.lua)
//   2) 미리보기 렌더러용 JSON (build/map.json)
// 을 같은 데이터로 내보낸다.
//
// 축척: 1 stud ≈ 0.3 m. 층고 12.5(3.75 m), 천장 높이 10.3(3.1 m), 교실 30×25(9 m × 7.5 m), 복도 폭 8(2.4 m).
// 좌표: Roblox와 같음 (Y 위). 정문은 남쪽(+Z), 본관은 북쪽(-Z).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let seed = 20261113;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const jit = (c, a = 8) => c.map((v) => v + (rnd() - 0.5) * a);

// ───────────────────────── 데이터 테이블 ─────────────────────────
const parts = [], groups = [], groupIndex = {}, lights = [], texts = [], tags = [], gtags = [], attrs = [];
const colors = [], colorIdx = {}, mats = [], matIdx = {};
const terrain = []; // [op, mat, x,y,z, sx,sy,sz]  op: 0 블록, 1 공(sx=반지름)
let gstack = ['School'];

function ensureGroup(p) {
  if (p in groupIndex) return groupIndex[p];
  const segs = p.split('/');
  if (segs.length > 1) ensureGroup(segs.slice(0, -1).join('/'));
  groups.push(p);
  groupIndex[p] = groups.length - 1;
  return groupIndex[p];
}
const cur = () => ensureGroup(gstack.join('/'));
function grp(name, fn, tag) {
  gstack.push(name);
  const gi = cur();
  if (tag) [].concat(tag).forEach((t) => gtags.push([gi, t]));
  fn(gi);
  gstack.pop();
  return gi;
}
function ci(c) {
  c = c.map((v) => Math.max(0, Math.min(255, Math.round(v))));
  const k = c.join(',');
  if (!(k in colorIdx)) { colors.push(c); colorIdx[k] = colors.length - 1; }
  return colorIdx[k];
}
function mi(m) {
  if (!(m in matIdx)) { mats.push(m); matIdx[m] = mats.length - 1; }
  return matIdx[m];
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const SHAPES = { Block: 0, Ball: 1, Cylinder: 2, Wedge: 3 };

// P(이름, 크기, 위치, 색, 재질, 옵션)
//  옵션: r=[rx,ry,rz](도), t=투명도, refl=반사, sh=모양, nc=충돌없음, ns=그림자없음, pri=PrimaryPart,
//        hidden=판정용 투명 영역, tag, attr, light, text
function P(name, size, pos, color, mat = 'SmoothPlastic', o = {}) {
  const s = size.map((v) => r3(Math.max(0.05, Math.abs(v))));
  let flags = 0;
  if (o.nc) flags |= 1;
  if (o.ns) flags |= 2;
  if (o.pri) flags |= 4;
  if (o.hidden) flags |= 8;
  parts.push([cur(), name, ...s, ...pos.map(r3), ...(o.r || [0, 0, 0]).map(r3), ci(color), mi(mat), r3(o.t || 0), SHAPES[o.sh || 'Block'], flags, r3(o.refl || 0)]);
  const idx = parts.length - 1;
  if (o.tag) [].concat(o.tag).forEach((t) => t && tags.push([idx, t]));
  if (o.attr) for (const k in o.attr) attrs.push([idx, k, o.attr[k]]);
  if (o.light) {
    const L = o.light;
    lights.push([idx, { Point: 0, Spot: 1, Surface: 2 }[L.type || 'Point'], L.range || 16, L.brightness ?? 1,
      ci(L.color || [255, 240, 220]), L.enabled === false ? 0 : 1, L.face || 'Bottom', L.angle || 90, L.shadows ? 1 : 0]);
  }
  if (o.text) {
    const T = o.text;
    texts.push([idx, T.face || 'Front', T.text, ci(T.color || [20, 20, 20]), ci(T.bg || [255, 255, 255]),
      T.bgT ?? 1, T.font || 'GothamBold', T.lit ?? 1, T.align || 'Center', T.pps || 50]);
  }
  return idx;
}
function B(name, x0, y0, z0, x1, y1, z1, color, mat, o) {
  return P(name, [x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], color, mat, o);
}
function cylV(name, x, y0, z, h, d, color, mat, o = {}) {
  return P(name, [h, d, d], [x, y0 + h / 2, z], color, mat, { ...o, sh: 'Cylinder', r: [0, o.ry || 0, 90] });
}
// 두 점을 잇는 원기둥 (파이프, 가지, 전선). 원기둥 축(X)을 Rz(기울기) → Ry(방향) 순서로 돌린다.
function cylBetween(name, a, b, d, color, mat, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(-dz, dx) * 180 / Math.PI;
  const pitch = Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
  return P(name, [len, d, d], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], color, mat, { ...o, sh: o.box ? 'Block' : 'Cylinder', r: [0, yaw, pitch] });
}
function ball(name, x, y, z, d, color, mat, o = {}) {
  return P(name, [d, d, d], [x, y, z], color, mat, { ...o, sh: 'Ball' });
}
function tBlock(mat, x0, y0, z0, x1, y1, z1) {
  terrain.push([0, mat, r3((x0 + x1) / 2), r3((y0 + y1) / 2), r3((z0 + z1) / 2), r3(x1 - x0), r3(y1 - y0), r3(z1 - z0)]);
}
function tBall(mat, x, y, z, r) { terrain.push([1, mat, r3(x), r3(y), r3(z), r3(r), 0, 0]); }

// 구멍 뚫린 벽
function wallHoles(name, axis, uMin, uMax, vMin, vMax, w0, w1, holes, color, mat, o) {
  const us = [uMin, uMax];
  holes.forEach((h) => { [h.u0, h.u1].forEach((u) => { if (u > uMin && u < uMax) us.push(u); }); });
  const U = [...new Set(us)].sort((a, b) => a - b);
  const cols = [];
  for (let i = 0; i < U.length - 1; i++) {
    const ua = U[i], ub = U[i + 1], mid = (ua + ub) / 2;
    let iv = [[vMin, vMax]];
    holes.filter((h) => h.u0 <= mid && h.u1 >= mid).forEach((h) => {
      const out = [];
      iv.forEach(([a, b]) => {
        if (h.v1 <= a || h.v0 >= b) { out.push([a, b]); return; }
        if (h.v0 > a) out.push([a, h.v0]);
        if (h.v1 < b) out.push([h.v1, b]);
      });
      iv = out;
    });
    const key = JSON.stringify(iv);
    if (cols.length && cols[cols.length - 1].key === key) cols[cols.length - 1].ub = ub;
    else cols.push({ ua, ub, iv, key });
  }
  cols.forEach((c) => c.iv.forEach(([v0, v1]) => {
    if (v1 - v0 < 0.01 || c.ub - c.ua < 0.01) return;
    if (axis === 'x') B(name, c.ua, v0, w0, c.ub, v1, w1, color, mat, o);
    else B(name, w0, v0, c.ua, w1, v1, c.ub, color, mat, o);
  }));
}

// ───────────────────────── 색 ─────────────────────────
const C = {
  facade: [228, 224, 214], facadeShade: [206, 201, 190], sunshade: [214, 210, 200],
  wallIvory: [236, 231, 218], wainscot: [168, 190, 172], baseboard: [70, 92, 78], rail: [150, 112, 74],
  ceiling: [232, 232, 226], tbar: [212, 212, 206], troffer: [236, 238, 240],
  corridorFloor: [178, 182, 172], classFloor: [168, 128, 86], hallFloor: [150, 152, 148],
  alum: [178, 182, 186], alumDark: [118, 122, 128], glass: [128, 150, 160], glassFrost: [214, 220, 222],
  woodDark: [96, 66, 42], laminate: [214, 188, 146],
  steel: [146, 150, 156], steelDark: [64, 66, 70], board: [34, 60, 48], white: [236, 236, 232],
  asphalt: [56, 57, 60], paving: [158, 150, 140], curb: [186, 184, 178],
  roofGreen: [86, 128, 104], brick: [138, 74, 58],
  leafG: [52, 84, 44], ginkgo: [226, 186, 46], ginkgo2: [210, 160, 30], zelkova: [168, 96, 44], zelkova2: [140, 82, 40], pine: [40, 66, 44],
  bark: [78, 64, 52], tileFloor: [150, 156, 160],
};

// ───────────────────────── 창문: 바깥 틀 + 엇갈린 미닫이 창짝 2장 + 유리 ─────────────────────────
function slider(axis, u0, u1, v0, v1, plane, o = {}) {
  const fc = o.frame || C.alum, gc = o.glassColor || C.glass, gt = o.glassT ?? 0.6;
  const box = (n, a0, b0, a1, b1, w0, w1, col, mat, op) => (axis === 'x'
    ? B(n, a0, b0, w0, a1, b1, w1, col, mat, op) : B(n, w0, b0, a0, w1, b1, a1, col, mat, op));
  const d = o.depth || 0.5, f = 0.22;
  box('WinFrame', u0, v1 - f, u1, v1, plane - d / 2, plane + d / 2, fc, 'Metal');
  box('WinFrame', u0, v0, u1, v0 + f, plane - d / 2, plane + d / 2, fc, 'Metal');
  box('WinFrame', u0, v0, u0 + f, v1, plane - d / 2, plane + d / 2, fc, 'Metal');
  box('WinFrame', u1 - f, v0, u1, v1, plane - d / 2, plane + d / 2, fc, 'Metal');
  const mid = (u0 + u1) / 2, s = 0.13;
  [[u0 + f, mid + 0.12, -0.1], [mid - 0.12, u1 - f, 0.1]].forEach(([a, b, off]) => {
    const w0 = plane + off - 0.06, w1 = plane + off + 0.06;
    box('Sash', a, v0 + f, b, v0 + f + s, w0, w1, fc, 'Metal', { ns: true });
    box('Sash', a, v1 - f - s, b, v1 - f, w0, w1, fc, 'Metal', { ns: true });
    box('Sash', a, v0 + f, a + s, v1 - f, w0, w1, fc, 'Metal', { ns: true });
    box('Sash', b - s, v0 + f, b, v1 - f, w0, w1, fc, 'Metal', { ns: true });
    box('Glass', a + s, v0 + f + s, b - s, v1 - f - s, plane + off - 0.02, plane + off + 0.02, gc, 'Glass', { t: gt, ns: true, refl: 0.08 });
  });
}

// 벽 아래 마감: 하단 페인트 + 걸레받이 + 몰딩. gaps = 문 자리, n = 방 쪽 방향
function wainscot(axis, uMin, uMax, face, n, L, gaps = [], o = {}) {
  const segs = [];
  let u = uMin;
  [...gaps].sort((a, b) => a[0] - b[0]).forEach(([a, b]) => { if (a > u) segs.push([u, a]); u = Math.max(u, b); });
  if (u < uMax) segs.push([u, uMax]);
  const h = o.h || 3.5;
  segs.forEach(([a, b]) => {
    if (b - a < 0.2) return;
    const lay = (n0, t, y0, y1, c, m) => (axis === 'x'
      ? B(n0, a, y0, Math.min(face, face + n * t), b, y1, Math.max(face, face + n * t), c, m, { nc: true, ns: true })
      : B(n0, Math.min(face, face + n * t), y0, a, Math.max(face, face + n * t), y1, b, c, m, { nc: true, ns: true }));
    lay('Wainscot', 0.05, L, L + h, o.color || C.wainscot, 'Plaster');
    lay('Baseboard', 0.1, L, L + 0.45, o.base || C.baseboard, 'SmoothPlastic');
    lay('ChairRail', 0.13, L + h, L + h + 0.18, o.rail || C.rail, 'Wood');
  });
}

// 천장 텍스 + T바 그리드
function ceiling(x0, x1, z0, z1, y) {
  B('CeilingTile', x0, y, z0, x1, y + 0.2, z1, C.ceiling, 'Plaster', { ns: true });
  for (let x = x0 + 2; x < x1 - 0.1; x += 2) B('TBar', x - 0.05, y - 0.04, z0, x + 0.05, y, z1, C.tbar, 'SmoothPlastic', { nc: true, ns: true });
  for (let z = z0 + 2; z < z1 - 0.1; z += 2) B('TBar', x0, y - 0.04, z - 0.05, x1, y, z + 0.05, C.tbar, 'SmoothPlastic', { nc: true, ns: true });
}
function troffer(x, z, y, on, o = {}) {
  const w = o.w || 4, d = o.d || 2;
  B('TrofferFrame', x - w / 2, y - 0.12, z - d / 2, x + w / 2, y, z + d / 2, C.troffer, 'Metal', { nc: true, ns: true });
  return B('TrofferLens', x - w / 2 + 0.2, y - 0.16, z - d / 2 + 0.2, x + w / 2 - 0.2, y - 0.1, z + d / 2 - 0.2,
    on ? [246, 248, 255] : [222, 224, 226], on ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true, tag: o.tag, light: o.light });
}

// ───────────────────────── 나무 (11월: 은행나무·느티나무·소나무) ─────────────────────────
function tree(x, z, kind = 'ginkgo', h = 26, ground = 0) {
  grp('Tree', () => {
    const lean = (rnd() - 0.5) * 0.6;
    const bark = jit(C.bark, 14);
    const tw = 1.1 + h * 0.03;
    if (kind === 'pine') {
      cylBetween('Trunk', [x, ground - 0.5, z], [x + lean, ground + h * 0.8, z], tw, [96, 70, 54], 'Wood');
      for (let i = 0; i < 6; i++) {
        const t = i / 5, w = h * (0.62 - t * 0.48), y = ground + h * (0.3 + t * 0.64);
        for (let k = 0; k < 3; k++) {
          const a = rnd() * Math.PI * 2, rr = w * 0.12;
          P('Needles', [w * (0.8 + rnd() * 0.3), h * 0.09, w * (0.55 + rnd() * 0.3)], [x + Math.cos(a) * rr, y + (rnd() - 0.5), z + Math.sin(a) * rr],
            jit(C.pine, 10), 'LeafyGrass', { r: [rnd() * 8 - 4, rnd() * 180, rnd() * 8 - 4] });
        }
      }
      return;
    }
    const leafA = kind === 'ginkgo' ? C.ginkgo : C.zelkova;
    const leafB = kind === 'ginkgo' ? C.ginkgo2 : C.zelkova2;
    const top = [x + lean, ground + h * 0.55, z + lean * 0.5];
    cylBetween('Trunk', [x, ground - 0.5, z], top, tw, bark, 'Wood');
    cylBetween('Trunk', [top[0], top[1] - 0.5, top[2]], [x + lean * 1.4, ground + h * 0.8, z], tw * 0.7, bark, 'Wood');
    const nb = kind === 'ginkgo' ? 5 : 6;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + rnd() * 0.6;
      const y0 = ground + h * (0.38 + rnd() * 0.25);
      const reach = h * (kind === 'ginkgo' ? 0.2 : 0.3) * (0.8 + rnd() * 0.4);
      const end = [x + Math.cos(a) * reach, y0 + h * (0.18 + rnd() * 0.15), z + Math.sin(a) * reach];
      cylBetween('Branch', [x + lean * 0.5, y0, z], end, tw * 0.45, bark, 'Wood', { nc: true });
      for (let k = 0; k < 2; k++) {
        const d = h * (kind === 'ginkgo' ? 0.2 : 0.24) * (0.8 + rnd() * 0.4);
        ball('Leaves', end[0] + (rnd() - 0.5) * 3, end[1] + (rnd() - 0.2) * 3, end[2] + (rnd() - 0.5) * 3, d, jit(rnd() < 0.5 ? leafA : leafB, 18), 'LeafyGrass', { nc: true });
      }
    }
    for (let k = 0; k < (kind === 'ginkgo' ? 4 : 5); k++) {
      const d = h * 0.26 * (0.8 + rnd() * 0.4);
      ball('Leaves', x + lean + (rnd() - 0.5) * h * 0.25, ground + h * (0.72 + rnd() * 0.2), z + (rnd() - 0.5) * h * 0.25, d, jit(rnd() < 0.5 ? leafA : leafB, 18), 'LeafyGrass', { nc: true });
    }
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * h * 0.45;
      P('FallenLeaf', [0.5 + rnd() * 0.7, 0.04, 0.4 + rnd() * 0.5], [x + Math.cos(a) * rr, ground + 0.05, z + Math.sin(a) * rr],
        jit(leafA, 30), 'Fabric', { r: [0, rnd() * 180, 0], nc: true, ns: true });
    }
  });
}
function hedge(x0, z0, x1, z1, h = 2.6) {
  B('Hedge', x0, 0, z0, x1, h, z1, jit([46, 76, 44], 6), 'LeafyGrass');
  const n = Math.max(1, Math.round(Math.max(x1 - x0, z1 - z0) / 3));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    ball('HedgeTop', x0 + (x1 - x0) * t, h - 0.2, z0 + (z1 - z0) * t, Math.min(x1 - x0, z1 - z0) * 1.05, jit([52, 84, 48], 10), 'LeafyGrass', { nc: true });
  }
}

// ───────────────────────── 가로등 · 전봇대 ─────────────────────────
function streetLight(x, z, facingDeg, o = {}) {
  grp('StreetLight', () => {
    const h = o.h || 22;
    const a = (facingDeg * Math.PI) / 180, dx = Math.sin(a), dz = Math.cos(a);
    B('Base', x - 0.7, 0, z - 0.7, x + 0.7, 1.2, z + 0.7, [96, 98, 102], 'Metal');
    cylV('Pole', x, 0, z, h * 0.6, 0.75, [118, 122, 128], 'Metal');
    cylV('Pole', x, h * 0.6, z, h * 0.4, 0.55, [118, 122, 128], 'Metal');
    cylBetween('Arm', [x, h - 0.4, z], [x + dx * 4.5, h + 0.4, z + dz * 4.5], 0.35, [118, 122, 128], 'Metal');
    P('Head', [1.4, 0.45, 3.2], [x + dx * 5.6, h + 0.3, z + dz * 5.6], [80, 82, 86], 'Metal', { r: [0, facingDeg, 0] });
    P('Lamp', [1.1, 0.12, 2.6], [x + dx * 5.6, h + 0.02, z + dz * 5.6], [255, 214, 160], o.off ? 'SmoothPlastic' : 'Neon', {
      r: [0, facingDeg, 0], nc: true, ns: true, tag: o.flicker ? ['FlickerLight', 'StreetLamp'] : 'StreetLamp',
      light: { type: 'Spot', face: 'Bottom', range: o.range || 48, angle: 120, brightness: o.off ? 0 : 2.2, color: [255, 196, 130], enabled: !o.off, shadows: true } });
  });
}
function utilityPole(x, z) {
  grp('UtilityPole', () => {
    cylV('Pole', x, 0, z, 32, 1.2, [150, 148, 142], 'Concrete');
    B('CrossArm', x - 0.25, 28.6, z - 4, x + 0.25, 29.1, z + 4, [90, 92, 96], 'Metal');
    B('CrossArm', x - 0.25, 25.6, z - 3, x + 0.25, 26.1, z + 3, [90, 92, 96], 'Metal');
    [-3.6, 0, 3.6].forEach((dz) => cylV('Insulator', x, 29.1, z + dz, 0.6, 0.35, [230, 230, 226], 'SmoothPlastic', { nc: true }));
    if (rnd() < 0.4) cylV('Transformer', x - 1.1, 20, z, 3.4, 1.7, [120, 126, 130], 'Metal', { nc: true });
    B('Plate', x - 0.45, 8, z - 0.62, x + 0.45, 10.5, z - 0.6, [240, 240, 236], 'SmoothPlastic', { nc: true });
  });
}
function wires(xs, z, ys) {
  grp('Wires', () => {
    for (let i = 0; i < xs.length - 1; i++) {
      ys.forEach(([dz, y]) => {
        const a = xs[i], b = xs[i + 1], n = 6, sag = 1.6;
        for (let k = 0; k < n; k++) {
          const t0 = k / n, t1 = (k + 1) / n;
          const y0 = y - sag * 4 * t0 * (1 - t0), y1 = y - sag * 4 * t1 * (1 - t1);
          cylBetween('Wire', [a + (b - a) * t0, y0, z + dz], [a + (b - a) * t1, y1, z + dz], 0.12, [24, 24, 26], 'SmoothPlastic', { nc: true, ns: true });
        }
      });
    }
  });
}

// ───────────────────────── 자동차 (앞 = 로컬 -Z, 실내 포함) ─────────────────────────
function car(name, cx, cz, ry, color, o = {}) {
  return grp(name, () => {
    const c = Math.cos((ry * Math.PI) / 180), s = Math.sin((ry * Math.PI) / 180);
    const W = (lx, ly, lz) => [cx + lx * c + lz * s, ly, cz - lx * s + lz * c];
    const Q = (n, size, lp, col, mat, op = {}) => {
      const lr = op.r || [0, 0, 0];
      return P(n, size, W(...lp), col, mat, { ...op, r: [lr[0], ry + lr[1], lr[2]] });
    };
    const trim = [28, 28, 30], chrome = [190, 194, 198], glass = [40, 52, 60], seat = [44, 44, 48];
    Q('Body', [6.2, 1.5, 15.2], [0, 1.95, 0], color, 'SmoothPlastic', { pri: true, refl: 0.12 });
    Q('Skirt', [6.3, 0.35, 11.6], [0, 1.05, 0.2], trim, 'SmoothPlastic');
    Q('Hood', [6.0, 0.45, 4.6], [0, 2.9, -5.1], color, 'SmoothPlastic', { refl: 0.15 });
    Q('Nose', [6.0, 0.6, 0.8], [0, 2.45, -7.35], color, 'SmoothPlastic', { refl: 0.12 });
    Q('Trunk', [6.0, 0.45, 3.0], [0, 2.9, 5.9], color, 'SmoothPlastic', { refl: 0.15 });
    Q('Windshield', [5.6, 2.0, 2.6], [0, 4.12, -1.6], glass, 'Glass', { sh: 'Wedge', t: 0.78, refl: 0.15 });
    Q('Roof', [5.6, 0.25, 4.4], [0, 5.24, 1.9], color, 'SmoothPlastic', { refl: 0.15 });
    Q('RearGlass', [5.6, 2.0, 2.2], [0, 4.12, 5.2], glass, 'Glass', { sh: 'Wedge', t: 0.35, refl: 0.2, r: [0, 180, 0] });
    [-1, 1].forEach((sx) => {
      Q('SideGlass', [0.08, 1.75, 6.6], [sx * 2.82, 4.12, 1.8], glass, 'Glass', { t: 0.65, refl: 0.2 });
      Q('Pillar', [0.2, 2.05, 0.3], [sx * 2.82, 4.12, 2.0], trim, 'SmoothPlastic');
      Q('BeltLine', [0.25, 0.25, 9], [sx * 3.0, 3.05, 0.3], color, 'SmoothPlastic', { refl: 0.12 });
      Q('Mirror', [0.75, 0.5, 0.35], [sx * 3.35, 3.65, -0.9], color, 'SmoothPlastic');
      Q('Handle', [0.1, 0.18, 0.7], [sx * 3.12, 2.7, -0.1], chrome, 'Metal', { nc: true });
      Q('Handle', [0.1, 0.18, 0.7], [sx * 3.12, 2.7, 3.2], chrome, 'Metal', { nc: true });
      Q('DoorLine', [0.04, 2.0, 0.05], [sx * 3.11, 2.3, 1.55], trim, 'SmoothPlastic', { nc: true, ns: true });
      [-1, 1].forEach((sz) => {
        Q('Arch', [0.5, 0.5, 3.4], [sx * 2.9, 2.95, sz * 4.75], trim, 'SmoothPlastic');
        Q('Tire', [0.95, 2.55, 2.55], [sx * 2.75, 1.275, sz * 4.75], [26, 26, 28], 'Rubber', { sh: 'Cylinder' });
        Q('Rim', [1.0, 1.7, 1.7], [sx * 2.76, 1.275, sz * 4.75], [170, 174, 178], 'Metal', { sh: 'Cylinder' });
        Q('Hub', [1.04, 0.5, 0.5], [sx * 2.76, 1.275, sz * 4.75], [90, 92, 96], 'Metal', { sh: 'Cylinder' });
      });
      Q('Headlight', [1.6, 0.42, 0.25], [sx * 2.2, 2.55, -7.65], [255, 252, 240], 'Neon', {
        tag: 'CarHeadlight', light: { type: 'Spot', face: 'Front', range: 60, brightness: o.lightsOn ? 6 : 0, angle: 50, color: [255, 246, 226], enabled: !!o.lightsOn, shadows: true } });
      Q('DRL', [1.6, 0.08, 0.2], [sx * 2.2, 2.25, -7.66], [235, 245, 255], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true });
      Q('Taillight', [1.7, 0.4, 0.2], [sx * 2.15, 2.75, 7.62], [170, 10, 14], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true });
    });
    Q('Grille', [2.6, 0.55, 0.15], [0, 2.3, -7.72], [22, 22, 24], 'Metal');
    Q('Emblem', [0.5, 0.35, 0.05], [0, 2.3, -7.81], chrome, 'Metal', { nc: true });
    Q('FrontBumper', [6.3, 0.75, 0.6], [0, 1.45, -7.45], color, 'SmoothPlastic', { refl: 0.1 });
    Q('LowerGrille', [4.2, 0.35, 0.1], [0, 1.25, -7.78], trim, 'SmoothPlastic', { nc: true });
    Q('RearBumper', [6.3, 0.75, 0.6], [0, 1.45, 7.45], color, 'SmoothPlastic', { refl: 0.1 });
    Q('Plate', [2.1, 0.5, 0.06], [0, 1.6, -7.8], [240, 240, 236], 'SmoothPlastic', { text: { face: 'Front', text: o.plate || '35싸 0412', color: [20, 20, 20], bg: [240, 240, 236], bgT: 0, pps: 80 } });
    Q('Plate', [2.1, 0.5, 0.06], [0, 2.0, 7.78], [240, 240, 236], 'SmoothPlastic', { text: { face: 'Back', text: o.plate || '35싸 0412', color: [20, 20, 20], bg: [240, 240, 236], bgT: 0, pps: 80 } });
    // 실내
    Q('CabinFloor', [5.4, 0.2, 9], [0, 2.75, 1.2], [36, 36, 38], 'Carpet', { nc: true });
    Q('Dash', [5.4, 1.0, 1.4], [0, 3.35, -2.55], [32, 32, 34], 'Leather', { nc: true });
    Q('DashTop', [5.4, 0.12, 1.0], [0, 3.9, -2.75], [24, 24, 26], 'Leather', { nc: true });
    Q('Cluster', [1.3, 0.45, 0.05], [-1.35, 3.68, -1.84], [120, 180, 255], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true });
    Q('Screen', [1.2, 0.7, 0.05], [0, 3.6, -1.84], [40, 70, 110], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true });
    Q('SteeringWheel', [0.12, 1.45, 1.45], [-1.35, 3.55, -1.35], [20, 20, 22], 'Leather', { sh: 'Cylinder', r: [0, 90, -25], nc: true });
    Q('Column', [0.25, 0.25, 0.9], [-1.35, 3.45, -1.75], [30, 30, 32], 'SmoothPlastic', { nc: true });
    [-1.35, 1.35].forEach((sx) => {
      Q('SeatBase', [2.0, 0.7, 2.2], [sx, 3.15, 0.4], seat, 'Leather', { nc: true });
      Q('SeatBack', [2.0, 2.2, 0.5], [sx, 4.3, 1.55], seat, 'Leather', { nc: true });
      Q('Headrest', [1.2, 0.6, 0.45], [sx, 5.55, 1.7], seat, 'Leather', { nc: true });
    });
    Q('RearSeat', [5.0, 0.7, 2.2], [0, 3.15, 4.0], seat, 'Leather', { nc: true });
    Q('RearBack', [5.0, 1.9, 0.5], [0, 4.2, 4.9], seat, 'Leather', { nc: true });
    Q('Console', [0.9, 0.9, 2.6], [0, 3.1, -0.4], [28, 28, 30], 'SmoothPlastic', { nc: true });
    if (o.pov) Q('DriverEye', [0.2, 0.2, 0.2], [-1.35, 4.6, 0.9], [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'DriverEye' });
  }, o.tag);
}

// ═════════════════════════ 1. 지형 (Roblox Terrain) ═════════════════════════
tBlock('Grass', -900, -16, -900, 900, 0, 900);
tBlock('Ground', -200, -8, -98, -26, 0, 194);
tBlock('Pavement', -900, -8, 200, 900, 0, 256);
tBlock('Pavement', -140, -8, -180, 140, 0, -116);
tBlock('Pavement', -14, -8, -116, 14, 0, 200);
tBlock('Pavement', 14, -8, 92, 108, 0, 176);
tBlock('Pavement', 96, -8, -108, 206, 0, -20);
tBlock('Pavement', 18, -8, 172, 42, 0, 196);
// 먼 산: 공을 여러 개 이어 붙여 능선처럼
[[-900, -760, 700, 150], [-200, -820, 800, 190], [520, -760, 760, 160], [-980, -200, 300, 120], [980, -150, 340, 130], [0, -1150, 1800, 260]].forEach(([x, z, len, r]) => {
  const n = Math.round(len / (r * 0.55));
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const rr2 = r * (0.55 + rnd() * 0.6) * (0.75 + Math.sin(t * Math.PI) * 0.35);
    const px = Math.abs(z) > 600 ? x - len / 2 + t * len : x + (rnd() - 0.5) * 120;
    const pz = Math.abs(z) > 600 ? z + (rnd() - 0.5) * r * 0.8 : z - len / 2 + t * len;
    tBall(rnd() < 0.75 ? 'Grass' : 'LeafyGrass', px, -rr2 * (0.35 + rnd() * 0.25), pz, rr2);
    if (rnd() < 0.25) tBall('Rock', px + (rnd() - 0.5) * r * 0.4, -rr2 * 0.1, pz, rr2 * 0.35);
  }
});

// ═════════════════════════ 2. 학교 밖 ═════════════════════════
grp('Street', () => {
  B('Sidewalk', -900, 0, 200.5, 900, 0.55, 210, C.paving, 'Pavement');
  B('Curb', -900, 0, 209.5, 900, 0.7, 210.3, C.curb, 'Concrete');
  B('Road', -900, 0, 210.3, 900, 0.22, 239.7, C.asphalt, 'Asphalt');
  B('Curb', -900, 0, 239.7, 900, 0.7, 240.5, C.curb, 'Concrete');
  B('Sidewalk', -900, 0, 240.5, 900, 0.55, 252, C.paving, 'Pavement');
  B('CenterLine', -900, 0.22, 224.62, 900, 0.25, 224.86, [214, 168, 44], 'SmoothPlastic', { nc: true, ns: true });
  B('CenterLine', -900, 0.22, 225.14, 900, 0.25, 225.38, [214, 168, 44], 'SmoothPlastic', { nc: true, ns: true });
  B('EdgeLine', -900, 0.22, 211.1, 900, 0.25, 211.35, [224, 224, 220], 'SmoothPlastic', { nc: true, ns: true });
  B('EdgeLine', -900, 0.22, 238.65, 900, 0.25, 238.9, [224, 224, 220], 'SmoothPlastic', { nc: true, ns: true });
  for (let z = 212.4; z < 238; z += 2.6) B('Crosswalk', -10, 0.22, z, 10, 0.26, z + 1.3, [226, 226, 222], 'SmoothPlastic', { nc: true, ns: true });
  B('StopLine', -40, 0.22, 225.5, -36, 0.26, 238.6, [226, 226, 222], 'SmoothPlastic', { nc: true, ns: true });
  B('DrivewayRamp', -15, 0, 200.5, 15, 0.56, 210.3, [138, 138, 136], 'Concrete');
  for (let x = -880; x < 900; x += 60) B('Drain', x, 0.22, 210.4, x + 2.2, 0.27, 211.0, [40, 40, 42], 'DiamondPlate', { nc: true, ns: true });
  [-260, -90, 130, 330].forEach((x) => P('Manhole', [0.06, 2.4, 2.4], [x, 0.24, 231], [60, 60, 62], 'DiamondPlate', { sh: 'Cylinder', r: [0, 0, 90], nc: true, ns: true }));
  for (let x = -300; x < 300; x += 4) B('PaverJoint', x, 0.55, 200.6, x + 0.06, 0.57, 209.4, [128, 122, 114], 'SmoothPlastic', { nc: true, ns: true });
  grp('BusStop', () => {
    B('Floor', -64, 0.55, 202, -44, 0.75, 208.5, [120, 120, 118], 'Concrete');
    B('BackGlass', -63.5, 0.75, 208.1, -44.5, 8.6, 208.3, [160, 190, 200], 'Glass', { t: 0.55 });
    B('Roof', -65, 8.6, 201.4, -43, 9.0, 209, [70, 74, 80], 'Metal');
    B('RoofEdge', -65, 8.3, 201.3, -43, 8.6, 201.5, [40, 90, 160], 'SmoothPlastic');
    [-63.6, -54, -44.4].forEach((x) => B('Post', x - 0.18, 0.75, 207.7, x + 0.18, 8.6, 208.05, [70, 74, 80], 'Metal'));
    B('Bench', -60, 0.75, 206.2, -48, 2.3, 207.6, [130, 100, 70], 'Wood');
    B('MapPanel', -44.4, 1.5, 202.4, -44.2, 7.5, 207.4, [240, 240, 236], 'Neon', { t: 0.1, text: { face: 'Right', text: '송천고등학교 앞\n\n06  12  27\n마을버스 3', color: [30, 40, 70], bgT: 1, lit: 0 },
      light: { type: 'Point', range: 10, brightness: 0.6, color: [230, 240, 255] } });
    cylV('SignPole', -68, 0.55, 203, 11, 0.3, [90, 94, 100], 'Metal');
    B('SignBoard', -69.6, 9.2, 202.8, -66.4, 11.6, 203.2, [30, 90, 160], 'SmoothPlastic', { text: { face: 'Back', text: '송천고등학교 앞', color: [255, 255, 255], bg: [30, 90, 160], bgT: 0, lit: 0.4 } });
  });
  for (let x = -840; x <= 840; x += 56) streetLight(x, 208.7, 0, { flicker: x === -112 || x === 224 });
  const poleX = [];
  for (let x = -860; x <= 860; x += 48) { utilityPole(x, 243.5); poleX.push(x); }
  wires(poleX, 243.5, [[-3.6, 29.1], [0, 29.1], [3.6, 29.1], [-2.4, 26.1], [2.4, 26.1]]);
  cylV('SchoolSignPole', 30, 0.55, 209, 10, 0.25, [140, 144, 150], 'Metal');
  P('SchoolSign', [2.6, 2.6, 0.1], [30, 10.4, 209.1], [250, 220, 40], 'SmoothPlastic', { r: [0, 0, 45], text: { face: 'Back', text: '학교 앞', color: [20, 20, 20], bgT: 1, lit: 0.6 } });
});

grp('Town', () => {
  function apartment(x0, z0, w, d, floors, label) {
    grp('Apartment', () => {
      const fh = 8.6, h = floors * fh + 2;
      B('Body', x0, 0, z0, x0 + w, h, z0 + d, [212, 208, 198], 'Plaster');
      B('Parapet', x0 - 0.3, h, z0 - 0.3, x0 + w + 0.3, h + 2.4, z0 + d + 0.3, [190, 186, 178], 'Plaster');
      B('RoofBox', x0 + w * 0.4, h + 2.4, z0 + d * 0.2, x0 + w * 0.6, h + 10, z0 + d * 0.8, [190, 186, 178], 'Plaster');
      B('Label', x0 + w - 0.3, h - 14, z0 + d * 0.2, x0 + w + 0.05, h - 4, z0 + d * 0.8, [212, 208, 198], 'Plaster',
        { text: { face: 'Right', text: label, color: [60, 90, 140], bgT: 1, lit: 0.3, font: 'GothamBlack' } });
      B('Logo', x0 - 0.05, h - 16, z0 + d * 0.15, x0 + 0.3, h - 3, z0 + d * 0.85, [212, 208, 198], 'Plaster',
        { text: { face: 'Left', text: '송천 한빛', color: [120, 60, 50], bgT: 1, lit: 0.3, font: 'Merriweather' } });
      const units = Math.floor(w / 14);
      for (let f = 0; f < floors; f++) {
        const y = 2 + f * fh;
        B('Slab', x0 - 0.2, y + fh - 0.6, z0 - 3.6, x0 + w + 0.2, y + fh, z0, [200, 196, 188], 'Plaster');
        for (let u = 0; u < units; u++) {
          const ux = x0 + 1 + u * (w - 2) / units, uw = (w - 2) / units;
          B('Rail', ux + 0.3, y, z0 - 3.6, ux + uw - 0.3, y + 3.2, z0 - 3.3, [180, 186, 190], 'Glass', { t: 0.35 });
          const lit = rnd() < 0.3, tv = lit && rnd() < 0.3;
          const col = tv ? [150, 180, 255] : pick([[255, 214, 160], [255, 226, 180], [240, 236, 220]]);
          B(lit ? 'WindowLit' : 'Window', ux + 0.6, y + 0.4, z0 - 0.2, ux + uw - 0.6, y + fh - 1.2, z0 - 0.05, lit ? col : [36, 42, 52], lit ? 'Neon' : 'Glass',
            { nc: true, ns: true, t: lit ? 0.35 : 0.1, refl: lit ? 0 : 0.25 });
          if (lit && rnd() < 0.6) B('Curtain', ux + 0.7, y + 0.4, z0 - 0.3, ux + 0.7 + uw * 0.3, y + fh - 1.2, z0 - 0.22, pick([[180, 160, 130], [140, 150, 170], [200, 190, 170]]), 'Fabric', { nc: true, ns: true });
          B('Mullion', ux + uw / 2 - 0.1, y + 0.4, z0 - 0.3, ux + uw / 2 + 0.1, y + fh - 1.2, z0 - 0.2, [200, 200, 200], 'Metal', { nc: true, ns: true });
        }
      }
    });
  }
  apartment(-360, 268, 84, 30, 15, '101동');
  apartment(-250, 268, 84, 30, 14, '102동');
  apartment(170, 268, 84, 30, 15, '103동');
  apartment(280, 268, 84, 30, 13, '104동');
  apartment(-620, 290, 98, 30, 18, '105동');
  apartment(460, 290, 98, 30, 17, '106동');
  grp('Shops', () => {
    const x0 = -150, x1 = 140;
    B('Body', x0, 0, 258, x1, 21, 292, [190, 180, 168], 'Plaster');
    B('Cornice', x0 - 0.5, 21, 257.5, x1 + 0.5, 22.5, 292.5, [160, 152, 142], 'Plaster');
    B('Awning', x0, 9.2, 254.4, x1, 9.6, 258, [70, 72, 76], 'Metal');
    const shops = [['GS편의점', [40, 120, 200], true, [235, 248, 255]], ['송천분식', [220, 110, 40], true, [255, 232, 196]], ['PC방', [80, 110, 220], true, [180, 200, 255]],
      ['세탁소', [150, 150, 160], false], ['문구·팬시', [210, 70, 90], false], ['송천약국', [40, 150, 70], true, [240, 255, 245]], ['부동산', [80, 80, 90], false]];
    const sw = (x1 - x0) / shops.length;
    shops.forEach(([label, col, open, glow], i) => {
      const x = x0 + i * sw;
      B('Pier', x, 0, 257.4, x + 1, 21, 258, [170, 160, 150], 'Plaster');
      B('ShopGlass', x + 1, 0.6, 257.8, x + sw, 8.8, 258.0, open ? [200, 214, 220] : [30, 34, 40], 'Glass', { t: open ? 0.75 : 0.05, refl: 0.2, nc: true,
        light: open ? { type: 'Point', range: 26, brightness: 1.1, color: glow, shadows: true } : undefined });
      if (open) {
        B('Interior', x + 1.5, 0.6, 262, x + sw - 0.5, 8.6, 268, pick([[200, 200, 196], [220, 214, 200]]), 'SmoothPlastic');
        B('ShopCeiling', x + 1.5, 8.4, 258.2, x + sw - 0.5, 8.6, 268, glow, 'Neon', { nc: true, ns: true });
        for (let k = 0; k < 3; k++) B('Shelf', x + 3 + k * (sw - 6) / 3, 0.6, 260, x + 3 + k * (sw - 6) / 3 + 2.5, 5, 266, pick([[180, 60, 60], [60, 120, 180], [230, 200, 80], [90, 160, 90]]), 'SmoothPlastic');
      }
      B('Sign', x + 1.4, 10.2, 257.2, x + sw - 0.4, 14.6, 257.9, col, open ? 'Neon' : 'SmoothPlastic', {
        t: open ? 0.05 : 0, text: { face: 'Front', text: label, color: [255, 255, 255], bgT: 1, lit: 0, font: 'GothamBlack' } });
      const upLit = open && rnd() < 0.5;
      B('UpperWindow', x + 3, 15.2, 257.8, x + sw - 2, 19.6, 258, upLit ? [255, 230, 190] : [40, 44, 52], upLit ? 'Neon' : 'Glass', { nc: true, t: 0.2 });
      if (rnd() < 0.5) B('ACUnit', x + 3, 1, 256.2, x + 6, 3.5, 257.4, [214, 214, 210], 'Metal');
    });
  });
});

// ═════════════════════════ 3. 담장 · 정문 · 경비실 ═════════════════════════
grp('Wall', () => {
  const H = 6;
  [[-220, -21], [21, 220]].forEach(([a, b]) => {
    B('LowWall', a, 0, 199.4, b, 2.6, 200.6, [176, 170, 160], 'Concrete');
    B('LowWallCap', a, 2.6, 199.2, b, 2.9, 200.8, [146, 140, 132], 'Concrete');
    B('FenceRail', a, 7.4, 199.85, b, 7.7, 200.15, [52, 70, 60], 'Metal');
    B('FenceRail', a, 3.6, 199.85, b, 3.85, 200.15, [52, 70, 60], 'Metal');
    for (let x = a + 0.6; x < b; x += 0.9) B('FenceBar', x - 0.07, 2.9, 199.93, x + 0.07, 7.9, 200.07, [52, 70, 60], 'Metal', { ns: rnd() < 0.5 });
    for (let x = a; x <= b; x += 12) B('FencePost', x - 0.3, 2.9, 199.7, x + 0.3, 8.2, 200.3, [52, 70, 60], 'Metal');
  });
  const seg = (x0, z0, x1, z1) => {
    B('Wall', x0, 0, z0, x1, H, z1, [182, 176, 166], 'Concrete');
    B('Cap', x0 - 0.25, H, z0 - 0.25, x1 + 0.25, H + 0.45, z1 + 0.25, [140, 136, 128], 'Concrete');
  };
  seg(-220, -200.6, 220, -199.4);
  seg(-220.6, -200, -219.4, 200);
  seg(219.4, -200, 220.6, 200);
  for (let x = -220; x <= 220; x += 16) B('Pilaster', x - 0.7, 0, -200.9, x + 0.7, H + 0.6, -199.1, [160, 154, 146], 'Concrete');
  for (let z = -184; z < 200; z += 16) { B('Pilaster', -220.9, 0, z - 0.7, -219.1, H + 0.6, z + 0.7, [160, 154, 146], 'Concrete'); B('Pilaster', 219.1, 0, z - 0.7, 220.9, H + 0.6, z + 0.7, [160, 154, 146], 'Concrete'); }
  for (let i = 0; i < 70; i++) {
    const side = pick(['N', 'W', 'E']);
    const t = -195 + rnd() * 390, w = 2 + rnd() * 6, h = 1 + rnd() * 4.6;
    const col = jit(pick([[120, 50, 36], [150, 70, 40], [80, 90, 50], [110, 40, 34]]), 16);
    if (side === 'N') B('Ivy', t, 0.3, -199.4, t + w, h, -199.1, col, 'LeafyGrass', { nc: true });
    else if (side === 'W') B('Ivy', -219.4, 0.3, t, -219.1, h, t + w, col, 'LeafyGrass', { nc: true });
    else B('Ivy', 219.1, 0.3, t, 219.4, h, t + w, col, 'LeafyGrass', { nc: true });
  }
});

grp('Gate', () => {
  [-1, 1].forEach((s) => {
    const x0 = s < 0 ? -21 : 15, x1 = s < 0 ? -15 : 21;
    B('GatePillar', x0, 0, 198.2, x1, 10, 201.8, [118, 112, 106], 'Granite');
    B('PillarCap', x0 - 0.4, 10, 197.8, x1 + 0.4, 10.8, 202.2, [96, 92, 88], 'Granite');
    B('PillarBase', x0 - 0.3, 0, 197.9, x1 + 0.3, 1, 202.1, [96, 92, 88], 'Granite');
    P('PillarLamp', [1.2, 1.2, 1.2], [(x0 + x1) / 2, 11.6, 200], [255, 236, 200], 'Neon', { sh: 'Ball', nc: true,
      light: { type: 'Point', range: 20, brightness: 1.2, color: [255, 210, 160], shadows: true } });
  });
  B('NamePlate', -20.4, 3.2, 201.8, -15.6, 9, 202.0, [176, 150, 90], 'Metal', { refl: 0.1,
    text: { face: 'Back', text: '송천고등학교', color: [40, 30, 20], bgT: 1, font: 'Merriweather', lit: 1, pps: 60 } });
  B('NamePlate', 15.6, 3.2, 201.8, 20.4, 9, 202.0, [176, 150, 90], 'Metal', { refl: 0.1,
    text: { face: 'Back', text: 'SONGCHEON\nHIGH SCHOOL', color: [40, 30, 20], bgT: 1, font: 'Merriweather', lit: 1, pps: 60 } });
  grp('MainGate', () => {
    B('RailTop', -15, 6.4, 199.6, 15, 6.9, 200.4, [60, 64, 70], 'Metal', { pri: true });
    B('RailBottom', -15, 0.5, 199.6, 15, 1.0, 200.4, [60, 64, 70], 'Metal');
    B('RailMid', -15, 3.5, 199.75, 15, 3.8, 200.25, [60, 64, 70], 'Metal');
    for (let x = -14.4; x <= 14.5; x += 0.8) B('Bar', x - 0.08, 1.0, 199.92, x + 0.08, 6.4, 200.08, [70, 74, 80], 'Metal', { ns: true });
    B('Lock', 13.6, 2.8, 200.4, 14.6, 4.3, 200.8, [150, 120, 40], 'Metal', { tag: 'GateLock' });
    [-12, 0, 12].forEach((x) => P('Roller', [0.5, 0.9, 0.9], [x, 0.45, 200], [40, 40, 44], 'Metal', { sh: 'Cylinder' }));
  }, 'MainGate');
  B('GateTrack', -46, 0, 199.75, 15, 0.1, 200.25, [80, 82, 86], 'Metal', { nc: true });
});

grp('GuardBooth', () => {
  const x0 = 22, x1 = 38, z0 = 176, z1 = 190, H = 9.6, F = 0.9;
  const wc = [222, 218, 206];
  B('Base', x0 - 0.6, 0, z0 - 0.6, x1 + 0.6, F, z1 + 0.6, [140, 136, 130], 'Concrete');
  B('Floor', x0 + 0.5, F, z0 + 0.5, x1 - 0.5, F + 0.05, z1 - 0.5, [150, 140, 120], 'CeramicTiles');
  wallHoles('Wall', 'z', z0, z1, F, H, x0, x0 + 0.5, [{ u0: z0 + 1.5, u1: z1 - 1.5, v0: F + 3, v1: F + 7.2 }], wc, 'Plaster');
  slider('z', z0 + 1.5, z1 - 1.5, F + 3, F + 7.2, x0 + 0.25);
  wallHoles('Wall', 'x', x0, x1, F, H, z1 - 0.5, z1, [{ u0: x0 + 1.5, u1: x1 - 3, v0: F + 3, v1: F + 7.2 }], wc, 'Plaster');
  slider('x', x0 + 1.5, x1 - 3, F + 3, F + 7.2, z1 - 0.25);
  wallHoles('Wall', 'x', x0, x1, F, H, z0, z0 + 0.5, [{ u0: 31, u1: 34.4, v0: F, v1: F + 7.2 }, { u0: 23.5, u1: 28.5, v0: F + 3.5, v1: F + 6.8 }], wc, 'Plaster');
  slider('x', 23.5, 28.5, F + 3.5, F + 6.8, z0 + 0.25);
  B('DoorFrame', 30.8, F, z0 - 0.1, 31, F + 7.4, z0 + 0.6, C.alumDark, 'Metal');
  B('DoorFrame', 34.4, F, z0 - 0.1, 34.6, F + 7.4, z0 + 0.6, C.alumDark, 'Metal');
  B('DoorFrame', 30.8, F + 7.2, z0 - 0.1, 34.6, F + 7.4, z0 + 0.6, C.alumDark, 'Metal');
  P('Door', [3.4, 7.2, 0.15], [35.6, F + 3.6, z0 - 1.5], [96, 104, 112], 'Metal', { r: [0, -70, 0] });
  wallHoles('Wall', 'z', z0, z1, F, H, x1 - 0.5, x1, [], wc, 'Plaster');
  B('Skirting', x0 - 0.1, F, z0 - 0.1, x1 + 0.1, F + 1.2, z0 + 0.0, [150, 144, 136], 'Concrete', { ns: true, nc: true });
  B('Roof', x0 - 1.4, H, z0 - 1.4, x1 + 1.4, H + 0.6, z1 + 1.4, [96, 92, 88], 'Concrete');
  B('Fascia', x0 - 1.5, H - 0.3, z0 - 1.5, x1 + 1.5, H + 0.9, z0 - 1.3, [70, 80, 100], 'Metal');
  B('Fascia', x0 - 1.5, H - 0.3, z1 + 1.3, x1 + 1.5, H + 0.9, z1 + 1.5, [70, 80, 100], 'Metal');
  B('Fascia', x0 - 1.5, H - 0.3, z0 - 1.5, x0 - 1.3, H + 0.9, z1 + 1.5, [70, 80, 100], 'Metal');
  B('Fascia', x1 + 1.3, H - 0.3, z0 - 1.5, x1 + 1.5, H + 0.9, z1 + 1.5, [70, 80, 100], 'Metal');
  B('Sign', 23.2, 7.6, z0 - 0.3, 28.8, 8.9, z0 - 0.05, [30, 50, 100], 'SmoothPlastic',
    { text: { face: 'Front', text: '경 비 실', color: [255, 255, 255], bg: [30, 50, 100], bgT: 0, lit: 0.4 } });
  B('PorchLight', 32, 8.4, z0 - 0.5, 33.4, 8.9, z0 - 0.05, [255, 236, 200], 'Neon', { nc: true, light: { type: 'Spot', face: 'Bottom', range: 18, angle: 110, brightness: 1.2, color: [255, 214, 170], shadows: true } });
  B('ACOutdoor', x1 + 0.1, F, 182, x1 + 2.1, F + 2.6, 186, [224, 224, 220], 'Metal');
  cylBetween('Pipe', [x1 + 0.3, F + 2.6, 183], [x1 + 0.3, F + 6.5, 183], 0.25, [230, 230, 226], 'SmoothPlastic', { nc: true });
  ceiling(x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, H - 0.6);
  troffer(29.5, 183, H - 0.6, true, { tag: 'BoothLight', light: { type: 'Surface', face: 'Bottom', range: 14, angle: 120, brightness: 1.2, color: [255, 236, 210], shadows: true } });
  wainscot('z', z0 + 0.5, z1 - 0.5, x1 - 0.5, -1, F, [], { h: 3.0, color: [170, 160, 140] });
  B('Desk', x0 + 0.5, F, 186.8, x1 - 0.5, F + 2.4, z1 - 0.5, [120, 112, 100], 'WoodPlanks');
  B('DeskTop', x0 + 0.5, F + 2.4, 186.6, x1 - 0.5, F + 2.6, z1 - 0.5, [184, 164, 132], 'Wood');
  grp('CCTV', () => {
    B('Rack', 28.6, F + 2.6, 188.6, 35.6, F + 7.6, 189.4, [34, 34, 38], 'Metal');
    const camNames = ['정문', '운동장', '1F 복도', '2F 복도', '3F 복도', '주차장'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      B('Bezel', 28.8 + c * 2.25, F + 2.85 + r * 2.35, 188.45, 30.9 + c * 2.25, F + 5.0 + r * 2.35, 188.6, [18, 18, 20], 'SmoothPlastic');
      B('Screen', 29.0 + c * 2.25, F + 3.0 + r * 2.35, 188.4, 30.7 + c * 2.25, F + 4.85 + r * 2.35, 188.45, pick([[70, 92, 104], [60, 84, 96], [80, 98, 108]]), 'Neon',
        { tag: 'CCTVScreen', attr: { Cam: r * 3 + c + 1 }, nc: true, ns: true,
          text: { face: 'Front', text: `CAM${r * 3 + c + 1} ${camNames[r * 3 + c]}`, color: [230, 240, 230], bgT: 1, lit: 0, font: 'Code', pps: 40 } });
    }
  });
  grp('Phone', () => {
    B('PhoneBase', 23.4, F + 2.6, 187.6, 25.0, F + 3.0, 188.8, [214, 210, 200], 'SmoothPlastic', { tag: 'Phone' });
    B('Handset', 23.3, F + 3.0, 187.8, 25.1, F + 3.35, 188.3, [214, 210, 200], 'SmoothPlastic');
    B('Keypad', 23.8, F + 3.0, 188.4, 24.6, F + 3.05, 188.75, [60, 60, 60], 'SmoothPlastic', { nc: true });
  });
  B('Logbook', 25.6, F + 2.6, 187.2, 27.4, F + 2.75, 188.4, [40, 70, 120], 'Fabric', { r: [0, 8, 0] });
  cylV('Mug', 27.9, F + 2.6, 187.3, 0.55, 0.45, [236, 236, 236], 'SmoothPlastic');
  B('Radio', 36.0, F + 2.6, 188.2, 37.4, F + 3.6, 189.2, [50, 50, 52], 'SmoothPlastic');
  grp('OfficeChair', () => {
    B('Seat', 25.4, F + 1.6, 184.0, 27.4, F + 2.0, 186.0, [36, 36, 40], 'Fabric');
    B('Back', 25.5, F + 2.2, 183.5, 27.3, F + 5.0, 183.9, [36, 36, 40], 'Fabric');
    cylV('Stem', 26.4, F, 185.0, 1.6, 0.3, C.steel, 'Metal');
    B('Foot', 25.2, F, 184.85, 27.6, F + 0.25, 185.15, C.steelDark, 'Metal');
    B('Foot', 26.25, F, 183.8, 26.55, F + 0.25, 186.2, C.steelDark, 'Metal');
  }, 'BoothChair');
  B('RulesPaper', x1 - 0.56, F + 3.0, 180.2, x1 - 0.5, F + 7.6, 185.4, [244, 238, 216], 'SmoothPlastic', {
    tag: 'RulesPaper', nc: true,
    text: { face: 'Left', align: 'Left', font: 'Arial', color: [30, 24, 20], bg: [244, 238, 216], bgT: 0, lit: 1, pps: 70,
      text: '[ 야간 경비원 근무 수칙 ]\n1. 근무는 22:00 ~ 06:00. 06시 전엔 절대 정문을 열지 마세요.\n2. 매시 정각 전, 1층·2층·3층 순찰함에 체크하세요.\n3. 4층은 없습니다. 4층 표지판이 보이면 즉시 경비실로.\n4. 전화가 오면 받으세요. 단, 당신 이름을 부르면 끊으세요.\n5. 운동장에 의자가 있으면 쳐다보지 마세요.\n6. 시계탑이 거꾸로 가면 건물에 들어가지 마세요.\n7. 복도의 학생에게 말을 걸지 마세요. 학생들은 모두 하교했습니다.\n8. 동상이 자리에 없다면, 찾지 마세요.' } });
  B('Tape', x1 - 0.58, F + 7.4, 180.0, x1 - 0.52, F + 7.8, 181.0, [230, 220, 180], 'SmoothPlastic', { nc: true, ns: true, t: 0.2 });
  B('Calendar', 31.5, F + 3.8, z0 + 0.5, 34.2, F + 6.8, z0 + 0.58, [250, 250, 248], 'SmoothPlastic', { nc: true,
    text: { face: 'Back', text: '2026\n11월\n13일 (금)', color: [180, 30, 30], bg: [250, 250, 248], bgT: 0 } });
  B('KeyBox', 23.4, F + 3.8, z0 + 0.5, 26.4, F + 6.8, z0 + 0.9, [150, 118, 78], 'Wood');
  for (let i = 0; i < 8; i++) B('Key', 23.8 + (i % 4) * 0.65, F + 4.6 + Math.floor(i / 4) * 1.2, z0 + 0.9, 24.0 + (i % 4) * 0.65, F + 5.2 + Math.floor(i / 4) * 1.2, z0 + 1.0, [200, 170, 80], 'Metal', { nc: true, ns: true });
  B('Cot', 33.8, F, 177.0, 37.4, F + 1.6, 184.2, [80, 100, 84], 'Fabric');
  B('Blanket', 34.0, F + 1.6, 179.0, 37.2, F + 1.9, 183.6, [150, 60, 60], 'Fabric', { nc: true });
  B('Heater', 22.7, F, 180.0, 24.2, F + 2.2, 181.4, [70, 70, 74], 'Metal');
  B('HeaterGlow', 24.2, F + 0.5, 180.2, 24.25, F + 1.8, 181.2, [255, 110, 40], 'Neon', { nc: true, ns: true, light: { type: 'Point', range: 7, brightness: 0.7, color: [255, 120, 50] } });
  B('WaterDispenser', 36.0, F, 176.8, 37.4, F + 4.4, 178.2, [236, 236, 240], 'SmoothPlastic');
  B('BoothSpawn', 28, F + 0.1, 181.5, 32, F + 0.2, 183.5, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BoothSpawn' });
  B('BoothZone', x0, F, z0, x1, H, z1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BoothZone' });
  grp('Barrier', () => {
    B('Housing', 16.6, 0, 192.6, 18.6, 4.0, 194.8, [230, 196, 50], 'SmoothPlastic');
    B('Stripe', 16.55, 2.6, 192.55, 18.65, 3.0, 194.85, [30, 30, 30], 'SmoothPlastic', { nc: true });
    const a = 78 * Math.PI / 180;
    for (let i = 0; i < 7; i++) {
      const d = (i + 0.5) * 3.4;
      P('Arm', [3.4, 0.45, 0.45], [17.6 - Math.cos(a) * d, 3.6 + Math.sin(a) * d, 193.7], i % 2 ? C.white : [200, 40, 40], 'SmoothPlastic', { r: [0, 0, -78] });
    }
  }, 'GateBarrier');
});

// ═════════════════════════ 4. 교정 ═════════════════════════
grp('Grounds', () => {
  B('Driveway', -12, 0, -116, 12, 0.2, 199.4, C.asphalt, 'Asphalt');
  B('Curb', -12.7, 0, -116, -12, 0.55, 199.4, C.curb, 'Concrete');
  B('Curb', 12, 0, -116, 12.7, 0.55, 92, C.curb, 'Concrete');
  B('Curb', 12, 0, 176, 12.7, 0.55, 199.4, C.curb, 'Concrete');
  for (let z = -108; z < 192; z += 10) B('DashLine', -0.18, 0.2, z, 0.18, 0.23, z + 5, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
  B('SlowText', -6, 0.2, 150, 6, 0.24, 160, [220, 220, 216], 'SmoothPlastic', { t: 1, nc: true, ns: true, text: { face: 'Top', text: '천 천 히', color: [225, 225, 220], bgT: 1, lit: 1 } });
  B('SpeedBump', -12, 0.2, 168, 12, 0.5, 170, [220, 190, 40], 'Rubber');
  B('Parking', 12, 0, 92, 108, 0.2, 176, [62, 63, 66], 'Asphalt');
  for (let i = 0; i < 10; i++) {
    const x = 18 + i * 9;
    B('ParkLine', x, 0.2, 96, x + 0.3, 0.23, 114, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
    B('ParkLine', x, 0.2, 154, x + 0.3, 0.23, 172, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
  }
  car('TeacherCar1', 31.6, 106, 180, [118, 18, 26], { plate: '12가 3456' });
  car('TeacherCar2', 67.6, 106, 180, [220, 220, 224], { plate: '48라 9012' });
  car('SchoolVan', 85.6, 163, 0, [42, 46, 52], { plate: '77바 1004' });
  const cx = -113, cz = 48;
  [[70, 112], [64.5, 106.5], [59, 101]].forEach(([a, b]) => {
    const N = 64;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2;
      const x0 = cx + a * Math.cos(t0), z0 = cz + b * Math.sin(t0), x1 = cx + a * Math.cos(t1), z1 = cz + b * Math.sin(t1);
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.2;
      const ang = Math.atan2(x1 - x0, z1 - z0) * (180 / Math.PI);
      P('TrackLine', [0.3, 0.05, len], [(x0 + x1) / 2, 0.03, (z0 + z1) / 2], [214, 212, 204], 'SmoothPlastic', { r: [0, ang, 0], nc: true, ns: true });
    }
  });
  B('HalfLine', cx - 46, 0, cz - 0.15, cx + 46, 0.05, cz + 0.15, [214, 212, 204], 'SmoothPlastic', { nc: true, ns: true });
  [[cz - 88, 1], [cz + 88, -1]].forEach(([z, dir]) => grp('SoccerGoal', () => {
    cylV('Post', cx - 11, 0, z, 7.8, 0.4, C.white, 'Metal');
    cylV('Post', cx + 11, 0, z, 7.8, 0.4, C.white, 'Metal');
    P('Crossbar', [22.4, 0.4, 0.4], [cx, 7.8, z], C.white, 'Metal', { sh: 'Cylinder' });
    cylBetween('Stay', [cx - 11, 7.8, z], [cx - 11, 0, z - dir * 6], 0.2, C.white, 'Metal');
    cylBetween('Stay', [cx + 11, 7.8, z], [cx + 11, 0, z - dir * 6], 0.2, C.white, 'Metal');
    B('Net', cx - 11, 0.1, Math.min(z, z - dir * 6), cx + 11, 7.6, Math.max(z, z - dir * 6), [230, 230, 230], 'Fabric', { t: 0.86, nc: true, ns: true });
  }));
  B('ChairSpot', cx - 1, 0, cz - 1, cx + 1, 0.1, cz + 1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'ChairSpot' });
  grp('Stands', () => {
    for (let i = 0; i < 4; i++) {
      B('Tier', -196, 0, -112 + i * 2.6, -30, 1.5 * (4 - i), -109.4 + i * 2.6, [178, 174, 166], 'Concrete');
      B('TierEdge', -196, 1.5 * (4 - i) - 0.15, -109.55 + i * 2.6, -30, 1.5 * (4 - i), -109.4 + i * 2.6, [150, 146, 140], 'Concrete', { nc: true, ns: true });
    }
    B('Podium', cx - 12, 0, -104, cx + 12, 5.2, -96, [190, 186, 178], 'Concrete');
    for (let i = 0; i < 4; i++) B('PodiumStep', cx - 4, 0, -96 + i * 1.1, cx + 4, 5.2 - (i + 1) * 1.3, -94.9 + i * 1.1, [180, 176, 168], 'Concrete');
    B('PodiumRail', cx - 12, 5.2, -104, cx + 12, 7.6, -103.7, [120, 124, 130], 'Metal', { t: 0.1 });
    B('PodiumRoof', cx - 13, 14.4, -106, cx + 13, 15, -95, [100, 104, 110], 'Metal');
    [cx - 12.2, cx + 12.2].forEach((x) => cylV('PodiumCol', x, 5.2, -96.5, 9.2, 0.6, [150, 154, 160], 'Metal'));
    B('Lectern', cx - 1.4, 5.2, -100, cx + 1.4, 8.6, -98.6, [120, 84, 54], 'Wood');
  });
  [[-139, [245, 245, 245]], [-131, [30, 60, 140]], [-95, [245, 245, 245]], [-87, [30, 120, 70]]].forEach(([x, flag], i) => grp('Flagpole', () => {
    B('Base', x - 0.8, 0, -116.8, x + 0.8, 0.6, -115.2, [160, 156, 150], 'Granite');
    cylV('Pole', x, 0.6, -116, 30, 0.38, [214, 216, 220], 'Metal');
    ball('Finial', x, 30.8, -116, 0.7, [200, 170, 70], 'Metal');
    if (i !== 2) P('Flag', [6, 4, 0.06], [x + 3.2, 27.6, -116], flag, 'Fabric', { nc: true, r: [0, 6, 2] });
  }));
  grp('Pergola', () => {
    for (let z = -6; z <= 78; z += 12) {
      B('Post', -214, 0, z - 0.4, -213.2, 9, z + 0.4, [110, 82, 58], 'Wood');
      B('Post', -205.8, 0, z - 0.4, -205, 9, z + 0.4, [110, 82, 58], 'Wood');
      B('BenchSeat', -213, 1.6, z + 2, -206, 1.9, z + 9, [150, 110, 70], 'WoodPlanks');
      B('BenchLeg', -212.5, 0, z + 5.2, -206.5, 1.6, z + 5.8, [90, 90, 94], 'Concrete');
    }
    B('Beam', -214.4, 9, -7, -213, 9.6, 80, [110, 82, 58], 'Wood');
    B('Beam', -206, 9, -7, -204.6, 9.6, 80, [110, 82, 58], 'Wood');
    for (let z = -7; z <= 80; z += 2) B('Rafter', -215.5, 9.6, z, -203.5, 10.0, z + 0.4, [120, 90, 64], 'Wood');
    for (let i = 0; i < 26; i++) ball('Wisteria', -209.5 + (rnd() - 0.5) * 9, 10.6 + rnd() * 1.4, -4 + i * 3.3, 4.5 + rnd() * 3, jit(pick([[96, 104, 52], [120, 110, 50], [86, 96, 48]]), 14), 'LeafyGrass', { nc: true });
  });
  grp('PullUpBars', () => {
    [0, 1, 2].forEach((i) => {
      const z = 112 + i * 6;
      cylV('Post', -206, 0, z, 7 - i, 0.35, [150, 60, 50], 'Metal');
      cylV('Post', -206, 0, z + 5, 7 - i, 0.35, [150, 60, 50], 'Metal');
      P('Bar', [5, 0.22, 0.22], [-206, 6.8 - i, z + 2.5], [190, 190, 194], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
    });
  });
  [[-202, -94], [-202, 188], [-30, -94], [-30, 188]].forEach(([x, z]) => grp('FloodLight', () => {
    cylV('Tower', x, 0, z, 48, 1.2, [150, 152, 156], 'Metal');
    B('Frame', x - 3.5, 46, z - 0.6, x + 3.5, 51.5, z + 0.6, [70, 72, 76], 'Metal');
    for (let i = 0; i < 6; i++) B('Lamp', x - 3.2 + (i % 3) * 2.2, 46.4 + Math.floor(i / 3) * 2.6, z - 0.75, x - 1.4 + (i % 3) * 2.2, 48.6 + Math.floor(i / 3) * 2.6, z - 0.6, [200, 200, 196], 'Glass', { nc: true, ns: true, tag: 'FieldLight' });
  }));
  B('Court', 112, 0, -20, 200, 0.2, 36, [60, 96, 120], 'Rubber');
  B('CourtLine', 155.8, 0.2, -18, 156.2, 0.23, 34, [230, 230, 226], 'SmoothPlastic', { nc: true, ns: true });
  [[116, 1], [196, -1]].forEach(([x, d]) => grp('Hoop', () => {
    cylV('Pole', x, 0.2, 8, 12, 0.5, [60, 64, 70], 'Metal');
    B('Board', x + d * 1.2 - 0.15, 10.5, 4.5, x + d * 1.2 + 0.15, 14, 11.5, [240, 240, 240], 'SmoothPlastic', { t: 0.15 });
    P('Rim', [0.15, 2.6, 2.6], [x + d * 2.6, 11.1, 8], [220, 90, 30], 'Metal', { sh: 'Cylinder', r: [0, 0, 90] });
  }));
  for (let z = -80; z <= 180; z += 22) tree(-212, z + 6, 'ginkgo', 26 + rnd() * 6);
  for (let x = -200; x <= -40; x += 20) tree(x, 192, 'ginkgo', 24 + rnd() * 6);
  for (let x = 46; x <= 210; x += 20) tree(x, 192, x % 40 === 6 ? 'pine' : 'zelkova', 24 + rnd() * 6);
  for (let z = -10; z <= 176; z += 20) tree(212, z, z % 40 === 10 ? 'pine' : 'ginkgo', 26 + rnd() * 6);
  for (let x = -200; x <= 200; x += 20) tree(x, -190, rnd() < 0.5 ? 'pine' : 'zelkova', 28 + rnd() * 6);
  for (let z = -90; z <= 140; z += 26) tree(-20, z, 'ginkgo', 22 + rnd() * 4);
  for (let z = -90; z <= 80; z += 26) tree(20, z, 'ginkgo', 22 + rnd() * 4);
  [[50, 40], [80, 52], [64, 72], [104, 70]].forEach(([x, z]) => tree(x, z, 'zelkova', 26));
  [[50, 26], [72, 62], [96, 84]].forEach(([x, z]) => grp('Bench', () => {
    B('Seat', x - 3, 1.6, z - 0.8, x + 3, 1.85, z + 0.8, [150, 110, 70], 'WoodPlanks');
    B('Back', x - 3, 2.1, z + 0.7, x + 3, 3.6, z + 0.9, [150, 110, 70], 'WoodPlanks');
    B('Leg', x - 2.6, 0, z - 0.7, x - 2.3, 2.1, z + 0.8, [60, 60, 64], 'Metal');
    B('Leg', x + 2.3, 0, z - 0.7, x + 2.6, 2.1, z + 0.8, [60, 60, 64], 'Metal');
  }));
  [[-17, 150], [-17, 100], [-17, 50], [-17, 0], [-17, -50], [-17, -100]].forEach(([x, z], i) => streetLight(x, z, 90, { h: 16, range: 36, flicker: i === 3 }));
  [[16, 120], [60, 178], [104, 130]].forEach(([x, z]) => streetLight(x, z, -90, { h: 16, range: 36 }));
  grp('BikeShed', () => {
    B('Roof', 30, 8, -116, 92, 8.4, -104, [70, 120, 150], 'Plastic', { t: 0.25 });
    for (let x = 30; x <= 92; x += 10.3) { B('Post', x - 0.2, 0, -104.8, x + 0.2, 8, -104.4, [80, 84, 90], 'Metal'); B('Post', x - 0.2, 0, -115.6, x + 0.2, 8, -115.2, [80, 84, 90], 'Metal'); }
    for (let i = 0; i < 11; i++) {
      const x = 34 + i * 5.4, col = pick([[180, 40, 40], [40, 80, 180], [30, 30, 30], [220, 220, 220], [60, 120, 70]]);
      P('Wheel', [0.25, 2.3, 2.3], [x, 1.15, -112.4], [24, 24, 24], 'Rubber', { sh: 'Cylinder', r: [0, 90, 0] });
      P('Wheel', [0.25, 2.3, 2.3], [x, 1.15, -108.2], [24, 24, 24], 'Rubber', { sh: 'Cylinder', r: [0, 90, 0] });
      cylBetween('Frame', [x, 1.2, -112.2], [x, 2.6, -110.0], 0.16, col, 'Metal');
      cylBetween('Frame', [x, 2.6, -110.0], [x, 1.2, -108.4], 0.16, col, 'Metal');
      cylBetween('Frame', [x, 2.6, -110.0], [x, 2.6, -108.8], 0.16, col, 'Metal');
      B('Saddle', x - 0.25, 2.9, -110.6, x + 0.25, 3.05, -109.6, [20, 20, 20], 'Leather');
    }
  });
});

// ═════════════════════════ 5. 체육관 (아치 지붕) ═════════════════════════
grp('Gym', () => {
  const x0 = 104, x1 = 200, z0 = -100, z1 = -30, H = 20;
  const wc = [214, 208, 196];
  B('Floor', x0, 0, z0, x1, 1, z1, [196, 156, 104], 'WoodPlanks');
  B('Base', x0 - 0.3, 0, z0 - 0.3, x1 + 0.3, 3, z1 + 0.3, C.brick, 'Brick');
  const holesX = [];
  for (let x = x0 + 4; x < x1 - 8; x += 10) holesX.push({ u0: x, u1: x + 7, v0: 11, v1: 17 });
  [[z1 - 0.8, z1], [z0, z0 + 0.8]].forEach(([a, b]) => {
    wallHoles('Wall', 'x', x0, x1, 3, H, a, b, holesX, wc, 'Plaster');
    holesX.forEach((h) => slider('x', h.u0, h.u1, h.v0, h.v1, (a + b) / 2));
  });
  wallHoles('Wall', 'z', z0, z1, 3, H, x0, x0 + 0.8, [{ u0: -72, u1: -58, v0: 3, v1: 12 }], wc, 'Plaster');
  wallHoles('Wall', 'z', z0, z1, 3, H, x1 - 0.8, x1, [], wc, 'Plaster');
  B('DoorL', x0 - 0.2, 1, -72, x0 + 0.2, 12, -65, [90, 120, 140], 'Glass', { t: 0.4, refl: 0.2 });
  B('DoorR', x0 - 0.2, 1, -65, x0 + 0.2, 12, -58, [90, 120, 140], 'Glass', { t: 0.4, refl: 0.2 });
  B('Canopy', x0 - 6, 12.5, -74, x0, 13.2, -56, [110, 114, 120], 'Metal');
  const R = 42, czm = (z0 + z1) / 2, half = (z1 - z0) / 2 + 1.5, cy = H - Math.sqrt(R * R - half * half);
  const a0 = Math.asin(half / R), N = 16;
  for (let i = 0; i < N; i++) {
    const t0 = -a0 + (2 * a0 * i) / N, t1 = -a0 + (2 * a0 * (i + 1)) / N, tm = (t0 + t1) / 2;
    const zc = czm + R * Math.sin(tm), yc = cy + R * Math.cos(tm);
    const len = 2 * R * Math.sin((t1 - t0) / 2) + 0.15;
    P('RoofPanel', [x1 - x0 + 3, 0.5, len], [(x0 + x1) / 2, yc, zc], [92, 112, 128], 'Metal', { r: [tm * 180 / Math.PI, 0, 0] });
  }
  for (let k = 0; k < 14; k++) {
    const t = -a0 + (2 * a0 * (k + 0.5)) / 14;
    const top = cy + R * Math.cos(t) - 0.3;
    if (top <= H) continue;
    [x0, x1 - 0.8].forEach((x) => B('Gable', x, H, czm + R * Math.sin(t) - half / 14, x + 0.8, top, czm + R * Math.sin(t) + half / 14, wc, 'Plaster'));
  }
  B('Sign', x0 - 0.3, 14, -73, x0 - 0.05, 17, -57, [30, 60, 120], 'SmoothPlastic', { text: { face: 'Left', text: '송 천 체 육 관', color: [255, 255, 255], bg: [30, 60, 120], bgT: 0, lit: 0.5 } });
  B('Stage', x1 - 14, 1, z0 + 1, x1 - 1, 5, z1 - 1, [140, 100, 60], 'WoodPlanks');
  B('Curtain', x1 - 2, 5, z0 + 3, x1 - 1.4, 18, z1 - 3, [130, 26, 36], 'Fabric');
});

// ═════════════════════════ 6. 본관 ═════════════════════════
const BX0 = -132.6, BX1 = 132.6, ZN = -172, CORR0 = -171.2, PART0 = -163.2, PART1 = -162.6, ROOM1 = -137.4, ZS = -136.6;
const LV = [1, 13.5, 26], FH = 12.5, ROOFY = 38.5, CEIL = 10.3;
const HALL0 = -10, HALL1 = 10, ROOMW = 30, WALL = 0.6;
const STAIR = { x0: 0.4, mid0: 4.9, mid1: 5.3, x1: 9.8, zStart: -140.4, zTurn: -152.1, zLand: -158.1 };
const ROOMS = [
  { L: ['교무실', '행정실', '보건실', '방송실'], R: ['1-1', '1-2', '과학실', '화장실'] },
  { L: ['2-1', '2-2', '2-3', '2-4'], R: ['2-5', '2-6', '도서실', '화장실'] },
  { L: ['3-1', '3-2', '3-3', '3-4'], R: ['3-5', '음악실', '미술실', '화장실'] },
];
const rooms = [];
for (let f = 0; f < 3; f++) for (let i = 0; i < 4; i++) {
  const xbL = HALL0 - i * (ROOMW + WALL), xaL = xbL - ROOMW;
  const xaR = HALL1 + i * (ROOMW + WALL), xbR = xaR + ROOMW;
  rooms.push({ xa: xaL, xb: xbL, f, L: LV[f], name: ROOMS[f].L[i], wing: 'L', i });
  rooms.push({ xa: xaR, xb: xbR, f, L: LV[f], name: ROOMS[f].R[i], wing: 'R', i });
}
const isClass = (n) => /^\d-\d$/.test(n);

function deskSet(dx, dz, L, gname) {
  grp(gname, () => {
    const top = L + 2.45;
    B('DeskTop', dx - 0.78, top, dz - 1.15, dx + 0.78, top + 0.12, dz + 1.15, C.laminate, 'Wood');
    B('DeskEdge', dx - 0.8, top - 0.02, dz - 1.17, dx + 0.8, top + 0.03, dz + 1.17, [120, 100, 76], 'SmoothPlastic', { nc: true, ns: true });
    B('BookRack', dx - 0.55, top - 0.75, dz - 1.0, dx + 0.65, top - 0.68, dz + 1.0, C.steel, 'Metal', { nc: true });
    B('RackBack', dx - 0.6, top - 0.75, dz - 1.0, dx - 0.55, top - 0.15, dz + 1.0, C.steel, 'Metal', { nc: true });
    [-1, 1].forEach((s) => {
      B('Leg', dx - 0.55, L, dz + s * 0.98 - 0.07, dx - 0.45, top, dz + s * 0.98 + 0.07, C.steel, 'Metal', { nc: true });
      B('Leg', dx + 0.5, L, dz + s * 0.98 - 0.07, dx + 0.6, top, dz + s * 0.98 + 0.07, C.steel, 'Metal', { nc: true });
      B('Foot', dx - 0.6, L, dz + s * 0.98 - 0.08, dx + 0.65, L + 0.12, dz + s * 0.98 + 0.08, C.steelDark, 'Metal', { nc: true });
    });
    B('DeskSide', dx - 0.6, L + 1.1, dz - 1.06, dx + 0.65, L + 1.2, dz + 1.06, C.steel, 'Metal', { nc: true, ns: true });
    const cx = dx + 1.85 + (rnd() - 0.5) * 0.5, cz = dz + (rnd() - 0.5) * 0.5, sh = L + 1.55;
    B('Seat', cx - 0.72, sh, cz - 0.75, cx + 0.72, sh + 0.12, cz + 0.75, C.laminate, 'Wood');
    P('Backrest', [0.12, 0.85, 1.45], [cx + 0.82, sh + 1.25, cz], C.laminate, 'Wood', { r: [0, 0, -8] });
    [-1, 1].forEach((s) => {
      B('CLeg', cx - 0.62, L, cz + s * 0.66 - 0.06, cx - 0.52, sh, cz + s * 0.66 + 0.06, C.steel, 'Metal', { nc: true });
      cylBetween('CBack', [cx + 0.62, L, cz + s * 0.66], [cx + 0.85, sh + 1.6, cz + s * 0.66], 0.11, C.steel, 'Metal', { nc: true });
      B('CRail', cx - 0.62, L + 0.6, cz + s * 0.66 - 0.05, cx + 0.66, L + 0.68, cz + s * 0.66 + 0.05, C.steel, 'Metal', { nc: true, ns: true });
    });
    if (rnd() < 0.2) B('Bag', dx + 0.6, L + 1.0, dz - 1.55, dx + 1.2, L + 2.3, dz - 1.17, pick([[34, 40, 70], [110, 30, 36], [36, 36, 36], [70, 90, 70], [150, 120, 90]]), 'Fabric', { nc: true });
    if (rnd() < 0.15) B('Book', dx - 0.5, top + 0.12, dz - 0.6, dx + 0.3, top + 0.24, dz + 0.4, pick([[200, 60, 60], [60, 90, 200], [240, 220, 120], [240, 240, 236]]), 'SmoothPlastic', { nc: true, r: [0, rnd() * 20 - 10, 0] });
    if (rnd() < 0.08) B('Jacket', cx + 0.85, sh + 0.6, cz - 0.72, cx + 1.05, sh + 1.85, cz + 0.72, pick([[30, 34, 60], [60, 60, 66]]), 'Fabric', { nc: true });
  }, 'DeskSet');
}

function blackboard(xa, L, zc, text) {
  B('BoardFrame', xa, L + 2.9, zc - 8.2, xa + 0.25, L + 8.3, zc + 8.2, [176, 178, 180], 'Metal');
  B('Blackboard', xa + 0.22, L + 3.1, zc - 8.0, xa + 0.32, L + 8.1, zc + 8.0, C.board, 'Slate', {
    tag: 'Blackboard', text: { face: 'Right', text: text || '', color: [226, 228, 218], bg: C.board, bgT: 1, font: 'PatrickHand', lit: 1, pps: 40 } });
  B('ChalkTray', xa + 0.22, L + 2.9, zc - 8.0, xa + 0.75, L + 3.05, zc + 8.0, [176, 178, 180], 'Metal', { nc: true });
  for (let i = 0; i < 4; i++) B('Chalk', xa + 0.4, L + 3.05, zc - 5 + i * 0.6, xa + 0.55, L + 3.17, zc - 4.6 + i * 0.6, pick([C.white, [240, 200, 200], [200, 220, 250], [250, 240, 160]]), 'SmoothPlastic', { nc: true, ns: true });
  B('Eraser', xa + 0.3, L + 3.05, zc + 3, xa + 0.7, L + 3.3, zc + 4, [60, 50, 90], 'Fabric', { nc: true, ns: true });
  B('MottoFrame', xa + 0.05, L + 8.7, zc - 3.6, xa + 0.25, L + 10.0, zc + 3.6, [110, 80, 52], 'Wood', { nc: true });
  B('Motto', xa + 0.2, L + 8.85, zc - 3.4, xa + 0.27, L + 9.85, zc + 3.4, [248, 246, 238], 'SmoothPlastic', { nc: true, tag: 'Motto',
    text: { face: 'Right', text: '급훈 · 늦게까지 남지 말자', color: [30, 30, 30], bg: [248, 246, 238], bgT: 0, font: 'Merriweather', pps: 60 } });
}

function interiorRoom(r) {
  const { xa, xb, L, name } = r;
  const z0 = PART1, z1 = ROOM1, zc = (z0 + z1) / 2;
  const top = L + CEIL;
  const restroom = name === '화장실';
  const doors = restroom ? [[xa + 1.5, xa + 5.1]] : [[xa + 1.8, xa + 5.4], [xb - 5.4, xb - 1.8]];
  if (restroom) {
    const tile = [218, 226, 230];
    B('TileN', xa, L, z0, xb, L + 7.5, z0 + 0.06, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileS', xa, L, z1 - 0.06, xb, L + 3.0, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileW', xa, L, z0, xa + 0.06, L + 7.5, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileE', xb - 0.06, L, z0, xb, L + 7.5, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileFloor', xa, L, z0, xb, L + 0.04, z1, C.tileFloor, 'CeramicTiles', { ns: true });
  } else {
    wainscot('x', xa, xb, z0, 1, L, doors);
    wainscot('x', xa, xb, z1, -1, L, [], { h: 2.6 });
    wainscot('z', z0, z1, xa, 1, L);
    wainscot('z', z0, z1, xb, -1, L);
  }
  ceiling(xa, xb, z0, z1, top);
  const lx = [xa + ROOMW * 0.2, xa + ROOMW * 0.5, xa + ROOMW * 0.8], lz = [z0 + 7, z1 - 7];
  lx.forEach((x, i) => lz.forEach((z, j) => {
    const main = i === 1 && j === 0;
    troffer(x, z, top, false, { tag: main ? ['RoomFixture', 'RoomLight'] : 'RoomFixture',
      light: main ? { type: 'Surface', face: 'Bottom', range: 22, angle: 120, brightness: 0, color: [230, 238, 255], enabled: false, shadows: true } : undefined });
  }));
  if (!restroom) {
    for (let k = 0; k < 3; k++) {
      const u0 = xa + 1.2 + k * 9.4, u1 = u0 + 8.8;
      [[u0 - 0.3, u0 + 1.4], [u1 - 1.4, u1 + 0.3]].forEach(([a, b]) => {
        for (let q = 0; q < 4; q++) {
          const w = (b - a) / 4;
          B('Curtain', a + q * w, L + 2.5, z1 - 0.7 + (q % 2) * 0.18, a + (q + 1) * w + 0.05, L + CEIL - 0.3, z1 - 0.55 + (q % 2) * 0.18, [226, 214, 186], 'Fabric', { nc: true, ns: q % 2 === 1 });
        }
      });
    }
    B('CurtainRail', xa + 0.6, L + CEIL - 0.35, z1 - 0.8, xb - 0.6, L + CEIL - 0.2, z1 - 0.4, C.alum, 'Metal', { nc: true, ns: true });
  }
  grp(name, () => {
    if (isClass(name) || ['과학실', '음악실', '미술실'].includes(name)) {
      const boardText = isClass(name) ? `11월 13일 (금)   주번 ${pick(['김', '이', '박', '최', '정'])}○○\n\n${pick(['기말고사 D-18', '수행평가 제출 (월)', '청소 당번: 1분단', '자습'])}` : '';
      blackboard(xa, L, zc, boardText);
      B('Lectern', xa + 3.4, L, zc - 1.1, xa + 5.2, L + 3.6, zc + 1.4, [140, 98, 60], 'Wood');
      B('LecternTop', xa + 3.2, L + 3.6, zc - 1.3, xa + 5.4, L + 3.75, zc + 1.6, [170, 124, 80], 'Wood');
      B('TV', xa + 0.15, L + 6.6, z1 - 6.2, xa + 0.45, L + 9.2, z1 - 1.6, [16, 16, 18], 'SmoothPlastic', { tag: 'ClassTV', refl: 0.15 });
      B('Speaker', xa + 0.1, L + 9.0, z0 + 1, xa + 0.5, L + 9.9, z0 + 2.2, [230, 230, 226], 'SmoothPlastic');
      B('AirCon', xa + 0.15, L + 7.5, z0 + 3.5, xa + 1.3, L + 9.6, z0 + 7.5, [238, 238, 234], 'SmoothPlastic');
      B('TeacherDesk', xa + 2.5, L, z1 - 9.5, xa + 7, L + 2.5, z1 - 6.5, [130, 132, 138], 'Metal');
      B('TeacherTop', xa + 2.4, L + 2.5, z1 - 9.6, xa + 7.1, L + 2.62, z1 - 6.4, [86, 108, 92], 'SmoothPlastic');
    }
    if (isClass(name)) {
      for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 6; c++) deskSet(xa + 9 + rr * 4.0, z0 + 3.4 + c * 3.75, L, `Desk_${rr + 1}_${c + 1}`);
      B('Lockers', xb - 1.6, L, z0 + 1.2, xb - 0.06, L + 4.8, z1 - 3, [196, 186, 156], 'WoodPlanks');
      for (let z = z0 + 1.2 + 2.3; z < z1 - 3.2; z += 2.3) B('LockerSeam', xb - 1.64, L + 0.15, z - 0.04, xb - 1.6, L + 4.65, z + 0.04, [110, 90, 66], 'SmoothPlastic', { nc: true, ns: true });
      B('LockerSeam', xb - 1.64, L + 2.36, z0 + 1.2, xb - 1.6, L + 2.44, z1 - 3, [110, 90, 66], 'SmoothPlastic', { nc: true, ns: true });
      B('Corkboard', xb - 0.2, L + 5.6, z0 + 4.5, xb - 0.06, L + 9.2, z1 - 4.5, [170, 126, 82], 'Fabric', { nc: true });
      for (let i = 0; i < 7; i++) {
        const z = z0 + 5.2 + i * 2.2 + rnd() * 0.4;
        B('Notice', xb - 0.25, L + 6 + rnd() * 1.2, z, xb - 0.21, L + 7.6 + rnd() * 1.2, z + 1.6, pick([[250, 250, 245], [255, 240, 160], [200, 230, 255], [255, 205, 210], [210, 245, 210]]), 'SmoothPlastic', { nc: true, ns: true });
      }
      B('CleaningCabinet', xb - 2.4, L, z1 - 2.6, xb - 0.06, L + 6.6, z1 - 0.06, [150, 156, 162], 'Metal');
      cylV('TrashBin', xb - 4.2, L, z1 - 1.2, 1.9, 1.5, [70, 130, 190], 'Plastic');
      cylV('RecycleBin', xb - 6.0, L, z1 - 1.2, 1.9, 1.5, [210, 180, 50], 'Plastic');
      P('ClassClock', [0.25, 1.6, 1.6], [xb - 0.15, L + 9.4, zc], [244, 244, 240], 'SmoothPlastic', { sh: 'Cylinder', tag: 'ClassClock', nc: true });
    } else if (name === '교무실') {
      for (let g = 0; g < 4; g++) for (let k = 0; k < 6; k++) {
        const x = xa + 6 + (g % 2) * 12 + (k % 2) * 3.6, z = z0 + 4.5 + Math.floor(g / 2) * 11 + Math.floor(k / 2) * 3.2;
        B('Desk', x - 1.7, L, z - 1.45, x + 1.7, L + 2.45, z + 1.45, [134, 138, 144], 'Metal');
        B('DeskTop', x - 1.75, L + 2.45, z - 1.5, x + 1.75, L + 2.57, z + 1.5, [214, 208, 192], 'SmoothPlastic');
        const glow = rnd() < 0.3, mx = x + (k % 2 ? -1.2 : 1.2);
        B('Monitor', mx - 0.08, L + 2.9, z - 1.0, mx + 0.08, L + 4.2, z + 1.0, glow ? [50, 80, 150] : [14, 14, 16], glow ? 'Neon' : 'SmoothPlastic', { nc: true, tag: glow ? 'GlowMonitor' : undefined });
        B('Stand', mx - 0.15, L + 2.57, z - 0.15, mx + 0.15, L + 2.9, z + 0.15, [30, 30, 32], 'SmoothPlastic', { nc: true });
        B('Papers', x - 1.2, L + 2.57, z - 0.6, x - 0.2, L + 2.7 + rnd() * 0.7, z + 0.6, [244, 244, 238], 'SmoothPlastic', { nc: true });
      }
      B('Whiteboard', xa + 0.1, L + 3.4, z0 + 4, xa + 0.3, L + 8.4, z1 - 4, [246, 246, 246], 'SmoothPlastic', { refl: 0.05,
        text: { face: 'Right', text: '11월 행사\n· 13일(금) 야간경비 교대\n· 신규 경비원: 공유 씨\n· ※ 4층 출입 금지', color: [30, 60, 160], bgT: 1, font: 'PatrickHand' } });
      B('Copier', xb - 4, L, z1 - 4, xb - 0.5, L + 3.8, z1 - 0.5, [226, 226, 222], 'SmoothPlastic');
      B('Sofa', xb - 3, L, z0 + 3, xb - 0.5, L + 2.4, z0 + 12, [96, 56, 46], 'Leather');
    } else if (name === '행정실') {
      B('Counter', xa + 1, L, z0 + 4, xb - 1, L + 3.6, z0 + 5.6, [170, 140, 100], 'WoodPlanks');
      B('CounterTop', xa + 0.9, L + 3.6, z0 + 3.8, xb - 0.9, L + 3.75, z0 + 5.8, [210, 200, 180], 'Marble');
      for (let k = 0; k < 4; k++) {
        const x = xa + 5 + k * 6.6;
        B('Desk', x - 1.8, L, z1 - 9, x + 1.8, L + 2.5, z1 - 6, [134, 138, 144], 'Metal');
        B('Monitor', x - 1.1, L + 2.5, z1 - 8.9, x + 1.1, L + 4.0, z1 - 8.75, [14, 14, 16], 'SmoothPlastic', { nc: true });
      }
      B('Safe', xb - 3.5, L, z1 - 3.5, xb - 0.5, L + 4, z1 - 0.5, [62, 64, 66], 'DiamondPlate');
      for (let k = 0; k < 3; k++) B('FileCabinet', xa + 0.5, L, z1 - 2.6 - k * 2.6, xa + 2.6, L + 5.4, z1 - 0.6 - k * 2.6, [150, 154, 160], 'Metal');
    } else if (name === '보건실') {
      for (let k = 0; k < 3; k++) {
        const x = xa + 6 + k * 8.5;
        B('BedFrame', x - 1.9, L + 0.8, z1 - 9.5, x + 1.9, L + 1.6, z1 - 1, [226, 226, 232], 'Metal');
        B('Mattress', x - 1.75, L + 1.6, z1 - 9.3, x + 1.75, L + 2.3, z1 - 1.2, [240, 242, 246], 'Fabric');
        B('Pillow', x - 1.3, L + 2.3, z1 - 2.8, x + 1.3, L + 2.75, z1 - 1.5, C.white, 'Fabric');
        B('BedCurtain', x + 2.9, L + 0.6, z1 - 10.5, x + 3.0, L + 9.2, z1 - 0.8, [196, 222, 226], 'Fabric', { t: 0.1 });
      }
      B('Blanket', xa + 4.3, L + 2.3, z1 - 8.5, xa + 7.7, L + 3.2, z1 - 3.5, [140, 168, 196], 'Fabric', { tag: 'SickBedLump' });
      B('MedCabinet', xa + 0.3, L, z0 + 2, xa + 2.3, L + 7, z0 + 9, [240, 240, 240], 'SmoothPlastic');
      B('Desk', xb - 7, L, z0 + 2, xb - 2, L + 2.5, z0 + 4.8, [134, 138, 144], 'Metal');
      B('EyeChart', xb - 0.2, L + 4, zc - 1.6, xb - 0.06, L + 8.2, zc + 1.6, C.white, 'SmoothPlastic',
        { text: { face: 'Left', text: 'E\nㅂ ㅍ\nㅁ ㅎ ㄹ\n나 를 봐\n뒤 에 있 어', color: [10, 10, 10], bgT: 1, font: 'Arial' } });
    } else if (name === '방송실') {
      B('Console', xa + 2, L, zc - 7, xa + 6, L + 2.8, zc + 7, [54, 56, 60], 'Metal', { tag: 'BroadcastConsole' });
      B('ConsoleTop', xa + 2, L + 2.8, zc - 7, xa + 6, L + 3.1, zc + 7, [36, 36, 40], 'SmoothPlastic');
      for (let i = 0; i < 24; i++) B('Fader', xa + 2.6 + (i % 4) * 0.8, L + 3.1, zc - 6 + Math.floor(i / 4) * 2.2, xa + 2.8 + (i % 4) * 0.8, L + 3.25, zc - 5.4 + Math.floor(i / 4) * 2.2,
        pick([[255, 60, 60], [60, 255, 120], [255, 200, 60], [200, 200, 200]]), i % 3 ? 'SmoothPlastic' : 'Neon', { nc: true, ns: true });
      cylV('MicStand', xa + 7.5, L, zc, 4.2, 0.18, C.steel, 'Metal');
      P('Mic', [0.6, 0.6, 1.2], [xa + 7.5, L + 4.4, zc], [30, 30, 30], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
      B('Speaker', xa + 0.2, L + 7.5, zc - 11, xa + 1.6, L + 10, zc - 8.4, [24, 24, 26], 'Fabric');
      B('Speaker', xa + 0.2, L + 7.5, zc + 8.4, xa + 1.6, L + 10, zc + 11, [24, 24, 26], 'Fabric');
      B('OnAir', xa + 0.1, L + 8.6, zc - 1.8, xa + 0.3, L + 9.8, zc + 1.8, [70, 16, 16], 'SmoothPlastic', { tag: 'OnAirSign',
        text: { face: 'Right', text: 'ON AIR', color: [255, 80, 80], bgT: 1, font: 'GothamBlack', lit: 0 } });
    } else if (name === '과학실') {
      for (let k = 0; k < 6; k++) {
        const x = xa + 10 + (k % 3) * 7, z = z0 + 7 + Math.floor(k / 3) * 11;
        B('LabBase', x - 2.3, L, z - 3.6, x + 2.3, L + 2.9, z + 3.6, [232, 232, 226], 'SmoothPlastic');
        B('LabTop', x - 2.5, L + 2.9, z - 3.8, x + 2.5, L + 3.15, z + 3.8, [26, 26, 28], 'Slate');
        cylBetween('Faucet', [x, L + 3.15, z + 0.8], [x, L + 4.5, z + 0.8], 0.15, C.steel, 'Metal', { nc: true });
        cylBetween('Faucet', [x, L + 4.5, z + 0.8], [x, L + 4.5, z + 0.2], 0.12, C.steel, 'Metal', { nc: true });
        [-2.2, 2.2].forEach((dz) => { cylV('StoolLeg', x + 3.4, L, z + dz, 1.9, 0.25, C.steel, 'Metal'); cylV('StoolTop', x + 3.4, L + 1.9, z + dz, 0.2, 1.3, [60, 90, 140], 'Plastic'); });
      }
      grp('Skeleton', () => {
        const x = xb - 3, z = z1 - 3.5, bone = [232, 226, 206];
        B('Stand', x - 0.9, L, z - 0.9, x + 0.9, L + 0.25, z + 0.9, C.steelDark, 'Metal');
        cylV('Pole', x, L + 0.25, z + 0.4, 6.6, 0.15, C.steel, 'Metal');
        ball('Skull', x, L + 7.6, z, 1.25, bone, 'SmoothPlastic');
        cylBetween('Spine', [x, L + 3.8, z + 0.1], [x, L + 7.0, z + 0.1], 0.25, bone, 'SmoothPlastic');
        for (let i = 0; i < 6; i++) P('Rib', [0.12, 0.12, 1.6 - i * 0.08], [x, L + 5.2 + i * 0.3, z - 0.2], bone, 'SmoothPlastic', { r: [0, 90, 0], nc: true, sh: 'Cylinder' });
        B('Pelvis', x - 0.8, L + 3.4, z - 0.35, x + 0.8, L + 3.9, z + 0.35, bone, 'SmoothPlastic');
        [-0.45, 0.45].forEach((d) => cylBetween('Leg', [x + d, L + 3.5, z], [x + d * 1.1, L + 0.3, z], 0.2, bone, 'SmoothPlastic', { nc: true }));
        [-1, 1].forEach((d) => cylBetween('Arm', [x + d * 0.85, L + 6.4, z], [x + d * 1.1, L + 3.6, z - 0.2], 0.16, bone, 'SmoothPlastic', { nc: true }));
      }, 'Skeleton');
      B('SpecimenShelf', xb - 1.6, L, z0 + 1.5, xb - 0.06, L + 7.6, z0 + 12, [126, 98, 70], 'Wood');
      for (let i = 0; i < 10; i++) cylV('Jar', xb - 0.9, L + 0.6 + (i % 4) * 1.8, z0 + 3 + Math.floor(i / 4) * 3.4, 1.3, 0.9, pick([[180, 200, 120], [200, 180, 140], [150, 190, 170]]), 'Glass', { t: 0.35, nc: true });
    } else if (name === '도서실') {
      for (let k = 0; k < 5; k++) {
        const x = xa + 5 + k * 5.2;
        B('Shelf', x - 0.75, L, z0 + 2, x + 0.75, L + 7.4, z0 + 14, [126, 92, 58], 'Wood');
        for (let sIdx = 0; sIdx < 4; sIdx++) for (let side = 0; side < 2; side++) {
          let z = z0 + 2.2;
          while (z < z0 + 13.4) {
            const w = 0.35 + rnd() * 0.45, h = 1.2 + rnd() * 0.45;
            B('Book', x - 0.72 + side * 0.76, L + 0.3 + sIdx * 1.8, z, x - 0.04 + side * 0.76, L + 0.3 + sIdx * 1.8 + h, z + w,
              pick([[150, 40, 40], [40, 70, 130], [50, 110, 70], [200, 170, 90], [90, 60, 120], [220, 220, 210], [60, 60, 60]]), 'SmoothPlastic', { nc: true, ns: true });
            z += w + 0.03;
          }
        }
      }
      for (let k = 0; k < 3; k++) {
        const x = xa + 7 + k * 8.5;
        B('ReadingTable', x - 2.8, L + 2.4, z1 - 10, x + 2.8, L + 2.6, z1 - 4, [176, 136, 90], 'Wood');
        B('TableLeg', x - 0.2, L, z1 - 7.2, x + 0.2, L + 2.4, z1 - 6.8, C.steelDark, 'Metal');
      }
    } else if (name === '음악실') {
      grp('Piano', () => {
        B('Body', xa + 2.5, L, z0 + 2.5, xa + 8.5, L + 4.4, z0 + 5, [14, 14, 16], 'SmoothPlastic', { refl: 0.25 });
        B('Keys', xa + 2.7, L + 2.6, z0 + 5, xa + 8.3, L + 2.85, z0 + 6.2, [244, 244, 240], 'SmoothPlastic', { nc: true });
        for (let i = 0; i < 20; i++) B('BlackKey', xa + 2.85 + i * 0.27, L + 2.85, z0 + 5, xa + 2.97 + i * 0.27, L + 2.98, z0 + 5.7, [14, 14, 16], 'SmoothPlastic', { nc: true, ns: true });
        B('Bench', xa + 4, L, z0 + 7, xa + 7, L + 1.7, z0 + 8.2, [14, 14, 16], 'SmoothPlastic');
      }, 'Piano');
      for (let rr = 0; rr < 4; rr++) for (let c = 0; c < 6; c++) {
        const x = xa + 12 + rr * 4.2, z = z0 + 4 + c * 3.6;
        B('Chair', x - 0.7, L + 1.5, z - 0.7, x + 0.7, L + 1.65, z + 0.7, [60, 70, 110], 'Plastic');
        B('ChairBack', x + 0.6, L + 1.65, z - 0.7, x + 0.72, L + 3, z + 0.7, [60, 70, 110], 'Plastic');
        cylV('Leg', x, L, z, 1.5, 0.2, C.steel, 'Metal', { nc: true });
      }
      B('Portrait', xb - 0.16, L + 5.6, zc - 1.8, xb - 0.06, L + 9.0, zc + 1.8, [50, 40, 30], 'Wood', { tag: 'Portrait',
        text: { face: 'Left', text: '베토벤\n1770-1827', color: [220, 200, 160], bg: [36, 30, 26], bgT: 0, font: 'Merriweather' } });
    } else if (name === '미술실') {
      for (let k = 0; k < 8; k++) {
        const x = xa + 10 + (k % 4) * 5, z = z0 + 6 + Math.floor(k / 4) * 12;
        cylBetween('EaselLeg', [x - 0.3, L, z - 0.9], [x - 0.1, L + 6.2, z], 0.18, [150, 110, 70], 'Wood');
        cylBetween('EaselLeg', [x - 0.3, L, z + 0.9], [x - 0.1, L + 6.2, z], 0.18, [150, 110, 70], 'Wood');
        cylBetween('EaselLeg', [x + 1.0, L, z], [x - 0.1, L + 5.6, z], 0.18, [150, 110, 70], 'Wood');
        B('Canvas', x - 0.75, L + 3.2, z - 1.3, x - 0.6, L + 5.8, z + 1.3, [242, 240, 234], 'Fabric');
      }
      grp('PlasterBust', () => {
        B('Pedestal', xa + 3.5, L, zc - 1.4, xa + 6.3, L + 3.8, zc + 1.4, [232, 230, 224], 'Marble');
        B('Shoulders', xa + 4.1, L + 3.8, zc - 1.3, xa + 5.7, L + 4.8, zc + 1.3, [242, 240, 234], 'Marble');
        cylV('Neck', xa + 4.9, L + 4.8, zc, 0.6, 0.7, [242, 240, 234], 'Marble');
        ball('Head', xa + 4.9, L + 6.0, zc, 1.6, [242, 240, 234], 'Marble', { tag: 'BustHead' });
        B('Nose', xa + 5.65, L + 5.8, zc - 0.12, xa + 5.85, L + 6.2, zc + 0.12, [236, 234, 228], 'Marble', { nc: true });
      }, 'PlasterBust');
    } else if (restroom) {
      const sx0 = xb - 5.4;
      for (let k = 0; k < 4; k++) {
        const za = z0 + 1.0 + k * 5.2, zb = za + 5.2;
        B('StallWall', sx0, L + 0.5, za - 0.08, xb, L + 7.4, za + 0.08, [214, 196, 186], 'Plastic');
        if (k === 3) B('StallWall', sx0, L + 0.5, zb - 0.08, xb, L + 7.4, zb + 0.08, [214, 196, 186], 'Plastic');
        B('StallFront', sx0 - 0.08, L + 0.5, za, sx0 + 0.08, L + 7.4, za + 0.9, [214, 196, 186], 'Plastic');
        B('StallFront', sx0 - 0.08, L + 0.5, zb - 0.9, sx0 + 0.08, L + 7.4, zb, [214, 196, 186], 'Plastic');
        if (k === 2) B('StallDoor', sx0 - 0.08, L + 0.5, za + 0.9, sx0 + 0.08, L + 7.4, zb - 0.9, [200, 180, 170], 'Plastic', { tag: 'StallDoor3',
          text: { face: 'Left', text: '사용중', color: [180, 40, 40], bgT: 1, lit: 1, pps: 30 } });
        else P('StallDoor', [0.16, 6.9, 3.4], [sx0 - 1.2, L + 3.95, za + 2.1], [200, 180, 170], 'Plastic', { r: [0, 60 + k * 10, 0], nc: true });
        B('ToiletBase', xb - 3.2, L, (za + zb) / 2 - 0.8, xb - 1.0, L + 1.6, (za + zb) / 2 + 0.8, [244, 244, 242], 'SmoothPlastic');
        B('ToiletTank', xb - 1.0, L + 1.3, (za + zb) / 2 - 1.0, xb - 0.1, L + 3.4, (za + zb) / 2 + 1.0, [244, 244, 242], 'SmoothPlastic');
        B('ToiletSeat', xb - 3.25, L + 1.6, (za + zb) / 2 - 0.85, xb - 0.95, L + 1.75, (za + zb) / 2 + 0.85, [236, 236, 234], 'SmoothPlastic');
      }
      B('Counter', xa + 0.06, L + 2.6, z0 + 6, xa + 2.4, L + 2.9, z1 - 4, [210, 206, 200], 'Marble');
      for (let k = 0; k < 4; k++) {
        const z = z0 + 8 + k * 3.6;
        P('Basin', [0.25, 1.6, 1.6], [xa + 1.3, L + 2.85, z], [246, 246, 244], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 0, 90] });
        cylBetween('Faucet', [xa + 0.4, L + 2.9, z], [xa + 0.4, L + 3.6, z], 0.15, C.steel, 'Metal', { nc: true });
        cylBetween('Faucet', [xa + 0.4, L + 3.6, z], [xa + 1.0, L + 3.6, z], 0.12, C.steel, 'Metal', { nc: true });
      }
      B('Mirror', xa + 0.06, L + 4.0, z0 + 6.5, xa + 0.14, L + 8.0, z1 - 4.5, [200, 210, 214], 'Glass', { refl: 0.85, tag: 'RestroomMirror' });
      B('RestroomSpot', xa + 6, L, zc - 1, xa + 8, L + 0.1, zc + 1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'RestroomSpot', attr: { Floor: r.f + 1 } });
    }
  }, isClass(name) ? 'Classroom' : restroom ? 'Restroom' : 'SpecialRoom');
}

grp('MainBuilding', () => {
  const HOLE = { x0: STAIR.mid1, x1: STAIR.x1, z0: STAIR.zTurn, z1: STAIR.zStart };
  B('Foundation', BX0 - 0.4, 0, ZN - 0.4, BX1 + 0.4, 1, ZS + 0.4, [140, 136, 130], 'Concrete');
  for (let f = 0; f < 4; f++) {
    const y1 = f < 3 ? LV[f] : ROOFY, y0 = y1 - 1;
    const deck = f === 3;
    const corr = deck ? C.roofGreen : C.corridorFloor, cm = deck ? 'Concrete' : 'CeramicTiles';
    const room = deck ? C.roofGreen : C.classFloor, rm = deck ? 'Concrete' : 'WoodPlanks';
    const hall = deck ? C.roofGreen : C.hallFloor, hm = deck ? 'Concrete' : 'Marble';
    const ya = f === 0 ? 0.9 : y0;
    B('CorridorFloor', BX0, ya, ZN, BX1, y1, PART1, corr, cm);
    B('WingFloor', BX0, ya, PART1, HALL0, y1, ZS, room, rm);
    B('WingFloor', HALL1, ya, PART1, BX1, y1, ZS, room, rm);
    if (f === 0) B('HallFloor', HALL0, ya, PART1, HALL1, y1, ZS, hall, hm);
    else {
      B('HallFloor', HALL0, y0, PART1, HOLE.x0, y1, ZS, hall, hm);
      B('HallFloor', HOLE.x0, y0, PART1, HALL1, y1, HOLE.z0, hall, hm);
      B('HallFloor', HOLE.x0, y0, HOLE.z1, HALL1, y1, ZS, hall, hm);
      B('HallFloor', HOLE.x1, y0, HOLE.z0, HALL1, y1, HOLE.z1, hall, hm);
    }
  }

  for (let f = 0; f < 3; f++) {
    const L = LV[f], top = L + FH - 1;
    grp(`F${f + 1}`, () => {
      const fr = rooms.filter((r) => r.f === f);
      const southHoles = [];
      fr.forEach((r) => {
        const frost = r.name === '화장실';
        for (let k = 0; k < 3; k++) {
          const u0 = r.xa + 1.2 + k * 9.4, u1 = u0 + 8.8;
          southHoles.push({ u0, u1, v0: L + 3.0, v1: L + 9.6 });
          slider('x', u0, u1, L + 3.0, L + 9.6, ROOM1 + 0.4, frost ? { glassColor: C.glassFrost, glassT: 0.15 } : {});
          B('Sill', u0 - 0.2, L + 2.75, ZS - 0.1, u1 + 0.2, L + 3.0, ZS + 0.7, [196, 192, 184], 'Concrete');
          B('InnerSill', u0, L + 2.9, ROOM1 - 0.5, u1, L + 3.05, ROOM1 + 0.1, [220, 216, 206], 'Marble', { nc: true });
        }
        B('Sunshade', r.xa - 0.3, L + 9.75, ZS, r.xb + 0.3, L + 10.15, ZS + 3.2, C.sunshade, 'Concrete');
        B('SunshadeLip', r.xa - 0.3, L + 9.5, ZS + 3.0, r.xb + 0.3, L + 10.15, ZS + 3.2, C.facadeShade, 'Concrete', { ns: true });
      });
      if (f === 0) southHoles.push({ u0: -8.5, u1: -0.5, v0: L, v1: L + 8.6 });
      else { southHoles.push({ u0: -8.5, u1: 8.5, v0: L - 1.5, v1: L + 10.6 }); slider('x', -8.5, 0, L - 1.5, L + 10.6, ROOM1 + 0.4); slider('x', 0, 8.5, L - 1.5, L + 10.6, ROOM1 + 0.4); }
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ROOM1, ZS, southHoles, C.facade, 'Plaster');
      if (f === 0) {
        [[-8.5, -4.5], [-4.5, -0.5]].forEach(([a, b], i) => {
          B('EntranceGlass', a + 0.15, L + 0.2, ROOM1 + 0.3, b - 0.15, L + 8.2, ROOM1 + 0.5, [130, 160, 170], 'Glass', { t: 0.55, refl: 0.15, nc: true, tag: i === 0 ? 'EntranceDoor' : undefined });
          B('EntranceFrame', a, L, ROOM1 + 0.2, a + 0.15, L + 8.6, ROOM1 + 0.6, C.alumDark, 'Metal');
          B('EntranceFrame', b - 0.15, L, ROOM1 + 0.2, b, L + 8.6, ROOM1 + 0.6, C.alumDark, 'Metal');
          B('PushBar', a + 0.6, L + 3.6, ROOM1 + 0.5, b - 0.6, L + 3.8, ROOM1 + 0.7, C.steel, 'Metal', { nc: true });
        });
        B('EntranceFrame', -8.5, L + 8.2, ROOM1 + 0.2, -0.5, L + 8.6, ROOM1 + 0.6, C.alumDark, 'Metal');
      }
      const northHoles = [];
      for (let x = BX0 + 5; x < BX1 - 12; x += 15.5) northHoles.push({ u0: x, u1: x + 10, v0: L + 3.6, v1: L + 9.4 });
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ZN, CORR0, northHoles, C.facade, 'Plaster');
      northHoles.forEach((h) => {
        slider('x', h.u0, h.u1, h.v0, h.v1, ZN + 0.4);
        B('Sill', h.u0 - 0.2, h.v0 - 0.25, ZN - 0.7, h.u1 + 0.2, h.v0, ZN + 0.1, [196, 192, 184], 'Concrete');
      });
      [[BX0, BX0 + 0.8, -1], [BX1 - 0.8, BX1, 1]].forEach(([x0, x1, s]) => {
        const holes = [{ u0: -169.5, u1: -165.5, v0: L, v1: L + 7.4 }, { u0: -158, u1: -142, v0: L + 3.4, v1: L + 9.4 }];
        wallHoles('EndWall', 'z', ZN, ZS, L - 1, top, x0, x1, holes, C.facade, 'Plaster');
        slider('z', -158, -142, L + 3.4, L + 9.4, (x0 + x1) / 2);
        B('ExitDoor', x0 + (s > 0 ? 0 : 0.6), L, -169.5, x0 + (s > 0 ? 0.2 : 0.8), L + 7.4, -165.5, [96, 120, 110], 'Metal');
        const sx = s > 0 ? x0 - 0.35 : x1 + 0.05;
        B('ExitSign', sx, L + 7.9, -169.2, sx + 0.3, L + 8.9, -165.8, [30, 200, 100], 'Neon', { nc: true, ns: true, tag: 'ExitSign',
          text: { face: s > 0 ? 'Left' : 'Right', text: '비상구', color: [255, 255, 255], bgT: 1, lit: 0, font: 'GothamBlack', pps: 60 },
          light: { type: 'Point', range: 9, brightness: 0.5, color: [60, 255, 140] } });
        wainscot('z', CORR0, PART0, s > 0 ? x0 : x1, -s, L, [[-169.5, -165.5]]);
      });
      fr.forEach((r) => {
        const restroom = r.name === '화장실';
        const doorList = restroom ? [[r.xa + 1.5, r.xa + 5.1]] : [[r.xa + 1.8, r.xa + 5.4], [r.xb - 5.4, r.xb - 1.8]];
        const holes = doorList.map(([a, b]) => ({ u0: a, u1: b, v0: L, v1: L + 7.2 }));
        if (!restroom) holes.push({ u0: r.xa + 8, u1: r.xb - 8, v0: L + 7.6, v1: L + 9.4 });
        wallHoles('PartitionWall', 'x', r.xa - WALL / 2, r.xb + WALL / 2, L, top, PART0, PART1, holes, C.wallIvory, 'Plaster');
        if (!restroom) {
          const hw = r.xb - r.xa - 16;
          for (let k = 0; k < 3; k++) slider('x', r.xa + 8 + (k * hw) / 3, r.xa + 8 + ((k + 1) * hw) / 3, L + 7.6, L + 9.4, (PART0 + PART1) / 2, { depth: 0.6 });
        }
        doorList.forEach(([a, b], di) => {
          B('Casing', a - 0.3, L, PART0 - 0.12, a, L + 7.5, PART1 + 0.12, C.woodDark, 'Wood');
          B('Casing', b, L, PART0 - 0.12, b + 0.3, L + 7.5, PART1 + 0.12, C.woodDark, 'Wood');
          B('Casing', a - 0.3, L + 7.2, PART0 - 0.12, b + 0.3, L + 7.5, PART1 + 0.12, C.woodDark, 'Wood');
          const da = b - 0.3, db = da + (b - a) + 0.3;
          B('SlidingDoor', da, L + 0.05, PART0 - 0.36, db, L + 7.15, PART0 - 0.18, [176, 132, 88], 'WoodPlanks', { nc: true });
          B('DoorWindow', da + 0.6, L + 4.0, PART0 - 0.4, db - 0.6, L + 6.6, PART0 - 0.37, C.glass, 'Glass', { t: 0.4, nc: true });
          B('DoorHandle', di === 0 ? db - 0.5 : da + 0.3, L + 3.3, PART0 - 0.44, di === 0 ? db - 0.3 : da + 0.5, L + 4.1, PART0 - 0.36, C.steel, 'Metal', { nc: true });
        });
        const label = isClass(r.name) ? `${r.name[0]}학년 ${r.name[2]}반` : r.name;
        B('RoomSign', r.xa + 1.6, L + 8.0, PART0 - 2.0, r.xa + 5.6, L + 9.2, PART0 - 0.2, [246, 246, 240], 'SmoothPlastic', {
          nc: true, tag: 'RoomSign', attr: { Room: r.name }, text: { face: 'Front', text: label, color: [30, 40, 70], bg: [246, 246, 240], bgT: 0, lit: 1, pps: 70 } });
        if (r.xa - WALL > BX0 + 0.5 && !(r.xa - WALL >= HALL0 - 0.5 && r.xa <= HALL1 + 0.5)) B('RoomWall', r.xa - WALL, L, PART1, r.xa, top, ROOM1, C.wallIvory, 'Plaster');
        interiorRoom(r);
      });
      grp('Corridor', () => {
        ceiling(BX0 + 0.8, BX1 - 0.8, CORR0, PART0, L + CEIL);
        for (let x = BX0 + 6; x < BX1 - 3; x += 8) {
          const idx = Math.round((x - BX0) / 8);
          const on = Math.abs(x) < 60 || idx % 3 === 0;
          const fl = rnd() < 0.2;
          troffer(x, (CORR0 + PART0) / 2, L + CEIL, on, { tag: fl ? ['CorridorLight', 'FlickerLight'] : 'CorridorLight',
            light: idx % 2 === 0 ? { type: 'Surface', face: 'Bottom', range: 16, angle: 120, brightness: on ? 0.9 : 0, color: [214, 228, 255], enabled: on, shadows: true } : undefined });
        }
        wainscot('x', BX0 + 0.8, BX1 - 0.8, CORR0, 1, L);
        fr.forEach((r) => {
          const restroom = r.name === '화장실';
          const doorList = restroom ? [[r.xa + 1.2, r.xa + 5.4]] : [[r.xa + 1.5, r.xa + 5.7], [r.xb - 5.7, r.xb - 1.5]];
          wainscot('x', r.xa - 0.3, r.xb + 0.3, PART0, -1, L, doorList);
          if (restroom) return;
          const a = r.xa + 9.2, b = r.xb - 9.2;
          B('HallLockers', a, L, PART0 - 1.5, b, L + 6, PART0 - 0.02, [150, 170, 186], 'Metal');
          B('LockerTop', a - 0.05, L + 6, PART0 - 1.55, b + 0.05, L + 6.12, PART0, [120, 140, 156], 'Metal', { nc: true });
          for (let x = a + 1.5; x < b - 0.1; x += 1.5) B('LockerSeam', x - 0.03, L + 0.1, PART0 - 1.54, x + 0.03, L + 5.9, PART0 - 1.5, [90, 106, 120], 'SmoothPlastic', { nc: true, ns: true });
          [2, 4].forEach((y) => B('LockerSeam', a, L + y - 0.03, PART0 - 1.54, b, L + y + 0.03, PART0 - 1.5, [90, 106, 120], 'SmoothPlastic', { nc: true, ns: true }));
        });
        for (let x = BX0 + 18; x < BX1 - 10; x += 48) {
          B('Hydrant', x, L + 1.2, ZN + 0.8, x + 2.6, L + 5.6, ZN + 1.4, [190, 30, 30], 'Metal', { text: { face: 'Back', text: '소화전', color: [255, 255, 255], bgT: 1, lit: 0.6 } });
          B('Extinguisher', x + 3.2, L, ZN + 0.9, x + 3.9, L + 2.0, ZN + 1.6, [200, 30, 30], 'SmoothPlastic');
          B('Bulletin', x + 6, L + 4.2, ZN + 0.8, x + 15, L + 8.4, ZN + 1.0, [170, 126, 82], 'Fabric', { nc: true });
          for (let p = 0; p < 4; p++) B('Poster', x + 6.4 + p * 2.2, L + 4.6 + rnd() * 0.8, ZN + 1.0, x + 8.2 + p * 2.2, L + 6.8 + rnd() * 1.0, ZN + 1.05,
            pick([[250, 230, 120], [200, 230, 255], [255, 200, 200], [240, 240, 236]]), 'SmoothPlastic', { nc: true, ns: true });
          ball('CCTVDome', x + 20, L + CEIL - 0.3, (CORR0 + PART0) / 2, 0.8, [24, 24, 26], 'SmoothPlastic', { nc: true, ns: true });
          B('Purifier', x + 30, L, ZN + 0.8, x + 32, L + 4.4, ZN + 2.4, [236, 236, 240], 'SmoothPlastic');
        }
        [BX0 + 3, BX1 - 3].forEach((x) =>
          B('FigureSpot', x - 1, L, -168, x + 1, L + 0.1, -166, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'FigureSpot', attr: { Floor: f + 1 } }));
        B('PatrolBox', -24, L + 3.2, ZN + 0.8, -20.4, L + 6.4, ZN + 1.6, [56, 84, 66], 'Metal', {
          tag: 'PatrolPoint', attr: { Floor: f + 1 }, text: { face: 'Back', text: `순찰함\n${f + 1}F`, color: [255, 255, 255], bgT: 1, lit: 0.3 } });
        B('FloorSign', -3, L + 8.4, ZN + 0.8, 3, L + 9.8, ZN + 0.95, [30, 50, 100], 'SmoothPlastic', { nc: true,
          text: { face: 'Back', text: `${f + 1}F`, color: [255, 255, 255], bg: [30, 50, 100], bgT: 0, lit: 0.6, font: 'GothamBlack' } });
      });
      B('HallWall', HALL0 - WALL, L, PART1, HALL0, top, ROOM1, C.wallIvory, 'Plaster');
      B('HallWall', HALL1, L, PART1, HALL1 + WALL, top, ROOM1, C.wallIvory, 'Plaster');
      wainscot('z', PART1, ROOM1, HALL0, 1, L);
      wainscot('z', PART1, ROOM1, HALL1, -1, L);
      if (f === 0) {
        B('ShoeLockers', -9.8, L, -160, -1.5, L + 6.4, -157.6, [176, 144, 104], 'WoodPlanks');
        for (let x = -9.8 + 1.05; x < -1.6; x += 1.05) B('ShoeSeam', x - 0.03, L + 0.1, -157.62, x + 0.03, L + 6.3, -157.58, [120, 96, 70], 'SmoothPlastic', { nc: true, ns: true });
        for (let y = 1.3; y < 6.4; y += 1.3) B('ShoeSeam', -9.8, L + y - 0.03, -157.62, -1.5, L + y + 0.03, -157.58, [120, 96, 70], 'SmoothPlastic', { nc: true, ns: true });
        B('MirrorFrame', -9.95, L + 1, -152, -9.75, L + 9.6, -142, C.woodDark, 'Wood');
        B('Mirror', -9.78, L + 1.3, -151.7, -9.7, L + 9.3, -142.3, [196, 206, 210], 'Glass', { refl: 0.85, tag: 'HallMirror' });
        B('MirrorText', -9.95, L + 9.7, -150, -9.75, L + 10.2, -144, C.woodDark, 'Wood', { text: { face: 'Right', text: '바른 자세 · 단정한 용모', color: [240, 230, 200], bgT: 1, pps: 60 } });
        B('TrophyCase', -9.8, L, -140.6, -6.6, L + 7.6, -137.6, [110, 80, 52], 'Wood');
        B('TrophyGlass', -6.62, L + 1, -140.4, -6.58, L + 7.2, -137.8, [180, 200, 210], 'Glass', { t: 0.6, nc: true });
        B('Plaque', 9.75, L + 5, -152, 9.95, L + 9, -142, [60, 40, 26], 'Wood', { text: { face: 'Left', text: '교 훈\n\n성실 · 정직 · 배려', color: [230, 210, 160], bg: [60, 40, 26], bgT: 0, font: 'Merriweather' } });
        cylV('Pot', -2.6, L, -141, 2, 2, [150, 90, 60], 'Brick');
        ball('Plant', -2.6, L + 3.4, -141, 3, [50, 90, 50], 'LeafyGrass', { nc: true });
        B('Doormat', -8.4, L, -140, -0.6, L + 0.08, -137.5, [60, 60, 64], 'Carpet', { nc: true });
      }
      ceiling(HALL0, STAIR.x0 - 0.1, PART1, ROOM1, L + CEIL);
      troffer(-5, -150, L + CEIL, f === 0, { light: { type: 'Surface', face: 'Bottom', range: 16, angle: 120, brightness: f === 0 ? 0.8 : 0, color: [220, 230, 255], enabled: f === 0, shadows: true } });
      grp('Stairs', () => {
        const n = 9, rise = FH / 2 / n, run = (STAIR.zStart - STAIR.zTurn) / n;
        for (let i = 0; i < n; i++) {
          B('Step', STAIR.x0, L + i * rise, STAIR.zStart - (i + 1) * run, STAIR.mid0, L + (i + 1) * rise, STAIR.zStart - i * run, [176, 178, 172], 'Marble');
          B('Nosing', STAIR.x0, L + (i + 1) * rise - 0.02, STAIR.zStart - i * run - 0.35, STAIR.mid0, L + (i + 1) * rise + 0.03, STAIR.zStart - i * run, [50, 50, 52], 'Rubber', { nc: true, ns: true });
          const y2 = L + FH / 2 + i * rise;
          B('Step', STAIR.mid1, y2, STAIR.zTurn + i * run, STAIR.x1, y2 + rise, STAIR.zTurn + (i + 1) * run, [176, 178, 172], 'Marble');
          B('StepUnder', STAIR.mid1, y2 - 0.6, STAIR.zTurn + i * run, STAIR.x1, y2, STAIR.zTurn + (i + 1) * run, [200, 198, 192], 'Plaster', { ns: true });
          B('Nosing', STAIR.mid1, y2 + rise - 0.02, STAIR.zTurn + (i + 1) * run - 0.35, STAIR.x1, y2 + rise + 0.03, STAIR.zTurn + (i + 1) * run, [50, 50, 52], 'Rubber', { nc: true, ns: true });
        }
        B('Landing', STAIR.x0, L + FH / 2 - 1, STAIR.zLand, STAIR.x1, L + FH / 2, STAIR.zTurn, [176, 178, 172], 'Marble');
        B('Divider', STAIR.mid0, L, STAIR.zTurn, STAIR.mid1, L + FH, STAIR.zStart, C.wallIvory, 'Plaster');
        cylBetween('Handrail', [STAIR.mid0 - 0.15, L + 3.1, STAIR.zStart], [STAIR.mid0 - 0.15, L + FH / 2 + 3.1, STAIR.zTurn], 0.22, C.rail, 'Wood', { nc: true });
        cylBetween('Handrail', [STAIR.mid1 + 0.15, L + FH / 2 + 3.1, STAIR.zTurn], [STAIR.mid1 + 0.15, L + FH + 3.1, STAIR.zStart], 0.22, C.rail, 'Wood', { nc: true });
        if (f > 0) {
          B('HoleRail', STAIR.mid1, L + 3.4, STAIR.zTurn - 0.15, STAIR.x1, L + 3.6, STAIR.zTurn + 0.05, C.rail, 'Wood');
          for (let x = STAIR.mid1 + 0.4; x < STAIR.x1; x += 0.7) B('Baluster', x - 0.05, L, STAIR.zTurn - 0.1, x + 0.05, L + 3.4, STAIR.zTurn, C.steel, 'Metal', { ns: true });
        }
        const landingText = f < 2 ? `${f + 2}F ↑` : '옥상 ↑ (출입금지)';
        B('StairSign', STAIR.x0 + 0.2, L + 9.2, STAIR.zLand + 0.1, STAIR.mid0, L + 10.8, STAIR.zLand + 0.25, [246, 246, 240], 'SmoothPlastic', {
          nc: true, tag: 'StairSign', attr: { Floor: f + 1 }, text: { face: 'Back', text: landingText, color: [30, 40, 70], bg: [246, 246, 240], bgT: 0, lit: 1, font: 'GothamBlack', pps: 70 } });
        B('StairLight', STAIR.x0 + 2, L + FH - 1.4, STAIR.zLand + 1, STAIR.x0 + 4, L + FH - 1.2, STAIR.zLand + 2, [240, 244, 250], f === 0 ? 'Neon' : 'SmoothPlastic', {
          nc: true, ns: true, tag: 'CorridorLight', light: { type: 'Point', range: 14, brightness: f === 0 ? 0.6 : 0, color: [220, 230, 255], enabled: f === 0, shadows: true } });
      });
    });
  }

  grp('Facade', () => {
    B('BaseBand', BX0 - 0.3, 0, ZS - 0.2, BX1 + 0.3, 3.2, ZS + 0.35, [120, 116, 110], 'Granite');
    B('BaseBand', BX0 - 0.3, 0, ZN - 0.35, BX1 + 0.3, 3.2, ZN + 0.2, [120, 116, 110], 'Granite');
    B('BaseBand', BX0 - 0.35, 0, ZN - 0.35, BX0 + 0.2, 3.2, ZS + 0.35, [120, 116, 110], 'Granite');
    B('BaseBand', BX1 - 0.2, 0, ZN - 0.35, BX1 + 0.35, 3.2, ZS + 0.35, [120, 116, 110], 'Granite');
    [LV[1], LV[2], ROOFY].forEach((y) => {
      B('FloorBand', BX0 - 0.35, y - 1.1, ZS - 0.1, BX1 + 0.35, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
      B('FloorBand', BX0 - 0.35, y - 1.1, ZN - 0.4, BX1 + 0.35, y + 0.15, ZN + 0.1, C.facadeShade, 'Concrete');
      B('FloorBand', BX0 - 0.4, y - 1.1, ZN - 0.4, BX0 + 0.1, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
      B('FloorBand', BX1 - 0.1, y - 1.1, ZN - 0.4, BX1 + 0.4, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
    });
    const pil = new Set([BX0, BX1]);
    rooms.filter((r) => r.f === 0).forEach((r) => { pil.add(Math.round((r.xa - WALL / 2) * 10) / 10); pil.add(Math.round((r.xb + WALL / 2) * 10) / 10); });
    [...pil].forEach((x) => {
      B('Pilaster', x - 0.55, 3.2, ZS - 0.1, x + 0.55, ROOFY + 3.2, ZS + 0.6, [218, 214, 204], 'Plaster');
      if (Math.abs(x) > 100 && Math.abs(x) < 110) {
        cylBetween('Downpipe', [x + 0.9, 0.3, ZS + 0.5], [x + 0.9, ROOFY + 0.8, ZS + 0.5], 0.45, [186, 186, 182], 'Plastic', { nc: true });
        B('Shoe', x + 0.6, 0, ZS + 0.3, x + 1.4, 0.4, ZS + 1.4, [186, 186, 182], 'Plastic', { nc: true });
      }
    });
    B('TowerFace', -11, 0, ZS, -9, ROOFY + 14, ZS + 1.6, [220, 216, 206], 'Plaster');
    B('TowerFace', 9, 0, ZS, 11, ROOFY + 14, ZS + 1.6, [220, 216, 206], 'Plaster');
    B('TowerCap', -11.5, ROOFY + 14, ZS - 6, 11.5, ROOFY + 15.2, ZS + 2, C.facadeShade, 'Concrete');
    B('Canopy', -14, 9.8, ZS, 14, 10.6, ZS + 9, [196, 192, 184], 'Concrete');
    B('CanopyFascia', -14.2, 9.2, ZS + 8.7, 14.2, 11.0, ZS + 9.2, [52, 60, 80], 'Metal', {
      text: { face: 'Back', text: '송 천 고 등 학 교', color: [236, 226, 196], bgT: 1, font: 'Merriweather', lit: 1, pps: 60 } });
    [-12.8, 12.8].forEach((x) => cylV('CanopyColumn', x, 1, ZS + 8, 8.8, 1.1, [200, 196, 188], 'Concrete'));
    B('EntranceSteps', -14, 0, ZS, 14, 0.5, ZS + 8, [160, 156, 150], 'Granite');
    B('EntranceSteps', -14, 0.5, ZS, 14, 1.0, ZS + 4, [160, 156, 150], 'Granite');
    B('Ramp', 14, 0, ZS, 20, 1.0, ZS + 2, [160, 156, 150], 'Concrete');
    for (let i = 0; i < 2; i++) B('CanopyLight', -6 + i * 8, 9.6, ZS + 3.5, -2 + i * 8, 9.8, ZS + 5.5, [255, 240, 210], 'Neon', { nc: true, ns: true, light: { type: 'Surface', face: 'Bottom', range: 16, angle: 110, brightness: 0.8, color: [255, 220, 170], shadows: true } });
    [[BX0 + 2, HALL0 - 6], [HALL1 + 8, BX1 - 2]].forEach(([x0, x1]) => {
      B('BedEdge', x0, 0, ZS + 3.4, x1, 1.1, ZS + 3.9, [150, 146, 140], 'Granite');
      B('BedEdge', x0, 0, ZS + 8.6, x1, 1.1, ZS + 9.1, [150, 146, 140], 'Granite');
      B('Soil', x0, 0, ZS + 3.9, x1, 0.8, ZS + 8.6, [72, 56, 42], 'Ground', { ns: true });
      hedge(x0 + 0.4, ZS + 4.4, x1 - 0.4, ZS + 8.1, 2.4);
    });
    B('FrontPaving', BX0 - 6, 0, ZS, BX1 + 6, 0.12, ZS + 20, [152, 146, 138], 'Pavement');
    for (let i = 0; i < 6; i++) {
      const x = -120 + i * 40;
      if (Math.abs(x) < 20) continue;
      B('ACOutdoor', x, LV[1] + 10.15, ZS + 0.6, x + 3, LV[1] + 12.2, ZS + 2.6, [222, 222, 218], 'Metal');
      P('Fan', [0.08, 1.4, 1.4], [x + 1.5, LV[1] + 11.2, ZS + 2.62], [100, 100, 104], 'Metal', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
    }
  });

  grp('Roof', () => {
    const rail = (x0, z0, x1, z1) => {
      B('Parapet', x0, ROOFY, z0, x1, ROOFY + 3, z1, C.facade, 'Plaster');
      B('ParapetCap', x0 - 0.15, ROOFY + 3, z0 - 0.15, x1 + 0.15, ROOFY + 3.3, z1 + 0.15, C.facadeShade, 'Concrete');
      const along = x1 - x0 > z1 - z0, len = Math.max(x1 - x0, z1 - z0);
      const cx2 = (x0 + x1) / 2, cz2 = (z0 + z1) / 2;
      if (along) { B('Rail', x0, ROOFY + 6.2, cz2 - 0.12, x1, ROOFY + 6.45, cz2 + 0.12, [140, 146, 150], 'Metal'); B('Rail', x0, ROOFY + 4.8, cz2 - 0.08, x1, ROOFY + 5.0, cz2 + 0.08, [140, 146, 150], 'Metal'); }
      else { B('Rail', cx2 - 0.12, ROOFY + 6.2, z0, cx2 + 0.12, ROOFY + 6.45, z1, [140, 146, 150], 'Metal'); B('Rail', cx2 - 0.08, ROOFY + 4.8, z0, cx2 + 0.08, ROOFY + 5.0, z1, [140, 146, 150], 'Metal'); }
      for (let t = 0; t <= len; t += 6) {
        const px = along ? x0 + t : cx2, pz = along ? cz2 : z0 + t;
        B('RailPost', px - 0.1, ROOFY + 3.3, pz - 0.1, px + 0.1, ROOFY + 6.45, pz + 0.1, [140, 146, 150], 'Metal');
      }
    };
    rail(BX0, ZS - 0.8, BX1, ZS);
    rail(BX0, ZN, BX1, ZN + 0.8);
    rail(BX0, ZN, BX0 + 0.8, ZS);
    rail(BX1 - 0.8, ZN, BX1, ZS);
    grp('StairHouse', () => {
      const x0 = -1, x1 = 11.2, z0 = -159, z1 = -137.4, H = 10;
      wallHoles('Wall', 'z', z0, z1, ROOFY, ROOFY + H, x0, x0 + 0.6, [{ u0: -147, u1: -143, v0: ROOFY, v1: ROOFY + 7.2 }], C.facade, 'Plaster');
      B('Wall', x1 - 0.6, ROOFY, z0, x1, ROOFY + H, z1, C.facade, 'Plaster');
      B('Wall', x0, ROOFY, z0, x1, ROOFY + H, z0 + 0.6, C.facade, 'Plaster');
      B('Wall', x0, ROOFY, z1 - 0.6, x1, ROOFY + H, z1, C.facade, 'Plaster');
      B('Roof', x0 - 0.5, ROOFY + H, z0 - 0.5, x1 + 0.5, ROOFY + H + 0.7, z1 + 0.5, [130, 126, 120], 'Concrete');
      B('RoofDoor', x0 - 0.2, ROOFY, -147, x0 + 0.1, ROOFY + 7.2, -143, [96, 100, 106], 'Metal', { tag: 'RoofDoor' });
      B('RoofSign', x0 - 0.3, ROOFY + 7.6, -148, x0 - 0.1, ROOFY + 8.8, -142, [246, 246, 240], 'SmoothPlastic', {
        text: { face: 'Left', text: '옥상 출입금지', color: [180, 30, 30], bg: [246, 246, 240], bgT: 0 } });
      B('RoofStairZone', STAIR.x0, LV[2] + FH / 2 - 0.6, STAIR.zLand, STAIR.x1, ROOFY + 8, ROOM1, [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'RoofStairZone' });
    });
    grp('WaterTank', () => {
      B('Stand', 90, ROOFY, -166, 114, ROOFY + 2, -148, [110, 114, 120], 'Metal');
      B('Tank', 91, ROOFY + 2, -165, 113, ROOFY + 11, -149, [70, 130, 170], 'Plastic');
      for (let x = 91; x <= 113; x += 2.75) B('Rib', x - 0.08, ROOFY + 2, -165.1, x + 0.08, ROOFY + 11, -148.9, [60, 112, 150], 'Plastic', { nc: true, ns: true });
      for (let y = 2; y <= 11; y += 3) B('Rib', 90.9, ROOFY + y - 0.08, -165.1, 113.1, ROOFY + y + 0.08, -148.9, [60, 112, 150], 'Plastic', { nc: true, ns: true });
    });
    for (let x = -120; x <= -50; x += 14) {
      B('ACUnit', x, ROOFY, -168, x + 5, ROOFY + 4, -162, [226, 226, 222], 'Metal');
      P('Fan', [0.1, 3, 3], [x + 2.5, ROOFY + 4.05, -165], [80, 80, 84], 'Metal', { sh: 'Cylinder', r: [0, 0, 90], nc: true, ns: true });
    }
    cylBetween('Duct', [-120, ROOFY + 1, -160], [-40, ROOFY + 1, -160], 1.0, [190, 190, 186], 'Metal');
    grp('ClockTower', () => {
      const cy = ROOFY + 8.4, cz2 = ZS + 1.6;
      B('ClockWall', -9, ROOFY - 1, ZS - 4, 9, ROOFY + 14, ZS + 1.2, [224, 220, 210], 'Plaster');
      P('ClockRim', [0.6, 10.6, 10.6], [0, cy, cz2 - 0.05], [56, 50, 46], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
      P('ClockFace', [0.4, 9.8, 9.8], [0, cy, cz2 + 0.15], [244, 240, 228], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], tag: 'ClockCenter',
        light: { type: 'Surface', face: 'Back', range: 8, brightness: 0.5, color: [255, 245, 220] } });
      for (let h = 0; h < 60; h++) {
        const a = (h / 60) * Math.PI * 2, big = h % 5 === 0;
        P('Mark', [big ? 0.32 : 0.12, big ? 1.0 : 0.4, 0.08], [Math.sin(a) * (big ? 4.1 : 4.35), cy + Math.cos(a) * (big ? 4.1 : 4.35), cz2 + 0.4], [36, 32, 30], 'SmoothPlastic', { r: [0, 0, -(h * 6)], nc: true, ns: true });
      }
      const hourA = -(10 / 12) * 360 - (10 / 60) * 30, minA = -(10 / 60) * 360;
      const hr = (deg, len) => { const a = (deg * Math.PI) / 180; return [-Math.sin(a) * len / 2, cy + Math.cos(a) * len / 2]; };
      const [hx, hy] = hr(hourA, 2.6), [mx, my] = hr(minA, 3.9);
      P('HourHand', [0.36, 2.6, 0.12], [hx, hy, cz2 + 0.5], [26, 22, 20], 'Metal', { r: [0, 0, hourA], tag: 'ClockHour', nc: true, ns: true });
      P('MinuteHand', [0.24, 3.9, 0.12], [mx, my, cz2 + 0.6], [26, 22, 20], 'Metal', { r: [0, 0, minA], tag: 'ClockMinute', nc: true, ns: true });
      P('Pin', [0.15, 0.5, 0.5], [0, cy, cz2 + 0.7], [190, 160, 70], 'Metal', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
      B('Emblem', -2.6, ROOFY + 1.2, cz2 - 0.35, 2.6, ROOFY + 2.6, cz2 - 0.05, [40, 60, 110], 'SmoothPlastic', { text: { face: 'Back', text: 'SINCE 1974', color: [230, 220, 180], bgT: 1, font: 'Merriweather' } });
      cylV('Antenna', 6, ROOFY + 15.2, ZS - 2, 8, 0.25, C.steel, 'Metal');
    });
  });
  B('BuildingZone', BX0, 0, ZN, BX1, ROOFY, ZS, [0, 0, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BuildingZone' });
});

grp('GirlStatue', () => {
  const x = -46, z = -122, bz = [118, 92, 58];
  B('Pedestal', x - 3, 0, z - 3, x + 3, 3.6, z + 3, [176, 172, 166], 'Granite', { tag: 'StatuePedestal' });
  B('PedestalCap', x - 3.3, 3.6, z - 3.3, x + 3.3, 4.0, z + 3.3, [150, 146, 140], 'Granite');
  B('Plaque', x - 1.8, 1.0, z + 3, x + 1.8, 2.6, z + 3.08, [150, 120, 60], 'Metal', { text: { face: 'Back', text: '책 읽는 소녀\n1974', color: [40, 30, 14], bgT: 1, font: 'Merriweather' } });
  grp('Figure', () => {
    B('Seat', x - 1.4, 4.0, z - 1.1, x + 1.4, 5.3, z + 1.1, bz, 'Metal', { pri: true, refl: 0.1 });
    B('Body', x - 0.8, 5.3, z - 0.55, x + 0.8, 7.6, z + 0.55, bz, 'Metal', { refl: 0.1 });
    B('Thigh', x - 0.8, 5.0, z + 0.4, x + 0.8, 5.7, z + 2.2, bz, 'Metal', { refl: 0.1 });
    B('Shin', x - 0.8, 4.0, z + 1.9, x + 0.8, 5.4, z + 2.5, bz, 'Metal', { refl: 0.1 });
    ball('Head', x, 8.5, z - 0.05, 1.6, bz, 'Metal', { tag: 'StatueHead', refl: 0.1 });
    B('Hair', x - 0.85, 7.9, z - 0.95, x + 0.85, 9.2, z - 0.2, bz, 'Metal', { refl: 0.1 });
    [-1, 1].forEach((s) => cylBetween('Arm', [x + s * 0.9, 7.3, z], [x + s * 0.5, 6.6, z + 1.4], 0.45, bz, 'Metal'));
    P('Book', [1.8, 0.12, 1.2], [x, 6.8, z + 1.6], bz, 'Metal', { r: [-30, 0, 0], refl: 0.1 });
  }, 'StatueFigure');
});

car('IntroCar', 40.5, 162, 0, [46, 52, 64], { tag: 'IntroCar', lightsOn: true, plate: '35싸 0412', pov: true });

// ═════════════════════════ 내보내기 ═════════════════════════
const data = { v: 2, groups, colors, mats, parts, lights, texts, tags, gtags, attrs, terrain };
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build', 'map.json'), JSON.stringify(data));
const outDir = path.join(ROOT, 'src', 'ServerScriptService', 'SchoolBuilder');
fs.readdirSync(outDir).filter((f) => /^MapData\d+\.lua$/.test(f)).forEach((f) => fs.unlinkSync(path.join(outDir, f)));
const CHUNK = 2500;
const header = { v: 2, groups, colors, mats, lights, texts, tags, gtags, attrs, terrain, partChunks: Math.ceil(parts.length / CHUNK) };
const files = [JSON.stringify(header)];
for (let i = 0; i < parts.length; i += CHUNK) files.push(JSON.stringify(parts.slice(i, i + CHUNK)));
files.forEach((json, i) => {
  if (json.includes(']==]')) throw new Error('bracket clash');
  fs.writeFileSync(path.join(outDir, `MapData${i}.lua`), `-- 자동 생성 파일 (tools/generate.js). 직접 고치지 마세요.\nreturn [==[${json}]==]\n`);
});
console.log(`parts=${parts.length} groups=${groups.length} lights=${lights.length} texts=${texts.length} tags=${tags.length} terrain=${terrain.length} chunks=${files.length}`);
