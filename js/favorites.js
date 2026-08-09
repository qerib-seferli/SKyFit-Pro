// SKy Fit Pro — sevimlilər səhifəsi controller-i
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  TABLES,
  UI_CONFIG,
} from './config.js';

import {
  SKYFIT_EVENTS,
  byId,
  clearElement,
  createProductCard,
  getFavoriteIds,
  clearFavorites,
  bindSearchClear,
  debounce,
  normalizeSearch,
  showElement,
  hideElement,
  confirmDialog,
  notify,
  getErrorMessage,
  asyncHandler,
} from './core.js';

import { initLayout } from './layout.js';

const state = {
  products: [],
  search: '',
  loading: false,
};

const elements = {
  grid: byId('favorites-grid'),
  count: byId('favorites-count'),
  clearButton: byId('favorites-clear-button'),
  emptyState: byId('favorites-empty-state'),
  searchEmptyState: byId('favorites-search-empty-state'),
  searchInput: byId('favorites-search-input'),
  searchClear: byId('favorites-search-clear'),
};

function favoriteIds() {
  return getFavoriteIds();
}

async function loadFavoriteProducts() {
  if (state.loading) return;

  const ids = favoriteIds();

  if (ids.length === 0) {
    state.products = [];
    render();
    return;
  }

  state.loading = true;

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
        low_stock_threshold,
        show_public,
        is_active
      `)
      .in('id', ids)
      .eq('is_active', true)
      .eq('show_public', true);

    if (error) throw error;

    const products =
      Array.isArray(data) ? data : [];

    const byIdMap = new Map(
      products.map(product => [
        String(product.id),
        product,
      ])
    );

    state.products = ids
      .map(id => byIdMap.get(String(id)))
      .filter(Boolean);

    render();
  } catch (error) {
    console.error(
      '[SKy Fit Favorites] Products:',
      error
    );

    state.products = [];
    render();

    notify.error(
      getErrorMessage(
        error,
        'Sevimli məhsullar yüklənmədi.'
      )
    );
  } finally {
    state.loading = false;
  }
}

function filteredProducts() {
  const search = normalizeSearch(state.search);

  if (!search) {
    return [...state.products];
  }

  return state.products.filter(product => {
    const text = normalizeSearch(
      [
        product?.name,
        product?.description,
        product?.category,
        product?.sku,
        product?.stock_unit,
      ]
        .filter(Boolean)
        .join(' ')
    );

    return text.includes(search);
  });
}

function renderCounter() {
  if (!elements.count) return;

  elements.count.textContent =
    String(state.products.length);
}

function renderEmptyStates(filtered) {
  const hasFavorites =
    state.products.length > 0;

  const hasSearch =
    Boolean(normalizeSearch(state.search));

  if (!hasFavorites) {
    showElement(elements.emptyState);
    hideElement(elements.searchEmptyState);
    hideElement(elements.clearButton);
    return;
  }

  hideElement(elements.emptyState);
  showElement(elements.clearButton);

  if (
    hasSearch &&
    filtered.length === 0
  ) {
    showElement(elements.searchEmptyState);
  } else {
    hideElement(elements.searchEmptyState);
  }
}

function render() {
  if (!elements.grid) return;

  clearElement(elements.grid);

  const filtered = filteredProducts();
  const fragment =
    document.createDocumentFragment();

  filtered.forEach(product => {
    fragment.append(
      createProductCard(product, {
        showFavorite: true,
        onFavoriteChange: (
          item,
          active
        ) => {
          if (active) return;

          state.products =
            state.products.filter(
              product =>
                String(product.id) !==
                String(item.id)
            );

          render();
        },
      })
    );
  });

  elements.grid.append(fragment);

  renderCounter();
  renderEmptyStates(filtered);
}

function bindSearch() {
  if (
    !elements.searchInput ||
    !elements.searchClear
  ) {
    return;
  }

  const updateSearch = debounce(
    value => {
      state.search = value;
      render();
    },
    UI_CONFIG.debounceDelay
  );

  bindSearchClear({
    input: elements.searchInput,
    clearButton: elements.searchClear,
    onChange: updateSearch,
  });
}

function bindClearFavorites() {
  elements.clearButton?.addEventListener(
    'click',
    async () => {
      const confirmed =
        await confirmDialog({
          eyebrow: 'Sevimlilər',
          title: 'Hamısı silinsin?',
          message:
            'Sevimli məhsullar siyahısı tam təmizlənəcək.',
          confirmText: 'Təmizlə',
          cancelText: 'Ləğv et',
          danger: true,
        });

      if (!confirmed) return;

      clearFavorites();

      state.products = [];
      state.search = '';

      if (elements.searchInput) {
        elements.searchInput.value = '';
      }

      if (elements.searchClear) {
        elements.searchClear.hidden = true;
      }

      render();

      notify.success(
        'Sevimlilər təmizləndi.'
      );
    }
  );
}

function bindFavoritesChange() {
  window.addEventListener(
    SKYFIT_EVENTS.favoritesChange,
    event => {
      const ids =
        Array.isArray(event.detail?.ids)
          ? event.detail.ids.map(String)
          : favoriteIds();

      const currentIds = new Set(
        state.products.map(product =>
          String(product.id)
        )
      );

      const hasUnknownProduct =
        ids.some(id => !currentIds.has(id));

      if (hasUnknownProduct) {
        void loadFavoriteProducts();
        return;
      }

      const allowed = new Set(ids);

      state.products =
        state.products.filter(product =>
          allowed.has(String(product.id))
        );

      render();
    }
  );

  window.addEventListener(
    'storage',
    event => {
      if (
        event.key !==
        'skyfit-pro-favorites'
      ) {
        return;
      }

      void loadFavoriteProducts();
    }
  );
}

async function init() {
  await initLayout();

  bindSearch();
  bindClearFavorites();
  bindFavoritesChange();

  await loadFavoriteProducts();
}

asyncHandler(init, {
  notifyOnError: true,
})();
