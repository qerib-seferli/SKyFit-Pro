// SKy Fit Pro — Admin stok görünüşü
import {
  $, $$, byId, clearElement, createElement, normalizeString, normalizeSearch,
  escapeHtml, money, formatDateTime, productName, productPrice, productStock,
  productStockUnit, productStockState,
} from './core.js';

export function createAdminStockController(ctx) {
  const { state, stockNumber, visibleListItems, bindInfiniteList, openStockAddModal, openStockAdjustModal } = ctx;

  function filtered() {
    const search = normalizeSearch(byId('stock-search')?.value);
    const filter = normalizeString(byId('stock-filter')?.value, 'all');
    return state.products.filter(product => {
      if (!search) return true;
      return [product.name, product.sku, product.category].filter(Boolean).join(' ').toLocaleLowerCase('az-AZ').includes(search);
    }).filter(product => {
      const meta = productStockState(product);
      if (filter === 'low') return meta.key === 'low';
      if (filter === 'empty') return meta.key === 'out';
      return true;
    });
  }

  function movementLabel(type) {
    switch (normalizeString(type)) {
      case 'purchase': return 'Alış';
      case 'sale': return 'Satış';
      case 'adjustment': return 'Düzəliş';
      case 'cancellation': return 'Satışın ləğvi';
      case 'return': return 'Qaytarma';
      default: return normalizeString(type, 'Hərəkət');
    }
  }
  function movementClass(type) {
    switch (normalizeString(type)) {
      case 'purchase': case 'return': return 'ui-badge ui-badge--success';
      case 'sale': return 'ui-badge ui-badge--warning';
      case 'adjustment': return 'ui-badge ui-badge--neutral';
      case 'cancellation': return 'ui-badge ui-badge--danger';
      default: return 'ui-badge';
    }
  }

  function renderProducts() {
    const root = byId('stock-list'); if (!root) return;
    clearElement(root);
    const items = filtered();
    const table = createElement('table', { className: 'admin-table' });
    table.innerHTML = `<thead><tr><th>Məhsul</th><th>Satış</th><th>Stok</th><th>Vəziyyət</th><th>Əməliyyat</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    items.forEach(product => {
      const meta = productStockState(product); const row = createElement('tr');
      row.innerHTML = `<td><strong class="admin-table__primary">${escapeHtml(productName(product))}</strong><span class="admin-table__secondary">${escapeHtml(product.sku || product.category || '—')}</span></td>
        <td>${escapeHtml(money(productPrice(product)))}</td>
        <td><strong>${escapeHtml(stockNumber(productStock(product), productStockUnit(product)))}</strong> ${escapeHtml(productStockUnit(product))}</td>
        <td><span class="${meta.className}">${escapeHtml(meta.label)}</span></td>
        <td><div class="admin-table__actions"><button type="button" class="admin-row-action" data-stock-add="${escapeHtml(product.id)}" title="Stok artır">+</button><button type="button" class="admin-row-action" data-stock-adjust="${escapeHtml(product.id)}" title="Stoku düzəlt">✎</button></div></td>`;
      tbody.append(row);
    });
    root.append(table);
    $$('[data-stock-add]', root).forEach(button => button.addEventListener('click', () => {
      const product = state.products.find(item => String(item.id) === String(button.dataset.stockAdd)); if (product) openStockAddModal(product, button);
    }));
    $$('[data-stock-adjust]', root).forEach(button => button.addEventListener('click', () => {
      const product = state.products.find(item => String(item.id) === String(button.dataset.stockAdjust)); if (product) openStockAdjustModal(product, button);
    }));
  }

  function renderMovements() {
    const root = byId('stock-movements-list'); if (!root) return;
    clearElement(root);
    const table = createElement('table', { className: 'admin-table' });
    table.innerHTML = `<thead><tr><th>Məhsul</th><th>Hərəkət</th><th>Miqdar</th><th>Qalıq</th><th>Qeyd</th><th>Tarix</th></tr></thead><tbody></tbody>`;
    const tbody = $('tbody', table);
    visibleListItems('stockMovements', state.stockMovements).forEach(movement => {
      const row = createElement('tr');
      row.innerHTML = `<td><strong class="admin-table__primary">${escapeHtml(movement.product?.name || 'Məhsul')}</strong></td>
        <td><span class="${movementClass(movement.movement_type)}">${escapeHtml(movementLabel(movement.movement_type))}</span></td>
        <td>${escapeHtml(stockNumber(movement.quantity, movement.product?.stock_unit))}</td>
        <td>${escapeHtml(stockNumber(movement.balance_after, movement.product?.stock_unit))}</td>
        <td>${escapeHtml(movement.note || '—')}</td><td>${formatDateTime(movement.created_at)}</td>`;
      tbody.append(row);
    });
    root.append(table);
    bindInfiniteList(root, 'stockMovements', renderMovements, state.stockMovements.length);
  }

  function render() { renderProducts(); renderMovements(); }
  return { render, renderProducts, renderMovements };
}
