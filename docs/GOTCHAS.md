# Gotchas

- **`sw.js` deliberately bypasses `.mp4`/`.webm`** — intercepting media Range requests
  breaks iOS playback, and multi-MB media must not enter the SW cache.
- **Rate limits live in process memory and key on `CF-Connecting-IP`** (`clientKey` in
  `server.js`) — Render serves every app through Cloudflare, so `X-Forwarded-For` ends at a
  shared Cloudflare edge; never switch to `req.ip` with `trust proxy`. Counts reset on every
  deploy and would split across instances if the service were ever scaled past one.
- **Static files are an allow-list** (`PUBLIC_FILES` in `server.js`, plus `assets/`) — a
  new page, script or stylesheet 404s until it is added there.
- **Push, SMS and email are each a graceful no-op when their keys are absent** — the
  booking still succeeds, so nothing surfaces an error. Variables in
  [OPERATIONS.md](./OPERATIONS.md).
- **Add the admin PWA to the iOS home screen from the `/admin` URL** in Safari, so the app
  launches the dashboard rather than the landing page.
- **The price-scroll unpin query is duplicated** in `styles.css` and `hero.js`'s
  `matchMedia` — keep them equal or the pinned layout overlaps the brand strips.
- **The hero clip is loop-crossfaded at encode time** (first frame == last frame);
  regenerate with the same xfade recipe if the footage is ever replaced.
