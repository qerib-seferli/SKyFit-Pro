// SKy Fit Pro — Admin quick sale bridge
import {
  byId, clearElement, createElement, escapeHtml, money,
  openModal, productImage, productName, productPrice, productStock,
} from './core.js';

export function createAdminQuickSale({
  state, loadProducts, productSaleVariants, productStockText, openPosSaleModal,
}) {
  function quickSaleProducts() {
    const preferred = state.products
      .filter(product => product.is_active !== false)
      .filter(product => productStock(product) > 0)
      .filter(product => productSaleVariants(product, { quickOnly: true }).length > 0);
    if (preferred.length) return preferred;
    return state.products
      .filter(product => product.is_active !== false)
      .filter(product => productStock(product) > 0);
  }

  function ensureQuickSaleFab() {
    let button = byId('admin-quick-sale-fab');
    if (button) return button;
    button = createElement('button', {
      className: 'admin-quick-sale-fab',
      attrs: { id: 'admin-quick-sale-fab', type: 'button', 'aria-label': 'Tez satış aç', title: 'Tez satış' },
    });
    button.innerHTML = '<span class="admin-quick-sale-fab__icon" aria-hidden="true">⚡</span><span class="admin-quick-sale-fab__label">Tez satış</span>';
    button.addEventListener('click', () => void openQuickSaleModal(button));
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
      const card = createElement('button', { className: 'quick-sale-card', attrs: { type: 'button' } });
      card.innerHTML = `
        <span class="quick-sale-card__media">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}" loading="lazy" decoding="async">` : '<span class="product-card__image-fallback">SK</span>'}
        </span>
        <span class="quick-sale-card__body">
          <strong>${escapeHtml(productName(product))}</strong>
          <span>${variants.length ? `${escapeHtml(String(variants.length))} seçim` : escapeHtml(money(productPrice(product)))}</span>
          <small>${escapeHtml(productStockText(product))}</small>
        </span>`;
      card.addEventListener('click', () => openPosSaleModal(product, card, { quickOnly: variants.length > 0 }));
      root.append(card);
    });

    if (!products.length) {
      root.innerHTML = '<div class="ui-empty-state quick-sale-empty"><strong>Satış üçün məhsul yoxdur</strong><span>Aktiv məhsul əlavə et və stok daxil et.</span></div>';
    }
  }

  async function openQuickSaleModal(trigger = null) {
    if (state.products.length === 0) await loadProducts();
    const content = createElement('div', { className: 'quick-sale-panel' });
    content.innerHTML = `
      <div class="quick-sale-panel__header"><div>
        <span class="section-eyebrow">Şəkilli POS</span>
        <strong>Bir toxunuşla məhsulu seç</strong>
        <small>Məhsula toxun, ölçünü və ödənişi seç, sonra satışı təsdiqlə.</small>
      </div></div>
      <div id="quick-sale-products-grid" class="quick-sale-products-grid"></div>`;
    openModal({ eyebrow: 'SKy Fit POS', title: 'Tez satış', content, trigger, className: 'app-modal--quick-sale', onOpen: renderQuickSaleProducts });
  }

  function bind() {
    byId('admin-quick-action-button')?.addEventListener('click', event => void openQuickSaleModal(event.currentTarget));
    ensureQuickSaleFab();
  }

  return { bind, open: openQuickSaleModal, render: renderQuickSaleProducts };
}
