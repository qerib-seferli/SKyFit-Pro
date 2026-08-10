// SKy Fit Pro — Admin / Staff Management Controller
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  APP_CONFIG,
  TABLES,
  RPC,
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

const ADMIN_TABS =
  new Set([
    'dashboard',
    'pos',
    'members',
    'memberships',
    'attendance',
    'products',
    'stock',
    'debts',
    'finance',
    'trainers',
    'history',
  ]);

function normalizeTab(
  value
) {
  const tab =
    normalizeString(
      value,
      'dashboard'
    );

  return ADMIN_TABS.has(
    tab
  )
    ? tab
    : 'dashboard';
}

function readStoredAdminTab() {
  try {
    return normalizeTab(
      localStorage.getItem(STORAGE_KEYS.lastAdminTab)
    );
  } catch {
    return 'dashboard';
  }
}

function storeAdminTab(tab) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.lastAdminTab,
      normalizeTab(tab)
    );
  } catch {
    // Storage bloklansa da panel işləyir.
  }
}

function setActiveTab(
  tab,
  options = {}
) {
  const target =
    normalizeTab(
      tab
    );

  state.activeTab =
    target;

  if (options.persist !== false) {
    storeAdminTab(target);
  }

  $$(
    '[data-admin-tab]'
  ).forEach(
    button => {
      const active =
        button.dataset
          .adminTab ===
        target;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-selected',
        String(active)
      );
    }
  );

  $$(
    '[data-admin-panel]'
  ).forEach(
    panel => {
      const active =
        panel.dataset
          .adminPanel ===
        target;

      panel.classList.toggle(
        'is-hidden',
        !active
      );

      panel.hidden =
        !active;
    }
  );

  if (
    options.load !==
    false
  ) {
    void loadActiveTab();
  }
}

function bindTabEvents() {
  $$(
    '[data-admin-tab]'
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          setActiveTab(
            button.dataset
              .adminTab
          );
        }
      );
    }
  );

  $$(
    '[data-admin-open-tab]'
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          setActiveTab(
            button.dataset
              .adminOpenTab
          );
        }
      );
    }
  );
}

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
      'admin-operator-label'
    ),
    `${identity.name} · ${roleLabel(
      identity.role
    )}`
  );

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

async function loadActiveTab() {
  switch (
    state.activeTab
  ) {
    case 'dashboard':
      await loadDashboard();
      break;

    case 'pos':
      await loadProducts();
      renderPosProducts();
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

    case 'attendance':
      await Promise.all([
        loadAttendance(),
        loadMembers(),
        loadMembershipPlans(),
        loadMemberships(),
      ]);
      renderAttendanceAdmin();
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
        loadMembers(),
      ]);
      renderFinance();
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

//
// Real products schema.

async function loadProducts() {
  if (
    state.loading.products
  ) {
    return state.products;
  }

  state.loading.products =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.products
        )
        .select(`
          id,
          name,
          description,
          sku,
          image_url,
          category,
          sale_mode,
          stock_unit,
          stock_quantity,
          portion_size,
          retail_price,
          portion_price,
          cost_price,
          low_stock_threshold,
          show_public,
          is_active,
          created_at,
          updated_at,
          created_by,
          updated_by,
          operator_shift_id,

          sale_variants:product_sale_variants (
            id,
            product_id,
            name,
            variant_type,
            stock_deduction,
            price,
            sort_order,
            is_quick_sale,
            is_active,
            created_at,
            updated_at
          )
        `)
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw error;
    }

    state.products =
      rows(data);

    return state.products;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Products:',
      error
    );

    state.products =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Məhsullar yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.products =
      false;
  }
}

//
// profiles.full_name real sütundur.

async function loadMembers() {
  if (
    state.loading.members
  ) {
    return state.members;
  }

  state.loading.members =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.profiles
        )
        .select(`
          id,
          auth_user_id,
          role,
          full_name,
          email,
          phone,
          birth_date,
          address,
          avatar_url,
          is_manual,
          is_active,
          created_at,
          updated_at
        `)
        .order(
          'full_name',
          {
            ascending:
              true,
          }
        );

    if (error) {
      throw error;
    }

    state.members =
      rows(data);

    return state.members;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Members:',
      error
    );

    state.members =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Üzvlər yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.members =
      false;
  }
}

async function loadMembershipPlans() {
  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.membershipPlans
        )
        .select(`
          id,
          name,
          price,
          duration_days,
          is_daily,
          is_active,
          created_at
        `)
        .order(
          'is_daily',
          {
            ascending:
              true,
          }
        )
        .order(
          'price',
          {
            ascending:
              true,
          }
        );

    if (error) {
      throw error;
    }

    state.membershipPlans =
      rows(data);

    return state
      .membershipPlans;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Plans:',
      error
    );

    state.membershipPlans =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Üzvlük planları yüklənmədi.'
      )
    );

    return [];
  }
}

//
// Burada relationship-lər explicit göstərilir.
// Eyni profiles cədvəlinə 3 FK olduğuna görə sadə profiles(*)
// istifadə ETMİRİK.

async function loadMemberships() {
  if (
    state.loading.memberships
  ) {
    return state.memberships;
  }

  state.loading.memberships =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.memberships
        )
        .select(`
          id,
          member_id,
          plan_id,
          start_date,
          end_date,
          price,
          status,
          payment_status,
          created_by,
          updated_by,
          operator_shift_id,

          member:profiles!memberships_member_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            avatar_url,
            is_active
          ),

          membership_plan:membership_plans!memberships_plan_id_fkey (
            id,
            name,
            price,
            duration_days,
            is_daily,
            is_active
          ),

          created_by_profile:profiles!memberships_created_by_fkey (
            id,
            full_name,
            role
          ),

          updated_by_profile:profiles!memberships_updated_by_fkey (
            id,
            full_name,
            role
          )
        `)
        .order(
          'end_date',
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw error;
    }

    state.memberships =
      rows(data);

    return state.memberships;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Memberships:',
      error
    );

    state.memberships =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Üzvlüklər yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.memberships =
      false;
  }
}

//
// checked_in_at real timestamp.
// Operator və üzv explicit FK ilə çəkilir.

async function loadAttendance() {
  if (
    state.loading.attendance
  ) {
    return state.attendance;
  }

  state.loading.attendance =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.attendance
        )
        .select(`
          id,
          member_id,
          membership_id,
          attendance_type,
          amount,
          checked_in_at,
          created_by,
          updated_by,
          operator_shift_id,

          member:profiles!attendance_member_id_fkey (
            id,
            full_name,
            email,
            phone,
            role,
            avatar_url
          ),

          operator:profiles!attendance_created_by_fkey (
            id,
            full_name,
            role
          )
        `)
        .order(
          'checked_in_at',
          {
            ascending:
              false,
          }
        )
        .limit(1000);

    if (error) {
      throw error;
    }

    state.attendance =
      rows(data);

    return state.attendance;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Attendance:',
      error
    );

    state.attendance =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Giriş tarixçəsi yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.attendance =
      false;
  }
}

//
// debt_accounts primary key = member_id.
// account.id YOXDUR.

async function loadDebts() {
  if (
    state.loading.debts
  ) {
    return state.debts;
  }

  state.loading.debts =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.debtAccounts
        )
        .select(`
          member_id,
          balance,
          updated_at,

          member:profiles (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            is_active
          )
        `)
        .order(
          'balance',
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw error;
    }

    state.debts =
      rows(data);

    return state.debts;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Debts:',
      error
    );

    state.debts =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Borc hesabları yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.debts =
      false;
  }
}

async function loadDebtTransactions() {
  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.debtTransactions
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1000);

    if (error) {
      throw error;
    }

    state.debtTransactions =
      rows(data);

    return state
      .debtTransactions;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Debt transactions:',
      error
    );

    state.debtTransactions =
      [];

    return [];
  }
}

//
// entry_date biznes tarixi,
// created_at əməliyyat timestamp-ıdır.

async function loadLedger() {
  if (
    state.loading.finance
  ) {
    return state.ledger;
  }

  state.loading.finance =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.ledgerEntries
        )
        .select('*')
        .order(
          'entry_date',
          {
            ascending:
              false,
          }
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(2000);

    if (error) {
      throw error;
    }

    state.ledger =
      rows(data);

    return state.ledger;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Ledger:',
      error
    );

    state.ledger =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Maliyyə məlumatları yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.finance =
      false;
  }
}

async function loadStockMovements() {
  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.stockMovements
        )
        .select(`
          *,
          product:products (
            id,
            name,
            sku,
            stock_unit
          )
        `)
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1000);

    if (error) {
      throw error;
    }

    state.stockMovements =
      rows(data);

    return state
      .stockMovements;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Stock movements:',
      error
    );

    state.stockMovements =
      [];

    return [];
  }
}

async function loadSales() {
  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.sales
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .limit(1000);

    if (error) {
      throw error;
    }

    state.sales =
      rows(data);

    return state.sales;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Sales:',
      error
    );

    state.sales =
      [];

    return [];
  }
}


async function loadExpenseCategories() {
  try {
    const { data, error } = await supabase
      .from(TABLES.expenseCategories)
      .select('id,name,category_group,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    state.expenseCategories = rows(data);
    return state.expenseCategories;
  } catch (error) {
    console.error('[SKy Fit Kassa] Xərc kateqoriyaları:', error);
    state.expenseCategories = [];
    return [];
  }
}

async function loadIncomeCategories() {
  try {
    const { data, error } = await supabase
      .from(TABLES.incomeCategories)
      .select('id,name,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    state.incomeCategories = rows(data);
    return state.incomeCategories;
  } catch (error) {
    console.error('[SKy Fit Kassa] Mədaxil kateqoriyaları:', error);
    state.incomeCategories = [];
    return [];
  }
}

async function loadCashRegisterEntries() {
  if (state.loading.cash) return state.cashRegisterEntries;
  state.loading.cash = true;

  try {
    const [entriesResult, balanceResult] = await Promise.all([
      supabase
        .from(TABLES.cashRegisterEntries)
        .select(`
          id,direction,entry_type,category,description,amount,entry_date,
          reference_type,reference_id,created_by,operator_shift_id,created_at
        `)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.rpc(RPC.getCashRegisterBalance),
    ]);

    if (entriesResult.error) throw entriesResult.error;
    if (balanceResult.error) throw balanceResult.error;

    state.cashRegisterEntries = rows(entriesResult.data);
    state.cashRegisterBalance = number(balanceResult.data);
    return state.cashRegisterEntries;
  } catch (error) {
    console.error('[SKy Fit Kassa] Kassa kitabı:', error);
    state.cashRegisterEntries = [];
    state.cashRegisterBalance = 0;
    return [];
  } finally {
    state.loading.cash = false;
  }
}

async function loadTrainers() {
  if (
    state.loading.trainers
  ) {
    return state.trainers;
  }

  state.loading.trainers =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.trainers
        )
        .select('*')
        .order(
          'sort_order',
          {
            ascending:
              true,
          }
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw error;
    }

    state.trainers =
      rows(data);

    return state.trainers;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Trainers:',
      error
    );

    state.trainers =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Məşqçilər yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.trainers =
      false;
  }
}

//
// Süni olaraq sales + ledger + attendance merge etmirik.
// Backenddə bunun üçün xüsusi RPC artıq var.
//
// get_operator_activity(
//   p_from,
//   p_to,
//   p_actor_id,
//   p_limit
// )

async function loadHistory(
  options = {}
) {
  if (
    state.loading.history
  ) {
    return state.history;
  }

  state.loading.history =
    true;

  try {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        RPC.getOperatorActivity,
        {
          p_from:
            options.from ||
            null,

          p_to:
            options.to ||
            null,

          p_actor_id:
            options.actorId ||
            null,

          p_limit:
            options.limit ||
            1000,
        }
      );

    if (error) {
      throw error;
    }

    state.history =
      rows(data);

    return state.history;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Audit history:',
      error
    );

    state.history =
      [];

    notify.error(
      getErrorMessage(
        error,
        'Əməliyyat tarixçəsi yüklənmədi.'
      )
    );

    return [];
  } finally {
    state.loading.history =
      false;
  }
}

async function loadDashboard() {
  if (
    state.loading.dashboard
  ) {
    return;
  }

  state.loading.dashboard =
    true;

  try {
    await Promise.all([
      loadSales(),
      loadMemberships(),
      loadAttendance(),
      loadDebts(),
      loadLedger(),
      loadProducts(),
      loadHistory({
        limit:
          50,
      }),
    ]);

    renderDashboard();

    state.dashboard.loaded =
      true;
  } catch (error) {
    console.error(
      '[SKy Fit Admin] Dashboard:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Dashboard yüklənmədi.'
      )
    );
  } finally {
    state.loading.dashboard =
      false;
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
          <span class="operation-item__icon">
            SK
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


function productSaleVariants(product, options = {}) {
  const quickOnly = Boolean(options.quickOnly);

  return rows(product?.sale_variants)
    .filter(variant => variant?.is_active !== false)
    .filter(variant => !quickOnly || variant?.is_quick_sale === true)
    .sort((a, b) =>
      number(a?.sort_order) - number(b?.sort_order) ||
      normalizeString(a?.name).localeCompare(normalizeString(b?.name), 'az')
    );
}

function productHasSaleVariants(product) {
  return productSaleVariants(product).length > 0;
}

function saleVariantName(variant) {
  return normalizeString(variant?.name, 'Satış variantı');
}

function saleVariantPrice(variant) {
  return Math.max(0, number(variant?.price));
}

function saleVariantDeduction(variant) {
  return Math.max(0, number(variant?.stock_deduction));
}

function saleVariantType(variant) {
  return normalizeString(variant?.variant_type, 'unit');
}

function saleVariantIsCustom(variant) {
  return saleVariantType(variant) === 'custom';
}

function saleVariantTypeLabel(type) {
  switch (normalizeString(type)) {
    case 'gram':
      return 'Qram';
    case 'tablet':
      return 'Tablet / kapsul';
    case 'portion':
      return 'Porsiya';
    case 'scoop':
      return 'Qaşıq';
    case 'pack':
      return 'Bütöv qab / paket';
    case 'custom':
      return 'Sərbəst miqdar';
    default:
      return 'Ədəd / vahid';
  }
}

function productDisplayPrice(product) {
  const variants = productSaleVariants(product);
  if (!variants.length) {
    return productPrice(product);
  }

  return variants.reduce(
    (minimum, variant) => Math.min(minimum, saleVariantPrice(variant)),
    Number.POSITIVE_INFINITY
  );
}

function productDisplayUnit(product) {
  const variants = productSaleVariants(product);
  if (!variants.length) {
    return productUnitLabel(product);
  }

  return variants.length === 1
    ? saleVariantName(variants[0])
    : `${variants.length} satış seçimi`;
}

function productDisplayPriceLabel(product) {
  const variants = productSaleVariants(product);
  const price = money(productDisplayPrice(product));
  return variants.length > 1 ? `${price}-dan` : price;
}

function filteredPosProducts() {
  const search =
    normalizeSearch(
      byId(
        'pos-product-search'
      )?.value
    );

  const filter =
    normalizeString(
      byId(
        'pos-product-filter'
      )?.value,
      'all'
    );

  return state.products
    .filter(
      product =>
        product.is_active !==
        false
    )
    .filter(
      product => {
        if (!search) {
          return true;
        }

        const text =
          [
            product.name,
            product.sku,
            product.category,
            product.description,
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
    )
    .filter(
      product => {
        const stock =
          productStock(
            product
          );

        if (
          filter ===
          'available'
        ) {
          return stock > 0;
        }

        if (
          filter ===
          'low'
        ) {
          const status =
            productStockState(
              product
            );

          return (
            status.key ===
            'low'
          );
        }

        if (
          filter ===
          'empty'
        ) {
          return stock <= 0;
        }

        return true;
      }
    );
}

function createPosCard(
  product
) {
  const stock =
    productStock(
      product
    );

  const image =
    productImage(
      product
    );

  const status =
    productStockState(
      product
    );

  const card =
    createElement(
      'button',
      {
        className:
          `pos-product-card ${
            stock <= 0
              ? 'is-out-of-stock'
              : ''
          }`,

        attrs: {
          type:
            'button',

          disabled:
            stock <= 0
              ? true
              : null,
        },

        dataset: {
          productId:
            product.id,
        },
      }
    );

  card.innerHTML = `
    <div class="pos-product-card__media">

      ${
        image
          ? `
            <img
              src="${escapeHtml(
                image
              )}"
              alt="${escapeHtml(
                productName(
                  product
                )
              )}"
              loading="lazy"
              decoding="async"
            >
          `
          : `
            <span class="product-card__image-fallback">
              SK
            </span>
          `
      }

      <span class="${status.className}">
        ${escapeHtml(
          status.label
        )}
      </span>

    </div>

    <div class="pos-product-card__body">

      <strong class="pos-product-card__name">
        ${escapeHtml(
          productName(
            product
          )
        )}
      </strong>

      <span class="pos-product-card__unit">
        ${escapeHtml(
          productDisplayUnit(
            product
          )
        )}
      </span>

      <div class="pos-product-card__row">

        <span class="pos-product-card__price">
          ${escapeHtml(
            productDisplayPriceLabel(
              product
            )
          )}
        </span>

        <span class="pos-product-card__stock">
          ${escapeHtml(
            String(stock)
          )}
          ${escapeHtml(
            productStockUnit(
              product
            )
          )}
        </span>

      </div>

    </div>
  `;

  if (
    stock > 0
  ) {
    card.addEventListener(
      'click',
      () => {
        openPosSaleModal(
          product,
          card
        );
      }
    );
  }

  return card;
}

function renderPosProducts() {
  const root =
    byId(
      'pos-products-grid'
    );

  const empty =
    byId(
      'pos-products-empty'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const products =
    filteredPosProducts();

  products.forEach(
    product => {
      root.append(
        createPosCard(
          product
        )
      );
    }
  );

  if (empty) {
    products.length ===
      0
      ? showElement(empty)
      : hideElement(empty);
  }
}

function bindPosEvents() {
  byId(
    'pos-product-search'
  )?.addEventListener(
    'input',
    debounce(renderPosProducts, UI_CONFIG.debounceDelay)
  );

  byId(
    'pos-product-filter'
  )?.addEventListener(
    'change',
    renderPosProducts
  );
}

//
// Kart vurulan kimi satılmır.
// Modal açılır.

async function openPosSaleModal(
  product,
  trigger = null,
  options = {}
) {
  if (state.members.length === 0) {
    await loadMembers();
  }

  const variants = productSaleVariants(product, {
    quickOnly: Boolean(options.quickOnly),
  });

  const stock = productStock(product);
  const image = productImage(product);
  const legacyMode = productSaleMode(product);

  const content = createElement('form', {
    className: 'modal-form pos-sale-v2',
    attrs: {
      id: 'pos-sale-form',
      novalidate: '',
    },
  });

  const variantMarkup = variants.length
    ? `
      <div class="ui-field">
        <span class="ui-field__label">Satış ölçüsü</span>
        <div class="sale-variant-picker" id="pos-sale-variant-picker">
          ${variants.map((variant, index) => `
            <button
              type="button"
              class="sale-variant-chip${index === 0 ? ' is-active' : ''}"
              data-sale-variant-id="${escapeHtml(variant.id)}"
              aria-pressed="${index === 0 ? 'true' : 'false'}"
            >
              <strong>${escapeHtml(saleVariantName(variant))}</strong>
              <span>${escapeHtml(money(saleVariantPrice(variant)))}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `
    : '';

  content.innerHTML = `
    <div class="pos-confirm__product">
      <div class="pos-confirm__media">
        ${
          image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}">`
            : '<span class="product-card__image-fallback">SK</span>'
        }
      </div>

      <div class="pos-confirm__identity">
        <strong class="pos-confirm__name">${escapeHtml(productName(product))}</strong>
        <span id="pos-sale-current-price" class="pos-confirm__price">
          ${escapeHtml(money(variants.length ? saleVariantPrice(variants[0]) : productPrice(product)))}
        </span>
        <span class="pos-confirm__stock">
          Stok: ${escapeHtml(stockNumber(stock, productStockUnit(product)))} ${escapeHtml(productStockUnit(product))}
        </span>
      </div>
    </div>

    ${variantMarkup}

    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="pos-sale-quantity" id="pos-sale-quantity-label">
          ${variants.length
            ? (saleVariantIsCustom(variants[0]) ? `Miqdar (${escapeHtml(productStockUnit(product))})` : 'Say')
            : (legacyMode === 'portion' ? 'Porsiya sayı' : 'Miqdar')}
        </label>

        <div class="ui-input">
          <input
            id="pos-sale-quantity"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="${variants.length && saleVariantIsCustom(variants[0]) ? '0.001' : '1'}"
            step="${variants.length && saleVariantIsCustom(variants[0]) ? '0.001' : '1'}"
            value="1"
          >
        </div>

        <span id="pos-sale-quantity-error" class="ui-field__error is-hidden"></span>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="pos-sale-payment-method">Ödəniş üsulu</label>
        <select id="pos-sale-payment-method" class="ui-select">
          ${paymentMethodOptionsMarkup()}
        </select>
      </div>
    </div>

    ${paymentSplitMarkup('pos-sale')}

    <div class="ui-field">
      <label class="ui-field__label" for="pos-sale-payment-status">Ödəniş vəziyyəti</label>
      <select id="pos-sale-payment-status" class="ui-select">
        <option value="paid">Ödənilib</option>
        <option value="debt">Borc yaz</option>
      </select>
    </div>

    <div id="pos-sale-member-field" class="ui-field is-hidden">
      <label class="ui-field__label" for="pos-sale-member">Borc yazılacaq üzv</label>
      <select id="pos-sale-member" class="ui-select">
        <option value="">Üzv seç</option>
        ${memberOptionsMarkup()}
      </select>
      <span class="ui-field__hint">Borc satışı üçün üzv seçilməsi məcburidir.</span>
    </div>

    <div class="pos-confirm__summary">
      <div class="pos-confirm__row">
        <span>Satış seçimi</span>
        <strong id="pos-sale-summary-variant">
          ${escapeHtml(variants.length ? saleVariantName(variants[0]) : productUnitLabel(product))}
        </strong>
      </div>

      <div class="pos-confirm__row">
        <span>Miqdar</span>
        <strong id="pos-sale-summary-quantity">1</strong>
      </div>

      <div class="pos-confirm__row">
        <span>Stokdan çıxacaq</span>
        <strong id="pos-sale-stock-deduction">
          ${escapeHtml(String(
            variants.length
              ? saleVariantDeduction(variants[0])
              : (legacyMode === 'portion' ? number(product.portion_size) : 1)
          ))}
          ${escapeHtml(productStockUnit(product))}
        </strong>
      </div>

      <div class="pos-confirm__row pos-confirm__row--total">
        <span>Cəmi</span>
        <strong id="pos-sale-total">
          ${escapeHtml(money(variants.length ? saleVariantPrice(variants[0]) : productPrice(product)))}
        </strong>
      </div>
    </div>

    <div class="modal-form__actions">
      <button id="pos-sale-cancel" class="ui-button ui-button--glass" type="button">
        <span class="ui-button__label">Ləğv et</span>
      </button>

      <button id="pos-sale-submit" class="ui-button ui-button--primary" type="submit">
        <span class="ui-button__label">Satışı təsdiqlə</span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    </div>
  `;

  openModal({
    eyebrow: options.quickOnly ? 'Tez satış' : 'POS',
    title: 'Satışı təsdiqlə',
    content,
    trigger,
    className: 'app-modal--pos',
    onOpen: () => {
      bindPosSaleForm(content, product, variants);
    },
  });
}

function bindPosSaleForm(
  form,
  product,
  variants = []
) {
  const quantityInput = $('#pos-sale-quantity', form);
  const quantityLabel = $('#pos-sale-quantity-label', form);
  const paymentMethodInput = $('#pos-sale-payment-method', form);
  const paymentStatusInput = $('#pos-sale-payment-status', form);
  const memberField = $('#pos-sale-member-field', form);
  const memberInput = $('#pos-sale-member', form);
  const quantityError = $('#pos-sale-quantity-error', form);
  const submit = $('#pos-sale-submit', form);
  const cancel = $('#pos-sale-cancel', form);
  const picker = $('#pos-sale-variant-picker', form);
  const paymentMixedFields = $('#pos-sale-mixed-fields', form);

  let selectedVariant = variants[0] || null;

  function currentPrice() {
    return selectedVariant
      ? saleVariantPrice(selectedVariant)
      : productPrice(product);
  }

  function currentDeductionPerUnit() {
    if (selectedVariant) {
      return saleVariantDeduction(selectedVariant);
    }

    return productSaleMode(product) === 'portion'
      ? number(product.portion_size, 1)
      : 1;
  }

  function syncQuantityMode() {
    const custom = selectedVariant && saleVariantIsCustom(selectedVariant);

    if (quantityInput) {
      quantityInput.min = custom ? '0.001' : '1';
      quantityInput.step = custom ? '0.001' : '1';

      if (!custom && number(quantityInput.value) < 1) {
        quantityInput.value = '1';
      }
    }

    setText(
      quantityLabel,
      custom
        ? `Miqdar (${productStockUnit(product)})`
        : (selectedVariant ? 'Say' : (productSaleMode(product) === 'portion' ? 'Porsiya sayı' : 'Miqdar'))
    );
  }

  function syncSummary() {
    const quantity = Math.max(0, number(quantityInput?.value));
    const total = quantity * currentPrice();
    const stockDeduction = quantity * currentDeductionPerUnit();

    setText($('#pos-sale-summary-quantity', form), quantity);
    setText($('#pos-sale-total', form), money(total));
    setText(
      $('#pos-sale-stock-deduction', form),
      `${stockNumber(stockDeduction, productStockUnit(product))} ${productStockUnit(product)}`
    );
    setText(
      $('#pos-sale-summary-variant', form),
      selectedVariant ? saleVariantName(selectedVariant) : productUnitLabel(product)
    );
    setText($('#pos-sale-current-price', form), money(currentPrice()));
  }

  function syncPaymentStatus() {
    const debt = paymentStatusInput?.value === 'debt';
    debt ? showElement(memberField) : hideElement(memberField);

    if (paymentMethodInput) {
      paymentMethodInput.disabled = debt;
    }

    if (debt) {
      hideElement(paymentMixedFields);
    } else if (paymentMethodInput?.value === 'mixed') {
      showElement(paymentMixedFields);
    }
  }

  picker?.addEventListener('click', event => {
    const button = event.target.closest('[data-sale-variant-id]');
    if (!button) return;

    selectedVariant = variants.find(
      variant => String(variant.id) === String(button.dataset.saleVariantId)
    ) || null;

    $$('[data-sale-variant-id]', picker).forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    if (quantityInput) quantityInput.value = '1';
    syncQuantityMode();
    syncSummary();
  });

  quantityInput?.addEventListener('input', syncSummary);
  paymentStatusInput?.addEventListener('change', syncPaymentStatus);
  paymentMethodInput?.addEventListener('change', () => {
    if (paymentStatusInput?.value !== 'debt') {
      paymentMethodInput.value === 'mixed'
        ? showElement(paymentMixedFields)
        : hideElement(paymentMixedFields);
    }
  });
  cancel?.addEventListener('click', closeModal);

  syncQuantityMode();
  syncSummary();
  syncPaymentStatus();

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const quantity = number(quantityInput?.value);
    const paymentStatus = normalizeString(paymentStatusInput?.value, 'paid');
    const memberId = normalizeString(memberInput?.value);
    const stockDeduction = quantity * currentDeductionPerUnit();
    const total = quantity * currentPrice();
    const payment = paymentStatus === 'debt'
      ? { method: 'debt', cashAmount: 0, cardAmount: 0, valid: true }
      : readPaymentSplit(form, 'pos-sale', total);

    if (quantity <= 0) {
      setFieldError(
        quantityInput,
        quantityError,
        'Miqdar sıfırdan böyük olmalıdır.'
      );
      return;
    }

    if (!saleVariantIsCustom(selectedVariant) && !Number.isInteger(quantity)) {
      setFieldError(
        quantityInput,
        quantityError,
        'Bu satış seçimi üçün say tam ədəd olmalıdır.'
      );
      return;
    }

    if (stockDeduction > productStock(product)) {
      setFieldError(
        quantityInput,
        quantityError,
        `Stok kifayət deyil. Cari stok: ${productStockText(product)}.`
      );
      return;
    }

    if (!payment.valid) {
      notify.warning(`Nağd + Kart cəmi ${money(total)} olmalıdır.`);
      return;
    }

    if (paymentStatus === 'debt' && !memberId) {
      notify.warning('Borc satışı üçün üzv seçilməlidir.');
      memberInput?.focus();
      return;
    }

    await executePosSale({
      product,
      variant: selectedVariant,
      quantity,
      cashAmount: payment.cashAmount,
      cardAmount: payment.cardAmount,
      paymentStatus,
      memberId: paymentStatus === 'debt' ? memberId : null,
      button: submit,
    });
  });
}

async function executePosSale({
  product,
  variant = null,
  quantity,
  cashAmount,
  cardAmount,
  paymentStatus,
  memberId,
  button,
}) {
  if (state.busy) return;

  state.busy = true;

  setButtonLoading(button, true, {
    loadingText: 'Satılır...',
  });

  try {
    const items = [
      variant
        ? {
            product_id: product.id,
            variant_id: variant.id,
            quantity,
          }
        : {
            product_id: product.id,
            quantity,
          },
    ];

    const { data: saleId, error } = await supabase.rpc(
      RPC.processSaleV3,
      {
        p_member_id: memberId || null,
        p_payment_status: paymentStatus,
        p_items: items,
        p_cash_amount: cashAmount,
        p_card_amount: cardAmount,
      }
    );

    if (error) throw error;

    closeModal();

    notify.success(
      `${productName(product)} · ${variant ? saleVariantName(variant) : productUnitLabel(product)} satıldı.`,
      'Satış tamamlandı'
    );

    await Promise.all([
      loadProducts(),
      loadSales(),
      loadLedger(),
      loadCashRegisterEntries(),
      loadDebts(),
      loadHistory({ limit: 50 }),
    ]);

    renderPosProducts();
    renderQuickSaleProducts();

    if (state.activeTab === 'dashboard') {
      renderDashboard();
    }

    window.dispatchEvent(
      new CustomEvent(ADMIN_OPERATION_EVENT, {
        detail: {
          type: 'sale',
          saleId,
          productId: product.id,
          variantId: variant?.id || null,
          operatorId: state.identity?.profileId,
        },
      })
    );
  } catch (error) {
    console.error('[SKy Fit POS] process sale:', error);

    notify.error(
      getErrorMessage(
        error,
        'Satış tamamlanmadı.'
      )
    );
  } finally {
    state.busy = false;
    setButtonLoading(button, false);
  }
}

function filteredAdminProducts() {
  const search =
    normalizeSearch(
      byId(
        'products-admin-search'
      )?.value
    );

  const status =
    normalizeString(
      byId(
        'products-admin-status'
      )?.value,
      'all'
    );

  return state.products
    .filter(
      product => {
        if (!search) {
          return true;
        }

        const text =
          [
            product.name,
            product.sku,
            product.category,
            product.description,
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
    )
    .filter(
      product => {
        if (
          status ===
          'active'
        ) {
          return (
            product.is_active !==
            false
          );
        }

        if (
          status ===
          'inactive'
        ) {
          return (
            product.is_active ===
            false
          );
        }

        if (
          status ===
          'public'
        ) {
          return (
            product.show_public !==
            false
          );
        }

        return true;
      }
    );
}

function createAdminProductCard(
  product
) {
  const image =
    productImage(
      product
    );

  const stockState =
    productStockState(
      product
    );

  const card =
    createElement(
      'article',
      {
        className:
          'admin-product-card',

        dataset: {
          productId:
            product.id,
        },
      }
    );

  card.innerHTML = `
    <button
      type="button"
      class="admin-product-card__main"
      aria-label="${escapeHtml(
        productName(
          product
        )
      )} məhsulunu redaktə et"
    >

      <div class="admin-product-card__media">

        ${
          image
            ? `
              <img
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  productName(
                    product
                  )
                )}"
                loading="lazy"
                decoding="async"
              >
            `
            : `
              <span class="product-card__image-fallback">
                SK
              </span>
            `
        }

      </div>

      <div class="admin-product-card__body">

        <div class="admin-product-card__badges">

          <span class="${stockState.className}">
            ${escapeHtml(
              stockState.label
            )}
          </span>

          ${
            product.is_active ===
              false
              ? `
                <span class="ui-badge ui-badge--danger">
                  Deaktiv
                </span>
              `
              : ''
          }

          ${
            product.show_public ===
              false
              ? `
                <span class="ui-badge ui-badge--neutral">
                  Saytda gizli
                </span>
              `
              : ''
          }

        </div>

        <strong class="admin-product-card__name">
          ${escapeHtml(
            productName(
              product
            )
          )}
        </strong>

        <span class="admin-product-card__meta">
          ${
            product.sku
              ? `SKU: ${escapeHtml(
                  product.sku
                )}`
              : 'SKU yoxdur'
          }
        </span>

        <div class="admin-product-card__row">

          <span class="admin-product-card__price">
            ${escapeHtml(
              money(
                productPrice(
                  product
                )
              )
            )}
          </span>

          <span class="admin-product-card__stock">
            ${escapeHtml(productStockText(product))}
          </span>

        </div>

      </div>

    </button>

    <div class="admin-product-card__actions">

      <button
        type="button"
        class="ui-button ui-button--glass"
        data-product-stock="${escapeHtml(
          product.id
        )}"
      >
        <span class="ui-button__label">
          + Stok
        </span>
      </button>

      <button
        type="button"
        class="ui-button ui-button--glass"
        data-product-adjust="${escapeHtml(
          product.id
        )}"
      >
        <span class="ui-button__label">
          Düzəlt
        </span>
      </button>

    </div>
  `;

  $(
    '.admin-product-card__main',
    card
  )?.addEventListener(
    'click',
    () => {
      openProductEditor(
        product,
        card
      );
    }
  );

  $(
    '[data-product-stock]',
    card
  )?.addEventListener(
    'click',
    () => {
      openStockAddModal(
        product,
        card
      );
    }
  );

  $(
    '[data-product-adjust]',
    card
  )?.addEventListener(
    'click',
    () => {
      openStockAdjustModal(
        product,
        card
      );
    }
  );

  return card;
}

function renderAdminProducts() {
  const root =
    byId(
      'admin-products-grid'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const products =
    filteredAdminProducts();

  products.forEach(
    product => {
      root.append(
        createAdminProductCard(
          product
        )
      );
    }
  );

  if (
    products.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Məhsul tapılmadı.'
      )
    );
  }
}

function bindProductEvents() {
  byId(
    'product-create-button'
  )?.addEventListener(
    'click',
    () => {
      openProductEditor();
    }
  );

  byId(
    'products-admin-search'
  )?.addEventListener(
    'input',
    debounce(renderAdminProducts, UI_CONFIG.debounceDelay)
  );

  byId(
    'products-admin-status'
  )?.addEventListener(
    'change',
    renderAdminProducts
  );
}


function normalizedStockUnit(value) {
  const unit = normalizeString(value, 'ədəd').toLocaleLowerCase('az-AZ');

  if (['qr', 'qram', 'g', 'gram'].includes(unit)) return 'qram';
  if (['tablet', 'kapsul', 'tablet/kapsul', 'tablet / kapsul'].includes(unit)) return 'tablet';
  if (['ml', 'millilitr'].includes(unit)) return 'ml';
  if (['l', 'litr', 'liter'].includes(unit)) return 'litr';
  if (['kq', 'kg', 'kiloqram'].includes(unit)) return 'kq';
  return unit || 'ədəd';
}

function stockUnitLabel(value) {
  switch (normalizedStockUnit(value)) {
    case 'qram': return 'qram';
    case 'tablet': return 'tablet';
    case 'ml': return 'ml';
    case 'litr': return 'litr';
    case 'kq': return 'kq';
    default: return 'ədəd';
  }
}

function stockUnitOptionMarkup(currentValue) {
  const current = normalizedStockUnit(currentValue);
  const options = [
    ['ədəd', 'Ədəd — su, shaker, bütöv məhsul'],
    ['qram', 'Qram — protein, kreatin, toz məhsul'],
    ['tablet', 'Tablet / kapsul'],
    ['ml', 'Millilitr'],
    ['litr', 'Litr'],
    ['kq', 'Kiloqram'],
  ];

  if (!options.some(([value]) => value === current)) {
    options.push([current, currentValue || current]);
  }

  return options.map(([value, label]) => `
    <option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>
      ${escapeHtml(label)}
    </option>
  `).join('');
}

function saleVariantEditorRowMarkup(variant = {}, index = 0, stockUnit = 'ədəd') {
  const type = saleVariantType(variant);
  const name = normalizeString(variant?.name);
  const deduction = variant?.stock_deduction ?? '';
  const price = variant?.price ?? '';
  const sortOrder = variant?.sort_order ?? index * 10;
  const quick = variant?.is_quick_sale === true;
  const unit = stockUnitLabel(stockUnit);

  return `
    <div class="sale-variant-editor-row" data-sale-variant-row data-variant-id="${escapeHtml(variant?.id || '')}">
      <div class="sale-variant-editor-row__main">
        <div class="ui-field">
          <label class="ui-field__label">Satış seçiminin adı</label>
          <div class="ui-input">
            <input
              class="ui-input__control"
              data-variant-field="name"
              type="text"
              maxlength="80"
              value="${escapeHtml(name)}"
              placeholder="Məs: 5 qram"
            >
          </div>
          <span class="ui-field__hint">Kassada admin bu adı görəcək.</span>
        </div>

        <div class="ui-field">
          <label class="ui-field__label">Satış növü</label>
          <select class="ui-select" data-variant-field="variant_type">
            ${['unit', 'gram', 'tablet', 'portion', 'scoop', 'pack', 'custom']
              .map(option => `
                <option value="${option}" ${option === type ? 'selected' : ''}>
                  ${escapeHtml(saleVariantTypeLabel(option))}
                </option>
              `)
              .join('')}
          </select>
          <span class="ui-field__hint">Bu seçim yalnız görünüş və izah üçündür.</span>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" data-stock-deduction-label>Stokdan çıxacaq (${escapeHtml(unit)})</label>
          <div class="ui-input sale-variant-editor-row__quantity-input">
            <input
              class="ui-input__control"
              data-variant-field="stock_deduction"
              type="number"
              inputmode="decimal"
              min="0.001"
              step="0.001"
              value="${escapeHtml(String(deduction))}"
              placeholder="5"
            >
            <span class="sale-variant-editor-row__unit" data-stock-unit-suffix>${escapeHtml(unit)}</span>
          </div>
          <span class="ui-field__hint">Məs: “5 qram” satılırsa burada 5 yaz.</span>
        </div>

        <div class="ui-field">
          <label class="ui-field__label">Müştəri qiyməti</label>
          <div class="ui-input sale-variant-editor-row__quantity-input">
            <input
              class="ui-input__control"
              data-variant-field="price"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${escapeHtml(String(price))}"
              placeholder="2.00"
            >
            <span class="sale-variant-editor-row__unit">₼</span>
          </div>
          <span class="ui-field__hint">Bu satış seçiminin yekun qiyməti.</span>
        </div>
      </div>

      <div class="sale-variant-editor-row__footer">
        <label class="ui-check">
          <input data-variant-field="is_quick_sale" type="checkbox" ${quick ? 'checked' : ''}>
          <span>⚡ Tez satışda göstər</span>
        </label>

        <input data-variant-field="sort_order" type="hidden" value="${escapeHtml(String(sortOrder))}">

        <button class="sale-variant-editor-row__remove" type="button" data-remove-sale-variant>
          Sil
        </button>
      </div>
    </div>
  `;
}

function collectSaleVariantRows(form) {
  return $$('[data-sale-variant-row]', form).map((row, index) => {
    const field = name => $(`[data-variant-field="${name}"]`, row);

    return {
      id: normalizeString(row.dataset.variantId) || null,
      name: normalizeString(field('name')?.value),
      variant_type: normalizeString(field('variant_type')?.value, 'unit'),
      stock_deduction: number(field('stock_deduction')?.value),
      price: number(field('price')?.value),
      is_quick_sale: Boolean(field('is_quick_sale')?.checked),
      is_active: true,
      sort_order: index * 10,
    };
  });
}

async function syncProductSaleVariants(productId, variants) {
  const valid = rows(variants).filter(variant =>
    variant.name &&
    variant.stock_deduction > 0 &&
    variant.price >= 0
  );

  const { error: deleteError } = await supabase
    .from(TABLES.productSaleVariants)
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  if (!valid.length) return [];

  const payload = valid.map((variant, index) => ({
    product_id: productId,
    name: variant.name,
    variant_type: variant.variant_type,
    stock_deduction: variant.stock_deduction,
    price: variant.price,
    is_quick_sale: variant.is_quick_sale,
    is_active: true,
    sort_order: index * 10,
  }));

  const { data, error } = await supabase
    .from(TABLES.productSaleVariants)
    .insert(payload)
    .select('*');

  if (error) throw error;
  return rows(data);
}

function openProductEditor(
  product = null,
  trigger = null
) {
  const editing =
    Boolean(product);

  const mode =
    product
      ?.sale_mode ||
    'unit';

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'admin-product-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="admin-product-name"
      >
        Məhsul adı
      </label>

      <div class="ui-input">

        <input
          id="admin-product-name"
          class="ui-input__control"
          type="text"
          maxlength="160"
          value="${escapeHtml(
            product?.name ||
            ''
          )}"
          placeholder="Məhsul adı"
        >

      </div>

      <span
        id="admin-product-name-error"
        class="ui-field__error is-hidden"
      ></span>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-sku"
        >
          SKU / kod
        </label>

        <div class="ui-input">

          <input
            id="admin-product-sku"
            class="ui-input__control"
            type="text"
            maxlength="100"
            value="${escapeHtml(
              product?.sku ||
              ''
            )}"
            placeholder="Məs: SU-001"
          >

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-category"
        >
          Kateqoriya
        </label>

        <div class="ui-input">

          <input
            id="admin-product-category"
            class="ui-input__control"
            type="text"
            maxlength="120"
            value="${escapeHtml(
              product?.category ||
              ''
            )}"
            placeholder="İçkilər"
          >

        </div>

      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="admin-product-description"
      >
        Açıqlama
      </label>

      <textarea
        id="admin-product-description"
        class="ui-textarea"
        maxlength="1000"
        rows="3"
        placeholder="Məhsul haqqında qısa məlumat"
      >${escapeHtml(
        product?.description ||
        ''
      )}</textarea>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-sale-mode"
        >
          Məhsulun əsas satış üsulu
        </label>

        <select
          id="admin-product-sale-mode"
          class="ui-select"
        >
          <option
            value="unit"
            ${
              mode ===
                'unit'
                ? 'selected'
                : ''
            }
          >
            Adi satış — 1 ədəd / 1 vahid
          </option>

          ${editing || mode === 'portion' ? `
            <option
              value="portion"
              ${mode === 'portion' ? 'selected' : ''}
            >
              Porsiya / qaşıq
            </option>
          ` : ''}
        </select>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-stock-unit"
        >
          Stok vahidi
        </label>

        <select
          id="admin-product-stock-unit"
          class="ui-select"
        >
          ${stockUnitOptionMarkup(product?.stock_unit || 'ədəd')}
        </select>
        <span class="ui-field__hint">
          Əsas qayda: qramla satılan toz məhsulun stoku da qramla saxlanmalıdır.
        </span>

      </div>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-retail-price"
        >
          Bütöv məhsulun satış qiyməti
        </label>

        <div class="ui-input">

          <input
            id="admin-product-retail-price"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${
              product
                ? number(
                    product
                      .retail_price
                  )
                : ''
            }"
            placeholder="0.00"
          >

        </div>

        <span class="ui-field__hint">
          Qram/tablet seçimləri aşağıda ayrıca qiymətləndirilir. Variant yoxdursa POS bu qiyməti istifadə edir.
        </span>

        <span
          id="admin-product-price-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

      <div
        id="admin-product-portion-price-field"
        class="ui-field ${
          mode ===
            'portion'
            ? ''
            : 'is-hidden'
        }"
      >

        <label
          class="ui-field__label"
          for="admin-product-portion-price"
        >
          Porsiya qiyməti
        </label>

        <div class="ui-input">

          <input
            id="admin-product-portion-price"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${
              product
                ? number(
                    product
                      .portion_price
                  )
                : ''
            }"
            placeholder="0.00"
          >

        </div>

      </div>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-cost-price"
        >
          1 stok vahidinin maya dəyəri
        </label>

        <div class="ui-input">

          <input
            id="admin-product-cost-price"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${
              product
                ? number(
                    product
                      .cost_price
                  )
                : ''
            }"
            placeholder="0.00"
          >

        </div>

      </div>

      <div
        id="admin-product-portion-size-field"
        class="ui-field ${
          mode ===
            'portion'
            ? ''
            : 'is-hidden'
        }"
      >

        <label
          class="ui-field__label"
          for="admin-product-portion-size"
        >
          1 porsiyanın stok miqdarı
        </label>

        <div class="ui-input">

          <input
            id="admin-product-portion-size"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0.001"
            step="0.001"
            value="${
              product
                ? number(
                    product
                      .portion_size
                  )
                : ''
            }"
            placeholder="0.250"
          >

        </div>

      </div>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-low-stock"
        >
          Az stok xəbərdarlığı
        </label>

        <div class="ui-input">

          <input
            id="admin-product-low-stock"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.001"
            value="${
              product
                ? number(
                    product
                      .low_stock_threshold
                  )
                : 0
            }"
          >

        </div>

      </div>

      <div class="ui-field">

        <label class="ui-field__label">
          Görünüş
        </label>

        <div class="ui-check-list">

          <label class="ui-check">

            <input
              id="admin-product-active"
              type="checkbox"
              ${
                product?.is_active !==
                  false
                  ? 'checked'
                  : ''
              }
            >

            <span>
              Aktivdir
            </span>

          </label>

          <label class="ui-check">

            <input
              id="admin-product-public"
              type="checkbox"
              ${
                product?.show_public !==
                  false
                  ? 'checked'
                  : ''
              }
            >

            <span>
              Saytda göstər
            </span>

          </label>

        </div>

      </div>

    </div>

    <section class="sale-variant-editor">
      <div class="sale-variant-editor__header">
        <div>
          <span class="section-eyebrow">3. Satış seçimləri</span>
          <strong>Qram · tablet · qaşıq · bütöv qab</strong>
          <small>
            Burada kassada görünəcək hazır seçimləri yaradırsan. “Stokdan çıxacaq” dəyəri yuxarıda seçdiyin stok vahidi ilə eyni olmalıdır.
          </small>
        </div>

        <button
          id="admin-product-add-variant"
          class="ui-button ui-button--glass"
          type="button"
        >
          <span class="ui-button__label">+ Variant əlavə et</span>
        </button>
      </div>

      <div id="admin-product-sale-variants" class="sale-variant-editor__list">
        ${
          productSaleVariants(product).length
            ? productSaleVariants(product).map((variant, index) =>
                saleVariantEditorRowMarkup(variant, index, product?.stock_unit || 'ədəd')
              ).join('')
            : ''
        }
      </div>

      <div class="ui-info-card">
        <span class="ui-info-card__icon">i</span>
        <span>
          <strong>Sadə qayda</strong>
          <small>
            Stok vahidi “qram”dırsa: 5 qram → 5, 50 qram → 50. Stok vahidi “tablet”dirsə: 10 tablet → 10.
            0.005 və ya 0.01 yalnız stok vahidin “kq” olduqda məntiqlidir. Qram stokunda belə onluqlar yazma.
          </small>
        </span>
      </div>
    </section>

    <div id="admin-product-unit-warning" class="product-unit-warning is-hidden" role="status"></div>

    <label class="ui-upload">

      <input
        id="admin-product-image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
      >

      <span>

        <strong class="ui-upload__title">
          ${
            editing
              ? 'Məhsul şəklini dəyiş'
              : 'Məhsul şəkli'
          }
        </strong>

        <span class="ui-upload__meta">
          PNG, JPG və ya WEBP · maksimum 5 MB
        </span>

      </span>

    </label>

    <div class="product-editor-actions">
      ${editing ? `
        <button
          id="admin-product-delete"
          class="ui-button ui-button--danger"
          type="button"
        >
          <span class="ui-button__label">Məhsulu sil</span>
        </button>
      ` : ''}

      <button
        id="admin-product-submit"
        class="ui-button ui-button--primary"
        type="submit"
      >
        <span class="ui-button__label">
          ${editing ? 'Yadda saxla' : 'Məhsul əlavə et'}
        </span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    </div>
  `;

  openModal({
    eyebrow:
      'Məhsullar',

    title:
      editing
        ? 'Məhsulu redaktə et'
        : 'Yeni məhsul',

    content,

    trigger,

    className: 'app-modal--product-editor',

    onOpen:
      () => {
        bindProductForm(
          content,
          product
        );
      },
  });
}

function bindProductForm(
  form,
  product
) {
  const nameInput =
    $(
      '#admin-product-name',
      form
    );

  const skuInput =
    $(
      '#admin-product-sku',
      form
    );

  const categoryInput =
    $(
      '#admin-product-category',
      form
    );

  const descriptionInput =
    $(
      '#admin-product-description',
      form
    );

  const modeInput =
    $(
      '#admin-product-sale-mode',
      form
    );

  const unitInput =
    $(
      '#admin-product-stock-unit',
      form
    );

  const retailPriceInput =
    $(
      '#admin-product-retail-price',
      form
    );

  const portionPriceInput =
    $(
      '#admin-product-portion-price',
      form
    );

  const costPriceInput =
    $(
      '#admin-product-cost-price',
      form
    );

  const portionSizeInput =
    $(
      '#admin-product-portion-size',
      form
    );

  const lowStockInput =
    $(
      '#admin-product-low-stock',
      form
    );

  const activeInput =
    $(
      '#admin-product-active',
      form
    );

  const publicInput =
    $(
      '#admin-product-public',
      form
    );

  const imageInput =
    $(
      '#admin-product-image',
      form
    );

  const variantsRoot =
    $('#admin-product-sale-variants', form);

  const addVariantButton =
    $('#admin-product-add-variant', form);

  const unitWarning =
    $('#admin-product-unit-warning', form);

  const nameError =
    $(
      '#admin-product-name-error',
      form
    );

  const priceError =
    $(
      '#admin-product-price-error',
      form
    );

  const submit =
    $(
      '#admin-product-submit',
      form
    );

  const deleteButton = $('#admin-product-delete', form);

  deleteButton?.addEventListener('click', async () => {
    if (!product?.id || state.busy) return;

    const confirmed = await confirmDialog({
      eyebrow: 'Məhsullar',
      title: 'Məhsul silinsin?',
      message: 'Məhsul heç bir satış və stok tarixçəsində istifadə olunmayıbsa tam silinəcək. Tarixçəsi varsa məlumat itkisi olmasın deyə arxivlənəcək və satışdan gizlənəcək.',
      confirmText: 'Sil / arxivlə',
      cancelText: 'Ləğv et',
      danger: true,
    });

    if (!confirmed) return;

    state.busy = true;
    setButtonLoading(deleteButton, true, { loadingText: 'Silinir...' });

    try {
      const { data, error } = await supabase.rpc(RPC.deleteProductSafely, {
        p_product_id: product.id,
      });

      if (error) throw error;

      closeModal();
      notify.success(
        data === 'deleted'
          ? 'Məhsul tam silindi.'
          : 'Məhsul tarixçəsi olduğu üçün arxivləndi.'
      );

      await Promise.all([
        loadProducts(),
        loadStockMovements(),
        loadHistory({ limit: 50 }),
      ]);

      renderAdminProducts();
      renderPosProducts();
      renderQuickSaleProducts();
      renderStock();
    } catch (error) {
      console.error('[SKy Fit] Məhsul silmə:', error);
      notify.error(getErrorMessage(error, 'Məhsul silinmədi.'));
    } finally {
      state.busy = false;
      setButtonLoading(deleteButton, false);
    }
  });


  function syncSaleMode() {
    const portion =
      modeInput?.value ===
      'portion';

    const priceField =
      $(
        '#admin-product-portion-price-field',
        form
      );

    const sizeField =
      $(
        '#admin-product-portion-size-field',
        form
      );

    portion
      ? showElement(
          priceField
        )
      : hideElement(
          priceField
        );

    portion
      ? showElement(
          sizeField
        )
      : hideElement(
          sizeField
        );
  }

  function syncStockGuidance() {
    const unit = stockUnitLabel(unitInput?.value);
    const variantRows = $$('[data-sale-variant-row]', form);
    const issues = [];

    variantRows.forEach(row => {
      setText($('[data-stock-deduction-label]', row), `Stokdan çıxacaq (${unit})`);
      setText($('[data-stock-unit-suffix]', row), unit);

      const type = normalizeString($('[data-variant-field="variant_type"]', row)?.value);
      const name = normalizeString($('[data-variant-field="name"]', row)?.value);
      const deduction = number($('[data-variant-field="stock_deduction"]', row)?.value);

      if ((type === 'gram' || type === 'scoop') && unit !== 'qram') {
        issues.push('Qram/qaşıq satışı üçün “Stok vahidi”ni Qram seç.');
      }

      if (type === 'tablet' && !['tablet', 'ədəd'].includes(unit)) {
        issues.push('Tablet satışı üçün stok vahidi Tablet / kapsul olmalıdır.');
      }

      if (type === 'gram' && unit === 'qram') {
        const match = name.match(/(\d+(?:[.,]\d+)?)\s*(?:qr|qram|g)\b/i);
        const namedGrams = match ? number(match[1].replace(',', '.')) : 0;
        if (namedGrams > 0 && deduction > 0 && Math.abs(namedGrams - deduction) > 0.0001) {
          issues.push(`“${name}” üçün stokdan ${deduction} qram çıxılır. Adına görə burada ${namedGrams} yazılmalıdır.`);
        }
      }
    });

    if (!unitWarning) return issues;

    if (!issues.length) {
      hideElement(unitWarning);
      unitWarning.innerHTML = '';
      return issues;
    }

    unitWarning.innerHTML = `
      <strong>Stok vahidini yoxla</strong>
      <span>${escapeHtml(Array.from(new Set(issues)).join(' '))}</span>
      <small>Vahidi dəyişmək mövcud stok rəqəmini avtomatik çevirmir. Yadda saxladıqdan sonra Stok → Düzəlt ilə real qalığı yaz.</small>
    `;
    showElement(unitWarning);
    return issues;
  }

  modeInput
    ?.addEventListener(
      'change',
      syncSaleMode
    );

  syncSaleMode();

  unitInput?.addEventListener('change', syncStockGuidance);
  variantsRoot?.addEventListener('input', syncStockGuidance);
  variantsRoot?.addEventListener('change', syncStockGuidance);

  syncStockGuidance();

  addVariantButton?.addEventListener('click', () => {
    variantsRoot?.insertAdjacentHTML(
      'beforeend',
      saleVariantEditorRowMarkup({}, $$('[data-sale-variant-row]', form).length, unitInput?.value || 'ədəd')
    );

    syncStockGuidance();

    const lastRow = $$('[data-sale-variant-row]', form).at(-1);
    $('[data-variant-field="name"]', lastRow)?.focus();
  });

  variantsRoot?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-sale-variant]');
    if (!removeButton) return;
    removeButton.closest('[data-sale-variant-row]')?.remove();
    syncStockGuidance();
  });

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const name =
        normalizeString(
          nameInput?.value
        );

      const mode =
        normalizeString(
          modeInput?.value,
          'unit'
        );

      const retailPrice =
        number(
          retailPriceInput
            ?.value
        );

      const portionPrice =
        number(
          portionPriceInput
            ?.value
        );

      const portionSize =
        number(
          portionSizeInput
            ?.value
        );

      if (
        name.length < 2
      ) {
        setFieldError(
          nameInput,
          nameError,
          'Məhsul adı minimum 2 simvol olmalıdır.'
        );

        return;
      }

      if (
        mode ===
          'unit' &&
        retailPrice < 0
      ) {
        setFieldError(
          retailPriceInput,
          priceError,
          'Qiymət düzgün deyil.'
        );

        return;
      }

      if (
        mode ===
          'portion' &&
        (
          portionPrice <= 0 ||
          portionSize <= 0
        )
      ) {
        notify.warning(
          'Porsiya məhsulu üçün porsiya qiyməti və porsiya ölçüsü daxil edilməlidir.'
        );

        return;
      }

      const saleVariants = collectSaleVariantRows(form);

      const unitIssues = syncStockGuidance();
      if (unitIssues.length) {
        notify.warning('Stok vahidi ilə satış seçimləri uyğun deyil. Sarı xəbərdarlığı düzəlt.');
        unitWarning?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const invalidVariant = saleVariants.find(
        variant =>
          !variant.name ||
          variant.stock_deduction <= 0 ||
          variant.price < 0
      );

      if (invalidVariant) {
        notify.warning(
          'Satış variantlarında ad, stokdan çıxılacaq miqdar və qiymət düzgün doldurulmalıdır.'
        );
        return;
      }

      const payload = {

        name,

        sku:
          normalizeString(
            skuInput?.value
          ) ||
          null,

        category:
          normalizeString(
            categoryInput?.value
          ) ||
          null,

        description:
          normalizeString(
            descriptionInput
              ?.value
          ) ||
          null,

        sale_mode:
          mode,

        stock_unit:
          normalizedStockUnit(
            unitInput?.value
          ),

        retail_price:
          retailPrice,

        portion_price:
          mode ===
            'portion'
            ? portionPrice
            : 0,

        cost_price:
          number(
            costPriceInput
              ?.value
          ),

      portion_size:
        mode === 'portion'
          ? portionSize
          : 1,

        low_stock_threshold:
          Math.max(
            0,
            number(
              lowStockInput
                ?.value
            )
          ),

        is_active:
          Boolean(
            activeInput
              ?.checked
          ),

        show_public:
          Boolean(
            publicInput
              ?.checked
          ),
      };

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            product
              ? 'Yadda saxlanılır...'
              : 'Əlavə olunur...',
        }
      );

      try {
        let savedProduct;

        if (product) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                TABLES.products
              )
              .update(
                payload
              )
              .eq(
                'id',
                product.id
              )
              .select('*')
              .single();

          if (error) {
            throw error;
          }

          savedProduct =
            data;
        } else {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                TABLES.products
              )
              .insert(
                payload
              )
              .select('*')
              .single();

          if (error) {
            throw error;
          }

          savedProduct =
            data;
        }

        const imageFile =
          imageInput
            ?.files
            ?.[0];

        if (
          imageFile
        ) {
          savedProduct =
            await uploadProductImage(
              savedProduct,
              imageFile
            );
        }

        await syncProductSaleVariants(
          savedProduct.id,
          saleVariants
        );

        closeModal();

        notify.success(
          product
            ? 'Məhsul yeniləndi.'
            : 'Məhsul əlavə edildi.'
        );

        await Promise.all([
          loadProducts(),
          loadHistory({
            limit:
              50,
          }),
        ]);

        renderAdminProducts();

        renderPosProducts();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] Product save:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Məhsul yadda saxlanmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

function validateProductImage(
  file
) {
  const allowed =
    new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

  if (
    !allowed.has(
      file?.type
    )
  ) {
    throw new Error(
      'Məhsul şəkli JPG, PNG və ya WEBP olmalıdır.'
    );
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {
    throw new Error(
      'Məhsul şəkli maksimum 5 MB ola bilər.'
    );
  }
}

function productImageExtension(
  file
) {
  if (
    file.type ===
    'image/png'
  ) {
    return 'png';
  }

  if (
    file.type ===
    'image/webp'
  ) {
    return 'webp';
  }

  return 'jpg';
}

function extractProductStoragePath(
  value
) {
  const source =
    normalizeString(
      value
    );

  if (!source) {
    return '';
  }

  if (
    !source.startsWith(
      'http://'
    ) &&
    !source.startsWith(
      'https://'
    )
  ) {
    return source.replace(
      /^\/+/,
      ''
    );
  }

  try {
    const url =
      new URL(source);

    const marker =
      '/storage/v1/object/public/product-images/';

    const index =
      url.pathname.indexOf(
        marker
      );

    if (
      index === -1
    ) {
      return '';
    }

    return decodeURIComponent(
      url.pathname.slice(
        index +
        marker.length
      )
    );
  } catch {
    return '';
  }
}

function productImagePathBelongsToProduct(path, productId) {
  const safePath = normalizeString(path);
  const safeId = normalizeString(productId);

  return Boolean(
    safePath &&
    safeId &&
    safePath.startsWith(`${safeId}/`)
  );
}

async function uploadProductImage(
  product,
  file
) {
  validateProductImage(
    file
  );

  const oldPath =
    extractProductStoragePath(
      product.image_url
    );

  const extension =
    productImageExtension(
      file
    );

  const path =
    `${product.id}/product-${Date.now()}.${extension}`;

  const {
    error:
      uploadError,
  } =
    await supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .productImages
      )
      .upload(
        path,
        file,
        {
          upsert:
            false,

          cacheControl:
            '3600',

          contentType:
            file.type,
        }
      );

  if (
    uploadError
  ) {
    throw uploadError;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.products
      )
      .update({
        image_url:
          path,
      })
      .eq(
        'id',
        product.id
      )
      .select('*')
      .single();

  if (error) {
    await supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .productImages
      )
      .remove([
        path,
      ]);

    throw error;
  }

  if (
    productImagePathBelongsToProduct(
      oldPath,
      product.id
    ) &&
    oldPath !== path
  ) {
    supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .productImages
      )
      .remove([
        oldPath,
      ])
      .then(
        ({
          error:
            removeError,
        }) => {
          if (
            removeError
          ) {
            console.warn(
              '[SKy Fit] Old product image cleanup:',
              removeError
            );
          }
        }
      );
  }

  return data;
}

function filteredStockProducts() {
  const search =
    normalizeSearch(
      byId(
        'stock-search'
      )?.value
    );

  const filter =
    normalizeString(
      byId(
        'stock-filter'
      )?.value,
      'all'
    );

  return state.products
    .filter(
      product => {
        if (!search) {
          return true;
        }

        return [
          product.name,
          product.sku,
          product.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(
            search
          );
      }
    )
    .filter(
      product => {
        const meta =
          productStockState(
            product
          );

        if (
          filter ===
          'low'
        ) {
          return (
            meta.key ===
            'low'
          );
        }

        if (
          filter ===
          'empty'
        ) {
          return (
            meta.key ===
            'out'
          );
        }

        return true;
      }
    );
}

function renderStock() {
  renderStockProducts();

  renderStockMovements();
}

function renderStockProducts() {
  const root =
    byId(
      'stock-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const products =
    filteredStockProducts();

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>Məhsul</th>
        <th>Satış</th>
        <th>Stok</th>
        <th>Vəziyyət</th>
        <th>Əməliyyat</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  products.forEach(
    product => {
      const meta =
        productStockState(
          product
        );

      const row =
        createElement(
          'tr'
        );

      row.innerHTML = `
        <td>

          <strong class="admin-table__primary">
            ${escapeHtml(
              productName(
                product
              )
            )}
          </strong>

          <span class="admin-table__secondary">
            ${escapeHtml(
              product.sku ||
              product.category ||
              '—'
            )}
          </span>

        </td>

        <td>
          ${escapeHtml(
            money(
              productPrice(
                product
              )
            )
          )}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              String(
                productStock(
                  product
                )
              )
            )}
          </strong>

          ${escapeHtml(
            productStockUnit(
              product
            )
          )}
        </td>

        <td>
          <span class="${meta.className}">
            ${escapeHtml(
              meta.label
            )}
          </span>
        </td>

        <td>

          <div class="admin-table__actions">

            <button
              type="button"
              class="admin-row-action"
              data-stock-add="${escapeHtml(
                product.id
              )}"
              title="Stok artır"
            >
              +
            </button>

            <button
              type="button"
              class="admin-row-action"
              data-stock-adjust="${escapeHtml(
                product.id
              )}"
              title="Stoku düzəlt"
            >
              ✎
            </button>

          </div>

        </td>
      `;

      tbody.append(
        row
      );
    }
  );

  root.append(
    table
  );

  $$(
    '[data-stock-add]',
    root
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          const product =
            state.products.find(
              item =>
                String(
                  item.id
                ) ===
                String(
                  button.dataset
                    .stockAdd
                )
            );

          if (product) {
            openStockAddModal(
              product,
              button
            );
          }
        }
      );
    }
  );

  $$(
    '[data-stock-adjust]',
    root
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          const product =
            state.products.find(
              item =>
                String(
                  item.id
                ) ===
                String(
                  button.dataset
                    .stockAdjust
                )
            );

          if (product) {
            openStockAdjustModal(
              product,
              button
            );
          }
        }
      );
    }
  );
}

function renderStockMovements() {
  const root =
    byId(
      'stock-movements-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>Məhsul</th>
        <th>Hərəkət</th>
        <th>Miqdar</th>
        <th>Qalıq</th>
        <th>Qeyd</th>
        <th>Tarix</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  state.stockMovements
    .slice(
      0,
      200
    )
    .forEach(
      movement => {
        const row =
          createElement(
            'tr'
          );

        row.innerHTML = `
          <td>
            <strong class="admin-table__primary">
              ${escapeHtml(
                movement
                  .product
                  ?.name ||
                'Məhsul'
              )}
            </strong>
          </td>

          <td>
            <span class="${
              stockMovementClass(
                movement
                  .movement_type
              )
            }">
              ${escapeHtml(
                stockMovementLabel(
                  movement
                    .movement_type
                )
              )}
            </span>
          </td>

          <td>
            ${escapeHtml(
              stockNumber(
                movement.quantity,
                movement.product?.stock_unit
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              stockNumber(
                movement.balance_after,
                movement.product?.stock_unit
              )
            )}
          </td>

          <td>
            ${escapeHtml(
              movement.note ||
              '—'
            )}
          </td>

          <td>
            ${formatDateTime(
              movement.created_at
            )}
          </td>
        `;

        tbody.append(
          row
        );
      }
    );

  root.append(
    table
  );
}

function stockMovementLabel(
  type
) {
  switch (
    normalizeString(
      type
    )
  ) {
    case 'purchase':
      return 'Alış';

    case 'sale':
      return 'Satış';

    case 'adjustment':
      return 'Düzəliş';

    default:
      return normalizeString(
        type,
        'Hərəkət'
      );
  }
}

function stockMovementClass(
  type
) {
  switch (
    normalizeString(
      type
    )
  ) {
    case 'purchase':
      return (
        'ui-badge ui-badge--success'
      );

    case 'sale':
      return (
        'ui-badge ui-badge--warning'
      );

    case 'adjustment':
      return (
        'ui-badge ui-badge--neutral'
      );

    default:
      return (
        'ui-badge'
      );
  }
}

function openStockAddModal(
  product,
  trigger = null
) {
  const stockUnit = stockUnitLabel(productStockUnit(product));
  const packageCalculatorEnabled = ['qram', 'tablet'].includes(stockUnit);

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'stock-add-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="pos-confirm__summary">

      <div class="pos-confirm__row">
        <span>Məhsul</span>

        <strong>
          ${escapeHtml(
            productName(
              product
            )
          )}
        </strong>
      </div>

      <div class="pos-confirm__row">
        <span>Cari stok</span>

        <strong>
          ${escapeHtml(productStockText(product))}
        </strong>
      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="stock-add-quantity"
      >
        Əlavə ediləcək miqdar (${escapeHtml(stockUnit)})
      </label>

      <div class="ui-input sale-variant-editor-row__quantity-input">

        <input
          id="stock-add-quantity"
          class="ui-input__control"
          type="number"
          inputmode="decimal"
          min="0.001"
          step="0.001"
          placeholder="0"
        >
        <span class="sale-variant-editor-row__unit">${escapeHtml(stockUnit)}</span>

      </div>
      <span class="ui-field__hint">Stok bu vahidlə saxlanılır; satış da həmin vahiddən çıxacaq.</span>

      <span
        id="stock-add-quantity-error"
        class="ui-field__error is-hidden"
      ></span>

    </div>

    ${packageCalculatorEnabled ? `
      <div class="stock-package-calculator">
        <div class="stock-package-calculator__header">
          <strong>Qab/qutu ilə alırsansa</strong>
          <small>İstəyə bağlı hesablayıcı — yekun miqdarı yuxarıdakı xanaya özü yazır.</small>
        </div>
        <div class="modal-form__grid">
          <div class="ui-field">
            <label class="ui-field__label" for="stock-add-package-count">Qab / qutu sayı</label>
            <div class="ui-input">
              <input id="stock-add-package-count" class="ui-input__control" type="number" inputmode="decimal" min="0" step="1" placeholder="Məs: 2">
            </div>
          </div>
          <div class="ui-field">
            <label class="ui-field__label" for="stock-add-package-size">1 qabda / qutuda neçə ${escapeHtml(stockUnit)}</label>
            <div class="ui-input sale-variant-editor-row__quantity-input">
              <input id="stock-add-package-size" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.001" placeholder="Məs: ${stockUnit === 'qram' ? '360' : '100'}">
              <span class="sale-variant-editor-row__unit">${escapeHtml(stockUnit)}</span>
            </div>
          </div>
        </div>
        <div id="stock-add-package-result" class="stock-package-calculator__result">Yekun stok miqdarı hesablanacaq.</div>
      </div>
    ` : ''}

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="stock-add-total-cost"
      >
        Bu alışın ümumi maya dəyəri
      </label>

      <div class="ui-input">

        <input
          id="stock-add-total-cost"
          class="ui-input__control"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
        >

      </div>

      <span class="ui-field__hint">
        0 yazsan maliyyədə xərc yaradılmayacaq.
      </span>

    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="stock-add-payment-method">
        Alış ödənişi
      </label>
      <select id="stock-add-payment-method" class="ui-select">
        <option value="cash">Nağd</option>
        <option value="card">Kart</option>
      </select>
      <span class="ui-field__hint">
        Nağd alış fiziki KASSA qalığından çıxacaq, kart alışı isə kassaya toxunmayacaq.
      </span>
    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="stock-add-note"
      >
        Qeyd
      </label>

      <textarea
        id="stock-add-note"
        class="ui-textarea"
        rows="3"
        maxlength="500"
        placeholder="Məs: Yeni partiya alışı"
      ></textarea>

    </div>

    <button
      id="stock-add-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Stoku artır
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Anbar',

    title:
      'Stok artır',

    content,

    trigger,

    onOpen:
      () => {
        bindStockAddForm(
          content,
          product
        );
      },
  });
}

//
// add_stock(
//   p_product_id,
//   p_quantity,
//   p_total_cost,
//   p_note
// )

function bindStockAddForm(
  form,
  product
) {
  const quantityInput =
    $(
      '#stock-add-quantity',
      form
    );

  const costInput =
    $(
      '#stock-add-total-cost',
      form
    );

  const packageCountInput = $('#stock-add-package-count', form);
  const packageSizeInput = $('#stock-add-package-size', form);
  const packageResult = $('#stock-add-package-result', form);

  const noteInput =
    $(
      '#stock-add-note',
      form
    );

  const paymentInput = $('#stock-add-payment-method', form);

  const quantityError =
    $(
      '#stock-add-quantity-error',
      form
    );

  const submit =
    $(
      '#stock-add-submit',
      form
    );

  function syncPackageQuantity() {
    if (!packageCountInput || !packageSizeInput) return;
    const count = Math.max(0, number(packageCountInput.value));
    const size = Math.max(0, number(packageSizeInput.value));
    const total = count * size;

    if (count > 0 && size > 0) {
      quantityInput.value = String(Number(total.toFixed(3)));
      setText(packageResult, `${count} × ${size} = ${Number(total.toFixed(3))} ${stockUnitLabel(productStockUnit(product))}`);
    } else {
      setText(packageResult, 'Yekun stok miqdarı hesablanacaq.');
    }
  }

  packageCountInput?.addEventListener('input', syncPackageQuantity);
  packageSizeInput?.addEventListener('input', syncPackageQuantity);

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const quantity =
        number(
          quantityInput
            ?.value
        );

      const totalCost =
        Math.max(
          0,
          number(
            costInput
              ?.value
          )
        );

      const note =
        normalizeString(
          noteInput
            ?.value,
          'Stok alışı'
        );

      const paymentMethod = normalizeString(paymentInput?.value, 'cash');

      if (
        quantity <= 0
      ) {
        setFieldError(
          quantityInput,
          quantityError,
          'Miqdar sıfırdan böyük olmalıdır.'
        );

        return;
      }

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Əlavə olunur...',
        }
      );

      try {
        const {
          error,
        } =
          await supabase.rpc(
            RPC.addStockV3,
            {
              p_product_id:
                product.id,

              p_quantity:
                quantity,

              p_total_cost:
                totalCost,

              p_note: note,
              p_payment_method: paymentMethod,
            }
          );

        if (error) {
          throw error;
        }

        closeModal();

        notify.success(
          'Stok artırıldı.'
        );

        await Promise.all([
          loadProducts(),
          loadStockMovements(),
          loadLedger(),
          loadCashRegisterEntries(),
          loadHistory({
            limit:
              50,
          }),
        ]);

        renderStock();

        renderAdminProducts();

        renderPosProducts();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] add_stock:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Stok artırılmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

//
// Bu "stok artır" deyil.
// Inventar sayımı və ya səhv düzəlişi üçündür.
// Səbəb məcburidir.

function openStockAdjustModal(
  product,
  trigger = null
) {
  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'stock-adjust-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="pos-confirm__summary">

      <div class="pos-confirm__row">
        <span>Məhsul</span>

        <strong>
          ${escapeHtml(
            productName(
              product
            )
          )}
        </strong>
      </div>

      <div class="pos-confirm__row">
        <span>Cari stok</span>

        <strong>
          ${escapeHtml(productStockText(product))}
        </strong>
      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="stock-adjust-quantity"
      >
        Yeni real stok
      </label>

      <div class="ui-input">

        <input
          id="stock-adjust-quantity"
          class="ui-input__control"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.001"
          value="${escapeHtml(
            String(
              productStock(
                product
              )
            )
          )}"
        >

      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="stock-adjust-note"
      >
        Düzəliş səbəbi
      </label>

      <textarea
        id="stock-adjust-note"
        class="ui-textarea"
        rows="3"
        maxlength="500"
        placeholder="Məs: Fiziki sayım zamanı fərq aşkarlandı"
      ></textarea>

      <span
        id="stock-adjust-note-error"
        class="ui-field__error is-hidden"
      ></span>

    </div>

    <button
      id="stock-adjust-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Stoku düzəlt
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Inventar',

    title:
      'Stok düzəlişi',

    content,

    trigger,

    onOpen:
      () => {
        bindStockAdjustForm(
          content,
          product
        );
      },
  });
}

function bindStockAdjustForm(
  form,
  product
) {
  const quantityInput =
    $(
      '#stock-adjust-quantity',
      form
    );

  const noteInput =
    $(
      '#stock-adjust-note',
      form
    );

  const noteError =
    $(
      '#stock-adjust-note-error',
      form
    );

  const submit =
    $(
      '#stock-adjust-submit',
      form
    );

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const newQuantity =
        number(
          quantityInput
            ?.value,
          -1
        );

      const note =
        normalizeString(
          noteInput
            ?.value
        );

      if (
        newQuantity < 0
      ) {
        notify.warning(
          'Stok mənfi ola bilməz.'
        );

        return;
      }

      if (
        !note
      ) {
        setFieldError(
          noteInput,
          noteError,
          'Stok düzəliş səbəbini yaz.'
        );

        return;
      }

      const confirmed =
        await confirmDialog({
          eyebrow:
            'Inventar',

          title:
            'Stok dəyişdirilsin?',

          message:
            `${productName(
              product
            )}: ${productStock(
              product
            )} → ${newQuantity} ${productStockUnit(
              product
            )}`,

          confirmText:
            'Düzəlt',

          cancelText:
            'Ləğv et',
        });

      if (!confirmed) {
        return;
      }

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Düzəldilir...',
        }
      );

      try {
        const {
          error,
        } =
          await supabase.rpc(
            RPC.adjustStock,
            {
              p_product_id:
                product.id,

              p_new_quantity:
                newQuantity,

              p_note:
                note,
            }
          );

        if (error) {
          throw error;
        }

        closeModal();

        notify.success(
          'Stok düzəlişi qeydə alındı.'
        );

        await Promise.all([
          loadProducts(),
          loadStockMovements(),
          loadHistory({
            limit:
              50,
          }),
        ]);

        renderStock();

        renderAdminProducts();

        renderPosProducts();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] adjust_stock:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Stok düzəlişi alınmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

function openStockProductPicker() {
  const content =
    createElement(
      'div',
      {
        className:
          'compact-list',
      }
    );

  state.products
    .filter(
      product =>
        product.is_active !==
        false
    )
    .forEach(
      product => {
        const button =
          createElement(
            'button',
            {
              className:
                'compact-list-item',

              attrs: {
                type:
                  'button',
              },
            }
          );

        button.innerHTML = `
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
              ${escapeHtml(productStockText(product))}
              ·
              ${escapeHtml(
                money(
                  productPrice(
                    product
                  )
                )
              )}
            </span>

          </span>
        `;

        button.addEventListener(
          'click',
          () => {
            closeModal();

            setTimeout(
              () => {
                openStockAddModal(
                  product
                );
              },
              240
            );
          }
        );

        content.append(
          button
        );
      }
    );

  openModal({
    eyebrow:
      'Anbar',

    title:
      'Məhsul seç',

    content,
  });
}

function bindStockEvents() {
  byId(
    'stock-add-button'
  )?.addEventListener(
    'click',
    async () => {
      if (
        state.products.length ===
        0
      ) {
        await loadProducts();
      }

      if (
        state.products.length ===
        0
      ) {
        notify.warning(
          'Stok əlavə etmək üçün məhsul yoxdur.'
        );

        return;
      }

      openStockProductPicker();
    }
  );

  byId(
    'stock-search'
  )?.addEventListener(
    'input',
    debounce(renderStockProducts, UI_CONFIG.debounceDelay)
  );

  byId(
    'stock-filter'
  )?.addEventListener(
    'change',
    renderStockProducts
  );
}


function quickSaleProducts() {
  const preferred = state.products
    .filter(product => product.is_active !== false)
    .filter(product => productStock(product) > 0)
    .filter(product => productSaleVariants(product, { quickOnly: true }).length > 0);

  if (preferred.length) {
    return preferred;
  }

  return state.products
    .filter(product => product.is_active !== false)
    .filter(product => productStock(product) > 0);
}

function ensureQuickSaleFab() {
  let button = byId('admin-quick-sale-fab');

  if (button) return button;

  button = createElement('button', {
    className: 'admin-quick-sale-fab',
    attrs: {
      id: 'admin-quick-sale-fab',
      type: 'button',
      'aria-label': 'Tez satış aç',
      title: 'Tez satış',
    },
  });

  button.innerHTML = `
    <span class="admin-quick-sale-fab__icon" aria-hidden="true">⚡</span>
    <span class="admin-quick-sale-fab__label">Tez satış</span>
  `;

  button.addEventListener('click', () => {
    void openQuickSaleModal(button);
  });

  document.body.append(button);
  return button;
}

function renderQuickSaleProducts() {
  const root = byId('quick-sale-products-grid');
  if (!root) return;

  clearElement(root);

  const products = quickSaleProducts();

  products.forEach(product => {
    const variants = productSaleVariants(product, { quickOnly: true });
    const image = productImage(product);
    const card = createElement('button', {
      className: 'quick-sale-card',
      attrs: {
        type: 'button',
      },
    });

    card.innerHTML = `
      <span class="quick-sale-card__media">
        ${
          image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}" loading="lazy" decoding="async">`
            : '<span class="product-card__image-fallback">SK</span>'
        }
      </span>

      <span class="quick-sale-card__body">
        <strong>${escapeHtml(productName(product))}</strong>
        <span>
          ${
            variants.length
              ? `${escapeHtml(String(variants.length))} seçim`
              : escapeHtml(money(productPrice(product)))
          }
        </span>
        <small>
          ${escapeHtml(productStockText(product))}
        </small>
      </span>
    `;

    card.addEventListener('click', () => {
      openPosSaleModal(
        product,
        card,
        {
          quickOnly: variants.length > 0,
        }
      );
    });

    root.append(card);
  });

  if (!products.length) {
    root.innerHTML = `
      <div class="ui-empty-state quick-sale-empty">
        <strong>Satış üçün məhsul yoxdur</strong>
        <span>Aktiv məhsul əlavə et və stok daxil et.</span>
      </div>
    `;
  }
}

async function openQuickSaleModal(trigger = null) {
  if (state.products.length === 0) {
    await loadProducts();
  }

  const content = createElement('div', {
    className: 'quick-sale-panel',
  });

  content.innerHTML = `
    <div class="quick-sale-panel__header">
      <div>
        <span class="section-eyebrow">Şəkilli POS</span>
        <strong>Bir toxunuşla məhsulu seç</strong>
        <small>Məhsula toxun, ölçünü və ödənişi seç, sonra satışı təsdiqlə.</small>
      </div>
    </div>

    <div id="quick-sale-products-grid" class="quick-sale-products-grid"></div>
  `;

  openModal({
    eyebrow: 'SKy Fit POS',
    title: 'Tez satış',
    content,
    trigger,
    className: 'app-modal--quick-sale',
    onOpen: () => {
      renderQuickSaleProducts();
    },
  });
}

function bindQuickAction() {
  byId(
    'admin-quick-action-button'
  )?.addEventListener(
    'click',
    event => {
      void openQuickSaleModal(
        event.currentTarget
      );
    }
  );

  ensureQuickSaleFab();
}

function filteredMembers() {
  const search =
    normalizeSearch(
      byId(
        'members-search'
      )?.value
    );

  const role =
    normalizeString(
      byId(
        'members-role-filter'
      )?.value,
      'all'
    );

  const status =
    normalizeString(
      byId(
        'members-status-filter'
      )?.value,
      'all'
    );

  return state.members
    .filter(
      member => {
        if (!search) {
          return true;
        }

        const text =
          [
            member.full_name,
            member.email,
            member.phone,
            member.address,
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
    )
    .filter(
      member => {
        if (
          role ===
          'all'
        ) {
          return true;
        }

        return (
          member.role ===
          role
        );
      }
    )
    .filter(
      member => {
        if (
          status ===
          'active'
        ) {
          return (
            member.is_active !==
            false
          );
        }

        if (
          status ===
          'inactive'
        ) {
          return (
            member.is_active ===
            false
          );
        }

        return true;
      }
    );
}

function memberStatusMeta(
  member
) {
  if (
    member.is_active ===
    false
  ) {
    return {
      label:
        'Deaktiv',

      className:
        'ui-badge ui-badge--danger',
    };
  }

  return {
    label:
      'Aktiv',

    className:
      'ui-badge ui-badge--success',
  };
}

function renderMembers() {
  const root =
    byId(
      'members-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const members =
    filteredMembers();

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>İstifadəçi</th>
        <th>Telefon</th>
        <th>Rol</th>
        <th>Status</th>
        <th>Qeydiyyat</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  members.forEach(
    member => {
      const status =
        memberStatusMeta(
          member
        );

      const row =
        createElement(
          'tr'
        );

      row.innerHTML = `
        <td>

          <div class="admin-user-cell">

            <span class="admin-user-cell__avatar">
              ${escapeHtml(
                getProfileInitials(
                  member
                )
              )}
            </span>

            <span class="admin-user-cell__identity">

              <strong class="admin-table__primary">
                ${escapeHtml(
                  getProfileName(
                    member
                  )
                )}
              </strong>

              <span class="admin-table__secondary">
                ${escapeHtml(
                  member.email ||
                  'E-poçt yoxdur'
                )}
              </span>

            </span>

          </div>

        </td>

        <td>
          ${escapeHtml(
            member.phone ||
            '—'
          )}
        </td>

        <td>
          <span class="${
            member.role ===
              'admin'
              ? 'ui-badge ui-badge--danger'
              : member.role ===
                  'staff'
                ? 'ui-badge ui-badge--warning'
                : 'ui-badge ui-badge--neutral'
          }">
            ${escapeHtml(
              roleLabel(
                member.role
              )
            )}
          </span>
        </td>

        <td>
          <span class="${status.className}">
            ${escapeHtml(
              status.label
            )}
          </span>
        </td>

        <td>
          ${formatDate(
            member.created_at
          )}
        </td>
      `;

      tbody.append(
        row
      );
    }
  );

  root.append(
    table
  );

  if (
    members.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'İstifadəçi tapılmadı.'
      )
    );
  }
}

function bindMemberEvents() {
  byId(
    'members-search'
  )?.addEventListener(
    'input',
    debounce(renderMembers, UI_CONFIG.debounceDelay)
  );

  byId(
    'members-role-filter'
  )?.addEventListener(
    'change',
    renderMembers
  );

  byId(
    'members-status-filter'
  )?.addEventListener(
    'change',
    renderMembers
  );
}

function filteredMemberships() {
  const search =
    normalizeSearch(
      byId(
        'memberships-search'
      )?.value
    );

  const status =
    normalizeString(
      byId(
        'memberships-status-filter'
      )?.value,
      'all'
    );

  return state.memberships
    .filter(
      membership => {
        if (!search) {
          return true;
        }

        const text =
          [
            membership
              .member
              ?.full_name,

            membership
              .member
              ?.email,

            membership
              .member
              ?.phone,

            membership
              .membership_plan
              ?.name,
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
    )
    .filter(
      membership => {
        if (
          status ===
          'all'
        ) {
          return true;
        }

        if (
          status ===
          'active'
        ) {
          return membershipIsActive(
            membership
          );
        }

        return (
          membership.status ===
          status
        );
      }
    );
}

function membershipBadgeClass(
  membership
) {
  if (
    membershipIsActive(
      membership
    )
  ) {
    return (
      'ui-badge ui-badge--success'
    );
  }

  if (
    membership.status ===
    'cancelled'
  ) {
    return (
      'ui-badge ui-badge--danger'
    );
  }

  return (
    'ui-badge ui-badge--warning'
  );
}

function renderMemberships() {
  const root =
    byId(
      'memberships-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const memberships =
    filteredMemberships();

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>Üzv</th>
        <th>Plan</th>
        <th>Qiymət</th>
        <th>Başlanğıc</th>
        <th>Bitmə</th>
        <th>Ödəniş</th>
        <th>Status</th>
        <th>Operator</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  memberships.forEach(
    membership => {
      const row =
        createElement(
          'tr'
        );

      row.innerHTML = `
        <td>

          <strong class="admin-table__primary">
            ${escapeHtml(
              getProfileName(
                membership.member
              )
            )}
          </strong>

          <span class="admin-table__secondary">
            ${escapeHtml(
              membership
                .member
                ?.phone ||
              membership
                .member
                ?.email ||
              '—'
            )}
          </span>

        </td>

        <td>
          ${escapeHtml(
            membership
              .membership_plan
              ?.name ||
            'Üzvlük'
          )}
        </td>

        <td>
          <strong>
            ${escapeHtml(
              money(
                membership.price
              )
            )}
          </strong>
        </td>

        <td>
          ${formatDate(
            membership.start_date
          )}
        </td>

        <td>
          ${formatDate(
            membership.end_date
          )}
        </td>

        <td>
          <span class="${
            paymentStatusClass(
              membership
                .payment_status
            )
          }">
            ${escapeHtml(
              paymentStatusLabel(
                membership
                  .payment_status
              )
            )}
          </span>
        </td>

        <td>
          <span class="${
            membershipBadgeClass(
              membership
            )
          }">
            ${escapeHtml(
              membershipStatusLabel(
                membership
              )
            )}
          </span>
        </td>

        <td>

          <strong class="admin-table__primary">
            ${escapeHtml(
              membership
                .created_by_profile
                ?.full_name ||
              'Sistem'
            )}
          </strong>

          ${
            membership
              .updated_by_profile
              ?.full_name
              ? `
                <span class="admin-table__secondary">
                  Son dəyişiklik:
                  ${escapeHtml(
                    membership
                      .updated_by_profile
                      .full_name
                  )}
                </span>
              `
              : ''
          }

        </td>
      `;

      tbody.append(
        row
      );
    }
  );

  root.append(
    table
  );

  if (
    memberships.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Üzvlük tapılmadı.'
      )
    );
  }
}

function renderMembershipPlans() {
  const root = byId('membership-plans-grid');
  if (!root) return;

  clearElement(root);

  state.membershipPlans.forEach(plan => {
    const card = createElement('article', {
      className: `membership-plan-card${plan.is_daily ? ' membership-plan-card--daily' : ''}`,
    });

    card.innerHTML = `
      <div class="membership-plan-card__top">
        <span class="membership-plan-card__icon" aria-hidden="true">
          ${plan.is_daily ? '1G' : '30G'}
        </span>

        <span class="${plan.is_active ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">
          ${plan.is_active ? 'Aktiv' : 'Deaktiv'}
        </span>
      </div>

      <div class="membership-plan-card__content">
        <span class="membership-plan-card__type">
          ${plan.is_daily ? 'Günlük giriş' : 'Üzvlük planı'}
        </span>
        <strong class="membership-plan-card__title">${escapeHtml(plan.name)}</strong>
        <span class="membership-plan-card__duration">${escapeHtml(String(plan.duration_days))} gün</span>
      </div>

      <div class="membership-plan-card__price">
        <strong>${escapeHtml(money(plan.price))}</strong>
        <span>${plan.is_daily ? '1 giriş üçün' : `${escapeHtml(String(plan.duration_days))} gün üçün`}</span>
      </div>

      <button
        type="button"
        class="ui-button ui-button--glass ui-button--full"
        data-plan-edit="${escapeHtml(plan.id)}"
      >
        <span class="ui-button__label">Planı redaktə et</span>
      </button>
    `;

    root.append(card);
  });

  $$('[data-plan-edit]', root).forEach(button => {
    button.addEventListener('click', () => {
      const plan = state.membershipPlans.find(
        item => String(item.id) === String(button.dataset.planEdit)
      );

      if (plan) openMembershipPlanEditor(plan, button);
    });
  });
}

//
// is_daily semantikasını burada dəyişmirik.
// Bu planın biznes tipidir.
// Admin qiymət, ad, müddət və aktivliyi dəyişə bilər.
//

function openMembershipPlanEditor(
  plan,
  trigger = null
) {
  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'membership-plan-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="membership-plan-name"
      >
        Plan adı
      </label>

      <div class="ui-input">

        <input
          id="membership-plan-name"
          class="ui-input__control"
          type="text"
          maxlength="120"
          value="${escapeHtml(
            plan.name ||
            ''
          )}"
        >

      </div>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-plan-price"
        >
          Qiymət
        </label>

        <div class="ui-input">

          <input
            id="membership-plan-price"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${number(
              plan.price
            )}"
          >

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-plan-duration"
        >
          Müddət
        </label>

        <div class="ui-input">

          <input
            id="membership-plan-duration"
            class="ui-input__control"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            value="${number(
              plan.duration_days
            )}"
          >

        </div>

      </div>

    </div>

    <label class="ui-check">

      <input
        id="membership-plan-active"
        type="checkbox"
        ${
          plan.is_active
            ? 'checked'
            : ''
        }
      >

      <span>
        Plan aktivdir
      </span>

    </label>

    <div class="ui-info-card">

      <span class="ui-info-card__label">
        Plan tipi
      </span>

      <strong>
        ${
          plan.is_daily
            ? 'Günlük giriş'
            : 'Üzvlük'
        }
      </strong>

    </div>

    <button
      id="membership-plan-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Yadda saxla
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Üzvlük planı',

    title:
      plan.name,

    content,

    trigger,

    onOpen:
      () => {
        bindMembershipPlanForm(
          content,
          plan
        );
      },
  });
}

function bindMembershipPlanForm(
  form,
  plan
) {
  const nameInput =
    $(
      '#membership-plan-name',
      form
    );

  const priceInput =
    $(
      '#membership-plan-price',
      form
    );

  const durationInput =
    $(
      '#membership-plan-duration',
      form
    );

  const activeInput =
    $(
      '#membership-plan-active',
      form
    );

  const submit =
    $(
      '#membership-plan-submit',
      form
    );

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const name =
        normalizeString(
          nameInput?.value
        );

      const price =
        number(
          priceInput?.value,
          -1
        );

      const duration =
        number(
          durationInput?.value,
          0
        );

      if (
        name.length < 2
      ) {
        notify.warning(
          'Plan adını düzgün daxil et.'
        );

        return;
      }

      if (
        price < 0
      ) {
        notify.warning(
          'Plan qiyməti düzgün deyil.'
        );

        return;
      }

      if (
        !Number.isInteger(
          duration
        ) ||
        duration < 1
      ) {
        notify.warning(
          'Plan müddəti minimum 1 gün olmalıdır.'
        );

        return;
      }

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Yadda saxlanılır...',
        }
      );

      try {
        const {
          error,
        } =
          await supabase
            .from(
              TABLES.membershipPlans
            )
            .update({
              name,

              price,

              duration_days:
                duration,

              is_active:
                Boolean(
                  activeInput
                    ?.checked
                ),
            })
            .eq(
              'id',
              plan.id
            );

        if (error) {
          throw error;
        }

        closeModal();

        notify.success(
          'Üzvlük planı yeniləndi.'
        );

        await Promise.all([
          loadMembershipPlans(),

          loadHistory({
            limit:
              50,
          }),
        ]);

        renderMembershipPlans();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] Plan update:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Plan yenilənmədi.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

async function openMembershipCreateModal(
  trigger = null
) {
  if (
    state.members.length ===
    0
  ) {
    await loadMembers();
  }

  if (
    state.membershipPlans.length ===
    0
  ) {
    await loadMembershipPlans();
  }

  const plans =
    state.membershipPlans
      .filter(
        plan =>
          plan.is_active &&
          !plan.is_daily
      );

  if (
    plans.length ===
    0
  ) {
    notify.warning(
      'Aktiv üzvlük planı yoxdur.'
    );

    return;
  }

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'membership-create-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="membership-create-member"
      >
        Üzv
      </label>

      <select
        id="membership-create-member"
        class="ui-select"
      >
        <option value="">
          Üzv seç
        </option>

        ${memberOptionsMarkup()}
      </select>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="membership-create-plan"
      >
        Üzvlük planı
      </label>

      <select
        id="membership-create-plan"
        class="ui-select"
      >
        <option value="">
          Plan seç
        </option>

        ${plans
          .map(
            plan => `
              <option value="${escapeHtml(
                plan.id
              )}">
                ${escapeHtml(
                  plan.name
                )}
                —
                ${escapeHtml(
                  money(
                    plan.price
                  )
                )}
                /
                ${escapeHtml(
                  String(
                    plan.duration_days
                  )
                )}
                gün
              </option>
            `
          )
          .join('')}
      </select>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="membership-create-start"
      >
        Başlanğıc tarixi
      </label>

      <div class="ui-input">

        <input
          id="membership-create-start"
          class="ui-input__control"
          type="date"
          value="${todayIso()}"
        >

      </div>

    </div>

    <div class="payment-status-grid">
      <div class="ui-field">
        <label class="ui-field__label" for="membership-create-payment">
          Ödəniş vəziyyəti
        </label>
        <select id="membership-create-payment" class="ui-select">
          <option value="paid">Ödənilib</option>
          <option value="debt">Borc yaz</option>
        </select>
      </div>

      <div class="ui-field" id="membership-payment-method-field">
        <label class="ui-field__label" for="membership-payment-method">
          Ödəniş üsulu
        </label>
        <select id="membership-payment-method" class="ui-select">
          ${paymentMethodOptionsMarkup()}
        </select>
      </div>
    </div>

    ${paymentSplitMarkup('membership')}

    <div
      id="membership-create-preview"
      class="pos-confirm__summary"
    ></div>

    <button
      id="membership-create-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Üzvlük yarat
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Üzvlük',

    title:
      'Yeni üzvlük',

    content,

    trigger,

    onOpen:
      () => {
        bindMembershipCreateForm(
          content,
          plans
        );
      },
  });
}

function bindMembershipCreateForm(
  form,
  plans
) {
  const memberInput =
    $(
      '#membership-create-member',
      form
    );

  const planInput =
    $(
      '#membership-create-plan',
      form
    );

  const startInput =
    $(
      '#membership-create-start',
      form
    );

  const paymentInput =
    $(
      '#membership-create-payment',
      form
    );

  const paymentMethodInput = $('#membership-payment-method', form);
  const paymentMethodField = $('#membership-payment-method-field', form);
  const mixedFields = $('#membership-mixed-fields', form);

  const preview =
    $(
      '#membership-create-preview',
      form
    );

  const submit =
    $(
      '#membership-create-submit',
      form
    );

  function selectedPlan() {
    return plans.find(
      plan =>
        String(plan.id) ===
        String(
          planInput?.value
        )
    );
  }

  function renderPreview() {
    const plan =
      selectedPlan();

    if (
      !preview
    ) {
      return;
    }

    if (!plan) {
      preview.innerHTML =
        '';

      return;
    }

    const start =
      normalizeString(
        startInput?.value
      );

    const startDate =
      start
        ? new Date(
            `${start}T12:00:00`
          )
        : null;

    let endText =
      '—';

    if (
      startDate &&
      !Number.isNaN(
        startDate.getTime()
      )
    ) {
      const endDate =
        new Date(
          startDate
        );

      endDate.setDate(
        endDate.getDate() +
        number(
          plan.duration_days
        ) -
        1
      );

      endText =
        formatDate(
          endDate
        );
    }

    preview.innerHTML = `
      <div class="pos-confirm__row">

        <span>Plan</span>

        <strong>
          ${escapeHtml(
            plan.name
          )}
        </strong>

      </div>

      <div class="pos-confirm__row">

        <span>Müddət</span>

        <strong>
          ${escapeHtml(
            String(
              plan.duration_days
            )
          )}
          gün
        </strong>

      </div>

      <div class="pos-confirm__row">

        <span>Bitmə tarixi</span>

        <strong>
          ${escapeHtml(
            endText
          )}
        </strong>

      </div>

      <div class="pos-confirm__row pos-confirm__row--total">

        <span>Məbləğ</span>

        <strong>
          ${escapeHtml(
            money(
              plan.price
            )
          )}
        </strong>

      </div>
    `;
  }

  planInput
    ?.addEventListener(
      'change',
      renderPreview
    );

  startInput
    ?.addEventListener(
      'change',
      renderPreview
    );

  const syncMembershipPayment = () => {
    const debt = paymentInput?.value === 'debt';
    debt ? hideElement(paymentMethodField) : showElement(paymentMethodField);
    if (debt) {
      hideElement(mixedFields);
    } else if (paymentMethodInput?.value === 'mixed') {
      showElement(mixedFields);
    } else {
      hideElement(mixedFields);
    }
  };

  paymentInput?.addEventListener('change', syncMembershipPayment);
  paymentMethodInput?.addEventListener('change', syncMembershipPayment);

  renderPreview();
  syncMembershipPayment();

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const memberId =
        normalizeString(
          memberInput
            ?.value
        );

      const planId =
        normalizeString(
          planInput
            ?.value
        );

      const startDate =
        normalizeString(
          startInput
            ?.value
        );

      const paymentStatus =
        normalizeString(
          paymentInput
            ?.value,
          'paid'
        );

      const plan = selectedPlan();
      const payment = paymentStatus === 'debt'
        ? { cashAmount: 0, cardAmount: 0, valid: true }
        : readPaymentSplit(form, 'membership', number(plan?.price));

      if (!memberId) {
        notify.warning(
          'Üzv seç.'
        );

        return;
      }

      if (!planId) {
        notify.warning(
          'Üzvlük planı seç.'
        );

        return;
      }

      if (!startDate) {
        notify.warning(
          'Başlanğıc tarixini seç.'
        );

        return;
      }

      if (!payment.valid) {
        notify.warning(`Nağd + Kart cəmi ${money(number(plan?.price))} olmalıdır.`);
        return;
      }

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Yaradılır...',
        }
      );

      try {
        const {
          data:
            membershipId,

          error,
        } =
          await supabase.rpc(
            RPC.createMembershipV2,
            {
              p_member_id: memberId,
              p_plan_id: planId,
              p_start_date: startDate,
              p_payment_status: paymentStatus,
              p_cash_amount: payment.cashAmount,
              p_card_amount: payment.cardAmount,
            }
          );

        if (error) {
          throw error;
        }

        closeModal();

        notify.success(
          paymentStatus ===
            'debt'
            ? 'Üzvlük yaradıldı və borc hesaba yazıldı.'
            : 'Üzvlük yaradıldı.'
        );

        await Promise.all([
          loadMemberships(),
          loadDebts(),
          loadDebtTransactions(),
          loadLedger(),
          loadCashRegisterEntries(),
          loadHistory({
            limit:
              50,
          }),
        ]);

        renderMemberships();

        renderDashboard();

        window.dispatchEvent(
          new CustomEvent(
            ADMIN_OPERATION_EVENT,
            {
              detail: {
                type:
                  'membership',

                membershipId,

                memberId,
              },
            }
          )
        );
      } catch (error) {
        console.error(
          '[SKy Fit Admin] create_membership:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Üzvlük yaradılmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

function bindMembershipEvents() {
  byId(
    'membership-create-button'
  )?.addEventListener(
    'click',
    event => {
      openMembershipCreateModal(
        event.currentTarget
      );
    }
  );

  byId(
    'memberships-search'
  )?.addEventListener(
    'input',
    debounce(renderMemberships, UI_CONFIG.debounceDelay)
  );

  byId(
    'memberships-status-filter'
  )?.addEventListener(
    'change',
    renderMemberships
  );
}

function filteredAttendance() {
  const search =
    normalizeSearch(
      byId(
        'attendance-search'
      )?.value
    );

  const type =
    normalizeString(
      byId(
        'attendance-type-filter'
      )?.value,
      'all'
    );

  return state.attendance
    .filter(
      attendance => {
        if (!search) {
          return true;
        }

        const text =
          [
            attendance
              .member
              ?.full_name,

            attendance
              .member
              ?.phone,

            attendance
              .operator
              ?.full_name,
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
    )
    .filter(
      attendance => {
        if (
          type ===
          'all'
        ) {
          return true;
        }

        return (
          attendance
            .attendance_type ===
          type
        );
      }
    );
}

function renderAttendanceAdmin() {
  const root =
    byId(
      'attendance-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const items =
    filteredAttendance();

  const todayCount =
    state.attendance
      .filter(
        item =>
          isToday(
            attendanceDate(
              item
            )
          )
      )
      .length;

  setText(
    byId(
      'attendance-today-count'
    ),
    todayCount
  );

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>Üzv</th>
        <th>Giriş növü</th>
        <th>Məbləğ</th>
        <th>Operator</th>
        <th>Tarix</th>
        <th>Saat</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  items.forEach(
    attendance => {
      const row =
        createElement(
          'tr'
        );

      row.innerHTML = `
        <td>

          <strong class="admin-table__primary">
            ${escapeHtml(
              getProfileName(
                attendance.member
              )
            )}
          </strong>

          <span class="admin-table__secondary">
            ${escapeHtml(
              attendance
                .member
                ?.phone ||
              '—'
            )}
          </span>

        </td>

        <td>

          <span class="${
            attendance
              .attendance_type ===
              'daily'
              ? 'ui-badge ui-badge--warning'
              : 'ui-badge ui-badge--success'
          }">
            ${escapeHtml(
              attendanceTypeLabel(
                attendance
              )
            )}
          </span>

        </td>

        <td>
          ${
            number(
              attendance.amount
            ) > 0
              ? `
                <strong class="finance-amount finance-amount--income">
                  ${escapeHtml(
                    money(
                      attendance.amount
                    )
                  )}
                </strong>
              `
              : '—'
          }
        </td>

        <td>
          ${escapeHtml(
            attendance
              .operator
              ?.full_name ||
            'Sistem'
          )}
        </td>

        <td>
          ${formatDate(
            attendanceDate(
              attendance
            )
          )}
        </td>

        <td>
          ${formatTime(
            attendanceDate(
              attendance
            )
          )}
        </td>
      `;

      tbody.append(
        row
      );
    }
  );

  root.append(
    table
  );

  if (
    items.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Giriş qeydiyyatı tapılmadı.'
      )
    );
  }
}

async function openAttendanceModal(
  trigger = null
) {
  if (
    state.members.length ===
    0
  ) {
    await loadMembers();
  }

  if (
    state.membershipPlans.length ===
    0
  ) {
    await loadMembershipPlans();
  }

  const dailyPlan =
    state.membershipPlans
      .find(
        plan =>
          plan.is_daily &&
          plan.is_active
      );

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'attendance-create-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="attendance-create-member"
      >
        Üzv
      </label>

      <select
        id="attendance-create-member"
        class="ui-select"
      >
        <option value="">
          Üzv seç
        </option>

        ${memberOptionsMarkup()}
      </select>

    </div>

    <div id="attendance-payment-panel" class="attendance-payment-panel">
      <div class="ui-field">
        <label class="ui-field__label" for="attendance-payment-method">
          Günlük giriş ödənişi
        </label>
        <select id="attendance-payment-method" class="ui-select">
          ${paymentMethodOptionsMarkup()}
        </select>
      </div>

      ${paymentSplitMarkup('attendance')}
    </div>

    <div class="ui-info-card">

      <span class="ui-info-card__label">
        Sistem avtomatik yoxlayacaq
      </span>

      <strong>
        Aktiv üzvlük varsa ödənişsiz giriş
      </strong>

      <span>
        Aktiv üzvlük yoxdursa günlük giriş
        ${
          dailyPlan
            ? ` — ${escapeHtml(
                money(
                  dailyPlan.price
                )
              )}`
            : ''
        }
      </span>

    </div>

    <button
      id="attendance-create-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Girişi qeyd et
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Giriş',

    title:
      'Zala giriş qeydiyyatı',

    content,

    trigger,

    onOpen:
      () => {
        bindAttendanceCreateForm(
          content
        );
      },
  });
}

function bindAttendanceCreateForm(form) {
  const memberInput = $('#attendance-create-member', form);
  const paymentInput = $('#attendance-payment-method', form);
  const paymentPanel = $('#attendance-payment-panel', form);
  const mixedFields = $('#attendance-mixed-fields', form);
  const submit = $('#attendance-create-submit', form);

  const dailyPlan = state.membershipPlans.find(
    plan => plan.is_daily && plan.is_active
  );

  function selectedMemberHasActiveMembership() {
    const memberId = normalizeString(memberInput?.value);
    if (!memberId) return false;

    return state.memberships.some(item =>
      String(item.member_id) === String(memberId) &&
      membershipIsActive(item)
    );
  }

  function syncPaymentPanel() {
    const hasMembership = selectedMemberHasActiveMembership();

    if (hasMembership) {
      hideElement(paymentPanel);
      hideElement(mixedFields);
      return;
    }

    showElement(paymentPanel);
    paymentInput?.value === 'mixed'
      ? showElement(mixedFields)
      : hideElement(mixedFields);
  }

  memberInput?.addEventListener('change', syncPaymentPanel);
  paymentInput?.addEventListener('change', syncPaymentPanel);
  syncPaymentPanel();

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const memberId = normalizeString(memberInput?.value);
    if (!memberId) {
      notify.warning('Üzv seç.');
      return;
    }

    const hasMembership = selectedMemberHasActiveMembership();
    const dailyPrice = hasMembership ? 0 : number(dailyPlan?.price);

    if (!hasMembership && !dailyPlan) {
      notify.warning('Aktiv günlük giriş planı tapılmadı.');
      return;
    }

    const payment = hasMembership
      ? { cashAmount: 0, cardAmount: 0, valid: true }
      : readPaymentSplit(form, 'attendance', dailyPrice);

    if (!payment.valid) {
      notify.warning(`Nağd + Kart cəmi ${money(dailyPrice)} olmalıdır.`);
      return;
    }

    setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

    try {
      const { data: attendanceId, error } = await supabase.rpc(
        RPC.recordAttendanceV2,
        {
          p_member_id: memberId,
          p_cash_amount: payment.cashAmount,
          p_card_amount: payment.cardAmount,
        }
      );

      if (error) throw error;

      closeModal();
      notify.success(
        hasMembership
          ? 'Aktiv üzvlük ilə giriş qeydə alındı.'
          : `Günlük giriş ${money(dailyPrice)} qeydə alındı.`
      );

      await Promise.all([
        loadAttendance(),
        loadLedger(),
        loadCashRegisterEntries(),
        loadHistory({ limit: 50 }),
      ]);

      renderAttendanceAdmin();
      renderDashboard();

      window.dispatchEvent(
        new CustomEvent(ADMIN_OPERATION_EVENT, {
          detail: { type: 'attendance', attendanceId, memberId },
        })
      );
    } catch (error) {
      console.error('[SKy Fit Admin] record_attendance_v2:', error);
      notify.error(getErrorMessage(error, 'Giriş qeydiyyatı tamamlanmadı.'));
    } finally {
      setButtonLoading(submit, false);
    }
  });
}

function bindAttendanceAdminEvents() {
  byId(
    'attendance-create-button'
  )?.addEventListener(
    'click',
    event => {
      openAttendanceModal(
        event.currentTarget
      );
    }
  );

  byId(
    'attendance-search'
  )?.addEventListener(
    'input',
    debounce(renderAttendanceAdmin, UI_CONFIG.debounceDelay)
  );

  byId(
    'attendance-type-filter'
  )?.addEventListener(
    'change',
    renderAttendanceAdmin
  );
}

function filteredDebts() {
  const search =
    normalizeSearch(
      byId(
        'debt-search'
      )?.value
    );

  const status =
    normalizeString(
      byId(
        'debt-status-filter'
      )?.value,
      'open'
    );

  return state.debts
    .filter(
      account => {
        if (!search) {
          return true;
        }

        const text =
          [
            account
              .member
              ?.full_name,

            account
              .member
              ?.phone,

            account
              .member
              ?.email,
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
    )
    .filter(
      account => {
        if (
          status ===
          'all'
        ) {
          return true;
        }

        if (
          status ===
          'closed'
        ) {
          return (
            debtBalance(
              account
            ) <= 0
          );
        }

        return (
          debtBalance(
            account
          ) > 0
        );
      }
    );
}

function renderDebtTotals(
  accounts
) {
  const open =
    accounts.filter(
      account =>
        debtBalance(
          account
        ) > 0
    );

  const total =
    open.reduce(
      (
        sum,
        account
      ) =>
        sum +
        debtBalance(
          account
        ),
      0
    );

  setText(
    byId(
      'debt-total-amount'
    ),
    money(total)
  );

  setText(
    byId(
      'debt-open-count'
    ),
    open.length
  );
}

function renderDebts() {
  const root =
    byId(
      'debt-accounts-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const accounts =
    filteredDebts();

  renderDebtTotals(
    state.debts
  );

  const table =
    createElement(
      'table',
      {
        className:
          'admin-table',
      }
    );

  table.innerHTML = `
    <thead>
      <tr>
        <th>Üzv</th>
        <th>Borc</th>
        <th>Son dəyişiklik</th>
        <th>Status</th>
        <th>Əməliyyat</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;

  const tbody =
    $(
      'tbody',
      table
    );

  accounts.forEach(
    account => {
      const balance =
        debtBalance(
          account
        );

      const row =
        createElement(
          'tr'
        );

      row.innerHTML = `
        <td>

          <strong class="admin-table__primary">
            ${escapeHtml(
              getProfileName(
                account.member
              )
            )}
          </strong>

          <span class="admin-table__secondary">
            ${escapeHtml(
              account
                .member
                ?.phone ||
              account
                .member
                ?.email ||
              '—'
            )}
          </span>

        </td>

        <td>
          <strong class="${
            balance > 0
              ? 'finance-amount finance-amount--expense'
              : 'finance-amount'
          }">
            ${escapeHtml(
              money(balance)
            )}
          </strong>
        </td>

        <td>
          ${formatDateTime(
            account.updated_at
          )}
        </td>

        <td>
          <span class="${
            balance > 0
              ? 'ui-badge ui-badge--danger'
              : 'ui-badge ui-badge--success'
          }">
            ${
              balance > 0
                ? 'Açıq borc'
                : 'Ödənilib'
            }
          </span>
        </td>

        <td>
          ${
            balance > 0
              ? `
                <button
                  type="button"
                  class="ui-button ui-button--primary"
                  data-debt-pay="${escapeHtml(
                    account.member_id
                  )}"
                >
                  <span class="ui-button__label">
                    Ödəniş
                  </span>
                </button>
              `
              : '—'
          }
        </td>
      `;

      tbody.append(
        row
      );
    }
  );

  root.append(
    table
  );

  $$(
    '[data-debt-pay]',
    root
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          const account =
            state.debts.find(
              item =>
                String(
                  item.member_id
                ) ===
                String(
                  button.dataset
                    .debtPay
                )
            );

          if (account) {
            openDebtPaymentModal(
              account,
              button
            );
          }
        }
      );
    }
  );

  renderDebtTransactions();
}

function debtTransactionLabel(
  transaction
) {
  switch (
    normalizeString(
      transaction
        ?.transaction_type
    )
  ) {
    case 'payment':
      return 'Ödəniş';

    case 'debt':
      return 'Yeni borc';

    case 'adjustment':
      return 'Düzəliş';

    default:
      return normalizeString(
        transaction
          ?.transaction_type,
        'Əməliyyat'
      );
  }
}

function renderDebtTransactions() {
  const root =
    byId(
      'debt-transactions-list'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  state.debtTransactions
    .slice(
      0,
      100
    )
    .forEach(
      transaction => {
        const member =
          state.members.find(
            item =>
              String(
                item.id
              ) ===
              String(
                transaction
                  .member_id
              )
          );

        const payment =
          transaction
            .transaction_type ===
          'payment';

        const item =
          createElement(
            'article',
            {
              className:
                'operation-item',
            }
          );

        item.innerHTML = `
          <span class="operation-item__icon">
            ${payment
              ? '↓'
              : '↑'}
          </span>

          <span class="operation-item__content">

            <strong class="operation-item__title">
              ${escapeHtml(
                debtTransactionLabel(
                  transaction
                )
              )}
              ·
              ${escapeHtml(
                getProfileName(
                  member
                )
              )}
            </strong>

            <span class="operation-item__meta">
              ${escapeHtml(
                transaction.note ||
                paymentMethodLabel(
                  transaction
                    .payment_method
                )
              )}
            </span>

          </span>

          <span class="operation-item__side">

            <strong class="${
              payment
                ? 'finance-amount finance-amount--income'
                : 'finance-amount finance-amount--expense'
            }">
              ${escapeHtml(
                money(
                  transaction.amount
                )
              )}
            </strong>

            <span>
              ${formatDateTime(
                transaction.created_at
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

//
// debt_accounts PK = member_id.

function openDebtPaymentModal(
  account,
  trigger = null
) {
  const balance =
    debtBalance(
      account
    );

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'debt-payment-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="pos-confirm__summary">

      <div class="pos-confirm__row">

        <span>Üzv</span>

        <strong>
          ${escapeHtml(
            getProfileName(
              account.member
            )
          )}
        </strong>

      </div>

      <div class="pos-confirm__row pos-confirm__row--total">

        <span>Cari borc</span>

        <strong class="finance-amount finance-amount--expense">
          ${escapeHtml(
            money(balance)
          )}
        </strong>

      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="debt-payment-amount"
      >
        Ödəniş məbləği
      </label>

      <div class="ui-input">

        <input
          id="debt-payment-amount"
          class="ui-input__control"
          type="number"
          inputmode="decimal"
          min="0.01"
          max="${balance}"
          step="0.01"
          placeholder="0.00"
        >

      </div>

    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="debt-payment-method">
        Ödəniş üsulu
      </label>
      <select id="debt-payment-method" class="ui-select">
        ${paymentMethodOptionsMarkup()}
      </select>
    </div>

    ${paymentSplitMarkup('debt')}

    <button
      id="debt-payment-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Ödənişi qəbul et
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Borc',

    title:
      'Borc ödənişi',

    content,

    trigger,

    onOpen:
      () => {
        bindDebtPaymentForm(
          content,
          account
        );
      },
  });
}

//
// Real RPC:
//
// pay_debt(
//   p_member_id,
//   p_amount,
//   p_method
// )

function bindDebtPaymentForm(
  form,
  account
) {
  const amountInput =
    $(
      '#debt-payment-amount',
      form
    );

  const methodInput =
    $(
      '#debt-payment-method',
      form
    );

  const submit =
    $(
      '#debt-payment-submit',
      form
    );

  bindPaymentSplit(form, 'debt');

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const amount =
        number(
          amountInput
            ?.value
        );

      const payment = readPaymentSplit(form, 'debt', amount);

      const balance =
        debtBalance(
          account
        );

      if (
        amount <= 0 ||
        amount > balance
      ) {
        notify.warning(
          'Ödəniş məbləği düzgün deyil.'
        );

        return;
      }

      if (!payment.valid) {
        notify.warning(`Nağd + Kart cəmi ${money(amount)} olmalıdır.`);
        return;
      }

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Qəbul edilir...',
        }
      );

      try {
        const {
          error,
        } =
          await supabase.rpc(
            RPC.payDebtV2,
            {
              p_member_id: account.member_id,
              p_amount: amount,
              p_cash_amount: payment.cashAmount,
              p_card_amount: payment.cardAmount,
            }
          );

        if (error) {
          throw error;
        }

        closeModal();

        notify.success(
          'Borc ödənişi qeydə alındı.'
        );

        await Promise.all([
          loadDebts(),
          loadDebtTransactions(),
          loadLedger(),
          loadCashRegisterEntries(),
          loadHistory({
            limit:
              50,
          }),
        ]);

        renderDebts();

        renderDashboard();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] pay_debt:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Borc ödənişi tamamlanmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

function bindDebtEvents() {
  byId(
    'debt-search'
  )?.addEventListener(
    'input',
    debounce(renderDebts, UI_CONFIG.debounceDelay)
  );

  byId(
    'debt-status-filter'
  )?.addEventListener(
    'change',
    renderDebts
  );
}

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

function calculateFinanceTotals(
  entries
) {
  const income =
    entries
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
    entries
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

  return {
    income,

    expense,

    balance:
      income -
      expense,
  };
}

function renderFinanceKpis(totals, entries) {
  const income = byId('finance-income');
  const expense = byId('finance-expense');
  const balance = byId('finance-balance');
  const cash = byId('cash-register-balance');
  const card = byId('finance-card-turnover');

  setText(income, money(totals.income));
  setText(expense, money(totals.expense));
  setText(balance, money(totals.balance));
  setText(cash, money(state.cashRegisterBalance));

  const cardTurnover = entries.reduce(
    (sum, entry) => sum + number(entry.card_amount),
    0
  );
  setText(card, money(cardTurnover));

  income?.classList.add('finance-value', 'finance-value--income');
  expense?.classList.add('finance-value', 'finance-value--expense');
  cash?.classList.add('finance-value');
  card?.classList.add('finance-value');

  balance?.classList.remove(
    'finance-value--income',
    'finance-value--expense',
    'finance-value--neutral'
  );
  balance?.classList.add('finance-value');

  if (totals.balance > 0) {
    balance?.classList.add('finance-value--income');
  } else if (totals.balance < 0) {
    balance?.classList.add('finance-value--expense');
  } else {
    balance?.classList.add('finance-value--neutral');
  }
}

function renderCashRegister() {
  const root = byId('cash-register-list');
  if (!root) return;

  clearElement(root);

  const table = createElement('table', {
    className: 'admin-table cash-register-table',
  });

  table.innerHTML = `
    <thead>
      <tr>
        <th>Tarix</th>
        <th>Hərəkət</th>
        <th>Kateqoriya</th>
        <th>Açıqlama</th>
        <th>Məbləğ</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = $('tbody', table);

  state.cashRegisterEntries.forEach(entry => {
    const incoming = entry.direction === 'in';
    const row = createElement('tr');

    row.innerHTML = `
      <td>
        <strong class="admin-table__primary">${formatDate(entry.entry_date)}</strong>
        <span class="admin-table__secondary">${formatTime(entry.created_at)}</span>
      </td>
      <td>
        <span class="${incoming ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">
          ${incoming ? 'Kassaya daxil' : 'Kassadan çıxış'}
        </span>
      </td>
      <td>${escapeHtml(entry.category || '—')}</td>
      <td>${escapeHtml(entry.description || '—')}</td>
      <td>
        <strong class="${incoming ? 'finance-amount finance-amount--income' : 'finance-amount finance-amount--expense'}">
          ${incoming ? '+' : '−'} ${escapeHtml(money(entry.amount))}
        </strong>
      </td>
    `;

    tbody.append(row);
  });

  root.append(table);

  if (!state.cashRegisterEntries.length) {
    root.append(
      createDashboardEmpty(
        'Kassa kitabı yenidir. “Kassa qalığını düzəlt” ilə hazır fiziki nağd qalığı bir dəfə qeyd et.'
      )
    );
  }
}

function renderFinance() {
  const root = byId('finance-ledger-list');
  if (!root) return;

  const entries = filteredLedger();
  const totals = calculateFinanceTotals(entries);

  renderFinanceKpis(totals, entries);
  renderCashRegister();
  clearElement(root);

  const table = createElement('table', {
    className: 'admin-table finance-table',
  });

  table.innerHTML = `
    <thead>
      <tr>
        <th>Tarix</th>
        <th>Növ</th>
        <th>Kateqoriya</th>
        <th>Açıqlama</th>
        <th>Ödəniş</th>
        <th>Mənbə</th>
        <th>Məbləğ</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = $('tbody', table);

  entries.forEach(entry => {
    const type = ledgerType(entry);
    const row = createElement('tr');

    row.classList.add(
      type === 'income' ? 'finance-row--income' : 'finance-row--expense'
    );

    row.innerHTML = `
      <td>
        <strong class="admin-table__primary">${formatDate(entry.entry_date)}</strong>
        <span class="admin-table__secondary">${entry.created_at ? formatTime(entry.created_at) : ''}</span>
      </td>
      <td>
        <span class="${type === 'income' ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger'}">
          ${type === 'income' ? 'Mədaxil' : 'Məxaric'}
        </span>
      </td>
      <td>${escapeHtml(entry.category || '—')}</td>
      <td>${escapeHtml(entry.description || '—')}</td>
      <td>
        <span class="ui-badge ui-badge--neutral">
          ${escapeHtml(paymentMethodLabel(entry.payment_method))}
        </span>
      </td>
      <td>
        <span class="ui-badge ui-badge--neutral">
          ${escapeHtml(financeReferenceLabel(entry.reference_type))}
        </span>
      </td>
      <td>
        <strong class="${type === 'income' ? 'finance-amount finance-amount--income' : 'finance-amount finance-amount--expense'}">
          ${type === 'income' ? '+' : '−'} ${escapeHtml(money(ledgerAmount(entry)))}
        </strong>
      </td>
    `;

    tbody.append(row);
  });

  root.append(table);

  if (!entries.length) {
    root.append(
      createDashboardEmpty('Seçilmiş filtrə uyğun maliyyə əməliyyatı yoxdur.')
    );
  }
}

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

function expenseCategoryOptionsMarkup() {
  const groups = new Map();

  state.expenseCategories.forEach(item => {
    const group = normalizeString(item.category_group, 'Digər');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(item);
  });

  return Array.from(groups.entries())
    .map(([group, items]) => `
      <optgroup label="${escapeHtml(group)}">
        ${items.map(item => `
          <option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>
        `).join('')}
      </optgroup>
    `)
    .join('');
}

function incomeCategoryOptionsMarkup() {
  return state.incomeCategories
    .map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    .join('');
}

function openIncomeModal(trigger = null) {
  const content = createElement('form', {
    className: 'modal-form',
    attrs: { id: 'income-create-form', novalidate: '' },
  });

  content.innerHTML = `
    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="income-category">Mədaxil kateqoriyası</label>
        <select id="income-category" class="ui-select">
          ${incomeCategoryOptionsMarkup()}
        </select>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="income-date">Tarix</label>
        <input id="income-date" class="ui-date-input" type="date" value="${todayIso()}">
      </div>
    </div>

    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="income-amount">Məbləğ</label>
        <div class="ui-input">
          <input id="income-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="income-payment-method">Ödəniş üsulu</label>
        <select id="income-payment-method" class="ui-select">
          <option value="cash">Nağd</option>
          <option value="card">Kart</option>
        </select>
      </div>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="income-description">Açıqlama / qeyd</label>
      <textarea id="income-description" class="ui-textarea" rows="3" maxlength="500" placeholder="Məs: Məşqçi aylıq zal ödənişi"></textarea>
    </div>

    <div class="ui-info-card">
      <span class="ui-info-card__icon">i</span>
      <span>
        <strong>Adi satış, üzvlük və günlük giriş burada təkrar yazılmır</strong>
        <small>Onlar avtomatik mədaxil yaradır. Bu forma yalnız personal məşq, məşqçi ödənişi, sponsorluq və digər əlavə gəlirlər üçündür.</small>
      </span>
    </div>

    <button id="income-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
      <span class="ui-button__label">Mədaxili qeydə al</span>
      <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
    </button>
  `;

  openModal({
    eyebrow: 'Mədaxil',
    title: 'Əlavə gəlir qeydə al',
    content,
    trigger,
    onOpen: () => {
      const submit = $('#income-submit', content);

      content.addEventListener('submit', async event => {
        event.preventDefault();

        const category = normalizeString($('#income-category', content)?.value);
        const amount = number($('#income-amount', content)?.value);
        const paymentMethod = normalizeString($('#income-payment-method', content)?.value, 'cash');
        const entryDate = normalizeString($('#income-date', content)?.value, todayIso());
        const description = normalizeString($('#income-description', content)?.value);

        if (!category || amount <= 0) {
          notify.warning('Kateqoriya və düzgün məbləğ daxil et.');
          return;
        }

        setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

        try {
          const { error } = await supabase.rpc(RPC.recordIncomeV1, {
            p_category: category,
            p_description: description || null,
            p_amount: amount,
            p_payment_method: paymentMethod,
            p_entry_date: entryDate,
          });

          if (error) throw error;

          closeModal();
          notify.success('Mədaxil qeydə alındı.');
          await Promise.all([
            loadLedger(),
            loadCashRegisterEntries(),
            loadHistory({ limit: 50 }),
          ]);
          renderFinance();
          renderDashboard();
        } catch (error) {
          console.error('[SKy Fit Kassa] Mədaxil:', error);
          notify.error(getErrorMessage(error, 'Mədaxil qeydə alınmadı.'));
        } finally {
          setButtonLoading(submit, false);
        }
      });
    },
  });
}

function openExpenseModal(trigger = null) {
  const content = createElement('form', {
    className: 'modal-form',
    attrs: { id: 'expense-create-form', novalidate: '' },
  });

  content.innerHTML = `
    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="expense-category">Xərc kateqoriyası</label>
        <select id="expense-category" class="ui-select">
          ${expenseCategoryOptionsMarkup()}
        </select>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="expense-date">Tarix</label>
        <input id="expense-date" class="ui-date-input" type="date" value="${todayIso()}">
      </div>
    </div>

    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="expense-amount">Məbləğ</label>
        <div class="ui-input">
          <input id="expense-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="expense-payment-method">Ödəniş üsulu</label>
        <select id="expense-payment-method" class="ui-select">
          <option value="cash">Nağd</option>
          <option value="card">Kart</option>
        </select>
      </div>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="expense-description">Açıqlama / qeyd</label>
      <textarea id="expense-description" class="ui-textarea" rows="3" maxlength="500" placeholder="Məs: Avqust ayı elektrik ödənişi"></textarea>
    </div>

    <div class="ui-info-card">
      <span class="ui-info-card__icon">i</span>
      <span>
        <strong>Nağd xərc kassadan avtomatik çıxacaq</strong>
        <small>Kartla ödənən xərc məxaricə düşür, amma fiziki KASSA qalığını azaltmır.</small>
      </span>
    </div>

    <button id="expense-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
      <span class="ui-button__label">Xərci qeydə al</span>
      <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
    </button>
  `;

  openModal({
    eyebrow: 'Məxaric',
    title: 'Zal xərci əlavə et',
    content,
    trigger,
    onOpen: () => {
      const submit = $('#expense-submit', content);

      content.addEventListener('submit', async event => {
        event.preventDefault();

        const category = normalizeString($('#expense-category', content)?.value);
        const amount = number($('#expense-amount', content)?.value);
        const paymentMethod = normalizeString($('#expense-payment-method', content)?.value, 'cash');
        const entryDate = normalizeString($('#expense-date', content)?.value, todayIso());
        const description = normalizeString($('#expense-description', content)?.value);

        if (!category || amount <= 0) {
          notify.warning('Kateqoriya və düzgün məbləğ daxil et.');
          return;
        }

        setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

        try {
          const { error } = await supabase.rpc(RPC.recordExpenseV2, {
            p_category: category,
            p_description: description || null,
            p_amount: amount,
            p_payment_method: paymentMethod,
            p_entry_date: entryDate,
          });

          if (error) throw error;

          closeModal();
          notify.success('Xərc qeydə alındı.');

          await Promise.all([
            loadLedger(),
            loadCashRegisterEntries(),
            loadHistory({ limit: 50 }),
          ]);

          renderFinance();
          renderDashboard();
        } catch (error) {
          console.error('[SKy Fit Kassa] Xərc:', error);
          notify.error(getErrorMessage(error, 'Xərc qeydə alınmadı.'));
        } finally {
          setButtonLoading(submit, false);
        }
      });
    },
  });
}

function openCashBalanceModal(trigger = null) {
  const content = createElement('form', {
    className: 'modal-form',
    attrs: { id: 'cash-balance-form', novalidate: '' },
  });

  content.innerHTML = `
    <div class="pos-confirm__summary">
      <div class="pos-confirm__row pos-confirm__row--total">
        <span>Sistemdə cari KASSA</span>
        <strong>${escapeHtml(money(state.cashRegisterBalance))}</strong>
      </div>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="cash-target-balance">Fiziki kassada hazırda neçə AZN var?</label>
      <div class="ui-input">
        <input id="cash-target-balance" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.01" value="${number(state.cashRegisterBalance).toFixed(2)}">
      </div>
      <span class="ui-field__hint">Sistem yalnız fərqi Kassa düzəlişi kimi tarixçəyə yazacaq.</span>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="cash-balance-note">Səbəb</label>
      <textarea id="cash-balance-note" class="ui-textarea" rows="3" maxlength="300" placeholder="Məs: İlkin kassa qalığı / fiziki sayım"></textarea>
    </div>

    <button id="cash-balance-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
      <span class="ui-button__label">Kassa qalığını təsdiqlə</span>
      <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
    </button>
  `;

  openModal({
    eyebrow: 'KASSA',
    title: 'Kassa qalığını düzəlt',
    content,
    trigger,
    onOpen: () => {
      const submit = $('#cash-balance-submit', content);

      content.addEventListener('submit', async event => {
        event.preventDefault();

        const target = number($('#cash-target-balance', content)?.value);
        const note = normalizeString($('#cash-balance-note', content)?.value);

        if (target < 0 || !note) {
          notify.warning('Fiziki kassa qalığını və düzəliş səbəbini yaz.');
          return;
        }

        setButtonLoading(submit, true, { loadingText: 'Yazılır...' });

        try {
          const { error } = await supabase.rpc(RPC.setCashRegisterBalance, {
            p_target_balance: target,
            p_note: note,
          });

          if (error) throw error;

          closeModal();
          notify.success('Fiziki KASSA qalığı yeniləndi.');
          await Promise.all([
            loadCashRegisterEntries(),
            loadHistory({ limit: 50 }),
          ]);
          renderFinance();
        } catch (error) {
          console.error('[SKy Fit Kassa] Qalıq:', error);
          notify.error(getErrorMessage(error, 'Kassa qalığı yenilənmədi.'));
        } finally {
          setButtonLoading(submit, false);
        }
      });
    },
  });
}

function staffOptionsMarkup() {
  return state.members
    .filter(item => ['admin', 'staff'].includes(normalizeString(item.role)) && item.is_active !== false)
    .map(item => `
      <option value="${escapeHtml(item.id)}">${escapeHtml(getProfileName(item))} · ${escapeHtml(roleLabel(item.role))}</option>
    `)
    .join('');
}

function openStaffAdvanceModal(trigger = null) {
  const content = createElement('form', {
    className: 'modal-form',
    attrs: { id: 'staff-advance-form', novalidate: '' },
  });

  content.innerHTML = `
    <div class="ui-info-card">
      <span class="ui-info-card__icon">i</span>
      <span>
        <strong>İşçi avansı biznes xərci deyil</strong>
        <small>Məsələn kassada 150 ₼ varsa, işçi 30 ₼ və başqa işçi 20 ₼ götürəndə KASSA 100 ₼ qalır. Məbləğ işçinin qaytaracağı borc kimi saxlanılır.</small>
      </span>
    </div>

    <div class="modal-form__grid">
      <div class="ui-field">
        <label class="ui-field__label" for="staff-advance-action">Əməliyyat</label>
        <select id="staff-advance-action" class="ui-select">
          <option value="advance">Kassadan avans ver</option>
          <option value="repayment">Avans qaytarması qəbul et</option>
        </select>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="staff-advance-person">İşçi</label>
        <select id="staff-advance-person" class="ui-select">
          <option value="">İşçi seç</option>
          ${staffOptionsMarkup()}
        </select>
      </div>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="staff-advance-amount">Məbləğ</label>
      <div class="ui-input">
        <input id="staff-advance-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
      </div>
    </div>

    <div class="ui-field">
      <label class="ui-field__label" for="staff-advance-note">Qeyd</label>
      <textarea id="staff-advance-note" class="ui-textarea" rows="3" maxlength="300" placeholder="Məs: Şəxsi ehtiyac üçün avans"></textarea>
    </div>

    <button id="staff-advance-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
      <span class="ui-button__label">Əməliyyatı təsdiqlə</span>
      <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
    </button>
  `;

  openModal({
    eyebrow: 'KASSA',
    title: 'İşçi avansı',
    content,
    trigger,
    onOpen: () => {
      const submit = $('#staff-advance-submit', content);

      content.addEventListener('submit', async event => {
        event.preventDefault();

        const action = normalizeString($('#staff-advance-action', content)?.value, 'advance');
        const staffId = normalizeString($('#staff-advance-person', content)?.value);
        const amount = number($('#staff-advance-amount', content)?.value);
        const note = normalizeString($('#staff-advance-note', content)?.value);

        if (!staffId || amount <= 0) {
          notify.warning('İşçi və düzgün məbləğ seç.');
          return;
        }

        setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

        try {
          const { error } = await supabase.rpc(
            action === 'repayment'
              ? RPC.repayStaffCashAdvanceV2
              : RPC.takeStaffCashAdvanceV2,
            {
              p_staff_id: staffId,
              p_amount: amount,
              p_note: note || null,
            }
          );

          if (error) throw error;

          closeModal();
          notify.success(
            action === 'repayment'
              ? 'Avans qaytarması kassaya daxil edildi.'
              : 'İşçi avansı kassadan çıxıldı.'
          );

          await Promise.all([
            loadCashRegisterEntries(),
            loadHistory({ limit: 50 }),
          ]);

          renderFinance();
        } catch (error) {
          console.error('[SKy Fit Kassa] İşçi avansı:', error);
          notify.error(getErrorMessage(error, 'İşçi avans əməliyyatı tamamlanmadı.'));
        } finally {
          setButtonLoading(submit, false);
        }
      });
    },
  });
}

function bindFinanceEvents() {
  byId('finance-type-filter')?.addEventListener('change', renderFinance);
  byId('finance-date-from')?.addEventListener('change', renderFinance);
  byId('finance-date-to')?.addEventListener('change', renderFinance);
  byId('finance-search')?.addEventListener(
    'input',
    debounce(renderFinance, UI_CONFIG.debounceDelay)
  );

  byId('income-create-button')?.addEventListener('click', event => {
    openIncomeModal(event.currentTarget);
  });

  byId('expense-create-button')?.addEventListener('click', event => {
    openExpenseModal(event.currentTarget);
  });

  byId('cash-balance-button')?.addEventListener('click', event => {
    openCashBalanceModal(event.currentTarget);
  });

  byId('staff-advance-button')?.addEventListener('click', event => {
    openStaffAdvanceModal(event.currentTarget);
  });

  byId('finance-reset-filter')?.addEventListener('click', () => {
    const type = byId('finance-type-filter');
    const from = byId('finance-date-from');
    const to = byId('finance-date-to');
    const search = byId('finance-search');

    if (type) type.value = 'all';
    if (from) from.value = '';
    if (to) to.value = '';
    if (search) search.value = '';

    renderFinance();
  });
}

function filteredTrainers() {
  const search =
    normalizeSearch(
      byId(
        'trainers-admin-search'
      )?.value
    );

  const status =
    normalizeString(
      byId(
        'trainers-status-filter'
      )?.value,
      'all'
    );

  return state.trainers
    .filter(
      trainer => {
        if (!search) {
          return true;
        }

        const text =
          [
            trainer.full_name,
            trainer.specialty,
            trainer.bio,
            trainer.phone,
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
    )
    .filter(
      trainer => {
        if (
          status ===
          'active'
        ) {
          return (
            trainer.is_active !==
            false
          );
        }

        if (
          status ===
          'inactive'
        ) {
          return (
            trainer.is_active ===
            false
          );
        }

        return true;
      }
    );
}

function createAdminTrainerCard(
  trainer
) {
  const image =
    trainerImage(
      trainer
    );

  const card =
    createElement(
      'article',
      {
        className:
          'trainer-card admin-trainer-card',

        dataset: {
          trainerId:
            trainer.id,
        },
      }
    );

  card.innerHTML = `
    <button
      type="button"
      class="trainer-card__media admin-trainer-card__main"
    >

      ${
        image
          ? `
            <img
              class="trainer-card__image"
              src="${escapeHtml(
                image
              )}"
              alt="${escapeHtml(
                trainerName(
                  trainer
                )
              )}"
              loading="lazy"
              decoding="async"
            >
          `
          : `
            <span class="trainer-card__image-fallback">
              ${escapeHtml(
                getTrainerInitials(
                  trainer
                )
              )}
            </span>
          `
      }

      <div class="trainer-card__content">

        <div class="admin-trainer-card__badges">

          <span class="${
            trainer.is_active !==
              false
              ? 'ui-badge ui-badge--success'
              : 'ui-badge ui-badge--danger'
          }">
            ${
              trainer.is_active !==
                false
                ? 'Aktiv'
                : 'Deaktiv'
            }
          </span>

        </div>

        <strong class="trainer-card__name">
          ${escapeHtml(
            trainerName(
              trainer
            )
          )}
        </strong>

        ${
          trainerSpecialty(
            trainer
          )
            ? `
              <span class="trainer-card__specialty">
                ${escapeHtml(
                  trainerSpecialty(
                    trainer
                  )
                )}
              </span>
            `
            : ''
        }

        ${
          trainer.phone
            ? `
              <span class="trainer-card__specialty">
                ${escapeHtml(
                  trainer.phone
                )}
              </span>
            `
            : ''
        }

        <span class="trainer-card__action">
          Redaktə et
        </span>

      </div>

    </button>
  `;

  $(
    '.admin-trainer-card__main',
    card
  )?.addEventListener(
    'click',
    () => {
      openTrainerEditor(
        trainer,
        card
      );
    }
  );

  return card;
}

function getTrainerInitials(
  trainer
) {
  const name =
    trainerName(
      trainer
    );

  const parts =
    name
      .split(' ')
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return 'SK';
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toLocaleUpperCase(
        'az-AZ'
      );
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toLocaleUpperCase(
    'az-AZ'
  );
}

function renderAdminTrainers() {
  const root =
    byId(
      'admin-trainers-grid'
    );

  if (!root) {
    return;
  }

  clearElement(
    root
  );

  const trainers =
    filteredTrainers();

  trainers.forEach(
    trainer => {
      root.append(
        createAdminTrainerCard(
          trainer
        )
      );
    }
  );

  if (
    trainers.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Məşqçi tapılmadı.'
      )
    );
  }
}

function openTrainerEditor(
  trainer = null,
  trigger = null
) {
  const editing =
    Boolean(trainer);

  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'trainer-admin-form',

          novalidate:
            '',
        },
      }
    );

  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-admin-name"
      >
        Ad və soyad
      </label>

      <div class="ui-input">

        <input
          id="trainer-admin-name"
          class="ui-input__control"
          type="text"
          maxlength="160"
          value="${escapeHtml(
            trainer
              ?.full_name ||
            ''
          )}"
          placeholder="Məşqçinin adı və soyadı"
        >

      </div>

      <span
        id="trainer-admin-name-error"
        class="ui-field__error is-hidden"
      ></span>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-specialty"
        >
          İxtisas
        </label>

        <div class="ui-input">

          <input
            id="trainer-admin-specialty"
            class="ui-input__control"
            type="text"
            maxlength="160"
            value="${escapeHtml(
              trainer
                ?.specialty ||
              ''
            )}"
            placeholder="Fitness, CrossFit..."
          >

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-phone"
        >
          Telefon
        </label>

        <div class="ui-input">

          <input
            id="trainer-admin-phone"
            class="ui-input__control"
            type="tel"
            value="${escapeHtml(
              trainer
                ?.phone ||
              ''
            )}"
            placeholder="+994..."
          >

        </div>

      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-admin-instagram"
      >
        Instagram linki
      </label>

      <div class="ui-input">

        <input
          id="trainer-admin-instagram"
          class="ui-input__control"
          type="url"
          value="${escapeHtml(
            trainer
              ?.instagram_url ||
            ''
          )}"
          placeholder="https://instagram.com/..."
        >

      </div>

    </div>

    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-admin-bio"
      >
        Haqqında
      </label>

      <textarea
        id="trainer-admin-bio"
        class="ui-textarea"
        rows="4"
        maxlength="1500"
        placeholder="Məşqçi haqqında qısa məlumat"
      >${escapeHtml(
        trainer?.bio ||
        ''
      )}</textarea>

    </div>

    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-sort"
        >
          Sıralama
        </label>

        <div class="ui-input">

          <input
            id="trainer-admin-sort"
            class="ui-input__control"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            value="${number(
              trainer
                ?.sort_order,
              0
            )}"
          >

        </div>

      </div>

      <div class="ui-field">

        <label class="ui-field__label">
          Status
        </label>

        <label class="ui-check">

          <input
            id="trainer-admin-active"
            type="checkbox"
            ${
              trainer
                ?.is_active !==
                false
                ? 'checked'
                : ''
            }
          >

          <span>
            Saytda aktiv göstər
          </span>

        </label>

      </div>

    </div>

    <label class="ui-upload">

      <input
        id="trainer-admin-image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
      >

      <span>

        <strong class="ui-upload__title">
          ${
            editing
              ? 'Məşqçi şəklini dəyiş'
              : 'Məşqçi şəkli'
          }
        </strong>

        <span class="ui-upload__meta">
          PNG, JPG və ya WEBP · maksimum 5 MB
        </span>

      </span>

    </label>

    <button
      id="trainer-admin-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        ${
          editing
            ? 'Yadda saxla'
            : 'Məşqçi əlavə et'
        }
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>

    </button>
  `;

  openModal({
    eyebrow:
      'Məşqçilər',

    title:
      editing
        ? 'Məşqçini redaktə et'
        : 'Yeni məşqçi',

    content,

    trigger,

    onOpen:
      () => {
        bindTrainerForm(
          content,
          trainer
        );
      },
  });
}

function bindTrainerForm(
  form,
  trainer
) {
  const nameInput =
    $(
      '#trainer-admin-name',
      form
    );

  const specialtyInput =
    $(
      '#trainer-admin-specialty',
      form
    );

  const phoneInput =
    $(
      '#trainer-admin-phone',
      form
    );

  const instagramInput =
    $(
      '#trainer-admin-instagram',
      form
    );

  const bioInput =
    $(
      '#trainer-admin-bio',
      form
    );

  const sortInput =
    $(
      '#trainer-admin-sort',
      form
    );

  const activeInput =
    $(
      '#trainer-admin-active',
      form
    );

  const imageInput =
    $(
      '#trainer-admin-image',
      form
    );

  const nameError =
    $(
      '#trainer-admin-name-error',
      form
    );

  const submit =
    $(
      '#trainer-admin-submit',
      form
    );

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const fullName =
        normalizeString(
          nameInput?.value
        );

      if (
        fullName.length < 2
      ) {
        setFieldError(
          nameInput,
          nameError,
          'Məşqçinin adını daxil et.'
        );

        return;
      }

      const payload = {

        full_name:
          fullName,

        specialty:
          normalizeString(
            specialtyInput
              ?.value
          ) ||
          null,

        phone:
          normalizeString(
            phoneInput
              ?.value
          ) ||
          null,

        instagram_url:
          normalizeString(
            instagramInput
              ?.value
          ) ||
          null,

        bio:
          normalizeString(
            bioInput?.value
          ) ||
          null,

        sort_order:
          Math.max(
            0,
            Math.trunc(
              number(
                sortInput
                  ?.value,
                0
              )
            )
          ),

        is_active:
          Boolean(
            activeInput
              ?.checked
          ),
      };

      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            trainer
              ? 'Yadda saxlanılır...'
              : 'Əlavə olunur...',
        }
      );

      try {
        let savedTrainer;

        if (trainer) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                TABLES.trainers
              )
              .update(
                payload
              )
              .eq(
                'id',
                trainer.id
              )
              .select('*')
              .single();

          if (error) {
            throw error;
          }

          savedTrainer =
            data;
        } else {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                TABLES.trainers
              )
              .insert(
                payload
              )
              .select('*')
              .single();

          if (error) {
            throw error;
          }

          savedTrainer =
            data;
        }

        const file =
          imageInput
            ?.files
            ?.[0];

        if (file) {
          savedTrainer =
            await uploadTrainerImage(
              savedTrainer,
              file
            );
        }

        closeModal();

        notify.success(
          trainer
            ? 'Məşqçi yeniləndi.'
            : 'Məşqçi əlavə edildi.'
        );

        await Promise.all([
          loadTrainers(),

          loadHistory({
            limit:
              50,
          }),
        ]);

        renderAdminTrainers();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] Trainer save:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Məşqçi yadda saxlanmadı.'
          )
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}

function validateTrainerImage(
  file
) {
  const allowed =
    new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

  if (
    !allowed.has(
      file?.type
    )
  ) {
    throw new Error(
      'Məşqçi şəkli JPG, PNG və ya WEBP olmalıdır.'
    );
  }

  if (
    file.size >
    5 * 1024 * 1024
  ) {
    throw new Error(
      'Məşqçi şəkli maksimum 5 MB ola bilər.'
    );
  }
}

function trainerImageExtension(
  file
) {
  if (
    file.type ===
    'image/png'
  ) {
    return 'png';
  }

  if (
    file.type ===
    'image/webp'
  ) {
    return 'webp';
  }

  return 'jpg';
}

function extractTrainerStoragePath(
  value
) {
  const source =
    normalizeString(
      value
    );

  if (!source) {
    return '';
  }

  if (
    !source.startsWith(
      'http://'
    ) &&
    !source.startsWith(
      'https://'
    )
  ) {
    return source.replace(
      /^\/+/,
      ''
    );
  }

  try {
    const url =
      new URL(source);

    const marker =
      '/storage/v1/object/public/trainer-images/';

    const index =
      url.pathname.indexOf(
        marker
      );

    if (
      index === -1
    ) {
      return '';
    }

    return decodeURIComponent(
      url.pathname.slice(
        index +
        marker.length
      )
    );
  } catch {
    return '';
  }
}

function trainerImagePathBelongsToTrainer(path, trainerId) {
  const safePath = normalizeString(path);
  const safeId = normalizeString(trainerId);

  return Boolean(
    safePath &&
    safeId &&
    safePath.startsWith(`${safeId}/`)
  );
}

async function uploadTrainerImage(
  trainer,
  file
) {
  validateTrainerImage(
    file
  );

  const oldPath =
    extractTrainerStoragePath(
      trainer.image_url
    );

  const extension =
    trainerImageExtension(
      file
    );

  const path =
    `${trainer.id}/trainer-${Date.now()}.${extension}`;

  const {
    error:
      uploadError,
  } =
    await supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .trainerImages
      )
      .upload(
        path,
        file,
        {
          upsert:
            false,

          cacheControl:
            '3600',

          contentType:
            file.type,
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.trainers
      )
      .update({
        image_url:
          path,
      })
      .eq(
        'id',
        trainer.id
      )
      .select('*')
      .single();

  if (error) {
    await supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .trainerImages
      )
      .remove([
        path,
      ]);

    throw error;
  }

  if (
    trainerImagePathBelongsToTrainer(
      oldPath,
      trainer.id
    ) &&
    oldPath !== path
  ) {
    supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .trainerImages
      )
      .remove([
        oldPath,
      ])
      .then(
        ({
          error:
            cleanupError,
        }) => {
          if (
            cleanupError
          ) {
            console.warn(
              '[SKy Fit] Old trainer image cleanup:',
              cleanupError
            );
          }
        }
      );
  }

  return data;
}

function bindTrainerAdminEvents() {
  byId(
    'trainer-create-button'
  )?.addEventListener(
    'click',
    event => {
      openTrainerEditor(
        null,
        event.currentTarget
      );
    }
  );

  byId(
    'trainers-admin-search'
  )?.addEventListener(
    'input',
    debounce(renderAdminTrainers, UI_CONFIG.debounceDelay)
  );

  byId(
    'trainers-status-filter'
  )?.addEventListener(
    'change',
    renderAdminTrainers
  );
}

function historyTableLabel(
  table
) {
  const labels = {

    products:
      'Məhsul',

    product_sale_variants:
      'Satış variantı',

    trainers:
      'Məşqçi',

    sales:
      'Satış',

    sale_items:
      'Satış məhsulu',

    memberships:
      'Üzvlük',

    attendance:
      'Giriş',

    stock_movements:
      'Stok',

    debt_transactions:
      'Borc',

    ledger_entries:
      'Mədaxil / Məxaric',

    staff_shifts:
      'İş növbəsi',

    staff_cash_transactions:
      'İşçi avansı',

    cash_register_entries:
      'KASSA',

    expense_categories:
      'Xərc kateqoriyası',
  };

  return (
    labels[
      normalizeString(
        table
      )
    ] ||
    normalizeString(
      table,
      'Əməliyyat'
    )
  );
}

function historyActionLabel(
  action
) {
  switch (
    normalizeString(
      action
    ).toUpperCase()
  ) {
    case 'INSERT':
      return 'Əlavə etdi';

    case 'UPDATE':
      return 'Dəyişdi';

    case 'DELETE':
      return 'Sildi';

    default:
      return normalizeString(
        action,
        'Əməliyyat'
      );
  }
}

function historyActionClass(
  action
) {
  switch (
    normalizeString(
      action
    ).toUpperCase()
  ) {
    case 'INSERT':
      return (
        'ui-badge ui-badge--success'
      );

    case 'UPDATE':
      return (
        'ui-badge ui-badge--warning'
      );

    case 'DELETE':
      return (
        'ui-badge ui-badge--danger'
      );

    default:
      return (
        'ui-badge ui-badge--neutral'
      );
  }
}

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

  history.forEach(
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
          ${escapeHtml(
            getAuditInitials(
              item.actor_name
            )
          )}
        </span>

        <span class="operation-item__content">

          <strong class="operation-item__title">

            ${escapeHtml(
              item.actor_name ||
              'Sistem'
            )}

            <span class="${
              historyActionClass(
                item.action
              )
            }">
              ${escapeHtml(
                historyActionLabel(
                  item.action
                )
              )}
            </span>

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

          <span class="operation-item__operator">
            ID:
            ${escapeHtml(
              String(
                item.record_id ||
                '—'
              ).slice(
                0,
                18
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
          openAuditDetail(
            item,
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

  setText(
    byId(
      'history-result-count'
    ),
    history.length
  );
}

function getAuditInitials(
  name
) {
  const value =
    normalizeString(
      name,
      'SK'
    );

  const parts =
    value
      .split(' ')
      .filter(Boolean);

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toLocaleUpperCase(
        'az-AZ'
      );
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toLocaleUpperCase(
    'az-AZ'
  );
}

const AUDIT_HIDDEN_FIELDS =
  new Set([
    'updated_at',
    'operator_shift_id',
  ]);

function auditChanges(
  oldData,
  newData
) {
  const oldObject =
    oldData &&
    typeof oldData ===
      'object'
      ? oldData
      : {};

  const newObject =
    newData &&
    typeof newData ===
      'object'
      ? newData
      : {};

  const keys =
    new Set([
      ...Object.keys(
        oldObject
      ),

      ...Object.keys(
        newObject
      ),
    ]);

  return Array.from(
    keys
  )
    .filter(
      key =>
        !AUDIT_HIDDEN_FIELDS
          .has(key)
    )
    .filter(
      key => {
        const oldValue =
          oldObject[key];

        const newValue =
          newObject[key];

        return (
          JSON.stringify(
            oldValue
          ) !==
          JSON.stringify(
            newValue
          )
        );
      }
    )
    .map(
      key => ({
        key,

        oldValue:
          oldObject[key],

        newValue:
          newObject[key],
      })
    );
}

function auditFieldLabel(
  key
) {
  const labels = {

    name:
      'Ad',

    full_name:
      'Ad və soyad',

    retail_price:
      'Pərakəndə qiymət',

    portion_price:
      'Porsiya qiyməti',

    cost_price:
      'Maya qiyməti',

    stock_quantity:
      'Stok',

    low_stock_threshold:
      'Az stok limiti',

    is_active:
      'Aktivlik',

    show_public:
      'Saytda görünmə',

    payment_status:
      'Ödəniş',

    payment_method:
      'Ödəniş üsulu',

    cash_amount:
      'Nağd məbləğ',

    card_amount:
      'Kart məbləği',

    status:
      'Status',

    start_date:
      'Başlanğıc',

    end_date:
      'Bitmə',

    price:
      'Qiymət',

    amount:
      'Məbləğ',

    attendance_type:
      'Giriş növü',

    specialty:
      'İxtisas',

    phone:
      'Telefon',

    bio:
      'Haqqında',

    image_url:
      'Şəkil',

    sort_order:
      'Sıralama',

    note:
      'Qeyd',

    description:
      'Açıqlama',

    category:
      'Kateqoriya',

    variant_type:
      'Variant növü',

    stock_deduction:
      'Stokdan çıxılma',

    is_quick_sale:
      'Tez satış',

    gross_profit:
      'Brüt qazanc',

    cost_total:
      'Maya cəmi',

    movement_type:
      'Stok hərəkəti',

    quantity:
      'Miqdar',

    balance_after:
      'Qalıq',

    transaction_type:
      'Əməliyyat növü',
  };

  return (
    labels[key] ||
    key
      .replaceAll(
        '_',
        ' '
      )
  );
}

function formatAuditValue(
  key,
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—';
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return value
      ? 'Bəli'
      : 'Xeyr';
  }

  if (
    [
      'retail_price',
      'portion_price',
      'cost_price',
      'price',
      'amount',
      'total_amount',
      'subtotal',
      'balance',
      'cash_amount',
      'card_amount',
    ].includes(
      key
    )
  ) {
    return money(
      value
    );
  }

  if (
    [
      'start_date',
      'end_date',
      'entry_date',
    ].includes(
      key
    )
  ) {
    return formatDate(
      value
    );
  }

  if (
    typeof value ===
    'object'
  ) {
    return JSON.stringify(
      value
    );
  }

  return String(value);
}

//
// Burada artıq:
// kim
// nə vaxt
// hansı cədvəldə
// hansı record
// nədən
// nəyə
//
// hamısı görünür.

function openAuditDetail(
  item,
  trigger = null
) {
  const changes =
    auditChanges(
      item.old_data,
      item.new_data
    );

  const content =
    createElement(
      'div',
      {
        className:
          'audit-detail',
      }
    );

  const metadata =
    `
      <div class="audit-detail__summary">

        <div>
          <span>Operator</span>

          <strong>
            ${escapeHtml(
              item.actor_name ||
              'Sistem'
            )}
          </strong>
        </div>

        <div>
          <span>Rol</span>

          <strong>
            ${escapeHtml(
              roleLabel(
                item.actor_role
              )
            )}
          </strong>
        </div>

        <div>
          <span>Əməliyyat</span>

          <strong>
            ${escapeHtml(
              historyActionLabel(
                item.action
              )
            )}
          </strong>
        </div>

        <div>
          <span>Bölmə</span>

          <strong>
            ${escapeHtml(
              historyTableLabel(
                item.table_name
              )
            )}
          </strong>
        </div>

        <div>
          <span>Tarix</span>

          <strong>
            ${formatDateTime(
              item.created_at
            )}
          </strong>
        </div>

        <div>
          <span>Record ID</span>

          <strong class="audit-detail__id">
            ${escapeHtml(
              item.record_id ||
              '—'
            )}
          </strong>
        </div>

      </div>
    `;

  let changesMarkup =
    '';

  if (
    changes.length > 0
  ) {
    changesMarkup = `
      <div class="audit-change-list">

        ${changes
          .map(
            change => `
              <article class="audit-change">

                <strong class="audit-change__field">
                  ${escapeHtml(
                    auditFieldLabel(
                      change.key
                    )
                  )}
                </strong>

                <div class="audit-change__values">

                  <div class="audit-change__value audit-change__value--old">

                    <span>
                      Əvvəl
                    </span>

                    <strong>
                      ${escapeHtml(
                        formatAuditValue(
                          change.key,
                          change.oldValue
                        )
                      )}
                    </strong>

                  </div>

                  <span class="audit-change__arrow">
                    →
                  </span>

                  <div class="audit-change__value audit-change__value--new">

                    <span>
                      Sonra
                    </span>

                    <strong>
                      ${escapeHtml(
                        formatAuditValue(
                          change.key,
                          change.newValue
                        )
                      )}
                    </strong>

                  </div>

                </div>

              </article>
            `
          )
          .join('')}

      </div>
    `;
  } else {
    changesMarkup = `
      <div class="ui-info-card">

        <span class="ui-info-card__label">
          Dəyişiklik
        </span>

        <strong>
          ${
            normalizeString(
              item.action
            ).toUpperCase() ===
              'INSERT'
              ? 'Yeni qeyd yaradılıb'
              : normalizeString(
                  item.action
                ).toUpperCase() ===
                  'DELETE'
                ? 'Qeyd silinib'
                : 'Sahə fərqi tapılmadı'
          }
        </strong>

      </div>
    `;
  }

  content.innerHTML =
    metadata +
    changesMarkup;

  openModal({
    eyebrow:
      'Audit tarixçəsi',

    title:
      `${historyTableLabel(
        item.table_name
      )} · ${historyActionLabel(
        item.action
      )}`,

    content,

    trigger,
  });
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

function bindGlobalSearch() {
  const input =
    byId(
      'admin-global-search'
    );

  if (!input) {
    return;
  }

  input.addEventListener(
    'input',
    debounce(
      () => {
        const query =
          normalizeString(
            input.value
          );

        if (!query) {
          return;
        }

        const normalized =
          normalizeSearch(
            query
          );

        const member =
          state.members.find(
            item =>
              [
                item.full_name,
                item.phone,
                item.email,
              ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase(
                  'az-AZ'
                )
                .includes(
                  normalized
                )
          );

        if (member) {
          setActiveTab(
            'members'
          );

          const search =
            byId(
              'members-search'
            );

          if (search) {
            search.value =
              query;
          }

          renderMembers();

          return;
        }

        const product =
          state.products.find(
            item =>
              [
                item.name,
                item.sku,
                item.category,
              ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase(
                  'az-AZ'
                )
                .includes(
                  normalized
                )
          );

        if (product) {
          setActiveTab(
            'products'
          );

          const search =
            byId(
              'products-admin-search'
            );

          if (search) {
            search.value =
              query;
          }

          renderAdminProducts();
        }
      },
      350
    )
  );
}

function bindAdminAuthEvents() {
  window.addEventListener(
    SKYFIT_EVENTS
      .authChange,
    async event => {
      const authEvent =
        normalizeString(
          event.detail
            ?.event
        );

      if (
        authEvent ===
        'SIGNED_OUT'
      ) {
        window.location.replace(
          APP_CONFIG
            .routes
            .login
        );

        return;
      }

      try {
        const identity =
          event.detail
            ?.identity ||
          await getCurrentIdentity({
            force:
              true,
          });

        if (
          !identity
            ?.authenticated
        ) {
          window.location.replace(
            APP_CONFIG
              .routes
              .login
          );

          return;
        }

        if (
          !identity.isStaff
        ) {
          window.location.replace(
            APP_CONFIG
              .routes
              .home
          );

          return;
        }

        state.identity =
          identity;

        renderOperator();
      } catch (error) {
        console.error(
          '[SKy Fit Admin] Auth change:',
          error
        );
      }
    }
  );
}

//
// Eyni səhifədə əməliyyat tamamlananda KPI-lar köhnə qalmasın.

function bindAdminOperationEvents() {
  window.addEventListener(
    ADMIN_OPERATION_EVENT,
    () => {
      if (
        state.activeTab ===
        'dashboard'
      ) {
        void loadDashboard();
      }
    }
  );
}

//
// Admin panel ilk açılarkən global search,
// POS və üzv seçimləri üçün əsas data əvvəlcədən hazırlanır.

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

  bindQuickAction();

  bindMemberEvents();

  bindMembershipEvents();

  bindAttendanceAdminEvents();

  bindDebtEvents();

  bindFinanceEvents();

  bindTrainerAdminEvents();

  bindHistoryEvents();

  bindGlobalSearch();

  bindAdminAuthEvents();

  bindAdminOperationEvents();
}

function resolveInitialAdminTab() {
  const params =
    new URLSearchParams(window.location.search);

  const requested =
    normalizeString(params.get('tab'));

  return requested
    ? normalizeTab(requested)
    : readStoredAdminTab();
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