// 마이세카이 월드: 맵 만들기 + 충돌 + 시간대(하늘·빛) + 정적 메쉬 합치기
import * as THREE from 'three';
import { mergeGeometries } from './lib/jsm/utils/BufferGeometryUtils.js';

export function buildWorld(sc, opt = {}) {
const NIGHT = false;
const DYN = [], LAMPS = [], COLS = [], TREES = [], ROCKS = [];
let FIRE = null;
// 원래 맵의 점조명은 위치만 기억 (밤에 가까운 몇 개만 실제 빛으로 켬 → 폰·아이패드도 가볍게)
const PL = (color, power) => { const o = new THREE.Object3D(); o.userData.lamp = { color, power }; LAMPS.push(o); return o; };
// 충돌: 원 [x, z, r] / 회전 상자 {x, z, hw, hd, ry}
const hit = (x, z, r) => COLS.push({ t: 'c', x, z, r });
const box = (x, z, hw, hd, ry = 0) => COLS.push({ t: 'b', x, z, hw, hd, ry });
const ell = (x, z, rx, rz) => COLS.push({ t: 'e', x, z, rx, rz });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o });
const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.s) m.scale.set(...o.s); (o.p || sc).add(m); return m; };
function rbox(w, h, d, rad = .12) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + rad, y); s.lineTo(x + w - rad, y); s.quadraticCurveTo(x + w, y, x + w, y + rad); s.lineTo(x + w, y + h - rad); s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h); s.lineTo(x + rad, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rad); s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, d - rad * 2), bevelEnabled: true, bevelSize: rad, bevelThickness: rad, bevelSegments: 4, curveSegments: 6 }); g.translate(0, 0, -(d - rad * 2) / 2); return g; }
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const blob = (r0, det = 2) => { const g = new THREE.IcosahedronGeometry(r0, det), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + .07 * Math.sin(v.x * 5.1 + v.y * 3.3) + .05 * Math.cos(v.z * 4.7 - v.y * 2.1); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };

// ---- 땅: 자연스러운 잔디 (체크무늬 없음) ----
const N = 160, geo = new THREE.PlaneGeometry(N, N, 200, 200); geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cc = new THREE.Color();
const pathD = (x, z) => { const px = Math.sin(z * .22) * 1.2; return Math.abs(x - px); };
const AREAS = [[0, 2, 12], [22, 4, 10], [-22, 1, 11], [-1, -20, 10]];
const hgt = (x, z) => { const d = Math.min(...AREAS.map(([ax, az, ar]) => Math.hypot(x - ax, z - az) - ar)) + 12; if (d < 12) return .06 * Math.sin(x * .7) * Math.cos(z * .6); const k = Math.min(1, (d - 12) / 22); return k * k * (3 + 2 * Math.sin(x * .09) * Math.cos(z * .08) + .8 * Math.sin(x * .27 + z * .2)); };
for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); pos.setY(i, hgt(x, z));
  const n = .5 + .25 * Math.sin(x * .9) * Math.cos(z * 1.1) + .25 * Math.sin(x * .23 + z * .31);
  cc.set('#8fb35a').lerp(new THREE.Color('#b3c46a'), n * .7).lerp(new THREE.Color('#6f9a4c'), Math.max(0, .5 - n) * .8);
  col.set([cc.r, cc.g, cc.b], i * 3); }
geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true; sc.add(ground);
// 돌길 (납작한 자갈)
for (let z = 14; z > -3; z -= .55) for (let k = 0; k < 3; k++) { const x = Math.sin(z * .22) * 1.2 + (k - 1) * .55 + (R() - .5) * .2; const s = .22 + R() * .1;
  add(new THREE.CylinderGeometry(s, s * 1.08, .07, 7), M(['#e6d6bc', '#d9c8aa', '#efe2c8'][Math.floor(R() * 3)]), x, hgt(x, z) + .03, z + (R() - .5) * .2, { ry: R() * 3, cast: false, s: [1, 1, .8 + R() * .4] }); }
// 풀포기 · 잔꽃
const grassMat = [M('#6f9a44'), M('#86ad52'), M('#9cbc5c')];
for (let k = 0; k < 0; k++) { const x = (R() - .5) * 46, z = 2 + (R() - .5) * 46; if (pathD(x, z) < 1.1 && z > -3 && z < 15) continue; if (Math.abs(x - 1.5) < 3 && Math.abs(z + 2.5) < 2.6) continue;
  const m = add(new THREE.ConeGeometry(.035, .22 + R() * .2, 3), grassMat[k % 3], x, hgt(x, z) + .1, z, { cast: false, rz: (R() - .5) * .4 }); }
const fc = ['#f7e7c6', '#f2b5a4', '#d8b4e2', '#f6d77a', '#ffffff'];
for (let k = 0; k < 0; k++) { const x = (R() - .5) * 30, z = 2 + (R() - .5) * 30; if (pathD(x, z) < 1.2 && z > -3 && z < 15) continue; add(new THREE.SphereGeometry(.06, 6, 5), M(fc[k % 5]), x, hgt(x, z) + .2, z, { cast: false }); }

// ---- 오두막 (따뜻한 나무 + 크림 벽) ----
const house = new THREE.Group(); house.position.set(1.5, 0, -2.6); sc.add(house);
add(rbox(5, .5, 4, .1), M('#9a8a78'), 0, .25, 0, { p: house });
add(rbox(4.6, 2.9, 3.6, .12), M('#f3e6cf'), 0, 1.95, 0, { p: house });
for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(4.62, .05, 3.62), M('#e6d5b8'), 0, .7 + k * .45, 0, { p: house, cast: false });
[-2.3, 2.3].forEach(x => [-1.8, 1.8].forEach(z => add(rbox(.32, 3, .32, .06), M('#8a5e3c'), x, 1.95, z, { p: house })));
const roof = new THREE.Shape(); roof.moveTo(-3, 0); roof.lineTo(0, 2.1); roof.lineTo(3, 0); roof.lineTo(2.8, -.2); roof.lineTo(0, 1.8); roof.lineTo(-2.8, -.2); roof.closePath();
const rg = new THREE.ExtrudeGeometry(roof, { depth: 4.6, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2 }); rg.translate(0, 0, -2.3); add(rg, M('#b4674a'), 0, 3.4, 0, { p: house });
for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.05, .05, 4.7), M('#9a5238'), -2.6 + k * .52, 3.5 + Math.min(k, 5 - k) * .36 + (k > 2.5 ? -.1 : 0), 0, { p: house, cast: false });
const gable = new THREE.Shape(); gable.moveTo(-2.3, 0); gable.lineTo(0, 1.6); gable.lineTo(2.3, 0); gable.closePath();
const gg = new THREE.ExtrudeGeometry(gable, { depth: 3.5, bevelEnabled: false }); gg.translate(0, 0, -1.75); add(gg, M('#e9d8bc'), 0, 3.4, 0, { p: house });
add(rbox(.8, 1.8, .8, .08), M('#a29080'), 1.4, 5, -.7, { p: house });
// 따뜻한 창문 (불 켜짐)
const winM = M('#ffd28a', { emissive: '#ffb860', emissiveIntensity: 1.1 });
const win = (x, y, z, ry) => { const w = new THREE.Group(); w.position.set(x, y, z); w.rotation.y = ry; house.add(w); add(rbox(1.05, 1, .16, .05), M('#7a5236'), 0, 0, 0, { p: w }); add(new THREE.BoxGeometry(.82, .78, .05), winM, 0, 0, .07, { p: w, cast: false }); add(new THREE.BoxGeometry(.05, .8, .07), M('#7a5236'), 0, 0, .09, { p: w, cast: false }); add(new THREE.BoxGeometry(.84, .05, .07), M('#7a5236'), 0, 0, .09, { p: w, cast: false });
  add(rbox(1.2, .22, .36, .05), M('#8a5e3c'), 0, -.62, .2, { p: w }); };
win(1.3, 2.1, 1.83, 0); win(2.32, 2.1, .3, Math.PI / 2);
add(rbox(1.05, 1.95, .2, .1), M('#6e8a6a'), -.5, 1.48, 1.84, { p: house }); add(new THREE.SphereGeometry(.06), M('#e8c070', { metalness: .5, roughness: .3 }), -.15, 1.45, 1.97, { p: house });
const lampM = M('#ffe0a0', { emissive: '#ffc070', emissiveIntensity: 1.6 });
add(new THREE.SphereGeometry(.14, 12, 10), lampM, -1.25, 2.6, 1.95, { p: house, cast: false });
const pl = PL('#ffb870', 6, 7, 1.6); pl.position.set(.25, 2.6, -.5); sc.add(pl);
// 현관 데크
add(rbox(3.4, .2, 1.4, .05), M('#a87a52'), -.3, .55, 2.5, { p: house }); for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.03, .21, 1.4), M('#8a5e3c'), -1.8 + k * .58, .56, 2.5, { p: house, cast: false });
// 화분들
[[-1.9, 2.9], [1.25, 2.95]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.24, .18, .4, 12), M('#c07a52'), x, .85, z, { p: house }); add(blob(.32, 1), M('#6f9a44'), x, 1.25, z, { p: house }); });

// ---- 둘러싼 산울타리 · 나무 ----
const hedgeM = [M('#5f8a3e'), M('#6c9646'), M('#577f38')];
for (let k = 0; k < 40; k++) { const a = -Math.PI * .95 + k / 40 * Math.PI * 1.25, d = 10.5 + R() * 1.2; const x = Math.cos(a) * d * 1.1, z = 1 + Math.sin(a) * d; if (z > 9) continue; if (z < -5 && x > -6 && x < 7) continue;
  add(blob(.9 + R() * .5, 2), hedgeM[k % 3], x, hgt(x, z) + .55, z, { s: [1.2, .8, 1] }); hit(x, z, 1.05); }
function tree(x, z, s = 1, cA = '#6c9646', cB = '#88a852') { hit(x, z, .45 * s); TREES.push([x, z, s, cA]); const t = new THREE.Group(); t.position.set(x, hgt(x, z), z); t.scale.setScalar(s); sc.add(t);
  add(new THREE.CylinderGeometry(.2, .32, 2.2, 8), M('#7a5638'), 0, 1.1, 0, { p: t });
  [[0, 2.9, 0, 1.35, cA], [.75, 2.5, .35, 1, cB], [-.75, 2.55, .2, 1.05, cA], [.15, 3.6, -.15, .95, cB], [-.3, 2.7, -.75, .95, cA]].forEach(([a, b, c2, rr, cl]) => add(blob(rr, 3), M(cl), a, b, c2, { p: t })); }
[[-8.5, -4, 1.3], [-5, -8, 1.4], [-12, -9, 1.5], [10, -1, 1.2], [-11, 3, 1.4], [9.5, 6, 1.1], [-9, 9, 1.0], [13, -9, 1.6], [-14, -6, 1.7], [8.5, -12, 1.6], [-9, -13, 1.7]].forEach(([x, z, s], i) => tree(x, z, s, i % 2 ? '#6c9646' : '#7a9e4c', i % 3 ? '#8faa56' : '#a3b85e'));
for (let k = 0; k < 50; k++) { const a = R() * 6.28, d = 20 + R() * 30; const x = Math.cos(a) * d, z = 2 + Math.sin(a) * d; if (z > 14 && Math.abs(x) < 14) continue; if (AREAS.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar + 2)) continue; if ([[-2.4, 21.6], [16.8, 22.5], [-11.5, 20], [13, 0.5], [7, -5], [9, -2], [7.4, -11.8], [5, -9], [-1, 15], [19.5, 13], [-16, 12]].some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 8)) continue; tree(x, z, 1.4 + R(), R() < .5 ? '#6f8c4c' : '#80984e', '#98a85a'); }
// 단풍 한 그루
tree(-6.2, 1.8, 1.05, '#d98a4a', '#e8a85a');

// ---- 아늑한 소품 ----
// 피크닉 담요 + 바구니
const blanket = add(new THREE.BoxGeometry(2.2, .03, 1.6), M('#e8c8b0'), -4.2, .04, 5.6, { ry: .3, cast: false });
for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(2.2, .035, .16), M('#d0846a'), -4.2 + Math.sin(.3) * (-.6 + k * .4), .045, 5.6 + Math.cos(.3) * (-.6 + k * .4), { ry: .3, cast: false });
add(rbox(.6, .4, .45, .1), M('#b88a5a'), -3.6, .25, 5.3, { ry: .3 }); add(new THREE.TorusGeometry(.26, .03, 6, 16, Math.PI), M('#8a6038'), -3.6, .45, 5.3, { ry: .3 });
add(new THREE.CylinderGeometry(.08, .07, .18, 10), M('#f3f0e8'), -4.6, .13, 5.9); add(new THREE.CylinderGeometry(.08, .07, .18, 10), M('#f3f0e8'), -4.3, .13, 6.1);
// 작은 연못 + 돌 테두리
add(new THREE.CylinderGeometry(1.9, 1.9, .06, 32), M('#7fb0b8', { roughness: .15, metalness: .1 }), 6.2, .02, 3.8, { cast: false, s: [1.3, 1, 1] });
for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28; add(blob(.24 + R() * .12, 1), M(['#c8bca8', '#b8ad98', '#d6ccb8'][k % 3]), 6.2 + Math.cos(a) * 2.45, .1, 3.8 + Math.sin(a) * 1.95, { s: [1, .6, 1] }); }
[[5.5, 3.4], [6.9, 4.3]].forEach(([x, z]) => add(new THREE.CylinderGeometry(.3, .3, .02, 14), M('#7a9e4c'), x, .06, z, { cast: false }));
// 나무 울타리 (따뜻한 색)
for (let k = 0; k < 9; k++) add(rbox(.14, .8, .14, .04), M('#a87a52'), 3.4 + k * .7, .4, 8.4);
add(new THREE.BoxGeometry(5.8, .08, .06), M('#9a6e48'), 6.2, .6, 8.4); add(new THREE.BoxGeometry(5.8, .08, .06), M('#9a6e48'), 6.2, .32, 8.4);
// 줄전구
const bulbM = M('#fff0c0', { emissive: '#ffcf80', emissiveIntensity: 2 });
const poles = [[-2.6, 3.2], [-2.6, -0.2], [4.6, 1.2]];
poles.forEach(([x, z]) => add(new THREE.CylinderGeometry(.06, .08, 3.6, 8), M('#6a4a32'), x, 1.8, z));
const string = (a, b) => { for (let k = 0; k <= 14; k++) { const t = k / 14, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = 3.5 - Math.sin(t * Math.PI) * .7; add(new THREE.SphereGeometry(.07, 8, 6), bulbM, x, y, z, { cast: false }); } };
string(poles[0], poles[1]); string(poles[1], [1.5 - 2.3, 3.6 - 2.6 + .5]);
// 랜턴 (길가)
[[-1.3, 10.2], [2.2, 5.5], [1.9, 12.4]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.05, .06, 1.1, 8), M('#4a3a2e'), x, .55, z); add(rbox(.3, .38, .3, .06), M('#ffd890', { emissive: '#ffa850', emissiveIntensity: 2.2 }), x, 1.25, z, { cast: false }); const l = PL('#ffb870', 2.5, 4, 1.8); l.position.set(x, 1.3, z); sc.add(l); });
// 벤치 + 덩굴 아치
const arch = new THREE.Group(); arch.position.set(-.3, 0, 7.4); sc.add(arch);
[-1.3, 1.3].forEach(x => add(rbox(.18, 2.6, .18, .05), M('#a87a52'), x, 1.3, 0, { p: arch }));
add(new THREE.TorusGeometry(1.3, .09, 8, 24, Math.PI), M('#a87a52'), 0, 2.6, 0, { p: arch });
for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI; add(blob(.2 + R() * .12, 1), M(k % 4 ? '#6f9a44' : '#88aa50'), Math.cos(a) * 1.32, 2.6 + Math.sin(a) * 1.32, (R() - .5) * .3, { p: arch }); }
for (let k = 0; k < 8; k++) [-1.3, 1.3].forEach(x => add(blob(.15, 1), M('#6f9a44'), x + (R() - .5) * .2, .3 + k * .3, .1, { p: arch }));
// 우체통
add(new THREE.CylinderGeometry(.05, .05, 1.1), M('#6a4a32'), 3.6, .55, 1.6); add(rbox(.5, .42, .7, .14), M('#c86a4a'), 3.6, 1.2, 1.6);
// 장작 · 화분 무리
for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(.13, .13, .9, 10), M('#9a6e48'), 4.5 + (k % 3) * .27, .14 + Math.floor(k / 3) * .24, -1.2, { rx: Math.PI / 2, rz: .1 });
[[-2.1, 1.6, .32], [-1.7, 1.95, .24], [-2.4, 2.1, .2]].forEach(([x, z, s]) => { add(new THREE.CylinderGeometry(s, s * .8, s * 1.4, 12), M('#c07a52'), x, s * .7, z); add(blob(s * 1.15, 1), M('#7a9e4c'), x, s * 1.7, z); });

// 반딧불 / 꽃가루
for (let k = 0; k < 40; k++) add(new THREE.SphereGeometry(.035, 6, 5), M('#fff2b0', { emissive: '#ffe080', emissiveIntensity: 2 }), (R() - .5) * 18, .6 + R() * 2.5, 2 + (R() - .5) * 16, { cast: false });



// ================= 집 뒤 지하실 입구 =================
{
  const hx = 2.6, hz = -5.6;
  add(rbox(2.4, .3, 2, .08), M('#8a8478'), hx, .15, hz);                      // 돌 테두리
  const doorM = M('#5a4232'), doorD = M('#4a3428');
  const d1 = add(rbox(1, .1, 1.7, .03), doorM, hx - .52, .55, hz, { rx: -.32 }); // 닫힌 문짝
  const d2 = add(rbox(1, .1, 1.7, .03), doorD, hx + .62, 1.15, hz + .3, { rz: -1.35, rx: -.1 }); // 열린 문짝
  for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.98, .02, .06), M('#2e2018'), hx - .52, .6 + k * .0, hz - .6 + k * .4, { rx: -.32, cast: false });
  add(new THREE.TorusGeometry(.09, .02, 6, 14), M('#6a6a6a', { metalness: .6, roughness: .4 }), hx - .2, .66, hz + .1, { rx: Math.PI / 2 - .32 });
  add(new THREE.BoxGeometry(.9, .02, 1.5), M('#0a0806'), hx + .5, .31, hz, { cast: false });   // 어두운 계단 구멍
  for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.85, .06, .3), M('#3a3430'), hx + .5, .26 - k * .0, hz - .5 + k * .32, { cast: false });
  // 꺼질 듯한 랜턴 + 덩굴 + 낡은 표지판
  add(new THREE.CylinderGeometry(.04, .05, 1.3), M('#3a2e26'), hx - 1.4, .65, hz + .7);
  add(rbox(.24, .3, .24, .05), M('#c8f0b0', { emissive: '#7ac070', emissiveIntensity: 1.2 }), hx - 1.4, 1.42, hz + .7, { cast: false });
  const gl = PL('#8ad080', 2.2, 4, 1.8); gl.position.set(hx - 1.4, 1.5, hz + .7); sc.add(gl);
  add(new THREE.CylinderGeometry(.03, .03, .9), M('#4a3a2e'), hx + 1.5, .45, hz + .9); add(rbox(.6, .32, .05, .02), M('#b8a888'), hx + 1.5, .95, hz + .9, { rz: .12 });
  for (let k = 0; k < 9; k++) add(blob(.14 + Math.random() * .08, 1), M('#4a6a34'), hx - 1.2 + Math.random() * 2.4, .32, hz - .95 + Math.random() * .2);
  // 뒷마당 장작 · 빨랫줄
  [[-1.4, -4.6], [4.6, -4.6]].forEach(([x, z]) => add(new THREE.CylinderGeometry(.05, .06, 2.2), M('#7a5638'), x, 1.1, z));
  add(new THREE.CylinderGeometry(.01, .01, 6), M('#e8e0d0'), 1.6, 2.1, -4.6, { rz: Math.PI / 2, cast: false });
  [['#e8c8b0', -.6], ['#a8b8d0', .3], ['#f3eee0', 1.1]].forEach(([c, dx]) => add(new THREE.BoxGeometry(.6, .7, .02), M(c), 1.6 + dx, 1.72, -4.6, { rz: (Math.random() - .5) * .1 }));
}
// ================= 아쿠아리움 =================
{
  const A = [-1, -20];
  const aq = new THREE.Group(); aq.name = '아쿠아리움'; aq.position.set(A[0], 0, A[1]); sc.add(aq);
  add(new THREE.CylinderGeometry(6.2, 6.5, .5, 40), M('#d8d0c0'), 0, .25, 0, { p: aq });
  add(new THREE.CylinderGeometry(5.6, 5.6, 2.2, 40), M('#f2ece0'), 0, 1.6, 0, { p: aq });
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; add(new THREE.BoxGeometry(.9, 1.3, .05), M('#9ad0e8', { emissive: '#5ab0d8', emissiveIntensity: .25, roughness: .15 }), Math.cos(a) * 5.62, 1.6, Math.sin(a) * 5.62, { p: aq, ry: -a + Math.PI / 2, cast: false }); }
  const dome = new THREE.MeshStandardMaterial({ color: '#bfe6f2', roughness: .08, metalness: .1, transparent: true, opacity: .55, emissive: '#4aa8d0', emissiveIntensity: .15 });
  add(new THREE.SphereGeometry(5.6, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 2.7, 0, { p: aq, cast: false });
  for (let k = 0; k < 8; k++) add(new THREE.TorusGeometry(5.62, .05, 6, 40, Math.PI), M('#f3efe6'), 0, 2.7, 0, { p: aq, ry: k / 8 * Math.PI, cast: false });
  // 돔 안 물고기 · 해초
  for (let k = 0; k < 18; k++) { const a = Math.random() * 6.28, rr = Math.random() * 4, y = 3.2 + Math.random() * 3; const f = new THREE.Group(); f.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); f.rotation.y = Math.random() * 6; aq.add(f); DYN.push(f); f.userData.swim = [a, rr, y, .2 + Math.random() * .3];
    add(new THREE.SphereGeometry(.25, 12, 8), M(['#ff9a5a', '#ffd84a', '#7ab8ff', '#ff7ab0'][k % 4], { emissive: '#ffffff', emissiveIntensity: .08 }), 0, 0, 0, { p: f, s: [1.4, .8, .5], cast: false }); add(new THREE.ConeGeometry(.16, .3, 6), M(['#ff9a5a', '#ffd84a', '#7ab8ff', '#ff7ab0'][k % 4]), -.42, 0, 0, { p: f, rz: Math.PI / 2, cast: false }); }
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; add(new THREE.ConeGeometry(.15, 1.2 + Math.random(), 5), M('#4aa870'), Math.cos(a) * 3.6, 3.3, Math.sin(a) * 3.6, { p: aq, cast: false }); }
  // 입구 · 간판(물고기)
  add(rbox(2.4, 2.6, .8, .2), M('#e8dfd0'), 0, 1.3, 5.7, { p: aq }); add(rbox(1.6, 2, .2, .12), M('#3a6a88', { emissive: '#2a5a7a', emissiveIntensity: .4 }), 0, 1.1, 6.1, { p: aq });
  const sign = new THREE.Group(); sign.position.set(0, 3.2, 6.2); aq.add(sign);
  add(new THREE.SphereGeometry(.6, 16, 12), M('#ff9a5a'), 0, 0, 0, { p: sign, s: [1.5, .9, .4] }); add(new THREE.ConeGeometry(.45, .8, 8), M('#ff9a5a'), -1.15, 0, 0, { p: sign, rz: Math.PI / 2 }); add(new THREE.SphereGeometry(.1, 8, 6), M('#2a2230'), .55, .12, .22, { p: sign, cast: false });
  // 분수 · 꽃밭 · 길
  add(new THREE.CylinderGeometry(1.2, 1.3, .4, 28), M('#d8d0c0'), 0, .2, 9.6, { p: aq }); add(new THREE.CylinderGeometry(1.05, 1.05, .05, 28), M('#7fc0d8', { roughness: .1 }), 0, .4, 9.6, { p: aq, cast: false });
  add(new THREE.CylinderGeometry(.12, .16, .9), M('#d8d0c0'), 0, .8, 9.6, { p: aq }); add(new THREE.SphereGeometry(.25, 12, 8), M('#bfe6f2', { transparent: true, opacity: .7 }), 0, 1.35, 9.6, { p: aq, cast: false });
  for (let z = 6.5; z < 15; z += .55) for (let k = 0; k < 2; k++) add(new THREE.CylinderGeometry(.26, .28, .06, 7), M(['#e6d6bc', '#d9c8aa'][k]), (k - .5) * .7 + (z > 8.4 && z < 10.8 ? (k ? 1.8 : -1.8) : 0), .03, z, { p: aq, ry: Math.random() * 3, cast: false });
}

// ================= 텃밭 · 작업장 =================
{
  const F = [22, 4];
  // 흙길
  for (let z = 14; z > -2; z -= .6) for (let k = 0; k < 2; k++) { const x = F[0] - .4 + k * .7 + (Math.random() - .5) * .2; add(new THREE.CylinderGeometry(.26, .28, .06, 7), M(['#e6d6bc', '#d9c8aa'][k]), x, .03, z, { ry: Math.random() * 3, cast: false }); }
  // 나무 틀 텃밭 (2줄 x 3)
  const crops = ['cab', 'car', 'tom', 'sun', 'cab', 'car'];
  crops.forEach((cr, i) => { const x = F[0] - 4.2 + (i % 3) * 2.4 + (i < 3 ? 0 : 0), z = F[1] - 1 + Math.floor(i / 3) * 3.2; if (i % 3 === 1) return;
    const bx = i % 3 === 0 ? x : x - 0; add(rbox(2, .45, 2.4, .06), M('#8a5e3c'), bx, .22, z); add(new THREE.BoxGeometry(1.8, .05, 2.2), M('#6a4a32'), bx, .46, z, { cast: false });
    for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { const px = bx - .55 + a * .55, pz = z - .8 + b * .53;
      if (cr === 'cab') { add(blob(.22, 2), M('#9cc46a'), px, .62, pz, { s: [1, .75, 1] }); add(blob(.13, 1), M('#c8e08a'), px, .72, pz); }
      if (cr === 'car') { add(new THREE.ConeGeometry(.04, .3, 4), M('#6f9a44'), px - .05, .66, pz); add(new THREE.ConeGeometry(.04, .26, 4), M('#7fa850'), px + .05, .64, pz, { rz: .3 }); add(new THREE.SphereGeometry(.07, 8, 6), M('#e8854a'), px, .5, pz, { cast: false }); }
      if (cr === 'tom') { if (b % 2) continue; add(new THREE.CylinderGeometry(.025, .025, 1.4), M('#a87a52'), px, 1.15, pz); add(blob(.22, 2), M('#6f9a44'), px, 1.2, pz); for (let t = 0; t < 3; t++) add(new THREE.SphereGeometry(.07, 8, 6), M('#d8503a'), px + (t - 1) * .12, 1.0 + t * .12, pz + .16, { cast: false }); }
      if (cr === 'sun') { if ((a + b) % 2) continue; add(new THREE.CylinderGeometry(.03, .04, 1.8), M('#6f9a44'), px, 1.35, pz); add(new THREE.CylinderGeometry(.22, .22, .06, 14), M('#e8b830'), px, 2.25, pz + .05, { rx: Math.PI / 2.4 }); add(new THREE.CylinderGeometry(.11, .11, .07, 12), M('#6a4a2a'), px, 2.26, pz + .09, { rx: Math.PI / 2.4, cast: false }); }
    } });
  // 비닐하우스
  const gh = new THREE.Group(); gh.position.set(F[0] + 5.5, 0, F[1] - 3.5); gh.rotation.y = -.35; sc.add(gh);
  add(rbox(3.6, .3, 4.6, .05), M('#b8ad98'), 0, .15, 0, { p: gh });
  const glass = new THREE.MeshStandardMaterial({ color: '#dfeff0', roughness: .1, metalness: .1, transparent: true, opacity: .35 });
  add(new THREE.CylinderGeometry(1.8, 1.8, 4.4, 24, 1, true, -Math.PI / 2, Math.PI), glass, 0, 1.6, 0, { p: gh, rx: Math.PI / 2, rz: Math.PI / 2, cast: false });
  for (let k = 0; k < 5; k++) add(new THREE.TorusGeometry(1.8, .04, 6, 24, Math.PI), M('#f3efe6'), 0, 1.6, -2.2 + k * 1.1, { p: gh });
  add(new THREE.BoxGeometry(3.6, 1.6, .04), glass, 0, .8, 2.2, { p: gh, cast: false });
  for (let k = 0; k < 6; k++) { add(new THREE.CylinderGeometry(.16, .12, .26, 10), M('#c07a52'), -1 + (k % 3), .45, -1 + Math.floor(k / 3) * 1.6, { p: gh }); add(blob(.2, 2), M(['#6f9a44', '#d898a8', '#e8c86a'][k % 3]), -1 + (k % 3), .7, -1 + Math.floor(k / 3) * 1.6, { p: gh }); }
  // 작업대 (제작)
  const wb = new THREE.Group(); wb.position.set(F[0] - 7, 0, F[1] + 1); wb.rotation.y = 1.1; sc.add(wb);
  add(rbox(2.4, .16, 1, .04), M('#b8885a'), 0, 1, 0, { p: wb }); [[-1.05, -.4], [1.05, -.4], [-1.05, .4], [1.05, .4]].forEach(([x, z]) => add(new THREE.BoxGeometry(.12, 1, .12), M('#8a5e3c'), x, .5, z, { p: wb }));
  add(rbox(2.4, 1.2, .1, .03), M('#a87a52'), 0, 1.7, -.48, { p: wb }); [[-.7, 1.9], [0, 1.95], [.6, 1.8]].forEach(([x, y]) => add(new THREE.BoxGeometry(.08, .5, .04), M('#6a6a72'), x, y, -.4, { p: wb }));
  add(new THREE.BoxGeometry(.5, .08, .3), M('#e8d6b0'), -.5, 1.12, .1, { p: wb }); add(new THREE.CylinderGeometry(.1, .1, .3, 10), M('#c86a4a'), .6, 1.23, 0, { p: wb });
  add(new THREE.BoxGeometry(.5, .05, .5), M('#f3efe6'), .1, 1.11, .1, { p: wb, cast: false });
  // 상자 · 수레 · 물뿌리개
  [[F[0] + 2.8, F[1] + 4.8], [F[0] + 3.4, F[1] + 5.2], [F[0] + 3.1, F[1] + 4.9, .55]].forEach(([x, z, y = 0]) => { add(rbox(.6, .5, .6, .04), M('#c99a62'), x, .25 + y, z, { ry: .2 }); });
  add(blob(.12, 1), M('#e8854a'), F[0] + 3.4, .55, F[1] + 5.2); add(blob(.12, 1), M('#e8854a'), F[0] + 3.5, .55, F[1] + 5.05);
  const wc = new THREE.Group(); wc.position.set(F[0] - 1.6, 0, F[1] + 6.4); wc.rotation.y = -.6; sc.add(wc);
  add(new THREE.CylinderGeometry(.2, .22, .34, 14), M('#7aa0a8', { metalness: .4, roughness: .4 }), 0, .17, 0, { p: wc }); add(new THREE.CylinderGeometry(.03, .04, .5, 8), M('#7aa0a8', { metalness: .4, roughness: .4 }), .3, .3, 0, { p: wc, rz: -1 });
  // 허수아비
  const sc2 = new THREE.Group(); sc2.position.set(F[0] - .2, 0, F[1] - 4.8); sc.add(sc2);
  add(new THREE.CylinderGeometry(.06, .06, 2.2), M('#8a5e3c'), 0, 1.1, 0, { p: sc2 }); add(new THREE.CylinderGeometry(.05, .05, 1.6), M('#8a5e3c'), 0, 1.6, 0, { p: sc2, rz: Math.PI / 2 });
  add(rbox(.8, .7, .35, .12), M('#c8784a'), 0, 1.45, 0, { p: sc2 }); add(blob(.32, 2), M('#e8d6a0'), 0, 2.15, 0, { p: sc2 });
  add(new THREE.CylinderGeometry(.55, .55, .05, 20), M('#c8a860'), 0, 2.42, 0, { p: sc2 }); add(new THREE.CylinderGeometry(.24, .28, .3, 16), M('#c8a860'), 0, 2.58, 0, { p: sc2 });
  // 낮은 나무 울타리
  for (let k = 0; k < 12; k++) add(rbox(.12, .7, .12, .03), M('#a87a52'), F[0] - 7 + k * 1.2, .35, F[1] - 6.8);
  add(new THREE.BoxGeometry(13.4, .07, .05), M('#9a6e48'), F[0] - .4, .55, F[1] - 6.8);
  // 감나무 · 사과나무
  tree(F[0] + 8, F[1] + 4, 1.1, '#7a9e4c', '#8faa56'); tree(F[0] - 8.5, F[1] - 3, 1.2, '#6c9646', '#88a852');
  for (let k = 0; k < 8; k++) add(new THREE.SphereGeometry(.12, 8, 6), M('#e8784a'), F[0] + 8 + (Math.random() - .5) * 2, 2.6 + Math.random() * 1.2, F[1] + 4.9, { cast: false });
}
// ================= 호숫가 선착장 (밤) =================
{
  const L = [-22, 0];
  add(new THREE.CylinderGeometry(6.5, 6.5, .08, 48), M(NIGHT ? '#2a4a68' : '#7fb0b8', { roughness: .08, metalness: .2, emissive: NIGHT ? '#10203a' : '#000000', emissiveIntensity: .5 }), L[0], .02, L[1], { cast: false, s: [1.25, 1, 1] });
  for (let k = 0; k < 44; k++) { const a = k / 44 * 6.28; const rr = 6.6 + Math.random() * .4; add(blob(.35 + Math.random() * .25, 2), M(['#9a9488', '#8a8478', '#aaa498'][k % 3]), L[0] + Math.cos(a) * rr * 1.25, .1, L[1] + Math.sin(a) * rr, { s: [1, .55, 1] }); }
  for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28, rr = 5.6 + Math.random() * .9; if (Math.sin(a) > .6 && Math.abs(Math.cos(a)) < .3) continue; add(new THREE.CylinderGeometry(.02, .025, .7 + Math.random() * .6), M('#5a7a3a'), L[0] + Math.cos(a) * rr * 1.25, .4, L[1] + Math.sin(a) * rr); }
  for (let k = 0; k < 9; k++) add(new THREE.CylinderGeometry(.35, .35, .02, 14), M('#4a7a3a'), L[0] - 4 + Math.random() * 8, .07, L[1] - 3 + Math.random() * 4, { cast: false });
  [[-24, -1], [-19, 1.5]].forEach(([x, z]) => add(new THREE.SphereGeometry(.1, 8, 6), M('#f6d0e0', { emissive: '#f0a0c0', emissiveIntensity: NIGHT ? .5 : 0 }), x, .14, z, { cast: false }));
  // 선착장
  const dk = new THREE.Group(); dk.position.set(L[0] + 1.5, 0, L[1] + 7.4); sc.add(dk);
  for (let k = 0; k < 12; k++) add(new THREE.BoxGeometry(1.8, .1, .38), M(k % 2 ? '#9a7048' : '#8a6040'), 0, .32, -k * .42, { p: dk });
  [[-.85, 0], [.85, 0], [-.85, -2.4], [.85, -2.4], [-.85, -4.6], [.85, -4.6]].forEach(([x, z]) => add(new THREE.CylinderGeometry(.1, .1, 1.1, 10), M('#6a4a32'), x, .1, z, { p: dk }));
  const lantM = M('#ffd890', { emissive: '#ffa850', emissiveIntensity: NIGHT ? 3 : .6 });
  [[-.85, -4.6], [.85, -2.4]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.04, .04, 1.1), M('#4a3a2e'), x, .9, z, { p: dk }); add(rbox(.26, .32, .26, .05), lantM, x, 1.55, z, { p: dk, cast: false }); const l = PL('#ffb060', NIGHT ? 7 : 0, 6, 1.6); l.position.set(L[0] + 1.5 + x, 1.6, L[1] + 7.4 + z); sc.add(l); });
  // 나룻배
  const bt = new THREE.Group(); bt.position.set(L[0] + 3.4, .08, L[1] + 3.6); bt.rotation.y = .5; sc.add(bt);
  const hull = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); add(hull, M('#b8805a'), 0, .35, 0, { p: bt, s: [.7, .45, 1.6] });
  add(new THREE.BoxGeometry(1.2, .06, .3), M('#9a6a48'), 0, .3, .2, { p: bt }); add(new THREE.CylinderGeometry(.03, .03, 1.6), M('#8a5e3c'), .5, .4, -.3, { p: bt, rz: 1.2, rx: .3 });
  // 버드나무
  const wl = new THREE.Group(); wl.position.set(L[0] - 6.5, 0, L[1] + 5.5); sc.add(wl);
  add(new THREE.CylinderGeometry(.3, .45, 3, 8), M('#6a5038'), 0, 1.5, 0, { p: wl }); add(blob(1.6, 3), M('#6a8a48'), 0, 3.6, 0, { p: wl, s: [1.2, .8, 1.2] });
  for (let k = 0; k < 26; k++) { const a = k / 26 * 6.28; add(new THREE.CylinderGeometry(.06, .02, 2.2), M(k % 2 ? '#7a9a50' : '#6a8a48'), Math.cos(a) * 1.6, 2.3, Math.sin(a) * 1.6, { p: wl, cast: false }); }
  // 모닥불 + 통나무 의자
  const fp = [L[0] + 6.8, L[1] + 5.4];
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(blob(.2, 1), M('#8a8478'), fp[0] + Math.cos(a) * .55, .1, fp[1] + Math.sin(a) * .55, { s: [1, .6, 1] }); }
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(.07, .07, .8, 8), M('#6a4a32'), fp[0], .2, fp[1], { rz: Math.PI / 2.4, ry: k * .8 });
  const fireM = FIRE = M('#ffb040', { emissive: '#ff8020', emissiveIntensity: NIGHT ? 3.5 : 1 });
  add(new THREE.ConeGeometry(.28, .7, 8), fireM, fp[0], .5, fp[1], { cast: false }); add(new THREE.ConeGeometry(.16, .5, 8), M('#fff0a0', { emissive: '#ffe080', emissiveIntensity: 3 }), fp[0], .45, fp[1], { cast: false });
  const fl = PL('#ff9a40', NIGHT ? 14 : 2, 10, 1.4); fl.position.set(fp[0], 1, fp[1]); sc.add(fl);
  [[-1.4, .3, 1.2], [1.3, -.5, -1.1]].forEach(([dx, dz, ry]) => add(new THREE.CylinderGeometry(.3, .3, 1.6, 12), M('#8a6040'), fp[0] + dx, .3, fp[1] + dz, { rz: Math.PI / 2, ry }));
  // 텐트
  const tn = new THREE.Group(); tn.position.set(fp[0] + 1, 0, fp[1] - 3.4); tn.rotation.y = -.4; sc.add(tn);
  const tg = new THREE.ConeGeometry(1.5, 2, 4, 1, true); add(tg, M('#e8d6b8', { side: THREE.DoubleSide, emissive: NIGHT ? '#ffb070' : '#000000', emissiveIntensity: NIGHT ? .35 : 0 }), 0, 1, 0, { p: tn, ry: Math.PI / 4 });
  // 반딧불 (밤)
  // 달빛 물길
}

// ================= 밀도 채우기: 꽃밭 · 덤불 · 바위 · 버섯 · 소품 =================
{
  // 비워 둘 곳 (건물 · 길 · 물 · 카메라 시선)
  const KEEP = [[1.5, -2.6, 4.2], [6.2, 3.8, 3.2], [-4.2, 5.6, 2], [-.3, 7.4, 1.8], [-1, -20, 7.5], [22, 4, 7.2], [27.5, .5, 3.4], [15, 5, 2], [-22, 0, 9.2], [-15.2, 5.4, 2.6], [-14.2, 2, 2.4], [2.6, -5.6, 2.2], [1.6, -4.6, 3.4], [-28.5, 5.5, 2.5]];
  const CAMS = [[-2.4, 21.6, .5, 1.0, 4.5], [16.8, 22.5, 22.2, .6, 3], [-11.5, 20, -20.5, .4, 3], [13, .5, 0, .2, -11], [7.4, -11.8, 2.2, .6, -5]];
  const segD = (px, pz, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - ax - vx * t, pz - az - vz * t); };
  const free = (x, z, tall) => { if (KEEP.some(([a, b, r]) => Math.hypot(x - a, z - b) < r)) return false; if (pathD(x, z) < 1.3 && z > -4 && z < 16) return false;
    if (Math.abs(x + 1) < 1.6 && z > -14 && z < -4) return false; if (Math.abs(x - 22) < 1.4 && z > -2 && z < 15) return false;
    if (tall && CAMS.some(([cx, cz, tx, ty, tz]) => segD(x, z, cx, cz, tx, tz) < 4.6 || Math.hypot(x - cx, z - cz) < 10)) return false; return true; };
  // 둥근 덤불 (일부는 꽃 피는 덤불)
  const BC = ['#6f9a44', '#86ad52', '#7aa84e', '#93b65a'];
  for (let k = 0; k < 150; k++) { const a = R() * 6.28, d = 4 + R() * 30, x = Math.cos(a) * d * 1.05, z = 2 + Math.sin(a) * d * .9; if (!free(x, z, true)) continue;
    const s = .45 + R() * .5, y = hgt(x, z); hit(x, z, s * 1.15); add(blob(s, 2), M(BC[k % 4]), x, y + s * .6, z, { s: [1.25, .85, 1.1] }); if (R() < .5) add(blob(s * .7, 2), M(BC[(k + 1) % 4]), x + s * .7, y + s * .45, z + .2, { s: [1.2, .8, 1] });
  }
  // 이끼 낀 바위
  for (let k = 0; k < 45; k++) { const a = R() * 6.28, d = 5 + R() * 30, x = Math.cos(a) * d, z = 2 + Math.sin(a) * d * .9; if (!free(x, z)) continue; const s = .25 + R() * .45, y = hgt(x, z); if (s > .35) { hit(x, z, s * 1.1); ROCKS.push([x, z, s]); }
    add(blob(s, 1), M(['#c8bca8', '#b8ad98', '#d6ccb8'][k % 3]), x, y + s * .35, z, { s: [1.2, .7, 1] }); if (R() < .6) add(blob(s * .6, 1), M('#7a9e4c'), x, y + s * .7, z, { s: [1.2, .35, 1] }); }
  // 버섯 무리
  for (let k = 0; k < 22; k++) { const a = R() * 6.28, d = 8 + R() * 26, cx = Math.cos(a) * d, cz = 2 + Math.sin(a) * d * .9; if (!free(cx, cz)) continue;
    for (let j = 0; j < 3 + Math.floor(R() * 3); j++) { const x = cx + (R() - .5) * .8, z = cz + (R() - .5) * .8, y = hgt(x, z), s = .08 + R() * .1;
      add(new THREE.CylinderGeometry(s * .4, s * .5, s * 1.6, 8), M('#fbf3e4'), x, y + s * .8, z, { cast: false }); add(new THREE.SphereGeometry(s, 12, 8, 0, 6.29, 0, Math.PI / 2), M(k % 2 ? '#e8604a' : '#f0b060'), x, y + s * 1.55, z, { cast: false });
      if (k % 2 === 0) add(new THREE.SphereGeometry(s * .2, 6, 4), M('#ffffff'), x + s * .4, y + s * 1.9, z, { cast: false }); } }
  // 나비
  for (let k = 0; k < 26; k++) { const a = R() * 6.28, d = 2 + R() * 20, x = Math.cos(a) * d, z = 3 + Math.sin(a) * d * .8, y = hgt(x, z) + .6 + R() * 1.2, c = ['#ffd6e0', '#fff2a0', '#d8c4ff', '#ffffff'][k % 4], b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = R() * 6; sc.add(b); DYN.push(b); b.userData.fly = [x, y, z, R() * 6];
    [-1, 1].forEach(s => add(new THREE.CircleGeometry(.09, 10), M(c, { side: THREE.DoubleSide, emissive: c, emissiveIntensity: .2 }), s * .07, 0, 0, { p: b, ry: s * .9, cast: false })); }
  // 바깥 테두리 숲 (아늑하게 감싸는 큰 나무들, 파스텔 섞어서)
  const TP = [['#6f9a44', '#88aa50'], ['#d98a4a', '#e8a85a'], ['#e8a0b0', '#f2c0c8'], ['#7a9e4c', '#a3b85e']];
  for (let k = 0; k < 80; k++) { const a = R() * 6.28, d = 27 + R() * 14, x = Math.cos(a) * d * 1.15, z = 2 + Math.sin(a) * d; if (!free(x, z, true) || z > 18) continue; const p = TP[k % 7 === 0 ? 2 : k % 5 === 0 ? 1 : k % 2 ? 0 : 3]; tree(x, z, 1.2 + R() * .8, p[0], p[1]); }
  for (let k = 0; k < 40; k++) { const a = R() * 6.28, d = 12 + R() * 14, x = Math.cos(a) * d * 1.05, z = 2 + Math.sin(a) * d * .9; if (!free(x, z, true)) continue; const p = TP[k % 4]; tree(x, z, .8 + R() * .5, p[0], p[1]); }

  // ---- 소품 ----
  // 갈림길 이정표
  { const x = 2.2, z = 12.2, y = hgt(x, z); add(new THREE.CylinderGeometry(.07, .08, 2.2, 8), M('#8a6040'), x, y + 1.1, z);
    [['#f6c27a', .3, 1.85], ['#a8c88a', -.5, 1.5], ['#9ac8e0', 2.4, 1.15]].forEach(([c, ry, h]) => add(rbox(1.1, .26, .07, .04), M(c), x + Math.cos(ry) * .45, y + h, z - Math.sin(ry) * .45, { ry })); }
  // 새집
  { const x = -6.8, z = .6, y = hgt(x, z); add(new THREE.CylinderGeometry(.05, .06, 2.4, 8), M('#8a6040'), x, y + 1.2, z); add(rbox(.5, .5, .45, .06), M('#f3e6cf'), x, y + 2.6, z); add(new THREE.ConeGeometry(.42, .3, 4), M('#c86a4a'), x, y + 3, z, { ry: Math.PI / 4 }); add(new THREE.CircleGeometry(.08, 12), M('#3a2a22'), x, y + 2.65, z + .24, { cast: false }); }
  // 집 둘레 화분 · 물통 · 상자 · 자전거 대신 손수레
  [[-1.2, .4], [4.3, .2], [4.6, -1.4], [-1.6, -4.9], [.3, -5]].forEach(([x, z], i) => { const s = .22 + (i % 3) * .06, y = hgt(x, z); add(new THREE.CylinderGeometry(s, s * .8, s * 1.4, 12), M(['#c07a52', '#e8c8a0', '#a8b8c8'][i % 3]), x, y + s * .7, z); add(blob(s * 1.2, 1), M(['#7a9e4c', '#e8a0b0', '#f6d77a'][i % 3]), x, y + s * 1.7, z); });
  [[5.4, -.8], [5.9, -.4]].forEach(([x, z], i) => add(rbox(.6, .5, .6, .05), M('#c99a62'), x, hgt(x, z) + .25 + i * .5, z, { ry: .3 * i }));
  add(new THREE.CylinderGeometry(.35, .3, .7, 14), M('#9a7a5a'), 5.2, hgt(5.2, .6) + .35, .6); for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(.33, .025, 6, 18), M('#6a5040'), 5.2, hgt(5.2, .6) + .15 + k * .25, .6, { rx: Math.PI / 2, cast: false });
  // 해먹 (호수 가는 길 두 나무 사이)
  { const a = [9.2, 9.6], b = [12.2, 11]; tree(a[0], a[1], .9, '#7a9e4c', '#a3b85e'); tree(b[0], b[1], .95, '#6f9a44', '#88aa50');
    const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, 1.5 - Math.sin(t * Math.PI) * .7, a[1] + (b[1] - a[1]) * t)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .2, 6), M('#f2c8b8'), 0, 0, 0, { s: [1, 1, 1] }); add(blob(.22, 1), M('#fff8ec'), a[0] - .6, 1.05, a[1] + .25); }
  // 텃밭 옆 벌통 · 건초 · 피크닉 테이블
  [[29, 9.5], [30.2, 9.8]].forEach(([x, z]) => { const y = hgt(x, z); add(new THREE.BoxGeometry(.7, .2, .7), M('#e8e0d0'), x, y + .5, z); for (let k = 0; k < 3; k++) add(rbox(.66, .22, .66, .04), M(k % 2 ? '#f6c27a' : '#f8d898'), x, y + .2 + k * .2 + .45, z); add(new THREE.BoxGeometry(.8, .06, .8), M('#c8a87a'), x, y + 1.26, z); [-.3, .3].forEach(d => add(new THREE.BoxGeometry(.06, .45, .06), M('#8a6040'), x + d, y + .22, z)); });
  [[15.6, 10.5], [16.6, 9.6]].forEach(([x, z], i) => add(new THREE.CylinderGeometry(.55, .55, .9, 16), M('#e8c870'), x, hgt(x, z) + .45, z, { rz: Math.PI / 2, ry: .4 + i }));
  { const x = 17.5, z = -2, y = hgt(x, z); add(rbox(2, .12, 1, .04), M('#c8946a'), x, y + .8, z); [-1, 1].forEach(s => add(rbox(2, .1, .35, .03), M('#b88458'), x, y + .45, z + s * .75)); [-.8, .8].forEach(d => add(new THREE.BoxGeometry(.1, .8, .1), M('#8a6040'), x + d, y + .4, z));
    add(new THREE.BoxGeometry(1.2, .02, .8), M('#f4d8d0'), x, y + .87, z, { cast: false }); add(new THREE.CylinderGeometry(.1, .08, .2, 10), M('#ffffff'), x + .3, y + .97, z); add(blob(.14, 1), M('#e8504a'), x - .3, y + .95, z); }
  // 길을 따라 랜턴 추가
  [[-1.8, 3.2], [2.4, 9]].forEach(([x, z]) => { const y = hgt(x, z); add(new THREE.CylinderGeometry(.05, .06, 1.1, 8), M('#4a3a2e'), x, y + .55, z); add(rbox(.3, .38, .3, .06), M('#ffd890', { emissive: '#ffa850', emissiveIntensity: 2.2 }), x, y + 1.25, z, { cast: false }); const l = PL('#ffb870', 2.2, 4, 1.8); l.position.set(x, y + 1.3, z); sc.add(l); });
  // 낮은 흰 울타리 조각 (길가 꽃밭을 감싸게)
  [[-3.4, 11, 2.8, .2], [3.6, 3.4, 2.2, -.3], [-7.5, 2.5, 2.4, 1.2]].forEach(([x, z, len, ry]) => { const g = new THREE.Group(); g.position.set(x, hgt(x, z), z); g.rotation.y = ry; sc.add(g);
    for (let k = 0; k <= Math.round(len / .4); k++) add(rbox(.1, .55, .1, .03), M('#fff6ea'), -len / 2 + k * .4, .28, 0, { p: g }); add(new THREE.BoxGeometry(len, .06, .05), M('#fff6ea'), 0, .42, 0, { p: g }); });
  // 자는 고양이
  { const x = -2.9, z = 2.2, y = hgt(x, z); add(blob(.28, 2), M('#f0b070'), x, y + .2, z, { s: [1.4, .7, 1] }); add(blob(.18, 2), M('#f0b070'), x + .32, y + .3, z + .05); [-1, 1].forEach(s => add(new THREE.ConeGeometry(.06, .12, 4), M('#f0b070'), x + .36, y + .46, z + .05 + s * .09));
    add(new THREE.TorusGeometry(.2, .05, 6, 12, Math.PI), M('#e8a060'), x - .3, y + .12, z + .1, { rx: Math.PI / 2 }); }
}

// ================= 상호작용 건축물 (오픈월드처럼 할 거리 많이) =================
const INTER = [];   // [아이콘, 이름, 할 일, x, y, z]
const mark = (ic, name, act, x, y, z) => INTER.push([ic, name, act, x, y, z]);
const W8 = (c) => M(c, { roughness: .8 });
{
  // ① 우물 — 물 긷기
  { const x = -7.2, z = -1.6, y = hgt(x, z);
    add(new THREE.CylinderGeometry(.9, .95, .8, 18), M('#c8bca8'), x, y + .4, z); add(new THREE.CylinderGeometry(.72, .72, .05, 18), M('#5a9ab0', { roughness: .1 }), x, y + .75, z, { cast: false });
    [-.8, .8].forEach(d => add(new THREE.BoxGeometry(.14, 1.7, .14), W8('#8a6040'), x + d, y + 1.2, z)); add(new THREE.CylinderGeometry(.06, .06, 1.8), W8('#6a4a32'), x, y + 1.7, z, { rz: Math.PI / 2 });
    const rf = new THREE.ConeGeometry(1.25, .7, 4); add(rf, M('#c86a4a'), x, y + 2.35, z, { ry: Math.PI / 4 }); add(new THREE.CylinderGeometry(.18, .15, .28, 10), W8('#a87a52'), x + .1, y + 1.2, z);
    mark('💧', '우물', '물 긷기', x, y + 2.9, z); }
  // ② 퀘스트 게시판
  { const x = 4.2, z = 10.8, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -.5; sc.add(g);
    [-.9, .9].forEach(d => add(new THREE.BoxGeometry(.14, 2.1, .14), W8('#8a6040'), d, 1.05, 0, { p: g })); add(rbox(2.1, 1.3, .1, .05), W8('#b88a5a'), 0, 1.45, 0, { p: g }); add(new THREE.BoxGeometry(2.4, .14, .5), M('#c86a4a'), 0, 2.2, 0, { p: g, rx: .2 });
    [['#fff6e0', -.55, 1.6, .1], ['#ffe0e0', .2, 1.7, -.08], ['#e0f0ff', .6, 1.25, .06], ['#fff6e0', -.3, 1.15, -.05]].forEach(([c, a, b, r]) => add(new THREE.BoxGeometry(.5, .45, .02), M(c), a, b, .06, { p: g, rz: r, cast: false }));
    mark('❗', '퀘스트 게시판', '의뢰 보기 (3)', x, y + 2.8, z); }
  // ③ 잡화점 노점 — 사고팔기
  { const x = -8.6, z = 7.4, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .6; sc.add(g);
    add(rbox(2.6, .9, 1.1, .08), W8('#c8946a'), 0, .45, 0, { p: g }); [-1.2, 1.2].forEach(d => add(new THREE.BoxGeometry(.1, 2.4, .1), W8('#8a6040'), d, 1.2, -.4, { p: g }));
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(.46, .06, 1.4), M(k % 2 ? '#ffffff' : '#7ab0e0'), -1.15 + k * .46, 2.45, -.1, { p: g, rx: .3 });
    [['#e8503a', -.8], ['#ffd27a', -.3], ['#9ccf6a', .25], ['#f2a0b0', .8]].forEach(([c, a]) => { add(rbox(.4, .25, .4, .05), W8('#e8d6b0'), a, 1.02, .1, { p: g }); add(blob(.13, 1), M(c), a, 1.22, .1, { p: g }); });
    mark('🛒', '잡화점', '사고팔기', x, y + 3, z); }
  // ④ 가챠 캡슐 머신
  { const x = 4.8, z = 7.2, y = hgt(x, z);
    add(rbox(.9, 1, .8, .1), M('#ff8aa8'), x, y + .5, z); add(new THREE.SphereGeometry(.55, 18, 14), M('#e8f8ff', { transparent: true, opacity: .55, roughness: .05 }), x, y + 1.45, z, { cast: false });
    for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(.13, 10, 8), M(['#ffd27a', '#7ab8ff', '#ff8a8a', '#a8e08a'][k % 4]), x + (R() - .5) * .6, y + 1.2 + R() * .45, z + (R() - .5) * .5, { cast: false });
    add(new THREE.CylinderGeometry(.14, .14, .08, 14), M('#ffffff'), x, y + .62, z + .41, { rx: Math.PI / 2 }); add(new THREE.SphereGeometry(.15, 12, 8, 0, 6.3, 0, 1.6), M('#ff6a8a'), x, y + 2, z);
    mark('🎁', '캡슐 뽑기', '하루 1번 무료', x, y + 2.6, z); }
  // ⑤ 풍차 방앗간 — 밀가루 만들기
  { const x = 11.5, z = -8.5, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -.8; sc.add(g);
    add(new THREE.CylinderGeometry(1.5, 2, 5, 12), M('#f3e6cf'), 0, 2.5, 0, { p: g }); add(new THREE.ConeGeometry(1.9, 1.6, 12), M('#b4674a'), 0, 5.8, 0, { p: g });
    add(rbox(.9, 1.5, .3, .1), W8('#7a5236'), 0, .9, 1.85, { p: g }); add(new THREE.BoxGeometry(.6, .6, .1), M('#ffd28a', { emissive: '#ffb860', emissiveIntensity: 1 }), 0, 3.4, 1.62, { p: g, cast: false });
    const hub = new THREE.Group(); hub.position.set(0, 4.6, 1.75); hub.rotation.z = .3; g.add(hub); DYN.push(hub); hub.userData.spin = .6; add(new THREE.CylinderGeometry(.22, .22, .4, 12), W8('#6a4a32'), 0, 0, 0, { p: hub, rx: Math.PI / 2 });
    for (let k = 0; k < 4; k++) { const b = new THREE.Group(); b.rotation.z = k * Math.PI / 2; hub.add(b); add(new THREE.BoxGeometry(.12, 3, .08), W8('#8a6040'), 0, 1.6, .1, { p: b }); add(new THREE.BoxGeometry(.75, 2.2, .04), M('#fff6ea'), .42, 1.9, .12, { p: b }); }
    mark('🌾', '풍차 방앗간', '밀가루 만들기', x, y + 7.2, z); }
  // ⑥ 공방 (대장간) — 도구 강화
  { const x = -9.5, z = -7.5, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .7; sc.add(g);
    add(rbox(3.4, .25, 2.8, .06), M('#9a8a78'), 0, .12, 0, { p: g }); [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]].forEach(([a, b]) => add(new THREE.BoxGeometry(.16, 2.4, .16), W8('#7a5236'), a, 1.3, b, { p: g }));
    const rs = new THREE.Shape(); rs.moveTo(-2, 0); rs.lineTo(0, 1); rs.lineTo(2, 0); rs.closePath(); const rgg = new THREE.ExtrudeGeometry(rs, { depth: 3, bevelEnabled: false }); rgg.translate(0, 0, -1.5); add(rgg, M('#6a7a8a'), 0, 2.5, 0, { p: g });
    add(rbox(1, .9, .8, .1), M('#5a5a62'), -.6, .7, -.4, { p: g }); add(new THREE.BoxGeometry(.5, .3, .05), M('#ff8a3a', { emissive: '#ff6a20', emissiveIntensity: 2 }), -.6, .75, .02, { p: g, cast: false });
    const fl = PL('#ff8a40', 3, 4, 1.8); fl.position.set(x, y + .9, z + .4); sc.add(fl);
    add(new THREE.BoxGeometry(.8, .35, .4), M('#4a4a52', { metalness: .5, roughness: .4 }), .7, .95, .2, { p: g }); add(new THREE.CylinderGeometry(.18, .22, .6, 10), W8('#8a6040'), .7, .45, .2, { p: g });
    mark('🔨', '공방', '도구 강화', x, y + 4, z); }
  // ⑦ 언덕 위 전망대 + 망원경
  { const x = 8.5, z = -14.5, y = hgt(x, z);
    add(new THREE.CylinderGeometry(1.6, 1.8, .4, 16), M('#c8bca8'), x, y + .2, z); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; add(new THREE.BoxGeometry(.08, .7, .08), W8('#8a6040'), x + Math.cos(a) * 1.5, y + .75, z + Math.sin(a) * 1.5); }
    add(new THREE.TorusGeometry(1.5, .05, 6, 30), W8('#8a6040'), x, y + 1.1, z, { rx: Math.PI / 2 });
    add(new THREE.CylinderGeometry(.05, .05, 1.1), M('#4a4a52'), x, y + .95, z); add(new THREE.CylinderGeometry(.11, .16, .8, 12), M('#c8a060', { metalness: .6, roughness: .3 }), x + .2, y + 1.55, z, { rz: -1.1 });
    mark('🔭', '전망대', '풍경 사진 찍기', x, y + 2.4, z); }
  // ⑧ 정자 — 책 읽기 · 낮잠
  { const x = -6.5, z = -12.5, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); sc.add(g);
    add(new THREE.CylinderGeometry(2, 2.1, .3, 6), W8('#b88a5a'), 0, .15, 0, { p: g }); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; add(new THREE.CylinderGeometry(.1, .12, 2.4, 8), M('#c86a4a'), Math.cos(a) * 1.7, 1.4, Math.sin(a) * 1.7, { p: g }); }
    add(new THREE.ConeGeometry(2.5, 1.3, 6), M('#4a7a6a'), 0, 3.2, 0, { p: g }); add(new THREE.SphereGeometry(.18, 10, 8), M('#e8c070'), 0, 3.95, 0, { p: g });
    add(rbox(1.4, .1, .9, .04), W8('#c8946a'), 0, .7, 0, { p: g }); [['#e8a090', -.3], ['#7ab0e0', 0], ['#f6d77a', .3]].forEach(([c, a]) => add(new THREE.BoxGeometry(.22, .3, .08), M(c), a, .9, 0, { p: g }));
    mark('📖', '정자', '책 읽기 · 낮잠', x, y + 4.5, z); }
  // ⑨ 사진 스팟 (꽃 아치 프레임)
  { const x = 9.6, z = 3.6, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -1.2; sc.add(g);
    add(rbox(2, 2.4, .14, .5), M('#ffffff'), 0, 1.5, 0, { p: g }); add(rbox(1.6, 2, .2, .4), M('#7fc0d8', { transparent: true, opacity: .15 }), 0, 1.5, 0, { p: g, cast: false });
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI; add(blob(.2, 1), M(['#e8a0b0', '#f6d77a', '#9ccf6a'][k % 3]), Math.cos(a) * 1.05, 1.6 + Math.sin(a) * 1.2, .1, { p: g }); }
    mark('📷', '포토 스팟', '사진 찍기', x, y + 3.2, z); }
  // ⑩ 버스킹 무대
  { const x = -15, z = -12, y = hgt(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = .9; sc.add(g);
    add(rbox(3.6, .45, 2.4, .1), W8('#b88a5a'), 0, .22, 0, { p: g }); add(rbox(3.6, 2.4, .2, .1), M('#8a5a7a'), 0, 1.6, -1.1, { p: g });
    for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(.09, 8, 6), M('#fff2c0', { emissive: '#ffd080', emissiveIntensity: 2.2 }), -1.6 + k * .4, 2.9 - Math.sin(k / 8 * Math.PI) * .2, -1, { p: g, cast: false });
    add(new THREE.CylinderGeometry(.03, .03, 1.2), M('#3a3a42'), .4, 1.05, .3, { p: g }); add(new THREE.SphereGeometry(.08, 8, 6), M('#3a3a42'), .4, 1.7, .3, { p: g });
    add(rbox(.7, .25, .3, .1), M('#c86a4a'), -.8, .6, .3, { p: g, rz: .3 }); add(new THREE.BoxGeometry(.9, .05, .1), W8('#6a4a32'), -.3, .68, .3, { p: g, rz: .3 });
    mark('🎸', '버스킹 무대', '연주하기', x, y + 3.6, z); }
  // ⑪ 꽃 가게 수레 대신 → 요리 화덕 (피자 · 빵)
  { const x = 14.5, z = 1.2, y = hgt(x, z);
    add(new THREE.SphereGeometry(1.1, 18, 12, 0, 6.3, 0, Math.PI / 2), M('#d8b898'), x, y + .5, z); add(new THREE.CylinderGeometry(1.2, 1.2, .5, 18), M('#c8a888'), x, y + .25, z);
    add(new THREE.CircleGeometry(.4, 14, 0, Math.PI), M('#2a1a12', { side: THREE.DoubleSide }), x, y + .5, z + 1.08, { cast: false }); add(new THREE.CylinderGeometry(.15, .15, .8, 10), M('#a89888'), x - .4, y + 1.7, z - .2);
    add(new THREE.ConeGeometry(.2, .3, 8), M('#ffb040', { emissive: '#ff8020', emissiveIntensity: 2.5 }), x, y + .7, z + .9, { cast: false }); const l = PL('#ff9a40', 2.5, 4, 1.8); l.position.set(x, y + .9, z + 1.3); sc.add(l);
    mark('🍞', '화덕', '빵 굽기', x, y + 2.4, z); }
}
// 기존 시설도 상호작용 표시
mark('🌱', '텃밭', '수확 3 · 물주기', 22, 1.8, 4); mark('🛠', '작업대', '제작', 15, 2.6, 5); mark('🐝', '벌통', '꿀 모으기', 29.6, 2, 9.6); mark('🎣', '선착장', '낚시', -20.5, 1.8, 4); mark('🔥', '모닥불', '요리 · 마시멜로', -15.2, 1.6, 5.4);
mark('⛺', '텐트', '저장 · 잠자기', -14.2, 2.6, 2); mark('🐟', '아쿠아리움', '들어가기', -1, 8.8, -20); mark('🕳', '지하실', '내려가기', 2.6, 1.8, -5.6); mark('🏠', '오두막', '들어가기 · 꾸미기', 1.5, 6.6, -2.6);
mark('💌', '우체통', '편지 2통', 3.6, 1.9, 1.6); mark('🐈', '고양이', '쓰다듬기', -2.9, 1, 2.2); mark('🧺', '피크닉', '앉기 · 간식', -4.2, 1, 5.6); mark('🌿', '해먹', '쉬기', 10.7, 2, 10.3); mark('🐦', '새집', '먹이 주기', -6.8, 3.6, .6); mark('🪧', '이정표', '빠른 이동', 2.2, 2.6, 12.2);

// ================= 충돌 (건물 · 시설) =================
box(1.5, -2.6, 2.6, 1.9); hit(2.6, -5.6, 1.2);                          // 오두막 · 지하실
hit(-1, -20, 6.5); box(-1, -14.2, 1.3, .5); hit(-1, -10.4, 1.35);       // 아쿠아리움 · 입구 · 분수
ell(6.2, 3.8, 2.7, 2.15); box(6.2, 8.4, 3.1, .12);                       // 연못 · 울타리
hit(3.6, 1.6, .35); hit(4.8, -1.2, .7); [[-2.6, 3.2], [-2.6, -.2], [4.6, 1.2]].forEach(([x, z]) => hit(x, z, .18));
[[-1.3, 10.2], [2.2, 5.5], [1.9, 12.4], [-1.8, 3.2], [2.4, 9]].forEach(([x, z]) => hit(x, z, .18));
hit(-1.6, 7.4, .2); hit(1.0, 7.4, .2);                                   // 아치 기둥
[[17.8, 3], [22.6, 3], [17.8, 6.2], [22.6, 6.2]].forEach(([x, z]) => box(x, z, 1.05, 1.25));   // 텃밭 틀
box(27.5, .5, 1.85, 2.35, -.35); hit(15, 5, 1.2); hit(25, 9.1, .8); hit(21.8, -.8, .35); box(21.6, -2.8, 6.8, .12);
hit(20.4, 10.4, .3);
ell(-22, 0, 8.4, 6.8);                                                   // 호수 (선착장은 따로 걸을 수 있음)
hit(-28.5, 5.5, .7); hit(-15.2, 5.4, .8); hit(-16.6, 5.7, .5); hit(-13.9, 4.9, .5); hit(-13.9, 2.4, 1.4);
hit(-7.2, -1.6, 1.05); box(4.2, 10.8, 1.1, .25, -.5); box(-8.6, 7.4, 1.35, .65, .6); hit(4.8, 7.2, .6);
hit(11.5, -8.5, 2.1); box(-9.5, -7.5, 1.75, 1.45, .7); hit(8.5, -14.5, 1.85);
for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; hit(-6.5 + Math.cos(a) * 1.7, -12.5 + Math.sin(a) * 1.7, .2); } hit(-6.5, -12.5, .85);
box(9.6, 3.6, 1.05, .2, -1.2); box(-15, -12, 1.85, 1.25, .9); hit(14.5, 1.2, 1.3);
[[29, 9.5], [30.2, 9.8]].forEach(([x, z]) => hit(x, z, .5)); hit(15.6, 10.5, .65); hit(16.6, 9.6, .65); box(17.5, -2, 1.05, 1.1);
hit(-6.8, .6, .15); hit(5.2, .6, .4); hit(5.6, -.6, .55); hit(-2.9, 2.2, .45); hit(-3.6, 5.3, .4);
// 걸을 수 있는 발판 (높이)
const PLAT = [{ x0: -21.45, x1: -19.55, z0: 2.6, z1: 7.65, y: .37 }, { x0: -.5, x1: 2.9, z0: -.75, z1: .55, y: .65 }];
const groundY = (x, z) => { for (const p of PLAT) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return p.y; return hgt(x, z); };
const onDock = (x, z) => x > -21.45 && x < -19.55 && z > 2.6 && z < 7.65;
// 충돌 밀어내기 (반지름 rad 캐릭터)
function collide(p, rad) {
  const lim = 43, d0 = Math.hypot(p.x, p.z - 2); if (d0 > lim) { p.x *= lim / d0; p.z = 2 + (p.z - 2) * lim / d0; }
  for (const c of COLS) {
    if (c.t === 'c') { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + rad; if (d < m && d > 1e-5) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
    else if (c.t === 'e') { if (onDock(p.x, p.z)) continue; const dx = (p.x - c.x) / (c.rx + rad), dz = (p.z - c.z) / (c.rz + rad), d = Math.hypot(dx, dz); if (d < 1 && d > 1e-5) { p.x = c.x + dx / d * (c.rx + rad); p.z = c.z + dz / d * (c.rz + rad); } }
    else { const cs = Math.cos(c.ry), sn = Math.sin(c.ry), dx = p.x - c.x, dz = p.z - c.z, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs, hw = c.hw + rad, hd = c.hd + rad;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) { let nx = lx, nz = lz; if (hw - Math.abs(lx) < hd - Math.abs(lz)) nx = Math.sign(lx || 1) * hw; else nz = Math.sign(lz || 1) * hd; p.x = c.x + nx * cs + nz * sn; p.z = c.z - nx * sn + nz * cs; } }
  }
}

// ================= 하늘 · 빛 (시간대에 따라 바뀜) =================
const skyG = new THREE.SphereGeometry(150, 32, 16), skyP = skyG.attributes.position, skyC = new Float32Array(skyP.count * 3);
skyG.setAttribute('color', new THREE.BufferAttribute(skyC, 3));
const sky = new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); sc.add(sky);
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff0cc', fog: false })); sc.add(sunDisc);
const stars = new THREE.Group(); sc.add(stars);
{ const g = new THREE.SphereGeometry(.22, 6, 4), m = new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false, transparent: true });
  const pts = []; for (let k = 0; k < 240; k++) { const a = Math.random() * 6.28, e = .12 + Math.random() * .85, rr = 140; pts.push(new THREE.Matrix4().makeTranslation(Math.cos(a) * Math.cos(e) * rr, Math.sin(e) * rr, Math.sin(a) * Math.cos(e) * rr)); }
  const im = new THREE.InstancedMesh(g, m, pts.length); pts.forEach((p, i) => im.setMatrixAt(i, p)); stars.add(im); stars.userData.m = m; }
const hemi = new THREE.HemisphereLight('#ffe8c8', '#6a7a4a', 1.0); sc.add(hemi);
const sun = new THREE.DirectionalLight('#ffc98a', 3.0); sun.castShadow = true;
const SM = opt.low ? 1024 : 2048; sun.shadow.mapSize.set(SM, SM); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sc.add(sun); sc.add(sun.target);
const fill = new THREE.DirectionalLight('#b8c8ff', .35); fill.position.set(10, 6, 14); sc.add(fill);
sc.fog = new THREE.Fog('#f2cfa6', 22, 80);
// 반딧불 (밤)
const flies = new THREE.Group(); sc.add(flies);
{ const g = new THREE.SphereGeometry(.05, 6, 5), m = new THREE.MeshBasicMaterial({ color: '#fff2a0', transparent: true });
  for (let k = 0; k < 70; k++) { const f = new THREE.Mesh(g, m); const ar = [[-22, 2, 12], [0, 4, 10], [22, 4, 8], [-8, -10, 8]][k % 4]; f.userData.o = [ar[0] + (Math.random() - .5) * ar[2] * 2, .5 + Math.random() * 2.4, ar[1] + (Math.random() - .5) * ar[2] * 2, Math.random() * 6]; flies.add(f); }
  flies.userData.m = m; }
// 밤에 켜는 실제 점조명 (가까운 등불 위치로 옮겨 다님)
const nightLights = [0, 1, 2].map(() => { const l = new THREE.PointLight('#ffb870', 0, 7, 1.6); sc.add(l); return l; });

// 시간대 팔레트: [시각, 하늘위, 하늘중, 하늘아래, 안개, 해색, 해세기, 반구위, 반구아래, 반구세기, 등불배수]
const KEYS = [
  [0, '#0b1230', '#1e2a58', '#3a3a6a', '#1c2446', '#8aa0ff', .5, '#5a6aa8', '#141c28', .45, 1.6],
  [5, '#2a3a6a', '#8a7aa8', '#f0a890', '#7a7090', '#ffb090', 1.0, '#9a90b8', '#3a3a40', .6, 1.2],
  [7, '#8fc0e8', '#f6dcc0', '#ffd8b0', '#f0dcc4', '#ffe0b0', 2.6, '#ffeeda', '#7a8a5a', .95, 0.35],
  [12, '#6fb0ea', '#bcdcf2', '#e8f0f0', '#d8e6ee', '#fff6e6', 3.4, '#ffffff', '#7a8a5a', 1.05, 0.2],
  [16, '#8ab8e0', '#e8dcc8', '#f8dcb8', '#ecdcc4', '#ffe2b8', 3.0, '#fff0dc', '#7a8a5a', 1.0, 0.3],
  [18, '#8fb4d8', '#f6d2a8', '#ffc59a', '#f2cfa6', '#ffc98a', 3.0, '#ffe8c8', '#6a7a4a', 1.0, 0.6],
  [19.5, '#3a4a86', '#c08aa0', '#ff9a7a', '#a8809a', '#ff9a6a', 1.6, '#c8a0b8', '#3a3a3a', .75, 1.1],
  [21, '#0e1636', '#2a3466', '#5a4a78', '#242c52', '#9ab0ff', .9, '#6a7ab8', '#1a2430', .55, 1.6],
  [24, '#0b1230', '#1e2a58', '#3a3a6a', '#1c2446', '#8aa0ff', .5, '#5a6aa8', '#141c28', .45, 1.6]];
const tc = new THREE.Color(), tA = new THREE.Color(), tB = new THREE.Color();
const lerpC = (a, b, t) => tA.set(a).lerp(tB.set(b), t).clone();
let EMIS = [], lastSky = -1;
function setTime(h, focus) {
  h = ((h % 24) + 24) % 24; let i = 0; while (KEYS[i + 1][0] <= h) i++; const A = KEYS[i], B = KEYS[i + 1], t = (h - A[0]) / (B[0] - A[0]);
  const top = lerpC(A[1], B[1], t), mid = lerpC(A[2], B[2], t), low = lerpC(A[3], B[3], t);
  if (Math.abs(h - lastSky) > .02) { lastSky = h; for (let k = 0; k < skyP.count; k++) { const y = skyP.getY(k) / 150; tc.copy(y > .15 ? mid.clone().lerp(top, Math.min(1, (y - .15) / .6)) : low.clone().lerp(mid, Math.max(0, (y + .1) / .25))); skyC.set([tc.r, tc.g, tc.b], k * 3); } skyG.attributes.color.needsUpdate = true; }
  sc.fog.color.copy(lerpC(A[4], B[4], t));
  sun.color.copy(lerpC(A[5], B[5], t)); sun.intensity = A[6] + (B[6] - A[6]) * t;
  hemi.color.copy(lerpC(A[7], B[7], t)); hemi.groundColor.copy(lerpC(A[8], B[8], t)); hemi.intensity = A[9] + (B[9] - A[9]) * t;
  const lampK = A[10] + (B[10] - A[10]) * t; EMIS.forEach(([m, base]) => m.emissiveIntensity = base * lampK);
  const night = Math.max(0, Math.min(1, (lampK - .7) / .9));
  // 해(낮)·달(밤) 위치: 하루 동안 하늘을 가로지름
  const dayA = (h - 6) / 12 * Math.PI, isDay = h > 5.5 && h < 19.8;
  const dir = isDay ? new THREE.Vector3(-Math.cos(dayA) * .9, Math.max(.18, Math.sin(dayA)) * .75, -.55) : new THREE.Vector3(.5, .7, -.6);
  dir.normalize(); sunDisc.position.copy(dir).multiplyScalar(118); sunDisc.material.color.set(isDay ? '#fff0cc' : '#fffbe8'); sunDisc.scale.setScalar(isDay ? 1 : .7);
  const f = focus || new THREE.Vector3(); sun.position.copy(f).addScaledVector(dir, 40); sun.target.position.copy(f);
  stars.userData.m.opacity = night; stars.visible = night > .02; flies.userData.m.opacity = night; flies.visible = night > .02;
  nightLights.forEach(l => l.intensity = 0);
  if (night > .05 && focus) { const near = LAMPS.slice().sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus)).slice(0, nightLights.length);
    near.forEach((o, k) => { const l = nightLights[k]; l.position.copy(o.position); l.color.set(o.userData.lamp.color); l.intensity = Math.min(9, o.userData.lamp.power * 1.4) * night; }); }
  return { night, h };
}

// ================= 정적 메쉬 합치기 (그리는 횟수 줄이기) =================
sc.updateMatrixWorld(true);
const dynSet = new Set(DYN), groups = new Map(), kill = [];
const isDyn = o => { for (let p = o; p; p = p.parent) if (dynSet.has(p)) return true; return false; };
sc.traverse(o => {
  if (!o.isMesh || o.isInstancedMesh || o === ground || isDyn(o) || !o.material.isMeshStandardMaterial || o.material.vertexColors) return;
  const m = o.material, key = [m.color.getHexString(), m.emissive.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, m.transparent, m.opacity, m.side, o.castShadow].join('|');
  let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  g.clearGroups(); g.applyMatrix4(o.matrixWorld);
  if (!groups.has(key)) groups.set(key, { m, cast: o.castShadow, list: [] }); groups.get(key).list.push(g); kill.push(o);
});
kill.forEach(o => o.parent.remove(o));
for (const { m, cast, list } of groups.values()) {
  const mm = new THREE.Mesh(mergeGeometries(list, false), m); mm.castShadow = cast; mm.receiveShadow = true; mm.matrixAutoUpdate = false; sc.add(mm);
  if (m.emissiveIntensity > 0 && m.emissive.getHex() !== 0) EMIS.push([m, m.emissiveIntensity]); list.forEach(g => g.dispose());
}
DYN.forEach(o => o.traverse(c => { if (c.isMesh && c.material.emissive && c.material.emissive.getHex() !== 0 && !EMIS.some(e => e[0] === c.material)) EMIS.push([c.material, c.material.emissiveIntensity]); }));
if (FIRE && !EMIS.some(e => e[0] === FIRE)) EMIS.push([FIRE, FIRE.emissiveIntensity]);
console.log('[world] merged', kill.length, 'meshes into', groups.size, 'draws; colliders', COLS.length);

function tick(t, dt) {
  for (const o of DYN) { const u = o.userData;
    if (u.spin) o.rotation.z += u.spin * dt;
    if (u.swim) { u.swim[0] += dt * u.swim[3]; o.position.set(Math.cos(u.swim[0]) * u.swim[1], u.swim[2] + Math.sin(t * 1.3 + u.swim[1]) * .15, Math.sin(u.swim[0]) * u.swim[1]); o.rotation.y = -u.swim[0] - Math.PI / 2; }
    if (u.fly) { const [x, y, z, ph] = u.fly; o.position.set(x + Math.sin(t * .5 + ph) * 1.4, y + Math.sin(t * 2.1 + ph) * .25, z + Math.cos(t * .4 + ph) * 1.2); o.children.forEach((w, i) => w.rotation.y = (i ? 1 : -1) * (.3 + Math.abs(Math.sin(t * 14 + ph)) * 1.1)); o.rotation.y = t * .5 + ph + Math.PI / 2; }
  }
  if (flies.visible) flies.children.forEach(f => { const [x, y, z, ph] = f.userData.o; f.position.set(x + Math.sin(t * .6 + ph) * .8, y + Math.sin(t * 1.1 + ph * 2) * .4, z + Math.cos(t * .5 + ph) * .8); });
  if (FIRE) FIRE.emissiveIntensity *= .92 + Math.random() * .16;
}
return { hgt, groundY, collide, INTER, setTime, tick, onDock, COLS, AREAS, TREES, ROCKS };
}
