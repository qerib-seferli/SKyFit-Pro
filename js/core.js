// SKy Fit Pro — ortaq frontend nüvəsi
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  APP_CONFIG,
  TABLES,
  UI_CONFIG,
  STORAGE_KEYS as CONFIG_STORAGE_KEYS,
  USER_ROLES as CONFIG_USER_ROLES,
  readAuthRecoveryStorage,
  clearAuthRecoveryStorage,
  PAYMENT_STATUS,
  SALE_MODES as CONFIG_SALE_MODES,
} from './config.js';

export const SKYFIT_EVENTS = Object.freeze({
  authChange: 'skyfit:authchange',
  profileChange: 'skyfit:profilechange',
  favoritesChange: 'skyfit:favoriteschange',
  themeChange: 'skyfit:themechange',
  modalOpen: 'skyfit:modalopen',
  modalClose: 'skyfit:modalclose',
  loaderChange: 'skyfit:loaderchange',
});

// Köhnə importları qırmamaq üçün compatibility alias-ları.
export const STORAGE_KEYS = Object.freeze({
  ...CONFIG_STORAGE_KEYS,
  installDismissed: 'skyfit-pro-install-dismissed',
});

export const PAYMENT_METHODS = Object.freeze({
  cash: 'cash',
  card: 'card',
  mixed: 'mixed',
});

export const PAYMENT_STATUSES = Object.freeze({
  paid: PAYMENT_STATUS.PAID,
  debt: PAYMENT_STATUS.DEBT,
  cancelled: PAYMENT_STATUS.CANCELLED,
  refunded: PAYMENT_STATUS.REFUNDED,
});

export const USER_ROLES = Object.freeze({
  admin: CONFIG_USER_ROLES.ADMIN,
  staff: CONFIG_USER_ROLES.STAFF,
  member: CONFIG_USER_ROLES.MEMBER,
});

export const SALE_MODES = Object.freeze({
  unit: CONFIG_SALE_MODES.UNIT,
  portion: CONFIG_SALE_MODES.PORTION,
});

export function byId(id) {
  return id ? document.getElementById(id) : null;
}

export function $(selector, root = document) {
  return selector && root ? root.querySelector(selector) : null;
}

export function $$(selector, root = document) {
  return selector && root ? Array.from(root.querySelectorAll(selector)) : [];
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = String(options.text);
  if (options.html !== undefined) element.innerHTML = String(options.html);

  if (options.attrs && typeof options.attrs === 'object') {
    Object.entries(options.attrs).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      element.setAttribute(key, value === true ? '' : String(value));
    });
  }

  if (options.dataset && typeof options.dataset === 'object') {
    Object.entries(options.dataset).forEach(([key, value]) => {
      if (value !== null && value !== undefined) element.dataset[key] = String(value);
    });
  }

  return element;
}

export function clearElement(element) {
  element?.replaceChildren();
}

export function setText(element, value = '') {
  if (element) element.textContent = value ?? '';
}

export function setHtml(element, value = '') {
  if (element) element.innerHTML = value ?? '';
}

export function showElement(element) {
  if (!element) return;
  element.hidden = false;
  element.classList.remove('is-hidden');
}

export function hideElement(element) {
  if (!element) return;
  element.hidden = true;
  element.classList.add('is-hidden');
}

export function toggleElement(element, visible) {
  visible ? showElement(element) : hideElement(element);
}

export function normalizeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, ' ').trim() || fallback;
}

export function normalizeSearch(value) {
  return normalizeString(value).toLocaleLowerCase(APP_CONFIG.locale);
}

export function escapeHtml(value) {
  return normalizeString(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function initials(value, fallback = 'SK') {
  const parts = normalizeString(value).split(' ').filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase(APP_CONFIG.locale);
  return `${parts[0][0]}${parts.at(-1)[0]}`.toLocaleUpperCase(APP_CONFIG.locale);
}

export function number(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(number(value), min), max);
}

const moneyFormatter = new Intl.NumberFormat(APP_CONFIG.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value, options = {}) {
  const currency = normalizeString(options.currency, '₼');
  return `${moneyFormatter.format(number(value))} ${currency}`;
}

const dateFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_CONFIG.locale, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function dateOnlyToLocal(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function validDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : dateOnlyToLocal(value) || new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = '—') {
  const date = validDate(value);
  return date ? dateFormatter.format(date) : fallback;
}

export function formatTime(value, fallback = '—') {
  const date = validDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

export function formatDateTime(value, fallback = '—') {
  const date = validDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(start, end) {
  const startDate = validDate(start);
  const endDate = validDate(end);
  if (!startDate || !endDate) return 0;
  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((endUtc - startUtc) / 86400000);
}

export function debounce(callback, delay = UI_CONFIG.debounceDelay) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => callback.apply(this, args), delay);
  };
}

export function throttle(callback, delay = 150) {
  let waiting = false;
  let queuedArgs = null;
  let queuedContext = null;

  const runQueued = () => {
    if (!queuedArgs) {
      waiting = false;
      return;
    }
    const args = queuedArgs;
    const context = queuedContext;
    queuedArgs = null;
    queuedContext = null;
    callback.apply(context, args);
    setTimeout(runQueued, delay);
  };

  return function throttled(...args) {
    if (!waiting) {
      waiting = true;
      callback.apply(this, args);
      setTimeout(runQueued, delay);
      return;
    }
    queuedArgs = args;
    queuedContext = this;
  };
}

export function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value, fallback = '') {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export function rows(value) {
  return Array.isArray(value) ? value : [];
}

export function uniqueBy(array, keyGetter) {
  const map = new Map();
  rows(array).forEach(item => {
    const key = keyGetter(item);
    if (key !== null && key !== undefined) map.set(String(key), item);
  });
  return Array.from(map.values());
}

const TECHNICAL_MESSAGE_LABELS = Object.freeze({
  staff_payrolls: 'maaş tarixçəsi', staff_employment: 'işçi məlumatı', sale_reversals: 'satış qaytarması',
  sale_items: 'satış məhsulları', product_sale_variants: 'satış seçimləri', cash_register_entries: 'KASSA hərəkətləri',
  ledger_entries: 'maliyyə əməliyyatları', debt_transactions: 'borc əməliyyatları', debt_accounts: 'borc hesabları',
  stock_movements: 'stok hərəkətləri', walk_in_entries: 'günlük girişlər', profiles: 'istifadəçilər', products: 'məhsullar',
});

function humanizeTechnicalMessage(value, fallback) {
  let text = normalizeString(value);
  if (!text) return fallback;
  Object.entries(TECHNICAL_MESSAGE_LABELS).forEach(([technical, label]) => {
    text = text.replaceAll(technical, label);
  });
  if (/column .* does not exist/i.test(text)) return 'Məlumat strukturu uyğun deyil. Səhifəni yenilə və yenidən yoxla.';
  if (/function .* does not exist|could not find the function|schema cache/i.test(text)) return 'Sistem funksiyası yenilənməyib. Supabase SQL yeniləməsini tətbiq et və yenidən yoxla.';
  if (/duplicate key|already exists/i.test(text)) return 'Bu məlumat artıq mövcuddur.';
  if (/permission denied|row-level security|not authorized/i.test(text)) return 'Bu əməliyyat üçün icazən yoxdur.';
  return text;
}

export function getErrorMessage(error, fallback = 'Əməliyyat zamanı xəta baş verdi.') {
  if (!error) return fallback;
  if (typeof error === 'string') return humanizeTechnicalMessage(error, fallback);
  for (const value of [error.message, error.error_description, error.details, error.hint]) {
    const text = humanizeTechnicalMessage(value, '');
    if (text) return text;
  }
  return fallback;
}

export function asyncHandler(callback, options = {}) {
  return async function wrapped(...args) {
    try {
      return await callback.apply(this, args);
    } catch (error) {
      console.error('[SKy Fit]', error);
      if (options.notifyOnError) notify.error(getErrorMessage(error));
      if (options.rethrow) throw error;
      return null;
    }
  };
}

export function setButtonLoading(button, loading, options = {}) {
  if (!button) return;
  const label = $('.ui-button__label', button);
  const spinner = $('.ui-button__spinner', button);

  if (loading) {
    if (!('originalDisabled' in button.dataset)) {
      button.dataset.originalDisabled = button.disabled ? '1' : '0';
    }
    if (label && !('originalText' in label.dataset)) label.dataset.originalText = label.textContent || '';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (label && options.loadingText) label.textContent = options.loadingText;
    showElement(spinner);
    return;
  }

  button.removeAttribute('aria-busy');
  if ('originalDisabled' in button.dataset) {
    button.disabled = button.dataset.originalDisabled === '1';
    delete button.dataset.originalDisabled;
  }
  if (label && 'originalText' in label.dataset) {
    label.textContent = label.dataset.originalText;
    delete label.dataset.originalText;
  }
  hideElement(spinner);
}

export function isAbsoluteUrl(value) {
  return /^(https?:|data:|blob:)/i.test(normalizeString(value));
}

function safeHttpUrl(value) {
  const target = normalizeString(value);
  if (!/^https?:\/\//i.test(target)) return '';
  try {
    const url = new URL(target);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function getPublicStorageUrl(bucket, path) {
  const normalizedBucket = normalizeString(bucket);
  const normalizedPath = normalizeString(path);
  if (!normalizedBucket || !normalizedPath) return '';
  if (isAbsoluteUrl(normalizedPath)) return normalizedPath;
  const { data } = supabase.storage.from(normalizedBucket).getPublicUrl(normalizedPath);
  return normalizeString(data?.publicUrl);
}

export function setImageFallback(image, fallback = '') {
  if (!image) return () => {};
  const handleError = () => {
    if (fallback && image.dataset.fallbackApplied !== '1') {
      image.dataset.fallbackApplied = '1';
      image.src = fallback;
      return;
    }
    image.hidden = true;
  };
  image.addEventListener('error', handleError);
  return () => image.removeEventListener('error', handleError);
}

export function getProfileName(profile, fallback = 'SKy Fit istifadəçisi') {
  return normalizeString(profile?.full_name) || normalizeString(profile?.email) || fallback;
}

export function getProfileInitials(profile) {
  return initials(getProfileName(profile));
}

export function getProfileEmail(profile) {
  return normalizeString(profile?.email);
}

export function getProfilePhone(profile) {
  return normalizeString(profile?.phone);
}

export function getProfileAddress(profile) {
  return normalizeString(profile?.address);
}

export function getProfileAvatar(profile) {
  const value = normalizeString(profile?.avatar_url);
  if (!value) return '';
  return isAbsoluteUrl(value) ? value : getPublicStorageUrl(APP_CONFIG.storage.avatars, value);
}

export function roleLabel(role) {
  switch (normalizeString(role).toLowerCase()) {
    case CONFIG_USER_ROLES.ADMIN:
      return 'Admin';
    case CONFIG_USER_ROLES.STAFF:
      return 'Əməkdaş';
    case CONFIG_USER_ROLES.MEMBER:
      return 'Üzv';
    default:
      return 'İstifadəçi';
  }
}

export function isAdminProfile(profile) {
  return profile?.role === CONFIG_USER_ROLES.ADMIN;
}

export function isStaffProfile(profile) {
  return [CONFIG_USER_ROLES.ADMIN, CONFIG_USER_ROLES.STAFF].includes(profile?.role);
}

export function isMemberProfile(profile) {
  return profile?.role === CONFIG_USER_ROLES.MEMBER;
}

const identityState = {
  user: null,
  profile: null,
  loaded: false,
  promise: null,
};

export async function fetchCurrentProfile(authUser = null) {
  let user = authUser;
  if (!user) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data?.user || null;
  }
  if (!user) return null;

  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select(`
      id,
      auth_user_id,
      role,
      full_name,
      email,
      phone,
      birth_date,
      address,
      avatar_url,
      is_manual,
      is_active,
      created_at,
      updated_at
    `)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function buildIdentity(user, profile) {
  const role = normalizeString(profile?.role, CONFIG_USER_ROLES.MEMBER);
  return {
    user: user || null,
    profile: profile || null,
    authenticated: Boolean(user),
    profileId: profile?.id || null,
    authUserId: user?.id || null,
    role,
    isAdmin: role === CONFIG_USER_ROLES.ADMIN,
    isStaff: [CONFIG_USER_ROLES.ADMIN, CONFIG_USER_ROLES.STAFF].includes(role),
    isMember: role === CONFIG_USER_ROLES.MEMBER,
    name: getProfileName(profile, normalizeString(user?.email, 'SKy Fit istifadəçisi')),
    email: normalizeString(profile?.email || user?.email),
    avatar: getProfileAvatar(profile),
  };
}

let authRecoveryPromise = null;

async function recoverSessionFromMirror() {
  if (authRecoveryPromise) return authRecoveryPromise;

  authRecoveryPromise = (async () => {
    const raw = readAuthRecoveryStorage();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const candidate = parsed?.currentSession || parsed?.session || parsed;
      const accessToken = candidate?.access_token;
      const refreshToken = candidate?.refresh_token;
      if (!accessToken || !refreshToken) return null;

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.warn('[SKy Fit auth recovery]', error);
        return null;
      }

      return data?.session || null;
    } catch (error) {
      console.warn('[SKy Fit auth recovery parse]', error);
      return null;
    }
  })();

  try {
    return await authRecoveryPromise;
  } finally {
    authRecoveryPromise = null;
  }
}

async function loadCurrentIdentity() {
  let { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  let session = data?.session || null;
  if (!session) {
    session = await recoverSessionFromMirror();
    if (session) {
      data = { session };
    }
  }

  const user = data?.session?.user || null;
  const profile = user ? await fetchCurrentProfile(user) : null;
  identityState.user = user;
  identityState.profile = profile;
  identityState.loaded = true;
  return buildIdentity(user, profile);
}

export async function getCurrentIdentity(options = {}) {
  const force = Boolean(options.force);
  if (identityState.loaded && !force) return buildIdentity(identityState.user, identityState.profile);
  if (identityState.promise && !force) return identityState.promise;

  identityState.promise = loadCurrentIdentity();
  try {
    return await identityState.promise;
  } finally {
    identityState.promise = null;
  }
}

export function clearIdentityCache() {
  identityState.user = null;
  identityState.profile = null;
  identityState.loaded = false;
  identityState.promise = null;
}

export async function requireAuth(options = {}) {
  let identity = await getCurrentIdentity();
  if (identity.authenticated) return identity;

  // Windows/browser refresh yarışına qısa recovery pəncərəsi ver.
  await new Promise(resolve => setTimeout(resolve, 550));
  clearIdentityCache();
  identity = await getCurrentIdentity({ force: true });
  if (identity.authenticated) return identity;

  if (options.redirect !== false) window.location.replace(options.redirectTo || APP_CONFIG.routes.login);
  return null;
}

export async function requireStaff(options = {}) {
  const identity = await requireAuth(options);
  if (!identity) return null;
  if (identity.isStaff) return identity;
  if (options.redirect !== false) window.location.replace(options.redirectTo || APP_CONFIG.routes.home);
  return null;
}

export function productName(product) {
  return normalizeString(product?.name, 'Məhsul');
}

export function productDescription(product) {
  return normalizeString(product?.description);
}

export function productSaleMode(product) {
  return product?.sale_mode === CONFIG_SALE_MODES.PORTION
    ? CONFIG_SALE_MODES.PORTION
    : CONFIG_SALE_MODES.UNIT;
}

export function productPrice(product) {
  if (!product) return 0;
  return productSaleMode(product) === CONFIG_SALE_MODES.PORTION
    ? number(product.portion_price)
    : number(product.retail_price);
}

export function productRetailPrice(product) {
  return number(product?.retail_price);
}

export function productPortionPrice(product) {
  return number(product?.portion_price);
}

export function productCostPrice(product) {
  return number(product?.cost_price);
}

export function productStock(product) {
  return number(product?.stock_quantity);
}

export function productLowStockThreshold(product) {
  return number(product?.low_stock_threshold);
}

export function productPortionSize(product) {
  return number(product?.portion_size, 1);
}

export function productStockUnit(product) {
  return normalizeString(product?.stock_unit, 'ədəd');
}

export function productCategory(product) {
  return normalizeString(product?.category);
}

export function productSku(product) {
  return normalizeString(product?.sku);
}

export function productImage(product) {
  const value = normalizeString(product?.image_url);
  if (!value) return '';
  return isAbsoluteUrl(value) ? value : getPublicStorageUrl(APP_CONFIG.storage.productImages, value);
}

export function productStockState(product) {
  const stock = productStock(product);
  const threshold = productLowStockThreshold(product);
  if (stock <= 0) return { key: 'out', label: 'Stok yoxdur', className: 'ui-badge ui-badge--danger' };
  if (threshold > 0 && stock <= threshold) {
    return { key: 'low', label: 'Az stok', className: 'ui-badge ui-badge--warning' };
  }
  return { key: 'available', label: 'Stokda', className: 'ui-badge ui-badge--success' };
}

export function productUnitLabel(product) {
  if (productSaleMode(product) === CONFIG_SALE_MODES.PORTION) {
    return `${productPortionSize(product)} ${productStockUnit(product)}`;
  }
  return productStockUnit(product);
}

export function trainerName(trainer) {
  return normalizeString(trainer?.full_name, 'Məşqçi');
}

export function trainerSpecialty(trainer) {
  return normalizeString(trainer?.specialty);
}

export function trainerBio(trainer) {
  return normalizeString(trainer?.bio);
}

export function trainerPhone(trainer) {
  return normalizeString(trainer?.phone);
}

export function trainerInstagram(trainer) {
  return safeHttpUrl(trainer?.instagram_url);
}

export function trainerImage(trainer) {
  const value = normalizeString(trainer?.image_url);
  if (!value) return '';
  return isAbsoluteUrl(value) ? value : getPublicStorageUrl(APP_CONFIG.storage.trainerImages, value);
}

export function membershipStatus(membership) {
  return normalizeString(membership?.status, 'unknown').toLowerCase();
}

export function membershipPaymentStatus(membership) {
  return normalizeString(membership?.payment_status, PAYMENT_STATUS.PAID).toLowerCase();
}

export function membershipIsActive(membership) {
  if (!membership || membershipStatus(membership) !== 'active') return false;
  const today = todayIso();
  const start = normalizeString(membership.start_date);
  const end = normalizeString(membership.end_date);
  return (!start || today >= start) && (!end || today <= end);
}

export function membershipDaysRemaining(membership) {
  if (!membership?.end_date) return 0;
  return Math.max(0, daysBetween(new Date(), membership.end_date));
}

export function membershipStatusLabel(membership) {
  const status = membershipStatus(membership);
  if (status === 'active') return 'Aktiv';
  if (status === 'expired') return 'Bitib';
  if (status === 'cancelled') return 'Ləğv edilib';
  return normalizeString(status, 'Naməlum');
}

export function attendanceDate(attendance) {
  return attendance?.checked_in_at || null;
}

export function attendanceType(attendance) {
  return normalizeString(attendance?.attendance_type, 'membership');
}

export function attendanceTypeLabel(attendance) {
  return attendanceType(attendance) === 'daily' ? 'Günlük giriş' : 'Üzvlük';
}

export function attendanceAmount(attendance) {
  return number(attendance?.amount);
}

export function ledgerType(entry) {
  return normalizeString(entry?.entry_type).toLowerCase() === 'expense' ? 'expense' : 'income';
}

export function ledgerAmount(entry) {
  return number(entry?.amount);
}

export function ledgerIsSaleRefund(entry) {
  return normalizeString(entry?.reference_type) === 'sale_reversal';
}

export function ledgerBusinessType(entry) {
  if (ledgerIsSaleRefund(entry)) return 'refund';
  return ledgerType(entry);
}

export function ledgerDate(entry) {
  return entry?.created_at || entry?.entry_date || null;
}

export function ledgerTypeLabel(entry) {
  return ledgerType(entry) === 'expense' ? 'Xərc' : 'Gəlir';
}

export function saleAmount(sale) {
  return number(sale?.total_amount ?? sale?.subtotal);
}

export function salePaymentStatus(sale) {
  return normalizeString(sale?.payment_status, PAYMENT_STATUS.PAID);
}

export function salePaymentMethod(sale) {
  return normalizeString(sale?.payment_method, PAYMENT_METHODS.cash);
}

export function debtBalance(account) {
  return number(account?.balance);
}

export function debtIsOpen(account) {
  return debtBalance(account) > 0;
}

export function debtTransactionAmount(transaction) {
  return number(transaction?.amount);
}

export function operatorProfileId(record) {
  return record?.created_by || record?.actor_profile_id || null;
}

export function updatedByProfileId(record) {
  return record?.updated_by || null;
}

export function operatorShiftId(record) {
  return record?.operator_shift_id || null;
}

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function migrateLegacyStorage() {
  [
    ['skyfit-theme', STORAGE_KEYS.theme],
    ['skyfit-favorites', STORAGE_KEYS.favorites],
  ].forEach(([legacyKey, currentKey]) => {
    if (storageGet(currentKey) !== null) return;
    const value = storageGet(legacyKey);
    if (value !== null) storageSet(currentKey, value);
  });
}

export function getFavoriteIds() {
  const parsed = safeJsonParse(storageGet(STORAGE_KEYS.favorites), []);
  if (!Array.isArray(parsed)) return [];
  return Array.from(new Set(parsed.filter(value => value !== null && value !== undefined).map(String)));
}

export function saveFavoriteIds(ids) {
  const normalized = Array.from(new Set(rows(ids).filter(Boolean).map(String)));
  storageSet(STORAGE_KEYS.favorites, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.favoritesChange, { detail: { ids: normalized } }));
  return normalized;
}

export function isFavorite(productId) {
  if (productId === null || productId === undefined) return false;
  return getFavoriteIds().includes(String(productId));
}

export function addFavorite(productId) {
  if (productId === null || productId === undefined) return getFavoriteIds();
  const ids = getFavoriteIds();
  const id = String(productId);
  if (!ids.includes(id)) ids.push(id);
  return saveFavoriteIds(ids);
}

export function removeFavorite(productId) {
  return saveFavoriteIds(getFavoriteIds().filter(value => value !== String(productId)));
}

export function toggleFavorite(productId) {
  const active = isFavorite(productId);
  active ? removeFavorite(productId) : addFavorite(productId);
  return !active;
}

export function clearFavorites() {
  return saveFavoriteIds([]);
}

export function bindSearchClear({ input, clearButton, onChange }) {
  if (!input || !clearButton) return () => {};

  const sync = () => {
    const value = normalizeString(input.value);
    clearButton.hidden = !value;
    if (typeof onChange === 'function') onChange(value);
  };

  const clear = () => {
    input.value = '';
    input.focus();
    sync();
  };

  input.addEventListener('input', sync);
  clearButton.addEventListener('click', clear);
  sync();

  return () => {
    input.removeEventListener('input', sync);
    clearButton.removeEventListener('click', clear);
  };
}

export function getStoredTheme() {
  const stored = normalizeString(storageGet(STORAGE_KEYS.theme));
  return ['light', 'dark', 'system'].includes(stored) ? stored : APP_CONFIG.defaultTheme;
}

export function resolveTheme(theme = getStoredTheme()) {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme = getStoredTheme(), options = {}) {
  const selected = ['light', 'dark', 'system'].includes(theme) ? theme : APP_CONFIG.defaultTheme;
  const resolved = resolveTheme(selected);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeSource = selected;
  if (options.persist !== false) storageSet(STORAGE_KEYS.theme, selected);
  window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.themeChange, {
    detail: { source: selected, theme: resolved },
  }));
  return resolved;
}

export function cycleTheme() {
  const current = getStoredTheme();
  const next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system';
  applyTheme(next);
  return next;
}

const systemThemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
if (systemThemeQuery) {
  const handleSystemTheme = () => {
    if (getStoredTheme() === 'system') applyTheme('system', { persist: false });
  };
  if (typeof systemThemeQuery.addEventListener === 'function') {
    systemThemeQuery.addEventListener('change', handleSystemTheme);
  } else if (typeof systemThemeQuery.addListener === 'function') {
    systemThemeQuery.addListener(handleSystemTheme);
  }
}

let toastCounter = 0;

function ensureToastRoot() {
  let root = byId('app-toast-root');
  if (!root) {
    root = createElement('div', {
      attrs: { id: 'app-toast-root', 'aria-live': 'polite', 'aria-atomic': 'true' },
    });
    document.body.append(root);
  }

  let stack = $('.toast-stack', root);
  if (!stack) {
    stack = createElement('div', { className: 'toast-stack' });
    root.append(stack);
  }
  return stack;
}

function toastIcon(type) {
  if (type === 'success') {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="m8 12.3 2.6 2.6L16.5 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  if (type === 'warning') {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 21 20H3L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>';
  }
  if (type === 'danger') {
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 10v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7" r="1" fill="currentColor"/></svg>';
}

export function toast(message, options = {}) {
  const stack = ensureToastRoot();
  const type = ['success', 'warning', 'danger', 'info'].includes(options.type) ? options.type : 'info';
  const title = normalizeString(options.title);
  const duration = Math.max(0, number(options.duration, UI_CONFIG.toastDuration));
  const id = `skyfit-toast-${++toastCounter}`;

  const element = createElement('article', {
    className: `ui-toast ui-toast--${type}`,
    attrs: { id, role: type === 'danger' ? 'alert' : 'status' },
  });

  element.innerHTML = `
    <span class="ui-toast__icon">${toastIcon(type)}</span>
    <span class="ui-toast__content">
      ${title ? `<strong class="ui-toast__title">${escapeHtml(title)}</strong>` : ''}
      <span class="ui-toast__message">${escapeHtml(message)}</span>
    </span>
    <button type="button" class="ui-toast__close" aria-label="Bildirişi bağla">×</button>
    ${duration > 0 ? '<span class="ui-toast__progress"><span class="ui-toast__progress-value"></span></span>' : ''}
  `;

  stack.prepend(element);
  let closed = false;
  let closeTimer = null;

  const close = () => {
    if (closed) return;
    closed = true;
    if (closeTimer) clearTimeout(closeTimer);
    element.classList.add('is-leaving');
    setTimeout(() => element.remove(), UI_CONFIG.modalTransitionDuration);
  };

  $('.ui-toast__close', element)?.addEventListener('click', close);

  if (duration > 0) {
    const progress = $('.ui-toast__progress-value', element);
    progress?.animate?.(
      [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
      { duration, easing: 'linear', fill: 'forwards' }
    );
    closeTimer = setTimeout(close, duration);
  }

  return { id, element, close };
}

export const notify = Object.freeze({
  success(message, title = 'Uğurlu') {
    return toast(message, { type: 'success', title });
  },
  warning(message, title = 'Diqqət') {
    return toast(message, { type: 'warning', title });
  },
  error(message, title = 'Xəta') {
    return toast(message, { type: 'danger', title });
  },
  info(message, title = '') {
    return toast(message, { type: 'info', title });
  },
});

let loaderDepth = 0;
let loaderStartedAt = 0;

function ensureLoaderRoot() {
  let root = byId('app-loader-root');
  if (!root) {
    root = createElement('div', { attrs: { id: 'app-loader-root' } });
    document.body.append(root);
  }

  let loader = $('.app-loader', root);
  if (!loader) {
    loader = createElement('div', {
      className: 'app-loader',
      attrs: { role: 'status', 'aria-live': 'polite', 'aria-hidden': 'true' },
    });
    loader.innerHTML = '<div class="app-loader__panel"><span class="app-loader__spinner" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" opacity=".22" stroke="currentColor" stroke-width="2.4"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><span class="app-loader__label">Yüklənir...</span></div>';
    root.append(loader);
  }
  return loader;
}

export function showLoader(label = 'Yüklənir...') {
  loaderDepth += 1;
  const loader = ensureLoaderRoot();
  if (loaderDepth === 1) loaderStartedAt = performance.now();
  setText($('.app-loader__label', loader), label);
  loader.classList.add('is-visible');
  loader.setAttribute('aria-hidden', 'false');
  window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.loaderChange, {
    detail: { visible: true, depth: loaderDepth },
  }));
}

export async function hideLoader(options = {}) {
  loaderDepth = options.force ? 0 : Math.max(0, loaderDepth - 1);
  if (loaderDepth > 0) return;

  const loader = ensureLoaderRoot();
  const minimum = number(options.minimumDuration, UI_CONFIG.loaderMinimumDuration);
  const elapsed = performance.now() - loaderStartedAt;
  if (!options.force && elapsed < minimum) {
    await new Promise(resolve => setTimeout(resolve, minimum - elapsed));
  }

  loader.classList.remove('is-visible');
  loader.setAttribute('aria-hidden', 'true');
  window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.loaderChange, {
    detail: { visible: false, depth: 0 },
  }));
}

export async function withLoader(callback, options = {}) {
  showLoader(options.label || 'Yüklənir...');
  try {
    return await callback();
  } finally {
    await hideLoader(options);
  }
}

let activeModal = null;
let previousFocus = null;

function ensureModalRoot() {
  let root = byId('app-modal-root');
  if (!root) {
    root = createElement('div', { attrs: { id: 'app-modal-root' } });
    document.body.append(root);
  }
  return root;
}

function focusableElements(root) {
  return $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
    .filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function handleModalKeydown(event) {
  if (!activeModal) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeModal();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusables = focusableElements(activeModal.modal);
  if (!focusables.length) {
    event.preventDefault();
    activeModal.modal.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal(options = {}) {
  const root = ensureModalRoot();
  if (activeModal) closeModal({ immediate: true });
  previousFocus = options.trigger || document.activeElement;

  const backdrop = createElement('div', { className: 'app-modal-backdrop' });
  const modal = createElement('section', {
    className: `app-modal ${normalizeString(options.className)}`.trim(),
    attrs: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': normalizeString(options.title, 'Pəncərə'),
      tabindex: '-1',
    },
  });

  modal.innerHTML = `
    <div class="app-modal__handle" aria-hidden="true"></div>
    <header class="app-modal__header">
      <div class="app-modal__heading">
        ${options.eyebrow ? `<span class="app-modal__eyebrow">${escapeHtml(options.eyebrow)}</span>` : ''}
        <h2 class="app-modal__title">${escapeHtml(options.title || '')}</h2>
      </div>
      <button type="button" class="app-modal__close" data-modal-close aria-label="Bağla">×</button>
    </header>
    <div class="app-modal__body"></div>
    ${options.footer ? '<footer class="app-modal__footer"></footer>' : ''}
  `;

  const body = $('.app-modal__body', modal);
  const footer = $('.app-modal__footer', modal);
  if (options.content instanceof Node) body?.append(options.content);
  else if (body && options.content !== undefined) body.innerHTML = String(options.content || '');
  if (footer) {
    if (options.footer instanceof Node) footer.append(options.footer);
    else footer.innerHTML = String(options.footer || '');
  }

  backdrop.append(modal);
  root.append(backdrop);

  const cleanup = () => {
    document.removeEventListener('keydown', handleModalKeydown);
    document.body.classList.remove('is-scroll-locked');
    if (typeof options.onClose === 'function') options.onClose();
    previousFocus?.focus?.();
    previousFocus = null;
    activeModal = null;
    window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.modalClose));
  };

  activeModal = {
    backdrop,
    modal,
    body,
    footer,
    cleanup,
    closeOnBackdrop: options.closeOnBackdrop !== false,
  };

  const closeButton = $('.app-modal__close', modal);
  const requestModalClose = event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (activeModal?.modal === modal) {
      closeModal();
      return;
    }

    backdrop.remove();
    document.body.classList.remove('is-scroll-locked');
  };

  closeButton?.addEventListener('click', requestModalClose, { capture: true });
  modal.addEventListener('click', event => {
    if (event.target.closest('[data-modal-close]')) requestModalClose(event);
  });
  backdrop.addEventListener('click', event => {
    if (event.target === backdrop && activeModal?.closeOnBackdrop) closeModal();
  });
  document.addEventListener('keydown', handleModalKeydown);
  document.body.classList.add('is-scroll-locked');

  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    const first = focusableElements(modal)[0];
    (first || modal).focus();
  });

  if (typeof options.onOpen === 'function') options.onOpen({ modal, backdrop, body, footer });
  window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.modalOpen));
  return { modal, backdrop, body, footer, close: () => closeModal() };
}

export function closeModal(options = {}) {
  if (!activeModal) return;
  const current = activeModal;
  activeModal = null;

  const finish = () => {
    current.backdrop.remove();
    current.cleanup();
  };

  if (options.immediate) {
    finish();
    return;
  }

  current.backdrop.classList.remove('is-open');
  setTimeout(finish, UI_CONFIG.modalTransitionDuration);
}

export function getActiveModal() {
  return activeModal;
}

export function confirmDialog(options = {}) {
  return new Promise(resolve => {
    let settled = false;
    const content = createElement('div', { className: 'modal-confirm' });
    content.innerHTML = `<p class="modal-confirm__message">${escapeHtml(options.message || '')}</p>`;

    const footer = createElement('div', { className: 'modal-form__actions' });
    const cancel = createElement('button', {
      className: 'ui-button ui-button--glass',
      text: options.cancelText || 'Ləğv et',
      attrs: { type: 'button' },
    });
    const confirm = createElement('button', {
      className: options.danger ? 'ui-button ui-button--danger' : 'ui-button ui-button--primary',
      text: options.confirmText || 'Təsdiq et',
      attrs: { type: 'button' },
    });
    footer.append(cancel, confirm);

    const settle = value => {
      if (settled) return;
      settled = true;
      resolve(value);
      closeModal();
    };

    openModal({
      eyebrow: options.eyebrow,
      title: options.title || 'Təsdiq',
      content,
      footer,
      closeOnBackdrop: options.closeOnBackdrop !== false,
      onOpen: () => {
        cancel.addEventListener('click', () => settle(false), { once: true });
        confirm.addEventListener('click', () => settle(true), { once: true });
      },
      onClose: () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      },
    });
  });
}

export function getFormValues(form) {
  return form ? Object.fromEntries(new FormData(form).entries()) : {};
}

export function setFieldError(input, errorElement, message = '') {
  if (!input) return;
  const field = input.closest('.ui-field') || input.closest('.ui-input');
  if (message) {
    field?.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    if (errorElement) {
      errorElement.textContent = message;
      showElement(errorElement);
    }
    return;
  }

  field?.classList.remove('has-error');
  input.removeAttribute('aria-invalid');
  if (errorElement) {
    errorElement.textContent = '';
    hideElement(errorElement);
  }
}

export function clearFormErrors(form) {
  if (!form) return;
  $$('.has-error', form).forEach(element => element.classList.remove('has-error'));
  $$('[aria-invalid="true"]', form).forEach(element => element.removeAttribute('aria-invalid'));
  $$('.ui-field__error', form).forEach(element => {
    element.textContent = '';
    hideElement(element);
  });
}

export function validateEmail(email) {
  const value = normalizeString(email);
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export function validatePhone(phone) {
  const value = normalizeString(phone).replace(/[\s()-]/g, '');
  return !value || /^\+?[0-9]{9,15}$/.test(value);
}

export function validatePassword(password, options = {}) {
  const minLength = Math.max(6, number(options.minLength, 6));
  return typeof password === 'string' && password.length >= minLength;
}

export function bindPasswordToggle(button, input) {
  if (!button || !input) return () => {};
  const toggle = () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', show ? 'Şifrəni gizlət' : 'Şifrəni göstər');
    $('.password-icon--show', button)?.classList.toggle('is-hidden', show);
    $('.password-icon--hide', button)?.classList.toggle('is-hidden', !show);
  };
  button.addEventListener('click', toggle);
  return () => button.removeEventListener('click', toggle);
}

function bindCardKeyboard(card) {
  const handler = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    card.click();
  };
  card.addEventListener('keydown', handler);
}

export function createProductCard(product, options = {}) {
  const name = productName(product);
  const price = productPrice(product);
  const image = productImage(product);
  const favoriteActive = isFavorite(product?.id);

  const card = createElement('article', {
    className: 'product-card',
    dataset: { productId: product?.id || '' },
    attrs: { tabindex: '0', role: 'button', 'aria-label': `${name} haqqında ətraflı` },
  });

  card.innerHTML = `
    <div class="product-card__media">
      ${image
        ? `<img class="product-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
        : '<div class="product-card__image-fallback">SK</div>'}
      ${options.showFavorite !== false
        ? `<button type="button" class="product-card__favorite ${favoriteActive ? 'is-active' : ''}" aria-pressed="${favoriteActive}" aria-label="${favoriteActive ? 'Sevimlilərdən çıxar' : 'Sevimlilərə əlavə et'}">
            <svg viewBox="0 0 24 24" fill="${favoriteActive ? 'currentColor' : 'none'}" aria-hidden="true"><path d="M12 20.2 4.9 13.6C1 10 3.3 4.5 7.7 4.5c1.8 0 3.3 1 4.3 2.3 1-1.3 2.5-2.3 4.3-2.3 4.4 0 6.7 5.5 2.8 9.1L12 20.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
          </button>`
        : ''}
    </div>
    <div class="product-card__body">
      <strong class="product-card__name">${escapeHtml(name)}</strong>
      <div class="product-card__meta product-card__meta--price-only">
        <span class="product-card__price">${escapeHtml(money(price))}</span>
      </div>
    </div>
  `;

  setImageFallback($('.product-card__image', card));
  const favoriteButton = $('.product-card__favorite', card);
  favoriteButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const active = toggleFavorite(product?.id);
    favoriteButton.classList.toggle('is-active', active);
    favoriteButton.setAttribute('aria-pressed', String(active));
    favoriteButton.setAttribute('aria-label', active ? 'Sevimlilərdən çıxar' : 'Sevimlilərə əlavə et');
    $('svg', favoriteButton)?.setAttribute('fill', active ? 'currentColor' : 'none');
    if (typeof options.onFavoriteChange === 'function') options.onFavoriteChange(product, active);
  });

  card.addEventListener('click', () => {
    if (typeof options.onOpen === 'function') {
      options.onOpen(product, card);
      return;
    }
    openProductModal(product, { trigger: card });
  });
  bindCardKeyboard(card);
  return card;
}

export function createTrainerCard(trainer, options = {}) {
  const name = trainerName(trainer);
  const specialty = trainerSpecialty(trainer);
  const image = trainerImage(trainer);
  const card = createElement('article', {
    className: 'trainer-card',
    dataset: { trainerId: trainer?.id || '' },
    attrs: { tabindex: '0', role: 'button', 'aria-label': `${name} haqqında ətraflı` },
  });

  card.innerHTML = `
    <div class="trainer-card__media">
      ${image
        ? `<img class="trainer-card__image" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async">`
        : `<div class="trainer-card__image-fallback">${escapeHtml(initials(name))}</div>`}
      <div class="trainer-card__content">
        <strong class="trainer-card__name">${escapeHtml(name)}</strong>
        ${specialty ? `<span class="trainer-card__specialty">${escapeHtml(specialty)}</span>` : ''}
        <span class="trainer-card__action">Ətraflı</span>
      </div>
    </div>
  `;

  setImageFallback($('.trainer-card__image', card));
  card.addEventListener('click', () => {
    if (typeof options.onOpen === 'function') {
      options.onOpen(trainer, card);
      return;
    }
    openTrainerModal(trainer, { trigger: card });
  });
  bindCardKeyboard(card);
  return card;
}

export function openProductModal(product, options = {}) {
  const name = productName(product);
  const image = productImage(product);
  const description = productDescription(product);
  const price = productPrice(product);

  const content = createElement('div', {
    className: 'product-modal',
  });

  content.innerHTML = `
    <div class="product-modal__media">
      ${
        image
          ? `
            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(name)}"
            >
          `
          : `
            <span class="product-modal__fallback">
              SK
            </span>
          `
      }
    </div>

    <div class="product-modal__content">
      <h3 class="product-modal__name">
        ${escapeHtml(name)}
      </h3>

      ${
        description
          ? `
            <p class="product-modal__description">
              ${escapeHtml(description)}
            </p>
          `
          : ''
      }

      <div class="product-modal__purchase">
        <strong class="product-modal__price">
          ${escapeHtml(money(price))}
        </strong>


      </div>
    </div>
  `;

  setImageFallback(
    $('img', content)
  );

  return openModal({
    eyebrow: 'SKy Fit Shop',
    title: name,
    content,
    trigger: options.trigger,
  });
}

export function openTrainerModal(trainer, options = {}) {
  const name = trainerName(trainer);
  const specialty = trainerSpecialty(trainer);
  const bio = trainerBio(trainer);
  const image = trainerImage(trainer);
  const phone = trainerPhone(trainer);
  const instagram = trainerInstagram(trainer);
  const whatsappPhone = normalizeString(phone).replace(/\D/g, '');
  const content = createElement('div', { className: 'trainer-modal' });

  content.innerHTML = `
    ${image ? `<div class="trainer-modal__media"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}"></div>` : ''}
    <div class="trainer-modal__content">
      <h3 class="trainer-modal__name">${escapeHtml(name)}</h3>
      ${specialty ? `<span class="trainer-modal__specialty">${escapeHtml(specialty)}</span>` : ''}
      ${bio ? `<p class="trainer-modal__description">${escapeHtml(bio)}</p>` : ''}
      ${phone || instagram
        ? `<div class="trainer-modal__links">
            ${phone ? `<a href="tel:${escapeHtml(phone)}" class="ui-button ui-button--glass"><span class="ui-button__label">Zəng et</span></a>` : ''}
            ${whatsappPhone ? `<a href="https://wa.me/${escapeHtml(whatsappPhone)}" target="_blank" rel="noopener noreferrer" class="ui-button ui-button--glass trainer-whatsapp-button" aria-label="WhatsApp ilə yaz"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.3 14.7L2.3 22l5.4-1.4A9.8 9.8 0 1 0 12 2Zm0 17.6a7.5 7.5 0 0 1-3.8-1l-.3-.2-3.2.8.9-3.1-.2-.3A7.5 7.5 0 1 1 12 19.6Zm4.1-5.6c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a6 6 0 0 1-1.8-1.1 6.7 6.7 0 0 1-1.2-1.5c-.1-.2 0-.4.1-.5l.4-.5.2-.4c.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.3-.5 1.5-1.1.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3Z"/></svg><span class="ui-button__label">WhatsApp</span></a>` : ''}
            ${instagram ? `<a href="${escapeHtml(instagram)}" target="_blank" rel="noopener noreferrer" class="ui-button ui-button--glass"><span class="ui-button__label">Instagram</span></a>` : ''}
          </div>`
        : ''}
    </div>
  `;

  setImageFallback($('img', content));
  return openModal({ eyebrow: 'SKy Fit Komandası', title: name, content, trigger: options.trigger });
}

let authListenerStarted = false;
let authSubscription = null;

export function startAuthListener() {
  if (authListenerStarted) return authSubscription;
  authListenerStarted = true;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    clearIdentityCache();

    // SIGNED_OUT hadisəsini dərhal redirect kimi qəbul etmirik. Bəzi
    // Windows sistemlərində auto-refresh zamanı qısa false-negative olur.
    const delay = event === 'SIGNED_OUT' ? 900 : 0;

    setTimeout(async () => {
      let identity = null;
      let effectiveEvent = event;
      let effectiveSession = session;

      try {
        identity = await getCurrentIdentity({ force: true });
        if (event === 'SIGNED_OUT' && identity?.authenticated) {
          const { data: sessionData } = await supabase.auth.getSession();
          effectiveEvent = 'SESSION_RECOVERED';
          effectiveSession = sessionData?.session || null;
        }
      } catch (error) {
        console.error('[SKy Fit auth]', error);
      }

      window.dispatchEvent(new CustomEvent(SKYFIT_EVENTS.authChange, {
        detail: { event: effectiveEvent, session: effectiveSession, identity },
      }));
    }, delay);
  });

  authSubscription = data?.subscription || null;
  return authSubscription;
}

export async function signOut(options = {}) {
  clearAuthRecoveryStorage();
  const { error } = await supabase.auth.signOut();
  if (error) {
    if (options.notify !== false) notify.error(getErrorMessage(error, 'Çıxış zamanı xəta baş verdi.'));
    return false;
  }
  clearIdentityCache();
  if (options.redirect !== false) window.location.replace(options.redirectTo || APP_CONFIG.routes.login);
  return true;
}

export async function openExternal(url) {
  const target = safeHttpUrl(url);
  if (!target) return false;
  if (window.skyFitDesktop?.isDesktop && typeof window.skyFitDesktop.openExternal === 'function') {
    return Boolean(await window.skyFitDesktop.openExternal(target));
  }
  const opened = window.open(target, '_blank', 'noopener,noreferrer');
  return Boolean(opened);
}

export async function registerServiceWorker() {
  if (
    !('serviceWorker' in navigator) ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'skyfit:'
  ) return null;
  try {
    return await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
  } catch (error) {
    console.error('[SKy Fit SW]', error);
    return null;
  }
}

export function bootstrapCore() {
  migrateLegacyStorage();
  applyTheme(getStoredTheme(), { persist: false });
  startAuthListener();
  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', () => registerServiceWorker(), { once: true });
}

export function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }
  callback();
}

bootstrapCore();

export const FAVORITES_EVENT = SKYFIT_EVENTS.favoritesChange;

export function getFavoriteCount() {
  return getFavoriteIds().length;
}