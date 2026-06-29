/**
 * carousel.js – Team member carousel with auto-advance, dots, prev/next
 */
export function initCarousel() {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  const currentEl = document.getElementById('carousel-current');
  const totalEl = document.getElementById('carousel-total');

  if (!track) return;

  const slides = track.querySelectorAll('.intern-slide');
  const total = slides.length;
  let currentIndex = 0;
  let autoTimer;

  if (totalEl) totalEl.textContent = total;

  function renderDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = Array.from({ length: total }, (_, i) => {
      const isActive = i === currentIndex;
      return `<button class="carousel-dot ${isActive ? 'active' : ''}" data-index="${i}"></button>`;
    }).join('');

    if (currentEl) currentEl.textContent = currentIndex + 1;
  }

  function goTo(i) {
    currentIndex = i;
    track.style.transform = `translateX(-${i * 100}%)`;
    renderDots();
    resetAuto();
  }

  function next() {
    goTo((currentIndex + 1) % total);
  }

  function prev() {
    goTo((currentIndex - 1 + total) % total);
  }

  function resetAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(next, 4000);
  }

  // Bind controls programmatically
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  if (prevBtn) {
    prevBtn.addEventListener('click', prev);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', next);
  }

  if (dotsContainer) {
    dotsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.carousel-dot');
      if (btn) {
        goTo(+btn.dataset.index);
      }
    });
  }

  // Pause on hover
  track.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.addEventListener('mouseleave', resetAuto);

  renderDots();
  resetAuto();
}
