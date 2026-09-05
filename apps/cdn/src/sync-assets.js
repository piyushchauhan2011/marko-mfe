const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public', 'assets');

const assetLibrary = {
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
    .filter-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 16px 0 18px; }
    .filter-chip { appearance: none; background: rgba(13,107,95,0.06); color: var(--text, #172328); border: 1px solid rgba(13,107,95,0.12); border-radius: 999px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
    .filter-chip.is-active { background: linear-gradient(135deg, #0d6b5f, #0a4d44); color: white; box-shadow: 0 10px 20px rgba(13,107,95,0.2); }
    .hotel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; }
    .hotel-card { background: #fffdfb; border: 1px solid rgba(23,35,40,.08); border-radius: 18px; padding: 18px; transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; }
    .hotel-card.is-hidden { display: none; }
    .hotel-card.selected { border-color: rgba(13,107,95,.42); box-shadow: 0 16px 30px rgba(13,107,95,.08); }
    .hotel-body { display: flex; flex-direction: column; gap: 10px; }
    .hotel-thumb { min-height: 110px; border-radius: 16px; background: linear-gradient(135deg,#dfe9e6,#c9d9d5); display:flex; align-items:center; justify-content:center; font-weight:700; color:#0a4d44; }
    .card-header { display:flex; justify-content:space-between; align-items:center; }
    .pill { display:inline-flex; border-radius:999px; padding:7px 10px; background:rgba(21,91,71,0.08); color:#0d6b5f; font-size:.74rem; font-weight:700; }
    .primary-button, .ghost-button { border:none; border-radius:999px; padding:10px 16px; font-weight:700; cursor:pointer; }
    .primary-button { background:#0d6b5f; color:white; }
    .ghost-button { background:transparent; border:1px solid rgba(23,35,40,.08); color:#172328; }
  `,
  'search.js': `(function () {
    const root = document.currentScript && document.currentScript.closest('.search-fragment')
      ? document.currentScript.closest('.search-fragment')
      : document;
    const chips = Array.from(root.querySelectorAll('[data-filter]'));
    const cards = Array.from(root.querySelectorAll('.hotel-card'));

    if (!chips.length || !cards.length) {
      return;
    }

    const applyFilter = (filter) => {
      cards.forEach((card) => {
        const price = Number(card.dataset.price || 0);
        const rating = Number(card.dataset.rating || 0);
        const visible = filter === 'all' ||
          (filter === 'value' && price <= 220) ||
          (filter === 'luxury' && price >= 240) ||
          (filter === 'top-rated' && rating >= 4.8);
        card.classList.toggle('is-hidden', !visible);
      });
      chips.forEach((chip) => {
        chip.classList.toggle('is-active', chip.dataset.filter === filter);
      });
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => applyFilter(chip.dataset.filter || 'all'));
    });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-hotel-id]');
      if (!button || !button.dataset.hotelId) return;
      const card = button.closest('.hotel-card');
      if (!card) return;
      cards.forEach((item) => item.classList.toggle('selected', item === card));
    });
  })();`,
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

fs.mkdirSync(publicDir, { recursive: true });
for (const [fileName, fileContent] of Object.entries(assetLibrary)) {
  fs.writeFileSync(path.join(publicDir, fileName), fileContent, 'utf8');
}

console.log(`Simulated CDN copy complete: ${Object.keys(assetLibrary).length} assets in ${publicDir}`);
