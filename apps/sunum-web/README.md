# Sunum Web

Sınıfta öğrencilere gösterilen, **yalnız öğretmenin kullandığı** ders sunumu. GitHub Pages veya Netlify'da yayımlanır; sunum kumandasıyla slayt gibi ileri–geri yönetilir.

- İçerik: `data/grade-11/presentation/theme-*/*-flow.json` ders akışları + kanonik `source-index` / `answer-bank` verisi (Lesson Player'ın veri üreticisiyle aynı kaynak). Her ders: **kapak → adım slaytları → ders sonu**.
- Öğretmen notları (`content.note`) sunum verisine hiç girmez.
- Harici npm bağımlılığı yoktur; build yalnız Node ile çalışır.

## Kumanda ve klavye

| Tuş | Ne yapar |
|---|---|
| İleri · → · ↓ · PageDown · Boşluk · Enter | Aynı görevin sonraki sunum parçasına, varsa **Düşünürken…** katmanına, ardından **cevap** ve **metinden kanıt** ekranlarına geçer. Katmanlar ayrı görünür; uzun bir parça taşarsa önce aşağı kaydırır. Hepsi tamamlanınca sonraki slayt; ders sonundan sonra sıradaki ders. |
| Geri · ← · ↑ · PageUp | Aynı görevin önceki sunum parçasına veya katmanına döner; yoksa önceki slayta geçer. |
| Shift + → / ← | Katmanları atlayıp doğrudan slayt değiştirir. |
| Y · A | Öğretmen **yönlendirmesini** · **açıklamayı** göster / gizle (kumanda sırasına varsayılan olarak girmez). |
| B veya . · W veya , | Siyah ekran · beyaz ekran (kumandaların "karart" tuşu). |
| F · F5 | Tam ekran (kumandaların "sunumu başlat" tuşu sayfayı yenilemez). |
| M | Tema / ders / slayt menüsü |
| Rakam + Enter | O numaralı slayta git (0 = kapak) |
| Home · End | Dersin başı · sonu |
| T | Açık / koyu görünüm |

Akıllı tahtada ekranın sağ/sol kenarına dokunmak veya yana kaydırmak da ileri/geri yapar. Menüdeki **"Kumanda yönlendirme ve açıklamayı da açsın"** seçeneği işaretlenirse kumanda sırası kanonik `reveal_order` (yönlendirme → cevap → kanıt → açıklama) olur.

Yoğun içerikler bilgileri değiştirmeden birkaç sunum parçasına ayrılır. Metin, yansıtılan ekranda en az 24 CSS piksel (yaklaşık 18 punto) olacak ölçekte tutulur; tek başına sığmayan uzun bir parça kaydırılabilir.

Son konum hem tarayıcıda hem adres çubuğunda (`#/karagoz/23/1` = ders / slayt / açık katman; son `/2` varsa parçayı belirtir) tutulur; bu bağlantı yer imi olarak kullanılabilir.

## Rubrik ve akran değerlendirme dosyaları

Kitabın 13 QR bağlantılı değerlendirme kaynağı ilgili dersin menüsünde ve kaynak sayfasına ait görev slaytlarında **Değerlendirme formları** bölümünde bulunur. **EBA form kaynağını aç** veya **Kitaptaki karekodu aç** ile resmî dosyayı edindikten sonra **Dosya ekle** üzerinden PDF, PNG veya JPEG seçin (en fazla 20 MB). **Formu indir**, seçtiğiniz dosyanın aynısını indirir; **Sunumda göster** sunum penceresinde formu açar. **Sunuma dön** veya Escape mevcut slayta geri getirir. PDF sayfaları ve yakınlaştırma tarayıcının PDF görüntüleyicisiyle yönetilir.

Dosyalar yalnız aynı cihaz ve tarayıcının IndexedDB deposunda saklanır; sunucuya gönderilmez. Sayfa yenilendiğinde korunur ve dosya eklendikten sonra ağ gerektirmez. Tarayıcı/site verileri temizlenirse dosyaları yeniden eklemek gerekir. Başka cihazlara aktarılmaz; **Bu cihazda şifreyi unut** dosyaları silmez. İçerik doğrulanmış sayılmaz; doğru resmî form dosyasını seçme sorumluluğu öğretmendedir.

Resmî QR form dosyaları uygulamayla birlikte verilmez; EBA oturumu/erişimi gerekebilir. Belirsiz QR hedefleri doğru kaynağı göstermek için kitap sayfasına yönlendirir. Eklenen dosyalar **PowerPoint dışa aktarımına dahil değildir**; web sunumunda ayrı form görünümünde gösterilir.

## Şifre

Ders verisi build sırasında `SUNUM_SIFRE` ile **AES-256-GCM** (PBKDF2-SHA256, 250 000 tur) şifrelenir; sitede yalnız şifreli `data.<sürüm>.bin` bulunur. Şifre bilinmeden içerik okunamaz. Şifre ekranında "Bu cihazda hatırla" seçilirse şifre o tarayıcıda saklanır; menüdeki **"Bu cihazda şifreyi unut"** ile silinir.

Şifreyi değiştirmek: kullandığınız yayın ortamında `SUNUM_SIFRE` değerini değiştirip yeniden deploy edin.

## Yerelde çalıştırma

```bash
cd apps/sunum-web
npm run dev        # build + http://127.0.0.1:5180
```

`SUNUM_SIFRE` verilmezse yerelde deneme şifresi `sunum` kullanılır. Kalıcı yerel şifre için `apps/sunum-web/.env.local` dosyasına `SUNUM_SIFRE=...` yazılabilir (git'e girmez). Netlify veya GitHub Actions'ta şifre tanımlı değilse build bilerek hata verir.

`npm test` build alır ve şifreli veriyi çözerek ders/adım/cevap sayılarını kanonik katalogla karşılaştırır.

## GitHub Pages kurulumu (bir kez)

1. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret** yoluyla `SUNUM_SIFRE` ekleyin. Değer, sunumu açarken kullanacağınız şifredir; en az dört karakter olmalıdır.
2. **Settings → Pages → Build and deployment → Source** alanında **GitHub Actions** seçin.
3. `.github/workflows/sunum-pages.yml` dosyasını içeren değişiklikleri `main` dalına gönderin. Akış, şifreli siteyi derler, testleri çalıştırır ve yalnız `apps/sunum-web/dist` çıktısını yayımlar.
4. **Actions → Publish Sunum Web to GitHub Pages** çalışmasının başarılı olmasını bekleyin. Gerektiğinde **Run workflow** ile `main` dalından yeniden yayımlayın.

Adres: https://knigdelioglu.github.io/ogretmenrehberi/

**Deploy from a branch → main → /(root)** ayarı uygulamayı derlemez; kökte `index.html` bulunmadığı için README'yi gösterir. GitHub Actions yayını aynı `main` dalındaki kaynakları kullanır; derlenmiş site dosyalarını Git'e eklemek gerekmez. Dosya ve service worker yolları göreli olduğundan sunum `/ogretmenrehberi/` altında da çalışır.

## Netlify kurulumu (bir kez)

1. Netlify → **Add new site → Import an existing project** → GitHub → `ogretmenrehberi` deposu.
2. Ayarlar kök dizindeki `netlify.toml`'dan otomatik gelir (base `apps/sunum-web`, publish `dist`).
3. **Site configuration → Environment variables** → `SUNUM_SIFRE` ekleyin.
4. Yerel bilgisayarda `apps/sunum-web/.env.local` içindeki `SUNUM_SIFRE` değerini Netlify'daki değerle aynı ayarlayın ve depo kökünde bir kez `netlify link` çalıştırın.
5. Güncel `main` GitHub'a gönderilip çalışma ağacı temizlendikten sonra `local-only/Netlify Deploy.command` dosyasına tıklayarak production deploy yapın.
6. İsterseniz site adını değiştirin (ör. `xyz-sunum.netlify.app`).

Git push'ları otomatik build başlatmaz. Yerel deploy komutu önce `apps/sunum-web` için `npm run build` çalıştırır, ardından hazır `dist` çıktısını Netlify CLI ile production'a yükler. Komut dosyası ve Netlify site bağlantısı makineye özeldir; `.gitignore` nedeniyle repoya eklenmez.

### Şifre ekranında `Veri indirilemedi (404)`

Bu hata yanlış şifre değildir: açılan `app.js` içindeki sürüm numaralı `data.*.bin` dosyası sunucuda bulunamamıştır. Tarayıcı eski sürümü açıyorsa uygulama bir kez önbelleği atlayarak yeniden yükler. Gerçekten eksik yayımlanmış dosya varsa tek başına yeniden yükleme sorunu çözmez.

1. Depoyu yerel bilgisayarda güncelleyin (`git pull --ff-only`). `apps/sunum-web/.env.local` dosyasındaki `SUNUM_SIFRE` değerinin, kullanmak istediğiniz yayın şifresiyle aynı olduğundan emin olun; şifreyi repoya eklemeyin.
2. Önceden kullandığınız `local-only/Netlify Deploy.command` dosyasıyla production'a **yeniden tam yayın** yapın. Komut `dist/index.html`, `dist/app.js` ve aynı build'e ait `dist/data.*.bin` dosyasını birlikte yüklemelidir. `dist` içinden tek tek dosya taşımayın.
3. Yayın sonrası gizli pencereden deneyin. Normal sekmede eski servis çalışanı sorun çıkarıyorsa sayfayı zorla yenileyin. **Site verilerini topluca silmeyin:** değerlendirme için tarayıcıya yüklenen formlar IndexedDB'de saklanıyor olabilir.
4. Netlify'daki production deploy hâlâ eskiyse, GitHub'daki yeşil `Sunum Web` / `Publish Sunum Web to GitHub Pages` Actions sonucu bunu değiştirmez; Netlify otomatik dağıtımı `netlify.toml` ile özellikle kapalıdır.

Site `noindex` başlığı ve `robots.txt` ile arama motorlarına kapalıdır. Service worker son açılan sürümü önbellekte tutar; okul ağı kesilirse sayfa yine açılır.
