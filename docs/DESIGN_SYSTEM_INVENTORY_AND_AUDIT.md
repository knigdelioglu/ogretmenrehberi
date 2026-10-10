# ÖğretmenRehberi Tasarım Sistemi Envanteri ve Mevcut Durum Denetimi (Aşama 1)

Bu doküman, **ÖğretmenRehberi** ekosistemini oluşturan üç uygulamanın (`apps/sunum-web`, `apps/lesson-player`, `apps/lesson-player-android`) mevcut arayüz bileşenlerini, tasarım tokenlarını, tipografisini, renk paletlerini, boşluk sistemini, animasyon ve etkileşim kalıplarını ayrıntılı olarak inceler. [Arc Library](https://github.com/kuratlielia/arc-library) tasarım yaklaşımı, bileşen organizasyonu ve sakin hareket (calm motion) ilkeleri referans alınarak; var olan başarılı modern örüntüler (özellikle modern QA tasarımı) değerlendirilmiş ve ortak tasarım sisteminin temelleri ortaya konmuştur.

---

## 1. Üç Uygulamanın Mimari ve Arayüz Envanteri

### 1.1 Web Sunumu (`apps/sunum-web`)

| Nitelik | Mevcut Durum |
|---|---|
| **Mimari Yapı** | Sıfır harici çalışma zamanı kütüphanesi (Vanilla ES Modules), saf Web API, Service Worker çevrimdışı önbellekleme (`src/sw.js`). |
| **Arayüz Modeli** | 1920×1080 sanal tuval (`--canvas-scale` ile dinamik ölçeklenen sabit oranlı sunum sahnesi). Akıllı tahta ve projeksiyon öncelikli. |
| **Stil Dosyası** | `apps/sunum-web/src/styles.css` (2961 satır tekil stil tablosu). |
| **Tipografi** | `@font-face` ile yerel `Inter Variable` woff2 (modern QA ve gövde), sistem sans-serif fallbacks, edebî alıntılar için yerel serif font yığını (`Iowan Old Style`, `Palatino Linotype`, `Georgia`). |
| **Renk Mimarisi** | `:root` ve `:root[data-theme="dark"]` içinde çift katmanlı palet: Klasik tuval değişkenleri (`--paper`, `--ink`, `--rule`) ve modern QA değişkenleri (`--modern-paper`, `--modern-card`, `--modern-teal`, vb.). |
| **Bileşen Envanteri** | Sunum tuvali (`#canvas`), kumanda çubuğu (`#dock`), içerik menüsü (`#menu`), şifre giriş kartı (`.gate`), soru-cevap kabuğu (`.slide--qa-modern`), karşılaştırma tablosu (`.slide--qa-comparison`), yapı kartları (`.slide--visual-structure`), sözlük listesi (`.vocab`, `.dict`), rubrik ve akran değerlendirme ölçekleri (`.scale-form`, `.rubric`), çizim/kalem katmanı (`#drawing-canvas`), PPTX dışa aktarım motoru (`pptx-export.js`). |
| **Etkileşim Kalıpları** | Klavye ok tuşları, PageUp/PageDown, Space, tıklama/dokunma ile aşamalı açılma (reveal sequence), view transitions (`qa-question`), tam ekran modu (`F`), kalem/çizim modu (`D`), uzaktan kumanda senkronizasyonu. |

### 1.2 React Lesson Player (`apps/lesson-player`)

| Nitelik | Mevcut Durum |
|---|---|
| **Mimari Yapı** | React 19 + TypeScript + Vite, derleme zamanında üretilen kanonik veri (`src/generated/lessons.json`). |
| **Arayüz Modeli** | Akışkan 2/3 kolonlu masaüstü ve tablet arayüzü (`.app-shell`: sol içindekiler çekmecesi, merkez ders çalışma alanı, sağ öğretmen rehber paneli). |
| **Stil Dosyası** | `apps/lesson-player/src/styles.css` (2652 satır tekil stil tablosu). |
| **Tipografi** | `Inter`, sistem UI sans-serif. |
| **Renk Mimarisi** | `:root` içinde sınırlı değişkenler (`--paper: #fffdf8`, `--ink: #1f2522`, `--accent: #315e54`, `--warm: #9a5d2f`); bileşenlerde yaygın doğrudan hex kodları (112 farklı hex). Kapsamlı dark mode tokenları henüz tanımlı değil. |
| **Bileşen Envanteri** | `App.tsx` (ana shell), `LessonToolbar.tsx` (üst kontrol çubuğu), `LessonOutline.tsx` (sol adım navigasyonu), `StepView.tsx` (adım konteyneri), `StepContentLayout.tsx` (içerik renderı), `RevealPanel.tsx` (aşama panelleri: answer, guidance, evidence, explanation, note), `TeacherGuidePanel.tsx` (öğretmen yıllık plan/atölye paneli), `StructuredSections.tsx` (yapılandırılmış bölümler), `AnnotationOverlay.tsx` (serbest çizim katmanı), `ExportDialog.tsx` (PPTX dışa aktarma diyaloğu). |
| **Etkileşim Kalıpları** | Tab tuşu odaklanması (`:focus-visible`), adım navigasyonu butonları, açma/kapama panelleri, serbest kalem çizimi, PPTX rasterlaştırma planlayıcısı. |

### 1.3 Android Uygulaması (`apps/lesson-player-android`)

| Nitelik | Mevcut Durum |
|---|---|
| **Mimari Yapı** | Kotlin + Jetpack Compose (Material3), Android 16 (API 36) hedefli, Room veritabanı, yerel JSON varlıkları (`assets/lesson-player/`). |
| **Arayüz Modeli** | Büyük landscape tablet odaklı 3 kolonlu UI Shell V2 (`LessonSidebar`: ~%22, `Merkez Çalışma Alanı`: ~%56, `TeacherAssistPane`: ~%22). |
| **Tasarım Dosyaları** | `Tokens.kt` (`LessonColors`, `LessonSpacing`, `LessonShape`, `LessonTarget`, `LessonVisualDensity`) ve `LessonTheme.kt` (`LessonTheme`, `Light`, `Dark`, `LessonTypography`). |
| **Tipografi** | Jetpack Compose `Typography` ölçeği (Material3 tipografi stilleri: headlineLarge 30sp'den labelSmall 11sp'ye). |
| **Renk Mimarisi** | `LessonColors` nesnesinde V2 Core Palette: `Primary` (`#5434D4`), `Header` (`#4C30B4`), `SidebarBg` (`#282054`), `AppBg` (`#F7F8FC`), `Surface` (`#FFFFFF`). Semantik destek yüzeyleri: Rehber (`#EBF3FE`), Cevap (`#EAF8F0`), Açıklama (`#FFF4ED`), Kanıt (`#F3EFFF`), Not (`#FDF8EE`). |
| **Bileşen Envanteri** | `LessonSidebar` (sol koyu renk navigasyon), `LessonHeader` (orta kolon faz göstergesi), `PresentationLessonScreen` (öğrenci odaklı tam ekran modu), `TeacherAssistPane` (sağ semantik açılır destek panelleri), `SessionLessonScreen` (öğretmen kontrol görünümü), `LessonEditorPanel` (öğretmen notu düzenleyici). |
| **Etkileşim Kalıpları** | Minimum 48dp dokunma hedefleri (`LessonTarget.minimum`), dikey bağımsız kaydırma (yalnızca merkez alan kayar, yan paneller sabittir), jest ve buton navigasyonu. |

---

## 2. Eski ve Yeni Tasarımların Birlikte Bulunduğu Alanlar ve Sorunlar

### 2.1 Web Sunumunda İki Tasarım Çağının Çatışması (Legacy Canvas vs Modern QA)

`apps/sunum-web/src/styles.css` incelendiğinde iki farklı görsel dönemin iç içe yaşadığı görülmektedir:

1. **Klasik Parşömen Dönemi (Legacy Canvas):**
   - Bej/krem renkli parşömen arkaplanı (`--paper: #f5f2ea`, `--paper-2: #ebe6d9`, `--rule: #d8d1c0`).
   - Edebî/klasik serif yazı tipleri (`Iowan Old Style`, `Palatino Linotype`).
   - Yoğun gölgeler, kalın çerçeveler ve doğrudan metin blokları.
2. **Modern QA Dönemi (Modern Question/Answer Shell):**
   - Temiz, havadar yüzey paleti (`--modern-paper: #f7f8f5`, `--modern-card: #ffffff`, `--modern-rule: #d7e0df`, `--modern-ink: #182a35`).
   - Akıllı tahtada üstün okunabilirlik sağlayan `Inter Variable` yazı tipi (`--modern-font`).
   - Pedagojik olarak ayrışmış renk kodlaması: Cevap (Teal `#176d68`), Kanıt (Mavi `#5363a7`), Yönlendirme (Altın `#9a650f`), Açıklama (Mor `#765494`).
   - Yumuşak köşe yuvarlatmaları (`18px` - `22px`) ve sakin kart gölgeleri.
   - Sayfalar arası geçiş sürekliliği sağlayan View Transitions (`qa-question`).

#### Tespit Edilen Seçici Savaşları (Selector Battles):
Stil dosyasında eski ve yeni kuralları ayırmak için çok sayıda karmaşık ve yüksek özgüllüklü (high-specificity) seçici kullanılmaktadır:
```css
/* Örnek: Negatif pseudoclass çatışmaları */
.slide:not(.slide--qa-modern):has(ul.criteria):not(:has(.scale-form)) { ... }
.slide--qa-modern:has(ul.criteria):not(:has(.scale-form)) { ... }
.slide:not(.slide--qa-modern):has(.dict) { ... }
.slide--qa-modern:has(.dict) { ... }
```
Bu durum CSS bakımını zorlaştırmakta, kod tekrarı yaratmakta ve yeni bileşen eklenirken beklenmeyen stil ezilmelerine (style leakage) yol açabilmektedir.

### 2.2 Uygulamalar Arası Renk ve Anlam Tutarsızlıkları

Üç uygulama bağımsız geliştirildiği için semantik renklerde ciddi tutarsızlıklar oluşmuştur:

| Anlamsal Rol | Web Sunumu (Modern QA) | React Lesson Player | Android (LessonColors) | Tespit Edilen Çelişki |
|---|---|---|---|---|
| **Ana Marka / Primary** | Teal (`#176d68`) | Pine/Teal (`#315e54`) | Derin Mor (`#5434D4`) | Web ve Android tamamen farklı marka renkleri kullanmaktadır. |
| **Yönlendirme (Guidance)** | Altın / Kehribar (`#9a650f`, soft: `#f8efd9`) | Sıcak Altın (`#9a752f`, bg: `#f7f0df`) | Açık Mavi (`#EBF3FE`, `#164E8C`) | **Kritik Çelişki:** Web'de yönlendirme altın sarısı iken Android'de mavidir! |
| **Metinsel Kanıt (Evidence)** | Mavi / İndigo (`#5363a7`, soft: `#eceefa`) | Lavanta / Mor (`#6250a6`, bg: `#f0edfa`) | Lavanta (`#F3EFFF`, `#4C2CA6`) | Sunumda mavi iken, Lesson Player ve Android'de lavanta/mor tondadır. |
| **Açıklama (Explanation)** | Mor (`#765494`, soft: `#f1eaf6`) | Sıcak Kahve (`#805c4c`, bg: `#f5ece8`) | Şeftali / Turuncu (`#FFF4ED`, `#873809`) | Üç uygulamada üç farklı renk (Mor, Kahve, Şeftali). |
| **Cevap (Answer)** | Teal (`#176d68`, soft: `#e2efeb`) | Yeşil/Teal (`#315e54`, bg: `#eef5f2`) | Nane Yeşili (`#EAF8F0`, `#145C32`) | Hepsi yeşil/teal ailesinde ancak tonlar ve kontrastlar eşlenmemiştir. |
| **Öğretmen Notu (Note)** | Yönlendirme ile ortak (`#9a650f`) | Sıcak Kahve (`#805c4c`) | Kehribar (`#FDF8EE`, `#734B0B`) | Yönlendirme ile örtüşme veya kahve tonu kullanımı. |

### 2.3 Doğrudan Yazılmış (Hardcoded) Değerler ve CSS Tekrarı

1. **Hex Renkleri:**
   - `apps/lesson-player/src/styles.css` içinde **112 benzersiz hex renk** bulunmaktadır.
   - `apps/sunum-web/src/styles.css` içinde **71 benzersiz hex renk** bulunmaktadır.
   - Çok sayıda `#ffffff`, `#f5f2ea`, `#d9d5ca`, `#1f2522` gibi tekrarlar değişken yerine doğrudan yazılmıştır.
2. **Boşluklar ve Padding:**
   - CSS'te `padding: 14px 22px`, `padding: 18px`, `padding: 20px 22px`, `gap: 14px`, `gap: 20px` gibi keyfî piksel değerleri kullanılmış; 4px/8px katı standart bir `--space-*` skalası bulunmamaktadır.
3. **Köşe Yuvarlatmaları (Border Radius):**
   - Sunumda `10px`, `12px`, `14px`, `18px`, `22px`; React Player'da `5px`, `10px`, `14px`, `16px`; Android'de `12.dp`, `22.dp`.
4. **Animasyon ve Geçişler (Transitions):**
   - Sunum Web: `transition: 140ms ease`, `transition: 160ms ease`, `transition: 200ms ease`, `transition: 260ms ease`.
   - React Player: `transition: 140ms ease`, `transition: 160ms ease`.
   - Arc Library'nin sunduğu fiziksel ve sakin hareket eğrileri (`cubic-bezier`, standart süreler) tanımlanmamıştır.

---

## 3. Modern QA Tasarımının Değerlendirilmesi

Web Sunumu'ndaki modern QA tasarımı (`.slide--qa-modern`, `qa-modern.js`), tüm pedagojik testlerden başarıyla geçen ve sınıf ortamında kanıtlanmış en güçlü arayüz örüntüsüdür:

### 3.1 Neden Başarılı?
1. **Okunabilirlik Hiyerarşisi:**
   - Üst bağlam (tema, akış, basılı sayfa referansı) sessizleştirilmiş nötr renkte (`--modern-muted: #5b6b73`), gözü yormaz.
   - Soru kökü (`.prompt`), dengeli satır uzunluğu (`--modern-title-max: 1500px`), `text-wrap: balance` ve Inter fontu ile salonun en arkasından dahi net okunur.
2. **Pedagojik Aşamalandırma (Progressive Disclosure):**
   - Öğrenci önce soruyu görür.
   - Öğretmen kumandayla ilerlettiğinde soru kompaktlaşarak yukarı kayar; odak alanında (`.qa-focus`) cevap veya yönerge belirir.
   - View Transition sayesinde ani ekran sıçraması değil, sakin ve bağlamı koruyan bir yer değiştirme gerçekleşir.
3. **Bilişsel Renk Kodlaması:**
   - Öğrenci ve öğretmen rengin ne anlama geldiğini anında anlar:
     - **Yeşil/Teal:** Beklenen cevap, kazanım çıktısı.
     - **Mavi:** Metinden doğrudan kanıt, alıntı, belge.
     - **Altın/Sarı:** Düşünme adımı, dikkat edilecek püf noktası, yönlendirme.
     - **Mor:** Kavramsal açıklama, terim, çözümleme.
4. **Çift Tema Desteği:**
   - Hem aydınlık sınıflar için yüksek kontrastlı açık tema, hem de projeksiyon parlamasını önleyen karanlık tema (`:root[data-theme="dark"]`) mükemmel ayarlanmıştır.

**Karar:** Modern QA'nın renkleri, tipografik oranları ve aşamalandırma mantığı; üç uygulamayı kapsayan ortak tasarım sisteminin (**ÖğretmenRehberi Tasarım Sistemi - ORDS**) omurgası olarak kabul edilmiştir.

---

## 4. Android Jetpack Compose Tasarım Eşlemesi (Mapping)

Aşama 1 kısıtlarına uygun olarak, Android ekranları bu aşamada yeniden tasarlanmamakta; ancak Compose tarafındaki `Tokens.kt` ve `LessonTheme.kt` yapısının ortak tasarım sistemiyle 1:1 nasıl eşleneceği tanımlanmaktadır.

### 4.1 Token Eşleme Tablosu

| Ortak Token (ORDS / Web) | Web Değeri (Light / Dark) | Android Jetpack Compose Hedef Tokenı | Mevcut Android Değeri | Durum & Öneri |
|---|---|---|---|---|
| `--ords-color-primary` | `#176d68` / `#72c9ba` | `LessonColors.Primary` | `#5434D4` | Aşama 2'de teal markaya hizalanacak. |
| `--ords-color-bg-canvas` | `#f7f8f5` / `#151b20` | `LessonColors.AppBg` | `#F7F8FC` | Uyumlu (soft paper tonu). |
| `--ords-color-surface` | `#ffffff` / `#1c252b` | `LessonColors.Surface` | `#FFFFFF` | Birebir eşleşiyor. |
| `--ords-color-surface-soft` | `#f3f4fa` / `#282438` | `LessonColors.SurfaceSoft` | `#F3F4FA` | Birebir eşleşiyor. |
| `--ords-color-border` | `#d7e0df` / `#344248` | `LessonColors.Border` | `#D9DDE8` | Uyumlu. |
| `--ords-color-text-primary` | `#182a35` / `#edf3f1` | `LessonColors.TextPrimary` | `#171729` | Yüksek kontrastlı ana metin. |
| `--ords-color-text-secondary`| `#5b6b73` / `#bdc9c7` | `LessonColors.TextSecondary` | `#676B7C` | İkincil metin. |
| `--ords-color-answer` | `#176d68` / `#72c9ba` | `LessonColors.AnswerText` | `#145C32` | Yeşil/teal ailesinde hizalanacak. |
| `--ords-color-answer-bg` | `#e2efeb` / `#1c3734` | `LessonColors.AnswerSurface` | `#EAF8F0` | Uyumlu. |
| `--ords-color-guidance` | `#9a650f` / `#efbd68` | `LessonColors.GuidanceText` | `#164E8C` (Mavi!) | **Düzeltilecek:** Altın/Kehribar tonuna çekilecek. |
| `--ords-color-guidance-bg` | `#f8efd9` / `#362d1d` | `LessonColors.GuidanceSurface` | `#EBF3FE` | **Düzeltilecek:** Kehribar zeminine çekilecek. |
| `--ords-color-evidence` | `#5363a7` / `#a7b1ff` | `LessonColors.EvidenceText` | `#4C2CA6` | Mavi/İndigo ailesine hizalanacak. |
| `--ords-color-evidence-bg` | `#eceefa` / `#242a43` | `LessonColors.EvidenceSurface` | `#F3EFFF` | Uyumlu soft yüzey. |
| `--ords-color-explanation` | `#765494` / `#d0a9ef` | `LessonColors.ExplanationText` | `#873809` (Turuncu!) | Mor tonuna hizalanacak. |
| `--ords-color-explanation-bg`| `#f1eaf6` / `#30243a` | `LessonColors.ExplanationSurface`| `#FFF4ED` | Uyumlu soft mor yüzeye hizalanacak. |
| `--ords-color-note` | `#9a5d2f` / `#f2b556` | `LessonColors.NoteText` | `#734B0B` | Uyumlu kehribar/sand tonu. |
| `--ords-color-note-bg` | `#f4e8dc` / `#2e2413` | `LessonColors.NoteSurface` | `#FDF8EE` | Uyumlu. |

### 4.2 Boşluk ve Şekil Eşlemesi

```kotlin
// Compose LessonSpacing <-> ORDS Token Eşlemesi
LessonSpacing.tiny   -> 4.dp .. 6.dp   // --ords-space-1 / space-2
LessonSpacing.small  -> 12.dp          // --ords-space-3
LessonSpacing.medium -> 18.dp          // --ords-space-4 / space-5
LessonSpacing.large  -> 24.dp          // --ords-space-6
LessonSpacing.section-> 32.dp          // --ords-space-8

// Compose LessonShape <-> ORDS Radius Eşlemesi
LessonShape.button   -> 12.dp          // --ords-radius-md (Kontroller/Butonlar)
LessonShape.chip     -> 12.dp          // --ords-radius-md (Etiketler/Chipler)
LessonShape.card     -> 22.dp          // --ords-radius-xl (Ana Kartlar ve Paneller)
```

---

## 5. Aşama 1 Sonuçları ve Çıkarımlar

1. **Kritik Risk Alanları Belirlendi:**
   - Sunum Web'in PPTX dışa aktarımı, slaytları doğrudan rasterlaştırır. CSS animasyonlarının PPTX çekimi sırasında kapalı kalması (`__qaPptxCaptureProbe`) ve offline önbellek listesinin bozulmaması zorunludur.
   - Soru promptlarının boyutu, satır sayısı ve kelime sarmalama kuralları tarayıcı testlerinde piksel piksel doğrulanmaktadır; rastgele tipografi değişikliği testleri kırar.
2. **Güvenli Modernizasyon Çatısı Kuruldu:**
   - Mevcut ekranları bozmadan, hem sunum web hem de React lesson player tarafından tüketilebilecek merkezi token katmanı oluşturulabilir.
   - Aşama 2'de ekranların kademeli olarak yeni bileşen standartlarına geçirilmesi için net bir yol haritası hazırdır.
