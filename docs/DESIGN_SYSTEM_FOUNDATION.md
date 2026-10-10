# ÖğretmenRehberi Tasarım Sistemi Temelleri (ORDS - Foundation)

Bu doküman, **ÖğretmenRehberi** platformunun web sunumu (`apps/sunum-web`), React Lesson Player (`apps/lesson-player`) ve Android uygulaması (`apps/lesson-player-android`) için ortak, modern, sürdürülebilir ve erişilebilir tasarım sisteminin temellerini tanımlar.

Tasarım sistemi, [Arc Library](https://github.com/kuratlielia/arc-library)'nin **sakin, fiziksel hareket (calm, physical motion)** yaklaşımını, **semantik tasarım tokenlarını** ve **saf mülkiyet (pure source ownership)** ilkelerini referans alır; ancak ÖğretmenRehberi'nin özgün kimliğini, akıllı tahta pedagojik akışlarını ve yerel sınıf deneyimini korur.

---

## 1. Tasarım İlkeleri (Design Principles)

1. **Sakin ve Fiziksel Hareket (Calm Motion):**
   - Animasyonlar dikkati dağıtmak veya gösteriş yapmak için değil; pedagojik akışın sürekliliğini sağlamak (sorudan cevaba geçiş, katmanın açılması) için kullanılır.
   - Doğal yaylar (springs) ve `enter`/`exit` eğrileri kullanılır; abartılı zıplamalar (overshoot) engellenir.
   - `prefers-reduced-motion` tam ve birinci sınıf bir yurttaştır. Hareket azaltma tercih edildiğinde tüm transformasyonlar anında tamamlanır.
2. **Pedagojik Anlamsallık (Semantic Education Palette):**
   - Renkler rastgele görsel süsleme değil, bilişsel ayrım aracıdır:
     - **Cevap (Answer):** Çam Yeşili / Teal (`#176d68`) — Başarı, tamamlama, beklenen sonuç.
     - **Yönlendirme (Guidance):** Sıcak Altın / Kehribar (`#9a650f`) — Düşünme adımı, dikkat, pedagojik ipucu.
     - **Metinsel Kanıt (Evidence):** Mavi / İndigo (`#5363a7`) — Kaynak metin, doğrudan alıntı, belge.
     - **Açıklama (Explanation):** Duru Mor (`#765494`) — Terim, kavramsal tahlil, çözümleme.
     - **Öğretmen Notu (Note):** Sıcak Toprak / Sand (`#9a5d2f`) — Öğretmen hazırlığı, yıllık plan, süre.
3. **Sıfır Çalışma Zamanı Maliyeti ve Bağımsız Mimari (Zero Runtime Overhead):**
   - Web sunumunun hafif, bağımlılıksız mimarisi korunur. Tasarım tokenları saf CSS değişkenleri (`--ords-*`) olarak çalışır.
   - React tarafında CSS modülleri ve hafif TypeScript tokenları tüketilir.
   - Android tarafında doğrudan Jetpack Compose sabitleri ve Material3 temasıyla eşlenir.
4. **Çift Sahne Desteği: Akıllı Tahta Tuvali ve Kişisel Cihaz (Dual Canvas):**
   - 1920×1080 sabit oranlı sınıf projeksiyon tuvali ile tablet/laptop akışkan ekranları aynı token skalasından beslenir.
   - Metinler 5-8 metre mesafeden okunacak kontrast oranlarına (WCAG AAA >= 7:1) uygun seçilmiştir.
5. **Korumalı Değişmezler (Protected Invariants):**
   - Çevrimdışı Service Worker önbelleği kırılmaz.
   - PowerPoint (PPTX) dışa aktarımında slayt yakalama anında animasyonlar devre dışı bırakılır.
   - Serbest kalem çizimi ve uzaktan kumanda protokolleri kesintisiz çalışır.

---

## 2. Tasarım Tokenları (Design Tokens Specification)

Tüm değişkenler `--ords-` (ÖğretmenRehberi Design System) ön ekiyle adlandırılmıştır.

### 2.1 Renk Paleti (Color Tokens)

#### Nötr ve Zemin Yüzeyleri (Surfaces & Backgrounds)
| Token Adı | Light Değeri | Dark Değeri | Açıklama |
|---|---|---|---|
| `--ords-color-bg-app` | `#f7f8f5` | `#151b20` | Uygulama ana zemin rengi (yumuşak mat kâğıt) |
| `--ords-color-surface` | `#ffffff` | `#1c252b` | Kartlar, slayt panelleri, beyaz yüzeyler |
| `--ords-color-surface-raised` | `#ffffff` | `#232f37` | Yükseltilmiş kartlar, açılır menüler, diyaloglar |
| `--ords-color-surface-muted` | `#f0f3f2` | `#1a2228` | İkincil bloklar, pasif alanlar, kod zeminleri |
| `--ords-color-border` | `#d7e0df` | `#344248` | Standart panel ve kart kenarlıkları |
| `--ords-color-border-subtle` | `#e8eeed` | `#263238` | Ayırıcı ince çizgiler, tablo sınırları |
| `--ords-color-border-strong` | `#b8c5c4` | `#4a5c64` | Vurgulu kenarlıklar, odak çerçeveleri |

#### Metin ve Mürekkep (Typography & Inks)
| Token Adı | Light Değeri | Dark Değeri | Kontrast Oranı (Zemin Üzerinde) |
|---|---|---|---|
| `--ords-color-text-primary` | `#182a35` | `#edf3f1` | > 12:1 (Yüksek kontrastlı ana metin) |
| `--ords-color-text-secondary`| `#5b6b73` | `#bdc9c7` | > 5.5:1 (İkincil açıklamalar, meta veriler) |
| `--ords-color-text-muted` | `#718087` | `#94a29f` | > 4.5:1 (İpuçları, sayfa sayaçları) |

#### Ana Marka ve Vurgu (Primary Brand & Accent)
| Token Adı | Light Değeri | Dark Değeri | Kullanım Alanı |
|---|---|---|---|
| `--ords-color-primary` | `#176d68` | `#72c9ba` | Ana butonlar, seçili sekmeler, aktif adım |
| `--ords-color-primary-soft` | `#e2efeb` | `#1c3734` | Hafif buton zeminleri, aktif sekme arkası |
| `--ords-color-primary-strong`| `#0f524e` | `#8ce0d2` | Üzerine gelme (hover) ve basılma (active) |

#### Pedagojik Destek Renkleri (Educational Assist Pillars)
| Rol | Metin / Kenarlık (Light) | Yumuşak Zemin (Light) | Metin / Kenarlık (Dark) | Yumuşak Zemin (Dark) |
|---|---|---|---|---|
| **Cevap (Answer)** | `--ords-color-answer: #176d68` | `--ords-color-answer-bg: #e2efeb` | `#72c9ba` | `#1b3431` |
| **Yönlendirme (Guidance)** | `--ords-color-guidance: #9a650f` | `--ords-color-guidance-bg: #f8efd9` | `#efbd68` | `#362d1d` |
| **Metinsel Kanıt (Evidence)** | `--ords-color-evidence: #5363a7` | `--ords-color-evidence-bg: #eceefa` | `#a7b1ff` | `#242a43` |
| **Açıklama (Explanation)** | `--ords-color-explanation: #765494`| `--ords-color-explanation-bg: #f1eaf6`| `#d0a9ef` | `#30243a` |
| **Öğretmen Notu (Note)** | `--ords-color-note: #9a5d2f` | `--ords-color-note-bg: #f4e8dc` | `#f2b556` | `#2e2413` |

#### Fonksiyonel Durum Renkleri (Status Colors)
| Durum | Ana Renk | Zemin Rengi | Kenarlık Rengi |
|---|---|---|---|
| **Success** | `#145c32` | `#eaf8f0` | `#bce9ce` |
| **Warning** | `#9a650f` | `#fdf8ee` | `#f5e5be` |
| **Danger / Error** | `#ba1a1a` | `#ffdad6` | `#fcd3bd` |
| **Info** | `#164e8c` | `#ebf3fe` | `#c6dcfc` |

---

### 2.2 Tipografi Skalası (Typography Tokens)

- **Birincil Yazı Tipi (`--ords-font-body`):** `"Inter Variable"`, `Inter`, ui-sans-serif, system-ui, sans-serif
- **Görüntüleme Yazı Tipi (`--ords-font-display`):** `"Inter Variable"`, `Inter`, sans-serif (yüksek ağırlıklarda `-0.03em` harf aralığı ile modern ve dengeli)
- **Edebî Alıntı Yazı Tipi (`--ords-font-literary`):** `"Iowan Old Style"`, `"Palatino Linotype"`, `"Noto Serif"`, Georgia, serif (yalnızca tarihî ve edebî metin alıntıları için korunur)

| Token Adı | Boyut (rem / px) | Satır Yüksekliği | Harf Aralığı (Tracking) | Kullanım |
|---|---|---|---|---|
| `--ords-text-xs` | `0.75rem` (12px) | `1.35` | `0.02em` | Rozetler, sayaçlar, küçük etiketler |
| `--ords-text-sm` | `0.875rem` (14px) | `1.45` | `0.01em` | İkincil açıklamalar, meta etiketler |
| `--ords-text-base` | `1.000rem` (16px) | `1.55` | `0.00em` | Standart gövde metni, rehber metinleri |
| `--ords-text-lg` | `1.125rem` (18px) | `1.50` | `-0.01em` | Vurgulu açıklamalar, kart alt başlıkları |
| `--ords-text-xl` | `1.250rem` (20px) | `1.40` | `-0.015em` | Küçük bölüm başlıkları, panel başlıkları |
| `--ords-text-2xl` | `1.500rem` (24px) | `1.30` | `-0.02em` | Kart ve modal ana başlıkları |
| `--ords-text-3xl` | `1.875rem` (30px) | `1.25` | `-0.025em` | Slayt soru metinleri, ders başlıkları |
| `--ords-text-4xl` | `2.250rem` (36px) | `1.20` | `-0.03em` | Büyük tema başlıkları |

---

### 2.3 Boşluk Skalası (Spacing Scale)

Standart 4px bazlı orantı skalası:
```css
--ords-space-1:  0.25rem;  /* 4px  */
--ords-space-2:  0.50rem;  /* 8px  */
--ords-space-3:  0.75rem;  /* 12px */
--ords-space-4:  1.00rem;  /* 16px */
--ords-space-5:  1.25rem;  /* 20px */
--ords-space-6:  1.50rem;  /* 24px */
--ords-space-8:  2.00rem;  /* 32px */
--ords-space-10: 2.50rem;  /* 40px */
--ords-space-12: 3.00rem;  /* 48px */
```

---

### 2.4 Köşe Yuvarlatma Skalası (Radii Scale)

```css
--ords-radius-xs:   4px;      /* Küçük rozetler, mikro kontroller */
--ords-radius-sm:   8px;      /* Giriş kutuları, küçük düğmeler */
--ords-radius-md:   12px;     /* Standart butonlar, seçim elemanları, sekmeler */
--ords-radius-lg:   16px;     /* Açılır paneller, reveal blokları, alt kartlar */
--ords-radius-xl:   22px;     /* Ana soru kartları, sunum sahneleri, modallar */
--ords-radius-pill: 9999px;   /* Hap butonlar, durum çipleri */
```

---

### 2.5 Gölgeler ve Derinlik (Shadows & Elevation)

Arc Library'nin sakin, çok katmanlı ve parlamasız gölge ilkeleri:
```css
/* Dinlenme durumu (resting): İnce, zarif kenar derinliği */
--ords-shadow-resting: 0 1px 2px rgba(24, 42, 53, 0.05);

/* Yükseltilmiş kart durumu (raised): Kartlar, açılır menüler */
--ords-shadow-raised: 0 1px 3px rgba(24, 42, 53, 0.08), 0 6px 20px rgba(24, 42, 53, 0.04);

/* Yüzen diyalog durumu (floating): Modallar, diyaloglar, tam ekran katmanları */
--ords-shadow-floating: 0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.06);
```

---

### 2.6 Sakin Hareket Tokenları (Arc Calm Motion Tokens)

Arc Library hareket ilkeleriyle uyumlu süre ve geçiş tanımları:

```css
/* Süreler (Durations) */
--ords-duration-instant:    120ms; /* Tıklama, checkbox, hızlı anlık durumlar */
--ords-duration-fast:       160ms; /* Buton hover, tooltip, mikro etkileşimler */
--ords-duration-standard:   240ms; /* Panel açılma, sekme değişimi, akordiyon */
--ords-duration-considered: 480ms; /* Sayfa geçişleri, modallar, view transitions */

/* Eğriler (Cubic-Bezier Easings) */
--ords-ease-enter:    cubic-bezier(0.16, 1.0, 0.30, 1.0); /* Sakin yavaşlayarak giriş */
--ords-ease-exit:     cubic-bezier(0.70, 0.0, 0.84, 0.0); /* Hızlı kayboluş */
--ords-ease-standard: cubic-bezier(0.22, 1.0, 0.36, 1.0); /* Standart dengeli geçiş */
--ords-ease-in-out:   cubic-bezier(0.65, 0.0, 0.35, 1.0); /* Ekran içi yer değiştirme */
```

#### TypeScript / React Motion Nesnesi (`motion.ts`):
```typescript
export const ordsMotion = {
  duration: {
    instant: 0.12,
    fast: 0.16,
    standard: 0.24,
    considered: 0.48,
  },
  ease: {
    enter: [0.16, 1.0, 0.30, 1.0],
    exit: [0.70, 0.0, 0.84, 0.0],
    standard: [0.22, 1.0, 0.36, 1.0],
    inOut: [0.65, 0.0, 0.35, 1.0],
  },
  spring: {
    responsive: { type: "spring", stiffness: 520, damping: 38 },
    gentle: { type: "spring", stiffness: 340, damping: 34 },
    snappy: { type: "spring", stiffness: 400, damping: 30 },
  }
} as const;
```

#### Erişilebilirlik ve PPTX Güvencesi:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 3. Bileşen Standartları (Component Standards for Phase 2)

Aşama 2 modernizasyonunda kullanılacak ortak bileşen sözleşmeleri:

### 3.1 Butonlar ve Eylem Elemanları (Buttons & Actions)
- **Primary:** `--ords-color-primary` zemin, beyaz metin, `--ords-radius-md`, minimum 48px dokunma alanı.
- **Secondary / Soft:** `--ords-color-primary-soft` zemin, `--ords-color-primary` metin, `--ords-radius-md`.
- **Ghost:** Şeffaf zemin, hover durumunda `--ords-color-surface-muted`, `:focus-visible` durumunda 3px dış halka (`outline: 3px solid var(--ords-color-primary)` ve `outline-offset: 2px`).
- **Icon Button:** Kare orantılı (`width: 44px; height: 44px;`), ortalanmış SVG, erişilebilir `aria-label`.

### 3.2 Kartlar ve Paneller (Cards & Containers)
- **Standart Kart:** `--ords-color-surface` zemin, `--ords-color-border` 1px kenarlık, `--ords-radius-xl`, `--ords-shadow-resting`.
- **Vurgulu / Odak Kartı:** `--ords-shadow-raised`, hafif `--ords-color-primary-soft` iç tonlama.

### 3.3 Pedagojik Reveal Panelleri (Reveal Panels)
- `RevealPanel` bileşeni semantik `tone` prop'u (`answer`, `guidance`, `evidence`, `explanation`, `note`) alır.
- Sol kenarlık (`border-left: 5px solid var(--ords-color-[tone])`), yumuşak zemin (`background: var(--ords-color-[tone]-bg)`).
- Üst etiket: Küçük, kalın harfler (`font-size: var(--ords-text-xs)`, `letter-spacing: 0.08em`, `text-transform: uppercase`).

### 3.4 Soru-Cevap Tuvali (Modern QA Shell)
- Soru üstte merkezlenmiş, genişlik sınırı `--ords-space-` veya `1500px`.
- Cevap kartı tekil, tam genişlikli veya iki parçalı karşılaştırmada yan yana simetrik.
- İlerleme ve geri gitme durumlarında `view-transition-name: qa-question` ile kesintisiz sahne devamlılığı.
