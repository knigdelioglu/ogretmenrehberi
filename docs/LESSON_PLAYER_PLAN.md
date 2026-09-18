# Ders Modu / Lesson Player — Uygulama Planı

## 1. Amaç

11. sınıf öğretmen rehberi veritabanını, öğretmenin ders sırasında EPUB veya ders kitabı rehberine dönmeden kullanabileceği tam ekran bir ders yürütme arayüzüne dönüştürmek.

Ana ilke:

> Kanonik veri tek gerçek içerik kaynağıdır. Uygulama, içeriği yeniden yazmaz; ders sırasını, görünümü ve aşamalı gösterimi tanımlar.

İlk pilot yalnızca **11. Sınıf → 1. Tema → Metin Tahlili-1 → Karagöz / Yazıcı → basılı s.15–35** kapsamındadır.

---

## 2. Ürün rolü

### Kanonik veri
İçeriğin doğrulanmış kaynağıdır.

- `source-index.json` → kitabın gerçek sırası, sayfa, etkinlik ve süreç iskeleti
- `answer-bank/*.json` → cevap, yönlendirme, açıklama, kısa kanıt ve performans desteği
- pedagojik denetim belgeleri → hangi bilginin ne zaman verilmemesi/verilmesi gerektiğine ilişkin üretim kuralı

### Lesson flow
İçeriği kopyalamadan sunum davranışını tanımlar.

Örnek sorumluluklar:

- hangi kaynak kaydı hangi sırada gösterilecek,
- hangi answer-bank kaydıyla eşleşecek,
- görünüm tipi,
- aşamalı açılma sırası,
- öğretmen notunun görünürlük davranışı,
- bir kayıt birden fazla ekrana bölünecekse bölme kararı.

### Ders Modu
Sınıfta kullanılan asıl ürün.

- önceki/sonraki adım,
- sayfa göstergesi,
- soru/görev,
- ipucu/yönlendirme,
- cevap,
- kanıt,
- açıklama,
- bilgi kartı,
- tam ekran,
- klavye kısayolları,
- sunum durumunun korunması.

### Düzenleme Modu
İkinci faz.

- adım ekleme/silme,
- sürükle-bırak sıralama,
- görünüm tipi değiştirme,
- bölme/birleştirme,
- reveal sırası,
- öğretmen görünümü / öğrenci görünümü önizlemesi,
- lesson-flow JSON kaydetme.

---

## 3. Neden PowerPoint ana ürün değil?

PowerPoint çıktı olarak desteklenebilir ancak ana yürütme motoru olmayacaktır.

Nedenler:

1. Metin uzunlukları değişince hizalama kırılabiliyor.
2. İçerik güncellendiğinde PPTX yeniden üretmek gerekiyor.
3. Aşamalı gösterim ve öğretmen/öğrenci görünümü web arayüzünde daha güvenilir.
4. Responsive yerleşim projektör, monitör ve tablet boyutlarına daha iyi uyarlanabilir.
5. Aynı veri daha sonra PDF/PPTX çıktısına dönüştürülebilir.

---

## 4. Teknik mimari

İlk MVP:

- React
- TypeScript
- Vite
- yalnız yerel dosya/veri
- backend yok
- çevrimdışı çalışabilir
- ek UI framework zorunlu değil
- CSS Grid/Flexbox ile deterministik hizalama

Dizin:

```text
apps/lesson-player/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── scripts/
│   └── build-lesson-data.mjs
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    ├── types.ts
    ├── components/
    │   ├── LessonShell.tsx
    │   ├── QuestionCard.tsx
    │   ├── VocabularyCard.tsx
    │   ├── ReferenceCard.tsx
    │   ├── ProcessCard.tsx
    │   └── RevealPanel.tsx
    └── generated/
        └── karagoz.json
```

Sunum sözleşmesi:

```text
data/.../source-index.json
             +
data/.../answer-bank/*.json
             +
data/.../presentation/...lesson-flow.json
             |
             v
scripts/build-lesson-data.mjs
             |
             v
src/generated/karagoz.json
             |
             v
React Lesson Player
```

---

## 5. Lesson-flow sözleşmesi v0.1

Yeni dosya:

`data/grade-11/presentation/theme-1/karagoz-flow.json`

Örnek:

```json
{
  "schema_version": "0.1.0",
  "lesson_id": "T11-T01-KARAGOZ",
  "title": "Karagöz — Yazıcı",
  "printed_page_range": "15-35",
  "steps": [
    {
      "id": "karagoz-s25-vocabulary",
      "source_record_id": "T01-S0008",
      "answer_ids": [
        "T1-P25-Q01",
        "T1-P25-Q02",
        "T1-P25-Q03"
      ],
      "layout": "vocabulary",
      "reveal": [
        "prompt",
        "answer_sections",
        "explanation"
      ]
    }
  ]
}
```

İlk MVP'de desteklenecek layout türleri:

- `process`
- `question`
- `vocabulary`
- `reference`
- `comparison`
- `structure`
- `assessment`

---

## 6. Karagöz pilotunun zorunlu kapsamı

Kaynak sırası **basılı s.15–35** eksiksiz izlenir.

### s.15
Konuya Başlarken — dört soru.

### s.16
Hatırlayalım — grup/kart süreci ve Karagöz tipleriyle ilgili sorular.

### s.17
Düşün-eşleş-paylaş ve metnin diliyle ilgili üç soru.

### s.18–24
“Yazıcı” — tahmin, rol paylaşımı, karaktere uygun sesli okuma ve okuma sırasında izlenecek noktalar.

### s.25
Söz Varlığımız — kelime ve **anlamları**, güncel karşılıklar ve bağlam notları.

### s.26
Bilgi Köşesi — mukaddime, muhavere, fasıl, bitiş.

### s.27–29
Karagöz/Hacivat kişilik-dil çıkarımı, tip kavramı, sosyal statü/eğitim, dostluk.

### s.30–31
Metni Anlayalım — bütün soru/eşleştirme/karşılaştırma kayıtları.

### s.32
Yapı unsurları ve çatışma.

### s.33
Dil ve üslup.

### s.34
Fiilimsiler, sosyal bilimler değerlendirmesi ve araştırma görevi.

### s.35
Süreci Değerlendirebilme — üç soru.

Hiçbir source-index kaydı görünür bir ders adımı olmadan atlanmamalıdır.

---

## 7. Öğrenci ve öğretmen görünümü

### Öğrenci görünümü
Varsayılan olarak yalnız o anda gerekli bilgi gösterilir.

Örnek:

- soru,
- etkinlik yönergesi,
- kelime,
- tablo başlığı,
- işlem adımı.

### Öğretmen görünümü
Aynı ekranda isteğe bağlı açılır:

- yönlendirme,
- cevap,
- kısa kanıt,
- açıklama,
- kaynak sayfası.

MVP'de tek ekranda kontrollü reveal kullanılır. İkinci ekranda ayrı presenter görünümü daha sonraki fazdır.

---

## 8. Reveal sırası

Varsayılan sıra:

```text
Görev / soru
→ Yönlendirme
→ Cevap
→ Kanıt
→ Açıklama
```

Ancak layout bu sırayı değiştirebilir.

Örneğin vocabulary:

```text
Kelime
→ Öğrenci tahmini
→ Anlam
→ Güncel karşılık / bağlam notu
```

Reference:

```text
Başlık
→ çekirdek bilgi
→ kısa hafıza şeması
→ opsiyonel öğretmen notu
```

---

## 9. Klavye ve sınıf kullanım sözleşmesi

- `ArrowRight` → sonraki adım
- `ArrowLeft` → önceki adım
- `Space` → sıradaki reveal
- `C` → cevap
- `G` → guidance
- `E` → explanation
- `F` → tam ekran
- `Home` → ders başlangıcı
- `End` → ders sonu

Butonlar da aynı işlevleri sağlamalıdır.

---

## 10. Otomatik kalite kapıları

Build sırasında en az şu kontroller yapılır:

1. lesson-flow içindeki bütün `source_record_id` değerleri source-index içinde bulunmalı.
2. bütün `answer_ids` answer-bank içinde bulunmalı.
3. Karagöz için s.15–35 source-index kayıtlarının tamamı lesson-flow içinde temsil edilmeli.
4. aynı step ID iki kez kullanılamaz.
5. vocabulary görünümünde yapısal kelime/anlam verisi yoksa build hata vermeli.
6. source-index sayfası ile bağlanan answer kaydının basılı sayfası mantıksal olarak çelişmemeli.
7. boş cevap, boş başlık ve çözümlenemeyen kaynak bağlantısı hata vermeli.
8. answer-bank'te `guidance`, `explanation` veya `evidence_quotes` varsa uygulamada erişilebilir reveal olarak taşınmalı.
9. metin taşması UI testlerinde görünür uyarı üretebilmeli.

---

## 11. Fazlar

### Faz A — Çalışan Karagöz Player MVP
- [x] mimariyi sabitle
- [ ] lesson-flow v0.1
- [ ] veri üretim scripti
- [ ] React/Vite kabuğu
- [ ] soru renderer
- [ ] vocabulary renderer
- [ ] process/reference renderer
- [ ] reveal sistemi
- [ ] sayfa/adım navigasyonu
- [ ] klavye kısayolları
- [ ] tam ekran
- [ ] s.15–35 eksiksizlik testi

### Faz B — Düzenleme Modu
- [ ] adım listesi
- [ ] sürükle-bırak sıralama
- [ ] layout seçimi
- [ ] reveal sırası düzenleme
- [ ] önizleme
- [ ] JSON dışa aktarma

### Faz C — Tema 1 genelleştirme
- [ ] Mektup
- [ ] Konuşma
- [ ] Dinleme/İzleme
- [ ] E-posta
- [ ] Tema sonu ölçme-değerlendirme

### Faz D — Çıktılar
- [ ] yazdırılabilir PDF
- [ ] PPTX export
- [ ] ders oturumu kaldığı yeri hatırlama
- [ ] presenter ekranı

### Faz E — 11. sınıfın tamamı
- [ ] Tema 2
- [ ] Tema 3
- [ ] Tema 4

---

## 12. MVP kabul ölçütleri

Karagöz pilotu tamamlanmış sayılırsa:

1. Öğretmen s.15'ten s.35'e başka kaynağa dönmeden ilerleyebilir.
2. Source-index'teki ilgili bütün ders adımları temsil edilir.
3. Answer-bank'teki ilgili bütün cevaplar erişilebilir durumdadır.
4. Kelime çalışmalarında kelime ve açıklama birlikte bulunur.
5. Soru cevapları başlangıçta öğrenciye açık değildir.
6. Guidance/answer/evidence/explanation ayrı ayrı açılabilir.
7. Projektörde metin ve işaret hizaları bozulmaz.
8. Klavyeyle ders yürütülebilir.
9. Uygulama çevrimdışı çalışır.
10. İçerik düzeltildiğinde generated veri yeniden üretilebilir.
