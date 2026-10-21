// Packs the static web export (`expo export -p web`) into one self-contained
// HTML page for hosting the demo as a claude.ai Artifact: the JS bundle is
// inlined and every asset (icon font, header icons) becomes a data: URI, so the
// page needs no other files and works under any URL path.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const OUT_DIR = 'dist-demo';
const OUT = join(OUT_DIR, 'kampus-yemekhane.html');

const MIME = { '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entry = html.match(/<script src="\/(_expo\/static\/js\/web\/entry-[^"]+\.js)"/)?.[1];
if (!entry) throw new Error('Entry bundle not found in dist/index.html. Run `npx expo export -p web` with asyncRoutes.web = false.');

let bundle = readFileSync(join(DIST, entry), 'utf8');

let inlined = 0;
bundle = bundle.replace(/"\/(assets\/[^"]+)"/g, (_, path) => {
  const mime = MIME[extname(path)];
  if (!mime) throw new Error(`No MIME type for ${path}`);
  inlined++;
  return JSON.stringify(`data:${mime};base64,${readFileSync(join(DIST, path)).toString('base64')}`);
});

// Keep the inline <script> from being closed or commented out by the bundle's own text.
bundle = bundle.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// The host serves the page under its own path; Expo Router resolves routes
// from location.pathname, so start the app at "/".
const boot = `try{if(location.pathname!=='/')history.replaceState(null,'','/')}catch(e){}`;

const page = `<title>Kampüs Yemekhane</title>
<style>
  :root { color-scheme: light; box-sizing: border-box; height: 100%; }
  html, body { height: 100%; }
  body { overflow: hidden; background: #F4F5F7; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<noscript>Bu uygulama için JavaScript gereklidir.</noscript>
<div id="root"></div>
<script>${boot}</script>
<script>${bundle}</script>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, page);
console.log(`${OUT}: ${(page.length / 1024 / 1024).toFixed(2)} MB, ${inlined} assets inlined`);

// The same page as a complete document, for any static host (Netlify Drop,
// GitHub Pages, a university web server): upload the `site` folder.
const SITE = join(OUT_DIR, 'site');
mkdirSync(SITE, { recursive: true });
writeFileSync(
  join(SITE, 'index.html'),
  `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F766E">
${page}</html>
`,
);
console.log(`${join(SITE, 'index.html')}: standalone copy for static hosting`);
