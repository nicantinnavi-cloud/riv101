(function () {
'use strict';
// Physique du canot et du nageur.
// Cap « th » : 0 = pointe vers l'aval, positif = tourne à droite.
// Le canot est porté par l'eau en deux points (avant, arrière) : c'est la différence de
// courant entre les deux qui fait pivoter le canot en entrant dans un contre-courant.
const D = 2.0, CF = 0.36, CL = 1.6, I = 2.5, KX = 1.0, AP = 2.0, ALP = 7.5, RC = 0.5, THR = 1.3;
const OFFS = [-2, -1, 0, 1, 2], U = {}, A = {};

function newBoat(x, y, th) {
  return { x, y, py: y, vx: 0, vy: 0, th: th || 0, om: 0, lean: 0, need: 0, instab: 0, mode: 'canoe', hitCd: 0, ev: [], hearts: 3, active: false, safeT: 0, sth: 0, sdir: 0, water: 0, depth: 9, scrape: 0, grounded: false, bailing: false };
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

// Frottement sur le fond selon la profondeur : racle sous 0,35 m, presque échoué sous 0,12 m.
const SCRAPE = 0.35, GROUND = 0.12;
function bottom(d) { return d >= SCRAPE ? 0 : 1.6 * R.sstep(SCRAPE, GROUND, d) + 5.5 * R.sstep(GROUND, -0.05, d); }

// wet : facteur d'eau embarquée (0 dans les leçons).
function stepCanoe(b, inp, rv, dt, assist, tippy, wet) {
  const fx = Math.sin(b.th), fy = Math.cos(b.th), nx = fy, ny = -fx;
  const wl = b.water || 0, pad = !b.bailing;
  let ax = 0, ay = 0, al = 0, wb = 0, ws = 0, fr = 0, dmin = 9, rfw = 0;
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
  // Un canot chargé d'eau accélère moins et tourne moins bien.
  const pw = 1 - 0.45 * wl, tw = 1 - 0.4 * wl;
  if (pad && inp.fwd) { ax += AP * pw * fx; ay += AP * pw * fy; }
  if (pad && inp.back) { ax -= AP * 0.75 * pw * fx; ay -= AP * 0.75 * pw * fy; }
  if (pad && inp.left) al -= ALP * tw;
  if (pad && inp.right) al += ALP * tw;
  b.py = b.y;
  b.vx += ax * dt; b.vy += ay * dt; b.om += al * dt;
  // Le fond freine le canot par rapport au sol (et non par rapport à l'eau).
  if (fr > 0) { const k = 1 / (1 + fr * dt); b.vx *= k; b.vy *= k; b.om *= 1 / (1 + 0.6 * fr * dt); }
  b.depth = dmin; b.scrape = fr > 0 ? R.clamp(fr / 1.6, 0, 1) * R.clamp(Math.hypot(b.vx, b.vy) / 1.5, 0, 1) : 0;
  if (!b.grounded && dmin < GROUND) { b.grounded = true; b.ev.push('ground'); }
  else if (b.grounded && dmin > GROUND + 0.12) b.grounded = false;
  if (fr > 0 && Math.hypot(b.vx, b.vy) > 0.3) b.ev.push('scrape');
  b.x += b.vx * dt; b.y += b.vy * dt; b.th += b.om * dt;
  if (b.th > Math.PI) b.th -= 2 * Math.PI; else if (b.th < -Math.PI) b.th += 2 * Math.PI;

  // Équilibre : l'eau qui arrive de côté pousse sur la coque. On gîte vers l'aval de ce courant.
  rv.flow(b.x, b.y, U);
  const need = -((b.vx - U.x) * nx + (b.vy - U.y) * ny), mag = Math.abs(need), sg = need > 0 ? 1 : -1;
  let lean = (inp.leanR ? 1 : 0) - (inp.leanL ? 1 : 0);
  if (assist) lean = mag > 0.7 ? sg : 0;
  b.lean = lean; b.need = mag > 0.9 ? sg : 0;
  const thr = THR * (1 - 0.4 * wl);
  if (tippy > 0 && mag > thr) {
    let rate = (mag - thr) * 0.9 * tippy * (1 + wl);
    if (lean === sg) rate = -0.6; else if (lean === -sg) rate *= 2.2;
    b.instab += rate * dt;
  } else b.instab -= 0.6 * dt;
  b.instab = R.clamp(b.instab, 0, 1.05);
  if (b.instab >= 1) { b.instab = 0; b.ev.push('capsize'); }

  // Eau embarquée (rivières seulement) : trains de vagues, rouleaux, gîte ratée.
  if (wet > 0) {
    const fsp = Math.hypot(U.x, U.y), side = fsp > 0.3 ? Math.abs((U.x * nx + U.y * ny) / fsp) : 0;
    let inc = 0;
    for (let i = 0; i < rv.waves.length; i++) {
      const w = rv.waves[i], dy = b.y - w.y;
      if (dy < 0 || dy > w.len || Math.abs(b.x - w.x) > w.w / 2) continue;
      inc += 0.018 * w.k * (0.25 + Math.max(0, rfw)) * (1 + 1.5 * side);
    }
    for (let i = 0; i < rv.holes.length; i++) {
      const h = rv.holes[i], dy = b.y - h.y;
      if (dy < -0.5 || dy > h.len || Math.abs(b.x - h.x) > h.w / 2) continue;
      inc += 0.12 * h.k * (1 + side);
    }
    if (b.instab > 0.6) inc += 0.25 * (b.instab - 0.6);
    if (inc > 0) {
      b.water = Math.min(1, wl + inc * wet * dt);
      if (b.water >= 1) { b.ev.push('swamp'); return; }
    }
  }

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
function bot(b, rv, tx, ty, inp) {
  for (let j = 0; j < rv.rocks.length; j++) { // contourne la roche droit devant
    const k = rv.rocks[j], dy = k.y - b.y;
    if (dy > -1 && dy < 13 && Math.abs(k.x - b.x) < k.r + 2 && ty > k.y) { tx = k.x + (tx >= k.x ? 1 : -1) * (k.r + 3.6); ty = k.y + 1; break; }
  }
  // Suit l'eau profonde : si la ligne vers la cible passe sur un haut-fond, vise la veine principale.
  if (rv.bars.length && ty - b.y > 5) {
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
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(Math.max(2.4, Math.hypot(U.x, U.y) + 0.6), d * 0.6);
  const wx = dx / d * sp - U.x, wy = dy / d * sp - U.y, wsp = Math.hypot(wx, wy);
  let err = Math.atan2(wx, wy) - b.th;
  while (err > Math.PI) err -= 2 * Math.PI;
  while (err < -Math.PI) err += 2 * Math.PI;
  inp.left = err < -0.12; inp.right = err > 0.12;
  inp.fwd = wsp > 0.35 && Math.abs(err) < 1.0; inp.back = false;
  // Gîte vers le côté demandé par le courant (utile quand l'assistance est coupée).
  inp.leanL = b.need < 0; inp.leanR = b.need > 0;
}

R.sim = { newBoat, stepCanoe, stepSwim, bot };
})();
