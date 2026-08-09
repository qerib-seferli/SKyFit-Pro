// ============================================================
// SKY FIT PRO
// Shared Application Layout
// File: js/layout.js
//
// PART 1 / 2
//
// Məqsəd:
// - Header dərhal render olsun
// - Bottom Navigation dərhal render olsun
// - F5 zamanı layout yoxa çıxmasın
// - Auth gözləyərkən UI sıçramasın
// - Supabase gələndə yalnız identity hydrate olunsun
// - Drawer bütün səhifələrdə eyni olsun
// - profiles.full_name və avatar_url istifadə olunsun
// ============================================================

import {
  APP_CONFIG,
} from './config.js';

import {
  SKYFIT_EVENTS,

  $,
  $$,
  byId,
  createElement,
  normalizeString,
  escapeHtml,

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


// ============================================================
// 01. ICON SYSTEM
//
// Tətbiq daxili navigasiya ikonları SVG-dir.
// assets/icons/ altındakı PNG-lər isə PWA/app icon üçündür.
// Bunları bir-birinə qarışdırmırıq.
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


// ============================================================
// 02. LAYOUT STATE
// ============================================================

const state = {

  identity: null,

  hydrated: false,

  drawerOpen: false,

  shellRendered: false,

  hydrationPromise: null,
};


// ============================================================
// 03. CURRENT PAGE
// ============================================================

function currentPage() {
  return normalizeString(
    document.body
      ?.dataset
      ?.page,
    'home'
  );
}


// ============================================================
// 04. AUTH PAGE CHECK
//
// Login/register səhifələrində bottom nav istəsək göstərilə bilər,
// amma əsas tətbiq shell-i daha kompakt qalmalıdır.
// ============================================================

function isAuthPage() {
  return [
    'login',
    'register',
    'reset-password',
    'update-password',
  ].includes(
    currentPage()
  );
}


// ============================================================
// 05. ROOT ENSURER
//
// HTML-də root varsa istifadə edir.
// Yoxdursa özü yaradır.
// Bu yanaşma F5 zamanı layout-un tam itməsinin qarşısını alır.
// ============================================================

function ensureRoot(
  id,
  position = 'beforeend'
) {
  let root =
    byId(id);


  if (root) {
    return root;
  }


  root =
    createElement(
      'div',
      {
        attrs: {
          id,
        },
      }
    );


  if (
    position ===
      'afterbegin'
  ) {
    document.body.prepend(
      root
    );
  } else {
    document.body.append(
      root
    );
  }


  return root;
}


// ============================================================
// 06. BRAND
// ============================================================

function brandMarkup(
  compact = false
) {
  return `
    <a
      href="${APP_CONFIG.routes.home}"
      class="brand-mark ${
        compact
          ? 'brand-mark--compact'
          : ''
      }"
      aria-label="SKy Fit ana səhifə"
    >

      <span
        class="brand-mark__icon"
        aria-hidden="true"
      >
        SK
      </span>

      <span class="brand-mark__text">

        <strong>
          SKy Fit
        </strong>

        <small>
          PRO
        </small>

      </span>

    </a>
  `;
}


// ============================================================
// 07. SHELL IDENTITY
//
// Supabase cavab verənə qədər boş/gizli hissələr yaratmırıq.
// Vizual ölçü sabit qalır.
// ============================================================

function shellIdentity() {
  return {
    authenticated:
      false,

    profile:
      null,

    role:
      'member',

    isAdmin:
      false,

    isStaff:
      false,

    name:
      'SKy Fit',

    email:
      '',

    avatar:
      '',
  };
}


// ============================================================
// 08. IDENTITY NORMALIZER
// ============================================================

function normalizedIdentity(
  identity
) {
  if (!identity) {
    return shellIdentity();
  }


  return {
    authenticated:
      Boolean(
        identity.authenticated
      ),

    profile:
      identity.profile ||
      null,

    role:
      normalizeString(
        identity.role,
        'member'
      ),

    isAdmin:
      Boolean(
        identity.isAdmin
      ),

    isStaff:
      Boolean(
        identity.isStaff
      ),

    name:
      normalizeString(
        identity.name,
        'SKy Fit'
      ),

    email:
      normalizeString(
        identity.email
      ),

    avatar:
      normalizeString(
        identity.avatar
      ),
  };
}


// ============================================================
// 09. AVATAR MARKUP
// ============================================================

function avatarMarkup(
  identity,
  className =
    'app-user-avatar'
) {
  const current =
    normalizedIdentity(
      identity
    );


  const profile =
    current.profile;


  const name =
    profile
      ? getProfileName(
          profile,
          current.name
        )
      : current.name;


  const avatar =
    profile
      ? getProfileAvatar(
          profile
        )
      : current.avatar;


  const initials =
    profile
      ? getProfileInitials(
          profile
        )
      : 'SK';


  if (avatar) {
    return `
      <span class="${className}">

        <img
          src="${escapeHtml(avatar)}"
          alt="${escapeHtml(name)}"
          loading="eager"
          decoding="async"
        >

      </span>
    `;
  }


  return `
    <span class="${className}">

      <span
        class="${className}__initials"
        aria-hidden="true"
      >
        ${escapeHtml(initials)}
      </span>

    </span>
  `;
}


// ============================================================
// 10. HEADER SHELL
//
// Bu funksiya Supabase gözləmir.
// Module işləyən kimi header görünür.
// ============================================================

function renderHeader(
  identity =
    shellIdentity()
) {
  const root =
    ensureRoot(
      'app-header-root',
      'afterbegin'
    );


  const current =
    normalizedIdentity(
      identity
    );


  root.innerHTML = `
    <header class="app-header">

      <div class="app-header__inner">

        <div class="app-header__side app-header__side--start">

          <button
            id="app-menu-button"
            class="app-header__menu"
            type="button"
            aria-label="Menyunu aç"
            aria-expanded="${
              state.drawerOpen
                ? 'true'
                : 'false'
            }"
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


          ${
            current.authenticated
              ? `
                <a
                  href="${APP_CONFIG.routes.profile}"
                  class="app-header__profile"
                  aria-label="${escapeHtml(
                    current.name
                  )}"
                  title="${escapeHtml(
                    current.name
                  )}"
                >
                  ${avatarMarkup(
                    current,
                    'app-header__avatar'
                  )}
                </a>
              `
              : `
                <a
                  href="${APP_CONFIG.routes.login}"
                  class="app-header__action app-header__action--login"
                  aria-label="Daxil ol"
                >
                  ${ICONS.login}
                </a>
              `
          }

        </div>

      </div>

    </header>
  `;


  byId(
    'app-menu-button'
  )?.addEventListener(
    'click',
    openDrawer
  );
}


// ============================================================
// 11. DRAWER LINKS
// ============================================================

function drawerLinks(
  identity
) {
  const current =
    normalizedIdentity(
      identity
    );


  const links = [
    {
      key:
        'home',

      label:
        'Ana səhifə',

      href:
        APP_CONFIG.routes.home,

      icon:
        ICONS.home,
    },

    {
      key:
        'shop',

      label:
        'Məhsullar',

      href:
        `${APP_CONFIG.routes.home}#products`,

      icon:
        ICONS.shop,
    },

    {
      key:
        'favorites',

      label:
        'Sevimlilər',

      href:
        APP_CONFIG.routes.favorites,

      icon:
        ICONS.heart,
    },
  ];


  if (
    current.authenticated
  ) {
    links.push({
      key:
        'profile',

      label:
        'Profil',

      href:
        APP_CONFIG.routes.profile,

      icon:
        ICONS.profile,
    });
  }


  if (
    current.isStaff
  ) {
    links.push({
      key:
        'admin',

      label:
        'İdarəetmə',

      href:
        APP_CONFIG.routes.admin,

      icon:
        ICONS.dashboard,
    });
  }


  return links;
}


// ============================================================
// 12. ACTIVE LINK
// ============================================================

function linkIsActive(
  key
) {
  const page =
    currentPage();


  if (
    key ===
      'home' &&
    page ===
      'home'
  ) {
    return true;
  }


  if (
    key ===
      'favorites' &&
    page ===
      'favorites'
  ) {
    return true;
  }


  if (
    key ===
      'profile' &&
    page ===
      'profile'
  ) {
    return true;
  }


  if (
    key ===
      'admin' &&
    page ===
      'admin'
  ) {
    return true;
  }


  return false;
}


// ============================================================
// 13. DRAWER RENDER
// ============================================================

function renderDrawer(
  identity =
    shellIdentity()
) {
  const root =
    ensureRoot(
      'app-drawer-root'
    );


  const current =
    normalizedIdentity(
      identity
    );


  const links =
    drawerLinks(
      current
    );


  const displayName =
    current.authenticated
      ? current.name
      : 'Qonaq';


  const secondaryText =
    current.authenticated
      ? [
          roleLabel(
            current.role
          ),

          current.email,
        ]
          .filter(Boolean)
          .join(' · ')
      : 'SKy Fit Pro';


  root.innerHTML = `
    <div
      class="app-drawer-backdrop ${
        state.drawerOpen
          ? 'is-open'
          : ''
      }"
      aria-hidden="true"
    ></div>


    <aside
      class="app-drawer ${
        state.drawerOpen
          ? 'is-open'
          : ''
      }"
      aria-hidden="${
        state.drawerOpen
          ? 'false'
          : 'true'
      }"
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


        ${
          current.authenticated
            ? `
              <a
                href="${APP_CONFIG.routes.profile}"
                class="app-drawer__profile"
              >

                ${avatarMarkup(
                  current,
                  'app-drawer__avatar'
                )}


                <span class="app-drawer__identity">

                  <strong
                    class="app-drawer__identity-name"
                  >
                    ${escapeHtml(
                      displayName
                    )}
                  </strong>

                  <span
                    class="app-drawer__identity-meta"
                  >
                    ${escapeHtml(
                      secondaryText
                    )}
                  </span>

                </span>


                <span
                  class="app-drawer__profile-arrow"
                  aria-hidden="true"
                >
                  ${ICONS.chevron}
                </span>

              </a>
            `
            : `
              <div class="app-drawer__profile">

                ${avatarMarkup(
                  current,
                  'app-drawer__avatar'
                )}


                <span class="app-drawer__identity">

                  <strong
                    class="app-drawer__identity-name"
                  >
                    Qonaq
                  </strong>

                  <span
                    class="app-drawer__identity-meta"
                  >
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
            .map(
              link => `
                <a
                  href="${link.href}"
                  class="app-drawer__link ${
                    linkIsActive(
                      link.key
                    )
                      ? 'is-active'
                      : ''
                  }"
                >

                  <span
                    class="app-drawer__link-icon"
                    aria-hidden="true"
                  >
                    ${link.icon}
                  </span>

                  <span
                    class="app-drawer__link-label"
                  >
                    ${escapeHtml(
                      link.label
                    )}
                  </span>

                </a>
              `
            )
            .join('')}

        </nav>


        <div class="app-drawer__footer">

          <button
            id="app-theme-button"
            class="app-drawer__link"
            type="button"
          >

            <span
              class="app-drawer__link-icon"
              aria-hidden="true"
            >
              ${ICONS.theme}
            </span>

            <span
              id="app-theme-label"
              class="app-drawer__link-label"
            >
              ${escapeHtml(
                themeLabel()
              )}
            </span>

          </button>


          ${
            current.authenticated
              ? `
                <button
                  id="app-logout-button"
                  class="app-drawer__link app-drawer__link--danger"
                  type="button"
                >

                  <span
                    class="app-drawer__link-icon"
                    aria-hidden="true"
                  >
                    ${ICONS.logout}
                  </span>

                  <span
                    class="app-drawer__link-label"
                  >
                    Çıxış et
                  </span>

                </button>
              `
              : `
                <a
                  href="${APP_CONFIG.routes.login}"
                  class="app-drawer__link"
                >

                  <span
                    class="app-drawer__link-icon"
                    aria-hidden="true"
                  >
                    ${ICONS.login}
                  </span>

                  <span
                    class="app-drawer__link-label"
                  >
                    Daxil ol
                  </span>

                </a>
              `
          }

        </div>

      </div>

    </aside>
  `;


  $(
    '.app-drawer-backdrop',
    root
  )?.addEventListener(
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
}


// ============================================================
// 14. THEME LABEL
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


// ============================================================
// 15. DRAWER OPEN
// ============================================================

export function openDrawer() {
  state.drawerOpen =
    true;


  const drawer =
    $('.app-drawer');


  const backdrop =
    $('.app-drawer-backdrop');


  drawer?.classList.add(
    'is-open'
  );


  drawer?.setAttribute(
    'aria-hidden',
    'false'
  );


  backdrop?.classList.add(
    'is-open'
  );


  byId(
    'app-menu-button'
  )?.setAttribute(
    'aria-expanded',
    'true'
  );


  document.body
    .classList
    .add(
      'is-scroll-locked'
    );
}


// ============================================================
// 16. DRAWER CLOSE
// ============================================================

export function closeDrawer() {
  state.drawerOpen =
    false;


  const drawer =
    $('.app-drawer');


  const backdrop =
    $('.app-drawer-backdrop');


  drawer?.classList.remove(
    'is-open'
  );


  drawer?.setAttribute(
    'aria-hidden',
    'true'
  );


  backdrop?.classList.remove(
    'is-open'
  );


  byId(
    'app-menu-button'
  )?.setAttribute(
    'aria-expanded',
    'false'
  );


  document.body
    .classList
    .remove(
      'is-scroll-locked'
    );
}


// ============================================================
// 17. BOTTOM NAV CONFIG
// ============================================================

function bottomItems(
  identity
) {
  const current =
    normalizedIdentity(
      identity
    );


  const items = [
    {
      key:
        'home',

      label:
        'Ana səhifə',

      href:
        APP_CONFIG.routes.home,

      icon:
        ICONS.home,
    },

    {
      key:
        'shop',

      label:
        'Mağaza',

      href:
        `${APP_CONFIG.routes.home}#products`,

      icon:
        ICONS.shop,
    },

    {
      key:
        'favorites',

      label:
        'Sevimli',

      href:
        APP_CONFIG.routes.favorites,

      icon:
        ICONS.heart,
    },
  ];


  if (
    current.isStaff
  ) {
    items.push({
      key:
        'admin',

      label:
        'Panel',

      href:
        APP_CONFIG.routes.admin,

      icon:
        ICONS.dashboard,
    });
  } else {
    items.push({
      key:
        'profile',

      label:
        current.authenticated
          ? 'Profil'
          : 'Daxil ol',

      href:
        current.authenticated
          ? APP_CONFIG.routes.profile
          : APP_CONFIG.routes.login,

      icon:
        current.authenticated
          ? ICONS.profile
          : ICONS.login,
    });
  }


  items.push({
    key:
      'menu',

    label:
      'Menyu',

    href:
      '#',

    icon:
      ICONS.menu,

    action:
      'drawer',
  });


  return items;
}


// ============================================================
// 18. BOTTOM NAV ACTIVE
// ============================================================

function bottomItemActive(
  key
) {
  if (
    key ===
      'menu' ||
    key ===
      'shop'
  ) {
    return false;
  }


  return linkIsActive(
    key
  );
}


// ============================================================
// 19. BOTTOM NAV RENDER
//
// Auth məlumatını gözləmədən render olunur.
// ============================================================

function renderBottomNavigation(
  identity =
    shellIdentity()
) {
  const root =
    ensureRoot(
      'app-bottom-nav-root'
    );


  if (
    isAuthPage()
  ) {
    root.innerHTML =
      '';

    return;
  }


  const items =
    bottomItems(
      identity
    );


  root.innerHTML = `
    <nav
      class="app-bottom-nav"
      aria-label="Aşağı naviqasiya"
    >

      <div class="app-bottom-nav__inner">

        ${items
          .map(
            item => {
              const active =
                bottomItemActive(
                  item.key
                );


              if (
                item.action ===
                  'drawer'
              ) {
                return `
                  <button
                    type="button"
                    class="app-bottom-nav__item"
                    data-layout-action="drawer"
                    aria-label="Menyu"
                  >

                    <span
                      class="app-bottom-nav__icon"
                      aria-hidden="true"
                    >
                      ${item.icon}
                    </span>

                    <span
                      class="app-bottom-nav__label"
                    >
                      ${escapeHtml(
                        item.label
                      )}
                    </span>

                  </button>
                `;
              }


              return `
                <a
                  href="${item.href}"
                  class="app-bottom-nav__item ${
                    active
                      ? 'is-active'
                      : ''
                  }"
                  ${
                    active
                      ? 'aria-current="page"'
                      : ''
                  }
                >

                  <span
                    class="app-bottom-nav__icon"
                    aria-hidden="true"
                  >
                    ${item.icon}
                  </span>

                  <span
                    class="app-bottom-nav__label"
                  >
                    ${escapeHtml(
                      item.label
                    )}
                  </span>

                </a>
              `;
            }
          )
          .join('')}

      </div>

    </nav>
  `;


  $(
    '[data-layout-action="drawer"]',
    root
  )?.addEventListener(
    'click',
    openDrawer
  );
}


// ============================================================
// 20. FOOTER
// ============================================================

function renderFooter() {

  const root =
    ensureRoot(
      'app-footer-root'
    );


  if (
    isAuthPage()
  ) {

    root.innerHTML =
      '';

    return;

  }


  const year =
    new Date()
      .getFullYear();


  root.innerHTML = `
    <footer class="app-footer">

      <div class="app-footer__inner">

        <div class="app-footer__brand">

          <span class="app-footer__copy">
            © ${year} SKy Fit Pro
          </span>

          <span
            class="app-footer__separator"
            aria-hidden="true"
          ></span>

          <span class="app-footer__developer">
            Senior Full Stack Developer:
            <strong>
              Qərib Səfərli
            </strong>
          </span>

        </div>


        <nav
          class="app-footer__links"
          aria-label="Footer naviqasiyası"
        >

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

        </nav>

      </div>

    </footer>
  `;
}


// ============================================================
// 21. IMMEDIATE SHELL
//
// ƏN VACİB HİSSƏ:
// getCurrentIdentity() gözlənilmir.
//
// Header + Drawer + Bottom Nav + Footer dərhal yaradılır.
// Supabase yalnız sonradan identity-ni dəyişir.
// ============================================================

function renderImmediateShell() {
  if (
    state.shellRendered
  ) {
    return;
  }


  state.shellRendered =
    true;


  const shell =
    shellIdentity();


  renderHeader(
    shell
  );


  renderDrawer(
    shell
  );


  renderBottomNavigation(
    shell
  );


  renderFooter();


  document.documentElement
    .classList
    .add(
      'layout-shell-ready'
    );
}


// ============================================================


// ============================================================
// 22. LAYOUT UI CACHE
//
// F5 zamanı:
// - istifadəçi adı
// - avatar
// - rol
// - staff vəziyyəti
//
// Supabase cavabını gözləmədən vizual shell üçün istifadə olunur.
//
// Bu AUTH deyil.
// Heç bir təhlükəsizlik qərarı bu cache-dən verilmir.
// Admin icazəsi həmişə real Supabase identity ilə yoxlanılır.
// ============================================================

const LAYOUT_CACHE_KEY =
  'skyfit-layout-identity-v1';


function saveLayoutIdentity(
  identity
) {
  try {
    const current =
      normalizedIdentity(
        identity
      );


    sessionStorage.setItem(
      LAYOUT_CACHE_KEY,
      JSON.stringify({
        authenticated:
          current.authenticated,

        role:
          current.role,

        isAdmin:
          current.isAdmin,

        isStaff:
          current.isStaff,

        name:
          current.name,

        email:
          current.email,

        avatar:
          current.avatar,
      })
    );
  } catch {
    // sessionStorage bloklanıbsa layout yenə normal işləyəcək.
  }
}


function readLayoutIdentity() {
  try {
    const raw =
      sessionStorage.getItem(
        LAYOUT_CACHE_KEY
      );


    if (!raw) {
      return null;
    }


    const parsed =
      JSON.parse(raw);


    if (
      !parsed ||
      typeof parsed !==
        'object'
    ) {
      return null;
    }


    return normalizedIdentity(
      parsed
    );
  } catch {
    return null;
  }
}


function clearLayoutIdentity() {
  try {
    sessionStorage.removeItem(
      LAYOUT_CACHE_KEY
    );
  } catch {
    // ignore
  }
}


// ============================================================
// 23. INITIAL SHELL IDENTITY
//
// Əvvəlki login olmuş şəxsin UI məlumatı sessionStorage-da varsa,
// F5 zamanı həmin məlumat dərhal görünür.
//
// Yoxdursa normal shellIdentity() istifadə olunur.
// ============================================================

function getImmediateIdentity() {
  return (
    readLayoutIdentity() ||
    shellIdentity()
  );
}


// ============================================================
// 24. RENDER COMPLETE LAYOUT
// ============================================================

function renderLayout(
  identity
) {
  const current =
    normalizedIdentity(
      identity
    );


  state.identity =
    current;


  renderHeader(
    current
  );


  renderDrawer(
    current
  );


  renderBottomNavigation(
    current
  );


  renderFooter();


  bindLayoutImageFallbacks();


  document.documentElement
    .classList
    .add(
      'layout-shell-ready'
    );


  return current;
}


// ============================================================
// 25. IMAGE FALLBACKS
//
// Avatar URL səhv/boş olarsa broken-image icon göstərmirik.
// ============================================================

function bindLayoutImageFallbacks() {
  $$(
    '.app-header__avatar img, .app-drawer__avatar img'
  ).forEach(
    image => {
      image.addEventListener(
        'error',
        () => {
          const wrapper =
            image.parentElement;


          if (!wrapper) {
            image.remove();
            return;
          }


          const name =
            normalizeString(
              state.identity?.name,
              'SK'
            );


          const words =
            name
              .split(' ')
              .filter(Boolean);


          let text =
            'SK';


          if (
            words.length === 1 &&
            words[0]
          ) {
            text =
              words[0]
                .slice(0, 2)
                .toLocaleUpperCase(
                  'az-AZ'
                );
          } else if (
            words.length > 1
          ) {
            text =
              (
                words[0][0] +
                words[
                  words.length - 1
                ][0]
              )
                .toLocaleUpperCase(
                  'az-AZ'
                );
          }


          image.remove();


          const fallback =
            createElement(
              'span',
              {
                className:
                  `${wrapper.className}__initials`,

                text,
              }
            );


          wrapper.append(
            fallback
          );
        },
        {
          once: true,
        }
      );
    }
  );
}


// ============================================================
// 26. HYDRATE REAL IDENTITY
//
// Burada artıq Supabase cavabı gözlənilir.
// Amma layout bundan əvvəl görünür.
// ============================================================

async function hydrateIdentity(
  options = {}
) {
  if (
    state.hydrationPromise &&
    !options.force
  ) {
    return state.hydrationPromise;
  }


  state.hydrationPromise =
    (async () => {
      try {
        const identity =
          await getCurrentIdentity({
            force:
              Boolean(
                options.force
              ),
          });


        const current =
          normalizedIdentity(
            identity
          );


        state.hydrated =
          true;


        if (
          current.authenticated
        ) {
          saveLayoutIdentity(
            current
          );
        } else {
          clearLayoutIdentity();
        }


        renderLayout(
          current
        );


        return identity;
      } catch (error) {
        console.error(
          '[SKy Fit Layout] Identity hydration error:',
          error
        );


        state.hydrated =
          true;


        // Supabase müvəqqəti cavab verməsə belə
        // hazır görünən shell-i dağıtmırıq.
        return null;
      } finally {
        state.hydrationPromise =
          null;
      }
    })();


  return state
    .hydrationPromise;
}


// ============================================================
// 27. REFRESH LAYOUT
//
// Digər JS fayllarında profil/avatar dəyişəndə istifadə ediləcək.
// ============================================================

export async function refreshLayout(
  options = {}
) {
  return hydrateIdentity({
    force:
      options.force !==
      false,
  });
}


// ============================================================
// 28. INIT LAYOUT
//
// Köhnə app.js/profile.js/admin.js ilə keçid mərhələsində
// await initLayout() işləməyə davam edə bilər.
//
// Fərq:
// shell artıq await-dən ƏVVƏL render olunub.
// ============================================================

export async function initLayout() {
  renderImmediateShellFromCache();


  return hydrateIdentity();
}


// ============================================================
// 29. IMMEDIATE SHELL FROM CACHE
// ============================================================

function renderImmediateShellFromCache() {
  if (
    state.shellRendered
  ) {
    return;
  }


  state.shellRendered =
    true;


  const identity =
    getImmediateIdentity();


  state.identity =
    identity;


  renderHeader(
    identity
  );


  renderDrawer(
    identity
  );


  renderBottomNavigation(
    identity
  );


  renderFooter();


  bindLayoutImageFallbacks();


  document.documentElement
    .classList
    .add(
      'layout-shell-ready'
    );
}


// ============================================================
// 30. PROFILE CHANGE EVENT
//
// profile.js avatar/ad yeniləyəndə bütün layout yenilənə bilər.
// ============================================================

window.addEventListener(
  SKYFIT_EVENTS.profileChange,
  async () => {
    await refreshLayout({
      force: true,
    });
  }
);


// ============================================================
// 31. AUTH CHANGE
//
// core.js real Supabase auth eventini burada ötürür.
// ============================================================

window.addEventListener(
  SKYFIT_EVENTS.authChange,
  async event => {
    const authEvent =
      normalizeString(
        event.detail?.event
      );


    const identity =
      event.detail?.identity;


    if (
      authEvent ===
      'SIGNED_OUT'
    ) {
      clearLayoutIdentity();


      state.identity =
        shellIdentity();


      state.hydrated =
        true;


      renderLayout(
        state.identity
      );


      return;
    }


    if (identity) {
      const current =
        normalizedIdentity(
          identity
        );


      state.identity =
        current;


      state.hydrated =
        true;


      if (
        current.authenticated
      ) {
        saveLayoutIdentity(
          current
        );
      }


      renderLayout(
        current
      );


      return;
    }


    // TOKEN_REFRESHED və digər hallarda identity detail gəlməsə
    // backenddən yenidən oxuyuruq.
    if (
      authEvent ===
        'SIGNED_IN' ||
      authEvent ===
        'TOKEN_REFRESHED' ||
      authEvent ===
        'USER_UPDATED'
    ) {
      await refreshLayout({
        force: true,
      });
    }
  }
);


// ============================================================
// 32. THEME CHANGE
// ============================================================

window.addEventListener(
  SKYFIT_EVENTS.themeChange,
  () => {
    const label =
      byId(
        'app-theme-label'
      );


    if (label) {
      label.textContent =
        themeLabel();
    }
  }
);


// ============================================================
// 33. THEME ACTION
// ============================================================

function handleThemeCycle() {
  const next =
    cycleTheme();


  const label =
    next ===
      'dark'
      ? 'Tünd rejim'
      : next ===
          'light'
        ? 'Açıq rejim'
        : 'Sistem rejimi';


  const element =
    byId(
      'app-theme-label'
    );


  if (element) {
    element.textContent =
      label;
  }


  notify.info(
    `${label} aktiv edildi.`
  );
}


// ============================================================
// 34. LOGOUT ACTION
// ============================================================

async function handleLogout() {
  const confirmed =
    await confirmDialog({
      eyebrow:
        'Hesab',

      title:
        'Çıxış edilsin?',

      message:
        'Cari SKy Fit sessiyası bağlanacaq.',

      confirmText:
        'Çıxış et',

      cancelText:
        'Ləğv et',

      danger:
        true,
    });


  if (!confirmed) {
    return;
  }


  clearLayoutIdentity();


  await signOut({
    redirect:
      true,

    redirectTo:
      APP_CONFIG.routes.login,
  });
}


// ============================================================
// 35. ESCAPE KEY
// ============================================================

document.addEventListener(
  'keydown',
  event => {
    if (
      event.key ===
        'Escape' &&
      state.drawerOpen
    ) {
      closeDrawer();
    }
  }
);


// ============================================================
// 36. DRAWER LINK CLOSE
//
// Drawer-dan link seçiləndə keçid başlamazdan əvvəl drawer bağlanır.
// Mobil tətbiq hissini yaxşılaşdırır.
// ============================================================

document.addEventListener(
  'click',
  event => {
    const link =
      event.target.closest(
        '.app-drawer__link[href], .app-drawer__profile[href]'
      );


    if (
      link &&
      state.drawerOpen
    ) {
      closeDrawer();
    }
  }
);


// ============================================================
// 37. HASH NAVIGATION
//
// Mağaza / Məşqçilər kimi eyni səhifədaxili keçidlərdə
// fixed header elementi örtməsin.
// ============================================================

function scrollToHash(
  hash =
    window.location.hash
) {
  const value =
    normalizeString(
      hash
    );


  if (
    !value ||
    value === '#'
  ) {
    return;
  }


  let target;


  try {
    target =
      document.querySelector(
        value
      );
  } catch {
    target =
      null;
  }


  if (!target) {
    return;
  }


  requestAnimationFrame(
    () => {
      target.scrollIntoView({
        behavior:
          'smooth',

        block:
          'start',
      });
    }
  );
}


window.addEventListener(
  'hashchange',
  () => {
    scrollToHash();
  }
);


// ============================================================
// 38. WINDOW RESIZE
//
// Desktop ölçüsünə keçəndə açıq mobil drawer qalmasın.
// ============================================================

let resizeTimer =
  null;


window.addEventListener(
  'resize',
  () => {
    clearTimeout(
      resizeTimer
    );


    resizeTimer =
      setTimeout(
        () => {
          if (
            window.innerWidth >=
              1180 &&
            state.drawerOpen
          ) {
            closeDrawer();
          }
        },
        100
      );
  }
);


// ============================================================
// 39. VISIBILITY RETURN
//
// Tətbiq background-dan qayıdanda hər dəfə bütün layout-u
// dağıtmırıq. Uzun müddət keçibsə identity yenilənir.
// ============================================================

let lastIdentityRefresh =
  Date.now();


document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState !==
      'visible'
    ) {
      return;
    }


    const now =
      Date.now();


    const elapsed =
      now -
      lastIdentityRefresh;


    // 5 dəqiqədən çox background-da qalıbsa session/profile
    // səssiz yenilənir.
    if (
      elapsed >=
      5 * 60 * 1000
    ) {
      lastIdentityRefresh =
        now;


      refreshLayout({
        force: true,
      });
    }
  }
);


// ============================================================
// 40. GET LAYOUT STATE
//
// Debug/test zamanı istifadə edilə bilər.
// State-in özü xaricə mutable verilmir.
// ============================================================

export function getLayoutState() {
  return {
    identity:
      state.identity,

    hydrated:
      state.hydrated,

    drawerOpen:
      state.drawerOpen,

    shellRendered:
      state.shellRendered,
  };
}


// ============================================================
// 41. PUBLIC IDENTITY REFRESH
//
// Profil səhifəsi ad/avatar yenilədikdən sonra istifadə edə bilər.
// ============================================================

export async function refreshLayoutIdentity() {
  const result =
    await refreshLayout({
      force: true,
    });


  lastIdentityRefresh =
    Date.now();


  return result;
}


// ============================================================
// 42. IMMEDIATE BOOTSTRAP
//
// ES module script-lər defer kimi işləyir, ona görə çox vaxt
// document.body artıq mövcuddur.
//
// Yenə də təhlükəsiz fallback saxlanılır.
// ============================================================

function bootstrapLayout() {
  renderImmediateShellFromCache();


  // Supabase hydration UI-ni bloklamır.
  hydrateIdentity()
    .then(
      () => {
        lastIdentityRefresh =
          Date.now();


        if (
          window.location.hash
        ) {
          setTimeout(
            () => {
              scrollToHash();
            },
            80
          );
        }
      }
    )
    .catch(
      error => {
        console.error(
          '[SKy Fit Layout] Bootstrap hydration error:',
          error
        );
      }
    );
}


if (
  document.readyState ===
    'loading'
) {
  document.addEventListener(
    'DOMContentLoaded',
    bootstrapLayout,
    {
      once: true,
    }
  );
} else {
  bootstrapLayout();
}


// ============================================================
// SKY FIT PRO
// LAYOUT.JS COMPLETE
// ============================================================
