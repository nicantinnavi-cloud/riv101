(function () {
'use strict';
// Physique du canot et du nageur.
// Cap « th » : 0 = pointe vers l'aval, positif = tourne à droite.
// Le canot est porté par l'eau en deux points (pointe avant, pointe arrière) : c'est la différence de
// courant entre les deux qui fait pivoter le canot en entrant dans un contre-courant.
// Canot tandem : l'équipier avant avironne à gauche, l'équipier arrière à droite. Les coups latéraux
// sont des forces appliquées aux deux pointes : forces opposées = pivot, même sens = déplacement latéral.
// Réglages (eau calme) : propulsion 2,7 m/s, 63 % en 2,4 s, un tiers de l'erre après 3 s environ ;
// pivot d'environ 50 degrés par seconde, mis en route et amorti en 0,6 s ; déplacement latéral 0,75 m/s.
// Rétro à 85 % de la propulsion : le bac arrière est la manœuvre d'évitement de base.
const D = 2.0, CF = 0.21, CL = 0.9, I = 4.3, KX = 1.0, AP = 1.13, RETRO = 0.85, FP = 0.68, TQ = 0.87, RC = 0.5, THR = 1.4;
const OFFS = [-2, -1, 0, 1, 2], U = {}, A = {};

function newBoat(x, y, th) {
  return { x, y, py: y, vx: 0, vy: 0, th: th || 0, om: 0, lean: 0, need: 0, side: 0, sideT: 0, cross: 0, auto: false, instab: 0, mode: 'canoe', hitCd: 0, ev: [], hearts: 3, active: false, safeT: 0, sth: 0, sdir: 0 };
}

// Ce que fait chaque équipier. fb, fs : force latérale à la pointe avant, à la pointe arrière
// (+1 = vers la droite du canot) ; tq : couple ajouté pour un pivot.
function strokes(inp) {
  let fb = 0, fs = 0, tq = 0;
  if (inp.left) { fb -= 1; fs += 1; tq -= 1; }
  if (inp.right) { fb += 1; fs -= 1; tq += 1; }
  if (inp.latL) { fb -= 1; fs -= 1; }
  if (inp.latR) { fb += 1; fs += 1; }
  return { fb, fs, tq };
}

// Impulsion au point de contact (rx, ry) le long de la normale (nx, ny).
function impulse(b, rx, ry, nx, ny, pen, e) {
  const qx = ry, qy = -rx;
  const vn = (b.vx + b.om * qx) * nx + (b.vy + b.om * qy) * ny;
  b.x += nx * pen; b.y += ny * pen;
  if (vn >= 0) return 0;
  const pn = qx * nx + qy * ny, j = -(1 + e) * vn / (1 + pn * pn / I);
  b.vx += j * nx; b.vy += j * ny; b.om += j * pn / I;
  return -vn;
}

function segDist(px, py, s) {
  const vx = s.x1 - s.x0, vy = s.y1 - s.y0, t = R.clamp(((px - s.x0) * vx + (py - s.y0) * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(px - s.x0 - vx * t, py - s.y0 - vy * t);
}

// Gîte en bac : quand le courant arrive de travers sur la coque (c = U · n au-delà de 0,5 m/s),
// il faut gîter vers l'aval (signe de c) pour que le courant glisse sous la coque.
// À plat, la coque accroche : le coup d'aviron porte moins et le courant emporte le canot.
// Gîté vers l'amont : presque aucun déplacement utile, et l'instabilité monte vite.
const CROSS = 0.5;
function stepCanoe(b, inp, rv, dt, assist, tippy) {
  const fx = Math.sin(b.th), fy = Math.cos(b.th), nx = fy, ny = -fx;
  let ax = 0, ay = 0, al = 0, wb = 0, ws = 0;
  // Gîte décidée au début du pas, à partir du côté requis au pas précédent.
  let lean = (inp.leanR ? 1 : 0) - (inp.leanL ? 1 : 0);
  if (assist) lean = b.side;
  rv.flow(b.x, b.y, U);
  const c = U.x * nx + U.y * ny, kx = R.sstep(CROSS - 0.1, CROSS + 0.3, Math.abs(c)), cs = c > 0 ? 1 : -1;
  const lq = kx === 0 ? 0 : lean === cs ? 0 : lean === 0 ? 1 : 2; // 0 bonne gîte, 1 à plat, 2 mauvais côté
  const eff = lq === 0 ? 1 : 1 - kx * (lq === 1 ? 0.45 : 0.85);   // efficacité des coups d'aviron
  const drag = lq === 0 ? 0 : kx * Math.abs(c) * (lq === 1 ? 0.35 : 0.8); // la coque accrochée suit le courant
  if (drag) { const u = Math.hypot(U.x, U.y) || 1; ax += (U.x / u) * drag; ay += (U.y / u) * drag; }
  b.cross = kx; b.lq = lq;
  for (let s = -1; s <= 1; s += 2) {
    rv.flow(b.x + s * D * fx, b.y + s * D * fy, U);
    const rx = b.vx + b.om * s * D * nx - U.x, ry = b.vy + b.om * s * D * ny - U.y;
    const rf = rx * fx + ry * fy, rn = rx * nx + ry * ny;
    ax -= CF * rf * fx + CL * rn * nx; ay -= CF * rf * fy + CL * rn * ny;
    al -= s * D * CL * rn / I;
    const wn = U.x * nx + U.y * ny; if (s > 0) wb = wn; else ws = wn;
  }
  al += KX * CL * D * (wb - ws) / I;
  if (inp.fwd) { ax += AP * eff * fx; ay += AP * eff * fy; }
  if (inp.back) { ax -= AP * RETRO * eff * fx; ay -= AP * RETRO * eff * fy; }
  // Coups latéraux aux deux pointes (le long de n, vers la droite du canot).
  // Pointe avant (aviron à gauche) : appel = vers la gauche, écart = vers la droite.
  // Pointe arrière (aviron à droite) : appel = vers la droite, écart = vers la gauche.
  const st = strokes(inp), fb = st.fb * FP * eff, fs = st.fs * FP * eff;
  ax += (fb + fs) * nx; ay += (fb + fs) * ny;
  al += D * (fb - fs) / I + st.tq * TQ;
  b.py = b.y;
  b.vx += ax * dt; b.vy += ay * dt; b.om += al * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.th += b.om * dt;
  if (b.th > Math.PI) b.th -= 2 * Math.PI; else if (b.th < -Math.PI) b.th += 2 * Math.PI;

  // Équilibre : l'eau qui arrive de côté pousse sur la coque. On gîte vers l'aval de ce courant.
  rv.flow(b.x, b.y, U);
  // Côté de gîte requis : la vitesse latérale par rapport à l'eau (entrées et sorties de
  // contre-courant) passe en premier ; sinon, le courant de travers (bac). Il faut 0,2 s de
  // constance pour changer de côté (sauf cisaillement franc) : les repères G et D ne clignotent pas.
  const need = -((b.vx - U.x) * nx + (b.vy - U.y) * ny), mag = Math.abs(need), sg = need > 0 ? 1 : -1;
  const c2 = U.x * nx + U.y * ny, ac = Math.abs(c2);
  let cand = mag > 0.9 ? sg : ac > CROSS ? (c2 > 0 ? 1 : -1) : 0;
  if (cand === 0 && b.side !== 0 && (mag > 0.75 || ac > CROSS - 0.1)) cand = b.side; // hystérésis
  if (cand === b.side) b.sideT = 0;
  else if (mag > 0.9 || (b.sideT += dt) > 0.2) { b.side = cand; b.sideT = 0; } // cisaillement : tout de suite
  b.lean = lean; b.need = b.side; b.auto = !!assist;
  if (tippy > 0) {
    let rate = -0.6;
    if (mag > THR) {
      rate = (mag - THR) * 0.9 * tippy;
      if (lean === sg) rate = -0.6; else if (lean === -sg) rate *= 2.2;
    }
    // Bac à plat : l'instabilité monte lentement. Gîté vers l'amont : elle monte vite.
    if (lq === 1) rate = Math.max(rate, 0.12 * kx * tippy); else if (lq === 2) rate = Math.max(rate, 0.9 * kx * tippy);
    b.instab += rate * dt;
  } else b.instab -= 0.6 * dt;
  b.instab = R.clamp(b.instab, 0, 1.05);
  if (b.instab >= 1) { b.instab = 0; b.ev.push('capsize'); }

  // Collisions : la coque est approchée par cinq cercles.
  let hit = 0; b.hitCd -= dt;
  for (let i = 0; i < 5; i++) {
    const o = OFFS[i], rxo = o * fx, ryo = o * fy;
    for (let j = 0; j < rv.rocks.length; j++) {
      const k = rv.rocks[j], py = b.y + ryo, dy = py - k.y, rr = k.r + RC;
      if (dy > rr || dy < -rr) continue;
      const dx = b.x + rxo - k.x, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01;
      hit = Math.max(hit, impulse(b, rxo, ryo, dx / d, dy / d, rr - d, 0.15));
    }
    const px = b.x + rxo, py = b.y + ryo;
    rv.at(py, A);
    const il = 1 / Math.hypot(1, A.dcx), left = A.cx - A.hw + RC, right = A.cx + A.hw - RC;
    // Berge basse : on s'échoue doucement (frottement). Falaise : on rebondit, sans frottement de plage.
    if (px < left) { const cl = rv.bankType('L', py) === 'cliff'; impulse(b, rxo, ryo, il, -A.dcx * il, (left - px) * il, cl ? 0.3 : 0); if (!cl) { b.vx *= 1 - 1.5 * dt; b.vy *= 1 - 1.5 * dt; } }
    else if (px > right) { const cl = rv.bankType('R', py) === 'cliff'; impulse(b, rxo, ryo, -il, A.dcx * il, (px - right) * il, cl ? 0.3 : 0); if (!cl) { b.vx *= 1 - 1.5 * dt; b.vy *= 1 - 1.5 * dt; } }
    for (let j = 0; j < rv.strainers.length; j++) if (segDist(px, py, rv.strainers[j]) < 0.9) { b.ev.push('passoire'); return; }
  }
  if (hit > 0.35 && b.hitCd <= 0) { b.ev.push(hit > 1.1 ? 'hit' : 'bump'); b.hitCd = 0.7; }
  if (b.y < 1) { b.y = 1; if (b.vy < 0) b.vy = 0; }
  if (rv.seuil && !rv.seuil.safe && b.py < rv.seuil.y && b.y >= rv.seuil.y) b.ev.push('rappel');
}

function stepSwim(b, inp, rv, dt) {
  b.py = b.y; rv.flow(b.x, b.y, U);
  const wsp = Math.hypot(U.x, U.y);
  b.vx += (U.x - b.vx) * 2.2 * dt; b.vy += (U.y - b.vy) * 2.2 * dt;
  const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = (inp.fwd ? 1 : 0) - (inp.back ? 1 : 0), il = Math.hypot(ix, iy);
  if (il) { const a = (b.active ? 2.6 : 0.7) / il; b.vx += ix * a * dt; b.vy += iy * a * dt; b.sdir = Math.atan2(ix, iy); }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (wsp > 0.2) b.sth = Math.atan2(U.x, U.y);
  b.hitCd -= dt; b.clCd = (b.clCd || 0) - dt;
  for (let j = 0; j < rv.rocks.length; j++) {
    const k = rv.rocks[j], dx = b.x - k.x, dy = b.y - k.y, rr = k.r + 0.45, d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
    b.x += nx * (rr - d); b.y += ny * (rr - d);
    if (vn < 0) {
      b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny;
      if (b.active && -vn > 1.0 && b.hitCd <= 0) { b.hearts--; b.hitCd = 1; b.ev.push(b.hearts > 0 ? 'ouch' : 'ko'); }
      else if (-vn > 0.6 && b.hitCd <= 0) { b.hitCd = 0.5; b.ev.push('bump'); }
    }
  }
  for (let j = 0; j < rv.strainers.length; j++) if (segDist(b.x, b.y, rv.strainers[j]) < 0.9) { b.ev.push('passoire'); return; }
  if (rv.seuil && !rv.seuil.safe && b.py < rv.seuil.y && b.y >= rv.seuil.y) { b.ev.push('rappel'); return; }
  rv.at(b.y, A);
  const lo = A.cx - A.hw + 0.7, hi = A.cx + A.hw - 0.7;
  // Falaise : le nageur glisse le long de la paroi. Il n'est pas sauvé, il doit trouver une berge basse.
  for (let s = -1; s <= 1; s += 2) {
    if (!(s < 0 ? b.x < lo : b.x > hi) || rv.bankType(s < 0 ? 'L' : 'R', b.y) !== 'cliff') continue;
    b.x = s < 0 ? lo : hi; if (b.vx * s > 0) b.vx *= -0.3;
    if (b.clCd <= 0) b.ev.push('cliff');
    b.clCd = 1.5;
  }
  if (b.x < lo || b.x > hi || b.y > rv.L - 2) { b.ev.push('safe'); return; }
  if (b.y < 1) b.y = 1;
  if (wsp < 0.75) b.safeT += dt; else b.safeT = 0;
  if (b.safeT > 1.3) b.ev.push('safe');
}

// Pilote automatique : vise la vitesse voulue sur le fond en compensant le courant.
// back : bac arrière (pointe avant vers l'aval, en rétro) au lieu de pointer vers la cible.
function bot(b, rv, tx, ty, inp, back) {
  for (let j = 0; j < rv.rocks.length; j++) { // contourne la roche droit devant
    const k = rv.rocks[j], dy = k.y - b.y;
    if (dy > -1 && dy < 13 && Math.abs(k.x - b.x) < k.r + 2 && ty > k.y) { tx = k.x + (tx >= k.x ? 1 : -1) * (k.r + 3.6); ty = k.y + 1; break; }
  }
  rv.flow(b.x, b.y, U);
  // Loin de la cible, on va au moins aussi vite que l'eau : sinon, en courant rapide, le
  // pilote se met face à l'amont et fait du surplace.
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, uu = Math.hypot(U.x, U.y);
  // En bac arrière, on descend moins vite que l'eau : c'est le rétro qui ralentit et décale le canot.
  const sp = back ? Math.min(Math.max(0.6, uu * 0.45), d * 0.6) : Math.min(Math.max(2.4, uu + 0.6), d * 0.6);
  const wx = dx / d * sp - U.x, wy = dy / d * sp - U.y, wsp = Math.hypot(wx, wy);
  // Le rétro ne sert qu'à freiner par rapport à l'eau : s'il faut descendre plus vite que l'eau, on pagaie vers l'avant.
  if (back && wy > 0.3) back = false;
  let hd = back ? Math.atan2(-wx, -wy) : Math.atan2(wx, wy);
  if (back) { // bac arrière : la pointe avant reste tournée vers l'aval (au plus 55 degrés d'angle)
    const fh = Math.hypot(U.x, U.y) > 0.3 ? Math.atan2(U.x, U.y) : 0;
    let dd = hd - fh; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
    hd = fh + R.clamp(dd, -0.95, 0.95);
  }
  let err = hd - b.th;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  // Le canot a de l'inertie en rotation : on anticipe (erreur prévue dans 0,6 s) pour ne pas dépasser.
  const ep = err - b.om * 0.6;
  inp.left = ep < -0.1; inp.right = ep > 0.1;
  const fx = Math.sin(b.th), fy = Math.cos(b.th), lat = wx * fy - wy * fx; // composante voulue vers la droite du canot
  inp.fwd = !back && wsp > 0.35 && Math.abs(err) < 1.0;
  // Rétro dosé : on recule par rapport à l'eau tant qu'on ne recule pas encore assez.
  inp.back = !!back && Math.abs(err) < 1.0 && ((b.vx - U.x) * fx + (b.vy - U.y) * fy) > (wx * fx + wy * fy) + 0.05;
  // Déplacement latéral pour s'aligner (porte, roche) quand le cap est presque bon.
  inp.latL = Math.abs(err) < 0.6 && lat < -0.25; inp.latR = Math.abs(err) < 0.6 && lat > 0.25;
  // Gîte vers le côté demandé par le courant (utile quand l'assistance est coupée).
  inp.leanL = b.need < 0; inp.leanR = b.need > 0;
}

R.sim = { newBoat, stepCanoe, stepSwim, bot, strokes };
})();
