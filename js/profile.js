// SKy Fit Pro — profil səhifəsi controller-i
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  APP_CONFIG,
  TABLES,
  UI_CONFIG,
} from './config.js';

import {
  SKYFIT_EVENTS,
  $,
  byId,
  createElement,
  clearElement,
  showElement,
  hideElement,
  setText,
  normalizeString,
  escapeHtml,
  formatDate,
  formatTime,
  todayIso,
  getCurrentIdentity,
  getProfileName,
  getProfileInitials,
  getProfileAvatar,
  roleLabel,
  membershipIsActive,
  membershipDaysRemaining,
  membershipStatusLabel,
  attendanceDate,
  attendanceTypeLabel,
  attendanceAmount,
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
  attendance: [],
  attendanceExpanded: false,
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

    fullName: byId('profile-full-name'),
    phone: byId('profile-phone'),
    emailDetail: byId('profile-email-detail'),
    birthDate: byId('profile-birth-date'),
    address: byId('profile-address'),

    membershipStatus: byId('profile-membership-status'),
    membershipPlan: byId('profile-membership-plan'),
    membershipExpiry: byId('profile-membership-expiry'),
    membershipDays: byId('profile-membership-days'),

    attendanceCount: byId('profile-attendance-count'),
    lastAttendanceDate: byId('profile-last-attendance-date'),
    lastAttendanceTime: byId('profile-last-attendance-time'),

    membershipCard: byId('profile-membership-card'),
    membershipEmpty: byId('profile-membership-empty'),
    membershipCardStatus: byId('membership-card-status'),
    membershipCardPlan: byId('membership-card-plan'),
    membershipCardStart: byId('membership-card-start'),
    membershipCardEnd: byId('membership-card-end'),
    membershipCardDaysLeft: byId('membership-card-days-left'),
    membershipCardPrice: byId('membership-card-price'),
    membershipCardProgress: byId('membership-card-progress'),

    attendanceList: byId('profile-attendance-list'),
    attendanceEmpty: byId('profile-attendance-empty'),
    attendanceShowAll: byId('attendance-show-all-button'),

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

    if (elements.membershipStatus) {
      elements.membershipStatus.className =
        'ui-badge ui-badge--neutral';

      setText(
        elements.membershipStatus,
        'Üzvlük yoxdur'
      );
    }

    setText(elements.membershipPlan, '—');
    setText(elements.membershipExpiry, '—');
    setText(elements.membershipDays, '—');
    resetMembershipProgress();
    return;
  }

  showElement(elements.membershipCard);
  hideElement(elements.membershipEmpty);

  const plan = membership.membership_plan;
  const visual = membershipVisualState(membership);
  const days =
    membershipDaysRemaining(membership);

  if (elements.membershipStatus) {
    elements.membershipStatus.className =
      visual.className;

    setText(
      elements.membershipStatus,
      visual.label
    );
  }

  setText(
    elements.membershipPlan,
    plan?.name || 'Üzvlük'
  );

  setText(
    elements.membershipExpiry,
    membership.end_date
      ? formatDate(membership.end_date)
      : '—'
  );

  setText(
    elements.membershipDays,
    visual.active ? `${days} gün` : 'Bitib'
  );

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

async function loadAttendance() {
  const profileId = state.identity?.profileId;

  if (!profileId) {
    state.attendance = [];
    renderAttendance();
    return;
  }

  const { data, error } = await supabase
    .from(TABLES.attendance)
    .select(`
      id,
      member_id,
      membership_id,
      attendance_type,
      amount,
      checked_in_at,
      created_by,
      updated_by,
      operator_shift_id,
      operator:profiles!attendance_created_by_fkey (
        id,
        full_name,
        role,
        avatar_url
      )
    `)
    .eq('member_id', profileId)
    .order('checked_in_at', { ascending: false })
    .limit(UI_CONFIG.attendance.adminHistoryLimit);

  if (error) {
    console.error(
      '[SKy Fit Profile] Attendance:',
      error
    );

    state.attendance = [];
    renderAttendance();

    notify.error(
      getErrorMessage(
        error,
        'Giriş tarixçəsi yüklənmədi.'
      )
    );

    return;
  }

  state.attendance =
    Array.isArray(data) ? data : [];

  renderAttendance();
}

function renderAttendanceSummary() {
  const elements = getElements();

  setText(
    elements.attendanceCount,
    state.attendance.length
  );

  const latest = state.attendance[0];

  if (!latest) {
    setText(
      elements.lastAttendanceDate,
      'Giriş yoxdur'
    );
    setText(elements.lastAttendanceTime, '—');
    return;
  }

  const date = attendanceDate(latest);

  setText(
    elements.lastAttendanceDate,
    formatDate(date)
  );

  setText(
    elements.lastAttendanceTime,
    formatTime(date)
  );
}

function renderAttendance() {
  const elements = getElements();
  renderAttendanceSummary();

  if (!elements.attendanceList) return;

  clearElement(elements.attendanceList);

  if (state.attendance.length === 0) {
    showElement(elements.attendanceEmpty);
    hideElement(elements.attendanceShowAll);
    return;
  }

  hideElement(elements.attendanceEmpty);

  const limit =
    UI_CONFIG.attendance.profileHistoryLimit;

  const visible =
    state.attendanceExpanded
      ? state.attendance
      : state.attendance.slice(0, limit);

  const fragment =
    document.createDocumentFragment();

  visible.forEach(attendance => {
    fragment.append(
      createAttendanceRow(attendance)
    );
  });

  elements.attendanceList.append(fragment);

  if (!elements.attendanceShowAll) return;

  if (state.attendance.length > limit) {
    showElement(elements.attendanceShowAll);

    setText(
      elements.attendanceShowAll,
      state.attendanceExpanded
        ? 'Daha az göstər'
        : 'Hamısını göstər'
    );
  } else {
    hideElement(elements.attendanceShowAll);
  }
}

function createAttendanceRow(attendance) {
  const date = attendanceDate(attendance);

  const operatorName = normalizeString(
    attendance?.operator?.full_name,
    'Sistem'
  );

  const amount = attendanceAmount(attendance);

  const item = createElement('article', {
    className: 'history-item',
  });

  item.innerHTML = `
    <span class="history-item__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5V4Z"
          stroke="currentColor"
          stroke-width="1.7"
        />
        <path
          d="m13 12 6-4v8l-6-4Z"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <span class="history-item__content">
      <strong class="history-item__title">
        ${escapeHtml(
          attendanceTypeLabel(attendance)
        )}
      </strong>
      <span class="history-item__meta">
        ${
          amount > 0
            ? `${escapeHtml(money(amount))} · `
            : ''
        }
        Operator: ${escapeHtml(operatorName)}
      </span>
    </span>

    <span class="history-item__side">
      <strong>${escapeHtml(formatDate(date))}</strong>
      <span>${escapeHtml(formatTime(date))}</span>
    </span>
  `;

  return item;
}

function bindAttendanceEvents() {
  getElements()
    .attendanceShowAll
    ?.addEventListener(
      'click',
      () => {
        state.attendanceExpanded =
          !state.attendanceExpanded;

        renderAttendance();
      }
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
      removeAvatarObject(oldPath).catch(
        cleanupError => {
          console.warn(
            '[SKy Fit Profile] Old avatar cleanup:',
            cleanupError
          );
        }
      );
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
  await Promise.all([
    loadMemberships(),
    loadAttendance(),
  ]);
}

function bindEvents() {
  bindEditAction();
  bindAvatarEvents();
  bindAttendanceEvents();
  bindPasswordAction();
  bindThemeAction();
  bindLogoutAction();
  bindAuthEvents();
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
