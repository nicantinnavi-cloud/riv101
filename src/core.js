'use strict';
// Riv101 : utilitaires, sauvegarde locale et sons.
const R = window.R = {};
R.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
R.lerp = (a, b, t) => a + (b - a) * t;
// Fonctionne aussi avec a > b (rampe descendante).
R.sstep = (a, b, x) => { const t = R.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
R.hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
R.$ = (s, el) => (el || document).querySelector(s);
R.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
R.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

R.save = {
  d: { stars: {}, done: {}, opts: { sound: 'normal', unlock: false, gfx: 'riche' } },
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('riv101') || 'null');
      if (s) { Object.assign(this.d.stars, s.stars); Object.assign(this.d.done, s.done); Object.assign(this.d.opts, s.opts); }
      // Ancienne sauvegarde : sound était vrai ou faux.
      const m = this.d.opts.sound;
      if (m === false) this.d.opts.sound = 'coupe'; else if (!R.SOUND[m]) this.d.opts.sound = 'normal';
      if (!R.GFX[this.d.opts.gfx]) this.d.opts.gfx = 'riche';
    } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
  },
  store() { try { localStorage.setItem('riv101', JSON.stringify(this.d)); } catch (e) { /* idem */ } },
  star(id, n) { if ((this.d.stars[id] || 0) < n) { this.d.stars[id] = n; this.store(); } },
  mark(id) { if (!this.d.done[id]) { this.d.done[id] = 1; this.store(); } }
};
// Étoiles par niveau d'eau : « id » en eau moyenne (comme avant), « id@bas » et « id@haut ».
R.starKey = (id, niv) => niv && niv !== 'moyen' ? id + '@' + niv : id;

// Réglage des graphiques : « riches » (eau animée, écume, ombres, détails de vie) ou « simples »
// (pour les appareils lents). R.gfx.rich() est lu à chaque image par le rendu.
R.GFX = { riche: { t: 'Graphiques : riches' }, simple: { t: 'Graphiques : simples' } };
R.gfx = {
  mode() { return R.GFX[R.save.d.opts.gfx] ? R.save.d.opts.gfx : 'riche'; },
  rich() { return this.mode() === 'riche'; },
  // auto : bascule décidée par le jeu (images trop lentes) ; un choix manuel coupe la détection.
  set(m, auto) { R.save.d.opts.gfx = R.GFX[m] ? m : 'riche'; if (!auto) R.save.d.opts.gfxManual = true; R.save.store(); },
  next() { const m = this.mode() === 'riche' ? 'simple' : 'riche'; this.set(m); return m; },
  reduced() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
};

// Réglages du son : gain général, effets, bruit de la rivière.
R.SOUND = { normal: { m: 1, fx: 1, riv: 1, t: 'Son : normal' }, doux: { m: 1, fx: 0.7, riv: 0.5, t: 'Son : doux' }, coupe: { m: 0, fx: 1, riv: 1, t: 'Son : coupé' } };
R.audio = {
  ctx: null, rv: 0,
  mode() { return R.SOUND[R.save.d.opts.sound] ? R.save.d.opts.sound : 'normal'; },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 4 + w * 0.15; }
      this.noise = buf;
      const S = R.SOUND[this.mode()];
      this.master = c.createGain(); this.master.gain.value = S.m; this.master.connect(c.destination);
      this.fx = c.createGain(); this.fx.gain.value = S.fx; this.fx.connect(this.master);
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      // Bruit de fond de la rivière : discret et sourd (un grondement plutôt qu'un souffle), sous les effets.
      this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 350;
      this.river = c.createGain(); this.river.gain.value = 0.012 * S.riv;
      src.connect(this.lp); this.lp.connect(this.river); this.river.connect(this.master); src.start();
    } catch (e) { this.ctx = null; }
  },
  setMode(m) {
    if (!R.SOUND[m]) m = 'normal';
    R.save.d.opts.sound = m; R.save.store();
    if (!this.ctx) return;
    const S = R.SOUND[m]; this.master.gain.value = S.m; this.fx.gain.value = S.fx; this.setRiver(this.rv, true);
  },
  nextMode() { const k = Object.keys(R.SOUND), m = k[(k.indexOf(this.mode()) + 1) % k.length]; this.setMode(m); return m; },
  riverGain(v) { return (0.012 + 0.10 * v) * R.SOUND[this.mode()].riv; },
  setRiver(v, now) {
    this.rv = v; if (!this.ctx) return; const t = this.ctx.currentTime, g = this.riverGain(v);
    if (now) { this.river.gain.cancelScheduledValues(t); this.river.gain.value = g; } else this.river.gain.setTargetAtTime(g, t, 0.3);
    this.lp.frequency.setTargetAtTime(300 + 900 * v, t, 0.3);
  },
  tone(f, dur, type, vol, f2) {
    const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.fx); o.start(t); o.stop(t + dur + 0.02);
  },
  burst(dur, freq, vol) {
    const c = this.ctx; if (!c) return; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.fx); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  },
  sfx(n) {
    if (!this.ctx) return; const T = this;
    if (n === 'paddle') T.burst(0.22, 1400, 0.22);
    else if (n === 'bump') T.tone(110, 0.18, 'sine', 0.35, 60);
    else if (n === 'hit') { T.tone(90, 0.3, 'triangle', 0.5, 45); T.burst(0.2, 500, 0.3); }
    else if (n === 'ding') { T.tone(660, 0.14, 'sine', 0.22); setTimeout(() => T.tone(990, 0.25, 'sine', 0.22), 110); }
    else if (n === 'no') T.tone(220, 0.25, 'square', 0.07, 150);
    else if (n === 'win') [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => T.tone(f, 0.3, 'triangle', 0.22), i * 130));
    else if (n === 'fail') T.tone(330, 0.6, 'sawtooth', 0.1, 80);
    else if (n === 'splash') T.burst(0.6, 800, 0.5);
    else if (n === 'whoosh') T.burst(0.35, 2400, 0.2);
    else if (n === 'scrape') { T.burst(0.28, 3200, 0.12); T.tone(70, 0.22, 'sawtooth', 0.05, 55); }
    else if (n === 'bail') T.burst(0.3, 1100, 0.16);
  }
};
