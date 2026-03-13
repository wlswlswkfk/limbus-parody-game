/**
 * sprite.js — Canvas sprite drawing with animation state machine.
 *
 * Supports:
 *   - Custom sprite sheets (image + frame config)
 *   - Procedural placeholder characters (colored shapes) when no image is set
 *
 * Animation states: 'idle' | 'move' | 'attack' | 'hit' | 'death'
 */

class Sprite {
  /**
   * @param {HTMLImageElement|null} image
   * @param {Object|null}           config  — { frameWidth, frameHeight, animations: { idle:{start,end}, ... } }
   * @param {string}                color   — Hex color for placeholder
   */
  constructor(image, config, color) {
    this._image  = image  || null;
    this._config = config || null;
    this._color  = (color && color.length === 7 && color.startsWith('#')) ? color : '#e74c3c';

    this._anim       = 'idle';
    this._frame      = 0;
    this._frameTimer = 0;
    this._fps        = 8;
    this._done       = false;

    /** Set to true by BattleRenderer for enemies (mirror horizontally). */
    this.flip = false;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  setAnimation(name) {
    if (this._anim === name && !this._done) return;
    this._anim       = name;
    this._frame      = 0;
    this._frameTimer = 0;
    this._done       = false;
  }

  /** Call every frame with elapsed ms. */
  update(dt) {
    if (this._done) return;
    this._frameTimer += dt;
    const dur = 1000 / this._fps;
    while (this._frameTimer >= dur) {
      this._frameTimer -= dur;
      this._frame++;
      const max = this._maxFrames();
      if (this._frame >= max) {
        if (this._anim === 'idle' || this._anim === 'move') {
          this._frame = 0;           // loop
        } else {
          this._frame = max - 1;
          this._done  = true;        // one-shot
        }
      }
    }
  }

  /** True once a one-shot animation (attack/hit/death) has finished. */
  isAnimDone() { return this._done; }

  /**
   * Draw the sprite.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx      — horizontal center
   * @param {number} bottomY — bottom edge
   * @param {number} w       — display width
   * @param {number} h       — display height
   */
  draw(ctx, cx, bottomY, w, h) {
    ctx.save();
    if (this.flip) {
      ctx.scale(-1, 1);
      cx = -cx;
    }
    if (this._image) {
      this._drawSheet(ctx, cx, bottomY, w, h);
    } else {
      this._drawShape(ctx, cx, bottomY, w, h);
    }
    ctx.restore();
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _maxFrames() {
    if (this._image && this._config?.animations) {
      const a = this._config.animations[this._anim] || this._config.animations.idle;
      if (a) return a.end - a.start + 1;
    }
    // Placeholder counts
    const counts = { idle: 4, move: 4, attack: 4, hit: 3, death: 6 };
    return counts[this._anim] || 4;
  }

  _drawSheet(ctx, cx, bottomY, w, h) {
    const img = this._image;
    let sx = 0, sy = 0;
    let fw = img.naturalWidth;
    let fh = img.naturalHeight;

    const cfg = this._config;
    if (cfg && cfg.frameWidth && cfg.frameHeight && cfg.animations) {
      fw = cfg.frameWidth;
      fh = cfg.frameHeight;
      const cols = Math.max(1, Math.floor(img.naturalWidth / fw));
      const anim = cfg.animations[this._anim] || cfg.animations.idle || { start: 0, end: 0 };
      const absFrame = anim.start + this._frame;
      sx = (absFrame % cols) * fw;
      sy = Math.floor(absFrame / cols) * fh;
    }

    ctx.drawImage(img, sx, sy, fw, fh, cx - w / 2, bottomY - h, w, h);
  }

  _drawShape(ctx, cx, bottomY, w, h) {
    const anim = this._anim;
    const c    = this._color;
    const t    = Date.now();

    // ── Death: tilt and fade ─────────────────────────────────────────────────
    if (anim === 'death') {
      const p = Math.min(1, this._frame / 5);
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.translate(cx, bottomY - h * 0.5);
      ctx.rotate((this.flip ? -1 : 1) * p * Math.PI * 0.55);
      cx      = 0;
      bottomY = h * 0.5;
    }

    // ── Hit: flash white ─────────────────────────────────────────────────────
    if (anim === 'hit') {
      ctx.globalAlpha = (this._frame % 2 === 0) ? 0.35 : 1.0;
    }

    // Proportions
    const HR      = w * 0.20;          // head radius
    const BW      = w * 0.44;          // body width
    const BH      = h * 0.34;          // body height
    const LH      = h * 0.20;          // leg height
    const LW      = BW * 0.22;         // leg width
    const bob     = anim === 'idle' ? Math.sin(t / 420) * 2.5 : 0;
    const topY    = bottomY - h + bob;
    const headCY  = topY + HR;
    const bodyTop = headCY + HR + 2;
    const bodyBot = bodyTop + BH;
    const legTopY = bodyBot - 2;

    // ── Attack arm lunge ─────────────────────────────────────────────────────
    if (anim === 'attack') {
      const dir  = this.flip ? -1 : 1;
      const prog = Math.sin((this._frame / (this._maxFrames() - 1)) * Math.PI);
      ctx.strokeStyle = this._adj(c, -25);
      ctx.lineWidth   = LW * 0.75;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, bodyTop + BH * 0.2);
      ctx.lineTo(cx + dir * BW * (0.5 + prog * 0.8), bodyTop + BH * 0.35);
      ctx.stroke();
    }

    // ── Legs ─────────────────────────────────────────────────────────────────
    const legSwing = anim === 'move' ? Math.sin(t / 110) * 9 : 0;
    ctx.fillStyle  = this._adj(c, -30);
    const lx = cx - BW * 0.14;
    const rx = cx + BW * 0.14;
    this._roundRect(ctx, lx - LW / 2, legTopY + legSwing,     LW, LH, 2);
    this._roundRect(ctx, rx - LW / 2, legTopY - legSwing,     LW, LH, 2);
    ctx.fill();

    // ── Body ─────────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx - BW / 2, bodyTop);
    ctx.lineTo(cx + BW / 2, bodyTop);
    ctx.lineTo(cx + BW * 0.36, bodyBot);
    ctx.lineTo(cx - BW * 0.36, bodyBot);
    ctx.closePath();
    const bg = ctx.createLinearGradient(cx, bodyTop, cx, bodyBot);
    bg.addColorStop(0, this._adj(c, -5));
    bg.addColorStop(1, this._adj(c, -28));
    ctx.fillStyle = bg;
    ctx.fill();

    // ── Head ─────────────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(cx, headCY, HR, 0, Math.PI * 2);
    const hg = ctx.createRadialGradient(
      cx - HR * 0.3, headCY - HR * 0.3, HR * 0.08,
      cx, headCY, HR
    );
    hg.addColorStop(0, this._adj(c, 45));
    hg.addColorStop(1, c);
    ctx.fillStyle = hg;
    ctx.fill();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  _adj(hex, amt) {
    if (!hex || hex.length !== 7 || hex[0] !== '#') return '#888';
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amt));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amt));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amt));
    return `rgb(${r},${g},${b})`;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
