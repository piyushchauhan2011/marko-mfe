# CI/CD and DevOps

How to set up a continuous integration and deployment pipeline for the HarborStay monorepo, leverage Turborepo's caching, containerise fragment builds, and run smoke tests.

---

## Pipeline overview

```
git push
  └── CI triggered
        ├── pnpm install
        ├── turbo run build          ← only changed packages (remote cache)
        ├── turbo run lint           ← only changed packages
        ├── smoke tests              ← start servers, curl health endpoints
        └── docker build + push      ← per-changed fragment only
              └── deploy
```

The key efficiency gain is **Turborepo remote caching**: if a fragment's source hasn't changed, its build is skipped entirely using a cached artifact. Only fragments that changed are rebuilt and redeployed.

---

## GitHub Actions workflow

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}    # for Turbo remote cache
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build    # turbo run build, respects remote cache

      - name: Lint
        run: pnpm lint

      - name: Smoke test
        run: node scripts/smoke-test.js
```

---

## Turborepo remote caching

Remote caching stores build artifacts in a shared cache so CI builds (and team members' local builds) skip unchanged work.

### Setup with Vercel Remote Cache (free for open source)

1. Create a free account at [turbo.build](https://turbo.build).
2. Run `npx turbo login` locally.
3. Run `npx turbo link` in the repo root.
4. Add `TURBO_TOKEN` and `TURBO_TEAM` as repository secrets in GitHub.

In CI the `turbo run build` command will check the remote cache before running any build script.

### Self-hosted cache (open source alternative)

Use [ducktape-turborepo-remote-cache](https://github.com/ducktors/turborepo-remote-cache) or any compatible S3-compatible storage. Set:

```
TURBO_API=https://your-cache-server.example.com
TURBO_TOKEN=your-token
TURBO_TEAM=your-team
```

---

## Smoke test script

Add `scripts/smoke-test.js` to verify all servers start and respond correctly:

```js
const { execSync, spawn } = require('node:child_process');
const http = require('node:http');

const SERVERS = [
  { filter: '@marko-mfe/cdn', port: 3200, path: '/health' },
  { filter: '@marko-mfe/navigation', port: 3101, path: '/' },
  { filter: '@marko-mfe/hotel-search', port: 3102, path: '/manifest' },
  { filter: '@marko-mfe/local-highlights', port: 3106, path: '/manifest' },
  { filter: '@marko-mfe/experiences-discovery', port: 3107, path: '/manifest' },
  { filter: '@marko-mfe/experiences-itinerary', port: 3108, path: '/manifest' },
  { filter: '@marko-mfe/composer', port: 3100, path: '/health' },
];

async function waitForPort(port, retries = 20) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 500));
    const ok = await new Promise(resolve => {
      http.get({ host: 'localhost', port, path: '/' }, () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (ok) return;
  }
  throw new Error(`Port ${port} never became available`);
}

async function main() {
  const processes = SERVERS.map(({ filter }) =>
    spawn('pnpm', ['--filter', filter, 'start'], { stdio: 'ignore' })
  );

  try {
    await Promise.all(SERVERS.map(({ port }) => waitForPort(port)));

    for (const { port, path, filter } of SERVERS) {
      await new Promise((resolve, reject) => {
        http.get({ host: 'localhost', port, path }, (res) => {
          if (res.statusCode >= 400) reject(new Error(`${filter} responded ${res.statusCode}`));
          else resolve();
        }).on('error', reject);
      });
      console.log(`✓ ${filter} (:${port}${path})`);
    }
    console.log('All smoke tests passed.');
  } finally {
    processes.forEach(p => p.kill());
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

---

## Docker build in CI

### Build only changed fragments

Turbo's `--filter` flag combined with `--affected` (or explicit filters per changed path) avoids building unchanged images:

```yaml
- name: Detect changed apps
  id: changes
  run: |
    echo "hotel_search=$(git diff --name-only origin/main HEAD | grep -q 'apps/hotel-search' && echo true || echo false)" >> $GITHUB_OUTPUT

- name: Build hotel-search image
  if: steps.changes.outputs.hotel_search == 'true'
  run: |
    docker build -f apps/hotel-search/Dockerfile \
      -t ghcr.io/yourorg/mfe-hotel-search:${{ github.sha }} .
    docker push ghcr.io/yourorg/mfe-hotel-search:${{ github.sha }}
```

### Docker layer caching

```yaml
- uses: docker/setup-buildx-action@v3

- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    context: .
    file: apps/hotel-search/Dockerfile
    cache-from: type=gha
    cache-to: type=gha,mode=max
    push: true
    tags: ghcr.io/yourorg/mfe-hotel-search:${{ github.sha }}
```

---

## Deployment step

After building and pushing images, trigger deployment. The exact step depends on your platform:

### Kubernetes (kubectl rollout)

```yaml
- name: Deploy hotel-search
  if: steps.changes.outputs.hotel_search == 'true'
  run: |
    kubectl set image deployment/mfe-hotel-search \
      server=ghcr.io/yourorg/mfe-hotel-search:${{ github.sha }}
    kubectl rollout status deployment/mfe-hotel-search
```

### AWS ECS

```yaml
- name: Deploy hotel-search to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: ecs-task-hotel-search.json
    service: mfe-hotel-search
    cluster: harborstay-prod
    wait-for-service-stability: true
```

---

## Local DevOps: Makefile commands

The project `Makefile` provides:

| Command | Description |
|---|---|
| `make dev` | Start all servers in tmux |
| `make tmux` | Create or attach to tmux session |
| `make stop` | Kill tmux session and all bound ports (3100–3108, 3200) |

Extend the Makefile with:

```makefile
build:
	pnpm build

test:
	node scripts/smoke-test.js

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
```

---

## Observability

Add structured logging and tracing as the project scales:

- **Logging**: use `pino` with Fastify (the composer already uses Fastify). Set `logger: true` in `apps/composer/src/server.js`.
- **Distributed tracing**: add OpenTelemetry auto-instrumentation to trace composer → fragment fetch calls.
- **Metrics**: expose a `GET /metrics` Prometheus endpoint per fragment. Use `prom-client`.
- **Error monitoring**: send uncaught exceptions to Sentry or Honeybadger with `node --unhandled-rejections=strict`.

---

## Checklist

- [ ] Add `.github/workflows/ci.yml` with build, lint, and smoke test jobs.
- [ ] Configure Turbo remote caching with `TURBO_TOKEN` and `TURBO_TEAM`.
- [ ] Add `scripts/smoke-test.js` to the repo.
- [ ] Add per-fragment `Dockerfile` (see [deployment.md](./deployment.md)).
- [ ] Use `docker/build-push-action` with `cache-from: type=gha` for layer caching.
- [ ] Add changed-file detection to skip unchanged fragment image builds.
- [ ] Configure Kubernetes / ECS deploy step with rollout status check.
- [ ] Add `pino` logging to the composer Fastify instance.
- [ ] Add OpenTelemetry instrumentation for composer → fragment fetch tracing.
