# 2. Tema — Kültür Yolculuğu / Kaynak ve kalite denetimi

## Kapsam ve kaynak

- İşlenen tema: 2. Tema — Kültür Yolculuğu.
- Basılı sayfa aralığı: 84–159.
- PDF sayfa aralığı: 85–160; tüm aralıkta PDF sayfası = basılı sayfa + 1.
- Sınır denetimi: basılı 84 / PDF 85 sayfasında 2. Tema açılışı; basılı 159 / PDF 160 son tema değerlendirme sayfası; sonraki tema basılı 160 / PDF 161’de başlıyor.
- Kanonik kaynak: `/Users/kadir/Downloads/Edebiyat 11 ders kitabı.pdf` (SHA-256 `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba`). Depodaki textbook-map hash'iyle eşleşti.
- Kitap içeriği yalnızca kaynak PDF’den çıkarıldı. Sayfa JSON’larında her PDF sayfasının Poppler yerleşimli dökümü korunur; soru ve yönerge blokları, tablolar ve görsel işaretleri ayrıca yapılandırılmıştır.

## Üretilen kayıtlar

- Sayfa JSON’u: 76 (`pages/p084.json`–`pages/p159.json`).
- JSON dosyası toplamı: 77 (76 sayfa JSON’u + manifest).
- Toplam block: 571.
- Soru block’u: 166.
- Tablo: 15.
- Etkinlik grubu: 90 (aynı sayfadaki öğeler, sayfadaki en yakın etkinlik başlığı altında bağlandı).
- Yönerge block’u: 52.
- Görsel block’u: 46.
- Edebî metin devam/başvuru işaretleyicisi: 13.

## PDF kalite denetimi

- PDF’nin 76 sayfası için metin dökümü alındı; sayfa başlıkları, numaralı istemler ve sonraki tema sınırı kontrol edildi.
- Dört tam sayfalı görsel iletişim kâğıdıyla 84–159 basılı sayfalarının tamamının yerleşimi gözden geçirildi. Fotoğraf, görsel düzenleyici ve QR-kodlu alanlar bulunduğu sayfalarda visual block olarak kaydedildi; betimler yalnızca gözlenebilen sayfa ögelerini içerir.
- Tablo hücreleri PDF geometrisinden çıkarıldı. Tablo satır/sütun yapıları otomatik doğrulayıcıyla denetlenir.
- Sorular ve numaralı çalışma adımları PDF metnindeki sıra korunarak kaydedildi. Harfli alt sorular ayrı `subquestions` alanında tutulduğunda yanıt metninden ayrılır.
- Basılı sayfa/PDF sayfa eşlemesi her sayfa kaydında ayrı alanlardadır.
- Kaynakta olmayan cevap eklenmedi. Doldurulmamış çalışma alanları cevap olarak tamamlanmadı.
- PDF metin çıkarımı sırasında dört adet `No current point in closepath` vektör yolu uyarısı oluştu; bu uyarılar sayfa dökümünü durdurmadı.
- PDF içindeki karekodların yönlendirdiği harici video/çok modlu içerik bu PDF dosyasının parçası olmadığından metin içeriği olarak eklenmedi.
- Basılı sayfa 88 / PDF sayfa 89, 1. soru: PDF görüntüsünde kapanış tırnağı doğru yönlüdür; Poppler dökümündeki tırnak yönü farkı soru block’unda görüntüye göre düzeltildi ve `source_note` ile belirtildi. Ham sayfa dökümü olduğu gibi korundu.
- Görsel düzenleyicilerde yazılabilir boş alanlar kaynakta boş bırakıldı. Bazı çok küçük simge/dekoratif unsurların ayrı ayrı alt betimi yerine ilgili sayfadaki görsel grubu betimlendi.

## Otomatik doğrulama

Tema içi `validate_theme.py` bütün 76 JSON dosyasını ve manifest’i doğrular: JSON parse, sayfa aralığı ve +1 offset, ID tekrarları, referans bütünlüğü, tabloda satır genişliği, sayfa/tema sınırı, kaynak metindeki numaralı istemlerin question/instruction block’larında bulunması ve manifest istatistikleri.

## Belirsiz kalan yerler

- QR kodların hedefleri PDF içinde gömülü olmadığından hedef videoların/transkriptlerin içeriği doğrulanamadı.
- `pdftotext -layout` bazı sayfalarda birden çok sütunu tek metin akışında gösterir. Ham döküm korunmuş, güvenilir biçimde ayrılabilen soru/tablo/metin yapıları ayrı kaydedilmiştir; karışık yerleşimli küçük etiketlerde görsel ayrım sınırlı olabilir.
- Çok küçük dekoratif ikonlar ve şekiller tek tek tanımlanmadı; anlam taşıyan fotoğraflar, QR yönlendirmeleri ve çalışma düzenleyicileri sayfa düzeyinde kaydedildi.

## Olası baskı/yazım hataları

PDF görüntüsünde kesinleşmiş bir baskı/yazım hatası saptanmadı. Kaynak ifadeler sessizce düzeltilmedi; yalnızca PDF görüntüsüne göre metin çıkarım yönü düzeltmesi yukarıda kayda alındı.

## Mevcut rehber verisiyle uyuşmazlıklar

Book Source tamamlandıktan sonra mevcut tema 2 presentation flow dosyaları salt-okunur karşılaştırıldı. Dokuz akışın basılı sayfa aralıkları temanın 84–159 aralığıyla uyumludur. `VERBATIM_SHORT` olarak etiketlenmiş 48 istemin 23’ü, PDF sayfa metninde boşluk ve satır sonu tireleri normalleştirildikten sonra aynen bulundu; 25’i kitap metniyle bire bir aynı değildir. Bulunmayanların bir bölümü kısa özet veya küçük ifade değişiklikleri görünümündedir; aşağıdaki örnekler kaynak PDF ile akış istemi arasındaki metin farkını gösterir:

- `asik-atismasi-flow.json`: akışta “Ozanların ve âşıkların ... sazın yerini ve önemini açıklayınız”; PDF basılı s.136’da “Ozanların / âşıkların ... sazın yerini ve önemini ifade ediniz.” yazıyor.
- Aynı akıştaki “Sen petek misâli Veysel de arı” istemi PDF’de “Sazım’a metninde geçen ... dizesini sanat-sanatçı ilişkisi bağlamında açıklayınız.” biçiminde; akıştaki istem bağlamı kısaltıyor ve “bakımından” diyor.
- `ogulla-bulusma-flow.json`: “Oğulla Buluşma metnini ana olay sırasını koruyarak özetleyiniz” ifadesi PDF’de “Okuduğunuz metni özetleyerek aşağıya yazınız” biçiminde.

Bu farklar mevcut akışlarda bırakıldı. Akışlardan hiçbir metin Book Source’a aktarılmadı; Book Source yalnızca PDF’ye göre oluşturuldu.

## ORTAK ALTYAPI ÖNERİLERİ

- Tüm temalar birleştirilirken `schema_version`, `theme_id`, PDF checksum alanları ve page/block ID kalıpları için tek bir ortak JSON Schema tanımlansın.
- Ortak doğrulayıcı manifest sayfa aralıklarını, çapraz sayfa referanslarını, soru numaralarını, tablo genişliklerini ve tema dışı kayıtları tek komutla denetlesin.
- Dört tema tamamlandığında ortak book index oluşturulsun; PDF kaynak kimliği/checksum’u, tema aralıkları ve bölüm indeksleri tek yerde toplansın. Bu çalışma sırasında shared dosya değiştirilmedi.
- PDF’den çıkarım yapan ortak araca, ham sayfa metnini korurken satır sonu tirelerini ve sütun karışmasını işaretleyen provenance/uyarı alanları eklensin.
