# Kapsam — Öğretmen Rehberi

## 1. Projenin amacı

Bu proje, **11. sınıf Türk Dili ve Edebiyatı** için kişisel kullanıma yönelik, ders kitabıyla birebir ilişkilendirilebilen ve TYMM öğretim programıyla doğrulanan yapılandırılmış bir öğretmen rehberi üretir.

Ana ürün bir “kitap dosyası” değil, farklı istemcilerin tüketebileceği **kanonik öğretmen rehberi veritabanıdır**.

Bu veritabanının ilk iki tüketicisi:

- **ÖğretmenOS**
- **Kindle uyumlu EPUB**

## 2. Birincil kullanıcı

İlk sürümün hedef kullanıcısı tek bir öğretmendir.

Bunun sonucu olarak:

- çok kullanıcılı yetkilendirme
- bulut senkronizasyonu
- kurum yönetimi
- öğrenci hesabı
- yayıncı paneli
- herkese açık içerik portalı

ilk kapsamın dışındadır.

Veri modeli yine de ileride başka sınıflara veya uygulamalara genişletilebilecek kadar düzenli tasarlanacaktır.

## 3. Kaynak hiyerarşisi

### 3.1. Birincil kaynak

**11. sınıf Türk Dili ve Edebiyatı ders kitabı**

Kitaptaki gerçek yapı korunacaktır:

- tema
- bölüm
- metin
- sayfa
- etkinlik
- yönerge
- soru
- tablo / görsel bağlamı
- ölçme-değerlendirme unsurları

Rehber yapısı, kitaba uymayan yapay başlıklar üretmek için kitabın doğal yapısını bozmayacaktır.

### 3.2. Pedagojik ve programatik kaynak

Her temanın **TYMM öğretim programı**.

Program aşağıdaki konularda kullanılır:

- öğrenme çıktısı eşleştirme
- süreç bileşenleri
- beceri / değer / eğilim ilişkileri
- tema amaçlarının doğrulanması
- öğretim etkinliğinin pedagojik bağlamı
- ölçme ve değerlendirme yaklaşımı

### 3.3. Üretilmiş öğretmen içeriği

Kaynaklardan türetilen fakat kaynak metinle karıştırılmaması gereken içerik:

- örnek cevap
- cevap anahtarı niteliğinde beklenen öğeler
- öğretmen açıklaması
- ipucu
- kavram açıklaması
- sınıf içi uygulama önerisi
- takip sorusu
- yanlış anlama uyarısı
- ek örnek
- ders akışı notu

Bu içerikler veri modelinde kaynak bilgisinden açıkça ayrılacaktır.

## 4. Kanonik veri tabanının kapsamı

Her içerik nesnesinde ihtiyaç oldukça aşağıdaki alan sınıfları bulunmalıdır.

### Kimlik

- kararlı `id`
- sınıf
- tema
- bölüm
- içerik türü
- sıra bilgisi

### Kaynak izi

- ders kitabı sayfası
- PDF sayfası gerekirse ayrı
- kaynak başlığı
- etkinlik / soru numarası
- program kaynağı
- kaynak parçasının türü

### Program bağlantısı

- öğrenme çıktıları
- süreç bileşenleri
- ilgili beceri / değer / eğilim
- açıklayıcı eşleştirme notu

### Öğretmen rehberliği

- amaç
- beklenen cevap
- kabul edilebilir cevap bileşenleri
- öğretmen açıklaması
- ipucu
- olası yanlış anlama
- ek örnek
- takip sorusu
- sınıf içi uygulama önerisi
- gerekli ön bilgi
- bağlantılı kavramlar

### Kalite / editoryal durum

- `source_verified`
- `curriculum_verified`
- `needs_teacher_review`
- `confidence`
- `review_notes`
- son güncelleme / içerik sürümü

Alan adları şema tasarım aşamasında kesinleştirilecektir; bu liste kavramsal gereksinimleri tanımlar.

## 5. İçerik birimleri

İlk sürüm en az şu birimleri modelleyebilmelidir:

- `theme`
- `section`
- `text`
- `activity`
- `question`
- `teacher_note`
- `curriculum_link`
- `concept`
- `cross_reference`

Gerekirse tablo, görsel, dinleme/izleme içeriği ve ölçme aracı için yeni içerik tipleri eklenebilir.

## 6. ÖğretmenOS gereksinimleri

Kanonik veriden üretilecek ÖğretmenOS çıktısı en az şu kullanım senaryolarını desteklemelidir:

- tema ve bölüm listesi
- sayfa numarasıyla içeriğe ulaşma
- etkinlik / soru bazlı rehber
- soru cevabını ve öğretmen açıklamasını ayrı gösterme
- TYMM bağlantılarını görüntüleme
- kavram arama
- çapraz bağlantıya gitme
- yalnızca `needs_teacher_review` içerikleri filtreleyebilme
- veri sürümünü görebilme

ÖğretmenOS'a özgü UI durumu kanonik içeriğin içine gömülmemelidir. Gerekirse ayrı export/adaptör katmanı kullanılacaktır.

## 7. EPUB gereksinimleri

EPUB çıktısı:

- EPUB 3 yapısında üretilebilir,
- Kindle'a gönderildiğinde temel navigasyonu korumalıdır,
- JavaScript'e bağımlı olmamalıdır,
- başlık hiyerarşisi düzgün olmalıdır,
- TOC / landmark / iç bağlantılar üretmelidir,
- tema, bölüm, etkinlik ve soru için kararlı anchor kullanmalıdır,
- sayfa ve kavram indeksleri oluşturabilmelidir,
- ilgili soru ↔ açıklama ↔ program bağlantısı arasında hızlı geçiş sağlamalıdır.

“İnteraktif” sözcüğü burada **iç bağlantılar, indeksler, dipnot-benzeri notlar ve geri dönüş navigasyonu** anlamına gelir; Kindle'da güvenilir olmayan web uygulaması davranışları hedeflenmez.

## 8. Kalite gereksinimleri

### 8.1. İzlenebilirlik

Kaynağa dayanan her iddia mümkün olduğunca kaynak konumuna geri bağlanmalıdır.

### 8.2. Kaynak–yorum ayrımı

Ders kitabında veya programda bulunan bilgi ile model tarafından üretilmiş öğretmen açıklaması aynı alan içinde eritilmemelidir.

### 8.3. Tekrarsızlık

Aynı genel açıklamanın çok sayıda soru altında kopyalanması yerine ortak kavram veya öğretmen notlarına referans verilebilmelidir.

### 8.4. Doğallık

Rehber yalnızca terim eşleştiren mekanik bir çıktı olmamalıdır. Öğretmen açısından şu soruya cevap vermelidir:

> “Bu sayfayı / etkinliği / soruyu sınıfta işlerken benim bilmem veya söylemem gereken ne?”

### 8.5. Doğrulama

Şema doğrulaması, kimlik benzersizliği, kırık çapraz bağlantılar ve zorunlu alanlar otomatik test edilmelidir.

## 9. Telif sınırı

Kaynak PDF'ler repoya commit edilmez.

Kanonik veritabanında:

- uzun kaynak pasajlarını gereksiz yere kopyalamamak,
- mümkün olduğunda sayfa / etkinlik / soru referansı kullanmak,
- alıntıyı yalnızca bağlam için gerekli kısa parçalarda tutmak,
- üretilmiş öğretmen açıklamasını kaynak metinden ayırmak

esastır.

Repo public kaldığı sürece bu sınır özellikle önemlidir.

## 10. İlk sürüm kapsamı

### Dahil

- yalnızca **11. sınıf**
- dört tema için ortak veri modeli
- ilk uygulama ve kalite pilotu olarak **1. tema**
- ders kitabı + dört tema programının kaynak envanteri
- JSON Schema
- içerik kimlik standardı
- kaynak izleme standardı
- 1. tema yapılandırılmış rehber içeriği
- doğrulama araçları
- ÖğretmenOS export formatı
- Kindle uyumlu EPUB üreticisi
- temel otomatik kalite testleri

### Kapsam dışında — şimdilik

- 9, 10 ve 12. sınıflar
- öğrenci uygulaması
- öğrenci cevaplarının otomatik puanlanması
- LMS / e-Okul entegrasyonu
- bulut backend
- çoklu öğretmen hesabı
- gerçek zamanlı ortak düzenleme
- yapay zekâ sohbet asistanını EPUB içine gömme
- Kindle JavaScript uygulaması
- ders kitabı PDF'sini veya tam metnini dağıtma
- otomatik olarak doğrulanmış kabul edilen model çıktısı

## 11. Başarı ölçütleri

İlk üretim hattı başarılı sayılırsa:

1. 1. tema kitabın gerçek yapısına göre eksiksiz indekslenmiştir.
2. Her etkinlik ve soru benzersiz, kararlı bir kimliğe sahiptir.
3. Önemli öğretmen rehberliği kaynak ve program bağlantılarıyla izlenebilir durumdadır.
4. Şema doğrulaması hatasız geçer.
5. Kırık iç bağlantı / çapraz referans yoktur.
6. Aynı veri hem ÖğretmenOS'a hem EPUB'a dönüştürülebilir.
7. EPUB Kindle üzerinde rahat gezinilebilir durumdadır.
8. Öğretmen rehberi tekrar eden genel cümlelerden ziyade soru ve bağlama özgü değer üretir.
9. Belirsiz veya öğretmen kararı gerektiren kayıtlar açık biçimde işaretlenmiştir.
10. 2–4. temalara geçiş için veri modeli yeniden tasarlanmak zorunda kalmaz.

## 12. Kapsam değişikliği ilkesi

Yeni bir ihtiyaç ortaya çıktığında önce şu ayrım yapılır:

- **kanonik veriye ait mi?**
- **ÖğretmenOS sunumuna mı ait?**
- **EPUB sunumuna mı ait?**
- **build / doğrulama aracına mı ait?**

Sunum katmanına özgü bir ihtiyaç mümkün olduğunca kanonik veri modelini kirletmemelidir.
