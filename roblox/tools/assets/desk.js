// 2010년대 한국 고등학교 학생용 책상·의자 (1인용)
// 책상과 의자는 따로 템플릿 (StudentDesk, StudentChair). 학생은 -X(칠판)를 본다.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const boxAt = (sx, sy, sz, x, y, z) => { const g = new THREE.BoxGeometry(sx, sy, sz); g.translate(x, y, z); return g; };
const rbox = (sx, sy, sz, r, x, y, z, seg = 3) => { const g = new RoundedBoxGeometry(sx, sy, sz, seg, r); g.translate(x, y, z); return g; };
function tube(points, radius, tension = 0.05) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', tension);
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6, false);
}
// 모서리를 둥글게 꺾은 경로 (꺾이는 곳마다 점을 두 개 더 넣는다)
function bent(points, r = 0.12) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = new THREE.Vector3(...points[i]), a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i + 1]);
    const da = a.clone().sub(p).normalize().multiplyScalar(r), db = b.clone().sub(p).normalize().multiplyScalar(r);
    out.push(p.clone().add(da).toArray(), p.clone().add(da.clone().add(db).multiplyScalar(0.3)).toArray(), p.clone().add(db).toArray());
  }
  out.push(points[points.length - 1]);
  return out;
}
const merge = (list) => {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  geos.forEach((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); });
  return mergeGeometries(geos);
};

// 책상: 기준점 = 책상 가운데 바닥. 학생은 +X 쪽에 앉는다 (generate.js studentDesk 와 같은 치수)
export function buildDesk() {
  const top = 2.45; // 철제 틀 높이. 상판 윗면 ≈ 2.57 (약 77 cm)
  const out = [];
  out.push({ name: 'DeskTop', geo: rbox(1.54, 0.04, 2.28, 0.015, 0, top + 0.1, 0), color: [192, 166, 126], material: 'Wood' });
  out.push({ name: 'DeskBand', geo: rbox(1.58, 0.1, 2.32, 0.035, 0, top + 0.05, 0), color: [98, 76, 56], material: 'SmoothPlastic' });
  const T = 0.075, fr = [];
  [[-0.66, -1.04], [0.62, -1.04], [-0.66, 1.04], [0.62, 1.04]].forEach(([x, z]) => fr.push(boxAt(T, top - 0.04, T, x, (top - 0.04) / 2 + 0.03, z)));
  [-1.04, 1.04].forEach((z) => {
    fr.push(boxAt(1.28 + T, T, T, -0.02, 0.34, z));
    fr.push(boxAt(1.28 + T, T, T, -0.02, top - 0.05, z));
  });
  fr.push(boxAt(T, T, 2.08, -0.66, top - 0.05, 0));
  fr.push(boxAt(T, T, 2.0, -0.66, 0.89, 0));
  fr.push(boxAt(1.2, 0.03, 2.0, -0.04, top - 0.535, 0));
  fr.push(boxAt(0.03, 0.5, 2.0, -0.635, top - 0.3, 0));
  [-1.0, 1.0].forEach((z) => fr.push(boxAt(1.2, 0.42, 0.03, -0.04, top - 0.34, z)));
  out.push({ name: 'DeskFrame', geo: merge(fr), color: [166, 170, 176], material: 'Metal' });
  const feet = [];
  [[-0.66, -1.04], [0.62, -1.04], [-0.66, 1.04], [0.62, 1.04]].forEach(([x, z]) => feet.push(boxAt(T + 0.03, 0.06, T + 0.03, x, 0.03, z)));
  out.push({ name: 'DeskFeet', geo: merge(feet), color: [26, 26, 28], material: 'Rubber' });
  return out;
}

// 의자: 기준점 = 좌판 가운데 바닥, 등받이는 +X (generate.js studentChair 와 같은 치수)
export function buildChair() {
  const seatY = 1.545, out = [];
  out.push({ name: 'Seat', geo: rbox(1.36, 0.09, 1.38, 0.04, 0, seatY, 0, 2), color: [178, 140, 96], material: 'Wood' });
  const back = new THREE.BoxGeometry(0.07, 0.72, 1.3, 1, 4, 12);
  const pos = back.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    pos.setX(i, pos.getX(i) - 0.11 * (z / 0.65) * (z / 0.65));
  }
  back.computeVertexNormals();
  back.rotateZ(-0.14);
  back.translate(0.74, seatY + 1.04, 0);
  out.push({ name: 'Backrest', geo: back, color: [178, 140, 96], material: 'Wood' });
  const cf = [];
  [-1, 1].forEach((s) => {
    const z = s * 0.6;
    cf.push(tube(bent([[-0.6, 0.06, z], [-0.6, seatY - 0.06, z], [0.58, seatY - 0.06, z], [0.62, 0.06, z]], 0.14), 0.045));
    cf.push(tube(bent([[0.55, seatY - 0.06, z * 0.92], [0.7, seatY + 0.6, z * 0.92], [0.76, seatY + 1.38, z * 0.92]], 0.2), 0.04));
  });
  cf.push(tube([[-0.6, 0.55, -0.6], [-0.6, 0.55, 0.6]], 0.035, 0));
  cf.push(tube([[0.61, 0.55, -0.6], [0.61, 0.55, 0.6]], 0.035, 0));
  out.push({ name: 'ChairFrame', geo: merge(cf), color: [150, 154, 160], material: 'Metal' });
  const cfeet = [];
  [[-0.6, -0.6], [-0.6, 0.6], [0.62, -0.6], [0.62, 0.6]].forEach(([x, z]) => {
    const g = new THREE.CylinderGeometry(0.06, 0.065, 0.08, 10); g.translate(x, 0.04, z); cfeet.push(g);
  });
  out.push({ name: 'ChairFeet', geo: merge(cfeet), color: [26, 26, 28], material: 'Rubber' });
  return out;
}
