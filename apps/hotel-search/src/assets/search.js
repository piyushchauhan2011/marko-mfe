(function () {
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
})();
