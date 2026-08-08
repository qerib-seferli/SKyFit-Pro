// ============================================================
// SKY FIT PRO
// Profile Page Controller
// File: js/profile.js
// ============================================================

import {
  supabase,
  APP_CONFIG,
  TABLES,
} from './config.js';

import {
  $,
  byId,
  createElement,
  clearElement,
  showElement,
  hideElement,
  setText,
  normalizeString,
  formatDate,
  formatTime,
  daysLeft,
  membershipStatus,
  getCurrentIdentity,
  getProfileName,
  getInitials,
  getPublicStorageUrl,
  roleLabel,
  roleBadgeClass,
  openModal,
  closeModal,
  confirmDialog,
  notify,
  getErrorMessage,
  validatePhone,
  setFieldError,
  clearFormErrors,
  setButtonLoading,
  cycleTheme,
  getStoredTheme,
  signOut,
  requireAuth,
  asyncHandler,
} from './core.js';

import {
  initLayout,
  refreshLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {
  identity: null,

  membership: null,

  attendance: [],

  attendanceExpanded: false,

  avatarUploading: false,
};


// ============================================================
// 02. DOM
// ============================================================

const elements = {
  avatarButton:
    byId('profile-avatar-button'),

  avatarInput:
    byId('profile-avatar-input'),

  avatarImage:
    byId('profile-avatar-image'),

  avatarFallback:
    byId('profile-avatar-fallback'),

  roleBadge:
    byId('profile-role-badge'),

  profileTitle:
    byId('profile-title'),

  profileEmail:
    byId('profile-email'),

  editButton:
    byId('profile-edit-button'),

  overviewMembershipStatus:
    byId('profile-membership-status'),

  overviewMembershipPlan:
    byId('profile-membership-plan'),

  overviewMembershipExpiry:
    byId('profile-membership-expiry'),

  attendanceCount:
    byId('profile-attendance-count'),

  lastAttendanceDate:
    byId('profile-last-attendance-date'),

  lastAttendanceTime:
    byId('profile-last-attendance-time'),

  fullName:
    byId('profile-full-name'),

  phone:
    byId('profile-phone'),

  emailDetail:
    byId('profile-email-detail'),

  membershipCard:
    byId('profile-membership-card'),

  membershipEmpty:
    byId('profile-membership-empty'),

  membershipCardStatus:
    byId('membership-card-status'),

  membershipCardPlan:
    byId('membership-card-plan'),

  membershipCardProgress:
    byId('membership-card-progress'),

  membershipCardStart:
    byId('membership-card-start'),

  membershipCardEnd:
    byId('membership-card-end'),

  membershipCardDaysLeft:
    byId('membership-card-days-left'),

  attendanceList:
    byId('profile-attendance-list'),

  attendanceEmpty:
    byId('profile-attendance-empty'),

  attendanceShowAll:
    byId('attendance-show-all-button'),

  changePasswordButton:
    byId('profile-change-password-button'),

  themeButton:
    byId('profile-theme-button'),

  themeLabel:
    byId('profile-theme-label'),

  logoutButton:
    byId('profile-logout-button'),
};


// ============================================================
// 03. PROFILE FIELD HELPERS
// Mövcud backend strukturu dəyişdirilmir.
// ============================================================

function profileHasColumn(column) {
  return (
    state.identity?.profile &&
    Object.prototype.hasOwnProperty.call(
      state.identity.profile,
      column
    )
  );
}


function readProfileValue(
  candidates,
  fallback = ''
) {
  const profile =
    state.identity?.profile;

  if (!profile) {
    return fallback;
  }

  for (const key of candidates) {
    const value =
      profile[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return fallback;
}


function firstName() {
  return normalizeString(
    readProfileValue(
      [
        'first_name',
        'firstName',
        'name',
      ]
    )
  );
}


function lastName() {
  return normalizeString(
    readProfileValue(
      [
        'last_name',
        'lastName',
        'surname',
      ]
    )
  );
}


function phoneNumber() {
  return normalizeString(
    readProfileValue(
      [
        'phone',
        'phone_number',
        'mobile',
      ]
    )
  );
}


// ============================================================
// 04. AVATAR HELPERS
// ============================================================

function avatarStoredValue() {
  return normalizeString(
    readProfileValue(
      [
        'avatar_url',
        'avatar_path',
        'avatar',
      ]
    )
  );
}


function avatarColumn() {
  const candidates = [
    'avatar_url',
    'avatar_path',
    'avatar',
  ];

  return (
    candidates.find(
      profileHasColumn
    ) || null
  );
}


function avatarUrl() {
  const stored =
    avatarStoredValue();

  if (!stored) {
    return '';
  }

  if (
    stored.startsWith('https://') ||
    stored.startsWith('http://')
  ) {
    return stored;
  }

  return getPublicStorageUrl(
    APP_CONFIG.storage.avatars,
    stored
  );
}


// ============================================================
// 05. RENDER PROFILE IDENTITY
// ============================================================

function renderIdentity() {
  const identity =
    state.identity;

  if (!identity) return;

  const profile =
    identity.profile;

  const user =
    identity.user;

  const name =
    getProfileName(
      profile,
      user
    );

  const email =
    normalizeString(
      user?.email
    );

  const initials =
    getInitials(
      firstName(),
      lastName()
    );

  const imageUrl =
    avatarUrl();


  setText(
    elements.profileTitle,
    name
  );

  setText(
    elements.profileEmail,
    email
  );

  setText(
    elements.fullName,
    name
  );

  setText(
    elements.phone,
    phoneNumber(),
    'Əlavə edilməyib'
  );

  setText(
    elements.emailDetail,
    email
  );


  if (elements.roleBadge) {
    elements.roleBadge.className =
      roleBadgeClass(
        identity.role
      );

    elements.roleBadge.textContent =
      roleLabel(
        identity.role
      );
  }


  if (imageUrl) {
    if (elements.avatarImage) {
      elements.avatarImage.src =
        imageUrl;

      elements.avatarImage.alt =
        `${name} profil şəkli`;

      showElement(
        elements.avatarImage
      );
    }

    hideElement(
      elements.avatarFallback
    );
  } else {
    if (elements.avatarFallback) {
      elements.avatarFallback
        .textContent =
          initials;
    }

    showElement(
      elements.avatarFallback
    );

    hideElement(
      elements.avatarImage
    );
  }
}


// ============================================================
// 06. MEMBERSHIP QUERY
// ============================================================

async function loadMembership() {
  const profileId =
    state.identity?.profile?.id;

  if (!profileId) {
    state.membership = null;

    renderMembership();

    return;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(TABLES.memberships)
      .select(`
        *,
        membership_plans (*)
      `)
      .eq(
        'profile_id',
        profileId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();


  if (error) {
    console.error(
      'Profile membership error:',
      error
    );

    state.membership = null;

    renderMembership();

    return;
  }


  state.membership =
    data || null;

  renderMembership();
}


// ============================================================
// 07. MEMBERSHIP RENDER
// ============================================================

function renderMembership() {
  const membership =
    state.membership;


  if (!membership) {
    hideElement(
      elements.membershipCard
    );

    showElement(
      elements.membershipEmpty
    );


    setText(
      elements.overviewMembershipPlan,
      'Aktiv üzvlük yoxdur'
    );

    setText(
      elements.overviewMembershipExpiry,
      '—'
    );


    if (
      elements
        .overviewMembershipStatus
    ) {
      elements
        .overviewMembershipStatus
        .className =
          'ui-badge ui-badge--neutral';

      elements
        .overviewMembershipStatus
        .textContent =
          'Yoxdur';
    }

    return;
  }


  showElement(
    elements.membershipCard
  );

  hideElement(
    elements.membershipEmpty
  );


  const startDate =
    membership.start_date ||
    membership.starts_at ||
    membership.created_at;

  const endDate =
    membership.end_date ||
    membership.expires_at;


  const status =
    membershipStatus({
      status:
        membership.status,

      endDate,
    });


  const plan =
    membership.membership_plans;

  const planName =
    normalizeString(
      plan?.name ||
      membership.plan_name,
      'Üzvlük'
    );


  if (
    elements
      .overviewMembershipStatus
  ) {
    elements
      .overviewMembershipStatus
      .className =
        status.className;

    elements
      .overviewMembershipStatus
      .textContent =
        status.label;
  }


  if (
    elements
      .membershipCardStatus
  ) {
    elements
      .membershipCardStatus
      .className =
        status.className;

    elements
      .membershipCardStatus
      .textContent =
        status.label;
  }


  setText(
    elements.overviewMembershipPlan,
    planName
  );


  setText(
    elements.overviewMembershipExpiry,
    endDate
      ? `${formatDate(endDate)}-dək`
      : '—'
  );


  setText(
    elements.membershipCardPlan,
    planName
  );


  setText(
    elements.membershipCardStart,
    formatDate(startDate)
  );


  setText(
    elements.membershipCardEnd,
    formatDate(endDate)
  );


  const remaining =
    endDate
      ? daysLeft(endDate)
      : 0;


  setText(
    elements.membershipCardDaysLeft,
    endDate
      ? remaining > 0
        ? `${remaining} gün`
        : remaining === 0
          ? 'Bu gün'
          : 'Bitib'
      : '—'
  );


  renderMembershipProgress(
    startDate,
    endDate
  );
}


// ============================================================
// 08. MEMBERSHIP PROGRESS
// ============================================================

function renderMembershipProgress(
  startDate,
  endDate
) {
  if (
    !elements.membershipCardProgress
  ) {
    return;
  }


  const start =
    startDate
      ? new Date(startDate)
      : null;

  const end =
    endDate
      ? new Date(endDate)
      : null;


  if (
    !start ||
    !end ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    elements
      .membershipCardProgress
      .style.width =
        '0%';

    return;
  }


  const total =
    end.getTime() -
    start.getTime();

  const elapsed =
    Date.now() -
    start.getTime();


  if (total <= 0) {
    elements
      .membershipCardProgress
      .style.width =
        '100%';

    return;
  }


  const progress =
    Math.max(
      0,
      Math.min(
        100,
        (elapsed / total) * 100
      )
    );


  elements
    .membershipCardProgress
    .style.width =
      `${progress}%`;
}


// ============================================================
// 09. ATTENDANCE QUERY
// ============================================================

async function loadAttendance() {
  const profileId =
    state.identity?.profile?.id;

  if (!profileId) {
    state.attendance = [];

    renderAttendance();

    return;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(TABLES.attendance)
      .select('*')
      .eq(
        'profile_id',
        profileId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(200);


  if (error) {
    console.error(
      'Profile attendance error:',
      error
    );

    state.attendance = [];

    renderAttendance();

    return;
  }


  state.attendance =
    Array.isArray(data)
      ? data
      : [];


  renderAttendance();
}


// ============================================================
// 10. ATTENDANCE DATE
// ============================================================

function attendanceDateValue(
  item
) {
  return (
    item?.attended_at ||
    item?.entry_at ||
    item?.checked_in_at ||
    item?.created_at ||
    null
  );
}


// ============================================================
// 11. ATTENDANCE RENDER
// ============================================================

function renderAttendance() {
  const list =
    state.attendance;


  setText(
    elements.attendanceCount,
    list.length
  );


  const latest =
    list[0];


  if (latest) {
    const value =
      attendanceDateValue(
        latest
      );

    setText(
      elements.lastAttendanceDate,
      formatDate(value)
    );

    setText(
      elements.lastAttendanceTime,
      formatTime(value)
    );
  } else {
    setText(
      elements.lastAttendanceDate,
      'Giriş yoxdur'
    );

    setText(
      elements.lastAttendanceTime,
      '—'
    );
  }


  if (!elements.attendanceList) {
    return;
  }


  clearElement(
    elements.attendanceList
  );


  if (list.length === 0) {
    showElement(
      elements.attendanceEmpty
    );

    hideElement(
      elements.attendanceShowAll
    );

    return;
  }


  hideElement(
    elements.attendanceEmpty
  );


  const limit =
    state.attendanceExpanded
      ? list.length
      : 10;


  list
    .slice(0, limit)
    .forEach(
      item => {
        elements.attendanceList.append(
          createAttendanceItem(
            item
          )
        );
      }
    );


  if (
    elements.attendanceShowAll
  ) {
    elements
      .attendanceShowAll
      .classList.toggle(
        'is-hidden',
        list.length <= 10
      );

    elements
      .attendanceShowAll
      .textContent =
        state.attendanceExpanded
          ? 'Daha az'
          : 'Hamısı';
  }
}


// ============================================================
// 12. ATTENDANCE COMPONENT
// ============================================================

function createAttendanceItem(
  item
) {
  const value =
    attendanceDateValue(
      item
    );

  const entryType =
    normalizeString(
      item?.entry_type ||
      item?.type ||
      item?.attendance_type
    );


  const row =
    createElement(
      'article',
      {
        className:
          'history-item',
      }
    );


  row.innerHTML = `
    <span class="history-item__icon">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5V4Z"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
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
        Giriş qeydiyyatı
      </strong>

      <span class="history-item__meta">
        ${
          entryType
            ? escapeText(entryType)
            : 'SKy Fit'
        }
      </span>

    </span>

    <span class="history-item__side">

      <strong>
        ${formatDate(value)}
      </strong>

      <span>
        ${formatTime(value)}
      </span>

    </span>
  `;


  return row;
}


// ============================================================
// 13. LOCAL ESCAPE
// ============================================================

function escapeText(value) {
  const element =
    document.createElement(
      'span'
    );

  element.textContent =
    normalizeString(value);

  return element.innerHTML;
}


// ============================================================
// 14. PROFILE EDIT MODAL
// ============================================================

function openProfileEditor() {
  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'profile-edit-form',
          novalidate: '',
        },
      }
    );


  content.innerHTML = `
    <div class="modal-form__grid">

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="profile-edit-first-name"
        >
          Ad
        </label>

        <div class="ui-input">

          <span class="ui-input__icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="8"
                r="3.5"
                stroke="currentColor"
                stroke-width="1.7"
              />

              <path
                d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <input
            id="profile-edit-first-name"
            class="ui-input__control"
            type="text"
            autocomplete="given-name"
            maxlength="60"
            value="${escapeText(
              firstName()
            )}"
          >

        </div>

        <span
          id="profile-edit-first-name-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>


      <div class="ui-field">

        <label
          class="ui-field__label"
          for="profile-edit-last-name"
        >
          Soyad
        </label>

        <div class="ui-input">

          <span class="ui-input__icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="8"
                r="3.5"
                stroke="currentColor"
                stroke-width="1.7"
              />

              <path
                d="M5.5 20c.6-4 3-6 6.5-6s5.9 2 6.5 6"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <input
            id="profile-edit-last-name"
            class="ui-input__control"
            type="text"
            autocomplete="family-name"
            maxlength="60"
            value="${escapeText(
              lastName()
            )}"
          >

        </div>

        <span
          id="profile-edit-last-name-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

    </div>


    <div class="ui-field">

      <label
        class="ui-field__label"
        for="profile-edit-phone"
      >
        Telefon
      </label>

      <div class="ui-input">

        <span class="ui-input__icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.2 3.8 4.8 6.2c-.8.8-.7 2.6.2 4.5 1.4 3 4.4 6 7.4 7.4 1.9.9 3.7 1 4.5.2l2.4-2.4c.5-.5.5-1.3 0-1.8l-2.7-2.7c-.5-.5-1.2-.5-1.7-.1l-1.6 1.3a14.6 14.6 0 0 1-4-4l1.3-1.6c.4-.5.4-1.2-.1-1.7L9 3.8c-.5-.5-1.3-.5-1.8 0Z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linejoin="round"
            />
          </svg>
        </span>

        <input
          id="profile-edit-phone"
          class="ui-input__control"
          type="tel"
          autocomplete="tel"
          value="${escapeText(
            phoneNumber()
          )}"
        >

      </div>

      <span
        id="profile-edit-phone-error"
        class="ui-field__error is-hidden"
      ></span>

    </div>


    <button
      id="profile-edit-submit"
      class="ui-button ui-button--primary ui-button--full"
      type="submit"
    >
      <span class="ui-button__label">
        Yadda saxla
      </span>

      <span
        class="ui-button__spinner is-hidden"
        aria-hidden="true"
      ></span>
    </button>
  `;


  openModal({
    eyebrow:
      'Şəxsi məlumatlar',

    title:
      'Profili redaktə et',

    content,

    trigger:
      elements.editButton,

    onOpen: () => {
      bindProfileEditForm(
        content
      );
    },
  });
}


// ============================================================
// 15. PROFILE EDIT FORM
// ============================================================

function bindProfileEditForm(
  form
) {
  const firstInput =
    $('#profile-edit-first-name', form);

  const lastInput =
    $('#profile-edit-last-name', form);

  const phoneInput =
    $('#profile-edit-phone', form);

  const firstError =
    $('#profile-edit-first-name-error', form);

  const lastError =
    $('#profile-edit-last-name-error', form);

  const phoneError =
    $('#profile-edit-phone-error', form);

  const submit =
    $('#profile-edit-submit', form);


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const first =
        normalizeString(
          firstInput?.value
        );

      const last =
        normalizeString(
          lastInput?.value
        );

      const phone =
        normalizeString(
          phoneInput?.value
        );


      let valid = true;


      if (
        first &&
        first.length < 2
      ) {
        setFieldError(
          firstInput,
          firstError,
          'Ad minimum 2 simvol olmalıdır.'
        );

        valid = false;
      }


      if (
        last &&
        last.length < 2
      ) {
        setFieldError(
          lastInput,
          lastError,
          'Soyad minimum 2 simvol olmalıdır.'
        );

        valid = false;
      }


      if (
        phone &&
        !validatePhone(phone)
      ) {
        setFieldError(
          phoneInput,
          phoneError,
          'Telefon nömrəsi düzgün deyil.'
        );

        valid = false;
      }


      if (!valid) {
        return;
      }


      const updates =
        buildProfileUpdate({
          first,
          last,
          phone,
        });


      if (
        Object.keys(updates)
          .length === 0
      ) {
        notify.warning(
          'Mövcud profiles strukturunda redaktə edilə biləcək uyğun sütun tapılmadı.'
        );

        return;
      }


      setButtonLoading(
        submit,
        true,
        {
          loadingText:
            'Yadda saxlanılır...',
        }
      );


      try {
        const profileId =
          state.identity
            ?.profile
            ?.id;


        const {
          data,
          error,
        } =
          await supabase
            .from(
              TABLES.profiles
            )
            .update(updates)
            .eq(
              'id',
              profileId
            )
            .select('*')
            .single();


        if (error) {
          throw error;
        }


        state.identity.profile =
          data;


        renderIdentity();

        await refreshLayout();


        notify.success(
          'Profil məlumatları yeniləndi.'
        );


        closeModal();
      } catch (error) {
        notify.error(
          getErrorMessage(error)
        );
      } finally {
        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}


// ============================================================
// 16. SAFE PROFILE UPDATE PAYLOAD
// ============================================================

function buildProfileUpdate({
  first,
  last,
  phone,
}) {
  const updates = {};


  if (
    profileHasColumn(
      'first_name'
    )
  ) {
    updates.first_name =
      first;
  } else if (
    profileHasColumn(
      'name'
    )
  ) {
    updates.name =
      first;
  }


  if (
    profileHasColumn(
      'last_name'
    )
  ) {
    updates.last_name =
      last;
  } else if (
    profileHasColumn(
      'surname'
    )
  ) {
    updates.surname =
      last;
  }


  if (
    profileHasColumn(
      'phone'
    )
  ) {
    updates.phone =
      phone || null;
  } else if (
    profileHasColumn(
      'phone_number'
    )
  ) {
    updates.phone_number =
      phone || null;
  } else if (
    profileHasColumn(
      'mobile'
    )
  ) {
    updates.mobile =
      phone || null;
  }


  return updates;
}


// ============================================================
// 17. AVATAR PICKER
// ============================================================

function bindAvatarEvents() {
  elements.avatarButton
    ?.addEventListener(
      'click',
      () => {
        if (
          state.avatarUploading
        ) {
          return;
        }

        elements.avatarInput
          ?.click();
      }
    );


  elements.avatarInput
    ?.addEventListener(
      'change',
      async event => {
        const file =
          event.target.files?.[0];

        event.target.value = '';

        if (!file) {
          return;
        }

        await uploadAvatar(file);
      }
    );
}


// ============================================================
// 18. AVATAR VALIDATION
// ============================================================

function validateAvatarFile(
  file
) {
  const allowed = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);


  if (
    !allowed.has(
      file.type
    )
  ) {
    return {
      valid: false,
      message:
        'Avatar JPG, PNG və ya WEBP formatında olmalıdır.',
    };
  }


  const maxBytes =
    5 * 1024 * 1024;


  if (
    file.size > maxBytes
  ) {
    return {
      valid: false,
      message:
        'Avatar maksimum 5 MB ola bilər.',
    };
  }


  return {
    valid: true,
    message: '',
  };
}


// ============================================================
// 19. AVATAR UPLOAD
// ============================================================

async function uploadAvatar(
  file
) {
  const validation =
    validateAvatarFile(file);


  if (!validation.valid) {
    notify.warning(
      validation.message
    );

    return;
  }


  const column =
    avatarColumn();


  if (!column) {
    notify.warning(
      'profiles cədvəlində avatar üçün uyğun sütun tapılmadı. Backend diaqnostikası tələb olunur.'
    );

    return;
  }


  const userId =
    state.identity?.user?.id;


  if (!userId) {
    return;
  }


  state.avatarUploading =
    true;


  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase() ||
    'jpg';


  const safeExtension =
    ['jpg', 'jpeg', 'png', 'webp']
      .includes(extension)
      ? extension
      : 'jpg';


  const path =
    `${userId}/avatar.${safeExtension}`;


  try {
    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          APP_CONFIG.storage
            .avatars
        )
        .upload(
          path,
          file,
          {
            upsert: true,
            cacheControl:
              '3600',
            contentType:
              file.type,
          }
        );


    if (uploadError) {
      throw uploadError;
    }


    const payload = {
      [column]: path,
    };


    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.profiles
        )
        .update(payload)
        .eq(
          'id',
          userId
        )
        .select('*')
        .single();


    if (error) {
      throw error;
    }


    state.identity.profile =
      data;


    renderIdentity();

    await refreshLayout();


    notify.success(
      'Profil şəkli yeniləndi.'
    );
  } catch (error) {
    console.error(
      'Avatar upload error:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Profil şəkli yüklənmədi.'
      )
    );
  } finally {
    state.avatarUploading =
      false;
  }
}


// ============================================================
// 20. ATTENDANCE SHOW ALL
// ============================================================

function bindAttendanceEvents() {
  elements.attendanceShowAll
    ?.addEventListener(
      'click',
      () => {
        state.attendanceExpanded =
          !state.attendanceExpanded;

        renderAttendance();
      }
    );
}


// ============================================================
// 21. PASSWORD ACTION
// ============================================================

function bindPasswordAction() {
  elements.changePasswordButton
    ?.addEventListener(
      'click',
      async () => {
        const confirmed =
          await confirmDialog({
            eyebrow:
              'Təhlükəsizlik',

            title:
              'Şifrə dəyişdirilsin?',

            message:
              'Hesabına bağlı e-poçt ünvanına təhlükəsiz şifrə yeniləmə keçidi göndəriləcək.',

            confirmText:
              'Keçid göndər',

            cancelText:
              'Ləğv et',
          });


        if (!confirmed) {
          return;
        }


        const email =
          state.identity
            ?.user
            ?.email;


        if (!email) {
          notify.error(
            'Hesabın e-poçt ünvanı tapılmadı.'
          );

          return;
        }


        try {
          const redirectTo =
            new URL(
              APP_CONFIG.routes
                .updatePassword,
              window.location.href
            ).href;


          const {
            error,
          } =
            await supabase.auth
              .resetPasswordForEmail(
                email,
                {
                  redirectTo,
                }
              );


          if (error) {
            throw error;
          }


          notify.success(
            'Şifrə yeniləmə keçidi e-poçtuna göndərildi.'
          );
        } catch (error) {
          notify.error(
            getErrorMessage(error)
          );
        }
      }
    );
}


// ============================================================
// 22. THEME
// ============================================================

function themeLabel() {
  switch (
    getStoredTheme()
  ) {
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
    elements.themeLabel,
    themeLabel()
  );
}


function bindThemeAction() {
  elements.themeButton
    ?.addEventListener(
      'click',
      () => {
        cycleTheme();

        syncThemeLabel();
      }
    );


  window.addEventListener(
    'skyfit:themechange',
    syncThemeLabel
  );


  syncThemeLabel();
}


// ============================================================
// 23. LOGOUT
// ============================================================

function bindLogout() {
  elements.logoutButton
    ?.addEventListener(
      'click',
      async () => {
        const confirmed =
          await confirmDialog({
            eyebrow:
              'Hesab',

            title:
              'Çıxış edilsin?',

            message:
              'Cari SKy Fit sessiyası bağlanacaq.',

            confirmText:
              'Çıxış et',

            cancelText:
              'Ləğv et',

            danger:
              true,
          });


        if (!confirmed) {
          return;
        }


        await signOut();
      }
    );
}


// ============================================================
// 24. EDIT BUTTON
// ============================================================

function bindEditAction() {
  elements.editButton
    ?.addEventListener(
      'click',
      openProfileEditor
    );
}


// ============================================================
// 25. AUTH CHANGE
// ============================================================

function bindAuthChange() {
  window.addEventListener(
    'skyfit:authchange',
    async event => {
      const authEvent =
        event.detail?.event;


      if (
        authEvent ===
        'SIGNED_OUT'
      ) {
        return;
      }


      const identity =
        await getCurrentIdentity();


      if (
        !identity
          ?.isAuthenticated
      ) {
        return;
      }


      state.identity =
        identity;


      renderIdentity();
    }
  );
}


// ============================================================
// 26. DATA LOAD
// ============================================================

async function loadProfileData() {
  await Promise.all([
    loadMembership(),
    loadAttendance(),
  ]);
}


// ============================================================
// 27. INIT
// ============================================================

async function init() {
  const session =
    await requireAuth();


  if (!session) {
    return;
  }


  state.identity =
    await initLayout();


  if (
    !state.identity
      ?.isAuthenticated
  ) {
    window.location.replace(
      APP_CONFIG.routes.login
    );

    return;
  }


  renderIdentity();

  bindAvatarEvents();

  bindEditAction();

  bindAttendanceEvents();

  bindPasswordAction();

  bindThemeAction();

  bindLogout();

  bindAuthChange();


  await loadProfileData();
}


// ============================================================
// 28. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError: true,
  }
)();


// ============================================================
// PROFILE.JS COMPLETE
// ============================================================
