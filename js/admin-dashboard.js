// SKy Fit Pro — Dashboard v2
import { supabase, RPC } from './config.js';
import { byId, clearElement, createElement, escapeHtml, money, number, notify, getErrorMessage } from './core.js';

const state = { loaded: false, data: null };

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('az-AZ', { day: '2-digit', month: '2-digit' }).format(date);
}

function renderTrend(items = []) {
  const root = byId('dashboard-trend-chart');
  if (!root) return;
  clearElement(root);
  if (!items.length) {
    root.innerHTML = '<div class="ui-empty-state"><span>Maliyyə trendi üçün məlumat yoxdur.</span></div>';
    return;
  }

  const max = Math.max(1, ...items.map(item => Math.max(number(item.income), number(item.expense))));
  const chart = createElement('div', { className: 'dashboard-trend' });
  items.forEach(item => {
    const income = number(item.income);
    const expense = number(item.expense);
    const col = createElement('div', { className: 'dashboard-trend__day' });
    col.innerHTML = `
      <div class="dashboard-trend__bars" title="${escapeHtml(shortDate(item.date))} · Mədaxil ${escapeHtml(money(income))} · Məxaric ${escapeHtml(money(expense))}">
        <span class="dashboard-trend__bar dashboard-trend__bar--income" style="--bar:${Math.max(3,(income/max)*100)}%"></span>
        <span class="dashboard-trend__bar dashboard-trend__bar--expense" style="--bar:${Math.max(3,(expense/max)*100)}%"></span>
      </div>
      <span>${escapeHtml(shortDate(item.date))}</span>`;
    chart.append(col);
  });
  root.append(chart);
}

function render(data = {}) {
  setText('dashboard-cash-register', money(data.cash_register));
  setText('dashboard-cash-today', money(data.cash_today));
  setText('dashboard-card-today', money(data.card_today));
  setText('dashboard-profit-today', money(data.gross_profit_today));
  setText('dashboard-walkin-today', String(number(data.walk_in_today)));
  renderTrend(Array.isArray(data.trend) ? data.trend : []);
}

export async function loadDashboardOverviewV2() {
  try {
    const { data, error } = await supabase.rpc(RPC.getDashboardOverviewV2);
    if (error) throw error;
    state.data = data || {};
    state.loaded = true;
    render(state.data);
    return state.data;
  } catch (error) {
    console.error('[SKy Fit Dashboard v2]', error);
    notify.error(getErrorMessage(error, 'Dashboard maliyyə göstəriciləri yüklənmədi.'));
    return null;
  }
}
