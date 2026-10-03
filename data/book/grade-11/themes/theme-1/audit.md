# 1. Tema Book Source denetimi

## Kapsam ve kaynak

- İşlenen tema: 1. TEMA: BİR DİYECEĞİM VAR!
- Basılı sayfalar: 12–83 (72 sayfa)
- PDF görüntü sayfaları: 13–84 (72 sayfa)
- Kaynak: kullanıcı tarafından sağlanan 2026 MEB 11. sınıf ders kitabı PDF'si.
- PDF SHA-256: 87248cb5f6940c29b7d152fab5cb1f7b800e4d5ddc46ac4cdeb5542f0361a1ba.
- Sayfa offseti, PDF altlığındaki basılı sayfa numaralarıyla doğrulandı: basılı 12, PDF 13; basılı 83, PDF 84. PDF 85'te basılı 84 ve 2. Tema başlıyor.
- Repodaki teacher-book, lesson ve presentation içerikleri metin kanıtı olarak kullanılmadı; kayıtlar PDF'den çıkarıldı.

## Üretilen kayıtlar

- Sayfa JSON'u: 72
- Toplam block: 555
- Soru: 116
- Tablo/form: 41
- Etkinlik: 73
- Yönerge: 146
- Görsel/şema: 40

### Block türü sayıları

- activity: 73
- dialogue: 16
- example: 2
- heading: 30
- info_box: 7
- instruction: 146
- literary_text: 18
- poem: 3
- question: 116
- quote: 3
- subheading: 60
- table: 41
- visual: 40

## Kalite denetimi

- Tema içindeki 72 sayfanın metin katmanı çıkarıldı; her sayfanın metni JSON'da text_layer alanında korundu.
- Temanın 72 sayfası altı görsel temas sayfasında tarandı. Metin ve sayfa geçişleri PDF'nin seçilebilir metin katmanından sayfa sayfa kontrol edildi.
- Sorular, numaralı yönergeler, kaynak metinler, tablolar/formlar ve etkinlikler ayrı kayıtlara ayrıldı; etkinlik ilişkileri ve soru kaynak metinleri ID'lerle bağlandı.
- Otomatik kontroller: 72 sayfa JSON’u ve manifest parse edildi; basılı/PDF sayfa eşlemesi, tema kimlikleri, dosya listesi, 555 block ID tekilliği, bütün ID referansları ve 41 tablodaki satır/sütun tutarlılığı kontrol edildi. Metin katmanındaki 183 numaralı soru/yönerge başlangıcının her biri sayfa düzeyinde bir question veya instruction kaydıyla temsil ediliyor. Sonuç: BAŞARILI.
- PDF metin katmanındaki karakter eşlemeleri, sayfa görüntüsünde doğrulandığında düzeltildi: basılı 20’de “II. HANIM”; basılı 26’da “Karagöz’ün” ve “sürc-i”; basılı 30’da “eleştiriniz” yerine görüntüdeki “eşleştiriniz”. Düzeltmeler ilgili sayfa JSON’unda extraction_notes alanında kayıtlıdır.
- Güvenle doğrulanabilen baskı/yazım hatası tespit edilmedi. Basılı 74’teki “unutduğum”, “gitdi”, “demişdim” ve “gazetada” biçimleri etkinlikte dönemsel yazım örnekleri olarak verilir; kaynak aynen korunmuştur.
- Karekodla açılan video, ses, sözlük ve e-içerik hedefleri PDF’de bulunmadığından çözülmedi. Yalnızca sayfada görünen kod, etiket ve yönerge kaydedildi; dış medya içeriği eklenmedi.
- Boş öğrenci yanıt alanları boş bırakıldı; kitap adına cevap eklenmedi.

## Belirsiz kalan yerler ve okunması zor alanlar

- Basılı 25. sayfada metin katmanı QR açıklamasını 1. ve 2. sorunun arasına yerleştiriyor; görüntüye göre soru metinleri ayrıldı ve QR açıklaması ayrı visual kaydına alındı. Ham `text_layer` özgün çıkarım sırasını koruyor.
- Basılı 30. sayfada eşleştirme seçenek bankası beş tanımın üzerinde ayrı duruyor. Görüntüden a: Karagöz, b: Köy Seyirlik Oyunları, c: Kukla, ç: Meddah olarak doğrulandı; boş yanıt hücreleri seçeneklerle eşleştirilmedi.
- Görsel olarak okunup yapısal kaydı yapılamayan bir basılı alan kalmadı. Çözülmemiş tek içerik, PDF dışındaki karekod hedefleridir.

## Olası baskı/yazım hataları

- Görsel denetimde doğrulanmış bir kitap baskı hatası bulunmadı. PDF metin katmanındaki eşleme kusurları yukarıda belirtilen sayfalarda kaynak görseline göre düzeltildi.

## QR ve görsel kayıtları

- Görsel denetiminde bulunan karekodlar, sayfa üstündeki görseller, kelime duvarı zarfları, kavram haritaları, yanıt formları ve e-posta taslağı ilgili sayfa bloklarında ayrı visual/table kayıtları olarak temsil edildi.
- Karekod hedefi PDF'de bulunmayan video, ses, sözlük veya ek çalışma sayfaları açılmadı; basılı etiket ve görünen kod kaydedildi.

## Mevcut rehber verisiyle uyuşmazlıklar

Bu görevde mevcut lesson/presentation/teacher-book verileriyle karşılaştırma yapılmadı. Book Source kayıtları yalnızca PDF'ye dayanır.

## ORTAK ALTYAPI ÖNERİLERİ

- Entegrasyon oturumunda ortak bir JSON Schema tanımlanması; text_layer, blocks, source, continuation, related_text_ids, subquestions, options, rows ve görsel alanlarının türlerinin sabitlenmesi yararlı olur.
- Tema manifestleri birleştirilirken PDF SHA-256, basılı/PDF offseti ve sayfa dosyası aralıkları ortak kitap manifestine eklenebilir.
- QR/e-içerik için basılı başlık ile dış medyanın çözülme durumunu ayıran ortak bir alan kullanılabilir.

## Kapsam

- Başka temalara ait dosya değiştirildi: HAYIR.
- Shared/ortak dosya değiştirildi: HAYIR.
