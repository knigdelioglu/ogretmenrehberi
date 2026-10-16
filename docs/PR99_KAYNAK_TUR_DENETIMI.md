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

## Tur K3 — Oğulla Buluşma ve Kül Tigin Âbidesi (5 kayıt)

| Kayıt | PR #99 farkı / kanıt sınırı | Basılı sayfa ve sunum kanıtı | Karar |
| --- | --- | --- | --- |
| `T2-P100-Q02` | Aynı `answer` ve `entry_type=question_answer` korunarak `source_locator` alıntı sayfası s.91'i kapsayacak biçimde genişletilmiş | Basılı s.100 soru 2, Nazifkan'ın tepkisizliğini sorar. s.91'de caydırmanın yararsızlığı ve öz anne olmama çekincesi birlikte açıkça yer alır. Sunumun 0/1 kanıt indeksleri `caydirma` birimine; ikinci kanıt `Öz annesi olmaması` bölümüne geçerli bağlanır | **Uygun.** Soru ve iki alıntı doğru konumda; metin değişikliği yok |
| `T2-P100-Q07` | `source_locator` s.92'yi gösteriyordu; cevap alt bölümünde ek s.93–94 kanıtları da kullanılıyor | Basılı s.100 soru 7 pişmanlık yorumunu sorar. “Huyuma suyuma uymaz / Oğluma kötülük edemem!” doğrudan alıntısı s.92'de; Sultan'ın “Baba, beni bağışla gönüllü olarak gidiyorum...” sözü s.93'te; Çordon'un “mert bir erkek” öğüdü s.94'tedir. Sunumdaki tek `quote_links[0]`, mevcut `Metindeki açık gerekçe` bölümüne geçerli bağlanır | **Kaynak kapsamı düzeltildi.** Alıntı s.92 ve ek bölüm kanıtları s.93–94 ayrı açıklandı; cevap değişmedi |
| `T2-P112-Q05` | `source_locator` s.90, 94, 95 metinlerine genişletilmiş; cevap ve tür aynı | Basılı s.112 soru 5 kişisel beğeni ifadesi istiyor. “Kalbim böyle söylüyor...” s.90'da, “O, tam kendisiydi...” ve “Bir erkek, bir adam ol oğlum...” s.94'te; son iki ifadeye s.95'teki etkinlik alıntısı da destek veriyor. Sunumun 0/1/2 indeksleri mevcut üç `answer_sections` başlığına geçerli bağlanır | **Uygun.** Kitap alıntıları ve alternatifleri mevcut; cevap değişmedi |
| `T2-P117-Q01` | `source_locator` yalnız s.114 alıntılarını gösteriyordu; `Kül Tigin'i anma` cevap bölümünün bağlamı s.115'te devam ediyor | Basılı s.117 `Metni Anlayalım` soru 1, Bilge Kağan'ın amacını sorar. Sesleniş ve “ebedî taşa vurdum” sözleri s.114'te, Kül Tigin'in ölümü/yası s.115'tedir. Sunum 0/1 kanıtları `bilge-intents` birimine, indeks 1 `Sözü kalıcılaştırma` alt bölümüne geçerli bağlanıyor | **Kaynak kapsamı düzeltildi.** s.114 alıntısı ve s.115 anma kanıtı ayrıştırıldı; cevap değişmedi |
| `T2-P117-BILGE01` | `source_locator` yazıt için s.114'ü gösteriyor, `Fark Edelim` Kafesoğlu metnini ve s.115'teki yas anlatısını yeterince ayrıştırmıyordu | Basılı s.117'deki soru `Bilgi Köşesi`ne değil `Fark Edelim` altında verilen İbrahim Kafesoğlu metnine ve Kül Tigin yazıtına dayanır. Kafesoğlu parçasında kitabe/bark Bilge Kağan'ın himmetiyle ilişkilendirilir; yazıtta s.114'te millet için çalışma, s.115'te kardeş Kül Tigin'in ölümünün ardından yas yer alır. Sunumdaki indeks 0 ve `management-and-effort` / `kinship` / `monument` / `advice` bölüm bağları geçerli | **Kaynak kapsamı düzeltildi.** S.117 Kafesoğlu + s.114–115 yazıt ayrımı açıklaştırıldı; cevap değişmedi |

**Tur K3 sonuç ve kapsam:** Beş kaydın cevap türü `question_answer` kalmıştır. Karşılaştırma PR #99 öncesi `6f029e0` ve güncel `main` JSON kayıtlarıyla yapılmıştır; beşinin `answer` içeriği değişmemiştir. Basılı kitap soru ve alıntıları, sunumdaki `quote_links` sayısal indeksleri, hedef `answer_sections` ve tema-2 akışlarının `answer_id` eşlemeleri kontrol edildi. Orhun video/QR sesi incelenmedi ve tam transkript doğrulaması iddia edilmedi. Üç `source_locator` alanı kapsayıcı kaynak izlenebilirliği için düzeltildi; cevap, kanıt dizisi ve pedagojik yönlendirme değiştirilmedi.

## Tur K4 — Orhun ve Huzur kaynak izlenebilirliği (5 kayıt)

| Kayıt | PR #99 farkı | Basılı kanıt, tür ve sunum bağı | Karar |
| --- | --- | --- | --- |
| `T2-P128-Q01` | `answer` sabit, `source_locator` yalnız basılı s.114'e genişletilmiş | Basılı s.128 Süreci Değerlendirebilme soru 1 kişisel beğeniyi gerekçelendirmeyi istiyor. Doğrudan `evidence_quotes[0]` cümlesi “Türk milleti için gece uyumadım, gündüz oturmadım.” s.114'te; `Duygusal Anlatım` bölümünün kullandığı “Görür gözüm görmez gibi, bilir aklım bilmez gibi oldu.” s.115'te. Sunumda indeks 0 geçerli `rhetorical-features` birimine ve `Hitabet Gücü` kanıt bölümüne bağlanıyor. | **Kaynak kapsamı düzeltildi.** s.115 eklendi; cevap ve kanıt listesi değişmedi |
| `T3-P175-Q02` | `source_locator` alıntı sayfası s.169'u ekliyor; cevap değişmemiş | Basılı s.175 soru 2 konu, tema ve yazılış amacını ayırmayı istiyor. “İstanbul'u tanımadıkça kendimizi bulamayız” ve “Bir hüviyet lâzım” ifadeleri s.169'da. Sunumda indeksler 0→`tema`, 1→`yazilis_amaci`; her iki dayanak ve `konu` bölümü geçerli. Yazar niyeti metinden çıkarım olarak sunuluyor, kesin biyografik beyan sayılmıyor. | **Uygun.** Kaynak ve bölüm eşleşmesi yerinde |
| `T3-P176-Q03` | `source_locator` roman türlerinin anlatıldığı s.173–176 ile alıntı s.169'u kapsıyordu; modernist değerlendirme için kullanılan biyografi s.171 ayrıca belirtilmemişti | Soru basılı s.176'da; psikolojik/tahlil roman tanımı s.173, modernist roman tanımı s.174, Tanpınar'ın modernist yaklaşıma dair biyografik bilgisi s.171'de. İki doğrudan metin alıntısı (“Mümtaz da, kendisinde muzlim…” ve “İstanbul'u tanımadıkça…”) s.169'da. Sunumdaki indeksler 0→`Psikolojik yönün metin dayanağı`, 1→`Modernist yönün metin dayanağı` bölümlerine geçerli. | **Kaynak kapsamı düzeltildi.** Roman türü tablosu, yazar biyografisi ve metin kanıtı ayrıştırıldı |
| `T3-P176-Q05` | `source_locator` alıntı sayfası s.169'u ekliyor | Basılı s.176 soru 5 “Bizler, kökü mazide olan atiyiz” sözünü yorumlatıyor; “Bir hüviyet lâzım. Bu hüviyeti her millet mazisinden alıyor.” metin kanıtı s.169'da. Sunumdaki indeks 0 geçerli `metinle_bag` bölümüne bağlı. Geçmiş-gelecek yorumu bir çıkarım olarak korunuyor. | **Uygun.** Soru ile metin kanıtı ayrılmış |
| `T3-P176-Q13` | `source_locator` alıntı sayfası s.168'i ekliyor | Basılı s.176 soru 13 Nuran ve Mümtaz'ın mekânları müzikle adlandırmasından çıkarım istiyor. “İstanbul manzaralarıyla eski musıkîmiz birleşiyor...” cümlesi ve musiki/mekân birlikteliği s.168'de; indeks 0 `ortak_hatira` bölümüne geçerli bağlanıyor. | **Uygun.** Kaynak ve kanıt bağı doğru |

**Tur K4 kapsamı:** PR #99 öncesindeki `6f029e0` ile güncel cevap kayıtlarının `answer` ve `entry_type` alanları karşılaştırıldı; beş kayıtta ikisi de aynı. Basılı ders kitabının sayfa JSON kayıtları ve tema sunumlarının `quote_links`, `units`, `evidence_sections` ilişkileri incelendi. İki `source_locator` alanı düzeltildi. Cevap, cevap bölümleri, kanıt listesi, öğretmen yönlendirmesi ve sunum davranışı değiştirilmedi. Bu tur video sesini veya QR medyasını doğrulamamaktadır.

## Tur K5 — Okuma çemberi, Huzur değerlendirmesi ve Ben, Mimar Sinan (5 kayıt)

| Kayıt | PR #99 farkı ve görev türü | Basılı kitap ve sunum kanıtı | Karar |
| --- | --- | --- | --- |
| `T3-P178-PERF01` | `answer` ve `performance_support` korunmuş; `source_locator` s.169–170 alıntılarıyla genişletilmiş | s.178'de dört temel rol (**Bağ Kurucu, Ressam, Sorgulayıcı, Okuma Aydınlatıcısı**), s.179'da beş seçimlik rol bulunuyor. Öğrenciler dört kişilik gruplarda rol seçerek metne dayalı ürün oluşturur; sonraki toplantıda rol değiştirir. “İstanbul'u tanımadıkça…” ile “Bir hüviyet lâzım” s.169'da; “Bende İhsan'ın tesiri büyüktür” s.170'te. Üç `quote_links` indeksi ve dokuz rol birimi geçerli | **Uygun.** Kaynaklar ve görev türü tutarlı |
| `T3-P193-PERF01` | `answer` ve `performance_support` değişmemiş; kaynak s.169/s.182'ye genişletilmiş | s.193'te öğrencinin kendi ölçütlerini yazacağı tablo bulunuyor; yalnız `Tutarlılık` örnek ölçüt olarak verilmiş. Doğrudan alıntılar s.169 (“Bir hüviyet lâzım”, “İstanbul'u tanımadıkça…”) ve s.182 (“İhsan, onun hem babası, hem hocası idi”). Ancak `Duygu ve çağrışım (örnek)` bölümündeki vapur düdüğünün çocukluk hüznünü çağrıştırması **s.167**'ye dayanıyor. Sunumun üç alıntı indeksi/altı ölçüt birimi geçerli | **Kaynak kapsamı düzeltildi.** Doğrudan alıntılardan ayrı olarak s.167 açıklama kanıtı belirtildi |
| `T3-P193-PERF03` | `answer` ve `performance_support` sabit; kaynak s.167/s.169 eklenmiş | s.193 çıkış kartında **Üç Yaz (3), İki Sor (2), Bir Paylaş (1)** alanları bulunuyor. “hüznün şifasızlığı” s.167'de; “Bir hüviyet lâzım” ve “İstanbul'u tanımadıkça…” s.169'da. Sunumdaki beş kanıt bağlantısı üç alıntıyı birden fazla doğru etkinlik bölümünde yeniden kullanıyor; indeks ve birim denetimi olumlu | **Uygun.** Öğrencinin kişisel yorum seçimi korunmuş |
| `T4-P252-PERF02BC` | `answer` ve `performance_support` sabit; kaynak s.243, s.245, s.246'ya genişletilmiş | s.252'de 2/b öğrencinin etkileyici bulduğu özelliği, 2/c ise kendi tanınmak istediği yönü sorar. “bilgim, azmim…” s.243'te; “İnsan, yapabileceğini…” ve “Güzellik, büyüklükten…” s.245'te; “tek başıma yenmedim” s.246'da. Sunumda dört kanıt indeksi ile iki değerlendirme birimi geçerli | **Uygun.** Metin kanıtı ve öz değerlendirme birbirinden ayrılmış |
| `T4-P259-Q01` | `answer` ve `question_answer` sabit; kaynak s.246 doğrudan alıntılarına genişletilmiş | s.259 **Fark Edelim 1** Enver Töre'nin `Türk Tiyatrosunun Kaynakları` parçasından hareketle tarih/kültür bilinci aktarımını sorguluyor. İki `evidence_quotes` s.246'da; cevapta anılan **Bâkî, Fuzûlî, Matrakçı Nasuh ve Pîrî Reis** ise s.244'te. Sunumdaki 0/1 indeksleri `answer` birimine geçerli bağlanmış | **Kaynak kapsamı düzeltildi.** s.244 kültür çevresi kanıtı, s.246 doğrudan alıntı, s.259 soru ve yardımcı metin olarak ayrıştırıldı |

**Tur K5 kapsamı:** PR #99 öncesi `6f029e0` ile güncel yanıt bankası karşılaştırıldı; beş kaydın `answer`, `entry_type`, `evidence_quotes` ve `answer_sections` alanları aynı kaldı. Basılı kitap JSON sayfaları, s.252'nin `page_text` alanı, Tema 3/4 sunum akışları ile `web-presentation.json` içindeki alıntı indeksleri ve bölüm eşleşmeleri incelendi. Yalnız iki `source_locator` düzeltildi; cevap metinleri, cevap türleri, kanıt listeleri ve öğretmen yönlendirmeleri değiştirilmedi. Video ses dökümü veya QR medya eşleşmesi bu turda yeniden incelenmedi.

## Tur K6 — Ben, Mimar Sinan: tarih, değer, çatışma ve değerlendirme (5 kayıt)

| Kayıt | PR #99 farkı / görev türü | Doğrudan kaynak ve sunum bağı | Karar |
| --- | --- | --- | --- |
| `T4-P259-Q02` | `answer` ve `entry_type=question_answer` korunmuş; `source_locator` doğrudan alıntı için s.246'ya genişletilmiş | Basılı s.259 Fark Edelim 2, Enver Töre'nin `Türk Tiyatrosunun Kaynakları` parçasından hareketle Özakman'ın tarih ve millî kimlik yaklaşımını yorumlatır. Oyunda Sinan'ın eserleri ve sanat çevresi s.244; Aydınlı Artemios ve Muğlalı İsodoros'a hitabının başlangıcı s.245, `meslektaşım` ve `yurttaşımsınız` ifadesi ile “tek başıma yenmedim” s.246'dadır. Ayrıca Özakman biyografisi s.246'da yer alır. Sunumda kanıt indeksi 0 mevcut `answer` hedefini gösterir. | **Kaynak kapsamı düzeltildi.** Soru/yardımcı metin, kültürel çevre, iki sayfaya yayılan hitap ve yazar biyografisi ayrıştırıldı |
| `T4-P260-Q04` | `answer` ve `entry_type=question_answer` aynı; `source_locator` yalnız s.245 alıntısına genişletilmiş | Basılı s.260 Sıra Sizde soru 4, çalışkanlık/estetik/sorumluluk değerlerinin kişilik ve eserlerdeki karşılıklarını ister. İnceleme ve ilk mühendislik görevleri s.243, farklı eserler ve planlardan söz edilmesi s.244, daha büyük yerine daha güzel yapıyı seçmesi ve “Güzellik, büyüklükten daha güçlüdür.” s.245'tedir. Sunumdaki indeks 0 `answer` bölümüne geçerli bağlanır. | **Kaynak kapsamı düzeltildi.** Yanıtın metin içi diğer dayanakları s.243–244 ayrıca belirtildi |
| `T4-P260-PERF01` | `answer` ve `entry_type=performance_support` değişmemiş; `source_locator` alıntılar için s.243, 245, 246'ya genişletilmiş | Basılı s.260 Ders Dışı Etkinlik `Tiyatro ve Sosyal Bilimler`, bir haftalık çalışmada üç grubun sırasıyla **tarih, psikoloji ve sosyoloji** ilişkisini araştırmasını, farklı tiyatro metinlerinden yararlanmasını ve grup sözcüsüyle paylaşmasını ister. Dört alıntı `İnsan, yapabileceğini…` s.245, `bilgim, azmim…` s.243, `Güzellik, büyüklükten…` s.245, `tek başıma yenmedim` s.246'dadır. Sunumun dört `quote_links` indeksi ve dört birimi geçerli. | **Uygun.** Performans görevinde tarihî olgu ile kurgusal oyun sözü birbirine karıştırılmıyor |
| `T4-P261-Q01` | `answer` ve `entry_type=question_answer` korunmuş; `source_locator` yalnız s.243 alıntılarıyla genişletilmiş | Basılı s.261 Birlikte Çalışalım, çatışmaları ve bunların metne etkisini altı kişilik grup çalışmasıyla çözümletir. Ayasofya'nın üstünlüğü iddiası ve Sinan'ın tepkisi, Van Gölü görevi, azim/talih s.243'te; büyüklük yerine estetik hedefi, Selimiye'nin inşasındaki `kaygı ve sevinç`, ölümlülük/kalıcılık karşıtlığı ve Selimiye açılışındaki söz s.245'te; ortak miras anlatısı s.246'dadır. Sunumdaki iki kanıt indeksi `conflict-and-evidence` birimindeki mevcut iki alt bölüme bağlanır; `theme-and-effect` bölümleri de vardır. | **Kaynak kapsamı düzeltildi.** s.245–246 yanıtın analiz kapsamına eklendi, çatışma/tematik karşıtlık ayrımı korundu |
| `T4-P262-PERF01` | `answer` ve `entry_type=performance_support` korunmuş; `source_locator` s.243 ve s.245 alıntılarını eklemiş | Basılı s.262 Süreci Değerlendirebilme, gündelik insan ilişkilerine ilişkin **beyin fırtınası** ve öğrencinin **kendi beğeni ölçütüyle** tablo doldurmasını gerektirir. Oyundan dört `evidence_quotes`: Lütfü Paşa'nın önerisi ve mimarlara saygı s.243'te; `Sana güveniyorum Koca Sinan!` ile `Benim adıma öyle bir bina…` s.245'tedir. `criteria-and-choice` birimi, dört indeks ve mevcut ölçüt/gerekçe bölümleri geçerlidir. | **Uygun.** Öğrenci tercihine açık öz değerlendirme korunuyor |

**Tur K6 yöntem ve sınır:** PR #99 öncesindeki `6f029e0` ile denetim başlangıcındaki güncel `main` karşılaştırıldığında beş kayıtta yalnız `source_locator` değişmişti; `answer`, `entry_type`, alıntı dizileri, cevap bölümleri ve öğretmen yönlendirmeleri korunmuştur. Ders kitabının s.243–246 ve 259–262 sayfalarıyla tema 4 sunum akışları ve `web-presentation.json` içindeki indeks/bölüm bağlantıları denetlendi. Bu turda sadece üç `source_locator` kaydı düzeltildi; video ses/döküm doğrulaması yapılmadı, tüm uygulama testlerinin başarılı olduğu varsayılmadı.

## Bekleyen kaynak-bağlantısı denetimi

| Tema | Kimlik | Kontrol odağı | Durum |
| --- | --- | --- | --- |
| Tema 1 | `T1-P35-Q01` | Metindeki repliklerin basılı sayfa karşılıkları | **Uygun** |
| Tema 1 | `T1-P43-Q01` | Mektup türünde ana metin/QR kaynak ayrımı | **Uygun** |
| Tema 1 | `T1-P56-Q03` | İletişim metni alıntı sayfaları | **Uygun** |
| Tema 2 | `T2-P88-Q06` | Soru kökündeki davranışlar | **Koşullu uygun** |
| Tema 2 | `T2-P100-Q01` | Alıntı metni sayfası | **Uygun** |
| Tema 2 | `T2-P100-Q02` | Alıntı metni sayfası | **Uygun** |
| Tema 2 | `T2-P100-Q07` | Alıntı metni sayfası | **Kaynak kapsamı düzeltildi** |
| Tema 2 | `T2-P112-Q05` | Alıntı metni sayfaları | **Uygun** |
| Tema 2 | `T2-P117-Q01` | Orhun metni sayfa bağı | **Kaynak kapsamı düzeltildi** |
| Tema 2 | `T2-P117-BILGE01` | Fark Edelim (Kafesoğlu) / yazıt bağı | **Kaynak kapsamı düzeltildi** |
| Tema 2 | `T2-P128-Q01` | Orhun metni sayfa bağı | **Kaynak kapsamı düzeltildi** |
| Tema 3 | `T3-P175-Q02` | Metin içi alıntı sayfası | **Uygun** |
| Tema 3 | `T3-P176-Q03` | Soru ve Bilgi Köşesi/metin bağı | **Kaynak kapsamı düzeltildi** |
| Tema 3 | `T3-P176-Q05` | Alıntı sayfası | **Uygun** |
| Tema 3 | `T3-P176-Q13` | Alıntı sayfası | **Uygun** |
| Tema 3 | `T3-P178-PERF01` | Okuma çemberi/metin bağı | **Uygun** |
| Tema 3 | `T3-P193-PERF01` | Değerlendirme tablosu ve alıntılar | **Kaynak kapsamı düzeltildi** |
| Tema 3 | `T3-P193-PERF03` | Çıkış kartı ve alıntılar | **Uygun** |
| Tema 4 | `T4-P252-PERF02BC` | Oyun metni alıntı sayfaları | **Uygun** |
| Tema 4 | `T4-P259-Q01` | Oyun metni alıntı sayfası | **Kaynak kapsamı düzeltildi** |
| Tema 4 | `T4-P259-Q02` | Oyun metni alıntı sayfası | **Kaynak kapsamı düzeltildi** |
| Tema 4 | `T4-P260-Q04` | Oyun metni alıntı sayfası | **Kaynak kapsamı düzeltildi** |
| Tema 4 | `T4-P260-PERF01` | Tiyatro ve sosyal bilimler metni | **Uygun** |
| Tema 4 | `T4-P261-Q01` | Çatışma ve oyun metni | **Kaynak kapsamı düzeltildi** |
| Tema 4 | `T4-P262-PERF01` | Oyun ve değerlendirme bağı | **Uygun** |
| Tema 4 | `T4-P262-PERFQ01` | Oyun metni kanıt bağı | **Bekliyor** |
| Tema 4 | `T4-P272-PERF02` | Oyun karşılaştırma alıntıları | **Bekliyor** |
| Tema 4 | `T4-P277-PERF02` | Diğer oyun metni alıntıları | **Bekliyor** |
| Tema 4 | `T4-P279-PERF01` | Değerlendirme metni | **Bekliyor** |
| Tema 4 | `T4-P304-Q02` | Soru ve alıntı sayfası | **Bekliyor** |

**İlerleme:** Kaynak/tür değişen **30/35 kayıt incelendi; 5 kayıt bekliyor**. Ayrı olarak 39/39 cevap-metni pedagojik incelemesi kapanmıştır.

## Sonraki küçük tur

Önce `T4-P262-PERFQ01`, `T4-P272-PERF02`, `T4-P277-PERF02`, `T4-P279-PERF01` ve `T4-P304-Q02` kaynaklarını, basılı metin ve QR sınırlarıyla karşılaştır. Hatalı bir kaynak bulunursa yalnız ilgili bağlantıyı düzelt; doğrulanmamış konuşmayı cevap olarak üretme. Her turda en fazla beş kayıt denetle ve sonuçları buraya işle.
