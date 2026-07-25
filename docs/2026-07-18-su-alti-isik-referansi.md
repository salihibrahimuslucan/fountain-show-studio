# Su Altı RGB(W) Çeşme Aydınlatması — Teknik Referans

Tarih: 2026-07-18 · Kapsam: v7 "cihaz birebir" turunun IŞIK ayağı
Yöntem: web araştırması (üretici datasheet'leri + optik literatürü + render pratiği).
Salih'in kararı: kendi videomuzu çekmiyoruz — sektör standardı ürünlerin bilinen,
ölçülebilir davranışını referans alıyoruz. Kriter = **doğru match**, kopya değil.

Kural: her iddianın yanında kaynak var. Emin olunmayan yerler **BELİRSİZ** etiketli.
Türetilmiş (hesapla bulunmuş) sayılar **[TÜRETİM]** ile işaretli.

---

## 1. Yönetici özeti — simülatöre girecek 12 somut kural

| # | Kural | Değer | Nereye girer |
|---|---|---|---|
| 1 | Su kırılma indisi | n = 1.333 | Snell dönüşümü, tüm açı hesapları |
| 2 | Hüzme açısı suda DARALIR | `θ_su = 2·asin( sin(θ_hava/2) / 1.333 )`; 180°→97.2° | Işık koni geometrisi |
| 3 | Küçük açı yaklaşımı | `θ_su ≈ θ_hava / 1.33` (θ<40° için %3 hata içinde) [TÜRETİM] | Hızlı shader yolu |
| 4 | Standart hüzme aileleri | Dar spot 10-15°, spot 15-25°, flood 30-45°, wide flood 45-60°, havuz duvarı 120° | Cihaz preset'leri |
| 5 | Tipik halka armatür | 10×4W = 40 W, 12 RGBW diyot, ⌀181 mm (7.125"), 360° | Emitter varsayılanı |
| 6 | Beyaz kanal CCT | 3000K (sıcak) / 4000K (nötr) iki aile | RGBW → RGB dönüşümü |
| 7 | Beyaz LED verimi | ~83 lm/W (OASE 1250 lm / 15 W) [TÜRETİM] | Göreli parlaklık ölçeği |
| 8 | DMX taban haritası | 4ch = R,G,B,W. 5-8ch = + master dimmer, strobe, makro, hız | Timeline → cihaz köprüsü |
| 9 | Dimming eğrisi | LİNEER DEĞİL — square-law/gamma. `L ≈ (dmx/255)^2` | DMX değeri → shader yoğunluğu |
| 10 | Aerated su | çok-saçılımlı, albedo≈1 → **BEYAZ ve izotropik**; ışık rengini birebir alır | Parçacık boyama |
| 11 | Laminer su | TIR ile ışığı **İLETİR**, boyanmaz; kopma noktasında ölür, tavan ~5 m | Mesh gövde shader'ı |
| 12 | Tek-saçılım anizotropisi | Henyey-Greenstein g ≈ 0.7-0.9 (ileri saçılma baskın) | Hüzme içi parlaklık |

Ek: su emilimi Beer-Lambert per-kanal — kırmızı ~0.34 m⁻¹, mavi ~0.004-0.01 m⁻¹.
Bloom eşiği HDR lineer uzayda 1.0, karışım ~0.04.

---

## 2. Ürün gerçeği tablosu

### 2.1 Hüzme açısı aileleri

| Üretici / ürün | Hüzme açıları | Not | Kaynak |
|---|---|---|---|
| OASE LunAqua Power LED XL | **10° / 15° / 30° / 45°** (narrow spot / spot / flood / wide flood) | 15 W, 1250 lm (3000K), 1350 lm (4000K), 24 V DC, >50.000 saat. Dört varyantın hepsi aynı güç ve akı — sadece optik farklı | [oase.com](https://www.oase.com/en/products-a-z/family/f/lunaqua-power-led-xl.1000649963.html), [lincsaquatics](https://www.lincsaquatics.com/oase-lunaqua-power-led-xl-4000-narrow-spot-p10098) |
| Lumascape Woda W3 | **12° / 14° / 20° / 25° / 35° / 45° / 50° / 55°** + asimetrik 10°×40°, 40°×10°, 20°×60°, 60°×20° | 3600 lm'e kadar, RGBW opsiyonlu, IP68, 316 paslanmaz, DMX/RDM + Art-Net | [lumascape.com/products/ls5030](https://www.lumascape.com/products/ls5030) |
| Lumascape Woda WB3 (pirinç) | aynı aile | 2600 lm'e kadar, RGBW, IP68 fabrika mühürlü, 10 m daimî daldırma | [lumascape haber](https://www.lumascape.com/company/news/facade-lighting/woda-w3-new-product-release) |
| Havuz / çeşme genel pratiği | **15° / 30° / 45° / 60° / 120°** (havuz), **15° / 30° / 45° / 60°** (su altı spot ve çeşme) | Dar açı = vurgu, geniş açı = eşit yayılım | [wakinglighting](https://wakinglighting.com/how-to-choose-the-suitable-beam-angle-of-underwater-lights/) |
| Çin OEM (DMX su altı) | **10°-90°**, bazı serilerde 10°-120° arası müşteri isteğine göre | Sipariş parametresi; sabit optik değil | [superlightingled](https://www.superlightingled.com/dc1224v-691215182436w-rgb-dmx512-addressable-led-underwater-light-ip68-swim-pool-fountain-light-for-fountains-ponds-p-1813.html) |

**Hangi uygulamada hangisi (sentez, kaynaklardan):**
- **10-15° dar spot** — yüksek jet/comet dibine gömülü, ışığı kolon boyunca yukarı taşımak; ağaç/heykel vurgusu
- **20-35° spot** — orta boy jetler, geyser gövdesi, dar su perdesi
- **40-60° flood** — çok nozullu grup, splash pad alanı, havuz tabanı yıkama
- **60-120° wide** — havuz duvarı/basamak yıkama, tek armatürle geniş alan (montaj maliyeti düşürme gerekçesi açıkça belirtiliyor)
- **Asimetrik (10°×40°)** — çizgisel dizi nozul sırası ya da su perdesi; bir eksende dar, diğerinde geniş

### 2.2 LED dizilimi ve halka armatürler

| Ürün | Dizilim | Güç | Not | Kaynak |
|---|---|---|---|---|
| Fountain People FX-PRO Ring RGBW | **10 × 4 W RGBW diyot**, halka | 40 W | ⌀7.125" (181 mm), **360° aydınlatma**, onboard DMX sürücü, 316L paslanmaz + temperli cam + silikon conta. Nozul borusu halkanın ORTASINDAN geçiyor (ya da 1-1/2" NPT ara parça ile) | [fountainpeople](https://www.fountainpeople.com/products/fxpro-ring-rgbw-led-light) |
| Fountain People FX-PRO RGBW40 | **12 RGBW diyot** | 40 W | 316L paslanmaz, onboard DMX. Lümen ve hüzme açısı sayfada YOK — **BELİRSİZ** | [fountainpeople](https://www.fountainpeople.com/products/fx-pro-series-rgbw40-led) |
| Genel OEM su altı RGBW | tek puck ya da halka | 6-36 W tipik, 12/24 V DC | IP68, sabit akım sürücü | [superlightingled](https://www.superlightingled.com/dc1224v-691215182436w-rgb-dmx512-addressable-led-underwater-light-ip68-swim-pool-fountain-light-for-fountains-ponds-p-1813.html) |

**Mimari çıkarım (simülatör için önemli):** halka armatür nozulu SARAR, yani ışık kaynağı
jetin dibinde ve jetle **eşmerkezli**. Bu yüzden jet gövdesi her yönden eşit boyanır ve
armatür kendisi jetin altında parlak bir disk olarak görünür. Tek puck armatür ise yandan
vurur — asimetrik boyama, bir tarafı parlak diğeri gölgeli. Bu ikilik cihaz kartlarına
`emitterMount: "ring_concentric" | "side_puck"` olarak girmeli.

### 2.3 RGB vs RGBW — beyaz kanalın rolü

- RGBW aile standart hale gelmiş durumda (Lumascape W3, Fountain People FX-PRO tümü RGBW).
- Beyaz kanal CCT'si genelde **3000K veya 4000K** iki aileden biri (OASE bu ikiliği açıkça
  ayırıyor: 4000K nötr beyaz yeşil tonlar — çalı, sazlık, çam — için öneriliyor).
- Rolü: R+G+B ile yapılan "beyaz" düşük CRI'li ve doygunluğu bozuk; ayrı beyaz LED gerçek
  beyaz + pastel tonlar + daha yüksek toplam akı verir. Bu yüzden **W kanalı RGB'nin üstüne
  EKLENİR, RGB'den türetilmez**.
- Simülatörde: `rgbw → rgb` dönüşümü toplama olmalı, `rgb + w * kelvinToRGB(CCT)`.
  Doygunluk kaybını modellemek için `w` arttıkça sonucun HSV doygunluğu düşmeli — bu
  otomatik olarak toplamadan çıkar.

### 2.4 Lümen / watt mertebeleri

- OASE LunAqua Power LED XL: 15 W → 1250 lm (3000K) / 1350 lm (4000K) = **~83-90 lm/W** [TÜRETİM]
- Lumascape Woda W3: 3600 lm'e kadar (RGBW opsiyonlu); watt sayfada net değil — **BELİRSİZ**
- Lumascape Woda WB3: 2600 lm'e kadar
- **UYARI:** RGBW armatörlerde üretici çoğunlukla lümen YAYINLAMIYOR (FX-PRO sayfalarında yok).
  Sebep: RGBW'de "lümen" hangi kanal kombinasyonunda ölçüldüğüne bağlı. Renkli LED'lerin
  lm/W'ı beyazın çok altındadır. RGBW 40 W'lık bir armatürün tam-beyaz akısını **BELİRSİZ**
  kabul edip, simülatörde OASE'ın 83 lm/W beyaz rakamının **yarısı-üçte biri** mertebesinde
  varsaymak makul bir alt sınır — ama bu **TAHMİN, kaynak değil**.

### 2.5 DMX kanal haritaları

Su altı çeşme armatürlerinin datasheet'lerinde kanal haritası genelde yayınlanmıyor
(FX-PRO "onboard DMX driver" diyor, kanal sayısı vermiyor — **BELİRSİZ**). Ancak sektör
standardı RGBW armatür haritaları iyi belgelenmiş ve çeşme armatürleri bunları izliyor:

| Mod | Kanallar | Kaynak / örnek |
|---|---|---|
| **4ch (taban)** | 1=Kırmızı, 2=Yeşil, 3=Mavi, 4=Beyaz | 4 kanallı DMX→RGBW dekoder standardı ([Martin Supply manual](https://www.martin-supply.com/images/pdf/VENDOR%20TECH%20DATA%20SHEETS/4Ch-DMX-to-RGBW-LED-Controller-Manual_M.pdf), [Solid Apollo](https://www.solidapollo.com/ichroma-dmx-rgbw-led-decoder.html)) |
| **5ch** | 1=Master Dimmer, 2=R, 3=G, 4=B, 5=W | Chauvet Ovation B-565FC "RGBAL 5CH" deseninin RGBW karşılığı |
| **8ch (genişletilmiş)** | Dimmer, Dimmer Fine, R, G, B, W, Sanal renk çarkı (makro), Strobe | [Chauvet Ovation B-565FC DMX chart](https://www.chauvetprofessional.com/wp-content/uploads/2016/05/Ovation_B-565FC_DMX_Chart_Rev2.pdf), [Coemar ParLite RGBW 8/4ch](https://www.coemar.com/wp-content/uploads/2018/02/DMX-chart-ParLite-Led-RGBW-1.pdf) |

Ek kanal fonksiyonları (profesyonel armatürlerde görülen): renk sıcaklığı (CCT) kanalı,
makro/program seçimi, program hızı, dimmer eğrisi seçimi.

**16-bit (fine) kanal:** "Dimmer Fine" kanalı Chauvet haritasında mevcut — yani coarse+fine
ile 16-bit dimming var. Bu, düşük seviyelerde bant oluşmasını (banding) engeller. Simülatörde
düşük yoğunlukta smooth fade istiyorsak 8-bit kuantalama YAPMAMALIYIZ.

### 2.6 Dimming eğrisi — LİNEER DEĞİL

Bu, simülatörün DMX değerini parlaklığa çevirirken en sık yapılan hata:

- "DMX kontrollü uygulamalar tipik olarak dinamik seviye kontrolü ister ve bu yüzden
  genellikle **square-law** dimming eğrisine ihtiyaç duyar." — [ECMag](https://www.ecmag.com/magazine/articles/article-detail/lighting-ahead-dimming-curve)
- Square law tanımı: *algılanan ışık = √(ölçülen ışık)*. Yani sürücü, algıyı lineerleştirmek
  için çıkışı girişin **karesi** ile üretir. [Lumos Controls](https://lumoscontrols.com/resources/how-to-choose-the-right-dimming-curve/)
- Square law düşük seviyelerde ince, yüksek seviyelerde kaba kontrol verir — chase ve
  düşük-seviye sahnelerde daha çok DMX değeri alt uca ayrılır. [RC4 Wireless](https://rc4wireless.com/glossary/dimmer-curves/)
- Nihai davranış **dimmer eğrisi × sürücü eğrisi** birleşimidir; farklı eğrili dimmer+sürücü
  eşleşmesi çok farklı sonuç verir. Yani gerçek kurulumda eğri tam olarak kestirilemez —
  bunu simülatörde **ayarlanabilir bir gamma** yapmak doğru tasarım.

Not: gamma 2.2 / 8-bit vs 16-bit ayrımı bu kaynaklarda açıkça geçmiyor — square law (γ=2)
belgeli, γ=2.2 kullanımı yaygın pratik ama bu kaynaklarla **BELİRSİZ**.

### 2.7 RDM

- RDM = **ANSI E1.20**, ESTA tarafından geliştirildi ve sürdürülüyor. DMX512'ye çift yönlü
  iletişim ekler. [Wikipedia RDM](https://en.wikipedia.org/wiki/RDM_(lighting)), [ANSI E1.20](https://webstore.ansi.org/standards/esta/ansie1202010)
- Yapabildikleri: ağdaki cihazları **keşif** (DISC_UNIQUE_BRANCH ikili arama algoritması),
  **uzaktan DMX başlangıç adresi atama**, durum ve arıza raporlama. [openlighting E1.20](https://wiki.openlighting.org/index.php/E1.20)
- Aynı taban adresi paylaşan cihazlar bile ayrı ayrı adreslenebilir — su altı armatürler
  için kritik, çünkü kuruluma girmiş bir armatüre fiziksel erişim yok.
- Lumascape Woda W3 kontrol protokolleri arasında **DMX/RDM ve Art-Net** var.
- Simülatöre etkisi: **doğrudan görsel etkisi yok**, ama cihaz modelinde `rdmUid` alanı ve
  "adres çakışması" senaryosu (aynı adresteki iki armatür AYNI davranır) modellenebilir.

---

## 3. FİZİK — aerated vs laminer boyama farkı (EN ÖNEMLİ BÖLÜM)

Bu ayrım, çeşme aydınlatmasının görsel gerçeğinin **tamamı** denecek kadar belirleyici.
İki farklı optik rejim, iki farklı render hattı gerektiriyor — ve mevcut mimarimizdeki
"parçacık vs mesh" ikiliği (bkz. `2026-07-14-cihaz-render-desenleri.md` §0) tam olarak
bu fizikle örtüşüyor. Bu iyi haber: mimari zaten doğru, sadece ışık tarafını bağlamalıyız.

### 3.1 Laminer su — ışığı BOYAMAZ, İLETİR (light piping / TIR)

**Mekanizma.** Temiz laminer jet, sudan havaya geçişte **tam iç yansıma** (total internal
reflection, TIR) yaşar. Su/hava kritik açısı:

```
θ_kritik = asin(1 / 1.333) = 48.6°
```

Bu 48.6° değeri Snell penceresi literatüründe standart olarak veriliyor
([Wikipedia Snell's window](https://en.wikipedia.org/wiki/Snell's_window),
[U. Arizona OSC](https://wp.optics.arizona.edu/oscoutreach/snells-window/)).
Yüzeye 48.6°'den daha yatık çarpan ışık **tamamen** geri yansır, hiç dışarı çıkmaz.

Sonuç: laminer jetin pürüzsüz cam-çubuk dış yüzeyi ışığı hapseder.

> "Işık nozul boğazından jete girer ve su kolonu boyunca tam iç yansıma yapar; temiz bir
> laminer jetin uçtan uca fiber optik gibi parlamasının sebebi budur."
> — [Firgelli, Luminous Fountain Mechanism](https://www.firgelliauto.com/blogs/mechanisms/luminous-fountain)

> "Bir su jeti ışığı tıpkı bir optik fiber gibi 'hapseder'." / "Lazer ışını su akışının
> içinde tam iç yansıma ile hapsedilebilir — fiber optik kablonun sudaki karşılığı."
> — [Harvard Natural Sciences Lecture Demos, "Bucket of Light"](https://sciencedemonstrations.fas.harvard.edu/presentations/bucket-light)

> "Laminer jetten çıkan akış pürüzsüz, cam, çubuk benzeri bir dış yüzeye sahiptir ve bu
> sayede suya kuple edilen ışık minimum açısal saçılmayla taşınır, tıpkı bir fiber optik
> ışık tüpü gibi iletir."
> — [US Patent 8523087, Surface disruptor for laminar jet fountain](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8523087)

**Görsel sonuç:** laminer jetin **gövdesi karanlıktır** (ya da çok hafif rim/kenar parıltısı
verir), ışık **ucunda** ve **çarpma noktasında** patlar. Fiber optiğin ucu gibi.

**Sınırlar (bunlar render için kritik):**
- "Kirli su, hava kabarcıkları ya da çizilmiş nozul deliği bu yansımayı bozar ve jet
  yarı yüksekliğinde donuk görünür." — Firgelli
- "LED ışığı **kopma noktasına** kadar tam iç yansıma yapar ve orada ölür, yani pompayı ne
  kadar zorlarsanız zorlayın görsel tavan ~5 m civarındadır." — Firgelli
- Bu iki cümle simülatörde birebir modellenebilir: `breakupHeight` parametresi + üstünde
  ışık sıfırlanması + `surfaceQuality` (0-1) ile iletim kaybı.

### 3.2 Aerated su — ışığı GÜÇLÜ boyar (çok-saçılım)

**Mekanizma.** Türbülanslı/havalandırılmış su içinde milyonlarca hava kabarcığı vardır.
Her kabarcık bir su/hava arayüzüdür ve ışığı saçar.

> "Şelaleler beyaz görünür çünkü şiddetli çalkalanma suyun içine küçük hava kabarcıkları
> hapseder; her kabarcık ışığı rastgele yönlere saçar — köpük, bulut ve karın beyaz
> görünmesiyle aynı şekilde."
> — [ScienceABC](https://www.scienceabc.com/eyeopeners/why-does-water-appear-white-while-going-over-a-waterfall)

> "Kar, tuz, şeker ve kırılmış cam hepsi özünde renksiz ve saydamdır, ama her yığın beyaz
> görünür çünkü sayısız iç yüzey ışığın neredeyse tamamını **soğurmak yerine yansıtır**."
> — ScienceABC (aynı kaynak)

Bu ikinci cümle simülatör için altın değerinde: **köpük ışığı soğurmaz, saçar.**
Yani tek-saçılım albedosu ω₀ ≈ 1. Sonuç: **köpük, üzerine düşen ışığın rengini birebir alır.**
Kırmızı LED → kıpkırmızı köpük. Su rengi karışmaz.

**Hangi saçılma? Mie, Rayleigh değil.**
Boyut parametresi `α = 2πr/λ`:
- Rayleigh geçerlilik: parçacık çapı dalga boyunun **%10'undan küçük** (α ≈ 0.002-0.2)
- Mie: parçacık dalga boyu **mertebesinde ya da daha büyük** (α ≈ 0.2-2000)
- Geometrik optik: α > 2000
- [ScienceDirect Mie overview](https://www.sciencedirect.com/topics/physics-and-astronomy/mie-scattering), [Wikipedia Mie scattering](https://en.wikipedia.org/wiki/Mie_scattering), [PSU METEO 300](https://courses.ems.psu.edu/meteo300/node/785)

Çeşmedeki hava kabarcıkları ve su damlacıkları **onlarca mikron ile milimetre** arası
(görünür ışık ~0.5 µm). Yani α ≫ 2000 bile olabilir → **tamamen Mie/geometrik rejim**,
Rayleigh KESİNLİKLE değil. Pratik anlamı: **saçılma dalga boyundan bağımsız → renk nötr →
köpük beyaz.** Rayleigh olsaydı köpük mavi olurdu; değil.

Köpük optiği ayrıca sistematik olarak çalışılmış: dalga boyu, kabarcık boyutu ve sıvı
fraksiyonunun fonksiyonu olarak **çok-saçılım** ([Scattering optics of foam](https://www.researchgate.net/publication/5492844_Scattering_optics_of_foam)).
Sıvı içindeki kabarcıkların Mie teorisiyle ışık saçması ölçümlü olarak doğrulanmış
([Springer, Light scattering by bubbles in liquids](https://link.springer.com/article/10.1007/BF00385967)).

### 3.3 Faz fonksiyonu — Henyey-Greenstein ve g değeri

Tek bir saçılma olayının yön dağılımı için standart yaklaşım HG:

```
p(θ) = (1/4π) · (1 − g²) / (1 + g² − 2g·cosθ)^(3/2)
```

- g = saçılma açısının **şiddet-ağırlıklı kosinüs ortalaması**
- g ∈ (−1, 1): −1 tam geri saçılma, 0 izotropik, +1 tam ileri saçılma
- [Wikipedia Henyey-Greenstein](https://en.wikipedia.org/wiki/Henyey%E2%80%93Greenstein_phase_function)

**Tipik değerler:**
- "Aerosol, bulut ve biyolojik doku gibi çoğu doğal ortamda saçılma ağırlıklı olarak ileri
  yöndedir, **g tipik olarak 0.7 ile 0.99 arasında**." — Wikipedia (aynı kaynak)
- Mie saçılmasında faz fonksiyonu 0° (ileri) yönde **aşırı büyüktür** ve daha büyük açılarda
  hızla düşer — [miepython fog docs](https://miepython.readthedocs.io/en/latest/05_fog.html)
- **UYARI:** "Büyük su damlacıkları için HG, ileri saçılan ışık için **kötü bir
  yaklaşımdır**." NVIDIA bu yüzden Draine+HG karışımı öneriyor —
  [NVIDIA, An Approximate Mie Scattering Function for Fog and Cloud Rendering](https://research.nvidia.com/labs/rtr/approximate-mie/)
- Sis/bulut damlacıkları için **spesifik olarak 0.8-0.9** rakamı bu kaynaklarda doğrudan
  teyit EDİLMEDİ (biyolojik doku için 0.8-0.95 veriliyor). Gerçek zamanlı render'da
  g = 0.75-0.85 yaygın pratik ama bu aralık **BELİRSİZ** — 0.7-0.99 genel aralığı belgeli.

### 3.4 Kritik sentez: neden çok-saçılım köpüğü İZOTROPİK yapar

Bu, doğrudan tek bir kaynakta bulunmayan ama iki belgeli olgunun mantıksal birleşimi
(**[TÜRETİM]** — sentez, alıntı değil):

1. Tek saçılma olayı güçlü ileri yönlüdür (g ≈ 0.8).
2. Ama yoğun köpükte ışık **onlarca-yüzlerce kez** saçılır (çok-saçılım, foam optics kaynağı).
3. n kez saçılmadan sonra etkin anizotropi `g_eff → g^n → 0`.
4. Sonuç: **yoğun köpük Lambert benzeri, neredeyse izotropik ve beyaz görünür.**

Render kuralı buradan çıkıyor:
- **Seyrek sprey / mist** (az saçılma) → güçlü ileri saçılma → ışığa **karşıdan** bakınca
  çok parlak, arkadan bakınca sönük. Görüş açısına BAĞLI.
- **Yoğun köpük / geyser gövdesi** (çok saçılma) → izotropik, matt beyaz → her açıdan
  aynı parlaklık. Görüş açısından BAĞIMSIZ.

Yani tek bir `g` değeri yetmez; `g_effective = g_single · (1 − foamDensity)` gibi bir
karışım gerekiyor. Aşağıda §5'te formül var.

### 3.5 Özet karşılaştırma tablosu

| | **Laminer / cam yüzey** | **Aerated / köpük** |
|---|---|---|
| Optik mekanizma | Tam iç yansıma (TIR), θ_kritik = 48.6° | Kabarcıklarda çok-saçılım (Mie) |
| Işıkla ilişkisi | **İLETİR** — fiber optik gibi | **SAÇAR** — boyanır |
| Gövde görünümü | Karanlık/şeffaf, hafif kenar parıltısı | Işık renginde parlak, opak |
| Nerede parlar | Uçta + çarpma noktasında | Her yerde, hacim boyunca |
| Renk | Işığı taşır ama göstermez | Işık rengini birebir alır (albedo≈1) |
| Görüş açısı bağımlılığı | Yüksek (fresnel + TIR) | Düşük (izotropik, yoğun köpükte) |
| Bozan şeyler | Kabarcık, kir, çizik nozul, kopma noktası | — (zaten kaotik) |
| Yükseklik tavanı | ~5 m (kopma noktasında ışık ölür) | Yok, ama üstte seyrelir |
| Render hattı | Mesh + fresnel + uç emissive | Parçacık sprite + hacim boyama |

---

## 4. Gece kamerası / glare reçetesi

### 4.1 Bloom ve veiling glare

**Fiziksel temel:** "Bloom'un fiziksel bir temeli, lenslerin asla mükemmel odaklanamamasıdır.
Mükemmel bir lens bile gelen görüntüyü bir **Airy diski** ile konvolve eder (dairesel açıklıktan
geçen nokta kaynağın kırınım deseni). Normal şartlarda bu kusurlar fark edilmez, ama çok
parlak bir ışık kaynağı kusurları görünür kılar."
— [Wikipedia Bloom (shader effect)](https://en.wikipedia.org/wiki/Bloom_(shader_effect))

**Somut parametreler:**
- **Eşik (threshold):** doğru pozlanmış HDR sahnede eşik **~1.0** olmalı — sadece 1'in
  üstündeki pikseller çevresine sızar. LDR'de daha düşük. — [Unity Post Processing docs](https://docs.unity3d.com/Packages/com.unity.postprocessing@3.2/manual/Bloom.html)
- **Karışım oranı:** HDR renk tamponu ile bloom tamponu arasında lineer interpolasyon,
  HDR'ye doğru **~0.04** güçlü bias. — [LearnOpenGL, Physically Based Bloom](https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom)
- **Yöntem:** HDR tamponu üzerinde progresif downsample + blur zinciri (mip piramidi),
  sonra upsample toplama. — LearnOpenGL / [Froyok UE custom bloom](https://www.froyok.fr/blog/2021-12-ue4-custom-bloom/)

### 4.2 Starburst / kırınım çivileri — DİKKAT, çoğu gece çekiminde YOKTUR

**2N kuralı:** "n bıçaklı bir diyafram, n çift ise **n** çivi, n tek ise **2n** çivi üretir."
— [Wikipedia Diffraction spike](https://en.wikipedia.org/wiki/Diffraction_spike)

Sebep: kırınım her bıçak kenarına dik yönde yayılır, her kenar 180° karşılıklı iki çivi verir;
çift sayıda bıçakta karşılıklı bıçakların çivileri üst üste biner. Pratik ipucu: "10 ya da
daha fazla çivi görüyorsanız lens muhtemelen **tek** sayıda bıçağa sahiptir."

**Kritik gerçekçilik notu [TÜRETİM/sentez]:** starburst sadece **kısılmış diyaframda**
(f/11, f/16, f/22 gibi yüksek f-sayıları) belirir — dar açıklıktan geçen ışık bıçak
kenarlarında büküldüğü için ([PetaPixel](https://petapixel.com/2018/05/19/the-physics-behind-sunbursts-and-how-it-can-help-you-focus-your-photos/)).
Gerçek gece çeşme çekimleri ise ışık toplamak için **açık diyaframda** (f/1.8-f/2.8)
yapılır. Yani tipik bir gece çeşme videosunda **starburst YOKTUR** — yumuşak halo ve
bloom vardır. Simülatörde varsayılan olarak starburst **KAPALI** olmalı; sadece
"uzun pozlama / kısık diyafram" görünümü isteniyorsa açılmalı. Aksi halde sahte görünür.

### 4.3 Diğer gece görünümü bileşenleri

- **Halo / hayalet (ghost):** ekran-uzayı lens flare tekniği parlak bölgeleri ekran
  merkezine göre ters çevirip ölçekleyerek hayalet kopyalar üretir —
  [John Chapman, Screen Space Lens Flare](https://john-chapman.github.io/2017/11/05/pseudo-lens-flare.html)
- **Islak yüzeyde uzayan yansıma:** ıslak zemin pürüzlülüğü düşer (specular keskinleşir) ve
  yansıma dikey eksende uzar. Bu kaynaklarda doğrudan belgelenmedi — **BELİRSİZ**, ama
  standart PBR pratiği: `roughness *= (1 - wetness*0.8)` + yansımanın dikey anizotropik
  esnetilmesi.

### 4.4 Su altından yukarı bakan armatür — Snell penceresi ve kostikler

**Snell penceresi:** su altındaki bir gözlemci yüzeyin üstündeki 180°'lik dünyayı sadece
**~97.2°'lik** bir koni içinden görür (2 × 48.6° kritik açı). Bu koninin dışından gelen
ışık tamamen yansır. Balık gözü lens etkisine benzer.
— [Wikipedia Snell's window](https://en.wikipedia.org/wiki/Snell's_window), [Fly Life Magazine](https://flylifemagazine.com/wednesday-fish-facts-snells-window/)

**Tersine çevirimi (armatür için):** aynı geometri ters yönde de geçerlidir. Su altındaki
armatürden çıkan ışığın yüzeye **48.6°'den yatık** çarpan kısmı yukarı ÇIKAMAZ, tamamen
suya geri yansır. Yani:
- Geniş açılı bir su altı armatürünün ışığının **dış kenarı yüzeyde hapsolur** ve havuz
  içinde yayılır → havuz suyunun kendisi parlar
- Sadece merkez koni (yüzey normaline 48.6°'den dar) havaya çıkar → jet ve sprey boyanır
- Bu iki bileşen simülatörde AYRI render edilmeli

**Kostikler:** dalgalı yüzey ışığı odaklayarak taban/duvarda hareketli parlak desenler yapar.
Gerçek zamanlı yöntemler: diferansiyel alan yöntemi (ışın demetinin orijinal alanı /
projekte alanı = parlaklık), vertex shader'da ışını yüzeyden kırıp zemine kesiştirme.
- [NVIDIA GPU Gems Ch.2, Rendering Water Caustics](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics)
- [Evan Wallace, Rendering Realtime Caustics in WebGL](https://medium.com/@evanwallace/rendering-realtime-caustics-in-webgl-2a99a29a0b2c)
- [jeantimex/threejs-water](https://github.com/jeantimex/threejs-water) — three.js'te
  raytraced yansıma/kırılma/kostik, MIT (bizim yığınımızla birebir uyumlu)
- Uygulama örneği: 1024×1024 çözünürlükte kostik dokusu, GPU'da GLSL ile, 60 fps

### 4.5 Su içinde renk emilimi (Beer-Lambert, per-kanal)

- Saf suyun emilim minimumu **0.0044 ± 0.0006 m⁻¹ @ 418 nm** (Pope & Fry 1997, integrating
  cavity) — [PubMed](https://pubmed.ncbi.nlm.nih.gov/18264420/)
- "Görünür bölgede saf su emilimi mavide düşüktür, UV, kırmızı ve IR'a doğru artar."
  "Görünür spektrumdaki **en yüksek emilim en uzun (kırmızı) dalga boylarındadır**."
  — [Ocean Optics Web Book](https://www.oceanopticsbook.info/view/absorption/absorption-by-oceanic-constituents)
- Kırmızı (~650 nm) için mertebe **~0.3-0.4 m⁻¹** — tam değer için
  [OMLC Optical Absorption of Water Compendium](https://omlc.org/spectra/water/abs/index.html)
  tablosuna bakılmalı. Kesin sayı bu aramada teyit edilmedi — **BELİRSİZ (mertebe doğru)**.
- Pratik: kırmızı mavinin **~50-100 katı** hızla soğurulur.

**Çeşme ölçeğinde anlamı [TÜRETİM]:** 2 m su yolu için kırmızı iletim `exp(-0.34×2) = 0.51`,
mavi `exp(-0.01×2) = 0.98`. Yani derin havuzda kırmızı armatür belirgin sönükleşir ve
sahne maviye kayar — ama 30 cm'lik sığ çeşme haznesinde etki **ihmal edilebilir**
(`exp(-0.34×0.3) = 0.90`). Simülatörde bu efekti su derinliğine bağlı yapmak doğru;
sığ splash pad'de kapatılmalı.

---

## 5. Uygulama önerileri — mevcut shader'a çevrilebilir formüller

Mevcut mimariye bağlanma noktaları (`2026-07-14-cihaz-render-desenleri.md`):
`particle.aeration` (0-1) zaten JSON şemasında VAR — bu alan artık ışık hattının da
ana anahtarı oluyor. Hüzme mesh'i için drei `SpotLightMaterial` (MIT) kararı da geçerli.

### 5.1 Hüzme açısının su/hava dönüşümü

```glsl
// Datasheet açısı HAVADA ölçülmüşse suya çevir.
// UYARI: su altı armatörlerin datasheet'i çoğu zaman ZATEN SUDA ölçülmüş açıyı verir.
// Cihaz kartında `beamAngleMeasuredIn: "air" | "water"` alanı ŞART. Aksi halde iki kez
// daralma hatası yaparız.
float airToWater(float fullAngleAir) {
    float halfAir = 0.5 * fullAngleAir;
    return 2.0 * asin(clamp(sin(halfAir) / 1.333, -1.0, 1.0));
}
```

Doğrulama tablosu [TÜRETİM] — 180°→97.2° satırı yayınlanmış değerle birebir tutuyor,
formül doğrulanmış sayılır:

| Havada (tam açı) | Suda (tam açı) |
|---|---|
| 10° | 7.5° |
| 15° | 11.2° |
| 25° | 18.7° |
| 30° | 22.4° |
| 45° | 33.4° |
| 60° | 44.0° |
| 90° | 64.1° |
| 120° | 81.1° |
| 180° | **97.2°** ✓ (kaynakla uyuşuyor) |

Küçük açılar için ucuz yol: `θ_su ≈ θ_hava / 1.33`.

### 5.2 DMX → yoğunluk (dimming eğrisi)

```glsl
// square-law: sürücü, ALGIYI lineerleştirmek için çıkışı girişin karesiyle üretir.
// gammaCurve varsayılan 2.0 (square law, belgeli). 2.2 yaygın pratik ama BELİRSİZ.
// Cihaz kartında ayarlanabilir olmalı — gerçek eğri dimmer×sürücü birleşimidir.
float dmxToLinear(float dmx01, float gammaCurve) {
    return pow(clamp(dmx01, 0.0, 1.0), gammaCurve);
}
// 16-bit fine kanal VAR → 8-bit kuantalama YAPMA, float sakla.
```

### 5.3 RGBW → lineer RGB

```glsl
// W kanalı RGB'ye EKLENİR, türetilmez. CCT 3000K veya 4000K.
vec3 rgbwToLinear(vec4 rgbw, vec3 whiteChromaticity /* kelvinToRGB(3000|4000) */) {
    return rgbw.rgb + rgbw.a * whiteChromaticity;
}
// Doygunluk kaybı bu toplamadan doğal olarak çıkar — ayrıca modellemeye gerek yok.
```

### 5.4 Aerated parçacık boyama (ANA FORMÜL)

```glsl
// L = parçacıktan armatüre birim vektör, V = parçacıktan kameraya birim vektör
// cosT = ileri saçılma açısının kosinüsü (ışık yönü ile bakış yönü arası)

float hg(float cosT, float g) {
    float g2 = g * g;
    float d  = 1.0 + g2 - 2.0 * g * cosT;
    return (1.0 - g2) / (12.5663706 * pow(max(d, 1e-4), 1.5));
}

vec3 paintAeratedParticle(
    vec3  lightColorLinear,   // §5.3 çıktısı × §5.2 yoğunluğu
    float distFixture,        // armatürden mesafe (m)
    float coneAxisDot,        // dot(normalize(p - fixturePos), beamDir)
    float cosHalfWater,       // cos(0.5 * θ_su)
    float aeration,           // 0..1, JSON şemasındaki mevcut alan
    float cosT                // dot(-L, V)
) {
    // 1) Koni maskesi — kenar yumuşatma penumbra
    float cone = smoothstep(cosHalfWater * 0.94, cosHalfWater * 1.02, coneAxisDot);

    // 2) Ters kare + yakın alan yumuşatma
    float fall = 1.0 / (1.0 + distFixture * distFixture);

    // 3) Faz fonksiyonu — çok-saçılım izotropikleştirir (§3.4 türetimi)
    //    seyrek mist -> ileri saçılma baskın; yoğun köpük -> Lambert benzeri
    float gEff  = mix(0.85, 0.05, smoothstep(0.3, 0.8, aeration));
    float phase = mix(hg(cosT, gEff), 0.0795775 /* 1/4pi */, smoothstep(0.5, 0.9, aeration));

    // 4) Boyama kazancı — aeration'a monoton bağlı (laminer -> 0)
    float paintGain = smoothstep(0.15, 0.60, aeration);

    // 5) Albedo ~= 1 (köpük SOĞURMAZ) -> ışık rengi BİREBİR geçer, su rengi karışmaz
    return lightColorLinear * cone * fall * phase * paintGain * 12.566;
    // 12.566 = 4pi normalizasyonu, phase'in 1/4pi'sini geri alır
}
```

**Parametre aralıkları:**
| Parametre | Aralık | Varsayılan | Gerekçe |
|---|---|---|---|
| `gEff` (seyrek mist) | 0.7 - 0.9 | 0.85 | doğal ortamlar 0.7-0.99 (Wikipedia HG) |
| `gEff` (yoğun köpük) | 0.0 - 0.2 | 0.05 | çok-saçılım izotropikleştirir [TÜRETİM] |
| `paintGain` eşikleri | 0.10-0.20 → 0.50-0.70 | 0.15 → 0.60 | ayarlanabilir olmalı |
| `aeration` (geyser) | 0.8 - 1.0 | 0.9 | kar beyazı opak kütle |
| `aeration` (comet jet) | 0.2 - 0.5 | 0.3 | mevcut şemada zaten 0.3 |
| `aeration` (laminer) | 0.0 - 0.05 | 0.0 | cam çubuk |

### 5.5 Laminer gövde — ışık borusu (İKİNCİ ANA FORMÜL)

```glsl
// Laminer jet BOYANMAZ. Işığı taşır ve İKİ yerde bırakır:
//   (a) kopma/uç noktası, (b) çarpma noktası.
// Gövde sadece hafif fresnel kenar parıltısı verir.

struct PipeResult { float bodyRim; float tipBurst; float impactPool; };

PipeResult lightPipe(
    float sAlongJet,      // 0=nozul, 1=uç, jet boyunca normalize konum
    float breakupS,       // kopma noktasının s değeri (0..1)
    float surfaceQuality, // 0..1 : 1=cam gibi temiz, 0=kirli/çizik/kabarcıklı
    float fresnel         // pow(1 - dot(N,V), 2..3)
) {
    // TIR ile iletim: kopma noktasına kadar taşır, sonra ÖLÜR (Firgelli)
    float alive = step(sAlongJet, breakupS);
    // Kusurlu yüzeyde yol boyunca sızıntı; temiz yüzeyde kayıp ~0
    float leak  = mix(2.5, 0.08, surfaceQuality);   // m^-1 mertebesi
    float T     = exp(-leak * sAlongJet) * alive;

    return PipeResult(
        T * fresnel * 0.25,   // gövde: DÜŞÜK, sadece kenar parıltısı (0.15-0.30)
        T * 3.0,              // uç: patlama, fiber optiğin ucu gibi
        T * 1.5               // çarpma: su yüzeyinde ışık havuzu
    );
}
```

**Somut kısıtlar (kaynaklı):**
- `breakupS` fiziksel karşılığı: görsel tavan **~5 m** — pompayı zorlamak bu tavanı
  yükseltmez (Firgelli). Jet 5 m'den uzunsa üstü karanlık kalmalı.
- `surfaceQuality` düşükse "jet yarı yüksekliğinde donuk görünür" (Firgelli) — yani
  `leak` yüksekken `exp(-2.5 × 0.5) ≈ 0.29`, tam da yarıda sönme davranışı. ✓

### 5.6 İki hattın çapraz geçişi (tek anahtar: `aeration`)

```glsl
float paintGain = smoothstep(0.15, 0.60, aeration);          // köpük hattı
float pipeGain  = 1.0 - smoothstep(0.05, 0.35, aeration);    // laminer hattı
// Toplam ~1 civarında kalır; ara bölgede ikisi de kısmen aktif (gerçekçi:
// yarı-havalandırılmış jet hem hafif boyanır hem hafif iletir)
```

Bu tek satır, cihaz kartlarındaki `aeration` alanını ışık davranışının **tek kaynağı**
haline getiriyor — nozul taksonomisi ile ışık hattı otomatik tutarlı oluyor.

### 5.7 Su içi Beer-Lambert (per-kanal, sadece SU ALTI yolu için)

```glsl
// Sadece ışığın SU İÇİNDE katettiği mesafeye uygula (havadaki jet için DEĞİL).
// Kaynak mertebeleri: mavi ~0.004-0.01, yeşil ~0.05, kırmızı ~0.34 (m^-1)
const vec3 WATER_SIGMA_A = vec3(0.34, 0.05, 0.008);   // R,G,B — kırmızı BELİRSİZ ±0.06

vec3 waterAbsorb(vec3 c, float underwaterPathMeters) {
    return c * exp(-WATER_SIGMA_A * underwaterPathMeters);
}
// Sığ splash pad (<0.5 m) için etki <%10 -> performans için KAPATILABİLİR.
```

### 5.8 Snell penceresi ayrımı — armatürden çıkan ışığın iki kaderi

```glsl
// Yüzey normaline göre 48.6°'den DAR olan kısım havaya çıkar (jeti boyar),
// yatık kısım tamamen geri yansır (havuz suyunu doldurur).
const float COS_CRIT = 0.6614;   // cos(48.6°)

float escapesToAir(vec3 rayDirUp, vec3 surfaceNormal) {
    float c = dot(normalize(rayDirUp), surfaceNormal);
    return smoothstep(COS_CRIT - 0.05, COS_CRIT + 0.05, c);  // yumuşak geçiş = dalgalı yüzey
}
// escape  -> jet/sprey boyama hattına
// 1-escape -> havuz içi dolaylı aydınlatma + kostik hattına
```
Not: gerçek yüzey dalgalı olduğu için keskin kesme yerine `smoothstep` doğru — kaynaklar da
"su yüzeyi pürüzlüyse kritik açı daha küçük olur" diyor.

### 5.9 Gece kamerası post-process zinciri (sıra önemli)

```
1. HDR lineer render (tone mapping ÖNCESİ)
2. Bloom:  threshold = 1.0
           5-6 seviyeli mip downsample + upsample zinciri
           blend  = 0.04 (0.03 - 0.08 aralığı)
3. Ekran-uzayı hayalet/halo: ters-ölçek kopyalar, düşük ağırlık (0.02-0.05)
4. Starburst: VARSAYILAN KAPALI.
   Açılırsa: bıçak sayısı n çift -> n çivi, n tek -> 2n çivi.
   Sadece "kısık diyafram / uzun pozlama" görünümünde anlamlı.
5. Islak yüzey: roughness *= (1 - wetness*0.8); yansımayı dikeyde uzat  [BELİRSİZ - pratik]
6. Tone mapping + kamera gürültüsü (gece çekiminde yüksek ISO -> ince grain)
```

### 5.10 Hüzme hacmi (volumetrik koni)

Mevcut karar (drei `SpotLightMaterial`) geçerli. Üzerine eklenecek:

```glsl
// Ray-march içinde enerji-korumalı Beer-Lambert adımı:
//   T *= exp(-sigma_t * stepSize);
//   L += T * (sigma_s / sigma_t) * (1 - exp(-sigma_t * stepSize)) * phase * lightColor;
// Bu form adım boyutundan BAĞIMSIZ olarak enerji korur.
```
Kaynak: [Chris Wallis, Volumetric Rendering Part 2](https://wallisc.github.io/rendering/2020/05/02/Volumetric-Rendering-Part-2.html),
[GM Shaders, Volumetric Raymarching](https://mini.gmshaders.com/p/volumetric)

Havadaki sis yoğunluğu `sigma_t`: temiz gece havasında çok düşük — hüzme ancak **sprey
varsa** görünür. Yani çeşmede "görünür ışık huzmesi" sisin değil, **suyun kendisinin**
eseri. Bu, hüzme mesh'inin opaklığını `nearbyMistDensity`'ye bağlamamız gerektiği anlamına
geliyor; sabit opaklık sahte görünür.

### 5.11 Halka vs yan armatür montajı

```jsonc
"light": {
  "mount": "ring_concentric",   // veya "side_puck"
  "ringDiameterM": 0.181,        // FX-PRO ölçüsü
  "ledCount": 10,                // 10x4W
  "wattage": 40,
  "beamAngleDeg": 30,
  "beamAngleMeasuredIn": "water", // KRİTİK — iki kez daralma hatasını önler
  "whiteCCT": 3000,
  "dmxMode": "4ch",              // 4ch | 5ch | 8ch
  "dimmingGamma": 2.0
}
```
- `ring_concentric` → jet her yönden eşit boyanır, armatür jetin altında parlak disk
- `side_puck` → asimetrik boyama; ışığa bakan yüz parlak, arka yüz gölgeli
  (bu ayrım görsel olarak çok belirgin, atlanmamalı)

---

## 6. Kaynakça

**Ürün / üretici**
1. OASE LunAqua Power LED XL — https://www.oase.com/en/products-a-z/family/f/lunaqua-power-led-xl.1000649963.html
2. OASE LunAqua Power LED (aile) — https://www.oase.com/en/products-a-z/family/f/lunaqua-power-led.1000926925.html
3. Lincs Aquatics, LunAqua XL 4000 Narrow Spot 10° — https://www.lincsaquatics.com/oase-lunaqua-power-led-xl-4000-narrow-spot-p10098
4. Lincs Aquatics, LunAqua XL 3000 Spot 15° — https://www.lincsaquatics.com/oase-lunaqua-power-led-xl-3000-spot-p10240
5. Lumascape Woda W3 (LS5030) — https://www.lumascape.com/products/ls5030  *(403, veriler arama sonucundan)*
6. Lumascape, Woda W3 yeni ürün duyurusu — https://www.lumascape.com/company/news/facade-lighting/woda-w3-new-product-release
7. Lumascape ürün yelpazesi — https://www.lumascape.com/products
8. Fountain People FX-PRO Ring RGBW — https://www.fountainpeople.com/products/fxpro-ring-rgbw-led-light
9. Fountain People FX-PRO RGBW40 — https://www.fountainpeople.com/products/fx-pro-series-rgbw40-led
10. Superlighting LED, DMX512 RGB IP68 su altı — https://www.superlightingled.com/dc1224v-691215182436w-rgb-dmx512-addressable-led-underwater-light-ip68-swim-pool-fountain-light-for-fountains-ponds-p-1813.html
11. Waking Lighting, su altı hüzme açısı seçimi — https://wakinglighting.com/how-to-choose-the-suitable-beam-angle-of-underwater-lights/
12. Ligman, su altı çeşme aydınlatması — https://www.ligman.com/underwater-lights/

**DMX / RDM / dimming**
13. Chauvet Ovation B-565FC DMX chart — https://www.chauvetprofessional.com/wp-content/uploads/2016/05/Ovation_B-565FC_DMX_Chart_Rev2.pdf
14. Coemar ParLite LED RGBW DMX chart (8/4ch) — https://www.coemar.com/wp-content/uploads/2018/02/DMX-chart-ParLite-Led-RGBW-1.pdf
15. 4 kanallı DMX→RGBW dekoder manueli — https://www.martin-supply.com/images/pdf/VENDOR%20TECH%20DATA%20SHEETS/4Ch-DMX-to-RGBW-LED-Controller-Manual_M.pdf
16. Solid Apollo iChroma DMX RGBW dekoder — https://www.solidapollo.com/ichroma-dmx-rgbw-led-decoder.html
17. ECMag, Ahead of the Dimming Curve — https://www.ecmag.com/magazine/articles/article-detail/lighting-ahead-dimming-curve
18. RC4 Wireless, dimmer curves sözlüğü — https://rc4wireless.com/glossary/dimmer-curves/
19. Lumos Controls, doğru dimming eğrisi — https://lumoscontrols.com/resources/how-to-choose-the-right-dimming-curve/
20. Wikipedia, RDM (lighting) — https://en.wikipedia.org/wiki/RDM_(lighting)
21. ANSI E1.20-2010 — https://webstore.ansi.org/standards/esta/ansie1202010
22. Open Lighting Project, E1.20 wiki — https://wiki.openlighting.org/index.php/E1.20
23. LIGMAN, DMX/RDM girişi — https://www.ligman.com/dmx-dmx-rdm/

**Optik / fizik**
24. Wikipedia, Snell's window — https://en.wikipedia.org/wiki/Snell's_window
25. U. Arizona Optical Sciences, Snell's Window — https://wp.optics.arizona.edu/oscoutreach/snells-window/
26. Fly Life Magazine, Snell's Window — https://flylifemagazine.com/wednesday-fish-facts-snells-window/
27. Harvard Natural Sciences, "Bucket of Light" (su jetinde TIR) — https://sciencedemonstrations.fas.harvard.edu/presentations/bucket-light
28. US Patent 8523087, Surface disruptor for laminar jet fountain — https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8523087
29. Firgelli, Luminous Fountain Mechanism — https://www.firgelliauto.com/blogs/mechanisms/luminous-fountain
30. WaterfallNow, Optical Water Jet LED — https://waterfallnow.com/optical-water-jet-led/amp/
31. ScienceABC, şelale neden beyaz görünür — https://www.scienceabc.com/eyeopeners/why-does-water-appear-white-while-going-over-a-waterfall
32. Scattering optics of foam — https://www.researchgate.net/publication/5492844_Scattering_optics_of_foam
33. Springer, Light scattering by bubbles in liquids — https://link.springer.com/article/10.1007/BF00385967
34. Wikipedia, Henyey-Greenstein phase function — https://en.wikipedia.org/wiki/Henyey%E2%80%93Greenstein_phase_function
35. NVIDIA, An Approximate Mie Scattering Function for Fog and Cloud Rendering — https://research.nvidia.com/labs/rtr/approximate-mie/
36. miepython, Mie Scattering and Fog — https://miepython.readthedocs.io/en/latest/05_fog.html
37. Wikipedia, Mie scattering — https://en.wikipedia.org/wiki/Mie_scattering
38. PSU METEO 300, saçılma — https://courses.ems.psu.edu/meteo300/node/785
39. Pope & Fry 1997, saf su emilim spektrumu — https://pubmed.ncbi.nlm.nih.gov/18264420/
40. OMLC, Optical Absorption of Water Compendium — https://omlc.org/spectra/water/abs/index.html
41. Ocean Optics Web Book, absorption by oceanic constituents — https://www.oceanopticsbook.info/view/absorption/absorption-by-oceanic-constituents
42. Filix Lighting, suda ışık iletimi — https://www.filixlighting.com/news-preview/how-light-transmits-in-water

**Render / kamera**
43. Wikipedia, Bloom (shader effect) — https://en.wikipedia.org/wiki/Bloom_(shader_effect)
44. LearnOpenGL, Physically Based Bloom — https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom
45. Unity Post Processing, Bloom — https://docs.unity3d.com/Packages/com.unity.postprocessing@3.2/manual/Bloom.html
46. Froyok, Custom Bloom in Unreal Engine — https://www.froyok.fr/blog/2021-12-ue4-custom-bloom/
47. John Chapman, Screen Space Lens Flare — https://john-chapman.github.io/2017/11/05/pseudo-lens-flare.html
48. Wikipedia, Diffraction spike — https://en.wikipedia.org/wiki/Diffraction_spike
49. PetaPixel, The Physics Behind Sunbursts — https://petapixel.com/2018/05/19/the-physics-behind-sunbursts-and-how-it-can-help-you-focus-your-photos/
50. NVIDIA GPU Gems Ch.2, Rendering Water Caustics — https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics
51. Evan Wallace, Rendering Realtime Caustics in WebGL — https://medium.com/@evanwallace/rendering-realtime-caustics-in-webgl-2a99a29a0b2c
52. jeantimex/threejs-water (MIT) — https://github.com/jeantimex/threejs-water
53. Martin Renou, Real-time rendering of water caustics — https://medium.com/@martinRenou/real-time-rendering-of-water-caustics-59cda1d74aa
54. Chris Wallis, Volumetric Rendering Part 2 — https://wallisc.github.io/rendering/2020/05/02/Volumetric-Rendering-Part-2.html
55. GM Shaders, Volumetric Raymarching — https://mini.gmshaders.com/p/volumetric

---

## Ek: BELİRSİZ işaretli maddelerin listesi

Bunlar doğrulanmadan sayı olarak sabitlenmemeli:

1. **RGBW armatürlerin gerçek lümen çıkışı** — üreticiler yayınlamıyor. Beyaz için 83 lm/W
   belgeli; RGBW toplam akısı için sağlam kaynak yok.
2. **FX-PRO serisinin hüzme açısı ve DMX kanal sayısı** — ürün sayfalarında yok.
   Datasheet PDF'i (görsel) okunmadı.
3. **Sis/su damlacığı için spesifik g = 0.8-0.9** — genel doğal ortam aralığı 0.7-0.99
   belgeli; sis için tam sayı teyit edilmedi. Ayrıca NVIDIA büyük damlacıklarda HG'nin
   ileri saçılma için kötü olduğunu söylüyor.
4. **Gamma 2.2 dimming** — square law (γ=2) belgeli, 2.2 değil.
5. **Kırmızı için tam emilim katsayısı (0.34 m⁻¹)** — mertebe doğru ve trend belgeli,
   tam sayı OMLC tablosundan okunmalı.
6. **Islak yüzey yansıma uzaması reçetesi** — kaynak bulunamadı, standart PBR pratiği.
7. **Su altı armatür datasheet açılarının havada mı suda mı ölçüldüğü** — üreticiye göre
   değişiyor olabilir. Lumascape'in 12°-55° listesi muhtemelen SUDA (su altı ürün), OASE'ın
   10°-45° listesi belirsiz. Bu, iki kez daralma hatasına yol açabilecek en riskli nokta —
   gerçek proje datasheet'i eline geçtiğinde ilk doğrulanacak şey bu.
8. **`leak` katsayısı (2.5 / 0.08 m⁻¹)** — Firgelli'nin "yarı yükseklikte sönme" ve "~5 m
   tavan" nitel ifadelerinden geri hesaplandı [TÜRETİM], ölçüm değil.
