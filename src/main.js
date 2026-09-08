/**
 * main.js – Application entry point
 * Imports all CSS modules and initialises all JS features.
 */

// ── CSS Imports ──────────────────────────────────────────────────
import './styles/base.css';
import './styles/animations.css';
import './styles/nav.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/cta-footer.css';
import './styles/map-overlay.css';
import './styles/preloader.css';
import './styles/building-viewer.css';
import './styles/team-blur-reveal.css';

// ── JS Module Imports ────────────────────────────────────────────
import { initNav }            from './js/nav.js';
import { initScrollReveal }   from './js/scrollReveal.js';
import { initCounters }       from './js/counter.js';
import { initMapOverlay }     from './js/mapOverlay.js';
import { initModel3D }        from './js/model3D.js';
import { initTeamBlurReveal } from './js/teamBlurReveal.js';
import { BalangayPreloader } from './js/balangayPreloader.js';


// ── Bootstrap ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initCounters();
  initMapOverlay();
  initModel3D();
  initTeamBlurReveal();

  const heroVideo = document.querySelector('.hero-bg-video');
  if (heroVideo) {
    heroVideo.play().catch(() => {});
  }
});
