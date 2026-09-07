const { component } = require('riot');
const ItineraryTag = require('./itinerary.riot').default;

function getProps() {
  const source = document.getElementById('experiences-itinerary-fragment-data');
  if (!source || !source.textContent) {
    return null;
  }

  try {
    return JSON.parse(source.textContent);
  } catch (error) {
    console.error('Failed to parse experiences-itinerary fragment data.', error);
    return null;
  }
}

function mountItinerary() {
  const mountNode = document.getElementById('experiences-itinerary-root');
  if (!mountNode) return;

  const props = getProps();
  if (!props) return;

  mountNode.innerHTML = '';
  component(ItineraryTag)(mountNode, props);
}

mountItinerary();
