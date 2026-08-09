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
