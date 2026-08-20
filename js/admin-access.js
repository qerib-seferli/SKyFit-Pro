// SKy Fit Pro — Turniket / IC Card admin controller V2
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  TABLES,
  RPC,
} from './config.js';

import {
  byId,
  escapeHtml,
  normalizeSearch,
  notify,
  getErrorMessage,
  openModal,
  closeModal,
} from './core.js';

const BRIDGE_DEVICE_KEY = 'skyfit-main-turnstile';

function pick(row, names) {
  const entries = Object.entries(row || {});
  for (const name of names) {
    const hit = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (hit && hit[1] !== null && hit[1] !== undefined && String(hit[1]).trim() !== '') return hit[1];
  }
  return null;
}

function inferPhone(row) {
  const direct = pick(row, ['phone','tel','telephone','mobile','mobile_phone','phone_no','emp_phone']);
  if (direct) return String(direct).trim();

  for (const value of Object.values(row || {})) {
    const text = String(value ?? '').replace(/\s+/g, '');
    if (/(?:\+?994|0)(?:10|50|51|55|60|70|77|99)\d{7}/.test(text)) return text;
  }
  return null;
}

function dateValue(value) {
  if (!value) return null;
  const text = String(value).trim().replaceAll('/', '-');
  const match = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}`;
}

function dateTimeValue(value) {
  if (!value) return null;
  const text = String(value).trim().replaceAll('/', '-');
  const match = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) return null;
  const hh = String(match[4] || '00').padStart(2,'0');
  const mm = String(match[5] || '00').padStart(2,'0');
  const ss = String(match[6] || '00').padStart(2,'0');
  return `${match[1]}-${String(match[2]).padStart(2,'0')}-${String(match[3]).padStart(2,'0')}T${hh}:${mm}:${ss}`;
}

function canonicalize(row) {
  return {
    legacy_emp_no: String(pick(row,['emp_no','number','employee_no','user_no']) ?? '').trim(),
    legacy_card_no: String(pick(row,['card_no','card_id','cardnumber']) ?? '').trim() || null,
    legacy_name: String(pick(row,['emp_name','name','username']) ?? '').trim() || null,
    legacy_phone: inferPhone(row),
    room_number: String(pick(row,['room_number','room','floor']) ?? '').trim() || null,
    valid_from: dateValue(pick(row,['limDate_start','effective_start_date','start_date'])),
    valid_until: dateValue(pick(row,['limDate','effective_end_date','end_date'])),
    frequency_control: pick(row,['isTimes','frequency_control']),
    frequency_limit: pick(row,['Times','frequency_limit']),
    raw_data: row,
  };
}

function canonicalizeEvent(row, index) {
  const card = String(pick(row,['card_id','card_no','card_number']) ?? '').trim() || null;
  const eventAt = dateTimeValue(pick(row,['through_time','event_at','time','record_time','datetime']));
  if (!eventAt) return null;
  const type = String(pick(row,['card_type','direction','event_type']) ?? 'unknown').trim();
  return {
    legacy_event_key: `${card || 'nocard'}|${eventAt}|${type}|${index}`,
    card_number: card,
    event_at: eventAt,
    direction: type || 'unknown',
    result: 'granted',
    raw_data: row,
  };
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => value.toString(16).padStart(2,'0')).join('');
}

function commandLabel(type) {
  if (type === 'set_validity') return 'Müddət dəyiş';
  if (type === 'set_card') return 'Kart dəyiş';
  if (type === 'block_access') return 'Girişi blokla';
  if (type === 'unblock_access') return 'Girişi aktiv et';
  return type || 'Əmr';
}

function isoToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function addDaysIso(value, days) {
  const parsed = value ? new Date(`${value}T12:00:00`) : new Date();
  const base = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
}

function extensionBase(validUntil) {
  const today = isoToday();
  return validUntil && validUntil > today ? validUntil : today;
}

function commandStatus(status) {
  const map = {
    pending: ['Gözləyir','ui-badge--warning'],
    processing: ['İcra olunur','ui-badge--neutral'],
    done: ['Tamamlandı','ui-badge--success'],
    failed: ['Xəta','ui-badge--danger'],
    cancelled: ['Ləğv edildi','ui-badge--neutral'],
  };
  return map[status] || [status || '—','ui-badge--neutral'];
}

export function createAdminAccessController({ state }) {
  const local = {
    rows: [],
    events: [],
    path: null,
    remote: [],
    commands: [],
    devices: [],
    remoteEvents: [],
    cardDiagnostics: null,
    controllerDiagnostics: null,
    desktopStatus: null,
  };

  async function loadRemote() {
    const [peopleResult, commandResult, deviceResult, eventResult] = await Promise.all([
      supabase
        .from(TABLES.accessLegacyPeople)
        .select('id,legacy_emp_no,legacy_card_no,legacy_name,legacy_phone,room_number,valid_from,valid_until,profile_id,match_method,last_seen_at,manual_blocked,blocked_at,blocked_previous_valid_until')
        .order('legacy_emp_no', { ascending: true }),
      supabase
        .from(TABLES.accessCommands)
        .select('id,command_type,legacy_person_id,payload,status,requested_at,processed_at,error_message,result,target_device_key')
        .order('requested_at', { ascending: false })
        .limit(15),
      supabase
        .from(TABLES.accessDevices)
        .select('id,device_key,name,bridge_mode,is_active,last_seen_at,last_heartbeat_at')
        .order('created_at', { ascending: true }),
      supabase
        .from(TABLES.accessEvents)
        .select('id,legacy_person_id,profile_id,card_number,event_at,direction,result,source')
        .order('event_at', { ascending: false })
        .limit(100),
    ]);

    if (peopleResult.error) throw peopleResult.error;
    if (commandResult.error) throw commandResult.error;
    if (deviceResult.error) throw deviceResult.error;
    if (eventResult.error) throw eventResult.error;

    local.remote = Array.isArray(peopleResult.data) ? peopleResult.data : [];
    local.commands = Array.isArray(commandResult.data) ? commandResult.data : [];
    local.devices = Array.isArray(deviceResult.data) ? deviceResult.data : [];
    local.remoteEvents = Array.isArray(eventResult.data) ? eventResult.data : [];

    await refreshDesktopStatus();
    render();
    return local.remote;
  }

  async function refreshDesktopStatus() {
    if (!window.skyfitDesktop?.getAccessBridgeStatus) {
      local.desktopStatus = null;
      return null;
    }
    try {
      const result = await window.skyfitDesktop.getAccessBridgeStatus();
      local.desktopStatus = result?.status || null;
      return local.desktopStatus;
    } catch {
      local.desktopStatus = null;
      return null;
    }
  }

  function memberById(id) {
    return state.members.find(item => String(item.id) === String(id));
  }

  function bridgeDevice() {
    return local.devices.find(item => item.device_key === BRIDGE_DEVICE_KEY) || local.devices[0] || null;
  }

  function renderStats() {
    const rows = local.remote;
    const linked = rows.filter(row => row.profile_id).length;
    const device = bridgeDevice();
    const heartbeat = device?.last_heartbeat_at ? new Date(device.last_heartbeat_at).getTime() : 0;
    const online = heartbeat && Date.now() - heartbeat < 30000;
    const desktop = local.desktopStatus;

    const set = (id, value) => {
      const el = byId(id);
      if (el) el.textContent = value;
    };

    set('access-kpi-total', String(rows.length));
    set('access-kpi-linked', String(linked));
    set('access-kpi-unlinked', String(rows.length - linked));

    if (window.skyfitDesktop?.isElectron) {
      set('access-kpi-local', desktop?.configured
        ? `Bridge ${desktop.mode === 'live' ? 'LIVE' : 'TEST'} · ${desktop.polling ? 'aktiv' : 'dayanıb'}`
        : 'Desktop hazır · Bridge qurulmayıb');
    } else {
      set('access-kpi-local', online ? `Zal bridge online · ${device?.bridge_mode || '—'}` : 'Brauzer · Zal bridge offline');
    }

    const bridgeState = byId('access-bridge-state');
    if (bridgeState) {
      bridgeState.textContent = online
        ? `Online · son heartbeat ${new Date(device.last_heartbeat_at).toLocaleTimeString('az-AZ')}`
        : device
          ? `Offline · son heartbeat ${device.last_heartbeat_at ? new Date(device.last_heartbeat_at).toLocaleString('az-AZ') : 'yoxdur'}`
          : 'Bridge hələ qeydiyyatdan keçirilməyib';
    }
  }

  function renderPeople() {
    const root = byId('access-people-list');
    if (!root) return;

    const q = normalizeSearch(byId('access-search')?.value);
    const status = byId('access-status-filter')?.value || 'all';
    const rows = local.remote.filter(row => {
      if (status === 'linked' && !row.profile_id) return false;
      if (status === 'unlinked' && row.profile_id) return false;
      if (!q) return true;
      const member = memberById(row.profile_id);
      return normalizeSearch([
        row.legacy_emp_no,
        row.legacy_name,
        row.legacy_phone,
        row.legacy_card_no,
        member?.full_name,
        member?.phone,
      ].filter(Boolean).join(' ')).includes(q);
    });

    if (!rows.length) {
      root.innerHTML = '<div class="admin-empty-state"><strong>Məlumat tapılmadı</strong><span>Lokal bazanı oxuyub Supabase-a sinxron et.</span></div>';
      return;
    }

    root.innerHTML = `<table class="admin-table access-table"><thead><tr><th>№</th><th>Turniket üzvü</th><th>Telefon / kart</th><th>Son tarix</th><th>SKyFit uyğunluğu</th><th></th></tr></thead><tbody>${rows.map(row => {
      const member = memberById(row.profile_id);
      return `<tr>
        <td><strong>${escapeHtml(row.legacy_emp_no || '—')}</strong></td>
        <td><strong>${escapeHtml(row.legacy_name || '—')}</strong><small>${escapeHtml(row.room_number || '')}</small></td>
        <td><span>${escapeHtml(row.legacy_phone || 'Telefon yoxdur')}</span><small>${escapeHtml(row.legacy_card_no || 'Kart yoxdur')}</small></td>
        <td>${row.manual_blocked
          ? `<span class="ui-badge ui-badge--danger">Bloklanıb</span><small>${escapeHtml(row.blocked_previous_valid_until || row.valid_until || '—')}</small>`
          : escapeHtml(row.valid_until || '—')}</td>
        <td>${member ? `<span class="ui-badge ui-badge--success">Bağlanıb</span><small>${escapeHtml(member.full_name || member.phone || '')}</small>` : '<span class="ui-badge ui-badge--warning">Uyğunlaşdırılmayıb</span>'}</td>
        <td>
          <button type="button" class="ui-button ui-button--ghost ui-button--sm" data-access-manage="${row.id}">İdarə et</button>
          <button type="button" class="ui-button ui-button--ghost ui-button--sm" data-access-link="${row.id}">${member ? 'Dəyiş' : 'Bağla'}</button>
          ${member ? `<button type="button" class="ui-button ui-button--ghost ui-button--sm" data-access-unlink="${row.id}">Ayır</button>` : ''}
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderCommands() {
    const root = byId('access-command-list');
    if (!root) return;

    if (!local.commands.length) {
      root.innerHTML = '<div class="admin-empty-state"><strong>Əmr yoxdur</strong><span>MDB-yə göndərilən idarəetmə əmrləri burada görünəcək.</span></div>';
      return;
    }

    root.innerHTML = `<table class="admin-table"><thead><tr><th>Əmr</th><th>Turniket №</th><th>Status</th><th>Tarix</th><th>Nəticə</th></tr></thead><tbody>${local.commands.map(command => {
      const person = local.remote.find(row => String(row.id) === String(command.legacy_person_id));
      const [label, cls] = commandStatus(command.status);
      return `<tr>
        <td><strong>${escapeHtml(commandLabel(command.command_type))}</strong></td>
        <td>${escapeHtml(person?.legacy_emp_no || '—')}</td>
        <td><span class="ui-badge ${cls}">${escapeHtml(label)}</span></td>
        <td>${escapeHtml(command.requested_at ? new Date(command.requested_at).toLocaleString('az-AZ') : '—')}</td>
        <td><small>${escapeHtml(command.error_message || (command.status === 'done' ? 'Uğurlu' : '—'))}</small></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderEvents() {
    const root = byId('access-event-list');
    if (!root) return;
    if (!local.remoteEvents.length) { root.innerHTML = '<div class="admin-empty-state"><strong>Giriş qeydi yoxdur</strong><span>Bridge AccessData-dan keçidləri oxuyanda burada görünəcək.</span></div>'; return; }
    root.innerHTML = `<table class="admin-table"><thead><tr><th>Tarix</th><th>Üzv</th><th>Kart</th><th>İstiqamət</th><th>Nəticə</th></tr></thead><tbody>${local.remoteEvents.map(event => { const member = event.profile_id ? memberById(event.profile_id) : null; const legacy = event.legacy_person_id ? local.remote.find(row => String(row.id) === String(event.legacy_person_id)) : null; const name = member?.full_name || legacy?.legacy_name || 'Uyğunlaşdırılmayıb'; return `<tr><td>${escapeHtml(event.event_at ? new Date(event.event_at).toLocaleString('az-AZ') : '—')}</td><td><strong>${escapeHtml(name)}</strong></td><td>${escapeHtml(event.card_number || '—')}</td><td>${escapeHtml(event.direction || 'unknown')}</td><td>${escapeHtml(event.result || '—')}</td></tr>`; }).join('')}</tbody></table>`;
  }

  function renderCardDiagnostics() {
    const root = byId('access-card-register-list');
    if (!root) return;
    const diag = local.cardDiagnostics;

    if (!diag) {
      root.innerHTML = '<div class="admin-empty-state"><strong>Hələ yoxlanmayıb</strong><span>Card Register-i qoş və yoxla.</span></div>';
      return;
    }

    const devices = Array.isArray(diag.devices) ? diag.devices : [];
    const stateEl = byId('access-card-register-state');
    if (stateEl) stateEl.textContent = diag.ok
      ? `${devices.length} USB/HID namizəd cihaz tapıldı.`
      : (diag.error || 'Diaqnostika alınmadı.');

    root.innerHTML = devices.length
      ? `<table class="admin-table"><thead><tr><th>Cihaz</th><th>İstehsalçı</th><th>VID / PID</th><th>Sinif</th><th>PNP ID</th><th>Status</th></tr></thead><tbody>${devices.map(d => `<tr>
          <td><strong>${escapeHtml(d.Name || '—')}</strong></td>
          <td>${escapeHtml(d.Manufacturer || '—')}</td>
          <td><strong>${escapeHtml(d.VID || '—')} / ${escapeHtml(d.PID || '—')}</strong></td>
          <td>${escapeHtml(d.PNPClass || '—')}</td>
          <td><small>${escapeHtml(d.PNPDeviceID || '—')}</small></td>
          <td>${escapeHtml(d.Status || '—')}</td>
        </tr>`).join('')}</tbody></table>`
      : '<div class="admin-empty-state"><strong>USB/HID namizəd cihaz tapılmadı</strong><span>Card Register qoşuludursa bu nəticənin şəklini göndər. Xüsusi HID driver/protokolu ola bilər.</span></div>';
  }

  async function inspectCardRegister() {
    if (!window.skyfitDesktop?.getCardRegisterDiagnostics) {
      notify.warning('Bu yoxlama yalnız Windows Desktop tətbiqində işləyir.');
      return;
    }

    const button = byId('access-card-register-check');
    const original = button?.textContent || 'Card Register yoxla';
    if (button) {
      button.disabled = true;
      button.textContent = 'Yoxlanılır...';
    }

    try {
      notify.info('Windows-da Card Register / USB HID cihazları yoxlanılır...');
      local.cardDiagnostics = await window.skyfitDesktop.getCardRegisterDiagnostics();
      renderCardDiagnostics();
      const count = Array.isArray(local.cardDiagnostics?.devices) ? local.cardDiagnostics.devices.length : 0;
      if (local.cardDiagnostics?.ok) notify.success(`Card Register diaqnostikası tamamlandı: ${count} namizəd cihaz.`);
      else notify.error(local.cardDiagnostics?.error || 'Card Register diaqnostikası alınmadı.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function renderControllerDiagnostics() {
    const root = byId('access-controller-list');
    const stateEl = byId('access-controller-state');
    if (!root) return;

    const diag = local.controllerDiagnostics;
    if (!diag) {
      root.innerHTML = '<div class="admin-empty-state"><strong>Hələ yoxlanmayıb</strong><span>Zal kompüterində Controller yoxla düyməsini bas.</span></div>';
      return;
    }

    if (!diag.ok) {
      if (stateEl) stateEl.textContent = diag.error || 'Controller diaqnostikası alınmadı.';
      root.innerHTML = `<div class="admin-empty-state"><strong>Diaqnostika alınmadı</strong><span>${escapeHtml(diag.error || 'Naməlum xəta')}</span></div>`;
      return;
    }

    const pnp = Array.isArray(diag.pnpDevices) ? diag.pnpDevices : [];
    const samples = Array.isArray(diag.tableSamples) ? diag.tableSamples : [];
    const nonEmptySamples = samples.filter(item => Array.isArray(item.rows) && item.rows.length);

    if (stateEl) {
      stateEl.textContent = `${diag.databasePath || 'Database.mdb'} · ${pnp.length} PnP cihaz · ${nonEmptySamples.length} namizəd MDB cədvəli`;
    }

    const pnpHtml = pnp.length
      ? `<h4 style="margin:0 0 10px">Windows cihazları</h4><table class="admin-table"><thead><tr><th>Cihaz</th><th>İstehsalçı</th><th>Sinif</th><th>PNP ID</th><th>Status</th></tr></thead><tbody>${pnp.map(d => `<tr><td><strong>${escapeHtml(d.Name || '—')}</strong></td><td>${escapeHtml(d.Manufacturer || '—')}</td><td>${escapeHtml(d.PNPClass || '—')}</td><td><small>${escapeHtml(d.PNPDeviceID || '—')}</small></td><td>${escapeHtml(d.Status || '—')}</td></tr>`).join('')}</tbody></table>`
      : '<div class="admin-empty-state"><strong>ZKTeco adı ilə PnP cihaz tapılmadı</strong><span>Bu normal ola bilər; controller şəbəkə/RS-485 ilə işləyə bilər.</span></div>';

    const mdbHtml = nonEmptySamples.length
      ? nonEmptySamples.map(item => {
          const rows = item.rows.slice(0, 6);
          const keys = [...new Set(rows.flatMap(row => Object.keys(row || {})))].slice(0, 10);
          return `<div style="margin-top:16px"><h4 style="margin:0 0 8px">${escapeHtml(item.table || 'MDB')}</h4><div class="admin-table-wrap"><table class="admin-table"><thead><tr>${keys.map(k => `<th>${escapeHtml(k)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${keys.map(k => `<td><small>${escapeHtml(row?.[k] ?? '—')}</small></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
        }).join('')
      : '<div class="admin-empty-state" style="margin-top:14px"><strong>Namizəd MDB cədvəlində məlumat tapılmadı</strong><span>Diaqnostika nəticəsini göndər; növbəti adapteri buna görə quraq.</span></div>';

    const arp = String(diag.arp || '').trim();
    root.innerHTML = `${pnpHtml}${mdbHtml}${arp ? `<details style="margin-top:16px"><summary>Şəbəkə ARP siyahısı</summary><pre style="white-space:pre-wrap;overflow:auto;max-height:280px">${escapeHtml(arp)}</pre></details>` : ''}`;
  }

  async function inspectController() {
    if (!window.skyfitDesktop?.getTurnstileControllerDiagnostics) {
      notify.warning('Controller yoxlaması yalnız Windows Desktop tətbiqində işləyir.');
      return;
    }

    const button = byId('access-controller-check');
    const original = button?.textContent || 'Controller yoxla';
    if (button) {
      button.disabled = true;
      button.textContent = 'Yoxlanılır...';
    }

    try {
      notify.info('Controller, MDB konfiqurasiyası və Windows şəbəkəsi oxunur...');
      local.controllerDiagnostics = await window.skyfitDesktop.getTurnstileControllerDiagnostics();
      renderControllerDiagnostics();
      if (local.controllerDiagnostics?.ok) notify.success('Controller diaqnostikası tamamlandı.');
      else notify.error(local.controllerDiagnostics?.error || 'Controller diaqnostikası alınmadı.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  async function rotateMobileGateToken() {
    const button = byId('access-mobile-gate-token');
    const output = byId('access-mobile-gate-output');
    if (!button || !output) return;

    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Yaradılır...';

    try {
      const { data, error } = await supabase.rpc('access_admin_rotate_mobile_gate_token_v1', {
        p_gate_key: 'main',
        p_label: 'Əsas turniket',
      });
      if (error) throw error;
      if (!data?.ok || !data?.token) throw new Error(data?.message || 'NFC giriş açarı yaradılmadı.');

      const base = window.location.protocol === 'http:' || window.location.protocol === 'https:'
        ? new URL('./profile.html', window.location.href).href
        : 'https://qerib-seferli.github.io/SKyFit-Pro/profile.html';

      const url = `${base}?mobile_entry=1&gate=${encodeURIComponent(data.gate_key || 'main')}#gate_token=${encodeURIComponent(data.token)}`;
      output.innerHTML = `
        <strong>NFC üçün təhlükəsiz giriş linki yaradıldı</strong>
        <span>Bu linki NFC etiketinə yaz. Link yalnız fiziki yaxınlıq təsdiqi üçündür; üzv hesabı və giriş müddəti ayrıca yoxlanılır.</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;width:100%;margin-top:10px">
          <input id="access-mobile-gate-url" class="ui-input" value="${escapeHtml(url)}" readonly style="min-width:min(100%,540px);flex:1">
          <button id="access-mobile-gate-copy" class="ui-button ui-button--ghost" type="button">Linki kopyala</button>
        </div>
        <small>Etiket itərsə və ya link paylaşılarsa “NFC link yarat / yenilə” düyməsini yenidən bas; köhnə link dərhal etibarsız olacaq.</small>
      `;
      byId('access-mobile-gate-copy')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(url);
          notify.success('NFC link kopyalandı.');
        } catch {
          byId('access-mobile-gate-url')?.select();
          notify.info('Link seçildi. Ctrl+C ilə kopyala.');
        }
      });
      notify.success('Əsas turniket üçün yeni NFC yaxınlıq açarı yaradıldı.');
    } catch (error) {
      notify.error(getErrorMessage(error, 'NFC giriş açarı yaradılmadı.'));
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function startCardCapture(input) {
    if (!input) return; input.value = ''; input.focus(); input.placeholder = 'Kartı reader üzərinə qoy...'; notify.info('Kart oxuma rejimi 10 saniyə aktivdir.');
    let buffer=''; let last=0; const start=Date.now();
    const cleanup=()=>{ window.removeEventListener('keydown',onKey,true); input.placeholder=''; if (!input.value && buffer) input.value=buffer; };
    const onKey=(e)=>{ if (Date.now()-start>10000) return cleanup(); if (e.key==='Enter') { if (buffer) input.value=buffer; cleanup(); if (input.value) notify.success(`Kart oxundu: ${input.value}`); return; } if (e.key.length!==1 || !/[A-Za-z0-9_-]/.test(e.key)) return; const now=Date.now(); if (last && now-last>250) buffer=''; buffer+=e.key; last=now; };
    window.addEventListener('keydown',onKey,true); setTimeout(cleanup,10050);
  }

  function render() {
    renderStats();
    renderPeople();
    renderCommands();
    renderEvents();
    renderCardDiagnostics();
    renderControllerDiagnostics();
  }

  async function readLocalDatabase() {
    if (!window.skyfitDesktop?.readLegacyAccessDatabase) {
      notify.warning('Lokal turniket bazasını birbaşa oxumaq üçün SKy Fit Windows tətbiqini aç.');
      return;
    }

    try {
      const result = await window.skyfitDesktop.readLegacyAccessDatabase();
      if (!result?.ok) throw new Error(result?.error || 'Turniket bazası oxunmadı.');
      local.path = result.path;
      local.rows = (result.people || []).map(canonicalize).filter(row => row.legacy_emp_no);
      local.events = (result.events || []).map(canonicalizeEvent).filter(Boolean);
      const pathEl = byId('access-local-path');
      if (pathEl) pathEl.textContent = `${local.path} · ${local.rows.length} üzv · ${local.events.length} giriş qeydi oxundu`;
      notify.success(`${local.rows.length} turniket üzvü lokal bazadan oxundu.`);
    } catch (error) {
      notify.error(getErrorMessage(error, 'Lokal turniket bazası oxunmadı.'));
    }
  }

  async function syncLocalDatabase() {
    if (!local.rows.length) {
      notify.warning('Əvvəl “Lokal bazanı oxu” düyməsinə bas.');
      return;
    }

    try {
      let imported = 0;
      let importedEvents = 0;

      for (let i = 0; i < local.rows.length; i += 100) {
        const chunk = local.rows.slice(i, i + 100);
        const { data, error } = await supabase.rpc(RPC.upsertLegacyAccessPeopleV1, {
          p_rows: chunk,
          p_source_path: local.path,
        });
        if (error) throw error;
        imported += Number(data?.imported || chunk.length);
      }

      for (let i = 0; i < local.events.length; i += 200) {
        const chunk = local.events.slice(i, i + 200);
        const { data, error } = await supabase.rpc(RPC.upsertLegacyAccessEventsV2, { p_rows: chunk });
        if (error) throw error;
        importedEvents += Number(data?.imported || chunk.length);
      }

      await loadRemote();
      notify.success(`${imported} üzv və ${importedEvents} giriş qeydi Supabase-a sinxron edildi.`);
    } catch (error) {
      notify.error(getErrorMessage(error, 'Turniket məlumatları sinxron edilmədi.'));
    }
  }

  function openLinkModal(legacyId) {
    const row = local.remote.find(item => String(item.id) === String(legacyId));
    if (!row) return;

    const options = state.members.map(member => `<option value="${escapeHtml(member.id)}" ${String(member.id) === String(row.profile_id) ? 'selected' : ''}>${escapeHtml(member.full_name || member.phone || member.email || 'Üzv')} · ${escapeHtml(member.phone || '')}</option>`).join('');
    const content = document.createElement('div');
    content.innerHTML = `<div class="ui-field"><label class="ui-field__label">SKyFit üzvü</label><select id="access-link-profile" class="ui-select"><option value="">Seç...</option>${options}</select></div>`;

    const footer = document.createElement('div');
    footer.className = 'modal-form__actions';
    footer.innerHTML = '<button type="button" class="ui-button ui-button--ghost" data-access-cancel>Ləğv et</button><button type="button" class="ui-button ui-button--primary" data-access-confirm>Bağla</button>';
    footer.querySelector('[data-access-cancel]')?.addEventListener('click', () => closeModal());
    footer.querySelector('[data-access-confirm]')?.addEventListener('click', async () => {
      const profileId = byId('access-link-profile')?.value;
      if (!profileId) return notify.warning('Üzv seç.');
      const { error } = await supabase.rpc(RPC.linkAccessPersonV1, { p_legacy_id: Number(legacyId), p_profile_id: profileId });
      if (error) return notify.error(getErrorMessage(error,'Uyğunlaşdırma alınmadı.'));
      closeModal();
      await loadRemote();
      notify.success('Turniket üzvü SKyFit profili ilə bağlandı.');
    });

    openModal({ title: 'Turniket üzvünü bağla', content, footer });
  }

  async function enqueueCommand(legacyId, commandType, payload) {
    const { data, error } = await supabase.rpc(RPC.enqueueAccessCommandV2, {
      p_legacy_id: Number(legacyId),
      p_command_type: commandType,
      p_payload: payload,
      p_target_device_key: BRIDGE_DEVICE_KEY,
    });
    if (error) throw error;

    if (window.skyfitDesktop?.runAccessBridgeNow) {
      const bridgeResult = await window.skyfitDesktop.runAccessBridgeNow();

      if (!bridgeResult?.ok) {
        throw new Error(bridgeResult?.error || 'Bridge əmri icra edə bilmədi.');
      }

      const bridgeError = String(bridgeResult?.status?.lastError || '').trim();
      if (bridgeError) {
        throw new Error(`Əmr növbəyə düşdü, amma MDB-yə tətbiq edilmədi: ${bridgeError}`);
      }

      await loadRemote();
      notify.success('Turniket əmri MDB bazasına tətbiq edildi.');
      return data;
    }

    notify.success(`Əmr növbəyə əlavə edildi (${String(data || '').slice(0,8)}). Zal Desktop Bridge onu icra edəcək.`);
    setTimeout(() => loadRemote().catch(() => {}), 1800);
    return data;
  }

  function openManageModal(legacyId) {
    const row = local.remote.find(item => String(item.id) === String(legacyId));
    if (!row) return;

    const shownUntil = row.manual_blocked
      ? (row.blocked_previous_valid_until || row.valid_until || '')
      : (row.valid_until || '');

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="modal-form__grid">
        <div class="ui-field"><label class="ui-field__label">Turniket №</label><input class="ui-input" value="${escapeHtml(row.legacy_emp_no || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Ad</label><input class="ui-input" value="${escapeHtml(row.legacy_name || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Başlanğıc tarixi (məlumat)</label><input class="ui-input" type="date" value="${escapeHtml(row.valid_from || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Son tarix</label><input id="access-manage-until" class="ui-input" type="date" value="${escapeHtml(shownUntil)}"></div>
        <div class="ui-field"><label class="ui-field__label">Kart №</label><div style="display:flex;gap:8px"><input id="access-manage-card" class="ui-input" value="${escapeHtml(row.legacy_card_no || '')}" autocomplete="off"><button type="button" class="ui-button ui-button--ghost" data-access-card-capture>Kartı oxu</button></div></div>
        <div class="ui-field"><label class="ui-field__label">Giriş statusu</label><div>${row.manual_blocked ? '<span class="ui-badge ui-badge--danger">Bloklanıb</span>' : '<span class="ui-badge ui-badge--success">Aktiv / tarixə bağlı</span>'}</div></div>
      </div>
      <div class="modal-form__actions" style="justify-content:flex-start;margin-top:12px">
        <button type="button" class="ui-button ui-button--ghost" data-access-add-days="7">+7 gün</button>
        <button type="button" class="ui-button ui-button--ghost" data-access-add-days="30">+30 gün</button>
        <button type="button" class="ui-button ui-button--ghost" data-access-add-days="90">+90 gün</button>
      </div>
      <p class="admin-section__description">Müddət uzatmada başlanğıc tarixi dəyişmir. Hər MDB yazmasından əvvəl avtomatik backup yaradılır. Bloklama əvvəlki son tarixi saxlayır və sonradan bərpa edə bilir.</p>
    `;

    content.querySelectorAll('[data-access-add-days]').forEach(button => {
      button.addEventListener('click', () => {
        const input = byId('access-manage-until');
        if (!input) return;
        input.value = addDaysIso(extensionBase(input.value || shownUntil), Number(button.dataset.accessAddDays || 0));
      });
    });

    const footer = document.createElement('div');
    footer.className = 'modal-form__actions';
    footer.innerHTML = `
      <button type="button" class="ui-button ui-button--ghost" data-access-manage-close>Bağla</button>
      <button type="button" class="ui-button ui-button--secondary" data-access-manage-card-save>Kartı yaz</button>
      <button type="button" class="ui-button ${row.manual_blocked ? 'ui-button--primary' : 'ui-button--danger'}" data-access-manage-toggle>${row.manual_blocked ? 'Girişi aktiv et' : 'Girişi blokla'}</button>
      <button type="button" class="ui-button ui-button--primary" data-access-manage-date-save ${row.manual_blocked ? 'disabled' : ''}>Müddəti yaz</button>
    `;

    content.querySelector('[data-access-card-capture]')?.addEventListener('click', () => startCardCapture(byId('access-manage-card')));
    footer.querySelector('[data-access-manage-close]')?.addEventListener('click', () => closeModal());
    footer.querySelector('[data-access-manage-date-save]')?.addEventListener('click', async () => {
      const validUntil = byId('access-manage-until')?.value || null;
      if (!validUntil) return notify.warning('Son tarix seç.');
      try {
        await enqueueCommand(row.id, 'set_validity', { valid_until: validUntil, match_card_number: row.legacy_card_no || null, match_name: row.legacy_name || null });
        closeModal();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Müddət dəyişmə əmri yaradılmadı.'));
      }
    });

    footer.querySelector('[data-access-manage-card-save]')?.addEventListener('click', async () => {
      const cardNumber = String(byId('access-manage-card')?.value || '').trim();
      if (!cardNumber) return notify.warning('Kart nömrəsini yaz.');
      try {
        await enqueueCommand(row.id, 'set_card', { card_number: cardNumber, previous_card_number: row.legacy_card_no || null, match_name: row.legacy_name || null });
        closeModal();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Kart dəyişmə əmri yaradılmadı.'));
      }
    });

    footer.querySelector('[data-access-manage-toggle]')?.addEventListener('click', async () => {
      try {
        if (row.manual_blocked) {
          const validUntil = byId('access-manage-until')?.value || row.blocked_previous_valid_until || null;
          if (!validUntil) return notify.warning('Aktivləşdirmək üçün son tarix seç.');
          await enqueueCommand(row.id, 'unblock_access', {
            valid_until: validUntil,
            match_card_number: row.legacy_card_no || null,
            match_name: row.legacy_name || null,
          });
        } else {
          await enqueueCommand(row.id, 'block_access', {
            blocked_until: addDaysIso(isoToday(), -1),
            previous_valid_until: row.valid_until || null,
            match_card_number: row.legacy_card_no || null,
            match_name: row.legacy_name || null,
          });
        }
        closeModal();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Giriş statusu dəyişdirilmədi.'));
      }
    });

    openModal({ title: `Turniket üzvünü idarə et · ${row.legacy_emp_no}`, content, footer });
  }

  async function unlink(legacyId) {
    const { error } = await supabase.rpc(RPC.unlinkAccessPersonV1, { p_legacy_id: Number(legacyId) });
    if (error) return notify.error(getErrorMessage(error,'Əlaqə ayrılmadı.'));
    await loadRemote();
    notify.success('Turniket və SKyFit profil əlaqəsi ayrıldı.');
  }

  function openBridgeSetupModal() {
    if (!window.skyfitDesktop?.configureAccessBridge) {
      notify.warning('Bridge yalnız zalın Windows tətbiqində qurulur.');
      return;
    }

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="ui-field"><label class="ui-field__label">Rejim</label><select id="access-bridge-mode" class="ui-select"><option value="test">TEST — kopya MDB</option><option value="live">LIVE — zalın real MDB bazası</option></select></div>
      <label class="ui-field"><span class="ui-field__label">Canlı yazma təsdiqi</span><span><input id="access-bridge-live-confirm" type="checkbox"> LIVE seçsəm real MDB-yə yazma əmrlərinin tətbiqinə icazə verirəm.</span></label>
      <p class="admin-section__description">TEST rejimində öz kompüterindəki kopya Database.mdb ilə sınaq et. LIVE rejimini yalnız zal kompüterinə final quraşdırmada seç.</p>
    `;

    const footer = document.createElement('div');
    footer.className = 'modal-form__actions';
    footer.innerHTML = '<button type="button" class="ui-button ui-button--ghost" data-bridge-cancel>Ləğv et</button><button type="button" class="ui-button ui-button--primary" data-bridge-save>Bridge-i aktiv et</button>';
    footer.querySelector('[data-bridge-cancel]')?.addEventListener('click', () => closeModal());
    footer.querySelector('[data-bridge-save]')?.addEventListener('click', async () => {
      const mode = byId('access-bridge-mode')?.value === 'live' ? 'live' : 'test';
      const allowLiveWrites = Boolean(byId('access-bridge-live-confirm')?.checked);
      if (mode === 'live' && !allowLiveWrites) return notify.warning('LIVE rejimi üçün canlı yazma təsdiqini işarələ.');

      try {
        const secret = randomSecret();
        const { error } = await supabase.rpc(RPC.registerAccessBridgeV2, {
          p_device_key: BRIDGE_DEVICE_KEY,
          p_name: 'SKy Fit Turniket Bridge',
          p_secret: secret,
          p_mode: mode,
        });
        if (error) throw error;

        const desktop = await window.skyfitDesktop.configureAccessBridge({
          deviceKey: BRIDGE_DEVICE_KEY,
          secret,
          supabaseUrl: SUPABASE_URL,
          anonKey: SUPABASE_ANON_KEY,
          databasePath: local.path || undefined,
          mode,
          allowLiveWrites,
        });
        if (!desktop?.ok) throw new Error(desktop?.error || 'Desktop bridge konfiqurasiyası saxlanmadı.');

        closeModal();
        notify.success(`Turniket Bridge ${mode.toUpperCase()} rejimində aktiv edildi.`);
        await loadRemote();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Bridge aktiv edilmədi.'));
      }
    });

    openModal({ title: 'Zal Desktop Bridge konfiqurasiyası', content, footer });
  }

  function bind() {
    byId('access-read-local')?.addEventListener('click', readLocalDatabase);
    byId('access-sync-local')?.addEventListener('click', syncLocalDatabase);
    byId('access-refresh')?.addEventListener('click', () => loadRemote().catch(error => notify.error(getErrorMessage(error,'Turniket siyahısı yenilənmədi.'))));
    byId('access-bridge-setup')?.addEventListener('click', openBridgeSetupModal);
    byId('access-card-register-check')?.addEventListener('click', inspectCardRegister);
    byId('access-controller-check')?.addEventListener('click', inspectController);
    byId('access-mobile-gate-token')?.addEventListener('click', () => { void rotateMobileGateToken(); });
    byId('access-search')?.addEventListener('input', renderPeople);
    byId('access-status-filter')?.addEventListener('change', renderPeople);

    byId('access-people-list')?.addEventListener('click', event => {
      const manage = event.target.closest('[data-access-manage]');
      if (manage) return openManageModal(manage.dataset.accessManage);
      const link = event.target.closest('[data-access-link]');
      if (link) return openLinkModal(link.dataset.accessLink);
      const unlinkButton = event.target.closest('[data-access-unlink]');
      if (unlinkButton) void unlink(unlinkButton.dataset.accessUnlink);
    });
  }

  return { bind, loadRemote, render };
}
