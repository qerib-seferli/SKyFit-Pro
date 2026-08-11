// SKy Fit Pro — İşçilər və maaş hesablaşması
import { supabase, TABLES, RPC } from './config.js';
import {
  $, byId, clearElement, createElement, escapeHtml, formatDate, getCurrentIdentity,
  getProfileAvatar, getProfileInitials, getProfileName, money, normalizeString,
  number, openModal, closeModal, notify, getErrorMessage, setButtonLoading, showElement, hideElement,
} from './core.js';

const state = {
  identity: null,
  staff: [],
  employment: [],
  advances: [],
  payrolls: [],
  bound: false,
};

function roleText(role) {
  return normalizeString(role) === 'admin' ? 'Admin' : 'İşçi';
}

function employeeById(id) {
  return state.staff.find(item => String(item.id) === String(id));
}

function employmentById(id) {
  return state.employment.find(item => String(item.staff_id) === String(id));
}

function advanceById(id) {
  return state.advances.find(item => String(item.staff_id) === String(id));
}

function currentMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function loadData() {
  if (!state.identity) state.identity = await getCurrentIdentity();

  const [staffRes, employmentRes, advanceRes, payrollRes] = await Promise.all([
    supabase.from(TABLES.profiles)
      .select('id,role,full_name,email,phone,avatar_url,is_active,created_at')
      .in('role', ['admin', 'staff'])
      .order('full_name', { ascending: true }),
    supabase.from(TABLES.staffEmployment).select('*').order('updated_at', { ascending: false }),
    supabase.from(TABLES.staffCashAccounts).select('*').order('updated_at', { ascending: false }),
    supabase.from(TABLES.staffPayrolls).select('*').order('period_month', { ascending: false }).order('created_at', { ascending: false }).limit(500),
  ]);

  if (staffRes.error) throw staffRes.error;
  if (employmentRes.error) throw employmentRes.error;
  if (advanceRes.error && state.identity?.isAdmin) throw advanceRes.error;
  if (payrollRes.error) throw payrollRes.error;

  state.staff = staffRes.data || [];
  state.employment = employmentRes.data || [];
  state.advances = advanceRes.data || [];
  state.payrolls = payrollRes.data || [];
}

function avatarMarkup(employee) {
  const avatar = getProfileAvatar(employee);
  return `<span class="staff-person__avatar${avatar ? ' has-image' : ''}">${avatar
    ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(getProfileName(employee))}">`
    : escapeHtml(getProfileInitials(employee))}</span>`;
}

function renderSummary() {
  const active = state.staff.filter(item => item.is_active !== false).length;
  const advance = state.advances.reduce((sum, item) => sum + number(item.balance), 0);
  const now = currentMonthIso();
  const payroll = state.payrolls
    .filter(item => normalizeString(item.period_month).slice(0, 7) === now && item.status === 'paid')
    .reduce((sum, item) => sum + number(item.gross_pay), 0);

  if (byId('employees-active-count')) byId('employees-active-count').textContent = String(active);
  if (byId('employees-advance-total')) byId('employees-advance-total').textContent = money(advance);
  if (byId('employees-payroll-month')) byId('employees-payroll-month').textContent = money(payroll);
}

function renderStaff() {
  const root = byId('staff-management-list');
  if (!root) return;
  clearElement(root);

  const table = createElement('table', { className: 'admin-table workforce-table' });
  table.innerHTML = `
    <thead><tr>
      <th>İşçi</th><th>Vəzifə</th><th>Aylıq maaş</th><th>Açıq avans</th><th>Status</th><th>Əməliyyat</th>
    </tr></thead><tbody></tbody>`;
  const tbody = $('tbody', table);

  state.staff.forEach(employee => {
    const employment = employmentById(employee.id);
    const advance = advanceById(employee.id);
    const row = createElement('tr');
    row.innerHTML = `
      <td><div class="staff-person">${avatarMarkup(employee)}<span><strong>${escapeHtml(getProfileName(employee))}</strong><small>${escapeHtml(employee.phone || employee.email || '—')}</small></span></div></td>
      <td><strong>${escapeHtml(employment?.job_title || roleText(employee.role))}</strong><span class="admin-table__secondary">${roleText(employee.role)}</span></td>
      <td><strong>${escapeHtml(money(employment?.base_salary || 0))}</strong></td>
      <td><strong class="${number(advance?.balance) > 0 ? 'finance-amount finance-amount--expense' : ''}">${escapeHtml(money(advance?.balance || 0))}</strong></td>
      <td><span class="${employee.is_active === false || employment?.is_active === false ? 'ui-badge ui-badge--neutral' : 'ui-badge ui-badge--success'}">${employee.is_active === false || employment?.is_active === false ? 'Deaktiv' : 'Aktiv'}</span></td>
      <td><div class="admin-inline-actions">
        ${state.identity?.isAdmin ? `<button class="ui-button ui-button--glass ui-button--compact" type="button" data-staff-edit="${employee.id}">Məlumat</button><button class="ui-button ui-button--primary ui-button--compact" type="button" data-staff-payroll="${employee.id}">Maaş</button>` : '<span class="admin-table__secondary">Yalnız baxış</span>'}
      </div></td>`;
    tbody.append(row);
  });

  root.append(table);
  root.querySelectorAll('[data-staff-edit]').forEach(button => button.addEventListener('click', () => openEmploymentModal(employeeById(button.dataset.staffEdit), button)));
  root.querySelectorAll('[data-staff-payroll]').forEach(button => button.addEventListener('click', () => openPayrollModal(employeeById(button.dataset.staffPayroll), button)));
}

function renderPayrolls() {
  const root = byId('staff-payroll-list');
  if (!root) return;
  clearElement(root);

  const table = createElement('table', { className: 'admin-table payroll-table' });
  table.innerHTML = `<thead><tr><th>Dövr</th><th>İşçi</th><th>Maaş</th><th>Bonus</th><th>Tutulma</th><th>Avansdan tutuldu</th><th>Ödənən</th><th>Tarix</th><th>Əməliyyat</th></tr></thead><tbody></tbody>`;
  const tbody = $('tbody', table);

  state.payrolls.forEach(item => {
    const employee = employeeById(item.staff_id);
    const netPaid = number(item.cash_amount) + number(item.card_amount);
    const period = normalizeString(item.period_month).slice(0, 7).split('-').reverse().join('.');
    const row = createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(period || '—')}</strong></td>
      <td><strong>${escapeHtml(getProfileName(employee))}</strong></td>
      <td>${escapeHtml(money(item.base_salary))}</td>
      <td class="finance-amount finance-amount--income">+ ${escapeHtml(money(item.bonus))}</td>
      <td class="finance-amount finance-amount--expense">− ${escapeHtml(money(item.deduction))}</td>
      <td class="finance-amount finance-amount--expense">− ${escapeHtml(money(item.advance_offset))}</td>
      <td><strong>${escapeHtml(money(netPaid))}</strong><span class="admin-table__secondary">Ümumi xərc: ${escapeHtml(money(item.gross_pay))}</span></td>
      <td>${formatDate(item.updated_at || item.created_at)}</td>
      <td>${state.identity?.isAdmin && item.status === 'paid' ? `<button class="ui-button ui-button--glass ui-button--compact" type="button" data-payroll-edit="${item.id}">Düzəlt</button>` : '—'}</td>`;
    tbody.append(row);
  });

  root.append(table);
  root.querySelectorAll('[data-payroll-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const payroll = state.payrolls.find(item => String(item.id) === String(button.dataset.payrollEdit));
      openPayrollModal(employeeById(payroll?.staff_id), button, payroll || null);
    });
  });
}

function openEmploymentModal(employee, trigger = null) {
  if (!employee || !state.identity?.isAdmin) return;
  const item = employmentById(employee.id);
  const content = createElement('form', { className: 'modal-form', attrs: { novalidate: '' } });
  content.innerHTML = `
    <div class="member-preview__hero compact"><div class="member-preview__avatar">${getProfileAvatar(employee) ? `<img src="${escapeHtml(getProfileAvatar(employee))}" alt="">` : `<span>${escapeHtml(getProfileInitials(employee))}</span>`}</div><div class="member-preview__identity"><strong>${escapeHtml(getProfileName(employee))}</strong><span>${escapeHtml(roleText(employee.role))}</span></div></div>
    <div class="modal-form__grid">
      <div class="ui-field"><label class="ui-field__label">Vəzifə</label><div class="ui-input"><input id="employment-title" class="ui-input__control" value="${escapeHtml(item?.job_title || '')}" placeholder="Məs: Administrator"></div></div>
      <div class="ui-field"><label class="ui-field__label">Aylıq baza maaşı</label><div class="ui-input"><input id="employment-salary" class="ui-input__control" type="number" min="0" step="0.01" value="${number(item?.base_salary).toFixed(2)}"></div></div>
      <div class="ui-field"><label class="ui-field__label">İşə başlama tarixi</label><input id="employment-hired" class="ui-date-input" type="date" value="${escapeHtml(item?.hired_on || '')}"></div>
      <div class="ui-field"><label class="ui-field__label">Status</label><select id="employment-active" class="ui-select"><option value="true" ${item?.is_active === false ? '' : 'selected'}>Aktiv</option><option value="false" ${item?.is_active === false ? 'selected' : ''}>Deaktiv</option></select></div>
    </div>
    <div class="ui-field"><label class="ui-field__label">Qeyd</label><textarea id="employment-note" class="ui-textarea" rows="3" placeholder="Əlavə qeyd">${escapeHtml(item?.notes || '')}</textarea></div>
    <button id="employment-submit" class="ui-button ui-button--primary ui-button--full" type="submit"><span class="ui-button__label">Yadda saxla</span><span class="ui-button__spinner is-hidden"></span></button>`;

  openModal({ eyebrow: 'İşçilər', title: 'Əməkdaş məlumatı', content, trigger, onOpen: () => {
    const submit = $('#employment-submit', content);
    content.addEventListener('submit', async event => {
      event.preventDefault();
      setButtonLoading(submit, true, { loadingText: 'Yadda saxlanılır...' });
      try {
        const { error } = await supabase.rpc(RPC.saveStaffEmploymentV1, {
          p_staff_id: employee.id,
          p_job_title: normalizeString($('#employment-title', content)?.value) || null,
          p_base_salary: Math.max(0, number($('#employment-salary', content)?.value)),
          p_hired_on: normalizeString($('#employment-hired', content)?.value) || null,
          p_notes: normalizeString($('#employment-note', content)?.value) || null,
          p_is_active: $('#employment-active', content)?.value !== 'false',
        });
        if (error) throw error;
        closeModal();
        notify.success('İşçi məlumatı yeniləndi.');
        await loadAndRenderWorkforce();
        window.dispatchEvent(new CustomEvent('skyfit:admin-operation', { detail: { type: 'staff_employment' } }));
      } catch (error) {
        notify.error(getErrorMessage(error, 'İşçi məlumatı yadda saxlanmadı.'));
      } finally { setButtonLoading(submit, false); }
    });
  }});
}

function payrollPaymentMarkup() {
  return `
    <div class="ui-field"><label class="ui-field__label">Ödəniş üsulu</label><select id="payroll-payment-method" class="ui-select"><option value="cash">Nağd</option><option value="card">Kart</option><option value="mixed">Nağd + Kart</option></select></div>
    <div id="payroll-mixed-fields" class="payment-split-grid is-hidden">
      <div class="ui-field"><label class="ui-field__label">Nağd</label><div class="ui-input"><input id="payroll-cash" class="ui-input__control" type="number" min="0" step="0.01" placeholder="0.00"></div></div>
      <div class="ui-field"><label class="ui-field__label">Kart</label><div class="ui-input"><input id="payroll-card" class="ui-input__control" type="number" min="0" step="0.01" placeholder="0.00"></div></div>
    </div>`;
}

function openPayrollModal(employee = null, trigger = null, payroll = null) {
  if (!state.identity?.isAdmin) { notify.warning('Maaş hesablaşmasını yalnız admin edə bilər.'); return; }
  const editing = Boolean(payroll?.id);
  const defaultEmployee = employee || state.staff.find(item => item.is_active !== false);
  if (!defaultEmployee) return;
  const periodValue = editing ? normalizeString(payroll.period_month).slice(0, 7) : currentMonthIso();

  const content = createElement('form', { className: 'modal-form payroll-form', attrs: { novalidate: '' } });
  content.innerHTML = `
    <div class="ui-info-card"><span class="ui-info-card__icon">₼</span><span><strong>${editing ? 'Maaş düzəlişi' : 'Maaş hesablaşması'}</strong><small>${editing ? 'Səhv daxil edilmiş maaşı təhlükəsiz düzəlt. KASSA, xərc və avans balansı birlikdə yenilənəcək.' : 'Avans əvvəl verildikdə xərc sayılmır. Maaş bağlananda avansdan tutulan hissə maaş xərcinə daxil olur, amma KASSA-dan ikinci dəfə çıxmır.'}</small></span></div>
    <div class="modal-form__grid payroll-form__grid">
      <div class="ui-field"><label class="ui-field__label">İşçi</label><select id="payroll-staff" class="ui-select" ${editing ? 'disabled' : ''}>${state.staff.filter(x => x.is_active !== false).map(x => `<option value="${x.id}" ${x.id === defaultEmployee.id ? 'selected' : ''}>${escapeHtml(getProfileName(x))}</option>`).join('')}</select></div>
      <div class="ui-field"><label class="ui-field__label">Ay</label><input id="payroll-month" class="ui-date-input" type="month" value="${escapeHtml(periodValue)}" ${editing ? 'disabled' : ''}></div>
      <div class="ui-field"><label class="ui-field__label">Baza maaşı</label><div class="ui-input"><input id="payroll-base" class="ui-input__control" type="number" min="0" step="0.01" value="${editing ? number(payroll.base_salary).toFixed(2) : ''}"></div></div>
      <div class="ui-field"><label class="ui-field__label">Bonus</label><div class="ui-input"><input id="payroll-bonus" class="ui-input__control" type="number" min="0" step="0.01" value="${editing ? number(payroll.bonus).toFixed(2) : '0'}"></div></div>
      <div class="ui-field"><label class="ui-field__label">Digər tutulma</label><div class="ui-input"><input id="payroll-deduction" class="ui-input__control" type="number" min="0" step="0.01" value="${editing ? number(payroll.deduction).toFixed(2) : '0'}"></div></div>
      <div class="ui-field"><label class="ui-field__label">Avansdan tutulacaq</label><div class="ui-input"><input id="payroll-advance" class="ui-input__control" type="number" min="0" step="0.01" value="${editing ? number(payroll.advance_offset).toFixed(2) : '0'}"></div><span id="payroll-advance-hint" class="ui-field__hint"></span></div>
    </div>
    <div class="payroll-preview" id="payroll-preview"></div>
    ${payrollPaymentMarkup()}
    <div class="ui-field"><label class="ui-field__label">Qeyd</label><textarea id="payroll-note" class="ui-textarea" rows="3" placeholder="Məs: Avqust maaşı">${escapeHtml(payroll?.note || '')}</textarea></div>
    <button id="payroll-submit" class="ui-button ui-button--primary ui-button--full" type="submit"><span class="ui-button__label">${editing ? 'Düzəlişi yadda saxla' : 'Maaşı bağla və ödə'}</span><span class="ui-button__spinner is-hidden"></span></button>`;

  openModal({ eyebrow: 'Maaş', title: editing ? 'Maaş hesablaşmasını düzəlt' : 'Aylıq hesablaşma', content, trigger, onOpen: () => {
    const staffInput = $('#payroll-staff', content), baseInput = $('#payroll-base', content), bonusInput = $('#payroll-bonus', content), deductionInput = $('#payroll-deduction', content), advanceInput = $('#payroll-advance', content), methodInput = $('#payroll-payment-method', content), mixedFields = $('#payroll-mixed-fields', content), cashInput = $('#payroll-cash', content), cardInput = $('#payroll-card', content), preview = $('#payroll-preview', content), advanceHint = $('#payroll-advance-hint', content), submit = $('#payroll-submit', content);

    if (editing) {
      const cash = number(payroll.cash_amount), card = number(payroll.card_amount);
      const method = cash > 0 && card > 0 ? 'mixed' : card > 0 ? 'card' : 'cash';
      if (methodInput) methodInput.value = method;
      if (cashInput) cashInput.value = cash.toFixed(2);
      if (cardInput) cardInput.value = card.toFixed(2);
    }

    const syncTotals = () => {
      const base = Math.max(0, number(baseInput?.value)), bonus = Math.max(0, number(bonusInput?.value)), deduction = Math.max(0, number(deductionInput?.value)), advance = Math.max(0, number(advanceInput?.value));
      const gross = Math.max(0, base + bonus - deduction), net = Math.max(0, gross - advance);
      if (preview) preview.innerHTML = `<div><span>Hesablanan əmək haqqı</span><strong>${escapeHtml(money(gross))}</strong></div><div><span>Avansdan tutulur</span><strong>− ${escapeHtml(money(advance))}</strong></div><div class="is-total"><span>İndi ödənəcək</span><strong>${escapeHtml(money(net))}</strong></div>`;
      if (methodInput?.value === 'cash' && cashInput) cashInput.value = net.toFixed(2);
      if (methodInput?.value === 'card' && cardInput) cardInput.value = net.toFixed(2);
    };
    const syncEmployee = () => {
      const id = staffInput?.value || defaultEmployee.id, emp = employmentById(id);
      const available = number(advanceById(id)?.balance) + (editing ? number(payroll.advance_offset) : 0);
      if (!editing && baseInput) baseInput.value = number(emp?.base_salary).toFixed(2);
      if (advanceHint) advanceHint.textContent = `Düzəliş üçün mövcud avans limiti: ${money(available)}`;
      syncTotals();
    };
    const syncPayment = () => { (methodInput?.value === 'mixed') ? showElement(mixedFields) : hideElement(mixedFields); syncTotals(); };
    [baseInput, bonusInput, deductionInput, advanceInput, cashInput, cardInput].forEach(input => input?.addEventListener('input', syncTotals));
    staffInput?.addEventListener('change', syncEmployee); methodInput?.addEventListener('change', syncPayment);
    syncEmployee(); syncPayment();

    content.addEventListener('submit', async event => {
      event.preventDefault();
      const staffId = normalizeString(staffInput?.value || defaultEmployee.id), month = normalizeString($('#payroll-month', content)?.value || periodValue);
      const base = Math.max(0, number(baseInput?.value)), bonus = Math.max(0, number(bonusInput?.value)), deduction = Math.max(0, number(deductionInput?.value)), advance = Math.max(0, number(advanceInput?.value));
      const gross = Math.max(0, base + bonus - deduction), net = Math.max(0, gross - advance);
      const availableAdvance = number(advanceById(staffId)?.balance) + (editing ? number(payroll.advance_offset) : 0);
      if (!staffId || !month || advance > availableAdvance + 0.005 || advance > gross + 0.005) { notify.warning('İşçi, ay və avans tutulmasını düzgün yoxla.'); return; }
      let cash = 0, card = 0; const method = methodInput?.value || 'cash';
      if (method === 'cash') cash = net; else if (method === 'card') card = net; else { cash = Math.max(0, number(cashInput?.value)); card = Math.max(0, number(cardInput?.value)); }
      if (Math.abs((cash + card) - net) > 0.005) { notify.warning(`Nağd + Kart cəmi ${money(net)} olmalıdır.`); return; }
      setButtonLoading(submit, true, { loadingText: editing ? 'Düzəldilir...' : 'Hesablaşır...' });
      try {
        const rpc = editing ? RPC.correctStaffPayrollV1 : RPC.settleStaffPayrollV1;
        const params = editing ? {
          p_payroll_id: payroll.id, p_base_salary: base, p_bonus: bonus, p_deduction: deduction,
          p_advance_offset: advance, p_cash_amount: cash, p_card_amount: card,
          p_note: normalizeString($('#payroll-note', content)?.value) || null,
        } : {
          p_staff_id: staffId, p_period_month: `${month}-01`, p_base_salary: base, p_bonus: bonus,
          p_deduction: deduction, p_advance_offset: advance, p_cash_amount: cash, p_card_amount: card,
          p_note: normalizeString($('#payroll-note', content)?.value) || null,
        };
        const { error } = await supabase.rpc(rpc, params); if (error) throw error;
        closeModal(); notify.success(editing ? 'Maaş hesablaşması düzəldildi.' : 'Maaş hesablaşması bağlandı.');
        await loadAndRenderWorkforce(); window.dispatchEvent(new CustomEvent('skyfit:admin-operation', { detail: { type: 'payroll' } }));
      } catch (error) { notify.error(getErrorMessage(error, editing ? 'Maaş düzəlişi tamamlanmadı.' : 'Maaş hesablaşması tamamlanmadı.')); }
      finally { setButtonLoading(submit, false); }
    });
  }});
}

export async function loadAndRenderWorkforce() {
  try {
    await loadData();
    renderSummary();
    renderStaff();
    renderPayrolls();
  } catch (error) {
    console.error('[SKy Fit İşçilər]', error);
    notify.error(getErrorMessage(error, 'İşçi məlumatları yüklənmədi.'));
  }
}

export function bindWorkforceEvents() {
  if (state.bound) return;
  state.bound = true;
  byId('payroll-create-button')?.addEventListener('click', async event => {
    if (!state.staff.length) await loadData();
    openPayrollModal(null, event.currentTarget);
  });
}
