# Lesson Player Android — Compose mimari kararı

**Durum:** Onaylanan mimari. Önceki Tauri 2 + React Android önerisi bu kararla **geçersiz kılınmıştır**. Bu belge Android'e özgüdür; Linux/Pardus uygulaması, Raspberry Pi sunucusu ve cihazlar arası kontrol **şimdilik uygulanmayacak**.

**Platform:** Android 16 ve üzeri; `minSdk = 36`, `targetSdk = 36`, `compileSdk = 36` (daha yeni araç zincirine geçilirse compile/target yükseltilebilir, `minSdk` 36 altına düşmez). 64-bit ARM Android tablet öncelikli. İlk gerçek cihaz: Samsung Galaxy Tab A11 Plus SM-X230 / Android 16.

**Asıl plan:** [Fazlı plan](LESSON_PLAYER_ANDROID_PHASED_PLAN.md). Faz 0 çıktı belgeleri:
[kod denetimi](LESSON_PLAYER_ANDROID_PHASE_0_AUDIT.md),
[ürün ve test sözleşmesi](LESSON_PLAYER_ANDROID_PHASE_0_CONTRACT.md),
[tablet tasarım brifi](LESSON_PLAYER_ANDROID_PHASE_0_DESIGN_BRIEF.md).

## Karar

- **Kotlin + Jetpack Compose + Material 3** ile gerçek Android arayüzü; Android UI WebView/Tauri/Capacitor içine sarılmayacak.
- Web/Mac tarafındaki React Lesson Player varlığını korur. Compose ve React **UI kodu paylaşmaz**; kanonik JSON içerik, kimlikler ve sözleşmeler paylaşılır.
- Tek kaynak: `data/grade-11/source/teacher-book/theme-*`, `data/grade-11/presentation/theme-*/*-flow.json`, `apps/lesson-player/src/teacher-workflow.json`. Android içerik derlemesi bu kaynakları yeniden yazmaz.
- Mevcut `apps/lesson-player/scripts/build-lesson-data.mjs` doğrulaması çalışmadan Android ders paketi üretilemez. Aynı doğrulanmış `lessons.json` + sürümlü manifest/özet + `teacher-workflow.json` APK'nın assets içeriği olur.
- Android'de ders motoru Kotlin saf state machine / reducer olarak uygulanır. Web davranışıyla parity, ortak JSON fixtures ve testler üzerinden sağlanır; TS kodu Android runtime'a kopyalanmaz.
- Kotlin Coroutines/Flow + ViewModel (tek yönlü state), Navigation ve pencere boyutuna uyarlanabilen Compose yerleşimi; renk/typography/components uygulamaya özgü design system. Görsel kalite Compose'un varsayılan şablonuna bırakılmaz.
- `DataStore` basit tercihler ve cihaz ayarları için; `Room` ders ilerlemesi, özel adım sırası, düzenlemeler ve üç takip hattı için sürümlü, transaction destekli kalıcı kayıt alanı. Kanonik ders varlığı immutable kalır.
- Yedek/göç için Storage Access Framework üzerinden JSON dışa/içe aktarma. Web tarayıcısının `localStorage` verisi Android'e otomatik taşınmaz. İçe almada sürüm/kimlik kontrolü, mevcut kaydın yedeği ve başarısızlıkta bütünlüğü koruyan işlem gerekir.
- Öğrenci/sunum görünümü öğretmen state'inden **izin verilen alanlarla kurulan ayrı DTO** üzerinden beslenir; öğretmen notu, kişisel düzenleme paneli, öğretmen rehberi işaretleri veya ileride kişisel öğrenci kayıtları payload'a eklenmez.
- İlk Android sürümü çevrimdışı ve tek cihazdır: Pi/WebSocket/uzaktan tahta kontrolü, Linux ve Mac için Kotlin UI, bulut üyeliği ve içerik uzaktan indirme kapsam dışıdır. Gelecekteki bağlantı için komut, içerik sürümü ve durum sözleşmesi arayüz sınırında korunur.

## API 36'nın tasarım sonuçları

- Android 16 hedefinde edge-to-edge'den kaçış yoktur: Compose `WindowInsets`, IME, gezinme/sistem çubukları ve dokunmatik alanlar test edilir.
- Predictive Back ve gerçek Android geri akışı; Android 16'da eski `onBackPressed` / KeyEvent varsayımlarına dayanılmaz.
- Uyarlanabilir layout **fiziksel tablet modeline veya yalnız orientation'a değil kullanılabilir pencere boyutuna** göre belirlenir. Split-screen, yazı ölçeği ve IME değişimlerinde aynı ders/adım korunur.
- Tam ekran yalnız sunum modunda; öğrenci notları görünmez. Ders dışındayken gereksiz ekran-açık kilidi tutulmaz.
- `minSdk = 36` nedeniyle API 35 ve öncesine uyumluluk iş yükü yoktur; bu, UX/erişilebilirlik/performans testlerinin yerine geçmez.

## Karar kayıtları

| Karar | Neden |
|---|---|
| Android native Compose | Tablet kullanımında doğal gezinme/dokunma/sistem bütünleşmesi ve özel görsel dil |
| Kanonik JSON paylaşımı | 11. sınıf içeriğinin ikinci kez yazılmasını ve web/Android cevap ayrışmasını önleme |
| Kotlin reducer + ortak parity fixtures | React bağımlılığı olmadan test edilebilir, davranış uyumlu Android oyuncu |
| Yerel offline bundle | Okul bağlantısından bağımsız temel ders yürütme |
| DataStore + Room | Tercihler ile ilişkisel/sürümlü öğretmen kayıtlarının farklı gereksinimleri |
| Öğrenci DTO'sunda allowlist | Yalnız UI gizlemesine dayanmayan bilgi ayrımı |
| Pi/Pardus ertelendi | İlk Android APK'nın güvenilir ve bağımsız tamamlanması |

Kaynak dokümanlar:
- https://developer.android.com/about/versions/16/setup-sdk
- https://developer.android.com/about/versions/16/behavior-changes-16
- https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes
