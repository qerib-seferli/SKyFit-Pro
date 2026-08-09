// SKy Fit Pro — ortaq tətbiq layout-u
// Senior Full Stack Developer: Qərib Səfərli

import { APP_CONFIG } from './config.js';

import {
  SKYFIT_EVENTS,
  $,
  $$,
  byId,
  createElement,
  normalizeString,
  escapeHtml,
  initials,
  getCurrentIdentity,
  getProfileName,
  getProfileInitials,
  getProfileAvatar,
  roleLabel,
  getStoredTheme,
  cycleTheme,
  confirmDialog,
  notify,
  signOut,
} from './core.js';

const ICONS = Object.freeze({

  menu: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
    </svg>
  `,


  close: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
    </svg>
  `,


  home: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 10.2 12 4l7.5 6.2v8.3a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6h-3.6V20H6a1.5 1.5 0 0 1-1.5-1.5v-8.3Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    </svg>
  `,


  shop: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 8.5h14l-1.1 11H6.1L5 8.5Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />

      <path
        d="M9 9V6.8a3 3 0 1 1 6 0V9"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
  `,


  heart: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 20.1 5 13.6C1.2 10.1 3.4 4.7 7.7 4.7c1.8 0 3.4 1 4.3 2.4.9-1.4 2.5-2.4 4.3-2.4 4.3 0 6.5 5.4 2.7 8.9L12 20.1Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    </svg>
  `,


  profile: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        stroke-width="1.75"
      />

      <path
        d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
  `,


  dashboard: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        stroke-width="1.7"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        stroke-width="1.7"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        stroke-width="1.7"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1.4"
        stroke="currentColor"
        stroke-width="1.7"
      />
    </svg>
  `,


  theme: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    </svg>
  `,


  login: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />

      <path
        d="m14 8 4 4-4 4M9 12h9"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,


  logout: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />

      <path
        d="m15 8 4 4-4 4M10 12h9"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,


  chevron: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
});

const AUTH_PAGES = new Set([
  'login',
  'register',
  'reset-password',
  'update-password',
]);

const LAYOUT_CACHE_KEY = 'skyfit-layout-identity-v1';
const DESKTOP_DRAWER_BREAKPOINT = 1180;
const IDENTITY_REFRESH_INTERVAL = 5 * 60 * 1000;

const state = {
  identity: null,
  hydrated: false,
  drawerOpen: false,
  shellRendered: false,
  hydrationPromise: null,
};

let lastIdentityRefresh = Date.now();
let previousDrawerFocus = null;
let resizeTimer = null;

function currentPage() {
  const declared = normalizeString(document.body?.dataset?.page);
  if (declared) return declared;

  const file = normalizeString(
    window.location.pathname.split('/').pop(),
    'index.html'
  ).toLowerCase();

  const map = {
    'index.html': 'home',
    'favorites.html': 'favorites',
    'profile.html': 'profile',
    'admin.html': 'admin',
    'login.html': 'login',
    'register.html': 'register',
    'reset-password.html': 'reset-password',
    'update-password.html': 'update-password',
  };

  return map[file] || 'home';
}

function isAuthPage() {
  return AUTH_PAGES.has(currentPage());
}

function ensureRoot(id, position = 'beforeend') {
  const existing = byId(id);
  if (existing) return existing;

  const root = createElement('div', {
    attrs: { id },
  });

  if (position === 'afterbegin') {
    document.body.prepend(root);
  } else {
    document.body.append(root);
  }

  return root;
}

function brandMarkup(compact = false) {
  return `
    <a
      href="${APP_CONFIG.routes.home}"
      class="brand-mark${compact ? ' brand-mark--compact' : ''}"
      aria-label="SKy Fit ana səhifə"
    >
      <span class="brand-mark__icon" aria-hidden="true">SK</span>
      <span class="brand-mark__text">
        <strong>${escapeHtml(APP_CONFIG.shortName)}</strong>
        <small>PRO</small>
      </span>
    </a>
  `;
}

function shellIdentity() {
  return {
    authenticated: false,
    profile: null,
    role: 'member',
    isAdmin: false,
    isStaff: false,
    name: APP_CONFIG.shortName,
    email: '',
    avatar: '',
  };
}

function normalizedIdentity(identity) {
  if (!identity) return shellIdentity();

  return {
    authenticated: Boolean(identity.authenticated),
    profile: identity.profile || null,
    role: normalizeString(identity.role, 'member'),
    isAdmin: Boolean(identity.isAdmin),
    isStaff: Boolean(identity.isStaff),
    name: normalizeString(identity.name, APP_CONFIG.shortName),
    email: normalizeString(identity.email),
    avatar: normalizeString(identity.avatar),
  };
}

function avatarMarkup(identity, className = 'app-user-avatar') {
  const current = normalizedIdentity(identity);
  const profile = current.profile;

  const name = profile
    ? getProfileName(profile, current.name)
    : current.name;

  const avatar = profile
    ? getProfileAvatar(profile)
    : current.avatar;

  const fallback = profile
    ? getProfileInitials(profile)
    : initials(name, 'SK');

  return `
    <span class="${className}">
      ${
        True: ""
      }
      ${avatar ? `
        <img
          src="${escapeHtml(avatar)}"
          alt="${escapeHtml(name)}"
          loading="eager"
          decoding="async"
        >
      ` : ''}
      <span
        class="${className}__initials${avatar ? ' is-hidden' : ''}"
        aria-hidden="true"
      >
        ${escapeHtml(fallback)}
      </span>
    </span>
  `;
}

function bindAvatarFallbacks(root = document) {
  $$(
    '.app-header__avatar img, .app-drawer__avatar img',
    root
  ).forEach(image => {
    image.addEventListener(
      'error',
      () => {
        const wrapper = image.parentElement;
        const fallback = wrapper?.querySelector('[class$="__initials"]');

        image.remove();
        fallback?.classList.remove('is-hidden');
      },
      { once: true }
    );
  });
}

function renderHeader(identity = shellIdentity()) {
  const root = ensureRoot('app-header-root', 'afterbegin');
  const current = normalizedIdentity(identity);

  root.innerHTML = `
    <header class="app-header">
      <div class="app-header__inner">
        <div class="app-header__side app-header__side--start">
          <button
            id="app-menu-button"
            class="app-header__menu"
            type="button"
            aria-label="Menyunu aç"
            aria-controls="app-drawer"
            aria-expanded="${state.drawerOpen ? 'true' : 'false'}"
          >
            ${ICONS.menu}
          </button>
          ${brandMarkup()}
        </div>

        <div class="app-header__side app-header__side--end">
          <a
            href="${APP_CONFIG.routes.favorites}"
            class="app-header__action"
            aria-label="Sevimlilər"
          >
            ${ICONS.heart}
          </a>

          ${current.authenticated ? `
            <a
              href="${APP_CONFIG.routes.profile}"
              class="app-header__profile"
              aria-label="${escapeHtml(current.name)}"
              title="${escapeHtml(current.name)}"
            >
              ${avatarMarkup(current, 'app-header__avatar')}
            </a>
          ` : `
            <a
              href="${APP_CONFIG.routes.login}"
              class="app-header__action app-header__action--login"
              aria-label="Daxil ol"
            >
              ${ICONS.login}
            </a>
          `}
        </div>
      </div>
    </header>
  `;

  byId('app-menu-button')?.addEventListener('click', openDrawer);
  bindAvatarFallbacks(root);
}

function drawerLinks(identity) {
  const current = normalizedIdentity(identity);

  const links = [
    {
      key: 'home',
      label: 'Ana səhifə',
      href: APP_CONFIG.routes.home,
      icon: ICONS.home,
    },
    {
      key: 'shop',
      label: 'Məhsullar',
      href: `${APP_CONFIG.routes.home}#products`,
      icon: ICONS.shop,
    },
    {
      key: 'favorites',
      label: 'Sevimlilər',
      href: APP_CONFIG.routes.favorites,
      icon: ICONS.heart,
    },
  ];

  if (current.authenticated) {
    links.push({
      key: 'profile',
      label: 'Profil',
      href: APP_CONFIG.routes.profile,
      icon: ICONS.profile,
    });
  }

  if (current.isStaff) {
    links.push({
      key: 'admin',
      label: 'İdarəetmə',
      href: APP_CONFIG.routes.admin,
      icon: ICONS.dashboard,
    });
  }

  return links;
}

function linkIsActive(key) {
  const page = currentPage();
  const productsHash =
    page === 'home' &&
    window.location.hash === '#products';

  if (key === 'shop') return productsHash;
  if (key === 'home') return page === 'home' && !productsHash;
  if (key === 'favorites') return page === 'favorites';
  if (key === 'profile') return page === 'profile';
  if (key === 'admin') return page === 'admin';

  return false;
}

function themeLabel() {
  switch (getStoredTheme()) {
    case 'dark':
      return 'Tünd rejim';
    case 'light':
      return 'Açıq rejim';
    default:
      return 'Sistem rejimi';
  }
}

function renderDrawer(identity = shellIdentity()) {
  const root = ensureRoot('app-drawer-root');
  const current = normalizedIdentity(identity);
  const links = drawerLinks(current);

  const displayName = current.authenticated ? current.name : 'Qonaq';
  const secondaryText = current.authenticated
    ? [roleLabel(current.role), current.email].filter(Boolean).join(' · ')
    : APP_CONFIG.name;

  root.innerHTML = `
    <div
      class="app-drawer-backdrop${state.drawerOpen ? ' is-open' : ''}"
      aria-hidden="true"
    ></div>

    <aside
      id="app-drawer"
      class="app-drawer${state.drawerOpen ? ' is-open' : ''}"
      role="dialog"
      aria-modal="true"
      aria-label="Əsas menyu"
      aria-hidden="${state.drawerOpen ? 'false' : 'true'}"
    >
      <div class="app-drawer__inner">
        <div class="app-drawer__header">
          ${brandMarkup(true)}

          <button
            id="app-drawer-close"
            class="app-drawer__close"
            type="button"
            aria-label="Menyunu bağla"
          >
            ${ICONS.close}
          </button>
        </div>

        ${current.authenticated ? `
          <a
            href="${APP_CONFIG.routes.profile}"
            class="app-drawer__profile"
          >
            ${avatarMarkup(current, 'app-drawer__avatar')}

            <span class="app-drawer__identity">
              <strong class="app-drawer__identity-name">
                ${escapeHtml(displayName)}
              </strong>
              <span class="app-drawer__identity-meta">
                ${escapeHtml(secondaryText)}
              </span>
            </span>

            <span class="app-drawer__profile-arrow" aria-hidden="true">
              ${ICONS.chevron}
            </span>
          </a>
        ` : `
          <div class="app-drawer__profile">
            ${avatarMarkup(current, 'app-drawer__avatar')}
            <span class="app-drawer__identity">
              <strong class="app-drawer__identity-name">Qonaq</strong>
              <span class="app-drawer__identity-meta">
                ${escapeHtml(APP_CONFIG.name)}
              </span>
            </span>
          </div>
        `}

        <nav class="app-drawer__nav" aria-label="Əsas menyu">
          ${links.map(link => `
            <a
              href="${link.href}"
              class="app-drawer__link${linkIsActive(link.key) ? ' is-active' : ''}"
              ${linkIsActive(link.key) ? 'aria-current="page"' : ''}
            >
              <span class="app-drawer__link-icon" aria-hidden="true">
                ${link.icon}
              </span>
              <span class="app-drawer__link-label">
                ${escapeHtml(link.label)}
              </span>
            </a>
          `).join('')}
        </nav>

        <div class="app-drawer__footer">
          <button
            id="app-theme-button"
            class="app-drawer__link"
            type="button"
          >
            <span class="app-drawer__link-icon" aria-hidden="true">
              ${ICONS.theme}
            </span>
            <span id="app-theme-label" class="app-drawer__link-label">
              ${escapeHtml(themeLabel())}
            </span>
          </button>

          ${current.authenticated ? `
            <button
              id="app-logout-button"
              class="app-drawer__link app-drawer__link--danger"
              type="button"
            >
              <span class="app-drawer__link-icon" aria-hidden="true">
                ${ICONS.logout}
              </span>
              <span class="app-drawer__link-label">Çıxış et</span>
            </button>
          ` : `
            <a
              href="${APP_CONFIG.routes.login}"
              class="app-drawer__link"
            >
              <span class="app-drawer__link-icon" aria-hidden="true">
                ${ICONS.login}
              </span>
              <span class="app-drawer__link-label">Daxil ol</span>
            </a>
          `}
        </div>
      </div>
    </aside>
  `;

  $('.app-drawer-backdrop', root)?.addEventListener('click', closeDrawer);
  byId('app-drawer-close')?.addEventListener('click', closeDrawer);
  byId('app-theme-button')?.addEventListener('click', handleThemeCycle);
  byId('app-logout-button')?.addEventListener('click', handleLogout);
  bindAvatarFallbacks(root);
}

function drawerFocusableElements() {
  const drawer = $('.app-drawer');
  if (!drawer) return [];

  return $$(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    drawer
  ).filter(element => !element.hidden);
}

function handleDrawerKeydown(event) {
  if (!state.drawerOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeDrawer();
    return;
  }

  if (event.key !== 'Tab') return;

  const focusable = drawerFocusableElements();
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openDrawer() {
  if (state.drawerOpen) return;

  state.drawerOpen = true;
  previousDrawerFocus = document.activeElement;

  const drawer = $('.app-drawer');
  const backdrop = $('.app-drawer-backdrop');

  drawer?.classList.add('is-open');
  drawer?.setAttribute('aria-hidden', 'false');
  backdrop?.classList.add('is-open');

  byId('app-menu-button')?.setAttribute('aria-expanded', 'true');
  document.body.classList.add('is-scroll-locked');

  requestAnimationFrame(() => {
    byId('app-drawer-close')?.focus();
  });
}

export function closeDrawer() {
  if (!state.drawerOpen) return;

  state.drawerOpen = false;

  const drawer = $('.app-drawer');
  const backdrop = $('.app-drawer-backdrop');

  drawer?.classList.remove('is-open');
  drawer?.setAttribute('aria-hidden', 'true');
  backdrop?.classList.remove('is-open');

  byId('app-menu-button')?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('is-scroll-locked');

  const focusTarget = previousDrawerFocus;
  previousDrawerFocus = null;

  if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {
    focusTarget.focus();
  }
}

function bottomItems(identity) {
  const current = normalizedIdentity(identity);

  const items = [
    {
      key: 'home',
      label: 'Ana səhifə',
      href: APP_CONFIG.routes.home,
      icon: ICONS.home,
    },
    {
      key: 'shop',
      label: 'Mağaza',
      href: `${APP_CONFIG.routes.home}#products`,
      icon: ICONS.shop,
    },
    {
      key: 'favorites',
      label: 'Sevimli',
      href: APP_CONFIG.routes.favorites,
      icon: ICONS.heart,
    },
  ];

  if (current.isStaff) {
    items.push({
      key: 'admin',
      label: 'Panel',
      href: APP_CONFIG.routes.admin,
      icon: ICONS.dashboard,
    });
  } else {
    items.push({
      key: 'profile',
      label: current.authenticated ? 'Profil' : 'Daxil ol',
      href: current.authenticated
        ? APP_CONFIG.routes.profile
        : APP_CONFIG.routes.login,
      icon: current.authenticated ? ICONS.profile : ICONS.login,
    });
  }

  items.push({
    key: 'menu',
    label: 'Menyu',
    href: '#',
    icon: ICONS.menu,
    action: 'drawer',
  });

  return items;
}

function renderBottomNavigation(identity = shellIdentity()) {
  const root = ensureRoot('app-bottom-nav-root');

  if (isAuthPage()) {
    root.replaceChildren();
    return;
  }

  const items = bottomItems(identity);

  root.innerHTML = `
    <nav class="app-bottom-nav" aria-label="Aşağı naviqasiya">
      <div class="app-bottom-nav__inner">
        ${items.map(item => {
          if (item.action === 'drawer') {
            return `
              <button
                type="button"
                class="app-bottom-nav__item"
                data-layout-action="drawer"
                aria-label="Menyu"
                aria-controls="app-drawer"
                aria-expanded="${state.drawerOpen ? 'true' : 'false'}"
              >
                <span class="app-bottom-nav__icon" aria-hidden="true">
                  ${item.icon}
                </span>
                <span class="app-bottom-nav__label">
                  ${escapeHtml(item.label)}
                </span>
              </button>
            `;
          }

          const active = linkIsActive(item.key);

          return `
            <a
              href="${item.href}"
              class="app-bottom-nav__item${active ? ' is-active' : ''}"
              ${active ? 'aria-current="page"' : ''}
            >
              <span class="app-bottom-nav__icon" aria-hidden="true">
                ${item.icon}
              </span>
              <span class="app-bottom-nav__label">
                ${escapeHtml(item.label)}
              </span>
            </a>
          `;
        }).join('')}
      </div>
    </nav>
  `;

  $('[data-layout-action="drawer"]', root)
    ?.addEventListener('click', openDrawer);
}

function renderFooter() {
  const root = ensureRoot('app-footer-root');

  if (isAuthPage()) {
    root.replaceChildren();
    return;
  }

  const year = new Date().getFullYear();
  const developer = escapeHtml(
    APP_CONFIG.developer || 'Qərib Səfərli'
  );
  const title = escapeHtml(
    APP_CONFIG.developerTitle || 'Senior Full Stack Developer'
  );

  root.innerHTML = `
    <footer class="app-footer">
      <div class="app-footer__inner">
        <div class="app-footer__brand">
          <span class="app-footer__copy">
            © ${year} ${escapeHtml(APP_CONFIG.name)}
          </span>
          <span class="app-footer__separator" aria-hidden="true"></span>
          <span class="app-footer__developer">
            ${title}: <strong>${developer}</strong>
          </span>
        </div>
      </div>
    </footer>
  `;
}

function saveLayoutIdentity(identity) {
  try {
    const current = normalizedIdentity(identity);

    sessionStorage.setItem(
      LAYOUT_CACHE_KEY,
      JSON.stringify({
        authenticated: current.authenticated,
        role: current.role,
        isAdmin: current.isAdmin,
        isStaff: current.isStaff,
        name: current.name,
        email: current.email,
        avatar: current.avatar,
      })
    );
  } catch {
    // Cache olmadan da layout işləyir.
  }
}

function readLayoutIdentity() {
  try {
    const raw = sessionStorage.getItem(LAYOUT_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return normalizedIdentity(parsed);
  } catch {
    return null;
  }
}

function clearLayoutIdentity() {
  try {
    sessionStorage.removeItem(LAYOUT_CACHE_KEY);
  } catch {
    // Cache olmadan da layout işləyir.
  }
}

function getImmediateIdentity() {
  return readLayoutIdentity() || shellIdentity();
}

function renderLayout(identity) {
  const current = normalizedIdentity(identity);
  state.identity = current;

  renderHeader(current);
  renderDrawer(current);
  renderBottomNavigation(current);
  renderFooter();

  document.documentElement.classList.add('layout-shell-ready');

  return current;
}

function renderImmediateShellFromCache() {
  if (state.shellRendered) return;

  state.shellRendered = true;
  renderLayout(getImmediateIdentity());
}

async function hydrateIdentity(options = {}) {
  if (state.hydrationPromise && !options.force) {
    return state.hydrationPromise;
  }

  state.hydrationPromise = (async () => {
    try {
      const identity = await getCurrentIdentity({
        force: Boolean(options.force),
      });

      const current = normalizedIdentity(identity);
      state.hydrated = true;

      if (current.authenticated) {
        saveLayoutIdentity(current);
      } else {
        clearLayoutIdentity();
      }

      renderLayout(current);
      return identity;
    } catch (error) {
      state.hydrated = true;
      console.error('[SKy Fit Layout] Identity hydration error:', error);
      return null;
    } finally {
      state.hydrationPromise = null;
    }
  })();

  return state.hydrationPromise;
}

export async function refreshLayout(options = {}) {
  return hydrateIdentity({
    force: options.force !== false,
  });
}

export async function initLayout() {
  renderImmediateShellFromCache();
  return hydrateIdentity();
}

function handleThemeCycle() {
  cycleTheme();

  const label = themeLabel();
  const element = byId('app-theme-label');

  if (element) element.textContent = label;

  notify.info(`${label} aktiv edildi.`);
}

async function handleLogout() {
  const confirmed = await confirmDialog({
    eyebrow: 'Hesab',
    title: 'Çıxış edilsin?',
    message: 'Cari SKy Fit sessiyası bağlanacaq.',
    confirmText: 'Çıxış et',
    cancelText: 'Ləğv et',
    danger: true,
  });

  if (!confirmed) return;

  clearLayoutIdentity();

  await signOut({
    redirect: true,
    redirectTo: APP_CONFIG.routes.login,
  });
}

function scrollToHash(hash = window.location.hash) {
  const value = normalizeString(hash);

  if (!value || value === '#') return;

  let target = null;

  try {
    target = document.querySelector(value);
  } catch {
    return;
  }

  if (!target) return;

  requestAnimationFrame(() => {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  });
}

function handleAuthChange(event) {
  const authEvent = normalizeString(event.detail?.event);
  const identity = event.detail?.identity;

  if (authEvent === 'SIGNED_OUT') {
    clearLayoutIdentity();
    state.hydrated = true;
    renderLayout(shellIdentity());
    return;
  }

  if (identity) {
    const current = normalizedIdentity(identity);
    state.hydrated = true;

    if (current.authenticated) {
      saveLayoutIdentity(current);
    } else {
      clearLayoutIdentity();
    }

    renderLayout(current);
    return;
  }

  if (
    authEvent === 'SIGNED_IN' ||
    authEvent === 'TOKEN_REFRESHED' ||
    authEvent === 'USER_UPDATED'
  ) {
    refreshLayout({ force: true });
  }
}

function handleProfileChange() {
  refreshLayout({ force: true });
}

function handleThemeChange() {
  const label = byId('app-theme-label');
  if (label) label.textContent = themeLabel();
}

function handleDocumentClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest(
    '.app-drawer__link[href], .app-drawer__profile[href]'
  );

  if (link && state.drawerOpen) {
    closeDrawer();
  }
}

function handleResize() {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (
      window.innerWidth >= DESKTOP_DRAWER_BREAKPOINT &&
      state.drawerOpen
    ) {
      closeDrawer();
    }
  }, 100);
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;

  const now = Date.now();

  if (now - lastIdentityRefresh < IDENTITY_REFRESH_INTERVAL) {
    return;
  }

  lastIdentityRefresh = now;
  refreshLayout({ force: true });
}

export function getLayoutState() {
  return {
    identity: state.identity
      ? { ...state.identity }
      : null,
    hydrated: state.hydrated,
    drawerOpen: state.drawerOpen,
    shellRendered: state.shellRendered,
  };
}

export async function refreshLayoutIdentity() {
  const result = await refreshLayout({ force: true });
  lastIdentityRefresh = Date.now();
  return result;
}

function bindGlobalLayoutEvents() {
  window.addEventListener(
    SKYFIT_EVENTS.profileChange,
    handleProfileChange
  );

  window.addEventListener(
    SKYFIT_EVENTS.authChange,
    handleAuthChange
  );

  window.addEventListener(
    SKYFIT_EVENTS.themeChange,
    handleThemeChange
  );

  window.addEventListener('hashchange', () => {
    renderBottomNavigation(state.identity || shellIdentity());
    renderDrawer(state.identity || shellIdentity());
    scrollToHash();
  });

  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', handleDrawerKeydown);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  );
}

let globalEventsBound = false;

function bootstrapLayout() {
  renderImmediateShellFromCache();

  if (!globalEventsBound) {
    globalEventsBound = true;
    bindGlobalLayoutEvents();
  }

  hydrateIdentity()
    .then(() => {
      lastIdentityRefresh = Date.now();

      if (window.location.hash) {
        setTimeout(scrollToHash, 80);
      }
    })
    .catch(error => {
      console.error(
        '[SKy Fit Layout] Bootstrap hydration error:',
        error
      );
    });
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    bootstrapLayout,
    { once: true }
  );
} else {
  bootstrapLayout();
}
