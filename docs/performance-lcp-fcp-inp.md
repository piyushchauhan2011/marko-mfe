# LCP, FCP, and INP

How Server-Side Rendering and streaming affect Core Web Vitals in this architecture, and where to tune them.

---

## What these metrics measure

| Metric | Definition | Target |
|---|---|---|
| **FCP** (First Contentful Paint) | Time until any text or image appears | < 1.8 s |
| **LCP** (Largest Contentful Paint) | Time until the largest visible content renders | < 2.5 s |
| **INP** (Interaction to Next Paint) | Latency from user input to next visual response | < 200 ms |

---

## How SSR streaming affects FCP and LCP

### Without streaming (non-streaming SSR)

The server fetches **all** fragments, assembles the full HTML, then sends a single response. The browser sees nothing until the slowest fragment finishes.

```
slowest fragment = 860 ms delay
→ browser receives first byte at ~860 ms
→ FCP ≈ LCP ≈ 860+ ms
```

### With streaming (this project's approach)

The composer sends HTML chunks as each fragment resolves. The browser renders progressively.

```
headPrefix yielded immediately      → first paint
search  resolves at ~160 ms         → hotel grid visible
recommendations at ~300 ms
details at ~540 ms
experiences at ~720 ms
reviews at ~860 ms                  → page fully populated
```

FCP happens when `headPrefix` (header, nav structure) is flushed. LCP happens when the first large content block (hotel-search grid or hotel-details image) arrives — typically at ~160–540 ms rather than 860 ms.

The artificial delays are configured in `apps/composer/src/server.js`:

```js
const FRAGMENT_STREAM_DELAY_MS = {
  search: 160,
  details: 540,
  experiences: 720,
  reviews: 860,
  recommendations: 300,
};
```

**Production guidance**: remove artificial delays. Keep this map only to model real P99 latencies for capacity planning.

---

## Fragment loading order for LCP

The fragment whose content is largest on screen is the LCP candidate. For the `/hotel/:hotelId` route that is usually the **hotel-search grid** (hotel cards) or **hotel-details** panel.

Ensure these fragments are yielded early in `streamPage`. In `apps/composer/src/server.js` the `fragmentOrder` array controls yield order when using the streaming race pattern:

```js
const fragmentOrder = ['search', 'details', 'experiences', 'reviews', 'recommendations'];
```

If you change the visual layout so a different fragment is visually largest, move it to position 0 in this array and reduce its `FRAGMENT_STREAM_DELAY_MS` entry.

---

## Skeleton placeholders

The streaming `<head>` prefix includes `.loading-fragment` skeleton styles. When a fragment hasn't arrived yet the placeholder keeps layout stable and prevents CLS (Cumulative Layout Shift), which correlates with LCP accuracy.

```css
.loading-fragment {
  min-height: 160px;
  animation: pulse 1.4s linear infinite;
}
```

**Optimisation**: pre-size skeletons to match the typical height of each fragment's real content. If the skeleton is 160 px but the real content renders at 280 px there is a layout shift at render time.

---

## INP considerations

INP is measured from user input (click, keypress) to the next paint. In this project the main client-side interaction points are:

| Interaction | Fragment | How it works |
|---|---|---|
| Hotel filter clicks | hotel-search (:3102) | Marko DOM runtime re-renders filtered list |
| Category filter (Experiences) | experiences-discovery (:3107) | Riot updates `state.activeCategory` |
| Day switcher (Itinerary) | experiences-itinerary (:3108) | Riot switches `state.selectedDay` |
| Highlight card click | local-highlights (:3106) | React updates `selectedIndex` state |

Each uses a bundled IIFE client script from the CDN. Keeping these bundles small is the primary INP lever.

**Reduce INP by:**

1. **Minify bundles** — all current build scripts have `minify: true` in their esbuild config.
2. **Avoid long tasks** — Riot and React component mounts happen in a single synchronous task. If the dataset grows large, split rendering with `startTransition` (React) or yield chunks with `setTimeout` (Riot).
3. **Avoid forced style recalculation** — batch DOM reads before writes in event handlers. The current Riot components update via `this.update()` which batches Riot's own VDOM diff.

---

## Navigation and soft transitions

Currently all hotel navigation is hard full-page reloads via `window.location.assign`. A `fetch`-based soft reload of only changed fragments would dramatically improve INP for hotel switching by avoiding a full page re-parse.

See [future-optimizations.md](./future-optimizations.md) for a partial prerendering / client-side fragment swap pattern.

---

## Checklist

- [ ] Remove artificial `FRAGMENT_STREAM_DELAY_MS` in production.
- [ ] Confirm LCP candidate fragment is first in `fragmentOrder`.
- [ ] Size `.loading-fragment` skeletons to match real fragment heights.
- [ ] Verify all client bundles are `minify: true` in `build-client.js` files.
- [ ] Add `<link rel="preconnect">` for CDN origin in composer `<head>`.
- [ ] Add `<link rel="dns-prefetch">` for fragment origins in production.
- [ ] Profile INP with Chrome DevTools "Performance insights" after enabling all fragments.
