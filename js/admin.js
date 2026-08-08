// ============================================================
// SKY FIT PRO
// Admin Operations Controller
// File: js/admin.js
// ============================================================

import {
  supabase,
  APP_CONFIG,
  TABLES,
  RPC,
  STORAGE_KEYS,
  UI_CONFIG,
  USER_ROLES,
} from './config.js';

import {
  $,
  $$,
  byId,
  clearElement,
  createElement,
  showElement,
  hideElement,
  setText,
  normalizeString,
  normalizeNumber,
  money,
  number,
  formatDate,
  formatDateTime,
  formatTime,
  debounce,
  storageGet,
  storageSet,
  getCurrentIdentity,
  getProfileName,
  getInitials,
  roleLabel,
  membershipStatus,
  paymentStatusMeta,
  stockStatusMeta,
  openModal,
  closeModal,
  confirmDialog,
  notify,
  getErrorMessage,
  setButtonLoading,
  validatePhone,
  validateEmail,
  setFieldError,
  clearFormErrors,
  getPublicStorageUrl,
  asyncHandler,
  requireStaff,
  escapeHtml,
} from './core.js';

import {
  initLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {
  identity: null,

  activeTab:
    storageGet(
      STORAGE_KEYS.lastAdminTab,
      'dashboard'
    ),

  dashboard: {
    sales: [],
    memberships: [],
    attendance: [],
    debts: [],
    ledger: [],
    stock: [],
  },

  products: [],
  members: [],
  memberships: [],
  attendance: [],
  debts: [],
  ledger: [],
  trainers: [],
  stockMovements: [],

  filters: {
    products: '',
    members: '',
    memberships: '',
    attendance: '',
    debts: '',
    trainers: '',
    history: '',

    productStatus: 'all',
    membershipStatus: 'all',
    memberRole: 'all',
    stock: 'all',
    financeType: 'all',
    historyType: 'all',
  },

  busy: false,
};


// ============================================================
// 02. ADMIN TABS
// ============================================================

const VALID_TABS = new Set([
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


function normalizeTab(tab) {
  return VALID_TABS.has(tab)
    ? tab
    : 'dashboard';
}


function setActiveTab(
  tab,
  {
    persist = true,
    load = true,
  } = {}
) {
  const target =
    normalizeTab(tab);

  state.activeTab =
    target;

  if (persist) {
    storageSet(
      STORAGE_KEYS.lastAdminTab,
      target
    );
  }


  $$('[data-admin-tab]')
    .forEach(button => {
      const active =
        button.dataset.adminTab ===
        target;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-selected',
        String(active)
      );
    });


  $$('[data-admin-panel]')
    .forEach(panel => {
      panel.classList.toggle(
        'is-hidden',
        panel.dataset.adminPanel !==
          target
      );
    });


  if (load) {
    loadActiveTab();
  }
}


// ============================================================
// 03. TAB EVENTS
// ============================================================

function bindTabEvents() {
  $$('[data-admin-tab]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          setActiveTab(
            button.dataset.adminTab
          );
        }
      );
    });


  $$('[data-admin-open-tab]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          setActiveTab(
            button.dataset
              .adminOpenTab
          );
        }
      );
    });
}


// ============================================================
// 04. ACTIVE TAB LOADER
// ============================================================

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
      break;

    case 'memberships':
      await Promise.all([
        loadMemberships(),
        loadMembershipPlans(),
      ]);
      break;

    case 'attendance':
      await loadAttendance();
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
      await loadDebts();
      break;

    case 'finance':
      await loadLedger();
      break;

    case 'trainers':
      await loadTrainers();
      break;

    case 'history':
      await loadHistory();
      break;

    default:
      break;
  }
}


// ============================================================
// 05. OPERATOR LABEL
// ============================================================

function renderOperator() {
  const label =
    byId(
      'admin-operator-label'
    );

  if (!label) return;

  const identity =
    state.identity;

  const name =
    getProfileName(
      identity?.profile,
      identity?.user
    );

  const role =
    roleLabel(
      identity?.role
    );

  label.textContent =
    `${name} · ${role}`;
}


// ============================================================
// 06. DATE HELPERS
// ============================================================

function startOfTodayIso() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date.toISOString();
}


function endOfTodayIso() {
  const date =
    new Date();

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date.toISOString();
}


// ============================================================
// 07. SAFE ARRAY
// ============================================================

function rows(data) {
  return Array.isArray(data)
    ? data
    : [];
}


// ============================================================
// 08. DASHBOARD
// ============================================================

async function loadDashboard() {
  const todayStart =
    startOfTodayIso();

  const todayEnd =
    endOfTodayIso();


  const [
    salesResult,
    membershipsResult,
    attendanceResult,
    debtResult,
    ledgerResult,
    stockResult,
  ] =
    await Promise.all([

      supabase
        .from(TABLES.sales)
        .select('*')
        .gte(
          'created_at',
          todayStart
        )
        .lte(
          'created_at',
          todayEnd
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(100),

      supabase
        .from(
          TABLES.memberships
        )
        .select(`
          *,
          profiles (*),
          membership_plans (*)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.attendance
        )
        .select(`
          *,
          profiles (*)
        `)
        .gte(
          'created_at',
          todayStart
        )
        .lte(
          'created_at',
          todayEnd
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.debtAccounts
        )
        .select(`
          *,
          profiles (*)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.ledgerEntries
        )
        .select('*')
        .gte(
          'created_at',
          todayStart
        )
        .lte(
          'created_at',
          todayEnd
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.products
        )
        .select('*')
        .eq(
          'is_active',
          true
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(500),
    ]);


  const results = [
    salesResult,
    membershipsResult,
    attendanceResult,
    debtResult,
    ledgerResult,
    stockResult,
  ];


  results.forEach(
    result => {
      if (result.error) {
        console.error(
          'Dashboard query error:',
          result.error
        );
      }
    }
  );


  state.dashboard.sales =
    rows(
      salesResult.data
    );

  state.dashboard.memberships =
    rows(
      membershipsResult.data
    );

  state.dashboard.attendance =
    rows(
      attendanceResult.data
    );

  state.dashboard.debts =
    rows(
      debtResult.data
    );

  state.dashboard.ledger =
    rows(
      ledgerResult.data
    );

  state.dashboard.stock =
    rows(
      stockResult.data
    );


  renderDashboard();
}


// ============================================================
// 09. DASHBOARD CALCULATIONS
// ============================================================

function saleAmount(sale) {
  return normalizeNumber(
    sale?.total_amount ??
    sale?.total ??
    sale?.amount ??
    0
  );
}


function debtBalance(account) {
  return normalizeNumber(
    account?.balance ??
    account?.amount ??
    account?.debt_amount ??
    0
  );
}


function ledgerAmount(entry) {
  return normalizeNumber(
    entry?.amount ??
    0
  );
}


function ledgerType(entry) {
  return normalizeString(
    entry?.entry_type ??
    entry?.type
  ).toLowerCase();
}


function productStock(product) {
  return normalizeNumber(
    product?.stock_quantity ??
    product?.stock ??
    product?.quantity ??
    0
  );
}


function membershipEndDate(
  membership
) {
  return (
    membership?.end_date ||
    membership?.expires_at ||
    null
  );
}


// ============================================================
// 10. DASHBOARD RENDER
// ============================================================

function renderDashboard() {
  const sales =
    state.dashboard.sales;

  const memberships =
    state.dashboard.memberships;

  const attendance =
    state.dashboard.attendance;

  const debts =
    state.dashboard.debts;

  const ledger =
    state.dashboard.ledger;

  const stock =
    state.dashboard.stock;


  const salesTotal =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        saleAmount(sale),
      0
    );


  const activeMemberships =
    memberships.filter(
      membership => {
        const meta =
          membershipStatus({
            status:
              membership.status,

            endDate:
              membershipEndDate(
                membership
              ),
          });

        return (
          meta.value ===
          'active'
        );
      }
    );


  const totalDebt =
    debts.reduce(
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


  const income =
    ledger
      .filter(
        entry =>
          ledgerType(entry) ===
          'income'
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          ledgerAmount(entry),
        0
      );


  const expense =
    ledger
      .filter(
        entry =>
          ledgerType(entry) ===
          'expense'
      )
      .reduce(
        (
          total,
          entry
        ) =>
          total +
          ledgerAmount(entry),
        0
      );


  setText(
    byId(
      'dashboard-sales-total'
    ),
    money(salesTotal)
  );


  setText(
    byId(
      'dashboard-sales-count'
    ),
    `${sales.length} satış`
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
    attendance.length
  );


  setText(
    byId(
      'dashboard-debt-total'
    ),
    money(totalDebt)
  );


  setText(
    byId(
      'dashboard-debt-accounts'
    ),
    `${debts.filter(
      item =>
        debtBalance(item) >
        0
    ).length} açıq hesab`
  );


  setText(
    byId(
      'dashboard-income-today'
    ),
    number(income)
  );


  setText(
    byId(
      'dashboard-expense-today'
    ),
    number(expense)
  );


  renderDashboardLowStock(
    stock
  );

  renderDashboardExpiringMemberships(
    activeMemberships
  );

  renderDashboardOpenDebts(
    debts
  );

  renderDashboardRecentOperations();
}


// ============================================================
// 11. LOW STOCK
// ============================================================

function renderDashboardLowStock(
  products
) {
  const root =
    byId(
      'dashboard-low-stock'
    );

  if (!root) return;

  clearElement(root);


  const lowStock =
    products
      .filter(
        product =>
          productStock(product) <=
          5
      )
      .sort(
        (a, b) =>
          productStock(a) -
          productStock(b)
      )
      .slice(0, 6);


  if (
    lowStock.length === 0
  ) {
    root.append(
      createDashboardEmpty(
        'Az stoklu məhsul yoxdur.'
      )
    );

    return;
  }


  lowStock.forEach(
    product => {
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
              product.name ||
              'Məhsul'
            )}
          </strong>

          <span class="compact-list-item__meta">
            Stok vəziyyəti
          </span>

        </span>

        <span class="compact-list-item__side">

          <strong>
            ${number(
              productStock(product)
            )}
          </strong>

          <span>
            qalıb
          </span>

        </span>
      `;


      root.append(item);
    }
  );
}


// ============================================================
// 12. EXPIRING MEMBERSHIPS
// ============================================================

function renderDashboardExpiringMemberships(
  memberships
) {
  const root =
    byId(
      'dashboard-expiring-memberships'
    );

  if (!root) return;

  clearElement(root);


  const now =
    new Date();


  const upcoming =
    memberships
      .map(
        membership => {
          const end =
            new Date(
              membershipEndDate(
                membership
              )
            );

          const days =
            Number.isNaN(
              end.getTime()
            )
              ? 9999
              : Math.ceil(
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
        (a, b) =>
          a.days - b.days
      )
      .slice(0, 6);


  if (
    upcoming.length === 0
  ) {
    root.append(
      createDashboardEmpty(
        'Yaxın günlərdə bitən üzvlük yoxdur.'
      )
    );

    return;
  }


  upcoming.forEach(
    ({
      membership,
      days,
    }) => {
      const profile =
        membership.profiles;

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
            getInitials(
              profile?.first_name ||
              profile?.name ||
              '',
              profile?.last_name ||
              ''
            )
          )}
        </span>

        <span class="compact-list-item__content">

          <strong class="compact-list-item__title">
            ${escapeHtml(
              getProfileName(
                profile
              )
            )}
          </strong>

          <span class="compact-list-item__meta">
            ${
              escapeHtml(
                membership
                  ?.membership_plans
                  ?.name ||
                'Üzvlük'
              )
            }
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
            qalır
          </span>

        </span>
      `;


      root.append(item);
    }
  );
}


// ============================================================
// 13. OPEN DEBTS
// ============================================================

function renderDashboardOpenDebts(
  debts
) {
  const root =
    byId(
      'dashboard-open-debts'
    );

  if (!root) return;

  clearElement(root);


  const open =
    debts
      .filter(
        account =>
          debtBalance(account) >
          0
      )
      .sort(
        (a, b) =>
          debtBalance(b) -
          debtBalance(a)
      )
      .slice(0, 6);


  if (
    open.length === 0
  ) {
    root.append(
      createDashboardEmpty(
        'Açıq borc hesabı yoxdur.'
      )
    );

    return;
  }


  open.forEach(
    account => {
      const profile =
        account.profiles;

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
            getInitials(
              profile?.first_name ||
              profile?.name ||
              '',
              profile?.last_name ||
              ''
            )
          )}
        </span>

        <span class="compact-list-item__content">

          <strong class="compact-list-item__title">
            ${
              escapeHtml(
                getProfileName(
                  profile
                )
              )
            }
          </strong>

          <span class="compact-list-item__meta">
            Borc hesabı
          </span>

        </span>

        <span class="compact-list-item__side">

          <strong class="text-warning">
            ${escapeHtml(
              money(
                debtBalance(
                  account
                )
              )
            )}
          </strong>

          <span>
            qalıb
          </span>

        </span>
      `;


      root.append(item);
    }
  );
}


// ============================================================
// 14. RECENT OPERATIONS
// Hazırda mövcud cədvəllərdən birləşdirilir.
// ============================================================

function renderDashboardRecentOperations() {
  const root =
    byId(
      'dashboard-recent-operations'
    );

  if (!root) return;

  clearElement(root);


  const operations = [];


  state.dashboard.sales
    .forEach(
      sale => {
        operations.push({
          type: 'sale',

          title:
            'Satış',

          meta:
            `${money(
              saleAmount(sale)
            )}`,

          date:
            sale.created_at,
        });
      }
    );


  state.dashboard.attendance
    .forEach(
      attendance => {
        operations.push({
          type: 'attendance',

          title:
            'Giriş qeydiyyatı',

          meta:
            getProfileName(
              attendance.profiles
            ),

          date:
            attendance.created_at,
        });
      }
    );


  state.dashboard.ledger
    .forEach(
      entry => {
        operations.push({
          type:
            ledgerType(entry),

          title:
            ledgerType(entry) ===
            'expense'
              ? 'Xərc'
              : 'Gəlir',

          meta:
            money(
              ledgerAmount(
                entry
              )
            ),

          date:
            entry.created_at,
        });
      }
    );


  operations
    .sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    )
    .slice(
      0,
      UI_CONFIG.history
        .dashboardLimit
    )
    .forEach(
      operation => {
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
                operation.title
              )}
            </strong>

            <span class="operation-item__meta">
              ${escapeHtml(
                operation.meta
              )}
            </span>

          </span>

          <span class="operation-item__side">

            <strong>
              ${formatDate(
                operation.date
              )}
            </strong>

            <span>
              ${formatTime(
                operation.date
              )}
            </span>

          </span>
        `;


        root.append(item);
      }
    );


  if (
    root.children.length === 0
  ) {
    root.append(
      createDashboardEmpty(
        'Əməliyyat tarixçəsi yoxdur.'
      )
    );
  }
}


// ============================================================
// 15. EMPTY ROW
// ============================================================

function createDashboardEmpty(
  message
) {
  const element =
    createElement(
      'div',
      {
        className:
          'compact-list-item',
      }
    );


  element.innerHTML = `
    <span class="compact-list-item__content">
      <span class="compact-list-item__meta">
        ${escapeHtml(message)}
      </span>
    </span>
  `;


  return element;
}


// ============================================================
// 16. DASHBOARD REFRESH
// ============================================================

function bindDashboardRefresh() {
  byId(
    'admin-dashboard-refresh'
  )?.addEventListener(
    'click',
    asyncHandler(
      async () => {
        await loadDashboard();

        notify.success(
          'Panel məlumatları yeniləndi.'
        );
      }
    )
  );
}


// ============================================================
// 17. PRODUCTS QUERY
// Digər tablar da eyni cache-dən istifadə edir.
// ============================================================

async function loadProducts() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.products
      )
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(
        UI_CONFIG.products
          .adminLimit
      );


  if (error) {
    console.error(
      'Admin products error:',
      error
    );

    notify.error(
      'Məhsullar yüklənmədi.'
    );

    state.products = [];

    return [];
  }


  state.products =
    rows(data);

  return state.products;
}


// ============================================================
// 18. MEMBERS QUERY
// ============================================================

async function loadMembers() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.profiles
      )
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1000);


  if (error) {
    console.error(
      'Members error:',
      error
    );

    notify.error(
      'İstifadəçilər yüklənmədi.'
    );

    state.members = [];

    return;
  }


  state.members =
    rows(data);

  renderMembers();
}


// ============================================================
// 19. MEMBERSHIPS QUERY
// ============================================================

async function loadMemberships() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.memberships
      )
      .select(`
        *,
        profiles (*),
        membership_plans (*)
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1000);


  if (error) {
    console.error(
      'Memberships error:',
      error
    );

    notify.error(
      'Üzvlüklər yüklənmədi.'
    );

    state.memberships = [];

    return;
  }


  state.memberships =
    rows(data);

  renderMemberships();
}


// ============================================================
// 20. MEMBERSHIP PLANS QUERY
// ============================================================

let membershipPlans = [];


async function loadMembershipPlans() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.membershipPlans
      )
      .select('*')
      .order(
        'created_at',
        {
          ascending: true,
        }
      );


  if (error) {
    console.error(
      'Membership plans error:',
      error
    );

    membershipPlans = [];

    return;
  }


  membershipPlans =
    rows(data);

  renderMembershipPlans();
}


// ============================================================
// 21. ATTENDANCE QUERY
// ============================================================

async function loadAttendance() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.attendance
      )
      .select(`
        *,
        profiles (*)
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(
        UI_CONFIG.attendance
          .adminHistoryLimit
      );


  if (error) {
    console.error(
      'Admin attendance error:',
      error
    );

    notify.error(
      'Giriş tarixçəsi yüklənmədi.'
    );

    state.attendance = [];

    return;
  }


  state.attendance =
    rows(data);

  renderAttendanceAdmin();
}


// ============================================================
// 22. DEBT QUERY
// ============================================================

async function loadDebts() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.debtAccounts
      )
      .select(`
        *,
        profiles (*)
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1000);


  if (error) {
    console.error(
      'Debt accounts error:',
      error
    );

    notify.error(
      'Borclar yüklənmədi.'
    );

    state.debts = [];

    return;
  }


  state.debts =
    rows(data);

  renderDebts();
}


// ============================================================
// 23. LEDGER QUERY
// ============================================================

async function loadLedger() {
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
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1500);


  if (error) {
    console.error(
      'Ledger error:',
      error
    );

    notify.error(
      'Maliyyə məlumatları yüklənmədi.'
    );

    state.ledger = [];

    return;
  }


  state.ledger =
    rows(data);

  renderFinance();
}


// ============================================================
// 24. STOCK MOVEMENTS QUERY
// ============================================================

async function loadStockMovements() {
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
        products (*)
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(500);


  if (error) {
    console.error(
      'Stock movements error:',
      error
    );

    state.stockMovements = [];

    return;
  }


  state.stockMovements =
    rows(data);
}


// ============================================================
// 25. TRAINERS QUERY
// ============================================================

async function loadTrainers() {
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
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(
        UI_CONFIG.trainers
          .adminLimit
      );


  if (error) {
    console.error(
      'Admin trainers error:',
      error
    );

    notify.error(
      'Məşqçilər yüklənmədi.'
    );

    state.trainers = [];

    return;
  }


  state.trainers =
    rows(data);

  renderAdminTrainers();
}


// ============================================================
// 26. INIT — HISSƏ 1 ÜÇÜN
// Tam init faylın son hissəsində çağırılacaq.
// ============================================================

async function initAdminBase() {
  const identity =
    await requireStaff();


  if (!identity) {
    return false;
  }


  state.identity =
    await initLayout();


  if (
    !state.identity?.isStaff
  ) {
    window.location.replace(
      APP_CONFIG.routes.home
    );

    return false;
  }


  renderOperator();

  bindTabEvents();

  bindDashboardRefresh();


  setActiveTab(
    state.activeTab,
    {
      persist: false,
      load: false,
    }
  );


  return true;
}


// ============================================================
// ADMIN.JS — HISSƏ 1/4 SONU
// ============================================================

// ============================================================
// 27. PRODUCT FIELD HELPERS
// Mövcud backend sütunlarını təhlükəsiz oxuyuruq.
// ============================================================

function productValue(
  product,
  candidates,
  fallback = null
) {
  if (!product) {
    return fallback;
  }

  for (const key of candidates) {
    if (
      Object.prototype.hasOwnProperty.call(
        product,
        key
      )
    ) {
      const value =
        product[key];

      if (
        value !== null &&
        value !== undefined
      ) {
        return value;
      }
    }
  }

  return fallback;
}


function productHasColumn(
  column
) {
  const sample =
    state.products[0];

  if (!sample) {
    return false;
  }

  return Object.prototype
    .hasOwnProperty.call(
      sample,
      column
    );
}


function productName(
  product
) {
  return normalizeString(
    productValue(
      product,
      ['name'],
      'Məhsul'
    )
  );
}


function productPrice(
  product
) {
  return normalizeNumber(
    productValue(
      product,
      [
        'price',
        'sale_price',
      ],
      0
    )
  );
}


function productImage(
  product
) {
  const value =
    normalizeString(
      productValue(
        product,
        [
          'image_url',
          'image',
          'image_path',
        ],
        ''
      )
    );


  if (!value) {
    return '';
  }


  if (
    value.startsWith(
      'https://'
    ) ||
    value.startsWith(
      'http://'
    )
  ) {
    return value;
  }


  return getPublicStorageUrl(
    APP_CONFIG.storage
      .productImages,
    value
  );
}


function productActive(
  product
) {
  const value =
    productValue(
      product,
      [
        'is_active',
        'active',
      ],
      true
    );

  return value !== false;
}


// ============================================================
// 28. POS FILTERED PRODUCTS
// ============================================================

function filteredPosProducts() {
  const input =
    byId(
      'pos-product-search'
    );

  const filter =
    byId(
      'pos-product-filter'
    );


  const search =
    normalizeString(
      input?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const mode =
    filter?.value ||
    'all';


  return state.products
    .filter(
      product =>
        productActive(product)
    )
    .filter(
      product => {
        if (!search) {
          return true;
        }

        return productName(
          product
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    )
    .filter(
      product => {
        const stock =
          productStock(
            product
          );

        if (
          mode === 'available'
        ) {
          return stock > 0;
        }

        if (
          mode === 'low'
        ) {
          return (
            stock > 0 &&
            stock <= 5
          );
        }

        return true;
      }
    );
}


// ============================================================
// 29. POS CARD
// ============================================================

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
          type: 'button',
          disabled:
            stock <= 0
              ? ''
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
              src="${escapeHtml(image)}"
              alt="${escapeHtml(
                productName(product)
              )}"
              loading="lazy"
            >
          `
          : `
            <span
              style="
                color:var(--brand);
                font-size:11px;
                font-weight:800;
              "
            >
              SK
            </span>
          `
      }

    </div>


    <div class="pos-product-card__body">

      <strong class="pos-product-card__name">
        ${escapeHtml(
          productName(product)
        )}
      </strong>

      <div class="pos-product-card__row">

        <span class="pos-product-card__price">
          ${escapeHtml(
            money(
              productPrice(
                product
              )
            )
          )}
        </span>

        <span class="pos-product-card__stock">
          ${number(stock)} stok
        </span>

      </div>

    </div>
  `;


  if (stock > 0) {
    card.addEventListener(
      'click',
      () => {
        openPosConfirmation(
          product,
          card
        );
      }
    );
  }


  return card;
}


// ============================================================
// 30. POS RENDER
// ============================================================

function renderPosProducts() {
  const root =
    byId(
      'pos-products-grid'
    );

  const empty =
    byId(
      'pos-products-empty'
    );


  if (!root) return;


  clearElement(root);


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
    empty.classList.toggle(
      'is-hidden',
      products.length > 0
    );
  }
}


// ============================================================
// 31. POS EVENTS
// ============================================================

function bindPosEvents() {
  const search =
    byId(
      'pos-product-search'
    );

  const filter =
    byId(
      'pos-product-filter'
    );


  search?.addEventListener(
    'input',
    debounce(
      renderPosProducts
    )
  );


  filter?.addEventListener(
    'change',
    renderPosProducts
  );
}


// ============================================================
// 32. POS CONFIRMATION
// ============================================================

function openPosConfirmation(
  product,
  trigger
) {
  const stock =
    productStock(
      product
    );

  const image =
    productImage(
      product
    );

  const content =
    createElement(
      'div',
      {
        className:
          'pos-confirm',
      }
    );


  content.innerHTML = `
    <div class="pos-confirm__product">

      <div class="pos-confirm__media">

        ${
          image
            ? `
              <img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(
                  productName(product)
                )}"
              >
            `
            : `
              <span
                style="
                  color:var(--brand);
                  font-weight:800;
                "
              >
                SK
              </span>
            `
        }

      </div>


      <div>

        <strong class="pos-confirm__name">
          ${escapeHtml(
            productName(product)
          )}
        </strong>

        <span class="pos-confirm__price">
          ${escapeHtml(
            money(
              productPrice(
                product
              )
            )
          )}
        </span>

        <span class="pos-confirm__stock">
          Stok: ${number(stock)}
        </span>

      </div>

    </div>


    <div class="pos-confirm__summary">

      <div class="pos-confirm__row">
        <span>Miqdar</span>
        <strong>1</strong>
      </div>

      <div class="pos-confirm__row">
        <span>Ödəniş</span>
        <strong>Ödənilib</strong>
      </div>

      <div class="pos-confirm__row pos-confirm__row--total">
        <span>Cəmi</span>

        <strong>
          ${escapeHtml(
            money(
              productPrice(
                product
              )
            )
          )}
        </strong>
      </div>

    </div>
  `;


  const footer =
    createElement(
      'div',
      {
        className:
          'modal-form__actions',
      }
    );


  const cancelButton =
    createElement(
      'button',
      {
        className:
          'ui-button ui-button--glass',

        text:
          'Ləğv et',

        attrs: {
          type: 'button',
        },
      }
    );


  const sellButton =
    createElement(
      'button',
      {
        className:
          'ui-button ui-button--primary',

        attrs: {
          type: 'button',
        },
      }
    );


  sellButton.innerHTML = `
    <span class="ui-button__label">
      Sat
    </span>

    <span
      class="ui-button__spinner is-hidden"
      aria-hidden="true"
    ></span>
  `;


  footer.append(
    cancelButton,
    sellButton
  );


  openModal({
    eyebrow:
      'POS',

    title:
      'Satışı təsdiqlə',

    content,

    footer,

    trigger,

    closeOnBackdrop:
      true,

    onOpen: () => {
      cancelButton.addEventListener(
        'click',
        closeModal
      );


      sellButton.addEventListener(
        'click',
        () => {
          executePosSale(
            product,
            sellButton
          );
        }
      );
    },
  });
}


// ============================================================
// 33. PROCESS SALE RPC
//
// process_sale() artıq backenddə mövcuddur.
// RPC parametr adlarını backenddəki funksiya müəyyən edir.
// Burada hazırkı qurduğumuz SQL sxeminə uyğun payload istifadə
// edirik. Test zamanı RPC signature fərqlidirsə yalnız payload
// uyğunlaşdırılacaq.
// ============================================================

async function executePosSale(
  product,
  button
) {
  if (state.busy) {
    return;
  }


  state.busy = true;


  setButtonLoading(
    button,
    true,
    {
      loadingText:
        'Satılır...',
    }
  );


  try {
    const payload = {
      p_items: [
        {
          product_id:
            product.id,

          quantity:
            1,
        },
      ],

      p_payment_status:
        'paid',
    };


    const {
      data,
      error,
    } =
      await supabase.rpc(
        RPC.processSale,
        payload
      );


    if (error) {
      throw error;
    }


    closeModal();


    notify.success(
      `${productName(
        product
      )} satıldı.`,
      'Satış tamamlandı'
    );


    await Promise.all([
      loadProducts(),

      state.activeTab ===
        'dashboard'
        ? loadDashboard()
        : Promise.resolve(),
    ]);


    renderPosProducts();


    window.dispatchEvent(
      new CustomEvent(
        'skyfit:admin-operation',
        {
          detail: {
            type:
              'sale',

            productId:
              product.id,

            operatorId:
              state.identity
                ?.profile
                ?.id,

            result:
              data,
          },
        }
      )
    );
  } catch (error) {
    console.error(
      'process_sale error:',
      error
    );


    notify.error(
      getErrorMessage(
        error,
        'Satış tamamlanmadı.'
      )
    );
  } finally {
    state.busy = false;

    setButtonLoading(
      button,
      false
    );
  }
}


// ============================================================
// 34. ADMIN PRODUCT FILTER
// ============================================================

function filteredAdminProducts() {
  const search =
    normalizeString(
      byId(
        'products-admin-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const status =
    byId(
      'products-admin-status'
    )?.value ||
    'all';


  return state.products
    .filter(
      product => {
        if (!search) {
          return true;
        }

        return productName(
          product
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    )
    .filter(
      product => {
        if (
          status === 'active'
        ) {
          return productActive(
            product
          );
        }

        if (
          status === 'inactive'
        ) {
          return !productActive(
            product
          );
        }

        return true;
      }
    );
}


// ============================================================
// 35. ADMIN PRODUCT CARD
// ============================================================

function createAdminProductCard(
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
    <div class="admin-product-card__media">

      ${
        image
          ? `
            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(
                productName(product)
              )}"
              loading="lazy"
            >
          `
          : `
            <span
              style="
                color:var(--brand);
                font-size:11px;
                font-weight:800;
              "
            >
              SK
            </span>
          `
      }

    </div>


    <div class="admin-product-card__body">

      <strong class="admin-product-card__name">
        ${escapeHtml(
          productName(product)
        )}
      </strong>

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
          ${number(stock)} stok
        </span>

      </div>

    </div>
  `;


  card.addEventListener(
    'click',
    () => {
      openProductEditor(
        product,
        card
      );
    }
  );


  return card;
}


// ============================================================
// 36. ADMIN PRODUCT RENDER
// ============================================================

function renderAdminProducts() {
  const root =
    byId(
      'admin-products-grid'
    );

  if (!root) return;


  clearElement(root);


  filteredAdminProducts()
    .forEach(
      product => {
        root.append(
          createAdminProductCard(
            product
          )
        );
      }
    );
}


// ============================================================
// 37. PRODUCT EVENTS
// ============================================================

function bindProductAdminEvents() {
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
    debounce(
      renderAdminProducts
    )
  );


  byId(
    'products-admin-status'
  )?.addEventListener(
    'change',
    renderAdminProducts
  );
}


// ============================================================
// 38. PRODUCT EDITOR
// ============================================================

function openProductEditor(
  product = null,
  trigger = null
) {
  const editing =
    Boolean(product);


  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'admin-product-form',

          novalidate: '',
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
          maxlength="150"
          value="${escapeHtml(
            productName(
              product
            ) === 'Məhsul' &&
            !editing
              ? ''
              : productName(
                  product
                )
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
          for="admin-product-price"
        >
          Qiymət
        </label>

        <div class="ui-input">

          <input
            id="admin-product-price"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            value="${
              editing
                ? productPrice(
                    product
                  )
                : ''
            }"
            placeholder="0.00"
          >

        </div>

        <span
          id="admin-product-price-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>


      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-unit"
        >
          Ölçü vahidi
        </label>

        <div class="ui-input">

          <input
            id="admin-product-unit"
            class="ui-input__control"
            type="text"
            maxlength="30"
            value="${escapeHtml(
              normalizeString(
                productValue(
                  product,
                  ['unit'],
                  ''
                )
              )
            )}"
            placeholder="ədəd"
          >

        </div>

      </div>

    </div>


    ${
      productHasColumn(
        'description'
      ) ||
      !editing
        ? `
          <div class="ui-field">

            <label
              class="ui-field__label"
              for="admin-product-description"
            >
              Açıqlama
            </label>

            <div class="ui-input">

              <input
                id="admin-product-description"
                class="ui-input__control"
                type="text"
                maxlength="500"
                value="${escapeHtml(
                  normalizeString(
                    product?.description
                  )
                )}"
                placeholder="Qısa açıqlama"
              >

            </div>

          </div>
        `
        : ''
    }


    <label class="ui-upload">

      <input
        id="admin-product-image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
      >

      <span>

        <span class="ui-upload__icon">
          SK
        </span>

        <strong class="ui-upload__title">
          ${
            editing
              ? 'Şəkli dəyiş'
              : 'Məhsul şəkli'
          }
        </strong>

        <span class="ui-upload__meta">
          PNG, JPG və ya WEBP
        </span>

      </span>

    </label>


    <button
      id="admin-product-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        ${
          editing
            ? 'Yadda saxla'
            : 'Məhsul əlavə et'
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
      'Kataloq',

    title:
      editing
        ? 'Məhsulu redaktə et'
        : 'Yeni məhsul',

    content,

    trigger,

    onOpen: () => {
      bindProductForm(
        content,
        product
      );
    },
  });
}


// ============================================================
// 39. PRODUCT UPDATE PAYLOAD
// ============================================================

function buildProductPayload({
  product,
  name,
  price,
  unit,
  description,
}) {
  const payload = {};


  // Yeni məhsul üçün bu əsas sütunların
  // mövcud backenddə olduğu artıq homepage testindən təsdiqlənib.
  payload.name =
    name;

  payload.price =
    price;


  if (
    !product ||
    productHasColumn(
      'unit'
    )
  ) {
    payload.unit =
      unit || null;
  }


  if (
    (
      !product &&
      productHasColumn(
        'description'
      )
    ) ||
    (
      product &&
      Object.prototype
        .hasOwnProperty.call(
          product,
          'description'
        )
    )
  ) {
    payload.description =
      description || null;
  }


  if (
    !product &&
    productHasColumn(
      'is_active'
    )
  ) {
    payload.is_active =
      true;
  }


  return payload;
}


// ============================================================
// 40. PRODUCT FORM
// ============================================================

function bindProductForm(
  form,
  product
) {
  const nameInput =
    $('#admin-product-name', form);

  const priceInput =
    $('#admin-product-price', form);

  const unitInput =
    $('#admin-product-unit', form);

  const descriptionInput =
    $(
      '#admin-product-description',
      form
    );

  const imageInput =
    $('#admin-product-image', form);

  const nameError =
    $('#admin-product-name-error', form);

  const priceError =
    $('#admin-product-price-error', form);

  const submit =
    $('#admin-product-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const name =
        normalizeString(
          nameInput?.value
        );

      const price =
        normalizeNumber(
          priceInput?.value,
          -1
        );

      const unit =
        normalizeString(
          unitInput?.value
        );

      const description =
        normalizeString(
          descriptionInput?.value
        );


      let valid = true;


      if (
        name.length < 2
      ) {
        setFieldError(
          nameInput,
          nameError,
          'Məhsul adı minimum 2 simvol olmalıdır.'
        );

        valid = false;
      }


      if (price < 0) {
        setFieldError(
          priceInput,
          priceError,
          'Qiymət düzgün deyil.'
        );

        valid = false;
      }


      if (!valid) {
        return;
      }


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
        const payload =
          buildProductPayload({
            product,
            name,
            price,
            unit,
            description,
          });


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
              .update(payload)
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
              .insert(payload)
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
          imageFile &&
          savedProduct?.id
        ) {
          savedProduct =
            await uploadProductImage(
              savedProduct,
              imageFile
            );
        }


        notify.success(
          product
            ? 'Məhsul yeniləndi.'
            : 'Məhsul əlavə edildi.'
        );


        closeModal();


        await loadProducts();


        renderAdminProducts();

        renderPosProducts();
      } catch (error) {
        console.error(
          'Product save error:',
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


// ============================================================
// 41. PRODUCT IMAGE COLUMN
// ============================================================

function productImageColumn(
  product
) {
  const candidates = [
    'image_url',
    'image_path',
    'image',
  ];


  return (
    candidates.find(
      key =>
        Object.prototype
          .hasOwnProperty.call(
            product,
            key
          )
    ) ||
    null
  );
}


// ============================================================
// 42. PRODUCT IMAGE UPLOAD
// ============================================================

async function uploadProductImage(
  product,
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
      file.type
    )
  ) {
    throw new Error(
      'Məhsul şəkli JPG, PNG və ya WEBP olmalıdır.'
    );
  }


  const column =
    productImageColumn(
      product
    );


  if (!column) {
    notify.warning(
      'products cədvəlində şəkil üçün uyğun sütun tapılmadı.'
    );

    return product;
  }


  const extension =
    file.type ===
      'image/png'
      ? 'png'
      : file.type ===
          'image/webp'
        ? 'webp'
        : 'jpg';


  const path =
    `${product.id}/${Date.now()}.${extension}`;


  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(
        APP_CONFIG.storage
          .productImages
      )
      .upload(
        path,
        file,
        {
          upsert: true,
          contentType:
            file.type,
          cacheControl:
            '3600',
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
        TABLES.products
      )
      .update({
        [column]:
          path,
      })
      .eq(
        'id',
        product.id
      )
      .select('*')
      .single();


  if (error) {
    throw error;
  }


  return data;
}


// ============================================================
// 43. STOCK FILTER
// ============================================================

function filteredStockProducts() {
  const search =
    normalizeString(
      byId(
        'stock-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const filter =
    byId(
      'stock-filter'
    )?.value ||
    'all';


  return state.products
    .filter(
      product => {
        if (!search) {
          return true;
        }

        return productName(
          product
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    )
    .filter(
      product => {
        const stock =
          productStock(
            product
          );

        if (
          filter === 'low'
        ) {
          return (
            stock > 0 &&
            stock <= 5
          );
        }


        if (
          filter === 'empty'
        ) {
          return stock <= 0;
        }


        return true;
      }
    );
}


// ============================================================
// 44. STOCK RENDER
// ============================================================

function renderStock() {
  renderStockProducts();

  renderStockMovements();
}


function renderStockProducts() {
  const root =
    byId(
      'stock-list'
    );


  if (!root) return;


  clearElement(root);


  const list =
    createElement(
      'div',
      {
        className:
          'admin-mobile-list',
      }
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
        <th>Stok</th>
        <th>Vəziyyət</th>
        <th></th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  filteredStockProducts()
    .forEach(
      product => {
        const stock =
          productStock(
            product
          );

        const meta =
          stockStatusMeta(
            stock
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
          </td>

          <td>
            ${number(stock)}
          </td>

          <td>
            <span class="${meta.className}">
              ${meta.label}
            </span>
          </td>

          <td>
            <div class="admin-table__actions">

              <button
                class="admin-row-action"
                type="button"
                data-stock-add="${escapeHtml(
                  product.id
                )}"
                aria-label="Stok artır"
              >
                +
              </button>

            </div>
          </td>
        `;


        tbody?.append(row);


        const mobile =
          createElement(
            'article',
            {
              className:
                'admin-mobile-row',
            }
          );


        mobile.innerHTML = `
          <div class="admin-mobile-row__top">

            <div class="admin-mobile-row__identity">

              <strong class="admin-mobile-row__title">
                ${escapeHtml(
                  productName(
                    product
                  )
                )}
              </strong>

              <span class="admin-mobile-row__meta">
                ${meta.label}
              </span>

            </div>


            <button
              class="ui-button ui-button--glass"
              type="button"
              data-stock-add="${escapeHtml(
                product.id
              )}"
            >
              <span class="ui-button__label">
                + Stok
              </span>
            </button>

          </div>


          <div class="admin-mobile-row__details">

            <div class="admin-mobile-row__detail">
              <span>Stok</span>
              <strong>${number(stock)}</strong>
            </div>

            <div class="admin-mobile-row__detail">
              <span>Qiymət</span>
              <strong>
                ${escapeHtml(
                  money(
                    productPrice(
                      product
                    )
                  )
                )}
              </strong>
            </div>

          </div>
        `;


        list.append(mobile);
      }
    );


  root.append(
    table,
    list
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
                String(item.id) ===
                String(
                  button.dataset
                    .stockAdd
                )
            );


          if (product) {
            openStockModal(
              product,
              button
            );
          }
        }
      );
    }
  );
}


// ============================================================
// 45. STOCK MOVEMENTS RENDER
// ============================================================

function renderStockMovements() {
  const root =
    byId(
      'stock-movements-list'
    );


  if (!root) return;


  clearElement(root);


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
        <th>Miqdar</th>
        <th>Növ</th>
        <th>Tarix</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  state.stockMovements
    .slice(0, 100)
    .forEach(
      movement => {
        const quantity =
          normalizeNumber(
            movement.quantity ??
            movement.amount ??
            movement.qty
          );


        const type =
          normalizeString(
            movement.type ??
            movement.movement_type ??
            movement.reason,
            '—'
          );


        const row =
          createElement(
            'tr'
          );


        row.innerHTML = `
          <td>
            <strong class="admin-table__primary">
              ${escapeHtml(
                movement.products?.name ||
                'Məhsul'
              )}
            </strong>
          </td>

          <td>
            ${number(quantity)}
          </td>

          <td>
            ${escapeHtml(type)}
          </td>

          <td>
            ${formatDateTime(
              movement.created_at
            )}
          </td>
        `;


        tbody?.append(row);
      }
    );


  root.append(table);
}


// ============================================================
// 46. STOCK MODAL
// ============================================================

function openStockModal(
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
            'stock-add-form',

          novalidate: '',
        },
      }
    );


  content.innerHTML = `
    <div
      class="pos-confirm__summary"
    >

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
          ${number(
            productStock(
              product
            )
          )}
        </strong>
      </div>

    </div>


    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-add-quantity"
        >
          Əlavə ediləcək miqdar
        </label>

        <div class="ui-input">

          <input
            id="stock-add-quantity"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0"
          >

        </div>

        <span
          id="stock-add-quantity-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>


      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-add-cost"
        >
          Alış məbləği
        </label>

        <div class="ui-input">

          <input
            id="stock-add-cost"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
          >

        </div>

      </div>

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

    onOpen: () => {
      bindStockForm(
        content,
        product
      );
    },
  });
}


// ============================================================
// 47. ADD STOCK RPC
// ============================================================

function bindStockForm(
  form,
  product
) {
  const quantityInput =
    $('#stock-add-quantity', form);

  const costInput =
    $('#stock-add-cost', form);

  const quantityError =
    $('#stock-add-quantity-error', form);

  const submit =
    $('#stock-add-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const quantity =
        normalizeNumber(
          quantityInput?.value,
          0
        );

      const cost =
        normalizeNumber(
          costInput?.value,
          0
        );


      if (quantity <= 0) {
        setFieldError(
          quantityInput,
          quantityError,
          'Miqdar 0-dan böyük olmalıdır.'
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
            RPC.addStock,
            {
              p_product_id:
                product.id,

              p_quantity:
                quantity,

              p_cost:
                cost,
            }
          );


        if (error) {
          throw error;
        }


        closeModal();


        notify.success(
          'Stok uğurla artırıldı.'
        );


        await Promise.all([
          loadProducts(),
          loadStockMovements(),
        ]);


        renderStock();

        renderPosProducts();
      } catch (error) {
        console.error(
          'add_stock error:',
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


// ============================================================
// 48. STOCK EVENTS
// ============================================================

function bindStockEvents() {
  byId(
    'stock-add-button'
  )?.addEventListener(
    'click',
    () => {
      if (
        state.products.length ===
        0
      ) {
        notify.warning(
          'Əvvəlcə məhsul əlavə et.'
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
    debounce(
      renderStockProducts
    )
  );


  byId(
    'stock-filter'
  )?.addEventListener(
    'change',
    renderStockProducts
  );
}


// ============================================================
// 49. STOCK PRODUCT PICKER
// ============================================================

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
    .slice(0, 200)
    .forEach(
      product => {
        const button =
          createElement(
            'button',
            {
              className:
                'compact-list-item',

              attrs: {
                type: 'button',
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
              Stok:
              ${number(
                productStock(
                  product
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
                openStockModal(
                  product
                );
              },
              380
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


// ============================================================
// 50. QUICK ACTION
// ============================================================

function bindQuickAction() {
  byId(
    'admin-quick-action-button'
  )?.addEventListener(
    'click',
    () => {
      setActiveTab(
        'pos'
      );
    }
  );
}


// ============================================================
// 51. GLOBAL SEARCH
// ============================================================

function bindGlobalSearch() {
  byId(
    'admin-global-search-button'
  )?.addEventListener(
    'click',
    () => {
      openGlobalSearch();
    }
  );
}


function openGlobalSearch() {
  const content =
    createElement(
      'div',
      {
        className:
          'modal-form',
      }
    );


  content.innerHTML = `
    <label
      class="ui-search"
      for="admin-global-search-input"
    >

      <span class="ui-search__icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="11"
            cy="11"
            r="6"
            stroke="currentColor"
            stroke-width="1.8"
          />

          <path
            d="m16 16 4 4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </span>

      <input
        id="admin-global-search-input"
        class="ui-search__input"
        type="search"
        placeholder="Məhsul və ya üzv axtar"
        autocomplete="off"
      >

    </label>

    <div
      id="admin-global-search-results"
      class="compact-list"
    ></div>
  `;


  openModal({
    eyebrow:
      'SKy Fit Pro',

    title:
      'Sürətli axtarış',

    content,

    onOpen: () => {
      bindGlobalSearchInput(
        content
      );
    },
  });
}


function bindGlobalSearchInput(
  root
) {
  const input =
    $('#admin-global-search-input', root);

  const results =
    $('#admin-global-search-results', root);


  const render =
    debounce(
      async () => {
        const search =
          normalizeString(
            input?.value
          )
            .toLocaleLowerCase(
              'az-AZ'
            );


        clearElement(
          results
        );


        if (
          search.length < 2
        ) {
          return;
        }


        if (
          state.products.length ===
          0
        ) {
          await loadProducts();
        }


        if (
          state.members.length ===
          0
        ) {
          await loadMembers();
        }


        const products =
          state.products
            .filter(
              product =>
                productName(
                  product
                )
                  .toLocaleLowerCase(
                    'az-AZ'
                  )
                  .includes(
                    search
                  )
            )
            .slice(0, 5);


        const members =
          state.members
            .filter(
              member => {
                const text =
                  [
                    member.first_name,
                    member.last_name,
                    member.name,
                    member.phone,
                    member.email,
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
            .slice(0, 5);


        products.forEach(
          product => {
            const item =
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
                  Məhsul ·
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


            item.addEventListener(
              'click',
              () => {
                closeModal();

                setActiveTab(
                  'products'
                );


                setTimeout(
                  () => {
                    openProductEditor(
                      product
                    );
                  },
                  380
                );
              }
            );


            results.append(
              item
            );
          }
        );


        members.forEach(
          member => {
            const item =
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


            item.innerHTML = `
              <span class="compact-list-item__icon">
                ${escapeHtml(
                  getInitials(
                    member.first_name ||
                    member.name ||
                    '',
                    member.last_name ||
                    ''
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
                  Üzv
                </span>

              </span>
            `;


            item.addEventListener(
              'click',
              () => {
                closeModal();

                setActiveTab(
                  'members'
                );
              }
            );


            results.append(
              item
            );
          }
        );
      }
    );


  input?.addEventListener(
    'input',
    render
  );


  input?.focus();
}


// ============================================================
// ADMIN.JS — HISSƏ 2/4 SONU
// ============================================================

// ============================================================
// 52. MEMBERS FILTER
// ============================================================

function filteredMembers() {
  const search =
    normalizeString(
      byId(
        'members-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const role =
    byId(
      'members-role-filter'
    )?.value ||
    'all';


  return state.members
    .filter(
      member => {
        if (!search) {
          return true;
        }

        const text =
          [
            member.first_name,
            member.last_name,
            member.name,
            member.email,
            member.phone,
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
        if (role === 'all') {
          return true;
        }

        return (
          normalizeString(
            member.role
          ) === role
        );
      }
    );
}


// ============================================================
// 53. MEMBERS RENDER
// ============================================================

function renderMembers() {
  const root =
    byId(
      'members-list'
    );

  if (!root) return;


  clearElement(root);


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
        <th>Tarix</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  const mobile =
    createElement(
      'div',
      {
        className:
          'admin-mobile-list',
      }
    );


  filteredMembers()
    .forEach(
      member => {
        const name =
          getProfileName(
            member
          );

        const role =
          roleLabel(
            member.role
          );

        const phone =
          normalizeString(
            member.phone,
            '—'
          );


        const row =
          createElement(
            'tr'
          );


        row.innerHTML = `
          <td>
            <strong class="admin-table__primary">
              ${escapeHtml(name)}
            </strong>

            <span class="admin-table__secondary">
              ${escapeHtml(
                member.email ||
                ''
              )}
            </span>
          </td>

          <td>
            ${escapeHtml(phone)}
          </td>

          <td>
            ${escapeHtml(role)}
          </td>

          <td>
            ${formatDate(
              member.created_at
            )}
          </td>
        `;


        tbody?.append(row);


        const card =
          createElement(
            'article',
            {
              className:
                'admin-mobile-row',
            }
          );


        card.innerHTML = `
          <div class="admin-mobile-row__top">

            <div class="admin-mobile-row__identity">

              <strong class="admin-mobile-row__title">
                ${escapeHtml(name)}
              </strong>

              <span class="admin-mobile-row__meta">
                ${escapeHtml(role)}
              </span>

            </div>

          </div>


          <div class="admin-mobile-row__details">

            <div class="admin-mobile-row__detail">
              <span>Telefon</span>
              <strong>${escapeHtml(phone)}</strong>
            </div>

            <div class="admin-mobile-row__detail">
              <span>E-poçt</span>
              <strong>
                ${escapeHtml(
                  member.email ||
                  '—'
                )}
              </strong>
            </div>

          </div>
        `;


        mobile.append(card);
      }
    );


  root.append(
    table,
    mobile
  );
}


// ============================================================
// 54. MEMBER EVENTS
// ============================================================

function bindMemberEvents() {
  byId(
    'members-search'
  )?.addEventListener(
    'input',
    debounce(
      renderMembers
    )
  );


  byId(
    'members-role-filter'
  )?.addEventListener(
    'change',
    renderMembers
  );
}


// ============================================================
// 55. MEMBERSHIP FILTER
// ============================================================

function filteredMemberships() {
  const search =
    normalizeString(
      byId(
        'memberships-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const statusFilter =
    byId(
      'memberships-status-filter'
    )?.value ||
    'all';


  return state.memberships
    .filter(
      membership => {
        if (!search) {
          return true;
        }

        const profile =
          membership.profiles;

        return getProfileName(
          profile
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    )
    .filter(
      membership => {
        if (
          statusFilter ===
          'all'
        ) {
          return true;
        }

        const meta =
          membershipStatus({
            status:
              membership.status,

            endDate:
              membershipEndDate(
                membership
              ),
          });

        return (
          meta.value ===
          statusFilter
        );
      }
    );
}


// ============================================================
// 56. MEMBERSHIPS RENDER
// ============================================================

function renderMemberships() {
  const root =
    byId(
      'memberships-list'
    );

  if (!root) return;


  clearElement(root);


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
        <th>Başlanğıc</th>
        <th>Bitmə</th>
        <th>Status</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  filteredMemberships()
    .forEach(
      membership => {
        const profile =
          membership.profiles;

        const plan =
          membership
            .membership_plans;

        const meta =
          membershipStatus({
            status:
              membership.status,

            endDate:
              membershipEndDate(
                membership
              ),
          });


        const row =
          createElement(
            'tr'
          );


        row.innerHTML = `
          <td>
            <strong class="admin-table__primary">
              ${escapeHtml(
                getProfileName(
                  profile
                )
              )}
            </strong>
          </td>

          <td>
            ${escapeHtml(
              plan?.name ||
              'Üzvlük'
            )}
          </td>

          <td>
            ${formatDate(
              membership.start_date
            )}
          </td>

          <td>
            ${formatDate(
              membershipEndDate(
                membership
              )
            )}
          </td>

          <td>
            <span class="${meta.className}">
              ${meta.label}
            </span>
          </td>
        `;


        tbody?.append(row);
      }
    );


  root.append(table);
}


// ============================================================
// 57. MEMBERSHIP EVENTS
// ============================================================

function bindMembershipEvents() {
  byId(
    'memberships-search'
  )?.addEventListener(
    'input',
    debounce(
      renderMemberships
    )
  );


  byId(
    'memberships-status-filter'
  )?.addEventListener(
    'change',
    renderMemberships
  );


  byId(
    'membership-create-button'
  )?.addEventListener(
    'click',
    () => {
      openMembershipCreateModal();
    }
  );
}


// ============================================================
// 58. MEMBERSHIP PLAN RENDER
// ============================================================

function renderMembershipPlans() {
  const root =
    byId(
      'membership-plans-grid'
    );

  if (!root) return;


  clearElement(root);


  membershipPlans.forEach(
    plan => {
      const card =
        createElement(
          'article',
          {
            className:
              'admin-setting-card',
          }
        );


      card.innerHTML = `
        <strong class="admin-setting-card__title">
          ${escapeHtml(
            plan.name ||
            'Plan'
          )}
        </strong>

        <span class="admin-setting-card__meta">
          ${
            normalizeNumber(
              plan.duration_days
            )
          } gün
        </span>

        <strong class="admin-setting-card__price">
          ${escapeHtml(
            money(
              plan.price
            )
          )}
        </strong>

        <div class="admin-setting-card__actions">

          <button
            class="ui-button ui-button--glass"
            type="button"
            data-membership-plan-edit="${escapeHtml(
              plan.id
            )}"
          >
            <span class="ui-button__label">
              Redaktə et
            </span>
          </button>

        </div>
      `;


      root.append(card);
    }
  );


  $$(
    '[data-membership-plan-edit]',
    root
  ).forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          const plan =
            membershipPlans.find(
              item =>
                String(item.id) ===
                String(
                  button.dataset
                    .membershipPlanEdit
                )
            );


          if (plan) {
            openMembershipPlanEditor(
              plan,
              button
            );
          }
        }
      );
    }
  );
}


// ============================================================
// 59. MEMBERSHIP PLAN EDITOR
// ============================================================

function openMembershipPlanEditor(
  plan,
  trigger
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

          novalidate: '',
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
            min="0"
            step="0.01"
            value="${normalizeNumber(
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
            min="1"
            step="1"
            value="${normalizeNumber(
              plan.duration_days
            )}"
          >

        </div>

      </div>

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
      ></span>

    </button>
  `;


  openModal({
    eyebrow:
      'Üzvlük planı',

    title:
      plan.name ||
      'Plan',

    content,

    trigger,

    onOpen: () => {
      bindMembershipPlanForm(
        content,
        plan
      );
    },
  });
}


// ============================================================
// 60. MEMBERSHIP PLAN UPDATE
// ============================================================

function bindMembershipPlanForm(
  form,
  plan
) {
  const nameInput =
    $('#membership-plan-name', form);

  const priceInput =
    $('#membership-plan-price', form);

  const durationInput =
    $('#membership-plan-duration', form);

  const submit =
    $('#membership-plan-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const name =
        normalizeString(
          nameInput?.value
        );

      const price =
        normalizeNumber(
          priceInput?.value,
          -1
        );

      const duration =
        normalizeNumber(
          durationInput?.value,
          0
        );


      if (
        name.length < 2 ||
        price < 0 ||
        duration <= 0
      ) {
        notify.warning(
          'Plan məlumatlarını düzgün daxil et.'
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


        await loadMembershipPlans();
      } catch (error) {
        notify.error(
          getErrorMessage(error)
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


// ============================================================
// 61. MEMBERSHIP CREATE MODAL
// ============================================================

async function openMembershipCreateModal() {
  if (
    state.members.length ===
    0
  ) {
    await loadMembers();
  }


  if (
    membershipPlans.length ===
    0
  ) {
    await loadMembershipPlans();
  }


  const memberOptions =
    state.members
      .filter(
        member =>
          normalizeString(
            member.role
          ) ===
          USER_ROLES.MEMBER
      )
      .map(
        member => `
          <option
            value="${escapeHtml(
              member.id
            )}"
          >
            ${escapeHtml(
              getProfileName(
                member
              )
            )}
          </option>
        `
      )
      .join('');


  const planOptions =
    membershipPlans
      .map(
        plan => `
          <option
            value="${escapeHtml(
              plan.id
            )}"
          >
            ${escapeHtml(
              plan.name
            )} —
            ${escapeHtml(
              money(
                plan.price
              )
            )}
          </option>
        `
      )
      .join('');


  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'membership-create-form',

          novalidate: '',
        },
      }
    );


  content.innerHTML = `
    <div class="ui-field">

      <label class="ui-field__label">
        Üzv
      </label>

      <select
        id="membership-member"
        class="ui-select"
      >
        <option value="">
          Üzv seç
        </option>

        ${memberOptions}
      </select>

    </div>


    <div class="ui-field">

      <label class="ui-field__label">
        Plan
      </label>

      <select
        id="membership-plan"
        class="ui-select"
      >
        <option value="">
          Plan seç
        </option>

        ${planOptions}
      </select>

    </div>


    <div class="ui-field">

      <label class="ui-field__label">
        Ödəniş
      </label>

      <select
        id="membership-payment-status"
        class="ui-select"
      >
        <option value="paid">
          Ödənilib
        </option>

        <option value="debt">
          Borc
        </option>
      </select>

    </div>


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
      ></span>

    </button>
  `;


  openModal({
    eyebrow:
      'Üzvlük',

    title:
      'Yeni üzvlük',

    content,

    onOpen: () => {
      bindMembershipCreateForm(
        content
      );
    },
  });
}


// ============================================================
// 62. CREATE MEMBERSHIP RPC
// ============================================================

function bindMembershipCreateForm(
  form
) {
  const memberInput =
    $('#membership-member', form);

  const planInput =
    $('#membership-plan', form);

  const paymentInput =
    $('#membership-payment-status', form);

  const submit =
    $('#membership-create-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const profileId =
        memberInput?.value;

      const planId =
        planInput?.value;

      const paymentStatus =
        paymentInput?.value ||
        'paid';


      if (
        !profileId ||
        !planId
      ) {
        notify.warning(
          'Üzv və plan seç.'
        );

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
          error,
        } =
          await supabase.rpc(
            RPC.createMembership,
            {
              p_profile_id:
                profileId,

              p_plan_id:
                planId,

              p_payment_status:
                paymentStatus,
            }
          );


        if (error) {
          throw error;
        }


        closeModal();


        notify.success(
          'Üzvlük yaradıldı.'
        );


        await loadMemberships();

        await loadDashboard();
      } catch (error) {
        console.error(
          'create_membership error:',
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


// ============================================================
// 63. ATTENDANCE RENDER
// ============================================================

function renderAttendanceAdmin() {
  const root =
    byId(
      'attendance-list'
    );

  if (!root) return;


  clearElement(root);


  const today =
    state.attendance.filter(
      item => {
        const date =
          new Date(
            item.created_at
          );

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
    );


  setText(
    byId(
      'attendance-today-count'
    ),
    today.length
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
        <th>Tarix</th>
        <th>Saat</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  state.attendance
    .filter(
      item => {
        const search =
          normalizeString(
            byId(
              'attendance-search'
            )?.value
          )
            .toLocaleLowerCase(
              'az-AZ'
            );


        if (!search) {
          return true;
        }


        return getProfileName(
          item.profiles
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    )
    .forEach(
      item => {
        const row =
          createElement(
            'tr'
          );


        row.innerHTML = `
          <td>
            <strong class="admin-table__primary">
              ${escapeHtml(
                getProfileName(
                  item.profiles
                )
              )}
            </strong>
          </td>

          <td>
            ${formatDate(
              item.created_at
            )}
          </td>

          <td>
            ${formatTime(
              item.created_at
            )}
          </td>
        `;


        tbody?.append(row);
      }
    );


  root.append(table);
}


// ============================================================
// 64. ATTENDANCE EVENTS
// ============================================================

function bindAttendanceAdminEvents() {
  byId(
    'attendance-create-button'
  )?.addEventListener(
    'click',
    async () => {
      await openAttendanceModal();
    }
  );


  byId(
    'attendance-search'
  )?.addEventListener(
    'input',
    debounce(
      renderAttendanceAdmin
    )
  );
}


// ============================================================
// 65. ATTENDANCE MODAL
// ============================================================

async function openAttendanceModal() {
  if (
    state.members.length ===
    0
  ) {
    await loadMembers();
  }


  const options =
    state.members
      .filter(
        member =>
          normalizeString(
            member.role
          ) ===
          USER_ROLES.MEMBER
      )
      .map(
        member => `
          <option value="${escapeHtml(
            member.id
          )}">
            ${escapeHtml(
              getProfileName(
                member
              )
            )}
          </option>
        `
      )
      .join('');


  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'attendance-create-form',
        },
      }
    );


  content.innerHTML = `
    <div class="ui-field">

      <label class="ui-field__label">
        Üzv
      </label>

      <select
        id="attendance-member"
        class="ui-select"
      >
        <option value="">
          Üzv seç
        </option>

        ${options}
      </select>

    </div>


    <button
      id="attendance-create-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Giriş qeyd et
      </span>

      <span
        class="ui-button__spinner is-hidden"
      ></span>

    </button>
  `;


  openModal({
    eyebrow:
      'Giriş',

    title:
      'Giriş qeydiyyatı',

    content,

    onOpen: () => {
      bindAttendanceCreateForm(
        content
      );
    },
  });
}


// ============================================================
// 66. RECORD ATTENDANCE RPC
// ============================================================

function bindAttendanceCreateForm(
  form
) {
  const memberInput =
    $('#attendance-member', form);

  const submit =
    $('#attendance-create-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const profileId =
        memberInput?.value;


      if (!profileId) {
        notify.warning(
          'Üzv seç.'
        );

        return;
      }


      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Qeyd olunur...',
        }
      );


      try {
        const {
          error,
        } =
          await supabase.rpc(
            RPC.recordAttendance,
            {
              p_profile_id:
                profileId,
            }
          );


        if (error) {
          throw error;
        }


        closeModal();


        notify.success(
          'Giriş qeydiyyatı tamamlandı.'
        );


        await loadAttendance();

        await loadDashboard();
      } catch (error) {
        console.error(
          'record_attendance error:',
          error
        );


        notify.error(
          getErrorMessage(
            error,
            'Giriş qeydiyyatı alınmadı.'
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


// ============================================================
// 67. DEBTS RENDER
// ============================================================

function renderDebts() {
  const root =
    byId(
      'debt-accounts-list'
    );

  if (!root) return;


  clearElement(root);


  const filtered =
    state.debts.filter(
      account => {
        const search =
          normalizeString(
            byId(
              'debt-search'
            )?.value
          )
            .toLocaleLowerCase(
              'az-AZ'
            );


        if (!search) {
          return true;
        }


        return getProfileName(
          account.profiles
        )
          .toLocaleLowerCase(
            'az-AZ'
          )
          .includes(search);
      }
    );


  const total =
    filtered.reduce(
      (
        sum,
        account
      ) =>
        sum +
        debtBalance(account),
      0
    );


  setText(
    byId(
      'debt-total-amount'
    ),
    number(total)
  );


  setText(
    byId(
      'debt-open-count'
    ),
    filtered.filter(
      account =>
        debtBalance(account) >
        0
    ).length
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
        <th>Şəxs</th>
        <th>Borc</th>
        <th>Tarix</th>
        <th></th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  filtered.forEach(
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
                account.profiles
              )
            )}
          </strong>
        </td>

        <td>
          <span class="finance-amount ${
            balance > 0
              ? 'finance-amount--expense'
              : ''
          }">
            ${escapeHtml(
              money(balance)
            )}
          </span>
        </td>

        <td>
          ${formatDate(
            account.created_at
          )}
        </td>

        <td>
          ${
            balance > 0
              ? `
                <button
                  type="button"
                  class="ui-button ui-button--glass"
                  data-debt-pay="${escapeHtml(
                    account.id
                  )}"
                >
                  <span class="ui-button__label">
                    Ödə
                  </span>
                </button>
              `
              : ''
          }
        </td>
      `;


      tbody?.append(row);
    }
  );


  root.append(table);


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
                String(item.id) ===
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
}


// ============================================================
// 68. DEBT EVENTS
// ============================================================

function bindDebtEvents() {
  byId(
    'debt-search'
  )?.addEventListener(
    'input',
    debounce(
      renderDebts
    )
  );
}


// ============================================================
// 69. DEBT PAYMENT MODAL
// ============================================================

function openDebtPaymentModal(
  account,
  trigger
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
        },
      }
    );


  content.innerHTML = `
    <div class="pos-confirm__summary">

      <div class="pos-confirm__row">

        <span>Şəxs</span>

        <strong>
          ${escapeHtml(
            getProfileName(
              account.profiles
            )
          )}
        </strong>

      </div>

      <div class="pos-confirm__row pos-confirm__row--total">

        <span>Cari borc</span>

        <strong>
          ${escapeHtml(
            money(balance)
          )}
        </strong>

      </div>

    </div>


    <div class="ui-field">

      <label class="ui-field__label">
        Ödəniş məbləği
      </label>

      <div class="ui-input">

        <input
          id="debt-payment-amount"
          class="ui-input__control"
          type="number"
          min="0.01"
          max="${balance}"
          step="0.01"
          placeholder="0.00"
        >

      </div>

    </div>


    <button
      id="debt-payment-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >

      <span class="ui-button__label">
        Ödənişi qeyd et
      </span>

      <span
        class="ui-button__spinner is-hidden"
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

    onOpen: () => {
      bindDebtPaymentForm(
        content,
        account
      );
    },
  });
}


// ============================================================
// 70. PAY DEBT RPC
// ============================================================

function bindDebtPaymentForm(
  form,
  account
) {
  const amountInput =
    $('#debt-payment-amount', form);

  const submit =
    $('#debt-payment-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const amount =
        normalizeNumber(
          amountInput?.value,
          0
        );


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


      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Ödənilir...',
        }
      );


      try {
        const {
          error,
        } =
          await supabase.rpc(
            RPC.payDebt,
            {
              p_debt_account_id:
                account.id,

              p_amount:
                amount,
            }
          );


        if (error) {
          throw error;
        }


        closeModal();


        notify.success(
          'Borc ödənişi qeydə alındı.'
        );


        await loadDebts();

        await loadDashboard();
      } catch (error) {
        console.error(
          'pay_debt error:',
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


// ============================================================
// ADMIN.JS — HISSƏ 3/4 SONU
// ============================================================

// ============================================================
// 71. FINANCE FILTER
// ============================================================

function filteredLedger() {
  const type =
    byId(
      'finance-type-filter'
    )?.value ||
    'all';


  const from =
    byId(
      'finance-date-from'
    )?.value ||
    '';


  const to =
    byId(
      'finance-date-to'
    )?.value ||
    '';


  return state.ledger.filter(
    entry => {
      const entryType =
        ledgerType(entry);


      if (
        type !== 'all' &&
        entryType !== type
      ) {
        return false;
      }


      const date =
        new Date(
          entry.created_at
        );


      if (
        from &&
        date <
          new Date(
            `${from}T00:00:00`
          )
      ) {
        return false;
      }


      if (
        to &&
        date >
          new Date(
            `${to}T23:59:59`
          )
      ) {
        return false;
      }


      return true;
    }
  );
}


// ============================================================
// 72. FINANCE RENDER
// ============================================================

function renderFinance() {
  const root =
    byId(
      'finance-ledger-list'
    );

  if (!root) return;


  const entries =
    filteredLedger();


  const income =
    entries
      .filter(
        item =>
          ledgerType(item) ===
          'income'
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          ledgerAmount(item),
        0
      );


  const expense =
    entries
      .filter(
        item =>
          ledgerType(item) ===
          'expense'
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          ledgerAmount(item),
        0
      );


  setText(
    byId(
      'finance-income'
    ),
    number(income)
  );


  setText(
    byId(
      'finance-expense'
    ),
    number(expense)
  );


  setText(
    byId(
      'finance-balance'
    ),
    number(
      income - expense
    )
  );


  clearElement(root);


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
        <th>Növ</th>
        <th>Məbləğ</th>
        <th>Açıqlama</th>
        <th>Tarix</th>
      </tr>
    </thead>

    <tbody></tbody>
  `;


  const tbody =
    $('tbody', table);


  entries.forEach(
    entry => {
      const type =
        ledgerType(entry);

      const row =
        createElement(
          'tr'
        );


      row.innerHTML = `
        <td>
          <span class="${
            type === 'income'
              ? 'ui-badge ui-badge--success'
              : 'ui-badge ui-badge--danger'
          }">
            ${
              type === 'income'
                ? 'Gəlir'
                : 'Xərc'
            }
          </span>
        </td>

        <td>
          <strong class="finance-amount ${
            type === 'income'
              ? 'finance-amount--income'
              : 'finance-amount--expense'
          }">
            ${escapeHtml(
              money(
                ledgerAmount(
                  entry
                )
              )
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            normalizeString(
              entry.description ||
              entry.note ||
              entry.reason,
              '—'
            )
          )}
        </td>

        <td>
          ${formatDateTime(
            entry.created_at
          )}
        </td>
      `;


      tbody?.append(row);
    }
  );


  root.append(table);
}


// ============================================================
// 73. FINANCE EVENTS
// ============================================================

function bindFinanceEvents() {
  byId(
    'finance-type-filter'
  )?.addEventListener(
    'change',
    renderFinance
  );


  byId(
    'finance-date-from'
  )?.addEventListener(
    'change',
    renderFinance
  );


  byId(
    'finance-date-to'
  )?.addEventListener(
    'change',
    renderFinance
  );
}


// ============================================================
// 74. TRAINER FIELD HELPERS
// ============================================================

function trainerName(
  trainer
) {
  return normalizeString(
    trainer?.name ||
    trainer?.full_name,
    'Məşqçi'
  );
}


function trainerSpecialty(
  trainer
) {
  return normalizeString(
    trainer?.specialty ||
    trainer?.speciality ||
    trainer?.title,
    ''
  );
}


function trainerImageColumn(
  trainer
) {
  const candidates = [
    'image_url',
    'image_path',
    'image',
  ];


  return (
    candidates.find(
      key =>
        Object.prototype
          .hasOwnProperty.call(
            trainer,
            key
          )
    ) ||
    null
  );
}


function trainerImage(
  trainer
) {
  const value =
    normalizeString(
      trainer?.image_url ||
      trainer?.image_path ||
      trainer?.image
    );


  if (!value) {
    return '';
  }


  if (
    value.startsWith(
      'http://'
    ) ||
    value.startsWith(
      'https://'
    )
  ) {
    return value;
  }


  return getPublicStorageUrl(
    APP_CONFIG.storage
      .trainerImages,
    value
  );
}


// ============================================================
// 75. TRAINER FILTER
// ============================================================

function filteredTrainers() {
  const search =
    normalizeString(
      byId(
        'trainers-admin-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  return state.trainers.filter(
    trainer => {
      if (!search) {
        return true;
      }


      return [
        trainerName(
          trainer
        ),

        trainerSpecialty(
          trainer
        ),
      ]
        .join(' ')
        .toLocaleLowerCase(
          'az-AZ'
        )
        .includes(search);
    }
  );
}


// ============================================================
// 76. TRAINER RENDER
// ============================================================

function renderAdminTrainers() {
  const root =
    byId(
      'admin-trainers-grid'
    );

  if (!root) return;


  clearElement(root);


  filteredTrainers()
    .forEach(
      trainer => {
        const card =
          createElement(
            'article',
            {
              className:
                'trainer-card',
            }
          );


        const image =
          trainerImage(
            trainer
          );


        card.innerHTML = `
          <div class="trainer-card__media">

            ${
              image
                ? `
                  <img
                    class="trainer-card__image"
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(
                      trainerName(
                        trainer
                      )
                    )}"
                    loading="lazy"
                  >
                `
                : ''
            }

            <div class="trainer-card__content">

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

              <span class="trainer-card__action">
                Redaktə et
              </span>

            </div>

          </div>
        `;


        card.addEventListener(
          'click',
          () => {
            openTrainerEditor(
              trainer,
              card
            );
          }
        );


        root.append(card);
      }
    );
}


// ============================================================
// 77. TRAINER EVENTS
// ============================================================

function bindTrainerAdminEvents() {
  byId(
    'trainer-create-button'
  )?.addEventListener(
    'click',
    () => {
      openTrainerEditor();
    }
  );


  byId(
    'trainers-admin-search'
  )?.addEventListener(
    'input',
    debounce(
      renderAdminTrainers
    )
  );
}


// ============================================================
// 78. TRAINER EDITOR
// ============================================================

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
            'trainer-form',
        },
      }
    );


  content.innerHTML = `
    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-name"
      >
        Ad
      </label>

      <div class="ui-input">

        <input
          id="trainer-name"
          class="ui-input__control"
          type="text"
          maxlength="150"
          value="${escapeHtml(
            editing
              ? trainerName(
                  trainer
                )
              : ''
          )}"
          placeholder="Məşqçi adı"
        >

      </div>

    </div>


    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-specialty"
      >
        İxtisas
      </label>

      <div class="ui-input">

        <input
          id="trainer-specialty"
          class="ui-input__control"
          type="text"
          maxlength="150"
          value="${escapeHtml(
            trainerSpecialty(
              trainer
            )
          )}"
          placeholder="Fitness, CrossFit..."
        >

      </div>

    </div>


    <div class="ui-field">

      <label
        class="ui-field__label"
        for="trainer-description"
      >
        Açıqlama
      </label>

      <div class="ui-input">

        <input
          id="trainer-description"
          class="ui-input__control"
          type="text"
          maxlength="500"
          value="${escapeHtml(
            normalizeString(
              trainer?.description ||
              trainer?.bio
            )
          )}"
          placeholder="Qısa məlumat"
        >

      </div>

    </div>


    <label class="ui-upload">

      <input
        id="trainer-image"
        type="file"
        accept="image/png,image/jpeg,image/webp"
      >

      <span>

        <span class="ui-upload__icon">
          SK
        </span>

        <strong class="ui-upload__title">
          ${
            editing
              ? 'Şəkli dəyiş'
              : 'Məşqçi şəkli'
          }
        </strong>

        <span class="ui-upload__meta">
          PNG, JPG və ya WEBP
        </span>

      </span>

    </label>


    <button
      id="trainer-submit"
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
      ></span>

    </button>
  `;


  openModal({
    eyebrow:
      'Komanda',

    title:
      editing
        ? 'Məşqçini redaktə et'
        : 'Yeni məşqçi',

    content,

    trigger,

    onOpen: () => {
      bindTrainerForm(
        content,
        trainer
      );
    },
  });
}


// ============================================================
// 79. TRAINER SAVE
// ============================================================

function bindTrainerForm(
  form,
  trainer
) {
  const nameInput =
    $('#trainer-name', form);

  const specialtyInput =
    $('#trainer-specialty', form);

  const descriptionInput =
    $('#trainer-description', form);

  const imageInput =
    $('#trainer-image', form);

  const submit =
    $('#trainer-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      const name =
        normalizeString(
          nameInput?.value
        );

      const specialty =
        normalizeString(
          specialtyInput?.value
        );

      const description =
        normalizeString(
          descriptionInput?.value
        );


      if (
        name.length < 2
      ) {
        notify.warning(
          'Məşqçi adını daxil et.'
        );

        return;
      }


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
        const payload = {
          name,
        };


        if (
          !trainer ||
          Object.prototype
            .hasOwnProperty.call(
              trainer,
              'specialty'
            )
        ) {
          payload.specialty =
            specialty || null;
        }


        if (
          !trainer ||
          Object.prototype
            .hasOwnProperty.call(
              trainer,
              'description'
            )
        ) {
          payload.description =
            description || null;
        }


        if (
          !trainer &&
          state.trainers[0] &&
          Object.prototype
            .hasOwnProperty.call(
              state.trainers[0],
              'is_active'
            )
        ) {
          payload.is_active =
            true;
        }


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
              .update(payload)
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
              .insert(payload)
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


        if (
          file &&
          savedTrainer?.id
        ) {
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


        await loadTrainers();
      } catch (error) {
        console.error(
          'Trainer save error:',
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


// ============================================================
// 80. TRAINER IMAGE UPLOAD
// ============================================================

async function uploadTrainerImage(
  trainer,
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
      file.type
    )
  ) {
    throw new Error(
      'Məşqçi şəkli JPG, PNG və ya WEBP olmalıdır.'
    );
  }


  const column =
    trainerImageColumn(
      trainer
    );


  if (!column) {
    notify.warning(
      'trainers cədvəlində şəkil üçün uyğun sütun tapılmadı.'
    );

    return trainer;
  }


  const extension =
    file.type ===
      'image/png'
      ? 'png'
      : file.type ===
          'image/webp'
        ? 'webp'
        : 'jpg';


  const path =
    `${trainer.id}/${Date.now()}.${extension}`;


  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(
        APP_CONFIG.storage
          .trainerImages
      )
      .upload(
        path,
        file,
        {
          upsert:
            true,

          contentType:
            file.type,

          cacheControl:
            '3600',
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
        [column]:
          path,
      })
      .eq(
        'id',
        trainer.id
      )
      .select('*')
      .single();


  if (error) {
    throw error;
  }


  return data;
}


// ============================================================
// 81. HISTORY LOAD
// Mövcud cədvəllərdən audit timeline qurulur.
// ============================================================

async function loadHistory() {
  const [
    salesResult,
    stockResult,
    membershipResult,
    attendanceResult,
    debtResult,
  ] =
    await Promise.all([

      supabase
        .from(
          TABLES.sales
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.stockMovements
        )
        .select(`
          *,
          products (*)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.memberships
        )
        .select(`
          *,
          profiles (*),
          membership_plans (*)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.attendance
        )
        .select(`
          *,
          profiles (*)
        `)
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),

      supabase
        .from(
          TABLES.debtTransactions
        )
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(300),
    ]);


  [
    salesResult,
    stockResult,
    membershipResult,
    attendanceResult,
    debtResult,
  ].forEach(
    result => {
      if (result.error) {
        console.error(
          'History query error:',
          result.error
        );
      }
    }
  );


  state.historyItems =
    buildHistoryItems({
      sales:
        rows(
          salesResult.data
        ),

      stock:
        rows(
          stockResult.data
        ),

      memberships:
        rows(
          membershipResult.data
        ),

      attendance:
        rows(
          attendanceResult.data
        ),

      debt:
        rows(
          debtResult.data
        ),
    });


  renderHistory();
}


// ============================================================
// 82. HISTORY BUILDER
// ============================================================

function buildHistoryItems({
  sales,
  stock,
  memberships,
  attendance,
  debt,
}) {
  const items = [];


  sales.forEach(
    sale => {
      items.push({
        type: 'sale',
        title: 'Satış',
        meta:
          money(
            saleAmount(
              sale
            )
          ),
        operator:
          readOperatorLabel(
            sale
          ),
        date:
          sale.created_at,
      });
    }
  );


  stock.forEach(
    movement => {
      items.push({
        type: 'stock',
        title:
          `Stok · ${
            movement
              ?.products
              ?.name ||
            'Məhsul'
          }`,
        meta:
          `${number(
            movement.quantity ??
            movement.amount ??
            0
          )}`,
        operator:
          readOperatorLabel(
            movement
          ),
        date:
          movement.created_at,
      });
    }
  );


  memberships.forEach(
    membership => {
      items.push({
        type:
          'membership',
        title:
          'Üzvlük yaradılıb',
        meta:
          `${getProfileName(
            membership.profiles
          )} · ${
            membership
              ?.membership_plans
              ?.name ||
            'Plan'
          }`,
        operator:
          readOperatorLabel(
            membership
          ),
        date:
          membership.created_at,
      });
    }
  );


  attendance.forEach(
    entry => {
      items.push({
        type:
          'attendance',
        title:
          'Giriş qeydiyyatı',
        meta:
          getProfileName(
            entry.profiles
          ),
        operator:
          readOperatorLabel(
            entry
          ),
        date:
          entry.created_at,
      });
    }
  );


  debt.forEach(
    transaction => {
      items.push({
        type:
          'debt',
        title:
          debtTransactionTitle(
            transaction
          ),
        meta:
          money(
            transaction.amount ??
            0
          ),
        operator:
          readOperatorLabel(
            transaction
          ),
        date:
          transaction.created_at,
      });
    }
  );


  return items.sort(
    (a, b) =>
      new Date(b.date) -
      new Date(a.date)
  );
}


// ============================================================
// 83. OPERATOR DETECTION
// Diaqnostikaya qədər mümkün mövcud sütunları oxuyuruq.
// ============================================================

function readOperatorLabel(
  row
) {
  const direct =
    normalizeString(
      row?.operator_name ||
      row?.created_by_name ||
      row?.staff_name
    );


  if (direct) {
    return direct;
  }


  const id =
    normalizeString(
      row?.operator_id ||
      row?.created_by ||
      row?.staff_id ||
      row?.profile_id_created_by
    );


  if (id) {
    const member =
      state.members.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (member) {
      return getProfileName(
        member
      );
    }


    return `Operator ${id.slice(
      0,
      8
    )}`;
  }


  return 'Operator məlumatı yoxdur';
}


// ============================================================
// 84. DEBT TRANSACTION LABEL
// ============================================================

function debtTransactionTitle(
  row
) {
  const type =
    normalizeString(
      row?.type ||
      row?.transaction_type
    ).toLowerCase();


  if (
    type.includes(
      'payment'
    )
  ) {
    return 'Borc ödənişi';
  }


  return 'Borc əməliyyatı';
}


// ============================================================
// 85. HISTORY FILTER
// ============================================================

function filteredHistory() {
  const search =
    normalizeString(
      byId(
        'history-search'
      )?.value
    )
      .toLocaleLowerCase(
        'az-AZ'
      );


  const type =
    byId(
      'history-type-filter'
    )?.value ||
    'all';


  const from =
    byId(
      'history-date-from'
    )?.value ||
    '';


  const to =
    byId(
      'history-date-to'
    )?.value ||
    '';


  return (
    state.historyItems ||
    []
  ).filter(
    item => {
      if (
        type !== 'all' &&
        item.type !== type
      ) {
        return false;
      }


      if (search) {
        const haystack =
          [
            item.title,
            item.meta,
            item.operator,
          ]
            .join(' ')
            .toLocaleLowerCase(
              'az-AZ'
            );


        if (
          !haystack.includes(
            search
          )
        ) {
          return false;
        }
      }


      const date =
        new Date(
          item.date
        );


      if (
        from &&
        date <
          new Date(
            `${from}T00:00:00`
          )
      ) {
        return false;
      }


      if (
        to &&
        date >
          new Date(
            `${to}T23:59:59`
          )
      ) {
        return false;
      }


      return true;
    }
  );
}


// ============================================================
// 86. HISTORY RENDER
// ============================================================

function renderHistory() {
  const root =
    byId(
      'history-list'
    );

  if (!root) return;


  clearElement(root);


  filteredHistory()
    .slice(
      0,
      UI_CONFIG.history
        .adminLimit
    )
    .forEach(
      item => {
        const row =
          createElement(
            'article',
            {
              className:
                'operation-item',
            }
          );


        row.innerHTML = `
          <span class="operation-item__icon">
            SK
          </span>

          <span class="operation-item__content">

            <strong class="operation-item__title">
              ${escapeHtml(
                item.title
              )}
            </strong>

            <span class="operation-item__meta">
              ${escapeHtml(
                item.meta
              )}
            </span>

            <span class="operation-item__operator">
              ${escapeHtml(
                item.operator
              )}
            </span>

          </span>

          <span class="operation-item__side">

            <strong>
              ${formatDate(
                item.date
              )}
            </strong>

            <span>
              ${formatTime(
                item.date
              )}
            </span>

          </span>
        `;


        root.append(row);
      }
    );


  if (
    root.children.length ===
    0
  ) {
    root.append(
      createDashboardEmpty(
        'Tarixçə tapılmadı.'
      )
    );
  }
}


// ============================================================
// 87. HISTORY EVENTS
// ============================================================

function bindHistoryEvents() {
  byId(
    'history-search'
  )?.addEventListener(
    'input',
    debounce(
      renderHistory
    )
  );


  byId(
    'history-type-filter'
  )?.addEventListener(
    'change',
    renderHistory
  );


  byId(
    'history-date-from'
  )?.addEventListener(
    'change',
    renderHistory
  );


  byId(
    'history-date-to'
  )?.addEventListener(
    'change',
    renderHistory
  );
}


// ============================================================
// 88. AUTH CHANGE
// ============================================================

function bindAdminAuthChange() {
  window.addEventListener(
    'skyfit:authchange',
    async event => {
      const authEvent =
        event.detail?.event;


      if (
        authEvent ===
        'SIGNED_OUT'
      ) {
        window.location.replace(
          APP_CONFIG.routes.login
        );

        return;
      }


      const identity =
        await getCurrentIdentity();


      if (
        !identity?.isStaff
      ) {
        window.location.replace(
          APP_CONFIG.routes.home
        );

        return;
      }


      state.identity =
        identity;


      renderOperator();
    }
  );
}


// ============================================================
// 89. INITIAL LOAD CACHE
// ============================================================

async function preloadAdminData() {
  await Promise.all([
    loadProducts(),
    loadMembers(),
    loadMembershipPlans(),
  ]);
}


// ============================================================
// 90. ALL EVENT BINDINGS
// ============================================================

function bindAdminEvents() {
  bindPosEvents();

  bindProductAdminEvents();

  bindStockEvents();

  bindQuickAction();

  bindGlobalSearch();

  bindMemberEvents();

  bindMembershipEvents();

  bindAttendanceAdminEvents();

  bindDebtEvents();

  bindFinanceEvents();

  bindTrainerAdminEvents();

  bindHistoryEvents();

  bindAdminAuthChange();
}


// ============================================================
// 91. INIT
// ============================================================

async function init() {
  try {
    const ready =
      await initAdminBase();


    if (!ready) {
      return;
    }


    await preloadAdminData();


    bindAdminEvents();


    await loadActiveTab();
  } catch (error) {
    console.error(
      'Admin initialization error:',
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


// ============================================================
// 92. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError:
      true,
  }
)();


// ============================================================
// ADMIN.JS COMPLETE
// ============================================================
