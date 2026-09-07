const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getHotelById } = require('@marko-mfe/mock-data');

const port = Number(process.env.PORT || 3107);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const assetDir = path.join(__dirname, 'assets');
const css = fs.readFileSync(path.join(assetDir, 'experiences-discovery.css'), 'utf8');
const bundlePath = path.resolve(__dirname, '../../cdn/public/assets/experiences-discovery.js');
const manifest = {
  name: 'experiences-discovery',
  version: 'harborstay-fragment/v1',
  assets: {
    css: [`${CDN_BASE_URL}/assets/experiences-discovery.css`],
    js: [`${CDN_BASE_URL}/assets/experiences-discovery.js`],
  },
};

function buildExperiences(hotel) {
  return [
    {
      title: `Sunrise walk near ${hotel.name}`,
      category: 'Nature',
      description: `A 45-minute coastline route with easy stops and local coffee in ${hotel.location}.`,
    },
    {
      title: `${hotel.location} market tasting`,
      category: 'Food',
      description: 'Join a small-group tasting session featuring regional snacks and chef stories.',
    },
    {
      title: `${hotel.tag} district photo trail`,
      category: 'Culture',
      description: 'A guided neighborhood loop focused on architecture and local artists.',
    },
  ];
}

function renderSsrMarkup(props) {
  const cards = props.experiences
    .map(
      (item) => `
      <article class="riot-experience-card">
        <div class="riot-experience-meta">
          <strong>${item.title}</strong>
          <span class="riot-experience-tag">${item.category}</span>
        </div>
        <p>${item.description}</p>
      </article>
    `
    )
    .join('');

  return `<section class="riot-experiences-panel" data-fragment-role="experiences-discovery">
    <div class="riot-experiences-header">
      <h2>Explore nearby</h2>
      <p>${props.hotelName}</p>
    </div>
    <div class="riot-category-list">
      <button type="button" class="riot-category-button is-active">All</button>
      <button type="button" class="riot-category-button">Nature</button>
      <button type="button" class="riot-category-button">Food</button>
      <button type="button" class="riot-category-button">Culture</button>
    </div>
    <div class="riot-experience-grid">${cards}</div>
  </section>`;
}

function serializeFragmentData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

http
  .createServer((req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');

    if (requestUrl.pathname === '/manifest') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(manifest));
      return;
    }

    if (requestUrl.pathname === '/assets/experiences-discovery.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(css);
      return;
    }

    if (requestUrl.pathname === '/assets/experiences-discovery.js') {
      if (!fs.existsSync(bundlePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Experiences discovery bundle not generated yet. Run experiences-discovery build or dev watcher.');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(fs.readFileSync(bundlePath, 'utf8'));
      return;
    }

    const hotelId = requestUrl.searchParams.get('hotelId') || 'harbor-view';
    const isJson = requestUrl.searchParams.get('format') === 'json' || (req.headers.accept || '').includes('application/json');
    const hotel = getHotelById(hotelId);
    const props = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      experiences: buildExperiences(hotel),
    };
    const html = renderSsrMarkup(props);

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'experiences-discovery',
      'X-Fragment-Hotel-Id': hotel.id,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': manifest.assets.css[0],
      'X-Fragment-Js': manifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'experiences-discovery',
          hotelId: hotel.id,
          protocolVersion: 'harborstay-fragment/v1',
          generatedAt: new Date().toISOString(),
          html,
        })
      );
      return;
    }

    const fragmentData = serializeFragmentData(props);
    res.end(
      `<link rel="stylesheet" href="${manifest.assets.css[0]}" /><script defer src="${manifest.assets.js[0]}"></script><script type="application/json" id="experiences-discovery-fragment-data">${fragmentData}</script><div id="experiences-discovery-root">${html}</div>`
    );
  })
  .listen(port, () => {
    console.log(`Experiences discovery MFE running on http://localhost:${port}`);
  });
