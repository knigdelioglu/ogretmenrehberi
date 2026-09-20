# Lesson Player Android — Faz 0 gerçek-kod denetimi ve davranış envanteri

**Denetlenen kaynak:** `main@65459a0a20df05086a27fa270c5e3df91b581bd6`, 2026-09-20.
**Hedef:** Android 16+ (minSdk API 36), Kotlin + Jetpack Compose.
**Niteliği:** Koddan çıkarılmış mevcut davranış (MEVCUT) ile Android ürün kararı (HEDEF) ayrı gösterilir.
**Durum:** Mimari/ürün sözleşmesi çıkarıldı; Android kodu, derleme ve gerçek cihaz ölçümü **yapılmadı**.

## A. Denetlenen kaynak envanteri

| Konu | Dosya |
|---|---|
| Veri şeması | `apps/lesson-player/src/types.ts` |
| Kanonik kaynak → ders | `apps/lesson-player/scripts/build-lesson-data.mjs` |
| Çoklu ders/session ve yerel kayıt | `apps/lesson-player/src/App.tsx` |
| Kimlik, export, eski kayıt, projection helper | `apps/lesson-player/src/runtime-contracts.js` |
| Adım/cevap/kelime sunumu | `apps/lesson-player/src/components/StepView.tsx` |
| Yedi layout; yapılandırılmış alanlar | `StepContentLayout.tsx`, `StructuredSections.tsx` |
| Ders kataloğu/sayfa/adım listesi | `LessonToolbar.tsx`, `LessonOutline.tsx`, `LessonFooter.tsx` |
| Düzenleme | `EditorPanel.tsx` |
| Üç takip hattı | `TeacherGuidePanel.tsx`, `src/teacher-workflow.json` |
| Bugünkü regresyon | `scripts/test-lesson-data.mjs`, `test-teacher-workflow.mjs`, `test-runtime-contract.mjs`, `test-browser-runtime.mjs` |

**Başlangıç kapsamı:** flow dosyaları 7 + 9 + 18 + 14 = **48 ders**. Runtime testinde **914 adım** ve **89 öğretmen notlu adım** sabit regresyon beklentisi mevcut; bunlar Faz 2 üretim çıktısında yeniden doğrulanacak. Temalara göre içerik sayımı build çıktısından alınacak; dosya sayısı ≠ cevap veya görev sayısı. Rehber: 4 tema, tema başına 2 atölye = 8; 4 yansıtma; 4 eser + 1 film = 5 önerilen sunum.

## B. Davranış eşdeğerliği matrisi

| ID | Webdeki MEVCUT davranış | Android HEDEF ve doğrulama |
|---|---|---|
| LP-01 | Ders seçici lesson_id ile dersi seçer; farklı derse geçiş tam sayfa navigation | İn-memory state değişimi, aynı ID ve kaldığı yer; yükleme hatası UI |
| LP-02 | URL `?lesson=` id/slug ve `?step=` ile adım açar | Android deep-link isteğe bağlı sonraki özellik; **step-id resume önceliği korunur**, raw URL zorunlu değil |
| LP-03 | Seçilen ders, indeks ve step-id saklanır | Kalıcı ders/adım kaydı; varsayılan indeks yerine step-id anahtar |
| LP-04 | Açık dersin adımları kanonik akıştadır; özel sıra varsa kullanılır | Aynı step IDs, özel sıranın tekil/tam permütasyon doğrulaması |
| LP-05 | Önceki/sonraki sınırda kalır; adım değişince reveal set sıfırlanır | Reducer testi: sınır, reset, step-id continuity |
| LP-06 | Yönlendirme/cevap/kanıt/açıklama/öğretmen notu katmanları tek tek aç/kapat | Sadece mevcut katmanlara izin; reveal_order aynı; başka adıma geçiş temizler |
| LP-07 | Space sıradaki gizli reveal'i açar; hepsi açıksa sonraki adıma gider | `RevealNext` komutu aynı semantik; dokunma ve donanım klavyesi ortak komut |
| LP-08 | Soru/cevap aynı alanda yer değiştirir; `structure/comparison/assessment` içerik kartları cevapta korunur | Compose renderer parity snapshot/semantik test |
| LP-09 | Vocabulary kelime bazlı anlam açar/kapatır; `answer` tüm anlamları açar | Terim kimliklerine göre görünürlük; `answer` açıkken tekil toggle kilitli |
| LP-10 | `answer_sections` dizi, nesne veya iç içe içerik olarak çizilir | Kotlin sealed/recursive JSON modeli; nesne sırası korunur; şablon için stringleştirilmez |
| LP-11 | `source_limited` ve `performance_support` ayrı etiketlenir | Kaynak sınırı normal kesin cevap gibi sunulmaz; performans desteği farklı etiket |
| LP-12 | Sıra: adımı bir önce/sonra ile swap; current step takip edilir | Sıra korunur, stable ID ile navigate; undo ve sınırlar test |
| LP-13 | Prompt, layout, density, reveal, içerik/note override; tek adımı veya bütün sunumu reset | Kanonik veri değişmez; override diff'i saklanır; özellik seti Faz 6'da tamamlanır |
| LP-14 | Export lesson-flow JSON, answer metnini kopyalamaz, kaynak/cevap ID kullanır | Webde tekrar yüklenebilir ve provenance koruyan round-trip |
| LP-15 | Eski/stale edit & order yeni içerik üzerine uygulanmaz; önce yedeklenir | Yedek doğrulanmadan overwrite yok; rollback ve kullanıcıya durum |
| LP-16 | Öğretmen rehberi güncel sayfanın atölyesini öne çıkarır; dört temaya bağımsız geçilir | Açık dersi değiştirmeden tema seçimi; yalnız aynı temada sayfa vurgusu |
| LP-17 | workshop / annual / portfolio işaretleri bağımsız tutulur | Ayrı namespace ve keys; işaretler öğrenci teslimi/not kaydı değildir |
| LP-18 | Aynı dönemin tüm sunumları gösterilir; önerilen temaya bağlı öğeler ayrıca vurgulanır | 2+3 dönem dağılımı ve 1,1,1,2 tema eşlemesi; takvim **öneri** olarak etiket |
| LP-19 | Webde P/projeksiyon, F/fullscreen ve ayrı `window.open + BroadcastChannel` öğrenci penceresi var | Android MVP yalnız tablet içi sınıf sunumu; harici pencere, uzaktan tahta, Pi **yok** |
| LP-20 | Öğretmen notu student screen'de saklanır/gizlenir; mevcut helper note alanını çıkarır | Android projection **allowlist DTO**: öğretmen notu/rehber/düzenleme/gelecek kişisel veriler dahil edilmez |
| LP-21 | Öğretmen görünümü: page, task type, evidence, structured content, note | Sunum görünümünde öğretmen chrome'ı kapatılır; normal modda kaynak/sayfa korunur |
| LP-22 | Entering projection hides outline & editor; guide render edilmez | Android presentation mode UI state; geri dönüşte kayıt ve işaretler aynı kalır |
| LP-23 | Mevcut browser klavye: ←/→, Space, C/G/E, D, P, F, Home/End | Android dokunma birincil; klavyenin mevcut eşdeğeri erişilebildiğinde desteklenir; predictive Back native |
| LP-24 | Web yerel depolama `localStorage` ve yıllık 2026–27 rehber anahtarına bağlı | Android Room + DataStore, schema/migration; kullanıcıya dönük yedek ve öğretim yılı namespace'i |

## C. İçerik ve kimlik sözleşmesi

Kanonik veri `source-index` + parçalı `answer-bank` + `*-flow.json`.
`build-lesson-data.mjs` her derste kaynak aralığını, kayıt/cevap referansını,
yinelenen ID'leri, sayfa tutarlılığını, eksik cevapları, `vocabulary`
yapılandırılmış anlamlarını ve reveal üyeliğini kontrol eder.
`generated_at` build zamanıdır; içerik revizyonu kimliği değildir.

Kotlin'in parse edeceği `LessonData`:
`schema_version/theme_id/lesson_id/lesson_slug/title/subtitle/
printed_page_range/required_source_range/coverage/steps`.
Her `LessonStep`:
`id/layout/density/reveal_order/display_prompt/display_prompt_mode/
source/answer?/content?`.
`source`: source_record_id, basılı sayfa, heading, task_type,
locator, status, olası prompt.
`answer`: `question_id`, `entry_type` (`question_answer`,
`performance_support`, `source_limited`), sayfa, prompt_summary,
answer, olası guidance/explanation/evidence_quotes/answer_sections.
`answer_sections` düz liste veya string/list/nested-object değerli
keyed object olabilir. JSON null ile **alanın bulunmaması** gerekli
yerlerde farklı ele alınır. Boş `content` durumu geçerlidir.

7 renderer:
`question, vocabulary, process, reference, comparison, structure, assessment`.
`StepContentLayout` source-driven `items/sections` ve
`StructuredSections` answer-driven `answer_sections` farklı alanlardır;
tek genel `Map<String,String>` bunları temsil edemez.

**Kimlik kuralı:** gösterim sayfası veya array indeksi primary key değil.
`lesson_id + step.id` ilerleme/override anahtarı;
`source_record_id` ve `question_id` kanonik provenance'dır.
`theme_id` dört tema arasında rehber bağlantısı sağlar.

## D. Mevcut koddan bulunan engeller / gap register

| Önem | Koddan doğrulanan durum | Faz 1+ çözüm/kapı |
|---|---|---|
| P0 | `canonicalLessonSignature` lesson metadata, adım prompt/layout/content ve answer **ID** içeriyor; **cevap metni/guidance/evidence/explanation değişimini kapsamıyor** | Android contentDigest answer dahil tam kanonik payload üstünden SHA-256; eski web signature ayrıca migration metadata, güvenilir çapraz sürüm hash'i sayılmaz |
| P0 | `studentVisibleOverrides` note alanını çıkaran black-list yaklaşımı; paketlenmiş öğretmen content'i de student context'te bulunabilir | `StudentProjection` yalnız allowlist ile kurulur, DTO testinde note/workflow/editor alanları yok; uzaktan iletim ancak ileride bu projection ile |
| P0 | Kanonik JSON için Android'in testli parse/asset pipeline'ı henüz yok | Faz 2, 48 lesson / 914 adım parity ve referans testleri |
| P0 | Android'in veri göçü için webde bütün kullanıcı ayarlarını dışa aktaran tek backup yok; yalnız flow export/ayrı stale backup mevcut | Faz 6 web backup export + Android import; otomatik aktarım iddiası yok |
| P1 | `localStorage` / web navigation / `window.open` / `BroadcastChannel` App içinde iç içe | Android'e aynen taşınmaz; Kotlin reducer + Room/DataStore + native navigation |
| P1 | `answer_sections` recursive JSON; vocabulary yalnız object section ile çalışıyor | Faz 2 tip modeli ve Faz 4 ayrı renderer; liste vocab olarak kabul edilmez |
| P1 | `teacher-workflow.2026-2027.v1` anahtarı ve tarihler yıla özgü | Android öğretim yılı alanı; önerilen haftaları resmi tarih olarak sunmama |
| P1 | React browser testleri dokunmatik Android/IME/edge-to-edge ölçmüyor | Faz 4/7 gerçek API36 cihaz matrisi |
| P1 | Bazı kaynaklar QR/video ve PDF dışı rubrik gerektiriyor | çevrimdışı demek tüm medya hazır demek değil; source_limited etiketi |
| P2 | Android görsel referans ekranları ve ölçülebilir perf baz çizgisi henüz yok | Faz 1 design tokens, Faz 4 ekran incelemesi, Faz 7 ölçüm |
| P2 | Pi/tahta komut protokolü henüz yok | V1 kapsam dışı; event/DTO izolasyonu yeterli |

**Not:** Bu gap'lar mevcut web uygulamasının bütünüyle bozuk olduğu anlamına
gelmez; Compose portuna aktarılırken yanlış varsayımı önlemek için
kaydedilen farklardır. `canonicalLessonSignature` sınırlaması ve
student payload sınırı özellikle Faz 3'ten önce kapatılacak.

## E. Android 16 odak kararı

`minSdk = 36`, `targetSdk = 36`, `compileSdk = 36` ilk
konfigürasyon; `compileSdk` ve hedef ileride güncellenebilir,
**minimum 36 kalır**. UI tasarımı kullanılabilir pencere boyutuna,
inset/IME ve font ölçeğine göre; sadece orientasyona göre değil.
Predictive Back'ı eski KeyEvent/back dispatcher varsayımlarından
bağımsız native Compose navigation ile ele al.
Resmî referans:
https://developer.android.com/about/versions/16/behavior-changes-16

## F. Faz 0 kabul kapısı

- [x] Kod/şema/rehber/test dosyalarının envanteri alındı.
- [x] Web mevcut davranışı ve Android hedefi ayrı matriste yazıldı.
- [x] Kimlik, yedi layout, nested answer_sections, nullable content,
  `source_limited`, teacher data isolation sözleşmesi yazıldı.
- [x] Üç bağımsız takip hattı, 4 tema, 5 sunum, 48 ders kapsamda.
- [x] API36 min + Compose onaylı, Tauri Android önerisi iptal.
- [x] Riskler faz ve çözüm kapısıyla kaydedildi.
- [x] Pi, Pardus, bulut, öğrenci/puan kaydı, PDF/video kopyalama kapsam dışı.
- [ ] Android uygulamasının başarılı build/emulator/gerçek cihaz doğrulaması
  **Faz 1–8** işidir; Faz 0 tamamlandı diye ima edilmez.
