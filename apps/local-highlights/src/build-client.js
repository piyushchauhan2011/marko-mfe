const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

function buildClientBundle() {
  const appRoot = __dirname;
  const outfile = path.resolve(appRoot, '../../cdn/public/assets/local-highlights.js');
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  esbuild.buildSync({
    entryPoints: [path.join(appRoot, 'client.jsx')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    minify: true,
    jsx: 'automatic',
    target: ['chrome100', 'firefox100', 'safari15'],
    outfile,
    globalName: 'HarborStayLocalHighlights',
    logLevel: 'silent',
  });

  console.log(`Synced local-highlights bundle to ${outfile}`);
  return outfile;
}

if (require.main === module) {
  buildClientBundle();
}

module.exports = { buildClientBundle };
