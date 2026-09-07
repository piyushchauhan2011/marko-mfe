const http = require('node:http');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { HighlightsView } = require('./HighlightsView');

const PORT = Number(process.env.PORT || 3106);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';

const localHighlightsCss = `
  .highlights-panel { display: block; }
  .highlights-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
  .highlights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
  .highlight-card { background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,243,238,0.92)); border: 1px solid rgba(22,44,48,0.09); border-radius: 18px; padding: 18px; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
  .highlight-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(17, 62, 58, 0.08); }
  .highlight-card.is-selected { border-color: rgba(13, 107, 95, 0.5); box-shadow: 0 18px 32px rgba(13, 107, 95, 0.09); }
  .highlight-card .eyebrow { text-transform: uppercase; letter-spacing: .08em; color: #5f696f; font-size: 0.72rem; font-weight: 700; }
  .highlight-card h3 { margin: 8px 0 10px; font-size: 1.1rem; }
  .highlight-card p { margin: 0; color: #5f696f; line-height: 1.5; }
  .highlight-card .meta { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 0.8rem; font-weight: 700; color: #0d6b5f; }
`;

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
      const bundlePath = require('node:path').resolve(__dirname, '../../cdn/public/assets/local-highlights.js');
      const fs = require('node:fs');

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
