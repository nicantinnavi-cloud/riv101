(function () {
'use strict';
// Rendu canvas : rivière vue de haut, l'aval vers le haut de l'écran.
const C = { forest: '#2e5d3d', t1: '#234a30', t2: '#3b7149', sand: '#d8c9a0', water: '#23808c', foam: '#f2fbf8', rock: '#868c8a', rockD: '#4f5656', rockL: '#aab0ad', canot: '#d4432f', vfi: '#ffb629', ink: '#06202a' };
const A = {};

// Carte de profondeur : calculée une fois par rivière et par niveau d'eau dans un canvas hors écran
// (2,5 px par mètre), puis dessinée avec lissage dans le contour de l'eau. Foncé = profond (veine
// principale), turquoise, vert clair = peu profond, très pâle avec cailloux et rides = haut-fond,
// gravier beige = à sec.
const PX = 2.5, MAPS = new WeakMap();
const RAMP = [[-0.05, 200, 186, 150], [0.02, 190, 216, 192], [0.15, 160, 214, 184], [0.3, 108, 194, 168], [0.5, 46, 146, 150], [0.8, 22, 100, 118], [1.3, 13, 74, 94], [2.0, 8, 54, 74]];
function depthColor(d, x, y, out) {
  let i = 0; while (i < RAMP.length - 2 && d > RAMP[i + 1][0]) i++;
  const a = RAMP[i], b = RAMP[i + 1], t = R.clamp((d - a[0]) / (b[0] - a[0]), 0, 1);
  let r = a[1] + (b[1] - a[1]) * t, g = a[2] + (b[2] - a[2]) * t, bl = a[3] + (b[3] - a[3]) * t;
  if (d < 0.32) { // cailloux du fond et petites rides serrées
    const k = 1 - R.clamp(d / 0.32, 0, 1), n = (R.hash(Math.floor(x * 2.2) * 57 + Math.floor(y * 2.2) * 131) - 0.5) * 34 * k;
    const rip = d > 0 ? Math.sin(y * 4.2 + Math.sin(x * 1.3) * 0.8) * 9 * k : 0;
    r += n + rip; g += n + rip; bl += n * 0.8 + rip;
  }
  out[0] = r; out[1] = g; out[2] = bl;
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
  const g = cv.getContext('2d'), img = g.createImageData(w, h), D = img.data, col = [0, 0, 0];
  for (let j = 0; j < h; j++) {
    const y = ya + (j + 0.5) / PX; rv.at(y, A); const cx = A.cx, hw = A.hw * 0.995;
    for (let i = 0; i < w; i++) {
      // Hors de l'eau, on prolonge la couleur du bord : le lissage reste propre le long de la berge.
      const x = R.clamp(xa + (i + 0.5) / PX, cx - hw, cx + hw);
      depthColor(rv.depth(x, y), x, y, col);
      const o = (j * w + i) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return (per[rv.niveau] = { cv, xa, ya, w: w / PX, h: h / PX });
}
R.depthMap = depthMap;

function hull(c) {
  c.beginPath(); c.moveTo(0, 2.45);
  c.bezierCurveTo(0.55, 1.6, 0.64, 0.6, 0.62, 0); c.bezierCurveTo(0.64, -0.7, 0.5, -1.7, 0, -2.45);
  c.bezierCurveTo(-0.5, -1.7, -0.64, -0.7, -0.62, 0); c.bezierCurveTo(-0.64, 0.6, -0.55, 1.6, 0, 2.45); c.closePath();
}

R.Renderer = function (canvas) {
  const ctx = canvas.getContext('2d');
  let W = 300, H = 150, dpr = 1;
  const cam = { x: 0, y: 0, s: 10, anchor: 0.6 };
  // boatScale : le canot et le nageur sont dessinés un peu plus gros que leur taille physique,
  // pour rester bien visibles (la physique et les collisions n'en tiennent pas compte).
  const self = { cam, ctx, boatScale: 1.2 };
  Object.defineProperty(self, 'W', { get: () => W });
  Object.defineProperty(self, 'H', { get: () => H });
  self.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect(); W = Math.max(50, r.width); H = Math.max(50, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  self.toWorld = (sx, sy) => ({ x: cam.x + (sx - W / 2) / cam.s, y: cam.y + (H * cam.anchor - sy) / cam.s });
  self.toScreen = (wx, wy) => ({ x: W / 2 + (wx - cam.x) * cam.s, y: H * cam.anchor - (wy - cam.y) * cam.s });

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); }
  function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  function trees(rv, y0, y1, x0, x1) {
    const p1 = new Path2D(), p2 = new Path2D();
    for (let gy = Math.floor(y0 / 5); gy <= Math.ceil(y1 / 5); gy++) {
      rv.at(gy * 5, A);
      for (let side = -1; side <= 1; side += 2) for (let c = 0; c < 9; c++) {
        const h = R.hash(gy * 31 + c * 7 + side * 3), x = A.cx + side * (A.hw + 3.2 + c * 4.6 + h * 2.5);
        if (x < x0 - 4 || x > x1 + 4) break;
        if (c < 2 && rv.bankType && rv.bankType(side < 0 ? 'L' : 'R', gy * 5) === 'cliff') continue; // pas d'arbres collés à une falaise
        const y = gy * 5 + (R.hash(gy * 17 + c * 5 + side) - 0.5) * 4, r = 1.9 + 1.7 * R.hash(gy * 13 + c * 11 + side * 5), p = h > 0.5 ? p1 : p2;
        p.moveTo(x + r, y); p.arc(x, y, r, 0, 6.2832);
      }
    }
    ctx.fillStyle = C.t1; ctx.fill(p1); ctx.fillStyle = C.t2; ctx.fill(p2);
  }

  function rockShape(k, sc, ox, oy) {
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.2832, rr = k.r * sc * (0.84 + 0.28 * R.hash(k.id * 13 + i + k.r));
      const px = k.x + ox + Math.cos(a) * rr, py = k.y + oy + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function paddler(py, side, bow, b, inp, t) {
    const ph = Math.sin(t * 7 + (bow ? 0 : 1.2)); let sw = 0.15, ext = 0;
    if (inp) {
      if (inp.fwd || inp.back) sw = 0.7 * ph;
      if (inp.left) ext = bow ? 0.45 + 0.25 * ph : -0.1;
      else if (inp.right) ext = bow ? -0.1 : 0.45 + 0.25 * ph;
    }
    const bx = side * (0.98 + ext), by = py + sw, hx = side * 0.2 + b.lean * 0.12;
    ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 0.09; line(hx, py, bx, by);
    const dx = bx - hx, dy = by - py, d = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = '#f4e3b5'; ctx.lineWidth = 0.24; line(bx, by, bx + dx / d * 0.38, by + dy / d * 0.38);
    ctx.fillStyle = C.vfi; ctx.beginPath(); ctx.ellipse(b.lean * 0.12, py, 0.37, 0.25, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = bow ? '#f6f1e4' : '#3fa7d6'; circle(b.lean * 0.12, py, 0.21); ctx.fill();
  }

  function drawCanoe(b, inp, t) {
    // Gîte visible : coque décalée et amincie, bord bas plus sombre, liseré d'eau du côté haut (amont).
    const lv = b.lv = R.lerp(b.lv || 0, b.lean || 0, 0.18), al = Math.abs(lv);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-b.th); ctx.scale(self.boatScale, self.boatScale); ctx.lineCap = 'round';
    ctx.save(); ctx.translate(0.2 + lv * 0.25, -0.2); hull(ctx); ctx.fillStyle = 'rgba(0,25,35,.28)'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(lv * 0.1, 0); ctx.scale(1 - 0.1 * al, 1);
    hull(ctx); ctx.fillStyle = C.canot; ctx.fill(); ctx.lineWidth = 0.1; ctx.strokeStyle = '#7a1e15'; ctx.stroke();
    if (al > 0.05) {
      ctx.save(); hull(ctx); ctx.clip(); ctx.fillStyle = 'rgba(40,8,4,' + (0.45 * al).toFixed(2) + ')'; ctx.fillRect(lv > 0 ? 0.3 : -1, -2.6, 0.7, 5.2); ctx.restore();
      ctx.strokeStyle = 'rgba(242,251,248,' + (0.85 * al).toFixed(2) + ')'; ctx.lineWidth = 0.13; ctx.beginPath();
      if (lv > 0) ctx.ellipse(0, 0, 0.8, 2.3, 0, Math.PI / 2 + 0.35, Math.PI * 1.5 - 0.35); else ctx.ellipse(0, 0, 0.8, 2.3, 0, -Math.PI / 2 + 0.35, Math.PI / 2 - 0.35);
      ctx.stroke();
    }
    ctx.save(); ctx.translate(lv * 0.16, 0); ctx.scale(0.74, 0.88); hull(ctx); ctx.fillStyle = '#e9d6ab'; ctx.fill(); ctx.restore();
    if (b.water > 0.01) { // eau dans la coque : la flaque grandit avec la quantité d'eau
      const k = 0.3 + 0.7 * R.clamp(b.water, 0, 1);
      ctx.save(); ctx.translate(lv * 0.3, 0); ctx.scale(0.72 * k, 0.86 * k); hull(ctx);
      ctx.fillStyle = 'rgba(60,150,210,' + (0.5 + 0.35 * b.water).toFixed(2) + ')'; ctx.fill(); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.1; line(-0.5, 0.35, 0.5, 0.35); line(-0.5, -0.5, 0.5, -0.5);
    paddler(1.25, -1, true, b, inp, t); paddler(-1.4, 1, false, b, inp, t);
    ctx.restore();
  }

  function drawSwim(b, t) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(self.boatScale, self.boatScale); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(242,251,248,.65)'; ctx.lineWidth = 0.12; circle(0, 0, 0.95 + 0.15 * Math.sin(t * 6)); ctx.stroke();
    if (b.active) { // nage active : tête la première
      ctx.rotate(-(b.sdir || 0));
      ctx.strokeStyle = '#2b3a55'; ctx.lineWidth = 0.22; line(0, -0.2, 0, -1.0);
      ctx.strokeStyle = '#e9c9a0'; ctx.lineWidth = 0.16;
      line(-0.2, 0.2, -0.62, 0.5 + 0.3 * Math.sin(t * 12)); line(0.2, 0.2, 0.62, 0.5 - 0.3 * Math.sin(t * 12));
      ctx.fillStyle = C.vfi; ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.42, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#f6f1e4'; circle(0, 0.5, 0.22); ctx.fill();
    } else { // position de sécurité : sur le dos, pieds vers l'aval
      ctx.rotate(-(b.sth || 0));
      ctx.strokeStyle = '#2b3a55'; ctx.lineWidth = 0.2; line(-0.13, 0.2, -0.15, 1.05); line(0.13, 0.2, 0.15, 1.05);
      ctx.fillStyle = '#1b2233'; circle(-0.15, 1.1, 0.13); ctx.fill(); circle(0.15, 1.1, 0.13); ctx.fill();
      ctx.strokeStyle = '#e9c9a0'; ctx.lineWidth = 0.16;
      if (b.stroke) { // il dénage : les bras balaient l'eau de chaque côté
        const a = Math.sin(t * 9), c = Math.cos(t * 9);
        line(-0.25, 0, -0.72, 0.1 + 0.45 * a); line(0.25, 0, 0.72, 0.1 + 0.45 * a);
        ctx.strokeStyle = 'rgba(242,251,248,.55)'; ctx.lineWidth = 0.1;
        line(-0.8, 0.1 + 0.45 * a, -0.8 - 0.25 * Math.abs(c), 0.1 + 0.45 * a - 0.3 * c); line(0.8, 0.1 + 0.45 * a, 0.8 + 0.25 * Math.abs(c), 0.1 + 0.45 * a - 0.3 * c);
      } else { line(-0.25, 0, -0.7, 0.1); line(0.25, 0, 0.7, 0.1); }
      ctx.fillStyle = C.vfi; ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.42, 0, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#f6f1e4'; circle(0, -0.5, 0.22); ctx.fill();
    }
    ctx.restore();
  }

  // Sentier de portage : de la bande d'arrêt jusqu'à la remise à l'eau, sur la terre.
  function trail(rv, z) {
    const sd = z.side === 'L' ? -1 : 1, ym = (z.y0 + z.y1) / 2, pts = [], off = y => A.hw + 6 + 1.5 * Math.sin(y * 0.12);
    rv.at(ym, A); pts.push(A.cx + sd * (A.hw - 0.5), ym);
    for (let y = ym; y < z.toY; y += 2) { rv.at(y, A); pts.push(A.cx + sd * off(y), y); }
    rv.at(z.toY, A); pts.push(A.cx + sd * off(z.toY), z.toY, A.cx + sd * (A.hw - 0.5), z.toY);
    return pts;
  }
  function cliffSpan(rv, k, y0, y1, m) {
    if (k.type !== 'cliff' || k.y1 < y0 - m || k.y0 > y1 + m) return null;
    return [Math.floor(Math.max(k.y0, y0 - m)), Math.ceil(Math.min(k.y1, y1 + m)), k.side === 'L' ? -1 : 1];
  }
  function edgePath(rv, ya, yb, f, back) {
    for (let i = 0; i <= yb - ya; i++) { const y = back ? yb - i : ya + i; rv.at(y, A); const x = A.cx + f(y); if (i || back) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function labels(list) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.font = '800 13px Nunito, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (const l of list) {
      const p = self.toScreen(l.x, l.y); if (p.y < -30 || p.y > H + 40) continue;
      const w = ctx.measureText(l.text).width + 16, x = R.clamp(p.x - w / 2, 4, Math.max(4, W - w - 4)), y = l.below ? p.y + 10 : p.y - 34;
      ctx.fillStyle = l.kind === 'danger' ? '#a8321f' : l.kind === 'hint' ? C.vfi : '#0b3a46';
      rr(x, y, w, 24, 8); ctx.fill();
      ctx.beginPath(); if (l.below) { ctx.moveTo(p.x - 5, y + 1); ctx.lineTo(p.x, y - 7); ctx.lineTo(p.x + 5, y + 1); } else { ctx.moveTo(p.x - 5, y + 23); ctx.lineTo(p.x, y + 31); ctx.lineTo(p.x + 5, y + 23); } ctx.fill();
      ctx.fillStyle = l.kind === 'hint' ? C.ink : '#fff'; ctx.fillText(l.text, x + 8, y + 12.5);
    }
  }

  self.draw = function (rv, st) {
    const s = cam.s, t = st.t || 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = C.forest; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (W / 2 - cam.x * s), dpr * (H * cam.anchor + cam.y * s));
    const y0 = cam.y - H * (1 - cam.anchor) / s - 4, y1 = cam.y + H * cam.anchor / s + 4, x0 = cam.x - W / 2 / s, x1 = cam.x + W / 2 / s;
    const vis = (y, m) => y > y0 - m && y < y1 + m;
    trees(rv, y0, y1, x0, x1);

    const path = new Path2D(), ya = Math.floor(y0 / 2) * 2, yb = Math.ceil(y1 / 2) * 2;
    for (let y = ya; y <= yb; y += 2) { rv.at(y, A); if (y === ya) path.moveTo(A.cx - A.hw, y); else path.lineTo(A.cx - A.hw, y); }
    for (let y = yb; y >= ya; y -= 2) { rv.at(y, A); path.lineTo(A.cx + A.hw, y); }
    path.closePath();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = C.sand; ctx.lineWidth = 3.2; ctx.stroke(path);
    ctx.save(); ctx.clip(path);
    // Couleur de l'eau selon la profondeur (carte précalculée, seule la bande visible est copiée).
    const dm = depthMap(rv), sy0 = Math.max(0, Math.floor((y0 - dm.ya) * PX)), sy1 = Math.min(dm.cv.height, Math.ceil((y1 - dm.ya) * PX));
    if (sy1 > sy0) { ctx.imageSmoothingEnabled = true; ctx.drawImage(dm.cv, 0, sy0, dm.cv.width, sy1 - sy0, dm.xa, dm.ya + sy0 / PX, dm.w, (sy1 - sy0) / PX); }
    else { ctx.fillStyle = C.water; ctx.fill(path); }

    // Contre-courants (eau calme, plus sombre) derrière les roches.
    ctx.fillStyle = 'rgba(6,48,62,.3)';
    for (const k of rv.rocks) {
      if (!vis(k.y, k.Le + 4)) continue;
      ctx.beginPath(); ctx.moveTo(k.x - k.w, k.y); ctx.quadraticCurveTo(k.x - k.w * 0.9, k.y + k.Le * 0.6, k.x, k.y + k.Le);
      ctx.quadraticCurveTo(k.x + k.w * 0.9, k.y + k.Le * 0.6, k.x + k.w, k.y); ctx.closePath(); ctx.fill();
    }
    // Langues d'eau lisse (V aval).
    for (const v of rv.vs) {
      if (!vis(v.y, 16)) continue;
      ctx.fillStyle = 'rgba(190,240,235,.17)'; ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(v.x - 4, v.y - 11); ctx.lineTo(v.x + 4, v.y - 11); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(242,251,248,.5)'; ctx.lineWidth = 0.3;
      for (let i = 1; i <= 3; i++) { const yy = v.y + i * 2.3, w = 1 + i * 0.5; ctx.beginPath(); ctx.moveTo(v.x - w, yy - 0.4); ctx.quadraticCurveTo(v.x, yy + 0.6, v.x + w, yy - 0.4); ctx.stroke(); }
    }
    // Trains de vagues.
    ctx.lineWidth = 0.5;
    for (const w of rv.waves) {
      if (!vis(w.y, w.len + 4)) continue;
      for (let i = 0; i * 3 < w.len; i++) {
        const yy = w.y + i * 3 + 0.3 * Math.sin(t * 2.5 + i), ww = w.w / 2 * (1 - 0.35 * i * 3 / w.len);
        ctx.strokeStyle = 'rgba(242,251,248,' + (0.45 + 0.25 * Math.sin(t * 3 + i * 1.3)).toFixed(2) + ')';
        ctx.beginPath(); ctx.moveTo(w.x - ww, yy - 0.6); ctx.quadraticCurveTo(w.x, yy + 0.9, w.x + ww, yy - 0.6); ctx.stroke();
      }
    }
    // Rouleaux.
    for (const h of rv.holes) {
      if (!vis(h.y, 8)) continue;
      ctx.strokeStyle = 'rgba(5,40,50,.55)'; ctx.lineWidth = 0.6; line(h.x - h.w / 2, h.y - 0.3, h.x + h.w / 2, h.y - 0.3);
      const n = Math.max(3, Math.round(h.w / 1.1));
      for (let i = 0; i < n; i++) {
        const x = h.x - h.w / 2 + (i + 0.5) * h.w / n;
        ctx.fillStyle = 'rgba(242,251,248,.92)'; circle(x + 0.25 * Math.sin(t * 6 + i * 1.7), h.y + 1.1 + 0.4 * Math.sin(t * 4 + i), 0.8 + 0.2 * Math.sin(t * 5 + i * 2.3)); ctx.fill();
        ctx.fillStyle = 'rgba(242,251,248,.5)'; circle(x + 0.3 * Math.cos(t * 5 + i), h.y + 2.5 + 0.3 * Math.sin(t * 3 + i * 2), 0.6); ctx.fill();
      }
    }
    // Seuil : la marche, puis le rappel écumant.
    if (rv.seuil && vis(rv.seuil.y, 10)) {
      const sy = rv.seuil.y; rv.at(sy, A);
      ctx.fillStyle = 'rgba(190,240,235,.22)'; ctx.fillRect(A.cx - A.hw, sy - 2.2, A.hw * 2, 2.2);
      ctx.strokeStyle = 'rgba(5,40,50,.7)'; ctx.lineWidth = 0.7; line(A.cx - A.hw, sy, A.cx + A.hw, sy);
      for (let i = 0; i < A.hw * 2 / 1.3; i++) {
        const x = A.cx - A.hw + i * 1.3 + 0.6;
        ctx.fillStyle = 'rgba(242,251,248,.95)'; circle(x + 0.2 * Math.sin(t * 6 + i), sy + 1.3 + 0.4 * Math.sin(t * 4 + i * 1.9), 0.85); ctx.fill();
        ctx.fillStyle = 'rgba(242,251,248,.55)'; circle(x + 0.3 * Math.cos(t * 5 + i * 1.3), sy + 3.1 + 0.4 * Math.sin(t * 3 + i), 0.7); ctx.fill();
        ctx.fillStyle = 'rgba(242,251,248,.28)'; circle(x + 0.4 * Math.sin(t * 2 + i * 0.7), sy + 4.8, 0.55); ctx.fill();
      }
    }
    // Filets d'eau : ils montrent la direction et la vitesse du courant.
    ctx.strokeStyle = 'rgba(235,250,248,.4)'; ctx.lineWidth = 0.16; ctx.beginPath();
    for (const p of st.parts) { ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    if (st.lines) {
      ctx.strokeStyle = 'rgba(235,250,248,.6)'; ctx.fillStyle = 'rgba(235,250,248,.75)'; ctx.lineWidth = 0.2;
      for (const l of st.lines) {
        ctx.beginPath(); ctx.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]); ctx.stroke();
        const n = l.length, ex = l[n - 2], ey = l[n - 1], dx = ex - l[n - 4], dy = ey - l[n - 3], d = Math.hypot(dx, dy);
        if (d > 0.12) { const ux = dx / d, uy = dy / d; ctx.beginPath(); ctx.moveTo(ex + ux * 0.6, ey + uy * 0.6); ctx.lineTo(ex - uy * 0.4, ey + ux * 0.4); ctx.lineTo(ex + uy * 0.4, ey - ux * 0.4); ctx.closePath(); ctx.fill(); }
      }
    }
    // Sillage des roches : un V dont la pointe (la roche) regarde l'amont.
    ctx.lineWidth = 0.28;
    for (const k of rv.rocks) {
      if (!vis(k.y, 20)) continue;
      const len = Math.min(4 * k.r + 4, 16);
      for (let sd = -1; sd <= 1; sd += 2) {
        const xa = k.x + sd * k.r * 0.9, xm = xa + sd * 0.2 * len, xb = xa + sd * 0.4 * len;
        ctx.strokeStyle = 'rgba(242,251,248,.6)'; line(xa, k.y + 0.2 * k.r, xm, k.y + len / 2);
        ctx.strokeStyle = 'rgba(242,251,248,.28)'; line(xm, k.y + len / 2, xb, k.y + len);
      }
    }
    // Ombre des falaises sur l'eau.
    for (const k of rv.banks || []) {
      const c = cliffSpan(rv, k, y0, y1, 4); if (!c) continue;
      const [ya, yb, sd] = c;
      ctx.fillStyle = 'rgba(3,26,36,.45)'; ctx.beginPath();
      edgePath(rv, ya, yb, () => sd * A.hw, false); edgePath(rv, ya, yb, () => sd * (A.hw - 1.8), true);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // Falaises : paroi de roc grise, sans plage. On ne sort pas ici.
    for (const k of rv.banks || []) {
      const c = cliffSpan(rv, k, y0, y1, 6); if (!c) continue;
      const [ya, yb, sd] = c;
      ctx.beginPath();
      edgePath(rv, ya, yb, () => sd * (A.hw - 0.15), false);
      edgePath(rv, ya, yb, y => sd * (A.hw + 4.2 + 1.1 * Math.sin(y * 0.55) + 0.7 * R.hash(y)), true);
      ctx.closePath(); ctx.fillStyle = '#737b79'; ctx.fill(); ctx.strokeStyle = '#3f4746'; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.lineCap = 'round';
      for (let y = Math.ceil(ya / 1.7) * 1.7; y <= yb; y += 1.7) {
        rv.at(y, A); const e = A.cx + sd * A.hw, h = R.hash(y * 3.1);
        ctx.strokeStyle = '#4b5352'; ctx.lineWidth = 0.28; line(e + sd * 0.5, y, e + sd * (2 + 1.8 * h), y + 0.9);
        ctx.strokeStyle = '#a2a9a6'; ctx.lineWidth = 0.22; line(e + sd * (1 + h), y - 0.3, e + sd * (2.8 + h), y + 0.2);
      }
      ctx.strokeStyle = '#c3c8c4'; ctx.lineWidth = 0.35; ctx.beginPath(); edgePath(rv, ya, yb, () => sd * (A.hw + 0.25), false); ctx.stroke();
    }
    // Sentier de portage, en pointillé brun sur la terre.
    if (rv.portage && vis((rv.portage.y0 + rv.portage.toY) / 2, (rv.portage.toY - rv.portage.y0) / 2 + 10)) {
      const p = trail(rv, rv.portage);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.strokeStyle = 'rgba(216,201,160,.9)'; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 0.42; ctx.setLineDash([1, 0.9]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Zone de portage.
    if (rv.portage && vis((rv.portage.y0 + rv.portage.y1) / 2, 40)) {
      const z = rv.portage; ctx.fillStyle = 'rgba(255,182,41,.28)'; ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.3; ctx.setLineDash([1.2, 0.9]);
      ctx.beginPath();
      for (let y = z.y0; y <= z.y1; y += 2) { rv.at(y, A); const x = z.side === 'L' ? A.cx - A.hw : A.cx + A.hw; if (y === z.y0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      for (let y = z.y1; y >= z.y0; y -= 2) { rv.at(y, A); ctx.lineTo(z.side === 'L' ? A.cx - A.hw + 8 : A.cx + A.hw - 8, y); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
    }
    // Roches.
    for (const k of rv.rocks) {
      if (!vis(k.y, k.r + 3)) continue;
      ctx.strokeStyle = 'rgba(242,251,248,.85)'; ctx.lineWidth = 0.45; ctx.beginPath(); ctx.arc(k.x, k.y, k.r + 0.55, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      rockShape(k, 1, 0, 0); ctx.fillStyle = C.rock; ctx.fill(); ctx.strokeStyle = C.rockD; ctx.lineWidth = 0.2; ctx.stroke();
      rockShape(k, 0.58, -0.14 * k.r, 0.14 * k.r); ctx.fillStyle = C.rockL; ctx.fill();
    }
    // Passoires : arbres tombés dans le courant.
    for (const q of rv.strainers) {
      if (!vis(q.y0, 14)) continue;
      const dx = q.x1 - q.x0, dy = q.y1 - q.y0;
      ctx.strokeStyle = '#5b3d22'; ctx.lineWidth = 0.9; line(q.x0, q.y0, q.x1, q.y1);
      ctx.lineWidth = 0.3;
      for (let i = 1; i <= 6; i++) { const f = i / 6.5, bx = q.x0 + dx * f, by = q.y0 + dy * f, l = 1.2 + 1.4 * R.hash(i + q.y0); line(bx, by, bx + dy / 8 * l + dx * 0.04, by - Math.abs(dx) / 8 * l); line(bx, by, bx - dy / 9 * l + dx * 0.05, by + Math.abs(dx) / 11 * l); }
      ctx.fillStyle = '#3f2a17'; circle(q.x0, q.y0, 1.1); ctx.fill();
    }
    // Repères d'objectifs.
    let limLab = null;
    for (const m of st.marks || []) {
      const col = m.active ? C.vfi : 'rgba(255,255,255,.4)';
      if (m.t === 'gate') {
        if (m.active) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.2; ctx.setLineDash([0.8, 0.8]); line(m.x - m.w / 2, m.y, m.x + m.w / 2, m.y); ctx.setLineDash([]); }
        for (let sd = -1; sd <= 1; sd += 2) { ctx.fillStyle = col; circle(m.x + sd * m.w / 2, m.y, 0.75 + (m.active ? 0.1 * Math.sin(t * 5) : 0)); ctx.fill(); ctx.fillStyle = '#fff'; circle(m.x + sd * m.w / 2, m.y, 0.28); ctx.fill(); }
      } else if (m.t === 'finish') {
        rv.at(m.y, A);
        for (let i = 0; i < A.hw * 2 / 1.5; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(A.cx - A.hw + i * 1.5, m.y + j * 1.5, 1.5, 1.5); }
      } else if (m.t !== 'portage') {
        ctx.strokeStyle = col; ctx.lineWidth = 0.35; ctx.setLineDash([1.3, 1]); ctx.lineDashOffset = -t * 1.5; circle(m.x, m.y, m.r); ctx.stroke(); ctx.setLineDash([]);
        if (m.active && st.hold > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832 * Math.min(1, st.hold)); ctx.stroke(); }
        if (m.active && m.limit) { rv.at(m.limit, A); ctx.strokeStyle = 'rgba(212,67,47,.9)'; ctx.lineWidth = 0.35; ctx.setLineDash([1.5, 1.2]); line(A.cx - A.hw, m.limit, A.cx + A.hw, m.limit); ctx.setLineDash([]);
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
    if (st.rope) {
      const r = st.rope;
      if (r.fly && r.sw) {
        const p = Math.min(1, r.fly.p), ex = r.sw.saved ? r.sw.x : r.tx + (r.fly.x - r.tx) * p, ey = r.sw.saved ? r.sw.y : r.ty + (r.fly.y - r.ty) * p;
        ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.2; line(r.tx, r.ty, ex, ey); ctx.fillStyle = C.canot; circle(ex, ey, 0.45); ctx.fill();
      }
      for (const p of r.past || []) {
        if (p.saved) { ctx.strokeStyle = C.vfi; ctx.lineWidth = 0.2; line(r.tx, r.ty, p.x, p.y); }
        ctx.globalAlpha = Math.max(0, Math.min(1, 4 - p.t)); drawSwim({ x: p.x, y: p.y, active: false, sth: 0 }, t); ctx.globalAlpha = 1;
      }
      if (r.sw) drawSwim({ x: r.sw.x, y: r.sw.y, active: false, sth: 0 }, t);
      ctx.fillStyle = C.vfi; ctx.beginPath(); ctx.ellipse(r.tx, r.ty, 0.6, 0.42, 0, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#3fa7d6'; circle(r.tx, r.ty, 0.3); ctx.fill();
    }
    if (st.boat) { if (st.boat.mode === 'swim') drawSwim(st.boat, t); else drawCanoe(st.boat, st.inp, t); }

    const ls = (st.labels || []).slice(); if (limLab) ls.push(limLab);
    if (rv.portage && st.showSigns !== false) { const p = trail(rv, rv.portage), n = p.length; ls.push({ x: p[2], y: p[3], text: 'Portage', kind: 'hint' }, { x: p[n - 4], y: p[n - 3], text: 'Portage', kind: 'hint' }); }
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
  rd.draw(rv, { t: 1.3, parts: [], lines, marks: [], boat, inp: {}, showSigns: false, labels: (sc.labels || []).map(l => ({ x: rv.cxAt(l[1]) + l[0], y: l[1], text: l[2], kind: l[3] || 'ok' })) });
};
})();
