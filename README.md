# Öğretmen Rehberi

11. sınıf Türk Dili ve Edebiyatı dersi için, **ders kitabını ana kaynak** ve **Türkiye Yüzyılı Maarif Modeli (TYMM) öğretim programını pedagojik çerçeve** kabul eden kişisel öğretmen rehberi projesi.

Bu repo tek bir içerik kaynağından üç farklı tüketici/çıktı üretmeyi hedefler:

1. **ÖğretmenOS veri kaynağı** — ders sırasında hızlı arama, etkinlik/soru bazlı rehberlik ve yapılandırılmış öğretmen notları.
2. **Kindle uyumlu EPUB** — çevrimdışı okunabilen, içerik tablosu, iç bağlantılar, geri dönüş bağlantıları ve çapraz referanslarla kitap gibi kullanılabilen rehber.
3. **Ders Modu / Lesson Player** — sınıfta tam ekran ilerleyen; soru, yönlendirme, cevap, kanıt ve açıklamayı kontrollü biçimde açan ders yürütme arayüzü.

> Bu çalışma öğrenci ders kitabının yerine geçmez. Amaç; kitabın sayfa, metin, etkinlik ve sorularını öğretmen açısından anlamlandırmak, ders akışını hızlandırmak ve TYMM bağlantılarını görünür kılmaktır.

## Kaynaklar

Projenin başlangıç kaynakları Google Drive'da tutulur ve telifli PDF dosyaları repoya kopyalanmaz.

- **11. Sınıf Türk Dili ve Edebiyatı Ders Kitabı**
- **1. Tema — Bir Diyeceğim Var!**
- **2. Tema — Kültür Yolculuğu**
- **3. Tema — Yaşamın İzinde**
- **4. Tema — Hayatın Aynası**

Kaynak klasörü:

https://drive.google.com/drive/folders/1EDtxXnTOdKjp7BlSJVCVbs7HHEEK07LO

## Temel ilke: tek kaynak, çok çıktı

Projenin merkezinde sunuma özel Markdown, PPTX veya EPUB sayfaları değil, **sürüm kontrollü kanonik bir rehber veritabanı** bulunacaktır.

```text
Ders kitabı PDF
       +
TYMM tema programları
       |
       v
Kaynak çıkarımı / doğrulama
       |
       v
Kanonik Rehber Veritabanı
       |
       +----------------------+----------------------+
       |                      |                      |
       v                      v                      v
ÖğretmenOS               Kindle EPUB          Ders Modu
       |                      |                      |
arama / filtre           kitap görünümü /      sınıf içi akış /
ders içi kullanım        iç bağlantılar        kontrollü reveal
```

Böylece bir sorunun cevabı, öğretmen notu veya kazanım bağlantısı yalnızca **bir yerde** düzenlenir; ÖğretmenOS, EPUB ve Ders Modu aynı veriyi tüketir.

## Ders Modu / Lesson Player

İlk pilot **11. sınıf 1. Tema — Karagöz / Yazıcı, basılı s.15–35** kapsamındadır.

Uygulama:

- `source-index.json` ile kitabın gerçek sırasını,
- `answer-bank/*.json` ile cevap/yönlendirme/açıklama/kanıt katmanlarını,
- `data/grade-11/presentation/.../karagoz-flow.json` ile sunum davranışını

birleştirir.

Amaç, öğretmenin ders sırasında EPUB'a dönmeden ilerleyebilmesidir. Ayrıntılı mimari ve fazlar için [LESSON_PLAYER_PLAN.md](docs/LESSON_PLAYER_PLAN.md) belgesine bakın.

## Rehberde bulunacak içerik

Her tema, bölüm, metin, etkinlik ve soru mümkün olduğunca aşağıdaki öğretmen katmanlarıyla zenginleştirilir:

- kitap sayfası ve kaynak konumu
- tema / bölüm / metin / etkinlik / soru kimliği
- TYMM öğrenme çıktısı ve ilgili program bağlantısı
- soruya uygun, sınıfta doğrudan kullanılabilir cevap
- yalnız gerektiğinde öğretmen yönlendirmesi
- yalnız gerektiğinde kısa açıklama
- metne dayanması yararlıysa kısa kanıt alıntıları
- konuşma/yazma gibi üretim görevlerinde örnek plan veya örnek ürün
- QR/video gibi görülmeyen kaynaklarda açık kaynak sınırlaması
- kısa ders notu / öğretmen uyarısı
- ilişkili başka sayfa, metin veya kavrama çapraz bağlantı
- kaynak güveni ve öğretmen doğrulama durumu

Amaç yalnızca “sorunun cevabını vermek” değil; **öğretmenin o sayfayı nasıl işleyeceğini de rehberlemek**tir.

## Veri mimarisi

İlk hedef JSON tabanlı, insan tarafından okunabilir ve Git ile sürümlenebilir bir veri modelidir.

Planlanan üst düzey yapı:

```text
grade
└── theme
    ├── metadata
    ├── curriculum_links
    └── sections
        └── section
            ├── source_pages
            ├── texts
            ├── activities
            │   └── questions
            │       ├── answer
            │       ├── guidance
            │       ├── explanation
            │       └── evidence_quotes
            └── teacher_notes
```

Her kayıtta kararlı bir `id` bulunur. Sayfa numarası veya başlık değişse bile tüketici bağlantılarının mümkün olduğunca bozulmaması hedeflenir.

## Kindle yaklaşımı

Kindle, genel amaçlı bir web tarayıcısı gibi EPUB içi JavaScript etkileşimine güvenilir biçimde dayanmaz. Bu nedenle “interaktif” çıktı şu özelliklerle tasarlanır:

- güçlü içindekiler yapısı
- tema → bölüm → etkinlik → soru navigasyonu
- kitap sayfasına göre indeks
- kavram ve öğrenme çıktısı çapraz bağlantıları
- “soruya dön / bölüme dön” bağlantıları
- dipnotlar ve açılır bilgi yerine Kindle uyumlu bağlantılı not sayfaları
- hızlı gezinme için kısa, düzenli başlıklar

EPUB, kanonik veritabanından **üretilen bir çıktı** olacaktır; elle düzenlenen ana veri kaynağı olmayacaktır.

## Üretim standartları

- [Cevap bankası kalite standardı](docs/ANSWER_BANK_QUALITY_STANDARD.md)
- [Blok bazlı rehber üretim standardı](docs/BLOCK_AUTHORING_STANDARD.md)
- [Ders Modu uygulama planı](docs/LESSON_PLAYER_PLAN.md)

Tema 1 ve Tema 2 üretiminde doğrulanan **Anlama/Okuma, Konuşma, Dinleme-İzleme, Yazma ve Ölçme-Değerlendirme** farkları bu belgelerde kalıcılaştırılmıştır.

## Kalite ilkeleri

- **Ders kitabı ana kaynak**, öğretim programı pedagojik doğrulama katmanıdır.
- Kaynakta bulunmayan bilgi kaynakta varmış gibi gösterilmez.
- Metin extraction'ında kaybolabilecek alt çizgi, renk, görsel ve tablo yerleşimi gerçek sayfa üzerinden doğrulanır; doğrulanamıyorsa tahmin edilmez.
- Araştırma, gezi ve kişisel deneyim görevlerinde öğrencinin yerine sahte sonuç veya yaşanmışlık üretilmez.
- Doğrudan kaynak bilgisi ile öğretmen için üretilmiş açıklama ayrılır.
- Her önemli kayıt kaynak sayfasına / program bölümüne geri izlenebilir olmalıdır.
- Belirsiz içerik açık bir durumla işaretlenir.
- Otomatik üretim, doğrulama yapılmadan “kesin” kabul edilmez.
- Aynı açıklamanın farklı başlıklarda gereksiz tekrarından kaçınılır.
- Şema doğrulaması ve içerik kalite testleri otomatikleştirilir.
- Uzun telifli metinler veya kaynak PDF'ler repoya kopyalanmaz.
- Ders Modu build'i, ilgili source-index ve answer-bank kapsamı eksikse başarısız olmalıdır.

## Sürümleme

Veri modeli bağımsız sürümlenir:

```json
{
  "schema_version": "0.1.0",
  "content_version": "0.1.0"
}
```

Kırıcı şema değişikliklerinde migrasyon tanımlanması hedeflenir. Tüketiciler destekledikleri şema sürümünü açıkça belirtir.

## Mevcut kalite temeli

İlk kalite eşiği 11. sınıf 1. temada kurulmuş, 2. temada farklı okuma, konuşma, dinleme/izleme, yazma, araştırma ve ölçme görevleriyle ikinci kez sınanmıştır. Bu iki temadan çıkarılan kurallar artık sınıf numarasına bağlı değildir; 11. sınıfın kalan temalarında ve daha sonra hazırlanacak diğer sınıf seviyelerinde aynı standart kullanılacaktır.

Ayrıntılı sınırlar için [SCOPE.md](SCOPE.md), aşamalar için [ROADMAP.md](ROADMAP.md) dosyasına bakın.

## Telif ve görünürlük notu

Bu repo şu anda GitHub üzerinde **public** durumdadır. Kaynak ders kitabı ve program PDF'leri repoya eklenmemelidir. İleride veritabanına kaynaktan uzun alıntılar veya kamuya açık paylaşılması istenmeyen öğretmen içerikleri eklenecekse, içerik commit edilmeden önce repo görünürlüğünün private yapılması değerlendirilmelidir.
