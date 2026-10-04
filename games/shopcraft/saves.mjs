import {levelFor} from './game.mjs';

// 複数の セーブ（せかい）を localStorage に しまう。storage を わたせば テストでも 使える。
export const SLOT_MAX = 6;
const INDEX = 'shopcraft-index';
const PREFS = 'shopcraft-prefs';
const SLOT = id => 'shopcraft-slot-' + id;
const OLD = 'shopcraft-v1'; // むかしの 1つだけの セーブ

export class SaveStore {
  constructor(storage) { this.s = storage; }
  read(key) { try { return JSON.parse(this.s.getItem(key) || 'null'); } catch { return null; } }
  write(key, v) { this.s.setItem(key, JSON.stringify(v)); }

  list() {
    const l = this.read(INDEX);
    return Array.isArray(l) ? l.filter(m => m && Number.isInteger(m.id)) : [];
  }
  prefs() { return {sound: true, music: true, help: false, ...(this.read(PREFS) || {})}; }
  setPrefs(p) { try { this.write(PREFS, p); } catch {} }

  // むかしの セーブを 1つめの せかいに うつす
  migrate() {
    if (this.read(INDEX)) return false;
    const old = this.read(OLD);
    if (!old || !old.world) { this.write(INDEX, []); return false; }
    this.write(SLOT(1), old);
    this.write(INDEX, [{id: 1, name: 'せかい1', sandbox: false, level: levelFor(old.game?.totalSales || 0), coins: old.game?.coins ?? 0, updated: Date.now()}]);
    this.setPrefs({...this.prefs(), sound: old.sound !== false, music: old.music !== false, help: !!old.help, last: 1});
    this.s.removeItem(OLD);
    return true;
  }

  canCreate() { return this.list().length < SLOT_MAX; }
  nextId() { return this.list().reduce((m, x) => Math.max(m, x.id), 0) + 1; }
  nextName() {
    const names = new Set(this.list().map(m => m.name));
    for (let n = 1; ; n++) if (!names.has('せかい' + n)) return 'せかい' + n;
  }

  load(id) { return this.read(SLOT(id)); }
  // 書きこめたら true（いっぱいの ときは false）
  save(id, data, meta) {
    try {
      this.write(SLOT(id), data);
      const l = this.list().filter(m => m.id !== id);
      const old = this.list().find(m => m.id === id) || {};
      l.push({...old, ...meta, id, updated: Date.now()});
      l.sort((a, b) => a.id - b.id);
      this.write(INDEX, l);
      return true;
    } catch {
      return false;
    }
  }
  rename(id, name) {
    const l = this.list();
    const m = l.find(x => x.id === id);
    if (!m) return false;
    m.name = String(name).trim().slice(0, 12) || m.name;
    this.write(INDEX, l);
    return true;
  }
  remove(id) {
    this.s.removeItem(SLOT(id));
    this.write(INDEX, this.list().filter(m => m.id !== id));
    const p = this.prefs();
    if (p.last === id) { delete p.last; this.setPrefs(p); }
  }
}
