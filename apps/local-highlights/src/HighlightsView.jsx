const React = require('react');
const { getHotelById } = require('@marko-mfe/mock-data');

function getHighlightsForHotel(hotelId) {
  const hotel = getHotelById(hotelId);
  const cityHighlights = {
    'harbor-view': [
      { label: 'Sunrise', title: 'River walk', description: 'Quiet promenade and coffee stops just minutes from your room.', time: '18 min' },
      { label: 'Food', title: 'Tasting trail', description: 'Fresh seafood and late-night pastries near the waterfront.', time: '12 min' },
      { label: 'Wellness', title: 'Terrace reset', description: 'A calm outdoor morning ritual before the city wakes up.', time: '25 min' },
    ],
    'copper-hill': [
      { label: 'Culture', title: 'Old town loop', description: 'Historic laneways, tiled courtyards, and a gentle evening stroll.', time: '20 min' },
      { label: 'Dining', title: 'Tapas evening', description: 'An easy neighborhood crawl with lively local favorites.', time: '14 min' },
      { label: 'Stay', title: 'Courtyard unwind', description: 'A sunlit pocket of calm between the city and your suite.', time: '9 min' },
    ],
    'sunset-terrace': [
      { label: 'Views', title: 'Rooftop sunset', description: 'Golden-hour panoramas across the city and the harbor.', time: '17 min' },
      { label: 'Nightlife', title: 'Side street finds', description: 'A lively strip of bars, cocktails, and late-night bites.', time: '11 min' },
      { label: 'Relax', title: 'Slow morning', description: 'Coffee, quiet corners, and a slower start to the day.', time: '15 min' },
    ],
    'moss-lantern': [
      { label: 'Nature', title: 'Garden loop', description: 'Bike-friendly routes and green spaces for a resting pace.', time: '24 min' },
      { label: 'Spa', title: 'Sauna ritual', description: 'A restorative reset with cedar warmth and a calm finish.', time: '30 min' },
      { label: 'Local', title: 'Harbor market', description: 'Fresh pastries, artisan goods, and easy neighborhood energy.', time: '19 min' },
    ],
  };

  return cityHighlights[hotel.id] || cityHighlights['harbor-view'];
}

function HighlightsContent({ hotelId = 'harbor-view', selectedIndex = 0, onSelect }) {
  const hotel = getHotelById(hotelId);
  const highlights = getHighlightsForHotel(hotelId);

  return (
    <section className="panel highlights-panel">
      <div className="highlights-header">
        <div>
          <p className="eyebrow">Local highlights</p>
          <h2>What to do in {hotel.location.split(',')[0]}</h2>
        </div>
      </div>
      <div className="highlights-grid">
        {highlights.map((item, index) => (
          <article
            key={item.title}
            className={`highlight-card${selectedIndex === index ? ' is-selected' : ''}`}
            onClick={onSelect ? () => onSelect(index) : undefined}
          >
            <div className="eyebrow">{item.label}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="meta">
              <span>{item.time}</span>
              <span>{selectedIndex === index ? 'Selected' : 'Plan'}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HighlightsView({ hotelId = 'harbor-view', selectedIndex = 0, onSelect }) {
  return (
    <div id="local-highlights-root" className="fragment local-highlights-fragment" data-hotel-id={hotelId}>
      <HighlightsContent hotelId={hotelId} selectedIndex={selectedIndex} onSelect={onSelect} />
    </div>
  );
}

module.exports = {
  HighlightsView,
  HighlightsContent,
  getHighlightsForHotel,
};
