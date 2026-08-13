// SKy Fit Pro — Məşqçilər admin modulu
import { supabase, APP_CONFIG, TABLES, UI_CONFIG } from './config.js';
import {
  $, byId, clearElement, createElement, normalizeString, normalizeSearch, escapeHtml, number,
  debounce, rows, trainerName, trainerSpecialty, trainerImage, openModal, closeModal, notify,
  getErrorMessage, setFieldError, setButtonLoading,
} from './core.js';

export function createAdminTrainersController(ctx) {
  const { state, loadTrainers, loadHistory, createDashboardEmpty } = ctx;

  function filteredTrainers() {
    const search =
      normalizeSearch(
        byId(
          'trainers-admin-search'
        )?.value
      );

    const status =
      normalizeString(
        byId(
          'trainers-status-filter'
        )?.value,
        'all'
      );

    return state.trainers
      .filter(
        trainer => {
          if (!search) {
            return true;
          }

          const text =
            [
              trainer.full_name,
              trainer.specialty,
              trainer.bio,
              trainer.phone,
            ]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase(
                'az-AZ'
              );

          return text.includes(
            search
          );
        }
      )
      .filter(
        trainer => {
          if (
            status ===
            'active'
          ) {
            return (
              trainer.is_active !==
              false
            );
          }

          if (
            status ===
            'inactive'
          ) {
            return (
              trainer.is_active ===
              false
            );
          }

          return true;
        }
      );
  }

  function createAdminTrainerCard(
    trainer
  ) {
    const image =
      trainerImage(
        trainer
      );

    const card =
      createElement(
        'article',
        {
          className:
            'trainer-card admin-trainer-card',

          dataset: {
            trainerId:
              trainer.id,
          },
        }
      );

    card.innerHTML = `
      <button
        type="button"
        class="trainer-card__media admin-trainer-card__main"
      >

        ${
          image
            ? `
              <img
                class="trainer-card__image"
                src="${escapeHtml(
                  image
                )}"
                alt="${escapeHtml(
                  trainerName(
                    trainer
                  )
                )}"
                loading="lazy"
                decoding="async"
              >
            `
            : `
              <span class="trainer-card__image-fallback">
                ${escapeHtml(
                  getTrainerInitials(
                    trainer
                  )
                )}
              </span>
            `
        }

        <div class="trainer-card__content">

          <div class="admin-trainer-card__badges">

            <span class="${
              trainer.is_active !==
                false
                ? 'ui-badge ui-badge--success'
                : 'ui-badge ui-badge--danger'
            }">
              ${
                trainer.is_active !==
                  false
                  ? 'Aktiv'
                  : 'Deaktiv'
              }
            </span>

          </div>

          <strong class="trainer-card__name">
            ${escapeHtml(
              trainerName(
                trainer
              )
            )}
          </strong>

          ${
            trainerSpecialty(
              trainer
            )
              ? `
                <span class="trainer-card__specialty">
                  ${escapeHtml(
                    trainerSpecialty(
                      trainer
                    )
                  )}
                </span>
              `
              : ''
          }

          ${
            trainer.phone
              ? `
                <span class="trainer-card__specialty">
                  ${escapeHtml(
                    trainer.phone
                  )}
                </span>
              `
              : ''
          }

          <span class="trainer-card__action">
            Redaktə et
          </span>

        </div>

      </button>
    `;

    $(
      '.admin-trainer-card__main',
      card
    )?.addEventListener(
      'click',
      () => {
        openTrainerEditor(
          trainer,
          card
        );
      }
    );

    return card;
  }

  function getTrainerInitials(
    trainer
  ) {
    const name =
      trainerName(
        trainer
      );

    const parts =
      name
        .split(' ')
        .filter(Boolean);

    if (
      parts.length === 0
    ) {
      return 'SK';
    }

    if (
      parts.length === 1
    ) {
      return parts[0]
        .slice(
          0,
          2
        )
        .toLocaleUpperCase(
          'az-AZ'
        );
    }

    return (
      parts[0][0] +
      parts[
        parts.length - 1
      ][0]
    ).toLocaleUpperCase(
      'az-AZ'
    );
  }

  function renderAdminTrainers() {
    const root =
      byId(
        'admin-trainers-grid'
      );

    if (!root) {
      return;
    }

    clearElement(
      root
    );

    const trainers =
      filteredTrainers();

    trainers.forEach(
      trainer => {
        root.append(
          createAdminTrainerCard(
            trainer
          )
        );
      }
    );

    if (
      trainers.length ===
      0
    ) {
      root.append(
        createDashboardEmpty(
          'Məşqçi tapılmadı.'
        )
      );
    }
  }

  function openTrainerEditor(
    trainer = null,
    trigger = null
  ) {
    const editing =
      Boolean(trainer);

    const content =
      createElement(
        'form',
        {
          className:
            'modal-form',

          attrs: {
            id:
              'trainer-admin-form',

            novalidate:
              '',
          },
        }
      );

    content.innerHTML = `
      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-name"
        >
          Ad və soyad
        </label>

        <div class="ui-input">

          <input
            id="trainer-admin-name"
            class="ui-input__control"
            type="text"
            maxlength="160"
            value="${escapeHtml(
              trainer
                ?.full_name ||
              ''
            )}"
            placeholder="Məşqçinin adı və soyadı"
          >

        </div>

        <span
          id="trainer-admin-name-error"
          class="ui-field__error is-hidden"
        ></span>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="trainer-admin-specialty"
          >
            İxtisas
          </label>

          <div class="ui-input">

            <input
              id="trainer-admin-specialty"
              class="ui-input__control"
              type="text"
              maxlength="160"
              value="${escapeHtml(
                trainer
                  ?.specialty ||
                ''
              )}"
              placeholder="Fitness, CrossFit..."
            >

          </div>

        </div>

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="trainer-admin-phone"
          >
            Telefon
          </label>

          <div class="ui-input">

            <input
              id="trainer-admin-phone"
              class="ui-input__control"
              type="tel"
              value="${escapeHtml(
                trainer
                  ?.phone ||
                ''
              )}"
              placeholder="+994..."
            >

          </div>

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-instagram"
        >
          Instagram linki
        </label>

        <div class="ui-input">

          <input
            id="trainer-admin-instagram"
            class="ui-input__control"
            type="url"
            value="${escapeHtml(
              trainer
                ?.instagram_url ||
              ''
            )}"
            placeholder="https://instagram.com/..."
          >

        </div>

      </div>

      <div class="ui-field">

        <label
          class="ui-field__label"
          for="trainer-admin-bio"
        >
          Haqqında
        </label>

        <textarea
          id="trainer-admin-bio"
          class="ui-textarea"
          rows="4"
          maxlength="1500"
          placeholder="Məşqçi haqqında qısa məlumat"
        >${escapeHtml(
          trainer?.bio ||
          ''
        )}</textarea>

      </div>

      <div class="modal-form__grid">

        <div class="ui-field">

          <label
            class="ui-field__label"
            for="trainer-admin-sort"
          >
            Sıralama
          </label>

          <div class="ui-input">

            <input
              id="trainer-admin-sort"
              class="ui-input__control"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              value="${number(
                trainer
                  ?.sort_order,
                0
              )}"
            >

          </div>

        </div>

        <div class="ui-field">

          <label class="ui-field__label">
            Status
          </label>

          <label class="ui-check">

            <input
              id="trainer-admin-active"
              type="checkbox"
              ${
                trainer
                  ?.is_active !==
                  false
                  ? 'checked'
                  : ''
              }
            >

            <span>
              Saytda aktiv göstər
            </span>

          </label>

        </div>

      </div>

      <label class="ui-upload">

        <input
          id="trainer-admin-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        >

        <span>

          <strong class="ui-upload__title">
            ${
              editing
                ? 'Məşqçi şəklini dəyiş'
                : 'Məşqçi şəkli'
            }
          </strong>

          <span class="ui-upload__meta">
            PNG, JPG və ya WEBP · maksimum 5 MB
          </span>

        </span>

      </label>

      <button
        id="trainer-admin-submit"
        class="ui-button ui-button--primary ui-button--full"
        type="submit"
      >

        <span class="ui-button__label">
          ${
            editing
              ? 'Yadda saxla'
              : 'Məşqçi əlavə et'
          }
        </span>

        <span
          class="ui-button__spinner is-hidden"
          aria-hidden="true"
        ></span>

      </button>
    `;

    openModal({
      eyebrow:
        'Məşqçilər',

      title:
        editing
          ? 'Məşqçini redaktə et'
          : 'Yeni məşqçi',

      content,

      trigger,

      onOpen:
        () => {
          bindTrainerForm(
            content,
            trainer
          );
        },
    });
  }

  function bindTrainerForm(
    form,
    trainer
  ) {
    const nameInput =
      $(
        '#trainer-admin-name',
        form
      );

    const specialtyInput =
      $(
        '#trainer-admin-specialty',
        form
      );

    const phoneInput =
      $(
        '#trainer-admin-phone',
        form
      );

    const instagramInput =
      $(
        '#trainer-admin-instagram',
        form
      );

    const bioInput =
      $(
        '#trainer-admin-bio',
        form
      );

    const sortInput =
      $(
        '#trainer-admin-sort',
        form
      );

    const activeInput =
      $(
        '#trainer-admin-active',
        form
      );

    const imageInput =
      $(
        '#trainer-admin-image',
        form
      );

    const nameError =
      $(
        '#trainer-admin-name-error',
        form
      );

    const submit =
      $(
        '#trainer-admin-submit',
        form
      );

    form.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        const fullName =
          normalizeString(
            nameInput?.value
          );

        if (
          fullName.length < 2
        ) {
          setFieldError(
            nameInput,
            nameError,
            'Məşqçinin adını daxil et.'
          );

          return;
        }

        const payload = {

          full_name:
            fullName,

          specialty:
            normalizeString(
              specialtyInput
                ?.value
            ) ||
            null,

          phone:
            normalizeString(
              phoneInput
                ?.value
            ) ||
            null,

          instagram_url:
            normalizeString(
              instagramInput
                ?.value
            ) ||
            null,

          bio:
            normalizeString(
              bioInput?.value
            ) ||
            null,

          sort_order:
            Math.max(
              0,
              Math.trunc(
                number(
                  sortInput
                    ?.value,
                  0
                )
              )
            ),

          is_active:
            Boolean(
              activeInput
                ?.checked
            ),
        };

        setButtonLoading(
          submit,
          true,
          {
            loadingText:
              trainer
                ? 'Yadda saxlanılır...'
                : 'Əlavə olunur...',
          }
        );

        try {
          let savedTrainer;

          if (trainer) {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  TABLES.trainers
                )
                .update(
                  payload
                )
                .eq(
                  'id',
                  trainer.id
                )
                .select('*')
                .single();

            if (error) {
              throw error;
            }

            savedTrainer =
              data;
          } else {
            const {
              data,
              error,
            } =
              await supabase
                .from(
                  TABLES.trainers
                )
                .insert(
                  payload
                )
                .select('*')
                .single();

            if (error) {
              throw error;
            }

            savedTrainer =
              data;
          }

          const file =
            imageInput
              ?.files
              ?.[0];

          if (file) {
            savedTrainer =
              await uploadTrainerImage(
                savedTrainer,
                file
              );
          }

          closeModal();

          notify.success(
            trainer
              ? 'Məşqçi yeniləndi.'
              : 'Məşqçi əlavə edildi.'
          );

          await Promise.all([
            loadTrainers(),

            loadHistory({
              limit:
                50,
            }),
          ]);

          renderAdminTrainers();
        } catch (error) {
          console.error(
            '[SKy Fit Admin] Trainer save:',
            error
          );

          notify.error(
            getErrorMessage(
              error,
              'Məşqçi yadda saxlanmadı.'
            )
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

  function validateTrainerImage(
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
        file?.type
      )
    ) {
      throw new Error(
        'Məşqçi şəkli JPG, PNG və ya WEBP olmalıdır.'
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      throw new Error(
        'Məşqçi şəkli maksimum 5 MB ola bilər.'
      );
    }
  }

  function trainerImageExtension(
    file
  ) {
    if (
      file.type ===
      'image/png'
    ) {
      return 'png';
    }

    if (
      file.type ===
      'image/webp'
    ) {
      return 'webp';
    }

    return 'jpg';
  }

  function extractTrainerStoragePath(
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
      return source.replace(
        /^\/+/,
        ''
      );
    }

    try {
      const url =
        new URL(source);

      const marker =
        '/storage/v1/object/public/trainer-images/';

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

  function trainerImagePathBelongsToTrainer(path, trainerId) {
    const safePath = normalizeString(path);
    const safeId = normalizeString(trainerId);

    return Boolean(
      safePath &&
      safeId &&
      safePath.startsWith(`${safeId}/`)
    );
  }

  async function uploadTrainerImage(
    trainer,
    file
  ) {
    validateTrainerImage(
      file
    );

    const oldPath =
      extractTrainerStoragePath(
        trainer.image_url
      );

    const extension =
      trainerImageExtension(
        file
      );

    const path =
      `${trainer.id}/trainer-${Date.now()}.${extension}`;

    const {
      error:
        uploadError,
    } =
      await supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .trainerImages
        )
        .upload(
          path,
          file,
          {
            upsert:
              false,

            cacheControl:
              '3600',

            contentType:
              file.type,
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          TABLES.trainers
        )
        .update({
          image_url:
            path,
        })
        .eq(
          'id',
          trainer.id
        )
        .select('*')
        .single();

    if (error) {
      await supabase
        .storage
        .from(
          APP_CONFIG
            .storage
            .trainerImages
        )
        .remove([
          path,
        ]);

      throw error;
    }

    if (
      trainerImagePathBelongsToTrainer(
        oldPath,
        trainer.id
      ) &&
      oldPath !== path
    ) {
      const { error: cleanupError } =
        await supabase
          .storage
          .from(
            APP_CONFIG
              .storage
              .trainerImages
          )
          .remove([
            oldPath,
          ]);

      if (cleanupError) {
        console.warn(
          '[SKy Fit] Old trainer image cleanup:',
          cleanupError
        );
        notify.warning(
          'Yeni məşqçi şəkli saxlanıldı, köhnə şəkil Storage-dan silinə bilmədi.'
        );
      }
    }

    return data;
  }

  function bindTrainerAdminEvents() {
    byId(
      'trainer-create-button'
    )?.addEventListener(
      'click',
      event => {
        openTrainerEditor(
          null,
          event.currentTarget
        );
      }
    );

    byId(
      'trainers-admin-search'
    )?.addEventListener(
      'input',
      debounce(renderAdminTrainers, UI_CONFIG.debounceDelay)
    );

    byId(
      'trainers-status-filter'
    )?.addEventListener(
      'change',
      renderAdminTrainers
    );
  }

  return {
    render: renderAdminTrainers,
    bind: bindTrainerAdminEvents,
    openEditor: openTrainerEditor,
  };
}
