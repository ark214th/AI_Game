import test from 'node:test';
import assert from 'node:assert/strict';
import {B, BLOCKS} from './blocks.mjs';
import {World} from './world.mjs';
import {buildChunk, rotateBox} from './mesher.mjs';

const quads = d => d.indices.length / 6;

test('a lone cube has six faces and touching cubes hide their shared faces', () => {
  const w = new World(4, 4, 4);
  w.set(1, 1, 1, B.STONE);
  assert.equal(quads(buildChunk(w, 0, 0)), 6);
  w.set(2, 1, 1, B.STONE);
  assert.equal(quads(buildChunk(w, 0, 0)), 10);
});

test('glass next to glass hides the shared face but glass does not hide stone', () => {
  const w = new World(4, 4, 4);
  w.set(1, 1, 1, B.GLASS); w.set(2, 1, 1, B.GLASS);
  assert.equal(quads(buildChunk(w, 0, 0)), 10);
  w.set(2, 1, 1, B.STONE);
  assert.equal(quads(buildChunk(w, 0, 0)), 11); // ガラスの 石がわの 面だけ きえる
});

test('rotating a box four quarter turns brings it back, and one turn moves the front to +x', () => {
  const b = [2, 0, 12, 14, 8, 16];
  assert.deepEqual(rotateBox(b, 4), b);
  const r = rotateBox(b, 1);
  assert.equal(r[3], 16);
  assert.equal(r[0], 12);
});

test('every placeable block builds geometry without errors and uvs stay inside the atlas', () => {
  for (const b of BLOCKS) {
    if (!b || !b.cat) continue;
    const w = new World(3, 4, 3);
    w.set(1, 1, 1, b.id, 1);
    const d = buildChunk(w, 0, 0);
    if (b.shape !== 'door') assert.ok(quads(d) > 0, b.key);
    for (const u of d.uvs) assert.ok(u >= 0 && u <= 1, b.key);
  }
});

test('ambient occlusion darkens the floor next to a wall', () => {
  const w = new World(5, 4, 5);
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) w.set(x, 0, z, B.STONE);
  const topAt = (d, x, z) => {
    const out = [];
    for (let i = 0; i < d.positions.length / 3; i++) {
      if (d.positions[i * 3 + 1] === 1 && d.positions[i * 3] === x && d.positions[i * 3 + 2] === z) out.push(d.colors[i * 3]);
    }
    return out;
  };
  assert.ok(topAt(buildChunk(w, 0, 0), 2, 3).every(c => c === 1));
  w.set(2, 1, 2, B.STONE);
  assert.ok(Math.min(...topAt(buildChunk(w, 0, 0), 2, 3)) < 1);
});
