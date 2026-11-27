(function () {
'use strict';
// Niveaux. path = [y, centre, demi-largeur, vitesse]. Les décalages « o » partent du centre
// de la rivière (négatif = rive gauche). start = [o, y, cap en degrés] (180 = face à l'amont).
const ecole = [
  {
    id: 'e1', name: 'Premiers coups de pagaie', cls: 'Leçon 1', len: 190, assist: true,
    path: [[0, 0, 24, 0.2], [190, 0, 24, 0.2]], start: [0, 10, 0],
    rocks: [[-15, 62, 2.4], [14, 122, 2.8]],
    tasks: [
      { t: 'gate', o: -7, y: 45, w: 10, m: 'Propulsion (↑) pour avancer. Appel (←) et écart (→) pour tourner. Passe entre les bouées.' },
      { t: 'gate', o: 8, y: 80, w: 10 }, { t: 'gate', o: -5, y: 115, w: 10 },
      { t: 'zone', o: 6, y: 150, r: 5, hold: 1.5, m: 'Arrête-toi dans le cercle. Dénage (↓) pour freiner.' },
      { t: 'finish', y: 178 }
    ],
    intro: ['Bienvenue à bord! Ici, l’eau est calme : parfait pour apprendre.', 'Tu es à l’avant et tu pagaies à gauche. L’appel tire le canot vers ta pagaie. L’écart le pousse de l’autre côté.'],
    terms: ['propulsion', 'denage', 'appel', 'ecart'], learned: 'avancer, freiner et tourner.'
  },
  {
    id: 'e2', name: 'Suivre le courant', cls: 'Leçon 2', len: 300, assist: true,
    path: [[0, 0, 20, 1.2], [90, 6, 19, 1.4], [180, -6, 17, 1.6], [300, 0, 20, 1.2]], start: [0, 10, 0],
    rocks: [[-6, 95, 2], [5, 100, 2], [10, 142, 1.8], [-9, 185, 2.2], [1, 190, 2.2]],
    vs: [[-0.5, 107], [-4, 197]],
    tasks: [
      { t: 'gate', o: 0, y: 45, w: 11, m: 'Le courant te porte vers l’aval. Regarde loin devant.' },
      { t: 'gate', o: -0.5, y: 104, w: 7, m: 'Vise le V aval : la langue d’eau lisse entre les deux roches.' },
      { t: 'gate', o: -4, y: 195, w: 7, m: 'Encore un V aval. La pointe du V te montre le passage.' },
      { t: 'finish', y: 285 }
    ],
    scout: ['vamont', 'vaval'],
    intro: ['L’eau vient de l’amont et descend vers l’aval. On nomme toujours les rives en regardant vers l’aval.', 'Entre deux roches, l’eau lisse dessine un V qui pointe vers l’aval : c’est souvent le bon passage.'],
    terms: ['amont', 'rives', 'vaval', 'vamont'], learned: 'reconnaître le V aval et le V amont.'
  },
  {
    id: 'e3', name: 'Le bac', cls: 'Leçon 3', len: 160, assist: true,
    path: [[0, 0, 20, 1.5], [160, 0, 20, 1.5]], start: [-15, 31, 180],
    rocks: [['L', 22, 5], ['R', 26, 5]],
    tasks: [
      { t: 'ferry', o: 'R', inset: 5, y: 35, r: 4.5, limit: 72, retry: true, m: 'Traverse en bac : pointe vers l’amont, un peu vers la rive droite, et pagaie.' },
      { t: 'ferry', o: 'L', inset: 5, y: 31, r: 4.5, limit: 72, retry: true, m: 'Reviens en bac vers la rive gauche. Ne dépasse pas la ligne rouge.' },
      { t: 'finish', y: 140, m: 'Bravo! Sors du contre-courant et descends jusqu’à l’arrivée.' }
    ],
    intro: ['Le bac sert à traverser la rivière sans se faire emporter.', 'Le canot regarde vers l’amont, avec un petit angle vers la rive à atteindre. Tu pagaies vers l’avant, et le courant te pousse de côté.'],
    terms: ['bac', 'contre', 'amont'], learned: 'traverser le courant en bac.'
  },
  {
    id: 'e4', name: 'Arrêt et reprise', cls: 'Leçon 4', len: 300, assist: true,
    path: [[0, 0, 20, 1.7], [300, 0, 20, 1.7]], start: [0, 10, 0],
    rocks: [[-5, 70, 3], [6, 140, 3], [-4, 210, 3]],
    tasks: [
      { t: 'eddy', o: -5, y: 77, r: 4, retry: true, m: 'Arrêt contre-courant : passe près de la roche, puis tourne derrière elle.' },
      { t: 'eddy', o: 6, y: 147, r: 4, retry: true, m: 'Reprise de courant, puis nouvel arrêt derrière la roche suivante.' },
      { t: 'eddy', o: -4, y: 217, r: 4, retry: true },
      { t: 'finish', y: 280 }
    ],
    scout: ['contre'],
    intro: ['Derrière chaque roche, l’eau est calme ou remonte doucement : c’est un contre-courant.', 'On s’y arrête pour se reposer et regarder la suite. Pour repartir, on fait une reprise de courant.'],
    terms: ['contre', 'arret', 'reprise', 'cisaillement'], learned: 'l’arrêt contre-courant et la reprise de courant.'
  },
  {
    id: 'e5', name: 'La gîte', cls: 'Leçon 5', len: 300, assist: false, tippy: 1,
    path: [[0, 0, 18, 2.2], [300, 0, 18, 2.2]], start: [0, 10, 0],
    rocks: [[-5, 70, 3], ['R', 135, 5], [-3, 205, 3.2]],
    tasks: [
      { t: 'eddy', o: -5, y: 77, r: 4, retry: true, m: 'Gîte (A ou D) quand le repère G ou D s’allume, en entrant dans le contre-courant.' },
      { t: 'eddy', o: 'R', inset: 5, y: 146, r: 4.5, retry: true, m: 'En sortant du contre-courant, gîte vers l’aval.' },
      { t: 'eddy', o: -3, y: 212.5, r: 4.2, retry: true },
      { t: 'finish', y: 280 }
    ],
    intro: ['Quand tu changes de courant, l’eau pousse sur le côté du canot et peut le faire chavirer.', 'La règle : gîte vers l’aval du courant où tu entres, donc vers l’intérieur de ton virage. Touches A (gauche) et D (droite).', 'La jauge au bas de l’écran montre l’équilibre du canot. Si tu chavires, tu apprendras à nager en rapide.'],
    terms: ['gite', 'cisaillement', 'appui'], learned: 'gîter pour garder l’équilibre.'
  }
];

const riv = [
  {
    id: 'r1', name: 'Rivière aux Castors', cls: 'R1', len: 420, assist: true,
    path: [[0, 0, 22, 1.3], [100, 8, 20, 1.6], [200, -4, 18, 1.9], [300, 6, 20, 1.6], [420, 0, 22, 1.3]], start: [0, 10, 0],
    rocks: [[-8, 70, 2], [4, 76, 2.2], [9, 130, 2.5], [-7, 175, 3], [0, 235, 2.2], [10, 240, 2], [-10, 250, 2.5], ['R', 300, 5], [-4, 335, 2], [7, 338, 2.2]],
    vs: [[-2, 84], [5, 249], [1.5, 347]],
    tasks: [
      { t: 'gate', o: -2, y: 82, w: 7, m: 'Premier V aval : passe dans la langue d’eau lisse.' },
      { t: 'gate', o: -1, y: 131, w: 10, m: 'Roche à droite : passe à sa gauche.' },
      { t: 'eddy', o: -7, y: 182, r: 4, m: 'Arrête-toi dans le contre-courant pour regarder la suite.' },
      { t: 'gate', o: 5, y: 247, w: 7 }, { t: 'gate', o: 1.5, y: 345, w: 7 },
      { t: 'finish', y: 405 }
    ],
    scout: ['vaval', 'vamont', 'contre'],
    intro: ['Une rivière de classe R1 : petites vagues et passages faciles à voir.', 'Commence par le repérage : trouve les V aval, les roches et un contre-courant pour t’arrêter.'],
    terms: ['classes', 'vaval', 'contre', 'reperage'], learned: 'descendre un rapide R1 en choisissant ta ligne.'
  },
  {
    id: 'r2', name: 'La Sinueuse', cls: 'R2', len: 520, assist: true,
    path: [[0, 0, 20, 1.5], [90, 0, 20, 1.6], [190, 26, 19, 1.9], [290, -10, 19, 1.9], [390, 22, 19, 2.0], [520, 10, 22, 1.4]], start: [0, 10, 0],
    rocks: [[3, 60, 2], [-2, 160, 2.5], [6, 262, 3], [-6, 350, 2.2], [4, 430, 2.5], [-5, 470, 2]],
    strainers: [['L', 118, 9], ['R', 228, 9], ['L', 322, 8]],
    tasks: [
      { t: 'gate', o: 7, y: 120, w: 10, m: 'Virage : le courant pousse vers l’extérieur, où attend une passoire. Reste à l’intérieur.' },
      { t: 'gate', o: -7, y: 230, w: 10, m: 'Virage à gauche : garde l’intérieur, loin de l’arbre tombé.' },
      { t: 'eddy', o: 6, y: 269.5, r: 4, m: 'Arrêt derrière la grosse roche.' },
      { t: 'gate', o: 7, y: 324, w: 10 }, { t: 'gate', o: -0.5, y: 450, w: 9 },
      { t: 'finish', y: 505 }
    ],
    scout: ['passoire', 'contre', 'vamont'],
    intro: ['Dans un virage, le courant fonce vers l’extérieur : c’est le drossage.', 'Les arbres tombés s’accumulent souvent là. Une passoire laisse passer l’eau, mais pas toi : on s’en éloigne tôt.'],
    terms: ['drossage', 'passoire', 'contre'], learned: 'garder l’intérieur du virage et éviter les passoires.'
  },
  {
    id: 'r3', name: 'Les Trois Sœurs', cls: 'R2+', len: 480, assist: false, tippy: 1,
    path: [[0, 0, 21, 1.6], [120, -5, 18, 2.2], [260, 5, 17, 2.5], [380, 0, 19, 2.2], [480, 0, 22, 1.5]], start: [0, 10, 0],
    rocks: [[-7, 110, 3.2], [4, 150, 3.4], [-3, 205, 3.5], [10, 95, 2], [-12, 160, 2], [11, 215, 2.2], [2, 300, 2.4], [-9, 330, 2.6], [9, 360, 2.4]],
    holes: [[6, 262, 7]], waves: [[-4, 255, 7, 24]], vs: [[-4, 253]],
    tasks: [
      { t: 'eddy', o: -7, y: 117, r: 4, m: 'Arrêt derrière la première sœur. Pense à gîter.' },
      { t: 'gate', o: -2, y: 180, w: 9 },
      { t: 'eddy', o: -3, y: 212.5, r: 4.2, m: 'Arrêt derrière la troisième sœur. Regarde le rouleau plus bas, à droite.' },
      { t: 'gate', o: -4, y: 258, w: 7, m: 'Passe dans le train de vagues, à gauche du rouleau. Garde le canot bien droit.' },
      { t: 'gate', o: -3.5, y: 318, w: 9 },
      { t: 'finish', y: 465 }
    ],
    scout: ['rouleau', 'vagues', 'vaval', 'contre'],
    intro: ['Trois grosses roches, un rouleau et un train de vagues. Ici, tu gères ta gîte toi-même.', 'Le rouleau retient ce qui flotte. Le train de vagues, lui, marque l’eau profonde : c’est ta route.'],
    terms: ['rouleau', 'vagues', 'gite'], learned: 'éviter un rouleau en suivant le train de vagues.'
  },
  {
    id: 'r4', name: 'Le Seuil du Draveur', cls: 'R3', len: 560, assist: false, tippy: 1,
    path: [[0, 0, 22, 1.5], [100, 0, 18, 2.2], [200, -6, 16, 2.8], [290, 0, 20, 1.8], [330, 0, 22, 1.2], [420, 0, 20, 1.9], [560, 0, 22, 1.4]], start: [0, 10, 0],
    rocks: [[-9, 120, 2.4], [9, 135, 2.6], [5, 190, 2.8], [-11, 215, 2.4], ['L', 262, 5.5], [8, 275, 2.5], [-6, 400, 2.6], [6, 430, 3], [-2, 480, 2.2]],
    holes: [[7, 235, 6]], waves: [[0, 150, 8, 36], [-5, 205, 7, 24]],
    seuil: { y: 318 }, portage: { side: 'L', y0: 264, y1: 302, toY: 345 },
    tasks: [
      { t: 'gate', o: 0, y: 152, w: 9, m: 'Train de vagues : reste au centre, bien droit.' },
      { t: 'gate', o: -3, y: 232, w: 9, m: 'Rouleau à droite! Passe à gauche, puis prépare ton arrêt.' },
      { t: 'portage', m: 'Seuil devant! Arrête-toi dans le contre-courant de la rive gauche : portage.' },
      { t: 'eddy', o: 6, y: 437, r: 4, m: 'Le seuil est derrière toi. Arrêt derrière la roche.' },
      { t: 'finish', y: 545 }
    ],
    scout: ['seuil', 'portage', 'rouleau', 'vagues'],
    intro: ['Tu entends un grondement et la rivière semble disparaître : c’est un seuil.', 'Au pied d’un seuil, le rappel peut retenir un canot et un nageur. On ne le franchit jamais sans le connaître : on portage.'],
    terms: ['seuil', 'rappel', 'portage', 'reperage'], learned: 'reconnaître un seuil et portager.'
  },
  {
    id: 'r5', name: 'La Grande Descente', cls: 'R3', len: 760, assist: false, tippy: 1.1,
    path: [[0, 0, 22, 1.5], [90, 0, 19, 2.0], [190, 22, 18, 2.3], [300, -8, 17, 2.6], [400, 10, 18, 2.4], [470, 10, 21, 1.4], [520, 10, 22, 1.2], [620, 0, 19, 2.2], [760, 0, 22, 1.4]], start: [0, 10, 0],
    rocks: [[-6, 60, 2.4], [6, 65, 2.4], [5, 150, 3], [-8, 205, 2.4], [-2, 275, 3.2], [9, 290, 2.2], [-10, 335, 2.4], [0, 350, 2.6], [10, 352, 2.4], ['R', 432, 5.5], [-5, 580, 2.6], [7, 610, 3], [-8, 660, 2.4], [3, 700, 2.2]],
    strainers: [['L', 125, 9], ['R', 240, 9]], holes: [[-5, 368, 6]], waves: [[5, 364, 7, 24]], vs: [[0, 76], [5, 361]],
    seuil: { y: 500 }, portage: { side: 'R', y0: 434, y1: 482, toY: 525 },
    tasks: [
      { t: 'gate', o: 0, y: 74, w: 7 },
      { t: 'gate', o: 8, y: 127, w: 10, m: 'Passoire à l’extérieur du virage : garde l’intérieur.' },
      { t: 'eddy', o: 5, y: 157, r: 4, m: 'Arrêt derrière la roche.' },
      { t: 'gate', o: -7, y: 242, w: 10 },
      { t: 'eddy', o: -2, y: 282, r: 4.2, m: 'Arrêt. Deux V aval plus bas : un seul est le bon.' },
      { t: 'gate', o: 5, y: 359, w: 7, m: 'Prends le V de droite. Celui de gauche mène à un rouleau.' },
      { t: 'portage', m: 'Seuil devant! Portage sur la rive droite.' },
      { t: 'eddy', o: 7, y: 617, r: 4 },
      { t: 'finish', y: 745 }
    ],
    scout: ['passoire', 'vaval', 'rouleau', 'seuil', 'portage'],
    intro: ['La grande descente : virages, passoires, rouleau et seuil. Tout ce que tu as appris y passe.', 'Prends ton temps au repérage. Un bon plan vaut mieux que des bras fatigués.'],
    terms: ['reperage', 'passoire', 'rouleau', 'portage'], learned: 'enchaîner repérage, arrêts, lignes et portage.'
  }
];

R.LEVELS = { ecole, riv };
R.ROPE = { id: 'rope', name: 'Sac à corde', len: 160, path: [[0, 0, 16, 1.7], [160, 0, 16, 1.7]], rocks: [[-10, 60, 2], [-12, 108, 2.2]] };
R.SWIM = {
  id: 'swim', name: 'Nage en eau vive', cls: 'Sécurité', swimOnly: true, len: 260,
  path: [[0, 0, 20, 1.9], [260, 0, 20, 1.9]], start: [2, 25, 0],
  rocks: [[-3, 60, 2.6], [6, 85, 2.4], [-8, 115, 3], [3, 150, 2.8], ['L', 170, 5], [8, 200, 2.6]],
  strainers: [['R', 125, 9]],
  intro: ['Tu viens de chavirer. Mets-toi sur le dos, pieds en surface, pointés vers l’aval : tes pieds amortissent les roches.', 'Ne te mets jamais debout dans le courant : un pied peut se coincer. Nage vers l’eau calme ou la rive, et loin des passoires.'],
  terms: ['position', 'nageactive', 'coincement'], learned: 'la position de sécurité et la nage vers l’eau calme.'
};
})();
