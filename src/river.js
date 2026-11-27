(function () {
'use strict';
// Construit une rivière à partir d'une définition de niveau.
// Repère : x vers la rive droite, y vers l'aval (en mètres). Les décalages « o » des
// niveaux sont mesurés depuis le centre de la rivière ('L' / 'R' = collé à une rive).
// Niveaux d'eau : v = courant, d = décalage de profondeur (m), w = largeur, rk = rayon des roches,
// hk = force des rouleaux, wk = force des vagues, ek = contre-courants, sl = longueur des passoires,
// tip = instabilité, wet = eau embarquée.
R.NIVEAUX = {
  bas: { v: 0.75, d: -0.45, w: 1, rk: 1.15, hk: 0.6, wk: 0.65, ek: 1, sl: 1, tip: 0.85, wet: 0.6 },
  moyen: { v: 1, d: 0, w: 1, rk: 1, hk: 1, wk: 1, ek: 1, sl: 1, tip: 1, wet: 1 },
  haut: { v: 1.35, d: 0.6, w: 1.08, rk: 1, hk: 1.35, wk: 1.45, ek: 0.7, sl: 1.3, tip: 1.2, wet: 1.6 }
};
// Classe affichée : un cran de plus en eau haute.
R.clsFor = function (def, niv) {
  if (niv !== 'haut') return def.cls;
  return { R1: 'R2', R2: 'R2+', 'R2+': 'R3', R3: 'R3+' }[def.cls] || def.cls;
};
R.buildRiver = function (def, niveau) {
  const niv = R.NIVEAUX[niveau] ? niveau : 'moyen', NV = R.NIVEAUX[niv];
  const L = def.len, n = L + 1, P = def.path;
  const cx = new Float32Array(n), hw = new Float32Array(n), vb = new Float32Array(n), dcx = new Float32Array(n), skew = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    while (k < P.length - 2 && i >= P[k + 1][0]) k++;
    const a = P[k], b = P[k + 1], t = R.sstep(a[0], b[0], i);
    cx[i] = R.lerp(a[1], b[1], t); hw[i] = R.lerp(a[2], b[2], t) * NV.w; vb[i] = R.lerp(a[3], b[3], t) * NV.v;
  }
  for (let i = 0; i < n; i++) dcx[i] = (cx[Math.min(n - 1, i + 1)] - cx[Math.max(0, i - 1)]) / 2;
  // Dans un virage, la veine se déporte vers l'extérieur (drossage).
  const raw = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) raw[i] = R.clamp(-(dcx[i + 1] - dcx[i - 1]) / 2 * 12, -0.45, 0.45);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6); j++) { s += raw[j]; c++; } skew[i] = s / c; }

  const D0 = def.depth || 1.2, CU = niv === 'haut' ? 1.35 : 1; // coussins plus marqués en eau haute
  // Contre-courants : longueur EL * r + 3 m, demi-largeur EW * r + 0,3 m juste derrière la roche,
  // remontée vers la roche (ES : 1,35 = l’eau remonte à 35 % de la vitesse du courant au centre).
  const EL = 5.2, EW = 1.4, ES = 1.35, CT = 0.5;
  const rv = { def, L, niveau: niv, nv: NV, D0, rocks: [], holes: [], waves: [], strainers: [], vs: [], bars: [], seuil: null, portage: null };
  rv.at = function (y, o) {
    const f = R.clamp(y, 0, L - 0.001), i = f | 0, t = f - i;
    o.cx = cx[i] + (cx[i + 1] - cx[i]) * t; o.hw = hw[i] + (hw[i + 1] - hw[i]) * t; o.vb = vb[i] + (vb[i + 1] - vb[i]) * t;
    o.dcx = dcx[i] + (dcx[i + 1] - dcx[i]) * t; o.skew = skew[i] + (skew[i + 1] - skew[i]) * t; return o;
  };
  const T = {};
  rv.cxAt = y => rv.at(y, T).cx;
  rv.hwAt = y => rv.at(y, T).hw;
  const X = (o, y, r) => o === 'L' ? rv.cxAt(y) - rv.hwAt(y) + (r || 0) * 0.35 : o === 'R' ? rv.cxAt(y) + rv.hwAt(y) - (r || 0) * 0.35 : rv.cxAt(y) + o;

  // Eau haute : les petites roches de plein courant passent sous l'eau et deviennent des rouleaux.
  // Les grosses gardent un contre-courant plus court et plus faible.
  (def.rocks || []).forEach((q, i) => {
    const bank = typeof q[0] === 'string', r = bank ? q[2] : q[2] * NV.rk;
    if (niv === 'haut' && !bank && q[2] < 2.2) { rv.holes.push({ x: X(q[0], q[1]), y: q[1] + 0.4 * r, w: 2 * r + 1.4, len: 2.6, k: 0.55, sub: true }); return; }
    const ek = bank ? 1 : NV.ek;
    rv.rocks.push({ x: X(q[0], q[1], r), y: q[1], r, Le: (EL * r + 3) * ek, w: EW * r + 0.3, ek: niv === 'haut' && !bank ? 0.75 : 1, bank, id: i });
  });
  (def.holes || []).forEach(q => rv.holes.push({ x: X(q[0], q[1]), y: q[1], w: q[2] * (niv === 'haut' ? 1.15 : 1), len: 3.5, k: NV.hk }));
  (def.waves || []).forEach(q => rv.waves.push({ x: X(q[0], q[1]), y: q[1], w: q[2], len: q[3] * (niv === 'haut' ? 1.15 : niv === 'bas' ? 0.85 : 1), k: NV.wk }));
  (def.strainers || []).forEach(q => { const x0 = X(q[0], q[1]), s = q[0] === 'L' ? 1 : -1, l = q[2] * NV.sl; rv.strainers.push({ x0, y0: q[1], x1: x0 + s * l, y1: q[1] + l * 0.35 }); });
  // Bancs de gravier et hauts-fonds : ellipses qui retranchent jusqu'à h mètres.
  (def.bars || []).forEach(q => { const rx = q[2]; rv.bars.push({ x: typeof q[0] === 'string' ? X(q[0], q[1], rx * 1.4) : X(q[0], q[1]), y: q[1], rx, ry: q[3], h: q[4] == null ? 1 : q[4] }); });
  (def.vs || []).forEach(q => rv.vs.push({ x: X(q[0], q[1]), y: q[1] }));
  if (def.seuil) rv.seuil = { y: def.seuil.y, safe: !!def.seuil.safe };
  if (def.portage) rv.portage = def.portage;
  // Types de berge : 'cliff' (falaise, on ne sort pas) sur les tronçons listés, berge basse ailleurs.
  rv.banks = (def.banks || []).map(q => ({ side: q[0], y0: q[1], y1: q[2], type: q[3] || 'cliff' }));
  rv.bankType = function (side, y) {
    for (let i = 0; i < rv.banks.length; i++) { const k = rv.banks[i]; if (k.side === side && y >= k.y0 && y <= k.y1) return k.type; }
    return 'low';
  };

  // Profondeur (m) sans les roches : profil en travers, plus creux à l'extérieur des virages,
  // moins des bancs, plus le décalage du niveau d'eau. Négatif = gravier à sec.
  function baseDepth(x, y, p, q, sk) {
    const side = sk > 0 ? p : -p, out = side > 0 ? side * Math.abs(sk) * 1.3 : 0;
    let d = D0 * (0.12 + 0.88 * Math.pow(Math.max(0, 1 - q * q), 0.6)) * (1 + out) + NV.d;
    for (let i = 0; i < rv.bars.length; i++) {
      const b = rv.bars[i], ey = (y - b.y) / b.ry; if (ey > 1 || ey < -1) continue;
      const ex = (x - b.x) / b.rx; if (ex > 1 || ex < -1) continue;
      const e = Math.sqrt(ex * ex + ey * ey); if (e < 1) d -= b.h * R.sstep(1, 0.55, e);
    }
    return d;
  }
  // Halo moins profond autour d'une roche (pas pour les pointes de berge).
  // Derrière la roche, le contre-courant creuse une fosse un peu plus profonde (valeur négative = plus creux).
  const halo = (k, dx, dy) => {
    let v = 0;
    if (dy > 0 && dy < k.Le) { const t = dy / k.Le, a = Math.abs(dx) / (k.w + 1); if (a < 1) v -= 0.3 * R.sstep(1, 0.5, a) * R.sstep(1, 0.5, t) * R.sstep(0, k.r, dy); }
    if (k.bank) return v;
    const d = Math.hypot(dx, dy); return v + (d < k.r + 1.8 ? 0.35 * R.sstep(k.r + 1.8, k.r, d) : 0);
  };

  // Vitesse de l'eau au point (x, y). out.d reçoit la profondeur.
  const A = {};
  rv.flow = function (x, y, out) {
    rv.at(y, A);
    const p = (x - A.cx) / A.hw;
    if (p <= -1 || p >= 1) { out.x = 0; out.y = 0; out.land = true; out.d = -0.5; return out; }
    out.land = false;
    const sk = A.skew; let q = p - sk; q = q > 0 ? q / (1 - sk) : q / (1 + sk);
    let sp = A.vb * (0.12 + 0.88 * Math.pow(1 - q * q, 0.75)), dep = baseDepth(x, y, p, q, sk);
    const il = 1 / Math.hypot(A.dcx, 1);
    let mult = 1, ax = 0, ay = 0;
    for (let i = 0; i < rv.rocks.length; i++) {
      const k = rv.rocks[i], dy = y - k.y;
      if (dy < -3.5 * k.r || dy > k.Le) continue;
      const dx = x - k.x;
      dep -= halo(k, dx, dy);
      if (dy > -0.3 * k.r) { // contre-courant derrière la roche
        // Largeur : dans l'ombre de la roche à sa hauteur, puis le contre-courant s'ouvre derrière elle avant de se refermer.
        const t = dy / k.Le, w = Math.min(k.w * (1 - 0.85 * t * t) + 0.2, k.r * 0.8 + 0.55 * Math.max(0, dy)), a = Math.abs(dx) / w;
        // En eau haute, la ligne de cisaillement est plus brusque (transition plus étroite).
        // Contre la face aval de la roche, l'eau est presque immobile ; la remontée est franche un peu plus loin.
        if (a < 1.2) mult -= (1 + (ES - 1) * R.sstep(0.2, 2.2, Math.hypot(dx, dy) - k.r)) * k.ek * (niv === 'haut' ? R.sstep(1.05, 0.8, a) : R.sstep(1.2, 0.6, a)) * R.sstep(1, 0.7, t) * R.sstep(-0.3 * k.r, 0.4 * k.r, dy);
      }
      if (dy < 0.5 * k.r) { // coussin : l'eau contourne la roche
        const d = Math.hypot(dx, dy), R2 = 3.4 * k.r;
        // (la poussée vers l'extérieur s'éteint à la hauteur de la roche : l'eau se referme derrière elle)
        if (d < R2 && d > 0.01) { const kk = 1 - d / R2, s2 = sp * kk * kk * CU; ax += dx / d * s2 * 0.9 * R.sstep(CT * k.r, -0.3 * k.r, dy); ay += dy / d * s2 * 0.55; }
      }
    }
    for (let i = 0; i < rv.holes.length; i++) {
      const h = rv.holes[i], dy = y - h.y;
      if (dy > -0.5 && dy < h.len) { const a = Math.abs(x - h.x) / (h.w / 2); if (a < 1) mult -= 1.5 * h.k * R.sstep(1, 0.8, a) * R.sstep(-0.5, 0.3, dy) * R.sstep(h.len, h.len - 0.8, dy); }
    }
    if (mult < -0.5) mult = -0.5;
    // Le courant ralentit sur un haut-fond.
    const sl = dep >= 0.5 ? 1 : 0.15 + 0.85 * R.sstep(-0.05, 0.5, dep);
    out.d = dep;
    out.x = (sp * A.dcx * il * mult + ax) * sl; out.y = (sp * il * mult + ay) * sl; return out;
  };
  // Profondeur seule (m). Hors de l'eau : -0.5.
  rv.depth = function (x, y) {
    rv.at(y, A);
    const p = (x - A.cx) / A.hw;
    if (p <= -1 || p >= 1) return -0.5;
    const sk = A.skew; let q = p - sk; q = q > 0 ? q / (1 - sk) : q / (1 + sk);
    let d = baseDepth(x, y, p, q, sk);
    for (let i = 0; i < rv.rocks.length; i++) { const k = rv.rocks[i], dy = y - k.y; if (dy > -k.r - 2 && dy < Math.max(k.r + 2, k.Le)) d -= halo(k, x - k.x, dy); }
    return d;
  };
  // Profondeur maximale de la section et sa position (veine principale).
  rv.deepest = function (y) {
    rv.at(y, A); const c = A.cx, h = A.hw; let bx = c, bd = -9;
    for (let i = -24; i <= 24; i++) { const x = c + i / 25 * h, d = rv.depth(x, y); if (d > bd) { bd = d; bx = x; } }
    return { x: bx, d: bd };
  };

  // Éléments à reconnaître pendant le repérage.
  rv.features = function () {
    const f = [];
    for (const k of rv.rocks) {
      const c = rv.cxAt(k.y);
      if (!k.bank) f.push({ type: 'vamont', x: k.x, y: k.y, r: Math.max(3.5, k.r + 2) });
      if (k.r >= 2) f.push({ type: 'contre', x: k.bank ? k.x + (k.x < c ? 1 : -1) * k.w * 0.45 : k.x, y: k.y + 0.35 * k.Le, r: Math.max(4.5, k.w + 1.5) });
    }
    for (const v of rv.vs) f.push({ type: 'vaval', x: v.x, y: v.y - 4, r: 6.5 });
    for (const h of rv.holes) f.push({ type: 'rouleau', x: h.x, y: h.y + 1.5, r: Math.max(4.5, h.w / 2 + 1.5) });
    for (const w of rv.waves) f.push({ type: 'vagues', x: w.x, y: w.y + w.len / 2, r: Math.max(5, w.len / 2) });
    for (const s of rv.strainers) f.push({ type: 'passoire', x: (s.x0 + s.x1) / 2, y: (s.y0 + s.y1) / 2, r: 6.5 });
    if (rv.seuil) f.push({ type: 'seuil', x: rv.cxAt(rv.seuil.y), y: rv.seuil.y, r: 5 });
    for (const k of rv.banks) if (k.type === 'cliff') { // un point par tronçon ; le repérage teste toute la paroi
      const y = (k.y0 + k.y1) / 2;
      f.push({ type: 'falaise', side: k.side, y0: k.y0, y1: k.y1, x: k.side === 'L' ? rv.cxAt(y) - rv.hwAt(y) : rv.cxAt(y) + rv.hwAt(y), y, r: Math.max(8, (k.y1 - k.y0) / 2) });
    }
    // Hauts-fonds : bancs où l'eau reste peu profonde à ce niveau. Veine principale : là où l'eau est la plus profonde.
    for (const b of rv.bars) {
      if (rv.depth(b.x, b.y) < 0.4) f.push({ type: 'hautfond', x: b.x, y: b.y, r: Math.max(3, Math.min(b.rx, b.ry)), bar: b });
      const v = rv.deepest(b.y); f.push({ type: 'veine', x: v.x, y: b.y, r: 3 });
    }
    if (rv.portage) { const z = rv.portage, y = (z.y0 + z.y1) / 2; f.push({ type: 'portage', x: z.side === 'L' ? rv.cxAt(y) - rv.hwAt(y) + 4 : rv.cxAt(y) + rv.hwAt(y) - 4, y, r: Math.max(9, (z.y1 - z.y0) / 2 + 2) }); }
    return f;
  };
  // Roches d'eau basse (lowRocks = [o, y, r]) : elles émergent en eau basse ; en eau moyenne, ce sont des
  // roches à fleur d'eau (tache pâle où le canot racle, sans collision) ; en eau haute, elles disparaissent
  // sous l'eau foncée, et les plus grosses deviennent de petits rouleaux.
  (def.lowRocks || []).forEach((q, i) => {
    const r = q[2], x = X(q[0], q[1]), y = q[1];
    if (niv === 'bas') rv.rocks.push({ x, y, r, Le: 5 * r + 2, w: 1.3 * r, ek: 1, bank: false, low: true, id: 100 + i });
    else if (niv === 'moyen') rv.bars.push({ x, y, rx: r * 1.3, ry: r * 1.3, h: Math.max(0, rv.depth(x, y) - 0.15), low: true });
    else if (r >= 1.4) rv.holes.push({ x, y: y + 0.4 * r, w: 2 * r + 1, len: 2.4, k: 0.5, sub: true });
  });
  return rv;
};
})();
