(() => {
  'use strict';

  const nativeAssign = Object.assign;
  const nativePush = Array.prototype.push;
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);

  let player = null;
  const trackedEnemies = new Set();

  Object.assign = function trackedAssign(target, ...sources) {
    const result = nativeAssign(target, ...sources);
    if (
      target && typeof target === 'object' &&
      typeof target.x === 'number' && typeof target.y === 'number' &&
      typeof target.hp === 'number' && typeof target.maxHp === 'number' &&
      typeof target.speed === 'number' && typeof target.magnet === 'number'
    ) {
      player = target;
      trackedEnemies.clear();
    }
    return result;
  };

  Array.prototype.push = function trackedPush(...items) {
    for (const item of items) {
      if (
        item && typeof item === 'object' &&
        typeof item.type === 'string' && typeof item.hp === 'number' &&
        typeof item.maxHp === 'number' && typeof item.damage === 'number' &&
        typeof item.x === 'number' && typeof item.y === 'number'
      ) {
        trackedEnemies.add(item);
      }
    }
    return nativePush.apply(this, items);
  };

  function drawEmojiAndHealthBars() {
    const canvas = document.getElementById('game');
    if (!canvas || !player) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    // 主人公は絵文字を主役にし、既存の当たり判定用の円の上へ重ねる。
    ctx.globalAlpha = player.invuln > 0 && Math.floor(player.invuln * 18) % 2 === 0 ? 0.45 : 1;
    ctx.font = '32px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(100,140,255,.8)';
    ctx.shadowBlur = 12;
    ctx.fillText('🧙‍♂️', width / 2, height / 2 - 1);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    for (const enemy of trackedEnemies) {
      if (!enemy || enemy.dead || enemy.type === 'boss') {
        if (!enemy || enemy.dead) trackedEnemies.delete(enemy);
        continue;
      }

      const worldDx = enemy.x - player.x;
      const worldDy = enemy.y - player.y;
      if (worldDx * worldDx + worldDy * worldDy > 2300 * 2300) {
        trackedEnemies.delete(enemy);
        continue;
      }

      // ライフゲージはダメージを受けた雑魚だけに表示する。
      if (!(enemy.hp < enemy.maxHp)) continue;

      const sx = worldDx + width / 2;
      const sy = worldDy + height / 2;
      if (sx < -100 || sx > width + 100 || sy < -100 || sy > height + 100) continue;

      const barWidth = Math.max(26, Math.min(72, enemy.r * 2.2));
      const barHeight = enemy.rank === 'giant' ? 6 : 5;
      const barX = sx - barWidth / 2;
      const barY = sy + enemy.r + 8;
      const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));

      ctx.fillStyle = 'rgba(4,6,20,.78)';
      ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
      ctx.fillStyle = enemy.rank === 'elite' ? '#ffd75e' : enemy.rank === 'giant' ? '#ff845c' : '#ff617f';
      ctx.fillRect(barX, barY, barWidth * ratio, barHeight);
      ctx.strokeStyle = 'rgba(235,240,255,.42)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    ctx.restore();
  }

  window.requestAnimationFrame = function requestAnimationFrameWithVisuals(callback) {
    return nativeRequestAnimationFrame((time) => {
      callback(time);
      drawEmojiAndHealthBars();
    });
  };
})();