/**
 * ============================================================
 *  SOUND.JS — OFL Synthesized Audio Engine
 *  Exposes: window.OFL.sound.play(key)
 *           window.OFL.sound.setMuted(bool)
 *           window.OFL.sound.isMuted()
 *           window.OFL.sound.init(config)   ← called by menu.js
 * ============================================================
 *
 *  All sounds are synthesized via the Web Audio API — no files.
 *  Config lives in SITE_CONFIG.sound:
 *
 *  sound: {
 *    enabled:  true,          // master on/off (admin default)
 *    volume:   0.7,           // 0–1
 *    cardFlip:      { enabled: true, style: 'whoosh' },
 *    modalOpen:     { enabled: true, style: 'chime'  },
 *    filterSwitch:  { enabled: true, style: 'click'  },
 *    championReveal:{ enabled: true, style: 'shimmer'},
 *  }
 *
 *  Style options: 'whoosh' | 'swoosh' | 'click' | 'chime' | 'thud' | 'shimmer'
 * ============================================================
 */
(function () {
  'use strict';

  // ── Namespace ────────────────────────────────────────────
  window.OFL = window.OFL || {};

  // ── Internal state ───────────────────────────────────────
  var _ctx    = null;   // AudioContext, lazy-created on first play
  var _cfg    = null;   // sound config block from SITE_CONFIG
  var _muted  = false;  // session mute state
  var _STORAGE_KEY = 'ofl_sound_muted';

  // ── AudioContext (lazy) ──────────────────────────────────
  function getCtx() {
    if (_ctx) return _ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    } catch (e) { return null; }
    return _ctx;
  }

  // Resume context if suspended (autoplay policy)
  function resumeCtx(ctx, cb) {
    if (ctx.state === 'suspended') {
      ctx.resume().then(cb).catch(function () {});
    } else {
      cb();
    }
  }

  // ── Master volume ────────────────────────────────────────
  function masterGain() {
    var vol = (_cfg && _cfg.volume != null) ? _cfg.volume : 0.7;
    return Math.max(0, Math.min(1, vol));
  }

  // ── Helpers ──────────────────────────────────────────────

  // Ramp a GainNode: from 0 → peak → 0 over attack + decay
  function envelope(ctx, gainNode, peak, attack, decay, offset) {
    var t = ctx.currentTime + (offset || 0);
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(peak, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return t + attack + decay + 0.05;
  }

  // Create an oscillator and connect it to a gain → dest, return the gain node
  function osc(ctx, type, freq, dest) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    o.connect(g);
    g.connect(dest);
    return { o: o, g: g };
  }

  // White noise buffer (0.5s)
  function noiseBuffer(ctx, dur) {
    dur = dur || 0.5;
    var sr     = ctx.sampleRate;
    var frames = Math.ceil(sr * dur);
    var buf    = ctx.createBuffer(1, frames, sr);
    var data   = buf.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Sound synthesizers ───────────────────────────────────

  var SYNTHS = {

    // Airy upward sweep — good for card flips
    whoosh: function (ctx, vol) {
      var dur    = 0.28;
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      // Noise layer
      var nb  = ctx.createBufferSource();
      nb.buffer = noiseBuffer(ctx, dur + 0.1);
      var nbf = ctx.createBiquadFilter();
      nbf.type = 'bandpass';
      nbf.frequency.setValueAtTime(800, ctx.currentTime);
      nbf.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + dur);
      nbf.Q.setValueAtTime(1.5, ctx.currentTime);
      var nbg = ctx.createGain();
      envelope(ctx, nbg, 0.55, 0.01, dur);
      nb.connect(nbf); nbf.connect(nbg); nbg.connect(master);
      nb.start(); nb.stop(ctx.currentTime + dur + 0.1);

      // Tonal sine sweep
      var pair = osc(ctx, 'sine', 220, master);
      pair.o.frequency.setValueAtTime(220, ctx.currentTime);
      pair.o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + dur);
      envelope(ctx, pair.g, 0.18, 0.01, dur - 0.02);
      pair.o.start(); pair.o.stop(ctx.currentTime + dur + 0.05);
    },

    // Deeper downward whoosh — variant for back-flip
    swoosh: function (ctx, vol) {
      var dur    = 0.32;
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      var nb  = ctx.createBufferSource();
      nb.buffer = noiseBuffer(ctx, dur + 0.1);
      var nbf = ctx.createBiquadFilter();
      nbf.type = 'bandpass';
      nbf.frequency.setValueAtTime(2400, ctx.currentTime);
      nbf.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + dur);
      nbf.Q.setValueAtTime(1.2, ctx.currentTime);
      var nbg = ctx.createGain();
      envelope(ctx, nbg, 0.5, 0.005, dur);
      nb.connect(nbf); nbf.connect(nbg); nbg.connect(master);
      nb.start(); nb.stop(ctx.currentTime + dur + 0.1);
    },

    // Crisp mechanical click — filters, UI interactions
    click: function (ctx, vol) {
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      // Transient thump
      var pair = osc(ctx, 'sine', 180, master);
      pair.o.frequency.setValueAtTime(180, ctx.currentTime);
      pair.o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
      envelope(ctx, pair.g, 0.7, 0.001, 0.04);
      pair.o.start(); pair.o.stop(ctx.currentTime + 0.08);

      // High tick
      var tick = osc(ctx, 'square', 2200, master);
      envelope(ctx, tick.g, 0.12, 0.001, 0.02);
      tick.o.start(); tick.o.stop(ctx.currentTime + 0.06);
    },

    // Bright tonal hit with decay — modal opens
    chime: function (ctx, vol) {
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      // Use a reverb-like tail via two slightly detuned partials
      [[523.25, 1.0], [659.25, 0.55], [783.99, 0.35]].forEach(function (p, i) {
        var pair = osc(ctx, 'sine', p[0], master);
        envelope(ctx, pair.g, p[1] * 0.28, 0.003, 0.55 + i * 0.1, i * 0.008);
        pair.o.start(ctx.currentTime + i * 0.008);
        pair.o.stop(ctx.currentTime + 0.9);
      });
    },

    // Low cinematic impact — champion reveal
    thud: function (ctx, vol) {
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      // Sub punch
      var sub = osc(ctx, 'sine', 60, master);
      sub.o.frequency.setValueAtTime(120, ctx.currentTime);
      sub.o.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18);
      envelope(ctx, sub.g, 0.95, 0.002, 0.22);
      sub.o.start(); sub.o.stop(ctx.currentTime + 0.35);

      // Noise thud body
      var nb  = ctx.createBufferSource();
      nb.buffer = noiseBuffer(ctx, 0.3);
      var nbf = ctx.createBiquadFilter();
      nbf.type = 'lowpass';
      nbf.frequency.setValueAtTime(400, ctx.currentTime);
      var nbg = ctx.createGain();
      envelope(ctx, nbg, 0.5, 0.002, 0.18);
      nb.connect(nbf); nbf.connect(nbg); nbg.connect(master);
      nb.start(); nb.stop(ctx.currentTime + 0.35);
    },

    // Glittery sparkle decay — champion reveal (celebratory)
    shimmer: function (ctx, vol) {
      var master = ctx.createGain();
      master.gain.setValueAtTime(vol, ctx.currentTime);
      master.connect(ctx.destination);

      // Rising tonal sweep
      var sweep = osc(ctx, 'sine', 440, master);
      sweep.o.frequency.setValueAtTime(440, ctx.currentTime);
      sweep.o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.4);
      envelope(ctx, sweep.g, 0.25, 0.01, 0.55);
      sweep.o.start(); sweep.o.stop(ctx.currentTime + 0.7);

      // Sparkle partials — staggered high-frequency pings
      var sparkFreqs = [2093, 2637, 3136, 3520, 4186];
      sparkFreqs.forEach(function (freq, i) {
        var delay = i * 0.055;
        var pair  = osc(ctx, 'sine', freq, master);
        envelope(ctx, pair.g, 0.12 - i * 0.018, 0.002, 0.3, delay);
        pair.o.start(ctx.currentTime + delay);
        pair.o.stop(ctx.currentTime + delay + 0.45);
      });

      // Sub thud on beat
      var sub = osc(ctx, 'sine', 80, master);
      sub.o.frequency.setValueAtTime(80, ctx.currentTime);
      sub.o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
      envelope(ctx, sub.g, 0.6, 0.001, 0.15);
      sub.o.start(); sub.o.stop(ctx.currentTime + 0.25);
    }
  };

  // ── Config defaults ──────────────────────────────────────
  var DEFAULTS = {
    cardFlip:       { enabled: true, style: 'whoosh'  },
    modalOpen:      { enabled: true, style: 'chime'   },
    filterSwitch:   { enabled: true, style: 'click'   },
    championReveal: { enabled: true, style: 'shimmer' }
  };

  // ── Core play function ───────────────────────────────────
  function play(key) {
    if (_muted) return;
    if (!_cfg || _cfg.enabled === false) return;

    var slotCfg  = _cfg[key] || DEFAULTS[key] || {};
    if (slotCfg.enabled === false) return;

    var style    = slotCfg.style || (DEFAULTS[key] && DEFAULTS[key].style) || 'click';
    var synth    = SYNTHS[style];
    if (!synth) return;

    var ctx = getCtx();
    if (!ctx) return;

    resumeCtx(ctx, function () {
      try { synth(ctx, masterGain()); } catch (e) { /* silent fail */ }
    });
  }

  // ── Mute management ─────────────────────────────────────
  function isMuted() { return _muted; }

  function setMuted(val) {
    _muted = !!val;
    try { sessionStorage.setItem(_STORAGE_KEY, _muted ? '1' : '0'); } catch (e) {}
    // Update all nav toggle buttons on the page
    document.querySelectorAll('.sound-toggle-btn').forEach(function (btn) {
      btn.setAttribute('aria-label', _muted ? 'Unmute sounds' : 'Mute sounds');
      btn.classList.toggle('is-muted', _muted);
    });
  }

  // Restore mute from sessionStorage
  function restoreMute() {
    try {
      var stored = sessionStorage.getItem(_STORAGE_KEY);
      if (stored !== null) _muted = stored === '1';
    } catch (e) {}
  }

  // ── Init — called by menu.js after SITE_CONFIG loads ────
  function init(config) {
    _cfg = (config && config.sound) || null;
    restoreMute();
    // If admin has sound disabled globally, honour it as default mute
    if (_cfg && _cfg.enabled === false && sessionStorage.getItem(_STORAGE_KEY) === null) {
      _muted = true;
    }
    injectNavToggle();
  }

  // ── Nav toggle button ────────────────────────────────────
  function injectNavToggle() {
    // Don't inject if sound is not configured at all
    // (still inject so users can unmute even if not configured)
    var topnav = document.querySelector('.topnav');
    if (!topnav) return;
    // Avoid double-injection
    if (topnav.querySelector('.sound-toggle-btn')) return;

    var btn = document.createElement('button');
    btn.className  = 'sound-toggle-btn';
    btn.setAttribute('aria-label', _muted ? 'Unmute sounds' : 'Mute sounds');
    btn.setAttribute('title', _muted ? 'Unmute sounds' : 'Mute sounds');
    btn.classList.toggle('is-muted', _muted);

    // SVG speaker icons (unmuted / muted)
    btn.innerHTML =
      '<svg class="sound-icon-on" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
        '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
      '</svg>' +
      '<svg class="sound-icon-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
        '<line x1="23" y1="9" x2="17" y2="15"/>' +
        '<line x1="17" y1="9" x2="23" y2="15"/>' +
      '</svg>';

    btn.addEventListener('click', function () {
      setMuted(!_muted);
      // Resume AudioContext on first user interaction
      var ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
      if (!_muted) play('click'); // audible confirmation on unmute
    });

    // Insert between logo and hamburger
    var trigger = topnav.querySelector('.menu-trigger');
    if (trigger) {
      topnav.insertBefore(btn, trigger);
    } else {
      topnav.appendChild(btn);
    }
  }

  // ── Expose public API ────────────────────────────────────
  window.OFL.sound = {
    play:     play,
    setMuted: setMuted,
    isMuted:  isMuted,
    init:     init
  };

})();
