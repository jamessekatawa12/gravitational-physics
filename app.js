import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const AU = 149_597_870_700;
const SOLAR_MASS = 1.98847e30;
const G = 6.6743e-11;
const C = 299_792_458;

const sceneUnitsPerMeter = 16 / AU;
const metersPerSceneUnit = AU / 16;
const kmScale = 0.00055;

const statusEl = document.getElementById('status');
const focusSelect = document.getElementById('focusSelect');
const modeSelect = document.getElementById('modeSelect');
const massScale = document.getElementById('massScale');
const timeScaleSlider = document.getElementById('timeScale');
const physicsToggle = document.getElementById('physicsToggle');
const followToggle = document.getElementById('followToggle');
const trailsToggle = document.getElementById('trailsToggle');

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('scene'),
  antialias: true,
  logarithmicDepthBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020409, 0.00008);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.001, 1e8);
camera.position.set(0, 140, 320);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.01;
controls.maxDistance = 2e6;

const ambient = new THREE.AmbientLight(0x6b84aa, 0.7);
scene.add(ambient);
const sunLight = new THREE.PointLight(0xfff2c3, 3.2, 0, 1.5);
scene.add(sunLight);

const starGeo = new THREE.BufferGeometry();
const starVertices = new Float32Array(10000 * 3);
for (let i = 0; i < starVertices.length; i += 3) {
  const radius = 70000 + Math.random() * 900000;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starVertices[i] = radius * Math.sin(phi) * Math.cos(theta);
  starVertices[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starVertices[i + 2] = radius * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xb8d4ff, size: 60, sizeAttenuation: true })));

const baseBodies = [
  { name: 'Sun', radiusKm: 696340, mass: SOLAR_MASS, orbitAu: 0, color: 0xffd35f, type: 'star' },
  { name: 'Mercury', radiusKm: 2439.7, mass: 3.3011e23, orbitAu: 0.39, color: 0x9a9a9a, type: 'planet' },
  { name: 'Venus', radiusKm: 6051.8, mass: 4.8675e24, orbitAu: 0.72, color: 0xd6b586, type: 'planet' },
  { name: 'Earth', radiusKm: 6371, mass: 5.97237e24, orbitAu: 1.0, color: 0x3b82f6, type: 'planet' },
  { name: 'Moon', radiusKm: 1737.4, mass: 7.347e22, orbitAu: 1.00257, color: 0xd7d7d7, type: 'moon' },
  { name: 'Mars', radiusKm: 3389.5, mass: 6.4171e23, orbitAu: 1.52, color: 0xce6542, type: 'planet' },
  { name: 'Jupiter', radiusKm: 69911, mass: 1.8982e27, orbitAu: 5.2, color: 0xd5c19a, type: 'planet' },
  { name: 'Saturn', radiusKm: 58232, mass: 5.6834e26, orbitAu: 9.58, color: 0xd8c697, type: 'planet' },
  { name: 'Uranus', radiusKm: 25362, mass: 8.681e25, orbitAu: 19.2, color: 0x79d0d9, type: 'planet' },
  { name: 'Neptune', radiusKm: 24622, mass: 1.02413e26, orbitAu: 30.05, color: 0x4873d5, type: 'planet' },
  { name: 'Ceres', radiusKm: 473, mass: 9.393e20, orbitAu: 2.77, color: 0xa6a6a6, type: 'asteroid' },
  { name: 'Halley', radiusKm: 11, mass: 2.2e14, orbitAu: 17.8, color: 0xbce8ff, type: 'comet' },
  { name: 'Neutron Star X', radiusKm: 12, mass: 2.8 * SOLAR_MASS, orbitAu: 42, color: 0xd8f6ff, type: 'exotic' },
  { name: 'Stellar BH', radiusKm: 45, mass: 12 * SOLAR_MASS, orbitAu: 60, color: 0x110820, type: 'blackhole' },
  { name: 'SMBH Core', radiusKm: 4300, mass: 4.3e6 * SOLAR_MASS, orbitAu: 120, color: 0x18001e, type: 'blackhole' },
];

const bodies = [];
const trailMax = 280;
let theme = 'day';

function makeMaterial(body) {
  if (body.type === 'star') {
    return new THREE.MeshStandardMaterial({ color: 0xffdc76, emissive: 0xffab2e, emissiveIntensity: 1.4 });
  }
  if (body.type === 'blackhole') {
    return new THREE.MeshPhysicalMaterial({ color: 0x0b0916, roughness: 0.12, metalness: 0.8, clearcoat: 1 });
  }
  if (body.type === 'exotic') {
    return new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x5fa8ff, emissiveIntensity: 0.9 });
  }
  return new THREE.MeshStandardMaterial({ color: body.color, metalness: 0.15, roughness: 0.74 });
}

function circularVelocity(massCenter, radiusMeters) {
  return Math.sqrt((G * massCenter) / radiusMeters);
}

function orbitalPhase(name, idx) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return ((hash + idx * 17) / 997) * Math.PI * 2;
}

function createBody(def, index) {
  const radius = Math.max(0.22, def.radiusKm * kmScale);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), makeMaterial(def));

  if (def.name === 'Saturn') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.3, radius * 2.1, 64),
      new THREE.MeshBasicMaterial({ color: 0xdccfa4, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2.4;
    mesh.add(ring);
  }

  const trail = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([], 3)),
    new THREE.LineBasicMaterial({ color: 0x89a6db, transparent: true, opacity: 0.45 })
  );
  trail.visible = trailsToggle.checked;
  scene.add(trail);

  const phase = orbitalPhase(def.name, index);
  const orbitMeters = def.orbitAu * AU;
  const orbitScene = orbitMeters * sceneUnitsPerMeter;
  const p = new THREE.Vector3(orbitScene * Math.cos(phase), 0, orbitScene * Math.sin(phase));

  const speedMs = def.name === 'Sun' ? 0 : circularVelocity(SOLAR_MASS, Math.max(orbitMeters, 1));
  const tangent = new THREE.Vector3(-Math.sin(phase), 0, Math.cos(phase));
  const vel = tangent.multiplyScalar(speedMs * sceneUnitsPerMeter);

  scene.add(mesh);
  focusSelect.insertAdjacentHTML('beforeend', `<option value="${def.name}">${def.name}</option>`);

  return {
    ...def,
    mesh,
    radius,
    p,
    vel,
    initialP: p.clone(),
    initialVel: vel.clone(),
    trail,
    points: [],
  };
}

baseBodies.forEach((body, i) => bodies.push(createBody(body, i)));
focusSelect.value = 'Sun';

function applyTheme() {
  const night = theme === 'night';
  const enhanced = theme === 'enhanced';
  scene.background = new THREE.Color(night ? 0x010207 : enhanced ? 0x040018 : 0x0b1830);
  ambient.intensity = night ? 0.22 : enhanced ? 0.45 : 0.7;
  sunLight.intensity = night ? 2.2 : 3.2;

  for (const body of bodies) {
    const mat = body.mesh.material;
    if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0;
    if (night && body.type === 'planet') {
      mat.emissive = new THREE.Color(0x13325e);
      mat.emissiveIntensity = 0.22;
    }
    if (enhanced && (body.type === 'blackhole' || body.type === 'exotic')) {
      mat.emissive = new THREE.Color(body.type === 'blackhole' ? 0x8d1aff : 0x00bfff);
      mat.emissiveIntensity = 0.85;
    }
  }
}

function appendTrail(body) {
  body.points.push(body.p.x, body.p.y, body.p.z);
  if (body.points.length > trailMax * 3) body.points.splice(0, 3);
  body.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(body.points, 3));
}

function schwarzschildRadiusKm(mass) {
  return (2 * G * mass) / (C * C) / 1000;
}

function morphFocusedBody() {
  const focus = bodies.find((b) => b.name === focusSelect.value);
  if (!focus) return;

  const t = Number(massScale.value);
  const classes = [
    { mass: focus.mass, radiusKm: focus.radiusKm },
    { mass: SOLAR_MASS, radiusKm: 696340 },
    { mass: 12 * SOLAR_MASS, radiusKm: schwarzschildRadiusKm(12 * SOLAR_MASS) },
    { mass: 4.3e6 * SOLAR_MASS, radiusKm: schwarzschildRadiusKm(4.3e6 * SOLAR_MASS) },
  ];
  const i = Math.floor(t);
  const f = t - i;
  const a = classes[Math.min(i, classes.length - 1)];
  const b = classes[Math.min(i + 1, classes.length - 1)];

  focus.mass = a.mass + (b.mass - a.mass) * f;
  const km = a.radiusKm + (b.radiusKm - a.radiusKm) * f;
  const visualR = Math.max(0.24, km * kmScale * (km < 100 ? 7 : 1));
  focus.mesh.scale.setScalar(visualR / focus.radius);

  statusEl.textContent = `${focus.name}: ${focus.mass.toExponential(3)} kg, ${km.toFixed(1)} km physical radius.`;
}

function resetSystem() {
  for (const body of bodies) {
    body.mesh.scale.setScalar(1);
    body.mass = baseBodies.find((b) => b.name === body.name)?.mass ?? body.mass;
    body.p.copy(body.initialP);
    body.vel.copy(body.initialVel);
    body.points.length = 0;
    body.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  }
  massScale.value = '0';
  statusEl.textContent = 'Dynamics reset. Bodies are now initialized on stable circular trajectories.';
}

function integrate(deltaSeconds) {
  if (!physicsToggle.checked || deltaSeconds <= 0) return;

  const softening = 8e8;
  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    if (bi.name === 'Sun') continue;

    const accMeters = new THREE.Vector3();
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const bj = bodies[j];

      const rScene = bj.p.clone().sub(bi.p);
      const rMeters = rScene.multiplyScalar(metersPerSceneUnit);
      const d2 = Math.max(rMeters.lengthSq(), softening * softening);
      const d = Math.sqrt(d2);
      const scalar = (G * bj.mass) / d2;
      accMeters.add(rMeters.multiplyScalar(scalar / d));
    }

    const accScene = accMeters.multiplyScalar(sceneUnitsPerMeter);
    bi.vel.addScaledVector(accScene, deltaSeconds);
  }

  for (const body of bodies) {
    if (body.name === 'Sun') continue;
    body.p.addScaledVector(body.vel, deltaSeconds);
  }
}

function detectCollisions() {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const threshold = (a.radius * a.mesh.scale.x + b.radius * b.mesh.scale.x) * 0.8;
      if (a.p.distanceTo(b.p) < threshold) {
        a.mass += b.mass;
        a.vel.add(b.vel).multiplyScalar(0.5);
        b.p.set(9e7, 9e7, 9e7);
        statusEl.textContent = `Collision event: ${a.name} absorbed ${b.name}.`;
      }
    }
  }
}

function supernova() {
  const star = bodies.find((b) => b.type === 'star');
  if (!star) return;
  star.mesh.material.emissive = new THREE.Color(0xff5522);
  star.mesh.material.emissiveIntensity = 5;
  star.mass *= 0.84;
  for (const body of bodies) {
    if (body !== star) body.vel.multiplyScalar(1.15);
  }
  statusEl.textContent = 'Supernova pulse applied: central star mass reduced, outer velocities boosted.';
  setTimeout(() => applyTheme(), 900);
}

function collapseFocus() {
  const focus = bodies.find((b) => b.name === focusSelect.value);
  if (!focus) return;
  focus.mass *= 3;
  const rsKm = schwarzschildRadiusKm(focus.mass);
  focus.mesh.material.color = new THREE.Color(0x08040f);
  focus.mesh.material.emissive = new THREE.Color(0x5d00ff);
  focus.mesh.material.emissiveIntensity = 1.2;
  focus.mesh.scale.setScalar(Math.max(0.35, rsKm * kmScale * 14) / focus.radius);
  statusEl.textContent = `${focus.name} collapsed to compact object (Schwarzschild radius ~${rsKm.toFixed(1)} km).`;
}

function spawnCollision() {
  const focus = bodies.find((b) => b.name === focusSelect.value);
  const impactor = bodies.find((b) => b.type === 'asteroid' || b.type === 'comet');
  if (!focus || !impactor || focus === impactor) return;
  impactor.p.copy(focus.p).add(new THREE.Vector3(focus.radius * 4, 0, 0));
  impactor.vel.copy(focus.vel).add(new THREE.Vector3(0, 0, -0.6));
  statusEl.textContent = `${impactor.name} redirected toward ${focus.name}. Collision imminent.`;
}

modeSelect.addEventListener('change', (e) => {
  theme = e.target.value;
  applyTheme();
});
massScale.addEventListener('input', morphFocusedBody);
focusSelect.addEventListener('change', morphFocusedBody);
trailsToggle.addEventListener('change', () => bodies.forEach((b) => (b.trail.visible = trailsToggle.checked)));

document.getElementById('spawnSupernova').addEventListener('click', supernova);
document.getElementById('spawnCollapse').addEventListener('click', collapseFocus);
document.getElementById('spawnCollision').addEventListener('click', spawnCollision);
document.getElementById('resetSystem').addEventListener('click', resetSystem);

applyTheme();
resetSystem();

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);

  const delta = Math.min(0.05, clock.getDelta());
  const simulationSeconds = delta * Number(timeScaleSlider.value) * 6000;
  integrate(simulationSeconds);
  detectCollisions();

  const focus = bodies.find((b) => b.name === focusSelect.value);
  if (focus && followToggle.checked) {
    controls.target.lerp(focus.p, 0.08);
  }

  for (const body of bodies) {
    body.mesh.position.copy(body.p);
    appendTrail(body);
  }

  controls.update();
  renderer.render(scene, camera);
}
frame();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
