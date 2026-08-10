// SKy Fit Pro — Admin / Staff Management Controller
// Senior Full Stack Developer: Qərib Səfərli

import {
  APP_CONFIG,
  UI_CONFIG,
  STORAGE_KEYS,
} from './config.js';

import {
  SKYFIT_EVENTS,

  $,
  $$,
  byId,
  clearElement,
  createElement,
  showElement,
  hideElement,
  setText,

  normalizeString,
  normalizeSearch,
  escapeHtml,

  number,
  money,

  formatDate,
  formatTime,
  formatDateTime,
  todayIso,

  debounce,
  rows,

  getCurrentIdentity,
  getProfileName,
  getProfileInitials,
  getProfileAvatar,

  roleLabel,

  productName,
  productPrice,
  productStock,
  productStockUnit,
  productUnitLabel,
  productImage,
  productStockState,
  productSaleMode,

  trainerName,
  trainerSpecialty,
  trainerImage,

  membershipIsActive,
  membershipStatusLabel,

  attendanceDate,
  attendanceTypeLabel,

  ledgerType,
  ledgerAmount,

  debtBalance,

  openModal,
  closeModal,
  confirmDialog,

  notify,
  getErrorMessage,
  setFieldError,
  setButtonLoading,

  asyncHandler,
} from './core.js';

import {
  initLayout,
} from './layout.js';

import {
  loadAndRenderWorkforce,
  bindWorkforceEvents,
} from './admin-workforce.js';

import {
  loadAndRenderReports,
  bindReportsEvents,
} from './admin-reports.js';

import {
  loadAndRenderSales,
  bindSalesHistoryEvents,
} from './admin-sales.js';

import { loadDashboardOverviewV2 } from './admin-dashboard.js';

import {
  historyTableLabel,
  historyActionLabel,
  historyActionClass,
  openAuditDetail as openAuditDetailView,
} from './admin-history.js';

import { createAdminProductsController } from './admin-products.js';
import { createAdminStockController } from './admin-stock.js';
import { createAdminMembersController } from './admin-members.js';
import { createAdminMembershipsController } from './admin-memberships.js';
import { createAdminDebtsController } from './admin-debts.js';
import { createAdminFinanceController } from './admin-finance.js';
import { createAdminTrainersController } from './admin-trainers.js';
import { createAdminStockActions } from './admin-stock-actions.js';
import { createAdminMembershipActions } from './admin-membership-actions.js';
import { createAdminDebtActions } from './admin-debt-actions.js';
import { createAdminFinanceActions } from './admin-finance-actions.js';
import {
  createAdminPosController, productSaleVariants, productHasSaleVariants, saleVariantName,
  saleVariantPrice, saleVariantDeduction, saleVariantType, saleVariantIsCustom,
  saleVariantTypeLabel, productDisplayPrice, productDisplayUnit, productDisplayPriceLabel,
} from './admin-pos.js';
import { createAdminProductEditor, stockUnitLabel } from './admin-product-editor.js';
import { createAdminDataService } from './admin-data.js';
import { createAdminRouter } from './admin-router.js';
import { createAdminQuickSale } from './admin-quick-sale.js';
import { bindAdminRuntimeEvents } from './admin-events.js';

const ADMIN_OPERATION_EVENT = 'skyfit:admin-operation';

const state = {

  identity:
    null,

  activeTab:
    'dashboard',

  products:
    [],

  members:
    [],

  membershipPlans:
    [],

  memberships:
    [],

  attendance:
    [],

  debts:
    [],

  debtTransactions:
    [],

  ledger:
    [],

  expenseCategories:
    [],

  incomeCategories:
    [],

  cashRegisterEntries:
    [],

  cashRegisterBalance:
    0,

  trainers:
    [],

  stockMovements:
    [],

  sales:
    [],

  saleItems:
    [],

  listLimits: {
    members: 50,
    memberships: 50,
    stockMovements: 50,
    debts: 50,
    debtTransactions: 50,
    finance: 50,
    cash: 50,
    history: 50,
  },

  remotePaging: {
    stockMovements: { feed: 'stock_movements', offset: 0, hasMore: true, loading: false },
    debtTransactions: { feed: 'debt_transactions', offset: 0, hasMore: true, loading: false },
    finance: { feed: 'ledger', offset: 0, hasMore: true, loading: false },
    cash: { feed: 'cash', offset: 0, hasMore: true, loading: false },
    history: { feed: 'audit', offset: 0, hasMore: true, loading: false },
  },

  history:
    [],

  dashboard: {
    loaded:
      false,
  },

  loading: {
    dashboard:
      false,

    products:
      false,

    members:
      false,

    memberships:
      false,

    attendance:
      false,

    debts:
      false,

    finance:
      false,

    cash:
      false,

    trainers:
      false,

    history:
      false,
  },

  busy:
    false,
};

const dataService = createAdminDataService({
  state,
  resetListLimit,
  renderDashboard: () => renderDashboard(),
});

const {
  loadRemotePage,
  loadProducts,
  loadMembers,
  loadMembershipPlans,
  loadMemberships,
  loadAttendance,
  loadDebts,
  loadDebtTransactions,
  loadLedger,
  loadStockMovements,
  loadSales,
  loadSaleItems,
  loadExpenseCategories,
  loadIncomeCategories,
  loadCashRegisterEntries,
  loadTrainers,
  loadHistory,
  loadDashboard,
} = dataService;

let quickSaleController = null;

function renderQuickSaleProducts() {
  return quickSaleController?.render?.();
}

const productEditorController = createAdminProductEditor({
  state, loadProducts, loadHistory, renderAdminProducts, renderPosProducts, renderQuickSaleProducts,
});

const posController = createAdminPosController({
  state, stockNumber, productStockText, memberOptionsMarkup, paymentMethodOptionsMarkup,
  paymentSplitMarkup, readPaymentSplit, loadMembers, loadProducts, loadSales, loadSaleItems,
  loadLedger, loadCashRegisterEntries, loadDebts, loadHistory, renderQuickSaleProducts,
  loadAndRenderSales, renderDashboard, operationEventName: ADMIN_OPERATION_EVENT,
});

const productsController = createAdminProductsController({
  state,
  productStockText,
  openProductEditor,
  openStockAddModal,
  openStockAdjustModal,
  createDashboardEmpty,
});

const stockController = createAdminStockController({
  state,
  stockNumber,
  visibleListItems,
  bindInfiniteList,
  openStockAddModal,
  openStockAdjustModal,
});

const membersController = createAdminMembersController({
  state,
  visibleListItems,
  bindInfiniteList,
  resetListLimit,
  memberAvatarMarkup,
  openMemberPreview,
  createDashboardEmpty,
});

const membershipsController = createAdminMembershipsController({
  state, visibleListItems, bindInfiniteList, createDashboardEmpty,
  openMembershipPlanEditor, paymentStatusLabel, paymentStatusClass,
});

const debtsController = createAdminDebtsController({
  state, visibleListItems, bindInfiniteList, openDebtPaymentModal, paymentMethodLabel,
});

const financeController = createAdminFinanceController({
  state, filteredLedger, visibleListItems, bindInfiniteList, createDashboardEmpty,
  paymentMethodLabel, financeReferenceLabel,
});

const trainersController = createAdminTrainersController({
  state, loadTrainers, loadHistory, createDashboardEmpty,
});

const stockActionsController = createAdminStockActions({
  state, productStockText, loadProducts, loadStockMovements, loadLedger, loadCashRegisterEntries, loadHistory,
  renderStock, renderStockProducts, renderAdminProducts, renderPosProducts,
});

const membershipActionsController = createAdminMembershipActions({
  state, memberOptionsMarkup, paymentMethodOptionsMarkup, paymentSplitMarkup, readPaymentSplit,
  loadMembers, loadMembershipPlans, loadMemberships, loadDebts, loadDebtTransactions, loadLedger,
  loadCashRegisterEntries, loadHistory, renderMembershipPlans, renderMemberships, renderMembers,
  renderDashboard, resetListLimit, operationEventName: ADMIN_OPERATION_EVENT,
});

const debtActionsController = createAdminDebtActions({
  paymentMethodOptionsMarkup, paymentSplitMarkup, readPaymentSplit, bindPaymentSplit, loadDebts,
  loadDebtTransactions, loadLedger, loadCashRegisterEntries, loadHistory, renderDebts, renderDashboard,
});

const financeActionsController = createAdminFinanceActions({
  state, loadLedger, loadCashRegisterEntries, loadHistory, renderFinance, renderDashboard,
});


const adminRouter = createAdminRouter({ state, loadActiveTab });
const { setActiveTab, bindTabEvents, resolveInitialAdminTab } = adminRouter;

quickSaleController = createAdminQuickSale({
  state,
  loadProducts,
  productSaleVariants,
  productStockText,
  openPosSaleModal,
});

async function requireAdminStaff() {
  const identity =
    await getCurrentIdentity({
      force:
        true,
    });

  if (
    !identity
      ?.authenticated
  ) {
    window.location.replace(
      APP_CONFIG.routes.login
    );

    return null;
  }

  if (
    !identity.isStaff
  ) {
    window.location.replace(
      APP_CONFIG.routes.home
    );

    return null;
  }

  state.identity =
    identity;

  return identity;
}

function renderOperator() {
  const identity =
    state.identity;

  if (!identity) {
    return;
  }

  setText(
    byId(
      'admin-operator-name'
    ),
    identity.name
  );

  setText(
    byId(
      'admin-operator-role'
    ),
    roleLabel(
      identity.role
    )
  );
}


function resetListLimit(key) {
  if (Object.prototype.hasOwnProperty.call(state.listLimits, key)) {
    state.listLimits[key] = UI_CONFIG.lists?.pageSize || 50;
  }
}

function visibleListItems(key, items = []) {
  const limit = state.listLimits[key] || UI_CONFIG.lists?.pageSize || 50;
  return items.slice(0, limit);
}


function bindInfiniteList(root, key, render, total) {
  if (!root || root.dataset.infiniteBound === key) return;
  root.dataset.infiniteBound = key;
  root.addEventListener('scroll', async () => {
    const threshold = UI_CONFIG.lists?.scrollThreshold || 96;
    if (root.scrollTop + root.clientHeight < root.scrollHeight - threshold) return;
    const pageSize = UI_CONFIG.lists?.pageSize || 50;
    const current = state.listLimits[key] || pageSize;
    if (current < total) {
      state.listLimits[key] = Math.min(current + pageSize, total);
      render();
      return;
    }
    const paging = state.remotePaging?.[key];
    if (!paging?.hasMore || paging.loading) return;
    const added = await loadRemotePage(key, { append: true });
    if (!added.length) return;
    state.listLimits[key] = current + added.length;
    render();
  });
}

function auditIconSvg(item = {}) {
  const table = normalizeString(item.table_name).toLowerCase();
  const action = normalizeString(item.action).toUpperCase();
  const icon = name => {
    const paths = {
      trash: '<path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/>',
      cart: '<circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 8H7"/>',
      box: '<path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10"/>',
      ticket: '<path d="M4 7a2 2 0 0 0 2-2h12v4a2 2 0 0 0 0 4v4H6a2 2 0 0 0-2-2V7Zm8-1v2m0 3v2m0 3v2"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      debt: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1 1.1-1.8 2.8-1.8 1.5 0 2.7.7 2.7 1.8 0 2.8-5.5 1.1-5.5 4 0 1.1 1.2 1.9 3 1.9 1.7 0 3-.8 3-1.9M12 5.5v2.2m0 7.7v2.2"/>',
      money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9H5v2m12 4h2v-2"/>',
      bank: '<path d="m3 9 9-5 9 5H3Zm2 2h14M6 11v6m4-6v6m4-6v6m4-6v6M3 20h18"/>',
      briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3m-12 5h18m-10 0v2h2v-2"/>',
      undo: '<path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>',
      door: '<path d="M5 21V4l11-1v18M5 21h14M13 12h.01"/>',
      edit: '<path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Zm9.5-12.5 3.5 3.5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      dumbbell: '<path d="M7 9v6M4 8v8M17 9v6m3-7v8M7 12h10"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.check}</svg>`;
  };
  if (action === 'DELETE') return icon('trash');
  if (table === 'sales' || table === 'sale_items') return icon('cart');
  if (table === 'products' || table === 'stock_movements' || table === 'product_sale_variants') return icon('box');
  if (table === 'memberships' || table === 'walk_in_entries') return icon('ticket');
  if (table === 'profiles') return icon('user');
  if (table === 'debt_transactions' || table === 'debt_accounts') return icon('debt');
  if (table === 'ledger_entries') return icon('money');
  if (table === 'cash_register_entries') return icon('bank');
  if (table === 'staff_employment' || table === 'staff_payrolls') return icon('briefcase');
  if (table === 'sale_reversals') return icon('undo');
  if (table === 'attendance') return icon('door');
  if (table === 'trainers') return icon('dumbbell');
  return action === 'UPDATE' ? icon('edit') : icon('check');
}

function memberAvatarMarkup(member, className = 'admin-user-cell__avatar') {
  const avatar = getProfileAvatar(member);
  const initials = getProfileInitials(member);
  return `<span class="${className}${avatar ? ' has-image' : ''}">${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(getProfileName(member))}" loading="lazy" decoding="async">` : escapeHtml(initials)}</span>`;
}

function memberFinancialSnapshot(memberId) {
  const membership = state.memberships.find(item => String(item.member_id) === String(memberId) && membershipIsActive(item));
  const debt = state.debts.find(item => String(item.member_id) === String(memberId));
  return { membership, debt };
}

async function openMemberPreview(member, trigger = null) {
  if (!member) return;
  if (!state.memberships.length || !state.debts.length) {
    await Promise.all([loadMemberships(), loadDebts()]);
  }
  const { membership, debt } = memberFinancialSnapshot(member.id);
  const avatar = getProfileAvatar(member);
  const content = createElement('div', { className: 'member-preview' });
  content.innerHTML = `
    <div class="member-preview__hero">
      <div class="member-preview__avatar">
        ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(getProfileName(member))}">` : `<span>${escapeHtml(getProfileInitials(member))}</span>`}
      </div>
      <div class="member-preview__identity">
        <strong>${escapeHtml(getProfileName(member))}</strong>
        <span>${escapeHtml(roleLabel(member.role))} · ${member.is_active === false ? 'Deaktiv' : 'Aktiv'}</span>
      </div>
    </div>
    <div class="member-preview__grid">
      <div><span>Telefon</span><strong>${escapeHtml(member.phone || '—')}</strong></div>
      <div><span>E-poçt</span><strong>${escapeHtml(member.email || '—')}</strong></div>
      <div><span>Ünvan</span><strong>${escapeHtml(member.address || '—')}</strong></div>
      <div><span>Qeydiyyat</span><strong>${formatDate(member.created_at)}</strong></div>
      <div><span>Aktiv üzvlük</span><strong>${membership ? escapeHtml(membership.membership_plan?.name || 'Aktiv') : 'Yoxdur'}</strong></div>
      <div><span>Açıq borc</span><strong class="${debtBalance(debt) > 0 ? 'finance-amount finance-amount--expense' : ''}">${escapeHtml(money(debtBalance(debt)))}</strong></div>
    </div>`;
  openModal({ eyebrow: 'Üzv məlumatı', title: getProfileName(member), content, trigger, className: 'app-modal--member-preview' });
}

function saleDescriptionForLedger(entry) {
  if (normalizeString(entry.reference_type) !== 'sale' || !entry.reference_id) return entry.description || '—';
  const items = state.saleItems.filter(item => String(item.sale_id) === String(entry.reference_id));
  if (!items.length) return entry.description || 'POS satış';
  const labels = items.slice(0, 4).map(item => {
    const variant = normalizeString(item.sale_variant_name);
    const qty = number(item.quantity);
    return `${item.product_name || 'Məhsul'}${variant ? ` · ${variant}` : qty > 1 ? ` ×${qty}` : ''}`;
  });
  if (items.length > 4) labels.push(`+${items.length - 4} məhsul`);
  const payment = paymentMethodLabel(entry.payment_method);
  return `${labels.join(', ')} · ${payment}`;
}

async function loadActiveTab() {
  switch (
    state.activeTab
  ) {
    case 'dashboard':
      await Promise.all([loadDashboard(), loadDashboardOverviewV2()]);
      break;

    case 'pos':
      await loadProducts();
      renderPosProducts();
      await loadAndRenderSales();
      break;

    case 'members':
      await loadMembers();
      renderMembers();
      break;

    case 'memberships':
      await Promise.all([
        loadMembershipPlans(),
        loadMemberships(),
      ]);

      renderMembershipPlans();
      renderMemberships();
      break;

    case 'products':
      await loadProducts();
      renderAdminProducts();
      break;

    case 'stock':
      await Promise.all([
        loadProducts(),
        loadStockMovements(),
      ]);

      renderStock();
      break;

    case 'debts':
      await Promise.all([
        loadDebts(),
        loadDebtTransactions(),
      ]);

      renderDebts();
      break;

    case 'finance':
      await Promise.all([
        loadLedger(),
        loadExpenseCategories(),
        loadIncomeCategories(),
        loadCashRegisterEntries(),
        loadSaleItems(),
        loadMembers(),
      ]);
      renderFinance();
      break;

    case 'employees':
      await loadAndRenderWorkforce();
      break;

    case 'reports':
      await loadAndRenderReports();
      break;

    case 'trainers':
      await loadTrainers();
      renderAdminTrainers();
      break;

    case 'history':
      await loadHistory();
      renderHistory();
      break;

    default:
      break;
  }
}






function isToday(
  value
) {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const now =
    new Date();

  return (
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate()
  );
}

function todayLedgerEntries() {
  const today =
    todayIso();

  return state.ledger.filter(
    entry =>
      entry.entry_date ===
      today
  );
}

function renderDashboard() {
  const todaySales =
    state.sales.filter(
      sale =>
        isToday(
          sale.created_at
        )
    );

  const paidSales =
    todaySales.filter(
      sale =>
        sale.payment_status ===
        'paid'
    );

  const todaySalesTotal =
    paidSales.reduce(
      (
        total,
        sale
      ) =>
        total +
        number(
          sale.total_amount
        ),
      0
    );

  const activeMemberships =
    state.memberships.filter(
      membership =>
        membershipIsActive(
          membership
        )
    );

  const todayAttendance =
    state.attendance.filter(
      attendance =>
        isToday(
          attendanceDate(
            attendance
          )
        )
    );

  const openDebts =
    state.debts.filter(
      account =>
        debtBalance(
          account
        ) > 0
    );

  const totalDebt =
    openDebts.reduce(
      (
        total,
        account
      ) =>
        total +
        debtBalance(
          account
        ),
      0
    );

  const todayLedger =
    todayLedgerEntries();

  const income =
    todayLedger
      .filter(
        entry =>
          ledgerType(
            entry
          ) ===
          'income'
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          ledgerAmount(
            entry
          ),
        0
      );

  const expense =
    todayLedger
      .filter(
        entry =>
          ledgerType(
            entry
          ) ===
          'expense'
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          ledgerAmount(
            entry
          ),
        0
      );

  // KPI values

  setText(
    byId(
      'dashboard-sales-total'
    ),
    money(
      todaySalesTotal
    )
  );

  setText(
    byId(
      'dashboard-sales-count'
    ),
    `${todaySales.length} satış`
  );

  setText(
    byId(
      'dashboard-active-memberships'
    ),
    activeMemberships.length
  );

  setText(
    byId(
      'dashboard-attendance-today'
    ),
    todayAttendance.length
  );

  setText(
    byId(
      'dashboard-debt-total'
    ),
    money(
      totalDebt
    )
  );

  setText(
    byId(
      'dashboard-debt-accounts'
    ),
    `${openDebts.length} açıq hesab`
  );

  setText(
    byId(
      'dashboard-income-today'
    ),
    money(
      income
    )
  );

  setText(
    byId(
      'dashboard-expense-today'
    ),
    money(
      expense
    )
  );

  setText(
    byId(
      'dashboard-balance-today'
    ),
    money(
      income -
      expense
    )
  );

  renderDashboardLowStock();

  renderDashboardMemberships();

  renderDashboardDebts();

  renderDashboardActivity();
}

function renderDashboardLowStock() {
  const root =
    byId(
      'dashboard-low-stock'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const products =
    state.products
      .filter(
        product => {
          const meta =
            productStockState(
              product
            );

          return (
            meta.key ===
              'low' ||
            meta.key ===
              'out'
          );
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          productStock(a) -
          productStock(b)
      )
      .slice(
        0,
        8
      );

  if (
    products.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Stok xəbərdarlığı yoxdur.'
      )
    );

    return;
  }

  products.forEach(
    product => {
      const meta =
        productStockState(
          product
        );

      const item =
        createElement(
          'article',
          {
            className:
              'compact-list-item',
          }
        );

      item.innerHTML = `
        <span class="compact-list-item__icon">
          SK
        </span>

        <span class="compact-list-item__content">

          <strong class="compact-list-item__title">
            ${escapeHtml(
              productName(
                product
              )
            )}
          </strong>

          <span class="compact-list-item__meta">
            ${escapeHtml(
              productStockUnit(
                product
              )
            )}
          </span>

        </span>

        <span class="compact-list-item__side">

          <strong>
            ${escapeHtml(
              String(
                productStock(
                  product
                )
              )
            )}
          </strong>

          <span class="${meta.className}">
            ${escapeHtml(
              meta.label
            )}
          </span>

        </span>
      `;

      root.append(
        item
      );
    }
  );
}

function renderDashboardMemberships() {
  const root =
    byId(
      'dashboard-expiring-memberships'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const now =
    new Date();

  const upcoming =
    state.memberships
      .filter(
        membership =>
          membershipIsActive(
            membership
          )
      )
      .map(
        membership => {
          const end =
            new Date(
              membership.end_date
            );

          const days =
            Math.ceil(
              (
                end.getTime() -
                now.getTime()
              ) /
              86400000
            );

          return {
            membership,
            days,
          };
        }
      )
      .filter(
        item =>
          item.days >= 0 &&
          item.days <= 7
      )
      .sort(
        (
          a,
          b
        ) =>
          a.days -
          b.days
      )
      .slice(
        0,
        8
      );

  if (
    upcoming.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        '7 gün ərzində bitən üzvlük yoxdur.'
      )
    );

    return;
  }

  upcoming.forEach(
    ({
      membership,
      days,
    }) => {
      const member =
        membership.member;

      const item =
        createElement(
          'article',
          {
            className:
              'compact-list-item',
          }
        );

      item.innerHTML = `
        <span class="compact-list-item__icon">
          ${escapeHtml(
            getProfileInitials(
              member
            )
          )}
        </span>

        <span class="compact-list-item__content">

          <strong class="compact-list-item__title">
            ${escapeHtml(
              getProfileName(
                member
              )
            )}
          </strong>

          <span class="compact-list-item__meta">
            ${escapeHtml(
              membership
                .membership_plan
                ?.name ||
              'Üzvlük'
            )}
          </span>

        </span>

        <span class="compact-list-item__side">

          <strong>
            ${
              days === 0
                ? 'Bu gün'
                : `${days} gün`
            }
          </strong>

          <span>
            ${formatDate(
              membership.end_date
            )}
          </span>

        </span>
      `;

      root.append(
        item
      );
    }
  );
}

function renderDashboardDebts() {
  const root =
    byId(
      'dashboard-open-debts'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const debts =
    state.debts
      .filter(
        account =>
          debtBalance(
            account
          ) > 0
      )
      .sort(
        (
          a,
          b
        ) =>
          debtBalance(b) -
          debtBalance(a)
      )
      .slice(
        0,
        8
      );

  if (
    debts.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Açıq borc yoxdur.'
      )
    );

    return;
  }

  debts.forEach(
    account => {
      const member =
        account.member;

      const item =
        createElement(
          'article',
          {
            className:
              'compact-list-item',
          }
        );

      item.innerHTML = `
        <span class="compact-list-item__icon">
          ${escapeHtml(
            getProfileInitials(
              member
            )
          )}
        </span>

        <span class="compact-list-item__content">

          <strong class="compact-list-item__title">
            ${escapeHtml(
              getProfileName(
                member
              )
            )}
          </strong>

          <span class="compact-list-item__meta">
            Açıq borc
          </span>

        </span>

        <span class="compact-list-item__side">

          <strong class="finance-amount finance-amount--expense">
            ${escapeHtml(
              money(
                debtBalance(
                  account
                )
              )
            )}
          </strong>

          <span>
            ${formatDate(
              account.updated_at
            )}
          </span>

        </span>
      `;

      root.append(
        item
      );
    }
  );
}

function renderDashboardActivity() {
  const root =
    byId(
      'dashboard-recent-operations'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  state.history
    .slice(
      0,
      10
    )
    .forEach(
      log => {
        const item =
          createElement(
            'article',
            {
              className:
                'operation-item',
            }
          );

        item.innerHTML = `
          <span class="operation-item__icon operation-item__icon--semantic" aria-hidden="true">
            ${auditIconSvg(log)}
          </span>

          <span class="operation-item__content">

            <strong class="operation-item__title">
              ${escapeHtml(
                auditActionLabel(
                  log
                )
              )}
            </strong>

            <span class="operation-item__meta">
              ${escapeHtml(
                log.actor_name ||
                'Sistem'
              )}
              ·
              ${escapeHtml(
                roleLabel(
                  log.actor_role
                )
              )}
            </span>

          </span>

          <span class="operation-item__side">

            <strong>
              ${formatDate(
                log.created_at
              )}
            </strong>

            <span>
              ${formatTime(
                log.created_at
              )}
            </span>

          </span>
        `;

        root.append(
          item
        );
      }
    );

  if (
    root.children.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Əməliyyat tarixçəsi yoxdur.'
      )
    );
  }
}

function auditActionLabel(
  log
) {
  const table =
    normalizeString(
      log?.table_name
    );

  const action =
    normalizeString(
      log?.action
    ).toUpperCase();

  const tableNames = {
    products:
      'Məhsul',

    product_sale_variants:
      'Satış variantı',

    sales:
      'Satış',

    memberships:
      'Üzvlük',

    attendance:
      'Giriş',

    debt_transactions:
      'Borc',

    ledger_entries:
      'Mədaxil / Məxaric',

    stock_movements:
      'Stok',

    trainers:
      'Məşqçi',

    staff_shifts:
      'Növbə',

    staff_cash_transactions:
      'İşçi avansı',

    cash_register_entries:
      'KASSA',

    expense_categories:
      'Xərc kateqoriyası',
  };

  const actionNames = {
    INSERT:
      'əlavə edildi',

    UPDATE:
      'yeniləndi',

    DELETE:
      'silindi',
  };

  return `${
    tableNames[table] ||
    table
  } ${
    actionNames[action] ||
    action
  }`;
}

function createDashboardEmpty(
  message
) {
  const item =
    createElement(
      'div',
      {
        className:
          'compact-list-item',
      }
    );

  item.innerHTML = `
    <span class="compact-list-item__content">

      <span class="compact-list-item__meta">
        ${escapeHtml(
          message
        )}
      </span>

    </span>
  `;

  return item;
}

function bindDashboardEvents() {
  byId(
    'admin-dashboard-refresh'
  )?.addEventListener(
    'click',
    async () => {
      await loadDashboard();

      notify.success(
        'Dashboard yeniləndi.'
      );
    }
  );
}

async function initAdminBase() {
  await initLayout();

  const identity =
    await requireAdminStaff();

  if (!identity) {
    return false;
  }

  renderOperator();

  bindTabEvents();

  bindDashboardEvents();

  setActiveTab(
    'dashboard',
    {
      load: false,
      persist: false,
    }
  );

  return true;
}

// POS və digər əməliyyatlarda yalnız aktiv member-lər.

function activeMembers() {
  return state.members
    .filter(
      member =>
        member.role ===
          'member' &&
        member.is_active !==
          false
    )
    .sort(
      (
        a,
        b
      ) =>
        getProfileName(a)
          .localeCompare(
            getProfileName(b),
            'az'
          )
    );
}

function memberOptionsMarkup(
  selectedId = ''
) {
  return activeMembers()
    .map(
      member => `
        <option
          value="${escapeHtml(
            member.id
          )}"
          ${
            String(
              selectedId
            ) ===
            String(
              member.id
            )
              ? 'selected'
              : ''
          }
        >
          ${escapeHtml(
            getProfileName(
              member
            )
          )}
          ${
            member.phone
              ? ` — ${escapeHtml(
                  member.phone
                )}`
              : ''
          }
        </option>
      `
    )
    .join('');
}

function paymentMethodLabel(
  value
) {
  switch (
    normalizeString(
      value
    )
  ) {
    case 'cash':
      return 'Nağd';

    case 'card':
      return 'Kart';

    case 'mixed':
      return 'Nağd + Kart';

    case 'debt':
      return 'Borc';

    case 'advance_offset':
    case 'salary_offset':
      return 'Avansdan tutulma';

    default:
      return '—';
  }
}


function stockNumber(value, unit) {
  const current = number(value);
  const normalized = normalizeString(unit).toLocaleLowerCase('az-AZ');

  if (['qram', 'qr', 'gram', 'kg', 'kq'].includes(normalized)) {
    return current.toFixed(3);
  }

  if (Number.isInteger(current)) return String(current);
  return current.toFixed(3);
}

function productStockText(product) {
  return `${stockNumber(productStock(product), productStockUnit(product))} ${productStockUnit(product)}`;
}

function paymentMethodOptionsMarkup() {
  return `
    <option value="cash">Nağd</option>
    <option value="card">Kart</option>
    <option value="mixed">Nağd + Kart</option>
  `;
}

function paymentSplitMarkup(prefix) {
  return `
    <div id="${prefix}-mixed-fields" class="payment-split-grid is-hidden">
      <div class="ui-field">
        <label class="ui-field__label" for="${prefix}-cash-amount">Nağd məbləğ</label>
        <div class="ui-input">
          <input id="${prefix}-cash-amount" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="ui-field">
        <label class="ui-field__label" for="${prefix}-card-amount">Kart məbləği</label>
        <div class="ui-input">
          <input id="${prefix}-card-amount" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00">
        </div>
      </div>
    </div>
  `;
}

function readPaymentSplit(form, prefix, total) {
  const method = normalizeString($(`#${prefix}-payment-method`, form)?.value, 'cash');
  const amount = Math.max(0, number(total));

  if (method === 'cash') return { method, cashAmount: amount, cardAmount: 0, valid: true };
  if (method === 'card') return { method, cashAmount: 0, cardAmount: amount, valid: true };

  const cashAmount = Math.max(0, number($(`#${prefix}-cash-amount`, form)?.value));
  const cardAmount = Math.max(0, number($(`#${prefix}-card-amount`, form)?.value));
  const valid = Math.abs((cashAmount + cardAmount) - amount) < 0.005;

  return { method: 'mixed', cashAmount, cardAmount, valid };
}

function bindPaymentSplit(form, prefix) {
  const method = $(`#${prefix}-payment-method`, form);
  const fields = $(`#${prefix}-mixed-fields`, form);

  const sync = () => {
    const mixed = method?.value === 'mixed';
    mixed ? showElement(fields) : hideElement(fields);
  };

  method?.addEventListener('change', sync);
  sync();
}

function paymentStatusLabel(
  value
) {
  switch (
    normalizeString(
      value
    )
  ) {
    case 'debt':
      return 'Borc';

    case 'cancelled':
      return 'Ləğv edilib';

    case 'refunded':
      return 'Geri qaytarılıb';

    default:
      return 'Ödənilib';
  }
}

function paymentStatusClass(
  value
) {
  switch (
    normalizeString(
      value
    )
  ) {
    case 'paid':
      return (
        'ui-badge ui-badge--success'
      );

    case 'debt':
      return (
        'ui-badge ui-badge--danger'
      );

    case 'refunded':
      return (
        'ui-badge ui-badge--neutral'
      );

    default:
      return (
        'ui-badge ui-badge--danger'
      );
  }
}


function renderPosProducts() { posController.render(); }
function bindPosEvents() { posController.bind(); }
function openPosSaleModal(product, trigger = null, options = {}) {
  return posController.openSaleModal(product, trigger, options);
}

function renderAdminProducts() { productsController.render(); }
function bindProductEvents() { productsController.bind(); }


function openProductEditor(product = null, trigger = null) {
  return productEditorController.open(product, trigger);
}

function renderStock() { stockController.render(); }
function renderStockProducts() { stockController.renderProducts(); }
function renderStockMovements() { stockController.renderMovements(); }

function openStockAddModal(product, trigger = null) { return stockActionsController.openStockAddModal(product, trigger); }
function openStockAdjustModal(product, trigger = null) { return stockActionsController.openStockAdjustModal(product, trigger); }
function openStockProductPicker() { return stockActionsController.openStockProductPicker(); }
function bindStockEvents() { return stockActionsController.bindStockEvents(); }
function renderMembers() { membersController.render(); }
function bindMemberEvents() { membersController.bind(); }

function filteredMemberships() { return membershipsController.filteredMemberships(); }
function renderMemberships() { membershipsController.renderMemberships(); }
function renderMembershipPlans() { membershipsController.renderPlans(); }

//
// is_daily semantikasını burada dəyişmirik.
// Bu planın biznes tipidir.
// Admin qiymət, ad, müddət və aktivliyi dəyişə bilər.
//

function openMembershipPlanEditor(plan, trigger = null) { return membershipActionsController.openMembershipPlanEditor(plan, trigger); }
function openMembershipCreateModal(memberId = null, trigger = null) { return membershipActionsController.openMembershipCreateModal(memberId, trigger); }
function bindMembershipEvents() { return membershipActionsController.bindMembershipEvents(); }
function filteredDebts() { return debtsController.filteredDebts(); }
function renderDebts() { debtsController.render(); }
function renderDebtTransactions() { debtsController.renderTransactions(); }

//
// debt_accounts PK = member_id.

function openDebtPaymentModal(account, trigger = null) { return debtActionsController.openDebtPaymentModal(account, trigger); }
function bindDebtEvents() { return debtActionsController.bindDebtEvents(); }
function filteredLedger() {
  const type =
    normalizeString(
      byId(
        'finance-type-filter'
      )?.value,
      'all'
    );

  const from =
    normalizeString(
      byId(
        'finance-date-from'
      )?.value
    );

  const to =
    normalizeString(
      byId(
        'finance-date-to'
      )?.value
    );

  const search =
    normalizeSearch(
      byId(
        'finance-search'
      )?.value
    );

  return state.ledger
    .filter(
      entry => {
        if (
          type ===
          'all'
        ) {
          return true;
        }

        return (
          ledgerType(
            entry
          ) ===
          type
        );
      }
    )
    .filter(
      entry => {
        const date =
          normalizeString(
            entry.entry_date
          );

        if (
          from &&
          date < from
        ) {
          return false;
        }

        if (
          to &&
          date > to
        ) {
          return false;
        }

        return true;
      }
    )
    .filter(
      entry => {
        if (!search) {
          return true;
        }

        const text =
          [
            entry.category,
            entry.description,
            entry.reference_type,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(
              'az-AZ'
            );

        return text.includes(
          search
        );
      }
    );
}

function calculateFinanceTotals(entries) { return financeController.totals(entries); }
function renderFinanceKpis(totals, entries) { financeController.renderKpis(totals, entries); }
function renderCashRegister() { financeController.renderCash(); }
function renderFinance() { financeController.render(); }

function financeReferenceLabel(value) {
  switch (normalizeString(value)) {
    case 'sale':
      return 'POS satış';
    case 'membership':
      return 'Üzvlük';
    case 'attendance':
      return 'Günlük giriş';
    case 'stock':
      return 'Stok alışı';
    case 'debt_payment':
      return 'Borc ödənişi';
    case 'manual_income':
      return 'Əlavə mədaxil';
    case 'manual_expense':
      return 'Zal xərci';
    case 'staff_cash_advance':
      return 'İşçi avansı';
    case 'staff_cash_repayment':
      return 'Avans qaytarması';
    default:
      return normalizeString(value, 'Digər');
  }
}

function openIncomeModal(trigger = null) { return financeActionsController.openIncomeModal(trigger); }
function openExpenseModal(trigger = null) { return financeActionsController.openExpenseModal(trigger); }
function openCashBalanceModal(trigger = null) { return financeActionsController.openCashBalanceModal(trigger); }
function openStaffAdvanceModal(trigger = null) { return financeActionsController.openStaffAdvanceModal(trigger); }
function bindFinanceEvents() { return financeActionsController.bindFinanceEvents(); }
function renderAdminTrainers() { trainersController.render(); }
function bindTrainerAdminEvents() { trainersController.bind(); }
function openTrainerEditor(trainer = null, trigger = null) { return trainersController.openEditor(trainer, trigger); }
function historyOperators() {
  const map =
    new Map();

  state.history.forEach(
    item => {
      if (
        !item.actor_profile_id
      ) {
        return;
      }

      map.set(
        String(
          item.actor_profile_id
        ),
        {
          id:
            item.actor_profile_id,

          name:
            item.actor_name ||
            'Operator',

          role:
            item.actor_role,
        }
      );
    }
  );

  return Array.from(
    map.values()
  ).sort(
    (
      a,
      b
    ) =>
      a.name.localeCompare(
        b.name,
        'az'
      )
  );
}

function syncHistoryOperatorFilter() {
  const select =
    byId(
      'history-operator-filter'
    );

  if (!select) {
    return;
  }

  const selected =
    select.value;

  const operators =
    historyOperators();

  select.innerHTML = `
    <option value="">
      Bütün operatorlar
    </option>

    ${operators
      .map(
        operator => `
          <option
            value="${escapeHtml(
              operator.id
            )}"
          >
            ${escapeHtml(
              operator.name
            )}
            —
            ${escapeHtml(
              roleLabel(
                operator.role
              )
            )}
          </option>
        `
      )
      .join('')}
  `;

  if (
    operators.some(
      operator =>
        String(
          operator.id
        ) ===
        String(
          selected
        )
    )
  ) {
    select.value =
      selected;
  }
}

function filteredHistory() {
  const search =
    normalizeSearch(
      byId(
        'history-search'
      )?.value
    );

  const table =
    normalizeString(
      byId(
        'history-type-filter'
      )?.value,
      'all'
    );

  const operator =
    normalizeString(
      byId(
        'history-operator-filter'
      )?.value
    );

  const from =
    normalizeString(
      byId(
        'history-date-from'
      )?.value
    );

  const to =
    normalizeString(
      byId(
        'history-date-to'
      )?.value
    );

  return state.history
    .filter(
      item => {
        if (
          table ===
          'all'
        ) {
          return true;
        }

        return (
          item.table_name ===
          table
        );
      }
    )
    .filter(
      item => {
        if (!operator) {
          return true;
        }

        return (
          String(
            item.actor_profile_id
          ) ===
          String(
            operator
          )
        );
      }
    )
    .filter(
      item => {
        if (
          !from &&
          !to
        ) {
          return true;
        }

        const date =
          item.created_at
            ? item.created_at
                .slice(
                  0,
                  10
                )
            : '';

        if (
          from &&
          date < from
        ) {
          return false;
        }

        if (
          to &&
          date > to
        ) {
          return false;
        }

        return true;
      }
    )
    .filter(
      item => {
        if (!search) {
          return true;
        }

        const text =
          [
            item.actor_name,
            item.actor_role,
            item.table_name,
            item.action,
            JSON.stringify(
              item.old_data ||
              {}
            ),
            JSON.stringify(
              item.new_data ||
              {}
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'az-AZ'
            );

        return text.includes(
          search
        );
      }
    );
}

function renderHistory() {
  const root =
    byId(
      'history-list'
    );

  if (!root) {
    return;
  }

  syncHistoryOperatorFilter();

  clearElement(
    root
  );

  const history =
    filteredHistory();

  visibleListItems('history', history).forEach(
    item => {
      const row =
        createElement(
          'button',
          {
            className:
              'operation-item operation-item--interactive',

            attrs: {
              type:
                'button',
            },
          }
        );

      row.innerHTML = `
        <span class="operation-item__icon">
${auditIconSvg(item)}
        </span>

        <span class="operation-item__content">

          <strong class="operation-item__title">

            ${escapeHtml(item.actor_name || 'Sistem')} · ${escapeHtml(historyActionLabel(item.action))}

          </strong>

          <span class="operation-item__meta">
            ${escapeHtml(
              historyTableLabel(
                item.table_name
              )
            )}
            ·
            ${escapeHtml(
              roleLabel(
                item.actor_role
              )
            )}
          </span>

        </span>

        <span class="operation-item__side">

          <strong>
            ${formatDate(
              item.created_at
            )}
          </strong>

          <span>
            ${formatTime(
              item.created_at
            )}
          </span>

        </span>
      `;

      row.addEventListener(
        'click',
        () => {
          openAuditDetailView(
            item,
            state.history,
            row
          );
        }
      );

      root.append(
        row
      );
    }
  );

  if (
    history.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Tarixçə tapılmadı.'
      )
    );
  }

  setText(byId('history-result-count'), history.length);
  bindInfiniteList(root, 'history', renderHistory, history.length);
}

async function reloadHistoryFromFilters() {
  const from =
    normalizeString(
      byId(
        'history-date-from'
      )?.value
    );

  const to =
    normalizeString(
      byId(
        'history-date-to'
      )?.value
    );

  const actorId =
    normalizeString(
      byId(
        'history-operator-filter'
      )?.value
    );

  let fromTimestamp =
    null;

  let toTimestamp =
    null;

  if (from) {
    fromTimestamp =
      new Date(
        `${from}T00:00:00`
      ).toISOString();
  }

  if (to) {
    toTimestamp =
      new Date(
        `${to}T23:59:59.999`
      ).toISOString();
  }

  await loadHistory({
    from:
      fromTimestamp,

    to:
      toTimestamp,

    actorId:
      actorId ||
      null,

    limit:
      2000,
  });

  renderHistory();
}

function bindHistoryEvents() {
  byId(
    'history-search'
  )?.addEventListener(
    'input',
    debounce(renderHistory, UI_CONFIG.debounceDelay)
  );

  byId(
    'history-type-filter'
  )?.addEventListener(
    'change',
    renderHistory
  );

  byId(
    'history-operator-filter'
  )?.addEventListener(
    'change',
    reloadHistoryFromFilters
  );

  byId(
    'history-date-from'
  )?.addEventListener(
    'change',
    reloadHistoryFromFilters
  );

  byId(
    'history-date-to'
  )?.addEventListener(
    'change',
    reloadHistoryFromFilters
  );

  byId(
    'history-refresh-button'
  )?.addEventListener(
    'click',
    async () => {
      await reloadHistoryFromFilters();

      notify.success(
        'Tarixçə yeniləndi.'
      );
    }
  );
}

//
// Admin header-də universal search varsa uyğun tab-a keçir.
// HTML-də yoxdursa heç bir problem yaratmır.

async function preloadAdminData() {
  await Promise.all([
    loadProducts(),
    loadMembers(),
    loadMembershipPlans(),
  ]);
}

function bindAdminEvents() {
  bindPosEvents();

  bindProductEvents();

  bindStockEvents();

  quickSaleController.bind();

  bindMemberEvents();

  bindMembershipEvents();


  bindDebtEvents();

  bindFinanceEvents();

  bindWorkforceEvents();

  bindReportsEvents();

  bindSalesHistoryEvents();

  bindTrainerAdminEvents();

  bindHistoryEvents();

  bindAdminRuntimeEvents({
    state,
    operationEventName: ADMIN_OPERATION_EVENT,
    renderOperator,
    loadProducts, loadSales, loadSaleItems, loadLedger, loadCashRegisterEntries,
    loadDebts, loadDebtTransactions, renderPosProducts, renderFinance, renderDebts, loadDashboard,
  });
}

async function init() {
  try {
    const ready =
      await initAdminBase();

    if (!ready) {
      return;
    }

    await preloadAdminData();

    bindAdminEvents();

    const initialTab =
      resolveInitialAdminTab();

    setActiveTab(
      initialTab,
      {
        load:
          false,
      }
    );

    await loadActiveTab();
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Init:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'İdarəetmə paneli başladılmadı.'
      )
    );
  }
}

asyncHandler(
  init,
  {
    notifyOnError:
      true,
  }
)();