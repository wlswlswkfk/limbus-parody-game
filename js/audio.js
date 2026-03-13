/**
 * audio.js — AudioManager using Web Audio API
 * Generates simple tones/sounds since no external audio assets are used.
 * Also supports custom audio files uploaded via AssetManager.
 */

const AudioManager = {
  _ctx: null,
  _bgmSource: null,
  _bgmGain: null,
  _sfxGain: null,
  _muted: false,

  /** Cached custom audio elements: sfxKey -> HTMLAudioElement */
  _customSFX: {},
  /** Cached custom BGM elements: bgmKey -> HTMLAudioElement */
  _customBGM: {},
  /** The currently playing BGM HTMLAudioElement (if custom) */
  _activeBGMAudio: null,

  _getCtx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._bgmGain = this._ctx.createGain();
        this._bgmGain.gain.value = 0.25;
        this._bgmGain.connect(this._ctx.destination);

        this._sfxGain = this._ctx.createGain();
        this._sfxGain.gain.value = 0.4;
        this._sfxGain.connect(this._ctx.destination);
      } catch (e) {
        console.warn('Web Audio not available:', e);
        return null;
      }
    }
    return this._ctx;
  },

  /** Play a tone with given frequency, duration, waveform */
  _tone(freq, dur, type = 'sine', gain = 1.0, delay = 0) {
    const ctx = this._getCtx();
    if (!ctx || this._muted) return;

    try {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

      osc.connect(g);
      g.connect(this._sfxGain);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.05);
    } catch (e) {
      // Silently ignore audio errors
    }
  },

  /**
   * Load all custom audio assets from AssetManager into cache.
   * Call once after AssetManager.init().
   */
  async loadCustomAssets() {
    if (typeof AssetManager === 'undefined') return;

    const sfxKeys = [
      'sfx_hit', 'sfx_coin', 'sfx_coin_heads', 'sfx_coin_tails',
      'sfx_victory', 'sfx_defeat', 'sfx_heal', 'sfx_navigate',
      'sfx_select', 'sfx_boss'
    ];
    for (const key of sfxKeys) {
      try {
        const url = await AssetManager.load(key);
        if (url) this._customSFX[key] = this._makeAudio(url);
      } catch (_) {}
    }

    const bgmKeys = ['bgm_menu', 'bgm_battle', 'bgm_dungeon'];
    for (const key of bgmKeys) {
      try {
        const url = await AssetManager.load(key);
        if (url) this._customBGM[key] = this._makeAudio(url, true);
      } catch (_) {}
    }
  },

  _makeAudio(src, loop = false) {
    const a  = new Audio();
    a.src    = src;
    a.loop   = loop;
    a.volume = loop ? 0.25 : 0.5;
    return a;
  },

  /**
   * Reload a single custom asset from AssetManager (called after upload).
   * @param {string} key — e.g. 'sfx_hit' or 'bgm_battle'
   */
  async reloadCustomAsset(key) {
    if (typeof AssetManager === 'undefined') return;
    try {
      const url = await AssetManager.load(key);
      const isLoop = key.startsWith('bgm_');
      if (url) {
        if (isLoop) this._customBGM[key] = this._makeAudio(url, true);
        else        this._customSFX[key] = this._makeAudio(url, false);
      } else {
        delete this._customBGM[key];
        delete this._customSFX[key];
      }
    } catch (_) {}
  },

  /**
   * Play a sound effect by type.
   * If a custom SFX has been uploaded for this type, plays that instead.
   * @param {'coin'|'hit'|'victory'|'defeat'|'navigate'|'heal'|'select'} type
   */
  playSFX(type) {
    if (this._muted) return;

    const ctx = this._getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();

    // Try custom SFX
    const sfxKey = 'sfx_' + type;
    if (this._customSFX[sfxKey]) {
      try {
        const a = this._customSFX[sfxKey].cloneNode();
        a.volume = 0.5;
        a.play().catch(() => {});
        return;
      } catch (_) {}
    }

    if (!ctx) return;

    // Generated fallback
    switch (type) {
      case 'coin':
        this._tone(880,  0.08, 'sine',   0.5);
        this._tone(1320, 0.06, 'sine',   0.3, 0.05);
        break;

      case 'coin_heads':
        this._tone(660,  0.06, 'sine',   0.4);
        this._tone(990,  0.08, 'sine',   0.5, 0.06);
        this._tone(1320, 0.1,  'sine',   0.4, 0.12);
        break;

      case 'coin_tails':
        this._tone(220, 0.12, 'sawtooth', 0.3);
        this._tone(110, 0.15, 'square',   0.2, 0.08);
        break;

      case 'hit':
        this._tone(150, 0.05, 'sawtooth', 0.6);
        this._tone(80,  0.1,  'square',   0.4, 0.04);
        break;

      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.18, 'sine', 0.4, i * 0.12));
        break;

      case 'defeat':
        [400, 300, 200, 100].forEach((f, i) => this._tone(f, 0.2, 'sawtooth', 0.35, i * 0.18));
        break;

      case 'navigate':
        this._tone(440, 0.06, 'sine', 0.3);
        this._tone(550, 0.06, 'sine', 0.2, 0.07);
        break;

      case 'heal':
        [523, 659, 784].forEach((f, i) => this._tone(f, 0.1, 'sine', 0.3, i * 0.07));
        break;

      case 'select':
        this._tone(660, 0.07, 'sine', 0.25);
        break;

      case 'boss':
        [110, 90, 70].forEach((f, i) => this._tone(f, 0.25, 'sawtooth', 0.5, i * 0.1));
        break;

      default:
        this._tone(440, 0.05, 'sine', 0.2);
    }
  },

  /** Simple looping BGM (generated, not from URL) */
  _bgmInterval: null,

  /**
   * Play BGM. Checks for custom bgm under the given sceneKey first.
   * @param {string} [url]       — optional HTTP/HTTPS URL
   * @param {string} [sceneKey]  — 'menu' | 'battle' | 'dungeon'
   */
  playBGM(url, sceneKey) {
    this.stopBGM();

    // Check custom BGM for scene
    const customKey = sceneKey ? `bgm_${sceneKey}` : null;
    if (customKey && this._customBGM[customKey]) {
      const a = this._customBGM[customKey];
      a.currentTime = 0;
      a.play().catch(() => {});
      this._activeBGMAudio = a;
      return;
    }

    // HTTP URL provided
    if (url && !url.startsWith('file:')) {
      this._playBGMFromURL(url);
      return;
    }

    // Generated ambient loop
    this._startGeneratedBGM();
  },

  _playBGMFromURL(url) {
    const ctx = this._getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const audio = new Audio(url);
    audio.loop   = true;
    audio.volume = 0.25;
    audio.play().catch(() => {});
    this._activeBGMAudio = audio;
  },

  _startGeneratedBGM() {
    if (this._bgmInterval) return;
    const notes = [220, 246, 261, 293, 329, 293, 261, 246];
    let i = 0;
    const play = () => {
      if (!this._muted) {
        const ctx = this._getCtx();
        if (ctx && ctx.state === 'suspended') ctx.resume();
        this._tone(notes[i % notes.length], 0.5, 'sine', 0.08);
      }
      i++;
    };
    play();
    this._bgmInterval = setInterval(play, 600);
  },

  stopBGM() {
    if (this._bgmInterval) {
      clearInterval(this._bgmInterval);
      this._bgmInterval = null;
    }
    if (this._activeBGMAudio) {
      this._activeBGMAudio.pause();
      this._activeBGMAudio = null;
    }
  },

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted && this._activeBGMAudio) this._activeBGMAudio.pause();
    else if (!this._muted && this._activeBGMAudio) this._activeBGMAudio.play().catch(() => {});
    return this._muted;
  }
};
