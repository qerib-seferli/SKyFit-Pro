// SKy Fit Pro — Admin POS controller
import { supabase, RPC, UI_CONFIG } from './config.js';
import {
  $, $$, byId, clearElement, createElement, showElement, hideElement, setText,
  normalizeString, normalizeSearch, escapeHtml, number, money, debounce, rows,
  productName, productPrice, productStock, productStockUnit, productUnitLabel,
  productImage, productStockState, productSaleMode, openModal, closeModal, notify,
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

export function productDisplayPrice(product) {
  const variants = productSaleVariants(product);
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
  if (!variants.length) {
    return productUnitLabel(product);
  }

  return variants.length === 1
    ? saleVariantName(variants[0])
    : `${variants.length} satış seçimi`;
}

export function productDisplayPriceLabel(product) {
  const variants = productSaleVariants(product);
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

    const variantMarkup = variants.length
      ? `
        <div class="ui-field">
          <span class="ui-field__label">Satış ölçüsü</span>
          <div class="sale-variant-picker" id="pos-sale-variant-picker">
            ${variants.map((variant, index) => `
              <button
                type="button"
                class="sale-variant-chip${index === 0 ? ' is-active' : ''}"
                data-sale-variant-id="${escapeHtml(variant.id)}"
                aria-pressed="${index === 0 ? 'true' : 'false'}"
              >
                <strong>${escapeHtml(saleVariantName(variant))}</strong>
                <span>${escapeHtml(money(saleVariantPrice(variant)))}</span>
              </button>
            `).join('')}
          </div>
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
            ${escapeHtml(money(variants.length ? saleVariantPrice(variants[0]) : productPrice(product)))}
          </span>
          <span class="pos-confirm__stock">
            Stok: ${escapeHtml(stockNumber(stock, productStockUnit(product)))} ${escapeHtml(productStockUnit(product))}
          </span>
        </div>
      </div>

      ${variantMarkup}

      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="pos-sale-quantity" id="pos-sale-quantity-label">
            ${variants.length
              ? (saleVariantIsCustom(variants[0]) ? `Miqdar (${escapeHtml(productStockUnit(product))})` : 'Say')
              : (legacyMode === 'portion' ? 'Porsiya sayı' : 'Miqdar')}
          </label>

          <div class="ui-input">
            <input
              id="pos-sale-quantity"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="${variants.length && saleVariantIsCustom(variants[0]) ? '0.001' : '1'}"
              step="${variants.length && saleVariantIsCustom(variants[0]) ? '0.001' : '1'}"
              value="1"
            >
          </div>

          <span id="pos-sale-quantity-error" class="ui-field__error is-hidden"></span>
        </div>

        <div class="ui-field">
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

      <div id="pos-sale-member-field" class="ui-field is-hidden">
        <label class="ui-field__label" for="pos-sale-member">Borc yazılacaq üzv</label>
        <select id="pos-sale-member" class="ui-select">
          <option value="">Üzv seç</option>
          ${memberOptionsMarkup()}
        </select>
        <span class="ui-field__hint">Borc satışı üçün üzv seçilməsi məcburidir.</span>
      </div>

      <div class="pos-confirm__summary">
        <div class="pos-confirm__row">
          <span>Satış seçimi</span>
          <strong id="pos-sale-summary-variant">
            ${escapeHtml(variants.length ? saleVariantName(variants[0]) : productUnitLabel(product))}
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
              variants.length
                ? saleVariantDeduction(variants[0])
                : (legacyMode === 'portion' ? number(product.portion_size) : 1)
            ))}
            ${escapeHtml(productStockUnit(product))}
          </strong>
        </div>

        <div class="pos-confirm__row pos-confirm__row--total">
          <span>Cəmi</span>
          <strong id="pos-sale-total">
            ${escapeHtml(money(variants.length ? saleVariantPrice(variants[0]) : productPrice(product)))}
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
    const paymentStatusInput = $('#pos-sale-payment-status', form);
    const memberField = $('#pos-sale-member-field', form);
    const memberInput = $('#pos-sale-member', form);
    const quantityError = $('#pos-sale-quantity-error', form);
    const submit = $('#pos-sale-submit', form);
    const cancel = $('#pos-sale-cancel', form);
    const picker = $('#pos-sale-variant-picker', form);
    const paymentMixedFields = $('#pos-sale-mixed-fields', form);

    let selectedVariant = variants[0] || null;

    function currentPrice() {
      return selectedVariant
        ? saleVariantPrice(selectedVariant)
        : productPrice(product);
    }

    function currentDeductionPerUnit() {
      if (selectedVariant) {
        return saleVariantDeduction(selectedVariant);
      }

      return productSaleMode(product) === 'portion'
        ? number(product.portion_size, 1)
        : 1;
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
          : (selectedVariant ? 'Say' : (productSaleMode(product) === 'portion' ? 'Porsiya sayı' : 'Miqdar'))
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
        selectedVariant ? saleVariantName(selectedVariant) : productUnitLabel(product)
      );
      setText($('#pos-sale-current-price', form), money(currentPrice()));
    }

    function syncPaymentStatus() {
      const debt = paymentStatusInput?.value === 'debt';
      debt ? showElement(memberField) : hideElement(memberField);

      if (paymentMethodInput) {
        paymentMethodInput.disabled = debt;
      }

      if (debt) {
        hideElement(paymentMixedFields);
      } else if (paymentMethodInput?.value === 'mixed') {
        showElement(paymentMixedFields);
      }
    }

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
        notify.warning('Borc satışı üçün üzv seçilməlidir.');
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
        memberId: paymentStatus === 'debt' ? memberId : null,
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
