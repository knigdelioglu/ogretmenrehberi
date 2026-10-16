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

## Tur 3 — beş sorunun kaynak ve pedagojik doğruluk incelemesi

| Soru | PR #99 öncesinde yararlı olan | Önceki sürümdeki risk / kalite kaybı | Kanıta dayalı nihai düzenleme |
| --- | --- | --- | --- |
| `T1-P72-Q01` | Nezaket–saygı–güven–yapıcılık sınıflaması | Eski cevap yanlışlıkla Osman Bey/Edebali'nin sözlerini **Aklıselim söyleşisinin örnekleri** olarak vermişti; PR #99 yalnız genel doldurma yönergelerine döndü | Kitabın s.72'de doğrudan verdiği 'Aklıselim programına hoş geldiniz.' nezaket kanıtı korundu; diğer nitelikler için **örnek değerlendirme ölçütleri** ve aralarındaki ilişki sunuldu; doğrulanmayan sözler yazılmadı |
| `T1-P73-Q01` | Dil özelliklerini beğeniyle gerekçelendirme | PR #99'da mecaz örneği korunmuş ama yorum ve metne katkı açıklaması kısalmış | Ekran notlarının 02:05 ve 03:08 ifadeleri kullanılarak sevgi–kanat ve yakınlık–mesafe çağrışımları gerekçelendirildi; **ekran yazısı ≠ sesli konuşmacı sözü** ayrımı korundu |
| `T1-P73-Q02` | Olumsuz eleştiri ile düzenleme önerisini birlikte sunma | Eski 00:41–02:01 uzun/tekrarlı cümle iddiaları arşivlenmiş ses dökümünde yok; PR #99 soru için tamamlanmış örnek sağlamıyordu | Ekranda görülen tarih iddiası için kaynak gösterimi ve mecaz için açıklayıcı örnek öneren **eleştiri–çözüm çiftleri** verildi; tüm programda kaynak eksikliği bulunduğu iddia edilmedi |
| `T1-P83-Q13` | Şiirdeki duyguya somut unsur seçme | Güncel cevap s.83'te bulunmayan şiir dizelerini **basılı şiir metni** sayıyor; alt bölüm ise sesin kesinlikle şaire ait olduğunu ileri sürüyordu | Kare notlarında görülen siyah-beyaz yazma, kitap, deniz ufku, gün batımı ve kuş gibi **doğrulanmış görsellerden gerekçeli yorum** kuruldu; seslendiren kişi ve vurgu ayrı kanıt gerektiriyor |
| `T2-P88-Q01` | Toyun toplantı, paylaşma ve eğlenceyle birliğe katkısını göstermek | PR #99 kapsamı genel uyarıya indirmiş, PR #103 öğretim değerini kısmen geri getirmişti | Kitabın toy tanımından başlayan **toplantı → hazırlık → paylaşım → aidiyet** ilişkisi ve varsayımsal hasat şenliği örneği geliştirildi; destan alıntısı veya MP4-EBA eşleşmesi uydurulmadı |

**Kaynak kontrolü:** `data/book/grade-11/themes/theme-1/pages/p072.json`, `p073.json`, `p083.json` ve `data/book/grade-11/themes/theme-2/pages/p088.json`; `data/grade-11/source/qr-review-notes/QR-EBA-29BF4F293D53.md`, `QR-EBA-2952F505E3A7.md`, `UNVERIFIED-19XU49LO.md`. Eski/PR #99/güncel cevaplar üçlü karşılaştırıldı.

**Önemli kaynak kusuru:** Basılı s.83, `Olvido` şiirinin dizelerini içermiyor; videoya yönlendirme ve soru metni içeriyor. Eski cevapta kullanılan şiir dizelerinin kaynak atfı bu nedenle geri getirilmedi. `QR-EBA-2952F505E3A7` notu görsel karelerden ibarettir, sesli okunuş veya ses kimliği doğrulaması değildir.

**Son durum:** Beş kaydın `source_limited` statüsü değiştirilmedi. İçerik sahibi inceleme beyanı ayrıdır; kelimesi kelimesine arşivlenmiş transkript veya aday MP4'ün EBA dosya kimliği yerine kullanılmadı. Yeni başka cevap üretilmeden bu turda duruldu.

## Tur 4 — Tema 2: ortak kültür, dil ve Orhun Vadisi

| Soru | PR #99 öncesi öğretim katkısı | PR #99 / güncel sürümün durumu | Bu turda yapılan düzeltme |
| --- | --- | --- | --- |
| `T2-P88-Q02` | Hasat, Nevruz ve farklı kutlamaların ortak kültüre etkisini örnekliyordu; ancak ülke/tören ayrıntılarını doğrulanmamış video sözü gibi veriyordu | PR #103 genel işlevleri geri getirmiş, somut karşılaştırma sınırlı kalmıştı | Hasat–Nevruz için ortak işlev, ayırıcı özellik ve kuşaklararası aktarım örneği bağımsız bölümlerde düzenlendi; eski tören listesi transkript gibi aktarılmadı |
| `T2-P88-Q03` | Coğrafya adları ve kültürel bağ açıklaması vardı; video dış sesine kesin atıflar kanıtsızdı | PR #103 birkaç coğrafya örneğini korudu fakat her birinin gerekçesi azdı | Orta Asya, Azerbaycan, Kırım ve Balkanlar için kültürel bağ ve yorum sınırı belirtildi; siyasi sınır ve video sözü iddialarından ayrıldı |
| `T2-P88-Q04` | Kitapta verilen yaş–yaşıl/yeşil öncülünü mevsim, canlılık ve tabiat yorumu ile birleştiriyordu | PR #99 ve #103 kaynağı sorgulamaya ağırlık verip **kitabın açık yorumlama sorusuna** somut cevap vermeyi zayıflattı | Kitabın verdiği kökteşlik öncülü, hayat–tabiat–yenilenme çağrışımları ve bahar örneğiyle yorumlandı; bağımsız etimolojik araştırma ihtiyacı ayrı tutuldu |
| `T2-P88-Q05` | Birlikte çalışma ile saya gezme paylaşımını örnekliyor, fakat paylaşımı imeceyle karıştırmaya açıktı | PR #103 imecenin tanımını ve genel yararını geri kazandırmıştı | Sulama kanalını birlikte temizleme **açıklayıcı örneği**, kolektif emek–güven–ortak yarar zinciri ve şenlik/imece farkı işlendi |
| `T2-P113-Q01` | Orhun Vadisi, yazıtlar, Kül Tigin ve Bilge Kağan hakkında somut ön bilgi vardı; bazı ayrıntılar kanıtsız sözlü videoya atfediliyordu | PR #99 ön bilgiyi genel bir boş şablona indirgemiş, çoğunlukla görsel nesneleri sıralamıştı | Öğrenciye kullanılabilir bölge, Kök Türk yazıtları ve tarihî yazılı miras örnek yanıtı verildi; videodaki **“KÜL TİGİN ABİDESİ”** görseli ve bilgi–gözlem ilişkisi ayrı işlendi |

**Denetlenen kaynaklar:** ders kitabının `data/book/grade-11/themes/theme-2/pages/p088.json` ve `p113.json` soruları; `data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49LO.md`, `UNVERIFIED-19XU49LT.md` görsel notları; PR #99 öncesi `6f029e0`, PR #99 sonrası `ce8406d`, çalışmaya başlanılan `main` cevapları. PR #103'ün mevcut iyileştirmeleri korunarak ilerletildi.

**Kanıt kararı:** Beş sorunun mevcut `source_limited` statüsü korundu. Kullanıcının ses/görüntü incelemesini doğruladığı beyanı ayrıca envanterde duruyor; fakat eldeki MP4'lerin EBA indirme baytlarıyla eşleşmesi ve depolanmış kelimesi kelimesine ses çözümü hâlâ ayrı kanıt aşamaları. Model olarak verilen hasat ve sulama örnekleri **kaydedilmiş video sahnesi veya doğrudan alıntı değil**.

**Kalite duraklaması:** Bu beş soru düzenlendikten sonra başka soru değiştirilmedi. CI kontrolleri ve kod–sunum sözleşmeleri son aşama olarak ayrı doğrulanacak.

## Tur 5 — Tema 2 s.129, 140 ve 141: tarih, söz varlığı ve âşıklık mirası

| Soru | Önceki sürümün öğretim değeri ve problemi | PR #99 ile kayıp / güncel durum | Tur 5 kararı |
| --- | --- | --- | --- |
| `T2-P129-Q01` | Hun–Göktürk–Uygur–Selçuklu–Osmanlı devletleri ve kültür etkinliği, videodaki **doğrulanmamış sunucu sözleri** olarak aktarılmıştı | PR #99 yalnız görsel gözlem/araştırma sorusuna indirdi; gerçek medeniyet katkısı örneği kalmadı | Kitabın diğer öğrenmeleri ve genel tarih bilgisiyle **Orhun Yazıtları, Dîvânu Lugâti't-Türk ve Selçuklu kervansarayları** alan–örnek–etki ilişkisi içinde açıklandı; bu örnekler videoda kesin söylendi sayılmadı |
| `T2-P129-Q02` | '7 bağımsız/20'ye yakın özerk' ve nüfus sayıları video konuşmacısına güncel kesin veri olarak atfedildi | Sayıların kanıt sınırı korundu fakat **siyasi statü, uluslararası ilişki ve kültür bağı** yorumu zayıfladı | Soru kökünün alıntısı tarihli kaynak söylemi olarak yorumlandı; bağımsız devlet/özerk yönetim farkı ve kültürel işbirliği örneği ayrıldı; **bugünkü sayı/tanınma iddiası yok** |
| `T2-P129-Q03` | Devlet kurma, göç, kültür, yazılı miras ve karşılıklı etkileşim örnekleri vardı | PR #99 genel kanıt uyarısı koyarken ana cevapta somut örnekleri sildi; alt bölümlerde bazıları duruyordu | Orhun Yazıtları ile Dîvânu Lugâti't-Türk ana cevapla ilişkilendirildi; göç ve kültür etkileşimi **tek yönlü zafer anlatısına** indirgenmedi |
| `T2-P140-VOC01` | Çağ, canan, sine, kahır, saban için dizeli karşılaştırma öneriliyordu; ses dökümündeki dizeler bağımsız doğrulanmamıştı | PR #99 dize iddiasını çıkardı; PR #103 sözlük anlamı ve koşullu önerileri geri getirdi | Beş sözcüğün temel anlamları ve **çağ/devir, canan/sevgili, kahır/üzüntü, saban/pulluk** ikamelerinin ses/hece/çağrışım farkları somutlaştırıldı; gerçek atışma mısrası uydurulmadı |
| `T2-P141-Q01` | Basılı Erman Artun metnindeki koruma, aktarım, eğitim ve çağdaş yorum ilkeleri somuttu; videoya ait usta–çırak/sazlı icra sözleri kanıtsız aktarılmıştı | PR #99 ve #103 basılı önerileri korudu; uygulanabilirlik ve Türk dünyası örnekleri zayıf kaldı | Kaynak ve izin bilgileriyle **yerel icra arşivi**, okul dinletisi ve kitabın **ozan/akın/aytışçı/bahsi** adlandırmalarını karşılaştırma önerisi eklendi; 2 basılı alıntı korundu |

**Birincil kaynaklar:** `data/book/grade-11/themes/theme-2/pages/p129.json`, `p140.json`, `p141.json`; `data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49LP.md`, `UNVERIFIED-19XU49JV.md`, `UNVERIFIED-19XU49MG.md`. Karşılaştırma: PR #99 öncesi `6f029e0`, PR #99 sonrası `ce8406d`, tur başı güncel `main`.

**Kanıt kararı:** Sözlü medya tam deşifre edilmedi; EBA indirmesi–yerel MP4 bayt kimliği bağı eksik. Beş soruda `source_limited` korundu. Kitabın kendi soru alıntıları ve s.141 basılı metin alıntıları, sesli videoya değil **basılı kaynağa** aittir. Sesli performansa ilişkin gerçek mısra uydurulmadı. Türk tarihi eserleri, video montajında göründüğü kanıtlanan nesneler değil **ön öğrenmelerden kültürel-tarihî örneklerdir**.

**Kalite durağı:** Yalnız beş kayıt düzenlendi; sonraki soru grubu bu turda açılmadı.

## Tur 6 — Tema 2 s.141–143: kültürel miras, benzetme ve şiir dili

| Soru | PR #99 öncesi öğretim katkısı ve risk | PR #99 / güncel durum | Bu turdaki çözüm |
| --- | --- | --- | --- |
| `T2-P141-Q02` | Erman Artun'un aktarım, birlik ve kültür mirası vurgusunu anlattı; Tengri Dağları/Buhara/Tebriz/Kerkük/konuşmacı sözleri doğrulanmış video alıntısı gibi kullanıldı | Video kaynaklı iddialar isabetle çıkarılmış, PR #103 basılı metin temelli genel cevap eklemişti | **Kitabın gerçek s.141'inde bulunan** ozan/akın/aytışçı/bahsi adlandırmalarıyla kültürel süreklilik–yerel farklılık örneklendi; üç basılı alıntı ve sunum bağlantıları korundu |
| `T2-P142-Q02` | Dizeden benzetme unsurları ve mizah katkısı veriyordu, ancak mısraların ses doğrulaması yoktu | PR #103 benzetmenin işlevini açıklamış fakat çözülmüş gerçek sınıf modeli bulunmuyordu | **Video alıntısı OLMAYAN** 'sözün ırmak gibi akması' örneğiyle benzeyen, benzetilen, yön ve edat analiz edildi; olası atışma işlevi ile gözlenen karşılıklı sazlı icra ayrı belirtildi |
| `T2-P143-Q02` | Günlük dil ile atışmanın şiir dilini T diyagramında somut sözlerle karşılaştırıyordu; 'altı dörtlük', '-ebilirsen eğer' ses iddiaları bağımsız kanıtsızdı | PR #103 genel karşılaştırmayı geri getirdi, alt bölümler özgün T diyagramına özel değildi | **Benzerlikler / farklılıklar** listeleri, görsel performans ve gerçek dize gerektiren tür özelliklerini ayrıştırarak yeniden yazıldı; Sunum Web bölüm planı eşleştirildi |
| `T2-P143-Q03` | İcra, söz oyunları, mizah ve canlı karşılık üzerinden dil kullanımı çıkarımı sunuyordu; dize düzeltme repliği kanıtsızdı | Genelleştirilmiş yöntem ve içeriği tekrar eden üç bölüm bulunuyordu | 'Doğrudan gözlem → dilsel olasılık → etki çıkarımı → gerekçe' yapısıyla özgün performans analizi kuruldu; doğrulanmamış diyaloglar geri eklenmedi |
| `T2-P143-Q04` | Münacaat dizeleriyle atışmayı karşılaştırıyordu; video dizeleri kanıtlanmamıştı | PR #99 sonrasında **basılı Münacaat dizelerinin** edebî çözümlemesi bile kaybolmuştu; PR #103 genel 'soyut/somut' karşılaştırmasıyla sınırlıydı | Kitabın s.143'ünden iki gerçek kısa dize üzerinden alışılmadık bağdaştırma, ocak imgesi, bireysel sorgulama işlendi; atışmanın doğrulanmış sazlı ve karşılıklı performansıyla karşılaştırıldı; iki tür arasında üstünlük yargısı kurulmadı |

**Denetlenen birincil kaynaklar:** `data/book/grade-11/themes/theme-2/pages/p141.json`, `p142.json`, `p143.json`; `data/grade-11/source/qr-review-notes/UNVERIFIED-19XU49MG.md`, `UNVERIFIED-19XU49JV.md`. Üç sürüm karşılaştırıldı: PR #99 öncesi `6f029e0`, PR #99 sonrası `ce8406d` ve tur başı `main`.

**Kaynak disiplini:** `T2-P141-Q02` için üç alıntı kitabın s.141'inden, `T2-P143-Q04` için iki kısa şiir dizesi kitabın s.143'ünden doğrulandı. 19XU49JV/19XU49MG için tam kelimesi kelimesine ses çözümü depoda bulunmuyor; aday MP4'ün EBA kaynağıyla birebir kimliği ayrıca doğrulanmadı. Beş cevapta `source_limited` korundu. Model benzetmesi video repliği değildir.

**Sunum uyumluluğu:** `data/grade-11/presentation/theme-2/web-presentation.json` içindeki `T2-P143-Q02` ve `T2-P143-Q04` bölüm referansları yeni, özgün pedagojik bölümlere eşitlendi. Bu, sunumda yapılandırılmış yanıtların düşmemesi için zorunludur.

**Kalite durağı:** Bu turda beş kayıt kontrol edildi; sıradaki grup testler tamamlanmadan açılmadı.

## Tur 7 — Tema 2 s.144–159 ve Tema 4 s.286: performans, kültürel köprü, ileti

| Soru | PR #99 öncesi öğretim katkısı ve kanıt sorunu | Güncel sürümün pedagojik açığı | Tur 7 onarımı |
| --- | --- | --- | --- |
| `T2-P144-MAP01` | Mekân/beden dili/söyleyiş/estetik haritasını çeşitli sahne ve söz örnekleriyle dolduruyordu; klavye markası, tam sahne yazısı, sanatçının dizeyi düzeltmesi ve altı dörtlük gibi ayrıntılar arşivli görsel notta yoktu | PR #99 doğru ihtiyatla görsel örnekleri korudu fakat dört alanı çok kısa ve öğretimde yetersiz bıraktı | Dört harita alanı için **gözlenen sahne unsuru + yorumu + sınırı** ayrı oluşturuldu. Sazlı nöbetleşe söyleyiş ve alkış kaydedildi; dize sayısı/replik/dekor iddiası eklenmedi |
| `T2-P145-PERF01` | Altı şapkayı sahne/dize örnekleriyle dolduruyordu; düzeltme repliği, uyak ve belirli olumsuz iletiler bağımsız doğrulanmamıştı | 'Siyah şapka = ses kanıtı yok' açıklaması **kitaptaki olumsuz iletileri sorgulama görevi**ni karşılamıyordu | Basılı s.145'in **altı özgün sorusunun her birine** ayrı örnek yanıt verildi. Siyah şapkada sadece duyulan sözle olumsuz ileti belirleme, aksi durumda 'tespit etmedim' seçeneği; yeşilde özgün dörtlük tasarlama sağlandı |
| `T2-P147-Q01` | Söz sanatları ve söyleyicinin katkısı iki alanda somuttu; doğrulanmamış bağ/çağ/dağ ve tekrar/şahıs sahne iddiaları vardı | Cevap geliştirildi ancak iki sütun için sınıfça doldurulabilir **somut örnek ve öznel gerekçe** azdı | **Âşık atışmasına değer katan unsurlar / Söyleyicinin metne katkısı** iki ayrı bölüm ve gözlem–kişisel yorum örnekleriyle işlendi; Sunum Web `comparison` bölümleri buna eşleştirildi |
| `T2-P159-Q08` | Dîvânu Lugâti't-Türk, Kutadgu Bilig ve Dede Korkut örnekleri vardı; konuşmacı kişi, tarih ve eserleri kesin video anlatısı gibi aktarmak doğru değildi | Eser adları korunsa da Orhun Yazıtlarıyla **iki kaynak arasında model karşılaştırma** sınırlıydı | Kutadgu Bilig için yönetim/adalet düşüncesi, Dîvânu Lugâti't-Türk için Türkçe/yazılı bellek üzerinden ayrı somut kültürel köprü örnekleri; Dede Korkut alternatif olarak verildi |
| `T4-P286-Q03` | Fedakârlık, kaplumbağa kurtarma ve fidan dikme olaylarıyla somutlanmıştı; önceki cevap bu olayları kesin ses/görüntü kanıtı gibi sunuyordu | PR #99 yalnız kaynak uyarısına indirgedi; depodaki `UNVERIFIED-19XU49LQ.md` notunda kullanıcı tarafından iletilen anlatımın özeti bulunduğu dikkate alınmadı | Doğrudan **demiryolu/doğa görüntüsü**, **kullanıcının sağladığı anlatım özetindeki kaplumbağa/fidan örnekleri** ve bunlardan çıkan **merhamet/fedakârlık/doğa sorumluluğu yorumu** üç ayrı kanıt düzeyinde işlendi |

**Basılı kaynaklar:** `data/book/grade-11/themes/theme-2/pages/p144.json`, `p145.json`, `p147.json`, `p159.json`; `data/book/grade-11/themes/theme-4/pages/p285.json`, `p286.json`. **Arşiv notları:** `UNVERIFIED-19XU49JV.md`, `UNVERIFIED-19XU49MB.md`, `UNVERIFIED-19XU49LQ.md`. Cevaplar PR #99 öncesi `6f029e0`, sonrası `ce8406d` ve tur başlangıcı `main` üzerinden ayrı karşılaştırıldı.

**Kaynak durumu:** s.144/s.145 kayıtları `performance_support`, s.147/s.159/s.286 kayıtları `source_limited` olarak bırakıldı. EBA MP4 bayt kimliği ve bağımsız tam ses transkripti hâlâ doğrulanmış değildir. s.286 video notunda **kullanıcı tarafından sağlanan anlatımın özeti** bulunduğu için bu kaynak, doğrulanmış ses alıntısı veya salt görsel gözlem diye yeniden etiketlenmeden öğretim örneği olarak değerlendirildi.

**Sunum sözleşmesi:** `T2-P147-Q01` için yeni iki sütun başlığı `data/grade-11/presentation/theme-2/web-presentation.json` içindeki `comparison.sections` ile eşleştirildi. `T2-P159-Q08`'in doğrulanmış ekran alıntısını taşıyan `answer_text.fragments` ve 'videoda anıldığına dair ses kanıtı değildir' ifadesi korundu.

**Kalite durağı:** Başka kayıt bu turda değiştirilmedi; sıradaki grup ayrı kaynak ve test turunda değerlendirilecek.

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
| Tema 1 | `T1-P72-Q01` | 72–73 | **Tur 3: incelendi ve düzeltildi** |
| Tema 1 | `T1-P73-Q01` | 72–73 | **Tur 3: incelendi ve düzeltildi** |
| Tema 1 | `T1-P73-Q02` | 72–73 | **Tur 3: incelendi ve düzeltildi** |
| Tema 1 | `T1-P83-Q13` | 79–83 | **Tur 3: incelendi ve düzeltildi** |
| Tema 2 | `T2-P88-Q01` | 86–89 | **Tur 3: incelendi ve düzeltildi** |
| Tema 2 | `T2-P88-Q02` | 86–89 | **Tur 4: incelendi ve düzeltildi** |
| Tema 2 | `T2-P88-Q03` | 86–89 | **Tur 4: incelendi ve düzeltildi** |
| Tema 2 | `T2-P88-Q04` | 86–89 | **Tur 4: incelendi ve düzeltildi** |
| Tema 2 | `T2-P88-Q05` | 86–89 | **Tur 4: incelendi ve düzeltildi** |
| Tema 2 | `T2-P113-Q01` | 113–120 | **Tur 4: incelendi ve düzeltildi** |
| Tema 2 | `T2-P129-Q01` | 129–135 | **Tur 5: incelendi ve düzeltildi** |
| Tema 2 | `T2-P129-Q02` | 129–135 | **Tur 5: incelendi ve düzeltildi** |
| Tema 2 | `T2-P129-Q03` | 129–135 | **Tur 5: incelendi ve düzeltildi** |
| Tema 2 | `T2-P140-VOC01` | 136–141 | **Tur 5: incelendi ve düzeltildi** |
| Tema 2 | `T2-P141-Q01` | 136–141 | **Tur 5: incelendi ve düzeltildi** |
| Tema 2 | `T2-P141-Q02` | 136–141 | **Tur 6: incelendi ve düzeltildi** |
| Tema 2 | `T2-P142-Q02` | 142–147 | **Tur 6: incelendi ve düzeltildi** |
| Tema 2 | `T2-P143-Q02` | 142–147 | **Tur 6: incelendi ve düzeltildi** |
| Tema 2 | `T2-P143-Q03` | 142–147 | **Tur 6: incelendi ve düzeltildi** |
| Tema 2 | `T2-P143-Q04` | 142–147 | **Tur 6: incelendi ve düzeltildi** |
| Tema 2 | `T2-P144-MAP01` | 142–147 | **Tur 7: incelendi ve düzeltildi** |
| Tema 2 | `T2-P145-PERF01` | 142–147 | **Tur 7: incelendi ve düzeltildi** |
| Tema 2 | `T2-P147-Q01` | 142–147 | **Tur 7: incelendi ve düzeltildi** |
| Tema 2 | `T2-P159-Q08` | 155–159 | **Tur 7: incelendi ve düzeltildi** |
| Tema 4 | `T4-P286-Q03` | 284–297 | **Tur 7: incelendi ve düzeltildi** |
| Tema 4 | `T4-P293-Q02` | 284–297 | Bekliyor |
| Tema 4 | `T4-P293-Q03` | 284–297 | Bekliyor |
| Tema 4 | `T4-P307-Q13` | 303–307 | Bekliyor |
| Tema 4 | `T4-P307-Q14` | 303–307 | Bekliyor |

**Tur 1–7 tamamlandı: 35/39 metni değişmiş cevap kaydı. Kalan: 4.**

## İnceleme kalite kapısı
1. Soru kökünü kitabın orijinal sayfasıyla eşleştir; yalnız JSON özetinden hareketle içerik oluşturma.
2. Eski cevap–PR #99 cevabı–mevcut `main` cevabı arasındaki örnek, kavram ve gerekçe değişimini incele; PR #103'te yapılmış önceki düzeltmeleri de koru.
3. `answer` ile `answer_sections` öğrenciye gösterilebilir somut yanıt sunmalı; öğretmene özel kontrol ve ihtiyat dili `guidance`/`explanation` alanlarında tutulmalı.
4. Gerçek ses alıntısına ihtiyaç varsa doğrulanmış transkripti bulmadan sözcüğü sözcüğüne söz uydurma. İçerik sahibi inceleme beyanı tek başına sözcüğü sözcüğüne transkript değildir.
5. Kontrolleri çalıştır ve yeni genel/tekdüze cevaplar üretme. Bir seferde küçük grup (yaklaşık 3–5 soru) değerlendir.
6. Kaynak yetersizliğinde veya inceleme kalitesi düşerse **o soruda dur**, tamamlanmayan kayıtları belgede bırak.

## Sonraki tur
Sıradaki son dört kayıt: Tema 4 `T4-P293-Q02`, `T4-P293-Q03`, `T4-P307-Q13`, `T4-P307-Q14`. Her birinin kitap sorusu, görüntü notları, bağımsız kaynakları ve eski cevapları ayrı değerlendirilecek. Tamamlandıktan sonra 39 kayıt için son tutarlılık denetimi yapılacak. Sonraki aşamalarda Tema 2 ve Tema 4, önce PR #103'te kısmen elden geçirilmiş kayıtlar da dâhil karşılaştırılacak. **Bu belgenin kaydı, bütün soruların pedagojik doğruluk açısından tamamlandığı iddiası değildir.**
