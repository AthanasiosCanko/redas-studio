/* ── R-EDA'S STUDIO — landing page motion ────────────────
 * 1. Hero video: <source>s are injected unless the connection is
 *    constrained (saveData / 2g) — the poster (poster attribute + CSS
 *    background on .hero-media) renders in every other failure case, so
 *    the hero is never blank and never gated on an animation.
 * 2. Slow parallax on the hero media (0.12 × scroll, scaled by --motion).
 * 3. Scroll reveals (.rv → .rv--in) for the price list and booking section.
 *
 * Motion is intentionally NOT gated on prefers-reduced-motion — the owner
 * explicitly chose to run animations for everyone.
 */
(() => {
  'use strict';

  // ── Hero video ───────────────────────────────────────────
  const media = document.querySelector('.hero-media');
  const video = document.getElementById('hero-video');

  if (media && video) {
    const conn     = navigator.connection || {};
    const slowData = !!conn.saveData || /(^|\b)2g$/.test(conn.effectiveType || '');

    // If any playback path fails, drop the video element — the CSS poster
    // background on .hero-media takes over.
    const showPoster = () => { video.style.display = 'none'; };

    if (slowData) {
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

      video.addEventListener('error', showPoster);                       // fatal element error
      sources[sources.length - 1].addEventListener('error', showPoster); // source list exhausted
      video.load();
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* autoplay refused → poster stays */ });
    }

    // Slow parallax — the media layer drifts marginally slower than the
    // scroll. .hero-media is oversized (top:-9%, height:118%) so the drift
    // never exposes a gap.
    const motion = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--motion')
    ) || 1;
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
  }

  // ── Pinned horizontal price scroll ───────────────────────
  // Mirrors the CheaperTeam "how it works" drive: scroll progress through
  // the 280vh section translates the 300vw track by up to -66.666% (2 of 3
  // panels). ≤760px the CSS unpins the section and this becomes a no-op.
  const psSection = document.querySelector('.prices-scroll');
  const psTrack   = document.getElementById('ps-track');

  if (psSection && psTrack) {
    // Must mirror the unpin media query in styles.css — the pinned layout only
    // fits when the viewport is both wide enough and tall enough.
    const mq = matchMedia('(min-width: 761px) and (min-height: 761px)');
    let psTicking = false;

    const psApply = () => {
      psTicking = false;
      if (!mq.matches) { psTrack.style.transform = ''; return; }
      const total = psSection.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = Math.min(1, Math.max(0, -psSection.getBoundingClientRect().top / total));
      psTrack.style.transform = `translate3d(${(-p * 66.666).toFixed(3)}%, 0, 0)`;
    };

    addEventListener('scroll', () => {
      if (!psTicking) { psTicking = true; requestAnimationFrame(psApply); }
    }, { passive: true });
    addEventListener('resize', psApply);
    mq.addEventListener('change', psApply);
    psApply();
  }

  // ── Scroll reveals ───────────────────────────────────────
  // The hidden state is applied only under .rv-ready, so content stays
  // visible if this script never runs.
  document.documentElement.classList.add('rv-ready');

  const targets = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('rv--in');
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });
    targets.forEach(el => io.observe(el));
  } else {
    targets.forEach(el => el.classList.add('rv--in'));
  }
})();
