const http = require('node:http');
require('@marko/compiler/register');
const { getFeaturedHotels } = require('@marko-mfe/mock-data');
const template = require('./hotel-search.marko').default;

const port = Number(process.env.PORT || 3102);

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');
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
