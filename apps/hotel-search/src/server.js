const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('@marko/compiler/register');
const { getFeaturedHotels } = require('@marko-mfe/mock-data');
const template = require('./hotel-search.marko').default;

const port = Number(process.env.PORT || 3102);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const assetDir = path.join(__dirname, 'assets');
const searchCss = fs.readFileSync(path.join(assetDir, 'search.css'), 'utf8');
const searchJs = fs.readFileSync(path.join(assetDir, 'search.js'), 'utf8');
const fragmentManifest = {
 name: 'search',
 version: 'harborstay-fragment/v1',
 assets: {
   css: [`${CDN_BASE_URL}/assets/search.css`],
   js: [`${CDN_BASE_URL}/assets/search.js`],
 },
};
const assetTags = `
 <link rel="stylesheet" href="${fragmentManifest.assets.css[0]}" />
 <script defer src="${fragmentManifest.assets.js[0]}"></script>
`;

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/manifest') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(fragmentManifest));
      return;
    }

    if (requestUrl.pathname === '/assets/search.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(searchCss);
      return;
    }

    if (requestUrl.pathname === '/assets/search.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(searchJs);
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const hotels = getFeaturedHotels();
    const html = await renderHtml({ hotels, hotelId });

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'search',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': fragmentManifest.assets.css[0],
      'X-Fragment-Js': fragmentManifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'search',
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
  .listen(port, () => {
    console.log(`Hotel search MFE running on http://localhost:${port}`);
  });
