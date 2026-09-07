# State Management

How state is handled in this microfrontend architecture: fragment-local state, cross-fragment communication, and patterns to avoid.

---

## Principle: state stays with the fragment that owns it

In a microfrontend architecture, shared mutable global state is the primary source of tight coupling. Each fragment should own and manage its own state, and cross-fragment coordination should be event-driven, not by shared objects.

---

## Fragment-local state (current approach)

Each fragment manages its own UI state internally.

### Marko (hotel-search)

State is a Marko component `state` object in `apps/hotel-search/src/hotel-search.client.marko`. The filter category and selected hotel are tracked inside the component tree. The Marko DOM runtime handles re-rendering when state changes.

```marko
<!-- hotel-search.client.marko -->
class {
  onCreate() {
    this.state = {
      filter: 'All',
      hotels: this.input.hotels,
    };
  }

  setFilter(category) {
    this.state.filter = category;
  }
}
```

The state is **not** shared with any other fragment. If another fragment needs to know the current filter, it must be communicated explicitly.

### React (local-highlights)

State lives in the `HighlightsView` component with `useState`. The selected highlight index is ephemeral UI state that does not need to leave the component.

```jsx
// HighlightsView.jsx
const [selectedIndex, setSelectedIndex] = React.useState(null);
```

### Riot (experiences-discovery, experiences-itinerary)

State lives inside each Riot component's `state` object, updated via `this.update()`. The active category (discovery) and selected day (itinerary) are fragment-local.

---

## Serialised props from server

All three client runtimes receive their initial data via a `<script type="application/json">` element embedded in the fragment's SSR response:

```html
<script type="application/json" id="hotel-search-fragment-data">
  { "hotels": [...], "hotelId": "harbor-view" }
</script>
<div id="hotel-search-fragment-root">...</div>
```

This is the **correct pattern** for passing server-originated data to client components without:

- A client-side API call for data that was already on the server.
- Coupling the composer to the fragment's data shape.
- Exposing fragment internals in the URL or HTML attributes.

The `data-` attribute approach (placing large JSON in HTML attributes) is an anti-pattern because it exposes the data in the DOM before JavaScript runs, affecting parse time.

---

## URL state

URL state is the right mechanism for state that should:

- Survive page refresh.
- Be shareable as a link.
- Be bookmarkable.

In this project, the selected hotel is URL state (`/hotel/:hotelId`). Navigation between hotels is a full-page reload, which is intentional for this demo.

**Pattern for soft navigation with URL state:**

```js
// Update URL without reload
history.pushState({ hotelId }, '', `/hotel/${hotelId}`);

// Listen for browser back/forward
window.addEventListener('popstate', (event) => {
  const hotelId = event.state?.hotelId;
  if (hotelId) refreshFragments(hotelId);
});
```

This pattern is the entry point to client-side MFE orchestration — see [future-optimizations.md](./future-optimizations.md).

---

## Cross-fragment communication

Sometimes fragments need to communicate. There are three safe patterns:

### 1. Custom DOM events

The lightest approach. A fragment dispatches a custom event on the `document` or a shared root element:

```js
// In hotel-search fragment, when user selects a hotel:
document.dispatchEvent(new CustomEvent('harborstay:hotel-selected', {
  bubbles: true,
  detail: { hotelId: 'moss-lantern' },
}));
```

Another fragment (e.g. recommendations) listens:

```js
document.addEventListener('harborstay:hotel-selected', (event) => {
  const { hotelId } = event.detail;
  updateRecommendations(hotelId);
});
```

**Namespace your events** (e.g. `harborstay:`) to avoid collision with browser or third-party events.

### 2. BroadcastChannel

`BroadcastChannel` works across browser tabs and iframes. It is appropriate when:

- Multiple tabs need to stay in sync (e.g. a user opens hotel details in a new tab).
- Fragments are in iframes with a shared origin.

```js
// Publisher (hotel-search)
const channel = new BroadcastChannel('harborstay-mfe');
channel.postMessage({ type: 'HOTEL_SELECTED', hotelId: 'harbor-view' });

// Subscriber (any fragment)
const channel = new BroadcastChannel('harborstay-mfe');
channel.onmessage = (event) => {
  if (event.data.type === 'HOTEL_SELECTED') {
    handleHotelChange(event.data.hotelId);
  }
};
```

### 3. Shared URL params / `localStorage`

For values that need to persist across fragment server round-trips (not just within the current render), use URL query params or `localStorage`:

```js
// Store selection
localStorage.setItem('harborstay.lastHotelId', hotelId);

// Read on next page load
const lastHotel = localStorage.getItem('harborstay.lastHotelId') || 'harbor-view';
```

---

## Anti-patterns to avoid

### ❌ Shared global store imported by multiple fragments

```js
// AVOID: a global store that two separate bundles import
import { store } from '@harborstay/store'; // breaks bundle isolation
```

If `hotel-search.js` and `local-highlights.js` both import the same store, they create two independent instances (different IIFE closures). They do not share state — this is a silent, hard-to-debug failure.

If you genuinely need a shared store, the only reliable approach in a non-module-federation setup is to attach it to `window`:

```js
window.HarborStayStore = window.HarborStayStore || createStore();
```

Use this sparingly. It creates a global that any script can mutate.

### ❌ Reading another fragment's DOM directly

```js
// AVOID: fragile cross-fragment DOM coupling
const otherFragmentData = document.querySelector('[data-fragment="search"] .hotel-card');
```

Fragment DOM structure is an internal implementation detail. If it changes, the reader breaks silently.

### ❌ Passing large state through `data-` attributes

```html
<!-- AVOID -->
<div id="root" data-hotels='[{"id":"harbor-view","name":"Harbor View Lodge"...}]'></div>
```

Use `<script type="application/json">` instead (see Serialised props above).

---

## Checklist

- [ ] Confirm each fragment reads its initial data from `<script type="application/json">`.
- [ ] Namespace any cross-fragment custom events with `harborstay:`.
- [ ] Use URL state for hotel selection when adding soft navigation.
- [ ] Use `BroadcastChannel` only if cross-tab or cross-iframe sync is needed.
- [ ] Never import a shared store module across fragment bundle boundaries.
