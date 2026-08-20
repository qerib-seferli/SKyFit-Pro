// SKy Fit Pro — profil səhifəsi controller-i
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  APP_CONFIG,
  TABLES,
} from './config.js';

import {
  SKYFIT_EVENTS,
  $,
  byId,
  createElement,
  showElement,
  hideElement,
  setText,
  normalizeString,
  escapeHtml,
  formatDate,
  todayIso,
  getCurrentIdentity,
  getProfileName,
  getProfileInitials,
  getProfileAvatar,
  roleLabel,
  membershipIsActive,
  membershipDaysRemaining,
  membershipStatusLabel,
  money,
  openModal,
  closeModal,
  confirmDialog,
  notify,
  getErrorMessage,
  validatePhone,
  setFieldError,
  clearFormErrors,
  setButtonLoading,
  getStoredTheme,
  cycleTheme,
  signOut,
  asyncHandler,
} from './core.js';

import { initLayout } from './layout.js';

const AVATAR_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;

const state = {
  identity: null,
  profile: null,
  membership: null,
  memberships: [],
  accessCard: null,
  accessLegacy: null,
  accessLastEvent: null,
  avatarUploading: false,
  savingProfile: false,
};

function getElements() {
  return {
    avatarButton: byId('profile-avatar-button'),
    avatarInput: byId('profile-avatar-input'),
    avatarImage: byId('profile-avatar-image'),
    avatarFallback: byId('profile-avatar-fallback'),
    profileTitle: byId('profile-title'),
    profileEmail: byId('profile-email'),
    roleBadge: byId('profile-role-badge'),
    editButton: byId('profile-edit-button'),
    qrEntryButton: byId('profile-qr-entry-button'),

    fullName: byId('profile-full-name'),
    phone: byId('profile-phone'),
    emailDetail: byId('profile-email-detail'),
    birthDate: byId('profile-birth-date'),
    address: byId('profile-address'),



    membershipCard: byId('profile-membership-card'),
    membershipEmpty: byId('profile-membership-empty'),
    membershipCardStatus: byId('membership-card-status'),
    membershipCardPlan: byId('membership-card-plan'),
    membershipCardStart: byId('membership-card-start'),
    membershipCardEnd: byId('membership-card-end'),
    membershipCardDaysLeft: byId('membership-card-days-left'),
    membershipCardPrice: byId('membership-card-price'),
    membershipCardProgress: byId('membership-card-progress'),

    accessCard: byId('profile-access-card'),
    accessEmpty: byId('profile-access-empty'),
    accessStatus: byId('profile-access-status'),
    accessEmpNo: byId('profile-access-emp-no'),
    accessCardNo: byId('profile-access-card-no'),
    accessValidFrom: byId('profile-access-valid-from'),
    accessValidUntil: byId('profile-access-valid-until'),
    accessDaysLeft: byId('profile-access-days-left'),
    accessLastEntry: byId('profile-access-last-entry'),
    mobileEntryButton: byId('profile-mobile-entry-button'),
    mobileEntryHint: byId('profile-mobile-entry-hint'),


    changePasswordButton: byId('profile-change-password-button'),
    themeButton: byId('profile-theme-button'),
    themeLabel: byId('profile-theme-label'),
    logoutButton: byId('profile-logout-button'),
  };
}

async function loadIdentity() {
  const identity =
    await getCurrentIdentity({ force: true });

  if (!identity?.authenticated) {
    window.location.replace(APP_CONFIG.routes.login);
    return null;
  }

  if (!identity.profile) {
    notify.error('Profil məlumatı tapılmadı.');
    return null;
  }

  if (identity.profile.is_active === false) {
    notify.error(
      'Hesab deaktiv edilib. Administrasiya ilə əlaqə saxla.'
    );

    await signOut({
      redirect: true,
      redirectTo: APP_CONFIG.routes.login,
      notify: false,
    });

    return null;
  }

  state.identity = identity;
  state.profile = identity.profile;

  return identity;
}

function renderProfile() {
  const elements = getElements();
  const profile = state.profile;
  const identity = state.identity;

  if (!profile || !identity) return;

  const name = getProfileName(
    profile,
    identity.email
  );

  const avatar = getProfileAvatar(profile);
  const fallback = getProfileInitials(profile);
  const email =
    profile.email ||
    identity.email ||
    '—';

  setText(elements.profileTitle, name);
  setText(elements.profileEmail, email);
  setText(elements.fullName, name);
  setText(elements.emailDetail, email);
  setText(
    elements.phone,
    profile.phone || 'Əlavə edilməyib'
  );
  setText(
    elements.birthDate,
    profile.birth_date
      ? formatDate(profile.birth_date)
      : 'Əlavə edilməyib'
  );
  setText(
    elements.address,
    profile.address || 'Əlavə edilməyib'
  );

  if (elements.roleBadge) {
    elements.roleBadge.className =
      roleClass(profile.role);

    setText(
      elements.roleBadge,
      roleLabel(profile.role)
    );
  }

  renderProfileAvatar({
    image: elements.avatarImage,
    fallback: elements.avatarFallback,
    avatar,
    name,
    initials: fallback,
  });
}

function renderProfileAvatar({
  image,
  fallback,
  avatar,
  name,
  initials,
}) {
  setText(fallback, initials || 'SK');

  if (!image) {
    showElement(fallback);
    return;
  }

  image.onload = null;
  image.onerror = null;

  if (!avatar) {
    image.removeAttribute('src');
    hideElement(image);
    showElement(fallback);
    return;
  }

  image.alt = `${name} profil şəkli`;
  image.src = avatar;
  showElement(image);
  hideElement(fallback);

  image.onload = () => {
    hideElement(fallback);
  };

  image.onerror = () => {
    image.removeAttribute('src');
    hideElement(image);
    showElement(fallback);
  };
}

function roleClass(role) {
  switch (normalizeString(role)) {
    case 'admin':
      return 'ui-badge ui-badge--danger';
    case 'staff':
      return 'ui-badge ui-badge--warning';
    case 'member':
      return 'ui-badge ui-badge--success';
    default:
      return 'ui-badge ui-badge--neutral';
  }
}

async function loadMemberships() {
  const profileId = state.identity?.profileId;

  if (!profileId) {
    state.memberships = [];
    state.membership = null;
    renderMembership();
    return;
  }

  const { data, error } = await supabase
    .from(TABLES.memberships)
    .select(`
      id,
      member_id,
      plan_id,
      start_date,
      end_date,
      price,
      status,
      payment_status,
      created_by,
      updated_by,
      operator_shift_id,
      membership_plan:membership_plans!memberships_plan_id_fkey (
        id,
        name,
        price,
        duration_days,
        is_daily,
        is_active
      ),
      created_by_profile:profiles!memberships_created_by_fkey (
        id,
        full_name,
        role,
        avatar_url
      ),
      updated_by_profile:profiles!memberships_updated_by_fkey (
        id,
        full_name,
        role,
        avatar_url
      )
    `)
    .eq('member_id', profileId)
    .order('end_date', { ascending: false });

  if (error) {
    console.error(
      '[SKy Fit Profile] Memberships:',
      error
    );

    state.memberships = [];
    state.membership = null;
    renderMembership();

    notify.error(
      getErrorMessage(
        error,
        'Üzvlük məlumatları yüklənmədi.'
      )
    );

    return;
  }

  state.memberships =
    Array.isArray(data) ? data : [];

  state.membership =
    findCurrentMembership(state.memberships);

  renderMembership();
}

async function loadAccessCard() {
  const profileId = state.identity?.profileId;
  if (!profileId) return;

  const [
    { data: cards, error: cardError },
    { data: legacy, error: legacyError },
    { data: events, error: eventError },
  ] = await Promise.all([
    supabase.from(TABLES.accessCards)
      .select('id,profile_id,card_number,card_uid,valid_from,valid_until,is_enabled,status,last_synced_at')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from(TABLES.accessLegacyPeople)
      .select('id,legacy_emp_no,legacy_name,legacy_phone,valid_from,valid_until,match_method,manual_blocked,blocked_at,blocked_previous_valid_until')
      .eq('profile_id', profileId)
      .limit(1),
    supabase.from(TABLES.accessEvents)
      .select('id,event_at,direction,result')
      .eq('profile_id', profileId)
      .order('event_at', { ascending: false })
      .limit(1),
  ]);

  if (cardError || legacyError || eventError) {
    console.warn('[SKy Fit Profile] Turniket məlumatı:', cardError || legacyError || eventError);
    state.accessCard = null;
    state.accessLegacy = null;
    state.accessLastEvent = null;
    renderAccessCard();
    return;
  }

  state.accessCard = Array.isArray(cards) ? cards[0] || null : null;
  state.accessLegacy = Array.isArray(legacy) ? legacy[0] || null : null;
  state.accessLastEvent = Array.isArray(events) ? events[0] || null : null;
  renderAccessCard();
}

function renderAccessCard() {
  const el = getElements();
  const card = state.accessCard;
  const legacy = state.accessLegacy;
  if (!card && !legacy) {
    hideElement(el.accessCard);
    showElement(el.accessEmpty);
    if (el.accessStatus) {
      el.accessStatus.className = 'ui-badge ui-badge--neutral';
      setText(el.accessStatus, 'Bağlanmayıb');
    }
    return;
  }

  showElement(el.accessCard);
  hideElement(el.accessEmpty);
  const validUntil = card?.valid_until || legacy?.valid_until || null;
  const validFrom = card?.valid_from || legacy?.valid_from || null;
  let days = null;
  if (validUntil) {
    const end = new Date(`${validUntil}T23:59:59`);
    days = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  }
  const active = legacy?.manual_blocked !== true && card?.is_enabled !== false && (!validUntil || new Date(`${validUntil}T23:59:59`).getTime() >= Date.now());
  if (el.accessStatus) {
    el.accessStatus.className = active ? 'ui-badge ui-badge--success' : 'ui-badge ui-badge--danger';
    setText(el.accessStatus, active ? 'Giriş aktivdir' : 'Giriş bağlıdır');
  }
  setText(el.accessEmpNo, legacy?.legacy_emp_no || '—');
  setText(el.accessCardNo, card?.card_number || '—');
  setText(el.accessValidFrom, validFrom ? formatDate(validFrom) : '—');
  setText(el.accessValidUntil, validUntil ? formatDate(validUntil) : 'Limitsiz / qeyd yoxdur');
  setText(el.accessDaysLeft, legacy?.manual_blocked ? 'Admin tərəfindən bloklanıb' : days === null ? '—' : active ? `${days} gün` : 'Müddət bitib');
  setText(el.accessLastEntry, state.accessLastEvent?.event_at ? new Date(state.accessLastEvent.event_at).toLocaleString('az-AZ') : 'Hələ giriş qeydi yoxdur');
}

function mobileEntryReasonMessage(code, fallback = '') {
  const map = {
    profile_not_found: 'Profil məlumatı tapılmadı.',
    access_not_linked: 'Turniket kartın profilinə bağlanmayıb.',
    access_blocked: 'Giriş administrator tərəfindən bloklanıb.',
    access_expired: 'Giriş müddətin bitib.',
    access_date_missing: 'Giriş üçün son tarix məlumatı yoxdur.',
    account_inactive: 'Hesab deaktivdir.',
    hardware_not_ready: 'Telefonla giriş üçün turniket controller adapteri hələ aktiv deyil.',
    timeout: 'Turniketdən vaxtında təsdiq gəlmədi.',
  };
  return map[code] || fallback || 'Giriş təsdiqlənmədi.';
}

function renderMobileEntryResult({ ok, title, message }) {
  const content = createElement('div');
  content.style.cssText = 'display:grid;justify-items:center;gap:14px;text-align:center;padding:4px 0 8px';

  if (ok) {
    const img = createElement('img', { attrs: { src: './assets/foto/onaylandi_512.gif', alt: 'Giriş təsdiqləndi' } });
    img.style.cssText = 'width:150px;max-width:55vw;height:auto;object-fit:contain';
    content.append(img);
  } else {
    const img = createElement('img', { attrs: { src: './assets/foto/onaylanmadi_512.gif', alt: 'Giriş təsdiqlənmədi' } });
    img.style.cssText = 'width:150px;max-width:55vw;height:auto;object-fit:contain';
    img.addEventListener('error', () => {
      const failed = createElement('div', { text: '×' });
      failed.style.cssText = 'display:grid;place-items:center;width:118px;height:118px;border-radius:999px;background:rgba(239,68,68,.12);border:2px solid rgba(239,68,68,.5);color:#ef4444;font-size:86px;line-height:1';
      img.replaceWith(failed);
    }, { once: true });
    content.append(img);
  }

  const text = createElement('p', { text: message });
  text.style.cssText = 'margin:0;max-width:420px;line-height:1.55';
  content.append(text);

  openModal({ eyebrow: 'Telefonla giriş', title, content });
}

async function waitForMobileEntryResult(requestId, timeoutMs = 18000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data, error } = await supabase
      .from(TABLES.accessMobileEntryRequests)
      .select('id,status,reason_code,reason_message,result,completed_at')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (data && ['approved','denied','failed','expired'].includes(data.status)) return data;
    await new Promise(resolve => setTimeout(resolve, 900));
  }
  return { status: 'expired', reason_code: 'timeout' };
}

async function requestMobileEntry(options = {}) {
  const button = getElements().mobileEntryButton;
  if (!state.accessLegacy) {
    renderMobileEntryResult({ ok: false, title: 'Giriş mümkün deyil', message: 'Turniket kartın profilinə bağlanmayıb.' });
    return;
  }

  setButtonLoading(button, true, { loadingText: 'Yoxlanılır...' });
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const gate = normalizeString(options.gate || searchParams.get('gate'), 'main');
    const gateToken = normalizeString(
      options.gateToken ||
      searchParams.get('gate_token') ||
      hashParams.get('gate_token')
    );
    const entryMethod = normalizeString(
      options.entryMethod ||
      searchParams.get('entry') ||
      'qr',
      'qr'
    ).toLowerCase();

    if (!gateToken) {
      renderMobileEntryResult({
        ok: false,
        title: 'QR kodu oxut',
        message: 'Turniketi açmaq üçün profilin yuxarısındakı “QR ilə giriş” düyməsinə bas və zalda turniketin yanında olan QR kodu oxut.',
      });
      return;
    }

    const { data, error } = await supabase.rpc('request_mobile_entry_v3', {
      p_gate_key: gate,
      p_gate_token: gateToken,
      p_entry_method: entryMethod === 'nfc' ? 'nfc' : 'qr',
    });
    if (error) throw error;

    if (!data?.ok) {
      renderMobileEntryResult({ ok: false, title: 'Giriş təsdiqlənmədi', message: mobileEntryReasonMessage(data?.reason_code, data?.message) });
      return;
    }

    const requestId = data?.request_id;
    if (!requestId) {
      renderMobileEntryResult({ ok: false, title: 'Giriş təsdiqlənmədi', message: 'Sorğu identifikatoru yaradılmadı.' });
      return;
    }

    notify.info(`${entryMethod === 'nfc' ? 'NFC' : 'QR'} təsdiqləndi. Giriş sorğusu turniketə göndərildi...`);
    const result = await waitForMobileEntryResult(requestId);
    const approved = result?.status === 'approved';
    renderMobileEntryResult({
      ok: approved,
      title: approved ? 'Giriş təsdiqləndi' : 'Giriş təsdiqlənmədi',
      message: approved ? 'Turniket açıldı. Xoş məşqlər!' : mobileEntryReasonMessage(result?.reason_code, result?.reason_message),
    });
  } catch (error) {
    console.error('[SKy Fit Profile] Mobile entry:', error);
    renderMobileEntryResult({ ok: false, title: 'Giriş təsdiqlənmədi', message: getErrorMessage(error, 'Telefonla giriş sorğusu göndərilmədi.') });
  } finally {
    setButtonLoading(button, false);
  }
}


function parseGateQrValue(rawValue) {
  const raw = normalizeString(rawValue);
  if (!raw) throw new Error('QR kod boşdur.');

  let url;
  try {
    url = new URL(raw, window.location.href);
  } catch {
    throw new Error('Bu QR kod SKy Fit giriş linki deyil.');
  }

  const sameHost =
    url.hostname === window.location.hostname ||
    url.hostname === 'qerib-seferli.github.io';

  if (!sameHost || !/\/SKyFit-Pro\/profile\.html$|\/profile\.html$/i.test(url.pathname)) {
    throw new Error('Bu QR kod SKy Fit turniketinə aid deyil.');
  }

  const params = url.searchParams;
  const hashParams = new URLSearchParams(String(url.hash || '').replace(/^#/, ''));
  const gate = normalizeString(params.get('gate'), 'main');
  const gateToken = normalizeString(params.get('gate_token') || hashParams.get('gate_token'));

  if (params.get('mobile_entry') !== '1' || !gateToken) {
    throw new Error('QR kodun turniket açarı natamamdır.');
  }

  return { gate, gateToken, entryMethod: 'qr' };
}

async function openQrEntryScanner(trigger = null) {
  if (!state.accessLegacy) {
    renderMobileEntryResult({
      ok: false,
      title: 'Giriş mümkün deyil',
      message: 'Turniket kartın profilinə bağlanmayıb.',
    });
    return;
  }

  const content = document.createElement('div');
  content.className = 'profile-qr-scanner';
  content.innerHTML = `
    <div class="profile-qr-scanner__viewport">
      <video id="profile-qr-video" playsinline muted></video>
      <div class="profile-qr-scanner__frame" aria-hidden="true"></div>
    </div>
    <p id="profile-qr-status" class="profile-card__description">
      Kamera açılır. Turniketdəki SKy Fit QR kodunu çərçivənin içinə gətir.
    </p>
    <div class="ui-field">
      <label class="ui-field__label" for="profile-qr-manual">Test üçün QR linkini yapışdır</label>
      <input id="profile-qr-manual" class="ui-input" type="url" inputmode="url" placeholder="https://...profile.html?mobile_entry=1...">
    </div>
    <div class="modal-form__actions">
      <button id="profile-qr-manual-submit" class="ui-button ui-button--secondary" type="button">Linki yoxla</button>
      <button id="profile-qr-close" class="ui-button ui-button--ghost" type="button">Bağla</button>
    </div>
  `;

  let stream = null;
  let stopped = false;
  let raf = 0;
  let zxingReader = null;

  const stopScanner = () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (zxingReader?.reset) {
      try { zxingReader.reset(); } catch {}
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  };

  const submitValue = async value => {
    const status = byId('profile-qr-status');
    try {
      const parsed = parseGateQrValue(value);
      stopScanner();
      closeModal();
      notify.info('QR kod oxundu. Üzvlük və turniket icazəsi yoxlanılır...');
      await requestMobileEntry(parsed);
    } catch (error) {
      if (status) status.textContent = getErrorMessage(error, 'QR kod oxunmadı.');
    }
  };

  openModal({
    eyebrow: 'Telefonla giriş',
    title: 'QR kodu oxut',
    content,
    trigger,
    className: 'app-modal--qr-entry',
    onClose: stopScanner,
    onOpen: async () => {
      byId('profile-qr-close')?.addEventListener('click', () => {
        stopScanner();
        closeModal();
      });
      byId('profile-qr-manual-submit')?.addEventListener('click', () => {
        void submitValue(byId('profile-qr-manual')?.value);
      });

      const video = byId('profile-qr-video');
      const status = byId('profile-qr-status');
      if (!video) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();

        if ('BarcodeDetector' in window) {
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const scan = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              const value = codes?.[0]?.rawValue;
              if (value) {
                await submitValue(value);
                return;
              }
            } catch {}
            raf = requestAnimationFrame(scan);
          };
          raf = requestAnimationFrame(scan);
          if (status) status.textContent = 'Kamera hazırdır. QR kodu çərçivənin içinə gətir.';
          return;
        }

        const module = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
        const Reader = module.BrowserQRCodeReader;
        zxingReader = new Reader();
        if (status) status.textContent = 'Kamera hazırdır. QR kodu çərçivənin içinə gətir.';
        await zxingReader.decodeFromVideoElement(video, result => {
          const value = result?.getText?.() || result?.text;
          if (value && !stopped) void submitValue(value);
        });
      } catch (error) {
        if (status) {
          status.textContent =
            'Kamera açıla bilmədi. Kamera icazəsini yoxla və ya aşağıdakı sahəyə QR linkini yapışdır.';
        }
      }
    },
  });
}

function bindMobileEntry() {
  const button = getElements().mobileEntryButton;
  const qrButton = getElements().qrEntryButton;
  const hint = getElements().mobileEntryHint;

  qrButton?.addEventListener('click', event => {
    void openQrEntryScanner(event.currentTarget);
  });

  button?.addEventListener('click', event => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    const hasToken = normalizeString(params.get('gate_token') || hashParams.get('gate_token'));
    if (hasToken) void requestMobileEntry();
    else void openQrEntryScanner(event.currentTarget);
  });

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const gateToken = normalizeString(params.get('gate_token') || hashParams.get('gate_token'));
  const hasNfcPresence = params.get('mobile_entry') === '1' && params.get('gate') && gateToken;

  if (hint) {
    hint.textContent = hasNfcPresence
      ? 'Turniket yaxınlığı təsdiqlənib. Giriş icazən yoxlanacaq və turniketə sorğu göndəriləcək.'
      : 'QR ilə giriş düyməsinə basıb turniketdəki QR kodu oxut. NFC linki açılıbsa giriş avtomatik yoxlanacaq.';
  }

  if (!hasNfcPresence) return;

  let attempts = 0;
  const autoStart = () => {
    attempts += 1;
    if (state.accessLegacy && state.identity?.authenticated) {
      const key = `skyfit-mobile-entry-auto:${params.get('gate')}:${gateToken.slice(0, 12)}`;
      try {
        if (window.sessionStorage.getItem(key) === '1') return;
        window.sessionStorage.setItem(key, '1');
      } catch {}
      notify.info('Turniket giriş açarı aşkarlandı. Giriş avtomatik yoxlanılır...');
      void requestMobileEntry();
      return;
    }

    if (attempts < 20) setTimeout(autoStart, 250);
  };

  setTimeout(autoStart, 250);
}

function findCurrentMembership(memberships) {
  if (!Array.isArray(memberships)) {
    return null;
  }

  return (
    memberships.find(membership =>
      membershipIsActive(membership)
    ) ||
    memberships[0] ||
    null
  );
}

function membershipVisualState(membership) {
  if (!membership) {
    return {
      label: 'Üzvlük yoxdur',
      className: 'ui-badge ui-badge--neutral',
      active: false,
    };
  }

  const active = membershipIsActive(membership);

  if (active) {
    return {
      label: membershipStatusLabel(membership),
      className: 'ui-badge ui-badge--success',
      active: true,
    };
  }

  if (membership.status === 'cancelled') {
    return {
      label: membershipStatusLabel(membership),
      className: 'ui-badge ui-badge--danger',
      active: false,
    };
  }

  return {
    label: membershipStatusLabel(membership),
    className: 'ui-badge ui-badge--warning',
    active: false,
  };
}

function renderMembership() {
  const elements = getElements();
  const membership = state.membership;

  if (!membership) {
    hideElement(elements.membershipCard);
    showElement(elements.membershipEmpty);

    resetMembershipProgress();
    return;
  }

  showElement(elements.membershipCard);
  hideElement(elements.membershipEmpty);

  const plan = membership.membership_plan;
  const visual = membershipVisualState(membership);
  const days =
    membershipDaysRemaining(membership);

  if (elements.membershipCardStatus) {
    elements.membershipCardStatus.className =
      visual.className;

    setText(
      elements.membershipCardStatus,
      visual.label
    );
  }

  setText(
    elements.membershipCardPlan,
    plan?.name || 'Üzvlük'
  );

  setText(
    elements.membershipCardStart,
    formatDate(membership.start_date)
  );

  setText(
    elements.membershipCardEnd,
    formatDate(membership.end_date)
  );

  setText(
    elements.membershipCardDaysLeft,
    visual.active ? `${days} gün` : 'Bitib'
  );

  setText(
    elements.membershipCardPrice,
    money(
      membership.price ??
      plan?.price ??
      0
    )
  );

  renderMembershipProgress(membership);
}

function membershipProgressPercent(membership) {
  const start = Date.parse(
    `${membership?.start_date || ''}T00:00:00`
  );

  const end = Date.parse(
    `${membership?.end_date || ''}T23:59:59`
  );

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return 0;
  }

  if (end <= start) return 100;

  const percent =
    ((Date.now() - start) / (end - start)) * 100;

  return Math.max(
    0,
    Math.min(100, Math.round(percent))
  );
}

function progressBucket(percent) {
  return Math.round(percent / 5) * 5;
}

function resetMembershipProgress() {
  const progress =
    getElements().membershipCardProgress;

  if (!progress) return;

  applyMembershipProgress(progress, 0);
}

function applyMembershipProgress(
  progress,
  percent
) {
  const safePercent = Math.max(
    0,
    Math.min(100, Math.round(percent))
  );

  progress.setAttribute(
    'aria-valuemin',
    '0'
  );
  progress.setAttribute(
    'aria-valuemax',
    '100'
  );
  progress.setAttribute(
    'aria-valuenow',
    String(safePercent)
  );

  progress.dataset.progress =
    String(safePercent);

  if (
    typeof HTMLProgressElement !== 'undefined' &&
    progress instanceof HTMLProgressElement
  ) {
    progress.max = 100;
    progress.value = safePercent;
    return;
  }

  Array.from(progress.classList)
    .filter(className =>
      className.startsWith(
        'membership-progress--'
      )
    )
    .forEach(className =>
      progress.classList.remove(className)
    );

  progress.classList.add(
    `membership-progress--${progressBucket(
      safePercent
    )}`
  );
}

function renderMembershipProgress(membership) {
  const progress =
    getElements().membershipCardProgress;

  if (!progress) return;

  applyMembershipProgress(
    progress,
    membershipProgressPercent(membership)
  );
}

function openProfileEditor() {
  const profile = state.profile;
  if (!profile) return;

  const content = createElement('form', {
    className: 'modal-form',
    attrs: {
      id: 'profile-edit-form',
      novalidate: '',
    },
  });

  content.innerHTML = `
    <div class="ui-field">
      <label
        class="ui-field__label"
        for="profile-edit-full-name"
      >
        Ad və soyad
      </label>
      <div class="ui-input">
        <input
          id="profile-edit-full-name"
          class="ui-input__control"
          type="text"
          autocomplete="name"
          maxlength="150"
          value="${escapeHtml(profile.full_name || '')}"
          placeholder="Ad Soyad"
        >
      </div>
      <span
        id="profile-edit-full-name-error"
        class="ui-field__error is-hidden"
      ></span>
    </div>

    <div class="ui-field">
      <label
        class="ui-field__label"
        for="profile-edit-phone"
      >
        Telefon
      </label>
      <div class="ui-input">
        <input
          id="profile-edit-phone"
          class="ui-input__control"
          type="tel"
          autocomplete="tel"
          value="${escapeHtml(profile.phone || '')}"
          placeholder="+994..."
        >
      </div>
      <span
        id="profile-edit-phone-error"
        class="ui-field__error is-hidden"
      ></span>
    </div>

    <div class="ui-field">
      <label
        class="ui-field__label"
        for="profile-edit-birth-date"
      >
        Doğum tarixi
      </label>
      <div class="ui-input">
        <input
          id="profile-edit-birth-date"
          class="ui-input__control"
          type="date"
          max="${todayIso()}"
          value="${escapeHtml(profile.birth_date || '')}"
        >
      </div>
    </div>

    <div class="ui-field">
      <label
        class="ui-field__label"
        for="profile-edit-address"
      >
        Ünvan
      </label>
      <div class="ui-input">
        <input
          id="profile-edit-address"
          class="ui-input__control"
          type="text"
          maxlength="300"
          value="${escapeHtml(profile.address || '')}"
          placeholder="Ünvan"
        >
      </div>
    </div>

    <button
      id="profile-edit-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >
      <span class="ui-button__label">Yadda saxla</span>
      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>
    </button>
  `;

  openModal({
    eyebrow: 'Profil',
    title: 'Məlumatları redaktə et',
    content,
    trigger: getElements().editButton,
    onOpen: () => bindProfileEditForm(content),
  });
}

function bindProfileEditForm(form) {
  const fullNameInput =
    $('#profile-edit-full-name', form);

  const phoneInput =
    $('#profile-edit-phone', form);

  const birthDateInput =
    $('#profile-edit-birth-date', form);

  const addressInput =
    $('#profile-edit-address', form);

  const fullNameError =
    $('#profile-edit-full-name-error', form);

  const phoneError =
    $('#profile-edit-phone-error', form);

  const submit =
    $('#profile-edit-submit', form);

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      if (state.savingProfile) return;

      clearFormErrors(form);

      const fullName =
        normalizeString(fullNameInput?.value);

      const phone =
        normalizeString(phoneInput?.value);

      const birthDate =
        normalizeString(birthDateInput?.value);

      const address =
        normalizeString(addressInput?.value);

      let valid = true;

      if (fullName.length < 2) {
        setFieldError(
          fullNameInput,
          fullNameError,
          'Ad və soyad minimum 2 simvol olmalıdır.'
        );
        valid = false;
      }

      if (phone && !validatePhone(phone)) {
        setFieldError(
          phoneInput,
          phoneError,
          'Telefon nömrəsi düzgün deyil.'
        );
        valid = false;
      }

      if (
        birthDate &&
        birthDate > todayIso()
      ) {
        notify.warning(
          'Doğum tarixi gələcək tarix ola bilməz.'
        );
        valid = false;
      }

      if (!valid) return;

      state.savingProfile = true;

      setButtonLoading(
        submit,
        true,
        { loadingText: 'Yadda saxlanılır...' }
      );

      try {
        const profileId = state.profile?.id;

        if (!profileId) {
          throw new Error(
            'Profil ID-si tapılmadı.'
          );
        }

        const payload = {
          full_name: fullName,
          phone: phone || null,
          birth_date: birthDate || null,
          address: address || null,
        };

        const { data, error } =
          await supabase
            .from(TABLES.profiles)
            .update(payload)
            .eq('id', profileId)
            .select(`
              id,
              auth_user_id,
              role,
              full_name,
              email,
              phone,
              birth_date,
              address,
              avatar_url,
              is_manual,
              is_active,
              created_at,
              updated_at
            `)
            .single();

        if (error) throw error;

        applyUpdatedProfile(data);
        renderProfile();
        closeModal();

        dispatchProfileChange(
          data,
          'profile-update'
        );

        notify.success(
          'Profil məlumatları yeniləndi.'
        );
      } catch (error) {
        console.error(
          '[SKy Fit Profile] Update:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Profil məlumatları yenilənmədi.'
          )
        );
      } finally {
        state.savingProfile = false;
        setButtonLoading(submit, false);
      }
    }
  );
}

function applyUpdatedProfile(profile) {
  state.profile = profile;

  if (!state.identity) return;

  state.identity.profile = profile;
  state.identity.name = getProfileName(
    profile,
    state.identity.email
  );
  state.identity.avatar =
    getProfileAvatar(profile);
}

function dispatchProfileChange(
  profile,
  type
) {
  window.dispatchEvent(
    new CustomEvent(
      SKYFIT_EVENTS.profileChange,
      {
        detail: {
          profile,
          type,
        },
      }
    )
  );
}

function bindEditAction() {
  getElements()
    .editButton
    ?.addEventListener(
      'click',
      openProfileEditor
    );
}

function bindAvatarEvents() {
  const elements = getElements();

  elements.avatarButton?.addEventListener(
    'click',
    () => {
      if (!state.avatarUploading) {
        elements.avatarInput?.click();
      }
    }
  );

  elements.avatarInput?.addEventListener(
    'change',
    async event => {
      const input = event.currentTarget;
      const file = input?.files?.[0];

      if (input) input.value = '';
      if (!file) return;

      await uploadAvatar(file);
    }
  );
}

function validateAvatarFile(file) {
  if (!AVATAR_TYPES.has(file?.type)) {
    return {
      valid: false,
      message:
        'Profil şəkli JPG, PNG və ya WEBP formatında olmalıdır.',
    };
  }

  if (file.size > AVATAR_MAX_SIZE) {
    return {
      valid: false,
      message:
        'Profil şəkli maksimum 5 MB ola bilər.',
    };
  }

  return {
    valid: true,
    message: '',
  };
}

function avatarExtension(file) {
  switch (file?.type) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function buildAvatarPath(file) {
  const profileId = state.profile?.id;

  if (!profileId) {
    throw new Error(
      'Profil ID-si tapılmadı.'
    );
  }

  return (
    `${profileId}/` +
    `avatar-${Date.now()}.` +
    avatarExtension(file)
  );
}

async function uploadAvatar(file) {
  if (state.avatarUploading) return;

  const validation =
    validateAvatarFile(file);

  if (!validation.valid) {
    notify.warning(validation.message);
    return;
  }

  const profileId = state.profile?.id;

  if (!profileId) {
    notify.error(
      'Profil məlumatı tapılmadı.'
    );
    return;
  }

  state.avatarUploading = true;

  const oldAvatar =
    normalizeString(
      state.profile?.avatar_url
    );

  let newPath = '';

  try {
    newPath = buildAvatarPath(file);

    const { error: uploadError } =
      await supabase.storage
        .from(APP_CONFIG.storage.avatars)
        .upload(
          newPath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          }
        );

    if (uploadError) throw uploadError;

    const { data, error } =
      await supabase
        .from(TABLES.profiles)
        .update({ avatar_url: newPath })
        .eq('id', profileId)
        .select(`
          id,
          auth_user_id,
          role,
          full_name,
          email,
          phone,
          birth_date,
          address,
          avatar_url,
          is_manual,
          is_active,
          created_at,
          updated_at
        `)
        .single();

    if (error) {
      await removeAvatarObject(newPath);
      throw error;
    }

    applyUpdatedProfile(data);
    renderProfile();

    dispatchProfileChange(
      data,
      'avatar-update'
    );

    const oldPath =
      extractAvatarStoragePath(oldAvatar);

    if (
      avatarPathBelongsToProfile(
        oldPath,
        profileId
      ) &&
      oldPath !== newPath
    ) {
      try {
        await removeAvatarObject(oldPath);
      } catch (cleanupError) {
        console.warn(
          '[SKy Fit Profile] Old avatar cleanup:',
          cleanupError
        );
        notify.warning(
          'Yeni profil şəkli saxlanıldı, köhnə şəkil Storage-dan silinə bilmədi.'
        );
      }
    }

    notify.success(
      'Profil şəkli yeniləndi.'
    );
  } catch (error) {
    console.error(
      '[SKy Fit Profile] Avatar:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Profil şəkli yüklənmədi.'
      )
    );
  } finally {
    state.avatarUploading = false;
  }
}

function extractAvatarStoragePath(value) {
  const source = normalizeString(value);
  if (!source) return '';

  if (
    !/^https?:\/\//i.test(source)
  ) {
    return source.replace(/^\/+/, '');
  }

  try {
    const url = new URL(source);

    const marker =
      '/storage/v1/object/public/avatars/';

    const index =
      url.pathname.indexOf(marker);

    if (index === -1) return '';

    return decodeURIComponent(
      url.pathname.slice(
        index + marker.length
      )
    );
  } catch {
    return '';
  }
}

function avatarPathBelongsToProfile(
  path,
  profileId
) {
  const safePath = normalizeString(path);
  const safeProfileId =
    normalizeString(profileId);

  return Boolean(
    safePath &&
    safeProfileId &&
    safePath.startsWith(
      `${safeProfileId}/`
    )
  );
}

async function removeAvatarObject(path) {
  const safePath = normalizeString(path);
  if (!safePath) return false;

  const { error } =
    await supabase.storage
      .from(APP_CONFIG.storage.avatars)
      .remove([safePath]);

  if (error) throw error;

  return true;
}

function bindPasswordAction() {
  getElements()
    .changePasswordButton
    ?.addEventListener(
      'click',
      async () => {
        const email = normalizeString(
          state.identity?.email ||
          state.profile?.email
        );

        if (!email) {
          notify.error(
            'Hesabın e-poçt ünvanı tapılmadı.'
          );
          return;
        }

        const confirmed =
          await confirmDialog({
            eyebrow: 'Təhlükəsizlik',
            title: 'Şifrə dəyişdirilsin?',
            message:
              `${email} ünvanına təhlükəsiz şifrə yeniləmə keçidi göndəriləcək.`,
            confirmText: 'Keçid göndər',
            cancelText: 'Ləğv et',
          });

        if (!confirmed) return;

        try {
          const redirectUrl =
            new URL(
              APP_CONFIG.routes.updatePassword,
              window.location.href
            ).href;

          const { error } =
            await supabase.auth
              .resetPasswordForEmail(
                email,
                {
                  redirectTo: redirectUrl,
                }
              );

          if (error) throw error;

          notify.success(
            'Şifrə yeniləmə keçidi e-poçt ünvanına göndərildi.'
          );
        } catch (error) {
          console.error(
            '[SKy Fit Profile] Password reset:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Şifrə yeniləmə keçidi göndərilmədi.'
            )
          );
        }
      }
    );
}

function currentThemeLabel() {
  switch (getStoredTheme()) {
    case 'dark':
      return 'Tünd rejim';
    case 'light':
      return 'Açıq rejim';
    default:
      return 'Sistem rejimi';
  }
}

function syncThemeLabel() {
  setText(
    getElements().themeLabel,
    currentThemeLabel()
  );
}

function bindThemeAction() {
  const elements = getElements();

  elements.themeButton?.addEventListener(
    'click',
    () => {
      cycleTheme();
      syncThemeLabel();
    }
  );

  window.addEventListener(
    SKYFIT_EVENTS.themeChange,
    syncThemeLabel
  );

  syncThemeLabel();
}

function bindLogoutAction() {
  getElements()
    .logoutButton
    ?.addEventListener(
      'click',
      async () => {
        const confirmed =
          await confirmDialog({
            eyebrow: 'Hesab',
            title: 'Çıxış edilsin?',
            message:
              'Cari SKy Fit sessiyası bağlanacaq.',
            confirmText: 'Çıxış et',
            cancelText: 'Ləğv et',
            danger: true,
          });

        if (!confirmed) return;

        await signOut({
          redirect: true,
          redirectTo: APP_CONFIG.routes.login,
        });
      }
    );
}

function bindAuthEvents() {
  window.addEventListener(
    SKYFIT_EVENTS.authChange,
    async event => {
      const authEvent =
        normalizeString(
          event.detail?.event
        );

      if (authEvent === 'SIGNED_OUT') {
        return;
      }

      try {
        const identity =
          event.detail?.identity ||
          await getCurrentIdentity({
            force: true,
          });

        if (!identity?.authenticated) {
          return;
        }

        state.identity = identity;
        state.profile = identity.profile;
        renderProfile();
      } catch (error) {
        console.error(
          '[SKy Fit Profile] Auth refresh:',
          error
        );
      }
    }
  );
}

function bindProfileChangeEvents() {
  window.addEventListener(
    SKYFIT_EVENTS.profileChange,
    event => {
      const profile =
        event.detail?.profile;

      if (!profile) return;

      applyUpdatedProfile(profile);
      renderProfile();
    }
  );
}

async function loadProfileData() {
  await Promise.all([loadMemberships(), loadAccessCard()]);
}

function bindEvents() {
  bindEditAction();
  bindAvatarEvents();
  bindPasswordAction();
  bindThemeAction();
  bindLogoutAction();
  bindAuthEvents();
  bindMobileEntry();
  bindProfileChangeEvents();
}

async function init() {
  try {
    await initLayout();

    const identity = await loadIdentity();
    if (!identity) return;

    renderProfile();
    bindEvents();
    await loadProfileData();
  } catch (error) {
    console.error(
      '[SKy Fit Profile] Init:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Profil səhifəsi başladılmadı.'
      )
    );
  }
}

asyncHandler(init, {
  notifyOnError: true,
})();
