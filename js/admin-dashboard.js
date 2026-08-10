// SKy Fit Pro — Dashboard v2
import { supabase, RPC } from './config.js';
import {
  byId,
  clearElement,
  createElement,
  escapeHtml,
  money,
  number,
  notify,
  getErrorMessage,
  validDate,
} from './core.js';

const state = {
  loaded: false,
  data: null,
};

const shortDateFormatter = new Intl.DateTimeFormat('az-AZ', {
  day: '2-digit',
  month: '2-digit',
});

function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value;
}

function shortDate(value) {
  const date = validDate(value);
  return date ? shortDateFormatter.format(date) : '—';
}

function normalizeTrend(items) {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    ...item,
    date: item?.date ?? item?.entry_date ?? item?.day ?? null,
    income: number(item?.income),
    expense: number(item?.expense),
  }));
}

function renderTrend(items = []) {
  const root = byId('dashboard-trend-chart');
  if (!root) return;

  clearElement(root);

  const trendItems = normalizeTrend(items);

  if (!trendItems.length) {
    root.textContent = 'Maliyyə trendi üçün məlumat yoxdur.';
    return;
  }

  const max = Math.max(
    1,
    ...trendItems.map(item => Math.max(item.income, item.expense))
  );

  const chart = createElement('div', {
    className: 'dashboard-trend',
  });

  trendItems.forEach(item => {
    const income = item.income;
    const expense = item.expense;
    const dateLabel = shortDate(item.date);

    const col = createElement('div', {
      className: 'dashboard-trend__day',
    });

    col.innerHTML = `
      <div
        class="dashboard-trend__bars"
        title="${escapeHtml(dateLabel)} · Mədaxil ${escapeHtml(money(income))} · Məxaric ${escapeHtml(money(expense))}"
      >
        <span
          class="dashboard-trend__bar dashboard-trend__bar--income"
          style="--bar:${Math.max(3, (income / max) * 100)}%"
        ></span>
        <span
          class="dashboard-trend__bar dashboard-trend__bar--expense"
          style="--bar:${Math.max(3, (expense / max) * 100)}%"
        ></span>
      </div>
      <span>${escapeHtml(dateLabel)}</span>
    `;

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

  renderTrend(data.trend);
}

export async function loadDashboardOverviewV2() {
  try {
    const { data, error } = await supabase.rpc(
      RPC.getDashboardOverviewV2
    );

    if (error) throw error;

    state.data = data && typeof data === 'object'
      ? data
      : {};

    state.loaded = true;
    render(state.data);

    return state.data;
  } catch (error) {
    console.error(
      '[SKy Fit Dashboard v2]',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Dashboard maliyyə göstəriciləri yüklənmədi.'
      )
    );

    return null;
  }
}
