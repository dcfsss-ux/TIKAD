/**
 * nav.js – Navigation scroll shadow effect + active section highlighting
 */
export function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // ── Scrolled class for nav background ─────────────────────────
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
    updateActiveLink();
  });

  // ── Mobile menu toggle ────────────────────────────────────────
  const toggleBtn = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    // Close mobile menu when a navigation link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggleBtn.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // ── Active section highlight ──────────────────────────────────
  function updateActiveLink() {
    const sections = ['home', 'about', 'features', 'team'];
    const links = document.querySelectorAll('.nav-links a');
    const scrollY = window.scrollY + 80; // offset for fixed nav height

    let currentSection = 'home';

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) {
        currentSection = id;
      }
    });

    links.forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${currentSection}`);
    });
  }

  // Set initial active state on page load
  updateActiveLink();
}
