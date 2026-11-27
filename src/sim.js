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
const OFFS = [-2, -1, 0, 1, 2], U = {}, A = {}, A2 = {};

function newBoat(x, y, th) {
  return { x, y, py: y, vx: 0, vy: 0, th: th || 0, om: 0, lean: 0, need: 0, side: 0, sideT: 0, cross: 0, auto: false, instab: 0, mode: 'canoe', hitCd: 0, ev: [], hearts: 3, active: false, safeT: 0, sth: 0, sdir: 0, water: 0, depth: 9, scrape: 0, grounded: false, bailing: false };
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
// Frottement sur le fond selon la profondeur : racle sous 0,35 m, presque échoué sous 0,12 m.
const SCRAPE = 0.35, GROUND = 0.12;
function bottom(d) { return d >= SCRAPE ? 0 : 1.6 * R.sstep(SCRAPE, GROUND, d) + 5.5 * R.sstep(GROUND, -0.05, d); }
// wet : facteur d'eau embarquée (0 dans les leçons).
function stepCanoe(b, inp, rv, dt, assist, tippy, wet) {
  const fx = Math.sin(b.th), fy = Math.cos(b.th), nx = fy, ny = -fx;
  const wl = b.water || 0, pad = !b.bailing;
  let ax = 0, ay = 0, al = 0, wb = 0, ws = 0, fr = 0, dmin = 9, rfw = 0;
  // Gîte décidée au début du pas, à partir du côté requis au pas précédent.
  let lean = (inp.leanR ? 1 : 0) - (inp.leanL ? 1 : 0);
  if (assist) lean = b.side;
  rv.flow(b.x, b.y, U);
  const c = U.x * nx + U.y * ny, kx = R.sstep(CROSS - 0.1, CROSS + 0.3, Math.abs(c)), cs = c > 0 ? 1 : -1;
  // Le côté requis est celui montré au joueur (b.side, qui tient compte aussi du cisaillement).
  const sd = b.side || cs, lq = kx === 0 ? 0 : lean === sd ? 0 : lean === 0 ? 1 : 2; // 0 bonne gîte, 1 à plat, 2 mauvais côté
  const eff = lq === 0 ? 1 : 1 - kx * (lq === 1 ? 0.35 : 0.85);   // efficacité des coups d'aviron
  const drag = lq === 0 ? 0 : kx * Math.abs(c) * (lq === 1 ? 0.22 : 0.8); // la coque accrochée suit le courant
  if (drag) { const u = Math.hypot(U.x, U.y) || 1; ax += (U.x / u) * drag; ay += (U.y / u) * drag; }
  b.cross = kx; b.lq = lq;
  for (let s = -1; s <= 1; s += 2) {
    rv.flow(b.x + s * D * fx, b.y + s * D * fy, U);
    const dd = U.d == null ? 9 : U.d; if (dd < dmin) dmin = dd; fr += bottom(dd) / 2;
    const rx = b.vx + b.om * s * D * nx - U.x, ry = b.vy + b.om * s * D * ny - U.y;
    const rf = rx * fx + ry * fy, rn = rx * nx + ry * ny;
    ax -= CF * rf * fx + CL * rn * nx; ay -= CF * rf * fy + CL * rn * ny;
    al -= s * D * CL * rn / I;
    const wn = U.x * nx + U.y * ny; if (s > 0) wb = wn; else ws = wn;
    rfw += rf / 2;
  }
  al += KX * CL * D * (wb - ws) / I;
  // Un canot chargé d'eau accélère moins et tourne moins bien. On ne pagaie pas pendant qu'on écope.
  const pw = (1 - 0.45 * wl) * eff, tw = 1 - 0.4 * wl;
  if (pad && inp.fwd) { ax += AP * pw * fx; ay += AP * pw * fy; }
  if (pad && inp.back) { ax -= AP * RETRO * pw * fx; ay -= AP * RETRO * pw * fy; }
  // Coups latéraux aux deux pointes (le long de n, vers la droite du canot).
  // Pointe avant (aviron à gauche) : appel = vers la gauche, écart = vers la droite.
  // Pointe arrière (aviron à droite) : appel = vers la droite, écart = vers la gauche.
  const st = pad ? strokes(inp) : { fb: 0, fs: 0, tq: 0 }, fb = st.fb * FP * pw, fs = st.fs * FP * pw;
  ax += (fb + fs) * nx; ay += (fb + fs) * ny;
  al += (D * (fb - fs) / I + st.tq * TQ) * tw;
  b.py = b.y;
  b.vx += ax * dt; b.vy += ay * dt; b.om += al * dt;
  // Le fond freine le canot par rapport au sol (et non par rapport à l'eau).
  // En reculant ou en pagayant vers l'eau plus profonde, le fond retient beaucoup moins : on se dégage toujours.
  if (fr > 0) {
    const sp = Math.hypot(b.vx, b.vy);
    // (en reculant, ou en poussant lentement vers une eau nettement plus profonde ; pas en fonçant par-dessus un banc)
    if (sp > 0.03 && ((b.vx * fx + b.vy * fy) < 0 || (sp < 0.8 && rv.depth(b.x + b.vx / sp * 1.5, b.y + b.vy / sp * 1.5) > dmin + 0.15))) fr *= 0.3;
    const k = 1 / (1 + fr * dt); b.vx *= k; b.vy *= k; b.om *= 1 / (1 + 0.6 * fr * dt);
  }
  b.depth = dmin; b.scrape = fr > 0 ? R.clamp(fr / 1.6, 0, 1) * R.clamp(Math.hypot(b.vx, b.vy) / 1.5, 0, 1) : 0;
  if (!b.grounded && dmin < GROUND) { b.grounded = true; b.ev.push('ground'); }
  else if (b.grounded && dmin > GROUND + 0.12) b.grounded = false;
  if (fr > 0 && Math.hypot(b.vx, b.vy) > 0.3) b.ev.push('scrape');
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
    // (à plat en bac, la coque accrochée glisse de côté : seul un cisaillement franc compte en plus)
    const thr = THR * (1 - 0.4 * wl); // un canot chargé d'eau chavire plus facilement
    if (mag > thr + (lq === 1 ? 0.6 : 0)) {
      rate = (mag - thr) * 0.9 * tippy * (1 + wl);
      if (lean === sg) rate = -0.6; else if (lean === -sg) rate *= 2.2;
    }
    // Bac à plat : l'instabilité monte lentement. Gîté vers l'amont : elle monte vite.
    if (lq === 1) rate = Math.max(rate, 0.07 * kx * tippy); else if (lq === 2) rate = Math.max(rate, 0.6 * kx * tippy);
    b.instab += rate * dt;
  } else b.instab -= 0.6 * dt;
  b.instab = R.clamp(b.instab, 0, 1.05);
  if (b.instab >= 1) { b.instab = 0; b.ev.push('capsize'); }

  // Eau embarquée (rivières seulement) : trains de vagues (selon la vitesse par rapport à l'eau, et
  // plus encore de travers), rouleaux, instabilité élevée, gîte du mauvais côté en bac.
  if (wet > 0) {
    const fsp = Math.hypot(U.x, U.y), side = fsp > 0.3 ? Math.abs((U.x * nx + U.y * ny) / fsp) : 0;
    let inc = 0;
    for (let i = 0; i < rv.waves.length; i++) {
      const w = rv.waves[i], dy = b.y - w.y;
      if (dy < 0 || dy > w.len || Math.abs(b.x - w.x) > w.w / 2) continue;
      inc += 0.024 * w.k * (0.25 + Math.max(0, rfw)) * (1 + 1.5 * side);
    }
    for (let i = 0; i < rv.holes.length; i++) {
      const h = rv.holes[i], dy = b.y - h.y;
      if (dy < -0.5 || dy > h.len || Math.abs(b.x - h.x) > h.w / 2) continue;
      inc += 0.12 * h.k * (1 + side);
    }
    if (b.instab > 0.6) inc += 0.25 * (b.instab - 0.6);
    if (lq === 2) inc += 0.08 * kx;
    if (inc > 0) {
      b.water = Math.min(1, wl + inc * wet * dt);
      if (b.water >= 1) { b.ev.push('swamp'); return; }
    }
  }

  // Collisions : la coque est approchée par cinq cercles.
  // Cravate : le canot touche une roche de travers (plus de 55 degrés avec le courant), vers le milieu de la
  // coque, dans un courant fort (plus de 2,2 m/s). Sans gîte vers la roche pendant 0,6 s, le courant le plaque
  // et le remplit. Avec la bonne gîte, le courant passe sous la coque et le canot glisse le long de la roche.
  let hit = 0, pin = 0; b.hitCd -= dt;
  // Courant d'arrivée mesuré 3 m en amont (près de la roche, le coussin dévie l'eau).
  rv.flow(b.x, b.y - 3, A2);
  const fl = Math.hypot(A2.x, A2.y), trav = fl > 2.2 && Math.abs((A2.x * nx + A2.y * ny) / fl) > (b.pinT > 0 ? 0.55 : 0.82);
  for (let i = 0; i < 5; i++) {
    const o = OFFS[i], rxo = o * fx, ryo = o * fy;
    for (let j = 0; j < rv.rocks.length; j++) {
      const k = rv.rocks[j], py = b.y + ryo, dy = py - k.y, rr = k.r + RC;
      if (dy > rr || dy < -rr) continue;
      const dx = b.x + rxo - k.x, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01;
      hit = Math.max(hit, impulse(b, rxo, ryo, dx / d, dy / d, rr - d, 0.15));
      if (trav && Math.abs(o) <= 1) pin = (k.x - b.x) * nx + (k.y - b.y) * ny > 0 ? 1 : -1; // côté de la roche
    }
    const px = b.x + rxo, py = b.y + ryo;
    rv.at(py, A);
    const il = 1 / Math.hypot(1, A.dcx), left = A.cx - A.hw + RC, right = A.cx + A.hw - RC;
    // Berge basse : on s'échoue doucement (frottement). Falaise : on rebondit, sans frottement de plage.
    if (px < left) { const cl = rv.bankType('L', py) === 'cliff'; impulse(b, rxo, ryo, il, -A.dcx * il, (left - px) * il, cl ? 0.3 : 0); if (!cl) { b.vx *= 1 - 1.5 * dt; b.vy *= 1 - 1.5 * dt; } }
    else if (px > right) { const cl = rv.bankType('R', py) === 'cliff'; impulse(b, rxo, ryo, -il, A.dcx * il, (px - right) * il, cl ? 0.3 : 0); if (!cl) { b.vx *= 1 - 1.5 * dt; b.vy *= 1 - 1.5 * dt; } }
    for (let j = 0; j < rv.strainers.length; j++) if (segDist(px, py, rv.strainers[j]) < 0.9) { b.ev.push('passoire'); return; }
  }
  // Le contact est gardé en mémoire 0,3 s : le canot rebondit un peu sur la roche sans s'en dégager.
  b.travCd = (b.travCd || 0) - dt;
  if (pin) { if (!(b.pinC > 0) && b.travCd <= 0) { b.travCd = 2; b.ev.push('travers'); if (wet > 0) b.water = Math.min(0.99, (b.water || 0) + 0.05); } b.pinC = 0.3; b.pinS = pin; }
  else if (b.pinC > 0) b.pinC -= dt;
  if (assist && b.pinC > 0 && trav) { lean = b.pinS; b.lean = lean; } // avec aide, l'équipier gîte vers la roche
  if (b.pinC > 0 && trav) {
    const ps = b.pinS;
    if (lean === ps) { // bonne gîte : le canot glisse le long de la roche, dans le sens du courant
      const tx = -ny * ps, ty = nx * ps, sg = (A2.x * tx + A2.y * ty) >= 0 ? 1 : -1;
      b.vx += tx * sg * 1.6 * dt; b.vy += ty * sg * 1.6 * dt; b.pinT = 0;
    } else {
      // Mauvaise gîte : la pression de l'eau plaque la coque contre la roche (elle ne pivote presque plus).
      if (!assist) { b.om *= 1 / (1 + 5 * dt); b.vx += A2.x / fl * 1.2 * dt; b.vy += A2.y / fl * 1.2 * dt; }
      if ((b.pinT = (b.pinT || 0) + dt) > 0.6 && !assist) { b.pinT = 0; b.pinC = 0; b.ev.push('cravate'); return; }
    }
  } else b.pinT = 0;
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
  let av = false;
  for (let j = 0; j < rv.rocks.length; j++) { // contourne la roche droit devant
    const k = rv.rocks[j], dy = k.y - b.y;
    if (dy > -1 && dy < 13 && Math.abs(k.x - b.x) < k.r + 2 && ty > k.y) {
      // Si la cible est le contre-courant de cette roche, on la frôle de plus près.
      const eddyT = ty < k.y + k.Le && Math.abs(tx - k.x) < k.w + 1;
      // Déjà à côté de la roche : on la contourne de ce côté-là, sans passer devant sa face amont.
      let sd = dy < k.r + 1 ? (b.x >= k.x ? 1 : -1) : Math.abs(tx - k.x) > 0.8 ? Math.sign(tx - k.x) : (b.x >= k.x ? 1 : -1);
      // Pas assez de place entre la roche et la berge pour le canot : on passe de l'autre côté.
      const gap = s0 => s0 > 0 ? rv.cxAt(k.y) + rv.hwAt(k.y) - k.x - k.r : k.x - k.r - rv.cxAt(k.y) + rv.hwAt(k.y);
      if (gap(sd) < 5.5 && gap(-sd) > gap(sd)) sd = -sd;
      tx = k.x + sd * (k.r + (eddyT ? 2.6 : 3.6)); ty = k.y + 1; av = true; break;
    }
  }
  if (!av) for (let j = 0; j < rv.holes.length; j++) { // et le rouleau droit devant
    const k = rv.holes[j], dy = k.y - b.y, r = k.w / 2;
    if (dy > -1 && dy < 15 && Math.abs(k.x - b.x) < r + 1.8 && ty > k.y) { const sd = Math.abs(tx - k.x) > 0.8 ? Math.sign(tx - k.x) : (b.x >= k.x ? 1 : -1); tx = k.x + sd * (r + 3); ty = k.y + 2; break; }
  }
  // Suit l'eau profonde : si la ligne vers la cible passe sur un haut-fond, vise la veine principale.
  if (rv.bars && rv.bars.length && ty - b.y > 5) {
    for (const la of [5, 9, 14]) {
      if (ty - b.y <= la) break;
      const yy = b.y + la, xl = b.x + (tx - b.x) * la / (ty - b.y);
      if (rv.depth(xl, yy) >= 0.55) continue;
      const c = rv.cxAt(yy), h = rv.hwAt(yy); let bx = xl, bs = -9;
      for (let i = -12; i <= 12; i++) {
        const x = c + i / 13 * h, d = Math.min(0.9, rv.depth(x, yy)) - Math.abs(x - xl) * 0.02;
        if (d > bs) { bs = d; bx = x; }
      }
      tx = bx; ty = yy; break;
    }
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
  let ep = err - b.om * 0.6;
  if (Math.abs(err) > 2.6 && Math.abs(b.om) > 0.15) ep = Math.sign(b.om); // demi-tour : on continue dans le même sens
  inp.left = ep < -0.1; inp.right = ep > 0.1;
  const fx = Math.sin(b.th), fy = Math.cos(b.th), lat = wx * fy - wy * fx; // composante voulue vers la droite du canot
  // Pivot bloqué par le courant (sortie de contre-courant) : on pagaie aussi vers l'avant pour sortir.
  const stall = Math.abs(err) >= 1.0 && Math.abs(b.om) < 0.15;
  inp.fwd = !back && wsp > 0.35 && (Math.abs(err) < 1.0 || stall);
  // Dans un train de vagues (ou juste avant), on ne fonce pas : le canot embarque moins d'eau.
  if (inp.fwd && Math.abs(err) < 0.5) for (let i = 0; i < rv.waves.length; i++) {
    const w = rv.waves[i], dy = b.y - w.y;
    if (dy > -5 && dy < w.len && Math.abs(b.x - w.x) < w.w / 2 + 1.5) { inp.fwd = false; break; }
  }
  // Rétro dosé : on recule par rapport à l'eau tant qu'on ne recule pas encore assez.
  inp.back = !!back && Math.abs(err) < 1.0 && ((b.vx - U.x) * fx + (b.vy - U.y) * fy) > (wx * fx + wy * fy) + 0.05;
  // Déplacement latéral pour s'aligner (porte, roche) quand le cap est presque bon.
  inp.latL = Math.abs(err) < 0.6 && lat < -0.25; inp.latR = Math.abs(err) < 0.6 && lat > 0.25;

  // Gîte vers le côté demandé par le courant (utile quand l'assistance est coupée).
  inp.leanL = b.need < 0; inp.leanR = b.need > 0;
}

// Pilote naïf (tests de difficulté) : propulsion continue, il pivote vers la prochaine cible,
// sans anticipation, sans déplacement latéral, sans rétro, sans arrêt voulu et sans gîte à la main.
function naive(b, tx, ty, inp) {
  let err = Math.atan2(tx - b.x, ty - b.y) - b.th;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  inp.left = err < -0.1; inp.right = err > 0.1; inp.fwd = true;
  inp.back = inp.latL = inp.latR = inp.leanL = inp.leanR = false;
}

R.sim = { newBoat, stepCanoe, stepSwim, bot, strokes, naive };
})();
