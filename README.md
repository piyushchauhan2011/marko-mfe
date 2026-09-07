# HarborStay — Marko SSR MFE hotel booking demo

HarborStay is a lightweight microfrontend demo built around a Turborepo monorepo, a Fastify composer shell, and multiple Marko SSR fragment apps. It models a premium travel booking experience with independent UI fragments, hotel-specific routes, and a confirmation flow.

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
- Shared data: `packages/mock-data` — mock hotel, review, and recommendation data

## Run locally

1. Install dependencies:
   `pnpm install`
2. Start the workspace:
   `pnpm dev`
3. Open the app:
   `http://localhost:3100`

## Available routes

- Home: `http://localhost:3100/`
- Hotel detail: `http://localhost:3100/hotel/harbor-view`
- Another hotel: `http://localhost:3100/hotel/moss-lantern`
- Booking confirmation: `http://localhost:3100/booking/confirm/moss-lantern`

## Fragment endpoints

- Navigation: `http://localhost:3101`
- Search: `http://localhost:3102`
- Details: `http://localhost:3103`
- Reviews: `http://localhost:3104`
- Recommendations: `http://localhost:3105`

## Optional tmux helper

The monorepo runs well with Turborepo's native parallel dev runner. If you want a tmux session locally, use:

`./scripts/start-tmux.sh`

This creates or reuses a `marko-mfe` tmux session and runs the project from there.

## Notes

This is a demo-first microfrontend setup rather than a production platform. The goal is to show how independent SSR fragments can be composed behind a neutral shell while keeping each fragment independently deployable and easy to reason about.
