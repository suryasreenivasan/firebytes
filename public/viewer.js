import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URLS = [
  'https://raw.githubusercontent.com/suryasreenivasan/firebytes/main/Current%20Chassis%20V2-compressed.glb',
  'https://raw.githubusercontent.com/suryasreenivasan/firebytes/master/Current%20Chassis%20V2-compressed.glb'
];

const host = document.getElementById('cad-viewer');
const statusEl = document.getElementById('cad-status');
const spinner = document.getElementById('cad-spinner');
const titleEl = document.getElementById('cad-title');
const msgEl = document.getElementById('cad-msg');
const rotateBtn = document.getElementById('cad-rotate');
const resetBtn = document.getElementById('cad-reset');
const wireBtn = document.getElementById('cad-wire');
const fileInput = document.getElementById('cad-file');

let renderer, scene, camera, controls, root;
let wireframe = false;
let homeCam = null;

function setStatus(title, msg, spin){
  titleEl.textContent = title;
  msgEl.textContent = msg;
  spinner.style.display = spin ? 'grid' : 'none';
  statusEl.classList.remove('hide');
}
function clearStatus(){ statusEl.classList.add('hide'); }

function initScene(){
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.5, 500000);
  camera.position.set(320, 240, 420);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.minDistance = 1;
  controls.maxDistance = 200000;

  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a2233, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(1, 1.6, 1.1); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8a3d, 1.1); rim.position.set(-1.2, -0.4, -0.9); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x38bdf8, 0.7); fill.position.set(-0.6, 0.8, -1.2); scene.add(fill);

  root = new THREE.Group();
  scene.add(root);

  window.addEventListener('resize', onResize);
  animate();
}

function onResize(){
  if (!renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate(){
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function clearModel(){
  while (root.children.length) {
    const c = root.children.pop();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
}

function fitView(){
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 100;
  const dist = radius / Math.tan((camera.fov * Math.PI) / 360) * 1.5;
  controls.target.copy(center);
  camera.position.set(center.x + dist * 0.62, center.y + dist * 0.5, center.z + dist * 0.72);
  camera.near = Math.max(dist / 1000, 0.1);
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  controls.minDistance = radius * 0.35;
  controls.maxDistance = dist * 6;
  controls.update();
  homeCam = { pos: camera.position.clone(), target: center.clone() };
}

function addMeshes(meshes){
  clearModel();
  let added = 0;
  meshes.forEach(function(m){
    const attrs = m.attributes || {};
    if (!attrs.position || !attrs.position.array) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(attrs.position.array), 3));
    if (attrs.normal && attrs.normal.array) {
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(attrs.normal.array), 3));
    } else {
      geo.computeVertexNormals();
    }
    if (m.index && m.index.array) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(m.index.array), 1));
    let color = 0xb9c2d0;
    if (m.color && m.color.length === 3) color = new THREE.Color(m.color[0], m.color[1], m.color[2]).getHex();
    const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.45, roughness: 0.42, wireframe: wireframe, side: THREE.DoubleSide });
    root.add(new THREE.Mesh(geo, mat));
    added++;
  });
  return added;
}

async function loadStepBuffer(buffer, label){
  setStatus('Parsing CAD', 'Tessellating ' + label + ' — large assemblies can take a moment.', true);
  await new Promise(function(r){ setTimeout(r, 60); });
  if (typeof window.occtimportjs !== 'function') {
    setStatus('3D engine unavailable', 'The STEP parser could not load. Check your connection and reload.', false);
    return;
  }
  const occt = await window.occtimportjs();
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);
  if (!result || !result.meshes || !result.meshes.length) {
    setStatus('Nothing to display', 'That file did not contain any solid geometry.', false);
    return;
  }
  addMeshes(result.meshes);
  fitView();
  clearStatus();
}

async function loadGltf(url){
  const loader = new GLTFLoader();
  try {
    const mod = await import('three/addons/loaders/DRACOLoader.js');
    const draco = new mod.DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
    loader.setDRACOLoader(draco);
  } catch (e) {}
  try {
    const mo = await import('three/addons/libs/meshopt_decoder.module.js');
    loader.setMeshoptDecoder(mo.MeshoptDecoder);
  } catch (e) {}
  const gltf = await loader.loadAsync(url, function(ev){
    if (ev && ev.total) {
      var pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
      setStatus('Loading CAD', 'Streaming the chassis - ' + pct + '%', true);
    }
  });
  clearModel();
  root.add(gltf.scene);
  root.traverse(function(o){ if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
  fitView();
  clearStatus();
}

async function boot(){
  initScene();
  setStatus('Loading 3D engine', 'Fetching the model viewer.', true);
  for (var i = 0; i < MODEL_URLS.length; i++) {
    try {
      setStatus('Loading CAD', 'Fetching the chassis model.', true);
      await loadGltf(MODEL_URLS[i]);
      return;
    } catch (e) {}
  }
  try {
    const res = await fetch(window.MODEL_URL || '/models/robot.step', { cache: 'force-cache' });
    if (!res.ok) throw new Error('no model');
    await loadStepBuffer(await res.arrayBuffer(), 'robot.step');
  } catch (err) {
    setStatus('CAD model unavailable', 'The hosted model could not be loaded. Use the Open a STEP file button to preview one from your computer.', false);
  }
}

rotateBtn.addEventListener('click', function(){
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('on', controls.autoRotate);
});
resetBtn.addEventListener('click', function(){
  if (homeCam) { camera.position.copy(homeCam.pos); controls.target.copy(homeCam.target); controls.update(); }
});
wireBtn.addEventListener('click', function(){
  wireframe = !wireframe;
  wireBtn.classList.toggle('on', wireframe);
  root.traverse(function(o){ if (o.isMesh && o.material) o.material.wireframe = wireframe; });
});
fileInput.addEventListener('change', async function(e){
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try { await loadStepBuffer(await f.arrayBuffer(), f.name); }
  catch (err) { setStatus('Could not read that file', 'Try exporting the assembly as a .step or .stp file.', false); }
});

boot();
