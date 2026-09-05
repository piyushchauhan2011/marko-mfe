const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3200);
const publicAssetsDir = path.resolve(__dirname, '..', 'public', 'assets');

const MIME_TYPES = {
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  svg: 'image/svg+xml; charset=utf-8',
};

function getManifest() {
  const files = fs.existsSync(publicAssetsDir) ? fs.readdirSync(publicAssetsDir) : [];
  const css = files.filter((name) => name.endsWith('.css')).map((name) => `/assets/${name}`);
  const js = files.filter((name) => name.endsWith('.js')).map((name) => `/assets/${name}`);
  const images = files.filter((name) => name.endsWith('.svg')).map((name) => `/assets/${name}`);

  return {
    name: 'cdn',
    version: 'harborstay-cdn/v1',
    baseUrl: `http://localhost:${PORT}`,
    assets: { css, js, images },
  };
}

http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (requestUrl.pathname === '/manifest') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify(getManifest()));
    return;
  }

  if (requestUrl.pathname.startsWith('/assets/')) {
    const assetName = requestUrl.pathname.replace(/^\/assets\//, '');
    const assetPath = path.join(publicAssetsDir, assetName);

    if (!fs.existsSync(assetPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `Asset not found: ${assetName}` }));
      return;
    }

    const fileBuffer = fs.readFileSync(assetPath);
    const extension = assetName.split('.').pop();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(fileBuffer);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify({ ok: true, message: 'HarborStay CDN active', manifest: getManifest() }));
}).listen(PORT, () => {
  console.log(`HarborStay CDN running on http://localhost:${PORT}`);
});
