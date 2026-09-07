# Architecture

HarborStay is a **microfrontend demo** built to show how multiple independent SSR runtimes (Marko, React, Riot) can compose into a single page without the shell knowing anything about the fragment internals.

---

## Core concepts

### 1. Composer shell

`apps/composer` (port 3100) is the only server the browser ever speaks to. It:

- Owns all routes (`/`, `/hotel/:hotelId`, `/experiences/:hotelId`, `/booking/confirm/:hotelId`).
- Fetches HTML from each fragment server in parallel using `Promise.all` or streams them progressively with `async function*`.
- Has **no knowledge** of how fragments render internally — it only knows each fragment's base URL.
- Injects fragment HTML into a page skeleton it owns; the skeleton includes shared CSS variables and layout classes.

```
Browser → Composer (:3100)
                ├── GET :3101   navigation
                ├── GET :3102   hotel-search
                ├── GET :3103   hotel-details
                ├── GET :3104   reviews
                ├── GET :3105   recommendations
                ├── GET :3106   local-highlights (React)
                ├── GET :3107   experiences-discovery (Riot)
                └── GET :3108   experiences-itinerary (Riot)
```

### 2. Fragment contract (`harborstay-fragment/v1`)

Every fragment server exposes a minimal HTTP contract:

| Endpoint | Description |
|---|---|
| `GET /?hotelId=<id>` | Returns the fragment's HTML (SSR). Also accepts `format=json` for envelope mode. |
| `GET /manifest` | Returns a JSON manifest with fragment name, version, and asset URLs. |
| `GET /assets/<name>.css` | Serves the fragment's own CSS, read from `src/assets/`. |
| `GET /assets/<name>.js` | Serves the fragment's generated client bundle (built by `build-client.js`). |

Response headers signal provenance:

```
X-Fragment-Name: hotel-search
X-Fragment-Hotel-Id: harbor-view
X-Fragment-Protocol: harborstay-fragment/v1
X-Fragment-Css: http://localhost:3200/assets/search.css
X-Fragment-Js:  http://localhost:3200/assets/search.js
```

The composer reads the HTML body. Asset URLs in the headers are informational; in this demo assets are served by the CDN app.

### 3. CDN simulation

`apps/cdn` (port 3200) simulates a CDN by serving pre-copied static assets from `public/assets/`. On startup its `sync-assets.js` script:

1. Copies CSS files owned by each fragment app from `apps/<name>/src/assets/`.
2. **Preserves** any already-generated JS bundles (e.g. `local-highlights.js`, `search.js`, `experiences-discovery.js`) instead of overwriting them.

This models the real-world pattern where a CDN serves fragment assets while fragment servers do SSR, without coupling the CDN to fragment deployment timing.

### 4. Asset ownership

Assets belong to the fragment that creates them, not to the composer or CDN. Each fragment has:

```
apps/<name>/src/assets/<name>.css    ← authored CSS, copied to CDN
apps/<name>/src/build-client.js      ← builds browser bundle → cdn/public/assets/<name>.js
apps/<name>/src/watch-client.js      ← watches src, rebuilds on change (dev only)
```

Generated JS bundles land directly in `apps/cdn/public/assets/` so the CDN serves them without a separate copy step.

### 5. Multi-runtime composition

Three rendering runtimes participate as first-class fragments:

| Runtime | Fragment(s) | Render method | Client interactivity |
|---|---|---|---|
| Marko | navigation, hotel-search, hotel-details, reviews, recommendations | `@marko/compiler` SSR | Marko DOM runtime (`hotel-search.client.marko`) |
| React | local-highlights | `react-dom/server` renderToString | React 19 `createRoot` hydration |
| Riot | experiences-discovery, experiences-itinerary | Custom SSR string render | `riot.component()` mount after clearing SSR root |

All three produce plain HTML responses. The composer treats them identically.

### 6. Streaming

The `/hotel/:hotelId` route uses an `async function*` generator (`streamPage`) to stream fragment HTML progressively. Each fragment is fetched concurrently; the composer yields each result to the response as it arrives using `Promise.race`. This means the browser starts receiving paint-ready HTML before all fragments finish.

`FRAGMENT_STREAM_DELAY_MS` in `apps/composer/src/server.js` simulates realistic fragment latency differences so the streaming demo is visible.

---

## Port map

| Port | App |
|---|---|
| 3100 | Composer shell |
| 3101 | Navigation fragment |
| 3102 | Hotel search fragment (Marko) |
| 3103 | Hotel details fragment (Marko) |
| 3104 | Reviews fragment (Marko) |
| 3105 | Recommendations fragment (Marko) |
| 3106 | Local highlights fragment (React) |
| 3107 | Experiences discovery fragment (Riot) |
| 3108 | Experiences itinerary fragment (Riot) |
| 3200 | CDN static asset server |

---

## Directory structure

```
marko-mfe/
├── apps/
│   ├── composer/          # Shell + all routes
│   ├── cdn/               # Static asset CDN simulation
│   ├── navigation/        # Marko fragment
│   ├── hotel-search/      # Marko fragment + Marko client bundle
│   ├── hotel-details/     # Marko fragment
│   ├── reviews/           # Marko fragment
│   ├── recommendations/   # Marko fragment
│   ├── local-highlights/  # React SSR fragment + React client bundle
│   ├── experiences-discovery/  # Riot fragment + Riot client bundle
│   └── experiences-itinerary/  # Riot fragment + Riot client bundle
├── packages/
│   └── mock-data/         # Shared hotel/review/recommendation data
├── docs/                  # ← You are here
├── turbo.json
└── package.json
```

---

## Dev commands

| Command | What runs |
|---|---|
| `pnpm dev:home` | Composer + CDN + all hotel/stays fragments |
| `pnpm dev:experiences` | Composer + CDN + experiences-discovery + experiences-itinerary |
| `pnpm dev:all` | Every app concurrently |
| `pnpm build` | Full Turbo build (all apps) |
| `pnpm start:prod` | Build then start all servers |
