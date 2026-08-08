// ============================================================
// SKY FIT PRO
// Home Page Controller
// File: js/app.js
// ============================================================

import {
  supabase,
  TABLES,
  UI_CONFIG,
} from './config.js';

import {
  byId,
  clearElement,
  createProductCard,
  createTrainerCard,
  debounce,
  getCurrentIdentity,
  membershipStatus,
  formatDate,
  formatTime,
  setText,
  showElement,
  hideElement,
  bindSearchClear,
  notify,
  asyncHandler,
  normalizeString,
} from './core.js';

import {
  initLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {
  identity: null,

  products: [],
  visibleProducts: [],

  trainers: [],
  trainersExpanded: false,

  productsExpanded: false,

  search:
    '',
};


// ============================================================
// 02. DOM
// ============================================================

const elements = {
  memberSection:
    byId(
      'member-overview-section'
    ),

  membershipStatus:
    byId(
      'membership-status-badge'
    ),

  membershipPlan:
    byId(
      'membership-plan-name'
    ),

  membershipExpiry:
    byId(
      'membership-expiry'
    ),

  latestAttendanceDate:
    byId(
      'latest-attendance-date'
    ),

  latestAttendanceTime:
    byId(
      'latest-attendance-time'
    ),

  attendanceCount:
    byId(
      'attendance-count'
    ),

  trainersGrid:
    byId(
      'trainers-grid'
    ),

  trainersEmpty:
    byId(
      'trainers-empty-state'
    ),

  trainersShowAll:
    byId(
      'trainers-show-all-button'
    ),

  productsGrid:
    byId(
      'products-grid'
    ),

  productsEmpty:
    byId(
      'products-empty-state'
    ),

  productsShowAll:
    byId(
      'products-show-all-button'
    ),

  productSearch:
    byId(
      'product-search-input'
    ),

  productSearchClear:
    byId(
      'product-search-clear'
    ),
};


// ============================================================
// 03. PRODUCTS
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
      .limit(
        UI_CONFIG.products.searchLimit
      );

  if (error) {
    console.error(
      'Products load error:',
      error
    );

    notify.error(
      'Məhsullar yüklənmədi.'
    );

    state.products = [];

    renderProducts();

    return;
  }

  state.products =
    Array.isArray(data)
      ? data
      : [];

  renderProducts();
}


// ============================================================
// 04. PRODUCT FILTER
// ============================================================

function filteredProducts() {
  const search =
    normalizeString(
      state.search
    ).toLocaleLowerCase(
      'az-AZ'
    );

  if (!search) {
    return [
      ...state.products,
    ];
  }

  return state.products.filter(
    product => {
      const name =
        normalizeString(
          product?.name
        )
          .toLocaleLowerCase(
            'az-AZ'
          );

      const description =
        normalizeString(
          product?.description
        )
          .toLocaleLowerCase(
            'az-AZ'
          );

      return (
        name.includes(search) ||
        description.includes(
          search
        )
      );
    }
  );
}


// ============================================================
// 05. RENDER PRODUCTS
// ============================================================

function renderProducts() {
  const grid =
    elements.productsGrid;

  if (!grid) return;

  clearElement(grid);

  const filtered =
    filteredProducts();

  state.visibleProducts =
    filtered;

  const limit =
    state.productsExpanded ||
    state.search
      ? filtered.length
      : UI_CONFIG.products.homeLimit;

  const visible =
    filtered.slice(
      0,
      limit
    );

  visible.forEach(
    product => {
      const card =
        createProductCard(
          product
        );

      grid.append(card);
    }
  );

  const noResults =
    filtered.length === 0;

  elements.productsEmpty
    ?.classList.toggle(
      'is-hidden',
      !noResults
    );

  if (
    elements.productsShowAll
  ) {
    const shouldShowButton =
      !state.search &&
      filtered.length >
        UI_CONFIG.products.homeLimit;

    elements.productsShowAll
      .classList.toggle(
        'is-hidden',
        !shouldShowButton
      );

    elements.productsShowAll.textContent =
      state.productsExpanded
        ? 'Daha az'
        : 'Hamısı';
  }
}


// ============================================================
// 06. PRODUCT EVENTS
// ============================================================

function bindProductEvents() {
  const searchHandler =
    debounce(
      value => {
        state.search =
          value;

        renderProducts();
      }
    );

  bindSearchClear({
    input:
      elements.productSearch,

    clearButton:
      elements.productSearchClear,

    onChange:
      searchHandler,
  });


  elements.productsShowAll
    ?.addEventListener(
      'click',
      () => {
        state.productsExpanded =
          !state.productsExpanded;

        renderProducts();
      }
    );
}


// ============================================================
// 07. TRAINERS
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
      .limit(
        UI_CONFIG.trainers.adminLimit
      );

  if (error) {
    console.error(
      'Trainers load error:',
      error
    );

    state.trainers = [];

    renderTrainers();

    return;
  }

  state.trainers =
    Array.isArray(data)
      ? data
      : [];

  renderTrainers();
}


// ============================================================
// 08. RENDER TRAINERS
// ============================================================

function renderTrainers() {
  const grid =
    elements.trainersGrid;

  if (!grid) return;

  clearElement(grid);

  const limit =
    state.trainersExpanded
      ? state.trainers.length
      : UI_CONFIG.trainers.homeLimit;

  const visible =
    state.trainers.slice(
      0,
      limit
    );

  visible.forEach(
    trainer => {
      grid.append(
        createTrainerCard(
          trainer
        )
      );
    }
  );

  elements.trainersEmpty
    ?.classList.toggle(
      'is-hidden',
      state.trainers.length >
        0
    );

  if (
    elements.trainersShowAll
  ) {
    const shouldShowButton =
      state.trainers.length >
      UI_CONFIG.trainers.homeLimit;

    elements.trainersShowAll
      .classList.toggle(
        'is-hidden',
        !shouldShowButton
      );

    elements.trainersShowAll.textContent =
      state.trainersExpanded
        ? 'Daha az'
        : 'Hamısı';
  }
}


// ============================================================
// 09. TRAINER EVENTS
// ============================================================

function bindTrainerEvents() {
  elements.trainersShowAll
    ?.addEventListener(
      'click',
      () => {
        state.trainersExpanded =
          !state.trainersExpanded;

        renderTrainers();
      }
    );
}


// ============================================================
// 10. MEMBER OVERVIEW
// ============================================================

async function loadMemberOverview() {
  const identity =
    state.identity;

  if (
    !identity?.isAuthenticated ||
    !identity?.profile
  ) {
    hideElement(
      elements.memberSection
    );

    return;
  }

  showElement(
    elements.memberSection
  );

  await Promise.all([
    loadCurrentMembership(),
    loadAttendanceSummary(),
  ]);
}


// ============================================================
// 11. CURRENT MEMBERSHIP
// ============================================================

async function loadCurrentMembership() {
  const profileId =
    state.identity
      ?.profile
      ?.id;

  if (!profileId) {
    return;
  }

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
        membership_plans (
          id,
          name,
          price,
          duration_days,
          is_daily
        )
      `)
      .eq(
        'profile_id',
        profileId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      'Membership load error:',
      error
    );

    setText(
      elements.membershipPlan,
      '—'
    );

    setText(
      elements.membershipExpiry,
      'Məlumat alınmadı'
    );

    return;
  }

  if (!data) {
    setText(
      elements.membershipPlan,
      'Aktiv üzvlük yoxdur'
    );

    setText(
      elements.membershipExpiry,
      '—'
    );

    if (
      elements.membershipStatus
    ) {
      elements.membershipStatus
        .className =
          'ui-badge ui-badge--neutral';

      elements.membershipStatus
        .textContent =
          'Yoxdur';
    }

    return;
  }

  const meta =
    membershipStatus({
      status:
        data.status,

      endDate:
        data.end_date,
    });

  if (
    elements.membershipStatus
  ) {
    elements.membershipStatus
      .className =
        meta.className;

    elements.membershipStatus
      .textContent =
        meta.label;
  }

  setText(
    elements.membershipPlan,
    data.membership_plans
      ?.name ||
      'Üzvlük'
  );

  setText(
    elements.membershipExpiry,
    data.end_date
      ? `${formatDate(
          data.end_date
        )}-dək`
      : '—'
  );
}


// ============================================================
// 12. ATTENDANCE SUMMARY
// ============================================================

async function loadAttendanceSummary() {
  const profileId =
    state.identity
      ?.profile
      ?.id;

  if (!profileId) {
    return;
  }

  const [
    latestResult,
    countResult,
  ] =
    await Promise.all([
      supabase
        .from(
          TABLES.attendance
        )
        .select('*')
        .eq(
          'profile_id',
          profileId
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle(),

      supabase
        .from(
          TABLES.attendance
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'profile_id',
          profileId
        ),
    ]);


  if (
    latestResult.error
  ) {
    console.error(
      'Latest attendance error:',
      latestResult.error
    );
  }

  if (
    countResult.error
  ) {
    console.error(
      'Attendance count error:',
      countResult.error
    );
  }

  const latest =
    latestResult.data;

  if (latest) {
    const dateValue =
      latest.created_at ||
      latest.attended_at ||
      latest.entry_at;

    setText(
      elements.latestAttendanceDate,
      formatDate(
        dateValue
      )
    );

    setText(
      elements.latestAttendanceTime,
      formatTime(
        dateValue
      )
    );
  } else {
    setText(
      elements.latestAttendanceDate,
      'Giriş yoxdur'
    );

    setText(
      elements.latestAttendanceTime,
      '—'
    );
  }

  setText(
    elements.attendanceCount,
    countResult.count ?? 0
  );
}


// ============================================================
// 13. HERO BACKGROUND
// ============================================================

function initHero() {
  const heroMedia =
    byId(
      'home-hero-media'
    );

  if (!heroMedia) {
    return;
  }

  heroMedia.setAttribute(
    'aria-hidden',
    'true'
  );
}


// ============================================================
// 14. AUTH CHANGE
// ============================================================

function bindAuthChange() {
  window.addEventListener(
    'skyfit:authchange',
    async () => {
      state.identity =
        await getCurrentIdentity();

      await loadMemberOverview();
    }
  );
}


// ============================================================
// 15. INITIAL DATA
// ============================================================

async function loadHomeData() {
  await Promise.all([
    loadProducts(),
    loadTrainers(),
    loadMemberOverview(),
  ]);
}


// ============================================================
// 16. INIT
// ============================================================

async function init() {
  try {
    state.identity =
      await initLayout();

    bindProductEvents();
    bindTrainerEvents();
    bindAuthChange();
    initHero();

    await loadHomeData();
  } catch (error) {
    console.error(
      'Home initialization error:',
      error
    );

    notify.error(
      'Ana səhifə başladılarkən xəta baş verdi.'
    );
  }
}


// ============================================================
// 17. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError: true,
  }
)();
