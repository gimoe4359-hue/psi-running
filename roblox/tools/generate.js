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
//        hidden=판정용 투명 영역, tag, attr, light, text, min=최소 두께(기본 0.05)
// SHIFT: 켜 두면 그 뒤에 만드는 파트를 통째로 옮긴다 (4층 복도를 옥상 문 자리에 맞출 때 씀)
let SHIFT = null;
function P(name, size, pos, color, mat = 'SmoothPlastic', o = {}) {
  const s = size.map((v) => r3(Math.max(o.min ?? 0.05, Math.abs(v))));
  let flags = 0;
  if (o.nc) flags |= 1;
  if (o.ns) flags |= 2;
  if (o.pri) flags |= 4;
  if (o.hidden) flags |= 8;
  if (SHIFT) pos = [pos[0] + SHIFT[0], pos[1] + SHIFT[1], pos[2] + SHIFT[2]];
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
// GD: 정문·담장·경비실·길·동네를 본관 쪽으로 당긴 거리. 남쪽 것들은 옛 좌표(정문 z=200)로 적고 SOUTH 만큼 옮긴다.
const GD = 100, SOUTH = [0, 0, -GD], GZ = 200 - GD;

// ───────────────────────── 방향 계산 ─────────────────────────
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vnorm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// 축 세 개(열 벡터) → 오일러 XYZ (도). Roblox CFrame.Angles 와 같은 순서
function eulerFromBasis(X, Y, Z) {
  const m11 = X[0], m12 = Y[0], m13 = Z[0], m22 = Y[1], m23 = Z[1], m32 = Y[2], m33 = Z[2];
  const y = Math.asin(Math.max(-1, Math.min(1, m13)));
  let x, z;
  if (Math.abs(m13) < 0.9999999) { x = Math.atan2(-m23, m33); z = Math.atan2(-m12, m11); }
  else { x = Math.atan2(m32, m22); z = 0; }
  return [x * 180 / Math.PI, y * 180 / Math.PI, z * 180 / Math.PI];
}
// 앞(-Z)이 dir 을 보도록 하는 회전 (CFrame.lookAt 과 같음)
function lookRot(dir) {
  const Z = vnorm(vmul(dir, -1));
  let X = vcross([0, 1, 0], Z);
  if (Math.hypot(...X) < 1e-6) X = [1, 0, 0];
  X = vnorm(X);
  const Y = vcross(Z, X);
  return eulerFromBasis(X, Y, Z);
}

// 회전된 틀 F = { o: 원점, X·Y·Z: 단위 축(오른손 좌표) } 안에 파트 놓기
const fvec = (F, v) => vadd(vadd(vmul(F.X, v[0]), vmul(F.Y, v[1])), vmul(F.Z, v[2]));
const fpt = (F, v) => vadd(F.o, fvec(F, v));
const AX_Y = [[0, 1, 0], [-1, 0, 0], [0, 0, 1]]; // 원기둥 축 → 틀의 Y
const AX_Z = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]]; // 원기둥 축 → 틀의 Z
const yawFrame = (o, deg) => {
  const a = deg * Math.PI / 180;
  return { o, X: [Math.cos(a), 0, -Math.sin(a)], Y: [0, 1, 0], Z: [Math.sin(a), 0, Math.cos(a)] };
};
function FP(F, name, size, lp, color, mat, o = {}) {
  const ax = o.axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return P(name, size, fpt(F, lp), color, mat, { ...o, r: eulerFromBasis(fvec(F, ax[0]), fvec(F, ax[1]), fvec(F, ax[2])) });
}
// 메시 에셋으로 바꿀 자리 표시 (AssetLibrary 가 Template 이름의 메시로 바꾼다)
const swapAnchor = (F, template, o = {}) => P('SwapAnchor', [0.2, 0.2, 0.2], F.o, [255, 0, 255], 'SmoothPlastic',
  { t: 1, nc: true, ns: true, hidden: true, r: eulerFromBasis(F.X, F.Y, F.Z), tag: 'SwapAnchor', attr: { Template: template, ...(o.attr || {}) } });
function FB(F, name, a0, b0, c0, a1, b1, c1, color, mat, o) {
  return FP(F, name, [a1 - a0, b1 - b0, c1 - c0], [(a0 + a1) / 2, (b0 + b1) / 2, (c0 + c1) / 2], color, mat, o);
}
// 두 점(월드)을 잇는 원기둥 (o.box: 각재, o.d2: 각재 두 번째 굵기)
function rod(name, A, Bw, d, color, mat, o = {}) {
  const v = vsub(Bw, A), len = Math.hypot(...v);
  if (len < 1e-4) return -1;
  const X = vmul(v, 1 / len);
  let Y = vcross([0, 0, 1], X);
  if (Math.hypot(...Y) < 1e-3) Y = vcross([1, 0, 0], X);
  Y = vnorm(Y);
  return P(name, [len, o.d2 || d, d], vmul(vadd(A, Bw), 0.5), color, mat, { ...o, sh: o.box ? 'Block' : 'Cylinder', r: eulerFromBasis(X, Y, vcross(X, Y)) });
}
const Frod = (F, name, a, b, d, color, mat, o) => rod(name, fpt(F, a), fpt(F, b), d, color, mat, o);
// 원판: 가운데 c, 법선 N
function disc(name, c, N, dia, thick, color, mat, o = {}) {
  let Y = vcross(N, [0, 1, 0]);
  if (Math.hypot(...Y) < 1e-3) Y = vcross(N, [1, 0, 0]);
  Y = vnorm(Y);
  return P(name, [thick, dia, dia], c, color, mat, { ...o, sh: 'Cylinder', r: eulerFromBasis(N, Y, vcross(N, Y)) });
}
// 평평한 직각삼각형 = WedgePart 하나. M: 직각 꼭짓점, A·Bp: 나머지 꼭짓점
function rightTri(name, M, A, Bp, thick, color, mat, o = {}) {
  const h = Math.hypot(...vsub(A, M)), w = Math.hypot(...vsub(Bp, M));
  if (h < 0.004 || w < 0.004) return -1;
  const u1 = vmul(vsub(A, M), 1 / h), u2 = vmul(vsub(Bp, M), 1 / w), Z = vmul(u2, -1);
  return P(name, [thick, h, w], vadd(vadd(M, vmul(u1, h / 2)), vmul(u2, w / 2)), color, mat, { ...o, sh: 'Wedge', r: eulerFromBasis(vcross(u1, Z), u1, Z) });
}
// 반원판: O 중심, e1 지름 방향, e2 볼록한 쪽. 띠마다 가운데 상자 + 양옆 삼각형
function semiDisc(name, O, e1, e2, R, thick, color, mat, o = {}, n = 16) {
  const N = vcross(e1, e2);
  const at = (x, y) => vadd(O, vadd(vmul(e1, x), vmul(e2, y)));
  for (let k = 0; k < n / 2; k++) {
    const t0 = (k * Math.PI) / n, t1 = ((k + 1) * Math.PI) / n;
    const h0 = R * Math.sin(t0), h1 = R * Math.sin(t1), w0 = R * Math.cos(t0), w1 = Math.max(0, R * Math.cos(t1));
    if (w1 > 0.004) P(name, [2 * w1, h1 - h0, thick], at(0, (h0 + h1) / 2), color, mat, { ...o, r: eulerFromBasis(e1, e2, N) });
    [1, -1].forEach((s) => rightTri(name, at(s * w1, h0), at(s * w1, h1), at(s * w0, h0), thick, color, mat, o));
  }
}

// ───────────────────────── 손글씨 그림 글자 (아틀라스) ─────────────────────────
// tools/make_atlas.js 가 사용자 글꼴로 그린 글자 그림을 얇은 투명 판에 붙인다 (SurfaceGui + ImageLabel).
// 파트 하나로 글 한 줄 → 획마다 파트를 쓰던 것보다 훨씬 가볍다.
const ATLAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'text_atlas.json'), 'utf8'));
function atlasText(key, center, R, U, N, width, o = {}) {
  const e = ATLAS.entries[key];
  if (!e) throw new Error('아틀라스에 없는 글: ' + key);
  const a = (o.tilt || 0) * Math.PI / 180;
  const R2 = vadd(vmul(R, Math.cos(a)), vmul(U, Math.sin(a))), U2 = vadd(vmul(U, Math.cos(a)), vmul(R, -Math.sin(a)));
  const h = width * e.h / e.w;
  return P(o.name || 'Writing', [width, h, 0.02], vadd(center, vmul(N, 0.02 + (o.lift || 0))), [255, 255, 255], 'SmoothPlastic',
    { t: 1, nc: true, ns: true, min: 0.01, r: eulerFromBasis(R2, U2, vcross(R2, U2)), attr: o.attr,
      text: { face: 'Back', text: key, font: 'Atlas', bgT: 1, lit: o.lit ?? 1, pps: 60 } });
}

// ───────────────────────── 손글씨(분필·피) ─────────────────────────
// make_text.js 가 만든 획 데이터를 얇은 파트로 그린다. Roblox 한글 글꼴 한계를 피하려는 방법.
const STROKES = JSON.parse(fs.readFileSync(path.join(__dirname, 'text_strokes.json'), 'utf8'));
// 평면: center(글자 가운데), R(읽는 사람 기준 오른쪽), U(위), N(벽에서 나오는 쪽)
function writeStrokes(id, center, R, U, N, scale, style, o = {}) {
  const ph = STROKES[id];
  if (!ph) throw new Error('no strokes ' + id);
  const slant = (o.slant || 0) * Math.PI / 180;
  const at = (u, v, lift) => {
    const uu = u + v * Math.tan(slant);
    return vadd(vadd(vadd(center, vmul(R, uu * scale)), vmul(U, v * scale)), vmul(N, lift));
  };
  let count = 0;
  const blood = style === 'blood', ink = style === 'ink';
  // 획 단순화 (Ramer–Douglas–Peucker, 글자 크기 em 단위). 멀리서 안 보이는 잔 꺾임을 줄여 파트 수를 아낀다
  const eps = o.simplify ?? (ink ? 0.03 : 0.012);
  const rdp = (pts) => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    const dx = bx - ax, dy = by - ay, L2 = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bi = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L2;
      if (d > best) { best = d; bi = i; }
    }
    if (best <= eps) return [pts[0], pts[pts.length - 1]];
    return rdp(pts.slice(0, bi + 1)).slice(0, -1).concat(rdp(pts.slice(bi)));
  };
  const depth = blood ? 0.035 : 0.02;
  const lift = (o.lift ?? 0.012) + depth / 2;
  ph.strokes.forEach((st0) => {
    const closed = st0.length > 3 && Math.hypot(st0[0][0] - st0[st0.length - 1][0], st0[0][1] - st0[st0.length - 1][1]) < 1e-6;
    const half = Math.floor(st0.length / 2);
    const st = closed ? rdp(st0.slice(0, half + 1)).slice(0, -1).concat(rdp(st0.slice(half))) : rdp(st0);
    for (let i = 1; i < st.length; i++) {
      const a = st[i - 1], b = st[i];
      const pa = at(a[0], a[1], lift), pb = at(b[0], b[1], lift);
      const d = vsub(pb, pa), len = Math.hypot(...d);
      if (len < 1e-4) continue;
      const w = Math.max(0.035, ((a[2] + b[2]) / 2) * scale * (o.weight || 1));
      const X = vmul(d, 1 / len), Y = vcross(N, X);
      const col = blood ? [90 + rnd() * 45, 4 + rnd() * 8, 4 + rnd() * 6] : ink ? [20 + rnd() * 8, 18, 17] : jit([232, 232, 224], 10);
      P(blood ? 'Blood' : ink ? 'Ink' : 'Chalk', [len + w * (blood ? 0.6 : 0.85), w, depth], vmul(vadd(pa, pb), 0.5), col, 'SmoothPlastic',
        { r: eulerFromBasis(X, Y, N), nc: true, ns: true, t: blood || ink ? 0 : 0.06 + rnd() * 0.16, refl: blood ? 0.06 : 0, min: ink ? 0.012 : undefined, attr: o.seq ? { Seq: count } : undefined });
      count++;
      if (blood) {
        // 둥근 끝/이음새
        if (i === 1 || rnd() < 0.5) {
          P('BloodBlob', [depth, w * 1.15, w * 1.15], pa, [100 + rnd() * 30, 6, 6], 'SmoothPlastic', { sh: 'Cylinder', r: eulerFromBasis(N, U, vcross(N, U)), nc: true, ns: true });
          count++;
        }
        // 흘러내리는 핏물
        const horiz = Math.abs(X[1]) < 0.55;
        if (horiz && rnd() < (o.drip ?? 0.35)) {
          const t = rnd(), p0 = vadd(vadd(pa, vmul(d, t)), vmul(U, -w * 0.4));
          const L = (0.15 + rnd() * rnd() * 1.3) * scale * 0.7, dw = w * (0.25 + rnd() * 0.3);
          const pEnd = vadd(p0, vmul(U, -L));
          P('BloodDrip', [L, dw, depth * 0.9], vadd(p0, vmul(U, -L / 2)), [85 + rnd() * 25, 4, 4], 'SmoothPlastic', { r: eulerFromBasis(vmul(U, -1), vcross(N, vmul(U, -1)), N), nc: true, ns: true, refl: 0.08 });
          P('BloodDrop', [depth * 1.2, dw * 1.7, dw * 1.7], pEnd, [80 + rnd() * 20, 3, 3], 'SmoothPlastic', { sh: 'Cylinder', r: eulerFromBasis(N, U, vcross(N, U)), nc: true, ns: true, refl: 0.1 });
          count += 2;
        }
      }
    }
  });
  if (blood) {
    // 튄 자국
    for (let k = 0; k < (o.splatter ?? 14); k++) {
      const u = (rnd() - 0.5) * (ph.w + 0.6), v = (rnd() - 0.5) * (ph.h + 0.5);
      const dsz = (0.02 + rnd() * rnd() * 0.09) * scale;
      P('BloodSplat', [depth, dsz, dsz], at(u, v, lift), [100 + rnd() * 30, 5, 5], 'SmoothPlastic', { sh: 'Cylinder', r: eulerFromBasis(N, U, vcross(N, U)), nc: true, ns: true });
      count++;
    }
  }
  return count;
}
// 피 묻은 손바닥 자국 (손가락 + 아래로 끌린 자국)
function handprint(center, R, U, N, size = 1, o = {}) {
  const rot = eulerFromBasis(N, U, vcross(N, U));
  const col = () => [92 + rnd() * 30, 5, 5];
  const pt = (u, v) => vadd(vadd(vadd(center, vmul(R, u * size)), vmul(U, v * size)), vmul(N, 0.03));
  P('HandPalm', [0.03, 0.62 * size, 0.62 * size], pt(0, 0), col(), 'SmoothPlastic', { sh: 'Cylinder', r: rot, nc: true, ns: true });
  P('HandPalm', [0.03, 0.5 * size, 0.5 * size], pt(0, -0.18), col(), 'SmoothPlastic', { sh: 'Cylinder', r: rot, nc: true, ns: true });
  const fingers = [[-0.24, 0.3, 0.45, 10], [-0.08, 0.36, 0.55, 3], [0.08, 0.35, 0.52, -3], [0.22, 0.3, 0.42, -10], [0.36, -0.02, 0.36, -55]];
  fingers.forEach(([u, v, len, ang]) => {
    const a = (90 + ang) * Math.PI / 180;
    const dirv = vadd(vmul(R, Math.cos(a)), vmul(U, Math.sin(a)));
    const p0 = pt(u, v), p1 = vadd(p0, vmul(dirv, len * size));
    const X = vnorm(dirv), Y = vcross(N, X);
    P('HandFinger', [len * size, 0.12 * size, 0.03], vmul(vadd(p0, p1), 0.5), col(), 'SmoothPlastic', { r: eulerFromBasis(X, Y, N), nc: true, ns: true });
    P('HandTip', [0.03, 0.12 * size, 0.12 * size], p1, col(), 'SmoothPlastic', { sh: 'Cylinder', r: rot, nc: true, ns: true });
  });
  // 끌린 자국
  for (let k = 0; k < (o.drag ?? 4); k++) {
    const u = -0.25 + k * 0.17, L = (0.8 + rnd() * 1.4) * size;
    const p0 = pt(u, -0.3);
    P('HandDrag', [L, 0.06 * size + rnd() * 0.04, 0.025], vadd(p0, vmul(U, -L / 2)), [80 + rnd() * 20, 4, 4], 'SmoothPlastic', { r: eulerFromBasis(vmul(U, -1), vcross(N, vmul(U, -1)), N), nc: true, ns: true, t: 0.1 + rnd() * 0.3 });
  }
}

// 비상구 표지: 초록 바탕에 흰 '달리는 사람' + 문
function exitPictogram(center, R, U, N, h) {
  const pt = (u, v) => vadd(vadd(vadd(center, vmul(R, (u - 0.2) * h)), vmul(U, (v - 0.48) * h)), vmul(N, 0.025));
  const seg = (a, b, w = 0.075) => {
    const pa = pt(...a), pb = pt(...b), d = vsub(pb, pa), len = Math.hypot(...d);
    const X = vmul(d, 1 / len);
    P('Pict', [len + w * h * 0.9, w * h, 0.02], vmul(vadd(pa, pb), 0.5), [248, 252, 248], 'Neon', { r: eulerFromBasis(X, vcross(N, X), N), nc: true, ns: true });
  };
  P('PictHead', [0.02, 0.17 * h, 0.17 * h], pt(0.16, 0.87), [248, 252, 248], 'Neon', { sh: 'Cylinder', r: eulerFromBasis(N, U, vcross(N, U)), nc: true, ns: true });
  seg([0.1, 0.74], [-0.04, 0.44], 0.1);
  seg([0.08, 0.7], [0.25, 0.58]); seg([0.25, 0.58], [0.36, 0.7]);
  seg([0.06, 0.7], [-0.12, 0.6]); seg([-0.12, 0.6], [-0.22, 0.47]);
  seg([-0.04, 0.44], [0.18, 0.26]); seg([0.18, 0.26], [0.12, 0.02]);
  seg([-0.04, 0.44], [-0.2, 0.22]); seg([-0.2, 0.22], [-0.38, 0.14]);
  seg([0.5, 0.0], [0.5, 0.96], 0.06); seg([0.5, 0.96], [0.82, 0.96], 0.06); seg([0.82, 0.96], [0.82, 0.0], 0.06);
}

// CCTV 카메라 (벽·기둥 고정형). pos=렌즈 위치, target=비추는 곳
function cctvCam(cam, label, pos, target, floorY, mount, pan = 14) {
  grp(`CCTV_${cam}`, () => {
    const dir = vnorm(vsub(target, pos));
    const r = lookRot(dir);
    const back = vadd(pos, vmul(dir, -0.75));
    P('CamBody', [0.55, 0.5, 1.3], back, [236, 236, 232], 'SmoothPlastic', { r });
    P('CamVisor', [0.7, 0.06, 1.45], vadd(back, [0, 0.3, 0]), [226, 226, 222], 'SmoothPlastic', { r, nc: true });
    P('CamLens', [0.42, 0.42, 0.08], vadd(pos, vmul(dir, -0.06)), [12, 12, 14], 'Glass', { r, nc: true, ns: true, refl: 0.3 });
    P('CamLed', [0.08, 0.08, 0.04], vadd(vadd(pos, vmul(dir, -0.02)), [0, -0.16, 0]), [255, 30, 30], 'Neon', { r, nc: true, ns: true });
    P('CamArm', [0.2, 0.2, 1.0], vadd(vadd(back, vmul(dir, -0.6)), [0, 0.12, 0]), [200, 200, 196], 'Metal', { r, nc: true });
    if (mount) P('CamMount', [0.6, 0.6, 0.15], mount.pos, [200, 200, 196], 'Metal', { r: mount.r || [0, 0, 0] });
    P('CCTVCam', [0.2, 0.2, 0.2], pos, [255, 0, 0], 'SmoothPlastic', { r, t: 1, nc: true, hidden: true, tag: 'CCTVCam', attr: { Cam: cam, Label: label, FloorY: floorY, Pan: pan } });
  });
}

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
  corridorFloor: [172, 170, 158], classFloor: [150, 108, 66], hallFloor: [164, 162, 150],
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

// 천장: 흰 텍스 천장 (줄눈은 거의 안 보이게)
function ceiling(x0, x1, z0, z1, y) {
  B('CeilingTile', x0, y, z0, x1, y + 0.2, z1, C.ceiling, 'Plaster', { ns: true });
}
// 학교 천장 등: 얇은 LED 평판 (가로 4 × 세로 1.3)
function troffer(x, z, y, on, o = {}) {
  const w = o.w || 4, d = o.d || 1.3;
  const along = o.alongZ;
  const W = along ? d : w, D = along ? w : d;
  B('LightFrame', x - W / 2, y - 0.1, z - D / 2, x + W / 2, y, z + D / 2, [232, 234, 236], 'Metal', { nc: true, ns: true });
  return B('LightPanel', x - W / 2 + 0.12, y - 0.13, z - D / 2 + 0.12, x + W / 2 - 0.12, y - 0.08, z + D / 2 - 0.12,
    on ? [244, 248, 255] : [214, 216, 218], on ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true, tag: o.tag, light: o.light });
}
// 바닥: 인조석(테라조) + 황동 줄눈 (옛날 학교 복도)
function terrazzo(x0, x1, z0, z1, y, step = 4) {
  for (let x = x0 + step; x < x1 - 0.5; x += step) B('BrassStrip', x - 0.04, y, z0, x + 0.04, y + 0.02, z1, [172, 148, 92], 'Metal', { nc: true, ns: true });
  for (let z = z0 + step; z < z1 - 0.5; z += step) B('BrassStrip', x0, y, z - 0.04, x1, y + 0.02, z + 0.04, [172, 148, 92], 'Metal', { nc: true, ns: true });
}

// ───────────────────────── 나무 (11월: 은행나무·느티나무·소나무) ─────────────────────────
let treeCount = 0;
const TREE_TEMPLATE = { ginkgo: ['Tree_Ginkgo', 26], zelkova: ['Tree_Zelkova', 26], pine: ['Tree_Pine', 28] };
function tree(x, z, kind = 'ginkgo', h = 26, ground = 0) {
  grp(`Tree${++treeCount}`, () => {
    const TT = TREE_TEMPLATE[kind];
    swapAnchor(yawFrame([x, ground, z], rnd() * 360), TT[0], { attr: { Scale: Math.round((h / TT[1]) * 1000) / 1000 } });
    const lean = (rnd() - 0.5) * 0.6;
    const bark = jit(C.bark, 14);
    const tw = 1.1 + h * 0.03;
    // 메시 팩이 없을 때 쓰는 파트 나무: 굽은 줄기 → 굵은 가지 → 잔가지 → 작은 잎 뭉치 여러 개
    // (큰 공 몇 개 대신 작은 잎 뭉치를 가지 끝마다 모아 실제 나무 윤곽에 가깝게)
    if (kind === 'pine') {
      const red = [124, 78, 56];
      const p1 = [x + lean * 0.5, ground + h * 0.4, z + lean * 0.3], p2 = [x + lean, ground + h * 0.95, z];
      cylBetween('Trunk', [x, ground - 0.5, z], p1, tw, red, 'Wood');
      cylBetween('Trunk', p1, p2, tw * 0.7, red, 'Wood', { nc: true });
      // 층층이 뻗은 가지 + 가지 끝의 납작한 솔잎 뭉치
      for (let i = 0; i < 6; i++) {
        const t = i / 5, y = ground + h * (0.36 + t * 0.52), reach = h * (0.3 - t * 0.2), n = 5;
        const cx = p1[0] + (p2[0] - p1[0]) * t, cz = p1[2] + (p2[2] - p1[2]) * t;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + i * 0.7 + rnd() * 0.4, r1 = reach * (0.8 + rnd() * 0.3);
          const end = [cx + Math.cos(a) * r1, y + h * 0.03 + rnd() * 1.2, cz + Math.sin(a) * r1];
          cylBetween('Branch', [cx, y - h * 0.03, cz], end, tw * 0.22, red, 'Wood', { nc: true, ns: true });
          for (let q = 0; q < 2; q++) {
            const u = 0.6 + q * 0.4, w = h * (0.12 - t * 0.04) * (0.8 + rnd() * 0.4);
            P('Needles', [w, w * 0.34, w * 0.8], [cx + (end[0] - cx) * u, end[1] + 0.5 + rnd() * 0.6, cz + (end[2] - cz) * u],
              jit(C.pine, 12), 'LeafyGrass', { r: [rnd() * 14 - 7, (-a * 180) / Math.PI, rnd() * 14 - 7], nc: true });
          }
        }
      }
      ball('Needles', p2[0], p2[1] + 0.6, p2[2], h * 0.09, jit(C.pine, 10), 'LeafyGrass', { nc: true });
      return;
    }
    const gk = kind === 'ginkgo';
    const leafA = gk ? C.ginkgo : C.zelkova, leafB = gk ? C.ginkgo2 : C.zelkova2;
    const leaf = (px, py, pz, d) => ball('Leaves', px, py, pz, d, jit(rnd() < 0.5 ? leafA : leafB, 20), 'LeafyGrass', { nc: true, ns: rnd() < 0.5 });
    // 줄기: 살짝 굽으며 가늘어진다
    const t1 = [x + lean * 0.5, ground + h * 0.3, z + lean * 0.3], t2 = [x + lean, ground + h * (gk ? 0.62 : 0.5), z + lean * 0.5];
    cylBetween('Trunk', [x, ground - 0.5, z], t1, tw, bark, 'Wood');
    cylBetween('Trunk', t1, t2, tw * 0.8, bark, 'Wood', { nc: true });
    ball('RootFlare', x, ground + 0.1, z, tw * 1.5, bark, 'Wood', { nc: true, ns: true });
    // 굵은 가지 → 잔가지 2개 → 가지 끝마다 잎 뭉치 3개
    const nb = gk ? 6 : 7;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + rnd() * 0.5, u = 0.35 + rnd() * 0.65;
      const base = [t1[0] + (t2[0] - t1[0]) * u, t1[1] + (t2[1] - t1[1]) * u, t1[2] + (t2[2] - t1[2]) * u];
      const reach = h * (gk ? 0.16 : 0.27) * (0.8 + rnd() * 0.4), up = h * (gk ? 0.26 : 0.2) * (0.8 + rnd() * 0.4);
      const mid = [base[0] + Math.cos(a) * reach, base[1] + up, base[2] + Math.sin(a) * reach];
      cylBetween('Branch', base, mid, tw * 0.42, bark, 'Wood', { nc: true });
      for (let k = 0; k < 2; k++) {
        const a2 = a + (k ? 0.7 : -0.7) + (rnd() - 0.5) * 0.4, r2 = reach * (0.5 + rnd() * 0.3);
        const end = [mid[0] + Math.cos(a2) * r2, mid[1] + up * (0.45 + rnd() * 0.3), mid[2] + Math.sin(a2) * r2];
        cylBetween('Twig', mid, end, tw * 0.2, bark, 'Wood', { nc: true, ns: true });
        for (let q = 0; q < 3; q++) {
          const d = h * (gk ? 0.1 : 0.12) * (0.75 + rnd() * 0.5);
          leaf(end[0] + (rnd() - 0.5) * d * 1.1, end[1] + (rnd() - 0.35) * d, end[2] + (rnd() - 0.5) * d * 1.1, d);
        }
      }
      leaf(mid[0] + (rnd() - 0.5) * 2, mid[1] + 0.8, mid[2] + (rnd() - 0.5) * 2, h * 0.1);
    }
    // 우듬지
    const crownY = ground + h * (gk ? 0.92 : 0.8);
    cylBetween('Branch', t2, [t2[0] + lean * 0.3, crownY - h * 0.05, t2[2]], tw * 0.4, bark, 'Wood', { nc: true });
    for (let k = 0; k < 7; k++) {
      const a = rnd() * Math.PI * 2, rr = h * (gk ? 0.07 : 0.12) * rnd();
      leaf(t2[0] + Math.cos(a) * rr, crownY - rnd() * h * 0.12, t2[2] + Math.sin(a) * rr, h * (gk ? 0.11 : 0.13) * (0.8 + rnd() * 0.4));
    }
  }, 'Tree');
  // 떨어진 잎 (나무 묶음 밖에 둬서 메시로 바뀌어도 남는다)
  if (kind !== 'pine') {
    const leafA = kind === 'ginkgo' ? C.ginkgo : C.zelkova;
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * h * 0.45;
      P('FallenLeaf', [0.5 + rnd() * 0.7, 0.04, 0.4 + rnd() * 0.5], [x + Math.cos(a) * rr, ground + 0.05, z + Math.sin(a) * rr],
        jit(leafA, 30), 'Fabric', { r: [0, rnd() * 180, 0], nc: true, ns: true });
    }
  }
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
    // 바퀴 밑이 아스팔트 윗면(0.2)에 닿도록 차 전체를 올린다
    const W = (lx, ly, lz) => [cx + lx * c + lz * s, ly + 0.22, cz - lx * s + lz * c];
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
    // ── 차체 다듬기: 모서리를 둥글게, 보닛·트렁크는 비스듬히, 필러와 지붕 테두리 ──
    const dark = color.map((v) => Math.max(0, v - 14));
    Q('HoodSlope', [6.0, 0.5, 2.2], [0, 2.82, -6.35], color, 'SmoothPlastic', { sh: 'Wedge', refl: 0.15, r: [0, 180, 0], nc: true });
    Q('TrunkSlope', [6.0, 0.5, 1.2], [0, 2.82, 7.0], color, 'SmoothPlastic', { sh: 'Wedge', refl: 0.15, nc: true });
    Q('Cowl', [5.8, 0.25, 0.6], [0, 3.1, -2.95], trim, 'SmoothPlastic', { nc: true });
    [-1, 1].forEach((sx) => {
      // 어깨선·지붕선·범퍼 모서리를 원기둥으로 둥글게
      Q('ShoulderRound', [15.0, 0.5, 0.5], [sx * 2.92, 2.62, 0], color, 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], refl: 0.15, nc: true });
      Q('RoofRound', [4.4, 0.34, 0.34], [sx * 2.72, 5.2, 1.9], color, 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], refl: 0.15, nc: true });
      Q('BumperRound', [0.9, 0.75, 0.75], [sx * 2.85, 1.45, -7.38], color, 'SmoothPlastic', { sh: 'Cylinder', r: [0, 0, 90], nc: true });
      Q('BumperRound', [0.9, 0.75, 0.75], [sx * 2.85, 1.45, 7.38], color, 'SmoothPlastic', { sh: 'Cylinder', r: [0, 0, 90], nc: true });
      // 필러 (A·C) 와 창틀
      Q('WindowTrim', [0.1, 0.1, 6.7], [sx * 2.86, 5.02, 1.8], chrome, 'Metal', { nc: true, ns: true });
      Q('WindowTrim', [0.1, 0.1, 9.0], [sx * 2.9, 3.22, 0.9], chrome, 'Metal', { nc: true, ns: true });
      // 바퀴집 (검은 반원), 흙받이, 옆 방향지시등, 안개등
      [-1, 1].forEach((sz) => Q('WheelWell', [0.6, 3.1, 3.1], [sx * 2.62, 1.45, sz * 4.75], [14, 14, 16], 'SmoothPlastic', { sh: 'Cylinder', nc: true, ns: true }));
      Q('SideSignal', [0.06, 0.16, 0.5], [sx * 3.12, 2.75, -3.6], [255, 150, 30], 'SmoothPlastic', { nc: true, ns: true });
      Q('FogLight', [0.7, 0.3, 0.12], [sx * 2.3, 1.3, -7.74], [240, 240, 226], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true });
      Q('MirrorArm', [0.5, 0.14, 0.2], [sx * 3.05, 3.55, -0.9], trim, 'SmoothPlastic', { nc: true, ns: true });
      Q('MirrorGlass', [0.6, 0.38, 0.04], [sx * 3.38, 3.65, -0.7], [150, 170, 180], 'Glass', { nc: true, ns: true, refl: 0.5 });
      Q('Wiper', [2.3, 0.06, 0.08], [sx * 1.3, 3.22, -2.72], [16, 16, 18], 'SmoothPlastic', { r: [0, sx * 8, 0], nc: true, ns: true });
      Q('Exhaust', [0.5, 0.3, 0.3], [sx * 1.9, 0.95, 7.7], [120, 122, 126], 'Metal', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
    });
    Q('RoofAntenna', [0.12, 0.5, 0.7], [0, 5.5, 3.6], trim, 'SmoothPlastic', { sh: 'Wedge', nc: true, ns: true });
    Q('RearLightBar', [4.2, 0.12, 0.1], [0, 2.75, 7.66], [150, 10, 14], o.lightsOn ? 'Neon' : 'SmoothPlastic', { nc: true, ns: true });
    Q('Underbody', [5.6, 0.3, 13.6], [0, 0.95, 0], [18, 18, 20], 'SmoothPlastic', { nc: true, ns: true });
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
tBlock('Ground', -200, -8, -98, -26, 0, GZ - 6);
tBlock('Pavement', -900, -8, GZ, 900, 0, GZ + 56);
tBlock('Pavement', -140, -8, -180, 140, 0, -116);
tBlock('Pavement', -14, -8, -116, 14, 0, GZ);
tBlock('Pavement', 14, -8, 92 - GD, 108, 0, 176 - GD);
tBlock('Pavement', 96, -8, -108, 206, 0, -20);
tBlock('Pavement', 18, -8, 172 - GD, 42, 0, 196 - GD);
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
SHIFT = SOUTH;
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
  for (let x = -840; x <= 840; x += 56) if (Math.abs(x) > 20) streetLight(x, 208.7, 0, { flicker: x === -112 || x === 224 });
  const poleX = [];
  for (let x = -860; x <= 860; x += 48) { utilityPole(x, 243.5); poleX.push(x); }
  wires(poleX, 243.5, [[-3.6, 29.1], [0, 29.1], [3.6, 29.1], [-2.4, 26.1], [2.4, 26.1]]);
  cylV('SchoolSignPole', 30, 0.55, 209, 10, 0.25, [140, 144, 150], 'Metal');
  P('SchoolSign', [2.6, 2.6, 0.1], [30, 10.4, 209.1], [250, 220, 40], 'SmoothPlastic', { r: [0, 0, 45], text: { face: 'Back', text: '학교 앞', color: [20, 20, 20], bgT: 1, lit: 0.6 } });
});

grp('Town', () => {
  // ── 간판·창문 도우미 (건물 정면은 -Z, 도로 쪽) ──
  const fsign = (x0, x1, y0, y1, z, text, bg, fg = [255, 255, 255], lit = true, o = {}) =>
    B('Sign', x0, y0, z - 0.45, x1, y1, z, bg, lit ? 'Neon' : 'SmoothPlastic', { nc: true, t: lit ? 0.08 : 0,
      text: { face: 'Front', text, color: fg, bg, bgT: lit ? 1 : 0, lit: lit ? 0 : 0.7, font: o.font || 'GothamBlack', pps: o.pps || 40 } });
  const vsign = (x, y0, y1, z, text, bg, fg = [255, 255, 255]) => {
    B('SignArm', x - 0.15, y1 - 0.4, z - 2.6, x + 0.15, y1 - 0.2, z, [70, 72, 76], 'Metal', { nc: true });
    B('VSign', x - 0.35, y0, z - 2.6, x + 0.35, y1, z - 0.4, bg, 'Neon', { nc: true, t: 0.05,
      text: { face: 'Left', text, color: fg, bgT: 1, lit: 0, font: 'GothamBlack', pps: 30 } });
    B('VSignBack', x - 0.36, y0, z - 2.6, x + 0.36, y1, z - 0.4, bg, 'Neon', { nc: true, t: 0.05,
      text: { face: 'Right', text, color: fg, bgT: 1, lit: 0, font: 'GothamBlack', pps: 30 } });
  };
  // 유리창 (불 켜짐 / 꺼짐) + 창에 붙인 글씨
  const pane = (x0, x1, y0, y1, z, lit, glow, letter) => {
    B('Mullion', x0, y0, z - 0.25, x0 + 0.2, y1, z + 0.05, [150, 154, 160], 'Metal', { nc: true });
    B('Mullion', x0, y0, z - 0.25, x1, y0 + 0.2, z + 0.05, [150, 154, 160], 'Metal', { nc: true });
    B('Mullion', x0, y1 - 0.2, z - 0.25, x1, y1, z + 0.05, [150, 154, 160], 'Metal', { nc: true });
    B(lit ? 'GlassLit' : 'Glass', x0 + 0.2, y0 + 0.2, z - 0.1, x1, y1 - 0.2, z, lit ? glow : [34, 40, 48], lit ? 'Neon' : 'Glass',
      { nc: true, ns: true, t: lit ? 0.45 : 0.1, refl: lit ? 0 : 0.3,
        text: letter ? { face: 'Front', text: letter[0], color: letter[1], bgT: 1, lit: 0, font: 'GothamBlack', pps: 30 } : undefined });
  };
  // 층마다 창문 띠
  const windowBand = (x0, x1, y0, h, z, n, litP, glow, letter) => {
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) pane(x0 + i * w, x0 + (i + 1) * w, y0, y0 + h, z, rnd() < litP, glow, i === Math.floor(n / 2) ? letter : null);
    B('MullionEnd', x1 - 0.2, y0, z - 0.25, x1, y0 + h, z + 0.05, [150, 154, 160], 'Metal', { nc: true });
  };
  // 1층 가게
  const shop = (x0, x1, z, name, bg, glow, open, o = {}) => {
    if (open) {
      B('ShopBack', x0 + 0.5, 0.6, z + 9, x1 - 0.5, 9.4, z + 9.5, jit([224, 220, 210], 10), 'SmoothPlastic');
      B('ShopCeiling', x0 + 0.5, 9.0, z + 0.5, x1 - 0.5, 9.4, z + 9.5, glow, 'Neon', { nc: true, ns: true });
      B('ShopFloor', x0 + 0.5, 0.55, z, x1 - 0.5, 0.7, z + 9.5, [200, 196, 188], 'CeramicTiles');
      const n = Math.max(2, Math.floor((x1 - x0) / 6));
      for (let k = 0; k < n; k++) {
        const sx = x0 + 2 + k * (x1 - x0 - 4) / n;
        B('Shelf', sx, 0.7, z + 3, sx + 2.4, 5.4, z + 7.5, jit(pick([[220, 220, 216], [200, 60, 50], [60, 120, 190], [240, 200, 70]]), 10), 'SmoothPlastic', { nc: true });
      }
      if (o.counter) B('Counter', x0 + 1, 0.7, z + 1.2, x0 + 7, 3.6, z + 2.6, [230, 230, 226], 'SmoothPlastic');
      windowBand(x0, x1, 0.6, 8.8, z, Math.max(2, Math.round((x1 - x0) / 8)), 0, glow);
      for (const g of [x0 + 0.6, x1 - 0.6]) void g;
      B('ShopGlow', x0 + 0.4, 0.8, z + 0.2, x1 - 0.4, 8.6, z + 0.3, glow, 'Neon', { nc: true, ns: true, t: 0.82,
        light: o.light ? { type: 'Point', range: 26, brightness: 1.0, color: glow, shadows: true } : undefined });
    } else {
      // 셔터 내린 가게
      B('Shutter', x0 + 0.3, 0.6, z - 0.2, x1 - 0.3, 9.0, z + 0.1, [150, 152, 156], 'DiamondPlate');
      for (let y = 1.2; y < 9; y += 0.6) B('ShutterLine', x0 + 0.3, y, z - 0.25, x1 - 0.3, y + 0.06, z - 0.18, [110, 112, 116], 'Metal', { nc: true, ns: true });
      B('ShutterBox', x0 + 0.2, 9.0, z - 0.6, x1 - 0.2, 9.8, z + 0.1, [120, 122, 126], 'Metal');
    }
    fsign(x0 + 0.5, x1 - 0.5, 9.9, 12.6, z, name, bg, [255, 255, 255], open);
  };

  // ── 상가 건물 6동 (도로 남쪽) ──
  const Z = 256;
  const building = (x0, x1, floors, depth, wall, wallMat, o) => grp('ShopBuilding', () => {
    const fh = 11, H = 1 + floors * fh;
    B('Body', x0, 0, Z, x1, H, Z + depth, wall, wallMat);
    B('Parapet', x0 - 0.3, H, Z - 0.3, x1 + 0.3, H + 2.2, Z + depth + 0.3, jit(wall, -30), wallMat);
    B('Plinth', x0 - 0.2, 0, Z - 0.2, x1 + 0.2, 0.6, Z + 0.3, [120, 118, 112], 'Granite');
    o.ground();
    for (let f = 1; f < floors; f++) {
      const y = 1 + f * fh;
      B('FloorBand', x0 - 0.2, y - 0.7, Z - 0.35, x1 + 0.2, y + 0.3, Z, jit(wall, -24), wallMat);
      const fl = o.floors[f - 1] || { lit: 0.3, glow: [240, 236, 220] };
      windowBand(x0 + 1, x1 - 1, y + 1.2, 7.6, Z, Math.max(2, Math.round((x1 - x0) / 9)), fl.lit, fl.glow, fl.letter);
      if (fl.sign) fsign(x0 + (x1 - x0) * 0.18, x1 - (x1 - x0) * 0.18, y + 8.9, y + 10.3, Z - 0.35, fl.sign[0], fl.sign[1], [255, 255, 255], fl.sign[2] !== false, { pps: 30 });
    }
    // 옥상: 물탱크, 실외기, 안테나
    B('RoofTank', x0 + 3, H + 2.2, Z + depth - 10, x0 + 9, H + 7, Z + depth - 4, [70, 130, 170], 'Plastic');
    for (let k = 0; k < 3; k++) B('RoofAC', x1 - 6 - k * 4.2, H + 2.2, Z + 4, x1 - 3 - k * 4.2, H + 4.6, Z + 7, [222, 222, 218], 'Metal');
    cylV('Antenna', x0 + 12, H + 2.2, Z + 6, 6, 0.15, [150, 150, 150], 'Metal');
    // 옆벽 에어컨 실외기
    for (let f = 1; f < floors; f++) if (rnd() < 0.6) B('WallAC', x1, 1 + f * fh + 2, Z + 6, x1 + 1.4, 1 + f * fh + 4.4, Z + 9, [222, 222, 218], 'Metal');
    if (o.extra) o.extra(H);
  });

  // A: 한빛빌딩 (5층) — 편의점, 수학학원, 영어학원, 독서실, 교회
  building(-250, -186, 5, 36, [210, 196, 170], 'Granite', {
    ground: () => {
      shop(-250, -214, Z, '편의점 24', [30, 120, 200], [236, 246, 255], true, { counter: true, light: true });
      shop(-212, -186, Z, '한빛 부동산', [60, 70, 90], [250, 240, 220], false);
    },
    floors: [
      { lit: 0.8, glow: [236, 244, 255], letter: ['수학 전문 · 중고등부', [30, 60, 160]], sign: ['송천 수학학원', [230, 120, 30]] },
      { lit: 0.6, glow: [240, 246, 255], letter: ['영어 · 논술', [180, 30, 60]], sign: ['리더스 영어', [40, 140, 90]] },
      { lit: 0.5, glow: [255, 244, 220], letter: ['24시 독서실', [60, 60, 60]], sign: ['한빛 독서실', [70, 60, 140]] },
      { lit: 0.2, glow: [255, 236, 200], sign: ['송천 한빛교회', [150, 30, 40], false] },
    ],
    extra: (H) => {
      // 옥상 빨간 네온 십자가
      const cx = -205, cz = Z + 18;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => cylBetween('CrossTower', [cx + sx * 1.6, H + 2.2, cz + sz * 1.6], [cx + sx * 0.4, H + 16, cz + sz * 0.4], 0.25, [60, 60, 64], 'Metal'));
      for (let k = 0; k < 4; k++) B('CrossBrace', cx - 1.4 + k * 0.25, H + 4 + k * 3, cz - 1.4 + k * 0.25, cx + 1.4 - k * 0.25, H + 4.2 + k * 3, cz + 1.4 - k * 0.25, [60, 60, 64], 'Metal', { nc: true });
      B('CrossV', cx - 0.45, H + 16, cz - 0.45, cx + 0.45, H + 26, cz + 0.45, [255, 30, 40], 'Neon', { nc: true, light: { type: 'Point', range: 40, brightness: 1.2, color: [255, 40, 50] } });
      B('CrossH', cx - 3.2, H + 22, cz - 0.45, cx + 3.2, H + 22.9, cz + 0.45, [255, 30, 40], 'Neon', { nc: true });
    },
  });
  vsign(-187.5, 14, 40, Z, '수\n학\n·\n영\n어', [230, 120, 30]);
  // B: 붉은 벽돌 3층 — 분식, PC방, 태권도
  building(-180, -134, 3, 30, [150, 78, 62], 'Brick', {
    ground: () => {
      shop(-180, -158, Z, '송천분식', [220, 100, 30], [255, 230, 190], true, { counter: true, light: true });
      shop(-156, -134, Z, '김밥 · 떡볶이', [190, 40, 40], [255, 236, 200], true);
    },
    floors: [
      { lit: 0.9, glow: [130, 120, 255], letter: ['PC방 · 24시', [255, 255, 255]], sign: ['스타 PC방', [90, 40, 200]] },
      { lit: 0.7, glow: [240, 246, 255], letter: ['태권도 · 합기도', [200, 30, 40]], sign: ['대한 태권도', [30, 70, 170]] },
    ],
  });
  vsign(-135.5, 13, 30, Z, 'P\nC\n방', [90, 40, 200]);
  // 골목: 쓰레기 봉투
  for (let k = 0; k < 9; k++) ball('TrashBag', -129 + (rnd() - 0.5) * 3, 0.8 + rnd() * 0.5, Z - 1.2 + (rnd() - 0.5) * 2.5, 1.6 + rnd() * 0.9, rnd() < 0.7 ? [24, 24, 26] : [220, 220, 216], 'Plastic', { nc: true });
  B('RecycleBin', -132.5, 0.55, Z - 3.4, -130.5, 3.4, Z - 1.6, [230, 190, 40], 'Plastic');
  B('RecycleBin', -130.2, 0.55, Z - 3.4, -128.2, 3.4, Z - 1.6, [50, 110, 190], 'Plastic');
  // C: 유리 커튼월 4층 — 약국, 내과, 피아노, 스터디카페
  building(-124, -52, 4, 34, [190, 196, 202], 'Concrete', {
    ground: () => {
      shop(-124, -98, Z, '송천약국', [30, 150, 70], [240, 255, 245], true, { counter: true, light: true });
      shop(-96, -74, Z, '꽃집', [200, 90, 130], [255, 240, 240], false);
      shop(-72, -52, Z, '세탁소', [80, 130, 190], [240, 246, 255], false);
    },
    floors: [
      { lit: 0.4, glow: [236, 244, 255], letter: ['내과 · 소아과', [20, 70, 150]], sign: ['송천 연합의원', [20, 90, 170]] },
      { lit: 0.3, glow: [255, 244, 225], letter: ['피아노 · 바이올린', [120, 40, 120]], sign: ['도레미 음악학원', [170, 50, 140]] },
      { lit: 0.8, glow: [255, 248, 236], letter: ['STUDY CAFE', [40, 40, 40]], sign: ['스터디카페 숲', [40, 120, 80]] },
    ],
    extra: (H) => { for (let x = -122; x < -52; x += 6) B('Fin', x, 1, Z - 0.9, x + 0.35, H, Z - 0.2, [150, 156, 162], 'Metal'); },
  });
  P('PharmacyCross', [0.4, 4, 4], [-100.5, 14, Z - 3], [40, 220, 90], 'Neon', { nc: true, text: { face: 'Left', text: '약', color: [255, 255, 255], bgT: 1, lit: 0, font: 'GothamBlack' } });
  // D: 오래된 2층 — 철물점, 미용실, 노래방
  building(-44, 18, 2, 28, [200, 192, 176], 'Plaster', {
    ground: () => {
      shop(-44, -22, Z, '송천 철물', [60, 60, 66], [255, 240, 220], false);
      shop(-20, 18, Z, '헤어 살롱', [200, 60, 90], [255, 236, 240], true, { light: true });
    },
    floors: [{ lit: 1, glow: [200, 80, 255], letter: ['노래연습장', [255, 230, 255]], sign: ['코인 노래방', [150, 40, 200]] }],
  });
  cylV('BarberPole', -21.5, 1.5, Z - 0.6, 3.4, 0.7, [230, 230, 230], 'Neon', { nc: true });
  cylV('BarberStripe', -21.5, 2.2, Z - 0.6, 0.5, 0.75, [220, 30, 40], 'Neon', { nc: true });
  cylV('BarberStripe', -21.5, 3.6, Z - 0.6, 0.5, 0.75, [40, 60, 200], 'Neon', { nc: true });
  // E: 4층 — 치킨집, 수학학원, 미술학원, 주택
  building(26, 96, 4, 34, [222, 214, 196], 'Plaster', {
    ground: () => {
      shop(26, 56, Z, '송천치킨', [240, 180, 20], [255, 236, 190], true, { counter: true, light: true });
      shop(58, 96, Z, '24시 코인빨래', [40, 160, 200], [236, 250, 255], true);
    },
    floors: [
      { lit: 0.7, glow: [236, 244, 255], letter: ['초·중등 수학', [200, 40, 40]], sign: ['1등 수학', [200, 40, 40]] },
      { lit: 0.3, glow: [255, 244, 225], letter: ['입시 미술', [40, 90, 160]], sign: ['송천 미술학원', [40, 90, 160]] },
      { lit: 0.35, glow: [255, 220, 170] },
    ],
  });
  vsign(94.5, 13, 34, Z, '치\n킨\n·\n호\n프', [240, 180, 20], [40, 20, 10]);
  // F: 3층 — 빵집, 생활용품, 치과
  building(104, 170, 3, 32, [180, 186, 192], 'Concrete', {
    ground: () => {
      shop(104, 132, Z, '송천 베이커리', [140, 90, 50], [255, 232, 196], true, { counter: true, light: true });
      shop(134, 170, Z, '생활용품', [220, 50, 60], [255, 250, 245], true);
    },
    floors: [
      { lit: 0.3, glow: [240, 248, 255], letter: ['치과', [30, 120, 190]], sign: ['미소 치과', [30, 140, 200]] },
      { lit: 0.5, glow: [240, 246, 255], letter: ['영어 회화', [60, 60, 160]], sign: ['잉글리시 하우스', [220, 120, 40]] },
    ],
  });

  // ── 아파트 단지 (15층 판상형, 계단식 2코어 4세대) ──
  function apartment(x0, z0, label, floors = 15) {
    grp('Apartment', () => {
      const fh = 9.2, W = 125, D = 40, H = 2 + floors * fh;
      const white = [232, 230, 224];
      B('Body', x0, 0, z0, x0 + W, H, z0 + D, white, 'Plaster');
      B('Parapet', x0 - 0.3, H, z0 - 0.3, x0 + W + 0.3, H + 3, z0 + D + 0.3, [214, 212, 206], 'Plaster');
      // 옥상 장식 프레임 + 이름
      B('RoofFrame', x0 + 20, H + 3, z0 + 6, x0 + W - 20, H + 4, z0 + 8, [190, 70, 60], 'Concrete');
      for (let k = 0; k < 5; k++) B('RoofFrameLeg', x0 + 20 + k * (W - 40) / 4 - 0.4, H, z0 + 6, x0 + 20 + k * (W - 40) / 4 + 0.4, H + 4, z0 + 8, [190, 70, 60], 'Concrete');
      B('RoofBox', x0 + 34, H + 3, z0 + 12, x0 + 46, H + 12, z0 + 30, [214, 212, 206], 'Plaster');
      B('RoofBox', x0 + W - 46, H + 3, z0 + 12, x0 + W - 34, H + 12, z0 + 30, [214, 212, 206], 'Plaster');
      B('Brand', x0 + W / 2 - 18, H + 4.6, z0 - 0.4, x0 + W / 2 + 18, H + 9.4, z0, white, 'Plaster', {
        text: { face: 'Front', text: '송천 한빛', color: [200, 60, 50], bgT: 1, lit: 0.2, font: 'GothamBlack', pps: 20 } });
      // 옆벽 동 번호 (크게)
      [[x0 - 0.05, 'Left'], [x0 + W + 0.05, 'Right']].forEach(([x, face]) =>
        B('Number', x - 0.15, H - 22, z0 + 6, x + 0.15, H - 6, z0 + D - 6, white, 'Plaster', {
          text: { face, text: label, color: [60, 80, 120], bgT: 1, lit: 0.25, font: 'GothamBlack', pps: 12 } }));
      // 세로 강조 띠
      [x0 + 2, x0 + W - 6].forEach((x) => B('Accent', x, 0, z0 - 0.2, x + 4, H, z0 + 0.1, [150, 170, 196], 'Plaster'));
      // 세대: [세대][코어][세대]   [세대][코어][세대]
      const layout = [['u', 28], ['c', 6.5], ['u', 28], ['u', 28], ['c', 6.5], ['u', 28]];
      let ux = x0;
      layout.forEach(([kind, w]) => {
        for (let f = 0; f < floors; f++) {
          const y = 2 + f * fh;
          if (kind === 'c') {
            // 계단실: 반층씩 어긋난 작은 창
            const lit = rnd() < 0.55;
            B('StairWin', ux + 1.5, y + fh * 0.5, z0 - 0.15, ux + w - 1.5, y + fh * 0.5 + 3.4, z0, lit ? [235, 240, 220] : [40, 46, 54], lit ? 'Neon' : 'Glass', { nc: true, ns: true, t: lit ? 0.4 : 0.1 });
            continue;
          }
          // 발코니: 바닥판, 난간, 확장 창(4짝), 실외기 칸
          B('BalconySlab', ux + 0.3, y - 0.25, z0 - 3.4, ux + w - 0.3, y + 0.35, z0, [222, 220, 214], 'Plaster');
          B('BalconyRail', ux + 0.6, y + 0.35, z0 - 3.3, ux + w - 0.6, y + 3.2, z0 - 3.15, [176, 190, 196], 'Glass', { t: 0.45, nc: true, ns: true });
          B('RailTop', ux + 0.5, y + 3.2, z0 - 3.35, ux + w - 0.5, y + 3.4, z0 - 3.1, [200, 202, 206], 'Metal', { nc: true, ns: true });
          const lit = rnd() < 0.32;
          const glow = pick([[255, 214, 160], [255, 228, 186], [242, 238, 226], [160, 190, 255]]);
          B(lit ? 'WindowLit' : 'Window', ux + 1, y + 0.4, z0 - 0.12, ux + w - 6.5, y + fh - 1.4, z0, lit ? glow : [30, 36, 44], lit ? 'Neon' : 'Glass', { nc: true, ns: true, t: lit ? 0.35 : 0.05, refl: lit ? 0 : 0.35 });
          for (let k = 1; k < 4; k++) B('Mullion', ux + 1 + k * (w - 7.5) / 4 - 0.1, y + 0.4, z0 - 0.2, ux + 1 + k * (w - 7.5) / 4 + 0.1, y + fh - 1.4, z0 - 0.1, [214, 216, 218], 'Metal', { nc: true, ns: true });
          if (lit && rnd() < 0.65) B('Curtain', ux + 1.2, y + 0.4, z0 - 0.3, ux + 1.2 + (w - 7.5) * (0.25 + rnd() * 0.3), y + fh - 1.4, z0 - 0.22, pick([[200, 180, 150], [150, 160, 180], [220, 210, 190], [170, 120, 110]]), 'Fabric', { nc: true, ns: true });
          B('ACCage', ux + w - 6, y + 0.4, z0 - 2.6, ux + w - 1, y + fh - 1.6, z0 - 0.1, [210, 210, 206], 'Metal', { nc: true });
          for (let k = 0; k < 6; k++) B('Louver', ux + w - 6, y + 0.8 + k * 1.15, z0 - 2.75, ux + w - 1, y + 1.05 + k * 1.15, z0 - 2.6, [170, 170, 168], 'Metal', { nc: true, ns: true });
          if (rnd() < 0.25) B('Laundry', ux + 3, y + 1.4, z0 - 2.4, ux + 3 + 3 + rnd() * 5, y + 4.4, z0 - 2.2, pick([[230, 230, 225], [120, 150, 190], [190, 90, 90]]), 'Fabric', { nc: true, ns: true });
          if (f === 0) B('Planter', ux + 2, y + 0.35, z0 - 3.2, ux + 6, y + 1.6, z0 - 2.4, [60, 100, 50], 'LeafyGrass', { nc: true });
        }
        if (kind === 'c') {
          // 1층 현관
          B('Lobby', ux + 0.8, 0, z0 - 0.3, ux + w - 0.8, 8, z0, [255, 236, 200], 'Neon', { nc: true, t: 0.35, light: { type: 'Point', range: 18, brightness: 0.8, color: [255, 220, 170] } });
          B('Canopy', ux - 1, 8.5, z0 - 4, ux + w + 1, 9.1, z0, [200, 200, 196], 'Concrete');
          B('LobbySign', ux + 0.8, 9.2, z0 - 0.35, ux + w - 0.8, 10.6, z0 - 0.05, [40, 60, 100], 'SmoothPlastic', {
            text: { face: 'Front', text: label, color: [255, 255, 255], bg: [40, 60, 100], bgT: 0, lit: 0.4 } });
        }
        ux += w;
      });
    });
  }
  apartment(-390, 336, '101');
  apartment(-245, 336, '102');
  apartment(40, 336, '103');
  apartment(185, 336, '104');
  apartment(-640, 380, '105', 17);
  apartment(450, 380, '106', 16);
});

// 스탠드형 냉온 정수기: 벽(W0)에 등을 대고 +Z 쪽을 본다
function waterPurifier(cx, L, W0) {
  grp('WaterPurifier', () => {
    const so = { nc: true, ns: true }, white = [238, 238, 240];
    B('Body', cx - 0.9, L + 0.12, W0 + 0.1, cx + 0.9, L + 4.6, W0 + 1.6, white, 'SmoothPlastic');
    B('Plinth', cx - 0.84, L, W0 + 0.16, cx + 0.84, L + 0.12, W0 + 1.54, [60, 62, 66], 'SmoothPlastic');
    B('TopCap', cx - 0.92, L + 4.6, W0 + 0.08, cx + 0.92, L + 4.72, W0 + 1.62, [214, 216, 220], 'SmoothPlastic', so);
    B('Front', cx - 0.9, L + 2.75, W0 + 1.6, cx + 0.9, L + 4.6, W0 + 1.65, [196, 200, 206], 'Metal', { nc: true, refl: 0.12 });
    B('Recess', cx - 0.66, L + 1.55, W0 + 1.15, cx + 0.66, L + 2.75, W0 + 1.62, [34, 36, 40], 'SmoothPlastic', so);
    B('DripTray', cx - 0.68, L + 1.5, W0 + 1.2, cx + 0.68, L + 1.6, W0 + 1.8, [132, 136, 142], 'Metal', { nc: true });
    for (let k = 0; k < 5; k++) B('TrayGrille', cx - 0.6 + k * 0.27, L + 1.6, W0 + 1.25, cx - 0.52 + k * 0.27, L + 1.615, W0 + 1.76, [70, 72, 76], 'Metal', { ...so, min: 0.012 });
    [[-0.3, [40, 120, 220]], [0.3, [226, 50, 40]]].forEach(([dx, col]) => {
      cylV('Nozzle', cx + dx, L + 2.5, W0 + 1.42, 0.25, 0.12, [200, 202, 206], 'Metal', so);
      B('Lever', cx + dx - 0.11, L + 2.3, W0 + 1.5, cx + dx + 0.11, L + 2.62, W0 + 1.56, col, 'SmoothPlastic', so);
      P('Lamp', [0.04, 0.12, 0.12], [cx + dx, L + 3.1, W0 + 1.67], col, 'Neon', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.03 });
    });
    B('Panel', cx - 0.5, L + 3.4, W0 + 1.65, cx + 0.5, L + 4.2, W0 + 1.67, [30, 34, 40], 'Glass', { ...so, refl: 0.2, min: 0.015 });
    B('LowerDoor', cx - 0.78, L + 0.3, W0 + 1.6, cx + 0.78, L + 1.4, W0 + 1.63, [226, 226, 228], 'SmoothPlastic', { ...so, min: 0.02 });
    B('CupHolder', cx + 0.92, L + 2.3, W0 + 0.7, cx + 1.24, L + 3.7, W0 + 1.02, [228, 228, 224], 'SmoothPlastic', so);
    cylV('Cups', cx + 1.08, L + 2.05, W0 + 0.86, 0.3, 0.24, [250, 250, 246], 'SmoothPlastic', so);
  });
}

// ═════════════════════════ 3. 담장 · 정문 · 경비실 ═════════════════════════
SHIFT = null;
grp('Wall', () => {
  const H = 6, ZG = GZ;
  const green = [44, 120, 84];
  [[-220, -16], [25, 220]].forEach(([a, b]) => {
    B('LowWall', a, 0, ZG - 0.6, b, 2.6, ZG + 0.6, [176, 170, 160], 'Concrete');
    B('LowWallCap', a, 2.6, ZG - 0.8, b, 2.9, ZG + 0.8, [146, 140, 132], 'Concrete');
    // 초록 철망 울타리 (참고 사진): 기둥 + 위아래 가로대 + 촘촘한 세로살
    [3.2, 6.4, 9.6].forEach((y) => B('FenceRail', a, y, ZG - 0.12, b, y + 0.22, ZG + 0.12, green, 'Metal'));
    for (let x = a + 0.5; x < b; x += 0.75) B('FenceBar', x - 0.05, 2.9, ZG - 0.06, x + 0.05, 9.8, ZG + 0.06, green, 'Metal', { ns: true });
    for (let x = a; x <= b; x += 9) B('FencePost', x - 0.25, 2.9, ZG - 0.25, x + 0.25, 10.2, ZG + 0.25, green, 'Metal');
  });
  const seg = (x0, z0, x1, z1) => {
    B('Wall', x0, 0, z0, x1, H, z1, [182, 176, 166], 'Concrete');
    B('Cap', x0 - 0.25, H, z0 - 0.25, x1 + 0.25, H + 0.45, z1 + 0.25, [140, 136, 128], 'Concrete');
  };
  seg(-220, -200.6, 220, -199.4);
  seg(-220.6, -200, -219.4, ZG);
  seg(219.4, -200, 220.6, ZG);
  for (let x = -220; x <= 220; x += 16) B('Pilaster', x - 0.7, 0, -200.9, x + 0.7, H + 0.6, -199.1, [160, 154, 146], 'Concrete');
  for (let z = -184; z < ZG; z += 16) { B('Pilaster', -220.9, 0, z - 0.7, -219.1, H + 0.6, z + 0.7, [160, 154, 146], 'Concrete'); B('Pilaster', 219.1, 0, z - 0.7, 220.9, H + 0.6, z + 0.7, [160, 154, 146], 'Concrete'); }
  // 넘지 못하게: 담·울타리 위로 보이지 않는 벽 (정문 자리는 정문 모델이 막는다)
  const inv = (x0, z0, x1, z1) => B('InvisibleWall', x0, 0, z0, x1, 60, z1, [255, 255, 255], 'SmoothPlastic', { t: 1, ns: true });
  inv(-220.5, -200.5, 220.5, -199.5); inv(-220.5, -200, -219.5, ZG); inv(219.5, -200, 220.5, ZG);
  inv(-220, ZG - 0.4, -12, ZG + 0.4); inv(12, ZG - 0.4, 220, ZG + 0.4);
  for (let i = 0; i < 70; i++) {
    const side = pick(['N', 'W', 'E']);
    const t0 = -195 + rnd() * 390, w = 2 + rnd() * 6, h = 1 + rnd() * 4.6;
    const t = side === 'N' ? t0 : Math.min(t0, ZG - 10);
    const col = jit(pick([[120, 50, 36], [150, 70, 40], [80, 90, 50], [110, 40, 34]]), 16);
    if (side === 'N') B('Ivy', t, 0.3, -199.4, t + w, h, -199.1, col, 'LeafyGrass', { nc: true });
    else if (side === 'W') B('Ivy', -219.4, 0.3, t, -219.1, h, t + w, col, 'LeafyGrass', { nc: true });
    else B('Ivy', 219.1, 0.3, t, 219.4, h, t + w, col, 'LeafyGrass', { nc: true });
  }
});

SHIFT = SOUTH;
grp('Gate', () => {
  const stone = [226, 222, 212], stoneD = [176, 172, 164], steel = [150, 156, 162], Z = 200;
  // 기둥: 정문 양옆(±12~16), 쪽문 옆(21~25)
  [[-16, -12], [12, 16], [21, 25]].forEach(([x0, x1], i) => {
    B('GatePillar', x0, 0, Z - 1.6, x1, 12.4, Z + 1.6, stone, 'Granite');
    B('PillarBase', x0 - 0.3, 0, Z - 1.9, x1 + 0.3, 1.2, Z + 1.9, stoneD, 'Granite');
    B('PillarCap', x0 - 0.4, 12.4, Z - 2.0, x1 + 0.4, 13.0, Z + 2.0, stoneD, 'Granite');
    B('PillarCapTop', x0 + 0.5, 13.0, Z - 1.1, x1 - 0.5, 13.5, Z + 1.1, stone, 'Granite', { nc: true });
    if (i < 2) P('PillarLamp', [1.3, 1.3, 1.3], [(x0 + x1) / 2, 14.2, Z], [255, 236, 200], 'Neon', { sh: 'Ball', nc: true,
      light: { type: 'Point', range: 22, brightness: 1.2, color: [255, 210, 160], shadows: true } });
  });
  B('NamePlate', -15.4, 4.2, Z + 1.6, -12.6, 11.4, Z + 1.75, [36, 34, 32], 'Marble', { refl: 0.12,
    text: { face: 'Back', text: '송\n천\n고\n등\n학\n교', color: [232, 214, 150], bgT: 1, font: 'Merriweather', lit: 1, pps: 60 } });
  B('NoticeBoard', 12.5, 5.0, Z + 1.6, 15.5, 8.6, Z + 1.72, [250, 250, 246], 'SmoothPlastic', { nc: true,
    text: { face: 'Back', text: '외부인 출입 금지\n\n방문객은 경비실에\n먼저 신고해 주세요', color: [170, 30, 30], bgT: 1, lit: 1, font: 'GothamBold', pps: 60 } });
  // 미닫이 철문: 기둥 안쪽(학교 쪽) 레일 위를 굴러 서쪽으로 열린다. 높이 11 — 뛰어넘을 수 없다
  grp('MainGate', () => {
    const z0 = Z - 2.7, z1 = Z - 2.1, zc = Z - 2.4, x0 = -13.5, x1 = 13.5, top = 11;
    B('RailTop', x0, top - 0.5, z0, x1, top, z1, steel, 'Metal', { pri: true });
    B('RailBottom', x0, 0.7, z0, x1, 1.3, z1, steel, 'Metal');
    B('RailMid', x0, 5.6, z0 + 0.08, x1, 6.0, z1 - 0.08, steel, 'Metal');
    [x0, x1 - 0.5, -0.25].forEach((x) => B('Stile', x, 0.7, z0, x + 0.5, top, z1, steel, 'Metal'));
    for (let x = x0 + 1.05; x < x1 - 0.6; x += 0.62) B('Bar', x - 0.09, 1.3, zc - 0.09, x + 0.09, top - 0.5, zc + 0.09, [168, 174, 180], 'Metal', { ns: true });
    // 대각선 보강대
    rod('Brace', [x0 + 0.5, 1.3, zc], [-0.25, 5.6, zc], 0.2, steel, 'Metal', { nc: true, ns: true });
    rod('Brace', [0.25, 1.3, zc], [x1 - 0.5, 5.6, zc], 0.2, steel, 'Metal', { nc: true, ns: true });
    B('Lock', 12.2, 4.6, z0 - 0.4, 13.2, 6.1, z0, [150, 120, 40], 'Metal', { tag: 'GateLock' });
    [-11, -3.5, 3.5, 11].forEach((x) => {
      P('Roller', [0.5, 1.1, 1.1], [x, 0.55, zc], [40, 40, 44], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
      B('RollerFork', x - 0.45, 0.5, zc - 0.34, x + 0.45, 0.9, zc + 0.34, steel, 'Metal', { nc: true, ns: true });
    });
    for (let x = x0 + 0.6; x < x1; x += 1.24) P('Spike', [0.5, 0.2, 0.2], [x, top + 0.25, zc], steel, 'Metal', { sh: 'Wedge', r: [0, 0, 90], nc: true, ns: true });
    B('GateBlock', x0, 0, z0 - 0.1, x1, 60, z1 + 0.1, [255, 255, 255], 'SmoothPlastic', { t: 1, ns: true });
  }, 'MainGate');
  B('GateTrack', -44, 0.2, Z - 2.6, 14, 0.3, Z - 2.2, [80, 82, 86], 'Metal', { nc: true });
  // 쪽문 (사람만 다니는 문): 밤에는 잠겨 있다
  hingeDoor('SideGate', [16, 0.3, Z - 0.3, 21, 10.4, Z + 0.3], [16.1, Z], 90, { locked: '쪽문은 잠겨 있다. 06시 전에는 아무도 나갈 수 없다.' }, () => {
    [[16, 16.4], [20.6, 21]].forEach(([a, b]) => B('SideStile', a, 0.3, Z - 0.2, b, 10.4, Z + 0.2, steel, 'Metal', { nc: true }));
    [0.3, 5.2, 10.0].forEach((y) => B('SideRail', 16, y, Z - 0.2, 21, y + 0.4, Z + 0.2, steel, 'Metal', { nc: true }));
    for (let x = 16.9; x < 20.6; x += 0.6) B('SideBar', x - 0.08, 0.7, Z - 0.08, x + 0.08, 10.0, Z + 0.08, [168, 174, 180], 'Metal', { nc: true, ns: true });
    B('SideLock', 20.1, 4.6, Z + 0.2, 20.9, 5.6, Z + 0.5, [150, 120, 40], 'Metal', { nc: true });
  });
  B('GateBlock', 12, 10.4, Z - 0.4, 25, 60, Z + 0.4, [255, 255, 255], 'SmoothPlastic', { t: 1, ns: true });
  B('GateBlock', -16, 12.4, Z - 0.4, -12, 60, Z + 0.4, [255, 255, 255], 'SmoothPlastic', { t: 1, ns: true });
  B('GateSill', -12, 0, Z - 1.6, 12, 0.24, Z + 1.6, [120, 118, 114], 'Granite');
});

grp('GuardBooth', () => {
  const x0 = 22, x1 = 38, z0 = 176, z1 = 190, H = 9.6, F = 0.9;
  const wc = [226, 222, 210], so = { nc: true, ns: true }, al = [176, 180, 184], alD = [92, 96, 102];
  // ═══ 바깥 ═══
  B('Base', x0 - 0.6, 0, z0 - 0.6, x1 + 0.6, F, z1 + 0.6, [128, 124, 118], 'Granite');
  B('Floor', x0 + 0.5, F, z0 + 0.5, x1 - 0.5, F + 0.05, z1 - 0.5, [176, 170, 156], 'CeramicTiles');
  wallHoles('Wall', 'z', z0, z1, F, H, x0, x0 + 0.5, [{ u0: z0 + 1.5, u1: z1 - 1.5, v0: F + 3, v1: F + 7.2 }], wc, 'Plaster');
  slider('z', z0 + 1.5, z1 - 1.5, F + 3, F + 7.2, x0 + 0.25);
  wallHoles('Wall', 'x', x0, x1, F, H, z1 - 0.5, z1, [{ u0: x0 + 1.5, u1: x1 - 3, v0: F + 3, v1: F + 7.2 }], wc, 'Plaster');
  slider('x', x0 + 1.5, x1 - 3, F + 3, F + 7.2, z1 - 0.25);
  wallHoles('Wall', 'x', x0, x1, F, H, z0, z0 + 0.5, [{ u0: 31, u1: 34.4, v0: F, v1: F + 7.2 }, { u0: 23.5, u1: 28.5, v0: F + 3.5, v1: F + 6.8 }], wc, 'Plaster');
  slider('x', 23.5, 28.5, F + 3.5, F + 6.8, z0 + 0.25);
  wallHoles('Wall', 'z', z0, z1, F, H, x1 - 0.5, x1, [], wc, 'Plaster');
  // 아랫벽 타일 띠 + 창턱
  const tile = [142, 92, 74];
  B('TileBand', x0 - 0.08, F, z0 - 0.08, 31 - 0.2, F + 2.9, z0, tile, 'Brick', so);
  B('TileBand', 34.4 + 0.2, F, z0 - 0.08, x1 + 0.08, F + 2.9, z0, tile, 'Brick', so);
  B('TileBand', x0 - 0.08, F, z1, x1 + 0.08, F + 2.9, z1 + 0.08, tile, 'Brick', so);
  B('TileBand', x0 - 0.08, F, z0, x0, F + 2.9, z1, tile, 'Brick', so);
  B('TileBand', x1, F, z0, x1 + 0.08, F + 2.9, z1, tile, 'Brick', so);
  B('BandCap', x0 - 0.14, F + 2.9, z0 - 0.14, 30.8, F + 3.0, z0, [196, 192, 184], 'Concrete', so);
  B('BandCap', 34.6, F + 2.9, z0 - 0.14, x1 + 0.14, F + 3.0, z0, [196, 192, 184], 'Concrete', so);
  B('BandCap', x0 - 0.14, F + 2.9, z1, x1 + 0.14, F + 3.0, z1 + 0.14, [196, 192, 184], 'Concrete', so);
  B('BandCap', x0 - 0.14, F + 2.9, z0, x0, F + 3.0, z1, [196, 192, 184], 'Concrete', so);
  B('BandCap', x1, F + 2.9, z0, x1 + 0.14, F + 3.0, z1, [196, 192, 184], 'Concrete', so);
  B('Sill', 23.3, F + 3.3, z0 - 0.3, 28.7, F + 3.5, z0 + 0.05, [200, 196, 188], 'Concrete', so);
  B('Sill', x0 - 0.3, F + 2.8, z0 + 1.3, x0 + 0.05, F + 3.0, z1 - 1.3, [200, 196, 188], 'Concrete', so);
  B('Sill', x0 + 1.3, F + 2.8, z1 - 0.05, x1 - 2.8, F + 3.0, z1 + 0.3, [200, 196, 188], 'Concrete', so);
  // 지붕: 슬래브 + 남색 테두리 + 물받이·홈통
  B('Roof', x0 - 1.4, H, z0 - 1.4, x1 + 1.4, H + 0.6, z1 + 1.4, [104, 100, 96], 'Concrete');
  [[x0 - 1.5, z0 - 1.5, x1 + 1.5, z0 - 1.3], [x0 - 1.5, z1 + 1.3, x1 + 1.5, z1 + 1.5], [x0 - 1.5, z0 - 1.5, x0 - 1.3, z1 + 1.5], [x1 + 1.3, z0 - 1.5, x1 + 1.5, z1 + 1.5]]
    .forEach(([a, b, c, d]) => B('Fascia', a, H - 0.3, b, c, H + 0.9, d, [52, 66, 96], 'Metal'));
  B('Soffit', x0 - 1.3, H - 0.06, z0 - 1.3, x1 + 1.3, H, z1 + 1.3, [228, 228, 222], 'SmoothPlastic', so);
  rod('Downpipe', [x1 + 0.25, H - 0.3, z1 + 0.25], [x1 + 0.25, 0.3, z1 + 0.25], 0.28, [196, 198, 200], 'Metal', so);
  rod('DownpipeFoot', [x1 + 0.25, 0.3, z1 + 0.25], [x1 + 0.7, 0.12, z1 + 0.7], 0.28, [196, 198, 200], 'Metal', so);
  // 문: 알루미늄 유리문 (바깥으로 열려 있음), 문틀, 계단, 차양
  B('DoorFrame', 30.8, F, z0 - 0.1, 31, F + 7.4, z0 + 0.6, alD, 'Metal');
  B('DoorFrame', 34.4, F, z0 - 0.1, 34.6, F + 7.4, z0 + 0.6, alD, 'Metal');
  B('DoorFrame', 30.8, F + 7.2, z0 - 0.1, 34.6, F + 7.4, z0 + 0.6, alD, 'Metal');
  hingeDoor('Door', [31.0, F + 0.05, z0 - 0.05, 34.35, F + 7.15, z0 + 0.25], [34.35, z0 + 0.1], -95, {}, () => {
    const Fd = yawFrame([34.35, F, z0 + 0.1], 180); // 경첩: 문틀 동쪽. 로컬 +X = 문 폭 방향 (닫힌 모습, 바깥으로 열림)
    FB(Fd, 'DoorStile', 0, 0.05, -0.07, 0.3, 7.15, 0.07, al, 'Metal');
    FB(Fd, 'DoorStile', 3.05, 0.05, -0.07, 3.35, 7.15, 0.07, al, 'Metal');
    FB(Fd, 'DoorRail', 0.3, 6.8, -0.07, 3.05, 7.15, 0.07, al, 'Metal');
    FB(Fd, 'DoorRail', 0.3, 0.05, -0.07, 3.05, 0.9, 0.07, al, 'Metal');
    FB(Fd, 'DoorRail', 0.3, 3.3, -0.07, 3.05, 3.55, 0.07, al, 'Metal', so);
    FB(Fd, 'DoorGlass', 0.3, 0.9, -0.02, 3.05, 6.8, 0.02, [150, 176, 184], 'Glass', { nc: true, t: 0.6, refl: 0.15, min: 0.02 });
    [-0.13, 0.13].forEach((w) => { Frod(Fd, 'DoorHandle', [2.85, 2.9, w], [2.85, 4.3, w], 0.09, [206, 208, 212], 'Metal', so); [3.0, 4.2].forEach((y) => Frod(Fd, 'HandleFoot', [2.85, y, 0], [2.85, y, w], 0.06, [206, 208, 212], 'Metal', { ...so, min: 0.03 })); });
    FB(Fd, 'KickPlate', 0.3, 0.12, -0.08, 3.05, 0.8, 0.08, [200, 202, 206], 'Metal', { ...so, refl: 0.12 });
    FB(Fd, 'DoorSticker', 1.0, 4.6, -0.03, 2.35, 5.2, 0.03, [30, 52, 104], 'SmoothPlastic', { ...so, min: 0.02, text: { face: 'Back', text: '경 비 실', color: [255, 255, 255], bgT: 1, lit: 1, font: 'GothamBold', pps: 90 } });
  });
  B('Step', 30.6, 0, z0 - 1.7, 34.8, 0.45, z0 - 0.6, [150, 146, 140], 'Concrete');
  B('StepNosing', 30.6, 0.45, z0 - 1.7, 34.8, 0.47, z0 - 1.5, [226, 196, 60], 'SmoothPlastic', { ...so, min: 0.02 });
  B('Canopy', 30.2, F + 7.75, z0 - 2.6, 35.2, F + 7.95, z0, [52, 66, 96], 'Metal');
  [30.4, 35.0].forEach((x) => rod('CanopyStay', [x, F + 8.6, z0 - 0.05], [x, F + 7.95, z0 - 2.3], 0.08, al, 'Metal', so));
  B('PorchLight', 32.2, F + 7.55, z0 - 1.6, 33.2, F + 7.75, z0 - 0.8, [255, 240, 214], 'Neon', { nc: true, light: { type: 'Spot', face: 'Bottom', range: 18, angle: 110, brightness: 1.2, color: [255, 214, 170], shadows: true } });
  B('Sign', 23.2, 7.75, z0 - 0.32, 28.8, 8.95, z0 - 0.05, [30, 50, 100], 'SmoothPlastic',
    { text: { face: 'Front', text: '경 비 실', color: [255, 255, 255], bg: [30, 50, 100], bgT: 0, lit: 0.4 } });
  B('SignFrame', 23.1, 7.65, z0 - 0.28, 28.9, 9.05, z0 - 0.02, al, 'Metal', so);
  B('NamePlate', 29.2, F + 4.3, z0 - 0.06, 30.6, F + 5.9, z0, [60, 48, 34], 'Wood', { ...so, text: { face: 'Front', text: '송천고등학교\n야간 경비실\n\n방문객은 먼저\n신고해 주세요', color: [236, 222, 180], bgT: 1, lit: 1, font: 'GothamBold', pps: 90 } });
  B('Intercom', 35.0, F + 3.9, z0 - 0.12, 35.5, F + 4.8, z0, [214, 216, 220], 'SmoothPlastic', so);
  P('IntercomBtn', [0.05, 0.16, 0.16], [35.25, F + 4.15, z0 - 0.13], [60, 62, 66], 'SmoothPlastic', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.03 });
  B('Mailbox', 35.9, F + 3.4, z0 - 0.45, 37.2, F + 4.4, z0, [150, 40, 36], 'Metal', { nc: true });
  B('MailSlot', 36.1, F + 4.05, z0 - 0.46, 37.0, F + 4.13, z0 - 0.45, [30, 30, 32], 'Metal', { ...so, min: 0.01 });
  // 처마 밑 방범 카메라 (돔)
  cylV('DomeBase', x0 - 0.5, H - 0.3, z0 - 0.5, 0.24, 0.6, [232, 232, 228], 'SmoothPlastic', so);
  ball('Dome', x0 - 0.5, H - 0.34, z0 - 0.5, 0.5, [24, 24, 28], 'Glass', { ...so, refl: 0.3 });
  // 실외기 (그릴·받침·배관)
  grp('ACOutdoor', () => {
    B('ACFeet', x1 + 0.2, 0, 182.3, x1 + 2.1, 0.25, 182.6, [70, 72, 76], 'Metal', so); B('ACFeet', x1 + 0.2, 0, 185.4, x1 + 2.1, 0.25, 185.7, [70, 72, 76], 'Metal', so);
    B('ACBody', x1 + 0.15, 0.25, 182, x1 + 2.15, 3.0, 186, [228, 228, 224], 'Metal');
    disc('ACGrille', [x1 + 2.16, 1.65, 183.5], [1, 0, 0], 2.1, 0.04, [60, 62, 66], 'Metal', so);
    for (let k = 0; k < 5; k++) B('ACGrilleBar', x1 + 2.17, 0.75 + k * 0.45, 182.5, x1 + 2.2, 0.8 + k * 0.45, 184.5, [200, 202, 204], 'Metal', { ...so, min: 0.02 });
    for (let k = 0; k < 6; k++) B('ACVent', x1 + 2.15, 0.6 + k * 0.38, 184.9, x1 + 2.18, 0.72 + k * 0.38, 185.8, [150, 152, 156], 'Metal', { ...so, min: 0.02 });
    rod('ACPipe', [x1 + 0.3, 3.0, 185.5], [x1 + 0.3, F + 6.9, 185.5], 0.2, [232, 232, 228], 'SmoothPlastic', so);
    rod('ACPipe', [x1 + 0.3, F + 6.9, 185.5], [x1, F + 6.9, 185.5], 0.2, [232, 232, 228], 'SmoothPlastic', so);
  });
  // 화단 상자, 고깔
  [[23.6, 25.8], [26.2, 28.4]].forEach(([a, b]) => {
    B('Planter', a, 0, z0 - 1.8, b, 1.2, z0 - 0.8, [124, 92, 66], 'WoodPlanks');
    B('PlanterSoil', a + 0.1, 1.15, z0 - 1.7, b - 0.1, 1.22, z0 - 0.9, [58, 44, 34], 'Sand', so);
    for (let k = 0; k < 3; k++) ball('Shrub', a + 0.45 + k * 0.65, 1.55 + rnd() * 0.15, z0 - 1.3, 0.85 + rnd() * 0.25, jit([52, 88, 50], 12), 'LeafyGrass', so);
  });
  [[20.4, 191.6], [20.4, 196.2]].forEach(([x, z]) => {
    B('ConeBase', x - 0.45, 0, z - 0.45, x + 0.45, 0.1, z + 0.45, [30, 30, 32], 'Rubber', so);
    cylV('Cone', x, 0.1, z, 0.8, 0.55, [230, 90, 30], 'SmoothPlastic', so); cylV('Cone', x, 0.9, z, 0.7, 0.34, [240, 240, 236], 'SmoothPlastic', so); cylV('Cone', x, 1.6, z, 0.5, 0.16, [230, 90, 30], 'SmoothPlastic', so);
  });
  // ═══ 안 ═══
  ceiling(x0 + 0.5, x1 - 0.5, z0 + 0.5, z1 - 0.5, H - 0.6);
  troffer(29.5, 183, H - 0.6, true, { tag: 'BoothLight', light: { type: 'Surface', face: 'Bottom', range: 14, angle: 120, brightness: 1.1, color: [255, 238, 214], shadows: true } });
  const WP = { h: 2.9, color: [196, 204, 188], base: [86, 80, 72] };
  wainscot('z', z0 + 0.5, z1 - 0.5, x1 - 0.5, -1, F, [], WP);
  wainscot('z', z0 + 0.5, z1 - 0.5, x0 + 0.5, 1, F, [], WP);
  wainscot('x', x0 + 0.5, x1 - 0.5, z0 + 0.5, 1, F, [[30.8, 34.6]], WP);
  // 롤 블라인드 (반쯤 내림)
  B('Blind', x0 + 0.5, F + 5.9, z0 + 1.6, x0 + 0.58, F + 7.3, z1 - 1.6, [226, 222, 208], 'Fabric', so);
  B('BlindBar', x0 + 0.5, F + 5.8, z0 + 1.6, x0 + 0.62, F + 5.9, z1 - 1.6, al, 'Metal', so);
  B('Blind', 23.6, F + 5.6, z0 + 0.5, 28.4, F + 6.9, z0 + 0.58, [226, 222, 208], 'Fabric', so);
  B('BlindBar', 23.6, F + 5.5, z0 + 0.5, 28.4, F + 5.6, z0 + 0.62, al, 'Metal', so);
  // 벽걸이 에어컨 (동쪽 벽) + 콘센트
  B('WallAC', x1 - 1.1, F + 6.6, 184.2, x1 - 0.5, F + 7.6, 187.0, [240, 240, 236], 'SmoothPlastic', { nc: true });
  B('WallACVent', x1 - 1.12, F + 6.62, 184.35, x1 - 0.95, F + 6.72, 186.85, [70, 72, 76], 'SmoothPlastic', so);
  P('WallACLed', [0.03, 0.06, 0.06], [x1 - 1.11, F + 7.0, 186.6], [60, 255, 120], 'Neon', { ...so, sh: 'Cylinder', min: 0.03 });
  B('Outlet', x1 - 0.54, F + 1.2, 187.6, x1 - 0.5, F + 1.7, 188.0, [240, 240, 236], 'SmoothPlastic', { ...so, min: 0.03 });
  // ── 책상 ──
  const dk = [112, 86, 62], DT = F + 2.6;
  B('DeskTop', x0 + 0.5, F + 2.45, 186.6, x1 - 0.5, DT, z1 - 0.5, [176, 142, 100], 'Wood');
  B('DeskEdge', x0 + 0.5, F + 2.38, 186.56, x1 - 0.5, F + 2.6, 186.62, [96, 72, 50], 'Wood', so);
  B('DeskBack', x0 + 0.5, F + 0.5, 189.2, x1 - 0.5, F + 2.45, 189.4, dk, 'Wood', so);
  [[x0 + 0.5, x0 + 2.6], [x1 - 2.6, x1 - 0.5], [29.0, 29.2]].forEach(([a, b]) => B('DeskSide', a, F, 186.8, b, F + 2.45, 189.4, dk, 'Wood'));
  [x0 + 0.55, x1 - 2.55].forEach((a) => { for (let k = 0; k < 3; k++) {
    B('Drawer', a + 0.05, F + 0.25 + k * 0.72, 186.76, a + 1.95, F + 0.9 + k * 0.72, 186.8, [128, 100, 72], 'Wood', so);
    B('DrawerPull', a + 0.75, F + 0.5 + k * 0.72, 186.7, a + 1.25, F + 0.58 + k * 0.72, 186.76, [176, 178, 182], 'Metal', so);
  } });
  B('DeskMat', 24.9, DT, 186.8, 28.9, DT + 0.03, 188.5, [44, 78, 60], 'Rubber', { ...so, min: 0.02 });
  // ── CCTV: 모니터 6대 벽 + 조작 콘솔 ──
  grp('CCTV', () => {
    const mz = 188.72, blk = [20, 20, 22];
    // 거치대: 세로 기둥 2 + 가로대 + 받침
    [30.0, 34.5].forEach((x) => { B('MountPost', x - 0.09, DT, mz + 0.24, x + 0.09, F + 6.25, mz + 0.42, [60, 62, 66], 'Metal', { nc: true }); B('MountFoot', x - 0.5, DT, mz - 0.1, x + 0.5, DT + 0.08, mz + 0.5, [60, 62, 66], 'Metal', so); });
    [F + 3.75, F + 5.3].forEach((y) => B('MountBar', 29.2, y - 0.08, mz + 0.2, 35.3, y + 0.08, mz + 0.28, [60, 62, 66], 'Metal', so));
    rod('CableTrunk', [32.25, F + 5.3, mz + 0.34], [32.25, DT, mz + 0.34], 0.14, [26, 26, 28], 'Rubber', so);
    const camNames = ['정문', '운동장', '1F 복도', '2F 복도', '3F 복도', '주차장'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const mx = 29.05 + c * 2.15, my = F + 3.05 + r * 1.52, w = 2.05, h = 1.36;
      B('MonitorBody', mx, my, mz, mx + w, my + h, mz + 0.2, blk, 'SmoothPlastic', { nc: true });
      B('MonitorBack', mx + 0.4, my + 0.25, mz + 0.2, mx + w - 0.4, my + h - 0.25, mz + 0.26, [34, 34, 36], 'SmoothPlastic', so);
      B('Screen', mx + 0.06, my + 0.16, mz - 0.03, mx + w - 0.06, my + h - 0.06, mz, [24, 30, 30], 'Neon',
        { tag: 'CCTVScreen', attr: { Cam: r * 3 + c + 1, Label: camNames[r * 3 + c] }, nc: true, ns: true, min: 0.02 });
      P('MonitorLed', [0.02, 0.05, 0.05], [mx + w - 0.16, my + 0.08, mz - 0.01], [60, 255, 120], 'Neon', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.02 });
      B('MonitorTag', mx + 0.1, my + 0.03, mz - 0.012, mx + 0.75, my + 0.13, mz, [200, 202, 206], 'SmoothPlastic', { ...so, min: 0.01,
        text: { face: 'Front', text: `CAM ${r * 3 + c + 1}`, color: [20, 20, 24], bgT: 1, lit: 1, font: 'GothamBold', pps: 200 } });
    }
    // 녹화기 2단 + 키보드 + 조이스틱 조작기 + 마우스
    B('DVR', 30.0, DT, 187.75, 32.6, DT + 0.32, 188.55, [26, 26, 28], 'Metal', { tag: 'CCTVRack' });
    B('DVR2', 30.05, DT + 0.34, 187.8, 32.55, DT + 0.62, 188.55, [38, 38, 42], 'Metal', { nc: true });
    for (let k = 0; k < 6; k++) P('DVRLed', [0.02, 0.05, 0.05], [30.3 + k * 0.16, DT + 0.16, 187.74], k % 3 === 2 ? [255, 170, 40] : [60, 255, 120], 'Neon', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.02 });
    B('DVRDisk', 31.5, DT + 0.08, 187.74, 32.45, DT + 0.24, 187.75, [60, 62, 66], 'Metal', { ...so, min: 0.01 });
    for (let k = 0; k < 8; k++) B('DVRVent', 30.2 + k * 0.28, DT + 0.42, 187.79, 30.38 + k * 0.28, DT + 0.54, 187.8, [14, 14, 16], 'Metal', { ...so, min: 0.01 });
    B('Keyboard', 30.3, DT, 186.85, 32.3, DT + 0.08, 187.5, [34, 34, 36], 'SmoothPlastic', so);
    for (let k = 0; k < 4; k++) B('Keys', 30.36, DT + 0.08, 186.9 + k * 0.145, 32.24, DT + 0.11, 187.02 + k * 0.145, [58, 58, 62], 'SmoothPlastic', { ...so, min: 0.02 });
    B('MousePad', 32.5, DT, 186.85, 33.4, DT + 0.02, 187.55, [24, 24, 26], 'Rubber', { ...so, min: 0.015 });
    B('Mouse', 32.82, DT + 0.02, 187.05, 33.05, DT + 0.12, 187.4, [40, 40, 44], 'SmoothPlastic', so);
    B('Controller', 33.7, DT, 186.9, 35.3, DT + 0.2, 187.9, [30, 30, 32], 'Metal', { nc: true });
    cylV('StickBoot', 34.9, DT + 0.2, 187.4, 0.14, 0.4, [16, 16, 18], 'Rubber', so);
    rod('Stick', [34.9, DT + 0.3, 187.4], [34.95, DT + 0.75, 187.35], 0.1, [20, 20, 22], 'SmoothPlastic', so);
    ball('StickKnob', 34.95, DT + 0.8, 187.35, 0.2, [20, 20, 22], 'SmoothPlastic', so);
    for (let k = 0; k < 6; k++) B('CtrlButton', 33.85 + (k % 3) * 0.26, DT + 0.2, 187.05 + Math.floor(k / 3) * 0.3, 34.03 + (k % 3) * 0.26, DT + 0.24, 187.23 + Math.floor(k / 3) * 0.3, k === 0 ? [220, 50, 40] : [90, 92, 98], 'SmoothPlastic', { ...so, min: 0.02 });
    B('CtrlLabel', 33.8, DT + 0.2, 187.62, 34.6, DT + 0.21, 187.84, [200, 202, 206], 'SmoothPlastic', { ...so, min: 0.008, text: { face: 'Top', text: 'CCTV 관제', color: [20, 20, 24], bgT: 1, lit: 1, font: 'GothamBold', pps: 200 } });
  });
  // 사무용 IP 전화기 (참고 사진: 검은 몸체, 왼쪽 수화기, 비스듬한 윗면에 액정·방향키·숫자판, 꼬인 전화선)
  grp('Phone', () => {
    const S = 1.25, blk = [26, 26, 28], blk2 = [40, 40, 44], key = [22, 22, 24], o2 = { nc: true, ns: true, min: 0.008 };
    // 몸체 틀: 원점 = 몸체 가운데 바닥, X = 앉은 사람 기준 오른쪽(-월드X), Z = 사람 쪽(-월드Z)
    const Fp = { o: [23.85, DT, 188.0], X: [-1, 0, 0], Y: [0, 1, 0], Z: [0, 0, -1] };
    const sc = (v) => v.map((q) => q * S);
    const FPs = (F, n, size, lp, col, mat, o = {}) => FP(F, n, sc(size), sc(lp), col, mat, o);
    const FBs = (F, n, a0, b0, c0, a1, b1, c1, col, mat, o) => FB(F, n, a0 * S, b0 * S, c0 * S, a1 * S, b1 * S, c1 * S, col, mat, o);
    // 아래 받침 + 비스듬한 윗몸 (뒤가 높다)
    FBs(Fp, 'PhoneBase', -0.37, 0, -0.34, 0.37, 0.09, 0.34, blk, 'SmoothPlastic', { nc: true });
    FPs(Fp, 'PhoneBody', [0.74, 0.22, 0.68], [0, 0.2, 0], blk, 'SmoothPlastic', { nc: true, sh: 'Wedge', axes: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]] });
    FBs(Fp, 'PhoneFoot', -0.33, -0.012, -0.3, 0.33, 0.0, 0.3, [16, 16, 16], 'Rubber', o2);
    // 윗면 틀: 앞쪽 가장자리 가운데에서 시작, Y = 비탈을 따라 뒤로, Z = 윗면 바깥쪽
    const a = Math.atan2(0.22, 0.68), ca = Math.cos(a), sa = Math.sin(a);
    const T = { o: fpt(Fp, sc([0, 0.09, 0.34])), X: fvec(Fp, [1, 0, 0]), Y: vnorm(fvec(Fp, [0, sa, -ca])), Z: vnorm(fvec(Fp, [0, ca, sa])) };
    const L = 0.715;
    // 위쪽 조작부 (조금 더 밝은 판) + 액정
    FBs(T, 'ControlPanel', -0.31, 0.38, 0, 0.31, L - 0.03, 0.006, blk2, 'SmoothPlastic', o2);
    FBs(T, 'LcdBezel', -0.2, 0.55, 0.004, 0.2, 0.66, 0.012, [14, 14, 16], 'SmoothPlastic', o2);
    FBs(T, 'Lcd', -0.185, 0.56, 0.011, 0.185, 0.65, 0.014, [156, 172, 140], 'SmoothPlastic', { ...o2,
      text: { face: 'Back', text: '전화번호를 입력하세요', color: [40, 48, 34], bgT: 1, lit: 0.9, font: 'GothamBold', pps: 400 } });
    FBs(T, 'Brand', -0.29, 0.665, 0.006, -0.17, 0.69, 0.008, [196, 198, 202], 'SmoothPlastic', { ...o2, text: { face: 'Back', text: 'IP PHONE', color: [196, 198, 202], bgT: 1, lit: 1, font: 'GothamBold', pps: 400 } });
    disc('MsgLamp', fpt(T, sc([0.28, 0.68, 0.01])), T.Z, 0.035 * S, 0.012, [70, 74, 70], 'SmoothPlastic', { ...o2, tag: 'Phone' });
    // 방향키: 검은 테 + 빨간 고리 + 가운데 확인 버튼
    const nav = fpt(T, sc([0, 0.465, 0]));
    disc('NavRim', vadd(nav, vmul(T.Z, 0.012)), T.Z, 0.19 * S, 0.012, [60, 60, 64], 'SmoothPlastic', o2);
    disc('NavRing', vadd(nav, vmul(T.Z, 0.02)), T.Z, 0.16 * S, 0.012, [170, 24, 30], 'SmoothPlastic', o2);
    disc('NavPad', vadd(nav, vmul(T.Z, 0.026)), T.Z, 0.14 * S, 0.012, [30, 30, 34], 'SmoothPlastic', o2);
    disc('NavOk', vadd(nav, vmul(T.Z, 0.034)), T.Z, 0.06 * S, 0.014, [52, 52, 56], 'SmoothPlastic', { ...o2, refl: 0.15 });
    // 소프트키 4개 (메뉴·재다이얼 / 전환·지움)
    [[-0.19, 0.495, '메뉴'], [-0.19, 0.43, '재다이얼'], [0.19, 0.495, '전환'], [0.19, 0.43, '지움']].forEach(([u, v, t]) => {
      FBs(T, 'SoftKey', u - 0.05, v - 0.016, 0.008, u + 0.05, v + 0.016, 0.022, key, 'SmoothPlastic', o2);
      FBs(T, 'SoftLabel', u - 0.05, v + 0.018, 0.006, u + 0.05, v + 0.04, 0.008, blk2, 'SmoothPlastic', { ...o2, text: { face: 'Back', text: t, color: [200, 202, 206], bgT: 1, lit: 1, font: 'GothamBold', pps: 500 } });
    });
    // 숫자판 4×3 (흰 숫자 + 작은 한글)
    const keys = [['1', 'ㄱ'], ['2', 'ㄴ ABC'], ['3', 'ㄷ DEF'], ['4', 'ㄹ GHI'], ['5', 'ㅁ JKL'], ['6', 'ㅂ MNO'], ['7', 'ㅅ PQRS'], ['8', 'ㅇ TUV'], ['9', 'ㅈ WXYZ'], ['*', '획추가'], ['0', '.,?!'], ['#', '쌍자음']];
    keys.forEach(([d, sub], k) => {
      const u = -0.07 + (k % 3) * 0.105, v = 0.31 - Math.floor(k / 3) * 0.078;
      FBs(T, 'Key', u - 0.04, v - 0.03, 0.0, u + 0.04, v + 0.03, 0.028, key, 'SmoothPlastic', { ...o2,
        text: { face: 'Back', text: `${d}\n${sub}`, color: [236, 236, 232], bgT: 1, lit: 1, font: 'GothamBold', pps: 600 } });
    });
    // 왼쪽: 음소거(둥근), 음량(위아래), 스피커(큰 둥근 버튼)
    disc('MuteKey', fpt(T, sc([-0.22, 0.32, 0.014])), T.Z, 0.055 * S, 0.028, key, 'SmoothPlastic', o2);
    FBs(T, 'VolumeKey', -0.245, 0.15, 0.0, -0.195, 0.27, 0.026, key, 'SmoothPlastic', o2);
    FBs(T, 'VolumeMark', -0.235, 0.205, 0.026, -0.205, 0.215, 0.028, [120, 120, 124], 'SmoothPlastic', o2);
    disc('SpeakerKey', fpt(T, sc([-0.22, 0.075, 0.014])), T.Z, 0.075 * S, 0.028, key, 'SmoothPlastic', o2);
    FBs(T, 'SpeakerLabel', -0.25, 0.025, 0.004, -0.19, 0.04, 0.006, blk, 'SmoothPlastic', { ...o2, text: { face: 'Back', text: '스피커', color: [200, 202, 206], bgT: 1, lit: 1, font: 'GothamBold', pps: 600 } });
    // 오른쪽: 은색 기능키 판 + 검은 키 4개
    FBs(T, 'FeaturePanel', 0.215, 0.05, 0.0, 0.305, 0.33, 0.012, [196, 200, 206], 'SmoothPlastic', { ...o2, refl: 0.1 });
    for (let k = 0; k < 4; k++) FBs(T, 'FeatureKey', 0.225, 0.075 + k * 0.066, 0.01, 0.295, 0.105 + k * 0.066, 0.024, key, 'SmoothPlastic', o2);
    // 스피커 구멍
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) disc('Grille', fpt(T, sc([-0.335 + c * 0.018, 0.36 + r * 0.022, 0.003])), T.Z, 0.009 * S, 0.004, [8, 8, 8], 'SmoothPlastic', { ...o2, min: 0.005 });
    // 수화기 (왼쪽 받침대 위, 앞뒤로 길게 놓임): 손잡이 + 송화부(앞) + 수화부(뒤)
    FBs(T, 'Cradle', -0.37, 0.0, 0.0, -0.29, L, 0.03, blk2, 'SmoothPlastic', o2);
    FBs(T, 'Handset', -0.43, 0.08, 0.05, -0.285, L - 0.08, 0.12, blk, 'SmoothPlastic', { nc: true, refl: 0.08 });
    FBs(T, 'HandsetMouth', -0.44, -0.04, 0.04, -0.275, 0.12, 0.15, blk, 'SmoothPlastic', { nc: true, refl: 0.08 });
    FBs(T, 'HandsetEar', -0.44, L - 0.14, 0.04, -0.275, L + 0.02, 0.16, blk, 'SmoothPlastic', { nc: true, refl: 0.08 });
    // 꼬인 전화선: 수화기 앞쪽 끝에서 책상을 지나 몸체 왼쪽 옆으로 (나선)
    const p0 = fpt(T, sc([-0.36, -0.03, 0.03])), p1 = fpt(Fp, sc([-0.45, 0.02, 0.5])), p2 = fpt(Fp, sc([-0.2, 0.02, 0.62])), p3 = fpt(Fp, sc([0.1, 0.02, 0.5])), p4 = fpt(Fp, sc([-0.37, 0.05, 0.2]));
    const path = [p0, p1, p2, p3, p4], pts = [];
    const lerp3 = (a1, b1, t) => vadd(a1, vmul(vsub(b1, a1), t));
    for (let k = 0; k < path.length - 1; k++) for (let t = 0; t < 1; t += 0.1) pts.push(lerp3(path[k], path[k + 1], t));
    pts.push(p4);
    let prev = null;
    pts.forEach((c, k) => {
      if (k === 0 || k === pts.length - 1) { prev = c; return; }
      const dir = vnorm(vsub(pts[k + 1], pts[k - 1]));
      const side = vnorm(vcross(dir, [0, 1, 0])), up = vcross(side, dir);
      for (let q = 0; q < 3; q++) {
        const ang = (k * 3 + q) * 2.1, r = 0.022 * S;
        const pnt = vadd(c, vadd(vmul(side, Math.cos(ang) * r), vmul(up, Math.sin(ang) * r + r)));
        rod('PhoneCord', prev, pnt, 0.014 * S, [18, 18, 20], 'SmoothPlastic', { ...o2, min: 0.01 });
        prev = pnt;
      }
    });
  });
  // 수첩 (펼친 두 쪽: 근무 수칙 손글씨는 Client 가 SurfaceGui 로 그린다)
  grp('RulesNotebook', () => {
    const y = DT + 0.03, cxn = 26.6, czn = 187.6;
    B('NotebookCover', cxn - 1.14, y, czn - 0.76, cxn + 1.14, y + 0.03, czn + 0.76, [36, 44, 78], 'Leather', { nc: true, min: 0.02, tag: 'RulesNotebook' });
    [[1, 0.56], [2, -0.56]].forEach(([pg, dx]) => P('NotebookPage', [1.06, 0.03, 1.44], [cxn + dx, y + 0.045, czn], [250, 246, 230], 'SmoothPlastic',
      { ...so, r: [0, 180, 0], min: 0.02, tag: 'RulesNotebookPage', attr: { Page: pg } }));
    for (let k = 0; k < 9; k++) P('NotebookRing', [0.05, 0.1, 0.1], [cxn, y + 0.07, czn - 0.62 + k * 0.155], [176, 180, 186], 'Metal', { ...so, sh: 'Cylinder', min: 0.03 });
    rod('Pen', [cxn + 1.32, y + 0.04, czn - 0.5], [cxn + 1.42, y + 0.04, czn + 0.45], 0.07, [24, 40, 120], 'SmoothPlastic', { ...so, min: 0.03 });
  });
  // 탁상 달력: 삼각 받침 + 스프링 + 2026년 11월 한 달 날짜 (13일에 빨간 동그라미)
  grp('DeskCalendar', () => {
    const cxc = 27.0, czc = 188.85, t = 18 * Math.PI / 180, W = 1.6, Hc = 1.2;
    const Fc = { o: [cxc, DT, czc], X: [1, 0, 0], Y: [0, Math.cos(t), Math.sin(t)], Z: [0, -Math.sin(t), Math.cos(t)] };
    const tx = (text, color, font) => ({ face: 'Front', text, color, bgT: 1, lit: 1, font: font || 'GothamBold', pps: 220 });
    FB(Fc, 'CalBoard', -W / 2 - 0.04, 0, -0.02, W / 2 + 0.04, Hc + 0.04, 0.03, [58, 50, 44], 'Cardboard', { nc: true, min: 0.03 });
    FB(Fc, 'CalPage', -W / 2, 0.04, -0.04, W / 2, Hc, -0.02, [252, 252, 248], 'SmoothPlastic', { ...so, min: 0.015 });
    FB(Fc, 'CalHead', -W / 2, Hc - 0.26, -0.05, W / 2, Hc, -0.04, [188, 36, 40], 'SmoothPlastic', { ...so, min: 0.01, text: tx('2026년  11월', [255, 255, 255]) });
    const top = Hc - 0.3, rh = (top - 0.08) / 6, cw = (W - 0.1) / 7, days = ['일', '월', '화', '수', '목', '금', '토'];
    for (let d = 0; d < 7; d++) {
      const lines = [days[d]];
      for (let n = 1 + d; n <= 30; n += 7) lines.push(String(n));
      while (lines.length < 6) lines.push(' ');
      // 보는 사람(-Z 쪽)에게는 -X 가 오른쪽이라, 일요일 칸이 +X 끝에 온다
      FB(Fc, 'CalColumn', W / 2 - 0.05 - (d + 1) * cw, 0.08, -0.06, W / 2 - 0.05 - d * cw, top, -0.05, [252, 252, 248], 'SmoothPlastic',
        { ...so, t: 1, min: 0.01, text: tx(lines.join('\n'), d === 0 ? [200, 40, 40] : d === 6 ? [40, 80, 190] : [34, 34, 40]) });
    }
    FB(Fc, 'CalRule', -W / 2 + 0.05, top - rh - 0.005, -0.045, W / 2 - 0.05, top - rh + 0.005, -0.04, [150, 150, 150], 'SmoothPlastic', { ...so, min: 0.005 });
    // 13일(금): 금요일 칸 3번째 줄
    const cx13 = W / 2 - 0.05 - 5.5 * cw, cy13 = top - 2.5 * rh, nrm = vmul(Fc.Z, -1);
    disc('CalCircle', fpt(Fc, [cx13, cy13, -0.043]), nrm, rh * 1.25, 0.006, [214, 40, 40], 'SmoothPlastic', { ...so, min: 0.004 });
    disc('CalCircleIn', fpt(Fc, [cx13, cy13, -0.046]), nrm, rh * 1.02, 0.006, [252, 252, 248], 'SmoothPlastic', { ...so, min: 0.004 });
    for (let k = 0; k < 12; k++) Frod(Fc, 'CalRing', [-W / 2 + 0.14 + k * 0.12, Hc - 0.03, -0.07], [-W / 2 + 0.14 + k * 0.12, Hc + 0.09, 0.04], 0.03, [204, 206, 210], 'Metal', { ...so, min: 0.02 });
    P('CalBack', [W + 0.08, Hc + 0.04, 0.04], [cxc, DT + (Hc * Math.cos(t)) / 2, czc + Hc * Math.sin(t) + 0.2], [58, 50, 44], 'Cardboard', { nc: true, r: [-16, 0, 0], min: 0.03 });
    B('CalFoot', cxc - W / 2 - 0.04, DT, czc - 0.02, cxc + W / 2 + 0.04, DT + 0.03, czc + 0.75, [58, 50, 44], 'Cardboard', { ...so, min: 0.02 });
  });
  // 머그컵 (수첩 오른쪽, 컵받침 위)
  disc('Coaster', [28.5, DT + 0.045, 187.9], [0, 1, 0], 0.62, 0.03, [150, 110, 70], 'Wood', { ...so, min: 0.02 });
  cylV('Mug', 28.5, DT + 0.06, 187.9, 0.5, 0.42, [238, 236, 230], 'SmoothPlastic', { nc: true });
  cylV('Coffee', 28.5, DT + 0.5, 187.9, 0.03, 0.36, [60, 36, 22], 'SmoothPlastic', { ...so, min: 0.02 });
  B('MugHandle', 28.7, DT + 0.18, 187.86, 28.84, DT + 0.44, 187.94, [238, 236, 230], 'SmoothPlastic', so);
  // 탁상 스탠드 (전화기와 수첩 사이, 수첩을 비춤)
  grp('DeskLamp', () => {
    const b = [25.0, DT, 188.95], blk = [36, 36, 40];
    cylV('LampBase', b[0], DT, b[2], 0.08, 0.62, blk, 'Metal', so);
    const p1 = [b[0], DT + 1.25, b[2]], p2 = [b[0] + 0.25, DT + 1.75, b[2] - 0.35], p3 = [b[0] + 0.55, DT + 1.72, b[2] - 0.75], p4 = [b[0] + 0.72, DT + 1.45, b[2] - 0.98];
    rod('LampArm', [b[0], DT + 0.08, b[2]], p1, 0.07, blk, 'Metal', so); rod('LampArm', p1, p2, 0.07, blk, 'Metal', so); rod('LampArm', p2, p3, 0.07, blk, 'Metal', so);
    ball('LampJoint', ...p1, 0.11, blk, 'Metal', so); ball('LampJoint', ...p2, 0.11, blk, 'Metal', so);
    rod('LampShade', p3, p4, 0.5, blk, 'Metal', so);
    disc('LampGlow', vadd(p4, [0.01, -0.012, -0.012]), vnorm(vsub(p4, p3)), 0.42, 0.02, [255, 236, 196], 'Neon', { ...so, min: 0.015 });
    P('LampLight', [0.1, 0.1, 0.1], [p4[0] + 0.2, p4[1] - 0.1, p4[2] - 0.2], [255, 255, 255], 'SmoothPlastic', { t: 1, hidden: true, light: { type: 'Spot', face: 'Bottom', range: 6, angle: 70, brightness: 0.28, color: [255, 224, 176] } });
  });
  // 라디오, 무전기 충전대, 쓰레기통
  B('Radio', 36.0, DT, 188.2, 37.4, DT + 1.0, 189.2, [50, 50, 52], 'SmoothPlastic');
  B('RadioGrille', 36.1, DT + 0.15, 188.17, 36.9, DT + 0.85, 188.2, [26, 26, 28], 'Fabric', { ...so, min: 0.02 });
  P('RadioDial', [0.04, 0.2, 0.2], [37.15, DT + 0.6, 188.18], [190, 192, 196], 'Metal', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.03 });
  rod('RadioAntenna', [37.3, DT + 1.0, 189.0], [37.5, DT + 2.6, 189.2], 0.04, [190, 192, 196], 'Metal', { ...so, min: 0.02 });
  B('ChargerDock', 35.9, DT, 187.0, 36.8, DT + 0.25, 187.7, [28, 28, 30], 'SmoothPlastic', so);
  B('WalkieTalkie', 36.05, DT + 0.25, 187.15, 36.35, DT + 1.05, 187.4, [34, 34, 36], 'SmoothPlastic', so);
  rod('WalkieAntenna', [36.12, DT + 1.05, 187.28], [36.12, DT + 1.55, 187.28], 0.05, [20, 20, 20], 'Rubber', { ...so, min: 0.03 });
  P('ChargeLED', [0.04, 0.07, 0.07], [36.6, DT + 0.14, 186.99], [255, 60, 40], 'Neon', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.03 });
  cylV('TrashBin', 29.9, F, 188.2, 1.3, 1.0, [60, 64, 70], 'Plastic', { nc: true });
  // 사무용 의자 (바퀴 5개, 가스봉, 등받이)
  grp('OfficeChair', () => {
    const cx = 26.4, cz = 185.0, blk = [30, 30, 34];
    for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5; rod('ChairSpoke', [cx, F + 0.3, cz], [cx + Math.cos(a) * 1.0, F + 0.18, cz + Math.sin(a) * 1.0], 0.14, blk, 'SmoothPlastic', so); ball('Caster', cx + Math.cos(a) * 1.0, F + 0.11, cz + Math.sin(a) * 1.0, 0.22, [16, 16, 18], 'SmoothPlastic', so); }
    cylV('GasLift', cx, F + 0.3, cz, 1.2, 0.16, [150, 154, 160], 'Metal', so);
    cylV('LiftCover', cx, F + 0.3, cz, 0.6, 0.24, blk, 'SmoothPlastic', so);
    B('Seat', cx - 0.95, F + 1.5, cz - 0.95, cx + 0.95, F + 1.85, cz + 0.95, [40, 40, 46], 'Fabric');
    P('Back', [1.8, 2.3, 0.28], [cx, F + 3.35, cz - 1.0], [40, 40, 46], 'Fabric', { r: [-8, 0, 0] });
    rod('BackPost', [cx, F + 1.6, cz - 0.85], [cx, F + 2.6, cz - 1.05], 0.14, blk, 'SmoothPlastic', so);
    [-1, 1].forEach((s) => { rod('ArmPost', [cx + s * 0.95, F + 1.7, cz - 0.2], [cx + s * 1.05, F + 2.55, cz - 0.2], 0.1, blk, 'SmoothPlastic', so); B('ArmRest', cx + s * 1.05 - 0.14, F + 2.55, cz - 0.75, cx + s * 1.05 + 0.14, F + 2.68, cz + 0.4, blk, 'SmoothPlastic', so); });
  }, 'BoothChair');
  // ── 침대: 철제 틀 + 매트리스 + 베개 + 이불 ──
  grp('Bed', () => {
    const a = 34.5, b = 37.4, c0 = 179.4, c1 = 186.3, iron = [70, 74, 80];
    [[a, c0], [b - 0.14, c0], [a, c1 - 0.14], [b - 0.14, c1 - 0.14]].forEach(([x, z], i) => B('BedPost', x, F, z, x + 0.14, F + (i >= 2 ? 3.3 : 2.4), z + 0.14, iron, 'Metal', so));
    B('HeadRail', a, F + 3.16, c1 - 0.14, b, F + 3.3, c1, iron, 'Metal', so); B('HeadRail', a, F + 1.9, c1 - 0.12, b, F + 2.0, c1 - 0.02, iron, 'Metal', so);
    for (let k = 1; k < 6; k++) B('HeadBar', a + k * 0.47, F + 2.0, c1 - 0.1, a + k * 0.47 + 0.06, F + 3.16, c1 - 0.04, iron, 'Metal', so);
    B('FootRail', a, F + 2.28, c0, b, F + 2.4, c0 + 0.14, iron, 'Metal', so);
    for (let k = 1; k < 6; k++) B('FootBar', a + k * 0.47, F + 1.3, c0 + 0.04, a + k * 0.47 + 0.06, F + 2.28, c0 + 0.1, iron, 'Metal', so);
    B('BedFrame', a, F + 1.05, c0, b, F + 1.25, c1, iron, 'Metal');
    B('Mattress', a + 0.1, F + 1.25, c0 + 0.16, b - 0.06, F + 1.8, c1 - 0.16, [232, 228, 216], 'Fabric');
    B('MattressPiping', a + 0.08, F + 1.5, c0 + 0.14, b - 0.04, F + 1.54, c1 - 0.14, [196, 190, 174], 'Fabric', so);
    P('Pillow', [2.0, 0.42, 1.25], [(a + b) / 2 + 0.05, F + 2.02, c1 - 0.95], [244, 242, 236], 'Fabric', { nc: true, r: [5, 4, 0] });
    // 이불: 발치부터 가슴께까지 덮고 윗단을 접어 넘김, 방 쪽으로 늘어진 자락
    B('Blanket', a + 0.04, F + 1.8, c0 + 0.2, b - 0.06, F + 2.0, c1 - 2.4, [70, 92, 132], 'Fabric', so);
    B('BlanketFold', a + 0.04, F + 2.0, c1 - 3.3, b - 0.06, F + 2.12, c1 - 2.4, [226, 224, 214], 'Fabric', so);
    B('BlanketDrape', a - 0.04, F + 0.95, c0 + 0.35, a + 0.06, F + 1.95, c1 - 2.6, [64, 86, 126], 'Fabric', so);
    P('BlanketLump', [1.6, 0.3, 2.2], [(a + b) / 2 + 0.3, F + 2.05, c0 + 2.0], [74, 96, 136], 'Fabric', { nc: true, r: [0, 14, 4] });
    B('Slippers', a - 0.9, F + 0.05, c1 - 2.0, a - 0.5, F + 0.2, c1 - 1.1, [60, 60, 66], 'Rubber', so); B('Slippers', a - 1.4, F + 0.05, c1 - 1.9, a - 1.0, F + 0.2, c1 - 1.0, [60, 60, 66], 'Rubber', so);
  });
  wallClock([x1 - 0.5, F + 7.4, 181.3], [-1, 0, 0], [0, 1, 0], 1.3, { h: 9, m: 50, s: 20 });
  B('Notice', x1 - 0.54, F + 4.0, 180.4, x1 - 0.5, F + 6.3, 182.2, [250, 250, 244], 'SmoothPlastic', { ...so, min: 0.03,
    text: { face: 'Left', align: 'Left', text: '비상 연락망\n교감  내선 201\n행정실  내선 110\n119 · 112\n\n※ 야간에 걸려 오는\n   내선 404는 없는 번호', color: [30, 30, 40], bgT: 1, lit: 1, font: 'GothamBold', pps: 90 } });
  [180.6, 182.0].forEach((z) => P('NoticePin', [0.05, 0.09, 0.09], [x1 - 0.56, F + 6.2, z], [210, 40, 40], 'SmoothPlastic', { ...so, sh: 'Cylinder', min: 0.03 }));
  B('HookRail', x1 - 0.56, F + 6.2, 177.2, x1 - 0.5, F + 6.4, 179.0, [120, 92, 66], 'Wood', so);
  [177.5, 178.1, 178.7].forEach((z) => P('Hook', [0.2, 0.05, 0.05], [x1 - 0.62, F + 6.25, z], [176, 178, 182], 'Metal', { ...so, sh: 'Cylinder', min: 0.03 }));
  // ── 남쪽 벽(문 쪽): 열쇠함, 소화기, 스위치 ──
  grp('KeyBox', () => {
    B('KeyBoxBody', 28.95, F + 4.0, z0 + 0.5, 30.55, F + 6.4, z0 + 0.72, [196, 198, 202], 'Metal', { nc: true });
    B('KeyBoxGlass', 29.02, F + 4.07, z0 + 0.72, 30.48, F + 6.33, z0 + 0.74, [190, 206, 212], 'Glass', { ...so, t: 0.6, min: 0.015 });
    const names = ['정문', '본관', '체육관', '옥상', '방송실', '4층'];
    for (let i = 0; i < 6; i++) {
      const kx = 29.25 + (i % 3) * 0.5, ky = F + 5.75 - Math.floor(i / 3) * 1.05;
      P('KeyHook', [0.06, 0.04, 0.04], [kx, ky + 0.2, z0 + 0.6], [90, 92, 96], 'Metal', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.02 });
      if (i < 5) B('Key', kx - 0.05, ky - 0.2, z0 + 0.6, kx + 0.05, ky + 0.2, z0 + 0.63, [206, 176, 84], 'Metal', { ...so, min: 0.02 });
      B('KeyTag', kx - 0.2, ky - 0.5, z0 + 0.52, kx + 0.2, ky - 0.3, z0 + 0.54, [250, 250, 244], 'SmoothPlastic', { ...so, min: 0.015,
        text: { face: 'Back', text: names[i], color: i === 5 ? [180, 20, 20] : [30, 30, 40], bgT: 1, lit: 1, font: 'GothamBold', pps: 200 } });
    }
  });
  cylV('Extinguisher', 30.2, F + 0.05, 177.0, 1.7, 0.58, [196, 30, 32], 'Metal', { refl: 0.08 });
  cylV('ExtNeck', 30.2, F + 1.75, 177.0, 0.25, 0.28, [180, 180, 176], 'Metal', so);
  B('ExtHandle', 30.14, F + 2.0, 176.85, 30.26, F + 2.07, 177.3, [40, 40, 42], 'Metal', so);
  B('LightSwitch', 34.75, F + 4.0, z0 + 0.5, 35.15, F + 4.6, z0 + 0.55, [240, 240, 236], 'SmoothPlastic', so);
  B('Doormat', 31.2, F + 0.05, 176.7, 34.2, F + 0.1, 178.3, [84, 70, 56], 'Carpet', { ...so, min: 0.03 });
  // ── 서쪽: 난로, 낮은 캐비닛(전기 주전자·컵라면) ──
  grp('Heater', () => {
    B('HeaterBody', 22.7, F + 0.15, 180.0, 24.1, F + 2.3, 181.6, [222, 220, 212], 'Metal');
    B('HeaterFoot', 22.75, F, 180.1, 24.05, F + 0.15, 181.5, [60, 60, 64], 'Metal', so);
    B('HeaterGrille', 24.1, F + 0.5, 180.15, 24.14, F + 1.9, 181.45, [40, 40, 44], 'Metal', { ...so, min: 0.03 });
    for (let k = 0; k < 4; k++) B('HeaterGlow', 24.14, F + 0.65 + k * 0.32, 180.25, 24.17, F + 0.78 + k * 0.32, 181.35, [255, 110, 40], 'Neon', { ...so, min: 0.02,
      light: k === 1 ? { type: 'Point', range: 7, brightness: 0.7, color: [255, 120, 50] } : undefined });
    B('HeaterTop', 22.72, F + 2.3, 180.02, 24.08, F + 2.36, 181.58, [190, 188, 180], 'Metal', so);
  });
  B('Cabinet', 22.6, F, 176.6, 24.6, F + 3.0, 178.2, [150, 154, 160], 'Metal');
  B('CabinetSeam', 24.6, F + 0.15, 177.38, 24.62, F + 2.85, 177.42, [96, 100, 106], 'Metal', { ...so, min: 0.02 });
  [177.2, 177.6].forEach((z) => B('CabinetPull', 24.6, F + 1.4, z - 0.03, 24.68, F + 1.9, z + 0.03, [80, 82, 86], 'Metal', so));
  cylV('Kettle', 23.2, F + 3.0, 177.1, 0.75, 0.6, [206, 208, 212], 'Metal', { nc: true, refl: 0.2 });
  B('KettleHandle', 23.5, F + 3.15, 177.04, 23.68, F + 3.7, 177.16, [30, 30, 32], 'SmoothPlastic', so);
  cylV('CupNoodle', 24.0, F + 3.0, 177.6, 0.42, 0.4, [226, 60, 50], 'SmoothPlastic', so);
  cylV('CupNoodle', 23.4, F + 3.0, 177.8, 0.42, 0.4, [240, 196, 60], 'SmoothPlastic', so);
  waterPurifier(36.3, F + 0.05, z0 + 0.5);
  // 옷걸이의 경비 점퍼
  B('Jacket', x1 - 0.85, F + 3.9, 177.25, x1 - 0.6, F + 6.25, 178.0, [36, 46, 74], 'Fabric', so);
  B('JacketStripe', x1 - 0.86, F + 5.3, 177.25, x1 - 0.85, F + 5.45, 178.0, [214, 220, 90], 'Neon', { ...so, min: 0.01 });
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
SHIFT = null;
grp('Grounds', () => {
  const PZ = 92 - GD; // 주차장 북쪽 끝
  B('Driveway', -12, 0, -116, 12, 0.2, GZ - 2.8, C.asphalt, 'Asphalt');
  B('Curb', -12.7, 0, -116, -12, 0.55, GZ - 3, C.curb, 'Concrete');
  B('Curb', 12, 0, -116, 12.7, 0.55, PZ, C.curb, 'Concrete');
  B('Curb', 12, 0, PZ + 84, 12.7, 0.55, GZ - 3, C.curb, 'Concrete');
  for (let z = -108; z < GZ - 8; z += 10) B('DashLine', -0.18, 0.2, z, 0.18, 0.23, z + 5, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
  B('SlowText', -6, 0.2, GZ - 50, 6, 0.24, GZ - 40, [220, 220, 216], 'SmoothPlastic', { t: 1, nc: true, ns: true, text: { face: 'Top', text: '천 천 히', color: [225, 225, 220], bgT: 1, lit: 1 } });
  B('SpeedBump', -12, 0.2, GZ - 32, 12, 0.5, GZ - 30, [220, 190, 40], 'Rubber');
  B('Parking', 12, 0, PZ, 108, 0.2, PZ + 84, [62, 63, 66], 'Asphalt');
  for (let i = 0; i < 10; i++) {
    const x = 18 + i * 9;
    B('ParkLine', x, 0.2, PZ + 4, x + 0.3, 0.23, PZ + 22, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
    B('ParkLine', x, 0.2, PZ + 62, x + 0.3, 0.23, PZ + 80, [220, 220, 216], 'SmoothPlastic', { nc: true, ns: true });
  }
  car('TeacherCar1', 31.6, PZ + 14, 180, [118, 18, 26], { plate: '12가 3456' });
  car('TeacherCar2', 67.6, PZ + 14, 180, [220, 220, 224], { plate: '48라 9012' });
  car('SchoolVan', 85.6, PZ + 71, 0, [42, 46, 52], { plate: '77바 1004' });
  const cx = -113, cz = 2;
  [[70, 88], [64.5, 82.5], [59, 77]].forEach(([a, b]) => {
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
  [[cz - 64, 1], [cz + 64, -1]].forEach(([z, dir]) => grp('SoccerGoal', () => {
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
      const z = -44 + i * 6;
      cylV('Post', -206, 0, z, 7 - i, 0.35, [150, 60, 50], 'Metal');
      cylV('Post', -206, 0, z + 5, 7 - i, 0.35, [150, 60, 50], 'Metal');
      P('Bar', [5, 0.22, 0.22], [-206, 6.8 - i, z + 2.5], [190, 190, 194], 'Metal', { sh: 'Cylinder', r: [0, 90, 0] });
    });
  });
  [[-202, -94], [-202, GZ - 12], [-30, -94], [-30, GZ - 12]].forEach(([x, z]) => grp('FloodLight', () => {
    cylV('Tower', x, 0, z, 48, 1.2, [150, 152, 156], 'Metal');
    B('Frame', x - 3.5, 46, z - 0.6, x + 3.5, 51.5, z + 0.6, [70, 72, 76], 'Metal');
    for (let i = 0; i < 6; i++) B('Lamp', x - 3.2 + (i % 3) * 2.2, 46.4 + Math.floor(i / 3) * 2.6, z - 0.75, x - 1.4 + (i % 3) * 2.2, 48.6 + Math.floor(i / 3) * 2.6, z - 0.6, [200, 200, 196], 'Glass', { nc: true, ns: true, tag: 'FieldLight' });
  }));
  // ── 농구장 (실제 규격 비율: 28 × 15 m) ──
  grp('BasketballCourt', () => {
    const X0 = 114, X1 = 198, Z0 = -14.5, Z1 = 30.5, CZ = (Z0 + Z1) / 2, Y = 0.2;
    B('Apron', 108, 0, -22, 204, Y - 0.02, 38, [70, 92, 84], 'Rubber');
    B('Court', X0, 0, Z0, X1, Y, Z1, [52, 112, 92], 'Rubber');
    const line = (a, b, w = 0.17) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      P('CourtLine', [len + w, 0.03, w], [(a[0] + b[0]) / 2, Y + 0.015, (a[1] + b[1]) / 2], [236, 236, 230], 'SmoothPlastic', { r: [0, -Math.atan2(dz, dx) * 180 / Math.PI, 0], nc: true, ns: true });
    };
    const arc = (cx, cz, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; line([cx + r * Math.cos(t0), cz + r * Math.sin(t0)], [cx + r * Math.cos(t1), cz + r * Math.sin(t1)]); } };
    line([X0, Z0], [X1, Z0]); line([X0, Z1], [X1, Z1]); line([X0, Z0], [X0, Z1]); line([X1, Z0], [X1, Z1]);
    line([(X0 + X1) / 2, Z0], [(X0 + X1) / 2, Z1]);
    arc((X0 + X1) / 2, CZ, 6, 0, Math.PI * 2, 28);
    [[X0, 1], [X1, -1]].forEach(([bx, dir]) => {
      const hx = bx + dir * 5.2; // 림 중심
      // 페인트 존(제한구역)
      const kx0 = Math.min(bx, bx + dir * 19), kx1 = Math.max(bx, bx + dir * 19);
      B('Key', kx0, Y, CZ - 8, kx1, Y + 0.01, CZ + 8, [150, 64, 52], 'Rubber', { nc: true, ns: true });
      line([bx, CZ - 8], [bx + dir * 19, CZ - 8]); line([bx, CZ + 8], [bx + dir * 19, CZ + 8]); line([bx + dir * 19, CZ - 8], [bx + dir * 19, CZ + 8]);
      arc(bx + dir * 19, CZ, 6, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5, 14);
      // 3점 라인: 직선 + 호
      const rr = 22.1, side = 19.6, ang = Math.asin(side / rr), ex = hx + dir * Math.cos(ang) * rr;
      line([bx, CZ - side], [ex, CZ - side]); line([bx, CZ + side], [ex, CZ + side]);
      arc(hx, CZ, rr, dir > 0 ? -ang : Math.PI - ang, dir > 0 ? ang : Math.PI + ang, 30);
      // 골대: 기둥(패드) + 팔 + 백보드 + 림 + 그물
      grp('Hoop', () => {
        const px = bx - dir * 4.2, bbx = bx + dir * 4.0, rimY = 10.2;
        B('Pole', px - 0.3, 0, CZ - 0.3, px + 0.3, 12.6, CZ + 0.3, [52, 56, 62], 'Metal');
        B('Pad', px - 0.55, 0.2, CZ - 0.55, px + 0.55, 6.4, CZ + 0.55, [30, 70, 150], 'Fabric');
        B('Arm', Math.min(px, bbx - dir * 0.3), 11.9, CZ - 0.2, Math.max(px, bbx - dir * 0.3), 12.4, CZ + 0.2, [52, 56, 62], 'Metal');
        cylBetween('Brace', [px, 8.4, CZ], [bbx - dir * 0.4, 11.9, CZ], 0.3, [52, 56, 62], 'Metal');
        B('Backboard', bbx - 0.08, rimY - 0.5, CZ - 3.0, bbx + 0.08, rimY + 3.0, CZ + 3.0, [236, 238, 240], 'SmoothPlastic', { refl: 0.05 });
        const fr = (z0, z1, y0, y1) => B('BoardEdge', bbx + dir * 0.09 - 0.02, y0, z0, bbx + dir * 0.09 + 0.02, y1, z1, [20, 20, 22], 'SmoothPlastic', { nc: true, ns: true });
        fr(CZ - 3.0, CZ + 3.0, rimY + 2.85, rimY + 3.0); fr(CZ - 3.0, CZ + 3.0, rimY - 0.5, rimY - 0.35); fr(CZ - 3.0, CZ - 2.85, rimY - 0.5, rimY + 3.0); fr(CZ + 2.85, CZ + 3.0, rimY - 0.5, rimY + 3.0);
        fr(CZ - 0.98, CZ + 0.98, rimY + 1.42, rimY + 1.52); fr(CZ - 0.98, CZ + 0.98, rimY + 0.05, rimY + 0.15); fr(CZ - 0.98, CZ - 0.88, rimY + 0.05, rimY + 1.52); fr(CZ + 0.88, CZ + 0.98, rimY + 0.05, rimY + 1.52);
        B('RimBracket', Math.min(bbx, hx - dir * 0.75), rimY - 0.12, CZ - 0.25, Math.max(bbx, hx - dir * 0.75), rimY + 0.05, CZ + 0.25, [220, 90, 30], 'Metal', { nc: true });
        const N = 16, R = 0.75;
        for (let i = 0; i < N; i++) {
          const t0 = i / N * Math.PI * 2, t1 = (i + 1) / N * Math.PI * 2;
          cylBetween('Rim', [hx + R * Math.cos(t0), rimY, CZ + R * Math.sin(t0)], [hx + R * Math.cos(t1), rimY, CZ + R * Math.sin(t1)], 0.07, [224, 92, 30], 'Metal', { nc: true, ns: true });
          // 그물: 위 림에서 아래 작은 고리로, 엇갈리게
          const b0 = i / N * Math.PI * 2 + Math.PI / N, rb = 0.45, yb = rimY - 1.35;
          cylBetween('Net', [hx + R * Math.cos(t0), rimY - 0.04, CZ + R * Math.sin(t0)], [hx + rb * Math.cos(b0), yb, CZ + rb * Math.sin(b0)], 0.025, [236, 236, 236], 'Fabric', { nc: true, ns: true });
          cylBetween('Net', [hx + R * Math.cos(t1), rimY - 0.04, CZ + R * Math.sin(t1)], [hx + rb * Math.cos(b0), yb, CZ + rb * Math.sin(b0)], 0.025, [236, 236, 236], 'Fabric', { nc: true, ns: true });
          const b1 = b0 + Math.PI * 2 / N;
          cylBetween('NetRing', [hx + rb * Math.cos(b0), yb, CZ + rb * Math.sin(b0)], [hx + rb * Math.cos(b1), yb, CZ + rb * Math.sin(b1)], 0.025, [236, 236, 236], 'Fabric', { nc: true, ns: true });
        }
        P('SwapAnchor', [0.2, 0.2, 0.2], [bx, 0, CZ], [0, 255, 0], 'SmoothPlastic', { r: [0, dir > 0 ? 0 : 180, 0], t: 1, nc: true, hidden: true, tag: 'SwapAnchor', attr: { Template: 'Hoop' } });
      });
    });
    // 철망 울타리 (높이 12, 서쪽에 출입구)
    const fz0 = -22, fz1 = 38, fx0 = 108, fx1 = 204, FH2 = 12, green = [46, 84, 64];
    const fenceSide = (a, b, fixed, along) => {
      const len = b - a;
      for (let t = 0; t <= len + 0.01; t += 9.6) {
        const u = a + Math.min(t, len);
        const pos = along === 'x' ? [u, FH2 / 2, fixed] : [fixed, FH2 / 2, u];
        P('FencePost', [0.3, FH2, 0.3], pos, green, 'Metal');
      }
      [0.4, 6, FH2].forEach((y) => {
        const c = (a + b) / 2;
        P('FenceRail', along === 'x' ? [len, 0.16, 0.16] : [0.16, 0.16, len], along === 'x' ? [c, y, fixed] : [fixed, y, c], green, 'Metal', { nc: y > 1 });
      });
      for (let u = a + 0.9; u < b; u += 0.9) P('FenceWire', [0.05, FH2 - 0.4, 0.05], along === 'x' ? [u, FH2 / 2 + 0.1, fixed] : [fixed, FH2 / 2 + 0.1, u], green, 'Metal', { nc: true, ns: true });
      for (let y = 1.6; y < FH2; y += 1.6) P('FenceWire', along === 'x' ? [len, 0.04, 0.04] : [0.04, 0.04, len], along === 'x' ? [(a + b) / 2, y, fixed] : [fixed, y, (a + b) / 2], green, 'Metal', { nc: true, ns: true });
    };
    fenceSide(fx0, fx1, fz0, 'x');
    fenceSide(fx0, fx1, fz1, 'x');
    fenceSide(fz0, 2, fx0, 'z');
    fenceSide(12, fz1, fx0, 'z');
    fenceSide(fz0, fz1, fx1, 'z');
    // 벤치
    [[160, 34.5], [140, 34.5]].forEach(([x, z]) => {
      B('BenchSeat', x - 4, 1.5, z - 0.8, x + 4, 1.75, z + 0.8, [150, 110, 70], 'WoodPlanks');
      B('BenchLeg', x - 3.6, 0.2, z - 0.7, x - 3.2, 1.5, z + 0.7, [60, 62, 66], 'Metal');
      B('BenchLeg', x + 3.2, 0.2, z - 0.7, x + 3.6, 1.5, z + 0.7, [60, 62, 66], 'Metal');
    });
  });
  for (let z = -80; z <= GZ - 20; z += 22) tree(-212, z + 6, 'ginkgo', 26 + rnd() * 6);
  for (let x = -200; x <= -40; x += 20) tree(x, GZ - 8, 'ginkgo', 24 + rnd() * 6);
  for (let x = 46; x <= 210; x += 20) tree(x, GZ - 8, x % 40 === 6 ? 'pine' : 'zelkova', 24 + rnd() * 6);
  for (let z = -10; z <= GZ - 24; z += 20) tree(212, z, z % 40 === 10 ? 'pine' : 'ginkgo', 26 + rnd() * 6);
  for (let x = -200; x <= 200; x += 20) tree(x, -190, rnd() < 0.5 ? 'pine' : 'zelkova', 28 + rnd() * 6);
  for (let z = -90; z <= GZ - 40; z += 26) tree(-20, z, 'ginkgo', 22 + rnd() * 4);
  for (let z = -90; z <= PZ - 6; z += 26) tree(20, z, 'ginkgo', 22 + rnd() * 4);
  // 본관 앞 동쪽 쉼터 (자전거 보관대와 주차장 사이)
  [[46, -62], [78, -50], [62, -30], [94, -34]].forEach(([x, z]) => tree(x, z, 'zelkova', 26));
  [[46, -76], [70, -40], [90, -20]].forEach(([x, z]) => grp('Bench', () => {
    B('Seat', x - 3, 1.6, z - 0.8, x + 3, 1.85, z + 0.8, [150, 110, 70], 'WoodPlanks');
    B('Back', x - 3, 2.1, z + 0.7, x + 3, 3.6, z + 0.9, [150, 110, 70], 'WoodPlanks');
    B('Leg', x - 2.6, 0, z - 0.7, x - 2.3, 2.1, z + 0.8, [60, 60, 64], 'Metal');
    B('Leg', x + 2.3, 0, z - 0.7, x + 2.6, 2.1, z + 0.8, [60, 60, 64], 'Metal');
  }));
  [[-17, 60], [-17, 10], [-17, -45], [-17, -100]].forEach(([x, z], i) => streetLight(x, z, 90, { h: 16, range: 36, flicker: i === 1 }));
  [[16, PZ + 28], [60, PZ + 86], [104, PZ + 38]].forEach(([x, z]) => streetLight(x, z, -90, { h: 16, range: 36 }));
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
// 중앙 계단실(CS): 복도 북쪽, 반폭 W. 학생용 계단실(TS): 건물 양 끝, 복도 끝에서 이어짐. RD: 옥상 문 자리
const CS = { W: 8.5, R: 12, LD: 6 };
const TS = { W: 4.6, R: 12, LD: 5, z0: -170.9, z1: -164.1 };
const RD = { z0: -167, z1: -163 };
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
// 방마다 복도 쪽 문 자리 [x0, x1]. 화장실은 남자(서쪽 반)·여자(동쪽 반) 문이 따로 있다
const WC_DOOR = 3.3;
const roomDoors = (r) => (r.name === '화장실' ? [[r.xa + 2, r.xa + 2 + WC_DOOR], [r.xa + 17, r.xa + 17 + WC_DOOR]] : [[r.xa + 1.8, r.xa + 6.8], [r.xb - 6.8, r.xb - 1.8]]);

// ═════════════ 2010년 무렵 한국 고등학교 교실 ═════════════
// 바라보는 쪽 기준: 학생은 -X(칠판)를 본다. 학생 오른쪽 = -Z(복도), 왼쪽 = +Z(창문)

// 학생 책상 (1인용): 무늬목 상판 + 갈색 테두리 + 회색 철제 다리 + 책 받침. 기준점: 책상 가운데 바닥
function studentDesk(F, side = 1) {
  const steel = [166, 170, 176], top = 2.45;
  FB(F, 'DeskTop', -0.77, top + 0.02, -1.14, 0.77, top + 0.12, 1.14, [214, 190, 150], 'Wood');
  FB(F, 'DeskBand', -0.79, top, -1.16, 0.79, top + 0.1, 1.16, [98, 76, 56], 'SmoothPlastic', { nc: true, ns: true });
  [[-0.66, -1.04], [0.62, -1.04], [-0.66, 1.04], [0.62, 1.04]].forEach(([x, z]) => FB(F, 'DeskLeg', x - 0.045, 0, z - 0.045, x + 0.045, top, z + 0.045, steel, 'Metal', { nc: true }));
  [-1.04, 1.04].forEach((z) => FB(F, 'DeskRail', -0.66, 0.3, z - 0.035, 0.62, 0.38, z + 0.035, steel, 'Metal', { nc: true, ns: true }));
  FB(F, 'DeskRail', -0.7, 0.85, -1.0, -0.62, 0.93, 1.0, steel, 'Metal', { nc: true, ns: true });
  FB(F, 'BookRack', -0.62, top - 0.55, -1.0, 0.56, top - 0.52, 1.0, [150, 154, 160], 'Metal', { nc: true, min: 0.03 });
  FB(F, 'RackFront', -0.66, top - 0.55, -1.0, -0.62, top - 0.04, 1.0, [150, 154, 160], 'Metal', { nc: true, ns: true, min: 0.03 });
  FB(F, 'BagHook', 0.25, top - 0.25, side > 0 ? 1.16 : -1.24, 0.33, top - 0.05, side > 0 ? 1.24 : -1.16, [60, 60, 64], 'Metal', { nc: true, ns: true });
}
// 학생 의자: 철 파이프 + 합판 좌판·등판. 기준점: 좌판 가운데 바닥, 등받이는 +X
function studentChair(F) {
  const steel = [150, 154, 160], ply = [192, 154, 106], sy = 1.5;
  const t = 8 * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  FB(F, 'Seat', -0.68, sy, -0.69, 0.68, sy + 0.09, 0.69, ply, 'Wood');
  FP(F, 'Backrest', [0.08, 0.7, 1.3], [0.66 + 1.0 * s, sy + 1.08, 0], ply, 'Wood', { axes: [[c, -s, 0], [s, c, 0], [0, 0, 1]] });
  [-0.6, 0.6].forEach((z) => {
    Frod(F, 'ChairLeg', [-0.58, 0, z], [-0.58, sy, z], 0.085, steel, 'Metal', { nc: true });
    Frod(F, 'ChairLeg', [0.6, 0, z], [0.6 + 1.5 * s, sy + 1.42, z * 0.97], 0.08, steel, 'Metal', { nc: true });
    Frod(F, 'ChairRail', [-0.58, 0.5, z], [0.6 + 0.04, 0.5, z], 0.06, steel, 'Metal', { nc: true, ns: true });
  });
  Frod(F, 'ChairRail', [-0.58, 0.5, -0.6], [-0.58, 0.5, 0.6], 0.06, steel, 'Metal', { nc: true, ns: true });
}
function deskSet(dx, dz, L, gname, o = {}) {
  grp(gname, () => {
    const yaw = (rnd() - 0.5) * 3.5;
    const Fd = yawFrame([dx, L, dz], yaw);
    const sd = o.side || 1;
    grp('Desk', () => { studentDesk(Fd, sd); swapAnchor(Fd, 'StudentDesk'); });
    const Fc = yawFrame(fpt(Fd, [1.75 + rnd() * 0.3, 0, (rnd() - 0.5) * 0.4]), yaw + (rnd() - 0.5) * 10);
    grp('Chair', () => { studentChair(Fc); swapAnchor(Fc, 'StudentChair'); });
    const top = 2.57;
    if (rnd() < 0.2) FB(Fd, 'Bag', 0.02, 1.0, sd > 0 ? 1.18 : -1.52, 0.62, 2.3, sd > 0 ? 1.52 : -1.18, pick([[34, 40, 70], [110, 30, 36], [36, 36, 36], [70, 90, 70], [150, 120, 90]]), 'Fabric', { nc: true });
    if (rnd() < 0.35) FB(Fd, 'RackBooks', -0.55, top - 0.62, -0.85 + rnd() * 0.3, 0.2, top - 0.3, 0.2 + rnd() * 0.6, pick([[176, 72, 64], [70, 92, 150], [214, 196, 120], [228, 226, 218], [96, 136, 96]]), 'SmoothPlastic', { nc: true, ns: true });
    if (rnd() < 0.12) FB(yawFrame(fpt(Fd, [0, top, -0.1]), yaw + rnd() * 30 - 15), 'Book', -0.42, 0, -0.55, 0.42, 0.1, 0.55, pick([[200, 60, 60], [60, 90, 200], [240, 220, 120], [240, 240, 236]]), 'SmoothPlastic', { nc: true });
    if (rnd() < 0.08) FB(Fc, 'Jacket', 0.72, 1.75, -0.66, 0.92, 2.95, 0.66, pick([[30, 34, 60], [60, 60, 66]]), 'Fabric', { nc: true });
  }, 'DeskSet');
}

// 칠판: 녹색 칠판 + 알루미늄 테두리 + 분필 받침
const BOARD_R = [0, 0, -1], BOARD_U = [0, 1, 0], BOARD_N = [1, 0, 0];
function chalkWrite(id, boardCenter, u, v, width, o = {}) {
  const sc = width / STROKES[id].w;
  return atlasText(id, vadd(vadd(boardCenter, vmul(BOARD_R, u)), vmul(BOARD_U, v)), BOARD_R, BOARD_U, BOARD_N, width, o);
}
function blackboard(xa, L, zc, roomIdx, writing) {
  const al = [192, 194, 196], al2 = [168, 170, 172];
  B('BoardFrame', xa, L + 2.95, zc - 7.3, xa + 0.22, L + 8.3, zc + 7.3, al2, 'Metal');
  B('Blackboard', xa + 0.22, L + 3.1, zc - 7.0, xa + 0.32, L + 8.1, zc + 7.0, C.board, 'Slate', { tag: 'Blackboard' });
  B('BoardTrim', xa + 0.22, L + 8.1, zc - 7.3, xa + 0.4, L + 8.3, zc + 7.3, al, 'Metal', { nc: true, ns: true });
  B('BoardTrim', xa + 0.22, L + 3.1, zc - 7.3, xa + 0.4, L + 8.1, zc - 7.0, al, 'Metal', { nc: true, ns: true });
  B('BoardTrim', xa + 0.22, L + 3.1, zc + 7.0, xa + 0.4, L + 8.1, zc + 7.3, al, 'Metal', { nc: true, ns: true });
  const bc = [xa + 0.32, L + 5.6, zc];
  // 오른쪽 날짜·주번 칸을 나누는 인쇄된 선
  P('BoardLine', [0.01, 4.8, 0.035], [xa + 0.325, L + 5.6, zc - 2.15], [196, 214, 200], 'SmoothPlastic', { nc: true, ns: true, t: 0.35, min: 0.008 });
  if (writing) grp('Chalk', () => {
    chalkWrite('date', bc, 4.6, 1.85, 3.8);
    chalkWrite(['duty1', 'duty2', 'duty3'][roomIdx % 3], bc, 4.3, 1.05, 4.4);
    chalkWrite(['note1', 'note2', 'note3', 'note4', 'note5'][roomIdx % 5], bc, -3.9, 1.8, 4.8);
    if (roomIdx % 4 === 1) chalkWrite('self', bc, -1.2, -0.4, 2.6);
    for (let k = 0; k < 3; k++) {
      const u = (rnd() - 0.5) * 12, v = (rnd() - 0.5) * 3;
      P('ChalkDust', [0.01, 0.6 + rnd() * 1.4, 2 + rnd() * 4], vadd(vadd(vadd(bc, vmul(BOARD_R, u * 0.85)), vmul(BOARD_U, v)), [0.01, 0, 0]), [120, 140, 126], 'SmoothPlastic', { t: 0.9, nc: true, ns: true });
    }
  }, 'BoardChalk');
  // 분필 받침 (알루미늄 홈통)
  B('ChalkTray', xa + 0.22, L + 2.88, zc - 7.3, xa + 0.8, L + 2.98, zc + 7.3, al, 'Metal', { nc: true });
  B('TrayLip', xa + 0.74, L + 2.98, zc - 7.3, xa + 0.8, L + 3.12, zc + 7.3, al, 'Metal', { nc: true, ns: true });
  for (let i = 0; i < 5; i++) {
    const z = zc - 5.2 + i * 0.55 + rnd() * 0.2;
    rod('ChalkStick', [xa + 0.45, L + 3.03, z], [xa + 0.45 + 0.05, L + 3.03, z + 0.32 + rnd() * 0.12], 0.07, pick([C.white, C.white, [240, 200, 200], [200, 220, 250], [250, 240, 160]]), 'SmoothPlastic', { nc: true, ns: true, min: 0.03 });
  }
  B('Eraser', xa + 0.3, L + 2.98, zc + 3, xa + 0.68, L + 3.12, zc + 3.85, [40, 40, 52], 'Fabric', { nc: true, ns: true });
  B('EraserTop', xa + 0.32, L + 3.12, zc + 3.02, xa + 0.66, L + 3.24, zc + 3.83, [150, 110, 70], 'Wood', { nc: true, ns: true });
  rod('Pointer', [xa + 0.5, L + 3.03, zc - 6.6], [xa + 0.52, L + 3.03, zc - 2.6], 0.06, [206, 208, 212], 'Metal', { nc: true, ns: true, refl: 0.2, min: 0.03 });
  // 자석
  [[1.2, 2.1], [-5.5, -1.6], [6.1, -0.4]].forEach(([u, v], i) => disc('Magnet', vadd(vadd(vadd(bc, vmul(BOARD_R, u)), vmul(BOARD_U, v)), [0.03, 0, 0]), BOARD_N, 0.26, 0.06, [[220, 60, 50], [60, 110, 210], [240, 200, 40]][i], 'SmoothPlastic', { nc: true, ns: true }));
}

// 태극기 액자 (가로:세로 = 3:2, 태극 지름 = 세로의 1/2). R_ 오른쪽, U_ 위, N_ 벽에서 나오는 쪽
function taegeukgi(c, R_, U_, N_, H) {
  const W = H * 1.5, D = H / 2, r = D / 2;
  const F = { o: c, X: R_, Y: U_, Z: N_ };
  grp('Taegeukgi', () => {
    FB(F, 'FlagFrame', -W / 2 - 0.15, -H / 2 - 0.15, 0, W / 2 + 0.15, H / 2 + 0.15, 0.1, [84, 56, 30], 'Wood', { nc: true });
    FB(F, 'FlagGilt', -W / 2 - 0.05, -H / 2 - 0.05, 0.1, W / 2 + 0.05, H / 2 + 0.05, 0.112, [178, 146, 80], 'Metal', { nc: true, ns: true, min: 0.01 });
    FB(F, 'FlagField', -W / 2, -H / 2, 0.112, W / 2, H / 2, 0.124, [247, 247, 243], 'SmoothPlastic', { nc: true, ns: true, min: 0.01 });
    const red = [205, 46, 58], blue = [0, 71, 160], black = [20, 20, 20];
    const q = Math.sqrt(13);
    const A = vnorm(vadd(vmul(R_, 3 / q), vmul(U_, -2 / q))); // 건(왼쪽 위) → 곤(오른쪽 아래)
    const Nn = vnorm(vadd(vmul(R_, 2 / q), vmul(U_, 3 / q))); // 위(빨강) 쪽
    const lay = (k) => vadd(c, vmul(N_, 0.124 + 0.006 * k - 0.004));
    const o = { nc: true, ns: true, min: 0.004 };
    disc('Taegeuk', lay(1), N_, D, 0.008, blue, 'SmoothPlastic', o);
    semiDisc('Taegeuk', lay(2), A, Nn, r, 0.008, red, 'SmoothPlastic', o);
    disc('Taegeuk', vadd(lay(3), vmul(A, -r / 2)), N_, r, 0.008, red, 'SmoothPlastic', o);
    disc('Taegeuk', vadd(lay(3), vmul(A, r / 2)), N_, r, 0.008, blue, 'SmoothPlastic', o);
    // 4괘: 건 ☰ 왼쪽 위, 곤 ☷ 오른쪽 아래, 감 ☵ 오른쪽 위, 리 ☲ 왼쪽 아래
    const bar = D / 12, gap = D / 24, len = D / 2;
    [[[-3, 2], [1, 1, 1]], [[3, -2], [0, 0, 0]], [[3, 2], [0, 1, 0]], [[-3, -2], [1, 0, 1]]].forEach(([dir, lines]) => {
      const d = vnorm(vadd(vmul(R_, dir[0]), vmul(U_, dir[1])));
      const p = vcross(d, N_);
      lines.forEach((solid, i) => {
        const m = vadd(lay(1), vmul(d, r + D / 4 + bar / 2 + i * (bar + gap)));
        const rot = eulerFromBasis(p, d, N_);
        if (solid) P('Gwae', [len, bar, 0.008], m, black, 'SmoothPlastic', { ...o, r: rot });
        else [-1, 1].forEach((s) => P('Gwae', [(len - gap) / 2, bar, 0.008], vadd(m, vmul(p, s * (len + gap) / 4)), black, 'SmoothPlastic', { ...o, r: rot }));
      });
    });
  });
}

// 급훈 액자: 한지 + 붓글씨 + 낙관
function mottoFrame(c, R_, U_, N_) {
  const F = { o: c, X: R_, Y: U_, Z: N_ };
  const W = 4.3, H = 1.25;
  grp('Motto', () => {
    FB(F, 'MottoFrame', -W / 2 - 0.14, -H / 2 - 0.14, 0, W / 2 + 0.14, H / 2 + 0.14, 0.1, [86, 58, 34], 'Wood', { nc: true, tag: 'Motto' });
    FB(F, 'MottoGilt', -W / 2 - 0.04, -H / 2 - 0.04, 0.1, W / 2 + 0.04, H / 2 + 0.04, 0.11, [176, 146, 84], 'Metal', { nc: true, ns: true, min: 0.01 });
    FB(F, 'MottoPaper', -W / 2, -H / 2, 0.11, W / 2, H / 2, 0.122, [234, 228, 208], 'SmoothPlastic', { nc: true, ns: true, min: 0.01 });
    atlasText('motto', fpt(F, [0.22, -0.14, 0.11]), R_, U_, N_, 3.5);
    atlasText('mottoTitle', fpt(F, [-W / 2 + 0.4, H / 2 - 0.26, 0.11]), R_, U_, N_, 0.55);
    FB(F, 'Seal', W / 2 - 0.45, -H / 2 + 0.14, 0.122, W / 2 - 0.25, -H / 2 + 0.34, 0.128, [178, 32, 30], 'SmoothPlastic', { nc: true, ns: true, min: 0.004 });
  });
}

// 벽시계 (지름 dia). 바늘: h시 m분 s초
function wallClock(c, N_, U_, dia, o = {}) {
  const R_ = vcross(U_, N_);
  const F = { o: c, X: R_, Y: U_, Z: N_ };
  grp('WallClock', () => {
    disc('ClockRim', fpt(F, [0, 0, 0.09]), N_, dia, 0.18, [34, 34, 36], 'SmoothPlastic', { tag: o.tag, nc: true });
    disc('ClockFace', fpt(F, [0, 0, 0.18]), N_, dia - 0.12, 0.012, [246, 246, 240], 'SmoothPlastic', { nc: true, ns: true, min: 0.008 });
    const at = (ang, rad, dz) => vadd(fpt(F, [0, 0, dz]), vadd(vmul(R_, Math.sin(ang) * rad), vmul(U_, Math.cos(ang) * rad)));
    const radial = (ang) => vadd(vmul(R_, Math.sin(ang)), vmul(U_, Math.cos(ang)));
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6, big = k % 3 === 0, d = radial(a);
      P('Tick', [big ? 0.045 : 0.024, big ? 0.13 : 0.08, 0.01], at(a, dia / 2 - 0.15, 0.191), [24, 24, 24], 'SmoothPlastic', { nc: true, ns: true, min: 0.008, r: eulerFromBasis(vcross(d, N_), d, N_) });
    }
    const hand = (ang, len, w, col, k) => {
      const d = radial(ang);
      P('Hand', [w, len, 0.012], vadd(fpt(F, [0, 0, 0.2 + 0.014 * k]), vmul(d, len / 2 - 0.06)), col, 'SmoothPlastic', { nc: true, ns: true, min: 0.008, r: eulerFromBasis(vcross(d, N_), d, N_) });
    };
    const h = o.h ?? 10, m = o.m ?? 2, s = o.s ?? 37;
    hand(((h % 12) + m / 60) * Math.PI / 6, dia * 0.27, 0.06, [24, 24, 24], 0);
    hand((m + s / 60) * Math.PI / 30, dia * 0.38, 0.042, [24, 24, 24], 1);
    hand(s * Math.PI / 30, dia * 0.42, 0.018, [196, 30, 30], 2);
    disc('ClockCap', fpt(F, [0, 0, 0.25]), N_, 0.08, 0.02, [24, 24, 24], 'SmoothPlastic', { nc: true, ns: true, min: 0.01 });
  });
}

// 방송 스피커 (나무 상자, 아래로 기울임)
function paSpeaker(c, N0) {
  const t = 14 * Math.PI / 180;
  const N_ = vnorm(vadd(vmul(N0, Math.cos(t)), [0, -Math.sin(t), 0]));
  const U_ = vnorm(vsub([0, 1, 0], vmul(N_, N_[1])));
  const F = { o: c, X: vcross(U_, N_), Y: U_, Z: N_ };
  grp('Speaker', () => {
    FB(F, 'SpeakerBox', -0.62, -0.42, 0.05, 0.62, 0.42, 0.55, [124, 88, 56], 'Wood', { nc: true });
    FB(F, 'SpeakerGrille', -0.52, -0.33, 0.55, 0.52, 0.33, 0.57, [44, 38, 34], 'Fabric', { nc: true, ns: true, min: 0.01 });
    FB(F, 'SpeakerBadge', 0.25, -0.3, 0.57, 0.45, -0.24, 0.58, [196, 198, 200], 'Metal', { nc: true, ns: true, min: 0.008 });
    B('SpeakerBracket', c[0] - 0.02, c[1] - 0.12, c[2] - 0.12, c[0] + 0.18, c[1] + 0.12, c[2] + 0.12, [60, 60, 62], 'Metal', { nc: true, ns: true });
  });
}

// 2등용 형광등 (반사갓 직부등, FL32W×2). 기본은 길이 방향 X
function fluoro(x, z, top, o = {}) {
  const F = o.alongZ ? { o: [x, top, z], X: [0, 0, 1], Y: [0, 1, 0], Z: [-1, 0, 0] } : { o: [x, top, z], X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };
  const on = !!o.on, white = [236, 237, 234];
  const body = FB(F, 'LampBody', -2.14, -0.17, -0.2, 2.14, 0, 0.2, white, 'Metal', { nc: true, ns: true, tag: o.tag, light: o.light });
  const a = 30 * Math.PI / 180;
  [-1, 1].forEach((s) => FP(F, 'Reflector', [4.28, 0.03, 0.34], [0, -0.17 - 0.17 * Math.sin(a), s * (0.2 + 0.17 * Math.cos(a))], white, 'Metal',
    { nc: true, ns: true, min: 0.02, axes: [[1, 0, 0], [0, Math.cos(s * a), Math.sin(s * a)], [0, -Math.sin(s * a), Math.cos(s * a)]] }));
  [-1, 1].forEach((s) => FB(F, 'LampHolder', s * 2.06 - 0.06, -0.42, -0.27, s * 2.06 + 0.06, -0.17, 0.27, [244, 244, 240], 'SmoothPlastic', { nc: true, ns: true }));
  [-0.14, 0.14].forEach((zz, ti) => FP(F, 'Tube', [4.0, 0.105, 0.105], [0, -0.33, zz], on ? [246, 248, 255] : [222, 224, 222], on ? 'Neon' : 'SmoothPlastic', { sh: 'Cylinder', nc: true, ns: true, light: ti === 0 ? o.glow : undefined }));
  return body;
}
// 칠판 조명: 천장에서 내려온 비대칭 반사갓 등 (칠판 쪽으로 기울어짐)
function boardLight(x, z, top) {
  const phi = 32 * Math.PI / 180;
  const X = [0, 0, 1], Y = [Math.sin(phi), Math.cos(phi), 0], Z = vcross(X, Y);
  const F = { o: [x, top - 0.62, z], X, Y, Z };
  const white = [236, 237, 234];
  [-1.5, 1.5].forEach((u) => rod('LampStem', [x + 0.12, top, z + u], fpt(F, [u, 0.2, 0]), 0.06, [206, 206, 204], 'Metal', { nc: true, ns: true, min: 0.03 }));
  FB(F, 'BoardLampBody', -2.1, 0, -0.3, 2.1, 0.22, 0.3, white, 'Metal', { nc: true, ns: true, tag: 'RoomFixture',
    light: { type: 'Surface', face: 'Bottom', range: 14, angle: 75, brightness: 0, color: [240, 244, 255], enabled: false } });
  FB(F, 'BoardLampLip', -2.1, -0.22, -0.32, 2.1, 0.02, -0.28, white, 'Metal', { nc: true, ns: true, min: 0.03 });
  FP(F, 'Tube', [3.95, 0.105, 0.105], [0, -0.08, 0.04], [222, 224, 222], 'SmoothPlastic', { sh: 'Cylinder', nc: true, ns: true });
}

// 천장 회전 선풍기 (보호망 달린 오비트팬)
function orbitFan(x, z, top, yawDeg) {
  grp('CeilingFan', () => {
    const white = [238, 238, 233], grey = [200, 202, 206], o = { nc: true, ns: true, min: 0.02 };
    // 천장 고정판 + 회전 몸통(위가 넓은 종 모양) + 띠
    cylV('FanBase', x, top - 0.1, z, 0.1, 1.0, white, 'SmoothPlastic', { nc: true });
    cylV('FanOrbit', x, top - 0.34, z, 0.24, 0.78, white, 'SmoothPlastic', { nc: true });
    cylV('FanOrbit', x, top - 0.62, z, 0.3, 0.6, white, 'SmoothPlastic', { nc: true });
    cylV('FanOrbitBand', x, top - 0.36, z, 0.03, 0.8, grey, 'SmoothPlastic', o);
    ball('FanJoint', x, top - 0.72, z, 0.42, white, 'SmoothPlastic', o);
    const yaw = yawDeg * Math.PI / 180, tilt = 38 * Math.PI / 180;
    const ax = vnorm(vadd(vmul([Math.cos(yaw), 0, -Math.sin(yaw)], Math.sin(tilt)), [0, -Math.cos(tilt), 0]));
    const piv = [x, top - 0.72, z];
    rod('FanNeck', piv, vadd(piv, vmul(ax, 0.28)), 0.2, white, 'SmoothPlastic', o);
    // 모터: 뒤가 둥근 통 + 통풍 띠
    const m0 = vadd(piv, vmul(ax, 0.2)), m1 = vadd(piv, vmul(ax, 0.62));
    rod('FanMotor', m0, m1, 0.5, white, 'SmoothPlastic', o);
    ball('FanMotorCap', ...m0, 0.5, white, 'SmoothPlastic', o);
    rod('FanMotorVent', vadd(piv, vmul(ax, 0.3)), vadd(piv, vmul(ax, 0.36)), 0.52, grey, 'SmoothPlastic', o);
    const cc = vadd(piv, vmul(ax, 0.86));
    const e1 = vnorm(vcross(ax, [0, 1, 0])), e2 = vcross(ax, e1);
    const rp = (ang, rad, off) => vadd(vadd(cc, vmul(ax, off)), vadd(vmul(e1, Math.cos(ang) * rad), vmul(e2, Math.sin(ang) * rad)));
    const ring = (rad, off, segs, d, col) => { for (let k = 0; k < segs; k++) rod('FanCage', rp((k * 2 * Math.PI) / segs, rad, off), rp(((k + 1) * 2 * Math.PI) / segs, rad, off), d, col, 'SmoothPlastic', o); };
    const R0 = 0.76;
    // 보호망: 가운데 굵은 테 + 앞뒤 테 + 앞쪽 동심원 + 볼록한 살
    ring(R0 + 0.02, 0, 18, 0.07, grey);
    ring(R0, 0.17, 18, 0.035, white);
    ring(R0, -0.17, 18, 0.035, white);
    ring(0.5, 0.25, 14, 0.025, white);
    for (let k = 0; k < 16; k++) {
      const a = (k * 2 * Math.PI) / 16;
      rod('FanCage', rp(a, 0.16, 0.3), rp(a, 0.5, 0.25), 0.022, white, 'SmoothPlastic', o);
      rod('FanCage', rp(a, 0.5, 0.25), rp(a, R0, 0.17), 0.022, white, 'SmoothPlastic', o);
      rod('FanCage', rp(a, R0, 0.17), rp(a, R0 + 0.02, 0), 0.022, white, 'SmoothPlastic', o);
      if (k % 2 === 0) { rod('FanCage', rp(a, 0.26, -0.25), rp(a, R0, -0.17), 0.022, white, 'SmoothPlastic', o); rod('FanCage', rp(a, R0, -0.17), rp(a, R0 + 0.02, 0), 0.022, white, 'SmoothPlastic', o); }
    }
    disc('FanBadge', vadd(cc, vmul(ax, 0.3)), ax, 0.34, 0.04, [236, 236, 232], 'SmoothPlastic', o);
    disc('FanBadgeLogo', vadd(cc, vmul(ax, 0.325)), ax, 0.2, 0.012, [60, 108, 186], 'SmoothPlastic', { ...o, min: 0.01 });
    disc('FanHub', vadd(cc, vmul(ax, 0.02)), ax, 0.26, 0.2, [196, 214, 232], 'SmoothPlastic', o);
    // 날개 3장: 뿌리는 좁고 끝은 넓게, 비틀림 (반투명 하늘색)
    for (let k = 0; k < 3; k++) {
      const a = (k * 2 * Math.PI) / 3 + yaw;
      const rad = vadd(vmul(e1, Math.cos(a)), vmul(e2, Math.sin(a))), tan = vcross(ax, rad);
      [[0.24, 0.2, 0.2, 0.5], [0.44, 0.24, 0.3, 0.38], [0.6, 0.14, 0.26, 0.3]].forEach(([rr, len, wid, tw]) => {
        const Yb = vadd(vmul(tan, Math.cos(tw)), vmul(ax, Math.sin(tw)));
        P('FanBlade', [len + 0.03, wid, 0.025], vadd(vadd(cc, vmul(rad, rr)), vmul(tan, (rr - 0.24) * 0.25)), [176, 208, 234], 'SmoothPlastic', { ...o, t: 0.3, r: eulerFromBasis(rad, Yb, vcross(rad, Yb)) });
      });
    }
  });
}

// 천장형 TV 브라켓 + 50인치 LCD TV. (px, pz): 천장 고정 위치, cy: 화면 가운데 높이, target: 화면이 바라볼 곳
function ceilingTV(px, pz, top, cy, target, o = {}) {
  grp('CeilingTV', () => {
    const blk = [26, 26, 28], blk2 = [46, 46, 50], silver = [164, 166, 170], so = { nc: true, ns: true, min: 0.02 };
    const K = [px, cy + 0.15, pz];
    B('MountPlate', px - 0.3, top - 0.05, pz - 0.3, px + 0.3, top, pz + 0.3, blk, 'Metal', { nc: true });
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([a, b]) => P('Bolt', [0.03, 0.07, 0.07], [px + a, top - 0.065, pz + b], silver, 'Metal', { ...so, sh: 'Cylinder', r: [0, 0, 90] }));
    cylV('Swivel', px, top - 0.24, pz, 0.19, 0.3, blk2, 'Metal', { nc: true });
    const tubeTop = top - 0.24, split = (tubeTop + K[1]) / 2 + 0.2;
    B('PoleOuter', px - 0.11, split, pz - 0.11, px + 0.11, tubeTop, pz + 0.11, blk, 'Metal', { nc: true });
    B('PoleInner', px - 0.08, K[1] + 0.12, pz - 0.08, px + 0.08, split + 0.1, pz + 0.08, blk2, 'Metal', { nc: true, refl: 0.05 });
    B('PoleCollar', px - 0.13, split - 0.12, pz - 0.13, px + 0.13, split, pz + 0.13, blk, 'Metal', { nc: true });
    rod('LockPin', [px - 0.2, split - 0.06, pz], [px + 0.2, split - 0.06, pz], 0.05, silver, 'Metal', so);
    const fl = vnorm([target[0] - px, 0, target[2] - pz]);
    const tilt = (o.tilt ?? 10) * Math.PI / 180;
    const N = vnorm(vadd(vmul(fl, Math.cos(tilt)), [0, -Math.sin(tilt), 0]));
    const U = vnorm(vsub([0, 1, 0], vmul(N, N[1])));
    const R = vcross(U, N), side = vnorm(vcross([0, 1, 0], fl));
    P('TiltHead', [0.32, 0.3, 0.3], K, blk, 'Metal', { nc: true, r: lookRot(fl) });
    rod('TiltKnob', vadd(K, vmul(side, -0.24)), vadd(K, vmul(side, 0.24)), 0.1, blk2, 'Metal', so);
    const plate = vadd(K, vmul(fl, 0.42));
    rod('TiltArm', K, plate, 0.12, blk, 'Metal', { nc: true, box: true });
    const sw = o.width || 3.66, sh = sw * 9 / 16, dep = 0.26;
    const F = { o: vadd(plate, vmul(N, 0.08 + dep / 2)), X: R, Y: U, Z: N };
    FB(F, 'VesaPlate', -0.5, -0.16, -dep / 2 - 0.08, 0.5, 0.16, -dep / 2 - 0.03, blk, 'Metal', { nc: true });
    [-0.42, 0.42].forEach((u) => FB(F, 'VesaRail', u - 0.06, -0.62, -dep / 2 - 0.05, u + 0.06, 0.62, -dep / 2, blk2, 'Metal', so));
    FB(F, 'TVBack', -sw / 2 + 0.3, -sh / 2 + 0.25, -dep / 2, sw / 2 - 0.3, sh / 2 - 0.25, -dep / 2 + 0.12, [34, 34, 36], 'SmoothPlastic', { nc: true });
    FB(F, 'TVBody', -sw / 2, -sh / 2, -dep / 2 + 0.1, sw / 2, sh / 2, dep / 2 - 0.02, [18, 18, 20], 'SmoothPlastic', { refl: 0.08 });
    const bz0 = dep / 2 - 0.02, bz1 = dep / 2 + 0.02, bez = [12, 12, 14];
    FB(F, 'TVBezel', -sw / 2, sh / 2 - 0.09, bz0, sw / 2, sh / 2, bz1, bez, 'SmoothPlastic', { ...so, refl: 0.2 });
    FB(F, 'TVBezel', -sw / 2, -sh / 2, bz0, sw / 2, -sh / 2 + 0.17, bz1, bez, 'SmoothPlastic', { ...so, refl: 0.2 });
    FB(F, 'TVBezel', -sw / 2, -sh / 2 + 0.17, bz0, -sw / 2 + 0.09, sh / 2 - 0.09, bz1, bez, 'SmoothPlastic', { ...so, refl: 0.2 });
    FB(F, 'TVBezel', sw / 2 - 0.09, -sh / 2 + 0.17, bz0, sw / 2, sh / 2 - 0.09, bz1, bez, 'SmoothPlastic', { ...so, refl: 0.2 });
    FB(F, 'TVScreen', -sw / 2 + 0.09, -sh / 2 + 0.17, bz0 - 0.01, sw / 2 - 0.09, sh / 2 - 0.09, bz0 + 0.012, [8, 9, 11], 'Glass', { ...so, refl: 0.25, tag: 'ClassTV' });
    FB(F, 'PowerLED', sw / 2 - 0.38, -sh / 2 + 0.07, bz1 - 0.005, sw / 2 - 0.32, -sh / 2 + 0.1, bz1 + 0.006, [255, 46, 30], 'Neon', { nc: true, ns: true, min: 0.008 });
    const c0 = fpt(F, [0.22, 0.32, -dep / 2 - 0.02]), c1 = [px + 0.14, K[1] + 0.4, pz + 0.04];
    rod('TVCable', c0, c1, 0.05, [20, 20, 20], 'SmoothPlastic', so);
    rod('TVCable', c1, [px + 0.14, top - 0.1, pz + 0.04], 0.05, [20, 20, 20], 'SmoothPlastic', so);
  });
}

// 스탠드형 에어컨 (교실 앞 구석). 뒤가 벽(x0), 앞면이 +X
function standAC(x0, za, L) {
  grp('StandAC', () => {
    const w = 1.95, d = 1.2, h = 6.0, x1 = x0 + d, zb = za + w, white = [240, 240, 236], so = { nc: true, ns: true, min: 0.02 };
    B('ACBase', x0 + 0.04, L, za + 0.04, x1 - 0.04, L + 0.35, zb - 0.04, [150, 152, 156], 'SmoothPlastic');
    B('ACBody', x0, L + 0.35, za, x1, L + h, zb, white, 'SmoothPlastic');
    B('ACTop', x0 + 0.03, L + h, za + 0.03, x1 - 0.03, L + h + 0.08, zb - 0.03, [226, 226, 222], 'SmoothPlastic', so);
    B('ACFront', x1, L + 0.55, za + 0.12, x1 + 0.06, L + 4.3, zb - 0.12, [226, 222, 214], 'SmoothPlastic', { nc: true, refl: 0.08 });
    B('ACOutlet', x1, L + 4.45, za + 0.18, x1 + 0.02, L + 5.75, zb - 0.18, [58, 60, 64], 'SmoothPlastic', so);
    for (let k = 0; k < 6; k++) B('ACLouver', x1, L + 4.55 + k * 0.2, za + 0.2, x1 + 0.13, L + 4.6 + k * 0.2, zb - 0.2, [236, 236, 232], 'SmoothPlastic', so);
    B('ACDisplay', x1 + 0.05, L + 3.55, za + 0.6, x1 + 0.08, L + 4.05, zb - 0.6, [22, 30, 38], 'Glass', { ...so, refl: 0.2 });
    B('ACStripe', x1 + 0.06, L + 2.15, za + 0.12, x1 + 0.07, L + 2.22, zb - 0.12, [168, 170, 174], 'Metal', so);
    for (let k = 0; k < 6; k++) B('ACIntake', x0 + 0.2, L + 0.7 + k * 0.22, zb, x1 - 0.2, L + 0.78 + k * 0.22, zb + 0.02, [196, 196, 192], 'SmoothPlastic', so);
    B('ACPipeCover', x0 - 0.02, L + 4.7, za + 0.7, x0 + 0.02, L + 5.3, za + 1.25, white, 'SmoothPlastic', so);
  });
}

// 창틀 화분: 받침 접시 + 아래가 좁은 화분 + 흙 + 잎. kind 0 산세베리아(곧은 잎), 1 둥근 잎 화초, 2 선인장
function pottedPlant(x, y, z, kind = 0) {
  grp('PottedPlant', () => {
    const so = { nc: true, ns: true, min: 0.02 };
    const pc = pick([[178, 98, 66], [232, 232, 226], [98, 122, 160], [70, 72, 76]]);
    cylV('Saucer', x, y, z, 0.05, 0.56, pc.map((v) => v - 20), 'SmoothPlastic', so);
    cylV('Pot', x, y + 0.05, z, 0.2, 0.36, pc, 'SmoothPlastic', { nc: true });
    cylV('Pot', x, y + 0.25, z, 0.2, 0.44, pc, 'SmoothPlastic', { nc: true });
    cylV('PotRim', x, y + 0.45, z, 0.07, 0.52, pc.map((v) => Math.min(255, v + 12)), 'SmoothPlastic', so);
    cylV('Soil', x, y + 0.47, z, 0.06, 0.44, [58, 44, 34], 'Sand', so);
    const base = [x, y + 0.5, z];
    if (kind === 0) {
      for (let k = 0; k < 8; k++) {
        const a = rnd() * 6.28, lean = 0.05 + rnd() * 0.22, h = 0.7 + rnd() * 0.7, r0 = 0.04 + rnd() * 0.1;
        const dir = vnorm([Math.cos(a) * lean, 1, Math.sin(a) * lean]);
        const p0 = vadd(base, [Math.cos(a) * r0, 0, Math.sin(a) * r0]), p1 = vadd(p0, vmul(dir, h));
        const side = vnorm(vcross(dir, [Math.cos(a), 0, Math.sin(a)]));
        const rot = eulerFromBasis(dir, vcross(side, dir), side);
        P('Leaf', [h, 0.03, 0.15], vmul(vadd(p0, p1), 0.5), jit([44, 92, 52], 12), 'SmoothPlastic', { ...so, r: rot });
        P('LeafEdge', [h * 0.96, 0.034, 0.03], vadd(vmul(vadd(p0, p1), 0.5), vmul(side, 0.07)), [186, 190, 96], 'SmoothPlastic', { ...so, r: rot });
        P('LeafTip', [0.16, 0.03, 0.09], vadd(p1, vmul(dir, 0.07)), [44, 92, 52], 'SmoothPlastic', { ...so, r: rot });
      }
    } else if (kind === 1) {
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4 + rnd() * 0.5, h = 0.35 + rnd() * 0.55, out = 0.12 + rnd() * 0.25;
        const tip = vadd(base, [Math.cos(a) * out, h, Math.sin(a) * out]);
        rod('Stem', base, tip, 0.03, [70, 110, 60], 'SmoothPlastic', so);
        const n = vnorm([Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5]);
        disc('Leaf', vadd(tip, [Math.cos(a) * 0.08, 0.01, Math.sin(a) * 0.08]), n, 0.24 + rnd() * 0.12, 0.02, jit([62, 128, 66], 16), 'SmoothPlastic', so);
      }
    } else {
      cylV('Cactus', x, y + 0.5, z, 0.55, 0.3, [72, 124, 78], 'SmoothPlastic', so);
      ball('CactusTop', x, y + 1.05, z, 0.3, [72, 124, 78], 'SmoothPlastic', so);
      rod('CactusArm', [x + 0.1, y + 0.75, z], [x + 0.3, y + 0.82, z], 0.14, [80, 132, 84], 'SmoothPlastic', so);
      rod('CactusArm', [x + 0.3, y + 0.8, z], [x + 0.3, y + 1.0, z], 0.14, [80, 132, 84], 'SmoothPlastic', so);
      ball('Flower', x + 0.05, y + 1.2, z, 0.1, [236, 96, 140], 'SmoothPlastic', so);
    }
  });
}

// 교탁: 학생 쪽(+X)은 막힌 앞판, 선생님 쪽은 선반
function lectern(x0, zc, L) {
  grp('Lectern', () => {
    const wood = [150, 104, 62], wood2 = [176, 128, 82], dark = [88, 58, 36], so = { nc: true, ns: true };
    const x1 = x0 + 1.6, w = 1.55, h = 3.3;
    B('LecternPlinth', x0 + 0.06, L, zc - w + 0.06, x1 - 0.06, L + 0.3, zc + w - 0.06, dark, 'Wood');
    B('LecternSide', x0, L + 0.3, zc - w, x1, L + h, zc - w + 0.12, wood, 'Wood');
    B('LecternSide', x0, L + 0.3, zc + w - 0.12, x1, L + h, zc + w, wood, 'Wood');
    B('LecternFront', x1 - 0.12, L + 0.3, zc - w + 0.12, x1, L + h, zc + w - 0.12, wood, 'Wood');
    // 앞판: 테두리 몰딩 안에 밝은 알판 + 학교 표지
    const fz0 = zc - w + 0.3, fz1 = zc + w - 0.3, fy0 = L + 0.62, fy1 = L + h - 0.38;
    B('LecternPanel', x1, fy0, fz0, x1 + 0.03, fy1, fz1, wood2, 'Wood', so);
    [[fy0 - 0.09, fy0, fz0 - 0.09, fz1 + 0.09], [fy1, fy1 + 0.09, fz0 - 0.09, fz1 + 0.09], [fy0, fy1, fz0 - 0.09, fz0], [fy0, fy1, fz1, fz1 + 0.09]]
      .forEach(([a, b, c, d]) => B('LecternMold', x1, a, c, x1 + 0.06, b, d, dark, 'Wood', so));
    disc('LecternEmblem', [x1 + 0.05, (fy0 + fy1) / 2 + 0.25, zc], [1, 0, 0], 0.9, 0.04, [186, 152, 78], 'Metal', { ...so, refl: 0.15 });
    disc('LecternEmblemIn', [x1 + 0.075, (fy0 + fy1) / 2 + 0.25, zc], [1, 0, 0], 0.66, 0.02, [30, 52, 104], 'SmoothPlastic', { ...so, min: 0.015 });
    B('LecternName', x1 + 0.03, fy0 + 0.25, zc - 0.75, x1 + 0.05, fy0 + 0.6, zc + 0.75, [186, 152, 78], 'Metal', { ...so, min: 0.02,
      text: { face: 'Right', text: '송천고등학교', color: [40, 28, 16], bgT: 1, lit: 1, font: 'GothamBold', pps: 120 } });
    // 옆판 몰딩, 모서리 기둥
    [zc - w - 0.03, zc + w].forEach((z) => B('LecternSidePanel', x0 + 0.25, L + 0.65, z, x1 - 0.25, L + h - 0.4, z + 0.03, wood2, 'Wood', so));
    [zc - w - 0.02, zc + w - 0.1].forEach((z) => B('LecternPost', x1 - 0.1, L + 0.3, z, x1 + 0.02, L + h, z + 0.12, dark, 'Wood', so));
    // 선생님 쪽: 선반 2단
    B('LecternShelf', x0 + 0.08, L + 1.75, zc - w + 0.12, x1 - 0.12, L + 1.85, zc + w - 0.12, wood, 'Wood', so);
    B('LecternBottom', x0 + 0.08, L + 0.3, zc - w + 0.12, x1 - 0.12, L + 0.4, zc + w - 0.12, wood, 'Wood', so);
    // 윗판: 처마 몰딩 + 선생님 쪽으로 기운 독서대 + 분필 턱
    B('LecternCornice', x0 - 0.12, L + h, zc - w - 0.12, x1 + 0.14, L + h + 0.12, zc + w + 0.12, dark, 'Wood');
    B('LecternTop', x0 - 0.08, L + h + 0.12, zc - w - 0.08, x1 + 0.1, L + h + 0.2, zc + w + 0.08, wood2, 'Wood');
    P('LecternSlope', [1.3, 0.06, 2.5], [x0 + 0.72, L + h + 0.36, zc], wood2, 'Wood', { nc: true, r: [0, 0, 12] });
    B('LecternLedge', x0 + 0.02, L + h + 0.2, zc - 1.25, x0 + 0.1, L + h + 0.3, zc + 1.25, dark, 'Wood', so);
    B('LecternBackLip', x1 - 0.06, L + h + 0.2, zc - w - 0.08, x1 + 0.1, L + h + 0.56, zc + w + 0.08, wood, 'Wood', so);
    P('AttendanceBook', [0.95, 0.1, 1.25], [x0 + 0.7, L + h + 0.44, zc - 0.3], [30, 44, 86], 'Fabric', { nc: true, r: [0, 5, 12] });
    B('ChalkBox', x1 - 0.5, L + h + 0.2, zc + 0.85, x1 - 0.1, L + h + 0.45, zc + 1.3, [246, 246, 240], 'SmoothPlastic', { nc: true });
    B('Textbook', x0 + 0.2, L + 1.85, zc - 1.1, x0 + 1.0, L + 2.1, zc - 0.2, [200, 80, 60], 'SmoothPlastic', so);
    B('Textbook', x0 + 0.25, L + 2.1, zc - 1.05, x0 + 0.95, L + 2.3, zc - 0.3, [70, 110, 170], 'SmoothPlastic', so);
    cylV('PenCup', x0 + 0.5, L + 1.85, zc + 0.8, 0.45, 0.32, [60, 62, 66], 'SmoothPlastic', so);
  });
}

// 교사용 책상: 철제 책상 + 유리 깔판 + 모니터·키보드·실물화상기 + 사무용 의자. 선생님은 -X 쪽에 앉아 +X(학생)를 본다
function teacherDesk(x0, za, L) {
  grp('TeacherDesk', () => {
    const steel = [152, 156, 162], top = L + 2.5, x1 = x0 + 2.3, zb = za + 4.0, so = { nc: true, ns: true };
    B('DeskPedestal', x0 + 0.05, L + 0.12, za + 0.05, x1 - 0.05, top - 0.06, za + 1.45, steel, 'Metal');
    B('DeskModesty', x1 - 0.25, L + 0.8, za + 1.45, x1 - 0.05, top - 0.06, zb - 0.1, steel, 'Metal');
    B('DeskEnd', x0 + 0.05, L + 0.12, zb - 0.15, x1 - 0.05, top - 0.06, zb - 0.05, steel, 'Metal');
    B('DeskTop', x0, top - 0.06, za, x1, top + 0.04, zb, [208, 202, 188], 'SmoothPlastic');
    B('DeskGlass', x0 + 0.02, top + 0.04, za + 0.02, x1 - 0.02, top + 0.08, zb - 0.02, [196, 218, 212], 'Glass', { ...so, t: 0.55, refl: 0.15, min: 0.03 });
    for (let k = 0; k < 3; k++) {
      B('Drawer', x0 + 0.01, L + 0.3 + k * 0.7, za + 0.12, x0 + 0.05, L + 0.92 + k * 0.7, za + 1.38, [164, 168, 174], 'Metal', so);
      B('DrawerPull', x0 - 0.04, L + 0.72 + k * 0.7, za + 0.5, x0 + 0.01, L + 0.8 + k * 0.7, za + 1.0, [90, 92, 96], 'Metal', so);
    }
    // 모니터 (선생님 쪽을 봄)
    const mx = x0 + 1.55, mz = za + 2.55;
    B('MonitorFoot', mx - 0.32, top + 0.08, mz - 0.45, mx + 0.32, top + 0.13, mz + 0.45, [28, 28, 30], 'SmoothPlastic', so);
    B('MonitorNeck', mx - 0.06, top + 0.13, mz - 0.1, mx + 0.06, top + 0.75, mz + 0.1, [28, 28, 30], 'SmoothPlastic', so);
    B('Monitor', mx - 0.16, top + 0.55, mz - 0.95, mx - 0.04, top + 1.75, mz + 0.95, [22, 22, 24], 'SmoothPlastic', { nc: true, refl: 0.08 });
    B('MonitorScreen', mx - 0.17, top + 0.62, mz - 0.88, mx - 0.16, top + 1.68, mz + 0.88, [10, 12, 16], 'Glass', { ...so, refl: 0.2, min: 0.008 });
    B('Keyboard', x0 + 0.35, top + 0.08, mz - 0.75, x0 + 0.85, top + 0.15, mz + 0.75, [36, 36, 38], 'SmoothPlastic', so);
    B('Mouse', x0 + 0.5, top + 0.08, mz + 1.0, x0 + 0.7, top + 0.15, mz + 1.15, [36, 36, 38], 'SmoothPlastic', so);
    B('PCTower', x0 + 0.5, L, zb - 1.35, x0 + 1.9, L + 1.45, zb - 0.75, [40, 40, 44], 'SmoothPlastic');
    // 실물화상기
    B('DocCamBase', x0 + 0.6, top + 0.08, za + 0.25, x0 + 1.5, top + 0.18, za + 1.25, [176, 178, 182], 'SmoothPlastic', so);
    rod('DocCamArm', [x0 + 1.4, top + 0.18, za + 0.75], [x0 + 1.3, top + 1.45, za + 0.75], 0.09, [176, 178, 182], 'SmoothPlastic', so);
    B('DocCamHead', x0 + 0.85, top + 1.38, za + 0.6, x0 + 1.4, top + 1.55, za + 0.9, [60, 62, 66], 'SmoothPlastic', so);
    B('Papers', x0 + 0.3, top + 0.08, za + 1.5, x0 + 1.1, top + 0.24, za + 2.0, [244, 244, 238], 'SmoothPlastic', { ...so, r: [0, 6, 0] });
    cylV('MugCup', x0 + 1.05, top + 0.08, zb - 0.5, 0.36, 0.3, [236, 236, 230], 'SmoothPlastic', so);
    // 사무용 의자
    const cx = x0 - 1.05, cz = za + 2.4;
    disc('ChairStar', [cx, L + 0.18, cz], [0, 1, 0], 1.6, 0.12, [30, 30, 32], 'SmoothPlastic', { nc: true });
    cylV('ChairLift', cx, L + 0.24, cz, 1.05, 0.16, [70, 72, 76], 'Metal', { nc: true });
    B('ChairSeat', cx - 0.75, L + 1.3, cz - 0.75, cx + 0.75, L + 1.6, cz + 0.75, [26, 26, 28], 'Fabric');
    P('ChairBack', [0.16, 1.7, 1.35], [cx - 0.82, L + 2.55, cz], [26, 26, 28], 'Fabric', { r: [0, 0, 8] });
  });
}

// 교실 시간표 (벽에 붙인 인쇄물). R_ 오른쪽, U_ 위, N_ 벽에서 나오는 쪽
function timetable(c, R_, U_, N_, title, seedIdx) {
  const F = { o: c, X: R_, Y: U_, Z: N_ };
  const W = 2.7, H = 2.3, th = 0.38, so = { nc: true, ns: true, min: 0.01 };
  const subj = ['국어', '수학', '영어', '문학', '물리', '화학', '생물', '국사', '윤리', '한문', '체육', '음악', '미술', '기가', '일어', '독서'];
  grp('Timetable', () => {
    FB(F, 'TimetableMat', -W / 2 - 0.08, -H / 2 - 0.08, 0, W / 2 + 0.08, H / 2 + 0.08, 0.03, [64, 104, 168], 'SmoothPlastic', so);
    FB(F, 'TimetableTitle', -W / 2, H / 2 - th, 0.03, W / 2, H / 2, 0.04, [64, 104, 168], 'SmoothPlastic', { ...so,
      text: { face: 'Back', text: title, color: [255, 255, 255], bgT: 1, lit: 1, font: 'GothamBlack', pps: 120 } });
    const cw = W / 6;
    for (let k = 0; k < 6; k++) {
      const lines = k === 0 ? ['교시', '1', '2', '3', '4', '5', '6', '7'] : [['월', '화', '수', '목', '금'][k - 1], ...Array.from({ length: 7 }, (_, i) => subj[(seedIdx * 7 + k * 5 + i * 3 + ((i * k) % 4)) % subj.length])];
      FB(F, 'TimetableCol', -W / 2 + k * cw, -H / 2, 0.03, -W / 2 + (k + 1) * cw, H / 2 - th, 0.04, k === 0 ? [228, 236, 248] : [252, 252, 248], 'SmoothPlastic', { ...so,
        text: { face: 'Back', text: lines.join('\n'), color: [30, 32, 44], bgT: 1, lit: 1, font: 'GothamBold', pps: 140 } });
      if (k > 0) FB(F, 'TimetableLine', -W / 2 + k * cw - 0.006, -H / 2, 0.04, -W / 2 + k * cw + 0.006, H / 2 - th, 0.045, [120, 130, 150], 'SmoothPlastic', so);
    }
  });
}

// 교실 미닫이문 (참고 사진): 오크 무늬 쌍미닫이 — 가로 홈이 파인 문짝 2장, 왼쪽 문짝에만 가로로 긴 유리창,
// 은색 막대 손잡이. 두 문짝은 복도 쪽 레일 두 줄에 있어서 한 장을 밀면 다른 장 뒤(앞)로 겹쳐진다.
// o.single: 문짝 하나 (화장실), dir 방향으로 벽 쪽으로 밀림
const OAK = [184, 136, 84], OAK_LINE = [96, 64, 36], OAK_FRAME = [158, 110, 64];
function doorLeaf(gname, x0, x1, L, zc, slide, open, o = {}) {
  grp(gname, () => {
    const W = x1 - x0, H = 7.1, T = 0.14, z0 = zc - T / 2, z1 = zc + T / 2, so = { nc: true, ns: true };
    const xs = x0 + (open ? slide : 0);
    const box = (n, u0, v0, u1, v1, w0, w1, col, mat, op) => B(n, xs + u0, L + v0, w0, xs + u1, L + v1, w1, col, mat, op);
    P('DoorLeaf', [W, H, 0.3], [xs + W / 2, L + 0.06 + H / 2, zc], OAK, 'Wood', { t: 1, ns: true, pri: true, attr: { SlideX: slide, Open: !!open } });
    // 속판(어두운 홈 색) 위에 무늬목 판 5장을 띄워 붙여 홈이 진짜로 파여 보이게
    const gap = 0.045, ph = (H - gap * 4) / 5, e = 0.03;
    for (let k = 0; k < 5; k++) {
      const v0 = 0.06 + k * (ph + gap), v1 = v0 + ph, col = jit(OAK, 7);
      if (o.glass && k === 3) {
        const fb = 0.16;
        box('DoorPanel', 0, v0, fb, v1, z0, z1, col, 'Wood', { nc: true });
        box('DoorPanel', W - fb, v0, W, v1, z0, z1, col, 'Wood', { nc: true });
        box('DoorPanel', fb, v0, W - fb, v0 + fb * 0.6, z0, z1, col, 'Wood', { nc: true });
        box('DoorPanel', fb, v1 - fb * 0.6, W - fb, v1, z0, z1, col, 'Wood', { nc: true });
        box('DoorGlass', fb, v0 + fb * 0.6, W - fb, v1 - fb * 0.6, zc - 0.015, zc + 0.015, [186, 204, 210], 'Glass', { ...so, t: 0.5, refl: 0.15, min: 0.02 });
        [[fb, v0 + fb * 0.6, W - fb, v0 + fb * 0.6 + 0.035], [fb, v1 - fb * 0.6 - 0.035, W - fb, v1 - fb * 0.6], [fb, v0 + fb * 0.6, fb + 0.035, v1 - fb * 0.6], [W - fb - 0.035, v0 + fb * 0.6, W - fb, v1 - fb * 0.6]]
          .forEach(([u0, a0, u1, a1]) => box('GlassBead', u0, a0, u1, a1, z0 + 0.03, z1 - 0.03, [60, 62, 66], 'SmoothPlastic', { ...so, min: 0.02 }));
      } else {
        box('DoorPanel', 0, v0, W, v1, z0, z1, col, 'Wood', { nc: true });
      }
      // 판 사이 홈: 문짝 폭 전체를 막는 속판 (구멍 없이)
      if (k < 4) box('DoorCore', 0, v1 - 0.01, W, v1 + gap + 0.01, z0 + 0.02, z1 - 0.02, OAK_LINE, 'Wood', { nc: true, ns: true });
    }
    // 은색 오목 손잡이 (양면, 문짝 바깥쪽 가장자리 — 참고 사진 위치)
    const hu = o.handleAt === 'right' ? W - 0.3 : 0.14, hv = 0.06 + 2 * (ph + gap) + ph * 0.28;
    [[z0 - 0.02, z0 + 0.01, z0 - 0.026], [z1 - 0.01, z1 + 0.02, z1 + 0.02]].forEach(([w0, w1, wr]) => {
      box('HandlePlate', hu, hv, hu + 0.16, hv + 0.62, w0, w1, [208, 210, 214], 'Metal', { ...so, refl: 0.3, min: 0.02 });
      box('HandleRecess', hu + 0.035, hv + 0.07, hu + 0.125, hv + 0.55, wr, wr + 0.006, [70, 72, 76], 'Metal', { ...so, min: 0.006 });
    });
    if (o.lock) P('KeyCylinder', [0.03, 0.1, 0.1], [xs + hu + 0.08, L + hv - 0.16, z0 - 0.015], [200, 202, 206], 'Metal', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.02 });
  }, 'SlidingDoor');
}
// 여닫이문: 닫힌 모습으로 그린다. 투명한 DoorLeaf 가 몸을 막고, 서버(Main)가 경첩(HX, HZ) 둘레로
// Swing 도만큼 돌려 연다. o.open: 처음부터 열려 있음, o.locked: 잠긴 문 (눌렀을 때 나올 말)
function hingeDoor(gname, box, hinge, swing, o, draw) {
  grp(gname, () => {
    const [x0, y0, z0, x1, y1, z1] = box;
    B('DoorLeaf', x0, y0, z0, x1, y1, z1, [128, 128, 128], 'SmoothPlastic', { t: 1, ns: true, pri: true,
      attr: { HX: hinge[0], HZ: hinge[1], Swing: swing, Open: !!o.open, ...(o.locked ? { Locked: o.locked } : {}) } });
    draw();
  }, 'HingeDoor');
}
function slidingDoor(a, b, L, zFace, open, gname, o = {}) {
  // 위 레일(문틀과 같은 오크) + 바닥 레일
  const r0 = o.single ? Math.min(a - 0.3, a + o.dir * 10) : a - 0.3, r1 = o.single ? (o.dir > 0 ? b + (b - a) + 0.2 : b + 0.3) : b + 0.3;
  B('DoorTrack', r0, L + 7.2, zFace - 0.5, r1, L + 7.55, zFace, OAK_FRAME, 'Wood', { nc: true });
  B('FloorRail', r0 + 0.1, L, zFace - 0.46, r1 - 0.1, L + 0.035, zFace - 0.14, [176, 160, 120], 'Metal', { nc: true, ns: true, min: 0.03 });
  if (o.single) {
    const W = b - a + 0.2;
    doorLeaf(gname, a - 0.1, b + 0.1, L, zFace - 0.3, o.dir * (W - 0.3), open, { glass: true, handleAt: o.dir > 0 ? 'left' : 'right', lock: true });
    return;
  }
  const mid = (a + b) / 2;
  // 바깥 레일: 왼쪽 문짝(유리창, +X로 밀림) / 안쪽 레일: 오른쪽 문짝(-X로 밀려 왼쪽 문짝 뒤로)
  // 복도에서 보면 +X 쪽 문짝이 왼쪽에 보인다 → 유리창은 그 문짝에 (참고 사진처럼 왼쪽 문짝)
  doorLeaf(`${gname}_L`, a + 0.01, mid + 0.06, L, zFace - 0.41, mid - a - 0.3, false, { handleAt: 'left' });
  doorLeaf(`${gname}_R`, mid - 0.06, b - 0.01, L, zFace - 0.24, -(b - mid - 0.3), open, { glass: true, handleAt: 'right', lock: true });
}


// 화장실 한 쪽 (x0..x1). 동쪽 벽에 칸, 서쪽 벽에 세면대와 거울. 여자 쪽(women)은 칸 4개,
// 남자 쪽은 칸 2개 + 소변기 3개. 여자 쪽 세 번째 칸과 거울에는 이상현상 표시(tag)가 붙는다.
function restroomHalf(x0, x1, L, z0, z1, women) {
  const panel = [234, 218, 178], steel = [186, 190, 194], white = [246, 246, 242], so = { nc: true, ns: true };
  const sx0 = x1 - 5.4, nStall = women ? 4 : 2, key = women ? 'F' : 'M';
  for (let k = 0; k < nStall; k++) {
    const za = z0 + 1.0 + k * 5.2, zb = za + 5.2, mz = (za + zb) / 2;
    B('StallWall', sx0, L + 0.5, za - 0.08, x1, L + 7.0, za + 0.08, panel, 'SmoothPlastic');
    if (k === nStall - 1) B('StallWall', sx0, L + 0.5, zb - 0.08, x1, L + 7.0, zb + 0.08, panel, 'SmoothPlastic');
    B('StallFront', sx0 - 0.08, L + 0.5, za, sx0 + 0.08, L + 7.0, za + 0.9, panel, 'SmoothPlastic');
    B('StallFront', sx0 - 0.08, L + 0.5, zb - 0.9, sx0 + 0.08, L + 7.0, zb, panel, 'SmoothPlastic');
    // 스테인리스 틀: 기둥, 발, 위 가로대 (참고 사진)
    [za, zb].forEach((z) => {
      B('StallPost', sx0 - 0.12, L + 0.5, z - 0.12, sx0 + 0.12, L + 7.5, z + 0.12, steel, 'Metal', { nc: true, refl: 0.15 });
      cylV('StallFoot', sx0, L, z, 0.5, 0.22, steel, 'Metal', { nc: true, refl: 0.15 });
      B('StallEdge', sx0, L + 6.95, z - 0.1, x1, L + 7.05, z + 0.1, steel, 'Metal', { ...so, refl: 0.15 });
    });
    if (women && k === 2) {
      B('StallDoor', sx0 - 0.08, L + 0.5, za + 0.9, sx0 + 0.08, L + 7.0, zb - 0.9, panel, 'SmoothPlastic', { tag: ['StallDoor3', 'LockedDoor'], attr: { Locked: '(화장실 세 번째 칸) 사용 중. 안에서 잠겨 있다.' } });
      B('Occupied', sx0 - 0.12, L + 4.1, zb - 1.35, sx0 - 0.08, L + 4.3, zb - 1.05, [190, 30, 30], 'SmoothPlastic', so);
    } else hingeDoor(`Stall${key}_${Math.round(x0)}_${k + 1}`, [sx0 - 0.12, L + 0.5, za + 0.9, sx0 + 0.12, L + 7.0, zb - 0.9], [sx0, za + 0.9], -80, { open: k !== 1 }, () => {
      B('StallDoor', sx0 - 0.08, L + 0.5, za + 0.9, sx0 + 0.08, L + 7.0, zb - 0.9, panel, 'SmoothPlastic', { nc: true });
      B('StallLatch', sx0 - 0.14, L + 3.9, zb - 1.3, sx0 + 0.14, L + 4.2, zb - 1.0, steel, 'Metal', so);
    });
    // 쪼그려 앉는 변기 (화변기) + 벽에 붙은 물 내림 밸브
    B('SquatPan', x1 - 3.6, L + 0.04, mz - 0.75, x1 - 1.0, L + 0.32, mz + 0.75, white, 'SmoothPlastic');
    B('SquatBowl', x1 - 3.3, L + 0.33, mz - 0.4, x1 - 1.9, L + 0.35, mz + 0.4, [206, 212, 214], 'SmoothPlastic', { ...so, min: 0.02 });
    P('SquatHood', [1.1, 1.3, 1.5], [x1 - 1.35, L + 0.45, mz], white, 'SmoothPlastic', { sh: 'Ball' });
    cylV('FlushPipe', x1 - 0.3, L + 0.3, mz, 3.2, 0.16, steel, 'Metal', { nc: true, refl: 0.2 });
    B('FlushValve', x1 - 0.5, L + 3.4, mz - 0.18, x1 - 0.1, L + 3.8, mz + 0.18, steel, 'Metal', { nc: true, refl: 0.2 });
    B('FlushLever', x1 - 0.95, L + 3.55, mz - 0.05, x1 - 0.5, L + 3.65, mz + 0.05, steel, 'Metal', so);
    B('PaperHolder', x1 - 2.6, L + 2.3, za + 0.08, x1 - 1.8, L + 2.9, za + 0.3, steel, 'Metal', so);
    P('PaperRoll', [0.5, 0.45, 0.45], [x1 - 2.2, L + 2.45, za + 0.35], [250, 250, 246], 'SmoothPlastic', { sh: 'Cylinder', nc: true, ns: true });
    B('Bin', x1 - 4.6, L + 0.04, zb - 1.3, x1 - 3.9, L + 1.0, zb - 0.5, [120, 150, 190], 'Plastic', { nc: true });
  }
  B('StallTopRail', sx0 - 0.1, L + 7.4, z0 + 0.9, sx0 + 0.1, L + 7.55, z0 + 1.1 + nStall * 5.2, steel, 'Metal', { nc: true, refl: 0.15 });
  if (!women) {
    // 소변기 3개 + 칸막이
    for (let k = 0; k < 3; k++) {
      const z = z0 + 1.0 + nStall * 5.2 + 2.6 + k * 3.4;
      B('Urinal', x1 - 1.3, L + 1.1, z - 0.7, x1 - 0.06, L + 4.4, z + 0.7, white, 'SmoothPlastic');
      B('UrinalBowl', x1 - 1.5, L + 1.1, z - 0.6, x1 - 1.3, L + 2.2, z + 0.6, white, 'SmoothPlastic', { nc: true });
      B('UrinalInner', x1 - 1.32, L + 2.2, z - 0.5, x1 - 1.28, L + 4.1, z + 0.5, [214, 220, 222], 'SmoothPlastic', { ...so, min: 0.02 });
      cylV('UrinalPipe', x1 - 0.3, L + 4.4, z, 1.0, 0.14, steel, 'Metal', so);
      B('UrinalSensor', x1 - 0.12, L + 5.4, z - 0.25, x1 - 0.06, L + 5.9, z + 0.25, steel, 'Metal', so);
      if (k < 2) B('UrinalScreen', x1 - 1.8, L + 1.6, z + 1.62, x1 - 0.06, L + 5.2, z + 1.78, panel, 'SmoothPlastic', { nc: true });
    }
  }
  // 세면대 + 거울 (서쪽 벽)
  const cz0 = z0 + 6, cz1 = women ? z1 - 4 : z0 + 15;
  B('Counter', x0, L + 2.6, cz0, x0 + 2.4, L + 2.9, cz1, [210, 206, 200], 'Marble');
  B('CounterApron', x0 + 2.2, L + 1.9, cz0, x0 + 2.4, L + 2.6, cz1, [196, 192, 186], 'Marble', { nc: true });
  for (let z = cz0 + 2; z < cz1 - 1; z += 3.6) {
    P('Basin', [0.25, 1.6, 1.6], [x0 + 1.3, L + 2.85, z], white, 'SmoothPlastic', { sh: 'Cylinder', r: [0, 0, 90] });
    cylBetween('Faucet', [x0 + 0.4, L + 2.9, z], [x0 + 0.4, L + 3.6, z], 0.15, steel, 'Metal', { nc: true });
    cylBetween('Faucet', [x0 + 0.4, L + 3.6, z], [x0 + 1.0, L + 3.6, z], 0.12, steel, 'Metal', { nc: true });
    P('Soap', [0.35, 0.2, 0.5], [x0 + 0.5, L + 3.0, z + 1.2], [120, 200, 150], 'SmoothPlastic', so);
  }
  B('Mirror', x0, L + 4.0, cz0 + 0.5, x0 + 0.08, L + 8.0, cz1 - 0.5, [200, 210, 214], 'Glass', { refl: 0.85, tag: women ? 'RestroomMirror' : undefined });
  // 바닥 배수구, 대걸레와 양동이, 손 건조기
  const dx = (x0 + sx0) / 2 + 1, dz = (z0 + z1) / 2;
  B('Drain', dx - 0.5, L + 0.04, dz - 0.5, dx + 0.5, L + 0.06, dz + 0.5, [150, 152, 156], 'Metal', { ...so, min: 0.02 });
  for (let i = -1; i <= 1; i++) B('DrainSlot', dx - 0.35, L + 0.06, dz + i * 0.25 - 0.04, dx + 0.35, L + 0.07, dz + i * 0.25 + 0.04, [40, 40, 42], 'Metal', { ...so, min: 0.01 });
  rod('MopHandle', [x0 + 0.5, L + 0.3, z1 - 1.6], [x0 + 0.25, L + 5.6, z1 - 1.2], 0.12, [70, 110, 190], 'SmoothPlastic', so);
  B('MopHead', x0 + 0.2, L + 0.04, z1 - 2.0, x0 + 1.0, L + 0.4, z1 - 1.3, [220, 216, 204], 'Fabric', so);
  cylV('Bucket', x0 + 1.6, L + 0.04, z1 - 1.4, 1.1, 1.2, [60, 120, 190], 'Plastic', { nc: true });
  B('HandDryer', x0, L + 4.2, z0 + 3.2, x0 + 0.5, L + 5.4, z0 + 4.4, [236, 236, 232], 'SmoothPlastic', { nc: true });
}

function interiorRoom(r) {
  const { xa, xb, L, name } = r;
  const z0 = PART1, z1 = ROOM1, zc = (z0 + z1) / 2;
  const top = L + CEIL;
  const restroom = name === '화장실';
  const doors = roomDoors(r);
  if (restroom) {
    // 2010년대 학교 화장실: 누런 벽 타일(천장까지), 청회색 바닥 타일. 가운데 벽으로 남·여를 나눈다
    const tile = [206, 196, 160], xm = xa + 15;
    B('TileN', xa, L, z0, xb, L + CEIL, z0 + 0.06, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileS', xa, L, z1 - 0.06, xb, L + 3.0, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileW', xa, L, z0, xa + 0.06, L + CEIL, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileE', xb - 0.06, L, z0, xb, L + CEIL, z1, tile, 'CeramicTiles', { nc: true, ns: true });
    B('TileFloor', xa, L, z0, xb, L + 0.04, z1, [128, 146, 140], 'CeramicTiles', { ns: true });
    B('DividerWall', xm - 0.3, L, z0, xm + 0.3, L + CEIL, z1, tile, 'CeramicTiles');
  } else {
    wainscot('x', xa, xb, z0, 1, L, doors);
    wainscot('x', xa, xb, z1, -1, L, [], { h: 2.6 });
    wainscot('z', z0, z1, xa, 1, L);
    wainscot('z', z0, z1, xb, -1, L);
  }
  ceiling(xa, xb, z0, z1, top);
  const classLike = isClass(name) || ['과학실', '음악실', '미술실'].includes(name);
  P('SmokeDetector', [0.12, 0.7, 0.7], [xa + 17, top - 0.06, zc], [238, 238, 236], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 0, 90], nc: true, ns: true });
  if (!restroom) {
    // 커튼: 창 양옆으로 걷어 둔 주름 커튼 (주름 = 세로 원기둥, 레일 고리, 묶는 끈)
    const cz = z1 - 0.62, ctop = L + CEIL - 0.42;
    for (let k = 0; k < 3; k++) {
      const u0 = xa + 1.2 + k * 9.4, u1 = u0 + 8.8;
      [[u0 - 0.25, u0 + 1.25, 1], [u1 - 1.25, u1 + 0.25, -1]].forEach(([a, b, dir]) => {
        // 촘촘한 주름: 가는 원기둥이 서로 겹치며 앞뒤로 물결친다 (아래로 갈수록 살짝 퍼짐)
        const n = 11, w = (b - a) / n, col = jit([226, 214, 188], 5);
        for (let q = 0; q < n; q++) {
          const x = a + (q + 0.5) * w, d = 0.2 + rnd() * 0.05, wave = Math.sin(q * 1.9) * 0.07;
          const c2 = col.map((v) => v - (wave < 0 ? 16 : 0) - rnd() * 6);
          rod('CurtainFold', [x, ctop, cz + wave * 0.6], [x + (q - n / 2) * 0.012, L + 2.55 + rnd() * 0.06, cz + wave], d, c2, 'SmoothPlastic', { nc: true, ns: wave < 0 });
          if (q % 2 === 0) P('CurtainRing', [0.04, 0.16, 0.16], [x, ctop + 0.06, cz], [196, 198, 202], 'Metal', { nc: true, ns: true, sh: 'Cylinder', min: 0.03 });
        }
        B('CurtainHeader', a - 0.02, ctop - 0.22, cz - 0.13, b + 0.02, ctop, cz + 0.13, col.map((v) => v - 8), 'SmoothPlastic', { nc: true, ns: true });
      });
    }
    B('CurtainRail', xa + 0.6, L + CEIL - 0.34, cz - 0.07, xb - 0.6, L + CEIL - 0.26, cz + 0.07, [228, 228, 224], 'Metal', { nc: true, ns: true });
    for (let x = xa + 2; x < xb - 1; x += 5.2) B('RailBracket', x - 0.05, L + CEIL - 0.26, cz - 0.05, x + 0.05, L + CEIL, cz + 0.05, [228, 228, 224], 'Metal', { nc: true, ns: true });
  }
  grp(name, () => {
    const roomIdx = r.f * 8 + r.i * 2 + (r.wing === 'R' ? 1 : 0);
    const so = { nc: true, ns: true };
    // 천장: 2등용 형광등 (밤이라 꺼져 있음, 앞문 옆 스위치로 켠다). 교실은 3열 × 2줄
    const lampRows = restroom ? [[xa + 7.5, zc], [xa + 22.5, zc]]
      : [xa + 11.5, xa + 22.5].flatMap((x) => [zc - 7.6, zc, zc + 7.6].map((z) => [x, z]));
    lampRows.forEach(([x, z], i) => fluoro(x, z, top, { tag: i === 1 ? ['RoomFixture', 'RoomLight'] : 'RoomFixture',
      light: { type: 'Surface', face: 'Bottom', range: 18, angle: 90, brightness: 0, color: [236, 240, 255], enabled: false, shadows: i === 1 || i === 4 } }));
    // 천장·벽까지 은은하게 밝히는 보조등 (보이지 않는 점광원, 스위치로 함께 켜짐)
    (restroom ? [xa + 7.5, xa + 22.5] : [xa + 11.5, xa + 22.5]).forEach((x) => P('LampFill', [0.2, 0.2, 0.2], [x, top - 2.8, zc], [255, 255, 255], 'SmoothPlastic',
      { t: 1, hidden: true, light: { type: 'Point', range: 17, brightness: 0, color: [232, 236, 250], enabled: false } }));
    // 앞문 옆 전등 스위치 (불 켜기 / 끄기)
    const swz = restroom ? z0 + 0.06 : z0, swx = restroom ? xa + 6.0 : xa + 7.2;
    B('SwitchPlate', swx, L + 4.0, swz, swx + 0.5, L + 4.75, swz + 0.05, [240, 240, 236], 'SmoothPlastic', { nc: true, ns: true, tag: 'RoomSwitch', attr: { Room: name } });
    for (let k = 0; k < 3; k++) B('Switch', swx + 0.06 + k * 0.14, L + 4.22, swz + 0.05, swx + 0.16 + k * 0.14, L + 4.52, swz + 0.09, [250, 250, 248], 'SmoothPlastic', { nc: true, ns: true, min: 0.03 });
    if (classLike) {
      // ── 앞벽: 칠판, 태극기, 급훈, 시계, 방송 스피커 ──
      blackboard(xa, L, zc, roomIdx, isClass(name));
      taegeukgi([xa, L + 9.3, zc], BOARD_R, BOARD_U, BOARD_N, 1.2);
      mottoFrame([xa, L + 9.3, zc + 4.7], BOARD_R, BOARD_U, BOARD_N);
      const spooky = name === '3-4', mm = 58 + ((roomIdx * 5) % 7);
      wallClock([xa, L + 9.3, zc - 4.6], BOARD_N, BOARD_U, 1.15, { tag: 'ClassClock', h: spooky ? 4 : mm >= 60 ? 10 : 9, m: spooky ? 44 : mm % 60, s: (roomIdx * 13) % 60 });
      paSpeaker([xa + 0.05, L + 9.35, z0 + 3.0], [1, 0, 0]);
      // ── 앞쪽 구석: 스탠드 에어컨(복도 쪽), 천장 TV(창문 쪽), 교탁, 교사용 책상 ──
      standAC(xa + 0.12, z0 + 0.45, L);
      ceilingTV(xa + 2.5, z1 - 3.7, top, L + 7.35, [xa + 18, L + 3, zc]);
      if (name !== '미술실') lectern(xa + 3.75, zc, L);
      teacherDesk(xa + 3.0, z1 - 7.7, L);
      boardLight(xa + 2.9, zc - 2.2, top);
      boardLight(xa + 2.9, zc + 2.2, top);
      orbitFan(xa + 17, zc - 3.8, top, 30 + roomIdx * 17);
      orbitFan(xa + 17, zc + 3.8, top, 200 + roomIdx * 23);
      // 스위치 옆 선풍기 조절기
      B('FanControl', xa + 7.82, L + 4.0, z0, xa + 8.18, L + 4.75, z0 + 0.06, [240, 240, 236], 'SmoothPlastic', so);
      P('FanDial', [0.05, 0.22, 0.22], [xa + 8.0, L + 4.45, z0 + 0.08], [70, 72, 76], 'SmoothPlastic', { ...so, sh: 'Cylinder', r: [0, 90, 0], min: 0.03 });
    }
    if (isClass(name)) {
      timetable([xa + 9.9, L + 5.8, z0], [1, 0, 0], [0, 1, 0], [0, 0, 1], `${name[0]}학년 ${name[2]}반 시간표`, roomIdx);
      // 책상: 2인 1조 3분단 × 5줄
      for (let rr = 0; rr < 5; rr++) for (let p = 0; p < 3; p++) for (let s = 0; s < 2; s++) {
        deskSet(xa + 9.3 + rr * 3.9, zc + (p - 1) * 7.6 + (s ? 1.2 : -1.2), L, `Desk_${rr + 1}_${p * 2 + s + 1}`, { side: s ? 1 : -1 });
      }
      // ── 뒷벽: 사물함, 학급 게시판, 청소함, 쓰레기통 ──
      const lz1 = z1 - 4.3;
      B('Lockers', xb - 1.6, L, z0 + 1.2, xb - 0.06, L + 4.8, lz1, [176, 150, 112], 'Wood');
      const lw = (lz1 - (z0 + 1.2)) / Math.floor((lz1 - (z0 + 1.2)) / 1.85);
      for (let za = z0 + 1.2; za < lz1 - 0.1; za += lw) for (let row = 0; row < 2; row++) {
        const y0 = L + 0.3 + row * 2.25;
        B('LockerDoor', xb - 1.66, y0 + 0.05, za + 0.06, xb - 1.6, y0 + 2.15, za + lw - 0.06, jit([214, 196, 160], 10), 'Wood', { nc: true });
        B('NameTag', xb - 1.68, y0 + 1.75, za + lw * 0.3, xb - 1.66, y0 + 2.0, za + lw * 0.7, [246, 246, 242], 'SmoothPlastic', so);
        B('Knob', xb - 1.74, y0 + 1.0, za + lw * 0.47, xb - 1.66, y0 + 1.25, za + lw * 0.53, [40, 40, 42], 'Metal', so);
      }
      const gz0 = z0 + 4.4, gz1 = z1 - 4.4, al = [186, 188, 190];
      B('BoardFelt', xb - 0.12, L + 5.35, gz0, xb, L + 9.4, gz1, [86, 124, 96], 'Fabric', { nc: true });
      B('FeltTrim', xb - 0.18, L + 9.4, gz0 - 0.1, xb, L + 9.55, gz1 + 0.1, al, 'Metal', so);
      B('FeltTrim', xb - 0.18, L + 5.2, gz0 - 0.1, xb, L + 5.35, gz1 + 0.1, al, 'Metal', so);
      B('FeltTrim', xb - 0.18, L + 5.35, gz0 - 0.1, xb, L + 9.4, gz0, al, 'Metal', so);
      B('FeltTrim', xb - 0.18, L + 5.35, gz1, xb, L + 9.4, gz1 + 0.1, al, 'Metal', so);
      B('BoardTitle', xb - 0.15, L + 8.6, zc - 3.4, xb - 0.12, L + 9.2, zc + 3.4, [250, 246, 236], 'SmoothPlastic', { ...so,
        text: { face: 'Left', text: ['꿈을 향해 한 걸음 더', '우리 반 이야기', '함께라서 즐거운 우리 반'][roomIdx % 3], color: [38, 70, 140], bg: [250, 246, 236], bgT: 0, lit: 1, font: 'GothamBlack', pps: 60 } });
      const notes = [
        ['급식 식단표\n월  카레라이스\n화  비빔밥\n수  짜장밥\n목  돈까스\n금  떡볶이', [255, 244, 200]],
        ['청소 당번표\n1분단  교실 바닥\n2분단  복도\n3분단  창문 · 칠판\n※ 분리수거 철저', [214, 236, 255]],
        ['학급 규칙\n1. 지각하지 않기\n2. 휴대폰은 아침에 제출\n3. 해 지기 전에 하교\n4. 밤에 교실에 오지 않기', [255, 222, 222]],
        ['모의고사 일정\n11/18 (수)\n3교시 영어 듣기\n준비물: 컴퓨터용 사인펜', [226, 244, 214]],
        ['진로 정보\n수시 원서 접수 안내\n대학별 고사 일정\n상담은 교무실로', [244, 230, 255]],
        ['칭찬 릴레이\n민지 → 서준\n서준 → 하은\n하은 → 도윤\n도윤 → ', [255, 236, 214]],
      ];
      for (let i = 0; i < 6; i++) {
        const z = gz0 + 0.45 + i * ((gz1 - gz0 - 0.9) / 6) + rnd() * 0.2;
        const [t, col] = notes[(i + roomIdx) % 6];
        B('Notice', xb - 0.16, L + 5.75 + rnd() * 0.4, z, xb - 0.13, L + 8.2 + rnd() * 0.15, z + 1.9, col, 'SmoothPlastic', { ...so, r: [(rnd() - 0.5) * 3, 0, 0],
          text: { face: 'Left', text: t, color: [40, 40, 50], bgT: 1, lit: 1, font: 'GothamBold', pps: 60, align: 'Left' } });
        P('Pin', [0.06, 0.1, 0.1], [xb - 0.18, L + 8.05, z + 0.95], pick([[220, 40, 40], [40, 90, 210], [240, 200, 40]]), 'SmoothPlastic', { ...so, sh: 'Cylinder', min: 0.03 });
      }
      // 청소함: 사물함 옆, 창가 커튼에 닿지 않게 (앞면은 -X)
      const ka = z1 - 4.05, kb = z1 - 1.45, kx = xb - 2.0;
      B('CleaningCabinet', kx, L, ka, xb - 0.06, L + 6.6, kb, [196, 200, 204], 'Metal');
      B('CabinetSeam', kx - 0.02, L + 0.2, (ka + kb) / 2 - 0.02, kx + 0.01, L + 6.4, (ka + kb) / 2 + 0.02, [120, 124, 128], 'Metal', { ...so, min: 0.03 });
      [(ka + kb) / 2 - 0.3, (ka + kb) / 2 + 0.3].forEach((z) => B('CabinetPull', kx - 0.08, L + 3.0, z - 0.05, kx, L + 3.8, z + 0.05, [80, 82, 86], 'Metal', so));
      for (let k = 0; k < 4; k++) B('CabinetVent', kx - 0.02, L + 5.6 + k * 0.18, ka + 0.3, kx + 0.01, L + 5.66 + k * 0.18, ka + 1.1, [110, 114, 118], 'Metal', { ...so, min: 0.03 });
      B('CabinetLabel', kx - 0.02, L + 4.6, ka + 0.25, kx, L + 5.1, ka + 1.0, [246, 246, 240], 'SmoothPlastic', { ...so, min: 0.02,
        text: { face: 'Left', text: '청소함', color: [30, 30, 30], bgT: 1, lit: 1, font: 'GothamBlack', pps: 100 } });
      cylV('TrashBin', xb - 4.2, L, z1 - 1.2, 1.9, 1.5, [70, 130, 190], 'Plastic');
      cylV('RecycleBin', xb - 6.0, L, z1 - 1.2, 1.9, 1.5, [210, 180, 50], 'Plastic');
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
      restroomHalf(xa, xa + 14.7, L, z0, z1, false);
      restroomHalf(xa + 15.3, xb, L, z0, z1, true);
      B('RestroomSpot', xa + 21, L, zc - 1, xa + 23, L + 0.1, zc + 1, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'RestroomSpot', attr: { Floor: r.f + 1 } });
    }
  }, isClass(name) ? 'Classroom' : restroom ? 'Restroom' : 'SpecialRoom');
}

// ═════════════ 계단실: 올라가는 계단 → 중간 계단참 → 되돌아 올라가는 계단 ═════════════
// 틀 F: 원점 = 들어가는 쪽 가장자리 한가운데(1층 바닥 높이는 levels 로), +Z = 계단이 뻗는 쪽, X = 폭.
// 올라가는 계단은 X<0 쪽, 위층에 닿는 계단은 X>0 쪽. W = 반폭, g = 두 계단 사이 반틈, R = 계단 길이, LD = 계단참 깊이
const STEP_C = [176, 178, 172], BAL_C = [150, 156, 152], CAP_C = [34, 34, 36];
function uStair(F, o) {
  const { W, g, R, LD, levels } = o, n = 12, rise = FH / 2 / n, run = R / n;
  const ang = Math.atan2(FH / 2, R), sn = Math.sin(ang), cs = Math.cos(ang), len = Math.hypot(FH / 2, R);
  // 비탈을 따라 놓는 판 (dir = +1: +Z 로 갈수록 올라감, -1: 내려감)
  const slope = (name, x0, x1, yMid, dir, hPerp, col, mat, op) => FP(F, name, [x1 - x0, hPerp, len], [(x0 + x1) / 2, yMid, R / 2], col, mat,
    { ...op, axes: [[1, 0, 0], [0, cs, -dir * sn], [0, dir * sn, cs]] });
  levels.forEach((L, li) => {
    const last = li === levels.length - 1;
    if (last && !o.toTop) {
      // 맨 위층: 올라가는 계단 자리를 난간벽으로 막는다
      FB(F, 'GuardWall', -W, L, 0, -g + 0.5, L + 3.6, 0.5, BAL_C, 'Plaster');
      FB(F, 'GuardCap', -W, L + 3.6, -0.06, -g + 0.56, L + 3.78, 0.56, CAP_C, 'Wood', { nc: true });
      return;
    }
    const ym = L + FH / 2;
    for (let i = 0; i < n; i++) {
      // 올라가는 계단 (X<0)
      FB(F, 'Step', -W, L + i * rise - 0.5, i * run, -g, L + (i + 1) * rise, (i + 1) * run, STEP_C, 'Marble');
      FB(F, 'Nosing', -W, L + (i + 1) * rise - 0.02, i * run, -g, L + (i + 1) * rise + 0.03, i * run + 0.3, [50, 50, 52], 'Rubber', { nc: true, ns: true });
      // 위층에 닿는 계단 (X>0): 계단참(z=R)에서 들어온 쪽(z=0)으로 올라간다
      const y2 = ym + i * rise;
      FB(F, 'Step', g, y2 - 0.5, R - (i + 1) * run, W, y2 + rise, R - i * run, STEP_C, 'Marble');
      FB(F, 'Nosing', g, y2 + rise - 0.02, R - i * run - 0.3, W, y2 + rise + 0.03, R - i * run, [50, 50, 52], 'Rubber', { nc: true, ns: true });
    }
    // 계단 밑면 (매끈한 비탈)
    slope('Soffit', -W, -g, L + FH / 4 - 0.75, 1, 0.5, [224, 222, 214], 'Plaster', { nc: true, ns: true });
    slope('Soffit', g, W, ym + FH / 4 - 0.75, -1, 0.5, [224, 222, 214], 'Plaster', { nc: true, ns: true });
    FB(F, 'Landing', -W, ym - 1, R, W, ym, R + LD, STEP_C, 'Marble');
    // 안쪽 난간벽: 회색 벽 + 검은 손스침 (참고 사진)
    slope('Balustrade', -g, -g + 0.5, L + FH / 4 + 1.9, 1, 3.4, BAL_C, 'Plaster');
    slope('HandrailCap', -g - 0.07, -g + 0.57, L + FH / 4 + 3.7, 1, 0.2, CAP_C, 'Wood', { nc: true });
    slope('Balustrade', g - 0.5, g, ym + FH / 4 + 1.9, -1, 3.4, BAL_C, 'Plaster');
    slope('HandrailCap', g - 0.57, g + 0.07, ym + FH / 4 + 3.7, -1, 0.2, CAP_C, 'Wood', { nc: true });
    // 계단참 쪽 난간벽 끝 기둥, 들어가는 쪽 끝 기둥
    FB(F, 'Newel', -g, ym - 1, R - 0.25, g, ym + 3.9, R + 0.25, BAL_C, 'Plaster');
    FB(F, 'Newel', -g, L, -0.25, g, L + 3.9, 0.25, BAL_C, 'Plaster');
    // 바깥벽 쪽 손잡이 봉
    [[-W + 0.25, 1, L], [W - 0.25, -1, ym]].forEach(([x, dir, y0]) => slope('WallRail', x - 0.09, x + 0.09, y0 + FH / 4 + 3.1, dir, 0.18, CAP_C, 'Wood', { nc: true, ns: true }));
    // 1층: 위층 계단 밑은 막아 둔다 (창고)
    if (li === 0) FB(F, 'UnderWall', g, L, 0, W, L + FH - 0.9, 0.5, C.wallIvory, 'Plaster');
    // 벽 아래 띠 (계단참)
    FB(F, 'LandingBand', -W, ym, R + LD - 0.06, W, ym + 3.5, R + LD, C.wainscot, 'Plaster', { nc: true, ns: true });
  });
}

grp('MainBuilding', () => {
  B('Foundation', BX0 - 0.4, 0, ZN - 0.4, BX1 + 0.4, 1, ZS + 0.4, [140, 136, 130], 'Concrete');
  for (let f = 0; f < 4; f++) {
    const y1 = f < 3 ? LV[f] : ROOFY, y0 = y1 - 1;
    const deck = f === 3;
    const corr = deck ? C.roofGreen : C.corridorFloor, cm = deck ? 'Concrete' : 'Granite';
    const room = deck ? C.roofGreen : C.classFloor, rm = deck ? 'Concrete' : 'WoodPlanks';
    const hall = deck ? C.roofGreen : C.hallFloor, hm = deck ? 'Concrete' : 'Granite';
    const ya = f === 0 ? 0.9 : y0;
    B('CorridorFloor', BX0, ya, ZN, BX1, y1, PART1, corr, cm);
    B('WingFloor', BX0, ya, PART1, HALL0, y1, ZS, room, rm);
    B('WingFloor', HALL1, ya, PART1, BX1, y1, ZS, room, rm);
    if (!deck) {
      terrazzo(BX0 + 0.8, BX1 - 0.8, CORR0, PART0, y1, 4);
      terrazzo(HALL0, HALL1, PART1, ROOM1, y1, 4);
    }
    B('HallFloor', HALL0, ya, PART1, HALL1, y1, ZS, hall, hm);
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
      if (f === 0) southHoles.push({ u0: -8, u1: 8, v0: L, v1: L + 9.4 });
      else { southHoles.push({ u0: -8.5, u1: 8.5, v0: L - 1.5, v1: L + 10.6 }); slider('x', -8.5, 0, L - 1.5, L + 10.6, ROOM1 + 0.4); slider('x', 0, 8.5, L - 1.5, L + 10.6, ROOM1 + 0.4); }
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ROOM1, ZS, southHoles, C.facade, 'Plaster');
      if (f === 0) {
        // 현관 (참고 사진): 알루미늄 틀 + 옆 고정 유리 + 유리문 네 짝(두 쌍) + 문 위 채광창
        const zf = ROOM1 + 0.4, al = C.alumDark, gl = [130, 160, 170];
        [-8, -7.15, -0.15, 7, 7.85].forEach((x) => B('EntranceFrame', x, L, zf - 0.2, x + (x === -0.15 ? 0.3 : 0.15), L + 9.4, zf + 0.2, al, 'Metal'));
        B('EntranceFrame', -8, L + 7.4, zf - 0.2, 8, L + 7.7, zf + 0.2, al, 'Metal');
        B('EntranceFrame', -8, L + 9.2, zf - 0.2, 8, L + 9.4, zf + 0.2, al, 'Metal');
        [[-7.85, -7.15], [7.15, 7.85]].forEach(([a, b]) => B('SideLight', a, L + 0.05, zf - 0.05, b, L + 7.4, zf + 0.05, gl, 'Glass', { t: 0.55, refl: 0.15 }));
        [[-7.85, -0.15], [0.15, 7.85]].forEach(([a, b]) => B('Transom', a, L + 7.7, zf - 0.05, b, L + 9.2, zf + 0.05, gl, 'Glass', { t: 0.55, refl: 0.15 }));
        [[-7, -3.5, -7, -90], [-3.5, -0.15, -0.15, 90], [0.15, 3.5, 0.15, -90], [3.5, 7, 7, 90]].forEach(([a, b, hx, sw], i) => {
          hingeDoor(`EntranceDoor${i + 1}`, [a, L + 0.05, zf - 0.15, b, L + 7.4, zf + 0.15], [hx, zf], sw, {}, () => {
            B('EntranceGlass', a + 0.2, L + 0.5, zf - 0.03, b - 0.2, L + 7.2, zf + 0.03, gl, 'Glass', { t: 0.55, refl: 0.15, nc: true, tag: i === 0 ? 'EntranceDoor' : undefined });
            [[a, a + 0.2], [b - 0.2, b]].forEach(([u0, u1]) => B('DoorStile', u0, L + 0.05, zf - 0.08, u1, L + 7.4, zf + 0.08, al, 'Metal', { nc: true }));
            B('DoorRail', a, L + 0.05, zf - 0.08, b, L + 0.5, zf + 0.08, al, 'Metal', { nc: true });
            B('DoorRail', a, L + 7.2, zf - 0.08, b, L + 7.4, zf + 0.08, al, 'Metal', { nc: true });
            const px = Math.abs(hx - a) < 0.01 ? b - 0.45 : a + 0.45;
            [zf - 0.22, zf + 0.22].forEach((z) => rod('PullHandle', [px, L + 2.6, z], [px, L + 4.8, z], 0.14, C.steel, 'Metal', { nc: true, ns: true }));
          });
        });
      }
      const northHoles = [];
      for (let x = BX0 + 5; x < BX1 - 12; x += 15.5) if (Math.abs(x + 5) > CS.W + 5.5) northHoles.push({ u0: x, u1: x + 10, v0: L + 3.6, v1: L + 9.4 });
      // 중앙 계단실로 들어가는 넓은 입구
      wallHoles('ExteriorWall', 'x', BX0, BX1, L - 1, top, ZN, CORR0, [...northHoles, { u0: -CS.W, u1: CS.W, v0: L, v1: L + CEIL }], C.facade, 'Plaster');
      northHoles.forEach((h) => {
        slider('x', h.u0, h.u1, h.v0, h.v1, ZN + 0.4);
        B('Sill', h.u0 - 0.2, h.v0 - 0.25, ZN - 0.7, h.u1 + 0.2, h.v0, ZN + 0.1, [196, 192, 184], 'Concrete');
      });
      [[BX0, BX0 + 0.8, -1], [BX1 - 0.8, BX1, 1]].forEach(([x0, x1, s]) => {
        // 서쪽 끝 벽은 끝 교실(2-4·3-4)의 칠판 벽이라 창문을 내지 않는다
        const roomWin = s > 0;
        const holes = [{ u0: TS.z0, u1: TS.z1, v0: L, v1: L + 7.6 }];
        if (roomWin) holes.push({ u0: -158, u1: -142, v0: L + 3.4, v1: L + 9.4 });
        wallHoles('EndWall', 'z', ZN, ZS, L - 1, top, x0, x1, holes, C.facade, 'Plaster');
        if (roomWin) slider('z', -158, -142, L + 3.4, L + 9.4, (x0 + x1) / 2);
        B('StairCasing', x0, L + 7.6, TS.z0 - 0.2, x1, L + 7.8, TS.z1 + 0.2, C.alumDark, 'Metal', { nc: true, ns: true });
        const sx = s > 0 ? x0 - 0.35 : x1 + 0.05;
        B('ExitSign', sx, L + 7.85, -169.4, sx + 0.3, L + 9.05, -165.6, [24, 168, 86], 'Neon', { nc: true, ns: true, tag: 'ExitSign',
          light: { type: 'Point', range: 9, brightness: 0.5, color: [60, 255, 140] } });
        exitPictogram([s > 0 ? sx : sx + 0.3, L + 8.45, -167.5], [0, 0, s > 0 ? 1 : -1], [0, 1, 0], [s > 0 ? -1 : 1, 0, 0], 1.0);
        wainscot('z', CORR0, PART0, s > 0 ? x0 : x1, -s, L, [[TS.z0, TS.z1]]);
      });
      fr.forEach((r) => {
        const restroom = r.name === '화장실';
        const doorList = roomDoors(r);
        const holes = doorList.flatMap(([a, b]) => (restroom ? [{ u0: a, u1: b, v0: L, v1: L + 7.2 }] : [{ u0: a, u1: b, v0: L, v1: L + 7.2 }, { u0: a, u1: b, v0: L + 7.55, v1: L + 9.3 }]));
        if (!restroom) holes.push({ u0: r.xa + 8, u1: r.xb - 8, v0: L + 7.6, v1: L + 9.4 });
        wallHoles('PartitionWall', 'x', r.xa - WALL / 2, r.xb + WALL / 2, L, top, PART0, PART1, holes, C.wallIvory, 'Plaster');
        if (!restroom) {
          const hw = r.xb - r.xa - 16;
          for (let k = 0; k < 3; k++) slider('x', r.xa + 8 + (k * hw) / 3, r.xa + 8 + ((k + 1) * hw) / 3, L + 7.6, L + 9.4, (PART0 + PART1) / 2, { depth: 0.6 });
        }
        if (restroom) doorList.forEach(([a, b], di) => {
          // 화장실: 갈색 나무 여닫이문 (안쪽으로 열림) + 남·여 표지
          const brown = [112, 66, 44], so = { nc: true, ns: true }, women = di === 1;
          B('Casing', a - 0.25, L, PART0 - 0.1, a, L + 7.45, PART1 + 0.1, [84, 50, 34], 'Wood');
          B('Casing', b, L, PART0 - 0.1, b + 0.25, L + 7.45, PART1 + 0.1, [84, 50, 34], 'Wood');
          B('Casing', a - 0.25, L + 7.2, PART0 - 0.1, b + 0.25, L + 7.45, PART1 + 0.1, [84, 50, 34], 'Wood');
          hingeDoor(`Door_${women ? '여자' : '남자'}화장실`, [a, L + 0.05, PART0 + 0.1, b, L + 7.2, PART0 + 0.4], [a + 0.05, PART0 + 0.25], -92, {}, () => {
            B('WoodDoor', a + 0.03, L + 0.05, PART0 + 0.17, b - 0.03, L + 7.2, PART0 + 0.33, brown, 'Wood', { nc: true });
            B('KickPlate', a + 0.2, L + 0.15, PART0 + 0.15, b - 0.2, L + 0.9, PART0 + 0.35, [176, 178, 182], 'Metal', { ...so, refl: 0.1 });
            [PART0 + 0.08, PART0 + 0.42].forEach((z) => { P('Knob', [0.22, 0.22, 0.22], [b - 0.35, L + 3.5, z], [196, 176, 110], 'Metal', { ...so, sh: 'Ball', refl: 0.2 }); });
            B('DoorSign', a + 0.9, L + 5.2, PART0 + 0.13, b - 0.9, L + 6.4, PART0 + 0.17, women ? [200, 52, 70] : [40, 84, 170], 'SmoothPlastic', { ...so, min: 0.02,
              text: { face: 'Front', text: women ? '여' : '남', color: [255, 255, 255], bgT: 1, lit: 1, font: 'GothamBlack', pps: 90 } });
          });
          B('WcSign', a - 0.25, L + 7.7, PART0 - 0.14, b + 0.25, L + 8.6, PART0, women ? [200, 52, 70] : [40, 84, 170], 'SmoothPlastic', { ...so,
            text: { face: 'Front', text: women ? '여자 화장실' : '남자 화장실', color: [255, 255, 255], bgT: 1, lit: 1, font: 'GothamBold', pps: 70 } });
        });
        else doorList.forEach(([a, b], di) => {
          // 오크 문틀 + 위쪽 채광창 (유리 2장, 가운데 살)
          const so = { nc: true, ns: true }, zm = (PART0 + PART1) / 2, mid = (a + b) / 2;
          // 교실 문은 문짝 두 장이 문틀 안에 들어가도록 옆 문틀을 복도 쪽으로 깊게
          const cz = PART0 - 0.52;
          B('Casing', a - 0.3, L, cz, a, L + 9.6, PART1 + 0.12, OAK_FRAME, 'Wood');
          B('Casing', b, L, cz, b + 0.3, L + 9.6, PART1 + 0.12, OAK_FRAME, 'Wood');
          B('Threshold', a, L, PART0 - 0.52, b, L + 0.04, PART0, OAK_FRAME, 'Wood', { nc: true, ns: true, min: 0.03 });
          B('Casing', a - 0.3, L + 9.3, PART0 - 0.12, b + 0.3, L + 9.6, PART1 + 0.12, OAK_FRAME, 'Wood');
          B('Casing', a, L + 7.2, PART0 - 0.12, b, L + 7.55, PART1 + 0.12, OAK_FRAME, 'Wood');
          B('TransomBar', mid - 0.1, L + 7.55, PART0 - 0.08, mid + 0.1, L + 9.3, PART1 + 0.08, OAK_FRAME, 'Wood');
          [[a, mid - 0.1], [mid + 0.1, b]].forEach(([u0, u1]) => B('TransomGlass', u0, L + 7.55, zm - 0.02, u1, L + 9.3, zm + 0.02, [178, 196, 202], 'Glass', { ...so, t: 0.55, refl: 0.12, min: 0.02 }));
          // 미닫이문: 쌍미닫이(오크 무늬)
          const ri = r.f * 8 + r.i * 2 + (r.wing === 'R' ? 1 : 0);
          slidingDoor(a, b, L, PART0, (ri + di) % 5 === 0, `Door_${r.name}_${di + 1}`, {});
        });
        const label = isClass(r.name) ? `${r.name[0]}학년 ${r.name[2]}반` : r.name;
        // 교실 번호판: 앞문 옆 벽에서 복도 쪽으로 튀어나온 양면 표지판 (위: 큰 반 번호, 아래: 남색 띠에 "2학년 1반")
        grp(`RoomSign_${r.name}`, () => {
          const xs = r.xa + 1.15, y0 = L + 7.85, y1 = L + 8.8, za = PART0 - 2.05, zb = PART0 - 0.18, metal = [150, 154, 160], so = { nc: true, ns: true };
          const big = isClass(r.name) ? r.name : r.name, small = isClass(r.name) ? label : `${r.f + 1}층`;
          B('SignMount', xs - 0.14, y1 - 0.06, PART0 - 0.1, xs + 0.14, y1 + 0.16, PART0, metal, 'Metal', so);
          B('SignArm', xs - 0.04, y1 + 0.02, za, xs + 0.04, y1 + 0.1, PART0 - 0.1, metal, 'Metal', so);
          B('SignFrame', xs - 0.09, y0 - 0.04, za - 0.04, xs + 0.09, y1 + 0.02, zb + 0.04, [190, 194, 198], 'Metal', { ...so, refl: 0.1 });
          const yb = y0 + 0.3;
          [[0, 'Right'], [-1, 'Left']].forEach(([sd, face]) => {
            const x0 = xs + sd * 0.1, x1 = x0 + 0.1;
            B('RoomSign', x0, yb, za, x1, y1 - 0.02, zb, [250, 250, 246], 'SmoothPlastic', { ...so, min: 0.04, tag: sd === 0 ? 'RoomSign' : undefined, attr: sd === 0 ? { Room: r.name } : undefined,
              text: { face, text: big, color: [26, 38, 78], bg: [250, 250, 246], bgT: 0, lit: 1, font: 'GothamBlack', pps: 90 } });
            B('RoomSignBand', x0, y0, za, x1, yb, zb, [30, 52, 104], 'SmoothPlastic', { ...so, min: 0.04,
              text: { face, text: small, color: [255, 255, 255], bg: [30, 52, 104], bgT: 0, lit: 1, font: 'GothamBold', pps: 90 } });
          });
        });
        if (r.xa - WALL > BX0 + 0.5 && !(r.xa - WALL >= HALL0 - 0.5 && r.xa <= HALL1 + 0.5)) B('RoomWall', r.xa - WALL, L, PART1, r.xa, top, ROOM1, C.wallIvory, 'Plaster');
        interiorRoom(r);
      });
      grp('Corridor', () => {
        ceiling(BX0 + 0.8, BX1 - 0.8, CORR0, PART0, L + CEIL);
        for (let x = BX0 + 9; x < BX1 - 5; x += 15.3) {
          const idx = Math.round((x - BX0) / 15.3);
          const on = Math.abs(x) < 40 || idx % 2 === 0;
          const fl = rnd() < 0.22;
          troffer(x, (CORR0 + PART0) / 2, L + CEIL, on, { w: 4, d: 1.2, tag: fl ? ['CorridorLight', 'FlickerLight'] : 'CorridorLight',
            light: { type: 'Surface', face: 'Bottom', range: 18, angle: 120, brightness: on ? 0.85 : 0, color: [214, 228, 255], enabled: on, shadows: true } });
        }
        wainscot('x', BX0 + 0.8, BX1 - 0.8, CORR0, 1, L, [[-CS.W, CS.W]]);
        fr.forEach((r) => {
          const restroom = r.name === '화장실';
          const doorList = restroom ? roomDoors(r).map(([a, b]) => [a - 0.25, b + 0.25]) : [[r.xa + 1.5, r.xa + 7.1], [r.xb - 7.1, r.xb - 1.5]];
          wainscot('x', r.xa - 0.3, r.xb + 0.3, PART0, -1, L, doorList);
          if (restroom) return;
          const a = r.xa + 9.2, b = r.xb - 9.2;
          B('HallLockers', a, L + 0.25, PART0 - 1.45, b, L + 6, PART0 - 0.02, [96, 112, 126], 'Metal');
          B('LockerBase', a + 0.05, L, PART0 - 1.4, b - 0.05, L + 0.25, PART0 - 0.05, [50, 54, 58], 'Metal');
          B('LockerTop', a - 0.05, L + 6, PART0 - 1.52, b + 0.05, L + 6.1, PART0, [120, 136, 150], 'Metal', { nc: true });
          const cols = Math.max(1, Math.round((b - a) / 1.55)), cw = (b - a) / cols, rows = 3, rh = 5.75 / rows;
          for (let c = 0; c < cols; c++) for (let rw = 0; rw < rows; rw++) {
            const x0 = a + c * cw, y0 = L + 0.25 + rw * rh;
            const col = jit([150, 168, 182], 6);
            B('LockerDoor', x0 + 0.04, y0 + 0.04, PART0 - 1.5, x0 + cw - 0.04, y0 + rh - 0.04, PART0 - 1.45, col, 'Metal', { nc: true });
            B('LockerVent', x0 + 0.35, y0 + rh - 0.6, PART0 - 1.515, x0 + cw - 0.35, y0 + rh - 0.32, PART0 - 1.5, [70, 80, 90], 'Metal', { nc: true, ns: true });
            B('LockerPull', x0 + cw - 0.32, y0 + rh * 0.42, PART0 - 1.56, x0 + cw - 0.18, y0 + rh * 0.62, PART0 - 1.5, [60, 62, 66], 'Metal', { nc: true, ns: true });
          }
        });
        // ── 북쪽 벽(창문 쪽): 창문과 창문 사이 벽(기둥)에만 물건을 붙인다 ──
        const piers = [];
        for (let i = 0; i < northHoles.length - 1; i++) {
          const a = northHoles[i].u1, b = northHoles[i + 1].u0;
          if (a < -CS.W && b > CS.W) { piers.push([a, -CS.W - 0.6]); piers.push([CS.W + 0.6, b]); } else piers.push([a, b]);
        }
        const pierNear = (x) => piers.reduce((b0, p0) => (Math.abs((p0[0] + p0[1]) / 2 - x) < Math.abs((b0[0] + b0[1]) / 2 - x) ? p0 : b0));
        const W0 = CORR0; // 벽 안쪽 면 (물건은 +Z 쪽으로 나옴)
        // 옥내소화전함 + 발신기 세트 (한국 학교 복도에 있는 그것)
        const hydrant = (cx) => grp('Hydrant', () => {
          const red = [176, 30, 32], x0 = cx - 1.25, x1 = cx + 1.25, D = 0.55;
          B('Cabinet', x0, L + 0.3, W0, x1, L + 6.3, W0 + D, red, 'Metal');
          B('Bezel', x0 - 0.06, L + 0.24, W0, x1 + 0.06, L + 6.36, W0 + 0.12, [150, 24, 26], 'Metal', { nc: true });
          // 위칸: 표시등, 경종, 발신기
          B('UpperDoor', x0 + 0.08, L + 4.65, W0 + D, x1 - 0.08, L + 6.22, W0 + D + 0.04, [188, 34, 36], 'Metal', { nc: true });
          P('PilotLamp', [0.14, 0.5, 0.5], [cx, L + 5.85, W0 + D + 0.1], [255, 46, 36], 'Neon', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true,
            light: { type: 'Point', range: 7, brightness: 0.45, color: [255, 40, 30] } });
          P('LampRim', [0.08, 0.62, 0.62], [cx, L + 5.85, W0 + D + 0.05], [200, 200, 196], 'Metal', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
          P('Bell', [0.6, 0.6, 0.6], [cx - 0.62, L + 5.08, W0 + D + 0.02], [196, 36, 36], 'Metal', { sh: 'Ball', nc: true, refl: 0.1 });
          B('ButtonPlate', cx + 0.34, L + 4.82, W0 + D + 0.04, cx + 0.92, L + 5.4, W0 + D + 0.08, [232, 230, 226], 'SmoothPlastic', { nc: true });
          P('Button', [0.08, 0.32, 0.32], [cx + 0.63, L + 5.11, W0 + D + 0.1], [210, 30, 30], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
          B('ButtonCover', cx + 0.38, L + 4.86, W0 + D + 0.08, cx + 0.88, L + 5.36, W0 + D + 0.16, [220, 230, 235], 'Glass', { t: 0.6, nc: true, ns: true });
          B('ButtonLabel', cx + 0.32, L + 4.68, W0 + D + 0.04, cx + 0.94, L + 4.8, W0 + D + 0.06, [232, 230, 226], 'SmoothPlastic', { nc: true, ns: true,
            text: { face: 'Back', text: '발신기', color: [30, 30, 30], bgT: 1, lit: 1, pps: 120 } });
          B('Divider', x0, L + 4.56, W0 + D, x1, L + 4.65, W0 + D + 0.05, [140, 22, 24], 'Metal', { nc: true, ns: true });
          // 아래칸: 소화전 문 (유리창 안에 접힌 호스와 밸브)
          B('LowerDoor', x0 + 0.08, L + 0.38, W0 + D, x1 - 0.08, L + 4.5, W0 + D + 0.04, [188, 34, 36], 'Metal', { nc: true });
          B('Window', cx - 0.85, L + 1.75, W0 + D + 0.02, cx + 0.85, L + 4.2, W0 + D + 0.06, [170, 186, 190], 'Glass', { t: 0.55, nc: true, ns: true, refl: 0.15 });
          for (let k = 0; k < 4; k++) P('HoseFold', [1.5, 0.42, 0.42], [cx - 0.05, L + 2.05 + k * 0.5, W0 + 0.3], [228, 222, 206], 'Fabric', { sh: 'Cylinder', nc: true });
          P('Nozzle', [0.9, 0.18, 0.18], [cx + 0.45, L + 3.95, W0 + 0.35], [40, 40, 42], 'Metal', { sh: 'Cylinder', r: [0, 0, 20], nc: true });
          P('Valve', [0.32, 0.32, 0.32], [cx - 0.75, L + 1.95, W0 + 0.3], [190, 150, 70], 'Metal', { sh: 'Ball', nc: true });
          P('ValveWheel', [0.06, 0.42, 0.42], [cx - 0.75, L + 2.2, W0 + 0.3], [200, 30, 30], 'Metal', { sh: 'Cylinder', r: [0, 0, 90], nc: true });
          B('Label', cx - 0.95, L + 0.75, W0 + D + 0.04, cx + 0.95, L + 1.5, W0 + D + 0.06, [188, 34, 36], 'SmoothPlastic', { nc: true, ns: true,
            text: { face: 'Back', text: '소 화 전', color: [255, 255, 255], bgT: 1, lit: 0.85, font: 'GothamBlack', pps: 80 } });
          B('Handle', x1 - 0.32, L + 2.4, W0 + D + 0.04, x1 - 0.16, L + 3.4, W0 + D + 0.12, [60, 60, 62], 'Metal', { nc: true, ns: true });
          [L + 1.0, L + 3.8, L + 5.2].forEach((y) => P('Hinge', [0.5, 0.1, 0.1], [x0 + 0.06, y, W0 + D + 0.05], [120, 120, 122], 'Metal', { sh: 'Cylinder', r: [0, 0, 90], nc: true, ns: true }));
          // 바닥 소화기 + 벽 표지
          const ex = x1 + 0.85;
          B('ExtStand', ex - 0.45, L, W0 + 0.05, ex + 0.45, L + 0.25, W0 + 0.85, [40, 40, 42], 'Metal');
          cylV('Extinguisher', ex, L + 0.25, W0 + 0.45, 1.75, 0.6, [196, 30, 32], 'Metal', { refl: 0.08 });
          cylV('ExtNeck', ex, L + 2.0, W0 + 0.45, 0.25, 0.3, [180, 180, 176], 'Metal', { nc: true });
          B('ExtHandle', ex - 0.06, L + 2.25, W0 + 0.3, ex + 0.06, L + 2.32, W0 + 0.8, [40, 40, 42], 'Metal', { nc: true });
          P('ExtGauge', [0.05, 0.2, 0.2], [ex, L + 2.12, W0 + 0.62], [240, 240, 236], 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
          cylBetween('ExtHose', [ex + 0.1, L + 2.05, W0 + 0.35], [ex + 0.28, L + 0.9, W0 + 0.6], 0.09, [20, 20, 22], 'Rubber', { nc: true });
          B('ExtSign', ex - 0.42, L + 2.9, W0, ex + 0.42, L + 4.0, W0 + 0.03, [200, 30, 32], 'SmoothPlastic', { nc: true, ns: true,
            text: { face: 'Back', text: '소화기', color: [255, 255, 255], bgT: 1, lit: 0.85, font: 'GothamBlack', pps: 100 } });
        });
        hydrant((pierNear(-68)[0] + pierNear(-68)[1]) / 2 - 0.5);
        hydrant((pierNear(71)[0] + pierNear(71)[1]) / 2 - 0.5);
        // 게시판 (창문 사이)
        [-37.35, 40.15, -99.35, 102.15].forEach((gx) => {
          const pr = pierNear(gx), cx = (pr[0] + pr[1]) / 2;
          grp('Bulletin', () => {
            B('Cork', cx - 2.3, L + 3.6, W0, cx + 2.3, L + 7.4, W0 + 0.12, [168, 124, 80], 'Fabric');
            [[cx - 2.4, cx + 2.4, L + 7.4, L + 7.55], [cx - 2.4, cx + 2.4, L + 3.45, L + 3.6]].forEach(([a0, a1, y0, y1]) => B('Frame', a0, y0, W0, a1, y1, W0 + 0.16, [180, 184, 188], 'Metal', { nc: true }));
            [[cx - 2.4, cx - 2.3], [cx + 2.3, cx + 2.4]].forEach(([a0, a1]) => B('Frame', a0, L + 3.45, W0, a1, L + 7.55, W0 + 0.16, [180, 184, 188], 'Metal', { nc: true }));
            const posters = [['학교폭력 신고 117', [250, 236, 120]], ['11월 급식 식단표', [240, 240, 236]], ['기말고사 시간표', [210, 230, 255]], ['방과후 학교 안내', [255, 214, 214]]];
            for (let k = 0; k < 3; k++) {
              const [txt, col] = posters[(k + Math.round(gx)) & 3];
              const px = cx - 1.9 + k * 1.35;
              B('Poster', px, L + 4.0 + rnd() * 0.5, W0 + 0.12, px + 1.2, L + 6.6 + rnd() * 0.5, W0 + 0.14, col, 'SmoothPlastic', { nc: true, ns: true, r: [0, 0, (rnd() - 0.5) * 3],
                text: { face: 'Back', text: txt, color: [40, 40, 50], bgT: 1, lit: 1, pps: 60, font: 'GothamBold' } });
              P('Pin', [0.06, 0.1, 0.1], [px + 0.6, L + 6.4, W0 + 0.17], pick([[220, 40, 40], [40, 90, 210], [240, 200, 40]]), 'SmoothPlastic', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
            }
          });
        });
        // 순찰함 (현관 가까운 창 사이 벽): 스테인리스 함 + 순찰일지 클립보드 + 끈 달린 볼펜
        {
          const pr = pierNear(-22), cx = (pr[0] + pr[1]) / 2 - 0.55;
          grp('PatrolBox', () => {
            B('Box', cx - 0.55, L + 4.35, W0, cx + 0.55, L + 5.65, W0 + 0.42, [176, 178, 180], 'Metal', {
              tag: 'PatrolPoint', attr: { Floor: f + 1 }, refl: 0.08 });
            P('Lid', [1.16, 0.08, 0.5], [cx, L + 5.7, W0 + 0.23], [168, 170, 172], 'Metal', { r: [-7, 0, 0], nc: true, refl: 0.08 });
            B('HingeLine', cx - 0.55, L + 5.6, W0 + 0.42, cx + 0.55, L + 5.62, W0 + 0.44, [90, 92, 94], 'Metal', { nc: true, ns: true });
            B('LabelPlate', cx - 0.42, L + 5.05, W0 + 0.42, cx + 0.42, L + 5.42, W0 + 0.44, [246, 246, 242], 'SmoothPlastic', { nc: true, ns: true,
              text: { face: 'Back', text: '순 찰 함', color: [20, 20, 20], bgT: 1, lit: 1, font: 'GothamBlack', pps: 140 } });
            B('FloorTag', cx - 0.2, L + 4.62, W0 + 0.42, cx + 0.2, L + 4.86, W0 + 0.44, [30, 60, 120], 'SmoothPlastic', { nc: true, ns: true,
              text: { face: 'Back', text: `${f + 1}F`, color: [255, 255, 255], bgT: 1, lit: 1, font: 'GothamBlack', pps: 140 } });
            P('Keyhole', [0.04, 0.12, 0.12], [cx + 0.38, L + 4.62, W0 + 0.44], [30, 30, 32], 'Metal', { sh: 'Cylinder', r: [0, 90, 0], nc: true, ns: true });
            // 클립보드 + 순찰일지
            const bx = cx + 1.25;
            B('Clipboard', bx - 0.45, L + 3.75, W0 + 0.02, bx + 0.45, L + 5.0, W0 + 0.07, [132, 98, 62], 'Wood', { nc: true });
            B('LogSheet', bx - 0.38, L + 3.82, W0 + 0.07, bx + 0.38, L + 4.85, W0 + 0.08, [248, 248, 244], 'SmoothPlastic', { nc: true, ns: true,
              text: { face: 'Back', text: `순찰일지 ${f + 1}F\n\n시간 · 이상유무 · 서명\n22:00  이상없음  ✓\n23:00\n00:00\n01:00`, color: [40, 40, 50], bgT: 1, lit: 1, pps: 160, align: 'Left', font: 'Arial' } });
            B('Clip', bx - 0.2, L + 4.88, W0 + 0.07, bx + 0.2, L + 5.08, W0 + 0.14, [160, 162, 166], 'Metal', { nc: true, ns: true });
            cylBetween('PenString', [bx + 0.45, L + 4.95, W0 + 0.06], [bx + 0.55, L + 4.0, W0 + 0.08], 0.02, [40, 40, 40], 'SmoothPlastic', { nc: true, ns: true });
            cylBetween('Pen', [bx + 0.55, L + 4.0, W0 + 0.08], [bx + 0.58, L + 3.45, W0 + 0.09], 0.07, [30, 50, 150], 'SmoothPlastic', { nc: true, ns: true });
          });
        }
        // 정수기 (창 사이)
        {
          const pr = pierNear(9), cx = (pr[0] + pr[1]) / 2;
          waterPurifier(cx, L, W0);
        }
        [BX0 + 3, BX1 - 3].forEach((x) =>
          B('FigureSpot', x - 1, L, -168, x + 1, L + 0.1, -166, [255, 255, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'FigureSpot', attr: { Floor: f + 1 } }));
      });
      B('HallWall', HALL0 - WALL, L, PART1, HALL0, top, ROOM1, C.wallIvory, 'Plaster');
      B('HallWall', HALL1, L, PART1, HALL1 + WALL, top, ROOM1, C.wallIvory, 'Plaster');
      wainscot('z', PART1, ROOM1, HALL0, 1, L);
      wainscot('z', PART1, ROOM1, HALL1, -1, L);
      if (f === 0) {
        B('ShoeLockers', -9.8, L, -161.5, -7.6, L + 6.4, -153.5, [176, 144, 104], 'WoodPlanks');
        for (let z = -161.5 + 1.0; z < -153.6; z += 1.0) B('ShoeSeam', -7.62, L + 0.1, z - 0.03, -7.58, L + 6.3, z + 0.03, [120, 96, 70], 'SmoothPlastic', { nc: true, ns: true });
        for (let y = 1.3; y < 6.4; y += 1.3) B('ShoeSeam', -7.62, L + y - 0.03, -161.5, -7.58, L + y + 0.03, -153.5, [120, 96, 70], 'SmoothPlastic', { nc: true, ns: true });
        B('MirrorFrame', -9.95, L + 1, -152, -9.75, L + 9.6, -144, C.woodDark, 'Wood');
        B('Mirror', -9.78, L + 1.3, -151.7, -9.7, L + 9.3, -144.3, [196, 206, 210], 'Glass', { refl: 0.85, tag: 'HallMirror' });
        B('MirrorText', -9.95, L + 9.7, -150, -9.75, L + 10.2, -144, C.woodDark, 'Wood', { text: { face: 'Right', text: '바른 자세 · 단정한 용모', color: [240, 230, 200], bgT: 1, pps: 60 } });
        B('TrophyCase', 7.4, L, -161.5, 9.8, L + 7.6, -154, [110, 80, 52], 'Wood');
        B('TrophyGlass', 7.36, L + 1, -161.2, 7.4, L + 7.2, -154.3, [180, 200, 210], 'Glass', { t: 0.6, nc: true });
        for (let k = 0; k < 5; k++) { cylV('Trophy', 7.9 + (k % 2) * 0.6, L + 3.2, -160.4 + k * 1.3, 1.1 + (k % 3) * 0.3, 0.35, [212, 176, 70], 'Metal', { nc: true, refl: 0.3 }); }
        B('Plaque', 9.75, L + 5, -152, 9.95, L + 9, -142, [60, 40, 26], 'Wood', { text: { face: 'Left', text: '교 훈\n\n성실 · 정직 · 배려', color: [230, 210, 160], bg: [60, 40, 26], bgT: 0, font: 'Merriweather' } });
        cylV('Pot', 8.6, L, -140, 2, 1.8, [150, 90, 60], 'Brick');
        ball('Plant', 8.6, L + 3.4, -140, 2.8, [50, 90, 50], 'LeafyGrass', { nc: true });
        B('Doormat', -6.5, L, -141.5, 6.5, L + 0.08, -138, [60, 60, 64], 'Carpet', { nc: true });
      }
      ceiling(HALL0, HALL1, PART1, ROOM1, L + CEIL);
      troffer(0, -150, L + CEIL, f === 0, { light: { type: 'Surface', face: 'Bottom', range: 16, angle: 120, brightness: f === 0 ? 0.8 : 0, color: [220, 230, 255], enabled: f === 0, shadows: true } });
    });
  }

  // ── 중앙 계단실: 복도 북쪽으로 튀어나온 계단실 (1층 ~ 옥상) ──
  grp('CentralStair', () => {
    const { W, R, LD } = CS, zN = ZN - R - LD, top = ROOFY + 10, wc = C.wallIvory;
    uStair(yawFrame([0, 0, ZN], 180), { W, g: 0.3, R, LD, levels: [...LV, ROOFY], toTop: false });
    B('StairFloor', -W, 0.9, zN, W, LV[0], ZN, STEP_C, 'Marble');
    B('Foundation', -W - 0.9, 0, zN - 0.9, W + 0.9, 1, ZN, [140, 136, 130], 'Concrete');
    B('BayWall', -W - 0.6, 0, zN - 0.6, -W, top, ZN, wc, 'Plaster');
    B('BayWall', W, 0, zN - 0.6, W + 0.6, top, ZN, wc, 'Plaster');
    // 계단참 벽: 층마다 세로로 긴 창 (참고 사진)
    const wins = [];
    LV.forEach((L) => [[-W + 1, -0.8], [0.8, W - 1]].forEach(([a, b]) => wins.push({ u0: a, u1: b, v0: L + FH / 2 + 2.6, v1: L + FH / 2 + 9.4 })));
    wallHoles('BayWall', 'x', -W - 0.6, W + 0.6, 0, top, zN - 0.6, zN, wins, wc, 'Plaster');
    wins.forEach((h) => { slider('x', h.u0, h.u1, h.v0, h.v1, zN - 0.3); B('Sill', h.u0 - 0.2, h.v0 - 0.2, zN - 0.2, h.u1 + 0.2, h.v0, zN + 0.5, [220, 216, 206], 'Marble', { nc: true }); });
    LV.forEach((L, fi) => {
      B('StairSign', W - 0.14, L + 7.0, ZN - 6.5, W, L + 8.6, ZN - 2.5, [246, 246, 240], 'SmoothPlastic', {
        nc: true, tag: 'StairSign', attr: { Floor: fi + 1 }, text: { face: 'Left', text: fi < 2 ? `${fi + 2}F ↑` : '옥상 ↑ (출입금지)', color: [30, 40, 70], bg: [246, 246, 240], bgT: 0, lit: 1, font: 'GothamBlack', pps: 70 } });
      troffer(0, zN + LD / 2, L + FH / 2 + 10.4, fi === 0, { tag: 'CorridorLight', light: { type: 'Surface', face: 'Bottom', range: 18, angle: 120, brightness: fi === 0 ? 0.7 : 0, color: [220, 230, 255], enabled: fi === 0, shadows: true } });
      B('LandingCeil', -W, L + FH / 2 + 10.4, zN, W, L + FH / 2 + 10.6, zN + LD, C.ceiling, 'Plaster', { nc: true, ns: true });
    });
    // 옥상 계단실: 계단을 다 올라오면 작은 방, 서쪽 벽에 잠긴 옥상 문
    const vz = ZN + 12;
    B('BayRoof', -W - 1.1, top, zN - 1.1, W + 1.1, top + 0.7, vz + 1.1, [130, 126, 120], 'Concrete');
    B('HutWall', W, ROOFY, ZN, W + 0.6, top, vz + 0.6, C.facade, 'Plaster');
    B('HutWall', -W - 0.6, ROOFY, vz, W + 0.6, top, vz + 0.6, C.facade, 'Plaster');
    wallHoles('HutWall', 'z', ZN, vz, ROOFY, top, -W - 0.6, -W, [{ u0: RD.z0, u1: RD.z1, v0: ROOFY, v1: ROOFY + 7.2 }], C.facade, 'Plaster');
    B('RoofDoor', -W - 0.5, ROOFY, RD.z0, -W - 0.1, ROOFY + 7.2, RD.z1, [96, 100, 106], 'Metal', { tag: ['RoofDoor', 'LockedDoor'], attr: { Locked: '옥상 문은 잠겨 있다. 「옥상 출입금지」' } });
    B('RoofSign', -W + 0.0, ROOFY + 7.6, RD.z0 - 1, -W + 0.15, ROOFY + 8.8, RD.z1 + 1, [246, 246, 240], 'SmoothPlastic', {
      nc: true, text: { face: 'Right', text: '옥상 출입금지', color: [180, 30, 30], bg: [246, 246, 240], bgT: 0 } });
    B('RoofStairZone', -W, LV[2] + FH / 2 - 0.6, zN, W, ROOFY + 8, vz, [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true, tag: 'RoofStairZone' });
  });
  // ── 학생용 계단실: 건물 양 끝 (1층 ~ 3층) ──
  [[BX1, 1, 'E'], [BX0, -1, 'W']].forEach(([bx, s, nm]) => grp(`StairTower${nm}`, () => {
    const { W, R, LD } = TS, zc = (TS.z0 + TS.z1) / 2, xe = bx + s * (R + LD), top = ROOFY, wc = C.facade;
    const X0 = Math.min(bx, xe + s * 0.6), X1 = Math.max(bx, xe + s * 0.6);
    uStair(yawFrame([bx, 0, zc], s > 0 ? 90 : -90), { W, g: 0.25, R, LD, levels: LV, toTop: false });
    B('StairFloor', Math.min(bx, xe), 0.9, zc - W, Math.max(bx, xe), LV[0], zc + W, STEP_C, 'Marble');
    B('Foundation', X0 - 0.3, 0, zc - W - 0.9, X1 + 0.3, 1, zc + W + 0.9, [140, 136, 130], 'Concrete');
    B('TowerWall', X0, 0, zc - W - 0.6, X1, top, zc - W, wc, 'Plaster');
    B('TowerWall', X0, 0, zc + W, X1, top, zc + W + 0.6, wc, 'Plaster');
    const wins = LV.slice(0, 2).map((L) => ({ u0: zc - W + 1, u1: zc + W - 1, v0: L + FH / 2 + 2.6, v1: L + FH / 2 + 9.4 }));
    wallHoles('TowerWall', 'z', zc - W - 0.6, zc + W + 0.6, 0, top, Math.min(xe, xe + s * 0.6), Math.max(xe, xe + s * 0.6), wins, wc, 'Plaster');
    wins.forEach((h) => slider('z', h.u0, h.u1, h.v0, h.v1, xe + s * 0.3));
    B('TowerRoof', X0 - 0.4, top, zc - W - 1, X1 + 0.4, top + 0.7, zc + W + 1, [130, 126, 120], 'Concrete');
    LV.forEach((L, fi) => {
      if (fi < 2) B('StairLight', xe - s * 3, L + FH / 2 + 10.2, zc - 1, xe - s * 1, L + FH / 2 + 10.4, zc + 1, [240, 244, 250], 'SmoothPlastic', {
        nc: true, ns: true, tag: 'CorridorLight', light: { type: 'Point', range: 16, brightness: 0, color: [220, 230, 255], enabled: false, shadows: true } });
      B('FloorMark', bx + s * 0.4, L + 6.6, zc + W - 0.14, bx + s * 2.6, L + 8.0, zc + W, [246, 246, 240], 'SmoothPlastic', {
        nc: true, ns: true, text: { face: 'Front', text: `${fi + 1}F`, color: [30, 40, 70], bg: [246, 246, 240], bgT: 0, lit: 1, font: 'GothamBlack', pps: 70 } });
    });
  }));

  grp('Facade', () => {
    [[BX0 - 0.3, -8], [8, BX1 + 0.3]].forEach(([a, b]) => B('BaseBand', a, 0, ZS - 0.2, b, 3.2, ZS + 0.35, [120, 116, 110], 'Granite'));
    // 북쪽 띠는 중앙 계단실 자리를, 양 끝 띠는 학생용 계단실 자리를 비운다
    const nSeg = [[BX0 - 0.3, -CS.W - 0.6], [CS.W + 0.6, BX1 + 0.3]], zT = (TS.z0 + TS.z1) / 2 + TS.W + 0.6;
    nSeg.forEach(([a, b]) => B('BaseBand', a, 0, ZN - 0.35, b, 3.2, ZN + 0.2, [120, 116, 110], 'Granite'));
    B('BaseBand', BX0 - 0.35, 0, zT, BX0 + 0.2, 3.2, ZS + 0.35, [120, 116, 110], 'Granite');
    B('BaseBand', BX1 - 0.2, 0, zT, BX1 + 0.35, 3.2, ZS + 0.35, [120, 116, 110], 'Granite');
    [LV[1], LV[2], ROOFY].forEach((y) => {
      B('FloorBand', BX0 - 0.35, y - 1.1, ZS - 0.1, BX1 + 0.35, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
      nSeg.forEach(([a, b]) => B('FloorBand', a, y - 1.1, ZN - 0.4, b, y + 0.15, ZN + 0.1, C.facadeShade, 'Concrete'));
      B('FloorBand', BX0 - 0.4, y - 1.1, zT, BX0 + 0.1, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
      B('FloorBand', BX1 - 0.1, y - 1.1, zT, BX1 + 0.4, y + 0.15, ZS + 0.4, C.facadeShade, 'Concrete');
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
    // 현관 캐노피 (참고 사진): 얇고 넓은 지붕 + 짙은 테두리 + 네모 기둥 + 문 위 전광판
    B('Canopy', -15, 10.6, ZS, 15, 11.3, ZS + 10, [222, 220, 212], 'Concrete');
    B('CanopyFascia', -15.2, 10.3, ZS + 9.7, 15.2, 11.6, ZS + 10.2, [44, 48, 56], 'Metal');
    B('CanopyFascia', -15.2, 10.3, ZS, -14.8, 11.6, ZS + 10.2, [44, 48, 56], 'Metal');
    B('CanopyFascia', 14.8, 10.3, ZS, 15.2, 11.6, ZS + 10.2, [44, 48, 56], 'Metal');
    B('CanopyCeil', -14.6, 10.5, ZS + 0.2, 14.6, 10.6, ZS + 9.6, [236, 236, 230], 'SmoothPlastic', { nc: true, ns: true });
    [-13.4, 13.4].forEach((x) => { B('CanopyColumn', x - 0.7, 1, ZS + 8.2, x + 0.7, 10.6, ZS + 9.6, [200, 196, 188], 'Granite'); B('ColumnBase', x - 0.9, 1, ZS + 8.0, x + 0.9, 1.8, ZS + 9.8, [150, 146, 140], 'Granite'); });
    B('SchoolName', -9, 11.7, ZS + 9.8, 9, 13.6, ZS + 10.1, [222, 220, 212], 'Concrete', { nc: true,
      text: { face: 'Back', text: '송 천 고 등 학 교', color: [40, 44, 60], bgT: 1, font: 'GothamBlack', lit: 1, pps: 50 } });
    // 전광판: 검은 판에 빨강·초록 글씨
    B('LedBoard', -5.2, 1 + 9.5, ZS + 0.25, 5.2, 1 + 10.5, ZS + 0.55, [14, 14, 16], 'SmoothPlastic', { nc: true });
    B('LedText', -5.0, 1 + 9.58, ZS + 0.55, 5.0, 1 + 10.42, ZS + 0.58, [14, 14, 16], 'Neon', { nc: true, ns: true, min: 0.02,
      text: { face: 'Back', text: '송천고  22:00  외부인 출입 금지', color: [60, 255, 120], bg: [10, 10, 12], bgT: 0, lit: 0, font: 'GothamBlack', pps: 60 } });
    B('EntranceSteps', -15, 0, ZS, 15, 0.5, ZS + 11, [160, 156, 150], 'Granite');
    B('EntranceSteps', -15, 0.5, ZS, 15, 1.0, ZS + 9.8, [160, 156, 150], 'Granite');
    B('StepNosing', -15, 0.5, ZS + 10.7, 15, 0.52, ZS + 11, [226, 196, 60], 'SmoothPlastic', { nc: true, ns: true, min: 0.02 });
    B('StepNosing', -15, 1.0, ZS + 9.5, 15, 1.02, ZS + 9.8, [226, 196, 60], 'SmoothPlastic', { nc: true, ns: true, min: 0.02 });
    P('Ramp', [5, 0.3, 11.2], [18, 0.48, ZS + 5.5], [160, 156, 150], 'Concrete', { r: [5.1, 0, 0] });
    for (let i = 0; i < 3; i++) B('CanopyLight', -9 + i * 7, 10.4, ZS + 4, -5 + i * 7, 10.5, ZS + 6, [255, 240, 210], 'Neon', { nc: true, ns: true, light: { type: 'Surface', face: 'Bottom', range: 16, angle: 110, brightness: 0.8, color: [255, 236, 200], shadows: i === 1 } });
    [[BX0 + 2, HALL0 - 6], [HALL1 + 11, BX1 - 2]].forEach(([x0, x1]) => {
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
    grp('WaterTank', () => {
      B('Stand', 90, ROOFY, -166, 114, ROOFY + 2, -148, [110, 114, 120], 'Metal');
      B('Tank', 91, ROOFY + 2, -165, 113, ROOFY + 11, -149, [70, 130, 170], 'Plastic');
      for (let x = 91; x <= 113; x += 2.75) B('Rib', x - 0.08, ROOFY + 2, -165.1, x + 0.08, ROOFY + 11, -148.9, [60, 112, 150], 'Plastic', { nc: true, ns: true });
      for (let y = 2; y <= 11; y += 3) B('Rib', 90.9, ROOFY + y - 0.08, -165.1, 113.1, ROOFY + y + 0.08, -148.9, [60, 112, 150], 'Plastic', { nc: true, ns: true });
    });
    for (let x = -120; x <= -50; x += 14) {
      B('ACUnit', x, ROOFY, -152, x + 5, ROOFY + 4, -146, [226, 226, 222], 'Metal');
      P('Fan', [0.1, 3, 3], [x + 2.5, ROOFY + 4.05, -149], [80, 80, 84], 'Metal', { sh: 'Cylinder', r: [0, 0, 90], nc: true, ns: true });
    }
    cylBetween('Duct', [-120, ROOFY + 1, -144], [-40, ROOFY + 1, -144], 1.0, [190, 190, 186], 'Metal');
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

// ═════════════════════════ CCTV 카메라 6대 ═════════════════════════
grp('CCTV', () => {
  SHIFT = SOUTH;
  cylV('CamPole', -15.5, 0, 184, 12.4, 0.5, [120, 124, 130], 'Metal');
  cctvCam(1, '정문', [-15.5, 11.7, 184.8], [4, 2, 203], 0, null, 18);
  SHIFT = null;
  cctvCam(2, '운동장', [-113, ROOFY + 3.6, ZS + 1.2], [-113, 0, 0], 0, { pos: [-113, ROOFY + 3.4, ZS - 0.2] }, 20);
  cctvCam(3, '1F 복도', [128.6, LV[0] + CEIL - 0.7, CORR0 + 1.0], [0, LV[0] + 2.5, (CORR0 + PART0) / 2], LV[0], null, 6);
  cctvCam(4, '2F 복도', [128.6, LV[1] + CEIL - 0.7, CORR0 + 1.0], [0, LV[1] + 2.5, (CORR0 + PART0) / 2], LV[1], null, 6);
  cctvCam(5, '3F 복도', [128.6, LV[2] + CEIL - 0.7, CORR0 + 1.0], [0, LV[2] + 2.5, (CORR0 + PART0) / 2], LV[2], null, 6);
  SHIFT = SOUTH;
  cylV('CamPole', 106.5, 0, 179, 14.4, 0.5, [120, 124, 130], 'Metal');
  cctvCam(6, '주차장', [106.0, 13.8, 178.4], [55, 0, 128], 0, null, 22);
  SHIFT = null;
});

// ═════════════════════════ 이상현상 소품 (ServerStorage에 보관했다가 복제해서 씀) ═════════════════════════
function propGroup(name, anchorPos, fn) {
  const saved = gstack;
  gstack = ['School', 'AnomalyProps', name];
  const gi = cur();
  gtags.push([gi, 'AnomalyProp']);
  P('PropAnchor', [0.2, 0.2, 0.2], anchorPos, [255, 0, 255], 'SmoothPlastic', { t: 1, nc: true, hidden: true, pri: true });
  fn();
  gstack = saved;
}
{
  const floorDrop = (x, y, z, d, a = 0) => P('BloodPool', [0.03, d, d * (0.7 + rnd() * 0.6)], [x, y, z], [88 + rnd() * 25, 4, 4], 'SmoothPlastic',
    { sh: 'Cylinder', r: eulerFromBasis([0, 1, 0], [Math.cos(a), 0, Math.sin(a)], vcross([0, 1, 0], [Math.cos(a), 0, Math.sin(a)])), nc: true, ns: true, refl: 0.12 });
  // 0) 4층: 없어야 할 층. 옥상 계단실 서쪽 문 너머에 생기는 복도 (이상현상 때만 나타남)
  SHIFT = [-CS.W - 0.6 + 1, 0, RD.z0 + 147];
  propGroup('FourthFloor', [-1, ROOFY, -145], () => {
    const y = ROOFY, xw = -97, xe = -1, zn = -151, zs = -141, hh = 9.0, so = { nc: true, ns: true };
    const wallC = [66, 62, 56], grime = [40, 36, 32], rust = [74, 30, 26];
    const zi0 = zn + 0.6, zi1 = zs - 0.6;
    B('Floor4', xw, y, zn, xe, y + 0.12, zs, [54, 50, 46], 'Granite');
    B('Wall4', xw, y, zn, xe, y + hh, zi0, wallC, 'Plaster');
    B('Wall4', xw, y, zi1, xe, y + hh, zs, wallC, 'Plaster');
    B('Wall4', xw, y, zn, xw + 0.6, y + hh, zs, wallC, 'Plaster');
    B('Ceil4', xw, y + hh, zn - 0.2, xe, y + hh + 0.5, zs + 0.2, [38, 36, 34], 'Concrete');
    B('Lintel4', xe - 0.3, y + 7.2, zn, xe, y + hh, zs, wallC, 'Plaster');
    B('Jamb4', xe - 0.3, y, zn, xe, y + 7.2, -147, wallC, 'Plaster'); B('Jamb4', xe - 0.3, y, -143, xe, y + 7.2, zs, wallC, 'Plaster');
    // 벗겨진 아랫벽 페인트 (군데군데 떨어져 나감) + 곰팡이 얼룩
    [[zi0, 1], [zi1, -1]].forEach(([zf, n]) => {
      for (let x = xw + 0.8; x < xe - 1; ) {
        const len = 1.5 + rnd() * 5;
        if (rnd() < 0.8) B('Peel', x, y + 0.12, Math.min(zf, zf + n * 0.04), Math.min(xe - 0.4, x + len), y + 2.6 + rnd() * 1.2, Math.max(zf, zf + n * 0.04), jit(rust, 10), 'Plaster', { ...so, min: 0.03 });
        x += len + rnd() * 0.8;
      }
      for (let k = 0; k < 26; k++) {
        const x = xw + 2 + rnd() * (xe - xw - 4), w = 1 + rnd() * 3.5, h = 1 + rnd() * 4, yy = y + 3 + rnd() * 5;
        B('Mold', x, Math.max(y + 0.2, yy - h / 2), Math.min(zf, zf + n * 0.02), x + w, Math.min(y + hh, yy + h / 2), Math.max(zf, zf + n * 0.02), jit(grime, 8), 'Plaster', { ...so, t: 0.25 + rnd() * 0.4, min: 0.015 });
      }
    });
    // 북쪽: 판자로 못질해 막은 창문
    for (let k = 0; k < 7; k++) {
      const cx = xe - 9 - k * 12.5;
      B('DeadWindow', cx - 2.2, y + 3.2, zi0, cx + 2.2, y + 7.4, zi0 + 0.06, [8, 8, 10], 'SmoothPlastic', so);
      [[cx - 2.4, cx - 2.2, y + 3.0, y + 7.6], [cx + 2.2, cx + 2.4, y + 3.0, y + 7.6], [cx - 2.4, cx + 2.4, y + 7.4, y + 7.6], [cx - 2.4, cx + 2.4, y + 3.0, y + 3.2]]
        .forEach(([a0, a1, b0, b1]) => B('DeadFrame', a0, b0, zi0, a1, b1, zi0 + 0.14, [52, 50, 48], 'Metal', so));
      for (let q = 0; q < 4; q++) P('Plank', [5.2 + rnd(), 0.5, 0.1], [cx + (rnd() - 0.5) * 0.4, y + 3.7 + q * 1.05 + rnd() * 0.2, zi0 + 0.2], jit([82, 62, 44], 14), 'Wood', { nc: true, r: [0, 0, (rnd() - 0.5) * 22] });
      if (k === 4) B('RedSlit', cx - 2.0, y + 5.0, zi0 + 0.07, cx + 2.0, y + 5.25, zi0 + 0.09, [255, 30, 20], 'Neon', { ...so, min: 0.015 });
    }
    // 남쪽: 전부 "4-4"인 교실 문, 부적
    for (let k = 0; k < 7; k++) {
      const cx = xe - 15 - k * 12.5, ajar = k === 3;
      B('Door4Frame', cx - 2.0, y + 0.12, zi1 - 0.12, cx + 2.0, y + 7.5, zi1, [36, 28, 22], 'Wood', so);
      B('Door4Void', cx - 1.8, y + 0.12, zi1 - 0.14, cx + 1.8, y + 7.3, zi1 - 0.12, [4, 4, 5], 'SmoothPlastic', { ...so, min: 0.02 });
      const sx = ajar ? 1.1 : 0;
      B('Door4', cx - 1.8 + sx, y + 0.12, zi1 - 0.26, cx + 1.8 + sx, y + 7.3, zi1 - 0.14, jit([58, 42, 32], 8), 'Wood');
      B('Door4Glass', cx - 1.3 + sx, y + 4.3, zi1 - 0.28, cx + 1.3 + sx, y + 6.6, zi1 - 0.26, [10, 10, 12], 'Glass', { ...so, refl: 0.2, min: 0.02 });
      B('Sign44', cx - 1.0, y + 7.75, zi1 - 0.1, cx + 1.0, y + 8.5, zi1, [64, 12, 12], 'SmoothPlastic', { ...so,
        text: { face: 'Front', text: '4 - 4', color: [226, 214, 196], bgT: 1, lit: 0.6, font: 'GothamBlack', pps: 80 } });
      // 부적 (노란 종이 + 붉은 글씨 흉내)
      for (let q = 0; q < (k % 2 ? 3 : 1); q++) {
        const px = cx - 0.9 + q * 0.9 + sx + (rnd() - 0.5) * 0.2, py = y + 2.6 + rnd() * 1.2, rz = (rnd() - 0.5) * 16;
        P('Talisman', [0.55, 1.5, 0.02], [px, py, zi1 - 0.29], [222, 190, 70], 'SmoothPlastic', { ...so, r: [0, 0, rz], min: 0.015 });
        for (let m = 0; m < 4; m++) P('TalismanInk', [0.3 - (m % 2) * 0.12, 0.06, 0.02], [px + (rnd() - 0.5) * 0.06, py + 0.5 - m * 0.32, zi1 - 0.3], [170, 24, 20], 'SmoothPlastic', { ...so, r: [0, 0, rz + (m % 2 ? 90 : 0)], min: 0.012 });
      }
      handprint([cx + 0.6 + sx, y + 4.0 + rnd() * 0.6, zi1 - 0.3], [-1, 0, 0], [0, 1, 0], [0, 0, -1], 0.9 + rnd() * 0.3, { drag: 0.5 + rnd() * 1.5 });
    }
    // 천장: 늘어진 전선과 붉은 알전구
    for (let k = 0; k < 6; k++) {
      const cx = xe - 8 - k * 16, on = k !== 2, len = 1.2 + rnd() * 1.4;
      rod('BulbWire', [cx, y + hh, -145 + (rnd() - 0.5)], [cx, y + hh - len, -145], 0.04, [16, 16, 16], 'SmoothPlastic', { ...so, min: 0.03 });
      cylV('BulbSocket', cx, y + hh - len - 0.2, -145, 0.2, 0.16, [30, 30, 30], 'SmoothPlastic', so);
      ball('Bulb', cx, y + hh - len - 0.38, -145, 0.34, on ? [255, 60, 40] : [60, 30, 28], on ? 'Neon' : 'Glass', { ...so, tag: on && k % 2 ? 'FlickerLight' : undefined,
        light: on ? { type: 'Point', range: 17, brightness: 0.9, color: [255, 50, 36], shadows: k < 3 } : undefined });
      rod('SagCable', [cx, y + hh - 0.05, zi0 + 0.4], [cx - 8, y + hh - 0.9 - rnd() * 0.5, zi0 + 0.6], 0.06, [14, 14, 14], 'Rubber', so);
      rod('SagCable', [cx - 8, y + hh - 0.9, zi0 + 0.6], [cx - 16, y + hh - 0.05, zi0 + 0.4], 0.06, [14, 14, 14], 'Rubber', so);
    }
    // 바닥: 끝까지 이어진 끌린 핏자국
    for (let x = xe - 5; x > xw + 8; x -= 0.9 + rnd() * 1.6) {
      const z = -145 + Math.sin(x * 0.21) * 1.6 + (rnd() - 0.5) * 0.5;
      P('BloodDrag', [1.4 + rnd() * 1.8, 0.02, 0.25 + rnd() * 0.5], [x, y + 0.13, z], [78 + rnd() * 26, 4, 4], 'SmoothPlastic', { ...so, r: [0, Math.cos(x * 0.21) * 18, 0], refl: 0.1, min: 0.015 });
      if (rnd() < 0.3) floorDrop(x + rnd(), y + 0.135, z + (rnd() - 0.5) * 2.5, 0.3 + rnd() * 0.9, rnd() * 3);
    }
    floorDrop(xw + 6, y + 0.135, -145, 4.2, 0.4); floorDrop(xw + 7.5, y + 0.137, -143.6, 2.4, 1.2);
    // 벽 쪽으로 가지런히 놓인 실내화
    for (let x = xe - 12; x > xw + 34; x -= 2.3) [-0.28, 0.28].forEach((dx) => {
      B('Shoe', x + dx - 0.2, y + 0.12, zi0 + 0.25, x + dx + 0.2, y + 0.42, zi0 + 1.05, [226, 224, 216], 'SmoothPlastic', so);
      B('ShoeSole', x + dx - 0.22, y + 0.12, zi0 + 0.23, x + dx + 0.22, y + 0.2, zi0 + 1.07, [70, 90, 150], 'Rubber', so);
    });
    // 쌓아 올린 책걸상 (남쪽에 겨우 지나갈 틈)
    const tilted = (o, yaw, rx, rz) => {
      const a = yaw * Math.PI / 180, b = rx * Math.PI / 180, c = rz * Math.PI / 180;
      const X0 = [Math.cos(a), 0, -Math.sin(a)], Z0 = [Math.sin(a), 0, Math.cos(a)];
      const Y1 = vnorm(vadd(vadd([0, Math.cos(b) * Math.cos(c), 0], vmul(Z0, Math.sin(b))), vmul(X0, Math.sin(c))));
      const X1 = vnorm(vsub(X0, vmul(Y1, X0[0] * Y1[0] + X0[1] * Y1[1] + X0[2] * Y1[2])));
      return { o, X: X1, Y: Y1, Z: vcross(X1, Y1) };
    };
    [[-47, -148.6, 0, 20, 0, 0], [-49.6, -148.2, 0, 80, 0, 0], [-48, -146.2, 0, -30, 0, 0], [-50.2, -145.4, 0, 140, 0, 0],
      [-48.2, -147.8, 2.7, 60, 8, 14], [-49.4, -146.0, 2.7, -100, -10, 6], [-48.6, -147.0, 5.2, 10, 170, 8]].forEach(([x, z, dy, yaw, rx, rz], i) => grp(`Pile${i}`, () => studentDesk(tilted([x, y + 0.12 + dy, z], yaw, rx, rz))));
    [[-46.2, -144.6, 0, 200, 80, 0], [-51.4, -147.6, 0, 40, 0, -85], [-48.8, -144.8, 2.9, 120, 20, 30], [-47.4, -146.4, 5.4, 300, 10, -20]].forEach(([x, z, dy, yaw, rx, rz], i) => grp(`PileChair${i}`, () => studentChair(tilted([x, y + 0.2 + dy, z], yaw, rx, rz))));
    // 천장에 걸린 교복 윗도리
    for (let k = 0; k < 5; k++) {
      const x = -60 - k * 4.2, z = -146.5 + (k % 2) * 2.6 + (rnd() - 0.5), top = y + hh - 1.6 - rnd() * 0.8, yaw = rnd() * 60 - 30;
      const Fu = yawFrame([x, top, z], yaw);
      rod('HangWire', [x, y + hh, z], [x, top + 0.2, z], 0.03, [16, 16, 16], 'SmoothPlastic', { ...so, min: 0.02 });
      FB(Fu, 'Hanger', -0.75, 0.05, -0.04, 0.75, 0.14, 0.04, [60, 60, 60], 'Metal', so);
      // 교복 재킷: 어깨가 좁아지는 몸판 + 소매 + 흰 깃 + 이름표 (얇게)
      FB(Fu, 'Uniform', -0.62, -2.2, -0.07, 0.62, -0.25, 0.07, [24, 28, 46], 'Fabric', so);
      FP(Fu, 'Shoulder', [1.5, 0.3, 0.12], [0, -0.12, 0], [24, 28, 46], 'Fabric', so);
      [-1, 1].forEach((sd) => FP(Fu, 'Sleeve', [0.26, 1.9, 0.12], [sd * 0.78, -1.1, 0], [22, 26, 42], 'Fabric', { ...so, axes: [[Math.cos(sd * 0.12), Math.sin(sd * 0.12), 0], [-Math.sin(sd * 0.12), Math.cos(sd * 0.12), 0], [0, 0, 1]] }));
      FB(Fu, 'Collar', -0.26, -0.55, -0.085, 0.26, 0.0, -0.07, [222, 220, 212], 'Fabric', { ...so, min: 0.015 });
      FB(Fu, 'NameTag', 0.18, -0.95, -0.085, 0.5, -0.82, -0.07, [240, 240, 236], 'SmoothPlastic', { ...so, min: 0.015 });
    }
    // 4시 44분에 멈춘 시계들
    [-22, -58, -84].forEach((x) => wallClock([x, y + 6.9, zi1], [0, 0, -1], [0, 1, 0], 1.3, { h: 4, m: 44, s: 44 }));
    // 피로 쓴 글씨
    atlasText('godown', [xe - 2.8, y + 5.2, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 5.2, { tilt: -4 });
    atlasText('fourth', [-34, y + 5.0, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 7.0, { tilt: 3 });
    atlasText('fourth', [-65.5, y + 4.4, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 9.0, { tilt: -6 });
    atlasText('fourth', [-77.5, y + 6.6, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 4.4, { tilt: 8 });
    atlasText('playwithme', [-88, y + 3.6, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 4.0, { tilt: -3 });
    atlasText('whoareyou', [xw + 0.65, y + 5.0, -146], [0, 0, -1], [0, 1, 0], [1, 0, 0], 8.0, { tilt: 2 });
    for (let k = 0; k < 12; k++) handprint([xw + 14 + rnd() * 70, y + 2.2 + rnd() * 4.5, zi0 + 0.05], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.8 + rnd() * 0.5, { drag: rnd() * 2 });
    // 복도 끝: 벽을 보고 놓인 의자 네 개
    for (let k = 0; k < 4; k++) grp(`EndChair${k}`, () => studentChair(yawFrame([xw + 3.2, y + 0.12, -148.8 + k * 2.0], 180 + (rnd() - 0.5) * 8)));
    B('FourthZone', xw, y, zn, xe, y + hh, zs, [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true });
    B('FourthEnd', xw, y, zn, xw + 16, y + hh, zs, [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true });
    P('FourthGhostSpot', [0.2, 0.2, 0.2], [xw + 7, y + 0.12, -145], [255, 0, 0], 'SmoothPlastic', { t: 1, nc: true, hidden: true });
  });
  SHIFT = null;
  // 1) 칠판: "뒤를 돌아보지 마" (2-2 교실 칠판 기준)
  const cls = rooms.find((r) => r.name === '2-2');
  const bc = [cls.xa + 0.32, cls.L + 5.6, (PART1 + ROOM1) / 2];
  propGroup('BoardWarning', bc, () => {
    chalkWrite('dontlook', bc, 0.2, -0.15, 12.4, { tilt: -2, lift: 0.03, name: 'WarningChalk' });
  });
  // 2) 화장실: 거울에 피로 "열어줘", 세 번째 칸 문에 손자국, 문 밑으로 번진 피 (3층 화장실 기준)
  const wc = rooms.find((r) => r.name === '화장실' && r.f === 2);
  const z0 = PART1, z1 = ROOM1, L = wc.L;
  const mz = (z0 + 6.5 + z1 - 4.5) / 2;
  const wxa = wc.xa + 15.3; // 여자 화장실 서쪽 벽
  const mirrorFace = [wxa + 0.1, L + 6.0, mz];
  propGroup('RestroomBlood', mirrorFace, () => {
    atlasText('openme', vadd(mirrorFace, [0, -0.3, 0]), [0, 0, -1], [0, 1, 0], [1, 0, 0], 8.6, { tilt: 4, lift: 0.02 });
    const sx0 = wc.xb - 5.4, dz = z0 + 14.0;
    handprint([sx0 - 0.1, L + 4.7, dz - 0.4], [0, 0, 1], [0, 1, 0], [-1, 0, 0], 0.95, { drag: 4 });
    handprint([sx0 - 0.1, L + 3.0, dz + 0.7], [0, 0, 1], [0, 1, 0], [-1, 0, 0], 0.85, { drag: 2 });
    for (let k = 0; k < 9; k++) floorDrop(sx0 - 0.4 - rnd() * 1.6, L + 0.05, dz + (rnd() - 0.5) * 2.6, 0.6 + rnd() * 1.4, rnd() * 6);
    for (let k = 0; k < 22; k++) {
      const t = k / 21;
      const x = sx0 - 2.2 + (wxa + 3.2 - (sx0 - 2.2)) * t + (rnd() - 0.5) * 0.8;
      const z = dz + (mz - dz) * t + (rnd() - 0.5) * 0.8;
      floorDrop(x, L + 0.05, z, 0.12 + rnd() * 0.3, rnd() * 6);
    }
  });
  // 3) 1층 현관 거울에 "너도 남아"
  const hm = [-9.7, LV[0] + 5.4, -147];
  propGroup('HallMirrorBlood', hm, () => {
    atlasText('stay', vadd(hm, [0, -0.3, 0]), [0, 0, -1], [0, 1, 0], [1, 0, 0], 7.0, { tilt: -3, lift: 0.02 });
    handprint([-9.7, LV[0] + 3.0, -144.0], [0, 0, -1], [0, 1, 0], [1, 0, 0], 0.9, { drag: 3 });
  });
}

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

SHIFT = SOUTH;
car('IntroCar', 40.5, 162, 0, [46, 52, 64], { tag: 'IntroCar', lightsOn: true, plate: '35싸 0412', pov: true });
SHIFT = null;

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
