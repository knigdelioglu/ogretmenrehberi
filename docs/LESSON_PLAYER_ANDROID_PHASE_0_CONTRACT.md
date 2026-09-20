# Lesson Player Android — Faz 0 ürün, durum ve test sözleşmesi

**Kaynak sürüm:** `main@65459a0`. **Platform:** Compose / API 36 minimum. Bu belge Android kodunun uygulanmış olduğunu iddia etmez; Faz 1–8'de test yazılabilecek kesin davranışları belirler.
**Kaynak denetimi:** [Faz 0 audit](LESSON_PLAYER_ANDROID_PHASE_0_AUDIT.md).
**Mimari:** [Compose ADR](LESSON_PLAYER_ANDROID_ARCHITECTURE.md).

## 1. Kullanıcı akışları ve ekran sınırları

| Ekran | Gösterir | Göstermez / sınır |
|---|---|---|
| Ders kitaplığı | 4 tema, ders başlıkları, basılı sayfalar, kaldığı ders/adım, çevrimdışı erişim | Yayımlanmamış içerik tahmini veya PDF'nin tam kopyası |
| Ders — öğretmen | kaynak/sayfa, soru/görev, katmanlar, önceki/sonraki, açık ders rehberi | Öğrenciye ait kişisel teslim/not alanı |
| Ders — sınıf sunumu | seçili gösterilebilir prompt/cevap/yönlendirme/kanıt/açıklama, dokunmatik kontroller, ders adımı | öğretmen note, rehber plan işaretleri, düzenleme alanı |
| Ders akışı | temaya göre adım listesi, basılı sayfa grupları, kararlı step ID | öğretmenin özel sırası dışında gizli canon değişikliği |
| Öğretmen rehberi | 4 tema seçimi ve birbirinden bağımsız 3 hat; yıllık öneri etiketleri | öğrenci bazlı teslim veya otomatik not hesabı |
| Düzenle | açık adımda prompt, layout, density, content, reveal, sıra, reset | cevap bankasını değiştirip ikinci kanonik kaynak yaratma |
| Ayarlar ve yedek | font/tema/ekran tercihleri, JSON export/import, içerik sürümü | otomatik web->Android localStorage erişimi |

**Ekran geçişleri:** Ders kitaplığı → ders; ders → adım listesi/rehber/
düzenle/sunum; alt paneller kapanınca aynı ders/adım/reveal ve scroll
bağlamı korunur. Android Geri sırası: modal/SAF → panel →
ders kitaplığı → sistemden çıkış. Öğretmen rehberi seçiminde
dersin lessonId/stepId'si değişmez. Sunumdan dönünce öğretmen
notları öğretmen ekranında erişilebilir kalır.

**Yerleşim:** kullanılabilir window size'a göre tek/çift sütun;
portrait/landscape tek başına responsive breakpoint değildir.
IME, Android navigation bar ve font scaling altında
önceki/sonraki asla erişilemez noktaya taşınmamalı.
Öğretmen ve sunum modunun tipografi/dokunma hiyerarşisi
ayrı; yalnızca aynı sayfanın zoom edilmiş kopyası yok.

## 2. Ders durumunun taşınması

```text
LessonSession:
  lessonId: stable lesson.lesson_id
  stepId: stable step.id
  order: complete unique permutation of lesson.steps[].id
  revealed: set of permitted RevealKey for effective step
  vocabularyTerms: { stepId: set of term keys }
  presentationMode: boolean
  overrides: { stepId: presentation-only diff }
  contentDigest: full canonical content identity
```

`LessonCommand`:
`OpenLesson(id)`, `GoToStep(id)`, `Next`, `Previous`,
`RevealNext`, `ToggleReveal(key)`, `ToggleTerm(stepId,term)`,
`ShowAllTerms`, `SetPresentationMode(bool)`,
`ApplyOverride(stepId,diff)`, `MoveStep(stepId,delta)`,
`ResetStep(stepId)`, `ResetLessonPresentation`.
Kotlin reducer saf; Room/SAF/Activity dahil edilmez.

**Geçişler:** first/last sınır clamp; adım değiştiğinde
`revealed` boş; `vocabularyTerms` mevcut webde adım bazında
saklanır, Next tüm sözlük durumunu silmez.
`RevealNext` reveal_order'daki ilk açılmamış key'i
açar; hepsi açıksa sonraki adıma geçer; sonda kalır.
Yerel prompt düzenlemesi `FLOW_OVERRIDE`
provenance ile flow export edilir. `source_limited`
kesin yanıt sınıfına yükseltilmez.

**Saklama:** şema ve akademik yıl namespace'i;
Room'da özel order/override/plan marks ve resume;
DataStore'da basit görüntü tercihleri.
`progress.stepId` authoritative; `index` yalnız
önceki web kaydından migration fallback.
En son bilinen sağlam veri üzerine geçersiz eski
düzenleme asla sessiz yazılmaz.

## 3. Projection güvenlik sözleşmesi

**Allowlist öğrenci DTO'su:** lessonId/stepId, izinli görünür
prompt veya answer gösterim durumu, izinli guidance/
evidence/explanation katmanları, görünür kelime-anlam
durumu, gerekli kaynak sayfası ve görünür structured content.

**İzin verilmeyenler:** note (kanonik `content.note` dahil),
`TeacherGuidePanel` işaretleri, editor view/controls,
backup/Room kayıtları, kimlik/şifre, gelecekteki sınıf,
öğrenci ve puan verileri.

Sunum yalnız UI flag'i ile saklama yapılmaz: `StudentProjection`
yalnız izinli alanları üreten saf fonksiyon ve ayrı DTO'dur.
Android sürümünde **cihaz dışına gönderim yoktur**.
Pi/Pardus'a gelecekte mesaj eklenecekse yalnız bu
projection kullanılabilir; ham `LessonSession` iletilemez.

## 4. Cross-runtime fixture adayları — gerçek kaynak ID'leri

Aşağıdaki ID'ler mevcut `*-flow.json` kaydından seçilmiştir.
Faz 2'de makinece test edilebilir ortak fixtures oluşturulacak,
Faz 3/4 Kotlin testlerine bağlanacak; bu doküman test sonucu değildir.

| Fixture | Kaynak ders / adım | Ne doğrular? |
|---|---|---|
| FX-01 | `T11-T01-KARAGOZ / s15-source-reminder` | cevapsız süreç adımı, source-only içerik, basılı s.15 |
| FX-02 | `T11-T01-KARAGOZ / s15-q1` | answer_id `T1-P15-Q01`, soru / reveal / prompt provenance |
| FX-03 | `T11-T01-KARAGOZ / s25-q1` | gerçek vocabulary renderer, tekil/toplu açma |
| FX-04 | `T11-T01-KARAGOZ / s26-reference` | note sızıntısı yok, dört başlıklı content.sections |
| FX-05 | `T11-T01-KARAGOZ / s27-q1` | comparison |
| FX-06 | `T11-T01-KARAGOZ / s30-q6` | structure |
| FX-07 | `T11-T01-KARAGOZ / s35-q1` | assessment |
| FX-08 | `T11-T02-GIRIS / s85-theme-presentation` | QR medya çevrimdışı garanti değil, öğretmen note |
| FX-09 | `T11-T03-HUZUR-OKUMA / s164-q1` | third-theme verified summary |
| FX-10 | `T11-T04-MERDIVEN-ANLAMA-266-270 / s266-vocabulary` | **adı vocabulary olsa da layout=structure**, layout'u step.id'den türetmeme |
| FX-11 | `T11-T03-DEGERLENDIRME-230-235 / s232-veli-chart` | referans/grafik içerik yapısının korunması |

Bunlara ayrı veri fixture'ları eklenecek: nested `answer_sections`,
iki elementli comparison, `source_limited`, custom step
permutation, stale signature, malformed import, blank answerless
process, uzun Türkçe metin, tanımsız optional/null.
Kaynak gerçek kayıtta desteklemediği bir örnek varsa
fabrika test fixture'ı olarak etiketlenecek, ders içeriğine
sessizce eklenmeyecek.

## 5. Üç takip hattı

Yıl bazında `workshop` işaretleri (8),
`annual` (5) ve `portfolio` (8 task + 4 reflection +
5 annual = 17) ayrı anahtar/varlıklardır. Annual
sunumları 1/1/1/2 tema eşlemesine sahiptir.
Seçili tema güncel dersle eşleşirse ilgili basılı
sayfa atölyesi vurgulanır; başka tema seçmek
ders navigasyonunu değiştirmez.
**Önerilen sunum tarihleri resmî teslim tarihi değildir.**

## 6. Faz 1 uygulama öncesi karar ve blokajlar

- **Karar verildi:** Compose + Material 3 ama özgün tasarım sistemi;
  Android16 API36 minimum; repo içi native app;
  dışa aktarma/import kullanıcı eylemiyle; offline.
- **Faz 1'de kesinleşecek:** kararlı Kotlin/AGP/Compose BOM,
  Gradle plugin/module sınırı, paket kimliği, ikon/tipografi
  tokenları ve CI/emülatör çalıştırma matrisi. Bunlar
  teyit edilmeden sürüm numarası veya sahte build sonucu yazılmaz.
- **Faz 2–3 kapısı:** tüm cevap içeriğiyle SHA-256 digest,
  eski web FNV signature ayrı migration hint, projection
  allowlist/recursive data parity.
- **Faz 6 kapısı:** webde global backup henüz yok;
  taşıma aracı sağlanıncaya kadar “web düzenlemeleri otomatik taşınır”
  sözü verilmez.
- **Kapsam dışı:** Pi/WebSocket/Pardus bağlantısı,
  internet zorunluluğu, öğrenci teslim/not veri tabanı,
  ders kitabının tam PDF'sini veya QR medyayı gömme.

## 7. Faz 0 çıkış kontrolü

**Doküman düzeyinde karşılandı:** mimari, mevcut↔hedef
davranış matrisi, içerik kimliği, fixture adayları,
görünüm/gezinti sınırları, veri ayrımı, kritik risk
ve çözüm fazları. Gerçek SDK kurulumu, build, Kotlin
unit tests, UI test ve APK teslimi **henüz yapılmadı**;
bunlar Faz 1–8'in bağımsız kapılarıdır.
