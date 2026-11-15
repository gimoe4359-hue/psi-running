// 부호 거리 함수(SDF)로 모양을 만들고 Surface Nets로 매끈한 메시를 뽑는다.
import * as THREE from 'three';

export const v3 = (x, y, z) => [x, y, z];
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── 기본 도형 ──
export function ellipsoid(c, r) {
  return (x, y, z) => {
    const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2];
    const k0 = len3(px, py, pz);
    const k1 = len3(px / r[0], py / r[1], pz / r[2]);
    return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
  };
}
// 두 점 사이, 반지름이 r1 → r2 로 변하는 원뿔 캡슐
export function roundCone(a, b, r1, r2) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2;
    const z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  };
}
export function box(c, h, round = 0) {
  return (x, y, z) => {
    const qx = Math.abs(x - c[0]) - h[0] + round, qy = Math.abs(y - c[1]) - h[1] + round, qz = Math.abs(z - c[2]) - h[2] + round;
    return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - round;
  };
}
export function torusY(c, R, r) {
  return (x, y, z) => {
    const qx = Math.hypot(x - c[0], z - c[2]) - R;
    return Math.hypot(qx, y - c[1]) - r;
  };
}
// ── 합치기 ──
export function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}
export const unionS = (k, ...fs) => (x, y, z) => { let d = fs[0](x, y, z); for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k); return d; };
export const union = (...fs) => (x, y, z) => { let d = Infinity; for (const f of fs) d = Math.min(d, f(x, y, z)); return d; };
export const inter = (...fs) => (x, y, z) => { let d = -Infinity; for (const f of fs) d = Math.max(d, f(x, y, z)); return d; };
export const sub = (a, b) => (x, y, z) => Math.max(a(x, y, z), -b(x, y, z));
export const offset = (f, o) => (x, y, z) => f(x, y, z) - o;
export const shell = (f, t) => (x, y, z) => Math.abs(f(x, y, z)) - t;
// 평면으로 자르기: n·p > d 쪽만 남김
export const halfspace = (n, d) => (x, y, z) => d - (n[0] * x + n[1] * y + n[2] * z);
// 회전(X축)한 공간에서 f 를 평가 (pivot 기준)
export function rotX(f, pivot, ang) {
  const c = Math.cos(-ang), s = Math.sin(-ang);
  return (x, y, z) => {
    const py = y - pivot[1], pz = z - pivot[2];
    return f(x, pivot[1] + py * c - pz * s, pivot[2] + py * s + pz * c);
  };
}
export function rotZ(f, pivot, ang) {
  const c = Math.cos(-ang), s = Math.sin(-ang);
  return (x, y, z) => {
    const px = x - pivot[0], py = y - pivot[1];
    return f(pivot[0] + px * c - py * s, pivot[1] + px * s + py * c, z);
  };
}
// 표면 잡음 (옷 주름 등)
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const h = hash3(xi + dx, yi + dy, zi + dz);
    r += h * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
  }
  return r * 2 - 1;
}
export const wrinkle = (f, amp, freq) => (x, y, z) => f(x, y, z) + amp * (vnoise(x * freq, y * freq * 0.6, z * freq) * 0.7 + vnoise(x * freq * 2.3, y * freq * 1.4, z * freq * 2.3) * 0.3);

// ── Surface Nets ──
// f: SDF, bmin/bmax: 범위, cell: 격자 크기 → THREE.BufferGeometry (매끈한 법선)
export function mesh(f, bmin, bmax, cell, o = {}) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / cell) + 1, ny = Math.ceil((bmax[1] - bmin[1]) / cell) + 1, nz = Math.ceil((bmax[2] - bmin[2]) / cell) + 1;
  const val = new Float32Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    val[idx(i, j, k)] = f(bmin[0] + i * cell, bmin[1] + j * cell, bmin[2] + k * cell);
  }
  const vertOf = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    const cv = corners.map(([a, b, c], n) => { const v = val[idx(i + a, j + b, k + c)]; if (v < 0) mask |= 1 << n; return v; });
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [e0, e1] of edges) {
      const v0 = cv[e0], v1 = cv[e1];
      if ((v0 < 0) === (v1 < 0)) continue;
      const t = v0 / (v0 - v1);
      const c0 = corners[e0], c1 = corners[e1];
      sx += c0[0] + (c1[0] - c0[0]) * t; sy += c0[1] + (c1[1] - c0[1]) * t; sz += c0[2] + (c1[2] - c0[2]) * t;
      cnt++;
    }
    vertOf[cidx(i, j, k)] = pos.length / 3;
    pos.push(bmin[0] + (i + sx / cnt) * cell, bmin[1] + (j + sy / cnt) * cell, bmin[2] + (k + sz / cnt) * cell);
  }
  const tris = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, b, c, a, c, d); else tris.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = val[idx(i, j, k)] < 0, b = val[idx(i + 1, j, k)] < 0;
    if (a === b) continue;
    quad(vertOf[cidx(i, j - 1, k - 1)], vertOf[cidx(i, j, k - 1)], vertOf[cidx(i, j, k)], vertOf[cidx(i, j - 1, k)], a);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = val[idx(i, j, k)] < 0, b = val[idx(i, j + 1, k)] < 0;
    if (a === b) continue;
    quad(vertOf[cidx(i - 1, j, k - 1)], vertOf[cidx(i - 1, j, k)], vertOf[cidx(i, j, k)], vertOf[cidx(i, j, k - 1)], a);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = val[idx(i, j, k)] < 0, b = val[idx(i, j, k + 1)] < 0;
    if (a === b) continue;
    quad(vertOf[cidx(i - 1, j - 1, k)], vertOf[cidx(i, j - 1, k)], vertOf[cidx(i, j, k)], vertOf[cidx(i - 1, j, k)], a);
  }
  // 라플라스 다듬기 (표면에 다시 붙임)
  const P = Float32Array.from(pos);
  const nv = P.length / 3;
  const nb = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const h = cell * 0.5;
  const grad = (x, y, z) => {
    const gx = f(x + h, y, z) - f(x - h, y, z), gy = f(x, y + h, z) - f(x, y - h, z), gz = f(x, y, z + h) - f(x, y, z - h);
    const l = len3(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };
  for (let it = 0; it < (o.smooth ?? 2); it++) {
    const Q = Float32Array.from(P);
    for (let v = 0; v < nv; v++) {
      if (!nb[v].size) continue;
      let sx = 0, sy = 0, sz = 0;
      nb[v].forEach((u) => { sx += P[u * 3]; sy += P[u * 3 + 1]; sz += P[u * 3 + 2]; });
      const k = nb[v].size;
      let x = P[v * 3] * 0.5 + (sx / k) * 0.5, y = P[v * 3 + 1] * 0.5 + (sy / k) * 0.5, z = P[v * 3 + 2] * 0.5 + (sz / k) * 0.5;
      // 표면으로 다시 투영
      const d = f(x, y, z), g = grad(x, y, z);
      x -= g[0] * d; y -= g[1] * d; z -= g[2] * d;
      Q[v * 3] = x; Q[v * 3 + 1] = y; Q[v * 3 + 2] = z;
    }
    P.set(Q);
  }
  const N = new Float32Array(P.length);
  for (let v = 0; v < nv; v++) {
    const g = grad(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    N[v * 3] = g[0]; N[v * 3 + 1] = g[1]; N[v * 3 + 2] = g[2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setIndex(tris);
  return geo;
}
