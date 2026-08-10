# SKy Fit Pro 1.5.0 — Final production audit

## Statik yoxlamalar

- Bütün JavaScript və Electron faylları syntax check-dən keçir.
- Relative ES module import/export uyğunluğu yoxlanılıb.
- HTML duplicate `id` yoxlaması keçir.
- Bütün local HTML `src`/`href` faylları mövcuddur.
- `manifest.json` və Electron `package.json` JSON yoxlamasından keçir.
- Manifest ikon ölçüləri real PNG ölçüləri ilə uyğundur.
- Maskable ikonlar Android/PWA safe-zone üçün yenidən hazırlanıb.
- Service Worker APP_SHELL bütün cari JS modulları ilə sinxronlaşdırılıb.
- Admin router-də olan bütün tabların real navigation düyməsi və paneli var.
- İşçilər/Maaşlar, Hesabatlar və POS Son satışlar/Qaytarma paneli real UI-a qoşulub.
- Profil səhifəsində istifadə olunmayan giriş statistikası kodu çıxarılıb.
- Frontend ödəniş üsulları Nağd / Kart / Nağd+Kart ilə məhdudlaşdırılıb.

## Production smoke-test checklist

Canlı Supabase sessiyası ilə deploy-dan sonra aşağıdakılar bir dəfə yoxlanmalıdır:

1. Admin login və tab keçidləri.
2. POS: Nağd, Kart, Nağd+Kart.
3. Qram məhsulu: 5/10/20 qram stok çıxışı.
4. Tablet/ədəd və bütöv qab satış variantı.
5. Tez satışın admin paneldə və staff/admin üçün public səhifədə açılması.
6. Günlük giriş xidmətinin satışı.
7. Nağd satışdan KASSA artımı, kart satışında KASSA dəyişməməsi.
8. Nağd məxaric və işçi avansında KASSA azalması.
9. Maaş hesablaşması və avansdan tutulma.
10. Borc satışı və borc ödənişi.
11. Satış qaytarma/ləğv və stokun geri bərpası.
12. Hesabatlarda satış/maya/brüt qazanc.
13. Audit detalında əvvəl/sonra və operator məlumatı.
14. Mobil horizontal/vertical table scroll.
15. PWA install icon və cache refresh.
16. Electron `npm install` + `npm run build:win` build smoke test.

Qeyd: statik audit canlı istifadəçi sessiyası və real Supabase məlumatları ilə brauzer klik-testini əvəz etmir; production deploy-dan sonra bu smoke-test siyahısı icra olunmalıdır.
