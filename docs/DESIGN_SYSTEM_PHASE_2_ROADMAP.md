# ÖğretmenRehberi Tasarım Sistemi — Aşama 2 Yol Haritası ve Bileşen Geçiş Planı

Bu doküman, Aşama 1'de temelleri ve token altyapısı kurulan **ÖğretmenRehberi Tasarım Sistemi (ORDS)**'nin sonraki aşamalarda (Aşama 2+) arayüzlere güvenle yayılması için hazırlanmış yol haritasını, bileşen hazırlık matrisini ve risk yönetim planını sunar.

---

## 1. Bileşen Hazırlık ve Geçiş Matrisi (Component Readiness Matrix)

| Bileşen | Uygulama | Mevcut Durum | Aşama 2 Hazırlık Düzeyi | Geçiş Adımları ve Dikkat Edilecek Noktalar |
|---|---|---|---|---|
| **RevealPanel** | `lesson-player` | Hex renkler (`#9a752f`, `#6250a6`, `#805c4c`) doğrudan CSS içinde. | **HAZIR** (Yüksek) | Semantik tokenlara (`--ords-color-[tone]`) bağlandı. Aşama 2'de animasyonlu açılış için Arc spring/ease eklenebilir. |
| **LessonToolbar / Topbar** | `lesson-player` | Koyu yeşil (`#24332e`), butonlar `rgb(255 255 255 / 0.10)`. | **HAZIR** (Yüksek) | `--ords-color-surface-raised` veya koyu tema tokenlarına bağlanacak. Butonlar standart buton bileşenine dönüştürülecek. |
| **LessonOutline** | `lesson-player` | Bej zemin (`#e9e5da`), özel liste elemanı stilleri. | **HAZIR** (Yüksek) | Koyu/açık tema tokenları ile modern QA yan paneli stiline hizalanacak. |
| **StepView & ContentLayout** | `lesson-player` | Geniş layout yapısı, süreç ve rubrik tabloları. | **ORTA** | Tablo ve kart yapıları standart `--ords-color-surface` ve `--ords-radius-lg` kartlarına dönüştürülecek. |
| **Slide QA Shell** | `sunum-web` | Modern QA (`.slide--qa-modern`) zaten sistemin omurgası. | **TAM HAZIR** | Mevcut davranış korunacak; harici `--modern-*` değişkenleri `--ords-*` ile tam eşlenik çalışacak. |
| **Eski Parşömen Slaytları** | `sunum-web` | `.slide:not(.slide--qa-modern)` seçicili eski kartlar. | **ORTA** | Kademeli olarak parşömen arkaplanı yerine `--ords-color-bg-app` ve modern kart şablonuna taşınacak. |
| **Sözlük / Lugat Kartları** | `sunum-web` & `player` | Farklı `.vocab` ve `.dict` HTML yapıları. | **ORTA** | Her iki uygulamada ortak sözlük kartı semantiği ve 3'lü terim hiyerarşisi uygulanacak. |
| **Ölçme ve Değerlendirme (Rubrik/Ölçek)** | `sunum-web` & `player` | `.scale-form` ve `.rubric-table` CSS tabloları. | **ORTA** | Puanlama hücreleri ve seviye kutucukları standart durum tokenlarına (`--ords-color-success`, vb.) bağlanacak. |
| **Çizim / Kalem Araç Çubuğu** | `sunum-web` & `player` | Yüzen butonlar, kalem/silgi/renk seçimi. | **HAZIR** (Yüksek) | Arc floating toolbar kalıbı (`--ords-shadow-floating`, hap şekilli kapsayıcı) ile modernize edilecek. |
| **Dışa Aktarma Diyaloğu (PPTX)** | Her ikisi | Modal diyalog penceresi. | **HAZIR** (Yüksek) | Standart `--ords-radius-xl` modal kartı ve buton hiyerarşisi ile güncellenecek. |
| **Android Shell & Header** | `android` | Mor V2 teması (`Primary = #5434D4`). | **HAZIR** (Planlandı) | Renk paleti Compose `LessonColors` içinde ortak Teal markasına ve altın yönlendirme rengine hizalanacak. |
| **TeacherAssistPane** | `android` | Sağ sabit destek paneli. | **HAZIR** (Planlandı) | Semantik paneller (Rehber, Cevap, Kanıt, Açıklama, Not) ORDS tokenları ile 1:1 renklendirilecek. |

---

## 2. Kademeli Uygulama Planı (Phase 2 Phased Plan)

### Aşama 2A: React Lesson Player Bileşen Modernizasyonu
1. **Hedef:** `apps/lesson-player` içindeki dağınık 112 hex rengi tamamen temizlemek ve tüm bileşenleri (`StepView`, `RevealPanel`, `LessonOutline`, `LessonToolbar`) ortak `--ords-*` tokenlarına bağlamak.
2. **Kazanım:** Web Player'ın görünümü modern QA ile birebir aynı pedagojik renk kodlamasına kavuşacak.
3. **Güvence:** Kanonik veri (`build-lesson-data.mjs`), testler (`test-lesson-data.mjs`) ve PPTX ihracat testleri etkilenmeyecek.

### Aşama 2B: Web Sunumu Eski Slayt Konsolidasyonu
1. **Hedef:** `apps/sunum-web` içindeki `.slide:not(.slide--qa-modern)` seçicilerini ve eski parşömen kalıntılarını güvenle kaldırarak tüm slayt tiplerini (süreç, başvuru, değerlendirme) modern QA kabuğu ile birleştirmek.
2. **Kazanım:** CSS dosyasındaki yüzlerce satırlık yüksek özgüllüklü seçici çatışması temizlenecek, dosya boyutu küçülecektir.
3. **Güvence:** 718 soru adımını kapsayan Chrome tarayıcı regresyon testi ve PPTX görüntü yakalama doğrulaması korunacak.

### Aşama 2C: Android Jetpack Compose Tematik Hizalama
1. **Hedef:** `Tokens.kt` ve `LessonTheme.kt` içindeki mor renk tabanını ortak Teal (`#176d68`) ve altın yönlendirme (`#9a650f`) renklerine çekmek.
2. **Kazanım:** Tablet uygulaması ile sınıf tahtası sunumu arasında tam bir görsel bütünlük sağlanacak; öğretmen sınıftan tablete geçtiğinde hiçbir renk çelişkisi yaşamayacak.
3. **Güvence:** Compose UI testleri (`connectedDebugAndroidTest`), Material3 tipografi ve 48dp erişilebilirlik sınırları korunacak.

---

## 3. Risk Yönetimi ve Değişmezlerin Korunması (Invariant Safeguards)

Aşama 2 yürütülürken aşağıdaki sınırların ihlal edilmemesi şarttır:

1. **Çevrimdışı ve Service Worker Güvenliği:**
   - `apps/sunum-web/src/sw.js` ve derleme betiğindeki `offlineCore` önbellekleme listesi bağımlılık eklenerek bozulmamalıdır.
2. **PowerPoint (PPTX) Dışa Aktarım Bütünlüğü:**
   - PPTX motoru slaytları HTML canvas üzerinden piksel piksel çeker. Slayt üzerinde çalışan CSS animasyonları veya view transitions, yakalama sırasında (`__qaPptxCaptureProbe`) kesinlikle devre dışı kalmalıdır.
3. **Kanonik Veri ve Pedagojik Mantık:**
   - `data/grade-11/presentation/` ve `data/grade-11/source/` altındaki ders verileri, alıntı eşlemeleri ve pedagojik akışlar salt arayüz değişikliği uğruna değiştirilemez.
4. **Kumanda ve Kalem Modu:**
   - Akıllı tahta kumandasının (klavye yön tuşları, PageUp/PageDown) adım ilerletme mantığı ve serbest çizim tuvali (`#drawing-canvas`) katmanlama hiyerarşisi korunmalıdır.
