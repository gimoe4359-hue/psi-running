#!/usr/bin/env node
// 송천고등학교 야간 경비 — 맵 생성기
// 맵 전체를 "파트 목록"으로 만든 다음
//   1) Roblox용 Luau 모듈 (src/ServerScriptService/SchoolBuilder/MapData*.lua)
//   2) 미리보기 렌더러용 JSON (build/map.json)
// 을 같은 데이터로 내보낸다. 그래서 미리보기 사진과 실제 게임 맵이 똑같다.
//
// 좌표: Roblox와 같음 (Y 위, 단위 stud). 정문은 남쪽(+Z), 본관은 북쪽(-Z).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let seed = 20261115;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];

// ───────────────────────── 데이터 테이블 ─────────────────────────
const parts = [];
const groups = [];
const groupIndex = {};
const lights = [];
const texts = [];
const tags = [];
const gtags = [];
const attrs = [];
const colors = [];
const colorIdx = {};
const mats = [];
const matIdx = {};
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
  if (typeof c === 'string') {
    const h = c.replace('#', '');
    c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
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
const FACES = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'];

// P(이름, 크기, 위치, 색, 재질, 옵션)
//  옵션: r=[rx,ry,rz](도), t=투명도, sh=모양, nc=충돌없음, ns=그림자없음, pri=PrimaryPart,
//        tag, attr, light, text
function P(name, size, pos, color, mat = 'SmoothPlastic', o = {}) {
  const s = size.map((v) => r3(Math.max(0.05, Math.abs(v))));
  const p = pos.map(r3);
  const r = (o.r || [0, 0, 0]).map(r3);
  let flags = 0;
  if (o.nc) flags |= 1;
  if (o.ns) flags |= 2;
  if (o.pri) flags |= 4;
  if (o.hidden) flags |= 8; // 미리보기에서 그리지 않는 투명 영역 파트
  parts.push([cur(), name, ...s, ...p, ...r, ci(color), mi(mat), r3(o.t || 0), SHAPES[o.sh || 'Block'], flags]);
  const idx = parts.length - 1;
  if (o.tag) [].concat(o.tag).forEach((t) => tags.push([idx, t]));
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
// 두 모서리로 상자 만들기
function B(name, x0, y0, z0, x1, y1, z1, color, mat, o) {
  return P(name, [x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], color, mat, o);
}
// 수직 원기둥 (Roblox 원기둥 축은 X라서 Z로 90도 돌림)
function cylV(name, x, y0, z, h, d, color, mat, o = {}) {
  return P(name, [h, d, d], [x, y0 + h / 2, z], color, mat, { ...o, sh: 'Cylinder', r: [0, o.ry || 0, 90] });
}
function ball(name, x, y, z, d, color, mat, o = {}) {
  return P(name, [d, d, d], [x, y, z], color, mat, { ...o, sh: 'Ball' });
}

// 구멍(창문·문) 뚫린 벽. axis='x'면 X방향으로 뻗은 벽(두께는 Z), 'z'면 Z방향.
function wallHoles(name, axis, uMin, uMax, vMin, vMax, w0, w1, holes, color, mat, o) {
  const us = [uMin, uMax];
  holes.forEach((h) => {
    if (h.u0 > uMin && h.u0 < uMax) us.push(h.u0);
    if (h.u1 > uMin && h.u1 < uMax) us.push(h.u1);
  });
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
// 창문(유리 + 알루미늄 창틀 + 가운데 문설주)
const FRAME = [205, 208, 212];
const GLASS = [150, 180, 195];
function windowX(u0, u1, v0, v1, zc, o = {}) {
  const th = o.th || 0.5;
  B('Glass', u0, v0, zc - 0.08, u1, v1, zc + 0.08, GLASS, 'Glass', { t: 0.55, ns: true });
  B('Frame', u0, v1 - 0.3, zc - th / 2, u1, v1, zc + th / 2, FRAME, 'Metal');
  B('Frame', u0, v0, zc - th / 2, u1, v0 + 0.3, zc + th / 2, FRAME, 'Metal');
  B('Frame', (u0 + u1) / 2 - 0.15, v0, zc - th / 2, (u0 + u1) / 2 + 0.15, v1, zc + th / 2, FRAME, 'Metal');
  if (o.sill) B('Sill', u0 - 0.3, v0 - 0.25, zc - 0.9, u1 + 0.3, v0, zc + 0.9, [180, 176, 168], 'Concrete');
}
function windowZ(u0, u1, v0, v1, xc, o = {}) {
  const th = o.th || 0.5;
  B('Glass', xc - 0.08, v0, u0, xc + 0.08, v1, u1, GLASS, 'Glass', { t: 0.55, ns: true });
  B('Frame', xc - th / 2, v1 - 0.3, u0, xc + th / 2, v1, u1, FRAME, 'Metal');
  B('Frame', xc - th / 2, v0, u0, xc + th / 2, v0 + 0.3, u1, FRAME, 'Metal');
  B('Frame', xc - th / 2, v0, (u0 + u1) / 2 - 0.15, xc + th / 2, v1, (u0 + u1) / 2 + 0.15, FRAME, 'Metal');
}

// ───────────────────────── 색 ─────────────────────────
const C = {
  cream: [226, 214, 188], creamDark: [196, 182, 156], brick: [150, 78, 60], roofGreen: [74, 122, 92],
  corridor: [150, 158, 146], woodFloor: [176, 132, 88], wood: [150, 104, 64], woodDark: [104, 70, 44],
  metal: [120, 124, 130], metalLight: [170, 174, 180], board: [36, 68, 52], white: [240, 240, 236],
  ceiling: [228, 228, 222], black: [22, 22, 24], asphalt: [52, 54, 58], pavement: [150, 148, 142],
  grass: [70, 100, 52], grassDark: [52, 80, 42], dirt: [168, 138, 100], leaf: [48, 86, 46], leaf2: [62, 104, 54],
  trunk: [92, 68, 48], wall: [190, 186, 176], navy: [32, 44, 74], red: [180, 30, 34], green: [30, 160, 80],
};

// ───────────────────────── 나무 · 가로등 · 자동차 ─────────────────────────
function tree(x, z, h = 22, kind = 'round') {
  grp('Tree', () => {
    cylV('Trunk', x, 0, z, h * 0.55, 1.4 + h * 0.03, C.trunk, 'Wood');
    if (kind === 'pine') {
      for (let i = 0; i < 4; i++) {
        const w = (h * 0.55) * (1 - i * 0.2);
        P('Leaves', [w, h * 0.22, w], [x, h * 0.35 + i * h * 0.17, z], pick([C.leaf, C.grassDark]), 'LeafyGrass', { r: [0, rnd() * 90, 0] });
      }
    } else {
      const d = h * 0.6;
      ball('Leaves', x, h * 0.62, z, d, pick([C.leaf, C.leaf2]), 'LeafyGrass');
      ball('Leaves', x + d * 0.28, h * 0.5, z + d * 0.15, d * 0.7, pick([C.leaf, C.leaf2, C.grassDark]), 'LeafyGrass');
      ball('Leaves', x - d * 0.25, h * 0.55, z - d * 0.2, d * 0.75, pick([C.leaf, C.leaf2, C.grassDark]), 'LeafyGrass');
      ball('Leaves', x, h * 0.85, z + d * 0.05, d * 0.6, pick([C.leaf, C.leaf2]), 'LeafyGrass');
    }
  });
}
function streetLight(x, z, facingDeg, opt = {}) {
  grp('StreetLight', () => {
    const h = opt.h || 18;
    cylV('Pole', x, 0, z, h, 0.8, [80, 84, 90], 'Metal');
    const a = (facingDeg * Math.PI) / 180;
    const dx = Math.sin(a), dz = Math.cos(a);
    P('Arm', [0.5, 0.5, 4], [x + dx * 2, h - 0.2, z + dz * 2], [80, 84, 90], 'Metal', { r: [0, facingDeg, 0] });
    P('Lamp', [1.6, 0.5, 2.6], [x + dx * 4, h - 0.6, z + dz * 4], [255, 214, 150], opt.off ? 'SmoothPlastic' : 'Neon',
      { r: [0, facingDeg, 0], tag: opt.flicker ? 'FlickerLight' : 'StreetLamp',
        light: { type: 'Point', range: opt.range || 42, brightness: opt.off ? 0 : 1.6, color: [255, 200, 140], enabled: !opt.off, shadows: true } });
  });
}
// 자동차: 앞이 로컬 -Z
function car(name, cx, cz, ry, color, o = {}) {
  return grp(name, (gi) => {
    const c = Math.cos((ry * Math.PI) / 180), s = Math.sin((ry * Math.PI) / 180);
    const W = (lx, ly, lz) => [cx + lx * c + lz * s, ly, cz - lx * s + lz * c];
    const Q = (n, size, lp, col, mat, op = {}) => {
      const lr = op.r || [0, 0, 0];
      return P(n, size, W(...lp), col, mat, { ...op, r: [lr[0], ry + lr[1], lr[2]] });
    };
    Q('Body', [6.4, 1.8, 15], [0, 2.2, 0], color, 'SmoothPlastic', { pri: true });
    Q('Hood', [6.2, 0.7, 4.4], [0, 3.4, -5.2], color, 'SmoothPlastic');
    Q('Trunk', [6.2, 0.7, 3.0], [0, 3.4, 5.9], color, 'SmoothPlastic');
    Q('Cabin', [5.6, 2.3, 6.4], [0, 4.6, 0.5], [30, 34, 40], 'SmoothPlastic');
    Q('Roof', [5.8, 0.35, 5.2], [0, 5.9, 0.7], color, 'SmoothPlastic');
    Q('Windshield', [5.4, 2.0, 0.15], [0, 4.75, -2.8], [90, 110, 125], 'Glass', { t: 0.3 });
    Q('RearWindow', [5.4, 1.9, 0.15], [0, 4.75, 3.8], [90, 110, 125], 'Glass', { t: 0.3 });
    [-1, 1].forEach((sx) => {
      Q('SideWindow', [0.15, 1.7, 5.8], [sx * 2.85, 4.75, 0.5], [60, 80, 95], 'Glass', { t: 0.2 });
      Q('Mirror', [0.7, 0.45, 0.6], [sx * 3.55, 4.1, -2.0], color, 'SmoothPlastic');
      [-1, 1].forEach((sz) => {
        Q('Wheel', [1.2, 2.9, 2.9], [sx * 3.05, 1.45, sz * 4.7], C.black, 'Fabric', { sh: 'Cylinder' });
        Q('Hubcap', [1.26, 1.5, 1.5], [sx * 3.05, 1.45, sz * 4.7], [190, 192, 196], 'Metal', { sh: 'Cylinder' });
      });
      Q('Headlight', [1.5, 0.6, 0.2], [sx * 2.2, 2.75, -7.55], [255, 250, 230], 'Neon',
        { tag: 'CarHeadlight', light: { type: 'Spot', face: 'Front', range: 60, brightness: o.lightsOn ? 5 : 0, angle: 55, color: [255, 245, 220], enabled: !!o.lightsOn, shadows: true } });
      Q('Taillight', [1.4, 0.6, 0.2], [sx * 2.4, 2.75, 7.55], [200, 20, 20], 'Neon');
    });
    Q('Grille', [2.6, 0.7, 0.15], [0, 2.5, -7.58], [30, 30, 32], 'Metal');
    Q('FrontBumper', [6.6, 0.7, 0.6], [0, 1.4, -7.6], [40, 42, 46], 'SmoothPlastic');
    Q('RearBumper', [6.6, 0.7, 0.6], [0, 1.4, 7.6], [40, 42, 46], 'SmoothPlastic');
    Q('Plate', [2.2, 0.65, 0.1], [0, 1.95, -7.95], C.white, 'SmoothPlastic', { text: { face: 'Front', text: o.plate || '35싸 0412', color: [20, 20, 20], bg: [245, 245, 245], bgT: 0 } });
    Q('Plate', [2.2, 0.65, 0.1], [0, 1.95, 7.95], C.white, 'SmoothPlastic', { text: { face: 'Back', text: o.plate || '35싸 0412', color: [20, 20, 20], bg: [245, 245, 245], bgT: 0 } });
  }, o.tag);
}

// ═════════════════════════ 1. 바닥 · 도로 · 바깥 동네 ═════════════════════════
grp('Ground', () => {
  B('Grass', -700, -2, -700, 700, 0, 700, C.grass, 'Grass');
  // 학교 안 잔디 (살짝 어두운)
  B('SchoolLawn', -220, 0, -200, 220, 0.05, 200, [64, 92, 48], 'Grass');
});

grp('Road', () => {
  B('Sidewalk', -700, 0, 200.5, 700, 0.6, 210, C.pavement, 'Pavement');
  B('Curb', -700, 0, 209.6, 700, 0.75, 210.2, [200, 198, 192], 'Concrete');
  B('Asphalt', -700, 0, 210.2, 700, 0.25, 239.8, C.asphalt, 'Asphalt');
  B('Curb', -700, 0, 239.8, 700, 0.75, 240.4, [200, 198, 192], 'Concrete');
  B('Sidewalk', -700, 0, 240.4, 700, 0.6, 250, C.pavement, 'Pavement');
  // 중앙 황색 복선
  B('CenterLine', -700, 0.25, 224.55, 700, 0.3, 224.85, [230, 180, 40], 'SmoothPlastic', { nc: true, ns: true });
  B('CenterLine', -700, 0.25, 225.15, 700, 0.3, 225.45, [230, 180, 40], 'SmoothPlastic', { nc: true, ns: true });
  // 차선 끝 흰 실선
  B('EdgeLine', -700, 0.25, 211, 700, 0.3, 211.3, C.white, 'SmoothPlastic', { nc: true, ns: true });
  B('EdgeLine', -700, 0.25, 238.7, 700, 0.3, 239, C.white, 'SmoothPlastic', { nc: true, ns: true });
  // 횡단보도 (정문 앞)
  for (let z = 212.5; z < 238; z += 3) B('Crosswalk', -11, 0.25, z, 11, 0.32, z + 1.5, C.white, 'SmoothPlastic', { nc: true, ns: true });
  // 정문 진입로 경계석 낮춤
  B('Driveway', -14, 0, 200.5, 14, 0.62, 210.2, [120, 120, 122], 'Concrete');
  // 버스정류장
  grp('BusStop', () => {
    B('Floor', -52, 0.6, 202, -36, 0.8, 208, [130, 130, 128], 'Concrete');
    B('Back', -52, 0.8, 207.6, -36, 8, 208, [120, 160, 180], 'Glass', { t: 0.5 });
    B('Roof', -53, 8, 201.5, -35, 8.5, 208.5, [60, 64, 70], 'Metal');
    [-51.5, -36.5].forEach((x) => B('Post', x - 0.2, 0.8, 201.8, x + 0.2, 8, 202.2, [60, 64, 70], 'Metal'));
    B('Bench', -50, 0.8, 206, -38, 2.4, 207.2, [90, 90, 96], 'Metal');
    B('Sign', -55, 0.6, 202.5, -54.4, 11, 203.1, [60, 64, 70], 'Metal');
    B('SignBoard', -56.5, 8.5, 202.6, -52.9, 11, 203, [30, 90, 160], 'SmoothPlastic',
      { text: { face: 'Back', text: '송천고등학교 앞', color: [255, 255, 255], bg: [30, 90, 160], bgT: 0, lit: 0 } });
  });
  for (let x = -650; x <= 650; x += 55) streetLight(x, 208.5, 0, { flicker: x === -100 || x === 230, range: 46 });
  for (let x = -625; x <= 650; x += 110) streetLight(x, 242, 180, { range: 46 });
});

// 길 건너 동네: 아파트, 상가 (불 켜진 창문)
grp('Town', () => {
  function apartment(x0, z0, w, d, h, label) {
    grp('Apartment', () => {
      B('Body', x0, 0, z0, x0 + w, h, z0 + d, [205, 200, 190], 'Concrete');
      B('Roof', x0 - 0.5, h, z0 - 0.5, x0 + w + 0.5, h + 1.5, z0 + d + 0.5, [170, 166, 158], 'Concrete');
      B('Label', x0 + w / 2 - 8, h - 9, z0 - 0.3, x0 + w / 2 + 8, h - 3, z0, [205, 200, 190], 'Concrete',
        { text: { face: 'Front', text: label, color: [70, 90, 120], bgT: 1, lit: 0, font: 'GothamBlack' } });
      // 층 띠
      for (let y = 9; y < h - 6; y += 9) B('Balcony', x0 + 1, y - 0.4, z0 - 1.2, x0 + w - 1, y, z0, [180, 176, 168], 'Concrete');
      // 창문
      for (let y = 3; y < h - 10; y += 9) {
        for (let x = x0 + 3; x < x0 + w - 5; x += 7) {
          const lit = rnd() < 0.28;
          B(lit ? 'WindowLit' : 'Window', x, y, z0 - 0.15, x + 4.5, y + 4, z0 + 0.05,
            lit ? pick([[255, 214, 150], [255, 236, 190], [210, 230, 255]]) : [40, 48, 60], lit ? 'Neon' : 'Glass', { nc: true, ns: true, t: lit ? 0.15 : 0 });
        }
      }
    });
  }
  apartment(-330, 262, 70, 30, 96, '101동');
  apartment(-235, 262, 70, 30, 104, '102동');
  apartment(150, 262, 70, 30, 100, '103동');
  apartment(245, 262, 70, 30, 92, '104동');
  apartment(-560, 270, 80, 30, 120, '201동');
  apartment(420, 270, 80, 30, 116, '202동');
  // 2층 상가
  grp('Shops', () => {
    B('Body', -140, 0, 256, 110, 22, 290, [190, 182, 170], 'Concrete');
    B('Roof', -141, 22, 255, 111, 23.5, 291, [150, 146, 140], 'Concrete');
    const shops = [
      ['편의점', [40, 170, 120], true], ['송천분식', [230, 120, 40], true], ['PC방', [80, 120, 230], true],
      ['세탁소', [160, 160, 170], false], ['문구점', [220, 70, 90], false], ['약국', [40, 160, 60], false],
    ];
    shops.forEach(([label, col, open], i) => {
      const x = -136 + i * 41;
      B('Glass', x, 0.6, 255.6, x + 37, 9, 256, open ? [255, 236, 200] : [40, 46, 54], open ? 'Neon' : 'Glass', { t: open ? 0.35 : 0.1, nc: true });
      B('Sign', x + 2, 10.5, 255.2, x + 35, 15, 255.9, col, open ? 'Neon' : 'SmoothPlastic',
        { text: { face: 'Front', text: label, color: [255, 255, 255], bg: col, bgT: 1, lit: 0, font: 'GothamBlack' },
          light: open ? { type: 'Point', range: 22, brightness: 0.8, color: col } : undefined });
      for (let y = 13.5; y <= 13.5; y++) B('UpperWindow', x + 4, 16, 255.8, x + 33, 20.5, 256, [50, 56, 66], 'Glass', { nc: true });
    });
  });
  // 먼 산 (돌린 큰 상자를 겹쳐 로우폴리 산 느낌)
  grp('Mountains', () => {
    [[-520, -760, 300], [-180, -820, 380], [200, -800, 340], [560, -740, 300], [-820, -420, 280], [840, -380, 300],
     [-40, -640, 220], [380, -620, 200], [-360, -620, 210], [-760, 60, 220], [780, 120, 230]].forEach(([x, z, h]) => {
      for (let k = 0; k < 4; k++) {
        const s = h * (1.1 - k * 0.18);
        P('Mountain', [s, s, s], [x + (rnd() - 0.5) * h * 0.9, -s * 0.42 + k * h * 0.05, z + (rnd() - 0.5) * h * 0.5],
          pick([[40, 60, 42], [46, 66, 46], [36, 54, 40], [52, 70, 50]]), 'Grass', { ns: true, r: [rnd() * 40 - 20, rnd() * 90, rnd() * 40 - 20] });
      }
    });
  });
});

// ═════════════════════════ 2. 담장 · 정문 · 경비실 ═════════════════════════
grp('Wall', () => {
  const H = 7;
  const seg = (x0, z0, x1, z1) => {
    B('Wall', x0, 0, z0, x1, H, z1, [176, 170, 160], 'Concrete');
    B('Cap', x0 - 0.2, H, z0 - 0.2, x1 + 0.2, H + 0.5, z1 + 0.2, [140, 136, 128], 'Concrete');
  };
  seg(-220, 199.5, -16, 200.5); seg(16, 199.5, 220, 200.5);
  seg(-220, -200.5, 220, -199.5);
  seg(-220.5, -200, -219.5, 200); seg(219.5, -200, 220.5, 200);
  // 기둥
  const pillar = (x, z) => B('Pillar', x - 0.9, 0, z - 0.9, x + 0.9, H + 0.9, z + 0.9, [150, 144, 136], 'Concrete');
  for (let x = -220; x <= 220; x += 20) { if (Math.abs(x) > 18) pillar(x, 200); pillar(x, -200); }
  for (let z = -180; z < 200; z += 20) { pillar(-220, z); pillar(220, z); }
  // 담쟁이
  for (let i = 0; i < 40; i++) {
    const x = -215 + rnd() * 430;
    if (Math.abs(x) < 22) continue;
    B('Ivy', x, 0.5, 198.8, x + 3 + rnd() * 6, 2 + rnd() * 4.5, 199.5, pick([C.leaf, C.grassDark]), 'LeafyGrass', { nc: true });
  }
});

grp('Gate', () => {
  // 정문 기둥 + 학교 이름 현판
  B('GatePillarW', -17.5, 0, 198.5, -14, 11, 202, [120, 110, 100], 'Granite');
  B('GatePillarE', 14, 0, 198.5, 17.5, 11, 202, [120, 110, 100], 'Granite');
  B('PillarCap', -18, 11, 198, -13.5, 12, 202.5, [90, 84, 78], 'Granite');
  B('PillarCap', 13.5, 11, 198, 18, 12, 202.5, [90, 84, 78], 'Granite');
  B('NamePlate', -17.3, 4, 202, -14.2, 10, 202.3, [200, 190, 160], 'Marble',
    { text: { face: 'Back', text: '송\n천\n고\n등\n학\n교', color: [40, 34, 28], bgT: 1, font: 'Merriweather', lit: 1 } });
  B('NamePlate', 14.2, 4, 202, 17.3, 10, 202.3, [200, 190, 160], 'Marble',
    { text: { face: 'Back', text: 'SONGCHEON\nHIGH\nSCHOOL', color: [40, 34, 28], bgT: 1, font: 'Merriweather', lit: 1 } });
  // 미닫이 철문 (닫힌 상태가 기본, 서쪽 담 뒤로 28 stud 열림)
  grp('MainGate', () => {
    B('RailTop', -14, 6.2, 199.6, 14, 6.7, 200.4, [70, 74, 80], 'Metal', { pri: true });
    B('RailBottom', -14, 0.4, 199.6, 14, 1.0, 200.4, [70, 74, 80], 'Metal');
    for (let x = -13.4; x <= 13.5; x += 1.6) B('Bar', x - 0.13, 1.0, 199.87, x + 0.13, 6.2, 200.13, [80, 84, 90], 'Metal');
    B('MidRail', -14, 3.4, 199.75, 14, 3.7, 200.25, [70, 74, 80], 'Metal');
    B('Lock', 12.6, 2.8, 200.4, 13.6, 4.3, 200.8, [160, 130, 40], 'Metal', { tag: 'GateLock' });
    [-12, 0, 12].forEach((x) => cylV('Roller', x, 0, 200, 0.5, 0.9, [40, 40, 44], 'Metal'));
  }, 'MainGate');
  B('GateTrack', -44, 0, 199.7, 14, 0.12, 200.3, [80, 82, 86], 'Metal', { nc: true });
});

// 경비실
grp('GuardBooth', () => {
  const x0 = 22, x1 = 36, z0 = 178, z1 = 190, H = 9.5;
  const wc = [214, 210, 196];
  B('Base', x0 - 0.5, 0, z0 - 0.5, x1 + 0.5, 0.6, z1 + 0.5, [150, 146, 140], 'Concrete');
  B('Floor', x0 + 0.6, 0.6, z0 + 0.6, x1 - 0.6, 0.7, z1 - 0.6, [120, 140, 120], 'Plastic');
  // 서쪽 벽(진입로 쪽 큰 창)
  wallHoles('Wall', 'z', z0, z1, 0.6, H, x0, x0 + 0.6, [{ u0: z0 + 1.5, u1: z1 - 1.5, v0: 3.4, v1: 7.6 }], wc, 'Concrete');
  windowZ(z0 + 1.5, z1 - 1.5, 3.4, 7.6, x0 + 0.3);
  // 남쪽 벽(정문 쪽 창)
  wallHoles('Wall', 'x', x0, x1, 0.6, H, z1 - 0.6, z1, [{ u0: x0 + 1.5, u1: x1 - 3, v0: 3.4, v1: 7.6 }], wc, 'Concrete');
  windowX(x0 + 1.5, x1 - 3, 3.4, 7.6, z1 - 0.3);
  // 북쪽 벽(문)
  wallHoles('Wall', 'x', x0, x1, 0.6, H, z0, z0 + 0.6, [{ u0: 29.5, u1: 33, v0: 0.6, v1: 7.6 }, { u0: 23.5, u1: 27.5, v0: 4.2, v1: 7.2 }], wc, 'Concrete');
  windowX(23.5, 27.5, 4.2, 7.2, z0 + 0.3);
  B('Door', 33, 0.7, z0 - 0.4, 36.4, 7.6, z0 - 0.15, [110, 116, 124], 'Metal'); // 열린 문
  // 동쪽 벽(근무 수칙이 붙은 벽)
  wallHoles('Wall', 'z', z0, z1, 0.6, H, x1 - 0.6, x1, [], wc, 'Concrete');
  B('Roof', x0 - 1.2, H, z0 - 1.2, x1 + 1.2, H + 0.7, z1 + 1.2, [100, 96, 92], 'Concrete');
  B('RoofEdge', x0 - 1.4, H + 0.7, z0 - 1.4, x1 + 1.4, H + 1.1, z1 + 1.4, [130, 46, 40], 'SmoothPlastic');
  B('Sign', 23, 8, z0 - 0.35, 29, 9.2, z0 - 0.05, [30, 50, 100], 'SmoothPlastic',
    { text: { face: 'Front', text: '경 비 실', color: [255, 255, 255], bg: [30, 50, 100], bgT: 0, lit: 0.5 } });
  B('Ceiling', x0 + 0.6, H - 0.25, z0 + 0.6, x1 - 0.6, H, z1 - 0.6, C.ceiling, 'SmoothPlastic');
  B('CeilingLight', 27.5, H - 0.55, 183, 30.5, H - 0.25, 185, [255, 244, 220], 'Neon',
    { tag: 'BoothLight', light: { type: 'Point', range: 18, brightness: 1.2, color: [255, 226, 180], shadows: true } });
  // 책상 + CCTV
  B('Desk', x0 + 0.6, 0.7, 186.6, x1 - 0.6, 3.3, z1 - 0.6, [130, 120, 108], 'WoodPlanks');
  B('DeskTop', x0 + 0.6, 3.3, 186.4, x1 - 0.6, 3.5, z1 - 0.6, [170, 150, 120], 'Wood');
  grp('CCTV', () => {
    B('MonitorRack', 28.2, 3.5, 188.6, 34.8, 8.3, 189.4, [40, 40, 44], 'Metal');
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      B('Screen', 28.5 + c * 2.15, 3.8 + r * 2.2, 188.5, 30.5 + c * 2.15, 5.8 + r * 2.2, 188.6,
        pick([[60, 90, 110], [50, 80, 100], [70, 100, 120]]), 'Neon', { tag: 'CCTVScreen', attr: { Cam: r * 3 + c + 1 }, nc: true });
    }
  });
  grp('Phone', () => {
    B('PhoneBase', 23.6, 3.5, 187.6, 25.4, 4.0, 188.8, [200, 196, 186], 'SmoothPlastic', { tag: 'Phone' });
    B('Handset', 23.5, 4.0, 187.9, 25.5, 4.35, 188.4, [200, 196, 186], 'SmoothPlastic');
  });
  B('Radio', 26, 3.5, 188.2, 27.6, 4.6, 189, [50, 50, 52], 'SmoothPlastic');
  B('Kettle', 35, 3.5, 187.2, 35.2, 4.6, 188, [220, 220, 222], 'Metal'); // 작은 장식
  cylV('Cup', 26.6, 3.5, 187.2, 0.6, 0.45, [240, 240, 240], 'SmoothPlastic');
  // 의자
  grp('OfficeChair', () => {
    B('Seat', 25.2, 2.2, 184.2, 27.2, 2.6, 186.2, [40, 40, 44], 'Fabric');
    B('Back', 25.2, 2.6, 183.7, 27.2, 5.2, 184.1, [40, 40, 44], 'Fabric');
    cylV('Stem', 26.2, 0.7, 185.2, 1.5, 0.3, C.metal, 'Metal');
    B('Foot', 25.0, 0.7, 185.0, 27.4, 0.9, 185.4, C.metal, 'Metal');
    B('Foot', 26.0, 0.7, 184.0, 26.4, 0.9, 186.4, C.metal, 'Metal');
  }, 'BoothChair');
  // 근무 수칙 (동쪽 벽 안쪽)
  B('RulesPaper', 35.3, 3.2, 180.4, 35.4, 8.6, 185.6, [245, 238, 214], 'SmoothPlastic', {
    tag: 'RulesPaper',
    text: { face: 'Left', align: 'Left', font: 'Arial', color: [30, 24, 20], bg: [245, 238, 214], bgT: 0, lit: 1, pps: 60,
      text: '[ 야간 경비원 근무 수칙 ]\n1. 근무는 22:00 ~ 06:00. 06시 전엔 절대 정문을 열지 마세요.\n2. 매시 정각 전, 1층·2층·3층 순찰함에 체크하세요.\n3. 4층은 없습니다. 4층 표지판이 보이면 즉시 경비실로.\n4. 전화가 오면 받으세요. 단, 당신 이름을 부르면 끊으세요.\n5. 운동장에 의자가 있으면 쳐다보지 마세요.\n6. 시계탑이 거꾸로 가면 건물에 들어가지 마세요.\n7. 복도의 학생에게 말을 걸지 마세요. 학생들은 모두 하교했습니다.\n8. 동상이 자리에 없다면, 찾지 마세요.' } });
  B('Calendar', 31, 4.5, z0 + 0.6, 34, 7.5, z0 + 0.7, [250, 250, 250], 'SmoothPlastic',
    { text: { face: 'Back', text: '11월\n13일(금)', color: [190, 30, 30], bg: [250, 250, 250], bgT: 0 } });
  B('KeyBox', 23, 4.5, z0 + 0.6, 26, 7.5, z0 + 1.0, [150, 120, 80], 'Wood');
  B('Cot', 32, 0.7, 180.5, 35.3, 2.2, 186, [90, 110, 90], 'Fabric');
  B('Heater', 22.8, 0.7, 180.4, 24.2, 2.6, 181.4, [230, 110, 40], 'Neon', { light: { type: 'Point', range: 6, brightness: 0.6, color: [255, 120, 50] } });
  // 순찰 시작점·영역
  B('BoothSpawn', 27, 0.7, 181.5, 31, 0.8, 183.5, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BoothSpawn' });
  B('BoothZone', x0, 0.6, z0, x1, H, z1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BoothZone' });
  // 차단기
  grp('Barrier', () => {
    B('Post', 16.4, 0, 193.4, 18.2, 4.2, 195.2, [220, 200, 60], 'SmoothPlastic');
    // 차단기 막대는 올라가 있음(75도)
    const a = 75 * Math.PI / 180;
    for (let i = 0; i < 7; i++) {
      const d = (i + 0.5) * 3.6;
      P('Arm', [3.6, 0.6, 0.8], [17.3 - Math.cos(a) * d, 3.9 + Math.sin(a) * d, 194.3], i % 2 ? C.white : [200, 40, 40], 'SmoothPlastic', { r: [0, 0, -75] });
    }
  }, 'GateBarrier');
});

// ═════════════════════════ 3. 진입로 · 주차장 · 운동장 ═════════════════════════
grp('Grounds', () => {
  B('Driveway', -12, 0, -117, 12, 0.2, 199.5, C.asphalt, 'Asphalt');
  for (let z = -110; z < 195; z += 12) B('DashLine', -0.25, 0.2, z, 0.25, 0.24, z + 6, C.white, 'SmoothPlastic', { nc: true, ns: true });
  B('Curb', -12.6, 0, -117, -12, 0.5, 199.5, [190, 188, 180], 'Concrete');
  B('Curb', 12, 0, -117, 12.6, 0.5, 96, [190, 188, 180], 'Concrete');
  B('Curb', 12, 0, 172, 12.6, 0.5, 199.5, [190, 188, 180], 'Concrete');
  // 주차장
  B('Parking', 12, 0, 96, 104, 0.2, 172, C.asphalt, 'Asphalt');
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 9.5;
    B('ParkLine', x, 0.2, 100, x + 0.35, 0.24, 118, C.white, 'SmoothPlastic', { nc: true, ns: true });
    B('ParkLine', x, 0.2, 150, x + 0.35, 0.24, 168, C.white, 'SmoothPlastic', { nc: true, ns: true });
  }
  B('ParkSign', 14, 0.2, 128, 30, 0.24, 140, [40, 100, 200], 'SmoothPlastic', { nc: true, ns: true,
    text: { face: 'Top', text: 'P  교직원', color: [255, 255, 255], bgT: 1 } });
  car('TeacherCar1', 34.3, 109, 0, [150, 20, 24], { plate: '12가 3456' });
  car('TeacherCar2', 72.3, 109, 180, [210, 210, 214], { plate: '48라 9012' });
  car('SchoolVan', 91.3, 159, 0, [240, 200, 40], { plate: '경기 77바 1004' });

  // 운동장 (흙)
  B('Field', -200, 0, -100, -22, 0.15, 190, C.dirt, 'Ground');
  // 트랙 선
  const cx = -111, cz = 45;
  [[72, 118], [66, 112], [60, 106]].forEach(([a, b]) => {
    const N = 48;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2;
      const x0 = cx + a * Math.cos(t0), z0 = cz + b * Math.sin(t0), x1 = cx + a * Math.cos(t1), z1 = cz + b * Math.sin(t1);
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.3;
      const ang = Math.atan2(x1 - x0, z1 - z0) * (180 / Math.PI);
      P('TrackLine', [0.4, 0.06, len], [(x0 + x1) / 2, 0.17, (z0 + z1) / 2], C.white, 'SmoothPlastic', { r: [0, ang, 0], nc: true, ns: true });
    }
  });
  B('CenterLine', cx - 50, 0.15, cz - 0.2, cx + 50, 0.2, cz + 0.2, C.white, 'SmoothPlastic', { nc: true, ns: true });
  // 축구 골대
  [[cz - 92, 1], [cz + 92, -1]].forEach(([z, dir]) => grp('SoccerGoal', () => {
    cylV('Post', cx - 12, 0, z, 8, 0.5, C.white, 'Metal');
    cylV('Post', cx + 12, 0, z, 8, 0.5, C.white, 'Metal');
    B('Crossbar', cx - 12.25, 7.75, z - 0.25, cx + 12.25, 8.25, z + 0.25, C.white, 'Metal');
    B('BackBar', cx - 12, 0, z - dir * 6.2, cx + 12, 0.4, z - dir * 5.8, C.white, 'Metal');
    B('Net', cx - 12, 0.4, Math.min(z, z - dir * 6), cx + 12, 8, Math.max(z, z - dir * 6), [235, 235, 235], 'Fabric', { t: 0.82, nc: true, ns: true });
  }));
  // 의자 이상현상 위치
  B('ChairSpot', cx - 1, 0.15, cz - 1, cx + 1, 0.2, cz + 1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'ChairSpot' });

  // 조회대 + 국기게양대
  grp('Podium', () => {
    B('Stage', cx - 14, 0, -96, cx + 14, 4, -86, [200, 196, 188], 'Concrete');
    for (let i = 0; i < 3; i++) B('Step', cx - 5, 0, -86 + i * 1.2, cx + 5, 3 - i, -84.8 + i * 1.2, [190, 186, 178], 'Concrete');
    B('BackWall', cx - 14, 4, -96.5, cx + 14, 12, -95.8, [180, 60, 50], 'Brick');
    B('Roof', cx - 15, 12, -97, cx + 15, 12.8, -86, [90, 86, 82], 'Concrete');
    [cx - 13.4, cx + 13.4].forEach((x) => B('Column', x - 0.5, 4, -87, x + 0.5, 12, -86, [200, 196, 188], 'Concrete'));
    B('Lectern', cx - 1.6, 4, -91, cx + 1.6, 7.6, -89, [130, 90, 56], 'Wood');
  });
  [[-129, [245, 245, 245]], [-121, [30, 60, 140]], [-101, [245, 245, 245]], [-93, [30, 120, 70]]].forEach(([x, flag], i) => grp('Flagpole', () => {
    cylV('Pole', x, 0, -101, 32, 0.45, [210, 212, 216], 'Metal');
    ball('Top', x, 32.3, -101, 0.9, [210, 180, 60], 'Metal');
    if (i !== 2) B('Flag', x + 0.3, 26, -101.1, x + 6.3, 30, -100.9, flag, 'Fabric', { nc: true });
  }));
  // 등나무 벤치 (서쪽)
  grp('Pergola', () => {
    for (let z = -10; z <= 70; z += 16) {
      B('Post', -213, 0, z - 0.4, -212.2, 9, z + 0.4, [120, 90, 64], 'Wood');
      B('Post', -204.8, 0, z - 0.4, -204, 9, z + 0.4, [120, 90, 64], 'Wood');
      B('Bench', -212, 0, z + 2, -205, 1.8, z + 12, [150, 110, 70], 'WoodPlanks');
    }
    for (let z = -11; z <= 72; z += 2.5) B('Beam', -214, 9, z, -203, 9.5, z + 0.5, [120, 90, 64], 'Wood');
    for (let i = 0; i < 16; i++) ball('Wisteria', -208.5 + (rnd() - 0.5) * 6, 10 + rnd(), -8 + i * 5, 7 + rnd() * 3, pick([[90, 110, 60], [70, 100, 56], [120, 100, 150]]), 'LeafyGrass', { nc: true });
  });
  // 철봉
  grp('PullUpBars', () => {
    [0, 1, 2].forEach((i) => {
      const z = 110 + i * 6;
      cylV('Post', -206, 0, z, 7 - i, 0.4, [150, 60, 50], 'Metal');
      cylV('Post', -206, 0, z + 5, 7 - i, 0.4, [150, 60, 50], 'Metal');
      P('Bar', [5, 0.25, 0.25], [-206, 6.8 - i, z + 2.5], [190, 190, 194], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
    });
  });
  // 운동장 조명탑 (꺼져 있음)
  [[-200, -95], [-200, 185], [-24, -95], [-24, 185]].forEach(([x, z]) => grp('FloodLight', () => {
    cylV('Tower', x, 0, z, 46, 1.4, [150, 152, 156], 'Metal');
    B('Panel', x - 3, 44, z - 1, x + 3, 49, z + 1, [60, 62, 66], 'Metal');
    B('Lamps', x - 2.6, 44.4, z - 1.15, x + 2.6, 48.6, z - 1.05, [200, 200, 190], 'SmoothPlastic', { tag: 'FieldLight' });
  }));
  // 화단·나무
  for (let z = -80; z <= 180; z += 26) { tree(-212, z + 8, 24, 'round'); }
  for (let x = -200; x <= -30; x += 28) tree(x, 194, 22, 'round');
  for (let x = 30; x <= 210; x += 24) tree(x, 194, 22, x % 48 === 0 ? 'pine' : 'round');
  for (let z = -20; z <= 180; z += 22) tree(212, z, 24, 'pine');
  for (let x = -200; x <= 200; x += 22) tree(x, -192, 26, 'round');
  for (let z = 20; z < 90; z += 22) { tree(30, z, 20, 'round'); tree(96, z, 20, 'pine'); }
  // 정원 벤치 + 가로등
  [[50, 40], [70, 62], [50, 80]].forEach(([x, z]) => B('Bench', x - 3, 0, z - 0.8, x + 3, 1.8, z + 0.8, [150, 110, 70], 'WoodPlanks'));
  [[-15, 160], [-15, 110], [-15, 60], [-15, 10], [-15, -40], [-15, -90]].forEach(([x, z], i) => streetLight(x, z, 90, { h: 14, range: 34, flicker: i === 3 }));
  [[15, 140], [60, 175], [100, 130]].forEach(([x, z]) => streetLight(x, z, -90, { h: 14, range: 34 }));
  // 자전거 보관대
  grp('BikeShed', () => {
    B('Roof', 40, 7, -112, 90, 7.5, -102, [80, 130, 160], 'Plastic', { t: 0.2 });
    for (let x = 40; x <= 90; x += 10) B('Post', x - 0.2, 0, -102.6, x + 0.2, 7, -102.2, [80, 84, 90], 'Metal');
    for (let i = 0; i < 9; i++) {
      const x = 44 + i * 5;
      P('Wheel', [0.3, 2.4, 2.4], [x, 1.2, -109], C.black, 'Fabric', { sh: 'Cylinder', r: [0, 90, 0] });
      P('Wheel', [0.3, 2.4, 2.4], [x, 1.2, -105], C.black, 'Fabric', { sh: 'Cylinder', r: [0, 90, 0] });
      B('Frame', x - 0.1, 1.6, -108.5, x + 0.1, 2.6, -105.5, pick([[200, 40, 40], [40, 80, 200], [30, 30, 30], [230, 230, 230]]), 'Metal');
    }
  });
});

// ═════════════════════════ 4. 체육관 ═════════════════════════
grp('Gym', () => {
  const x0 = 104, x1 = 196, z0 = -96, z1 = -30, H = 24;
  const wc = [210, 204, 192];
  B('Floor', x0, 0, z0, x1, 1, z1, [190, 150, 100], 'WoodPlanks');
  const holesX = [];
  for (let x = x0 + 4; x < x1 - 8; x += 11) holesX.push({ u0: x, u1: x + 7, v0: 13, v1: 20 });
  wallHoles('Wall', 'x', x0, x1, 1, H, z1 - 1, z1, holesX, wc, 'Concrete');
  wallHoles('Wall', 'x', x0, x1, 1, H, z0, z0 + 1, holesX, wc, 'Concrete');
  holesX.forEach((h) => { windowX(h.u0, h.u1, h.v0, h.v1, z1 - 0.5); windowX(h.u0, h.u1, h.v0, h.v1, z0 + 0.5); });
  wallHoles('Wall', 'z', z0, z1, 1, H, x0, x0 + 1, [{ u0: -70, u1: -56, v0: 1, v1: 11 }], wc, 'Concrete');
  wallHoles('Wall', 'z', z0, z1, 1, H, x1 - 1, x1, [], wc, 'Concrete');
  B('DoorL', x0 - 0.3, 1, -70, x0 + 0.2, 11, -63, [80, 110, 140], 'Glass', { t: 0.4 });
  B('DoorR', x0 - 0.3, 1, -63, x0 + 0.2, 11, -56, [80, 110, 140], 'Glass', { t: 0.4 });
  B('BaseBand', x0 - 0.2, 0, z0 - 0.2, x1 + 0.2, 2.5, z1 + 0.2, C.brick, 'Brick');
  // 박공지붕 (용마루는 X방향)
  const half = (z1 - z0) / 2 + 2, rise = 9, ang = Math.atan2(rise, half) * 180 / Math.PI, len = Math.hypot(half, rise);
  P('RoofN', [x1 - x0 + 4, 0.8, len], [(x0 + x1) / 2, H + rise / 2, (z0 + z1) / 2 - half / 2], [70, 100, 130], 'Metal', { r: [ang, 0, 0] });
  P('RoofS', [x1 - x0 + 4, 0.8, len], [(x0 + x1) / 2, H + rise / 2, (z0 + z1) / 2 + half / 2], [70, 100, 130], 'Metal', { r: [-ang, 0, 0] });
  // 박공 벽 (양 끝 삼각형을 계단식으로)
  for (let i = 0; i < 9; i++) {
    const w = (z1 - z0) * (1 - (i + 0.5) / 9.5);
    [x0, x1 - 1].forEach((x) => B('Gable', x, H + i, (z0 + z1) / 2 - w / 2, x + 1, H + i + 1, (z0 + z1) / 2 + w / 2, wc, 'Concrete'));
  }
  B('Sign', x0 - 0.4, 12.5, -72, x0 - 0.1, 15.5, -54, [30, 60, 120], 'SmoothPlastic',
    { text: { face: 'Left', text: '체 육 관', color: [255, 255, 255], bg: [30, 60, 120], bgT: 0, lit: 0.6 } });
  // 농구 골대
  [[x0 + 3, 90], [x1 - 3, -90]].forEach(([x, ry]) => grp('Hoop', () => {
    B('Backboard', x - 0.2, 13, -66, x + 0.2, 17, -60, C.white, 'SmoothPlastic', { t: 0.2 });
    P('Rim', [0.2, 2.6, 2.6], [x + (ry > 0 ? 1.6 : -1.6), 13.5, -63], [230, 90, 30], 'Metal', { sh: 'Cylinder', r: [0, 0, 90] });
  }));
  B('Stage', x1 - 14, 1, z0 + 1, x1 - 1, 5, z1 - 1, [140, 100, 60], 'WoodPlanks');
  B('Curtain', x1 - 2, 5, z0 + 3, x1 - 1.4, 20, z1 - 3, [140, 30, 40], 'Fabric');
});

// ═════════════════════════ 5. 본관 (3층 + 옥상 + 시계탑) ═════════════════════════
const BX0 = -150, BX1 = 150, ZN = -175, ZS = -125;
const CORR0 = -174, PART0 = -163, PART1 = -162, ROOM1 = -126;
const LV = [1, 15, 29], FH = 14, ROOFY = 43;
const HALL0 = -12, HALL1 = 12;
const ROOMW = 33.5;
const rooms = []; // {xa,xb,floor,L,name,kind}
const ROOMS = [
  { L: ['교무실', '행정실', '보건실', '방송실'], R: ['1-1', '1-2', '1-3', '과학실'] },
  { L: ['2-1', '2-2', '2-3', '2-4'], R: ['2-5', '2-6', '2-7', '도서실'] },
  { L: ['3-1', '3-2', '3-3', '3-4'], R: ['3-5', '3-6', '음악실', '미술실'] },
];
for (let f = 0; f < 3; f++) for (let i = 0; i < 4; i++) {
  const xbL = HALL0 - i * (ROOMW + 1), xaL = xbL - ROOMW;
  const xaR = HALL1 + i * (ROOMW + 1), xbR = xaR + ROOMW;
  rooms.push({ xa: xaL, xb: xbL, f, L: LV[f], name: ROOMS[f].L[i], wing: 'L' });
  rooms.push({ xa: xaR, xb: xbR, f, L: LV[f], name: ROOMS[f].R[i], wing: 'R' });
}

function desk(dx, dz, L, gname, extra) {
  grp(gname, () => {
    B('DeskTop', dx - 0.95, L + 2.55, dz - 1.35, dx + 0.95, L + 2.7, dz + 1.35, [196, 160, 112], 'Wood');
    B('DeskSide', dx - 0.8, L, dz - 1.25, dx + 0.8, L + 2.55, dz - 1.12, C.metalLight, 'Metal');
    B('DeskSide', dx - 0.8, L, dz + 1.12, dx + 0.8, L + 2.55, dz + 1.25, C.metalLight, 'Metal');
    B('DeskShelf', dx - 0.7, L + 1.95, dz - 1.12, dx + 0.8, L + 2.05, dz + 1.12, C.metalLight, 'Metal', { nc: true });
    const cx = dx + 2.0 + (rnd() - 0.5) * 0.5, cz = dz + (rnd() - 0.5) * 0.6;
    B('ChairSeat', cx - 0.8, L + 1.55, cz - 0.85, cx + 0.8, L + 1.7, cz + 0.85, [196, 160, 112], 'Wood');
    B('ChairBack', cx + 0.75, L + 1.95, cz - 0.85, cx + 0.9, L + 3.3, cz + 0.85, [196, 160, 112], 'Wood');
    B('ChairLeg', cx - 0.75, L, cz - 0.8, cx + 0.85, L + 1.55, cz - 0.68, C.metal, 'Metal', { nc: true });
    B('ChairLeg', cx - 0.75, L, cz + 0.68, cx + 0.85, L + 1.55, cz + 0.8, C.metal, 'Metal', { nc: true });
    B('ChairPost', cx + 0.78, L + 1.7, cz - 0.1, cx + 0.88, L + 1.95, cz + 0.1, C.metal, 'Metal', { nc: true });
    if (extra && rnd() < 0.18) B('Bag', dx + 0.9, L + 1.2, dz - 1.6, dx + 1.6, L + 2.4, dz - 1.25, pick([[40, 50, 90], [120, 30, 40], [40, 40, 40], [60, 100, 70]]), 'Fabric', { nc: true });
    if (extra && rnd() < 0.1) B('Book', dx - 0.6, L + 2.7, dz - 0.6, dx + 0.4, L + 2.85, dz + 0.5, pick([[200, 60, 60], [60, 90, 200], [240, 220, 120]]), 'SmoothPlastic', { nc: true });
  }, 'DeskSet');
}

function ceilingFixtures(xa, xb, z0, z1, L, tagName, lightOn, lightTag) {
  const ny = L + FH - 1.2;
  const xs = [xa + (xb - xa) * 0.25, xa + (xb - xa) * 0.5, xa + (xb - xa) * 0.75];
  const zs = [z0 + (z1 - z0) * 0.3, z0 + (z1 - z0) * 0.7];
  xs.forEach((x, ix) => zs.forEach((z, iz) => {
    const isLight = ix === 1 && iz === 0;
    B('Fixture', x - 3, ny - 0.3, z - 0.6, x + 3, ny, z + 0.6, lightOn ? [250, 252, 255] : [214, 216, 218], lightOn ? 'Neon' : 'SmoothPlastic',
      { tag: tagName, nc: true, ns: true, light: isLight ? { type: 'Point', range: 30, brightness: lightOn ? 0.9 : 0, color: [225, 235, 255], enabled: lightOn, shadows: true } : undefined,
        ...(isLight && lightTag ? { tag: [tagName, lightTag] } : {}) });
  }));
}

function blackboard(xa, L, zc, text) {
  B('BoardFrame', xa, L + 3.2, zc - 9, xa + 0.35, L + 9.6, zc + 9, [150, 110, 70], 'Wood');
  B('Blackboard', xa + 0.3, L + 3.5, zc - 8.6, xa + 0.45, L + 9.3, zc + 8.6, C.board, 'Slate', {
    tag: 'Blackboard', text: { face: 'Right', text: text || '', color: [235, 235, 225], bg: C.board, bgT: 1, font: 'PatrickHand', lit: 1 } });
  B('ChalkTray', xa + 0.3, L + 3.2, zc - 8.6, xa + 0.9, L + 3.4, zc + 8.6, [150, 110, 70], 'Wood', { nc: true });
  B('Chalk', xa + 0.5, L + 3.4, zc - 3, xa + 0.7, L + 3.55, zc - 2.4, C.white, 'SmoothPlastic', { nc: true });
  B('MottoFrame', xa + 0.1, L + 10.1, zc - 3.6, xa + 0.35, L + 12.3, zc + 3.6, [120, 84, 52], 'Wood', { nc: true });
  B('Motto', xa + 0.3, L + 10.3, zc - 3.4, xa + 0.4, L + 12.1, zc + 3.4, [250, 248, 240], 'SmoothPlastic', { nc: true, tag: 'Motto',
    text: { face: 'Right', text: '급훈  늦게까지 남지 말자', color: [30, 30, 30], bg: [250, 248, 240], bgT: 0, font: 'Merriweather' } });
}

function classroom(rm) {
  const { xa, xb, L, name } = rm;
  const z0 = PART1, z1 = ROOM1;
  const zc = (z0 + z1) / 2;
  const isClass = /^\d-\d$/.test(name);
  grp(name, () => {
    // 앞: xa 쪽 / 뒤: xb 쪽
    const boardText = isClass ? `${pick(['11', '11'])}월 13일 (금)\n주번: ${pick(['김', '이', '박', '최'])}○○\n\n${pick(['기말고사 D-18', '자습', '수행평가 제출', '청소 당번 1분단'])}` : '';
    if (isClass || name === '과학실' || name === '음악실' || name === '미술실') blackboard(xa, L, zc + 1, boardText);
    if (isClass) {
      B('Lectern', xa + 4, L, zc - 1.2, xa + 6.2, L + 3.6, zc + 1.6, [150, 106, 64], 'Wood');
      B('TeacherDesk', xa + 3, L, z0 + 2, xa + 8, L + 2.6, z0 + 5, [120, 122, 128], 'Metal');
      B('TeacherDeskTop', xa + 2.9, L + 2.6, z0 + 1.9, xa + 8.1, L + 2.75, z0 + 5.1, [90, 110, 90], 'SmoothPlastic');
      B('TV', xa + 0.2, L + 8.4, z1 - 7.5, xa + 0.6, L + 11.4, z1 - 2.5, C.black, 'SmoothPlastic', { tag: 'ClassTV' });
      B('AirCon', xa + 0.2, L + 7, z0 + 1.2, xa + 1.4, L + 12, z0 + 3.2, [236, 236, 232], 'SmoothPlastic');
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
        desk(xa + 11.5 + r * 4.4, z0 + 5.5 + c * 5.1, L, `Desk_${r + 1}_${c + 1}`, true);
      }
      // 사물함
      B('Lockers', xb - 1.8, L, z0 + 2, xb, L + 4.6, z1 - 2, [200, 190, 160], 'WoodPlanks');
      for (let z = z0 + 2 + 2.6; z < z1 - 2.5; z += 2.6) B('LockerLine', xb - 1.85, L + 0.2, z - 0.05, xb - 1.8, L + 4.4, z + 0.05, [120, 100, 70], 'SmoothPlastic', { nc: true, ns: true });
      B('LockerLine', xb - 1.85, L + 2.25, z0 + 2, xb - 1.8, L + 2.35, z1 - 2, [120, 100, 70], 'SmoothPlastic', { nc: true, ns: true });
      B('Corkboard', xb - 0.25, L + 6, z0 + 6, xb, L + 10.5, z1 - 6, [176, 130, 84], 'Fabric');
      for (let i = 0; i < 6; i++) {
        const z = z0 + 8 + i * 3.8 + rnd();
        B('Notice', xb - 0.32, L + 6.8 + rnd() * 1.6, z, xb - 0.25, L + 8.6 + rnd() * 1.4, z + 2.2, pick([[250, 250, 245], [255, 240, 160], [200, 230, 255], [255, 200, 210]]), 'SmoothPlastic', { nc: true, ns: true });
      }
      B('CleaningCabinet', xb - 2.2, L, z1 - 2, xb, L + 7, z1 - 0.2, [150, 156, 160], 'Metal');
      cylV('TrashBin', xb - 4, L, z1 - 1.4, 2, 1.6, [60, 120, 180], 'Plastic');
    } else if (name === '교무실') {
      for (let g = 0; g < 4; g++) for (let k = 0; k < 6; k++) {
        const x = xa + 6 + (g % 2) * 13 + (k % 2) * 4.2, z = z0 + 6 + Math.floor(g / 2) * 15 + Math.floor(k / 2) * 3.6;
        B('Desk', x - 2, L, z - 1.6, x + 2, L + 2.6, z + 1.6, [130, 134, 140], 'Metal');
        B('DeskTop', x - 2.05, L + 2.6, z - 1.65, x + 2.05, L + 2.75, z + 1.65, [210, 205, 190], 'SmoothPlastic');
        const glow = rnd() < 0.3;
        B('Monitor', x - 0.1 + (k % 2 ? -1.2 : 1.2), L + 2.75, z - 1.1, x + 0.1 + (k % 2 ? -1.2 : 1.2), L + 4.5, z + 1.1,
          glow ? [40, 70, 140] : C.black, glow ? 'Neon' : 'SmoothPlastic', { nc: true, tag: glow ? 'GlowMonitor' : undefined });
        B('Papers', x - 1.2, L + 2.75, z - 0.6, x - 0.2, L + 3.2 + rnd() * 0.8, z + 0.6, [245, 245, 240], 'SmoothPlastic', { nc: true });
      }
      B('Whiteboard', xa + 0.2, L + 4, z0 + 6, xa + 0.4, L + 10, z1 - 6, [245, 245, 245], 'SmoothPlastic',
        { text: { face: 'Right', text: '11월 행사\n· 13일(금) 야간경비 교대\n· 신규 경비원: 공유 씨\n· ※ 4층 출입 금지', color: [30, 60, 160], bgT: 1, font: 'PatrickHand' } });
      B('Copier', xb - 4, L, z1 - 4, xb - 0.5, L + 4, z1 - 0.5, [220, 220, 216], 'SmoothPlastic');
      B('Sofa', xb - 3, L, z0 + 4, xb - 0.5, L + 2.4, z0 + 14, [110, 60, 50], 'Fabric');
    } else if (name === '행정실') {
      B('Counter', xa + 1, L, z0 + 4, xb - 1, L + 3.6, z0 + 6, [170, 140, 100], 'WoodPlanks');
      for (let k = 0; k < 4; k++) {
        const x = xa + 6 + k * 7;
        B('Desk', x - 2, L, z1 - 10, x + 2, L + 2.7, z1 - 6, [130, 134, 140], 'Metal');
        B('Monitor', x - 1.2, L + 2.7, z1 - 9.8, x + 1.2, L + 4.4, z1 - 9.6, C.black, 'SmoothPlastic', { nc: true });
      }
      B('Safe', xb - 3.5, L, z1 - 3.5, xb - 0.5, L + 4, z1 - 0.5, [70, 72, 74], 'DiamondPlate');
      B('FileCabinet', xa + 0.5, L, z1 - 5, xa + 3, L + 6, z1 - 0.5, [150, 154, 160], 'Metal');
    } else if (name === '보건실') {
      for (let k = 0; k < 3; k++) {
        const x = xa + 6 + k * 9;
        B('BedFrame', x - 2.2, L, z1 - 11, x + 2.2, L + 2, z1 - 1, [220, 220, 226], 'Metal');
        B('Mattress', x - 2, L + 2, z1 - 10.8, x + 2, L + 2.7, z1 - 1.2, [245, 245, 250], 'Fabric');
        B('Pillow', x - 1.6, L + 2.7, z1 - 3.2, x + 1.6, L + 3.3, z1 - 1.6, C.white, 'Fabric');
        B('BedCurtain', x + 3.2, L, z1 - 12, x + 3.4, L + 9, z1 - 1, [200, 220, 225], 'Fabric', { t: 0.15 });
      }
      B('Blanket', xa + 4.2, L + 2.7, z1 - 9, xa + 7.8, L + 3.6, z1 - 3.5, [140, 170, 200], 'Fabric', { tag: 'SickBedLump' });
      B('MedCabinet', xa + 0.5, L, z0 + 2, xa + 2.5, L + 7, z0 + 10, [240, 240, 240], 'SmoothPlastic');
      B('Desk', xb - 8, L, z0 + 2, xb - 2, L + 2.7, z0 + 5, [130, 134, 140], 'Metal');
      B('EyeChart', xb - 0.3, L + 5, zc - 2, xb - 0.1, L + 10, zc + 2, C.white, 'SmoothPlastic',
        { text: { face: 'Left', text: 'E\nㅂ ㅍ\nㅁ ㅎ ㄹ\n나 를 봐\n뒤 에 있 어', color: [10, 10, 10], bgT: 1, font: 'Arial' } });
    } else if (name === '방송실') {
      B('Console', xa + 2, L, zc - 8, xa + 7, L + 3.2, zc + 8, [60, 62, 66], 'Metal', { tag: 'BroadcastConsole' });
      for (let i = 0; i < 18; i++) B('Button', xa + 3 + (i % 3) * 1.2, L + 3.2, zc - 7 + Math.floor(i / 3) * 2.4, xa + 3.6 + (i % 3) * 1.2, L + 3.4, zc - 6.4 + Math.floor(i / 3) * 2.4,
        pick([[255, 60, 60], [60, 255, 120], [255, 200, 60]]), 'Neon', { nc: true, ns: true });
      cylV('MicStand', xa + 8, L, zc, 4, 0.2, C.metal, 'Metal');
      ball('Mic', xa + 8, L + 4.3, zc, 0.8, [40, 40, 40], 'Metal');
      B('Speaker', xa + 0.3, L + 8, zc - 12, xa + 1.8, L + 11, zc - 9, [30, 30, 32], 'Fabric');
      B('OnAir', xa + 0.2, L + 10.5, zc - 2, xa + 0.4, L + 12, zc + 2, [80, 20, 20], 'SmoothPlastic', { tag: 'OnAirSign',
        text: { face: 'Right', text: 'ON AIR', color: [255, 80, 80], bgT: 1, font: 'GothamBlack', lit: 0 } });
    } else if (name === '과학실') {
      for (let k = 0; k < 6; k++) {
        const x = xa + 11 + (k % 3) * 7.5, z = z0 + 9 + Math.floor(k / 3) * 15;
        B('LabBase', x - 2.5, L, z - 4, x + 2.5, L + 3, z + 4, [236, 236, 230], 'SmoothPlastic');
        B('LabTop', x - 2.7, L + 3, z - 4.2, x + 2.7, L + 3.25, z + 4.2, [24, 24, 26], 'Slate');
        B('Faucet', x - 0.2, L + 3.25, z - 0.2, x + 0.2, L + 4.6, z + 0.2, C.metalLight, 'Metal', { nc: true });
        [-3, 3].forEach((dz) => cylV('Stool', x + 3.6, L, z + dz, 2, 1.3, [60, 90, 140], 'Plastic'));
      }
      grp('Skeleton', () => { // 인체 골격 모형
        const x = xb - 3, z = z1 - 4;
        B('Stand', x - 1, L, z - 1, x + 1, L + 0.3, z + 1, C.metal, 'Metal');
        cylV('Pole', x, L + 0.3, z, 3, 0.2, C.metal, 'Metal');
        ball('Skull', x, L + 8.2, z, 1.4, [235, 230, 210], 'SmoothPlastic');
        B('Spine', x - 0.15, L + 4, z - 0.15, x + 0.15, L + 7.5, z + 0.15, [235, 230, 210], 'SmoothPlastic');
        for (let i = 0; i < 5; i++) B('Rib', x - 0.9 + i * 0.05, L + 5.6 + i * 0.35, z - 0.7, x + 0.9 - i * 0.05, L + 5.75 + i * 0.35, z + 0.7, [235, 230, 210], 'SmoothPlastic', { nc: true });
        B('Pelvis', x - 0.9, L + 3.6, z - 0.4, x + 0.9, L + 4.2, z + 0.4, [235, 230, 210], 'SmoothPlastic');
        [-0.5, 0.5].forEach((d) => B('Leg', x + d - 0.12, L + 0.4, z - 0.12, x + d + 0.12, L + 3.6, z + 0.12, [235, 230, 210], 'SmoothPlastic', { nc: true }));
        [-1.1, 1.1].forEach((d) => B('Arm', x + d - 0.1, L + 4, z - 0.1, x + d + 0.1, L + 7.2, z + 0.1, [235, 230, 210], 'SmoothPlastic', { nc: true }));
      }, 'Skeleton');
      B('SpecimenShelf', xb - 1.6, L, z0 + 2, xb, L + 8, z0 + 14, [140, 110, 80], 'Wood');
      for (let i = 0; i < 8; i++) B('Jar', xb - 1.4, L + 1 + (i % 4) * 1.8, z0 + 3 + Math.floor(i / 4) * 5, xb - 0.4, L + 2.4 + (i % 4) * 1.8, z0 + 4 + Math.floor(i / 4) * 5,
        pick([[180, 200, 120], [200, 180, 140], [150, 190, 170]]), 'Glass', { t: 0.3, nc: true });
    } else if (name === '도서실') {
      for (let k = 0; k < 5; k++) {
        const x = xa + 6 + k * 5.6;
        B('Shelf', x - 0.8, L, z0 + 3, x + 0.8, L + 8, z0 + 17, [130, 96, 60], 'Wood');
        for (let s = 0; s < 4; s++) for (let b = 0; b < 2; b++)
          B('Books', x - 0.85 + b * 0.85, L + 0.4 + s * 2, z0 + 3.3, x - 0.05 + b * 0.85, L + 1.8 + s * 2, z0 + 16.7,
            pick([[150, 40, 40], [40, 70, 130], [50, 110, 70], [200, 170, 90], [90, 60, 120]]), 'SmoothPlastic', { nc: true, ns: true });
      }
      for (let k = 0; k < 3; k++) {
        const x = xa + 8 + k * 9;
        B('ReadingTable', x - 3, L, z1 - 12, x + 3, L + 2.7, z1 - 4, [170, 130, 84], 'Wood');
      }
    } else if (name === '음악실') {
      grp('Piano', () => {
        B('Body', xa + 3, L, z0 + 3, xa + 9, L + 4.5, z0 + 6, C.black, 'SmoothPlastic');
        B('Keys', xa + 3.2, L + 2.8, z0 + 6, xa + 8.8, L + 3.1, z0 + 7.2, C.white, 'SmoothPlastic', { nc: true });
        B('Bench', xa + 4.5, L, z0 + 8, xa + 7.5, L + 1.8, z0 + 9.2, C.black, 'SmoothPlastic');
      }, 'Piano');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
        const x = xa + 13 + r * 4.6, z = z0 + 6 + c * 4.6;
        B('Chair', x - 0.8, L + 1.5, z - 0.8, x + 0.8, L + 1.7, z + 0.8, [70, 80, 120], 'Plastic');
        B('ChairLegs', x - 0.7, L, z - 0.7, x + 0.7, L + 1.5, z + 0.7, C.metal, 'Metal', { t: 0.6, nc: true });
      }
      B('Portrait', xb - 0.3, L + 7, zc - 2, xb - 0.1, L + 11, zc + 2, [60, 46, 34], 'Wood', { tag: 'Portrait',
        text: { face: 'Left', text: '베토벤', color: [230, 210, 170], bg: [40, 34, 30], bgT: 0, font: 'Merriweather' } });
    } else if (name === '미술실') {
      for (let k = 0; k < 8; k++) {
        const x = xa + 10 + (k % 4) * 5.5, z = z0 + 8 + Math.floor(k / 4) * 14;
        P('EaselLeg', [0.25, 7, 0.25], [x, L + 3.4, z], [150, 110, 70], 'Wood', { r: [0, 0, 10] });
        B('Canvas', x - 1.6, L + 3.5, z - 1.4, x - 1.4, L + 6.5, z + 1.4, C.white, 'Fabric');
      }
      grp('PlasterBust', () => {
        B('Pedestal', xa + 4, L, zc - 1.5, xa + 7, L + 4, zc + 1.5, [230, 228, 222], 'Marble');
        B('Shoulders', xa + 4.5, L + 4, zc - 1.4, xa + 6.5, L + 5.2, zc + 1.4, [240, 238, 232], 'Marble');
        ball('Head', xa + 5.5, L + 6.2, zc, 1.9, [240, 238, 232], 'Marble', { tag: 'BustHead' });
      }, 'PlasterBust');
    }
    // 공통: 천장 조명, 시계, 커튼
    ceilingFixtures(xa, xb, z0, z1, L, 'RoomFixture', false, 'RoomLight');
    P('Clock', [0.3, 2.2, 2.2], [xb - 0.2, L + 11.2, zc], [245, 245, 240], 'SmoothPlastic', { sh: 'Cylinder', tag: 'ClassClock', nc: true });
    for (let k = 0; k < 3; k++) {
      const u0 = xa + 3 + k * 10.3;
      B('Curtain', u0 - 0.5, L + 2.6, ROOM1 - 0.6, u0 + 1.2, L + 11.6, ROOM1 - 0.4, [232, 222, 196], 'Fabric', { nc: true });
      B('Curtain', u0 + 7.8, L + 2.6, ROOM1 - 0.6, u0 + 9.5, L + 11.6, ROOM1 - 0.4, [232, 222, 196], 'Fabric', { nc: true });
    }
  }, isClass ? 'Classroom' : 'SpecialRoom');
}

grp('MainBuilding', () => {
  // 기초 + 바닥
  B('Foundation', BX0 - 0.5, 0, ZN - 0.5, BX1 + 0.5, 1, ZS + 0.5, [150, 146, 140], 'Concrete');
  const HOLE = { x0: 6, x1: 11, z0: -147, z1: -130 };
  for (let f = 0; f < 4; f++) {
    const y1 = f < 3 ? LV[f] : ROOFY, y0 = y1 - 1;
    if (f > 0) {
      // 복도
      B('CorridorSlab', BX0, y0, ZN, BX1, y1, PART1, C.corridor, 'Marble');
      // 교실 날개
      B('WingSlab', BX0, y0, PART1, HALL0, y1, ZS, f < 3 ? C.woodFloor : C.roofGreen, f < 3 ? 'WoodPlanks' : 'Concrete');
      B('WingSlab', HALL1, y0, PART1, BX1, y1, ZS, f < 3 ? C.woodFloor : C.roofGreen, f < 3 ? 'WoodPlanks' : 'Concrete');
      // 홀 (계단 구멍 제외)
      const hc = f < 3 ? C.corridor : C.roofGreen, hm = f < 3 ? 'Marble' : 'Concrete';
      B('HallSlab', HALL0, y0, PART1, HOLE.x0, y1, ZS, hc, hm);
      B('HallSlab', HOLE.x0, y0, PART1, HALL1, y1, HOLE.z0, hc, hm);
      B('HallSlab', HOLE.x0, y0, HOLE.z1, HALL1, y1, ZS, hc, hm);
      B('HallSlab', HOLE.x1, y0, HOLE.z0, HALL1, y1, HOLE.z1, hc, hm);
      // 천장판
      B('Ceiling', BX0 + 1, y0 - 0.2, CORR0, BX1 - 1, y0, PART0, C.ceiling, 'SmoothPlastic', { ns: true });
      B('Ceiling', BX0 + 1, y0 - 0.2, PART1, HALL0 - 1, y0, ROOM1, C.ceiling, 'SmoothPlastic', { ns: true });
      B('Ceiling', HALL1 + 1, y0 - 0.2, PART1, BX1 - 1, y0, ROOM1, C.ceiling, 'SmoothPlastic', { ns: true });
    } else {
      B('CorridorFloor', BX0 + 1, 0.9, CORR0, BX1 - 1, 1, PART1, C.corridor, 'Marble');
      B('WingFloor', BX0 + 1, 0.9, PART1, HALL0, 1, ROOM1, C.woodFloor, 'WoodPlanks');
      B('WingFloor', HALL1, 0.9, PART1, BX1 - 1, 1, ROOM1, C.woodFloor, 'WoodPlanks');
      B('HallFloor', HALL0, 0.9, PART1, HALL1, 1, ROOM1, C.corridor, 'Marble');
    }
  }

  for (let f = 0; f < 3; f++) {
    const L = LV[f], top = L + FH - 1;
    grp(`F${f + 1}`, () => {
      // ── 바깥벽: 남쪽(운동장 쪽, 교실 창) ──
      const southHoles = [];
      rooms.filter((r) => r.f === f).forEach((r) => {
        for (let k = 0; k < 3; k++) { const u0 = r.xa + 3 + k * 10.3; southHoles.push({ u0: u0 + 1.2, u1: u0 + 7.8, v0: L + 3, v1: L + 11 }); }
      });
      if (f === 0) southHoles.push({ u0: -10, u1: -1, v0: L, v1: L + 9.5 }); // 중앙현관
      else southHoles.push({ u0: -10, u1: 4, v0: L + 3, v1: L + 11 });
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ROOM1, ZS, southHoles, C.cream, 'Concrete');
      southHoles.forEach((h) => { if (!(f === 0 && h.u0 === -10)) windowX(h.u0, h.u1, h.v0, h.v1, ROOM1 + 0.5, { sill: true }); });
      if (f === 0) {
        B('EntranceDoor', -10, L, ROOM1 + 0.4, -5.5, L + 9.5, ROOM1 + 0.6, [90, 120, 140], 'Glass', { t: 0.45, nc: true, tag: 'EntranceDoor' });
        B('EntranceFrame', -5.6, L, ROOM1 + 0.2, -5.4, L + 9.5, ROOM1 + 0.8, FRAME, 'Metal', { nc: true });
        B('EntranceFrame', -10, L + 9.2, ROOM1 + 0.2, -1, L + 9.5, ROOM1 + 0.8, FRAME, 'Metal');
      }
      // ── 바깥벽: 북쪽(복도 창) ──
      const northHoles = [];
      for (let x = BX0 + 6; x < BX1 - 10; x += 17) northHoles.push({ u0: x, u1: x + 9, v0: L + 4, v1: L + 10.5 });
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ZN, CORR0, northHoles, C.cream, 'Concrete');
      northHoles.forEach((h) => windowX(h.u0, h.u1, h.v0, h.v1, ZN + 0.5));
      // ── 동/서 끝벽 (비상구) ──
      [[BX0, BX0 + 1, -1], [BX1 - 1, BX1, 1]].forEach(([x0, x1, s]) => {
        const holes = [{ u0: -171, u1: -166, v0: L, v1: L + 8 }, { u0: -150, u1: -138, v0: L + 4, v1: L + 10.5 }];
        wallHoles('EndWall', 'z', ZN, ZS, L - 1, top, x0, x1, holes, C.cream, 'Concrete');
        windowZ(-150, -138, L + 4, L + 10.5, (x0 + x1) / 2);
        B('ExitDoor', x0 + (s > 0 ? -0.2 : 0.8), L, -171, x0 + (s > 0 ? 0.2 : 1.2), L + 8, -166, [100, 130, 120], 'Metal');
        const sx = s > 0 ? x0 - 0.4 : x1 + 0.1;
        B('ExitSign', sx, L + 8.6, -170.5, sx + 0.3, L + 9.8, -166.5, [40, 220, 110], 'Neon', { nc: true, ns: true, tag: 'ExitSign',
          text: { face: s > 0 ? 'Left' : 'Right', text: '비상구 EXIT', color: [255, 255, 255], bgT: 1, lit: 0, font: 'GothamBlack' },
          light: { type: 'Point', range: 10, brightness: 0.6, color: [60, 255, 140] } });
      });
      // ── 복도·교실 칸막이벽 (문 2개 + 높은 창) ──
      rooms.filter((r) => r.f === f).forEach((r) => {
        const holes = [
          { u0: r.xa + 2.5, u1: r.xa + 6.5, v0: L, v1: L + 8 },
          { u0: r.xb - 6.5, u1: r.xb - 2.5, v0: L, v1: L + 8 },
          { u0: r.xa + 9, u1: r.xb - 9, v0: L + 8.6, v1: L + 11.4 },
        ];
        wallHoles('PartitionWall', 'x', r.xa - 0.5, r.xb + 0.5, L, top, PART0, PART1, holes, [236, 232, 220], 'Concrete');
        B('HighWindow', r.xa + 9, L + 8.6, PART0 + 0.42, r.xb - 9, L + 11.4, PART0 + 0.58, GLASS, 'Glass', { t: 0.6, ns: true });
        for (let x = r.xa + 9; x <= r.xb - 9; x += (r.xb - r.xa - 18) / 3) B('Frame', x - 0.15, L + 8.6, PART0 + 0.3, x + 0.15, L + 11.4, PART0 + 0.7, FRAME, 'Metal');
        // 미닫이문(열려 있음), 문 유리
        [r.xa + 6.5, r.xb - 2.5].forEach((u) => {
          B('SlidingDoor', u - 0.1, L, PART0 - 0.35, u + 4, L + 8, PART0 - 0.1, [168, 120, 76], 'WoodPlanks', { nc: true });
          B('DoorGlass', u + 1, L + 4.5, PART0 - 0.4, u + 3, L + 7, PART0 - 0.36, GLASS, 'Glass', { t: 0.4, nc: true });
        });
        // 교실 팻말
        B('RoomSign', r.xa + 2, L + 9.2, PART0 - 2.2, r.xa + 7, L + 10.6, PART0, [250, 250, 245], 'SmoothPlastic', {
          nc: true, tag: 'RoomSign', attr: { Room: r.name },
          text: { face: 'Front', text: /^\d-\d$/.test(r.name) ? `${r.name[0]}학년 ${r.name[2]}반` : r.name, color: [30, 40, 70], bg: [250, 250, 245], bgT: 0, lit: 1 } });
        // 교실 사이 벽 (동/서)
        if (r.xa - 1 > BX0 + 0.5 && !(r.xa - 1 >= HALL0 - 0.5 && r.xa <= HALL1 + 0.5)) B('RoomWall', r.xa - 1, L, PART1, r.xa, top, ROOM1, C.wall, 'Concrete');
        classroom(r);
      });
      // ── 복도 ──
      grp('Corridor', () => {
        // 복도 조명: 일부는 켜짐, 일부는 깜빡임
        for (let x = BX0 + 10; x < BX1 - 5; x += 17) {
          const on = Math.abs(x) < 70 || rnd() < 0.35;
          const fl = rnd() < 0.25;
          B('CorridorFixture', x - 3, top - 0.5, -169.2, x + 3, top - 0.2, -167.8, on ? [240, 248, 255] : [210, 212, 214], on ? 'Neon' : 'SmoothPlastic', {
            nc: true, ns: true, tag: fl ? ['CorridorLight', 'FlickerLight'] : 'CorridorLight',
            light: { type: 'Point', range: 26, brightness: on ? 0.7 : 0, color: [210, 225, 255], enabled: on, shadows: true } });
        }
        // 사물함 열 (복도 쪽)
        rooms.filter((r) => r.f === f).forEach((r) => {
          const a = r.xa + 7.5, b = r.xb - 7.5;
          if (b - a < 6) return;
          B('HallLockers', a + 1, L, PART0 - 1.8, b - 1, L + 5.2, PART0, [120, 150, 180], 'Metal');
          for (let x = a + 1 + 1.9; x < b - 1; x += 1.9) B('LockerSeam', x - 0.04, L + 0.2, PART0 - 1.85, x + 0.04, L + 5, PART0 - 1.8, [70, 90, 110], 'SmoothPlastic', { nc: true, ns: true });
        });
        // 소화기 상자, 게시판
        for (let x = BX0 + 20; x < BX1; x += 60) {
          B('FireBox', x, L + 2, ZN + 1, x + 2, L + 5, ZN + 1.6, [200, 30, 30], 'SmoothPlastic', { nc: true,
            text: { face: 'Back', text: '소화기', color: [255, 255, 255], bgT: 1, lit: 0.5 } });
          B('Bulletin', x + 5, L + 4.5, ZN + 1, x + 13, L + 9, ZN + 1.25, [176, 130, 84], 'Fabric', { nc: true });
          B('Poster', x + 6, L + 5, ZN + 1.25, x + 9, L + 8.5, ZN + 1.32, pick([[250, 230, 120], [200, 230, 255], [255, 200, 200]]), 'SmoothPlastic', { nc: true, ns: true });
        }
        // 이상현상: 복도 끝 학생이 나타나는 자리
        [[BX0 + 4, 1], [BX1 - 4, -1]].forEach(([x]) =>
          B('FigureSpot', x - 1, L, -170, x + 1, L + 0.1, -168, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'FigureSpot', attr: { Floor: f + 1 } }));
        // 순찰함
        B('PatrolBox', -26, L + 3.5, ZN + 1, -22, L + 7, ZN + 1.8, [60, 90, 70], 'Metal', {
          tag: 'PatrolPoint', attr: { Floor: f + 1 },
          text: { face: 'Back', text: `순찰함\n${f + 1}F`, color: [255, 255, 255], bgT: 1, lit: 0.3 } });
        B('FloorSign', -2, L + 10, -173.8, 4, L + 12, -173.6, [30, 50, 100], 'SmoothPlastic', { nc: true,
          text: { face: 'Back', text: `${f + 1}F`, color: [255, 255, 255], bg: [30, 50, 100], bgT: 0, lit: 0.7, font: 'GothamBlack' } });
      });
      // ── 중앙 홀 벽 ──
      B('HallWall', HALL0, L, PART1, HALL0 + 1, top, ROOM1, C.wall, 'Concrete');
      B('HallWall', HALL1 - 1, L, PART1, HALL1, top, ROOM1, C.wall, 'Concrete');
      if (f === 0) {
        B('ShoeLockers', -10.5, L, -160, -2, L + 6, -157.5, [170, 140, 100], 'WoodPlanks');
        B('Mirror', -10.8, L + 2, -150, -10.6, L + 10, -138, [200, 215, 225], 'Foil', { tag: 'HallMirror' });
        B('WaterCooler', -4, L, -133, -1.5, L + 4.6, -131, [235, 235, 240], 'SmoothPlastic');
        B('Trophy', -10.8, L + 6, -134, -9.4, L + 9, -128, [110, 80, 50], 'Glass', { t: 0.3 });
      }
      // ── 계단 (U자) ──
      grp('Stairs', () => {
        const d = 17 / 7;
        for (let i = 0; i < 7; i++) {
          B('Step', 0.5, L + i, -130 - (i + 1) * d, 5.5, L + i + 1, -130 - i * d, [170, 172, 168], 'Marble');
          B('Step', 6, L + 7 + i, -147 + i * d, 11, L + 8 + i, -147 + (i + 1) * d, [170, 172, 168], 'Marble');
          B('Nosing', 0.5, L + i + 0.98, -130 - i * d - 0.25, 5.5, L + i + 1.05, -130 - i * d, [200, 170, 60], 'SmoothPlastic', { nc: true, ns: true });
        }
        B('Landing', 0.5, L + 6, -157, 11, L + 7, -147, [170, 172, 168], 'Marble');
        B('Divider', 5.5, L, -147, 6, L + FH, -130, [210, 206, 196], 'Concrete');
        B('Handrail', 5.4, L + FH - 10.5, -147, 6.1, L + FH - 10.2, -130, [120, 90, 60], 'Wood', { nc: true });
        if (f > 0) B('HoleRail', 6, L, -147.3, 11, L + 3.4, -147, [150, 154, 160], 'Metal');
        const landingText = f < 2 ? `${f + 2}F ↑` : '옥상 ↑  (출입금지)';
        B('StairSign', 0.6, L + 9.5, -156.8, 6, L + 11.5, -156.6, [250, 250, 245], 'SmoothPlastic', {
          nc: true, tag: 'StairSign', attr: { Floor: f + 1 },
          text: { face: 'Back', text: landingText, color: [30, 40, 70], bg: [250, 250, 245], bgT: 0, lit: 1, font: 'GothamBlack' } });
      });
    });
  }

  // ── 바깥 마감: 벽돌 띠, 층 띠, 기둥 장식 ──
  grp('Facade', () => {
    B('BaseBand', BX0 - 0.3, 0, ZS - 0.1, BX1 + 0.3, 2.2, ZS + 0.3, C.brick, 'Brick');
    B('BaseBand', BX0 - 0.3, 0, ZN - 0.3, BX1 + 0.3, 2.2, ZN + 0.1, C.brick, 'Brick');
    [15, 29, 43].forEach((y) => {
      B('FloorBand', BX0 - 0.4, y - 1.2, ZS - 0.1, BX1 + 0.4, y + 0.2, ZS + 0.5, C.creamDark, 'Concrete');
      B('FloorBand', BX0 - 0.4, y - 1.2, ZN - 0.5, BX1 + 0.4, y + 0.2, ZN + 0.1, C.creamDark, 'Concrete');
      B('FloorBand', BX0 - 0.5, y - 1.2, ZN - 0.4, BX0 + 0.1, y + 0.2, ZS + 0.4, C.creamDark, 'Concrete');
      B('FloorBand', BX1 - 0.1, y - 1.2, ZN - 0.4, BX1 + 0.5, y + 0.2, ZS + 0.4, C.creamDark, 'Concrete');
    });
    const pil = [BX0, BX1, HALL0, HALL1];
    rooms.filter((r) => r.f === 0).forEach((r) => pil.push(r.xa - 0.5, r.xb + 0.5));
    [...new Set(pil.map((v) => Math.round(v * 10) / 10))].forEach((x) =>
      B('Pilaster', x - 0.7, 0, ZS - 0.1, x + 0.7, ROOFY + 3, ZS + 0.7, [210, 198, 172], 'Concrete'));
    // 중앙 현관 캐노피
    B('Canopy', -14, 11, ZS, 14, 12, ZS + 9, [190, 184, 172], 'Concrete');
    B('CanopyEdge', -14.2, 10.6, ZS + 8.6, 14.2, 12.3, ZS + 9.2, [140, 60, 50], 'SmoothPlastic');
    [-13, 13].forEach((x) => cylV('CanopyColumn', x, 0, ZS + 8, 11, 1.2, [220, 214, 200], 'Concrete'));
    B('EntranceSteps', -14, 0, ZS, 14, 0.5, ZS + 8, [170, 166, 160], 'Granite');
    B('EntranceSteps', -14, 0.5, ZS, 14, 1, ZS + 4, [170, 166, 160], 'Granite');
    B('CanopyLight', -2, 10.4, ZS + 3, 2, 10.6, ZS + 5, [255, 240, 210], 'Neon', { nc: true, light: { type: 'Point', range: 22, brightness: 0.8, color: [255, 220, 170], shadows: true } });
    // 학교 이름
    B('NameBoard', -26, 36.5, ZS + 0.1, 26, 41, ZS + 0.6, [200, 190, 165], 'Concrete', {
      text: { face: 'Back', text: '송 천 고 등 학 교', color: [40, 50, 80], bgT: 1, font: 'Merriweather', lit: 1 } });
    // 화단
    [[BX0 + 2, HALL0 - 4], [HALL1 + 4, BX1 - 2]].forEach(([x0, x1]) => {
      B('FlowerBedEdge', x0, 0, ZS + 2, x1, 1.2, ZS + 7, [160, 90, 70], 'Brick');
      B('FlowerBedSoil', x0 + 0.5, 1.2, ZS + 2.5, x1 - 0.5, 1.3, ZS + 6.5, [80, 60, 44], 'Ground');
      for (let x = x0 + 3; x < x1 - 2; x += 5) ball('Shrub', x + (rnd() - 0.5), 2.1, ZS + 4.5, 3 + rnd() * 1.2, pick([[50, 90, 50], [60, 104, 56], [44, 80, 46]]), 'LeafyGrass', { nc: true });
    });
  });

  // ── 옥상: 난간, 계단실, 물탱크, 시계탑 ──
  grp('Roof', () => {
    B('Parapet', BX0, ROOFY, ZS - 1, BX1, ROOFY + 3, ZS, C.cream, 'Concrete');
    B('Parapet', BX0, ROOFY, ZN, BX1, ROOFY + 3, ZN + 1, C.cream, 'Concrete');
    B('Parapet', BX0, ROOFY, ZN, BX0 + 1, ROOFY + 3, ZS, C.cream, 'Concrete');
    B('Parapet', BX1 - 1, ROOFY, ZN, BX1, ROOFY + 3, ZS, C.cream, 'Concrete');
    B('ParapetCap', BX0 - 0.3, ROOFY + 3, ZS - 1.3, BX1 + 0.3, ROOFY + 3.5, ZS + 0.3, C.creamDark, 'Concrete');
    B('ParapetCap', BX0 - 0.3, ROOFY + 3, ZN - 0.3, BX1 + 0.3, ROOFY + 3.5, ZN + 1.3, C.creamDark, 'Concrete');
    // 계단실 (옥상 출입구)
    grp('StairHouse', () => {
      const x0 = -1, x1 = 12.5, z0 = -158, z1 = -126, H = 11;
      wallHoles('Wall', 'z', z0, z1, ROOFY, ROOFY + H, x0, x0 + 1, [{ u0: -140, u1: -135, v0: ROOFY, v1: ROOFY + 8 }], C.cream, 'Concrete');
      B('Wall', x1 - 1, ROOFY, z0, x1, ROOFY + H, z1, C.cream, 'Concrete');
      B('Wall', x0, ROOFY, z0, x1, ROOFY + H, z0 + 1, C.cream, 'Concrete');
      B('Wall', x0, ROOFY, z1 - 1, x1, ROOFY + H, z1, C.cream, 'Concrete');
      B('Roof', x0 - 0.5, ROOFY + H, z0 - 0.5, x1 + 0.5, ROOFY + H + 0.8, z1 + 0.5, [130, 126, 120], 'Concrete');
      B('RoofDoor', x0 - 0.3, ROOFY, -140, x0 + 0.2, ROOFY + 8, -135, [100, 104, 110], 'Metal', { tag: 'RoofDoor' });
      B('RoofSign', x0 - 0.4, ROOFY + 8.5, -141, x0 - 0.1, ROOFY + 10, -134, [250, 250, 245], 'SmoothPlastic', {
        text: { face: 'Left', text: '옥상 출입금지', color: [180, 30, 30], bg: [250, 250, 245], bgT: 0 } });
      // 4층 이상현상 감지 영역 (3층→옥상 계단)
      B('RoofStairZone', 0.5, LV[2] + 6.5, -157, 11, ROOFY + 8, -127, [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'RoofStairZone' });
    });
    // 물탱크
    grp('WaterTank', () => {
      B('Stand', 100, ROOFY, -165, 120, ROOFY + 3, -145, [120, 124, 130], 'Metal');
      cylV('Tank', 110, ROOFY + 3, -155, 12, 16, [80, 140, 180], 'Plastic');
    });
    for (let x = -120; x <= -60; x += 15) B('ACUnit', x, ROOFY, -170, x + 6, ROOFY + 4, -164, [220, 220, 216], 'Metal');
    // 시계탑
    grp('ClockTower', () => {
      const cz = ZS + 2;
      B('Tower', -9, ROOFY, ZS - 6, 9, ROOFY + 16, ZS + 3, C.cream, 'Concrete');
      B('TowerCap', -10, ROOFY + 16, ZS - 7, 10, ROOFY + 17.2, ZS + 4, C.creamDark, 'Concrete');
      B('TowerTop', -6, ROOFY + 17.2, ZS - 4, 6, ROOFY + 19.5, ZS + 1, [150, 60, 50], 'Brick');
      cylV('Antenna', 0, ROOFY + 19.5, ZS - 1.5, 7, 0.3, C.metal, 'Metal');
      const cy = ROOFY + 9;
      P('ClockRim', [0.6, 11.5, 11.5], [0, cy, ZS + 3.1], [60, 54, 50], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
      P('ClockFace', [0.6, 10.5, 10.5], [0, cy, ZS + 3.3], [244, 240, 226], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], tag: 'ClockCenter',
        light: { type: 'Surface', face: 'Back', range: 8, brightness: 0.6, color: [255, 245, 220] } });
      for (let h = 0; h < 12; h++) {
        const a = (h / 12) * Math.PI * 2;
        P('HourMark', [0.35, h % 3 === 0 ? 1.2 : 0.7, 0.15], [Math.sin(a) * 4.4, cy + Math.cos(a) * 4.4, ZS + 3.65], [40, 36, 34], 'SmoothPlastic', { r: [0, 0, -(h * 30)], nc: true, ns: true });
      }
      // 바늘: 10시 10분 방향으로 시작 (스크립트가 돌림)
      const hourA = -(10 / 12) * 360 - (10 / 60) * 30, minA = -(10 / 60) * 360;
      const hr = (deg, len) => { const a = (deg * Math.PI) / 180; return [-Math.sin(a) * len / 2, cy + Math.cos(a) * len / 2]; };
      const [hx, hy] = hr(hourA, 2.8), [mx, my] = hr(minA, 4.2);
      P('HourHand', [0.4, 2.8, 0.15], [hx, hy, ZS + 3.75], [30, 26, 24], 'Metal', { r: [0, 0, hourA], tag: 'ClockHour', nc: true, ns: true });
      P('MinuteHand', [0.28, 4.2, 0.15], [mx, my, ZS + 3.85], [30, 26, 24], 'Metal', { r: [0, 0, minA], tag: 'ClockMinute', nc: true, ns: true });
      void cz;
    });
  });

  // 건물 내부 판정 영역
  B('BuildingZone', BX0, 0, ZN, BX1, ROOFY, ZS, [0, 0, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'BuildingZone' });
});

// 책 읽는 소녀상 (본관 앞)
grp('GirlStatue', () => {
  const x = -42, z = -112, bz = [150, 120, 70];
  B('Pedestal', x - 3, 0, z - 3, x + 3, 4, z + 3, [180, 176, 170], 'Granite', { tag: 'StatuePedestal' });
  B('Plaque', x - 1.8, 1.2, z + 3, x + 1.8, 2.8, z + 3.1, [160, 130, 70], 'Metal', {
    text: { face: 'Back', text: '책 읽는 소녀', color: [50, 40, 20], bgT: 1, font: 'Merriweather' } });
  grp('Figure', () => {
    B('Seat', x - 1.6, 4, z - 1.2, x + 1.6, 5.4, z + 1.2, bz, 'Metal', { pri: true });
    B('Body', x - 0.9, 5.4, z - 0.6, x + 0.9, 8, z + 0.6, bz, 'Metal');
    B('Legs', x - 0.9, 4.6, z + 0.6, x + 0.9, 5.4, z + 2.6, bz, 'Metal');
    ball('Head', x, 9, z - 0.1, 1.9, bz, 'Metal', { tag: 'StatueHead' });
    B('Hair', x - 1, 8.4, z - 1.1, x + 1, 9.8, z - 0.2, bz, 'Metal');
    B('Book', x - 1.1, 7, z + 0.7, x + 1.1, 7.15, z + 2.1, bz, 'Metal', { r: [-25, 0, 0] });
  }, 'StatueFigure');
});

// 공유가 타고 오는 차 (주차 위치 = 컷신 마지막 위치)
car('IntroCar', 43.8, 159, 0, [44, 52, 70], { tag: 'IntroCar', lightsOn: true, plate: '35싸 0412' });

// ═════════════════════════ 내보내기 ═════════════════════════
const data = { v: 1, groups, colors, mats, parts, lights, texts, tags, gtags, attrs };
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build', 'map.json'), JSON.stringify(data));

// Luau 모듈: JSON 문자열을 여러 조각으로 나눠 담는다 (한 스크립트가 너무 커지지 않게)
const outDir = path.join(ROOT, 'src', 'ServerScriptService', 'SchoolBuilder');
fs.readdirSync(outDir).filter((f) => /^MapData\d+\.lua$/.test(f)).forEach((f) => fs.unlinkSync(path.join(outDir, f)));
const CHUNK = 1800;
const header = { v: 1, groups, colors, mats, lights, texts, tags, gtags, attrs, partChunks: Math.ceil(parts.length / CHUNK) };
const files = [JSON.stringify(header)];
for (let i = 0; i < parts.length; i += CHUNK) files.push(JSON.stringify(parts.slice(i, i + CHUNK)));
files.forEach((json, i) => {
  if (json.includes(']==]')) throw new Error('bracket clash');
  fs.writeFileSync(path.join(outDir, `MapData${i}.lua`),
    `-- 자동 생성 파일 (tools/generate.js). 직접 고치지 마세요.\nreturn [==[${json}]==]\n`);
});
console.log(`parts=${parts.length} groups=${groups.length} lights=${lights.length} texts=${texts.length} tags=${tags.length} chunks=${files.length}`);
