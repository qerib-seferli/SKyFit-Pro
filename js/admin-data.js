// SKy Fit Pro — Admin data service
// Supabase yükləmələri və server-side səhifələmə burada mərkəzləşdirilir.

import { supabase, TABLES, RPC, UI_CONFIG } from './config.js';
import { rows, number, notify, getErrorMessage } from './core.js';

export function createAdminDataService({ state, resetListLimit, renderDashboard }) {
  async function loadRemotePage(key, options = {}

  function resetRemotePage(key) {
    const paging = state.remotePaging?.[key];
    if (!paging) return;
    paging.offset = 0;
    paging.hasMore = true;
  }

  async function loadProducts() {
    if (
      state.loading.products
    ) {
      return state.products;
    }

    state.loading.products =
      true;

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.products
          )
          .select(`
            id,
            name,
            description,
            sku,
            image_url,
            category,
            sale_mode,
            stock_unit,
            stock_quantity,
            portion_size,
            retail_price,
            portion_price,
            cost_price,
            low_stock_threshold,
            show_public,
            is_active,
            created_at,
            updated_at,
            created_by,
            updated_by,
            operator_shift_id,

            sale_variants:product_sale_variants (
              id,
              product_id,
              name,
              variant_type,
              stock_deduction,
              price,
              sort_order,
              is_quick_sale,
              is_active,
              created_at,
              updated_at
            )
          `)
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      state.products =
        rows(data);

      return state.products;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Products:',
        error
      );

      state.products =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Məhsullar yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.products =
        false;
    }
  }

  async function loadMembers() {
    if (
      state.loading.members
    ) {
      return state.members;
    }

    state.loading.members =
      true;

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.profiles
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
          .order(
            'full_name',
            {
              ascending:
                true,
            }
          );

      if (error) {
        throw error;
      }

      state.members =
        rows(data);

      return state.members;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Members:',
        error
      );

      state.members =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Üzvlər yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.members =
        false;
    }
  }

  async function loadMembershipPlans() {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.membershipPlans
          )
          .select(`
            id,
            name,
            price,
            duration_days,
            is_daily,
            is_active,
            created_at
          `)
          .order(
            'is_daily',
            {
              ascending:
                true,
            }
          )
          .order(
            'price',
            {
              ascending:
                true,
            }
          );

      if (error) {
        throw error;
      }

      state.membershipPlans =
        rows(data);

      return state
        .membershipPlans;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Plans:',
        error
      );

      state.membershipPlans =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Üzvlük planları yüklənmədi.'
        )
      );

      return [];
    }
  }

  async function loadMemberships() {
    if (
      state.loading.memberships
    ) {
      return state.memberships;
    }

    state.loading.memberships =
      true;

    try {
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

            member:profiles!memberships_member_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              avatar_url,
              is_active
            ),

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
              role
            ),

            updated_by_profile:profiles!memberships_updated_by_fkey (
              id,
              full_name,
              role
            )
          `)
          .order(
            'end_date',
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      state.memberships =
        rows(data);

      return state.memberships;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Memberships:',
        error
      );

      state.memberships =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Üzvlüklər yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.memberships =
        false;
    }
  }

  async function loadAttendance() {
    if (
      state.loading.attendance
    ) {
      return state.attendance;
    }

    state.loading.attendance =
      true;

    try {
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

            member:profiles!attendance_member_id_fkey (
              id,
              full_name,
              email,
              phone,
              role,
              avatar_url
            ),

            operator:profiles!attendance_created_by_fkey (
              id,
              full_name,
              role
            )
          `)
          .order(
            'checked_in_at',
            {
              ascending:
                false,
            }
          )
          .limit(1000);

      if (error) {
        throw error;
      }

      state.attendance =
        rows(data);

      return state.attendance;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Attendance:',
        error
      );

      state.attendance =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Giriş tarixçəsi yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.attendance =
        false;
    }
  }

  async function loadDebts() {
    if (
      state.loading.debts
    ) {
      return state.debts;
    }

    state.loading.debts =
      true;

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.debtAccounts
          )
          .select(`
            member_id,
            balance,
            updated_at,

            member:profiles (
              id,
              full_name,
              email,
              phone,
              avatar_url,
              is_active
            )
          `)
          .order(
            'balance',
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      state.debts =
        rows(data);

      return state.debts;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Debts:',
        error
      );

      state.debts =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Borc hesabları yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.debts =
        false;
    }
  }

  async function loadDebtTransactions(options = {}

  async function loadLedger(options = {}

  async function loadStockMovements(options = {}

  async function loadSales() {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.sales
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          )
          .limit(1000);

      if (error) {
        throw error;
      }

      state.sales =
        rows(data);

      return state.sales;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Sales:',
        error
      );

      state.sales =
        [];

      return [];
    }
  }

  async function loadSaleItems() {
    try {
      const { data, error } = await supabase
        .from(TABLES.saleItems)
        .select('id,sale_id,product_id,product_name,quantity,sale_variant_name,line_total,created_at')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      state.saleItems = rows(data);
      return state.saleItems;
    } catch (error) {
      console.error('[SKy Fit Admin] Sale items:', error);
      state.saleItems = [];
      return [];
    }
  }

  async function loadExpenseCategories() {
    try {
      const { data, error } = await supabase
        .from(TABLES.expenseCategories)
        .select('id,name,category_group,sort_order,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      state.expenseCategories = rows(data);
      return state.expenseCategories;
    } catch (error) {
      console.error('[SKy Fit Kassa] Xərc kateqoriyaları:', error);
      state.expenseCategories = [];
      return [];
    }
  }

  async function loadIncomeCategories() {
    try {
      const { data, error } = await supabase
        .from(TABLES.incomeCategories)
        .select('id,name,sort_order,is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      state.incomeCategories = rows(data);
      return state.incomeCategories;
    } catch (error) {
      console.error('[SKy Fit Kassa] Mədaxil kateqoriyaları:', error);
      state.incomeCategories = [];
      return [];
    }
  }

  async function loadCashRegisterEntries(options = {}

  async function loadTrainers() {
    if (
      state.loading.trainers
    ) {
      return state.trainers;
    }

    state.loading.trainers =
      true;

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            TABLES.trainers
          )
          .select('*')
          .order(
            'sort_order',
            {
              ascending:
                true,
            }
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          );

      if (error) {
        throw error;
      }

      state.trainers =
        rows(data);

      return state.trainers;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Trainers:',
        error
      );

      state.trainers =
        [];

      notify.error(
        getErrorMessage(
          error,
          'Məşqçilər yüklənmədi.'
        )
      );

      return [];
    } finally {
      state.loading.trainers =
        false;
    }
  }

  async function loadHistory(options = {}

  async function loadDashboard() {
    if (
      state.loading.dashboard
    ) {
      return;
    }

    state.loading.dashboard =
      true;

    try {
      await Promise.all([
        loadSales(),
        loadMemberships(),
        loadAttendance(),
        loadDebts(),
        loadLedger(),
        loadProducts(),
        loadHistory({
          limit:
            50,
        }),
      ]);

      renderDashboard();

      state.dashboard.loaded =
        true;
    } catch (error) {
      console.error(
        '[SKy Fit Admin] Dashboard:',
        error
      );

      notify.error(
        getErrorMessage(
          error,
          'Dashboard yüklənmədi.'
        )
      );
    } finally {
      state.loading.dashboard =
        false;
    }
  }

  return {
    loadRemotePage,
    resetRemotePage,
    loadProducts,
    loadMembers,
    loadMembershipPlans,
    loadMemberships,
    loadAttendance,
    loadDebts,
    loadDebtTransactions,
    loadLedger,
    loadStockMovements,
    loadSales,
    loadSaleItems,
    loadExpenseCategories,
    loadIncomeCategories,
    loadCashRegisterEntries,
    loadTrainers,
    loadHistory,
    loadDashboard,
  };
}
