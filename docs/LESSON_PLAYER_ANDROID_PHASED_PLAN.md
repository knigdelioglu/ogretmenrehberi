# Lesson Player Android — Fazlı uygulama planı

**Statü:** Faz 0 dokümantasyonu tamamlandı; Faz 1+ uygulama kodu henüz başlamadı. **Bu PR APK/uygulama kodu içermez**. Önceki Tauri Android planının yerine Kotlin + Jetpack Compose seçilmiştir.

**Başlangıç:** `knigdelioglu/ogretmenrehberi` main `65459a0`, `apps/lesson-player`.
**Platform sözleşmesi:** **minimum Android 16 = API 36**. İlk Gradle yapılandırması:
`minSdk = 36`, `targetSdk = 36`, `compileSdk = 36`; Kotlin/AGP/Compose sürümleri P1'de birlikte uyumlu kararlı sürümlerle sabitlenecek.
Android 15 ve altı cihazlar kapsam dışıdır; `minSdk` düşürülmez.
**Gerçek cihaz:** Galaxy Tab A11 Plus SM-X230, Android 16; dikey, yatay,
bölünmüş pencere, sistem yazı ölçeği ve klavye kontrolü.
**Ürün hedefi:** Yerel, çevrimdışı, görsel olarak özgün ve sınıfta kararlı 11. sınıf
öğretmen ders oynatıcısı; Pardus/Pi implementasyonu sonraki projedir.

## Değiştirilmeyecek doğrular

- **Tek kanonik içerik:** dört tema için `data/grade-11/source/teacher-book/theme-*`
  kaynak ve cevap bankaları, `data/grade-11/presentation/theme-*/*-flow.json`
  akışları. Mevcut `build-lesson-data.mjs` kataloğu doğrulayarak oluşturur.
  `teacher-workflow.json` ayrı öğretmen rehberi kaynağıdır.
- Web Lesson Player React kalır; Android **Tauri/WebView/Flutter değil Kotlin
  + Jetpack Compose**. React bileşenleri Android'de ikinci kez kopyalanıp
  web görünümü gibi gömülmez. **İçerik ve davranış sözleşmeleri paylaşılır;
  UI/uygulama kodu paylaşılmaz.**
- `source_record_id`, `answer.question_id`, `lesson_id`, `step.id`,
  `theme_id` ve reveal sırası sürümler arasında değişmeden taşınır;
  keyfi sıralama veya cevap üretimi yapılmaz.
- Dört tema, **48 lesson-flow** başlangıç kapsamı; bir tema pilottan sonra
  diğerleri unutulmayacak. Her ders `question`, `vocabulary`, `process`,
  `reference`, `comparison`, `structure`, `assessment` layout'larını
  veri geldiği ölçüde destekler.
- Tablet internetsiz ders anlatabilir. QR/video veya dış rubrik kaynakları
  çevrimdışı varlık gibi sunulmaz; `source_limited` uyarısı korunur.
- **Öğrenci/puan verisi, Pi, WebSocket, Pardus istemcisi, hesap/bulut
  senkronizasyonu ve kitap PDF'sini uygulamaya gömme bu planın dışındadır.**
  Üç öğretmen takip hattı, öğrenci bazlı teslim/puan anlamına gelmez.

## Nihai modül ve veri sınırları

```text
data/grade-11/{source,presentation}/   ← tek kanonik içerik
apps/lesson-player/scripts/...         ← mevcut doğrulanmış katalog derlemesi
apps/lesson-player/src/...             ← mevcut web uygulaması, çalışmaya devam
apps/lesson-player-android/             ← yeni native Android projesi
  app/                                 ← Activity, navigation, DI root, app config
  core/model/                          ← içerik ve oturum DTO'ları
  core/content/                        ← bundle parse, manifest ve kimlik doğrulama
  core/player/                         ← saf Kotlin reducer/state machine
  core/storage/                        ← Room, DataStore, migration, backup
  core/designsystem/                   ← özgün Compose token ve bileşenleri
  feature/library/                     ← temalar, dersler, arama, devam
  feature/lesson/                      ← 7 layout + reveal + vocabulary + sunum
  feature/teacher/                     ← 3 hat, 4 tema, yıllık eser/film
  feature/editor/                      ← düzenleme ve JSON export
  feature/settings/                    ← görünüm, erişilebilirlik, yedek
```

Bu modüller **hedef bağımlılık sınırlarıdır**. P1'de stabil çekirdek ve app
iskeletiyle başlanır; gereksiz boş Gradle modülleri oluşturulmaz.
Ders motoru Android `Context`'i, Compose'u veya depolamayı içeri almaz.
ViewModel `StateFlow<LessonUiState>` sunar; UI kullanıcı niyetini command
olarak gönderir; repository kalıcı kaydı yönetir.

```text
source-index + answer-bank + flow JSON
           ↓ existing validation/build
   lessons.json + teacher-workflow.json
           ↓ manifest: schema + stable content digest
       APK assets (immutable)
           ↓ Kotlin content repository
       LessonEngine (pure)
           ↓ StateFlow / ViewModel
       Compose teacher UI
           ↓ only allowed student fields
       PresentationProjection
```

Build manifest checksum'u `generated_at` gibi değişken zaman damgalarını
içerik kimliği sanmaz. Web/Android parity fixture'ları aynı kanonik
JSON girdilerini ve beklenen komut sonuçlarını kullanır.
Kaydetme katmanında **kanonik içerik** ile **kişisel değişiklik** daima ayrıdır.

## Faz 0 — Mimariyi ve kalite sözleşmesini sabitle

**İş:** Yeni Android klasör konumu, modül bağımlılıkları, aynı kaynaklardan
çıktı üretme, JSON alanları ve null/reveal semantiği, öğrenci projection
allowlist'i, yayın kapsamı, test matrisi. Web `App.tsx`,
`runtime-contracts.js`, `types.ts`, `teacher-workflow.json`,
`build-lesson-data.mjs` ile bire bir davranış envanteri.
**Çıktı:** [mimari ADR](LESSON_PLAYER_ANDROID_ARCHITECTURE.md),
[koddan çıkarılmış davranış envanteri ve riskler](LESSON_PLAYER_ANDROID_PHASE_0_AUDIT.md),
[ekran/komut/fixture/öğrenci projection sözleşmesi](LESSON_PLAYER_ANDROID_PHASE_0_CONTRACT.md),
[özgün Compose tablet tasarım brifi](LESSON_PLAYER_ANDROID_PHASE_0_DESIGN_BRIEF.md).
**Kapı: BELGE DÜZEYİNDE GEÇTİ.** API36 ve Compose kararı onaylı; 48 ders, 4 tema,
5 sunum ve 3 takip hattı sözleşmede sayılmış; kapsam dışı açık.
Faz 2/3'te çözülecek P0 teknik risklerin belgelenmiş olması onların
uygulamada çözülmüş olduğu anlamına gelmez.

## Faz 1 — Native Android proje ve CI iskeleti

**İş:** Android Gradle/Kotlin/Compose projesi, kararlı uyumlu sürüm
kataloğu, `minSdk/targetSdk/compileSdk=36`, `arm64-v8a` cihaz
testi, Compose Material 3 + özel tema tokenları; GitHub Actions
build, lint, unit-test, debug APK. İmza anahtarı bu aşamada repoya girmez.
**Çıktı:** açılan native boş kabuk, kaynak ve yapılandırma doğrulama.
**Kapı:** API36 emülatör/gerçek cihaz açılır; merged manifest ve APK
metadata API 36 altını kabul etmez; web CI bozulmaz.

## Faz 2 — Kanonik içerik paketleme ve çapraz dil eşdeğerliği

**İş:** var olan `npm run data/test:data/test:runtime` kapısını kullan;
`lessons.json`, `teacher-workflow.json` ve sürümlü manifest'i Android
assets'e deterministik kopyala. Kotlin parse + referans/kimlik/alan
validator; UTF-8 Türkçe, null, uzun metin, answer_sections list/map
tipleri, `source_limited` işaretleri. TS ve Kotlin tarafının aynı
fixture'lar üzerinde şema ve semantik doğrulaması.
**Çıktı:** read-only Android `ContentRepository`, tema/ders kataloğu.
**Kapı:** dört temadaki 48 dersin kimlik/adım/sayfa/reveal sayımları
kanonik çıktı ile eşleşir; eksik ya da bayat assets build'i durdurur;
uçak modunda katalog ve içerik okunur.

## Faz 3 — Saf Kotlin ders motoru ve kalıcı durum temeli

**İş:** `LessonSession`, `LessonCommand`, `reduce`:
önceki/sonraki, ders değiştirme, `step.id` ile resume,
guidance/answer/evidence/explanation/note reveal sırası,
vocabulary öğe bazlı anlam açma, tüm anlamları açma,
öğretmen düzenlemesi uygulanmış effective step. Canonical
signature ile eski override/order uyuşmazlığını güvenli yedekle.
`DataStore` tercihler; `Room` ders ilerlemesi, özel sıra,
override ve rehber işaretleri. İlişkili kayıtlar transaction ile.
**Çıktı:** UI'dan bağımsız, yeniden açılışta doğru yerden devam eden motor.
**Kapı:** web runtime ile ortak fixtures PASS; kaydı bozma/kısmi
yazma/içerik sürümü değiştirme testleri veri kaybettirmez; tüm
öğretmen-only alanlar student projection DTO'suna alınmaz.

## Faz 4 — Gerçek tablet arayüzü ve oynatıcı

**İş:** uygulamaya özgü tasarım sistemi; okunabilir tipografi,
boşluk/hiyerarşi, kart ve gösterim animasyonları; Compose ile
7 layout için içerik renderer. Yatay genişlikte katalog +
ders yüzeyi; dar/dikey pencerede geniş ders yüzeyi +
isteğe bağlı katalog; yönlendirme/cevap için ayrı anlamlı
dokunma kontrolü, soru ile cevabın aynı alanda yer değiştirmesi;
öğretmen ekranı ve tam ekran sınıf sunumu.
**Çıktı:** tüm derslerin dokunmatik yürütüldüğü özgün Android UI.
**Kapı:** sadece ilk tema değil dört tema; 7 düzen türü ve çok uzun
cevaplar taşmaz; landscape/portrait/split-screen/IME/1.3x+ font
scale testleri; sistem gezinme altındaki buton erişilebilir;
48dp civarı dokunma hedefi, TalkBack ve kontrast kontrolü.

## Faz 5 — Öğretmen rehberi, üç ayrı takip hattı

**İş:** dört tema gezinmesi, sayfaya bağlı atölye vurgusu;
tema başına konuşma/yazma; yıllık dört eser + bir film için
önerilen haftalar; Ek-1/sunu/portfolyo/yansıtma.
Atölye, yıllık sunum ve portfolyo işaretleri birbirinden
ayrı ve sürümlü saklanır. Resmî içerik ile pedagojik öneri
etiketleri ayrılır; sayı/puan formülü icat edilmez.
**Çıktı:** tablet boyutuna uygun öğretmen paneli; öğrenci
sunumunda kapalı.
**Kapı:** 4 tema × 2 atölye, 4 yansıtma, 5 yıllık çalışma;
önerilen haftaların eşleşmesi weble aynı; işaret silme,
geri açma, process death ve rota değişimi PASS.

## Faz 6 — Native düzenleme ve kayıpsız yedek

**İş:** soru/başlık, density/layout, reveal sırası,
süreç maddeleri/bilgi kartı, adım taşıma ve reset;
canonical answer-bank değiştirilmez. Lesson-flow
JSON export mevcut web sözleşmesiyle round-trip yapar.
Ayrı `backup.json` kişisel ayarlar/ilerleme/rehber
işaretleri için sürümlü format; Android SAF ile
içe/dışa aktarma; web `localStorage` için açık
yedekleme/göç mekanizması. Import öncesi doğrulama +
geri dönüş yedeği + atomik uygulama.
**Çıktı:** Mac/web incelemesiyle uyumlu yerel öğretmen düzeni.
**Kapı:** yedek round-trip, geçersiz JSON, eski schema,
contentSignature uyumsuzluğu, uygulama güncellemesi,
tampon kayıt kesintisi testleri; sıfırlama yalnız ilgili
kapsamdaki kişisel değişikliği siler.

## Faz 7 — Gerçek cihaz, dayanıklılık ve erişilebilirlik

**İş:** Galaxy Tab A11 Plus Android16 gerçek cihazda
uzun ders, tekrar eden reveal, rapid navigation,
orientation, split screen, dışarı dönme, process death,
karanlık/açık mod, büyük metin, TalkBack, boş depolama,
çevrimdışı açılış, düşük bellek testleri. Compose
recomposition/IO ve bellek profili; UI'da ana iş
parçacığında büyük JSON parse yapılmaz.
**Çıktı:** bilinen P0/P1 listesi ve düzeltilmiş performans.
**Kapı:** P0/P1 açık değil; soru kaybı veya öğretmen bilgisi
sızıntısı yok; internet kapalı senaryolar başarılı; görünür
alt kontroller ve geri davranışı doğrulanmış. Sayısal açılış,
navigasyon ve bellek hedefleri cihazda ölçülüp bu fazda
baz çizgi olarak sabitlenir, önceden doğrulanmamış
rakamlar vaat edilmez.

## Faz 8 — Dağıtılabilir Android 16 APK

**İş:** sürüm adı/kodu, id/ikon/uygulama adı,
release keystore güvenli saklama, arm64 imzalı APK,
cihaz kurulum/güncelleme/geri yükleme testi, SHA-256
doğrulama, GitHub Release asset ve sürüm notları.
**Çıktı:** kullanıcıya verilecek tek doğrulanmış APK.
**Kapı:** release SHA-256, içerik manifest özet ve
commit eşleşir; Android16 cihazda temiz kurulum +
mevcut veriyi koruyan güncelleme PASS; API35'te
yükleme reddi doğrulanmış; aynı commit için web veri
ve uygulama testleri PASS.

## Faz sırası ve kurallar

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8`.
Her faz ayrı PR/checkpoint; önceki fazın kapısı
geçilmeden yeni faza "bitti" denmez. İçerik kalite
doğrulama ve Android derleme web CI'ya eklenir.
Kodu yazmadan önce ekran/akış referansları P0'da
tespit edilir; statik görseli çalışan uygulama
testi yerine saymayız.

**İleriye bırakılan ama mimariyi kilitlemeyen:** Raspberry Pi
üzerinden başka ağdaki Pardus'a kumanda, eşleştirme,
oturum mesajları ve bağlantı kopma uzlaştırması.
Bu fazlar ilk APK için şart değildir; yalnızca
`LessonCommand`, `StudentProjection` ve
`contentSignature` API'leri sonraki entegrasyona
engel oluşturmayacak şekilde tasarlanır.

## İlgili kaynaklar

- [Compose ADR](LESSON_PLAYER_ANDROID_ARCHITECTURE.md)
- [Faz 0 mevcut kod denetimi ve risk matrisi](LESSON_PLAYER_ANDROID_PHASE_0_AUDIT.md)
- [Faz 0 ürün, durum ve test sözleşmesi](LESSON_PLAYER_ANDROID_PHASE_0_CONTRACT.md)
- [Faz 0 tablet tasarım brifi](LESSON_PLAYER_ANDROID_PHASE_0_DESIGN_BRIEF.md)
- [Lesson Player web README](../apps/lesson-player/README.md)
- [Üç takip hattı](LESSON_PLAYER_TEACHER_WORKFLOW_2026-09-19.md)
- https://developer.android.com/about/versions/16/setup-sdk
- https://developer.android.com/about/versions/16/behavior-changes-16
- https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes
- https://developer.android.com/develop/adaptive-apps/guides/list-detail
