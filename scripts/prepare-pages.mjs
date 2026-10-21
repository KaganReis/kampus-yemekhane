// Finishes the GitHub Pages build in dist-pages/:
// - 404.html: Pages has no SPA fallback, so a reload on /kampus-yemekhane/menu
//   gets the app shell and Expo Router renders the right screen.
// - .nojekyll: otherwise Jekyll drops the `_expo` folder (leading underscore).
import { copyFileSync, writeFileSync } from 'node:fs';

const DIR = 'dist-pages';
copyFileSync(`${DIR}/index.html`, `${DIR}/404.html`);
writeFileSync(`${DIR}/.nojekyll`, '');
console.log(`${DIR} ready for GitHub Pages`);
