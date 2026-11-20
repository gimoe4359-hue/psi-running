// 복도의 여학생 (귀신): SDF로 조각한 몸 + 교복 + 얼굴을 덮은 긴 생머리
// 발밑이 원점, 앞쪽이 -Z. 키 5.6 stud(약 165 cm).
import * as THREE from 'three';
import { ellipsoid, roundCone, unionS, union, inter, sub, offset, halfspace, rotX, rotZ, wrinkle, mesh, smin } from './sdf.js';

export function buildGirl(rng, budget = 9000) {
  const PIV = [0, 4.86, 0.03];
  const TILT = -0.27, ROLL = 0.09; // 고개를 숙이고 살짝 갸웃
  const tilt = (f) => rotZ(rotX(f, PIV, TILT), PIV, ROLL);

  // ── 몸 ──
  const headL = ellipsoid([0, 5.22, 0.02], [0.27, 0.37, 0.32]);
  const head = tilt(unionS(0.06, headL, ellipsoid([0, 5.0, -0.07], [0.2, 0.17, 0.22])));
  const neck = tilt(roundCone([0, 4.64, 0.04], [0, 4.98, 0.03], 0.125, 0.112));
  const torso = unionS(0.09,
    ellipsoid([0, 4.27, 0.01], [0.45, 0.42, 0.26]),
    ellipsoid([-0.165, 4.24, -0.12], [0.15, 0.14, 0.13]),
    ellipsoid([0.165, 4.24, -0.12], [0.15, 0.14, 0.13]),
    ellipsoid([0, 3.72, 0.02], [0.35, 0.36, 0.22]),
    ellipsoid([0, 3.3, 0.04], [0.46, 0.34, 0.28]),
    roundCone([-0.36, 4.5, 0.03], [0, 4.6, 0.03], 0.11, 0.13),
    roundCone([0.36, 4.5, 0.03], [0, 4.6, 0.03], 0.11, 0.13));
  const arm = (s) => unionS(0.05,
    ellipsoid([s * 0.46, 4.44, 0.03], [0.13, 0.14, 0.13]),
    roundCone([s * 0.48, 4.42, 0.03], [s * 0.57, 3.6, 0.08], 0.1, 0.08),
    roundCone([s * 0.57, 3.6, 0.08], [s * 0.6, 2.84, -0.02], 0.08, 0.056));
  const hand = (s) => unionS(0.04,
    ellipsoid([s * 0.605, 2.67, -0.03], [0.05, 0.15, 0.085]),
    ellipsoid([s * 0.61, 2.48, -0.04], [0.042, 0.13, 0.075]),
    ellipsoid([s * 0.57, 2.63, -0.1], [0.04, 0.09, 0.04]));
  const leg = (s) => unionS(0.06,
    roundCone([s * 0.2, 3.14, 0.04], [s * 0.175, 1.72, 0.01], 0.2, 0.125),
    roundCone([s * 0.175, 1.72, 0.01], [s * 0.165, 0.27, 0.05], 0.118, 0.062),
    ellipsoid([s * 0.175, 1.26, 0.06], [0.11, 0.33, 0.11]));
  const foot = (s) => unionS(0.04, ellipsoid([s * 0.165, 0.12, -0.08], [0.1, 0.1, 0.27]), ellipsoid([s * 0.165, 0.2, 0.06], [0.08, 0.1, 0.09]));
  const arms = union(arm(-1), arm(1));
  const legs = union(leg(-1), leg(1));
  const feet = union(foot(-1), foot(1));
  const body = unionS(0.05, torso, arms, hand(-1), hand(1), legs, feet, neck, head);

  // ── 옷 ──
  const blouseTorso = inter(offset(torso, 0.028), halfspace([0, 1, 0], 3.48), halfspace([0, -1, 0], -4.8));
  const blouseArms = inter(offset(arms, 0.03), halfspace([0, 1, 0], 2.93));
  const collar = (x, y, z) => {
    // 목둘레 칼라: 목 주변 띠
    const r = Math.hypot(x / 1.0, (z - 0.03) / 0.9) - 0.17;
    return Math.max(Math.hypot(r, y - 4.73) - 0.045, y - 4.8);
  };
  const blouse = union(wrinkle(unionS(0.05, blouseTorso, blouseArms), 0.007, 8), collar);
  const vCut = (x, y, z) => Math.max(z + 0.02, 3.98 - y, Math.abs(x) - (y - 3.98) * 0.55);
  const vest = sub(inter(wrinkle(offset(torso, 0.06), 0.006, 7), halfspace([0, 1, 0], 3.44), halfspace([0, -1, 0], -4.66)), vCut);
  const skirt = (x, y, z) => {
    const t = Math.max(0, Math.min(1, (3.62 - y) / 1.08));
    const rx = 0.44 + 0.2 * t, rz = 0.32 + 0.15 * t, zc = 0.04;
    const th = Math.atan2(z - zc, x);
    const tri = Math.abs(((th / (Math.PI * 2)) * 16) % 1 - 0.5) * 2; // 주름
    const pleat = 1 + 0.04 * tri * (0.4 + 0.6 * t);
    const dr = (Math.hypot(x / rx, (z - zc) / rz) - pleat) * Math.min(rx, rz);
    return Math.max(dr - 0.01, y - 3.64, 2.52 - y);
  };
  const socks = inter(offset(union(leg(-1), leg(1)), 0.014), halfspace([0, 1, 0], 0.16), halfspace([0, -1, 0], -1.56));
  const shoes = inter(offset(feet, 0.035), halfspace([0, -1, 0], -0.34));
  const skinRegion = (x, y, z) => Math.min(4.56 - y, Math.max(y - 2.96, 0.45 - Math.abs(x)), Math.max(1.5 - y, y - 2.6));
  const skin = inter(body, skinRegion);
  const ribbon = union(
    ellipsoid([-0.075, 4.6, -0.3], [0.075, 0.045, 0.028]),
    ellipsoid([0.075, 4.6, -0.3], [0.075, 0.045, 0.028]),
    ellipsoid([0, 4.6, -0.31], [0.03, 0.035, 0.03]),
    ellipsoid([-0.03, 4.5, -0.31], [0.025, 0.08, 0.02]),
    ellipsoid([0.03, 4.5, -0.31], [0.025, 0.08, 0.02]));
  // 머리 덮개 (정수리~뒤통수, 이마 위)
  const hairRegion = (x, y, z) => (z > 0.12 ? 4.95 - y : z < -0.1 ? 5.36 - y : 5.06 - y);
  const hairCap = tilt(inter(offset(headL, 0.035), hairRegion));

  const out = [];
  const add = (name, f, bmin, bmax, cell, look, smooth = 2) => {
    let c = cell, geo;
    for (let tries = 0; tries < 8; tries++) {
      geo = mesh(f, bmin, bmax, c, { smooth });
      if (geo.index.count / 3 <= budget) break;
      c *= 1.15;
    }
    out.push({ name, geo, ...look });
  };
  add('Ghost_Skin', skin, [-0.85, 0, -0.55], [0.85, 5.75, 0.55], 0.03, { color: [212, 200, 192], material: 'SmoothPlastic' });
  add('Ghost_Blouse', blouse, [-0.85, 2.8, -0.45], [0.85, 4.9, 0.45], 0.028, { color: [226, 226, 220], material: 'Fabric' });
  add('Ghost_Vest', vest, [-0.62, 3.35, -0.45], [0.62, 4.75, 0.45], 0.03, { color: [32, 36, 54], material: 'Fabric' });
  add('Ghost_Skirt', skirt, [-0.75, 2.45, -0.62], [0.75, 3.7, 0.7], 0.02, { color: [40, 42, 58], material: 'Fabric' }, 2);
  add('Ghost_Socks', socks, [-0.4, 0.1, -0.3], [0.4, 1.62, 0.3], 0.025, { color: [232, 232, 228], material: 'Fabric' });
  add('Ghost_Shoes', shoes, [-0.4, -0.05, -0.45], [0.4, 0.4, 0.3], 0.02, { color: [20, 18, 18], material: 'SmoothPlastic', reflectance: 0.04 });
  add('Ghost_Ribbon', ribbon, [-0.2, 4.35, -0.4], [0.2, 4.7, -0.2], 0.012, { color: [118, 16, 26], material: 'Fabric' });
  add('Ghost_HairCap', hairCap, [-0.45, 4.6, -0.55], [0.45, 5.75, 0.5], 0.025, { color: [10, 9, 9], material: 'SmoothPlastic' });

  // ── 긴 생머리 가닥 ──
  // 머리 좌표계(숙이기 전) → 실제 좌표
  const cT = Math.cos(TILT), sT = Math.sin(TILT), cR = Math.cos(ROLL), sR = Math.sin(ROLL);
  const toWorld = (p) => {
    let y = p[1] - PIV[1], z = p[2] - PIV[2];
    let y2 = y * cT - z * sT, z2 = y * sT + z * cT;
    let x = p[0] - PIV[0];
    const x3 = x * cR - y2 * sR, y3 = x * sR + y2 * cR;
    return [PIV[0] + x3, PIV[1] + y3, PIV[2] + z2];
  };
  const collide = unionS(0.05, head, neck, offset(blouseTorso, 0.04), offset(vest, 0.01), offset(arms, 0.05));
  const grad = (p) => {
    const h = 0.01;
    const gx = collide(p[0] + h, p[1], p[2]) - collide(p[0] - h, p[1], p[2]);
    const gy = collide(p[0], p[1] + h, p[2]) - collide(p[0], p[1] - h, p[2]);
    const gz = collide(p[0], p[1], p[2] + h) - collide(p[0], p[1], p[2] - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l];
  };
  const strands = [];
  // 머리카락 뭉치: 뭉치마다 시작 각도·흔들림을 공유해서 진짜 머리처럼 갈라져 보이게
  const clumps = [];
  for (let c = 0; c < 110; c++) {
    const phi = rng() * Math.PI * 2;
    const front = Math.cos(phi + Math.PI / 2) > 0.5;
    clumps.push({ phi, front, theta: front ? 0.3 + rng() * 0.6 : 0.2 + rng() * 1.15, sway: [(rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08], L: front ? 1.3 + rng() * 0.4 : 1.8 + rng() * 0.5 });
  }
  const NS = 760;
  for (let i = 0; i < NS; i++) {
    const cl = clumps[Math.floor(rng() * clumps.length)];
    const phi = cl.phi + (rng() - 0.5) * 0.16, theta = cl.theta + (rng() - 0.5) * 0.12, front = cl.front;
    const dir = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
    const loc = [0 + dir[0] * 0.3, 5.22 + dir[1] * 0.4, 0.02 + dir[2] * 0.35];
    let p = toWorld(loc);
    const out0 = toWorld([loc[0] + dir[0], loc[1] + dir[1], loc[2] + dir[2]]);
    let d = [(out0[0] - p[0]) * 0.3, -1, (out0[2] - p[2]) * 0.3];
    const L = cl.L * (0.92 + rng() * 0.16);
    const n = 16, seg = L / n;
    const pts = [p.slice()];
    for (let k = 0; k < n; k++) {
      const dl = Math.hypot(...d);
      d = [d[0] / dl, d[1] / dl, d[2] / dl];
      p = [p[0] + d[0] * seg + cl.sway[0] * seg + (rng() - 0.5) * 0.008, p[1] + d[1] * seg, p[2] + d[2] * seg + cl.sway[1] * seg + (rng() - 0.5) * 0.008];
      // 어깨 밖으로 퍼지지 않게 안쪽으로 당김
      if (Math.abs(p[0]) > 0.36) p[0] -= Math.sign(p[0]) * (Math.abs(p[0]) - 0.36) * 0.35;
      for (let it = 0; it < 3; it++) {
        const dd = collide(p[0], p[1], p[2]);
        const m = 0.022 + rng() * 0.018;
        if (dd < m) { const g = grad(p); p = [p[0] + g[0] * (m - dd), p[1] + g[1] * (m - dd), p[2] + g[2] * (m - dd)]; }
      }
      pts.push(p.slice());
      d = [d[0] * 0.5, d[1] * 0.5 - 0.5, d[2] * 0.5];
    }
    strands.push({ pts, w0: 0.04 + rng() * 0.035 });
  }
  // 리본 띠로 만들기 (양면)
  const chunks = [[], [], [], [], [], []];
  strands.forEach((s, si) => {
    const tgt = chunks[si % 6];
    const P = s.pts;
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1];
      const t0 = k / (P.length - 1), t1 = (k + 1) / (P.length - 1);
      const w0 = s.w0 * (1 - 0.6 * t0), w1 = s.w0 * (1 - 0.6 * t1);
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      // 몸 중심축에서 바깥쪽으로 향하는 면
      const ox = (a[0] + b[0]) / 2, oz = (a[2] + b[2]) / 2 - 0.03;
      let sx = dy * oz - dz * 0, sy = dz * ox - dx * oz, sz = dx * 0 - dy * ox;
      const sl = Math.hypot(sx, sy, sz) || 1;
      sx /= sl; sy /= sl; sz /= sl;
      const q = [
        [a[0] - sx * w0 / 2, a[1] - sy * w0 / 2, a[2] - sz * w0 / 2], [a[0] + sx * w0 / 2, a[1] + sy * w0 / 2, a[2] + sz * w0 / 2],
        [b[0] + sx * w1 / 2, b[1] + sy * w1 / 2, b[2] + sz * w1 / 2], [b[0] - sx * w1 / 2, b[1] - sy * w1 / 2, b[2] - sz * w1 / 2]];
      tgt.push(q[0], q[1], q[2], q[0], q[2], q[3]);
      tgt.push(q[0], q[2], q[1], q[0], q[3], q[2]);
    }
  });
  chunks.forEach((tris, ci) => {
    const pos = new Float32Array(tris.length * 3);
    tris.forEach((v, i) => { pos[i * 3] = v[0]; pos[i * 3 + 1] = v[1]; pos[i * 3 + 2] = v[2]; });
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    out.push({ name: `Ghost_Hair${'ABCDEF'[ci]}`, geo, color: [12, 10, 10], material: 'SmoothPlastic', reflectance: 0.03 });
  });
  void smin;
  return out;
}
