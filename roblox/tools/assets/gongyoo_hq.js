// 오프닝의 공유 — 고품질 버전 (로블록스 인형처럼 보이지 않게)
//
// 1) 실제 사람 뼈대: 키 163 cm (이 맵은 1 m = 3.1 스터드 → 5.05 스터드). 관절 위치를 사람 몸 치수로 정하고,
//    게임에서는 R15 관절(Motor6D)을 이 위치에 맞춰 만든다 → 조각이 관절에 딱 맞는다.
// 2) 조각마다 SDF 로 조각(머리뼈·눈두덩·코·입술·귀, 손가락 마디, 옷 카라·주머니·벨트·구두)한 뒤
//    촘촘하게 메시를 뽑고 meshoptimizer 로 모양을 지키며 삼각형을 줄인다 (조각당 1만 개 이하).
// 3) 조각마다 텍스처를 굽는다: 피부 톤·홍조·수염 자국·입술·눈썹·속눈썹, 원단 결·박음질선, 모자 자수 엠블럼,
//    구두 밑창, 머리카락 결 + 몸 전체 SDF 로 계산한 주변광 차폐(접히고 겹치는 곳이 어두워짐).
//
// 좌표: 세계 좌표 (발바닥 = y 0, 앞 = -Z, 공유의 왼쪽 = -X). 조각은 R15 부위 이름으로 묶는다 ("부위__조각").
// 얼굴 치수 근거: 머리 높이 22 cm(0.7 스터드), 얼굴 3등분(이마·코·턱 각 6.5 cm), 눈 사이 5.8 cm, 입 너비 4.8 cm, 귀 6 cm.
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshopt';
import { box, ellipsoid, roundCone, smin, unionS, union, inter, sub, offset, mesh } from './sdf.js';

// ───────────────────────── 뼈대 (스터드) ─────────────────────────
export const SKELETON = (() => {
  const P = {
    HumanoidRootPart: { c: [0, 2.62, 0], s: [0.8, 0.8, 0.4] },
    LowerTorso: { c: [0, 2.8, 0], s: [0.9, 0.45, 0.6] },
    UpperTorso: { c: [0, 3.66, 0], s: [1.0, 1.3, 0.62] },
    Head: { c: [0, 4.7, -0.02], s: [0.5, 0.7, 0.6] },
  };
  const J = {
    Root: { a: 'HumanoidRootPart', b: 'LowerTorso', p: [0, 2.75, 0] },
    Waist: { a: 'LowerTorso', b: 'UpperTorso', p: [0, 3.02, 0.02] },
    Neck: { a: 'UpperTorso', b: 'Head', p: [0, 4.36, 0.0] },
  };
  for (const [side, s] of [['Left', -1], ['Right', 1]]) {
    P[`${side}UpperArm`] = { c: [s * 0.64, 3.65, 0.02], s: [0.3, 0.93, 0.3] };
    P[`${side}LowerArm`] = { c: [s * 0.69, 2.835, 0.0], s: [0.26, 0.74, 0.26] };
    P[`${side}Hand`] = { c: [s * 0.72, 2.22, -0.02], s: [0.18, 0.5, 0.3] };
    P[`${side}UpperLeg`] = { c: [s * 0.27, 1.985, 0.0], s: [0.42, 1.17, 0.44] };
    P[`${side}LowerLeg`] = { c: [s * 0.28, 0.81, 0.02], s: [0.32, 1.18, 0.34] };
    P[`${side}Foot`] = { c: [s * 0.28, 0.11, -0.17], s: [0.3, 0.22, 0.8] };
    J[`${side}Shoulder`] = { a: 'UpperTorso', b: `${side}UpperArm`, p: [s * 0.6, 4.1, 0.03] };
    J[`${side}Elbow`] = { a: `${side}UpperArm`, b: `${side}LowerArm`, p: [s * 0.68, 3.2, 0.02] };
    J[`${side}Wrist`] = { a: `${side}LowerArm`, b: `${side}Hand`, p: [s * 0.7, 2.47, 0.0] };
    J[`${side}Hip`] = { a: 'LowerTorso', b: `${side}UpperLeg`, p: [s * 0.27, 2.57, 0.0] };
    J[`${side}Knee`] = { a: `${side}UpperLeg`, b: `${side}LowerLeg`, p: [s * 0.28, 1.4, 0.0] };
    J[`${side}Ankle`] = { a: `${side}LowerLeg`, b: `${side}Foot`, p: [s * 0.28, 0.22, 0.03] };
  }
  return { parts: P, joints: J };
})();

// ───────────────────────── 수학·잡음 ─────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
function hash3(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h & 0xffff) / 0xffff; }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
const fbm = (x, y, z, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; };

// ───────────────────────── SDF 도우미 ─────────────────────────
const T = (f, o) => (x, y, z) => f(x - o[0], y - o[1], z - o[2]);
// 부드럽게 빼기 (a 에서 b 를 파낸다)
const ssub = (k, a, b) => (x, y, z) => { const d1 = a(x, y, z), d2 = -b(x, y, z); const h = clamp(0.5 + 0.5 * (d1 - d2) / k, 0, 1); return lerp(d2, d1, h) + k * h * (1 - h); };
// 방향 있는 상자 (u·v·w 는 서로 수직인 단위벡터, h = 각 축 반길이)
const obox = (c, u, v, w, h, r = 0) => { const b = box([0, 0, 0], h, r); return (x, y, z) => { const dx = x - c[0], dy = y - c[1], dz = z - c[2]; return b(dx * u[0] + dy * u[1] + dz * u[2], dx * v[0] + dy * v[1] + dz * v[2], dx * w[0] + dy * w[1] + dz * w[2]); }; };
// 높이(y)를 따라 단면(둥근 사각~타원, 지수 n)이 바뀌는 몸통·팔다리 (Catmull-Rom 으로 매끈하게)
function loft(S, o = {}) {
  const n = o.n || 2.2, y0 = S[0].y, y1 = S[S.length - 1].y, keys = ['cx', 'cz', 'rx', 'rz'];
  const at = (y) => {
    if (y <= y0) return S[0];
    if (y >= y1) return S[S.length - 1];
    let i = 0;
    while (i < S.length - 2 && y > S[i + 1].y) i++;
    const a = S[Math.max(0, i - 1)], b = S[i], c = S[i + 1], d = S[Math.min(S.length - 1, i + 2)];
    const t = (y - b.y) / (c.y - b.y), t2 = t * t, t3 = t2 * t;
    const r = {};
    for (const k of keys) r[k] = 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3);
    return r;
  };
  return (x, y, z) => {
    const s = at(y);
    const dx = Math.abs(x - s.cx) / s.rx, dz = Math.abs(z - s.cz) / s.rz;
    let q = Math.pow(Math.pow(dx, n) + Math.pow(dz, n), 1 / n);
    if (o.crease) { const ang = Math.atan2(x - s.cx, -(z - s.cz)); q -= o.crease * Math.pow(Math.max(0, Math.cos(ang)), 30); }
    const radial = (q - 1) * Math.min(s.rx, s.rz);
    const dy = Math.max(y0 - y, y - y1);
    return dy > 0 && radial > 0 ? Math.hypot(dy, radial) : Math.max(radial, dy);
  };
}
const chain = (pts, r0, r1, k = 0.01) => { const fs = []; for (let i = 0; i < pts.length - 1; i++) fs.push(roundCone(pts[i], pts[i + 1], lerp(r0, r1, i / (pts.length - 1)), lerp(r0, r1, (i + 1) / (pts.length - 1)))); return fs.length > 1 ? unionS(k, ...fs) : fs[0]; };
// 표면 찾기: 시작점에서 dir 방향으로 SDF 를 따라가 표면 위치를 돌려준다
function trace(f, o, dir, maxT = 2) {
  let t = 0;
  for (let i = 0; i < 200 && t < maxT; i++) { const p = add3(o, dir, t), d = f(p[0], p[1], p[2]); if (Math.abs(d) < 2e-5) break; t += d * 0.8; }
  return add3(o, dir, t);
}
const frontZ = (f, x, y) => trace(f, [x, y, -1], [0, 0, 1])[2];
const backZ = (f, x, y) => trace(f, [x, y, 1], [0, 0, -1])[2];
const topY = (f, x, z) => trace(f, [x, 6, z], [0, -1, 0], 4)[1];
function gradN(f, p, h = 0.002) { return norm([f(p[0] + h, p[1], p[2]) - f(p[0] - h, p[1], p[2]), f(p[0], p[1] + h, p[2]) - f(p[0], p[1] - h, p[2]), f(p[0], p[1], p[2] + h) - f(p[0], p[1], p[2] - h)]); }

// ───────────────────────── 메시: 촘촘하게 뽑고 → 모양 지키며 줄이기 → SDF 기울기로 법선 ─────────────────────────
function compactMesh(pos, idx) {
  const map = new Int32Array(pos.length / 3).fill(-1), P = [], I = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { const v = idx[i]; if (map[v] < 0) { map[v] = P.length / 3; P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } I[i] = map[v]; }
  return { pos: new Float32Array(P), idx: I };
}
async function sculpt(f, bmin, bmax, cell, target) {
  const g = mesh(f, bmin, bmax, cell, { smooth: 2 });
  let pos = g.attributes.position.array, idx = g.index ? g.index.array : null;
  if (!idx || idx.length === 0) throw new Error('빈 조각 ' + JSON.stringify(bmin));
  idx = idx instanceof Uint32Array ? idx : new Uint32Array(idx);
  if (idx.length / 3 > target) {
    await MeshoptSimplifier.ready;
    const [ni] = MeshoptSimplifier.simplify(idx, pos instanceof Float32Array ? pos : new Float32Array(pos), 3, Math.floor(target) * 3, 1.0, []);
    idx = ni;
  }
  ({ pos, idx } = compactMesh(pos, idx));
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) { const nn = gradN(f, [pos[i], pos[i + 1], pos[i + 2]], cell * 0.5); nrm[i] = nn[0]; nrm[i + 1] = nn[1]; nrm[i + 2] = nn[2]; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// ───────────────────────── 텍스처 굽기 ─────────────────────────
// UV: 원기둥 펼치기 (앞 = 가운데). v = 0 이 그림 위쪽 (glTF 규칙)
const cylY = (cx, cz, y0, y1) => { const f = (p) => [0.5 + Math.atan2(p[0] - cx, -(p[2] - cz)) / (2 * Math.PI), (y1 - p[1]) / (y1 - y0)]; f.depth = (p) => Math.hypot(p[0] - cx, p[2] - cz); return f; };
const cylZ = (cx, cy, z0, z1) => { const f = (p) => [0.5 + Math.atan2(p[0] - cx, p[1] - cy) / (2 * Math.PI), (p[2] - z0) / (z1 - z0)]; f.depth = (p) => Math.hypot(p[0] - cx, p[1] - cy); return f; };
// 몸 전체 SDF (조각들의 합) — 주변광 차폐 계산용
const SCENE = [];
function sceneSDF(x, y, z) {
  let d = 1e9;
  for (const s of SCENE) {
    const b = s.b;
    const ex = Math.max(b[0] - x, x - b[3], 0), ey = Math.max(b[1] - y, y - b[4], 0), ez = Math.max(b[2] - z, z - b[5], 0);
    if (Math.hypot(ex, ey, ez) >= d) continue;
    d = Math.min(d, s.f(x, y, z));
  }
  return d;
}
function vertexAO(p, n, step) {
  let occ = 0, wsum = 0;
  for (let i = 1; i <= 5; i++) {
    const h = step * i, w = Math.pow(0.7, i);
    const d = sceneSDF(p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h);
    occ += w * clamp((h - d) / h, 0, 1); wsum += w;
  }
  return clamp(1 - 0.95 * occ / wsum, 0.2, 1);
}
function bake(geo, o) {
  const W = o.size, H = o.size;
  const pos = geo.attributes.position.array, nrm = geo.attributes.normal.array, idx = geo.index.array;
  const nv = pos.length / 3;
  const ao = new Float32Array(nv), uvv = new Float32Array(nv * 2);
  for (let v = 0; v < nv; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], n = [nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]];
    ao[v] = vertexAO(p, n, o.aoStep || 0.03);
    const [u, w] = o.uv(p); uvv[v * 2] = u; uvv[v * 2 + 1] = w;
  }
  // 이음매를 넘는 삼각형은 u 를 1 넘게 (텍스처는 반복) — 그래서 꼭짓점을 삼각형마다 따로 둔다
  const nt = idx.length / 3, P = new Float32Array(nt * 9), N = new Float32Array(nt * 9), U = new Float32Array(nt * 6), A = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const vs = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
    const us = vs.map((v) => uvv[v * 2]);
    const wrap = Math.max(...us) - Math.min(...us) > 0.5;
    vs.forEach((v, k) => {
      for (let c = 0; c < 3; c++) { P[t * 9 + k * 3 + c] = pos[v * 3 + c]; N[t * 9 + k * 3 + c] = nrm[v * 3 + c]; }
      U[t * 6 + k * 2] = uvv[v * 2] + (wrap && uvv[v * 2] < 0.5 ? 1 : 0); U[t * 6 + k * 2 + 1] = uvv[v * 2 + 1];
      A[t * 3 + k] = ao[v];
    });
  }
  // 래스터: 텍셀마다 3D 위치·법선·차폐를 보간해서 shade() 로 색을 정한다
  const img = new Uint8ClampedArray(W * H * 4), filled = new Uint8Array(W * H), dep = new Float32Array(W * H).fill(-1e9);
  const depthOf = o.uv.depth || (() => 0);
  for (let t = 0; t < nt; t++) {
    const x0 = U[t * 6] * W - 0.5, y0 = U[t * 6 + 1] * H - 0.5, x1 = U[t * 6 + 2] * W - 0.5, y1 = U[t * 6 + 3] * H - 0.5, x2 = U[t * 6 + 4] * W - 0.5, y2 = U[t * 6 + 5] * H - 0.5;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) continue;
    const minx = Math.floor(Math.min(x0, x1, x2)) - 1, maxx = Math.ceil(Math.max(x0, x1, x2)) + 1, miny = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 1), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)) + 1);
    const eps = 0.7 / Math.sqrt(Math.abs(area));
    for (let py = miny; py <= maxy; py++) for (let px = minx; px <= maxx; px++) {
      const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area, w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area, w2 = 1 - w0 - w1;
      if (w0 < -eps || w1 < -eps || w2 < -eps) continue;
      const qx = ((px % W) + W) % W, id = py * W + qx;
      const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
      const c0 = clamp(w0, 0, 1), c1 = clamp(w1, 0, 1), c2 = clamp(w2, 0, 1), cs = c0 + c1 + c2;
      const b0 = c0 / cs, b1 = c1 / cs, b2 = c2 / cs;
      const p = [0, 0, 0], n = [0, 0, 0];
      for (let c = 0; c < 3; c++) { p[c] = b0 * P[t * 9 + c] + b1 * P[t * 9 + 3 + c] + b2 * P[t * 9 + 6 + c]; n[c] = b0 * N[t * 9 + c] + b1 * N[t * 9 + 3 + c] + b2 * N[t * 9 + 6 + c]; }
      const a = b0 * A[t * 3] + b1 * A[t * 3 + 1] + b2 * A[t * 3 + 2];
      // 같은 텍셀에 겹치는 면이 있으면 바깥쪽(보이는) 면이 차지한다
      const dd = depthOf(p) + (inside ? 0 : -0.002);
      if (filled[id] && dd <= dep[id]) continue;
      dep[id] = dd;
      const col = o.shade(p, norm(n), a);
      img[id * 4] = col[0]; img[id * 4 + 1] = col[1]; img[id * 4 + 2] = col[2]; img[id * 4 + 3] = 255;
      filled[id] = inside ? 2 : 1;
    }
  }
  // 빈 텍셀은 이웃 색으로 메움 (밉맵 번짐 방지)
  for (let it = 0; it < 16; it++) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const id = y * W + x;
      if (filled[id]) continue;
      let r = 0, g = 0, b = 0, c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = (x + dx + W) % W, yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        const j = yy * W + xx;
        if (filled[j]) { r += img[j * 4]; g += img[j * 4 + 1]; b += img[j * 4 + 2]; c++; }
      }
      if (c) add.push([id, r / c, g / c, b / c]);
    }
    if (!add.length) break;
    for (const [id, r, g, b] of add) { img[id * 4] = r; img[id * 4 + 1] = g; img[id * 4 + 2] = b; img[id * 4 + 3] = 255; filled[id] = 1; }
  }
  for (let i = 0; i < W * H; i++) if (!filled[i]) { img[i * 4] = o.bg[0]; img[i * 4 + 1] = o.bg[1]; img[i * 4 + 2] = o.bg[2]; img[i * 4 + 3] = 255; }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').putImageData(new ImageData(img, W, H), 0, 0);
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g2.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g2.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  return { geo: g2, png: cv.toDataURL('image/png') };
}
// 박음질선: 점 p 와 3D 꺾은선 사이 거리 + 선을 따라 간 길이
function seamDist(p, pts) {
  let best = 1e9, along = 0, acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = dot(ab, ab), L = Math.sqrt(L2);
    const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2, 0, 1);
    const d = Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t);
    if (d < best) { best = d; along = acc + t * L; }
    acc += L;
  }
  return [best, along];
}
const stitch = (col, p, seams, thread, w = 0.0035, dash = 0.014) => {
  for (const s of seams) {
    const [d, t] = seamDist(p, s);
    if (d < w && (t / dash) % 1 < 0.62) return mix3(col, thread, 0.85 * (1 - d / w));
  }
  return col;
};
// 꺾은선을 표면 위로 붙이기 (앞/뒤에서 쏴서)
const onFront = (f, pts) => pts.map(([x, y]) => [x, y, frontZ(f, x, y)]);
const onBack = (f, pts) => pts.map(([x, y]) => [x, y, backZ(f, x, y)]);
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

// ───────────────────────── 색 ─────────────────────────
const C = {
  skin: [228, 188, 160], skinLo: [214, 168, 140], skinHi: [238, 204, 180], skinRed: [214, 146, 128], lip: [200, 130, 118], brow: [58, 38, 28], lash: [30, 22, 18],
  shirt: [126, 170, 216], shirtLo: [110, 152, 200], shirtThread: [96, 136, 186], pants: [30, 34, 54], pantsHi: [44, 50, 76], pantsThread: [50, 56, 84], belt: [22, 22, 24],
  shoe: [16, 16, 18], sole: [32, 32, 34], hair: [88, 56, 34], cap: [26, 30, 52], capThread: [46, 52, 84], gold: [214, 168, 60],
  green: [34, 120, 80], silver: [196, 200, 206], glassFrame: [52, 52, 58], sclera: [240, 236, 230], iris: [190, 112, 38],
};
// 주변광 차폐: 피부는 그늘이 붉게 (피부밑 산란 느낌), 천은 그냥 어둡게
const shadeAO = (col, ao, k = 1) => mul3(col, lerp(1, Math.pow(ao, 1.2), k));
const skinAO = (col, ao0) => { const ao = Math.max(ao0, 0.5); return [col[0] * Math.pow(ao, 0.95), col[1] * Math.pow(ao, 1.25), col[2] * Math.pow(ao, 1.4)]; };
const skinBase = (p, scale = 1) => {
  let c = mix3(C.skinLo, C.skinHi, 0.5 + 0.55 * fbm(p[0] * 14 * scale, p[1] * 14 * scale, p[2] * 14 * scale, 3));
  c = mix3(c, C.skinRed, 0.12 * Math.max(0, fbm(p[0] * 40, p[1] * 40, p[2] * 40, 2)));
  return mul3(c, 0.975 + 0.025 * vnoise(p[0] * 700, p[1] * 700, p[2] * 700)); // 모공
};

// ───────────────────────── 얼굴 기준점 (머리 중심 HC 기준, 스터드) ─────────────────────────
const EX = 0.09, EY = 0.0, EZ = -0.212, ER = 0.039;   // 눈알 중심·반지름
const LX = 0.094, LY = -0.003, LW = 0.068, LH = 0.04, LZ = -0.297; // 안경알 중심·반너비·반높이·앞뒤
const CAP_Y = 0.135;                                   // 모자 앞쪽 끝 높이
const capCutL = (q) => CAP_Y - 0.11 * clamp((q[2] + 0.28) / 0.6, 0, 1) - q[1]; // 양수 = 모자 아래
const skullR = { c: [0, 0.07, 0.03], r: [0.25, 0.27, 0.29] };
// 머리뼈 표면 위의 점: 각도 th(앞 0, 공유 오른쪽 +), 높이 y, 표면에서 띄울 거리 lift
const skullPt = (th, y, lift) => {
  const dy = (y - skullR.c[1]) / skullR.r[1], k = Math.sqrt(Math.max(0.04, 1 - dy * dy));
  return [(skullR.r[0] * k + lift) * Math.sin(th), y, skullR.c[2] - (skullR.r[2] * k + lift) * Math.cos(th)];
};

// ───────────────────────── 조각 만들기 ─────────────────────────
export async function buildGongYooHQ() {
  SCENE.length = 0;
  const out = [], textures = {};
  const S = SKELETON.parts;
  const defs = [];
  const def = (part, name, f, bmin, bmax, o) => { defs.push({ part, name, f, bmin, bmax, ...o }); SCENE.push({ f, b: [...bmin, ...bmax] }); };

  // ════════ 머리 (머리 중심 기준 좌표로 조각해서 옮긴다) ════════
  const HC = S.Head.c;
  const cranium = ellipsoid(skullR.c, skullR.r);
  let headL = unionS(0.045,
    cranium,
    ellipsoid([0, -0.02, -0.11], [0.215, 0.26, 0.155]),                        // 얼굴 앞판 (앞이 평평하게)
    ellipsoid([0, -0.14, -0.06], [0.195, 0.215, 0.215]),                      // 얼굴 아래·턱 덩어리
    roundCone([-0.165, -0.13, 0.04], [-0.055, -0.3, -0.18], 0.048, 0.044), roundCone([0.165, -0.13, 0.04], [0.055, -0.3, -0.18], 0.048, 0.044), // 턱선
    ellipsoid([0, -0.31, -0.215], [0.07, 0.05, 0.055]),                       // 턱끝
    ellipsoid([-0.125, -0.05, -0.165], [0.07, 0.045, 0.075]), ellipsoid([0.125, -0.05, -0.165], [0.07, 0.045, 0.075]), // 광대
    ellipsoid([0, -0.3, 0.04], [0.15, 0.13, 0.14]));                          // 목으로 이어짐
  // 눈썹뼈: 얼굴 곡면을 따라 휘게
  headL = unionS(0.025, headL, ...[-1, 1].map((s) => chain([[0, 0.042, -0.243], [s * 0.07, 0.048, -0.234], [s * 0.14, 0.042, -0.19]], 0.026, 0.024, 0.01)));
  // 눈두덩 파기
  headL = ssub(0.016, headL, union(ellipsoid([-EX, EY + 0.004, EZ - 0.03], [0.054, 0.036, 0.048]), ellipsoid([EX, EY + 0.004, EZ - 0.03], [0.054, 0.036, 0.048])));
  // 눈꺼풀: 위는 무겁게 반쯤 덮은 무표정한 눈, 아래는 얇게. 눈꼬리 쪽이 살짝 올라감
  for (const s of [-1, 1]) {
    const tilt = (x) => 0.06 * (s * x - EX);
    headL = unionS(0.007, headL, inter(ellipsoid([s * EX, EY + 0.006, EZ - 0.004], [0.05, 0.043, 0.047]), (x, y, z) => EY + 0.011 + tilt(x) - y));
    headL = unionS(0.007, headL, inter(ellipsoid([s * EX, EY + 0.002, EZ - 0.002], [0.047, 0.04, 0.044]), (x, y, z) => y - (EY - 0.016 + 1.6 * tilt(x))));
  }
  // 코: 콧대·코끝·콧방울 + 콧구멍
  headL = unionS(0.012, headL,
    roundCone([0, 0.03, -0.256], [0, -0.1, -0.296], 0.012, 0.017),
    ellipsoid([0, -0.115, -0.298], [0.022, 0.021, 0.02]),
    ellipsoid([-0.026, -0.127, -0.279], [0.017, 0.015, 0.016]), ellipsoid([0.026, -0.127, -0.279], [0.017, 0.015, 0.016]));
  headL = ssub(0.004, headL, union(ellipsoid([-0.012, -0.139, -0.285], [0.007, 0.004, 0.008]), ellipsoid([0.012, -0.139, -0.285], [0.007, 0.004, 0.008])));
  // 인중
  headL = ssub(0.006, headL, box([0, -0.163, -0.287], [0.008, 0.011, 0.006], 0.004));
  // 입술 + 입 선
  headL = unionS(0.016, headL, ellipsoid([0, -0.179, -0.272], [0.06, 0.011, 0.014]), ellipsoid([0, -0.201, -0.268], [0.052, 0.013, 0.014]));
  headL = ssub(0.003, headL, box([0, -0.1905, -0.285], [0.054, 0.0012, 0.02], 0.0012));
  // 귀: 귓바퀴 + 오목한 안쪽
  for (const s of [-1, 1]) {
    headL = unionS(0.014, headL, ellipsoid([s * 0.25, -0.045, 0.035], [0.028, 0.098, 0.05]));
    headL = ssub(0.006, headL, ellipsoid([s * 0.274, -0.055, 0.04], [0.016, 0.058, 0.03]));
  }
  const head = T(headL, HC);
  const hl = (p) => [p[0] - HC[0], p[1] - HC[1], p[2] - HC[2]];
  def('Head', 'Face', head, [HC[0] - 0.3, HC[1] - 0.45, HC[2] - 0.36], [HC[0] + 0.3, HC[1] + 0.38, HC[2] + 0.36], {
    cell: 0.005, target: 10000, tex: 1024, aoStep: 0.012, uv: cylY(HC[0], HC[2] + 0.03, HC[1] - 0.45, HC[1] + 0.38), color: C.skin,
    shade: (p, n, ao) => {
      const q = hl(p);
      let c = skinBase(q, 1.2);
      const blob = (cx, cy, cz, rx, ry, rz) => Math.max(0, 1 - Math.hypot((q[0] - cx) / rx, (q[1] - cy) / ry, (q[2] - cz) / rz));
      const cheek = blob(0.12, -0.08, -0.2, 0.06, 0.05, 0.09) + blob(-0.12, -0.08, -0.2, 0.06, 0.05, 0.09);
      const nose = blob(0, -0.115, -0.31, 0.035, 0.03, 0.03);
      const ear = blob(0.245, -0.045, 0.035, 0.04, 0.1, 0.06) + blob(-0.245, -0.045, 0.035, 0.04, 0.1, 0.06);
      c = mix3(c, C.skinRed, 0.12 * cheek + 0.12 * nose + 0.15 * ear);
      // 수염 자국: 턱·윗입술·턱선 (아주 옅게, 푸르스름한 회갈색 점)
      const beard = sstep(-0.11, -0.16, q[1]) * sstep(0.08, -0.06, q[2]) * (1 - sstep(0.15, 0.2, Math.abs(q[0])));
      const lipZone = Math.hypot(q[0] / 0.08, (q[1] + 0.19) / 0.03) < 1 ? 1 : 0;
      if (beard > 0 && !lipZone) c = mix3(c, [128, 116, 112], beard * (0.04 + 0.03 * Math.max(0, vnoise(q[0] * 900, q[1] * 900, q[2] * 900))));
      // 눈 밑 그늘 (야간 근무 피곤함)
      for (const s of [-1, 1]) c = mix3(c, [176, 138, 132], 0.12 * blob(s * EX, EY - 0.034, EZ - 0.04, 0.045, 0.016, 0.03));
      // 팔자 주름
      for (const s of [-1, 1]) {
        const [d] = seamDist(q, [[s * 0.05, -0.13, -0.27], [s * 0.07, -0.165, -0.268], [s * 0.078, -0.2, -0.262]]);
        if (d < 0.009) c = mul3(c, 1 - 0.03 * (1 - d / 0.009));
      }
      // 입술 (윗입술 경계는 조금 진하게, 아랫입술 가운데 살짝 밝게)
      const lipU = Math.hypot(q[0] / 0.06, (q[1] + 0.179) / 0.013), lipL = Math.hypot(q[0] / 0.053, (q[1] + 0.201) / 0.015);
      if (q[2] < -0.25) {
        const lip = 1 - sstep(0.82, 1.08, Math.min(lipU, lipL));
        c = mix3(c, C.lip, 0.45 * lip);
        if (lipL < 0.5) c = mix3(c, [206, 140, 128], 0.25 * (1 - lipL / 0.5));
        if (Math.abs(q[1] + 0.1905) < 0.0018 && Math.abs(q[0]) < 0.052) c = mix3(c, [130, 80, 72], 0.6);
      }
      for (const s of [-1, 1]) {
        // 눈썹: 안쪽은 굵고 바깥으로 갈수록 가늘게, 결 방향으로 그린 털
        const ax = s * q[0];
        if (ax > 0.022 && ax < 0.165 && q[2] < -0.15) {
          const t = (ax - 0.022) / 0.143, yc = 0.054 + 0.012 * Math.sin(t * Math.PI * 0.85) - 0.004 * t, wv = 0.0135 * (1 - 0.6 * t) + 0.002;
          const d = Math.abs(q[1] - yc);
          if (d < wv) {
            const hair = 0.55 + 0.45 * Math.max(0, Math.sin((ax * 2.2 + q[1] * 1.2) * 900 + 3 * vnoise(ax * 200, q[1] * 200, 0)));
            c = mix3(c, C.brow, (1 - Math.pow(d / wv, 2)) * 0.92 * hair);
          }
        }
        // 위 눈꺼풀 가장자리(속눈썹 줄) + 쌍꺼풀 선 + 아래 속눈썹 줄 + 눈 안쪽 붉은 살
        const ex = q[0] - s * EX;
        if (Math.abs(ex) < 0.054 && q[2] < -0.235) {
          const tl = 0.06 * (s * ex);
          const yl = EY + 0.011 + tl;
          const dl = q[1] - yl;
          if (dl > -0.003 && dl < 0.0045 + (s * ex > 0.03 ? 0.004 : 0)) c = mix3(c, C.lash, 0.92);
          if (Math.abs(dl - 0.013 + 0.004 * (ex / 0.05) ** 2) < 0.0016 && Math.abs(ex) < 0.044) c = mul3(c, 0.84);
          const yb = EY - 0.016 + 1.6 * tl;
          if (Math.abs(q[1] - yb) < 0.0022 && Math.abs(ex) < 0.045) c = mix3(c, [150, 100, 90], 0.55);
          if (s * ex < -0.038 && Math.abs(q[1] - (EY - 0.003)) < 0.009) c = mix3(c, [210, 130, 124], 0.5);
        }
      }
      return skinAO(c, ao);
    },
  });
  // 눈알 (호박색 홍채)
  const eyeC = (s) => [HC[0] + s * EX, HC[1] + EY, HC[2] + EZ];
  const eyes = union(ellipsoid(eyeC(-1), [ER, ER, ER]), ellipsoid(eyeC(1), [ER, ER, ER]));
  def('Head', 'Eyes', eyes, [HC[0] - EX - 0.05, HC[1] + EY - 0.05, HC[2] + EZ - 0.05], [HC[0] + EX + 0.05, HC[1] + EY + 0.05, HC[2] + EZ + 0.05], {
    cell: 0.003, target: 3000, tex: 256, aoStep: 0.006, color: C.sclera,
    uv: (p) => { const s = p[0] < HC[0] ? -1 : 1, e = eyeC(s); return [(s < 0 ? 0 : 0.5) + 0.5 * (0.5 + Math.atan2(p[0] - e[0], -(p[2] - e[2])) / (2 * Math.PI)), 0.5 - (p[1] - e[1]) / (2.4 * ER)]; },
    shade: (p, n, ao) => {
      const s = p[0] < HC[0] ? -1 : 1, e = eyeC(s), d = norm([p[0] - e[0], p[1] - e[1], p[2] - e[2]]);
      const ang = Math.acos(clamp(-d[2], -1, 1)), az = Math.atan2(d[1], d[0]);
      let c = mix3(C.sclera, [222, 192, 186], sstep(0.7, 1.4, ang));
      if (ang < 0.52) {
        const r = ang / 0.52;
        c = mix3([228, 164, 76], C.iris, sstep(0.2, 0.85, r));
        c = mul3(c, 0.82 + 0.18 * Math.sin(az * 28 + vnoise(az * 4, r * 6, 0) * 3));
        if (r > 0.84) c = mix3(c, [86, 50, 22], sstep(0.84, 1, r));
        if (ang < 0.19) c = [12, 9, 9];
      }
      const hi = Math.acos(clamp(d[0] * -0.3 + d[1] * 0.4 + -d[2] * 0.866, -1, 1));
      if (hi < 0.1) c = mix3(c, [255, 255, 255], 0.85 * (1 - hi / 0.1));
      return shadeAO(c, ao, 0.7);
    },
  });

  // ════════ 머리카락 (모자 밑으로 보이는 앞머리·옆머리·뒷머리) ════════
  const skull = T(cranium, HC);
  const hairShell = sub(offset(skull, 0.028), offset(skull, -0.004));
  const hairZone = (x, y, z) => {
    const q = [x - HC[0], y - HC[1], z - HC[2]];
    if (q[2] < -0.16) return 0.08 - q[1];                                                   // 앞: 이마 위쪽만 (앞머리 가닥이 따로)
    if (Math.abs(q[0]) > 0.15 && q[2] < 0.07) return (0.072 + 0.02 * sstep(-0.02, -0.15, q[2])) - q[1]; // 옆: 귀 위
    return -0.17 - q[1];                                                                     // 뒤: 목덜미까지
  };
  let hair = inter(hairShell, hairZone);
  // 앞머리: 모자챙 밑에서 나와 이마를 덮고, 가운데 가르마로 양옆으로 휘는 가닥 (머리뼈 곡면을 따라)
  const locks = [];
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
    const th0 = 0.03 + k * 0.13, th1 = th0 + 0.2 + 0.03 * k;
    const y0 = 0.15, y1 = 0.088 - 0.004 * k + 0.006 * Math.sin(k * 2.1);
    const p0 = skullPt(s * th0, y0, 0.016), p1 = skullPt(s * (th0 + th1) / 2, (y0 + y1) / 2 + 0.006, 0.027), p2 = skullPt(s * th1, y1, 0.014);
    locks.push(T(chain([p0, p1, p2], 0.023 - 0.001 * k, 0.007, 0.008), HC));
  }
  // 옆머리 (구레나룻) + 뒷머리 끝의 뾰족한 결
  for (const s of [-1, 1]) {
    locks.push(T(chain([skullPt(s * 1.12, 0.09, 0.014), skullPt(s * 1.16, 0.03, 0.012), skullPt(s * 1.18, -0.035, 0.008)], 0.02, 0.008), HC));
    locks.push(T(chain([skullPt(s * 1.35, 0.09, 0.014), skullPt(s * 1.4, 0.07, 0.016), skullPt(s * 1.45, 0.05, 0.01)], 0.018, 0.007), HC));
    for (let k = 0; k < 6; k++) {
      const th = s * (Math.PI - 0.15 - k * 0.24);
      locks.push(T(chain([skullPt(th, -0.08, 0.016), skullPt(th + s * 0.03, -0.15, 0.014), skullPt(th + s * 0.05, -0.2 + 0.01 * (k % 2), 0.006)], 0.026, 0.008), HC));
    }
  }
  hair = unionS(0.012, hair, ...locks);
  const capVol = T(inter(ellipsoid([0, 0.085, 0.03], [0.277, 0.298, 0.318]), (x, y, z) => capCutL([x, y, z])), HC);
  hair = ssub(0.004, hair, offset(capVol, 0.004));
  def('Head', 'Hair', hair, [HC[0] - 0.3, HC[1] - 0.26, HC[2] - 0.34], [HC[0] + 0.3, HC[1] + 0.4, HC[2] + 0.36], {
    cell: 0.0045, target: 9000, tex: 512, aoStep: 0.012, uv: cylY(HC[0], HC[2] + 0.03, HC[1] - 0.26, HC[1] + 0.4), color: C.hair,
    shade: (p, n, ao) => {
      const q = hl(p);
      const strand = 0.5 + 0.5 * fbm(q[0] * 110, q[1] * 14, q[2] * 110, 3);
      let c = mix3(mul3(C.hair, 0.68), mix3(C.hair, [150, 104, 64], 0.5), strand);
      c = mix3(c, [172, 126, 84], 0.3 * Math.pow(Math.max(0, n[1] * 0.6 - n[2] * 0.5), 3));
      return shadeAO(c, ao, 1);
    },
  });

  // ════════ 경비 야구모자: 5조각 돔 + 휜 챙 + 꼭지 단추 (금색 엠블럼은 자수 텍스처) ════════
  const capOuter = T(ellipsoid([0, 0.085, 0.03], [0.277, 0.298, 0.318]), HC), capInner = T(ellipsoid([0, 0.085, 0.03], [0.261, 0.283, 0.302]), HC);
  const capCut = (x, y, z) => capCutL([x - HC[0], y - HC[1], z - HC[2]]);
  const crown = inter(sub(capOuter, capInner), capCut);
  const brim = (x, y, z) => {
    const q = [x - HC[0], y - HC[1], z - HC[2]];
    const ys = CAP_Y - 0.004 - 0.9 * q[0] * q[0] - 0.12 * Math.max(0, -(q[2] + 0.27));
    const slab = Math.abs(q[1] - ys) - 0.0075;
    const foot = (Math.hypot(q[0] / 0.23, (q[2] + 0.31) / 0.23) - 1) * 0.2;
    return Math.max(slab, foot, q[2] + 0.235);
  };
  const button = T(ellipsoid([0, 0.383, 0.03], [0.02, 0.012, 0.02]), HC);
  const cap = unionS(0.01, crown, brim, button);
  def('Head', 'Cap', cap, [HC[0] - 0.3, HC[1] + 0.0, HC[2] - 0.53], [HC[0] + 0.3, HC[1] + 0.41, HC[2] + 0.37], {
    cell: 0.005, target: 9000, tex: 1024, aoStep: 0.015, uv: cylY(HC[0], HC[2] + 0.03, HC[1] + 0.0, HC[1] + 0.41), color: C.cap,
    shade: (p, n, ao) => {
      const q = hl(p);
      let c = mix3(C.cap, mul3(C.cap, 1.25), 0.5 + 0.5 * vnoise(q[0] * 600, q[1] * 600, q[2] * 600));
      const onBrim = q[2] < -0.27 && q[1] < CAP_Y + 0.01;
      if (onBrim) {
        // 챙 위 박음질 줄 (가장자리 따라 여러 줄)
        const e = Math.hypot(q[0] / 0.215, (q[2] + 0.3) / 0.205);
        for (let k = 1; k <= 6; k++) if (Math.abs(e - (1 - k * 0.045)) < 0.006 && n[1] > 0) c = mix3(c, C.capThread, 0.7);
        return shadeAO(c, ao, 0.8);
      }
      // 조각 이음매 (앞 가운데는 이음매 없음) + 공기구멍
      const az = Math.atan2(q[0], -(q[2] - 0.03)) * 180 / Math.PI, rr = Math.hypot(q[0], q[2] - 0.03);
      for (const a of [-72, 72, -144, 144]) {
        const d = Math.abs(((az - a + 540) % 360) - 180) * Math.PI / 180 * rr;
        if (d < 0.005 && q[1] > CAP_Y) c = mix3(c, mul3(C.cap, 0.6), 0.8 * (1 - d / 0.005));
        if (d > 0.008 && d < 0.0115 && q[1] > CAP_Y) c = mix3(c, C.capThread, 0.55);
      }
      for (const a of [-36, 36, -108, 108, 180]) {
        const az2 = a * Math.PI / 180, e = [0.17 * Math.sin(az2), 0.3, 0.03 - 0.19 * Math.cos(az2)];
        const d = Math.hypot(q[0] - e[0], q[1] - e[1], q[2] - e[2]);
        if (d < 0.011) c = d < 0.005 ? [12, 14, 24] : mix3(c, C.capThread, 0.8);
      }
      // 앞판 금색 자수 엠블럼: 방패 + 양쪽 월계수 잎 + 가운데 별
      if (q[2] < -0.15 && q[1] > CAP_Y + 0.02) {
        const u = q[0] / 0.045, v = (q[1] - 0.255) / 0.058;
        let g = 0;
        if (v < 0.9 && v > -1 && Math.abs(u) < (v > 0 ? 1 : Math.sqrt(Math.max(0, 1 - v * v)))) g = 1;
        if (v < 0.72 && v > -0.78 && Math.abs(u) < (v > 0 ? 0.76 : 0.76 * Math.sqrt(Math.max(0, 1 - (v / 0.78) ** 2)))) g = 0.55;
        const sr = Math.hypot(u, v - 0.05), sa = Math.atan2(v - 0.05, u);
        if (sr < 0.28 + 0.2 * Math.cos(5 * (sa - Math.PI / 2))) g = 1;
        for (const s of [-1, 1]) for (let k = 0; k < 6; k++) {
          const t = k / 5, la = -1.9 + t * 2.5, cx2 = s * (1.35 * Math.cos(la * 0.5 + 0.2)), cy2 = -0.4 + t * 1.25;
          const lu = (u - cx2) / 0.32, lv = (v - cy2) / 0.16;
          if (lu * lu + lv * lv < 1) g = Math.max(g, 0.9);
        }
        if (g > 0) c = mix3(mul3(C.gold, g > 0.7 ? 1 : 0.78), [250, 214, 120], 0.3 * (0.5 + 0.5 * Math.sin((q[0] + q[1]) * 900)));
      }
      return shadeAO(c, ao, 0.85);
    },
  });

  // ════════ 윗몸: 하늘색 반팔 셔츠 (카라·단추줄·주머니·견장) + 목 ════════
  const shirtL = loft([
    { y: 2.98, cx: 0, cz: 0.0, rx: 0.465, rz: 0.31 },
    { y: 3.25, cx: 0, cz: -0.005, rx: 0.475, rz: 0.318 },
    { y: 3.5, cx: 0, cz: -0.012, rx: 0.49, rz: 0.33 },
    { y: 3.75, cx: 0, cz: -0.018, rx: 0.515, rz: 0.345 },
    { y: 3.95, cx: 0, cz: -0.012, rx: 0.525, rz: 0.34 },
    { y: 4.1, cx: 0, cz: 0.0, rx: 0.49, rz: 0.3 },
    { y: 4.22, cx: 0, cz: 0.01, rx: 0.3, rz: 0.22 },
    { y: 4.31, cx: 0, cz: 0.02, rx: 0.2, rz: 0.18 },
  ], { n: 2.3 });
  const shoulderL = unionS(0.06, roundCone([-0.16, 4.25, 0.02], [-0.56, 4.13, 0.03], 0.11, 0.13), ellipsoid([-0.6, 4.0, 0.03], [0.16, 0.17, 0.165]));
  const shoulderR = unionS(0.06, roundCone([0.16, 4.25, 0.02], [0.56, 4.13, 0.03], 0.11, 0.13), ellipsoid([0.6, 4.0, 0.03], [0.16, 0.17, 0.165]));
  const ycol = (z) => 4.255 + 0.26 * (z - 0.02);   // 카라 높이 (앞이 낮다)
  const folds = (x, y, z) => 0.004 * sstep(3.25, 3.0, y) * Math.sin(Math.atan2(x, -z) * 14 + y * 9) + 0.0025 * vnoise(x * 9, y * 5, z * 9);
  const shirtBase = (x, y, z) => {
    const b = smin(smin(shirtL(x, y, z), shoulderL(x, y, z), 0.06), shoulderR(x, y, z), 0.06) + folds(x, y, z);
    return Math.max(b, Math.min(y - ycol(z), Math.hypot(x / 1.08, z - 0.02) - 0.19)); // 목 구멍
  };
  const collarBand = (x, y, z) => { const r = Math.hypot(x / 1.08, z - 0.02); return Math.max(Math.abs(r - 0.19) - 0.011, Math.abs(y - ycol(z)) - 0.04, z < -0.1 ? 0.03 - Math.abs(x) : -1); };
  // 카라 깃 끝: 가슴 위에 눕는 납작한 날개 (표면 방향에 맞춰 세움)
  const collarPts = [-1, 1].map((s) => {
    const a = [s * 0.04, 4.212, 0], b = [s * 0.14, 4.09, 0];
    a[2] = frontZ(shirtBase, a[0], a[1]) - 0.009; b[2] = frontZ(shirtBase, b[0], b[1]) - 0.009;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const u = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    let w = gradN(shirtBase, [m[0], m[1], m[2] + 0.009]); const v = norm(cross(w, u)); w = cross(u, v);
    return obox(m, u, v, w, [Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + 0.012, 0.045, 0.0055], 0.004);
  });
  const regPlacket = (x, y, z) => Math.max(Math.abs(x) - 0.034, z + 0.1, y - 4.17, 2.99 - y);
  const regPocket = [-1, 1].map((s) => (x, y, z) => Math.max(Math.abs(x - s * 0.22) - 0.1, Math.abs(y - 3.8) - 0.115, z + 0.12));
  const regFlap = [-1, 1].map((s) => (x, y, z) => Math.max(Math.abs(x - s * 0.22) - 0.106, y - 3.965, (3.89 - 0.03 * (1 - Math.abs(x - s * 0.22) / 0.106)) - y, z + 0.12));
  const shirtAll = (x, y, z) => {
    const b = shirtBase(x, y, z);
    let d = b;
    const rp = regPlacket(x, y, z); if (rp < 0.03) d = smin(d, Math.max(b - 0.006, rp), 0.004);
    for (let i = 0; i < 2; i++) {
      const r1 = regPocket[i](x, y, z); if (r1 < 0.03) d = smin(d, Math.max(b - 0.007, r1), 0.004);
      const r2 = regFlap[i](x, y, z); if (r2 < 0.03) d = smin(d, Math.max(b - 0.014, r2), 0.003);
    }
    d = smin(d, collarBand(x, y, z), 0.006);
    for (const cp of collarPts) d = smin(d, cp(x, y, z), 0.004);
    return d;
  };
  const shirtSeams = [
    onFront(shirtAll, [[-0.034, 4.16], [-0.034, 2.99]]), onFront(shirtAll, [[0.034, 4.16], [0.034, 2.99]]),
    ...[-1, 1].flatMap((s) => [
      onFront(shirtAll, [[s * 0.12, 3.91], [s * 0.12, 3.69], [s * 0.32, 3.69], [s * 0.32, 3.91]]),
      onFront(shirtAll, [[s * 0.118, 3.955], [s * 0.22, 3.866], [s * 0.322, 3.955]]),
    ]),
  ];
  const backSeams = [onBack(shirtAll, [[-0.46, 4.06], [-0.25, 4.1], [0, 4.11], [0.25, 4.1], [0.46, 4.06]]), onBack(shirtAll, [[0, 4.11], [0, 3.0]])];
  def('UpperTorso', 'Shirt', shirtAll, [-0.78, 2.94, -0.44], [0.78, 4.36, 0.42], {
    cell: 0.008, target: 10000, tex: 1024, aoStep: 0.03, uv: cylY(0, 0.0, 2.94, 4.36), color: C.shirt,
    shade: (p, n, ao) => {
      let c = mix3(C.shirtLo, C.shirt, 0.6 + 0.4 * fbm(p[0] * 30, p[1] * 30, p[2] * 30, 2));
      c = mul3(c, 0.97 + 0.03 * Math.sin(p[0] * 1400) * Math.sin(p[1] * 1400));
      if (n[2] < -0.2) c = stitch(c, p, shirtSeams, C.shirtThread, 0.0035, 0.012);
      if (p[2] > 0.15) c = stitch(c, p, backSeams, C.shirtThread, 0.004, 0.012);
      return shadeAO(c, ao, 1);
    },
  });
  // 단추: 단추줄 5개 + 주머니 단추 2개
  const btnPts = [4.1, 3.88, 3.66, 3.44, 3.22].map((y) => [0, y, frontZ(shirtAll, 0, y) - 0.002])
    .concat([-1, 1].map((s) => [s * 0.22, 3.905, frontZ(shirtAll, s * 0.22, 3.905) - 0.002]));
  const buttons = union(...btnPts.map((b) => ellipsoid(b, [0.0155, 0.0155, 0.0065])));
  def('UpperTorso', 'Buttons', buttons, [-0.3, 3.15, -0.42], [0.3, 4.15, -0.2], { cell: 0.0025, target: 2500, color: [236, 240, 246], material: 'SmoothPlastic' });
  // 견장 (초록): 어깨 위 표면을 따라 얇게 덮는 띠 + 깃 쪽 끝 단추
  const strapReg = (s) => (x, y, z) => Math.max(Math.abs(z - 0.03) - 0.05, 0.2 - s * x, s * x - 0.56, 4.05 - y);
  const strap = union(...[-1, 1].map((s) => { const r = strapReg(s); return (x, y, z) => { const rv = r(x, y, z); if (rv > 0.03) return rv; const b = shirtBase(x, y, z); return Math.max(b - 0.014, -(b + 0.008), rv); }; }));
  const epBtn = union(...[-1, 1].map((s) => { const x = s * 0.235, y = topY(shirtBase, x, 0.03); return ellipsoid([x, y + 0.016, 0.03], [0.014, 0.007, 0.014]); }));
  def('UpperTorso', 'Epaulette', strap, [-0.6, 4.02, -0.05], [0.6, 4.4, 0.11], { cell: 0.004, target: 3000, color: C.green, material: 'Fabric' });
  def('UpperTorso', 'EpauletteButtons', epBtn, [-0.27, 4.2, 0.0], [0.27, 4.42, 0.06], { cell: 0.0025, target: 800, color: C.gold, material: 'Metal', reflectance: 0.2 });
  // 은색 배지 (왼쪽 가슴 주머니)
  const badgeC = [-0.22, 3.77, frontZ(shirtAll, -0.22, 3.77) - 0.003];
  const badge = (x, y, z) => { const u = (x - badgeC[0]) / 0.034, v = (y - badgeC[1]) / 0.044; const inside = v < 0.9 ? (Math.abs(u) - (v > 0 ? 1 : Math.sqrt(Math.max(0, 1 - v * v)))) * 0.034 : (v - 0.9) * 0.044; return Math.max(inside, Math.abs(z - badgeC[2]) - 0.005, (-1 - v) * 0.044); };
  def('UpperTorso', 'Badge', badge, [badgeC[0] - 0.05, badgeC[1] - 0.06, badgeC[2] - 0.02], [badgeC[0] + 0.05, badgeC[1] + 0.06, badgeC[2] + 0.02], { cell: 0.0018, target: 1500, color: C.silver, material: 'Metal', reflectance: 0.3 });
  // 목 (피부, 울대뼈)
  const neck = unionS(0.03, loft([{ y: 4.1, cx: 0, cz: 0.02, rx: 0.17, rz: 0.16 }, { y: 4.3, cx: 0, cz: 0.01, rx: 0.16, rz: 0.15 }, { y: 4.48, cx: 0, cz: 0.0, rx: 0.155, rz: 0.145 }]), ellipsoid([0, 4.26, -0.138], [0.026, 0.035, 0.02]));
  def('UpperTorso', 'Neck', neck, [-0.22, 4.06, -0.22], [0.22, 4.52, 0.22], {
    cell: 0.006, target: 3000, tex: 256, aoStep: 0.02, uv: cylY(0, 0.0, 4.06, 4.52), color: C.skin,
    shade: (p, n, ao) => skinAO(skinBase(p), ao),
  });

  // ════════ 아랫몸: 남색 바지 허리 + 검은 벨트 + 벨트 고리 + 경봉 ════════
  const pantsTop = loft([
    { y: 2.46, cx: 0, cz: 0.01, rx: 0.47, rz: 0.27 },
    { y: 2.56, cx: 0, cz: 0.01, rx: 0.5, rz: 0.31 },
    { y: 2.7, cx: 0, cz: 0.01, rx: 0.52, rz: 0.345 },
    { y: 2.9, cx: 0, cz: 0.005, rx: 0.497, rz: 0.332 },
    { y: 3.07, cx: 0, cz: 0.0, rx: 0.48, rz: 0.322 },
  ], { n: 2.2 });
  const pantsSeams = [
    onFront(pantsTop, [[-0.06, 2.98], [-0.06, 2.7], [-0.03, 2.64], [0, 2.63]]),
    onFront(pantsTop, [[-0.29, 2.98], [-0.42, 2.78]]), onFront(pantsTop, [[0.29, 2.98], [0.42, 2.78]]),
  ];
  const pantsBack = [onBack(pantsTop, rect(-0.34, 2.68, -0.1, 2.9)), onBack(pantsTop, rect(0.1, 2.68, 0.34, 2.9)), onBack(pantsTop, [[0, 2.98], [0, 2.5]])];
  def('LowerTorso', 'Pants', pantsTop, [-0.58, 2.4, -0.4], [0.58, 3.1, 0.4], {
    cell: 0.008, target: 6000, tex: 512, aoStep: 0.03, uv: cylY(0, 0.01, 2.4, 3.1), color: C.pants,
    shade: (p, n, ao) => {
      let c = mix3(C.pants, C.pantsHi, 0.5 + 0.5 * fbm(p[0] * 26, p[1] * 26, p[2] * 26, 2));
      if (n[2] < -0.3) c = stitch(c, p, pantsSeams, C.pantsThread, 0.004, 0.012);
      if (n[2] > 0.3) c = stitch(c, p, pantsBack, C.pantsThread, 0.004, 0.012);
      return shadeAO(c, ao, 1);
    },
  });
  const beltF = (x, y, z) => { const sl = Math.abs(y - 3.02) - 0.045; if (sl > 0.03) return sl; const b = pantsTop(x, y, z); return Math.max(b - 0.014, -(b + 0.01), sl); };
  const loopAng = [-1.2, -0.45, 0.45, 1.2, 2.4, -2.4];
  const loopsF = (x, y, z) => { const sl = Math.abs(y - 3.02) - 0.058; if (sl > 0.03) return sl; const a = Math.atan2(x, -z); let d = 1; for (const t of loopAng) d = Math.min(d, Math.abs(a - t) * 0.5); const b = pantsTop(x, y, z); return Math.max(b - 0.022, -(b + 0.004), d - 0.016, sl); };
  def('LowerTorso', 'Belt', unionS(0.003, beltF, loopsF), [-0.55, 2.95, -0.38], [0.55, 3.09, 0.38], {
    cell: 0.0045, target: 6000, tex: 512, aoStep: 0.01, uv: cylY(0, 0.0, 2.95, 3.09), color: C.belt,
    shade: (p, n, ao) => {
      const onLoop = Math.abs(p[1] - 3.02) > 0.044 || (pantsTop(p[0], p[1], p[2]) > 0.017);
      let c = onLoop ? mix3(C.pants, C.pantsHi, 0.4) : mix3(C.belt, [42, 42, 44], 0.5 + 0.5 * vnoise(p[0] * 300, p[1] * 300, p[2] * 300));
      if (!onLoop && (Math.abs(p[1] - 3.056) < 0.0022 || Math.abs(p[1] - 2.984) < 0.0022) && ((Math.atan2(p[0], -p[2]) * 40) % 1 + 1) % 1 < 0.6) c = [72, 72, 74];
      return shadeAO(c, ao, 0.8);
    },
  });
  const buckleZ = frontZ(beltF, 0, 3.02) - 0.008;
  const buckle = sub(box([0, 3.02, buckleZ], [0.05, 0.038, 0.007], 0.006), box([0, 3.02, buckleZ], [0.035, 0.024, 0.02], 0.004));
  def('LowerTorso', 'Buckle', unionS(0.002, buckle, box([-0.005, 3.02, buckleZ - 0.004], [0.032, 0.004, 0.004], 0.003)), [-0.07, 2.97, buckleZ - 0.03], [0.07, 3.07, buckleZ + 0.03], { cell: 0.0018, target: 2000, color: C.silver, material: 'Metal', reflectance: 0.35 });
  const batonX = -0.53;
  const baton = unionS(0.006, roundCone([batonX, 2.98, 0.06], [batonX - 0.05, 2.28, 0.12], 0.026, 0.024), roundCone([batonX, 2.98, 0.06], [batonX, 3.05, 0.06], 0.02, 0.02), ellipsoid([batonX + 0.012, 2.93, 0.06], [0.036, 0.012, 0.036]));
  def('LowerTorso', 'Baton', baton, [batonX - 0.1, 2.24, 0.0], [batonX + 0.06, 3.09, 0.17], { cell: 0.0035, target: 2000, color: [16, 16, 18], material: 'SmoothPlastic', reflectance: 0.08 });

  // ════════ 팔다리 (왼쪽·오른쪽) ════════
  for (const [side, s] of [['Left', -1], ['Right', 1]]) {
    // 위팔 (맨살 — 소매 안쪽)
    const armSkin = loft([
      { y: 3.12, cx: s * 0.68, cz: 0.02, rx: 0.1, rz: 0.106 },
      { y: 3.35, cx: s * 0.67, cz: 0.015, rx: 0.114, rz: 0.122 },
      { y: 3.62, cx: s * 0.655, cz: 0.005, rx: 0.132, rz: 0.14 },
      { y: 3.9, cx: s * 0.635, cz: 0.02, rx: 0.145, rz: 0.15 },
      { y: 4.02, cx: s * 0.61, cz: 0.03, rx: 0.135, rz: 0.14 },
    ], { n: 2 });
    const upper = unionS(0.03, armSkin, ellipsoid([s * 0.678, 3.16, 0.03], [0.1, 0.1, 0.1]));
    def(`${side}UpperArm`, 'Skin', upper, [s * 0.66 - 0.2, 3.04, -0.18], [s * 0.66 + 0.2, 4.24, 0.22], {
      cell: 0.006, target: 4000, tex: 256, aoStep: 0.02, uv: cylY(s * 0.66, 0.02, 3.04, 4.24), color: C.skin, shade: (p, n, ao) => skinAO(skinBase(p), ao),
    });
    // 소매: 위팔을 넉넉하게 감싼 관 + 끝단 한 번 접은 단 (안쪽은 비어 있다)
    const sleeveOut = unionS(0.05, loft([
      { y: 3.58, cx: s * 0.652, cz: 0.012, rx: 0.19, rz: 0.192 },
      { y: 3.8, cx: s * 0.645, cz: 0.018, rx: 0.194, rz: 0.197 },
      { y: 4.05, cx: s * 0.625, cz: 0.025, rx: 0.19, rz: 0.19 },
    ], { n: 2 }), ellipsoid([s * 0.6, 4.02, 0.03], [0.175, 0.18, 0.18]));
    const sleeve = (x, y, z) => { if (y < 3.56) return 3.58 - y; const o = sleeveOut(x, y, z); const shell = Math.max(o, -(o + 0.014)); const hem = Math.max(o - 0.006, -(o + 0.02), y - 3.63); return Math.max(Math.min(shell, hem), 3.58 - y); };
    def(`${side}UpperArm`, 'Sleeve', sleeve, [s * 0.64 - 0.25, 3.55, -0.21], [s * 0.64 + 0.25, 4.24, 0.25], {
      cell: 0.006, target: 5000, tex: 512, aoStep: 0.025, uv: cylY(s * 0.64, 0.02, 3.55, 4.24), color: C.shirt,
      shade: (p, n, ao) => {
        let c = mix3(C.shirtLo, C.shirt, 0.6 + 0.4 * fbm(p[0] * 30, p[1] * 30, p[2] * 30, 2));
        if (Math.abs(p[1] - 3.646) < 0.003 && ((Math.atan2(p[0] - s * 0.65, -p[2]) * 60) % 1 + 1) % 1 < 0.6) c = C.shirtThread;
        // 오른팔 소매 바깥: 남색 바탕 + 금색 테두리 패치
        if (s > 0) {
          const pu = (p[2] - 0.02) / 0.062, pv = (p[1] - 3.9) / 0.078;
          if (p[0] > 0.76 && pu * pu + pv * pv < 1) c = pu * pu + pv * pv > 0.76 ? C.gold : mix3([30, 36, 72], [44, 52, 96], 0.5 + 0.5 * vnoise(p[1] * 300, p[2] * 300, 0));
        }
        return shadeAO(c, ao, 1);
      },
    });
    // 아래팔
    const fore = loft([
      { y: 2.42, cx: s * 0.7, cz: 0.0, rx: 0.062, rz: 0.085 },
      { y: 2.56, cx: s * 0.699, cz: 0.0, rx: 0.074, rz: 0.094 },
      { y: 2.8, cx: s * 0.693, cz: -0.004, rx: 0.104, rz: 0.114 },
      { y: 3.02, cx: s * 0.686, cz: -0.006, rx: 0.122, rz: 0.128 },
      { y: 3.26, cx: s * 0.678, cz: 0.012, rx: 0.104, rz: 0.11 },
    ], { n: 2 });
    def(`${side}LowerArm`, 'Skin', unionS(0.02, fore, ellipsoid([s * 0.678, 3.22, 0.03], [0.098, 0.082, 0.098])), [s * 0.69 - 0.17, 2.38, -0.17], [s * 0.69 + 0.17, 3.32, 0.18], {
      cell: 0.005, target: 4000, tex: 256, aoStep: 0.02, uv: cylY(s * 0.69, 0.0, 2.38, 3.32), color: C.skin, shade: (p, n, ao) => skinAO(skinBase(p), ao),
    });
    // 손: 손바닥이 허벅지 쪽(안쪽)을 보고 힘을 뺀 채 살짝 굽은 손가락. m = 손바닥 쪽 방향(x)
    const m = -s, x0 = s * 0.715;
    const fingers = [], nailSegs = [];
    const FING = [[-0.072, 0.245, 0.029, -4], [-0.024, 0.275, 0.03, 0], [0.024, 0.258, 0.028, 3], [0.068, 0.208, 0.024, 7]];
    for (const [zk, L, r0, spread] of FING) {
      const p0 = [x0 + m * 0.004, 2.205, zk];
      const sp = Math.sin(spread * Math.PI / 180);
      const pts = [p0];
      let cur = p0;
      for (const [ang, fr] of [[20, 0.45], [50, 0.3], [68, 0.25]]) { const a = ang * Math.PI / 180; const d = norm([m * Math.sin(a), -Math.cos(a), sp]); cur = add3(cur, d, L * fr); pts.push(cur); }
      fingers.push(chain(pts, r0, r0 * 0.74, 0.008));
      fingers.push(ellipsoid([x0 - m * 0.026, 2.215, zk], [0.02, 0.022, 0.021]));     // 손등 마디
      nailSegs.push([pts[2], pts[3], r0 * 0.8]);
    }
    const thumbPts = [[x0 + m * 0.018, 2.4, -0.085], [x0 + m * 0.045, 2.33, -0.145], [x0 + m * 0.07, 2.27, -0.168], [x0 + m * 0.088, 2.22, -0.172]];
    const thumb = unionS(0.014, ellipsoid([x0 + m * 0.03, 2.35, -0.055], [0.042, 0.075, 0.055]), chain(thumbPts, 0.034, 0.024, 0.008));
    nailSegs.push([thumbPts[2], thumbPts[3], 0.026]);
    const palm = unionS(0.03, box([x0, 2.33, -0.008], [0.036, 0.125, 0.105], 0.034), roundCone([x0, 2.48, 0.0], [x0, 2.39, -0.006], 0.068, 0.06));
    const hand = unionS(0.016, palm, ...fingers, thumb);
    def(`${side}Hand`, 'Skin', hand, [x0 - 0.24, 1.94, -0.22], [x0 + 0.24, 2.52, 0.14], {
      cell: 0.0035, target: 9000, tex: 512, aoStep: 0.01, uv: cylY(x0, -0.02, 1.94, 2.52), color: C.skin,
      shade: (p, n, ao) => {
        let c = skinBase(p, 1.5);
        // 손톱: 끝마디의 손등 쪽, 연분홍 + 하얀 끝
        for (const [a, b, r] of nailSegs) {
          const [d, t] = seamDist(p, [a, b]);
          const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
          const fdir = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
          const dorsal = norm(cross(fdir, [0, 0, -m]));   // 손가락 방향과 수직인 손등 쪽
          if (d < r * 1.25 && t > L * 0.35 && dot(n, dorsal) > 0.35) c = mix3(c, t > L * 0.9 ? [238, 220, 210] : [222, 168, 158], 0.65);
        }
        if (Math.abs(p[1] - 2.215) < 0.004 && -m * n[0] > 0.3) c = mul3(c, 0.9);   // 손등 마디 주름
        return skinAO(c, ao);
      },
    });

    // 다리: 통 넓은 남색 바지 (앞 주름선, 옆 솔기) + 검은 구두
    const thigh = loft([
      { y: 1.3, cx: s * 0.28, cz: 0.0, rx: 0.2, rz: 0.21 },
      { y: 1.5, cx: s * 0.28, cz: 0.0, rx: 0.205, rz: 0.215 },
      { y: 1.95, cx: s * 0.275, cz: 0.0, rx: 0.232, rz: 0.24 },
      { y: 2.35, cx: s * 0.265, cz: 0.0, rx: 0.258, rz: 0.27 },
      { y: 2.62, cx: s * 0.25, cz: 0.005, rx: 0.27, rz: 0.29 },
    ], { n: 2.1, crease: 0.03 });
    const pantsShade = (cx) => (p, n, ao) => {
      let c = mix3(C.pants, C.pantsHi, 0.5 + 0.5 * fbm(p[0] * 26, p[1] * 26, p[2] * 26, 2));
      const a = Math.atan2(p[0] - cx, -p[2]);
      c = mix3(c, [60, 68, 100], 0.6 * Math.pow(Math.max(0, Math.cos(a)), 160));      // 다림질 주름선 하이라이트
      if (Math.abs(Math.abs(a) - Math.PI / 2) < 0.02 && Math.sign(a) === s) c = mix3(c, C.pantsThread, 0.6); // 바깥 솔기
      return shadeAO(c, ao, 1);
    };
    def(`${side}UpperLeg`, 'Pants', unionS(0.03, thigh, ellipsoid([s * 0.28, 1.36, 0.0], [0.2, 0.12, 0.21])), [s * 0.27 - 0.32, 1.2, -0.34], [s * 0.27 + 0.32, 2.66, 0.34], {
      cell: 0.008, target: 6000, tex: 512, aoStep: 0.03, uv: cylY(s * 0.27, 0.0, 1.2, 2.66), color: C.pants, shade: pantsShade(s * 0.27),
    });
    const shin = loft([
      { y: 0.12, cx: s * 0.28, cz: 0.015, rx: 0.2, rz: 0.215 },
      { y: 0.22, cx: s * 0.28, cz: 0.01, rx: 0.205, rz: 0.215 },
      { y: 0.32, cx: s * 0.28, cz: 0.01, rx: 0.196, rz: 0.205 },
      { y: 0.9, cx: s * 0.28, cz: 0.0, rx: 0.195, rz: 0.205 },
      { y: 1.5, cx: s * 0.28, cz: 0.0, rx: 0.2, rz: 0.21 },
    ], { n: 2.1, crease: 0.03 });
    def(`${side}LowerLeg`, 'Pants', shin, [s * 0.28 - 0.26, 0.08, -0.26], [s * 0.28 + 0.26, 1.54, 0.26], {
      cell: 0.008, target: 5000, tex: 512, aoStep: 0.03, uv: cylY(s * 0.28, 0.0, 0.08, 1.54), color: C.pants, shade: pantsShade(s * 0.28),
    });
    // 구두 (더비): 둥근 앞코, 뒤꿈치, 발등 끈, 고무 밑창 + 굽
    const fx = s * 0.28;
    const upperShoe = inter(unionS(0.06,
      ellipsoid([fx, 0.12, 0.12], [0.125, 0.13, 0.13]),
      ellipsoid([fx, 0.13, -0.12], [0.15, 0.135, 0.26]),
      ellipsoid([fx + s * 0.01, 0.078, -0.4], [0.145, 0.085, 0.17])), (x, y, z) => 0.03 - y);
    const shoeUp = sub(upperShoe, ellipsoid([fx, 0.3, 0.07], [0.11, 0.1, 0.13]));
    const sole = (x, y, z) => Math.max(upperShoe(x, Math.min(Math.max(y, 0.04), 0.08), z) - 0.014, -y, y - 0.045);
    const heel = box([fx, 0.03, 0.14], [0.115, 0.03, 0.09], 0.02);
    const laces = union(...[0, 1, 2, 3, 4].map((k) => box([fx, 0.232 - k * 0.022, -0.04 - k * 0.045], [0.058, 0.0055, 0.008], 0.005)));
    const shoe = unionS(0.004, shoeUp, sole, heel, laces);
    def(`${side}Foot`, 'Shoe', shoe, [fx - 0.2, -0.02, -0.6], [fx + 0.2, 0.3, 0.29], {
      cell: 0.005, target: 8000, tex: 512, aoStep: 0.015, uv: cylZ(fx, 0.08, -0.6, 0.29), color: C.shoe, reflectance: 0.08,
      shade: (p, n, ao) => {
        let c = mix3(C.shoe, [38, 38, 42], 0.5 + 0.5 * vnoise(p[0] * 200, p[1] * 200, p[2] * 200));
        if (p[1] < 0.046) c = mix3(C.sole, [54, 54, 56], 0.5 + 0.5 * vnoise(p[0] * 300, 0, p[2] * 300));
        if (Math.abs(p[1] - 0.05) < 0.004 && (((p[2] + p[0]) * 70) % 1 + 1) % 1 < 0.6) c = [72, 72, 74];   // 밑창 박음질
        if (Math.abs(p[2] + 0.34 + 0.06 * Math.pow((p[0] - fx) / 0.15, 2)) < 0.004 && p[1] > 0.05) c = [46, 46, 50]; // 앞코 덮개 이음매
        if (p[2] < -0.18 && p[2] > -0.28 && p[1] > 0.1) c = mul3(c, 1 + 0.25 * Math.max(0, Math.sin(p[2] * 180 + p[0] * 40))); // 걸을 때 생긴 주름
        if (p[1] > 0.15 && Math.abs(p[0] - fx) < 0.064 && p[2] > -0.15 && p[2] < 0.02) c = mix3(c, [26, 26, 28], 0.5);
        return shadeAO(c, ao, 0.9);
      },
    });
  }

  // ════════ 메시 뽑기 + 텍스처 굽기 ════════
  for (const d of defs) {
    const geo = await sculpt(d.f, d.bmin, d.bmax, d.cell, d.target);
    const name = `GH_${d.part}${d.name}`, partName = `${d.part}__${d.name}`;
    if (d.tex) {
      const texName = `gh_${d.part}_${d.name}`.toLowerCase();
      const { geo: g2, png } = bake(geo, { size: d.tex, uv: d.uv, shade: d.shade, aoStep: d.aoStep, bg: d.color });
      textures[texName] = png;
      out.push({ name, partName, geo: g2, color: d.color, material: 'SmoothPlastic', keepUV: true, texture: texName, reflectance: d.reflectance || 0 });
    } else {
      out.push({ name, partName, geo, color: d.color, material: d.material || 'SmoothPlastic', reflectance: d.reflectance || 0 });
    }
  }

  // ════════ 안경 (얇은 금속 사각테 + 렌즈) — 선이 아주 가늘어서 three.js 관으로 만든다 ════════
  const toW = (q) => new THREE.Vector3(q[0] + HC[0], q[1] + HC[1], q[2] + HC[2]);
  const lensZ = (x) => LZ + 0.07 * (Math.abs(x) - LX) * (Math.abs(x) > LX ? 1 : 0.3) + 0.004;
  const rimPath = (cx) => {
    const pts = [], r = 0.012;
    const corners = [[LW - r, LH - r, 0], [-(LW - r), LH - r, Math.PI / 2], [-(LW - r), -(LH - r), Math.PI], [LW - r, -(LH - r), 1.5 * Math.PI]];
    corners.forEach(([ox, oy, a0]) => { for (let k = 0; k <= 6; k++) { const a = a0 + (k / 6) * Math.PI / 2; const x = cx + ox + r * Math.cos(a); pts.push(toW([x, LY + oy + r * Math.sin(a), lensZ(x)])); } });
    return new THREE.CatmullRomCurve3(pts, true);
  };
  const frameGeos = [];
  for (const s of [-1, 1]) {
    frameGeos.push(new THREE.TubeGeometry(rimPath(s * LX), 72, 0.0038, 6, true));
    const x0 = s * (LX + LW + 0.002);
    frameGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([toW([x0, LY + LH - 0.01, lensZ(x0)]), toW([s * 0.19, 0.046, -0.215]), toW([s * 0.24, 0.052, -0.09]), toW([s * 0.258, 0.056, 0.0]), toW([s * 0.265, 0.035, 0.07]), toW([s * 0.26, -0.005, 0.088])]), 32, 0.0042, 6, false));
    const pad = new THREE.SphereGeometry(0.008, 8, 6); pad.scale(0.6, 1.4, 0.8); pad.translate(HC[0] + s * 0.024, HC[1] + LY - 0.012, HC[2] - 0.283); frameGeos.push(pad);
  }
  frameGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([toW([-(LX - LW) - 0.002, LY + LH - 0.012, lensZ(LX - LW)]), toW([0, LY + LH - 0.004, LZ - 0.004]), toW([LX - LW + 0.002, LY + LH - 0.012, lensZ(LX - LW)])]), 16, 0.0038, 6, false));
  const lensGeos = [-1, 1].flatMap((s) => {
    const sh = new THREE.Shape(), hw = LW - 0.002, hh = LH - 0.002, r = 0.011;
    sh.moveTo(-hw + r, -hh); sh.lineTo(hw - r, -hh); sh.quadraticCurveTo(hw, -hh, hw, -hh + r); sh.lineTo(hw, hh - r); sh.quadraticCurveTo(hw, hh, hw - r, hh); sh.lineTo(-hw + r, hh); sh.quadraticCurveTo(-hw, hh, -hw, hh - r); sh.lineTo(-hw, -hh + r); sh.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    const g = new THREE.ShapeGeometry(sh, 6);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) + s * LX; pa.setXYZ(i, x + HC[0], pa.getY(i) + LY + HC[1], lensZ(x) + HC[2]); }
    return [g, flipTris(g.clone())]; // 양면
  });
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  const strip = (g) => { const h = g.index ? g.toNonIndexed() : g; ['uv', 'uv1'].forEach((a) => { if (h.attributes[a]) h.deleteAttribute(a); }); h.computeVertexNormals(); return h; };
  out.push({ name: 'GH_HeadGlasses', partName: 'Head__Glasses', geo: mergeGeometries(frameGeos.map(strip)), color: C.glassFrame, material: 'Metal', reflectance: 0.25 });
  out.push({ name: 'GH_HeadLenses', partName: 'Head__Lenses', geo: mergeGeometries(lensGeos.map(strip)), color: [214, 226, 234], material: 'Glass', transparency: 0.8, reflectance: 0.25 });
  // 모자 금색 장식 줄 (챙 위 두 줄) + 양 끝 단추
  const cordPts = []; for (let k = 0; k <= 14; k++) { const a = -1.0 + k / 14 * 2.0; const q = [0.285 * Math.sin(a), CAP_Y + 0.017, 0.03 - 0.325 * Math.cos(a)]; cordPts.push(toW(q)); }
  const gold = [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 56, 0.0062, 6, false), new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts.map((v) => v.clone().add(new THREE.Vector3(0, 0.0135, 0.001)))), 56, 0.0062, 6, false)];
  for (const a of [-1.0, 1.0]) { const b = new THREE.SphereGeometry(0.013, 10, 8); b.translate(...toW([0.287 * Math.sin(a), CAP_Y + 0.024, 0.03 - 0.327 * Math.cos(a)]).toArray()); gold.push(b); }
  out.push({ name: 'GH_HeadCapGold', partName: 'Head__CapGold', geo: mergeGeometries(gold.map(strip)), color: C.gold, material: 'Metal', reflectance: 0.2 });

  return { meshes: out, textures, skeleton: SKELETON };
}

// 삼각형 감기 방향 뒤집기 (양면 렌즈용)
function flipTris(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  g.index.needsUpdate = true;
  return g;
}
