# HarborStay Docs

Developer documentation for the HarborStay Marko SSR microfrontend monorepo.

These docs are practitioner-oriented: they reference actual filenames, ports, and patterns from this codebase rather than offering abstract advice.

## Contents

| Document | What it covers |
|---|---|
| [Architecture](./architecture.md) | Composer shell, fragment protocol, port map, CDN simulation, multi-runtime summary |
| [LCP, FCP, and INP](./performance-lcp-fcp-inp.md) | Web Vitals and how SSR streaming affects them in this architecture |
| [Fonts and images](./performance-fonts-images.md) | FOIT/FOUT mitigation, image formats, lazy loading, compression |
| [JavaScript loading and Islands](./performance-js-loading.md) | Islands architecture, deferred hydration, Intersection Observer loading, code splitting |
| [Compression](./performance-compression.md) | Brotli, gzip, CDN headers, precompressed static assets |
| [State management](./state-management.md) | Fragment-local state, URL state, BroadcastChannel, cross-MFE communication patterns |
| [SSR and hydration](./ssr-and-hydration.md) | Marko streaming, React renderToString, Riot pre-render, serialised props, hydration pitfalls |
| [Deployment](./deployment.md) | Per-fragment containers, environment variables, health endpoints, rolling deploys |
| [CI/CD and DevOps](./ci-cd-devops.md) | GitHub Actions pipeline, Turbo remote caching, Docker multi-stage builds, smoke tests |
| [Future optimizations](./future-optimizations.md) | Edge SSR, partial prerendering, service workers, RSC, forward-looking checklist |

## Quick navigation

- **New to the project?** Start with [Architecture](./architecture.md) then [SSR and hydration](./ssr-and-hydration.md).
- **Working on frontend performance?** Read [LCP/FCP/INP](./performance-lcp-fcp-inp.md), [JavaScript loading](./performance-js-loading.md), and [Fonts and images](./performance-fonts-images.md).
- **Preparing for production?** Read [Compression](./performance-compression.md), [Deployment](./deployment.md), and [CI/CD](./ci-cd-devops.md).
- **Thinking about scale?** See [State management](./state-management.md) and [Future optimizations](./future-optimizations.md).
