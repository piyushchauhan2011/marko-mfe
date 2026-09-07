# JavaScript Loading, Islands, and Hydration Patterns

Strategies for loading client-side JavaScript efficiently in a microfrontend architecture: Islands, deferred hydration, scroll-based loading, Intersection Observer, and code splitting.

---

## The problem: JavaScript cost in MFE

Each fragment ships its own client bundle. Even small bundles add up when composed into one page:

```
search.js              ~xx KB (Marko DOM runtime)
local-highlights.js    ~xx KB (React 19 + component)
experiences-discovery.js  ~xx KB (Riot + component)
experiences-itinerary.js  ~xx KB (Riot + component)
```

If all bundles are `<script defer>` in `<head>`, the browser parses and evaluates them all on every page load, even for fragments that are below the fold or that the user never interacts with.

---

## Islands Architecture

The **Islands** pattern treats interactive components as isolated "islands" of JavaScript surrounded by static, non-interactive HTML. Only islands that need interactivity download and execute JS.

### How this project implements Islands

Each fragment already practices a form of Islands:

1. The **server** renders full HTML (`renderSsrMarkup`, `template.render`, `renderToString`).
2. The **client bundle** mounts only onto a specific root element (`#hotel-search-fragment-root`, `#local-highlights-root`, etc.).
3. The mounting script runs only when the bundle is loaded. The SSR HTML is visible immediately regardless.

This means: if the `experiences-discovery.js` bundle fails to load (network error, CDN failure), users still see the SSR-rendered experience cards. The page is not broken — it is just not interactive.

### Improving Islands isolation

Currently all fragment bundles are referenced from within the fragment's SSR response (`<script defer src="...">`) which means they all load on every page visit that includes that fragment.

To load bundles **only when the island becomes interactive**, replace `defer` with a dynamic import triggered by user intent (see sections below).

---

## Scroll-based and Intersection Observer loading

Load a fragment's client bundle only when the user scrolls near it.

### Pattern: inline loader script

The fragment server replaces its `<script defer src="...">` with a small inline loader:

```html
<!-- Instead of: <script defer src="https://cdn.example.com/assets/experiences-discovery.js"> -->
<script>
  (function () {
    const root = document.getElementById('experiences-discovery-root');
    if (!root) return;

    const observer = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();

        const s = document.createElement('script');
        s.src = 'https://cdn.example.com/assets/experiences-discovery.js';
        document.head.appendChild(s);
      },
      { rootMargin: '200px' }   // start loading 200px before the element enters view
    );

    observer.observe(root);
  })();
</script>
```

**Where to add this** in `apps/experiences-discovery/src/server.js`: replace the `<script defer src="${manifest.assets.js[0]}">` in the fragment response body with the inline loader above.

### `rootMargin` tuning

- `0px` — load only when element is fully on screen (too late; user sees delay).
- `200px` — start loading 200 px before viewport edge (good default for fast connections).
- `50vh` — start loading half a viewport height ahead (good for heavy bundles on slow connections).

---

## Click-triggered (deferred) hydration

For fragments that are only interactive after user click, defer all JS until the first click.

```html
<!-- Fragment SSR output -->
<div id="hotel-search-fragment-root" data-hydrate-on-click>
  <!-- SSR HTML here — fully visible, not yet interactive -->
</div>

<script>
  (function () {
    const root = document.querySelector('[data-hydrate-on-click]');
    if (!root) return;

    function loadBundle() {
      root.removeEventListener('click', loadBundle);
      const s = document.createElement('script');
      s.src = 'https://cdn.example.com/assets/search.js';
      document.head.appendChild(s);
    }

    root.addEventListener('click', loadBundle, { once: true });
  })();
</script>
```

This is appropriate for fragments where the initial SSR content satisfies most users without interaction (e.g. a read-only hotel details panel).

---

## Page-split / route-split loading

Each `dev:home` and `dev:experiences` Turbo filter is already a page split at the infrastructure level — experiences fragments are not loaded at all when visiting the hotel route. This is the most effective form of JS budget control.

In production, extend this with:

- **Route-based bundle splitting**: experiences bundles are not referenced anywhere in the hotel page HTML, so they never load.
- **Conditional `<script>` injection**: the composer only emits `<script>` tags for fragments that appear on the current route.

In `apps/composer/src/server.js`, `buildExperiencesPage` emits fragment HTML that includes the Riot `<script defer>` tags; `buildPage` and `streamPage` emit the Marko/React tags. These two page builders are already separate, so the bundles are naturally route-split.

---

## Code splitting large bundles

If a fragment's client bundle grows large, split it with dynamic `import()`.

### esbuild code splitting

In `apps/local-highlights/src/build-client.js` (and equivalent files), enable splitting:

```js
await esbuild.build({
  entryPoints: ['src/client.jsx'],
  bundle: true,
  splitting: true,       // ← enable
  format: 'esm',         // ← required for splitting
  outdir: '../../cdn/public/assets/highlights-chunks/',
  minify: true,
});
```

Note: splitting requires `format: 'esm'` and an `outdir` (not `outfile`). The entry script becomes an ES module that the browser loads with `<script type="module">`.

### Dynamic import within a component

Heavy sub-components (charts, rich text editors, date pickers) can be split off:

```js
// React example inside local-highlights
async function loadCalendar() {
  const { CalendarPicker } = await import('./CalendarPicker.jsx');
  return CalendarPicker;
}

function HighlightsView({ hotel }) {
  const [CalendarPicker, setCalendarPicker] = React.useState(null);

  async function handleAddToCalendar() {
    const C = await loadCalendar();
    setCalendarPicker(() => C);
  }

  return (
    <div>
      <button onClick={handleAddToCalendar}>Add to calendar</button>
      {CalendarPicker && <CalendarPicker hotel={hotel} />}
    </div>
  );
}
```

The calendar bundle is only downloaded when the user clicks the button.

---

## Progressive hydration summary

| Technique | When to use | Complexity |
|---|---|---|
| `defer` script (current) | Always-interactive fragment | Low |
| Intersection Observer load | Below-fold fragment | Low |
| Click-triggered load | Rarely-interactive fragment | Low |
| Route-split (current architecture) | Separate routes | None (already done) |
| `import()` dynamic split | Large sub-components | Medium |
| `startTransition` (React) | Large list re-renders | Low |
| `requestIdleCallback` hydration | Non-critical islands | Low |

---

## `requestIdleCallback` hydration

For non-critical islands (e.g. recommendations sidebar), defer hydration until the browser is idle:

```js
function mountWhenIdle(mountFn) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(mountFn, { timeout: 2000 });
  } else {
    setTimeout(mountFn, 200);
  }
}

mountWhenIdle(() => {
  const root = document.getElementById('recommendations-root');
  if (root) component(RecommendationsTag)(root, props);
});
```

---

## Checklist

- [ ] Audit total JS on `/hotel/:hotelId` with Chrome DevTools → Coverage tab.
- [ ] Replace `<script defer>` with Intersection Observer loader for below-fold fragments.
- [ ] Replace `<script defer>` with click-triggered loader for rarely-interactive fragments.
- [ ] Confirm experiences bundles are not referenced in hotel route HTML.
- [ ] Consider esbuild `splitting: true` + `format: 'esm'` for bundles > 50 KB.
- [ ] Add `requestIdleCallback` wrapper for recommendations and reviews hydration.
- [ ] Measure INP before and after each change with `web-vitals` library.
