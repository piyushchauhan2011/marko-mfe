const http = require('node:http');
require('@marko/compiler/register');
const template = require('./navigation.marko').default;

const port = Number(process.env.PORT || 3101);
const navigationCss = `
  .navigation-fragment { display:block; }
  .topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 22px; background:linear-gradient(135deg, rgba(255,255,255,0.9), rgba(223,246,239,0.75)); border:1px solid rgba(13,107,95,.1); border-radius:24px; box-shadow:0 14px 30px rgba(17,62,58,.08); }
  .brand { font-size:clamp(1.4rem, 2vw, 1.7rem); font-weight:900; letter-spacing:-.08em; color:#0a4d44; }
  .nav-links { display:flex; gap:18px; flex-wrap:wrap; align-items:center; }
  .nav-link { color:#5f696f; text-decoration:none; font-weight:700; }
  .nav-link.active { color:#0d6b5f; }
`;
const navigationJs = `window.__harborstayNav = true;`;

function renderHtml(input) {
  return template.render(input).toString();
}

http
  .createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/assets/navigation.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(navigationCss);
      return;
    }

    if (requestUrl.pathname === '/assets/navigation.js') {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(navigationJs);
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const html = await renderHtml({ hotelId });

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'navigation',
      'X-Fragment-Hotel-Id': hotelId,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': `http://localhost:${port}/assets/navigation.css`,
      'X-Fragment-Js': `http://localhost:${port}/assets/navigation.js`,
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'navigation',
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
    console.log(`Navigation MFE running on http://localhost:${port}`);
  });
