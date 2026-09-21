# Lesson Player · Android 16

**Faz 4: kanonik çevrimdışı içerik + Kotlin motoru + uyarlanabilir Compose ders yüzeyi.** Kotlin + Jetpack Compose, WebView/Tauri yok.
Minimum Android 16 (`minSdk=36`), `compileSdk=targetSdk=36`.
İlk hedef tablet; portrait/landscape ve değişken pencere genişliği için
native Compose gezinmesi. Mevcut web Lesson Player bu klasörden bağımsızdır.

## Durum

- Açılan native `MainActivity`, tasarım sistemi, sistem açık/koyu teması.
- Kitaplık, örnek ders düzeni, üç öğretmen hattının kabuğu, görünüm ekranı
  ve dört Compose Preview. **Önizleme gerçek ders cevabı değildir.**
- Android Back, API 36 edge-to-edge için Compose safe insets.
- İnternet izni yok. **48 ders / 914 adım ve 4 temanın gerçek kanonik JSON'u**
  derleme sırasında web ile aynı doğrulama kapısından geçip APK içine alınır.
- Dört temanın ders kitaplığı, doğrulanmış kaynak başlıkları, kalıcı ders oturumu,
  yedi içerik düzeni ve Android içi sınıf sunumu çalışır.
- Cevap açma ve kalıcı ders ilerlemesi çalışır; öğretmen düzenlemesi,
  takip hattı işaretleri ve JSON yedekleme henüz yoktur ve Faz 5–6 kapsamındadır.
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
saklanır. İlk kurulum internete ihtiyaç duyar; uygulamanın
kendisi Faz 2'den itibaren internetsiz ders açacaktır.
Android Studio projeyi bağımsız açabilir; standart Gradle wrapper
JAR gerektiren bazı IDE entegrasyonları için standart wrapper'ın
eklenmesi ayrıca izlenir.

## Çalıştırma ve sınama

Android Studio > Run `app` (API 36 emülatör/Android 16 tablet).
Unit: `./gradlew :app:testDebugUnitTest`.
Instrumented Compose smoke: `./gradlew :app:connectedDebugAndroidTest`
(API 36 bağlı emülatör/cihaz gerektirir).
CI debug APK'yı yalnız faz testi için saklar; kullanıcıya release diye sunulmaz.

## Faz 2: çevrimdışı veri sözleşmesi

`app:preBuild` `apps/lesson-player/scripts/package-android-data.mjs` çağırır:
kanonik build + tema, rehber ve runtime kontrolleri geçmeden APK üretilmez.
`app/src/main/assets/lesson-player/` içindeki **üç JSON** otomatik üretilir,
Git'e eklenmez: `lessons.json`, `teacher-workflow.json`,
`content-manifest.json`. `generated_at` değişken derleme zamanı olduğu için
Android paketinden çıkarılır; dersin diğer bütün alanları aynen korunur.
SHA-256 içerik kimliği **cevap, yönlendirme ve kanıt metinlerini de** kapsar.
Android loader iki asset'i özetleriyle doğrular, sonra 48 ders / 914 adım /
4 tema ve rehber sayımlarını kontrol eder. Bozuk içerik sessizce gösterilmez.

```bash
cd apps/lesson-player-android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
node ../lesson-player/scripts/package-android-data.mjs --check
node ../lesson-player/scripts/test-android-data.mjs
# Android 16 emülatörü veya tablet bağlıyken:
./gradlew :app:connectedDebugAndroidTest
```

Android 16 emülatör CI'sında Wi-Fi ve hücresel veri kapatılarak
assets tabanlı test yapılır. İlk Gradle/SDK kurulumu internete ihtiyaç
duysa da **uygulamanın ders okuması internete ihtiyaç duymaz**.
Faz 5–6'da öğretmen rehberi işaretleri, native düzenleme ve JSON yedek eklenecek.

Plan: [Fazlar](../../docs/LESSON_PLAYER_ANDROID_PHASED_PLAN.md).
