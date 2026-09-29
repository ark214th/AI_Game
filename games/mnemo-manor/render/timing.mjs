// 端末の実際のリフレッシュレートを測る。閃光の表示時間は「何フレーム表示するか」で決めるため。

import { TIMING } from '../config/tuning.mjs';

export function measureRefresh(frames = TIMING.measureFrames) {
  return new Promise((resolve) => {
    const stamps = [];
    const tick = (ts) => {
      stamps.push(ts);
      if (stamps.length < frames) requestAnimationFrame(tick);
      else resolve(summarize(stamps));
    };
    requestAnimationFrame(tick);
  });
}

export function summarize(stamps) {
  // 最初の数フレームは不安定なので捨て、中央値を使う（たまのフレーム落ちに引きずられない）
  const d = [];
  for (let i = 4; i < stamps.length; i++) d.push(stamps[i] - stamps[i - 1]);
  d.sort((a, b) => a - b);
  const med = d.length ? d[Math.floor(d.length / 2)] : 1000 / 60;
  const frameMs = Math.min(1000 / 30, Math.max(1000 / 240, med));
  return { frameMs, hz: Math.round(1000 / frameMs) };
}
