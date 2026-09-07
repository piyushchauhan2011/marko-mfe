const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { compile } = require('@riotjs/compiler');

function riotPlugin() {
  return {
    name: 'riot',
    setup(build) {
      build.onLoad({ filter: /\.riot$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');
        const { code } = compile(source, { file: args.path });
        return { contents: code, loader: 'js' };
      });
    },
  };
}

async function buildClientBundle() {
  const appRoot = __dirname;
  const outfile = path.resolve(appRoot, '../../cdn/public/assets/experiences-discovery.js');
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(appRoot, 'client.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    minify: true,
    target: ['chrome100', 'firefox100', 'safari15'],
    outfile,
    globalName: 'HarborStayDiscoveryClient',
    logLevel: 'silent',
    plugins: [riotPlugin()],
  });

  console.log(`Synced experiences-discovery bundle to ${outfile}`);
  return outfile;
}

if (require.main === module) {
  buildClientBundle().catch((error) => {
    console.error('Failed to build experiences-discovery client bundle.', error);
    process.exit(1);
  });
}

module.exports = { buildClientBundle };
