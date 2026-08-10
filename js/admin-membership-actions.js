// SKy Fit Pro — Phase 9: membership əməliyyat controller-i
import { supabase, TABLES, RPC, UI_CONFIG } from './config.js';
import { SKYFIT_EVENTS, $, $$, byId, clearElement, createElement, showElement, hideElement, setText, normalizeString, normalizeSearch, escapeHtml, number, money, formatDate, formatTime, formatDateTime, todayIso, debounce, rows, getCurrentIdentity, getProfileName, getProfileInitials, getProfileAvatar, roleLabel, productName, productPrice, productStock, productStockUnit, productUnitLabel, productImage, productStockState, productSaleMode, trainerName, trainerSpecialty, trainerImage, membershipIsActive, membershipStatusLabel, attendanceDate, attendanceTypeLabel, ledgerType, ledgerAmount, debtBalance, openModal, closeModal, confirmDialog, notify, getErrorMessage, setFieldError, setButtonLoading, asyncHandler } from './core.js';

export function createAdminMembershipActions(ctx) {
  const { state, memberOptionsMarkup, paymentMethodOptionsMarkup, paymentSplitMarkup, readPaymentSplit, loadMembers, loadMembershipPlans, loadMemberships, loadDebts, loadDebtTransactions, loadLedger, loadCashRegisterEntries, loadHistory, renderMembershipPlans, renderMemberships, renderMembers, renderDashboard, resetListLimit, operationEventName } = ctx;

  function openMembershipPlanEditor(
    plan,
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
              'membership-plan-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-plan-name"
        >
          Plan adı
        </label>

        <div class="ui-input">

          <input
            id="membership-plan-name"
            class="ui-input__control"
            type="text"
            maxlength="120"
            value="${escapeHtml(
              plan.name ||
              ''
            )}"
          >

        </div>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="membership-plan-price"
          >
            Qiymət
          </label>

          <div class="ui-input">

            <input
              id="membership-plan-price"
              class="ui-input__control"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              value="${number(
                plan.price
              )}"
            >

          </div>

        </div>

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="membership-plan-duration"
          >
            Müddət
          </label>

          <div class="ui-input">

            <input
              id="membership-plan-duration"
              class="ui-input__control"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              value="${number(
                plan.duration_days
              )}"
            >

          </div>

        </div>

      </div>

      <label class="ui-check">

        <input
          id="membership-plan-active"
          type="checkbox"
          ${
            plan.is_active
              ? 'checked'
              : ''
          }
        >

        <span>
          Plan aktivdir
        </span>

      </label>

      <div class="ui-info-card">

        <span class="ui-info-card__label">
          Plan tipi
        </span>

        <strong>
          ${
            plan.is_daily
              ? 'Günlük giriş'
              : 'Üzvlük'
          }
        </strong>

      </div>

      <button
        id="membership-plan-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          Yadda saxla
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Üzvlük planı',

      title:
        plan.name,

      content,

      trigger,

      onOpen:
        () => {
          bindMembershipPlanForm(
            content,
            plan
          );
        },
    });
  }

  function bindMembershipPlanForm(
    form,
    plan
  ) {
    const nameInput =
      $(
        '#membership-plan-name',
        form
      );

    const priceInput =
      $(
        '#membership-plan-price',
        form
      );

    const durationInput =
      $(
        '#membership-plan-duration',
        form
      );

    const activeInput =
      $(
        '#membership-plan-active',
        form
      );

    const submit =
      $(
        '#membership-plan-submit',
        form
      );

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const name =
          normalizeString(
            nameInput?.value
          );

        const price =
          number(
            priceInput?.value,
            -1
          );

        const duration =
          number(
            durationInput?.value,
            0
          );

        if (
          name.length < 2
        ) {
          notify.warning(
            'Plan adını düzgün daxil et.'
          );

          return;
        }

        if (
          price < 0
        ) {
          notify.warning(
            'Plan qiyməti düzgün deyil.'
          );

          return;
        }

        if (
          !Number.isInteger(
            duration
          ) ||
          duration < 1
        ) {
          notify.warning(
            'Plan müddəti minimum 1 gün olmalıdır.'
          );

          return;
        }

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              'Yadda saxlanılır...',
          }
        );

        try {
          const {
            error,
          } =
            await supabase
              .from(
                TABLES.membershipPlans
              )
              .update({
                name,

                price,

                duration_days:
                  duration,

                is_active:
                  Boolean(
                    activeInput
                      ?.checked
                  ),
              })
              .eq(
                'id',
                plan.id
              );

          if (error) {
            throw error;
          }

          closeModal();

          notify.success(
            'Üzvlük planı yeniləndi.'
          );

          await Promise.all([
            loadMembershipPlans(),

            loadHistory({
              limit:
                50,
            }),
          ]);

          renderMembershipPlans();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] Plan update:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Plan yenilənmədi.'
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

  async function openMembershipCreateModal(
    trigger = null
  ) {
    if (
      state.members.length ===
      0
    ) {
      await loadMembers();
    }

    if (
      state.membershipPlans.length ===
      0
    ) {
      await loadMembershipPlans();
    }

    const plans =
      state.membershipPlans
        .filter(
          plan =>
            plan.is_active &&
            !plan.is_daily
        );

    if (
      plans.length ===
      0
    ) {
      notify.warning(
        'Aktiv üzvlük planı yoxdur.'
      );

      return;
    }

    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'membership-create-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-create-member"
        >
          Üzv
        </label>

        <select
          id="membership-create-member"
          class="ui-select"
        >
          <option value="">
            Üzv seç
          </option>

          ${memberOptionsMarkup()}
        </select>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-create-plan"
        >
          Üzvlük planı
        </label>

        <select
          id="membership-create-plan"
          class="ui-select"
        >
          <option value="">
            Plan seç
          </option>

          ${plans
            .map(
              plan => `
                <option value="${escapeHtml(
                  plan.id
                )}">
                  ${escapeHtml(
                    plan.name
                  )}
                  —
                  ${escapeHtml(
                    money(
                      plan.price
                    )
                  )}
                  /
                  ${escapeHtml(
                    String(
                      plan.duration_days
                    )
                  )}
                  gün
                </option>
              `
            )
            .join('')}
        </select>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="membership-create-start"
        >
          Başlanğıc tarixi
        </label>

        <div class="ui-input">

          <input
            id="membership-create-start"
            class="ui-input__control"
            type="date"
            value="${todayIso()}"
          >

        </div>

      </div>

      <div class="payment-status-grid">
        <div class="ui-field">
          <label class="ui-field__label" for="membership-create-payment">
            Ödəniş vəziyyəti
          </label>
          <select id="membership-create-payment" class="ui-select">
            <option value="paid">Ödənilib</option>
            <option value="debt">Borc yaz</option>
          </select>
        </div>

        <div class="ui-field" id="membership-payment-method-field">
          <label class="ui-field__label" for="membership-payment-method">
            Ödəniş üsulu
          </label>
          <select id="membership-payment-method" class="ui-select">
            ${paymentMethodOptionsMarkup()}
          </select>
        </div>
      </div>

      ${paymentSplitMarkup('membership')}

      <div
        id="membership-create-preview"
        class="pos-confirm__summary"
      ></div>

      <button
        id="membership-create-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          Üzvlük yarat
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Üzvlük',

      title:
        'Yeni üzvlük',

      content,

      trigger,

      onOpen:
        () => {
          bindMembershipCreateForm(
            content,
            plans
          );
        },
    });
  }

  function bindMembershipCreateForm(
    form,
    plans
  ) {
    const memberInput =
      $(
        '#membership-create-member',
        form
      );

    const planInput =
      $(
        '#membership-create-plan',
        form
      );

    const startInput =
      $(
        '#membership-create-start',
        form
      );

    const paymentInput =
      $(
        '#membership-create-payment',
        form
      );

    const paymentMethodInput = $('#membership-payment-method', form);
    const paymentMethodField = $('#membership-payment-method-field', form);
    const mixedFields = $('#membership-mixed-fields', form);

    const preview =
      $(
        '#membership-create-preview',
        form
      );

    const submit =
      $(
        '#membership-create-submit',
        form
      );

    function selectedPlan() {
      return plans.find(
        plan =>
          String(plan.id) ===
          String(
            planInput?.value
          )
      );
    }

    function renderPreview() {
      const plan =
        selectedPlan();

      if (
        !preview
      ) {
        return;
      }

      if (!plan) {
        preview.innerHTML =
          '';

        return;
      }

      const start =
        normalizeString(
          startInput?.value
        );

      const startDate =
        start
          ? new Date(
              `${start}T12:00:00`
            )
          : null;

      let endText =
        '—';

      if (
        startDate &&
        !Number.isNaN(
          startDate.getTime()
        )
      ) {
        const endDate =
          new Date(
            startDate
          );

        endDate.setDate(
          endDate.getDate() +
          number(
            plan.duration_days
          ) -
          1
        );

        endText =
          formatDate(
            endDate
          );
      }

      preview.innerHTML = `
        <div class="pos-confirm__row">

          <span>Plan</span>

          <strong>
            ${escapeHtml(
              plan.name
            )}
          </strong>

        </div>

        <div class="pos-confirm__row">

          <span>Müddət</span>

          <strong>
            ${escapeHtml(
              String(
                plan.duration_days
              )
            )}
            gün
          </strong>

        </div>

        <div class="pos-confirm__row">

          <span>Bitmə tarixi</span>

          <strong>
            ${escapeHtml(
              endText
            )}
          </strong>

        </div>

        <div class="pos-confirm__row pos-confirm__row--total">

          <span>Məbləğ</span>

          <strong>
            ${escapeHtml(
              money(
                plan.price
              )
            )}
          </strong>

        </div>
      `;
    }

    planInput
      ?.addEventListener(
        'change',
        renderPreview
      );

    startInput
      ?.addEventListener(
        'change',
        renderPreview
      );

    const syncMembershipPayment = () => {
      const debt = paymentInput?.value === 'debt';
      debt ? hideElement(paymentMethodField) : showElement(paymentMethodField);
      if (debt) {
        hideElement(mixedFields);
      } else if (paymentMethodInput?.value === 'mixed') {
        showElement(mixedFields);
      } else {
        hideElement(mixedFields);
      }
    };

    paymentInput?.addEventListener('change', syncMembershipPayment);
    paymentMethodInput?.addEventListener('change', syncMembershipPayment);

    renderPreview();
    syncMembershipPayment();

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const memberId =
          normalizeString(
            memberInput
              ?.value
          );

        const planId =
          normalizeString(
            planInput
              ?.value
          );

        const startDate =
          normalizeString(
            startInput
              ?.value
          );

        const paymentStatus =
          normalizeString(
            paymentInput
              ?.value,
            'paid'
          );

        const plan = selectedPlan();
        const payment = paymentStatus === 'debt'
          ? { cashAmount: 0, cardAmount: 0, valid: true }
          : readPaymentSplit(form, 'membership', number(plan?.price));

        if (!memberId) {
          notify.warning(
            'Üzv seç.'
          );

          return;
        }

        if (!planId) {
          notify.warning(
            'Üzvlük planı seç.'
          );

          return;
        }

        if (!startDate) {
          notify.warning(
            'Başlanğıc tarixini seç.'
          );

          return;
        }

        if (!payment.valid) {
          notify.warning(`Nağd + Kart cəmi ${money(number(plan?.price))} olmalıdır.`);
          return;
        }

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              'Yaradılır...',
          }
        );

        try {
          const {
            data:
              membershipId,

            error,
          } =
            await supabase.rpc(
              RPC.createMembershipV2,
              {
                p_member_id: memberId,
                p_plan_id: planId,
                p_start_date: startDate,
                p_payment_status: paymentStatus,
                p_cash_amount: payment.cashAmount,
                p_card_amount: payment.cardAmount,
              }
            );

          if (error) {
            throw error;
          }

          closeModal();

          notify.success(
            paymentStatus ===
              'debt'
              ? 'Üzvlük yaradıldı və borc hesaba yazıldı.'
              : 'Üzvlük yaradıldı.'
          );

          await Promise.all([
            loadMemberships(),
            loadDebts(),
            loadDebtTransactions(),
            loadLedger(),
            loadCashRegisterEntries(),
            loadHistory({
              limit:
                50,
            }),
          ]);

          renderMemberships();

          renderDashboard();

          window.dispatchEvent(
            new CustomEvent(
              operationEventName,
              {
                detail: {
                  type:
                    'membership',

                  membershipId,

                  memberId,
                },
              }
            )
          );
        } catch (error) {
          console.error(
            '[SKy Fit Admin] create_membership:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Üzvlük yaradılmadı.'
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

  function bindMembershipEvents() {
    byId(
      'membership-create-button'
    )?.addEventListener(
      'click',
      event => {
        openMembershipCreateModal(
          event.currentTarget
        );
      }
    );

    byId(
      'memberships-search'
    )?.addEventListener(
      'input',
      debounce(renderMemberships, UI_CONFIG.debounceDelay)
    );

    byId(
      'memberships-status-filter'
    )?.addEventListener(
      'change',
      () => { resetListLimit('members'); renderMembers(); }hips
    );
  }

  // Giriş tarixçəsi ayrıca admin panelindən çıxarılıb. Attendance məlumatı hesabat/dashboard üçün saxlanır.

  return { openMembershipPlanEditor, openMembershipCreateModal, bindMembershipEvents };
}
