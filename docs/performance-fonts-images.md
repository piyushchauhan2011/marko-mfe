# Fonts and Images

Strategies for preventing Flash of Invisible Text (FOIT), Flash of Unstyled Text (FOUT), optimising image delivery, and using compression for all static assets.

---

## Fonts

### The problem: FOIT and FOUT

| Term | What happens | User experience |
|---|---|---|
| **FOIT** | Browser hides text while custom font loads | Blank text for up to 3 s |
| **FOUT** | Browser shows fallback font, then swaps to custom font on load | Layout shift / visual flash |

This project currently relies on the system `Inter` font stack (`font-family: Inter, "Segoe UI", sans-serif`). If you add a self-hosted or Google font, the following applies.

### `font-display: swap`

Always add `font-display: swap` to `@font-face` declarations. This renders text immediately with the fallback, then swaps when the custom font loads — FOUT instead of FOIT. FOUT is nearly always preferable.

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-variable.woff2') format('woff2');
  font-display: swap;
  font-weight: 100 900;
}
```

### Preloading critical fonts

Preload the subset that covers the above-the-fold `<h1>` and navigation text. Add to the composer `<head>`:

```html
<link rel="preload" href="https://cdn.example.com/fonts/inter-variable.woff2"
      as="font" type="font/woff2" crossorigin="anonymous">
```

For the CDN-served font, add the preload in `apps/composer/src/server.js` inside the `headPrefix` string template that both `buildPage` and `streamPage` emit.

### Font subsetting

If fonts ship all Unicode ranges, the file is large. Use a tool like `pyftsubset` or Fonttools to generate a Latin subset `woff2` that covers only the characters in the UI. This can reduce a 400 KB variable font to under 30 KB.

### System font fallback sizing

FOUT causes layout shift because fallback fonts (Arial, Helvetica) have different metrics than Inter. Use `size-adjust`, `ascent-override`, and `descent-override` to match the fallback to Inter's metrics:

```css
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  font-display: swap;
}
```

Reference: [CSS `size-adjust` — web.dev](https://web.dev/css-size-adjust/)

---

## Images

### Formats

Use modern image formats in this priority order:

| Format | Best for | Browser support |
|---|---|---|
| **AVIF** | Photos, complex gradients | 96%+ modern browsers |
| **WebP** | Most images | ~97% |
| **JPEG** | Fallback for photos | Universal |
| **PNG** | Fallback for transparency | Universal |

Serve with `<picture>` and `srcset` for format negotiation:

```html
<picture>
  <source srcset="/assets/harbor-view.avif" type="image/avif">
  <source srcset="/assets/harbor-view.webp" type="image/webp">
  <img src="/assets/harbor-view.jpg"
       alt="Harbor View Lodge"
       width="440" height="280"
       loading="lazy"
       decoding="async">
</picture>
```

### Responsive sizing (`srcset` + `sizes`)

```html
<img
  srcset="/assets/hotel-sm.webp 480w, /assets/hotel-md.webp 900w, /assets/hotel-lg.webp 1400w"
  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 440px"
  src="/assets/hotel-lg.webp"
  alt="Hotel thumbnail"
  loading="lazy">
```

The `sizes` attribute tells the browser which source to use before layout resolves, avoiding a wasted re-download.

### Lazy loading

All below-the-fold images should have `loading="lazy"`. This is a one-attribute win — no JS needed. The hotel thumbnail placeholder elements in the Marko templates (`.hotel-thumb`) currently use CSS background gradients rather than `<img>` tags, but real hotel photography should use `<img loading="lazy">`.

**Do not** lazy-load the LCP image. The image that appears in the viewport above the fold must have `loading="eager"` (the default) so the browser can fetch it immediately.

### Explicit dimensions

Always set `width` and `height` on `<img>` elements. This lets the browser reserve space before the image loads, preventing layout shift (CLS).

### CDN image optimisation

In production, route image requests through an image CDN (Cloudflare Images, Imgix, Fastly IO) that applies:

- Format negotiation via `Accept` header
- On-demand resize
- Quality tuning
- Automatic compression

Your `CDN_BASE_URL` environment variable in each fragment server is the right place to configure this endpoint.

---

## Compression

See [performance-compression.md](./performance-compression.md) for Brotli and gzip setup for all asset types including fonts and images.

---

## Checklist

- [ ] Add `font-display: swap` if using a custom font.
- [ ] Preload above-the-fold font variants in the composer `<head>`.
- [ ] Subset fonts to Latin ranges only.
- [ ] Add `size-adjust` fallback `@font-face` to reduce FOUT CLS.
- [ ] Convert hotel images to WebP/AVIF with JPEG/PNG fallback.
- [ ] Set `width` and `height` on all `<img>` elements.
- [ ] Add `loading="lazy"` to below-the-fold images.
- [ ] Add `loading="eager"` explicitly to the LCP image.
- [ ] Add `decoding="async"` to non-critical images.
- [ ] Serve images via an image CDN in production.
