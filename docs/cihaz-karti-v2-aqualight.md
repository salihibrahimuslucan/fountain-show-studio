# KART v2 — AquaLIGHT 412 / 412C / 406 / 406C

v7 "cihaz birebir" turu, TUR 1. Süreç adımı **2 (KART v2)** tamamlandı →
sıradaki **adım 3 [ELLE] onay kapısı** (Salih okur, düzeltir; onaysız KOD YOK).

Kaynaklar:
- Yerel: `dahili katalog metni` (üretici kataloğu),
  `URUN_KUNYE.md` §4, `product-dev/` ürün render'ları + `companents/light/` parça kütüphanesi
- Sektör + fizik: `docs/2026-07-18-su-alti-isik-referansi.md`

Etiketler: ✅ katalogdan doğrulandı · ⚠ çıkarım · ❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Optik — 60° / 10° iddiası ✅ DOĞRULANDI, sayısal olarak

Katalog koni tablosu tanjantla birebir tutuyor:
- **60° lens** (yarı-açı 30°) → 10 m'de 11.54 m çap. `2·10·tan30° = 11.547` ✓
- **10° lens** (yarı-açı 5°) → 10 m'de 1.74 m çap. `2·10·tan5° = 1.749` ✓

⚠ Parça kütüphanesinde katalogda basılmayan lensler de var: **20°, buzlu
(difüzör), çukur**. → ❓ **[ELLE] S1:** simülatörde 4 lens seçeneği mi sunalım
(10/20/60/buzlu), yoksa katalogdaki 2 mi?

**⚠ KRİTİK AYRIM — bu açı havada mı suda mı ölçüldü?**
Su kırılma indisi 1.333, hüzme suda **daralır**: `θ_su = 2·asin(sin(θ_hava/2)/1.333)`.
- 60° havada → **44° suda**
- 10° havada → **7.5° suda**

Yanlış tarafı seçersek koni iki kez daralır veya hiç daralmaz. Katalog tablosu
mesafe/çap veriyor ama ortamı yazmıyor.
→ ❓ **[ELLE] S2 (EN ÖNEMLİ SORU):** katalogdaki koni tablosu **havada** mı
ölçüldü (lens datasheet'i, tipik) yoksa **suda** mı? Bilmiyorsan varsayılanım:
havada ölçülmüş kabul edip suya çevireceğim (lens üreticisi havada ölçer).

## 3. LED dizilimi

- **406 / 406C ✅:** katalog metni birebir — *"6 RGB and 6 natural white LEDs,
  or 6 amber LEDs"* → **12 LED (6 RGB + 6 W/A)**. Mevcut gövde 12 LED, doğru.
- **412 / 412C ⚠:** katalogdaki 412C metni 406C'nin **kopyala-yapıştır hatası**
  (aynı cümle, aynı 1746 lm — oysa tablo 48 W / 4620 lm diyor). Güç ve akı tam
  2×/2.65× olduğuna göre **24 LED (12 RGB + 12 W/A)** çıkarımı.
→ ❓ **[ELLE] S3:** 412'de LED sayısı 24 mü? (Üretimden bakabilirsin — kart
buna göre yazılacak, tahminle kod yazmam.)

Halka yarıçapı gövdenin ~0.7 çapı (mevcut model), ayrık LED — dolu yüzey değil. ✅

## 4. Renk ve kontrol

- **RGBW modeli:** beyaz kanal RGB'ye **EKLENİR**, RGB'den türetilmez.
  `renk = rgb + w · beyazKromatiklik`. Doygunluk kaybı bu toplamadan doğal çıkar.
- ⚠ WW (warm white) kaç K, AA (amber) kaç nm — **hiçbir kaynakta yok**.
  Sektör standardı: 3000K sıcak / 4000K nötr.
  → ❓ **[ELLE] S4:** WW kaç K? Amber dalga boyu? Bilmiyorsan 3000K varsayacağım.
- **Dimming eğrisi LİNEER DEĞİL — square-law.** `parlaklik ≈ (dmx/255)²`.
  Simülatörde şu an dim **hiç yok** (`visible = v > 0.02` ikili aç/kapa).
  Bu, "kamaşma dengesi" şikâyetinin sessiz sebeplerinden biri.
- **DMX kanal haritası ❌ hiçbir kaynakta yok.** Sektör tabanı 4ch (R,G,B,W),
  genişletilmiş 8ch (+master dim, dim fine, makro, strobe).
  → ❓ **[ELLE] S5:** 412C kaç DMX kanalı? Sende kanal listesi var mı?
  (Depence kütüphanesi katalogda anılıyor — oradan da çıkabilir.)

## 5. Suyu boyama — Salih'in 1. şikâyetinin kök sebebi

Araştırmanın en değerli çıktısı, üç bağımsız kaynakla (Harvard fizik demosu,
ABD patenti 8523087, sektör yazısı) sabitlendi:

| | **Aerated su** (geyser, köpüklü jet) | **Laminer su** (SWITCH, cam çubuk jet) |
|---|---|---|
| Işıkla ilişkisi | **BOYANIR** — kabarcıklarda çok-saçılım | **BOYANMAZ — İLETİR** (fiber optik gibi) |
| Sebep | albedo≈1, köpük soğurmaz saçar | su/hava kritik açı 48.6° → tam iç yansıma |
| Görünüm | ışığın rengini **birebir** alır, izotropik | gövde koyu, ışık **uçta ve çarpmada** patlar |
| Işık nerede ölür | yol boyunca dağılır | **kopma noktasında** (görsel tavan ~5 m) |

**Yani mevcut modelimiz iki yerde birden yanlış:**
1. Aerated suyu yeterince boyamıyoruz (şikâyet 1).
2. Laminer suyu boyuyoruz — oysa laminer gerçekten de ışık borusu gibi
   davranır. **Salih'in "laminer iniş su değil ışık hüzmesi gibi" şikâyeti
   aslında YARI DOĞRU gözlem:** laminer gerçekten ışık taşır, ama bizimki
   kopma noktasında ÖLMÜYOR ve uçta patlamıyor — sürekli hüzme gibi duruyor.
   Doğru düzeltme "ışığı söndürmek" değil, **kopma + uç patlaması + çarpma
   havuzu** eklemek.

Tek anahtar: `aeration` alanı (JSON şemasında zaten var) hem su hattını hem
ışık hattını sürer — `paintGain` (boyama) ile `pipeGain` (iletim) çapraz geçişli.

→ **[ELLE] K1:** Bu ayrım doğru mu? Sahada laminer jet gerçekten ucunda mı
parlıyor, gövdesi koyu mu kalıyor?

## 6. Kamaşma / glare — 3. şikâyet

- Bloom + yumuşak halo **evet**.
- **Starburst (yıldız çivileri) KAPALI olmalı** — kırınım çivileri yalnız kısık
  diyaframda (f/11+) çıkar; gerçek gece çeşme çekimi f/1.8-2.8'de yapılır.
  v6 F7'de star-burst ShaderPass eklemiştik → **gerçeğe aykırı, sahte
  gösteriyor.** Öneri: kaldır veya varsayılan kapalı.
  → **[ELLE] K2:** star-burst kalksın mı? (Bence kalksın.)
- Su içinde renk emilimi per-kanal: kırmızı ~0.34 m⁻¹, mavi ~0.004 m⁻¹ →
  su altında kırmızı hızla ölür, mavi gider. Şu an modellenmemiş.

## 7. Simülatörün mevcut hâli ↔ gerçek (açık listesi)

| Konu | Gerçek | Şimdi | |
|---|---|---|---|
| Koni açısı 60°/10° | katalogda doğrulanmış | **yok** — sabit Ø4.8 m ışık gölü | ❌ |
| Lümen hiyerarşisi | 412=4620, 406=1746 (2.65×) | hepsi aynı `golKazanc 0.9` | ❌ |
| Dim | DMX sürekli, square-law | ikili aç/kapa | ❌ |
| Beyaz kanal | ayrı W/A kanalı | `setHSL(h, 1.0, 0.55)`, doygunluk hep 1 | ❌ |
| non-C (deliksiz) | 3025/3026 gerçek ürün | katalogda ve gövdede **yok** | ❌ |
| Gövde çapı | Ø160 mm | Ø180 mm (`r=0.09`) | ⚠ %12 büyük |
| Gövde yüksekliği | 70 mm | 40 mm | ⚠ |
| Merkez altıgen (C) | var | var, Ø~43 mm | ✅ form doğru |
| LED 12 ayrık halka | 406 için doğru | 12, tüm modeller | ✅ / ⚠ 412 |

## 8. Onay sonrası KOD planı (adım 4 — karttan sapma yok)

1. **Gövde ölçü düzeltmesi** — Ø160×70 mm; non-C deliksiz varyant eklenir; 412'de LED sayısı (S3 cevabına göre).
2. **Katalog** — 412 ve 406 (non-C) kayıtları eklenir; `lumen` artık metadata değil, parlaklık ölçeğini sürer.
3. **Optik** — lens seçimi preset alanı (`lens: 10|20|60|buzlu`), `olcumOrtami: 'hava'|'su'` alanı (S2), koni maskesi + su/hava dönüşümü.
4. **Dim + RGBW** — square-law eğri, W/A ayrı kanal, `setParlaklik` ikili olmaktan çıkar.
5. **Su boyama** — aerated `paintGain` (HG faz fonksiyonu, `gEff = mix(0.85, 0.05, aeration)`), laminer `pipeGain` (TIR iletimi + kopmada ölüm + uç patlaması + çarpma havuzu).
6. **Kamera** — star-burst kaldır (K2), su altı Beer-Lambert per-kanal.
7. **KIYAS** — 412C tek cihaz, dört renk ayrı ayrı, 60° ve 10° lens; önce/sonra kareleri yan yana.

---

## [ELLE] onay kapısı — Salih'in cevaplaması gerekenler

| # | Soru | Cevap yoksa varsayılanım |
|---|---|---|
| **S1** | Lens seçeneği 4 mü (10/20/60/buzlu) yoksa 2 mi (10/60)? | 4 sunarım, varsayılan 60° |
| **S2** | Katalog koni tablosu **havada** mı **suda** mı ölçüldü? ⭐en kritik | havada kabul, suya çeviririm |
| **S3** | 412'de LED sayısı 24 mü (12 RGB + 12 W/A)? | 24 kabul ederim |
| **S4** | WW kaç K, amber kaç nm? | 3000K |
| **S5** | DMX kanal sayısı/haritası? | 4ch (R,G,B,W) |
| **K1** | Laminer gerçekten gövdesi koyu / ucu parlak mı? | evet kabul |
| **K2** | v6'daki star-burst kalksın mı? | kalkar |

Ek: karta katmadığım ama boşluk olarak duran değerler — merkez delik ölçüsü,
kanal başına lümen dağılımı, çalışma sıcaklığı/L70, `409` modeli (parça
kütüphanesinde var, katalogda yok).

---

## 9. Depence cila kartı (2026-07-22 hazırlık — GÖRSEL KAPI öncesi)

⚠ **Kapsam notu:** Bu bölüm spec 2026-07-21'in eklediği 4. adımı (GÖRSEL KAPI)
karşılamak için sonradan eklendi — §1-8 (TUR 1, KAYNAK+KART) zaten tamamdı,
yalnız "Depence cila kartı" eksikti (VARIO §8 emsali). KOD/GÖRSEL KAPI, bu
turun kendi kapısı (üstteki [ELLE] S1-S5/K1-K2) Salih'te cevaplanıp mini-paket
kapanınca başlar — bu bölüm yalnız hazırlık.

Roadmap'te "AL-412/406-412" tek tur olarak anılıyor çünkü tek fiziksel
aile — 412/406/412C/406C aynı gövde (§1), fark yalnız güç/lümen VE **lens
seçimi** (§2: 10° dar / 60° geniş). Envanterin "412 (sert) vs 406-412
(etekli)" ayrımı (madde #19-20) bu lens seçimine karşılık geliyor: **412 dar
lensle SPOT, 406-412 geniş lensle WASH** karakterine bürünüyor — iki ayrı
ürün değil, aynı fikstürün iki konfigürasyonu.

### Hedef kareler (`docs/referans/depence-kareler.md` satır 40-43)

| Kare | Kaynak | Ne öğretiyor |
|---|---|---|
| `kare/al412-hedef-1.jpg` | OASE t=55 | jet tabanında noktasal LED parlaması; ışık jet gövdesini İÇERİDEN boyuyor; camgöbeği monokrom |
| `kare/al412-hedef-2-gercek.jpg` | üretici görseli [GERÇEK], drydeck switch.mp4 t=32 | LED halka fiili görünüm: amber/altın halkalar jet tabanını aşırı parlak boyuyor, jet gövdesi tabandan yukarı sönümleniyor; sağda kırmızı halka — renk kanalı ayrışması; halo + mist etkileşimi |
| `kare/al412c-406c-fark-karti.jpg` | üretici ürün fotoğrafı [GERÇEK] | AL-412C/406C gövde referansı: flanşlı paslanmaz halka, 12 lens yuvası, merkez nozul deliği (LED sayısı/dizilim kıyası için, bkz. §3 S3) |
| `kare/al406412-hedef-1.jpg` | OASE t=90 | geniş renk yıkaması: amber/mor/pembe/yeşil yelpaze modülleri + beyaz LED taban hattı; renk bloklarının yan yana ayrışması — WASH konfigürasyonunun hedefi |

### Bu turda uygulanacak efektler (envanterden, C bölümü)

| Envanter | Efekt | Karedeki karşılığı | Öncelik |
|---|---|---|---|
| #18 | Parametrik volumetrik koni (tek shader: açı, kenar yumuşaklığı, menzil, saçılım) | 412/406-412/DryDECK'i TEK kod yolunda parametreyle ayırma | 1 (temel) |
| #19 | Beam/field çift açı: spot'ta sert kenar, wash'ta yumuşak etek | al412-hedef-1 (sert nokta) ↔ al406412-hedef-1 (yumuşak yelpaze) | 1 (temel) |
| #20 | Gerçek açı değerleri: 412 ≈ 10-15°, 406-412 ≈ 45-90° | katalog §2 lens tablosuyla birebir (10°/60°) | 1 (§2'den zaten var, koniye bağlanacak) |
| #22 | Kanal-bazlı su sönümü (uzun huzme ucu camgöbeğine kayar) | al412-hedef-2 "jet gövdesi tabandan yukarı sönümleniyor" | 2 |
| #26 | CCT beyaz noktası farkı (412=delici, 406-412=nötr) | al406412-hedef-1'deki "beyaz LED taban hattı" ile 412'nin camgöbeği tonu arasındaki fark | 2 |
| #24 | IES 1D radyal yoğunluk profili | düz koniyi gerçek armatür huzmesine çevirir | 3 (sonraki dalga) |
| #25 | Taban deseni ayrışması (spot=keskin leke, wash=geniş kostik) | al412-hedef-1 nokta ↔ al406412-hedef-1 yelpaze taban izi | 3 (sonraki dalga) |

### Aydınlatma karakteri (ayrışma kuralı — spec §2 KART v2, VARIO §8 emsali)

| | AL-412 (spot, dar lens) | AL-406-412 (wash, geniş lens) | DryDECK entegre (C-halka) |
|---|---|---|---|
| Koni açısı | 10-15° (katalog §2: 10° lens) | 45-90° (katalog §2: 60° lens) | halka, koni değil (§7 DryDECK kartı) |
| Kenar | sert (beam≈field) | yumuşak etek (field≫beam) | yok — nokta kaynak dizisi |
| Taban izi | tek keskin leke | geniş dalgalı yelpaze | jet dibi çemberi |
| Renk sıcaklığı | camgöbeği/delici (soğuk beyaz kanal ağırlıklı) | nötr (RGB+beyaz dengeli yıkama) | RGB doygun (Depence deseni) |
| Varsayılan kullanım | tek jet vurgusu | sahne geneli renk yıkaması | zemin/nozul dibi |

### [ELLE] cila soruları (görsel kapıda sorulacak — bu turun KOD'u yapılınca)

| # | Soru |
|---|---|
| A1 | Spot (412, dar lens) al412-hedef-1'deki gibi tek keskin nokta veriyor mu, yoksa hâlâ genel/yumuşak mı? |
| A2 | Wash (406-412, geniş lens) al406412-hedef-1'deki yelpaze/renk-bloğu hissini veriyor mu? |
| A3 | Jet gövdesi tabandan yukarı doğru gerçekten sönümleniyor mu (al412-hedef-2), yoksa tekdüze mi parlıyor? |
| A4 | DryDECK C-halkasıyla 412/406-412 arasında sahnede gözle ayrışma okunuyor mu (üç farklı karakter, tek "ışık" hissi değil)? |
