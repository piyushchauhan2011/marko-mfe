# Marko MFE hotel booking monorepo

This repo demonstrates a Tailor-style microfrontend setup using a Turborepo monorepo, a Fastify composer shell, and several Marko SSR fragment apps for a simple hotel-booking flow.

## Architecture

- Composer shell: `apps/composer` — builds the overall page, streams SSR HTML, and handles booking confirmation routes
- Navigation MFE: `apps/navigation` — Marko-rendered navigation fragment
- Hotel search MFE: `apps/hotel-search` — Marko-rendered hotel cards with multiple destinations
- Hotel details MFE: `apps/hotel-details` — Marko-rendered booking detail fragment for each hotel
- Reviews MFE: `apps/reviews` — Marko-rendered review cards
- Recommendations MFE: `apps/recommendations` — Marko-rendered related stay cards
- Shared data: `packages/mock-data` — mock hotel data including the extra demo property and booking metadata

The demo now includes a fourth hotel, a server-side booking confirmation flow, and a stronger fragment contract that exposes metadata in JSON envelopes alongside HTML.

## Local development

1. Install dependencies:
   `pnpm install`
2. Start the monorepo:
   `pnpm dev`
3. Open the browser at:
   `http://localhost:3100`

## Services and ports

- Composer: http://localhost:3100
- Navigation fragment: http://localhost:3101
- Search fragment: http://localhost:3102
- Hotel details fragment: http://localhost:3103
- Reviews fragment: http://localhost:3104
- Recommendations fragment: http://localhost:3105

## Optional tmux helper

The repo already works with Turborepo's parallel dev runner, which is the simplest option.
If you want a tmux session locally, run:

`./scripts/start-tmux.sh`

This script creates or reuses a `marko-mfe` tmux session and runs the monorepo there.

## Notes

This is intentionally a lightweight microfrontend demo rather than a production-grade platform. The shell stays framework-neutral and composes independent HTML fragments, while each fragment owns its own Marko SSR output.
