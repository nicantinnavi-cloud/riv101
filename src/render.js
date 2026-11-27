(function () {
'use strict';
// Rendu canvas : rivière vue de haut, l'aval vers le haut de l'écran.
// Le fond (forêt, berges, falaises, carte de profondeur, sentier) vient des tuiles précalculées de
// render-bg.js ; l'eau qui bouge vient de render-water.js ; le canot et le nageur de render-boat.js.
// La translation de la caméra est arrondie au pixel : les tuiles sont recopiées sans rééchantillonnage.
const C = R.RB.C, RB = R.RB, RW = R.RW, RK = R.RK;
const A = {};

R.Renderer = function (canvas) {
  const ctx = canvas.getContext('2d');
  let W = 300, H = 150, dpr = 1, vig = null, lastT = null, ox = 0, oy = 0;
  const cam = { x: 0, y: 0, s: 10, anchor: 0.6 };
  // boatScale : le canot et le nageur sont dessinés un peu plus gros que leur taille physique,
  // pour rester bien visibles (la physique et les collisions n'en tiennent pas compte).
  const self = { cam, ctx, boatScale: 1.2 };
  const tiles = RB.Tiles(), sys = RW.Sys(), shake = { t: 0, d: 1, a: 0 };
  Object.defineProperty(self, 'W', { get: () => W });
  Object.defineProperty(self, 'H', { get: () => H });
  self.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect(); W = Math.max(50, r.width); H = Math.max(50, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); vig = null;
  };
  self.toWorld = (sx, sy) => ({ x: cam.x + (sx - W / 2) / cam.s, y: cam.y + (H * cam.anchor - sy) / cam.s });
  self.toScreen = (wx, wy) => ({ x: W / 2 + (wx - cam.x) * cam.s, y: H * cam.anchor - (wy - cam.y) * cam.s });
  // Nombre de tuiles en mémoire (pour les tests).
  Object.defineProperty(self, 'tiles', { get: () => tiles.size });
  self.freeTiles = () => tiles.reset();
  self.sys = sys; // particules et détails de vie (lecture pour les tests)

  // Effets d'un événement du jeu : choc contre une roche, chavirage.
  self.fx = function (e, b) {
    if (!b) return;
    const rich = R.gfx.rich(), still = R.gfx.reduced();
    if (e === 'hit' || e === 'bump' || e === 'ouch' || e === 'cravate') {
      const big = e !== 'bump';
      if (!still) { shake.t = shake.d = big ? 0.32 : 0.18; shake.a = big ? 7 : 3.5; }
      let best = null, bd = 1e9;
      for (const k of (self.rv && self.rv.rocks) || []) { const d = Math.hypot(k.x - b.x, k.y - b.y) - k.r; if (d < bd) { bd = d; best = k; } }
      let x = b.x, y = b.y;
      if (best && bd < 4) { const d = Math.hypot(b.x - best.x, b.y - best.y) || 1; x = best.x + (b.x - best.x) / d * (best.r + 0.2); y = best.y + (b.y - best.y) / d * (best.r + 0.2); }
      RW.ring(sys, x, y, 0.3, big ? 2.2 : 1.3, 0.6, 0.8);
      if (rich) for (let i = 0; i < (big ? 22 : 9); i++) { const a = Math.random() * 6.28, v = 1 + Math.random() * 2.5; RW.addFoam(sys, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.5 + Math.random() * 0.7, 0.1 + Math.random() * 0.12); }
    } else if (e === 'capsize' || e === 'swamp') {
      if (!still) { shake.t = shake.d = 0.4; shake.a = 5; }
      RW.ring(sys, b.x, b.y, 0.5, 3.6, 0.9, 0.9); RW.ring(sys, b.x, b.y, 0.3, 2.4, 0.7, 0.7);
      if (rich) for (let i = 0; i < 55; i++) { const a = Math.random() * 6.28, v = 1.5 + Math.random() * 3; RW.addFoam(sys, b.x + Math.cos(a) * 0.8, b.y + Math.sin(a) * 1.5, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 1.1, 0.12 + Math.random() * 0.14); }
    }
  };

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); }
  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function labels(list) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '800 13px Nunito, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (const l of list) {
      const p = self.toScreen(l.x, l.y); if (p.y < -30 || p.y > H + 40) continue;
      const w = ctx.measureText(l.text).width + 16, x = R.clamp(p.x - w / 2, 4, Math.max(4, W - w - 4)), y = l.below ? p.y + 10 : p.y - 34;
      ctx.fillStyle = 'rgba(0,20,26,.3)'; rr(x + 1.5, y + 2, w, 24, 8); ctx.fill();
      ctx.fillStyle = l.kind === 'danger' ? '#a8321f' : l.kind === 'hint' ? C.vfi : '#0b3a46';
      rr(x, y, w, 24, 8); ctx.fill();
      ctx.beginPath(); if (l.below) { ctx.moveTo(p.x - 5, y + 1); ctx.lineTo(p.x, y - 7); ctx.lineTo(p.x + 5, y + 1); } else { ctx.moveTo(p.x - 5, y + 23); ctx.lineTo(p.x, y + 31); ctx.lineTo(p.x + 5, y + 23); } ctx.fill();
      ctx.fillStyle = l.kind === 'hint' ? C.ink : '#fff'; ctx.fillText(l.text, x + 8, y + 12.5);
    }
  }

  // Bouée de porte : flotteur rond, bande blanche, reflet ; la porte active pulse.
  function buoy(x, y, act, t, rich) {
    const r = 0.75 + (act ? 0.1 * Math.sin(t * 5) : 0);
    if (rich) { ctx.fillStyle = 'rgba(0,25,35,.3)'; circle(x + 0.3, y - 0.25, r); ctx.fill(); }
    ctx.strokeStyle = 'rgba(242,251,248,.55)'; ctx.lineWidth = 0.12; circle(x, y, r + 0.35); ctx.stroke();
    if (act) { ctx.strokeStyle = 'rgba(255,182,41,' + (0.45 + 0.35 * Math.sin(t * 5)).toFixed(2) + ')'; ctx.lineWidth = 0.18; circle(x, y, r + 0.75 + 0.2 * Math.sin(t * 5)); ctx.stroke(); }
    ctx.fillStyle = act ? C.vfi : 'rgba(255,255,255,.45)'; circle(x, y, r); ctx.fill();
    ctx.strokeStyle = act ? 'rgba(110,60,0,.7)' : 'rgba(0,30,40,.3)'; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.strokeStyle = act ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.14; circle(x, y, r * 0.55); ctx.stroke();
    ctx.fillStyle = '#fff'; circle(x - 0.2, y + 0.2, 0.17); ctx.fill();
  }

  self.draw = function (rv, st) {
    self.rv = rv;
    const s = cam.s, t = st.t || 0, rich = R.gfx.rich(), reduced = R.gfx.reduced(), S = s * dpr;
    let dt = lastT == null ? 0 : t - lastT; lastT = t; if (!(dt >= 0 && dt < 0.1)) dt = 0;
    // secousse brève de la caméra après un choc
    let sx = 0, sy = 0;
    if (shake.t > 0) { shake.t -= dt; const k = Math.max(0, shake.t / shake.d) * shake.a * dpr; sx = Math.sin(t * 71) * k; sy = Math.cos(t * 53) * k * 0.7; }
    const cw = canvas.width, ch = canvas.height;
    ox = Math.round(dpr * W / 2 - cam.x * S + sx); oy = Math.round(dpr * H * cam.anchor + cam.y * S + sy);
    // Fond : tuiles visibles (peintes au besoin), puis une tuile de plus vers l'aval ou l'amont par image.
    const T = RB.TILE, i0 = Math.floor(-ox / T), i1 = Math.floor((cw - 1 - ox) / T), j0 = Math.floor(-oy / T), j1 = Math.floor((ch - 1 - oy) / T);
    tiles.max = (i1 - i0 + 1) * (j1 - j0 + 3) + 4;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) ctx.drawImage(tiles.get(rv, S, rich, i, j, true), i * T + ox, j * T + oy);
    if (!st.still) {
      let done = false;
      for (const j of [j0 - 1, j1 + 1]) for (let i = i0; i <= i1 && !done; i++) if (!tiles.has(i, j)) { tiles.get(rv, S, rich, i, j, true); done = true; }
    }
    ctx.setTransform(S, 0, 0, -S, ox, oy);
    const y0 = (oy - ch) / S - 4, y1 = oy / S + 4, x0 = -ox / S, x1 = (cw - ox) / S;
    const v = { x0, x1, y0, y1 }, vis = (y, m) => y > y0 - m && y < y1 + m;
    // L'eau qui bouge.
    if (st.warm) { for (let i = 0; i < st.warm * 30; i++) RW.step(sys, rv, v, 1 / 30, rich, true, t - st.warm + i / 30); }
    RW.step(sys, rv, v, dt, rich, reduced, t);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (rich) RW.drawRides(ctx, sys);
    RW.drawEddyLines(ctx, rv, v, t, rich, reduced);
    RW.drawVs(ctx, rv, v, t, rich, reduced);
    RW.drawWaves(ctx, rv, v, t, reduced);
    RW.drawHoles(ctx, rv, v, t, reduced);
    RW.drawSeuil(ctx, rv, v, t, reduced);
    RW.drawFilets(ctx, st.parts || [], rich);
    if (st.lines) {
      ctx.strokeStyle = 'rgba(235,250,248,.6)'; ctx.fillStyle = 'rgba(235,250,248,.75)'; ctx.lineWidth = 0.2;
      for (const l of st.lines) {
        ctx.beginPath(); ctx.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]); ctx.stroke();
        const n = l.length, ex = l[n - 2], ey = l[n - 1], dx = ex - l[n - 4], dy = ey - l[n - 3], d = Math.hypot(dx, dy);
        if (d > 0.12) { const ux = dx / d, uy = dy / d; ctx.beginPath(); ctx.moveTo(ex + ux * 0.6, ey + uy * 0.6); ctx.lineTo(ex - uy * 0.4, ey + ux * 0.4); ctx.lineTo(ex + uy * 0.4, ey - ux * 0.4); ctx.closePath(); ctx.fill(); }
      }
    }
    RW.drawFoam(ctx, sys);
    RW.drawRockWash(ctx, rv, v, t, reduced);
    RW.drawCliffShadows(ctx, rv, v, rich);

    // Zone de portage (bande d'arrêt sur la bonne rive).
    if (rv.portage && vis((rv.portage.y0 + rv.portage.y1) / 2, 40)) {
      const z = rv.portage; ctx.fillStyle = 'rgba(255,182,41,.28)'; ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.3; ctx.setLineDash([1.2, 0.9]);
      ctx.beginPath();
      for (let y = z.y0; y <= z.y1; y += 2) { rv.at(y, A); const x = z.side === 'L' ? A.cx - A.hw : A.cx + A.hw; if (y === z.y0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      for (let y = z.y1; y >= z.y0; y -= 2) { rv.at(y, A); ctx.lineTo(z.side === 'L' ? A.cx - A.hw + 8 : A.cx + A.hw - 8, y); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }
    // Roches (sprites précalculés, recopiés au pixel près).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const k of rv.rocks) {
      if (!vis(k.y, k.r + 3)) continue;
      const sp = RB.rockSprite(k, S, rich);
      ctx.drawImage(sp.cv, Math.round(k.x * S + ox - sp.o), Math.round(-k.y * S + oy - sp.o));
    }
    ctx.setTransform(S, 0, 0, -S, ox, oy);
    RW.drawStrainers(ctx, rv, v, rich, t);
    if (rich) RW.drawLife(ctx, { leaves: sys.leaves, beaver: sys.beaver, birds: [] }, t);

    // Repères d'objectifs.
    let limLab = null;
    for (const m of st.marks || []) {
      const col = m.active ? C.vfi : 'rgba(255,255,255,.4)';
      if (m.t === 'gate') {
        if (m.active) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 0.2; ctx.setLineDash([0.8, 0.8]); line(m.x - m.w / 2, m.y, m.x + m.w / 2, m.y); ctx.setLineDash([]); }
        for (let sd = -1; sd <= 1; sd += 2) buoy(m.x + sd * m.w / 2, m.y, m.active, t, rich);
      } else if (m.t === 'finish') {
        rv.at(m.y, A);
        if (rich) { ctx.fillStyle = 'rgba(0,25,35,.25)'; ctx.fillRect(A.cx - A.hw + 0.4, m.y - 0.4, A.hw * 2, 3); }
        for (let i = 0; i < A.hw * 2 / 1.5; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(A.cx - A.hw + i * 1.5, m.y + j * 1.5, Math.min(1.5, A.cx + A.hw - (A.cx - A.hw + i * 1.5)), 1.5); }
        for (let sd = -1; sd <= 1; sd += 2) { ctx.fillStyle = '#5b3d22'; circle(A.cx + sd * (A.hw + 0.6), m.y + 1.5, 0.45); ctx.fill(); ctx.fillStyle = C.canot; circle(A.cx + sd * (A.hw + 0.6), m.y + 1.5, 0.25); ctx.fill(); }
      } else if (m.t !== 'portage') {
        if (m.active) { ctx.fillStyle = 'rgba(255,182,41,.1)'; circle(m.x, m.y, m.r); ctx.fill(); }
        ctx.strokeStyle = 'rgba(0,30,40,.25)'; ctx.lineWidth = 0.5; circle(m.x, m.y, m.r); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 0.35; ctx.setLineDash([1.3, 1]); ctx.lineDashOffset = reduced ? 0 : -t * 1.5; circle(m.x, m.y, m.r); ctx.stroke(); ctx.setLineDash([]);
        // Aide à la lecture (niveaux avec aide) : un trait pointillé discret longe la roche du côté de l'approche
        // et entre dans le haut du contre-courant, juste derrière elle : c'est là qu'on tourne.
        if (m.active && m.entry && !(st.hold > 0)) {
          const q = m.entry, b = st.boat, c = rv.cxAt(q.y), sd = q.bank ? (c > q.x ? 1 : -1) : (b && b.x < q.x ? -1 : 1), R0 = q.r + 1.1;
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.22; ctx.setLineDash([0.55, 0.55]); ctx.lineDashOffset = reduced ? 0 : -t * 0.8;
          ctx.beginPath();
          for (let i = 0; i <= 12; i++) { const a = -0.35 + 1.55 * i / 12, x = q.x + sd * R0 * Math.cos(a), y = q.y + R0 * Math.sin(a); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.stroke(); ctx.setLineDash([]);
          // Pointe de flèche au bout, tournée vers le contre-courant.
          const a1 = 1.2, ex = q.x + sd * R0 * Math.cos(a1), ey = q.y + R0 * Math.sin(a1), tx0 = -sd * Math.sin(a1), ty0 = Math.cos(a1);
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath();
          ctx.moveTo(ex + tx0 * 0.7, ey + ty0 * 0.7); ctx.lineTo(ex - tx0 * 0.2 + ty0 * 0.4, ey - ty0 * 0.2 - tx0 * 0.4); ctx.lineTo(ex - tx0 * 0.2 - ty0 * 0.4, ey - ty0 * 0.2 + tx0 * 0.4); ctx.closePath(); ctx.fill();
        }
        if (m.active && st.hold > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832 * Math.min(1, st.hold)); ctx.stroke(); }
        if (m.active && m.limit) { rv.at(m.limit, A); ctx.strokeStyle = 'rgba(212,67,47,.95)'; ctx.lineWidth = 0.38; ctx.setLineDash([1.5, 1.2]); line(A.cx - A.hw, m.limit, A.cx + A.hw, m.limit); ctx.setLineDash([]);
          for (let sd = -1; sd <= 1; sd += 2) { ctx.fillStyle = '#d4432f'; circle(A.cx + sd * (A.hw - 0.6), m.limit, 0.45); ctx.fill(); ctx.fillStyle = '#fff'; circle(A.cx + sd * (A.hw - 0.6) - 0.12, m.limit + 0.12, 0.12); ctx.fill(); }
          // Étiquette du côté opposé au cercle visé, sous la ligne à l'écran (la ligne arrive par le haut, sous la carte de consigne) ;
          // au milieu si le canot est juste à côté.
          const sd = m.x >= A.cx ? -1 : 1, b = st.boat;
          let lx = A.cx + sd * A.hw * 0.55;
          if (b && Math.abs(b.x - lx) < 5 && Math.abs(b.y - m.limit) < 8) lx = A.cx;
          limLab = { x: lx, y: m.limit, text: 'Limite du bac', kind: 'danger', below: true };
        }
      }
    }
    // Atelier du sac à corde.
    const swimO = { scale: self.boatScale, rich };
    if (st.rope) {
      const r = st.rope;
      if (r.fly && r.sw && (r.fly.p < 1 || r.bag || r.sw.saved)) {
        const p = Math.min(1, r.fly.p), g = r.bag, sv = r.sw.saved;
        const ex = sv ? r.sw.x : g ? g.x : r.tx + (r.fly.x - r.tx) * p, ey = sv ? r.sw.y : g ? g.y : r.ty + (r.fly.y - r.ty) * p;
        ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.2;
        if (g && !sv) { // corde posée sur l'eau : légèrement creusée vers l'aval par le courant
          const sag = Math.min(1.5, 0.08 * Math.hypot(ex - r.tx, ey - r.ty));
          ctx.beginPath(); ctx.moveTo(r.tx, r.ty); ctx.quadraticCurveTo((r.tx + ex) / 2, (r.ty + ey) / 2 + sag, ex, ey); ctx.stroke();
        } else line(r.tx, r.ty, ex, ey);
        if (!sv) { ctx.fillStyle = C.canot; circle(ex, ey, 0.45); ctx.fill(); }
      }
      for (const p of r.past || []) {
        if (p.saved) { ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.2; line(r.tx, r.ty, p.x, p.y); }
        ctx.globalAlpha = Math.max(0, Math.min(1, 4 - p.t)); RK.drawSwim(ctx, { x: p.x, y: p.y, active: false, sth: 0 }, t, swimO); ctx.globalAlpha = 1;
      }
      if (r.sw) RK.drawSwim(ctx, { x: r.sw.x, y: r.sw.y, active: false, sth: 0 }, t, swimO);
      if (rich) { ctx.fillStyle = 'rgba(0,25,35,.3)'; ctx.beginPath(); ctx.ellipse(r.tx + 0.3, r.ty - 0.25, 0.6, 0.42, 0, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = C.vfi; ctx.beginPath(); ctx.ellipse(r.tx, r.ty, 0.6, 0.42, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#3fa7d6'; circle(r.tx, r.ty, 0.3); ctx.fill();
    }
    if (st.boat) {
      if (st.boat.mode === 'swim') RK.drawSwim(ctx, st.boat, t, swimO);
      else RK.drawCanoe(ctx, st.boat, st.inp, t, dt, { scale: self.boatScale, rich, sys: st.still ? null : sys, rv });
    }
    if (rich) RW.drawLife(ctx, { leaves: [], beaver: null, birds: sys.birds }, t);

    // Léger vignettage (mode riche).
    if (rich && !st.still) {
      if (!vig || vig.width !== cw || vig.height !== ch) {
        vig = document.createElement('canvas'); vig.width = cw; vig.height = ch;
        const g = vig.getContext('2d'), gr = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.55);
        gr.addColorStop(0, 'rgba(4,20,24,0)'); gr.addColorStop(1, 'rgba(4,20,24,.32)'); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vig, 0, 0);
    }
    const ls = (st.labels || []).slice(); if (limLab) ls.push(limLab);
    if (rv.portage && st.showSigns !== false) { const p = RB.trail(rv, rv.portage), n = p.length; ls.push({ x: p[2], y: p[3], text: 'Portage', kind: 'hint' }, { x: p[n - 4], y: p[n - 3], text: 'Portage', kind: 'hint' }); }
    labels(ls);
  };
  return self;
};

// Image fixe pour le lexique : la rivière avec des flèches de courant.
R.still = function (cv, sc) {
  const rv = R.buildRiver(Object.assign({ len: 60, path: [[0, 0, 12, 1.8], [60, 0, 12, 1.8]] }, sc.def), sc.def && sc.def.niveau);
  const rd = R.Renderer(cv); rd.resize(); rd.boatScale = 1; // taille réelle dans les scènes du lexique
  const c = rd.cam; c.s = rd.H / (sc.span || 34); c.anchor = 0.5; c.y = sc.y || 28; c.x = rv.cxAt(c.y);
  const lines = [], U = {};
  for (let y = c.y - 20; y < c.y + 20; y += 4.5) for (let o = -0.9; o <= 0.91; o += 0.3) {
    let x = rv.cxAt(y) + o * rv.hwAt(y) + (R.hash(y * 7 + o * 31) - 0.5) * 2, yy = y + (R.hash(y * 3 + o * 17) - 0.5) * 3;
    const pts = [x, yy];
    for (let i = 0; i < 7; i++) { rv.flow(x, yy, U); if (U.land) break; x += U.x * 0.3; yy += U.y * 0.3; pts.push(x, yy); }
    if (pts.length > 4) lines.push(pts);
  }
  const boat = sc.boat ? R.sim.newBoat(sc.boat[0], sc.boat[1], sc.boat[2] * Math.PI / 180) : null;
  rd.draw(rv, { t: 1.3, still: true, warm: 2.5, parts: [], lines, marks: [], boat, inp: {}, showSigns: false, labels: (sc.labels || []).map(l => ({ x: rv.cxAt(l[1]) + l[0], y: l[1], text: l[2], kind: l[3] || 'ok' })) });
  rd.freeTiles();
};
})();
