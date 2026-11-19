// 에셋 공장: 브라우저(three.js)에서 메시를 만들고 GLB로 내보낸다.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildGirl } from './girl.js';
import { buildTrees } from './trees.js';
import { buildDesk, buildChair } from './desk.js';
import { buildCar } from './car.js';
import { buildStatue } from './statue.js';
import { buildSUV } from './suv.js';

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 템플릿: { name, keep, meshes: [{ name, geo, color, material, ... }] }
export function buildTemplates(which) {
  const T = [];
  const want = (n) => !which || which.includes(n);
  if (want('Ghost')) T.push({ name: 'Ghost', keep: [], meshes: buildGirl(mulberry(7)) });
  if (want('Trees')) T.push(...buildTrees(mulberry(11)));
  if (want('StudentDesk')) T.push({ name: 'StudentDesk', keep: ['DeskTop'], meshes: buildDesk() });
  if (want('StudentChair')) T.push({ name: 'StudentChair', keep: ['Seat'], meshes: buildChair() });
  if (want('ReadingGirl')) T.push({ name: 'ReadingGirl', keep: ['Body', 'Head'], meshes: buildStatue() });
  if (want('Sedan')) T.push({ name: 'Sedan', keep: ['Body'], show: ["HeadBeam","Plate","CabinFloor","Dash","DashTop","Cluster","Screen","SteeringWheel","Column","SeatBase","SeatBack","Headrest","RearSeat","RearBack","Console","DriverEye"], meshes: buildCar() });
  if (want('SUV')) T.push({ name: 'SUV', keep: ['Body'], show: ['HeadBeam', 'TailGlow', 'Plate', 'Cluster', 'Screen', 'DomeLight', 'CargoFloor', 'RideSeat', 'SUVDoor'], meshes: buildSUV() });
  return T;
}

// GLB + 템플릿 정보 만들기. 메시마다 자기 중심으로 옮겨서(가져오기 후 Roblox가 중심을 다시 잡으므로) 위치는 따로 적는다.
export async function exportAll(which) {
  const templates = buildTemplates(which);
  const scene = new THREE.Scene();
  const meta = {};
  let tri = 0;
  for (const t of templates) {
    meta[t.name] = { keep: t.keep || [], show: t.show || [], meshes: [] };
    if (t.leafSpots) meta[t.name].leafSpots = t.leafSpots;
    t.meshes.forEach((m, i) => {
      const geo = m.geo;
      geo.computeBoundingBox();
      const bb = geo.boundingBox, c = new THREE.Vector3(), s = new THREE.Vector3();
      bb.getCenter(c); bb.getSize(s);
      let g2 = geo.clone();
      g2.translate(-c.x, -c.y, -c.z);
      // 파일 크기 줄이기: uv·색 버리고 같은 점은 하나로 (인덱스 메시)
      (m.keepUV ? ['uv1', 'uv2', 'color'] : ['uv', 'uv1', 'uv2', 'color']).forEach((a) => { if (g2.attributes[a]) g2.deleteAttribute(a); });
      if (!g2.attributes.normal) g2.computeVertexNormals();
      if (!g2.index) g2 = mergeVertices(g2, 1e-4);
      const meshName = `${t.name}_${m.name.replace(/^.*?_/, '')}`.replace(/[^A-Za-z0-9_]/g, '');
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(...m.color.map((v) => v / 255)), roughness: 0.8 });
      const mesh = new THREE.Mesh(g2, mat);
      mesh.name = meshName;
      scene.add(mesh);
      const n = (g2.index ? g2.index.count : g2.attributes.position.count) / 3;
      tri += n;
      meta[t.name].meshes.push({
        mesh: meshName, name: m.partName || m.name, size: [s.x, s.y, s.z].map((v) => Math.max(0.05, +v.toFixed(4))),
        pos: [c.x, c.y, c.z].map((v) => +v.toFixed(4)), color: m.color, material: m.material || 'SmoothPlastic',
        reflectance: m.reflectance || 0, transparency: m.transparency || 0, collide: !!m.collide, shadow: m.shadow !== false, tris: n, ...(m.bark ? { bark: m.bark } : {}),
      });
    });
  }
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(scene, { binary: true });
  let bin = '';
  const bytes = new Uint8Array(glb);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { glb: btoa(bin), meta, tri };
}
window.exportAll = exportAll;
window.buildTemplates = buildTemplates;
window.FACTORY_READY = true;
