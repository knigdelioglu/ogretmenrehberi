# Lesson Player Android — Mimari karar ve uygulama sözleşmesi

Durum: Android uygulama mimarisi; Linux/Pardus uygulamasının implementasyonu bu kapsamda **yoktur**.
Başlangıç noktası: `main` commit `65459a0` (2026-09-20), `apps/lesson-player`.
Hedef cihaz: Android tablet, öncelikle Galaxy Tab A11 Plus SM-X230 / Android 16 üzerinde gerçek cihaz kabulü.
İlk sürüm: internetsiz, bağımsız çalışan tek ekranlı öğretmen ders oynatıcısı; ileride Pi/tahta kumandası için arayüz ayrımı.

## 1. Mimari karar

- Tauri 2 Android kabuğu + mevcut React/TypeScript/Vite renderer.
- Kanonik veri, `data/grade-11/source/teacher-book/theme-*/source-index.json` +
  cevap bankası parçaları + `data/grade-11/presentation/theme-*/*-flow.json`.
- `scripts/build-lesson-data.mjs` build öncesi çalışır. Üretilen ders kataloğu uygulama varlığıdır; tablette Node, Git, repo klonu veya yerel HTTP sunucusu yoktur.
- Dersin state transition/erişim kuralları saf TypeScript'te; Android özellikleri Rust/Tauri ve gerektiğinde ince Kotlin eklentisinde.
- Web sürümü aynı çekirdeği ve içerik kalitesini korur. Android'e özgü modülün `window` veya Tauri bağımlılığı ders motoruna sızmaz.
- Android uygulama geliştirmesi başka adla ayrı repoya taşınmaz; burada `apps/lesson-player` ile ortak kaynak ve test kapıları paylaşılır.

## 2. Hedef modül sınırları

```text
data/grade-11/{source,presentation}/    # kanonik içerik
apps/lesson-player/
  scripts/build-lesson-data.mjs           # doğrulanmış lessons.json üretimi
  src/
    core/                                # saf LessonEngine, commands, state, content identity
    contracts/                           # Port, StudentProjection, Storage, Backup, Sync
    features/
      lesson/                             # öğretmen ders ekranı ve soru türleri
      teacher-guide/                     # üç takip hattı
      settings/                           # erişilebilirlik ve ekran ayarları
    platforms/
      web/                                # mevcut browser adaptörleri
      android/                            # Tauri adaptörleri ve Android UI affordance
    generated/lessons.json               # build çıktısı, VCS dışında
  src-tauri/
    capabilities/                         # yalnız gerekli native API izinleri
    src/                                  # asgari Rust komutları
    gen/android/                          # Tauri Android proje çıktısı; özelleştirmeler izlenir
```

Bu ağaç nihai dosya yerleşimi için hedeftir; mevcut dosyalar tek PR'da topluca taşınmayacak.
Önce testli adaptörler, sonra ayrıştırılmış core, sonra Android kabuğu.

## 3. State ve gizlilik sözleşmesi

`LessonSessionState`: `lessonId`, `stepId`, `reveal`, `vocabulary`, `order`,
`overrides`, `contentSignature`. Komutlar: `goTo`, `showAnswer`,
`showGuidance`, `toggleTerm`, `setPresentationMode`,
`switchLesson` ve öğretmen düzenlemesi.

`toStudentProjection(state)` saf, tek yönlü, testli bir projection oluşturur.
Öğretmen notları, düzenleme yetkileri, portfolyo kontrol işaretleri ve gelecekte
öğrenci verileri student payload'ına **hiç yazılmaz**. Yalnız UI gizleme yeterli
bir bilgi sınırı değildir.

Android ilk fazda uzaktan öğrenci ekranı açmaz: aynı tabletin ayrı tam ekran
sunum modunda öğretmen paneli yoktur. İleride başka cihazı kontrol ederken
aynı DTO ve komut protokolü kullanılacaktır. `window.open` ve
`BroadcastChannel` Android temel iş akışında kullanılmaz.

## 4. Platform portları

| Port | Android adaptörü | Web adaptörü |
|---|---|---|
| `PersistentStatePort` | Tauri Store / app data, asenkron bootstrap | localStorage için sürümlü wrapper |
| `BackupPort` | Tauri Dialog + FS / Android content URI | tarayıcı indirme ve dosya seçici |
| `DevicePort` | Android Back, inset, ekranı açık tutma, orientation | tarayıcı/klavye eşdeğerleri |
| `PresentationPort` | aynı tablet tam ekran; harici ekran yok | mevcut Browser/BroadcastChannel |
| `RemoteTransport` | ilk sürümde `DisabledTransport` | ilk sürümde aynı |

Tauri Store asenkrondur: initial state yüklenmeden UI başlangıç durumunu
kalıcı depoya yazamaz. Tek yazıcı kuyruk, sürümlü şema, kayıt hatası
geri bildirimi ve kontrollü debounce gerekir. `localStorage` göçü için
önce web JSON backup export, Android JSON backup import sağlanır.

`BackupPort` Android'de `content://` URI dönebilir; bu değer
doğrudan POSIX dosya yolu olarak ele alınmaz. Yedek dosyası bütün
öğretmen ayarları ve plan işaretlerini içeren sürümlü `manifest`,
`payload` ve doğrulama bilgisi taşır. İçe alma işlemi mevcut verilerin
yedeklenmesini takiben doğrulamalı ve atomik biçimde uygulanır.

## 5. İçerik kimliği ve çevrimdışı davranış

- Android release içine `lessons.json` gömülür. QR/video ve kaynağı
  bulunmayan rubrikler gömülü sayılmaz; kaynak sınırlı etiketi korunur.
- `contentSignature` / `schemaVersion` saklanır. Ders güncellenince eski
  kişisel adım düzeni kanonik verinin üzerine sessizce uygulanmaz.
- Giriş ekranı son açık ders ve son adımı gösterir; bağlantı yokken tüm
  paketlenmiş dersler erişilebilirdir.
- Ders motoru için çalışma sırasında Pi, internet, Firebase, Supabase veya
  Google oturumu gerekmez.

## 6. Tablet UI sözleşmesi

İki optimize düzen: yatayda ders listesi + içerik, dikeyde tek içerik
yüzeyi + açılır ders navigasyonu. Öğretmen rehberi ve düzenleme,
üst üste binmeyen tam-yükseklik panel/sayfa olarak açılır.

- Android sistem/status/navigation bar güvenli alanları ve klavye açılınca
  viewport yeniden ölçümü.
- Dokunmatik hedefler yaklaşık en az 48dp; son-satır navigasyonu erişilebilir.
- Uzun cevaplar yalnız içerik yüzeyinde kaydırılabilir; sabit alt
  önceki/sonraki düğmeleri klavye ve gezinme çubuğu altında kalmaz.
- Android Geri önceliği: dialog > açık panel > ders listesi >
  öğretmen ana ekranı > OS çıkışı.
- Ekran açık tutma yalnız etkin ders/sunum sırasında. Uygulama arka
  plana gidince kaldırılır.
- Telefon arayüzünü zorla büyütmek yerine tablet için gerçek landscape ve
  portrait düzenleri test edilir.
- Tahta ve Pi kumandası UI'sı bu MVP'ye eklenmez.

## 7. Gelecekteki Pi bağlantı sınırı (kapsam dışı)

`RemoteTransport` yalnız interface olarak tanımlanır; websocket
bağımlılığı/INTERNET permission, eşleştirme servisi veya ev sunucusu
bu sürümde kurulmaz. Daha sonra `Pairing`, `CommandEnvelope`
(sessionId, seq, commandId, contentSignature), `Ack`, `Snapshot`
ve bağlantı kesilme durumları eklenir. Tablet tek başına her zaman
çalışır; uzaktan başarı onay gelmeden gösterilmez.

## 8. İş paketleri ve tamamlanma kapıları

1. `Core + Ports`: saf reducer, storage ve export portları, web regression PASS.
2. `Tauri Android shell`: Tauri 2 Android initializasyonu, offline Vite
   asset; Mac üzerinde Android SDK/NDK/Rust aarch64 hedefi kurulumu.
3. `State migration`: asenkron bootstrap, native Store,
   web export/Android import ve eski edit backup.
4. `Tablet UX`: dikey+yatay, safe area, Back, input keyboard, keep awake.
5. `Release`: imzalı arm64 APK, versionCode, SHA-256, cihaz kurulum testi;
   debug ve release aynı içerik checksum'ını kullanır.

Kabul testleri: dört tema ve derslerin tamamı açılır; internet kapalıyken
adım/cevap/yönlendirme geçişi; öğretmen notu öğrenci görünümünde hiçbir
durumda yok; ilerleme kapanış/yeniden başlatmada korunur; JSON export/import
round-trip; bozuk/stale kayıt güvenli kurtarma; ekran rotasyonu ve klavye
sonrasında alt gezinme erişilebilir; arka plana alınan uygulama ekrana
gereksiz wakelock tutmaz; eski web tarayıcı testleri PASS; gerçek Android
tablet smoke PASS.

## Kaynaklar

- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/reference/webview-versions/
- https://v2.tauri.app/reference/javascript/store/
- https://v2.tauri.app/plugin/dialog/
- https://v2.tauri.app/plugin/file-system/
- https://v2.tauri.app/security/capabilities/
- https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets
