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
    configureAccessBridge: (config) => ipcRenderer.invoke('access:configure-bridge', config),
    getAccessBridgeStatus: () => ipcRenderer.invoke('access:get-bridge-status'),
    runAccessBridgeNow: () => ipcRenderer.invoke('access:run-bridge-now'),
    getCardRegisterDiagnostics: () => ipcRenderer.invoke('access:card-register-diagnostics'),
    getTurnstileControllerDiagnostics: () => ipcRenderer.invoke('access:controller-diagnostics'),

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
