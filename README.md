# SKy Fit Pro 1.5.0

Fitness klub üçün Web + PWA + Electron idarəetmə sistemi.

## Əsas modullar

- Dashboard və 14 günlük maliyyə trendi
- Üzvlər və profil preview
- Üzvlük planları və borclu/ödənişli üzvlük
- POS və şəkilli Tez satış
- Qram, tablet, qaşıq/porsiya, ədəd və bütöv qab satış variantları
- Stok, alış, düzəliş və hərəkət tarixçəsi
- Borclar və borc ödənişləri
- KASSA, Mədaxil, Məxaric, Nağd/Kart/Nağd+Kart
- İşçi avansı, maaş, bonus və tutulma
- Təhlükəsiz satış qaytarma/ləğv
- Maya dəyəri və brüt qazanc
- Hesabatlar
- Audit tarixçəsi
- PWA və Electron desktop paketləmə strukturu

## Production deploy

Repo kökünü GitHub Pages-a deploy et. Deploy-dan sonra brauzerdə `Ctrl + F5` et və PWA istifadə olunursa köhnə Service Worker cache-inin yenilənməsinə icazə ver.

Cari frontend versiyası: **1.5.0**.

## Supabase

Incremental SQL-lər `supabase/migrations/` qovluğundadır. Cari production layihədə onlar artıq tətbiq olunub.
