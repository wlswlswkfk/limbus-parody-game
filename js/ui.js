/**
 * ui.js — Shared UI utilities
 */

const UI = {
  /** Show a screen by id, hide all others */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  },

  /**
   * Create a character sprite element (CSS silhouette).
   * @param {string} color  - Hex color string
   * @param {string} name   - Character name (first char used as initial)
   * @returns {HTMLElement}
   */
  createCharacterSprite(color, name) {
    const wrapper = document.createElement('div');
    wrapper.className = 'character-sprite';
    wrapper.style.setProperty('--sprite-color', color);

    const head = document.createElement('div');
    head.className = 'sprite-head';
    head.style.background = `radial-gradient(circle at 38% 35%, ${this._lighten(color, 30)}, ${color})`;
    head.style.boxShadow = `0 0 8px ${color}88`;

    const body = document.createElement('div');
    body.className = 'sprite-body';
    body.style.background = `linear-gradient(180deg, ${this._darken(color, 10)}, ${this._darken(color, 25)})`;

    const legs = document.createElement('div');
    legs.className = 'sprite-legs';
    for (let i = 0; i < 2; i++) {
      const leg = document.createElement('div');
      leg.className = 'sprite-leg';
      leg.style.background = this._darken(color, 30);
      legs.appendChild(leg);
    }

    wrapper.appendChild(head);
    wrapper.appendChild(body);
    wrapper.appendChild(legs);
    return wrapper;
  },

  _lighten(hex, amount) {
    return this._adjustColor(hex, amount);
  },

  _darken(hex, amount) {
    return this._adjustColor(hex, -amount);
  },

  _adjustColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return `rgb(${r},${g},${b})`;
  },

  /**
   * Show a floating damage number on a target element.
   * @param {HTMLElement} targetEl
   * @param {number}      damage
   * @param {'enemy'|'player'|'heal'} type
   */
  showDamagePopup(targetEl, damage, type = 'enemy') {
    const popup = document.createElement('div');
    popup.className = `damage-popup damage-${type}`;
    if (type === 'heal') popup.className = 'damage-popup heal-popup';
    popup.textContent = type === 'heal' ? `+${damage}` : `-${damage}`;

    // Position relative to parent
    const parent = targetEl.parentElement || document.body;
    parent.style.position = 'relative';

    const rect   = targetEl.getBoundingClientRect();
    const pRect  = parent.getBoundingClientRect();
    popup.style.left = `${rect.left - pRect.left + rect.width / 2 - 20}px`;
    popup.style.top  = `${rect.top  - pRect.top  - 10}px`;

    parent.appendChild(popup);
    popup.addEventListener('animationend', () => popup.remove());
  },

  /** Toast notification */
  showNotification(message, duration = 2500) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className  = 'notification';
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'notifyOut 0.3s ease forwards';
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  },

  /**
   * Animate a single coin flip in a container div.
   * Returns a Promise that resolves with the result.
   * @param {HTMLElement} coinEl  - The .coin element
   * @param {boolean}     isHeads
   * @returns {Promise<boolean>}
   */
  animateCoinFlip(coinEl, isHeads) {
    return new Promise(resolve => {
      coinEl.classList.remove('heads', 'tails', 'flipping');
      coinEl.classList.add('pending');
      coinEl.querySelector('.coin-face').textContent = '?';

      // Trigger reflow then start animation
      void coinEl.offsetWidth;
      coinEl.classList.add('flipping');
      coinEl.classList.remove('pending');

      setTimeout(() => {
        coinEl.classList.remove('flipping');
        coinEl.classList.add(isHeads ? 'heads' : 'tails');
        const face = coinEl.querySelector('.coin-face');
        face.textContent = isHeads ? '앞' : '뒤';
        resolve(isHeads);
      }, 750);
    });
  },

  /** Create a coin DOM element */
  createCoinEl() {
    const coin = document.createElement('div');
    coin.className = 'coin pending';
    const inner = document.createElement('div');
    inner.className = 'coin-inner';
    const face = document.createElement('div');
    face.className = 'coin-face';
    face.textContent = '?';
    inner.appendChild(face);
    coin.appendChild(inner);
    return coin;
  },

  /** Update HP bar element */
  updateHPBar(barEl, current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    barEl.style.width = `${pct}%`;
    barEl.classList.remove('hp-high', 'hp-mid');
    if (pct > 60) barEl.classList.add('hp-high');
    else if (pct > 30) barEl.classList.add('hp-mid');
  },

  /** Simple delay helper */
  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
};
