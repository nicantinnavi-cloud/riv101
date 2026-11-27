(function () {
'use strict';
// Rendu, partie 1 : tout ce qui ne bouge pas. Carte de profondeur, forêt, berges, falaises, sentier
// de portage et roches sont peints une seule fois dans des canvas hors écran (tuiles de 512 px à
// l'échelle de l'écran, sprites d'arbres et de roches), puis simplement recopiés à chaque image.
// Lumière unique : elle vient du haut à gauche de l'écran ; les ombres tombent vers le bas à droite,
// c'est-à-dire vers +x et vers l'amont (-y) dans le repère de la rivière.
const RB = R.RB = {};
const A = {}, B = {};
RB.C = {
  floor: '#28533a', dense: '#1b3d29', meadow: '#557f46', sand: '#d9c9a0', sandW: '#b9a77c', gravel: '#b8ad94',
  rock: '#8a908c', rockD: '#4c5554', rockL: '#b4b9b4', canot: '#d4432f', vfi: '#ffb629', ink: '#06202a', foam: '#f2fbf8'
};
const C = RB.C;
// Ombres : décalage (en mètres, repère de la rivière) d'un objet de hauteur 1.
RB.SH = { x: 0.55, y: -0.45 };

// Bruit de valeur lissé, déterministe (0..1).
function vn(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (i, j) => R.hash(i * 157.31 + j * 311.73 + s * 71.17);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
RB.vn = vn;

// ---------- Carte de profondeur ----------
// Calculée une fois par rivière et par niveau d'eau (2,5 px par mètre), dessinée avec lissage dans les
// tuiles. Foncé = profond (veine principale), turquoise, vert clair = peu profond, très pâle = haut-fond,
// gravier beige = à sec. La profondeur elle-même est gardée pour placer les galets.
const PX = 2.5, MAPS = new WeakMap();
const RAMP = [[-0.05, 205, 190, 152], [0.02, 196, 222, 196], [0.15, 164, 217, 186], [0.3, 108, 194, 168], [0.5, 44, 144, 150], [0.8, 20, 98, 117], [1.3, 12, 71, 92], [2.0, 7, 50, 70]];
function depthColor(d, out) {
  let i = 0; while (i < RAMP.length - 2 && d > RAMP[i + 1][0]) i++;
  const a = RAMP[i], b = RAMP[i + 1], t = R.clamp((d - a[0]) / (b[0] - a[0]), 0, 1);
  out[0] = a[1] + (b[1] - a[1]) * t; out[1] = a[2] + (b[2] - a[2]) * t; out[2] = a[3] + (b[3] - a[3]) * t;
}
function depthMap(rv) {
  const key = rv.def; let per = MAPS.get(key);
  if (per && per[rv.niveau]) return per[rv.niveau];
  if (!per) { per = {}; MAPS.set(key, per); }
  let xa = 1e9, xb = -1e9;
  for (let y = 0; y <= rv.L; y += 1) { rv.at(y, A); xa = Math.min(xa, A.cx - A.hw); xb = Math.max(xb, A.cx + A.hw); }
  xa -= 2; xb += 2; const ya = -2, yb = rv.L + 2;
  const w = Math.ceil((xb - xa) * PX), h = Math.ceil((yb - ya) * PX);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h), Dt = img.data, col = [0, 0, 0], D = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const y = ya + (j + 0.5) / PX; rv.at(y, A); const cx = A.cx, hw = A.hw * 0.995;
    for (let i = 0; i < w; i++) {
      // Hors de l'eau, on prolonge la valeur du bord : le lissage reste propre le long de la berge.
      const x = R.clamp(xa + (i + 0.5) / PX, cx - hw, cx + hw), d = rv.depth(x, y), o = j * w + i;
      D[o] = d; depthColor(d, col);
      Dt[o * 4] = col[0]; Dt[o * 4 + 1] = col[1]; Dt[o * 4 + 2] = col[2]; Dt[o * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return (per[rv.niveau] = { cv, D, gw: w, gh: h, xa, ya, w: w / PX, h: h / PX });
}
R.depthMap = depthMap;
RB.depthMap = depthMap;
// Profondeur interpolée dans la carte (rapide ; pour le décor seulement).
RB.depthAt = function (dm, x, y) {
  const fx = R.clamp((x - dm.xa) * PX - 0.5, 0, dm.gw - 1.001), fy = R.clamp((y - dm.ya) * PX - 0.5, 0, dm.gh - 1.001);
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, o = j * dm.gw + i, D = dm.D;
  return (D[o] * (1 - u) + D[o + 1] * u) * (1 - v) + (D[o + dm.gw] * (1 - u) + D[o + dm.gw + 1] * u) * v;
};

// ---------- Berges ----------
// Largeur de la plage (m) d'un côté (-1 gauche, 1 droite) ; 0 le long d'une falaise.
function cliffK(rv, sd, y) {
  const side = sd < 0 ? 'L' : 'R'; let k = 0;
  for (const b of rv.banks || []) if (b.side === side && b.type === 'cliff') k = Math.max(k, R.sstep(b.y0 - 2.5, b.y0 + 0.5, y) * R.sstep(b.y1 + 2.5, b.y1 - 0.5, y));
  return k;
}
RB.cliffK = cliffK;
function beachW(rv, sd, y) { return (0.8 + 1.9 * vn(y / 9, sd * 3.3, 5)) * (1 - cliffK(rv, sd, y)); }
function cliffW(sd, y) { return 4.6 + 1.6 * vn(y / 3.2, sd * 5, 3) + 0.8 * vn(y / 1.1, sd * 2, 4) + 0.9 * R.hash(Math.floor(y / 1.3) * 3.3 + sd); }
RB.cliffW = cliffW;
// Petite irrégularité de la ligne d'eau (dessin à la main ; la physique garde la berge exacte).
const wob = (sd, y) => 0.12 * Math.sin(y * 1.7 + sd) + 0.09 * Math.sin(y * 3.3 + sd * 2);

// Sentier de portage : de la bande d'arrêt jusqu'à la remise à l'eau, sur la terre.
RB.trail = function (rv, z) {
  const sd = z.side === 'L' ? -1 : 1, ym = (z.y0 + z.y1) / 2, pts = [], off = y => A.hw + 6 + 1.5 * Math.sin(y * 0.12);
  rv.at(ym, A); pts.push(A.cx + sd * (A.hw - 0.5), ym);
  for (let y = ym; y < z.toY; y += 2) { rv.at(y, A); pts.push(A.cx + sd * off(y), y); }
  rv.at(z.toY, A); pts.push(A.cx + sd * off(z.toY), z.toY, A.cx + sd * (A.hw - 0.5), z.toY);
  return pts;
};
function segDist(px, py, p) {
  let best = 1e9;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const x0 = p[i], y0 = p[i + 1], vx = p[i + 2] - x0, vy = p[i + 3] - y0, l = vx * vx + vy * vy || 1e-6;
    const t = R.clamp(((px - x0) * vx + (py - y0) * vy) / l, 0, 1), d = Math.hypot(px - x0 - vx * t, py - y0 - vy * t);
    if (d < best) best = d;
  }
  return best;
}

// ---------- Sprites d'arbres ----------
// Conifères vus de haut (étoiles à étages), quelques feuillus (couronnes en grappe), dont des
// feuillus d'automne. Ombre douce portée vers le bas à droite (mode riche seulement).
const TREES = new Map();
function star(g, n, r0, r1, rot, seed) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i / (n * 2) * 6.2832, j = 0.85 + 0.3 * R.hash(seed + i * 3.1), r = (i % 2 ? r1 : r0) * j;
    const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
}
function blobs(g, r, seed, n) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.2832 + R.hash(seed + i) * 0.8, d = i ? r * (0.38 + 0.12 * R.hash(seed * 3 + i)) : 0, rr = r * (i ? 0.48 + 0.14 * R.hash(seed + i * 7) : 0.62);
    const x = Math.cos(a) * d, y = Math.sin(a) * d; g.moveTo(x + rr, y); g.arc(x, y, rr, 0, 6.2832);
  }
}
function treeSprite(S, rich, kind, r, seed) {
  const sh = rich ? r * 0.75 : 0, pad = 2, half = Math.ceil(r * 1.15 * S) + pad, sz = half * 2 + Math.ceil(sh * S);
  const cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const g = cv.getContext('2d'); g.translate(half, half); g.scale(S, S);
  const shadow = col => { if (!rich) return; g.shadowColor = col; g.shadowBlur = r * 0.55 * S; g.shadowOffsetX = r * 0.5 * S; g.shadowOffsetY = r * 0.42 * S; };
  const noShadow = () => { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; };
  if (kind === 'c') { // conifère : trois étages d'aiguilles, plus clair vers la lumière
    const n = 7 + (seed % 3), rot = R.hash(seed) * 6.28;
    shadow('rgba(0,14,8,.55)'); g.fillStyle = '#183d25'; star(g, n, r, r * 0.52, rot, seed); g.fill(); noShadow();
    g.fillStyle = '#245433'; g.save(); g.translate(-0.08 * r, -0.08 * r); star(g, n, r * 0.74, r * 0.4, rot + 0.3, seed + 5); g.fill(); g.restore();
    g.fillStyle = '#33703f'; g.save(); g.translate(-0.15 * r, -0.15 * r); star(g, n - 1, r * 0.48, r * 0.27, rot + 0.6, seed + 9); g.fill(); g.restore();
    g.fillStyle = '#4f8f4f'; g.beginPath(); g.arc(-0.2 * r, -0.2 * r, r * 0.13, 0, 6.2832); g.fill();
  } else { // feuillu : grappe de boules, une face éclairée
    const pal = kind === 'a' ? ['#9c6a22', '#c98d2b', '#e5b84a'] : kind === 'b' ? ['#7d3f1f', '#b0582b', '#d98a3e'] : ['#2f6331', '#3f7d3a', '#64a04c'];
    shadow('rgba(0,14,8,.5)'); g.fillStyle = pal[0]; blobs(g, r, seed, 6); g.fill(); noShadow();
    g.fillStyle = pal[1]; g.save(); g.translate(-0.1 * r, -0.1 * r); g.scale(0.8, 0.8); blobs(g, r, seed + 2, 6); g.fill(); g.restore();
    g.fillStyle = pal[2]; g.save(); g.translate(-0.28 * r, -0.28 * r); g.scale(0.42, 0.42); blobs(g, r, seed + 4, 4); g.fill(); g.restore();
  }
  return { cv, o: half };
}
function treeSet(S, rich) {
  const key = S.toFixed(2) + (rich ? 'r' : 's'); let t = TREES.get(key);
  if (t) return t;
  if (TREES.size > 6) TREES.clear();
  t = { c: [], d: [], a: [] };
  [1.25, 1.6, 2.0, 2.5].forEach((r, i) => { for (let s = 0; s < 3; s++) t.c.push({ r, sp: treeSprite(S, rich, 'c', r, i * 10 + s * 3 + 1) }); });
  [1.9, 2.5, 3.1].forEach((r, i) => { for (let s = 0; s < 2; s++) t.d.push({ r, sp: treeSprite(S, rich, 'd', r, 40 + i * 10 + s * 3) }); });
  t.a.push({ r: 2.3, sp: treeSprite(S, rich, 'a', 2.3, 77) }, { r: 2.0, sp: treeSprite(S, rich, 'b', 2.0, 81) });
  TREES.set(key, t); return t;
}

// ---------- Roches ----------
// Polygone irrégulier, allongé ; face éclairée en haut à gauche, face ombrée, base mouillée, mousse.
const GRANITE = [['#8c918d', '#5f6764', '#b9bdb8'], ['#9a948a', '#686157', '#c4beb2'], ['#7f8a89', '#545e5e', '#aeb7b5'], ['#a09a90', '#6d675e', '#cbc5ba']];
function rockPts(k, sc) {
  const n = 10 + Math.floor(R.hash(k.id * 7 + 1) * 4), el = 0.86 + 0.28 * R.hash(k.id * 5 + 2), rot = R.hash(k.id * 3 + 4) * 3.14, pts = [];
  const cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i + 0.35 * (R.hash(k.id * 13 + i * 2) - 0.5)) / n * 6.2832, rr = k.r * sc * (0.8 + 0.3 * R.hash(k.id * 13 + i + k.r));
    const x = Math.cos(a) * rr * el, y = Math.sin(a) * rr / el;
    pts.push(x * cr - y * sr, x * sr + y * cr);
  }
  return pts;
}
function poly(g, p, s, ox, oy) {
  g.beginPath(); for (let i = 0; i < p.length; i += 2) { const x = p[i] * s + ox, y = p[i + 1] * s + oy; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath();
}
RB.rockPts = rockPts; RB.poly = poly;
const ROCKS = new WeakMap();
RB.rockSprite = function (k, S, rich) {
  let e = ROCKS.get(k); if (e && e.S === S && e.rich === rich) return e;
  const p = rockPts(k, 1), r = k.r, ext = r * 1.25 + 0.6, sh = rich ? r * 0.22 + 0.25 : 0;
  const half = Math.ceil(ext * S) + 2, cv = document.createElement('canvas'); cv.width = cv.height = half * 2 + Math.ceil(sh * S);
  const g = cv.getContext('2d'), col = GRANITE[Math.floor(R.hash(k.id * 9 + 3) * GRANITE.length)];
  g.setTransform(S, 0, 0, -S, half, half); g.lineJoin = 'round'; g.lineCap = 'round';
  if (rich) { poly(g, p, 1.04, sh, -sh); g.fillStyle = 'rgba(0,18,26,.34)'; g.fill(); }
  poly(g, p, 1.1, 0.05, -0.05); g.fillStyle = '#2f3b3b'; g.fill(); // base mouillée, plus sombre
  poly(g, p, 1, 0, 0); g.fillStyle = col[1]; g.fill();
  g.save(); poly(g, p, 1, 0, 0); g.clip();
  poly(g, p, 0.9, -0.14 * r, 0.14 * r); g.fillStyle = col[0]; g.fill();
  poly(g, p, 0.5, -0.27 * r, 0.27 * r); g.fillStyle = col[2]; g.fill();
  // arêtes entre les faces
  g.strokeStyle = 'rgba(40,46,46,.45)'; g.lineWidth = Math.max(0.05, 1.2 / S); g.beginPath();
  for (let i = 0; i < p.length; i += 4) { g.moveTo(p[i] * 0.5 - 0.27 * r, p[i + 1] * 0.5 + 0.27 * r); g.lineTo(p[i] * 0.95, p[i + 1] * 0.95); }
  g.stroke();
  // grain du granit
  for (let i = 0; i < 6 + r * 6; i++) {
    const a = R.hash(k.id * 31 + i) * 6.2832, d = Math.sqrt(R.hash(k.id * 17 + i * 3)) * r * 0.85;
    g.fillStyle = i % 2 ? 'rgba(30,34,34,.35)' : 'rgba(240,240,232,.4)';
    g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.03, 0.06 * Math.min(r, 2)), 0, 6.2832); g.fill();
  }
  // mousse ou lichen sur la face éclairée
  if (R.hash(k.id * 11 + 5) > 0.45) {
    const moss = R.hash(k.id * 2 + 1) > 0.5;
    g.fillStyle = moss ? 'rgba(98,128,58,.75)' : 'rgba(206,204,160,.7)';
    g.beginPath();
    for (let i = 0; i < 5; i++) { const x = -0.3 * r + (R.hash(k.id + i * 5) - 0.5) * r * 0.7, y = 0.3 * r + (R.hash(k.id + i * 9) - 0.5) * r * 0.6, rr = r * (0.07 + 0.08 * R.hash(i + k.id)); g.moveTo(x + rr, y); g.arc(x, y, rr, 0, 6.2832); }
    g.fill();
  }
  g.restore();
  // liseré de lumière et contour
  poly(g, p, 1, 0, 0); g.strokeStyle = '#2e3636'; g.lineWidth = Math.max(0.07, 1.4 / S); g.stroke();
  g.save(); poly(g, p, 1, 0, 0); g.clip(); poly(g, p, 1, 0.1, -0.1); g.strokeStyle = 'rgba(255,255,250,.45)'; g.lineWidth = Math.max(0.06, 1.5 / S); g.stroke(); g.restore();
  e = { S, rich, cv, o: half }; ROCKS.set(k, e); return e;
};

// ---------- Tuiles ----------
const T = 512;
RB.TILE = T;
// Une peinture de tuile : (X0, Y0) = coin en pixels-monde (x * S, -y * S).
function paintTile(g, rv, X0, Y0, S, rich, cache) {
  const xa = X0 / S, xb = (X0 + T) / S, yb = -Y0 / S, ya = -(Y0 + T) / S, m = 6;
  g.setTransform(S, 0, 0, -S, -X0, -Y0); g.lineJoin = 'round'; g.lineCap = 'round';
  // Sol de la forêt : sous-bois plus sombre, clairières plus claires.
  g.fillStyle = C.floor; g.fillRect(xa - 1, ya - 1, xb - xa + 2, yb - ya + 2);
  const cs = 3.2, dense = new Path2D(), mead = new Path2D();
  for (let gy = Math.floor((ya - 4) / cs); gy <= Math.ceil((yb + 4) / cs); gy++) for (let gx = Math.floor((xa - 4) / cs); gx <= Math.ceil((xb + 4) / cs); gx++) {
    const x = gx * cs + R.hash(gx * 3 + gy * 7) * cs, y = gy * cs + R.hash(gx * 5 + gy * 11) * cs, n = vn(x / 17, y / 17, 1);
    if (n > 0.6) { const r = 2.2 + 2 * R.hash(gx + gy * 13); dense.moveTo(x + r, y); dense.arc(x, y, r, 0, 6.2832); }
    else if (n < 0.3) { const r = 2 + 2 * R.hash(gx * 7 + gy); mead.moveTo(x + r, y); mead.arc(x, y, r, 0, 6.2832); }
  }
  g.fillStyle = 'rgba(16,46,28,.55)'; g.fill(dense); g.fillStyle = 'rgba(96,140,74,.55)'; g.fill(mead);
  // herbes et fleurs des clairières
  const tc = Math.max(0.9, 6 / S), tu = new Path2D(), tu2 = new Path2D(), fl = new Path2D();
  for (let gy = Math.floor((ya - 1) / tc); gy <= Math.ceil((yb + 1) / tc); gy++) for (let gx = Math.floor((xa - 1) / tc); gx <= Math.ceil((xb + 1) / tc); gx++) {
    const h = R.hash(gx * 7.7 + gy * 3.9); if (h > 0.5) continue;
    const x = gx * tc + R.hash(gx * 1.9 + gy * 6.1) * tc, y = gy * tc + R.hash(gx * 4.3 + gy * 2.2) * tc;
    if (vn(x / 17, y / 17, 1) > 0.33) continue;
    if (h < 0.03) { fl.moveTo(x + 0.12, y); fl.arc(x, y, 0.12, 0, 6.2832); continue; }
    const P = h < 0.25 ? tu : tu2, r = 0.25 + 0.2 * h;
    P.moveTo(x - r, y - r * 0.2); P.lineTo(x, y + r * 0.5); P.lineTo(x + r, y - r * 0.2); P.moveTo(x, y - r * 0.3); P.lineTo(x, y + r * 0.7);
  }
  g.lineWidth = Math.max(0.06, 1 / S); g.strokeStyle = 'rgba(130,170,90,.7)'; g.stroke(tu); g.strokeStyle = 'rgba(48,90,50,.7)'; g.stroke(tu2);
  g.fillStyle = 'rgba(240,226,150,.85)'; g.fill(fl);

  const dm = depthMap(rv), y0 = Math.floor(ya - m), y1 = Math.ceil(yb + m);
  // La rivière touche-t-elle la tuile?
  let near = false;
  for (let y = y0; y <= y1; y += 2) { rv.at(y, A); if (A.cx + A.hw + 8 > xa - m && A.cx - A.hw - 8 < xb + m) { near = true; break; } }
  const st = 0.5, edge = (sd, y) => { rv.at(y, A); return A.cx + sd * (A.hw + wob(sd, y)); };
  if (near) {
    // Plages : sable ou gravier, bande mouillée au bord de l'eau.
    for (let sd = -1; sd <= 1; sd += 2) {
      g.beginPath();
      for (let y = y0; y <= y1; y += st) g.lineTo(edge(sd, y) - sd * 0.3, y);
      for (let y = y1; y >= y0; y -= st) { rv.at(y, A); g.lineTo(A.cx + sd * (A.hw + beachW(rv, sd, y) + 0.4 * vn(y / 2, sd, 8)), y); }
      g.closePath(); g.fillStyle = C.sand; g.fill();
    }
    // Texture des plages : galets et gravier.
    const pc = Math.max(0.45, 5 / S), P = [new Path2D(), new Path2D(), new Path2D()], PA = [new Path2D(), new Path2D(), new Path2D()];
    for (let gy = Math.floor(y0 / pc); gy <= Math.ceil(y1 / pc); gy++) {
      const y = gy * pc; rv.at(y, A);
      const lo = Math.max(xa - 1, A.cx - A.hw - 4.5), hi = Math.min(xb + 1, A.cx + A.hw + 4.5);
      for (let gx = Math.floor(lo / pc); gx <= Math.ceil(hi / pc); gx++) {
        const h1 = R.hash(gx * 12.9 + gy * 78.2), x = gx * pc + h1 * pc, yy = y + R.hash(gx * 3.7 + gy * 9.1) * pc;
        const e = Math.abs(x - A.cx) - A.hw, sd = x < A.cx ? -1 : 1, rad = (0.07 + 0.11 * R.hash(gx + gy * 3.3)) * Math.max(1, 4 / S);
        let d, alpha;
        if (e < 0) { d = RB.depthAt(dm, x, yy); if (d > 0.34) continue; alpha = d < 0 ? 2 : d < 0.14 ? 1 : 0; if (R.hash(gx * 1.7 + gy * 2.9) > (d < 0 ? 0.75 : 0.95 - d * 2)) continue; }
        else { const bw = beachW(rv, sd, yy); if (e > bw) continue; const gravel = vn(yy / 14, sd * 7, 9) > 0.48; if (R.hash(gx * 1.3 + gy * 7.7) > (gravel ? 0.7 : 0.12)) continue; alpha = 2; }
        const c = Math.floor(R.hash(gx * 5.3 + gy * 1.1) * 3), p = (alpha === 2 ? P : PA)[c];
        if (alpha === 0 && c === 2) continue;
        p.moveTo(x + rad, yy); p.ellipse(x, yy, rad, rad * 0.75, h1 * 3, 0, 6.2832);
      }
    }
    const PC = ['#8a8574', '#cfc4a7', '#a59a82'];
    for (let i = 0; i < 3; i++) { g.fillStyle = PC[i]; g.fill(P[i]); }
    // Ligne mouillée du sable, juste au-dessus de l'eau.
    for (let sd = -1; sd <= 1; sd += 2) {
      g.beginPath(); for (let y = y0; y <= y1; y += st) { const x = edge(sd, y); if (y === y0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokeStyle = 'rgba(120,104,70,.55)'; g.lineWidth = 0.9; g.stroke();
    }
    // L'eau : carte de profondeur dans le contour de la rivière.
    const wp = new Path2D();
    for (let y = y0; y <= y1; y += st) wp.lineTo(edge(-1, y), y);
    for (let y = y1; y >= y0; y -= st) wp.lineTo(edge(1, y), y);
    wp.closePath();
    g.save(); g.clip(wp);
    const sy0 = Math.max(0, Math.floor((y0 - dm.ya) * PX)), sy1 = Math.min(dm.cv.height, Math.ceil((y1 - dm.ya) * PX));
    if (sy1 > sy0) { g.imageSmoothingEnabled = true; g.drawImage(dm.cv, 0, sy0, dm.cv.width, sy1 - sy0, dm.xa, dm.ya + sy0 / PX, dm.w, (sy1 - sy0) / PX); }
    // Galets du fond, visibles en transparence dans les hauts-fonds (plus pâles et voilés).
    g.globalAlpha = 0.55; for (let i = 0; i < 3; i++) { g.fillStyle = PC[i]; g.fill(PA[i]); } g.globalAlpha = 1;
    // Fond de roc : marbrures très discrètes dans l'eau profonde (la veine reste foncée).
    if (rich) {
      const mb = new Path2D(), mc = 2.6;
      for (let gy = Math.floor(y0 / mc); gy <= Math.ceil(y1 / mc); gy++) {
        const y = gy * mc; rv.at(y, A);
        for (let gx = Math.floor((A.cx - A.hw) / mc); gx <= Math.ceil((A.cx + A.hw) / mc); gx++) {
          const x = gx * mc + R.hash(gx * 2.1 + gy * 5.3) * mc, yy = y + R.hash(gx * 7.1 + gy) * mc;
          if (x < xa - 2 || x > xb + 2 || RB.depthAt(dm, x, yy) < 0.6 || R.hash(gx + gy * 9.7) > 0.5) continue;
          const rr = 0.25 + 0.3 * R.hash(gx * 3 + gy * 1.3); mb.moveTo(x + rr, yy); mb.ellipse(x, yy, rr, rr * (2 + 1.5 * R.hash(gx + gy)), 0, 0, 6.2832);
        }
      }
      g.fillStyle = 'rgba(2,30,42,.07)'; g.fill(mb);
    }
    // Roches à fleur d'eau (eau moyenne) : silhouette sombre sous un voile d'eau claire.
    for (const b of rv.bars) {
      if (!b.low || b.y < ya - 4 || b.y > yb + 4) continue;
      const k = { id: Math.round(b.x * 7 + b.y * 3), r: b.rx / 1.3 * 0.9 }, p = rockPts(k, 1);
      poly(g, p, 1.25, b.x, b.y); g.fillStyle = 'rgba(214,236,214,.35)'; g.fill();
      poly(g, p, 1, b.x, b.y); g.fillStyle = 'rgba(62,86,78,.42)'; g.fill();
      poly(g, p, 0.55, b.x - 0.2 * k.r, b.y + 0.2 * k.r); g.fillStyle = 'rgba(150,170,155,.35)'; g.fill();
    }
    // Contre-courants : eau calme, plus sombre, derrière les roches.
    g.fillStyle = 'rgba(6,48,62,.32)';
    for (const k of rv.rocks) {
      if (k.y > yb + 2 || k.y + k.Le < ya - 2) continue;
      g.beginPath(); g.moveTo(k.x - k.w, k.y); g.quadraticCurveTo(k.x - k.w * 0.9, k.y + k.Le * 0.6, k.x, k.y + k.Le);
      g.quadraticCurveTo(k.x + k.w * 0.9, k.y + k.Le * 0.6, k.x + k.w, k.y); g.closePath(); g.fill();
    }
    g.restore();
    // Liseré d'eau claire le long des berges basses.
    for (let sd = -1; sd <= 1; sd += 2) {
      g.save(); g.clip(wp); g.beginPath();
      for (let y = y0; y <= y1; y += st) { const x = edge(sd, y); if (y === y0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokeStyle = 'rgba(205,240,228,.45)'; g.lineWidth = 0.7; g.stroke();
      g.strokeStyle = 'rgba(245,252,248,.5)'; g.lineWidth = 0.16; g.stroke(); g.restore();
    }
    // Touffes d'herbe et arbustes à la lisière de la forêt.
    const gr = new Path2D(), gr2 = new Path2D();
    for (let sd = -1; sd <= 1; sd += 2) for (let y = Math.floor(y0); y <= y1; y += 0.9) {
      if (cliffK(rv, sd, y) > 0.2) continue;
      const h = R.hash(y * 7.3 + sd * 13); if (h > 0.6) continue;
      rv.at(y, A); const x = A.cx + sd * (A.hw + beachW(rv, sd, y) + 0.2 + 0.6 * h), r = 0.35 + 0.35 * R.hash(y * 3 + sd);
      for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45 + sd * 0.2; (i % 2 ? gr : gr2).moveTo(x, y); (i % 2 ? gr : gr2).lineTo(x + Math.cos(a + 1.57) * r * sd * 0.6, y + Math.sin(a + 1.57) * r); }
    }
    g.lineWidth = Math.max(0.07, 1 / S); g.strokeStyle = '#6f9a4e'; g.stroke(gr); g.strokeStyle = '#4f7a3c'; g.stroke(gr2);
    // Rochers de berge, sur la plage (jamais dans l'eau).
    for (let sd = -1; sd <= 1; sd += 2) for (let y = Math.floor(y0 / 2.3) * 2.3; y <= y1; y += 2.3) {
      if (R.hash(y * 1.31 + sd * 5) > 0.11 || cliffK(rv, sd, y) > 0) continue;
      rv.at(y, A); const bw = beachW(rv, sd, y); if (bw < 1.4) continue;
      const k = { id: Math.round(y * 13 + sd * 7) + 500, r: 0.35 + 0.35 * R.hash(y * 2 + sd) }, p = rockPts(k, 1), x = A.cx + sd * (A.hw + bw * 0.6);
      if (rich) { poly(g, p, 1, x + 0.2, y - 0.2); g.fillStyle = 'rgba(40,30,10,.25)'; g.fill(); }
      poly(g, p, 1, x, y); g.fillStyle = '#8d8f88'; g.fill(); poly(g, p, 0.55, x - 0.1, y + 0.1); g.fillStyle = '#b7b8ae'; g.fill();
    }
  }
  // Falaises : paroi de roc en gros blocs, strates et fissures, ombre portée sur la forêt.
  // Face à l'ombre (sombre) sur la rive gauche, au soleil (claire) sur la rive droite.
  for (const k of rv.banks || []) {
    if (k.type !== 'cliff' || k.y1 < ya - m || k.y0 > yb + m) continue;
    const sd = k.side === 'L' ? -1 : 1, c0 = Math.max(k.y0 - 2.5, y0), c1 = Math.min(k.y1 + 2.5, y1);
    if (c1 <= c0) continue;
    const at = (o, y) => { rv.at(y, A); return A.cx + sd * (A.hw + o * cliffK(rv, sd, y)); };
    const shape = new Path2D();
    for (let y = c0; y <= c1; y += 0.5) shape.lineTo(at(-0.15, y), y);
    for (let y = c1; y >= c0; y -= 0.5) shape.lineTo(at(cliffW(sd, y) - 0.15, y), y);
    shape.closePath();
    if (rich) { g.save(); g.translate(1.5, -1.2); g.fillStyle = 'rgba(0,12,8,.4)'; g.fill(shape); g.restore(); }
    g.fillStyle = '#737b78'; g.fill(shape);
    g.save(); g.clip(shape);
    // dessus de la paroi : dalles de granit de teintes variées, séparées par des fissures
    const TONES = ['#858d8a', '#6d7572', '#979e9a', '#7c8582', '#8e918a'], cr = new Path2D();
    let ya2 = Math.floor(c0 / 2) * 2;
    while (ya2 < c1) {
      const yb2 = ya2 + 1.4 + 1.6 * R.hash(ya2 * 3.7 + sd), mid = 2.4 + 1.4 * R.hash(ya2 * 1.9 + sd * 3);
      for (const [o0, o1, s] of [[1.1, mid, 1], [mid, 8, 2]]) {
        const j0 = 0.5 * (R.hash(ya2 * 5.1 + s) - 0.5), j1 = 0.5 * (R.hash(yb2 * 5.1 + s) - 0.5);
        g.beginPath(); g.moveTo(at(o0, ya2 + j0), ya2 + j0); g.lineTo(at(o1, ya2 + j0 * 0.5), ya2 + j0 * 0.5); g.lineTo(at(o1, yb2 + j1 * 0.5), yb2 + j1 * 0.5); g.lineTo(at(o0, yb2 + j1), yb2 + j1); g.closePath();
        g.fillStyle = TONES[Math.floor(R.hash(ya2 * 7.3 + s * 11 + sd) * TONES.length)]; g.fill();
        // arête éclairée (haut-gauche) de chaque dalle
        g.strokeStyle = 'rgba(214,220,214,.35)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(at(o0, yb2 + j1 - 0.1), yb2 + j1 - 0.1); g.lineTo(at(o1, yb2 + j1 * 0.5 - 0.1), yb2 + j1 * 0.5 - 0.1); g.stroke();
        cr.moveTo(at(o0, ya2 + j0), ya2 + j0); cr.lineTo(at(o1, ya2 + j0 * 0.5), ya2 + j0 * 0.5);
      }
      ya2 = yb2;
    }
    // longue fissure entre les deux rangées, et petites fissures
    for (let y = c0; y <= c1; y += 0.5) { const o = 2.4 + 1.4 * R.hash(Math.floor(y / 2) * 1.9 + sd * 3) + 0.3 * vn(y / 1.3, sd, 9); if (y === c0) cr.moveTo(at(o, y), y); else cr.lineTo(at(o, y), y); }
    for (let y = Math.ceil(c0 / 1.3) * 1.3; y <= c1; y += 1.3) { const h = R.hash(y * 5.7 + 1); if (h > 0.55) continue; const o = 1.6 + 4 * h; cr.moveTo(at(o, y), y); cr.lineTo(at(o + 0.6, y + 0.45 - h), y + 0.45 - h); cr.lineTo(at(o + 1.2, y + 0.15), y + 0.15); }
    g.strokeStyle = 'rgba(34,40,40,.75)'; g.lineWidth = 0.13; g.stroke(cr);
    // lichen et mousse
    g.fillStyle = 'rgba(196,200,150,.55)'; g.beginPath();
    for (let y = Math.ceil(c0); y <= c1; y += 0.7) { const h = R.hash(y * 9.1 + sd); if (h > 0.45) continue; const x = at(2 + 4 * h, y), r = 0.1 + 0.18 * R.hash(y); g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); }
    g.fill();
    g.fillStyle = 'rgba(80,112,56,.7)'; g.beginPath();
    for (let y = Math.ceil(c0); y <= c1; y += 1.1) { const h = R.hash(y * 4.3 + sd * 2); if (h > 0.4) continue; const x = at(3.5 + 2.5 * h, y), r = 0.2 + 0.25 * R.hash(y * 2); g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832); }
    g.fill();
    // face verticale de la paroi, côté eau : striée
    const fo = y => 1.25 + 0.3 * vn(y / 1.5, sd, 6);
    const face = new Path2D();
    for (let y = c0; y <= c1; y += 0.5) face.lineTo(at(-0.2, y), y);
    for (let y = c1; y >= c0; y -= 0.5) face.lineTo(at(fo(y), y), y);
    face.closePath(); g.fillStyle = sd < 0 ? '#384140' : '#b1b6b0'; g.fill(face);
    g.beginPath();
    for (let y = Math.ceil(c0 / 0.55) * 0.55; y <= c1; y += 0.55) { const h = R.hash(y * 3.1); g.moveTo(at(0, y), y); g.lineTo(at(fo(y) * (0.6 + 0.4 * h), y + 0.12), y + 0.12); }
    g.strokeStyle = sd < 0 ? 'rgba(10,16,16,.65)' : 'rgba(96,104,100,.75)'; g.lineWidth = 0.12; g.stroke();
    g.restore();
    // arête du haut (claire), pied de la paroi (mouillé), contour
    g.beginPath(); for (let y = c0; y <= c1; y += 0.5) g.lineTo(at(fo(y), y), y);
    g.strokeStyle = sd < 0 ? 'rgba(160,168,164,.95)' : 'rgba(238,242,236,.95)'; g.lineWidth = 0.22; g.stroke();
    g.beginPath(); for (let y = c0; y <= c1; y += 0.5) g.lineTo(at(-0.1, y), y);
    g.strokeStyle = '#1f2828'; g.lineWidth = 0.36; g.stroke();
    g.strokeStyle = '#2b3433'; g.lineWidth = 0.28; g.stroke(shape);
  }
  // Sentier de portage : terre battue, bordée d'herbe, panneaux aux deux bouts.
  let tp = null;
  if (rv.portage) {
    const z = rv.portage; tp = RB.trail(rv, z);
    if (z.toY > ya - 8 && (z.y0 + z.y1) / 2 < yb + 8) {
      const path = new Path2D(); path.moveTo(tp[0], tp[1]); for (let i = 2; i < tp.length; i += 2) path.lineTo(tp[i], tp[i + 1]);
      g.strokeStyle = 'rgba(70,96,50,.7)'; g.lineWidth = 2.5; g.stroke(path);
      g.strokeStyle = '#a88a5c'; g.lineWidth = 1.8; g.stroke(path);
      g.strokeStyle = '#c9ad7c'; g.lineWidth = 0.9; g.stroke(path);
      // pointillé brun : on reconnaît le sentier au premier coup d'œil
      g.strokeStyle = '#6b4a22'; g.lineWidth = 0.42; g.setLineDash([1, 0.9]); g.stroke(path); g.setLineDash([]);
      // panneaux : poteau, planche jaune, petit canot dessiné
      const n = tp.length;
      for (const [x, y] of [[tp[2], tp[3]], [tp[n - 4], tp[n - 3]]]) {
        const sd = z.side === 'L' ? 1 : -1, px = x + sd * 1.4, py = y;
        if (rich) { g.fillStyle = 'rgba(20,20,10,.3)'; g.fillRect(px - 0.9 + 0.35, py - 0.45 - 0.35, 1.8, 0.9); }
        g.fillStyle = '#5b3d22'; g.fillRect(px - 0.12, py - 0.7, 0.24, 1.4);
        g.fillStyle = '#ffd36b'; g.strokeStyle = '#6b4a22'; g.lineWidth = 0.12; g.beginPath(); g.rect(px - 0.9, py - 0.45, 1.8, 0.9); g.fill(); g.stroke();
        g.fillStyle = '#d4432f'; g.beginPath(); g.ellipse(px, py, 0.6, 0.14, 0, 0, 6.2832); g.fill();
      }
    }
  }
  // Hutte de castor, sur la Rivière aux Castors (sur la terre, loin des passages).
  if (rv.def && rv.def.id === 'r1') {
    for (const [sd, y] of [[1, 168], [-1, 362]]) {
      if (y < ya - 5 || y > yb + 5) continue;
      rv.at(y, A); const x = A.cx + sd * (A.hw + beachW(rv, sd, y) + 1.6);
      if (rich) { g.fillStyle = 'rgba(0,12,8,.3)'; g.beginPath(); g.ellipse(x + 0.7, y - 0.6, 2.2, 1.6, 0, 0, 6.2832); g.fill(); }
      g.fillStyle = '#5d4128'; g.beginPath(); g.ellipse(x, y, 2.2, 1.6, 0, 0, 6.2832); g.fill();
      g.lineWidth = 0.13;
      for (let i = 0; i < 26; i++) { const a = R.hash(i * 3 + y) * 6.28, d = R.hash(i * 7 + y) * 1.4, l = 0.6 + 0.6 * R.hash(i); g.strokeStyle = i % 3 ? '#8a6438' : '#3e2a17'; g.beginPath(); g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7); g.lineTo(x + Math.cos(a) * d + Math.cos(a * 2) * l, y + Math.sin(a) * d * 0.7 + Math.sin(a * 2) * l * 0.7); g.stroke(); }
    }
  }
  // Troncs morts, rares, couchés au sol des clairières (loin de l'eau).
  for (let gy = Math.floor((ya - 6) / 9); gy <= Math.ceil((yb + 6) / 9); gy++) for (let gx = Math.floor((xa - 6) / 9); gx <= Math.ceil((xb + 6) / 9); gx++) {
    if (R.hash(gx * 4.1 + gy * 8.3) > 0.22) continue;
    const x = gx * 9 + R.hash(gx + gy * 2.7) * 9, y = gy * 9 + R.hash(gx * 2 + gy) * 9; rv.at(y, A);
    if (Math.abs(x - A.cx) - A.hw < 7 || vn(x / 17, y / 17, 1) > 0.42) continue;
    const a = R.hash(gx * 6 + gy) * 3.14, l = 2.5 + 2.5 * R.hash(gx + gy * 5), dx = Math.cos(a) * l / 2, dy = Math.sin(a) * l / 2;
    if (rich) { g.strokeStyle = 'rgba(0,14,8,.35)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - dx + 0.3, y - dy - 0.25); g.lineTo(x + dx + 0.3, y + dy - 0.25); g.stroke(); }
    g.strokeStyle = '#7d6a55'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x + dx, y + dy); g.stroke();
    g.strokeStyle = '#a8957c'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(x - dx * 0.9 - 0.06, y - dy * 0.9 + 0.06); g.lineTo(x + dx * 0.9 - 0.06, y + dy * 0.9 + 0.06); g.stroke();
  }
  // Arbres.
  const ts = treeSet(S, rich), list = [], cell = 2.7, mg = 4.5;
  for (let gy = Math.floor((ya - mg) / cell); gy <= Math.ceil((yb + mg) / cell); gy++) {
    const yc = gy * cell; rv.at(yc, A); const cx = A.cx, hw = A.hw;
    for (let gx = Math.floor((xa - mg) / cell); gx <= Math.ceil((xb + mg) / cell); gx++) {
      const h = R.hash(gx * 17.3 + gy * 31.7), x = gx * cell + R.hash(gx * 3.3 + gy * 7.9) * cell, y = yc + R.hash(gx * 9.1 + gy * 2.3) * cell;
      const n = vn(x / 17, y / 17, 1);
      if (n < 0.3 + 0.12 * h) continue; // clairière
      if (h > 0.4 + n * 0.75) continue; // densité variable
      const sd = x < cx ? -1 : 1, e = Math.abs(x - cx) - hw, ty = vn(x / 22, y / 22, 2), hk = R.hash(gx * 5.1 + gy * 1.7);
      const set = ty > 0.66 ? (hk > 0.82 ? ts.a : ts.d) : ts.c, tr = set[Math.floor(hk * set.length) % set.length];
      const ck = cliffK(rv, sd, y);
      if (e < (ck > 0 ? cliffW(sd, y) + 0.4 : beachW(rv, sd, y) + 0.4 + tr.r * 0.35)) continue;
      if (tp && Math.abs(y - (rv.portage.y0 + rv.portage.toY) / 2) < (rv.portage.toY - rv.portage.y0) / 2 + 6 && segDist(x, y, tp) < 1.3 + tr.r * 0.6) continue;
      if (rv.def && rv.def.id === 'r1' && ((sd > 0 && Math.abs(y - 168) < 4) || (sd < 0 && Math.abs(y - 362) < 4)) && e < beachW(rv, sd, y) + 5) continue;
      list.push(x, y, set === ts.c ? 0 : set === ts.d ? 1 : 2, Math.floor(hk * set.length) % set.length);
    }
  }
  // Ordre : bas-droite d'abord, pour que les ombres tombent sur les arbres voisins.
  const idx = []; for (let i = 0; i < list.length; i += 4) idx.push(i);
  idx.sort((a, b) => (list[b] - list[b + 1]) - (list[a] - list[a + 1]));
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (const i of idx) {
    const set = list[i + 2] === 0 ? ts.c : list[i + 2] === 1 ? ts.d : ts.a, sp = set[list[i + 3]].sp;
    g.drawImage(sp.cv, Math.round(list[i] * S - X0 - sp.o), Math.round(-list[i + 1] * S - Y0 - sp.o));
  }
}

// Cache de tuiles d'une rivière pour une échelle donnée ; les tuiles les plus anciennes sont libérées.
RB.Tiles = function () {
  const map = new Map(); let key = '', rvK = null, used = 0;
  const self = {
    max: 40,
    reset() { for (const e of map.values()) { e.cv.width = 0; e.cv.height = 0; } map.clear(); },
    // Tuile (i, j), peinte au besoin. sync = false : retourne null si absente (préchargement différé).
    get(rv, S, rich, i, j, make) {
      const k0 = S.toFixed(3) + (rich ? 'r' : 's');
      // Une rivière reconstruite (même niveau, même niveau d'eau) garde ses tuiles.
      if (!rvK || rv.def !== rvK.def || rv.niveau !== rvK.niveau || k0 !== key) { self.reset(); rvK = { def: rv.def, niveau: rv.niveau }; key = k0; }
      const id = i + ',' + j; let e = map.get(id);
      if (!e) {
        if (!make) return null;
        let cv = null;
        if (map.size >= self.max) { // on recycle la tuile la moins récemment utilisée
          let old = null, oid = null; for (const [k, v] of map) if (!old || v.u < old.u) { old = v; oid = k; }
          map.delete(oid); cv = old.cv;
        }
        if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = T; }
        const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, T, T);
        paintTile(g, rv, i * T, j * T, S, rich);
        e = { cv }; map.set(id, e);
      }
      e.u = ++used; return e.cv;
    },
    has(i, j) { return map.has(i + ',' + j); },
    get size() { return map.size; }
  };
  return self;
};
})();
