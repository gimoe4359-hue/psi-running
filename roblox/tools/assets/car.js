// 주인공 차: 1세대 기아 K5 (2010) 은색 세단 메시. 사진의 치수를 그대로 옮겼다.
//   전장 4,845 · 전폭 1,835 · 전고 1,455 · 축간거리 2,795 · 윤거 1,601 (mm), 18인치 휠
//   1 m = 3.1 stud → 길이 15.0, 폭 5.69, 높이 4.51, 축간 8.66, 윤거 4.96
// 기준점 = 차 가운데 바닥(타이어 밑), 앞 = -Z. MeshPart 하나 = 색 하나라서 색마다 메시를 나눈다.
// 불빛(HeadBeam)·번호판·실내는 generate.js 의 파트가 그대로 남는다(Templates 의 show).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const M = 3.1;
const LEN = 15.0, HW = 5.69 / 2, ROOF = 4.51;
const ZF = -LEN / 2, ZR = LEN / 2;
const WB = 2.795 * M, FOH = 0.965 * M;          // 앞 오버행
const WZF = ZF + FOH, WZR = WZF + WB;            // 앞·뒤 바퀴 z
const TRACK = 1.601 * M, WR = 0.33 * M;          // 바퀴 반지름 (225/45R18 ≈ 0.66 m)
const ARCH = WR + 0.22;

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

// ── 차체 모양 ──
// 옆에서 본 어깨(창 아래) 높이: 앞으로 낮아지는 쐐기형
const beltY = curve([[ZF, 1.72], [ZF + 0.45, 2.22], [ZF + 1.5, 2.6], [-2.45, 3.0], [1.0, 3.06], [3.4, 3.14], [5.2, 3.22], [ZR - 0.55, 3.26], [ZR - 0.1, 3.05], [ZR, 2.8]]);
const sillY = curve([[ZF, 0.82], [ZF + 0.6, 0.6], [ZR - 0.7, 0.64], [ZR, 0.95]]);
// 위에서 본 반폭 (앞뒤가 둥글다)
const planW = (z) => {
  const e = Math.max(0, (Math.abs(z) - (LEN / 2 - 0.9)) / 0.9);
  return HW * Math.sqrt(Math.max(0.02, 1 - e * e * e * 0.92));
};
// 바퀴집: 바닥선을 바퀴 둘레로 올린다
function bottomY(z) {
  let y = sillY(z);
  [WZF, WZR].forEach((wz) => { const d = z - wz; if (Math.abs(d) < ARCH) y = Math.max(y, WR + Math.sqrt(ARCH * ARCH - d * d) - 0.02); });
  return y;
}
// 차체 단면의 한 점: v ∈ [0,1] 아래 가운데 → 오른쪽 → 위 → 왼쪽 → 아래 가운데
function bodyPt(z, v) {
  const w = planW(z), yt = beltY(z), yb = bottomY(z), h = yt - yb;
  const a = v * Math.PI * 2 - Math.PI / 2;
  const c = Math.cos(a), s = Math.sin(a);
  let x = w * Math.sign(c) * Math.abs(c) ** (s > 0 ? 0.16 : 0.3); // 위쪽 어깨는 넓게 (지붕을 받치는 넓은 어깨)
  const y = yb + h * (0.5 + 0.5 * Math.sign(s) * Math.abs(s) ** (s > 0 ? 0.6 : 0.25));
  const t = (y - yb) / Math.max(0.01, h);
  x *= 1 - 0.07 * (1 - t) * (1 - t) - 0.06 * Math.max(0, t - 0.8) / 0.2; // 아래는 안으로, 어깨 위도 안으로
  return [x, y, z];
}

// 유리 온실: 앞유리 아래 → 지붕 꼭대기 → 뒷유리 → 트렁크
const ZW = -2.45, ZT = 4.95;
const roofY = curve([[ZW, 3.0], [-0.9, 4.08], [0.4, 4.46], [1.6, ROOF], [2.6, 4.46], [3.7, 4.0], [ZT, 3.22]]);
// 차체 단면에서 높이 y 일 때 바깥 반폭 (유리 아랫단을 어깨에 딱 맞추려고)
function bodyHalfAt(z, y) {
  let best = 0;
  for (let k = 0; k <= 60; k++) { const p = bodyPt(z, 0.25 + 0.25 * k / 60); if (p[1] >= y) best = Math.max(best, p[0]); }
  return best || planW(z) * 0.5;
}
function ghPt(z, u) {
  // u ∈ [0,1]: 왼쪽 아래 → 왼쪽 위 → 지붕 → 오른쪽 위 → 오른쪽 아래
  const yb = beltY(z) - 0.03, yt = roofY(z), wb = bodyHalfAt(z, beltY(z) - 0.08) * 0.97, wt = Math.min(wb, planW(z) * 0.8);
  const side = u < 0.5 ? -1 : 1, q = u < 0.5 ? u * 2 : (1 - u) * 2;
  const sideH = 0.62, h = Math.max(0.02, yt - yb);
  if (q < sideH) { const t = q / sideH; return [side * lerp(wb, wt, smooth(t)), yb + h * 0.82 * t, z]; }
  const t = (q - sideH) / (1 - sideH), ang = t * Math.PI / 2;
  return [side * wt * Math.cos(ang) ** 0.6, yb + h * (0.82 + 0.18 * Math.sin(ang) ** 0.7), z];
}

export function buildCar() {
  const paint = [178, 182, 186];
  // ── 차체 ──
  const NV = 48;
  const body = grid(76, NV, (i, j) => bodyPt(lerp(ZF, ZR, i), j));
  const cap = (z) => grid(1, NV, (i, j) => (i ? [0, (beltY(z) + bottomY(z)) / 2, z] : bodyPt(z, j)), (beltY(z) + bottomY(z)) / 2);
  const both = (g) => { const h = clean(g), f = h.clone(); const p = f.attributes.position;
    for (let k = 0; k < p.count; k += 3) { const x = p.getX(k + 1), y = p.getY(k + 1), z = p.getZ(k + 1); p.setXYZ(k + 1, p.getX(k + 2), p.getY(k + 2), p.getZ(k + 2)); p.setXYZ(k + 2, x, y, z); }
    f.deleteAttribute('normal'); f.computeVertexNormals(); return [h, f]; };
  const paintGeo = [body, ...both(cap(ZF)), ...both(cap(ZR))];

  // ── 유리 + 차체색 지붕·기둥 + 검은 B필러 ──
  const glass = grid(60, 30, (i, j) => ghPt(lerp(ZW, ZT, i), j));
  const off = (p, d) => { const n = Math.hypot(p[0], p[1] - 2.4) || 1; return [p[0] + d * p[0] / n, p[1] + d * (p[1] - 2.4) / n, p[2]]; };
  const patch = (z0, z1, u0, u1, d = 0.025, nz = 24, nu = 8) => grid(nz, nu, (i, j) => off(ghPt(lerp(z0, z1, i), lerp(u0, u1, j)), d));
  const roofPaint = [
    patch(-0.85, 3.75, 0.36, 0.64, 0.03),             // 지붕
    patch(ZW + 0.05, -0.85, 0.3, 0.37, 0.03, 20, 3),   // A필러
    patch(ZW + 0.05, -0.85, 0.63, 0.7, 0.03, 20, 3),
    patch(3.0, ZT - 0.05, 0.0, 0.36, 0.03, 16, 10),    // C필러 (넓은 차체색 기둥)
    patch(3.0, ZT - 0.05, 0.64, 1.0, 0.03, 16, 10),
  ];
  const black = [patch(0.95, 1.25, 0.0, 0.31, 0.03, 3, 6), patch(0.95, 1.25, 0.69, 1.0, 0.03, 3, 6)]; // B필러
  const chrome = [ // 창 아래·위 크롬 줄
    patch(ZW + 0.3, 3.0, 0.0, 0.025, 0.04, 30, 1), patch(ZW + 0.3, 3.0, 0.975, 1.0, 0.04, 30, 1),
    patch(-0.6, 3.05, 0.285, 0.3, 0.04, 30, 1), patch(-0.6, 3.05, 0.7, 0.715, 0.04, 30, 1),
  ];

  // ── 차체 위 디테일: 문 틈, 크롬 손잡이, 앞 펜더 가니시 ──
  const bodyOff = (z, v, d) => { const p = bodyPt(z, v), n = Math.hypot(p[0], p[1] - 1.9) || 1; return [p[0] + d * p[0] / n, p[1] + d * (p[1] - 1.9) / n, p[2]]; };
  const bpatch = (z0, z1, v0, v1, d = 0.02, nz = 12, nv = 2) => grid(nz, nv, (i, j) => bodyOff(lerp(z0, z1, i), lerp(v0, v1, j), d), 1.9);
  [0.205, 0.795].forEach((v) => [-2.2, 0.95, 3.75].forEach((z) => black.push(bpatch(z, z + 0.04, v - 0.09, v + 0.07, 0.015, 1, 4))));
  [0.21, 0.79].forEach((v) => {
    [-0.6, 2.5].forEach((z) => chrome.push(bpatch(z, z + 0.62, v + 0.006, v + 0.016, 0.06, 4, 1)));
    chrome.push(bpatch(-2.95, -2.55, v + 0.01, v + 0.045, 0.03, 4, 3));
  });

  // ── 앞·뒤 디테일 ──
  // 앞·뒤 표면 위의 z (위에서 본 둥근 윤곽을 따라감): x 에서 차체 반폭이 x 가 되는 z 를 이분법으로
  const endZ = (x, front, y = 1.5) => {
    let lo = front ? ZF : 0, hi = front ? 0 : ZR;
    const ok = (m) => planW(m) * 0.995 >= Math.abs(x) && beltY(m) - 0.05 >= y;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; const inside = ok(m); if (front ? inside : !inside) hi = m; else lo = m; }
    return front ? hi : lo;
  };
  // 앞·뒤 면에 붙이는 얇은 판: s ∈ [0,1] 가로, t ∈ [0,1] 세로. X(s), Ytop(s), Ybot(s) 로 모양을 정한다
  const facePatch = (front, X, Yt, Yb, d = 0.02, ns = 20, nt = 4) => grid(ns, nt, (si, ti) => {
    const x = X(si), y = lerp(Yb(si), Yt(si), ti), z = endZ(x, front, y);
    return [x, y, z + (front ? -d : d)];
  }, 0);
  const faceGrid = (front, X, Yt, Yb, d, ns, nt) => { // 앞에서 보이도록 감는 방향을 정리
    const g = facePatch(front, X, Yt, Yb, d, ns, nt);
    const n = g.attributes.normal; let sum = 0; for (let k = 0; k < n.count; k++) sum += n.getZ(k);
    if ((front && sum > 0) || (!front && sum < 0)) { const idx = g.index.array; for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
    return g;
  };
  const dark = [], lights = [], red = [];
  // 호랑이 코 그릴: 넓고, 가운데 아래가 살짝 처진 모양 + 크롬 테 + 엠블럼
  const gw = 1.25;
  const gTop = (s) => 2.02 + 0.05 * Math.sin(s * Math.PI), gBot = (s) => 1.55 - 0.1 * Math.exp(-(((s - 0.5) * 9) ** 2));
  const gX = (s) => lerp(-gw, gw, s);
  dark.push(faceGrid(true, gX, gTop, gBot, 0.03, 24, 3));
  chrome.push(faceGrid(true, (s) => lerp(-gw - 0.06, gw + 0.06, s), (s) => gTop(s) + 0.07, (s) => gTop(s) - 0.01, 0.045, 24, 1));
  chrome.push(faceGrid(true, (s) => lerp(-gw - 0.06, gw + 0.06, s), (s) => gBot(s) + 0.01, (s) => gBot(s) - 0.07, 0.045, 24, 1));
  for (let k = 1; k < 5; k++) chrome.push(faceGrid(true, (s) => lerp(-gw + 0.1, gw - 0.1, s), (s) => lerp(gBot(s), gTop(s), k / 5) + 0.012, (s) => lerp(gBot(s), gTop(s), k / 5) - 0.012, 0.035, 16, 1));
  const emblem = new THREE.SphereGeometry(0.2, 16, 8); emblem.scale(1.4, 0.75, 0.25); emblem.translate(0, 2.22, endZ(0, true, 2.22) - 0.02); chrome.push(emblem);
  // 아래 그릴 (넓은 검은 띠) + 번호판 자리
  dark.push(faceGrid(true, (s) => lerp(-1.5, 1.5, s), () => 1.02, () => 0.84, 0.02, 20, 2));
  [-1, 1].forEach((sx) => {
    // 헤드램프: 그릴 옆에서 펜더 쪽으로 올라가며 길게 찢어진 모양
    const hx0 = sx * 1.32, hx1 = sx * 2.62;
    const hX = (s) => lerp(hx0, hx1, s);
    lights.push(faceGrid(true, hX, (s) => 2.2 + 0.28 * s, (s) => 1.88 + 0.36 * s * s, 0.03, 16, 3));
    dark.push(faceGrid(true, hX, (s) => 2.23 + 0.28 * s, (s) => 2.2 + 0.28 * s, 0.035, 16, 1));          // 위쪽 검은 눈썹
    [0.18, 0.5].forEach((t) => { const x = hX(t); const r = new THREE.TorusGeometry(0.1, 0.03, 6, 16); r.translate(x, 2.04 + 0.12 * t, endZ(x, true, 2.04 + 0.12 * t) - 0.05); dark.push(r); });
    // 범퍼 양쪽: 검은 공기 구멍 + 안개등 + LED 줄
    const vX = (s) => lerp(sx * 1.75, sx * 2.55, s);
    dark.push(faceGrid(true, vX, (s) => 1.38 + 0.08 * s, (s) => 0.98 + 0.06 * s, 0.025, 10, 3));
    lights.push(faceGrid(true, (s) => lerp(sx * 2.0, sx * 2.3, s), () => 1.22, () => 1.06, 0.04, 6, 1));
    chrome.push(faceGrid(true, vX, (s) => 1.45 + 0.08 * s, (s) => 1.41 + 0.08 * s, 0.035, 10, 1));
    // 사이드미러
    const mir = new THREE.SphereGeometry(0.34, 14, 8); mir.scale(1.3, 0.7, 0.75); mir.translate(sx * 3.1, 3.3, -1.95); paintGeo.push(mir);
    const arm = new THREE.BoxGeometry(0.35, 0.14, 0.4); arm.translate(sx * 2.78, 3.18, -2.0); dark.push(arm);
    // 뒤: 트렁크 양쪽으로 감싸는 테일램프 (가운데로 갈수록 얇아짐), 아래 반사판
    const tX = (s) => lerp(sx * 0.95, sx * 2.72, s);
    red.push(faceGrid(false, tX, (s) => 3.06 - 0.02 * s, (s) => 2.98 - 0.26 * s, 0.03, 16, 3));
    lights.push(faceGrid(false, (s) => lerp(sx * 2.1, sx * 2.5, s), () => 2.88, () => 2.8, 0.04, 4, 1));
    red.push(faceGrid(false, (s) => lerp(sx * 1.6, sx * 2.4, s), () => 1.36, () => 1.3, 0.03, 6, 1));
  });
  // 뒤: 트렁크 크롬 줄, 엠블럼, 검은 디퓨저, 오른쪽 타원 머플러, 샤크핀 안테나
  chrome.push(faceGrid(false, (s) => lerp(-0.95, 0.95, s), () => 2.99, () => 2.94, 0.035, 12, 1));
  const rearEmblem = new THREE.SphereGeometry(0.18, 14, 8); rearEmblem.scale(1.4, 0.75, 0.25); rearEmblem.translate(0, 3.12, endZ(0, false) + 0.02); chrome.push(rearEmblem);
  dark.push(faceGrid(false, (s) => lerp(-2.0, 2.0, s), () => 1.12, () => 0.8, 0.02, 20, 2));
  const pipe = new THREE.CylinderGeometry(0.16, 0.16, 0.4, 16, 1, true); pipe.scale(1.5, 1, 1); pipe.rotateX(Math.PI / 2); pipe.translate(1.45, 0.9, endZ(1.45, false) + 0.05); chrome.push(pipe);
  const pipeIn = new THREE.CircleGeometry(0.15, 16); pipeIn.scale(1.5, 1, 1); pipeIn.translate(1.45, 0.9, endZ(1.45, false) + 0.1); dark.push(pipeIn);
  const shark = new THREE.ConeGeometry(0.12, 0.3, 4); shark.scale(0.6, 1, 2.2); shark.translate(0, ROOF + 0.12, 3.4); dark.push(shark);
  const under = new THREE.BoxGeometry(5.0, 0.1, LEN - 2.0); under.translate(0, 0.7, 0); dark.push(under);

  // ── 바퀴: 타이어, 10스포크 휠, 브레이크 디스크, 바퀴집 안쪽(검정) ──
  const tires = [], rims = [], wells = [];
  [-1, 1].forEach((sx) => [WZF, WZR].forEach((wz) => {
    const wx = sx * (TRACK / 2);
    const prof = [];
    for (let k = 0; k <= 14; k++) { const a = -Math.PI / 2 + (k / 14) * Math.PI; prof.push(new THREE.Vector2(WR * 0.78 + WR * 0.22 * Math.abs(Math.cos(a)) ** 0.7, 0.36 * Math.sin(a))); }
    const t = new THREE.LatheGeometry(prof, 36); t.rotateZ(Math.PI / 2); t.translate(wx, WR, wz); tires.push(t);
    const face = sx * 0.3;
    const lip = new THREE.TorusGeometry(WR * 0.76, 0.04, 6, 36); lip.rotateY(Math.PI / 2); lip.translate(wx + face, WR, wz); rims.push(lip);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + (k % 2 ? 0.1 : -0.1);
      const sp = new THREE.BoxGeometry(0.06, WR * 0.6, 0.09); sp.translate(0, WR * 0.42, 0); sp.rotateX(a); sp.translate(wx + face - sx * 0.04, WR, wz); rims.push(sp);
    }
    const hub = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 16); hub.rotateZ(Math.PI / 2); hub.translate(wx + face, WR, wz); rims.push(hub);
    const disc = new THREE.CylinderGeometry(WR * 0.6, WR * 0.6, 0.06, 24); disc.rotateZ(Math.PI / 2); disc.translate(wx - sx * 0.05, WR, wz); wells.push(disc);
    const liner = new THREE.CylinderGeometry(ARCH - 0.02, ARCH - 0.02, 1.1, 30, 1, true, -Math.PI / 2, Math.PI); liner.rotateZ(Math.PI / 2); liner.translate(sx * (HW - 0.6), WR, wz); wells.push(liner);
  }));

  return [
    { name: 'Paint', geo: ni(paintGeo), color: paint, material: 'SmoothPlastic', reflectance: 0.18 },
    { name: 'RoofPillars', geo: ni(roofPaint), color: paint, material: 'SmoothPlastic', reflectance: 0.18 },
    { name: 'Glass', geo: glass, color: [40, 46, 54], material: 'Glass', reflectance: 0.4, transparency: 0.3 },
    { name: 'Black', geo: ni([...black, ...dark]), color: [20, 20, 22], material: 'SmoothPlastic' },
    { name: 'Chrome', geo: ni(chrome), color: [212, 216, 220], material: 'Metal', reflectance: 0.35 },
    { name: 'Lamps', geo: ni(lights), color: [232, 236, 240], material: 'Glass', reflectance: 0.4, transparency: 0.05 },
    { name: 'TailLamps', geo: ni(red), color: [168, 22, 26], material: 'Glass', reflectance: 0.3 },
    { name: 'Tires', geo: ni(tires), color: [26, 26, 28], material: 'Rubber' },
    { name: 'Wheels', geo: ni(rims), color: [176, 180, 186], material: 'Metal', reflectance: 0.25 },
    { name: 'WheelDark', geo: ni(wells), color: [16, 16, 18], material: 'SmoothPlastic', shadow: false },
  ];
}
