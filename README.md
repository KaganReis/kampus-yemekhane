# Kampüs Yemekhane — Mobil Uygulama

Öğrencilerin yemekhane sistemini telefondan kullanabilmesi için geliştirilmiş React Native (Expo SDK 58, TypeScript, Expo Router) uygulaması. iOS, Android ve web (önizleme) üzerinde çalışır.

**Canlı demo:** https://kaganreis.github.io/kampus-yemekhane/ — telefon veya bilgisayar tarayıcısında açılır, kurulum gerekmez.

## Çalıştırma

```bash
npm install
npm start          # QR kodu Expo Go ile okutun (iOS / Android)
npm run web        # tarayıcıda önizleme: http://localhost:8081
```

## Demoyu yayınlama

```bash
npm run build:pages   # GitHub Pages için dist-pages/ klasörünü üretir (adres: /kampus-yemekhane/)
npm run build:demo    # tek dosyalık sürüm: dist-demo/ (claude.ai Artifact ve diğer statik sunucular için)
```

`dist-pages/` içeriği `gh-pages` dalına gönderilir; GitHub Pages bu daldan yayın yapar.

**Demo hesap** (sahte backend, `src/data/seed.ts`):

| E-posta | Şifre |
| --- | --- |
| `demo@ogr.universite.edu.tr` | `Yemek2026!` |

## Özellikler ve ekranlar

| Gereksinim | Ekran / dosya |
| --- | --- |
| Üniversite e-postası + şifre ile güvenli giriş | `src/app/login.tsx` — yalnızca `…edu.tr` adresleri kabul edilir, 5 hatalı denemede 5 dk kilit, oturum anahtarı iOS Keychain / Android Keystore'da (`expo-secure-store`), 12 saatte sona erer |
| Bakiye yükleme, harcama geçmişi, kalan bakiye | `src/app/(tabs)/wallet.tsx`, `src/app/topup.tsx` |
| Haftalık menü | `src/app/(tabs)/menu.tsx` — bu hafta / gelecek hafta, kalori bilgisi |
| Bileşen bazlı (çorba/salata) randevu + 15 dk saat dilimi | `src/app/reservation-new.tsx` — öğrenci aralık seçer (Erken/Öğle/Geç), sistem o aralıktaki en az yoğun 15 dakikalık dilimi atar |
| Randevu devretme ilanı / ilan devralma | `src/app/(tabs)/reservations.tsx` — "Randevularım" ve "Devir İlanları" sekmeleri |
| Ücretsiz yemek hakları, dijital biletler, ödül durumu | `src/app/rewards.tsx` — her 10 öğünde 1 ücretsiz hak, Bronz/Gümüş/Altın seviyesi, bilet kodları |
| Şikâyet ve öneri formu | `src/app/feedback.tsx` — kategori, anonim gönderim, durum takibi ve yönetim yanıtı |
| Randevu, bakiye, menü ve bilet bildirimleri | `src/app/notifications.tsx`, `src/app/notification-settings.tsx`, `src/services/pushNotifications.ts` |

## İş kuralları (`src/config.ts`)

- Öğün ücreti 60 ₺; yükleme 20 ₺ – 2.000 ₺ arası.
- Servis 11:30–14:00, 15 dakikalık 10 dilim, dilim başına 40 kişi.
- Aynı gün için randevu 10:00'da kapanır; en fazla 2 hafta ileriye, günde tek randevu.
- İptal ve devir ilanı, saat diliminden 30 dk öncesine kadar yapılabilir; iptalde ücret (bakiye, ücretsiz hak veya bilet) iade edilir.
- Devralan öğrencinin bakiyesinden öğün ücreti düşülür, devreden öğrenciye iade edilir.
- Ödeme yöntemi: bakiye, ücretsiz yemek hakkı veya dijital bilet.
- Bildirimler: randevu oluşturma/iptal/devir, saat diliminden 30 dk önce hatırlatma, bakiye yükleme ve düşük bakiye (eşik ayarlanabilir), haftalık menü, yeni/süresi dolacak bilet ve kazanılan ücretsiz hak. Her tür ayrı ayrı kapatılabilir.

## Mimari

```
src/
  app/            Expo Router ekranları (dosya = ekran)
    (tabs)/       Ana Sayfa, Menü, Randevu, Bakiye, Hesabım
  components/     Ortak arayüz bileşenleri
  services/
    api.ts        Sahte backend: tüm iş kuralları burada; gerçek API'ye geçerken yalnızca bu dosya değişir
    storage.ts    Güvenli depo (oturum) + AsyncStorage (veri)
    pushNotifications.ts  Cihaz bildirimleri (expo-notifications)
  store/          React Context ile uygulama durumu
  data/           Menü rotasyonu ve demo verileri
```

## Gerçek sisteme geçiş için yapılacaklar

- `src/services/api.ts` içindeki fonksiyonları üniversitenin yemekhane servisine yapılan REST çağrılarıyla değiştirin. Giriş, üniversitenin kimlik sağlayıcısı (LDAP / SSO) üzerinden sunucuda doğrulanmalıdır; şifre uygulamada saklanmamalıdır.
- Bakiye yükleme, sanal POS'un 3D Secure sayfasına yönlendirmelidir. Demo sürümde bu adım simüle edilir ve kart bilgisi istenmez.
- Devir ilanlarının diğer öğrencilere anlık ulaşması ve sunucu kaynaklı (push) bildirimler için backend ve Expo push token kaydı gerekir. Şu an bildirimler cihazda yerel olarak üretilir.
- Web önizlemesinde cihaz bildirimleri yoktur, yalnızca uygulama içi bildirim merkezi çalışır.
