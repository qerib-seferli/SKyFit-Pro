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
  version: '1.1.0',
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
  addStock: 'add_stock',
  addStockV2: 'add_stock_v2',
  adjustStock: 'adjust_stock',
  createMembership: 'create_membership',
  refreshMembershipStatuses: 'refresh_membership_statuses',
  payDebt: 'pay_debt',
  recordAttendance: 'record_attendance',
  checkInMember: 'check_in_member',
  openStaffShift: 'open_staff_shift',
  closeStaffShift: 'close_staff_shift',
  getShiftSummary: 'get_shift_summary',
  getOperatorActivity: 'get_operator_activity',
  takeStaffCashAdvance: 'take_staff_cash_advance',
  repayStaffCashAdvance: 'repay_staff_cash_advance',
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
