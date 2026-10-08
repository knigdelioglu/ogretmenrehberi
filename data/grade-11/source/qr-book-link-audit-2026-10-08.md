# 11. Sınıf Edebiyat Ders Kitabı — QR Video Bağlantı Denetimi

**Denetim tarihi:** 2026-10-08  
**Kaynak:** `Edebiyat 11 ders kitabı.pdf` (313 sayfa), SHA-256: `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba`.  
**Yöntem:** Basılı sayfalara denk gelen PDF sayfalarının **yerleşik URL/hyperlink annotation** kayıtlarından gerçek EBA `resourceId` değeri çıkarıldı; aynı sayfadaki birden çok karekod görünen etiket ve koordinatlarıyla ayrıştırıldı.

## Sonuç

**18 video kullanım yerinin 18'i için orijinal basılı karekodun hedef EBA URL'si doğrulandı.** Bu sonuç, 18 Drive MP4 dosyasının tamamının bu EBA kaynaklarından indirildiği anlamına **gelmez**. Beş dosya için önceki EBA indirme/SHA kaydıyla karşılaştırma da mevcuttur; 12 diğer dosyada PNG ve görsel konu eşleştirmesi, s.88'de ise PDF QR kimliği kesin ancak `19XU49LO.mp4` video dosyasının doğrudan EBA kökeni hâlâ kanıtlanmamıştır.

| Basılı s. | Öğretim kaynağı | Drive dosya adayı | PDF QR → EBA kimliği (ilk 12) |
| ---: | --- | --- | --- |
| 43 | Mektup Türünün Serüveni | `19XU49ME.mp4` | `e43890dfd82a` |
| 53 | Seksenler | `19XU49K2.mp4` | `254c08ea3501` |
| 53 | Sözlü İletişim Engelleri | `19XU3SUD.mp4` | `551442fb39ef` |
| 64 | Değişen İletişim Araçlarının Hayatımızdaki Yeri | `19XU49LL.mp4` | `29bf4f293d53` |
| 67 | Geçmişten Günümüze İletişim Araçları | `19XU4CVR.mp4` | `bfb2729458df` |
| 83 | Olvido | `OGM2025TDE118312.mp4` | `2952f505e3a7` |
| 88 | Türklerde Toylar, Merasimler, Festivaller ve Şenlikler | `19XU49LO.mp4` (**dosya adayı**) | `382543f8f403` |
| 113 | Orhun Vadisi | `19XU49LT.mp4` | `06740daa8a1a` |
| 129 | Dünyadaki Türkiye – Türk Dünyası | `19XU49LP.mp4` | `2d18e79ed468` |
| 140 | Murat Çobanoğlu – Şeref Taşlıova Atışması | `19XU49JV.mp4` | `85ae59be9852` |
| 141 | Âşıklık Geleneği | `19XU49MG.mp4` | `79b9d858a984` |
| 159 | Göktürklerin Dirilişi | `19XU49MB.mp4` | `b557411639a9` |
| 220 | Osmancık | `19XU49LV.mp4` | `572fe5fff1b6` |
| 285 | Anadolu İnsanı / Fedakârlık — **jenerik** | `19XU4GDV.mp4` | `bc54a785fede` |
| 285 | Anadolu İnsanı / Fedakârlık — **asıl video** | `19XU49LQ.mp4` | `5fd2b97cb78f` |
| 293 | Anadolu İnsanı / Çalışkanlık | `19XU49KB.mp4` | `cc654606d608` |
| 300 | Afiş Hazırlama Basamakları | `19XU3SW3.mp4` | `5a6b3d654679` |
| 307 | Anadolu İnsanı / Aidiyet | `19XU49LS.mp4` | `6e0ca79cee42` |

Her bağlantının **32 karakterlik tam EBA kimliği, doğrudan URL'si ve PDF sayfası** [qr-media-intake-2026-10-08.json](qr-media-intake-2026-10-08.json) kaydında `book_qr` alanındadır. Bu liste yalnız gözle kolay takip için kimliğin ilk 12 karakterini gösterir.

## Yanlış eşleşme düzeltmesi: basılı s.88

Kullanıcının `karekodlar.png` listesindeki **s.88 → `19XU4CVR.mp4`**, videonun içeriği ve kitap PDF'sindeki bağlantıyla çelişir. Bu MP4 doğrulanmış şekilde **s.67 iletişim araçları videosudur**. 

Basılı **s.88'in özgün QR URL'si** şudur:

`https://ders.eba.gov.tr/ders//redirectContent.jsp?resourceId=382543f8f403f67200b286af84e71b40&resourceType=1&resourceLocation=2`

`19XU49LO.mp4` görüntülerinde TRT'nin Türk dünyası, geleneksel şenlik ve tarımsal ortaklık temalı görüntüleri yer aldığından **içerik bakımından güçlü adaydır**. Ancak dosyanın gerçek QR bağlantısından indirildiğini belgeleyen içerik metadatası / orijinal indirme doğrulaması henüz yoktur. Bu belirsizlik kayıtlardan kaldırılmadı.

## Başka amaçlı QR bağlantıları dışarıda bırakıldı

- **s.83:** `89f20fd73ff30babb94f117c4a5543d9` — ölçme değerlendirme/ek soru; Olvido videosu değil.
- **s.140:** `0e3a491e5a0ec25589859f9ea01d65a9` — TDK Güncel Türkçe Sözlük; âşık atışması videosu değil.
- **s.159:** `091d0e9f24ce079185394326201e9a7d` — ek soru; Göktürklerin Dirilişi videosu değil.
- **s.307:** `c22abf815e01824417aea84f6c4d4bcf` — ek soru; Anadolu İnsanı / Aidiyet videosu değil.

## İçeriğe ilişkin sınır

Bir QR URL'sinin kesinlikle doğrulanmış olması, EBA sayfasının kullanıcının ortamında açıldığını veya sesin eksiksiz çözümlendiğini göstermez. Ayrıca paylaşılan Drive dosyaları üçüncü taraf içerikleri barındırıyor olabilir; bu MP4'leri veya tam konuşma transkriptlerini izin olmadan kamusal repo/siteye koyma.
