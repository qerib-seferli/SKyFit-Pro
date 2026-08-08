// ============================================================
// SKY FIT PRO
// Authentication Controller
// File: js/auth.js
// ============================================================

import {
  supabase,
  APP_CONFIG,
  TABLES,
} from './config.js';

import {
  byId,
  $,
  normalizeString,
  validateEmail,
  validatePhone,
  validatePassword,
  setFieldError,
  clearFormErrors,
  bindPasswordToggle,
  setButtonLoading,
  notify,
  getErrorMessage,
  getSession,
  getCurrentIdentity,
  showElement,
  hideElement,
  asyncHandler,
} from './core.js';


// ============================================================
// 01. PAGE
// ============================================================

const page =
  document.body?.dataset?.page || '';


// ============================================================
// 02. SHARED HELPERS
// ============================================================

function normalizeEmail(value) {
  return normalizeString(value)
    .toLowerCase();
}


function normalizePhone(value) {
  return normalizeString(value)
    .replace(/\s+/g, '')
    .replace(/[()-]/g, '');
}


function redirect(url) {
  window.location.replace(url);
}


// ============================================================
// 03. PASSWORD TOGGLES
// ============================================================

function initPasswordToggles() {
  const bindings = [
    [
      'login-password-toggle',
      'login-password',
    ],

    [
      'register-password-toggle',
      'register-password',
    ],

    [
      'register-password-confirm-toggle',
      'register-password-confirm',
    ],

    [
      'update-password-new-toggle',
      'update-password-new',
    ],

    [
      'update-password-confirm-toggle',
      'update-password-confirm',
    ],
  ];

  bindings.forEach(
    ([buttonId, inputId]) => {
      bindPasswordToggle(
        byId(buttonId),
        byId(inputId)
      );
    }
  );
}


// ============================================================
// 04. LOGIN
// ============================================================

function initLogin() {
  const form =
    byId('login-form');

  if (!form) return;

  const emailInput =
    byId('login-email');

  const passwordInput =
    byId('login-password');

  const emailError =
    byId('login-email-error');

  const passwordError =
    byId('login-password-error');

  const submitButton =
    byId('login-submit');


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);

      const email =
        normalizeEmail(
          emailInput?.value
        );

      const password =
        passwordInput?.value || '';

      let valid = true;


      if (!validateEmail(email)) {
        setFieldError(
          emailInput,
          emailError,
          'Düzgün e-poçt ünvanı daxil et.'
        );

        valid = false;
      }


      if (
        !validatePassword(
          password
        )
      ) {
        setFieldError(
          passwordInput,
          passwordError,
          'Şifrə minimum 6 simvol olmalıdır.'
        );

        valid = false;
      }


      if (!valid) {
        return;
      }


      setButtonLoading(
        submitButton,
        true,
        {
          loadingText:
            'Daxil olunur...',
        }
      );


      try {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email,
              password,
            });


        if (error) {
          throw error;
        }


        if (!data?.session) {
          throw new Error(
            'Sessiya yaradılmadı.'
          );
        }


        const identity =
          await getCurrentIdentity();


        notify.success(
          'Hesabına daxil oldun.'
        );


        if (
          identity?.isStaff
        ) {
          redirect(
            APP_CONFIG.routes.admin
          );

          return;
        }


        redirect(
          APP_CONFIG.routes.home
        );
      } catch (error) {
        notify.error(
          getErrorMessage(error)
        );
      } finally {
        setButtonLoading(
          submitButton,
          false
        );
      }
    }
  );
}


// ============================================================
// 05. REGISTER
// ============================================================

function initRegister() {
  const form =
    byId('register-form');

  if (!form) return;


  const firstNameInput =
    byId(
      'register-first-name'
    );

  const lastNameInput =
    byId(
      'register-last-name'
    );

  const phoneInput =
    byId(
      'register-phone'
    );

  const emailInput =
    byId(
      'register-email'
    );

  const passwordInput =
    byId(
      'register-password'
    );

  const confirmInput =
    byId(
      'register-password-confirm'
    );

  const termsInput =
    byId(
      'register-terms'
    );


  const firstNameError =
    byId(
      'register-first-name-error'
    );

  const lastNameError =
    byId(
      'register-last-name-error'
    );

  const phoneError =
    byId(
      'register-phone-error'
    );

  const emailError =
    byId(
      'register-email-error'
    );

  const passwordError =
    byId(
      'register-password-error'
    );

  const confirmError =
    byId(
      'register-password-confirm-error'
    );

  const termsError =
    byId(
      'register-terms-error'
    );

  const submitButton =
    byId(
      'register-submit'
    );


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const firstName =
        normalizeString(
          firstNameInput?.value
        );

      const lastName =
        normalizeString(
          lastNameInput?.value
        );

      const phone =
        normalizePhone(
          phoneInput?.value
        );

      const email =
        normalizeEmail(
          emailInput?.value
        );

      const password =
        passwordInput?.value || '';

      const passwordConfirm =
        confirmInput?.value || '';

      const termsAccepted =
        Boolean(
          termsInput?.checked
        );


      let valid = true;


      if (
        firstName.length < 2
      ) {
        setFieldError(
          firstNameInput,
          firstNameError,
          'Ad minimum 2 simvol olmalıdır.'
        );

        valid = false;
      }


      if (
        lastName.length < 2
      ) {
        setFieldError(
          lastNameInput,
          lastNameError,
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


      if (
        !validateEmail(email)
      ) {
        setFieldError(
          emailInput,
          emailError,
          'Düzgün e-poçt ünvanı daxil et.'
        );

        valid = false;
      }


      if (
        !validatePassword(password)
      ) {
        setFieldError(
          passwordInput,
          passwordError,
          'Şifrə minimum 6 simvol olmalıdır.'
        );

        valid = false;
      }


      if (
        password !==
        passwordConfirm
      ) {
        setFieldError(
          confirmInput,
          confirmError,
          'Şifrələr eyni deyil.'
        );

        valid = false;
      }


      if (!termsAccepted) {
        if (termsError) {
          termsError.textContent =
            'İstifadə qaydalarını qəbul etməlisən.';

          showElement(
            termsError
          );
        }

        valid = false;
      }


      if (!valid) {
        return;
      }


      setButtonLoading(
        submitButton,
        true,
        {
          loadingText:
            'Hesab yaradılır...',
        }
      );


      try {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signUp({
              email,
              password,

              options: {
                data: {
                  first_name:
                    firstName,

                  last_name:
                    lastName,

                  phone:
                    phone || null,
                },
              },
            });


        if (error) {
          throw error;
        }


        const user =
          data?.user;


        if (!user) {
          throw new Error(
            'İstifadəçi hesabı yaradılmadı.'
          );
        }


        // ----------------------------------------------------
        // Mövcud handle_new_user() trigger profiles sətrini
        // yaradır. Burada yalnız qeydiyyat metadata-sını
        // istifadə edirik.
        //
        // profiles cədvəlində sütunlar trigger tərəfindən
        // yazılırsa ayrıca insert etmirik.
        // ----------------------------------------------------


        if (data.session) {
          notify.success(
            'Hesab uğurla yaradıldı.'
          );

          redirect(
            APP_CONFIG.routes.home
          );

          return;
        }


        notify.success(
          'Qeydiyyat tamamlandı. E-poçtunu təsdiqlə və sonra daxil ol.',
          'Hesab yaradıldı'
        );


        setTimeout(
          () => {
            redirect(
              APP_CONFIG.routes.login
            );
          },
          900
        );
      } catch (error) {
        notify.error(
          getErrorMessage(error)
        );
      } finally {
        setButtonLoading(
          submitButton,
          false
        );
      }
    }
  );
}


// ============================================================
// 06. RESET PASSWORD
// ============================================================

function initResetPassword() {
  const form =
    byId(
      'reset-password-form'
    );

  if (!form) return;


  const emailInput =
    byId(
      'reset-password-email'
    );

  const emailError =
    byId(
      'reset-password-email-error'
    );

  const submitButton =
    byId(
      'reset-password-submit'
    );

  const successState =
    byId(
      'reset-password-success'
    );


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const email =
        normalizeEmail(
          emailInput?.value
        );


      if (
        !validateEmail(email)
      ) {
        setFieldError(
          emailInput,
          emailError,
          'Düzgün e-poçt ünvanı daxil et.'
        );

        return;
      }


      setButtonLoading(
        submitButton,
        true,
        {
          loadingText:
            'Göndərilir...',
        }
      );


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


        hideElement(form);

        showElement(
          successState
        );


        notify.success(
          'Şifrə yeniləmə keçidi göndərildi.'
        );
      } catch (error) {
        notify.error(
          getErrorMessage(error)
        );
      } finally {
        setButtonLoading(
          submitButton,
          false
        );
      }
    }
  );
}


// ============================================================
// 07. UPDATE PASSWORD
// ============================================================

async function initUpdatePassword() {
  const form =
    byId(
      'update-password-form'
    );

  if (!form) return;


  const invalidState =
    byId(
      'update-password-invalid'
    );

  const successState =
    byId(
      'update-password-success'
    );

  const passwordInput =
    byId(
      'update-password-new'
    );

  const confirmInput =
    byId(
      'update-password-confirm'
    );

  const passwordError =
    byId(
      'update-password-new-error'
    );

  const confirmError =
    byId(
      'update-password-confirm-error'
    );

  const submitButton =
    byId(
      'update-password-submit'
    );


  // ---------------------------------------------------------
  // Recovery linkindən gələn Supabase sessiyasını yoxlayırıq.
  // ---------------------------------------------------------

  const session =
    await getSession();


  if (!session) {
    hideElement(form);

    showElement(
      invalidState
    );

    return;
  }


  hideElement(
    invalidState
  );


  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      clearFormErrors(form);


      const password =
        passwordInput?.value || '';

      const confirmation =
        confirmInput?.value || '';


      let valid = true;


      if (
        !validatePassword(password)
      ) {
        setFieldError(
          passwordInput,
          passwordError,
          'Şifrə minimum 6 simvol olmalıdır.'
        );

        valid = false;
      }


      if (
        password !==
        confirmation
      ) {
        setFieldError(
          confirmInput,
          confirmError,
          'Şifrələr eyni deyil.'
        );

        valid = false;
      }


      if (!valid) {
        return;
      }


      setButtonLoading(
        submitButton,
        true,
        {
          loadingText:
            'Yenilənir...',
        }
      );


      try {
        const {
          error,
        } =
          await supabase.auth
            .updateUser({
              password,
            });


        if (error) {
          throw error;
        }


        hideElement(form);

        showElement(
          successState
        );


        notify.success(
          'Yeni şifrə yadda saxlanıldı.'
        );
      } catch (error) {
        notify.error(
          getErrorMessage(error)
        );
      } finally {
        setButtonLoading(
          submitButton,
          false
        );
      }
    }
  );
}


// ============================================================
// 08. ALREADY AUTHENTICATED
// ============================================================

async function handleAuthenticatedPages() {
  if (
    page !== 'login' &&
    page !== 'register'
  ) {
    return false;
  }


  const session =
    await getSession();


  if (!session) {
    return false;
  }


  const identity =
    await getCurrentIdentity();


  if (
    identity?.isStaff
  ) {
    redirect(
      APP_CONFIG.routes.admin
    );

    return true;
  }


  redirect(
    APP_CONFIG.routes.home
  );

  return true;
}


// ============================================================
// 09. AUTH EVENT LISTENER
// ============================================================

function bindAuthEvents() {
  supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {
      if (
        event ===
          'PASSWORD_RECOVERY' &&
        page !==
          'update-password'
      ) {
        redirect(
          APP_CONFIG.routes
            .updatePassword
        );

        return;
      }


      if (
        event ===
          'SIGNED_OUT' &&
        (
          page === 'admin' ||
          page === 'profile'
        )
      ) {
        redirect(
          APP_CONFIG.routes.login
        );
      }


      void session;
    }
  );
}


// ============================================================
// 10. PAGE ROUTER
// ============================================================

async function initPage() {
  initPasswordToggles();

  bindAuthEvents();


  const redirected =
    await handleAuthenticatedPages();


  if (redirected) {
    return;
  }


  switch (page) {
    case 'login':
      initLogin();
      break;


    case 'register':
      initRegister();
      break;


    case 'reset-password':
      initResetPassword();
      break;


    case 'update-password':
      await initUpdatePassword();
      break;


    default:
      break;
  }
}


// ============================================================
// 11. START
// ============================================================

asyncHandler(
  initPage,
  {
    notifyOnError: true,
  }
)();
