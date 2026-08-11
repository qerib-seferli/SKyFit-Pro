// SKy Fit Pro — Məhsul redaktoru / satış variantları
import { supabase, APP_CONFIG, TABLES, RPC } from './config.js';
import {
  $, $$, createElement, showElement, hideElement, setText, normalizeString, escapeHtml, number,
  openModal, closeModal, confirmDialog, notify, getErrorMessage, setFieldError, setButtonLoading,
} from './core.js';
import { productSaleVariants, saleVariantType, saleVariantTypeLabel } from './admin-pos.js';

export function normalizedStockUnit(value) {
  const unit = normalizeString(value, 'ədəd').toLocaleLowerCase('az-AZ');

  if (['qr', 'qram', 'g', 'gram'].includes(unit)) return 'qram';
  if (['tablet', 'kapsul', 'tablet/kapsul', 'tablet / kapsul'].includes(unit)) return 'tablet';
  if (['ml', 'millilitr'].includes(unit)) return 'ml';
  if (['l', 'litr', 'liter'].includes(unit)) return 'litr';
  if (['kq', 'kg', 'kiloqram'].includes(unit)) return 'kq';
  return unit || 'ədəd';
}

export function stockUnitLabel(value) {
  switch (normalizedStockUnit(value)) {
    case 'qram': return 'qram';
    case 'tablet': return 'tablet';
    case 'ml': return 'ml';
    case 'litr': return 'litr';
    case 'kq': return 'kq';
    default: return 'ədəd';
  }
}

export function stockUnitOptionMarkup(currentValue) {
  const current = normalizedStockUnit(currentValue);
  const options = [
    ['ədəd', 'Ədəd — su, shaker, bütöv məhsul'],
    ['qram', 'Qram — protein, kreatin, toz məhsul'],
    ['tablet', 'Tablet / kapsul'],
    ['ml', 'Millilitr'],
    ['litr', 'Litr'],
    ['kq', 'Kiloqram'],
  ];

  if (!options.some(([value]) => value === current)) {
    options.push([current, currentValue || current]);
  }

  return options.map(([value, label]) => `
    <option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>
      ${escapeHtml(label)}
    </option>
  `).join('');
}


export function createAdminProductEditor(ctx) {
  const {
    state, loadProducts, loadHistory, renderAdminProducts, renderPosProducts, renderQuickSaleProducts,
  } = ctx;

  function saleVariantEditorRowMarkup(variant = {}, index = 0, stockUnit = 'ədəd') {
    const type = saleVariantType(variant);
    const name = normalizeString(variant?.name);
    const deduction = variant?.stock_deduction ?? '';
    const price = variant?.price ?? '';
    const sortOrder = variant?.sort_order ?? index * 10;
    const quick = variant?.is_quick_sale === true;
    const unit = stockUnitLabel(stockUnit);

    return `
      <div class="sale-variant-editor-row" data-sale-variant-row data-variant-id="${escapeHtml(variant?.id || '')}">
        <div class="sale-variant-editor-row__main">
          <div class="ui-field">
            <label class="ui-field__label">Satış seçiminin adı</label>
            <div class="ui-input">
              <input
                class="ui-input__control"
                data-variant-field="name"
                type="text"
                maxlength="80"
                value="${escapeHtml(name)}"
                placeholder="Məs: 5 qram"
              >
            </div>
            <span class="ui-field__hint">Kassada admin bu adı görəcək.</span>
          </div>

          <div class="ui-field">
            <label class="ui-field__label">Satış növü</label>
            <select class="ui-select" data-variant-field="variant_type">
              ${['unit', 'gram', 'tablet', 'portion', 'scoop', 'pack', 'custom']
                .map(option => `
                  <option value="${option}" ${option === type ? 'selected' : ''}>
                    ${escapeHtml(saleVariantTypeLabel(option))}
                  </option>
                `)
                .join('')}
            </select>
            <span class="ui-field__hint">Bu seçim yalnız görünüş və izah üçündür.</span>
          </div>

          <div class="ui-field">
            <label class="ui-field__label" data-stock-deduction-label>Stokdan çıxacaq (${escapeHtml(unit)})</label>
            <div class="ui-input sale-variant-editor-row__quantity-input">
              <input
                class="ui-input__control"
                data-variant-field="stock_deduction"
                type="number"
                inputmode="decimal"
                min="0.001"
                step="0.001"
                value="${escapeHtml(String(deduction))}"
                placeholder="5"
              >
              <span class="sale-variant-editor-row__unit" data-stock-unit-suffix>${escapeHtml(unit)}</span>
            </div>
            <span class="ui-field__hint">Məs: “5 qram” satılırsa burada 5 yaz.</span>
          </div>

          <div class="ui-field">
            <label class="ui-field__label">Müştəri qiyməti</label>
            <div class="ui-input sale-variant-editor-row__quantity-input">
              <input
                class="ui-input__control"
                data-variant-field="price"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                value="${escapeHtml(String(price))}"
                placeholder="2.00"
              >
              <span class="sale-variant-editor-row__unit">₼</span>
            </div>
            <span class="ui-field__hint">Bu satış seçiminin yekun qiyməti.</span>
          </div>
        </div>

        <div class="sale-variant-editor-row__footer">
          <label class="ui-check">
            <input data-variant-field="is_quick_sale" type="checkbox" ${quick ? 'checked' : ''}>
            <span>⚡ Tez satışda göstər</span>
          </label>

          <input data-variant-field="sort_order" type="hidden" value="${escapeHtml(String(sortOrder))}">

          <button class="sale-variant-editor-row__remove" type="button" data-remove-sale-variant>
            Sil
          </button>
        </div>
      </div>
    `;
  }

  function collectSaleVariantRows(form) {
    return $$('[data-sale-variant-row]', form).map((row, index) => {
      const field = name => $(`[data-variant-field="${name}"]`, row);

      return {
        id: normalizeString(row.dataset.variantId) || null,
        name: normalizeString(field('name')?.value),
        variant_type: normalizeString(field('variant_type')?.value, 'unit'),
        stock_deduction: number(field('stock_deduction')?.value),
        price: number(field('price')?.value),
        is_quick_sale: Boolean(field('is_quick_sale')?.checked),
        is_active: true,
        sort_order: index * 10,
      };
    });
  }

  async function syncProductSaleVariants(productId, variants) {
    const valid = rows(variants).filter(variant =>
      variant.name &&
      variant.stock_deduction > 0 &&
      variant.price >= 0
    );

    const { error: deleteError } = await supabase
      .from(TABLES.productSaleVariants)
      .delete()
      .eq('product_id', productId);

    if (deleteError) throw deleteError;

    if (!valid.length) return [];

    const payload = valid.map((variant, index) => ({
      product_id: productId,
      name: variant.name,
      variant_type: variant.variant_type,
      stock_deduction: variant.stock_deduction,
      price: variant.price,
      is_quick_sale: variant.is_quick_sale,
      is_active: true,
      sort_order: index * 10,
    }));

    const { data, error } = await supabase
      .from(TABLES.productSaleVariants)
      .insert(payload)
      .select('*');

    if (error) throw error;
    return rows(data);
  }

  function openProductEditor(
    product = null,
    trigger = null
  ) {
    const editing =
      Boolean(product);

    const mode =
      product
        ?.sale_mode ||
      'unit';

    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'admin-product-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-name"
        >
          Məhsul adı
        </label>

        <div class="ui-input">

          <input
            id="admin-product-name"
            class="ui-input__control"
            type="text"
            maxlength="160"
            value="${escapeHtml(
              product?.name ||
              ''
            )}"
            placeholder="Məhsul adı"
          >

        </div>

        <span
          id="admin-product-name-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-sku"
          >
            SKU / kod
          </label>

          <div class="ui-input">

            <input
              id="admin-product-sku"
              class="ui-input__control"
              type="text"
              maxlength="100"
              value="${escapeHtml(
                product?.sku ||
                ''
              )}"
              placeholder="Məs: SU-001"
            >

          </div>

        </div>

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-category"
          >
            Kateqoriya
          </label>

          <div class="ui-input">

            <input
              id="admin-product-category"
              class="ui-input__control"
              type="text"
              maxlength="120"
              value="${escapeHtml(
                product?.category ||
                ''
              )}"
              placeholder="İçkilər"
            >

          </div>

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="admin-product-description"
        >
          Açıqlama
        </label>

        <textarea
          id="admin-product-description"
          class="ui-textarea"
          maxlength="1000"
          rows="3"
          placeholder="Məhsul haqqında qısa məlumat"
        >${escapeHtml(
          product?.description ||
          ''
        )}</textarea>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-sale-mode"
          >
            Məhsulun əsas satış üsulu
          </label>

          <select
            id="admin-product-sale-mode"
            class="ui-select"
          >
            <option
              value="unit"
              ${
                mode ===
                  'unit'
                  ? 'selected'
                  : ''
              }
            >
              Adi satış — 1 ədəd / 1 vahid
            </option>

            ${editing || mode === 'portion' ? `
              <option
                value="portion"
                ${mode === 'portion' ? 'selected' : ''}
              >
                Porsiya / qaşıq
              </option>
            ` : ''}
          </select>

        </div>

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-stock-unit"
          >
            Stok vahidi
          </label>

          <select
            id="admin-product-stock-unit"
            class="ui-select"
          >
            ${stockUnitOptionMarkup(product?.stock_unit || 'ədəd')}
          </select>
          <span class="ui-field__hint">
            Əsas qayda: qramla satılan toz məhsulun stoku da qramla saxlanmalıdır.
          </span>

        </div>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-retail-price"
          >
            Bütöv məhsulun satış qiyməti
          </label>

          <div class="ui-input">

            <input
              id="admin-product-retail-price"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${
                product
                  ? number(
                      product
                        .retail_price
                    )
                  : ''
              }"
              placeholder="0.00"
            >

          </div>

          <span class="ui-field__hint">
            Qram/tablet seçimləri aşağıda ayrıca qiymətləndirilir. Variant yoxdursa POS bu qiyməti istifadə edir.
          </span>

          <span
            id="admin-product-price-error"
            class="ui-field__error is-hidden"
          ></span>

        </div>

        <div
          id="admin-product-portion-price-field"
          class="ui-field ${
            mode ===
              'portion'
              ? ''
              : 'is-hidden'
          }"
        >

          <label
            class="ui-field__label"
            for="admin-product-portion-price"
          >
            Porsiya qiyməti
          </label>

          <div class="ui-input">

            <input
              id="admin-product-portion-price"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${
                product
                  ? number(
                      product
                        .portion_price
                    )
                  : ''
              }"
              placeholder="0.00"
            >

          </div>

        </div>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-cost-price"
          >
            1 stok vahidinin maya dəyəri
          </label>

          <div class="ui-input">

            <input
              id="admin-product-cost-price"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${
                product
                  ? number(
                      product
                        .cost_price
                    )
                  : ''
              }"
              placeholder="0.00"
            >

          </div>

        </div>

        <div
          id="admin-product-portion-size-field"
          class="ui-field ${
            mode ===
              'portion'
              ? ''
              : 'is-hidden'
          }"
        >

          <label
            class="ui-field__label"
            for="admin-product-portion-size"
          >
            1 porsiyanın stok miqdarı
          </label>

          <div class="ui-input">

            <input
              id="admin-product-portion-size"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0.001"
              step="0.001"
              value="${
                product
                  ? number(
                      product
                        .portion_size
                    )
                  : ''
              }"
              placeholder="0.250"
            >

          </div>

        </div>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="admin-product-low-stock"
          >
            Az stok xəbərdarlığı
          </label>

          <div class="ui-input">

            <input
              id="admin-product-low-stock"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.001"
              value="${
                product
                  ? number(
                      product
                        .low_stock_threshold
                    )
                  : 0
              }"
            >

          </div>

        </div>

        <div class="ui-field">

          <label class="ui-field__label">
            Görünüş
          </label>

          <div class="ui-check-list">

            <label class="ui-check">

              <input
                id="admin-product-active"
                type="checkbox"
                ${
                  product?.is_active !==
                    false
                    ? 'checked'
                    : ''
                }
              >

              <span>
                Aktivdir
              </span>

            </label>

            <label class="ui-check">

              <input
                id="admin-product-public"
                type="checkbox"
                ${
                  product?.show_public !==
                    false
                    ? 'checked'
                    : ''
                }
              >

              <span>
                Saytda göstər
              </span>

            </label>

          </div>

        </div>

      </div>

      <section class="sale-variant-editor">
        <div class="sale-variant-editor__header">
          <div>
            <span class="section-eyebrow">3. Satış seçimləri</span>
            <strong>Qram · tablet · qaşıq · bütöv qab</strong>
            <small>
              Burada kassada görünəcək hazır seçimləri yaradırsan. “Stokdan çıxacaq” dəyəri yuxarıda seçdiyin stok vahidi ilə eyni olmalıdır.
            </small>
          </div>

          <button
            id="admin-product-add-variant"
            class="ui-button ui-button--glass"
            type="button"
          >
            <span class="ui-button__label">+ Variant əlavə et</span>
          </button>
        </div>

        <div id="admin-product-sale-variants" class="sale-variant-editor__list">
          ${
            productSaleVariants(product).length
              ? productSaleVariants(product).map((variant, index) =>
                  saleVariantEditorRowMarkup(variant, index, product?.stock_unit || 'ədəd')
                ).join('')
              : ''
          }
        </div>

        <div class="ui-info-card">
          <span class="ui-info-card__icon">i</span>
          <span>
            <strong>Sadə qayda</strong>
            <small>
              Stok vahidi “qram”dırsa: 5 qram → 5, 50 qram → 50. Stok vahidi “tablet”dirsə: 10 tablet → 10.
              0.005 və ya 0.01 yalnız stok vahidin “kq” olduqda məntiqlidir. Qram stokunda belə onluqlar yazma.
            </small>
          </span>
        </div>
      </section>

      <div id="admin-product-unit-warning" class="product-unit-warning is-hidden" role="status"></div>

      <label class="ui-upload">

        <input
          id="admin-product-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        >

        <span>

          <strong class="ui-upload__title">
            ${
              editing
                ? 'Məhsul şəklini dəyiş'
                : 'Məhsul şəkli'
            }
          </strong>

          <span class="ui-upload__meta">
            PNG, JPG və ya WEBP · maksimum 5 MB
          </span>

        </span>

      </label>

      <div class="product-editor-actions">
        ${editing ? `
          <button
            id="admin-product-delete"
            class="ui-button ui-button--danger"
            type="button"
          >
            <span class="ui-button__label">Məhsulu sil</span>
          </button>
        ` : ''}

        <button
          id="admin-product-submit"
          class="ui-button ui-button--primary"
          type="submit"
        >
          <span class="ui-button__label">
            ${editing ? 'Yadda saxla' : 'Məhsul əlavə et'}
          </span>
          <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
        </button>
      </div>
    `;

    openModal({
      eyebrow:
        'Məhsullar',

      title:
        editing
          ? 'Məhsulu redaktə et'
          : 'Yeni məhsul',

      content,

      trigger,

      className: 'app-modal--product-editor',

      onOpen:
        () => {
          bindProductForm(
            content,
            product
          );
        },
    });
  }

  function bindProductForm(
    form,
    product
  ) {
    const nameInput =
      $(
        '#admin-product-name',
        form
      );

    const skuInput =
      $(
        '#admin-product-sku',
        form
      );

    const categoryInput =
      $(
        '#admin-product-category',
        form
      );

    const descriptionInput =
      $(
        '#admin-product-description',
        form
      );

    const modeInput =
      $(
        '#admin-product-sale-mode',
        form
      );

    const unitInput =
      $(
        '#admin-product-stock-unit',
        form
      );

    const retailPriceInput =
      $(
        '#admin-product-retail-price',
        form
      );

    const portionPriceInput =
      $(
        '#admin-product-portion-price',
        form
      );

    const costPriceInput =
      $(
        '#admin-product-cost-price',
        form
      );

    const portionSizeInput =
      $(
        '#admin-product-portion-size',
        form
      );

    const lowStockInput =
      $(
        '#admin-product-low-stock',
        form
      );

    const activeInput =
      $(
        '#admin-product-active',
        form
      );

    const publicInput =
      $(
        '#admin-product-public',
        form
      );

    const imageInput =
      $(
        '#admin-product-image',
        form
      );

    const variantsRoot =
      $('#admin-product-sale-variants', form);

    const addVariantButton =
      $('#admin-product-add-variant', form);

    const unitWarning =
      $('#admin-product-unit-warning', form);

    const nameError =
      $(
        '#admin-product-name-error',
        form
      );

    const priceError =
      $(
        '#admin-product-price-error',
        form
      );

    const submit =
      $(
        '#admin-product-submit',
        form
      );

    const deleteButton = $('#admin-product-delete', form);

    deleteButton?.addEventListener('click', async () => {
      if (!product?.id || state.busy) return;

      const confirmed = await confirmDialog({
        eyebrow: 'Məhsullar',
        title: 'Məhsul silinsin?',
        message: 'Məhsul heç bir satış və stok tarixçəsində istifadə olunmayıbsa tam silinəcək. Tarixçəsi varsa məlumat itkisi olmasın deyə arxivlənəcək və satışdan gizlənəcək.',
        confirmText: 'Sil / arxivlə',
        cancelText: 'Ləğv et',
        danger: true,
      });

      if (!confirmed) return;

      state.busy = true;
      setButtonLoading(deleteButton, true, { loadingText: 'Silinir...' });

      try {
        const { data, error } = await supabase.rpc(RPC.deleteProductSafely, {
          p_product_id: product.id,
        });

        if (error) throw error;

        closeModal();
        notify.success(
          data === 'deleted'
            ? 'Məhsul tam silindi.'
            : 'Məhsul tarixçəsi olduğu üçün arxivləndi.'
        );

        await Promise.all([
          loadProducts(),
          loadStockMovements(),
          loadHistory({ limit: 50 }),
        ]);

        renderAdminProducts();
        renderPosProducts();
        renderQuickSaleProducts();
        renderStock();
      } catch (error) {
        console.error('[SKy Fit] Məhsul silmə:', error);
        notify.error(getErrorMessage(error, 'Məhsul silinmədi.'));
      } finally {
        state.busy = false;
        setButtonLoading(deleteButton, false);
      }
    });


    function syncSaleMode() {
      const portion =
        modeInput?.value ===
        'portion';

      const priceField =
        $(
          '#admin-product-portion-price-field',
          form
        );

      const sizeField =
        $(
          '#admin-product-portion-size-field',
          form
        );

      portion
        ? showElement(
            priceField
          )
        : hideElement(
            priceField
          );

      portion
        ? showElement(
            sizeField
          )
        : hideElement(
            sizeField
          );
    }

    function syncStockGuidance() {
      const unit = stockUnitLabel(unitInput?.value);
      const variantRows = $$('[data-sale-variant-row]', form);
      const issues = [];

      variantRows.forEach(row => {
        setText($('[data-stock-deduction-label]', row), `Stokdan çıxacaq (${unit})`);
        setText($('[data-stock-unit-suffix]', row), unit);

        const type = normalizeString($('[data-variant-field="variant_type"]', row)?.value);
        const name = normalizeString($('[data-variant-field="name"]', row)?.value);
        const deduction = number($('[data-variant-field="stock_deduction"]', row)?.value);

        if ((type === 'gram' || type === 'scoop') && unit !== 'qram') {
          issues.push('Qram/qaşıq satışı üçün “Stok vahidi”ni Qram seç.');
        }

        if (type === 'tablet' && !['tablet', 'ədəd'].includes(unit)) {
          issues.push('Tablet satışı üçün stok vahidi Tablet / kapsul olmalıdır.');
        }

        if (type === 'gram' && unit === 'qram') {
          const match = name.match(/(\d+(?:[.,]\d+)?)\s*(?:qr|qram|g)\b/i);
          const namedGrams = match ? number(match[1].replace(',', '.')) : 0;
          if (namedGrams > 0 && deduction > 0 && Math.abs(namedGrams - deduction) > 0.0001) {
            issues.push(`“${name}” üçün stokdan ${deduction} qram çıxılır. Adına görə burada ${namedGrams} yazılmalıdır.`);
          }
        }
      });

      if (!unitWarning) return issues;

      if (!issues.length) {
        hideElement(unitWarning);
        unitWarning.innerHTML = '';
        return issues;
      }

      unitWarning.innerHTML = `
        <strong>Stok vahidini yoxla</strong>
        <span>${escapeHtml(Array.from(new Set(issues)).join(' '))}</span>
        <small>Vahidi dəyişmək mövcud stok rəqəmini avtomatik çevirmir. Yadda saxladıqdan sonra Stok → Düzəlt ilə real qalığı yaz.</small>
      `;
      showElement(unitWarning);
      return issues;
    }

    modeInput
      ?.addEventListener(
        'change',
        syncSaleMode
      );

    syncSaleMode();

    unitInput?.addEventListener('change', syncStockGuidance);
    variantsRoot?.addEventListener('input', syncStockGuidance);
    variantsRoot?.addEventListener('change', syncStockGuidance);

    syncStockGuidance();

    addVariantButton?.addEventListener('click', () => {
      variantsRoot?.insertAdjacentHTML(
        'beforeend',
        saleVariantEditorRowMarkup({}, $$('[data-sale-variant-row]', form).length, unitInput?.value || 'ədəd')
      );

      syncStockGuidance();

      const lastRow = $$('[data-sale-variant-row]', form).at(-1);
      $('[data-variant-field="name"]', lastRow)?.focus();
    });

    variantsRoot?.addEventListener('click', event => {
      const removeButton = event.target.closest('[data-remove-sale-variant]');
      if (!removeButton) return;
      removeButton.closest('[data-sale-variant-row]')?.remove();
      syncStockGuidance();
    });

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const name =
          normalizeString(
            nameInput?.value
          );

        const mode =
          normalizeString(
            modeInput?.value,
            'unit'
          );

        const retailPrice =
          number(
            retailPriceInput
              ?.value
          );

        const portionPrice =
          number(
            portionPriceInput
              ?.value
          );

        const portionSize =
          number(
            portionSizeInput
              ?.value
          );

        if (
          name.length < 2
        ) {
          setFieldError(
            nameInput,
            nameError,
            'Məhsul adı minimum 2 simvol olmalıdır.'
          );

          return;
        }

        if (
          mode ===
            'unit' &&
          retailPrice < 0
        ) {
          setFieldError(
            retailPriceInput,
            priceError,
            'Qiymət düzgün deyil.'
          );

          return;
        }

        if (
          mode ===
            'portion' &&
          (
            portionPrice <= 0 ||
            portionSize <= 0
          )
        ) {
          notify.warning(
            'Porsiya məhsulu üçün porsiya qiyməti və porsiya ölçüsü daxil edilməlidir.'
          );

          return;
        }

        const saleVariants = collectSaleVariantRows(form);

        const unitIssues = syncStockGuidance();
        if (unitIssues.length) {
          notify.warning('Stok vahidi ilə satış seçimləri uyğun deyil. Sarı xəbərdarlığı düzəlt.');
          unitWarning?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        const invalidVariant = saleVariants.find(
          variant =>
            !variant.name ||
            variant.stock_deduction <= 0 ||
            variant.price < 0
        );

        if (invalidVariant) {
          notify.warning(
            'Satış variantlarında ad, stokdan çıxılacaq miqdar və qiymət düzgün doldurulmalıdır.'
          );
          return;
        }

        const payload = {

          name,

          sku:
            normalizeString(
              skuInput?.value
            ) ||
            null,

          category:
            normalizeString(
              categoryInput?.value
            ) ||
            null,

          description:
            normalizeString(
              descriptionInput
                ?.value
            ) ||
            null,

          sale_mode:
            mode,

          stock_unit:
            normalizedStockUnit(
              unitInput?.value
            ),

          retail_price:
            retailPrice,

          portion_price:
            mode ===
              'portion'
              ? portionPrice
              : 0,

          cost_price:
            number(
              costPriceInput
                ?.value
            ),

        portion_size:
          mode === 'portion'
            ? portionSize
            : 1,

          low_stock_threshold:
            Math.max(
              0,
              number(
                lowStockInput
                  ?.value
              )
            ),

          is_active:
            Boolean(
              activeInput
                ?.checked
            ),

          show_public:
            Boolean(
              publicInput
                ?.checked
            ),
        };

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              product
                ? 'Yadda saxlanılır...'
                : 'Əlavə olunur...',
          }
        );

        try {
          let savedProduct;

          if (product) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  TABLES.products
                )
                .update(
                  payload
                )
                .eq(
                  'id',
                  product.id
                )
                .select('*')
                .single();

            if (error) {
              throw error;
            }

            savedProduct =
              data;
          } else {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  TABLES.products
                )
                .insert(
                  payload
                )
                .select('*')
                .single();

            if (error) {
              throw error;
            }

            savedProduct =
              data;
          }

          const imageFile =
            imageInput
              ?.files
              ?.[0];

          if (
            imageFile
          ) {
            savedProduct =
              await uploadProductImage(
                savedProduct,
                imageFile
              );
          }

          await syncProductSaleVariants(
            savedProduct.id,
            saleVariants
          );

          closeModal();

          notify.success(
            product
              ? 'Məhsul yeniləndi.'
              : 'Məhsul əlavə edildi.'
          );

          await Promise.all([
            loadProducts(),
            loadHistory({
              limit:
                50,
            }),
          ]);

          renderAdminProducts();

          renderPosProducts();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] Product save:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Məhsul yadda saxlanmadı.'
            )
          );
        } finally {
          setButtonLoading(
            submit,
            false
          );
        }
      }
    );
  }

  function validateProductImage(
    file
  ) {
    const allowed =
      new Set([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);

    if (
      !allowed.has(
        file?.type
      )
    ) {
      throw new Error(
        'Məhsul şəkli JPG, PNG və ya WEBP olmalıdır.'
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      throw new Error(
        'Məhsul şəkli maksimum 5 MB ola bilər.'
      );
    }
  }

  function productImageExtension(
    file
  ) {
    if (
      file.type ===
      'image/png'
    ) {
      return 'png';
    }

    if (
      file.type ===
      'image/webp'
    ) {
      return 'webp';
    }

    return 'jpg';
  }

  function extractProductStoragePath(
    value
  ) {
    const source =
      normalizeString(
        value
      );

    if (!source) {
      return '';
    }

    if (
      !source.startsWith(
        'http://'
      ) &&
      !source.startsWith(
        'https://'
      )
    ) {
      return source.replace(
        /^\/+/,
        ''
      );
    }

    try {
      const url =
        new URL(source);

      const marker =
        '/storage/v1/object/public/product-images/';

      const index =
        url.pathname.indexOf(
          marker
        );

      if (
        index === -1
      ) {
        return '';
      }

      return decodeURIComponent(
        url.pathname.slice(
          index +
          marker.length
        )
      );
    } catch {
      return '';
    }
  }

  function productImagePathBelongsToProduct(path, productId) {
    const safePath = normalizeString(path);
    const safeId = normalizeString(productId);

    return Boolean(
      safePath &&
      safeId &&
      safePath.startsWith(`${safeId}/`)
    );
  }

  async function uploadProductImage(
    product,
    file
  ) {
    validateProductImage(
      file
    );

    const oldPath =
      extractProductStoragePath(
        product.image_url
      );

    const extension =
      productImageExtension(
        file
      );

    const path =
      `${product.id}/product-${Date.now()}.${extension}`;

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .productImages
        )
        .upload(
          path,
          file,
          {
            upsert:
              false,

            cacheControl:
              '3600',

            contentType:
              file.type,
          }
        );

    if (
      uploadError
    ) {
      throw uploadError;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.products
        )
        .update({
          image_url:
            path,
        })
        .eq(
          'id',
          product.id
        )
        .select('*')
        .single();

    if (error) {
      await supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .productImages
        )
        .remove([
          path,
        ]);

      throw error;
    }

    if (
      productImagePathBelongsToProduct(
        oldPath,
        product.id
      ) &&
      oldPath !== path
    ) {
      supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .productImages
        )
        .remove([
          oldPath,
        ])
        .then(
          ({
            error:
              removeError,
          }) => {
            if (
              removeError
            ) {
              console.warn(
                '[SKy Fit] Old product image cleanup:',
                removeError
              );
            }
          }
        );
    }

    return data;
  }


  return { open: openProductEditor };
}
