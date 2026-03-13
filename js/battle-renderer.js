/**
 * battle-renderer.js — Canvas-based 2D side-scrolling battle renderer.
 *
 * Responsibilities:
 *   - Render scrolling background, ground, and character sprites on a <canvas>
 *   - Drive per-unit animation state (idle → move → attack → hit / death)
 *   - Render attack-type particles and floating damage numbers
 *   - Load custom sprites/background from AssetManager when available
 *
 * Usage (called by BattleSystem):
 *   renderer.setup(party, enemies)
 *   await renderer.walkTo(attacker, target)
 *   await renderer.playAttack(attacker)
 *   renderer.showHit(target, skillType)
 *   renderer.showDamage(target, amount, 'enemy'|'player'|'heal')
 *   renderer.refreshUnit(unit)   ← call after HP changes
 *   renderer.stop()
 */

class BattleRenderer {
  constructor(canvasId) {
    this._canvas = document.getElementById(canvasId);
    this._ctx    = this._canvas ? this._canvas.getContext('2d') : null;

    /** @type {Array<{unit, sprite:Sprite, x, y, homeX, homeY, dead:boolean, shakeOff:number}>} */
    this._units      = [];
    this._particles  = [];
    this._dmgNumbers = [];

    this._bgScrollX = 0;
    this._bgImage   = null;
    this._rafId     = null;
    this._running   = false;
    this._lastTime  = 0;

    if (this._canvas) {
      this._resizeCanvas();
      // Resize canvas when its container changes size
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => this._resizeCanvas());
        this._ro.observe(this._canvas.parentElement || this._canvas);
      } else {
        window.addEventListener('resize', () => this._resizeCanvas());
      }
    }
  }

  // ─── Canvas Size ────────────────────────────────────────────────────────────

  _resizeCanvas() {
    if (!this._canvas) return;
    const p = this._canvas.parentElement;
    if (p) {
      this._canvas.width  = Math.max(300, p.clientWidth);
      this._canvas.height = Math.max(200, p.clientHeight);
    }
  }

  get W() { return this._canvas ? this._canvas.width  : 800; }
  get H() { return this._canvas ? this._canvas.height : 400; }
  get groundY() { return this.H * 0.77; }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  /**
   * (Re-)initialize the renderer for a new battle.
   * @param {Array} party    — unit objects from BattleSystem
   * @param {Array} enemies
   */
  async setup(party, enemies) {
    this.stop();
    this._units      = [];
    this._particles  = [];
    this._dmgNumbers = [];
    this._bgImage    = null;

    const gY = this.groundY;

    party.forEach((unit, i) => {
      const x = this.W * 0.14 + i * 28;
      const y = gY - i * 6;
      this._units.push(this._mkUnit(unit, x, y, false));
    });

    enemies.forEach((unit, i) => {
      const x = this.W * 0.86 - i * 28;
      const y = gY - i * 6;
      this._units.push(this._mkUnit(unit, x, y, true));
    });

    await this._loadCustomAssets();

    this._running  = true;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  _mkUnit(unit, x, y, flip) {
    const sp = new Sprite(null, null, unit.color);
    sp.flip = flip;
    return { unit, sprite: sp, x, y, homeX: x, homeY: y, dead: unit.currentHP <= 0, shakeOff: 0 };
  }

  async _loadCustomAssets() {
    if (typeof AssetManager === 'undefined') return;

    // Background
    try {
      const url = await AssetManager.load('battle_background');
      if (url) this._bgImage = await this._img(url);
    } catch (_) { /* use generated bg */ }

    // Unit sprites
    for (const us of this._units) {
      const key = this._spriteKey(us.unit);
      try {
        const imgUrl = await AssetManager.load(key);
        if (!imgUrl) continue;
        const img = await this._img(imgUrl);

        const cfgStr = await AssetManager.load(key + '_config');
        const config = cfgStr ? JSON.parse(cfgStr) : {
          frameWidth:  img.naturalWidth,
          frameHeight: img.naturalHeight,
          animations:  null
        };

        us.sprite      = new Sprite(img, config, us.unit.color);
        us.sprite.flip = !us.unit.isPlayer;
      } catch (_) { /* keep placeholder */ }
    }
  }

  _img(src) {
    return new Promise((resolve, reject) => {
      const i   = new Image();
      i.onload  = () => resolve(i);
      i.onerror = reject;
      i.src     = src;
    });
  }

  /**
   * Return the AssetManager key for a unit's custom sprite.
   * Player units use 'sprite_<id>', enemies use 'enemy_sprite_<defId>'.
   * Enemy instance IDs have the format '<defId>_<index>' (e.g. 'phantom_0'),
   * so we read unit.defId when available, otherwise strip the trailing '_N'.
   */
  _spriteKey(unit) {
    if (unit.isPlayer) return `sprite_${unit.id}`;
    // unit.defId is set by BattleSystem for enemy instances
    const baseId = unit.defId || unit.id.replace(/_\d+$/, '');
    return `enemy_sprite_${baseId}`;
  }

  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(now - this._lastTime, 50);
    this._lastTime = now;
    this._update(dt);
    this._draw();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this._bgScrollX += 0.18 * dt / 16;

    for (const us of this._units) us.sprite.update(dt);

    for (const p of this._particles) {
      p.x    += p.vx * dt / 16;
      p.y    += p.vy * dt / 16;
      p.vy   += 0.15;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    this._particles = this._particles.filter(p => p.life > 0);

    for (const d of this._dmgNumbers) {
      d.y    -= 1.3 * dt / 16;
      d.life -= dt;
      d.alpha = Math.max(0, d.life / d.maxLife);
    }
    this._dmgNumbers = this._dmgNumbers.filter(d => d.life > 0);
  }

  _draw() {
    const ctx = this._ctx;
    if (!ctx) return;
    const { W, H, groundY } = this;

    ctx.clearRect(0, 0, W, H);

    this._drawBg(ctx, W, H, groundY);

    // Sort by Y so deeper units render behind
    const sorted = [...this._units].sort((a, b) => a.y - b.y);
    const sz = Math.min(W * 0.20, H * 0.55);

    for (const us of sorted) {
      if (us.dead && us.sprite.isAnimDone()) continue;
      const x = us.x + us.shakeOff;
      us.sprite.draw(ctx, x, us.y, sz * 0.65, sz);
      this._drawHPBar(ctx, x, us.y + 4, sz * 0.85, us.unit);
    }

    // Particles
    for (const p of this._particles) {
      ctx.save();
      ctx.globalAlpha  = p.alpha;
      ctx.fillStyle    = p.color;
      ctx.shadowColor  = p.color;
      ctx.shadowBlur   = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating damage numbers
    for (const d of this._dmgNumbers) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.font        = `bold ${d.size}px sans-serif`;
      ctx.textAlign   = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth   = 4;
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle   = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.restore();
    }
  }

  _drawBg(ctx, W, H, groundY) {
    if (this._bgImage) {
      const img   = this._bgImage;
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const bw    = img.naturalWidth  * scale;
      const bh    = img.naturalHeight * scale;
      const ox    = -(this._bgScrollX % bw);
      ctx.drawImage(img, ox,      0, bw, bh);
      if (ox + bw < W) ctx.drawImage(img, ox + bw, 0, bw, bh);
      // Darken
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, W, H);
    } else {
      // Generated sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0,   '#060210');
      sky.addColorStop(0.6, '#0b0418');
      sky.addColorStop(1,   '#13071e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Stars (pseudo-random, scrolling slowly)
      // 137 and 73 are primes chosen to avoid repeating grid patterns when
      // multiplied by consecutive integers; 0.68 keeps stars in the sky area.
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 55; i++) {
        const x = (i * 137 + this._bgScrollX * 0.18) % W;
        const y = (i * 73)  % (H * 0.68);
        const r = (i % 6 === 0) ? 1.3 : 0.65;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground
      const grd = ctx.createLinearGradient(0, groundY, 0, H);
      grd.addColorStop(0, '#1b0b26');
      grd.addColorStop(1, '#0c0610');
      ctx.fillStyle = grd;
      ctx.fillRect(0, groundY, W, H - groundY);

      // Ground glow line
      ctx.strokeStyle = 'rgba(140,40,220,0.28)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();
    }
  }

  _drawHPBar(ctx, cx, bottomY, bw, unit) {
    const bh  = 5;
    const bx  = cx - bw / 2;
    const pct = Math.max(0, Math.min(1, unit.currentHP / unit.maxHP));

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx, bottomY, bw, bh);

    const barColor = pct > 0.6 ? '#27ae60' : pct > 0.3 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle  = barColor;
    ctx.fillRect(bx, bottomY, bw * pct, bh);

    // Name label
    ctx.fillStyle  = 'rgba(255,255,255,0.72)';
    ctx.font       = '10px sans-serif';
    ctx.textAlign  = 'center';
    const label    = (unit.shortName || unit.name || '').replace(/\s*\(.*\)$/, '');
    ctx.fillText(label, cx, bottomY + bh + 10);
  }

  // ─── Public Animation API ───────────────────────────────────────────────────

  /** Find a unit state by unit.id. */
  _us(unit) {
    return this._units.find(us => us.unit.id === unit.id);
  }

  /**
   * Update HP display and trigger death animation if HP ≤ 0.
   * Call after BattleSystem has modified unit.currentHP.
   */
  refreshUnit(unit) {
    const us = this._us(unit);
    if (!us) return;
    if (unit.currentHP <= 0 && !us.dead) {
      us.dead = true;
      us.sprite.setAnimation('death');
    }
  }

  /**
   * Walk the attacker toward the target (move animation).
   * Returns a Promise that resolves when movement finishes.
   */
  walkTo(attacker, _target) {
    const us = this._us(attacker);
    if (!us || !this._running) return Promise.resolve();
    const destX = attacker.isPlayer ? this.W * 0.48 : this.W * 0.52;
    return this._moveTo(us, destX, us.homeY, 440);
  }

  /**
   * Walk the attacker back to its home position.
   */
  walkBack(attacker) {
    const us = this._us(attacker);
    if (!us || !this._running) return Promise.resolve();
    return this._moveTo(us, us.homeX, us.homeY, 360);
  }

  /**
   * Play the attack animation for the given unit.
   * Resolves when the one-shot animation completes.
   */
  playAttack(attacker) {
    const us = this._us(attacker);
    if (!us || !this._running) return Promise.resolve();
    us.sprite.setAnimation('attack');
    return new Promise(resolve => {
      const check = () => {
        if (!this._running || us.sprite.isAnimDone()) {
          if (this._running) us.sprite.setAnimation('idle');
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }

  /**
   * Show hit effect (flash + shake + particles) on target.
   * @param {Object} target    — unit object
   * @param {string} skillType — '참격'|'관통'|'타격'
   */
  showHit(target, skillType) {
    const us = this._us(target);
    if (!us) return;
    us.sprite.setAnimation('hit');
    this._spawnParticles(us.x, us.y - 40, skillType);

    // Screen-shake for target sprite
    let count = 5;
    const shake = () => {
      if (count-- <= 0) { us.shakeOff = 0; return; }
      us.shakeOff = (Math.random() - 0.5) * 12;
      setTimeout(shake, 60);
    };
    shake();
  }

  /**
   * Spawn a floating damage number.
   * @param {Object} target
   * @param {number} amount
   * @param {'enemy'|'player'|'heal'} type
   */
  showDamage(target, amount, type) {
    const us = this._us(target);
    const x  = us ? us.x + (Math.random() - 0.5) * 24 : this.W / 2;
    const y  = us ? us.y - 70 : this.H / 3;
    const color = type === 'heal' ? '#6bff6b'
                : type === 'player' ? '#ff6b6b'
                : '#f9ca24';
    this._dmgNumbers.push({
      x, y,
      text:    type === 'heal' ? `+${amount}` : `-${amount}`,
      color,
      size:    Math.min(34, 18 + Math.floor(amount / 4)),
      life:    1300,
      maxLife: 1300,
      alpha:   1
    });
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  _moveTo(us, destX, destY, duration) {
    const startX = us.x;
    const startY = us.y;
    const t0     = performance.now();
    us.sprite.setAnimation('move');

    return new Promise(resolve => {
      const step = now => {
        const p = Math.min(1, (now - t0) / duration);
        us.x = startX + (destX - startX) * p;
        us.y = startY + (destY - startY) * p;
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          us.x = destX;
          us.y = destY;
          us.sprite.setAnimation('idle');
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  _spawnParticles(x, y, skillType) {
    const palettes = {
      '참격': ['#e74c3c', '#ff7675', '#c0392b'],
      '관통': ['#3498db', '#74b9ff', '#2980b9'],
      '타격': ['#f39c12', '#ffd700', '#e67e22']
    };
    const colors = palettes[skillType] || palettes['타격'];

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 4.5;
      this._particles.push({
        x, y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed - 4,
        r:       2.5 + Math.random() * 3.5,
        color:   colors[i % colors.length],
        life:    550 + Math.random() * 350,
        maxLife: 900,
        alpha:   1
      });
    }
  }
}
