(function () {
'use strict';
// Écrans, dialogues et démarrage. Navigation par délégation : data-go="route:arg".
const U = R.ui = {};
const G = R.game, $ = R.$, $$ = R.$$;
const A = v => Array.isArray(v) ? v : [];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sv = () => R.save.d;
const SECU = ['equip', 'sig', 'scen', 'rope', 'swim'];

const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5v11h-13V10zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON = {
  ecole: '<path d="M5 29 25 9"/><path d="M23 5c3-1.5 7 2.5 5.5 5.5L25 14l-5-5z"/><path d="M3 31l3-3"/>',
  riv: '<path d="M3 11c4-4 8 4 12 0s8 4 12 0"/><path d="M3 19c4-4 8 4 12 0s8 4 12 0"/><path d="M3 27c4-4 8 4 12 0s8 4 12 0"/>',
  secu: '<circle cx="17" cy="16" r="11"/><circle cx="17" cy="16" r="4.5"/><path d="M17 5v6.5M17 20.5V27M6 16h6.5M21.5 16H28"/>',
  lex: '<path d="M4 7h9a4 4 0 0 1 4 4v15a3 3 0 0 0-3-3H4z"/><path d="M30 7h-9a4 4 0 0 0-4 4v15a3 3 0 0 1 3-3h10z"/>'
};

// Réglage du son à trois positions (normal, doux, coupé), aussi dans le dialogue de pause.
function soundBtn() { return '<button type="button" class="btn ghost sm snd" data-act="sound">' + R.SOUND[R.audio.mode()].t + '</button>'; }
U.soundBtn = soundBtn;
function stars(n, big) {
  let h = '<span class="stars' + (big ? ' big' : '') + '" role="img" aria-label="' + n + ' étoile' + (n > 1 ? 's' : '') + ' sur 3">';
  for (let i = 0; i < 3; i++) h += '<i class="' + (i < n ? 'on' : '') + '">' + STAR + '</i>';
  return h + '</span>';
}
const allLv = () => R.LEVELS.ecole.concat(R.LEVELS.riv);
function byId(id) { return allLv().find(d => d.id === id) || (R.SWIM && R.SWIM.id === id ? R.SWIM : null); }
function listOf(d) { return R.LEVELS.ecole.includes(d) ? 'ecole' : R.LEVELS.riv.includes(d) ? 'riv' : 'secu'; }
U.backOf = d => d ? listOf(d) : 'home';
function isOpen(d) {
  if (sv().opts.unlock) return true;
  const e = R.LEVELS.ecole, r = R.LEVELS.riv, st = sv().stars;
  let i = e.indexOf(d);
  if (i === 0) return true;
  if (i > 0) return (st[e[i - 1].id] || 0) >= 1;
  i = r.indexOf(d);
  if (i === 0) return (st.e2 || 0) >= 1;
  if (i > 0) return (st[r[i - 1].id] || 0) >= 1;
  return true;
}
// Niveaux d'eau des rivières : bas et moyen ouverts avec la rivière ; haut demande 1 étoile en eau moyenne.
const NIVS = ['bas', 'moyen', 'haut'];
const NIV_NOM = { bas: 'Eau basse', moyen: 'Eau moyenne', haut: 'Eau haute' };
const NIV_TXT = {
  bas: 'Eau basse : le courant est plus lent, mais les roches sortent de partout. La difficulté, ce sont les roches : suis la veine principale et manœuvre souvent. Là où il n’y a plus assez d’eau, on cordelle ou on portage.',
  moyen: 'Eau moyenne : le niveau de référence.',
  haut: 'Eau haute : la difficulté, c’est le débit. Tout va plus vite, tu as moins de temps pour réagir, et une roche prise de travers peut cravater ton canot. En vrai, quand la rivière est en crue, on reporte la sortie.'
};
const isRiv = d => R.LEVELS.riv.includes(d);
function nivOpen(d, niv) { return isOpen(d) && (niv !== 'haut' || sv().opts.unlock || (sv().stars[d.id] || 0) >= 1); }
const nivStars = (d, niv) => sv().stars[R.starKey(d.id, niv)] || 0;
// Petite échelle de niveau d'eau : une règle graduée plantée dans l'eau.
function gauge(niv) {
  const lvl = { bas: 34, moyen: 24, haut: 13 }[niv];
  let t = ''; for (let i = 0; i < 6; i++) { const y = 8 + i * 7; t += '<path d="M22 ' + y + 'h' + (i % 2 ? 4 : 7) + '"/>'; }
  return '<svg class="gauge" viewBox="0 0 44 50" aria-hidden="true"><rect class="g-w" x="0" y="' + lvl + '" width="44" height="' + (50 - lvl) + '"/>' +
    '<path class="g-wl" d="M0 ' + lvl + 'q5.5 -2.5 11 0t11 0t11 0t11 0"/><rect class="g-r" x="18" y="4" width="5" height="44" rx="1"/><g class="g-t">' + t + '</g></svg>';
}
const mmss = t => Math.floor(t / 60) + ' min ' + String(Math.floor(t % 60)).padStart(2, '0') + ' s';

function show(html, kind) {
  const s = $('#screen');
  s.className = kind === 'home' ? 'home' : 'sub';
  document.body.dataset.screen = kind === 'home' ? 'home' : 'sub';
  s.innerHTML = html; G.setView('menu'); s.scrollTop = 0; G.padFocus();
}
function menu(html, kind) { if (G.st !== 'demo') G.demoStart(); show(html, kind); }
function panel(title, body, back, kicker) {
  return '<div class="wrap"><section class="panel"><header class="ph">' +
    (back ? '<button class="back" data-go="' + back + '">' + BACK + '<span>Retour</span></button>' : '') +
    (kicker ? '<p class="kicker">' + kicker + '</p>' : '') + '<h1>' + title + '</h1></header>' + body + '</section></div>';
}

// ---------- Accueil ----------
function home() {
  const d = sv(), e = R.LEVELS.ecole, r = R.LEVELS.riv;
  const sum = l => l.reduce((a, x) => a + (d.stars[x.id] || 0), 0);
  const all1 = l => l.every(x => (d.stars[x.id] || 0) >= 1);
  const secN = SECU.filter(k => d.done[k]).length, nLex = A(R.LEX).length;
  const tile = (go, name, desc, prog, f, col) =>
    '<button class="tile" data-go="' + go + '" style="--c:' + col + '"><svg viewBox="0 0 34 32" aria-hidden="true">' + ICON[go] + '</svg>' +
    '<span class="tile-n">' + name + '</span><span class="tile-d">' + desc + '</span>' +
    '<span class="tile-p">' + prog + '</span><span class="meter"><i style="width:' + Math.round(f * 100) + '%"></i></span></button>';
  const badges = [
    ['Apprenti pagayeur', 'Toutes les leçons', all1(e), '#ffb629'],
    ['Lecteur de rivière', 'Toutes les rivières', all1(r), '#5fc6d2'],
    ['Gardien de la sécurité', 'Les 5 activités de sécurité', secN === 5, '#e8624d'],
    ['Savant de la rivière', 'Le quiz réussi', !!d.done.quiz, '#8fd18a']
  ];
  // Pagayeur toutes eaux : au moins 1 étoile sur chaque rivière aux trois niveaux. Pas requis pour le brevet.
  const brevet = badges.every(b => b[2]);
  badges.push(['Pagayeur toutes eaux', 'Chaque rivière aux trois niveaux d’eau', r.every(x => NIVS.every(n => (d.stars[R.starKey(x.id, n)] || 0) >= 1)), '#4aa3df']);
  badges.push(['Brevet Riv101', 'Tout le parcours', brevet, '#eefaf7']);
  const bh = badges.map(b => '<li class="badge' + (b[2] ? ' on' : '') + '" style="--c:' + b[3] + '"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l15 5v11c0 9-6.5 15-15 18C11.5 34 5 28 5 19V8z"/><path class="w" d="M11 21c3-3 6 3 9 0s6 3 9 0"/></svg><span><b>' + b[0] + '</b><small>' + (b[2] ? 'Obtenu' : b[1]) + '</small></span></li>').join('');
  menu('<div class="home-col">' +
    '<p class="kicker">École d’eau vive</p><h1 class="logo">Riv<span>101</span></h1>' +
    '<p class="lead">Apprends les coups d’aviron, lis les rapides comme une carte et garde la tête froide quand l’eau devient blanche.</p>' +
    '<div class="tiles">' +
    tile('ecole', 'École de canot', 'Avancer, tourner, le bac, les arrêts et la gîte.', sum(e) + ' / ' + e.length * 3 + ' étoiles', sum(e) / (e.length * 3), '#ffb629') +
    tile('riv', 'Rivières', 'Sept descentes, du ruisseau à la grande rivière.', sum(r) + ' / ' + r.length * 3 + ' étoiles', sum(r) / (r.length * 3), '#5fc6d2') +
    tile('secu', 'Sécurité', 'Équipement, signaux, sac à corde et nage.', secN + ' / 5 activités', secN / 5, '#e8624d') +
    tile('lex', 'Lexique et quiz', 'Les mots de la rivière, en images.', d.done.quiz ? 'Quiz réussi' : nLex + ' mots, quiz à faire', d.done.quiz ? 1 : 0, '#8fd18a') +
    '</div><section class="badges"><h2>Écussons</h2><ul>' + bh + '</ul></section>' +
    '<div class="opts">' + soundBtn() +
    '<label><input type="checkbox" id="optUnlock"' + (d.opts.unlock ? ' checked' : '') + '> Tout débloquer (parents)</label></div></div>', 'home');
}

// ---------- Listes de niveaux ----------
function list(key) {
  const L = R.LEVELS[key], d = sv();
  const cards = L.map(x => {
    const open = isOpen(x);
    const res = !open ? '<span class="lock">' + LOCK + 'Verrouillé</span>'
      : key !== 'riv' ? stars(d.stars[x.id] || 0)
      : '<span class="nivs">' + NIVS.map(n => '<span class="niv-r"><span class="niv-n">' + { bas: 'Bas', moyen: 'Moyen', haut: 'Haut' }[n] + '</span>' +
        (nivOpen(x, n) ? stars(nivStars(x, n)) : '<span class="lock sm">' + LOCK + '</span>') + '</span>').join('') + '</span>';
    return '<button class="card' + (open ? '' : ' locked') + '"' + (open ? ' data-go="brief:' + x.id + '"' : ' disabled') + '>' +
      '<span class="cls">' + esc(x.cls) + '</span><span class="cn">' + esc(x.name) + '</span>' + res + '</button>';
  }).join('');
  const note = key === 'riv' && !isOpen(L[0]) ? '<p class="note">Réussis la leçon 2 de l’École de canot pour ouvrir la première rivière.</p>' : '';
  menu(panel(key === 'ecole' ? 'École de canot' : 'Rivières',
    '<p class="lead">' + (key === 'ecole' ? 'Chaque leçon ouvre la suivante. Une étoile suffit pour avancer.' : 'Repère, choisis ta ligne, puis descends. Chaque rivière réussie ouvre la suivante.') + '</p>' +
    note + '<div class="cards">' + cards + '</div>', 'home'), 'sub');
}

// ---------- Breffage ----------
function keysHtml(x) {
  if (x.swimOnly) return '<h2>Commandes</h2><ul class="keys"><li><kbd>Espace</kbd> Position de sécurité ou nage active</li><li><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> Nager</li><li><kbd>Échap</kbd> Pause</li></ul><p class="small mute">Manette : stick gauche ou croix pour nager, A pour la posture, Start pour la pause.</p>';
  return '<h2>Commandes</h2><ul class="keys"><li><kbd>↑</kbd> Propulsion</li><li><kbd>↓</kbd> Rétro</li><li><kbd>←</kbd> <kbd>→</kbd> Pivot à gauche, à droite</li><li><kbd>Q</kbd> <kbd>E</kbd> Déplacement latéral à gauche, à droite</li>' +
    (x.assist ? '<li class="mute">Ici, la gîte se fait toute seule.</li>' : '<li><kbd>A</kbd> <kbd>D</kbd> Gîte à gauche, à droite</li>') +
    (isRiv(x) ? '<li><kbd>B</kbd> Écoper (à l’arrêt, en eau calme)</li>' : '') +
    '<li><kbd>Échap</kbd> Pause</li></ul>' +
    '<p class="small mute">Pivot : les deux équipiers font un appel (ou un écart). Déplacement latéral : l’un fait un appel, l’autre un écart, et le canot glisse de côté sans tourner.</p>' +
    '<p class="small mute">Manette : stick gauche ou croix pour pagayer, LB et RB (ou stick droit) pour le déplacement latéral, LT et RT pour gîter, ' + (isRiv(x) ? 'X pour écoper, ' : '') + 'Start pour la pause.' + (x.scout ? ' Au repérage : réticule au stick gauche, A pour toucher, stick droit pour longer la rivière, X pour passer.' : '') + '</p>' +
    (x.scout ? '<p class="small mute">Au repérage : glisse pour longer la rivière, puis touche ce qu’on te demande.</p>' : '') +
    '<p class="small mute">Sur tablette, utilise les boutons à l’écran' + (isRiv(x) ? ' ; le bouton Écoper apparaît quand il y a de l’eau dans le canot' : '') + '. L’aval est en haut de l’écran.</p>';
}
let nivSel = 'moyen';
function nivPicker(x) {
  if (!isRiv(x)) return '';
  if (!nivOpen(x, nivSel)) nivSel = 'moyen';
  return '<h2>Niveau d’eau</h2><div class="nivpick" role="radiogroup" aria-label="Niveau d’eau">' + NIVS.map(n => {
    const ok = nivOpen(x, n);
    return '<button type="button" class="nivb" role="radio" aria-checked="' + (n === nivSel) + '" data-niv="' + n + '"' + (ok ? '' : ' disabled') + '>' + gauge(n) +
      '<span class="nivb-n">' + NIV_NOM[n] + '</span><span class="nivb-c">' + esc(R.clsFor(x, n)) + '</span>' +
      (ok ? stars(nivStars(x, n)) : '<span class="lock sm">' + LOCK + '1 étoile en eau moyenne</span>') + '</button>';
  }).join('') + '</div><p class="nivtxt">' + NIV_TXT[nivSel] + '</p>';
}
function brief(x, niv) {
  if (!x) return home();
  if (!isOpen(x)) return list(listOf(x));
  if (niv) nivSel = niv;
  const lex = A(R.LEX), terms = A(x.terms).map(id => lex.find(t => t.id === id)).filter(Boolean);
  const words = terms.length ? '<h2>Mots à retenir</h2><dl class="words">' + terms.map(t => '<div><dt>' + esc(t.t) + '</dt><dd>' + esc(t.d) + '</dd></div>').join('') + '</dl>' : '';
  const nv = isRiv(x) ? nivSel : 'moyen', picker = nivPicker(x);
  menu(panel(esc(x.name), A(x.intro).map(p => '<p class="intro">' + esc(p) + '</p>').join('') + picker + words + keysHtml(x) +
    '<div class="actions"><button class="btn" data-go="play:' + x.id + (isRiv(x) ? '@' + nivSel : '') + '">' + (x.scout ? 'Repérage' : 'Départ') + '</button>' +
    '<button class="btn ghost" data-go="' + listOf(x) + '">Retour</button></div>', listOf(x), esc(R.clsFor(x, nv)) + (nv !== 'moyen' ? ' · ' + NIV_NOM[nv].toLowerCase() : '')), 'sub');
}
function play(x, niv) {
  if (!x) return home();
  if (niv && !nivOpen(x, niv)) niv = 'moyen';
  R.audio.init(); G.load(x, { niveau: niv });
}

// ---------- Résultat ----------
function tip(s, x) {
  if (x.swimOnly) return s.lethal ? 'Reste sur le dos, pieds vers l’aval, et éloigne-toi tôt des arbres tombés.' : 'Près des roches, reste en position de sécurité. La nage active, c’est seulement en eau libre.';
  if (s.lethal) return 'Les pires dangers se voient au repérage : passoires, rouleaux, seuils. Repère-les et éloigne-toi tôt.';
  if (s.caps) return 'Pour rester sur l’eau : gîte vers l’aval du courant où tu entres, donc vers l’intérieur de ton virage.';
  if (s.missed) return 'Prépare chaque manœuvre plus tôt : un bon angle vaut mieux que de la vitesse.';
  if (s.grounds) return 'Suis l’eau foncée : c’est la veine principale. L’eau pâle cache des hauts-fonds où le canot racle.';
  if (s.wmax > 0.5) return 'Dans les vagues, ralentis avec un rétro et garde le canot droit. Écope à l’arrêt, en eau calme.';
  if (s.hits > 1) return 'Regarde loin devant et choisis ta ligne avant d’arriver aux roches.';
  return 'Descente parfaite. Tu peux passer à la suite!';
}
U.result = function (x, n, s, niv) {
  niv = niv || 'moyen';
  const key = listOf(x), L = R.LEVELS[key], i = L ? L.indexOf(x) : -1, nx = L && i >= 0 ? L[i + 1] : null;
  const rows = x.swimOnly
    ? [['Temps', mmss(s.time)], ['Cœurs restants', n], ['Recommencements', s.lethal]]
    : [['Temps', mmss(s.time)], ['Roches touchées', s.hits], ['Chavirages', s.caps], ['Objectifs manqués', s.missed]]
      .concat(isRiv(x) ? [['Échouages', s.grounds || 0], ['Eau embarquée max', Math.round((s.wmax || 0) * 100) + ' %']] : []);
  show(panel(n >= 3 ? 'Superbe!' : n === 2 ? 'Bien joué!' : 'Arrivée!',
    '<div class="res-stars">' + stars(n, true) + '</div>' +
    '<dl class="stats">' + rows.map(r => '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl>' +
    (x.learned ? '<p class="learned"><b>Tu as appris :</b> ' + esc(x.learned) + '</p>' : '') +
    '<p class="tip">' + tip(s, x) + '</p><div class="actions">' +
    (nx ? '<button class="btn" data-go="brief:' + nx.id + '">Suivant</button>' : '') +
    '<button class="btn' + (nx ? ' ghost' : '') + '" data-go="play:' + x.id + (isRiv(x) ? '@' + niv : '') + '">Rejouer</button>' +
    '<button class="btn ghost" data-go="' + key + '">Menu</button></div>', null, esc(x.name) + (isRiv(x) && niv !== 'moyen' ? ' · ' + NIV_NOM[niv].toLowerCase() : '')), 'sub');
};

// ---------- Sécurité ----------
function secu() {
  const d = sv().done;
  const acts = [
    ['equip', 'Prépare ton équipement', 'Choisis ce qu’on apporte pour une sortie en eau vive.'],
    ['sig', 'Les signaux', 'Parle avec ton aviron, même dans le bruit du rapide.'],
    ['scen', 'Que fais-tu?', 'Huit situations : choisis la bonne réaction.'],
    ['rope', 'Lance le sac à corde', 'Sauve cinq nageurs depuis la rive.'],
    ['swim', 'Nage en eau vive', 'La position de sécurité et la nage vers l’eau calme.']
  ];
  menu(panel('Sécurité', '<p class="lead">En rivière, la sécurité passe avant tout. Fais les cinq activités pour obtenir l’écusson de gardien.</p><div class="cards">' +
    acts.map(a => '<button class="card" data-go="' + (a[0] === 'swim' ? 'brief:swim' : a[0] === 'rope' ? 'ropeBrief' : a[0]) + '">' +
      '<span class="chip' + (d[a[0]] ? ' done' : '') + '">' + (d[a[0]] ? 'Fait' : 'À faire') + '</span><span class="cn">' + a[1] + '</span><span class="cd">' + a[2] + '</span></button>').join('') +
    '</div>', 'home'), 'sub');
}
function ropeBrief() {
  menu(panel('Lance le sac à corde', '<p class="intro">Un ami est tombé à l’eau. Tu es sur la rive, en aval de lui, avec un sac à corde.</p>' +
    '<ol class="steps"><li><b>Crie « Corde! »</b> pour qu’il te regarde.</li><li><b>Lance pour que la corde tombe sur lui</b>, un peu devant, là où il sera.</li><li><b>Tiens-toi solidement</b>, assis ou derrière un appui. Ne t’attache jamais à la corde.</li></ol>' +
    '<p class="small mute">Touche ou clique sur l’eau pour lancer. Avec la manette : réticule au stick gauche, A pour lancer. Un seul lancer par nageur. Il en faut 3 sur 5.</p>' +
    '<div class="actions"><button class="btn" data-go="ropego">Commencer</button><button class="btn ghost" data-go="secu">Retour</button></div>', 'secu', 'Sécurité'), 'sub');
}

// Équipement
let eq = null;
function equip() {
  const items = R.shuffle(A(R.EQUIP));
  eq = { items };
  if (!items.length) return menu(panel('Prépare ton équipement', '<p>Le contenu arrive bientôt.</p>', 'secu'), 'sub');
  menu(panel('Prépare ton équipement', '<p class="lead">Touche ce que tu mets dans ton sac ou sur toi pour la sortie. Laisse le reste à la maison.</p>' +
    '<div class="picks">' + items.map((it, i) => '<button class="pick" aria-pressed="false" data-pick="' + i + '">' + esc(it.n) + '</button>').join('') + '</div>' +
    '<div class="actions"><button class="btn" data-act="eqcheck">Vérifier</button><button class="btn ghost" data-go="secu">Retour</button></div>' +
    '<div id="fb" class="fb" aria-live="polite"></div>', 'secu', 'Sécurité'), 'sub');
}
function eqCheck() {
  const errs = [];
  $$('.pick').forEach(b => {
    const it = eq.items[+b.dataset.pick], on = b.getAttribute('aria-pressed') === 'true';
    if (on !== !!it.ok) errs.push((it.ok ? '<b>Il te manque : ' : '<b>À laisser : ') + esc(it.n) + '.</b> ' + esc(it.why));
  });
  const fb = $('#fb');
  if (!errs.length) {
    R.save.mark('equip'); R.audio.sfx('win');
    fb.innerHTML = '<p class="verdict ok">Parfait! Ton sac est prêt.</p><p>Avant chaque sortie, on vérifie : veste de flottaison bien attachée, casque, sifflet et un adulte formé.</p><div class="actions"><button class="btn" data-go="secu">Retour à la sécurité</button></div>';
  } else {
    R.audio.sfx('no');
    fb.innerHTML = '<p class="verdict ko">' + errs.length + ' erreur' + (errs.length > 1 ? 's' : '') + '. Corrige et vérifie encore.</p><ul class="errs">' + errs.map(e => '<li>' + e + '</li>').join('') + '</ul>';
  }
  fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Figurines des signaux
function sigFig(sig) {
  const P = 'stroke="#6b4a22" stroke-width="4" stroke-linecap="round"', BL = 'fill="#f4e3b5" stroke="#6b4a22" stroke-width="2"';
  const ARM = 'stroke="#e9c9a0" stroke-width="5" stroke-linecap="round" fill="none"';
  const arms = {
    stop: '<path d="M52 64 40 26M68 64 80 26" ' + ARM + '/><line x1="16" y1="24" x2="104" y2="24" ' + P + '/><ellipse cx="12" cy="24" rx="9" ry="5" ' + BL + '/><ellipse cx="108" cy="24" rx="9" ry="5" ' + BL + '/>',
    go: '<path d="M52 64 58 30M68 64 62 30" ' + ARM + '/><line x1="60" y1="14" x2="60" y2="40" ' + P + '/><ellipse cx="60" cy="9" rx="5" ry="10" ' + BL + '/>',
    dir: '<path d="M52 64 44 92" ' + ARM + '/><path d="M68 64 90 40" ' + ARM + '/><line x1="78" y1="52" x2="104" y2="26" ' + P + '/><ellipse cx="108" cy="22" rx="5" ry="10" transform="rotate(45 108 22)" ' + BL + '/>',
    help: '<path d="M52 64 34 30M68 64 84 22" ' + ARM + '/><line x1="24" y1="30" x2="96" y2="16" ' + P + '/><ellipse cx="102" cy="15" rx="9" ry="5" transform="rotate(-11 102 15)" ' + BL + '/>' +
      '<path d="M14 18a14 14 0 0 1 0 18M104 2a14 14 0 0 1 12 14" fill="none" stroke="#eefaf7" stroke-width="2" opacity=".7"/>' +
      '<g stroke="#ffb629" stroke-width="3" stroke-linecap="round"><path d="M74 44l10-4M75 49h11M74 54l10 4"/></g>',
    ok: '<path d="M52 64 44 92" ' + ARM + '/><path d="M68 64 86 52 68 36" ' + ARM + '/>'
  };
  return '<svg class="fig" viewBox="0 0 120 150" role="img" aria-label="Figurine qui fait un signal">' +
    '<path d="M55 90 50 138M65 90 70 138" stroke="#2b3a55" stroke-width="7" stroke-linecap="round"/>' +
    '<rect x="48" y="58" width="24" height="36" rx="5" fill="#ffb629"/>' +
    '<circle cx="60" cy="46" r="10" fill="#e9c9a0"/><path d="M49 46a11 11 0 0 1 22 0z" fill="#d4432f"/>' +
    (arms[sig] || '') + '</svg>';
}

// ---------- Moteur de questions (quiz, signaux, mises en situation) ----------
let Q = null;
function ask(cfg) {
  const items = A(cfg.items);
  if (!items.length) return menu(panel(cfg.title, '<p>Le contenu arrive bientôt.</p>', cfg.back), 'sub');
  Q = Object.assign({ i: 0, ok: 0, answered: false }, cfg, { items, pass: Math.min(cfg.pass, items.length) });
  qRender();
}
function qRender() {
  const it = Q.items[Q.i]; Q.answered = false;
  const order = R.shuffle(it.a.map((_, j) => j));
  const body = '<p class="prog">Question ' + (Q.i + 1) + ' sur ' + Q.items.length + '</p><div class="meter"><i style="width:' + Math.round(Q.i / Q.items.length * 100) + '%"></i></div>' +
    (Q.fig ? '<div class="figbox">' + Q.fig(it) + '</div>' : '') + '<p class="q">' + esc(Q.qtext || it.q) + '</p>' +
    '<div class="answers">' + order.map(j => '<button class="ans" data-ans="' + j + '">' + esc(it.a[j]) + '</button>').join('') + '</div><div id="qfb" class="fb" aria-live="polite"></div>';
  menu(panel(Q.title, body, Q.back, Q.kicker), 'sub');
}
function qAnswer(j) {
  if (!Q || Q.answered) return;
  Q.answered = true;
  const it = Q.items[Q.i], good = j === 0, last = Q.i === Q.items.length - 1;
  if (good) Q.ok++;
  $$('.ans').forEach(b => { const k = +b.dataset.ans; b.disabled = true; if (k === 0) b.classList.add('right'); else if (k === j) b.classList.add('wrong'); });
  R.audio.sfx(good ? 'ding' : 'no');
  $('#qfb').innerHTML = '<p class="verdict ' + (good ? 'ok' : 'ko') + '">' + (good ? 'Bonne réponse!' : 'Pas tout à fait.') + '</p>' +
    (it.why ? '<p>' + esc(it.why) + '</p>' : '') + '<button class="btn" data-act="qnext">' + (last ? 'Voir le résultat' : 'Suivante') + '</button>';
  const nb = $('#qfb .btn'); if (nb) { nb.focus({ preventScroll: true }); nb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
function qNext() {
  Q.i++;
  if (Q.i < Q.items.length) return qRender();
  const ok = Q.ok >= Q.pass;
  if (ok && Q.mark) R.save.mark(Q.mark);
  R.audio.sfx(ok ? 'win' : 'no');
  menu(panel(Q.title, '<p class="score"><b>' + Q.ok + '</b> sur ' + Q.items.length + '</p><p class="verdict ' + (ok ? 'ok' : 'ko') + '">' +
    (ok ? 'Réussi! ' + Q.win : 'Il en faut ' + Q.pass + ' pour réussir. Relis les explications et réessaie.') + '</p>' +
    '<div class="actions"><button class="btn" data-go="' + Q.route + '">Rejouer</button><button class="btn ghost" data-go="' + Q.back + '">Retour</button></div>', Q.back, Q.kicker), 'sub');
}
const quiz = () => ask({ title: 'Quiz de la rivière', kicker: 'Lexique', items: R.shuffle(A(R.QUIZ)).slice(0, 10), pass: 8, mark: 'quiz', route: 'quiz', back: 'lex', win: 'Tu connais les mots de la rivière.' });
const sig = () => ask({ title: 'Les signaux', kicker: 'Sécurité', items: R.shuffle(A(R.SIG)).slice(0, 5), pass: 4, mark: 'sig', route: 'sig', back: 'secu', qtext: 'Que veut dire ce signal?', fig: it => sigFig(it.sig), win: 'Tu sais parler avec ta pagaie.' });
const scen = () => ask({ title: 'Que fais-tu?', kicker: 'Sécurité', items: R.shuffle(A(R.SCEN)).slice(0, 8), pass: 6, mark: 'scen', route: 'scen', back: 'secu', win: 'Tu as les bons réflexes.' });

// ---------- Lexique ----------
function lex(cat) {
  const cats = A(R.CATS), L = A(R.LEX);
  if (!cats.some(c => c[0] === cat)) cat = cats[0] && cats[0][0];
  const tabs = '<div class="tabs" role="tablist">' + cats.map(c => '<button role="tab" aria-selected="' + (c[0] === cat) + '" data-go="lex:' + c[0] + '">' + esc(c[1]) + '</button>').join('') + '</div>';
  const items = L.filter(t => t.c === cat);
  const cards = items.length ? items.map(t => '<article class="term">' + (t.sc ? '<canvas class="scene" data-sc="' + L.indexOf(t) + '" aria-hidden="true"></canvas>' : '') +
    '<h3>' + esc(t.t) + '</h3><p>' + esc(t.d) + '</p></article>').join('') : '<p>Le contenu arrive bientôt.</p>';
  menu(panel('Lexique', '<p class="lead">Les mots des pagayeurs. Dans les images, l’aval est en haut et les flèches suivent le courant.</p>' + tabs +
    '<div class="terms">' + cards + '</div><div class="actions"><button class="btn" data-go="quiz">Faire le quiz</button><button class="btn ghost" data-go="home">Menu</button></div>', 'home'), 'sub');
  requestAnimationFrame(() => $$('canvas.scene').forEach(c => {
    try { R.still(c, L[+c.dataset.sc].sc); } catch (e) { c.remove(); }
  }));
}

// ---------- Toast, dialogue, tête haute, barre de repérage ----------
let tt = 0, dlgEsc = null;
U.toast = function (m) {
  const t = $('#toast'); t.textContent = m; t.hidden = false;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => { t.classList.remove('show'); t.hidden = true; }, 3200);
};
U.dialog = function (title, html, btns, o) {
  $('#dlgT').textContent = title; $('#dlgB').innerHTML = html || '';
  const a = $('#dlgA'); a.innerHTML = '';
  btns.forEach((b, i) => {
    const e = document.createElement('button'); e.type = 'button'; e.className = 'btn' + (i ? ' ghost' : ''); e.textContent = b[0];
    e.addEventListener('click', () => { U.closeDialog(); R.audio.init(); if (b[1]) b[1](); });
    a.appendChild(e);
  });
  dlgEsc = o && o.esc != null ? btns[o.esc][1] : null;
  $('#dlg').hidden = false;
  setTimeout(() => { if (a.firstChild) a.firstChild.focus(); }, 30);
};
U.closeDialog = function () { $('#dlg').hidden = true; dlgEsc = null; };
U.dialogOpen = () => !$('#dlg').hidden;
U.hud = function (on) { $('#hud').hidden = !on; };
U.scoutbar = function (info) {
  const b = $('#scoutbar');
  if (!info) { b.hidden = true; return; }
  b.hidden = false; $('#scoutQ').textContent = info.q; $('#scoutN').textContent = (info.foot ? 'Repérage à pied : ' : 'Repérage : ') + (info.i + 1) + ' sur ' + info.n;
};

// ---------- Navigation ----------
U.go = function (r, a) {
  U.closeDialog(); G.paused = false;
  switch (r) {
    case 'home': return home();
    case 'ecole': case 'riv': return list(r);
    case 'brief': { const p = String(a || '').split('@'); return brief(byId(p[0]), p[1]); }
    case 'play': { const p = String(a || '').split('@'); return play(byId(p[0]), p[1]); }
    case 'secu': return secu();
    case 'equip': return equip();
    case 'sig': return sig();
    case 'scen': return scen();
    case 'quiz': return quiz();
    case 'lex': return lex(a);
    case 'ropeBrief': return ropeBrief();
    case 'ropego': R.audio.init(); return G.ropeStart();
    default: return home();
  }
};
const ACT = {
  eqcheck: eqCheck, qnext: qNext, pause: () => G.pause(),
  sound: () => { R.audio.init(); const m = R.audio.nextMode(); $$('[data-act="sound"]').forEach(b => { b.textContent = R.SOUND[m].t; }); },
  sAval: () => G.scoutPan(20), sAmont: () => G.scoutPan(-20), sSkip: () => G.scoutSkip()
};
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g && !g.disabled) { R.audio.init(); const s = g.dataset.go, i = s.indexOf(':'); U.go(i < 0 ? s : s.slice(0, i), i < 0 ? undefined : s.slice(i + 1)); return; }
  const an = e.target.closest('[data-ans]'); if (an) { qAnswer(+an.dataset.ans); return; }
  const nb = e.target.closest('[data-niv]');
  if (nb && !nb.disabled) { nivSel = nb.dataset.niv; const id = ($('[data-go^="play:"]') || {}).dataset; brief(byId(id ? id.go.slice(5).split('@')[0] : ''), nivSel); const f = $('[data-niv="' + nivSel + '"]'); if (f) f.focus(); return; }
  const p = e.target.closest('[data-pick]'); if (p) { p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); return; }
  const ac = e.target.closest('[data-act]'); if (ac && ACT[ac.dataset.act]) ACT[ac.dataset.act]();
});
document.addEventListener('change', e => {
  if (e.target.id === 'optUnlock') { sv().opts.unlock = e.target.checked; R.save.store(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && U.dialogOpen() && dlgEsc) { const f = dlgEsc; e.preventDefault(); e.stopPropagation(); U.closeDialog(); f(); }
});

// ---------- Démarrage ----------
R.save.load();
G.init($('#cv'));
G.demoStart();
U.go('home');
})();
