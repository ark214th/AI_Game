// Three.js で せかい・お客さん・エフェクトを かく。
import * as T from './vendor/three.module.min.js';
import {BLOCKS, B} from './blocks.mjs';
import {buildChunk, CHUNK} from './mesher.mjs';
import {makeAtlas, itemCanvas, faceCanvas} from './textures.mjs';
import {World, GROUND} from './world.mjs';

const SKY = 0x9fd4ff;
const lin = v => Math.pow(v, 2.2);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new T.WebGLRenderer({canvas, antialias: false, powerPreference: 'high-performance'});
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new T.Scene();
    this.scene.background = new T.Color(SKY);
    this.scene.fog = new T.Fog(SKY, 48, 120);
    this.camera = new T.PerspectiveCamera(72, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.swingT = 1;
    this.scene.add(new T.AmbientLight(0xffffff, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.8);
    sun.position.set(0.4, 1, 0.6);
    this.scene.add(sun);

    this.atlasCanvas = makeAtlas();
    this.atlas = new T.CanvasTexture(this.atlasCanvas);
    pixelTex(this.atlas);
    this.chunkMat = new T.MeshBasicMaterial({map: this.atlas, vertexColors: true, alphaTest: 0.5});
    this.chunks = new Map();
    this.dirty = new Set();
    this.texCache = new Map();
    this.shelfObjs = new Map();
    this.signObjs = new Map();
    this.doorObjs = new Map();
    this.npcs = new Map();
    this.particles = [];
    this.time = 0;
    this.buildSurroundings();
    // ねらっている ブロックの わく
    const eg = new T.EdgesGeometry(new T.BoxGeometry(1.004, 1.004, 1.004));
    this.outline = new T.LineSegments(eg, new T.LineBasicMaterial({color: 0x111111, transparent: true, opacity: 0.6}));
    this.outline.visible = false;
    this.scene.add(this.outline);
    this.crack = new T.Mesh(new T.BoxGeometry(1.01, 1.01, 1.01), new T.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0, depthWrite: false}));
    this.outline.add(this.crack);
    this.partGeo = new T.BoxGeometry(0.12, 0.12, 0.12);
  }

  resize(w, h) {
    this.gl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildSurroundings() {
    // せかいの 外の 草原（遠くまで）
    const ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshBasicMaterial({color: 0x5f9a38}));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(48, GROUND - 0.02, 48);
    this.scene.add(ground);
    // 遠くの 山
    const hillMat = new T.MeshBasicMaterial({color: 0x6f9fb8});
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, r = 150 + (i % 3) * 18;
      const h = 18 + ((i * 37) % 23);
      const m = new T.Mesh(new T.BoxGeometry(40, h, 40), hillMat);
      m.position.set(48 + Math.cos(a) * r, GROUND + h / 2 - 2, 48 + Math.sin(a) * r);
      m.rotation.y = a;
      this.scene.add(m);
    }
    this.scene.fog.far = 220;
    // 雲
    const cloudMat = new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.88, fog: false});
    this.clouds = new T.Group();
    for (let i = 0; i < 18; i++) {
      const c = new T.Mesh(new T.BoxGeometry(8 + (i * 7) % 14, 1.5, 6 + (i * 5) % 10), cloudMat);
      c.position.set(((i * 53) % 260) - 80, 46 + (i % 3) * 2, ((i * 97) % 260) - 80);
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);
  }

  setWorld(world) {
    this.world = world;
    for (const m of this.chunks.values()) { this.scene.remove(m); m.geometry.dispose(); }
    this.chunks.clear();
    for (const map of [this.shelfObjs, this.signObjs, this.doorObjs]) { for (const o of map.values()) this.scene.remove(o.obj); map.clear(); }
    for (let cz = 0; cz < Math.ceil(world.d / CHUNK); cz++) for (let cx = 0; cx < Math.ceil(world.w / CHUNK); cx++) this.dirty.add(cx + ',' + cz);
    world.changes.length = 0;
    this.rebuildChunks(Infinity);
    this.syncSpecials(true);
    this.syncDoors(null);
  }

  rebuildChunks(limit = 3) {
    let n = 0;
    for (const key of this.dirty) {
      if (n++ >= limit) break;
      this.dirty.delete(key);
      const [cx, cz] = key.split(',').map(Number);
      const data = buildChunk(this.world, cx, cz);
      const old = this.chunks.get(key);
      if (old) { this.scene.remove(old); old.geometry.dispose(); }
      if (!data.indices.length) { this.chunks.delete(key); continue; }
      const g = new T.BufferGeometry();
      const cols = data.colors;
      for (let i = 0; i < cols.length; i++) cols[i] = lin(cols[i]);
      g.setAttribute('position', new T.BufferAttribute(data.positions, 3));
      g.setAttribute('uv', new T.BufferAttribute(data.uvs, 2));
      g.setAttribute('color', new T.BufferAttribute(cols, 3));
      g.setIndex(new T.BufferAttribute(data.indices, 1));
      g.computeBoundingSphere();
      const m = new T.Mesh(g, this.chunkMat);
      this.scene.add(m);
      this.chunks.set(key, m);
    }
  }

  // 変わった ブロックを しらべる
  consumeChanges() {
    const w = this.world;
    if (!w.changes.length) return null;
    const cells = w.changes.slice();
    for (const i of w.changes) {
      const {x, y, z} = w.pos(i);
      const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
        if ((dx === -1 && lx > 0) || (dx === 1 && lx < CHUNK - 1) || (dz === -1 && lz > 0) || (dz === 1 && lz < CHUNK - 1)) continue;
        const k = (cx + dx) + ',' + (cz + dz);
        if (cx + dx >= 0 && cz + dz >= 0 && (cx + dx) * CHUNK < w.w && (cz + dz) * CHUNK < w.d) this.dirty.add(k);
      }
    }
    w.changes.length = 0;
    return cells;
  }

  tex(key, make) {
    if (!this.texCache.has(key)) { const t = new T.CanvasTexture(make()); pixelTex(t); this.texCache.set(key, t); }
    return this.texCache.get(key);
  }
  itemTex(key) { return this.tex('item:' + key, () => itemCanvas(key)); }

  // たなの 品物・かんばんの 字・ドア
  syncSpecials(force = false) {
    const w = this.world;
    // たな
    for (const [i, s] of w.shelves) {
      const sig = (s.item || '') + ':' + Math.min(3, s.stock) + ':' + w.meta[i];
      const cur = this.shelfObjs.get(i);
      if (!force && cur && cur.sig === sig) continue;
      if (cur) { this.scene.remove(cur.obj); disposeTree(cur.obj, true); }
      const obj = new T.Group();
      const {x, y, z} = w.pos(i);
      obj.position.set(x + 0.5, y, z + 0.5);
      obj.rotation.y = w.meta[i] * Math.PI / 2;
      if (s.item) {
        const n = Math.min(3, s.stock);
        for (let k = 0; k < n; k++) {
          const sp = new T.Sprite(new T.SpriteMaterial({map: this.itemTex(s.item), alphaTest: 0.5}));
          sp.scale.set(0.42, 0.42, 0.42);
          sp.position.set((k - (n - 1) / 2) * 0.3, 10 / 16 + 0.22, 0.05 + (k % 2) * 0.06);
          obj.add(sp);
        }
        if (s.stock <= 0) {
          const sp = new T.Sprite(new T.SpriteMaterial({map: this.tex('empty', emptyCanvas), depthTest: false, transparent: true}));
          sp.scale.set(0.45, 0.45, 0.45);
          sp.position.set(0, 1.35, 0);
          sp.userData.bob = true;
          obj.add(sp);
          const ghost = new T.Sprite(new T.SpriteMaterial({map: this.itemTex(s.item), transparent: true, opacity: 0.35}));
          ghost.scale.set(0.42, 0.42, 0.42);
          ghost.position.set(0, 10 / 16 + 0.22, 0.05);
          obj.add(ghost);
        }
      }
      this.scene.add(obj);
      this.shelfObjs.set(i, {obj, sig});
    }
    for (const [i, o] of this.shelfObjs) if (!w.shelves.has(i)) { this.scene.remove(o.obj); disposeTree(o.obj, true); this.shelfObjs.delete(i); }
    // かんばん
    for (const [i, text] of w.signs) {
      const sig = text + ':' + w.meta[i];
      const cur = this.signObjs.get(i);
      if (!force && cur && cur.sig === sig) continue;
      if (cur) { this.scene.remove(cur.obj); cur.tex?.dispose(); }
      const obj = new T.Group();
      const {x, y, z} = w.pos(i);
      obj.position.set(x + 0.5, y + 11 / 16, z + 0.5);
      obj.rotation.y = w.meta[i] * Math.PI / 2;
      let tex = null;
      if (text) {
        tex = new T.CanvasTexture(signCanvas(text));
        tex.colorSpace = T.SRGBColorSpace;
        tex.anisotropy = 4;
        const mat = new T.MeshBasicMaterial({map: tex, transparent: true});
        const front = new T.Mesh(new T.PlaneGeometry(0.96, 0.6), mat);
        front.position.z = 1.5 / 16 + 0.004;
        const back = front.clone();
        back.rotation.y = Math.PI;
        back.position.z = -1.5 / 16 - 0.004;
        obj.add(front, back);
      }
      this.scene.add(obj);
      this.signObjs.set(i, {obj, sig, tex});
    }
    for (const [i, o] of this.signObjs) if (!w.signs.has(i)) { this.scene.remove(o.obj); o.tex?.dispose(); this.signObjs.delete(i); }
  }

  // ドア：変わった マスだけ しらべる（full のときは 全部）
  syncDoors(cells) {
    const w = this.world;
    const list = cells || w.blocks.keys();
    for (const i of list) {
      const o = this.doorObjs.get(i);
      const isDoor = w.blocks[i] === B.DOOR;
      if (o && (!isDoor || w.meta[i] !== o.meta)) { this.scene.remove(o.obj); disposeTree(o.obj, true); this.doorObjs.delete(i); }
      if (!isDoor || this.doorObjs.has(i)) continue;
      const {x, y, z} = w.pos(i);
      const obj = new T.Group();
      obj.position.set(x + 0.5, y, z + 0.5);
      obj.rotation.y = w.meta[i] * Math.PI / 2;
      const pivot = new T.Group();
      pivot.position.set(-0.45, 0, 0);
      const panel = new T.Mesh(new T.BoxGeometry(0.9, 2, 0.12), new T.MeshLambertMaterial({map: this.tex('door', doorCanvas)}));
      panel.position.set(0.45, 1, 0);
      pivot.add(panel);
      obj.add(pivot);
      this.scene.add(obj);
      this.doorObjs.set(i, {obj, pivot, meta: w.meta[i], angle: 0});
    }
  }

  // ---------- お客さん ----------
  syncCustomers(customers, dt) {
    const alive = new Set();
    for (const c of customers) {
      alive.add(c.id);
      let n = this.npcs.get(c.id);
      if (!n) { n = this.makeNpc(c); this.npcs.set(c.id, n); this.scene.add(n.root); }
      n.root.position.set(c.x, c.y, c.z);
      // 向きを なめらかに
      let dy = c.yaw - n.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.root.rotation.y += dy * Math.min(1, dt * 10);
      n.t += dt * (c.walking ? 9 : 2);
      const swing = c.walking ? Math.sin(n.t) * 0.7 : 0;
      n.legL.rotation.x = swing; n.legR.rotation.x = -swing;
      n.armL.rotation.x = -swing * 0.8; n.armR.rotation.x = swing * 0.8;
      if (c.state === 'browse') { n.head.rotation.x = 0.35; n.armR.rotation.x = -0.9; }
      else if (c.state === 'pay') { n.head.rotation.x = 0.1; n.armR.rotation.x = -1.2 + Math.sin(this.time * 8) * 0.15; }
      else n.head.rotation.x = 0;
      n.body.position.y = c.walking ? Math.abs(Math.sin(n.t)) * 0.04 : Math.sin(this.time * 2 + c.id) * 0.01;
      const s = n.scale * (c.state === 'poof' ? c.fade : Math.min(1, n.grow));
      n.grow += dt * 4;
      n.root.scale.setScalar(Math.max(0.001, s));
      const carry = c.carrying.length ? c.carrying[c.carrying.length - 1].item : null;
      if (carry !== n.carry) {
        n.carry = carry;
        n.hand.visible = !!carry;
        if (carry) n.hand.material.map = this.itemTex(carry), n.hand.material.needsUpdate = true;
      }
    }
    for (const [id, n] of this.npcs) if (!alive.has(id)) {
      this.burst(n.root.position.x, n.root.position.y + 0.9, n.root.position.z, 0xffffff, 10);
      this.scene.remove(n.root);
      disposeTree(n.root);
      this.npcs.delete(id);
    }
  }

  makeNpc(c) {
    const L = c.look;
    const mat = col => new T.MeshLambertMaterial({color: new T.Color(col)});
    const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const shirt = mat(L.shirt), pants = mat(L.pants), skin = mat(L.skin);
    // あし
    const legL = new T.Group(), legR = new T.Group();
    legL.position.set(-0.12, 0.7, 0); legR.position.set(0.12, 0.7, 0);
    const lg = box(0.22, 0.7, 0.24, pants); lg.position.y = -0.35;
    legL.add(lg); legR.add(lg.clone());
    body.add(legL, legR);
    // からだ
    const torso = box(0.5, 0.72, 0.3, shirt); torso.position.y = 1.06;
    body.add(torso);
    if (L.robe) { const sk = box(0.54, 0.46, 0.34, shirt); sk.position.y = 0.5; body.add(sk); }
    if (L.pack) { const pk = box(0.38, 0.42, 0.18, mat('#7a5530')); pk.position.set(0, 1.1, -0.24); body.add(pk); }
    if (L.cape) { const cp = box(0.54, 1.0, 0.05, mat(L.shirt)); cp.position.set(0, 0.9, -0.18); body.add(cp); const tr = box(0.52, 0.06, 0.32, mat(L.cape)); tr.position.y = 1.4; body.add(tr); }
    // うで
    const armL = new T.Group(), armR = new T.Group();
    armL.position.set(-0.34, 1.38, 0); armR.position.set(0.34, 1.38, 0);
    const ag = box(0.18, 0.66, 0.2, shirt); ag.position.y = -0.3;
    const hand = box(0.18, 0.12, 0.2, skin); hand.position.y = -0.66;
    armL.add(ag, hand); armR.add(ag.clone(), hand.clone());
    const held = new T.Sprite(new T.SpriteMaterial({alphaTest: 0.5}));
    held.scale.set(0.38, 0.38, 0.38); held.position.set(0, -0.75, 0.2); held.visible = false;
    armR.add(held);
    body.add(armL, armR);
    // あたま
    const head = new T.Group();
    head.position.y = 1.42;
    const faceTex = new T.CanvasTexture(faceCanvas(L)); pixelTex(faceTex); faceTex.userData.own = true;
    const hairM = mat(L.hair || L.skin);
    const hm = box(0.48, 0.48, 0.48, [skin, skin, hairM, skin, new T.MeshLambertMaterial({map: faceTex}), hairM]);
    hm.position.y = 0.24;
    head.add(hm);
    const hat = L.hat, hc = mat(L.hatColor || '#555');
    const add = (w, h, d, m, x, y, z) => { const b = box(w, h, d, m); b.position.set(x, y, z); head.add(b); return b; };
    if (hat === 'none' || !hat) add(0.5, 0.1, 0.5, hairM, 0, 0.5, 0);
    if (hat === 'cap') { add(0.52, 0.14, 0.52, hc, 0, 0.53, 0); add(0.5, 0.05, 0.22, hc, 0, 0.47, 0.32); }
    if (hat === 'helmet') { add(0.54, 0.26, 0.54, hc, 0, 0.42, 0); add(0.54, 0.4, 0.06, hc, 0, 0.26, -0.25); add(0.06, 0.4, 0.5, hc, -0.25, 0.26, 0); add(0.06, 0.4, 0.5, hc, 0.25, 0.26, 0); add(0.08, 0.2, 0.34, mat(L.plume || '#d03030'), 0, 0.64, -0.04); }
    if (hat === 'wizard') { add(0.66, 0.06, 0.66, hc, 0, 0.5, 0); add(0.42, 0.22, 0.42, hc, 0, 0.64, 0); add(0.28, 0.22, 0.28, hc, 0.02, 0.84, -0.02); add(0.14, 0.2, 0.14, hc, 0.05, 1.02, -0.05); add(0.06, 0.06, 0.06, mat('#ffd84a'), 0.12, 0.66, 0.22); }
    if (hat === 'crown') { add(0.5, 0.1, 0.5, hairM, 0, 0.5, 0); add(0.44, 0.12, 0.44, hc, 0, 0.6, 0); for (const [x, z] of [[-0.18, 0.18], [0.18, 0.18], [0, 0.2], [-0.18, -0.18], [0.18, -0.18]]) add(0.08, 0.1, 0.08, hc, x, 0.71, z); add(0.06, 0.06, 0.04, mat('#e0303a'), 0, 0.6, 0.23); }
    body.add(head);
    return {root, body, head, legL, legR, armL, armR, hand: held, t: Math.random() * 6, scale: L.scale || 1, grow: 0, carry: null};
  }

  // ---------- エフェクト ----------
  partMat(color) {
    this.partMats = this.partMats || new Map();
    if (!this.partMats.has(color)) this.partMats.set(color, new T.MeshBasicMaterial({color}));
    return this.partMats.get(color);
  }
  burst(x, y, z, color, n = 12, speed = 2.5) {
    const m = this.partMat(color);
    for (let k = 0; k < n; k++) {
      const p = new T.Mesh(this.partGeo, m);
      p.position.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6);
      p.userData = {v: new T.Vector3((Math.random() - 0.5) * speed, Math.random() * speed + 1, (Math.random() - 0.5) * speed), life: 0.6 + Math.random() * 0.4};
      this.scene.add(p);
      this.particles.push(p);
    }
  }
  breakBurst(x, y, z, id) { this.burst(x + 0.5, y + 0.5, z + 0.5, new T.Color(BLOCKS[id]?.color || '#888').getHex(), 14); }
  coins(x, y, z) {
    const m = this.partMat(0xffd84a);
    this.coinGeo = this.coinGeo || new T.CylinderGeometry(0.1, 0.1, 0.03, 10);
    for (let k = 0; k < 8; k++) {
      const p = new T.Mesh(this.coinGeo, m);
      p.rotation.x = Math.PI / 2;
      p.position.set(x, y, z);
      p.userData = {v: new T.Vector3((Math.random() - 0.5) * 2, 3 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 0.9, spin: 8 + Math.random() * 6};
      this.scene.add(p);
      this.particles.push(p);
    }
  }
  sparkle(x, y, z) { for (const c of [0xffd84a, 0xff7ab8, 0x7ad8ff, 0x9cff7a]) this.burst(x, y, z, c, 10, 5); }

  stepParticles(dt) {
    for (const p of this.particles) {
      const u = p.userData;
      u.life -= dt;
      u.v.y -= 9 * dt;
      p.position.addScaledVector(u.v, dt);
      if (u.spin) p.rotation.z += u.spin * dt;
      const s = Math.max(0.01, Math.min(1, u.life * 2));
      p.scale.setScalar(s);
    }
    this.particles = this.particles.filter(p => { if (p.userData.life > 0) return true; this.scene.remove(p); return false; });
  }

  // 店の はんい（レジから 8マス）を 地面に 光る わで 見せる
  setAreas(shops) {
    if (!this.areaGroup) {
      this.areaGroup = new T.Group();
      this.scene.add(this.areaGroup);
      this.ringGeo = new T.RingGeometry(7.75, 8.15, 96).rotateX(-Math.PI / 2);
      this.diskGeo = new T.CircleGeometry(7.75, 96).rotateX(-Math.PI / 2);
      this.ringMat = new T.MeshBasicMaterial({color: 0xffd84a, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: T.DoubleSide});
      this.diskMat = new T.MeshBasicMaterial({color: 0xffe88a, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
      this.pillarMat = new T.MeshBasicMaterial({color: 0xffd84a, transparent: true, opacity: 0.35, depthWrite: false});
      this.pillarGeo = new T.CylinderGeometry(0.08, 0.08, 6, 6);
    }
    const key = shops ? shops.map(s => s.i).join(',') : '';
    if (key !== this.areaKey) {
      this.areaKey = key;
      this.areaGroup.clear();
      for (const s of shops || []) {
        const ring = new T.Mesh(this.ringGeo, this.ringMat);
        ring.position.set(s.x + 0.5, s.y + 0.04, s.z + 0.5);
        ring.renderOrder = 5;
        const disk = new T.Mesh(this.diskGeo, this.diskMat);
        disk.position.set(s.x + 0.5, s.y + 0.03, s.z + 0.5);
        this.areaGroup.add(disk);
        const pillar = new T.Mesh(this.pillarGeo, this.pillarMat);
        pillar.position.set(s.x + 0.5, s.y + 4, s.z + 0.5);
        this.areaGroup.add(ring, pillar);
      }
    }
    this.areaGroup.visible = !!shops;
    if (shops) this.ringMat.opacity = 0.6 + Math.sin(this.time * 4) * 0.3;
  }

  setTarget(hit, progress = 0) {
    if (!hit) { this.outline.visible = false; return; }
    this.outline.visible = true;
    this.outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.crack.material.opacity = progress * 0.45;
  }

  update(dt, customers, people) {
    this.time += dt;
    this.swingT = Math.min(1, (this.swingT ?? 1) + dt);
    const cells = this.consumeChanges();
    this.rebuildChunks(3);
    this.syncSpecials();
    if (cells) this.syncDoors(cells);
    this.syncCustomers(customers, dt);
    // ドアの ひらきかた
    for (const [i, d] of this.doorObjs) {
      const {x, y, z} = this.world.pos(i);
      const near = people.some(p => Math.abs(p.x - x - 0.5) < 1.6 && Math.abs(p.z - z - 0.5) < 1.6 && Math.abs(p.y - y) < 2);
      const target = near ? -Math.PI / 2 : 0;
      d.angle += (target - d.angle) * Math.min(1, dt * 8);
      d.pivot.rotation.y = d.angle;
    }
    for (const o of this.shelfObjs.values()) for (const sp of o.obj.children) if (sp.userData.bob) sp.position.y = 1.35 + Math.sin(this.time * 4) * 0.06;
    for (const c of this.clouds.children) { c.position.x += dt * 0.8; if (c.position.x > 190) c.position.x -= 270; }
    this.stepParticles(dt);
  }

  // 手に もっている ブロック（画面の 右下）
  setHeld(id, speed = 0) {
    if (id !== this.heldId) {
      this.heldId = id;
      if (this.held) { this.camera.remove(this.held); }
      this.held = id ? this.heldMesh(id) : null;
      if (this.held) this.camera.add(this.held);
      this.swingT = 0.35;
    }
    if (!this.held) return;
    this.bobT = (this.bobT || 0) + speed * 0.016;
    const sw = Math.sin(Math.min(1, this.swingT / 0.35) * Math.PI);
    this.held.position.set(0.58 + Math.sin(this.bobT * 2.2) * 0.02, -0.46 + Math.abs(Math.cos(this.bobT * 2.2)) * 0.02 - sw * 0.1, -1.15 + sw * 0.15);
    this.held.rotation.set(0.25 - sw * 0.6, -0.7, 0);
  }
  swing() { this.swingT = 0; }
  heldMesh(id) {
    this.heldCache = this.heldCache || new Map();
    if (this.heldCache.has(id)) return this.heldCache.get(id);
    const b = BLOCKS[id];
    let mesh;
    const mat = new T.MeshBasicMaterial({map: this.atlas, vertexColors: true, alphaTest: 0.5, depthTest: false, depthWrite: false, side: b.shape === 'cross' ? T.DoubleSide : T.FrontSide});
    if (b.shape === 'door') {
      mesh = new T.Mesh(new T.BoxGeometry(0.3, 0.6, 0.05), new T.MeshBasicMaterial({map: this.tex('door', doorCanvas), depthTest: false, depthWrite: false}));
    } else {
      const w = new World(3, 4, 3);
      w.blocks[w.idx(1, 1, 1)] = id;
      const data = buildChunk(w, 0, 0);
      for (let i = 0; i < data.colors.length; i++) data.colors[i] = lin(data.colors[i]);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(data.positions, 3));
      g.setAttribute('uv', new T.BufferAttribute(data.uvs, 2));
      g.setAttribute('color', new T.BufferAttribute(data.colors, 3));
      g.setIndex(new T.BufferAttribute(data.indices, 1));
      g.translate(-1.5, -1.5, -1.5);
      g.scale(0.24, 0.24, 0.24);
      mesh = new T.Mesh(g, mat);
    }
    mesh.renderOrder = 999;
    const holder = new T.Group();
    holder.add(mesh);
    this.heldCache.set(id, holder);
    return holder;
  }

  render() { this.gl.render(this.scene, this.camera); }

  project(x, y, z, w, h) {
    const v = new T.Vector3(x, y, z).project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    return {x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h};
  }
  rayFromScreen(sx, sy, w, h) {
    const v = new T.Vector3(sx / w * 2 - 1, -(sy / h) * 2 + 1, 0.5).unproject(this.camera);
    return v.sub(this.camera.position).normalize();
  }

  // インベントリ用の ブロックの 絵
  blockIcons(ids, size = 96) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const gl = new T.WebGLRenderer({canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true});
    gl.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
    const out = {};
    for (const id of ids) {
      const b = BLOCKS[id];
      const w = new World(3, 4, 3);
      let mesh = null;
      if (b.shape === 'door') {
        const g = new T.BoxGeometry(0.9, 2, 0.14);
        mesh = new T.Mesh(g, new T.MeshBasicMaterial({map: this.tex('door', doorCanvas)}));
        mesh.position.set(1.5, 2, 1.5);
      } else {
        w.blocks[w.idx(1, 1, 1)] = id;
        const data = buildChunk(w, 0, 0);
        for (let i = 0; i < data.colors.length; i++) data.colors[i] = lin(data.colors[i]);
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(data.positions, 3));
        g.setAttribute('uv', new T.BufferAttribute(data.uvs, 2));
        g.setAttribute('color', new T.BufferAttribute(data.colors, 3));
        g.setIndex(new T.BufferAttribute(data.indices, 1));
        mesh = new T.Mesh(g, b.shape === 'cross' ? new T.MeshBasicMaterial({map: this.atlas, vertexColors: true, alphaTest: 0.5, side: T.DoubleSide}) : this.chunkMat);
      }
      scene.add(mesh);
      const box = new T.Box3().setFromObject(mesh);
      const c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
      const r = Math.max(s.x, s.y, s.z) * 0.9 + 0.05;
      cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
      cam.position.set(c.x + 3, c.y + 2.4, c.z + 3);
      cam.lookAt(c);
      cam.updateProjectionMatrix();
      gl.clear();
      gl.render(scene, cam);
      out[id] = cv.toDataURL();
      scene.remove(mesh);
      if (b.shape !== 'door') mesh.geometry.dispose();
    }
    gl.dispose();
    gl.forceContextLoss?.();
    return out;
  }
}

// ジオメトリと マテリアルを すてる（共有テクスチャは のこす）
function disposeTree(obj, keepMaps = false) {
  obj.traverse(o => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      if (!keepMaps && m.map && m.map.userData.own) m.map.dispose();
      m.dispose();
    }
  });
}

function pixelTex(t) {
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  t.needsUpdate = true;
}

function emptyCanvas() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d');
  x.fillStyle = '#e8343a'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
  x.lineWidth = 5; x.strokeStyle = '#ffffff'; x.stroke();
  x.fillStyle = '#ffffff'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('!', 32, 34);
  return cv;
}

function doorCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 32;
  const x = cv.getContext('2d');
  const f = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  f('#7a5530', 0, 0, 16, 32);
  for (let y = 0; y < 32; y += 4) f('#6a4828', 0, y + 3, 16, 1);
  f('#5a3a20', 0, 0, 16, 1); f('#5a3a20', 0, 31, 16, 1); f('#5a3a20', 0, 0, 1, 32); f('#5a3a20', 15, 0, 1, 32);
  f('#bfe6f4', 3, 3, 4, 7); f('#bfe6f4', 9, 3, 4, 7);
  f('#ffffff', 3, 3, 1, 2); f('#ffffff', 9, 3, 1, 2);
  f('#5a3a20', 3, 18, 10, 1); f('#5a3a20', 3, 26, 10, 1);
  f('#e8c040', 12, 16, 2, 2);
  return cv;
}

function signCanvas(text) {
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 200;
  const x = cv.getContext('2d');
  x.fillStyle = '#3a220e';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const font = s => `900 ${s}px "Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
  const fit = (lines, max) => {
    let size = max;
    x.font = font(size);
    while (size > 22 && Math.max(...lines.map(l => x.measureText(l).width)) > 296) { size -= 2; x.font = font(size); }
    return size;
  };
  let lines = [text];
  if (fit(lines, 110) < 62 && text.length > 3) {
    // スペースの ところか まんなかで 2行に わける
    const mid = text.length / 2;
    let cut = Math.ceil(mid), best = Infinity;
    for (let i = 1; i < text.length; i++) if (text[i] === ' ' && Math.abs(i - mid) < best) { best = Math.abs(i - mid); cut = i; }
    lines = [text.slice(0, cut).trim(), text.slice(cut).trim()];
  }
  const size = fit(lines, lines.length > 1 ? 84 : 110);
  lines.forEach((l, k) => x.fillText(l, 160, 104 + (k - (lines.length - 1) / 2) * size * 1.1));
  return cv;
}
