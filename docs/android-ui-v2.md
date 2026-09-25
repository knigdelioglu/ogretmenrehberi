# Android UI Shell V2 Sözleşmesi ve Tasarım Dokümantasyonu

Bu doküman, `apps/lesson-player-android` uygulamasının büyük landscape tablet odaklı **UI Shell V2** mimarisini, tasarım tokenlarını, layout hiyerarşisini, breakpoint sözleşmesini, etkileşim kurallarını ve görsel kabul kriterlerini tanımlar.

---

## 1. Tasarım Tokenları (Design Tokens)

Tüm renk ve arayüz sabitleri merkezi token dosyalarında (`io.github.knigdelioglu.lessonplayer.ui.theme.Tokens` ve `LessonTheme`) tanımlanmış olup composable fonksiyonlar içine doğrudan dağınık renk sabitleri (`Color(0x...)`) yazılmaz.

### 1.1 Renk Paleti (Color Tokens)

| Token Adı | Hex Değeri | Açıklama / Kullanım Alanı |
|---|---|---|
| `Primary` | `#5434D4` | Ana marka/eylem rengi, butonlar, seçili durumlar |
| `Header` | `#4C30B4` | Üst bağlam çubuğu zemin/vurgusu |
| `SidebarBg` | `#282054` | Sol koyu mor sidebar zemin rengi |
| `SidebarSurface` | `#2C245C` | Sidebar içindeki kart ve ayrım yüzeyleri |
| `SidebarActive` | `#CCC8FC` | Sidebar aktif sekme / aktif ders adımı vurgusu |
| `SidebarText` | `#FFFFFF` | Sidebar ana başlık ve ikon rengi |
| `SidebarSubtext` | `#A59FD6` | Sidebar ikincil metin ve sayaçlar |
| `AppBg` | `#F7F8FC` | Uygulama ana zemin rengi (hafif gri-mavi soft paper) |
| `Surface` | `#FFFFFF` | İçerik kartları ve çalışma alanı panelleri |
| `SurfaceSoft` | `#F3F4FA` | İkincil kartlar, alt başlıklar, hafif yüzeyler |
| `Border` | `#D9DDE8` | Kart kenarlıkları, tablo ve ayrım çizgileri |
| `TextPrimary` | `#171729` | Gövde ve başlıklar için yüksek kontrastlı ana metin |
| `TextSecondary` | `#676B7C` | İkincil açıklamalar, meta veriler, sayfa numaraları |

### 1.2 Semantik Öğretmen Destek Panelleri (Teacher Assist Semantic Surfaces)

Öğretmen destek panelleri ve reveal katmanları bağımsız semantik renk gruplarına sahiptir:

| Semantik Alan | Yüzey Rengi (Background) | Kenarlık (Border) | Metin Rengi (Text) | İlgili RevealKey |
|---|---|---|---|---|
| **Yönlendirme (Guidance)** | `#EBF3FE` (Soft Mavi) | `#C6DCFC` | `#164E8C` | `RevealKey.GUIDANCE` |
| **Cevap (Answer)** | `#EAF8F0` (Soft Yeşil) | `#BCE9CE` | `#145C32` | `RevealKey.ANSWER` |
| **Açıklama (Explanation)** | `#FFF4ED` (Soft Şeftali) | `#FCD3BD` | `#873809` | `RevealKey.EXPLANATION` |
| **Metinsel Kanıt (Evidence)** | `#F3EFFF` (Soft Lavanta) | `#D9CEFD` | `#4C2CA6` | `RevealKey.EVIDENCE` |
| **Öğretmen Notu (Note)** | `#FDF8EE` (Soft Kehribar) | `#F5E5BE` | `#734B0B` | `RevealKey.NOTE` |

### 1.3 Tipografi ve Boşluklar (Typography & Spacing)

- **Minimum Dokunma Hedefi (Touch Target):** `48.dp` (`LessonTarget.minimum`). Tüm tıklanabilir butonlar, sekmeler ve liste öğeleri bu kuralı karşılar.
- **Kart Köşe Yuvarlama:** `16.dp` ve `22.dp` (`LessonShape.card`).
- **Boşluklar (Spacing):** `tiny = 6.dp`, `small = 12.dp`, `medium = 18.dp`, `large = 24.dp`, `section = 32.dp`.

---

## 2. Shell Hiyerarşisi (3 Kolonlu Landscape Tablet Shell)

Geniş landscape tablette ekran 3 sabit dikey kolon ve üst/alt çubuklardan oluşur:

```
+-------------------+---------------------------------------------------+----------------------------+
|                   | HEADER + DERS FAZI STEPPER (ORTA KOLON)           | ÖĞRETMEN DESTEK PANELİ     |
+-------------------+---------------------------------------------------+                            +
| SOL SIDEBAR       | MERKEZ ÇALIŞMA ALANI (WORKSPACE)                  | SAĞ PANEL (TEACHER ASSIST) |
| (~%22 Genişlik)   | (~%56 Genişlik)                                   | (~%22 Genişlik)            |
|                   |                                                   |                            |
| [Uygulama Nav]    | [Soru / Başlık Kartı]                             | [Yönlendirme Paneli]       |
| • Dersler         |                                                   |                            |
| • Ders (Aktif)    | [Merkez Renderer - Bağımsız Kaydırılır]           | [Cevap Paneli]             |
| • Rehber          |   - Comparison (Tablo)                            |                            |
| • Ayarlar         |   - Structure (Şema / Numaralı Blok)              | [Açıklama Paneli]          |
|                   |   - Assessment (Seçenekler)                       |                            |
| [Ders Adımları]   |   - Vocabulary (Eşleştirme / Tahmin)              | [Metinsel Kanıt Paneli]    |
| • 1. Adım         |                                                   |                            |
| • 2. Adım (Seçili)|                                                   | [Öğretmen Notu]            |
| • 3. Adım ...     |                                                   |                            |
| (Sabit Zemin)     | (YALNIZCA BU MERKEZ ALAN DİKEY KAYAR)             |                            |
+-------------------+---------------------------------------------------+                            +
|                   | SABİT EYLEM ÇUBUĞU: Sunum / reveal / adım ilerletme|                            |
|                   |                                   [Önceki] [Sonraki]|                            |
+-------------------+---------------------------------------------------+----------------------------+
```

### 2.1 Bileşen Sorumlulukları ve Modüler Mimari

UI Shell V2 bileşenleri büyük tek dosya yerine modüler paketlerde toplanmıştır:
- `io.github.knigdelioglu.lessonplayer.ui.shell.LessonSidebar`: Sol koyu mor sidebar.
- `io.github.knigdelioglu.lessonplayer.ui.shell.LessonHeader`: Üst bağlam çubuğu, başlık ve ders fazı stepperı (`deriveLessonPhases`).
- `io.github.knigdelioglu.lessonplayer.ui.shell.LessonActionBar`: Alt sabit eylem çubuğu doğrudan kontrolleri.
- `io.github.knigdelioglu.lessonplayer.ui.lesson.TeacherAssistPane`: Sağ panel bağımsız semantik öğretmen kartları.

Geniş ders shell'inin kolon oranları, minimumları ve label eylem çubuğu genişliği `LessonShellLayoutContract` içinde tek kaynaktan yönetilir. `ExpandedLessonLayout`, gerçek shell ile 1280×800 önizlemenin kullandığı ortak composable'dır.

1. **Sol Koyu Mor Sidebar (`~%22`):**
   - Üst bölümde native uygulama sekmeleri yer alır (`Ders kitaplığı`, `Ders ekranı`, `Öğretmen rehberi`, `Veri ve yedekleme`). `Arama`, kitaplık ekranını açıp ders arama alanına odaklanır. `Kaldığım Yer`, başka ekrandayken mevcut `LessonSession` içindeki ders ve adıma döner.
   - Aktif ders oturumunda adımlar kısa canonical bağlam, içerik türü ve basılı sayfa ile listelenir (`lesson-outline-step-*`). Aktif adım açık lavanta yüzeyle vurgulanır. Gerçek completion kaydı olmadığı için yeşil tamamlandı işareti gösterilmez.
2. **Üst Bağlam Çubuğu & Kararlı Ders Fazları Stepperı (`LessonV2Header` & `deriveLessonPhases`):**
   - Sınıf düzeyi (`11. SINIF`), ders başlığı ve gerçek ders fazlarını gösteren `Stepper`.
   - Fazlar `session.order` içindeki ardışık kategori segmentlerinden oluşur. Kategori daha sonra yeniden gelirse yeni bir durak açılır; 30 adım için sabit bir faz üst sınırı yoktur.
   - Görsel durum yalnızca konumdan türetilen `PAST`, `ACTIVE` veya `UPCOMING` değeridir. Kaydedilmiş completion state olmadığı için `COMPLETED` veya ✓ kullanılmaz.
   - Stepper ince bağlantı çizgisi, dairesel noktalar ve noktaların altındaki kısa isimleri kullanır; aktif nokta mordur.
   - Şema veya database engine değiştirilmez; fazlar gerçek bir veri alanıymış gibi tanıtılmaz.
3. **Merkez Çalışma Alanı (Workspace, `~%56`):**
   - Bağımsız kaydırılan tek alandır (`LazyColumn`).
   - Soru kökü, yönerge, kaynak metin ve canonical etkinlik/tablo içeriği burada kalır. Üç kolon modunda cevap açmak merkez soruyu değiştirmez; `answer.answer` ve `answer_sections` merkezde tekrarlanmaz.
4. **Sağ Öğretmen Destek Paneli (Teacher Assist, `~%22`):**
   - Tam yüksekliğe sabitlenir ve kendi içeriği gerektiğinde bağımsız kayar. Yönlendirme, Cevap, Açıklama, Metinsel Kanıt ve varsa öğretmen notu ayrı kartlardır.
   - Üç kolon modunda açılan cevap ve karşılaştırma matrisi burada gösterilir. Merkez workspace bağımsız kayar.
    - **Engine RevealOrder Güvenliği ve No-op / Crash Önleme:** `LessonEngine.reduce()` motoru `ToggleReveal` komutlarında anahtarın `effectiveStep.revealOrder` içinde bulunmasını `require` eder (`require(command.key in step().revealOrder)`); aksi takdirde `IllegalArgumentException` fırlatılır. Bu doğrultuda `LessonV2TeacherAssistPane`, `LessonV2ActionBar`, `SessionLessonScreen` (dar mod kart içi cevap butonu ve fallback) ve `LessonLayouts` (`VocabularyMatchLayout`):
     - Yalnızca `effectiveStep.revealOrder` içinde yer alan **VE** ilgili veri içeriği (`guidance`, `answer`, `explanation`, `evidenceQuotes`, `content.note`) dolu olan katmanlar için kart ve eylem butonu üretir.
      - İçeriği dolu olsa dahi `revealOrder`'da `RevealKey.ANSWER` yoksa cevap butonu asla oluşturulmaz; böylece runtime motor çökmesi ve sahte no-op eylemler kesin olarak engellenir.
      - **Öğretmen Notu Ayrımı ve Güvenli İlerleme Sözleşmesi:** Öğretmen notu (`content.note`) öğrenci projeksiyonuna (`StudentProjection`) asla dahil edilmez.
      - **RevealNext Güvenliği:** Shell (`LessonActionBar`), `SessionLessonScreen` ve `PresentationLessonScreen` ekranlarında sıradaki eylem (`nextLessonCommand`, `nextLessonActionLabel`) yalnızca public reveal anahtarlarını (`GUIDANCE`, `ANSWER`, `EXPLANATION`, `EVIDENCE`) işler. `RevealKey.NOTE` önde ya da tek başına tanımlı olsa dahi eylem tarafından tamamen atlanır; asla `ToggleReveal(NOTE)` dispatch üretilmez veya "Göster: Öğretmen notu" etiketi sunulmaz.
      - `NOTE`'un ardından `GUIDANCE` veya `ANSWER` geliyorsa sıradaki public katman açılır; public reveal katmanları bittiğinde sonraki adıma geçilir. Son adımda ilerletme eylemi devre dışı kalır ve "Son adım" etiketi gösterilir; completion iddiası üretilmez. Sağ panelde (`TeacherNoteCard`) öğretmen notu açıkça "YALNIZCA ÖĞRETMEN" etiketiyle yerel aç/kapa kartıdır. Öğrenci durum rozeti veya `ToggleReveal(NOTE)` dispatch'i üretilmez.
     - Hiçbir öğretmen içeriği bulunmayan adımlarda temiz ve dürüst bir bilgilendirme yüzeyi (`teacher-assist-empty-info`) sunulur; hayali buton veya no-op buton oluşturulmaz.
   - Kartların açık/kapalı durumu geçici UI state'idir; ancak reveal durumu (`RevealKey`) `LessonSession.revealed` içindeki tek gerçek kaynaktır (single source of truth).
5. **Alt Sabit Eylem Çubuğu (`LessonV2ActionBar`):**
   - Ekranın altında sabit durur. Merkez alan yeterliyse `Öğrenciye Göster`, `Yönlendirme`, `Cevap`, `Açıklama`, `Metinsel Kanıt`, `Önceki` ve `Sonraki` kısa etiketlerle görünür; daha dar modda reveal kontrolleri ikonlara döner.
   - Reveal butonları renk ve `stateDescription` ile açık/kapalı bilgisini verir; yüzeyde uzun “Göster/Gizle” metni yoktur. Merkez kolon `640 dp × fontScale` eylem alanını sağlayabildiğinde etiketler görünür; dar alanda ikon fallback kullanılır. UI katmanında generic `LessonCommand.RevealNext` kullanılmaz; sıradaki eylem yalnızca public reveal anahtarlarını ve sonra `Next` komutunu tetikler.
   - **No-op Engelleme:** Adımda ilgili alan veya `effectiveStep.revealOrder` anahtarı yoksa ilgili buton gösterilmez veya devre dışı bırakılır; hiçbir kontrol enabled no-op olamaz.
   - Tüm kontroller `LessonTarget.minimum` (`48.dp`) erişilebilirlik standardına uygundur.

### 2.2 Öğretmen Düzenlemeleri (Overrides) ve `effectiveStep` Türetim Sözleşmesi

Öğretmen düzenlemeleri (`LessonCommand.ApplyOverride`, `session.overrides`), adımların soru metnini (`displayPrompt`), görsel yoğunluğunu (`density`), yönerge ve notlarını (`content`) veya açılış sırasını (`revealOrder`) dinamik olarak güncelleyebilir.
- Shell katmanında (`LessonPlayerShell`), `session.lessonId` üzerinden ders alınırken adımlar tek bir merkezi noktada dönüştürülür:
  ```kotlin
  val effectiveLesson = remember(rawLesson, session.overrides) {
      rawLesson?.let { lesson ->
          lesson.copy(
              steps = lesson.steps.map { step ->
                  LessonEngine.effectiveStep(step, session.overrides[step.id])
              }
          )
      }
  }
  val currentStep = effectiveLesson?.steps?.firstOrNull { it.id == session.stepId }
  ```
- Bu türetim sayesinde `LessonV2Sidebar` (güncel displayPrompt ile liste), `LessonV2Header` (güncel pedagojik fazlar), `LessonV2TeacherAssistPane` (güncel revealOrder ve notlar), `LessonV2ActionBar` (güncel eylemler) ve fallback Drawer/Sheet yapıları doğrudan **en güncel effective veriyi** tüketir; öğretmen düzenlemesi sonrası arayüzde eski içerik veya geçersiz/çökmeye yol açan komut kalmaz.

### 2.3 Merkez Renderer ve Veri Anlamı Sözleşmesi (Data Semantics Contract)

Kanonik ders verisi (`remote-content/lessons.json`) doğrudan MEB ders kitabı ve TYMM kazanımlarına dayanmaktadır. Görselleştirme sırasında veri bütünlüğü şu sınırlamalara tabidir:

1. **ASSESSMENT Düzeni ve Ölçüt Sınırlaması:**
   - `content.items` alanı **asla çoktan seçmeli bir test şıkkı (alternatif) değildir**. Değerlendirme kriteri ve öğrenci odak yönergesidir (örneğin `s35-q1` adımında Karagöz Yazıcı metninde dil ve üslubun anlama katkısının 3 boyutu: güldürü, çatışma, toplumsal yapı).
   - Bu maddelere **A/B/C etiketi veya radyo/seçim davranışı verilmez**.
   - Gerçek çoktan seçmeli alternatif alanı veri sözleşmesinde bulunmadığı için maddeler **numaralı değerlendirme ölçütü kartı** (`01`, `02`...) olarak sunulur.
2. **COMPARISON Düzeni ve Tablo Eşleştirme Sınırlaması:**
   - `content.items` alanı çoğunlukla yönerge niteliğindedir; yapay bir ölçüt sütununa zorlanmaz.
   - Canonical `content.sections` kaynak karşılaştırması olarak merkezde kalır. `answer.answer_sections` yalnızca cevap açılınca görünür; üç kolon modunda sağ öğretmen panelinde gerçek satır/sütun matrisi olur. Top-level varlıklar sütun, nested key birleşimi satır ölçütüdür. Düz nesne iki sütunlu tablo kullanır.
   - Cevap kapalıyken `answer_sections` render modeline verilmez. Dar/portre öğretmen görünümünde mevcut inline cevap davranışı korunur.
   - Kaynakta yapılandırılmış karşılaştırma yoksa başlık ve yönerge metni olarak dürüstçe gösterilir; sahte sütun veya örnek içerik uydurulmaz.
3. **STRUCTURE Düzeni:**
   - Numaralı akış düğümleri, yön göstergeleri ve hiyerarşik yapı blokları şeması.
4. **VOCABULARY Düzeni:**
   - `answer.answer_sections` içindeki terimler, bağlamdan tahmin istemi ve `LessonCommand.ToggleTerm` akışı.

---

## 3. Ekran Breakpoint Sözleşmesi

Karar `WindowInsets.safeDrawing` çıkarıldıktan sonra kalan gerçek içerik alanıyla verilir. Yalnızca landscape/uzunluk şartı değil, üç kolonun ağırlıklardan hesaplanan minimumları da sağlanmalıdır:

- Kolon oranları: sidebar `22`, workspace `56`, teacher assist `22`.
- Minimum usable kolon genişlikleri: sidebar `240 dp`, workspace `680 dp`, teacher assist `280 dp`.
- Minimum usable landscape yüksekliği: `560 dp`.
- Bu alanlar sağlanmıyorsa teacher-assist drawer kullanılır; dikey veya kısa pencerede bottom sheet kullanılır.
- Bu nedenle `1280×800` sıfır-inset Preview üç kolon gösterir. Runtime, safe drawing inset'leri çıktıktan sonra minimumlar sağlanmıyorsa drawer'a düşebilir.

Adaptif geçiş kuralları:

| Breakpoint / Mod | Ekran Genişliği ve Yönelim | Shell Düzeni ve Öğretmen Araçları Erişimi |
|---|---|---|
| **Expanded 3-column** | `LessonShellLayoutContract.fitsThreeColumns(usableWidthDp, usableHeightDp, isLandscape)` | Sabit koyu mor sidebar (`22%`), orta workspace (`56%`) ve tam yüksekliğe sabit sağ öğretmen paneli (`22%`). Header ve alt eylem çubuğu orta kolonda kalır. |
| **Landscape drawer** | Landscape ve en az `560 dp` usable yükseklik; üç kolon minimumlarından biri sağlanmıyor | Navigasyon rayı + merkez çalışma alanı; öğretmen paneli TopBar/merkez erişimiyle sağdan açılan drawer olur. |
| **Compact / Dikey (Portrait)** | Dikey yönelim veya usable yükseklik `< 560 dp` | Standart mobil alt navigasyon barı (`NavigationBar`) + merkez tam genişlik içerik. Öğretmen araçları TopBar/merkez erişimiyle bottom sheet açar. |

---

## 4. Fiziksel Cihaz Ölçümü ve Beklenen Metrikler

Hedef tabletin `maxWidth`, `maxHeight`, `density` ve `fontScale` değerleri cihazdan ölçülmelidir; Preview boyutları fiziksel cihaz ölçümü yerine geçmez. Layout kararları usable pencere ölçülerini kullanır ve cihazdan bağımsız test edilir.

### Fiziksel Cihaz Ölçümü Nasıl Alınır?

Fiziksel cihaz veya donanım bağlandığında aşağıdaki yöntemlerle kesin değerler kaydedilmelidir:

1. **Terminal / ADB ile:**
   ```bash
   adb shell wm size
   # Çıktı örneği: Physical size: 2560x1600

   adb shell wm density
   # Çıktı örneği: Physical density: 320
   ```

2. **Kotlin / Jetpack Compose Runtime İçinden Loglama:**
   ```kotlin
   val configuration = LocalConfiguration.current
   val density = LocalDensity.current
   val screenWidthDp = configuration.screenWidthDp
   val screenHeightDp = configuration.screenHeightDp
   val densityDpi = density.density * 160f
   val fontScale = density.fontScale

   Log.i("DeviceMetrics", "W=${screenWidthDp}dp, H=${screenHeightDp}dp, density=${density.density}, dpi=${densityDpi}, fontScale=${fontScale}")
   ```

3. **Ölçümler Alındığında Güncelleme:**
   Fiziksel cihaz değerleri elde edildiğinde `LessonWindowLayoutTest` içine ilgili piksel ve dp değerleri tam regresyon senaryosu olarak eklenecektir.

---

## 5. Görsel Kabul Kriterleri (Visual Acceptance Criteria)

1. **Kontrast Oranı (WCAG 2.1 AA):**
   - Tüm gövde metinleri arka plan üzerinde en az **4.5:1** kontrast oranına sahiptir.
   - Büyük başlıklar ve etkileşimli kenarlıklar en az **3.0:1** kontrast oranına sahiptir.
   - `LessonThemeContrastTest` birim testi ile otomatik doğrulanır.
2. **Dokunma Hedefi Erişilebilirliği:**
   - Bütün buton, sekme, kart açma/kapatma tetikleyicileri dikeyde ve yatayda en az **48.dp** (`LessonTarget.minimum`) dokunma alanına sahiptir.
3. **Semantik ve Erişilebilirlik Nitelikleri:**
   - Açılır/kapanır öğretmen panelleri ve adımlar `Modifier.semantics` ile `selected`, `stateDescription = "Açık"` / `"Kapalı"` değerlerini taşır.
4. **Bağımsız Scroll:**
   - Sol sidebar ve sağ öğretmen paneli sabit durur; sadece merkez içerik alanı dikey kayar.
5. **Öğrenci Güvenliği (Projection Isolation):**
   - Sınıf sunumu (`PresentationLessonScreen`) açıldığında yalnızca `toStudentProjection` allowlist'indeki alanlar görünür; öğretmen notları veya rehber kontrolleri öğrenci ekranına kesinlikle sızmaz.

---

## 6. Doğrulama ve Test Kanıtı Ayrımı (Verification Matrix)

> [!IMPORTANT]
> Projede harici screenshot/golden test altyapısı (Paparazzi, Roborazzi, Shot vb.) yer almamaktadır.
> Depo kararlılığı ve mimari kurallar uyarınca lüzumsuz üçüncü parti bağımlılıklar eklenmemiştir.
> Doğrulama ve regresyon güvencesi 3 ayrık ve tamamlayıcı katman üzerinden sağlanır:

### 6.1 Katman 1: JVM Tabanlı Birim ve Sözleşme Testleri
- **Test komutu:** `./gradlew testDebugUnitTest`
- **Kapsam:**
  - `LessonWindowLayoutTest`: Breakpoint, 3-kolon, drawer ve bottom sheet yönlendirme kararlarının pencere boyutlarına göre doğrulanması.
  - `LessonThemeContrastTest`: WCAG 2.1 AA (4.5:1 ve 3.0:1) kontrast oranlarının otomatik matematiksel doğrulaması.
  - `LessonShellV2Test`:
    - `deriveLessonPhases`: ardışık kategori segmentleri; `A A B B A → A / B / A`; konumdan türeyen geçmiş/aktif/sıradaki durumlar ve ileri adıma atlamada sahte completion olmaması.
    - `fallbackTeacherAssistResponsiveRoutingContract`: Farklı form faktörlerinde doğru bileşene (Drawer vs. Bottom Sheet vs. Sabit Panel) yönlendirme sözleşmesi.
    - `fallbackDrawerAndSheetMutateSharedSessionRevealedWithoutStateDivergence`: Drawer veya Sheet kapatılsa dahi reveal durumunun tek gerçek kaynağı (`LessonSession.revealed`) üzerinden yönetilmesi ve durum ayrışması olmaması.
    - No-op engelleme kuralları ve doğrudan reveal komutları.
    - Sınıf projeksiyonu (`toStudentProjection`) öğretmen notu ve cevap sızdırmazlık doğrulaması.
    - `ASSESSMENT` ölçüt kartları, nested comparison nesnesinden gerçek matrix modeli, kapalı cevap sızıntısı olmaması ve üç kolonda cevap tekrarının engellenmesi.
    - Öğretmen notunun açık olsa bile `StudentProjection` içine girmemesi.
    - `1280×800` çalışma alanı genişliğinde action-bar metinlerinin sığma kararı.

### 6.2 Katman 2: Jetpack Compose Önizleme (Preview) Matrisi
- **Dosya:** `apps/lesson-player-android/app/src/main/java/io/github/knigdelioglu/lessonplayer/ui/Previews.kt`
- **Kapsam:** Expanded shell'de sahte kolon önizlemesi kullanılmaz; gerçek `LessonData`, `LessonSession` ve zengin Türkçe içerikle oluşturulan senaryolar:
  1. `05 · UI Shell V2 3-Column Tablet (Expanded)` (1280×800): Runtime ile aynı `ExpandedLessonLayout` ve gerçek `LessonV2Sidebar`, `LessonV2Header`, `SessionLessonScreen`, `LessonV2TeacherAssistPane` ve `LessonV2ActionBar`; yazılı reveal kontrolleri görünür.
  2. `06 · UI Shell V2 Medium Tablet with Assist Drawer` (900x600): Gerçek sağdan açılan `LessonTeacherAssistDrawer` ve fallback ekranı.
  3. `07 · UI Shell V2 Portrait Compact with Assist Sheet` (412x915): Gerçek dikey mod ve alttan açılan `LessonTeacherAssistSheet`.

### 6.3 Katman 3: Emülatör ve Cihaz Manuel Duman (Smoke) Matrisi
- **Build komutu:** `./gradlew assembleDebug`
- **Doğrulama adımları:**
  1. **Landscape Tablet (Geniş):** Uygulama açılır; sol koyu mor sidebar, üst stepper, merkez kayan alan, sağ öğretmen destek kartları ve sabit alt barın 3-kolon düzeninde render edildiği gözlenir.
  2. **Ekran Döndürme / Boyut Değişimi:**
     - Geniş ekrandan medium ekrana geçildiğinde sağ panelin kapandığı, topBar'daki veya merkez karttaki "Öğretmen Araçları" butonu ile sağ Drawer'ın açıldığı test edilir.
     - Cihaz dikey (portrait) konuma alındığında alt navigasyon çubuğu ve merkez içeriğin geldiği, "Öğretmen Araçları" butonunun alttan Bottom Sheet açtığı doğrulanır.
  3. **Reveal Bütünlüğü:** Drawer veya Bottom Sheet içinden açılan bir cevabın (ör. `ToggleReveal(ANSWER)`), panel kapatılıp tekrar açıldığında veya sunum moduna geçildiğinde durumunu kaybetmediği doğrulanır.
