// M0 の「試し潜り」：決まった数の部屋を、ランタン油が尽きるまで進む。

export function createDive(profile) {
  const d = profile.dive;
  return {
    room: 0,
    rooms: d.rooms,
    oil: d.oilMax,
    oilMax: d.oilMax,
    comboRefill: d.comboRefill,
    combo: 0,
    bestCombo: 0,
    treasures: 0,
    over: false,
  };
}

export function applyDive(dive, result) {
  const n = { ...dive, room: dive.room + 1 };
  const events = { oilLost: 0, oilGained: 0, treasure: false };
  if (result.success) {
    n.combo = dive.combo + 1;
    n.bestCombo = Math.max(dive.bestCombo, n.combo);
    n.treasures = dive.treasures + 1;
    events.treasure = true;
    if (n.combo % dive.comboRefill === 0 && n.oil < n.oilMax) {
      n.oil += 1;
      events.oilGained = 1;
    }
  } else {
    n.combo = 0;
    n.oil = dive.oil - 1;
    events.oilLost = 1;
  }
  n.over = n.oil <= 0 || n.room >= n.rooms;
  events.ended = n.over;
  return { dive: n, events };
}
