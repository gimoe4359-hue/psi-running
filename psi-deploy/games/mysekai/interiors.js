// 들어갈 수 있는 실내: 아쿠아리움 바다 터널 · 집 지하실
import * as THREE from 'three';

const MC = {};
const M = (c, o = {}) => { const k = c + JSON.stringify(o); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, roughness: .9, ...o })); };
function mk(sc) {
  const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.s) m.scale.set(...o.s); (o.p || sc).add(m); return m; };
  return add;
}
function rbox(w, h, d, rad = .12) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + rad, y); s.lineTo(x + w - rad, y); s.quadraticCurveTo(x + w, y, x + w, y + rad); s.lineTo(x + w, y + h - rad); s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h); s.lineTo(x + rad, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rad); s.lineTo(x, y + rad); s.quadraticCurveTo(x, y, x + rad, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, d - rad * 2), bevelEnabled: true, bevelSize: rad, bevelThickness: rad, bevelSegments: 3, curveSegments: 5 }); g.translate(0, 0, -(d - rad * 2) / 2); return g; }
const blob = (r0, det = 2) => { const g = new THREE.IcosahedronGeometry(r0, det), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + .07 * Math.sin(v.x * 5.1 + v.y * 3.3)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
const clampBox = (p, x0, x1, z0, z1) => { p.x = Math.max(x0, Math.min(x1, p.x)); p.z = Math.max(z0, Math.min(z1, p.z)); };
function circ(p, x, z, r) { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz); if (d < r && d > 1e-5) { p.x = x + dx / d * r; p.z = z + dz / d * r; } }
function boxC(p, x, z, hw, hd) { const dx = p.x - x, dz = p.z - z; if (Math.abs(dx) < hw && Math.abs(dz) < hd) { if (hw - Math.abs(dx) < hd - Math.abs(dz)) p.x = x + Math.sign(dx || 1) * hw; else p.z = z + Math.sign(dz || 1) * hd; } }

// ================= 아쿠아리움 · 바다 터널 =================
export function buildAquarium() {
  const sc = new THREE.Scene(), add = mk(sc); let R0 = 3; const R = () => (R0 = (R0 * 16807) % 2147483647) / 2147483647;
  sc.background = new THREE.Color('#06142a'); sc.fog = new THREE.Fog('#0a2a48', 10, 34);
  sc.add(new THREE.HemisphereLight('#6ab8e8', '#0a1828', 1.0));
  const top = new THREE.DirectionalLight('#9ad8ff', 1.8); top.position.set(2, 14, -4); top.castShadow = true; top.shadow.mapSize.set(1024, 1024); Object.assign(top.shadow.camera, { left: -8, right: 8, top: 14, bottom: -14 }); sc.add(top);
  { const f = new THREE.PointLight('#8ac8ff', 10, 14, 1.4); f.position.set(0, 3, 4); sc.add(f); }
  add(new THREE.PlaneGeometry(14, 30), M('#1e3246', { roughness: .55 }), 0, 0, -3, { rx: -Math.PI / 2, cast: false });
  for (let z = -12; z < 6; z += 1.2) add(new THREE.BoxGeometry(5.6, .02, .05), M('#2e4a62'), 0, .011, z, { cast: false });
  const water = new THREE.MeshStandardMaterial({ color: '#1f78b0', emissive: '#0c4a7a', emissiveIntensity: .9, roughness: .1, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false });
  add(new THREE.CylinderGeometry(6, 6, 22, 40, 1, true, -Math.PI / 2, Math.PI), water, 0, 0, -3, { rx: Math.PI / 2, rz: Math.PI / 2, cast: false, s: [1, 1, .85] });
  for (let k = 0; k < 7; k++) add(new THREE.TorusGeometry(6, .07, 8, 40, Math.PI), M('#c8d8e0', { metalness: .5, roughness: .3 }), 0, 0, -12 + k * 3.4, { cast: false, s: [1, .85, 1] });
  // 끝 벽 (깊은 바다 그림) · 입구 벽
  add(new THREE.CircleGeometry(6, 40, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#0a2a50' }), 0, 0, -14, { cast: false, s: [1, .85, 1] });
  add(new THREE.CircleGeometry(6, 40, 0, Math.PI), M('#e8e0d0'), 0, 0, 8, { cast: false, ry: Math.PI, s: [1, .85, 1] });
  // 출구 (한쪽 면만 보이는 판 → 뒤에서 카메라를 가리지 않음)
  add(new THREE.PlaneGeometry(1.8, 2.6), M('#3a6a88', { emissive: '#2a5a7a', emissiveIntensity: .5 }), 0, 1.3, 7.95, { cast: false, ry: Math.PI });
  add(new THREE.PlaneGeometry(1.4, .3), M('#fff6e0', { emissive: '#ffe0a0', emissiveIntensity: 1.2 }), 0, 2.9, 7.94, { cast: false, ry: Math.PI });
  for (let k = 0; k < 40; k++) { const side = k % 2 ? 1 : -1, x = side * (4.4 + R() * 1), z = -12 + R() * 18; add(blob(.3 + R() * .5, 1), M(['#ff8a7a', '#ffb06a', '#e86ab0', '#f6d06a'][k % 4], { emissive: '#ff6a5a', emissiveIntensity: .15 }), x, .3 + R() * 1.2, z); }
  for (let k = 0; k < 30; k++) { const side = k % 2 ? 1 : -1; add(new THREE.ConeGeometry(.12, 1.6 + R() * 1.8, 5), M('#2ab08a', { emissive: '#108a6a', emissiveIntensity: .3 }), side * (4 + R() * 1.6), 1, -12 + R() * 18, { rz: (R() - .5) * .3, cast: false }); }
  // 물고기 떼 (작은 물고기들)
  const school = [], fishCol = ['#ffb04a', '#ffe06a', '#7ad0ff', '#ff7ab0', '#b8f0ff'];
  for (let k = 0; k < 60; k++) { const a = R() * Math.PI, rr = 4.2 + R() * 1.3; const f = new THREE.Group(); f.scale.setScalar(.4 + R() * .4); sc.add(f); const col = fishCol[k % 5];
    add(new THREE.SphereGeometry(.28, 12, 8), M(col, { emissive: col, emissiveIntensity: .35 }), 0, 0, 0, { p: f, s: [1.5, .8, .45], cast: false }); add(new THREE.ConeGeometry(.18, .32, 6), M(col, { emissive: col, emissiveIntensity: .35 }), -.48, 0, 0, { p: f, rz: Math.PI / 2, cast: false });
    school.push({ f, a, rr, z: -12 + R() * 16, sp: (.6 + R()) * (R() < .5 ? 1 : -1), ph: R() * 6 }); }
  const ray = new THREE.Group(); sc.add(ray);
  add(new THREE.SphereGeometry(1, 20, 10), M('#4a6a8a', { emissive: '#2a4a6a', emissiveIntensity: .4 }), 0, 0, 0, { p: ray, s: [1.8, .18, 1.2], cast: false }); add(new THREE.CylinderGeometry(.02, .05, 2.4), M('#4a6a8a'), 0, 0, -1.8, { p: ray, rx: Math.PI / 2, cast: false });
  const jellies = []; for (let k = 0; k < 6; k++) { const j = new THREE.Group(); j.position.set((R() < .5 ? -1 : 1) * (3.2 + R() * 1.5), 3 + R() * 1.6, -10 + R() * 12); sc.add(j); jellies.push(j);
    add(new THREE.SphereGeometry(.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f0c8ff', emissive: '#d080ff', emissiveIntensity: 1.2, transparent: true, opacity: .7 }), 0, 0, 0, { p: j, cast: false });
    for (let t = 0; t < 5; t++) add(new THREE.CylinderGeometry(.015, .005, .9), M('#f0c8ff', { emissive: '#d080ff', emissiveIntensity: 1 }), (t - 2) * .12, -.45, 0, { p: j, cast: false }); }
  const caus = []; for (let k = 0; k < 50; k++) caus.push(add(new THREE.CircleGeometry(.2 + R() * .5, 12), new THREE.MeshBasicMaterial({ color: '#8ad8ff', transparent: true, opacity: .12 + R() * .1, depthWrite: false }), (R() - .5) * 7, .015, -12 + R() * 18, { rx: -Math.PI / 2, cast: false }));
  for (let k = 0; k < 4; k++) { const l = new THREE.PointLight('#4ab0ff', 6, 12, 1.5); l.position.set(k % 2 ? 3.5 : -3.5, 3, -9 + k * 4); sc.add(l); }
  // 벤치 · 안내판
  add(rbox(2.4, .2, .7, .08), M('#c8b8a0'), 0, .5, 2.6); [-1, 1].forEach(x => add(rbox(.2, .5, .6, .05), M('#8a8a90'), x, .25, 2.6));
  add(rbox(1.3, 1.6, .12, .06), M('#f3ecdc'), 3.2, 1.2, 5.6, { ry: -.6 }); add(new THREE.BoxGeometry(.08, 1.2, .08), M('#8a8a90'), 3.2, .4, 5.6);
  add(new THREE.BoxGeometry(1.1, .3, .02), M('#3a6a88'), 3.2, 1.75, 5.68, { ry: -.6, cast: false });
  // 기증한 물고기 전시 (송천동 물고기 그림이 터널 밖에서 헤엄침)
  const show = new THREE.Group(); sc.add(show); let shown = [];
  function setDonated(list, fishCanvas) {
    show.clear(); shown = [];
    list.forEach((f, i) => { const tex = new THREE.CanvasTexture(fishCanvas(f, 256, 160)); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); const big = f.shape === 'whale' || f.shape === 'shark' ? 3.2 : f.r >= 3 ? 2.2 : 1.6; sp.scale.set(big, big * .62, 1); show.add(sp);
      shown.push({ sp, a: .3 + (i * .37) % 2.5, z: -11 + (i * 2.7) % 15, sp0: (.25 + (i % 3) * .12) * (i % 2 ? 1 : -1), r: 4.6 + (i % 2) * .6, big }); });
  }
  function tick(t, dt) {
    for (const s of school) { s.z += s.sp * dt; if (s.z > 5) s.z = -12; if (s.z < -12) s.z = 5; const a = s.a + Math.sin(t * .3 + s.ph) * .08; s.f.position.set(Math.cos(a) * s.rr, Math.sin(a) * s.rr * .85, s.z); s.f.rotation.y = s.sp > 0 ? -Math.PI / 2 : Math.PI / 2; }
    ray.position.set(Math.sin(t * .15) * 2.5, 5 + Math.sin(t * .4) * .3, -4 + Math.sin(t * .11) * 6); ray.rotation.set(.15, t * .15 + Math.PI / 2, Math.sin(t * .8) * .15); ray.children[0].scale.y = .18 + Math.sin(t * 2) * .03;
    jellies.forEach((j, i) => { j.position.y = 3.2 + Math.sin(t * .7 + i) * .5; j.scale.y = 1 + Math.sin(t * 2.4 + i) * .12; });
    caus.forEach((c, i) => { c.material.opacity = .08 + .1 * (.5 + .5 * Math.sin(t * 1.3 + i)); });
    for (const s of shown) { s.z += s.sp0 * dt * 2; if (s.z > 5) s.sp0 = -Math.abs(s.sp0); if (s.z < -12) s.sp0 = Math.abs(s.sp0); const a = s.a + Math.sin(t * .4 + s.z) * .1; s.sp.position.set(Math.cos(a) * s.r * (a > Math.PI / 2 ? 1 : 1), Math.sin(a) * s.r * .85, s.z); s.sp.scale.x = (s.sp0 > 0 ? 1 : -1) * s.big; }
  }
  return {
    scene: sc, name: '아쿠아리움 · 바다 터널', icon: '🐟', spawn: [0, 5.4, Math.PI], camD: 5.4, camP: .3, dark: false, tick, setDonated,
    ground: () => 0,
    collide(p, r) { clampBox(p, -3.4 + r, 3.4 - r, -12 + r, 7.4 - r); boxC(p, 0, 2.6, 1.2 + r, .35 + r); circ(p, 3.2, 5.6, .3 + r); },
    cam(c) { c.y = Math.min(c.y, 4.6); c.x = Math.max(-4.5, Math.min(4.5, c.x)); c.z = Math.max(-13, Math.min(11, c.z)); },
    spots: [['🚪', '출구', '밖으로 나가기', 0, 7.5, 1.4, 'exit'], ['🪑', '벤치', '앉아서 구경하기', 0, 2.6, 1.6, 'bench'], ['📋', '기증 안내판', '물고기 기증 · 전시', 3.2, 5.6, 1.4, 'donate'], ['🐠', '터널 끝', '물고기 구경하기', 0, -11, 2, 'watch']],
    bench: [0, 2.6, Math.PI]
  };
}

// ================= 집 지하실 =================
export function buildCellar() {
  const sc = new THREE.Scene(), add = mk(sc); let R0 = 3; const R = () => (R0 = (R0 * 16807) % 2147483647) / 2147483647;
  sc.background = new THREE.Color('#050505'); sc.fog = new THREE.Fog('#0a0806', 5, 14);
  sc.add(new THREE.HemisphereLight('#6a7a5a', '#1a1410', .9)); { const f = new THREE.PointLight('#7a8a6a', 2.5, 8, 1.6); f.position.set(1.5, 2.4, 2.5); sc.add(f); }
  const RW = 6, RD = 6, RH = 3.2;
  add(new THREE.PlaneGeometry(RW, RD), M('#3a3630', { roughness: 1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { add(rbox(.66 + R() * .02, .34, .2, .03), M(['#4a4440', '#52483f', '#3e3834'][(x + y) % 3]), -RW / 2 + .33 + x * .67 + (y % 2) * .33, .18 + y * .36, -RD / 2, { cast: false }); add(rbox(.2, .34, .66, .03), M(['#4a4440', '#52483f', '#3e3834'][(x + y + 1) % 3]), -RW / 2, .18 + y * .36, -RD / 2 + .33 + x * .67 + (y % 2) * .33, { cast: false }); add(rbox(.2, .34, .66, .03), M(['#4a4440', '#52483f', '#3e3834'][(x + y) % 3]), RW / 2, .18 + y * .36, -RD / 2 + .33 + x * .67 + (y % 2) * .33, { cast: false }); }
  add(new THREE.PlaneGeometry(RW, RD), M('#2a2622'), 0, RH, 0, { rx: Math.PI / 2, cast: false });
  [[.4, .2, 1.1], [-1.2, -1.4, .7], [1.6, -2, .5]].forEach(([x, z, s2]) => add(new THREE.CircleGeometry(s2, 20), new THREE.MeshBasicMaterial({ color: '#1a1410', transparent: true, opacity: .55 }), x, .01, z, { rx: -Math.PI / 2, cast: false }));
  add(new THREE.CylinderGeometry(.22, .22, .02, 16), M('#2a2a2a', { metalness: .6, roughness: .5 }), .2, .015, -.3, { cast: false });
  // 흔들리는 전구
  const lamp = new THREE.Group(); lamp.position.set(-.2, RH, -.4); sc.add(lamp);
  add(new THREE.CylinderGeometry(.01, .01, 1), M('#111'), 0, -.5, 0, { p: lamp, cast: false });
  const bulbM = M('#fff2c0', { emissive: '#ffcf70', emissiveIntensity: 3 }); add(new THREE.SphereGeometry(.11, 14, 10), bulbM, 0, -1.05, 0, { p: lamp, cast: false });
  const bulb = new THREE.SpotLight('#ffcf80', 30, 9, .9, .6, 1.6); bulb.position.set(-.2, RH - 1.1, -.4); bulb.target.position.set(-.2, 0, -.4); bulb.castShadow = true; bulb.shadow.mapSize.set(1024, 1024); sc.add(bulb); sc.add(bulb.target);
  const bl2 = new THREE.PointLight('#ffb860', 1.8, 5, 2); bl2.position.copy(bulb.position); sc.add(bl2);
  function chair(x, z, ry) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; sc.add(c);
    add(new THREE.BoxGeometry(.7, .08, .7), M('#4a3a2c'), 0, .55, 0, { p: c }); [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]].forEach(([a, b]) => add(new THREE.BoxGeometry(.07, .55, .07), M('#3a2c22'), a, .27, b, { p: c }));
    add(new THREE.BoxGeometry(.7, .8, .07), M('#4a3a2c'), 0, .98, -.32, { p: c }); [-.36, .36].forEach(dx => add(new THREE.BoxGeometry(.06, .06, .7), M('#5a5a5a', { metalness: .6, roughness: .5 }), dx, .72, 0, { p: c })); return c; }
  chair(-1.1, -.4, Math.PI / 2 + .1); chair(.8, -.6, -Math.PI / 2 + .25);
  const desk = new THREE.Group(); desk.position.set(-.2, 0, -2.1); sc.add(desk);
  add(new THREE.BoxGeometry(1.4, .06, .7), M('#3e3026'), 0, .78, 0, { p: desk }); [[-.62, -.28], [.62, -.28], [-.62, .28], [.62, .28]].forEach(([a, b]) => add(new THREE.BoxGeometry(.06, .78, .06), M('#2e241c'), a, .39, b, { p: desk }));
  add(new THREE.BoxGeometry(.32, .01, .42), M('#c8bca0'), -.3, .815, .05, { p: desk, ry: .2, cast: false }); add(new THREE.BoxGeometry(.3, .01, .4), M('#d8ccb0'), -.15, .82, -.05, { p: desk, ry: -.15, cast: false });
  add(new THREE.CylinderGeometry(.06, .07, .02, 10), M('#2a2420'), .5, .82, -.2, { p: desk }); add(new THREE.CylinderGeometry(.015, .015, .14), M('#f0e6d0'), .5, .9, -.2, { p: desk }); const candle = add(new THREE.SphereGeometry(.025, 8, 6), M('#ffd080', { emissive: '#ffa040', emissiveIntensity: 3 }), .5, .99, -.2, { p: desk, cast: false });
  for (let k = 0; k < 9; k++) add(new THREE.TorusGeometry(.06, .015, 6, 10), M('#4a4a4a', { metalness: .7, roughness: .5 }), -2.88, 2.1 - k * .1, -1.2, { ry: k % 2 ? Math.PI / 2 : 0 });
  add(new THREE.CylinderGeometry(.07, .07, RD), M('#5a4a3a', { metalness: .5, roughness: .7 }), 2.85, RH - .35, 0, { rx: Math.PI / 2 });
  // 계단 (위에서 빛이 새어 듦)
  for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(1.2, .25, .4), M('#4a4440'), 2.2, .12 + k * .25, 1.2 + k * .38 - 2.6 + 2.6, { });
  const door = new THREE.SpotLight('#ffcf9a', 14, 8, .5, .8, 1.5); door.position.set(2.2, RH + .5, 2.6); door.target.position.set(2.2, 0, 1.2); sc.add(door); sc.add(door.target);
  const dust = []; for (let k = 0; k < 60; k++) dust.push(add(new THREE.SphereGeometry(.012, 4, 3), new THREE.MeshBasicMaterial({ color: '#ffe8c0', transparent: true, opacity: .5 }), (R() - .5) * 3, .5 + R() * 2.4, (R() - .5) * 3, { cast: false }));
  // 보랏빛 조각 (밤에만 반짝)
  const frag = add(new THREE.OctahedronGeometry(.08), M('#c8a0ff', { emissive: '#a060ff', emissiveIntensity: 2 }), -1.9, .1, 1.6, { cast: false }); frag.visible = false;
  function tick(t, dt) { lamp.rotation.z = Math.sin(t * .9) * .12; lamp.rotation.x = Math.sin(t * .7) * .06; bulb.position.set(-.2 + Math.sin(t * .9) * -.13, RH - 1.1, -.4 + Math.sin(t * .7) * .07); bulbM.emissiveIntensity = Math.random() < .02 ? .3 : 3; bulb.intensity = bulbM.emissiveIntensity > 1 ? 30 : 4;
    dust.forEach((d, i) => { d.position.y += Math.sin(t + i) * .0015; }); candle.scale.setScalar(.9 + Math.random() * .2); frag.rotation.y = t * 2; frag.position.y = .12 + Math.sin(t * 3) * .03; }
  return {
    scene: sc, name: '집 지하 · ???', icon: '🕳', spawn: [2.2, 1.0, Math.PI], camD: 4.6, camP: .8, dark: true, tick, frag,
    ground: (x, z) => (x > 1.6 && x < 2.8 && z > .5) ? Math.min(1.5, (z - .5) / 2.3 * 1.5) : 0,
    collide(p, r) { clampBox(p, -2.75 + r, 2.75 - r, -2.75 + r, 2.75 - r); circ(p, -1.1, -.4, .42 + r); circ(p, .8, -.6, .42 + r); boxC(p, -.2, -2.1, .72 + r, .38 + r); },
    cam(c) { c.y = Math.min(c.y, 4.8); c.x = Math.max(-2.7, Math.min(2.7, c.x)); c.z = Math.max(-2.7, Math.min(6, c.z)); },
    spots: [['🪜', '계단', '위로 올라가기', 2.2, 2.3, 1.2, 'exit'], ['📜', '책상', '쪽지 읽기', -.2, -1.5, 1.2, 'desk'], ['🪑', '의자', '앉기', -1.1, -.4, 1.1, 'chair'], ['✨', '반짝이는 것', '줍기', -1.9, 1.6, 1.0, 'frag']],
    chairs: { chair: [-1.1, -.4, Math.PI / 2 + .1] }
  };
}
