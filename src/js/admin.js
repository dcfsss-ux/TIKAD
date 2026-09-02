/**
 * admin.js — GIYA CSU Smart Campus Admin Panel
 *
 * Handles auth, CRUD for buildings/rooms/offices/facilities,
 * GLB upload with live Three.js preview, and hero showcase management.
 * Uses official Lucide Vector SVG icons throughout for a sharp, modern UI.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import {
  signIn, signOut, getSession, onAuthStateChange,
  getAllBuildings, getBuildingDetails, updateBuilding,
  upsertRoom, deleteRoom,
  upsertOffice, deleteOffice,
  upsertFacility, deleteFacility,
  uploadModelGlb,
} from './supabaseClient.js';

// ── Lucide Icon Helper ─────────────────────────────────────────────────────
function lucideIcon(name, size = 16, strokeWidth = 2, className = '') {
  const icons = {
    save: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    plus: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    building: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
    library: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>`,
    gym: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`,
    landmark: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="2" y1="22" x2="22" y2="22"/><line x1="12" y1="2" x2="20" y2="7"/><line x1="12" y1="2" x2="4" y2="7"/><line x1="4" y1="7" x2="20" y2="7"/><polyline points="6 11 6 18"/><polyline points="10 11 10 18"/><polyline points="14 11 14 18"/><polyline points="18 11 18 18"/></svg>`,
    lab: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M10 2v7.31L4.69 19.5A2 2 0 0 0 6.43 22h11.14a2 2 0 0 0 1.74-2.5L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="14" y1="14" x2="14.01" y2="14"/></svg>`,
    church: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="m18 7 4 2v13H2V9l4-2"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5l-6-3-6 3v17"/><path d="M12 7v5"/><path d="M10 9h4"/></svg>`,
    canteen: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    door: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M13 20V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"/><circle cx="10" cy="12" r="1"/></svg>`,
    briefcase: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    wrench: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    box: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    sparkles: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    upload: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    uploadCloud: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/><polyline points="16 16 12 12 8 16"/></svg>`,
    externalLink: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${className}"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  return icons[name] || icons.building;
}

// ── State ──────────────────────────────────────────────────────────────────
let _allBuildings = [];
let _selectedBuilding = null;
let _activeTab = 'info';
let _pendingGlbFile = null;

// ── Three.js preview state ─────────────────────────────────────────────────
let _previewRenderer = null, _previewScene = null, _previewCamera = null;
let _previewControls = null, _previewAnimId = null;
let _previewModel = null;

// ── DOM references ─────────────────────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const adminApp    = document.getElementById('admin-app');
const loginForm   = document.getElementById('login-form');
const loginError  = document.getElementById('login-error');
const userChipEmail = document.getElementById('user-chip-email');
const userAvatar    = document.getElementById('user-avatar');
const sidebarList   = document.getElementById('sidebar-list');
const sidebarSearch = document.getElementById('sidebar-search');
const breadcrumbName = document.getElementById('breadcrumb-name');
const emptyState    = document.getElementById('empty-state');
const editorPane    = document.getElementById('editor-pane');

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await getSession();
  if (session) {
    _onLoggedIn(session);
  } else {
    _showLogin();
  }

  onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) _onLoggedIn(session);
    if (event === 'SIGNED_OUT') _showLogin();
  });

  _bindLoginForm();
  _bindLogout();
  _bindSidebarSearch();
  _bindTabs();
}

// ── Auth ───────────────────────────────────────────────────────────────────
function _showLogin() {
  loginScreen.classList.remove('hidden');
  adminApp.classList.remove('visible');
}

async function _onLoggedIn(session) {
  loginScreen.classList.add('hidden');
  adminApp.classList.add('visible');

  const email = session.user?.email || '';
  if (userChipEmail) userChipEmail.textContent = email;
  if (userAvatar) userAvatar.textContent = (email[0] || 'A').toUpperCase();

  await _loadBuildings();
}

function _bindLoginForm() {
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = `${lucideIcon('info', 16)} Signing in…`;
    loginError.classList.remove('visible');

    const { error } = await signIn(email, password);
    if (error) {
      loginError.textContent = error.message || 'Invalid credentials.';
      loginError.classList.add('visible');
      btn.disabled = false;
      btn.innerHTML = `${lucideIcon('externalLink', 16)} Sign In to Dashboard`;
    }
  });
}

function _bindLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut();
  });
}

// ── Buildings Sidebar ──────────────────────────────────────────────────────
async function _loadBuildings() {
  _renderSidebarSkeletons();
  _allBuildings = await getAllBuildings();
  _renderSidebar(_allBuildings);
}

function _renderSidebarSkeletons() {
  if (!sidebarList) return;
  sidebarList.innerHTML = Array.from({ length: 6 }, () =>
    `<div class="skeleton sidebar-skeleton"></div>`
  ).join('');
}

function _renderSidebar(buildings) {
  if (!sidebarList) return;
  if (!buildings.length) {
    sidebarList.innerHTML = `<p style="padding:16px;font-size:0.82rem;color:var(--text-muted)">No buildings found.</p>`;
    return;
  }

  sidebarList.innerHTML = buildings.map(b => {
    const name = b.Building_name || 'Unnamed';
    const iconKey = _getBuildingIconKey(b);
    return `
      <div class="sidebar-item" data-id="${b.Building_ID}" title="${name}">
        <div class="sidebar-item-icon">${lucideIcon(iconKey, 17)}</div>
        <div class="sidebar-item-info">
          <div class="sidebar-item-name">${name}</div>
          <div class="sidebar-item-id">ID #${b.Building_ID}</div>
        </div>
      </div>`;
  }).join('');

  sidebarList.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => _selectBuilding(Number(item.dataset.id)));
  });
}

function _getBuildingIconKey(b) {
  const n = (b.Building_name || '').toLowerCase();
  if (n.includes('library')) return 'library';
  if (n.includes('gym'))     return 'gym';
  if (n.includes('admin'))   return 'landmark';
  if (n.includes('lab'))     return 'lab';
  if (n.includes('chapel') || n.includes('church')) return 'church';
  if (n.includes('cafe') || n.includes('canteen'))  return 'canteen';
  return 'building';
}

function _bindSidebarSearch() {
  sidebarSearch?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = _allBuildings.filter(b =>
      (b.Building_name || '').toLowerCase().includes(q)
    );
    _renderSidebar(filtered);

    if (_selectedBuilding) {
      const activeItem = sidebarList.querySelector(`[data-id="${_selectedBuilding.Building_ID}"]`);
      activeItem?.classList.add('active');
    }
  });
}

// ── Select Building ────────────────────────────────────────────────────────
async function _selectBuilding(id) {
  sidebarList.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.id) === id);
  });

  const b = _allBuildings.find(x => x.Building_ID === id);
  if (breadcrumbName) breadcrumbName.textContent = b?.Building_name || '…';

  emptyState?.classList.add('hidden');
  editorPane?.classList.remove('hidden');

  _showPanelLoading();

  _selectedBuilding = await getBuildingDetails(id);
  if (!_selectedBuilding) return;

  _renderEditor(_selectedBuilding);
}

function _showPanelLoading() {
  ['panel-info', 'panel-rooms', 'panel-offices', 'panel-facilities', 'panel-model', 'panel-hero']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div style="padding:32px;color:var(--text-muted);font-size:0.85rem">Loading details…</div>`;
    });
}

// ── Editor Rendering ───────────────────────────────────────────────────────
function _renderEditor(building) {
  _renderInfoPanel(building);
  _renderRoomsPanel(building);
  _renderOfficesPanel(building);
  _renderFacilitiesPanel(building);
  _renderModelPanel(building);
  _renderHeroPanel(building);

  _switchTab('info');
}

// ─ Info Panel ──────────────────────────────────────────────────────────────
function _renderInfoPanel(b) {
  const panel = document.getElementById('panel-info');
  if (!panel) return;

  const hasTypeCol = 'Building_type' in b || 'building_type' in b || 'Type' in b || 'type' in b || 'Category' in b;
  const typeVal = b.Building_type || b.building_type || b.Type || b.type || b.Category || '';

  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('building', 20)}</div>
        <h3>Building Overview</h3>
      </div>
      <div class="form-row">
        <div class="form-group" style="${hasTypeCol ? '' : 'flex:1;'}">
          <label>Building Name</label>
          <input id="info-name" type="text" value="${_esc(b.Building_name || b.name || '')}"/>
        </div>
        ${hasTypeCol ? `
          <div class="form-group">
            <label>Building Type</label>
            <input id="info-type" type="text" value="${_esc(typeVal)}" placeholder="e.g. Academic Building"/>
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="info-desc">${_esc(b.Description || b.description || b.desc || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Operating Hours</label>
          <input id="info-hours" type="text" value="${_esc(b.Hours || b.hours || '')}" placeholder="8:00 AM – 5:00 PM, Mon – Fri"/>
        </div>
        <div class="form-group">
          <label>Logo / Seal URL</label>
          <input id="info-logo" type="url" value="${_esc(b.Logo_URL || b.logo_url || '')}" placeholder="https://…"/>
        </div>
      </div>
      <div class="save-bar">
        <button class="btn btn-primary" id="save-info-btn">
          ${lucideIcon('save', 16)} Save Changes
        </button>
        <div class="save-status" id="save-info-status">
          ${lucideIcon('check', 14)} Saved successfully
        </div>
      </div>
    </div>`;

  document.getElementById('save-info-btn')?.addEventListener('click', () => _saveInfo(b.Building_ID));
}

async function _saveInfo(id) {
  const btn = document.getElementById('save-info-btn');
  btn.disabled = true;
  btn.innerHTML = `${lucideIcon('info', 16)} Saving…`;

  const fields = {};
  const current = _selectedBuilding || {};
  const keys = Object.keys(current);

  const valName = document.getElementById('info-name')?.value.trim();
  const valDesc = document.getElementById('info-desc')?.value.trim();
  const valHours = document.getElementById('info-hours')?.value.trim();
  const valLogo = document.getElementById('info-logo')?.value.trim() || null;
  const typeInput = document.getElementById('info-type');
  const valType = typeInput ? typeInput.value.trim() : null;

  // 1. Building Name
  const nameCol = keys.find(k => k.toLowerCase() === 'building_name') || 'Building_name';
  fields[nameCol] = valName;

  // 2. Description
  const descCol = keys.find(k => k.toLowerCase() === 'description' || k.toLowerCase() === 'desc') || 'Description';
  fields[descCol] = valDesc;

  // 3. Hours (only if column exists or default to Hours)
  const hoursCol = keys.find(k => k.toLowerCase() === 'hours' || k.toLowerCase() === 'operating_hours');
  if (hoursCol || 'Hours' in current) {
    fields[hoursCol || 'Hours'] = valHours;
  }

  // 4. Logo_URL (only if column exists or default to Logo_URL)
  const logoCol = keys.find(k => k.toLowerCase() === 'logo_url' || k.toLowerCase() === 'logo');
  if (logoCol || 'Logo_URL' in current) {
    fields[logoCol || 'Logo_URL'] = valLogo;
  }

  // 5. Building Type (ONLY if column actually exists in DB)
  const typeCol = keys.find(k => k.toLowerCase() === 'building_type' || k.toLowerCase() === 'type' || k.toLowerCase() === 'category');
  if (typeCol && valType !== null) {
    fields[typeCol] = valType;
  }

  const { error } = await updateBuilding(id, fields);
  btn.disabled = false;
  btn.innerHTML = `${lucideIcon('save', 16)} Save Changes`;

  if (error) {
    _toast('Failed to save: ' + error.message, 'error');
  } else {
    _toast('Building info updated ✓', 'success');
    const status = document.getElementById('save-info-status');
    if (status) { status.classList.add('visible'); setTimeout(() => status.classList.remove('visible'), 3000); }
    
    // Update local state and sidebar
    Object.assign(_selectedBuilding, fields);
    const sidebarEl = sidebarList.querySelector(`[data-id="${id}"] .sidebar-item-name`);
    if (sidebarEl) sidebarEl.textContent = valName || sidebarEl.textContent;
    const cached = _allBuildings.find(x => x.Building_ID === id);
    if (cached) Object.assign(cached, fields);
    if (breadcrumbName) breadcrumbName.textContent = valName;
  }
}

// ─ Rooms Panel ─────────────────────────────────────────────────────────────
function _renderRoomsPanel(b) {
  const panel = document.getElementById('panel-rooms');
  if (!panel) return;
  const rooms = b.ROOMS || [];
  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('door', 20)}</div>
        <h3>Rooms <span class="badge badge-muted" style="margin-left:6px">${rooms.length}</span></h3>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Room #</th><th>Room Name</th><th>Floor</th><th></th>
          </tr></thead>
          <tbody id="rooms-tbody">
            ${rooms.map(r => _roomRow(r)).join('')}
          </tbody>
        </table>
        <div class="table-add-row" id="rooms-add-row">
          <div class="form-group"><input id="new-room-num" placeholder="Room #" type="text"/></div>
          <div class="form-group"><input id="new-room-name" placeholder="Room name" type="text"/></div>
          <div class="form-group"><input id="new-room-floor" placeholder="Floor" type="text"/></div>
          <button class="btn btn-primary btn-sm" id="add-room-btn">
            ${lucideIcon('plus', 14)} Add Room
          </button>
        </div>
      </div>
    </div>`;

  _bindRoomEvents(b.Building_ID);
}

function _roomRow(r) {
  return `
    <tr data-room-id="${r.Room_ID}">
      <td><input class="inline-input" data-field="Room_number" value="${_esc(r.Room_number || '')}"/></td>
      <td><input class="inline-input" data-field="Room_name" value="${_esc(r.Room_name || '')}"/></td>
      <td><input class="inline-input" data-field="Floor" value="${_esc(r.Floor || '')}"/></td>
      <td class="actions-cell">
        <button class="btn-icon-only save-row-btn" title="Save Room">${lucideIcon('save', 15)}</button>
        <button class="btn-icon-only danger delete-row-btn" title="Delete Room">${lucideIcon('trash', 15)}</button>
      </td>
    </tr>`;
}

function _bindRoomEvents(buildingId) {
  const tbody = document.getElementById('rooms-tbody');

  tbody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-room-id]');
    if (!tr) return;
    const roomId = Number(tr.dataset.roomId);

    if (e.target.closest('.save-row-btn')) {
      const data = _getRowData(tr, buildingId);
      data.Room_ID = roomId;
      const { error } = await upsertRoom(data);
      error ? _toast('Save failed: ' + error.message, 'error') : _toast('Room saved ✓', 'success');
    }

    if (e.target.closest('.delete-row-btn')) {
      _confirm(`Delete room #${roomId}?`, async () => {
        const { error } = await deleteRoom(roomId);
        if (error) { _toast('Delete failed: ' + error.message, 'error'); return; }
        tr.remove(); _toast('Room deleted', 'success');
      });
    }
  });

  document.getElementById('add-room-btn')?.addEventListener('click', async () => {
    const num   = document.getElementById('new-room-num')?.value.trim();
    const name  = document.getElementById('new-room-name')?.value.trim();
    const floor = document.getElementById('new-room-floor')?.value.trim();
    if (!num && !name) return;

    const { data, error } = await upsertRoom({ Room_number: num, Room_name: name, Floor: floor, Building_ID: buildingId });
    if (error) { _toast('Add failed: ' + error.message, 'error'); return; }

    const newRoom = data?.[0] || { Room_ID: Date.now(), Room_number: num, Room_name: name, Floor: floor };
    tbody.insertAdjacentHTML('beforeend', _roomRow(newRoom));
    document.getElementById('new-room-num').value = '';
    document.getElementById('new-room-name').value = '';
    document.getElementById('new-room-floor').value = '';
    _toast('Room added ✓', 'success');
  });
}

// ─ Offices Panel ───────────────────────────────────────────────────────────
function _renderOfficesPanel(b) {
  const panel = document.getElementById('panel-offices');
  if (!panel) return;
  const offices = b.OFFICES || [];
  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('briefcase', 20)}</div>
        <h3>Offices <span class="badge badge-muted" style="margin-left:6px">${offices.length}</span></h3>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Office Name</th><th>Abbreviation</th><th>Room #</th><th>Floor</th><th></th>
          </tr></thead>
          <tbody id="offices-tbody">
            ${offices.map(o => _officeRow(o)).join('')}
          </tbody>
        </table>
        <div class="table-add-row">
          <div class="form-group"><input id="new-office-name" placeholder="Office name" type="text"/></div>
          <div class="form-group"><input id="new-office-abbr" placeholder="Abbr." type="text"/></div>
          <div class="form-group"><input id="new-office-room" placeholder="Room #" type="text"/></div>
          <div class="form-group"><input id="new-office-floor" placeholder="Floor" type="text"/></div>
          <button class="btn btn-primary btn-sm" id="add-office-btn">
            ${lucideIcon('plus', 14)} Add Office
          </button>
        </div>
      </div>
    </div>`;

  _bindOfficeEvents(b.Building_ID);
}

function _officeRow(o) {
  return `
    <tr data-office-id="${o.Office_ID}">
      <td><input class="inline-input" data-field="Office_name" value="${_esc(o.Office_name || '')}"/></td>
      <td><input class="inline-input" data-field="Abbreviations" value="${_esc(o.Abbreviations || '')}"/></td>
      <td><input class="inline-input" data-field="Room_number" value="${_esc(o.Room_number || '')}"/></td>
      <td><input class="inline-input" data-field="Floor" value="${_esc(o.Floor || '')}"/></td>
      <td class="actions-cell">
        <button class="btn-icon-only save-row-btn" title="Save Office">${lucideIcon('save', 15)}</button>
        <button class="btn-icon-only danger delete-row-btn" title="Delete Office">${lucideIcon('trash', 15)}</button>
      </td>
    </tr>`;
}

function _bindOfficeEvents(buildingId) {
  const tbody = document.getElementById('offices-tbody');
  tbody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-office-id]');
    if (!tr) return;
    const officeId = Number(tr.dataset.officeId);

    if (e.target.closest('.save-row-btn')) {
      const data = _getRowData(tr, buildingId);
      data.Office_ID = officeId;
      const { error } = await upsertOffice(data);
      error ? _toast('Save failed: ' + error.message, 'error') : _toast('Office saved ✓', 'success');
    }
    if (e.target.closest('.delete-row-btn')) {
      _confirm('Delete this office?', async () => {
        const { error } = await deleteOffice(officeId);
        if (error) { _toast('Delete failed: ' + error.message, 'error'); return; }
        tr.remove(); _toast('Office deleted', 'success');
      });
    }
  });

  document.getElementById('add-office-btn')?.addEventListener('click', async () => {
    const name  = document.getElementById('new-office-name')?.value.trim();
    const abbr  = document.getElementById('new-office-abbr')?.value.trim();
    const room  = document.getElementById('new-office-room')?.value.trim();
    const floor = document.getElementById('new-office-floor')?.value.trim();
    if (!name) return;

    const { data, error } = await upsertOffice({ Office_name: name, Abbreviations: abbr, Room_number: room, Floor: floor, Building_ID: buildingId });
    if (error) { _toast('Add failed: ' + error.message, 'error'); return; }

    const newOffice = data?.[0] || { Office_ID: Date.now(), Office_name: name, Abbreviations: abbr, Room_number: room, Floor: floor };
    tbody.insertAdjacentHTML('beforeend', _officeRow(newOffice));
    ['new-office-name','new-office-abbr','new-office-room','new-office-floor'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _toast('Office added ✓', 'success');
  });
}

// ─ Facilities Panel ────────────────────────────────────────────────────────
function _renderFacilitiesPanel(b) {
  const panel = document.getElementById('panel-facilities');
  if (!panel) return;
  const facs = b.FACILITIES || [];
  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('wrench', 20)}</div>
        <h3>Facilities <span class="badge badge-muted" style="margin-left:6px">${facs.length}</span></h3>
      </div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Facility Name</th><th>Abbreviation</th><th>Room #</th><th>Floor</th><th></th>
          </tr></thead>
          <tbody id="facilities-tbody">
            ${facs.map(f => _facilityRow(f)).join('')}
          </tbody>
        </table>
        <div class="table-add-row">
          <div class="form-group"><input id="new-fac-name" placeholder="Facility name" type="text"/></div>
          <div class="form-group"><input id="new-fac-abbr" placeholder="Abbr." type="text"/></div>
          <div class="form-group"><input id="new-fac-room" placeholder="Room #" type="text"/></div>
          <div class="form-group"><input id="new-fac-floor" placeholder="Floor" type="text"/></div>
          <button class="btn btn-primary btn-sm" id="add-fac-btn">
            ${lucideIcon('plus', 14)} Add Facility
          </button>
        </div>
      </div>
    </div>`;

  _bindFacilityEvents(b.Building_ID);
}

function _facilityRow(f) {
  return `
    <tr data-facility-id="${f.Facility_ID}">
      <td><input class="inline-input" data-field="Facility_name" value="${_esc(f.Facility_name || '')}"/></td>
      <td><input class="inline-input" data-field="Abbreviations" value="${_esc(f.Abbreviations || '')}"/></td>
      <td><input class="inline-input" data-field="Room_number" value="${_esc(f.Room_number || '')}"/></td>
      <td><input class="inline-input" data-field="Floor" value="${_esc(f.Floor || '')}"/></td>
      <td class="actions-cell">
        <button class="btn-icon-only save-row-btn" title="Save Facility">${lucideIcon('save', 15)}</button>
        <button class="btn-icon-only danger delete-row-btn" title="Delete Facility">${lucideIcon('trash', 15)}</button>
      </td>
    </tr>`;
}

function _bindFacilityEvents(buildingId) {
  const tbody = document.getElementById('facilities-tbody');
  tbody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr[data-facility-id]');
    if (!tr) return;
    const facId = Number(tr.dataset.facilityId);

    if (e.target.closest('.save-row-btn')) {
      const data = _getRowData(tr, buildingId);
      data.Facility_ID = facId;
      const { error } = await upsertFacility(data);
      error ? _toast('Save failed: ' + error.message, 'error') : _toast('Facility saved ✓', 'success');
    }
    if (e.target.closest('.delete-row-btn')) {
      _confirm('Delete this facility?', async () => {
        const { error } = await deleteFacility(facId);
        if (error) { _toast('Delete failed: ' + error.message, 'error'); return; }
        tr.remove(); _toast('Facility deleted', 'success');
      });
    }
  });

  document.getElementById('add-fac-btn')?.addEventListener('click', async () => {
    const name  = document.getElementById('new-fac-name')?.value.trim();
    const abbr  = document.getElementById('new-fac-abbr')?.value.trim();
    const room  = document.getElementById('new-fac-room')?.value.trim();
    const floor = document.getElementById('new-fac-floor')?.value.trim();
    if (!name) return;

    const { data, error } = await upsertFacility({ Facility_name: name, Abbreviations: abbr, Room_number: room, Floor: floor, Building_ID: buildingId });
    if (error) { _toast('Add failed: ' + error.message, 'error'); return; }

    const newFac = data?.[0] || { Facility_ID: Date.now(), Facility_name: name, Abbreviations: abbr, Room_number: room, Floor: floor };
    tbody.insertAdjacentHTML('beforeend', _facilityRow(newFac));
    ['new-fac-name','new-fac-abbr','new-fac-room','new-fac-floor'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    _toast('Facility added ✓', 'success');
  });
}

// ─ 3D Model Panel ──────────────────────────────────────────────────────────
function _renderModelPanel(b) {
  const panel = document.getElementById('panel-model');
  if (!panel) return;
  const currentUrl = b.Model_URL || '';
  _pendingGlbFile = null;

  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('box', 20)}</div>
        <h3>3D Model Architecture</h3>
      </div>

      <p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:18px">
        Upload a <strong>.glb</strong> or <strong>.gltf</strong> file to replace this campus building model.
        The file is uploaded directly to CSU Supabase Storage.
      </p>

      <div class="model-current-info">
        <div style="color:var(--csu-gold);display:flex;align-items:center;">
          ${lucideIcon('box', 18)}
        </div>
        <span class="model-url-text" id="current-model-url">${currentUrl || 'No 3D model assigned yet'}</span>
        ${currentUrl ? `
          <button id="view-current-model-btn" type="button" class="btn btn-sm btn-secondary" style="flex-shrink:0">
            ${lucideIcon('eye', 14)} View 3D Model
          </button>
        ` : ''}
      </div>

      <div class="dropzone" id="glb-dropzone">
        <input type="file" id="glb-file-input" accept=".glb,.gltf"/>
        <span class="dropzone-icon" style="display:flex;justify-content:center;margin-bottom:12px;color:var(--csu-green-bright);">
          ${lucideIcon('uploadCloud', 42)}
        </span>
        <h4>Drop a .glb file here</h4>
        <p>or click to browse from your device</p>
        <div class="file-selected-name" id="glb-selected-name" style="display:none"></div>
      </div>

      <div class="model-preview-wrap" id="model-preview-wrap">
        <div class="model-preview-label" id="model-preview-label">INTERACTIVE 3D PREVIEW</div>
        <div id="admin-preview-loader" style="position:absolute;inset:0;background:rgba(0,18,4,0.85);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;gap:10px;font-size:0.9rem;color:var(--csu-gold);font-weight:600;z-index:10;">
          <span class="skeleton" style="width:20px;height:20px;border-radius:50%;display:inline-block;"></span>
          <span id="preview-loader-text">Loading 3D Model…</span>
        </div>
        <canvas id="admin-preview-canvas"></canvas>
      </div>

      <div class="upload-actions">
        <button class="btn btn-gold" id="upload-model-btn" disabled>
          ${lucideIcon('upload', 16)} Upload & Replace 3D Model
        </button>
        <div class="upload-progress" id="upload-progress">
          <div class="upload-progress-fill" id="upload-progress-fill"></div>
        </div>
        <span id="upload-status" style="font-size:0.82rem;color:var(--text-muted)"></span>
      </div>
    </div>`;

  _bindModelUploadEvents(b.Building_ID, currentUrl, b.Building_name);
}

function _bindModelUploadEvents(buildingId, currentUrl, buildingName) {
  const fileInput    = document.getElementById('glb-file-input');
  const dropzone     = document.getElementById('glb-dropzone');
  const selectedName = document.getElementById('glb-selected-name');
  const uploadBtn    = document.getElementById('upload-model-btn');
  const progressBar  = document.getElementById('upload-progress');
  const progressFill = document.getElementById('upload-progress-fill');
  const uploadStatus = document.getElementById('upload-status');
  const viewBtn      = document.getElementById('view-current-model-btn');

  // Handle View Button Click
  viewBtn?.addEventListener('click', () => {
    if (currentUrl) {
      _loadPreviewModel(currentUrl, `VIEWING: ${buildingName || 'Building Model'}`);
    } else {
      _toast('No 3D model assigned to this building yet.', 'info');
    }
  });

  const handleFile = (file) => {
    if (!file || (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf'))) {
      _toast('Please select a valid .glb or .gltf file', 'error');
      return;
    }
    _pendingGlbFile = file;
    selectedName.textContent = `Selected: ${file.name} (${_formatBytes(file.size)})`;
    selectedName.style.display = 'block';
    uploadBtn.disabled = false;
    _loadPreviewModel(file, `NEW UPLOAD PREVIEW: ${file.name}`);
  };

  fileInput?.addEventListener('change', () => handleFile(fileInput.files?.[0]));

  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files?.[0]);
  });

  uploadBtn?.addEventListener('click', async () => {
    if (!_pendingGlbFile) return;
    uploadBtn.disabled = true;
    progressBar?.classList.add('visible');
    uploadStatus.textContent = 'Uploading to Supabase…';

    let prog = 0;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 8, 90);
      if (progressFill) progressFill.style.width = prog + '%';
    }, 200);

    const { publicUrl, error } = await uploadModelGlb(buildingId, _pendingGlbFile);
    clearInterval(progInterval);

    if (error) {
      progressBar?.classList.remove('visible');
      uploadStatus.textContent = '';
      uploadBtn.disabled = false;
      _toast('Upload failed: ' + error.message, 'error');
      return;
    }

    if (progressFill) progressFill.style.width = '100%';
    setTimeout(() => {
      progressBar?.classList.remove('visible');
      if (progressFill) progressFill.style.width = '0%';
    }, 800);

    uploadStatus.textContent = '✓ Upload Complete!';
    uploadBtn.innerHTML = `${lucideIcon('check', 16)} Model Updated`;
    document.getElementById('current-model-url').textContent = publicUrl;
    _toast('3D model updated successfully ✓', 'success');
    _pendingGlbFile = null;
  });
}

// ── Three.js Preview ────────────────────────────────────────────────────────
function _loadPreviewModel(source, labelText = 'INTERACTIVE 3D PREVIEW') {
  const wrap   = document.getElementById('model-preview-wrap');
  const canvas = document.getElementById('admin-preview-canvas');
  const label  = document.getElementById('model-preview-label');
  const loader = document.getElementById('admin-preview-loader');
  if (!wrap || !canvas) return;

  wrap.classList.add('visible');
  if (label) label.textContent = labelText.toUpperCase();
  if (loader) {
    loader.style.display = 'flex';
  }

  // Smooth scroll into view so the user immediately sees the canvas
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  if (_previewAnimId) { cancelAnimationFrame(_previewAnimId); _previewAnimId = null; }
  if (_previewRenderer) { _previewRenderer.dispose(); _previewRenderer = null; }
  if (_previewModel) {
    _previewScene?.remove(_previewModel);
    _previewModel.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => m.dispose());
    });
    _previewModel = null;
  }

  const w = canvas.parentElement?.clientWidth || 600;
  const h = 340;

  _previewScene = new THREE.Scene();
  _previewCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
  _previewCamera.position.set(20, 16, 25);

  _previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  _previewRenderer.setSize(w, h, false);
  _previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _previewRenderer.setClearColor(0x000000, 0);
  if ('outputColorSpace' in _previewRenderer) _previewRenderer.outputColorSpace = THREE.SRGBColorSpace;

  _previewControls = new OrbitControls(_previewCamera, canvas);
  _previewControls.enableDamping = true;
  _previewControls.dampingFactor = 0.05;
  _previewControls.autoRotate = true;
  _previewControls.autoRotateSpeed = 1.2;
  _previewControls.maxPolarAngle = Math.PI / 2.05;

  _previewScene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xfffaed, 1.8);
  sun.position.set(30, 40, 30);
  _previewScene.add(sun);

  const fill = new THREE.DirectionalLight(0x009900, 0.5);
  fill.position.set(-30, 15, -30);
  _previewScene.add(fill);

  const goldLight = new THREE.PointLight(0xEDDD53, 0.6, 60);
  goldLight.position.set(0, 20, 0);
  _previewScene.add(goldLight);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath('/basis/');
  ktx2Loader.detectSupport(_previewRenderer);

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.setKTX2Loader(ktx2Loader);

  const isFile = source instanceof File || source instanceof Blob;
  const loadUrl = isFile ? URL.createObjectURL(source) : source;

  gltfLoader.load(
    loadUrl,
    (gltf) => {
      if (loader) loader.style.display = 'none';
      _previewModel = gltf.scene;

      const box = new THREE.Box3().setFromObject(_previewModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 10;

      _previewModel.position.set(-center.x, -box.min.y, -center.z);
      _previewScene.add(_previewModel);

      const fitDist = maxDim * 1.6;
      _previewCamera.position.set(fitDist * 0.85, fitDist * 0.65, fitDist * 0.85);
      _previewControls.target.set(0, size.y * 0.35, 0);
      _previewControls.update();

      if (isFile) URL.revokeObjectURL(loadUrl);
      _toast('3D Model loaded in interactive preview ✓', 'success');
    },
    undefined,
    (err) => {
      console.warn('Preview load error:', err);
      if (loader) loader.style.display = 'none';
      if (isFile) URL.revokeObjectURL(loadUrl);
      _toast('Failed to load 3D model. Please check the URL/file format.', 'error');
    }
  );

  const animate = () => {
    _previewAnimId = requestAnimationFrame(animate);
    _previewControls?.update();
    _previewRenderer?.render(_previewScene, _previewCamera);
  };
  animate();
}

// ─ Hero Showcase Panel ─────────────────────────────────────────────────────
function _renderHeroPanel(b) {
  const panel = document.getElementById('panel-hero');
  if (!panel) return;

  const isInHero  = b.show_in_hero ?? false;
  const heroOrder = b.hero_order ?? 0;
  const heroCat   = b.hero_category ?? '';

  panel.innerHTML = `
    <div class="section-card">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('sparkles', 20)}</div>
        <h3>Hero Showcase Settings</h3>
      </div>

      <p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:20px">
        Control whether this building appears in the rotating 3D showcase on the home page hero section.
        Requires <code style="color:var(--csu-gold)">show_in_hero</code>, <code style="color:var(--csu-gold)">hero_order</code>,
        and <code style="color:var(--csu-gold)">hero_category</code> columns in the BUILDINGS table.
      </p>

      <div class="hero-toggle-row">
        <div class="hero-toggle-label">
          <strong>Show in Hero Showcase</strong>
          <small>Enable to include this building in the rotating homepage showcase</small>
        </div>
        <label class="toggle">
          <input type="checkbox" id="hero-show-toggle" ${isInHero ? 'checked' : ''}/>
          <span class="toggle-track"></span>
        </label>
      </div>

      <div class="form-row" style="margin-top:20px">
        <div class="form-group">
          <label>Display Order</label>
          <input id="hero-order" type="number" min="0" value="${heroOrder}" placeholder="0"/>
        </div>
        <div class="form-group">
          <label>Category Label</label>
          <input id="hero-category" type="text" value="${_esc(heroCat)}" placeholder="e.g. College of Computing (CCIS)"/>
        </div>
      </div>

      <div class="save-bar">
        <button class="btn btn-primary" id="save-hero-btn">
          ${lucideIcon('save', 16)} Save Hero Settings
        </button>
        <div class="save-status" id="save-hero-status">
          ${lucideIcon('check', 14)} Saved successfully
        </div>
      </div>
    </div>

    <div class="section-card" style="border-color: var(--border-active);">
      <div class="section-card-header">
        <div class="section-card-icon">${lucideIcon('info', 20)}</div>
        <h3>Showcase Configuration Guide</h3>
      </div>
      <ul style="font-size:0.86rem;color:var(--text-muted);display:flex;flex-direction:column;gap:10px;list-style:none;padding:0">
        <li style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--csu-green-lime)">${lucideIcon('check', 14)}</span>
          <span>Toggle <strong style="color:var(--text-white)">Show in Hero Showcase</strong> to include/exclude this building from the rotating hero.</span>
        </li>
        <li style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--csu-green-lime)">${lucideIcon('check', 14)}</span>
          <span>Set <strong style="color:var(--text-white)">Display Order</strong> to control the position (0 = first).</span>
        </li>
        <li style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--csu-green-lime)">${lucideIcon('check', 14)}</span>
          <span>Set <strong style="color:var(--text-white)">Category Label</strong> — displayed in the pin tooltip on the landing page.</span>
        </li>
        <li style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--csu-green-lime)">${lucideIcon('check', 14)}</span>
          <span>Ensure a <strong style="color:var(--text-white)">3D Model URL</strong> is saved on the 3D Model tab for showcase rendering.</span>
        </li>
      </ul>
    </div>`;

  document.getElementById('save-hero-btn')?.addEventListener('click', () => _saveHero(b.Building_ID));
}

async function _saveHero(id) {
  const btn = document.getElementById('save-hero-btn');
  btn.disabled = true;
  btn.innerHTML = `${lucideIcon('info', 16)} Saving…`;

  const fields = {
    show_in_hero:   document.getElementById('hero-show-toggle')?.checked ?? false,
    hero_order:     parseInt(document.getElementById('hero-order')?.value || '0', 10),
    hero_category:  document.getElementById('hero-category')?.value.trim() || null,
  };

  const { error } = await updateBuilding(id, fields);
  btn.disabled = false;
  btn.innerHTML = `${lucideIcon('save', 16)} Save Hero Settings`;

  if (error) {
    _toast('Save failed: ' + (error.message || 'Unknown error') + ' — ensure columns exist in BUILDINGS.', 'error');
  } else {
    _toast('Hero showcase settings updated ✓', 'success');
    const status = document.getElementById('save-hero-status');
    if (status) { status.classList.add('visible'); setTimeout(() => status.classList.remove('visible'), 3000); }
  }
}

// ── Tab Management ─────────────────────────────────────────────────────────
function _bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
  });
}

function _switchTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
}

// ── Utilities ──────────────────────────────────────────────────────────────
function _getRowData(tr, buildingId) {
  const data = { Building_ID: buildingId };
  tr.querySelectorAll('input[data-field]').forEach(input => {
    data[input.dataset.field] = input.value.trim();
  });
  return data;
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function _formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Toast ──────────────────────────────────────────────────────────────────
function _toast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconMarkup = {
    success: lucideIcon('check', 16, 2.5),
    error: lucideIcon('x', 16, 2.5),
    info: lucideIcon('info', 16, 2.5)
  };
  toast.innerHTML = `<span style="display:flex;align-items:center">${iconMarkup[type] || lucideIcon('info', 16)}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function _confirm(message, onConfirm) {
  let overlay = document.getElementById('confirm-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-box">
        <h3>Confirm Action</h3>
        <p id="confirm-msg"></p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-ok">
            ${lucideIcon('trash', 14)} Delete
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('confirm-cancel')?.addEventListener('click', () => overlay.classList.remove('visible'));
  }
  document.getElementById('confirm-msg').textContent = message;
  overlay.classList.add('visible');
  const okBtn = document.getElementById('confirm-ok');
  const newOk = okBtn.cloneNode(true);
  okBtn.replaceWith(newOk);
  newOk.addEventListener('click', () => {
    overlay.classList.remove('visible');
    onConfirm();
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────
init();
