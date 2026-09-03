/**
 * balangayPreloader.js
 * Controller and utility for the Balangay Preloader.
 * Features the authentic Philippine Balangay boat, animated rowing figure,
 * university color branding (Competence, Service, Uprightness), and loading progress management.
 */

class BalangayPreloaderController {
  constructor() {
    this.container = null;
    this.progressBar = null;
    this.pctEl = null;
    this.titleEl = null;
    this.subtitleEl = null;
    this._initialized = false;
  }

  /**
   * Binds to existing DOM elements or initializes hooks
   */
  init() {
    if (this._initialized && this.container) return this;

    this.container = document.getElementById('tikad-preloader') || document.getElementById('balangay-preloader-root') || document.querySelector('.balangay-preloader');
    this.progressBar = document.getElementById('preloader-bar');
    this.pctEl = document.getElementById('loading-progress');
    this.titleEl = document.getElementById('preloader-title');
    this.subtitleEl = document.getElementById('preloader-subtitle');

    this._initialized = true;
    return this;
  }

  /**
   * Updates loading progress (0 to 100)
   */
  setProgress(percent) {
    this.init();
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    if (this.progressBar) {
      this.progressBar.classList.remove('indeterminate');
      this.progressBar.style.width = `${clamped}%`;
    }
    if (this.pctEl) {
      this.pctEl.textContent = `${clamped}%`;
    }
  }

  /**
   * Sets progress bar to indeterminate animated state
   */
  setIndeterminate() {
    this.init();
    if (this.progressBar) {
      this.progressBar.style.width = '';
      this.progressBar.classList.add('indeterminate');
    }
    if (this.pctEl) {
      this.pctEl.textContent = '';
    }
  }

  /**
   * Updates title text
   */
  setTitle(title) {
    this.init();
    if (this.titleEl) {
      this.titleEl.innerHTML = `<span>${title}</span>`;
    }
  }

  /**
   * Updates subtitle text
   */
  setSubtitle(subtitle) {
    this.init();
    if (this.subtitleEl) {
      this.subtitleEl.textContent = subtitle;
    }
  }

  /**
   * Smoothly fades out the preloader and hides it
   */
  hide(callback) {
    this.init();
    if (!this.container) {
      if (typeof callback === 'function') callback();
      return;
    }

    this.container.classList.add('fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
      if (typeof callback === 'function') callback();
    }, 600);
  }

  /**
   * Shows the preloader
   */
  show(options = {}) {
    this.init();
    if (!this.container) return;

    this.container.classList.remove('hidden');
    this.container.classList.remove('fade-out');

    if (options.title) this.setTitle(options.title);
    if (options.subtitle) this.setSubtitle(options.subtitle);
    if (typeof options.progress === 'number') {
      this.setProgress(options.progress);
    } else if (options.indeterminate) {
      this.setIndeterminate();
    }
  }

  /**
   * Returns whether preloader is currently visible
   */
  isVisible() {
    this.init();
    return !!(this.container && !this.container.classList.contains('hidden') && !this.container.classList.contains('fade-out'));
  }
}

export const BalangayPreloader = new BalangayPreloaderController();

// Auto-initialize when DOM is ready and export to window for debugging/global access
if (typeof window !== 'undefined') {
  window.BalangayPreloader = BalangayPreloader;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BalangayPreloader.init());
  } else {
    BalangayPreloader.init();
  }
}

export default BalangayPreloader;
