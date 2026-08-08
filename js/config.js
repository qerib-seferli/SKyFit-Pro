// ============================================================
// SKY FIT PRO
// Supabase və tətbiq səviyyəli sabit konfiqurasiya
// File: js/config.js
// ============================================================

import { createClient } from
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';


// ============================================================
// SUPABASE
// ============================================================

export const SUPABASE_URL =
  'https://elpwornsvnplyzyufqir.supabase.co';

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscHdvcm5zdm5wbHl6eXVmcWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mjc0NjgsImV4cCI6MjEwMTQwMzQ2OH0.9kxI4ZwUEJjwzVOweZowdAdlkAk9tUZ9rg7Yf7CnJJo';


// ============================================================
// SUPABASE CLIENT
// Bütün layihə boyu yalnız bu client istifadə olunacaq.
// Başqa faylda ikinci createClient() yaradılmayacaq.
// ============================================================

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
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
  }
);


// ============================================================
// APP META
// ============================================================

export const APP_CONFIG = Object.freeze({
  name: 'SKy Fit Pro',
  shortName: 'SKy Fit',

  version: '1.0.0',

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

    resetPassword:
      './reset-password.html',

    updatePassword:
      './update-password.html',
  }),

  storage: Object.freeze({
    avatars: 'avatars',

    productImages:
      'product-images',

    trainerImages:
      'trainer-images',
  }),
});


// ============================================================
// ROLE CONFIGURATION
// Mövcud Supabase user_role enum ilə uyğun saxlanılır.
// ============================================================

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
  MEMBER: 'member',
});


// ============================================================
// PAYMENT STATUS
// Mövcud backend enum ilə uyğun saxlanılır.
// ============================================================

export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  DEBT: 'debt',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});


// ============================================================
// SALE MODES
// Mövcud sale_mode enum ilə uyğun saxlanılır.
// ============================================================

export const SALE_MODES = Object.freeze({
  UNIT: 'unit',
  PORTION: 'portion',
});


// ============================================================
// LEDGER TYPES
// Mövcud entry_type enum ilə uyğun saxlanılır.
// ============================================================

export const LEDGER_TYPES = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
});


// ============================================================
// UI CONFIGURATION
// ============================================================

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


// ============================================================
// LOCAL STORAGE KEYS
// Bütün localStorage açarları mərkəzləşdirilib.
// ============================================================

export const STORAGE_KEYS = Object.freeze({
  theme: 'skyfit-pro-theme',

  favorites:
    'skyfit-pro-favorites',

  lastAdminTab:
    'skyfit-pro-admin-tab',
});


// ============================================================
// SUPABASE RPC NAMES
// Funksiya adlarını müxtəlif JS fayllarında string kimi
// təkrar yazmamaq üçün mərkəzləşdirilir.
// ============================================================

export const RPC = Object.freeze({
  processSale:
    'process_sale',

  addStock:
    'add_stock',

  createMembership:
    'create_membership',

  payDebt:
    'pay_debt',

  recordAttendance:
    'record_attendance',
});


// ============================================================
// DATABASE TABLE NAMES
// ============================================================

export const TABLES = Object.freeze({
  profiles:
    'profiles',

  products:
    'products',

  trainers:
    'trainers',

  memberships:
    'memberships',

  membershipPlans:
    'membership_plans',

  attendance:
    'attendance',

  sales:
    'sales',

  saleItems:
    'sale_items',

  debtAccounts:
    'debt_accounts',

  debtTransactions:
    'debt_transactions',

  ledgerEntries:
    'ledger_entries',

  stockMovements:
    'stock_movements',
});


// ============================================================
// DEVELOPMENT SAFETY
// Supabase bağlantısının konfiqurasiyasının boş qalmasının
// qarşısını alır.
// ============================================================

function validateConfiguration() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_URL.startsWith('https://')
  ) {
    throw new Error(
      'SKy Fit Pro: Supabase URL düzgün deyil.'
    );
  }

  if (
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.length < 50
  ) {
    throw new Error(
      'SKy Fit Pro: Supabase anon key düzgün deyil.'
    );
  }
}

validateConfiguration();
