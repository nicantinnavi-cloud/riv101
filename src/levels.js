(function () {
'use strict';
// Niveaux. path = [y, centre, demi-largeur, vitesse]. Les décalages « o » partent du centre
// de la rivière (négatif = rive gauche). start = [o, y, cap en degrés] (180 = face à l'amont).
const ecole = [
  {
    id: 'e1', name: 'Premiers coups d’aviron', cls: 'Leçon 1', len: 240, assist: true,
    path: [[0, 0, 24, 0.2], [240, 0, 24, 0.2]], start: [0, 10, 0],
    rocks: [[-15, 62, 2.4], [14, 122, 2.8]],
    tasks: [
      { t: 'gate', o: -7, y: 45, w: 10, m: 'Propulsion (↑) pour avancer. Pivot (← ou →) pour tourner. Passe entre les bouées.' },
      { t: 'gate', o: 8, y: 80, w: 10 }, { t: 'gate', o: -5, y: 115, w: 10 },
      { t: 'gate', o: -5, y: 132, w: 5, m: 'Glisse de côté sans tourner : Q ou E. L’équipier avant fait un appel, l’équipier arrière un écart.' },
      { t: 'gate', o: -1, y: 146, w: 5, m: 'Encore de côté, sans pivoter : la porte suivante est décalée.' },
      { t: 'zone', o: 4, y: 185, r: 5, hold: 1.5, m: 'Arrête-toi dans le cercle. Rétro (↓) pour freiner. Le canot glisse sur son erre : freine tôt.' },
      { t: 'finish', y: 222 }
    ],
    intro: ['Bienvenue à bord! Ici, l’eau est calme : parfait pour apprendre.', 'Vous êtes deux : l’équipier avant avironne à gauche, l’équipier arrière à droite. Si les deux poussent le canot de côté dans le même sens, il glisse sans tourner. S’ils poussent en sens contraires, il pivote.', 'Un canot chargé ne s’arrête pas d’un coup : anticipe.'],
    terms: ['propulsion', 'retro', 'appel', 'ecart', 'lateral'], learned: 'avancer, freiner, tourner et glisser de côté.'
  },
  {
    id: 'e2', name: 'Suivre le courant', cls: 'Leçon 2', len: 300, assist: true,
    path: [[0, 0, 20, 1.3], [90, 6, 19, 1.5], [180, -6, 17, 1.8], [300, 0, 20, 1.3]], start: [0, 10, 0],
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
    id: 'e3', name: 'Le bac', cls: 'Leçon 3', len: 220, assist: true,
    path: [[0, 0, 20, 1.6], [220, 0, 20, 1.6]], start: [-15, 31, 180],
    rocks: [['L', 22, 5], ['R', 26, 5], [11, 104, 2.6]],
    tasks: [
      { t: 'ferry', o: 'R', inset: 5, y: 35, r: 4.5, limit: 72, retry: true, m: 'Traverse en bac : pointe vers l’amont, un peu vers la rive droite, et pagaie.' },
      { t: 'ferry', o: 'L', inset: 5, y: 31, r: 4.5, limit: 72, retry: true, m: 'Reviens en bac vers la rive gauche. Ne dépasse pas la ligne rouge.' },
      { t: 'ferry', o: 'R', inset: 6, y: 60, r: 5, hold: 1, limit: 125, retry: true, back: true, m: 'Bac arrière : garde la pointe avant vers l’aval, tourne un peu la pointe arrière vers la rive à atteindre, et fais du rétro.' },
      { t: 'gate', o: 4, y: 116, w: 5, back: true, m: 'Roche devant! Rétro pour ralentir, puis bac arrière vers la gauche pour la contourner. Passe entre les bouées.' },
      { t: 'finish', y: 200, m: 'Bravo! Descends jusqu’à l’arrivée.' }
    ],
    intro: ['Le bac sert à traverser la rivière sans se faire emporter.', 'Bac avant : le canot regarde vers l’amont, avec un petit angle vers la rive à atteindre. Tu pagaies vers l’avant, et le courant te pousse de côté.', 'Bac arrière : le canot regarde vers l’aval et tu fais du rétro. Tu ralentis et tu te déplaces de côté tout en regardant le rapide devant toi. C’est la façon de base d’éviter un obstacle.', 'Pendant un bac, le canot gîte vers l’aval : le courant glisse sous la coque. Ici, ton équipier s’en occupe.'],
    terms: ['bac', 'bacarriere', 'assiette', 'contre', 'amont'], learned: 'traverser le courant en bac avant et en bac arrière.'
  },
  {
    id: 'e4', name: 'Arrêt et reprise', cls: 'Leçon 4', len: 300, assist: true,
    path: [[0, 0, 20, 2.0], [300, 0, 20, 2.0]], start: [0, 10, 0],
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
    path: [[0, 0, 18, 2.4], [300, 0, 18, 2.4]], start: [0, 10, 0],
    rocks: [[-5, 70, 3], ['R', 135, 5], [-3, 205, 3.2]],
    tasks: [
      { t: 'eddy', o: -5, y: 77, r: 4, retry: true, m: 'Gîte (A ou D) quand le repère G ou D s’allume, en entrant dans le contre-courant.' },
      { t: 'eddy', o: 'R', inset: 5, y: 146, r: 4.5, retry: true, m: 'En sortant du contre-courant, gîte vers l’aval.' },
      { t: 'ferry', o: 'L', inset: 5, y: 165, r: 4.5, hold: 1, limit: 200, retry: true, m: 'Bac avec gîte : penche le canot vers l’aval (A ou D) pour que le courant te pousse de côté.' },
      { t: 'eddy', o: -3, y: 212.5, r: 4.2, retry: true },
      { t: 'finish', y: 280 }
    ],
    intro: ['Quand tu changes de courant, l’eau pousse sur le côté du canot et peut le faire chavirer.', 'La règle : gîte vers l’aval du courant où tu entres, donc vers l’intérieur de ton virage. Touches A (gauche) et D (droite).', 'En bac aussi, gîte vers l’aval : à plat, la coque accroche et le courant t’emporte.', 'La jauge au bas de l’écran montre l’équilibre du canot. Si tu chavires, tu apprendras à nager en rapide.'],
    terms: ['gite', 'cisaillement', 'appui'], learned: 'gîter pour garder l’équilibre.'
  }
];

// Rivières, dans l'ordre de déblocage. La largeur vaut deux fois la demi-largeur du path.
const riv = [
  {
    id: 'r0', name: 'Ruisseau des Aulnes', cls: 'R1', len: 330, assist: true,
    path: [[0, 0, 6, 1.6], [60, 4, 5.5, 1.9], [120, -3, 6, 2.1], [180, 3, 5, 2.3], [240, -2, 6.5, 1.8], [300, 1, 7, 1.5], [330, 1, 7, 1.5]], start: [0, 10, 0],
    rocks: [[1.5, 40, 1.2], ['L', 70, 3.5], [-2, 110, 1.4], ['R', 150, 3.5], [2, 200, 1.5], ['L', 255, 3], [-1.5, 285, 1.2]],
    strainers: [['R', 225, 4.5]],
    tasks: [
      { t: 'gate', o: 0, y: 28, w: 6, m: 'Sur un ruisseau, tout arrive vite. Regarde loin devant.' },
      { t: 'gate', o: -2, y: 44, w: 5, m: 'Petite roche à droite : passe à sa gauche.' },
      { t: 'eddy', o: 'L', inset: 3.2, y: 77, r: 2.8, m: 'Arrête-toi derrière la pointe de berge, à gauche.' },
      { t: 'gate', o: 1.5, y: 113, w: 5 },
      { t: 'eddy', o: 'R', inset: 3.2, y: 157, r: 2.8, m: 'Nouvel arrêt derrière la pointe, à droite. Sur un ruisseau, on s’arrête souvent.' },
      { t: 'gate', o: -3, y: 229, w: 5, m: 'Passoire à droite! Garde la gauche, loin des branches.' },
      { t: 'finish', y: 315 }
    ],
    scout: ['vamont', 'contre', 'passoire'],
    intro: ['Un petit ruisseau qui serpente sous les aulnes. Ici, tout arrive plus vite : il y a moins de place et moins de temps pour réagir.', 'Regarde loin devant et arrête-toi souvent derrière les pointes de berge pour voir la suite.'],
    terms: ['vamont', 'contre', 'passoire', 'reperage'], learned: 'descendre un petit ruisseau en regardant loin et en t’arrêtant souvent.'
  },
  {
    id: 'r1', name: 'Rivière aux Castors', cls: 'R1', len: 420, assist: true,
    path: [[0, 0, 15, 1.5], [100, 5, 13, 1.9], [200, -3, 12, 2.3], [300, 4, 13, 1.9], [420, 0, 15, 1.5]], start: [0, 10, 0],
    rocks: [[-6, 70, 2], [3.5, 76, 2], [6, 130, 2.2], [-5, 175, 3], [-1, 235, 1.6], [8, 240, 1.6], [-7, 250, 2], ['R', 300, 4], [-4, 335, 1.6], [5, 338, 1.6]],
    vs: [[-1.2, 84], [3.7, 249], [0.5, 347]],
    tasks: [
      { t: 'gate', o: -1.2, y: 82, w: 5.5, m: 'Premier V aval : passe dans la langue d’eau lisse.' },
      { t: 'gate', o: -1, y: 131, w: 8, m: 'Roche à droite : choisis ta ligne tôt. Un petit déplacement latéral à gauche (Q) suffit.' },
      { t: 'eddy', o: -5, y: 182, r: 3.5, m: 'Arrête-toi dans le contre-courant pour regarder la suite.' },
      { t: 'gate', o: 3.7, y: 247, w: 5.5 }, { t: 'gate', o: 0.5, y: 345, w: 5.5 },
      { t: 'finish', y: 405 }
    ],
    scout: ['vaval', 'vamont', 'contre'],
    intro: ['Une rivière de classe R1 : petites vagues et passages faciles à voir.', 'Commence par le repérage : trouve les V aval, les roches et un contre-courant pour t’arrêter.'],
    terms: ['classes', 'vaval', 'contre', 'reperage'], learned: 'descendre un rapide R1 en choisissant ta ligne.'
  },
  {
    id: 'r2', name: 'La Sinueuse', cls: 'R2', len: 520, assist: true,
    path: [[0, 0, 11, 2.0], [90, 0, 11, 2.2], [190, 26, 10, 2.7], [290, -10, 9, 2.7], [390, 22, 10, 2.9], [520, 10, 12, 2.0]], start: [0, 10, 0],
    rocks: [[2.5, 36, 1.6], [-3, 48, 1.6], [2.5, 60, 1.6], [-1, 160, 1.8], ['L', 200, 4], [4, 262, 2.6], [1, 298, 2.2], [-3, 350, 1.6], [2, 430, 1.8], [-3, 470, 1.5]],
    strainers: [['L', 118, 5], ['R', 228, 5], ['L', 322, 4.5]],
    tasks: [
      { t: 'gate', o: -3, y: 39, w: 4.5, back: true, m: 'Jardin de roches : rétro, puis bac arrière vers la gauche pour contourner la roche.' },
      { t: 'gate', o: 2.5, y: 51, w: 4.5, back: true, m: 'Rétro, puis bac arrière vers la droite pour contourner la roche suivante.' },
      { t: 'gate', o: -3, y: 63, w: 4.5, back: true, m: 'Encore une : bac arrière vers la gauche.' },
      { t: 'gate', o: 4, y: 120, w: 6, m: 'Virage : le courant pousse vers l’extérieur, où attend une passoire. Reste à l’intérieur.' },
      { t: 'eddy', o: 'L', inset: 3.5, y: 207, r: 3, retry: true, m: 'Arrêt à ne pas manquer : derrière la pointe, à gauche. Une passoire attend plus bas, à droite.' },
      { t: 'gate', o: -4, y: 230, w: 6, m: 'Virage à gauche : garde l’intérieur, loin de l’arbre tombé.' },
      { t: 'eddy', o: 4, y: 268, r: 3, m: 'Arrêt derrière la grosse roche.' },
      { t: 'gate', o: -3, y: 301, w: 4.5, back: true, m: 'Roche dans la veine, à la sortie du virage : rétro, puis bac arrière vers la gauche.' },
      { t: 'gate', o: 4, y: 324, w: 7, back: true, m: 'Passoire à gauche : bac arrière vers la droite.' }, { t: 'gate', o: -0.5, y: 450, w: 6 },
      { t: 'finish', y: 505 }
    ],
    scout: ['passoire', 'contre', 'vamont'],
    intro: ['Dans un virage, le courant fonce vers l’extérieur : c’est le drossage.', 'Les arbres tombés s’accumulent souvent là. Une passoire laisse passer l’eau, mais pas toi : on s’en éloigne tôt.'],
    terms: ['drossage', 'passoire', 'contre'], learned: 'garder l’intérieur du virage et éviter les passoires.'
  },
  {
    id: 'r6', name: 'La Gorge du Portageur', cls: 'R2', len: 420, assist: true,
    path: [[0, 0, 15, 1.3], [50, 0, 15, 1.3], [85, 0, 6, 3.2], [125, 0, 6.5, 3.0], [160, 2, 15, 1.3], [230, 2, 15, 1.3], [265, 0, 6, 3.2], [310, 0, 6.5, 3.0], [345, 0, 15, 1.3], [420, 0, 15, 1.3]], start: [0, 10, 0],
    rocks: [[-6, 30, 1.5], [7, 185, 2.6], ['L', 205, 4], [-4, 250, 1.4], [4, 252, 1.4]],
    waves: [[0, 90, 6, 30], [0, 270, 6, 32]], vs: [[0, 259]],
    banks: [['L', 66, 142, 'cliff'], ['R', 66, 142, 'cliff'], ['L', 255, 328, 'cliff'], ['R', 255, 328, 'cliff']],
    tasks: [
      { t: 'land', side: 'R', y0: 28, y1: 56, range: [55, 150], scout: ['vagues', 'falaise'], retry: true, m: 'Un canyon devant! Accoste sur la rive droite et va le voir à pied.' },
      { t: 'gate', o: 0, y: 105, w: 6, m: 'La rivière se resserre : le courant accélère. Reste au centre, dans les vagues.' },
      { t: 'eddy', o: 7, y: 191, r: 3, m: 'Arrêt dans le bassin : la rivière s’élargit et le courant ralentit.' },
      { t: 'ferry', o: 'L', inset: 4, y: 211, r: 3.5, limit: 236, retry: true, m: 'Bac vers la gauche jusqu’au contre-courant derrière la pointe. Gîte vers l’aval.' },
      { t: 'land', side: 'L', y0: 214, y1: 238, range: [236, 335], scout: ['vaval', 'vagues'], retry: true, m: 'Deuxième canyon : accoste à gauche, derrière la pointe, et repère-le à pied.' },
      { t: 'gate', o: 0, y: 258, w: 5.5, m: 'Vise le V aval à l’entrée du deuxième étranglement.' },
      { t: 'gate', o: 0, y: 292, w: 6, m: 'Garde le canot droit dans les vagues.' },
      { t: 'finish', y: 405 }
    ],
    scout: ['contre', 'falaise'],
    intro: ['Une rivière qui respire : de grands bassins calmes, puis des canyons étroits où l’eau file. Quand elle se resserre, le courant accélère.', 'Dans un canyon, les parois de roc empêchent de sortir et de portager. Avant d’y entrer, accoste dans le bassin et va le voir à pied.'],
    terms: ['canyon', 'accostage', 'vagues', 'veine'], learned: 'le courant accélère dans un passage étroit et ralentit dans un bassin.'
  },
  {
    id: 'r3', name: 'Les Trois Sœurs', cls: 'R2+', len: 480, assist: false, tippy: 1,
    path: [[0, 0, 21, 2.3], [120, -5, 19, 2.8], [260, 5, 18, 3.2], [380, 0, 19, 2.8], [480, 0, 21, 2.3]], start: [0, 10, 0],
    rocks: [[-7, 110, 3.2], [4, 150, 3.4], [-3, 205, 3.5], [10, 95, 2], [-12, 160, 2], [11, 215, 2.2], [2, 300, 2.4], [-9, 330, 2.6], [9, 360, 2.4], [-3, 388, 1.8], [3, 400, 1.8], [-3, 412, 1.8]],
    holes: [[6, 262, 7]], waves: [[-4, 255, 7, 24]], vs: [[-4, 253]],
    tasks: [
      { t: 'eddy', o: -7, y: 117, r: 4, m: 'Arrêt derrière la première sœur. Pense à gîter.' },
      { t: 'ferry', o: 4, y: 157, r: 4, limit: 190, retry: true, m: 'Bac en plein rapide jusqu’au contre-courant de la deuxième sœur. Pointe vers l’amont et gîte vers l’aval.' },
      { t: 'eddy', o: -3, y: 212.5, r: 4.2, retry: true, m: 'Arrêt à ne pas manquer derrière la troisième sœur : le rouleau est plus bas, à droite.' },
      { t: 'gate', o: -4, y: 258, w: 7, m: 'Passe dans le train de vagues, à gauche du rouleau. Garde le canot bien droit.' },
      { t: 'gate', o: -3.5, y: 318, w: 9 },
      { t: 'gate', o: 2.5, y: 391, w: 4.5, back: true, m: 'Jardin de roches : rétro, puis bac arrière vers la droite pour contourner la roche.' },
      { t: 'gate', o: -2.5, y: 403, w: 4.5, back: true, m: 'Bac arrière vers la gauche.' },
      { t: 'gate', o: 2.5, y: 415, w: 4.5, back: true, m: 'Et vers la droite.' },
      { t: 'finish', y: 465 }
    ],
    scout: ['rouleau', 'vagues', 'vaval', 'contre'],
    intro: ['Trois grosses roches, un rouleau et un train de vagues. Ici, tu gères ta gîte toi-même.', 'Le rouleau retient ce qui flotte. Le train de vagues, lui, marque l’eau profonde : c’est ta route.'],
    terms: ['rouleau', 'vagues', 'gite'], learned: 'éviter un rouleau en suivant le train de vagues.'
  },
  {
    id: 'r4', name: 'Le Seuil du Draveur', cls: 'R3', len: 560, assist: false, tippy: 1,
    path: [[0, 0, 22, 2.0], [70, 0, 22, 2.2], [120, 0, 12, 3.2], [200, -4, 11, 3.8], [240, -2, 12, 3.4], [280, 0, 22, 1.1], [330, 0, 22, 1.0], [420, 0, 20, 2.8], [560, 0, 22, 2.2]], start: [0, 10, 0],
    rocks: [[-6, 120, 1.8], [6, 135, 2], [3, 190, 2], [-6.5, 215, 1.8], ['L', 262, 5.5], ['R', 268, 4.5], [3, 282, 2.2], [-6, 400, 2.6], [6, 430, 3], [-2, 480, 2.2]],
    holes: [[6, 235, 5]], waves: [[0, 150, 6, 36], [-3, 205, 6, 24]],
    seuil: { y: 318 }, portage: { side: 'L', y0: 264, y1: 302, toY: 345 }, banks: [['R', 248, 372, 'cliff']],
    tasks: [
      { t: 'gate', o: 0, y: 152, w: 7, m: 'Passage resserré : le courant accélère. Reste au centre, bien droit.' },
      { t: 'gate', o: -3.5, y: 232, w: 7, m: 'Rouleau à droite! Passe à gauche, puis prépare ton arrêt.' },
      { t: 'portage', m: 'Seuil devant! Le sentier de portage est d’un seul côté. Arrête-toi sur la bonne rive.' },
      { t: 'eddy', o: -6, y: 407, r: 4, m: 'Le seuil est derrière toi. Arrêt derrière la roche, à gauche.' },
      { t: 'ferry', o: 6, y: 437, r: 4, limit: 462, retry: true, m: 'Bac jusqu’au contre-courant de la roche suivante, à droite. Gîte vers l’aval.' },
      { t: 'finish', y: 545 }
    ],
    scout: ['seuil', 'falaise', 'portage', 'rouleau', 'vagues'],
    intro: ['Tu entends un grondement et la rivière semble disparaître : c’est un seuil.', 'Au pied d’un seuil, le rappel peut retenir un canot et un nageur. On ne le franchit jamais sans le connaître : on portage.'],
    terms: ['seuil', 'rappel', 'portage', 'sentier'], learned: 'reconnaître un seuil et portager.'
  },
  {
    id: 'r5', name: 'La Grande Descente', cls: 'R3', len: 760, assist: false, tippy: 1.1,
    path: [[0, 0, 24, 2.0], [90, 0, 22, 2.6], [190, 22, 20, 3.0], [300, -8, 13, 3.8], [400, 10, 20, 3.2], [470, 10, 24, 1.4], [520, 10, 25, 1.2], [620, 0, 22, 3.0], [760, 0, 25, 2.0]], start: [0, 10, 0],
    rocks: [[-6, 60, 2.4], [6, 65, 2.4], [5, 150, 3], [-8, 205, 2.4], [-2, 275, 3.2], [9, 290, 2.2], [-10, 335, 2.4], [-0.5, 350, 2.4], [10.5, 352, 2.4], ['R', 432, 5.5], ['L', 448, 5], [-5, 580, 2.6], [7, 610, 3], [-8, 660, 2.4], [3, 700, 2.2]],
    strainers: [['L', 125, 9], ['R', 240, 9]], holes: [[-5, 368, 6]], waves: [[5, 364, 7, 24]], vs: [[0, 76], [5, 361]],
    seuil: { y: 500 }, portage: { side: 'R', y0: 434, y1: 482, toY: 525 }, banks: [['L', 415, 560, 'cliff']],
    tasks: [
      { t: 'gate', o: 0, y: 74, w: 7 },
      { t: 'gate', o: 8, y: 127, w: 10, m: 'Passoire à l’extérieur du virage : garde l’intérieur.' },
      { t: 'eddy', o: 5, y: 157, r: 4, m: 'Arrêt derrière la roche.' },
      { t: 'ferry', o: -8, y: 211, r: 3.5, limit: 236, retry: true, m: 'Bac vers la gauche jusqu’au contre-courant : la passoire est plus bas, à droite.' },
      { t: 'gate', o: -7, y: 242, w: 10 },
      { t: 'eddy', o: -2, y: 282, r: 4.2, m: 'Arrêt. La rivière se resserre : deux V aval plus bas, un seul est le bon.' },
      { t: 'gate', o: 5, y: 359, w: 5.5, m: 'Prends le V de droite. Celui de gauche mène à un rouleau.' },
      { t: 'portage', m: 'Seuil devant! Le sentier n’est que d’un côté : choisis la bonne rive.' },
      { t: 'eddy', o: 7, y: 617, r: 4 },
      { t: 'finish', y: 745 }
    ],
    scout: ['passoire', 'vaval', 'rouleau', 'seuil', 'falaise', 'portage'],
    intro: ['La grande descente : la plus grosse rivière, avec virages, passoires, un passage resserré, un rouleau et un seuil.', 'Prends ton temps au repérage. Un bon plan vaut mieux que des bras fatigués.'],
    terms: ['reperage', 'passoire', 'portage', 'sentier'], learned: 'enchaîner repérage, arrêts, lignes et portage.'
  }
];

R.LEVELS = { ecole, riv };
// Demi-largeur 12 m : le lanceur (rive droite + 1,2 m) atteint tout nageur parti entre -9 et 5 m (portée 22 m).
R.ROPE = { id: 'rope', name: 'Sac à corde', len: 160, path: [[0, 0, 12, 1.7], [160, 0, 12, 1.7]], rocks: [[-8, 58, 1.8], [-9, 108, 2]] };
R.SWIM = {
  id: 'swim', name: 'Nage en eau vive', cls: 'Sécurité', swimOnly: true, len: 260,
  path: [[0, 0, 20, 1.9], [260, 0, 20, 1.9]], start: [2, 25, 0],
  rocks: [[-3, 60, 2.6], [6, 85, 2.4], [-8, 115, 3], [3, 150, 2.8], ['L', 170, 5], [8, 200, 2.6]],
  strainers: [['R', 125, 9]],
  intro: ['Tu viens de chavirer. Mets-toi sur le dos, pieds en surface, pointés vers l’aval : tes pieds amortissent les roches.', 'Ne te mets jamais debout dans le courant : un pied peut se coincer. Nage vers l’eau calme ou la rive, et loin des passoires.'],
  terms: ['position', 'nageactive', 'coincement'], learned: 'la position de sécurité et la nage vers l’eau calme.'
};
})();
