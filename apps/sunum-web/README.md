# Sunum Web

Sınıfta öğrencilere gösterilen, **yalnız öğretmenin kullandığı** ders sunumu. Netlify'da yayımlanır; sunum kumandasıyla slayt gibi ileri–geri yönetilir.

- İçerik: `data/grade-11/presentation/theme-*/*-flow.json` ders akışları + kanonik `source-index` / `answer-bank` verisi (Lesson Player'ın veri üreticisiyle aynı kaynak). Her ders: **kapak → adım slaytları → ders sonu**.
- Öğretmen notları (`content.note`) sunum verisine hiç girmez.
- Harici npm bağımlılığı yoktur; build yalnız Node ile çalışır.

## Kumanda ve klavye

| Tuş | Ne yapar |
|---|---|
| İleri · → · ↓ · PageDown · Boşluk · Enter | Aynı görevin sonraki sunum parçasına, sonra **cevap** ve **metinden kanıt** ekranlarına geçer. Katmanlar ayrı görünür; uzun bir parça taşarsa önce aşağı kaydırır. Hepsi tamamlanınca sonraki slayt; ders sonundan sonra sıradaki ders. |
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

## Şifre

Ders verisi build sırasında `SUNUM_SIFRE` ile **AES-256-GCM** (PBKDF2-SHA256, 250 000 tur) şifrelenir; sitede yalnız şifreli `data.<sürüm>.bin` bulunur. Şifre bilinmeden içerik okunamaz. Şifre ekranında "Bu cihazda hatırla" seçilirse şifre o tarayıcıda saklanır; menüdeki **"Bu cihazda şifreyi unut"** ile silinir.

Şifreyi değiştirmek: Netlify'da `SUNUM_SIFRE` değerini değiştirip yeniden deploy edin.

## Yerelde çalıştırma

```bash
cd apps/sunum-web
npm run dev        # build + http://127.0.0.1:5180
```

`SUNUM_SIFRE` verilmezse yerelde deneme şifresi `sunum` kullanılır. Kalıcı yerel şifre için `apps/sunum-web/.env.local` dosyasına `SUNUM_SIFRE=...` yazılabilir (git'e girmez). Netlify'da şifre tanımlı değilse build bilerek hata verir.

`npm test` build alır ve şifreli veriyi çözerek ders/adım/cevap sayılarını kanonik katalogla karşılaştırır.

## Netlify kurulumu (bir kez)

1. Netlify → **Add new site → Import an existing project** → GitHub → `ogretmenrehberi` deposu.
2. Ayarlar kök dizindeki `netlify.toml`'dan otomatik gelir (base `apps/sunum-web`, publish `dist`).
3. **Site configuration → Environment variables** → `SUNUM_SIFRE` ekleyin, sonra **Deploys → Trigger deploy**.
4. İsterseniz site adını değiştirin (ör. `xyz-sunum.netlify.app`).

Sonraki her `main` push'unda, yalnız sunumu etkileyen dosyalar (`data/grade-11`, `apps/sunum-web`, Lesson Player veri scriptleri) değiştiyse yeniden build alınır.

Site `noindex` başlığı ve `robots.txt` ile arama motorlarına kapalıdır. Service worker son açılan sürümü önbellekte tutar; okul ağı kesilirse sayfa yine açılır.
