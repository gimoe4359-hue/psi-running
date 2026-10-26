// 들어갈 수 있는 실내: 아쿠아리움 바다 터널 · 집 지하실
import * as THREE from 'three';
import { RoomEnvironment } from './lib/jsm/environments/RoomEnvironment.js';
import { FISH as FISH3, RAR as RAR3, makeFish } from './fishg.js';

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

// ================= 아쿠아리움 · 송천동 연못관 (거대한 통창 + 송천동 물고기 조형) =================
// 물결 빛(코스틱)은 CAUS 표시가 붙은 바위·모래·바닥에만
THREE.ShaderChunk.common += `
varying vec3 vWP;
float causT(vec2 p){ float c = 0.; vec2 q = p; for (int i = 0; i < 3; i++) { q = vec2(q.x + sin(q.y * 1.7 + float(i) * 1.3) * .6, q.y + sin(q.x * 1.3 + float(i) * 2.1) * .6); c += abs(sin(q.x * 2.2) * sin(q.y * 2.2)); } return pow(1. - clamp(c / 3., 0., 1.), 4.); }`;
THREE.ShaderChunk.project_vertex += `
vWP = (modelMatrix * vec4(transformed, 1.)).xyz;`;
THREE.ShaderChunk.dithering_fragment += `
#ifdef CAUS
{ float behind = step(vWP.z, -1.4); float inTank = behind * smoothstep(16., 6., vWP.y);
  float onFloor = (1. - behind) * step(vWP.y, .05) * smoothstep(12., 1., vWP.z);
  float cz = causT(vWP.xz * .55 + vWP.y * .15 + uCausT * vec2(.3, .2)) * .8 + causT(vWP.xz * 1.1 - 3.7 - uCausT * vec2(.2, .35)) * .5;
  gl_FragColor.rgb += vec3(.55, .95, 1.) * cz * (inTank * .32 + onFloor * .14); }
#endif`;
const CAUS_T = { value: 0 };
const causify = m => { m.defines = { ...(m.defines || {}), CAUS: '' }; const ob = m.onBeforeCompile; m.onBeforeCompile = sh => { sh.uniforms.uCausT = CAUS_T; sh.fragmentShader = 'uniform float uCausT;\n' + sh.fragmentShader; }; m.customProgramCacheKey = () => 'caus'; m.needsUpdate = true; };
// 수분화 필터 (붓 터치 + 물속 색보정) — 게임 쪽 후처리에서 아쿠아리움일 때만 켬
export const GouacheShader = { uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2() }, rad: { value: 2 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float rad; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  void main(){ vec2 px = 1. / res; vec3 m[4]; vec3 s[4]; for (int k = 0; k < 4; k++) { m[k] = vec3(0); s[k] = vec3(0); }
    vec2 uv = vUv + (vec2(n(vUv * res / 18.), n(vUv * res / 18. + 7.)) - .5) * px * 3.;
    for (int j = -3; j <= 3; j++) for (int i = -3; i <= 3; i++) { if (float(abs(i)) > rad || float(abs(j)) > rad) continue; vec3 c = texture2D(tDiffuse, uv + vec2(i, j) * px).rgb; vec3 c2 = c * c;
      if (i <= 0 && j <= 0) { m[0] += c; s[0] += c2; } if (i >= 0 && j <= 0) { m[1] += c; s[1] += c2; } if (i <= 0 && j >= 0) { m[2] += c; s[2] += c2; } if (i >= 0 && j >= 0) { m[3] += c; s[3] += c2; } }
    float cnt = (rad + 1.) * (rad + 1.); float best = 1e9; vec3 col = vec3(0);
    for (int k = 0; k < 4; k++) { vec3 mu = m[k] / cnt; vec3 v = abs(s[k] / cnt - mu * mu); float sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = mu; } }
    vec2 cq = vUv - .5; float r2 = dot(cq, cq);
    col.r = mix(col.r, texture2D(tDiffuse, vUv - cq * .006).r, smoothstep(.05, .3, r2));
    col.b = mix(col.b, texture2D(tDiffuse, vUv + cq * .006).b, smoothstep(.05, .3, r2));
    float lum = dot(col, vec3(.299, .587, .114));
    col = mix(col, col * vec3(.78, 1.02, 1.12), .55); col += vec3(-.02, .025, .05) * (1. - lum); col = mix(col, col + vec3(.04, .08, .06) * lum, .6);
    col = smoothstep(-.03, 1.03, col); col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, 1.18);
    col += vec3(.18, .32, .36) * smoothstep(.55, 1., vUv.y) * .35;
    col *= 1. - smoothstep(.12, .62, r2 * 1.6) * .55;
    float fib = n(vUv * res * vec2(.08, .5)) * .5 + n(vUv * res * .35) * .5; float gr = h(floor(vUv * res));
    col *= .97 + .03 * fib; col += (gr - .5) * .045;
    gl_FragColor = vec4(col, 1.); } ` };
// 수조 안 자리: [물고기 번호, x, y, z, 크기, 몸 돌리기, 기울기]
const PLACE = [
  [14, -3.5, 6.6, -9, 1.9, .25, -.05], [13, 7.5, 9.5, -12, 1.25, -2.9, .08], [12, -10.5, 3.3, -7.5, 1, .35, .1],
  [7, 3.2, 3.6, -5.2, 1.15, -2.7, .05], [8, -6.5, 8.6, -6.5, 1.05, .2, -.08], [9, 0.6, 2.0, -4.2, 1.0, 3.3, 0],
  [10, 10.5, 4.6, -6.5, 1.1, 0, 0], [6, -1.0, 9.8, -8, 1.15, .1, .25], [15, 5.6, 6.6, -4.6, 1.0, -2.8, -.1],
  [5, -8.4, 5.6, -4.8, .9, .3, 0], [3, -4.6, 3.0, -3.6, .8, -2.9, 0], [4, 8.6, 1.7, -5, .95, 3.1, 0],
  [11, -12.2, 7.4, -9, .95, .25, 0], [1, 12.5, 7.6, -8.5, .9, -3, .1], [2, -1.8, 4.6, -3.2, .75, -2.8, 0], [0, 2.2, 5.2, -3.4, .7, .2, 0]];
export function buildAquarium(renderer) {
  const sc = new THREE.Scene(); let S0 = 11; const R = () => (S0 = (S0 * 16807) % 2147483647) / 2147483647;
  const MC2 = {}; const M2 = (c, o = {}) => { const k = c + JSON.stringify(o); return MC2[k] || (MC2[k] = new THREE.MeshStandardMaterial({ color: c, roughness: .55, ...o })); };
  const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; if (o.s) m.scale.set(...o.s); m.receiveShadow = !!o.rcv; (o.p || sc).add(m); return m; };
  // ---------- 물속 (깊이감) ----------
  sc.fog = new THREE.FogExp2('#0b4a8a', .028);
  const skyG = new THREE.SphereGeometry(140, 32, 16), sp = skyG.attributes.position, sc3 = new Float32Array(sp.count * 3);
  const cTop = new THREE.Color('#8fe0ff'), cMid = new THREE.Color('#1a7ac8'), cBot = new THREE.Color('#041a3a');
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i) / 140, c = y > .1 ? cMid.clone().lerp(cTop, Math.min(1, (y - .1) / .5)) : cBot.clone().lerp(cMid, Math.max(0, (y + .3) / .4)); sc3.set([c.r, c.g, c.b], i * 3); }
  skyG.setAttribute('color', new THREE.BufferAttribute(sc3, 3)); sc.add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  sc.add(new THREE.HemisphereLight('#bfefff', '#0a2a4a', 1.4));
  const sun = new THREE.DirectionalLight('#dff6ff', 2.2); sun.position.set(-6, 30, -20); sc.add(sun);
  const rim = new THREE.DirectionalLight('#7ad0ff', 1.2); rim.position.set(0, 6, -30); sc.add(rim);
  const front = new THREE.DirectionalLight('#9ad8ff', .9); front.position.set(2, 8, 14); front.castShadow = true; front.shadow.mapSize.set(1024, 1024); Object.assign(front.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); sc.add(front);
  add(new THREE.PlaneGeometry(200, 120, 60, 30).rotateX(-Math.PI / 2), M2('#c8d8c0', { roughness: 1 }), 0, -1.2, -50);
  const blob = (r0) => { const g = new THREE.SphereGeometry(r0, 40, 28), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + .12 * Math.sin(v.x * 2.1 + v.y * 1.3) + .08 * Math.cos(v.z * 1.7)); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
  [[-14, -12, 4, 1.4], [-9, -20, 5, 1.8], [12, -14, 4.5, 1.6], [17, -24, 6, 2], [3, -30, 7, 1.4], [-20, -30, 6, 2.2], [8, -9, 2, 1.1]].forEach(([x, z, rr, sy]) => add(blob(rr), M2('#3f7a86', { roughness: .95 }), x, -1.2 + rr * .5, z, { s: [1, sy, 1] }));
  const kelps = [];
  for (let k = 0; k < 60; k++) { const x = (R() - .5) * 46, z = -6 - R() * 30, h = 3 + R() * 7; const g = new THREE.CylinderGeometry(.05, .12, h, 6, 8); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + h / 2; p.setX(i, p.getX(i) + Math.sin(y * .6 + k) * .4 * (y / h)); } g.computeVertexNormals();
    const kg = new THREE.Group(); kg.position.set(x, -1.2, z); sc.add(kg); kelps.push([kg, k]); add(g, M2(R() < .5 ? '#3aa06a' : '#5ab87a', { roughness: .8 }), 0, h / 2, 0, { p: kg }); for (let j = 0; j < 6; j++) add(new THREE.SphereGeometry(.28, 8, 6), M2('#4ab07a'), Math.sin(j + k) * .4, .2 + j * h / 6, 0, { p: kg, s: [1.3, .35, .6], rz: .5 }); }
  const rayM = new THREE.MeshBasicMaterial({ color: '#cff4ff', transparent: true, opacity: .085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const rays = []; for (let k = 0; k < 26; k++) rays.push(add(new THREE.PlaneGeometry(.6 + R() * 3.4, 44), rayM, -24 + k * 1.9 + R() * 2, 12, -14 - R() * 16, { rz: .32 + R() * .08, ry: (R() - .5) * .4 }));
  const bubM = new THREE.MeshStandardMaterial({ color: '#e8fbff', transparent: true, opacity: .55, roughness: .1, emissive: '#a8e8ff', emissiveIntensity: .3 });
  const bubs = []; [[-11, -7], [9, -6], [-3, -16], [15, -10]].forEach(([x, z]) => { for (let k = 0; k < 26; k++) bubs.push(add(new THREE.SphereGeometry(.05 + R() * .1, 8, 6), bubM, x + Math.sin(k) * .25, -1 + k * .45, z + Math.cos(k * 1.3) * .2)); });
  { const n = 2600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (R() - .5) * 40; p[i * 3 + 1] = R() * 16; p[i * 3 + 2] = -2 - R() * 26; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#d8f6ff', size: .06, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }))); }
  const tinyG = new THREE.ConeGeometry(.08, .32, 5).rotateZ(Math.PI / 2), tinyM = new THREE.MeshBasicMaterial({ color: '#0d3a6a', fog: true });
  const school = new THREE.InstancedMesh(tinyG, tinyM, 900), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), base = [];
  for (let i = 0; i < 900; i++) { const cl = i % 3, cx = [-8, 6, 0][cl], cy = [9, 11.5, 6][cl], cz = [-26, -22, -34][cl]; base.push([cx + (R() - .5) * 16, cy + (R() - .5) * 4, cz + (R() - .5) * 8, .7 + R() * .7, R() * 6]); }
  sc.add(school);
  // ---------- 송천동 물고기 (기증한 것만 수조에 들어감) ----------
  const tank = []; const LBL = {};
  PLACE.forEach(([i, x, y, z, s, ry, rz]) => { const f = FISH3[i], m = makeFish(f); m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.scale.setScalar(s); m.visible = false; sc.add(m);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 72; const g = cv.getContext('2d'); g.fillStyle = 'rgba(8,18,32,.82)'; g.beginPath(); g.roundRect(4, 4, 248, 64, 12); g.fill(); g.strokeStyle = 'rgba(140,200,255,.35)'; g.lineWidth = 2; g.stroke();
    g.textAlign = 'center'; g.fillStyle = f.r >= 4 ? '#ffe28a' : '#e8f4ff'; g.font = '800 26px sans-serif'; g.fillText(f.name, 128, 33); g.fillStyle = '#9ec4e8'; g.font = '600 18px sans-serif'; g.fillText(RAR3[f.r], 128, 57);
    const lb = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false })); lb.scale.set(2.4, .68, 1); lb.position.set(x, y + (f.shape === 'whale' ? 2.6 : f.shape === 'shark' ? 1.6 : 1.0) * s, z); lb.visible = false; sc.add(lb);
    tank.push({ m, lb, f, home: new THREE.Vector3(x, y, z), ry, rz, s, ph: R() * 6, sp: .3 + R() * .4 }); LBL[f.name] = tank[tank.length - 1]; });
  // ---------- 관람 공간 ----------
  const frameM = M2('#0e1a2a', { roughness: .7 });
  add(new THREE.BoxGeometry(60, .6, 1.2), frameM, 0, -.3, -1.6); add(new THREE.BoxGeometry(60, 1.2, 1.2), frameM, 0, 15.2, -1.6);
  [-17, 17].forEach(x => add(new THREE.BoxGeometry(1.2, 16, 1.2), frameM, x, 7, -1.6));
  for (let k = -2; k <= 2; k++) add(new THREE.BoxGeometry(.18, 15, .2), M2('#1a2a3a', { roughness: .4, metalness: .4 }), k * 6.8, 7.3, -1.1);
  const floorM = M2('#06101c', { roughness: .55, metalness: .1, envMapIntensity: .3 });
  add(new THREE.PlaneGeometry(40, 16).rotateX(-Math.PI / 2), floorM, 0, 0, 6, { rcv: true });
  add(new THREE.BoxGeometry(34, .9, .3), M2('#0a1624'), 0, .45, .2); add(new THREE.BoxGeometry(34, .06, .5), M2('#2a4a6a', { metalness: .6, roughness: .3 }), 0, .92, .2);
  for (let k = 0; k < 8; k++) { add(new THREE.BoxGeometry(1.1, .5, .06), M2('#0a1a2c', { emissive: '#1a4a7a', emissiveIntensity: .35 }), -14 + k * 4, .95, .36, { rx: -.5 }); add(new THREE.BoxGeometry(.9, .05, .065), M2('#bfe6ff', { emissive: '#bfe6ff', emissiveIntensity: .8 }), -14 + k * 4, 1.08, .39, { rx: -.5 }); }
  const glints = []; for (let k = 0; k < 40; k++) glints.push(add(new THREE.CircleGeometry(.3 + R() * .8, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4ac8ff', transparent: true, opacity: .08 + R() * .07, blending: THREE.AdditiveBlending, depthWrite: false }), (R() - .5) * 20, .01, 1 + R() * 9));
  // 뒷벽 · 옆벽 (한쪽 면만 → 밖에서 카메라를 가리지 않음) · 출구 · 벤치 · 안내판
  const wallM = M2('#0a1420', { roughness: .9 });
  add(new THREE.PlaneGeometry(34, 6), wallM, 0, 3, 13, { ry: Math.PI }); [-16.5, 16.5].forEach(x => add(new THREE.PlaneGeometry(14, 6), wallM, x, 3, 6, { ry: x < 0 ? Math.PI / 2 : -Math.PI / 2 }));
  add(new THREE.PlaneGeometry(2, 2.8), M2('#3a6a88', { emissive: '#2a5a7a', emissiveIntensity: .6 }), 0, 1.4, 12.98, { ry: Math.PI }); add(new THREE.PlaneGeometry(1.6, .32), M2('#fff6e0', { emissive: '#ffe0a0', emissiveIntensity: 1.2 }), 0, 3.15, 12.97, { ry: Math.PI });
  const benchM = M2('#c8b8a0', { roughness: .6 }); add(rbox(3, .2, .7, .08), benchM, -4, .5, 6.5); [-1.3, 1.3].forEach(x => add(rbox(.2, .5, .6, .05), M2('#8a8a90'), -4 + x, .25, 6.5)); add(rbox(3, .2, .7, .08), benchM, 4, .5, 6.5); [-1.3, 1.3].forEach(x => add(rbox(.2, .5, .6, .05), M2('#8a8a90'), 4 + x, .25, 6.5));
  add(rbox(1.4, 1.7, .12, .06), M2('#f3ecdc'), 9.5, 1.3, 1.6, { ry: -.3 }); add(new THREE.BoxGeometry(1.2, .32, .02), M2('#3a6a88'), 9.5, 1.95, 1.67, { ry: -.3 });
  add(new THREE.RingGeometry(.5, .62, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#bff0ff', transparent: true, opacity: .35, fog: false }), 0, .02, 1.6);
  [['c8d8c0'], ['3f7a86'], ['06101c'], ['3aa06a'], ['5ab87a'], ['4ab07a']].forEach(([h]) => { const m = Object.values(MC2).find(x => x.color.getHexString() === h); if (m) causify(m); });
  if (renderer) { const pm = new THREE.PMREMGenerator(renderer); sc.environment = pm.fromScene(new RoomEnvironment(), .04).texture; }
  // ---------- 먹이 주기: 물고기들이 앞으로 몰려옴 ----------
  let feedT = 0; const feedAt = new THREE.Vector3(0, 3, -2.2);
  function setDonated(names) { const set = new Set(names); tank.forEach(t => { t.m.visible = t.lb.visible = set.has(t.f.name); }); return tank.filter(t => t.m.visible).length; }
  function tick(t, dt) {
    CAUS_T.value = t; feedT = Math.max(0, feedT - dt);
    for (let i = 0; i < 900; i += 1) { const [x, y, z, s, ph] = base[i]; const dx = Math.sin(t * .25 + ph) * 3, dy = Math.sin(t * .6 + ph) * .3; q.setFromEuler(new THREE.Euler(0, Math.cos(t * .25 + ph) > 0 ? 0 : Math.PI, 0)); mtx.compose(new THREE.Vector3(x + dx, y + dy, z), q, new THREE.Vector3(s, s, s)); school.setMatrixAt(i, mtx); }
    school.instanceMatrix.needsUpdate = true;
    for (const k of tank) { if (!k.m.visible) continue; const sway = Math.sin(t * k.sp + k.ph);
      const tgt = feedT > 0 ? feedAt.clone().add(new THREE.Vector3(Math.sin(k.ph * 3) * 3.5, Math.cos(k.ph * 2) * 1.5, -Math.abs(Math.sin(k.ph)) * 1.5)) : k.home.clone().add(new THREE.Vector3(Math.sin(t * k.sp * .5 + k.ph) * 1.6, sway * .35, 0));
      k.m.position.lerp(tgt, Math.min(1, dt * (feedT > 0 ? 1.2 : .6))); const vx = tgt.x - k.m.position.x; k.m.rotation.y += ((Math.abs(vx) > .05 ? (vx > 0 ? 0 : Math.PI) : k.ry) - k.m.rotation.y) * Math.min(1, dt * 1.5); k.m.rotation.z = k.rz + sway * .05;
      const tail = k.m.getObjectByName && k.m.getObjectByName('tail'); if (tail) tail.rotation.y = Math.sin(t * 6 + k.ph) * .35;
      k.lb.position.set(k.m.position.x, k.m.position.y + (k.f.shape === 'whale' ? 2.6 : k.f.shape === 'shark' ? 1.6 : 1.0) * k.s, k.m.position.z); }
    kelps.forEach(([g, k]) => { g.rotation.z = Math.sin(t * .8 + k) * .06; });
    bubs.forEach((b, i) => { b.position.y += dt * (.6 + (i % 5) * .1); if (b.position.y > 15) b.position.y = -1; });
    glints.forEach((g, i) => { g.material.opacity = .05 + .08 * (.5 + .5 * Math.sin(t * 1.2 + i)); });
  }
  return {
    scene: sc, name: '아쿠아리움 · 송천동 연못관', icon: '🐟', spawn: [0, 10.5, Math.PI], camD: 7, camP: .08, focusY: 2.6, exposure: 1.15, gouache: true, tick, setDonated, feed: () => { feedT = 6; },
    ground: () => 0,
    collide(p, r) { clampBox(p, -15.5 + r, 15.5 - r, .6 + r, 12.6 - r); boxC(p, -4, 6.5, 1.5 + r, .35 + r); boxC(p, 4, 6.5, 1.5 + r, .35 + r); circ(p, 9.5, 1.6, .5 + r); },
    cam(c) { c.y = Math.max(.5, Math.min(c.y, 9)); c.x = Math.max(-16, Math.min(16, c.x)); c.z = Math.max(.9, Math.min(17, c.z)); },
    spots: [['🚪', '출구', '밖으로 나가기', 0, 12.4, 1.4, 'exit'], ['🐟', '통창 앞', '먹이 주기', 0, 1.3, 1.6, 'feed'], ['🪑', '벤치', '앉아서 구경하기', -4, 6.5, 1.5, 'bench'], ['🪑', '벤치 ', '앉아서 구경하기', 4, 6.5, 1.5, 'bench2'], ['📋', '기증 안내판', '물고기 기증 · 전시', 9.5, 1.6, 1.5, 'donate']],
    bench: [-4, 6.5, Math.PI], bench2: [4, 6.5, Math.PI]
  };
}

// ================= 집 지하실 (넓은 지하 창고 + 섬뜩한 방) =================
export function buildCellar() {
  const sc = new THREE.Scene(), add = mk(sc); let R0 = 3; const R = () => (R0 = (R0 * 16807) % 2147483647) / 2147483647;
  sc.background = new THREE.Color('#050505'); sc.fog = new THREE.Fog('#0a0806', 7, 18);
  sc.add(new THREE.HemisphereLight('#7a8a6a', '#1a1410', 1.0)); { const f = new THREE.PointLight('#7a8a6a', 3, 10, 1.6); f.position.set(3, 2.6, 3); sc.add(f); }
  const RW = 10, RD = 9, RH = 3.4, X0 = -RW / 2, Z0 = -RD / 2;
  add(new THREE.PlaneGeometry(RW, RD), M('#3a3630', { roughness: 1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
  // 돌벽돌 벽 (뒤·왼쪽·오른쪽, 앞쪽은 계단 방향)
  const BR = ['#4a4440', '#52483f', '#3e3834'];
  for (let y = 0; y < 9; y++) { for (let x = 0; x < 15; x++) add(rbox(.66, .34, .2, .03), M(BR[(x + y) % 3]), X0 + .33 + x * .67 + (y % 2) * .33 - .2, .18 + y * .37, Z0, { cast: false });
    for (let z = 0; z < 13; z++) { add(rbox(.2, .34, .66, .03), M(BR[(z + y + 1) % 3]), X0, .18 + y * .37, Z0 + .33 + z * .67 + (y % 2) * .33, { cast: false }); add(rbox(.2, .34, .66, .03), M(BR[(z + y) % 3]), -X0, .18 + y * .37, Z0 + .33 + z * .67 + (y % 2) * .33, { cast: false }); } }
  add(new THREE.PlaneGeometry(RW, RD), M('#2a2622'), 0, RH, 0, { rx: Math.PI / 2, cast: false });
  [[.4, .2, 1.1], [-1.6, -1.6, .8], [2.4, -2.6, .6], [-3.4, 2.2, .7]].forEach(([x, z, s2]) => add(new THREE.CircleGeometry(s2, 20), new THREE.MeshBasicMaterial({ color: '#1a1410', transparent: true, opacity: .55 }), x, .01, z, { rx: -Math.PI / 2, cast: false }));
  add(new THREE.CylinderGeometry(.22, .22, .02, 16), M('#2a2a2a', { metalness: .6, roughness: .5 }), .2, .015, -.3, { cast: false });
  // 흔들리는 전구
  const lamp = new THREE.Group(); lamp.position.set(-.2, RH, -.4); sc.add(lamp);
  add(new THREE.CylinderGeometry(.01, .01, 1), M('#111'), 0, -.5, 0, { p: lamp, cast: false });
  const bulbM = M('#fff2c0', { emissive: '#ffcf70', emissiveIntensity: 3 }); add(new THREE.SphereGeometry(.11, 14, 10), bulbM, 0, -1.05, 0, { p: lamp, cast: false });
  const bulb = new THREE.SpotLight('#ffcf80', 40, 11, 1.0, .6, 1.5); bulb.position.set(-.2, RH - 1.1, -.4); bulb.target.position.set(-.2, 0, -.4); bulb.castShadow = true; bulb.shadow.mapSize.set(1024, 1024); sc.add(bulb); sc.add(bulb.target);
  const bl2 = new THREE.PointLight('#ffb860', 2.2, 7, 2); bl2.position.copy(bulb.position); sc.add(bl2);
  // 마주 보는 의자 두 개 + 작은 책상
  function chair(x, z, ry) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; sc.add(c);
    add(new THREE.BoxGeometry(.7, .08, .7), M('#4a3a2c'), 0, .55, 0, { p: c }); [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]].forEach(([a, b]) => add(new THREE.BoxGeometry(.07, .55, .07), M('#3a2c22'), a, .27, b, { p: c }));
    add(new THREE.BoxGeometry(.7, .8, .07), M('#4a3a2c'), 0, .98, -.32, { p: c }); [-.36, .36].forEach(dx => add(new THREE.BoxGeometry(.06, .06, .7), M('#5a5a5a', { metalness: .6, roughness: .5 }), dx, .72, 0, { p: c })); return c; }
  chair(-1.4, -.6, Math.PI / 2); chair(1.0, -.6, -Math.PI / 2);
  const desk = new THREE.Group(); desk.position.set(-.2, 0, -2.6); sc.add(desk);
  add(new THREE.BoxGeometry(1.4, .06, .7), M('#3e3026'), 0, .78, 0, { p: desk }); [[-.62, -.28], [.62, -.28], [-.62, .28], [.62, .28]].forEach(([a, b]) => add(new THREE.BoxGeometry(.06, .78, .06), M('#2e241c'), a, .39, b, { p: desk }));
  add(new THREE.BoxGeometry(.32, .01, .42), M('#c8bca0'), -.3, .815, .05, { p: desk, ry: .2, cast: false }); add(new THREE.BoxGeometry(.3, .01, .4), M('#d8ccb0'), -.15, .82, -.05, { p: desk, ry: -.15, cast: false });
  add(new THREE.CylinderGeometry(.06, .07, .02, 10), M('#2a2420'), .5, .82, -.2, { p: desk }); add(new THREE.CylinderGeometry(.015, .015, .14), M('#f0e6d0'), .5, .9, -.2, { p: desk }); const candle = add(new THREE.SphereGeometry(.025, 8, 6), M('#ffd080', { emissive: '#ffa040', emissiveIntensity: 3 }), .5, .99, -.2, { p: desk, cast: false });
  // 왼쪽 벽: 선반 + 유리병 · 사슬
  for (let k = 0; k < 3; k++) { add(new THREE.BoxGeometry(.4, .05, 2.6), M('#3e3026'), X0 + .35, .7 + k * .7, 1.2); for (let j = 0; j < 6; j++) { const c = ['#6a8a5a', '#8a6a4a', '#5a6a8a', '#7a5a6a'][(j + k) % 4]; add(new THREE.CylinderGeometry(.07 + R() * .04, .08, .22 + R() * .15, 10), new THREE.MeshStandardMaterial({ color: c, roughness: .15, transparent: true, opacity: .7 }), X0 + .35, .85 + k * .7, .1 + j * .42 + R() * .1, { cast: false }); } }
  [-.1, 2.5].forEach(z => add(new THREE.BoxGeometry(.05, 2.1, .05), M('#2e241c'), X0 + .5, 1.05, z));
  for (let k = 0; k < 9; k++) add(new THREE.TorusGeometry(.06, .015, 6, 10), M('#4a4a4a', { metalness: .7, roughness: .5 }), X0 + .12, 2.2 - k * .1, -2.4, { ry: k % 2 ? Math.PI / 2 : 0 });
  // 뒤 구석: 술통 · 나무 상자 · 덮개 씌운 무언가
  [[-3.8, -3.7], [-3.1, -3.9], [-3.5, -3.1]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(.38, .42, .9, 14), M('#5a3e2a'), x, .45, z); [.15, .75].forEach(y => add(new THREE.TorusGeometry(.4, .025, 6, 18), M('#3a3a3a', { metalness: .6 }), x, y, z, { rx: Math.PI / 2, cast: false })); });
  [[3.9, -3.7, 0], [3.3, -3.8, .3], [3.7, -3.6, .1]].forEach(([x, z, r], i) => add(new THREE.BoxGeometry(.7, .6, .7), M(i % 2 ? '#6a5038' : '#5a4430'), x, .3 + (i === 2 ? .6 : 0), z, { ry: r }));
  add(new THREE.SphereGeometry(.8, 16, 10), M('#c8c0b0', { roughness: 1 }), -.2, .45, -3.7, { s: [1.3, .6, .7] });
  // 오른쪽: 낡은 전화기 (밤이면 울림)
  const pt = new THREE.Group(); pt.position.set(4.2, 0, .6); sc.add(pt); add(new THREE.BoxGeometry(.6, .06, .5), M('#3e3026'), 0, .75, 0, { p: pt }); [[-.25, -.2], [.25, -.2], [-.25, .2], [.25, .2]].forEach(([a, b]) => add(new THREE.BoxGeometry(.05, .75, .05), M('#2e241c'), a, .37, b, { p: pt }));
  const phone = new THREE.Group(); phone.position.set(0, .82, 0); pt.add(phone); add(new THREE.BoxGeometry(.3, .12, .22), M('#1a1a1c', { roughness: .3 }), 0, 0, 0, { p: phone }); add(new THREE.CylinderGeometry(.07, .07, .02, 16), M('#d8d0c0'), 0, .07, .03, { p: phone }); add(new THREE.CapsuleGeometry(.03, .26, 4, 8), M('#1a1a1c', { roughness: .3 }), 0, .1, -.06, { p: phone, rz: Math.PI / 2 });
  // 계단 (앞쪽 오른편에서 위로)
  for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(1.3, .25, .45), M('#4a4440'), 3.6, .12 + k * .27, 1.6 + k * .42);
  const door = new THREE.SpotLight('#ffcf9a', 16, 9, .5, .8, 1.5); door.position.set(3.6, RH + .6, 4.6); door.target.position.set(3.6, 0, 2); sc.add(door); sc.add(door.target);
  const dust = []; for (let k = 0; k < 90; k++) dust.push(add(new THREE.SphereGeometry(.012, 4, 3), new THREE.MeshBasicMaterial({ color: '#ffe8c0', transparent: true, opacity: .5 }), (R() - .5) * 7, .5 + R() * 2.6, (R() - .5) * 6, { cast: false }));
  const frag = add(new THREE.OctahedronGeometry(.08), M('#c8a0ff', { emissive: '#a060ff', emissiveIntensity: 2 }), -3.6, .12, 2.6, { cast: false }); frag.visible = false;
  let ring = false;
  function tick(t, dt) { lamp.rotation.z = Math.sin(t * .9) * .12; lamp.rotation.x = Math.sin(t * .7) * .06; bulb.position.set(-.2 + Math.sin(t * .9) * -.13, RH - 1.1, -.4 + Math.sin(t * .7) * .07); bulbM.emissiveIntensity = Math.random() < .02 ? .3 : 3; bulb.intensity = bulbM.emissiveIntensity > 1 ? 40 : 5;
    dust.forEach((d, i) => { d.position.y += Math.sin(t + i) * .0015; }); candle.scale.setScalar(.9 + Math.random() * .2); frag.rotation.y = t * 2; frag.position.y = .12 + Math.sin(t * 3) * .03;
    phone.rotation.z = ring && (t % 2) < 1 ? Math.sin(t * 60) * .04 : 0; }
  return {
    scene: sc, name: '집 지하 · ???', icon: '🕳', spawn: [3.6, 1.0, Math.PI], dark: true, tick, frag, camD: 5.2, camP: .62,
    setRing(v) { ring = v; }, get ringing() { return ring; },
    ground: (x, z) => (x > 2.95 && x < 4.25 && z > 1.4) ? Math.min(1.9, (z - 1.4) / 2.9 * 1.9) : 0,
    collide(p, r) { clampBox(p, X0 + .25 + r, -X0 - .25 - r, Z0 + .25 + r, 4.3 - r); circ(p, -1.4, -.6, .42 + r); circ(p, 1.0, -.6, .42 + r); boxC(p, -.2, -2.6, .72 + r, .38 + r); boxC(p, X0 + .35, 1.2, .25 + r, 1.35 + r);
      [[-3.8, -3.7], [-3.1, -3.9], [-3.5, -3.1]].forEach(([x, z]) => circ(p, x, z, .42 + r)); boxC(p, 3.6, -3.7, .75 + r, .45 + r); boxC(p, -.2, -3.7, 1.05 + r, .6 + r); boxC(p, 4.2, .6, .32 + r, .28 + r); },
    cam(c) { c.y = Math.min(c.y, 5.2); c.x = Math.max(X0 + .3, Math.min(-X0 - .3, c.x)); c.z = Math.max(Z0 + .3, Math.min(9, c.z)); },
    spots: [['🪜', '계단', '위로 올라가기', 3.6, 3.6, 1.2, 'exit'], ['📜', '책상', '쪽지 읽기', -.2, -1.9, 1.1, 'desk'], ['🪑', '왼쪽 의자', '앉기', -1.4, -.6, 1.25, 'chair'], ['🪑', '오른쪽 의자', '앉기', 1.0, -.6, 1.25, 'chair2'],
      ['☎️', '낡은 전화기', '수화기 들기', 4.2, .6, 1.2, 'phone'], ['🫙', '선반', '병 살펴보기', X0 + .4, 1.2, 1.3, 'shelf'], ['✨', '반짝이는 것', '줍기', -3.6, 2.6, 1.0, 'frag']],
    chairs: { chair: [-1.4, -.6, Math.PI / 2], chair2: [1.0, -.6, -Math.PI / 2] }
  };
}
