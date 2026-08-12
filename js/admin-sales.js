// SKy Fit Pro — POS satış tarixçəsi və təhlükəsiz qaytarma
import { supabase, TABLES, RPC } from './config.js';
import {
  $, byId, clearElement, createElement, escapeHtml, formatDateTime, money,
  normalizeString, openModal, closeModal, notify, getErrorMessage, setButtonLoading,
} from './core.js';

const state = { sales: [], items: [], reversals: [], bound: false };

function paymentLabel(value) {
  switch (normalizeString(value)) {
    case 'cash': return 'Nağd';
    case 'card': return 'Kart';
    case 'mixed': return 'Nağd + Kart';
    case 'debt': return 'Borc';
    default: return '—';
  }
}

function statusLabel(value) {
  switch (normalizeString(value)) {
    case 'paid': return 'Ödənilib';
    case 'debt': return 'Borc';
    case 'refunded': return 'Qaytarılıb';
    case 'cancelled': return 'Ləğv edilib';
    default: return normalizeString(value, '—');
  }
}

function statusClass(value) {
  switch (normalizeString(value)) {
    case 'paid': return 'ui-badge ui-badge--success';
    case 'debt': return 'ui-badge ui-badge--danger';
    case 'refunded':
    case 'cancelled': return 'ui-badge ui-badge--neutral';
    default: return 'ui-badge';
  }
}

function saleItems(saleId) {
  return state.items.filter(item => String(item.sale_id) === String(saleId));
}

function saleSummary(saleId) {
  const items = saleItems(saleId);
  if (!items.length) return 'Məhsul məlumatı yoxdur';
  return items.slice(0, 4).map(item => {
    const variant = normalizeString(item.sale_variant_name);
    return `${item.product_name || 'Məhsul'}${variant ? ` · ${variant}` : ''}${Number(item.quantity) > 1 ? ` ×${item.quantity}` : ''}`;
  }).join(', ') + (items.length > 4 ? ` +${items.length - 4}` : '');
}

async function loadData() {
  const [salesRes, itemsRes, reversalRes] = await Promise.all([
    supabase.from(TABLES.sales).select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from(TABLES.saleItems).select('id,sale_id,product_id,product_name,quantity,stock_deduction,unit_price,line_total,sale_variant_name,unit_cost,cost_total,gross_profit').order('id', { ascending: false }).limit(1000),
    supabase.from(TABLES.saleReversals).select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  if (salesRes.error) throw salesRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (reversalRes.error) throw reversalRes.error;
  state.sales = salesRes.data || [];
  state.items = itemsRes.data || [];
  state.reversals = reversalRes.data || [];
}

function reversalForSale(id) {
  return state.reversals.find(item => String(item.sale_id) === String(id));
}

function renderSales() {
  const root = byId('pos-sales-list');
  if (!root) return;
  clearElement(root);

  const table = createElement('table', { className: 'admin-table pos-sales-table' });
  table.innerHTML = `<thead><tr><th>Çek</th><th>Satılan</th><th>Ödəniş</th><th>Cəmi</th><th>Maya / qazanc</th><th>Tarix</th><th>Əməliyyat</th></tr></thead><tbody></tbody>`;
  const tbody = $('tbody', table);

  state.sales.forEach(sale => {
    const reversal = reversalForSale(sale.id);
    const reversible = ['paid', 'debt'].includes(normalizeString(sale.payment_status)) && !reversal;
    const row = createElement('tr');
    row.innerHTML = `
      <td><strong>#${escapeHtml(String(sale.receipt_no || '—'))}</strong><span class="admin-table__secondary"><span class="${statusClass(sale.payment_status)}">${escapeHtml(statusLabel(sale.payment_status))}</span></span></td>
      <td><strong>${escapeHtml(saleSummary(sale.id))}</strong></td>
      <td><span class="ui-badge ui-badge--neutral">${escapeHtml(paymentLabel(sale.payment_method))}</span>${sale.payment_method === 'mixed' ? `<span class="admin-table__secondary">Nağd ${escapeHtml(money(sale.cash_amount))} · Kart ${escapeHtml(money(sale.card_amount))}</span>` : ''}</td>
      <td><strong>${escapeHtml(money(sale.total_amount))}</strong></td>
      <td><span class="admin-table__secondary">Maya · ${escapeHtml(money(sale.cost_total || 0))}</span><strong class="finance-amount finance-amount--income" title="Satış məbləği − maya dəyəri">Brüt qazanc · ${escapeHtml(money(sale.gross_profit || 0))}</strong></td>
      <td>${formatDateTime(sale.created_at)}</td>
      <td>${reversible ? `<button class="ui-button ui-button--danger ui-button--compact" type="button" data-sale-reverse="${sale.id}">${sale.payment_status === 'paid' ? 'Qaytar' : 'Ləğv et'}</button>` : `<span class="admin-table__secondary">${reversal ? escapeHtml(reversal.reason) : 'Bağlıdır'}</span>`}</td>`;
    tbody.append(row);
  });

  root.append(table);
  root.querySelectorAll('[data-sale-reverse]').forEach(button => button.addEventListener('click', () => {
    const sale = state.sales.find(item => String(item.id) === String(button.dataset.saleReverse));
    if (sale) openReverseModal(sale, button);
  }));
}

function openReverseModal(sale, trigger = null) {
  const content = createElement('form', { className: 'modal-form sale-reverse-form', attrs: { novalidate: '' } });
  const paid = sale.payment_status === 'paid';
  content.innerHTML = `
    <div class="ui-info-card ui-info-card--warning"><span class="ui-info-card__icon">!</span><span><strong>${paid ? 'Satış qaytarılacaq' : 'Borc satışı ləğv ediləcək'}</strong><small>Stok avtomatik geri artırılacaq. ${paid ? 'Maliyyədə əks əməliyyat yaranacaq və nağd hissə KASSA-dan çıxacaq.' : 'Açıq borc həmin satış məbləği qədər azalacaq.'}</small></span></div>
    <div class="pos-confirm__summary">
      <div class="pos-confirm__row"><span>Çek</span><strong>#${escapeHtml(String(sale.receipt_no || '—'))}</strong></div>
      <div class="pos-confirm__row"><span>Satılan</span><strong>${escapeHtml(saleSummary(sale.id))}</strong></div>
      <div class="pos-confirm__row pos-confirm__row--total"><span>Məbləğ</span><strong>${escapeHtml(money(sale.total_amount))}</strong></div>
    </div>
    <div class="ui-field"><label class="ui-field__label" for="sale-reverse-reason">Səbəb</label><textarea id="sale-reverse-reason" class="ui-textarea" rows="4" maxlength="500" placeholder="Məs: Səhv məhsul seçilib / müştəri məhsulu qaytardı"></textarea><span class="ui-field__hint">Audit tarixçəsində saxlanılır.</span></div>
    <button id="sale-reverse-submit" class="ui-button ui-button--danger ui-button--full" type="submit"><span class="ui-button__label">${paid ? 'Satışı qaytar' : 'Satışı ləğv et'}</span><span class="ui-button__spinner is-hidden"></span></button>`;

  openModal({ eyebrow: 'Satış tarixçəsi', title: paid ? 'Satışı qaytar' : 'Satışı ləğv et', content, trigger, onOpen: () => {
    const submit = $('#sale-reverse-submit', content);
    content.addEventListener('submit', async event => {
      event.preventDefault();
      const reason = normalizeString($('#sale-reverse-reason', content)?.value);
      if (reason.length < 3) {
        notify.warning('Ləğv/qaytarma səbəbini yaz.');
        return;
      }
      setButtonLoading(submit, true, { loadingText: 'İcra olunur...' });
      try {
        const { error } = await supabase.rpc(RPC.reverseSaleV1, { p_sale_id: sale.id, p_reason: reason });
        if (error) throw error;
        closeModal();
        notify.success(paid ? 'Satış qaytarıldı və stok bərpa edildi.' : 'Borc satışı ləğv edildi və stok bərpa edildi.');
        await loadAndRenderSales();
        window.dispatchEvent(new CustomEvent('skyfit:admin-operation', { detail: { type: 'sale_reversal', saleId: sale.id } }));
      } catch (error) {
        notify.error(getErrorMessage(error, 'Satış ləğv/qaytarma əməliyyatı tamamlanmadı.'));
      } finally { setButtonLoading(submit, false); }
    });
  }});
}

export async function loadAndRenderSales() {
  try {
    await loadData();
    renderSales();
  } catch (error) {
    console.error('[SKy Fit Satış tarixçəsi]', error);
    notify.error(getErrorMessage(error, 'Satış tarixçəsi yüklənmədi.'));
  }
}

export function bindSalesHistoryEvents() {
  if (state.bound) return;
  state.bound = true;
  byId('pos-sales-refresh')?.addEventListener('click', () => void loadAndRenderSales());
}
