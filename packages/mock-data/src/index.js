const hotels = [
  {
    id: 'harbor-view',
    name: 'Harbor View Lodge',
    location: 'Lisbon, Portugal',
    rating: 4.9,
    price: 245,
    currency: 'USD',
    tag: 'Oceanfront',
    description:
      'A boutique stay facing the Tagus River with sunrise terraces, quiet rooms, and a coast-inspired breakfast menu.',
    features: ['Sea-view breakfast', 'Fast Wi‑Fi', 'Bike rental', 'Airport transfer'],
    gallery: ['Harbor deck', 'Terrace lounge', 'Sunrise room'],
  },
  {
    id: 'copper-hill',
    name: 'Copper Hill Suites',
    location: 'Seville, Spain',
    rating: 4.8,
    price: 189,
    currency: 'USD',
    tag: 'Boutique',
    description:
      'Historic architecture, a courtyard pool, and cozy rooms designed for slow weekends and late dinners.',
    features: ['Pool access', 'On-site tapas bar', 'Late checkout', 'EV charging'],
    gallery: ['Courtyard patio', 'Pool deck', 'Lounge suite'],
  },
  {
    id: 'sunset-terrace',
    name: 'Sunset Terrace House',
    location: 'Barcelona, Spain',
    rating: 4.7,
    price: 221,
    currency: 'USD',
    tag: 'City Escape',
    description:
      'A rooftop retreat with lounge decks, city views, and walkable neighborhood access for stay-and-play weekends.',
    features: ['Rooftop deck', 'Morning coffee bar', 'Airport shuttle', 'Pet friendly'],
    gallery: ['Terrace sunset', 'Café lounge', 'Rooftop deck'],
  },
  {
    id: 'moss-lantern',
    name: 'Moss & Lantern',
    location: 'Copenhagen, Denmark',
    rating: 4.9,
    price: 268,
    currency: 'USD',
    tag: 'Garden Retreat',
    description:
      'A serene Scandinavian stay with private courtyard gardens, cedar saunas, and an easy route into the city by bike.',
    features: ['Private garden', 'Sauna access', 'Bike included', 'Breakfast basket'],
    gallery: ['Garden path', 'Sauna cabin', 'Courtyard breakfast'],
  },
];

const reviewsByHotelId = {
  'harbor-view': [
    { author: 'Maya R.', rating: 5, comment: 'The sunrise terrace made the trip feel special from day one.' },
    { author: 'Alex J.', rating: 5, comment: 'Quiet rooms, helpful staff, and an easy walk to the riverfront.' },
    { author: 'Nina S.', rating: 4, comment: 'Beautiful design. We loved the breakfast and the fast check-in.' },
  ],
  'copper-hill': [
    { author: 'Leah B.', rating: 5, comment: 'The courtyard felt like a hidden oasis in the middle of the city.' },
    { author: 'Tom W.', rating: 4, comment: 'Well-designed rooms and an excellent tapas bar nearby.' },
    { author: 'Sara N.', rating: 5, comment: 'Best neighborhood stay we have had in a long time.' },
  ],
  'sunset-terrace': [
    { author: 'Priya K.', rating: 5, comment: 'The rooftop view was unforgettable and the location was excellent.' },
    { author: 'Kevin D.', rating: 4, comment: 'Very polished and comfortable, especially for a city break.' },
    { author: 'Luca T.', rating: 5, comment: 'We booked again before leaving because we loved the atmosphere.' },
  ],
  'moss-lantern': [
    { author: 'Elsa B.', rating: 5, comment: 'The garden and sauna made it feel restorative from the moment we arrived.' },
    { author: 'Owen P.', rating: 5, comment: 'Thoughtful details throughout the room and a very kind host team.' },
    { author: 'Iman F.', rating: 4, comment: 'Perfect for a calm weekend, with easy bike access into town.' },
  ],
};

const recommendations = [
  {
    id: 'copper-hill',
    name: 'Copper Hill Suites',
    reason: 'Great for food lovers and a relaxed evening stroll.',
    price: 189,
  },
  {
    id: 'sunset-terrace',
    name: 'Sunset Terrace House',
    reason: 'Ideal if you want a rooftop stay and city views.',
    price: 221,
  },
  {
    id: 'moss-lantern',
    name: 'Moss & Lantern',
    reason: 'A quiet, design-led escape with garden and spa vibes.',
    price: 268,
  },
  {
    id: 'harbor-view',
    name: 'Harbor View Lodge',
    reason: 'A favorite for waterfront walks and calm mornings.',
    price: 245,
  },
];

function getHotelById(id = 'harbor-view') {
  return hotels.find((hotel) => hotel.id === id) || hotels[0];
}

function getFeaturedHotels() {
  return hotels;
}

function getReviewsByHotel(hotelId = 'harbor-view') {
  return reviewsByHotelId[hotelId] || reviewsByHotelId['harbor-view'];
}

function getRecommendationsForHotel(hotelId = 'harbor-view') {
  const selected = getHotelById(hotelId);
  const remaining = recommendations.filter((item) => item.id !== selected.id);
  return [
    { ...selected, reason: `A favorite stay for travelers seeking ${selected.tag.toLowerCase()} vibes.`, price: selected.price },
    ...remaining,
  ];
}

module.exports = {
  hotels,
  getHotelById,
  getFeaturedHotels,
  getReviewsByHotel,
  getRecommendationsForHotel,
};
