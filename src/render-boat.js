(function () {
'use strict';
// Rendu, partie 3 : le canot (coque, ballons de pointe, équipiers et coups d'aviron), son sillage, et le nageur.
// Repère du canot : +y = pointe avant, l'équipier avant avironne à gauche (-x), l'arrière à droite (+x).
const RK = R.RK = {};
const U = {};

function hull(c, s) {
  s = s || 1; c.beginPath(); c.moveTo(0, 2.45 * s);
  c.bezierCurveTo(0.55 * s, 1.6 * s, 0.64 * s, 0.6 * s, 0.62 * s, 0); c.bezierCurveTo(0.64 * s, -0.7 * s, 0.5 * s, -1.7 * s, 0, -2.45 * s);
  c.bezierCurveTo(-0.5 * s, -1.7 * s, -0.64 * s, -0.7 * s, -0.62 * s, 0); c.bezierCurveTo(-0.64 * s, 0.6 * s, -0.55 * s, 1.6 * s, 0, 2.45 * s); c.closePath();
}
RK.hull = hull;
function line(c, x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); }
// Du repère du canot au repère de la rivière.
function toWorld(b, sc, x, y) { const cs = Math.cos(b.th), sn = Math.sin(b.th); return { x: b.x + (x * cs + y * sn) * sc, y: b.y + (-x * sn + y * cs) * sc }; }

// Mouvement de l'aviron selon le coup donné : position de la pale (le long de la coque, écart à la coque)
// et pale dans l'eau ou non. along : +1 propulsion, -1 rétro ; lat : +1 appel, -1 écart.
function stroke(ph, along, lat, t) {
  const pw = ph < 0.62, u = pw ? ph / 0.62 : (ph - 0.62) / 0.38, e = u * u * (3 - 2 * u);
  let a = 0.15, l = 0.25;
  if (along) { const f = pw ? e : 1 - e; a = along > 0 ? 0.85 - 1.4 * f : -0.55 + 1.4 * f; }
  if (lat) { const f = pw ? e : 1 - e; l = lat > 0 ? 0.95 - 0.8 * f : 0.12 + 0.78 * f; }
  if (!along && !lat) { a = 0.1 + 0.04 * Math.sin(t * 1.3); l = 0.22; }
  return { a, l, wet: (along || lat) ? pw : true, lift: pw ? 0 : Math.sin(u * Math.PI) };
}

function paddler(c, py, s, bow, b, mv, rich, helmet) {
  const lean = (b.lv || 0) * 0.12, bx = s * (0.66 + mv.l), by = py + mv.a;
  const hx = s * 0.5 + lean, hy = py + mv.a * 0.45 + 0.05, gx = -s * 0.06 + s * 0.12 * mv.l + lean, gy = py + mv.a * 0.18 + 0.2;
  c.lineCap = 'round'; c.lineJoin = 'round';
  // ombre de la pale levée sur l'eau
  if (rich && mv.lift > 0.05) { c.fillStyle = 'rgba(0,25,35,.25)'; c.beginPath(); c.ellipse(bx + 0.25 * mv.lift, by - 0.2 * mv.lift, 0.12, 0.27, 0, 0, 6.2832); c.fill(); }
  // manche de l'aviron
  const dx = bx - gx, dy = by - gy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  c.strokeStyle = '#7a5428'; c.lineWidth = 0.075; line(c, gx, gy, bx - ux * 0.25, by - uy * 0.25);
  // pale : dans l'eau, en partie voilée ; levée, claire
  c.save(); c.translate(bx, by); c.rotate(Math.atan2(uy, ux) - Math.PI / 2);
  c.fillStyle = mv.wet ? 'rgba(230,214,170,.7)' : '#f4e3b5'; c.strokeStyle = '#6b4a22'; c.lineWidth = 0.035;
  c.beginPath(); c.ellipse(0, 0.05, 0.11, 0.3, 0, 0, 6.2832); c.fill(); c.stroke();
  if (mv.wet) { c.strokeStyle = 'rgba(242,251,248,.75)'; c.lineWidth = 0.05; c.beginPath(); c.ellipse(0, 0.05, 0.2, 0.36, 0, 0, 6.2832); c.stroke(); }
  c.restore();
  // poignée en T
  c.strokeStyle = '#3a2a16'; c.lineWidth = 0.08; line(c, gx - uy * 0.09, gy + ux * 0.09, gx + uy * 0.09, gy - ux * 0.09);
  // bras : manches de l'habit, mains
  const shx = 0.27, shy = py + 0.04;
  c.strokeStyle = '#2b3a55'; c.lineWidth = 0.13;
  c.beginPath(); c.moveTo(s * shx + lean, shy); c.lineTo(hx, hy); c.moveTo(-s * shx + lean, shy); c.lineTo(gx, gy); c.stroke();
  c.fillStyle = '#e9c9a0'; circle(c, hx, hy, 0.065); c.fill(); circle(c, gx, gy, 0.065); c.fill();
  // VFI : jaune, bretelles et boucles
  c.fillStyle = '#ffb629'; c.strokeStyle = '#a66a00'; c.lineWidth = 0.035;
  c.beginPath(); c.ellipse(lean, py, 0.37, 0.25, 0, 0, 6.2832); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(60,40,0,.55)'; c.lineWidth = 0.035; line(c, lean - 0.2, py - 0.18, lean - 0.2, py + 0.18); line(c, lean + 0.2, py - 0.18, lean + 0.2, py + 0.18);
  c.fillStyle = 'rgba(255,240,190,.7)'; c.beginPath(); c.ellipse(lean - 0.1, py + 0.08, 0.12, 0.06, 0, 0, 6.2832); c.fill();
  // casque, avec la visière vers l'avant
  const hl = lean * 1.3;
  c.fillStyle = helmet; circle(c, hl, py + 0.03, 0.2); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.035; c.stroke();
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(hl, py + 0.19, 0.13, 0.05, 0, 0, 6.2832); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; circle(c, hl - 0.07, py + 0.08, 0.06); c.fill();
}

// Canot. dt sert à animer les coups ; sys reçoit les éclaboussures (mode riche).
RK.drawCanoe = function (c, b, inp, t, dt, o) {
  const sc = o.scale, rich = o.rich, sys = o.sys, rv = o.rv;
  const lv = b.lv = R.lerp(b.lv || 0, b.lean || 0, 0.18), al = Math.abs(lv), ls = lv > 0 ? 1 : -1;
  // Vitesse par rapport à l'eau : vague d'étrave et sillage.
  let rf = 0;
  if (rv) { rv.flow(b.x, b.y, U); if (!U.land) rf = (b.vx - U.x) * Math.sin(b.th) + (b.vy - U.y) * Math.cos(b.th); }
  const rs = Math.abs(rf), wk = R.clamp((rs - 0.35) / 1.6, 0, 1), dir = rf >= 0 ? 1 : -1;
  // Coups d'aviron réellement donnés.
  inp = inp || {};
  const st = R.sim.strokes(inp), along = inp.fwd && !inp.back ? 1 : inp.back && !inp.fwd ? -1 : 0;
  const latB = st.fb < 0 ? 1 : st.fb > 0 ? -1 : 0, latS = st.fs > 0 ? 1 : st.fs < 0 ? -1 : 0, bail = b.bailing;
  const act = !bail && (along || latB || latS);
  const p0 = b.pph || 0, p1 = act ? (p0 + dt * 1.15) % 1 : 0;
  const catchNow = act && dt > 0 && p1 < p0;
  b.pph = p1;
  c.save(); c.lineCap = 'round';
  if (rich) { c.save(); c.translate(b.x + 0.32, b.y - 0.28); c.rotate(-b.th); c.scale(sc, sc); c.translate(lv * 0.25, 0); hull(c); c.fillStyle = 'rgba(0,25,35,.28)'; c.fill(); c.restore(); }
  c.translate(b.x, b.y); c.rotate(-b.th); c.scale(sc, sc);
  // sillage (derrière, selon le sens du déplacement par rapport à l'eau) et vague d'étrave
  if (wk > 0) {
    const e = -2.45 * dir, f = 2.45 * dir;
    c.strokeStyle = 'rgba(242,251,248,' + (0.4 * wk).toFixed(2) + ')'; c.lineWidth = 0.14;
    c.beginPath(); c.moveTo(-0.25, e); c.lineTo(-0.7 - 0.6 * wk, e - dir * (1.4 + 2.4 * wk)); c.moveTo(0.25, e); c.lineTo(0.7 + 0.6 * wk, e - dir * (1.4 + 2.4 * wk)); c.stroke();
    c.strokeStyle = 'rgba(242,251,248,' + (0.2 * wk).toFixed(2) + ')'; c.lineWidth = 0.1;
    c.beginPath(); c.moveTo(-0.1, e - dir * 0.6); c.lineTo(-0.25, e - dir * (1.6 + 1.5 * wk)); c.moveTo(0.1, e - dir * 0.6); c.lineTo(0.25, e - dir * (1.6 + 1.5 * wk)); c.stroke();
    c.strokeStyle = 'rgba(244,252,250,' + (0.85 * wk).toFixed(2) + ')'; c.lineWidth = 0.1 + 0.08 * wk;
    c.beginPath(); c.moveTo(-0.05, f + dir * 0.08); c.quadraticCurveTo(-0.5, f - dir * 0.2, -0.72, f - dir * 0.85); c.moveTo(0.05, f + dir * 0.08); c.quadraticCurveTo(0.5, f - dir * 0.2, 0.72, f - dir * 0.85); c.stroke();
    if (rich && sys && dt > 0) {
      const n = Math.floor(wk * 14 * dt + Math.random());
      for (let i = 0; i < n; i++) { const sd = Math.random() < 0.5 ? -1 : 1, p = toWorld(b, sc, sd * 0.62, f - dir * 0.7); R.RW.addFoam(sys, p.x, p.y, 0, 0, 0.6 + Math.random() * 0.8, 0.09 + Math.random() * 0.07); }
      if (Math.random() < wk * 6 * dt) { const p = toWorld(b, sc, (Math.random() - 0.5) * 0.6, e); R.RW.addFoam(sys, p.x, p.y, 0, 0, 0.9, 0.1); }
    }
  }
  // gîte : l'eau lèche le bord bas
  if (al > 0.05) {
    c.save(); c.beginPath(); c.rect(ls > 0 ? 0 : -2, -3, 2, 6); c.clip();
    c.translate(lv * 0.1, 0); hull(c, 1.06); c.strokeStyle = 'rgba(242,251,248,' + (0.85 * al).toFixed(2) + ')'; c.lineWidth = 0.16;
    c.setLineDash([0.35, 0.18]); c.lineDashOffset = -t * 1.2; c.stroke(); c.setLineDash([]); c.restore();
  }
  // coque
  c.save(); c.translate(lv * 0.1, 0); c.scale(1 - 0.1 * al, 1);
  hull(c); c.fillStyle = '#d4432f'; c.fill(); c.lineWidth = 0.11; c.strokeStyle = '#6e1a12'; c.stroke();
  c.save(); hull(c); c.clip();
  // flanc côté haut, éclairé ; côté bas plus sombre
  if (al > 0.05) {
    c.fillStyle = 'rgba(255,170,150,' + (0.4 * al).toFixed(2) + ')'; c.fillRect(ls > 0 ? -0.7 : 0.35, -2.6, 0.35, 5.2);
    c.fillStyle = 'rgba(40,8,4,' + (0.45 * al).toFixed(2) + ')'; c.fillRect(ls > 0 ? 0.3 : -1, -2.6, 0.7, 5.2);
  }
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-0.35, 0.4, 0.1, 1.6, 0, 0, 6.2832); c.fill(); // reflet de la coque
  c.restore();
  // intérieur : fond, membrures, plat-bord intérieur
  c.save(); c.translate(lv * 0.16, 0); c.scale(0.76, 0.9);
  hull(c); c.fillStyle = '#e6d1a3'; c.fill();
  c.save(); hull(c); c.clip();
  c.strokeStyle = 'rgba(176,140,84,.55)'; c.lineWidth = 0.05; c.beginPath();
  for (let y = -2.1; y <= 2.1; y += 0.32) { c.moveTo(-0.7, y); c.quadraticCurveTo(0, y - 0.08, 0.7, y); }
  c.stroke();
  c.fillStyle = 'rgba(120,80,30,.18)'; c.fillRect(ls > 0 ? -0.7 : 0.25, -2.6, 0.45, 5.2);
  c.restore();
  hull(c); c.strokeStyle = '#5a3a1c'; c.lineWidth = 0.09; c.stroke();
  c.restore();
  // ballons de pointe (gris-bleu, lacés)
  for (const [y, ry] of [[1.82, 0.42], [-1.95, 0.36]]) {
    c.fillStyle = '#546a7d'; c.beginPath(); c.ellipse(lv * 0.16, y, 0.3, ry, 0, 0, 6.2832); c.fill();
    c.fillStyle = 'rgba(170,190,205,.55)'; c.beginPath(); c.ellipse(lv * 0.16 - 0.09, y + 0.08, 0.1, ry * 0.5, 0, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(235,235,230,.7)'; c.lineWidth = 0.025; c.beginPath();
    for (let i = -2; i <= 2; i++) { const yy = y + i * ry * 0.35; c.moveTo(lv * 0.16 - 0.28, yy); c.lineTo(lv * 0.16 + 0.28, yy + ry * 0.17); }
    c.stroke();
  }
  // pointes : plaques et poignées
  c.fillStyle = '#8f2417';
  c.beginPath(); c.moveTo(0, 2.45); c.lineTo(-0.2, 2.12); c.lineTo(0.2, 2.12); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(0, -2.45); c.lineTo(-0.18, -2.15); c.lineTo(0.18, -2.15); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(245,245,240,.85)'; c.lineWidth = 0.04; c.beginPath(); c.arc(0, 2.5, 0.09, 0, 6.2832); c.moveTo(0.09, -2.5); c.arc(0, -2.5, 0.09, 0, 6.2832); c.stroke();
  // eau embarquée : elle glisse du côté bas
  if (b.water > 0.01) {
    const k = 0.3 + 0.7 * R.clamp(b.water, 0, 1), sl = 0.05 * Math.sin(t * 3.1);
    c.save(); c.translate(lv * 0.3 + sl, 0.05 * Math.sin(t * 2.3)); c.scale(0.72 * k, 0.86 * k); hull(c);
    c.fillStyle = 'rgba(52,140,182,' + (0.5 + 0.35 * b.water).toFixed(2) + ')'; c.fill();
    c.strokeStyle = 'rgba(220,245,250,.55)'; c.lineWidth = 0.05; c.stroke();
    c.strokeStyle = 'rgba(235,250,252,.45)'; c.lineWidth = 0.04; c.beginPath(); c.moveTo(-0.2, 0.5 + sl * 4); c.lineTo(0.15, 0.3 + sl * 4); c.moveTo(-0.1, -0.8 - sl * 4); c.lineTo(0.2, -0.95 - sl * 4); c.stroke();
    c.restore();
  }
  // barres (avant de la barre centrale, arrière) et sièges
  c.strokeStyle = '#8a6a3a'; c.lineWidth = 0.1; line(c, -0.5 + lv * 0.1, 0.35, 0.5 + lv * 0.1, 0.35); line(c, -0.5 + lv * 0.1, -0.5, 0.5 + lv * 0.1, -0.5);
  c.fillStyle = '#5b4026'; c.fillRect(-0.36 + lv * 0.12, 1.05, 0.72, 0.16); c.fillRect(-0.36 + lv * 0.12, -1.62, 0.72, 0.16);
  c.restore(); c.restore();
  // équipiers (dans le repère du canot)
  c.save(); c.translate(b.x, b.y); c.rotate(-b.th); c.scale(sc, sc);
  const ps = act ? (p1 + 0.06) % 1 : 0;
  let mb, ms;
  if (bail) { // ils écopent : aviron posé, mains vers le fond
    const w = Math.sin(t * 7);
    mb = { a: 0.2, l: -0.25 + 0.05 * w, wet: false, lift: 0 }; ms = { a: -0.2, l: -0.25 - 0.05 * w, wet: false, lift: 0 };
    if (rich && sys && Math.random() < dt * 3) { const sd = Math.random() < 0.5 ? -1 : 1, p = toWorld(b, sc, sd * 1.1, (Math.random() - 0.5) * 2); R.RW.addFoam(sys, p.x, p.y, 0, 0, 0.5, 0.12); }
  } else {
    mb = stroke(p1, along, latB, t); ms = stroke(ps, along, latS, t);
    if (!along && !latB) mb = stroke(0, 0, 0, t);
    if (!along && !latS) ms = stroke(0, 0, 0, t);
  }
  paddler(c, 1.25, -1, true, b, mb, rich, '#f6f1e4');
  paddler(c, -1.4, 1, false, b, ms, rich, '#3fa7d6');
  c.restore();
  // éclaboussure à l'entrée de l'aviron
  if (catchNow && sys) {
    for (const [py, s, m] of [[1.25, -1, mb], [-1.4, 1, ms]]) {
      const p = toWorld(b, sc, s * (0.66 + m.l), py + m.a);
      R.RW.ring(sys, p.x, p.y, 0.15, 0.7, 0.5, 0.6);
      if (rich) for (let i = 0; i < 4; i++) R.RW.addFoam(sys, p.x, p.y, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, 0.4 + Math.random() * 0.4, 0.08 + Math.random() * 0.05);
    }
  }
};

// Nageur : position de sécurité (sur le dos, pieds vers l'aval) ou nage active (tête la première).
RK.drawSwim = function (c, b, t, o) {
  const sc = o.scale, rich = o.rich;
  c.save(); c.translate(b.x, b.y); c.scale(sc, sc); c.lineCap = 'round';
  // remous autour du nageur
  c.fillStyle = 'rgba(225,248,244,.16)'; circle(c, 0, 0, 1.1); c.fill();
  c.strokeStyle = 'rgba(242,251,248,.65)'; c.lineWidth = 0.12; circle(c, 0, 0, 0.95 + 0.15 * Math.sin(t * 6)); c.stroke();
  c.strokeStyle = 'rgba(242,251,248,.35)'; c.lineWidth = 0.08; circle(c, 0, 0, 1.3 + 0.12 * Math.sin(t * 6 + 1.5)); c.stroke();
  if (b.active) { // nage active : crawl, battements de jambes
    c.rotate(-(b.sdir || 0));
    const a = Math.sin(t * 9), k = Math.sin(t * 16);
    c.strokeStyle = '#2b3a55'; c.lineWidth = 0.17; c.beginPath(); c.moveTo(-0.1, -0.25); c.lineTo(-0.13 + 0.08 * k, -1.0); c.moveTo(0.1, -0.25); c.lineTo(0.13 - 0.08 * k, -1.0); c.stroke();
    c.fillStyle = 'rgba(244,252,250,.7)'; circle(c, 0.05 * k, -1.12, 0.16 + 0.05 * Math.abs(k)); c.fill();
    c.strokeStyle = '#e9c9a0'; c.lineWidth = 0.14;
    const la = 0.5 + 0.45 * a, ra = 0.5 - 0.45 * a;
    c.beginPath(); c.moveTo(-0.22, 0.25); c.lineTo(-0.45, 0.25 + la); c.moveTo(0.22, 0.25); c.lineTo(0.45, 0.25 + ra); c.stroke();
    if (rich) { c.fillStyle = 'rgba(244,252,250,.6)'; circle(c, -0.48, 0.3 + la, 0.12); c.fill(); circle(c, 0.48, 0.3 + ra, 0.12); c.fill(); }
    c.fillStyle = '#ffb629'; c.strokeStyle = '#a66a00'; c.lineWidth = 0.035; c.beginPath(); c.ellipse(0, 0, 0.3, 0.42, 0, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = '#f6f1e4'; circle(c, 0, 0.5, 0.21); c.fill(); c.strokeStyle = 'rgba(0,0,0,.3)'; c.stroke();
  } else { // position de sécurité : sur le dos, pieds en surface vers l'aval
    c.rotate(-(b.sth || 0));
    c.strokeStyle = '#2b3a55'; c.lineWidth = 0.19; c.beginPath(); c.moveTo(-0.13, 0.2); c.lineTo(-0.16, 1.02); c.moveTo(0.13, 0.2); c.lineTo(0.16, 1.02); c.stroke();
    c.fillStyle = 'rgba(244,252,250,.75)'; circle(c, -0.16, 1.14, 0.2); c.fill(); circle(c, 0.16, 1.14, 0.2); c.fill();
    c.fillStyle = '#1b2233'; c.beginPath(); c.ellipse(-0.16, 1.12, 0.1, 0.14, 0, 0, 6.2832); c.fill(); c.beginPath(); c.ellipse(0.16, 1.12, 0.1, 0.14, 0, 0, 6.2832); c.fill();
    c.strokeStyle = '#e9c9a0'; c.lineWidth = 0.14;
    if (b.stroke) { // il dénage : les bras balaient l'eau de chaque côté
      const a = Math.sin(t * 9), cc = Math.cos(t * 9);
      c.beginPath(); c.moveTo(-0.25, 0); c.lineTo(-0.72, 0.1 + 0.45 * a); c.moveTo(0.25, 0); c.lineTo(0.72, 0.1 + 0.45 * a); c.stroke();
      c.strokeStyle = 'rgba(242,251,248,.6)'; c.lineWidth = 0.1;
      c.beginPath(); c.moveTo(-0.8, 0.1 + 0.45 * a); c.lineTo(-0.8 - 0.25 * Math.abs(cc), 0.1 + 0.45 * a - 0.3 * cc); c.moveTo(0.8, 0.1 + 0.45 * a); c.lineTo(0.8 + 0.25 * Math.abs(cc), 0.1 + 0.45 * a - 0.3 * cc); c.stroke();
    } else { c.beginPath(); c.moveTo(-0.25, 0); c.lineTo(-0.68, 0.12 + 0.05 * Math.sin(t * 2)); c.moveTo(0.25, 0); c.lineTo(0.68, 0.12 - 0.05 * Math.sin(t * 2)); c.stroke(); }
    c.fillStyle = '#e9c9a0'; circle(c, -0.7, 0.13, 0.07); c.fill(); circle(c, 0.7, 0.13, 0.07); c.fill();
    c.fillStyle = '#ffb629'; c.strokeStyle = '#a66a00'; c.lineWidth = 0.035; c.beginPath(); c.ellipse(0, 0, 0.3, 0.42, 0, 0, 6.2832); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(60,40,0,.55)'; c.beginPath(); c.moveTo(-0.16, -0.3); c.lineTo(-0.16, 0.3); c.moveTo(0.16, -0.3); c.lineTo(0.16, 0.3); c.stroke();
    // tête : casque, visage tourné vers le ciel, regard vers l'aval
    c.fillStyle = '#e9c9a0'; circle(c, 0, -0.48, 0.17); c.fill();
    c.fillStyle = '#f6f1e4'; c.beginPath(); c.arc(0, -0.5, 0.22, Math.PI * 1.1, Math.PI * 1.9); c.lineTo(0, -0.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.03; c.beginPath(); c.arc(0, -0.5, 0.22, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.fillStyle = '#1b2233'; circle(c, -0.06, -0.42, 0.028); c.fill(); circle(c, 0.06, -0.42, 0.028); c.fill();
    c.strokeStyle = '#8a4a2a'; c.lineWidth = 0.025; c.beginPath(); c.arc(0, -0.4, 0.06, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
  }
  c.restore();
};
})();
