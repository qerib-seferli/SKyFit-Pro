// SKy Fit Pro — Maliyyə və KASSA görünüşü
import {
  $, byId, clearElement, createElement, escapeHtml, number, money,
  formatDate, formatTime, ledgerType, ledgerAmount, setText,
} from './core.js';

export function createAdminFinanceController(ctx) {
  const {
    state, filteredLedger, visibleListItems, bindInfiniteList, createDashboardEmpty,
    paymentMethodLabel, financeReferenceLabel,
  } = ctx;

  function totals(entries) {
    const income = entries.filter(entry => ledgerType(entry) === 'income').reduce((sum, entry) => sum + ledgerAmount(entry), 0);
    const expense = entries.filter(entry => ledgerType(entry) === 'expense').reduce((sum, entry) => sum + ledgerAmount(entry), 0);
    return { income, expense, balance: income - expense };
  }

  function renderKpis(summary, entries) {
    const income = byId('finance-income'); const expense = byId('finance-expense'); const balance = byId('finance-balance');
    const cash = byId('cash-register-balance'); const card = byId('finance-card-turnover');
    setText(income, money(summary.income)); setText(expense, money(summary.expense)); setText(balance, money(summary.balance));
    setText(cash, money(state.cashRegisterBalance)); setText(card, money(entries.reduce((sum, entry) => sum + number(entry.card_amount), 0)));
    income?.classList.add('finance-value', 'finance-value--income'); expense?.classList.add('finance-value', 'finance-value--expense');
    cash?.classList.add('finance-value'); card?.classList.add('finance-value');
    balance?.classList.remove('finance-value--income', 'finance-value--expense', 'finance-value--neutral'); balance?.classList.add('finance-value');
    balance?.classList.add(summary.balance > 0 ? 'finance-value--income' : summary.balance < 0 ? 'finance-value--expense' : 'finance-value--neutral');
  }

  function renderCash() {
    const root = byId('cash-register-list'); if (!root) return;
    clearElement(root);
    const table = createElement('table', { className: 'admin-table cash-register-table' });
    table.innerHTML = `<thead><tr><th>Tarix</th><th>Hərəkət</th><th>Kateqoriya</th><th>Açıqlama</th><th>Məbləğ</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    visibleListItems('cash', state.cashRegisterEntries).forEach(entry => {
      const incoming = entry.direction === 'in'; const row = createElement('tr');
      row.innerHTML = `<td class="admin-datetime-cell"><strong class="admin-table__primary">${formatDate(entry.entry_date)}</strong><span class="admin-table__secondary">${formatTime(entry.created_at)}</span></td><td><span class="${incoming ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">${incoming ? 'Kassaya daxil' : 'Kassadan çıxış'}</span></td><td>${escapeHtml(entry.category || '—')}</td><td class="admin-description-cell">${escapeHtml(entry.description || '—')}</td><td class="admin-money-cell"><strong class="${incoming ? 'finance-amount finance-amount--income' : 'finance-amount finance-amount--expense'}">${incoming ? '+' : '−'} ${escapeHtml(money(entry.amount))}</strong></td>`;
      tbody.append(row);
    });
    root.append(table);
    bindInfiniteList(root, 'cash', renderCash, state.cashRegisterEntries.length);
    if (!state.cashRegisterEntries.length) root.append(createDashboardEmpty('Kassa kitabı yenidir. “Kassa qalığını düzəlt” ilə hazır fiziki nağd qalığı bir dəfə qeyd et.'));
  }

  function render() {
    const root = byId('finance-ledger-list'); if (!root) return;
    const entries = filteredLedger(); const summary = totals(entries);
    renderKpis(summary, entries); renderCash(); clearElement(root);
    const table = createElement('table', { className: 'admin-table finance-table' });
    table.innerHTML = `<thead><tr><th>Tarix</th><th>Növ</th><th>Kateqoriya</th><th>Açıqlama</th><th>Ödəniş</th><th>Mənbə</th><th>Məbləğ</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    visibleListItems('finance', entries).forEach(entry => {
      const type = ledgerType(entry); const row = createElement('tr'); row.classList.add(type === 'income' ? 'finance-row--income' : 'finance-row--expense');
      row.innerHTML = `<td class="admin-datetime-cell"><strong class="admin-table__primary">${formatDate(entry.entry_date)}</strong><span class="admin-table__secondary">${entry.created_at ? formatTime(entry.created_at) : ''}</span></td><td><span class="${type === 'income' ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">${type === 'income' ? 'Mədaxil' : 'Məxaric'}</span></td><td>${escapeHtml(entry.category || '—')}</td><td class="admin-description-cell">${escapeHtml(entry.description || '—')}</td><td><span class="ui-badge ui-badge--neutral">${escapeHtml(paymentMethodLabel(entry.payment_method))}</span></td><td><span class="ui-badge ui-badge--neutral">${escapeHtml(financeReferenceLabel(entry.reference_type))}</span></td><td class="admin-money-cell"><strong class="${type === 'income' ? 'finance-amount finance-amount--income' : 'finance-amount finance-amount--expense'}">${type === 'income' ? '+' : '−'} ${escapeHtml(money(ledgerAmount(entry)))}</strong></td>`;
      tbody.append(row);
    });
    root.append(table);
    if (!entries.length) root.append(createDashboardEmpty('Seçilmiş filtrə uyğun maliyyə əməliyyatı yoxdur.'));
    bindInfiniteList(root, 'finance', render, entries.length);
  }

  return { render, renderCash, renderKpis, totals };
}
