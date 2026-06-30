/**
 * nav.js – Navigation scroll shadow effect
 */
export function initNav() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });

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
}
