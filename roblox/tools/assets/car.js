// 2010년대 국산 중형 세단 (K5·SM5·그랜저 HG 느낌) 메시.
// 기준점 = 차 가운데 바닥(타이어 밑), 앞 = -Z, 길이 15 stud(약 4.8 m), 폭 6.
// 색이 다른 부분마다 메시를 나눈다(MeshPart 하나 = 색 하나): 차체, 유리, 지붕, 타이어, 휠, 바퀴집, 범퍼 아래 검은 부분.
// 전조등·후미등·번호판·실내는 generate.js 의 파트를 그대로 보여 준다(Templates 의 show).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lerp = (a, b, t) => a + (b - a) * t;
// 점 목록 [[z, v], ...] 을 매끄럽게 잇는 함수 (구간마다 smoothstep)
function curve(pts) {
  return (z) => {
    if (z <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (z <= pts[i][0]) {
        const [z0, v0] = pts[i - 1], [z1, v1] = pts[i];
        const t = (z - z0) / (z1 - z0), s = t * t * (3 - 2 * t);
        return lerp(v0, v1, s);
      }
    }
    return pts[pts.length - 1][1];
  };
}
// 링(단면 점 목록)들을 이어 면을 만든다. 양 끝은 가운데 점으로 막는다.
function loft(rings) {
  const pos = [], idx = [], n = rings[0].pts.length;
  rings.forEach((r) => r.pts.forEach(([x, y]) => pos.push(x, y, r.z)));
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < n; k++) {
    const a = i * n + k, b = i * n + ((k + 1) % n), c = (i + 1) * n + k, d = (i + 1) * n + ((k + 1) % n);
    idx.push(a, c, b, b, c, d);
  }
  [[0, false], [rings.length - 1, true]].forEach(([ri, flip]) => {
    const r = rings[ri], cx = r.pts.reduce((s, p) => s + p[0], 0) / n, cy = r.pts.reduce((s, p) => s + p[1], 0) / n;
    const ci = pos.length / 3;
    pos.push(cx, cy, r.z);
    for (let k = 0; k < n; k++) { const a = ri * n + k, b = ri * n + ((k + 1) % n); flip ? idx.push(ci, a, b) : idx.push(ci, b, a); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// 둥근 네모(초타원) 단면: 가운데 x=0, 아래 yb, 위 yt, 반폭 w. top: 위로 갈수록 좁아지는 비율(텀블홈)
function section(w, yb, yt, m = 24, ex = 4, top = 0.06) {
  const pts = [], yc = (yb + yt) / 2, h = (yt - yb) / 2;
  for (let k = 0; k < m; k++) {
    const a = (k / m) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const yn = Math.sign(s) * Math.abs(s) ** (2 / ex);
    const xw = w * (1 - top * Math.max(0, yn));
    pts.push([xw * Math.sign(c) * Math.abs(c) ** (2 / ex), yc + h * yn]);
  }
  return pts;
}

// 여러 도형을 하나로 (uv 는 버리고 법선만)
const ni = (gs) => mergeGeometries(gs.map((g) => { const h = g.index ? g.toNonIndexed() : g.clone(); ['uv', 'uv1', 'uv2'].forEach((k) => h.deleteAttribute(k)); if (!h.attributes.normal) h.computeVertexNormals(); return h; }));

export function buildCar() {
  const paint = [196, 200, 204];
  // ── 차체: 옆에서 본 윗선(보닛 → 어깨 → 트렁크)과 아랫선, 위에서 본 폭 ──
  const top = curve([[-7.5, 2.0], [-7.1, 2.42], [-6.2, 2.62], [-2.8, 3.0], [4.8, 3.05], [5.6, 3.12], [7.0, 3.12], [7.5, 2.7]]);
  const bot = curve([[-7.5, 1.15], [-6.9, 0.8], [6.9, 0.8], [7.5, 1.2]]);
  const half = (z) => 2.98 - 0.32 * Math.abs(z / 7.5) ** 4;
  const rings = [];
  for (let i = 0; i <= 64; i++) {
    const z = -7.5 + (15 * i) / 64;
    // 앞뒤 끝은 위에서 봐도 둥글게 오므라든다
    const e = Math.max(0, (Math.abs(z) - 6.9) / 0.6), sq = Math.sqrt(Math.max(0.05, 1 - e * e));
    const yb = bot(z), yt = top(z), yc = (yb + yt) / 2;
    rings.push({ z, pts: section(half(z) * sq, yc - ((yc - yb) * (0.6 + 0.4 * sq)), yc + (yt - yc) * (0.75 + 0.25 * sq), 28, 5, 0.05) });
  }
  const body = loft(rings);

  // ── 유리 온실: 길게 누운 앞유리 → 둥근 지붕 → 흘러내리는 뒷유리 ──
  const roof = curve([[-2.9, 3.02], [0.4, 4.92], [3.2, 5.0], [5.7, 3.1]]);
  const gw = curve([[-2.9, 2.62], [0.4, 2.52], [3.2, 2.5], [5.7, 2.6]]);
  const grings = [];
  for (let i = 0; i <= 40; i++) {
    const z = -2.9 + (8.6 * i) / 40, yt = roof(z), yb = 2.92, w = gw(z);
    const pts = [];
    // 아래 두 점 + 위 반원(텀블홈으로 위가 좁다)
    pts.push([-w, yb], [w, yb]);
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI, c = Math.cos(a), s = Math.sin(a);
      const wt = w * 0.86;
      pts.push([wt * Math.sign(c) * Math.abs(c) ** 0.4, yb + (yt - yb) * (0.15 + 0.85 * Math.abs(s) ** 0.35)]);
    }
    grings.push({ z, pts: pts.reverse() }); // 바깥에서 보이게 감는 방향을 뒤집는다
  }
  const glass = loft(grings);
  // 지붕 판 (유리 위를 덮는 차체색 판): 앞유리 위끝 ~ 뒷유리 위끝
  const rr = [];
  for (let i = 0; i <= 20; i++) {
    const z = 0.3 + (3.3 * i) / 20, yt = roof(z) + 0.05, w = gw(z) * 0.82;
    const pts = [];
    for (let k = 0; k <= 12; k++) { const u = -1 + (2 * k) / 12; pts.push([u * w, yt - 0.12 * u * u * u * u]); }
    for (let k = 12; k >= 0; k--) { const u = -1 + (2 * k) / 12; pts.push([u * w, yt - 0.12 * u * u * u * u - 0.08]); }
    rr.push({ z, pts });
  }
  const roofPanel = loft(rr);
  // 차체색 기둥(A·C 필러)과 창 아래 띠
  const pill = [];
  [-1, 1].forEach((sx) => {
    const seg = (z0, z1, w = 0.24) => {
      const a = new THREE.Vector3(sx * gw(z0) * 0.9, roof(z0) - 0.05, z0), b = new THREE.Vector3(sx * gw(z1) * 0.98, 3.0, z1);
      const len = a.distanceTo(b);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
      const g = new THREE.BoxGeometry(0.16, len, w);
      g.applyQuaternion(q);
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      return g;
    };
    pill.push(seg(0.35, -2.75), seg(3.3, 5.5, 0.6));
    const bp = new THREE.BoxGeometry(0.12, 1.85, 0.28); bp.translate(sx * 2.43, 3.95, 1.6); pill.push(bp);
  });
  const pillars = ni(pill);

  // ── 바퀴: 타이어(둥근 옆면), 5스포크 휠, 바퀴집(검은 원) ──
  const tires = [], rims = [], wells = [];
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const wx = sx * 2.6, wz = sz * 4.6;
    const prof = [];
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI; prof.push(new THREE.Vector2(0.86 + 0.29 * Math.cos(a), 0.42 * Math.sin(a))); }
    const t = new THREE.LatheGeometry(prof, 28); t.rotateZ(Math.PI / 2); t.translate(wx, 1.15, wz); tires.push(t);
    const disc = new THREE.CylinderGeometry(0.84, 0.84, 0.2, 28); disc.rotateZ(Math.PI / 2); disc.translate(wx + sx * 0.3, 1.15, wz); rims.push(disc);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.BoxGeometry(0.1, 0.62, 0.2); sp.translate(0, 0.38, 0); sp.rotateX((k * 2 * Math.PI) / 5); sp.translate(wx + sx * 0.42, 1.15, wz); rims.push(sp);
    }
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 12); hub.rotateZ(Math.PI / 2); hub.translate(wx + sx * 0.47, 1.15, wz); rims.push(hub);
    const well = new THREE.CylinderGeometry(1.42, 1.42, 0.08, 28, 1, false, 0, Math.PI); well.rotateZ(Math.PI / 2); well.rotateX(Math.PI / 2); well.translate(sx * 2.93, 1.2, wz); wells.push(well);
  }));
  const rimGeo = ni(rims);
  // 바퀴 안쪽(휠 디스크 뒤)이 어두워 보이게 검은 판
  const inner = []; [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => { const d = new THREE.CylinderGeometry(0.9, 0.9, 0.06, 20); d.rotateZ(Math.PI / 2); d.translate(sx * 2.62, 1.15, sz * 4.6); inner.push(d); }));

  // ── 범퍼 아래 검은 부분, 사이드 스커트, 사이드미러 ──
  const trim = [];
  const box = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); trim.push(g); };
  box(4.6, 0.32, 0.5, 0, 1.0, -7.3); box(4.4, 0.3, 0.4, 0, 1.0, 7.3);
  [-1, 1].forEach((sx) => box(0.12, 0.3, 7.0, sx * 2.92, 0.95, 0));
  const mirrors = [];
  [-1, 1].forEach((sx) => { const m = new THREE.SphereGeometry(0.34, 12, 8); m.scale(1.2, 0.75, 0.75); m.translate(sx * 3.2, 3.35, -1.95); mirrors.push(m); const arm = new THREE.BoxGeometry(0.4, 0.12, 0.2); arm.translate(sx * 2.92, 3.25, -2.0); mirrors.push(arm); });

  return [
    { name: 'Paint', geo: ni([body, ...mirrors]), color: paint, material: 'SmoothPlastic', reflectance: 0.15, collide: false },
    { name: 'Roof', geo: roofPanel, color: paint, material: 'SmoothPlastic', reflectance: 0.15 },
    { name: 'Glass', geo: glass, color: [26, 30, 36], material: 'Glass', reflectance: 0.35, transparency: 0.08 },
    { name: 'Tires', geo: ni(tires), color: [26, 26, 28], material: 'Rubber' },
    { name: 'Wheels', geo: rimGeo, color: [196, 200, 206], material: 'Metal', reflectance: 0.2 },
    { name: 'WheelDark', geo: ni([...wells, ...inner]), color: [14, 14, 16], material: 'SmoothPlastic', shadow: false },
    { name: 'Trim', geo: ni([...trim, pillars]), color: [30, 30, 32], material: 'SmoothPlastic' },
  ];
}
