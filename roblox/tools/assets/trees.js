// 나무 메시 (11월 한국: 노란 은행나무, 주황빛 느티나무, 소나무)
// 기준점 = 밑동 바닥 가운데. 기준 높이: 은행 26, 느티 26, 소나무 28 stud (게임에서는 Scale 속성으로 키를 맞춘다)
// 줄기·가지 = 끝이 가늘어지는 관(tube), 잎 = 납작한 사면체(어느 쪽에서 봐도 보이는 작은 잎 조각)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const BARK_TILE = 3.0; // 나무껍질 그림 한 장이 덮는 길이(stud)

// 점 목록 + 반지름 목록 → 인덱스 관 메시 (평행 이동 프레임)
function tubeGeo(points, radii, sides) {
  const n = points.length, pos = [], idx = [], uv = [];
  let arc = 0;
  let T = points[1].clone().sub(points[0]).normalize();
  const N0 = (Math.abs(T.y) < 0.9 ? UP.clone() : V(1, 0, 0)).cross(T).normalize();
  const B0 = T.clone().cross(N0).normalize();
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const T2 = (i < n - 1 ? points[i + 1].clone().sub(points[i - 1]) : points[i].clone().sub(points[i - 1])).normalize();
      const axis = T.clone().cross(T2), s = axis.length();
      if (s > 1e-6) { axis.normalize(); const ang = Math.atan2(s, T.dot(T2)); N0.applyAxisAngle(axis, ang); B0.applyAxisAngle(axis, ang); }
      T = T2;
    }
    if (i > 0) arc += points[i].distanceTo(points[i - 1]);
    // 둘레를 한 바퀴 돌고 이음매 열을 하나 더 (나무껍질 그림이 끊기지 않게)
    const around = Math.max(1, Math.round((2 * Math.PI * radii[0]) / BARK_TILE));
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const p = points[i].clone().addScaledVector(N0, Math.cos(a) * radii[i]).addScaledVector(B0, Math.sin(a) * radii[i]);
      pos.push(p.x, p.y, p.z);
      uv.push((k / sides) * around, arc / BARK_TILE);
    }
  }
  const S1 = sides + 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
    const a = i * S1 + k, b = i * S1 + k + 1, c = (i + 1) * S1 + k, d = (i + 1) * S1 + k + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 납작한 사면체 잎: 잎 면(삼각형) + 살짝 솟은 꼭짓점 하나
function leafGeo(list) {
  const pos = [], idx = [];
  list.forEach(({ c, n, t, w, l, th }) => {
    const b = n.clone().cross(t).normalize();
    const base = pos.length / 3;
    const p0 = c.clone().addScaledVector(t, -l * 0.45);
    const p1 = c.clone().addScaledVector(t, l * 0.55).addScaledVector(b, w * 0.5);
    const p2 = c.clone().addScaledVector(t, l * 0.55).addScaledVector(b, -w * 0.5);
    const p3 = c.clone().addScaledVector(t, l * 0.15).addScaledVector(n, th);
    [p0, p1, p2, p3].forEach((p) => pos.push(p.x, p.y, p.z));
    idx.push(base, base + 2, base + 1, base, base + 1, base + 3, base + 1, base + 2, base + 3, base + 2, base, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 방향 d 를 기준으로 elev(라디안)만큼 벌어지고 방위 az 로 도는 새 방향
function spread(d, elev, az) {
  const ref = Math.abs(d.y) < 0.95 ? UP : V(1, 0, 0);
  const u = ref.clone().cross(d).normalize(), w = d.clone().cross(u).normalize();
  return d.clone().multiplyScalar(Math.cos(elev)).addScaledVector(u, Math.sin(elev) * Math.cos(az)).addScaledVector(w, Math.sin(elev) * Math.sin(az)).normalize();
}

// 가지 하나 키우기: 시작점·방향·길이·굵기 → 점 목록
function limb(rng, start, dir, len, r0, r1, opts) {
  const segs = Math.max(2, Math.round(len / (opts.segLen || 1.4)));
  const pts = [start.clone()], rs = [r0];
  const d = dir.clone();
  let p = start.clone();
  for (let i = 1; i <= segs; i++) {
    d.add(V((rng() - 0.5) * opts.wiggle, opts.up + (rng() - 0.5) * opts.wiggle * 0.5, (rng() - 0.5) * opts.wiggle)).normalize();
    p = p.clone().addScaledVector(d, len / segs);
    pts.push(p);
    rs.push(r0 + (r1 - r0) * (i / segs));
  }
  return { pts, rs, dir: d };
}

function grow(rng, S) {
  const wood = [], tips = [];
  const addWood = (b, sides) => wood.push(tubeGeo(b.pts, b.rs, sides));
  // 줄기
  const trunk = limb(rng, V(0, -0.4, 0), spread(UP, S.lean, rng() * 6.28), S.H * S.trunkLen, S.trunkR, S.trunkR * S.trunkTaper, { wiggle: S.trunkWiggle, up: 0.02, segLen: 1.2 });
  addWood(trunk, 9);
  const kids = (parent, depth) => {
    const P = S.levels[depth];
    if (!P) return;
    const n = P.count(parent);
    for (let c = 0; c < n; c++) {
      const t = P.at(c, n, rng);
      const i = Math.min(parent.pts.length - 2, Math.max(1, Math.round(t * (parent.pts.length - 1))));
      const base = parent.pts[i], pr = parent.rs[i];
      const pdir = parent.pts[i + 1].clone().sub(parent.pts[i]).normalize();
      const az = depth === 0 ? c * 2.39996 + rng() * 0.6 : rng() * 6.28;
      const dir = P.dir ? P.dir(pdir, az, base, rng) : spread(pdir, P.elev + (rng() - 0.5) * 0.3, az);
      const len = P.len(base, rng);
      if (len < 0.4) continue;
      const b = limb(rng, base, dir, len, Math.min(pr * 0.82, P.r0), P.r1, P);
      addWood(b, P.sides);
      b.depth = depth;
      if (depth + 1 < S.levels.length) kids(b, depth + 1);
      else tips.push(b);
      if (P.leafy) tips.push(b);
    }
  };
  kids(trunk, 0);
  return { wood, tips, trunk };
}

// 잎을 가지 끝 둘레에 흩뿌리기
function scatterLeaves(rng, tips, S) {
  const leaves = [];
  const per = Math.max(1, Math.round(S.leafCount / Math.max(1, tips.length)));
  tips.forEach((b) => {
    const n = b.pts.length;
    for (let k = 0; k < per; k++) {
      const t = 0.35 + rng() * 0.65;
      const i = Math.min(n - 2, Math.floor(t * (n - 1)));
      const f = t * (n - 1) - i;
      const p = b.pts[i].clone().lerp(b.pts[i + 1], f);
      const off = V(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize().multiplyScalar(S.leafSpread * Math.cbrt(rng()));
      off.y *= S.leafFlat ?? 1;
      const c = p.add(off);
      if (S.keep && !S.keep(c)) continue;
      // 잎은 대체로 바깥·위를 향함
      const outward = V(c.x, 0, c.z).normalize().multiplyScalar(0.5).add(V(0, 0.6, 0)).add(V(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(1.6)).normalize();
      let tg = V(rng() - 0.5, rng() - 0.5, rng() - 0.5).cross(outward);
      if (tg.lengthSq() < 1e-6) tg = V(1, 0, 0);
      tg.normalize();
      const s = S.leafSize * (0.75 + rng() * 0.5);
      leaves.push({ c, n: outward, t: tg, w: s * S.leafW, l: s, th: s * 0.12, col: Math.floor(rng() * S.leafColors.length) });
    }
  });
  return leaves;
}

function finish(name, rng, S) {
  const { wood, tips } = grow(rng, S);
  const out = [];
  // 줄기·가지: 나무껍질 그림을 입힐 수 있게 UV 를 남긴다 (keepUV). 1만 삼각형 넘으면 둘로
  const tri = wood.reduce((a, g) => a + g.index.count / 3, 0);
  const tex = S.barkTex || 'bark';
  if (tri <= 9500) out.push({ name: 'Wood', geo: mergeGeometries(wood), color: S.bark, material: 'Wood', keepUV: true, bark: tex });
  else {
    const half = Math.ceil(wood.length / 2);
    out.push({ name: 'WoodA', geo: mergeGeometries(wood.slice(0, half)), color: S.bark, material: 'Wood', keepUV: true, bark: tex });
    out.push({ name: 'WoodB', geo: mergeGeometries(wood.slice(half)), color: S.bark, material: 'Wood', keepUV: true, bark: tex });
  }
  // 잎은 메시 대신 '잎 뭉치 자리'만 적어 둔다. 맵에서는 그 자리에 잎 그림을 붙인 판(LeafG/LeafZ/LeafP)을 놓는다
  const spots = [];
  tips.forEach((b) => {
    const n = b.pts.length, k = S.spotsPerTip || 2;
    for (let q = 0; q < k; q++) {
      const t = k === 1 ? 0.85 : 0.45 + 0.5 * (q / (k - 1));
      const i = Math.min(n - 2, Math.floor(t * (n - 1))), f = t * (n - 1) - i;
      const p = b.pts[i].clone().lerp(b.pts[i + 1], f);
      if (S.keep && !S.keep(p)) continue;
      spots.push([+p.x.toFixed(2), +(p.y + S.spotLift).toFixed(2), +p.z.toFixed(2), +(S.spotSize * (0.8 + rng() * 0.4)).toFixed(2)]);
    }
  });
  // 판 수를 줄이려고 자리를 고르게 솎아 낸다 (빈틈이 생기지 않게 남는 판은 조금 키움)
  const max = S.maxSpots || 40;
  let picked = spots;
  if (spots.length > max) {
    const grow2 = Math.sqrt(spots.length / max) * 0.8;
    picked = [];
    for (let q = 0; q < max; q++) { const sp = spots[Math.floor((q * spots.length) / max)]; picked.push([sp[0], sp[1], sp[2], +(sp[3] * Math.max(1, grow2)).toFixed(2)]); }
  }
  return { name, keep: ['Trunk'], show: ['LeafG', 'LeafZ', 'LeafP'], leafSpots: picked, meshes: out };
}

// ── 은행나무: 곧은 줄기가 꼭대기까지, 가지는 비스듬히 위로, 원뿔꼴 수관 ──
function ginkgo(rng) {
  const H = 26, crownR = (y) => Math.max(1.2, 7.2 * Math.min(1, (H - y) / (H * 0.55)) * (y < H * 0.3 ? 0.4 : 1));
  return finish('Tree_Ginkgo', rng, {
    H, trunkLen: 0.97, trunkR: 0.62, trunkTaper: 0.12, trunkWiggle: 0.05, lean: 0.03,
    bark: [106, 94, 82], leafColors: [[230, 188, 38], [216, 162, 24], [238, 206, 84], [196, 172, 58]],
    leafCount: 7000, leafSize: 0.46, leafW: 1.05, leafSpread: 1.35, leafFlat: 0.8, spotSize: 3.4, spotLift: 0.6, spotsPerTip: 1, maxSpots: 44,
    levels: [
      { count: () => 26, at: (c, n, r) => 0.3 + 0.64 * (c / n) + (r() - 0.5) * 0.02, elev: 0.95, sides: 6, r0: 0.3, r1: 0.06, wiggle: 0.18, up: 0.05, segLen: 1.3,
        len: (b, r) => crownR(b.y) * (1.05 + 0.25 * r()) },
      { count: (p) => 3 + Math.round(p.pts.length / 2), at: (c, n, r) => 0.25 + 0.7 * (c / n) + r() * 0.05, elev: 0.75, sides: 4, r0: 0.09, r1: 0.025, wiggle: 0.3, up: 0.04, segLen: 0.9,
        len: (b, r) => 1.4 + r() * 1.6 },
      { count: () => 2, at: (c, n, r) => 0.5 + r() * 0.45, elev: 0.7, sides: 3, r0: 0.035, r1: 0.015, wiggle: 0.4, up: 0.03, segLen: 0.7,
        len: (b, r) => 0.7 + r() * 0.8 },
    ],
  });
}

// ── 느티나무: 낮게 갈라진 굵은 가지들이 꽃병처럼 퍼진 넓은 수관 ──
function zelkova(rng) {
  const H = 26;
  return finish('Tree_Zelkova', rng, {
    H, trunkLen: 0.33, trunkR: 0.85, trunkTaper: 0.75, trunkWiggle: 0.06, lean: 0.04,
    bark: [118, 106, 94], leafColors: [[178, 98, 40], [152, 82, 36], [196, 132, 56], [132, 96, 50]],
    leafCount: 7500, leafSize: 0.4, leafW: 0.75, leafSpread: 1.25, leafFlat: 0.85, spotSize: 4.8, spotLift: 0.6, spotsPerTip: 1, maxSpots: 40,
    keep: (c) => c.y > 6.5,
    levels: [
      { count: () => 6, at: (c, n, r) => 0.9 + r() * 0.1, sides: 7, r0: 0.55, r1: 0.18, wiggle: 0.12, up: 0.02, segLen: 1.4,
        dir: (pd, az, b, r) => spread(UP, 0.5 + r() * 0.25, az), len: (b, r) => 9 + r() * 4 },
      { count: () => 4, at: (c, n, r) => 0.35 + 0.6 * (c / n) + r() * 0.05, elev: 0.6, sides: 5, r0: 0.16, r1: 0.05, wiggle: 0.22, up: 0.03, segLen: 1.2,
        len: (b, r) => 4 + r() * 3 },
      { count: () => 4, at: (c, n, r) => 0.3 + 0.65 * (c / n), elev: 0.7, sides: 3, r0: 0.05, r1: 0.02, wiggle: 0.35, up: 0.02, segLen: 0.9,
        len: (b, r) => 1.6 + r() * 1.6 },
    ],
  });
}

// ── 소나무: 살짝 굽은 붉은 줄기, 위쪽에 수평으로 뻗은 가지 끝마다 솔잎 덩어리 ──
function pine(rng) {
  const H = 28;
  return finish('Tree_Pine', rng, {
    H, trunkLen: 0.95, trunkR: 0.7, trunkTaper: 0.18, trunkWiggle: 0.12, lean: 0.12,
    bark: [122, 84, 62], leafColors: [[44, 72, 46], [36, 60, 40], [58, 86, 54]],
    leafCount: 6500, leafSize: 0.55, leafW: 0.22, leafSpread: 1.2, leafFlat: 0.45, spotSize: 4.2, spotLift: 0.5, spotsPerTip: 2, barkTex: 'pinebark', maxSpots: 36,
    levels: [
      { count: () => 16, at: (c, n, r) => 0.45 + 0.5 * (c / n) + (r() - 0.5) * 0.03, sides: 5, r0: 0.24, r1: 0.06, wiggle: 0.2, up: 0.06, segLen: 1.3,
        dir: (pd, az, b, r) => spread(UP, 1.25 - (b.y / H) * 0.5 + (r() - 0.5) * 0.2, az), len: (b, r) => Math.max(1.5, (H - b.y) * 0.42) * (0.8 + r() * 0.4) },
      { count: () => 3, at: (c, n, r) => 0.45 + 0.5 * (c / n), elev: 0.6, sides: 3, r0: 0.06, r1: 0.025, wiggle: 0.3, up: 0.08, segLen: 0.9, leafy: false,
        len: (b, r) => 1.2 + r() * 1.4 },
    ],
  });
}

export function buildTrees(rng) {
  return [ginkgo(rng), zelkova(rng), pine(rng)];
}
