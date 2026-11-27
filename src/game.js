(function () {
'use strict';
// Contrôleur de jeu : états, tâches, caméra, filets de courant, repérage et atelier du sac à corde.
// États : 'demo' (pilote derrière les menus), 'scout', 'run', 'swim', 'rope', 'dlg', 'done'.
const G = R.game = { st: 'demo', paused: false, headless: false, t: 0, view: 'menu', result: null };
const PI = Math.PI, U = {}, V = { ya: 0, yb: 1, xa: -1, xb: 1 };

const NAMES = { vaval: 'V aval', vamont: 'V amont', contre: 'Contre-courant', rouleau: 'Rouleau', vagues: 'Train de vagues', passoire: 'Passoire', seuil: 'Seuil', portage: 'Portage', falaise: 'Falaise', hautfond: 'Haut-fond', veine: 'Veine principale' };
const DANGER = { rouleau: 1, passoire: 1, seuil: 1, falaise: 1 };
const QS = {
  vaval: 'Touche un V aval : la langue d’eau lisse qui pointe vers l’aval.',
  vamont: 'Touche un V amont : sa pointe montre une roche à éviter.',
  contre: 'Touche un contre-courant : l’eau calme derrière une roche, pour s’arrêter.',
  rouleau: 'Touche le rouleau : l’eau blanche qui tourne sur elle-même.',
  vagues: 'Touche le train de vagues : il marque l’eau profonde.',
  passoire: 'Touche la passoire : l’arbre tombé qui laisse passer l’eau, mais pas toi.',
  seuil: 'Touche le seuil : la marche où la rivière tombe d’un coup.',
  portage: 'Où t’arrêtes-tu avant le seuil? Touche la zone de portage.',
  falaise: 'Touche une falaise : une berge où on ne peut pas sortir.',
  hautfond: 'Touche un haut-fond : l’eau pâle où le canot racle.',
  veine: 'Touche la veine principale : l’eau foncée et profonde.'
};
const HINTS = {
  vaval: 'Cherche l’eau lisse entre deux roches. La pointe du V monte vers le haut de l’écran, vers l’aval.',
  vamont: 'Cherche un V d’écume dont la pointe est collée sur une roche.',
  contre: 'Regarde juste en aval d’une grosse roche, plus haut sur l’écran : l’eau y est sombre et calme.',
  rouleau: 'Cherche une ligne d’écume blanche en travers du courant, qui reste sur place.',
  vagues: 'Cherche une série de vagues régulières, l’une derrière l’autre.',
  passoire: 'Cherche un tronc brun qui part d’une rive, souvent à l’extérieur d’un virage.',
  seuil: 'Cherche une ligne droite en travers de toute la rivière, suivie d’une bande d’écume.',
  portage: 'Cherche la zone jaune le long de la rive, juste avant le seuil.',
  falaise: 'Cherche une bande de roc gris le long d’une rive, sans plage ni arbres.',
  hautfond: 'Cherche une tache d’eau très pâle, où l’on voit les cailloux du fond.',
  veine: 'Cherche la bande d’eau la plus foncée, celle qui contourne les bancs pâles.'
};
const MSG = {
  gate: 'Passe entre les deux bouées.',
  eddy: 'Arrête-toi dans le contre-courant, derrière la roche.',
  zone: 'Arrête-toi dans le cercle et restes-y.',
  ferry: 'Traverse en bac jusqu’au cercle, de l’autre côté.',
  portage: 'Seuil devant! Arrête-toi dans la zone de portage, le long de la rive.',
  finish: 'Descends jusqu’à la ligne d’arrivée.',
  land: 'Accoste sur la berge pour aller voir la suite à pied.'
};
const MISS = {
  eddy: 'Contre-courant manqué. Passe plus près de la roche, puis tourne derrière elle.',
  zone: 'Tu as dépassé le cercle. Fais un rétro plus tôt : le canot glisse sur son erre.',
  ferry: 'Tu as trop dérivé. Pointe plus vers l’amont et pagaie fort.'
};
const LET = {
  passoire: ['Passoire!', 'L’eau passe à travers les branches, mais pas toi. C’est un des pires dangers en rivière : on s’en éloigne tôt, toujours.'],
  rappel: ['Rappel!', 'Au pied d’un seuil, l’eau revient vers l’arrière et peut te retenir. On ne franchit jamais un seuil sans le connaître : on portage.'],
  ko: ['Trop de chocs', 'Sur le dos, pieds en surface vers l’aval : tes pieds amortissent les roches. Réessaie en position de sécurité.']
};
const SWIM_A = 'À l’eau! Mets-toi en position de sécurité (Espace) : sur le dos, pieds vers l’aval.';
const SWIM_B = 'Bien! Nage avec les flèches vers l’eau calme ou la rive. La nage active (Espace), c’est seulement loin des roches.';
const KEYS = { arrowup: 'fwd', w: 'fwd', arrowdown: 'back', s: 'back', arrowleft: 'left', arrowright: 'right', a: 'leanL', d: 'leanR', q: 'latL', e: 'latR', b: 'bail' };
// Écoper : à l'arrêt (moins de 1 m/s par rapport au fond) dans un courant faible (moins de 1 m/s).
const BAIL_CALM = 1.0, BAIL_SPEED = 1.0, BAIL_TIME = 3.5;

let rd = null, cv = null, rv = null, def = null, boat = null, tasks = [], ti = 0, stats = null, cp = null;
let hold = 0, portT = 0, parts = [], labels = [], tlabels = [], sc = null, rope = null, camMode = 'follow', scouted = false;
let padT = 0, rivT = 0, touch = false, drag = null, wrongT = 0, wrongShown = false, cliffSeen = false;
let niveau = 'moyen', wet = 0, scrapeSeen = false, waterWarned = false, bailNoT = 0, scrT = 0, bailT = 0, keepWater = false;
const inp = { fwd: false, back: false, left: false, right: false, latL: false, latR: false, leanL: false, leanR: false, bail: false };
// Clavier et tactile d'un côté, manette de l'autre : fusionnés (OU) dans inp à chaque image.
const kb = Object.assign({}, inp), gp = Object.assign({}, inp);
const newStats = () => ({ hits: 0, caps: 0, lethal: 0, missed: 0, time: 0, grounds: 0, wmax: 0 });

// Accès en lecture pour les tests et l'interface.
Object.defineProperties(G, {
  boat: { get: () => boat }, rv: { get: () => rv }, def: { get: () => def }, tasks: { get: () => tasks },
  ti: { get: () => ti }, stats: { get: () => stats }, labels: { get: () => labels }, renderer: { get: () => rd },
  rope: { get: () => rope }, scout: { get: () => sc }, inp: { get: () => inp }, wrongShown: { get: () => wrongShown },
  niveau: { get: () => niveau }
});

function clearInp() { for (const k in inp) inp[k] = kb[k] = gp[k] = false; }
function sfx(n) { if (!G.headless && G.st !== 'demo') R.audio.sfx(n); }
function say(m) { if (!G.headless && G.st !== 'demo' && R.ui) R.ui.toast(m); }
function bankX(side, y, d) { return side === 'L' ? rv.cxAt(y) - rv.hwAt(y) + d : rv.cxAt(y) + rv.hwAt(y) - d; }
function segD(px, py, x0, y0, x1, y1) {
  const vx = x1 - x0, vy = y1 - y0, l = vx * vx + vy * vy || 1e-6, t = R.clamp(((px - x0) * vx + (py - y0) * vy) / l, 0, 1);
  return Math.hypot(px - x0 - vx * t, py - y0 - vy * t);
}

function resolve(k0) {
  const k = Object.assign({}, k0);
  if (k.t === 'portage') {
    const z = rv.portage;
    if (z) { k.z = z; k.y = (z.y0 + z.y1) / 2; k.x = bankX(z.side, k.y, Math.min(4, rv.hwAt(k.y) * 0.5)); }
    k.r = 4; k.hold = 1; return k;
  }
  if (k.t === 'land') { k.y = (k.y0 + k.y1) / 2; k.x = bankX(k.side, k.y, Math.min(4, rv.hwAt(k.y) * 0.5)); k.r = 4; k.hold = 1; return k; }
  if (k.t === 'finish') return k;
  const ins = k.inset == null ? Math.min(5, rv.hwAt(k.y) * 0.4) : k.inset;
  k.x = k.o === 'L' ? bankX('L', k.y, ins) : k.o === 'R' ? bankX('R', k.y, ins) : rv.cxAt(k.y) + (k.o || 0);
  if (k.r == null) k.r = k.t === 'zone' ? 5 : 4;
  if (k.hold == null) k.hold = 2;
  if (k.t === 'gate' && k.w == null) k.w = 8;
  return k;
}

function setSt(s) {
  G.st = s;
  if (G.headless) return;
  if (s === 'run' || s === 'swim') G.setView('run');
  else if (s === 'scout') G.setView('scout');
  else if (s === 'rope') G.setView('rope');
}

G.setView = function (v) {
  if (G.headless) return;
  G.view = v; document.body.dataset.view = v;
  if (R.ui) { R.ui.hud(v === 'run' || v === 'rope'); if (v !== 'scout') R.ui.scoutbar(null); }
  const pad = R.$('#pad'); if (pad) pad.hidden = !(v === 'run' && touch);
  const s = R.$('#screen'); if (s) s.hidden = v !== 'menu';
  if (v !== 'menu' && document.activeElement && document.activeElement.blur) document.activeElement.blur();
};

function toSwim() { boat.mode = 'swim'; boat.active = true; boat.hearts = 3; boat.safeT = 0; boat.sdir = 0; boat.hitCd = 0.5; }

G.load = function (d, opts) {
  opts = opts || {}; def = d; G.opts = opts;
  // Niveau d'eau : rivières seulement ; les leçons restent en eau moyenne.
  const river = R.LEVELS.riv.includes(d);
  niveau = river && R.NIVEAUX[opts.niveau] ? opts.niveau : 'moyen';
  rv = R.buildRiver(d, niveau); wet = river ? rv.nv.wet : 0;
  scrapeSeen = false; waterWarned = false; bailNoT = 0; keepWater = false;
  const s = d.start || [0, 10, 0];
  boat = R.sim.newBoat(rv.cxAt(s[1]) + s[0], s[1], s[2] * PI / 180);
  // Variantes par niveau d'eau : niv = niveaux où la tâche existe ; bas / haut = valeurs remplacées.
  tasks = (d.tasks || []).filter(k => !k.niv || k.niv.includes(niveau)).map(k => resolve(k[niveau] ? Object.assign({}, k, k[niveau]) : k)); ti = 0; stats = newStats();
  labels = []; tlabels = []; parts = []; clearInp(); hold = 0; portT = 0; rope = null; sc = null; wrongT = 0; wrongShown = false; cliffSeen = false;
  G.result = null; G.paused = false; camMode = 'follow'; scouted = false;
  cp = { x: boat.x, y: boat.y, th: boat.th };
  if (opts.demo) G.st = 'demo';
  else if (d.swimOnly) { toSwim(); setSt('swim'); }
  else if (d.scout && !opts.noScout) scoutStart();
  else setSt('run');
  snapCam();
};
G.demoStart = function () { G.load(R.LEVELS.riv.find(d => d.id === 'r1') || R.LEVELS.riv[0], { demo: true }); };
G.restart = function () { if (def === R.ROPE) G.ropeStart(); else G.load(def, { noScout: scouted, niveau }); };

function toCheckpoint() {
  if (def.swimOnly) { const s = stats; G.load(def, { noScout: true }); stats = s; return; }
  // Après un objectif manqué, l'eau reste dans le canot ; après un chavirage, on l'a vidé.
  const w = keepWater && boat && boat.mode === 'canoe' ? boat.water : 0; keepWater = false;
  boat = R.sim.newBoat(cp.x, cp.y, cp.th); hold = 0; portT = 0; clearInp(); boat.water = w;
  if (G.st !== 'demo') setSt('run');
  snapCam();
}

// ---------- Mise à jour (sans rendu) ----------
G.update = function (dt) {
  G.t += dt;
  if (!rv) return;
  for (let i = tlabels.length - 1; i >= 0; i--) if (tlabels[i].until < G.t) tlabels.splice(i, 1);
  if (G.paused) return;
  const st = G.st;
  if (st === 'demo' || st === 'run' || st === 'swim') {
    if (st !== 'demo') stats.time += dt;
    const h = dt / 2;
    for (let i = 0; i < 2; i++) {
      const b = boat, demo = G.st === 'demo';
      if (demo || G.headless) autoInput();
      if (b.mode === 'swim') R.sim.stepSwim(b, inp, rv, h);
      else { bail(b, h); R.sim.stepCanoe(b, inp, rv, h, demo || !!def.assist, demo ? 0 : (def.tippy || 1) * rv.nv.tip, demo ? 0 : wet); }
      events();
      if (G.st !== st || boat !== b) break;
      if (b.mode === 'canoe') { waterCheck(); doTasks(h); }
      if (G.st !== st || boat !== b) break;
    }
    if (!G.headless && boat) sounds(dt);
  } else if (st === 'rope') ropeUpdate(dt);
};

// Écoper : seulement à l'arrêt en eau calme. On ne pagaie pas pendant qu'on écope.
function calmHere(b) {
  rv.flow(b.x, b.y, U);
  return Math.hypot(b.vx, b.vy) < BAIL_SPEED && Math.hypot(U.x, U.y) < BAIL_CALM;
}
function bail(b, h) {
  b.bailing = false; bailNoT -= h;
  if (!inp.bail || !wet || b.water <= 0) return;
  if (!calmHere(b)) {
    if (bailNoT <= 0) { bailNoT = 2.5; say('Impossible d’écoper dans le courant : trouve de l’eau calme.'); sfx('no'); }
    return;
  }
  b.bailing = true; b.water = Math.max(0, b.water - h / BAIL_TIME);
}
G.canBail = () => !!(boat && boat.mode === 'canoe' && wet && boat.water > 0.01);

function autoInput() {
  const b = boat;
  if (b.mode === 'swim') { // vers la rive la plus proche, en position de sécurité
    b.active = false; const c = rv.cxAt(b.y);
    inp.left = b.x < c; inp.right = b.x >= c; inp.fwd = inp.back = inp.leanL = inp.leanR = false; return;
  }
  const k = tasks[ti]; let tx, ty;
  if (!k) { ty = b.y + 10; tx = rv.cxAt(ty); }
  else if (k.t === 'gate') { tx = k.x; ty = k.y + 3; }
  else if (k.t === 'finish') { ty = k.y + 6; tx = rv.cxAt(ty); }
  else { tx = k.x; ty = k.y; }
  if (ty - b.y > 22) {
    const y2 = b.y + 16, h2 = rv.hwAt(y2);
    tx = rv.cxAt(y2) + R.clamp((tx - rv.cxAt(ty)) * h2 / rv.hwAt(ty), -0.6 * h2, 0.6 * h2); ty = y2;
  }
  if (G.naive) { R.sim.naive(b, k && k.t !== 'finish' ? k.x : tx, k && k.t !== 'finish' ? k.y : ty, inp); return; }
  R.sim.bot(b, rv, tx, ty, inp, !!(k && k.back));
  // Pendant un arrêt (contre-courant, accostage), le pilote écope s'il a de l'eau.
  inp.bail = false;
  if (wet && b.water > 0.02 && k && (k.t === 'eddy' || k.t === 'ferry' || k.t === 'land' || k.t === 'portage') && Math.hypot(b.x - k.x, b.y - k.y) < k.r + 2 && calmHere(b)) {
    inp.bail = true; inp.fwd = inp.back = inp.left = inp.right = inp.latL = inp.latR = false;
  }
}

function events() {
  const b = boat; if (!b.ev.length) return;
  const ev = b.ev; b.ev = [];
  for (const e of ev) {
    if (e === 'bump') sfx('bump');
    else if (e === 'hit') { sfx('hit'); stats.hits++; say('Aïe, une roche! Lis la rivière plus loin devant.'); }
    else if (e === 'capsize' || e === 'swamp') {
      stats.caps++; sfx('splash');
      if (e === 'swamp') stats.wmax = 1;
      if (G.st === 'demo') { toCheckpoint(); return; }
      toSwim(); setSt('swim'); clearInp();
      say(e === 'swamp' ? 'Ton canot est plein d’eau : il ne flotte plus assez. À la nage!' : 'Tu as chaviré! Vite, la position de sécurité.');
      return;
    }
    else if (e === 'ground') { stats.grounds++; sfx('scrape'); scrapeToast(); }
    else if (e === 'scrape') scrapeToast(); else if (e === 'ouch') { sfx('hit'); say('Aïe! En position de sécurité, tes pieds amortissent les roches.'); }
    else if (e === 'cliff') { if (!cliffSeen) { cliffSeen = true; say('Falaise : impossible de sortir ici. Continue jusqu’à une berge basse.'); } }
    else if (e === 'safe') { safe(); return; }
    else if (LET[e]) { lethal(e); return; }
  }
}

function safe() {
  if (def.swimOnly) { finish(); return; }
  if (G.st === 'demo' || G.headless) { toCheckpoint(); return; }
  setSt('dlg'); clearInp(); sfx('ding');
  R.ui.dialog('Sain et sauf!', '<p>Tu as rejoint l’eau calme. On vide le canot et on repart du dernier arrêt.</p>', [['Repartir', toCheckpoint]]);
}

function lethal(e) {
  stats.lethal++;
  if (G.st === 'demo' || G.headless) { toCheckpoint(); return; }
  sfx('fail'); setSt('dlg'); clearInp();
  R.ui.dialog(LET[e][0], '<p>' + LET[e][1] + '</p>', [[def.swimOnly ? 'Recommencer' : 'Réessayer', toCheckpoint]]);
}

function scrapeToast() { if (!scrapeSeen) { scrapeSeen = true; say('Tu racles le fond! Suis l’eau foncée : c’est la veine principale.'); } }
function waterCheck() {
  if (boat.water > stats.wmax) stats.wmax = boat.water;
  if (!waterWarned && boat.water >= 0.35) { waterWarned = true; say('Ton canot se remplit. Arrête-toi dans un contre-courant et écope.'); }
}
function pass() {
  ti++; hold = 0; portT = 0;
  if (ti < tasks.length) sfx('ding'); else finish();
}
function miss(msg, retry) {
  stats.missed++; hold = 0; say(msg);
  if (retry) { keepWater = true; toCheckpoint(); } else { ti++; if (ti >= tasks.length) finish(); }
}

function doTasks(h) {
  const k = tasks[ti], b = boat; if (!k) return;
  if (k.t === 'gate') {
    if (b.y >= k.y) { if (b.py < k.y && Math.abs(b.x - k.x) < k.w / 2) pass(); else miss('Porte manquée. On continue.', false); }
  } else if (k.t === 'finish') {
    if (b.y >= k.y) pass();
  } else if (k.t === 'portage' || k.t === 'land') {
    const land = k.t === 'land', z = k.z;
    if (!land && !z) { pass(); return; }
    const side = land ? k.side : z.side, ya = land ? k.y0 : z.y0, yb = land ? k.y1 : z.y1;
    const sp = Math.hypot(b.vx, b.vy);
    const inZ = b.y >= ya && b.y <= yb && Math.abs(b.x - bankX(side, b.y, 0)) < Math.min(8, rv.hwAt(b.y));
    if (inZ && sp < 1.3) portT += h; else portT = 0;
    hold = portT;
    if (!land) wrongSide(z, b, sp, h);
    if (portT >= 1) {
      const tip = Math.abs(b.th) > 2.094 ? 'Bel accostage, face à l’amont!' : 'Astuce : accoste face à l’amont, le canot est plus stable.';
      if (!land) {
        const y = z.toY, x = bankX(z.side, y, Math.min(5, rv.hwAt(y) * 0.4));
        boat = R.sim.newBoat(x, y, 0); cp = { x, y, th: 0 };
        say('Portage : vous portez le canot sur la berge pour contourner le seuil. ' + tip);
        pass(); snapCam();
      } else {
        cp = { x: b.x, y: b.y, th: b.th }; b.vx = b.vy = b.om = 0; say(tip);
        if (G.st === 'demo' || G.headless) pass(); else footScout(k);
      }
    } else if (land && b.y > yb + 15) miss(k.miss || 'Tu as dépassé l’endroit où accoster.', !!k.retry);
  } else {
    // Un arrêt est un arrêt : dans le cercle ET presque immobile (moins de 1,3 m/s par rapport au fond).
    // Exception : le cercle de la leçon 1 (zone), qui reste tolérant.
    const d = Math.hypot(b.x - k.x, b.y - k.y);
    if (d < k.r && (k.t === 'zone' || Math.hypot(b.vx, b.vy) < 1.3)) hold += h; else hold = Math.max(0, hold - 2 * h);
    if (hold >= k.hold) { cp = { x: k.x, y: k.y, th: b.th }; pass(); }
    else if (k.t === 'ferry' ? b.y > k.limit : b.y > k.y + k.r + 22) miss(k.miss || MISS[k.t] || MISS.zone, !!k.retry);
  }
}

// Mauvais côté : arrêté sous la falaise, en face du sentier de portage.
function wrongSide(z, b, sp, h) {
  const os = z.side === 'L' ? 'R' : 'L', sy = rv.seuil ? rv.seuil.y : z.y1 + 10;
  const on = sp < 1.3 && b.y >= z.y0 - 25 && b.y < sy && rv.bankType(os, b.y) === 'cliff' && Math.abs(b.x - bankX(os, b.y, 0)) < Math.min(8, rv.hwAt(b.y));
  if (on) wrongT += h; else { wrongT = 0; wrongShown = false; }
  if (wrongT >= 1 && !wrongShown) { wrongShown = true; say('Pas de sentier de ce côté : la falaise bloque. Traverse en bac vers l’autre rive, tant que tu as la place.'); }
}

function finish() {
  if (G.st === 'demo') { G.load(def, { demo: true }); return; }
  const s = stats;
  const n = def.swimOnly ? Math.max(1, boat.hearts)
    : (!s.caps && !s.lethal && !s.missed && !s.grounds && s.hits <= 1) ? 3 : (!s.lethal && s.caps <= 1 && s.missed <= 1) ? 2 : 1;
  G.st = 'done'; G.result = { n, niveau, stats: Object.assign({}, s) }; clearInp();
  if (G.headless) return;
  R.save.star(R.starKey(def.id, niveau), n); if (def.swimOnly) R.save.mark('swim');
  R.audio.sfx('win');
  const d = def, nv = niveau;
  setTimeout(() => { if (G.st === 'done' && def === d) R.ui.result(d, n, s, nv); }, 900);
}

function sounds(dt) {
  const paddling = boat.mode === 'canoe' && G.st === 'run' && (inp.fwd || inp.back || inp.left || inp.right);
  padT += dt; if (paddling && !boat.bailing && padT > 0.55) { padT = 0; R.audio.sfx('paddle'); }
  scrT -= dt; if (boat.mode === 'canoe' && boat.scrape > 0.15 && scrT <= 0) { scrT = 0.32; R.audio.sfx('scrape'); }
  bailT -= dt; if (boat.bailing && bailT <= 0) { bailT = 0.7; R.audio.sfx('bail'); }
  rivT += dt;
  if (rivT > 0.3) { rivT = 0; rv.flow(boat.x, boat.y, U); R.audio.setRiver(R.clamp(Math.hypot(U.x, U.y) / 3.2, 0, 1)); }
}

// ---------- Repérage ----------
function scoutStart() {
  const f = rv.features(), list = def.scout.filter(t => f.some(q => q.type === t));
  sc = { q: list, i: 0, fails: 0, y: R.clamp(boat.y + 40, 10, rv.L - 10) };
  camMode = 'scout'; setSt('scout'); scoutBar();
  if (!list.length) scoutEnd();
}
function scoutBar() {
  if (G.headless || !R.ui) return;
  R.ui.scoutbar(sc && sc.i < sc.q.length ? { q: QS[sc.q[sc.i]], i: sc.i, n: sc.q.length, foot: !!sc.foot } : null);
}
function scoutNext() { sc.i++; sc.fails = 0; tlabels = []; if (sc.i >= sc.q.length) scoutEnd(); else scoutBar(); }
// Repérage à pied (tâche « land ») : même mécanique, limité au tronçon range.
function footScout(k) {
  const ya = k.range[0], yb = k.range[1];
  const fs = rv.features().filter(f => inRange(f, [ya, yb]));
  sc = { q: (k.scout || []).filter(t => fs.some(f => f.type === t)), i: 0, fails: 0, y: (ya + yb) / 2, range: [ya, yb], foot: k };
  camMode = 'scout'; setSt('scout'); scoutBar();
  if (!sc.q.length) scoutEnd();
}
function inRange(f, r) { return (f.y1 != null ? f.y1 : f.y) >= r[0] - 5 && (f.y0 != null ? f.y0 : f.y) <= r[1] + 5; }
function scClamp(y) { return sc && sc.range ? R.clamp(y, sc.range[0], sc.range[1]) : R.clamp(y, 10, rv.L - 10); }
function fdist(f, w) {
  if (f.type === 'seuil') return [Math.abs(w.y - f.y), 5];
  if (f.type === 'falaise') { // tolérance généreuse le long de toute la paroi
    if (w.y < f.y0 - 4 || w.y > f.y1 + 4) return [Infinity, 0];
    return [Math.abs(w.x - bankX(f.side, R.clamp(w.y, f.y0, f.y1), f.side === 'L' ? -2 : 2)), 7];
  }
  return [Math.hypot(w.x - f.x, w.y - f.y), f.r];
}
// Veine principale : tout point dont la profondeur est proche du maximum de sa section.
// Haut-fond : un point peu profond sur un banc (pas le simple bord de la rive).
function depthTap(type, w) {
  const d = rv.depth(w.x, w.y);
  if (d <= -0.4) return null;
  if (type === 'veine') { const m = rv.deepest(w.y); return d >= m.d - Math.max(0.12, 0.12 * m.d) ? { x: w.x, y: w.y } : null; }
  if (d > 0.45) return null;
  for (const b of rv.bars) { const ex = (w.x - b.x) / (b.rx + 1.5), ey = (w.y - b.y) / (b.ry + 1.5); if (ex * ex + ey * ey < 1) return { x: w.x, y: w.y }; }
  return null;
}
G.depthTap = depthTap;
function scoutEnd() {
  if (R.ui) R.ui.scoutbar(null);
  const foot = sc && sc.foot; setSt('dlg');
  if (foot) {
    R.ui.dialog('Repérage terminé', '<p>Tu as vu le passage. Retourne au canot : on repart d’ici, avec ce plan en tête.</p>',
      [['Repartir', () => { sc = null; camMode = 'follow'; setSt('run'); pass(); snapCam(); }]]);
    return;
  }
  scouted = true;
  R.ui.dialog('Repérage terminé', '<p>Tu sais où passer et où t’arrêter. Garde ce plan en tête.</p>', [['Départ!', () => { camMode = 'follow'; setSt('run'); snapCam(); }]]);
}
G.scoutPan = function (d) { if (sc) sc.y = scClamp(sc.y + d); };
G.scoutSkip = function () { if (G.st === 'scout' && !G.paused) scoutNext(); };
G.scoutTap = function (sx, sy) {
  if (G.st !== 'scout' || G.paused || !sc) return;
  const type = sc.q[sc.i]; if (!type) return;
  const w = rd.toWorld(sx, sy), cands = rv.features().filter(f => f.type === type && (!sc.range || inRange(f, sc.range)));
  let best = (type === 'veine' || type === 'hautfond') ? depthTap(type, w) : null, bd = Infinity;
  if (!best) for (const f of cands) {
    if (f.type === 'veine') continue;
    const [d, lim] = fdist(f, w);
    if (d < lim && d < bd) { bd = d; best = f; }
  }
  if (best) {
    labels.push({ x: best.x, y: best.y, text: NAMES[type], kind: DANGER[type] ? 'danger' : 'ok' });
    sfx('ding'); scoutNext(); return true;
  }
  sc.fails++; sfx('no'); say('Pas tout à fait. ' + HINTS[type]);
  if (sc.fails >= 2) {
    let nb = null, nd = Infinity;
    for (const f of cands) {
      tlabels.push({ x: f.x, y: f.y, text: '?', kind: 'hint', until: G.t + 4 });
      const d = Math.hypot(w.x - f.x, w.y - f.y); if (d < nd) { nd = d; nb = f; }
    }
    if (nb) sc.y = scClamp(nb.y);
  }
  return false;
};

// ---------- Atelier du sac à corde ----------
G.ropeStart = function () {
  def = R.ROPE; rv = R.buildRiver(def); boat = null; tasks = []; ti = 0; stats = newStats();
  labels = []; tlabels = []; parts = []; clearInp(); G.paused = false; sc = null; G.result = null;
  const ty = 80;
  rope = { tx: rv.cxAt(ty) + rv.hwAt(ty) + 1.2, ty, sw: null, fly: null, n: 0, saved: 0, thrown: false, wait: 0 };
  camMode = 'rope'; setSt('rope'); ropeNext(); snapCam();
};
function ropeNext() {
  const r = rope;
  if (r.n >= 5) { ropeEnd(); return; }
  r.n++; r.sw = { x: rv.cxAt(30) - 9 + Math.random() * 14, y: 30, saved: false }; r.fly = null; r.thrown = false; r.wait = 0;
}
function ropeUpdate(dt) {
  const r = rope, s = r && r.sw; if (!s) return;
  if (s.saved) { // la corde fait pendule : le courant ramène le nageur vers la rive du lanceur
    const bx = rv.cxAt(s.y) + rv.hwAt(s.y) - 0.8;
    s.x += Math.min(1.9 * dt, Math.max(0, bx - s.x)); s.y += (r.ty + 3 - s.y) * Math.min(1, dt * 0.9);
  } else {
    // Tant que le nageur est loin en amont, hors de portée, il arrive plus vite (pas d'attente à vide).
    const k = s.y < r.ty && Math.hypot(s.x - r.tx, s.y - r.ty) > 26 ? 3 : 1;
    rv.flow(s.x, s.y, U); s.x += U.x * dt * k; s.y += U.y * dt * k;
    for (const k of rv.rocks) { const dx = s.x - k.x, dy = s.y - k.y, d = Math.hypot(dx, dy), m = k.r + 0.5; if (d < m && d > 0.01) { s.x = k.x + dx / d * m; s.y = k.y + dy / d * m; } }
  }
  if (r.fly && r.fly.p < 1) { r.fly.p += dt / r.fly.dur; if (r.fly.p >= 1) { r.fly.p = 1; ropeLand(); } }
  const out = s.y > 132 || s.x > rv.cxAt(s.y) + rv.hwAt(s.y) - 1 || s.x < rv.cxAt(s.y) - rv.hwAt(s.y) + 1;
  if (out) { r.wait += dt; if (r.wait > 0.9) ropeNext(); }
}
function ropeLand() {
  const r = rope, s = r.sw, f = r.fly;
  if (segD(s.x, s.y, r.tx, r.ty, f.x, f.y) < 2.2) {
    s.saved = true; r.saved++; sfx('ding'); say('Bien lancé! Il attrape la corde et le courant le ramène au bord.'); return;
  }
  sfx('no');
  const lt = Math.hypot(f.x - r.tx, f.y - r.ty), st = Math.hypot(s.x - r.tx, s.y - r.ty);
  if (lt < st - 2.2) say('Trop court. Lance plus loin que le nageur : la corde doit tomber sur lui.');
  else if (f.y < s.y) say('Trop tard : la corde est tombée derrière lui. Vise un peu devant, là où il sera.');
  else say('Trop tôt : vise plus près de lui.');
}
function ropeEnd() {
  const r = rope, ok = r.saved >= 3; r.sw = null; r.fly = null;
  if (ok) R.save.mark('rope');
  setSt('dlg'); sfx(ok ? 'win' : 'no');
  R.ui.dialog('Atelier terminé', '<p>Tu as sauvé <b>' + r.saved + '</b> nageur' + (r.saved > 1 ? 's' : '') + ' sur 5.</p><p>' +
    (ok ? 'Bravo! Tu sais lancer le sac à corde.' : 'Il en faut 3 pour réussir. Vise un peu devant le nageur, là où il sera.') + '</p>',
    [['Rejouer', G.ropeStart], ['Retour', () => R.ui.go('secu')]]);
}
G.ropeTap = function (sx, sy) {
  const r = rope;
  if (G.st !== 'rope' || G.paused || !r || !r.sw || r.thrown || r.sw.saved) return;
  const w = rd.toWorld(sx, sy); let dx = w.x - r.tx, dy = w.y - r.ty, d = Math.hypot(dx, dy) || 0.01;
  if (d > 22) { dx *= 22 / d; dy *= 22 / d; d = 22; }
  r.fly = { x: r.tx + dx, y: r.ty + dy, p: 0, dur: 0.45 + 0.03 * d }; r.thrown = true;
  tlabels.push({ x: r.tx, y: r.ty, text: 'Corde!', kind: 'ok', until: G.t + 1.3 }); sfx('whoosh');
};

// ---------- Pause ----------
G.canPause = () => !G.paused && ['run', 'swim', 'scout', 'rope'].includes(G.st);
G.pause = function () {
  if (!G.canPause()) return;
  G.paused = true; clearInp();
  const back = def === R.ROPE ? 'secu' : R.ui.backOf(def);
  R.ui.dialog('Pause', '<p>La rivière t’attend.</p><p>' + R.ui.soundBtn() + '</p>', [
    ['Reprendre', () => { G.paused = false; }],
    ['Recommencer', () => { G.paused = false; G.restart(); }],
    ['Quitter', () => { G.paused = false; R.ui.go(back); }]
  ], { esc: 0 });
};
G.toggleSwim = function () { if (boat && boat.mode === 'swim' && G.st === 'swim' && !G.paused) boat.active = !boat.active; };

// ---------- Outils de test ----------
// mode 'naif' : pilote naïf (mesure de difficulté) ; sinon pilote expert.
G.autoRun = function (d, max, niv, mode) {
  const was = G.headless; G.headless = true; G.naive = mode === 'naif';
  let t = 0, out;
  try {
    G.load(d, { noScout: true, niveau: niv });
    const h = 1 / 30;
    while (t < max && !G.result) { G.update(h); t += h; }
    out = { id: d.id, niveau, ok: !!G.result, t: +t.toFixed(1), ti, n: G.result ? G.result.n : 0, stats: Object.assign({}, stats) };
  } finally { G.headless = was; G.naive = false; }
  if (rd) G.demoStart();
  return out;
};

// ---------- Caméra, filets et rendu ----------
function camTarget() {
  const W = rd.W, H = rd.H, c = rd.cam;
  if (camMode === 'scout' && sc) { c.s = Math.min(W / 62, H / 105); c.anchor = 0.5; return { x: rv.cxAt(sc.y), y: sc.y, k: drag && drag.moved ? 30 : 6 }; }
  if (camMode === 'rope') { c.s = Math.min(W / 48, H / 60); c.anchor = 0.5; return { x: rv.cxAt(80), y: 80, k: 100 }; }
  c.s = R.clamp(Math.min(W / 34, H / 46), 7, 20); c.anchor = touch ? 0.57 : 0.64; // tactile : la manette prend plus de place en bas
  const b = boat; let x = (rv.cxAt(b.y + 8) + b.x) / 2;
  const y = b.y + 5 + R.clamp(b.vy * 1.3, -5, 8);
  if (G.st === 'demo' && document.body.dataset.screen === 'home') {
    if (W >= 880) x -= Math.min(560, W * 0.55) / 2 / c.s; else c.anchor = 0.16;
  }
  return { x, y, k: 3 };
}
function snapCam() {
  if (!rd || G.headless || !rv || (!boat && camMode === 'follow')) return;
  const t = camTarget(); rd.cam.x = t.x; rd.cam.y = t.y;
}
function camera(dt) {
  if (!boat && camMode === 'follow') return;
  const t = camTarget(), a = Math.min(1, dt * t.k), c = rd.cam;
  c.x += (t.x - c.x) * a; c.y += (t.y - c.y) * a;
}
function tail(p) {
  const sp = Math.hypot(U.x, U.y);
  if (sp * 0.32 >= 0.16) { p.px = p.x - U.x * 0.32; p.py = p.y - U.y * 0.32; }
  else { const ux = sp > 0.01 ? U.x / sp : 0, uy = sp > 0.01 ? U.y / sp : 1; p.px = p.x - ux * 0.16; p.py = p.y - uy * 0.16; }
}
function spawn(p) {
  const y0 = R.clamp((V.ya + V.yb) / 2, 0, rv.L); p.x = rv.cxAt(y0); p.y = y0;
  for (let i = 0; i < 8; i++) {
    const y = R.clamp(V.ya + Math.random() * (V.yb - V.ya), 0, rv.L), x = rv.cxAt(y) + (Math.random() * 2 - 1) * rv.hwAt(y) * 0.97;
    if (x < V.xa || x > V.xb) continue;
    p.x = x; p.y = y; break;
  }
  p.life = 1.2 + Math.random() * 2.2; rv.flow(p.x, p.y, U); tail(p);
}
function particles(dt) {
  const c = rd.cam, s = c.s;
  V.ya = c.y - rd.H * (1 - c.anchor) / s; V.yb = c.y + rd.H * c.anchor / s; V.xa = c.x - rd.W / 2 / s; V.xb = c.x + rd.W / 2 / s;
  const area = (V.yb - V.ya) * Math.max(0, Math.min(V.xb - V.xa, 2 * rv.hwAt(c.y)));
  const N = Math.min(520, Math.round(area * 0.085));
  while (parts.length < N) { const p = {}; spawn(p); p.life *= Math.random(); parts.push(p); }
  if (parts.length > N) parts.length = N;
  for (const p of parts) {
    p.life -= dt;
    if (p.life <= 0 || p.y < V.ya - 2 || p.y > V.yb + 2 || p.x < V.xa - 2 || p.x > V.xb + 2) { spawn(p); continue; }
    rv.flow(p.x, p.y, U); if (U.land || U.d < 0.04) { spawn(p); continue; }
    p.x += U.x * dt; p.y += U.y * dt; tail(p);
  }
}
function draw() {
  const marks = [], playing = camMode === 'follow' && (G.st === 'run' || G.st === 'swim' || G.st === 'dlg' || G.st === 'done');
  if (playing) for (let i = ti; i < Math.min(tasks.length, ti + 3); i++) {
    const k = tasks[i]; marks.push({ t: k.t, x: k.x, y: k.y, w: k.w, r: k.r, active: i === ti, limit: k.t === 'ferry' ? k.limit : 0 });
  }
  const k = tasks[ti];
  rd.draw(rv, {
    t: G.t, parts, labels: labels.concat(tlabels), marks, boat: camMode === 'rope' ? null : boat, inp,
    hold: playing && k && k.hold ? hold / k.hold : 0,
    rope: rope ? { tx: rope.tx, ty: rope.ty, sw: rope.sw, fly: rope.fly } : null,
    showSigns: camMode !== 'scout'
  });
}

// Ce que fait chaque équipier (affiché dans la tête haute, c'est pédagogique).
// L'équipier avant avironne à gauche, l'équipier arrière à droite.
G.crewText = function (i) {
  const st = R.sim.strokes(i), bow = [], stern = [];
  if (i.fwd && !i.back) { bow.push('propulsion'); stern.push('propulsion'); }
  if (i.back && !i.fwd) { bow.push('rétro'); stern.push('rétro'); }
  if (st.fb) bow.push(st.fb < 0 ? 'appel' : 'écart');
  if (st.fs) stern.push(st.fs > 0 ? 'appel' : 'écart');
  if (!bow.length && !stern.length) return '';
  if (i.back && !i.fwd && !st.fb && !st.fs) return 'Rétro';
  const kind = st.fb && st.fs ? (Math.sign(st.fb) === Math.sign(st.fs) ? ' (déplacement latéral)' : ' (pivot)') : '';
  return 'Avant : ' + (bow.join(' et ') || 'attend') + ' · Arrière : ' + (stern.join(' et ') || 'attend') + kind;
};

// ---------- Affichage tête haute (on n'écrit dans le DOM que si la valeur change) ----------
const cache = {};
function put(id, key, v, fn) { const c = id + key; if (cache[c] === v) return; cache[c] = v; const e = document.getElementById(id); if (e) fn(e, v); }
const txt = (id, v) => put(id, 't', v, (e, x) => { e.textContent = x; });
const cls = (id, v) => put(id, 'c', v, (e, x) => { e.className = x; });
const dat = (id, k, v) => put(id, k, v, (e, x) => { e.setAttribute(k, x); });
const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21 2.6 11.6A5.6 5.6 0 0 1 12 4a5.6 5.6 0 0 1 9.4 7.6z"/></svg>';
function hud() {
  if (G.view === 'rope' && rope) {
    dat('hud', 'data-mode', 'rope'); txt('hudName', 'Sac à corde');
    txt('hudTask', rope.sw ? 'Nageur ' + rope.n + ' sur 5. Crie « Corde! », puis touche l’eau un peu devant lui pour lancer.' : '');
    put('hudStroke', 'h', 'Sauvés : ' + rope.saved, (e, x) => { e.innerHTML = '<span>' + x + '</span>'; });
    return;
  }
  if (G.view !== 'run' || !boat) return;
  const b = boat, swim = b.mode === 'swim';
  dat('hud', 'data-mode', swim ? 'swim' : 'canoe'); dat('pad', 'data-mode', swim ? 'swim' : 'canoe');
  txt('hudName', def.name + (niveau === 'bas' ? ' · eau basse' : niveau === 'haut' ? ' · eau haute' : ''));
  const k = tasks[ti];
  txt('hudTask', swim ? (b.active ? SWIM_A : SWIM_B) : k ? (k.m || MSG[k.t] || '') : 'Bravo!');
  const sk = [];
  if (swim) sk.push(b.active ? 'Nage active' : 'Position de sécurité');
  else {
    const c = b.bailing ? 'Les deux équipiers écopent' : G.crewText(inp); if (c) sk.push(c);
    if (b.lean) sk.push((b.lean < 0 ? 'Gîte à gauche' : 'Gîte à droite') + (b.auto ? ' (auto)' : ''));
  }
  put('hudStroke', 'h', sk.join('|'), (e) => { e.innerHTML = sk.map(s => '<span>' + s + '</span>').join(''); });
  if (swim) put('hearts', 'h', b.hearts, (e, n) => { let h = ''; for (let i = 0; i < 3; i++) h += i < n ? HEART : HEART.replace('<svg', '<svg class="off"'); e.innerHTML = h; e.setAttribute('aria-label', n + ' cœur' + (n > 1 ? 's' : '')); });
  else {
    const w = Math.round(R.clamp(b.instab, 0, 1) * 50) * 2;
    put('balFill', 'w', w, (e, x) => { e.style.width = x + '%'; });
    cls('balFill', b.instab > 0.5 ? 'hot' : '');
    cls('balL', 'bal-m' + (b.lean < 0 ? ' on' : b.need < 0 ? ' need' : ''));
    cls('balR', 'bal-m' + (b.lean > 0 ? ' on' : b.need > 0 ? ' need' : ''));
    dat('hud', 'data-wet', wet ? '1' : '0');
    const wv = Math.round(R.clamp(b.water, 0, 1) * 50) * 2;
    put('watFill', 'w', wv, (e, x) => { e.style.width = x + '%'; });
    cls('watFill', b.water > 0.6 ? 'hot' : b.water > 0.35 ? 'warm' : '');
    put('bailBtn', 'v', G.canBail() || b.bailing, (e, x) => { e.hidden = !x; });
    cls('bailBtn', 'bail-btn' + (b.bailing ? ' on' : ''));
  }
}

G.frame = function (dt) {
  pollPad(dt);
  if (G.st !== 'demo') for (const k in inp) inp[k] = kb[k] || gp[k];
  G.update(dt);
  if (!rd || !rv) return;
  camera(dt); particles(dt); draw(); hud(); drawCross();
};

// ---------- Manette (Gamepad API, interrogée à chaque image) ----------
let gpOn = false, gpPrev = [], gpRep = 0, gpDir = 0;
const cross = { x: 0, y: 0, view: '' };
function padOn() {
  if (gpOn) return; gpOn = true; document.body.classList.add('pad');
  if (R.ui) R.ui.toast('Manette détectée.');
  G.padFocus();
}
function getPad() {
  try {
    const l = navigator.getGamepads ? navigator.getGamepads() : null;
    if (l) for (let i = 0; i < l.length; i++) if (l[i] && l[i].connected !== false) return l[i];
  } catch (e) { /* API absente ou refusée */ }
  return null;
}
function padRoot() {
  if (R.ui && R.ui.dialogOpen()) return R.$('#dlg');
  if (G.view === 'menu') return R.$('#screen');
  return null;
}
function focusables(root) {
  return R.$$('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', root).filter(e => e.getClientRects().length);
}
G.padActive = () => gpOn;
G.padFocus = function () {
  if (!gpOn || G.headless) return;
  setTimeout(() => {
    const root = padRoot(); if (!root) return;
    let el = null;
    for (const q of ['.ans:not([disabled])', '#qfb .btn', '#fb .btn', '.tile', '.card:not([disabled])', '.pick', '.btn:not(.ghost)']) {
      el = R.$(q, root); if (el && el.getClientRects().length) break; el = null;
    }
    el = el || focusables(root)[0];
    if (el) el.focus();
  }, 60);
};
function padBack(root) {
  const bs = focusables(root);
  const want = R.ui.dialogOpen() ? ['Reprendre', 'Retour', 'Quitter'] : ['Retour', 'Quitter', 'Menu'];
  for (const w of want) { const b = bs.find(e => e.textContent.trim() === w); if (b) return b; }
  return R.$('.back', root);
}
function pollPad(dt) {
  for (const k in gp) gp[k] = false;
  if (G.headless) return;
  const pad = getPad();
  if (!pad) { gpPrev = []; return; }
  const B = i => { const b = pad.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
  const ax = i => pad.axes[i] || 0;
  const cur = []; for (let i = 0; i < pad.buttons.length; i++) cur[i] = B(i);
  const prev = gpPrev, edge = i => cur[i] && !prev[i];
  gpPrev = cur;
  const lx = ax(0), ly = ax(1), DZ = 0.35;
  const up = cur[12] || ly < -DZ, dn = cur[13] || ly > DZ, lf = cur[14] || lx < -DZ, rt = cur[15] || lx > DZ;
  if (!gpOn) { if (cur.some(Boolean)) padOn(); else return; }
  document.body.classList.add('pad');
  const root = padRoot();
  if (root) { // menus et dialogues : navigation au focus
    const dir = up || lf ? -1 : dn || rt ? 1 : 0;
    if (!dir) gpDir = 0;
    else if (dir !== gpDir || (gpRep -= dt) <= 0) {
      gpRep = dir === gpDir ? 0.22 : 0.38; gpDir = dir;
      const list = focusables(root), i = list.indexOf(document.activeElement);
      const n = i < 0 ? (dir > 0 ? 0 : list.length - 1) : R.clamp(i + dir, 0, list.length - 1);
      if (list[n]) list[n].focus();
    }
    if (edge(0)) { const a = document.activeElement; if (a && a !== document.body && root.contains(a)) a.click(); else G.padFocus(); }
    else if (edge(1)) { const b = padBack(root); if (b) b.click(); }
    return;
  }
  if (edge(9)) { G.pause(); return; }
  if (G.view === 'run' && !G.paused) {
    if (boat && boat.mode === 'swim') { if (edge(0)) G.toggleSwim(); }
    else {
      // Gîte : LT et RT. Déplacement latéral : LB et RB, ou stick droit à l'horizontale.
      const rx = ax(2);
      gp.leanL = !!cur[6]; gp.leanR = !!cur[7]; gp.bail = !!cur[2];
      gp.latL = !!cur[4] || rx < -0.5; gp.latR = !!cur[5] || rx > 0.5;
    }
    gp.fwd = up; gp.back = dn; gp.left = lf; gp.right = rt;
  } else if ((G.view === 'scout' || G.view === 'rope') && !G.paused && rd) {
    if (cross.view !== G.view) { cross.view = G.view; cross.x = rd.W / 2; cross.y = rd.H * 0.4; }
    const sx = Math.abs(lx) > 0.2 ? lx : (cur[15] ? 1 : 0) - (cur[14] ? 1 : 0);
    const sy = Math.abs(ly) > 0.2 ? ly : (cur[13] ? 1 : 0) - (cur[12] ? 1 : 0);
    cross.x = R.clamp(cross.x + sx * 520 * dt, 0, rd.W); cross.y = R.clamp(cross.y + sy * 520 * dt, 0, rd.H);
    if (edge(0)) { if (G.view === 'scout') G.scoutTap(cross.x, cross.y); else G.ropeTap(cross.x, cross.y); }
    if (G.view === 'scout') {
      const ry = ax(3), pan = (Math.abs(ry) > DZ ? -ry : 0) + (cur[5] || cur[7] ? 1 : 0) - (cur[4] || cur[6] ? 1 : 0);
      if (pan) G.scoutPan(pan * 40 * dt);
      if (edge(2)) G.scoutSkip();
    }
  }
}
function drawCross() {
  const el = R.$('#cross'); if (!el) return;
  const aim = G.view === 'scout' || G.view === 'rope';
  if (!aim) cross.view = '';
  const on = gpOn && aim && !G.paused && !(R.ui && R.ui.dialogOpen());
  if (el.hidden === on) el.hidden = !on;
  if (on) el.style.transform = 'translate(' + Math.round(cross.x) + 'px,' + Math.round(cross.y) + 'px)';
}
G.cross = cross;

// ---------- Entrées ----------
function onKey(e, down) {
  const k = (e.key || '').toLowerCase();
  if (!down) { const m = KEYS[k]; if (m) kb[m] = false; return; }
  if (R.ui && R.ui.dialogOpen()) return;
  R.audio.init();
  if ((k === 'escape' || k === 'p') && !e.repeat) { if (G.canPause()) { e.preventDefault(); G.pause(); } return; }
  if (G.st === 'scout' && !G.paused) {
    if (k === 'arrowup') { G.scoutPan(12); e.preventDefault(); } else if (k === 'arrowdown') { G.scoutPan(-12); e.preventDefault(); }
    return;
  }
  if ((G.st !== 'run' && G.st !== 'swim') || G.paused) return;
  if (k === ' ' || k === 'spacebar') { e.preventDefault(); if (!e.repeat) G.toggleSwim(); return; }
  const m = KEYS[k]; if (m) { kb[m] = true; e.preventDefault(); }
}
function setTouch() {
  if (touch) return; touch = true; document.body.classList.add('touch');
  if (G.view) G.setView(G.view);
}
function bind() {
  addEventListener('keydown', e => onKey(e, true));
  addEventListener('keyup', e => onKey(e, false));
  addEventListener('blur', clearInp);
  const first = () => R.audio.init();
  addEventListener('pointerdown', () => { first(); document.body.classList.remove('pad'); }, true);
  addEventListener('gamepadconnected', padOn);
  try { if (matchMedia('(pointer: coarse)').matches) setTouch(); } catch (x) { /* rien */ }
  addEventListener('touchstart', setTouch, { once: true, passive: true });

  cv.addEventListener('pointerdown', e => {
    if (G.st === 'scout' && !G.paused) { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, y0: sc.y, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* rien */ } }
    else if (G.st === 'rope') G.ropeTap(e.clientX, e.clientY);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dy) > 8 || Math.abs(dx) > 8) drag.moved = true;
    if (drag.moved && sc) sc.y = scClamp(drag.y0 + dy / rd.cam.s);
  });
  const up = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null;
    if (!d.moved && e.type === 'pointerup') G.scoutTap(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => {
    if (G.st !== 'scout') return; e.preventDefault();
    G.scoutPan(-e.deltaY * (e.deltaMode === 1 ? 1.2 : 0.06));
  }, { passive: false });

  R.$$('#pad [data-k], #bailBtn').forEach(b => {
    const k = b.dataset.k;
    const on = e => {
      e.preventDefault(); R.audio.init();
      try { b.setPointerCapture(e.pointerId); } catch (x) { /* rien */ }
      if (k === 'swim') G.toggleSwim(); else kb[k] = true;
      b.classList.add('on');
    };
    const off = () => { if (k !== 'swim') kb[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}

G.init = function (canvas) {
  cv = canvas; rd = R.Renderer(canvas); rd.resize();
  addEventListener('resize', () => { rd.resize(); snapCam(); });
  bind();
  let last = performance.now();
  const loop = now => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    G.frame(dt);
  };
  requestAnimationFrame(loop);
};
})();
