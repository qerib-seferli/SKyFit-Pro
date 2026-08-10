// SKy Fit Pro — Admin tab/router controller
import { STORAGE_KEYS } from './config.js';
import { $$, normalizeString } from './core.js';

const ADMIN_TABS = new Set([
  'dashboard', 'pos', 'members', 'memberships', 'products', 'stock',
  'debts', 'finance', 'employees', 'reports', 'trainers', 'history',
]);

export function createAdminRouter({ state, loadActiveTab }) {
  function normalizeTab(value) {
    const tab = normalizeString(value, 'dashboard');
    return ADMIN_TABS.has(tab) ? tab : 'dashboard';
  }

  function readStoredAdminTab() {
    try {
      return normalizeTab(localStorage.getItem(STORAGE_KEYS.lastAdminTab));
    } catch {
      return 'dashboard';
    }
  }

  function storeAdminTab(tab) {
    try {
      localStorage.setItem(STORAGE_KEYS.lastAdminTab, normalizeTab(tab));
    } catch {
      // Storage bloklansa da panel işləyir.
    }
  }

  function setActiveTab(tab, options = {}) {
    const target = normalizeTab(tab);
    state.activeTab = target;
    if (options.persist !== false) storeAdminTab(target);

    $$('[data-admin-tab]').forEach(button => {
      const active = button.dataset.adminTab === target;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    $$('[data-admin-panel]').forEach(panel => {
      const active = panel.dataset.adminPanel === target;
      panel.classList.toggle('is-hidden', !active);
      panel.hidden = !active;
    });

    if (options.load !== false) void loadActiveTab();
  }

  function bindTabEvents() {
    $$('[data-admin-tab]').forEach(button => {
      button.addEventListener('click', () => setActiveTab(button.dataset.adminTab));
    });
    $$('[data-admin-open-tab]').forEach(button => {
      button.addEventListener('click', () => setActiveTab(button.dataset.adminOpenTab));
    });
  }

  function resolveInitialAdminTab() {
    const params = new URLSearchParams(window.location.search);
    const requested = normalizeString(params.get('tab'));
    return requested ? normalizeTab(requested) : readStoredAdminTab();
  }

  return { normalizeTab, setActiveTab, bindTabEvents, resolveInitialAdminTab };
}
