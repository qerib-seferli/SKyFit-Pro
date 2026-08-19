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
  ipcMain,
  dialog,
} = require('electron');


const path =
  require('path');
const fs = require('fs');
const { execFile } = require('child_process');


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
// TURNİKET / IC CARD READ-ONLY BRIDGE V1
// Mövcud MDB bazasına yalnız SELECT edilir. Yazma/DELETE/UPDATE yoxdur.
// ============================================================

const DEFAULT_ACCESS_DB = 'C:\\Program Files (x86)\\ICV5.5.5\\ICV5.5.5\\Database.mdb';

function cleanPowerShellError(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  // PowerShell bəzən stderr-i CLIXML kimi qaytarır. İstifadəçiyə XML yox,
  // yalnız real xəta mətnini göstəririk.
  const xmlErrors = [...text.matchAll(/<S S="Error">([\s\S]*?)<\/S>/g)]
    .map(match => match[1])
    .join(' ');

  return (xmlErrors || text)
    .replace(/_x000D__x000A_/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function runPowerShellJson(script) {
  return new Promise((resolve, reject) => {
    const systemRoot = process.env.WINDIR || 'C:\\Windows';
    const ps32 = path.join(systemRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const ps64 = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const exe = fs.existsSync(ps32) ? ps32 : ps64;
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(exe, ['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand', encoded],
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const message = cleanPowerShellError(stderr || error.message);
          return reject(new Error(message || 'Turniket bazası oxunmadı.'));
        }
        try { resolve(JSON.parse(String(stdout || '').trim() || '{}')); }
        catch (parseError) { reject(new Error(`Turniket bazası cavabı oxunmadı: ${parseError.message}`)); }
      }
    );
  });
}

function createReadOnlyAccessSnapshot(sourcePath) {
  // Jet/OLEDB hətta Mode=Read zamanı Database.mdb yanında .ldb lock faylı
  // yaratmağa cəhd edə bilir. Program Files buna icazə vermədiyi üçün tətbiq
  // administrator tələb edirdi. Orijinal bazaya toxunmadan TEMP-də snapshot
  // yaradıb yalnız həmin nüsxəni oxuyuruq.
  const tempRoot = fs.mkdtempSync(
    path.join(
      app.getPath('temp'),
      'skyfit-access-'
    )
  );

  const sourceExt = path.extname(sourcePath).toLowerCase() || '.mdb';
  const snapshotPath = path.join(tempRoot, `Database-readonly${sourceExt}`);

  fs.copyFileSync(sourcePath, snapshotPath, fs.constants.COPYFILE_FICLONE || 0);

  return {
    tempRoot,
    snapshotPath,
  };
}

function removeAccessSnapshot(tempRoot) {
  if (!tempRoot) return;

  try {
    fs.rmSync(tempRoot, {
      recursive: true,
      force: true,
    });
  } catch {
    // TEMP cleanup uğursuz olsa tətbiqin işləməsinə mane olmasın.
  }
}

async function chooseAccessDatabase() {
  const defaultPath = fs.existsSync(DEFAULT_ACCESS_DB) ? DEFAULT_ACCESS_DB : undefined;
  if (defaultPath) return defaultPath;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'IC Card Database.mdb faylını seç',
    properties: ['openFile'],
    filters: [
      { name: 'Access database', extensions: ['mdb','bak'] },
      { name: 'Bütün fayllar', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  return result.filePaths[0];
}

ipcMain.handle('access:read-legacy-database', async () => {
  if (process.platform !== 'win32') return { ok: false, error: 'MDB bridge yalnız Windows-da işləyir.' };

  let snapshot = null;

  try {
    const dbPath = await chooseAccessDatabase();
    if (!dbPath) return { ok: false, cancelled: true, error: 'Fayl seçilmədi.' };
    if (!fs.existsSync(dbPath)) return { ok: false, error: 'Database faylı tapılmadı.' };

    const ext = path.extname(dbPath).toLowerCase();
    if (!['.mdb','.bak'].includes(ext)) return { ok: false, error: 'Yalnız .mdb və .bak faylları qəbul edilir.' };

    // MƏHSULDARLIQ/TƏHLÜKƏSİZLİK:
    // Mənbə Database.mdb yalnız kopyalanır. Jet bağlantısı orijinal fayla deyil,
    // istifadəçinin TEMP qovluğunda yaradılan snapshot-a açılır.
    snapshot = createReadOnlyAccessSnapshot(dbPath);

    const escapedSnapshotPath = snapshot.snapshotPath.replace(/'/g, "''");
    const escapedSourcePath = dbPath.replace(/'/g, "''");
    const script = `
$ErrorActionPreference = 'Stop'
$db = '${escapedSnapshotPath}'
$source = '${escapedSourcePath}'
$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$db;Mode=Read;")
$rs = New-Object -ComObject ADODB.Recordset
$rs.Open('SELECT * FROM Yz_person', $conn, 0, 1)
$items = New-Object System.Collections.ArrayList
while (-not $rs.EOF) {
  $row = [ordered]@{}
  for ($i = 0; $i -lt $rs.Fields.Count; $i++) {
    $f = $rs.Fields.Item($i)
    $v = $f.Value
    if ($null -eq $v -or $v -is [DBNull]) { $row[$f.Name] = $null }
    elseif ($v -is [DateTime]) { $row[$f.Name] = $v.ToString('yyyy-MM-dd HH:mm:ss') }
    else { $row[$f.Name] = $v }
  }
  [void]$items.Add([pscustomobject]$row)
  $rs.MoveNext()
}
$rs.Close(); $conn.Close()
[pscustomobject]@{ ok = $true; path = $source; people = $items; snapshot = $true } | ConvertTo-Json -Depth 8 -Compress
`;

    return await runPowerShellJson(script);
  } catch (error) {
    return { ok: false, error: error?.message || 'Turniket bazası oxunmadı.' };
  } finally {
    removeAccessSnapshot(snapshot?.tempRoot);
  }
});


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
