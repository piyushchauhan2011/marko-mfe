const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { getHotelById } = require('@marko-mfe/mock-data');

const port = Number(process.env.PORT || 3108);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const assetDir = path.join(__dirname, 'assets');
const css = fs.readFileSync(path.join(assetDir, 'experiences-itinerary.css'), 'utf8');
const bundlePath = path.resolve(__dirname, '../../cdn/public/assets/experiences-itinerary.js');
const manifest = {
  name: 'experiences-itinerary',
  version: 'harborstay-fragment/v1',
  assets: {
    css: [`${CDN_BASE_URL}/assets/experiences-itinerary.css`],
    js: [`${CDN_BASE_URL}/assets/experiences-itinerary.js`],
  },
};

function buildSchedule(hotel) {
  return {
    'Day 1': [
      { time: '09:00', title: 'Local breakfast', note: `Start close to ${hotel.name} with a neighborhood cafe.` },
      { time: '12:30', title: 'Walking route', note: `Explore the ${hotel.tag.toLowerCase()} district highlights.` },
      { time: '19:00', title: 'Dinner reservation', note: 'Chef-led tasting menu with local ingredients.' },
    ],
    'Day 2': [
      { time: '08:30', title: 'Scenic run', note: `Waterfront route around ${hotel.location}.` },
      { time: '13:00', title: 'Cultural stop', note: 'Museum and studio tour with flexible drop-in timing.' },
      { time: '20:00', title: 'Sunset lounge', note: 'Evening rooftop session and live acoustic set.' },
    ],
  };
}

function renderSsrMarkup(props) {
  const day = Object.keys(props.schedule)[0];
  const items = props.schedule[day]
    .map(
      (item) => `
      <li class="riot-itinerary-item">
        <span class="riot-itinerary-time">${item.time}</span>
        <div>
          <strong>${item.title}</strong>
          <p>${item.note}</p>
        </div>
      </li>
    `
    )
    .join('');

  return `<section class="riot-itinerary-panel" data-fragment-role="experiences-itinerary">
    <div class="riot-itinerary-header">
      <h2>Build your day plan</h2>
      <p>${props.hotelName}</p>
    </div>
    <div class="riot-day-switcher">
      <button type="button" class="riot-day-button is-active">Day 1</button>
      <button type="button" class="riot-day-button">Day 2</button>
    </div>
    <ul class="riot-itinerary-list">${items}</ul>
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

    if (requestUrl.pathname === '/assets/experiences-itinerary.css') {
      res.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(css);
      return;
    }

    if (requestUrl.pathname === '/assets/experiences-itinerary.js') {
      if (!fs.existsSync(bundlePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Experiences itinerary bundle not generated yet. Run experiences-itinerary build or dev watcher.');
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
      schedule: buildSchedule(hotel),
    };
    const html = renderSsrMarkup(props);

    res.writeHead(200, {
      'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Fragment-Name': 'experiences-itinerary',
      'X-Fragment-Hotel-Id': hotel.id,
      'X-Fragment-Protocol': 'harborstay-fragment/v1',
      'X-Fragment-Css': manifest.assets.css[0],
      'X-Fragment-Js': manifest.assets.js[0],
    });

    if (isJson) {
      res.end(
        JSON.stringify({
          ok: true,
          name: 'experiences-itinerary',
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
      `<link rel="stylesheet" href="${manifest.assets.css[0]}" /><script defer src="${manifest.assets.js[0]}"></script><script type="application/json" id="experiences-itinerary-fragment-data">${fragmentData}</script><div id="experiences-itinerary-root">${html}</div>`
    );
  })
  .listen(port, () => {
    console.log(`Experiences itinerary MFE running on http://localhost:${port}`);
  });
