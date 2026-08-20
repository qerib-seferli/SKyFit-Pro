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
  protocol,
  net,
} = require('electron');


const path =
  require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');


// ============================================================
// DESKTOP APP ORIGIN
//
// file:// hər HTML faylı üçün Web Storage davranışı platformdan
// asılı ola bilər. Supabase Auth sessiyasının login.html,
// admin.html, profile.html və digər səhifələr arasında eyni
// localStorage origin-də qalması üçün standart/secure lokal
// protokol istifadə edirik.
// ============================================================

const SKYFIT_APP_SCHEME = 'skyfit';
const SKYFIT_APP_HOST = 'app';

protocol.registerSchemesAsPrivileged([
  {
    scheme: SKYFIT_APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);


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

  mainWindow.loadURL(
    `${SKYFIT_APP_SCHEME}://${SKYFIT_APP_HOST}/index.html`
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


          // Local SKy Fit navigation allowed.
          if (
            target.protocol ===
              `${SKYFIT_APP_SCHEME}:` ||
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
// TURNİKET / IC CARD BRIDGE V2
// - MDB read: original database is copied to TEMP and read safely.
// - MDB write: only explicit queued commands are applied.
// - Every write creates an automatic backup first.
// - If Program Files blocks write access, Windows UAC is requested only
//   for the write operation; normal app startup remains non-admin.
// ============================================================

const DEFAULT_ACCESS_DB = 'C:\\Program Files (x86)\\ICV5.5.5\\ICV5.5.5\\Database.mdb';
const ACCESS_BRIDGE_CONFIG_FILE = 'access-bridge-v2.json';
const ACCESS_BRIDGE_DEVICE_KEY = 'skyfit-main-turnstile';
const ACCESS_POLL_INTERVAL_MS = 5000;
const ACCESS_DATA_SYNC_INTERVAL_MS = 60000;

let accessBridgePollTimer = null;
let accessBridgeBusy = false;
let accessBridgeRuntime = {
  configured: false,
  polling: false,
  lastPollAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastCommandId: null,
  lastDataSyncAt: null,
  lastPeopleSyncCount: 0,
  lastEventSyncCount: 0,
  lastDataSyncError: null,
  mode: null,
  deviceKey: null,
  databasePath: DEFAULT_ACCESS_DB,
};

async function getCardRegisterDiagnostics() {
  if (process.platform !== 'win32') return { ok: false, error: 'Card Register diaqnostikası yalnız Windows-da işləyir.', devices: [] };
  const script = `
$ErrorActionPreference = 'Stop'
$items = Get-CimInstance Win32_PnPEntity | Where-Object { ($_.PNPDeviceID -match '^(HID|USB|SMARTCARD)') -and (($_.Name -match '(?i)card|reader|rfid|smart|hid|usb input|register') -or ($_.PNPClass -match '(?i)hid|smartcard')) } | Select-Object Name,Manufacturer,PNPClass,PNPDeviceID,Status
[pscustomobject]@{ ok = $true; devices = @($items) } | ConvertTo-Json -Depth 6 -Compress
`;
  try {
    const result = await runPowerShellJson(script);
    return { ok: true, devices: Array.isArray(result?.devices) ? result.devices : (result?.devices ? [result.devices] : []) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Card Register diaqnostikası alınmadı.', devices: [] };
  }
}

function cleanPowerShellError(value) {
  const text = String(value || '').trim();
  if (!text) return '';

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

function getPowerShell32Path() {
  const systemRoot = process.env.WINDIR || 'C:\\Windows';
  const ps32 = path.join(systemRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const ps64 = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return fs.existsSync(ps32) ? ps32 : ps64;
}

function runPowerShellJson(script) {
  return new Promise((resolve, reject) => {
    const exe = getPowerShell32Path();
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(
      exe,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const message = cleanPowerShellError(stderr || error.message);
          return reject(new Error(message || 'Turniket bazası əməliyyatı alınmadı.'));
        }

        try {
          resolve(JSON.parse(String(stdout || '').trim() || '{}'));
        } catch (parseError) {
          reject(new Error(`Turniket bazası cavabı oxunmadı: ${parseError.message}`));
        }
      }
    );
  });
}

function runPowerShellJsonElevated(script) {
  return new Promise((resolve, reject) => {
    let sudo;
    try {
      sudo = require('sudo-prompt');
    } catch {
      reject(new Error('Yazma üçün yüksəldilmiş Windows icazə modulu tapılmadı. Proqramı yenidən build et.'));
      return;
    }

    const exe = getPowerShell32Path();
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const command = `"${exe}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;

    sudo.exec(
      command,
      { name: 'SKy Fit Pro Turniket Bridge' },
      (error, stdout, stderr) => {
        if (error) {
          const message = cleanPowerShellError(stderr || error.message);
          reject(new Error(message || 'Windows icazəsi verilmədi və MDB-yə yazılmadı.'));
          return;
        }

        try {
          resolve(JSON.parse(String(stdout || '').trim() || '{}'));
        } catch (parseError) {
          reject(new Error(`Turniket yazma cavabı oxunmadı: ${parseError.message}`));
        }
      }
    );
  });
}

function createReadOnlyAccessSnapshot(sourcePath) {
  const tempRoot = fs.mkdtempSync(path.join(app.getPath('temp'), 'skyfit-access-'));
  const sourceExt = path.extname(sourcePath).toLowerCase() || '.mdb';
  const snapshotPath = path.join(tempRoot, `Database-readonly${sourceExt}`);
  fs.copyFileSync(sourcePath, snapshotPath, fs.constants.COPYFILE_FICLONE || 0);
  return { tempRoot, snapshotPath };
}

function removeAccessSnapshot(tempRoot) {
  if (!tempRoot) return;
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // TEMP cleanup failure must not block the app.
  }
}

function accessBridgeConfigPath() {
  return path.join(app.getPath('userData'), ACCESS_BRIDGE_CONFIG_FILE);
}

function loadAccessBridgeConfig() {
  try {
    const file = accessBridgeConfigPath();
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed?.deviceKey || !parsed?.secret || !parsed?.supabaseUrl || !parsed?.anonKey) return null;
    return {
      deviceKey: String(parsed.deviceKey),
      secret: String(parsed.secret),
      supabaseUrl: String(parsed.supabaseUrl).replace(/\/$/, ''),
      anonKey: String(parsed.anonKey),
      databasePath: String(parsed.databasePath || DEFAULT_ACCESS_DB),
      mode: parsed.mode === 'live' ? 'live' : 'test',
      allowLiveWrites: parsed.allowLiveWrites === true,
    };
  } catch {
    return null;
  }
}

function saveAccessBridgeConfig(config) {
  const safe = {
    deviceKey: String(config.deviceKey || ACCESS_BRIDGE_DEVICE_KEY),
    secret: String(config.secret || ''),
    supabaseUrl: String(config.supabaseUrl || '').replace(/\/$/, ''),
    anonKey: String(config.anonKey || ''),
    databasePath: String(config.databasePath || DEFAULT_ACCESS_DB),
    mode: config.mode === 'live' ? 'live' : 'test',
    allowLiveWrites: config.allowLiveWrites === true,
  };

  if (!safe.secret || safe.secret.length < 32) throw new Error('Bridge secret düzgün deyil.');
  if (!safe.supabaseUrl.startsWith('https://')) throw new Error('Supabase URL düzgün deyil.');
  if (safe.anonKey.length < 50) throw new Error('Supabase anon key düzgün deyil.');
  if (safe.mode === 'live' && !safe.allowLiveWrites) {
    throw new Error('Canlı rejim üçün yazma icazəsi açıq şəkildə təsdiqlənməlidir.');
  }

  fs.mkdirSync(path.dirname(accessBridgeConfigPath()), { recursive: true });
  fs.writeFileSync(accessBridgeConfigPath(), JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}

async function chooseAccessDatabase() {
  const defaultPath = fs.existsSync(DEFAULT_ACCESS_DB) ? DEFAULT_ACCESS_DB : undefined;
  if (defaultPath) return defaultPath;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'IC Card Database.mdb faylını seç',
    properties: ['openFile'],
    filters: [
      { name: 'Access database', extensions: ['mdb', 'bak'] },
      { name: 'Bütün fayllar', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) return null;
  return result.filePaths[0];
}

function psSingleQuote(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function normalizeIsoDate(value) {
  const match = String(value || '').trim().match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function validateLegacyEmpNo(value) {
  const text = String(value || '').trim();
  if (!/^\d{1,12}$/.test(text)) throw new Error('Turniket istifadəçi nömrəsi düzgün deyil.');
  return text;
}

function validateCardNumber(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 64 || !/^[A-Za-z0-9_-]+$/.test(text)) {
    throw new Error('Kart nömrəsi düzgün deyil.');
  }
  return text;
}

function buildReadLegacyScript(snapshotPath, sourcePath) {
  const db = psSingleQuote(snapshotPath);
  const source = psSingleQuote(sourcePath);
  return `
$ErrorActionPreference = 'Stop'
$db = '${db}'
$source = '${source}'
$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$db;Mode=Read;")

function Read-TableRows([string]$sql) {
  $rs = New-Object -ComObject ADODB.Recordset
  $rs.Open($sql, $conn, 0, 1)
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
  $rs.Close()
  return $items
}

$people = Read-TableRows 'SELECT * FROM Yz_person'
$events = @()
try { $events = Read-TableRows 'SELECT TOP 5000 * FROM AccessData' } catch { $events = @() }
$conn.Close()
[pscustomobject]@{ ok = $true; path = $source; people = $people; events = $events; snapshot = $true } | ConvertTo-Json -Depth 10 -Compress
`;
}

function createAccessBackup(sourcePath, commandId) {
  const backupDir = path.join(app.getPath('userData'), 'access-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeCommand = String(commandId || 'manual').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50);
  const backupPath = path.join(backupDir, `Database-${stamp}-${safeCommand}.mdb`);
  fs.copyFileSync(sourcePath, backupPath);
  return backupPath;
}

function buildMdbWriteScript(dbPath, command) {
  const db = psSingleQuote(dbPath);
  const rawEmpNo = validateLegacyEmpNo(command.legacy_emp_no);
  const empNo = psSingleQuote(rawEmpNo);
  const type = String(command.command_type || '');
  const payload = command.payload || {};

  const selectorCardRaw = type === 'set_card'
    ? (payload.previous_card_number || payload.match_card_number || '')
    : (payload.match_card_number || payload.previous_card_number || '');
  const selectorCard = psSingleQuote(String(selectorCardRaw || '').trim());
  const selectorName = psSingleQuote(String(payload.match_name || '').trim());

  let writeBody;

  if (type === 'set_validity') {
    const validUntil = normalizeIsoDate(payload.valid_until);
    if (!validUntil) throw new Error('Son tarix YYYY-MM-DD formatında olmalıdır.');

    writeBody = `
      $newDate = New-Object DateTime(${Number(validUntil.slice(0, 4))},${Number(validUntil.slice(5, 7))},${Number(validUntil.slice(8, 10))})
      $rs.Fields.Item('limDate').Value = $newDate
      try { $rs.Fields.Item('isDate').Value = 1 } catch {}
    `;
  } else if (type === 'set_card') {
    const card = psSingleQuote(validateCardNumber(payload.card_number));
    writeBody = `
      $rs.Fields.Item('card_no').Value = '${card}'
    `;
  } else if (type === 'block_access') {
    const blockedUntil = normalizeIsoDate(payload.blocked_until);
    if (!blockedUntil) throw new Error('Bloklama tarixi düzgün deyil.');
    writeBody = `
      $newDate = New-Object DateTime(${Number(blockedUntil.slice(0, 4))},${Number(blockedUntil.slice(5, 7))},${Number(blockedUntil.slice(8, 10))})
      $rs.Fields.Item('limDate').Value = $newDate
      try { $rs.Fields.Item('isDate').Value = 1 } catch {}
    `;
  } else if (type === 'unblock_access') {
    const restoreUntil = normalizeIsoDate(payload.valid_until);
    if (!restoreUntil) throw new Error('Aktivləşdirmə üçün son tarix tələb olunur.');
    writeBody = `
      $newDate = New-Object DateTime(${Number(restoreUntil.slice(0, 4))},${Number(restoreUntil.slice(5, 7))},${Number(restoreUntil.slice(8, 10))})
      $rs.Fields.Item('limDate').Value = $newDate
      try { $rs.Fields.Item('isDate').Value = 1 } catch {}
    `;
  } else {
    throw new Error(`Dəstəklənməyən MDB əmri: ${type}`);
  }

  return `
$ErrorActionPreference = 'Stop'
$db = '${db}'
$targetNo = '${empNo}'
$targetCard = '${selectorCard}'
$targetName = '${selectorName}'

function Normalize-Text($value) {
  if ($null -eq $value -or $value -is [DBNull]) { return '' }
  return ([string]$value).Replace([string][char]0,[string]'').Trim()
}

function Normalize-No($value) {
  $text = Normalize-Text $value
  if (-not $text) { return '' }
  $digits = ($text -replace '[^0-9]','')
  if (-not $digits) { return $text.ToLowerInvariant() }
  $trimmed = $digits.TrimStart('0')
  if (-not $trimmed) { $trimmed = '0' }
  return $trimmed
}

$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$db;")

$rs = New-Object -ComObject ADODB.Recordset
# adOpenKeyset=1, adLockOptimistic=3 -> writable Recordset
$rs.Open('SELECT * FROM Yz_person', $conn, 1, 3)

$targetNoNorm = Normalize-No $targetNo
$targetCardNorm = (Normalize-Text $targetCard).ToUpperInvariant()
$found = $false
$matchedBy = ''
$rawMatchedNo = ''
$rawMatchedCard = ''
$rawMatchedName = ''
$sample = New-Object System.Collections.ArrayList

$empField = $rs.Fields.Item('emp_no')
$empFieldType = $empField.Type
$empFieldSize = $empField.DefinedSize
$cardFieldType = $null
$cardFieldSize = $null
try {
  $cardField = $rs.Fields.Item('card_no')
  $cardFieldType = $cardField.Type
  $cardFieldSize = $cardField.DefinedSize
} catch {}

while (-not $rs.EOF) {
  $rowNo = Normalize-Text $rs.Fields.Item('emp_no').Value
  $rowNoNorm = Normalize-No $rowNo
  $rowCard = ''
  $rowName = ''
  try { $rowCard = Normalize-Text $rs.Fields.Item('card_no').Value } catch {}
  try { $rowName = Normalize-Text $rs.Fields.Item('emp_name').Value } catch {}

  if ($sample.Count -lt 12) {
    [void]$sample.Add("$rowNo|$rowCard|$rowName")
  }

  $isMatch = $false
  if ($rowNo -eq $targetNo -or ($targetNoNorm -and $rowNoNorm -eq $targetNoNorm)) {
    $isMatch = $true
    $matchedBy = 'emp_no'
  } elseif ($targetCardNorm -and $rowCard -and $rowCard.ToUpperInvariant() -eq $targetCardNorm) {
    $isMatch = $true
    $matchedBy = 'card_no'
  }

  if ($isMatch) {
    $found = $true
    $rawMatchedNo = $rowNo
    $rawMatchedCard = $rowCard
    $rawMatchedName = $rowName

${writeBody}
    $rs.Update()

    # Persisted values are read from the current updated row.
    $out = [ordered]@{}
    foreach ($fieldName in @('emp_no','card_no','emp_name','limDate_start','limDate','isDate_start','isDate')) {
      try {
        $v = $rs.Fields.Item($fieldName).Value
        if ($null -eq $v -or $v -is [DBNull]) { $out[$fieldName] = $null }
        elseif ($v -is [DateTime]) { $out[$fieldName] = $v.ToString('yyyy-MM-dd HH:mm:ss') }
        else { $out[$fieldName] = $v }
      } catch {}
    }
    break
  }

  $rs.MoveNext()
}

if (-not $found) {
  $rs.Close(); $conn.Close()
  $schema = "emp_no(type=$empFieldType,size=$empFieldSize) card_no(type=$cardFieldType,size=$cardFieldSize)"
  $sampleText = ($sample -join '; ')
  throw "Turniket istifadəçisi MDB bazasında tapılmadı. targetNo=[$targetNo], targetNoNorm=[$targetNoNorm], targetCard=[$targetCard], schema=$schema, sample=$sampleText"
}

$rs.Close(); $conn.Close()
[pscustomobject]@{
  ok = $true
  matched_by = $matchedBy
  matched_emp_no = $rawMatchedNo
  matched_card_no = $rawMatchedCard
  matched_name = $rawMatchedName
  emp_no_field_type = $empFieldType
  emp_no_field_size = $empFieldSize
  card_no_field_type = $cardFieldType
  card_no_field_size = $cardFieldSize
  row = [pscustomobject]$out
} | ConvertTo-Json -Depth 8 -Compress
`;
}

async function applyAccessCommandToMdb(config, command) {
  const dbPath = String(config.databasePath || DEFAULT_ACCESS_DB);
  if (!fs.existsSync(dbPath)) throw new Error(`Database.mdb tapılmadı: ${dbPath}`);
  if (path.extname(dbPath).toLowerCase() !== '.mdb') throw new Error('Canlı yazma yalnız Database.mdb üçün aktivdir.');
  if (config.mode === 'live' && !config.allowLiveWrites) throw new Error('Canlı MDB yazması bu kompüterdə təsdiqlənməyib.');

  const lockPath = dbPath.replace(/\.mdb$/i, '.ldb');
  if (fs.existsSync(lockPath)) {
    throw new Error('IC Card Management proqramı və ya MDB bazası hazırda açıqdır. Yazmadan əvvəl köhnə proqramı bağla.');
  }

  const backupPath = createAccessBackup(dbPath, command.id);
  const script = buildMdbWriteScript(dbPath, command);

  try {
    const result = await runPowerShellJson(script);
    return { ...result, backup_path: backupPath, elevated: false, mode: config.mode };
  } catch (error) {
    const message = String(error?.message || '');
    const needsElevation = /lock file|access.*denied|permission|icaz|could not lock|updateable query/i.test(message);
    if (!needsElevation) throw error;

    const result = await runPowerShellJsonElevated(script);
    return { ...result, backup_path: backupPath, elevated: true, mode: config.mode };
  }
}

async function supabaseBridgeRpc(config, functionName, payload) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!response.ok) {
    const detail = body?.message || body?.error || text || `HTTP ${response.status}`;
    throw new Error(`Bridge RPC xətası: ${detail}`);
  }
  return body;
}


function accessPick(row, names) {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const hit = entries.find(([key]) => String(key).toLowerCase() === String(name).toLowerCase());
    if (hit && hit[1] !== null && hit[1] !== undefined && String(hit[1]).trim() !== '') return hit[1];
  }
  return null;
}

function accessDateOnly(value) {
  const text = String(value || '').trim().replace(/\//g, '-');
  const match = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
}

function accessDateTime(value) {
  const text = String(value || '').trim().replace(/\//g, '-');
  const match = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}T${String(match[4] || '00').padStart(2,'0')}:${String(match[5] || '00').padStart(2,'0')}:${String(match[6] || '00').padStart(2,'0')}`;
}

function accessInferPhone(row) {
  const direct = accessPick(row, ['phone','tel','telephone','mobile','mobile_phone','phone_no','emp_phone']);
  if (direct) return String(direct).trim();
  for (const value of Object.values(row || {})) {
    const text = String(value ?? '').replace(/\s+/g,'');
    const hit = text.match(/(?:\+?994|0)(?:10|50|51|55|60|70|77|99)\d{7}/);
    if (hit) return hit[0];
  }
  return null;
}

function canonicalizeBridgePeople(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    legacy_emp_no: String(accessPick(row,['emp_no','number','employee_no','user_no']) ?? '').trim(),
    legacy_card_no: String(accessPick(row,['card_no','card_id','cardnumber']) ?? '').trim() || null,
    legacy_name: String(accessPick(row,['emp_name','name','username']) ?? '').trim() || null,
    legacy_phone: accessInferPhone(row),
    room_number: String(accessPick(row,['room_number','room','floor']) ?? '').trim() || null,
    valid_from: accessDateOnly(accessPick(row,['limDate_start','effective_start_date','start_date'])),
    valid_until: accessDateOnly(accessPick(row,['limDate','effective_end_date','end_date'])),
    frequency_control: accessPick(row,['isTimes','frequency_control']),
    frequency_limit: accessPick(row,['Times','frequency_limit']),
    raw_data: row,
  })).filter(row => row.legacy_emp_no);
}

function canonicalizeBridgeEvents(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const card = String(accessPick(row,['card_id','card_no','card_number']) ?? '').trim() || null;
    const eventAt = accessDateTime(accessPick(row,['through_time','event_at','time','record_time','datetime']));
    if (!eventAt) return null;
    const type = String(accessPick(row,['card_type','direction','event_type']) ?? 'unknown').trim() || 'unknown';
    const sourceId = String(accessPick(row,['id','record_id','record_no','sn','serial_no']) ?? '').trim();
    return {
      legacy_event_key: sourceId ? `mdb:${sourceId}` : `${card || 'nocard'}|${eventAt}|${type}`,
      card_number: card,
      event_at: eventAt,
      direction: type,
      result: 'granted',
      raw_data: row,
    };
  }).filter(Boolean);
}

async function syncAccessDatabaseToSupabase(config) {
  let snapshot = null;
  try {
    const dbPath = String(config.databasePath || DEFAULT_ACCESS_DB);
    if (!fs.existsSync(dbPath)) return;
    snapshot = createReadOnlyAccessSnapshot(dbPath);
    const data = await runPowerShellJson(buildReadLegacyScript(snapshot.snapshotPath, dbPath));
    const people = canonicalizeBridgePeople(data?.people);
    const events = canonicalizeBridgeEvents(data?.events);
    let peopleCount = 0;
    let eventCount = 0;

    for (let i = 0; i < people.length; i += 100) {
      const chunk = people.slice(i, i + 100);
      const result = await supabaseBridgeRpc(config, 'access_bridge_sync_people_v3', {
        p_device_key: config.deviceKey,
        p_secret: config.secret,
        p_rows: chunk,
        p_source_path: dbPath,
      });
      peopleCount += Number(result?.imported || chunk.length);
    }

    for (let i = 0; i < events.length; i += 200) {
      const chunk = events.slice(i, i + 200);
      const result = await supabaseBridgeRpc(config, 'access_bridge_sync_events_v3', {
        p_device_key: config.deviceKey,
        p_secret: config.secret,
        p_rows: chunk,
      });
      eventCount += Number(result?.imported || chunk.length);
    }

    accessBridgeRuntime.lastDataSyncAt = new Date().toISOString();
    accessBridgeRuntime.lastPeopleSyncCount = peopleCount;
    accessBridgeRuntime.lastEventSyncCount = eventCount;
    accessBridgeRuntime.lastDataSyncError = null;
  } finally {
    removeAccessSnapshot(snapshot?.tempRoot);
  }
}

async function completeAccessBridgeCommand(config, commandId, ok, result, errorMessage) {
  return supabaseBridgeRpc(config, 'access_bridge_complete_command_v2', {
    p_device_key: config.deviceKey,
    p_secret: config.secret,
    p_command_id: commandId,
    p_ok: Boolean(ok),
    p_result: result || {},
    p_error: errorMessage || null,
  });
}

async function pollAccessBridgeOnce() {
  const config = loadAccessBridgeConfig();
  if (!config || accessBridgeBusy) return;

  accessBridgeBusy = true;
  accessBridgeRuntime.configured = true;
  accessBridgeRuntime.polling = true;
  accessBridgeRuntime.deviceKey = config.deviceKey;
  accessBridgeRuntime.mode = config.mode;
  accessBridgeRuntime.databasePath = config.databasePath;
  accessBridgeRuntime.lastPollAt = new Date().toISOString();

  try {
    const response = await supabaseBridgeRpc(config, 'access_bridge_pull_commands_v2', {
      p_device_key: config.deviceKey,
      p_secret: config.secret,
      p_limit: 5,
    });

    const commands = Array.isArray(response?.commands) ? response.commands : [];
    accessBridgeRuntime.lastSuccessAt = new Date().toISOString();
    accessBridgeRuntime.lastError = null;

    for (const command of commands) {
      accessBridgeRuntime.lastCommandId = command.id || null;
      try {
        const result = await applyAccessCommandToMdb(config, command);
        await completeAccessBridgeCommand(config, command.id, true, result, null);
      } catch (error) {
        await completeAccessBridgeCommand(config, command.id, false, {}, error?.message || 'MDB əmri tətbiq edilmədi.');
        accessBridgeRuntime.lastError = error?.message || 'MDB əmri tətbiq edilmədi.';
      }
    }

    // Telefon/NFC giriş proqram qatını da bridge görür. Hazırda real
    // controller relay/network adapterinin modeli təsdiqlənmədiyi üçün
    // fiziki turniketi saxta şəkildə açmırıq; istifadəçiyə dəqiq səbəb
    // qaytarırıq. Controller adapteri qoşulanda yalnız bu hook dəyişəcək.
    try {
      const mobileResponse = await supabaseBridgeRpc(config, 'access_bridge_pull_mobile_entries_v1', {
        p_device_key: config.deviceKey,
        p_secret: config.secret,
        p_limit: 5,
      });
      const mobileRequests = Array.isArray(mobileResponse?.requests) ? mobileResponse.requests : [];
      for (const request of mobileRequests) {
        await supabaseBridgeRpc(config, 'access_bridge_complete_mobile_entry_v1', {
          p_device_key: config.deviceKey,
          p_secret: config.secret,
          p_request_id: request.id,
          p_ok: false,
          p_reason_code: 'hardware_not_ready',
          p_reason_message: 'Turniket controller adapteri hələ konfiqurasiya edilməyib.',
          p_result: { gate_key: request.gate_key || 'main' },
        });
      }
    } catch (mobileError) {
      // Mobile entry V5 SQL hələ tətbiq edilməyibsə əsas MDB bridge dayanmasın.
      if (!/access_bridge_(pull|complete)_mobile_entries|access_bridge_complete_mobile_entry/i.test(String(mobileError?.message || ''))) {
        console.warn('[SKy Fit Bridge] Mobile entry:', mobileError);
      }
    }

    const lastDataSyncMs = accessBridgeRuntime.lastDataSyncAt
      ? Date.parse(accessBridgeRuntime.lastDataSyncAt)
      : 0;
    if (!lastDataSyncMs || Date.now() - lastDataSyncMs >= ACCESS_DATA_SYNC_INTERVAL_MS) {
      try {
        await syncAccessDatabaseToSupabase(config);
      } catch (syncError) {
        accessBridgeRuntime.lastDataSyncError = syncError?.message || 'Turniket məlumatlarının avtomatik sinxronu alınmadı.';
      }
    }
  } catch (error) {
    accessBridgeRuntime.lastError = error?.message || 'Bridge sinxronu alınmadı.';
  } finally {
    accessBridgeBusy = false;
  }
}

function startAccessBridgePolling() {
  if (accessBridgePollTimer) clearInterval(accessBridgePollTimer);
  accessBridgePollTimer = setInterval(() => { void pollAccessBridgeOnce(); }, ACCESS_POLL_INTERVAL_MS);
  void pollAccessBridgeOnce();
}

ipcMain.handle('access:read-legacy-database', async () => {
  if (process.platform !== 'win32') return { ok: false, error: 'MDB bridge yalnız Windows-da işləyir.' };

  let snapshot = null;
  try {
    const dbPath = await chooseAccessDatabase();
    if (!dbPath) return { ok: false, cancelled: true, error: 'Fayl seçilmədi.' };
    if (!fs.existsSync(dbPath)) return { ok: false, error: 'Database faylı tapılmadı.' };

    const ext = path.extname(dbPath).toLowerCase();
    if (!['.mdb', '.bak'].includes(ext)) return { ok: false, error: 'Yalnız .mdb və .bak faylları qəbul edilir.' };

    snapshot = createReadOnlyAccessSnapshot(dbPath);
    return await runPowerShellJson(buildReadLegacyScript(snapshot.snapshotPath, dbPath));
  } catch (error) {
    return { ok: false, error: error?.message || 'Turniket bazası oxunmadı.' };
  } finally {
    removeAccessSnapshot(snapshot?.tempRoot);
  }
});

ipcMain.handle('access:configure-bridge', async (_event, input) => {
  if (process.platform !== 'win32') return { ok: false, error: 'Bridge yalnız Windows-da işləyir.' };
  try {
    const dbPath = String(input?.databasePath || DEFAULT_ACCESS_DB);
    if (!fs.existsSync(dbPath)) return { ok: false, error: `Database.mdb tapılmadı: ${dbPath}` };
    const config = saveAccessBridgeConfig({ ...input, databasePath: dbPath });
    accessBridgeRuntime = {
      ...accessBridgeRuntime,
      configured: true,
      polling: true,
      mode: config.mode,
      deviceKey: config.deviceKey,
      databasePath: config.databasePath,
      lastError: null,
    };
    startAccessBridgePolling();
    return { ok: true, status: { ...accessBridgeRuntime } };
  } catch (error) {
    return { ok: false, error: error?.message || 'Bridge konfiqurasiyası saxlanmadı.' };
  }
});

ipcMain.handle('access:get-bridge-status', async () => {
  const config = loadAccessBridgeConfig();
  return {
    ok: true,
    status: {
      ...accessBridgeRuntime,
      configured: Boolean(config),
      polling: Boolean(config && accessBridgePollTimer),
      mode: config?.mode || accessBridgeRuntime.mode,
      deviceKey: config?.deviceKey || accessBridgeRuntime.deviceKey,
      databasePath: config?.databasePath || accessBridgeRuntime.databasePath,
    },
  };
});

ipcMain.handle('access:card-register-diagnostics', async () => getCardRegisterDiagnostics());

ipcMain.handle('access:run-bridge-now', async () => {
  try {
    await pollAccessBridgeOnce();
    return { ok: true, status: { ...accessBridgeRuntime } };
  } catch (error) {
    return { ok: false, error: error?.message || 'Bridge yoxlaması alınmadı.' };
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


      // All local pages are served from skyfit://app/... so
      // Supabase Auth uses one persistent Web Storage origin.
      protocol.handle(
        SKYFIT_APP_SCHEME,
        request => {
          try {
            const target = new URL(request.url);

            if (target.host !== SKYFIT_APP_HOST) {
              return new Response('Not found', { status: 404 });
            }

            const decodedPath =
              decodeURIComponent(target.pathname || '/');

            const requestedPath =
              decodedPath === '/'
                ? '/index.html'
                : decodedPath;

            const filePath =
              path.resolve(
                ROOT_DIR,
                `.${requestedPath}`
              );

            const relativePath =
              path.relative(
                ROOT_DIR,
                filePath
              );

            const isSafe =
              Boolean(relativePath) &&
              !relativePath.startsWith('..') &&
              !path.isAbsolute(relativePath);

            if (!isSafe) {
              return new Response('Bad request', { status: 400 });
            }

            if (
              !fs.existsSync(filePath) ||
              !fs.statSync(filePath).isFile()
            ) {
              return new Response('Not found', { status: 404 });
            }

            return net.fetch(
              pathToFileURL(filePath).toString()
            );
          } catch {
            return new Response('Bad request', { status: 400 });
          }
        }
      );


      createMainWindow();
      startAccessBridgePolling();


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
