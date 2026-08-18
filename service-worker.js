// ============================================================
// SKY FIT PRO
// Production Service Worker
// File: service-worker.js
//
// Senior Full Stack Developer: Qərib Səfərli
//
// Goals:
// - Web / PWA / Android / iPhone friendly
// - GitHub Pages sub-path compatible
// - Network-first for HTML / JS / CSS
// - Cache-first for local static assets
// - NEVER cache Supabase/Auth/API traffic
// - Prevent stale application versions
// ============================================================

'use strict';


// ============================================================
// 01. VERSION
//
// Frontenddə böyük dəyişiklik etdikdə yalnız APP_VERSION-u
// artırmaq kifayətdir:
//
const APP_VERSION = 'skyfit-pro-v1.5.6-access-v1';


const STATIC_CACHE =
  `${APP_VERSION}-static`;


const RUNTIME_CACHE =
  `${APP_VERSION}-runtime`;


// ============================================================
// 02. APPLICATION SHELL
//
// self.registration.scope istifadə etdiyimiz üçün həm:
//
// https://domain.com/
//
// həm də:
//
// https://username.github.io/SKyFit-Pro/
//
// düzgün işləyir.
// ============================================================

function appUrl(path = './') {
  return new URL(
    path,
    self.registration.scope
  ).href;
}


const APP_SHELL = [

  // Pages
  './index.html',
  './login.html',
  './register.html',
  './profile.html',
  './admin.html',
  './favorites.html',
  './reset-password.html',
  './update-password.html',

  // CSS
  './css/app.css',

  // JavaScript modules
  './js/admin-access.js',
  './js/admin-dashboard.js',
  './js/admin-data.js',
  './js/admin-debt-actions.js',
  './js/admin-debts.js',
  './js/admin-events.js',
  './js/admin-finance-actions.js',
  './js/admin-finance.js',
  './js/admin-history.js',
  './js/admin-members.js',
  './js/admin-membership-actions.js',
  './js/admin-memberships.js',
  './js/admin-pos.js',
  './js/admin-product-editor.js',
  './js/admin-products.js',
  './js/admin-reports.js',
  './js/admin-router.js',
  './js/admin-sales.js',
  './js/admin-stock-actions.js',
  './js/admin-stock.js',
  './js/admin-trainers.js',
  './js/admin-workforce.js',
  './js/admin.js',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/core.js',
  './js/favorites.js',
  './js/layout.js',
  './js/profile.js',
  './js/quick-sale.js',

  // PWA metadata and primary icons
  './manifest.json',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/maskable-icon-192x192.png',
  './assets/icons/maskable-icon-512x512.png',

].map(appUrl);


// ============================================================
// 03. CACHEABLE LOCAL ASSET EXTENSIONS
// ============================================================

const STATIC_ASSET_PATTERN =
  /\.(?:png|jpg|jpeg|webp|gif|svg|ico|avif|woff2?|ttf|otf)$/i;


// ============================================================
// 04. REQUEST HELPERS
// ============================================================

function isHttpRequest(request) {
  try {
    const url =
      new URL(
        request.url
      );


    return (
      url.protocol ===
        'http:' ||
      url.protocol ===
        'https:'
    );
  } catch {
    return false;
  }
}


function isSameOrigin(request) {
  try {
    return (
      new URL(
        request.url
      ).origin ===
      self.location.origin
    );
  } catch {
    return false;
  }
}


// ============================================================
// 05. NEVER CACHE
//
// Bunlar browser cache sistemimizə daxil olmayacaq:
//
// - Supabase REST
// - Supabase Auth
// - Supabase Realtime
// - Supabase Storage remote requests
// - RPC
// - digər third-party API-lər
//
// Bununla istifadəçi məlumatının köhnə cache-dən gəlməsi
// problemini aradan qaldırırıq.
// ============================================================

function shouldBypassCache(request) {
  if (
    !isHttpRequest(request)
  ) {
    return true;
  }


  const url =
    new URL(
      request.url
    );


  // ----------------------------------------------------------
  // Non-GET
  // ----------------------------------------------------------

  if (
    request.method !==
    'GET'
  ) {
    return true;
  }


  // ----------------------------------------------------------
  // Supabase
  // ----------------------------------------------------------

  if (
    url.hostname.endsWith(
      '.supabase.co'
    ) ||
    url.hostname.endsWith(
      '.supabase.in'
    )
  ) {
    return true;
  }


  // ----------------------------------------------------------
  // Explicit API paths
  // ----------------------------------------------------------

  if (
    url.pathname.includes(
      '/rest/v1/'
    ) ||
    url.pathname.includes(
      '/auth/v1/'
    ) ||
    url.pathname.includes(
      '/realtime/v1/'
    ) ||
    url.pathname.includes(
      '/storage/v1/'
    )
  ) {
    return true;
  }


  return false;
}


// ============================================================
// 06. HTML / NAVIGATION REQUEST
// ============================================================

function isNavigationRequest(
  request
) {
  return (
    request.mode ===
      'navigate' ||
    request.destination ===
      'document'
  );
}


// ============================================================
// 07. APP CODE REQUEST
//
// HTML + JS + CSS həmişə əvvəl network-dən yoxlanır.
// Buna görə deploy etdiyimiz yeni kod köhnə cache-in arxasında
// ilişib qalmır.
// ============================================================

function isApplicationCodeRequest(
  request
) {
  const url =
    new URL(
      request.url
    );


  return (
    request.destination ===
      'script' ||
    request.destination ===
      'style' ||
    url.pathname.endsWith(
      '.js'
    ) ||
    url.pathname.endsWith(
      '.css'
    )
  );
}


// ============================================================
// 08. LOCAL STATIC ASSET
// ============================================================

function isStaticAssetRequest(
  request
) {
  if (
    !isSameOrigin(
      request
    )
  ) {
    return false;
  }


  const url =
    new URL(
      request.url
    );


  return (
    request.destination ===
      'image' ||
    request.destination ===
      'font' ||
    STATIC_ASSET_PATTERN.test(
      url.pathname
    )
  );
}


// ============================================================
// 09. SAFE CACHE PUT
// ============================================================

async function safeCachePut(
  cache,
  request,
  response
) {
  if (
    !response ||
    !response.ok
  ) {
    return;
  }


  // opaque third-party response cache etmirik.
  if (
    response.type ===
    'opaque'
  ) {
    return;
  }


  try {
    await cache.put(
      request,
      response.clone()
    );
  } catch (error) {
    console.warn(
      '[SKy Fit SW] Cache put failed:',
      request.url,
      error
    );
  }
}


// ============================================================
// 10. INSTALL
//
// cache.addAll() istifadə etmirik.
//
// Səbəb:
// bir dənə fayl tapılmasa bütün Service Worker install
// mərhələsinin çökməsini istəmirik.
// ============================================================

self.addEventListener(
  'install',
  event => {

    event.waitUntil(
      (
        async () => {

          const cache =
            await caches.open(
              STATIC_CACHE
            );


          await Promise.allSettled(
            APP_SHELL.map(
              async url => {

                try {
                  const response =
                    await fetch(
                      url,
                      {
                        cache:
                          'reload',
                      }
                    );


                  if (
                    response.ok
                  ) {
                    await cache.put(
                      url,
                      response
                    );
                  }
                } catch (error) {
                  console.warn(
                    '[SKy Fit SW] Precache skipped:',
                    url,
                    error
                  );
                }

              }
            )
          );


          await self.skipWaiting();

        }
      )()
    );

  }
);


// ============================================================
// 11. ACTIVATE
//
// Köhnə SKy Fit cache versiyalarını silirik.
// ============================================================

self.addEventListener(
  'activate',
  event => {

    event.waitUntil(
      (
        async () => {

          const keys =
            await caches.keys();


          await Promise.all(
            keys.map(
              key => {

                const isSkyFitCache =
                  key.startsWith(
                    'skyfit-pro-'
                  );


                const isCurrent =
                  key ===
                    STATIC_CACHE ||
                  key ===
                    RUNTIME_CACHE;


                if (
                  isSkyFitCache &&
                  !isCurrent
                ) {
                  return caches.delete(
                    key
                  );
                }


                return Promise.resolve(
                  false
                );

              }
            )
          );


          await self.clients.claim();

        }
      )()
    );

  }
);


// ============================================================
// 12. NETWORK FIRST
//
// HTML / JS / CSS:
//
// 1. Network
// 2. Cache fallback
//
// Tətbiqin köhnə versiyada qalmasının qarşısını alır.
// ============================================================

async function networkFirst(
  request
) {
  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  try {
    const response =
      await fetch(
        request,
        {
          cache:
            'no-cache',
        }
      );


    await safeCachePut(
      cache,
      request,
      response
    );


    return response;
  } catch {
    const cached =
      await caches.match(
        request
      );


    if (cached) {
      return cached;
    }


    throw new Error(
      'NETWORK_AND_CACHE_FAILED'
    );
  }
}


// ============================================================
// 13. CACHE FIRST
//
// Şəkil/font kimi dəyişməsi az olan lokal assetlər:
//
// 1. Cache
// 2. Network
// 3. Cache-ə əlavə et
// ============================================================

async function cacheFirst(
  request
) {
  const cached =
    await caches.match(
      request
    );


  if (cached) {
    return cached;
  }


  const response =
    await fetch(
      request
    );


  const cache =
    await caches.open(
      RUNTIME_CACHE
    );


  await safeCachePut(
    cache,
    request,
    response
  );


  return response;
}


// ============================================================
// 14. NAVIGATION FALLBACK
// ============================================================

async function handleNavigation(
  request
) {
  try {
    return await networkFirst(
      request
    );
  } catch {

    // --------------------------------------------------------
    // Əvvəl eyni səhifənin cache versiyası
    // --------------------------------------------------------

    const exact =
      await caches.match(
        request
      );


    if (exact) {
      return exact;
    }


    // --------------------------------------------------------
    // Son fallback: index
    // --------------------------------------------------------

    const home =
      await caches.match(
        appUrl(
          './index.html'
        )
      );


    if (home) {
      return home;
    }


    // --------------------------------------------------------
    // Heç nə yoxdursa lightweight offline response.
    // Ayrı offline.html yaratmırıq.
    // --------------------------------------------------------

    return new Response(
      `
        <!doctype html>
        <html lang="az">
          <head>
            <meta charset="utf-8">
            <meta
              name="viewport"
              content="width=device-width,initial-scale=1"
            >
            <meta
              name="theme-color"
              content="#090b10"
            >
            <title>SKy Fit Pro</title>

            <style>
              html {
                color-scheme: dark;
                background: #090b10;
              }

              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                box-sizing: border-box;
                background:
                  radial-gradient(
                    circle at 50% 15%,
                    rgba(255, 222, 0, .09),
                    transparent 34%
                  ),
                  #090b10;
                color: #f8fafc;
                font-family:
                  Inter,
                  system-ui,
                  -apple-system,
                  BlinkMacSystemFont,
                  "Segoe UI",
                  sans-serif;
              }

              .offline {
                width: min(100%, 420px);
                padding: 28px;
                box-sizing: border-box;
                border: 1px solid rgba(255,255,255,.09);
                border-radius: 24px;
                background: rgba(255,255,255,.045);
                box-shadow: 0 24px 80px rgba(0,0,0,.35);
                text-align: center;
              }

              .mark {
                width: 58px;
                height: 58px;
                margin: 0 auto 18px;
                display: grid;
                place-items: center;
                border-radius: 18px;
                background: #ffde00;
                color: #090b10;
                font-weight: 900;
                font-size: 18px;
              }

              h1 {
                margin: 0 0 10px;
                font-size: 22px;
              }

              p {
                margin: 0;
                color: #aeb6c5;
                line-height: 1.6;
                font-size: 15px;
              }

              button {
                width: 100%;
                margin-top: 22px;
                min-height: 48px;
                border: 0;
                border-radius: 15px;
                background: #ffde00;
                color: #090b10;
                font: inherit;
                font-weight: 800;
                cursor: pointer;
              }
            </style>
          </head>

          <body>
            <main class="offline">

              <div class="mark">
                SK
              </div>

              <h1>
                İnternet bağlantısı yoxdur
              </h1>

              <p>
                SKy Fit Pro serverə qoşula bilmir.
                İnternet bağlantısını yoxlayıb yenidən cəhd et.
              </p>

              <button
                type="button"
                onclick="location.reload()"
              >
                Yenidən yoxla
              </button>

            </main>
          </body>
        </html>
      `,
      {
        status:
          503,

        headers: {
          'Content-Type':
            'text/html; charset=utf-8',

          'Cache-Control':
            'no-store',
        },
      }
    );

  }
}


// ============================================================
// 15. FETCH
// ============================================================

self.addEventListener(
  'fetch',
  event => {

    const request =
      event.request;


    if (
      shouldBypassCache(
        request
      )
    ) {
      return;
    }


    // --------------------------------------------------------
    // Navigation
    // --------------------------------------------------------

    if (
      isNavigationRequest(
        request
      )
    ) {
      event.respondWith(
        handleNavigation(
          request
        )
      );


      return;
    }


    // --------------------------------------------------------
    // Local JS / CSS
    // --------------------------------------------------------

    if (
      isSameOrigin(
        request
      ) &&
      isApplicationCodeRequest(
        request
      )
    ) {
      event.respondWith(
        networkFirst(
          request
        )
      );


      return;
    }


    // --------------------------------------------------------
    // Local images / fonts / icons
    // --------------------------------------------------------

    if (
      isStaticAssetRequest(
        request
      )
    ) {
      event.respondWith(
        cacheFirst(
          request
        )
      );
    }

  }
);


// ============================================================
// 16. MESSAGE API
//
// Gələcəkdə frontend:
// navigator.serviceWorker.controller.postMessage({
//   type: 'SKIP_WAITING'
// });
//
// göndərə bilər.
// ============================================================

self.addEventListener(
  'message',
  event => {

    const type =
      event.data?.type;


    if (
      type ===
      'SKIP_WAITING'
    ) {
      self.skipWaiting();
    }

  }
);


// ============================================================
// 17. PUSH READY
//
// Hazırda push backend qurmadığımız üçün notification
// məntiqi uydurmuruq.
//
// Gələcəkdə push əlavə olunanda eyni service-worker.js daxilində
// vahid handler yerləşdirəcəyik.
// ============================================================


// ============================================================
// SKY FIT PRO SERVICE WORKER COMPLETE
//
// Senior Full Stack Developer:
// Qərib Səfərli
// ============================================================
