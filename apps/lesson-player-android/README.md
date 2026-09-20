# Lesson Player · Android 16

**Faz 1 native iskeleti.** Kotlin + Jetpack Compose, WebView/Tauri yok.
Minimum Android 16 (`minSdk=36`), `compileSdk=targetSdk=36`.
İlk hedef tablet; portrait/landscape ve değişken pencere genişliği için
native Compose gezinmesi. Mevcut web Lesson Player bu klasörden bağımsızdır.

## Durum

- Açılan native `MainActivity`, tasarım sistemi, sistem açık/koyu teması.
- Kitaplık, örnek ders düzeni, üç öğretmen hattının kabuğu, görünüm ekranı
  ve dört Compose Preview. **Önizleme gerçek ders cevabı değildir.**
- Android Back, API 36 edge-to-edge için Compose safe insets.
- İnternet izni yok. **48 ders/914 adım ve gerçek öğretmen işaretleri henüz
  paketlenmedi**; Faz 2+ uygulanacak. Bu bir release APK değildir.

## Araç zinciri

- JDK 17; Android SDK Platform 36; Gradle **8.13**;
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

## Faz 2'ye geçiş

`apps/lesson-player/scripts/build-lesson-data.mjs` üzerinden üretilen
`lessons.json` ve öğretmen iş akışı ile sürümlü asset manifest'i
tek kaynak olarak içeri alınacak. Bu Faz 1 arayüzündeki örnek metinler
kanonik verinin yerine kullanılmayacak.

Plan: [Fazlar](../../docs/LESSON_PLAYER_ANDROID_PHASED_PLAN.md).
