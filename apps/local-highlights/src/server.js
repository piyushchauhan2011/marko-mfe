const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// esbuild-register lets Node require .jsx files at runtime without a separate compile step
require('esbuild-register/dist/node').register({ jsx: 'automatic' });

const { HighlightsView } = require('./HighlightsView.jsx');

const PORT = Number(process.env.PORT || 3106);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const assetDir = path.join(__dirname, 'assets');
const localHighlightsCss = fs.readFileSync(path.join(assetDir, 'local-highlights.css'), 'utf8');
const bundlePath = path.resolve(__dirname, '../../cdn/public/assets/local-highlights.js');

const fragmentManifest = {
  name: 'local-highlights',
  version: 'harborstay-fragment/v1',
  assets: {
    css: [`${CDN_BASE_URL}/assets/local-highlights.css`],
    js: [`${CDN_BASE_URL}/assets/local-highlights.js`],
  },
};

const assetTags = `
  <link rel="stylesheet" href="${fragmentManifest.assets.css[0]}" />
  <script defer src="${fragmentManifest.assets.js[0]}"></script>
`;

function renderHtml(hotelId = 'harbor-view') {
  return renderToStaticMarkup(React.createElement(HighlightsView, { hotelId, selectedIndex: 0 }));
}

http
  .createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/manifest') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(fragmentManifest));
      return;
    }

    if (requestUrl.pathname === '/assets/local-highlights.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(localHighlightsCss);
      return;
    }

    if (requestUrl.pathname === '/assets/local-highlights.js') {
      if (!fs.existsSync(bundlePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bundle not generated yet. Run the bundle watcher or build script.');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(fs.readFileSync(bundlePath, 'utf8'));
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const html = renderHtml(hotelId);

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'local-highlights',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': fragmentManifest.assets.css[0],
      'X-Fragment-Js': fragmentManifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'local-highlights',
          hotelId,
          protocolVersion: 'harborstay-fragment/v1',
          generatedAt: new Date().toISOString(),
          html,
        })
      );
      return;
    }

    res.end(`${assetTags}${html}`);
  })
  .listen(PORT, () => {
    console.log(`Local highlights React MFE running on http://localhost:${PORT}`);
  });
