# Architecture

## Stack

- **Frontend** — plain HTML/CSS/JS (no build step)
- **Backend** — Node.js + Express (`server.js`): static files + REST API
- **Database** — Postgres on Neon (serverless); `DATABASE_URL` set in Render
- **Auth** — Admin JWT via `POST /api/admin/login`, token in `sessionStorage`
- **PWA** — installable; service worker (`sw.js`) + Web Push to admin on new requests

## Project structure

```
index.html          — public landing page (video hero, price list, booking calendar)
admin.html          — admin dashboard (bookings + availability)
styles.css          — design tokens, video-hero, price-list
booking.css         — calendar, wheel time picker, booking modal
admin.css           — admin-only styles
booking.js          — public booking calendar + request flow
admin.js            — admin logic (JWT auth, push subscribe, API calls)
timepicker.js       — shared wheel time picker (RedaTimePicker.create)
hero.js             — hero video loader (saveData/2g gate), parallax, scroll reveals,
                      pinned horizontal price-category scroll
server.js           — Express: static serving + REST API + DB bootstrap
sw.js               — service worker (network-first nav, cache-first assets, push)
manifest.json       — PWA manifest, public site (start_url "/")
manifest-admin.json — PWA manifest, admin app (start_url "/admin")
render.yaml         — Render Blueprint (web service only; DB is external Neon)
test/smoke.test.js  — dependency-free smoke tests
assets/             — logo, PWA icons, hero video (mp4+webm, ≤3MB) + poster
```

## Booking window & request lifecycle

- Clients may request any time from **09:00 to 20:00** in **5-minute** steps (20:00 is the
  last bookable start). Enforced in `server.js` (`isValidTime`) and the time picker.
- A request is created as **pending** and locks that exact time so no one else can take it.
- The admin transitions it: `pending → accepted` (accept), `pending → denied` (deny), or
  `accepted → cancelled` (cancel). Denied/cancelled rows are **kept as records** (visible
  under the *All* filter) and free the time up again.
- Same-day times already past in Albania local time (`Europe/Tirane`) cannot be requested.

Tables are created automatically on startup (`CREATE TABLE IF NOT EXISTS`).

## Front-end & motion conventions

- `hero.js` injects the video `<source>`s unless the connection is constrained
  (`saveData`/2g); otherwise the poster renders (both the `poster` attribute and a CSS
  background on `.hero-media`), so the hero is never blank, and never gated on an animation.
- `--motion` (`:root`) scales parallax amplitude; `--ease-out-strong`
  (`cubic-bezier(0.23,1,0.32,1)`) is the shared entrance easing.
- Hero children stagger in on load (`hero-rise`, fill-mode `backwards` so `:active`/hover
  styles survive). Below the fold, `.rv` elements reveal via IntersectionObserver
  (`.rv--in`; price rows cascade with nth-child delays). The hidden state applies only
  under `html.rv-ready`, so content stays visible without JS.
