# Deployment

How to deploy the HarborStay monorepo as independent fragment services, configure environment variables for production, and roll deploys without downtime.

---

## Deployment model

Each fragment app is an independent Node.js HTTP server. In production, deploy each as its own container or process. The composer is the only service the end user's DNS resolves to.

```
[User] → [Load Balancer / CDN] → [Composer :3100]
                                      │
                          ┌───────────┼────────────┐
                          ▼           ▼             ▼
                  [Navigation]  [Hotel-Search]  [Local-Highlights]
                  [Hotel-Details] [Reviews]   [Recommendations]
                  [Experiences-Discovery] [Experiences-Itinerary]

[CDN / Object Storage] ← static assets served from apps/cdn or a real CDN
```

The composer does not need to be in the same datacenter as the fragments, but network latency between composer and fragments directly affects page TTFB. Co-locate them in the same region or VPC.

---

## Environment variables

Every fragment server reads `CDN_BASE_URL` to generate asset URLs in its manifest and SSR HTML:

| Variable | Default | Description |
|---|---|---|
| `PORT` | see per-app default | Port the server binds to |
| `CDN_BASE_URL` | `http://localhost:3200` | Base URL for CDN-served assets |

The composer reads fragment base URLs from its `FRAGMENTS` object. In production, these should also come from environment variables:

```js
// apps/composer/src/server.js — production enhancement
const FRAGMENTS = {
  navigation:               process.env.FRAGMENT_NAVIGATION_URL   || 'http://localhost:3101',
  search:                   process.env.FRAGMENT_SEARCH_URL        || 'http://localhost:3102',
  details:                  process.env.FRAGMENT_DETAILS_URL       || 'http://localhost:3103',
  reviews:                  process.env.FRAGMENT_REVIEWS_URL       || 'http://localhost:3104',
  recommendations:          process.env.FRAGMENT_RECOMMENDATIONS_URL || 'http://localhost:3105',
  experiences:              process.env.FRAGMENT_EXPERIENCES_URL   || 'http://localhost:3106',
  'experiences-discovery':  process.env.FRAGMENT_DISCOVERY_URL    || 'http://localhost:3107',
  'experiences-itinerary':  process.env.FRAGMENT_ITINERARY_URL    || 'http://localhost:3108',
};
```

---

## Dockerfile pattern (per fragment)

Each app gets its own `Dockerfile` for independent deployment.

### Multi-stage build

```dockerfile
# Stage 1: Install and build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only the workspace files needed for this fragment
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/mock-data ./packages/mock-data
COPY apps/hotel-search ./apps/hotel-search

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @marko-mfe/hotel-search build

# Stage 2: Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/hotel-search ./apps/hotel-search

EXPOSE 3102
CMD ["node", "apps/hotel-search/src/server.js"]
```

The same pattern applies to every fragment — change the `--filter` flag and the `EXPOSE` port.

### CDN container

The CDN app needs access to pre-built asset files. In production you would typically push assets to a real CDN (S3, Cloudflare R2, GCS) during the build pipeline. For the simulation container:

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/cdn ./apps/cdn
# Generated JS bundles must already exist in apps/cdn/public/assets/
# Ensure the build pipeline ran build-client.js for all fragments before building this image.

EXPOSE 3200
CMD ["node", "apps/cdn/src/server.js"]
```

---

## Health endpoints

Every fragment exposes a `/health` or root endpoint. The composer has an explicit one:

```js
// apps/composer/src/server.js
app.get('/health', async () => ({ ok: true, hotel: getHotelById('harbor-view').name }));
```

Fragment servers respond with `200` on any non-asset request as a de-facto health check. For production, add explicit `/health` handlers to each fragment server that:

1. Return `200 { ok: true }` when the server is ready.
2. Check any critical dependency (database, external API) and return `503` if unavailable.

Use these as liveness and readiness probes in Kubernetes or ECS health checks.

---

## Port assignments and service discovery

In production, replace hardcoded ports with DNS-based service discovery. Each fragment registers under a stable hostname:

| Service | Production hostname example |
|---|---|
| Composer | `composer.internal.harborstay.com` |
| Navigation | `mfe-navigation.internal.harborstay.com` |
| Hotel Search | `mfe-hotel-search.internal.harborstay.com` |
| Hotel Details | `mfe-hotel-details.internal.harborstay.com` |
| Reviews | `mfe-reviews.internal.harborstay.com` |
| Recommendations | `mfe-recommendations.internal.harborstay.com` |
| Local Highlights | `mfe-local-highlights.internal.harborstay.com` |
| Experiences Discovery | `mfe-experiences-discovery.internal.harborstay.com` |
| Experiences Itinerary | `mfe-experiences-itinerary.internal.harborstay.com` |
| CDN / Assets | `cdn.harborstay.com` |

Set `FRAGMENT_<NAME>_URL` environment variables to these hostnames in each deployment.

---

## Zero-downtime rolling deploys

Because each fragment is independent, you can deploy them one at a time without downtime.

### Rolling deploy order

1. Deploy the CDN / assets update first. New asset filenames (content-hashed) are safe to publish before the fragment servers that reference them.
2. Deploy fragment servers (any order). The composer's `safeRenderFragment` catches errors and renders a fallback:

```js
// apps/composer/src/server.js
async function safeRenderFragment(key, hotelId, delayMs = 0) {
  try {
    return await renderFragment(key, hotelId);
  } catch (error) {
    return {
      html: `<div class="fragment-error">${key} fragment is warming up.</div>`,
      cssUrl: '',
      jsUrl: '',
    };
  }
}
```

If a fragment is restarting during deployment, the composer renders the fallback message rather than a 500 error.

3. Deploy the composer last.

### Blue/green deploys

For zero-risk deploys, run the new version alongside the old. Shift traffic gradually using weighted routing (e.g. AWS ALB or Nginx upstream weights).

---

## Secrets management

Do not hardcode API keys, database credentials, or internal service tokens in source code. Use:

- **Development**: `.env` files (gitignored) read with `dotenv` or Node's `--env-file` flag.
- **Production**: environment variables injected by the runtime (Kubernetes secrets, ECS task definition secrets, Doppler, AWS Secrets Manager).

Add `--env-file .env` to dev scripts as needed:

```json
"dev": "node --env-file .env src/server.js"
```

---

## Checklist

- [ ] Add `Dockerfile` to each fragment app.
- [ ] Add explicit `/health` endpoint to each fragment server.
- [ ] Move `FRAGMENTS` URLs in composer to environment variables.
- [ ] Set `CDN_BASE_URL` environment variable per environment (dev / staging / prod).
- [ ] Deploy CDN/assets first, then fragments, then composer.
- [ ] Verify `safeRenderFragment` fallbacks work when a fragment is temporarily unavailable.
- [ ] Set up container health checks pointing to `/health`.
- [ ] Do not commit `.env` files; add to `.gitignore` if not already.
