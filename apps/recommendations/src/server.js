const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('@marko/compiler/register');
const { getRecommendationsForHotel } = require('@marko-mfe/mock-data');
const template = require('./recommendations.marko').default;

const port = Number(process.env.PORT || 3105);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const assetDir = path.join(__dirname, 'assets');
const recommendationsCss = fs.readFileSync(path.join(assetDir, 'recommendations.css'), 'utf8');
const recommendationsJs = fs.readFileSync(path.join(assetDir, 'recommendations.js'), 'utf8');
const fragmentManifest = {
 name: 'recommendations',
 version: 'harborstay-fragment/v1',
 assets: {
   css: [`${CDN_BASE_URL}/assets/recommendations.css`],
   js: [`${CDN_BASE_URL}/assets/recommendations.js`],
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

    if (requestUrl.pathname === '/assets/recommendations.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(recommendationsCss);
      return;
    }

    if (requestUrl.pathname === '/assets/recommendations.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(recommendationsJs);
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const items = getRecommendationsForHotel(hotelId);
    const html = await renderHtml({ items });

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'recommendations',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': fragmentManifest.assets.css[0],
      'X-Fragment-Js': fragmentManifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'recommendations',
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
    console.log(`Recommendations MFE running on http://localhost:${port}`);
  });
