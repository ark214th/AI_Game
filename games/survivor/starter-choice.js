(() => {
  'use strict';

  const nativeValues = Object.values;
  const nativePush = Array.prototype.push;
  let weapons = null;
  let projectileGuardInstalled = false;

  function installProjectileGuard() {
    if (projectileGuardInstalled) return;
    projectileGuardInstalled = true;
    Array.prototype.push = function guardedPush(...items) {
      const accepted = items.filter(item => !(item && item.kind === 'moon' && weapons && weapons.moon.level === 0));
      return nativePush.apply(this, accepted);
    };
  }

  Object.values = function patchedValues(object) {
    const keys = object && typeof object === 'object' ? Object.keys(object) : [];
    if (!weapons && ['moon','orbit','nova','aura','light','blade'].every(key => keys.includes(key))) {
      weapons = object;
      Object.values = nativeValues;
      installProjectileGuard();
    }
    return nativeValues(object);
  };

  const choices = [
    {id:'moon', icon:'🌙', name:'月光弾', desc:'近い敵を狙う、扱いやすい遠距離攻撃。'},
    {id:'orbit', icon:'🪐', name:'守護星', desc:'周囲を回る星で、近づく敵を迎え撃つ。'},
    {id:'nova', icon:'❄️', name:'星霜の波', desc:'一定時間ごとに広範囲をまとめて攻撃。'},
    {id:'aura', icon:'🧄', name:'聖なる香気', desc:'近くの敵へ常にダメージを与える。'},
    {id:'light', icon:'⚡', name:'天雷', desc:'複数の敵へ連鎖する雷を落とす。'},
    {id:'blade', icon:'🌒', name:'三日月刃', desc:'貫通する刃を周囲へ放射状に飛ばす。'}
  ];

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #starterChoice{z-index:30}
      #starterChoice .modal{width:min(900px,100%)}
      #starterChoiceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px}
      .starter-weapon{min-height:150px;padding:15px;border-radius:18px;border:1px solid rgba(230,234,255,.25);background:linear-gradient(150deg,rgba(68,77,155,.9),rgba(25,25,68,.96));color:#fff;text-align:left;box-shadow:0 10px 24px rgba(0,0,0,.25)}
      .starter-weapon:active{transform:scale(.98)}
      .starter-weapon .starter-icon{display:block;font-size:38px}
      .starter-weapon h3{margin:7px 0 5px;color:#fff5bd;font-size:17px}
      .starter-weapon p{margin:0;color:#dfe5ff;font-size:12px;line-height:1.5}
      @media(max-width:560px){#starterChoiceGrid{grid-template-columns:repeat(2,1fr);gap:8px}.starter-weapon{min-height:125px;padding:11px}.starter-weapon .starter-icon{font-size:30px}.starter-weapon h3{font-size:14px}.starter-weapon p{font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'starterChoice';
    overlay.className = 'overlay hidden';
    overlay.innerHTML = `<div class='modal'><h2>最初の武器を選べ！</h2><p class='sub'>選んだ武器をLv.1で持って出撃します</p><div id='starterChoiceGrid'></div><div class='links'><button id='starterCancel'>もどる</button></div></div>`;
    document.body.appendChild(overlay);
    const grid = overlay.querySelector('#starterChoiceGrid');
    for (const choice of choices) {
      const button = document.createElement('button');
      button.className = 'starter-weapon';
      button.innerHTML = `<span class='starter-icon'>${choice.icon}</span><h3>${choice.name}</h3><p>${choice.desc}</p>`;
      button.dataset.weapon = choice.id;
      grid.appendChild(button);
    }
    return overlay;
  }

  function install() {
    if (!weapons) {
      setTimeout(install, 0);
      return;
    }

    addStyles();
    const overlay = createOverlay();
    const startButton = document.getElementById('startBtn');
    const retryButton = document.getElementById('retry');
    const cancelButton = document.getElementById('starterCancel');
    let pendingStart = null;

    function openChoice(originalHandler, button) {
      pendingStart = { originalHandler, button };
      overlay.classList.remove('hidden');
    }

    function wrap(button) {
      if (!button || typeof button.onclick !== 'function') return;
      const original = button.onclick;
      button.onclick = (event) => {
        event?.preventDefault?.();
        openChoice(original, button);
      };
    }

    wrap(startButton);
    wrap(retryButton);

    overlay.querySelectorAll('.starter-weapon').forEach(button => {
      button.addEventListener('click', () => {
        if (!pendingStart) return;
        const selected = button.dataset.weapon;
        overlay.classList.add('hidden');
        const { originalHandler, button: sourceButton } = pendingStart;
        pendingStart = null;
        originalHandler.call(sourceButton, new Event('click'));
        nativeValues(weapons).forEach(weapon => { weapon.level = 0; });
        if (weapons[selected]) weapons[selected].level = 1;
      });
    });

    cancelButton.addEventListener('click', () => {
      overlay.classList.add('hidden');
      pendingStart = null;
    });
  }

  setTimeout(install, 0);
})();