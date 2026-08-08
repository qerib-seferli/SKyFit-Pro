// ============================================================
// SKY FIT PRO
// Profile Page Controller
// File: js/profile.js
//
// PART 1 / 2
// Real Supabase Schema
// ============================================================

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
  clearElement,
  showElement,
  hideElement,
  setText,

  normalizeString,
  escapeHtml,

  formatDate,
  formatTime,
  formatDateTime,

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

import {
  initLayout,
  refreshLayoutIdentity,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {

  identity:
    null,

  profile:
    null,

  membership:
    null,

  memberships:
    [],

  attendance:
    [],

  attendanceExpanded:
    false,

  avatarUploading:
    false,

  savingProfile:
    false,
};


// ============================================================
// 02. DOM
// ============================================================

function getElements() {
  return {

    // --------------------------------------------------------
    // Main profile identity
    // --------------------------------------------------------

    avatarButton:
      byId(
        'profile-avatar-button'
      ),

    avatarInput:
      byId(
        'profile-avatar-input'
      ),

    avatarImage:
      byId(
        'profile-avatar-image'
      ),

    avatarFallback:
      byId(
        'profile-avatar-fallback'
      ),

    profileTitle:
      byId(
        'profile-title'
      ),

    profileEmail:
      byId(
        'profile-email'
      ),

    roleBadge:
      byId(
        'profile-role-badge'
      ),

    editButton:
      byId(
        'profile-edit-button'
      ),


    // --------------------------------------------------------
    // Detail fields
    // --------------------------------------------------------

    fullName:
      byId(
        'profile-full-name'
      ),

    phone:
      byId(
        'profile-phone'
      ),

    emailDetail:
      byId(
        'profile-email-detail'
      ),

    birthDate:
      byId(
        'profile-birth-date'
      ),

    address:
      byId(
        'profile-address'
      ),


    // --------------------------------------------------------
    // Overview
    // --------------------------------------------------------

    membershipStatus:
      byId(
        'profile-membership-status'
      ),

    membershipPlan:
      byId(
        'profile-membership-plan'
      ),

    membershipExpiry:
      byId(
        'profile-membership-expiry'
      ),

    membershipDays:
      byId(
        'profile-membership-days'
      ),

    attendanceCount:
      byId(
        'profile-attendance-count'
      ),

    lastAttendanceDate:
      byId(
        'profile-last-attendance-date'
      ),

    lastAttendanceTime:
      byId(
        'profile-last-attendance-time'
      ),


    // --------------------------------------------------------
    // Membership card
    // --------------------------------------------------------

    membershipCard:
      byId(
        'profile-membership-card'
      ),

    membershipEmpty:
      byId(
        'profile-membership-empty'
      ),

    membershipCardStatus:
      byId(
        'membership-card-status'
      ),

    membershipCardPlan:
      byId(
        'membership-card-plan'
      ),

    membershipCardStart:
      byId(
        'membership-card-start'
      ),

    membershipCardEnd:
      byId(
        'membership-card-end'
      ),

    membershipCardDaysLeft:
      byId(
        'membership-card-days-left'
      ),

    membershipCardPrice:
      byId(
        'membership-card-price'
      ),

    membershipCardProgress:
      byId(
        'membership-card-progress'
      ),


    // --------------------------------------------------------
    // Attendance history
    // --------------------------------------------------------

    attendanceList:
      byId(
        'profile-attendance-list'
      ),

    attendanceEmpty:
      byId(
        'profile-attendance-empty'
      ),

    attendanceShowAll:
      byId(
        'attendance-show-all-button'
      ),


    // --------------------------------------------------------
    // Settings/actions
    // --------------------------------------------------------

    changePasswordButton:
      byId(
        'profile-change-password-button'
      ),

    themeButton:
      byId(
        'profile-theme-button'
      ),

    themeLabel:
      byId(
        'profile-theme-label'
      ),

    logoutButton:
      byId(
        'profile-logout-button'
      ),
  };
}


// ============================================================
// 03. REQUIRE PROFILE
// ============================================================

async function loadIdentity() {
  const identity =
    await getCurrentIdentity({
      force:
        true,
    });


  if (
    !identity
      ?.authenticated
  ) {
    window.location.replace(
      APP_CONFIG.routes.login
    );

    return null;
  }


  state.identity =
    identity;


  state.profile =
    identity.profile;


  return identity;
}


// ============================================================
// 04. PROFILE RENDER
// ============================================================

function renderProfile() {
  const elements =
    getElements();


  const profile =
    state.profile;


  const identity =
    state.identity;


  if (
    !profile ||
    !identity
  ) {
    return;
  }


  const name =
    getProfileName(
      profile,
      identity.email
    );


  const avatar =
    getProfileAvatar(
      profile
    );


  const initials =
    getProfileInitials(
      profile
    );


  // ----------------------------------------------------------
  // Main identity
  // ----------------------------------------------------------

  setText(
    elements.profileTitle,
    name
  );


  setText(
    elements.profileEmail,
    profile.email ||
    identity.email ||
    '—'
  );


  setText(
    elements.fullName,
    name
  );


  setText(
    elements.emailDetail,
    profile.email ||
    identity.email ||
    '—'
  );


  setText(
    elements.phone,
    profile.phone ||
    'Əlavə edilməyib'
  );


  setText(
    elements.birthDate,
    profile.birth_date
      ? formatDate(
          profile.birth_date
        )
      : 'Əlavə edilməyib'
  );


  setText(
    elements.address,
    profile.address ||
    'Əlavə edilməyib'
  );


  // ----------------------------------------------------------
  // Role
  // ----------------------------------------------------------

  if (
    elements.roleBadge
  ) {
    elements.roleBadge
      .className =
        roleClass(
          profile.role
        );


    setText(
      elements.roleBadge,
      roleLabel(
        profile.role
      )
    );
  }


  // ----------------------------------------------------------
  // Avatar
  // ----------------------------------------------------------

  if (avatar) {
    if (
      elements.avatarImage
    ) {
      elements.avatarImage.src =
        avatar;


      elements.avatarImage.alt =
        `${name} profil şəkli`;


      elements.avatarImage.hidden =
        false;


      elements.avatarImage.onload =
        () => {
          hideElement(
            elements.avatarFallback
          );
        };


      elements.avatarImage.onerror =
        () => {
          elements.avatarImage.hidden =
            true;


          renderAvatarFallback(
            initials
          );
        };
    }


    hideElement(
      elements.avatarFallback
    );
  } else {
    if (
      elements.avatarImage
    ) {
      elements.avatarImage.hidden =
        true;
    }


    renderAvatarFallback(
      initials
    );
  }
}


// ============================================================
// 05. AVATAR FALLBACK
// ============================================================

function renderAvatarFallback(
  initials
) {
  const elements =
    getElements();


  if (
    !elements.avatarFallback
  ) {
    return;
  }


  setText(
    elements.avatarFallback,
    initials ||
    'SK'
  );


  showElement(
    elements.avatarFallback
  );
}


// ============================================================
// 06. ROLE STYLE
// ============================================================

function roleClass(
  role
) {
  switch (
    normalizeString(
      role
    )
  ) {
    case 'admin':
      return (
        'ui-badge ui-badge--danger'
      );


    case 'staff':
      return (
        'ui-badge ui-badge--warning'
      );


    case 'member':
      return (
        'ui-badge ui-badge--success'
      );


    default:
      return (
        'ui-badge ui-badge--neutral'
      );
  }
}


// ============================================================
// 07. LOAD MEMBERSHIPS
//
// Explicit FK aliases.
// PGRST201 burada baş verməməlidir.
// ============================================================

async function loadMemberships() {
  const profileId =
    state.identity
      ?.profileId;


  if (!profileId) {
    state.memberships =
      [];

    state.membership =
      null;

    renderMembership();

    return;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.memberships
      )
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
      .eq(
        'member_id',
        profileId
      )
      .order(
        'end_date',
        {
          ascending:
            false,
        }
      );


  if (error) {
    console.error(
      '[SKy Fit Profile] Memberships:',
      error
    );


    state.memberships =
      [];

    state.membership =
      null;


    renderMembership();


    return;
  }


  state.memberships =
    Array.isArray(data)
      ? data
      : [];


  state.membership =
    findCurrentMembership(
      state.memberships
    );


  renderMembership();
}


// ============================================================
// 08. CURRENT MEMBERSHIP
// ============================================================

function findCurrentMembership(
  memberships
) {
  if (
    !Array.isArray(
      memberships
    )
  ) {
    return null;
  }


  const active =
    memberships.find(
      membership =>
        membershipIsActive(
          membership
        )
    );


  if (active) {
    return active;
  }


  return (
    memberships[0] ||
    null
  );
}


// ============================================================
// 09. MEMBERSHIP RENDER
// ============================================================

function renderMembership() {
  const elements =
    getElements();


  const membership =
    state.membership;


  if (!membership) {
    hideElement(
      elements.membershipCard
    );


    showElement(
      elements.membershipEmpty
    );


    if (
      elements.membershipStatus
    ) {
      elements
        .membershipStatus
        .className =
          'ui-badge ui-badge--neutral';


      setText(
        elements
          .membershipStatus,
        'Üzvlük yoxdur'
      );
    }


    setText(
      elements.membershipPlan,
      '—'
    );


    setText(
      elements.membershipExpiry,
      '—'
    );


    setText(
      elements.membershipDays,
      '—'
    );


    return;
  }


  showElement(
    elements.membershipCard
  );


  hideElement(
    elements.membershipEmpty
  );


  const plan =
    membership
      .membership_plan;


  const active =
    membershipIsActive(
      membership
    );


  const days =
    membershipDaysRemaining(
      membership
    );


  const statusLabel =
    membershipStatusLabel(
      membership
    );


  const statusClass =
    active
      ? 'ui-badge ui-badge--success'
      : membership.status ===
          'cancelled'
        ? 'ui-badge ui-badge--danger'
        : 'ui-badge ui-badge--warning';


  // ----------------------------------------------------------
  // Overview
  // ----------------------------------------------------------

  if (
    elements.membershipStatus
  ) {
    elements
      .membershipStatus
      .className =
        statusClass;


    setText(
      elements
        .membershipStatus,
      statusLabel
    );
  }


  setText(
    elements.membershipPlan,
    plan?.name ||
    'Üzvlük'
  );


  setText(
    elements.membershipExpiry,
    membership.end_date
      ? formatDate(
          membership.end_date
        )
      : '—'
  );


  setText(
    elements.membershipDays,
    active
      ? `${days} gün`
      : 'Bitib'
  );


  // ----------------------------------------------------------
  // Detail card
  // ----------------------------------------------------------

  if (
    elements
      .membershipCardStatus
  ) {
    elements
      .membershipCardStatus
      .className =
        statusClass;


    setText(
      elements
        .membershipCardStatus,
      statusLabel
    );
  }


  setText(
    elements
      .membershipCardPlan,
    plan?.name ||
    'Üzvlük'
  );


  setText(
    elements
      .membershipCardStart,
    formatDate(
      membership.start_date
    )
  );


  setText(
    elements
      .membershipCardEnd,
    formatDate(
      membership.end_date
    )
  );


  setText(
    elements
      .membershipCardDaysLeft,
    active
      ? `${days} gün`
      : 'Bitib'
  );


  setText(
    elements
      .membershipCardPrice,
    money(
      membership.price ??
      plan?.price ??
      0
    )
  );


  renderMembershipProgress(
    membership
  );
}


// ============================================================
// 10. MEMBERSHIP PROGRESS
// ============================================================

function renderMembershipProgress(
  membership
) {
  const elements =
    getElements();


  const progress =
    elements
      .membershipCardProgress;


  if (!progress) {
    return;
  }


  const start =
    new Date(
      membership.start_date
    );


  const end =
    new Date(
      membership.end_date
    );


  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    progress.style.width =
      '0%';

    return;
  }


  const total =
    end.getTime() -
    start.getTime();


  if (
    total <= 0
  ) {
    progress.style.width =
      '100%';

    return;
  }


  const elapsed =
    Date.now() -
    start.getTime();


  const percent =
    Math.max(
      0,
      Math.min(
        100,
        elapsed /
        total *
        100
      )
    );


  progress.style.width =
    `${percent}%`;
}


// ============================================================
// 11. LOAD ATTENDANCE
//
// Real timestamp:
// checked_in_at
//
// Explicit member/operator aliases də var.
// ============================================================

async function loadAttendance() {
  const profileId =
    state.identity
      ?.profileId;


  if (!profileId) {
    state.attendance =
      [];

    renderAttendance();

    return;
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        TABLES.attendance
      )
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
      .eq(
        'member_id',
        profileId
      )
      .order(
        'checked_in_at',
        {
          ascending:
            false,
        }
      )
      .limit(200);


  if (error) {
    console.error(
      '[SKy Fit Profile] Attendance:',
      error
    );


    state.attendance =
      [];


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
// 12. ATTENDANCE SUMMARY
// ============================================================

function renderAttendanceSummary() {
  const elements =
    getElements();


  setText(
    elements.attendanceCount,
    state.attendance.length
  );


  const latest =
    state.attendance[0];


  if (!latest) {
    setText(
      elements
        .lastAttendanceDate,
      'Giriş yoxdur'
    );


    setText(
      elements
        .lastAttendanceTime,
      '—'
    );


    return;
  }


  const date =
    attendanceDate(
      latest
    );


  setText(
    elements
      .lastAttendanceDate,
    formatDate(date)
  );


  setText(
    elements
      .lastAttendanceTime,
    formatTime(date)
  );
}


// ============================================================
// 13. ATTENDANCE RENDER
// ============================================================

function renderAttendance() {
  const elements =
    getElements();


  renderAttendanceSummary();


  if (
    !elements.attendanceList
  ) {
    return;
  }


  clearElement(
    elements.attendanceList
  );


  if (
    state.attendance.length ===
    0
  ) {
    showElement(
      elements
        .attendanceEmpty
    );


    hideElement(
      elements
        .attendanceShowAll
    );


    return;
  }


  hideElement(
    elements.attendanceEmpty
  );


  const visible =
    state.attendanceExpanded
      ? state.attendance
      : state.attendance.slice(
          0,
          10
        );


  visible.forEach(
    attendance => {
      elements
        .attendanceList
        .append(
          createAttendanceRow(
            attendance
          )
        );
    }
  );


  if (
    elements
      .attendanceShowAll
  ) {
    if (
      state.attendance.length >
      10
    ) {
      showElement(
        elements
          .attendanceShowAll
      );


      setText(
        elements
          .attendanceShowAll,
        state
          .attendanceExpanded
          ? 'Daha az göstər'
          : 'Hamısını göstər'
      );
    } else {
      hideElement(
        elements
          .attendanceShowAll
      );
    }
  }
}


// ============================================================
// 14. ATTENDANCE ROW
// ============================================================

function createAttendanceRow(
  attendance
) {
  const date =
    attendanceDate(
      attendance
    );


  const operatorName =
    normalizeString(
      attendance
        ?.operator
        ?.full_name,
      'Sistem'
    );


  const amount =
    attendanceAmount(
      attendance
    );


  const item =
    createElement(
      'article',
      {
        className:
          'history-item',
      }
    );


  item.innerHTML = `
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
          attendanceTypeLabel(
            attendance
          )
        )}
      </strong>

      <span class="history-item__meta">

        ${
          amount > 0
            ? `${escapeHtml(
                money(amount)
              )} · `
            : ''
        }

        Operator:
        ${escapeHtml(
          operatorName
        )}

      </span>

    </span>


    <span class="history-item__side">

      <strong>
        ${formatDate(date)}
      </strong>

      <span>
        ${formatTime(date)}
      </span>

    </span>
  `;


  return item;
}


// ============================================================
// 15. ATTENDANCE EVENTS
// ============================================================

function bindAttendanceEvents() {
  const elements =
    getElements();


  elements
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


// ============================================================
// 16. PROFILE EDIT MODAL
// ============================================================

function openProfileEditor() {
  const profile =
    state.profile;


  if (!profile) {
    return;
  }


  const content =
    createElement(
      'form',
      {
        className:
          'modal-form',

        attrs: {
          id:
            'profile-edit-form',

          novalidate:
            '',
        },
      }
    );


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
          value="${escapeHtml(
            profile.full_name ||
            ''
          )}"
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
          value="${escapeHtml(
            profile.phone ||
            ''
          )}"
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
          value="${escapeHtml(
            profile.birth_date ||
            ''
          )}"
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
          value="${escapeHtml(
            profile.address ||
            ''
          )}"
          placeholder="Ünvan"
        >

      </div>

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
      'Profil',

    title:
      'Məlumatları redaktə et',

    content,

    trigger:
      getElements()
        .editButton,

    onOpen:
      () => {
        bindProfileEditForm(
          content
        );
      },
  });
}


// ============================================================

// ============================================================
// 17. PROFILE EDIT FORM
// ============================================================

function bindProfileEditForm(
  form
) {
  const fullNameInput =
    $(
      '#profile-edit-full-name',
      form
    );

  const phoneInput =
    $(
      '#profile-edit-phone',
      form
    );

  const birthDateInput =
    $(
      '#profile-edit-birth-date',
      form
    );

  const addressInput =
    $(
      '#profile-edit-address',
      form
    );

  const fullNameError =
    $(
      '#profile-edit-full-name-error',
      form
    );

  const phoneError =
    $(
      '#profile-edit-phone-error',
      form
    );

  const submit =
    $(
      '#profile-edit-submit',
      form
    );


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();


      if (
        state.savingProfile
      ) {
        return;
      }


      clearFormErrors(
        form
      );


      const fullName =
        normalizeString(
          fullNameInput?.value
        );


      const phone =
        normalizeString(
          phoneInput?.value
        );


      const birthDate =
        normalizeString(
          birthDateInput?.value
        );


      const address =
        normalizeString(
          addressInput?.value
        );


      let valid =
        true;


      // ------------------------------------------------------
      // Full name
      // ------------------------------------------------------

      if (
        fullName.length < 2
      ) {
        setFieldError(
          fullNameInput,
          fullNameError,
          'Ad və soyad minimum 2 simvol olmalıdır.'
        );


        valid =
          false;
      }


      // ------------------------------------------------------
      // Phone
      // ------------------------------------------------------

      if (
        phone &&
        !validatePhone(
          phone
        )
      ) {
        setFieldError(
          phoneInput,
          phoneError,
          'Telefon nömrəsi düzgün deyil.'
        );


        valid =
          false;
      }


      if (!valid) {
        return;
      }


      state.savingProfile =
        true;


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
          state.profile?.id;


        if (!profileId) {
          throw new Error(
            'Profil ID-si tapılmadı.'
          );
        }


        const payload = {

          full_name:
            fullName,

          phone:
            phone ||
            null,

          birth_date:
            birthDate ||
            null,

          address:
            address ||
            null,
        };


        const {
          data,
          error,
        } =
          await supabase
            .from(
              TABLES.profiles
            )
            .update(
              payload
            )
            .eq(
              'id',
              profileId
            )
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
          throw error;
        }


        state.profile =
          data;


        if (
          state.identity
        ) {
          state.identity.profile =
            data;


          state.identity.name =
            getProfileName(
              data,
              state.identity.email
            );


          state.identity.avatar =
            getProfileAvatar(
              data
            );
        }


        renderProfile();


        closeModal();


        await refreshLayoutIdentity();


        window.dispatchEvent(
          new CustomEvent(
            SKYFIT_EVENTS
              .profileChange,
            {
              detail: {
                profile:
                  data,

                type:
                  'profile-update',
              },
            }
          )
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
        state.savingProfile =
          false;


        setButtonLoading(
          submit,
          false
        );
      }
    }
  );
}


// ============================================================
// 18. EDIT BUTTON
// ============================================================

function bindEditAction() {
  getElements()
    .editButton
    ?.addEventListener(
      'click',
      openProfileEditor
    );
}


// ============================================================
// 19. AVATAR EVENTS
// ============================================================

function bindAvatarEvents() {
  const elements =
    getElements();


  elements.avatarButton
    ?.addEventListener(
      'click',
      () => {
        if (
          state.avatarUploading
        ) {
          return;
        }


        elements
          .avatarInput
          ?.click();
      }
    );


  elements.avatarInput
    ?.addEventListener(
      'change',
      async event => {
        const file =
          event.target
            ?.files
            ?.[0];


        // Eyni faylı ardıcıl seçməyə imkan verir.
        event.target.value =
          '';


        if (!file) {
          return;
        }


        await uploadAvatar(
          file
        );
      }
    );
}


// ============================================================
// 20. AVATAR VALIDATION
// ============================================================

function validateAvatarFile(
  file
) {
  const allowed =
    new Set([
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
      valid:
        false,

      message:
        'Profil şəkli JPG, PNG və ya WEBP formatında olmalıdır.',
    };
  }


  const maxSize =
    5 *
    1024 *
    1024;


  if (
    file.size >
    maxSize
  ) {
    return {
      valid:
        false,

      message:
        'Profil şəkli maksimum 5 MB ola bilər.',
    };
  }


  return {
    valid:
      true,

    message:
      '',
  };
}


// ============================================================
// 21. AVATAR EXTENSION
// ============================================================

function avatarExtension(
  file
) {
  switch (
    file?.type
  ) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    default:
      return 'jpg';
  }
}


// ============================================================
// 22. AVATAR STORAGE PATH
//
// profiles.id istifadə edirik.
// auth.users.id ilə qarışdırmırıq.
//
// avatars/
//   {profile_id}/
//      avatar-{timestamp}.webp
// ============================================================

function buildAvatarPath(
  file
) {
  const profileId =
    state.profile?.id;


  if (!profileId) {
    throw new Error(
      'Profil ID-si tapılmadı.'
    );
  }


  const extension =
    avatarExtension(
      file
    );


  return (
    `${profileId}/` +
    `avatar-${Date.now()}.${extension}`
  );
}


// ============================================================
// 23. AVATAR UPLOAD
// ============================================================

async function uploadAvatar(
  file
) {
  if (
    state.avatarUploading
  ) {
    return;
  }


  const validation =
    validateAvatarFile(
      file
    );


  if (
    !validation.valid
  ) {
    notify.warning(
      validation.message
    );

    return;
  }


  const profileId =
    state.profile?.id;


  if (!profileId) {
    notify.error(
      'Profil məlumatı tapılmadı.'
    );

    return;
  }


  state.avatarUploading =
    true;


  const oldAvatar =
    normalizeString(
      state.profile
        ?.avatar_url
    );


  let newPath =
    '';


  try {
    newPath =
      buildAvatarPath(
        file
      );


    // --------------------------------------------------------
    // Storage upload
    // --------------------------------------------------------

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .avatars
        )
        .upload(
          newPath,
          file,
          {
            cacheControl:
              '3600',

            upsert:
              false,

            contentType:
              file.type,
          }
        );


    if (
      uploadError
    ) {
      throw uploadError;
    }


    // --------------------------------------------------------
    // profiles.avatar_url update
    // DB-də relative path saxlayırıq.
    // --------------------------------------------------------

    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.profiles
        )
        .update({
          avatar_url:
            newPath,
        })
        .eq(
          'id',
          profileId
        )
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
      // DB update alınmasa yeni yüklənmiş lazımsız faylı silirik.
      await removeAvatarObject(
        newPath
      );


      throw error;
    }


    state.profile =
      data;


    if (
      state.identity
    ) {
      state.identity.profile =
        data;


      state.identity.avatar =
        getProfileAvatar(
          data
        );
    }


    renderProfile();


    await refreshLayoutIdentity();


    window.dispatchEvent(
      new CustomEvent(
        SKYFIT_EVENTS
          .profileChange,
        {
          detail: {
            profile:
              data,

            type:
              'avatar-update',
          },
        }
      )
    );


    // --------------------------------------------------------
    // Köhnə avatar artıq DB tərəfindən istifadə olunmur.
    // Safe şəkildə storage-dan silməyə cəhd edirik.
    // --------------------------------------------------------

    const oldPath =
      extractAvatarStoragePath(
        oldAvatar
      );


    if (
      oldPath &&
      oldPath !==
        newPath
    ) {
      removeAvatarObject(
        oldPath
      ).catch(
        error => {
          console.warn(
            '[SKy Fit Profile] Old avatar cleanup:',
            error
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
    state.avatarUploading =
      false;
  }
}


// ============================================================
// 24. EXTRACT AVATAR STORAGE PATH
//
// DB-də:
// profile-id/avatar.jpg
//
// və ya köhnədən tam public URL qalıbsa onu da tanıyır.
// ============================================================

function extractAvatarStoragePath(
  value
) {
  const source =
    normalizeString(
      value
    );


  if (!source) {
    return '';
  }


  if (
    !source.startsWith(
      'http://'
    ) &&
    !source.startsWith(
      'https://'
    )
  ) {
    return source
      .replace(
        /^\/+/,
        ''
      );
  }


  try {
    const url =
      new URL(source);


    const marker =
      '/storage/v1/object/public/avatars/';


    const index =
      url.pathname.indexOf(
        marker
      );


    if (
      index === -1
    ) {
      return '';
    }


    return decodeURIComponent(
      url.pathname.slice(
        index +
        marker.length
      )
    );
  } catch {
    return '';
  }
}


// ============================================================
// 25. REMOVE AVATAR OBJECT
// ============================================================

async function removeAvatarObject(
  path
) {
  const safePath =
    normalizeString(
      path
    );


  if (!safePath) {
    return false;
  }


  const {
    error,
  } =
    await supabase
      .storage
      .from(
        APP_CONFIG
          .storage
          .avatars
      )
      .remove([
        safePath,
      ]);


  if (error) {
    throw error;
  }


  return true;
}


// ============================================================
// 26. CHANGE PASSWORD
// ============================================================

function bindPasswordAction() {
  getElements()
    .changePasswordButton
    ?.addEventListener(
      'click',
      async () => {
        const email =
          normalizeString(
            state.identity
              ?.email ||
            state.profile
              ?.email
          );


        if (!email) {
          notify.error(
            'Hesabın e-poçt ünvanı tapılmadı.'
          );

          return;
        }


        const confirmed =
          await confirmDialog({
            eyebrow:
              'Təhlükəsizlik',

            title:
              'Şifrə dəyişdirilsin?',

            message:
              `${email} ünvanına təhlükəsiz şifrə yeniləmə keçidi göndəriləcək.`,

            confirmText:
              'Keçid göndər',

            cancelText:
              'Ləğv et',
          });


        if (!confirmed) {
          return;
        }


        try {
          const redirectUrl =
            new URL(
              APP_CONFIG
                .routes
                .updatePassword,
              window.location.href
            ).href;


          const {
            error,
          } =
            await supabase
              .auth
              .resetPasswordForEmail(
                email,
                {
                  redirectTo:
                    redirectUrl,
                }
              );


          if (error) {
            throw error;
          }


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


// ============================================================
// 27. THEME LABEL
// ============================================================

function currentThemeLabel() {
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


// ============================================================
// 28. SYNC THEME LABEL
// ============================================================

function syncThemeLabel() {
  setText(
    getElements()
      .themeLabel,
    currentThemeLabel()
  );
}


// ============================================================
// 29. THEME ACTION
// ============================================================

function bindThemeAction() {
  const elements =
    getElements();


  elements.themeButton
    ?.addEventListener(
      'click',
      () => {
        cycleTheme();


        syncThemeLabel();
      }
    );


  window.addEventListener(
    SKYFIT_EVENTS
      .themeChange,
    syncThemeLabel
  );


  syncThemeLabel();
}


// ============================================================
// 30. LOGOUT
// ============================================================

function bindLogoutAction() {
  getElements()
    .logoutButton
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


        await signOut({
          redirect:
            true,

          redirectTo:
            APP_CONFIG
              .routes
              .login,
        });
      }
    );
}


// ============================================================
// 31. AUTH CHANGE
// ============================================================

function bindAuthEvents() {
  window.addEventListener(
    SKYFIT_EVENTS
      .authChange,
    async event => {
      const authEvent =
        normalizeString(
          event.detail
            ?.event
        );


      if (
        authEvent ===
        'SIGNED_OUT'
      ) {
        return;
      }


      try {
        const identity =
          event.detail
            ?.identity ||
          await getCurrentIdentity({
            force:
              true,
          });


        if (
          !identity
            ?.authenticated
        ) {
          return;
        }


        state.identity =
          identity;


        state.profile =
          identity.profile;


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


// ============================================================
// 32. PROFILE CHANGE
//
// Eyni event-i özümüz də dispatch etdiyimiz üçün
// profile detail başqa komponentdən dəyişəndə sinxronlaşır.
// ============================================================

function bindProfileChangeEvents() {
  window.addEventListener(
    SKYFIT_EVENTS
      .profileChange,
    event => {
      const profile =
        event.detail
          ?.profile;


      if (!profile) {
        return;
      }


      state.profile =
        profile;


      if (
        state.identity
      ) {
        state.identity.profile =
          profile;


        state.identity.name =
          getProfileName(
            profile,
            state.identity.email
          );


        state.identity.avatar =
          getProfileAvatar(
            profile
          );
      }


      renderProfile();
    }
  );
}


// ============================================================
// 33. LOAD PROFILE PAGE DATA
// ============================================================

async function loadProfileData() {
  await Promise.all([
    loadMemberships(),
    loadAttendance(),
  ]);
}


// ============================================================
// 34. BIND EVENTS
// ============================================================

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


// ============================================================
// 35. INIT
// ============================================================

async function init() {
  try {
    // Layout dərhal render olunub.
    // Burada yalnız real identity hydrate edilir.
    await initLayout();


    const identity =
      await loadIdentity();


    if (!identity) {
      return;
    }


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


// ============================================================
// 36. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError:
      true,
  }
)();


// ============================================================
// SKY FIT PRO PROFILE.JS COMPLETE
// ============================================================
