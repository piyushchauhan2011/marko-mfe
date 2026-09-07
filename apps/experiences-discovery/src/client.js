const { component } = require('riot');
const DiscoveryTag = require('./discovery.riot').default;

function getProps() {
  const source = document.getElementById('experiences-discovery-fragment-data');
  if (!source || !source.textContent) {
    return null;
  }

  try {
    return JSON.parse(source.textContent);
  } catch (error) {
    console.error('Failed to parse experiences-discovery fragment data.', error);
    return null;
  }
}

function mountDiscovery() {
  const mountNode = document.getElementById('experiences-discovery-root');
  if (!mountNode) return;

  const props = getProps();
  if (!props) return;

  mountNode.innerHTML = '';
  component(DiscoveryTag)(mountNode, props);
}

mountDiscovery();
