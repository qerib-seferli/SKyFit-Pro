// SKy Fit Pro — ana səhifə controller-i
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  TABLES,
  UI_CONFIG,
} from './config.js';

import {
  byId,
  clearElement,
  showElement,
  hideElement,
  normalizeString,
  normalizeSearch,
  debounce,
  rows,
  createProductCard,
  createTrainerCard,
  bindSearchClear,
  notify,
  getErrorMessage,
  asyncHandler,
} from './core.js';

import { initLayout } from './layout.js';

const DATA_REFRESH_INTERVAL = 2 * 60 * 1000;

const state = {
  products: [],
  trainers: [],
  productSearch: '',
  productsExpanded: false,
  trainersExpanded: false,
  loading: {
    products: false,
    trainers: false,
  },
};

let lastRefreshAt = Date.now();

function getElements() {
  return {
    trainersGrid: byId('trainers-grid'),
    trainersEmpty: byId('trainers-empty-state'),
    trainersShowAll: byId('trainers-show-all-button'),

    productsGrid: byId('products-grid'),
    productsEmpty: byId('products-empty-state'),
    productsSearchEmpty: byId('products-search-empty-state'),
    productsShowAll: byId('products-show-all-button'),
    productSearch: byId('product-search-input'),
    productSearchClear: byId('product-search-clear'),
  };
}

async function loadProducts() {
  if (state.loading.products) return;

  state.loading.products = true;

  try {
    const { data, error } = await supabase
      .from(TABLES.products)
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
      .eq('is_active', true)
      .eq('show_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    state.products = rows(data);
    renderProducts();
  } catch (error) {
    console.error('[SKy Fit Home] Products:', error);
    state.products = [];
    renderProducts();

    notify.error(
      getErrorMessage(error, 'Məhsullar yüklənmədi.')
    );
  } finally {
    state.loading.products = false;
  }
}

function filteredProducts() {
  const search = normalizeSearch(state.productSearch);

  if (!search) return [...state.products];

  return state.products.filter(product => {
    const searchable = normalizeSearch(
      [
        product.name,
        product.description,
        product.category,
        product.sku,
      ]
        .filter(Boolean)
        .join(' ')
    );

    return searchable.includes(search);
  });
}

function renderProducts() {
  const elements = getElements();
  if (!elements.productsGrid) return;

  clearElement(elements.productsGrid);

  const filtered = filteredProducts();
  const hasSearch = Boolean(
    normalizeString(state.productSearch)
  );

  const visible =
    state.productsExpanded || hasSearch
      ? filtered
      : filtered.slice(0, UI_CONFIG.products.homeLimit);

  const fragment = document.createDocumentFragment();

  visible.forEach(product => {
    fragment.append(createProductCard(product));
  });

  elements.productsGrid.append(fragment);

  const noProducts = state.products.length === 0;
  const noSearchResults =
    !noProducts &&
    hasSearch &&
    filtered.length === 0;

  toggleVisibility(elements.productsEmpty, noProducts);
  toggleVisibility(
    elements.productsSearchEmpty,
    noSearchResults
  );

  if (elements.productsShowAll) {
    const shouldShow =
      !hasSearch &&
      state.products.length > UI_CONFIG.products.homeLimit;

    toggleVisibility(
      elements.productsShowAll,
      shouldShow
    );

    elements.productsShowAll.textContent =
      state.productsExpanded
        ? 'Daha az göstər'
        : 'Hamısını göstər';
  }
}

function bindProductEvents() {
  const elements = getElements();

  const applySearch = debounce(
    value => {
      state.productSearch = normalizeString(value);
      renderProducts();
    },
    UI_CONFIG.debounceDelay
  );

  bindSearchClear({
    input: elements.productSearch,
    clearButton: elements.productSearchClear,
    onChange: applySearch,
  });

  elements.productsShowAll?.addEventListener(
    'click',
    () => {
      state.productsExpanded = !state.productsExpanded;
      renderProducts();
    }
  );
}

async function loadTrainers() {
  if (state.loading.trainers) return;

  state.loading.trainers = true;

  try {
    const { data, error } = await supabase
      .from(TABLES.trainers)
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
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    state.trainers = rows(data);
    renderTrainers();
  } catch (error) {
    console.error('[SKy Fit Home] Trainers:', error);
    state.trainers = [];
    renderTrainers();

    notify.error(
      getErrorMessage(error, 'Məşqçilər yüklənmədi.')
    );
  } finally {
    state.loading.trainers = false;
  }
}

function renderTrainers() {
  const elements = getElements();
  if (!elements.trainersGrid) return;

  clearElement(elements.trainersGrid);

  const visible = state.trainersExpanded
    ? state.trainers
    : state.trainers.slice(0, UI_CONFIG.trainers.homeLimit);

  const fragment = document.createDocumentFragment();

  visible.forEach(trainer => {
    fragment.append(createTrainerCard(trainer));
  });

  elements.trainersGrid.append(fragment);

  toggleVisibility(
    elements.trainersEmpty,
    state.trainers.length === 0
  );

  if (elements.trainersShowAll) {
    const shouldShow =
      state.trainers.length > UI_CONFIG.trainers.homeLimit;

    toggleVisibility(
      elements.trainersShowAll,
      shouldShow
    );

    elements.trainersShowAll.textContent =
      state.trainersExpanded
        ? 'Daha az göstər'
        : 'Hamısını göstər';
  }
}

function bindTrainerEvents() {
  getElements()
    .trainersShowAll
    ?.addEventListener('click', () => {
      state.trainersExpanded = !state.trainersExpanded;
      renderTrainers();
    });
}

function toggleVisibility(element, visible) {
  if (!element) return;

  if (visible) {
    showElement(element);
  } else {
    hideElement(element);
  }
}

function bindHeroImages() {
  document
    .querySelectorAll('[data-gym-image]')
    .forEach(image => {
      image.addEventListener(
        'error',
        () => {
          image.classList.add('is-image-missing');
        },
        { once: true }
      );
    });
}

function bindVisibilityRefresh() {
  document.addEventListener(
    'visibilitychange',
    async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const now = Date.now();

      if (
        now - lastRefreshAt <
        DATA_REFRESH_INTERVAL
      ) {
        return;
      }

      lastRefreshAt = now;

      await Promise.all([
        loadProducts(),
        loadTrainers(),
      ]);
    }
  );
}

async function loadInitialData() {
  await Promise.all([
    loadProducts(),
    loadTrainers(),
  ]);
}

async function init() {
  try {
    await initLayout();

    bindProductEvents();
    bindTrainerEvents();
    bindHeroImages();
    bindVisibilityRefresh();

    await loadInitialData();
    lastRefreshAt = Date.now();
  } catch (error) {
    console.error('[SKy Fit Home] Init:', error);

    notify.error(
      getErrorMessage(
        error,
        'Ana səhifə başladılmadı.'
      )
    );
  }
}

asyncHandler(init, {
  notifyOnError: true,
})();
