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
import './styles/team.css';
import './styles/cta-footer.css';
import './styles/map-overlay.css';

// ── JS Module Imports ────────────────────────────────────────────
import { initNav }          from './js/nav.js';
import { initScrollReveal } from './js/scrollReveal.js';
import { initParticles }    from './js/particles.js';
import { initCounters }     from './js/counter.js';
import { initCarousel }     from './js/carousel.js';
import { initMapOverlay }   from './js/mapOverlay.js';
import { initModel3D }      from './js/model3D.js';

// ── Bootstrap ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initScrollReveal();
  initParticles();
  initCounters();
  initCarousel();
  initMapOverlay();
  initModel3D();
});
