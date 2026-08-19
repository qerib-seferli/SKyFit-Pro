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
  return type || 'Əmr';
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
    desktopStatus: null,
  };

  async function loadRemote() {
    const [peopleResult, commandResult, deviceResult] = await Promise.all([
      supabase
        .from(TABLES.accessLegacyPeople)
        .select('id,legacy_emp_no,legacy_card_no,legacy_name,legacy_phone,room_number,valid_from,valid_until,profile_id,match_method,last_seen_at')
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
    ]);

    if (peopleResult.error) throw peopleResult.error;
    if (commandResult.error) throw commandResult.error;
    if (deviceResult.error) throw deviceResult.error;

    local.remote = Array.isArray(peopleResult.data) ? peopleResult.data : [];
    local.commands = Array.isArray(commandResult.data) ? commandResult.data : [];
    local.devices = Array.isArray(deviceResult.data) ? deviceResult.data : [];

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
        <td>${escapeHtml(row.valid_until || '—')}</td>
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

  function render() {
    renderStats();
    renderPeople();
    renderCommands();
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

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="modal-form__grid">
        <div class="ui-field"><label class="ui-field__label">Turniket №</label><input class="ui-input" value="${escapeHtml(row.legacy_emp_no || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Ad</label><input class="ui-input" value="${escapeHtml(row.legacy_name || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Başlanğıc tarixi (məlumat)</label><input id="access-manage-from" class="ui-input" type="date" value="${escapeHtml(row.valid_from || '')}" disabled></div>
        <div class="ui-field"><label class="ui-field__label">Son tarix</label><input id="access-manage-until" class="ui-input" type="date" value="${escapeHtml(row.valid_until || '')}"></div>
        <div class="ui-field"><label class="ui-field__label">Kart №</label><input id="access-manage-card" class="ui-input" value="${escapeHtml(row.legacy_card_no || '')}" autocomplete="off"></div>
      </div>
      <p class="admin-section__description">Başlanğıc tarixi məlumat üçündür və adi müddət uzatmada dəyişmir. Son tarix əmri Supabase növbəsinə düşür; Desktop Bridge MDB backup yaradır, yalnız bu istifadəçinin son tarixini dəyişir və nəticəni təsdiqləyir.</p>
    `;

    const footer = document.createElement('div');
    footer.className = 'modal-form__actions';
    footer.innerHTML = `
      <button type="button" class="ui-button ui-button--ghost" data-access-manage-close>Bağla</button>
      <button type="button" class="ui-button ui-button--secondary" data-access-manage-card-save>Kartı yaz</button>
      <button type="button" class="ui-button ui-button--primary" data-access-manage-date-save>Müddəti yaz</button>
    `;

    footer.querySelector('[data-access-manage-close]')?.addEventListener('click', () => closeModal());
    footer.querySelector('[data-access-manage-date-save]')?.addEventListener('click', async () => {
      const validUntil = byId('access-manage-until')?.value || null;
      if (!validUntil) return notify.warning('Son tarix seç.');
      try {
        // Adi müddət uzatmada başlanğıc tarixini dəyişmirik.
        await enqueueCommand(row.id, 'set_validity', { valid_until: validUntil });
        closeModal();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Müddət dəyişmə əmri yaradılmadı.'));
      }
    });

    footer.querySelector('[data-access-manage-card-save]')?.addEventListener('click', async () => {
      const cardNumber = String(byId('access-manage-card')?.value || '').trim();
      if (!cardNumber) return notify.warning('Kart nömrəsini yaz.');
      try {
        await enqueueCommand(row.id, 'set_card', { card_number: cardNumber });
        closeModal();
      } catch (error) {
        notify.error(getErrorMessage(error, 'Kart dəyişmə əmri yaradılmadı.'));
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
