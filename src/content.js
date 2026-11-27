(function () {
'use strict';
// Contenu pédagogique de Riv101 : lexique, quiz, mises en situation, signaux, équipement.
// Dans chaque tableau de choix, la bonne réponse est toujours a[0] (l’interface mélange).

R.CATS = [['riv', 'La rivière'], ['lire', 'Lire le rapide'], ['coups', 'Coups et manœuvres'], ['secu', 'Sécurité']];

// Scènes illustrées pour R.still(canvas, sc). L’aval est en haut de l’image.
const SC = {
  vaval: {
    def: { rocks: [[-5, 24, 1.8], [5, 24, 1.8]], vs: [[0, 34]] },
    labels: [[0, 33, 'V aval'], [-5, 24, 'Roche', 'danger']]
  },
  vamont: {
    def: { rocks: [[0, 30, 1.6]] },
    labels: [[0, 28, 'V amont', 'danger']]
  },
  contre: {
    def: { rocks: [['R', 22, 5]] },
    labels: [[8, 30, 'Contre-courant'], [-3, 30, 'Courant']]
  },
  rouleau: {
    def: { holes: [[0, 28, 8]] },
    labels: [[0, 28, 'Rouleau', 'danger']]
  },
  vagues: {
    def: { waves: [[0, 30, 6, 14]] },
    labels: [[0, 30, 'Train de vagues']]
  },
  seuil: {
    def: { seuil: { y: 26 } },
    labels: [[-4, 26, 'Seuil', 'danger'], [4, 30, 'Rappel', 'danger']]
  },
  passoire: {
    def: { strainers: [['L', 26, 9]] },
    labels: [[-8, 26, 'Passoire', 'danger'], [5, 32, 'Passage']]
  },
  drossage: {
    def: { path: [[0, -8, 11, 2], [28, 6, 11, 2.2], [60, -6, 11, 2]], strainers: [['R', 27, 8]] },
    labels: [[8, 27, 'Drossage', 'danger'], [-5, 31, 'Intérieur']]
  },
  bac: {
    def: { path: [[0, 0, 14, 1.8], [60, 0, 14, 1.8]] },
    boat: [-3, 30, 205],
    labels: [[7, 36, 'Courant'], [-3, 25, 'Bac']]
  },
  arret: {
    def: { rocks: [[5, 23, 3.5]] },
    boat: [5, 30, 180],
    labels: [[5, 23, 'Roche', 'danger'], [-5, 30, 'Courant']]
  }
};

R.LEX = [
  // La rivière
  { id: 'amont', t: 'Amont', c: 'riv', d: 'L’amont, c’est d’où vient l’eau. Remonter la rivière, c’est aller vers l’amont.' },
  { id: 'aval', t: 'Aval', c: 'riv', d: 'L’aval, c’est où va l’eau. Le courant te porte toujours vers l’aval.' },
  { id: 'rives', t: 'Rive gauche, rive droite', c: 'riv', d: 'On nomme toujours les rives en regardant vers l’aval. La rive gauche est donc à ta gauche quand tu regardes où va l’eau.' },
  { id: 'veine', t: 'Veine d’eau', c: 'riv', d: 'La veine d’eau, c’est là où l’eau coule le plus vite et le plus profond. C’est souvent le chemin principal du courant.' },
  { id: 'debit', t: 'Débit (niveau d’eau)', c: 'riv', d: 'Le débit, c’est la quantité d’eau qui coule. Quand il change, la rivière change aussi. Après de grosses pluies, elle est plus rapide et charrie des débris.' },
  { id: 'contre', t: 'Contre-courant', c: 'riv', d: 'Eau calme ou qui remonte, derrière une roche ou une pointe de la berge. C’est l’endroit idéal pour s’arrêter.', sc: SC.contre },
  { id: 'cisaillement', t: 'Ligne de cisaillement', c: 'riv', d: 'La frontière entre le courant et le contre-courant. L’eau y tourbillonne : on la traverse avec un bon angle et de la vitesse.' },
  { id: 'coussin', t: 'Coussin', c: 'riv', d: 'Le bourrelet d’eau qui se forme en amont d’une roche. Il signale la roche même quand on la voit mal.' },
  { id: 'classes', t: 'Classes de rapides', c: 'riv', d: 'Les rapides sont classés de I à VI (au Québec, souvent R1 à R6). R1 : facile. R2 : rapides simples. R3 : vagues fortes, repérage recommandé. R4 et plus : experts seulement. Pour débuter : R1 et R2, avec un adulte formé.' },

  // Lire le rapide
  { id: 'vaval', t: 'V aval (langue)', c: 'lire', d: 'Une langue d’eau lisse entre deux obstacles, avec la pointe vers l’aval. C’est souvent le bon passage.', sc: SC.vaval },
  { id: 'vamont', t: 'V amont', c: 'lire', d: 'Un V dont la pointe montre l’amont. Il y a une roche à sa pointe : on l’évite.', sc: SC.vamont },
  { id: 'rouleau', t: 'Rouleau', c: 'lire', d: 'Derrière un obstacle submergé, l’eau retombe et tourne sur elle-même. Un rouleau peut retenir le canot.', sc: SC.rouleau },
  { id: 'vagues', t: 'Train de vagues', c: 'lire', d: 'Une série de vagues régulières, l’une après l’autre. Elles marquent souvent l’eau profonde.', sc: SC.vagues },
  { id: 'seuil', t: 'Seuil', c: 'lire', d: 'Une marche où la rivière tombe d’un coup. De loin, on voit une ligne d’horizon et on entend un grondement.', sc: SC.seuil },
  { id: 'rappel', t: 'Rappel', c: 'lire', d: 'Au pied d’un seuil ou d’un barrage, l’eau revient vers l’arrière. Le rappel peut retenir un canot et un nageur : on portage.', sc: SC.seuil },
  { id: 'passoire', t: 'Passoire', c: 'lire', d: 'Un arbre tombé ou des branches dans le courant. L’eau passe, mais pas toi. On s’en éloigne tôt.', sc: SC.passoire },
  { id: 'drossage', t: 'Drossage', c: 'lire', d: 'Dans un virage, le courant pousse vers l’extérieur, contre la berge. On garde l’intérieur du virage.', sc: SC.drossage },
  { id: 'reperage', t: 'Repérage', c: 'lire', d: 'S’arrêter et marcher sur la berge pour regarder le rapide avant de le descendre. Dans le doute, on portage.' },

  // Coups et manœuvres
  { id: 'propulsion', t: 'Propulsion', c: 'coups', d: 'Le coup de base pour avancer. Tu plantes la pagaie devant toi et tu la tires vers l’arrière.' },
  { id: 'retro', t: 'Rétro (rétropropulsion)', c: 'coups', d: 'Le coup pour freiner ou reculer. Tu pousses l’eau vers l’avant avec l’aviron.' },
  { id: 'appel', t: 'Appel', c: 'coups', d: 'Tu tires l’eau vers le canot, sur le côté. Ta pointe du canot se déplace vers ta pagaie. Si les deux équipiers font un appel, le canot pivote.' },
  { id: 'ecart', t: 'Écart', c: 'coups', d: 'Tu pousses l’eau loin du canot, sur le côté. Ta pointe du canot s’éloigne de ta pagaie. Si les deux équipiers font un écart, le canot pivote dans l’autre sens.' },
  { id: 'lateral', t: 'Déplacement latéral', c: 'coups', d: 'Glisser de côté sans tourner. Un équipier fait un appel et l’autre un écart, et les deux poussent le canot du même côté.' },
  { id: 'coupj', t: 'Coup en J', c: 'coups', d: 'Une propulsion qui finit par un petit crochet, comme la lettre J. Il garde le canot en ligne droite sans changer de côté.' },
  { id: 'appui', t: 'Appui', c: 'coups', d: 'Tu poses la pagaie à plat sur l’eau et tu t’appuies dessus. Ça t’aide à retrouver ton équilibre.' },
  { id: 'gite', t: 'Gîte', c: 'coups', d: 'Pencher volontairement le canot. On gîte vers l’aval du courant où l’on entre, donc vers l’intérieur du virage. De travers sur une roche, on gîte vers la roche.' },
  { id: 'bac', t: 'Bac', c: 'coups', d: 'Traverser la rivière sans descendre. Le canot pointe vers l’amont, avec un petit angle vers la rive à atteindre.', sc: SC.bac },
  { id: 'arret', t: 'Arrêt contre-courant', c: 'coups', d: 'Entrer dans un contre-courant pour s’arrêter. On en profite pour se reposer et regarder la suite.', sc: SC.arret },
  { id: 'reprise', t: 'Reprise de courant', c: 'coups', d: 'Sortir d’un contre-courant pour repartir dans le courant. On traverse la ligne de cisaillement en gîtant vers l’aval.' },

  // Sécurité
  { id: 'vfi', t: 'VFI', c: 'secu', d: 'Le vêtement de flottaison individuel. On le porte toujours, attaché et bien ajusté.' },
  { id: 'casque', t: 'Casque', c: 'secu', d: 'Il protège ta tête contre les roches si tu tombes à l’eau. On le porte en eau vive.' },
  { id: 'sifflet', t: 'Sifflet', c: 'secu', d: 'Attaché à ton VFI, il porte plus loin que ta voix. Trois longs coups veulent dire : urgence.' },
  { id: 'sacacorde', t: 'Sac à corde', c: 'secu', d: 'Un sac qui contient une corde à lancer à un nageur. On crie « Corde! », on lance pour que la corde tombe sur lui et on se tient solidement. Jamais attaché à soi, jamais enroulé autour de la main.' },
  { id: 'signaux', t: 'Signaux', c: 'secu', d: 'Des gestes pour se parler malgré le bruit de l’eau. Pagaie à l’horizontale : arrêt. À la verticale : voie libre. Inclinée : passe de ce côté. Tape sur le casque : « ça va? »' },
  { id: 'position', t: 'Position de sécurité', c: 'secu', d: 'La nage défensive : sur le dos, les pieds en surface pointés vers l’aval. Tes pieds amortissent les roches.' },
  { id: 'nageactive', t: 'Nage active', c: 'secu', d: 'Sur le ventre, tu nages à fond. Elle sert à rejoindre un contre-courant ou à t’éloigner d’une passoire.' },
  { id: 'coincement', t: 'Coincement de pied', c: 'secu', d: 'Ton pied peut se coincer entre les roches du fond. Ne te mets jamais debout dans le courant : nage jusqu’à l’eau calme avant de te lever.' },
  { id: 'chavirage', t: 'Chavirage', c: 'secu', d: 'Si le canot se renverse, reste en amont du canot. Un canot plein d’eau peut coincer quelqu’un contre une roche.' },
  { id: 'hypothermie', t: 'Hypothermie', c: 'secu', d: 'Quand le corps se refroidit trop. L’eau froide épuise vite : habille-toi pour l’eau, garde des vêtements secs dans un sac étanche, sors de l’eau et dis-le à un adulte.' },
  { id: 'groupe', t: 'Pagayer en groupe', c: 'secu', d: 'On ne pagaie jamais seul. Au moins trois embarcations, avec un adulte formé, et on garde le contact visuel.' },
  { id: 'portage', t: 'Portage', c: 'secu', d: 'Porter le canot sur la berge pour contourner un obstacle. Faire un portage, c’est un choix intelligent.' },
  { id: 'canyon', t: 'Canyon', c: 'lire', d: 'Une gorge étroite entre deux parois de roc. Une fois dedans, on ne peut ni sortir ni portager : on la repère à pied avant d’y entrer.' },
  { id: 'accostage', t: 'Accostage', c: 'coups', d: 'Rejoindre la berge et s’y arrêter. On accoste de préférence face à l’amont : le canot est plus stable et plus facile à tenir.' },
  { id: 'sentier', t: 'Sentier de portage', c: 'secu', d: 'Un chemin sur la berge pour contourner un seuil ou un rapide. On vérifie de quel côté il se trouve AVANT d’arriver au seuil.' }
];

R.QUIZ = [
  // Termes et coups
  { q: 'Où est l’amont?', a: ['D’où vient l’eau', 'Où va l’eau', 'Au milieu de la rivière'], why: 'L’amont, c’est d’où vient l’eau. L’aval, c’est où elle va.' },
  { q: 'Comment sait-on quelle est la rive gauche?', a: ['On regarde vers l’aval', 'On regarde vers l’amont', 'Ça dépend de la carte'], why: 'On nomme toujours les rives en regardant vers l’aval, là où va l’eau.' },
  { q: 'Quel coup sert à freiner ou à reculer?', a: ['Le rétro', 'La propulsion', 'L’appel'], why: 'Le rétro (rétropropulsion), c’est pousser l’eau vers l’avant avec l’aviron : le canot freine ou recule.' },
  { q: 'Avec un appel, le canot se déplace…', a: ['Vers ta pagaie', 'Loin de ta pagaie', 'Vers l’arrière'], why: 'L’appel tire l’eau vers le canot, alors le canot se rapproche de ta pagaie.' },
  { q: 'Avec un écart, le canot se déplace…', a: ['Loin de ta pagaie', 'Vers ta pagaie', 'Vers l’avant seulement'], why: 'L’écart pousse l’eau loin du canot, alors le canot s’éloigne de ta pagaie.' },
  { q: 'À quoi sert le coup en J?', a: ['Garder le canot en ligne droite sans changer de côté', 'Faire demi-tour très vite', 'Freiner d’un coup'], why: 'Le petit crochet à la fin du coup corrige la direction. Plus besoin de changer de côté.' },
  { q: 'Tu perds l’équilibre. Quel coup t’aide?', a: ['L’appui', 'Le rétro', 'La propulsion'], why: 'L’appui, c’est poser la pagaie à plat sur l’eau pour t’y appuyer.' },
  { q: 'Que veut dire « gîter »?', a: ['Pencher le canot', 'Sortir du canot', 'Ramer très vite'], why: 'Gîter, c’est pencher volontairement le canot sur le côté.' },
  { q: 'En entrant dans un contre-courant, de quel côté gîtes-tu?', a: ['Vers l’intérieur du virage', 'Vers l’extérieur du virage', 'On ne gîte jamais'], why: 'On gîte vers l’aval du courant où l’on entre, donc vers l’intérieur du virage.' },
  { q: 'Pour faire un bac, vers où pointe le canot?', a: ['Vers l’amont, avec un petit angle', 'Vers l’aval, tout droit', 'Directement vers la rive'], why: 'En bac, le canot pointe vers l’amont avec un petit angle vers la rive à atteindre. Il traverse sans descendre.' },
  { q: 'Qu’est-ce qu’une reprise de courant?', a: ['Sortir d’un contre-courant pour repartir', 'Reprendre son souffle sur la berge', 'Changer de pagaie'], why: 'La reprise de courant, c’est quitter le contre-courant pour retourner dans le courant.' },
  // Lecture de rapides
  { q: 'Qu’est-ce qu’un V aval?', a: ['Une langue d’eau lisse, souvent le bon passage', 'Un V qui cache une roche', 'Une grosse vague'], why: 'Le V aval pointe vers l’aval entre deux obstacles. C’est souvent par là qu’on passe.' },
  { q: 'Un V qui pointe vers l’amont montre…', a: ['Une roche à éviter', 'Le meilleur passage', 'Un contre-courant'], why: 'La pointe du V amont montre une roche. On l’évite.' },
  { q: 'Où trouve-t-on un contre-courant?', a: ['Derrière une roche ou une pointe de la berge', 'Juste devant une roche', 'Au milieu d’un train de vagues'], why: 'L’eau calme ou qui remonte se trouve derrière un obstacle, du côté aval.' },
  { q: 'La ligne de cisaillement, c’est…', a: ['La frontière entre le courant et le contre-courant', 'Une corde tendue au-dessus de l’eau', 'Le fond de la rivière'], why: 'C’est la limite où le courant rapide rencontre l’eau calme du contre-courant.' },
  { q: 'Qu’est-ce qu’un coussin?', a: ['Un bourrelet d’eau en amont d’une roche', 'Un siège dans le canot', 'Une zone d’eau calme'], why: 'L’eau qui frappe une roche monte un peu devant elle : c’est le coussin.' },
  { q: 'Un train de vagues régulières marque souvent…', a: ['L’eau profonde', 'Une roche cachée', 'Une passoire'], why: 'Les vagues régulières se forment souvent là où l’eau est profonde.' },
  { q: 'Pourquoi le rouleau est-il dangereux?', a: ['L’eau tourne sur elle-même et peut retenir le canot', 'Il est trop calme', 'Il pousse toujours vers la rive'], why: 'Derrière un obstacle submergé, l’eau retombe et tourne. Elle peut garder le canot prisonnier.' },
  { q: 'Dans un virage, où le courant pousse-t-il?', a: ['Vers l’extérieur, contre la berge', 'Vers l’intérieur', 'Nulle part'], why: 'C’est le drossage. On garde l’intérieur du virage.' },
  { q: 'Qu’est-ce qu’une passoire?', a: ['Un arbre ou des branches où l’eau passe, mais pas toi', 'Un passage facile', 'Un outil pour écoper'], why: 'L’eau traverse les branches, mais un canot ou un nageur reste pris. On s’en éloigne tôt.' },
  { q: 'Qu’est-ce que la veine d’eau?', a: ['Là où l’eau coule le plus vite et le plus profond', 'Un petit ruisseau à côté', 'L’eau calme près de la rive'], why: 'La veine d’eau, c’est le cœur du courant : rapide et profond.' },
  { q: 'Quelles classes de rapides pour débuter?', a: ['R1 et R2, avec un adulte formé', 'R3 et R4', 'Toutes, si on est prudent'], why: 'On commence en R1 et R2, toujours avec un adulte formé. R4 et plus, c’est pour les experts.' },
  // Sécurité
  { q: 'Quand portes-tu ton VFI?', a: ['Toujours, attaché et ajusté', 'Seulement dans les gros rapides', 'Quand il fait chaud'], why: 'Le VFI se porte tout le temps sur l’eau, bien attaché et ajusté.' },
  { q: 'Dans la position de sécurité, tes pieds sont…', a: ['En surface, pointés vers l’aval', 'Au fond, pour marcher', 'Pointés vers l’amont'], why: 'Sur le dos, pieds devant vers l’aval : tes pieds amortissent les roches.' },
  { q: 'Quand utilises-tu la nage active?', a: ['Pour rejoindre un contre-courant ou fuir une passoire', 'Pour te reposer', 'Jamais en rivière'], why: 'Sur le ventre, à fond : c’est pour aller vite vers un endroit sûr.' },
  { q: 'Que veut dire le mot « repérage »?', a: ['Marcher sur la berge pour regarder le rapide avant', 'Compter les canots', 'Chercher sa pagaie'], why: 'On s’arrête et on observe le rapide depuis la berge avant de le descendre.' },
  { q: 'Tu hésites devant un rapide. Que fais-tu?', a: ['Je portage', 'Je fonce', 'Je ferme les yeux'], why: 'Dans le doute, on portage. C’est toujours un bon choix.' },
  { q: 'Combien d’embarcations, au minimum, pour une sortie en eau vive?', a: ['Trois', 'Une', 'Deux'], why: 'On ne pagaie jamais seul : au moins trois embarcations, avec un adulte formé.' },
  { q: 'Que signifient trois longs coups de sifflet?', a: ['Urgence', 'Tout va bien', 'C’est l’heure de manger'], why: 'Trois longs coups de sifflet, en agitant la pagaie ou les bras, veulent dire : urgence.' },
  { q: 'Que fais-tu avec la corde d’un sac à corde?', a: ['Je la tiens, sans l’enrouler autour de ma main', 'Je l’attache à ma taille', 'Je l’enroule autour de ma main'], why: 'On ne s’attache jamais à une corde et on ne l’enroule jamais autour de la main : on pourrait rester pris.' }
];

R.SCEN = [
  { q: 'Ton canot chavire en plein rapide. Que fais-tu?', a: ['Je me mets sur le dos, pieds en surface vers l’aval', 'Je me mets debout pour sortir', 'Je nage vers le fond'], why: 'La position de sécurité te protège : tes pieds amortissent les roches.' },
  { q: 'Tu nages dans le courant et tes pieds touchent le fond. Que fais-tu?', a: ['Je reste à plat et je nage jusqu’à l’eau calme', 'Je me lève pour marcher', 'Je pousse fort sur le fond'], why: 'Ton pied pourrait se coincer entre les roches. On ne se lève jamais dans le courant.' },
  { q: 'Un arbre tombé barre une partie de la rivière devant toi. Que fais-tu?', a: ['Je m’en éloigne tôt, vers le passage libre', 'Je passe entre les branches', 'J’attends d’être tout près pour décider'], why: 'Une passoire laisse passer l’eau, pas toi. Il faut s’en éloigner bien avant.' },
  { q: 'Tu entends un grondement et tu vois une ligne d’horizon sur l’eau. Que fais-tu?', a: ['Je m’arrête sur la berge et je fais un repérage', 'J’accélère pour voir', 'Je continue sans rien dire'], why: 'Ça peut être un seuil. On s’arrête et on regarde depuis la berge avant de décider.' },
  { q: 'Ton canot arrive de travers sur une roche. Que fais-tu?', a: ['Je gîte vers la roche', 'Je gîte vers l’amont', 'Je me lève dans le canot'], why: 'En gîtant vers la roche, l’eau passe sous le canot. Vers l’amont, l’eau entre et plaque le canot.' },
  { q: 'Ton ami est à l’eau. Tu es sur la berge avec un sac à corde. Que fais-tu?', a: ['Je crie « Corde! » et je lance pour que la corde tombe sur lui', 'Je saute à l’eau le rejoindre', 'J’attache la corde à ma taille et je lance'], why: 'On crie, on lance la corde sur le nageur et on se tient solidement, sans s’attacher.' },
  { q: 'Ton canot chaviré est plein d’eau. Où te places-tu?', a: ['En amont du canot', 'En aval du canot', 'Sous le canot'], why: 'Un canot plein d’eau peut coincer quelqu’un contre une roche. Reste en amont.' },
  { q: 'Au printemps, l’eau est très froide. Que fais-tu?', a: ['Je m’habille pour l’eau et j’apporte des vêtements secs dans un sac étanche', 'Je mets un jean et un chandail de coton', 'Je ne dis rien si j’ai froid'], why: 'L’eau froide épuise vite. Si tu as froid, sors de l’eau et dis-le à un adulte.' },
  { q: 'Ton cousin veut descendre la rivière seul avec toi, en un seul canot. Que réponds-tu?', a: ['Non : il faut au moins trois embarcations et un adulte formé', 'D’accord, à deux c’est assez', 'D’accord, si on va vite'], why: 'On ne pagaie jamais seul. En groupe, on peut s’entraider.' },
  { q: 'Après de grosses pluies, la rivière est très haute. Que fais-tu?', a: ['On reporte la sortie ou on demande à un adulte formé', 'On y va, ce sera plus amusant', 'On part seul pour aller plus vite'], why: 'Quand le débit monte, la rivière est plus rapide et charrie des débris.' },
  { q: 'Ton coéquipier en aval lève sa pagaie à l’horizontale au-dessus de sa tête. Que fais-tu?', a: ['Je m’arrête', 'Je descends tout de suite', 'Je passe à gauche'], why: 'La pagaie à l’horizontale au-dessus de la tête veut dire : arrêt.' },
  { q: 'Devant toi, il y a un petit barrage. Que fais-tu?', a: ['Je portage', 'Je passe par-dessus', 'Je vise le centre'], why: 'Au pied d’un barrage ou d’un seuil, le rappel peut retenir un canot et un nageur. On portage.' }
];

R.SIG = [
  { sig: 'stop', a: ['Arrêt', 'Voie libre', 'Urgence', 'Ça va'], why: 'La pagaie à l’horizontale au-dessus de la tête veut dire : arrête-toi.' },
  { sig: 'go', a: ['Voie libre', 'Arrêt', 'Passe à gauche', 'Urgence'], why: 'La pagaie à la verticale veut dire : la voie est libre, tu peux descendre.' },
  { sig: 'dir', a: ['Passe du côté montré', 'Danger du côté montré', 'Arrêt', 'Ça va'], why: 'La pagaie inclinée montre le passage sûr. On pointe toujours vers le passage, jamais vers le danger.' },
  { sig: 'help', a: ['Urgence', 'Voie libre', 'Ça va', 'Arrêt'], why: 'Trois longs coups de sifflet en agitant la pagaie ou les bras : quelqu’un a besoin d’aide.' },
  { sig: 'ok', a: ['« Ça va? » ou « ça va »', 'Urgence', 'Arrêt', 'Passe à droite'], why: 'Taper sur son casque, c’est demander « ça va? » ou répondre « ça va ».' }
];

R.EQUIP = [
  { n: 'VFI bien attaché', ok: true, why: 'Le VFI te garde à la surface. Il se porte toujours, attaché et ajusté.' },
  { n: 'Casque', ok: true, why: 'Le casque protège ta tête contre les roches.' },
  { n: 'Sifflet', ok: true, why: 'Le sifflet porte plus loin que ta voix. Trois longs coups : urgence.' },
  { n: 'Sac à corde', ok: true, why: 'Il sert à lancer une corde à quelqu’un qui nage dans le courant.' },
  { n: 'Pagaie de rechange', ok: true, why: 'Une pagaie peut se briser ou partir avec le courant. Sans pagaie, tu ne peux plus diriger le canot.' },
  { n: 'Écope et éponge', ok: true, why: 'Elles servent à vider l’eau qui entre dans le canot.' },
  { n: 'Trousse de premiers soins', ok: true, why: 'Pour soigner une coupure ou une égratignure sans attendre.' },
  { n: 'Vêtements chauds dans un sac étanche', ok: true, why: 'Des vêtements secs aident à se réchauffer après une baignade froide.' },
  { n: 'Eau et collation', ok: true, why: 'Pagayer demande de l’énergie. Il faut boire et manger.' },
  { n: 'Souliers fermés qui tiennent aux pieds', ok: true, why: 'Ils protègent tes pieds sur les roches et restent en place dans l’eau.' },
  { n: 'Bottes de pluie hautes', ok: false, why: 'Elles se remplissent d’eau et deviennent très lourdes si tu tombes.' },
  { n: 'Jean et chandail en coton', ok: false, why: 'Le coton mouillé est froid et lourd. Choisis des vêtements faits pour l’eau.' },
  { n: 'Gougounes', ok: false, why: 'Elles se perdent dans le courant et ne protègent pas tes pieds.' },
  { n: 'Écouteurs', ok: false, why: 'Tu dois entendre la rivière, les sifflets et tes coéquipiers.' },
  { n: 'Corde attachée à ta taille', ok: false, why: 'Une corde attachée à toi peut te faire rester coincé dans le courant.' }
];
})();
