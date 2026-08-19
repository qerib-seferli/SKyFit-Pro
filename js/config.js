// SKy Fit Pro
// Senior Full Stack Developer: Qərib Səfərli

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase
export const SUPABASE_URL = 'https://elpwornsvnplyzyufqir.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscHdvcm5zdm5wbHl6eXVmcWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mjc0NjgsImV4cCI6MjEwMTQwMzQ2OH0.9kxI4ZwUEJjwzVOweZowdAdlkAk9tUZ9rg7Yf7CnJJo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'skyfit-pro-auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'skyfit-pro-web',
    },
  },
});

// Tətbiq
export const APP_CONFIG = Object.freeze({
  name: 'SKy Fit Pro',
  shortName: 'SKy Fit',
  version: '1.6.0',
  developer: 'Qərib Səfərli',
  developerTitle: 'Senior Full Stack Developer',
  locale: 'az-AZ',
  currency: 'AZN',
  defaultTheme: 'system',
  routes: Object.freeze({
    home: './index.html',
    login: './login.html',
    register: './register.html',
    profile: './profile.html',
    admin: './admin.html',
    favorites: './favorites.html',
    resetPassword: './reset-password.html',
    updatePassword: './update-password.html',
  }),
  storage: Object.freeze({
    avatars: 'avatars',
    productImages: 'product-images',
    trainerImages: 'trainer-images',
  }),
});

// Rollar
export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
  MEMBER: 'member',
});

// Ödəniş statusları
export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  DEBT: 'debt',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

// Mövcud satış formaları — köhnə məhsullar üçün compatibility saxlanılır.
export const SALE_MODES = Object.freeze({
  UNIT: 'unit',
  PORTION: 'portion',
});

// Yeni çevik satış variantlarının vahid tipləri.
export const SALE_VARIANT_TYPES = Object.freeze({
  UNIT: 'unit',
  GRAM: 'gram',
  TABLET: 'tablet',
  PORTION: 'portion',
  SCOOP: 'scoop',
  PACK: 'pack',
  CUSTOM: 'custom',
});

// Kassa tipi
export const LEDGER_TYPES = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
});

// İşçi növbəsi
export const STAFF_SHIFT_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
});

// İşçi kassa əməliyyatları
export const STAFF_CASH_TRANSACTION_TYPES = Object.freeze({
  ADVANCE: 'advance',
  REPAYMENT: 'repayment',
  ADJUSTMENT: 'adjustment',
});

// UI
export const UI_CONFIG = Object.freeze({
  toastDuration: 4200,
  debounceDelay: 280,
  modalTransitionDuration: 360,
  loaderMinimumDuration: 180,
  products: Object.freeze({
    homeLimit: 15,
    adminLimit: 500,
    searchLimit: 500,
  }),
  trainers: Object.freeze({
    homeLimit: 10,
    adminLimit: 200,
  }),
  attendance: Object.freeze({
    profileHistoryLimit: 10,
    adminHistoryLimit: 200,
  }),
  history: Object.freeze({
    dashboardLimit: 8,
    adminLimit: 300,
  }),
  lists: Object.freeze({
    pageSize: 50,
    scrollThreshold: 96,
  }),
});

// localStorage
export const STORAGE_KEYS = Object.freeze({
  theme: 'skyfit-pro-theme',
  favorites: 'skyfit-pro-favorites',
  lastAdminTab: 'skyfit-pro-admin-tab',
});

// Supabase RPC
export const RPC = Object.freeze({
  processSale: 'process_sale',
  processSaleV2: 'process_sale_v2',
  processSaleV3: 'process_sale_v3',
  addStock: 'add_stock',
  addStockV2: 'add_stock_v2',
  addStockV3: 'add_stock_v3',
  adjustStock: 'adjust_stock',
  createMembership: 'create_membership',
  createMembershipV2: 'create_membership_v2',
  refreshMembershipStatuses: 'refresh_membership_statuses',
  payDebt: 'pay_debt',
  payDebtV2: 'pay_debt_v2',
  recordAttendance: 'record_attendance',
  recordAttendanceV2: 'record_attendance_v2',
  checkInMember: 'check_in_member',
  openStaffShift: 'open_staff_shift',
  closeStaffShift: 'close_staff_shift',
  getShiftSummary: 'get_shift_summary',
  getOperatorActivity: 'get_operator_activity',
  takeStaffCashAdvance: 'take_staff_cash_advance',
  takeStaffCashAdvanceV2: 'take_staff_cash_advance_v2',
  repayStaffCashAdvance: 'repay_staff_cash_advance',
  repayStaffCashAdvanceV2: 'repay_staff_cash_advance_v2',
  recordExpenseV2: 'record_expense_v2',
  recordIncomeV1: 'record_income_v1',
  setCashRegisterBalance: 'set_cash_register_balance',
  getCashRegisterBalance: 'get_cash_register_balance',
  deleteProductSafely: 'delete_product_safely',
  recordWalkInEntryV1: 'record_walk_in_entry_v1',
  saveStaffEmploymentV1: 'save_staff_employment_v1',
  settleStaffPayrollV1: 'settle_staff_payroll_v1',
  correctStaffPayrollV1: 'correct_staff_payroll_v1',
  reverseSaleV1: 'reverse_sale_v1',
  getBusinessReportV1: 'get_business_report_v1',
  getAdminFeedV1: 'get_admin_feed_v1',
  getDashboardOverviewV2: 'get_dashboard_overview_v2',
  createManualCustomerV1: 'create_manual_customer_v1',
  upsertLegacyAccessPeopleV1: 'upsert_legacy_access_people_v1',
  linkAccessPersonV1: 'link_access_person_v1',
  unlinkAccessPersonV1: 'unlink_access_person_v1',
  registerAccessBridgeV2: 'access_register_bridge_v2',
  enqueueAccessCommandV2: 'access_enqueue_command_v2',
  cancelAccessCommandV2: 'access_cancel_command_v2',
  upsertLegacyAccessEventsV2: 'upsert_legacy_access_events_v2',
});

// Supabase cədvəlləri
export const TABLES = Object.freeze({
  profiles: 'profiles',
  membershipPlans: 'membership_plans',
  memberships: 'memberships',
  attendance: 'attendance',
  products: 'products',
  productSaleVariants: 'product_sale_variants',
  stockMovements: 'stock_movements',
  sales: 'sales',
  saleItems: 'sale_items',
  debtAccounts: 'debt_accounts',
  debtTransactions: 'debt_transactions',
  ledgerEntries: 'ledger_entries',
  trainers: 'trainers',
  staffShifts: 'staff_shifts',
  staffCashAccounts: 'staff_cash_accounts',
  staffCashTransactions: 'staff_cash_transactions',
  auditLog: 'audit_log',
  expenseCategories: 'expense_categories',
  incomeCategories: 'income_categories',
  cashRegisterEntries: 'cash_register_entries',
  walkInEntries: 'walk_in_entries',
  staffEmployment: 'staff_employment',
  staffPayrolls: 'staff_payrolls',
  saleReversals: 'sale_reversals',
  accessLegacyPeople: 'access_legacy_people',
  accessCards: 'access_cards',
  accessEvents: 'access_events',
  accessDevices: 'access_devices',
  accessCommands: 'access_commands',
  accessSyncRuns: 'access_sync_runs',
});

// Konfiqurasiya yoxlaması
function validateConfiguration() {
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
    throw new Error('SKy Fit Pro: Supabase URL düzgün deyil.');
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 50) {
    throw new Error('SKy Fit Pro: Supabase anon key düzgün deyil.');
  }
}

validateConfiguration();
