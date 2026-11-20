// 출근 차량 SUV 실내 (2010년대 중형 SUV 느낌): 검정·베이지 투톤
//   대시보드(검은 윗면 + 베이지 아랫면, 운전석 계기판 덮개, 가운데 송풍구·화면·공조 다이얼), 센터 콘솔(기어봉·컵홀더·팔걸이),
//   운전대(3스포크 + 에어백 패드), 앞 버킷 시트 2개 + 뒤 3인 벤치(옆구리·허리 볼스터, 머리받침 + 크롬 기둥),
//   문 안쪽 판(팔걸이·손잡이·창문 스위치·스피커·도어 포켓), 필러 트림, 베이지 천장(손잡이·햇빛 가리개·룸미러), 안전벨트, 바닥 매트.
// 좌표: suv.js 와 같음 (기준점 = 차 가운데 바닥, 앞 = -Z, 운전석 = -X). 방석 윗면 1.85, 천장 안쪽 약 5.05.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { box, ellipsoid, roundCone, unionS, union, inter, sub, halfspace, rotX, mesh } from './sdf.js';

const clean = (g) => { const h = g.index ? g.toNonIndexed() : g.clone(); ['uv', 'uv1', 'uv2'].forEach((k) => h.deleteAttribute(k)); if (!h.attributes.normal) h.computeVertexNormals(); return h; };
const ni = (gs) => mergeGeometries(gs.filter(Boolean).map(clean));
// SDF → 메시 (삼각형 수가 budget 을 넘으면 격자를 키운다)
function sdfMesh(f, bmin, bmax, cell, budget = 9000) {
  let c = cell, g;
  for (let t = 0; t < 8; t++) { g = mesh(f, bmin, bmax, c, { smooth: 2 }); if (g.index.count / 3 <= budget) break; c *= 1.15; }
  return g;
}
const capsuleX = (x0, x1, y, z, r) => roundCone([x0, y, z], [x1, y, z], r, r);

// ── 좌석 ──
// 앞 버킷 시트: 방석(옆 볼스터) + 등받이(뒤로 14° 눕힘, 옆·어깨 볼스터, 허리 받침) + 머리받침
function bucketSeat(x, z) {
  const w = 0.82;
  const cushion = unionS(0.12,
    box([x, 1.62, z - 0.05], [w - 0.06, 0.2, 0.82], 0.16),
    roundCone([x - w + 0.14, 1.8, z - 0.75], [x - w + 0.14, 1.84, z + 0.7], 0.15, 0.17),
    roundCone([x + w - 0.14, 1.8, z - 0.75], [x + w - 0.14, 1.84, z + 0.7], 0.15, 0.17));
  const seatDip = sub(cushion, ellipsoid([x, 1.96, z + 0.05], [0.5, 0.16, 0.62]));
  const P = [x, 1.85, z + 0.85];
  const back = rotX(unionS(0.14,
    box([x, 3.0, z + 0.92], [w - 0.1, 1.1, 0.2], 0.18),
    roundCone([x - w + 0.16, 2.0, z + 0.8], [x - w + 0.18, 3.85, z + 0.86], 0.19, 0.16),
    roundCone([x + w - 0.16, 2.0, z + 0.8], [x + w - 0.18, 3.85, z + 0.86], 0.19, 0.16),
    ellipsoid([x, 2.45, z + 0.74], [0.52, 0.32, 0.14])), P, -0.24);
  const head = rotX(box([x, 4.42, z + 1.0], [0.42, 0.26, 0.13], 0.12), P, -0.24);
  return { leather: unionS(0.05, seatDip, back), head };
}
// 뒤 3인 벤치: 자리마다 살짝 꺼진 방석 + 한 장 등받이(자리 경계 홈) + 머리받침 3개
function rearBench(z) {
  const W = 1.92;
  let cushion = box([0, 1.62, z - 0.05], [W, 0.2, 0.82], 0.16);
  [-1.28, 0, 1.28].forEach((x) => { cushion = sub(cushion, ellipsoid([x, 1.95, z + 0.05], [0.5, 0.14, 0.6])); });
  const P = [0, 1.85, z + 0.85];
  let back = unionS(0.12, box([0, 2.95, z + 0.92], [W - 0.05, 1.05, 0.22], 0.18),
    roundCone([-W + 0.12, 2.0, z + 0.82], [-W + 0.14, 3.8, z + 0.86], 0.17, 0.15),
    roundCone([W - 0.12, 2.0, z + 0.82], [W - 0.14, 3.8, z + 0.86], 0.17, 0.15));
  [-0.64, 0.64].forEach((x) => { back = sub(back, box([x, 2.95, z + 0.7], [0.03, 1.0, 0.06], 0.02)); });
  back = rotX(back, P, -0.2);
  const heads = [-1.28, 0, 1.28].map((x) => rotX(box([x, 4.3, z + 1.0], [0.36, 0.22, 0.12], 0.1), P, -0.2));
  return { leather: unionS(0.05, cushion, back), heads, P };
}

export function buildSuvInterior() {
  const out = [];
  const add = (name, geo, color, material, extra = {}) => out.push({ name, geo, color, material, shadow: false, ...extra });
  const BEIGE = [188, 174, 150], BEIGE_L = [206, 196, 178], BLACK = [34, 34, 36], DARK = [22, 22, 24], CHROME = [196, 200, 204];

  // ── 좌석 (베이지 가죽) ──
  const fl = bucketSeat(-1.35, 0.35), fr = bucketSeat(1.35, 0.35), rb = rearBench(3.25);
  add('SeatFrontL', sdfMesh(fl.leather, [-2.3, 1.3, -0.6], [-0.4, 4.2, 1.9], 0.055, 8500), BEIGE, 'Leather');
  add('SeatFrontR', sdfMesh(fr.leather, [0.4, 1.3, -0.6], [2.3, 4.2, 1.9], 0.055, 8500), BEIGE, 'Leather');
  add('SeatRear', sdfMesh(rb.leather, [-2.5, 1.3, 2.3], [2.5, 4.1, 4.9], 0.06, 12000), BEIGE, 'Leather');
  add('Headrests', sdfMesh(union(fl.head, fr.head, ...rb.heads), [-2.0, 3.9, 0.6], [2.0, 4.9, 4.9], 0.045, 6000), BEIGE, 'Leather');
  // 머리받침 크롬 기둥 + 좌석 밑 레일 (검정)
  const posts = [], rails = [];
  const postAt = (x, yTop, zTop, lean) => [-0.2, 0.2].forEach((dx) => {
    const c = new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8);
    c.translate(0, -0.21, 0); c.rotateX(lean); c.translate(x + dx, yTop, zTop); posts.push(c);
  });
  // 앞좌석: 등받이 위끝 ≈ (y 4.03, z 1.68), 머리받침 아래 ≈ (4.16, 1.73)
  [-1.35, 1.35].forEach((x) => { postAt(x, 4.22, 1.66, -0.24); const r = new THREE.BoxGeometry(1.4, 0.2, 1.7); r.translate(x, 1.34, 0.3); rails.push(r); });
  [-1.28, 0, 1.28].forEach((x) => postAt(x, 4.1, 4.55, -0.2));
  add('SeatPosts', ni(posts), CHROME, 'Metal', { reflectance: 0.3 });
  // 앞좌석 등판 뒷면: 검은 플라스틱 판 + 지도 주머니 (뒷자리에서 보이는 면)
  const backShell = union(...[-1.35, 1.35].map((x) => rotX(unionS(0.06,
    box([x, 2.95, 0.35 + 1.16], [0.7, 1.0, 0.05], 0.05),
    box([x, 2.35, 0.35 + 1.22], [0.6, 0.35, 0.05], 0.04)), [x, 1.85, 0.35 + 0.85], -0.24)));
  add('SeatBackShell', sdfMesh(backShell, [-2.2, 1.6, 1.2], [2.2, 4.2, 2.6], 0.045, 5000), [40, 38, 36], 'SmoothPlastic');

  // ── 대시보드 ──
  // 앞유리 면 (아래 z -2.6 / y 3.4 → 위 z -0.2 / y 5.2) 밑으로만
  const underGlass = (x, y, z) => y - (3.4 + 0.75 * (z + 2.6) - 0.06);
  const dashTop = inter(unionS(0.25,
    box([0, 3.05, -2.15], [2.6, 0.32, 0.55], 0.28),
    capsuleX(-2.45, 2.45, 3.22, -1.62, 0.2),                       // 운전자 쪽으로 둥글게 말린 앞 끝
    ellipsoid([-1.35, 3.42, -1.75], [0.78, 0.3, 0.48])),          // 계기판 덮개
    underGlass);
  const gaugeHole = ellipsoid([-1.35, 3.25, -1.36], [0.62, 0.22, 0.22]);
  // 송풍구 4개 (가운데 2 + 양 끝 2): 네모난 홈
  const vents = union(...[-2.15, -0.42, 0.42, 2.15].map((x) => box([x, 3.08, -1.42], [x === 0 ? 0.2 : 0.24, 0.1, 0.12], 0.04)));
  add('DashTop', sdfMesh(sub(sub(dashTop, gaugeHole), vents), [-2.75, 2.6, -2.75], [2.75, 3.85, -1.2], 0.05, 11000), BLACK, 'SmoothPlastic');
  // 아래 대시 (베이지) + 가운데 센터페시아 (검은 판, 아래로 콘솔과 이어짐)
  const dashLow = unionS(0.2,
    box([0, 2.45, -1.95], [2.58, 0.36, 0.42], 0.22),
    box([0, 2.1, -1.75], [0.62, 0.55, 0.3], 0.15));
  const glove = box([1.35, 2.5, -1.52], [0.65, 0.22, 0.05], 0.03);
  add('DashLow', sdfMesh(sub(dashLow, glove), [-2.7, 1.5, -2.5], [2.7, 2.95, -1.4], 0.06, 8000), BEIGE, 'SmoothPlastic');
  const stack = inter(rotX(box([0, 2.55, -1.42], [0.5, 0.62, 0.12], 0.08), [0, 2.55, -1.42], 0.28), underGlass);
  add('CenterStack', sdfMesh(stack, [-0.7, 1.7, -1.8], [0.7, 3.3, -1.05], 0.04, 5000), DARK, 'SmoothPlastic', { reflectance: 0.1 });

  // ── 작은 부품 (three.js 도형): 계기판 링, 송풍구 크롬, 공조 다이얼, 기어봉, 운전대, 룸미러, 햇빛 가리개, 손잡이, 안전벨트 ──
  const chrome = [], dark = [], beigeSmall = [], belt = [];
  [-1.72, -0.98].forEach((x) => { const r = new THREE.TorusGeometry(0.2, 0.025, 6, 24); r.rotateX(-0.12); r.translate(x, 3.27, -1.33); chrome.push(r); });
  [-2.15, -0.42, 0.42, 2.15].forEach((x) => { const r = new THREE.BoxGeometry(0.52, 0.24, 0.02); r.translate(x, 3.08, -1.29); const inner = new THREE.BoxGeometry(0.46, 0.18, 0.03); inner.translate(x, 3.08, -1.28);
    chrome.push(r); for (let k = 0; k < 4; k++) { const s = new THREE.BoxGeometry(0.44, 0.02, 0.06); s.translate(x, 3.01 + k * 0.045, -1.3); dark.push(s); } });
  [-0.28, 0.28].forEach((x) => { const k = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18); k.rotateX(Math.PI / 2 - 0.28); k.translate(x, 2.32, -1.27); chrome.push(k); });
  for (let k = 0; k < 6; k++) { const b = new THREE.BoxGeometry(0.12, 0.06, 0.03); b.rotateX(-0.28); b.translate(-0.3 + k * 0.12, 2.1, -1.25); dark.push(b); }
  // 운전대: 테 + 3스포크 + 에어백 패드 + 기둥 덮개 (윗부분이 앞으로 25° 기울어짐)
  const wheel = [];
  const WC = [-1.35, 3.0, -0.95], tilt = -0.44;
  const place = (g) => { g.rotateX(tilt); g.translate(...WC); return g; };
  wheel.push(place(new THREE.TorusGeometry(0.64, 0.075, 12, 40)));
  [[0, -0.38], [-0.4, 0.02], [0.4, 0.02]].forEach(([x, y]) => { const s = new THREE.BoxGeometry(x ? 0.5 : 0.18, x ? 0.16 : 0.42, 0.08); s.translate(x * 0.9, y, -0.02); wheel.push(place(s)); });
  const pad = new THREE.CylinderGeometry(0.3, 0.32, 0.18, 24); pad.scale(1.15, 1, 0.9); pad.rotateX(Math.PI / 2); pad.translate(0, -0.03, 0.03); wheel.push(place(pad));
  const shroud = new THREE.CylinderGeometry(0.16, 0.2, 0.8, 14); shroud.rotateX(Math.PI / 2); shroud.translate(0, 0, -0.45); wheel.push(place(shroud));
  const logo = new THREE.SphereGeometry(0.08, 10, 6); logo.scale(1.5, 0.8, 0.3); logo.rotateX(tilt); logo.translate(WC[0], WC[1] - 0.02, WC[2] + 0.14); chrome.push(logo);
  // 기어봉: 주름 부트 + 봉 + 손잡이, 컵홀더 2개, 주차 브레이크 버튼
  const boot = new THREE.CylinderGeometry(0.12, 0.24, 0.22, 14); boot.translate(0, 2.37, -0.75); dark.push(boot);
  const lever = new THREE.CylinderGeometry(0.04, 0.05, 0.42, 8); lever.translate(0, 2.6, -0.75); chrome.push(lever);
  const knob = new THREE.SphereGeometry(0.12, 14, 10); knob.scale(1, 1.25, 1); knob.translate(0, 2.86, -0.75); dark.push(knob);
  // 룸미러 + 햇빛 가리개 2 + 손잡이 + 실내등
  const mirror = new THREE.BoxGeometry(0.9, 0.28, 0.06); mirror.translate(0, 4.72, -1.0); dark.push(mirror);
  const mstem = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6); mstem.translate(0, 4.92, -1.05); dark.push(mstem);
  [-1.25, 1.25].forEach((x) => { const v = new THREE.BoxGeometry(1.35, 0.06, 0.6); v.rotateX(0.12); v.translate(x, 4.92, -1.0); beigeSmall.push(v); });
  [[-2.3, 0.0], [2.3, 0.0], [-2.3, 3.0], [2.3, 3.0]].forEach(([x, z]) => { const h = new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI); h.rotateY(Math.PI / 2); h.rotateX(Math.PI); h.translate(x, 4.82, z); beigeSmall.push(h); });
  // 안전벨트: B·C 필러에서 늘어진 검은 띠 + 버클
  [[-2.48, 1.0], [2.48, 1.0], [-2.44, 4.1], [2.44, 4.1]].forEach(([x, z]) => {
    const b = new THREE.BoxGeometry(0.03, 2.4, 0.18); b.translate(x, 3.2, z); belt.push(b);
    const anc = new THREE.BoxGeometry(0.06, 0.22, 0.24); anc.translate(x, 4.4, z); chrome.push(anc);
  });
  [-0.55, 0.55].forEach((x) => { const bk = new THREE.BoxGeometry(0.1, 0.3, 0.14); bk.translate(x, 2.05, 1.05); dark.push(bk); });

  // ── 센터 콘솔 (검정) + 팔걸이 덮개 (베이지 가죽) + 컵홀더 ──
  let console_ = unionS(0.1, box([0, 1.8, -0.15], [0.42, 0.52, 1.45], 0.14), box([0, 1.95, -1.15], [0.55, 0.42, 0.3], 0.12));
  [-0.18, 0.18].forEach((x) => { console_ = sub(console_, roundCone([x, 2.0, -0.25], [x, 2.6, -0.25], 0.13, 0.13)); });
  add('Console', sdfMesh(console_, [-0.75, 1.2, -1.6], [0.75, 2.5, 1.4], 0.05, 6000), BLACK, 'SmoothPlastic');
  add('ArmLid', sdfMesh(box([0, 2.38, 0.85], [0.42, 0.1, 0.5], 0.09), [-0.6, 2.2, 0.25], [0.6, 2.6, 1.45], 0.04, 2000), BEIGE, 'Leather');

  // ── 문 안쪽 판 4장: 검은 아랫부분 + 베이지 가운데 판 + 팔걸이 + 손잡이 홈 + 창문 스위치 + 스피커 + 포켓 ──
  const doorL = [], doorB = [];
  [-1, 1].forEach((sx) => {
    [[-2.35, 0.7, true], [0.85, 3.85, false]].forEach(([za, zb, front]) => {
      const xi = sx * 2.6, zc = (za + zb) / 2, hz = (zb - za) / 2 - 0.04;
      const base = unionS(0.08,
        box([xi, 2.45, zc], [0.1, 1.05, hz], 0.06),
        roundCone([xi - sx * 0.14, 2.62, za + 0.35], [xi - sx * 0.14, 2.62, zb - 0.3], 0.13, 0.13),     // 팔걸이
        box([xi - sx * 0.08, 1.65, zc], [0.12, 0.2, hz - 0.15], 0.05));                                     // 도어 포켓 턱
      const pullCut = box([xi - sx * 0.16, 2.78, zc + (front ? 0.15 : -0.1)], [0.08, 0.06, 0.45], 0.04);
      const speaker = roundCone([xi - sx * 0.02, 1.95, za + 0.55], [xi - sx * 0.2, 1.95, za + 0.55], 0.3, 0.3);
      doorB.push(sdfMesh(sub(sub(base, pullCut), speaker), [xi - 0.45, 1.25, za - 0.1], [xi + 0.25, 3.6, zb + 0.1], 0.05, 3200));
      // 베이지 가운데 판 (팔걸이 위)
      doorL.push(sdfMesh(box([xi - sx * 0.06, 3.1, zc], [0.06, 0.32, hz - 0.12], 0.05), [xi - 0.25, 2.65, za], [xi + 0.15, 3.55, zb], 0.05, 2000));
      const handle = new THREE.BoxGeometry(0.05, 0.1, 0.32); handle.translate(xi - sx * 0.12, 3.05, za + 0.45); chrome.push(handle);
      const grill = new THREE.CylinderGeometry(0.27, 0.27, 0.02, 20); grill.rotateZ(Math.PI / 2); grill.translate(xi - sx * 0.11, 1.95, za + 0.55); dark.push(grill);
      if (front) { const sw = new THREE.BoxGeometry(0.2, 0.08, 0.5); sw.translate(xi - sx * 0.2, 2.78, za + 0.9); dark.push(sw); }
    });
    // 트렁크 옆판, 필러 트림 (A: 앞유리 옆, B, C)
    doorB.push(sdfMesh(box([sx * 2.6, 2.6, 5.5], [0.1, 1.05, 1.25], 0.06), [sx * 2.6 - 0.25, 1.4, 4.1], [sx * 2.6 + 0.25, 3.8, 6.9], 0.06, 1500));
  });
  add('DoorTrimDark', ni(doorB), BLACK, 'SmoothPlastic');
  add('DoorTrimBeige', ni(doorL), BEIGE_L, 'Leather');
  const pillars = [];
  [-1, 1].forEach((sx) => {
    pillars.push(box([sx * 2.47, 3.95, 0.8], [0.1, 0.6, 0.26], 0.08));                          // B
    pillars.push(box([sx * 2.45, 3.95, 3.98], [0.1, 0.6, 0.22], 0.08));                         // C
  });
  const headliner = inter(box([0, 5.08, 2.0], [2.42, 0.07, 4.55], 0.06), (x, y, z) => -(z + 0.6)); // 앞유리 위쪽(z > -0.6)부터
  add('Headliner', sdfMesh(union(headliner, ...pillars), [-2.7, 3.2, -2.7], [2.7, 5.3, 6.7], 0.07, 9000), BEIGE_L, 'Fabric');
  add('InteriorSmall', ni([...dark, ...wheel.slice(1)]), DARK, 'SmoothPlastic');
  add('SteeringRim', ni([wheel[0]]), [26, 24, 22], 'Leather');
  add('InteriorChrome', ni(chrome), CHROME, 'Metal', { reflectance: 0.3 });
  add('VisorsHandles', ni(beigeSmall), BEIGE_L, 'SmoothPlastic');
  add('Belts', ni(belt), [20, 20, 22], 'Fabric');
  // 바닥: 카펫 + 앞뒤 고무 매트 + 좌석 레일
  const floor = [];
  const carpet = new THREE.BoxGeometry(5.0, 0.1, 9.4); carpet.translate(0, 1.3, 1.55); floor.push(carpet);
  [[-1.35, -1.0], [1.35, -1.0], [-1.4, 2.1], [1.4, 2.1]].forEach(([x, z]) => { const m = new THREE.BoxGeometry(1.5, 0.04, 1.4); m.translate(x, 1.37, z); floor.push(m); });
  add('Floor', ni([...floor, ...rails]), [28, 28, 30], 'Carpet');
  return out;
}
