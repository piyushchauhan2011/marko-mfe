# Future Optimizations

A forward-looking checklist of architectural and performance improvements. Each item references where in the codebase it would apply.

---

## Performance

### Edge SSR

Move fragment servers (or a read-only Edge middleware) to a CDN edge network (Cloudflare Workers, Vercel Edge, Fastly Compute) so the HTML is generated geographically close to the user.

- **Where**: `apps/composer/src/server.js` — the streaming `streamPage()` generator is already compatible with the Fetch API `Response` + `ReadableStream` model used by edge runtimes.
- **Effort**: medium — requires removing Node-specific APIs (`node:http`, `Readable.from`) and replacing with Web Streams API.
- **Gain**: TTFB drops from ~50–150 ms (single region) to < 20 ms (edge-local).

### Partial prerendering (PPR)

Statically cache the page shell (header, layout, skeleton) and stream only dynamic fragment slots. This model is emerging in React 19 and Next.js App Router.

- **Where**: the `headPrefix` yield in `streamPage()` is already static per hotel. It could be cached at the CDN edge for the duration of a hotel's data TTL.
- **Effort**: low — wrap the head + skeleton in a `Cache-Control: s-maxage=60` CDN layer. The dynamic fragment slots stream fresh on every request.

### Service worker prefetch and offline shell

Register a service worker that caches the page shell and static assets so repeat visits load instantly.

```js
// sw.js
const SHELL_CACHE = 'harborstay-shell-v1';
const ASSET_CACHE = 'harborstay-assets-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/assets/composer.css',
        'https://cdn.harborstay.com/assets/search.css',
      ])
    )
  );
});
```

- **Where**: add `sw.js` to `apps/composer/public/` and register it in the `buildPage` `<head>`.
- **Gain**: instant repeat-visit FCP from cache; offline shell for degraded network.

### `renderToPipeableStream` (React)

`apps/local-highlights/src/server.js` currently uses `renderToString` (synchronous, full-page blocking). Migrate to `renderToPipeableStream` (React 18+) for streaming SSR:

```js
const { pipe } = ReactDOMServer.renderToPipeableStream(
  React.createElement(HighlightsView, props),
  {
    onShellReady() { pipe(res); },
    onError(error) { console.error(error); },
  }
);
```

- **Gain**: the React fragment response starts flushing immediately without waiting for the full tree to resolve. Helps if `HighlightsView` has async data dependencies.

### Marko streaming tags API

Marko's `<await>` and streaming tag API (`@marko/tag-stream`) allow individual component subtrees to stream independently. Replace `template.render().toString()` with a pipe-based render:

```js
const out = template.stream(input);
out.pipe(res);
```

- **Where**: `apps/hotel-search/src/server.js`, `apps/hotel-details/src/server.js`.
- **Gain**: reduces fragment TTFB; the hotel grid starts painting before all card data resolves.

### Riot SSR hydration API

Riot v9 introduced `renderHtml` for server-side rendering and a `hydrate` function for matching SSR output:

```js
// When the Riot SSR API matures:
const { renderHtml } = require('@riotjs/server');
const html = renderHtml(DiscoveryTag, props);

// Client-side:
import { hydrate } from 'riot';
hydrate(DiscoveryTag)(mountNode, props);
```

- **Where**: `apps/experiences-discovery/src/server.js`, `apps/experiences-itinerary/src/server.js`.
- **Current workaround**: `mountNode.innerHTML = ''` before mount avoids the double-render issue but discards SSR HTML before Riot takes over. True `hydrate()` would keep the SSR DOM, attach event listeners, and skip re-render.

---

## Architecture

### Client-side fragment orchestration

Currently all navigation causes a full-page reload through the composer. A client-side orchestrator can fetch and swap only changed fragment slots:

```js
async function navigateToHotel(hotelId) {
  history.pushState({ hotelId }, '', `/hotel/${hotelId}`);

  const [search, details] = await Promise.all([
    fetch(`http://localhost:3102/?hotelId=${hotelId}`).then(r => r.text()),
    fetch(`http://localhost:3103/?hotelId=${hotelId}`).then(r => r.text()),
  ]);

  document.querySelector('[data-fragment="search"]').innerHTML = search;
  document.querySelector('[data-fragment="details"]').innerHTML = details;
}
```

- **Where**: add as a `<script>` in the composer page, listening to `data-hotel-id` click events.
- **Gain**: hotel navigation without full page reload → instant perceived load.

### Module Federation

Webpack Module Federation (or its Vite equivalent, `@originjs/vite-plugin-federation`) allows fragment bundles to share runtime dependencies (React, Riot, Marko runtime) without duplicating them.

- **When to consider**: when multiple fragments share the same runtime version and bundle size is a concern.
- **Current approach**: each fragment IIFE bundle is self-contained. This is simpler and avoids version coupling issues.

### React Server Components (RSC)

RSC allows React components to run on the server with zero client-side JS for the component tree, streaming JSON updates to the client for interactive parts.

- **Current state**: RSC requires a Next.js App Router or a custom RSC host. Not yet viable as a standalone fragment renderer.
- **Long-term**: replace `renderToString` in `apps/local-highlights` with an RSC-compatible renderer when the standalone RSC APIs stabilise.

### Stale-while-revalidate for fragment HTML

Fragment HTML responses that are not personalised (e.g. hotel details for a given hotel ID) can be cached at the composer level with SWR:

```js
const fragmentCache = new Map();

async function renderFragment(key, hotelId) {
  const cacheKey = `${key}:${hotelId}`;
  const cached = fragmentCache.get(cacheKey);

  if (cached && Date.now() - cached.ts < 5000) {
    return cached.result; // serve stale immediately
  }

  const result = await fetchFragment(key, hotelId);
  fragmentCache.set(cacheKey, { result, ts: Date.now() });
  return result;
}
```

- **Gain**: sub-millisecond fragment response for repeat requests; fragment servers are only hit once per TTL.

---

## Operational

### Content hash filenames for cache busting

Current asset filenames are static (e.g. `search.js`). In production, add a content hash:

```
search.abc123f.js
local-highlights.d9e4b1a.js
```

This enables `Cache-Control: immutable` and eliminates stale-asset problems after deploy without requiring cache purges.

- **Where**: modify `build-client.js` files to use esbuild's `[hash]` in output filename, and update fragment servers to read the generated filename from a manifest JSON.

### Fragment health metrics

Add structured health data to `/health` endpoints to enable per-fragment SLA monitoring:

```json
{
  "ok": true,
  "fragment": "hotel-search",
  "version": "1.4.2",
  "uptime": 3600,
  "p99LatencyMs": 42
}
```

### A/B testing at the fragment level

Because fragments are independent HTTP services, you can run multiple versions simultaneously and route a percentage of requests to each version at the composer level:

```js
function getFragmentUrl(key, experimentGroup) {
  if (key === 'hotel-search' && experimentGroup === 'B') {
    return 'http://mfe-hotel-search-v2.internal';
  }
  return FRAGMENTS[key];
}
```

---

## Checklist

- [ ] Prototype edge SSR for the composer using Cloudflare Workers.
- [ ] Add `Cache-Control: s-maxage=60` to static hotel `headPrefix` output.
- [ ] Register a service worker for shell caching.
- [ ] Migrate `local-highlights` to `renderToPipeableStream`.
- [ ] Evaluate Marko `template.stream()` for hotel-search and hotel-details.
- [ ] Implement client-side fragment swap for hotel navigation (soft nav).
- [ ] Add content-hash filenames to all client bundle outputs.
- [ ] Add SWR fragment cache in composer `renderFragment`.
- [ ] Evaluate Riot `hydrate()` API when it stabilises in v9.
- [ ] Add structured health metrics to fragment `/health` endpoints.
