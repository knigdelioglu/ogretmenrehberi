# PR #99 — Pedagojik Kalite Denetimi (aşamalı)

**Temel karşılaştırma:** PR #99 öncesi `6f029e0` → PR #99 birleşmesi `ce8406d` → güncel `main`. PR #99'un değiştirdiği **27 parçalı cevap dosyası**, soru kimliği ve değişen alanlar açısından karşılaştırıldı.

**Sınıflandırma:** 39 kayıtta `answer` metni değişmiş (başka alanlar da değişmiş olabilir); bu kayıtlar pedagojik içerik denetimi için açıkça listelenmiştir. Ayrıca `T1-P64-Q01` yalnız tür/kaynak bakımından değişmiştir: bunun pedagojik etkisi ileride ayrıca teyit edilecektir. Yalnız `source_locator` düzenlenen diğer kayıtlar, metin kaybı değil kaynak bağlantısı denetimi kapsamında ele alınacaktır.

## Tur 1 — soru bazlı kalite kontrolü

| Kayıt | Eski cevabın öğretim değeri | PR #99 sonrası eksiklik | Tur 1 düzeltmesi ve kanıt sınırı |
| --- | --- | --- | --- |
| `T1-P53-Q01` | Karakter/sahne bazlı örnek ve çok modlu anlatım | Sahne çözümlemesi kısaltılmış | Üç olay–engel eşleştirmesi, çok modlu işlev; doğrulanmamış birebir replik **geri getirilmedi** |
| `T1-P53-Q02` | İletişim engelinin neden–sonuç ilişkisi | Tahtaya taşınabilir örnek ve çözüm azalmış | Üç olay için engel–etki–çözüm örneği; yorum ile olgu ayrı |
| `T1-P66-Q01` | Araştırma–video bağlantısı kurma modeli | Ekran ifadesi seçme yönergesine indirgenmiş | Mektup/e-posta araştırma örneği + iki doğrulanmış ekran ifadesi |
| `T1-P66-Q04` | Konu–tema örnek cevabı ve kavram ayrımı | Yalnız kesinleştirilemez uyarısı | Konu/tema için iki gerekçeli cevap ve konu–tema–ana düşünce ayrımı |
| `T1-P66-Q05` | Ana ve yardımcı düşüncelerin ayrı örnekleri | Yalnız nasıl bulunacağını söyleyen yönerge | Bir ana düşünce, üç yardımcı düşünce; 1971 ifadesi **ekran iddiası**, tarihsel teyit değil |

**Kaynaklar:** Ders kitabının `p053.json`, `p054.json`, `p066.json`, `p067.json` sayfaları; `QR-EBA-254C08EA3501.md` ve `QR-EBA-29BF4F293D53.md` medya gözlem notları; PR #99 öncesi ve sonrası cevap bankaları. İlgili MP4 kayıtlarını yeniden ses transkripsiyonuna sokma işlemi bu turda yapılmadı.

## Tur 2 — soru bazlı öğretim değeri ve kaybedilen içerik

| Kayıt | Eski sürümün öğretim değeri | PR #99 ve mevcut sürümün açığı | Bu turdaki geri kazanım |
| --- | --- | --- | --- |
| `T1-P66-Q03` | Medenileşme, bilgi aktarımı ve ortak yaşama ilişkin yorum | Öğrenci cevabı yüzeyselleşti; `answer_sections` / `guidance` konuşmacıya doğrulanmamış söz atfetti | Sosyal ilişki, ortak yaşam ve kültürel aktarım örnekleri; **ekrandaki ifadeden yapılan yorum** ayrı |
| `T1-P67-Q06` | Öğrencinin kullanabileceği örnek tahmin–tespit karşılaştırması | Kısıt uyarısı öne geçti, gerçek örnek kayboldu | Ön tahmin, ekran kanıtı ve tahminin nasıl genişlediğini anlatan tam örnek |
| `T1-P67-Q07` | Mektup/e-posta karşılaştırmasından gerekçeli genel sonuç | Öğrenci cevabı belirsiz, alt bölümler konuşmada doğrulanmamış hastane/bürokrasi iddiaları içeriyor | İki doğrulanmış ekran ifadesinden çıkarılan **insani ve toplumsal işlev** sonucu; bölüm/cevap tutarlılığı |
| `T1-P67-Q08` | Nesnel ve öznel ifadelerin örnekleri | Örnekler korunmuş; ifadelerin **anlatıma katkısı** ve ekran/yazar atfı ayrımı yeterince açık değildi | İfade–niteliği–metne katkısı eşleştirmesi; yanlış `nesnel=kesin doğru` çıkarımı önlendi |
| `T1-P67-Q09` | Giriş–gelişme–sonuç yönü olan örnek özet | Cevap yalnız tam transkript ihtiyacını söylüyor, ayrıntı bölümü ise doğrulanmamış video anlatımlarını tam özet gibi sunuyordu | **Sadece doğrulanmış ekran ifadelerinden kısmi özet** ve tutarlı ayrıntı yapısı; tam söyleşi özeti olduğu iddia edilmedi |

**Soru kaynağı:** `data/book/grade-11/themes/theme-1/pages/p066.json` ve `p067.json`.
**Video kanıtı:** `data/grade-11/source/qr-review-notes/QR-EBA-29BF4F293D53.md`, 01:04/02:05/03:08/04:06 ekran ifadeleri.
**Karar:** Görsel/ekran metninden **kaynaklı yorum** yapılabilir; depoda tam konuşma dökümü olmadıkça söyleşi konuşmacısına birebir söz veya videoda anlatıldığı kesin ayrıntı atfedilemez. `T1-P67-Q06–Q09` için `source_limited` statüsü korunmuştur. Mevcut video transkripsiyonu bu turda yeniden yapılmadı.

**Kalite duraklaması:** Beş kaydın tamamı ayrı ayrı karşılaştırıldı; bu turda içerik üretimi burada durur. Sonraki tur yeni dosya incelemesiyle başlar.

## Eksiksiz içerik karşılaştırma kuyruğu (39 kayıt)

| Tema | Cevap kimliği | Parça sayfaları | Soru düzeyinde kalite denetimi |
| --- | --- | --- | --- |
| Tema 1 | `T1-P53-Q01` | 53–58 | **Tur 1: incelendi ve düzeltildi** |
| Tema 1 | `T1-P53-Q02` | 53–58 | **Tur 1: incelendi ve düzeltildi** |
| Tema 1 | `T1-P66-Q01` | 64–67 | **Tur 1: incelendi ve düzeltildi** |
| Tema 1 | `T1-P66-Q03` | 64–67 | **Tur 2: incelendi ve düzeltildi** |
| Tema 1 | `T1-P66-Q04` | 64–67 | **Tur 1: incelendi ve düzeltildi** |
| Tema 1 | `T1-P66-Q05` | 64–67 | **Tur 1: incelendi ve düzeltildi** |
| Tema 1 | `T1-P67-Q06` | 64–67 | **Tur 2: incelendi ve düzeltildi** |
| Tema 1 | `T1-P67-Q07` | 64–67 | **Tur 2: incelendi ve düzeltildi** |
| Tema 1 | `T1-P67-Q08` | 64–67 | **Tur 2: incelendi ve düzeltildi** |
| Tema 1 | `T1-P67-Q09` | 64–67 | **Tur 2: incelendi ve düzeltildi** |
| Tema 1 | `T1-P72-Q01` | 72–73 | Bekliyor |
| Tema 1 | `T1-P73-Q01` | 72–73 | Bekliyor |
| Tema 1 | `T1-P73-Q02` | 72–73 | Bekliyor |
| Tema 1 | `T1-P83-Q13` | 79–83 | Bekliyor |
| Tema 2 | `T2-P88-Q01` | 86–89 | Bekliyor |
| Tema 2 | `T2-P88-Q02` | 86–89 | Bekliyor |
| Tema 2 | `T2-P88-Q03` | 86–89 | Bekliyor |
| Tema 2 | `T2-P88-Q04` | 86–89 | Bekliyor |
| Tema 2 | `T2-P88-Q05` | 86–89 | Bekliyor |
| Tema 2 | `T2-P113-Q01` | 113–120 | Bekliyor |
| Tema 2 | `T2-P129-Q01` | 129–135 | Bekliyor |
| Tema 2 | `T2-P129-Q02` | 129–135 | Bekliyor |
| Tema 2 | `T2-P129-Q03` | 129–135 | Bekliyor |
| Tema 2 | `T2-P140-VOC01` | 136–141 | Bekliyor |
| Tema 2 | `T2-P141-Q01` | 136–141 | Bekliyor |
| Tema 2 | `T2-P141-Q02` | 136–141 | Bekliyor |
| Tema 2 | `T2-P142-Q02` | 142–147 | Bekliyor |
| Tema 2 | `T2-P143-Q02` | 142–147 | Bekliyor |
| Tema 2 | `T2-P143-Q03` | 142–147 | Bekliyor |
| Tema 2 | `T2-P143-Q04` | 142–147 | Bekliyor |
| Tema 2 | `T2-P144-MAP01` | 142–147 | Bekliyor |
| Tema 2 | `T2-P145-PERF01` | 142–147 | Bekliyor |
| Tema 2 | `T2-P147-Q01` | 142–147 | Bekliyor |
| Tema 2 | `T2-P159-Q08` | 155–159 | Bekliyor |
| Tema 4 | `T4-P286-Q03` | 284–297 | Bekliyor |
| Tema 4 | `T4-P293-Q02` | 284–297 | Bekliyor |
| Tema 4 | `T4-P293-Q03` | 284–297 | Bekliyor |
| Tema 4 | `T4-P307-Q13` | 303–307 | Bekliyor |
| Tema 4 | `T4-P307-Q14` | 303–307 | Bekliyor |

**Tur 1–2 tamamlandı: 10/39 metni değişmiş cevap kaydı. Kalan: 29.**

## İnceleme kalite kapısı
1. Soru kökünü kitabın orijinal sayfasıyla eşleştir; yalnız JSON özetinden hareketle içerik oluşturma.
2. Eski cevap–PR #99 cevabı–mevcut `main` cevabı arasındaki örnek, kavram ve gerekçe değişimini incele; PR #103'te yapılmış önceki düzeltmeleri de koru.
3. `answer` ile `answer_sections` öğrenciye gösterilebilir somut yanıt sunmalı; öğretmene özel kontrol ve ihtiyat dili `guidance`/`explanation` alanlarında tutulmalı.
4. Gerçek ses alıntısına ihtiyaç varsa doğrulanmış transkripti bulmadan sözcüğü sözcüğüne söz uydurma. İçerik sahibi inceleme beyanı tek başına sözcüğü sözcüğüne transkript değildir.
5. Kontrolleri çalıştır ve yeni genel/tekdüze cevaplar üretme. Bir seferde küçük grup (yaklaşık 3–5 soru) değerlendir.
6. Kaynak yetersizliğinde veya inceleme kalitesi düşerse **o soruda dur**, tamamlanmayan kayıtları belgede bırak.

## Sonraki tur
Sıradaki beşli: Tema 1 `T1-P72-Q01`, `T1-P73-Q01`, `T1-P73-Q02`, `T1-P83-Q13` ve Tema 2 `T2-P88-Q01`; her biri için yeni kaynak karşılaştırması yapılacak. Sonraki aşamalarda Tema 2 ve Tema 4, önce PR #103'te kısmen elden geçirilmiş kayıtlar da dâhil karşılaştırılacak. **Bu belgenin kaydı, bütün soruların pedagojik doğruluk açısından tamamlandığı iddiası değildir.**
