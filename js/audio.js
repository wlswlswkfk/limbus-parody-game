/**
 * audio.js — AudioManager using Web Audio API
 * Generates simple tones/sounds since no external audio assets are used.
 */

const AudioManager = {
  _ctx: null,
  _bgmSource: null,
  _bgmGain: null,
  _sfxGain: null,
  _muted: false,

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
   * Play a sound effect by type.
   * @param {'coin'|'hit'|'victory'|'defeat'|'navigate'|'heal'|'select'} type
   */
  playSFX(type) {
    const ctx = this._getCtx();
    if (!ctx || this._muted) return;

    // Resume if suspended (required by browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();

    switch (type) {
      case 'coin':
        // Short metallic ping
        this._tone(880,  0.08, 'sine',   0.5);
        this._tone(1320, 0.06, 'sine',   0.3, 0.05);
        break;

      case 'coin_heads':
        // Higher ping = success
        this._tone(660,  0.06, 'sine',   0.4);
        this._tone(990,  0.08, 'sine',   0.5, 0.06);
        this._tone(1320, 0.1,  'sine',   0.4, 0.12);
        break;

      case 'coin_tails':
        // Lower thud = failure
        this._tone(220, 0.12, 'sawtooth', 0.3);
        this._tone(110, 0.15, 'square',   0.2, 0.08);
        break;

      case 'hit':
        // Impact sound
        this._tone(150, 0.05, 'sawtooth', 0.6);
        this._tone(80,  0.1,  'square',   0.4, 0.04);
        break;

      case 'victory':
        // Short fanfare
        [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.18, 'sine', 0.4, i * 0.12));
        break;

      case 'defeat':
        // Descending tones
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
  _bgmNoteIndex: 0,

  playBGM(url) {
    // If URL provided and not file://, attempt to load audio file
    if (url && !url.startsWith('file:')) {
      this._playBGMFromURL(url);
      return;
    }
    // Otherwise generate a simple ambient loop
    this._startGeneratedBGM();
  },

  _playBGMFromURL(url) {
    const ctx = this._getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.25;
    audio.play().catch(() => {});
    this._bgmAudio = audio;
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
    if (this._bgmAudio) {
      this._bgmAudio.pause();
      this._bgmAudio = null;
    }
  },

  toggleMute() {
    this._muted = !this._muted;
    return this._muted;
  }
};
