// ============================================================
// SKY FIT PRO
// Electron Main Process
// File: electron/main.js
//
// Senior Full Stack Developer: Qərib Səfərli
// ============================================================

const {
  app,
  BrowserWindow,
  shell,
  nativeTheme,
} = require('electron');


const path =
  require('path');


let mainWindow =
  null;


// ============================================================
// 01. APP PATHS
// ============================================================

const ROOT_DIR =
  path.resolve(
    __dirname,
    '..'
  );


const INDEX_FILE =
  path.join(
    ROOT_DIR,
    'index.html'
  );


const PRELOAD_FILE =
  path.join(
    __dirname,
    'preload.js'
  );


// ============================================================
// 02. CREATE WINDOW
// ============================================================

function createMainWindow() {
  mainWindow =
    new BrowserWindow({

      width:
        1360,

      height:
        860,

      minWidth:
        980,

      minHeight:
        680,

      backgroundColor:
        '#090b10',

      show:
        false,

      title:
        'SKy Fit Pro',

      autoHideMenuBar:
        true,

      webPreferences: {

        preload:
          PRELOAD_FILE,

        contextIsolation:
          true,

        nodeIntegration:
          false,

        sandbox:
          true,

        webSecurity:
          true,
      },
    });


  // ----------------------------------------------------------
  // Load application
  // ----------------------------------------------------------

  mainWindow.loadFile(
    INDEX_FILE
  );


  // ----------------------------------------------------------
  // Show after ready
  // ----------------------------------------------------------

  mainWindow.once(
    'ready-to-show',
    () => {
      mainWindow?.show();
    }
  );


  // ----------------------------------------------------------
  // External URLs
  //
  // instagram, email və s. desktop browser-də açılsın.
  // Lokal SKy Fit səhifələri Electron daxilində qalır.
  // ----------------------------------------------------------

  mainWindow.webContents
    .setWindowOpenHandler(
      ({
        url,
      }) => {

        if (
          url.startsWith(
            'http://'
          ) ||
          url.startsWith(
            'https://'
          )
        ) {
          shell.openExternal(
            url
          );


          return {
            action:
              'deny',
          };
        }


        return {
          action:
            'allow',
        };
      }
    );


  // ----------------------------------------------------------
  // Navigation security
  // ----------------------------------------------------------

  mainWindow.webContents
    .on(
      'will-navigate',
      (
        event,
        url
      ) => {

        try {
          const target =
            new URL(url);


          // file:// app navigation allowed
          if (
            target.protocol ===
            'file:'
          ) {
            return;
          }


          if (
            target.protocol ===
              'http:' ||
            target.protocol ===
              'https:'
          ) {
            event.preventDefault();


            shell.openExternal(
              url
            );
          }
        } catch {
          // malformed URL
          event.preventDefault();
        }
      }
    );


  // ----------------------------------------------------------
  // Window closed
  // ----------------------------------------------------------

  mainWindow.on(
    'closed',
    () => {
      mainWindow =
        null;
    }
  );
}


// ============================================================
// 03. APP READY
// ============================================================

app.whenReady()
  .then(
    () => {

      // OS theme follows system.
      nativeTheme.themeSource =
        'system';


      createMainWindow();


      app.on(
        'activate',
        () => {

          if (
            BrowserWindow
              .getAllWindows()
              .length ===
            0
          ) {
            createMainWindow();
          }

        }
      );

    }
  );


// ============================================================
// 04. WINDOWS / LINUX CLOSE
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
// 05. SECURITY
// ============================================================

app.on(
  'web-contents-created',
  (
    _event,
    contents
  ) => {

    contents.on(
      'will-attach-webview',
      event => {
        event.preventDefault();
      }
    );

  }
);


// ============================================================
// SKY FIT PRO ELECTRON MAIN COMPLETE
// ============================================================
