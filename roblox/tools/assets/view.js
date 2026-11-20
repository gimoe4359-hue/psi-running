// 에셋 확인용 뷰어: GLB를 불러와 템플릿 하나를 여러 각도로 그린다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
const W = 1600, H = 900;
const r = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(r.domElement);
const meta = await (await fetch('/assets_meta.json')).json();
const gltf = await new GLTFLoader().loadAsync('/SongcheonAssets.glb');
const byName = {}; gltf.scene.traverse((o) => { if (o.isMesh) byName[o.name] = o; });
const ROUGH = { Fabric: 0.95, SmoothPlastic: 0.45, Metal: 0.4, Wood: 0.7 };
window.view = (tname, views, mood) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(mood === 'dark' ? 0x0b0d12 : 0x30343c);
  const hemi = new THREE.HemisphereLight(0xdde4ff, 0x302820, mood === 'dark' ? 0.35 : 1.1); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, mood === 'dark' ? 0.4 : 2.2); key.position.set(-3, 8, -6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 8; key.shadow.camera.bottom = -2; scene.add(key);
  if (mood === 'dark') { const s = new THREE.SpotLight(0xfff0d8, 260, 60, 0.4, 0.5, 1.4); s.position.set(1.5, 4.8, -9); s.target.position.set(0, 3, 0); s.castShadow = true; scene.add(s, s.target); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const t = meta[tname];
  const group = new THREE.Group();
  t.meshes.forEach((m) => {
    const src = byName[m.mesh]; if (!src) return;
    const mesh = new THREE.Mesh(src.geometry, new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...m.color.map((v) => v / 255), THREE.SRGBColorSpace), roughness: ROUGH[m.material] ?? 0.7, metalness: m.material === 'Metal' ? 0.5 : 0 }));
    mesh.position.set(...m.pos); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  });
  scene.add(group);
  const bb = new THREE.Box3().setFromObject(group), c = new THREE.Vector3(), s = new THREE.Vector3(); bb.getCenter(c); bb.getSize(s);
  const shots = [];
  const cam = new THREE.PerspectiveCamera(30, W / views.length / H, 0.05, 500);
  const composer = new EffectComposer(r); composer.addPass(new RenderPass(scene, cam)); composer.addPass(new OutputPass());
  r.setScissorTest(true);
  views.forEach((ang, i) => {
    const vw = W / views.length;
    r.setViewport(i * vw, 0, vw, H); r.setScissor(i * vw, 0, vw, H);
    const d = Math.max(s.y, s.x) * 2.1;
    cam.position.set(c.x + Math.sin(ang) * d, c.y + s.y * 0.08, c.z - Math.cos(ang) * d); cam.lookAt(c); cam.updateProjectionMatrix();
    r.render(scene, cam);
  });
  r.setScissorTest(false);
  return true;
};
window.READY = true;
