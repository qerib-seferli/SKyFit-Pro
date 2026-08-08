// ============================================================
// SKY FIT PRO
// Shared Core Utilities & UI Engine
// File: js/core.js
// ============================================================

import {
  supabase,
  APP_CONFIG,
  UI_CONFIG,
  STORAGE_KEYS,
  TABLES,
  USER_ROLES,
} from './config.js';


// ============================================================
// 01. DOM HELPERS
// ============================================================

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function byId(id) {
  return document.getElementById(id);
}

export function createElement(
  tag,
  {
    className = '',
    text = '',
    html = '',
    attrs = {},
    dataset = {},
  } = {}
) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== '') {
    element.textContent = text;
  }

  if (html !== '') {
    element.innerHTML = html;
  }

  Object.entries(attrs).forEach(
    ([key, value]) => {
      if (
        value !== null &&
        value !== undefined
      ) {
        element.setAttribute(
          key,
          String(value)
        );
      }
    }
  );

  Object.entries(dataset).forEach(
    ([key, value]) => {
      if (
        value !== null &&
        value !== undefined
      ) {
        element.dataset[key] =
          String(value);
      }
    }
  );

  return element;
}


export function clearElement(element) {
  if (!element) return;

  while (element.firstChild) {
    element.removeChild(
      element.firstChild
    );
  }
}


export function showElement(element) {
  if (!element) return;

  element.classList.remove(
    'is-hidden'
  );
}


export function hideElement(element) {
  if (!element) return;

  element.classList.add(
    'is-hidden'
  );
}


export function toggleElement(
  element,
  visible
) {
  if (!element) return;

  element.classList.toggle(
    'is-hidden',
    !visible
  );
}


export function setText(
  target,
  value,
  fallback = '—'
) {
  const element =
    typeof target === 'string'
      ? $(target)
      : target;

  if (!element) return;

  const normalized =
    value === null ||
    value === undefined ||
    value === ''
      ? fallback
      : String(value);

  element.textContent = normalized;
}


// ============================================================
// 02. SAFE VALUES
// ============================================================

export function normalizeString(
  value,
  fallback = ''
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return String(value).trim();
}


export function normalizeNumber(
  value,
  fallback = 0
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


export function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}


export function escapeHtml(value) {
  return normalizeString(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


// ============================================================
// 03. DATE / NUMBER FORMATTERS
// ============================================================

const currencyFormatter =
  new Intl.NumberFormat(
    APP_CONFIG.locale,
    {
      style: 'currency',
      currency: APP_CONFIG.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );


const numberFormatter =
  new Intl.NumberFormat(
    APP_CONFIG.locale,
    {
      maximumFractionDigits: 2,
    }
  );


const dateFormatter =
  new Intl.DateTimeFormat(
    APP_CONFIG.locale,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );


const dateTimeFormatter =
  new Intl.DateTimeFormat(
    APP_CONFIG.locale,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );


const timeFormatter =
  new Intl.DateTimeFormat(
    APP_CONFIG.locale,
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );


export function money(value) {
  return currencyFormatter.format(
    normalizeNumber(value)
  );
}


export function number(value) {
  return numberFormatter.format(
    normalizeNumber(value)
  );
}


export function formatDate(value) {
  const date = toDate(value);

  if (!date) return '—';

  return dateFormatter.format(date);
}


export function formatDateTime(value) {
  const date = toDate(value);

  if (!date) return '—';

  return dateTimeFormatter.format(
    date
  );
}


export function formatTime(value) {
  const date = toDate(value);

  if (!date) return '—';

  return timeFormatter.format(date);
}


export function toDate(value) {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


export function daysBetween(
  start,
  end
) {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (
    !startDate ||
    !endDate
  ) {
    return 0;
  }

  const diff =
    endDate.getTime() -
    startDate.getTime();

  return Math.ceil(
    diff / 86400000
  );
}


export function daysLeft(endDate) {
  const end = toDate(endDate);

  if (!end) return 0;

  const now = new Date();

  now.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      end.getTime() -
      now.getTime()
    ) / 86400000
  );
}


// ============================================================
// 04. ASYNC HELPERS
// ============================================================

export function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );
}


export function debounce(
  callback,
  delay = UI_CONFIG.debounceDelay
) {
  let timeoutId = null;

  return function debounced(
    ...args
  ) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(
      () => {
        callback.apply(
          this,
          args
        );
      },
      delay
    );
  };
}


export function throttle(
  callback,
  delay = 180
) {
  let locked = false;

  return function throttled(
    ...args
  ) {
    if (locked) return;

    locked = true;

    callback.apply(
      this,
      args
    );

    setTimeout(
      () => {
        locked = false;
      },
      delay
    );
  };
}


// ============================================================
// 05. LOCAL STORAGE
// ============================================================

export function storageGet(
  key,
  fallback = null
) {
  try {
    const raw =
      localStorage.getItem(key);

    if (raw === null) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}


export function storageSet(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch {
    return false;
  }
}


export function storageRemove(key) {
  try {
    localStorage.removeItem(key);

    return true;
  } catch {
    return false;
  }
}


// ============================================================
// 06. THEME ENGINE
// ============================================================

const THEME_VALUES = new Set([
  'light',
  'dark',
  'system',
]);


export function getStoredTheme() {
  const stored = storageGet(
    STORAGE_KEYS.theme,
    APP_CONFIG.defaultTheme
  );

  return THEME_VALUES.has(stored)
    ? stored
    : APP_CONFIG.defaultTheme;
}


export function getSystemTheme() {
  return window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
    ? 'dark'
    : 'light';
}


export function getResolvedTheme() {
  const theme =
    getStoredTheme();

  return theme === 'system'
    ? getSystemTheme()
    : theme;
}


export function applyTheme(
  requestedTheme =
    getStoredTheme()
) {
  const theme =
    THEME_VALUES.has(requestedTheme)
      ? requestedTheme
      : 'system';

  const resolved =
    theme === 'system'
      ? getSystemTheme()
      : theme;

  document.documentElement.dataset.theme =
    resolved;

  document.documentElement.dataset.themePreference =
    theme;

  updateThemeColor(resolved);

  return {
    preference: theme,
    resolved,
  };
}


export function setTheme(theme) {
  if (
    !THEME_VALUES.has(theme)
  ) {
    return false;
  }

  storageSet(
    STORAGE_KEYS.theme,
    theme
  );

  applyTheme(theme);

  window.dispatchEvent(
    new CustomEvent(
      'skyfit:themechange',
      {
        detail: {
          preference: theme,
          resolved:
            getResolvedTheme(),
        },
      }
    )
  );

  return true;
}


export function cycleTheme() {
  const current =
    getStoredTheme();

  const next =
    current === 'system'
      ? 'dark'
      : current === 'dark'
        ? 'light'
        : 'system';

  setTheme(next);

  return next;
}


function updateThemeColor(theme) {
  const meta = document.querySelector(
    'meta[name="theme-color"]'
  );

  if (!meta) return;

  meta.setAttribute(
    'content',
    theme === 'light'
      ? '#f3f5f8'
      : '#090b10'
  );
}


const systemThemeMedia =
  window.matchMedia(
    '(prefers-color-scheme: dark)'
  );


systemThemeMedia.addEventListener(
  'change',
  () => {
    if (
      getStoredTheme() ===
      'system'
    ) {
      applyTheme('system');
    }
  }
);


applyTheme();


// ============================================================
// 07. TOAST ENGINE
// ============================================================

let toastSequence = 0;


function ensureToastStack() {
  const root =
    byId('app-toast-root');

  if (!root) return null;

  let stack =
    $('.toast-stack', root);

  if (!stack) {
    stack = createElement(
      'div',
      {
        className:
          'toast-stack',
      }
    );

    root.append(stack);
  }

  return stack;
}


function toastIcon(type) {
  switch (type) {
    case 'success':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path
            d="m8 12.3 2.6 2.6L16.5 9"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `;

    case 'warning':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 3 21 20H3L12 3Z"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
          />
          <path
            d="M12 9v5"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <circle
            cx="12"
            cy="17"
            r="1"
            fill="currentColor"
          />
        </svg>
      `;

    case 'danger':
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path
            d="m9 9 6 6M15 9l-6 6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      `;

    default:
      return `
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-width="1.7"
          />
          <path
            d="M12 10v6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <circle
            cx="12"
            cy="7"
            r="1"
            fill="currentColor"
          />
        </svg>
      `;
  }
}


export function toast(
  message,
  {
    title = '',
    type = 'info',
    duration =
      UI_CONFIG.toastDuration,
  } = {}
) {
  const stack =
    ensureToastStack();

  if (!stack) return null;

  const id =
    `skyfit-toast-${++toastSequence}`;

  const element =
    createElement(
      'article',
      {
        className:
          `ui-toast ui-toast--${type}`,
        attrs: {
          id,
          role:
            type === 'danger'
              ? 'alert'
              : 'status',
        },
      }
    );

  element.innerHTML = `
    <span class="ui-toast__icon">
      ${toastIcon(type)}
    </span>

    <div class="ui-toast__content">
      ${
        title
          ? `
            <strong class="ui-toast__title">
              ${escapeHtml(title)}
            </strong>
          `
          : ''
      }

      <span class="ui-toast__message">
        ${escapeHtml(message)}
      </span>
    </div>

    <button
      type="button"
      class="ui-toast__close"
      aria-label="Bildirişi bağla"
    >
      ×
    </button>

    <span class="ui-toast__progress">
      <span
        class="ui-toast__progress-value"
      ></span>
    </span>
  `;

  const closeButton =
    $('.ui-toast__close', element);

  const progress =
    $('.ui-toast__progress-value', element);

  stack.prepend(element);

  const close = () => {
    if (
      element.classList.contains(
        'is-leaving'
      )
    ) {
      return;
    }

    element.classList.add(
      'is-leaving'
    );

    setTimeout(
      () => {
        element.remove();
      },
      250
    );
  };

  closeButton?.addEventListener(
    'click',
    close
  );

  if (duration > 0) {
    progress.style.transition =
      `transform ${duration}ms linear`;

    requestAnimationFrame(
      () => {
        requestAnimationFrame(
          () => {
            progress.style.transform =
              'scaleX(0)';
          }
        );
      }
    );

    setTimeout(
      close,
      duration
    );
  }

  return {
    id,
    element,
    close,
  };
}


export const notify = Object.freeze({
  success(
    message,
    title = 'Uğurlu'
  ) {
    return toast(
      message,
      {
        type: 'success',
        title,
      }
    );
  },

  warning(
    message,
    title = 'Diqqət'
  ) {
    return toast(
      message,
      {
        type: 'warning',
        title,
      }
    );
  },

  error(
    message,
    title = 'Xəta'
  ) {
    return toast(
      message,
      {
        type: 'danger',
        title,
      }
    );
  },

  info(
    message,
    title = ''
  ) {
    return toast(
      message,
      {
        type: 'info',
        title,
      }
    );
  },
});


// ============================================================
// 08. LOADER ENGINE
// ============================================================

let loaderDepth = 0;
let loaderStartedAt = 0;


function ensureLoader() {
  const root =
    byId('app-loader-root');

  if (!root) return null;

  let loader =
    $('.app-loader', root);

  if (!loader) {
    loader =
      createElement(
        'div',
        {
          className:
            'app-loader',
          attrs: {
            role: 'status',
            'aria-live':
              'polite',
            'aria-label':
              'Yüklənir',
          },
        }
      );

    loader.innerHTML = `
      <div class="app-loader__panel">
        <span
          class="app-loader__spinner"
          aria-hidden="true"
        ></span>

        <span class="app-loader__label">
          Yüklənir
        </span>
      </div>
    `;

    root.append(loader);
  }

  return loader;
}


export function showLoader(
  label = 'Yüklənir'
) {
  loaderDepth += 1;

  const loader =
    ensureLoader();

  if (!loader) return;

  const labelElement =
    $('.app-loader__label', loader);

  if (labelElement) {
    labelElement.textContent =
      label;
  }

  loaderStartedAt =
    performance.now();

  loader.classList.add(
    'is-visible'
  );
}


export async function hideLoader({
  force = false,
} = {}) {
  if (force) {
    loaderDepth = 0;
  } else {
    loaderDepth =
      Math.max(
        0,
        loaderDepth - 1
      );
  }

  if (loaderDepth > 0) {
    return;
  }

  const loader =
    ensureLoader();

  if (!loader) return;

  const elapsed =
    performance.now() -
    loaderStartedAt;

  const minimum =
    UI_CONFIG.loaderMinimumDuration;

  if (
    !force &&
    elapsed < minimum
  ) {
    await sleep(
      minimum - elapsed
    );
  }

  loader.classList.remove(
    'is-visible'
  );
}


export async function withLoader(
  callback,
  {
    label = 'Yüklənir',
  } = {}
) {
  showLoader(label);

  try {
    return await callback();
  } finally {
    await hideLoader();
  }
}


// ============================================================
// 09. MODAL ENGINE
// ============================================================

let activeModal = null;
let lastModalTrigger = null;


function ensureModalRoot() {
  return byId(
    'app-modal-root'
  );
}


function closeOnEscape(event) {
  if (
    event.key === 'Escape' &&
    activeModal
  ) {
    closeModal();
  }
}


export function openModal({
  title = '',
  eyebrow = '',
  content = '',
  footer = '',
  className = '',
  trigger = null,
  closeOnBackdrop = true,
  onOpen = null,
  onClose = null,
} = {}) {
  const root =
    ensureModalRoot();

  if (!root) return null;

  if (activeModal) {
    closeModal({
      immediate: true,
    });
  }

  lastModalTrigger =
    trigger ||
    document.activeElement;

  const backdrop =
    createElement(
      'div',
      {
        className:
          'app-modal-backdrop',
      }
    );

  const modal =
    createElement(
      'section',
      {
        className:
          `app-modal ${className}`.trim(),
        attrs: {
          role: 'dialog',
          'aria-modal':
            'true',
          'aria-label':
            title ||
            'Pəncərə',
        },
      }
    );

  modal.innerHTML = `
    <div
      class="app-modal__handle"
      aria-hidden="true"
    ></div>

    <header class="app-modal__header">
      <div class="app-modal__heading">
        ${
          eyebrow
            ? `
              <span class="app-modal__eyebrow">
                ${escapeHtml(eyebrow)}
              </span>
            `
            : ''
        }

        <h2 class="app-modal__title">
          ${escapeHtml(title)}
        </h2>
      </div>

      <button
        type="button"
        class="app-modal__close"
        aria-label="Bağla"
      >
        ×
      </button>
    </header>

    <div class="app-modal__body"></div>

    ${
      footer
        ? `
          <footer class="app-modal__footer"></footer>
        `
        : ''
    }
  `;

  const body =
    $('.app-modal__body', modal);

  const footerElement =
    $('.app-modal__footer', modal);

  if (
    content instanceof Node
  ) {
    body.append(content);
  } else {
    body.innerHTML =
      content;
  }

  if (footerElement) {
    if (
      footer instanceof Node
    ) {
      footerElement.append(
        footer
      );
    } else {
      footerElement.innerHTML =
        footer;
    }
  }

  backdrop.append(modal);
  root.append(backdrop);

  const closeButton =
    $('.app-modal__close', modal);

  const cleanup = () => {
    document.removeEventListener(
      'keydown',
      closeOnEscape
    );

    document.body.classList.remove(
      'is-scroll-locked'
    );

    if (
      typeof onClose ===
      'function'
    ) {
      onClose();
    }

    if (
      lastModalTrigger &&
      typeof lastModalTrigger.focus ===
        'function'
    ) {
      lastModalTrigger.focus();
    }

    activeModal = null;
    lastModalTrigger = null;
  };

  activeModal = {
    backdrop,
    modal,
    cleanup,
  };

  closeButton?.addEventListener(
    'click',
    () => closeModal()
  );

  backdrop.addEventListener(
    'click',
    event => {
      if (
        closeOnBackdrop &&
        event.target === backdrop
      ) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    'keydown',
    closeOnEscape
  );

  document.body.classList.add(
    'is-scroll-locked'
  );

  requestAnimationFrame(
    () => {
      backdrop.classList.add(
        'is-open'
      );

      closeButton?.focus();
    }
  );

  if (
    typeof onOpen ===
    'function'
  ) {
    onOpen({
      modal,
      backdrop,
      body,
      footer:
        footerElement,
    });
  }

  return {
    modal,
    backdrop,
    body,
    footer:
      footerElement,

    close:
      () => closeModal(),
  };
}


export function closeModal({
  immediate = false,
} = {}) {
  if (!activeModal) return;

  const {
    backdrop,
    cleanup,
  } = activeModal;

  if (immediate) {
    backdrop.remove();
    cleanup();
    return;
  }

  backdrop.classList.remove(
    'is-open'
  );

  setTimeout(
    () => {
      backdrop.remove();
      cleanup();
    },
    UI_CONFIG.modalTransitionDuration
  );
}


export function getActiveModal() {
  return activeModal;
}


// ============================================================
// 10. CONFIRM DIALOG
// Browser confirm() əvəzinə vahid modal.
// ============================================================

export function confirmDialog({
  title = 'Təsdiq',
  message = '',
  eyebrow = '',
  confirmText = 'Təsdiq et',
  cancelText = 'Ləğv et',
  danger = false,
} = {}) {
  return new Promise(
    resolve => {
      const content =
        createElement(
          'div',
          {
            className:
              'modal-form',
          }
        );

      const paragraph =
        createElement(
          'p',
          {
            text: message,
            attrs: {
              style:
                'color:var(--text-muted);font-size:11px;line-height:1.6;',
            },
          }
        );

      content.append(paragraph);

      const footer =
        createElement(
          'div',
          {
            className:
              'modal-form__actions',
          }
        );

      const cancelButton =
        createElement(
          'button',
          {
            className:
              'ui-button ui-button--glass',
            text: cancelText,
            attrs: {
              type: 'button',
            },
          }
        );

      const confirmButton =
        createElement(
          'button',
          {
            className:
              danger
                ? 'ui-button ui-button--danger'
                : 'ui-button ui-button--primary',
            text: confirmText,
            attrs: {
              type: 'button',
            },
          }
        );

      footer.append(
        cancelButton,
        confirmButton
      );

      let settled = false;

      const settle = value => {
        if (settled) return;

        settled = true;
        resolve(value);
        closeModal();
      };

      openModal({
        title,
        eyebrow,
        content,
        footer,
        closeOnBackdrop: true,

        onOpen: () => {
          cancelButton.addEventListener(
            'click',
            () => {
              settle(false);
            }
          );

          confirmButton.addEventListener(
            'click',
            () => {
              settle(true);
            }
          );
        },

        onClose: () => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        },
      });
    }
  );
}


// ============================================================
// 11. AUTH / SESSION HELPERS
// ============================================================

export async function getSession() {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      'SKy Fit session error:',
      error
    );

    return null;
  }

  return data.session;
}


export async function getUser() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}


export async function getCurrentProfile() {
  const user =
    await getUser();

  if (!user) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(TABLES.profiles)
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

  if (error) {
    console.error(
      'SKy Fit profile error:',
      error
    );

    return null;
  }

  return data;
}


export async function getCurrentIdentity() {
  const user =
    await getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isAdmin: false,
      isStaff: false,
    };
  }

  const profile =
    await getCurrentProfile();

  const role =
    profile?.role || null;

  return {
    user,
    profile,
    role,

    isAuthenticated: true,

    isAdmin:
      role ===
      USER_ROLES.ADMIN,

    isStaff:
      role ===
        USER_ROLES.ADMIN ||
      role ===
        USER_ROLES.STAFF,
  };
}


export async function requireAuth({
  redirectTo =
    APP_CONFIG.routes.login,
} = {}) {
  const session =
    await getSession();

  if (!session) {
    window.location.replace(
      redirectTo
    );

    return null;
  }

  return session;
}


export async function requireStaff({
  redirectTo =
    APP_CONFIG.routes.home,
} = {}) {
  const identity =
    await getCurrentIdentity();

  if (
    !identity.isAuthenticated
  ) {
    window.location.replace(
      APP_CONFIG.routes.login
    );

    return null;
  }

  if (!identity.isStaff) {
    notify.error(
      'Bu bölməyə giriş icazən yoxdur.'
    );

    setTimeout(
      () => {
        window.location.replace(
          redirectTo
        );
      },
      450
    );

    return null;
  }

  return identity;
}


export async function signOut() {
  const {
    error,
  } =
    await supabase.auth.signOut();

  if (error) {
    notify.error(
      'Hesabdan çıxış zamanı xəta baş verdi.'
    );

    return false;
  }

  window.location.replace(
    APP_CONFIG.routes.login
  );

  return true;
}


// ============================================================
// 12. ROLE LABELS
// ============================================================

export function roleLabel(role) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Admin';

    case USER_ROLES.STAFF:
      return 'Əməkdaş';

    default:
      return 'Üzv';
  }
}


export function roleBadgeClass(role) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'ui-badge ui-badge--brand';

    case USER_ROLES.STAFF:
      return 'ui-badge ui-badge--warning';

    default:
      return 'ui-badge ui-badge--neutral';
  }
}


// ============================================================
// 13. PUBLIC STORAGE URL HELPERS
// ============================================================

export function getPublicStorageUrl(
  bucket,
  path
) {
  const normalizedPath =
    normalizeString(path);

  if (!normalizedPath) {
    return '';
  }

  if (
    normalizedPath.startsWith(
      'http://'
    ) ||
    normalizedPath.startsWith(
      'https://'
    )
  ) {
    return normalizedPath;
  }

  const {
    data,
  } =
    supabase.storage
      .from(bucket)
      .getPublicUrl(
        normalizedPath
      );

  return (
    data?.publicUrl ||
    ''
  );
}


// ============================================================
// 14. IMAGE FALLBACK
// ============================================================

export function bindImageFallback(
  image,
  fallback = ''
) {
  if (!image) return;

  image.addEventListener(
    'error',
    () => {
      if (
        fallback &&
        image.src !== fallback
      ) {
        image.src = fallback;
        return;
      }

      image.classList.add(
        'is-hidden'
      );
    },
    {
      once: true,
    }
  );
}


// ============================================================
// 15. GLOBAL ERROR NORMALIZATION
// ============================================================

export function getErrorMessage(
  error,
  fallback =
    'Əməliyyat zamanı xəta baş verdi.'
) {
  if (!error) {
    return fallback;
  }

  const message =
    normalizeString(
      error.message ||
      error.error_description ||
      error.details ||
      error.hint
    );

  if (!message) {
    return fallback;
  }

  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      'invalid login credentials'
    )
  ) {
    return 'E-poçt və ya şifrə düzgün deyil.';
  }

  if (
    normalized.includes(
      'email not confirmed'
    )
  ) {
    return 'E-poçt ünvanı hələ təsdiqlənməyib.';
  }

  if (
    normalized.includes(
      'user already registered'
    )
  ) {
    return 'Bu e-poçt ilə artıq hesab mövcuddur.';
  }

  if (
    normalized.includes(
      'password should be at least'
    )
  ) {
    return 'Şifrə minimum 6 simvoldan ibarət olmalıdır.';
  }

  if (
    normalized.includes(
      'row-level security'
    )
  ) {
    return 'Bu əməliyyat üçün icazə yoxdur.';
  }

  if (
    normalized.includes(
      'jwt expired'
    )
  ) {
    return 'Sessiyanın müddəti bitib. Yenidən daxil ol.';
  }

  return message;
}


// ============================================================
// CORE.JS — HISSƏ 1/2 SONU
// ============================================================

// ============================================================
// 16. FAVORITES — LOCAL SYSTEM
// ============================================================

export function getFavoriteIds() {
  const stored =
    storageGet(
      STORAGE_KEYS.favorites,
      []
    );

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .map(value => String(value))
    .filter(Boolean);
}


export function isFavorite(
  productId
) {
  const id =
    String(productId);

  return getFavoriteIds()
    .includes(id);
}


export function addFavorite(
  productId
) {
  const id =
    String(productId);

  if (!id) {
    return false;
  }

  const favorites =
    new Set(
      getFavoriteIds()
    );

  favorites.add(id);

  storageSet(
    STORAGE_KEYS.favorites,
    [...favorites]
  );

  dispatchFavoritesChange(
    [...favorites]
  );

  return true;
}


export function removeFavorite(
  productId
) {
  const id =
    String(productId);

  const favorites =
    new Set(
      getFavoriteIds()
    );

  favorites.delete(id);

  storageSet(
    STORAGE_KEYS.favorites,
    [...favorites]
  );

  dispatchFavoritesChange(
    [...favorites]
  );

  return true;
}


export function toggleFavorite(
  productId
) {
  const id =
    String(productId);

  if (isFavorite(id)) {
    removeFavorite(id);

    return false;
  }

  addFavorite(id);

  return true;
}


export function clearFavorites() {
  storageSet(
    STORAGE_KEYS.favorites,
    []
  );

  dispatchFavoritesChange([]);

  return true;
}


function dispatchFavoritesChange(
  favorites
) {
  window.dispatchEvent(
    new CustomEvent(
      'skyfit:favoriteschange',
      {
        detail: {
          favorites,
        },
      }
    )
  );
}


// ============================================================
// 17. STATUS HELPERS
// ============================================================

export function membershipStatus({
  status,
  endDate,
} = {}) {
  const normalizedStatus =
    normalizeString(
      status
    ).toLowerCase();

  if (
    normalizedStatus ===
    'expired'
  ) {
    return {
      value: 'expired',
      label: 'Bitib',
      className:
        'ui-badge ui-badge--danger',
    };
  }

  if (
    normalizedStatus ===
    'cancelled'
  ) {
    return {
      value: 'cancelled',
      label: 'Ləğv edilib',
      className:
        'ui-badge ui-badge--danger',
    };
  }

  if (
    endDate &&
    daysLeft(endDate) < 0
  ) {
    return {
      value: 'expired',
      label: 'Bitib',
      className:
        'ui-badge ui-badge--danger',
    };
  }

  if (
    normalizedStatus ===
    'active'
  ) {
    return {
      value: 'active',
      label: 'Aktiv',
      className:
        'ui-badge ui-badge--success',
    };
  }

  return {
    value:
      normalizedStatus ||
      'unknown',
    label: 'Naməlum',
    className:
      'ui-badge ui-badge--neutral',
  };
}


export function paymentStatusMeta(
  status
) {
  switch (
    normalizeString(
      status
    ).toLowerCase()
  ) {
    case 'paid':
      return {
        label: 'Ödənilib',
        className:
          'ui-badge ui-badge--success',
      };

    case 'debt':
      return {
        label: 'Borc',
        className:
          'ui-badge ui-badge--warning',
      };

    case 'cancelled':
      return {
        label: 'Ləğv edilib',
        className:
          'ui-badge ui-badge--danger',
      };

    case 'refunded':
      return {
        label: 'Geri qaytarılıb',
        className:
          'ui-badge ui-badge--neutral',
      };

    default:
      return {
        label: 'Naməlum',
        className:
          'ui-badge ui-badge--neutral',
      };
  }
}


export function stockStatusMeta(
  quantity,
  {
    lowThreshold = 5,
  } = {}
) {
  const stock =
    normalizeNumber(
      quantity
    );

  if (stock <= 0) {
    return {
      value: 'empty',
      label: 'Bitib',
      className:
        'ui-badge ui-badge--danger',
    };
  }

  if (
    stock <=
    lowThreshold
  ) {
    return {
      value: 'low',
      label: 'Az stok',
      className:
        'ui-badge ui-badge--warning',
    };
  }

  return {
    value: 'available',
    label: 'Stokda',
    className:
      'ui-badge ui-badge--success',
  };
}


// ============================================================
// 18. FORM HELPERS
// ============================================================

export function getFormValues(
  form
) {
  if (!form) {
    return {};
  }

  const formData =
    new FormData(form);

  return Object.fromEntries(
    formData.entries()
  );
}


export function setFieldError(
  input,
  errorElement,
  message = ''
) {
  if (!input) return;

  const wrapper =
    input.closest(
      '.ui-input'
    );

  if (message) {
    wrapper?.classList.add(
      'has-error'
    );

    input.setAttribute(
      'aria-invalid',
      'true'
    );

    if (errorElement) {
      errorElement.textContent =
        message;

      showElement(
        errorElement
      );
    }

    return;
  }

  wrapper?.classList.remove(
    'has-error'
  );

  input.removeAttribute(
    'aria-invalid'
  );

  if (errorElement) {
    errorElement.textContent =
      '';

    hideElement(
      errorElement
    );
  }
}


export function clearFormErrors(
  form
) {
  if (!form) return;

  $$(
    '.ui-input.has-error',
    form
  ).forEach(
    element =>
      element.classList.remove(
        'has-error'
      )
  );

  $$(
    '[aria-invalid="true"]',
    form
  ).forEach(
    element =>
      element.removeAttribute(
        'aria-invalid'
      )
  );

  $$(
    '.ui-field__error',
    form
  ).forEach(
    element => {
      element.textContent =
        '';

      hideElement(
        element
      );
    }
  );
}


export function validateEmail(
  email
) {
  const value =
    normalizeString(
      email
    );

  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(value);
}


export function validatePhone(
  phone
) {
  const normalized =
    normalizeString(
      phone
    )
      .replace(/\s+/g, '')
      .replace(/[()-]/g, '');

  if (!normalized) {
    return true;
  }

  return /^\+?[0-9]{9,15}$/
    .test(normalized);
}


export function validatePassword(
  password,
  {
    minLength = 6,
  } = {}
) {
  return (
    typeof password ===
      'string' &&
    password.length >=
      minLength
  );
}


export function bindPasswordToggle(
  button,
  input
) {
  if (
    !button ||
    !input
  ) {
    return;
  }

  button.addEventListener(
    'click',
    () => {
      const showing =
        input.type ===
        'text';

      input.type =
        showing
          ? 'password'
          : 'text';

      button.setAttribute(
        'aria-pressed',
        String(!showing)
      );

      button.setAttribute(
        'aria-label',
        showing
          ? 'Şifrəni göstər'
          : 'Şifrəni gizlət'
      );

      const showIcon =
        $(
          '.password-icon--show',
          button
        );

      const hideIcon =
        $(
          '.password-icon--hide',
          button
        );

      showIcon?.classList.toggle(
        'is-hidden',
        !showing
      );

      hideIcon?.classList.toggle(
        'is-hidden',
        showing
      );
    }
  );
}


// ============================================================
// 19. BUTTON LOADING STATE
// ============================================================

export function setButtonLoading(
  button,
  loading,
  {
    loadingText = '',
  } = {}
) {
  if (!button) return;

  const label =
    $(
      '.ui-button__label',
      button
    );

  const spinner =
    $(
      '.ui-button__spinner',
      button
    );

  if (
    !button.dataset.originalLabel &&
    label
  ) {
    button.dataset.originalLabel =
      label.textContent;
  }

  button.disabled =
    Boolean(loading);

  spinner?.classList.toggle(
    'is-hidden',
    !loading
  );

  if (label) {
    if (
      loading &&
      loadingText
    ) {
      label.textContent =
        loadingText;
    } else if (
      !loading &&
      button.dataset.originalLabel
    ) {
      label.textContent =
        button.dataset.originalLabel;
    }
  }
}


// ============================================================
// 20. SEARCH CLEAR BINDING
// ============================================================

export function bindSearchClear({
  input,
  clearButton,
  onChange = null,
} = {}) {
  if (
    !input ||
    !clearButton
  ) {
    return;
  }

  const sync = () => {
    clearButton.classList.toggle(
      'is-hidden',
      !normalizeString(
        input.value
      )
    );

    if (
      typeof onChange ===
      'function'
    ) {
      onChange(
        input.value
      );
    }
  };

  input.addEventListener(
    'input',
    sync
  );

  clearButton.addEventListener(
    'click',
    () => {
      input.value = '';
      sync();
      input.focus();
    }
  );

  sync();
}


// ============================================================
// 21. PRODUCT IMAGE URL
// ============================================================

export function getProductImageUrl(
  product
) {
  const direct =
    normalizeString(
      product?.image_url ||
      product?.imageUrl
    );

  if (!direct) {
    return '';
  }

  return getPublicStorageUrl(
    APP_CONFIG.storage.productImages,
    direct
  );
}


// ============================================================
// 22. TRAINER IMAGE URL
// ============================================================

export function getTrainerImageUrl(
  trainer
) {
  const direct =
    normalizeString(
      trainer?.image_url ||
      trainer?.imageUrl
    );

  if (!direct) {
    return '';
  }

  return getPublicStorageUrl(
    APP_CONFIG.storage.trainerImages,
    direct
  );
}


// ============================================================
// 23. PRODUCT CARD — SHARED COMPONENT
// ============================================================

export function createProductCard(
  product,
  {
    showFavorite = true,
    onOpen = null,
    onFavoriteChange = null,
  } = {}
) {
  const id =
    normalizeString(
      product?.id
    );

  const name =
    normalizeString(
      product?.name,
      'Məhsul'
    );

  const price =
    normalizeNumber(
      product?.price
    );

  const unit =
    normalizeString(
      product?.unit,
      ''
    );

  const stock =
    normalizeNumber(
      product?.stock_quantity ??
      product?.stock ??
      0
    );

  const imageUrl =
    getProductImageUrl(
      product
    );

  const card =
    createElement(
      'article',
      {
        className:
          'product-card',
        dataset: {
          productId: id,
        },
      }
    );

  const favoriteActive =
    isFavorite(id);

  card.innerHTML = `
    <div class="product-card__media">

      ${
        imageUrl
          ? `
            <img
              class="product-card__image"
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(name)}"
              loading="lazy"
              decoding="async"
            >
          `
          : `
            <div
              class="product-card__image-fallback"
              aria-hidden="true"
            >
              SK
            </div>
          `
      }

      ${
        showFavorite
          ? `
            <button
              type="button"
              class="product-card__favorite ${
                favoriteActive
                  ? 'is-active'
                  : ''
              }"
              aria-label="${
                favoriteActive
                  ? 'Sevimlilərdən çıxar'
                  : 'Sevimlilərə əlavə et'
              }"
              aria-pressed="${
                favoriteActive
                  ? 'true'
                  : 'false'
              }"
            >
              <svg
                viewBox="0 0 24 24"
                fill="${
                  favoriteActive
                    ? 'currentColor'
                    : 'none'
                }"
                aria-hidden="true"
              >
                <path
                  d="M12 20.2 4.9 13.6C1 10 3.3 4.5 7.7 4.5c1.8 0 3.3 1 4.3 2.3 1-1.3 2.5-2.3 4.3-2.3 4.4 0 6.7 5.5 2.8 9.1L12 20.2Z"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          `
          : ''
      }

      ${
        Number.isFinite(stock)
          ? `
            <span
              class="product-card__stock-badge ${
                stockStatusMeta(
                  stock
                ).className
              }"
            >
              ${
                stockStatusMeta(
                  stock
                ).label
              }
            </span>
          `
          : ''
      }

    </div>

    <div class="product-card__body">

      <strong class="product-card__name">
        ${escapeHtml(name)}
      </strong>

      <div class="product-card__meta">

        <span class="product-card__price">
          ${escapeHtml(
            money(price)
          )}
        </span>

        ${
          unit
            ? `
              <span class="product-card__unit">
                ${escapeHtml(unit)}
              </span>
            `
            : ''
        }

      </div>

    </div>
  `;

  const image =
    $(
      '.product-card__image',
      card
    );

  bindImageFallback(
    image
  );

  const favoriteButton =
    $(
      '.product-card__favorite',
      card
    );

  favoriteButton?.addEventListener(
    'click',
    event => {
      event.preventDefault();
      event.stopPropagation();

      const active =
        toggleFavorite(id);

      favoriteButton.classList.toggle(
        'is-active',
        active
      );

      favoriteButton.setAttribute(
        'aria-pressed',
        String(active)
      );

      favoriteButton.setAttribute(
        'aria-label',
        active
          ? 'Sevimlilərdən çıxar'
          : 'Sevimlilərə əlavə et'
      );

      const icon =
        $('svg', favoriteButton);

      if (icon) {
        icon.setAttribute(
          'fill',
          active
            ? 'currentColor'
            : 'none'
        );
      }

      if (
        typeof onFavoriteChange ===
        'function'
      ) {
        onFavoriteChange(
          product,
          active
        );
      }
    }
  );

  card.addEventListener(
    'click',
    () => {
      if (
        typeof onOpen ===
        'function'
      ) {
        onOpen(
          product,
          card
        );
      } else {
        openProductModal(
          product,
          {
            trigger: card,
          }
        );
      }
    }
  );

  return card;
}


// ============================================================
// 24. PRODUCT MODAL
// ============================================================

export function openProductModal(
  product,
  {
    trigger = null,
  } = {}
) {
  const name =
    normalizeString(
      product?.name,
      'Məhsul'
    );

  const description =
    normalizeString(
      product?.description
    );

  const price =
    normalizeNumber(
      product?.price
    );

  const unit =
    normalizeString(
      product?.unit
    );

  const imageUrl =
    getProductImageUrl(
      product
    );

  const content =
    createElement(
      'div',
      {
        className:
          'product-modal',
      }
    );

  content.innerHTML = `
    <div class="product-modal__media">

      ${
        imageUrl
          ? `
            <img
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(name)}"
            >
          `
          : `
            <span
              style="
                color:var(--brand);
                font-weight:800;
              "
            >
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

      <div class="product-modal__meta">

        <strong class="product-modal__price">
          ${escapeHtml(
            money(price)
          )}
        </strong>

        ${
          unit
            ? `
              <span class="product-modal__unit">
                ${escapeHtml(unit)}
              </span>
            `
            : ''
        }

      </div>

    </div>
  `;

  return openModal({
    eyebrow:
      'SKy Fit Shop',

    title: name,

    content,

    trigger,
  });
}


// ============================================================
// 25. TRAINER CARD — SHARED COMPONENT
// ============================================================

export function createTrainerCard(
  trainer,
  {
    onOpen = null,
  } = {}
) {
  const id =
    normalizeString(
      trainer?.id
    );

  const name =
    normalizeString(
      trainer?.name ||
      trainer?.full_name,
      'Məşqçi'
    );

  const specialty =
    normalizeString(
      trainer?.specialty ||
      trainer?.speciality ||
      trainer?.title
    );

  const imageUrl =
    getTrainerImageUrl(
      trainer
    );

  const card =
    createElement(
      'article',
      {
        className:
          'trainer-card',
        dataset: {
          trainerId: id,
        },
      }
    );

  card.innerHTML = `
    <div class="trainer-card__media">

      ${
        imageUrl
          ? `
            <img
              class="trainer-card__image"
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(name)}"
              loading="lazy"
              decoding="async"
            >
          `
          : ''
      }

      <div class="trainer-card__content">

        <strong class="trainer-card__name">
          ${escapeHtml(name)}
        </strong>

        ${
          specialty
            ? `
              <span class="trainer-card__specialty">
                ${escapeHtml(
                  specialty
                )}
              </span>
            `
            : ''
        }

        <span class="trainer-card__action">
          Ətraflı
        </span>

      </div>

    </div>
  `;

  const image =
    $(
      '.trainer-card__image',
      card
    );

  bindImageFallback(
    image
  );

  card.addEventListener(
    'click',
    () => {
      if (
        typeof onOpen ===
        'function'
      ) {
        onOpen(
          trainer,
          card
        );
      } else {
        openTrainerModal(
          trainer,
          {
            trigger: card,
          }
        );
      }
    }
  );

  return card;
}


// ============================================================
// 26. TRAINER MODAL
// ============================================================

export function openTrainerModal(
  trainer,
  {
    trigger = null,
  } = {}
) {
  const name =
    normalizeString(
      trainer?.name ||
      trainer?.full_name,
      'Məşqçi'
    );

  const specialty =
    normalizeString(
      trainer?.specialty ||
      trainer?.speciality ||
      trainer?.title
    );

  const description =
    normalizeString(
      trainer?.description ||
      trainer?.bio
    );

  const imageUrl =
    getTrainerImageUrl(
      trainer
    );

  const content =
    createElement(
      'div',
      {
        className:
          'trainer-modal',
      }
    );

  content.innerHTML = `
    ${
      imageUrl
        ? `
          <div class="trainer-modal__media">
            <img
              src="${escapeHtml(imageUrl)}"
              alt="${escapeHtml(name)}"
            >
          </div>
        `
        : ''
    }

    <div>

      <h3 class="trainer-modal__name">
        ${escapeHtml(name)}
      </h3>

      ${
        specialty
          ? `
            <span class="trainer-modal__specialty">
              ${escapeHtml(
                specialty
              )}
            </span>
          `
          : ''
      }

      ${
        description
          ? `
            <p class="trainer-modal__description">
              ${escapeHtml(
                description
              )}
            </p>
          `
          : ''
      }

    </div>
  `;

  return openModal({
    eyebrow:
      'SKy Fit Komandası',

    title: name,

    content,

    trigger,
  });
}


// ============================================================
// 27. AVATAR HELPERS
// ============================================================

export function getInitials(
  firstName,
  lastName = ''
) {
  const first =
    normalizeString(
      firstName
    );

  const last =
    normalizeString(
      lastName
    );

  const result =
    [
      first.charAt(0),
      last.charAt(0),
    ]
      .filter(Boolean)
      .join('')
      .toUpperCase();

  return (
    result ||
    'SK'
  );
}


export function getProfileName(
  profile,
  user = null
) {
  const firstName =
    normalizeString(
      profile?.first_name ||
      profile?.firstName ||
      profile?.name
    );

  const lastName =
    normalizeString(
      profile?.last_name ||
      profile?.lastName
    );

  const full =
    `${firstName} ${lastName}`
      .trim();

  if (full) {
    return full;
  }

  return (
    normalizeString(
      user?.email
    ) ||
    'SKy Fit istifadəçisi'
  );
}


// ============================================================
// 28. URL / PAGE HELPERS
// ============================================================

export function currentPage() {
  return (
    document.body?.dataset
      ?.page ||
    ''
  );
}


export function navigate(
  url,
  {
    replace = false,
  } = {}
) {
  if (!url) return;

  if (replace) {
    window.location.replace(
      url
    );

    return;
  }

  window.location.href =
    url;
}


// ============================================================
// 29. DOM READY
// ============================================================

export function onReady(
  callback
) {
  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      callback,
      {
        once: true,
      }
    );

    return;
  }

  callback();
}


// ============================================================
// 30. SAFE ASYNC EVENT
// ============================================================

export function asyncHandler(
  callback,
  {
    notifyOnError = true,
  } = {}
) {
  return async function handler(
    ...args
  ) {
    try {
      return await callback.apply(
        this,
        args
      );
    } catch (error) {
      console.error(
        'SKy Fit error:',
        error
      );

      if (notifyOnError) {
        notify.error(
          getErrorMessage(
            error
          )
        );
      }

      return null;
    }
  };
}


// ============================================================
// 31. GLOBAL AUTH CHANGE EVENT
// ============================================================

let authListenerStarted =
  false;


export function startAuthListener() {
  if (
    authListenerStarted
  ) {
    return;
  }

  authListenerStarted =
    true;

  supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          'skyfit:authchange',
          {
            detail: {
              event,
              session,
            },
          }
        )
      );
    }
  );
}


// ============================================================
// 32. CORE INITIALIZATION
// ============================================================

startAuthListener();


// ============================================================
// CORE.JS COMPLETE
// ============================================================
