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
import './styles/preloader.css';
import './styles/building-viewer.css';

// ── JS Module Imports ────────────────────────────────────────────
import { initNav }          from './js/nav.js';
import { initScrollReveal } from './js/scrollReveal.js';
import { initParticles }    from './js/particles.js';
import { initCounters }     from './js/counter.js';
import { initCarousel }     from './js/carousel.js';
import { initMapOverlay }   from './js/mapOverlay.js';
import { initModel3D }      from './js/model3D.js';

// ── Lift critical-CSS visibility lock ─────────────────────────────
// The inline <style> in index.html hides body > * to prevent the
// FOUC white flash. Once the bundle executes, restore visibility.
(function restoreVisibility() {
  const style = document.createElement('style');
  // Restore visibility lock AND overflow (critical CSS had overflow:hidden to prevent FOUC)
  style.textContent = [
    'body > *:not(#tikad-preloader){visibility:visible!important}',
    'html{background:transparent!important;overflow-y:auto!important}',
    'body{background:transparent!important;overflow-x:hidden!important;overflow-y:auto!important}'
  ].join(' ');
  document.head.appendChild(style);
})();

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
