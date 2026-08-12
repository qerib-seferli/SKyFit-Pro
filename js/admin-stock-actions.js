// SKy Fit Pro — Phase 9: stock əməliyyat controller-i
import { supabase, RPC, UI_CONFIG } from './config.js';
import { SKYFIT_EVENTS, $, $$, byId, clearElement, createElement, showElement, hideElement, setText, normalizeString, normalizeSearch, escapeHtml, number, money, formatDate, formatTime, formatDateTime, todayIso, debounce, rows, getCurrentIdentity, getProfileName, getProfileInitials, getProfileAvatar, roleLabel, productName, productPrice, productStock, productStockUnit, productUnitLabel, productImage, productStockState, productSaleMode, trainerName, trainerSpecialty, trainerImage, membershipIsActive, membershipStatusLabel, attendanceDate, attendanceTypeLabel, ledgerType, ledgerAmount, debtBalance, openModal, closeModal, confirmDialog, notify, getErrorMessage, setFieldError, setButtonLoading, asyncHandler } from './core.js';
import { stockUnitLabel } from './admin-product-editor.js';

export function createAdminStockActions(ctx) {
  const { state, productStockText, loadProducts, loadStockMovements, loadLedger, loadCashRegisterEntries, loadHistory, renderStock, renderStockProducts, renderAdminProducts, renderPosProducts } = ctx;

  function openStockAddModal(
    product,
    trigger = null
  ) {
    const stockUnit = stockUnitLabel(productStockUnit(product));
    const packageCalculatorEnabled = ['qram', 'tablet'].includes(stockUnit);

    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'stock-add-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="pos-confirm__summary">

        <div class="pos-confirm__row">
          <span>Məhsul</span>

          <strong>
            ${escapeHtml(
              productName(
                product
              )
            )}
          </strong>
        </div>

        <div class="pos-confirm__row">
          <span>Cari stok</span>

          <strong>
            ${escapeHtml(productStockText(product))}
          </strong>
        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-add-quantity"
        >
          Əlavə ediləcək miqdar (${escapeHtml(stockUnit)})
        </label>

        <div class="ui-input sale-variant-editor-row__quantity-input">

          <input
            id="stock-add-quantity"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0.001"
            step="0.001"
            placeholder="0"
          >
          <span class="sale-variant-editor-row__unit">${escapeHtml(stockUnit)}</span>

        </div>
        <span class="ui-field__hint">Stok bu vahidlə saxlanılır; satış da həmin vahiddən çıxacaq.</span>

        <span
          id="stock-add-quantity-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

      ${packageCalculatorEnabled ? `
        <div class="stock-package-calculator">
          <div class="stock-package-calculator__header">
            <strong>Qab/qutu ilə alırsansa</strong>
            <small>İstəyə bağlı hesablayıcı — yekun miqdarı yuxarıdakı xanaya özü yazır.</small>
          </div>
          <div class="modal-form__grid">
            <div class="ui-field">
              <label class="ui-field__label" for="stock-add-package-count">Qab / qutu sayı</label>
              <div class="ui-input">
                <input id="stock-add-package-count" class="ui-input__control" type="number" inputmode="decimal" min="0" step="1" placeholder="Məs: 2">
              </div>
            </div>
            <div class="ui-field">
              <label class="ui-field__label" for="stock-add-package-size">1 qabda / qutuda neçə ${escapeHtml(stockUnit)}</label>
              <div class="ui-input sale-variant-editor-row__quantity-input">
                <input id="stock-add-package-size" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.001" placeholder="Məs: ${stockUnit === 'qram' ? '360' : '100'}">
                <span class="sale-variant-editor-row__unit">${escapeHtml(stockUnit)}</span>
              </div>
            </div>
          </div>
          <div id="stock-add-package-result" class="stock-package-calculator__result">Yekun stok miqdarı hesablanacaq.</div>
          <label class="ui-field stock-package-calculator__price">
            <span class="ui-field__label">1 qabın alış qiyməti</span>
            <div class="ui-input"><input id="stock-add-package-price" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Məs: 60"></div>
            <span class="ui-field__hint">Qab sayı yazılıbsa ümumi maya avtomatik hesablanacaq.</span>
          </label>
        </div>
      ` : ''}

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-add-total-cost"
        >
          Bu alışın ümumi maya dəyəri
        </label>

        <div class="ui-input">

          <input
            id="stock-add-total-cost"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
          >

        </div>

        <span class="ui-field__hint">
          0 yazsan maliyyədə xərc yaradılmayacaq.
        </span>

      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="stock-add-payment-method">
          Alış ödənişi
        </label>
        <select id="stock-add-payment-method" class="ui-select">
          <option value="cash">Nağd</option>
          <option value="card">Kart</option>
        </select>
        <span class="ui-field__hint">
          Nağd alış fiziki KASSA qalığından çıxacaq, kart alışı isə kassaya toxunmayacaq.
        </span>
      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-add-note"
        >
          Qeyd
        </label>

        <textarea
          id="stock-add-note"
          class="ui-textarea"
          rows="3"
          maxlength="500"
          placeholder="Məs: Yeni partiya alışı"
        ></textarea>

      </div>

      <button
        id="stock-add-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          Stoku artır
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Anbar',

      title:
        'Stok artır',

      content,

      trigger,

      onOpen:
        () => {
          bindStockAddForm(
            content,
            product
          );
        },
    });
  }

  //
  // add_stock(
  //   p_product_id,
  //   p_quantity,
  //   p_total_cost,
  //   p_note
  // )

  function bindStockAddForm(
    form,
    product
  ) {
    const quantityInput =
      $(
        '#stock-add-quantity',
        form
      );

    const costInput =
      $(
        '#stock-add-total-cost',
        form
      );

    const packageCountInput = $('#stock-add-package-count', form);
    const packageSizeInput = $('#stock-add-package-size', form);
    const packageResult = $('#stock-add-package-result', form);
    const packagePriceInput = $('#stock-add-package-price', form);

    const noteInput =
      $(
        '#stock-add-note',
        form
      );

    const paymentInput = $('#stock-add-payment-method', form);

    const quantityError =
      $(
        '#stock-add-quantity-error',
        form
      );

    const submit =
      $(
        '#stock-add-submit',
        form
      );

    function syncPackageQuantity() {
      if (!packageCountInput || !packageSizeInput) return;
      const count = Math.max(0, number(packageCountInput.value));
      const size = Math.max(0, number(packageSizeInput.value));
      const total = count * size;

      if (count > 0 && size > 0) {
        quantityInput.value = String(Number(total.toFixed(3)));
        setText(packageResult, `${count} qab × ${size} ${stockUnitLabel(productStockUnit(product))} = ${Number(total.toFixed(3))} ${stockUnitLabel(productStockUnit(product))}`);
      } else {
        setText(packageResult, 'Yekun stok miqdarı hesablanacaq.');
      }

      const packagePrice = Math.max(0, number(packagePriceInput?.value));
      if (costInput && count > 0 && packagePrice > 0) {
        costInput.value = (count * packagePrice).toFixed(2);
      }
    }

    packageCountInput?.addEventListener('input', syncPackageQuantity);
    packageSizeInput?.addEventListener('input', syncPackageQuantity);
    packagePriceInput?.addEventListener('input', syncPackageQuantity);

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const quantity =
          number(
            quantityInput
              ?.value
          );

        const totalCost =
          Math.max(
            0,
            number(
              costInput
                ?.value
            )
          );

        const note =
          normalizeString(
            noteInput
              ?.value,
            'Stok alışı'
          );

        const paymentMethod = normalizeString(paymentInput?.value, 'cash');

        if (
          quantity <= 0
        ) {
          setFieldError(
            quantityInput,
            quantityError,
            'Miqdar sıfırdan böyük olmalıdır.'
          );

          return;
        }

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              'Əlavə olunur...',
          }
        );

        try {
          const {
            error,
          } =
            await supabase.rpc(
              RPC.addStockV3,
              {
                p_product_id:
                  product.id,

                p_quantity:
                  quantity,

                p_total_cost:
                  totalCost,

                p_note: note,
                p_payment_method: paymentMethod,
              }
            );

          if (error) {
            throw error;
          }

          closeModal();

          notify.success(
            'Stok artırıldı.'
          );

          await Promise.all([
            loadProducts(),
            loadStockMovements(),
            loadLedger(),
            loadCashRegisterEntries(),
            loadHistory({
              limit:
                50,
            }),
          ]);

          renderStock();

          renderAdminProducts();

          renderPosProducts();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] add_stock:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Stok artırılmadı.'
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

  //
  // Bu "stok artır" deyil.
  // Inventar sayımı və ya səhv düzəlişi üçündür.
  // Səbəb məcburidir.

  function openStockAdjustModal(
    product,
    trigger = null
  ) {
    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'stock-adjust-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="pos-confirm__summary">

        <div class="pos-confirm__row">
          <span>Məhsul</span>

          <strong>
            ${escapeHtml(
              productName(
                product
              )
            )}
          </strong>
        </div>

        <div class="pos-confirm__row">
          <span>Cari stok</span>

          <strong>
            ${escapeHtml(productStockText(product))}
          </strong>
        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-adjust-quantity"
        >
          Yeni real stok
        </label>

        <div class="ui-input">

          <input
            id="stock-adjust-quantity"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.001"
            value="${escapeHtml(
              String(
                productStock(
                  product
                )
              )
            )}"
          >

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="stock-adjust-note"
        >
          Düzəliş səbəbi
        </label>

        <textarea
          id="stock-adjust-note"
          class="ui-textarea"
          rows="3"
          maxlength="500"
          placeholder="Məs: Fiziki sayım zamanı fərq aşkarlandı"
        ></textarea>

        <span
          id="stock-adjust-note-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

      <button
        id="stock-adjust-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          Stoku düzəlt
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Inventar',

      title:
        'Stok düzəlişi',

      content,

      trigger,

      onOpen:
        () => {
          bindStockAdjustForm(
            content,
            product
          );
        },
    });
  }

  function bindStockAdjustForm(
    form,
    product
  ) {
    const quantityInput =
      $(
        '#stock-adjust-quantity',
        form
      );

    const noteInput =
      $(
        '#stock-adjust-note',
        form
      );

    const noteError =
      $(
        '#stock-adjust-note-error',
        form
      );

    const submit =
      $(
        '#stock-adjust-submit',
        form
      );

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const newQuantity =
          number(
            quantityInput
              ?.value,
            -1
          );

        const note =
          normalizeString(
            noteInput
              ?.value
          );

        if (
          newQuantity < 0
        ) {
          notify.warning(
            'Stok mənfi ola bilməz.'
          );

          return;
        }

        if (
          !note
        ) {
          setFieldError(
            noteInput,
            noteError,
            'Stok düzəliş səbəbini yaz.'
          );

          return;
        }

        const confirmed =
          await confirmDialog({
            eyebrow:
              'Inventar',

            title:
              'Stok dəyişdirilsin?',

            message:
              `${productName(
                product
              )}: ${productStock(
                product
              )} → ${newQuantity} ${productStockUnit(
                product
              )}`,

            confirmText:
              'Düzəlt',

            cancelText:
              'Ləğv et',
          });

        if (!confirmed) {
          return;
        }

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              'Düzəldilir...',
          }
        );

        try {
          const {
            error,
          } =
            await supabase.rpc(
              RPC.adjustStock,
              {
                p_product_id:
                  product.id,

                p_new_quantity:
                  newQuantity,

                p_note:
                  note,
              }
            );

          if (error) {
            throw error;
          }

          closeModal();

          notify.success(
            'Stok düzəlişi qeydə alındı.'
          );

          await Promise.all([
            loadProducts(),
            loadStockMovements(),
            loadHistory({
              limit:
                50,
            }),
          ]);

          renderStock();

          renderAdminProducts();

          renderPosProducts();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] adjust_stock:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Stok düzəlişi alınmadı.'
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

  function openStockProductPicker() {
    const content =
      createElement(
        'div',
        {
          className:
            'compact-list',
        }
      );

    state.products
      .filter(
        product =>
          product.is_active !==
          false
      )
      .forEach(
        product => {
          const button =
            createElement(
              'button',
              {
                className:
                  'compact-list-item',

                attrs: {
                  type:
                    'button',
                },
              }
            );

          button.innerHTML = `
            <span class="compact-list-item__icon">
              SK
            </span>

            <span class="compact-list-item__content">

              <strong class="compact-list-item__title">
                ${escapeHtml(
                  productName(
                    product
                  )
                )}
              </strong>

              <span class="compact-list-item__meta">
                ${escapeHtml(productStockText(product))}
                ·
                ${escapeHtml(
                  money(
                    productPrice(
                      product
                    )
                  )
                )}
              </span>

            </span>
          `;

          button.addEventListener(
            'click',
            () => {
              closeModal();

              setTimeout(
                () => {
                  openStockAddModal(
                    product
                  );
                },
                240
              );
            }
          );

          content.append(
            button
          );
        }
      );

    openModal({
      eyebrow:
        'Anbar',

      title:
        'Məhsul seç',

      content,
    });
  }

  function bindStockEvents() {
    byId(
      'stock-add-button'
    )?.addEventListener(
      'click',
      async () => {
        if (
          state.products.length ===
          0
        ) {
          await loadProducts();
        }

        if (
          state.products.length ===
          0
        ) {
          notify.warning(
            'Stok əlavə etmək üçün məhsul yoxdur.'
          );

          return;
        }

        openStockProductPicker();
      }
    );

    byId(
      'stock-search'
    )?.addEventListener(
      'input',
      debounce(renderStockProducts, UI_CONFIG.debounceDelay)
    );

    byId(
      'stock-filter'
    )?.addEventListener(
      'change',
      renderStockProducts
    );
  }


  return { openStockAddModal, openStockAdjustModal, openStockProductPicker, bindStockEvents };
}
