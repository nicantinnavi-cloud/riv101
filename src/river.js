(function () {
'use strict';
// Construit une rivière à partir d'une définition de niveau.
// Repère : x vers la rive droite, y vers l'aval (en mètres). Les décalages « o » des
// niveaux sont mesurés depuis le centre de la rivière ('L' / 'R' = collé à une rive).
R.buildRiver = function (def) {
  const L = def.len, n = L + 1, P = def.path;
  const cx = new Float32Array(n), hw = new Float32Array(n), vb = new Float32Array(n), dcx = new Float32Array(n), skew = new Float32Array(n);
  let k = 0;
  for (let i = 0; i < n; i++) {
    while (k < P.length - 2 && i >= P[k + 1][0]) k++;
    const a = P[k], b = P[k + 1], t = R.sstep(a[0], b[0], i);
    cx[i] = R.lerp(a[1], b[1], t); hw[i] = R.lerp(a[2], b[2], t); vb[i] = R.lerp(a[3], b[3], t);
  }
  for (let i = 0; i < n; i++) dcx[i] = (cx[Math.min(n - 1, i + 1)] - cx[Math.max(0, i - 1)]) / 2;
  // Dans un virage, la veine se déporte vers l'extérieur (drossage).
  const raw = new Float32Array(n);
  for (let i = 1; i < n - 1; i++) raw[i] = R.clamp(-(dcx[i + 1] - dcx[i - 1]) / 2 * 12, -0.45, 0.45);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6); j++) { s += raw[j]; c++; } skew[i] = s / c; }

  const rv = { def, L, rocks: [], holes: [], waves: [], strainers: [], vs: [], seuil: null, portage: null };
  rv.at = function (y, o) {
    const f = R.clamp(y, 0, L - 0.001), i = f | 0, t = f - i;
    o.cx = cx[i] + (cx[i + 1] - cx[i]) * t; o.hw = hw[i] + (hw[i + 1] - hw[i]) * t; o.vb = vb[i] + (vb[i + 1] - vb[i]) * t;
    o.dcx = dcx[i] + (dcx[i + 1] - dcx[i]) * t; o.skew = skew[i] + (skew[i + 1] - skew[i]) * t; return o;
  };
  const T = {};
  rv.cxAt = y => rv.at(y, T).cx;
  rv.hwAt = y => rv.at(y, T).hw;
  const X = (o, y, r) => o === 'L' ? rv.cxAt(y) - rv.hwAt(y) + (r || 0) * 0.35 : o === 'R' ? rv.cxAt(y) + rv.hwAt(y) - (r || 0) * 0.35 : rv.cxAt(y) + o;

  (def.rocks || []).forEach((q, i) => { const r = q[2]; rv.rocks.push({ x: X(q[0], q[1], r), y: q[1], r, Le: 5 * r + 2, w: 1.3 * r, bank: typeof q[0] === 'string', id: i }); });
  (def.holes || []).forEach(q => rv.holes.push({ x: X(q[0], q[1]), y: q[1], w: q[2], len: 3.5 }));
  (def.waves || []).forEach(q => rv.waves.push({ x: X(q[0], q[1]), y: q[1], w: q[2], len: q[3] }));
  (def.strainers || []).forEach(q => { const x0 = X(q[0], q[1]), s = q[0] === 'L' ? 1 : -1; rv.strainers.push({ x0, y0: q[1], x1: x0 + s * q[2], y1: q[1] + q[2] * 0.35 }); });
  (def.vs || []).forEach(q => rv.vs.push({ x: X(q[0], q[1]), y: q[1] }));
  if (def.seuil) rv.seuil = { y: def.seuil.y, safe: !!def.seuil.safe };
  if (def.portage) rv.portage = def.portage;

  // Vitesse de l'eau au point (x, y).
  const A = {};
  rv.flow = function (x, y, out) {
    rv.at(y, A);
    const p = (x - A.cx) / A.hw;
    if (p <= -1 || p >= 1) { out.x = 0; out.y = 0; out.land = true; return out; }
    out.land = false;
    const sk = A.skew; let q = p - sk; q = q > 0 ? q / (1 - sk) : q / (1 + sk);
    const sp = A.vb * (0.12 + 0.88 * Math.pow(1 - q * q, 0.75)), il = 1 / Math.hypot(A.dcx, 1);
    let mult = 1, ax = 0, ay = 0;
    for (let i = 0; i < rv.rocks.length; i++) {
      const k = rv.rocks[i], dy = y - k.y;
      if (dy < -3.5 * k.r || dy > k.Le) continue;
      const dx = x - k.x;
      if (dy > -0.3 * k.r) { // contre-courant derrière la roche
        const t = dy / k.Le, w = k.w * (1 - t * t) + 0.2, a = Math.abs(dx) / w;
        if (a < 1.15) mult -= 1.35 * R.sstep(1.15, 0.55, a) * R.sstep(1, 0.7, t) * R.sstep(-0.3 * k.r, 0.4 * k.r, dy);
      }
      if (dy < 0.5 * k.r) { // coussin : l'eau contourne la roche
        const d = Math.hypot(dx, dy), R2 = 3.4 * k.r;
        if (d < R2 && d > 0.01) { const kk = 1 - d / R2, s2 = sp * kk * kk; ax += dx / d * s2 * 0.9; ay += dy / d * s2 * 0.55; }
      }
    }
    for (let i = 0; i < rv.holes.length; i++) {
      const h = rv.holes[i], dy = y - h.y;
      if (dy > -0.5 && dy < h.len) { const a = Math.abs(x - h.x) / (h.w / 2); if (a < 1) mult -= 1.5 * R.sstep(1, 0.8, a) * R.sstep(-0.5, 0.3, dy) * R.sstep(h.len, h.len - 0.8, dy); }
    }
    if (mult < -0.5) mult = -0.5;
    out.x = sp * A.dcx * il * mult + ax; out.y = sp * il * mult + ay; return out;
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
    if (rv.portage) { const z = rv.portage, y = (z.y0 + z.y1) / 2; f.push({ type: 'portage', x: z.side === 'L' ? rv.cxAt(y) - rv.hwAt(y) + 4 : rv.cxAt(y) + rv.hwAt(y) - 4, y, r: Math.max(9, (z.y1 - z.y0) / 2 + 2) }); }
    return f;
  };
  return rv;
};
})();
