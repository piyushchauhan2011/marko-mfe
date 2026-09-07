const React = require('react');
const { hydrateRoot } = require('react-dom/client');
const { HighlightsContent } = require('./HighlightsView');

function LocalHighlightsClient() {
  const root = document.getElementById('local-highlights-root');
  const hotelId = (root && root.dataset.hotelId) || 'harbor-view';
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  return React.createElement(HighlightsContent, {
    hotelId,
    selectedIndex,
    onSelect: setSelectedIndex,
  });
}

const mountNode = document.getElementById('local-highlights-root');
if (mountNode) {
  hydrateRoot(mountNode, React.createElement(LocalHighlightsClient));
}
