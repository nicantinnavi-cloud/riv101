// Construit index.html, un document autonome, à partir de src/. Aucune dépendance.
// Usage : node build.mjs [sortie.html]   (par défaut : index.html à la racine)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = f => join(root, 'src', f);
const ORDER = ['core.js', 'river.js', 'sim.js', 'render.js', 'levels.js', 'content.js', 'game.js', 'ui.js'];

let js = '';
for (const f of ORDER) {
  if (!existsSync(src(f))) {
    console.warn('Avertissement : src/' + f + ' est absent. Le jeu est construit sans ce fichier.');
    continue;
  }
  js += '\n// ---- src/' + f + '\n' + readFileSync(src(f), 'utf8').replace(/\s+$/, '') + '\n';
}
// Une balise de fermeture de script dans le code couperait le document.
js = js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
if (/<\/script/i.test(js)) throw new Error('Le JavaScript contient encore une fermeture de script.');

const css = readFileSync(src('style.css'), 'utf8').trim();
const body = readFileSync(src('body.html'), 'utf8').trim();

const html = `<!doctype html>
<html lang="fr-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b2f3a">
<meta name="description" content="Riv101 : jeu éducatif de canot d’eau vive pour les 10 à 12 ans. Coups d’aviron, lecture de rapides et sécurité en rivière.">
<title>Riv101</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@400..800&display=swap">
<style>
${css}
</style>
</head>
<body data-view="menu">
${body}
<script>
${js}
</script>
</body>
</html>
`;
const out = process.argv[2] ? resolve(process.argv[2]) : join(root, 'index.html');
writeFileSync(out, html);
console.log(out + ' : ' + Math.round(html.length / 1024) + ' Ko');
