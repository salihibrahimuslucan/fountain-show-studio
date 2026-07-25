# Aquatronic Show Studio

Web tabanlı çeşme şovu önizleme aracı: müşteri planı (DXF/PNG) üzerine ürün
yerleştir, müzikten koreografi üret, şov modunda izlet, markalı webm indir.
three.js + WebGL2, framework yok, tamamı statik dosya (vendor yerel, CDN yok).

## v2 yenilikleri

- **Büyük DXF desteği** — 2MB üstü dosyalar Web Worker'da akışlı ayrıştırılır
  (UI donmaz, %ilerleme), parça bütçesiyle sadeleştirilir; >500MB net mesajla reddedilir.
- **Şov transport'u** — sarma (⏪/⏩, ←/→, Shift+ok, boşluk) + ince cetvel
  (tıkla/sürükle scrub); sararken akış kesilmez, kayda girmez.
- **Efekt katmanları** — damla salkımı, köpük halkası, su altı ışık gölü,
  hacimli huzme, laminer kalınlık profili.
- **Per-jet RGBW renk** — hue + beyaz kanalları (v3'te ışık sayısı sınırsız).
- **Beat v2** — FFT tabanlı analiz: BPM ızgarası, frekans bantları, bölüm tespiti.
- **Renk desen kütüphanesi** — kanallara hazır renk desenleri.
- **5 ortam preseti** + **prosedürel su sesi** (örnek dosya gerekmez).
- **Ürün kataloğu paleti** — palet gerçek ürün verisinden beslenir.

## v3 yenilikleri — cihaz gerçekçiliği

- **Gerçek ışık modeli** — tiyatro spotu yerine AquaLIGHT **412C halka** (nozul-altı
  LED: su rengini içten verir + zemine kostik göl); bağımsız halka sayısı SINIRSIZ.
- **Katalog cihazları** — AquaVARIO, AquaSWITCH (ani aç/kes), AquaJUMP, AquaROBO
  (pan/tilt kanalları), AquaSWING, DryDECK, AquaJET, 412C — temsili 3D gövdeleriyle.
- **Çarpma-senkron ses** — sürekli şelale yerine akış kesilince balistik gecikmeli
  "şlap"; taban fısıltı. Tamamı sentez.
- **Yerleşim şablonları** — `⌂ şablon`: daire havuz / arı kovanı (kuru meydan) /
  çizgi kanal / ızgara; kalabalık sahnede otomatik parçacık bütçesi.
- **Hazır şovlar + örnek parçalar** — `▶ örnek şov` (7 müzikli koreografi) + `♪ örnek parça`
  (enerjik/ambient/marş, sentetik); `#ornek=mozart-daire` hash'iyle de açılır.
- **Beste v3** — cihaz rolleri: bas→VARIO debisi, beat→SWITCH vuruşları,
  orta bant→ROBO/SWING süpürme, AquaJET yalnız drop'ta; bölüm özeti mesajı.
- **6 ortam preseti** — +`kuru` (DryDECK beton meydanı, havuzsuz).
- **Hızlı yerleşim** — sürekli döşeme (sağ tık/ESC bitirir), Shift+tık çoklu
  seçim + toplu silme.

## v5 yenilikleri — katalog birebir

- **35 ürünlük künye kataloğu** — PN/güç/kontrol gerçek üründen; gruplu palet.
- **Dört yeni aile** — su perdeleri (çizgi-kaynak, yukarıdan dökülür), AquaAIR
  (basınçlı hava salvosu), AquaSTAR (entegre LED taç), AquaTORCH (su + tepesinde alev).
- **Cihaz karakter kartları** — su deseni/gövde/ışık/fizik cihaz cihaz belgelendi
  (`docs/cihaz-karakter-kartlari.md`); canlı RGBW dönüşü, su altı/üstü ışık farkı.

## v6 yenilikleri — gerçekçilik (büyük animasyoncu teknikleri)

- **Hız-gerdirmeli çekirdek** — jet gövdesi nokta bulutu değil AKAN iplikler
  (velocity-stretch billboard; berrak jet çok, köpüklü az gerdirilir).
- **Mist katmanı** — nozul dibinde fog halısı; curl savrulması, ışıktan renk alır.
- **Işık-su bağı** — bağımsız 412C halkalar yakın su kolonunu boyar (koni maskesi
  + arkadan aydınlatma rim'i); ışıksız su karanlık kalır.
- **Erosion sıçrama tacı** — çarpmada büyüyüp eriyen köpük tacı (flipbook'suz).
- **İkincil sıçrama** — suya çarpan parçacık ölmez, sıçramaya döner (GPU durum
  makinesi, ek bütçe yok).
- **Gerçek çarpma halkaları** — GPGPU height-field dalga simülasyonu; jetin
  altında dışa yayılan halkalar su yansımasını bozar.
- **Kamera paketi** — ACES filmik pozlama + otomatik pozlama (spot metering) +
  seçici bloom + 4-kollu star-burst: "gece kamerası" hissi.

## v7 yan-hat — mekân + editör

- **Mekân katmanları** — yıldızlı prosedürel gece göğü (şehirde ufuk ışıması),
  çatı hatlı iki-katmanlı siluet (pencereler dokuda), doku-silüetli ağaçlar,
  kaldırım taşı halkası, glow'lu sokak lambaları; hepsi tohumlu-deterministik,
  dış asset yok.
- **Yumuşak fon geçişi** — fon değişimi 1.5 sn crossfade (çift-doku gök kubbesi
  + katman fade + su/sis/ambiyans lerp'i).
- **Editör UX (Depence desenleri)** — cihaz başına katlanabilir grup-track
  (katlıda özet zarfı), parametre filtre çipleri, imleç-merkezli zoom + pan +
  playhead oto-takip, kümelenmiş üst bar, sürüklenebilir şerit yüksekliği.

## Çalıştırma

```
tools\sunucu.cmd          # repo kökünde python -m http.server 8321
```

Tarayıcıda `http://localhost:8321/studio/` aç. Gereksinim: WebGL2 destekleyen
güncel Chrome/Edge (yoksa tam sayfa uyarı çıkar; Firefox denenmedi — kabul listesi Chrome/Edge üzerinden koşuldu). ES modül kullanıldığı
için `index.html` dosyadan (`file://`) açılmaz — sunucu şart; USB/offline
senaryosunda aynı komutu taşınan klasörden çalıştırmak yeter.

## Kullanım akışı (satış demosu)

1. **Aç** — sayfa şov modunda açılır (boş sahne). `#demo` hash'i 6 cihazlık örnek
   koreografiyi hazır kurar.
2. **TAB → Editör, PLAN görünümü** — `📂 DXF/PNG` ile müşteri planını yükle.
   Ölçek `$INSUNITS` başlığından okunur; yoksa/yanlışsa `📏 ölçek` ile plandaki
   bilinen bir mesafenin iki ucunu tıkla + gerçek metreyi gir.
3. **Ürünleri yerleştir** — paletten tür seç (katalogdan beslenir: düz jet,
   geyser, laminer, RGB spot vb.) → tuvalde tıkla. Sürükle=taşı, R=döndür,
   Delete/×=sil, tekerlek=zoom, boş alan sürükle/orta tuş=pan.
   Sınır: en fazla 8 RGB spot.
4. **🎵 müzik yükle** — sesi değiştirir, elle çizilmiş timeline'a dokunmaz
   (müzik uzunsa süre uzar, kısaysa uyarır). **🎼 bestele** — beat/drop analizi
   ile timeline'ı yeniden yazar (elle değişiklik varsa onay sorar).
5. **Şerit editörü** — alt şeritte kanal başına anahtar ekle/taşı/sil, cetvelden
   scrub (durakta kalır, ▶ ile sürer). Kanallar yerleştirilen cihazlardan doğar.
6. **TAB → Şov modu** — sinematik kamera kendiliğinden akar; fareyle serbest
   orbit, bırakınca geri döner. UI oynarken 4 sn'de gizlenir.
7. **🔴 kayıt** — şov baştan döngüsüz bir tur döner, `aquatronic-show.webm`
   (marka overlay + müzik) otomatik iner. Kayıt sürerken 📁 proje açma reddedilir.
8. **💾 / 📁** — `.aqshow` (tek JSON) indir/aç. DXF metni ve kalibrasyonu dosyaya
   gömülür; **PNG zemin gömülmez** (kayıtta uyarı verilir), müzik de gömülmez —
   açılışta "müziği tekrar yükle" hatırlatması gelir. Hash'siz normal kullanımda
   son durum 5 sn'de bir localStorage taslağına yazılır; sonraki açılışta
   "taslağı geri yükle?" sorulur.

## Yayın + offline paket

- **Build:** `bash tools/build.sh` → `dist/` (yalnız studio içeriği; ders/docs girmez).
- **Cloudflare Pages:** `npx wrangler pages deploy dist --project-name=aquatronic-show-studio --branch=main`
  (`--branch=main` ŞART — aksi halde preview URL'e gider; ilk seferde `npx wrangler login`).
- **Offline/USB:** `dist/` içeriğini kopyala, YANINA `tools/baslat.cmd`'yi koy —
  çift tık sunucuyu 8321'de açar ve tarayıcıyı başlatır (Python kurulu olmalı).

## DWG → DXF (ODA reçetesi)

Tarayıcı DWG okumaz; planı önce DXF'e çevir. Ücretsiz **ODA File Converter**
(Open Design Alliance) klasör bazlı çalışır:

```
ODAFileConverter.exe "<girisKlasoru>" "<cikisKlasoru>" "ACAD2018" "DXF" "0" "1" "*.DWG"
```

Argümanlar: girişDizin çıkışDizin sürüm tip recurse audit filtre. Dikkat: giriş
klasörünün TAMAMI taranır — çevrilecek DWG'yi izole bir klasöre kopyala.
Ayrıştırıcı yalnız LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE okur; desteklenmeyen
entity'ler sayılıp atlanır (mesajla bildirilir), sahne çalışmaya devam eder.

## Geliştirme

- **Tam doğrulama TEK KOMUT:** `bash tools/saglik.sh` (testler + smoke seti +
  zombi chrome temizliği; `hizli` argümanıyla kısa tur). ⚠Node testleri dosyaları
  METİN okur, IMPORT ETMEZ — bir sözdizimi hatası (ör. GLSL yorumuna sızan
  backtick) 300 test yeşilken sayfayı komple öldürebilir; onu ancak smoke yakalar.
- Testler: `node --test test/*.mjs` (300 test — dxf/timeline/besteci/proje/desen/
  geometri/katalog/altyapı + ışık borusu, render hattı borçları, örnek şovların
  kendisi, dayanıklılık, besteci uçtan uca, fon presetleri).
- Headless smoke: `tools/smoke.sh "studio/index.html#demo" /tmp/demo.png`
  (Chrome headless + swiftshader; politika: sayfa konsolu tamamen sessiz olmalı).
  ⚠Sunucu kapalıyken SAHTE "TEMIZ" verir — `tools/saglik.sh` önce curl ile doğrular.
  ⚠Fon çapraz geçişi headless'ta ilerlemez; `.aqshow` yolu bu yüzden
  `sahneKur(d, {gecissiz:true})` kullanır, yoksa kareler açılış fonunu gösterir.
- Kare kıyaslama: `py tools/kontakt.py cikti.png kare1.png kare2.png …` — yan yana
  kontakt sayfası (preset/cihaz kıyasları böyle okunuyor).
- Faydalı hash kancaları: `#demo` (örnek sahne + sentetik beste),
  `#demo&sim=5` (5 sn deterministik ön-adımlama), `#mod=editor`, `#plandemo`
  (örnek DXF + 3 cihaz), `#demo&kayit` (kayıt yolu), `#demo&projedemo`
  (.aqshow gidiş-dönüş). Hash'li açılışta localStorage taslağı devre dışıdır.
- Kabul listesi: `docs/kabul-listesi.md` (gerçek tarayıcıda elle doğrulanan maddeler).
- `ders/` klasörü öğrenme izi — dokunulmaz, yayına girmez.
