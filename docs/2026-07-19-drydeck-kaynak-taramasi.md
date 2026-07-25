# DryDECK — KAYNAK taraması (v7 TUR 3, adım 1) · 2026-07-19

Bu dosya = ham hasat + aritmetik. Karar/karakter metni `docs/cihaz-karti-v2-drydeck.md`'de.
Kural (TUR 2 dersi): **ilk durak katalogun METİN KATMANI.** Bu turda da işe yaradı —
dört DryDECK varyantının TAM künyesi metin katmanında çıktı, künye dosyasında yoktu.

---

## A. Katalog metin katmanı — BİREBİR alıntı

Kaynak: `D:\Aquatronic\dahili katalog deposu\engine\catalog\_raw_text.txt`
(türev: `aquatronic catalog.pdf`). Satır numaraları raw_text'e ait.

### A1. AquaVARIO DryDECK — katalog s.38-39 (raw 1611-1658)

Gövde metni, birebir:

> "DryDECKs are ground nozzles installed flush with the ground, maintaining a
> **near-zero height and zero water level**, hence the term "dry pool." These systems
> are designed for interactive entertainment, allowing users to walk between the
> nozzles, get wet, and have fun. **Primarily used by children**, these nozzles are
> crafted with safety in mind without compromising enjoyment. There are various types
> available, each offering a unique experience. **A more professional version is also
> available for use in light and water shows, featuring higher water jets and
> integrated lighting** for added visual appeal."

TECHNICAL DETAILS (raw 1625-1642), birebir:

```
MODEL :            DryDECK AquaVARIO
DIMENSION (LxMxH): 300x300x368 mm
MATERIAL :         Stainless Steel
CURRENT :          1.5 A
WEIGHT :           7 kg
POWER :            18 W
POWER & DMX :      Combo Cable
VOLTAGE :          24 VDC
MAX PRESSURE :     0.3 Bar
```

Top Plate Options (raw 1643-1647), birebir:
> "Top Plate Round Ø 280 with Top Plate Holder. Top Plate thickness is 5mm."
> "Top Plate Premium 30x30 with Top Plate Holder. Top Plate thickness is 30mm."

Özellik listesi (raw 1650-1654), birebir:
> "**2 Different Nozzle Type** / RGB or RGBW power LED Light (OPTIONAL) /
> DMX-RDM Controlled / Robus Stainless Steel Body / Syncronorm Depence Library available"

### A2. AquaVARIO DryDECK Bucket — katalog s.40-41 (raw 1679-1711)

Gövde metni, birebir (⚠ ürün adı yanlış yazılmış, aşağıda §D6):

> "The innovative **DryDECK Switch** features a specially engineered plastic body that
> allows water flow control with **a single solenoid, unlike the classic two-solenoid
> design.** This advancement **reduces the on-off time to 0.1 second**, resulting in
> more dynamic animations. **Each unit's water height is precisely managed by its own
> individual 24VDC sub-pump.** With endless animation possibilities, this system is
> designed to bring your creative visions to life."

```
MODEL :            DryDECK AquaVARIO Bucket
DIMENSION (LxMxH): 280x459 mm            ← Ø x H okunmalı (silindir)
MATERIAL :         Stainless Steel
CURRENT :          5 A
WEIGHT :           15 kg
POWER :            18 W
POWER & DMX :      Combo Cable
VOLTAGE :          24 VDC
MAX PRESSURE :     0.5 Bar
```
Top Plate: "Round Ø 280 with Top Plate Holder. Top Plate thickness is 5mm."

### A3. AquaSWITCH DRYDECK (T-SWITCH) — katalog s.48-49 (raw 2031-2064)

> "This type is mostly used for **interactive entertainment** purposes. While there are
> different types, the core principle remains the same. It is **primarily designed for
> children**, ensuring safety without compromising enjoyment. There is also **a more
> professional version used for light and water shows. This version shoots higher and
> includes lights**, enhancing its visual appeal."

```
MODEL :            DryDECK T-SWITCH
DIMENSION (lxWxH): 300x300x350 mm
MATERIAL :         Stainless Steel
WEIGHT :           7 kg
POWER & DMX :      Combo Cable
VOLTAGE :          24 VDC
MAX PRESSURE :     1 Bar
CURRENT :          0.8 A
```
⚠ **POWER (W) satırı YOK** — bu üründe güç yazmıyor, yalnız akım var.

Top Plate Options (raw 2041-2048) — metin katmanı burada kendini tekrarlıyor, ayıklanmış hâli:
> "Top Plate Round Ø 280 with Top Plate Holder. Top Plate thickness is 5mm."
> "Top Plate Round 30x30 with Top Plate Holder. Top Plate thickness is 30 mm."

### A4. AquaSWITCH DRYDECK BUCKET — katalog s.48-49 (raw 2066-2094)

> "Instead of the classic two-solenoid control, the DryDECK Switch features a special
> plastic engineering body that allows water flow to be controlled with just one
> solenoid. **This design reduces the on-off time to 0.1 seconds**, resulting in more
> lively animations. It also improves efficiency and simplifies maintenance."

```
MODEL :            AquaSWITCH D.D Bucket
DIMENSION (ØxH) :  280x459 mm
MATERIAL :         Stainless Steel
CURRENT :          0.8 A
WEIGHT :           11 kg
POWER :            18 W
POWER & DMX :      Combo Cable
VOLTAGE :          24 VDC
MAX PRESSURE :     1 Bar
```

### A5. AquaSWITCH ana ürün debi tablosu — katalog s.46-47 (raw 1967-1989)

Metin katmanı sütunları karıştırmış; yükseklik etiketleri "2.00 :" ve "4.00 :"
görünüyor, 6.00 etiketi düşmüş. Değer sırası: 58 · 0,89 · 82 · 1,84 · 105 · 244 ·
3,82 · 1,24 · 156 · 0,44 · 204 · 0,84. Karakter kartındaki okumayla aynı eşleşme:

| Yükseklik | Ø14 l/dk | Ø14 bar | Ø16 l/dk | Ø16 bar |
|---|---|---|---|---|
| 2 m | 58 | 0.89 | 156 | 0.44 |
| 4 m | 82 | 1.84 | 204 | 0.84 |
| 6 m | 105 | 3.82 | 244 | 1.24 |

⭐ Bu tablo DryDECK için kritik: **DryDECK'in kendi yükseklik sayısı katalogda YOK**,
ama SWITCH DryDECK'in maks basıncı (1 bar) bu tabloya sokulabiliyor.

### A6. Işık — "DryDECK Option" hangi armatürlerde geçiyor

`DryDECK Option(s) :` satırı raw'da 9 yerde: 4309, 4466, 4732, 5001, 5135, 5334,
5580, 5670, 5849, 6048, 6286. Sayfa eşlemesi:

| Satır | Sayfa | Ürün |
|---|---|---|
| 4309 | s.53 | **STARLIGHT 303** (PN 3011, Ø110×62, 9 W, 0.38 A, 512 lm, RGB) |
| 5135 | s.60 | **STARLIGHT 403** (PN 3003, Ø110×62, 9 W, 0.38 A, 1155 lm, RGBW) |
| 4466 | s.55 | AquaLIGHT 306 **C** |
| 4732 | s.57 | AquaLIGHT 312 **C** |
| 5001 | s.59 | AquaLIGHT 406 **C** |
| 5334 | s.62 | AquaLIGHT 412 **C** |
| 5580 | s.64 | AquaLIGHT 512 **C** |
| 5849 | s.67 | AquaLIGHT 106 **C** |
| 6048 | s.69 | AquaLIGHT 112 **C** |
| 6286 | s.71 | AquaLIGHT 206 **C** |

⭐ **Desen kesin: "DryDECK Option" YALNIZ C-tipi (merkez delikli) armatürlerde ve iki
STARLIGHT spotunda var. C-siz hiçbir AquaLIGHT'ta yok.** → DryDECK aydınlatması ya
nozulun geçtiği C-halkası ya da plakaya gömülü STARLIGHT spotu.

### A7. Künye dosyası (ikinci durak) — `engine\catalog\URUN_KUNYE.md` s.59-65

| AquaVARIO DryDECK | 1050-tabanlı | 24VDC | 18 W | 1.5 A | zemin nozulu; **insan-açık → RCD 30mA** |
| AquaVARIO DryDECK Bucket | — | 24VDC | 18 W | 5 A | tek-solenoid bucket, **kendi suyu** |
| AquaSWITCH DryDECK (T-SWITCH) | — | 24VDC | — | 0.8 A | zemin; insan-açık |
| AquaSWITCH DryDECK Bucket | — | 24VDC | 18 W | 0.8 A | tek-solenoid |

Aynı dosya §"Eksik/belirsiz künye verisi" maddesi zaten **"DryDECK PN'leri"**ni eksik
ilan ediyor — yani PN'lerin yokluğu benim bulamamam değil, kaynakta yok.

---

## B. Sektör kaynakları (hepsi linkli)

| # | Bulgu | Kaynak |
|---|---|---|
| S1 | **"Nozzles that spray water from the interactive water play feature splash pad zone shall be flush with the zone surface. Openings in such nozzles shall not allow a 1/2 inch (12.7 mm) diameter dowel rod to be inserted into the opening. The water velocity from the orifice of any water nozzle shall not exceed 20 feet (6.1 m) per second."** — ISPSC 2021 §612.4.3 | https://up.codes/s/nozzles-within-the-interactive-water-play-feature-splash-pad-zone |
| S2 | Splash park sektör pratiği: dikey püskürten öğeler **~6 ft (1.83 m)** ile sınırlanır | https://cirsa.org/wp-content/uploads/2018/04/WaterSprayParkHbook.pdf |
| S3 | Dry deck nozul kuyusu: jet **"saniyede 10 kereye kadar" pop up/down** programlanır (= 0.1 s periyot); kuyu betonun altında, ızgara üstü **dry-deck ile hemyüz** | https://www.deltafountains.com/portfolio/custom-nozzle-well/ |
| S4 | Dry deck nozul kuyusu montaj tipleri: **"Pop Jet Assembly with Smooth Bore Nozzle"**, **"Pop Jet Assembly with Foam Jet Nozzle"**, "Pod Jet Assembly" — yani sektörde standart ikili = **düz delik + köpük** | aynı sayfa |
| S5 | Solenoid valf tepkisi: doğrudan etkili ~**30 ms**; yarı-doğrudan/pilotlu **1000 ms**'e kadar. Açılma "çıkış basıncı kararlı değerin %90'ına ulaştığı an", kapanma "%10'a düştüğü an" olarak ölçülür | https://tameson.com/pages/solenoid-valve-response-time |
| S6 | Rakip DMX'li dry deck kiti FPK 5000: **Ø10 → 2.6-4.3 m · Ø12 → 2.4-4.0 m · Ø14 → 1.9-3.3 m** | https://fontanafountains.com/products/spray-systems/dry-deck-fountains/fpk-5000/ |
| S7 | Değişken hızlı yürünebilir zemin jeti (LI-F5300): jet **"0.1 m'den 3 m'ye"** değişir | https://www.lumiartecnia.com/products/smart-line/walkable-compact-jet/ |
| S8 | Dry deck iki inşa sistemi: (a) **niş** — su ayrı teknik odada denge tankında; (b) **"floating pavement / vessel"** — **su doğrudan jetlerin altında bir kapta durur**, kap derinliği **"yaklaşık 0.5-0.6 m"**. Ayrıca: "Each nozzle has a precise working water pressure to reach **1.5 and 4.5 meters** of height" | https://media.fluidra-engineering.com/wp-content/uploads/2021/09/Dry-deck-fountains.pdf (s.5-7) |
| S9 | Pop jet zemin uygulaması püskürtme yüksekliği **0.9 m / 3 ft**'e kadar | https://fontanafountains.com/products/spray-systems/special-water-effects/pop-jets/ |

---

## C. Aritmetik — her sayı elle doğrulandı

Sabitler: g = 9.81 m/s² · ρ = 1000 kg/m³ · 1 bar = 10.197 m su sütunu
Torricelli `v = √(2gh)` · süreklilik `Q = A·v` · uçuş `t↑ = √(2h/g)`

### C1. AquaSWITCH Ø14 sütunu SAF TORRICELLI çıkıyor (Cd ≈ 1.0) ✓

A(Ø14) = π/4 · 0.014² = 1.539×10⁻⁴ m²

| h | v = √(2gh) | Q = A·v | katalog | sapma |
|---|---|---|---|---|
| 2 m | 6.264 m/s | 57.8 l/dk | **58** | −0.3% |
| 4 m | 8.858 m/s | 81.8 l/dk | **82** | −0.2% |
| 6 m | 10.85 m/s | 100.2 l/dk | **105** | −4.6% |

→ Aquatronic'in Ø14 tablosu bağımsız fizikle üç noktada tutuyor. Bu tablo GÜVENİLİR.

### C2. Ø16 sütunu smooth-bore olarak TUTMUYOR ✗

A(Ø16) = 2.011×10⁻⁴ m²

| h | Torricelli Q | katalog | oran |
|---|---|---|---|
| 2 m | 75.6 l/dk | **156** | 2.06× |
| 4 m | 106.8 l/dk | **204** | 1.91× |
| 6 m | 130.8 l/dk | **244** | 1.87× |

Sistematik ~1.9-2.1× fazla debi. Aynı yükseklik için gereken çıkış hızı sabit
olduğundan bu ancak **efektif kesitin ~2× büyük olmasıyla** olur (eşdeğer Ø ≈ 23 mm).
Basınç sütunu da destekliyor: Ø16 aynı yüksekliği **daha DÜŞÜK** basınçta veriyor
(2 m'de 0.44 vs 0.89 bar) — düz delikte bu imkânsız, **havalandırılmış/köpük nozulda
normaldir** (hacimce hava karışır, kütle debisi düşer, kayıp azalır).
→ S4 ile birebir örtüşüyor: sektörde dry deck kuyusunun iki standart başlığı
**düz delik + köpük**. Katalogun DryDECK'te dediği **"2 Different Nozzle Type"** budur.

### C3. DryDECK yükseklikleri — basınçtan türetim

Aquatronic'in kendi iç ölçeği: AquaVARIO 151 → **0.5 bar = 3.0 m** (VARIO kartı §1).
Yani bu ailede `h = 6.0 m/bar` (nozul kaybı dahil, gerçek ürün üzerinden kalibre).

| Ürün | maks bar | h = 6.0·P | v = √(2gh) | ISPSC 6.1 m/s sınırı |
|---|---|---|---|---|
| **AquaVARIO DryDECK** (flush) | 0.3 | **1.80 m** | **5.94 m/s** | ✅ ALTINDA (%97) |
| **AquaVARIO DryDECK Bucket** | 0.5 | **3.00 m** | 7.67 m/s | ❌ AŞIYOR → şov sürümü |
| SWITCH DryDECK / Bucket | 1.0 | (aşağıda) | | |

SWITCH'te VARIO ölçeği geçmez, kendi tablosu var (C1). Ø14 sütununda h ↔ bar:
2→0.89, 4→1.84, 6→3.82. 1 bar, 0.89 (2 m) ile 1.84 (4 m) arasında, doğrusal ara değer:

```
h(1 bar) = 2 + 2·(1.00−0.89)/(1.84−0.89) = 2 + 2·0.116 = 2.23 m
```

| Ürün | Ø14 (düz delik) | Ø16 (köpük) |
|---|---|---|
| SWITCH DryDECK @1 bar | **2.23 m** · v = 6.62 m/s | ~4.8 m (⚠ C2 gereği ihtiyatlı) |

Köpük sütunu için aynı ara değer: 1 bar, 0.84 (4 m) ile 1.24 (6 m) arasında →
4 + 2·(0.16/0.40) = **4.8 m**. Sayı hesaplanabiliyor ama dayandığı sütun C2'de
elendiği için kartta *tek başına* kullanılmadı.

### C4. ⭐ Üç bağımsız yol 1.8 m'de buluşuyor

| Yol | Sonuç |
|---|---|
| Aquatronic künyesi (0.3 bar × 6.0 m/bar) | **1.80 m** |
| ISPSC 2021 §612.4.3 hız tavanı (6.1 m/s → h = v²/2g) | **1.90 m** |
| Splash park sektör pratiği (6 ft) | **1.83 m** |

Üç yol %5 içinde. → **AquaVARIO DryDECK'in 0.3 bar'ı keyfî değil; interaktif
güvenlik tavanına oturtulmuş.** Bu kartın en güçlü tek bulgusu.

Rakip bandı da tutarlı: Fontana FPK 5000 Ø14 alt ucu **1.9 m** (S6), Fluidra
"1.5-4.5 m" bandının alt ucu **1.5 m** (S8), Lumiartecnia değişken hızlı **0.1-3 m** (S7).

### C5. Nozul çapı — üç kısıt aynı yere bakıyor

**① Kod kısıtı (S1):** interaktif nozul ağzına 12.7 mm çubuk girmemeli → **Ø < 12.7**.
Ø14 ve Ø16 interaktif drydeck'te KULLANILAMAZ.

**② Güç bütçesi.** VARIO DryDECK: 1.5 A × 24 V = **36 W** elektrik girişi.
VARIO ailesinin hidrolik verimi %22-25 (VARIO kartı §2③) → P_hid ≈ 8.1-9.0 W.

```
Q = P_hid / (ρ·g·h) = 8.5 / (1000·9.81·1.80) = 4.81×10⁻⁴ m³/s = 28.9 l/dk
A = Q / v = 4.81×10⁻⁴ / 5.94 = 8.10×10⁻⁵ m²  →  Ø = 10.2 mm
```

**③ Rakip.** FPK 5000'in en küçük çapı **Ø10** (S6).

→ Üçü de **Ø10** diyor. Kartta varsayılan: **Ø10 düz delik + Ø10 köpük**.

### C6. Uçuş süreleri (motorun ihtiyacı)

| h | t↑ = √(2h/g) | t toplam |
|---|---|---|
| 1.80 m | 0.606 s | 1.21 s |
| 2.23 m | 0.674 s | 1.35 s |
| 3.00 m | 0.782 s | 1.56 s |

### C7. Bucket = kap (vessel), sayısal doğrulama

Ø280 × 459 mm → hacim = π/4 · 0.28² · 0.459 = **28.3 litre**.
Fluidra'nın "floating pavement / vessel" tipi için verdiği kap derinliği
**0.5-0.6 m** (S8); Aquatronic bucket'ın boyu **0.459 m**. Aynı mertebe ✓.
→ Bucket, tek nozulluk minyatür bir vessel-tipi drydeck'tir; "kendi suyu"
(URUN_KUNYE) ifadesi bunun karşılığı.

Ağırlık farkı da tutuyor: VARIO Bucket 15 kg − SWITCH Bucket 11 kg = **4 kg**
≈ içine giren sub-pompanın kütlesi (VARIO 151 tam boy 7 kg; bucket'ınki daha küçük).
Akım farkı aynı hikâyeyi anlatıyor: VARIO Bucket **5 A** (pompa var, VARIO 151'in
5.5 A'ine yakın) ↔ SWITCH Bucket **0.8 A** (pompa yok, yalnız valf+ışık).

### C8. 0.1 s aç-kapa — doğrulandı, ama ne olduğu düzeltildi

Katalog iki ayrı sayfada "on-off time 0.1 second" diyor (A2, A4).
Sektör: doğrudan etkili solenoid ~30 ms, pilotlu 1000 ms'e kadar (S5) → **100 ms
bu bandın tam ortasında, 1" gövde için makul.** Ayrıca Delta Fountains dry deck
kuyusunu "saniyede 10 kereye kadar" pop'lattığını söylüyor (S3) = **0.1 s periyot,
bağımsız üreticiden aynı sayı.** → İDDİA AYAKTA.

⚠ Ama VARIO turundaki "20-50 ms" hatasının aynısına düşmemek gerek: 0.1 s
**valfin süresi, suyun değil.** Görülebilir tepki:

```
görsel gecikme = valf (0.1 s) + balistik uçuş (0.61-0.78 s) = 0.71-0.88 s
```

0.1 s'in aldığı şey hız değil **KESKİNLİK**: kolonun başı ve sonu keskin kesilir,
havada bütün hâlde bir su dilimi kalır. Sönümlenerek azalan bir kolon değil,
kopmuş bir mermi. "Canlı animasyon" ifadesinin fiziksel karşılığı budur.
