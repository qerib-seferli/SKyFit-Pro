// SKy Fit Pro — Borc hesabları və borc əməliyyatları görünüşü
import {
  $, $$, byId, clearElement, createElement, normalizeString, normalizeSearch,
  escapeHtml, money, formatDateTime, getProfileName, debtBalance, setText,
} from './core.js';

export function createAdminDebtsController(ctx) {
  const { state, visibleListItems, bindInfiniteList, openDebtPaymentModal, paymentMethodLabel } = ctx;

  function filteredDebts() {
    const search = normalizeSearch(byId('debt-search')?.value);
    const status = normalizeString(byId('debt-status-filter')?.value, 'open');
    return state.debts.filter(account => {
      if (!search) return true;
      return [account.member?.full_name, account.member?.phone, account.member?.email]
        .filter(Boolean).join(' ').toLocaleLowerCase('az-AZ').includes(search);
    }).filter(account => status === 'all' || (status === 'closed' ? debtBalance(account) <= 0 : debtBalance(account) > 0));
  }

  function renderTotals(accounts) {
    const open = accounts.filter(account => debtBalance(account) > 0);
    setText(byId('debt-total-amount'), money(open.reduce((sum, account) => sum + debtBalance(account), 0)));
    setText(byId('debt-open-count'), open.length);
  }

  function transactionLabel(transaction) {
    switch (normalizeString(transaction?.transaction_type)) {
      case 'payment': return 'Ödəniş';
      case 'debt': return 'Yeni borc';
      case 'adjustment': return 'Düzəliş';
      case 'cancellation': return 'Ləğv';
      default: return normalizeString(transaction?.transaction_type, 'Əməliyyat');
    }
  }

  function renderTransactions() {
    const root = byId('debt-transactions-list');
    if (!root) return;
    clearElement(root);
    visibleListItems('debtTransactions', state.debtTransactions).forEach(transaction => {
      const member = state.members.find(item => String(item.id) === String(transaction.member_id));
      const payment = ['payment', 'cancellation'].includes(transaction.transaction_type);
      const item = createElement('article', { className: 'operation-item' });
      item.innerHTML = `<span class="operation-item__icon">${payment ? '↓' : '↑'}</span><span class="operation-item__content"><strong class="operation-item__title">${escapeHtml(transactionLabel(transaction))} · ${escapeHtml(getProfileName(member))}</strong><span class="operation-item__meta">${escapeHtml(transaction.note || paymentMethodLabel(transaction.payment_method))}</span></span><span class="operation-item__side debt-operation-side"><strong class="debt-operation-amount ${payment ? 'finance-amount finance-amount--income' : 'finance-amount finance-amount--expense'}">${escapeHtml(money(transaction.amount))}</strong><span class="debt-operation-date">${formatDateTime(transaction.created_at)}</span></span>`;
      root.append(item);
    });
    bindInfiniteList(root, 'debtTransactions', renderTransactions, state.debtTransactions.length);
  }

  function render() {
    const root = byId('debt-accounts-list');
    if (!root) return;
    clearElement(root);
    const accounts = filteredDebts();
    renderTotals(state.debts);
    const table = createElement('table', { className: 'admin-table' });
    table.innerHTML = `<thead><tr><th>Üzv</th><th>Borc</th><th>Son dəyişiklik</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    accounts.forEach(account => {
      const balance = debtBalance(account); const row = createElement('tr');
      row.innerHTML = `<td class="admin-person-cell"><strong class="admin-table__primary">${escapeHtml(getProfileName(account.member))}</strong><span class="admin-table__secondary">${escapeHtml(account.member?.phone || account.member?.email || '—')}</span></td><td class="debt-account-amount"><strong class="${balance > 0 ? 'finance-amount finance-amount--expense' : 'finance-amount'}">${escapeHtml(money(balance))}</strong></td><td class="debt-account-date">${formatDateTime(account.updated_at)}</td><td><span class="${balance > 0 ? 'ui-badge ui-badge--danger' : 'ui-badge ui-badge--success'}">${balance > 0 ? 'Açıq borc' : 'Ödənilib'}</span></td><td class="debt-account-action">${balance > 0 ? `<button type="button" class="ui-button ui-button--primary" data-debt-pay="${escapeHtml(account.member_id)}"><span class="ui-button__label">Ödəniş</span></button>` : '—'}</td>`;
      tbody.append(row);
    });
    root.append(table);
    $$('[data-debt-pay]', root).forEach(button => button.addEventListener('click', () => {
      const account = state.debts.find(item => String(item.member_id) === String(button.dataset.debtPay));
      if (account) openDebtPaymentModal(account, button);
    }));
    renderTransactions();
  }

  return { render, renderTransactions, filteredDebts };
}
