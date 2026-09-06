import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js';

import { stepHandling } from './handling.js?v=5';
const technical = new URLSearchParams(location.search).get('stage') === '2';
const $ = (selector) => document.querySelector(selector);
const ui = {
  intro: $('#intro'), start: $('#start'), hud: $('#hud'), position: $('#position'), lap: $('#lap'),
  progress: $('#progress'), zone: $('#zone'), speed: $('#speed'), sound: $('#sound'), boostBar: $('#boostBar'),
  boostText: $('#boostText'), stick: $('#stick'), stickKnob: $('#stickKnob'), drift: $('#drift'), turbo: $('#turbo'),
  message: $('#message'), messageSub: $('#messageSub'), messageMain: $('#messageMain'), countdown: $('#countdown'),
  result: $('#resultOverlay'), resultPlace: $('#resultPlace'), resultTitle: $('#resultTitle'), resultTime: $('#resultTime'),
  retry: $('#retry'), error: $('#error'), speedFlash: $('#speedFlash')
};

const TOTAL_LAPS = 3;
const ROAD_HALF = 8.2;
const OFFROAD_EDGE = 7.55;
const TRACK_SAMPLES = 720;
const UP = new THREE.Vector3(0, 1, 0);
const tempPoint = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const tempSide = new THREE.Vector3();
const tempNormal = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();
const tempQuat = new THREE.Quaternion();
const tempColor = new THREE.Color();

const controlPoints = (technical ? [
  [0,6,100],[70,6,100],[100,7,75],[100,7,35],[75,8,18],
  [50,8,35],[48,8,68],[20,8,70],[-8,9,38],[15,9,5],
  [40,10,-30],[25,10,-72],[-25,8,-100],[-80,7,-80],
  [-105,6,-35],[-78,6,5],[-105,6,45],[-80,6,90],[-40,6,100]
] : [
  [0, 4.2, 83], [45, 4.8, 75], [82, 7.5, 47], [94, 11.5, 5],
  [78, 7.2, -43], [43, 4.5, -78], [-4, 5.8, -91], [-49, 12.5, -77],
  [-83, 16.5, -45], [-95, 9.5, 0], [-79, 5.2, 47], [-43, 4.1, 76]
]).map(([x, y, z]) => new THREE.Vector3(x, y, z));

const track = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);
track.arcLengthDivisions = 2400;
track.updateArcLengths();
const trackLength = track.getLength();

let scene;
let camera;
let renderer;
let clock;
let audio;
let raceState = 'intro';
let countdownLeft = 0;
let countdownShown = 0;
let raceTime = 0;
let messageTimer = 0;
let collisionCooldown = 0;
let player;
let rivals = [];
let pickups = [];
let boostPads = [];
let wheelMeshes = [];
let particlePool;
let sunGlow;
let ocean;
const balloons = [];

const input = { left: false, right: false, drift: false, swipe: 0, swipeId: null, swipeStartX: 0 };

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function seededRandom(seed = 12345) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const random = seededRandom(91274);
const rand = (min, max) => min + (max - min) * random();

function frameAt(t, point = tempPoint, tangent = tempTangent, side = tempSide, normal = tempNormal) {
  const wrapped = wrap01(t);
  track.getPointAt(wrapped, point);
  track.getTangentAt(wrapped, tangent).normalize();
  side.crossVectors(UP, tangent).normalize();
  normal.crossVectors(tangent, side).normalize();
  return { point, tangent, side, normal };
}

function setTrackTransform(object, t, lateral = 0, height = 0) {
  const frame = frameAt(t);
  object.position.copy(frame.point).addScaledVector(frame.side, lateral).addScaledVector(frame.normal, height);
  tempMatrix.makeBasis(frame.side, frame.normal, frame.tangent);
  object.quaternion.setFromRotationMatrix(tempMatrix);
}

function circularDistance(a, b) {
  const d = Math.abs(wrap01(a) - wrap01(b));
  return Math.min(d, 1 - d);
}

function boot() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x74caf0);
    scene.fog = new THREE.FogExp2(0xa7d9eb, 0.0027);

    camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 620);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, /iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.35 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute('aria-label', 'スカイターボ・レーサーズ 3Dゲーム画面');
    document.body.prepend(renderer.domElement);

    clock = new THREE.Clock();
    createSky();
    createLights();
    createWorld();
    createTrack();
    createScenery();
    createRaceObjects();
    createParticles();
    bindControls();
    updateRaceTransforms(0);
    updateCamera(0.016, true);
    renderer.setAnimationLoop(animate);
  } catch (error) {
    console.error(error);
    ui.error.style.display = 'grid';
  }
}

function createSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x2878ca) },
        middle: { value: new THREE.Color(0x78d6f0) },
        bottom: { value: new THREE.Color(0xffd39a) }
      },
      vertexShader: 'varying vec3 vWorld; void main(){vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 middle;uniform vec3 bottom;varying vec3 vWorld;void main(){float h=normalize(vWorld).y;vec3 c=mix(bottom,middle,smoothstep(-.12,.16,h));c=mix(c,top,smoothstep(.16,.78,h));gl_FragColor=vec4(c,1.0);}'
    })
  );
  scene.add(sky);

  sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#fffbd2', '#ffb44f'), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sunGlow.position.set(-185, 105, -260);
  sunGlow.scale.set(58, 58, 1);
  scene.add(sunGlow);

  const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.76, depthWrite: false });
  for (let i = 0; i < 24; i++) {
    const cloud = new THREE.Group();
    const count = 3 + Math.floor(random() * 3);
    for (let j = 0; j < count; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(4, 8), 9, 6), cloudMaterial);
      puff.position.set((j - count / 2) * rand(4, 7), rand(-1, 2), rand(-2, 2));
      puff.scale.y = rand(0.45, 0.72);
      cloud.add(puff);
    }
    const angle = rand(0, Math.PI * 2);
    const radius = rand(125, 270);
    cloud.position.set(Math.cos(angle) * radius, rand(38, 86), Math.sin(angle) * radius);
    cloud.scale.setScalar(rand(0.65, 1.25));
    scene.add(cloud);
  }
}

function makeGlowTexture(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.17, inner);
  gradient.addColorStop(0.45, outer);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0xd8f5ff, 0x345c56, 2.35));
  const sun = new THREE.DirectionalLight(0xffe1b0, 3.1);
  sun.position.set(-110, 180, -140);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x72a8ff, 0.72);
  fill.position.set(100, 75, 100);
  scene.add(fill);
}

function createWorld() {
  ocean = new THREE.Mesh(
    new THREE.CircleGeometry(390, 72),
    new THREE.MeshPhysicalMaterial({ color: 0x178bc4, roughness: 0.24, metalness: 0.16, clearcoat: 0.8, transparent: true, opacity: 0.92 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -4.3;
  scene.add(ocean);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(132, 119, 5, 64),
    new THREE.MeshLambertMaterial({ color: 0x50a96f })
  );
  island.position.y = -3.9;
  scene.add(island);

  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(139, 131, 1.15, 64),
    new THREE.MeshLambertMaterial({ color: 0xf1cf8b })
  );
  beach.position.y = -3.1;
  scene.add(beach);

  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(128, 128, 1.4, 64),
    new THREE.MeshLambertMaterial({ color: 0x62b96d })
  );
  grass.position.y = -2.35;
  scene.add(grass);
}

function ribbonGeometry(innerHalf, outerHalf, height, colorA, colorB) {
  const positions = [];
  const colors = [];
  const indices = [];
  for (let i = 0; i <= TRACK_SAMPLES; i++) {
    const t = i / TRACK_SAMPLES;
    const frame = frameAt(t, new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
    for (const lateral of [innerHalf, outerHalf]) {
      const p = frame.point.clone().addScaledVector(frame.side, lateral).addScaledVector(frame.normal, height);
      positions.push(p.x, p.y, p.z);
      const c = (Math.floor(i / 9) % 2 === 0) ? tempColor.set(colorA) : tempColor.set(colorB);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTrack() {
  const underside = new THREE.Mesh(
    ribbonGeometry(-11.2, 11.2, -0.6, 0x33425d, 0x33425d),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  );
  scene.add(underside);

  const shoulder = new THREE.Mesh(
    ribbonGeometry(-9.6, 9.6, -0.1, 0xe3eef1, 0xd7e4e8),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  );
  scene.add(shoulder);

  const road = new THREE.Mesh(
    ribbonGeometry(-ROAD_HALF, ROAD_HALF, 0, 0x35455d, 0x304057),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  );
  scene.add(road);

  const curbGeometry = new THREE.BoxGeometry(1.5, 0.24, 2.55);
  const curbMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const curbCount = 180;
  const curbs = new THREE.InstancedMesh(curbGeometry, curbMaterial, curbCount * 2);
  const curbColors = [new THREE.Color(0xff4e78), new THREE.Color(0xffffff)];
  const helper = new THREE.Object3D();
  for (let i = 0; i < curbCount; i++) {
    const t = i / curbCount;
    for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
      setTrackTransform(helper, t, sideIndex ? 8.85 : -8.85, 0.08);
      helper.updateMatrix();
      const index = i * 2 + sideIndex;
      curbs.setMatrixAt(index, helper.matrix);
      curbs.setColorAt(index, curbColors[i % 2]);
    }
  }
  scene.add(curbs);

  const dashGeometry = new THREE.BoxGeometry(0.18, 0.07, 3.2);
  const dashes = new THREE.InstancedMesh(dashGeometry, new THREE.MeshBasicMaterial({ color: 0xc8edff }), 120);
  for (let i = 0; i < 120; i++) {
    setTrackTransform(helper, i / 120, 0, 0.09);
    helper.updateMatrix();
    dashes.setMatrixAt(i, helper.matrix);
  }
  scene.add(dashes);

  createStartLine();
  createTrackArch(0.002, 0x5df3ff, 'START');
  createTrackArch(0.25, 0xffdd51, 'COAST');
  createTrackArch(0.51, 0xff63ca, 'CITY');
  createTrackArch(0.76, 0x7f75ff, 'SKY');

  [0.12, 0.39, 0.68, 0.89].forEach((t, index) => createBoostPad(t, [-2.8, 2.8][index % 2]));
}

function createStartLine() {
  const group = new THREE.Group();
  const tileGeometry = new THREE.BoxGeometry(2.05, 0.08, 1.55);
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dark = new THREE.MeshBasicMaterial({ color: 0x18233d });
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 2; z++) {
      const tile = new THREE.Mesh(tileGeometry, (x + z) % 2 ? white : dark);
      tile.position.set(-7.18 + x * 2.05, 0, (z - 0.5) * 1.55);
      group.add(tile);
    }
  }
  setTrackTransform(group, 0.006, 0, 0.12);
  scene.add(group);
}

function createTrackArch(t, color, label) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.22 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1b2850 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7.2, 0.8), dark);
  const right = left.clone();
  left.position.set(-9.1, 3.5, 0);
  right.position.set(9.1, 3.5, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(19, 1.2, 0.9), material);
  top.position.y = 7;
  group.add(left, right, top);
  for (let i = -3; i <= 3; i++) {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), new THREE.MeshBasicMaterial({ color }));
    light.position.set(i * 2.1, 7, 0.55);
    group.add(light);
  }
  group.userData.label = label;
  setTrackTransform(group, t, 0, 0.1);
  scene.add(group);
}

function createBoostPad(t, lateral) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.11, 6.4),
    new THREE.MeshBasicMaterial({ color: 0x0b557b, transparent: true, opacity: 0.9 })
  );
  group.add(base);
  for (let i = -1; i <= 1; i++) {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 1.65, 3),
      new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffed62 : 0x54edff })
    );
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(i * 1.25, 0.12, 0.25);
    group.add(arrow);
  }
  setTrackTransform(group, t, lateral, 0.13);
  scene.add(group);
  boostPads.push({ t, lateral, group, cooldown: 0 });
}

function createScenery() {
  createTrees();
  if (!technical) createCity();
  createMountains();
  createCrystals();
  createBalloons();
}

function createTrees() {
  const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.4, 2.9, 6);
  const crownGeometry = new THREE.ConeGeometry(1.65, 4.4, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, new THREE.MeshLambertMaterial({ color: 0x81513b }), 105);
  const crowns = new THREE.InstancedMesh(crownGeometry, new THREE.MeshLambertMaterial({ color: 0x238d64 }), 105);
  const helper = new THREE.Object3D();
  const trackSamples = Array.from({ length: 96 }, (_, index) => track.getPointAt(index / 96));
  for (let i = 0; i < 105; i++) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(18, 117);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const nearTrack = trackSamples.some((point) => Math.hypot(point.x - x, point.z - z) < 13);
    const scale = rand(0.65, 1.35);
    helper.position.set(x, -0.7, z);
    helper.scale.setScalar(scale);
    helper.rotation.y = rand(0, Math.PI * 2);
    if (nearTrack) helper.scale.setScalar(0.01);
    helper.updateMatrix();
    trunks.setMatrixAt(i, helper.matrix);
    helper.position.y = 2.55 * scale - 1.9;
    helper.updateMatrix();
    crowns.setMatrixAt(i, helper.matrix);
  }
  scene.add(trunks, crowns);
}

function createCity() {
  const buildingColors = [0x526ab0, 0x6d63bd, 0x398aa4, 0x9a5d9c, 0x3c5b8f];
  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x8df4ff });
  for (let i = 0; i < 25; i++) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(13, 39);
    const width = rand(4.2, 8.5);
    const depth = rand(4.2, 8.5);
    const height = rand(8, 29);
    const building = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshLambertMaterial({ color: buildingColors[i % buildingColors.length] }));
    body.position.y = height / 2;
    building.add(body);
    for (let floor = 3; floor < height - 1; floor += 3.1) {
      const windows = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.55, 0.05), windowMaterial);
      windows.position.set(0, floor, depth / 2 + 0.03);
      building.add(windows);
    }
    building.position.set(Math.cos(angle) * radius, -1.65, Math.sin(angle) * radius);
    building.rotation.y = -angle + rand(-0.35, 0.35);
    scene.add(building);
  }
  const tower = new THREE.Group();
  const towerMat = new THREE.MeshLambertMaterial({ color: 0x536ab9 });
  tower.add(new THREE.Mesh(new THREE.CylinderGeometry(5.3, 8, 35, 8), towerMat));
  tower.children[0].position.y = 15.8;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.3, 0.42, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff6bce }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 31;
  tower.add(ring);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(2.3, 15, 8), new THREE.MeshBasicMaterial({ color: 0x73f3ff }));
  tip.position.y = 42;
  tower.add(tip);
  tower.position.set(0, -1.8, 0);
  scene.add(tower);
}

function createMountains() {
  const materials = [
    new THREE.MeshLambertMaterial({ color: 0x4f8d78 }),
    new THREE.MeshLambertMaterial({ color: 0x5a7da2 }),
    new THREE.MeshLambertMaterial({ color: 0x786fa0 })
  ];
  for (let i = 0; i < 26; i++) {
    const angle = (i / 26) * Math.PI * 2 + rand(-0.09, 0.09);
    const radius = rand(145, 220);
    const height = rand(22, 65);
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(rand(15, 29), height, 6), materials[i % materials.length]);
    mountain.position.set(Math.cos(angle) * radius, height / 2 - 5, Math.sin(angle) * radius);
    mountain.rotation.y = rand(0, Math.PI);
    scene.add(mountain);
  }
}

function createCrystals() {
  const colors = [0x6df2ff, 0xff71d2, 0xffdd63, 0x8878ff];
  for (let i = 0; i < 20; i++) {
    const t = 0.7 + random() * 0.18;
    const frame = frameAt(t, new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
    const lateral = (random() < 0.5 ? -1 : 1) * rand(15, 30);
    const height = rand(3, 8);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(rand(1.1, 2.2), 0),
      new THREE.MeshLambertMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.18 })
    );
    crystal.scale.y = height / 2;
    crystal.position.copy(frame.point).addScaledVector(frame.side, lateral);
    crystal.position.y = height * 0.42 - 1.5;
    crystal.rotation.y = rand(0, Math.PI);
    scene.add(crystal);
  }
}

function createBalloons() {
  const colors = [0xff5f80, 0xffc54c, 0x4de4ee, 0x8e73ff];
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group();
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 8), new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }));
    balloon.scale.y = 1.25;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), new THREE.MeshLambertMaterial({ color: 0x8c5a38 }));
    basket.position.y = -5.2;
    group.add(balloon, basket);
    const angle = rand(0, Math.PI * 2);
    const radius = rand(115, 190);
    group.position.set(Math.cos(angle) * radius, rand(33, 65), Math.sin(angle) * radius);
    group.userData.phase = rand(0, Math.PI * 2);
    scene.add(group);
    balloons.push(group);
  }
}

function createKart(color, accent, isPlayer = false) {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const accentMat = new THREE.MeshLambertMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.12 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x182033 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9eeeff });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.62, 3.55), bodyMat);
  base.position.y = 0.62;
  model.add(base);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.52, 1.45), accentMat);
  nose.position.set(0, 0.77, 2.05);
  model.add(nose);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.76, 12, 8), glass);
  cockpit.scale.set(1, 0.58, 1.12);
  cockpit.position.set(0, 1.23, 0.05);
  model.add(cockpit);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 0.62), accentMat);
  spoiler.position.set(0, 1.18, -1.62);
  model.add(spoiler);
  const spoilerPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.16), dark);
  spoilerPost.position.set(-0.75, 0.87, -1.55);
  const spoilerPost2 = spoilerPost.clone();
  spoilerPost2.position.x = 0.75;
  model.add(spoilerPost, spoilerPost2);
  const wheels = [];
  for (const x of [-1.34, 1.34]) {
    for (const z of [-1.08, 1.12]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.38, 10), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      model.add(wheel);
      wheels.push(wheel);
      wheelMeshes.push(wheel);
    }
  }
  const exhaustMaterial = new THREE.MeshBasicMaterial({ color: 0x64efff, transparent: true, opacity: 0 });
  const exhausts = [];
  for (const x of [-0.72, 0.72]) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.25, 7), exhaustMaterial.clone());
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(x, 0.55, -2.05);
    model.add(flame);
    exhausts.push(flame);
  }
  if (isPlayer) {
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.08, 30), new THREE.MeshBasicMaterial({ color: 0x6df3ff, transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.18;
    model.add(halo);
  }
  model.scale.setScalar(0.82);
  scene.add(root);
  return { root, model, wheels, exhausts };
}

function createRaceObjects() {
  const playerKart = createKart(0x1b76df, 0xffdc50, true);
  player = {
    ...playerKart, total: 0, lateral: 2.6, speed: 0, steer: 0, boost: 38, turboTime: 0,
    heading: 0, slip: 0, drifting: false, offroad: false, finished: false
  };

  const racerData = [
    ['MOMO', 0xff5683, 0xffffff, 33.0], ['VOLT', 0xffc934, 0x3f3192, 32.8],
    ['AQUA', 0x32d9cf, 0xffffff, 32.6], ['NOVA', 0x8a62e7, 0xffd650, 32.3],
    ['JET', 0x48b05c, 0xff7048, 32.1]
  ];
  rivals = racerData.map(([name, color, accent, pace], index) => {
    const kart = createKart(color, accent, false);
    return {
      // Two cars per row; the player occupies the right-hand fourth grid slot.
      ...kart, name, total: [8, 8, 0.8, -8, -8][index] / trackLength, lateral: index % 2 ? 2.6 : -2.6,
      targetLateral: index % 2 ? 2.6 : -2.6, speed: 0, pace, phase: rand(0, Math.PI * 2),
      changeLane: rand(1, 4), turboTime: 0, nextTurbo: rand(4, 8), padCooldown: 0
    };
  });

  const orbMaterial = new THREE.MeshLambertMaterial({ color: 0xffef62, emissive: 0xffb52c, emissiveIntensity: 0.7 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x63f1ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  for (let i = 0; i < 24; i++) {
    const t = 0.035 + i / 24;
    const lateral = [-4.8, 0, 4.8][i % 3];
    const group = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), orbMaterial);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 7, 18), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    group.add(orb, ring);
    setTrackTransform(group, t, lateral, 1.35);
    scene.add(group);
    pickups.push({ t: wrap01(t), lateral, group, orb, ring, active: true, timer: 0, phase: i * 0.61 });
  }
}

function createParticles() {
  const count = 140;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) positions[i * 3 + 1] = -50;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.58, vertexColors: true, transparent: true, opacity: 0.78,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(points);
  particlePool = {
    count, points, positions, colors, cursor: 0,
    life: new Float32Array(count), velocity: Array.from({ length: count }, () => new THREE.Vector3())
  };
}

function spawnParticle(position, color = 0x6af2ff, speed = 1) {
  const i = particlePool.cursor++ % particlePool.count;
  const offset = i * 3;
  particlePool.positions[offset] = position.x + rand(-0.35, 0.35);
  particlePool.positions[offset + 1] = position.y + rand(-0.1, 0.3);
  particlePool.positions[offset + 2] = position.z + rand(-0.35, 0.35);
  tempColor.set(color);
  particlePool.colors[offset] = tempColor.r;
  particlePool.colors[offset + 1] = tempColor.g;
  particlePool.colors[offset + 2] = tempColor.b;
  particlePool.velocity[i].set(rand(-0.5, 0.5), rand(0.25, 1.05), rand(-0.5, 0.5)).multiplyScalar(speed);
  particlePool.life[i] = rand(0.35, 0.75);
  particlePool.points.geometry.attributes.position.needsUpdate = true;
  particlePool.points.geometry.attributes.color.needsUpdate = true;
}

function updateParticles(dt) {
  for (let i = 0; i < particlePool.count; i++) {
    if (particlePool.life[i] <= 0) continue;
    particlePool.life[i] -= dt;
    const offset = i * 3;
    particlePool.positions[offset] += particlePool.velocity[i].x * dt;
    particlePool.positions[offset + 1] += particlePool.velocity[i].y * dt;
    particlePool.positions[offset + 2] += particlePool.velocity[i].z * dt;
    if (particlePool.life[i] <= 0) particlePool.positions[offset + 1] = -50;
  }
  particlePool.points.geometry.attributes.position.needsUpdate = true;
}

function bindHold(button, key, releaseCallback) {
  let owner = null;
  const down = (event) => {
    if (owner !== null) return;
    owner = event.pointerId;
    event.preventDefault();
    input[key] = true;
    button.classList.add('active');
    button.setPointerCapture?.(event.pointerId);
  };
  const up = (event) => {
    if (event.pointerId !== owner) return;
    owner = null;
    event.preventDefault();
    if (input[key] && releaseCallback) releaseCallback();
    input[key] = false;
    button.classList.remove('active');
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
  addEventListener('blur', () => { owner = null; input[key] = false; button.classList.remove('active'); });
  document.addEventListener('visibilitychange', () => { owner = null; input[key] = false; button.classList.remove('active'); });
}

function bindControls() {
  // Safari edge navigation needs a cancelable Touch Event, not only
  // touch-action or pointerdown. Keep this scoped to race controls.
  const guardRaceTouch = (event) => {
    if (raceState !== 'racing' || !event.cancelable) return;
    const onAction = ui.drift.contains(event.target) || ui.turbo.contains(event.target);
    const onSteering = event.target === renderer.domElement &&
      (input.swipeId !== null || Array.from(event.changedTouches).some(touch =>
        touch.clientX <= innerWidth * 0.5 && touch.clientY >= innerHeight * 0.3));
    if (onAction || onSteering) event.preventDefault();
  };
  for (const element of [renderer.domElement, ui.drift, ui.turbo]) {
    element.addEventListener('touchstart', guardRaceTouch, { passive: false });
    element.addEventListener('touchmove', guardRaceTouch, { passive: false });
  }
  bindHold(ui.drift, 'drift', releaseDrift);
  $('#stageName').textContent = technical ? 'STAGE 2 · ヘアピン・リッジ' : 'STAGE 1 · スカイアイランド';
  $('#courseName').textContent = technical ? 'HAIRPIN RIDGE GP' : 'SKY ISLAND GP';
  ui.turbo.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    ui.turbo.classList.add('active');
    activateTurbo();
  });
  ui.turbo.addEventListener('pointerup', () => ui.turbo.classList.remove('active'));
  ui.turbo.addEventListener('pointercancel', () => ui.turbo.classList.remove('active'));

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (raceState !== 'racing' || input.swipeId !== null || event.button !== 0 || event.clientX > innerWidth * 0.5 || event.clientY < innerHeight * 0.3) return;
    event.preventDefault();
    input.swipeId = event.pointerId;
    input.swipeStartX = event.clientX;
    input.swipe = 0;
    ui.stick.style.left = `${event.clientX}px`;
    ui.stick.style.top = `${event.clientY}px`;
    ui.stickKnob.style.transform = 'translateX(0px)';
    ui.stick.classList.add('show');
    renderer.domElement.setPointerCapture?.(event.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (event.pointerId !== input.swipeId) return;
    const offset = THREE.MathUtils.clamp(event.clientX - input.swipeStartX, -58, 58);
    // A small dead zone prevents finger jitter from steering at touch-down.
    input.swipe = Math.sign(offset) * Math.max(0, Math.abs(offset) - 6) / 52;
    ui.stickKnob.style.transform = `translateX(${offset}px)`;
  });
  const endSwipe = (event) => {
    if (event.pointerId !== input.swipeId) return;
    resetSteering();
  };
  renderer.domElement.addEventListener('pointerup', endSwipe);
  renderer.domElement.addEventListener('pointercancel', endSwipe);
  renderer.domElement.addEventListener('lostpointercapture', endSwipe);
  addEventListener('blur', resetSteering);

  addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
    if (event.code === 'Space') input.drift = true;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') activateTurbo();
  });
  addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
    if (event.code === 'Space') { input.drift = false; releaseDrift(); }
  });
  addEventListener('contextmenu', (event) => event.preventDefault());
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => { resetSteering(); clock?.getDelta(); });

  ui.start.addEventListener('click', startRace);
  ui.retry.addEventListener('click', () => location.reload());
  ui.sound.addEventListener('click', () => {
    ensureAudio();
    audio.muted = !audio.muted;
    ui.sound.textContent = audio.muted ? '×' : '♪';
    if (audio.engineGain) audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : 0.018, audio.context.currentTime, 0.06);
  });
}

function resetSteering() {
  const pointerId = input.swipeId;
  input.swipeId = null;
  input.swipe = 0;
  input.left = input.right = input.drift = false;
  ui.drift.classList.remove('active');
  if (player) player.steer = 0;
  ui.stick.classList.remove('show');
  ui.stickKnob.style.transform = 'translateX(0px)';
  if (pointerId !== null && renderer.domElement.hasPointerCapture?.(pointerId)) renderer.domElement.releasePointerCapture(pointerId);
}

function startRace() {
  ensureAudio();
  ui.intro.classList.add('hide');
  ui.hud.classList.add('show');
  raceState = 'countdown';
  countdownLeft = 3.05;
  countdownShown = 0;
  raceTime = 0;
  player.speed = 0;
  showCountdown('3');
  countdownShown = 3;
  playTone(330, 0.1, 'square', 0.07);
}

function showCountdown(text) {
  ui.countdown.textContent = text;
  ui.countdown.classList.remove('pop');
  void ui.countdown.offsetWidth;
  ui.countdown.classList.add('pop');
}

function releaseDrift() {
  if (player) player.drifting = false;
}

function activateTurbo() {
  if (raceState !== 'racing' || player.boost < 25) {
    if (raceState === 'racing') playTone(120, 0.08, 'square', 0.03);
    return;
  }
  player.boost -= 25;
  player.turboTime = Math.max(player.turboTime, 1.35);
  showMessage('FULL POWER!', 'TURBO BOOST');
  playTone(460, 0.24, 'sawtooth', 0.05, 860);
}

function showMessage(sub, main, duration = 1.15) {
  ui.messageSub.textContent = sub;
  ui.messageMain.textContent = main;
  ui.message.classList.add('show');
  messageTimer = duration;
}

function ensureAudio() {
  if (audio) {
    audio.context.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    audio = { muted: true };
    return;
  }
  const context = new AudioContext();
  const engine = context.createOscillator();
  const engineGain = context.createGain();
  const filter = context.createBiquadFilter();
  engine.type = 'sawtooth';
  engine.frequency.value = 70;
  filter.type = 'lowpass';
  filter.frequency.value = 310;
  engineGain.gain.value = 0.018;
  engine.connect(filter).connect(engineGain).connect(context.destination);
  engine.start();
  audio = { context, engine, engineGain, filter, muted: false };
}

function playTone(frequency, duration, type = 'sine', volume = 0.04, endFrequency = frequency) {
  if (!audio?.context || audio.muted) return;
  const now = audio.context.currentTime;
  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audio.context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function updateCountdown(dt) {
  countdownLeft -= dt;
  const next = Math.ceil(countdownLeft);
  if (next > 0 && next !== countdownShown) {
    countdownShown = next;
    showCountdown(String(next));
    playTone(330 + (3 - next) * 80, 0.1, 'square', 0.07);
  }
  if (countdownLeft <= 0) {
    raceState = 'racing';
    showCountdown('GO!');
    playTone(620, 0.35, 'square', 0.08, 980);
  }
}

function curvatureAt(total) {
  const a = track.getTangentAt(wrap01(total - 0.002));
  const b = track.getTangentAt(wrap01(total + 0.002));
  return Math.atan2(a.clone().cross(b).y, a.dot(b)) / (0.004 * trackLength);
}

function updatePlayer(dt) {
  // frame.side points to the racer's left, so positive steering must come
  // from the left control. A rightward swipe therefore uses the negative side.
  const steerInput = THREE.MathUtils.clamp((input.left ? 1 : 0) - (input.right ? 1 : 0) - input.swipe, -1, 1);
  player.steer += (steerInput - player.steer) * (1 - Math.pow(0.0004, dt));
  player.turboTime = Math.max(0, player.turboTime - dt);
  const along = stepHandling(player, player.steer, input.drift, curvatureAt(player.total), dt);
  player.total += along / trackLength * dt;
  ui.drift.innerHTML = player.drifting ? '<b>DRIFT</b>横滑り中' : input.drift ? '<b>BRAKE</b>減速中' : '<b>BRAKE</b>＋ハンドルでドリフト';
  if ((player.drifting || player.offroad) && Math.random() < dt * 30) {
    const rear = new THREE.Vector3(0, 0.4, -1.5).applyQuaternion(player.root.quaternion).add(player.root.position);
    spawnParticle(rear, player.drifting ? 0xeef5ff : 0xe5bf79, 1.8);
  }

  updatePickups(dt);
  updateBoostPads(dt);
  checkRacerCollision();
  if (player.total >= TOTAL_LAPS && !player.finished) finishRace();
}

function updateRivals(dt) {
  for (let index = 0; index < rivals.length; index++) {
    const rival = rivals[index];
    rival.changeLane -= dt;
    if (rival.changeLane <= 0) {
      rival.changeLane = rand(2.2, 5.5);
      rival.targetLateral = rand(-5.5, 5.5);
    }
    rival.lateral += (rival.targetLateral - rival.lateral) * (1 - Math.pow(0.18, dt));
    // Measure the gap in metres, not laps. Leave close battles and short
    // player boosts untouched; gently close large gaps without teleporting.
    const gapMetres = (player.total - rival.total) * trackLength;
    const rubberBand = gapMetres > 12
      ? Math.min(3, (gapMetres - 12) * 0.06)
      : -Math.min(4, Math.max(0, -gapMetres - 18) * 0.06);
    rival.turboTime = Math.max(0, rival.turboTime - dt);
    rival.nextTurbo -= dt;
    rival.padCooldown = Math.max(0, rival.padCooldown - dt);
    if (rival.nextTurbo <= 0) {
      rival.turboTime = Math.max(rival.turboTime, 1.15);
      rival.nextTurbo = rand(5, 9);
    }
    if (rival.padCooldown <= 0 && boostPads.some(pad =>
      circularDistance(rival.total, pad.t) < 0.008 && Math.abs(rival.lateral - pad.lateral) < 3.5)) {
      rival.turboTime = Math.max(rival.turboTime, 1.05);
      rival.padCooldown = 2;
    }
    const wave = Math.sin(raceTime * 0.7 + rival.phase) * 0.45;
    const bend = Math.max(...[0, 0.008, 0.016].map(d => Math.abs(curvatureAt(rival.total + d))));
    const cornerSpeed = Math.max(14, Math.sqrt(30 / Math.max(0.001, bend)));
    const target = Math.min(cornerSpeed, rival.turboTime > 0 ? 45.5 : rival.pace + rubberBand + wave);
    const acceleration = target > rival.speed ? 1.65 : 2.8;
    rival.speed += (target - rival.speed) * (1 - Math.pow(0.05, dt * acceleration));
    rival.total += (rival.speed / trackLength) * dt;
  }
}

function updatePickups(dt) {
  const playerT = wrap01(player.total);
  for (const pickup of pickups) {
    pickup.timer -= dt;
    if (!pickup.active && pickup.timer <= 0) {
      pickup.active = true;
      pickup.group.visible = true;
    }
    pickup.group.rotation.y += dt * 2.4;
    pickup.orb.rotation.x += dt * 1.8;
    pickup.group.position.y += Math.sin(raceTime * 4 + pickup.phase) * dt * 0.13;
    if (!pickup.active) continue;
    if (circularDistance(playerT, pickup.t) < 0.007 && Math.abs(player.lateral - pickup.lateral) < 2.0) {
      pickup.active = false;
      pickup.timer = 6.5;
      pickup.group.visible = false;
      player.boost = Math.min(100, player.boost + 16);
      showMessage('ENERGY +16', 'TURBO ORB', 0.72);
      playTone(650, 0.15, 'sine', 0.055, 1050);
      for (let i = 0; i < 9; i++) spawnParticle(pickup.group.position, i % 2 ? 0xffe45d : 0x63efff, 2.2);
    }
  }
}

function updateBoostPads(dt) {
  const playerT = wrap01(player.total);
  for (const pad of boostPads) {
    pad.cooldown = Math.max(0, pad.cooldown - dt);
    const pulse = 1 + Math.sin(raceTime * 6 + pad.t * 20) * 0.025;
    pad.group.scale.set(pulse, 1, pulse);
    if (pad.cooldown <= 0 && circularDistance(playerT, pad.t) < 0.008 && Math.abs(player.lateral - pad.lateral) < 3.5) {
      pad.cooldown = 2;
      player.turboTime = Math.max(player.turboTime, 1.05);
      player.boost = Math.min(100, player.boost + 7);
      showMessage('SPEED PAD!', 'COURSE BOOST', 0.75);
      playTone(390, 0.21, 'sawtooth', 0.04, 760);
    }
  }
}

function checkRacerCollision() {
  if (collisionCooldown > 0) return;
  for (const rival of rivals) {
    if (Math.abs(player.total - rival.total) < 0.0045 && Math.abs(player.lateral - rival.lateral) < 1.65) {
      const direction = player.lateral <= rival.lateral ? -1 : 1;
      player.lateral += direction * 0.75;
      rival.targetLateral -= direction * 0.7;
      player.speed *= 0.9;
      collisionCooldown = 0.6;
      showMessage('BUMP!', 'ライバルと接触', 0.48);
      playTone(105, 0.1, 'square', 0.035);
      break;
    }
  }
}

function updateRaceTransforms(dt) {
  setRacerTransform(player, wrap01(player.total), player.lateral, player.steer, player.turboTime > 0, dt);
  for (const rival of rivals) {
    const wobble = Math.sin(raceTime * 1.4 + rival.phase) * 0.06;
    setRacerTransform(rival, wrap01(rival.total), rival.lateral, wobble, rival.turboTime > 0, dt);
  }
}

function setRacerTransform(racer, t, lateral, steer, boosting, dt) {
  const frame = frameAt(t);
  racer.root.position.copy(frame.point).addScaledVector(frame.side, lateral).addScaledVector(frame.normal, 0.3);
  tempMatrix.makeBasis(frame.side, frame.normal, frame.tangent);
  racer.root.quaternion.setFromRotationMatrix(tempMatrix);
  racer.model.rotation.z += ((-steer * 0.16) - racer.model.rotation.z) * (1 - Math.pow(0.002, Math.max(dt, 0.001)));
  racer.model.rotation.y += (((racer === player ? player.heading : steer * 0.1)) - racer.model.rotation.y) * (1 - Math.pow(0.004, Math.max(dt, 0.001)));
  for (const wheel of racer.wheels) wheel.rotation.x -= racer.speed * dt * 1.5;
  for (const exhaust of racer.exhausts) {
    exhaust.material.opacity += ((boosting ? 0.9 : 0.04) - exhaust.material.opacity) * (1 - Math.pow(0.004, Math.max(dt, 0.001)));
    const scale = boosting ? rand(0.85, 1.25) : 0.25;
    exhaust.scale.set(scale, scale, scale);
  }
  if (boosting && Math.random() < dt * 32) {
    const rear = racer.root.position.clone().addScaledVector(frame.tangent, -2.2);
    spawnParticle(rear, random() < 0.5 ? 0x61f0ff : 0xffdc52, 2.4);
  }
}

function updateCamera(dt, immediate = false) {
  const frame = frameAt(wrap01(player.total), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
  const speedFactor = THREE.MathUtils.clamp((player.speed - 20) / 25, 0, 1);
  const desired = frame.point.clone()
    .addScaledVector(frame.side, player.lateral * 0.55)
    .addScaledVector(frame.tangent, -10.5 - speedFactor * 2.2)
    .addScaledVector(frame.normal, 5.1 + speedFactor * 0.5);
  const look = frame.point.clone()
    .addScaledVector(frame.side, player.lateral * 0.76)
    .addScaledVector(frame.tangent, 10 + speedFactor * 7)
    .addScaledVector(frame.normal, 1.1);
  if (immediate) camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.pow(0.0015, dt));
  camera.up.lerp(frame.normal, 1 - Math.pow(0.004, dt)).normalize();
  camera.lookAt(look);
  const targetFov = player.turboTime > 0 ? 76 : 66 + speedFactor * 2;
  camera.fov += (targetFov - camera.fov) * (1 - Math.pow(0.006, dt));
  camera.updateProjectionMatrix();
}

function updateHUD() {
  const racers = [player, ...rivals].slice().sort((a, b) => b.total - a.total);
  const place = racers.indexOf(player) + 1;
  ui.position.innerHTML = `${place}<small>${ordinal(place)}</small>`;
  const currentLap = Math.min(TOTAL_LAPS, Math.max(1, Math.floor(player.total) + 1));
  ui.lap.textContent = `${currentLap} / ${TOTAL_LAPS}`;
  ui.progress.style.width = `${THREE.MathUtils.clamp((player.total / TOTAL_LAPS) * 100, 0, 100)}%`;
  ui.speed.firstChild.nodeValue = String(Math.round(player.speed * 4.1));
  ui.boostBar.style.width = `${player.boost}%`;
  ui.boostText.textContent = `${Math.round(player.boost)}%`;
  ui.turbo.classList.toggle('ready', player.boost >= 25 && raceState === 'racing');
  const t = wrap01(player.total);
  ui.zone.textContent = t < 0.25 ? 'SUNRISE COAST' : t < 0.5 ? 'TURBO FOREST' : t < 0.75 ? 'NEON CITY' : 'CRYSTAL SKYWAY';
  ui.speedFlash.style.opacity = String(player.turboTime > 0 ? 0.72 : Math.max(0, (player.speed - 35) / 20));
  if (audio?.context && audio.engine) {
    audio.engine.frequency.setTargetAtTime(55 + player.speed * 3.5, audio.context.currentTime, 0.045);
    audio.filter.frequency.setTargetAtTime(230 + player.speed * 9, audio.context.currentTime, 0.08);
  }
}

function ordinal(place) {
  if (place === 1) return 'st';
  if (place === 2) return 'nd';
  if (place === 3) return 'rd';
  return 'th';
}

function finishRace() {
  resetSteering();
  player.finished = true;
  raceState = 'finished';
  player.speed = Math.min(player.speed, 31);
  const racers = [player, ...rivals].slice().sort((a, b) => b.total - a.total);
  const place = racers.indexOf(player) + 1;
  ui.resultPlace.innerHTML = `${place}<small>${ordinal(place)}</small>`;
  ui.resultTitle.innerHTML = place === 1 ? 'VICTORY!<span>グランプリ 優勝！</span>' : place <= 3 ? 'GREAT RACE!<span>表彰台に入りました！</span>' : 'NICE RUN!<span>スカイアイランドGP 完走</span>';
  const minutes = Math.floor(raceTime / 60);
  const seconds = Math.floor(raceTime % 60);
  const milliseconds = Math.floor((raceTime % 1) * 1000);
  ui.resultTime.textContent = `TIME ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  setTimeout(() => ui.result.classList.add('show'), 850);
  playTone(place === 1 ? 660 : 520, 0.55, 'square', 0.07, place === 1 ? 1320 : 880);
}

function updateAmbient(dt, elapsed) {
  if (ocean) {
    ocean.material.color.setHSL(0.54 + Math.sin(elapsed * 0.2) * 0.006, 0.7, 0.43);
    ocean.rotation.z += dt * 0.003;
  }
  if (sunGlow) sunGlow.material.opacity = 0.82 + Math.sin(elapsed * 1.2) * 0.05;
  for (const balloon of balloons) balloon.position.y += Math.sin(elapsed * 0.42 + balloon.userData.phase) * dt * 0.045;
}

function animate() {
  const dt = Math.min(0.04, clock.getDelta());
  const elapsed = clock.elapsedTime;
  if (raceState === 'countdown') {
    updateCountdown(dt);
  } else if (raceState === 'racing') {
    raceTime += dt;
    collisionCooldown = Math.max(0, collisionCooldown - dt);
    updatePlayer(dt);
    updateRivals(dt);
  } else if (raceState === 'finished') {
    player.speed += (18 - player.speed) * (1 - Math.pow(0.03, dt));
    player.total += (player.speed / trackLength) * dt;
    updateRivals(dt);
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) ui.message.classList.remove('show');
  }
  updateRaceTransforms(dt);
  updateParticles(dt);
  updateCamera(dt);
  updateAmbient(dt, elapsed);
  updateHUD();
  renderer.render(scene, camera);
}

function onResize() {
  resetSteering();
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, /iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.35 : 1.6));
}

window.addEventListener('error', (event) => {
  if (String(event.message).includes('THREE') || String(event.message).includes('module')) ui.error.style.display = 'grid';
});

boot();
