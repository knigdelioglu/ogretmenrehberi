# 1. Tema Entegrasyon ve Kalite Dondurma Raporu

**Tarih:** 18 Eylül 2026  
**Kapsam:** 11. Sınıf Türk Dili ve Edebiyatı · 1. Tema — *Bir Diyeceğim Var!* · basılı s.12–83  
**Repo durumu:** `FROZEN_REPO_QA`

## 1. Sonuç

Tema 1 için kanonik kaynak/cevap verisi ile üç tüketici hattı birlikte doğrulandı:

1. **Lesson Player**
2. **Kindle uyumlu EPUB**
3. **ÖğretmenOS generic Teacher Guide runtime sözleşmesine uygun projection bundle**

Otomatik dondurma kapısı son durumda:

- **0 hata**
- **0 uyarı**
- **0 yüksek benzerlik / tam rehber tekrarı adayı**
- **129 / 129 source kaydı VERIFIED**
- **151 / 151 answer-bank kaydı kapsandı**
- **12 / 12 source-limited sınırı korundu**

Sabit semantik içerik fingerprint'i:

`sha256:6895cf6727dc094653ccc0c1b20ae814294f8c7e7025622a7e18a56f2a391105`

Bu fingerprint Lesson Player'ın build zamanı gibi semantik olmayan metadata'sını içermez ve aynı girdilerle iki kez üretilen ÖğretmenOS bundle'ı byte-for-byte eşit olmak zorundadır.

## 2. Dondurulmuş kapsam

| Katman | Dondurulmuş kapsam |
|---|---:|
| Lesson Player ders sayısı | 7 |
| Lesson Player ders adımı | 176 |
| Source-index kaydı | 129 |
| VERIFIED source | 129 |
| Answer-bank kaydı | 151 |
| Source-limited kayıt | 12 |
| EPUB semantik parite | 151 / 151 |
| ÖğretmenOS guide | 1 |
| ÖğretmenOS section | 7 |
| ÖğretmenOS unit | 129 |
| ÖğretmenOS item | 176 |
| ÖğretmenOS relation | 327 |

Lesson Player kitap sırasını korur:

1. Tema Girişi — s.12–14
2. Karagöz / Yazıcı — s.15–35
3. Mektup / Dilekçe — s.36–52
4. Konuşma — s.53–58
5. Dinleme / İzleme — s.59–73
6. Yazma / E-posta — s.74–78
7. Ölçme ve Değerlendirme — s.79–83

## 3. Üç tüketici paritesi

### Lesson Player

Lesson Player build'i ilgili source-index ve answer-bank envanterinin tamamını temsil etmek zorundadır. Bir source veya answer sessizce atlanırsa build başarısız olur.

Dondurulmuş değerler:

- 7 lesson
- 176 step
- 129 benzersiz source kullanımı
- 151 answer kullanımı

### Kindle EPUB

EPUB kalite kapısı yalnız kayıt sayısını kontrol etmez. Üretilen EPUB XHTML'i açılarak her answer-bank kaydı için şu alanların gerçekten görünür metne taşındığı doğrulanır:

- `prompt_summary`
- `answer`
- `answer_sections`
- `guidance`
- `explanation`
- `evidence_quotes`

Sonuç: **151 / 151 semantik alan paritesi PASS**.

EPUB bölüm sınırları da kitapla yeniden hizalandı:

- Temaya Başlarken — s.14
- Karagöz / Yazıcı — s.15–35
- Mektup / Dilekçe — s.36–52
- Konuşma — s.53–58
- Dinleme / İzleme — s.59–73
- Yazma / E-posta — s.74–78
- Ölçme ve Değerlendirme — s.79–83

### ÖğretmenOS

Bu repoda ÖğretmenOS uygulamasının SQLite runtime'ı doğrudan değiştirilmez. Bunun yerine mevcut generic Teacher Guide runtime sözleşmesine projekte edilebilir deterministik bir bundle üretilir.

Bundle şu generic yapılara karşılık gelir:

- `canonical_entities`
- `teacher_guides`
- `teacher_guide_sections`
- `teacher_guide_units`
- `teacher_guide_items`
- `teacher_guide_item_relations`

Projection canonical snapshot içinde source ve answer payload'larını kayıpsız taşır. Lesson Player'ın UI için türettiği alanlar kanonik answer-bank verisinin yerine geçirilmez.

## 4. Kalite dondurması sırasında bulunan ve düzeltilen sorunlar

### QF-01 — stale source-index metadata

Gerçekte 129/129 source kaydı VERIFIED ve answer-bank COMPLETE olmasına rağmen source-index üst metadata'sı hâlâ `REBUILDING` ve eski `linked_answers: 74` bilgisini taşıyordu.

**Düzeltme:** stale linkage metadata kaldırıldı; durum `COMPLETE_WITH_SOURCE_LIMITED`, sayım `129 records / 129 verified_records` olarak sabitlendi.

### QF-02 — EPUB bölüm sınırı hatası

EPUB yapılandırmasında Temaya Başlarken s.14–17, Karagöz s.18–35 olarak tanımlıydı. Bu, gerçek kitap sırasıyla uyuşmuyordu. Ayrıca Konuşma s.58'i kapsamıyordu.

**Düzeltme:** s.14, s.15–35 ve s.53–58 sınırları gerçek kitapla hizalandı.

### QF-03 — source-limited rehberlik eksikliği

`T1-P73-Q01` dış videoya bağlı olduğu için doğru biçimde `source_limited` idi; ancak öğretmenin öğrenciden hangi somut kanıtı istemesi gerektiğini söyleyen guidance alanı yoktu.

**Düzeltme:** videodan gerçekten duyulan/görülen en az bir dil veya üslup özelliğiyle gerekçelendirme yönlendirmesi eklendi. Freeze artık guidance'sız source-limited kaydı hata sayar.

### QF-04 — UI normalizasyonunun kanonik veriye sızma riski

Lesson Player bazı eski kayıtlarda eksik `question_no` alanını question ID'den türetiyor. Generated answer nesnesini kanonik nesneyle byte düzeyinde eşitlemek yanlış biçimde drift üretiyordu.

**Düzeltme:** ÖğretmenOS export answer payload'ını generated UI nesnesinden değil doğrudan canonical answer-bank kaydından alır. UI normalizasyonu kanonik veri olarak kabul edilmez.

### QF-05 — deterministik olmayan fingerprint riski

İlk fingerprint hesabında Lesson Player'ın her build'de değişen `generated_at` alanı bulunuyordu. İçerik aynı olsa bile fingerprint değişebilirdi.

**Düzeltme:** semantik fingerprint build metadata'sından ayrıldı. CI aynı bundle'ı iki kez üretip `cmp` ile byte-for-byte eşitlik arar.

## 5. Tekrar, gereksiz alan ve rehberlik denetimi

### Tekrar taraması

151 cevap üzerinde:

- answer exact duplicate: **0**
- guidance/explanation exact duplicate adayı: **0**
- uzun guidance/explanation yüksek benzerlik adayı (>= 0.94): **0**

Bu nedenle otomatik benzerlik gerekçesiyle pedagojik içerik silinmedi.

### Gereksiz alanlar

Opsiyonel alanlar yalnız içerik varsa tutulur. Freeze şu alanlardan biri JSON'da var olduğu hâlde boşsa hata verir:

- `guidance`
- `explanation`
- `evidence_quotes`
- `answer_sections`

Sonuç: **0 boş opsiyonel alan**.

### Rehberlik alanları

Dondurulmuş answer-bank'te:

- guidance bulunan kayıt: 56
- explanation bulunan kayıt: 10
- evidence_quotes bulunan kayıt: 18
- structured answer_sections bulunan kayıt: 24

Bu alanların her soruda bulunması beklenmez; yalnız pedagojik işlevi varsa kullanılır.

## 6. Şema kararı

Yeni şema migrasyonu yapılmadı.

Mevcut sözleşmeler üç tüketici için kayıpsız bulundu:

- source-index: **1.0.0**
- answer-bank: **2.0.0**
- lesson-flow: **0.2.0**

Bu nedenle salt kalite dondurması için yeni alan veya kırıcı migration eklemek gereksiz kabul edildi.

## 7. Freeze politikası

Kalıcı baseline:

`data/grade-11/source/teacher-book/theme-1/quality-freeze.json`

Tema 1 source-index, answer-bank veya presentation flow içeriği semantik olarak değişirse:

1. ÖğretmenOS projection fingerprint'i değişir.
2. Freeze manifesti eski fingerprint'i tuttuğu için CI başarısız olur.
3. Değişiklik bilinçli olarak review edilirse freeze manifesti yeni kapsam/fingerprint ile güncellenir.
4. Üç tüketici paritesi yeniden PASS olmadan yeni baseline kabul edilmez.

Bu mekanizma Tema 1'in zamanla sessizce drift etmesini engeller.

## 8. Otomatik doğrulamanın dışında kalan manuel kabul testleri

Aşağıdaki iki madde repo-içi kalite dondurmasında PASS ilan edilmemiştir:

- **Fiziksel Kindle cihazına gönderim ve gerçek cihaz okuma deneyimi**
- **ÖğretmenOS gerçek runtime importu ve cihaz üzerinde ders içi kullanım**

Bunlar kanonik veri/şema dondurmasından ayrı ürün kabul testleridir. Manuel testte veri modelini etkileyen bir sorun bulunursa Tema 1 freeze yeniden açılmalıdır.

## 9. Dondurma kararı

Tema 1 için repo-içi kanonik içerik, Lesson Player akışı, EPUB semantik çıktısı ve ÖğretmenOS projection sözleşmesi **FROZEN_REPO_QA** durumuna alınmıştır.

Bu taban, 2–4. temalara ölçeklemede referans kalite sözleşmesi olarak kullanılabilir.
