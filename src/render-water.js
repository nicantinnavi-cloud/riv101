(function () {
'use strict';
// Rendu, partie 2 : l'eau qui bouge. Rides de surface et écume (particules qui suivent le courant),
// tourbillons de la ligne de cisaillement, langues lisses des V aval, crêtes de vagues, rouleaux,
// seuil, filets de courant, sillage des roches, détails de vie (feuilles, oiseaux, castor).
// Tout est dessiné dans le repère de la rivière (mètres) ; la vue v donne la zone visible.
const RW = R.RW = {};
const U = {}, A = {};
const FOAM = 'rgba(244,252,250,';

RW.Sys = function () {
  return { foam: [], rides: [], leaves: [], rings: [], birds: [], beaver: null, nextBird: 6 + Math.random() * 10, nextBeaver: 4, acc: 0 };
};
function inView(v, x, y, m) { return x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m; }

// ---------- Écume ----------
const MAXF = 650;
function addFoam(sys, x, y, vx, vy, life, r) {
  if (sys.foam.length >= MAXF) return;
  sys.foam.push({ x, y, vx: vx || 0, vy: vy || 0, life, l0: life, r: r || 0.16, ux: 0, uy: 0 });
}
RW.addFoam = addFoam;
RW.ring = function (sys, x, y, r0, r1, dur, a) { if (sys.rings.length < 24) sys.rings.push({ x, y, r0, r1, dur, t: 0, a: a || 0.7 }); };
// Nombre de particules à créer pour un débit (par seconde) pendant dt.
function count(rate, dt) { const n = rate * dt; return Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); }

function spawnFoam(sys, rv, v, dt) {
  // Coussins : l'eau s'empile en amont des roches.
  for (const k of rv.rocks) {
    if (!inView(v, k.x, k.y, 12)) continue;
    rv.flow(k.x, k.y - k.r - 0.6, U); if (U.land) continue;
    const sp = Math.hypot(U.x, U.y), n = count(3.2 * sp * Math.min(k.r, 3), dt);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.3, rr = k.r + 0.15 + Math.random() * 0.4, x = k.x + Math.cos(a) * rr, y = k.y + Math.sin(a) * rr;
      rv.flow(x, y, U); if (U.land) continue;
      addFoam(sys, x, y, Math.cos(a) * 0.7, Math.sin(a) * 0.3, 1 + Math.random() * 1.6, 0.11 + Math.random() * 0.1);
    }
  }
  // Rouleaux : l'écume bouillonne et revient vers l'amont (rappel), puis s'échappe en traînées.
  for (const h of rv.holes) {
    if (!inView(v, h.x, h.y, 10)) continue;
    const n = count(9 * h.w * h.k, dt);
    for (let i = 0; i < n; i++) addFoam(sys, h.x + (Math.random() - 0.5) * h.w * 0.95, h.y + Math.random() * 2.2, (Math.random() - 0.5) * 0.8, 0, 0.8 + Math.random() * 1.5, 0.14 + Math.random() * 0.14);
    // ce qui s'échappe du rouleau part en traînées vers l'aval
    const n2 = count(2.2 * h.w * h.k, dt);
    for (let i = 0; i < n2; i++) addFoam(sys, h.x + (Math.random() - 0.5) * h.w * 0.9, h.y + h.len + Math.random(), 0, 0.3, 1.8 + Math.random() * 2, 0.1 + Math.random() * 0.1);
  }
  // Pied du seuil.
  if (rv.seuil && inView(v, rv.cxAt(rv.seuil.y), rv.seuil.y, 12)) {
    const sy = rv.seuil.y; rv.at(sy, A); const n = count(2.4 * A.hw * 2, dt);
    for (let i = 0; i < n; i++) addFoam(sys, A.cx + (Math.random() * 2 - 1) * A.hw * 0.97, sy + 0.4 + Math.random() * 3, 0, 0.4, 1 + Math.random() * 2.4, 0.12 + Math.random() * 0.14);
  }
  // Crêtes des vagues : moutons d'écume.
  for (const w of rv.waves) {
    if (!inView(v, w.x, w.y + w.len / 2, w.len / 2 + 6)) continue;
    for (let i = 0; i * 3 < w.len; i++) {
      const ww = w.w / 2 * (1 - 0.35 * i * 3 / w.len), n = count(2.2 * w.k, dt);
      for (let j = 0; j < n; j++) addFoam(sys, w.x + (Math.random() - 0.5) * ww * 1.1, w.y + i * 3 + 0.1, 0, 0, 0.6 + Math.random() * 0.9, 0.1 + Math.random() * 0.1);
    }
  }
  // Passoires : l'eau s'accumule contre les branches.
  for (const q of rv.strainers) {
    if (!inView(v, q.x0, q.y0, 14)) continue;
    const n = count(5, dt);
    for (let i = 0; i < n; i++) { const f = 0.15 + Math.random() * 0.85; addFoam(sys, q.x0 + (q.x1 - q.x0) * f, q.y0 + (q.y1 - q.y0) * f - 0.5, 0, 0, 0.8 + Math.random(), 0.1 + Math.random() * 0.08); }
  }
  // Bas des V aval : petites vagues qui se referment.
  for (const q of rv.vs) {
    if (!inView(v, q.x, q.y, 10)) continue;
    const n = count(3, dt);
    for (let i = 0; i < n; i++) addFoam(sys, q.x + (Math.random() - 0.5) * 3, q.y + 1.5 + Math.random() * 5, 0, 0, 0.6 + Math.random() * 0.6, 0.08 + Math.random() * 0.08);
  }
  // Roches à fleur d'eau (eau moyenne) : un petit remous blanc trahit la roche.
  for (const b of rv.bars) {
    if (!b.low || !inView(v, b.x, b.y, 8)) continue;
    const n = count(1.6, dt);
    for (let i = 0; i < n; i++) addFoam(sys, b.x + (Math.random() - 0.5) * b.rx, b.y + b.ry * 0.3 + Math.random() * 0.6, 0, 0, 0.5 + Math.random() * 0.5, 0.07 + Math.random() * 0.06);
  }
}

// ---------- Mise à jour des particules ----------
RW.step = function (sys, rv, v, dt, rich, reduced, t) {
  // anneaux d'éclaboussure
  for (let i = sys.rings.length - 1; i >= 0; i--) { const r = sys.rings[i]; r.t += dt; if (r.t > r.dur) sys.rings.splice(i, 1); }
  if (!rich) { sys.foam.length = 0; sys.rides.length = 0; sys.leaves.length = 0; sys.birds.length = 0; sys.beaver = null; return; }
  if (dt <= 0) return;
  spawnFoam(sys, rv, v, dt);
  const F = sys.foam, ex = 3, dmp = Math.exp(-2.5 * dt);
  let n = 0;
  for (let i = 0; i < F.length; i++) {
    const p = F[i]; p.life -= dt;
    if (p.life <= 0 || !inView(v, p.x, p.y, 8)) continue;
    rv.flow(p.x, p.y, U); if (U.land || U.d < 0.02) continue;
    p.ux = U.x + p.vx; p.uy = U.y + p.vy; p.vx *= dmp; p.vy *= dmp;
    // petite agitation : l'écume tourbillonne
    const j = 0.35 * Math.hypot(U.x, U.y) + 0.15;
    p.x += (p.ux + (Math.random() - 0.5) * j) * dt; p.y += (p.uy + (Math.random() - 0.5) * j) * dt;
    F[n++] = p;
  }
  F.length = n;
  void ex;
  // Rides de surface : densité selon la surface d'eau visible.
  const area = (v.y1 - v.y0) * Math.min(v.x1 - v.x0, 2 * rv.hwAt((v.y0 + v.y1) / 2));
  const N = Math.min(380, Math.round(area * 0.2)), Rd = sys.rides;
  while (Rd.length < N) { const p = {}; spawnRide(p, rv, v); p.life *= Math.random(); Rd.push(p); }
  if (Rd.length > N) Rd.length = N;
  for (const p of Rd) {
    p.life -= dt;
    if (p.life <= 0 || !inView(v, p.x, p.y, 3)) { spawnRide(p, rv, v); continue; }
    rv.flow(p.x, p.y, U); if (U.land || U.d < 0.03) { spawnRide(p, rv, v); continue; }
    p.x += U.x * dt; p.y += U.y * dt; p.sp = Math.hypot(U.x, U.y);
    if (p.sp > 0.05) { p.ux = U.x / p.sp; p.uy = U.y / p.sp; }
  }
  // Détails de vie (pas d'animations d'ambiance si l'utilisateur préfère moins de mouvement).
  if (reduced) { sys.leaves.length = 0; sys.birds.length = 0; sys.beaver = null; return; }
  const L = sys.leaves;
  while (L.length < 5) { const p = { c: Math.floor(Math.random() * 3), a: Math.random() * 6.28, w: (Math.random() - 0.5) * 1.2 }; spawnRide(p, rv, v); p.life = 8 + Math.random() * 10; L.push(p); }
  for (const p of L) {
    p.life -= dt;
    if (p.life <= 0 || !inView(v, p.x, p.y, 4)) { spawnRide(p, rv, v); p.life = 8 + Math.random() * 10; continue; }
    rv.flow(p.x, p.y, U); if (U.land) { spawnRide(p, rv, v); continue; }
    p.x += U.x * dt; p.y += U.y * dt; p.a += p.w * dt;
  }
  sys.nextBird -= dt;
  if (sys.nextBird <= 0) {
    sys.nextBird = 22 + Math.random() * 25;
    const sd = Math.random() < 0.5 ? -1 : 1, y = v.y0 + (v.y1 - v.y0) * (0.2 + 0.6 * Math.random()), sp = 6 + Math.random() * 3;
    sys.birds.push({ x: sd < 0 ? v.x0 - 6 : v.x1 + 6, y, vx: -sd * sp, vy: (Math.random() - 0.3) * 2.5, gull: Math.random() < 0.5, ph: Math.random() * 6 });
  }
  for (let i = sys.birds.length - 1; i >= 0; i--) {
    const b = sys.birds[i]; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < v.x0 - 12 || b.x > v.x1 + 12) sys.birds.splice(i, 1);
  }
  // Castor, sur la Rivière aux Castors seulement : il longe la berge dans l'eau calme, puis plonge.
  if (rv.def && rv.def.id === 'r1') {
    const bv = sys.beaver;
    if (!bv) {
      sys.nextBeaver -= dt;
      if (sys.nextBeaver <= 0) {
        sys.nextBeaver = 18 + Math.random() * 14;
        const y = v.y0 + (v.y1 - v.y0) * (0.55 + 0.3 * Math.random()), sd = Math.random() < 0.5 ? -1 : 1; rv.at(y, A);
        const x = A.cx + sd * (A.hw - 1.6); rv.flow(x, y, U);
        if (!U.land && U.d > 0.25 && Math.hypot(U.x, U.y) < 1.2) sys.beaver = { x, y, t: 0, sd, dur: 7 };
      }
    } else {
      bv.t += dt; rv.flow(bv.x, bv.y, U);
      bv.x += U.x * 0.4 * dt; bv.y += (U.y * 0.4 - 0.55) * dt;
      if (bv.t > bv.dur) { RW.ring(sys, bv.x, bv.y, 0.3, 1.6, 1.2, 0.6); sys.beaver = null; }
    }
  }
};
function spawnRide(p, rv, v) {
  p.x = rv.cxAt((v.y0 + v.y1) / 2); p.y = (v.y0 + v.y1) / 2;
  for (let i = 0; i < 8; i++) {
    const y = v.y0 + Math.random() * (v.y1 - v.y0); rv.at(y, A);
    const x = A.cx + (Math.random() * 2 - 1) * A.hw * 0.96;
    if (x < v.x0 || x > v.x1) continue;
    p.x = x; p.y = y; break;
  }
  p.life = 1.6 + Math.random() * 2.4; p.l0 = p.life; p.s = 0.4 + Math.random() * 0.5; p.k = Math.random() < 0.55 ? 0 : 1; p.ux = 0; p.uy = 1; p.sp = 0;
}

// ---------- Dessin ----------
// Fondu d'entrée et de sortie d'une particule (0..1).
const fade = (p, a) => Math.min(1, (p.l0 - p.life) / a, p.life / a);

// Rides : petits croissants clairs et sombres, perpendiculaires au courant ; ils glissent avec l'eau.
RW.drawRides = function (c, sys) {
  const P = [[], [], []], Q = [[], [], []];
  for (const p of sys.rides) {
    const f = fade(p, 0.7); if (f <= 0.05) continue;
    (p.k ? Q : P)[f > 0.66 ? 2 : f > 0.33 ? 1 : 0].push(p);
  }
  c.lineCap = 'round';
  const draw = (L, col, al, lw) => {
    for (let b = 0; b < 3; b++) {
      if (!L[b].length) continue;
      c.beginPath();
      for (const p of L[b]) {
        const s = p.s * (0.9 + 0.3 * Math.min(p.sp, 3)), nx = -p.uy * s, ny = p.ux * s, bx = p.ux * s * 0.3, by = p.uy * s * 0.3;
        c.moveTo(p.x - nx, p.y - ny); c.quadraticCurveTo(p.x + bx, p.y + by, p.x + nx, p.y + ny);
      }
      c.strokeStyle = col + (al * (b + 1) / 3).toFixed(3) + ')'; c.lineWidth = lw; c.stroke();
    }
  };
  draw(Q, 'rgba(2,34,46,', 0.22, 0.1);
  draw(P, 'rgba(225,250,246,', 0.13, 0.06);
};

// Ligne de cisaillement : petits tourbillons qui descendent le long du contre-courant, et une couture d'écume.
RW.drawEddyLines = function (c, rv, v, t, rich, reduced) {
  const sw = new Path2D(), seam = new Path2D();
  for (const k of rv.rocks) {
    if (k.Le < 3 || !inView(v, k.x, k.y + k.Le / 2, k.Le / 2 + 4)) continue;
    rv.at(k.y + k.Le * 0.4, A);
    for (let sd = -1; sd <= 1; sd += 2) {
      // couture : le long de la limite du contre-courant
      let first = true;
      for (let f = 0.08; f <= 0.9; f += 0.06) {
        const y = k.y + f * k.Le, tt = f, x = k.x + sd * (k.w * (1 - tt * tt) + 0.2);
        rv.at(y, A); if (Math.abs(x - A.cx) > A.hw * 0.97) { first = true; continue; }
        if (first) seam.moveTo(x, y); else seam.lineTo(x, y); first = false;
      }
      const n = Math.max(1, Math.round(k.Le / 4.5)), ph = reduced ? 0 : (t * 0.55 / k.Le) % 1;
      for (let i = 0; i < n; i++) {
        const f = 0.08 + 0.8 * ((i + ph * n) / n % 1), y = k.y + f * k.Le, x = k.x + sd * (k.w * (1 - f * f) + 0.2);
        rv.at(y, A); if (Math.abs(x - A.cx) > A.hw * 0.95) continue;
        const s = Math.sin(f / 0.88 * Math.PI), rr = (0.25 + 0.3 * s) * Math.min(1.2, 0.5 + k.r / 3), a0 = (reduced ? 0 : -sd * t * 1.6) + i * 1.7;
        // un tourbillon : une spirale ouverte, pas un cercle
        for (let j = 0; j <= 8; j++) { const a = a0 + j * 0.42 * sd, r2 = rr * (1 - j * 0.07); const px = x + Math.cos(a) * r2, py = y + Math.sin(a) * r2; if (j) sw.lineTo(px, py); else sw.moveTo(px, py); }
      }
    }
  }
  c.lineCap = 'round';
  c.setLineDash([0.5, 0.7]); c.lineDashOffset = reduced ? 0 : -t * 0.7;
  c.strokeStyle = 'rgba(236,250,247,.3)'; c.lineWidth = 0.14; c.stroke(seam); c.setLineDash([]);
  c.strokeStyle = 'rgba(236,250,247,.38)'; c.lineWidth = 0.08; c.stroke(sw);
};

// V aval : langue d'eau lisse et brillante, bordée par deux coutures, avec des reflets qui glissent.
RW.drawVs = function (c, rv, v, t, rich, reduced) {
  for (const q of rv.vs) {
    if (!inView(v, q.x, q.y - 5, 14)) continue;
    const tri = () => { c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - 4, q.y - 11); c.lineTo(q.x + 4, q.y - 11); c.closePath(); };
    tri(); c.fillStyle = 'rgba(190,240,235,.2)'; c.fill();
    c.beginPath(); c.moveTo(q.x, q.y - 1); c.lineTo(q.x - 2.2, q.y - 10.5); c.lineTo(q.x + 2.2, q.y - 10.5); c.closePath(); c.fillStyle = 'rgba(230,252,248,.12)'; c.fill();
    // coutures du V
    c.strokeStyle = 'rgba(242,251,248,.42)'; c.lineWidth = 0.18; c.lineCap = 'round';
    c.beginPath(); c.moveTo(q.x - 4.3, q.y - 11.5); c.lineTo(q.x - 0.15, q.y - 0.3); c.moveTo(q.x + 4.3, q.y - 11.5); c.lineTo(q.x + 0.15, q.y - 0.3); c.stroke();
    // reflets qui glissent vers l'aval
    if (rich) {
      c.save(); tri(); c.clip(); c.lineWidth = 0.16;
      for (let i = 0; i < 4; i++) {
        const f = ((reduced ? 0.3 : t * 0.28) + i / 4) % 1, y = q.y - 11 + f * 10, hw = 4 * (1 - f) * 0.6, a = Math.sin(f * Math.PI) * 0.45;
        c.strokeStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; c.beginPath(); c.moveTo(q.x - hw, y - 0.2); c.quadraticCurveTo(q.x, y + 0.35, q.x + hw, y - 0.2); c.stroke();
      }
      c.restore();
    }
    c.strokeStyle = 'rgba(242,251,248,.55)'; c.lineWidth = 0.3;
    for (let i = 1; i <= 3; i++) { const yy = q.y + i * 2.3, w = 1 + i * 0.5; c.beginPath(); c.moveTo(q.x - w, yy - 0.4); c.quadraticCurveTo(q.x, yy + 0.6, q.x + w, yy - 0.4); c.stroke(); }
  }
};

// Trains de vagues : creux ombré côté amont, crête claire, dos éclairé côté aval.
RW.drawWaves = function (c, rv, v, t, reduced) {
  c.lineCap = 'round';
  const am = reduced ? 0.08 : 0.3;
  for (const w of rv.waves) {
    if (!inView(v, w.x, w.y + w.len / 2, w.len / 2 + 4)) continue;
    const cr = (i, dy) => { const yy = w.y + i * 3 + am * Math.sin(t * 2.5 + i) + dy, ww = w.w / 2 * (1 - 0.35 * i * 3 / w.len); c.moveTo(w.x - ww, yy - 0.6); c.quadraticCurveTo(w.x, yy + 0.9, w.x + ww, yy - 0.6); };
    const n = Math.ceil(w.len / 3);
    c.beginPath(); for (let i = 0; i < n; i++) cr(i, -0.75); c.strokeStyle = 'rgba(2,30,42,.36)'; c.lineWidth = 0.85; c.stroke();
    c.beginPath(); for (let i = 0; i < n; i++) cr(i, 0.6); c.strokeStyle = 'rgba(190,240,235,.24)'; c.lineWidth = 0.9; c.stroke();
    for (let i = 0; i < n; i++) {
      c.strokeStyle = 'rgba(242,251,248,' + (0.62 + 0.22 * Math.sin(t * 3 + i * 1.3)).toFixed(2) + ')'; c.lineWidth = 0.48;
      c.beginPath(); cr(i, 0); c.stroke();
    }
  }
};

// Rouleaux : bosse lisse en amont, chute sombre, bande d'écume qui bouillonne.
RW.drawHoles = function (c, rv, v, t, reduced) {
  const m = reduced ? 0.4 : 1;
  for (const h of rv.holes) {
    if (!inView(v, h.x, h.y, 8)) continue;
    c.fillStyle = 'rgba(175,232,228,.1)'; c.beginPath(); c.ellipse(h.x, h.y - 1.3, h.w / 2 + 0.3, 1.3, 0, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(225,250,246,.35)'; c.lineWidth = 0.14; c.beginPath(); c.ellipse(h.x, h.y - 1.1, h.w / 2 - 0.2, 0.9, 0, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.strokeStyle = 'rgba(3,30,40,.62)'; c.lineWidth = 0.65; c.lineCap = 'round'; c.beginPath(); c.moveTo(h.x - h.w / 2, h.y - 0.3); c.lineTo(h.x + h.w / 2, h.y - 0.3); c.stroke();
    c.fillStyle = 'rgba(236,248,246,.55)'; c.beginPath(); c.ellipse(h.x, h.y + 1.2, h.w / 2, 1.25, 0, 0, 6.2832); c.fill();
    const n = Math.max(3, Math.round(h.w / 1.1));
    c.fillStyle = 'rgba(244,252,250,.94)'; c.beginPath();
    for (let i = 0; i < n; i++) { const x = h.x - h.w / 2 + (i + 0.5) * h.w / n, px = x + 0.25 * m * Math.sin(t * 6 + i * 1.7), py = h.y + 1.1 + 0.4 * m * Math.sin(t * 4 + i), r = 0.8 + 0.2 * m * Math.sin(t * 5 + i * 2.3); c.moveTo(px + r, py); c.arc(px, py, r, 0, 6.2832); }
    c.fill();
    c.fillStyle = 'rgba(244,252,250,.5)'; c.beginPath();
    for (let i = 0; i < n; i++) { const x = h.x - h.w / 2 + (i + 0.5) * h.w / n, px = x + 0.3 * m * Math.cos(t * 5 + i), py = h.y + 2.5 + 0.3 * m * Math.sin(t * 3 + i * 2); c.moveTo(px + 0.6, py); c.arc(px, py, 0.6, 0, 6.2832); }
    c.fill();
    // l'eau revient vers l'amont : petites volutes
    c.strokeStyle = 'rgba(3,40,50,.35)'; c.lineWidth = 0.12; c.beginPath();
    for (let i = 0; i < n - 1; i++) { const x = h.x - h.w / 2 + (i + 1) * h.w / n, y = h.y + 0.9 + 0.2 * m * Math.sin(t * 4 + i); c.moveTo(x - 0.35, y + 0.3); c.quadraticCurveTo(x, y - 0.45, x + 0.35, y + 0.3); }
    c.stroke();
  }
};

// Seuil : ligne d'horizon nette, eau lisse avant la chute, rappel blanc au pied.
RW.drawSeuil = function (c, rv, v, t, reduced) {
  if (!rv.seuil || !inView(v, rv.cxAt(rv.seuil.y), rv.seuil.y, 12)) return;
  const sy = rv.seuil.y, m = reduced ? 0.4 : 1; rv.at(sy, A); const x0 = A.cx - A.hw, w = A.hw * 2;
  const gr = c.createLinearGradient(0, sy - 3.2, 0, sy); gr.addColorStop(0, 'rgba(190,240,235,0)'); gr.addColorStop(1, 'rgba(205,245,240,.38)');
  c.fillStyle = gr; c.fillRect(x0, sy - 3.2, w, 3.2);
  // écume du rappel : dense contre la chute, puis de plus en plus éparse vers l'aval
  const bg = c.createLinearGradient(0, sy, 0, sy + 5.5); bg.addColorStop(0, 'rgba(236,248,246,.75)'); bg.addColorStop(0.45, 'rgba(236,248,246,.35)'); bg.addColorStop(1, 'rgba(236,248,246,0)');
  c.fillStyle = bg; c.fillRect(x0, sy + 0.1, w, 5.4);
  c.lineCap = 'butt';
  c.strokeStyle = 'rgba(3,26,36,.78)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0, sy); c.lineTo(x0 + w, sy); c.stroke();
  c.strokeStyle = 'rgba(240,255,250,.75)'; c.lineWidth = 0.16; c.beginPath(); c.moveTo(x0, sy - 0.5); c.lineTo(x0 + w, sy - 0.5); c.stroke();
  const n = Math.ceil(w / 0.75), PF = [new Path2D(), new Path2D(), new Path2D()];
  for (let i = 0; i < n; i++) {
    const h = R.hash(i * 7.31 + sy), h2 = R.hash(i * 3.17 + sy * 2), dy = 0.9 + 4 * h2 * h2, lvl = dy < 1.8 ? 0 : dy < 3 ? 1 : 2;
    const r = (0.95 - 0.13 * dy) * (0.75 + 0.4 * h), px = x0 + (i + h) * w / n + 0.25 * m * Math.sin(t * (4 + 3 * h) + i), py = sy + dy + 0.3 * m * Math.sin(t * (2 + 2 * h2) + i * 1.9);
    if (px - r < x0 - 0.3 || px + r > x0 + w + 0.3) continue;
    PF[lvl].moveTo(px + r, py); PF[lvl].arc(px, py, r, 0, 6.2832);
  }
  c.fillStyle = 'rgba(244,252,250,.35)'; c.fill(PF[2]); c.fillStyle = 'rgba(244,252,250,.68)'; c.fill(PF[1]); c.fillStyle = 'rgba(246,253,251,.96)'; c.fill(PF[0]);
  // rappel : volutes qui montrent l'eau revenant vers la chute
  c.strokeStyle = 'rgba(3,40,50,.4)'; c.lineWidth = 0.13; c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i < n; i += 3) { const x = x0 + i * w / n + 1.2, y = sy + 1.6 + 0.25 * m * Math.sin(t * 3 + i); c.moveTo(x - 0.4, y + 0.35); c.quadraticCurveTo(x, y - 0.5, x + 0.4, y + 0.35); }
  c.stroke();
};

// Filets d'eau : direction et vitesse du courant. Plus longs et plus opaques là où l'eau va vite,
// extrémités effilées, apparition et disparition en douceur.
RW.drawFilets = function (c, parts, rich) {
  const B = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  for (const p of parts) {
    const dx = p.x - p.px, dy = p.y - p.py, l = Math.hypot(dx, dy); if (l < 0.01) continue;
    const sp = l / 0.32, f = p.l0 ? Math.min(1, (p.l0 - p.life) / 0.35, p.life / 0.45) : Math.min(1, p.life / 0.45);
    const q = Math.min(1, sp / 2.6), lvl = Math.min(3, Math.floor((0.35 + 0.65 * q) * Math.max(0, f) * 4));
    if (lvl < 0) continue;
    // queue allongée (x 1,6) : le filet reste lisible, et plus long dans le courant rapide
    const tx = p.x - dx * 1.6, ty = p.y - dy * 1.6, w = 0.045 + 0.04 * q, nx = -dy / l * w, ny = dx / l * w, mx = p.x - dx * 0.45, my = p.y - dy * 0.45, P = B[lvl];
    P.moveTo(tx, ty); P.lineTo(mx + nx, my + ny); P.lineTo(p.x, p.y); P.lineTo(mx - nx, my - ny); P.closePath();
  }
  const AL = [0.2, 0.38, 0.55, 0.72];
  for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(238,251,249,' + AL[i] + ')'; c.fill(B[i]); }
  void rich;
};

// Écume : traînées qui dérivent avec le courant et s'estompent.
RW.drawFoam = function (c, sys) {
  const B = [[], [], [], [], [], []];
  for (const p of sys.foam) { const f = fade(p, 0.25); B[(p.r > 0.17 ? 3 : 0) + (f > 0.66 ? 2 : f > 0.33 ? 1 : 0)].push(p); }
  c.lineCap = 'round';
  for (let b = 0; b < 6; b++) {
    if (!B[b].length) continue;
    c.beginPath();
    for (const p of B[b]) { c.moveTo(p.x - p.ux * 0.07, p.y - p.uy * 0.07); c.lineTo(p.x + 0.001, p.y); }
    c.strokeStyle = FOAM + [0.3, 0.55, 0.82][b % 3] + ')'; c.lineWidth = b >= 3 ? 0.36 : 0.22; c.stroke();
  }
  for (const r of sys.rings) {
    const f = r.t / r.dur, rr = r.r0 + (r.r1 - r.r0) * (1 - (1 - f) * (1 - f));
    c.strokeStyle = FOAM + (r.a * (1 - f)).toFixed(2) + ')'; c.lineWidth = 0.18; c.beginPath(); c.arc(r.x, r.y, rr, 0, 6.2832); c.stroke();
  }
};

// Sillage des roches (V amont) et coussin blanc en amont.
RW.drawRockWash = function (c, rv, v, t, reduced) {
  c.lineCap = 'round';
  const a1 = new Path2D(), a2 = new Path2D(), cu = new Path2D(), cu2 = new Path2D();
  for (const k of rv.rocks) {
    if (!inView(v, k.x, k.y, 20)) continue;
    const len = Math.min(4 * k.r + 4, 16);
    for (let sd = -1; sd <= 1; sd += 2) {
      const xa = k.x + sd * k.r * 0.9, xm = xa + sd * 0.2 * len, xb = xa + sd * 0.4 * len;
      a1.moveTo(xa, k.y + 0.2 * k.r); a1.lineTo(xm, k.y + len / 2); a2.moveTo(xm, k.y + len / 2); a2.lineTo(xb, k.y + len);
    }
    const pu = reduced ? 0 : 0.08 * Math.sin(t * 3 + k.id);
    cu.moveTo(k.x + Math.cos(Math.PI * 1.15) * (k.r + 0.55 + pu), k.y + Math.sin(Math.PI * 1.15) * (k.r + 0.55 + pu)); cu.arc(k.x, k.y, k.r + 0.55 + pu, Math.PI * 1.15, Math.PI * 1.85);
    cu2.moveTo(k.x + Math.cos(Math.PI * 1.2) * (k.r + 1.1), k.y + Math.sin(Math.PI * 1.2) * (k.r + 1.1)); cu2.arc(k.x, k.y, k.r + 1.1, Math.PI * 1.2, Math.PI * 1.8);
  }
  c.strokeStyle = 'rgba(242,251,248,.62)'; c.lineWidth = 0.28; c.stroke(a1);
  c.strokeStyle = 'rgba(242,251,248,.3)'; c.lineWidth = 0.26; c.stroke(a2);
  c.strokeStyle = 'rgba(225,248,244,.28)'; c.lineWidth = 0.9; c.stroke(cu2);
  c.strokeStyle = 'rgba(244,252,250,.88)'; c.lineWidth = 0.45; c.stroke(cu);
};

// Ombre des falaises sur l'eau : large sur la rive gauche (paroi à contre-jour), étroite à droite.
RW.drawCliffShadows = function (c, rv, v, rich) {
  for (const k of rv.banks || []) {
    if (k.type !== 'cliff' || k.y1 < v.y0 - 4 || k.y0 > v.y1 + 4) continue;
    const sd = k.side === 'L' ? -1 : 1, ya = Math.floor(Math.max(k.y0 - 2.5, v.y0 - 4)), yb = Math.ceil(Math.min(k.y1 + 2.5, v.y1 + 4)), wd = sd < 0 ? 2.6 : 1.1;
    c.beginPath();
    for (let y = ya; y <= yb; y += 0.5) { rv.at(y, A); c.lineTo(A.cx + sd * A.hw, y); }
    for (let y = yb; y >= ya; y -= 0.5) { rv.at(y, A); c.lineTo(A.cx + sd * (A.hw - wd * R.RB.cliffK(rv, sd, y)), y); }
    c.closePath(); c.fillStyle = sd < 0 ? 'rgba(3,24,34,.42)' : 'rgba(3,24,34,.36)'; c.fill();
  }
  void rich;
};

// Passoires : arbre tombé, motte de racines côté berge, eau qui s'empile contre les branches.
RW.drawStrainers = function (c, rv, v, rich, t) {
  for (const q of rv.strainers) {
    if (!inView(v, q.x0, q.y0, 14)) continue;
    const dx = q.x1 - q.x0, dy = q.y1 - q.y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    c.lineCap = 'round';
    // coussin d'eau en amont du tronc
    c.strokeStyle = 'rgba(240,251,248,.55)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(q.x0 + ux * 1.5 + 0.1, q.y0 + uy * 1.5 - 0.75); c.lineTo(q.x1 + 0.1, q.y1 - 0.75); c.stroke();
    if (rich) { c.strokeStyle = 'rgba(0,20,28,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(q.x0 + 0.35, q.y0 - 0.35); c.lineTo(q.x1 + 0.35, q.y1 - 0.35); c.stroke(); }
    // branches (sèches) et rameaux
    const br = [];
    for (let i = 1; i <= 7; i++) {
      const f = i / 7.5, bx = q.x0 + dx * f, by = q.y0 + dy * f, L = 1.2 + 1.4 * R.hash(i + q.y0);
      br.push(bx, by, bx + dy / 8 * L + dx * 0.04, by - Math.abs(dx) / 8 * L, bx, by, bx - dy / 9 * L + dx * 0.05, by + Math.abs(dx) / 11 * L);
    }
    c.strokeStyle = '#4a3220'; c.lineWidth = 0.3; c.beginPath();
    for (let i = 0; i < br.length; i += 4) { c.moveTo(br[i], br[i + 1]); c.lineTo(br[i + 2], br[i + 3]); }
    c.stroke();
    c.strokeStyle = '#6b5136'; c.lineWidth = 0.12; c.beginPath();
    for (let i = 0; i < br.length; i += 4) {
      const ex = br[i + 2], ey = br[i + 3], mx = (br[i] + ex) / 2, my = (br[i + 1] + ey) / 2;
      c.moveTo(ex, ey); c.lineTo(ex + ux * 0.5 + 0.2, ey + uy * 0.5 + 0.3); c.moveTo(mx, my); c.lineTo(mx + ux * 0.6 - 0.2, my + uy * 0.6 - 0.35);
    }
    c.stroke();
    // tronc avec écorce
    c.strokeStyle = '#3d2a18'; c.lineWidth = 1.0; c.beginPath(); c.moveTo(q.x0, q.y0); c.lineTo(q.x1, q.y1); c.stroke();
    c.strokeStyle = '#6e4f30'; c.lineWidth = 0.55; c.beginPath(); c.moveTo(q.x0 - 0.12, q.y0 + 0.12); c.lineTo(q.x1 - 0.12, q.y1 + 0.12); c.stroke();
    c.strokeStyle = 'rgba(40,24,12,.6)'; c.lineWidth = 0.08; c.setLineDash([0.35, 0.45]); c.beginPath(); c.moveTo(q.x0, q.y0); c.lineTo(q.x1, q.y1); c.stroke(); c.setLineDash([]);
    // motte de racines, côté berge
    c.fillStyle = '#3f2a17'; c.beginPath(); c.ellipse(q.x0, q.y0, 1.2, 1.4, Math.atan2(dy, dx), 0, 6.2832); c.fill();
    c.strokeStyle = '#2a1a0d'; c.lineWidth = 0.14; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; c.moveTo(q.x0 + Math.cos(a) * 0.9, q.y0 + Math.sin(a) * 1.1); c.lineTo(q.x0 + Math.cos(a) * 1.7, q.y0 + Math.sin(a) * 1.9); }
    c.stroke();
    void t;
  }
};

// Feuilles qui dérivent, castor, oiseaux (et leur ombre).
RW.drawLife = function (c, sys, t) {
  const LC = ['#e0a92e', '#d0662a', '#b8442a'];
  for (const p of sys.leaves) {
    const f = Math.min(1, p.life / 1.5, (18 - p.life) / 1.5);
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, f)); c.translate(p.x, p.y); c.rotate(p.a);
    c.fillStyle = LC[p.c]; c.beginPath(); c.ellipse(0, 0, 0.22, 0.12, 0, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(80,40,10,.6)'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.24, 0); c.lineTo(0.2, 0); c.stroke();
    c.restore();
  }
  const bv = sys.beaver;
  if (bv) {
    const a = Math.min(1, bv.t / 0.6, (bv.dur - bv.t) / 0.4);
    c.save(); c.globalAlpha = Math.max(0, a); c.translate(bv.x, bv.y);
    c.strokeStyle = 'rgba(235,250,246,.45)'; c.lineWidth = 0.07;
    for (let i = 1; i <= 3; i++) { const r = 0.35 + i * 0.35 + ((t * 0.8) % 0.35); c.beginPath(); c.arc(0, 0.3, r, Math.PI * 0.22, Math.PI * 0.78); c.stroke(); }
    c.fillStyle = 'rgba(60,36,18,.55)'; c.beginPath(); c.ellipse(0, 0.55, 0.3, 0.5, 0, 0, 6.2832); c.fill(); // dos à fleur d'eau
    c.fillStyle = '#5a3a20'; c.beginPath(); c.ellipse(0, -0.05, 0.24, 0.36, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#3d2614'; c.beginPath(); c.arc(-0.13, 0.12, 0.055, 0, 6.2832); c.arc(0.13, 0.12, 0.055, 0, 6.2832); c.arc(0, -0.36, 0.07, 0, 6.2832); c.fill();
    c.restore();
  }
  for (const b of sys.birds) {
    const fl = Math.sin(t * 9 + b.ph), dir = Math.atan2(b.vy, b.vx);
    for (let s = 0; s < 2; s++) {
      c.save(); c.translate(b.x + (s ? 0 : 4.5), b.y + (s ? 0 : -3.6)); c.rotate(dir); c.scale(2.3, 2.3);
      const col = s ? (b.gull ? '#f2f4f2' : '#23282c') : 'rgba(0,15,20,.18)', sp = 0.75 + 0.25 * fl;
      c.fillStyle = col; c.beginPath();
      for (let w = -1; w <= 1; w += 2) { c.moveTo(0.1, 0); c.quadraticCurveTo(0.14, w * 0.45 * sp, -0.12, w * 0.85 * sp); c.quadraticCurveTo(-0.04, w * 0.35 * sp, -0.14, w * 0.02); c.closePath(); }
      c.ellipse(0, 0, 0.32, 0.075, 0, 0, 6.2832); c.moveTo(-0.28, 0); c.lineTo(-0.44, 0.09); c.lineTo(-0.44, -0.09); c.closePath(); c.fill();
      if (s && b.gull) { c.fillStyle = '#2b2f33'; c.beginPath(); for (let w = -1; w <= 1; w += 2) { c.moveTo(-0.12, w * 0.85 * sp); c.lineTo(-0.02, w * 0.68 * sp); c.lineTo(-0.11, w * 0.62 * sp); c.closePath(); } c.fill(); c.fillStyle = '#e0a92e'; c.beginPath(); c.arc(0.33, 0, 0.035, 0, 6.2832); c.fill(); }
      c.restore();
    }
  }
};
})();
