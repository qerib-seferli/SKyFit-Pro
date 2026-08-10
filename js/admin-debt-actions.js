// SKy Fit Pro — Phase 9: debt əməliyyat controller-i
import { supabase, RPC, UI_CONFIG } from './config.js';
import { SKYFIT_EVENTS, $, $$, byId, clearElement, createElement, showElement, hideElement, setText, normalizeString, normalizeSearch, escapeHtml, number, money, formatDate, formatTime, formatDateTime, todayIso, debounce, rows, getCurrentIdentity, getProfileName, getProfileInitials, getProfileAvatar, roleLabel, productName, productPrice, productStock, productStockUnit, productUnitLabel, productImage, productStockState, productSaleMode, trainerName, trainerSpecialty, trainerImage, membershipIsActive, membershipStatusLabel, attendanceDate, attendanceTypeLabel, ledgerType, ledgerAmount, debtBalance, openModal, closeModal, confirmDialog, notify, getErrorMessage, setFieldError, setButtonLoading, asyncHandler } from './core.js';

export function createAdminDebtActions(ctx) {
  const { paymentMethodOptionsMarkup, paymentSplitMarkup, readPaymentSplit, bindPaymentSplit, loadDebts, loadDebtTransactions, loadLedger, loadCashRegisterEntries, loadHistory, renderDebts, renderDashboard } = ctx;

  function openDebtPaymentModal(
    account,
    trigger = null
  ) {
    const balance =
      debtBalance(
        account
      );

    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'debt-payment-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="pos-confirm__summary">

        <div class="pos-confirm__row">

          <span>Üzv</span>

          <strong>
            ${escapeHtml(
              getProfileName(
                account.member
              )
            )}
          </strong>

        </div>

        <div class="pos-confirm__row pos-confirm__row--total">

          <span>Cari borc</span>

          <strong class="finance-amount finance-amount--expense">
            ${escapeHtml(
              money(balance)
            )}
          </strong>

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="debt-payment-amount"
        >
          Ödəniş məbləği
        </label>

        <div class="ui-input">

          <input
            id="debt-payment-amount"
            class="ui-input__control"
            type="number"
            inputmode="decimal"
            min="0.01"
            max="${balance}"
            step="0.01"
            placeholder="0.00"
          >

        </div>

      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="debt-payment-method">
          Ödəniş üsulu
        </label>
        <select id="debt-payment-method" class="ui-select">
          ${paymentMethodOptionsMarkup()}
        </select>
      </div>

      ${paymentSplitMarkup('debt')}

      <button
        id="debt-payment-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          Ödənişi qəbul et
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Borc',

      title:
        'Borc ödənişi',

      content,

      trigger,

      onOpen:
        () => {
          bindDebtPaymentForm(
            content,
            account
          );
        },
    });
  }

  //
  // Real RPC:
  //
  // pay_debt(
  //   p_member_id,
  //   p_amount,
  //   p_method
  // )

  function bindDebtPaymentForm(
    form,
    account
  ) {
    const amountInput =
      $(
        '#debt-payment-amount',
        form
      );

    const methodInput =
      $(
        '#debt-payment-method',
        form
      );

    const submit =
      $(
        '#debt-payment-submit',
        form
      );

    bindPaymentSplit(form, 'debt');

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const amount =
          number(
            amountInput
              ?.value
          );

        const payment = readPaymentSplit(form, 'debt', amount);

        const balance =
          debtBalance(
            account
          );

        if (
          amount <= 0 ||
          amount > balance
        ) {
          notify.warning(
            'Ödəniş məbləği düzgün deyil.'
          );

          return;
        }

        if (!payment.valid) {
          notify.warning(`Nağd + Kart cəmi ${money(amount)} olmalıdır.`);
          return;
        }

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              'Qəbul edilir...',
          }
        );

        try {
          const {
            error,
          } =
            await supabase.rpc(
              RPC.payDebtV2,
              {
                p_member_id: account.member_id,
                p_amount: amount,
                p_cash_amount: payment.cashAmount,
                p_card_amount: payment.cardAmount,
              }
            );

          if (error) {
            throw error;
          }

          closeModal();

          notify.success(
            'Borc ödənişi qeydə alındı.'
          );

          await Promise.all([
            loadDebts(),
            loadDebtTransactions(),
            loadLedger(),
            loadCashRegisterEntries(),
            loadHistory({
              limit:
                50,
            }),
          ]);

          renderDebts();

          renderDashboard();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] pay_debt:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Borc ödənişi tamamlanmadı.'
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

  function bindDebtEvents() {
    byId(
      'debt-search'
    )?.addEventListener(
      'input',
      debounce(renderDebts, UI_CONFIG.debounceDelay)
    );

    byId(
      'debt-status-filter'
    )?.addEventListener(
      'change',
      renderDebts
    );
  }

  return { openDebtPaymentModal, bindDebtEvents };
}
