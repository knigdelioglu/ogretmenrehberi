# 4. Tema Book Source Denetimi

## Kapsam

- Sınıf: 11
- Tema: 4 — **Hayatın Aynası**
- Basılı sayfalar: **236–307** (72 sayfa)
- PDF görüntü sayfaları: **237–308** (72 sayfa)
- Doğrulanmış eşleme: `pdf_page = printed_page + 1`
- Kaynak PDF: `Edebiyat 11 ders kitabı.pdf` (313 PDF sayfası)

Tema başlangıcı, kitapta basılı 236 numaralı açılış sayfasında; tema bitişi basılı 307 numaralı değerlendirme sayfasındadır. Bir sonraki PDF sayfasında kaynakça başlar.

## Üretilen kayıtlar

- Sayfa JSON'u: **72** (`pages/p236.json`–`pages/p307.json`)
- Manifest: **1** (`manifest.json`)
- Toplam blok: **649**
- Soru: **149**
- Tablo: **29**
- Etkinlik: **90**
- Görsel kaydı: **64**
- Edebî metin bloğu: **16**
- Blok türlerine göre: heading 8, subheading 75, paragraph 1, literary_text 16, quote 4, dialogue 64, instruction 101, question 149, activity 90, table 29, list 1, info_box 4, visual 64, other 43.

Her sayfa kaydı basılı ve PDF sayfa numarasını ayrı tutar ve `page_text` alanında o sayfanın çıkarılmış metnini saklar. Ayrı bloklar soru/yönerge/etkinlik ilişkilerini, tabloları, görülebilir görselleri, seçilmiş alıntı ve edebî metinleri, oyun diyaloglarını ve devam ilişkilerini temsil eder. Tablolarda boş öğrenci yanıt hücreleri boş bırakılmıştır; kitapta basılı örnek hücreler korunmuştur.

## PDF kalite denetimi

- 72 sayfanın tamamı PDF'den çıkarılan metin ve sayfa görüntüleriyle kapsam içinde gözden geçirildi; sayfa aralığı ve basılı/PDF numara farkı tüm sayfalar için kontrol edildi.
- Bütün numaralı soru kayıtları, yönergeler, 29 tablo, tema/bölüm başlıkları ve edebî metin geçişleri kaynak sayfalarla karşılaştırıldı.
- P251–P252'de karakter tablosu ve 2. sorunun alt maddeleri sayfa devamı olarak işaretlendi.
- P243–P247'de *Ben, Mimar Sinan* tiyatro metninin konuşmacı replikleri; P253–P254'te *Cimri* replikleri ve P306'daki değerlendirme oyunu diyalogları konuşmacı alanlarıyla ayrıldı.
- P274'te üç grubun görevleri ve 11 soru, kaynak tablodaki üç sütunlu yapı korunarak kaydedildi.
- P307'de 11. soru tabloya bağlandı; 13 ve 14. soruların karekodla erişilen çok modlu metne bağlı yönergesi ayrı blok olarak 13–14. sorulara bağlandı.
- Kaynakta olası bir baskı/yazım hatası kesin olarak saptanmadı; metin sessizce düzeltilmedi.

## Belirsiz veya erişilemeyen içerik

- PDF sayfalarında yer alan karekodların yönlendirdiği video/ses/çok modlu içerikler açılmadı ve Book Source'a aktarılmadı. Bu nedenle yalnızca basılı sayfada görünen karekod açıklaması ve yönerge kaydedildi.
- PDF metin çıkarımındaki satır sonları ve basılı heceleme/tire işaretleri `page_text` içinde kaynak düzenine yakın biçimde korunur. Bazı uzun yönerge ve paragraf bloklarında satır sonları bulunabilir.
- Görsel açıklamaları yalnızca sayfada görülebilen unsurları kaydeder; görünmeyen görsel içerik veya pedagojik sonuç eklenmedi.

## Otomatik doğrulama

`python3 validate.py` sonucu: **PASS**.

- 72 sayfa JSON'u parse edildi; p236–p307 dosya kümesi ve manifest listesi eşleşti.
- Basılı/PDF sayfa aralığı ve `+1` eşlemesi kontrol edildi.
- 649 blok ID'sinin benzersiz ve tema kapsamına uygun olduğu doğrulandı.
- Bildirilen tüm yönerge, soru, tablo, metin ve devam ID'leri çözüldü.
- 149 sorunun numarası kaynak sayfa metninde bulundu; p252'de önceki sayfadan devam eden soru istisnası açıkça işaretlendi.
- 29 tablonun satır/sütun sayıları tutarlı; manifest istatistikleri bloklarla aynı.
- Cevap alanı veya başka temaya ait kimlik tespit edilmedi.

## Mevcut rehber verisiyle uyuşmazlıklar

Mevcut öğretmen rehberi, lesson ve presentation JSON'larıyla karşılaştırma yapılmadı. Bu katman PDF'den bağımsız olarak çıkarıldı.

## ORTAK ALTYAPI ÖNERİLERİ

- Tema klasörlerindeki bağımsız manifestleri daha sonra birleştirecek ortak bir indeks ve sürümlenmiş şema belirlenebilir; bu tema çalışmasında ortak dosya değiştirilmedi.
- Sayfa eşlemesi, blok referansları, tablo boyutları ve kapsam sınırlarını denetleyen tema-bağımsız bir doğrulayıcı entegrasyon aşamasında ortaklaştırılabilir.
- Yeni tema paketleri entegre edilmeden önce kaynak PDF lisansı ve uzun alıntı içeren verilerin depo dağıtım koşulları ortak düzeyde gözden geçirilebilir.
