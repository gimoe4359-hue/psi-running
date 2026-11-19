// 출근 차량: 2010년대 한국 중형 SUV (쏘렌토R·싼타페 느낌) 검은 메시. 친구 5명이 같이 타고 학교로 간다.
//   전장 4,685 · 전폭 1,885 · 전고 1,710 · 축간거리 2,700 · 윤거 1,618 (mm), 235/65R17
//   1 m = 3.1 stud → 길이 14.5, 폭 5.84, 높이 5.3, 축간 8.37
// 기준점 = 차 가운데 바닥(타이어 밑), 앞 = -Z. 색마다 메시를 나눈다. 좌석·불빛·번호판은 generate.js 파트.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildSuvInterior } from './suv_interior.js';

const M = 3.1;
const LEN = 14.52, HW = 5.84 / 2, ROOF = 5.3;
const ZF = -LEN / 2, ZR = LEN / 2;
const WB = 2.7 * M, FOH = 0.93 * M;
const WZF = ZF + FOH, WZR = WZF + WB;
const TRACK = 1.618 * M, WR = 0.3675 * M;
const ARCH = WR + 0.28;
export const SUV_DIM = { LEN, HW, ROOF, WZF, WZR, WR };

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
function curve(pts) {
  return (z) => {
    if (z <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) {
      const [z0, v0] = pts[i - 1], [z1, v1] = pts[i];
      return lerp(v0, v1, smooth((z - z0) / (z1 - z0)));
    }
    return pts[pts.length - 1][1];
  };
}
const clean = (g) => { const h = g.index ? g.toNonIndexed() : g.clone(); ['uv', 'uv1', 'uv2'].forEach((k) => h.deleteAttribute(k)); if (!h.attributes.normal) h.computeVertexNormals(); return h; };
const ni = (gs) => mergeGeometries(gs.filter(Boolean).map(clean));
// 좌우 뒤집기: 뒤집으면 면이 안쪽을 보게 되므로 삼각형 감는 방향도 되돌린다
function flipX(g) {
  const h = g.index ? g.toNonIndexed() : g;
  h.scale(-1, 1, 1);
  const p = h.attributes.position;
  for (let i = 0; i < p.count; i += 3) { const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1); p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, x, y, z); }
  h.deleteAttribute('normal'); h.computeVertexNormals();
  return h;
}

// 격자 면: P(u, v) → [x, y, z]. 바깥을 보게 감는다 (축 (0, axisY) 에서 멀어지는 쪽이 앞면)
function grid(nu, nv, P, axisY = 2.4) {
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...P(i / nu, j / nv));
  const id = (i, j) => i * (nv + 1) + j;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) idx.push(id(i, j), id(i + 1, j), id(i, j + 1), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = id(nu >> 1, nv >> 1), n = g.attributes.normal, p = g.attributes.position;
  const out = p.getX(m) * n.getX(m) + (p.getY(m) - axisY) * n.getY(m);
  if (out < 0) { for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// ── 차체 모양 (SUV: 높은 어깨선, 거의 평평한 허리, 높은 바닥) ──
const beltY = curve([[ZF, 2.95], [ZF + 0.35, 3.18], [ZF + 1.7, 3.3], [-2.6, 3.4], [1.0, 3.44], [4.5, 3.56], [ZR - 0.5, 3.62], [ZR - 0.08, 3.5], [ZR, 3.3]]);
const sillY = curve([[ZF, 1.12], [ZF + 0.7, 0.98], [ZR - 0.8, 1.0], [ZR, 1.28]]);
const planW = (z) => {
  const e = Math.max(0, (Math.abs(z) - (LEN / 2 - (z < 0 ? 0.7 : 0.5))) / (z < 0 ? 0.7 : 0.5));
  return HW * Math.sqrt(Math.max(0.02, 1 - e * e * e * 0.9));
};
function bottomY(z) {
  let y = sillY(z);
  [WZF, WZR].forEach((wz) => { const d = z - wz; if (Math.abs(d) < ARCH) y = Math.max(y, WR + Math.sqrt(ARCH * ARCH - d * d) - 0.02); });
  return y;
}
function bodyPt(z, v) {
  const w = planW(z), yt = beltY(z), yb = bottomY(z), h = yt - yb;
  const a = v * Math.PI * 2 - Math.PI / 2;
  const c = Math.cos(a), s = Math.sin(a);
  let x = w * Math.sign(c) * Math.abs(c) ** (s > 0 ? 0.14 : 0.24);
  const y = yb + h * (0.5 + 0.5 * Math.sign(s) * Math.abs(s) ** (s > 0 ? 0.5 : 0.22));
  const t = (y - yb) / Math.max(0.01, h);
  x *= 1 - 0.05 * (1 - t) * (1 - t) - 0.05 * Math.max(0, t - 0.82) / 0.18;
  return [x, y, z];
}
// 유리 온실: 앞유리 → 길고 평평한 지붕 → 거의 서 있는 뒷유리(테일게이트)
const ZW = -2.6, ZT = ZR - 0.32;
const roofY = curve([[ZW, 3.4], [-1.25, 4.72], [-0.2, 5.2], [0.8, ROOF], [5.0, ROOF - 0.04], [5.9, 5.12], [6.4, 4.7], [ZT, 3.62]]);
function bodyHalfAt(z, y) {
  let best = 0;
  for (let k = 0; k <= 60; k++) { const p = bodyPt(z, 0.25 + 0.25 * k / 60); if (p[1] >= y) best = Math.max(best, p[0]); }
  return best || planW(z) * 0.5;
}
function ghPt(z, u) {
  const yb = beltY(z) - 0.03, yt = roofY(z), wb = bodyHalfAt(z, beltY(z) - 0.08) * 0.97, wt = Math.min(wb, planW(z) * 0.86);
  const side = u < 0.5 ? -1 : 1, q = u < 0.5 ? u * 2 : (1 - u) * 2;
  const sideH = 0.6, h = Math.max(0.02, yt - yb);
  if (q < sideH) { const t = q / sideH; return [side * lerp(wb, wt, smooth(t)), yb + h * 0.86 * t, z]; }
  const t = (q - sideH) / (1 - sideH), ang = t * Math.PI / 2;
  return [side * wt * Math.cos(ang) ** 0.5, yb + h * (0.86 + 0.14 * Math.sin(ang) ** 0.7), z];
}

export function buildSUV() {
  const paint = [24, 26, 30]; // 검은 펄
  // 차체: 실내(앞유리 밑 ~ 뒷문) 구간은 위를 막지 않고 속을 파낸 '욕조' 모양 (문 두께 → 안쪽 벽 → 바닥, 뒷바퀴 자리는 옆에 볼록한 휠하우스)
  // 이렇게 해야 차 안에 앉았을 때 좌석·대시보드가 보이고, 차체 윗면 위에 서 있는 느낌이 안 난다
  const NV = 96, FLOOR = 1.22, ZC0 = ZW + 0.05, ZC1 = ZT - 0.05;
  const cabinPt = (z, v) => {
    const vs = 0.3;
    if (z < ZC0 || z > ZC1 || v <= vs || v >= 1 - vs) return bodyPt(z, v);
    const R = bodyPt(z, vs), yt = R[1], xo = R[0];
    const xr = xo - 0.2, hump = bottomY(z) + 0.14, xh = Math.min(xr, 1.98);
    const ledge = hump > FLOOR + 0.05;
    // 오른쪽 → 왼쪽으로 가는 길 (구간마다 정해진 몫)
    const pts = ledge
      ? [[xo, yt], [xr, yt], [xr, hump], [xh, hump], [xh, FLOOR], [-xh, FLOOR], [-xh, hump], [-xr, hump], [-xr, yt], [-xo, yt]]
      : [[xo, yt], [xr, yt], [xr, (yt + FLOOR) / 2], [xr, FLOOR - 0.0001], [xr - 0.0002, FLOOR], [-xr + 0.0002, FLOOR], [-xr, FLOOR - 0.0001], [-xr, (yt + FLOOR) / 2], [-xr, yt], [-xo, yt]];
    const share = [0.05, 0.12, 0.06, 0.08, 0.18, 0.08, 0.06, 0.12, 0.05];
    const tot = share.reduce((a, b) => a + b, 0);
    let q = (v - vs) / (1 - 2 * vs) * tot;
    for (let k = 0; k < share.length; k++) {
      if (q <= share[k] || k === share.length - 1) { const t = Math.min(1, q / share[k]); const A = pts[k], B = pts[k + 1]; return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), z]; }
      q -= share[k];
    }
    return bodyPt(z, v);
  };
  // 방향 판정 기준점을 아주 아래(-100)로 두어 가운데 바닥(위를 보는 면)이 바깥면으로 잡히게 한다
  const body = grid(90, NV, (i, j) => cabinPt(lerp(ZF, ZR, i), j), -100);
  const cap = (z) => grid(1, NV, (i, j) => (i ? [0, (beltY(z) + bottomY(z)) / 2, z] : bodyPt(z, j)), (beltY(z) + bottomY(z)) / 2);
  const both = (g) => { const h = clean(g), f = h.clone(); const p = f.attributes.position;
    for (let k = 0; k < p.count; k += 3) { const x = p.getX(k + 1), y = p.getY(k + 1), z = p.getZ(k + 1); p.setXYZ(k + 1, p.getX(k + 2), p.getY(k + 2), p.getZ(k + 2)); p.setXYZ(k + 2, x, y, z); }
    f.deleteAttribute('normal'); f.computeVertexNormals(); return [h, f]; };
  const paintGeo = [body, ...both(cap(ZF)), ...both(cap(ZR))];

  const glass = grid(64, 30, (i, j) => ghPt(lerp(ZW, ZT, i), j), 2.9);
  const off = (p, d) => { const n = Math.hypot(p[0], p[1] - 2.9) || 1; return [p[0] + d * p[0] / n, p[1] + d * (p[1] - 2.9) / n, p[2]]; };
  const patch = (z0, z1, u0, u1, d = 0.025, nz = 24, nu = 8) => grid(nz, nu, (i, j) => off(ghPt(lerp(z0, z1, i), lerp(u0, u1, j)), d), 2.9);
  const roofPaint = [
    patch(-1.1, 6.15, 0.33, 0.67, 0.03, 40, 8),           // 지붕
    patch(ZW + 0.05, -1.1, 0.27, 0.34, 0.03, 20, 3),     // A필러
    patch(ZW + 0.05, -1.1, 0.66, 0.73, 0.03, 20, 3),
    patch(5.75, ZT - 0.05, 0.0, 0.34, 0.03, 12, 10),     // D필러
    patch(5.75, ZT - 0.05, 0.66, 1.0, 0.03, 12, 10),
  ];
  const black = [
    patch(0.6, 0.95, 0.0, 0.29, 0.03, 3, 6), patch(0.6, 0.95, 0.71, 1.0, 0.03, 3, 6), // B필러
    patch(3.7, 4.1, 0.0, 0.29, 0.03, 3, 6), patch(3.7, 4.1, 0.71, 1.0, 0.03, 3, 6),   // C필러
  ];
  const chrome = [
    patch(ZW + 0.3, 5.75, 0.0, 0.022, 0.04, 36, 1), patch(ZW + 0.3, 5.75, 0.978, 1.0, 0.04, 36, 1),
  ];
  // 루프랙 (은색 레일 두 줄 + 받침)
  const rails = [];
  [-1, 1].forEach((sx) => {
    const pts = [];
    for (let k = 0; k <= 24; k++) { const z = lerp(-0.6, 5.7, k / 24); const p = ghPt(z, sx < 0 ? 0.36 : 0.64); pts.push(new THREE.Vector3(p[0] * 0.98, p[1] + 0.22, z)); }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 6, false); tube.scale(1, 1, 1); rails.push(tube);
    [-0.5, 2.6, 5.6].forEach((z) => { const p = ghPt(z, sx < 0 ? 0.36 : 0.64); const f = new THREE.BoxGeometry(0.16, 0.26, 0.36); f.translate(p[0] * 0.98, p[1] + 0.1, z); rails.push(f); });
  });

  // 문 틈, 손잡이, 옆 몰딩(검은 클래딩), 문 아래 크롬
  const bodyOff = (z, v, d) => { const p = bodyPt(z, v), n = Math.hypot(p[0], p[1] - 2.2) || 1; return [p[0] + d * p[0] / n, p[1] + d * (p[1] - 2.2) / n, p[2]]; };
  const bpatch = (z0, z1, v0, v1, d = 0.02, nz = 12, nv = 2) => grid(nz, nv, (i, j) => bodyOff(lerp(z0, z1, i), lerp(v0, v1, j), d), 2.2);
  const dark = [], lights = [], red = [], amber = [], grille = [];
  [0.2, 0.8].forEach((v) => {
    [-2.45, 0.75, 3.85].forEach((z) => black.push(bpatch(z, z + 0.04, v - 0.1, v + 0.08, 0.015, 1, 4)));
    [-0.85, 2.3].forEach((z) => chrome.push(bpatch(z, z + 0.62, v + 0.012, v + 0.022, 0.06, 4, 1)));
    // 아래쪽 검은 플라스틱 클래딩 + 크롬 띠
    dark.push(bpatch(ZF + 1.2, ZR - 1.0, v < 0.5 ? v - 0.2 : v + 0.12, v < 0.5 ? v - 0.12 : v + 0.2, 0.025, 40, 2));
    chrome.push(bpatch(-2.3, 3.8, v < 0.5 ? v - 0.12 : v + 0.11, v < 0.5 ? v - 0.11 : v + 0.12, 0.035, 30, 1));
  });

  // 앞·뒤 끝에서 안쪽으로 조금씩 들어가며 처음 차체 안이 되는 z (바퀴집에 걸려 엉뚱한 곳으로 가지 않게)
  const endZ = (x, front, y = 1.5) => {
    const ok = (m) => planW(m) * 0.995 >= Math.abs(x) && beltY(m) - 0.05 >= y && bottomY(m) <= y + 0.05;
    const step = 0.01;
    if (front) { for (let z = ZF; z < ZF + 3; z += step) if (ok(z)) return z; return ZF + 3; }
    for (let z = ZR; z > ZR - 3; z -= step) if (ok(z)) return z; return ZR - 3;
  };
  const faceGrid = (front, X, Yt, Yb, d = 0.02, ns = 20, nt = 4) => {
    const g = grid(ns, nt, (si, ti) => { const x = X(si), y = lerp(Yb(si), Yt(si), ti), z = endZ(x, front, y); return [x, y, z + (front ? -d : d)]; }, 0);
    const n = g.attributes.normal; let sum = 0; for (let k = 0; k < n.count; k++) sum += n.getZ(k);
    if ((front && sum > 0) || (!front && sum < 0)) { const idx = g.index.array; for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    return g;
  };
  // ── 앞: 크고 세로로 높은 크롬 그릴, 옆으로 찢어진 헤드램프, 아래 은색 스키드 플레이트 ──
  const gw = 1.4, gTop = (s) => 2.92 + 0.05 * Math.sin(s * Math.PI), gBot = (s) => 2.08 - 0.06 * Math.sin(s * Math.PI);
  grille.push(faceGrid(true, (s) => lerp(-gw, gw, s), gTop, gBot, 0.03, 24, 4));
  chrome.push(faceGrid(true, (s) => lerp(-gw - 0.08, gw + 0.08, s), (s) => gTop(s) + 0.09, (s) => gTop(s) - 0.01, 0.045, 24, 1));
  chrome.push(faceGrid(true, (s) => lerp(-gw - 0.08, gw + 0.08, s), (s) => gBot(s) + 0.01, (s) => gBot(s) - 0.09, 0.045, 24, 1));
  for (let k = 1; k < 5; k++) chrome.push(faceGrid(true, (s) => lerp(-gw + 0.08, gw - 0.08, s), (s) => lerp(gBot(s), gTop(s), k / 5) + 0.035, (s) => lerp(gBot(s), gTop(s), k / 5) - 0.035, 0.07, 16, 1));
  const emblem = new THREE.SphereGeometry(0.22, 16, 8); emblem.scale(1.4, 0.75, 0.25); emblem.translate(0, 2.5, endZ(0, true, 2.5) - 0.1); chrome.push(emblem);
  dark.push(faceGrid(true, (s) => lerp(-1.6, 1.6, s), () => 1.62, () => 1.3, 0.025, 20, 2));            // 아래 공기구멍
  chrome.push(faceGrid(true, (s) => lerp(-1.5, 1.5, s), () => 1.22, () => 1.02, 0.035, 20, 2));         // 스키드 플레이트
  [-1, 1].forEach((sx) => {
    const hX = (s) => lerp(sx * 1.48, sx * 2.72, s);
    lights.push(faceGrid(true, hX, (s) => 3.0 + 0.1 * s, (s) => 2.55 + 0.28 * s * s, 0.03, 16, 3));
    dark.push(faceGrid(true, hX, (s) => 3.05 + 0.1 * s, (s) => 3.0 + 0.1 * s, 0.035, 16, 1));
    [0.2, 0.55].forEach((t) => { const x = hX(t), y = 2.72 + 0.08 * t; const r = new THREE.TorusGeometry(0.13, 0.035, 6, 16); r.translate(x, y, endZ(x, true, y) - 0.05); dark.push(r); });
    const fX = (s) => lerp(sx * 1.9, sx * 2.6, s);
    dark.push(faceGrid(true, fX, () => 1.85, () => 1.35, 0.025, 8, 2));
    lights.push(faceGrid(true, (s) => lerp(sx * 2.05, sx * 2.45, s), () => 1.72, () => 1.5, 0.04, 6, 1));   // 안개등
    // 사이드미러 (방향지시등 달림)
    const mir = new THREE.SphereGeometry(0.38, 14, 8); mir.scale(1.3, 0.72, 0.75); mir.translate(sx * 3.2, 3.72, -2.25); paintGeo.push(mir);
    const sig = new THREE.BoxGeometry(0.5, 0.06, 0.08); sig.translate(sx * 3.25, 3.52, -2.52); amber.push(sig);
    const arm = new THREE.BoxGeometry(0.4, 0.16, 0.42); arm.translate(sx * 2.86, 3.58, -2.3); dark.push(arm);
    // 뒤: 세로로 선 테일램프 (뒷유리 옆 기둥을 따라 위로)
    const tX = (s) => lerp(sx * 2.05, sx * 2.82, s);
    red.push(faceGrid(false, tX, (s) => 3.55 - 0.1 * s, (s) => 2.72 - 0.05 * s, 0.03, 10, 4));
    lights.push(faceGrid(false, (s) => lerp(sx * 2.15, sx * 2.5, s), () => 3.0, () => 2.86, 0.045, 4, 1));
    red.push(faceGrid(false, (s) => lerp(sx * 1.9, sx * 2.6, s), () => 1.72, () => 1.64, 0.03, 6, 1));   // 반사판
  });
  // 뒤: 테일게이트 크롬, 엠블럼, 범퍼 아래 검은 디퓨저 + 은색 스키드, 지붕 끝 스포일러(+보조 제동등), 와이퍼
  chrome.push(faceGrid(false, (s) => lerp(-1.25, 1.25, s), () => 3.12, () => 3.06, 0.035, 12, 1));
  const rearEmblem = new THREE.SphereGeometry(0.2, 14, 8); rearEmblem.scale(1.4, 0.75, 0.25); rearEmblem.translate(0, 3.3, endZ(0, false, 3.3) + 0.04); chrome.push(rearEmblem);
  dark.push(faceGrid(false, (s) => lerp(-2.3, 2.3, s), () => 1.58, () => 1.15, 0.025, 20, 2));
  chrome.push(faceGrid(false, (s) => lerp(-1.4, 1.4, s), () => 1.3, () => 1.16, 0.035, 12, 1));
  const spoiler = new THREE.BoxGeometry(4.2, 0.14, 0.55); spoiler.translate(0, roofY(ZT - 0.45) + 0.05, ZT - 0.2); paintGeo.push(spoiler);
  const brake = new THREE.BoxGeometry(1.0, 0.07, 0.06); brake.translate(0, roofY(ZT - 0.45) - 0.03, ZT + 0.06); red.push(brake);
  const wiper = new THREE.BoxGeometry(1.4, 0.05, 0.06); wiper.translate(0.3, 4.15, ZT + 0.04); wiper.rotateZ(0.06); dark.push(wiper);
  const pipe = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16, 1, true); pipe.rotateX(Math.PI / 2); pipe.translate(-1.6, 1.1, endZ(-1.6, false, 1.4) + 0.02); chrome.push(pipe);
  const shark = new THREE.ConeGeometry(0.12, 0.3, 4); shark.scale(0.6, 1, 2.2); shark.translate(0, ROOF + 0.1, 5.2); dark.push(shark);
  const under = new THREE.BoxGeometry(5.0, 0.1, LEN - 2.2); under.translate(0, 1.0, 0); dark.push(under);

  // ── 바퀴: 굵은 타이어 + 5더블스포크 휠 ──
  const tires = [], rims = [], wells = [];
  [-1, 1].forEach((sx) => [WZF, WZR].forEach((wz) => {
    const wx = sx * (TRACK / 2);
    const prof = [];
    for (let k = 0; k <= 14; k++) { const a = -Math.PI / 2 + (k / 14) * Math.PI; prof.push(new THREE.Vector2(WR * 0.68 + WR * 0.32 * Math.abs(Math.cos(a)) ** 0.6, 0.4 * Math.sin(a))); }
    const t = new THREE.LatheGeometry(prof, 36); t.rotateZ(Math.PI / 2); t.translate(wx, WR, wz); tires.push(t);
    const face = sx * 0.34;
    const lip = new THREE.TorusGeometry(WR * 0.66, 0.04, 6, 36); lip.rotateY(Math.PI / 2); lip.translate(wx + face, WR, wz); rims.push(lip);
    for (let k = 0; k < 10; k++) {
      const a = (Math.floor(k / 2) / 5) * Math.PI * 2 + (k % 2 ? 0.13 : -0.13);
      const sp = new THREE.BoxGeometry(0.06, WR * 0.52, 0.1); sp.translate(0, WR * 0.36, 0); sp.rotateX(a); sp.translate(wx + face - sx * 0.04, WR, wz); rims.push(sp);
    }
    const hub = new THREE.CylinderGeometry(0.2, 0.25, 0.12, 16); hub.rotateZ(Math.PI / 2); hub.translate(wx + face, WR, wz); rims.push(hub);
    const disc = new THREE.CylinderGeometry(WR * 0.55, WR * 0.55, 0.06, 24); disc.rotateZ(Math.PI / 2); disc.translate(wx - sx * 0.05, WR, wz); wells.push(disc);
    const liner = new THREE.CylinderGeometry(ARCH - 0.02, ARCH - 0.02, 1.2, 30, 1, true, -Math.PI / 2, Math.PI); liner.rotateZ(Math.PI / 2); liner.translate(sx * (HW - 0.65), WR, wz); wells.push(liner);
    // 바퀴집 둘레 검은 펜더 몰딩
    const flare = new THREE.TorusGeometry(ARCH + 0.04, 0.09, 6, 24, Math.PI); flare.rotateY(Math.PI / 2); flare.translate(sx * (HW - 0.12), WR, wz); dark.push(flare);
  }));

  return [
    { name: 'Paint', geo: ni(paintGeo), color: paint, material: 'SmoothPlastic', reflectance: 0.22 },
    { name: 'RoofPillars', geo: ni(roofPaint.flatMap(both)), color: paint, material: 'SmoothPlastic', reflectance: 0.22 },
    { name: 'Glass', geo: ni(both(glass)), color: [18, 22, 28], material: 'Glass', reflectance: 0.45, transparency: 0.18 },
    { name: 'Grille', geo: ni(grille), color: [52, 54, 58], material: 'Metal', reflectance: 0.15 },
    { name: 'Black', geo: ni([...black, ...dark]), color: [14, 14, 16], material: 'SmoothPlastic' },
    { name: 'Chrome', geo: ni(chrome), color: [206, 210, 214], material: 'Metal', reflectance: 0.35 },
    { name: 'Rails', geo: ni(rails), color: [150, 154, 160], material: 'Metal', reflectance: 0.2 },
    { name: 'Lamps', geo: ni(lights), color: [232, 236, 240], material: 'Glass', reflectance: 0.4, transparency: 0.05 },
    { name: 'TailLamps', geo: ni(red), color: [168, 22, 26], material: 'Glass', reflectance: 0.3 },
    { name: 'Amber', geo: ni(amber), color: [255, 150, 30], material: 'Glass', reflectance: 0.2 },
    { name: 'Tires', geo: ni(tires), color: [26, 26, 28], material: 'Rubber' },
    { name: 'Wheels', geo: ni(rims), color: [176, 180, 186], material: 'Metal', reflectance: 0.25 },
    { name: 'WheelDark', geo: ni(wells), color: [16, 16, 18], material: 'SmoothPlastic', shadow: false },
    ...buildSuvInterior(),
  ];
}
