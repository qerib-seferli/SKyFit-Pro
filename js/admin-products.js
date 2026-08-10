// SKy Fit Pro — Admin məhsullar görünüşü
import { UI_CONFIG } from './config.js';
import {
  $, byId, clearElement, createElement, normalizeString, normalizeSearch,
  escapeHtml, money, debounce, productName, productPrice, productImage,
  productStockState,
} from './core.js';

export function createAdminProductsController(ctx) {
  const { state, productStockText, openProductEditor, openStockAddModal, openStockAdjustModal, createDashboardEmpty } = ctx;

  function filtered() {
    const search = normalizeSearch(byId('products-admin-search')?.value);
    const status = normalizeString(byId('products-admin-status')?.value, 'all');
    return state.products.filter(product => {
      if (!search) return true;
      return [product.name, product.sku, product.category, product.description]
        .filter(Boolean).join(' ').toLocaleLowerCase('az-AZ').includes(search);
    }).filter(product => {
      if (status === 'active') return product.is_active !== false;
      if (status === 'inactive') return product.is_active === false;
      if (status === 'public') return product.show_public !== false;
      return true;
    });
  }

  function card(product) {
    const image = productImage(product);
    const stockState = productStockState(product);
    const el = createElement('article', { className: 'admin-product-card', dataset: { productId: product.id } });
    el.innerHTML = `
      <button type="button" class="admin-product-card__main" aria-label="${escapeHtml(productName(product))} məhsulunu redaktə et">
        <div class="admin-product-card__media">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}" loading="lazy" decoding="async">` : `<span class="product-card__image-fallback" aria-hidden="true">◫</span>`}
        </div>
        <div class="admin-product-card__body">
          <div class="admin-product-card__badges">
            <span class="${stockState.className}">${escapeHtml(stockState.label)}</span>
            ${product.is_active === false ? '<span class="ui-badge ui-badge--danger">Deaktiv</span>' : ''}
            ${product.show_public === false ? '<span class="ui-badge ui-badge--neutral">Saytda gizli</span>' : ''}
          </div>
          <strong class="admin-product-card__name">${escapeHtml(productName(product))}</strong>
          <span class="admin-product-card__meta">${product.sku ? `SKU: ${escapeHtml(product.sku)}` : 'SKU yoxdur'}</span>
          <div class="admin-product-card__row">
            <span class="admin-product-card__price">${escapeHtml(money(productPrice(product)))}</span>
            <span class="admin-product-card__stock">${escapeHtml(productStockText(product))}</span>
          </div>
        </div>
      </button>
      <div class="admin-product-card__actions">
        <button type="button" class="ui-button ui-button--glass" data-product-stock="${escapeHtml(product.id)}"><span class="ui-button__label">+ Stok</span></button>
        <button type="button" class="ui-button ui-button--glass" data-product-adjust="${escapeHtml(product.id)}"><span class="ui-button__label">Düzəlt</span></button>
      </div>`;
    $('.admin-product-card__main', el)?.addEventListener('click', () => openProductEditor(product, el));
    $('[data-product-stock]', el)?.addEventListener('click', () => openStockAddModal(product, el));
    $('[data-product-adjust]', el)?.addEventListener('click', () => openStockAdjustModal(product, el));
    return el;
  }

  function render() {
    const root = byId('admin-products-grid');
    if (!root) return;
    clearElement(root);
    const items = filtered();
    items.forEach(product => root.append(card(product)));
    if (!items.length) root.append(createDashboardEmpty('Məhsul tapılmadı.'));
  }

  function bind() {
    byId('product-create-button')?.addEventListener('click', () => openProductEditor());
    byId('products-admin-search')?.addEventListener('input', debounce(render, UI_CONFIG.debounceDelay));
    byId('products-admin-status')?.addEventListener('change', render);
  }

  return { render, bind };
}
