const template = require('./.generated/hotel-search.client.dom.js').default;

const dataNode = document.getElementById('hotel-search-fragment-data');
const mountNode = document.getElementById('hotel-search-fragment-root');

if (dataNode && mountNode) {
  const input = JSON.parse(dataNode.textContent);
  mountNode.innerHTML = '';
  template.mount(input, mountNode, 'afterbegin');
}
