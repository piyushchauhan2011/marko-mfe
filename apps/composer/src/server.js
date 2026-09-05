const Fastify = require('fastify');
const { Readable } = require('node:stream');
const { getHotelById } = require('@marko-mfe/mock-data');

const PORT = Number(process.env.PORT || 3100);
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'http://localhost:3200';
const FRAGMENTS = {
  navigation: 'http://localhost:3101',
  search: 'http://localhost:3102',
  details: 'http://localhost:3103',
  reviews: 'http://localhost:3104',
  recommendations: 'http://localhost:3105',
};

const bookings = new Map();
const STREAM_DELAY_MS = 420;
const FRAGMENT_STREAM_DELAY_MS = {
  search: 160,
  details: 540,
  reviews: 860,
  recommendations: 300,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function renderFragment(key, hotelId = 'harbor-view') {
  const url = FRAGMENTS[key];
  if (!url) {
    throw new Error(`Unknown fragment: ${key}`);
  }

  const response = await fetch(`${url}?hotelId=${encodeURIComponent(hotelId)}`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Fragment ${key} failed with status ${response.status}`);
  }

  const html = await response.text();

  return {
    html,
    cssUrls: [],
    jsUrls: [],
    cssUrl: '',
    jsUrl: '',
  };
}

function createFragmentContainer(fragmentName, hotelId) {
  return `<div class="fragment" data-fragment="${fragmentName}" data-hotel-id="${hotelId}"><!-- fragment:${fragmentName} --></div>`;
}

function buildPage(hotelId, fragments) {
  const selectedHotel = getHotelById(hotelId);

  const page = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>HarborStay Booking</title>
      <style>
        :root {
         --bg: #f5efe7;
         --bg-deep: #eef4f2;
         --panel: rgba(255, 255, 255, 0.8);
         --card: #fffdfb;
         --primary: #0d6b5f;
         --primary-strong: #0a4d44;
         --primary-soft: #dff6ef;
         --accent: #ff8f5a;
         --accent-deep: #e66d3c;
         --purple: #6156a4;
         --text: #172328;
         --muted: #5f696f;
         --line: rgba(22, 44, 48, 0.09);
         --shadow: 0 24px 60px rgba(17, 62, 58, 0.13);
         --loading: linear-gradient(90deg, rgba(13, 107, 95, 0.09), rgba(255, 143, 90, 0.09), rgba(13, 107, 95, 0.09));
       }

       * { box-sizing: border-box; }
       html, body { margin: 0; }
       body {
         background:
           radial-gradient(circle at top right, rgba(255, 143, 90, 0.18), transparent 24%),
           radial-gradient(circle at top left, rgba(13, 107, 95, 0.14), transparent 28%),
           linear-gradient(180deg, #f8f5f0 0%, #f1e9df 100%);
         color: var(--text);
         font-family: Inter, "Segoe UI", sans-serif;
       }

       .page-shell {
         max-width: 1220px;
         margin: 0 auto;
         padding: 28px 18px 56px;
       }

       .topbar,
       .panel,
       .booking-panel {
         background: rgba(255, 255, 255, 0.78);
         border: 1px solid var(--line);
         border-radius: 24px;
         box-shadow: var(--shadow);
         backdrop-filter: blur(10px);
       }

       .topbar {
         display: flex;
         align-items: center;
         justify-content: space-between;
         padding: 16px 22px;
         margin-bottom: 24px;
         gap: 18px;
         background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(223, 246, 239, 0.72));
         border-color: rgba(13, 107, 95, 0.12);
       }

       .brand {
         font-size: clamp(1.5rem, 2vw, 1.9rem);
         font-weight: 900;
         letter-spacing: -0.08em;
         color: var(--primary-strong);
         display: flex;
         align-items: center;
         gap: 10px;
       }

       .brand::before {
         content: "✦";
         display: inline-flex;
         align-items: center;
         justify-content: center;
         width: 32px;
         height: 32px;
         background: linear-gradient(135deg, var(--accent), var(--accent-deep));
         border-radius: 10px;
         color: white;
         font-size: 0.9rem;
         box-shadow: 0 12px 26px rgba(230, 109, 60, 0.35);
       }

       .nav-links {
         display: flex;
         gap: 18px;
         flex-wrap: wrap;
         align-items: center;
       }

       .nav-link {
         color: var(--muted);
         text-decoration: none;
         font-weight: 700;
         transition: color 0.2s ease;
       }

       .nav-link:hover,
       .nav-link.active {
         color: var(--primary);
       }

       .layout {
         display: grid;
         grid-template-columns: minmax(0, 2.5fr) minmax(260px, 0.9fr);
         gap: 22px;
         align-items: start;
       }

       .main-column,
       .side-column {
         display: flex;
         flex-direction: column;
         gap: 22px;
       }

       .panel {
         padding: 30px 26px;
       }

       .booking-panel {
         padding: 22px 20px;
         position: sticky;
         top: 24px;
       }

       .fragment {
         display: block;
         margin-bottom: 0;
       }

       .search-panel,
       .details-panel,
       .reviews-panel,
       .recommendations-panel {
         overflow: hidden;
       }

       .search-head,
       .section-heading,
       .card-header,
       .card-footer,
       .review-head,
       .recommendation-footer,
       .booking-price,
       .details-grid,
       .meta-row,
       .summary-row {
         display: flex;
         align-items: center;
         justify-content: space-between;
         gap: 14px;
       }

       .search-panel .search-head {
         margin-bottom: 6px;
       }

       .search-bar {
         display: grid;
         grid-template-columns: repeat(3, minmax(0, 1fr));
         gap: 12px;
         background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(223,246,239,0.66));
         border-radius: 18px;
         margin: 20px 0 24px;
         padding: 14px 18px;
         border: 1px solid rgba(13, 107, 95, 0.12);
         box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
       }

       .search-bar span {
         color: var(--muted);
         font-weight: 600;
       }

       .hotel-grid,
       .recommendation-grid,
       .reviews-list {
         display: grid;
         gap: 18px;
       }

       .hotel-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
       .recommendation-grid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
       .reviews-list { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }

       .hotel-card,
       .recommendation-card,
       .review-card {
         background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,243,238,0.92));
         border: 1px solid var(--line);
         border-radius: 18px;
         padding: 18px;
         transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
         position: relative;
         overflow: hidden;
       }

       .hotel-card::before,
       .recommendation-card::before,
       .review-card::before {
         content: "";
         position: absolute;
         inset: 0 auto auto 0;
         width: 100%;
         height: 3px;
         background: linear-gradient(90deg, var(--primary), var(--accent));
         opacity: 0;
         transition: opacity 0.18s ease;
       }

       .hotel-card:hover,
       .recommendation-card:hover,
       .review-card:hover {
         transform: translateY(-2px);
         box-shadow: 0 18px 38px rgba(17, 62, 58, 0.08);
       }

       .hotel-card:hover::before,
       .recommendation-card:hover::before,
       .review-card:hover::before {
         opacity: 1;
       }

       .hotel-card.selected,
       .recommendation-card.selected {
         border-color: rgba(13, 107, 95, 0.5);
         box-shadow: 0 18px 32px rgba(13, 107, 95, 0.09);
       }

       .hotel-thumb {
         display: flex;
         align-items: center;
         justify-content: center;
         min-height: 110px;
         border-radius: 16px;
         background: linear-gradient(135deg, #dfe9e6, #c9d9d5);
         font-weight: 700;
         color: var(--primary-strong);
         margin-bottom: 14px;
       }

       .hotel-body,
       .recommendation-card,
       .review-card {
         display: flex;
         flex-direction: column;
         gap: 12px;
       }

       .hotel-card .location,
       .recommendation-card p,
       .review-card p,
       .booking-panel .location,
       .details-panel .location {
         margin: 0;
       }

       .eyebrow {
         text-transform: uppercase;
         letter-spacing: 0.08em;
         color: var(--muted);
         font-size: 0.72rem;
         font-weight: 700;
       }

       .location, .description, .text-muted {
         color: var(--muted);
       }

       .description {
         margin-top: 10px;
         line-height: 1.6;
       }

       .meta-row {
         justify-content: flex-start;
         margin-bottom: 16px;
       }

       .pill {
         border-radius: 999px;
         background: rgba(21, 91, 71, 0.08);
         color: var(--primary);
         padding: 8px 12px;
         font-size: 0.8rem;
         font-weight: 700;
       }

       .details-grid {
         align-items: end;
         margin-bottom: 18px;
       }

       .feature-list {
         list-style: none;
         padding: 0;
         margin: 0;
         display: flex;
         flex-wrap: wrap;
         gap: 10px;
       }

       .feature-list li {
         padding: 8px 12px;
         background: rgba(97, 86, 164, 0.08);
         border-radius: 999px;
         color: var(--purple);
         font-weight: 600;
       }

       .booking-card {
         min-width: 220px;
         background: var(--card);
         border: 1px solid var(--line);
         border-radius: 18px;
         padding: 18px;
       }

       .booking-price strong {
         font-size: 2rem;
       }

       .review-card {
         min-height: 150px;
       }

       .review-head {
         margin-bottom: 10px;
       }

       .primary-button,
       .ghost-button,
       .select-room {
         border-radius: 999px;
         border: none;
         font-weight: 700;
         cursor: pointer;
         transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
       }

       .primary-button {
         background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
         color: white;
         padding: 14px 20px;
         box-shadow: 0 12px 20px rgba(21, 91, 71, 0.18);
       }

       .ghost-button,
       .select-room {
         background: transparent;
         border: 1px solid var(--line);
         padding: 10px 18px;
         color: var(--text);
       }

       .primary-button:hover,
       .ghost-button:hover,
       .select-room:hover {
         transform: translateY(-1px);
       }

       .booking-panel h3,
       .details-panel h2,
       .search-panel h2,
       .reviews-panel h2,
       .recommendations-panel h2,
       .hotel-card h3,
       .recommendation-card h3,
       .review-card strong {
         margin: 0;
       }

       .booking-summary {
         display: flex;
         flex-direction: column;
         gap: 12px;
         margin-top: 18px;
       }

       .summary-row {
         justify-content: space-between;
       }

       .summary-row strong {
         font-size: 1.1rem;
       }

       .loading-fragment {
         min-height: 160px;
         border-radius: 18px;
         border: 1px solid var(--line);
         background: rgba(255,255,255,0.5);
         position: relative;
         overflow: hidden;
       }

       .loading-fragment::before {
         content: "";
         position: absolute;
         inset: 0;
         background: var(--loading);
         background-size: 200% 100%;
         animation: pulse 1.4s linear infinite;
       }

       @keyframes pulse {
         0% { background-position: 200% 0; }
         100% { background-position: -200% 0; }
       }

       .fragment-error {
         color: #9b1c1c;
         font-weight: 600;
         padding: 18px;
       }

       @media (max-width: 900px) {
         .layout {
           grid-template-columns: 1fr;
         }

         .booking-panel {
           position: static;
         }
       }

       @media (max-width: 640px) {
         .page-shell {
           padding: 16px 12px 36px;
         }

         .topbar {
           flex-direction: column;
           align-items: flex-start;
         }

         .nav-links {
           width: 100%;
           justify-content: space-between;
           gap: 10px;
         }

         .panel {
           padding: 20px 18px;
         }

         .search-bar {
           grid-template-columns: 1fr;
         }

         .hotel-grid,
         .recommendation-grid,
         .reviews-list {
           grid-template-columns: 1fr;
         }

         .details-grid {
           flex-direction: column;
           align-items: stretch;
         }

         .booking-card {
           width: 100%;
           min-width: 0;
         }

         .primary-button,
         .ghost-button,
         .select-room {
           width: 100%;
           justify-content: center;
         }
       }

       .search-head,
       .section-heading,
       .card-header,
       .card-footer,
       .review-head,
       .recommendation-footer,
       .booking-price,
       .details-grid,
       .meta-row,
       .summary-row {
         display: flex;
         align-items: center;
         justify-content: space-between;
         gap: 14px;
       }

       .search-bar {
         display: grid;
         grid-template-columns: repeat(3, minmax(0, 1fr));
         gap: 12px;
         background: var(--card);
         border-radius: 18px;
         margin: 20px 0 24px;
         padding: 14px 18px;
       }

       .search-bar span {
         color: var(--muted);
       }

       .hotel-grid,
       .recommendation-grid,
       .reviews-list {
         display: grid;
         gap: 18px;
       }

       .hotel-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
       .recommendation-grid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
       .reviews-list { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }

       .hotel-card,
       .recommendation-card,
       .review-card {
         background: var(--card);
         border: 1px solid var(--line);
         border-radius: 18px;
         padding: 18px;
       }

       .hotel-card.selected,
       .recommendation-card.selected {
         border-color: rgba(21, 91, 71, 0.48);
         box-shadow: 0 14px 30px rgba(21, 91, 71, 0.08);
       }

       .hotel-thumb {
         display: flex;
         align-items: center;
         justify-content: center;
         min-height: 110px;
         border-radius: 16px;
         background: linear-gradient(135deg, #dfe9e6, #c9d9d5);
         font-weight: 700;
         color: var(--primary-strong);
         margin-bottom: 14px;
       }

       .eyebrow {
         text-transform: uppercase;
         letter-spacing: 0.08em;
         color: var(--muted);
         font-size: 0.72rem;
         font-weight: 700;
       }

       .location, .description, .text-muted {
         color: var(--muted);
       }

       .description {
         margin-top: 10px;
         line-height: 1.6;
       }

       .meta-row {
         justify-content: flex-start;
         margin-bottom: 16px;
       }

       .pill {
         border-radius: 999px;
         background: rgba(21, 91, 71, 0.08);
         color: var(--primary);
         padding: 8px 12px;
         font-size: 0.8rem;
         font-weight: 700;
       }

       .details-grid {
         align-items: end;
         margin-bottom: 18px;
       }

       .feature-list {
         list-style: none;
         padding: 0;
         margin: 0;
         display: flex;
         flex-wrap: wrap;
         gap: 10px;
       }

       .feature-list li {
         padding: 8px 12px;
         background: rgba(97, 86, 164, 0.08);
         border-radius: 999px;
         color: var(--purple);
         font-weight: 600;
       }

       .booking-card {
         min-width: 220px;
         background: var(--card);
         border: 1px solid var(--line);
         border-radius: 18px;
         padding: 18px;
       }

       .booking-price strong {
         font-size: 2rem;
       }

       .review-card {
         min-height: 150px;
       }

       .review-head {
         margin-bottom: 10px;
       }

       .primary-button,
       .ghost-button,
       .select-room {
         border-radius: 999px;
         border: none;
         font-weight: 700;
         cursor: pointer;
         transition: transform 0.18s ease, opacity 0.18s ease;
       }

       .primary-button {
         background: var(--primary);
         color: white;
         padding: 14px 20px;
       }

       .ghost-button,
       .select-room {
         background: transparent;
         border: 1px solid var(--line);
         padding: 10px 18px;
         color: var(--text);
       }

       .primary-button:hover,
       .ghost-button:hover,
       .select-room:hover {
         transform: translateY(-1px);
       }

       .booking-panel h3,
       .details-panel h2,
       .search-panel h2,
       .reviews-panel h2,
       .recommendations-panel h2,
       .hotel-card h3,
       .recommendation-card h3,
       .review-card strong {
         margin: 0;
       }

       .booking-summary {
         display: flex;
         flex-direction: column;
         gap: 12px;
         margin-top: 18px;
       }

       .summary-row {
         justify-content: space-between;
       }

       .summary-row strong {
         font-size: 1.1rem;
       }

       .loading-fragment {
         min-height: 160px;
         border-radius: 18px;
         border: 1px solid var(--line);
         background: rgba(255,255,255,0.5);
         position: relative;
         overflow: hidden;
       }

       .loading-fragment::before {
         content: "";
         position: absolute;
         inset: 0;
         background: var(--loading);
         background-size: 200% 100%;
         animation: pulse 1.4s linear infinite;
       }

       @keyframes pulse {
         0% { background-position: 200% 0; }
         100% { background-position: -200% 0; }
       }

       .fragment-error {
         color: #9b1c1c;
         font-weight: 600;
         padding: 18px;
       }
      </style>
    </head>
    <body data-hotel-id="${selectedHotel.id}">
      <div class="page-shell">
        <header class="topbar">
          <div class="brand">HarborStay</div>
          <nav aria-label="Main navigation" class="nav-links">
            <a class="nav-link active" href="/hotel/${selectedHotel.id}">Stays</a>
            <a class="nav-link" href="#">Experiences</a>
            <a class="nav-link" href="#">Flights</a>
            <a class="nav-link" href="#">Support</a>
          </nav>
        </header>

        <div class="layout">
          <main class="main-column">
            ${createFragmentContainer('search', selectedHotel.id).replace('<!-- fragment:search -->', fragments.search.html)}
            ${createFragmentContainer('details', selectedHotel.id).replace('<!-- fragment:details -->', fragments.details.html)}
            ${createFragmentContainer('reviews', selectedHotel.id).replace('<!-- fragment:reviews -->', fragments.reviews.html)}
            ${createFragmentContainer('recommendations', selectedHotel.id).replace('<!-- fragment:recommendations -->', fragments.recommendations.html)}
          </main>

          <aside class="side-column">
            <div class="booking-panel" aria-live="polite">
              <p class="eyebrow">Trip summary</p>
              <h3>${selectedHotel.name}</h3>
              <p class="location">${selectedHotel.location}</p>
              <div class="booking-summary">
                <div class="summary-row">
                  <span>Rate</span>
                  <strong>$${selectedHotel.price}</strong>
                </div>
                <div class="summary-row">
                  <span>Status</span>
                  <span>Ready to book</span>
                </div>
                <form method="POST" action="/booking/confirm/${selectedHotel.id}">
                  <button class="primary-button" type="submit" data-book-hotel="${selectedHotel.id}" data-book-price="${selectedHotel.price}">Book this stay</button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('[data-hotel-id]').forEach((element) => {
            if (element === document.body) return;
            element.addEventListener('click', (event) => {
              const target = event.target.closest('[data-hotel-id]');
              if (!target || !target.dataset.hotelId) return;
              const selectedId = target.dataset.hotelId;
              if (selectedId === document.body.dataset.hotelId) return;
              window.location.assign('/hotel/' + selectedId);
            });
          });

          document.querySelectorAll('[data-book-hotel]').forEach((button) => {
            button.addEventListener('click', (event) => {
              event.preventDefault();
              const hotelId = button.dataset.bookHotel || document.body.dataset.hotelId;
              window.location.assign('/booking/confirm/' + encodeURIComponent(hotelId));
            });
          });
        });
      </script>
    </body>
  </html>`;

  return page;
}

function buildConfirmationPage(hotelId) {
  const hotel = getHotelById(hotelId);
  const booking = bookings.get(hotelId) || {
    hotelId,
    reference: `HS-${Date.now().toString().slice(-6)}`,
  };

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Booking confirmed | HarborStay</title>
      <style>
        body { margin: 0; background: #f5efe6; font-family: Inter, Arial, sans-serif; color: #1b1b1e; }
        .wrap { max-width: 760px; margin: 80px auto; background: rgba(255,255,255,0.8); border: 1px solid rgba(27,27,30,0.1); border-radius: 24px; padding: 32px; box-shadow: 0 22px 68px rgba(21, 91, 71, 0.08); }
        .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; color: #5d5d63; font-size: 0.72rem; font-weight: 700; }
        h1 { margin: 8px 0 12px; font-size: 2.4rem; }
        .summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
        .card { background: #f8f4ee; border: 1px solid rgba(27,27,30,0.08); border-radius: 18px; padding: 18px; }
        .actions { display: flex; gap: 12px; margin-top: 28px; }
        .primary-button, .ghost-button {
          border-radius: 999px; border: none; font-weight: 700; cursor: pointer; padding: 12px 18px; text-decoration: none; display: inline-block;
        }
        .primary-button { background: #155b47; color: white; }
        .ghost-button { background: transparent; border: 1px solid rgba(27,27,30,0.1); color: #1b1b1e; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <p class="eyebrow">Booking confirmed</p>
        <h1>Your stay is reserved.</h1>
        <p>Your reservation for <strong>${hotel.name}</strong> has been prepared and is ready for check-in.</p>

        <div class="summary">
          <div class="card">
            <div class="eyebrow">Hotel</div>
            <strong>${hotel.name}</strong>
            <p>${hotel.location}</p>
          </div>
          <div class="card">
            <div class="eyebrow">Reference</div>
            <strong>${booking.reference}</strong>
            <p>Total: $${hotel.price}/night</p>
          </div>
        </div>

        <div class="actions">
          <a class="primary-button" href="/hotel/${hotel.id}">Back to stays</a>
          <a class="ghost-button" href="/">View all hotels</a>
        </div>
      </div>
    </body>
  </html>`;
}

async function safeRenderFragment(key, hotelId, delayMs = 0) {
  try {
    if (delayMs > 0) {
      await sleep(delayMs);
    }
    return await renderFragment(key, hotelId);
  } catch (error) {
    return {
      html: `<div class="fragment-error">${key} fragment is warming up.</div>`,
      cssUrl: '',
      jsUrl: '',
    };
  }
}

async function renderPage(hotelId) {
  const [search, details, reviews, recommendations] = await Promise.all([
    safeRenderFragment('search', hotelId, FRAGMENT_STREAM_DELAY_MS.search),
    safeRenderFragment('details', hotelId, FRAGMENT_STREAM_DELAY_MS.details),
    safeRenderFragment('reviews', hotelId, FRAGMENT_STREAM_DELAY_MS.reviews),
    safeRenderFragment('recommendations', hotelId, FRAGMENT_STREAM_DELAY_MS.recommendations),
  ]);

  return buildPage(hotelId, { search, details, reviews, recommendations });
}

async function* streamPage(hotelId) {
  const selectedHotel = getHotelById(hotelId);
  const fragmentOrder = ['search', 'details', 'reviews', 'recommendations'];
  const headPrefix = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>HarborStay Booking</title>
      <style>
        :root {
          --bg: #f5efe7;
          --bg-deep: #eef4f2;
          --panel: rgba(255, 255, 255, 0.8);
          --card: #fffdfb;
          --primary: #0d6b5f;
          --primary-strong: #0a4d44;
          --primary-soft: #dff6ef;
          --accent: #ff8f5a;
          --accent-deep: #e66d3c;
          --purple: #6156a4;
          --text: #172328;
          --muted: #5f696f;
          --line: rgba(22, 44, 48, 0.09);
          --shadow: 0 24px 60px rgba(17, 62, 58, 0.13);
        }

        * { box-sizing: border-box; }
        html, body { margin: 0; }
        body {
          background:
            radial-gradient(circle at top right, rgba(255, 143, 90, 0.18), transparent 24%),
            radial-gradient(circle at top left, rgba(13, 107, 95, 0.14), transparent 28%),
            linear-gradient(180deg, #f8f5f0 0%, #f1e9df 100%);
          color: var(--text);
          font-family: Inter, "Segoe UI", sans-serif;
        }

        .page-shell {
          max-width: 1220px;
          margin: 0 auto;
          padding: 28px 18px 56px;
        }

        .topbar,
        .panel,
        .booking-panel {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid var(--line);
          border-radius: 24px;
          box-shadow: var(--shadow);
          backdrop-filter: blur(10px);
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 22px;
          margin-bottom: 24px;
          gap: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(223, 246, 239, 0.72));
          border-color: rgba(13, 107, 95, 0.12);
        }

        .brand {
          font-size: clamp(1.5rem, 2vw, 1.9rem);
          font-weight: 900;
          letter-spacing: -0.08em;
          color: var(--primary-strong);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand::before {
          content: "✦";
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent), var(--accent-deep));
          border-radius: 10px;
          color: white;
          font-size: 0.9rem;
          box-shadow: 0 12px 26px rgba(230, 109, 60, 0.35);
        }

        .nav-links {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          align-items: center;
        }

        .nav-link {
          color: var(--muted);
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--primary);
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 2.5fr) minmax(260px, 0.9fr);
          gap: 22px;
          align-items: start;
        }

        .main-column,
        .side-column {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .panel {
          padding: 30px 26px;
        }

        .booking-panel {
          padding: 22px 20px;
          position: sticky;
          top: 24px;
        }

        .fragment {
          display: block;
          margin-bottom: 0;
        }

        .search-panel,
        .details-panel,
        .reviews-panel,
        .recommendations-panel {
          overflow: hidden;
        }

        .search-head,
        .section-heading,
        .card-header,
        .card-footer,
        .review-head,
        .recommendation-footer,
        .booking-price,
        .details-grid,
        .meta-row,
        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .search-bar {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(223,246,239,0.66));
          border-radius: 18px;
          margin: 20px 0 24px;
          padding: 14px 18px;
          border: 1px solid rgba(13, 107, 95, 0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }

        .search-bar span {
          color: var(--muted);
          font-weight: 600;
        }

        .hotel-grid,
        .recommendation-grid,
        .reviews-list {
          display: grid;
          gap: 18px;
        }

        .hotel-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
        .recommendation-grid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
        .reviews-list { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }

        .hotel-card,
        .recommendation-card,
        .review-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,243,238,0.92));
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          position: relative;
          overflow: hidden;
        }

        .hotel-card::before,
        .recommendation-card::before,
        .review-card::before {
          content: "";
          position: absolute;
          inset: 0 auto auto 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .hotel-card:hover,
        .recommendation-card:hover,
        .review-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 38px rgba(17, 62, 58, 0.08);
        }

        .hotel-card:hover::before,
        .recommendation-card:hover::before,
        .review-card:hover::before {
          opacity: 1;
        }

        .hotel-card.selected,
        .recommendation-card.selected {
          border-color: rgba(13, 107, 95, 0.5);
          box-shadow: 0 18px 32px rgba(13, 107, 95, 0.09);
        }

        .hotel-thumb {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 110px;
          border-radius: 16px;
          background: linear-gradient(135deg, #dfe9e6, #c9d9d5);
          font-weight: 700;
          color: var(--primary-strong);
          margin-bottom: 14px;
        }

        .hotel-body,
        .recommendation-card,
        .review-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .location, .description, .text-muted {
          color: var(--muted);
        }

        .description {
          margin-top: 10px;
          line-height: 1.6;
        }

        .meta-row {
          justify-content: flex-start;
          margin-bottom: 16px;
        }

        .pill {
          border-radius: 999px;
          background: rgba(21, 91, 71, 0.08);
          color: var(--primary);
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .details-grid {
          align-items: end;
          margin-bottom: 18px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .feature-list li {
          padding: 8px 12px;
          background: rgba(97, 86, 164, 0.08);
          border-radius: 999px;
          color: var(--purple);
          font-weight: 600;
        }

        .booking-card {
          min-width: 220px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
        }

        .booking-price strong {
          font-size: 2rem;
        }

        .review-card {
          min-height: 150px;
        }

        .review-head {
          margin-bottom: 10px;
        }

        .primary-button,
        .ghost-button,
        .select-room {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: none;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
          text-decoration: none;
        }

        .primary-button {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
          color: white;
          padding: 14px 20px;
          box-shadow: 0 12px 20px rgba(21, 91, 71, 0.18);
        }

        .ghost-button,
        .select-room {
          background: transparent;
          border: 1px solid var(--line);
          padding: 10px 18px;
          color: var(--text);
        }

        .primary-button:hover,
        .ghost-button:hover,
        .select-room:hover {
          transform: translateY(-1px);
        }

        .booking-panel h3,
        .details-panel h2,
        .search-panel h2,
        .reviews-panel h2,
        .recommendations-panel h2,
        .hotel-card h3,
        .recommendation-card h3,
        .review-card strong {
          margin: 0;
        }

        .booking-summary {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 18px;
        }

        .summary-row {
          justify-content: space-between;
        }

        .summary-row strong {
          font-size: 1.1rem;
        }

        .loading-fragment {
          min-height: 160px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.5);
          position: relative;
          overflow: hidden;
        }

        .loading-fragment::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(13, 107, 95, 0.09), rgba(255, 143, 90, 0.09), rgba(13, 107, 95, 0.09));
          background-size: 200% 100%;
          animation: pulse 1.4s linear infinite;
        }

        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .fragment-error {
          color: #9b1c1c;
          font-weight: 600;
          padding: 18px;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .booking-panel {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .page-shell {
            padding: 16px 12px 36px;
          }

          .topbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .nav-links {
            width: 100%;
            justify-content: space-between;
            gap: 10px;
          }

          .panel {
            padding: 20px 18px;
          }
        }
      </style>
    </head>
    <body data-hotel-id="${selectedHotel.id}">
      <div class="page-shell">
        <header class="topbar">
          <div class="brand">HarborStay</div>
          <nav aria-label="Main navigation" class="nav-links">
            <a class="nav-link active" href="/hotel/${selectedHotel.id}">Stays</a>
            <a class="nav-link" href="#">Experiences</a>
            <a class="nav-link" href="#">Flights</a>
            <a class="nav-link" href="#">Support</a>
          </nav>
        </header>
        <div class="layout">
          <main class="main-column">
`;

  yield headPrefix;

  const pending = new Map(
    fragmentOrder.map((name) => [name, safeRenderFragment(name, hotelId, FRAGMENT_STREAM_DELAY_MS[name])])
  );

  while (pending.size > 0) {
    const next = await Promise.race(
      [...pending.entries()].map(([name, promise]) =>
        promise.then((fragment) => ({ name, fragment }))
      )
    );

    pending.delete(next.name);
    yield next.fragment.html;
    await sleep(STREAM_DELAY_MS);
  }

  yield `
          </main>
          <aside class="side-column">
            <div class="booking-panel" aria-live="polite">
              <p class="eyebrow">Trip summary</p>
              <h3>${selectedHotel.name}</h3>
              <p class="location">${selectedHotel.location}</p>
              <div class="booking-summary">
                <div class="summary-row">
                  <span>Rate</span>
                  <strong>$${selectedHotel.price}</strong>
                </div>
                <div class="summary-row">
                  <span>Status</span>
                  <span>Ready to book</span>
                </div>
                <form method="POST" action="/booking/confirm/${selectedHotel.id}">
                  <button class="primary-button" type="submit" data-book-hotel="${selectedHotel.id}" data-book-price="${selectedHotel.price}">Book this stay</button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('[data-hotel-id]').forEach((element) => {
            if (element === document.body) return;
            element.addEventListener('click', (event) => {
              const target = event.target.closest('[data-hotel-id]');
              if (!target || !target.dataset.hotelId) return;
              const selectedId = target.dataset.hotelId;
              if (selectedId === document.body.dataset.hotelId) return;
              window.location.assign('/hotel/' + selectedId);
            });
          });

          document.querySelectorAll('[data-book-hotel]').forEach((button) => {
            button.addEventListener('click', (event) => {
              event.preventDefault();
              const hotelId = button.dataset.bookHotel || document.body.dataset.hotelId;
              window.location.assign('/booking/confirm/' + encodeURIComponent(hotelId));
            });
          });
        });
      </script>
    </body>
  </html>`;
}

const app = Fastify({ logger: false });

app.get('/', async (request, reply) => {
  const hotel = getHotelById('harbor-view');
  reply.type('text/html; charset=utf-8');
  reply.header('x-ssr-stream', 'true');
  reply.header('x-fragment-protocol', 'harborstay-fragment/v1');
  return Readable.from(streamPage(hotel.id));
});

app.get('/hotel/:hotelId', async (request, reply) => {
  const hotelId = request.params.hotelId || 'harbor-view';
  const hotel = getHotelById(hotelId);
  reply.type('text/html; charset=utf-8');
  reply.header('x-ssr-stream', 'true');
  reply.header('x-fragment-protocol', 'harborstay-fragment/v1');
  return Readable.from(streamPage(hotel.id));
});

app.get('/booking/confirm/:hotelId', async (request, reply) => {
  const hotelId = request.params.hotelId || 'harbor-view';
  const page = buildConfirmationPage(hotelId);
  reply.type('text/html; charset=utf-8');
  return page;
});

app.post('/booking/confirm/:hotelId', async (request, reply) => {
  const hotelId = request.params.hotelId || 'harbor-view';
  const hotel = getHotelById(hotelId);
  const reference = `HS-${Date.now().toString().slice(-6)}`;
  bookings.set(hotelId, { hotelId, reference, createdAt: new Date().toISOString() });
  return reply.redirect(`/booking/confirm/${hotel.id}?confirmed=1`);
});

app.get('/health', async () => ({ ok: true, hotel: getHotelById('harbor-view').name }));

app.get('/assets/:assetName', async (request, reply) => {
  const assetName = request.params.assetName;
  const match = /^([a-z-]+)\.(css|js)$/.exec(assetName);

  if (!match) {
    reply.code(404);
    return { error: 'Unknown asset name' };
  }

  const [, fragmentName, fileType] = match;
  const fragmentBaseUrl = FRAGMENTS[fragmentName];

  if (!fragmentBaseUrl) {
    reply.code(404);
    return { error: `Unknown fragment asset: ${fragmentName}` };
  }

  const upstreamUrl = `${fragmentBaseUrl}/assets/${assetName}`;
  const upstreamResponse = await fetch(upstreamUrl);

  if (!upstreamResponse.ok) {
    reply.code(upstreamResponse.status || 502);
    return { error: `Asset fetch failed for ${fragmentName}` };
  }

  const contentType = fileType === 'css' ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
  const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

  reply.type(contentType);
  reply.header('Cache-Control', 'no-cache');
  return reply.send(buffer);
});

app.get('/fragment/:name', async (request, reply) => {
  const { name } = request.params;
  const hotelId = request.query.hotelId || 'harbor-view';

  if (!FRAGMENTS[name]) {
    reply.code(404);
    return reply.send({ error: `Unknown fragment: ${name}` });
  }

  try {
    const fragment = await renderFragment(name, hotelId);

    if (request.query.format === 'json' || (request.headers.accept || '').includes('application/json')) {
      reply.type('application/json; charset=utf-8');
      return reply.send({
        ok: true,
        name,
        hotelId,
        protocolVersion: 'harborstay-fragment/v1',
        generatedAt: new Date().toISOString(),
        html: fragment.html,
        css: [],
        js: [],
      });
    }

    reply.type('text/html; charset=utf-8');
    reply.header('x-fragment-name', name);
    reply.header('x-fragment-hotel-id', hotelId);
    reply.header('x-fragment-protocol', 'harborstay-fragment/v1');
    return reply.send(fragment.html);
  } catch (error) {
    reply.code(503);
    return reply.send({ error: error.message });
  }
});

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Composer shell running on http://localhost:${PORT}`);
});
