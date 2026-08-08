// ============================================================
// SKY FIT PRO
// Core Runtime & Shared UI System
// File: js/core.js
//
// PART 1 / 2
//
// Bu fayl bütün layihənin ortaq frontend nüvəsidir.
// Duplicate helper, ikinci modal sistemi, ikinci toast sistemi,
// ikinci product-card sistemi yaradılmayacaq.
// ============================================================

import {
  supabase,
  APP_CONFIG,
  TABLES,
  UI_CONFIG,
} from './config.js';


// ============================================================
// 01. GLOBAL CONSTANTS
// ============================================================

export const SKYFIT_EVENTS = Object.freeze({
  authChange:
    'skyfit:authchange',

  profileChange:
    'skyfit:profilechange',

  favoritesChange:
    'skyfit:favoriteschange',

  themeChange:
    'skyfit:themechange',

  modalOpen:
    'skyfit:modalopen',

  modalClose:
    'skyfit:modalclose',

  loaderChange:
    'skyfit:loaderchange',
});


export const STORAGE_KEYS =
  Object.freeze({
    theme:
      'skyfit-theme',

    favorites:
      'skyfit-favorites',

    installDismissed:
      'skyfit-install-dismissed',
  });


export const PAYMENT_METHODS =
  Object.freeze({
    cash: 'cash',
    card: 'card',
    transfer: 'transfer',
  });


export const PAYMENT_STATUSES =
  Object.freeze({
    paid: 'paid',
    debt: 'debt',
    cancelled: 'cancelled',
    refunded: 'refunded',
  });


export const USER_ROLES =
  Object.freeze({
    admin: 'admin',
    staff: 'staff',
    member: 'member',
  });


export const SALE_MODES =
  Object.freeze({
    unit: 'unit',
    portion: 'portion',
  });


// ============================================================
// 02. BASIC DOM HELPERS
// ============================================================

export function byId(id) {
  if (!id) {
    return null;
  }

  return document.getElementById(
    id
  );
}


export function $(
  selector,
  root = document
) {
  if (
    !selector ||
    !root
  ) {
    return null;
  }

  return root.querySelector(
    selector
  );
}


export function $$(
  selector,
  root = document
) {
  if (
    !selector ||
    !root
  ) {
    return [];
  }

  return Array.from(
    root.querySelectorAll(
      selector
    )
  );
}


export function createElement(
  tagName,
  options = {}
) {
  const element =
    document.createElement(
      tagName
    );


  if (
    options.className
  ) {
    element.className =
      options.className;
  }


  if (
    options.text !==
    undefined
  ) {
    element.textContent =
      String(
        options.text
      );
  }


  if (
    options.html !==
    undefined
  ) {
    element.innerHTML =
      String(
        options.html
      );
  }


  if (
    options.attrs &&
    typeof options.attrs ===
      'object'
  ) {
    Object.entries(
      options.attrs
    ).forEach(
      ([
        key,
        value,
      ]) => {
        if (
          value ===
            null ||
          value ===
            undefined ||
          value ===
            false
        ) {
          return;
        }


        if (
          value === true
        ) {
          element.setAttribute(
            key,
            ''
          );

          return;
        }


        element.setAttribute(
          key,
          String(value)
        );
      }
    );
  }


  if (
    options.dataset &&
    typeof options.dataset ===
      'object'
  ) {
    Object.entries(
      options.dataset
    ).forEach(
      ([
        key,
        value,
      ]) => {
        if (
          value ===
            null ||
          value ===
            undefined
        ) {
          return;
        }

        element.dataset[key] =
          String(value);
      }
    );
  }


  return element;
}


export function clearElement(
  element
) {
  if (!element) {
    return;
  }

  element.replaceChildren();
}


export function setText(
  element,
  value = ''
) {
  if (!element) {
    return;
  }

  element.textContent =
    value ===
      null ||
    value ===
      undefined
      ? ''
      : String(value);
}


export function setHtml(
  element,
  value = ''
) {
  if (!element) {
    return;
  }

  element.innerHTML =
    value ===
      null ||
    value ===
      undefined
      ? ''
      : String(value);
}


export function showElement(
  element
) {
  if (!element) {
    return;
  }

  element.hidden = false;

  element.classList.remove(
    'is-hidden'
  );
}


export function hideElement(
  element
) {
  if (!element) {
    return;
  }

  element.hidden = true;

  element.classList.add(
    'is-hidden'
  );
}


export function toggleElement(
  element,
  visible
) {
  if (visible) {
    showElement(element);
  } else {
    hideElement(element);
  }
}


// ============================================================
// 03. STRING HELPERS
// ============================================================

export function normalizeString(
  value,
  fallback = ''
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return fallback;
  }


  const normalized =
    String(value)
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  return (
    normalized ||
    fallback
  );
}


export function normalizeSearch(
  value
) {
  return normalizeString(
    value
  ).toLocaleLowerCase(
    'az-AZ'
  );
}


export function escapeHtml(
  value
) {
  return normalizeString(
    value
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}


export function initials(
  value,
  fallback = 'SK'
) {
  const source =
    normalizeString(
      value
    );


  if (!source) {
    return fallback;
  }


  const parts =
    source
      .split(' ')
      .filter(Boolean);


  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toLocaleUpperCase(
        'az-AZ'
      );
  }


  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toLocaleUpperCase(
    'az-AZ'
  );
}


// ============================================================
// 04. NUMBER HELPERS
// ============================================================

export function number(
  value,
  fallback = 0
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ''
  ) {
    return fallback;
  }


  const parsed =
    Number(value);


  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}


export function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      number(value),
      min
    ),
    max
  );
}


// ============================================================
// 05. MONEY
// ============================================================

const moneyFormatter =
  new Intl.NumberFormat(
    'az-AZ',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );


export function money(
  value,
  options = {}
) {
  const amount =
    number(value);


  const currency =
    normalizeString(
      options.currency,
      '₼'
    );


  return `${
    moneyFormatter.format(
      amount
    )
  } ${currency}`;
}


// ============================================================
// 06. DATE HELPERS
// ============================================================

const dateFormatter =
  new Intl.DateTimeFormat(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );


const timeFormatter =
  new Intl.DateTimeFormat(
    'az-AZ',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  );


const dateTimeFormatter =
  new Intl.DateTimeFormat(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  );


export function validDate(
  value
) {
  if (!value) {
    return null;
  }


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


export function formatDate(
  value,
  fallback = '—'
) {
  const date =
    validDate(value);


  if (!date) {
    return fallback;
  }


  return dateFormatter.format(
    date
  );
}


export function formatTime(
  value,
  fallback = '—'
) {
  const date =
    validDate(value);


  if (!date) {
    return fallback;
  }


  return timeFormatter.format(
    date
  );
}


export function formatDateTime(
  value,
  fallback = '—'
) {
  const date =
    validDate(value);


  if (!date) {
    return fallback;
  }


  return dateTimeFormatter.format(
    date
  );
}


export function todayIso() {
  const now =
    new Date();


  const offset =
    now.getTimezoneOffset();


  const local =
    new Date(
      now.getTime() -
      offset * 60000
    );


  return local
    .toISOString()
    .slice(
      0,
      10
    );
}


export function daysBetween(
  start,
  end
) {
  const startDate =
    validDate(start);

  const endDate =
    validDate(end);


  if (
    !startDate ||
    !endDate
  ) {
    return 0;
  }


  const startUtc =
    Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );


  const endUtc =
    Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );


  return Math.round(
    (
      endUtc -
      startUtc
    ) /
    86400000
  );
}


// ============================================================
// 07. DEBOUNCE
// ============================================================

export function debounce(
  callback,
  delay = 220
) {
  let timer = null;


  return function debounced(
    ...args
  ) {
    clearTimeout(timer);


    timer =
      setTimeout(
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


// ============================================================
// 08. THROTTLE
// ============================================================

export function throttle(
  callback,
  delay = 150
) {
  let waiting = false;

  let queuedArgs = null;


  const run =
    context => {
      if (!queuedArgs) {
        waiting = false;
        return;
      }


      const args =
        queuedArgs;

      queuedArgs = null;


      callback.apply(
        context,
        args
      );


      setTimeout(
        () => run(context),
        delay
      );
    };


  return function throttled(
    ...args
  ) {
    if (!waiting) {
      waiting = true;

      callback.apply(
        this,
        args
      );


      setTimeout(
        () => run(this),
        delay
      );

      return;
    }


    queuedArgs = args;
  };
}


// ============================================================
// 09. SAFE JSON
// ============================================================

export function safeJsonParse(
  value,
  fallback = null
) {
  try {
    return JSON.parse(
      value
    );
  } catch {
    return fallback;
  }
}


export function safeJsonStringify(
  value,
  fallback = ''
) {
  try {
    return JSON.stringify(
      value
    );
  } catch {
    return fallback;
  }
}


// ============================================================
// 10. ARRAY / DATA HELPERS
// ============================================================

export function rows(
  value
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}


export function uniqueBy(
  array,
  keyGetter
) {
  const map =
    new Map();


  rows(array).forEach(
    item => {
      const key =
        keyGetter(item);

      if (
        key !==
          null &&
        key !==
          undefined
      ) {
        map.set(
          String(key),
          item
        );
      }
    }
  );


  return Array.from(
    map.values()
  );
}


// ============================================================
// 11. ERROR HELPERS
// ============================================================

export function getErrorMessage(
  error,
  fallback =
    'Əməliyyat zamanı xəta baş verdi.'
) {
  if (!error) {
    return fallback;
  }


  if (
    typeof error ===
      'string'
  ) {
    return (
      normalizeString(
        error
      ) ||
      fallback
    );
  }


  const possible =
    [
      error.message,
      error.error_description,
      error.details,
      error.hint,
    ];


  for (
    const value
    of possible
  ) {
    const text =
      normalizeString(
        value
      );

    if (text) {
      return text;
    }
  }


  return fallback;
}


// ============================================================
// 12. ASYNC HANDLER
// ============================================================

export function asyncHandler(
  callback,
  options = {}
) {
  return async function wrapped(
    ...args
  ) {
    try {
      return await callback.apply(
        this,
        args
      );
    } catch (error) {
      console.error(
        '[SKy Fit]',
        error
      );


      if (
        options.notifyOnError &&
        typeof notify !==
          'undefined'
      ) {
        notify.error(
          getErrorMessage(
            error
          )
        );
      }


      if (
        options.rethrow
      ) {
        throw error;
      }


      return null;
    }
  };
}


// ============================================================
// 13. BUTTON LOADING
// ============================================================

export function setButtonLoading(
  button,
  loading,
  options = {}
) {
  if (!button) {
    return;
  }


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
    loading
  ) {
    if (
      !button.dataset
        .originalDisabled
    ) {
      button.dataset
        .originalDisabled =
          button.disabled
            ? '1'
            : '0';
    }


    if (
      label &&
      !label.dataset
        .originalText
    ) {
      label.dataset
        .originalText =
          label.textContent;
    }


    button.disabled =
      true;

    button.setAttribute(
      'aria-busy',
      'true'
    );


    if (
      label &&
      options.loadingText
    ) {
      label.textContent =
        options.loadingText;
    }


    showElement(
      spinner
    );

    return;
  }


  button.removeAttribute(
    'aria-busy'
  );


  const originallyDisabled =
    button.dataset
      .originalDisabled ===
      '1';


  button.disabled =
    originallyDisabled;


  delete button.dataset
    .originalDisabled;


  if (
    label?.dataset
      .originalText
  ) {
    label.textContent =
      label.dataset
        .originalText;

    delete label.dataset
      .originalText;
  }


  hideElement(
    spinner
  );
}


// ============================================================
// 14. URL HELPERS
// ============================================================

export function isAbsoluteUrl(
  value
) {
  const url =
    normalizeString(
      value
    );


  return (
    url.startsWith(
      'https://'
    ) ||
    url.startsWith(
      'http://'
    ) ||
    url.startsWith(
      'data:'
    ) ||
    url.startsWith(
      'blob:'
    )
  );
}


export function getPublicStorageUrl(
  bucket,
  path
) {
  const normalizedBucket =
    normalizeString(
      bucket
    );

  const normalizedPath =
    normalizeString(
      path
    );


  if (
    !normalizedBucket ||
    !normalizedPath
  ) {
    return '';
  }


  if (
    isAbsoluteUrl(
      normalizedPath
    )
  ) {
    return normalizedPath;
  }


  const {
    data,
  } =
    supabase.storage
      .from(
        normalizedBucket
      )
      .getPublicUrl(
        normalizedPath
      );


  return normalizeString(
    data?.publicUrl
  );
}


// ============================================================
// 15. IMAGE FALLBACK
// ============================================================

export function setImageFallback(
  image,
  fallback = ''
) {
  if (!image) {
    return;
  }


  image.addEventListener(
    'error',
    () => {
      if (
        image.dataset
          .fallbackApplied ===
        '1'
      ) {
        return;
      }


      image.dataset
        .fallbackApplied =
          '1';


      if (fallback) {
        image.src =
          fallback;
      } else {
        image.hidden =
          true;
      }
    },
    {
      once: true,
    }
  );
}


// ============================================================
// 16. PROFILE — REAL SUPABASE SCHEMA
//
// profiles:
// id
// auth_user_id
// role
// full_name
// email
// phone
// birth_date
// address
// avatar_url
// is_manual
// is_active
// created_at
// updated_at
// ============================================================

export function getProfileName(
  profile,
  fallback =
    'SKy Fit istifadəçisi'
) {
  if (!profile) {
    return fallback;
  }


  const name =
    normalizeString(
      profile.full_name
    );


  if (name) {
    return name;
  }


  const email =
    normalizeString(
      profile.email
    );


  if (email) {
    return email;
  }


  return fallback;
}


export function getProfileInitials(
  profile
) {
  return initials(
    getProfileName(
      profile
    )
  );
}


export function getProfileEmail(
  profile
) {
  return normalizeString(
    profile?.email
  );
}


export function getProfilePhone(
  profile
) {
  return normalizeString(
    profile?.phone
  );
}


export function getProfileAddress(
  profile
) {
  return normalizeString(
    profile?.address
  );
}


export function getProfileAvatar(
  profile
) {
  const value =
    normalizeString(
      profile?.avatar_url
    );


  if (!value) {
    return '';
  }


  if (
    isAbsoluteUrl(
      value
    )
  ) {
    return value;
  }


  return getPublicStorageUrl(
    APP_CONFIG.storage
      .avatars,
    value
  );
}


export function roleLabel(
  role
) {
  switch (
    normalizeString(
      role
    ).toLowerCase()
  ) {
    case 'admin':
      return 'Admin';

    case 'staff':
      return 'Əməkdaş';

    case 'member':
      return 'Üzv';

    default:
      return 'İstifadəçi';
  }
}


export function isAdminProfile(
  profile
) {
  return (
    profile?.role ===
    USER_ROLES.admin
  );
}


export function isStaffProfile(
  profile
) {
  return (
    profile?.role ===
      USER_ROLES.admin ||
    profile?.role ===
      USER_ROLES.staff
  );
}


export function isMemberProfile(
  profile
) {
  return (
    profile?.role ===
    USER_ROLES.member
  );
}


// ============================================================
// 17. CURRENT AUTH / IDENTITY CACHE
// ============================================================

const identityState = {
  user: null,
  profile: null,
  loaded: false,
  promise: null,
};


// ============================================================
// 18. FETCH CURRENT PROFILE
// ============================================================

export async function fetchCurrentProfile(
  authUser = null
) {
  let user =
    authUser;


  if (!user) {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getUser();


    if (error) {
      throw error;
    }


    user =
      data?.user ||
      null;
  }


  if (!user) {
    return null;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.profiles
      )
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
      .eq(
        'auth_user_id',
        user.id
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  return data || null;
}


// ============================================================
// 19. GET CURRENT IDENTITY
// ============================================================

export async function getCurrentIdentity(
  options = {}
) {
  const force =
    Boolean(
      options.force
    );


  if (
    identityState.loaded &&
    !force
  ) {
    return buildIdentity(
      identityState.user,
      identityState.profile
    );
  }


  if (
    identityState.promise &&
    !force
  ) {
    return identityState
      .promise;
  }


  identityState.promise =
    loadCurrentIdentity();


  try {
    return await identityState
      .promise;
  } finally {
    identityState.promise =
      null;
  }
}


async function loadCurrentIdentity() {
  const {
    data,
    error,
  } =
    await supabase.auth
      .getSession();


  if (error) {
    throw error;
  }


  const user =
    data?.session
      ?.user ||
    null;


  let profile =
    null;


  if (user) {
    profile =
      await fetchCurrentProfile(
        user
      );
  }


  identityState.user =
    user;

  identityState.profile =
    profile;

  identityState.loaded =
    true;


  return buildIdentity(
    user,
    profile
  );
}


// ============================================================
// 20. BUILD IDENTITY
// ============================================================

function buildIdentity(
  user,
  profile
) {
  const role =
    normalizeString(
      profile?.role,
      USER_ROLES.member
    );


  return {
    user:
      user || null,

    profile:
      profile || null,

    authenticated:
      Boolean(user),

    profileId:
      profile?.id ||
      null,

    authUserId:
      user?.id ||
      null,

    role,

    isAdmin:
      role ===
      USER_ROLES.admin,

    isStaff:
      role ===
        USER_ROLES.admin ||
      role ===
        USER_ROLES.staff,

    isMember:
      role ===
      USER_ROLES.member,

    name:
      getProfileName(
        profile,
        normalizeString(
          user?.email,
          'SKy Fit istifadəçisi'
        )
      ),

    email:
      normalizeString(
        profile?.email ||
        user?.email
      ),

    avatar:
      getProfileAvatar(
        profile
      ),
  };
}


// ============================================================
// 21. CLEAR IDENTITY CACHE
// ============================================================

export function clearIdentityCache() {
  identityState.user =
    null;

  identityState.profile =
    null;

  identityState.loaded =
    false;

  identityState.promise =
    null;
}


// ============================================================
// 22. REQUIRE AUTH
// ============================================================

export async function requireAuth(
  options = {}
) {
  const identity =
    await getCurrentIdentity();


  if (
    identity.authenticated
  ) {
    return identity;
  }


  if (
    options.redirect !==
    false
  ) {
    window.location.replace(
      options.redirectTo ||
      APP_CONFIG.routes.login
    );
  }


  return null;
}


// ============================================================
// 23. REQUIRE STAFF
// ============================================================

export async function requireStaff(
  options = {}
) {
  const identity =
    await requireAuth(
      options
    );


  if (!identity) {
    return null;
  }


  if (
    identity.isStaff
  ) {
    return identity;
  }


  if (
    options.redirect !==
    false
  ) {
    window.location.replace(
      options.redirectTo ||
      APP_CONFIG.routes.home
    );
  }


  return null;
}


// ============================================================
// 24. PRODUCT — REAL SUPABASE SCHEMA
//
// products:
// id
// name
// description
// sku
// image_url
// category
// sale_mode
// stock_unit
// stock_quantity
// portion_size
// retail_price
// portion_price
// cost_price
// low_stock_threshold
// show_public
// is_active
// created_at
// updated_at
// created_by
// updated_by
// operator_shift_id
// ============================================================

export function productName(
  product
) {
  return normalizeString(
    product?.name,
    'Məhsul'
  );
}


export function productDescription(
  product
) {
  return normalizeString(
    product?.description
  );
}


export function productSaleMode(
  product
) {
  const mode =
    normalizeString(
      product?.sale_mode,
      SALE_MODES.unit
    );


  return (
    mode ===
      SALE_MODES.portion
      ? SALE_MODES.portion
      : SALE_MODES.unit
  );
}


export function productPrice(
  product
) {
  if (!product) {
    return 0;
  }


  if (
    productSaleMode(
      product
    ) ===
    SALE_MODES.portion
  ) {
    return number(
      product.portion_price
    );
  }


  return number(
    product.retail_price
  );
}


export function productRetailPrice(
  product
) {
  return number(
    product?.retail_price
  );
}


export function productPortionPrice(
  product
) {
  return number(
    product?.portion_price
  );
}


export function productCostPrice(
  product
) {
  return number(
    product?.cost_price
  );
}


export function productStock(
  product
) {
  return number(
    product?.stock_quantity
  );
}


export function productLowStockThreshold(
  product
) {
  return number(
    product
      ?.low_stock_threshold
  );
}


export function productPortionSize(
  product
) {
  return number(
    product?.portion_size,
    1
  );
}


export function productStockUnit(
  product
) {
  return normalizeString(
    product?.stock_unit,
    'ədəd'
  );
}


export function productCategory(
  product
) {
  return normalizeString(
    product?.category
  );
}


export function productSku(
  product
) {
  return normalizeString(
    product?.sku
  );
}


export function productImage(
  product
) {
  const value =
    normalizeString(
      product?.image_url
    );


  if (!value) {
    return '';
  }


  if (
    isAbsoluteUrl(
      value
    )
  ) {
    return value;
  }


  return getPublicStorageUrl(
    APP_CONFIG.storage
      .productImages,
    value
  );
}


export function productStockState(
  product
) {
  const stock =
    productStock(
      product
    );

  const threshold =
    productLowStockThreshold(
      product
    );


  if (stock <= 0) {
    return {
      key:
        'out',

      label:
        'Stok yoxdur',

      className:
        'ui-badge ui-badge--danger',
    };
  }


  if (
    threshold > 0 &&
    stock <= threshold
  ) {
    return {
      key:
        'low',

      label:
        'Az stok',

      className:
        'ui-badge ui-badge--warning',
    };
  }


  return {
    key:
      'available',

    label:
      'Stokda',

    className:
      'ui-badge ui-badge--success',
  };
}


export function productUnitLabel(
  product
) {
  if (
    productSaleMode(
      product
    ) ===
    SALE_MODES.portion
  ) {
    const size =
      productPortionSize(
        product
      );

    const unit =
      productStockUnit(
        product
      );


    return `${size} ${unit}`;
  }


  return productStockUnit(
    product
  );
}


// ============================================================
// 25. TRAINER — REAL SUPABASE SCHEMA
//
// trainers:
// id
// full_name
// specialty
// bio
// image_url
// phone
// instagram_url
// sort_order
// is_active
// created_at
// created_by
// updated_by
// operator_shift_id
// ============================================================

export function trainerName(
  trainer
) {
  return normalizeString(
    trainer?.full_name,
    'Məşqçi'
  );
}


export function trainerSpecialty(
  trainer
) {
  return normalizeString(
    trainer?.specialty
  );
}


export function trainerBio(
  trainer
) {
  return normalizeString(
    trainer?.bio
  );
}


export function trainerPhone(
  trainer
) {
  return normalizeString(
    trainer?.phone
  );
}


export function trainerInstagram(
  trainer
) {
  return normalizeString(
    trainer?.instagram_url
  );
}


export function trainerImage(
  trainer
) {
  const value =
    normalizeString(
      trainer?.image_url
    );


  if (!value) {
    return '';
  }


  if (
    isAbsoluteUrl(
      value
    )
  ) {
    return value;
  }


  return getPublicStorageUrl(
    APP_CONFIG.storage
      .trainerImages,
    value
  );
}


// ============================================================
// 26. MEMBERSHIP HELPERS
// ============================================================

export function membershipStatus(
  membership
) {
  return normalizeString(
    membership?.status,
    'unknown'
  ).toLowerCase();
}


export function membershipPaymentStatus(
  membership
) {
  return normalizeString(
    membership
      ?.payment_status,
    PAYMENT_STATUSES.paid
  ).toLowerCase();
}


export function membershipIsActive(
  membership
) {
  if (!membership) {
    return false;
  }


  if (
    membershipStatus(
      membership
    ) !==
    'active'
  ) {
    return false;
  }


  const today =
    todayIso();


  const start =
    normalizeString(
      membership.start_date
    );


  const end =
    normalizeString(
      membership.end_date
    );


  if (
    start &&
    today < start
  ) {
    return false;
  }


  if (
    end &&
    today > end
  ) {
    return false;
  }


  return true;
}


export function membershipDaysRemaining(
  membership
) {
  if (
    !membership?.end_date
  ) {
    return 0;
  }


  return Math.max(
    0,
    daysBetween(
      new Date(),
      membership.end_date
    )
  );
}


export function membershipStatusLabel(
  membership
) {
  const status =
    membershipStatus(
      membership
    );


  switch (status) {
    case 'active':
      return 'Aktiv';

    case 'expired':
      return 'Bitib';

    case 'cancelled':
      return 'Ləğv edilib';

    default:
      return normalizeString(
        status,
        'Naməlum'
      );
  }
}


// ============================================================
// 27. ATTENDANCE HELPERS
//
// Real timestamp = checked_in_at
// created_at DEYİL.
// ============================================================

export function attendanceDate(
  attendance
) {
  return (
    attendance
      ?.checked_in_at ||
    null
  );
}


export function attendanceType(
  attendance
) {
  return normalizeString(
    attendance
      ?.attendance_type,
    'membership'
  );
}


export function attendanceTypeLabel(
  attendance
) {
  return (
    attendanceType(
      attendance
    ) ===
    'daily'
      ? 'Günlük giriş'
      : 'Üzvlük'
  );
}


export function attendanceAmount(
  attendance
) {
  return number(
    attendance?.amount
  );
}


// ============================================================
// 28. FINANCE HELPERS
// ============================================================

export function ledgerType(
  entry
) {
  const type =
    normalizeString(
      entry?.entry_type
    ).toLowerCase();


  return (
    type ===
      'expense'
      ? 'expense'
      : 'income'
  );
}


export function ledgerAmount(
  entry
) {
  return number(
    entry?.amount
  );
}


export function ledgerDate(
  entry
) {
  return (
    entry?.created_at ||
    entry?.entry_date ||
    null
  );
}


export function ledgerTypeLabel(
  entry
) {
  return (
    ledgerType(
      entry
    ) ===
    'expense'
      ? 'Xərc'
      : 'Gəlir'
  );
}


// ============================================================
// 29. SALES HELPERS
// ============================================================

export function saleAmount(
  sale
) {
  return number(
    sale?.total_amount ??
    sale?.subtotal
  );
}


export function salePaymentStatus(
  sale
) {
  return normalizeString(
    sale?.payment_status,
    PAYMENT_STATUSES.paid
  );
}


export function salePaymentMethod(
  sale
) {
  return normalizeString(
    sale?.payment_method,
    PAYMENT_METHODS.cash
  );
}


// ============================================================
// 30. DEBT HELPERS
// ============================================================

export function debtBalance(
  account
) {
  return number(
    account?.balance
  );
}


export function debtIsOpen(
  account
) {
  return (
    debtBalance(
      account
    ) > 0
  );
}


export function debtTransactionAmount(
  transaction
) {
  return number(
    transaction?.amount
  );
}


// ============================================================
// 31. OPERATOR HELPERS
//
// Real backend operator columns:
// created_by
// updated_by
// operator_shift_id
//
// Audit üçün sonradan get_operator_activity RPC istifadə ediləcək.
// ============================================================

export function operatorProfileId(
  record
) {
  return (
    record?.created_by ||
    record?.actor_profile_id ||
    null
  );
}


export function updatedByProfileId(
  record
) {
  return (
    record?.updated_by ||
    null
  );
}


export function operatorShiftId(
  record
) {
  return (
    record?.operator_shift_id ||
    null
  );
}


// ============================================================
// 32. FAVORITES STORAGE
// ============================================================

export function getFavoriteIds() {
  const raw =
    localStorage.getItem(
      STORAGE_KEYS.favorites
    );


  const parsed =
    safeJsonParse(
      raw,
      []
    );


  if (
    !Array.isArray(
      parsed
    )
  ) {
    return [];
  }


  return Array.from(
    new Set(
      parsed
        .filter(
          value =>
            value !==
              null &&
            value !==
              undefined
        )
        .map(
          value =>
            String(value)
        )
    )
  );
}


export function saveFavoriteIds(
  ids
) {
  const normalized =
    Array.from(
      new Set(
        rows(ids)
          .filter(Boolean)
          .map(
            value =>
              String(value)
          )
      )
    );


  localStorage.setItem(
    STORAGE_KEYS.favorites,
    JSON.stringify(
      normalized
    )
  );


  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS
        .favoritesChange,
      {
        detail: {
          ids:
            normalized,
        },
      }
    )
  );


  return normalized;
}


export function isFavorite(
  productId
) {
  if (
    productId ===
      null ||
    productId ===
      undefined
  ) {
    return false;
  }


  return getFavoriteIds()
    .includes(
      String(
        productId
      )
    );
}


export function addFavorite(
  productId
) {
  if (
    productId ===
      null ||
    productId ===
      undefined
  ) {
    return getFavoriteIds();
  }


  const ids =
    getFavoriteIds();


  const id =
    String(
      productId
    );


  if (
    !ids.includes(id)
  ) {
    ids.push(id);
  }


  return saveFavoriteIds(
    ids
  );
}


export function removeFavorite(
  productId
) {
  const id =
    String(
      productId
    );


  return saveFavoriteIds(
    getFavoriteIds()
      .filter(
        value =>
          value !== id
      )
  );
}


export function toggleFavorite(
  productId
) {
  const active =
    isFavorite(
      productId
    );


  if (active) {
    removeFavorite(
      productId
    );

    return false;
  }


  addFavorite(
    productId
  );

  return true;
}


export function clearFavorites() {
  return saveFavoriteIds(
    []
  );
}


// ============================================================
// 33. SEARCH INPUT CLEAR
// ============================================================

export function bindSearchClear({
  input,
  clearButton,
  onChange,
}) {
  if (
    !input ||
    !clearButton
  ) {
    return () => {};
  }


  const sync =
    () => {
      const value =
        normalizeString(
          input.value
        );


      clearButton.hidden =
        !value;


      if (
        typeof onChange ===
        'function'
      ) {
        onChange(value);
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

      input.focus();

      sync();
    }
  );


  sync();


  return () => {
    input.removeEventListener(
      'input',
      sync
    );
  };
}


// ============================================================
// 34. THEME
// ============================================================

export function getStoredTheme() {
  const stored =
    normalizeString(
      localStorage.getItem(
        STORAGE_KEYS.theme
      )
    );


  if (
    stored ===
      'light' ||
    stored ===
      'dark' ||
    stored ===
      'system'
  ) {
    return stored;
  }


  return 'system';
}


export function resolveTheme(
  theme =
    getStoredTheme()
) {
  if (
    theme ===
      'light' ||
    theme ===
      'dark'
  ) {
    return theme;
  }


  return window
    .matchMedia?.(
      '(prefers-color-scheme: dark)'
    )
    .matches
      ? 'dark'
      : 'light';
}


export function applyTheme(
  theme =
    getStoredTheme(),
  options = {}
) {
  const selected =
    (
      theme ===
        'light' ||
      theme ===
        'dark' ||
      theme ===
        'system'
    )
      ? theme
      : 'system';


  const resolved =
    resolveTheme(
      selected
    );


  document.documentElement
    .dataset.theme =
      resolved;


  document.documentElement
    .dataset.themeSource =
      selected;


  if (
    options.persist !==
    false
  ) {
    localStorage.setItem(
      STORAGE_KEYS.theme,
      selected
    );
  }


  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS.themeChange,
      {
        detail: {
          source:
            selected,

          theme:
            resolved,
        },
      }
    )
  );


  return resolved;
}


export function cycleTheme() {
  const current =
    getStoredTheme();


  const next =
    current ===
      'system'
      ? 'dark'
      : current ===
          'dark'
        ? 'light'
        : 'system';


  applyTheme(
    next
  );


  return next;
}


// ============================================================
// 35. SYSTEM THEME LISTENER
// ============================================================

const systemThemeQuery =
  window.matchMedia?.(
    '(prefers-color-scheme: dark)'
  );


if (
  systemThemeQuery
) {
  const handleSystemTheme =
    () => {
      if (
        getStoredTheme() ===
        'system'
      ) {
        applyTheme(
          'system',
          {
            persist: false,
          }
        );
      }
    };


  if (
    typeof systemThemeQuery
      .addEventListener ===
      'function'
  ) {
    systemThemeQuery
      .addEventListener(
        'change',
        handleSystemTheme
      );
  } else if (
    typeof systemThemeQuery
      .addListener ===
      'function'
  ) {
    systemThemeQuery
      .addListener(
        handleSystemTheme
      );
  }
}


// ============================================================


// ============================================================
// 36. TOAST SYSTEM
// ============================================================

let toastCounter = 0;


function ensureToastRoot() {
  let root =
    byId('app-toast-root');


  if (!root) {
    root =
      createElement(
        'div',
        {
          attrs: {
            id:
              'app-toast-root',

            'aria-live':
              'polite',

            'aria-atomic':
              'true',
          },
        }
      );


    document.body.append(
      root
    );
  }


  let stack =
    $(
      '.toast-stack',
      root
    );


  if (!stack) {
    stack =
      createElement(
        'div',
        {
          className:
            'toast-stack',
        }
      );


    root.append(
      stack
    );
  }


  return stack;
}


function toastIcon(
  type
) {
  switch (type) {
    case 'success':
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  options = {}
) {
  const stack =
    ensureToastRoot();


  if (!stack) {
    return null;
  }


  const type =
    normalizeString(
      options.type,
      'info'
    );


  const title =
    normalizeString(
      options.title
    );


  const duration =
    Math.max(
      0,
      number(
        options.duration,
        4200
      )
    );


  const id =
    `skyfit-toast-${++toastCounter}`;


  const element =
    createElement(
      'article',
      {
        className:
          `ui-toast ui-toast--${type}`,

        attrs: {
          id,

          role:
            type ===
              'danger'
              ? 'alert'
              : 'status',
        },
      }
    );


  element.innerHTML = `
    <span class="ui-toast__icon">
      ${toastIcon(type)}
    </span>

    <span class="ui-toast__content">

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

    </span>

    <button
      type="button"
      class="ui-toast__close"
      aria-label="Bildirişi bağla"
    >
      ×
    </button>

    ${
      duration > 0
        ? `
          <span class="ui-toast__progress">
            <span
              class="ui-toast__progress-value"
            ></span>
          </span>
        `
        : ''
    }
  `;


  stack.prepend(
    element
  );


  let closed =
    false;


  const close =
    () => {
      if (closed) {
        return;
      }


      closed =
        true;


      element.classList.add(
        'is-leaving'
      );


      setTimeout(
        () => {
          element.remove();
        },
        220
      );
    };


  $(
    '.ui-toast__close',
    element
  )?.addEventListener(
    'click',
    close
  );


  if (
    duration > 0
  ) {
    const progress =
      $(
        '.ui-toast__progress-value',
        element
      );


    if (progress) {
      progress.style
        .transitionDuration =
          `${duration}ms`;


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
    }


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


export const notify =
  Object.freeze({

    success(
      message,
      title =
        'Uğurlu'
    ) {
      return toast(
        message,
        {
          type:
            'success',

          title,
        }
      );
    },


    warning(
      message,
      title =
        'Diqqət'
    ) {
      return toast(
        message,
        {
          type:
            'warning',

          title,
        }
      );
    },


    error(
      message,
      title =
        'Xəta'
    ) {
      return toast(
        message,
        {
          type:
            'danger',

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
          type:
            'info',

          title,
        }
      );
    },
  });


// ============================================================
// 37. GLOBAL LOADER
// ============================================================

let loaderDepth = 0;

let loaderStartedAt = 0;


function ensureLoaderRoot() {
  let root =
    byId(
      'app-loader-root'
    );


  if (!root) {
    root =
      createElement(
        'div',
        {
          attrs: {
            id:
              'app-loader-root',
          },
        }
      );


    document.body.append(
      root
    );
  }


  let loader =
    $(
      '.app-loader',
      root
    );


  if (!loader) {
    loader =
      createElement(
        'div',
        {
          className:
            'app-loader',

          attrs: {
            role:
              'status',

            'aria-live':
              'polite',

            'aria-hidden':
              'true',
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
          Yüklənir...
        </span>

      </div>
    `;


    root.append(
      loader
    );
  }


  return loader;
}


export function showLoader(
  label =
    'Yüklənir...'
) {
  loaderDepth += 1;


  const loader =
    ensureLoaderRoot();


  if (!loader) {
    return;
  }


  loaderStartedAt =
    performance.now();


  const labelElement =
    $(
      '.app-loader__label',
      loader
    );


  if (
    labelElement
  ) {
    labelElement.textContent =
      label;
  }


  loader.classList.add(
    'is-visible'
  );


  loader.setAttribute(
    'aria-hidden',
    'false'
  );


  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS
        .loaderChange,
      {
        detail: {
          visible:
            true,

          depth:
            loaderDepth,
        },
      }
    )
  );
}


export async function hideLoader(
  options = {}
) {
  if (
    options.force
  ) {
    loaderDepth = 0;
  } else {
    loaderDepth =
      Math.max(
        0,
        loaderDepth - 1
      );
  }


  if (
    loaderDepth > 0
  ) {
    return;
  }


  const loader =
    ensureLoaderRoot();


  if (!loader) {
    return;
  }


  const elapsed =
    performance.now() -
    loaderStartedAt;


  const minimum =
    number(
      options.minimumDuration,
      180
    );


  if (
    !options.force &&
    elapsed < minimum
  ) {
    await new Promise(
      resolve => {
        setTimeout(
          resolve,
          minimum - elapsed
        );
      }
    );
  }


  loader.classList.remove(
    'is-visible'
  );


  loader.setAttribute(
    'aria-hidden',
    'true'
  );


  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS
        .loaderChange,
      {
        detail: {
          visible:
            false,

          depth:
            0,
        },
      }
    )
  );
}


export async function withLoader(
  callback,
  options = {}
) {
  showLoader(
    options.label ||
    'Yüklənir...'
  );


  try {
    return await callback();
  } finally {
    await hideLoader(
      options
    );
  }
}


// ============================================================
// 38. MODAL SYSTEM
// ============================================================

let activeModal = null;

let previousFocus =
  null;


function ensureModalRoot() {
  let root =
    byId(
      'app-modal-root'
    );


  if (!root) {
    root =
      createElement(
        'div',
        {
          attrs: {
            id:
              'app-modal-root',
          },
        }
      );


    document.body.append(
      root
    );
  }


  return root;
}


function handleModalEscape(
  event
) {
  if (
    event.key ===
      'Escape' &&
    activeModal
  ) {
    closeModal();
  }
}


export function openModal(
  options = {}
) {
  const root =
    ensureModalRoot();


  if (!root) {
    return null;
  }


  if (
    activeModal
  ) {
    closeModal({
      immediate: true,
    });
  }


  previousFocus =
    options.trigger ||
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
          `app-modal ${
            normalizeString(
              options.className
            )
          }`.trim(),

        attrs: {
          role:
            'dialog',

          'aria-modal':
            'true',

          'aria-label':
            normalizeString(
              options.title,
              'Pəncərə'
            ),
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
          options.eyebrow
            ? `
              <span class="app-modal__eyebrow">
                ${escapeHtml(
                  options.eyebrow
                )}
              </span>
            `
            : ''
        }

        <h2 class="app-modal__title">
          ${escapeHtml(
            options.title ||
            ''
          )}
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
      options.footer
        ? `
          <footer class="app-modal__footer"></footer>
        `
        : ''
    }
  `;


  const body =
    $(
      '.app-modal__body',
      modal
    );


  const footer =
    $(
      '.app-modal__footer',
      modal
    );


  if (
    options.content
      instanceof Node
  ) {
    body?.append(
      options.content
    );
  } else if (
    body
  ) {
    body.innerHTML =
      String(
        options.content ||
        ''
      );
  }


  if (
    footer
  ) {
    if (
      options.footer
        instanceof Node
    ) {
      footer.append(
        options.footer
      );
    } else {
      footer.innerHTML =
        String(
          options.footer ||
          ''
        );
    }
  }


  backdrop.append(
    modal
  );


  root.append(
    backdrop
  );


  const cleanup =
    () => {
      document.removeEventListener(
        'keydown',
        handleModalEscape
      );


      document.body
        .classList
        .remove(
          'is-scroll-locked'
        );


      if (
        typeof options.onClose ===
          'function'
      ) {
        options.onClose();
      }


      if (
        previousFocus &&
        typeof previousFocus
          .focus ===
          'function'
      ) {
        previousFocus.focus();
      }


      previousFocus =
        null;

      activeModal =
        null;


      window.dispatchEvent(
        new CustomEvent(
          SKYFIT_EVENTS
            .modalClose
        )
      );
    };


  activeModal = {
    backdrop,
    modal,
    body,
    footer,
    cleanup,
    closeOnBackdrop:
      options.closeOnBackdrop !==
      false,
  };


  $(
    '.app-modal__close',
    modal
  )?.addEventListener(
    'click',
    () => closeModal()
  );


  backdrop.addEventListener(
    'click',
    event => {
      if (
        event.target ===
          backdrop &&
        activeModal
          ?.closeOnBackdrop
      ) {
        closeModal();
      }
    }
  );


  document.addEventListener(
    'keydown',
    handleModalEscape
  );


  document.body
    .classList
    .add(
      'is-scroll-locked'
    );


  requestAnimationFrame(
    () => {
      backdrop.classList.add(
        'is-open'
      );


      $(
        '.app-modal__close',
        modal
      )?.focus();
    }
  );


  if (
    typeof options.onOpen ===
      'function'
  ) {
    options.onOpen({
      modal,
      backdrop,
      body,
      footer,
    });
  }


  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS
        .modalOpen
    )
  );


  return {
    modal,
    backdrop,
    body,
    footer,

    close:
      () => closeModal(),
  };
}


export function closeModal(
  options = {}
) {
  if (!activeModal) {
    return;
  }


  const current =
    activeModal;


  if (
    options.immediate
  ) {
    current.backdrop
      .remove();

    current.cleanup();

    return;
  }


  current.backdrop
    .classList
    .remove(
      'is-open'
    );


  setTimeout(
    () => {
      current.backdrop
        .remove();

      current.cleanup();
    },
    220
  );
}


export function getActiveModal() {
  return activeModal;
}


// ============================================================
// 39. CONFIRM DIALOG
// ============================================================

export function confirmDialog(
  options = {}
) {
  return new Promise(
    resolve => {
      let settled =
        false;


      const content =
        createElement(
          'div',
          {
            className:
              'modal-confirm',
          }
        );


      content.innerHTML = `
        <p class="modal-confirm__message">
          ${escapeHtml(
            options.message ||
            ''
          )}
        </p>
      `;


      const footer =
        createElement(
          'div',
          {
            className:
              'modal-form__actions',
          }
        );


      const cancel =
        createElement(
          'button',
          {
            className:
              'ui-button ui-button--glass',

            text:
              options.cancelText ||
              'Ləğv et',

            attrs: {
              type:
                'button',
            },
          }
        );


      const confirm =
        createElement(
          'button',
          {
            className:
              options.danger
                ? 'ui-button ui-button--danger'
                : 'ui-button ui-button--primary',

            text:
              options.confirmText ||
              'Təsdiq et',

            attrs: {
              type:
                'button',
            },
          }
        );


      footer.append(
        cancel,
        confirm
      );


      const settle =
        value => {
          if (settled) {
            return;
          }


          settled =
            true;

          resolve(value);

          closeModal();
        };


      openModal({
        eyebrow:
          options.eyebrow,

        title:
          options.title ||
          'Təsdiq',

        content,

        footer,

        closeOnBackdrop:
          options.closeOnBackdrop !==
          false,

        onOpen:
          () => {
            cancel.addEventListener(
              'click',
              () => {
                settle(false);
              }
            );


            confirm.addEventListener(
              'click',
              () => {
                settle(true);
              }
            );
          },

        onClose:
          () => {
            if (!settled) {
              settled =
                true;

              resolve(false);
            }
          },
      });
    }
  );
}


// ============================================================
// 40. FORM HELPERS
// ============================================================

export function getFormValues(
  form
) {
  if (!form) {
    return {};
  }


  return Object.fromEntries(
    new FormData(form)
      .entries()
  );
}


export function setFieldError(
  input,
  errorElement,
  message = ''
) {
  if (!input) {
    return;
  }


  const field =
    input.closest(
      '.ui-field'
    ) ||
    input.closest(
      '.ui-input'
    );


  if (message) {
    field?.classList.add(
      'has-error'
    );


    input.setAttribute(
      'aria-invalid',
      'true'
    );


    if (
      errorElement
    ) {
      errorElement.textContent =
        message;

      showElement(
        errorElement
      );
    }

    return;
  }


  field?.classList.remove(
    'has-error'
  );


  input.removeAttribute(
    'aria-invalid'
  );


  if (
    errorElement
  ) {
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
  if (!form) {
    return;
  }


  $$(
    '.has-error',
    form
  ).forEach(
    element => {
      element.classList.remove(
        'has-error'
      );
    }
  );


  $$(
    '[aria-invalid="true"]',
    form
  ).forEach(
    element => {
      element.removeAttribute(
        'aria-invalid'
      );
    }
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
  const value =
    normalizeString(
      phone
    )
      .replace(
        /[\s()-]/g,
        ''
      );


  if (!value) {
    return true;
  }


  return /^\+?[0-9]{9,15}$/
    .test(value);
}


export function validatePassword(
  password,
  options = {}
) {
  const minLength =
    Math.max(
      6,
      number(
        options.minLength,
        6
      )
    );


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
      const visible =
        input.type ===
        'text';


      input.type =
        visible
          ? 'password'
          : 'text';


      button.setAttribute(
        'aria-pressed',
        String(
          !visible
        )
      );


      button.setAttribute(
        'aria-label',
        visible
          ? 'Şifrəni göstər'
          : 'Şifrəni gizlət'
      );


      $(
        '.password-icon--show',
        button
      )?.classList.toggle(
        'is-hidden',
        !visible
      );


      $(
        '.password-icon--hide',
        button
      )?.classList.toggle(
        'is-hidden',
        visible
      );
    }
  );
}


// ============================================================
// 41. PRODUCT CARD — FINAL SHARED COMPONENT
// ============================================================

export function createProductCard(
  product,
  options = {}
) {
  const name =
    productName(
      product
    );


  const price =
    productPrice(
      product
    );


  const stock =
    productStock(
      product
    );


  const image =
    productImage(
      product
    );


  const favoriteActive =
    isFavorite(
      product?.id
    );


  const stockState =
    productStockState(
      product
    );


  const card =
    createElement(
      'article',
      {
        className:
          'product-card',

        dataset: {
          productId:
            product?.id ||
            '',
        },
      }
    );


  card.innerHTML = `
    <div class="product-card__media">

      ${
        image
          ? `
            <img
              class="product-card__image"
              src="${escapeHtml(image)}"
              alt="${escapeHtml(name)}"
              loading="lazy"
              decoding="async"
            >
          `
          : `
            <div class="product-card__image-fallback">
              SK
            </div>
          `
      }

      ${
        options.showFavorite !==
          false
          ? `
            <button
              type="button"
              class="product-card__favorite ${
                favoriteActive
                  ? 'is-active'
                  : ''
              }"
              aria-pressed="${
                favoriteActive
                  ? 'true'
                  : 'false'
              }"
              aria-label="${
                favoriteActive
                  ? 'Sevimlilərdən çıxar'
                  : 'Sevimlilərə əlavə et'
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

      <span
        class="product-card__stock-badge ${stockState.className}"
      >
        ${escapeHtml(
          stockState.label
        )}
      </span>

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

        <span class="product-card__unit">
          ${escapeHtml(
            productUnitLabel(
              product
            )
          )}
        </span>

      </div>

      <div class="product-card__stock-line">
        <span>
          Stok:
          ${escapeHtml(
            String(stock)
          )}
        </span>
      </div>

    </div>
  `;


  const imageElement =
    $(
      '.product-card__image',
      card
    );


  setImageFallback(
    imageElement
  );


  const favoriteButton =
    $(
      '.product-card__favorite',
      card
    );


  favoriteButton
    ?.addEventListener(
      'click',
      event => {
        event.preventDefault();

        event.stopPropagation();


        const active =
          toggleFavorite(
            product?.id
          );


        favoriteButton
          .classList
          .toggle(
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


        $(
          'svg',
          favoriteButton
        )?.setAttribute(
          'fill',
          active
            ? 'currentColor'
            : 'none'
        );


        if (
          typeof options
            .onFavoriteChange ===
            'function'
        ) {
          options
            .onFavoriteChange(
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
        typeof options.onOpen ===
          'function'
      ) {
        options.onOpen(
          product,
          card
        );

        return;
      }


      openProductModal(
        product,
        {
          trigger:
            card,
        }
      );
    }
  );


  return card;
}


// ============================================================
// 42. TRAINER CARD — FINAL SHARED COMPONENT
// ============================================================

export function createTrainerCard(
  trainer,
  options = {}
) {
  const name =
    trainerName(
      trainer
    );


  const specialty =
    trainerSpecialty(
      trainer
    );


  const image =
    trainerImage(
      trainer
    );


  const card =
    createElement(
      'article',
      {
        className:
          'trainer-card',

        dataset: {
          trainerId:
            trainer?.id ||
            '',
        },
      }
    );


  card.innerHTML = `
    <div class="trainer-card__media">

      ${
        image
          ? `
            <img
              class="trainer-card__image"
              src="${escapeHtml(image)}"
              alt="${escapeHtml(name)}"
              loading="lazy"
              decoding="async"
            >
          `
          : `
            <div class="trainer-card__image-fallback">
              ${escapeHtml(
                initials(name)
              )}
            </div>
          `
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


  setImageFallback(
    $(
      '.trainer-card__image',
      card
    )
  );


  card.addEventListener(
    'click',
    () => {
      if (
        typeof options.onOpen ===
          'function'
      ) {
        options.onOpen(
          trainer,
          card
        );

        return;
      }


      openTrainerModal(
        trainer,
        {
          trigger:
            card,
        }
      );
    }
  );


  return card;
}


// ============================================================
// 43. PRODUCT DETAIL MODAL
// ============================================================

export function openProductModal(
  product,
  options = {}
) {
  const name =
    productName(
      product
    );


  const image =
    productImage(
      product
    );


  const description =
    productDescription(
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
              ${escapeHtml(
                description
              )}
            </p>
          `
          : ''
      }

      <div class="product-modal__meta">

        <strong class="product-modal__price">
          ${escapeHtml(
            money(
              productPrice(
                product
              )
            )
          )}
        </strong>

        <span class="product-modal__unit">
          ${escapeHtml(
            productUnitLabel(
              product
            )
          )}
        </span>

      </div>


      <div class="product-modal__facts">

        <div>
          <span>Stok</span>
          <strong>
            ${escapeHtml(
              String(
                productStock(
                  product
                )
              )
            )}
          </strong>
        </div>

        ${
          productCategory(
            product
          )
            ? `
              <div>
                <span>Kateqoriya</span>
                <strong>
                  ${escapeHtml(
                    productCategory(
                      product
                    )
                  )}
                </strong>
              </div>
            `
            : ''
        }

        ${
          productSku(
            product
          )
            ? `
              <div>
                <span>SKU</span>
                <strong>
                  ${escapeHtml(
                    productSku(
                      product
                    )
                  )}
                </strong>
              </div>
            `
            : ''
        }

      </div>

    </div>
  `;


  return openModal({
    eyebrow:
      'SKy Fit Shop',

    title:
      name,

    content,

    trigger:
      options.trigger,
  });
}


// ============================================================
// 44. TRAINER DETAIL MODAL
// ============================================================

export function openTrainerModal(
  trainer,
  options = {}
) {
  const name =
    trainerName(
      trainer
    );


  const specialty =
    trainerSpecialty(
      trainer
    );


  const bio =
    trainerBio(
      trainer
    );


  const image =
    trainerImage(
      trainer
    );


  const phone =
    trainerPhone(
      trainer
    );


  const instagram =
    trainerInstagram(
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
      image
        ? `
          <div class="trainer-modal__media">

            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(name)}"
            >

          </div>
        `
        : ''
    }


    <div class="trainer-modal__content">

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
        bio
          ? `
            <p class="trainer-modal__description">
              ${escapeHtml(
                bio
              )}
            </p>
          `
          : ''
      }

      ${
        phone ||
        instagram
          ? `
            <div class="trainer-modal__links">

              ${
                phone
                  ? `
                    <a
                      href="tel:${escapeHtml(phone)}"
                      class="ui-button ui-button--glass"
                    >
                      <span class="ui-button__label">
                        Zəng et
                      </span>
                    </a>
                  `
                  : ''
              }

              ${
                instagram
                  ? `
                    <a
                      href="${escapeHtml(instagram)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ui-button ui-button--glass"
                    >
                      <span class="ui-button__label">
                        Instagram
                      </span>
                    </a>
                  `
                  : ''
              }

            </div>
          `
          : ''
      }

    </div>
  `;


  return openModal({
    eyebrow:
      'SKy Fit Komandası',

    title:
      name,

    content,

    trigger:
      options.trigger,
  });
}


// ============================================================
// 45. AUTH CHANGE LISTENER
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


  supabase.auth
    .onAuthStateChange(
      async (
        event,
        session
      ) => {
        clearIdentityCache();


        let identity =
          null;


        try {
          if (
            session?.user
          ) {
            identity =
              await getCurrentIdentity({
                force:
                  true,
              });
          }
        } catch (error) {
          console.error(
            '[SKy Fit auth]',
            error
          );
        }


        window.dispatchEvent(
          new CustomEvent(
            SKYFIT_EVENTS
              .authChange,
            {
              detail: {
                event,
                session,
                identity,
              },
            }
          )
        );
      }
    );
}


// ============================================================
// 46. SIGN OUT
// ============================================================

export async function signOut(
  options = {}
) {
  const {
    error,
  } =
    await supabase.auth
      .signOut();


  if (error) {
    if (
      options.notify !==
      false
    ) {
      notify.error(
        getErrorMessage(
          error,
          'Çıxış zamanı xəta baş verdi.'
        )
      );
    }


    return false;
  }


  clearIdentityCache();


  if (
    options.redirect !==
    false
  ) {
    window.location.replace(
      options.redirectTo ||
      APP_CONFIG.routes.login
    );
  }


  return true;
}


// ============================================================
// 47. EXTERNAL URL
// ============================================================

export async function openExternal(
  url
) {
  const target =
    normalizeString(
      url
    );


  if (
    !target ||
    !/^https?:\/\//i
      .test(target)
  ) {
    return false;
  }


  if (
    window.skyFitDesktop
      ?.isDesktop &&
    typeof window
      .skyFitDesktop
      .openExternal ===
      'function'
  ) {
    return Boolean(
      await window
        .skyFitDesktop
        .openExternal(
          target
        )
    );
  }


  window.open(
    target,
    '_blank',
    'noopener,noreferrer'
  );


  return true;
}


// ============================================================
// 48. SERVICE WORKER
// ============================================================

export async function registerServiceWorker() {
  if (
    !(
      'serviceWorker'
      in navigator
    )
  ) {
    return null;
  }


  if (
    window.location.protocol ===
      'file:'
  ) {
    return null;
  }


  try {
    return await navigator
      .serviceWorker
      .register(
        './service-worker.js',
        {
          scope:
            './',
        }
      );
  } catch (error) {
    console.error(
      '[SKy Fit SW]',
      error
    );


    return null;
  }
}


// ============================================================
// 49. CORE BOOTSTRAP
// ============================================================

export function bootstrapCore() {
  applyTheme(
    getStoredTheme(),
    {
      persist:
        false,
    }
  );


  startAuthListener();


  if (
    document.readyState ===
      'complete'
  ) {
    registerServiceWorker();
  } else {
    window.addEventListener(
      'load',
      () => {
        registerServiceWorker();
      },
      {
        once:
          true,
      }
    );
  }
}


// ============================================================
// 50. READY HELPER
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
        once:
          true,
      }
    );

    return;
  }


  callback();
}


// ============================================================
// 51. RUN BOOTSTRAP ONCE
// ============================================================

bootstrapCore();


// ============================================================
// SKY FIT PRO CORE.JS COMPLETE
// ============================================================
