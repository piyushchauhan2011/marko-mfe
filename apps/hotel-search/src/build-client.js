const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { compileFileSync } = require('@marko/compiler');

function buildClientBundle() {
  const appRoot = __dirname;
  const templatePath = path.join(appRoot, 'hotel-search.client.marko');
  const generatedDir = path.join(appRoot, '.generated');
  const generatedTemplatePath = path.join(generatedDir, 'hotel-search.client.dom.js');
  const outfile = path.resolve(appRoot, '../../cdn/public/assets/search.js');

  fs.mkdirSync(generatedDir, { recursive: true });
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  const compiledDom = compileFileSync(templatePath, {
    output: 'dom',
    modules: 'cjs',
  });
  fs.writeFileSync(generatedTemplatePath, compiledDom.code, 'utf8');

  esbuild.buildSync({
    entryPoints: [path.join(appRoot, 'client.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    minify: true,
    target: ['chrome100', 'firefox100', 'safari15'],
    outfile,
    globalName: 'HarborStaySearchClient',
    logLevel: 'silent',
  });

  console.log(`Synced search bundle to ${outfile}`);
  return outfile;
}

if (require.main === module) {
  buildClientBundle();
}

module.exports = { buildClientBundle };
