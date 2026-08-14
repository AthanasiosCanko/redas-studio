/* ── R-EDA'S STUDIO — hero video ─────────────────────────
 * The <video> ships with no sources; this script injects them only when the
 * connection and motion preferences allow it. In every other case the poster
 * (both the poster attribute and the CSS background on .hero-media) renders,
 * so the hero is never blank. Hero visibility is NEVER gated on an animation.
 *
 * --motion (1 / 0.25) scales the parallax amplitude; prefers-reduced-motion
 * sets it to 0.25 in CSS. Append ?motion=1 to force full motion (testing).
 */
(() => {
  'use strict';

  const media = document.querySelector('.hero-media');
  const video = document.getElementById('hero-video');
  if (!media || !video) return;

  const override = /[?&]motion=1\b/.test(location.search);
  if (override) document.documentElement.style.setProperty('--motion', '1');

  const motion = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--motion')
  ) || 1;

  const conn     = navigator.connection || {};
  const slowData = !!conn.saveData || /(^|\b)2g$/.test(conn.effectiveType || '');
  const reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches && !override;

  // If any playback path fails, drop the video element — the CSS poster
  // background on .hero-media takes over. The hero never goes blank.
  const showPoster = () => { video.style.display = 'none'; };

  if (slowData || reduced) {
    // Reduced motion or constrained data: no video bytes at all — the poster
    // IS the hero. (Stronger form of "pause the video and show the poster".)
    video.removeAttribute('autoplay');
    showPoster();
  } else {
    const sources = [
      ['assets/hero-video.webm', 'video/webm'],
      ['assets/hero-video.mp4',  'video/mp4'],
    ].map(([src, type]) => {
      const el = document.createElement('source');
      el.src = src;
      el.type = type;
      video.appendChild(el);
      return el;
    });

    video.addEventListener('error', showPoster);                 // fatal element error
    sources[sources.length - 1].addEventListener('error', showPoster); // source list exhausted
    video.load();
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* autoplay refused → poster stays */ });
  }

  // Slow parallax — the media layer drifts marginally slower than the scroll.
  // .hero-media is oversized (top:-9%, height:118%) so the drift never exposes
  // a gap. Amplitude scales with --motion.
  let ticking = false;
  const apply = () => {
    ticking = false;
    const y = Math.min(window.scrollY || 0, window.innerHeight);
    media.style.transform = `translate3d(0, ${(y * 0.12 * motion).toFixed(1)}px, 0)`;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }, { passive: true });
  apply();
})();
