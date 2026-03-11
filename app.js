import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const AU = 149_597_870.7;
const SOLAR_MASS = 1.98847e30;
const G = 6.6743e-11;
const C = 299_792_458;

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
camera.position.set(0, 110, 280);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.01;
controls.maxDistance = 2e6;

const ambient = new THREE.AmbientLight(0x6b84aa, 0.7);
scene.add(ambient);
const sunLight = new THREE.PointLight(0xfff2c3, 3.2, 0, 1.5);
scene.add(sunLight);

const starGeo = new THREE.BufferGeometry();
const starVertices = new Float32Array(12000 * 3);
for (let i = 0; i < starVertices.length; i += 3) {
  const radius = 60000 + Math.random() * 900000;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starVertices[i] = radius * Math.sin(phi) * Math.cos(theta);
  starVertices[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starVertices[i + 2] = radius * Math.cos(phi);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xb8d4ff, size: 65, sizeAttenuation: true })));

const baseBodies = [
  { name: 'Sun', radiusKm: 696340, mass: SOLAR_MASS, orbitAu: 0, color: 0xffd35f, type: 'star', v: 0 },
  { name: 'Mercury', radiusKm: 2439.7, mass: 3.3011e23, orbitAu: 0.39, color: 0x9a9a9a, type: 'planet', v: 47.4e3 },
  { name: 'Venus', radiusKm: 6051.8, mass: 4.8675e24, orbitAu: 0.72, color: 0xd6b586, type: 'planet', v: 35.0e3 },
  { name: 'Earth', radiusKm: 6371, mass: 5.97237e24, orbitAu: 1.0, color: 0x3b82f6, type: 'planet', v: 29.8e3 },
  { name: 'Moon', radiusKm: 1737.4, mass: 7.347e22, orbitAu: 1.00257, color: 0xd7d7d7, type: 'moon', v: 30.8e3 },
  { name: 'Mars', radiusKm: 3389.5, mass: 6.4171e23, orbitAu: 1.52, color: 0xce6542, type: 'planet', v: 24.1e3 },
  { name: 'Jupiter', radiusKm: 69911, mass: 1.8982e27, orbitAu: 5.2, color: 0xd5c19a, type: 'planet', v: 13.1e3 },
  { name: 'Saturn', radiusKm: 58232, mass: 5.6834e26, orbitAu: 9.58, color: 0xd8c697, type: 'planet', v: 9.7e3 },
  { name: 'Uranus', radiusKm: 25362, mass: 8.6810e25, orbitAu: 19.2, color: 0x79d0d9, type: 'planet', v: 6.8e3 },
  { name: 'Neptune', radiusKm: 24622, mass: 1.02413e26, orbitAu: 30.05, color: 0x4873d5, type: 'planet', v: 5.4e3 },
  { name: 'Ceres', radiusKm: 473, mass: 9.393e20, orbitAu: 2.77, color: 0xa6a6a6, type: 'asteroid', v: 17.9e3 },
  { name: 'Halley', radiusKm: 11, mass: 2.2e14, orbitAu: 17.8, color: 0xbce8ff, type: 'comet', v: 54.6e3 },
  { name: 'Neutron Star X', radiusKm: 12, mass: 2.8 * SOLAR_MASS, orbitAu: 42, color: 0xd8f6ff, type: 'exotic', v: 4e3 },
  { name: 'Stellar BH', radiusKm: 45, mass: 12 * SOLAR_MASS, orbitAu: 60, color: 0x110820, type: 'blackhole', v: 3.2e3 },
  { name: 'SMBH Core', radiusKm: 4300, mass: 4.3e6 * SOLAR_MASS, orbitAu: 120, color: 0x18001e, type: 'blackhole', v: 2.2e3 },
];

const kmScale = 0.00055;
const auScale = 16;

const statusEl = document.getElementById('status');
const focusSelect = document.getElementById('focusSelect');
const modeSelect = document.getElementById('modeSelect');
const massScale = document.getElementById('massScale');
const physicsToggle = document.getElementById('physicsToggle');
const trailsToggle = document.getElementById('trailsToggle');

let theme = 'day';
const bodies = [];
const trailMax = 260;

function makeMaterial(body) {
  const base = new THREE.MeshStandardMaterial({ color: body.color, metalness: 0.15, roughness: 0.74 });
  if (body.type === 'star') {
    return new THREE.MeshStandardMaterial({ color: 0xffdc76, emissive: 0xffab2e, emissiveIntensity: 1.4 });
  }
  if (body.type === 'blackhole') {
    return new THREE.MeshPhysicalMaterial({ color: 0x0b0916, roughness: 0.12, metalness: 0.8, clearcoat: 1 });
  }
  if (body.type === 'exotic') {
    return new THREE.MeshStandardMaterial({ color: 0xd8f6ff, emissive: 0x5fa8ff, emissiveIntensity: 0.9 });
  }
  return base;
}

function createBody(def) {
  const radius = Math.max(0.22, def.radiusKm * kmScale);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 24), makeMaterial(def));
  const ring = def.name === 'Saturn'
    ? new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.3, radius * 2.1, 64),
        new THREE.MeshBasicMaterial({ color: 0xdccfa4, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      )
    : null;
  if (ring) {
    ring.rotation.x = Math.PI / 2.4;
    mesh.add(ring);
  }

  const trail = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([], 3)),
    new THREE.LineBasicMaterial({ color: 0x89a6db, transparent: true, opacity: 0.45 })
  );
  trail.visible = trailsToggle.checked;
  scene.add(trail);

  const orbitX = def.orbitAu * auScale;
  const p = new THREE.Vector3(orbitX, 0, 0);
  const vel = new THREE.Vector3(0, 0, def.v / 1000);

  scene.add(mesh);
  focusSelect.insertAdjacentHTML('beforeend', `<option value="${def.name}">${def.name}</option>`);

  return { ...def, mesh, radius, p, vel, trail, points: [] };
}

baseBodies.forEach((b) => bodies.push(createBody(b)));
focusSelect.value = 'Earth';

function applyTheme() {
  const night = theme === 'night';
  const enhanced = theme === 'enhanced';
  scene.background = new THREE.Color(night ? 0x010207 : enhanced ? 0x040018 : 0x0b1830);
  ambient.intensity = night ? 0.22 : enhanced ? 0.45 : 0.7;
  sunLight.intensity = night ? 2.2 : 3.2;

  for (const body of bodies) {
    const mat = body.mesh.material;
    if (!(mat instanceof THREE.Material)) continue;
    if ('emissiveIntensity' in mat) {
      mat.emissiveIntensity = 0;
    }
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
  if (body.points.length > trailMax * 3) {
    body.points.splice(0, 3);
  }
  body.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(body.points, 3));
  body.trail.geometry.computeBoundingSphere();
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

  statusEl.textContent = `${focus.name}: ${focus.mass.toExponential(3)} kg, visual radius ${visualR.toFixed(2)} units (${km.toFixed(1)} km physical).`;
}

function resetSystem() {
  for (const body of bodies) {
    body.mesh.scale.setScalar(1);
    body.mass = baseBodies.find((b) => b.name === body.name)?.mass ?? body.mass;
    body.p.set(body.orbitAu * auScale, 0, 0);
    body.vel.set(0, 0, body.v / 1000);
    body.points.length = 0;
  }
  massScale.value = '0';
  statusEl.textContent = 'System reset. Stable orbits restored with baseline barycentric approximation.';
}

function distanceScaled(a, b) {
  return a.p.clone().sub(b.p).multiplyScalar(AU / auScale);
}

function integrate(dt) {
  if (!physicsToggle.checked) return;
  const softening = 8e8;
  for (let i = 0; i < bodies.length; i++) {
    const bi = bodies[i];
    if (bi.name === 'Sun') continue;
    const acc = new THREE.Vector3();
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const bj = bodies[j];
      const r = distanceScaled(bj, bi);
      const d2 = Math.max(r.lengthSq(), softening * softening);
      const invDist = 1 / Math.sqrt(d2);
      const scalar = G * bj.mass * invDist * invDist;
      acc.add(r.normalize().multiplyScalar(scalar / 1000));
    }
    bi.vel.addScaledVector(acc, dt);
  }
  for (const body of bodies) {
    if (body.name === 'Sun') continue;
    body.p.addScaledVector(body.vel, dt);
  }
}

function detectCollisions() {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const minDist = (a.radius * a.mesh.scale.x + b.radius * b.mesh.scale.x) * 0.78;
      if (a.p.distanceTo(b.p) < minDist) {
        const mergedMass = a.mass + b.mass;
        const mergedR = Math.cbrt(Math.pow(a.radiusKm, 3) + Math.pow(b.radiusKm, 3));
        a.mass = mergedMass;
        a.radiusKm = mergedR;
        a.mesh.scale.setScalar(Math.max(0.24, mergedR * kmScale) / a.radius);
        a.vel.add(b.vel).multiplyScalar(0.5);
        b.p.set(9e7, 9e7, 9e7);
        statusEl.textContent = `Collision: ${a.name} absorbed ${b.name}. New mass ${mergedMass.toExponential(3)} kg.`;
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
  bodies.forEach((b) => {
    if (b !== star) b.vel.multiplyScalar(1.2);
  });
  statusEl.textContent = 'Supernova pulse emitted: orbital velocities boosted and stellar mass reduced.';
  setTimeout(() => applyTheme(), 1200);
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
  statusEl.textContent = `${focus.name} collapsed: modeled Schwarzschild radius ${rsKm.toFixed(1)} km.`;
}

function spawnCollision() {
  const a = bodies.find((b) => b.name === focusSelect.value);
  const b = bodies.find((x) => x.name !== a.name && (x.type === 'asteroid' || x.type === 'comet'));
  if (!a || !b) return;
  b.p.copy(a.p).add(new THREE.Vector3(a.radius * 3.4, 0, 0));
  b.vel.copy(a.vel).add(new THREE.Vector3(0, 0, -0.8));
  statusEl.textContent = `Collision course set: ${b.name} redirected toward ${a.name}.`;
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
  const dt = Math.min(0.04, clock.getDelta()) * 25;
  integrate(dt);
  detectCollisions();

  const focus = bodies.find((b) => b.name === focusSelect.value);
  if (focus) {
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
