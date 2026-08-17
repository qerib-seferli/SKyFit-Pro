// SKy Fit Pro — Audit / əməliyyat tarixçəsi təqdimatı
import {
  createElement,
  escapeHtml,
  normalizeString,
  roleLabel,
  money,
  formatDate,
  formatDateTime,
  openModal,
} from './core.js';

export function historyTableLabel(table) {
  const labels = {
    products: 'Məhsul',
    product_sale_variants: 'Satış variantı',
    trainers: 'Məşqçi',
    sales: 'Satış',
    sale_items: 'Satış məhsulu',
    memberships: 'Üzvlük',
    attendance: 'Giriş',
    walk_in_entries: 'Günlük giriş',
    stock_movements: 'Stok',
    debt_transactions: 'Borc',
    ledger_entries: 'Mədaxil / Məxaric',
    staff_shifts: 'İş növbəsi',
    staff_cash_transactions: 'İşçi avansı',
    staff_employment: 'İşçi məlumatı',
    staff_payrolls: 'Maaş',
    cash_register_entries: 'KASSA',
    expense_categories: 'Xərc kateqoriyası',
    income_categories: 'Mədaxil kateqoriyası',
    sale_reversals: 'Satış qaytarması',
  };
  return labels[normalizeString(table)] || normalizeString(table, 'Əməliyyat');
}

export function historyActionLabel(action) {
  switch (normalizeString(action).toUpperCase()) {
    case 'INSERT': return 'Əlavə etdi';
    case 'UPDATE': return 'Dəyişiklik etdi';
    case 'DELETE': return 'Sildi';
    default: return normalizeString(action, 'Əməliyyat');
  }
}

export function historyActionClass(action) {
  switch (normalizeString(action).toUpperCase()) {
    case 'INSERT': return 'ui-badge ui-badge--success';
    case 'UPDATE': return 'ui-badge ui-badge--warning';
    case 'DELETE': return 'ui-badge ui-badge--danger';
    default: return 'ui-badge ui-badge--neutral';
  }
}

const HIDDEN_FIELDS = new Set([
  'updated_at', 'operator_shift_id', 'updated_by', 'created_by', 'id', 'auth_user_id',
  'staff_id', 'member_id', 'plan_id', 'product_id', 'sale_id', 'reference_id', 'sale_variant_id',
]);

const FIELD_LABELS = {
  name: 'Ad', full_name: 'Ad və soyad', retail_price: 'Pərakəndə qiymət',
  portion_price: 'Porsiya qiyməti', cost_price: 'Maya qiyməti', stock_quantity: 'Stok',
  low_stock_threshold: 'Az stok limiti', is_active: 'Aktivlik', show_public: 'Saytda görünmə',
  payment_status: 'Ödəniş vəziyyəti', payment_method: 'Ödəniş üsulu', cash_amount: 'Nağd məbləğ',
  card_amount: 'Kart məbləği', status: 'Status', start_date: 'Başlanğıc', end_date: 'Bitmə',
  price: 'Qiymət', amount: 'Məbləğ', attendance_type: 'Giriş növü', specialty: 'İxtisas',
  phone: 'Telefon', bio: 'Haqqında', image_url: 'Şəkil', sort_order: 'Sıralama', note: 'Qeyd',
  notes: 'Qeyd', description: 'Açıqlama', category: 'Kateqoriya', variant_type: 'Satış növü',
  stock_deduction: 'Stokdan çıxılma', is_quick_sale: 'Tez satış', gross_profit: 'Brüt qazanc',
  cost_total: 'Maya cəmi', movement_type: 'Stok hərəkəti', quantity: 'Miqdar',
  balance_after: 'Qalıq', transaction_type: 'Əməliyyat növü', base_salary: 'Baza maaşı',
  bonus: 'Bonus', deduction: 'Tutulma', advance_offset: 'Avansdan tutulma', gross_pay: 'Hesablanan maaş',
  net_pay: 'Ödənən maaş', job_title: 'Vəzifə', reason: 'Səbəb', reversal_type: 'Qaytarma növü',
  role: 'Rol', email: 'E-poçt', address: 'Ünvan', stock_unit: 'Stok vahidi', sale_mode: 'Satış qaydası',
  period_month: 'Maaş dövrü', hired_on: 'İşə başlama', is_manual: 'Müştəri profili',
  subtotal: 'Ara cəm', total_amount: 'Ümumi məbləğ', discount_amount: 'Endirim məbləği',
  receipt_no: 'Qəbz nömrəsi', created_at: 'Yaradılma vaxtı', payment_status: 'Ödəniş vəziyyəti',
  payment_method: 'Ödəniş üsulu', cash_amount: 'Nağd məbləğ', card_amount: 'Kart məbləği',
};

const MONEY_FIELDS = new Set([
  'retail_price','portion_price','cost_price','price','amount','total_amount','subtotal','balance',
  'cash_amount','card_amount','gross_profit','cost_total','base_salary','bonus','deduction',
  'advance_offset','gross_pay','net_pay','opening_cash','closing_cash',
]);

function auditFieldLabel(key) {
  return FIELD_LABELS[key] || key.replaceAll('_', ' ');
}

function auditChanges(oldData, newData) {
  const oldObject = oldData && typeof oldData === 'object' ? oldData : {};
  const newObject = newData && typeof newData === 'object' ? newData : {};
  return [...new Set([...Object.keys(oldObject), ...Object.keys(newObject)])]
    .filter(key => !HIDDEN_FIELDS.has(key))
    .filter(key => JSON.stringify(oldObject[key]) !== JSON.stringify(newObject[key]))
    .map(key => ({ key, oldValue: oldObject[key], newValue: newObject[key] }));
}

function formatAuditValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Bəli' : 'Xeyr';
  if (MONEY_FIELDS.has(key)) return money(value);
  if (['start_date','end_date','entry_date','period_start','period_end'].includes(key)) return formatDate(value);
  if (['created_at','updated_at','paid_at','refunded_at'].includes(key)) return formatDateTime(value);

  const normalized = normalizeString(value).toLowerCase();
  const valueLabels = {
    cash: 'Nağd',
    card: 'Kart',
    mixed: 'Nağd + Kart',
    paid: 'Ödənilib',
    debt: 'Borc',
    pending: 'Gözləmədə',
    active: 'Aktiv',
    inactive: 'Passiv',
    reversed: 'Qaytarılıb',
    refunded: 'Geri qaytarılıb',
  };
  if (valueLabels[normalized]) return valueLabels[normalized];
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function previousAuditEvent(item, history = []) {
  if (!item?.record_id || !item?.table_name) return null;
  const current = new Date(item.created_at || 0).getTime();
  return history
    .filter(candidate => candidate !== item && String(candidate.record_id || '') === String(item.record_id || '') && String(candidate.table_name || '') === String(item.table_name || '') && new Date(candidate.created_at || 0).getTime() < current)
    .sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
}

function recordDisplayName(item) {
  const data = item?.new_data || item?.old_data || {};
  return normalizeString(
    data.product_name || data.name || data.full_name || data.description || data.note || data.category,
    historyTableLabel(item?.table_name)
  );
}

export function openAuditDetail(item, history = [], trigger = null) {
  const changes = auditChanges(item?.old_data, item?.new_data);
  const previous = previousAuditEvent(item, history);
  const content = createElement('div', { className: 'audit-detail audit-detail--timeline' });
  const previousOperator = previous?.actor_name || 'Əvvəlki dəyişiklik yoxdur';
  const title = recordDisplayName(item);

  const changeMarkup = changes.length
    ? changes.map(change => `
      <article class="audit-change">
        <strong class="audit-change__field">${escapeHtml(auditFieldLabel(change.key))}</strong>
        <div class="audit-change__values">
          <div class="audit-change__value audit-change__value--old"><span>Əvvəl</span><strong>${escapeHtml(formatAuditValue(change.key, change.oldValue))}</strong></div>
          <span class="audit-change__arrow" aria-hidden="true">→</span>
          <div class="audit-change__value audit-change__value--new"><span>Sonra</span><strong>${escapeHtml(formatAuditValue(change.key, change.newValue))}</strong></div>
        </div>
      </article>`).join('')
    : `<div class="ui-info-card"><span class="ui-info-card__label">Nəticə</span><strong>${normalizeString(item?.action).toUpperCase() === 'INSERT' ? 'Yeni qeyd yaradılıb' : normalizeString(item?.action).toUpperCase() === 'DELETE' ? 'Qeyd silinib' : 'Görünən sahələrdə fərq yoxdur'}</strong></div>`;

  content.innerHTML = `
    <section class="audit-timeline-summary">
      <div class="audit-timeline-summary__record"><span>Qeyd</span><strong>${escapeHtml(title)}</strong></div>
      <div class="audit-timeline">
        <article class="audit-timeline__step audit-timeline__step--previous">
          <span class="audit-timeline__dot" aria-hidden="true"></span>
          <div><span>Əvvəlki dəyişiklik</span><strong>${escapeHtml(previousOperator)}</strong><small>${previous ? escapeHtml(formatDateTime(previous.created_at)) : '—'}</small></div>
        </article>
        <article class="audit-timeline__step audit-timeline__step--current">
          <span class="audit-timeline__dot" aria-hidden="true"></span>
          <div><span>Son əməliyyat</span><strong>${escapeHtml(item?.actor_name || 'Sistem')} · ${escapeHtml(roleLabel(item?.actor_role))}</strong><small>${escapeHtml(formatDateTime(item?.created_at))}</small></div>
        </article>
      </div>
      <div class="audit-detail__summary">
        <div><span>Əməliyyat</span><strong>${escapeHtml(historyActionLabel(item?.action))}</strong></div>
        <div><span>Bölmə</span><strong>${escapeHtml(historyTableLabel(item?.table_name))}</strong></div>
      </div>
    </section>
    <section class="audit-change-list">${changeMarkup}</section>`;

  openModal({ eyebrow: 'Əməliyyat tarixçəsi', title: `${historyTableLabel(item?.table_name)} · ${historyActionLabel(item?.action)}`, content, trigger });
}
