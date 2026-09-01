/**
 * teamBlurReveal.js
 * Interactive blur-reveal team lineup component
 */
import { backMembers, frontMembers } from './teamData.js';

export function initTeamBlurReveal() {
  const backRow = document.getElementById('backRow');
  const frontRow = document.getElementById('frontRow');
  const lineupWrap = document.getElementById('lineupWrap');
  const infoPanel = document.getElementById('infoPanel');
  const infoClose = document.getElementById('infoClose');

  if (!backRow || !frontRow || !lineupWrap || !infoPanel) return;

  let lastFocused = null;
  let activeEl = null;

  // Clear container before rendering
  backRow.innerHTML = '';
  frontRow.innerHTML = '';

  function renderRow(container, list, delayOffset) {
    list.forEach((m, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'member';
      el.style.animationDelay = ((i + delayOffset) * 90) + 'ms';
      el.setAttribute('aria-label', m.name);
      el.innerHTML = `
        <div class="member-glow"></div>
        <img class="cutout" src="${m.cutout}" alt="${m.name}">
        <span class="tooltip">${m.name}</span>
      `;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMember(m, el);
      });
      container.appendChild(el);
    });
  }

  renderRow(backRow, backMembers, 0);
  renderRow(frontRow, frontMembers, backMembers.length);

  function allMembers() {
    return [...backRow.children, ...frontRow.children];
  }

  function toggleMember(m, triggerEl) {
    if (activeEl === triggerEl) {
      closeSelection();
    } else {
      selectMember(m, triggerEl);
    }
  }

  function selectMember(m, triggerEl) {
    lastFocused = triggerEl;
    activeEl = triggerEl;

    lineupWrap.classList.add('has-selection');

    allMembers().forEach(el => {
      if (el === triggerEl) {
        el.classList.add('is-active');
        el.classList.remove('is-dimmed');
      } else {
        el.classList.add('is-dimmed');
        el.classList.remove('is-active');
      }
    });

    const cutoutEl = triggerEl.querySelector('.cutout');
    if (cutoutEl) {
      cutoutEl.classList.remove('pulse');
      void cutoutEl.offsetWidth;
      cutoutEl.classList.add('pulse');
    }

    const infoName = document.getElementById('infoName');
    const infoRole = document.getElementById('infoRole');
    const infoStat = document.getElementById('infoStat');
    const infoFact = document.getElementById('infoFact');
    const infoTags = document.getElementById('infoTags');

    if (infoName) infoName.textContent = m.name;
    if (infoRole) infoRole.textContent = m.role;
    if (infoStat) infoStat.textContent = m.stat;
    if (infoFact) infoFact.textContent = m.fact;
    if (infoTags && m.tags) {
      infoTags.innerHTML = m.tags.map(t => `<span>${t}</span>`).join('<i></i>');
    }

    infoPanel.classList.add('open');
    if (infoClose) infoClose.focus();
  }

  function closeSelection() {
    lineupWrap.classList.remove('has-selection');
    allMembers().forEach(el => {
      el.classList.remove('is-active', 'is-dimmed');
    });
    infoPanel.classList.remove('open');
    setTimeout(() => {
      if (!infoPanel.classList.contains('open')) {
        const infoName = document.getElementById('infoName');
        const infoRole = document.getElementById('infoRole');
        const infoStat = document.getElementById('infoStat');
        const infoFact = document.getElementById('infoFact');
        const infoTags = document.getElementById('infoTags');
        if (infoName) infoName.textContent = '';
        if (infoRole) infoRole.textContent = '';
        if (infoStat) infoStat.textContent = '';
        if (infoFact) infoFact.textContent = '';
        if (infoTags) infoTags.innerHTML = '';
      }
    }, 400);
    activeEl = null;
    if (lastFocused) lastFocused.focus();
  }

  if (infoClose) {
    infoClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSelection();
    });
  }

  lineupWrap.addEventListener('click', (e) => {
    if (e.target === lineupWrap) closeSelection();
  });

  document.addEventListener('click', (e) => {
    if (lineupWrap.classList.contains('has-selection') && !lineupWrap.contains(e.target)) {
      closeSelection();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lineupWrap.classList.contains('has-selection')) {
      closeSelection();
    }
  });
}
