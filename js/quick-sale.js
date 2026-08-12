// SKy Fit Pro — Global Tez satış
import { supabase, TABLES, RPC } from './config.js';
import {
  $, clearElement, createElement, escapeHtml, getCurrentIdentity,
  money, normalizeString, number, openModal, closeModal, notify,
  getErrorMessage, productImage, productName, productStock, productStockUnit,
  productPortionSize, setButtonLoading,
} from './core.js';

let products = [];
let variants = [];
let initialized = false;

const QUICK_ICONS = Object.freeze({
  ticket: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7a2 2 0 0 0 2-2h12v4a2 2 0 0 0 0 4v4H6a2 2 0 0 0-2-2V7Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v2m0 3v2m0 3v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
});

function variantName(item) { return normalizeString(item?.name, 'Satış seçimi'); }
function variantPrice(item) { return number(item?.price); }
function variantDeduction(item) { return number(item?.stock_deduction, 1); }

function baseDeduction(product) {
  return Math.max(0.001, productPortionSize(product));
}

function canSellBaseWhole(product) {
  if (normalizeString(product?.sale_mode, 'unit') !== 'unit' || number(product?.retail_price) <= 0) {
    return false;
  }

  const unit = normalizeString(product?.stock_unit).toLocaleLowerCase('az-AZ');
  const deduction = baseDeduction(product);

  if (['qram', 'qr', 'gram', 'g'].includes(unit)) {
    return deduction > 1;
  }

  return deduction > 0;
}
function saleChoices(product) {
  const list = productVariants(product.id).map(variant => ({ kind: 'variant', variant }));
  if (canSellBaseWhole(product)) list.unshift({ kind: 'base', variant: null });
  return list;
}
function choiceName(choice, product) {
  return choice?.kind === 'base'
    ? `Bütöv məhsul · stokdan ${baseDeduction(product)} ${normalizeString(product?.stock_unit, 'vahid')}`
    : variantName(choice?.variant);
}
function choicePrice(choice, product) { return choice?.kind === 'base' ? number(product?.retail_price) : variantPrice(choice?.variant); }
function choiceDeduction(choice, product) { return choice?.kind === 'base' ? baseDeduction(product) : variantDeduction(choice?.variant); }

async function loadQuickData() {
  const [productsResult, variantsResult] = await Promise.all([
    supabase.from(TABLES.products)
      .select('id,name,image_url,stock_quantity,stock_unit,retail_price,portion_price,portion_size,sale_mode,is_active,show_public')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase.from(TABLES.productSaleVariants)
      .select('id,product_id,name,variant_type,stock_deduction,price,is_quick_sale,is_active,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (variantsResult.error) throw variantsResult.error;
  products = productsResult.data || [];
  variants = variantsResult.data || [];
}

function productVariants(productId) {
  const all = variants.filter(item => String(item.product_id) === String(productId));
  const quick = all.filter(item => item.is_quick_sale !== false);
  return quick.length ? quick : all;
}

function paymentFieldsMarkup(total) {
  return `
    <div class="quick-payment-grid">
      <button type="button" class="quick-payment-choice is-active" data-method="cash">Nağd</button>
      <button type="button" class="quick-payment-choice" data-method="card">Kart</button>
      <button type="button" class="quick-payment-choice" data-method="mixed">Nağd + Kart</button>
    </div>
    <div class="quick-payment-split is-hidden" data-payment-split>
      <label class="ui-field"><span class="ui-field__label">Nağd</span><input class="ui-input__control" data-cash type="number" min="0" step="0.01" value="0"></label>
      <label class="ui-field"><span class="ui-field__label">Kart</span><input class="ui-input__control" data-card type="number" min="0" step="0.01" value="${number(total).toFixed(2)}"></label>
    </div>`;
}

function bindPayment(root, total) {
  let method = 'cash';
  const split = root.querySelector('[data-payment-split]');
  root.querySelectorAll('[data-method]').forEach(button => {
    button.addEventListener('click', () => {
      method = button.dataset.method;
      root.querySelectorAll('[data-method]').forEach(item => item.classList.toggle('is-active', item === button));
      split?.classList.toggle('is-hidden', method !== 'mixed');
    });
  });
  return () => {
    if (method === 'cash') return { cash: total, card: 0, valid: true };
    if (method === 'card') return { cash: 0, card: total, valid: true };
    const cash = number(root.querySelector('[data-cash]')?.value);
    const card = number(root.querySelector('[data-card]')?.value);
    return { cash, card, valid: Math.abs(cash + card - total) < 0.005 };
  };
}

async function openProductSale(product, trigger) {
  const choices = saleChoices(product);

  if (!choices.length) {
    notify.warning(
      'Bu məhsul üçün satış seçimi hazır deyil. Məhsullar → Düzəlt bölməsində bütöv məhsulun stokdan çıxacaq miqdarını və ya satış variantını qeyd et.'
    );
    return;
  }

  const selected = { choice: choices[0] };
  const content = createElement('form', { className: 'global-quick-sale-form' });

  const render = () => {
    const unitPrice = choicePrice(selected.choice, product);
    const deduction = choiceDeduction(selected.choice, product);
    content.innerHTML = `
      <div class="quick-sale-product-summary">
        ${productImage(product) ? `<img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(productName(product))}">` : '<span class="product-card__image-fallback">SK</span>'}
        <div><strong>${escapeHtml(productName(product))}</strong><span>Stok: ${escapeHtml(String(productStock(product)))} ${escapeHtml(productStockUnit(product))}</span></div>
      </div>
      ${choices.length > 1 ? `<div class="quick-variant-grid">${choices.map((choice, index) => `<button type="button" class="quick-variant-choice${choice === selected.choice ? ' is-active' : ''}" data-choice-index="${index}"><strong>${escapeHtml(choiceName(choice, product))}</strong><span>${escapeHtml(money(choicePrice(choice, product)))}</span></button>`).join('')}</div>` : ''}
      <div class="modal-form__grid">
        <label class="ui-field"><span class="ui-field__label">Say</span><input class="ui-input__control" data-qty type="number" min="1" step="1" value="1"></label>
        <div class="ui-field"><span class="ui-field__label">Stokdan çıxacaq</span><strong class="quick-static-value" data-deduction>${deduction} ${escapeHtml(productStockUnit(product))}</strong></div>
      </div>
      <div class="quick-total-row"><span>Cəmi</span><strong data-total>${escapeHtml(money(unitPrice))}</strong></div>
      ${paymentFieldsMarkup(unitPrice)}
      <button class="ui-button ui-button--primary ui-button--full" data-submit type="submit"><span class="ui-button__label">Satışı təsdiqlə</span><span class="ui-button__spinner is-hidden" aria-hidden="true"></span></button>`;

    content.querySelectorAll('[data-choice-index]').forEach(btn => btn.addEventListener('click', () => {
      selected.choice = choices[number(btn.dataset.choiceIndex, 0)] || choices[0];
      render();
    }));

    const qty = content.querySelector('[data-qty]');
    const totalEl = content.querySelector('[data-total]');
    const deductionEl = content.querySelector('[data-deduction]');
    bindPayment(content, unitPrice);
    qty?.addEventListener('input', () => {
      const q = Math.max(1, number(qty.value, 1));
      totalEl.textContent = money(q * unitPrice);
      deductionEl.textContent = `${q * deduction} ${productStockUnit(product)}`;
    });

    content.onsubmit = async event => {
      event.preventDefault();
      const q = Math.max(1, number(qty?.value, 1));
      const total = q * unitPrice;
      const activeMethod = content.querySelector('[data-method].is-active')?.dataset.method || 'cash';
      let payment;
      if (activeMethod === 'cash') payment = { cash: total, card: 0, valid: true };
      else if (activeMethod === 'card') payment = { cash: 0, card: total, valid: true };
      else {
        const cash = number(content.querySelector('[data-cash]')?.value);
        const card = number(content.querySelector('[data-card]')?.value);
        payment = { cash, card, valid: Math.abs(cash + card - total) < 0.005 };
      }
      if (!payment.valid) { notify.warning(`Nağd + Kart cəmi ${money(total)} olmalıdır.`); return; }
      if (q * deduction > productStock(product)) { notify.warning('Stok kifayət deyil.'); return; }
      const submit = content.querySelector('[data-submit]');
      setButtonLoading(submit, true, { loadingText: 'Satılır...' });
      try {
        const variant = selected.choice?.variant || null;
        const item = variant ? { product_id: product.id, variant_id: variant.id, quantity: q } : { product_id: product.id, quantity: q };
        const { error } = await supabase.rpc(RPC.processSaleV3, {
          p_member_id: null, p_payment_status: 'paid', p_items: [item], p_cash_amount: payment.cash, p_card_amount: payment.card,
        });
        if (error) throw error;
        closeModal();
        notify.success(`${productName(product)} satıldı.`, 'Satış tamamlandı');
        await loadQuickData();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Satış tamamlanmadı.'));
      } finally { setButtonLoading(submit, false); }
    };
  };
  render();
  openModal({ eyebrow: 'Tez satış', title: 'Satışı təsdiqlə', content, trigger, className: 'app-modal--pos' });
}

async function openWalkInSale(trigger) {
  const content = createElement('form', { className: 'global-quick-sale-form' });
  content.innerHTML = `
    <div class="quick-service-card"><span class="quick-service-card__icon">${QUICK_ICONS.ticket}</span><div><strong>Günlük giriş</strong><span>Abunəliyi olmayan qonaq üçün. Profil yaratmaq tələb olunmur.</span></div></div>
    <div class="quick-total-row"><span>Qiymət</span><strong data-daily-price>Yüklənir…</strong></div>
    <div data-payment-root></div>
    <button class="ui-button ui-button--primary ui-button--full" data-submit type="submit"><span class="ui-button__label">Girişi sat</span><span class="ui-button__spinner is-hidden"></span></button>`;
  let price = 0;
  const { data, error } = await supabase.from(TABLES.membershipPlans).select('price').eq('is_daily', true).eq('is_active', true).order('duration_days').limit(1).maybeSingle();
  if (error) { notify.error(getErrorMessage(error, 'Günlük giriş qiyməti alınmadı.')); return; }
  price = number(data?.price);
  content.querySelector('[data-daily-price]').textContent = money(price);
  const paymentRoot = content.querySelector('[data-payment-root]');
  paymentRoot.innerHTML = paymentFieldsMarkup(price);
  bindPayment(paymentRoot, price);
  content.onsubmit = async event => {
    event.preventDefault();
    const method = paymentRoot.querySelector('[data-method].is-active')?.dataset.method || 'cash';
    let cash = method === 'cash' ? price : 0;
    let card = method === 'card' ? price : 0;
    if (method === 'mixed') { cash = number(paymentRoot.querySelector('[data-cash]')?.value); card = number(paymentRoot.querySelector('[data-card]')?.value); }
    if (Math.abs(cash + card - price) > 0.005) { notify.warning(`Nağd + Kart cəmi ${money(price)} olmalıdır.`); return; }
    const submit = content.querySelector('[data-submit]');
    setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });
    try {
      const { error: rpcError } = await supabase.rpc(RPC.recordWalkInEntryV1, { p_cash_amount: cash, p_card_amount: card });
      if (rpcError) throw rpcError;
      closeModal();
      notify.success(`Günlük giriş ${money(price)} satıldı.`, 'Giriş tamamlandı');
    } catch (rpcError) { notify.error(getErrorMessage(rpcError, 'Günlük giriş tamamlanmadı.')); }
    finally { setButtonLoading(submit, false); }
  };
  openModal({ eyebrow: 'Tez satış', title: 'Günlük giriş', content, trigger, className: 'app-modal--pos' });
}

async function openGlobalQuickSale(trigger) {
  try { await loadQuickData(); } catch (error) { notify.error(getErrorMessage(error, 'Tez satış yüklənmədi.')); return; }
  const content = createElement('div', { className: 'quick-sale-panel' });
  content.innerHTML = `<div class="quick-sale-products-grid" data-grid></div>`;
  const grid = content.querySelector('[data-grid]');
  const daily = createElement('button', { className: 'quick-sale-card quick-sale-card--service', attrs: { type: 'button' } });
  daily.innerHTML = `<span class="quick-sale-card__media quick-sale-card__media--service">${QUICK_ICONS.ticket}</span><span class="quick-sale-card__body"><strong>Günlük giriş</strong><span>3 ₼ planı</span><small>Profil tələb olunmur</small></span>`;
  daily.addEventListener('click', () => openWalkInSale(daily));
  grid.append(daily);
  products
    .filter(product => productStock(product) > 0 && saleChoices(product).length > 0)
    .forEach(product => {
    const card = createElement('button', { className: 'quick-sale-card', attrs: { type: 'button' } });
    const image = productImage(product);
    card.innerHTML = `<span class="quick-sale-card__media">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}">` : '<span class="product-card__image-fallback">SK</span>'}</span><span class="quick-sale-card__body"><strong>${escapeHtml(productName(product))}</strong><span>${saleChoices(product).length} seçim</span><small>${productStock(product)} ${escapeHtml(productStockUnit(product))}</small></span>`;
    card.addEventListener('click', () => openProductSale(product, card));
    grid.append(card);
  });
  openModal({ eyebrow: 'SKy Fit POS', title: 'Tez satış', content, trigger, className: 'app-modal--quick-sale' });
}

export async function initGlobalQuickSale() {
  if (initialized) return;
  const identity = await getCurrentIdentity();
  if (!identity?.isStaff) return;
  initialized = true;
  const button = createElement('button', { className: 'admin-quick-sale-fab global-quick-sale-fab', attrs: { type: 'button', 'aria-label': 'Tez satış aç', title: 'Tez satış' } });
  button.innerHTML = `<span class="admin-quick-sale-fab__icon" aria-hidden="true">${QUICK_ICONS.bolt}</span><span class="admin-quick-sale-fab__label">Tez satış</span>`;
  button.addEventListener('click', () => void openGlobalQuickSale(button));
  document.body.append(button);
}
