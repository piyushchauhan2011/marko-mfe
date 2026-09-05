const http = require('node:http');
require('@marko/compiler/register');
const { getHotelById } = require('@marko-mfe/mock-data');
const template = require('./hotel-details.marko').default;

const port = Number(process.env.PORT || 3103);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const detailsCss = `
  .details-panel { display:block; }
  .details-panel .location { color:#5f696f; }
  .details-grid { display:flex; justify-content:space-between; align-items:end; gap:16px; }
  .feature-list { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:10px; }
  .feature-list li { background:rgba(97,86,164,.08); color:#6156a4; padding:8px 12px; border-radius:999px; font-weight:600; }
  .booking-card { background:#fffdfb; border:1px solid rgba(23,35,40,.08); border-radius:18px; padding:18px; }
  .primary-button { background:#0d6b5f; color:white; border-radius:999px; padding:14px 20px; border:none; }
`;
const detailsJs = `window.__harborstayDetails = true;`;
const fragmentManifest = {
 name: 'details',
 version: 'harborstay-fragment/v1',
 assets: {
   css: [`${CDN_BASE_URL}/assets/details.css`],
   js: [`${CDN_BASE_URL}/assets/details.js`],
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

    if (requestUrl.pathname === '/assets/details.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(detailsCss);
      return;
    }

    if (requestUrl.pathname === '/assets/details.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(detailsJs);
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const hotel = getHotelById(hotelId);
    const html = await renderHtml({ hotel });

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'details',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': fragmentManifest.assets.css[0],
      'X-Fragment-Js': fragmentManifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'details',
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
    console.log(`Hotel details MFE running on http://localhost:${port}`);
  });
