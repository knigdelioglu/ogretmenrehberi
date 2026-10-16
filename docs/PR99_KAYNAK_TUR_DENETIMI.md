# PR #99 — Kaynak Bağlantısı ve Cevap Türü Denetimi

**Başlangıç:** 16 Ekim 2026 • **Yöntem:** PR #99 öncesi `6f029e0`, sonrası `ce8406d` ve güncel ders kitabı/sunum eşleştirmesi. Bu belge, tamamlanmış [39/39 cevap-metni pedagojik denetiminin](PR99_PEDAGOJIK_KALITE_DENETIMI.md) **devamıdır**, onu tekrar etmez.

## Alan düzeyinde ek envanter

PR #99'un değiştirdiği **27 parçalı cevap dosyasının** JSON kayıtları soru kimliği ve değişen alanlar bakımından karşılaştırıldı.

- **39 kayıt:** `answer` alanı değişmiş; pedagojik inceleme sekiz turda tamamlandı.
- **34 kayıt:** `answer` aynı kalmış, yalnız `source_locator` değişmiş. Bu kayıtlar metin kalitesi yerine **kaynağa izlenebilirlik** açısından değerlendirilecek.
- **1 kayıt — `T1-P64-Q01`:** `answer` aynı kalmış, `entry_type` (`question_answer` → `performance_support`) ve `source_locator` değişmiş. Hem pedagojik görev türü hem kaynak atfı kontrol edilmelidir.

Bu sınıflandırma, yanıt bankası kayıtlarının alan düzeyindeki PR farkları içindir; PR #99'daki diğer 18 dosyanın tüm teknik değişiklikleri veya yeni bir ses transkripsiyonu denetimi anlamına gelmez.

## Tur K1 — İlk beş kaydın bağımsız denetimi

| Kayıt | PR #99 farkı | Doğrudan kitap kanıtı | Karar |
| --- | --- | --- | --- |
| `T1-P30-Q04` | Soru s.30; kanıt metinleri s.22–23 olarak eklendi | Basılı s.30'un 4. sorusu açık/örtük iletileri soruyor; s.22'de Tiryaki–Karagöz yanlış anlamaları, s.23'te Çelebi ve oyun çatışmasının devamı var | **Uygun.** Kanıt sayfaları geçerli; cevap metnini değiştirmeye gerek yok |
| `T1-P32-Q03` | Yapı unsurları sorusuna s.20, 22, 23 metinleri bağlandı | Basılı s.32'de kişi, mekân, zaman, çatışma ve dramatik örgü tablosu var; s.20'de yazıcılık işinin kurulması, s.22'de müşteri ve çatışma, s.23'te çözülüş sahneleri yer alıyor | **Uygun.** Soruyla alıntı metni ayrı tutuluyor |
| `T1-P32-Q04` | Çatışma çözümlemesine s.20, 22, 23 kaynak sayfaları bağlandı | Basılı s.32'de çatışmanın kaynağı, tarafları ve yapı unsurları soruluyor; Karagöz'ün yazıcılık rolü ve sonraki müşteri çatışmaları bu metinlerde görülüyor | **Uygun.** Kaynak bağlantısı pedagojik gerekçeyi destekliyor |
| `T1-P32-Q05` | Dil özellikleri karşılaştırmasına s.18, 19, 21, 22, 23 sayfaları eklendi | s.18–19'da Hacivat–Karagöz söz oyunları; s.21'de II. Hanım ve Lâz; s.22–23'te Tiryaki ve Çelebi konuşmaları görülüyor. Basılı s.32'nin 5. sorusu kişilerin dil özelliklerinin oluşumunu soruyor | **Uygun.** Farklı konuşma biçimleri için metin kanıtı var |
| `T1-P64-Q01` | `question_answer` → `performance_support`; kaynak adresinden doğrulanmamış 'kullanıcı içerik dökümü' iddiası çıkarıldı | Basılı s.64'ün 1. yönergesi **dinleme/izleme amacı belirleme** performansı istiyor. Güncel cevap tek doğru amaç dayatmadan üç örnek amaç sunuyor | **Tür değişikliği doğru.** Metin kaybı yok; kaynağa video transkripti atfetmemek isabetli |

**Bu turdaki sonuç:** İncelenen beş kayıtta kaynak bağlantıları kitap sayfalarıyla tutarlı. Sorunu olmayan içerikler gereksiz biçimde yeniden yazılmadı. Bilgi/sunum testi için depoda mevcut otomatik kontroller çalıştırılmalıdır.

**Kalite kuralı:** Basılı metnin doğru sayfada bulunması, ona ait sesli video dökümünün de doğrulandığı anlamına gelmez. `source_locator` içinde gösterilen farklı kaynak türlerini (soru sayfası, alıntı sayfası, video notu ve ses deşifresi) karıştırma.

## Bekleyen kaynak-bağlantısı denetimi

| Tema | Kimlik | Kontrol odağı | Durum |
| --- | --- | --- | --- |
| Tema 1 | `T1-P35-Q01` | Metindeki repliklerin basılı sayfa karşılıkları | **Bekliyor** |
| Tema 1 | `T1-P43-Q01` | Mektup türünde ana metin/QR kaynak ayrımı | **Bekliyor** |
| Tema 1 | `T1-P56-Q03` | İletişim metni alıntı sayfaları | **Bekliyor** |
| Tema 2 | `T2-P88-Q06` | Soru kökündeki davranışlar | **Bekliyor** |
| Tema 2 | `T2-P100-Q01` | Alıntı metni sayfası | **Bekliyor** |
| Tema 2 | `T2-P100-Q02` | Alıntı metni sayfası | **Bekliyor** |
| Tema 2 | `T2-P100-Q07` | Alıntı metni sayfası | **Bekliyor** |
| Tema 2 | `T2-P112-Q05` | Alıntı metni sayfaları | **Bekliyor** |
| Tema 2 | `T2-P117-Q01` | Orhun metni sayfa bağı | **Bekliyor** |
| Tema 2 | `T2-P117-BILGE01` | Bilgi Köşesi/metin bağı | **Bekliyor** |
| Tema 2 | `T2-P128-Q01` | Orhun metni sayfa bağı | **Bekliyor** |
| Tema 3 | `T3-P175-Q02` | Metin içi alıntı sayfası | **Bekliyor** |
| Tema 3 | `T3-P176-Q03` | Soru ve Bilgi Köşesi/metin bağı | **Bekliyor** |
| Tema 3 | `T3-P176-Q05` | Alıntı sayfası | **Bekliyor** |
| Tema 3 | `T3-P176-Q13` | Alıntı sayfası | **Bekliyor** |
| Tema 3 | `T3-P178-PERF01` | Okuma çemberi/metin bağı | **Bekliyor** |
| Tema 3 | `T3-P193-PERF01` | Değerlendirme tablosu ve alıntılar | **Bekliyor** |
| Tema 3 | `T3-P193-PERF03` | Çıkış kartı ve alıntılar | **Bekliyor** |
| Tema 4 | `T4-P252-PERF02BC` | Oyun metni alıntı sayfaları | **Bekliyor** |
| Tema 4 | `T4-P259-Q01` | Oyun metni alıntı sayfası | **Bekliyor** |
| Tema 4 | `T4-P259-Q02` | Oyun metni alıntı sayfası | **Bekliyor** |
| Tema 4 | `T4-P260-Q04` | Oyun metni alıntı sayfası | **Bekliyor** |
| Tema 4 | `T4-P260-PERF01` | Tiyatro ve sosyal bilimler metni | **Bekliyor** |
| Tema 4 | `T4-P261-Q01` | Çatışma ve oyun metni | **Bekliyor** |
| Tema 4 | `T4-P262-PERF01` | Oyun ve değerlendirme bağı | **Bekliyor** |
| Tema 4 | `T4-P262-PERFQ01` | Oyun metni kanıt bağı | **Bekliyor** |
| Tema 4 | `T4-P272-PERF02` | Oyun karşılaştırma alıntıları | **Bekliyor** |
| Tema 4 | `T4-P277-PERF02` | Diğer oyun metni alıntıları | **Bekliyor** |
| Tema 4 | `T4-P279-PERF01` | Değerlendirme metni | **Bekliyor** |
| Tema 4 | `T4-P304-Q02` | Soru ve alıntı sayfası | **Bekliyor** |

**İlerleme:** Kaynak/tür değişen **5/35 kayıt incelendi; 30 kayıt bekliyor**. Ayrı olarak 39/39 cevap-metni pedagojik incelemesi kapanmıştır.

## Sonraki küçük tur

Önce `T1-P35-Q01`, `T1-P43-Q01`, `T1-P56-Q03`, `T2-P88-Q06` ve `T2-P100-Q01` kaynaklarını, basılı metin ve QR sınırlarıyla karşılaştır. Hatalı bir kaynak bulunursa yalnız ilgili bağlantıyı düzelt; doğrulanmamış konuşmayı cevap olarak üretme. Her turda en fazla beş kayıt denetle ve sonuçları buraya işle.
