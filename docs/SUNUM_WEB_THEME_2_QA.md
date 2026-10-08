# Sunum Web — Tema 2 QA

## Kapsam ve kaynak

Tema 2'nin basılı 84–159. sayfaları PDF 85–160. sayfalarına karşılık geliyor. Kanonik kaynak, kitap metninin 76 yerel sayfa JSON'u ile öğretmen kitabının kaynak/cevap indeksleri ve cevap bankasıdır.

Dokuz akışın 203 adımı, 159 kaynak kaydının ve 177 cevap kaydının tamamını kapsıyor. Cevap havuzu 118 `question_answer`, 49 `performance_support` ve 10 `source_limited` kaydından oluşuyor. Kaynak indeksi 159 kaydın tamamını doğrulanmış olarak sayıyor.

| Akış | Basılı sayfalar |
| --- | ---: |
| Tema girişi | 84–88 |
| Oğulla Buluşma | 89–107 |
| Eski İstanbul’dan Çizgiler | 108–112 |
| Orhun Abideleri | 113–124 |
| Dîvânu Lugâti’t-Türk | 125–128 |
| Konuşma | 129–135 |
| Âşık Atışması | 136–147 |
| Yazma | 148–154 |
| Değerlendirme | 155–159 |

Sayım doğrulaması: `node scripts/verify-theme2-pedagogical.mjs` komutu sunum JSON'larından adım sayılarını yeniden hesaplar. Bu belgedeki geçmiş görsel/test bulguları yeni bir tarayıcı çalıştırması yapılmadan güncel PASS kabul edilmez.

## Sunum ve içerik kararları

- Sidecar sürümü `1.1.0`; 97 cevap eşlemesi, 69 alıntı→birim bağlantısı ve 23 `evidence_sections` içeriyor. Kaynak bölümler silinmedi: alıntı içeren açıklamalar metadata ile ilgili cevabın kanıt aşamasına taşındı.
- 16 yanıtta alıntı ve ona özgü açıklama artık bağımsız son cevap birimi olarak açılmıyor. Bölüm, ilgili cevapla aynı birime bağlandı; `contains_quote_indexes` aynı sözün ikinci bir alıntı kartı olarak yinelenmesini önlüyor. Öğretmen kitabı bölüm metinleri aynen duruyor.
- Tek alıntının birden fazla cevap birimini desteklemesi iki yerde açıkça eşlendi: s.127/2 alıntısı dil derlemesi/karşılaştırma ve dil tarihi; s.144/2 alıntısı geleneğin devamı ve sanatçı adlarının yaşaması iddialarına bağlı.
- Bağımsız alt sorular ayrı kalıyor: s.100 konu/yazılış amacı; s.101 açık/örtük ileti ve anlatım; s.121 anlatıcı özellikleri/amaçları; s.136 sanat icrası/günlük hayat; s.155 toplumsal sınıflandırma/günümüz bağlantısı; s.159/7-a ve 7-b.
- s.155/2, s.157/5 ve s.158/6’daki doğrudan seçimler, gerekçe analizinden önce yalnız seçim parçasıyla aynı cevap biriminde gösteriliyor.
- Alıntılar, yalnız sayfa varlığıyla değil hedef cevap bölümüyle izleniyor. Aşağıdaki 67 satırlı iz tablosu her alıntının kaynak sayfasını, hedef birimini ve desteklediği cevap bölümündeki iddiayı gösteriyor. Kaynak eşleşen basılı sayfalar: 86, 87, 90–92, 94–95, 107, 114–117, 120, 124–128, 132, 136, 138, 141, 143–144, 150 ve 155.
- s.143/4, s.144/2 ve s.155/1 alıntıları kitap sayfasında kesintisiz geçen tam ifadeyle hizalandı. s.100/1 karar yanıtına Çordon’un savaşta yaklaşık yirmi yıl önce ölen oğlu ve öğretmenlik yaptığı yer bilgisi eklendi; kaynak kitap metni değiştirilmedi.

## Toplu cevap metni incelemesi

164 yapılandırılmış cevabın tümünde üst özet ile cevap bölümleri karşılaştırıldı. 139 özet, bölümler cevapları içerdiği ve özeti başta açmanın sonraki birimleri önden gösterebileceği için gizli kalıyor. 25 cevapta toplam 28 kısa, kaynakta aynen bulunan parça saklanan özgün çerçeveyi, terimi veya öğrenciye gerekli sınırı koruyor. 3 doğrudan çoktan seçmeli cevapta yalnız doğru seçim parçası gerekçeyle birlikte gösteriliyor.

- s.100/1’de karar bölümüne ölümün zamanı ve Sultan’ın öğretmenlik yaptığı yer bilgisi işlendi; s.100/7’de “pişmanlık duymaz” sonucu son yorum biriminde korunuyor.
- s.107/1-b toplu özeti açıkça gizli: iç çatışma ile kişiler arası gerilim ayrı birimler olduğundan tam özet ilk birimde ikinci cevabı sızdırır.
- s.127/4’te “anlam daralması (anlam özelleşmesi)” terimi son anlam biriminde; s.129/1’de üç parçalı video yanıt şablonu ilk birimde korunuyor.
- QR/video ile sınırlı yanıtların önemli kısıtları öğrenci akışında korunuyor: s.142/etkinlik, s.143/3, s.147/1 ve s.159/8’de gözlenmeyen içeriği varsaymama; s.139 ve s.151’de gerçek deneyim/yaşam dışı varsayım eklememe; s.149 ve s.152’de kurum bilgisini doğrulama ve modelin gerçek gezi raporu olmadığını belirtme.
- Diğer kısa performans yönergeleri uygun olan ilk veya son cevap birimine bağlandı. Örneğin s.124 alternatif sınıflandırma için kanıt istemi, s.130 kaynak kullanma, s.135 erişilemeyen akran formunun ölçütlerini tahmin etmeme ve s.153 revizyon önerilerini yalnız “Kısmen/Hayır” işaretlerine uygulama.

## Kaynağa bağlı yanıt sınırları

QR videosu görülmeden tamamlanamayacak 10 kayıt, gözlem alanı veya cevap şablonu olarak kalıyor. Videodan alıntı/ayrıntı uydurulmuyor ve bu yanıtlara boş kanıt sayfası eklenmiyor: `T2-P113-Q01`, `T2-P129-Q01`, `T2-P140-VOC01`, `T2-P142-Q02`, `T2-P143-Q02`, `T2-P143-Q03`, `T2-P144-MAP01`, `T2-P145-PERF01`, `T2-P147-Q01`, `T2-P159-Q08`.

## Doğrulama durumu

Geçen kontroller:

- `node apps/sunum-web/scripts/test-theme-2-web-presentation.mjs --static-only` — 9 akış, 201 adım, 159 kaynak kaydı, 177 cevap, 76 kitap sayfası ve 67/67 alıntı; tüm eşlemeler ortak `1.1.0` çözücüsünden geçti.
- `python3 data/book/grade-11/themes/theme-2/validate_theme.py` — 76 sayfa, 571 benzersiz blok kimliği, hata/uyarı yok.
- `node --check apps/sunum-web/scripts/test-theme-2-web-presentation.mjs` ve ilgili Theme 2 dosyalarında `git diff --check` — geçti.
- `npm test --prefix apps/sunum-web` — üretim kataloğu oluşturma, şifreli veri, akış ve PPTX testleri geçti.
- `node apps/sunum-web/scripts/test-data.mjs` — üretim kataloğunda Tema 2'nin 422 cevap birimi ve 67 kanıt alıntısı doğrulandı.
- `CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node apps/sunum-web/scripts/test-theme-2-web-presentation.mjs` — statik ve gerçek Chrome kontrolleri geçti.

**Tema 2 içerik, metadata ve üretim entegrasyonu doğrulandı.** Gerçek Chrome testi üretim sunumunda ileri/geri gezinmeyi, cevapla eşleşen kanıtı, 1440/1100/390 px genişliklerde tam genişlikli tek cevap kartını, altı sözlük kelimesinin iki sabit üçlü grupta açılmasını ve videoya bağlı cevapların boş kanıt sayfası oluşturmamasını denetledi.

## Kanıt–cevap iz sürümü

Aşağıdaki tablo her alıntıyı kaynak kitap sayfasına, açık hedef cevap birimine ve o birimdeki destek iddiasına bağlıyor. `contains_quote_indexes` ile belirtilen bölümlerde kaynak alıntısı, cevap açıldıktan sonra aynı kanıt biriminin içinde gösterilir ve ikinci bir alıntı kartı olarak yinelenmez. Diğer alıntılar hedef birimin ayrı kanıt kartı olarak görünür. Bir alıntı birden fazla birime bağlandığında her iddia aynı satırda izlenir.

| Cevap / alıntı | Kitaptaki ifade | Kaynak | Hedef birim ve neden desteklediği |
| --- | --- | --- | --- |
| `T2-P100-Q01` / 0 | “Henüz gözlerim kapanmadan mutlaka gitmeliyim oraya.” | s.90 (PDF 91) | **decision** — Gerekçeler: “Henüz gözlerim kapanmadan mutlaka gitmeliyim oraya.” sözü, zamanın daraldığını hissett…. |
| `T2-P100-Q01` / 1 | “Onun hayatta olduğuna, ölmediğine her zaman inandım, her zaman hissettim bunu.” | s.90 (PDF 91) | **decision** — Gerekçeler: “Henüz gözlerim kapanmadan mutlaka gitmeliyim oraya.” sözü, zamanın daraldığını hissett…. |
| `T2-P100-Q02` / 0 | “Onu kararından caydırmaya çalışmanın yararı yoktu.” | s.91, s.107 (PDF 92, 108) | **caydirma** — Kararın değişmeyeceğini görmesi: Çordon sözlerini “sakin, kararlı, inançlı bir sesle” söylediği için Nazifkan onu caydır…. |
| `T2-P100-Q02` / 1 | “Çünkü o zaman ihtiyar kocası ona “Öz anası olsaydın beni caydırmaya çalışmazdın!” diyebilirdi.” | s.91, s.107 (PDF 92, 108) | **caydirma** — Öz annesi olmaması: Sultan'ın öz annesi olmadığından itirazının “Öz anası olsaydın beni caydırmaya çalışmaz…. |
| `T2-P100-Q07` / 0 | “Hayır, dedi, ben böyle bir şey yapamam, böyle davranmak benim huyuma suyuma uymaz! Oğluma kötülük edemem!” | s.92 (PDF 93) | **Metindeki açık gerekçe** — Metindeki açık gerekçe: Oğlunun kararına müdahale etmek “huyuna suyuna uymaz”; bunu oğluna iyilik değil, kötülü…. |
| `T2-P107-AYTMATOV` / 0 | “Millî’den beşeri’’ye doğru yol alır.” | s.107 (PDF 108) | **Millîden Beşerîye** — Millîden Beşerîye: Kırgız bir aile ve coğrafya üzerinden evlat sevgisi, özlem, kayıp, fedakârlık ve aile ç…. |
| `T2-P112-Q05` / 0 | “Kalbim böyle söylüyor, içimden böyle geliyor.” | s.90 (PDF 91) | **“Kalbim böyle söylüyor, içimden böyle geliyor.”** — “Kalbim böyle söylüyor, içimden böyle geliyor.”: Çordon'un aklıyla bildiği gerçek ile oğluna duyduğu güçlü özlem arasındaki duygusal ger…. |
| `T2-P112-Q05` / 1 | “O, tam kendisiydi, kendisinin gençliği.” | s.94, s.95 (PDF 95, 96) | **“O, tam kendisiydi, kendisinin gençliği.”** — “O, tam kendisiydi, kendisinin gençliği.”: Çordon'un oğlunda kendi gençliğini görmesini ve baba-oğul arasındaki güçlü benzerlik/ba…. |
| `T2-P112-Q05` / 2 | “Bir erkek, bir adam ol oğlum.” | s.94, s.95 (PDF 95, 96) | **“Bir erkek, bir adam ol oğlum. Nerede olursan ol, erkek ol, mert bir erkek olarak kal!”** — “Bir erkek, bir adam ol oğlum. Nerede olursan ol, erkek ol, mert bir erkek olarak kal!”: Vedada verilen bu öğüt, Çordon'un oğlundan şartlar ne olursa olsun mert ve sorumlu davr…. |
| `T2-P113-Q02` / 0 | “Her ne sözüm varsa ebedî taşa vurdum.” | s.114, s.117 (PDF 115, 118) | **Tarihî Hafızayı Korumak** — Tarihî Hafızayı Korumak: Devletin kuruluş, mücadele ve toparlanma sürecini gelecek kuşaklara aktarmak. |
| `T2-P117-BILGE01` / 0 | “Türk milleti için gece uyumadım, gündüz oturmadım.” | s.114, s.116 (PDF 115, 117) | **management-and-effort** — Kül Tigin'le Birlikte Mücadele Etmesi: Metinde Kül Tigin'le birlikte milletin adı sanı yok olmasın diye çalıştığını, “gece uyu…. |
| `T2-P117-Q01` / 0 | “Bu sözümü iyice işit, adamakıllı dinle” | s.114 (PDF 115) | **bilge-intents** — Muhataba seslenme: Bilge Kağan Türk milleti ve beylerine doğrudan seslenir; sözlerinin dinlenmesini ve üze…; Tarih ve yönetim deneyimini aktarma: Geçmişte yaşananları, devletin durumunu, seferleri ve kendisiyle Kül Tigin'in millete h…; Öğüt verme: Geçmiş anlatısından ve Ötüken, il ve töre hakkındaki sözlerinden hareketle milleti ve b…; Kül Tigin'i anma: Metin Kül Tigin'in yaptıklarını, ölümünü ve yasını anlatarak onun hatırasını yaşatır. |
| `T2-P117-Q01` / 1 | “Her ne sözüm varsa ebedî taşa vurdum.” | s.114, s.117 (PDF 115, 118) | **bilge-intents** — Sözü kalıcılaştırma: “Her ne sözüm varsa ebedî taşa vurdum.” ifadesi, söylediklerini kalıcı bir yazıtla gele…. |
| `T2-P117-Q02` / 0 | “Her ne sözüm varsa ebedî taşa vurdum.” | s.114, s.117 (PDF 115, 118) | **Sonraki kuşaklara sesleniş** — Sonraki kuşaklara sesleniş: Yazıtın “Ona bakarak bilin” diye devam etmesi, bu sözlerin sonraki kuşaklara yöneldiğin…. |
| `T2-P120-Q03` / 0 | “Dil ve kültür birlikteliği, sosyolojik mânâda bir topluma millet olma vasfını kazandıran en önemli yapı taşıdır.” | s.120 (PDF 121) | **Metindeki görüş** — Metindeki görüş: Dil ve kültür birlikteliği, bir topluma millet olma vasfı kazandıran önemli unsurlardan…. |
| `T2-P124-Y05` / 0 | “Kül Tigin koyun yılında on yedinci günde uçtu.” | s.115, s.124 (PDF 116, 125) | **death-and-rites** — Örtmeceli Söyleyiş: “Uçtu” ve “bulut çöktürdü” sözleri, ölümü doğrudan adlandırmak yerine mecazlı/örtmeceli…. |
| `T2-P124-Y05` / 1 | “Dokuzuncu ay, yirmi yedinci günde yas töreni tertip ettik.” | s.115, s.124 (PDF 116, 125) | **death-and-rites** — Yas Töreni: “Yas töreni tertip ettik.” sözü, ölümün ardından toplu ve düzenlenmiş bir anma/yas uygu…. |
| `T2-P124-Y05` / 2 | “Kül Tigin kendisi kırk yedi yaşında bulut çöktürdü.” | s.115, s.124 (PDF 116, 125) | **death-and-rites** — Örtmeceli Söyleyiş: “Uçtu” ve “bulut çöktürdü” sözleri, ölümü doğrudan adlandırmak yerine mecazlı/örtmeceli…. |
| `T2-P127-FARK01` / 0 | “Kaşgarlı’nın lugatı yazılı bir atlı göçebe medeniyeti müzesidir.” | s.127 (PDF 128) | **Sonuç** — Sonuç: Sözlük, kelimeleri tanımlarken onların kullanıldığı hayat alanlarını da belgelediği içi…. |
| `T2-P127-Q02` / 0 | “onların ülkelerini ve bozkırlarını inceledim” | s.125 (PDF 126) | **fieldwork-and-comparison** — Saha ve Dil Derlemesi: Kâşgarlı Mahmud, “onların ülkelerini ve bozkırlarını inceledim” diyerek farklı topluluk…. |
| `T2-P127-Q02` / 1 | “her boyun dili bende en mükemmel şeklini buldu” | s.125 (PDF 126) | **fieldwork-and-comparison** — Karşılaştırmalı Malzeme: Türk, Türkmen, Oğuz, Çigil, Yağma ve Kırgız gibi farklı toplulukların dil özelliklerini…; **language-history** — Dil Tarihi İçin Önemi: 11. yüzyıl Türkçesinin söz varlığı, lehçe çeşitliliği ve kullanım örnekleri hakkında do…. |
| `T2-P127-Q03` / 0 | “Yakınlarına iyilik et ve onları ağırla.” | s.126 (PDF 127) | **social-advice** — Yakınları Ağırlama: “Yakınlarına iyilik et ve onları ağırla.” sözü, yakın çevreyle ilgilenme ve misafirperv…. |
| `T2-P127-Q03` / 1 | “Hediye kabul ettiğin zaman güzel bir şeyle karşılığını hazırla.” | s.126 (PDF 127) | **social-advice** — Hediyeleşmede Karşılıklılık: “Hediye kabul ettiğin zaman güzel bir şeyle karşılığını hazırla.” sözü, hediyeleşmenin…. |
| `T2-P128-FARK03` / 0 | “Türkler nereye gitmişlerse, dillerini de oraya götürmüşler” | s.128 (PDF 129) | **cause-and-effect** — Metinde Verilen Neden: “Türkler nereye gitmişlerse, dillerini de oraya götürmüşler” ifadesi, coğrafi yayılma i…. |
| `T2-P128-Q01` / 0 | “Türk milleti için gece uyumadım, gündüz oturmadım.” | s.114, s.116 (PDF 115, 117) | **rhetorical-features** — Hitabet Gücü: “Türk milleti için gece uyumadım, gündüz oturmadım.” sözü, yöneticinin millet için çalı…. |
| `T2-P132-Q01` / 0 | “Kültür, değişken ve dinamiktir.” | s.132 (PDF 133) | **Olası Nedenler** — Olası Nedenler: Farklı coğrafi ve iklimsel koşullar Zaman içinde değişen ihtiyaç ve yaşam biçimleri Far…. |
| `T2-P132-Q03` / 0 | “Kültürü değişen bir toplumun dili, düşüncesi, töresi, göreneği de değişir.” | s.132 (PDF 133) | **Söz Varlığı ve Kültür** — Söz Varlığı ve Kültür: Dil, toplumun neyi önemli gördüğü ve hangi deneyimleri yaşadığı hakkında kültürel ipuçl…. |
| `T2-P136-Q01` / 0 | “doğmaca söylerken düşünme imkânı veren bir âlettir” | s.136 (PDF 137) | **craft-and-experience** — Sanatsal İcra: Saz, doğmaca söyleme sırasında düşünme zamanı kazandırır; ölçü, kafiye ve anlam uyumunu…; Metindeki Deney: Nida Tüfekçi'nin aktardığı deneyde sazsız atışmada âşıkların zorlandığı ve üretkenlikle…. |
| `T2-P136-Q01` / 1 | “şiirde ölçü, kafiye ve anlam uyumlarını sağlama imkânına saz sayesinde kavuşur” | s.136 (PDF 137) | **craft-and-experience** — Sanatsal İcra: Saz, doğmaca söyleme sırasında düşünme zamanı kazandırır; ölçü, kafiye ve anlam uyumunu…; Metindeki Deney: Nida Tüfekçi'nin aktardığı deneyde sazsız atışmada âşıkların zorlandığı ve üretkenlikle…. |
| `T2-P136-Q01` / 2 | “suyu kısılmış değirmen gibi, üretkenliklerinden çok şey kaybediyorlar” | s.136 (PDF 137) | **craft-and-experience** — Sanatsal İcra: Saz, doğmaca söyleme sırasında düşünme zamanı kazandırır; ölçü, kafiye ve anlam uyumunu…; Metindeki Deney: Nida Tüfekçi'nin aktardığı deneyde sazsız atışmada âşıkların zorlandığı ve üretkenlikle…. |
| `T2-P136-Q02` / 0 | “Sen petek misâli Veysel de arı” | s.136 (PDF 137) | **saz-as-companion** — Benzetme: Veysel kendisini arıya, sazını peteğe benzetir; “bal” birlikte ortaya çıkan sanat ürünü…. |
| `T2-P136-Q02` / 1 | “İnleşir beraber yapardık balı” | s.136 (PDF 137) | **saz-as-companion** — Birlikte Üretim: “İnleşir beraber yapardık balı” sözü, sanatçı ile sazın icrada birbirini tamamladığını…. |
| `T2-P136-Q02` / 2 | “Ben bir insanoğlu sen bir dut dalı” | s.136 (PDF 137) | **saz-as-companion** — Benzetme: Veysel kendisini arıya, sazını peteğe benzetir; “bal” birlikte ortaya çıkan sanat ürünü…. |
| `T2-P136-Q02` / 3 | “Ben babamı sen ustanı unutma” | s.136 (PDF 137) | **saz-as-companion** — Sırdaşlık ve Vefa: “Gizli sırlarımı âşikâr etme” ve “Ben babamı sen ustanı unutma” dizeleri, sazın sanatçı…. |
| `T2-P138-Q01` / 0 | “Türkler arasında bu tip sanatçılar İslâmiyet’ten evvel bile yaşamıştır. Türklerin bunlara verdiği en yaygın isim ‘‘ozan’’dır.” | s.138 (PDF 139) | **tradition-background** — Tahmin: Bu bilgilerden hareketle dinlenecek karşılıklı sazlı icranın âşıklık geleneği içinde de…. |
| `T2-P138-Q01` / 1 | “XVI. yüzyıldan sonra ozanlar artık görülmez olur, onların yerini başka bir sanatçı, ozanlara benzeyen bir sanatçı alır: Âşık.” | s.138 (PDF 139) | **tradition-background** — Metindeki Tarihî Süreç: İslamiyet öncesinde ve sonrasında “ozan” adıyla anılan sanatçı tipi → XVI. yüzyıldan so…. |
| `T2-P138-Q01` / 2 | “Göçebelikten yerleşik hayata geçerek yeni bir toplum düzeninin kurulması, şehir ve kasabaların büyük ölçüde teşekkülü, toplum-içi çatışmalarının çoğalması destan anlatıcısı ozanın yerine âşık tipinin geçmesini hazırlayan en köklü âmillerdir.” | s.138 (PDF 139) | **tradition-background** — Dönüşümün Metindeki Nedeni: Göçebelikten yerleşik hayata geçiş, şehir ve kasabaların gelişmesi ve toplum içi çatışm…. |
| `T2-P138-Q02` / 0 | “Saz ve türkü bu ortak hayatın kalıntıları olarak saz şairinin elinde hâlâ beraber yaşamaktadır.” | s.138 (PDF 139) | **saz-and-performance** — Saz ve Müzikal İcra: Metin, saz ile türkünün saz şairinin elinde birlikte yaşadığını ve eserlerin çalgı eşli…. |
| `T2-P138-Q02` / 1 | “Eserlerini bir çalgı âletiyle beraber söylemek bunların müşterek özellikleri olmuştur.” | s.138 (PDF 139) | **saz-and-performance** — Doğmaca Söyleme: s.136'daki metin sazın doğmaca söyleme sırasında düşünme imkânı verdiğini belirtir; bu…. |
| `T2-P141-Q01` / 0 | “Bilgi ve eğitim boyutuna ağırlık verilerek, âşıklık geleneği kültürel mirasının saptanması, korunması, teşviki ve aktarılmasını hedef alan politikalar geliştirilmelidir.” | s.141 (PDF 142) | **Metinden Doğrudan Çıkanlar** — Metinden Doğrudan Çıkanlar: Geleneği belgelemek ve korumak. Teşvik etmek ve yeni kuşaklara aktarmak. Bilgi ve eğiti…. |
| `T2-P141-Q01` / 1 | “geçmişi gelecek kuşaklara taşımak ve çağdaş yorumlarını yapmak amacıyla sosyal, kültürel ve sanatsal çalışmaları, toplumumuzun değişik kesimleri ile birlikte yürütme” | s.141 (PDF 142) | **Metinden Doğrudan Çıkanlar** — Metinden Doğrudan Çıkanlar: Geleneği belgelemek ve korumak. Teşvik etmek ve yeni kuşaklara aktarmak. Bilgi ve eğiti…. |
| `T2-P141-Q02` / 0 | “Türk dünyası âşıklık geleneği, yüzyılların deneyimlerinden süzülerek biçimlenmiş, kuşaktan kuşağa aktarılan bir değerler bütünüdür.” | s.141 (PDF 142) | **Kültürel Bellek** — Kültürel Bellek: Âşıklık geleneği, kuşaktan kuşağa aktarılan bir değerler bütünüdür. |
| `T2-P141-Q02` / 1 | “Kültürel miras, sürdürülebilir kalkınma ve barışın garantisidir.” | s.141 (PDF 142) | **Yakınlaşma ve Aktarım** — Yakınlaşma ve Aktarım: Kültürün toplumları birbirine yakınlaştırdığı; geleneğin geçmişi gelecek kuşaklara taşı…. |
| `T2-P141-Q02` / 2 | “Kültür, ulusları birbirlerine yakınlaştırmakta, insanların barış ve hoşgörü içinde yaşamalarının temelini oluşturmaktadır.” | s.141 (PDF 142) | **Yakınlaşma ve Aktarım** — Yakınlaşma ve Aktarım: Kültürün toplumları birbirine yakınlaştırdığı; geleneğin geçmişi gelecek kuşaklara taşı…. |
| `T2-P143-Q04` / 0 | “demek gökten ağsa bile tohum yürekten düşecekmiş” | s.143 (PDF 144) | **comparison** — Âşık Şiirinin Dilinden Gözlenebilenler: [Videoda gerçekten duyulan daha açık/doğrudan söyleyiş, deyim, benzetme, hitap, mizah v…; Benzerlik: Her iki şiir dilinde de düz günlük konuşmadan farklı olarak mecaz, çağrışım ve estetik…; Farklılık: Münacaat'taki yoğun/özgün imge yapısı ile atışmada gözlenen daha doğrudan, karşılıklı v…. |
| `T2-P143-Q04` / 1 | “kaldı bu silinmez yaşamak suçu üzerimde” | s.143 (PDF 144) | **comparison** — Münacaat'ın Dilinden Gözlenebilenler: Soyut ve çağrışım gücü yüksek ifadeler kullanılır: “silinmez yaşamak suçu”, “insanın in…. |
| `T2-P143-Q04` / 2 | “tütmesi gereken ocak nerde?” | s.143 (PDF 144) | **comparison** — Âşık Şiirinin Dilinden Gözlenebilenler: [Videoda gerçekten duyulan daha açık/doğrudan söyleyiş, deyim, benzetme, hitap, mizah v…; Benzerlik: Her iki şiir dilinde de düz günlük konuşmadan farklı olarak mecaz, çağrışım ve estetik…; Farklılık: Münacaat'taki yoğun/özgün imge yapısı ile atışmada gözlenen daha doğrudan, karşılıklı v…. |
| `T2-P144-Q01` / 0 | “hayranlık duydukları usta bir âşığa çıraklık ederek, bu sanatı icra etmede gerekli olan edebî ve meslekî terbiyeyi edinirler” | s.144 (PDF 145) | **respect-and-transmission** — Çırağın Ustaya Yaklaşımı: Metin, gençlerin “hayranlık duydukları usta bir âşığa çıraklık ederek” gerekli terbiyey…. |
| `T2-P144-Q01` / 1 | “ahlâklı ve dürüst olmasına bakarak bir çırak edinir” | s.144 (PDF 145) | **respect-and-transmission** — Ahlak ve Dürüstlük: Usta, çırak seçerken yeteneğin yanında “ahlâklı ve dürüst” oluşuna da bakar. |
| `T2-P144-Q01` / 2 | “gelenekle ilgili tüm bildiklerini sakınmadan çıraklarına öğretmeli” | s.144 (PDF 145) | **respect-and-transmission** — Bilgiyi Paylaşma: Usta âşığın “gelenekle ilgili tüm bildiklerini sakınmadan” öğretmesi, çırağa ve geleneğ…. |
| `T2-P144-Q02` / 0 | “geleneğin devam etmesi ve kendi isimlerinin unutulmaması için yetiştirmek üzere bir çırak edinirler” | s.144 (PDF 145) | **Eser ve İsimlerin Yaşaması** — Eser ve İsimlerin Yaşaması: Metin, ustaların adlarının ve eserlerinin yaşamasını istemesini açıkça belirtir; **Geleneğin Devamı** — Geleneğin Devamı: Usta âşıkların çırak yetiştirme nedenlerinden biri geleneğin devam etmesidir. |
| `T2-P144-Q02` / 1 | “gelenekle ilgili tüm bildiklerini sakınmadan çıraklarına öğretmeli” | s.144 (PDF 145) | **Dil ve Kültürel Bellek** — Dil ve Kültürel Bellek: Bu aktarım yoluyla şiir dili, icra biçimleri ve geleneğe ait kültürel bilgi yeni kuşakl…. |
| `T2-P144-Q03` / 0 | “bu sanatı icra etmede gerekli olan edebî ve meslekî terbiyeyi edinirler” | s.144 (PDF 145) | **training-to-wordplay** — Metindeki Dayanak 1: Çıraklar, “bu sanatı icra etmede gerekli olan edebî ve meslekî terbiyeyi” ustadan edinir. |
| `T2-P144-Q03` / 1 | “gelenekle ilgili tüm bildiklerini sakınmadan çıraklarına öğretmeli” | s.144 (PDF 145) | **training-to-wordplay** — Metindeki Dayanak 2: Usta, “gelenekle ilgili tüm bildiklerini sakınmadan” çırağına öğretmelidir. |
| `T2-P150-Q01` / 0 | “Fiziksel miras, bizim gördüğümüz kültür ürünleridir.” | s.150 (PDF 151) | **Fiziksel (görünen) miras için olası örnekler** — Fiziksel (görünen) miras için olası örnekler: Dokuma, kıyafet, seramik, el yazması, araç-gereç, çalgı veya sanat eseri. |
| `T2-P150-Q01` / 1 | “Fiziksel olarak algılanan kültür ürünlerinin oluşumu, hikayeleri, yapılış süreci, yapılış amacı, etkilendikleri ve etkiledikleri ise görünmeyen miras olarak adlandırılabilir.” | s.150 (PDF 151) | **Görünmeyen miras hakkında sorulabilecekler** — Görünmeyen miras hakkında sorulabilecekler: Bu nesne hangi amaçla üretilmiş? Nasıl yapılmış ve kullanılmış? Onu üreten veya kullana…. |
| `T2-P150-Q01` / 2 | “Fiziksel olarak gözle görülemeyen miras, görülebilen miras kadar değer taşır.” | s.150 (PDF 151) | **Görünmeyen miras hakkında sorulabilecekler** — Görünmeyen miras hakkında sorulabilecekler: Bu nesne hangi amaçla üretilmiş? Nasıl yapılmış ve kullanılmış? Onu üreten veya kullana…. |
| `T2-P155-Q01` / 0 | “Yufka kalın olsa delmesi zormuş.” | s.155 (PDF 156) | **society-classification** — Birlik ve dayanışma: “Yufka olanı delmek kolaymış... yufka kalın olsa delmesi zormuş” sözü birlikle güçlenme…. |
| `T2-P155-Q01` / 1 | “kızıl kanın töküt-, kara terin yüğürt-” | s.155 (PDF 156) | **society-classification** — Emek ve çalışma: “Kızıl kanını akıtmak, kara terini dökmek”, “geceleri uyumamak, gündüzleri oturmamak” v…; Devlet ve düzen: “İl tutmak, töre düzenlemek” ve “devlet sahibi olmak” ifadeleri siyasi düzen ve devlet…; Güç ve mücadele: “Başlıya baş eğdirmek, dizliye diz çöktürmek” ifadesi yazıtın güç ve mücadele dilini gö…. |
| `T2-P155-Q01` / 2 | “başlığığ yeküntür-, tizliğiğ sökür-” | s.155 (PDF 156) | **society-classification** — Emek ve çalışma: “Kızıl kanını akıtmak, kara terini dökmek”, “geceleri uyumamak, gündüzleri oturmamak” v…; Devlet ve düzen: “İl tutmak, töre düzenlemek” ve “devlet sahibi olmak” ifadeleri siyasi düzen ve devlet…; Güç ve mücadele: “Başlıya baş eğdirmek, dizliye diz çöktürmek” ifadesi yazıtın güç ve mücadele dilini gö…. |
| `T2-P155-Q01` / 3 | “biriki budunuğ ot sub kıl-” | s.155 (PDF 156) | **society-classification** — Emek ve çalışma: “Kızıl kanını akıtmak, kara terini dökmek”, “geceleri uyumamak, gündüzleri oturmamak” v…; Devlet ve düzen: “İl tutmak, töre düzenlemek” ve “devlet sahibi olmak” ifadeleri siyasi düzen ve devlet…; Güç ve mücadele: “Başlıya baş eğdirmek, dizliye diz çöktürmek” ifadesi yazıtın güç ve mücadele dilini gö…. |
| `T2-P155-Q01` / 4 | “ilin törüsin tuta birmiş-” | s.115, s.155 (PDF 116, 156) | **society-classification** — Emek ve çalışma: “Kızıl kanını akıtmak, kara terini dökmek”, “geceleri uyumamak, gündüzleri oturmamak” v…; Devlet ve düzen: “İl tutmak, töre düzenlemek” ve “devlet sahibi olmak” ifadeleri siyasi düzen ve devlet…; Güç ve mücadele: “Başlıya baş eğdirmek, dizliye diz çöktürmek” ifadesi yazıtın güç ve mücadele dilini gö…. |
| `T2-P155-Q01` / 5 | “tün udıma-, küntüz olurma-” | s.155 (PDF 156) | **society-classification** — Emek ve çalışma: “Kızıl kanını akıtmak, kara terini dökmek”, “geceleri uyumamak, gündüzleri oturmamak” v…; Devlet ve düzen: “İl tutmak, töre düzenlemek” ve “devlet sahibi olmak” ifadeleri siyasi düzen ve devlet…; Güç ve mücadele: “Başlıya baş eğdirmek, dizliye diz çöktürmek” ifadesi yazıtın güç ve mücadele dilini gö…. |
| `T2-P86-Q01` / 0 | “Türk toplumunun hayatına tesir eden, onu yaşatan temel kıymetleri” | s.86 (PDF 87) | **Ortak Değerlerin Görünür Hâle Gelmesi** — Ortak Değerlerin Görünür Hâle Gelmesi: Vatan yahut Silistre örneğinde vatan sevgisi, fedakârlık ve görev bilinci gibi değerler…. |
| `T2-P86-Q01` / 1 | “derin ve sürekli olarak tesir eden” | s.86 (PDF 87) | **Kuşaklar Arası Kültür Aktarımı** — Kuşaklar Arası Kültür Aktarımı: Edebî eserlerin okunması, sahnelenmesi ve yeniden yorumlanması ortak kültürel hafızanın…. |
| `T2-P86-Q02` / 0 | “İslâm Bey, sadece kahraman değil, aynı zamanda, adeta vatan fikrinin nazariyatçısıdır.” | s.86 (PDF 87) | **Fikrî Boyut** — Fikrî Boyut: İslâm Bey vatan düşüncesini yalnız bir duygu olarak yaşamaz; neden önemli olduğunu sözl…. |
| `T2-P87-Q02` / 0 | “karşılıklı anlayış ve işbirliğini teşvik ederken onların dil mirasını da korumaktadır” | s.87 (PDF 88) | **Dil Mirasının Korunması** — Dil Mirasının Korunması: Metin, ortak alfabe çalışmasının dil mirasını korumaya katkı sağlayabileceğini açıkça v…. |
