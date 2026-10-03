# Tema 3 Book Source denetimi

## Kapsam ve kaynak

- İşlenen tema: 11. sınıf Türk Dili ve Edebiyatı, 3. Tema — **Yaşamın İzinde**.
- Basılı sayfa aralığı: **160–235**.
- PDF sayfa aralığı: **161–236**. Tema başlangıcında ve Tema 4 başlangıcında kontrol edilen fark: `pdf_page = printed_page + 1`.
- Kaynak: `Edebiyat 11 ders kitabı.pdf`; SHA-256: `87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba`.
- Yalnızca PDF kullanıldı. Öğretmen rehberi, lesson, presentation veya internet içeriği Book Source kanıtı olarak kullanılmadı.

## Üretilen veri

- Sayfa JSON'u: **76** (`p160.json`–`p235.json`).
- Toplam block: **809**.
- Soru block'u: **176**.
- Tablo: **23**.
- Etkinlik ilişki kaydı: **57**.
- Yönerge: **27**.
- Görsel kaydı: **53**.
- Diğer block türleri arasında 91 heading, 311 paragraph, 40 literary_text, 14 author_info, 6 poem, 5 quote, 2 dialogue ve 2 info_box bulunuyor.
- Tema manifesti: `manifest.json`.

## PDF ile kalite kontrolü

- Temanın 76 PDF sayfası `pdftotext -layout` ile ayrı ayrı çıkarıldı; JSON'lardaki tam sayfa `transcription` alanı her sayfanın çıkarımıyla birebir eşleşiyor (**76/76**).
- Sayfa görüntüleri tema boyunca tarandı. Soru yönergeleri ve numaraları, tablo başlıkları/satırları/sütunları, bölüm başlıkları, etkinlikler ve sayfa geçişleri PDF görünümü ve metin katmanı ile kontrol edildi; çok sütunlu ve yoğun tablo içeren sayfalar ayrıca tam boyutta incelendi.
- PDF'nin metin katmanında sayfa yerleşimi nedeniyle iki soru satırı bozuluyordu. Basılı sayfa 203 soru 2 ile yanındaki “Bilgi Köşesi” ve basılı sayfa 214 soru 4 görselden doğrulandı; JSON'da ayrı tutuldu ve `source_note` eklendi.
- Basılı sayfa 187–188'de devam eden soru 3'ün sayfalar arası bağlantısı kaydedildi.
- QR kodların hedefindeki PDF dışı medya açılmadı ve içeriği tahmin edilmedi. Örneğin s.216'daki *Direnişin Ustaları*, s.220'deki *Osmancık* videosu ve s.234'teki *Aile Bağları* videosu için yalnızca basılı yönlendirme/karekod kaydedildi.

## Otomatik doğrulama

- 76 sayfa JSON'u ve manifest parse edildi.
- Basılı/PDF sayfa aralıkları kesintisiz ve beklenen +1 farkla eşleşiyor.
- 809 block ID benzersiz; bütün yerel yönerge, soru, tablo, metin ve görsel referansları çözümleniyor.
- Manifestte listelenen 76 sayfa dosyasının tamamı mevcut; manifest istatistikleri JSON'lardan sayılan değerlerle eşleşiyor.
- 23 tablonun her satırında sütun sayısı tutarlı.
- Her sayfa ve block kimliği `theme-3` kapsamına ait; başka tema kimliği yok.
- PDF SHA-256 değeri kaynak kaydıyla eşleşiyor.
- Soru metni eşleştirmesinde metin katmanının okuma sırası nedeniyle farklı görünen iki kayıt görsel kontrolle doğrulandı; ikisinde de `source_note` var.
- LLM tarafından üretilmiş cevap eklenmedi.

## Belirsizlikler ve olası baskı/yazım hataları

- QR kod hedeflerindeki çevrim içi/video içeriği bu PDF'de bulunmadığı için incelenmedi; bu içerikler JSON kapsamına dahil değil.
- PDF'de teyit edilmiş bir baskı/yazım hatası belirlenmedi.
- Mevcut öğretmen rehberi/presentation verisiyle karşılaştırma yapılmadı; Book Source bağımsız biçimde PDF'den oluşturuldu.

## ORTAK ALTYAPI ÖNERİLERİ

- Tema manifestleri birleştirilirken sayfa dosyası kapsamını, PDF/basılı sayfa offset'ini, ID benzersizliğini, referansları ve tablo sütun tutarlılığını denetleyen ortak bir doğrulayıcı kullanılabilir.
- Ortak Book Source şemasında PDF özeti (hash), extraction yöntemi, kaynak satır aralığı ve `source_note` alanları standartlaştırılabilir.
- Çok sütunlu sayfalardaki PDF metin katmanı okuma sırası farklılıkları için kaynak görüntüsüne dayalı istisna kaydı ortak şemada desteklenebilir.

Bu öneriler bu görevde uygulanmadı. Dosya değişiklikleri yalnızca `data/book/grade-11/themes/theme-3/` altında yapıldı.
