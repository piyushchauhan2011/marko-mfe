const http = require('node:http');
require('@marko/compiler/register');
const { getFeaturedHotels } = require('@marko-mfe/mock-data');
const template = require('./hotel-search.marko').default;

const port = Number(process.env.PORT || 3102);
const searchCss = `
  .search-panel { display:block; }
  .search-head { display:flex; justify-content:space-between; align-items:center; }
  .search-bar { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; background:#f7f3ee; border:1px solid rgba(23,35,40,.1); border-radius:18px; padding:14px 16px; }
  .hotel-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:18px; }
  .hotel-card { background:#fffdfb; border:1px solid rgba(23,35,40,.08); border-radius:18px; padding:18px; }
  .hotel-card.selected { border-color:rgba(13,107,95,.42); box-shadow:0 16px 30px rgba(13,107,95,.08); }
  .hotel-body { display:flex; flex-direction:column; gap:10px; }
  .hotel-thumb { min-height:110px; border-radius:16px; background:linear-gradient(135deg,#dfe9e6,#c9d9d5); display:flex; align-items:center; justify-content:center; font-weight:700; color:#0a4d44; }
  .card-header { display:flex; justify-content:space-between; align-items:center; }
  .pill { display:inline-flex; border-radius:999px; padding:7px 10px; background:rgba(21,91,71,0.08); color:#0d6b5f; font-size:.74rem; font-weight:700; }
  .primary-button, .ghost-button { border:none; border-radius:999px; padding:10px 16px; font-weight:700; cursor:pointer; }
  .primary-button { background:#0d6b5f; color:white; }
  .ghost-button { background:transparent; border:1px solid rgba(23,35,40,.08); color:#172328; }
`;
const searchJs = `window.__harborstaySearch = true;`;
const fragmentManifest = {
 name: 'search',
 version: 'harborstay-fragment/v1',
 assets: {
   css: ['/assets/search.css'],
   js: ['/assets/search.js'],
 },
};

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
      'X-Fragment-Css': `http://localhost:${port}/assets/search.css`,
      'X-Fragment-Js': `http://localhost:${port}/assets/search.js`,
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

    res.end(html);
  })
  .listen(port, () => {
    console.log(`Hotel search MFE running on http://localhost:${port}`);
  });
