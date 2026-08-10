// SKy Fit Pro — Biznes hesabatları
import { supabase, RPC } from './config.js';
import { $, byId, clearElement, createElement, escapeHtml, money, notify, getErrorMessage, number } from './core.js';

const state = { report: null, bound: false };

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rangeForPreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from = new Date(today);
  let to = new Date(today);

  if (preset === 'week') {
    const day = (today.getDay() + 6) % 7;
    from.setDate(today.getDate() - day);
  } else if (preset === 'month') {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
  } else if (preset === 'last_month') {
    from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === 'year') {
    from = new Date(today.getFullYear(), 0, 1);
  }

  return { from: isoDate(from), to: isoDate(to) };
}

function applyPreset() {
  const preset = byId('reports-preset')?.value || 'month';
  const from = byId('reports-date-from');
  const to = byId('reports-date-to');
  if (preset === 'custom') return;
  const range = rangeForPreset(preset);
  if (from) from.value = range.from;
  if (to) to.value = range.to;
}

function setMoney(id, value) {
  const node = byId(id);
  if (node) node.textContent = money(value || 0);
}

function renderTopProducts(items = []) {
  const root = byId('report-top-products');
  if (!root) return;
  clearElement(root);

  if (!items.length) {
    root.innerHTML = '<div class="ui-empty-state"><strong>Bu dövrdə məhsul satışı yoxdur</strong><span>Tarix aralığını dəyişərək yenidən yoxla.</span></div>';
    return;
  }

  const table = createElement('table', { className: 'admin-table report-products-table' });
  table.innerHTML = '<thead><tr><th>Məhsul</th><th>Miqdar</th><th>Satış</th><th>Maya</th><th>Brüt qazanc</th></tr></thead><tbody></tbody>';
  const tbody = $('tbody', table);
  items.forEach(item => {
    const row = createElement('tr');
    row.innerHTML = `<td><strong>${escapeHtml(item.product_name || 'Məhsul')}</strong></td><td>${escapeHtml(String(number(item.quantity).toFixed(3)))}</td><td>${escapeHtml(money(item.revenue))}</td><td>${escapeHtml(money(item.cost))}</td><td><strong class="finance-amount finance-amount--income">${escapeHtml(money(item.gross_profit))}</strong></td>`;
    tbody.append(row);
  });
  root.append(table);
}

function renderReport(report) {
  if (!report) return;
  setMoney('report-income', report.income);
  setMoney('report-expense', report.expense);
  setMoney('report-net', report.net);
  setMoney('report-cash-register', report.cash_register);
  setMoney('report-sales-revenue', report.sales_revenue);
  setMoney('report-sales-cost', report.sales_cost);
  setMoney('report-sales-profit', report.sales_gross_profit);
  setMoney('report-open-debt', report.open_debt);
  setMoney('report-staff-advance', report.staff_advance_open);
  setMoney('report-payroll-expense', report.payroll_expense);
  setMoney('report-membership-income', report.membership_income);
  setMoney('report-walkin-income', report.walk_in_income);
  setMoney('report-debt-income', report.debt_payment_income);
  setMoney('report-cash-income', report.cash_income);
  setMoney('report-card-income', report.card_income);

  const net = byId('report-net');
  net?.classList.remove('finance-value--income', 'finance-value--expense', 'finance-value--neutral');
  net?.classList.add(number(report.net) > 0 ? 'finance-value--income' : number(report.net) < 0 ? 'finance-value--expense' : 'finance-value--neutral');
  renderTopProducts(Array.isArray(report.top_products) ? report.top_products : []);
}

export async function loadAndRenderReports() {
  try {
    applyPreset();
    const from = byId('reports-date-from')?.value || rangeForPreset('month').from;
    const to = byId('reports-date-to')?.value || rangeForPreset('month').to;
    const { data, error } = await supabase.rpc(RPC.getBusinessReportV1, { p_from: from, p_to: to });
    if (error) throw error;
    state.report = data || {};
    renderReport(state.report);
  } catch (error) {
    console.error('[SKy Fit Hesabatlar]', error);
    notify.error(getErrorMessage(error, 'Hesabat hesablanmadı.'));
  }
}

export function bindReportsEvents() {
  if (state.bound) return;
  state.bound = true;
  byId('reports-preset')?.addEventListener('change', () => {
    applyPreset();
    if (byId('reports-preset')?.value !== 'custom') void loadAndRenderReports();
  });
  byId('reports-apply-button')?.addEventListener('click', () => void loadAndRenderReports());
  byId('reports-refresh-button')?.addEventListener('click', () => void loadAndRenderReports());
  applyPreset();
}
