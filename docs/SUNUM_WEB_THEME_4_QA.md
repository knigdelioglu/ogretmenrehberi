# Sunum Web — Tema 4 QA

Tarih: 2026-10-03  
Kapsam: 11. sınıf Türk Dili ve Edebiyatı, 4. Tema — *Hayatın Aynası*.

## Kaynak ve akış kapsamı

Yerel kitap kaynağı, basılı 236–307. sayfaların 72 sayfa JSON kaydını içerir. PDF sayfası her sayfada basılı sayfa numarasından bir fazladır: PDF 237–308. sayfalar. Sunum akışları 143 kaynak kaydını ve cevap bankasındaki 164 yanıtın tamamını kapsar; toplam 14 akışta 237 adım vardır.

| Basılı sayfalar | Akış |
| --- | --- |
| 236–242 | Hayatın Aynası — temaya giriş |
| 243–250 | Ben, Mimar Sinan — okuma ve sanatın işlevi |
| 251–255 | Ben, Mimar Sinan — anlama ve karşılaştırma |
| 256–259 | Ben, Mimar Sinan — yapı, anlatım ve kültür |
| 260–262 | Ben, Mimar Sinan — değerler ve değerlendirme |
| 263–265 | Merdiven — yaşam evreleri ve okuma |
| 266–270 | Merdiven — söz varlığı ve metni anlama |
| 271–273 | Merdiven — tür özellikleri ve karşılaştırmalar |
| 274–279 | Merdiven — karakter, çatışma ve değerlendirme |
| 280–283 | Tiyatro metnini canlandırma — konuşma atölyesi |
| 284–290 | Anadolu İnsanı / Fedakârlık — dinleme ve anlama |
| 291–297 | Anadolu İnsanı / Fedakârlık — çözümleme |
| 298–302 | Fedakârlık belgeseli — afiş yazma atölyesi |
| 303–307 | 4. Tema — ölçme ve değerlendirme |

## Sunum kararları

- 93 anahtarlı yapılandırılmış cevabın toplu answer metni tek tek denetlendi. Bölümlerle aynı bilgiyi yineleyen özetler atlanır; yalnız 34 yanıtta bölümlerde bulunmayan özgün çerçeve, yöntem, sınırlılık veya doğru seçenek parçaları tam kaynak alıntısı olarak seçilir.
- Karşılaştırma ve çözümleme tablolarında çok sayıda alanı bulunan yanıtlar anlamlı başlık kümeleri hâlinde gruplanır. Tema–konu ayrımı korunur.
- 20 alıntılı yanıtın 48 metin kanıtı cevap birimlerine bağlanır. Cevap bölümlerinde zaten yer alan 25 alıntı tekrarı, 10 yanıttaki 11 kanıt bölümünden ayrıca alıntı kartı olarak açılmaz; bu bölümlerdeki açıklama korunarak cevap sonrasındaki kanıt aşamasına taşınır.
- Basılı s.288’de tema, konu ve ana düşünce ayrı alanlar olarak kalır. Kaynak sayfadaki “Bilgiler, içeriği yansıtacak şekilde sunulmuştur.” ifadesi kitapta önceden verilmiştir.

## Kaynak denetiminde yapılan düzeltmeler

- T4-P285-Q02: Eski yanıt, görselde demir yolu yanındaki kaplumbağaya yardım edildiğini söylüyordu. Yerel p.285 görsel açıklaması tarlada çalışan ellerin yakın çekimini tarif ediyor. Yanıt yalnız başlık ve görünür görsele dayanan izleme öncesi tahmine çevrildi; videodaki olay ve kişiler için doğrulama koşulu eklendi.
- T4-P262-PERF01: Kanıt alıntısı p.257’deki oyun metniyle eşleşecek biçimde “ki”den sonra virgül alır. p.251’deki tablo alıntısında bu virgül yoktur; cevap bankasındaki kanıt biçimi p.257 pasajına göre düzeltildi.

## Kaynak sınırları

- Yerel sayfa JSON’ları QR kodlarının video içeriğini barındırmıyor. Fedakârlık videosuna dayalı p.285–286 ve p.288–297 çalışmaları ile Aidiyet videosuna dayalı p.307 soru 13–14, video görülmeden kaynakla sınırlı değerlendirilmelidir. İlgili yanıtlar gözlem, kanıt ve izleme sonrası doğrulamayı öğrenciye bırakır.
- p.305’in yerel görsel bloğu dört fotoğraf için toplu bir betimleme verir; her seçeneğin metinsel açıklamasını ayrı ayrı içermez. Sunumda afiş seçimi tek doğruya indirgenmez; gerekçe şiirle ilişkilendirilir.
- p.254’teki dram tanımı sayfa metin katmanında Cimri diyalog satırlarıyla iç içe geçer. Alıntı Modern Tiyatro Türleri bilgi kutusunda görsel düzen üzerinden doğrulanmıştır; QA testi bu tek kaynağı parça temelli denetler.

## Test ve tarayıcı doğrulaması

- PASS — node apps/sunum-web/scripts/test-theme-4-presentation.mjs. 72 sayfa, 14 akış, 237 adım, 143 kaynak kaydı, 164 yanıt, 93 yapılandırılmış yanıt, 34 seçili özet parçası, 48 alıntı, 11 kanıt bölümü ve 25 yinelenen alıntı eşlemesi denetlendi.
- PASS — node --check apps/sunum-web/scripts/test-theme-4-presentation-browser.mjs.
- PASS — `CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PORT=5206 node apps/sunum-web/scripts/test-theme-4-presentation-browser.mjs`. Son üretim `dist` gerçek Chrome’da açıldı; tek yanıt genişliği, cevap sonrası eşleşmiş kanıt, P252 alıntı tekilliği ile geri/ileri gezinme, P256/P278 cevap grupları, üç sözlük bağlamı, kaynakla sınırlı P288 yanıtları ve 390/1440 px yatay taşmasız düzen doğrulandı.
