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
      return `<button
        onclick="carouselGo(${i})"
        style="
          width:${isActive ? '24px' : '8px'};
          height:8px;
          border-radius:4px;
          border:none;
          cursor:pointer;
          background:${isActive ? '#009900' : '#ccc'};
          transition:all .3s;
          padding:0;
        "
      ></button>`;
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

  // Expose globally so inline onclick handlers work
  window.carouselGo = goTo;
  window.carouselNext = next;
  window.carouselPrev = prev;

  // Pause on hover
  track.addEventListener('mouseenter', () => clearInterval(autoTimer));
  track.addEventListener('mouseleave', resetAuto);

  renderDots();
  resetAuto();
}
