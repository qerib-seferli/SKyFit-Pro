// SKy Fit Pro — Üzvlük planları və üzvlük tarixçəsi görünüşü
import {
  $, $$, byId, clearElement, createElement, normalizeString, normalizeSearch,
  escapeHtml, money, formatDate, getProfileName, membershipIsActive,
  membershipStatusLabel,
} from './core.js';

export function createAdminMembershipsController(ctx) {
  const {
    state, visibleListItems, bindInfiniteList, createDashboardEmpty,
    openMembershipPlanEditor, paymentStatusLabel, paymentStatusClass,
  } = ctx;

  function filteredMemberships() {
    const search = normalizeSearch(byId('memberships-search')?.value);
    const status = normalizeString(byId('memberships-status-filter')?.value, 'all');
    return state.memberships.filter(membership => {
      if (!search) return true;
      const text = [
        membership.member?.full_name,
        membership.member?.email,
        membership.member?.phone,
        membership.membership_plan?.name,
      ].filter(Boolean).join(' ').toLocaleLowerCase('az-AZ');
      return text.includes(search);
    }).filter(membership => {
      if (status === 'all') return true;
      if (status === 'active') return membershipIsActive(membership);
      return membership.status === status;
    });
  }

  function badgeClass(membership) {
    if (membershipIsActive(membership)) return 'ui-badge ui-badge--success';
    if (membership.status === 'cancelled') return 'ui-badge ui-badge--danger';
    return 'ui-badge ui-badge--warning';
  }

  function renderMemberships() {
    const root = byId('memberships-list');
    if (!root) return;
    clearElement(root);
    const memberships = filteredMemberships();
    const table = createElement('table', { className: 'admin-table' });
    table.innerHTML = `<thead><tr><th>Üzv</th><th>Plan</th><th>Qiymət</th><th>Başlanğıc</th><th>Bitmə</th><th>Ödəniş</th><th>Status</th><th>Operator</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);

    visibleListItems('memberships', memberships).forEach(membership => {
      const row = createElement('tr');
      row.innerHTML = `
        <td><strong class="admin-table__primary">${escapeHtml(getProfileName(membership.member))}</strong><span class="admin-table__secondary">${escapeHtml(membership.member?.phone || membership.member?.email || '—')}</span></td>
        <td>${escapeHtml(membership.membership_plan?.name || 'Üzvlük')}</td>
        <td><strong>${escapeHtml(money(membership.price))}</strong></td>
        <td>${formatDate(membership.start_date)}</td><td>${formatDate(membership.end_date)}</td>
        <td><span class="${paymentStatusClass(membership.payment_status)}">${escapeHtml(paymentStatusLabel(membership.payment_status))}</span></td>
        <td><span class="${badgeClass(membership)}">${escapeHtml(membershipStatusLabel(membership))}</span></td>
        <td><strong class="admin-table__primary">${escapeHtml(membership.created_by_profile?.full_name || 'Sistem')}</strong>${membership.updated_by_profile?.full_name ? `<span class="admin-table__secondary">Son dəyişiklik: ${escapeHtml(membership.updated_by_profile.full_name)}</span>` : ''}</td>`;
      tbody.append(row);
    });
    root.append(table);
    bindInfiniteList(root, 'memberships', renderMemberships, memberships.length);
    if (!memberships.length) root.append(createDashboardEmpty('Üzvlük tapılmadı.'));
  }

  function renderPlans() {
    const root = byId('membership-plans-grid');
    if (!root) return;
    clearElement(root);
    state.membershipPlans.forEach(plan => {
      const card = createElement('article', { className: `membership-plan-card${plan.is_daily ? ' membership-plan-card--daily' : ''}` });
      card.innerHTML = `
        <div class="membership-plan-card__top"><span class="membership-plan-card__icon" aria-hidden="true">${plan.is_daily ? '1G' : `${plan.duration_days || 30}G`}</span><span class="${plan.is_active ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">${plan.is_active ? 'Aktiv' : 'Deaktiv'}</span></div>
        <div class="membership-plan-card__content"><span class="membership-plan-card__type">${plan.is_daily ? 'Günlük giriş' : 'Üzvlük planı'}</span><strong class="membership-plan-card__title">${escapeHtml(plan.name)}</strong><span class="membership-plan-card__duration">${escapeHtml(String(plan.duration_days))} gün</span></div>
        <div class="membership-plan-card__price"><strong>${escapeHtml(money(plan.price))}</strong><span>${plan.is_daily ? '1 giriş üçün' : `${escapeHtml(String(plan.duration_days))} gün üçün`}</span></div>
        <button type="button" class="ui-button ui-button--glass ui-button--full" data-plan-edit="${escapeHtml(plan.id)}"><span class="ui-button__label">Planı redaktə et</span></button>`;
      root.append(card);
    });
    $$('[data-plan-edit]', root).forEach(button => button.addEventListener('click', () => {
      const plan = state.membershipPlans.find(item => String(item.id) === String(button.dataset.planEdit));
      if (plan) openMembershipPlanEditor(plan, button);
    }));
  }

  return { renderMemberships, renderPlans, filteredMemberships };
}
