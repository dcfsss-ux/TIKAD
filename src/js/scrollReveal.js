/**
 * scrollReveal.js – Intersection Observer scroll reveal animations
 */
export function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12 },
  );

  document
    .querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    .forEach((el) => observer.observe(el));
}
