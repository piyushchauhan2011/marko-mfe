const http = require('node:http');
require('@marko/compiler/register');
const { getReviewsByHotel } = require('@marko-mfe/mock-data');
const template = require('./reviews.marko').default;

const port = Number(process.env.PORT || 3104);

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');
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
