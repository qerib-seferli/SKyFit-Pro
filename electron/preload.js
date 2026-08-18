// ============================================================
// SKY FIT PRO
// Electron Preload
// File: electron/preload.js
//
// Senior Full Stack Developer: Qərib Səfərli
// ============================================================

const {
  contextBridge,
  ipcRenderer,
} = require('electron');


// ============================================================
// 01. SAFE DESKTOP API
//
// Frontend Node.js-ə birbaşa giriş almır.
// Yalnız təhlükəsiz və məhdud məlumat expose olunur.
// ============================================================

contextBridge.exposeInMainWorld(
  'skyfitDesktop',
  {

    isElectron:
      true,

    platform:
      process.platform,

    readLegacyAccessDatabase: () => ipcRenderer.invoke('access:read-legacy-database'),

    versions: {

      electron:
        process.versions
          .electron,

      chrome:
        process.versions
          .chrome,

    },

  }
);


// ============================================================
// SKY FIT PRO ELECTRON PRELOAD COMPLETE
// ============================================================
