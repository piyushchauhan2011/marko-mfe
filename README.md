# HarborStay — Marko SSR MFE hotel booking demo

HarborStay is a lightweight microfrontend demo built around a Turborepo monorepo, a Fastify composer shell, and multiple SSR fragment apps (Marko, React, and Riot). It models a premium travel booking experience with independent UI fragments, hotel-specific routes, and a confirmation flow.

## What this demo includes

- Monorepo structure with Turborepo
- SSR-based Marko fragment apps
- Composer shell that assembles fragments into a single page
- Hotel catalog with multiple destinations
- Hotel-by-route URLs like `/hotel/moss-lantern`
- Booking confirmation flow and success page
- Fragment JSON envelope contract with metadata headers
- Optional tmux-based local runner

## Architecture

- Composer shell: `apps/composer` — assembles the overall page and handles routes / confirmation pages
- Navigation MFE: `apps/navigation` — top navigation fragment
- Search MFE: `apps/hotel-search` — hotel list fragment
- Hotel details MFE: `apps/hotel-details` — selected stay detail fragment
- Reviews MFE: `apps/reviews` — guest review cards
- Recommendations MFE: `apps/recommendations` — related stays
- React highlights MFE: `apps/local-highlights` — SSR-rendered local recommendations for a hotel stay with a hydrated React client bundle
- Riot discovery MFE: `apps/experiences-discovery` — experience category explorer with Riot client interactivity
- Riot itinerary MFE: `apps/experiences-itinerary` — day-by-day planner with Riot client interactivity
- Shared data: `packages/mock-data` — mock hotel, review, and recommendation data

## Run locally

1. Install dependencies:
   `pnpm install`
2. Start the home/hotel flow workspace:
   `pnpm dev:home` (or `pnpm dev`)
3. Start only the experiences flow workspace:
   `pnpm dev:experiences`
4. Start every app:
   `pnpm dev:all`
5. Open the app:
   `http://localhost:3100`

## Available routes

- Home: `http://localhost:3100/`
- Hotel detail: `http://localhost:3100/hotel/harbor-view`
- Another hotel: `http://localhost:3100/hotel/moss-lantern`
- Experiences: `http://localhost:3100/experiences/harbor-view`
- Booking confirmation: `http://localhost:3100/booking/confirm/moss-lantern`

## Fragment endpoints

- Navigation: `http://localhost:3101`
- Search: `http://localhost:3102`
- Details: `http://localhost:3103`
- Reviews: `http://localhost:3104`
- Recommendations: `http://localhost:3105`
- React local highlights: `http://localhost:3106`
- Riot experiences discovery: `http://localhost:3107`
- Riot experiences itinerary: `http://localhost:3108`

## Optional tmux helper

The monorepo runs well with Turborepo's native parallel dev runner. If you want a tmux session locally, use:

`./scripts/start-tmux.sh`

This creates or reuses a `marko-mfe` tmux session and runs the project from there.

## Developer docs

In-depth documentation lives in the [`docs/`](./docs/) folder:

| Doc | Summary |
|---|---|
| [Architecture](./docs/architecture.md) | Composer shell, fragment protocol, port map, CDN simulation |
| [LCP / FCP / INP](./docs/performance-lcp-fcp-inp.md) | Web Vitals and streaming SSR impact |
| [Fonts and images](./docs/performance-fonts-images.md) | FOIT/FOUT, WebP/AVIF, lazy loading |
| [JS loading and Islands](./docs/performance-js-loading.md) | Islands architecture, deferred hydration, Intersection Observer |
| [Compression](./docs/performance-compression.md) | Brotli, gzip, CDN headers, precompressed assets |
| [State management](./docs/state-management.md) | Fragment-local state, BroadcastChannel, cross-MFE events |
| [SSR and hydration](./docs/ssr-and-hydration.md) | Marko streaming, React renderToString, Riot pre-render, serialised props |
| [Deployment](./docs/deployment.md) | Containers, env vars, health endpoints, rolling deploys |
| [CI/CD and DevOps](./docs/ci-cd-devops.md) | GitHub Actions, Turbo remote cache, Docker, smoke tests |
| [Future optimizations](./docs/future-optimizations.md) | Edge SSR, partial prerendering, service workers, RSC |

## Notes

This is a demo-first microfrontend setup rather than a production platform. The goal is to show how independent SSR fragments can be composed behind a neutral shell while keeping each fragment independently deployable and easy to reason about.
