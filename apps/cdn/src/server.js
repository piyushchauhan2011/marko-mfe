const http = require('node:http');

const PORT = Number(process.env.PORT || 3200);

const ASSET_LIBRARY = {
  'navigation.css': `
    .navigation-fragment { display: block; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(223,246,239,0.75)); border: 1px solid rgba(13,107,95,.1); border-radius: 24px; box-shadow: 0 14px 30px rgba(17,62,58,.08); }
    .brand { font-size: clamp(1.4rem, 2vw, 1.7rem); font-weight: 900; letter-spacing: -.08em; color: #0a4d44; }
    .nav-links { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; }
    .nav-link { color: #5f696f; text-decoration: none; font-weight: 700; }
    .nav-link.active { color: #0d6b5f; }
  `,
  'navigation.js': `window.__harborstayCdnNav = true;`,
  'search.css': `
    .search-panel { display: block; }
    .search-head { display: flex; justify-content: space-between; align-items: center; }
    .search-bar { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; background: #f7f3ee; border: 1px solid rgba(23,35,40,.1); border-radius: 18px; padding: 14px 16px; }
    .hotel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    .hotel-card { background: #fffdfb; border: 1px solid rgba(23,35,40,.08); border-radius: 18px; padding: 18px; }
    .hotel-card.selected { border-color: rgba(13,107,95,.42); box-shadow: 0 16px 30px rgba(13,107,95,.08); }
    .hotel-body { display: flex; flex-direction: column; gap: 10px; }
    .hotel-thumb { min-height: 110px; border-radius: 16px; background: linear-gradient(135deg,#dfe9e6,#c9d9d5); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #0a4d44; }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .pill { display: inline-flex; border-radius: 999px; padding: 7px 10px; background: rgba(21,91,71,0.08); color: #0d6b5f; font-size: .74rem; font-weight: 700; }
    .primary-button, .ghost-button { border: none; border-radius: 999px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
    .primary-button { background: #0d6b5f; color: white; }
    .ghost-button { background: transparent; border: 1px solid rgba(23,35,40,.08); color: #172328; }
  `,
  'search.js': `window.__harborstayCdnSearch = true;`,
  'details.css': `
    .details-panel { display: block; }
    .details-panel .location { color: #5f696f; }
    .details-grid { display: flex; justify-content: space-between; align-items: end; gap: 16px; }
    .feature-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px; }
    .feature-list li { background: rgba(97,86,164,.08); color: #6156a4; padding: 8px 12px; border-radius: 999px; font-weight: 600; }
    .booking-card { background: #fffdfb; border: 1px solid rgba(23,35,40,.08); border-radius: 18px; padding: 18px; }
    .primary-button { background: #0d6b5f; color: white; border-radius: 999px; padding: 14px 20px; border: none; }
  `,
  'details.js': `window.__harborstayCdnDetails = true;`,
  'reviews.css': `
    .reviews-panel { display: block; }
    .reviews-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 18px; }
    .review-card { background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,243,238,0.92)); border: 1px solid rgba(22,44,48,0.09); border-radius: 18px; padding: 18px; }
    .review-head { display: flex; justify-content: space-between; align-items: center; }
  `,
  'reviews.js': `window.__harborstayCdnReviews = true;`,
  'recommendations.css': `
    .recommendations-panel { display: block; }
    .recommendation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 18px; }
    .recommendation-card { background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,243,238,0.92)); border: 1px solid rgba(22,44,48,0.09); border-radius: 18px; padding: 18px; }
    .recommendation-footer { display: flex; align-items: center; justify-content: space-between; }
  `,
  'recommendations.js': `window.__harborstayCdnRecommendations = true;`,
  'brand-mark.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#dff6ef"/><path d="M60 18 76 52 112 60 76 68 60 102 44 68 8 60 44 52 60 18z" fill="#0d6b5f"/></svg>`,
};

const MIME_TYPES = {
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  svg: 'image/svg+xml; charset=utf-8',
};

function getManifest() {
  return {
    name: 'cdn',
    version: 'harborstay-cdn/v1',
    baseUrl: `http://localhost:${PORT}`,
    assets: {
      css: Object.keys(ASSET_LIBRARY).filter((name) => name.endsWith('.css')).map((name) => `/assets/${name}`),
      js: Object.keys(ASSET_LIBRARY).filter((name) => name.endsWith('.js')).map((name) => `/assets/${name}`),
      images: Object.keys(ASSET_LIBRARY).filter((name) => name.endsWith('.svg')).map((name) => `/assets/${name}`),
    },
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
    const assetBody = ASSET_LIBRARY[assetName];

    if (!assetBody) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `Asset not found: ${assetName}` }));
      return;
    }

    const extension = assetName.split('.').pop();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(assetBody);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify({ ok: true, message: 'HarborStay CDN active', manifest: getManifest() }));
}).listen(PORT, () => {
  console.log(`HarborStay CDN running on http://localhost:${PORT}`);
});
