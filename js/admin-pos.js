// SKy Fit Pro — Admin POS controller
import { supabase, TABLES, RPC, UI_CONFIG } from './config.js';
import {
  $, $$, byId, clearElement, createElement, showElement, hideElement, setText,
  normalizeString, normalizeSearch, escapeHtml, number, money, debounce, rows,
  productName, productPrice, productStock, productStockUnit, productUnitLabel,
  productPortionSize, productImage, productStockState, productSaleMode, openModal, closeModal, notify,
  getErrorMessage, setFieldError, setButtonLoading,
} from './core.js';

export function productSaleVariants(product, options = {}) {
  const quickOnly = Boolean(options.quickOnly);

  return rows(product?.sale_variants)
    .filter(variant => variant?.is_active !== false)
    .filter(variant => !quickOnly || variant?.is_quick_sale === true)
    .sort((a, b) =>
      number(a?.sort_order) - number(b?.sort_order) ||
      normalizeString(a?.name).localeCompare(normalizeString(b?.name), 'az')
    );
}

export function productHasSaleVariants(product) {
  return productSaleVariants(product).length > 0;
}

export function saleVariantName(variant) {
  return normalizeString(variant?.name, 'Satış variantı');
}

export function saleVariantPrice(variant) {
  return Math.max(0, number(variant?.price));
}

export function saleVariantDeduction(variant) {
  return Math.max(0, number(variant?.stock_deduction));
}

export function saleVariantType(variant) {
  return normalizeString(variant?.variant_type, 'unit');
}

export function saleVariantIsCustom(variant) {
  return saleVariantType(variant) === 'custom';
}

export function saleVariantTypeLabel(type) {
  switch (normalizeString(type)) {
    case 'gram':
      return 'Qram';
    case 'tablet':
      return 'Tablet / kapsul';
    case 'portion':
      return 'Porsiya';
    case 'scoop':
      return 'Qaşıq';
    case 'pack':
      return 'Bütöv qab / paket';
    case 'custom':
      return 'Sərbəst miqdar';
    default:
      return 'Ədəd / vahid';
  }
}

export function productBaseStockDeduction(product) {
  return Math.max(0.001, productPortionSize(product));
}

export function productCanSellBaseWhole(product) {
  if (productSaleMode(product) !== 'unit' || productPrice(product) <= 0) {
    return false;
  }

  const stockUnit = normalizeString(productStockUnit(product)).toLocaleLowerCase('az-AZ');
  const deduction = productBaseStockDeduction(product);

  // Qram stokunda 1 qramı səhvən “bütöv qab” kimi satmağın qarşısını alırıq.
  if (['qram', 'qr', 'gram', 'g'].includes(stockUnit)) {
    return deduction > 1;
  }

  return deduction > 0;
}

export function productDisplayPrice(product) {
  const variants = productSaleVariants(product);

  if (productCanSellBaseWhole(product)) {
    return productPrice(product);
  }

  if (!variants.length) {
    return productPrice(product);
  }

  return variants.reduce(
    (minimum, variant) => Math.min(minimum, saleVariantPrice(variant)),
    Number.POSITIVE_INFINITY
  );
}

export function productDisplayUnit(product) {
  const variants = productSaleVariants(product);
  const baseWhole = productCanSellBaseWhole(product);

  if (!variants.length) {
    return baseWhole ? 'Bütöv məhsul' : productUnitLabel(product);
  }

  if (baseWhole) {
    return `Bütöv + ${variants.length} satış seçimi`;
  }

  return variants.length === 1
    ? saleVariantName(variants[0])
    : `${variants.length} satış seçimi`;
}

export function productDisplayPriceLabel(product) {
  const variants = productSaleVariants(product);

  if (productCanSellBaseWhole(product)) {
    return money(productPrice(product));
  }

  const price = money(productDisplayPrice(product));
  return variants.length > 1 ? `${price}-dan` : price;
}


export function createAdminPosController(ctx) {
  const {
    state, stockNumber, productStockText, memberOptionsMarkup, paymentMethodOptionsMarkup,
    paymentSplitMarkup, readPaymentSplit, loadMembers, loadProducts, loadSales, loadSaleItems,
    loadLedger, loadCashRegisterEntries, loadDebts, loadHistory, renderQuickSaleProducts,
    loadAndRenderSales, renderDashboard, operationEventName,
  } = ctx;

  function filteredPosProducts() {
    const search =
      normalizeSearch(
        byId(
          'pos-product-search'
        )?.value
      );

    const filter =
      normalizeString(
        byId(
          'pos-product-filter'
        )?.value,
        'all'
      );

    return state.products
      .filter(
        product =>
          product.is_active !==
          false
      )
      .filter(
        product => {
          if (!search) {
            return true;
          }

          const text =
            [
              product.name,
              product.sku,
              product.category,
              product.description,
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
      )
      .filter(
        product => {
          const stock =
            productStock(
              product
            );

          if (
            filter ===
            'available'
          ) {
            return stock > 0;
          }

          if (
            filter ===
            'low'
          ) {
            const status =
              productStockState(
                product
              );

            return (
              status.key ===
              'low'
            );
          }

          if (
            filter ===
            'empty'
          ) {
            return stock <= 0;
          }

          return true;
        }
      );
  }

  function createPosCard(
    product
  ) {
    const stock =
      productStock(
        product
      );

    const image =
      productImage(
        product
      );

    const status =
      productStockState(
        product
      );

    const card =
      createElement(
        'button',
        {
          className:
            `pos-product-card ${
              stock <= 0
                ? 'is-out-of-stock'
                : ''
            }`,

          attrs: {
            type:
              'button',

            disabled:
              stock <= 0
                ? true
                : null,
          },

          dataset: {
            productId:
              product.id,
          },
        }
      );

    card.innerHTML = `
      <div class="pos-product-card__media">

        ${
          image
            ? `
              <img
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  productName(
                    product
                  )
                )}"
                loading="lazy"
                decoding="async"
              >
            `
            : `
              <span class="product-card__image-fallback">
                SK
              </span>
            `
        }

        <span class="${status.className}">
          ${escapeHtml(
            status.label
          )}
        </span>

      </div>

      <div class="pos-product-card__body">

        <strong class="pos-product-card__name">
          ${escapeHtml(
            productName(
              product
            )
          )}
        </strong>

        <span class="pos-product-card__unit">
          ${escapeHtml(
            productDisplayUnit(
              product
            )
          )}
        </span>

        <div class="pos-product-card__row">

          <span class="pos-product-card__price">
            ${escapeHtml(
              productDisplayPriceLabel(
                product
              )
            )}
          </span>

          <span class="pos-product-card__stock">
            ${escapeHtml(
              String(stock)
            )}
            ${escapeHtml(
              productStockUnit(
                product
              )
            )}
          </span>

        </div>

      </div>
    `;

    if (
      stock > 0
    ) {
      card.addEventListener(
        'click',
        () => {
          openPosSaleModal(
            product,
            card
          );
        }
      );
    }

    return card;
  }

  function renderPosProducts() {
    const root =
      byId(
        'pos-products-grid'
      );

    const empty =
      byId(
        'pos-products-empty'
      );

    if (!root) {
      return;
    }

    clearElement(
      root
    );

    const products =
      filteredPosProducts();

    products.forEach(
      product => {
        root.append(
          createPosCard(
            product
          )
        );
      }
    );

    if (empty) {
      products.length ===
        0
        ? showElement(empty)
        : hideElement(empty);
    }
  }

  function bindPosEvents() {
    byId(
      'pos-product-search'
    )?.addEventListener(
      'input',
      debounce(renderPosProducts, UI_CONFIG.debounceDelay)
    );

    byId(
      'pos-product-filter'
    )?.addEventListener(
      'change',
      renderPosProducts
    );
  }

  //
  // Kart vurulan kimi satılmır.
  // Modal açılır.

  async function openPosSaleModal(
    product,
    trigger = null,
    options = {}
  ) {
    if (state.members.length === 0) {
      await loadMembers();
    }

    const variants = productSaleVariants(product, {
      quickOnly: Boolean(options.quickOnly),
    });
    const allowBaseSale = productCanSellBaseWhole(product);
    const initialVariant = allowBaseSale ? null : (variants[0] || null);

    const stock = productStock(product);
    const image = productImage(product);
    const legacyMode = productSaleMode(product);

    const content = createElement('form', {
      className: 'modal-form pos-sale-v2',
      attrs: {
        id: 'pos-sale-form',
        novalidate: '',
      },
    });

    const saleChoiceMarkup = (variants.length || allowBaseSale)
      ? `
        <div class="ui-field">
          <span class="ui-field__label">Satış ölçüsü</span>
          <div class="sale-variant-picker" id="pos-sale-variant-picker">
            ${allowBaseSale ? `
              <button type="button" class="sale-variant-chip is-active" data-sale-variant-id="" aria-pressed="true">
                <strong>Bütöv məhsul</strong>
                <span>${escapeHtml(money(productPrice(product)))} · stokdan ${escapeHtml(String(productBaseStockDeduction(product)))} ${escapeHtml(productStockUnit(product))}</span>
              </button>` : ''}
            ${variants.map((variant, index) => `
              <button type="button" class="sale-variant-chip${!allowBaseSale && index === 0 ? ' is-active' : ''}" data-sale-variant-id="${escapeHtml(variant.id)}" aria-pressed="${!allowBaseSale && index === 0 ? 'true' : 'false'}">
                <strong>${escapeHtml(saleVariantName(variant))}</strong><span>${escapeHtml(money(saleVariantPrice(variant)))}</span>
              </button>
            `).join('')}
          </div>
          ${!allowBaseSale && productSaleMode(product) === 'unit' && productStockUnit(product).toLocaleLowerCase('az-AZ') === 'qram'
            ? '<span class="ui-field__hint">Bütöv qab satışı üçün Məhsullar → Düzəlt bölməsində “1 bütöv məhsul stokdan çıxacaq” sahəsinə qabın real qramını yaz.</span>'
            : ''}
        </div>
      `
      : '';


    content.innerHTML = `
      <div class="pos-confirm__product">
        <div class="pos-confirm__media">
          ${
            image
              ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(productName(product))}">`
              : '<span class="product-card__image-fallback">SK</span>'
          }
        </div>

        <div class="pos-confirm__identity">
          <strong class="pos-confirm__name">${escapeHtml(productName(product))}</strong>
          <span id="pos-sale-current-price" class="pos-confirm__price">
            ${escapeHtml(money(initialVariant ? saleVariantPrice(initialVariant) : productPrice(product)))}
          </span>
          <span class="pos-confirm__stock">
            Stok: ${escapeHtml(stockNumber(stock, productStockUnit(product)))} ${escapeHtml(productStockUnit(product))}
          </span>
        </div>
      </div>

      ${saleChoiceMarkup}

      <div class="modal-form__grid pos-sale-payment-grid">
        <div class="ui-field">
          <label class="ui-field__label" for="pos-sale-quantity" id="pos-sale-quantity-label">
            ${initialVariant && saleVariantIsCustom(initialVariant)
              ? `Miqdar (${escapeHtml(productStockUnit(product))})`
              : (initialVariant ? 'Say' : (legacyMode === 'portion' ? 'Porsiya sayı' : 'Say'))}
          </label>

          <div class="ui-input">
            <input
              id="pos-sale-quantity"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="${initialVariant && saleVariantIsCustom(initialVariant) ? '0.001' : '1'}"
              step="${initialVariant && saleVariantIsCustom(initialVariant) ? '0.001' : '1'}"
              value="1"
            >
          </div>

          <span id="pos-sale-quantity-error" class="ui-field__error is-hidden"></span>
        </div>

        <div id="pos-sale-payment-method-field" class="ui-field">
          <label class="ui-field__label" for="pos-sale-payment-method">Ödəniş üsulu</label>
          <select id="pos-sale-payment-method" class="ui-select">
            ${paymentMethodOptionsMarkup()}
          </select>
        </div>
      </div>

      ${paymentSplitMarkup('pos-sale')}

      <div class="ui-field">
        <label class="ui-field__label" for="pos-sale-payment-status">Ödəniş vəziyyəti</label>
        <select id="pos-sale-payment-status" class="ui-select">
          <option value="paid">Ödənilib</option>
          <option value="debt">Borc yaz</option>
        </select>
      </div>

      <div id="pos-sale-member-field" class="ui-field">
        <label id="pos-sale-member-label" class="ui-field__label" for="pos-sale-member">Müştəri (istəyə bağlı)</label>
        <div class="debt-customer-search">
          <label class="search-control debt-customer-search__control">
            <span class="search-control__icon" aria-hidden="true">⌕</span>
            <input id="pos-sale-member-search" class="search-control__input" type="search" autocomplete="off" placeholder="Ad, soyad və ya telefonla axtar..." aria-label="Müştəri axtar">
          </label>
        </div>
        <div class="debt-customer-picker">
          <select id="pos-sale-member" class="ui-select"><option value="">Şəxs seç</option>${memberOptionsMarkup()}</select>
          <button id="pos-new-customer-toggle" class="ui-button ui-button--glass ui-button--compact" type="button">+ Yeni müştəri</button>
        </div>
        <span id="pos-sale-member-hint" class="ui-field__hint">Nağd və kart satışında müştəri seçmək istəyə bağlıdır. Borc satışında şəxs seçilməlidir.</span>
        <div id="pos-new-customer-form" class="debt-customer-create is-hidden">
          <div class="debt-customer-create__header"><strong>Yeni müştəri</strong><span>Tətbiq hesabı tələb olunmur.</span></div>
          <div class="modal-form__grid debt-customer-create__grid">
            <label class="ui-field"><span class="ui-field__label">Ad və soyad *</span><input id="pos-new-customer-name" class="ui-input__control" autocomplete="off"></label>
            <label class="ui-field"><span class="ui-field__label">Telefon *</span><input id="pos-new-customer-phone" class="ui-input__control" inputmode="tel" autocomplete="off"></label>
          </div>
          <label class="ui-field"><span class="ui-field__label">Ünvan / qeyd</span><input id="pos-new-customer-address" class="ui-input__control" autocomplete="off"></label>
          <button id="pos-new-customer-save" class="ui-button ui-button--primary ui-button--compact" type="button">Müştərini yarat və seç</button>
        </div>
      </div>

      <div class="pos-confirm__summary">
        <div class="pos-confirm__row">
          <span>Satış seçimi</span>
          <strong id="pos-sale-summary-variant">
            ${escapeHtml(initialVariant ? saleVariantName(initialVariant) : productUnitLabel(product))}
          </strong>
        </div>

        <div class="pos-confirm__row">
          <span>Miqdar</span>
          <strong id="pos-sale-summary-quantity">1</strong>
        </div>

        <div class="pos-confirm__row">
          <span>Stokdan çıxacaq</span>
          <strong id="pos-sale-stock-deduction">
            ${escapeHtml(String(
              initialVariant
                ? saleVariantDeduction(initialVariant)
                : productBaseStockDeduction(product)
            ))}
            ${escapeHtml(productStockUnit(product))}
          </strong>
        </div>

        <div class="pos-confirm__row pos-confirm__row--total">
          <span>Cəmi</span>
          <strong id="pos-sale-total">
            ${escapeHtml(money(initialVariant ? saleVariantPrice(initialVariant) : productPrice(product)))}
          </strong>
        </div>
      </div>

      <div class="modal-form__actions">
        <button id="pos-sale-cancel" class="ui-button ui-button--glass" type="button">
          <span class="ui-button__label">Ləğv et</span>
        </button>

        <button id="pos-sale-submit" class="ui-button ui-button--primary" type="submit">
          <span class="ui-button__label">Satışı təsdiqlə</span>
          <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
        </button>
      </div>
    `;

    openModal({
      eyebrow: options.quickOnly ? 'Tez satış' : 'POS',
      title: 'Satışı təsdiqlə',
      content,
      trigger,
      className: 'app-modal--pos',
      onOpen: () => {
        bindPosSaleForm(content, product, variants);
      },
    });
  }

  function bindPosSaleForm(
    form,
    product,
    variants = []
  ) {
    const quantityInput = $('#pos-sale-quantity', form);
    const quantityLabel = $('#pos-sale-quantity-label', form);
    const paymentMethodInput = $('#pos-sale-payment-method', form);
    const paymentMethodField = $('#pos-sale-payment-method-field', form);
    const paymentStatusInput = $('#pos-sale-payment-status', form);
    const memberField = $('#pos-sale-member-field', form);
    const memberLabel = $('#pos-sale-member-label', form);
    const memberHint = $('#pos-sale-member-hint', form);
    const memberInput = $('#pos-sale-member', form);
    const memberSearch = $('#pos-sale-member-search', form);
    const newCustomerToggle = $('#pos-new-customer-toggle', form);
    const newCustomerForm = $('#pos-new-customer-form', form);
    const newCustomerSave = $('#pos-new-customer-save', form);
    const quantityError = $('#pos-sale-quantity-error', form);
    const submit = $('#pos-sale-submit', form);
    const cancel = $('#pos-sale-cancel', form);
    const picker = $('#pos-sale-variant-picker', form);
    const paymentMixedFields = $('#pos-sale-mixed-fields', form);

    let selectedVariant = productCanSellBaseWhole(product) ? null : (variants[0] || null);

    function currentPrice() {
      return selectedVariant
        ? saleVariantPrice(selectedVariant)
        : productPrice(product);
    }

    function currentDeductionPerUnit() {
      if (selectedVariant) {
        return saleVariantDeduction(selectedVariant);
      }

      return productBaseStockDeduction(product);
    }

    function syncQuantityMode() {
      const custom = selectedVariant && saleVariantIsCustom(selectedVariant);

      if (quantityInput) {
        quantityInput.min = custom ? '0.001' : '1';
        quantityInput.step = custom ? '0.001' : '1';

        if (!custom && number(quantityInput.value) < 1) {
          quantityInput.value = '1';
        }
      }

      setText(
        quantityLabel,
        custom
          ? `Miqdar (${productStockUnit(product)})`
          : (selectedVariant ? 'Say' : (productSaleMode(product) === 'portion' ? 'Porsiya sayı' : 'Say'))
      );
    }

    function syncSummary() {
      const quantity = Math.max(0, number(quantityInput?.value));
      const total = quantity * currentPrice();
      const stockDeduction = quantity * currentDeductionPerUnit();

      setText($('#pos-sale-summary-quantity', form), quantity);
      setText($('#pos-sale-total', form), money(total));
      setText(
        $('#pos-sale-stock-deduction', form),
        `${stockNumber(stockDeduction, productStockUnit(product))} ${productStockUnit(product)}`
      );
      setText(
        $('#pos-sale-summary-variant', form),
        selectedVariant
          ? saleVariantName(selectedVariant)
          : (productSaleMode(product) === 'portion' ? productUnitLabel(product) : 'Bütöv məhsul')
      );
      setText($('#pos-sale-current-price', form), money(currentPrice()));
    }

    function filterMemberOptions() {
      if (!memberInput) return;
      const selected = memberInput.value;
      const query = normalizeSearch(memberSearch?.value);
      const matches = (state.members || []).filter(member => {
        if (!query) return true;
        const haystack = normalizeSearch([
          member.full_name,
          member.email,
          member.phone,
          member.address,
        ].filter(Boolean).join(' '));
        return haystack.includes(query);
      });

      memberInput.innerHTML = `<option value="">${matches.length ? 'Şəxs seç' : 'Uyğun şəxs tapılmadı'}</option>` + matches.map(member => {
        const label = normalizeString(member.full_name, member.email || member.phone || 'Müştəri');
        const type = member.is_manual ? ' — Müştəri' : '';
        const phone = member.phone ? ` — ${member.phone}` : '';
        return `<option value="${escapeHtml(member.id)}">${escapeHtml(label + type + phone)}</option>`;
      }).join('');
      if (matches.some(member => String(member.id) === String(selected))) memberInput.value = selected;
    }

    function syncPaymentStatus() {
      const debt = paymentStatusInput?.value === 'debt';

      showElement(memberField);
      setText(memberLabel, debt ? 'Borc yazılacaq şəxs *' : 'Müştəri (istəyə bağlı)');
      setText(
        memberHint,
        debt
          ? 'Borc satışı üçün mövcud şəxsi seç və ya “+ Yeni müştəri” ilə tətbiq hesabı olmayan şəxsi yarat.'
          : 'Nağd və kart satışında istəsən müştərini seçə və ya yeni müştəri yarada bilərsən; satış onun tarixçəsinə bağlanacaq.'
      );

      if (paymentMethodInput) paymentMethodInput.disabled = debt;
      paymentMethodField?.classList.toggle('is-hidden', debt);

      if (debt) {
        hideElement(paymentMixedFields);
      } else if (paymentMethodInput?.value === 'mixed') {
        showElement(paymentMixedFields);
      }
    }

    memberSearch?.addEventListener('input', filterMemberOptions);

    newCustomerToggle?.addEventListener('click', () => {
      newCustomerForm?.classList.toggle('is-hidden');
    });

    newCustomerSave?.addEventListener('click', async () => {
      const fullName = normalizeString($('#pos-new-customer-name', form)?.value);
      const phone = normalizeString($('#pos-new-customer-phone', form)?.value);
      const address = normalizeString($('#pos-new-customer-address', form)?.value);

      if (!fullName || !phone) {
        notify.warning('Müştərinin ad, soyad və telefonunu yaz.');
        return;
      }

      setButtonLoading(newCustomerSave, true, { loadingText: 'Yaradılır...' });

      try {
        const { data, error } = await supabase.rpc(RPC.createManualCustomerV1, {
          p_full_name: fullName,
          p_phone: phone,
          p_address: address || null,
        });

        if (error) throw error;

        const customerId = normalizeString(data);
        if (!customerId) throw new Error('Müştəri ID-si alınmadı.');

        await loadMembers();

        if (memberInput) {
          if (memberSearch) memberSearch.value = '';
          memberInput.innerHTML = `<option value="">Şəxs seç</option>${memberOptionsMarkup(customerId)}`;
          memberInput.value = customerId;
        }

        newCustomerForm?.classList.add('is-hidden');
        notify.success(`${fullName} müştəri kimi yaradıldı və satış üçün seçildi.`);
      } catch (error) {
        console.error('[SKy Fit POS] Manual customer:', error);
        notify.error(getErrorMessage(error, 'Müştəri əlavə edilmədi.'));
      } finally {
        setButtonLoading(newCustomerSave, false);
      }
    });

    picker?.addEventListener('click', event => {
      const button = event.target.closest('[data-sale-variant-id]');
      if (!button) return;

      selectedVariant = variants.find(
        variant => String(variant.id) === String(button.dataset.saleVariantId)
      ) || null;

      $$('[data-sale-variant-id]', picker).forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      if (quantityInput) quantityInput.value = '1';
      syncQuantityMode();
      syncSummary();
    });

    quantityInput?.addEventListener('input', syncSummary);
    paymentStatusInput?.addEventListener('change', syncPaymentStatus);
    paymentMethodInput?.addEventListener('change', () => {
      if (paymentStatusInput?.value !== 'debt') {
        paymentMethodInput.value === 'mixed'
          ? showElement(paymentMixedFields)
          : hideElement(paymentMixedFields);
      }
    });
    cancel?.addEventListener('click', closeModal);

    syncQuantityMode();
    syncSummary();
    syncPaymentStatus();

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const quantity = number(quantityInput?.value);
      const paymentStatus = normalizeString(paymentStatusInput?.value, 'paid');
      const memberId = normalizeString(memberInput?.value);
      const stockDeduction = quantity * currentDeductionPerUnit();
      const total = quantity * currentPrice();
      const payment = paymentStatus === 'debt'
        ? { method: 'debt', cashAmount: 0, cardAmount: 0, valid: true }
        : readPaymentSplit(form, 'pos-sale', total);

      if (quantity <= 0) {
        setFieldError(
          quantityInput,
          quantityError,
          'Miqdar sıfırdan böyük olmalıdır.'
        );
        return;
      }

      if (!saleVariantIsCustom(selectedVariant) && !Number.isInteger(quantity)) {
        setFieldError(
          quantityInput,
          quantityError,
          'Bu satış seçimi üçün say tam ədəd olmalıdır.'
        );
        return;
      }

      if (stockDeduction > productStock(product)) {
        setFieldError(
          quantityInput,
          quantityError,
          `Stok kifayət deyil. Cari stok: ${productStockText(product)}.`
        );
        return;
      }

      if (!payment.valid) {
        notify.warning(`Nağd + Kart cəmi ${money(total)} olmalıdır.`);
        return;
      }

      if (paymentStatus === 'debt' && !memberId) {
        notify.warning('Borc satışı üçün şəxs seçilməlidir.');
        memberInput?.focus();
        return;
      }

      await executePosSale({
        product,
        variant: selectedVariant,
        quantity,
        cashAmount: payment.cashAmount,
        cardAmount: payment.cardAmount,
        paymentStatus,
        memberId: memberId || null,
        button: submit,
      });
    });
  }

  async function executePosSale({
    product,
    variant = null,
    quantity,
    cashAmount,
    cardAmount,
    paymentStatus,
    memberId,
    button,
  }) {
    if (state.busy) return;

    state.busy = true;

    setButtonLoading(button, true, {
      loadingText: 'Satılır...',
    });

    try {
      const items = [
        variant
          ? {
              product_id: product.id,
              variant_id: variant.id,
              quantity,
            }
          : {
              product_id: product.id,
              quantity,
            },
      ];

      const { data: saleId, error } = await supabase.rpc(
        RPC.processSaleV3,
        {
          p_member_id: memberId || null,
          p_payment_status: paymentStatus,
          p_items: items,
          p_cash_amount: cashAmount,
          p_card_amount: cardAmount,
        }
      );

      if (error) throw error;

      closeModal();

      notify.success(
        `${productName(product)} · ${variant ? saleVariantName(variant) : productUnitLabel(product)} satıldı.`,
        'Satış tamamlandı'
      );

      await Promise.all([
        loadProducts(),
        loadSales(),
        loadSaleItems(),
        loadLedger(),
        loadCashRegisterEntries(),
        loadDebts(),
        loadHistory({ limit: 50 }),
      ]);

      renderPosProducts();
      renderQuickSaleProducts();
      if (state.activeTab === 'pos') {
        await loadAndRenderSales();
      }

      if (state.activeTab === 'dashboard') {
        renderDashboard();
      }

      window.dispatchEvent(
        new CustomEvent(operationEventName, {
          detail: {
            type: 'sale',
            saleId,
            productId: product.id,
            variantId: variant?.id || null,
            operatorId: state.identity?.profileId,
          },
        })
      );
    } catch (error) {
      console.error('[SKy Fit POS] process sale:', error);

      notify.error(
        getErrorMessage(
          error,
          'Satış tamamlanmadı.'
        )
      );
    } finally {
      state.busy = false;
      setButtonLoading(button, false);
    }
  }


  return {
    render: renderPosProducts,
    bind: bindPosEvents,
    openSaleModal: openPosSaleModal,
  };
}
