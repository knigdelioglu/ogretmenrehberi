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

## Tur K2 — Sıradaki beş kaydın basılı kaynak, tür ve sunum kanıtı denetimi

| Kayıt | PR #99'daki alan değişimi | Birincil kanıt / sunum bağı | Karar |
| --- | --- | --- | --- |
| `T1-P35-Q01` | `source_locator` alanına basılı s.19, 21–24 eklendi | Soru basılı s.35'te üç alt başlıkla dil ve üslubun güldürüye, çatışmaya, toplumsal-kültürel bağlama etkisini sorar. “hutûr/tesmiye” s.19'da, II. Hanım'ın yanlış anlamaları s.21'de, Tiryaki ve Çelebi diyalogları s.22–23'te; oyunun bitişi s.24'tedir. Sunumdaki 17 alıntı indeksi 17 gerçek kanıt ögesine ve var olan üç cevap bölümüne bağlanıyor. | **Uygun.** Alıntı dizisi ile sunum indeksleri tutarlı; s.24 bütünüyle oyun metninin bağlamı olarak kullanılabilir |
| `T1-P43-Q01` | `source_locator` alanından QR video dosyası ve doğrulanmamış ses/ekran dökümü iddiası çıkarıldı | Soru s.43'te; mektup türlerinin ölçütleri s.42–43'te; Mehmet Kaplan'ın mektubu ve dört kanıt cümlesi s.37–38'de. Ayrı QR “Mektup Türünün Serüveni” videosudur; `QR-EBA-E43890DFD82A.md` kimlik/SHA düzeyi eşleşme bildirir, ancak tam ses dökümü yoktur. Video Kaplan mektubunun doğrudan tür kanıtı değildir. Sunumun dört `quote_links` indeksi `answer` birimine geçerli biçimde bağlanıyor. | **Uygun.** Basılı tür kanıtı ile yardımcı video birbirinden doğru ayrılmış |
| `T1-P56-Q03` | `source_locator` alanına alıntı sayfaları s.53–54 eklendi | Basılı s.56 soru 3, öğrencinin kendi canlandırmasında belirlediği hataların olası etkilerini sorar. Doğan Cüceloğlu'nun iletişim kopukluklarına ilişkin metninin girişi s.53, komşu örneği ve ikinci alıntı s.54'tedir. Sunumdaki indeks 0 `Temel_Etkiler`, indeks 1 `İletişim_Kazasının_Ortaya_Çıkabileceği_Örnek_Durumlar` bölümüne geçerli bağlanıyor. | **Uygun.** s.53–54 kuramsal/örnek destek; öğrencinin canlandırması sorunun esas bağlamı olmaya devam etmeli |
| `T2-P88-Q06` | Doğrulanmamış `19XU49LO.mp4` atfı kaldırıldı; `source_locator` basılı soru köküne sınırlandı | Basılı s.88 soru 6, besmeleyle tohum saçılması ve kuşların gözetilmesini açıkça içerir. Bu nedenle cevaptaki yorum **soru köküyle** destekleniyor. QR hedefi doğrulanmış olsa da `UNVERIFIED-19XU49LO.md` video dosyasının EBA kimliğiyle doğrudan SHA/binary eşleşmesini ve tam konuşma dökümünü doğrulamıyor. Sunum akışındaki “ekim sahnesindeki” ifadesi doğrulanmış video sahnesi izlenimi verebildiği için soru köküne dayalı ifadeyle düzeltildi. | **Koşullu uygun.** Basılı soru köküne dayanan yorum geçerli; video içeriği doğrulanmış sayılmamalı |
| `T2-P100-Q01` | `source_locator` alanına basılı s.90 alıntı sayfası eklendi | Soru basılı s.100'de Çordon'un kararını sorar. “Onun hayatta olduğuna...” ve “Henüz gözlerim kapanmadan...” cümleleri basılı s.90'dadır. İki `quote_links` indeksi `decision` birimine, `contains_quote_indexes: [0,1]` kanıt bölümü `Gerekçeler` alanına işaret ediyor. | **Uygun.** Alıntı sayfası ve sunum bağları tutarlı |

**Tur K2 kapsam sınırı:** Yukarıdaki doğrulama, depodaki basılı kitap JSON sayfalarının metin katmanı ve yapılandırılmış soru bloklarıyla yapıldı; video sesinin yeniden dinlenmesi veya yeni bir transkript üretimi değildir. Bu turda cevap metinleri ve cevap türleri değiştirilmedi. Yalnız `T2-P88-Q06` akışındaki bir öğretmen yönlendirmesi kaynak belirsizliğine uygun hâle getirildi. Sunumun `quote_links` indeksleri ile hedef cevap bölümlerinin varlığı kayıt bazında kontrol edildi; otomatik test sonucu yerine geçirilmemelidir.

## Bekleyen kaynak-bağlantısı denetimi

| Tema | Kimlik | Kontrol odağı | Durum |
| --- | --- | --- | --- |
| Tema 1 | `T1-P35-Q01` | Metindeki repliklerin basılı sayfa karşılıkları | **Uygun** |
| Tema 1 | `T1-P43-Q01` | Mektup türünde ana metin/QR kaynak ayrımı | **Uygun** |
| Tema 1 | `T1-P56-Q03` | İletişim metni alıntı sayfaları | **Uygun** |
| Tema 2 | `T2-P88-Q06` | Soru kökündeki davranışlar | **Koşullu uygun** |
| Tema 2 | `T2-P100-Q01` | Alıntı metni sayfası | **Uygun** |
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

**İlerleme:** Kaynak/tür değişen **10/35 kayıt incelendi; 25 kayıt bekliyor**. Ayrı olarak 39/39 cevap-metni pedagojik incelemesi kapanmıştır.

## Sonraki küçük tur

Önce `T2-P100-Q02`, `T2-P100-Q07`, `T2-P112-Q05`, `T2-P117-Q01` ve `T2-P117-BILGE01` kaynaklarını, basılı metin ve QR sınırlarıyla karşılaştır. Hatalı bir kaynak bulunursa yalnız ilgili bağlantıyı düzelt; doğrulanmamış konuşmayı cevap olarak üretme. Her turda en fazla beş kayıt denetle ve sonuçları buraya işle.
