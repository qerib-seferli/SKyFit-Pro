// SKy Fit Pro — Phase 9: finance əməliyyat controller-i
import { supabase, RPC, UI_CONFIG } from './config.js';
import { SKYFIT_EVENTS, $, $$, byId, clearElement, createElement, showElement, hideElement, setText, normalizeString, normalizeSearch, escapeHtml, number, money, formatDate, formatTime, formatDateTime, todayIso, debounce, rows, getCurrentIdentity, getProfileName, getProfileInitials, getProfileAvatar, roleLabel, productName, productPrice, productStock, productStockUnit, productUnitLabel, productImage, productStockState, productSaleMode, trainerName, trainerSpecialty, trainerImage, membershipIsActive, membershipStatusLabel, attendanceDate, attendanceTypeLabel, ledgerType, ledgerAmount, debtBalance, openModal, closeModal, confirmDialog, notify, getErrorMessage, setFieldError, setButtonLoading, asyncHandler } from './core.js';

export function createAdminFinanceActions(ctx) {
  const { state, loadLedger, loadCashRegisterEntries, loadHistory, renderFinance, renderDashboard } = ctx;

  function expenseCategoryOptionsMarkup() {
    const groups = new Map();

    state.expenseCategories.forEach(item => {
      const group = normalizeString(item.category_group, 'Digər');
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });

    return Array.from(groups.entries())
      .map(([group, items]) => `
        <optgroup label="${escapeHtml(group)}">
          ${items.map(item => `
            <option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>
          `).join('')}
        </optgroup>
      `)
      .join('');
  }

  function incomeCategoryOptionsMarkup() {
    return state.incomeCategories
      .map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  function openIncomeModal(trigger = null) {
    const content = createElement('form', {
      className: 'modal-form',
      attrs: { id: 'income-create-form', novalidate: '' },
    });

    content.innerHTML = `
      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="income-category">Mədaxil kateqoriyası</label>
          <select id="income-category" class="ui-select">
            ${incomeCategoryOptionsMarkup()}
          </select>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" for="income-date">Tarix</label>
          <input id="income-date" class="ui-date-input" type="date" value="${todayIso()}">
        </div>
      </div>

      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="income-amount">Məbləğ</label>
          <div class="ui-input">
            <input id="income-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
          </div>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" for="income-payment-method">Ödəniş üsulu</label>
          <select id="income-payment-method" class="ui-select">
            <option value="cash">Nağd</option>
            <option value="card">Kart</option>
          </select>
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="income-description">Açıqlama / qeyd</label>
        <textarea id="income-description" class="ui-textarea" rows="3" maxlength="500" placeholder="Məs: Məşqçi aylıq zal ödənişi"></textarea>
      </div>

      <div class="ui-info-card">
        <span class="ui-info-card__icon">i</span>
        <span>
          <strong>Adi satış, üzvlük və günlük giriş burada təkrar yazılmır</strong>
          <small>Onlar avtomatik mədaxil yaradır. Bu forma yalnız personal məşq, məşqçi ödənişi, sponsorluq və digər əlavə gəlirlər üçündür.</small>
        </span>
      </div>

      <button id="income-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
        <span class="ui-button__label">Mədaxili qeydə al</span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    `;

    openModal({
      eyebrow: 'Mədaxil',
      title: 'Əlavə gəlir qeydə al',
      content,
      trigger,
      onOpen: () => {
        const submit = $('#income-submit', content);

        content.addEventListener('submit', async event => {
          event.preventDefault();

          const category = normalizeString($('#income-category', content)?.value);
          const amount = number($('#income-amount', content)?.value);
          const paymentMethod = normalizeString($('#income-payment-method', content)?.value, 'cash');
          const entryDate = normalizeString($('#income-date', content)?.value, todayIso());
          const description = normalizeString($('#income-description', content)?.value);

          if (!category || amount <= 0) {
            notify.warning('Kateqoriya və düzgün məbləğ daxil et.');
            return;
          }

          setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

          try {
            const { error } = await supabase.rpc(RPC.recordIncomeV1, {
              p_category: category,
              p_description: description || null,
              p_amount: amount,
              p_payment_method: paymentMethod,
              p_entry_date: entryDate,
            });

            if (error) throw error;

            closeModal();
            notify.success('Mədaxil qeydə alındı.');
            await Promise.all([
              loadLedger(),
              loadCashRegisterEntries(),
              loadHistory({ limit: 50 }),
            ]);
            renderFinance();
            renderDashboard();
          } catch (error) {
            console.error('[SKy Fit Kassa] Mədaxil:', error);
            notify.error(getErrorMessage(error, 'Mədaxil qeydə alınmadı.'));
          } finally {
            setButtonLoading(submit, false);
          }
        });
      },
    });
  }

  function openExpenseModal(trigger = null) {
    const content = createElement('form', {
      className: 'modal-form',
      attrs: { id: 'expense-create-form', novalidate: '' },
    });

    content.innerHTML = `
      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="expense-category">Xərc kateqoriyası</label>
          <select id="expense-category" class="ui-select">
            ${expenseCategoryOptionsMarkup()}
          </select>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" for="expense-date">Tarix</label>
          <input id="expense-date" class="ui-date-input" type="date" value="${todayIso()}">
        </div>
      </div>

      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="expense-amount">Məbləğ</label>
          <div class="ui-input">
            <input id="expense-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
          </div>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" for="expense-payment-method">Ödəniş üsulu</label>
          <select id="expense-payment-method" class="ui-select">
            <option value="cash">Nağd</option>
            <option value="card">Kart</option>
          </select>
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="expense-description">Açıqlama / qeyd</label>
        <textarea id="expense-description" class="ui-textarea" rows="3" maxlength="500" placeholder="Məs: Avqust ayı elektrik ödənişi"></textarea>
      </div>

      <div class="ui-info-card">
        <span class="ui-info-card__icon">i</span>
        <span>
          <strong>Nağd xərc kassadan avtomatik çıxacaq</strong>
          <small>Kartla ödənən xərc məxaricə düşür, amma fiziki KASSA qalığını azaltmır.</small>
        </span>
      </div>

      <button id="expense-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
        <span class="ui-button__label">Xərci qeydə al</span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    `;

    openModal({
      eyebrow: 'Məxaric',
      title: 'Zal xərci əlavə et',
      content,
      trigger,
      onOpen: () => {
        const submit = $('#expense-submit', content);

        content.addEventListener('submit', async event => {
          event.preventDefault();

          const category = normalizeString($('#expense-category', content)?.value);
          const amount = number($('#expense-amount', content)?.value);
          const paymentMethod = normalizeString($('#expense-payment-method', content)?.value, 'cash');
          const entryDate = normalizeString($('#expense-date', content)?.value, todayIso());
          const description = normalizeString($('#expense-description', content)?.value);

          if (!category || amount <= 0) {
            notify.warning('Kateqoriya və düzgün məbləğ daxil et.');
            return;
          }

          setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

          try {
            const { error } = await supabase.rpc(RPC.recordExpenseV2, {
              p_category: category,
              p_description: description || null,
              p_amount: amount,
              p_payment_method: paymentMethod,
              p_entry_date: entryDate,
            });

            if (error) throw error;

            closeModal();
            notify.success('Xərc qeydə alındı.');

            await Promise.all([
              loadLedger(),
              loadCashRegisterEntries(),
              loadHistory({ limit: 50 }),
            ]);

            renderFinance();
            renderDashboard();
          } catch (error) {
            console.error('[SKy Fit Kassa] Xərc:', error);
            notify.error(getErrorMessage(error, 'Xərc qeydə alınmadı.'));
          } finally {
            setButtonLoading(submit, false);
          }
        });
      },
    });
  }

  function openCashBalanceModal(trigger = null) {
    const content = createElement('form', {
      className: 'modal-form',
      attrs: { id: 'cash-balance-form', novalidate: '' },
    });

    content.innerHTML = `
      <div class="pos-confirm__summary">
        <div class="pos-confirm__row pos-confirm__row--total">
          <span>Sistemdə cari KASSA</span>
          <strong>${escapeHtml(money(state.cashRegisterBalance))}</strong>
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="cash-target-balance">Fiziki kassada hazırda neçə AZN var?</label>
        <div class="ui-input">
          <input id="cash-target-balance" class="ui-input__control" type="number" inputmode="decimal" min="0" step="0.01" value="${number(state.cashRegisterBalance).toFixed(2)}">
        </div>
        <span class="ui-field__hint">Sistem yalnız fərqi Kassa düzəlişi kimi tarixçəyə yazacaq.</span>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="cash-balance-note">Səbəb</label>
        <textarea id="cash-balance-note" class="ui-textarea" rows="3" maxlength="300" placeholder="Məs: İlkin kassa qalığı / fiziki sayım"></textarea>
      </div>

      <button id="cash-balance-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
        <span class="ui-button__label">Kassa qalığını təsdiqlə</span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    `;

    openModal({
      eyebrow: 'KASSA',
      title: 'Kassa qalığını düzəlt',
      content,
      trigger,
      onOpen: () => {
        const submit = $('#cash-balance-submit', content);

        content.addEventListener('submit', async event => {
          event.preventDefault();

          const target = number($('#cash-target-balance', content)?.value);
          const note = normalizeString($('#cash-balance-note', content)?.value);

          if (target < 0 || !note) {
            notify.warning('Fiziki kassa qalığını və düzəliş səbəbini yaz.');
            return;
          }

          setButtonLoading(submit, true, { loadingText: 'Yazılır...' });

          try {
            const { error } = await supabase.rpc(RPC.setCashRegisterBalance, {
              p_target_balance: target,
              p_note: note,
            });

            if (error) throw error;

            closeModal();
            notify.success('Fiziki KASSA qalığı yeniləndi.');
            await Promise.all([
              loadCashRegisterEntries(),
              loadHistory({ limit: 50 }),
            ]);
            renderFinance();
          } catch (error) {
            console.error('[SKy Fit Kassa] Qalıq:', error);
            notify.error(getErrorMessage(error, 'Kassa qalığı yenilənmədi.'));
          } finally {
            setButtonLoading(submit, false);
          }
        });
      },
    });
  }

  function staffOptionsMarkup() {
    return state.members
      .filter(item => ['admin', 'staff'].includes(normalizeString(item.role)) && item.is_active !== false)
      .map(item => `
        <option value="${escapeHtml(item.id)}">${escapeHtml(getProfileName(item))} · ${escapeHtml(roleLabel(item.role))}</option>
      `)
      .join('');
  }

  function openStaffAdvanceModal(trigger = null) {
    const content = createElement('form', {
      className: 'modal-form',
      attrs: { id: 'staff-advance-form', novalidate: '' },
    });

    content.innerHTML = `
      <div class="ui-info-card">
        <span class="ui-info-card__icon">i</span>
        <span>
          <strong>İşçi avansı biznes xərci deyil</strong>
          <small>Məsələn kassada 150 ₼ varsa, işçi 30 ₼ və başqa işçi 20 ₼ götürəndə KASSA 100 ₼ qalır. Məbləğ işçinin qaytaracağı borc kimi saxlanılır.</small>
        </span>
      </div>

      <div class="modal-form__grid">
        <div class="ui-field">
          <label class="ui-field__label" for="staff-advance-action">Əməliyyat</label>
          <select id="staff-advance-action" class="ui-select">
            <option value="advance">Kassadan avans ver</option>
            <option value="repayment">Avans qaytarması qəbul et</option>
          </select>
        </div>

        <div class="ui-field">
          <label class="ui-field__label" for="staff-advance-person">İşçi</label>
          <select id="staff-advance-person" class="ui-select">
            <option value="">İşçi seç</option>
            ${staffOptionsMarkup()}
          </select>
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="staff-advance-amount">Məbləğ</label>
        <div class="ui-input">
          <input id="staff-advance-amount" class="ui-input__control" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="0.00">
        </div>
      </div>

      <div class="ui-field">
        <label class="ui-field__label" for="staff-advance-note">Qeyd</label>
        <textarea id="staff-advance-note" class="ui-textarea" rows="3" maxlength="300" placeholder="Məs: Şəxsi ehtiyac üçün avans"></textarea>
      </div>

      <button id="staff-advance-submit" class="ui-button ui-button--primary ui-button--full" type="submit">
        <span class="ui-button__label">Əməliyyatı təsdiqlə</span>
        <span class="ui-button__spinner is-hidden" aria-hidden="true"></span>
      </button>
    `;

    openModal({
      eyebrow: 'KASSA',
      title: 'İşçi avansı',
      content,
      trigger,
      onOpen: () => {
        const submit = $('#staff-advance-submit', content);

        content.addEventListener('submit', async event => {
          event.preventDefault();

          const action = normalizeString($('#staff-advance-action', content)?.value, 'advance');
          const staffId = normalizeString($('#staff-advance-person', content)?.value);
          const amount = number($('#staff-advance-amount', content)?.value);
          const note = normalizeString($('#staff-advance-note', content)?.value);

          if (!staffId || amount <= 0) {
            notify.warning('İşçi və düzgün məbləğ seç.');
            return;
          }

          setButtonLoading(submit, true, { loadingText: 'Qeyd olunur...' });

          try {
            const { error } = await supabase.rpc(
              action === 'repayment'
                ? RPC.repayStaffCashAdvanceV2
                : RPC.takeStaffCashAdvanceV2,
              {
                p_staff_id: staffId,
                p_amount: amount,
                p_note: note || null,
              }
            );

            if (error) throw error;

            closeModal();
            notify.success(
              action === 'repayment'
                ? 'Avans qaytarması kassaya daxil edildi.'
                : 'İşçi avansı kassadan çıxıldı.'
            );

            await Promise.all([
              loadCashRegisterEntries(),
              loadHistory({ limit: 50 }),
            ]);

            renderFinance();
          } catch (error) {
            console.error('[SKy Fit Kassa] İşçi avansı:', error);
            notify.error(getErrorMessage(error, 'İşçi avans əməliyyatı tamamlanmadı.'));
          } finally {
            setButtonLoading(submit, false);
          }
        });
      },
    });
  }

  function bindFinanceEvents() {
    byId('finance-type-filter')?.addEventListener('change', renderFinance);
    byId('finance-date-from')?.addEventListener('change', renderFinance);
    byId('finance-date-to')?.addEventListener('change', renderFinance);
    byId('finance-search')?.addEventListener(
      'input',
      debounce(renderFinance, UI_CONFIG.debounceDelay)
    );

    byId('income-create-button')?.addEventListener('click', event => {
      openIncomeModal(event.currentTarget);
    });

    byId('expense-create-button')?.addEventListener('click', event => {
      openExpenseModal(event.currentTarget);
    });

    byId('cash-balance-button')?.addEventListener('click', event => {
      openCashBalanceModal(event.currentTarget);
    });

    byId('staff-advance-button')?.addEventListener('click', event => {
      openStaffAdvanceModal(event.currentTarget);
    });

    byId('finance-reset-filter')?.addEventListener('click', () => {
      const type = byId('finance-type-filter');
      const from = byId('finance-date-from');
      const to = byId('finance-date-to');
      const search = byId('finance-search');

      if (type) type.value = 'all';
      if (from) from.value = '';
      if (to) to.value = '';
      if (search) search.value = '';

      renderFinance();
    });
  }

  return { openIncomeModal, openExpenseModal, openCashBalanceModal, openStaffAdvanceModal, bindFinanceEvents };
}
