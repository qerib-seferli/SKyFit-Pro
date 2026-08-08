// ============================================================
// SKY FIT PRO
// Electron Main Process
// File: electron/main.js
// ============================================================

'use strict';

const {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  nativeTheme,
} = require('electron');

const path = require('path');


// ============================================================
// 01. APP CONSTANTS
// ============================================================

const APP_NAME =
  'SKy Fit Pro';

const WINDOW_MIN_WIDTH =
  980;

const WINDOW_MIN_HEIGHT =
  680;

const WINDOW_DEFAULT_WIDTH =
  1440;

const WINDOW_DEFAULT_HEIGHT =
  920;


// ============================================================
// 02. SINGLE INSTANCE
// Eyni anda ikinci SKy Fit instance açılmır.
// ============================================================

const hasSingleInstanceLock =
  app.requestSingleInstanceLock();


if (!hasSingleInstanceLock) {
  app.quit();
}


// ============================================================
// 03. MAIN WINDOW
// ============================================================

let mainWindow = null;


// ============================================================
// 04. APP ROOT
// Development:
//   electron/../
//
// Production build:
//   resources/app/
// ============================================================

function getFrontendRoot() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'app'
    );
  }

  return path.resolve(
    __dirname,
    '..'
  );
}


// ============================================================
// 05. FRONTEND FILE
// ============================================================

function getEntryFile() {
  return path.join(
    getFrontendRoot(),
    'index.html'
  );
}


// ============================================================
// 06. PRELOAD
// ============================================================

function getPreloadFile() {
  return path.join(
    __dirname,
    'preload.js'
  );
}


// ============================================================
// 07. CREATE WINDOW
// ============================================================

function createMainWindow() {
  mainWindow =
    new BrowserWindow({
      width:
        WINDOW_DEFAULT_WIDTH,

      height:
        WINDOW_DEFAULT_HEIGHT,

      minWidth:
        WINDOW_MIN_WIDTH,

      minHeight:
        WINDOW_MIN_HEIGHT,

      show:
        false,

      backgroundColor:
        '#080a0f',

      title:
        APP_NAME,

      autoHideMenuBar:
        true,

      webPreferences: {
        preload:
          getPreloadFile(),

        nodeIntegration:
          false,

        contextIsolation:
          true,

        sandbox:
          true,

        webSecurity:
          true,

        allowRunningInsecureContent:
          false,

        spellcheck:
          false,
      },
    });


  // ----------------------------------------------------------
  // READY
  // ----------------------------------------------------------

  mainWindow.once(
    'ready-to-show',
    () => {
      if (!mainWindow) {
        return;
      }

      mainWindow.show();

      mainWindow.focus();
    }
  );


  // ----------------------------------------------------------
  // LOAD APP
  // ----------------------------------------------------------

  mainWindow.loadFile(
    getEntryFile()
  );


  // ----------------------------------------------------------
  // EXTERNAL LINKS
  //
  // Electron daxilində təsadüfi xarici səhifə açmırıq.
  // https/http linklər sistem brauzerində açılır.
  // ----------------------------------------------------------

  mainWindow.webContents
    .setWindowOpenHandler(
      ({ url }) => {
        if (
          isAllowedExternalUrl(
            url
          )
        ) {
          shell.openExternal(
            url
          );
        }

        return {
          action: 'deny',
        };
      }
    );


  // ----------------------------------------------------------
  // NAVIGATION PROTECTION
  //
  // Supabase auth redirect kimi normal external navigation
  // ayrıca yoxlanılır.
  // ----------------------------------------------------------

  mainWindow.webContents
    .on(
      'will-navigate',
      (
        event,
        url
      ) => {
        if (
          isInternalUrl(
            url
          )
        ) {
          return;
        }


        event.preventDefault();


        if (
          isAllowedExternalUrl(
            url
          )
        ) {
          shell.openExternal(
            url
          );
        }
      }
    );


  // ----------------------------------------------------------
  // CLOSED
  // ----------------------------------------------------------

  mainWindow.on(
    'closed',
    () => {
      mainWindow = null;
    }
  );


  return mainWindow;
}


// ============================================================
// 08. INTERNAL URL
// ============================================================

function isInternalUrl(url) {
  if (!url) {
    return false;
  }


  try {
    const parsed =
      new URL(url);


    return (
      parsed.protocol ===
      'file:'
    );
  } catch {
    return false;
  }
}


// ============================================================
// 09. EXTERNAL URL POLICY
// ============================================================

function isAllowedExternalUrl(
  url
) {
  if (!url) {
    return false;
  }


  try {
    const parsed =
      new URL(url);


    return (
      parsed.protocol ===
        'https:' ||
      parsed.protocol ===
        'http:'
    );
  } catch {
    return false;
  }
}


// ============================================================
// 10. SECOND INSTANCE
// ============================================================

app.on(
  'second-instance',
  () => {
    if (!mainWindow) {
      return;
    }


    if (
      mainWindow.isMinimized()
    ) {
      mainWindow.restore();
    }


    mainWindow.show();

    mainWindow.focus();
  }
);


// ============================================================
// 11. APP READY
// ============================================================

app.whenReady()
  .then(
    () => {
      // Electron-un native theme-i sistem theme ilə sinxron saxlayırıq.
      nativeTheme.themeSource =
        'system';


      registerIpcHandlers();


      createMainWindow();


      app.on(
        'activate',
        () => {
          if (
            BrowserWindow
              .getAllWindows()
              .length === 0
          ) {
            createMainWindow();
          }
        }
      );
    }
  )
  .catch(
    error => {
      console.error(
        '[SKy Fit Electron] Startup error:',
        error
      );

      app.quit();
    }
  );


// ============================================================
// 12. WINDOW ALL CLOSED
// ============================================================

app.on(
  'window-all-closed',
  () => {
    if (
      process.platform !==
      'darwin'
    ) {
      app.quit();
    }
  }
);


// ============================================================
// 13. IPC
// Preload yalnız konkret, təhlükəsiz funksiyaları expose edir.
// ============================================================

function registerIpcHandlers() {
  ipcMain.handle(
    'skyfit:get-platform-info',
    () => {
      return {
        platform:
          process.platform,

        arch:
          process.arch,

        version:
          app.getVersion(),

        packaged:
          app.isPackaged,
      };
    }
  );


  ipcMain.handle(
    'skyfit:open-external',
    async (
      _event,
      url
    ) => {
      if (
        !isAllowedExternalUrl(
          url
        )
      ) {
        return false;
      }


      await shell.openExternal(
        url
      );


      return true;
    }
  );


  ipcMain.handle(
    'skyfit:get-native-theme',
    () => {
      return {
        shouldUseDarkColors:
          nativeTheme
            .shouldUseDarkColors,

        source:
          nativeTheme
            .themeSource,
      };
    }
  );
}


// ============================================================
// 14. SECURITY: WEB CONTENT CREATED
// ============================================================

app.on(
  'web-contents-created',
  (
    _event,
    contents
  ) => {
    // Yeni window yaratma cəhdlərini bloklayırıq.
    contents.setWindowOpenHandler(
      ({ url }) => {
        if (
          isAllowedExternalUrl(
            url
          )
        ) {
          shell.openExternal(
            url
          );
        }


        return {
          action: 'deny',
        };
      }
    );
  }
);


// ============================================================
// 15. CERTIFICATE ERRORS
//
// Sertifikat yoxlamasını bypass etmirik.
// Production təhlükəsizliyi üçün default davranış qorunur.
// ============================================================

app.on(
  'certificate-error',
  (
    event,
    _webContents,
    _url,
    _error,
    _certificate,
    callback
  ) => {
    event.preventDefault();

    callback(false);
  }
);


// ============================================================
// SKY FIT PRO ELECTRON MAIN COMPLETE
// ============================================================
