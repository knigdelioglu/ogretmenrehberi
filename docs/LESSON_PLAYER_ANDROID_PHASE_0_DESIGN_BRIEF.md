# Lesson Player Android — Faz 0 görsel tasarım brifi

**Durum:** Android 16 native Jetpack Compose tasarım şartnamesi; wireframe ya da çalışan uygulama değildir.
**Kapsam:** Yalnız Android tablet. Masaüstü web arayüzü aynen küçültülüp taklit edilmeyecek.
**İlgili sözleşme:** [Faz 0 ürün ve durum sözleşmesi](LESSON_PLAYER_ANDROID_PHASE_0_CONTRACT.md).

## 1. Ürün hissi

Lesson Player bir “sunum slaytı üreticisi” ya da “form ekranı” değildir:
öğretmenin metni okuttuğu, soru yönelttiği, gerektiğinde yönlendirdiği ve
doğru anda cevabı açtığı **sınıf yürütme aracı**.
Kullanıcının Tauri/web kabuğunda beğenmediği eski görünüme düşmemek
için Compose şablonunu kurmak tasarımın tamamlandığı anlamına gelmez.

**İlke:** ders içeriği daima birincil; araçlar ikincil; öğretmen bilgisi
bilinçli açılmadıkça öğrenci/sunum yüzeyine taşınmaz.

## 2. Ekranların görsel hiyerarşisi

**Ders kitaplığı**
- Üstte devam et: en son dersin adı, tema, basılı sayfa, adım konumu.
- Ardından dört tema; her temada dersler ve sayfa aralığı.
- Kalabalık tek dropdown değil; öğretmenin dersin yerini ayırt
  edebileceği taranabilir liste/arama. Tema kimliği sabit.
- Boş/kayıt yok/bozuk veri durumu görünür ve kurtarma eylemi açık.

**Ders ekranı — öğretmen**
- Kaynak bağlamı ve basılı kitap sayfası düşük ağırlıklı üst meta.
- Soru/görev en büyük görsel odak. Altında varsa etkinlik maddeleri,
  yapılandırılmış alanlar, kısa kanıt ve açıklama.
- Yönlendirme ve cevap iki **ayrı isimli**, erişilebilir kontroldür.
  Soru cevapla aynı alanda yer değiştirir; geri tıklayınca soru döner.
- Kanıt/açıklama/note kademeli açılır; kaynak sınırlı cevap
  diğer cevaplarla aynı kesinlik diliyle çizilmez.
- Sabit önceki/sonraki hem yatay hem dikey düzenin görünür sınırında.
- “Şimdiki soru”yu kaybetmeyecek tek ana scroll yüzeyi.

**Ders ekranı — sınıf sunumu**
- Daha büyük soru, daha az chrome, içerik/hiyerarşi korunur.
- Öğretmen notu, rehber kontrol işaretleri ve edit eylemleri yoktur.
- Dikey dar pencerede rehber/yan panel üst üste binmez;
  sunumdan çıkış belirgin ve Android Geri ile tutarlı.

**Öğretmen rehberi**
- Dört temalık gezinme, açık dersin teması ayrıca işaretli.
- Üç hat net ayrılır: Edebiyat Atölyesi / 4 eser + 1 film /
  portfolyo-değerlendirme. İlerleme sayaçları her hat özelinde.
- Sunum haftası alanında “ÖNERİ” etiketi korunur.
- İşaretler sınıf/öğrenci teslimi diye görselleştirilmez.

**Düzenleme**
- Mevcut adımın anlık önizlemesi ve bağlama özgü düzenleyici.
- Basılı kaynak ve answer-bank provenance küçük ama ulaşılabilir.
- Reset kapsamı açıkça “bu adım” / “bu dersin sunum ayarları”.
- Uzun içerik klavye açılınca kontrollere erişimi kapatmaz.

## 3. Responsive/adaptive sözleşmesi

- İki düzen, **kullanılabilir pencere genişliği** ve içerik ölçüsüne
  göre seçilir. Fiziksel cihaz, yalnız yön bilgisi veya sabit
  ekran çözünürlüğü şart değildir.
- Geniş alanda içerik + bağımsız ders listesi; dar alanda içerik
  tek sütun + navigasyon paneli.
- Split-screen ve font büyütme altında ikinci sütun gerektiğinde
  kapanır; içerik genişliği minimum okunabilirliğe düşürülmez.
- Sistem bar/gesture inset ve IME için gerçek Compose insets
  kullanılır. Alt gezinme klavye/sistem çubuğunun arkasında kalmaz.
- Uzun Türkçe kelimeler, alıntılar, paragraf ve değerlendirme
  tablolarında yatay taşma kabul edilmez; anlamlı responsive düzen.
- Dokunma hedefi **tasarım hedefi yaklaşık en az 48 dp**,
  TalkBack etiketi ve açık/kapalı anlamını bildiren durum.
- Koyu/açık tema desteklenebilir; her iki modda kaynak sınırı,
  yönlendirme ve cevap yalnız renkle ayırt edilmez.

## 4. Tasarım sistemi için Faz 1'de belirlenecek tokenlar

`ColorScheme` (yüzey/katman/içerik/odak/uyarı),
`Typography` (sunum sorusu, ders soru metni, meta,
rehber açıklaması), `Spacing`, `Shape`, `Elevation`,
`Motion` ve `TouchTarget`.
Belirli hex/font/animasyon rakamları Faz 0'da onaylı ekran
çalışması yapılmadan keyfi “nihai tasarım” diye sabitlenmez.
Faz 1'de açık/koyu örnek ve dört temel ekranın gerçek
Compose önizlemeleri hazırlanır. Faz 4'te gerçek tablet
gözden geçirmesi yapılır.

## 5. Bileşen kabul örnekleri

- `s25-q1`: kelime kartlarında “önce tahmin” ile gösterilen
  gerçek anlam ayrı; toplu cevap açıkken tekil toggle disabled.
- `s26-reference`: başlıklı dört bilgi kartı + yalnız
  öğretmende not; sunumda sızıntı yok.
- `s30-q6`: numaralı yapı alanları uzun Türkçe metinde taşmaz.
- `s35-q1`: ölçme/değerlendirme alanı soru ile cevap
  değiştiğinde yerini mantıklı korur.
- `s266-vocabulary`: adında “vocabulary” var diye vocab
  renderer seçilmez; gerçek `layout=structure` kullanılır.
- Dinleme/izleme QR görevi: medya APK'ya gömülmemişse
  “internet olmadan da video var” izlenimi yaratılmaz.

## 6. Tasarımın faz kapısı

Faz 1: özgün tokenlar ve 4 ekran önizlemesi; Android 16
inset / predictive back / erişilebilir touch target temeli.
Faz 4: tüm layout ve tablet varyantları; soru-cevap
swap, yönlendirme, rehber geçişleri ve sınıf sunumu.
Faz 7: Galaxy Tab A11 Plus üzerinde gerçek kullanım ve
performans/erişilebilirlik gözden geçirmesi.
