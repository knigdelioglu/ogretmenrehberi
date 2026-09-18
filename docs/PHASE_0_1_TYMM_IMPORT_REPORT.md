# Faz 0–1 TYMM Veri Aktarım Raporu

**Tarih:** 2026-09-18  
**Hedef repo:** `knigdelioglu/ogretmenrehberi`  
**Kaynak repo:** `knigdelioglu/tymm`  
**Kaynak commit:** `65e2128c75adf03f0f59fca2cbc5888efa714e2c`

## 1. Sonuç

Öğretmen Rehberi roadmap'indeki Faz 0 ve Faz 1 için TYMM'de daha önce doğrulanmış 11. sınıf kaynak verileri bu repoya taşındı.

Bu aktarım **öğretmen rehberi prose/pedagoji modeli aktarımı değildir**. Eski V2/V2.2/V2.3/V3 teacher-guide modelleri, eski Kindle çıktıları ve eski pedagojik şablonlar taşınmamıştır.

PDF ikilileri de public repo politikası gereği taşınmamıştır. `sources/manifest.json` yalnız kaynak kimliği, fingerprint, resmî bağlantı ve sürüm bilgilerini saklar.

## 2. Faz 0 — Kaynak temeli

### Durum: TAMAMLANABİLİR / VERİ HAZIR

Yeni `sources/manifest.json` beş ana kaynağı tanımlar:

- 11. sınıf Türk Dili ve Edebiyatı ders kitabı
- 1. Tema program PDF'si
- 2. Tema program PDF'si
- 3. Tema program PDF'si
- 4. Tema program PDF'si

Ders kitabı için kayıtlı doğrulanmış metadata:

- baskı yılı: **2026**
- ISBN: **978-605-06002-7-8**
- PDF sayfası: **313**
- tema: **4**
- bölüm: **24**
- etkinlik: **84**
- form kaydı: **43**
- SHA-256: `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba`

Dört tema programı için ayrı SHA-256, dosya adı, PDF sayfa sayısı, resmî TYMM unit bağlantısı ve tema kimliği mevcuttur.

### Faz 0 için kalan iş

Kaynak envanteri ve dosya kimliği/sürüm bilgisi artık hazırdır. Yeni repoda ayrıca PDF binary commit edilmesi gerekmemektedir.

## 3. Faz 1 — Ders kitabı haritası

### `textbook-map.json`

Aktarılan kitap haritası:

- **4 tema**
- **24 ana bölüm**
- **84 etkinlik**
- basılı sayfa ↔ PDF sayfa eşlemesi
- `printed_to_pdf_offset = 1`
- bölüm başlıkları
- etkinlik başlıkları
- beceri alanları
- etkinlik sayfa aralıkları
- ilişkili öğrenme çıktıları
- form bağlantıları

Tema sayfa aralıkları:

| Tema | Basılı sayfa |
|---|---:|
| 1. Tema — Bir Diyeceğim Var! | 12–83 |
| 2. Tema — Kültür Yolculuğu | 84–159 |
| 3. Tema — Yaşamın İzinde | 160–235 |
| 4. Tema — Hayatın Aynası | 236–307 |

## 4. Soru envanteri

### `textbook-question-inventory.json`

Toplam **407** soru kayıtlıdır ve kaynak envanterinde `review_required = 0` durumundadır.

| Tema | Soru |
|---|---:|
| Tema 1 | 81 |
| Tema 2 | 107 |
| Tema 3 | 114 |
| Tema 4 | 105 |
| **Toplam** | **407** |

Her soru kaydı tema, bölüm, etkinlik bağlantısı, basılı sayfa, PDF sayfası, soru numarası, prompt, kaynak locator, kaynak SHA-256 ve provenance bilgisini taşır.

## 5. Form / değerlendirme indeksi

### `textbook-forms-index.json`

Toplam **43** form/değerlendirme kaydı vardır:

- fiziksel/kitap içi form: **30**
- QR bağlantılı kayıt: **13**
- çözülmemiş Dereceli Puanlama Anahtarı hedefi: **8**
- doğrulanmış analitik rubrik: **0**

Bu sekiz QR-hedefi Faz 1'in tek belirgin kaynak açığıdır. Yeni rehber üretimi sırasında bunlar doğrulanmış kabul edilmemelidir.

## 6. Öğretim programı

### `curriculum-map.json`
### `curriculum-normative-text.json`
### `curriculum-process-component-resolution.json`

Program katmanında:

- **4 tema**
- tema başına **16** öğrenme çıktısı
- toplam **64** öğrenme çıktısı
- resmî öğretim süresi tema başına **43 saat**
- normatif program metni
- alan becerileri
- eğilimler
- programlar arası bileşenler
- resmî TYMM source locatorları

Süreç bileşeni çözümleme sözleşmesine göre 64 parent outcome'ın tamamında etkili süreç bileşenleri çatı katalogdan devralınmaktadır; çözülmemiş süreç bileşeni sayısı **0**'dır.

> Not: `curriculum-map.json` TYMM'den birebir snapshot olarak taşındığı için bazı eski lifecycle/status alanları tarihsel ifadeler içerebilir. Yeni rehberin kanonik içerik modeli bu durum alanlarını doğrudan kopyalamamalı; programın normatif içerik ve locator alanlarını kullanmalıdır.

## 7. Kitap ↔ program hizalaması

Her tema için `data/grade-11/source/alignment/theme-N.json` bulunur.

Her bir temada:

- toplam outcome: **16**
- covered: **14**
- partially covered: **2**
- not covered: **0**
- unresolved assessment target: **2**

Dört tema toplamında:

- **56 covered**
- **8 partially covered**
- **0 not covered**
- **8 unresolved assessment target**

Bu nedenle kitap ↔ program eşleştirmesi Faz 1 için güçlü biçimde hazırdır; açık kalan konu QR bağlantılı değerlendirme hedefleridir.

## 8. Nötr teacher-book kaynak katmanı

TYMM'de legacy öğretmen rehberi modellerinden ayrıştırılmış nötr source katmanı da aktarıldı.

| Tema | Source kayıt | Kitap sorusu | Temiz cevap |
|---|---:|---:|---:|
| Tema 1 | 129 | 81 | 32 |
| Tema 2 | 158 | 107 | 74 |
| Tema 3 | 146 | 114 | 64 |
| Tema 4 | 143 | 105 | 64 |
| **Toplam** | **576** | **407** | **234** |

Source kayıt tipleri arasında `QUESTION`, `PROCESS`, `REFERENCE`, `VOCABULARY`, `TABLE`, `COMPARISON` ve `ASSESSMENT` bulunur.

Bu katman rehber prose'u değildir. Faz 2'de kurulacak yeni kanonik modele kaynak/locator ve temiz cevap desteği vermek için taşınmıştır.

## 9. Repo içine eklenen dosyalar

```text
sources/
├── manifest.json
└── import-provenance.json

data/grade-11/source/
├── textbook-map.json
├── textbook-question-inventory.json
├── textbook-forms-index.json
├── curriculum-map.json
├── curriculum-normative-text.json
├── curriculum-process-component-resolution.json
├── alignment/
│   ├── theme-1.json
│   ├── theme-2.json
│   ├── theme-3.json
│   └── theme-4.json
└── teacher-book/
    ├── manifest.json
    ├── theme-1/
    │   ├── source-index.json
    │   └── answer-bank.json
    ├── theme-2/
    │   ├── source-index.json
    │   └── answer-bank.json
    ├── theme-3/
    │   ├── source-index.json
    │   └── answer-bank.json
    └── theme-4/
        ├── source-index.json
        └── answer-bank.json
```

## 10. Faz 0–1 değerlendirmesi

### Faz 0

**Pratik olarak tamamlandı.** Kaynak seti, kimlikler, fingerprintler ve dış kaynak konumu makinece okunur biçimde mevcut.

### Faz 1

**Büyük ölçüde tamamlandı.** Kitap yapısı, bölüm/etkinlik/soru haritası, form indeksi, program haritası ve kitap-program alignment verileri hazırdır.

Faz 1'i tamamen kapatmadan önce önerilen son kontroller:

1. sekiz QR bağlantılı Dereceli Puanlama Anahtarı hedefini doğrulamak veya açıkça `unresolved` olarak dondurmak,
2. yeni repo için metin (text) entity'sinin ayrı indekslenmesine gerçekten ihtiyaç olup olmadığını Faz 2 şema tasarımında kararlaştırmak,
3. legacy lifecycle/status metadata'sını kanonik rehber şemasına taşımamak.

## 11. Faz 2'ye geçiş için öneri

PDF'lerden yeniden toplu extraction yapılmamalıdır. Bundan sonraki iş:

1. bu source snapshotlarını **salt okunur girdi** kabul etmek,
2. `schema/guide.schema.json` için yeni kanonik entity/ID modelini tasarlamak,
3. Tema 1'den 3–5 örnek kaydı yeni şemaya elle/denetimli biçimde dönüştürmek,
4. aynı kaydın ÖğretmenOS ve EPUB gereksinimlerini ek veri uydurmadan karşılayabildiğini doğrulamak.

Böylece eski teacher-guide modellerinin üslup ve tekrar sorunları yeni repoya taşınmadan, daha önce doğrulanmış kaynak emeği korunmuş olur.
