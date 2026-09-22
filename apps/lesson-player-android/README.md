# Lesson Player · Android 16

**Kanonik uzaktan içerik + doğrulanmış çevrimdışı kopya + Kotlin motoru + uyarlanabilir Compose ders yüzeyi.** Kotlin + Jetpack Compose, WebView/Tauri yok.
Minimum Android 16 (`minSdk=36`), `compileSdk=targetSdk=36`.
İlk hedef tablet; portrait/landscape ve değişken pencere genişliği için
native Compose gezinmesi. Mevcut web Lesson Player bu klasörden bağımsızdır.

## Durum

- Açılan native `MainActivity`, tasarım sistemi, sistem açık/koyu teması.
- Kitaplık, örnek ders düzeni, üç öğretmen hattının kabuğu, görünüm ekranı
  ve dört Compose Preview. **Önizleme gerçek ders cevabı değildir.**
- Android Back, API 36 edge-to-edge için Compose safe insets.
- Uygulama açılırken kanonik içerik paketini HTTPS üzerinden denetler ve yeni
  veriyi indirir. Doğrulanmış son içerik cihazda saklanır; ağ yoksa bu kopya,
  ilk açılışta da APK içeriği kullanılır.
- Dört temanın ders kitaplığı, doğrulanmış kaynak başlıkları, kalıcı ders oturumu,
  yedi içerik düzeni ve Android içi sınıf sunumu çalışır.
- Cevap açma, kalıcı ders ilerlemesi ve üç öğretmen takip hattının işaretleri
  çalışır; native düzenleme ve JSON yedekleme henüz yoktur ve Faz 6 kapsamındadır.
  Bu bir release APK değildir.

## Araç zinciri

- JDK 17; Android SDK Platform 36; **Node 24**; Gradle **8.13**;
  Android Gradle Plugin **8.13.2**;
  Kotlin ve Compose Compiler **2.2.20**;
  Compose BOM **2026.03.00**; Activity Compose **1.11.0**.
- Sürüm sabitlemeleri `gradle/libs.versions.toml` içindedir.
- `local.properties` (Android Studio tarafından oluşturulur) ve
  signing anahtarları repoya eklenmez.
- `./gradlew` geçici, denetlenebilir bir Gradle 8.13 başlatıcısıdır:
  ilk kullanımda **resmî Gradle dağıtım ZIP'ini** indirir ve
  Gradle'ın yayımladığı SHA-256 ile doğrulamadan çalıştırmaz.
  `gradle-wrapper.properties` ile sabit hash'in uyumu da denetlenir.
  Bu repo henüz standart ikili `gradle-wrapper.jar` dosyasını içermez.

Android Studio'da **bu klasörü ayrı proje olarak aç**. Öncesinde
JDK 17 ve Android SDK 36 kuruluyken:

```bash
cd apps/lesson-player-android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

Gradle dağıtımı `~/.gradle/lesson-player-bootstrap/` altında
saklanır. İlk kurulum internete ihtiyaç duyar; uygulama daha önce
eşitlenmiş içerikle çevrimdışı ders açabilir.
Android Studio projeyi bağımsız açabilir; standart Gradle wrapper
JAR gerektiren bazı IDE entegrasyonları için standart wrapper'ın
eklenmesi ayrıca izlenir.

## Çalıştırma ve sınama

Android Studio > Run `app` (API 36 emülatör/Android 16 tablet).
Unit: `./gradlew :app:testDebugUnitTest`.
Instrumented Compose smoke: `./gradlew :app:connectedDebugAndroidTest`
(API 36 bağlı emülatör/cihaz gerektirir).
CI debug APK'yı yalnız faz testi için saklar; kullanıcıya release diye sunulmaz.

## İçerik kaynağı ve yayımlama

`data/grade-11/` altındaki kanonik JSON ve `apps/lesson-player/src/teacher-workflow.json`
tek kaynak olmaya devam eder. `Publish Lesson Player content` GitHub Actions iş akışı,
`main` dalındaki bu veriler değişince kanonik doğrulamaları çalıştırır ve üç dosyalı
paketi `remote-content/` altına otomatik yayımlar. Android uygulaması bu herkese açık
paketi her açılışta kontrol eder. **İçerik değişikliği için APK yayımlamak gerekmez.**

Uygulama önce uzak manifestin SHA-256 kimliklerini denetler; değişiklik varsa
`lessons.json` ve `teacher-workflow.json` dosyalarını indirip kapsam, kimlik ve içerik
kontrollerinden geçirir. Paket tek bir atomik yerel önbellek olarak saklanır. İndirme
başarısızsa uygulama son doğrulanmış önbelleği, ilk kurulumda da APK içindeki başlangıç
içeriğini kullanır ve kitaplıkta hangi kaynağın kullanıldığını bildirir.

Kanonik veride değişiklik yapmak için ilgili JSON'u düzenleyip `main` dalına alın.
Yayımlama iş akışı `remote-content/` çıktısını bot hesabıyla yeni bir commit olarak
ekler. İçeriğin ekrana gelmesi için uygulamayı yeniden açmak yeterlidir. El ile paket
üretmek gerekirse:

```bash
node apps/lesson-player/scripts/package-android-data.mjs
```

Bu komut hem APK varlıklarını hem de uzaktan sunulan paketi aynı doğrulanmış JSON'dan
üretir. `node apps/lesson-player/scripts/package-android-data.mjs --check` iki kopyanın
kanonik veriyle aynı olduğunu denetler. İş akışının yayımlama commit'i için de GitHub
Actions izinlerinde `contents: write` açık olmalıdır.

İçerik katmanı yeni cevap, soru, ders, tema ve rehber-plan verisini mevcut JSON
sözleşmesi içinde taşıyabilir. Yeni bir JSON alanı veya uygulamanın tanımadığı yeni
düzen/reveal türü eklenirse Kotlin modeli ve görünümü güncellenip APK yayımlanmalıdır.
Room veritabanı yalnızca öğretmenin ilerleme, düzenleme ve takip işaretlerini yerel
cihazda tutar; bunlar bu içerik yayımlama akışının parçası değildir.

```bash
cd apps/lesson-player-android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
node ../lesson-player/scripts/package-android-data.mjs --check
node ../lesson-player/scripts/test-android-data.mjs
# Android 16 emülatörü veya tablet bağlıyken:
./gradlew :app:connectedDebugAndroidTest
```

Android 16 emülatör CI'sında Wi-Fi ve hücresel veri kapatılarak çevrimdışı önbellek
ve APK yedeği sınanır. İlk Gradle/SDK kurulumu internete ihtiyaç duyar; uygulama daha
önce eşitlenmiş doğrulanmış içeriği internet olmadan açabilir.

Plan: [Fazlar](../../docs/LESSON_PLAYER_ANDROID_PHASED_PLAN.md).
