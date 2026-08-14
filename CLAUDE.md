# R-EDA'S STUDIO

Booking site for a nail & make-up salon in Tirana, Albania (r-edas.al). Clients request a
time on a wheel picker; the admin accepts or denies it, and the client is notified by
**Infobip** SMS and **Gmail** email. Plain HTML/CSS/JS with no build step, on **Render**
against **Neon** Postgres.

## Docs — read the relevant one before working

| File | Read it when |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Touching code — stack, file layout, booking lifecycle, motion/CSS conventions |
| [docs/OPERATIONS.md](./docs/OPERATIONS.md) | Deploying, running tests, using the admin panel, enabling SMS/email/push |
| [docs/GOTCHAS.md](./docs/GOTCHAS.md) | Touching the service worker or hero video, or chasing a missing notification |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Something looks wrong — check before "fixing" it |

## Non-obvious things worth knowing up front

- **Deploy by pushing; do not run the app locally** — no local database exists.
- **Notifications fail silently without their env vars** — the booking still succeeds.
- **Motion is deliberately not gated on `prefers-reduced-motion`** — do not reintroduce it.
- **`sw.js` must keep bypassing `.mp4`/`.webm`** — otherwise iOS playback breaks.
- **Install the admin PWA from the `/admin` URL on iOS**, or it opens the landing page.
