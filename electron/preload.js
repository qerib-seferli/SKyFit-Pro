// ============================================================
// SKY FIT PRO
// Electron Preload Bridge
// File: electron/preload.js
// ============================================================

'use strict';

const {
  contextBridge,
  ipcRenderer,
} = require('electron');


// ============================================================
// 01. SAFE API
//
// Frontend-ə Node.js, fs, process və ipcRenderer-in özünü
// vermirik.
//
// Yalnız konkret icazə verilmiş funksiyalar expose olunur.
// ============================================================

const skyFitDesktopApi =
  Object.freeze({

    // --------------------------------------------------------
    // Desktop mühitinin mövcud olub-olmadığını frontend
    // window.skyFitDesktop vasitəsilə anlaya bilər.
    // --------------------------------------------------------

    isDesktop:
      true,


    // --------------------------------------------------------
    // Platform məlumatları
    // Windows / macOS / Linux, architecture və app version.
    // --------------------------------------------------------

    getPlatformInfo:
      async () => {
        try {
          return await ipcRenderer.invoke(
            'skyfit:get-platform-info'
          );
        } catch (error) {
          console.error(
            '[SKy Fit Preload] Platform info error:',
            error
          );

          return null;
        }
      },


    // --------------------------------------------------------
    // Xarici URL-ni sistem browserində aç.
    // URL təhlükəsizliyi main.js tərəfindən yenidən yoxlanılır.
    // --------------------------------------------------------

    openExternal:
      async url => {
        if (
          typeof url !== 'string' ||
          !url
        ) {
          return false;
        }

        try {
          return await ipcRenderer.invoke(
            'skyfit:open-external',
            url
          );
        } catch (error) {
          console.error(
            '[SKy Fit Preload] External URL error:',
            error
          );

          return false;
        }
      },


    // --------------------------------------------------------
    // Native OS theme məlumatı.
    // --------------------------------------------------------

    getNativeTheme:
      async () => {
        try {
          return await ipcRenderer.invoke(
            'skyfit:get-native-theme'
          );
        } catch (error) {
          console.error(
            '[SKy Fit Preload] Native theme error:',
            error
          );

          return null;
        }
      },
  });


// ============================================================
// 02. EXPOSE
// ============================================================

contextBridge.exposeInMainWorld(
  'skyFitDesktop',
  skyFitDesktopApi
);


// ============================================================
// ELECTRON PRELOAD COMPLETE
// ============================================================
