/**
 * counter.js – Animated stat counters triggered by IntersectionObserver
 */
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const step = target / 50;
  const timer = setInterval(() => {
    start += step;
    if (start >= target) {
      el.textContent = target + suffix;
      clearInterval(timer);
      return;
    }
    el.textContent = Math.floor(start) + suffix;
  }, 30);
}

export function initCounters() {
  const statRow = document.querySelector('.stat-row');
  if (!statRow) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll('[data-count]').forEach((el) => {
            animateCounter(el, +el.dataset.count, el.dataset.suffix || '');
          });
          observer.disconnect();
        }
      });
    },
    { threshold: 0.5 },
  );

  observer.observe(statRow);
}
