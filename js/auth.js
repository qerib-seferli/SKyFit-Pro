// SKy Fit Pro — autentifikasiya controller-i
// Senior Full Stack Developer: Qərib Səfərli

import {
  supabase,
  APP_CONFIG,
  clearAuthRecoveryStorage,
} from './config.js';

import {
  SKYFIT_EVENTS,
  byId,
  normalizeString,
  validateEmail,
  validatePhone,
  validatePassword,
  setFieldError,
  clearFormErrors,
  setButtonLoading,
  getCurrentIdentity,
  clearIdentityCache,
  bindPasswordToggle,
  showElement,
  hideElement,
  notify,
  getErrorMessage,
  asyncHandler,
} from './core.js';

import { initLayout } from './layout.js';

const AUTH_PAGES = new Set([
  'login',
  'register',
  'reset-password',
  'update-password',
]);

const state = {
  page: normalizeString(document.body?.dataset?.page),
  busy: false,
  recoverySessionReady: false,
};


const DESKTOP_AUTH_REDIRECT_BASE =
  'https://qerib-seferli.github.io/SKyFit-Pro/';

function authEmailRedirectUrl(route) {
  const isWeb =
    window.location.protocol === 'http:' ||
    window.location.protocol === 'https:';

  return new URL(
    route,
    isWeb
      ? window.location.href
      : DESKTOP_AUTH_REDIRECT_BASE
  ).href;
}

function currentPage() {
  if (state.page) return state.page;

  const file = normalizeString(
    window.location.pathname.split('/').pop(),
    ''
  ).toLowerCase();

  const map = {
    'login.html': 'login',
    'register.html': 'register',
    'reset-password.html': 'reset-password',
    'update-password.html': 'update-password',
  };

  return map[file] || '';
}

function getNextRoute() {
  const raw = normalizeString(
    new URLSearchParams(window.location.search).get('next')
  );

  if (!raw) return '';

  if (
    !/^[a-z0-9][a-z0-9-]*\.html(?:[?#].*)?$/i.test(raw)
  ) {
    return '';
  }

  return `./${raw}`;
}

async function redirectAuthenticatedUser() {
  if (currentPage() === 'update-password') {
    return false;
  }

  try {
    const identity = await getCurrentIdentity();

    if (!identity?.authenticated) {
      return false;
    }

    const target =
      getNextRoute() ||
      (
        identity.isStaff
          ? APP_CONFIG.routes.admin
          : APP_CONFIG.routes.home
      );

    window.location.replace(target);
    return true;
  } catch (error) {
    console.error(
      '[SKy Fit Auth] Existing session:',
      error
    );

    return false;
  }
}

function bindPasswordToggles() {
  document
    .querySelectorAll('[data-password-toggle]')
    .forEach(button => {
      const inputId = normalizeString(
        button.dataset.passwordToggle
      );

      if (!inputId) return;

      const input = byId(inputId);
      if (!input) return;

      bindPasswordToggle(button, input);
    });
}

function getLoginElements() {
  return {
    form: byId('login-form'),
    email: byId('login-email'),
    emailError: byId('login-email-error'),
    password: byId('login-password'),
    passwordError: byId('login-password-error'),
    submit: byId('login-submit'),
  };
}

function bindLogin() {
  const elements = getLoginElements();
  if (!elements.form) return;

  elements.form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();
      if (state.busy) return;

      clearFormErrors(elements.form);

      const email = normalizeString(
        elements.email?.value
      ).toLowerCase();

      const password =
        elements.password?.value || '';

      let valid = true;

      if (!validateEmail(email)) {
        setFieldError(
          elements.email,
          elements.emailError,
          'E-poçt ünvanını düzgün daxil et.'
        );
        valid = false;
      }

      if (!password) {
        setFieldError(
          elements.password,
          elements.passwordError,
          'Şifrəni daxil et.'
        );
        valid = false;
      }

      if (!valid) return;

      state.busy = true;

      setButtonLoading(
        elements.submit,
        true,
        { loadingText: 'Daxil olunur...' }
      );

      try {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;

        if (!data?.user) {
          throw new Error('Sessiya yaradılmadı.');
        }

        clearIdentityCache();

        const identity =
          await getCurrentIdentity({ force: true });

        if (
          identity?.profile &&
          identity.profile.is_active === false
        ) {
          clearAuthRecoveryStorage();
          await supabase.auth.signOut();
          clearIdentityCache();

          notify.error(
            'Hesab deaktiv edilib. Administrasiya ilə əlaqə saxla.'
          );
          return;
        }

        notify.success('Xoş gəldin.');

        const target =
          getNextRoute() ||
          (
            identity?.isStaff
              ? APP_CONFIG.routes.admin
              : APP_CONFIG.routes.home
          );

        setTimeout(
          () => window.location.replace(target),
          180
        );
      } catch (error) {
        console.error('[SKy Fit Auth] Login:', error);
        notify.error(loginErrorMessage(error));
      } finally {
        state.busy = false;
        setButtonLoading(elements.submit, false);
      }
    }
  );
}

function loginErrorMessage(error) {
  const message = normalizeString(
    error?.message
  ).toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-poçt və ya şifrə düzgün deyil.';
  }

  if (message.includes('email not confirmed')) {
    return 'E-poçt ünvanı hələ təsdiqlənməyib.';
  }

  if (message.includes('too many requests')) {
    return 'Çox sayda cəhd edildi. Bir qədər sonra yenidən yoxla.';
  }

  return getErrorMessage(
    error,
    'Daxil olmaq mümkün olmadı.'
  );
}

function getRegisterElements() {
  return {
    form: byId('register-form'),
    fullName: byId('register-full-name'),
    fullNameError: byId('register-full-name-error'),
    email: byId('register-email'),
    emailError: byId('register-email-error'),
    phone: byId('register-phone'),
    phoneError: byId('register-phone-error'),
    password: byId('register-password'),
    passwordError: byId('register-password-error'),
    passwordConfirm: byId('register-password-confirm'),
    passwordConfirmError: byId(
      'register-password-confirm-error'
    ),
    terms: byId('register-terms'),
    termsError: byId('register-terms-error'),
    submit: byId('register-submit'),
  };
}

function bindRegister() {
  const elements = getRegisterElements();
  if (!elements.form) return;

  elements.form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();
      if (state.busy) return;

      clearFormErrors(elements.form);
      clearTermsError(elements);

      const fullName = normalizeString(
        elements.fullName?.value
      );

      const email = normalizeString(
        elements.email?.value
      ).toLowerCase();

      const phone = normalizeString(
        elements.phone?.value
      );

      const password =
        elements.password?.value || '';

      const passwordConfirm =
        elements.passwordConfirm?.value || '';

      const acceptedTerms =
        Boolean(elements.terms?.checked);

      let valid = true;

      if (fullName.length < 3) {
        setFieldError(
          elements.fullName,
          elements.fullNameError,
          'Ad və soyad minimum 3 simvol olmalıdır.'
        );
        valid = false;
      }

      if (!validateEmail(email)) {
        setFieldError(
          elements.email,
          elements.emailError,
          'E-poçt ünvanını düzgün daxil et.'
        );
        valid = false;
      }

      if (phone && !validatePhone(phone)) {
        setFieldError(
          elements.phone,
          elements.phoneError,
          'Telefon nömrəsi düzgün deyil.'
        );
        valid = false;
      }

      if (
        !validatePassword(
          password,
          { minLength: 8 }
        )
      ) {
        setFieldError(
          elements.password,
          elements.passwordError,
          'Şifrə minimum 8 simvol olmalıdır.'
        );
        valid = false;
      }

      if (password !== passwordConfirm) {
        setFieldError(
          elements.passwordConfirm,
          elements.passwordConfirmError,
          'Şifrələr eyni deyil.'
        );
        valid = false;
      }

      if (!acceptedTerms) {
        showTermsError(
          elements,
          'Qaydaları qəbul etməlisən.'
        );
        valid = false;
      }

      if (!valid) return;

      state.busy = true;

      setButtonLoading(
        elements.submit,
        true,
        { loadingText: 'Hesab yaradılır...' }
      );

      try {
        const emailRedirectTo =
          authEmailRedirectUrl(
            APP_CONFIG.routes.login
          );

        const { data, error } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                full_name: fullName,
                phone: phone || null,
              },
            },
          });

        if (error) throw error;

        if (data?.session) {
          clearIdentityCache();
          notify.success('Hesab yaradıldı.');

          setTimeout(
            () => {
              window.location.replace(
                APP_CONFIG.routes.home
              );
            },
            200
          );
          return;
        }

        notify.success(
          'Qeydiyyat tamamlandı. E-poçt ünvanına göndərilən təsdiq keçidini aç.'
        );

        elements.form.reset();
        clearTermsError(elements);

        setTimeout(
          () => {
            window.location.replace(
              APP_CONFIG.routes.login
            );
          },
          1200
        );
      } catch (error) {
        console.error(
          '[SKy Fit Auth] Register:',
          error
        );

        notify.error(
          registerErrorMessage(error)
        );
      } finally {
        state.busy = false;
        setButtonLoading(elements.submit, false);
      }
    }
  );
}

function registerErrorMessage(error) {
  const message = normalizeString(
    error?.message
  ).toLowerCase();

  if (
    message.includes('already registered') ||
    message.includes('user already registered')
  ) {
    return 'Bu e-poçt ünvanı ilə artıq hesab mövcuddur.';
  }

  if (
    message.includes('password') &&
    message.includes('weak')
  ) {
    return 'Daha güclü şifrə seç.';
  }

  if (message.includes('too many requests')) {
    return 'Çox sayda cəhd edildi. Bir qədər sonra yenidən yoxla.';
  }

  return getErrorMessage(
    error,
    'Qeydiyyat tamamlanmadı.'
  );
}

function showTermsError(elements, message) {
  if (!elements.termsError) return;

  elements.termsError.textContent = message;
  showElement(elements.termsError);
  elements.terms?.setAttribute(
    'aria-invalid',
    'true'
  );
}

function clearTermsError(elements) {
  if (!elements.termsError) return;

  elements.termsError.textContent = '';
  hideElement(elements.termsError);
  elements.terms?.removeAttribute('aria-invalid');
}

function bindTermsChange() {
  const elements = getRegisterElements();

  elements.terms?.addEventListener(
    'change',
    () => {
      if (elements.terms.checked) {
        clearTermsError(elements);
      }
    }
  );
}

function getResetElements() {
  return {
    form: byId('reset-password-form'),
    email: byId('reset-password-email'),
    emailError: byId(
      'reset-password-email-error'
    ),
    submit: byId('reset-password-submit'),
    success: byId('reset-password-success'),
  };
}

function bindResetPassword() {
  const elements = getResetElements();
  if (!elements.form) return;

  elements.form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();
      if (state.busy) return;

      clearFormErrors(elements.form);

      const email = normalizeString(
        elements.email?.value
      ).toLowerCase();

      if (!validateEmail(email)) {
        setFieldError(
          elements.email,
          elements.emailError,
          'E-poçt ünvanını düzgün daxil et.'
        );
        return;
      }

      state.busy = true;

      setButtonLoading(
        elements.submit,
        true,
        { loadingText: 'Göndərilir...' }
      );

      try {
        const redirectTo =
          authEmailRedirectUrl(
            APP_CONFIG.routes.updatePassword
          );

        const { error } =
          await supabase.auth.resetPasswordForEmail(
            email,
            { redirectTo }
          );

        if (error) throw error;

        showElement(elements.success);

        notify.success(
          'Şifrə yeniləmə keçidi göndərildi.'
        );
      } catch (error) {
        console.error(
          '[SKy Fit Auth] Reset password:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Şifrə yeniləmə keçidi göndərilmədi.'
          )
        );
      } finally {
        state.busy = false;
        setButtonLoading(elements.submit, false);
      }
    }
  );
}

function getUpdatePasswordElements() {
  return {
    form: byId('update-password-form'),
    password: byId('update-password-new'),
    passwordError: byId(
      'update-password-new-error'
    ),
    passwordConfirm: byId(
      'update-password-confirm'
    ),
    passwordConfirmError: byId(
      'update-password-confirm-error'
    ),
    submit: byId('update-password-submit'),
    invalidState: byId(
      'update-password-invalid'
    ),
    readyState: byId(
      'update-password-ready'
    ),
  };
}

function setRecoveryState(ready) {
  state.recoverySessionReady =
    Boolean(ready);

  const elements =
    getUpdatePasswordElements();

  if (ready) {
    showElement(elements.readyState);
    hideElement(elements.invalidState);
  } else {
    hideElement(elements.readyState);
    showElement(elements.invalidState);
  }
}

function urlContainsRecoveryMarker() {
  const search =
    new URLSearchParams(window.location.search);

  const hash =
    new URLSearchParams(
      window.location.hash.replace(/^#/, '')
    );

  return (
    search.get('type') === 'recovery' ||
    hash.get('type') === 'recovery'
  );
}

async function detectRecoverySession() {
  if (
    currentPage() !== 'update-password'
  ) {
    return;
  }

  if (state.recoverySessionReady) {
    return;
  }

  try {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) throw error;

    setRecoveryState(
      Boolean(data?.session) &&
      urlContainsRecoveryMarker()
    );
  } catch (error) {
    console.error(
      '[SKy Fit Auth] Recovery session:',
      error
    );

    setRecoveryState(false);
  }
}

function bindRecoveryAuthEvent() {
  window.addEventListener(
    SKYFIT_EVENTS.authChange,
    event => {
      if (
        currentPage() !== 'update-password'
      ) {
        return;
      }

      const authEvent =
        normalizeString(event.detail?.event);

      if (authEvent === 'PASSWORD_RECOVERY') {
        setRecoveryState(
          Boolean(event.detail?.session)
        );
      }

      if (authEvent === 'SIGNED_OUT') {
        setRecoveryState(false);
      }
    }
  );
}

function bindUpdatePassword() {
  const elements =
    getUpdatePasswordElements();

  if (!elements.form) return;

  elements.form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();
      if (state.busy) return;

      if (!state.recoverySessionReady) {
        notify.error(
          'Şifrə yeniləmə sessiyası aktiv deyil. Yeni keçid tələb et.'
        );
        return;
      }

      clearFormErrors(elements.form);

      const password =
        elements.password?.value || '';

      const passwordConfirm =
        elements.passwordConfirm?.value || '';

      let valid = true;

      if (
        !validatePassword(
          password,
          { minLength: 8 }
        )
      ) {
        setFieldError(
          elements.password,
          elements.passwordError,
          'Yeni şifrə minimum 8 simvol olmalıdır.'
        );
        valid = false;
      }

      if (password !== passwordConfirm) {
        setFieldError(
          elements.passwordConfirm,
          elements.passwordConfirmError,
          'Şifrələr eyni deyil.'
        );
        valid = false;
      }

      if (!valid) return;

      state.busy = true;

      setButtonLoading(
        elements.submit,
        true,
        { loadingText: 'Şifrə yenilənir...' }
      );

      try {
        const { error } =
          await supabase.auth.updateUser({
            password,
          });

        if (error) throw error;

        notify.success(
          'Şifrə uğurla yeniləndi.'
        );

        clearAuthRecoveryStorage();
        await supabase.auth.signOut();
        clearIdentityCache();
        setRecoveryState(false);

        setTimeout(
          () => {
            window.location.replace(
              APP_CONFIG.routes.login
            );
          },
          350
        );
      } catch (error) {
        console.error(
          '[SKy Fit Auth] Update password:',
          error
        );

        notify.error(
          getErrorMessage(
            error,
            'Şifrə yenilənmədi.'
          )
        );
      } finally {
        state.busy = false;
        setButtonLoading(elements.submit, false);
      }
    }
  );
}

function bindAuthLinks() {
  const routes = {
    'auth-go-login': APP_CONFIG.routes.login,
    'auth-go-register':
      APP_CONFIG.routes.register,
    'auth-go-reset':
      APP_CONFIG.routes.resetPassword,
  };

  Object.entries(routes).forEach(
    ([id, route]) => {
      byId(id)?.addEventListener(
        'click',
        event => {
          event.preventDefault();
          window.location.href = route;
        }
      );
    }
  );
}

function bindCurrentPage() {
  switch (currentPage()) {
    case 'login':
      bindLogin();
      break;

    case 'register':
      bindRegister();
      bindTermsChange();
      break;

    case 'reset-password':
      bindResetPassword();
      break;

    case 'update-password':
      bindRecoveryAuthEvent();
      bindUpdatePassword();
      break;

    default:
      break;
  }
}

function markAuthReady() {
  document.documentElement
    .classList.add('auth-page-ready');
}

async function init() {
  if (!AUTH_PAGES.has(currentPage())) {
    return;
  }

  try {
    await initLayout();

    bindPasswordToggles();
    bindAuthLinks();
    bindCurrentPage();

    if (
      currentPage() === 'update-password'
    ) {
      await detectRecoverySession();
    } else {
      const redirected =
        await redirectAuthenticatedUser();

      if (redirected) return;
    }

    markAuthReady();
  } catch (error) {
    console.error(
      '[SKy Fit Auth] Init:',
      error
    );

    notify.error(
      getErrorMessage(
        error,
        'Giriş sistemi başladılmadı.'
      )
    );

    markAuthReady();
  }
}

asyncHandler(init, {
  notifyOnError: true,
})();
