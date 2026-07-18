import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const ui = {
  scene: document.querySelector('#scene'),
  startOverlay: document.querySelector('#startOverlay'),
  startButton: document.querySelector('#startButton'),
  endOverlay: document.querySelector('#endOverlay'),
  restartButton: document.querySelector('#restartButton'),
  hud: document.querySelector('#hud'),
  location: document.querySelector('#location'),
  speedReadout: document.querySelector('#speedReadout'),
  progressFill: document.querySelector('#progressFill'),
  soundButton: document.querySelector('#soundButton'),
  speedButton: document.querySelector('#speedButton'),
  pauseButton: document.querySelector('#pauseButton'),
  pauseCurtain: document.querySelector('#pauseCurtain'),
  moment: document.querySelector('#moment'),
  momentName: document.querySelector('#moment strong'),
  error: document.querySelector('#error')
};

const ROUTE = [
  { at: 0.00, name: 'SUNSET STATION', title: 'サンセット・ステーション' },
  { at: 0.07, name: 'SKY LIFT', title: '天空へつづくリフト' },
  { at: 0.19, name: 'SUMMIT LAUNCH', title: '山頂のビッグドロップ' },
  { at: 0.29, name: 'CRYSTAL LAKE', title: '湖すれすれの水晶峡谷' },
  { at: 0.41, name: 'EAGLE RIDGE', title: '雲を渡るイーグルリッジ' },
  { at: 0.53, name: 'NEON LOOP', title: '七色にきらめくネオンループ' },
  { at: 0.68, name: 'SKYLINE RUSH', title: '光の街・スカイラインラッシュ' },
  { at: 0.82, name: 'CLOUD BRIDGE', title: '夕雲のフローティングブリッジ' },
  { at: 0.94, name: 'STARLIGHT RETURN', title: '星明かりのホームストレッチ' }
];

const CONTROL_POINTS = [
  [0, 12, 86], [34, 14, 82], [66, 24, 64], [90, 52, 30],
  [96, 88, -6], [80, 119, -38], [52, 132, -57], [16, 118, -68],
  [-19, 53, -72], [-45, 8, -57], [-68, 14, -30], [-83, 42, 2],
  [-74, 71, 38], [-47, 86, 61], [-18, 64, 48], [3, 31, 22],
  [25, 14, 3], [48, 17, -7], [61, 43, -12], [56, 69, -14],
  [38, 80, -14], [23, 61, -9], [27, 34, -3], [46, 19, 4],
  [68, 15, 25], [85, 24, 51], [73, 51, 79], [43, 58, 99],
  [9, 39, 105], [-24, 20, 98], [-35, 13, 89]
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

let renderer;
let scene;
let camera;
let trackCurve;
let frames;
let fireworks;
let water;
let stars;
let rideState = 'loading';
let rideProgress = 0.002;
let speedIndex = 1;
let currentZone = -1;
let toastTimer = 0;
let audio = null;
let muted = false;
let simulatedSpeed = 0;

const SPEEDS = [0.72, 1, 1.38];
const SPEED_LABELS = ['×0.7', '×1.0', '×1.4'];
const FRAME_COUNT = 1200;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const clock = new THREE.Clock();
const tmpPoint = new THREE.Vector3();
const tmpTangent = new THREE.Vector3();
const tmpNormal = new THREE.Vector3();
const tmpBinormal = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const tmpMatrix = new THREE.Matrix4();
const tmpObject = new THREE.Object3D();

function seededRandom(seed = 1234567) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const random = seededRandom(7619);
const rand = (min, max) => min + (max - min) * random();

function boot() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable');

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6f7199, 0.00225);

    camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.08, 900);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, /iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.4 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    ui.scene.appendChild(renderer.domElement);

    trackCurve = new THREE.CatmullRomCurve3(CONTROL_POINTS, true, 'centripetal', 0.5);
    trackCurve.arcLengthDivisions = 2400;
    trackCurve.updateArcLengths();
    frames = trackCurve.computeFrenetFrames(FRAME_COUNT, true);
    // Three.js may choose the first rail normal toward the underside of the
    // track. Orient the entire frame set so the station starts on the upper
    // face; the frame then follows loops and banking continuously.
    if (frames.normals[0].dot(WORLD_UP) < 0) {
      frames.normals.forEach((normal) => normal.negate());
      frames.binormals.forEach((binormal) => binormal.negate());
    }

    createSky();
    createLights();
    createLandscape();
    createCity();
    createTrack();
    createClouds();
    createAtmosphere();
    createCoasterNose();

    updateRideCamera(rideProgress, 0);
    renderer.setAnimationLoop(animate);
    rideState = 'ready';
    ui.startButton.disabled = false;
    ui.startButton.textContent = 'ライドに乗る  ▶';
  } catch (error) {
    console.error(error);
    ui.startButton.textContent = '3D表示を開始できませんでした';
    ui.error.style.display = 'block';
  }
}

function createSky() {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x152251) },
      midColor: { value: new THREE.Color(0x866fa6) },
      lowColor: { value: new THREE.Color(0xffb17f) }
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 topColor; uniform vec3 midColor; uniform vec3 lowColor; varying vec3 vPos; void main(){ float h=normalize(vPos).y; vec3 c=mix(lowColor,midColor,smoothstep(-.18,.2,h)); c=mix(c,topColor,smoothstep(.18,.82,h)); gl_FragColor=vec4(c,1.0); }'
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(560, 32, 18), skyMaterial));

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#fff7c0', '#ffb34d'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sun.position.set(-175, 78, -330);
  sun.scale.set(54, 54, 1);
  scene.add(sun);

  const starPositions = [];
  for (let i = 0; i < 620; i++) {
    const theta = rand(0, Math.PI * 2);
    const phi = rand(0.12, 1.22);
    const radius = rand(410, 500);
    starPositions.push(
      Math.cos(theta) * Math.sin(phi) * radius,
      Math.cos(phi) * radius + 50,
      Math.sin(theta) * Math.sin(phi) * radius
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xe8f5ff,
    size: 1.15,
    transparent: true,
    opacity: 0.72,
    sizeAttenuation: true,
    depthWrite: false
  }));
  scene.add(stars);
}

function makeGlowTexture(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.16, inner);
  gradient.addColorStop(0.42, outer);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0x9fd9ff, 0x5b315e, 2.25));
  const sunLight = new THREE.DirectionalLight(0xffd4aa, 3.6);
  sunLight.position.set(-130, 190, -160);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0x829cff, 1.1);
  fill.position.set(100, 70, 120);
  scene.add(fill);
}

function createLandscape() {
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x246fa7,
    roughness: 0.2,
    metalness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    transparent: true,
    opacity: 0.9
  });
  water = new THREE.Mesh(new THREE.CircleGeometry(285, 72), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -4;
  scene.add(water);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(340, 64),
    new THREE.MeshStandardMaterial({ color: 0x244835, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.2;
  scene.add(floor);

  const mountains = [
    [50, -60, 76, 112, 0x465b68], [-88, 0, 64, 82, 0x4d6471],
    [-122, -92, 78, 94, 0x415766], [130, -85, 85, 108, 0x52646f],
    [-145, 72, 61, 69, 0x536b69], [142, 105, 68, 77, 0x495e68],
    [-12, -145, 88, 116, 0x3e5265], [196, 5, 74, 91, 0x4e5c6b]
  ];

  mountains.forEach(([x, z, radius, height, color], index) => {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 8 + (index % 3), 3),
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
    );
    mountain.position.set(x, height / 2 - 5, z);
    mountain.rotation.y = rand(0, Math.PI);
    scene.add(mountain);

    if (height > 88) {
      const capHeight = height * 0.25;
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.27, capHeight, 8 + (index % 3), 1),
        new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 1, flatShading: true })
      );
      cap.position.set(x, height - capHeight / 2 - 5, z);
      cap.rotation.y = mountain.rotation.y;
      scene.add(cap);
    }
  });

  const treeCount = 260;
  const trees = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 3.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x183f39, roughness: 1, flatShading: true }),
    treeCount
  );
  for (let i = 0; i < treeCount; i++) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(78, 255);
    const scale = rand(1.5, 4.2);
    tmpObject.position.set(Math.cos(angle) * radius, -3.2 + scale * 1.7, Math.sin(angle) * radius);
    tmpObject.rotation.set(0, rand(0, Math.PI), 0);
    tmpObject.scale.set(scale, scale, scale);
    tmpObject.updateMatrix();
    trees.setMatrixAt(i, tmpObject.matrix);
  }
  scene.add(trees);
}

function createCity() {
  const pathSamples = [];
  for (let i = 0; i <= 320; i++) {
    const point = trackCurve.getPointAt(i / 320);
    if (point.y < 62) pathSamples.push(point);
  }
  const nearTrack = (x, z) => pathSamples.some((point) => {
    const dx = point.x - x;
    const dz = point.z - z;
    return dx * dx + dz * dz < 145;
  });

  const lots = [];
  for (let x = -34; x <= 122; x += 12) {
    for (let z = 28; z <= 132; z += 12) {
      const px = x + rand(-2.5, 2.5);
      const pz = z + rand(-2.5, 2.5);
      if (!nearTrack(px, pz) && random() > 0.14) {
        lots.push({
          x: px, z: pz,
          width: rand(5.5, 9.5),
          depth: rand(5.5, 9.5),
          height: rand(12, 55) * (random() > 0.8 ? 1.4 : 1)
        });
      }
    }
  }

  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0.35, vertexColors: true }),
    lots.length
  );
  const cityColors = [0x213557, 0x273b62, 0x34456c, 0x473a64, 0x23475c];
  lots.forEach((lot, index) => {
    tmpObject.position.set(lot.x, lot.height / 2 - 4.6, lot.z);
    tmpObject.rotation.set(0, 0, 0);
    tmpObject.scale.set(lot.width, lot.height, lot.depth);
    tmpObject.updateMatrix();
    buildings.setMatrixAt(index, tmpObject.matrix);
    buildings.setColorAt(index, new THREE.Color(cityColors[Math.floor(random() * cityColors.length)]));
  });
  scene.add(buildings);

  const maxWindows = lots.length * 30;
  const windows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.7, 0.28),
    new THREE.MeshBasicMaterial({ color: 0xffd878, transparent: true, opacity: 0.88, side: THREE.DoubleSide }),
    maxWindows
  );
  let windowIndex = 0;
  lots.forEach((lot) => {
    const rows = Math.min(9, Math.floor(lot.height / 4.8));
    const columns = Math.min(5, Math.max(2, Math.floor(lot.width / 2)));
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        if (random() < 0.32 || windowIndex >= maxWindows) continue;
        const wx = lot.x + ((column + 1) / (columns + 1) - 0.5) * lot.width;
        const wy = -2 + (row + 1) * (lot.height - 2) / (rows + 1);
        tmpObject.position.set(wx, wy, lot.z + lot.depth / 2 + 0.012);
        tmpObject.rotation.set(0, 0, 0);
        tmpObject.scale.set(1, 1, 1);
        tmpObject.updateMatrix();
        windows.setMatrixAt(windowIndex++, tmpObject.matrix);
      }
    }
  });
  windows.count = windowIndex;
  scene.add(windows);

  const tower = new THREE.Group();
  const towerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 12, 86, 8),
    new THREE.MeshStandardMaterial({ color: 0x263759, roughness: 0.45, metalness: 0.55 })
  );
  towerBody.position.y = 38;
  tower.add(towerBody);
  const towerRingMaterial = new THREE.MeshBasicMaterial({ color: 0x65f4ff, toneMapped: false });
  for (let y = 6; y < 82; y += 7) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.7 - y * 0.018, 0.09, 4, 20), towerRingMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y - 5;
    tower.add(ring);
  }
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.1, 28, 8), towerRingMaterial);
  needle.position.y = 94;
  tower.add(needle);
  tower.position.set(118, 0, 114);
  scene.add(tower);

  scene.add(makeBillboard('SKYLINE', new THREE.Vector3(96, 31, 73), 26, 7, 0xff6bd7));
}

function makeBillboard(text, position, width, height, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '900 italic 136px -apple-system, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowBlur = 35;
  context.shadowColor = '#66f8ff';
  context.fillStyle = '#fff';
  context.fillText(text, 512, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, color, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(width, height, 1);
  return sprite;
}

class OffsetTrackCurve extends THREE.Curve {
  constructor(offset) {
    super();
    this.offset = offset;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const point = trackCurve.getPointAt(THREE.MathUtils.euclideanModulo(t, 1));
    const index = Math.min(FRAME_COUNT, Math.round(t * FRAME_COUNT));
    return target.copy(point).addScaledVector(frames.binormals[index], this.offset);
  }
}

function sampleFrame(t, point = tmpPoint, tangent = tmpTangent, normal = tmpNormal, binormal = tmpBinormal) {
  const wrapped = THREE.MathUtils.euclideanModulo(t, 1);
  trackCurve.getPointAt(wrapped, point);
  trackCurve.getTangentAt(wrapped, tangent).normalize();
  const scaled = wrapped * FRAME_COUNT;
  const index = Math.floor(scaled);
  const next = Math.min(FRAME_COUNT, index + 1);
  const mix = scaled - index;
  normal.copy(frames.normals[index]).lerp(frames.normals[next], mix).normalize();
  binormal.copy(frames.binormals[index]).lerp(frames.binormals[next], mix).normalize();
  return { point, tangent, normal, binormal };
}

function createTrack() {
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0xbefcff,
    emissive: 0x21bccc,
    emissiveIntensity: 1.65,
    roughness: 0.28,
    metalness: 0.72
  });
  [-0.72, 0.72].forEach((offset) => {
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new OffsetTrackCurve(offset), 1100, 0.105, 5, true), railMaterial));
  });

  const sleeperCount = 310;
  const sleepers = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.85, 0.09, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x30355c, emissive: 0x5d2c7d, emissiveIntensity: 0.62, roughness: 0.55, metalness: 0.6 }),
    sleeperCount
  );
  for (let i = 0; i < sleeperCount; i++) {
    const t = i / sleeperCount;
    const { point, tangent, normal, binormal } = sampleFrame(t);
    tmpMatrix.makeBasis(binormal, normal, tangent);
    tmpMatrix.setPosition(point);
    sleepers.setMatrixAt(i, tmpMatrix);
  }
  scene.add(sleepers);

  const supportMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x512e69, emissive: 0x351447, emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.48 }),
    90
  );
  let supportIndex = 0;
  for (let i = 0; i < 90; i++) {
    const t = i / 90;
    const point = trackCurve.getPointAt(t);
    if (point.y > 70 || point.y < 1 || supportIndex >= 90) continue;
    const height = point.y + 4;
    tmpObject.position.set(point.x, point.y - height / 2, point.z);
    tmpObject.rotation.set(0, 0, 0);
    tmpObject.scale.set(0.22, height, 0.22);
    tmpObject.updateMatrix();
    supportMesh.setMatrixAt(supportIndex++, tmpObject.matrix);
  }
  supportMesh.count = supportIndex;
  scene.add(supportMesh);

  const gateColors = [0x5df6ff, 0xff64ce, 0xffd563];
  const gateTimes = [0.115, 0.205, 0.315, 0.435, 0.545, 0.585, 0.625, 0.705, 0.785, 0.88];
  gateTimes.forEach((t, index) => {
    const { point, tangent, normal } = sampleFrame(t);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(index > 3 && index < 7 ? 4.5 : 5.3, 0.17, 6, 36),
      new THREE.MeshBasicMaterial({ color: gateColors[index % gateColors.length], toneMapped: false })
    );
    ring.position.copy(point).addScaledVector(normal, 1.1);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    scene.add(ring);

    if (index % 3 === 0) {
      const glow = new THREE.PointLight(gateColors[index % gateColors.length], 2.2, 17, 2);
      glow.position.copy(ring.position);
      scene.add(glow);
    }
  });

  createStation();
}

function createStation() {
  const point = trackCurve.getPointAt(0);
  const tangent = trackCurve.getTangentAt(0);
  const yaw = Math.atan2(tangent.x, tangent.z);
  const station = new THREE.Group();
  station.position.copy(point).add(new THREE.Vector3(0, -2.2, 0));
  station.rotation.y = yaw;

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x28345f, roughness: 0.45, metalness: 0.45 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(15, 0.7, 28), platformMaterial);
  station.add(platform);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.45, 22), new THREE.MeshStandardMaterial({ color: 0xb95098, roughness: 0.38, metalness: 0.42 }));
  roof.position.y = 8;
  station.add(roof);
  const postGeometry = new THREE.BoxGeometry(0.35, 8, 0.35);
  const postMaterial = new THREE.MeshBasicMaterial({ color: 0x5ef4ff, toneMapped: false });
  [[-7, -9], [7, -9], [-7, 9], [7, 9]].forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 4, z);
    station.add(post);
  });
  scene.add(station);
}

function createClouds() {
  const puffCount = 116;
  const clouds = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffdbe6, transparent: true, opacity: 0.36, depthWrite: false }),
    puffCount
  );
  for (let i = 0; i < puffCount; i++) {
    const cluster = Math.floor(i / 4);
    const baseAngle = cluster * 2.399;
    const baseRadius = 75 + (cluster % 8) * 20;
    const baseX = Math.cos(baseAngle) * baseRadius;
    const baseZ = Math.sin(baseAngle) * baseRadius;
    const scale = rand(4.5, 10);
    tmpObject.position.set(baseX + rand(-8, 8), rand(55, 104) + rand(-2, 2), baseZ + rand(-7, 7));
    tmpObject.rotation.set(0, rand(0, Math.PI), 0);
    tmpObject.scale.set(scale * rand(1, 1.8), scale * rand(0.5, 0.9), scale);
    tmpObject.updateMatrix();
    clouds.setMatrixAt(i, tmpObject.matrix);
  }
  scene.add(clouds);
}

function createAtmosphere() {
  const sparklePositions = [];
  const sparkleColors = [];
  const palette = [new THREE.Color(0x64f6ff), new THREE.Color(0xff70d7), new THREE.Color(0xffdf78)];
  for (let i = 0; i < 470; i++) {
    const t = random();
    const point = trackCurve.getPointAt(t);
    sparklePositions.push(point.x + rand(-16, 16), point.y + rand(-9, 15), point.z + rand(-16, 16));
    const color = palette[Math.floor(random() * palette.length)];
    sparkleColors.push(color.r, color.g, color.b);
  }
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparklePositions, 3));
  sparkleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(sparkleColors, 3));
  const sparkles = new THREE.Points(sparkleGeometry, new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  sparkles.userData.float = true;
  scene.add(sparkles);

  const count = 240;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const origins = [];
  const directions = [];
  const delays = [];
  const fireworkPalette = [new THREE.Color(0x6ff8ff), new THREE.Color(0xff69d4), new THREE.Color(0xffdf72), new THREE.Color(0xa985ff)];
  for (let i = 0; i < count; i++) {
    const burst = i % 4;
    origins.push(new THREE.Vector3(45 + burst * 24, 72 + (burst % 2) * 23, 66 + (burst % 3) * 18));
    const direction = new THREE.Vector3(rand(-1, 1), rand(-0.25, 1), rand(-1, 1)).normalize();
    directions.push(direction);
    delays.push((burst * 0.22 + Math.floor(i / 60) * 0.07) % 1);
    const color = fireworkPalette[burst];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 1.15,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  fireworks = new THREE.Points(geometry, material);
  fireworks.userData = { origins, directions, delays };
  scene.add(fireworks);
}

function createCoasterNose() {
  const nose = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    new THREE.MeshPhysicalMaterial({ color: 0xe93d9f, roughness: 0.25, metalness: 0.48, clearcoat: 1, clearcoatRoughness: 0.15 })
  );
  shell.scale.set(1.22, 0.28, 1.85);
  shell.rotation.x = -0.2;
  shell.position.set(0, -1.42, -3.05);
  nose.add(shell);

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 2.35, 10),
    new THREE.MeshStandardMaterial({ color: 0xbefbff, emissive: 0x1e9ca6, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 })
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -1.03, -1.72);
  nose.add(bar);

  [-0.82, 0.82].forEach((x) => {
    const light = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('#ffffff', '#63f6ff'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    light.position.set(x * 0.82, -1.25, -2.72);
    light.scale.set(0.42, 0.42, 1);
    nose.add(light);
  });
  camera.add(nose);
}

function updateRideCamera(progress, elapsed) {
  const { point, tangent, normal, binormal } = sampleFrame(progress);
  const speedSway = rideState === 'riding' ? Math.min(1, simulatedSpeed / 120) : 0;
  camera.position.copy(point)
    .addScaledVector(normal, 1.22 + Math.sin(elapsed * 10.5) * 0.025 * speedSway)
    .addScaledVector(binormal, Math.sin(elapsed * 7.3) * 0.018 * speedSway);
  camera.up.copy(normal);
  tmpLook.copy(point)
    .addScaledVector(tangent, 12)
    .addScaledVector(normal, 0.62)
    .addScaledVector(binormal, Math.sin(elapsed * 1.1) * 0.04);
  camera.lookAt(tmpLook);
  camera.fov = THREE.MathUtils.lerp(camera.fov, 77 + Math.min(7, simulatedSpeed * 0.035), 0.06);
  camera.updateProjectionMatrix();
}

function updateFireworks(elapsed) {
  if (!fireworks) return;
  const cityVisibility = rideState === 'ready' ? 0.4 : THREE.MathUtils.smoothstep(rideProgress, 0.58, 0.7) * (1 - THREE.MathUtils.smoothstep(rideProgress, 0.86, 0.95));
  fireworks.material.opacity = cityVisibility * 0.95;
  const positions = fireworks.geometry.attributes.position.array;
  const { origins, directions, delays } = fireworks.userData;
  for (let i = 0; i < origins.length; i++) {
    const phase = (elapsed * 0.17 + delays[i]) % 1;
    const distance = Math.sin(Math.min(1, phase * 1.28) * Math.PI * 0.5) * 27;
    positions[i * 3] = origins[i].x + directions[i].x * distance;
    positions[i * 3 + 1] = origins[i].y + directions[i].y * distance - phase * phase * 10;
    positions[i * 3 + 2] = origins[i].z + directions[i].z * distance;
  }
  fireworks.geometry.attributes.position.needsUpdate = true;
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  if (rideState === 'riding') {
    trackCurve.getTangentAt(rideProgress, tmpTangent);
    const slopeSpeed = THREE.MathUtils.clamp(1 - tmpTangent.y * 1.28, 0.58, 1.66);
    rideProgress += delta / 91 * SPEEDS[speedIndex] * slopeSpeed;
    simulatedSpeed = THREE.MathUtils.lerp(simulatedSpeed, 72 + slopeSpeed * 55 * SPEEDS[speedIndex], 0.035);
    if (rideProgress >= 1) finishRide();
    updateZone();
  } else if (rideState === 'ready') {
    simulatedSpeed = 0;
  } else {
    simulatedSpeed = THREE.MathUtils.lerp(simulatedSpeed, 0, 0.08);
  }

  updateRideCamera(Math.min(rideProgress, 0.99999), elapsed);
  updateFireworks(elapsed);
  stars.rotation.y = elapsed * 0.0015;
  water.material.color.offsetHSL(0.00002 * Math.sin(elapsed), 0, 0);

  ui.progressFill.style.width = `${Math.min(100, rideProgress * 100).toFixed(2)}%`;
  ui.speedReadout.textContent = `${Math.round(simulatedSpeed)} km/h`;
  if (toastTimer > 0) {
    toastTimer -= delta;
    if (toastTimer <= 0) ui.moment.classList.remove('show');
  }
  updateAudio(simulatedSpeed);
  renderer.render(scene, camera);
}

function updateZone() {
  let index = 0;
  for (let i = 0; i < ROUTE.length; i++) {
    if (rideProgress >= ROUTE[i].at) index = i;
  }
  if (index === currentZone) return;
  currentZone = index;
  ui.location.textContent = ROUTE[index].name;
  if (index > 0) {
    ui.momentName.textContent = ROUTE[index].title;
    ui.moment.classList.remove('show');
    requestAnimationFrame(() => ui.moment.classList.add('show'));
    toastTimer = 2.6;
    playChime(index);
  }
}

function startRide() {
  if (rideState !== 'ready' && rideState !== 'ended') return;
  rideProgress = 0.002;
  currentZone = -1;
  simulatedSpeed = 0;
  rideState = 'riding';
  ui.startOverlay.classList.add('hidden');
  ui.endOverlay.classList.add('hidden');
  ui.hud.classList.add('visible');
  ui.pauseCurtain.classList.remove('show');
  ui.pauseButton.textContent = 'Ⅱ';
  initAudio();
  updateZone();
  window.scrollTo(0, 1);
  const root = document.documentElement;
  if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
}

function finishRide() {
  rideProgress = 0.99999;
  rideState = 'ended';
  simulatedSpeed = 0;
  ui.hud.classList.remove('visible');
  ui.endOverlay.classList.remove('hidden');
  if (audio) audio.master.gain.setTargetAtTime(0.04, audio.context.currentTime, 0.5);
  playChime(10);
}

function togglePause() {
  if (rideState === 'riding') {
    rideState = 'paused';
    ui.pauseButton.textContent = '▶';
    ui.pauseCurtain.classList.add('show');
  } else if (rideState === 'paused') {
    rideState = 'riding';
    ui.pauseButton.textContent = 'Ⅱ';
    ui.pauseCurtain.classList.remove('show');
    if (audio?.context.state === 'suspended') audio.context.resume();
  }
}

function initAudio() {
  if (audio) {
    audio.context.resume();
    audio.master.gain.setTargetAtTime(muted ? 0 : 0.2, audio.context.currentTime, 0.25);
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    muted = true;
    ui.soundButton.textContent = '♪ OFF';
    return;
  }
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = muted ? 0 : 0.2;
  master.connect(context.destination);

  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;

  const wind = context.createBufferSource();
  wind.buffer = buffer;
  wind.loop = true;
  const windFilter = context.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.value = 780;
  windFilter.Q.value = 0.45;
  const windGain = context.createGain();
  windGain.gain.value = 0;
  wind.connect(windFilter).connect(windGain).connect(master);
  wind.start();

  const rumble = context.createOscillator();
  rumble.type = 'sawtooth';
  rumble.frequency.value = 39;
  const rumbleFilter = context.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 95;
  const rumbleGain = context.createGain();
  rumbleGain.gain.value = 0;
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(master);
  rumble.start();

  audio = { context, master, windGain, windFilter, rumble, rumbleGain };
}

function updateAudio(speed) {
  if (!audio) return;
  const now = audio.context.currentTime;
  const moving = rideState === 'riding' ? 1 : 0;
  audio.windGain.gain.setTargetAtTime(moving * THREE.MathUtils.clamp((speed - 35) / 210, 0.02, 0.38), now, 0.08);
  audio.windFilter.frequency.setTargetAtTime(520 + speed * 5.2, now, 0.12);
  audio.rumbleGain.gain.setTargetAtTime(moving * THREE.MathUtils.clamp(speed / 1300, 0, 0.11), now, 0.08);
  audio.rumble.frequency.setTargetAtTime(31 + speed * 0.12, now, 0.08);
}

function playChime(step) {
  if (!audio || muted) return;
  const now = audio.context.currentTime;
  const base = 392 * Math.pow(2, (step % 5) / 12);
  [0, 0.12, 0.25].forEach((delay, index) => {
    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = base * [1, 1.25, 1.5][index];
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.5);
    oscillator.connect(gain).connect(audio.master);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + 0.55);
  });
}

function toggleSound() {
  muted = !muted;
  ui.soundButton.textContent = muted ? '♪ OFF' : '♪ ON';
  if (!audio) {
    if (!muted) initAudio();
    return;
  }
  audio.master.gain.setTargetAtTime(muted ? 0 : 0.2, audio.context.currentTime, 0.08);
}

function cycleSpeed() {
  speedIndex = (speedIndex + 1) % SPEEDS.length;
  ui.speedButton.textContent = SPEED_LABELS[speedIndex];
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, /iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.4 : 1.7));
}

ui.startButton.addEventListener('click', startRide);
ui.restartButton.addEventListener('click', startRide);
ui.pauseButton.addEventListener('click', togglePause);
ui.soundButton.addEventListener('click', toggleSound);
ui.speedButton.addEventListener('click', cycleSpeed);
window.addEventListener('resize', onResize, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && rideState === 'riding') togglePause();
});
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });

boot();
