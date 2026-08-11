/**
 * model3D.js – Hero campus preview (lightweight static image edition)
 *
 * The former 280 MB Three.js GLB preview has been replaced with a
 * high-quality static top-down image of the campus.
 * This eliminates a massive blocking network request on the landing page
 * while giving users an equally-informative first impression.
 *
 * If a campus aerial image is available at /images/campus-aerial.jpg, it is
 * displayed directly. Otherwise a CSS-rendered campus illustration is used
 * as a zero-network-request fallback.
 */

export function initModel3D() {
  const container = document.getElementById('model-3d-container');
  if (!container) return;

  // ── Build the static preview ─────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.8s ease;
  `;

  // Try the campus aerial photo first; fall back to CSS gradient map art
  const img = document.createElement('img');
  img.src = '/images/campus-aerial.jpg';
  img.alt = 'Campus aerial view';
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  `;

  // On load → fade in
  img.onload = () => {
    wrapper.style.opacity = '1';
    _removeShimmer(container);
  };

  // On error → show CSS fallback map art
  img.onerror = () => {
    img.remove();
    _renderFallbackMap(wrapper);
    wrapper.style.opacity = '1';
    _removeShimmer(container);
  };

  wrapper.appendChild(img);
  container.appendChild(wrapper);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _removeShimmer(container) {
  const shimmer = container.querySelector('.hero-shimmer');
  if (shimmer) {
    shimmer.style.opacity = '0';
    setTimeout(() => shimmer.remove(), 700);
  }
}

/**
 * _renderFallbackMap(wrapper)
 * Renders a stylised CSS campus map art when no aerial photo is available.
 * Gives a clean, architectural top-down aesthetic at zero network cost.
 */
function _renderFallbackMap(wrapper) {
  wrapper.style.background = 'linear-gradient(160deg, #0d1f12 0%, #0a2d18 40%, #0d2e20 100%)';

  // Draw a simple schematic grid of "buildings" using divs
  const blocks = [
    // [left%, top%, width%, height%, color, label]
    [10, 15, 18, 12, '#1a5c3a', 'Admin'],
    [32, 12, 14, 10, '#174d6b', 'Library'],
    [50, 8,  16, 11, '#3b2a6b', 'Kinaadman'],
    [10, 35, 12, 14, '#1a4a2e', 'Hinang'],
    [26, 33, 16, 12, '#4a2800', 'Hiraya'],
    [46, 30, 12, 10, '#5c1a1a', 'Batok'],
    [62, 22, 10, 9,  '#1a3a5c', 'Masawa'],
    [74, 35, 12, 10, '#384218', 'CAA'],
    [10, 58, 20, 10, '#3d3b5c', 'CED'],
    [34, 60, 14, 8,  '#2b453a', 'Kalinaw'],
  ];

  blocks.forEach(([l, t, w, h, bg, label]) => {
    const b = document.createElement('div');
    b.style.cssText = `
      position: absolute;
      left: ${l}%;
      top: ${t}%;
      width: ${w}%;
      height: ${h}%;
      background: ${bg};
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', sans-serif;
      font-size: clamp(7px, 1.2vw, 11px);
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.04em;
    `;
    b.textContent = label;
    wrapper.appendChild(b);
  });

  // Road lines
  const road = document.createElement('div');
  road.style.cssText = `
    position: absolute;
    left: 8%; top: 50%;
    width: 84%; height: 2px;
    background: rgba(255,255,255,0.06);
  `;
  wrapper.appendChild(road);

  const road2 = document.createElement('div');
  road2.style.cssText = `
    position: absolute;
    left: 50%; top: 5%;
    width: 2px; height: 90%;
    background: rgba(255,255,255,0.06);
  `;
  wrapper.appendChild(road2);
}
