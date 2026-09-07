# SSR and Hydration

How each rendering runtime works in this project, how the serialised-props pattern enables safe hydration, and what causes hydration mismatches.

---

## Why SSR in a microfrontend?

SSR ensures the browser receives paint-ready HTML on the first response. No JavaScript needs to execute before the user sees content. In a microfrontend, this is especially valuable because:

1. Each fragment can have its own SSR runtime without forcing the page to wait for JS.
2. Fragment HTML is composable — the composer receives and stitches HTML strings, not JavaScript components.
3. CDN caching of SSR HTML responses is straightforward.

---

## Marko streaming SSR

Marko's compiler transforms `.marko` templates at build time into server-side render functions. The `@marko/compiler/register` hook makes `require('file.marko')` work at runtime.

### How it's used in this project

```js
// apps/hotel-search/src/server.js
require('@marko/compiler/register');
const template = require('./hotel-search.marko').default;

function renderHtml(input) {
  return template.render(input).toString();
}
```

`template.render(input)` returns a Marko render result. `.toString()` synchronously collects the HTML string.

For full streaming, Marko can pipe directly to a `WritableStream`, emitting HTML in chunks as components resolve. In this project, `.toString()` is used for simplicity because the streaming is handled at the composer level via `async function*` and `Promise.race`.

### Marko client-side runtime (hotel-search)

`apps/hotel-search/src/hotel-search.client.marko` is a **separate** Marko template compiled for the DOM (`output: 'dom'`). It is not the same as the SSR template. The client bundle (`search.js`) mounts this DOM template into `#hotel-search-fragment-root`, replacing the SSR HTML with an interactive Marko-managed tree.

Key: **the client template must produce the same HTML structure as the server template** for a clean swap. If they diverge, the initial paint differs from the hydrated state and users see a flash of re-rendered content.

---

## React SSR and hydration

`apps/local-highlights/src/server.js` uses `react-dom/server`:

```js
const ReactDOMServer = require('react-dom/server');
const { HighlightsView } = require('./HighlightsView.jsx');

const html = ReactDOMServer.renderToString(
  React.createElement(HighlightsView, { hotel, highlights })
);
```

`renderToString` returns the full HTML synchronously. React 18+ `renderToPipeableStream` would enable true streaming; this project uses `renderToString` for simplicity.

### React hydration (client)

`apps/local-highlights/src/client.jsx`:

```jsx
const root = document.getElementById('local-highlights-root');
if (root) {
  const props = JSON.parse(document.getElementById('local-highlights-data').textContent);
  ReactDOM.hydrateRoot(root, <HighlightsView {...props} />);
}
```

`hydrateRoot` expects the server-rendered HTML to match exactly. It does a reconciliation pass: if the HTML matches, React attaches event listeners without re-rendering. If it doesn't match, React logs a warning and re-renders from scratch.

### Hydration mismatch causes

| Cause | Example |
|---|---|
| Server/client data differs | Server uses `Date.now()`, client runs at a different time |
| Conditional rendering on `typeof window` | `if (typeof window !== 'undefined')` in render path |
| HTML whitespace differences | Server trims, client doesn't (or vice versa) |
| Locale/timezone difference | `toLocaleDateString()` on server vs client |
| Missing `suppressHydrationWarning` | Timestamps inside HTML where drift is expected |

**Fix**: ensure server and client render the exact same tree. Pass all dynamic values as serialised props rather than computing them during render.

---

## Riot pre-render and hydration

Riot does not have an official Node.js SSR renderer as of v9. This project generates server-side HTML manually in `renderSsrMarkup()` functions within each Riot fragment server:

```js
// apps/experiences-discovery/src/server.js
function renderSsrMarkup(props) {
  // Manually produce HTML matching the .riot template structure
  const cards = props.experiences.map((item) => `
    <article class="riot-experience-card">
      <strong>${item.title}</strong>
      <p>${item.description}</p>
    </article>
  `).join('');

  return `<section class="riot-experiences-panel">...</section>`;
}
```

### Why the SSR HTML is replaced instead of hydrated

Because Riot has no hydration API (it cannot reconcile existing DOM), the client bundle **replaces** the SSR HTML on mount:

```js
// apps/experiences-discovery/src/client.js
mountNode.innerHTML = '';            // clear SSR HTML
component(DiscoveryTag)(mountNode, props);  // mount Riot component
```

This means:
1. The user sees the SSR HTML immediately (fast FCP/LCP).
2. After the bundle loads, the SSR HTML is replaced with Riot's live DOM.
3. There is a brief flash if the Riot render differs visually from the SSR markup.

**To minimise flash**: keep the Riot component structure and the `renderSsrMarkup` output visually identical. Class names, element types, and text content should match.

---

## The serialised props pattern

All three runtimes (Marko, React, Riot) receive server data the same way:

```html
<!-- Embedded in the fragment SSR response -->
<script type="application/json" id="hotel-search-fragment-data">
  {"hotels":[...],"hotelId":"harbor-view"}
</script>
<div id="hotel-search-fragment-root">
  <!-- SSR HTML here -->
</div>
```

The client bundle reads the JSON element before mounting:

```js
const data = JSON.parse(
  document.getElementById('hotel-search-fragment-data').textContent
);
```

### Why `<script type="application/json">` and not `data-` attributes

- `data-` attributes are limited to strings; large JSON must be escaped, which bloats the HTML.
- Screen readers and accessibility tools skip `<script type="application/json">`.
- The JSON element is not part of the component's visual DOM, so it doesn't affect layout.

### XSS safety

Before embedding JSON in HTML, replace `<` with `\u003c` to prevent a `</script>` in a string from breaking the page:

```js
function serializeFragmentData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

This is done in all fragment servers in this project.

---

## Streaming SSR from the composer

`apps/composer/src/server.js` uses two modes:

### Buffered (non-streaming)

`renderPage()` → `buildPage()` → returns complete HTML string. Used for the experiences route.

```js
async function renderPage(hotelId) {
  const [search, details, ...] = await Promise.all([...]);
  return buildPage(hotelId, { search, details, ... });
}
```

### Streaming

`streamPage()` is an `async function*` generator. It yields the HTML head prefix immediately, then yields each fragment as it resolves using `Promise.race` across a `Map` of pending fragment promises. Fastify wraps this in a `Readable.from()` stream.

```js
app.get('/hotel/:hotelId', async (request, reply) => {
  reply.type('text/html; charset=utf-8');
  return Readable.from(streamPage(hotel.id));
});
```

The browser starts parsing and painting as soon as the first chunk arrives, well before all fragments resolve.

---

## Checklist

- [ ] Ensure Marko SSR and Marko DOM client templates produce the same HTML structure.
- [ ] Ensure React server and client components receive identical props.
- [ ] Ensure `renderSsrMarkup()` in Riot fragment servers matches the `.riot` component output.
- [ ] Use `serializeFragmentData()` (with `\u003c` escaping) on all JSON props.
- [ ] Do not use `typeof window`, `Date.now()`, or other environment-specific values in the SSR render path.
- [ ] Consider migrating React `renderToString` to `renderToPipeableStream` for true streaming.
