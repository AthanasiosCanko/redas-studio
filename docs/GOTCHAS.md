# Gotchas

- **`sw.js` deliberately bypasses `.mp4`/`.webm`** — intercepting media Range requests
  breaks iOS playback, and multi-MB media must not enter the SW cache.
- **Push, SMS and email are each a graceful no-op when their keys are absent** — the
  booking still succeeds, so nothing surfaces an error. Variables in
  [OPERATIONS.md](./OPERATIONS.md).
- **Add the admin PWA to the iOS home screen from the `/admin` URL** in Safari, so the app
  launches the dashboard rather than the landing page.
- **The hero clip is loop-crossfaded at encode time** (first frame == last frame);
  regenerate with the same xfade recipe if the footage is ever replaced.
