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
- **1. Tema / Giriş — s.12–14**
- **Karagöz / Yazıcı — s.15–35**
- **Mektup / Âli’ye Mektuplar — s.36–52**
- **Edebiyat Atölyesi-1 / Konuşma — s.53–58**
- **Metin Tahlili-3 / Dinleme-İzleme — s.59–73**
- **Edebiyat Atölyesi-2 / Yazma — s.74–78**
- **1. Tema / Ölçme ve Değerlendirme — s.79–83**

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
1. Tema s.12–83 arasında **7 ders / 176 adım / 129 source-index / 151 answer-bank** kaydıyla kesintisiz temsil edilmelidir. Herhangi bir source-index veya answer-bank kaydı sessizce atlanırsa build başarısız olmalıdır.

---

- [x] çoklu ders kataloğu ve ders seçici
- [x] Mektup / Âli’ye Mektuplar s.36–52
- [x] Dinleme-İzleme s.59–73
- [x] Edebiyat Atölyesi-2 / Yazma s.74–78
- [x] 1. Tema / Ölçme ve Değerlendirme s.79–83

## Faz 8 — 1. Tema entegrasyon ve kalite dondurması

### Hedef
Şemayı tüm temalara çoğaltmadan önce gerçek kullanım sorunlarını bulmak ve Tema 1 için kanonik entegrasyon tabanını dondurmak.

### İşler
- [x] ÖğretmenOS projection bundle ve EPUB çıktısını aynı kanonik veriye karşı karşılaştır
- [x] answer/guidance/explanation/evidence/structured answer alanlarında kayıp alan kontrolü
- [ ] Kindle gerçek cihaz kullanım notları — **manuel kabul testi**
- [ ] ÖğretmenOS gerçek runtime importu ve ders içi kullanım notları — **manuel kabul testi**
- [x] tekrar eden rehber cümlelerini tespit et — yüksek benzerlik/tam tekrar adayı: **0**
- [x] gereksiz/stale alanları temizle — source-index rebuild metadata ve boş opsiyonel alan politikası
- [x] eksik öğretmen rehberliği alanlarını belirle ve düzelt — source-limited s.73 yönlendirmesi tamamlandı
- [x] şema migrasyonu kararını ver — **migration gerekmedi**
- [x] 1. tema repo-içi kaynak/cevap öğretmen review'unu tamamla — 129/129 source `VERIFIED`, 151 answer QA

### Dondurulmuş taban
- 7 ders / 176 Lesson Player adımı
- 129 source-index kaydı
- 151 answer-bank kaydı
- 12 source-limited kayıt
- ÖğretmenOS projection: 1 guide / 7 section / 129 unit / 176 item / 327 relation
- EPUB semantik paritesi: 151 / 151
- otomatik QA: 0 hata / 0 uyarı / 0 tekrar adayı
- freeze manifesti: `data/grade-11/source/teacher-book/theme-1/quality-freeze.json`

### Kalite kapısı
Tema 1 repo-içi veri modeli ve üç tüketiciye projeksiyon sözleşmesi **FROZEN_REPO_QA** durumundadır. Kanonik veya sunum verisi değişirse freeze fingerprint'i bilinçli olarak güncellenmeden CI geçmez.

Answer-bank 2.0, source-index 1.0 ve lesson-flow 0.2 ile veri kaybı saptanmadığı için yeni bir şema migrasyonu gerekmemiştir. Fiziksel Kindle ve gerçek ÖğretmenOS runtime/cihaz testleri ürün kabul testidir; bir sorun kanonik sözleşmede değişiklik gerektirirse freeze yeniden açılır.

Ayrıntılı kanıt: [THEME_1_QUALITY_FREEZE_2026-09-18.md](docs/THEME_1_QUALITY_FREEZE_2026-09-18.md)

---

## Faz 9 — 2–4. temalara ölçekleme

### Hedef
Pilot mimariyi bozmadan kalan temaları tamamlamak.

### Sıra
- [x] 2. Tema — Kültür Yolculuğu
  - [x] Tema Girişi / Temaya-Konuya Başlarken — s.84–88
  - [x] Türk Dilleri + Oğulla Buluşma — s.89–107
  - [x] Eski İstanbul’dan Çizgiler / Anı — s.108–112
  - [x] Orhun Abideleri — s.113–124
  - [x] Dîvânu Lugâti’t-Türk — s.125–128
  - [x] Konuşma — s.129–135
  - [x] Dinleme / İzleme — Âşık Atışması — s.136–147
  - [x] Yazma — Çevrim İçi Müze — s.148–154
  - [x] Ölçme ve Değerlendirme — s.155–159
- [~] 3. Tema — Yaşamın İzinde
  - [x] Tema Girişi / Temaya Başlarken — s.160–163
  - [x] Huzur: Konuya Başlarken / Metni Okuyalım — s.164–174
  - [x] Huzur: Metni Anlayalım — s.175–176 / soru 1–13
  - [x] Huzur: açık/örtük ileti, Mescid-i Aksa karşılaştırması ve Okuma Çemberi temel rolleri — s.177–178
  - [x] Huzur: Okuma Çemberi seçimlik roller, kişi çözümlemesi, Türk Romanında İlkler — s.179–181
  - [x] Huzur: gerçek yaşam/kurmaca, öznel/nesnel anlatım, duyarlılık — s.182–185
  - [x] Huzur: kahramanın dili, yapı, karakterler ve üslup çözümleme — s.186–188
  - [x] Huzur: üç çatışma parçası, dönem dili, yedi cümle, yazım ve sosyal bilimler — s.189–191
  - [x] Huzur: süreç değerlendirme çalışma kâğıdı ve çıkış kartı — s.192–193
  - [x] Metin Tahlili-2: biyografi hazırlığı / Mehmet Akif Ersoy ana metni ve Söz Varlığımız — s.194–198
  - [x] Metin Tahlili-2: Mehmet Akif Ersoy soruları, çalışma kâğıdı — s.199–201
  - [ ] Metin Tahlili-2: biyografi/tezkire devamı — s.202'den itibaren
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

**11. sınıf 3. Tema — Yaşamın İzinde:** Mehmet Akif biyografisi s.194–201 giriş, metin ve çalışma kâğıdı hazır. Sıradaki küçük doğal blok s.202–205 öznel/nesnel anlatım, biyografi türü ve Huzur karşılaştırmasıdır; gerçek kitap sayfaları doğrulanarak üretilecek. Tema 3 mevcut: 11 ders / 181 adım / 66 VERIFIED kaynak kullanımı / 67 answer (s.178–179 kaynak kaydı iki blokta ortaktır). Tema 1 ve 2 kalite kapsamını korumak.
