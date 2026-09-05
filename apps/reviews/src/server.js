const http = require('node:http');
require('@marko/compiler/register');
const { getReviewsByHotel } = require('@marko-mfe/mock-data');
const template = require('./reviews.marko').default;

const port = Number(process.env.PORT || 3104);
const reviewsCss = `
  .reviews-panel { display:block; }
  .reviews-list { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:18px; }
  .review-card { background:#fffdfb; border:1px solid rgba(23,35,40,.08); border-radius:18px; padding:18px; }
  .review-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
`;
const reviewsJs = `window.__harborstayReviews = true;`;

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/assets/reviews.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(reviewsCss);
      return;
    }

    if (requestUrl.pathname === '/assets/reviews.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(reviewsJs);
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const reviews = getReviewsByHotel(hotelId);
    const html = await renderHtml({ reviews });

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'reviews',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': `http://localhost:${port}/assets/reviews.css`,
      'X-Fragment-Js': `http://localhost:${port}/assets/reviews.js`,
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'reviews',
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
    console.log(`Reviews MFE running on http://localhost:${port}`);
  });
