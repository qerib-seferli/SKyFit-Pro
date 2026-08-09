// ============================================================
// SKY FIT PRO
// Home Page Controller
// File: js/app.js
//
// REAL SUPABASE SCHEMA VERSION
// ============================================================

import {
  supabase,
  TABLES,
} from './config.js';

import {
  SKYFIT_EVENTS,

  byId,
  clearElement,
  showElement,
  hideElement,
  setText,

  normalizeString,
  normalizeSearch,

  formatDate,
  formatTime,

  debounce,
  rows,

  getCurrentIdentity,

  createProductCard,
  createTrainerCard,

  membershipIsActive,
  membershipDaysRemaining,
  membershipStatusLabel,

  attendanceDate,
  attendanceTypeLabel,

  notify,
  getErrorMessage,
  asyncHandler,
} from './core.js';

import {
  initLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {

  identity:
    null,

  products:
    [],

  trainers:
    [],

  membership:
    null,

  attendance:
    [],

  productSearch:
    '',

  productsExpanded:
    false,

  trainersExpanded:
    false,

  loading: {
    products:
      false,

    trainers:
      false,

    member:
      false,
  },
};


// ============================================================
// 02. CONFIG
// ============================================================

const HOME_LIMITS =
  Object.freeze({

    products:
      10,

    trainers:
      6,

    attendance:
      5,
  });


// ============================================================
// 03. DOM
// ============================================================

function getElements() {
  return {

    // --------------------------------------------------------
    // Member overview
    // --------------------------------------------------------

    memberSection:
      byId(
        'member-overview-section'
      ),

    memberGreeting:
      byId(
        'member-greeting'
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

    membershipDays:
      byId(
        'membership-days-left'
      ),

    attendanceCount:
      byId(
        'attendance-count'
      ),

    latestAttendanceDate:
      byId(
        'latest-attendance-date'
      ),

    latestAttendanceTime:
      byId(
        'latest-attendance-time'
      ),

    latestAttendanceType:
      byId(
        'latest-attendance-type'
      ),


    // --------------------------------------------------------
    // Trainers
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Products
    // --------------------------------------------------------

    productsGrid:
      byId(
        'products-grid'
      ),

    productsEmpty:
      byId(
        'products-empty-state'
      ),

    productsSearchEmpty:
      byId(
        'products-search-empty-state'
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
}


// ============================================================
// 04. PRODUCTS QUERY
//
// Real products columns:
// name
// description
// image_url
// category
// sale_mode
// stock_unit
// stock_quantity
// portion_size
// retail_price
// portion_price
// low_stock_threshold
// show_public
// is_active
// ============================================================

async function loadProducts() {
  if (
    state.loading.products
  ) {
    return;
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
          updated_at
        `)
        .eq(
          'is_active',
          true
        )
        .eq(
          'show_public',
          true
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


    state.products =
      rows(data);


    renderProducts();
  } catch (error) {
    console.error(
      '[SKy Fit Home] Products:',
      error
    );


    state.products =
      [];


    renderProducts();


    notify.error(
      getErrorMessage(
        error,
        'Məhsullar yüklənmədi.'
      )
    );
  } finally {
    state.loading.products =
      false;
  }
}


// ============================================================
// 05. PRODUCT FILTER
// ============================================================

function filteredProducts() {
  const search =
    normalizeSearch(
      state.productSearch
    );


  if (!search) {
    return [
      ...state.products,
    ];
  }


  return state.products.filter(
    product => {
      const searchable =
        [
          product.name,
          product.description,
          product.category,
          product.sku,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase(
            'az-AZ'
          );


      return searchable.includes(
        search
      );
    }
  );
}


// ============================================================
// 06. PRODUCTS RENDER
// ============================================================

function renderProducts() {
  const elements =
    getElements();


  if (
    !elements.productsGrid
  ) {
    return;
  }


  clearElement(
    elements.productsGrid
  );


  const filtered =
    filteredProducts();


  const hasSearch =
    Boolean(
      normalizeString(
        state.productSearch
      )
    );


  const visible =
    (
      state.productsExpanded ||
      hasSearch
    )
      ? filtered
      : filtered.slice(
          0,
          HOME_LIMITS.products
        );


  visible.forEach(
    product => {
      elements.productsGrid
        .append(
          createProductCard(
            product
          )
        );
    }
  );


  const noProducts =
    state.products.length ===
    0;


  const noSearchResults =
    !noProducts &&
    hasSearch &&
    filtered.length ===
      0;


  if (
    elements.productsEmpty
  ) {
    noProducts
      ? showElement(
          elements.productsEmpty
        )
      : hideElement(
          elements.productsEmpty
        );
  }


  if (
    elements
      .productsSearchEmpty
  ) {
    noSearchResults
      ? showElement(
          elements
            .productsSearchEmpty
        )
      : hideElement(
          elements
            .productsSearchEmpty
        );
  }


  if (
    elements.productsShowAll
  ) {
    const shouldShow =
      !hasSearch &&
      state.products.length >
        HOME_LIMITS.products;


    shouldShow
      ? showElement(
          elements
            .productsShowAll
        )
      : hideElement(
          elements
            .productsShowAll
        );


    elements
      .productsShowAll
      .textContent =
        state.productsExpanded
          ? 'Daha az göstər'
          : 'Hamısını göstər';
  }
}


// ============================================================
// 07. PRODUCT EVENTS
// ============================================================

function bindProductEvents() {
  const elements =
    getElements();


  const renderSearch =
    debounce(
      () => {
        state.productSearch =
          normalizeString(
            elements
              .productSearch
              ?.value
          );


        renderProducts();
      },
      180
    );


  elements.productSearch
    ?.addEventListener(
      'input',
      () => {
        const hasValue =
          Boolean(
            normalizeString(
              elements
                .productSearch
                ?.value
            )
          );


        if (
          elements
            .productSearchClear
        ) {
          elements
            .productSearchClear
            .hidden =
              !hasValue;
        }


        renderSearch();
      }
    );


  elements
    .productSearchClear
    ?.addEventListener(
      'click',
      () => {
        if (
          !elements.productSearch
        ) {
          return;
        }


        elements
          .productSearch
          .value =
            '';


        state.productSearch =
          '';


        elements
          .productSearchClear
          .hidden =
            true;


        renderProducts();


        elements
          .productSearch
          .focus();
      }
    );


  elements
    .productsShowAll
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
// 08. TRAINERS QUERY
//
// Real trainers columns:
// full_name
// specialty
// bio
// image_url
// phone
// instagram_url
// sort_order
// is_active
// ============================================================

async function loadTrainers() {
  if (
    state.loading.trainers
  ) {
    return;
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
        .select(`
          id,
          full_name,
          specialty,
          bio,
          image_url,
          phone,
          instagram_url,
          sort_order,
          is_active,
          created_at
        `)
        .eq(
          'is_active',
          true
        )
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


    renderTrainers();
  } catch (error) {
    console.error(
      '[SKy Fit Home] Trainers:',
      error
    );


    state.trainers =
      [];


    renderTrainers();


    notify.error(
      getErrorMessage(
        error,
        'Məşqçilər yüklənmədi.'
      )
    );
  } finally {
    state.loading.trainers =
      false;
  }
}


// ============================================================
// 09. TRAINERS RENDER
// ============================================================

function renderTrainers() {
  const elements =
    getElements();


  if (
    !elements.trainersGrid
  ) {
    return;
  }


  clearElement(
    elements.trainersGrid
  );


  const visible =
    state.trainersExpanded
      ? state.trainers
      : state.trainers.slice(
          0,
          HOME_LIMITS.trainers
        );


  visible.forEach(
    trainer => {
      elements.trainersGrid
        .append(
          createTrainerCard(
            trainer
          )
        );
    }
  );


  if (
    elements.trainersEmpty
  ) {
    state.trainers.length ===
      0
      ? showElement(
          elements
            .trainersEmpty
        )
      : hideElement(
          elements
            .trainersEmpty
        );
  }


  if (
    elements.trainersShowAll
  ) {
    const shouldShow =
      state.trainers.length >
      HOME_LIMITS.trainers;


    shouldShow
      ? showElement(
          elements
            .trainersShowAll
        )
      : hideElement(
          elements
            .trainersShowAll
        );


    elements
      .trainersShowAll
      .textContent =
        state.trainersExpanded
          ? 'Daha az göstər'
          : 'Hamısını göstər';
  }
}


// ============================================================
// 10. TRAINER EVENTS
// ============================================================

function bindTrainerEvents() {
  const elements =
    getElements();


  elements
    .trainersShowAll
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
// 11. MEMBER OVERVIEW
//
// profiles.id = memberships.member_id
// profiles.id = attendance.member_id
//
// auth.users.id ilə qarışdırmırıq.
// ============================================================

async function loadMemberOverview() {
  if (
    state.loading.member
  ) {
    return;
  }


  state.loading.member =
    true;


  try {
    const identity =
      state.identity ||
      await getCurrentIdentity();


    state.identity =
      identity;


    if (
      !identity
        ?.authenticated ||
      !identity
        ?.profileId
    ) {
      state.membership =
        null;

      state.attendance =
        [];


      renderMemberOverview();

      return;
    }


    await Promise.all([
      loadCurrentMembership(
        identity.profileId
      ),

      loadMemberAttendance(
        identity.profileId
      ),
    ]);


    renderMemberOverview();
  } catch (error) {
    console.error(
      '[SKy Fit Home] Member overview:',
      error
    );


    renderMemberOverview();


    // Public homepage işləməyə davam etməlidir.
    // Member widget xətasına görə bütün səhifəyə toast atmırıq.
  } finally {
    state.loading.member =
      false;
  }
}


// ============================================================
// 12. CURRENT MEMBERSHIP
//
// Explicit FK istifadə olunur.
// PGRST201 problemini bununla aradan qaldırırıq.
// ============================================================

async function loadCurrentMembership(
  profileId
) {
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
        membership_plan:membership_plans!memberships_plan_id_fkey (
          id,
          name,
          price,
          duration_days,
          is_daily,
          is_active
        )
      `)
      .eq(
        'member_id',
        profileId
      )
      .eq(
        'status',
        'active'
      )
      .order(
        'end_date',
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();


  if (error) {
    throw error;
  }


  state.membership =
    data || null;
}


// ============================================================
// 13. ATTENDANCE
//
// checked_in_at istifadə olunur.
// created_at yoxdur.
// ============================================================

async function loadMemberAttendance(
  profileId
) {
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
        operator_shift_id
      `)
      .eq(
        'member_id',
        profileId
      )
      .order(
        'checked_in_at',
        {
          ascending:
            false,
        }
      )
      .limit(100);


  if (error) {
    throw error;
  }


  state.attendance =
    rows(data);
}


// ============================================================
// 14. MEMBER OVERVIEW RENDER
// ============================================================

function renderMemberOverview() {
  const elements =
    getElements();


  const identity =
    state.identity;


  if (
    !identity
      ?.authenticated
  ) {
    hideElement(
      elements.memberSection
    );

    return;
  }


  showElement(
    elements.memberSection
  );


  if (
    elements.memberGreeting
  ) {
    setText(
      elements.memberGreeting,
      identity.name
    );
  }


  renderMembershipSummary();

  renderAttendanceSummary();
}


// ============================================================
// 15. MEMBERSHIP SUMMARY
// ============================================================

function renderMembershipSummary() {
  const elements =
    getElements();


  const membership =
    state.membership;


  if (!membership) {
    if (
      elements.membershipStatus
    ) {
      elements
        .membershipStatus
        .className =
          'ui-badge ui-badge--neutral';


      setText(
        elements
          .membershipStatus,
        'Aktiv üzvlük yoxdur'
      );
    }


    setText(
      elements
        .membershipPlan,
      '—'
    );


    setText(
      elements
        .membershipExpiry,
      '—'
    );


    setText(
      elements
        .membershipDays,
      '—'
    );


    return;
  }


  const active =
    membershipIsActive(
      membership
    );


  if (
    elements.membershipStatus
  ) {
    elements
      .membershipStatus
      .className =
        active
          ? 'ui-badge ui-badge--success'
          : 'ui-badge ui-badge--warning';


    setText(
      elements
        .membershipStatus,
      membershipStatusLabel(
        membership
      )
    );
  }


  setText(
    elements.membershipPlan,
    membership
      .membership_plan
      ?.name ||
    'Üzvlük'
  );


  setText(
    elements.membershipExpiry,
    membership.end_date
      ? formatDate(
          membership.end_date
        )
      : '—'
  );


  const remaining =
    membershipDaysRemaining(
      membership
    );


  setText(
    elements.membershipDays,
    active
      ? `${remaining} gün`
      : 'Bitib'
  );
}


// ============================================================
// 16. ATTENDANCE SUMMARY
// ============================================================

function renderAttendanceSummary() {
  const elements =
    getElements();


  setText(
    elements.attendanceCount,
    state.attendance.length
  );


  const latest =
    state.attendance[0];


  if (!latest) {
    setText(
      elements
        .latestAttendanceDate,
      'Giriş yoxdur'
    );


    setText(
      elements
        .latestAttendanceTime,
      '—'
    );


    setText(
      elements
        .latestAttendanceType,
      '—'
    );


    return;
  }


  const date =
    attendanceDate(
      latest
    );


  setText(
    elements
      .latestAttendanceDate,
    formatDate(date)
  );


  setText(
    elements
      .latestAttendanceTime,
    formatTime(date)
  );


  setText(
    elements
      .latestAttendanceType,
    attendanceTypeLabel(
      latest
    )
  );
}


// ============================================================
// 17. HERO IMAGE
//
// Zal şəkillərini yerləşdirəndə HTML-də:
// data-gym-image
//
// olan img elementlərinə browser fallback tətbiq edə bilərik.
//
// Hələ şəkil yolu uydurmuruq.
// ============================================================

function bindHeroImages() {
  document
    .querySelectorAll(
      '[data-gym-image]'
    )
    .forEach(
      image => {
        image.addEventListener(
          'error',
          () => {
            image.classList.add(
              'is-image-missing'
            );
          },
          {
            once:
              true,
          }
        );
      }
    );
}


// ============================================================
// 18. AUTH CHANGE
// ============================================================

function bindAuthEvents() {
  window.addEventListener(
    SKYFIT_EVENTS.authChange,
    async event => {
      state.identity =
        event.detail
          ?.identity ||
        await getCurrentIdentity({
          force:
            true,
        });


      await loadMemberOverview();
    }
  );
}


// ============================================================
// 19. PROFILE CHANGE
// ============================================================

function bindProfileEvents() {
  window.addEventListener(
    SKYFIT_EVENTS.profileChange,
    async () => {
      state.identity =
        await getCurrentIdentity({
          force:
            true,
        });


      renderMemberOverview();
    }
  );
}


// ============================================================
// 20. PAGE VISIBILITY REFRESH
//
// Məhsul/stok admin paneldə dəyişibsə və istifadəçi homepage-ə
// qayıdıbsa məlumat köhnə qalmasın.
// ============================================================

let lastRefreshAt =
  Date.now();


function bindVisibilityRefresh() {
  document.addEventListener(
    'visibilitychange',
    async () => {
      if (
        document.visibilityState !==
        'visible'
      ) {
        return;
      }


      const now =
        Date.now();


      if (
        now -
        lastRefreshAt <
        2 * 60 * 1000
      ) {
        return;
      }


      lastRefreshAt =
        now;


      await Promise.all([
        loadProducts(),
        loadTrainers(),
        loadMemberOverview(),
      ]);
    }
  );
}


// ============================================================
// 21. INITIAL LOAD
// ============================================================

async function loadInitialData() {
  await Promise.all([
    loadProducts(),
    loadTrainers(),
    loadMemberOverview(),
  ]);
}


// ============================================================
// 22. INIT
// ============================================================

async function init() {
  try {
    state.identity =
      await initLayout();


    bindProductEvents();

    bindTrainerEvents();

    bindHeroImages();

    bindAuthEvents();

    bindProfileEvents();

    bindVisibilityRefresh();


    await loadInitialData();


    lastRefreshAt =
      Date.now();
  } catch (error) {
    console.error(
      '[SKy Fit Home] Init:',
      error
    );


    notify.error(
      getErrorMessage(
        error,
        'Ana səhifə başladılmadı.'
      )
    );
  }
}


// ============================================================
// 23. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError:
      true,
  }
)();


// ============================================================
// SKY FIT PRO APP.JS COMPLETE
// ============================================================


/* ================================================================
   SKY FIT PRO
   FINAL COMPACT + MISSING COMPONENTS PATCH
   Existing Claude CSS-in LAP SONUNA əlavə et.

   Senior Full Stack Developer: Qərib Səfərli
   ================================================================ */


/* ================================================================
   01. GLOBAL COMPACT SYSTEM
   ================================================================ */

:root {
  --shell-max: 1440px;
  --shell-pad: 18px;
}


body {
  font-size: 15px;
}


/* Sections həddindən artıq uzun olmasın */

.home-section {
  padding-block: clamp(24px, 3.5vw, 46px);
}


.section-heading {
  gap: 12px;
  margin-bottom: 16px;
}


.section-description {
  margin-top: 6px;
}


.section-more {
  margin-top: 16px;
}


/* ================================================================
   02. BUTTONS — COMPACT
   ================================================================ */

.ui-button {
  height: 42px;
  min-height: 42px;

  padding-inline: 17px;

  font-size: 0.82rem;
}


.admin-row-action {
  width: 31px;
  height: 31px;
}


/* Useful missing variants */

.ui-button--compact {
  height: 32px;
  min-height: 32px;

  padding-inline: 10px;

  border-radius: 9px;

  font-size: 0.72rem;
}


.ui-button--success {
  color: #06150d;

  background:
    linear-gradient(
      135deg,
      #63f5a8,
      var(--income)
    );

  border-color: var(--income-border);

  box-shadow:
    0 7px 22px -7px
    var(--income-glow);
}


.ui-button--warning {
  color: #181006;

  background:
    linear-gradient(
      135deg,
      #ffd17d,
      var(--warning)
    );

  border-color: var(--warning-border);
}


/* ================================================================
   03. FORMS — əsas boşluq problemini aradan qaldırır
   ================================================================ */

.ui-field {
  gap: 5px;
  margin-bottom: 10px;
}


.ui-field__label {
  font-size: 0.78rem;
}


.ui-field__hint,
.ui-field__error {
  font-size: 0.72rem;
}


.ui-input,
.ui-select,
.ui-textarea,
.ui-date-input,
.search-control {
  min-height: 42px;

  padding-inline: 12px;

  border-radius: 12px;
}


.ui-input__control,
.search-control__input {
  font-size: 0.88rem;
}


select.ui-select,
select.admin-toolbar__select {
  min-height: 42px;

  padding-left: 12px;

  font-size: 0.82rem;
}


select.admin-toolbar__select {
  min-width: 130px;
}


.ui-textarea {
  min-height: 78px;

  padding-block: 9px;
}


.ui-textarea textarea,
textarea.ui-textarea {
  min-height: 62px;

  font-size: 0.86rem;

  line-height: 1.45;
}


/* İlk rəqəmin sola gizlənməsinin qarşısı */

input[type="number"],
.ui-input__control[type="number"] {
  text-indent: 0 !important;

  padding-left: 13px !important;
  padding-right: 32px !important;

  font-variant-numeric: tabular-nums;
}


/* Checkbox compact */

.ui-check-list {
  gap: 6px;
}


.ui-check {
  gap: 7px;

  font-size: 0.8rem;
}


.ui-check input[type="checkbox"] {
  width: 17px;
  height: 17px;

  border-radius: 5px;
}


/* Upload sahəsi */

.ui-upload {
  gap: 10px;

  padding: 10px 12px;

  border-radius: 12px;
}


.ui-upload__title {
  font-size: 0.82rem;
}


.ui-upload__meta {
  font-size: 0.7rem;
}


/* ================================================================
   04. EMPTY STATES

   52px padding olan uzun boş blokları kəsir.
   ================================================================ */

.ui-empty-state {
  min-height: 110px;

  gap: 6px;

  padding: 18px 14px;

  border-radius: 14px;
}


.ui-empty-state__icon {
  width: 38px;
  height: 38px;
}


.ui-empty-state strong {
  font-size: 0.92rem;
}


.ui-empty-state span {
  font-size: 0.8rem;
}


.favorites-loading {
  min-height: 100px;

  padding: 20px 0;
}


/* ================================================================
   05. BADGES
   ================================================================ */

.ui-badge {
  height: 23px;

  padding-inline: 8px;

  font-size: 0.66rem;
}


.ui-badge::before {
  width: 5px;
  height: 5px;
}


/* Missing info state */

.ui-badge--info {
  color: var(--info);

  background: var(--info-bg);

  border-color: var(--info-border);
}


/* ================================================================
   06. HEADER
   ================================================================ */

:root {
  --header-h: 62px;
}


.app-header__inner {
  gap: 10px;
}


.app-header__side {
  gap: 9px;
}


.app-header__menu,
.app-header__action {
  width: 38px;
  height: 38px;
}


.app-header__profile [class$="__avatar"] {
  width: 38px;
  height: 38px;
}


/* ================================================================
   07. DRAWER COMPACT
   ================================================================ */

.app-drawer {
  width: min(315px, 88vw);
}


.app-drawer__inner {
  padding: 14px;
}


.app-drawer__header {
  padding-bottom: 11px;
  margin-bottom: 10px;
}


.app-drawer__profile {
  gap: 9px;

  padding: 9px;

  margin-bottom: 10px;

  border-radius: 12px;
}


.app-drawer__profile [class$="__avatar"] {
  width: 38px;
  height: 38px;
}


.app-drawer__nav {
  gap: 2px;
}


.app-drawer__link {
  min-height: 42px;

  gap: 9px;

  padding: 9px 10px;

  font-size: 0.84rem;
}


.app-drawer__footer {
  padding-top: 10px;
  margin-top: 10px;
}


/* ================================================================
   08. FOOTER
   ================================================================ */

.app-footer {
  padding-block: 18px;

  margin-top: 20px;
}


.app-footer__links {
  gap: 12px;
}


/* ================================================================
   09. MODAL — MAJOR FIX

   Desktop modal artıq 560px-lə məhdudlaşmır.
   ================================================================ */

@media (min-width: 640px) {

  .app-modal-backdrop {
    padding: 12px;
  }


  .app-modal {
    width: min(calc(100vw - 24px), 760px);

    max-width: 760px;

    max-height: calc(100dvh - 24px);

    border-radius: 18px;
  }


  .app-modal__header {
    align-items: center;

    padding: 12px 15px;
  }


  .app-modal__title {
    font-size: 1.05rem;
  }


  .app-modal__body {
    padding: 12px 15px;
  }


  .app-modal__footer {
    padding:
      9px
      15px
      11px;
  }

}


/* ================================================================
   10. MODAL FORM GRID — ƏN VACİB FIX

   Mövcud CSS bütün field-ləri span 2 edir.
   Bu override onu real 2 sütunlu edir.
   ================================================================ */

@media (min-width: 720px) {

  .modal-form__grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap:
      0
      10px;
  }


  .modal-form__grid .ui-field {
    grid-column: auto;

    min-width: 0;
  }


  /*
     Böyük məlumat sahələri tam eni tutur.
  */

  .modal-form__grid
  .ui-field:has(textarea),

  .modal-form__grid
  .ui-field:has(.ui-textarea),

  .modal-form__grid
  .ui-field:has(.ui-upload),

  .modal-form__grid
  .ui-field:has(input[type="file"]),

  .modal-form__grid
  .ui-field:has(.ui-check-list),

  .modal-form__grid
  .ui-field--full {
    grid-column: 1 / -1;
  }


  .modal-form__grid
  .ui-field--half {
    grid-column: auto;
  }

}


.modal-form__actions {
  position: sticky;

  z-index: 10;

  bottom: -12px;

  gap: 7px;

  margin:
    3px
    -15px
    -12px;

  padding:
    9px
    15px
    11px;

  border-top:
    1px solid
    var(--border);

  background:
    rgba(13, 16, 22, 0.97);

  backdrop-filter: blur(16px);

  -webkit-backdrop-filter: blur(16px);
}


html[data-theme="light"]
.modal-form__actions {
  background:
    rgba(255, 255, 255, 0.97);
}


.modal-form__actions .ui-button {
  flex:
    0
    1
    auto;

  min-width: 110px;
}


/* ================================================================
   11. PRODUCT DETAIL MODAL
   ================================================================ */

.product-modal {
  display: grid;

  grid-template-columns:
    minmax(210px, 0.85fr)
    minmax(0, 1.15fr);

  align-items: start;

  gap: 16px;
}


.product-modal__media {
  aspect-ratio: 1 / 1;

  margin-bottom: 0;

  border-radius: 14px;

  background: #fff;
}


.product-modal__media img {
  object-fit: contain;

  background: #fff;
}


.product-modal__content {
  min-width: 0;
}


.product-modal__name {
  margin-bottom: 3px;

  font-size: 1.2rem;
}


.product-modal__description {
  margin-bottom: 11px;

  font-size: 0.84rem;

  line-height: 1.5;
}


.product-modal__meta {
  display: flex;

  align-items: baseline;

  gap: 9px;

  margin-bottom: 10px;
}


.product-modal__price {
  margin-bottom: 0;

  font-size: 1.45rem;
}


.product-modal__unit {
  margin-bottom: 0;
}


.product-modal__facts {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 6px;

  margin-bottom: 0;
}


.product-modal__facts > div {
  min-width: 0;

  padding: 8px 9px;

  border:
    1px solid
    var(--border-subtle);

  border-radius: 10px;

  background: var(--surface-2);
}


.product-modal__facts span {
  display: block;

  margin-bottom: 2px;

  color: var(--text-faint);

  font-size: 0.66rem;

  text-transform: uppercase;
}


.product-modal__facts strong {
  display: block;

  overflow: hidden;

  color: var(--text);

  font-size: 0.82rem;

  text-overflow: ellipsis;

  white-space: nowrap;
}


/* ================================================================
   12. TRAINER MODAL
   ================================================================ */

.trainer-modal {
  display: grid;

  grid-template-columns:
    minmax(220px, 0.85fr)
    minmax(0, 1.15fr);

  align-items: start;

  gap: 16px;
}


.trainer-modal__media {
  aspect-ratio: 4 / 5;

  max-height: 390px;

  margin-bottom: 0;

  border-radius: 14px;
}


.trainer-modal__media img {
  object-fit: cover;

  object-position: center 18%;
}


.trainer-modal__content {
  min-width: 0;
}


.trainer-modal__name {
  font-size: 1.2rem;
}


.trainer-modal__specialty {
  margin-bottom: 9px;
}


.trainer-modal__description {
  margin-bottom: 12px;

  font-size: 0.84rem;

  line-height: 1.5;
}


/* ================================================================
   13. PRODUCT / TRAINER CARDS
   ================================================================ */

.trainers-grid,
.products-grid,
.admin-trainers-grid,
.admin-products-grid,
.pos-products-grid {
  grid-template-columns:
    repeat(
      auto-fill,
      minmax(175px, 1fr)
    );

  align-items: start;

  gap: 10px;
}


/* Tək məhsul varsa 500px-ə qədər uzanmasın */

.products-grid > .product-card,
.trainers-grid > .trainer-card,
.admin-products-grid > .admin-product-card,
.admin-trainers-grid > .admin-trainer-card,
.pos-products-grid > .pos-product-card {
  width: 100%;

  max-width: 245px;
}


/* Product şəkillərində cover deyil contain */

.product-card__media,
.pos-product-card__media {
  aspect-ratio: 1 / 0.82;
}


.product-card__image,
.product-card__image-fallback,
.pos-product-card__media img,
.admin-product-card__media img {
  object-fit: contain;

  background: #fff;
}


.product-card__body,
.pos-product-card__body {
  padding: 9px 10px;

  gap: 4px;
}


.product-card__name,
.pos-product-card__name {
  font-size: 0.86rem;
}


.product-card__price,
.pos-product-card__price {
  font-size: 1rem;
}


.product-card__favorite {
  top: 6px;
  right: 6px;

  width: 30px;
  height: 30px;
}


.product-card__stock-badge,
.pos-product-card__stock {
  top: 6px;
  left: 6px;
}


/* Trainer portreti */

.trainer-card__media {
  aspect-ratio: 4 / 5;
}


.trainer-card__image {
  object-fit: cover;

  object-position: center 18%;
}


.trainer-card__content {
  padding: 10px;
}


/* ================================================================
   14. GYM SHOWCASE
   ================================================================ */

.gym-showcase {
  grid-auto-rows: 125px;

  gap: 8px;
}


.gym-showcase__item {
  border-radius: 12px;
}


/* ================================================================
   15. HOME CTA
   ================================================================ */

.home-cta {
  padding:
    clamp(
      20px,
      3vw,
      30px
    );

  gap: 18px;

  border-radius: 18px;
}


.home-cta__title {
  margin:
    5px
    0
    7px;
}


.home-cta__actions {
  gap: 8px;
}


/* ================================================================
   16. MEMBERSHIP CARD
   ================================================================ */

.membership-card {
  padding: 15px;

  border-radius: 16px;
}


.membership-card__header {
  margin-bottom: 14px;
}


.membership-card__stats {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 6px;

  margin-bottom: 11px;
}


.membership-card__stats > div {
  min-width: 0;

  padding: 7px;

  border:
    1px solid
    var(--border-subtle);

  border-radius: 9px;

  background:
    rgba(255, 255, 255, 0.025);
}


.membership-card__stats span {
  display: block;

  color: var(--text-faint);

  font-size: 0.65rem;
}


.membership-card__stats strong {
  display: block;

  margin-top: 2px;

  overflow: hidden;

  color: var(--text);

  font-size: 0.78rem;

  text-overflow: ellipsis;

  white-space: nowrap;
}


.membership-card__progress {
  height: 5px;
}


/* ================================================================
   17. PROFILE COMPACT
   ================================================================ */

.profile-page .page-shell {
  padding-top: 16px;
}


.profile-hero {
  padding:
    clamp(
      16px,
      2.5vw,
      22px
    );

  margin-bottom: 12px;

  border-radius: 17px;
}


.profile-hero__identity {
  gap: 14px;
}


.profile-hero__actions {
  gap: 7px;

  margin-top: 10px;
}


.profile-overview {
  gap: 7px;

  margin-bottom: 10px;
}


.profile-stat-card {
  min-height: 76px;

  gap: 8px;

  padding: 9px;

  border-radius: 12px;
}


.profile-stat-card__icon {
  width: 32px;
  height: 32px;
}


.profile-stat-card__content strong {
  font-size: 1rem;
}


.profile-layout {
  gap: 8px;
}


.profile-layout__main,
.profile-layout__side {
  gap: 8px;
}


.profile-card,
.profile-side-card {
  padding: 12px;

  border-radius: 14px;
}


.profile-card__header {
  margin-bottom: 9px;
}


.profile-detail-grid {
  gap: 6px;
}


.profile-detail-item {
  padding: 8px 9px;

  border-radius: 9px;
}


.profile-action-list {
  gap: 3px;
}


.profile-action {
  gap: 8px;

  padding: 8px;

  border-radius: 9px;
}


.profile-action__icon {
  width: 31px;
  height: 31px;
}


.profile-security-list {
  gap: 5px;
}


.profile-security-item {
  gap: 8px;

  padding: 8px;

  border-radius: 9px;
}


/* ================================================================
   18. FAVORITES COMPACT
   ================================================================ */

.favorites-page .page-shell {
  padding-top: 16px;
}


.favorites-shell {
  gap: 12px;
}


.favorites-hero {
  padding:
    clamp(
      17px,
      3vw,
      24px
    );

  border-radius: 17px;
}


.favorites-hero__title {
  margin:
    4px
    0;
}


.favorites-content {
  min-height: 80px;
}


.favorites-empty {
  padding: 20px 12px;
}


.favorites-cta {
  gap: 10px;

  padding: 14px 16px;

  border-radius: 13px;
}


/* ================================================================
   19. FINANCE
   ================================================================ */

.finance-summary-grid {
  gap: 7px;
}


.finance-summary-card {
  min-height: 80px;

  gap: 4px;

  padding: 10px;

  border-radius: 12px;
}


.finance-summary-card strong {
  font-size: 1.25rem;
}


.finance-legend {
  gap: 10px;

  margin-top: 7px;
}


.finance-legend__dot {
  width: 6px;
  height: 6px;
}


/* Balans mavi olsun, gəlir/xərcdən dərhal seçilsin */

.finance-summary-card--balance {
  border-color: var(--info-border);

  background:
    linear-gradient(
      160deg,
      var(--info-bg),
      var(--surface) 70%
    );
}


.finance-summary-card--balance strong {
  color: var(--info);

  text-shadow:
    0
    0
    16px
    var(--info-glow);
}


.finance-value--neutral {
  color: var(--info);
}


/* ================================================================
   20. LIST / HISTORY / AUDIT
   ================================================================ */

.compact-list,
.operation-list,
.profile-history-list {
  gap: 4px;
}


.compact-list-item,
.operation-item,
.history-item {
  min-height: 48px;

  gap: 8px;

  padding: 7px 9px;

  border-radius: 10px;
}


.compact-list-item__icon,
.operation-item__icon,
.history-item__icon {
  width: 30px;
  height: 30px;
}


.compact-list-item__title,
.operation-item__title,
.history-item__title {
  font-size: 0.8rem;
}


.compact-list-item__meta,
.operation-item__meta,
.history-item__meta,
.operation-item__operator {
  font-size: 0.7rem;
}


.operation-list--audit .operation-item {
  border-left-width: 2px;
}


/* Audit detail */

.audit-change-list {
  gap: 5px;
}


.audit-change {
  padding: 8px 9px;

  border-radius: 9px;
}


.audit-change__field {
  margin-bottom: 4px;
}


.audit-change__values {
  gap: 6px;

  font-size: 0.78rem;
}


/* ================================================================
   21. AUTH COMPACT
   ================================================================ */

.auth-panel {
  padding:
    24px
    18px
    36px;
}


.auth-panel__header {
  margin-bottom: 16px;
}


.auth-form .ui-field {
  margin-bottom: 9px;
}


.auth-switch {
  margin-top: 12px;
}


.auth-terms {
  margin-top: 10px;
}


.auth-back-link {
  margin-bottom: 12px;
}


.auth-developer-credit {
  margin-top: 16px;

  padding-top: 10px;
}


/* Missing auth two-column row */

.auth-form__row {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 9px;
}


/* Missing status cards */

.auth-status-card {
  padding: 10px 11px;

  border:
    1px solid
    var(--border);

  border-radius: 11px;

  background: var(--surface);
}


.auth-status-card--success {
  border-color: var(--income-border);

  background: var(--income-bg);
}


.auth-status-card--error {
  border-color: var(--expense-border);

  background: var(--expense-bg);
}


/* ================================================================
   22. ADMIN — MAJOR DENSITY FIX
   ================================================================ */

.admin-sidebar {
  width: 218px;
}


.admin-sidebar__inner {
  padding:
    11px
    9px;
}


.admin-sidebar__brand {
  gap: 8px;

  padding:
    0
    6px
    12px;

  margin-bottom: 8px;
}


.admin-operator-card {
  gap: 8px;

  padding: 8px;

  margin-bottom: 8px;
}


.admin-navigation {
  gap: 2px;
}


.admin-navigation__item {
  min-height: 39px;

  gap: 8px;

  padding:
    8px
    9px;

  font-size: 0.8rem;
}


.admin-navigation__icon {
  width: 18px;
  height: 18px;
}


.admin-topbar {
  gap: 10px;

  padding:
    9px
    14px;
}


.admin-global-search {
  height: 38px;

  min-width: 200px;
}


.admin-topbar__operator {
  padding:
    6px
    10px;
}


.admin-panels {
  padding:
    12px
    14px;
}


.admin-panel {
  gap: 9px;
}


/* Claude CSS-də bu selector tam verilməyib */

.admin-panel__description {
  max-width: 720px;

  margin-top: 3px;

  color: var(--text-muted);

  font-size: 0.78rem;

  line-height: 1.4;
}


.admin-panel__header {
  gap: 9px;
}


.admin-kpi-grid {
  gap: 7px;
}


.admin-kpi-card {
  min-height: 82px;

  gap: 3px;

  padding: 9px;

  border-radius: 12px;
}


.admin-kpi-card strong {
  font-size: 1.35rem;
}


.admin-mini-kpi-row {
  gap: 6px;
}


.admin-mini-kpi {
  padding: 8px;

  border-radius: 10px;
}


.admin-section {
  padding: 10px;

  border-radius: 12px;
}


.admin-section__header {
  margin-bottom: 7px;
}


.admin-section__description {
  margin-top: 3px;

  font-size: 0.76rem;
}


.admin-dashboard-grid {
  gap: 7px;
}


/* ================================================================
   23. ADMIN TOOLBARS
   ================================================================ */

.admin-toolbar {
  display: grid;

  grid-template-columns:
    minmax(260px, 1fr)
    repeat(
      2,
      minmax(130px, 165px)
    );

  align-items: end;

  gap: 6px;
}


.admin-toolbar--finance,
.admin-toolbar--history {
  grid-template-columns:
    minmax(240px, 1fr)
    repeat(
      3,
      minmax(120px, 150px)
    )
    auto;
}


.admin-toolbar .search-control {
  margin: 0;
}


.admin-date-filter {
  display: grid;

  align-items: initial;

  gap: 3px;
}


.admin-date-filter > span {
  padding-left: 3px;

  color: var(--text-faint);

  font-size: 0.66rem;
}


/* ================================================================
   24. TABLE COMPACT
   ================================================================ */

.admin-table-wrap {
  border-radius: 11px;
}


.admin-table-wrap thead th {
  height: 34px;

  padding:
    0
    9px;

  font-size: 0.66rem;
}


.admin-table-wrap tbody td {
  height: 42px;

  padding:
    6px
    9px;

  font-size: 0.78rem;
}


.admin-table__primary {
  font-size: 0.8rem;
}


.admin-table__secondary {
  font-size: 0.7rem;
}


.admin-table__actions {
  gap: 4px;
}


.admin-user-cell {
  gap: 7px;
}


.admin-user-cell__avatar {
  width: 30px;
  height: 30px;
}


/* ================================================================
   25. ADMIN PRODUCT CARD
   ================================================================ */

.admin-product-card__media {
  aspect-ratio: 1 / 0.78;

  background: #fff;
}


.admin-product-card__body {
  gap: 4px;

  padding: 8px;
}


.admin-product-card__name {
  font-size: 0.82rem;
}


.admin-product-card__actions {
  gap: 5px;

  padding-top: 5px;
}


/* ================================================================
   26. ADMIN SETTING CARD — MISSING BASE STYLE
   ================================================================ */

.admin-setting-grid {
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(190px, 260px)
    );

  justify-content: start;

  gap: 7px;
}


.admin-setting-card {
  min-width: 0;

  padding: 10px;

  border:
    1px solid
    var(--border);

  border-radius: 12px;

  background:
    linear-gradient(
      150deg,
      var(--surface-2),
      var(--surface)
    );

  box-shadow: var(--shadow-sm);
}


.admin-setting-card__header {
  margin-bottom: 5px;
}


.admin-setting-card__meta {
  margin-bottom: 6px;
}


.admin-setting-card__price {
  font-size: 1.05rem;
}


/* ================================================================
   27. POS
   ================================================================ */

.pos-confirm__product {
  gap: 9px;

  margin-bottom: 10px;
}


.pos-confirm__media {
  width: 54px;
  height: 54px;
}


.pos-confirm__summary {
  gap: 5px;

  padding: 9px;

  border-radius: 10px;
}


.pos-confirm__row {
  font-size: 0.8rem;
}


.pos-confirm__row--total {
  padding-top: 7px;

  font-size: 1rem;
}


/* ================================================================
   28. QUICK SALE — CURRENT CSS-DƏ TAM YOXDUR
   ================================================================ */

.quick-sale-launcher {
  position: fixed;

  z-index: 75;

  top: 78px;
  right: 18px;

  height: 46px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  padding:
    0
    15px;

  border:
    1px solid
    rgba(255, 214, 10, 0.7);

  border-radius: 14px;

  color: var(--text-on-yellow);

  background: var(--grad-yellow);

  box-shadow:
    0
    0
    0
    1px
    rgba(255, 214, 10, 0.08),
    0
    0
    22px
    rgba(255, 214, 10, 0.22),
    0
    10px
    30px
    rgba(0, 0, 0, 0.3);

  font-family: var(--font-display);

  font-size: 0.82rem;

  font-weight: 700;

  letter-spacing: 0.04em;

  text-transform: uppercase;

  cursor: pointer;

  animation:
    skyfit-quick-pulse
    2s
    ease-in-out
    infinite;
}


.quick-sale-launcher__icon {
  width: 23px;
  height: 23px;

  display: grid;

  place-items: center;

  border-radius: 7px;

  color: var(--yellow);

  background: #090b10;
}


.quick-sale-launcher__badge {
  position: absolute;

  top: -5px;
  right: -5px;

  min-width: 18px;
  height: 18px;

  display: grid;

  place-items: center;

  padding:
    0
    4px;

  border:
    2px solid
    var(--bg);

  border-radius: 999px;

  color: #fff;

  background: var(--expense);

  font-size: 0.62rem;
}


@keyframes skyfit-quick-pulse {

  0%,
  100% {
    box-shadow:
      0
      0
      0
      0
      rgba(255, 214, 10, 0.22),
      0
      9px
      26px
      rgba(255, 214, 10, 0.16);
  }


  50% {
    box-shadow:
      0
      0
      0
      8px
      rgba(255, 214, 10, 0),
      0
      14px
      40px
      rgba(255, 214, 10, 0.3);
  }

}


/* ================================================================
   29. QUICK SALE PAGE FOUNDATION
   ================================================================ */

.quick-sale-page {
  min-height: 100dvh;
}


.quick-sale-shell {
  width: min(calc(100% - 24px), 1320px);

  margin-inline: auto;

  padding:
    16px
    0
    90px;
}


.quick-sale-hero {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

  padding: 16px;

  border:
    1px solid
    var(--border-yellow);

  border-radius: 16px;

  background:
    linear-gradient(
      145deg,
      var(--yellow-glow-faint),
      var(--surface)
    );
}


.quick-sale-hero__title {
  color: var(--text);

  font-size:
    clamp(
      1.55rem,
      3vw,
      2.2rem
    );

  text-transform: uppercase;
}


.quick-sale-hero__description {
  max-width: 620px;

  margin-top: 5px;

  color: var(--text-muted);

  font-size: 0.82rem;
}


.quick-sale-operator {
  min-width: 160px;

  padding: 9px 11px;

  border:
    1px solid
    var(--income-border);

  border-radius: 11px;

  background: var(--income-bg);
}


.quick-sale-operator span {
  display: block;

  color: var(--text-faint);

  font-size: 0.66rem;
}


.quick-sale-operator strong {
  display: block;

  margin-top: 2px;

  color: var(--income);

  font-size: 0.82rem;
}


/* ================================================================
   30. QUICK SALE PRODUCT GRID
   ================================================================ */

.quick-sale-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(160px, 1fr)
    );

  align-items: start;

  gap: 8px;

  margin-top: 10px;
}


.quick-sale-card {
  overflow: hidden;

  border:
    1px solid
    var(--border);

  border-radius: 13px;

  background: var(--surface);

  box-shadow: var(--shadow-sm);

  transition:
    transform
    var(--dur-fast)
    var(--ease),
    border-color
    var(--dur-fast)
    var(--ease);
}


.quick-sale-card:hover {
  border-color: var(--border-yellow);

  transform: translateY(-2px);
}


.quick-sale-card__media {
  position: relative;

  height: 120px;

  overflow: hidden;

  background: #fff;
}


.quick-sale-card__image {
  width: 100%;
  height: 100%;

  object-fit: contain;
}


.quick-sale-card__mode {
  position: absolute;

  left: 5px;
  bottom: 5px;

  min-height: 20px;

  display: inline-flex;

  align-items: center;

  padding:
    0
    6px;

  border:
    1px solid
    var(--border-yellow);

  border-radius: 999px;

  color: var(--yellow);

  background:
    rgba(3, 4, 6, 0.75);

  font-size: 0.62rem;

  font-weight: 700;
}


.quick-sale-card__body {
  padding: 8px;
}


.quick-sale-card__name {
  min-height: 35px;

  display: -webkit-box;

  overflow: hidden;

  color: var(--text);

  font-size: 0.8rem;

  line-height: 1.35;

  font-weight: 700;

  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}


.quick-sale-card__price {
  display: block;

  margin-top: 4px;

  color: var(--yellow);

  font-family: var(--font-num);

  font-size: 1rem;

  font-weight: 700;
}


.quick-sale-card__stock {
  display: block;

  margin-top: 2px;

  color: var(--text-faint);

  font-size: 0.68rem;
}


/* ================================================================
   31. QUICK SALE QUANTITY / PORTION / GRAM
   ================================================================ */

.quick-sale-presets {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 4px;

  margin-top: 7px;
}


.quick-sale-preset,
.quick-sale-gram,
.quick-sale-unit-tab {
  min-height: 32px;

  display: grid;

  place-items: center;

  padding:
    0
    5px;

  border:
    1px solid
    var(--border);

  border-radius: 8px;

  color: var(--text-soft);

  background: var(--surface-2);

  font-size: 0.72rem;

  font-weight: 700;

  cursor: pointer;
}


.quick-sale-preset:hover,
.quick-sale-preset.is-active,
.quick-sale-gram:hover,
.quick-sale-gram.is-active,
.quick-sale-unit-tab:hover,
.quick-sale-unit-tab.is-active {
  border-color: var(--border-yellow);

  color: var(--yellow);

  background: var(--yellow-glow-faint);
}


.quick-sale-unit-selector {
  display: grid;

  gap: 6px;
}


.quick-sale-unit-tabs {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 4px;
}


.quick-sale-gram-grid {
  display: grid;

  grid-template-columns:
    repeat(
      5,
      minmax(0, 1fr)
    );

  gap: 4px;
}


.quick-sale-custom-grams {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  gap: 5px;
}


/* ================================================================
   32. QUICK SALE SUMMARY
   ================================================================ */

.quick-sale-summary {
  overflow: hidden;

  border:
    1px solid
    var(--border);

  border-radius: 11px;

  background: var(--surface);
}


.quick-sale-summary__row {
  min-height: 36px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 10px;

  padding:
    0
    9px;

  border-bottom:
    1px solid
    var(--border-subtle);

  color: var(--text-muted);

  font-size: 0.76rem;
}


.quick-sale-summary__row:last-child {
  border-bottom: 0;
}


.quick-sale-summary__row strong {
  color: var(--text);

  font-size: 0.82rem;
}


.quick-sale-summary__row--total {
  min-height: 46px;

  background:
    var(--yellow-glow-faint);
}


.quick-sale-summary__row--total strong {
  color: var(--yellow);

  font-family: var(--font-num);

  font-size: 1.2rem;
}


.quick-sale-actions {
  display: grid;

  grid-template-columns:
    0.7fr
    1.3fr;

  gap: 6px;

  margin-top: 7px;
}


/* ================================================================
   33. RESPONSIVE — TABLET
   ================================================================ */

@media (max-width: 899px) {

  .admin-toolbar,
  .admin-toolbar--finance,
  .admin-toolbar--history {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }


  .admin-toolbar .search-control {
    grid-column:
      1 / -1;
  }


  .products-grid > .product-card,
  .trainers-grid > .trainer-card,
  .admin-products-grid > .admin-product-card,
  .admin-trainers-grid > .admin-trainer-card,
  .pos-products-grid > .pos-product-card {
    max-width: none;
  }


  .quick-sale-launcher {
    top: 72px;

    right: 9px;
  }

}


/* ================================================================
   34. RESPONSIVE — MOBILE
   ================================================================ */

@media (max-width: 719px) {

  .home-section {
    padding-block: 22px;
  }


  .section-heading {
    margin-bottom: 12px;
  }


  .auth-form__row {
    grid-template-columns: 1fr;
  }


  .product-modal,
  .trainer-modal {
    grid-template-columns: 1fr;
  }


  .product-modal__media {
    max-height: 230px;

    aspect-ratio: 16 / 10;
  }


  .trainer-modal__media {
    height: 300px;

    aspect-ratio: auto;
  }


  .membership-card__stats {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }


  .admin-toolbar,
  .admin-toolbar--finance,
  .admin-toolbar--history {
    grid-template-columns: 1fr;
  }


  .admin-toolbar .search-control {
    grid-column: auto;
  }


  .quick-sale-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );

    gap: 5px;
  }


  .quick-sale-card__media {
    height: 100px;
  }


  .quick-sale-card__body {
    padding: 6px;
  }


  .quick-sale-hero {
    align-items: flex-start;

    flex-direction: column;
  }


  .quick-sale-operator {
    width: 100%;
  }

}


/* ================================================================
   35. SMALL MOBILE
   ================================================================ */

@media (max-width: 480px) {

  :root {
    --shell-pad: 10px;
  }


  .page-shell {
    padding-inline: 10px;
  }


  .app-main {
    padding-bottom:
      calc(
        var(--bottom-nav-h) +
        12px
      );
  }


  .ui-button {
    height: 40px;

    min-height: 40px;

    padding-inline: 13px;
  }


  .profile-avatar {
    width: 70px;
    height: 70px;
  }


  .profile-hero {
    padding: 13px;
  }


  .profile-stat-card {
    padding: 7px;
  }


  .favorites-hero {
    padding: 14px;
  }


  .quick-sale-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }


  .quick-sale-presets {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }


  .quick-sale-gram-grid {
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
  }


  .quick-sale-actions {
    grid-template-columns: 1fr;
  }


  .quick-sale-launcher {
    min-width: 112px;

    height: 40px;

    padding:
      0
      10px;

    border-radius: 11px;

    font-size: 0.72rem;
  }

}


/* ================================================================
   36. FINAL OVERFLOW PROTECTION
   ================================================================ */

.admin-panel,
.admin-section,
.admin-content,
.profile-card,
.profile-side-card,
.product-card,
.trainer-card,
.pos-product-card,
.admin-product-card,
.quick-sale-card,
.modal-form__grid > *,
.admin-toolbar > * {
  min-width: 0;
}


img:not([src]),
img[src=""] {
  visibility: hidden;
}


/* ================================================================
   END
   SKY FIT PRO — FINAL COMPACT + MISSING COMPONENTS PATCH
   Senior Full Stack Developer: Qərib Səfərli
   ================================================================ */
