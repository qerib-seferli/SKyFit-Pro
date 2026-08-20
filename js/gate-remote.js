// SKy Fit Pro — staff üçün uzaqdan turniket açma FAB
import { supabase, TABLES } from './config.js';
import {
  createElement,
  confirmDialog,
  notify,
  getErrorMessage,
} from './core.js';

let initialized = false;

async function waitForRequest(requestId, timeoutMs = 18000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data, error } = await supabase
      .from(TABLES.accessMobileEntryRequests)
      .select('id,status,reason_code,reason_message,result,completed_at')
      .eq('id', requestId)
      .maybeSingle();

    if (error) throw error;
    if (data && ['approved','denied','failed','expired'].includes(data.status)) return data;
    await new Promise(resolve => setTimeout(resolve, 850));
  }

  return { status: 'expired', reason_code: 'timeout', reason_message: 'Turniket cavab vermədi.' };
}

async function remoteOpen(trigger) {
  const confirmed = await confirmDialog({
    eyebrow: 'Turniket',
    title: 'Turniket açılsın?',
    message: 'Bu əməliyyat admin/staff uzaqdan açılışı kimi tarixçəyə yazılacaq.',
    confirmText: 'Turniketi aç',
    cancelText: 'Ləğv et',
  });
  if (!confirmed) return;

  trigger.disabled = true;
  const old = trigger.innerHTML;
  trigger.innerHTML = '<span class="admin-quick-sale-fab__icon">⌛</span><span class="admin-quick-sale-fab__label">Göndərilir</span>';

  try {
    const { data, error } = await supabase.rpc('access_admin_remote_open_v1', {
      p_gate_key: 'main',
    });
    if (error) throw error;
    if (!data?.ok || !data?.request_id) throw new Error(data?.message || 'Turniket sorğusu yaradılmadı.');

    notify.info('Uzaqdan açma sorğusu zal Bridge-ə göndərildi...');
    const result = await waitForRequest(data.request_id);

    if (result?.status === 'approved') {
      notify.success('Turniket açıldı.');
    } else {
      notify.error(result?.reason_message || 'Turniket açılmadı.');
    }
  } catch (error) {
    notify.error(getErrorMessage(error, 'Turniket uzaqdan açıla bilmədi.'));
  } finally {
    trigger.disabled = false;
    trigger.innerHTML = old;
  }
}

export function initGlobalGateRemote() {
  if (initialized) return;
  initialized = true;

  let button = document.getElementById('global-gate-remote-fab');
  if (button) return;

  button = createElement('button', {
    className: 'admin-quick-sale-fab global-gate-remote-fab',
    attrs: {
      id: 'global-gate-remote-fab',
      type: 'button',
      'aria-label': 'Turniketi uzaqdan aç',
      title: 'Turniketi aç',
    },
  });

  button.innerHTML = `
    <span class="admin-quick-sale-fab__icon" aria-hidden="true">🚪</span>
    <span class="admin-quick-sale-fab__label">Turniketi aç</span>
  `;
  button.addEventListener('click', () => void remoteOpen(button));
  document.body.append(button);
}
