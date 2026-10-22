# Kampüs Yemekhane — Mobil Uygulama

Öğrencilerin yemekhane sistemini telefondan kullanabilmesi için geliştirilmiş React Native (Expo SDK 58, TypeScript, Expo Router) uygulaması. iOS, Android ve web (önizleme) üzerinde çalışır.

**Canlı demo:** https://kaganreis.github.io/kampus-yemekhane/ — telefon veya bilgisayar tarayıcısında açılır, kurulum gerekmez.

## Çalıştırma

```bash
npm install
npm start          # QR kodu Expo Go ile okutun (iOS / Android)
npm run web        # tarayıcıda önizleme: http://localhost:8081
```

Uygulamayı kullanmak için giriş ekranındaki **Kayıt ol** sekmesinden `…edu.tr` e-postanızla hesap açın. Bakiye, randevu ve bildirimler Firebase'de hesabınıza kaydedilir; hangi cihazdan girerseniz girin aynı görünür.

## Demoyu yayınlama

```bash
npm run build:pages   # GitHub Pages için dist-pages/ klasörünü üretir (adres: /kampus-yemekhane/)
```

`dist-pages/` içeriği `gh-pages` dalına gönderilir; GitHub Pages bu daldan yayın yapar.

## Firebase

- **Authentication:** e-posta/şifre ile giriş.
- **Firestore:** `users/{uid}` (öğrencinin tüm verisi), `market/{id}` (devir ilanları), `feedback/{id}` (yönetim için şikâyet/öneriler).
- **Erişim kuralları:** [`firestore.rules`](firestore.rules) — her öğrenci yalnızca kendi verisini okuyup yazabilir.
- Proje ayarları `src/services/firebaseConfig.ts` içindedir (istemci tarafında herkese açık olması normaldir).
- Kurallar değişince: `npx firebase-tools deploy --only firestore:rules`

**Yerel test (canlı veriye dokunmadan):** Firebase emülatörleri Java 21 gerektirir.

```bash
npm run emulators      # Auth + Firestore emülatörleri (127.0.0.1:9099 / 8080)
npm run web:emulator   # uygulama emülatörlere bağlı açılır
```

Test hesapları: `scripts/emulator-test-users.json`.

## Özellikler ve ekranlar

| Gereksinim | Ekran / dosya |
| --- | --- |
| Üniversite e-postası + şifre ile güvenli giriş | `src/app/login.tsx` — kayıt ve giriş, yalnızca `…edu.tr` adresleri, Firebase Authentication (art arda hatalı denemede geçici engel) |
| Bakiye yükleme, harcama geçmişi, kalan bakiye | `src/app/(tabs)/wallet.tsx`, `src/app/topup.tsx` |
| Haftalık menü | `src/app/(tabs)/menu.tsx` — bu hafta / gelecek hafta, kalori bilgisi |
| Bileşen bazlı randevu + 15 dk saat dilimi | `src/app/reservation-new.tsx` — ana yemek zorunlu, içecek veya tatlıdan biri zorunlu, çorba ve 2. yemek (pilav) isteğe bağlı; öğrenci aralık seçer (Erken/Öğle/Geç), sistem o aralıktaki en az yoğun 15 dakikalık dilimi atar |
| Randevu devretme ilanı / ilan devralma | `src/app/(tabs)/reservations.tsx` — "Randevularım" ve "Devir İlanları" sekmeleri |
| Ücretsiz yemek hakları, dijital biletler, ödül durumu | `src/app/rewards.tsx` — her 10 öğünde 1 ücretsiz hak, Bronz/Gümüş/Altın seviyesi, bilet kodları |
| Şikâyet ve öneri formu | `src/app/feedback.tsx` — kategori, anonim gönderim, durum takibi ve yönetim yanıtı |
| Randevu, bakiye, menü ve bilet bildirimleri | `src/app/notifications.tsx`, `src/app/notification-settings.tsx`, `src/services/pushNotifications.ts` |

## İş kuralları (`src/config.ts`)

- Öğün ücreti 60 ₺; yükleme 20 ₺ – 2.000 ₺ arası.
- Servis 11:30–13:30, 15 dakikalık 8 dilim, dilim başına 40 kişi.
- Tepsi: ana yemek zorunlu; içecek veya tatlıdan biri zorunlu; çorba ve 2. yemek (pilav) isteğe bağlı. Öğün ücreti seçimden bağımsızdır.
- Aynı gün için randevu 10:00'da kapanır; en fazla 2 hafta ileriye, günde tek randevu.
- İptal ve devir ilanı, saat diliminden 30 dk öncesine kadar yapılabilir; iptalde ücret (bakiye, ücretsiz hak veya bilet) iade edilir.
- Devralan öğrencinin bakiyesinden öğün ücreti düşülür; devreden öğrencinin uygulaması ilanın devralındığını görünce ücreti iade eder.
- Ödeme yöntemi: bakiye, ücretsiz yemek hakkı veya dijital bilet.
- Bildirimler: randevu oluşturma/iptal/devir, saat diliminden 30 dk önce hatırlatma, bakiye yükleme ve düşük bakiye (eşik ayarlanabilir), haftalık menü, yeni/süresi dolacak bilet ve kazanılan ücretsiz hak. Her tür ayrı ayrı kapatılabilir.

## Mimari

```
src/
  app/            Expo Router ekranları (dosya = ekran)
    (tabs)/       Ana Sayfa, Menü, Randevu, Bakiye, Hesabım
  components/     Ortak arayüz bileşenleri
  services/
    api.ts        Firebase üzerinde iş kuralları (her işlem bir Firestore transaction'ı)
    firebase.ts   Firebase başlatma (telefonda oturum AsyncStorage ile kalıcı)
    pushNotifications.ts  Cihaz bildirimleri (expo-notifications)
  store/          React Context ile uygulama durumu
  data/           Menü rotasyonu ve yeni hesabın başlangıç verisi
```

## Gerçek sisteme geçiş için yapılacaklar

- Bakiye yükleme şu an simüle edilir ve öğrencinin kendi belgesine yazılır; gerçek ödemede sanal POS'un 3D Secure sayfası ve bakiyeyi yalnızca sunucunun (ör. Cloud Functions) yazdığı bir akış gerekir.
- Üniversite e-postasının gerçekten öğrenciye ait olduğunu doğrulamak için kayıt sonrası e-posta doğrulaması veya üniversitenin SSO'su eklenmelidir.
- Sunucu kaynaklı (push) bildirimler için Expo push token kaydı gerekir; şu an bildirimler cihazda yerel olarak üretilir.
- Web önizlemesinde cihaz bildirimleri yoktur, yalnızca uygulama içi bildirim merkezi çalışır.
