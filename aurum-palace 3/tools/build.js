// Bundles dev.html + css + js into one self-contained HTML file: node tools/build.js  ->  index.html (what GitHub Pages serves) and dist/aurum-palace.html
// Edit dev.html, css/ and js/, then run `npm run build`.
// Add --artifact for the fragment form used when publishing as a claude.ai Artifact.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), artifact = process.argv.includes('--artifact');
let html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="css\/style.css">/, () => '<style>\n' + fs.readFileSync(path.join(root, 'css/style.css'), 'utf8') + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, src) => {
  const f = path.join(root, src);
  if (!fs.existsSync(f)) { console.warn('skipping missing script', src); return ''; }
  return '<script>\n' + fs.readFileSync(f, 'utf8') + '\n</script>';
});
if (artifact) {
  html = html.replace(/<script>window\.THREE[^\n]*<\/script>\n?/, '');
  const title = '<title>Aurum Palace Casino</title>\n<meta name="claude:viewport-fit-sides" content="cover">';
  html = html.replace(/<!doctype html>[\s\S]*?<\/title>/i, title).replace(/<\/head>\s*<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, '').replace(/<meta name="viewport"[^>]*>\n?/, '');
  html = html.replace(/<meta charset="utf-8">\n?/, '').replace(/<html[^>]*>\n?/, '');
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', artifact ? 'aurum-palace.artifact.html' : 'aurum-palace.html');
fs.writeFileSync(out, html); if (!artifact) fs.writeFileSync(path.join(root, 'index.html'), html); console.log('wrote', out, (html.length / 1024).toFixed(0) + ' KB');
