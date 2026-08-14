# Decisions

- **Motion is intentionally NOT gated on `prefers-reduced-motion`** — the owner explicitly
  decided (2026-08-14) that animations and the hero video run for everyone. Do not
  reintroduce reduced-motion gates without asking. The `saveData`/2g gate in `hero.js`
  stays; that one is about data cost, not motion.
- **Denied/cancelled bookings are kept as records** (visible under the *All* filter) rather
  than deleted, and free their time slot again.
- **Deploy by pushing, not running locally** — GitHub auto-deploys to Render.
