# Tema 1 Öğretmen Rehberi Verileri — Pedagojik Kalite İncelemesi

**Tarih:** 24 Eylül 2026  
**Kapsam:** 11. sınıf Türk Dili ve Edebiyatı, 1. Tema *Bir Diyeceğim Var!*; öğretmen rehberi cevap bankası (basılı s.14–83), kaynak indeksi ve tema-program hizalama kaydı.  
**İncelenen ana veri:** `data/grade-11/source/teacher-book/theme-1/answer-bank/` ve bu klasördeki indeks/dondurma kayıtları.

## Yönetici özeti

**Genel değerlendirme: Pedagojik açıdan güçlü bir temel; yayıma hazır kabulü için sınırlı editoryal düzeltme ve kaynak erişimi gerekiyor.** Veri, öğrenci düşünmesini destekleyen açık uçlu cevaplar, performans görevleri için model ve yöntem desteği, QR içeriğine bağlı sorularda kaynak sınırını koruma bakımından güçlü. Örnek sayfa kontrolleri soru ve cevap bankası eşleşmelerinin çoğunu destekliyor. İyileştirme alanları, tartışma sorularında olası yargıların fazla kesin yazılması, video gerektiren bir cevabın genel bilgiyle tamamlanması ve iki öğrenme çıktısının resmî ölçme hedeflerinin erişilememesi.

## Kapsam ve yöntem

- 23 parça dosyada toplam **154 cevap kaydı** yapısal olarak tarandı: 116 `question_answer`, 24 `performance_support`, 14 `source_limited`.
- Kimlik tekrarları kontrol edildi: **0 tekrar**. Kayıtlarda cevap alanı ve kaynak konumu bulunuyor; sayfa, görev türü ve ilgili isteğe göre alanların yapılandırılmış kullanımı incelendi.
- Kaynak PDF’sinin basılı s.14, 25, 27–28, 35, 43, 46, 51–52, 58, 63–67, 71–74, 76–78 ve 79–83 sayfaları metin çıkarımıyla örneklem olarak kontrol edildi; kritik sayfalardan bazıları görsel olarak da incelendi. Bu örneklem soru metni, kayıt kimliği ve basılı/PDF sayfa eşleşmesini denetledi; 154 cevabın her biri için tam kaynak doğrulaması yapılmadı.
- Cevap bankası kalite standardı, blok yazım standardı, mevcut kalite dondurma raporu ve `theme-1.json` program hizalamasıyla karşılaştırıldı.

**Kaynak sınırı:** Kullanıcının sağladığı 313 sayfalık PDF `sources/local/turk-dili-ve-edebiyati-11sinif-ders-kitabi.pdf` konumuna eklendi ve yukarıdaki basılı sayfa örneklemiyle kullanıldı. Dosya SHA-256 değeri `a097891ea884a55162b96a89e520e6bebb1f6a361c3ac2a941c0c7625d2683e0`; `sources/manifest.json` içindeki kayıtlı resmi PDF fingerprint’i `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba` ile eşleşmiyor. Sayfa sayısı ve incelenen sayfaların içerikleri eşleşse de ikili dosya düzeyinde kaynak kimliği doğrulanmış sayılmamalı. Bu nedenle örneklem doğrulaması yapıldı, 154 cevabın her biri baştan sona kaynakla denetlenmedi. PDF’de yalnız QR ile açılan video ve rubriklerin içeriği yer almadığından bu materyaller bu incelemede doğrulanamadı. Önceki kalite dondurma dosyasındaki sayım/fingerprint değerleri yeniden üretilmedi.

## Güçlü yönler

1. **Açık uçlu görevlerde yanıt çeşitliliğine alan açılıyor.** Örneğin Yazıcı’daki çatışmanın dramatik ögelerle güçlendirilmesi için farklı seçenekler kabul ediliyor (T1-P35-Q02); Karagöz’ün çağdaş bir mizah sanatçısıyla karşılaştırılmasında tek zorunlu eşleştirme dayatılmıyor (T1-P81-Q06).
2. **Öğrencinin yerine kişisel değerlendirme yapılmıyor.** Çıkış kartı ve öz değerlendirme örnekleri model olarak tanımlanıyor; öğrencinin kendi deneyimi ve performansına göre doldurması isteniyor (T1-P58-PERF01, T1-P73-PERF01, T1-P78-PERF01).
3. **Performans desteği yalnız nihai ürün vermekten ibaret değil.** Araştırmada kanıt–soru–araştırma–yorum sırası ve metin/dış kaynak/öğrenci yorumu ayrımı destekleniyor (T1-P34-PERF01, T1-P45-PERF01). Drama ve e-posta örneklerinde planlama, uygulama ve kontrol adımları bulunuyor.
4. **Harici kaynak sınırları çoğunlukla iyi korunuyor.** Videonun dili, ana düşüncesi veya görsel/işitsel özellikleri QR içeriği görülmeden kesinleştirilmiyor; öğrenciden gerçek kanıt isteniyor (T1-P66-Q04–Q05, T1-P67-Q08–Q09, T1-P73-Q01–Q02, T1-P83-Q13).
5. **İşlevsel öğretmen desteği mevcut.** Tip–karakter ayrımı, metin kanıtına dayalı çıkarım, iletişim engelleri ve mektup türü tanıma gibi konuya özgü destekler genel ve tekrarlı öğretmen cümlelerinden daha kullanışlı.
6. **Programla kapsam eşleşmesi büyük ölçüde kurulmuş.** Depodaki hizalama kaydı 16 öğrenme çıktısının 14’ünü tam, 2’sini kısmi kapsanmış gösteriyor; kapsanmamış çıktı bildirmiyor.

## İyileştirme bulguları

### 1. Değerlendirme görevlerinde bazı yargılar olası örnek olmaktan çıkıp kesin sonuca dönüşüyor — orta öncelik

Basılı s.63, iletişim hızının olumlu ve olumsuz yönlerinin değerlendirilmesini istiyor. T1-P63-PERF01 iki yönü de ele alsa da “ilişkilerin yüzeyselleşmesi”, “mekanikleşme” ve “asıl değer” hakkındaki ifadeler tartışılabilir olguları kanıtlanmış sonuç gibi sunabiliyor. Öğrenci farklı deneyim ve kanıtlardan başka sonuçlara ulaşabilir.

T1-P66-Q02 ise basılı s.66’daki “e-posta ... hangi yönlerden avantajlı olabilir?” sorusuna cevap verir; dolayısıyla avantajları seçmesi göreve uygundur. Ancak “maliyet bariyerini ortadan kaldırma”, “resmî delil” ve mesajlaşma uygulamalarına kıyasla “kurumsal ciddiyet” gibi karşılaştırmalar her kullanımda geçerli değildir. Ayrıca kitap bu cevabı çok modlu videodan ve önceki bilgilerden kurmayı ister. Rehber, video içeriğine dayalı bir kanıt veya QR videosu incelenmediğine ilişkin sınır vermiyor.

**Öneri:** T1-P63-PERF01’de bu etkileri olası tartışma boyutları olarak çerçeveleyin ve sonuçları öğrencinin gerekçesine bırakın. T1-P66-Q02’de karşılaştırmaları bağlama bağlayın; QR video gerçekten dayanak sağlıyorsa videodan gözlem/kanıt ekleyin, aksi durumda cevabı genel bilgiye dayalı örnekle sınırlayın ve video kaynağı görülmeden kesinleştirilmediğini belirtin.

### 2. Bazı model ürünler öğretmen/öğrenci için fazla tamamlanmış — orta öncelik

Mektup ve e-posta üretim örnekleri oldukça özgül ve tamamlanmış (T1-P46-Q04, T1-P77-PERF01). Kitap s.46’da öğrenciden aynı içerikte bir mektup yazmasını istiyor; rehberde model plan ve ürün bulunması bu görevle uyumlu, ayrıca kayıtta modelin aynen kullanılmasının gerekmediği belirtiliyor. Yine de uzun ve retorik açıdan güçlü model, şiirdeki imge ve duyguların tek geçerli dönüşümüymüş gibi okunabilir. E-posta modeli de öğrencinin kendi amacı/muhatabı yerine hazır okul kütüphanesi senaryosunu öne çıkarabilir.

**Öneri:** Modeli kısa tutun veya tamamlanmış ürün yerine plan + kısa örnek bölüm + değerlendirme ölçütü verin. Modelin hangi kitap ölçütlerini nasıl karşıladığını görünür kılın; alternatif içerik seçimlerinin de aynı ölçütlerle başarılı olabileceğini belirtin.

### 3. İki öğrenme çıktısının resmi değerlendirme hedefi çözümlenmemiş — yüksek öncelik

`data/grade-11/source/alignment/theme-1.json`, **TDE3.4** (konuşma sürecini değerlendirme) ve **TDE4.4** (yazma sürecini değerlendirme) için QR ile verilen dereceli puanlama anahtarlarının ölçüt × düzey yapısının yerel kitap PDF’sinde bulunmadığını ve hedefin çözümlenmemiş kaldığını belirtiyor. Sağlanan PDF’de de QR karekodu ve puanlama ölçütlerine ilişkin genel açıklama var, fakat tam rubrik içeriği yer almıyor. Bu, cevap bankasının yanlış yazıldığı anlamına gelmiyor; programın görünür kanıt ve geri bildirim beklentisinin tam karşılandığı henüz gösterilemiyor. Akran değerlendirme formunun içeriği de QR’ye bağlı ve yerel PDF’de görünmüyor (T1-P58-SRC01).

**Öneri:** Resmî QR rubrikleri erişilebilir olduğunda ölçüt ve düzeyleri doğrulayın, cevap bankası/öğretmen iş akışındaki değerlendirme desteğini bu kaynakla hizalayın. Erişim sağlanana kadar tema hizalamasını “tamamlandı” olarak sunmayın.

### 4. Örneklem dışındaki cevapların kaynak doğruluğu tam denetlenmedi — denetim sınırı

Freeze kaydı 129/129 doğrulanmış kaynak kaydı ve 154 cevap kaydı bildiriyor. Bu çalışmada PDF’den belirlenen sayfa örneklemi kontrol edildi; kayıt sayımları bağımsız olarak yeniden üretilmedi ve bütün cevaplar metin/görsel kanıtıyla tek tek karşılaştırılmadı. Dolayısıyla soru-kayıt örneklemi eşleşmesi görülmüş olsa da 154 cevabın tümünün kaynak doğruluğu için bağımsız güvence verilmemeli.

**Öneri:** Tam doğrulama isteniyorsa kalan cevap kayıtlarını basılı sayfa sırası ve QR/görsel bağımlılıklarına göre blok blok karşılaştırın.

## Öncelikli iş listesi

| Öncelik | İş | Beklenen sonuç |
|---|---|---|
| Yüksek | TDE3.4 ve TDE4.4 için QR dereceli puanlama anahtarlarını edinip hizalamayı çözmek | Program değerlendirme kanıtı ve geri bildirim yolundaki iki kısmi alanın kapanması |
| Orta | T1-P63-PERF01 ve T1-P66-Q02 cevaplarında kesin yargıları koşullamak; T1-P66-Q02’de video dayanağını/sınırını açıklamak | Öğrenci değerlendirmesinin korunması ve video kaynağına sadakat |
| Orta | T1-P46-Q04 ve T1-P77-PERF01 modellerinde tek örneğe bağlılığı azaltıp ölçütleri görünür kılmak | Öğrenci üretiminin özgünlüğünü ve ölçüt görünürlüğünü artırmak |
| Sonraki çalışma | Kalan kayıtların basılı sayfa ve erişilebilen QR kaynaklarıyla blok blok karşılaştırılması | Cevapların tüm kapsamına ilişkin bağımsız güvence |

## Sonuç

Tema 1 cevap bankasının pedagojik tasarımı; açık uçluluk, öğrenci özerkliği, performans desteği ve kaynak sınırına saygı bakımından **güçlü**. Başlıca kalite riski içeriklerin genel olarak yanlış görünmesi değil; bazı örneklerin tartışma sonuçlarını erken çerçevelemesi, videoya bağlı bir cevabın kaynağı görmeden genel bilgiyle tamamlanması ve iki program değerlendirme hedefinin QR rubrikleri erişilemediği için açık kalması. Örnek sayfa denetimi yapılmıştır; fingerprint uyuşmazlığı ve örneklem sınırı nedeniyle tam kaynak doğrulaması sonucu verilmemeli. Önerilen karar: **“Revizyonla kullanılabilir; TDE3.4/TDE4.4 rubrikleri ve kalan cevapların kaynak doğrulaması tamamlanana kadar tam doğrulanmış statüsü verilmemeli.”**

## İncelenen repo kayıtları

- `data/grade-11/source/teacher-book/theme-1/answer-bank.json`
- `data/grade-11/source/teacher-book/theme-1/answer-bank/` (toplam 23 parça dosya)
- `data/grade-11/source/teacher-book/theme-1/source-index.json`
- `data/grade-11/source/teacher-book/theme-1/quality-freeze.json`
- `data/grade-11/source/alignment/theme-1.json`
- `docs/ANSWER_BANK_QUALITY_STANDARD.md`
- `docs/BLOCK_AUTHORING_STANDARD.md`
- `docs/THEME_1_PEDAGOGICAL_ENRICHMENT_AUDIT.md`
- `docs/THEME_1_QUALITY_FREEZE_2026-09-18.md`
- `sources/local/turk-dili-ve-edebiyati-11sinif-ders-kitabi.pdf` (kullanıcı tarafından sağlanan, Git dışında tutulan kaynak kopyası)
