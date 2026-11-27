# Riv101

Riv101 est un jeu éducatif web pour les 10 à 12 ans. On y apprend le canot d’eau vive : les coups de pagaie et leurs noms, la lecture des rapides (V aval, V amont, contre-courants, rouleaux, passoires, seuils) et la sécurité en rivière (équipement, signaux, sac à corde, nage en eau vive).

## Jouer

- Ouvre `index.html` dans un navigateur récent. Aucun serveur n’est nécessaire.
- Ou publie le dépôt sur GitHub Pages (branche et dossier racine) et ouvre l’adresse du site, sur ordinateur, tablette ou dans Edge sur Xbox.

La progression (étoiles, activités faites) est gardée dans le navigateur.

## Commandes

| Action | Clavier | Manette |
| --- | --- | --- |
| Propulsion, dénage | ↑ ↓ (ou W, S) | Stick gauche ou croix : haut, bas |
| Appel, écart | ← → | Stick gauche ou croix : gauche, droite |
| Gîte à gauche, à droite | A ou Q, D ou E | LB ou LT, RB ou RT |
| Nage : posture de sécurité ou nage active | Espace | A |
| Pause | Échap ou P | Start |
| Menus | Tab, Entrée | Croix ou stick pour choisir, A pour valider, B pour revenir |
| Repérage, sac à corde | Souris : glisser, molette, clic | Réticule au stick gauche, A pour toucher ; en repérage, stick droit ou LB et RB pour longer la rivière, X pour passer |

Sur tablette, des boutons tactiles s’affichent pendant la descente.

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
