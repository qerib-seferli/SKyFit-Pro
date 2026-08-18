// SKy Fit Pro — Turniket / IC Card admin controller V1
import { supabase, TABLES, RPC } from './config.js';
import { byId, escapeHtml, normalizeSearch, notify, getErrorMessage, openModal, closeModal } from './core.js';

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

export function createAdminAccessController({ state }) {
  const local = { rows: [], path: null, remote: [] };

  async function loadRemote() {
    const { data, error } = await supabase
      .from(TABLES.accessLegacyPeople)
      .select('id,legacy_emp_no,legacy_card_no,legacy_name,legacy_phone,room_number,valid_from,valid_until,profile_id,match_method,last_seen_at')
      .order('legacy_emp_no', { ascending: true });
    if (error) throw error;
    local.remote = Array.isArray(data) ? data : [];
    render();
    return local.remote;
  }

  function memberById(id) {
    return state.members.find(item => String(item.id) === String(id));
  }

  function renderStats() {
    const rows = local.remote;
    const linked = rows.filter(r => r.profile_id).length;
    const set = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
    set('access-kpi-total', String(rows.length));
    set('access-kpi-linked', String(linked));
    set('access-kpi-unlinked', String(rows.length - linked));
    set('access-kpi-local', window.skyfitDesktop?.isElectron ? 'Desktop bridge hazır' : 'Brauzer rejimi');
  }

  function render() {
    renderStats();
    const root = byId('access-people-list');
    if (!root) return;
    const q = normalizeSearch(byId('access-search')?.value);
    const status = byId('access-status-filter')?.value || 'all';
    const rows = local.remote.filter(row => {
      if (status === 'linked' && !row.profile_id) return false;
      if (status === 'unlinked' && row.profile_id) return false;
      if (!q) return true;
      const member = memberById(row.profile_id);
      return normalizeSearch([row.legacy_emp_no,row.legacy_name,row.legacy_phone,row.legacy_card_no,member?.full_name,member?.phone].filter(Boolean).join(' ')).includes(q);
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
        <td><button type="button" class="ui-button ui-button--ghost ui-button--sm" data-access-link="${row.id}">${member ? 'Dəyiş' : 'Bağla'}</button>${member ? ` <button type="button" class="ui-button ui-button--ghost ui-button--sm" data-access-unlink="${row.id}">Ayır</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  async function readLocalDatabase() {
    if (!window.skyfitDesktop?.readLegacyAccessDatabase) {
      notify.warning('Lokal turniket bazasını birbaşa oxumaq üçün SKy Fit Windows tətbiqini aç. Sayt brauzerdə lokal MDB faylına giriş ala bilmir.');
      return;
    }
    try {
      const result = await window.skyfitDesktop.readLegacyAccessDatabase();
      if (!result?.ok) throw new Error(result?.error || 'Turniket bazası oxunmadı.');
      local.path = result.path;
      local.rows = (result.people || []).map(canonicalize).filter(r => r.legacy_emp_no);
      byId('access-local-path').textContent = `${local.path} · ${local.rows.length} üzv oxundu`;
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
      for (let i = 0; i < local.rows.length; i += 100) {
        const chunk = local.rows.slice(i, i + 100);
        const { data, error } = await supabase.rpc(RPC.upsertLegacyAccessPeopleV1, { p_rows: chunk, p_source_path: local.path });
        if (error) throw error;
        imported += Number(data?.imported || chunk.length);
      }
      await loadRemote();
      notify.success(`${imported} qeyd Supabase turniket strukturuna sinxron edildi.`);
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
      closeModal(); await loadRemote(); notify.success('Turniket üzvü SKyFit profili ilə bağlandı.');
    });
    openModal({ title: 'Turniket üzvünü bağla', content, footer });
  }

  async function unlink(legacyId) {
    const { error } = await supabase.rpc(RPC.unlinkAccessPersonV1, { p_legacy_id: Number(legacyId) });
    if (error) return notify.error(getErrorMessage(error,'Əlaqə ayrılmadı.'));
    await loadRemote();
    notify.success('Turniket və SKyFit profil əlaqəsi ayrıldı.');
  }

  function bind() {
    byId('access-read-local')?.addEventListener('click', readLocalDatabase);
    byId('access-sync-local')?.addEventListener('click', syncLocalDatabase);
    byId('access-refresh')?.addEventListener('click', () => loadRemote().catch(error => notify.error(getErrorMessage(error,'Turniket siyahısı yenilənmədi.'))));
    byId('access-search')?.addEventListener('input', render);
    byId('access-status-filter')?.addEventListener('change', render);
    byId('access-people-list')?.addEventListener('click', event => {
      const link = event.target.closest('[data-access-link]');
      if (link) return openLinkModal(link.dataset.accessLink);
      const unlinkButton = event.target.closest('[data-access-unlink]');
      if (unlinkButton) void unlink(unlinkButton.dataset.accessUnlink);
    });
  }

  return { bind, loadRemote, render };
}
