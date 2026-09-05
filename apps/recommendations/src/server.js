const http = require('node:http');
require('@marko/compiler/register');
const { getRecommendationsForHotel } = require('@marko-mfe/mock-data');
const template = require('./recommendations.marko').default;

const port = Number(process.env.PORT || 3105);
const recommendationsCss = `
  .recommendations-panel { display:block; }
  .recommendation-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:18px; }
  .recommendation-card { background:#fffdfb; border:1px solid rgba(23,35,40,.08); border-radius:18px; padding:18px; }
`;
const recommendationsJs = `window.__harborstayRecommendations = true;`;

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

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
      'X-Fragment-Css': `http://localhost:${port}/assets/recommendations.css`,
      'X-Fragment-Js': `http://localhost:${port}/assets/recommendations.js`,
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

    res.end(html);
  })
  .listen(port, () => {
    console.log(`Recommendations MFE running on http://localhost:${port}`);
  });
