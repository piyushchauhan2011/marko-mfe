# Compression

How to enable Brotli and gzip compression for HTML responses and static assets, configure CDN headers correctly, and serve precompressed files.

---

## Why compression matters

Uncompressed text responses (HTML, CSS, JS, JSON) are the largest avoidable latency source after images. Brotli can compress a typical MFE JS bundle by 70–80% compared to uncompressed; gzip achieves 60–70%.

| Asset type | Typical uncompressed | After Brotli |
|---|---|---|
| React bundle (minified) | 45 KB | ~14 KB |
| Riot bundle (minified) | 12 KB | ~5 KB |
| Composer HTML page | 18 KB | ~4 KB |
| CSS file | 3 KB | ~1 KB |

---

## Brotli vs gzip

| | Brotli (`br`) | gzip |
|---|---|---|
| Compression ratio | Better (5–20% smaller than gzip) | Good |
| Browser support | All modern browsers (97%+) | Universal |
| Server CPU cost | Higher for dynamic compression | Lower |
| Precompressed files | `.br` extension | `.gz` extension |
| `Content-Encoding` header | `br` | `gzip` |

**Recommendation**: use Brotli for precompressed static assets (CSS/JS/fonts). Use gzip for dynamically compressed responses if CPU is constrained. Offer both and let the client negotiate via `Accept-Encoding`.

---

## Adding Fastify compression to the composer

Install the plugin:

```bash
pnpm --filter @marko-mfe/composer add @fastify/compress
```

Register it in `apps/composer/src/server.js` before route registration:

```js
const compress = require('@fastify/compress');

// Register before routes
await app.register(compress, {
  global: true,               // apply to all routes
  encodings: ['br', 'gzip'],  // prefer Brotli, fall back to gzip
  threshold: 1024,            // only compress responses > 1 KB
  brotliOptions: {
    params: {
      // Level 4 is a good balance of ratio and CPU cost for dynamic responses
      [require('node:zlib').constants.BROTLI_PARAM_QUALITY]: 4,
    },
  },
  zlibOptions: {
    level: 6,                 // gzip level 6 is the Node.js default
  },
});
```

This compresses all HTML responses from the composer including the streamed page. For streaming responses Fastify Compress wraps the stream transparently.

---

## Adding compression to fragment servers

Fragment servers use Node's built-in `http.createServer`. Use the `compressible` package and Node's `zlib` module for inline middleware:

```js
const zlib = require('node:zlib');

function compress(req, res, body) {
  const accept = req.headers['accept-encoding'] || '';
  const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(body);

  if (accept.includes('br')) {
    res.setHeader('Content-Encoding', 'br');
    return zlib.brotliCompressSync(bodyBuf, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
    });
  }
  if (accept.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    return zlib.gzipSync(bodyBuf, { level: 6 });
  }
  return bodyBuf;
}
```

Use it when calling `res.end(body)`:

```js
res.end(compress(req, res, html));
```

---

## Precompressed static assets on the CDN server

For files that don't change between requests (JS bundles, CSS, fonts), precompressing at build time is better than compressing on every request.

### Step 1: precompress during build

Add to `apps/cdn/src/sync-assets.js` after copying each file:

```js
const zlib = require('node:zlib');

function precompress(filePath) {
  const content = fs.readFileSync(filePath);

  fs.writeFileSync(
    filePath + '.br',
    zlib.brotliCompressSync(content, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }, // max quality for precompressed
    })
  );

  fs.writeFileSync(
    filePath + '.gz',
    zlib.gzipSync(content, { level: 9 })
  );
}

// After copying each asset:
precompress(path.join(publicDir, 'search.js'));
precompress(path.join(publicDir, 'local-highlights.js'));
// ...
```

Quality 11 (Brotli max) is fine at build time because it's done once. Do not use it for dynamic responses.

### Step 2: serve precompressed files

In `apps/cdn/src/server.js` check `Accept-Encoding` and serve the precompressed variant:

```js
app.get('/assets/:filename', (request, reply) => {
  const { filename } = request.params;
  const accept = request.headers['accept-encoding'] || '';
  const base = path.join(publicDir, filename);

  if (accept.includes('br') && fs.existsSync(base + '.br')) {
    reply.header('Content-Encoding', 'br');
    reply.header('Vary', 'Accept-Encoding');
    return reply.sendFile(filename + '.br');
  }
  if (accept.includes('gzip') && fs.existsSync(base + '.gz')) {
    reply.header('Content-Encoding', 'gzip');
    reply.header('Vary', 'Accept-Encoding');
    return reply.sendFile(filename + '.gz');
  }
  return reply.sendFile(filename);
});
```

---

## Cache-Control headers

Static assets (JS bundles, CSS) should be served with long-lived `Cache-Control`. Content-hash the filenames so new deploys bust the cache:

```
Cache-Control: public, max-age=31536000, immutable
```

Dynamic HTML responses from the composer should not be cached by default:

```
Cache-Control: no-store
```

For SSR HTML that can be shared across users (e.g. the hotel listing page without personalisation):

```
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

This tells a CDN to cache for 60 seconds and serve stale for 5 minutes while revalidating in the background.

### Adding `Vary: Accept-Encoding`

Any response that changes based on compression negotiation must include `Vary: Accept-Encoding`. Without it, a CDN or intermediate proxy might serve a Brotli-compressed body to a client that only accepts gzip.

---

## `.gitignore` note

Precompressed `.br` and `.gz` files in `apps/cdn/public/assets/` are generated artifacts and should be gitignored. The existing `.gitignore` already ignores `apps/cdn/public/assets/` so this is covered.

---

## Checklist

- [ ] Add `@fastify/compress` to composer with `encodings: ['br', 'gzip']`.
- [ ] Add inline gzip/Brotli middleware to fragment servers for HTML responses.
- [ ] Add precompression step for JS/CSS in `sync-assets.js`.
- [ ] Update CDN server to serve `.br` / `.gz` files when client advertises support.
- [ ] Add `Vary: Accept-Encoding` to all compressed responses.
- [ ] Set `Cache-Control: public, max-age=31536000, immutable` for hashed JS/CSS assets.
- [ ] Set `Cache-Control: no-store` for HTML composer responses (personalised).
- [ ] Verify `.br` and `.gz` files remain gitignored.
