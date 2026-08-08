// ============================================================
// SKY FIT PRO
// Authentication Controller
// File: js/auth.js
//
// PART 1 / 2
//
// Pages:
// - login.html
// - register.html
// - reset-password.html
// - update-password.html
//
// Supabase Auth + profiles backend
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

  notify,
  getErrorMessage,

  asyncHandler,
} from './core.js';

import {
  initLayout,
} from './layout.js';


// ============================================================
// 01. STATE
// ============================================================

const state = {

  page:
    normalizeString(
      document.body
        ?.dataset
        ?.page
    ),

  busy:
    false,

  recoverySessionReady:
    false,
};


// ============================================================
// 02. AUTH PAGES
// ============================================================

const AUTH_PAGES =
  new Set([
    'login',
    'register',
    'reset-password',
    'update-password',
  ]);


// ============================================================
// 03. CURRENT PAGE
// ============================================================

function currentPage() {
  return state.page;
}


// ============================================================
// 04. REDIRECT TARGET
//
// Məsələn:
// login.html?next=admin.html
//
// Yalnız layihə daxilində relative page qəbul edilir.
// Xarici URL qəbul edilmir.
// ============================================================

function getNextRoute() {
  const params =
    new URLSearchParams(
      window.location.search
    );


  const next =
    normalizeString(
      params.get(
        'next'
      )
    );


  if (!next) {
    return '';
  }


  if (
    next.includes(
      '://'
    ) ||
    next.startsWith(
      '//'
    ) ||
    next.startsWith(
      'javascript:'
    )
  ) {
    return '';
  }


  return next;
}


// ============================================================
// 05. AUTHENTICATED REDIRECT
// ============================================================

async function redirectAuthenticatedUser() {
  if (
    currentPage() ===
    'update-password'
  ) {
    return false;
  }


  try {
    const identity =
      await getCurrentIdentity();


    if (
      !identity
        ?.authenticated
    ) {
      return false;
    }


    const next =
      getNextRoute();


    if (next) {
      window.location.replace(
        next
      );

      return true;
    }


    if (
      identity.isStaff
    ) {
      window.location.replace(
        APP_CONFIG.routes.admin
      );
    } else {
      window.location.replace(
        APP_CONFIG.routes.home
      );
    }


    return true;
  } catch (error) {
    console.error(
      '[SKy Fit Auth] Existing session:',
      error
    );


    return false;
  }
}


// ============================================================
// 06. PASSWORD TOGGLE BINDING
// ============================================================

function bindPasswordToggles() {
  document
    .querySelectorAll(
      '[data-password-toggle]'
    )
    .forEach(
      button => {
        const inputId =
          normalizeString(
            button.dataset
              .passwordToggle
          );


        if (!inputId) {
          return;
        }


        const input =
          byId(
            inputId
          );


        if (!input) {
          return;
        }


        bindPasswordToggle(
          button,
          input
        );
      }
    );
}


// ============================================================
// 07. LOGIN DOM
// ============================================================

function getLoginElements() {
  return {

    form:
      byId(
        'login-form'
      ),

    email:
      byId(
        'login-email'
      ),

    emailError:
      byId(
        'login-email-error'
      ),

    password:
      byId(
        'login-password'
      ),

    passwordError:
      byId(
        'login-password-error'
      ),

    submit:
      byId(
        'login-submit'
      ),
  };
}


// ============================================================
// 08. LOGIN
// ============================================================

function bindLogin() {
  const elements =
    getLoginElements();


  if (
    !elements.form
  ) {
    return;
  }


  elements.form
    .addEventListener(
      'submit',
      async event => {
        event.preventDefault();


        if (
          state.busy
        ) {
          return;
        }


        clearFormErrors(
          elements.form
        );


        const email =
          normalizeString(
            elements.email
              ?.value
          )
            .toLowerCase();


        const password =
          elements.password
            ?.value ||
          '';


        let valid =
          true;


        if (
          !validateEmail(
            email
          )
        ) {
          setFieldError(
            elements.email,
            elements.emailError,
            'E-poçt ünvanını düzgün daxil et.'
          );


          valid =
            false;
        }


        if (
          !password
        ) {
          setFieldError(
            elements.password,
            elements.passwordError,
            'Şifrəni daxil et.'
          );


          valid =
            false;
        }


        if (!valid) {
          return;
        }


        state.busy =
          true;


        setButtonLoading(
          elements.submit,
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
            await supabase
              .auth
              .signInWithPassword({
                email,
                password,
              });


          if (error) {
            throw error;
          }


          if (
            !data?.user
          ) {
            throw new Error(
              'Sessiya yaradılmadı.'
            );
          }


          clearIdentityCache();


          const identity =
            await getCurrentIdentity({
              force:
                true,
            });


          if (
            identity
              ?.profile &&
            identity.profile
              .is_active ===
              false
          ) {
            await supabase
              .auth
              .signOut();


            clearIdentityCache();


            notify.error(
              'Hesab deaktiv edilib. Administrasiya ilə əlaqə saxla.'
            );


            return;
          }


          notify.success(
            'Xoş gəldin.'
          );


          const next =
            getNextRoute();


          setTimeout(
            () => {
              if (next) {
                window.location.replace(
                  next
                );

                return;
              }


              window.location.replace(
                identity
                  ?.isStaff
                  ? APP_CONFIG
                      .routes
                      .admin
                  : APP_CONFIG
                      .routes
                      .home
              );
            },
            180
          );
        } catch (error) {
          console.error(
            '[SKy Fit Auth] Login:',
            error
          );


          notify.error(
            loginErrorMessage(
              error
            )
          );
        } finally {
          state.busy =
            false;


          setButtonLoading(
            elements.submit,
            false
          );
        }
      }
    );
}


// ============================================================
// 09. LOGIN ERROR MESSAGE
// ============================================================

function loginErrorMessage(
  error
) {
  const message =
    normalizeString(
      error?.message
    ).toLowerCase();


  if (
    message.includes(
      'invalid login credentials'
    )
  ) {
    return (
      'E-poçt və ya şifrə düzgün deyil.'
    );
  }


  if (
    message.includes(
      'email not confirmed'
    )
  ) {
    return (
      'E-poçt ünvanı hələ təsdiqlənməyib.'
    );
  }


  if (
    message.includes(
      'too many requests'
    )
  ) {
    return (
      'Çox sayda cəhd edildi. Bir qədər sonra yenidən yoxla.'
    );
  }


  return getErrorMessage(
    error,
    'Daxil olmaq mümkün olmadı.'
  );
}


// ============================================================
// 10. REGISTER DOM
// ============================================================

function getRegisterElements() {
  return {

    form:
      byId(
        'register-form'
      ),

    fullName:
      byId(
        'register-full-name'
      ),

    fullNameError:
      byId(
        'register-full-name-error'
      ),

    email:
      byId(
        'register-email'
      ),

    emailError:
      byId(
        'register-email-error'
      ),

    phone:
      byId(
        'register-phone'
      ),

    phoneError:
      byId(
        'register-phone-error'
      ),

    password:
      byId(
        'register-password'
      ),

    passwordError:
      byId(
        'register-password-error'
      ),

    passwordConfirm:
      byId(
        'register-password-confirm'
      ),

    passwordConfirmError:
      byId(
        'register-password-confirm-error'
      ),

    terms:
      byId(
        'register-terms'
      ),

    termsError:
      byId(
        'register-terms-error'
      ),

    submit:
      byId(
        'register-submit'
      ),
  };
}


// ============================================================
// 11. REGISTER
//
// handle_new_user() trigger backenddə:
// auth.users -> public.profiles
//
// full_name/email/phone metadata-dan profile-a yazılır.
// ============================================================

function bindRegister() {
  const elements =
    getRegisterElements();


  if (
    !elements.form
  ) {
    return;
  }


  elements.form
    .addEventListener(
      'submit',
      async event => {
        event.preventDefault();


        if (
          state.busy
        ) {
          return;
        }


        clearFormErrors(
          elements.form
        );


        const fullName =
          normalizeString(
            elements
              .fullName
              ?.value
          );


        const email =
          normalizeString(
            elements
              .email
              ?.value
          )
            .toLowerCase();


        const phone =
          normalizeString(
            elements
              .phone
              ?.value
          );


        const password =
          elements
            .password
            ?.value ||
          '';


        const passwordConfirm =
          elements
            .passwordConfirm
            ?.value ||
          '';


        const acceptedTerms =
          Boolean(
            elements
              .terms
              ?.checked
          );


        let valid =
          true;


        // ----------------------------------------------------
        // Name
        // ----------------------------------------------------

        if (
          fullName.length < 3
        ) {
          setFieldError(
            elements.fullName,
            elements
              .fullNameError,
            'Ad və soyad minimum 3 simvol olmalıdır.'
          );


          valid =
            false;
        }


        // ----------------------------------------------------
        // Email
        // ----------------------------------------------------

        if (
          !validateEmail(
            email
          )
        ) {
          setFieldError(
            elements.email,
            elements.emailError,
            'E-poçt ünvanını düzgün daxil et.'
          );


          valid =
            false;
        }


        // ----------------------------------------------------
        // Phone
        // ----------------------------------------------------

        if (
          phone &&
          !validatePhone(
            phone
          )
        ) {
          setFieldError(
            elements.phone,
            elements.phoneError,
            'Telefon nömrəsi düzgün deyil.'
          );


          valid =
            false;
        }


        // ----------------------------------------------------
        // Password
        // ----------------------------------------------------

        if (
          !validatePassword(
            password,
            {
              minLength:
                8,
            }
          )
        ) {
          setFieldError(
            elements.password,
            elements
              .passwordError,
            'Şifrə minimum 8 simvol olmalıdır.'
          );


          valid =
            false;
        }


        // ----------------------------------------------------
        // Confirm
        // ----------------------------------------------------

        if (
          password !==
          passwordConfirm
        ) {
          setFieldError(
            elements
              .passwordConfirm,
            elements
              .passwordConfirmError,
            'Şifrələr eyni deyil.'
          );


          valid =
            false;
        }


        // ----------------------------------------------------
        // Terms
        // ----------------------------------------------------

        if (
          !acceptedTerms
        ) {
          if (
            elements
              .termsError
          ) {
            elements
              .termsError
              .textContent =
                'Qaydaları qəbul etməlisən.';


            elements
              .termsError
              .hidden =
                false;


            elements
              .termsError
              .classList
              .remove(
                'is-hidden'
              );
          }


          valid =
            false;
        }


        if (!valid) {
          return;
        }


        state.busy =
          true;


        setButtonLoading(
          elements.submit,
          true,
          {
            loadingText:
              'Hesab yaradılır...',
          }
        );


        try {
          const emailRedirectTo =
            new URL(
              APP_CONFIG
                .routes
                .login,
              window.location.href
            ).href;


          const {
            data,
            error,
          } =
            await supabase
              .auth
              .signUp({
                email,
                password,

                options: {

                  emailRedirectTo,

                  data: {
                    full_name:
                      fullName,

                    phone:
                      phone ||
                      null,
                  },
                },
              });


          if (error) {
            throw error;
          }


          if (
            data?.session
          ) {
            clearIdentityCache();


            notify.success(
              'Hesab yaradıldı.'
            );


            setTimeout(
              () => {
                window.location.replace(
                  APP_CONFIG
                    .routes
                    .home
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


          setTimeout(
            () => {
              window.location.href =
                APP_CONFIG
                  .routes
                  .login;
            },
            1200
          );
        } catch (error) {
          console.error(
            '[SKy Fit Auth] Register:',
            error
          );


          notify.error(
            registerErrorMessage(
              error
            )
          );
        } finally {
          state.busy =
            false;


          setButtonLoading(
            elements.submit,
            false
          );
        }
      }
    );
}


// ============================================================
// 12. REGISTER ERROR
// ============================================================

function registerErrorMessage(
  error
) {
  const message =
    normalizeString(
      error?.message
    ).toLowerCase();


  if (
    message.includes(
      'already registered'
    ) ||
    message.includes(
      'user already registered'
    )
  ) {
    return (
      'Bu e-poçt ünvanı ilə artıq hesab mövcuddur.'
    );
  }


  if (
    message.includes(
      'password'
    ) &&
    message.includes(
      'weak'
    )
  ) {
    return (
      'Daha güclü şifrə seç.'
    );
  }


  return getErrorMessage(
    error,
    'Qeydiyyat tamamlanmadı.'
  );
}


// ============================================================
// 13. RESET PASSWORD DOM
// ============================================================

function getResetElements() {
  return {

    form:
      byId(
        'reset-password-form'
      ),

    email:
      byId(
        'reset-password-email'
      ),

    emailError:
      byId(
        'reset-password-email-error'
      ),

    submit:
      byId(
        'reset-password-submit'
      ),

    success:
      byId(
        'reset-password-success'
      ),
  };
}


// ============================================================
// 14. RESET PASSWORD
// ============================================================

function bindResetPassword() {
  const elements =
    getResetElements();


  if (
    !elements.form
  ) {
    return;
  }


  elements.form
    .addEventListener(
      'submit',
      async event => {
        event.preventDefault();


        if (
          state.busy
        ) {
          return;
        }


        clearFormErrors(
          elements.form
        );


        const email =
          normalizeString(
            elements.email
              ?.value
          )
            .toLowerCase();


        if (
          !validateEmail(
            email
          )
        ) {
          setFieldError(
            elements.email,
            elements.emailError,
            'E-poçt ünvanını düzgün daxil et.'
          );


          return;
        }


        state.busy =
          true;


        setButtonLoading(
          elements.submit,
          true,
          {
            loadingText:
              'Göndərilir...',
          }
        );


        try {
          const redirectTo =
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
                  redirectTo,
                }
              );


          if (error) {
            throw error;
          }


          if (
            elements.success
          ) {
            elements.success
              .hidden =
                false;


            elements.success
              .classList
              .remove(
                'is-hidden'
              );
          }


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
          state.busy =
            false;


          setButtonLoading(
            elements.submit,
            false
          );
        }
      }
    );
}


// ============================================================

// ============================================================
// 15. UPDATE PASSWORD DOM
// ============================================================

function getUpdatePasswordElements() {
  return {

    form:
      byId(
        'update-password-form'
      ),

    password:
      byId(
        'update-password-new'
      ),

    passwordError:
      byId(
        'update-password-new-error'
      ),

    passwordConfirm:
      byId(
        'update-password-confirm'
      ),

    passwordConfirmError:
      byId(
        'update-password-confirm-error'
      ),

    submit:
      byId(
        'update-password-submit'
      ),

    invalidState:
      byId(
        'update-password-invalid'
      ),

    readyState:
      byId(
        'update-password-ready'
      ),
  };
}


// ============================================================
// 16. RECOVERY STATE
// ============================================================

function setRecoveryState(
  ready
) {
  state.recoverySessionReady =
    Boolean(ready);


  const elements =
    getUpdatePasswordElements();


  if (
    elements.readyState
  ) {
    elements.readyState.hidden =
      !ready;


    elements.readyState
      .classList
      .toggle(
        'is-hidden',
        !ready
      );
  }


  if (
    elements.invalidState
  ) {
    elements.invalidState.hidden =
      ready;


    elements.invalidState
      .classList
      .toggle(
        'is-hidden',
        ready
      );
  }
}


// ============================================================
// 17. HANDLE RECOVERY SESSION
// ============================================================

async function detectRecoverySession() {
  if (
    currentPage() !==
    'update-password'
  ) {
    return;
  }


  try {
    const {
      data,
      error,
    } =
      await supabase.auth
        .getSession();


    if (error) {
      throw error;
    }


    const hasSession =
      Boolean(
        data?.session
      );


    if (hasSession) {
      setRecoveryState(
        true
      );

      return;
    }


    // URL hash/query içində recovery token varsa,
    // Supabase client onu auth state event-də session-a çevirə bilər.
    setRecoveryState(
      false
    );
  } catch (error) {
    console.error(
      '[SKy Fit Auth] Recovery session:',
      error
    );


    setRecoveryState(
      false
    );
  }
}


// ============================================================
// 18. PASSWORD RECOVERY AUTH EVENT
// ============================================================

function bindRecoveryAuthEvent() {
  supabase.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {
        if (
          currentPage() !==
          'update-password'
        ) {
          return;
        }


        if (
          event ===
          'PASSWORD_RECOVERY'
        ) {
          setRecoveryState(
            Boolean(session)
          );
        }
      }
    );
}


// ============================================================
// 19. UPDATE PASSWORD
// ============================================================

function bindUpdatePassword() {
  const elements =
    getUpdatePasswordElements();


  if (
    !elements.form
  ) {
    return;
  }


  elements.form
    .addEventListener(
      'submit',
      async event => {
        event.preventDefault();


        if (
          state.busy
        ) {
          return;
        }


        if (
          !state
            .recoverySessionReady
        ) {
          notify.error(
            'Şifrə yeniləmə sessiyası aktiv deyil. Yeni keçid tələb et.'
          );

          return;
        }


        clearFormErrors(
          elements.form
        );


        const password =
          elements.password
            ?.value ||
          '';


        const passwordConfirm =
          elements
            .passwordConfirm
            ?.value ||
          '';


        let valid =
          true;


        if (
          !validatePassword(
            password,
            {
              minLength:
                8,
            }
          )
        ) {
          setFieldError(
            elements.password,
            elements
              .passwordError,
            'Yeni şifrə minimum 8 simvol olmalıdır.'
          );


          valid =
            false;
        }


        if (
          password !==
          passwordConfirm
        ) {
          setFieldError(
            elements
              .passwordConfirm,
            elements
              .passwordConfirmError,
            'Şifrələr eyni deyil.'
          );


          valid =
            false;
        }


        if (!valid) {
          return;
        }


        state.busy =
          true;


        setButtonLoading(
          elements.submit,
          true,
          {
            loadingText:
              'Şifrə yenilənir...',
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


          notify.success(
            'Şifrə uğurla yeniləndi.'
          );


          setTimeout(
            async () => {
              try {
                await supabase
                  .auth
                  .signOut();
              } catch {
                // ignore
              }


              clearIdentityCache();


              window.location.replace(
                APP_CONFIG
                  .routes
                  .login
              );
            },
            500
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
          state.busy =
            false;


          setButtonLoading(
            elements.submit,
            false
          );
        }
      }
    );
}


// ============================================================
// 20. AUTH PAGE LINKS
// ============================================================

function bindAuthLinks() {
  byId(
    'auth-go-login'
  )?.addEventListener(
    'click',
    event => {
      event.preventDefault();


      window.location.href =
        APP_CONFIG
          .routes
          .login;
    }
  );


  byId(
    'auth-go-register'
  )?.addEventListener(
    'click',
    event => {
      event.preventDefault();


      window.location.href =
        APP_CONFIG
          .routes
          .register;
    }
  );


  byId(
    'auth-go-reset'
  )?.addEventListener(
    'click',
    event => {
      event.preventDefault();


      window.location.href =
        APP_CONFIG
          .routes
          .resetPassword;
    }
  );
}


// ============================================================
// 21. CLEAR TERMS ERROR ON CHANGE
// ============================================================

function bindTermsChange() {
  const terms =
    byId(
      'register-terms'
    );


  const error =
    byId(
      'register-terms-error'
    );


  terms?.addEventListener(
    'change',
    () => {
      if (
        !error ||
        !terms.checked
      ) {
        return;
      }


      error.textContent =
        '';


      error.hidden =
        true;


      error.classList.add(
        'is-hidden'
      );
    }
  );
}


// ============================================================
// 22. SUBMIT ON ENTER
//
// Browser form submit özü bunu edir.
// Burada ayrıca keydown override etmirik.
// Mobile keyboard davranışı qorunur.
// ============================================================


// ============================================================
// 23. PAGE-SPECIFIC INIT
// ============================================================

function bindCurrentPage() {
  switch (
    currentPage()
  ) {
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
      bindUpdatePassword();
      bindRecoveryAuthEvent();
      break;


    default:
      break;
  }
}


// ============================================================
// 24. AUTH UI READY
// ============================================================

function markAuthReady() {
  document
    .documentElement
    .classList
    .add(
      'auth-page-ready'
    );
}


// ============================================================
// 25. INIT
// ============================================================

async function init() {
  if (
    !AUTH_PAGES.has(
      currentPage()
    )
  ) {
    return;
  }


  try {
    await initLayout();


    bindPasswordToggles();

    bindAuthLinks();

    bindCurrentPage();


    if (
      currentPage() ===
      'update-password'
    ) {
      await detectRecoverySession();
    } else {
      const redirected =
        await redirectAuthenticatedUser();


      if (redirected) {
        return;
      }
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


// ============================================================
// 26. START
// ============================================================

asyncHandler(
  init,
  {
    notifyOnError:
      true,
  }
)();


// ============================================================
// SKY FIT PRO AUTH.JS COMPLETE
// ============================================================
