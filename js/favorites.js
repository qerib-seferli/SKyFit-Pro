// ============================================================
// SKY FIT PRO
// Favorites Page Controller
// File: js/favorites.js
// ============================================================

import {
  supabase,
  TABLES,
} from './config.js';

import {
  byId,
  clearElement,
  createProductCard,
  getFavoriteIds,
  clearFavorites,
  bindSearchClear,
  debounce,
  normalizeString,
  showElement,
  hideElement,
  confirmDialog,
  notify,
  asyncHandler,
} from './core.js';

import {
  initLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {
  products: [],
  search: '',
};


// ============================================================
// 02. DOM
// ============================================================

const elements = {
  grid:
    byId('favorites-grid'),

  count:
    byId('favorites-count'),

  clearButton:
    byId('favorites-clear-button'),

  emptyState:
    byId('favorites-empty-state'),

  searchEmptyState:
    byId('favorites-search-empty-state'),

  searchInput:
    byId('favorites-search-input'),

  searchClear:
    byId('favorites-search-clear'),
};


// ============================================================
// 03. FAVORITE IDS
// ============================================================

function favoriteIds() {
  return getFavoriteIds();
}


// ============================================================
// 04. LOAD PRODUCTS
// ============================================================

async function loadFavoriteProducts() {
  const ids =
    favoriteIds();


  if (ids.length === 0) {
    state.products = [];

    render();

    return;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(TABLES.products)
      .select('*')
      .in(
        'id',
        ids
      );


  if (error) {
    console.error(
      'Favorites products error:',
      error
    );

    state.products = [];

    notify.error(
      'Sevimli məhsullar yüklənmədi.'
    );

    render();

    return;
  }


  const products =
    Array.isArray(data)
      ? data
      : [];


  // localStorage sırasını qoruyuruq.
  state.products =
    ids
      .map(
        id =>
          products.find(
            product =>
              String(product.id) ===
              String(id)
          )
      )
      .filter(Boolean);


  render();
}


// ============================================================
// 05. FILTER
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
      const text =
        [
          product?.name,
          product?.description,
          product?.unit,
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


// ============================================================
// 06. COUNTER
// ============================================================

function renderCounter() {
  if (!elements.count) {
    return;
  }

  elements.count.textContent =
    String(
      state.products.length
    );
}


// ============================================================
// 07. EMPTY STATES
// ============================================================

function renderEmptyStates(
  filtered
) {
  const hasFavorites =
    state.products.length > 0;

  const hasSearch =
    Boolean(
      normalizeString(
        state.search
      )
    );


  if (!hasFavorites) {
    showElement(
      elements.emptyState
    );

    hideElement(
      elements.searchEmptyState
    );

    hideElement(
      elements.clearButton
    );

    return;
  }


  hideElement(
    elements.emptyState
  );

  showElement(
    elements.clearButton
  );


  if (
    hasSearch &&
    filtered.length === 0
  ) {
    showElement(
      elements.searchEmptyState
    );
  } else {
    hideElement(
      elements.searchEmptyState
    );
  }
}


// ============================================================
// 08. RENDER
// ============================================================

function render() {
  if (!elements.grid) {
    return;
  }


  clearElement(
    elements.grid
  );


  const filtered =
    filteredProducts();


  filtered.forEach(
    product => {
      const card =
        createProductCard(
          product,
          {
            showFavorite: true,

            onFavoriteChange: (
              item,
              active
            ) => {
              if (!active) {
                state.products =
                  state.products.filter(
                    product =>
                      String(
                        product.id
                      ) !==
                      String(
                        item.id
                      )
                  );

                render();
              }
            },
          }
        );


      elements.grid.append(
        card
      );
    }
  );


  renderCounter();

  renderEmptyStates(
    filtered
  );
}


// ============================================================
// 09. SEARCH
// ============================================================

function bindSearch() {
  if (
    !elements.searchInput ||
    !elements.searchClear
  ) {
    return;
  }


  const updateSearch =
    debounce(
      value => {
        state.search =
          normalizeString(
            value
          );

        render();
      }
    );


  bindSearchClear({
    input:
      elements.searchInput,

    clearButton:
      elements.searchClear,

    onChange:
      updateSearch,
  });
}


// ============================================================
// 10. CLEAR FAVORITES
// ============================================================

function bindClearFavorites() {
  elements.clearButton
    ?.addEventListener(
      'click',
      async () => {
        const confirmed =
          await confirmDialog({
            eyebrow:
              'Sevimlilər',

            title:
              'Hamısı silinsin?',

            message:
              'Sevimli məhsullar siyahısı tam təmizlənəcək.',

            confirmText:
              'Təmizlə',

            cancelText:
              'Ləğv et',

            danger:
              true,
          });


        if (!confirmed) {
          return;
        }


        clearFavorites();

        state.products = [];

        state.search = '';


        if (
          elements.searchInput
        ) {
          elements.searchInput.value =
            '';
        }


        render();


        notify.success(
          'Sevimlilər təmizləndi.'
        );
      }
    );
}


// ============================================================
// 11. FAVORITES CHANGE EVENT
// Digər tab və ya komponentdə dəyişiklik olarsa sinxron qalır.
// ============================================================

function bindFavoritesChange() {
  window.addEventListener(
    'skyfit:favoriteschange',
    async () => {
      await loadFavoriteProducts();
    }
  );
}


// ============================================================
// 12. AUTH CHANGE
// Layout özü session dəyişməsini idarə edir.
// ============================================================

function bindAuthChange() {
  window.addEventListener(
    'skyfit:authchange',
    () => {
      // Favorites hazırda localStorage əsaslıdır.
      // Buna görə auth dəyişəndə məhsul siyahısını silmirik.
    }
  );
}


// ============================================================
// 13. INIT
// ============================================================

async function init() {
  await initLayout();

  bindSearch();

  bindClearFavorites();

  bindFavoritesChange();

  bindAuthChange();

  await loadFavoriteProducts();
}


// ============================================================
// 14. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError: true,
  }
)();


// ============================================================
// FAVORITES.JS COMPLETE
// ============================================================
