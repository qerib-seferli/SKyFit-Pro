// SKy Fit Pro — Admin auth və əməliyyat event bridge
import { APP_CONFIG } from './config.js';
import { SKYFIT_EVENTS, getCurrentIdentity, normalizeString } from './core.js';

export function bindAdminRuntimeEvents({
  state, operationEventName, renderOperator, loadProducts, loadSales, loadSaleItems,
  loadLedger, loadCashRegisterEntries, loadDebts, loadDebtTransactions,
  renderPosProducts, renderFinance, renderDebts, loadDashboard,
}) {
  window.addEventListener(SKYFIT_EVENTS.authChange, async event => {
    const authEvent = normalizeString(event.detail?.event);
    if (authEvent === 'SIGNED_OUT') {
      window.location.replace(APP_CONFIG.routes.login);
      return;
    }
    try {
      const identity = event.detail?.identity || await getCurrentIdentity({ force: true });
      if (!identity?.authenticated) {
        window.location.replace(APP_CONFIG.routes.login);
        return;
      }
      if (!identity.isStaff) {
        window.location.replace(APP_CONFIG.routes.home);
        return;
      }
      state.identity = identity;
      renderOperator();
    } catch (error) {
      console.error('[SKy Fit Admin] Auth change:', error);
    }
  });

  window.addEventListener(operationEventName, async event => {
    const type = normalizeString(event.detail?.type);
    if (type === 'sale_reversal') {
      await Promise.all([
        loadProducts(), loadSales(), loadSaleItems(), loadLedger(),
        loadCashRegisterEntries(), loadDebts(), loadDebtTransactions(),
      ]);
      if (state.activeTab === 'pos') renderPosProducts();
      if (state.activeTab === 'finance') renderFinance();
      if (state.activeTab === 'debts') renderDebts();
    }
    if (type === 'payroll' && state.activeTab === 'finance') {
      await Promise.all([loadLedger(), loadCashRegisterEntries()]);
      renderFinance();
    }
    if (state.activeTab === 'dashboard') await loadDashboard();
  });
}
