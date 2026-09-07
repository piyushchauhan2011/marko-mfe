const React = require('react');
const { hydrateRoot } = require('react-dom/client');
const { HighlightsContent } = require('./HighlightsView.jsx');

function LocalHighlightsClient() {
  const root = document.getElementById('local-highlights-root');
  const hotelId = (root && root.dataset.hotelId) || 'harbor-view';
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  return (
    <HighlightsContent
      hotelId={hotelId}
      selectedIndex={selectedIndex}
      onSelect={setSelectedIndex}
    />
  );
}

const mountNode = document.getElementById('local-highlights-root');
if (mountNode) {
  hydrateRoot(mountNode, <LocalHighlightsClient />);
}
