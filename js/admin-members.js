// SKy Fit Pro — Admin üzvlər görünüşü
import { UI_CONFIG } from './config.js';
import {
  $, byId, clearElement, createElement, normalizeString, normalizeSearch,
  escapeHtml, formatDate, debounce, getProfileName, roleLabel,
} from './core.js';

export function createAdminMembersController(ctx) {
  const { state, visibleListItems, bindInfiniteList, resetListLimit, memberAvatarMarkup, openMemberPreview, createDashboardEmpty } = ctx;
  function filtered() {
    const search = normalizeSearch(byId('members-search')?.value);
    const role = normalizeString(byId('members-role-filter')?.value, 'all');
    const status = normalizeString(byId('members-status-filter')?.value, 'all');
    return state.members.filter(member => {
      if (!search) return true;
      return [member.full_name, member.email, member.phone, member.address].filter(Boolean).join(' ').toLocaleLowerCase('az-AZ').includes(search);
    }).filter(member => role === 'all' || member.role === role)
      .filter(member => status === 'all' || (status === 'active' ? member.is_active !== false : member.is_active === false));
  }
  function statusMeta(member) {
    return member.is_active === false ? { label: 'Deaktiv', className: 'ui-badge ui-badge--danger' } : { label: 'Aktiv', className: 'ui-badge ui-badge--success' };
  }
  function render() {
    const root = byId('members-list'); if (!root) return;
    clearElement(root); const members = filtered();
    const table = createElement('table', { className: 'admin-table' });
    table.innerHTML = `<thead><tr><th>İstifadəçi</th><th>Telefon</th><th>Rol</th><th>Status</th><th>Qeydiyyat</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    visibleListItems('members', members).forEach(member => {
      const status = statusMeta(member); const row = createElement('tr');
      row.innerHTML = `<td><div class="admin-user-cell">${memberAvatarMarkup(member)}<span class="admin-user-cell__identity"><strong class="admin-table__primary">${escapeHtml(getProfileName(member))}</strong><span class="admin-table__secondary">${escapeHtml(member.email || 'E-poçt yoxdur')}</span></span></div></td>
        <td>${escapeHtml(member.phone || '—')}</td><td><span class="${member.role === 'admin' ? 'ui-badge ui-badge--danger' : member.role === 'staff' ? 'ui-badge ui-badge--warning' : 'ui-badge ui-badge--neutral'}">${escapeHtml(roleLabel(member.role))}</span></td>
        <td><span class="${status.className}">${escapeHtml(status.label)}</span></td><td>${formatDate(member.created_at)}</td>`;
      row.classList.add('admin-table__clickable-row'); row.tabIndex = 0; row.setAttribute('role','button'); row.setAttribute('aria-label', `${getProfileName(member)} məlumatlarını aç`);
      row.addEventListener('click', () => void openMemberPreview(member, row));
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openMemberPreview(member, row); } });
      tbody.append(row);
    });
    root.append(table); bindInfiniteList(root, 'members', render, members.length);
    if (!members.length) root.append(createDashboardEmpty('İstifadəçi tapılmadı.'));
  }
  function bind() {
    byId('members-search')?.addEventListener('input', debounce(() => { resetListLimit('members'); render(); }, UI_CONFIG.debounceDelay));
    byId('members-role-filter')?.addEventListener('change', () => { resetListLimit('members'); render(); });
    byId('members-status-filter')?.addEventListener('change', () => { resetListLimit('members'); render(); });
  }
  return { render, bind };
}
