# Roadmap — Öğretmen Rehberi

Bu roadmap, 11. sınıf öğretmen rehberinin **kaynaklardan doğrulanabilir kanonik veriye**, oradan da **ÖğretmenOS**, **Kindle uyumlu EPUB** ve **Ders Modu / Lesson Player** tüketicilerine dönüşmesini aşamalı olarak tanımlar.

Ana ilke: içerik üretimini hızlandırmadan önce veri modeli, kaynak izi ve kalite kapıları sağlamlaştırılır.

---

## Faz 0 — Proje temeli

**Durum:** Başlatıldı

### Hedef
Repo sınırlarını, kaynak setini ve üretim hattını sabitlemek.

### İşler
- [x] GitHub reposunu oluştur
- [x] Google Drive kaynak klasörünü hazırla
- [x] 11. sınıf ders kitabını kaynak setine ekle
- [x] 1–4. tema öğretim programlarını kaynak setine ekle
- [x] README oluştur
- [x] SCOPE oluştur
- [x] ROADMAP oluştur
- [x] .gitignore oluştur
- [ ] kaynak envanterini makinece okunur biçimde kaydet
- [ ] dosya kimlikleri / sürüm bilgileri için source manifest tasarla

### Çıkış ölçütü
Kaynağın nerede olduğu, neyin repoya girip girmeyeceği ve ürünün hangi çıktıları üreteceği belirsiz değildir.

---

## Faz 1 — Kaynak haritalama

### Hedef
Ders kitabının ve tema programlarının yapısını veri üretimine başlamadan önce eksiksiz haritalamak.

### İşler
- [ ] ders kitabı içindekiler yapısını çıkar
- [ ] tema başlangıç / bitiş sayfalarını belirle
- [ ] PDF sayfası ile basılı kitap sayfası farkını tespit et
- [ ] bölüm başlıklarını çıkar
- [ ] metinleri indeksle
- [ ] etkinlikleri indeksle
- [ ] soruları indeksle
- [ ] tablo / görsel / dinleme / izleme gibi özel öğeleri işaretle
- [ ] dört program PDF'sindeki öğrenme çıktıları ve süreç bileşenlerini çıkar
- [ ] kitap yapısı ↔ program yapısı eşleştirme tablosu oluştur
- [ ] eksik / belirsiz kaynak noktalarını raporla

### Çıktılar
- `sources/manifest.json`
- kitap haritası
- program haritası
- kaynak sayfa eşleme tablosu

### Kalite kapısı
1. tema içeriklerinin kitapta nerede başlayıp bittiği tartışmasız biçimde belirlenmiş olmalı.

---

## Faz 2 — Kanonik veri modeli v0.1

### Hedef
Öğretmen rehberinin tek gerçek veri kaynağını tanımlamak.

### İşler
- [ ] ana entity listesini kesinleştir
- [ ] ID standardını belirle
- [ ] JSON Schema oluştur
- [ ] kaynak referansı modelini oluştur
- [ ] program bağlantısı modelini oluştur
- [ ] öğretmen rehberliği alanlarını kesinleştir
- [ ] editoryal durum / review alanlarını kesinleştir
- [ ] çapraz referans modelini oluştur
- [ ] içerik sürümleme stratejisini belirle
- [ ] örnek 3–5 kayıt üret
- [ ] örnekleri şemaya karşı doğrula

### Önerilen ID örnekleri

```text
g11-t1
g11-t1-sec-03
g11-t1-act-017
g11-t1-act-017-q02
g11-concept-anlatim-bicimleri
```

ID'ler başlığa bağımlı olmamalı; başlık düzeltilince bağlantılar kırılmamalıdır.

### Çıktılar
- `schema/guide.schema.json`
- `schema/examples/`
- `docs/id-convention.md`
- `docs/source-reference.md`

### Kalite kapısı
Aynı örnek kayıt hem ÖğretmenOS hem EPUB için gerekli bilgiyi ek veri uydurmadan sağlayabilmeli.

---

## Faz 3 — Doğrulama altyapısı

### Hedef
İçerik çoğalmadan önce veri hatalarını otomatik yakalamak.

### İşler
- [ ] JSON Schema validator
- [ ] benzersiz ID kontrolü
- [ ] kırık `cross_reference` kontrolü
- [ ] geçersiz tema / bölüm ilişkisi kontrolü
- [ ] zorunlu kaynak referansı kontrolü
- [ ] sayfa aralığı tutarlılık kontrolü
- [ ] curriculum ID referans kontrolü
- [ ] review flag tutarlılığı
- [ ] yinelenen içerik / yüksek benzerlik raporu
- [ ] CI üzerinde doğrulama
- [ ] test fixture'ları

### Kalite kapısı
Geçersiz veri `main` üzerinde sessizce kabul edilmemeli.

---

## Faz 4 — 1. Tema pilotu

### Hedef
**Bir Diyeceğim Var!** temasını gerçek öğretmen rehberi kalitesinde uçtan uca tamamlamak.

### Üretim sırası

Her doğal blok için:

1. gerçek kitap sayfalarını ve blok sınırını doğrula
2. soru envanterini gerçek sayfayla karşılaştır
3. görsel / tablo / alt çizgi / QR gibi kaynak bağımlılıklarını işaretle
4. her görev için `question_answer`, `performance_support` veya `source_limited` davranışını seç
5. sınıfta kullanılabilir `answer` veya performans desteğini üret
6. yalnız gerektiğinde `guidance`, `explanation` ve kısa `evidence_quotes` ekle
7. TYMM ve kaynak bağlantılarını koru
8. duplicate ID, boş cevap, yanlış entry type ve kaynak sınırı kontrolünü çalıştır
9. ancak kalite kapısından sonra sonraki doğal bloğa geç

### İçerik kalite soruları

Her kayıt için şu test uygulanır:

- Bu bilgi kitaptan mı, programdan mı, yoksa rehber tarafından mı üretildi?
- Öğretmen bunu ders sırasında gerçekten kullanır mı?
- Bu açıklama bu soruya özgü mü, yoksa genel ve tekrar eden bir cümle mi?
- Öğrenci soruyu yanlış anlarsa rehber ne yapacağını söylüyor mu?
- Sorunun beklenen cevabı yalnız sonuç mu veriyor, düşünme yolunu da gösteriyor mu?
- İlgili TYMM bağlantısı gerçek mi, yoksa yalnızca benzer kelimeler nedeniyle mi eşleştirildi?

### Çıktılar
- `data/grade-11/theme-1/`
- tema indexi
- kalite raporu
- unresolved / teacher-review listesi

### Kalite kapısı
1. tema tamamlanmadan 2. temaya toplu üretim yapılmaz.

---

## Faz 5 — ÖğretmenOS adaptörü v0.1

### Hedef
Kanonik veriyi ÖğretmenOS'un kolay ve hızlı tüketebileceği forma dönüştürmek.

### İşler
- [ ] ÖğretmenOS mevcut veri katmanını incele
- [ ] minimum export contract belirle
- [ ] kanonik JSON → ÖğretmenOS export dönüştürücü
- [ ] tema / bölüm / sayfa indexleri
- [ ] tam metin veya alan bazlı arama indexi
- [ ] veri sürümü metadata'sı
- [ ] import validation
- [ ] test fixture
- [ ] ÖğretmenOS içinde 1. tema smoke test

### İlke
ÖğretmenOS gereksinimi nedeniyle kanonik şema UI state ile doldurulmayacak. Gerekirse export katmanı normalize edecektir.

### Kalite kapısı
ÖğretmenOS'ta sayfa, etkinlik veya soru bulunup öğretmen rehberliği açılabilmeli.

---

## Faz 6 — Kindle EPUB üreticisi v0.1

### Hedef
Aynı veriden elle içerik kopyalamadan kullanılabilir bir öğretmen e-kitabı üretmek.

### İşler
- [ ] EPUB klasör / package yapısı
- [ ] XHTML template sistemi
- [ ] tema / bölüm / etkinlik / soru anchor standardı
- [ ] TOC üretimi
- [ ] sayfa indeksi
- [ ] kavram indeksi
- [ ] öğrenme çıktısı indeksi
- [ ] soru → cevap / rehber → soru geri dönüş bağlantıları
- [x] her rehber kaydını Kindle'da yeni sanal sayfadan başlat
- [x] kullanıcıya dönük kaynak görünümünde yalnız basılı sayfayı göster
- [ ] çapraz referans linkleri
- [ ] Kindle uyumlu CSS
- [ ] kapak ve metadata
- [ ] EPUBCheck doğrulaması
- [ ] Kindle gönderim / cihaz testi
- [ ] font, tablo ve uzun içerik taşma testi

### Kindle tasarım ilkesi
EPUB, JavaScript olmadan da tamamen kullanılabilir olmalıdır.

### Kalite kapısı
Bir öğretmen 1. tema içinde yalnızca Kindle üzerinden, sürekli geri kaydırmadan etkinlik ve sorular arasında rahatça dolaşabilmeli.

---

## Faz 7 — Ders Modu / Lesson Player pilotu

### Hedef
Kanonik veriyi sınıfta doğrudan yürütülebilen tam ekran bir ders arayüzüne dönüştürmek.

### Doğrulanmış dersler
- **Karagöz / Yazıcı — s.15–35**
- **Mektup / Âli’ye Mektuplar — s.36–52**
- **Edebiyat Atölyesi-1 / Konuşma — s.53–58**

### İşler
- [x] uygulama planını ve lesson-flow sözleşmesini oluştur
- [x] React/Vite uygulama kabuğunu oluştur
- [x] source-index + answer-bank + lesson-flow veri derleyicisini oluştur
- [x] source-index ve answer-bank eksiksizlik kapısını ekle
- [x] soru, süreç, bilgi, vocabulary ve yapı görünümü için ilk rendererları oluştur
- [x] kontrollü reveal, klavye navigasyonu ve tam ekranı ekle
- [x] CI build sonucunu doğrula
- [x] gerçek ders kitabıyla s.15–35 akışını doğrula
- [x] 49 adımlık source/answer/sıra kalite kapısını ekle
- [x] kullanıcı düzenleme modunun ilk sürümünü ekle
- [x] presenter/ikinci ekran görünümünü ekle
- [x] adım bazlı içerik yoğunluğu kontrolünü ekle
- [ ] gerçek tarayıcı/projektör smoke testi
- [ ] uzun içerik ve küçük ekran taşma testi
- [ ] PDF/PPTX dışa aktarma

Ayrıntılı tasarım: [docs/LESSON_PLAYER_PLAN.md](docs/LESSON_PLAYER_PLAN.md)

### Kalite kapısı
Öğretmen Karagöz s.15–35 arasında EPUB'a dönmeden ilerleyebilmeli; ilgili source-index ve answer-bank kayıtlarından hiçbiri sessizce atlanamamalı.

---

- [x] çoklu ders kataloğu ve ders seçici
- [x] Mektup / Âli’ye Mektuplar s.36–52

## Faz 8 — 1. Tema entegrasyon ve kalite dondurması

### Hedef
Şemayı tüm temalara çoğaltmadan önce gerçek kullanım sorunlarını bulmak.

### İşler
- [ ] ÖğretmenOS ve EPUB çıktısını aynı veriden karşılaştır
- [ ] kayıp alan kontrolü
- [ ] Kindle gerçek cihaz kullanım notları
- [ ] ÖğretmenOS ders içi kullanım notları
- [ ] tekrar eden rehber cümlelerini tespit et
- [ ] gereksiz alanları temizle
- [ ] eksik öğretmen rehberliği alanlarını belirle
- [ ] şema v0.2 gerekiyorsa migration yaz
- [ ] 1. tema için öğretmen review tamamla

### Kalite kapısı
Şema ancak bu fazdan sonra 2–4. temalar için “stabil” kabul edilir.

---

## Faz 9 — 2–4. temalara ölçekleme

### Hedef
Pilot mimariyi bozmadan kalan temaları tamamlamak.

### Sıra
- [ ] 2. Tema — Kültür Yolculuğu
- [ ] 3. Tema — Yaşamın İzinde
- [ ] 4. Tema — Hayatın Aynası

Her tema için aynı pipeline:

```text
extract
  -> map
  -> identify block type
  -> generate in small natural blocks
  -> validate
  -> teacher review
  -> ÖğretmenOS export
  -> EPUB build
```

11. sınıfın kalan temalarında ve daha sonra hazırlanacak diğer sınıf seviyelerinde [docs/BLOCK_AUTHORING_STANDARD.md](docs/BLOCK_AUTHORING_STANDARD.md) zorunlu çalışma sözleşmesidir. **Anlama/Okuma, Konuşma, Dinleme-İzleme, Yazma ve Ölçme-Değerlendirme** blokları pedagojik işlevlerine göre ayrılır; konuşma/yazma/araştırma görevleri klasik cevap anahtarına zorlanmaz. Harici kaynağın cevaba gerçekten gerekli olup olmadığı ayrıca değerlendirilir; gerekli ve erişilemezse `source_limited` kullanılır.

### Kalite kapısı
Her tema için veri doğrulaması, kaynak izi ve review durumu ayrı raporlanır. Ayrıca her doğal blok tamamlandığında duplicate ID, boş cevap, yanlış entry type ve gereksiz yönlendirme kontrolü yapılmadan sonraki bloğa geçilmez.

---

## Faz 10 — Arama ve indeks kalitesi

### Hedef
Rehberi yalnız doğrusal kitap olmaktan çıkarıp hızlı başvuru kaynağına dönüştürmek.

### İşler
- [ ] kavram sözlüğü
- [ ] yazar / eser indeksi
- [ ] metin türü indeksi
- [ ] beceri / öğrenme çıktısı indeksi
- [ ] sayfa indeksi
- [ ] etkinlik türü indeksi
- [ ] ilişkili içerik önerileri
- [ ] eş anlamlı / alternatif arama terimleri
- [ ] ÖğretmenOS arama ağırlıkları

---

## Faz 11 — Release hattı

### Hedef
Tek komutla doğrulanmış çıktılar üretmek.

### Hedef komut örneği

```bash
./tools/build-all
```

Beklenen sıra:

```text
validate source manifest
validate canonical data
run quality checks
build ÖğretmenOS package
build EPUB
run EPUBCheck
write checksums
write build manifest
```

### Çıktılar

```text
dist/
├── ogretmenos/
│   └── grade-11-guide.json
├── epub/
│   └── ogretmen-rehberi-11.epub
├── build-manifest.json
└── checksums.txt
```

---

## Sonraki sürümler için olası işler

Bunlar v1 kapsamının parçası değildir; ancak veri modeli izin verirse sonradan eklenebilir:

- ders öncesi “bugün ne işleyeceğim?” görünümü
- 40 dakikalık ders akışı özeti
- kısa / orta / ayrıntılı öğretmen açıklaması seviyeleri
- kişisel öğretmen notları için ayrı overlay katmanı
- “bu soruda öğrenciler nerede zorlanır?” hızlı görünümü
- ders sırasında favori / yer imi
- başka sınıf seviyeleri
- başka dersler
- öğretmen tarafından düzenlenen içerik ile temel rehber verisini ayıran patch sistemi

---

## Sürüm hedefleri

| Sürüm | Hedef |
|---|---|
| v0.1 | Kaynak haritası + ilk şema |
| v0.2 | 1. tema kanonik veri pilotu |
| v0.3 | Doğrulama ve kalite araçları |
| v0.4 | ÖğretmenOS adaptörü |
| v0.5 | Kindle EPUB üreticisi |
| v0.6 | 1. tema gerçek kullanım dondurması |
| v0.7 | 2–4. temaların üretimi |
| v0.9 | Tam 11. sınıf release candidate |
| v1.0 | 11. sınıf Öğretmen Rehberi: ÖğretmenOS + Kindle |

## Şu anki sonraki adım

**11. sınıf 3. Tema — Yaşamın İzinde** rehber üretimine, Tema 1 ve Tema 2'de doğrulanan blok bazlı kalite standardıyla devam etmek.
