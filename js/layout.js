// ============================================================
// SKY FIT PRO
// Shared Layout Engine
// File: js/layout.js
// ============================================================

import {
  APP_CONFIG,
  USER_ROLES,
} from './config.js';

import {
  $,
  byId,
  createElement,
  getCurrentIdentity,
  getProfileName,
  getInitials,
  getPublicStorageUrl,
  roleLabel,
  currentPage,
  cycleTheme,
  getStoredTheme,
  signOut,
  confirmDialog,
  notify,
} from './core.js';


// ============================================================
// 01. ICONS
// ============================================================

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
        stroke-width="1.8"
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
        stroke-width="1.8"
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
        d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        stroke-width="1.7"
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
        d="M5 8h14l-1 12H6L5 8Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <path
        d="M9 9V6a3 3 0 0 1 6 0v3"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>
  `,

  favorite: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 20.2 4.9 13.6C1 10 3.3 4.5 7.7 4.5c1.8 0 3.3 1 4.3 2.3 1-1.3 2.5-2.3 4.3-2.3 4.4 0 6.7 5.5 2.8 9.1L12 20.2Z"
        stroke="currentColor"
        stroke-width="1.7"
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
        stroke-width="1.7"
      />
      <path
        d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </svg>
  `,

  admin: `
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
        rx="1.5"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        stroke-width="1.7"
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
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <path
        d="M14 8l4 4-4 4M9 12h9"
        stroke="currentColor"
        stroke-width="1.7"
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
        stroke-width="1.7"
        stroke-linecap="round"
      />
      <path
        d="M14 8l4 4-4 4M9 12h9"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
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
        d="M20 15.1A8 8 0 0 1 8.9 4a8 8 0 1 0 11.1 11.1Z"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
    </svg>
  `,
});


// ============================================================
// 02. LAYOUT STATE
// ============================================================

let layoutIdentity = null;
let drawerOpen = false;


// ============================================================
// 03. BRAND MARKUP
// ============================================================

function brandMarkup() {
  return `
    <a
      href="${APP_CONFIG.routes.home}"
      class="brand-mark"
      aria-label="SKy Fit ana səhifə"
    >
      <span class="brand-mark__icon">
        SK
      </span>

      <span class="brand-mark__text">
        <strong>SKy Fit</strong>
        <small>PRO</small>
      </span>
    </a>
  `;
}


// ============================================================
// 04. AVATAR
// ============================================================

function getAvatarUrl(profile) {
  const path =
    profile?.avatar_url ||
    profile?.avatar_path ||
    '';

  if (!path) {
    return '';
  }

  return getPublicStorageUrl(
    APP_CONFIG.storage.avatars,
    path
  );
}


function avatarMarkup(
  profile,
  user,
  {
    className = '',
  } = {}
) {
  const firstName =
    profile?.first_name ||
    profile?.name ||
    '';

  const lastName =
    profile?.last_name ||
    '';

  const initials =
    getInitials(
      firstName,
      lastName
    );

  const avatarUrl =
    getAvatarUrl(profile);

  return `
    <span class="${className}">
      ${
        avatarUrl
          ? `
            <img
              src="${avatarUrl}"
              alt="${getProfileName(
                profile,
                user
              )}"
            >
          `
          : initials
      }
    </span>
  `;
}


// ============================================================
// 05. HEADER
// ============================================================

function renderHeader(identity) {
  const root =
    byId('app-header-root');

  if (!root) return;

  root.innerHTML = '';

  const header =
    createElement(
      'header',
      {
        className:
          'app-header',
      }
    );

  const isAuthenticated =
    identity?.isAuthenticated;

  header.innerHTML = `
    <div class="app-header__inner">

      <div class="app-header__side">

        <button
          id="app-menu-button"
          class="app-header__menu"
          type="button"
          aria-label="Menyunu aç"
          aria-expanded="false"
        >
          ${ICONS.menu}
        </button>

        ${brandMarkup()}

      </div>


      <div class="app-header__side">

        ${
          isAuthenticated
            ? `
              <a
                href="${APP_CONFIG.routes.favorites}"
                class="app-header__action"
                aria-label="Sevimlilər"
              >
                ${ICONS.favorite}
              </a>

              <a
                href="${APP_CONFIG.routes.profile}"
                class="app-header__profile"
                aria-label="Profil"
              >
                ${
                  avatarMarkup(
                    identity.profile,
                    identity.user
                  )
                }
              </a>
            `
            : `
              <a
                href="${APP_CONFIG.routes.login}"
                class="app-header__action"
                aria-label="Daxil ol"
              >
                ${ICONS.login}
              </a>
            `
        }

      </div>

    </div>
  `;

  root.append(header);

  const menuButton =
    byId('app-menu-button');

  menuButton?.addEventListener(
    'click',
    openDrawer
  );
}


// ============================================================
// 06. DRAWER LINKS
// ============================================================

function getDrawerLinks(identity) {
  const links = [
    {
      key: 'home',
      label: 'Ana səhifə',
      href:
        APP_CONFIG.routes.home,
      icon: ICONS.home,
    },

    {
      key: 'shop',
      label: 'Məhsullar',
      href:
        `${APP_CONFIG.routes.home}#products`,
      icon: ICONS.shop,
    },

    {
      key: 'favorites',
      label: 'Sevimlilər',
      href:
        APP_CONFIG.routes.favorites,
      icon: ICONS.favorite,
    },
  ];

  if (identity?.isAuthenticated) {
    links.push({
      key: 'profile',
      label: 'Profil',
      href:
        APP_CONFIG.routes.profile,
      icon: ICONS.profile,
    });
  }

  if (identity?.isStaff) {
    links.push({
      key: 'admin',
      label: 'İdarəetmə',
      href:
        APP_CONFIG.routes.admin,
      icon: ICONS.admin,
    });
  }

  return links;
}


// ============================================================
// 07. DRAWER
// ============================================================

function renderDrawer(identity) {
  const root =
    byId('app-drawer-root');

  if (!root) return;

  root.innerHTML = '';

  const backdrop =
    createElement(
      'div',
      {
        className:
          'app-drawer-backdrop',
      }
    );

  const drawer =
    createElement(
      'aside',
      {
        className:
          'app-drawer',
        attrs: {
          'aria-hidden':
            'true',
        },
      }
    );

  const page =
    currentPage();

  const links =
    getDrawerLinks(identity);

  const profileName =
    getProfileName(
      identity?.profile,
      identity?.user
    );

  const email =
    identity?.user?.email ||
    '';

  drawer.innerHTML = `
    <div class="app-drawer__inner">

      <div class="app-drawer__header">

        ${brandMarkup()}

        <button
          id="app-drawer-close"
          class="app-drawer__close"
          type="button"
          aria-label="Menyunu bağla"
        >
          ${ICONS.close}
        </button>

      </div>


      ${
        identity?.isAuthenticated
          ? `
            <a
              href="${APP_CONFIG.routes.profile}"
              class="app-drawer__profile"
            >

              ${
                avatarMarkup(
                  identity.profile,
                  identity.user,
                  {
                    className:
                      'app-drawer__avatar',
                  }
                )
              }

              <span class="app-drawer__identity">

                <strong>
                  ${profileName}
                </strong>

                <span>
                  ${
                    roleLabel(
                      identity.role
                    )
                  }
                  ${
                    email
                      ? ` · ${email}`
                      : ''
                  }
                </span>

              </span>

            </a>
          `
          : `
            <div class="app-drawer__profile">

              <span class="app-drawer__avatar">
                SK
              </span>

              <span class="app-drawer__identity">

                <strong>
                  Qonaq
                </strong>

                <span>
                  SKy Fit Pro
                </span>

              </span>

            </div>
          `
      }


      <nav
        class="app-drawer__nav"
        aria-label="Əsas menyu"
      >

        ${links
          .map(link => {
            const active =
              page === link.key ||
              (
                link.key === 'home' &&
                page === 'home'
              );

            return `
              <a
                href="${link.href}"
                class="app-drawer__link ${
                  active
                    ? 'is-active'
                    : ''
                }"
              >

                <span class="app-drawer__link-icon">
                  ${link.icon}
                </span>

                <span>
                  ${link.label}
                </span>

              </a>
            `;
          })
          .join('')}

      </nav>


      <div class="app-drawer__footer">

        <button
          id="app-theme-button"
          class="app-drawer__link"
          type="button"
        >

          <span class="app-drawer__link-icon">
            ${ICONS.theme}
          </span>

          <span id="app-theme-label">
            Görünüş
          </span>

        </button>


        ${
          identity?.isAuthenticated
            ? `
              <button
                id="app-logout-button"
                class="app-drawer__link"
                type="button"
              >

                <span class="app-drawer__link-icon">
                  ${ICONS.logout}
                </span>

                <span>
                  Çıxış et
                </span>

              </button>
            `
            : `
              <a
                href="${APP_CONFIG.routes.login}"
                class="app-drawer__link"
              >

                <span class="app-drawer__link-icon">
                  ${ICONS.login}
                </span>

                <span>
                  Daxil ol
                </span>

              </a>
            `
        }

      </div>

    </div>
  `;

  root.append(
    backdrop,
    drawer
  );

  backdrop.addEventListener(
    'click',
    closeDrawer
  );

  byId(
    'app-drawer-close'
  )?.addEventListener(
    'click',
    closeDrawer
  );

  byId(
    'app-theme-button'
  )?.addEventListener(
    'click',
    handleThemeCycle
  );

  byId(
    'app-logout-button'
  )?.addEventListener(
    'click',
    handleLogout
  );

  syncThemeLabel();
}


// ============================================================
// 08. DRAWER CONTROL
// ============================================================

export function openDrawer() {
  const drawer =
    $('.app-drawer');

  const backdrop =
    $('.app-drawer-backdrop');

  const button =
    byId('app-menu-button');

  if (
    !drawer ||
    !backdrop
  ) {
    return;
  }

  drawerOpen = true;

  drawer.classList.add(
    'is-open'
  );

  backdrop.classList.add(
    'is-open'
  );

  drawer.setAttribute(
    'aria-hidden',
    'false'
  );

  button?.setAttribute(
    'aria-expanded',
    'true'
  );

  document.body.classList.add(
    'is-scroll-locked'
  );
}


export function closeDrawer() {
  const drawer =
    $('.app-drawer');

  const backdrop =
    $('.app-drawer-backdrop');

  const button =
    byId('app-menu-button');

  if (
    !drawer ||
    !backdrop
  ) {
    return;
  }

  drawerOpen = false;

  drawer.classList.remove(
    'is-open'
  );

  backdrop.classList.remove(
    'is-open'
  );

  drawer.setAttribute(
    'aria-hidden',
    'true'
  );

  button?.setAttribute(
    'aria-expanded',
    'false'
  );

  document.body.classList.remove(
    'is-scroll-locked'
  );
}


// ============================================================
// 09. BOTTOM NAV
// ============================================================

function getBottomNavigation(
  identity
) {
  const items = [
    {
      key: 'home',
      label: 'Ana səhifə',
      href:
        APP_CONFIG.routes.home,
      icon: ICONS.home,
    },

    {
      key: 'shop',
      label: 'Mağaza',
      href:
        `${APP_CONFIG.routes.home}#products`,
      icon: ICONS.shop,
    },

    {
      key: 'favorites',
      label: 'Sevimli',
      href:
        APP_CONFIG.routes.favorites,
      icon: ICONS.favorite,
    },
  ];

  if (identity?.isStaff) {
    items.push({
      key: 'admin',
      label: 'İdarəetmə',
      href:
        APP_CONFIG.routes.admin,
      icon: ICONS.admin,
    });
  } else {
    items.push({
      key: 'profile',
      label:
        identity?.isAuthenticated
          ? 'Profil'
          : 'Daxil ol',
      href:
        identity?.isAuthenticated
          ? APP_CONFIG.routes.profile
          : APP_CONFIG.routes.login,
      icon:
        identity?.isAuthenticated
          ? ICONS.profile
          : ICONS.login,
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


function renderBottomNavigation(
  identity
) {
  const root =
    byId(
      'app-bottom-nav-root'
    );

  if (!root) return;

  root.innerHTML = '';

  const page =
    currentPage();

  const items =
    getBottomNavigation(
      identity
    );

  const nav =
    createElement(
      'nav',
      {
        className:
          'app-bottom-nav',
        attrs: {
          'aria-label':
            'Aşağı naviqasiya',
        },
      }
    );

  nav.innerHTML = `
    <div class="app-bottom-nav__inner">

      ${items
        .map(item => {
          let active = false;

          if (
            item.key === 'home' &&
            page === 'home'
          ) {
            active = true;
          }

          if (
            item.key === 'favorites' &&
            page === 'favorites'
          ) {
            active = true;
          }

          if (
            item.key === 'profile' &&
            page === 'profile'
          ) {
            active = true;
          }

          if (
            item.key === 'admin' &&
            page === 'admin'
          ) {
            active = true;
          }

          const tag =
            item.action
              ? 'button'
              : 'a';

          const href =
            item.action
              ? ''
              : `href="${item.href}"`;

          const type =
            item.action
              ? 'type="button"'
              : '';

          const action =
            item.action
              ? `data-layout-action="${item.action}"`
              : '';

          return `
            <${tag}
              ${href}
              ${type}
              ${action}
              class="app-bottom-nav__item ${
                active
                  ? 'is-active'
                  : ''
              }"
            >

              <span class="app-bottom-nav__icon">
                ${item.icon}
              </span>

              <span class="app-bottom-nav__label">
                ${item.label}
              </span>

            </${tag}>
          `;
        })
        .join('')}

    </div>
  `;

  root.append(nav);

  $('[data-layout-action="drawer"]')
    ?.addEventListener(
      'click',
      openDrawer
    );
}


// ============================================================
// 10. FOOTER
// ============================================================

function renderFooter() {
  const root =
    byId('app-footer-root');

  if (!root) return;

  root.innerHTML = '';

  const year =
    new Date().getFullYear();

  const footer =
    createElement(
      'footer',
      {
        className:
          'app-footer',
      }
    );

  footer.innerHTML = `
    <div class="app-footer__inner">

      <span class="app-footer__copy">
        © ${year} SKy Fit Pro
      </span>

      <div class="app-footer__links">

        <a
          href="${APP_CONFIG.routes.home}"
        >
          Ana səhifə
        </a>

        <a
          href="${APP_CONFIG.routes.home}#trainers"
        >
          Məşqçilər
        </a>

        <a
          href="${APP_CONFIG.routes.home}#products"
        >
          Məhsullar
        </a>

      </div>

    </div>
  `;

  root.append(footer);
}


// ============================================================
// 11. THEME
// ============================================================

function themeLabel() {
  switch (
    getStoredTheme()
  ) {
    case 'dark':
      return 'Tünd rejim';

    case 'light':
      return 'Açıq rejim';

    default:
      return 'Sistem rejimi';
  }
}


function syncThemeLabel() {
  const label =
    byId('app-theme-label');

  if (label) {
    label.textContent =
      themeLabel();
  }
}


function handleThemeCycle() {
  const next =
    cycleTheme();

  syncThemeLabel();

  const label =
    next === 'dark'
      ? 'Tünd rejim'
      : next === 'light'
        ? 'Açıq rejim'
        : 'Sistem rejimi';

  notify.info(
    `${label} aktiv edildi.`
  );
}


window.addEventListener(
  'skyfit:themechange',
  syncThemeLabel
);


// ============================================================
// 12. LOGOUT
// ============================================================

async function handleLogout() {
  const confirmed =
    await confirmDialog({
      eyebrow: 'Hesab',
      title: 'Çıxış edilsin?',
      message:
        'Cari SKy Fit sessiyası bağlanacaq.',
      confirmText: 'Çıxış et',
      cancelText: 'Ləğv et',
      danger: true,
    });

  if (!confirmed) {
    return;
  }

  await signOut();
}


// ============================================================
// 13. ESCAPE / KEYBOARD
// ============================================================

document.addEventListener(
  'keydown',
  event => {
    if (
      event.key === 'Escape' &&
      drawerOpen
    ) {
      closeDrawer();
    }
  }
);


// ============================================================
// 14. AUTH CHANGE
// ============================================================

window.addEventListener(
  'skyfit:authchange',
  async () => {
    await refreshLayout();
  }
);


// ============================================================
// 15. REFRESH LAYOUT
// ============================================================

export async function refreshLayout() {
  layoutIdentity =
    await getCurrentIdentity();

  renderHeader(
    layoutIdentity
  );

  renderDrawer(
    layoutIdentity
  );

  renderBottomNavigation(
    layoutIdentity
  );

  renderFooter();

  return layoutIdentity;
}


// ============================================================
// 16. INIT
// ============================================================

export async function initLayout() {
  return refreshLayout();
}


// ============================================================
// LAYOUT.JS COMPLETE
// ============================================================
