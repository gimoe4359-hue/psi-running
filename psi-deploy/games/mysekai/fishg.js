// 송천동 물고기 고퀄 조형 — 몸통 곡면 + 그린 비늘 텍스처 + 반투명 지느러미
import * as THREE from 'three';

export const FISH = [
  { name: '반딧불송사리', r: 1, c1: '#e8f4b0', c2: '#9cc87a', glow: '#fff8c8', h: .36, th: .42, tail: 'fan', pat: 'dots', fin: '#d8eca0' },
  { name: '이끼붕어', r: 1, c1: '#d4e2a8', c2: '#88aa72', h: .52, th: .5, tail: 'fork', pat: 'soft', extra: 'moss', fin: '#c0d698' },
  { name: '꽃잎베타', r: 1, c1: '#ffdce6', c2: '#f29ab6', h: .42, th: .4, tail: 'betta', pat: 'petal', fin: '#ffb8cc' },
  { name: '유리비늘피라미', r: 2, c1: '#eefaff', c2: '#a8dcef', h: .3, th: .38, tail: 'fork', pat: 'glass', glass: 1, fin: '#d8f2ff' },
  { name: '버섯메기', r: 2, c1: '#e6cdb0', c2: '#b08a6a', h: .36, th: .62, tail: 'round', pat: 'spots', extra: 'shroom', fin: '#d2b494', head: 'flat' },
  { name: '별꼬리금붕어', r: 2, c1: '#ffe2a8', c2: '#ff9e72', h: .58, th: .55, tail: 'star', pat: 'soft', fin: '#ffc49a', round: 1 },
  { name: '잎사귀가오리', r: 2, c1: '#d4ecaa', c2: '#8cbc78', shape: 'ray' },
  { name: '노을잉어', r: 3, c1: '#ffd6b0', c2: '#c8a0dc', h: .46, th: .48, tail: 'fork', pat: 'koi', fin: '#ffc4c0', barbel: 1 },
  { name: '달빛잉어', r: 3, c1: '#f6f6ff', c2: '#b4c0ec', h: .46, th: .48, tail: 'fork', pat: 'moon', fin: '#dce2ff', barbel: 1 },
  { name: '등불아귀', r: 3, c1: '#a8a6d0', c2: '#76749e', glow: '#ffe6a0', h: .62, th: .7, tail: 'round', pat: 'spots', extra: 'lantern', fin: '#9896c4', head: 'angler' },
  { name: '수정해파리', r: 3, c1: '#f4ecff', c2: '#c8b8f4', glow: '#efe6ff', shape: 'jelly' },
  { name: '결재서류붕어', r: 3, c1: '#fffcf2', c2: '#e2dac6', h: .55, th: .5, tail: 'fork', pat: 'doc', extra: 'stamp', fin: '#f0e8d6' },
  { name: '무지개뱀장어', r: 4, c1: '#ffb0b0', c2: '#b0b0ff', shape: 'eel' },
  { name: '구름고래 새끼', r: 4, c1: '#ffffff', c2: '#cfe0f2', shape: 'whale' },
  { name: '이끼상어', r: 5, c1: '#eef2e4', c2: '#8cb48e', shape: 'shark' },
  { name: '하늘물고기', r: 5, c1: '#eafff9', c2: '#9ce4d8', h: .42, th: .42, tail: 'veil', pat: 'petal', fin: '#bff2ea' }
];
export const RAR = ['', '흔함', '조금 드묾', '드묾', '아주 드묾', '전설'];

const C = c => new THREE.Color(c);
const hex = c => '#' + C(c).getHexString();
const mix = (a, b, t) => '#' + C(a).lerp(C(b), t).getHexString();
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- 텍스처 ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function brush(g, W, H, n, col, a, w = 18) { // 마른 붓 터치 (가로 결)
  for (let k = 0; k < n; k++) { const x = R() * W, y = R() * H, l = 30 + R() * 90; g.strokeStyle = col; g.globalAlpha = a * (.4 + R() * .6); g.lineWidth = w * (.4 + R()); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (R() - .5) * 10, x + l, y + (R() - .5) * 8); g.stroke(); } g.globalAlpha = 1; }
function grain(g, W, H, a = .06) { for (let k = 0; k < W * H / 60; k++) { g.fillStyle = R() > .5 ? `rgba(255,255,255,${a})` : `rgba(90,70,50,${a * .6})`; g.fillRect(R() * W, R() * H, 2, 2); } }
function soft(g, x, y, rx, ry, col, a = 1) { const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry)); const c = C(col); const rgb = `${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0}`;
  rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(.65, `rgba(${rgb},${a * .85})`); rg.addColorStop(1, `rgba(${rgb},0)`); g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.fillStyle = rg; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore(); }
function bodyTexture(f) {
  const W = 1024, H = 512, [cv, g] = canvas(W, H);
  // 수분화: 등(진한 색) → 배(크림) 부드럽게 번진 그라데이션
  const belly = mix(f.c1, '#fffaf0', .6), side = f.c1, back = f.c2;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, belly); gr.addColorStop(.25, side); gr.addColorStop(.44, back); gr.addColorStop(.56, back); gr.addColorStop(.75, side); gr.addColorStop(1, belly);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  brush(g, W, H, 160, back, .12); brush(g, W, H, 160, '#fffaf0', .12); brush(g, W, H, 50, mix(back, '#ff9a9a', .35), .06, 30);
  const P = f.pat;
  if (P === 'koi') { [[.35, .36, .1], [.58, .62, .09], [.72, .3, .07]].forEach(([x, y, r]) => soft(g, x * W, y * H, r * W, r * H * 1.4, '#fffaf2', .9)); [[.45, .5, .08], [.64, .46, .06]].forEach(([x, y, r]) => soft(g, x * W, y * H, r * W, r * H * 1.2, mix(f.c2, '#ff8aa0', .3), .8)); }
  if (P === 'spots') for (let k = 0; k < 40; k++) soft(g, (.2 + R() * .75) * W, (.18 + R() * .64) * H, 7 + R() * 9, 7 + R() * 9, mix(f.c2, '#5a4a6a', .3), .5);
  if (P === 'dots') for (let k = 0; k < 22; k++) soft(g, (.2 + R() * .7) * W, ((k % 2) ? .3 : .7) * H + (R() - .5) * 30, 14, 14, '#fffbd8', .95);
  if (P === 'petal') for (let k = 0; k < 18; k++) { const x = (.25 + R() * .65) * W, y = (.15 + R() * .7) * H; soft(g, x, y, 22, 12, '#ffffff', .45); }
  if (P === 'doc') { g.strokeStyle = 'rgba(150,140,125,.45)'; g.lineWidth = 3; g.lineCap = 'round'; for (let s = 0; s < 2; s++) for (let k = 0; k < 5; k++) { const y = (s ? .62 : .22) * H + k * 16; g.beginPath(); g.moveTo(.28 * W, y); g.lineTo((.66 - (k === 4 ? .18 : 0)) * W, y); g.stroke(); }
    g.strokeStyle = '#e8706e'; g.lineWidth = 6; [.27, .73].forEach(y => { g.beginPath(); g.arc(.78 * W, y * H, 28, 0, 7); g.stroke(); g.font = 'bold 28px sans-serif'; g.fillStyle = '#e8706e'; g.textAlign = 'center'; g.fillText('결', .78 * W, y * H + 10); }); }
  if (P === 'moon') [.3, .7].forEach(y => { soft(g, .42 * W, y * H, 34, 34, '#fff8d8', 1); soft(g, .42 * W + 16, y * H - 8, 28, 28, side, 1); });
  if (P === 'glass') brush(g, W, H, 80, '#ffffff', .25, 10);
  // 볼 터치 (분홍)
  [.3, .7].forEach(y => soft(g, .1 * W, y * H, 40, 26, '#ffa8b8', .45));
  grain(g, W, H);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function bumpTexture() {
  const W = 512, H = 256, [cv, g] = canvas(W, H); g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 11) for (let x = 0; x < W; x += 15) { const ox = x + ((y / 11) % 2) * 7.5; if (ox < W * .2) continue; const rg = g.createRadialGradient(ox, y - 3, 1, ox, y, 9); rg.addColorStop(0, '#a8a8a8'); rg.addColorStop(1, '#707070'); g.fillStyle = rg; g.beginPath(); g.arc(ox, y, 8, 0, Math.PI); g.fill(); }
  const t = new THREE.CanvasTexture(cv); return t;
}
const BUMP = bumpTexture();
function finTexture(col, glow) {
  const W = 256, H = 256, [cv, g] = canvas(W, H);
  const rg = g.createLinearGradient(0, 0, W, 0); rg.addColorStop(0, mix(col, '#000', .04)); rg.addColorStop(1, mix(col, '#fffaf0', .55)); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#ffffff'; g.globalAlpha = .28; g.lineWidth = 5; g.lineCap = 'round'; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(10, H / 2); g.quadraticCurveTo(W * .5, H / 2 + (k - 4) * 16, W - 10, (k + .5) * H / 9); g.stroke(); } g.globalAlpha = 1;
  grain(g, W, H, .05);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const [ac, ag] = canvas(W, H); const al = ag.createLinearGradient(0, 0, W, 0); al.addColorStop(0, '#fff'); al.addColorStop(.75, '#e0e0e0'); al.addColorStop(1, '#9a9a9a'); ag.fillStyle = al; ag.fillRect(0, 0, W, H);
  return [t, new THREE.CanvasTexture(ac)];
}

// ---------- 몸통 곡면 (길이 방향 u, 둘레 v) ----------
function bodyGeo(o) {
  const L = o.len || 1.7, Hh = o.h * (o.keepH ? 1 : .78), Th = o.th / (o.keepH ? 1 : .78), NU = 90, NV = 48, pos = [], uv = [], idx = [];
  const um = o.head === 'angler' ? .3 : o.round ? .38 : .36, ped = o.ped || .16, nose = o.head === 'angler' ? .55 : o.head === 'round' ? .5 : .72;
  const prof = u => { let p; if (u < um) { const t = u / um; p = Math.pow(1 - (1 - t) * (1 - t), nose); } else { const t = (u - um) / (1 - um); p = Math.pow(Math.cos(t * Math.PI / 2), 1.15); }
    const t2 = Math.min(1, Math.max(0, (u - .72) / .28)); p = Math.max(p, ped * t2 * t2 * (3 - 2 * t2)); if (o.head === 'flat') p *= .82 + .18 * Math.min(1, u * 3); return Math.max(.002, p); };
  for (let i = 0; i <= NU; i++) { const u = i / NU, x = (.5 - u) * L, hh = Hh * prof(u), ww = Hh * Th * prof(u) * (u > .8 ? 1 - (u - .8) * 2.6 : 1), cy = -Hh * .08 * Math.sin(u * Math.PI) + (o.head === 'angler' ? Hh * .1 * (1 - u) : 0);
    for (let j = 0; j <= NV; j++) { const v = j / NV, a = v * Math.PI * 2 - Math.PI / 2; // a=-90°: 배
      const s = Math.sin(a), c = Math.cos(a); const top = s > 0 ? 1 + .05 * s : 1 + .04 * s * s; // 등은 살짝 솟게
      pos.push(x, cy + s * hh * top, c * ww); uv.push(u, v); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.userData.prof = prof; return g;
}
// 지느러미 (부드러운 곡선 + 살짝 휨)
function fin(pts, col, glow, bend = .06, opa = .82) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); }
  const g = new THREE.ShapeGeometry(s, 24); g.computeBoundingBox(); const bb = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const tx = (x - bb.max.x) / (bb.min.x - bb.max.x || 1); p.setZ(i, Math.sin(tx * Math.PI) * bend + tx * tx * bend * .5 * Math.sign(y || 1)); uv.setXY(i, Math.abs(tx), (y - bb.min.y) / (bb.max.y - bb.min.y || 1)); }
  g.computeVertexNormals(); const [map, amap] = finTexture(col, glow);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, alphaMap: amap, transparent: true, opacity: Math.min(.95, opa + .1), side: THREE.DoubleSide, roughness: 1, emissive: C(col), emissiveIntensity: .18, depthWrite: false }));
}
const BEAD = new THREE.MeshStandardMaterial({ color: '#3a2c3c', roughness: .45 }), SHINE = new THREE.MeshBasicMaterial({ color: '#ffffff' });
export const OPT = { eye: 1 };
function eye(g, x, y, z, s) { s *= OPT.eye;
  [1, -1].forEach(sd => { const e = new THREE.Group(); e.position.set(x, y, z * sd); e.rotation.y = sd > 0 ? -.25 : Math.PI + .25; g.add(e);
    const b = new THREE.Mesh(new THREE.SphereGeometry(.06 * s, 24, 18), BEAD); b.scale.set(1, 1.12, .55); e.add(b);
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(.02 * s, 12, 8), SHINE); h1.position.set(.018 * s, .03 * s, .032 * s); h1.scale.z = .4; e.add(h1);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(.009 * s, 8, 6), SHINE); h2.position.set(-.02 * s, -.022 * s, .032 * s); h2.scale.z = .4; e.add(h2); });
}
function bodyMat(f, o = {}) {
  const { bumpScale, clearcoat, sheen, envMapIntensity, ...rest } = o;
  return new THREE.MeshStandardMaterial({ map: bodyTexture(f), roughness: f.glass ? .6 : .95, metalness: 0, envMapIntensity: 0, transparent: !!f.glass, opacity: f.glass ? .82 : 1,
    emissive: C(f.c1), emissiveIntensity: .06, ...rest });
}
const TAILS = {
  fork: [[0, .02], [-.25, .18, -.55, .46], [-.42, .14, -.4, 0], [-.42, -.14, -.55, -.46], [-.25, -.18, 0, -.02]],
  fan: [[0, .03], [-.35, .5, -.6, .32], [-.7, 0, -.6, -.32], [-.35, -.5, 0, -.03]],
  round: [[0, .03], [-.3, .38, -.48, .16], [-.6, 0, -.48, -.16], [-.3, -.38, 0, -.03]],
  star: [[0, .02], [-.3, .2, -.62, .5], [-.45, .14, -.75, 0], [-.45, -.14, -.62, -.5], [-.3, -.2, 0, -.02]],
  betta: [[0, .04], [-.5, .9, -1.15, .7], [-1.3, .1, -1.1, -.5], [-.6, -.8, 0, -.04]],
  veil: [[0, .03], [-.6, .7, -1.3, .45], [-1.1, 0, -1.4, -.55], [-.6, -.6, 0, -.03]]
};
export function makeFish(f) {
  const g = new THREE.Group(); seed = 7 + f.name.length * 13;
  if (f.shape === 'ray') return makeRay(f); if (f.shape === 'jelly') return makeJelly(f); if (f.shape === 'eel') return makeEel(f); if (f.shape === 'whale') return makeWhale(f); if (f.shape === 'shark') return makeShark(f);
  const H = f.h, L = 1.7, geo = bodyGeo({ h: H, th: f.th, len: L, head: f.head, round: f.round }); g.add(new THREE.Mesh(geo, bodyMat(f)));
  const fc = f.fin || f.c2, gl = f.glow;
  const tail = fin(TAILS[f.tail || 'fork'], fc, gl, .05); tail.position.set(-L / 2 + .02, -H * .02, 0); g.add(tail);
  const dorsal = fin(f.tail === 'betta' || f.tail === 'veil' ? [[0, 0], [-.1, .45, -.55, .5], [-.7, .2, -.75, 0]] : [[0, 0], [-.05, .28, -.32, .3], [-.48, .12, -.52, 0]], fc, gl, .03); dorsal.position.set(.15, H * .92, 0); g.add(dorsal);
  const anal = fin(f.tail === 'betta' ? [[0, 0], [-.2, -.5, -.7, -.45], [-.6, -.1, -.75, 0]] : [[0, 0], [-.1, -.16, -.3, -.18], [-.32, -.04, -.36, 0]], fc, gl, .03); anal.position.set(-.18, -H * .78, 0); g.add(anal);
  [1, -1].forEach(sd => { const pf = fin([[0, 0], [-.08, -.12, -.28, -.18], [-.18, -.02, -.24, .02]], fc, gl, .04, .7); pf.position.set(.42, -H * .25, H * f.th * .75 * sd); pf.rotation.set(sd * .9, sd * .5, 0); g.add(pf);
    const vf = fin([[0, 0], [-.06, -.1, -.2, -.14], [-.12, -.02, -.16, 0]], fc, gl, .03, .7); vf.position.set(.1, -H * .85, H * f.th * .3 * sd); vf.rotation.set(sd * .6, 0, 0); g.add(vf); });
  // 입 · 수염
  const lip = new THREE.Mesh(new THREE.SphereGeometry(H * .07, 16, 12), new THREE.MeshStandardMaterial({ color: mix(f.c1, '#ff9aa8', .45), roughness: .9 })); lip.position.set(L / 2 - .015, -H * .1, 0); lip.scale.set(.6, .55, 1); g.add(lip);
  if (f.barbel) [1, -1].forEach(sd => { const pts = [new THREE.Vector3(L / 2 - .05, -H * .18, .05 * sd), new THREE.Vector3(L / 2 + .05, -H * .4, .12 * sd), new THREE.Vector3(L / 2 + .02, -H * .6, .14 * sd)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, .012, 6), new THREE.MeshStandardMaterial({ color: f.c1, roughness: .4 }))); });
  eye(g, L / 2 - .24, H * .12, H * f.th * .62, Math.max(1, H * 1.9));
  // 특징 소품
  if (f.extra === 'moss') for (let k = 0; k < 14; k++) { const u = .25 + k * .035, m = new THREE.Mesh(new THREE.IcosahedronGeometry(.05 + R() * .03, 1), new THREE.MeshStandardMaterial({ color: k % 2 ? '#6aa84a' : '#88c060', roughness: 1 })); m.position.set((.5 - u) * L, H * geo.userData.prof(u) * 1.1 - .01, (R() - .5) * .06); g.add(m); }
  if (f.extra === 'shroom') { const st = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .16, 12), new THREE.MeshStandardMaterial({ color: '#f6eedc', roughness: .5 })); st.position.set(.4, H * 1.0, 0); g.add(st);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.14, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8483a', roughness: .3, clearcoat: .8 })); cap.position.set(.4, H * 1.0 + .07, 0); cap.scale.set(1, .8, 1); g.add(cap);
    for (let k = 0; k < 6; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), new THREE.MeshStandardMaterial({ color: '#fffaf0' })); d.position.set(.4 + Math.cos(k * 1.1) * .08, H + .13 + (k % 2) * .02, Math.sin(k * 1.1) * .08); d.scale.y = .5; g.add(d); } }
  if (f.extra === 'lantern') { const pts = [new THREE.Vector3(L / 2 - .3, H * 1.05, 0), new THREE.Vector3(L / 2 + .05, H * 1.6, 0), new THREE.Vector3(L / 2 + .32, H * 1.35, 0)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .016, 8), new THREE.MeshStandardMaterial({ color: '#2a2a3a', roughness: .5 })));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.085, 24, 18), new THREE.MeshStandardMaterial({ color: '#fff4c0', emissive: f.glow, emissiveIntensity: 1.6, roughness: .1, transmission: .3 })); bulb.position.set(L / 2 + .33, H * 1.35 - .06, 0); g.add(bulb);
    const l = new THREE.PointLight(f.glow, 1.2, 2.5, 1.6); l.position.copy(bulb.position); g.add(l); }
  return g;
}
function makeRay(f) {
  const g = new THREE.Group(), s = new THREE.Shape(); s.moveTo(.9, 0); s.bezierCurveTo(.7, .5, .25, 1.05, -.15, 1.15); s.bezierCurveTo(-.35, .7, -.55, .25, -.65, 0); s.bezierCurveTo(-.55, -.25, -.35, -.7, -.15, -1.15); s.bezierCurveTo(.25, -1.05, .7, -.5, .9, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 8, curveSegments: 48 }); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) * (1 - Math.min(1, Math.abs(z) * .7)) + Math.abs(z) * Math.abs(z) * .18); } geo.computeVertexNormals();
  // 잎맥 텍스처를 위에서 투영
  const [cv, c2] = canvas(512, 512); const gr = c2.createRadialGradient(256, 256, 20, 256, 256, 300); gr.addColorStop(0, f.c1); gr.addColorStop(1, f.c2); c2.fillStyle = gr; c2.fillRect(0, 0, 512, 512);
  c2.strokeStyle = 'rgba(40,80,30,.6)'; c2.lineWidth = 6; c2.beginPath(); c2.moveTo(80, 256); c2.lineTo(470, 256); c2.stroke(); c2.lineWidth = 3; for (let k = 0; k < 7; k++) { const x = 140 + k * 45; [1, -1].forEach(sd => { c2.beginPath(); c2.moveTo(x, 256); c2.quadraticCurveTo(x - 20, 256 + sd * 80, x - 60, 256 + sd * (160 - k * 10)); c2.stroke(); }); }
  for (let k = 0; k < 40; k++) { c2.fillStyle = `rgba(255,255,220,${R() * .25})`; c2.beginPath(); c2.arc(R() * 512, R() * 512, 3 + R() * 6, 0, 7); c2.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; geo.computeBoundingBox(); const bb = geo.boundingBox, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (p.getZ(i) - bb.min.z) / (bb.max.z - bb.min.z));
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .4, clearcoat: .6, sheen: .6, sheenColor: C(f.c1) })));
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.008, .04, 1.5, 12), new THREE.MeshStandardMaterial({ color: f.c2, roughness: .4 })); tail.rotation.z = Math.PI / 2; tail.position.set(-1.35, .02, 0); g.add(tail);
  const st = fin([[0, 0], [-.1, .12, -.25, .02], [-.12, 0, -.02, 0]], f.c2, null, .01); st.position.set(-.6, .1, 0); g.add(st);
  eye(g, .5, .17, .17, 1.2); return g;
}
function makeJelly(f) {
  const g = new THREE.Group(); const bell = new THREE.LatheGeometry(Array.from({ length: 25 }, (_, i) => { const t = i / 24; return new THREE.Vector2(Math.sin(t * Math.PI * .55) * .62 * (1 + .06 * Math.sin(t * 30)), Math.cos(t * Math.PI * .55) * .5); }), 64);
  const bm = new THREE.MeshStandardMaterial({ color: f.c1, roughness: .05, transmission: .85, thickness: .5, ior: 1.2, transparent: true, opacity: .9, emissive: f.glow, emissiveIntensity: .3, side: THREE.DoubleSide, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1 });
  g.add(new THREE.Mesh(bell, bm));
  const inner = new THREE.Mesh(new THREE.SphereGeometry(.25, 24, 16), new THREE.MeshStandardMaterial({ color: f.c2, emissive: f.c2, emissiveIntensity: 1.2, transparent: true, opacity: .75 })); inner.position.y = .2; inner.scale.set(1, .7, 1); g.add(inner);
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.28, pts = []; for (let j = 0; j <= 14; j++) pts.push(new THREE.Vector3(Math.cos(a) * .12 + Math.sin(j * .5 + k) * .1, -j * .07, Math.sin(a) * .12 + Math.cos(j * .4 + k) * .1));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .045, 8), new THREE.MeshStandardMaterial({ color: f.c2, emissive: f.glow, emissiveIntensity: .8, transparent: true, opacity: .7, roughness: .2 }))); }
  for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28, pts = []; for (let j = 0; j <= 16; j++) pts.push(new THREE.Vector3(Math.cos(a) * .58 + Math.sin(j * .7 + k) * .05, .02 - j * .1, Math.sin(a) * .58 + Math.cos(j * .6 + k) * .05));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .008, 5), new THREE.MeshBasicMaterial({ color: f.glow, transparent: true, opacity: .75 }))); }
  return g;
}
function makeEel(f) {
  const g = new THREE.Group(), pts = []; for (let i = 0; i <= 50; i++) pts.push(new THREE.Vector3(i * .1 - 2.5, Math.sin(i * .3) * .3, Math.cos(i * .22) * .18));
  const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, 300, .22, 24), p = tg.attributes.position;
  // 꼬리 쪽으로 가늘게
  for (let i = 0; i < p.count; i++) { const seg = Math.floor(i / 25) / 300, c = curve.getPointAt(Math.min(1, seg)), k = .25 + .75 * Math.pow(Math.min(1, seg * 1.1), .5); p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
  tg.computeVertexNormals();
  const [cv, c2] = canvas(1024, 128), hues = ['#ffb4bc', '#ffd0a8', '#fff0b0', '#c4ecc0', '#b4dcf8', '#cfc0f4', '#f8c0e4']; const lg = c2.createLinearGradient(0, 0, 1024, 0); hues.forEach((h, i) => lg.addColorStop(i / 6, h)); c2.fillStyle = lg; c2.fillRect(0, 0, 1024, 128);
  for (let y = 0; y < 128; y += 10) for (let x = 0; x < 1024; x += 14) {  }
  const vg = c2.createLinearGradient(0, 0, 0, 128); vg.addColorStop(0, 'rgba(0,0,0,.25)'); vg.addColorStop(.5, 'rgba(255,255,255,.15)'); vg.addColorStop(1, 'rgba(0,0,0,.25)'); c2.fillStyle = vg; c2.fillRect(0, 0, 1024, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  g.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ map: tex, roughness: .95, emissive: '#ffffff', emissiveIntensity: .15 })));
  const hp = curve.getPointAt(0); const head = new THREE.Mesh(new THREE.SphereGeometry(.19, 28, 20), new THREE.MeshStandardMaterial({ color: '#ff8a8a', roughness: .25, clearcoat: 1 })); head.position.copy(hp).add(new THREE.Vector3(-.08, 0, 0)); head.scale.set(1.5, .9, .9); g.add(head);
  eye(g, hp.x - .15, hp.y + .07, .13, 1.05);
  // 등지느러미 리본
  const rib = []; for (let i = 3; i <= 48; i++) { const c = curve.getPointAt(i / 50); rib.push(c); }
  rib.forEach((c, i) => { if (i % 2) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(.1, .14), new THREE.MeshStandardMaterial({ color: hues[Math.floor(i / rib.length * 6)], transparent: true, opacity: .55, side: THREE.DoubleSide })); m.position.copy(c).add(new THREE.Vector3(0, .17 * (1 - i / rib.length * .6), 0)); g.add(m); });
  g.rotation.y = Math.PI; return g;
}
function makeWhale(f) {
  const g = new THREE.Group(), geo = bodyGeo({ h: .95, th: .9, len: 4.2, ped: .14, head: 'round', round: 1, keepH: 1 }); g.add(new THREE.Mesh(geo, bodyMat({ ...f, pat: 'none' }, { bumpScale: 0, sheen: 1, emissive: C('#c8e0ff'), emissiveIntensity: .02, envMapIntensity: .3 })));
  const fluke = fin([[0, 0], [-.2, .2, -.7, .85], [-.6, .25, -.45, 0], [-.6, -.25, -.7, -.85], [-.2, -.2, 0, 0]], '#d8e8f8', null, .05, .95); fluke.rotation.x = Math.PI / 2; fluke.position.set(-2.05, 0, 0); g.add(fluke);
  [1, -1].forEach(sd => { const fl = fin([[0, 0], [-.2, -.25, -.7, -.5], [-.35, -.05, 0, 0]], '#e0ecf8', null, .05, .95); fl.position.set(.6, -.55, .7 * sd); fl.rotation.set(sd * 1.0, sd * .5, 0); g.add(fl); });
  for (let k = 0; k < 8; k++) { const cl = new THREE.Mesh(new THREE.SphereGeometry(.28 + R() * .18, 24, 16), new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: .9, sheen: .6, sheenColor: C('#ffffff'), envMapIntensity: .3 })); cl.position.set(-.9 + k * .32, 1.0 + Math.sin(k * 1.7) * .1, (R() - .5) * .4); g.add(cl); }
  eye(g, 1.45, .08, .8, 2); const sm = new THREE.Mesh(new THREE.TorusGeometry(.3, .02, 8, 24, Math.PI * .5), new THREE.MeshStandardMaterial({ color: '#7a90a8' })); sm.position.set(1.75, -.25, .55); sm.rotation.set(0, -.4, Math.PI * 1.15); g.add(sm);
  [1, -1].forEach(sd => { const ch = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffb8c8', transparent: true, opacity: .6 })); ch.position.set(1.55, -.15, .8 * sd); ch.scale.set(1, .6, .3); g.add(ch); });
  return g;
}
function makeShark(f) {
  const g = new THREE.Group(), geo = bodyGeo({ h: .55, th: .78, len: 4.6, ped: .14, keepH: 1 });
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > 1.6) { const k = (x - 1.6) / .7; p.setY(i, p.getY(i) * (1 - k * .35) - k * .05); } } geo.computeVertexNormals(); // 뾰족한 주둥이
  g.add(new THREE.Mesh(geo, bodyMat({ ...f, pat: 'none', c1: '#e0e8d8', c2: '#3a5a3a' }, { bumpScale: .4, roughness: .55, clearcoat: .3 })));
  const sc = '#3a5a3a';
  const df = fin([[0, 0], [-.15, .55, -.62, .9], [-.4, .35, -.75, 0]], sc, null, .03, .98); df.position.set(.35, .52, 0); g.add(df);
  const tl = fin([[0, .05], [-.35, .5, -.85, 1.1], [-.55, .25, -.6, 0], [-.55, -.2, -.72, -.55], [-.3, -.2, 0, -.05]], sc, null, .04, .98); tl.position.set(-2.25, .02, 0); g.add(tl);
  [1, -1].forEach(sd => { const pf = fin([[0, 0], [-.3, -.25, -.95, -.55], [-.35, -.1, 0, 0]], sc, null, .06, .98); pf.position.set(.75, -.3, .38 * sd); pf.rotation.set(sd * .85, sd * .25, 0); g.add(pf); });
  const sf = fin([[0, 0], [-.05, .15, -.2, .22], [-.15, .05, -.2, 0]], sc, null, .01, .98); sf.position.set(-1.25, .3, 0); g.add(sf);
  for (let k = 0; k < 22; k++) { const u = .2 + k * .025, m = new THREE.Mesh(new THREE.IcosahedronGeometry(.07 + R() * .05, 2), new THREE.MeshStandardMaterial({ color: k % 3 ? '#6aa84a' : '#8ac060', roughness: 1 })); m.position.set((.5 - u) * 4.6, .55 * geo.userData.prof(u) * 1.08, (R() - .5) * .25); m.scale.y = .6; g.add(m); }
  for (let k = 0; k < 6; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshStandardMaterial({ color: ['#ffe080', '#ffffff', '#ff9ab8'][k % 3] })); fl.position.set(.6 - k * .35, .62, (R() - .5) * .2); g.add(fl); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.2, .018, 6, 20, Math.PI * .7), new THREE.MeshStandardMaterial({ color: '#e88a9a' })); mouth.position.set(1.95, -.18, 0); mouth.rotation.set(Math.PI / 2, 0, Math.PI * 1.15); g.add(mouth);
  eye(g, 1.72, .1, .33, 1.3); return g;
}
