(() => {
  'use strict';

  const nativePush = Array.prototype.push;
  const nativeSplice = Array.prototype.splice;
  const limits = { enemies: 140, shots: 130, gems: 220, effects: 70, texts: 72, bolts: 10 };
  let finalPhase = false;
  let recoveryShown = false;

  function classify(value) {
    if (!value || typeof value !== 'object') return '';
    if (typeof value.type === 'string' && typeof value.hp === 'number' && typeof value.speed === 'number' && typeof value.damage === 'number') return 'enemy';
    if (typeof value.k === 'string' && typeof value.dmg === 'number' && value.h instanceof Set) return 'shot';
    if (Array.isArray(value.pts) && typeof value.life === 'number') return 'bolt';
    if (value.ring === 1 && typeof value.life === 'number') return 'effect';
    if (Object.prototype.hasOwnProperty.call(value, 't') && typeof value.life === 'number') return 'text';
    if (typeof value.v === 'number' && typeof value.vx === 'number' && typeof value.vy === 'number' && typeof value.life === 'number') return 'gem';
    return '';
  }

  function trimOldest(array, limit) {
    const overflow = array.length - limit + 1;
    if (overflow > 0) nativeSplice.call(array, 0, overflow);
  }

  function clearOrdinaryEnemies(array) {
    for (let i = array.length - 1; i >= 0; i -= 1) {
      if (!array[i] || array[i].type !== 'boss') nativeSplice.call(array, i, 1);
    }
  }

  Array.prototype.push = function guardedPush(...values) {
    for (const value of values) {
      const kind = classify(value);

      if (kind === 'enemy') {
        if (finalPhase) clearOrdinaryEnemies(this);
        if (value.type !== 'boss' && (finalPhase || this.length >= limits.enemies)) continue;
        if (value.type === 'boss' && this.length >= limits.enemies) {
          const removable = this.findIndex((enemy) => enemy && enemy.type !== 'boss');
          if (removable >= 0) nativeSplice.call(this, removable, 1);
        }
      } else if (kind === 'gem' && this.length >= limits.gems) {
        const target = this[Math.floor(Math.random() * this.length)];
        if (target && typeof target.v === 'number') {
          target.v += value.v;
          target.r = Math.min(10, (target.r || 5) + 0.15);
        }
        continue;
      } else if (kind === 'shot' && this.length >= limits.shots) {
        trimOldest(this, limits.shots);
      } else if (kind === 'effect' && this.length >= limits.effects) {
        trimOldest(this, limits.effects);
      } else if (kind === 'text' && this.length >= limits.texts) {
        trimOldest(this, limits.texts);
      } else if (kind === 'bolt' && this.length >= limits.bolts) {
        trimOldest(this, limits.bolts);
      }

      nativePush.call(this, value);
    }
    return this.length;
  };

  function installWeaponsHudCache() {
    const element = document.getElementById('weapons');
    if (!element) return;
    let prototype = element;
    let descriptor = null;
    while (prototype && !descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(prototype, 'innerHTML');
      prototype = Object.getPrototypeOf(prototype);
    }
    if (!descriptor || !descriptor.get || !descriptor.set) return;
    let lastValue = descriptor.get.call(element);
    Object.defineProperty(element, 'innerHTML', {
      configurable: true,
      get() { return descriptor.get.call(element); },
      set(value) {
        if (value === lastValue) return;
        lastValue = value;
        descriptor.set.call(element, value);
      }
    });
  }

  function enterFinalPhase() {
    if (finalPhase) return;
    finalPhase = true;
    const notice = document.getElementById('notice');
    if (notice) {
      notice.textContent = '🌅 最終決戦！ 宵闇の王を倒そう！';
      notice.style.opacity = '1';
    }
  }

  function checkTimer() {
    const timer = document.getElementById('tm');
    if (timer && timer.textContent.trim() === '00:00') enterFinalPhase();
  }

  function showRecovery(error) {
    if (recoveryShown) return;
    recoveryShown = true;
    console.error('[Moon Survivor recovery]', error);

    const idsToHide = ['hud', 'joy', 'level', 'paused'];
    idsToHide.forEach((id) => document.getElementById(id)?.classList.add('hidden'));
    const end = document.getElementById('end');
    end?.classList.remove('hidden');
    const icon = document.getElementById('endico');
    const title = document.getElementById('endtitle');
    const text = document.getElementById('endtext');
    if (icon) icon.textContent = '🛠️';
    if (title) title.textContent = 'ゲームを再開できます';
    if (text) text.textContent = '一時的な処理エラーを検知しました。「もう一度遊ぶ」から再開してください。';
  }

  installWeaponsHudCache();
  checkTimer();

  if (typeof MutationObserver !== 'undefined') {
    const timer = document.getElementById('tm');
    if (timer) new MutationObserver(checkTimer).observe(timer, { childList: true, characterData: true, subtree: true });
  }
  window.setInterval(checkTimer, 250);
  window.addEventListener('error', (event) => showRecovery(event.error || new Error(event.message)));
  window.addEventListener('unhandledrejection', (event) => showRecovery(event.reason || new Error('Unhandled promise rejection')));

  window.__moonSurvivorStability = {
    limits,
    isFinalPhase: () => finalPhase,
    forceFinalPhase: enterFinalPhase
  };
})();
