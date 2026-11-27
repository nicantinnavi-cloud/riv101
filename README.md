# Riv101

Riv101 est un jeu éducatif web pour les 10 à 12 ans. On y apprend le canot d’eau vive : les coups d’aviron et leurs noms, la lecture des rapides (V aval, V amont, contre-courants, rouleaux, passoires, seuils) et la sécurité en rivière (équipement, signaux, sac à corde, nage en eau vive).

## Jouer

- Ouvre `index.html` dans un navigateur récent. Aucun serveur n’est nécessaire.
- Ou publie le dépôt sur GitHub Pages (branche et dossier racine) et ouvre l’adresse du site, sur ordinateur, tablette ou dans Edge sur Xbox.

La progression (étoiles, activités faites) est gardée dans le navigateur.

## Commandes

| Action | Clavier | Manette |
| --- | --- | --- |
| Propulsion, rétro | ↑ ↓ (ou W, S) | Stick gauche ou croix : haut, bas |
| Pivot à gauche, à droite | ← → | Stick gauche ou croix : gauche, droite |
| Déplacement latéral à gauche, à droite | Q, E | LB, RB ou stick droit |
| Gîte à gauche, à droite | A, D | LT, RT |
| Nage : posture de sécurité ou nage active | Espace | A |
| Pause | Échap ou P | Start |
| Menus | Tab, Entrée | Croix ou stick pour choisir, A pour valider, B pour revenir |
| Repérage, sac à corde | Souris : glisser, molette, clic | Réticule au stick gauche, A pour toucher ; en repérage, stick droit ou LB et RB pour longer la rivière, X pour passer |

Sur tablette, des boutons tactiles s’affichent pendant la descente. Le son se règle à l’accueil ou dans la pause : normal, doux ou coupé.

Le canot est un tandem : l’équipier avant avironne à gauche, l’équipier arrière à droite. Pour pivoter, les deux font un appel (ou un écart) ; pour glisser de côté, l’un fait un appel et l’autre un écart. La tête haute affiche ce que fait chaque équipier. Le canot a de l’erre : il continue sur sa lancée et met du temps à tourner, il faut anticiper. Pour éviter un obstacle, la manœuvre de base est le bac arrière : pointe avant vers l’aval, rétro, et la pointe arrière tournée vers le côté où l’on veut aller.

## Les rivières

Sept descentes, du ruisseau à la grande rivière. Chacune s’ouvre quand la précédente a au moins une étoile ; la première demande la leçon 2 de l’École de canot.

| Rivière | Classe | Largeur | Courant | Ce qu’on y apprend |
| --- | --- | --- | --- | --- |
| Ruisseau des Aulnes | R1 | 10 à 14 m | 1,5 à 2,3 m/s | Petit cours d’eau : tout arrive vite, on regarde loin et on s’arrête souvent. |
| Rivière aux Castors | R1 | 24 à 30 m | 1,5 à 2,3 m/s | V aval, V amont, premier contre-courant. |
| La Sinueuse | R2 | 18 à 24 m | 2,0 à 2,9 m/s | Jardin de roches en bac arrière, drossage dans les virages, passoires, arrêt à ne pas manquer. |
| La Gorge du Portageur | R2 | 12 à 30 m | 1,3 à 3,2 m/s | Le courant accélère quand la rivière se resserre. Deux canyons : on accoste avant pour les repérer à pied. Bac entre deux contre-courants. |
| Les Trois Sœurs | R2+ | 36 à 42 m | 2,3 à 3,2 m/s | Bac en plein rapide, rouleau, train de vagues, jardin de roches, gîte sans aide. |
| Le Seuil du Draveur | R3 | 22 à 44 m | 2,6 à 3,8 m/s (bassin calme avant le seuil) | Seuil, rappel et portage. Falaise sur la rive droite : le sentier est à gauche. |
| La Grande Descente | R3 | 26 à 50 m | 2,6 à 3,8 m/s (bassin calme avant le seuil) | Tout ensemble. Falaise sur la rive gauche : le sentier est à droite. |

Le canot avance à environ 2,7 m/s par rapport à l’eau. À partir de R2+, le courant le dépasse par endroits : on ne peut plus remonter ni tenir en place en pagayant. Il faut utiliser les contre-courants, le bac avec le bon angle et la bonne gîte, et le rétro pour gagner du temps. Un arrêt compte seulement si le canot est presque immobile dans le cercle.

Les leçons restent douces (courant de 1,3 à 2,4 m/s) : on y apprend un geste à la fois.

Les berges comptent : une falaise (paroi de roc grise) ne permet pas de sortir, même à la nage. On accoste et on portage sur une berge basse, du côté du sentier.

## Structure

- `src/core.js` : utilitaires, sauvegarde locale, sons.
- `src/river.js` : construction de la rivière et champ de courant.
- `src/sim.js` : physique du canot et du nageur, pilote automatique.
- `src/render.js` : rendu sur canvas (l’aval est en haut de l’écran).
- `src/levels.js` : leçons, rivières, atelier de corde et nage.
- `src/content.js` : lexique, quiz, signaux, mises en situation, équipement.
- `src/game.js` : contrôleur de jeu (tâches, repérage, sac à corde, entrées, manette).
- `src/ui.js` : écrans, dialogues et démarrage.
- `src/body.html`, `src/style.css` : corps de la page et styles.

## Construire

```
node build.mjs
```

Le script assemble `src/` en un seul fichier autonome, `index.html`. Il n’a aucune dépendance.

## Note importante

Le jeu est une introduction. Le contenu de sécurité doit être validé par un adulte formé, en s’appuyant sur des référentiels reconnus comme ceux de Canot Kayak Québec ou de Pagaie Canada. Rien ne remplace un cours encadré sur l’eau.
