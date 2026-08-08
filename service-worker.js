// ============================================================
// SKY FIT PRO
// Progressive Web App Service Worker
// File: service-worker.js
// ============================================================

'use strict';


// ============================================================
// 01. VERSION
//
// Yeni frontend versiyası yayımlananda yalnız VERSION dəyərini
// artırmaq kifayətdir.
// ============================================================

const VERSION = '1.0.0';

const CACHE_PREFIX =
  'skyfit-pro';

const STATIC_CACHE =
  `${CACHE_PREFIX}-static-${VERSION}`;

const RUNTIME_CACHE =
  `${CACHE_PREFIX}-runtime-${VERSION}`;

const IMAGE_CACHE =
  `${CACHE_PREFIX}-images-${VERSION}`;


// ============================================================
// 02. APP SHELL
//
// Yalnız layihənin öz statik faylları burada saxlanılır.
// Supabase API cavablarını offline cache etmirik.
// ============================================================

const APP_SHELL = [
  './',

  './index.html',
  './login.html',
  './register.html',
  './profile.html',
  './admin.html',
  './favorites.html',
  './reset-password.html',
  './update-password.html',

  './css/app.css',

  './js/config.js',
  './js/core.js',
  './js/layout.js',
  './js/app.js',
  './js/auth.js',
  './js/profile.js',
  './js/admin.js',
  './js/favorites.js',

  './manifest.json',

  './assets/icons/favicon.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
];


// ============================================================
// 03. NETWORK RULES
// ============================================================

const SUPABASE_HOST_SUFFIX =
  '.supabase.co';

const JSDELIVR_HOST =
  'cdn.jsdelivr.net';


// ============================================================
// 04. INSTALL
// ============================================================

self.addEventListener(
  'install',
  event => {
    event.waitUntil(
      installServiceWorker()
    );
  }
);


async function installServiceWorker() {
  try {
    const cache =
      await caches.open(
        STATIC_CACHE
      );

    await cache.addAll(
      APP_SHELL
    );
  } catch (error) {
    console.error(
      '[SKy Fit SW] Install cache error:',
      error
    );
  }

  await self.skipWaiting();
}


// ============================================================
// 05. ACTIVATE
// ============================================================

self.addEventListener(
  'activate',
  event => {
    event.waitUntil(
      activateServiceWorker()
    );
  }
);


async function activateServiceWorker() {
  const keys =
    await caches.keys();

  const validCaches =
    new Set([
      STATIC_CACHE,
      RUNTIME_CACHE,
      IMAGE_CACHE,
    ]);


  await Promise.all(
    keys.map(
      key => {
        if (
          key.startsWith(
            CACHE_PREFIX
          ) &&
          !validCaches.has(key)
        ) {
          return caches.delete(
            key
          );
        }

        return Promise.resolve();
      }
    )
  );


  await self.clients.claim();
}


// ============================================================
// 06. FETCH
// ============================================================

self.addEventListener(
  'fetch',
  event => {
    const request =
      event.request;


    if (
      request.method !==
      'GET'
    ) {
      return;
    }


    const url =
      new URL(
        request.url
      );


    // --------------------------------------------------------
    // Supabase sorğularına toxunmuruq.
    //
    // Auth, RPC, database və Storage təhlükəsiz şəkildə
    // həmişə network üzərindən işləməlidir.
    // --------------------------------------------------------

    if (
      isSupabaseRequest(url)
    ) {
      return;
    }


    // --------------------------------------------------------
    // Navigation
    // --------------------------------------------------------

    if (
      request.mode ===
      'navigate'
    ) {
      event.respondWith(
        networkFirstNavigation(
          request
        )
      );

      return;
    }


    // --------------------------------------------------------
    // Images
    // --------------------------------------------------------

    if (
      request.destination ===
      'image'
    ) {
      event.respondWith(
        cacheFirstImage(
          request
        )
      );

      return;
    }


    // --------------------------------------------------------
    // CSS / JS / Fonts
    // --------------------------------------------------------

    if (
      request.destination ===
        'style' ||
      request.destination ===
        'script' ||
      request.destination ===
        'font'
    ) {
      event.respondWith(
        staleWhileRevalidate(
          request
        )
      );

      return;
    }


    // --------------------------------------------------------
    // Same-origin static assets
    // --------------------------------------------------------

    if (
      url.origin ===
      self.location.origin
    ) {
      event.respondWith(
        cacheFirstStatic(
          request
        )
      );
    }
  }
);


// ============================================================
// 07. SUPABASE DETECTION
// ============================================================

function isSupabaseRequest(
  url
) {
  return (
    url.hostname.endsWith(
      SUPABASE_HOST_SUFFIX
    )
  );
}


// ============================================================
// 08. NETWORK-FIRST NAVIGATION
//
// Səhifə üçün əvvəl internet yoxlanır.
// Offline olduqda cache-dəki HTML istifadə edilir.
// ============================================================

async function networkFirstNavigation(
  request
) {
  try {
    const response =
      await fetch(request);


    if (
      response &&
      response.ok
    ) {
      const cache =
        await caches.open(
          RUNTIME_CACHE
        );

      await cache.put(
        request,
        response.clone()
      );
    }


    return response;
  } catch {
    const cached =
      await caches.match(
        request
      );


    if (cached) {
      return cached;
    }


    const fallback =
      await caches.match(
        './index.html'
      );


    if (fallback) {
      return fallback;
    }


    return new Response(
      `
        <!doctype html>
        <html lang="az">
          <head>
            <meta charset="UTF-8">
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            >
            <title>SKy Fit Pro</title>

            <style>
              html,
              body {
                margin: 0;
                min-height: 100%;
                background: #080a0f;
                color: #f7f8fa;
                font-family:
                  system-ui,
                  -apple-system,
                  sans-serif;
              }

              body {
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                box-sizing: border-box;
              }

              main {
                width: min(100%, 420px);
                text-align: center;
              }

              strong {
                display: block;
                font-size: 22px;
              }

              p {
                color: #969daa;
                line-height: 1.6;
                font-size: 13px;
              }
            </style>
          </head>

          <body>
            <main>
              <strong>SKy Fit Pro</strong>

              <p>
                Hazırda internet bağlantısı yoxdur.
                Bağlantını yoxlayıb yenidən cəhd et.
              </p>
            </main>
          </body>
        </html>
      `,
      {
        status: 503,

        headers: {
          'Content-Type':
            'text/html; charset=utf-8',
        },
      }
    );
  }
}


// ============================================================
// 09. CACHE-FIRST STATIC
// ============================================================

async function cacheFirstStatic(
  request
) {
  const cached =
    await caches.match(
      request
    );


  if (cached) {
    return cached;
  }


  try {
    const response =
      await fetch(request);


    if (
      isCacheableResponse(
        response
      )
    ) {
      const cache =
        await caches.open(
          RUNTIME_CACHE
        );

      await cache.put(
        request,
        response.clone()
      );
    }


    return response;
  } catch {
    return new Response(
      '',
      {
        status: 504,
        statusText:
          'Offline',
      }
    );
  }
}


// ============================================================
// 10. STALE-WHILE-REVALIDATE
//
// CSS və JS tez açılır, arxa planda yeni versiya alınır.
// ============================================================

async function staleWhileRevalidate(
  request
) {
  const cached =
    await caches.match(
      request
    );


  const networkPromise =
    fetch(request)
      .then(
        async response => {
          if (
            isCacheableResponse(
              response
            )
          ) {
            const cache =
              await caches.open(
                RUNTIME_CACHE
              );

            await cache.put(
              request,
              response.clone()
            );
          }


          return response;
        }
      )
      .catch(
        () => null
      );


  if (cached) {
    networkPromise.catch(
      () => {}
    );

    return cached;
  }


  const network =
    await networkPromise;


  if (network) {
    return network;
  }


  return new Response(
    '',
    {
      status: 504,
      statusText:
        'Offline',
    }
  );
}


// ============================================================
// 11. IMAGE CACHE
// ============================================================

async function cacheFirstImage(
  request
) {
  const url =
    new URL(
      request.url
    );


  // Supabase Storage şəkilləri SW tərəfindən cache edilmir.
  // Browser öz HTTP cache mexanizmindən istifadə edə bilər.
  if (
    isSupabaseRequest(url)
  ) {
    return fetch(request);
  }


  const cached =
    await caches.match(
      request
    );


  if (cached) {
    return cached;
  }


  try {
    const response =
      await fetch(request);


    if (
      isCacheableResponse(
        response
      )
    ) {
      const cache =
        await caches.open(
          IMAGE_CACHE
        );

      await cache.put(
        request,
        response.clone()
      );

      await trimCache(
        IMAGE_CACHE,
        100
      );
    }


    return response;
  } catch {
    return new Response(
      '',
      {
        status: 504,
        statusText:
          'Offline',
      }
    );
  }
}


// ============================================================
// 12. CACHE RESPONSE VALIDATION
// ============================================================

function isCacheableResponse(
  response
) {
  if (!response) {
    return false;
  }


  if (
    response.status !== 200
  ) {
    return false;
  }


  return (
    response.type ===
      'basic' ||
    response.type ===
      'cors'
  );
}


// ============================================================
// 13. CACHE LIMIT
// ============================================================

async function trimCache(
  cacheName,
  maxItems
) {
  const cache =
    await caches.open(
      cacheName
    );


  const keys =
    await cache.keys();


  if (
    keys.length <=
    maxItems
  ) {
    return;
  }


  const removeCount =
    keys.length -
    maxItems;


  await Promise.all(
    keys
      .slice(
        0,
        removeCount
      )
      .map(
        request =>
          cache.delete(
            request
          )
      )
  );
}


// ============================================================
// 14. MESSAGE API
// ============================================================

self.addEventListener(
  'message',
  event => {
    const data =
      event.data;


    if (!data) {
      return;
    }


    if (
      data.type ===
      'SKIP_WAITING'
    ) {
      self.skipWaiting();

      return;
    }


    if (
      data.type ===
      'CLEAR_RUNTIME_CACHE'
    ) {
      event.waitUntil(
        clearRuntimeCaches()
      );
    }
  }
);


// ============================================================
// 15. CLEAR RUNTIME CACHE
// ============================================================

async function clearRuntimeCaches() {
  await Promise.all([
    caches.delete(
      RUNTIME_CACHE
    ),

    caches.delete(
      IMAGE_CACHE
    ),
  ]);
}


// ============================================================
// 16. OPTIONAL NOTIFICATION CLICK SUPPORT
//
// Gələcəkdə push notification əlavə ediləndə SW dəyişmədən
// notification click işləyə bilər.
// ============================================================

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close();


    const targetUrl =
      event.notification
        ?.data
        ?.url ||
      './index.html';


    event.waitUntil(
      focusOrOpenWindow(
        targetUrl
      )
    );
  }
);


// ============================================================
// 17. FOCUS / OPEN APP
// ============================================================

async function focusOrOpenWindow(
  targetUrl
) {
  const clients =
    await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });


  for (
    const client of clients
  ) {
    if (
      'focus' in client
    ) {
      if (
        'navigate' in client
      ) {
        await client.navigate(
          targetUrl
        );
      }

      return client.focus();
    }
  }


  if (
    self.clients.openWindow
  ) {
    return self.clients.openWindow(
      targetUrl
    );
  }


  return null;
}


// ============================================================
// SKY FIT PRO SERVICE WORKER COMPLETE
// ============================================================
