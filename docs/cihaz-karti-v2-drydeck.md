# KART v2 — DryDECK ailesi (AquaVARIO DryDECK · Bucket · AquaSWITCH T-SWITCH · D.D Bucket)

v7 "cihaz birebir" turu, **TUR 3**. Süreç adımı 1 (KAYNAK) + 2 (KART v2) tamam.
Adım 3 = **[ELLE] onay kapısı → SALİH'TE**. Adım 4 (KOD) bu turda YAPILMADI.

Kaynaklar:
- **Yerel (birincil):** `dahili katalog metni` s.38-41 ve
  s.48-49 (dört DryDECK künyesi metin katmanından birebir), s.46-47 (AquaSWITCH debi
  tablosu), s.53-71 (ışık "DryDECK Option" deseni), `URUN_KUNYE.md` §"5.x"
- **Sektör + fizik (2026-07-19):** `docs/2026-07-19-drydeck-kaynak-taramasi.md` §B
- **Öncül:** `docs/cihaz-karakter-kartlari.md` (DryDECK bölümü),
  `docs/cihaz-karti-v2-aquavario.md` (h↔bar ölçeği ve verim bandı buradan alındı)

Etiketler: ✅ katalogdan doğrulandı · 🔬 bağımsız sektör kaynağı · ⚠ [TÜRETİM]
(fizikle hesaplandı) · [TEMSİLİ] (görsel ayar) · **[ELLE]** = onay maddesi

---

## 0. KAYNAK adımı — ne bulundu

TUR 2 dersi tuttu: **künyede olmayan her şey katalogun metin katmanındaydı.**
`URUN_KUNYE.md` DryDECK için yalnız gerilim/güç/akım veriyordu; ölçü, ağırlık,
malzeme, maks basınç, üst plaka seçenekleri ve nozul sayısı metin katmanından çıktı.

Ham alıntılar + tüm aritmetik ayrı dosyada: **`docs/2026-07-19-drydeck-kaynak-taramasi.md`**.
Aşağıdaki her sayı oraya dayanıyor.

### ⭐ Turun ana bulgusu

> **DryDECK tek cihaz değil, İKİ SINIFTIR** — ve bu ayrımı katalogun kendi metni
> söylüyor: *"Primarily used by children... crafted with safety in mind... **A more
> professional version is also available for use in light and water shows, featuring
> higher water jets and integrated lighting**."* (s.38, birebir)

Sınıf ayrımı sayıya oturuyor ve **üç bağımsız yol aynı noktada buluşuyor**:

| Yol | İnteraktif tavan |
|---|---|
| Aquatronic künyesi: VARIO DryDECK 0.3 bar × 6.0 m/bar | **1.80 m** |
| 🔬 ISPSC 2021 §612.4.3 hız tavanı 6.1 m/s → h = v²/2g | **1.90 m** |
| 🔬 Splash park sektör pratiği (6 ft dikey sınır) | **1.83 m** |

%5 içinde üç yol. → **Flush AquaVARIO DryDECK'in 0.3 bar'ı keyfî değil, çocuk
güvenliği tavanına oturtulmuş.** Bucket sürümü (0.5 bar → 3.0 m) bu tavanı aşıyor;
yani Bucket = katalogun bahsettiği "profesyonel, daha yüksek atan" şov sürümü.

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Çapraz doğrulama — Aquatronic'in sayıları fizikle TUTUYOR

**① AquaSWITCH Ø14 debi tablosu saf Torricelli çıktı** (Cd ≈ 1.0):

| h | `Q = A·√(2gh)` hesabım | katalog | sapma |
|---|---|---|---|
| 2 m | 57.8 l/dk | **58** | −0.3% |
| 4 m | 81.8 l/dk | **82** | −0.2% |
| 6 m | 100.2 l/dk | **105** | −4.6% |

Üç noktada tutuyor → bu tablo güvenilir, DryDECK yüksekliğini ondan türetebilirim.

**② Bucket gerçekten "kap"mış** 🔬. Fluidra'nın dry deck kılavuzu iki inşa sistemi
tanımlıyor: nişli (su ayrı denge tankında) ve **"floating pavement / vessel"**
(su doğrudan jetin altında bir kapta, derinlik **~0.5-0.6 m**). Aquatronic bucket'ın
boyu **0.459 m**, hacmi **28.3 litre**. Aynı mertebe ✓. `URUN_KUNYE.md`'nin
"kendi suyu" notu bunun karşılığı.

**③ Ağırlık ve akım farkı da tutuyor** ⚠[TÜRETİM]. VARIO Bucket 15 kg − SWITCH
Bucket 11 kg = **4 kg** ≈ içine giren sub-pompa. Akım: VARIO Bucket **5 A**
(VARIO 151'in 5.5 A'ine yakın — içinde gerçek bir pompa var) ↔ SWITCH Bucket
**0.8 A** (pompa yok, valf + ışık). Aynı kabuk, farklı iç organ.

## 3. ⭐ Kontrol mimarisi — ailenin ASIL ayrımı burada

Şu ana kadar simülatörde dördü de tek preset'ti. Oysa **iki tamamen farklı kontrol
zinciri** var ve karakterleri buradan ayrılıyor:

| | **Pompa-kontrollü** (flush VARIO DryDECK) | **Valf-kapılı** (Bucket'lar) |
|---|---|---|
| Yüksekliği ne belirler | pompa devri (DMX hız) | solenoid açık/kapalı + pompa devri |
| Nasıl açılır | pompa hızlanır → kolon büyür | pompa ZATEN dönüyor, valf açılır |
| Açılış karakteri | **üstel rampa** (τ ≈ 0.10 s, VARIO kartı §6) | **kesme** (0.1 s ✅katalog) |
| Ara yükseklik | ✅ sürekli, 0→tam arası her değer | ✅ pompa devriyle, ama atım anlık |
| Kapanış | pompa yavaşlar, kolon kısalır | valf keser, kolon **kopar ve uçar** |
| Katalog kanıtı | "individual 24VDC sub-pump" | "single solenoid... 0.1 second" |

Katalog s.41 ikisini de aynı cümlede söylüyor — Bucket'ta **hem** sub-pompa **hem**
tek solenoid var. Yani Bucket iki katmanlı: *pompa boyu ayarlar, valf zamanlar.*

### ⚠ ELENEN OKUMA: "0.1 s aç-kapa = animasyon 0.1 s'te değişir"

VARIO turunda "20-50 ms tepki" iddiası *motorun* tepkisi çıkmıştı. Aynı tuzak burada:
**0.1 s valfin süresi, suyun değil.**

```
görsel gecikme = valf 0.10 s + balistik uçuş √(2h/g) 0.61–0.78 s = 0.71–0.88 s
```

0.1 s'in aldığı şey **hız değil KESKİNLİK**: kolonun başı ve sonu keskin kesilir,
havada bütünlüğünü koruyan bir su dilimi kalır. Sönerek azalan bir kolon değil,
kopmuş bir mermi. Katalogun "more dynamic / more lively animations" ifadesinin
fiziksel karşılığı budur — motorda **kapanışta kuyruk kesme + uçan slug** demektir.

İddianın kendisi ise **doğrulandı** 🔬 (elenmedi): solenoid valflerde doğrudan
etkili tip ~30 ms, pilotlu 1000 ms'e kadar — 100 ms bandın ortasında, 1" gövde için
makul. Ayrıca Delta Fountains dry deck kuyusunu *"saniyede 10 kereye kadar"*
pop'lattığını söylüyor = **0.1 s periyot, bağımsız üreticiden aynı sayı.**

## 4. Yükseklik ve hız — türetilmiş künye

Ölçek: AquaVARIO 151 → 0.5 bar = 3.0 m (VARIO kartı §1) ⇒ bu ailede **h = 6.0 m/bar**.
SWITCH tarafında kendi Ø14 tablosundan ara değer.

| Ürün | maks bar | **h_anma** ⚠ | **v = √(2gh)** ⚠ | t↑ | t toplam | ISPSC 6.1 m/s |
|---|---|---|---|---|---|---|
| **VARIO DryDECK** (flush) | 0.3 | **1.80 m** | **5.94 m/s** | 0.61 s | 1.21 s | ✅ altında |
| **VARIO DryDECK Bucket** | 0.5 | **3.00 m** | 7.67 m/s | 0.78 s | 1.56 s | ❌ aşıyor → şov |
| **SWITCH DryDECK** | 1.0 | **2.23 m** | 6.62 m/s | 0.67 s | 1.35 s | ⚠ hafif aşıyor |
| **SWITCH D.D Bucket** | 1.0 | **2.23 m** | 6.62 m/s | 0.67 s | 1.35 s | ⚠ hafif aşıyor |

Rakip bandı doğruluyor 🔬: Fontana FPK 5000 dry deck kiti **Ø14 → 1.9-3.3 m**,
Fluidra "her nozul **1.5-4.5 m**", Lumiartecnia değişken hızlı zemin jeti **0.1-3 m**.
Dördümüz de aynı bandın içindeyiz.

**Hız kanalı eşlemesi VARIO ile aynı** (karesel): `h = hiz² · h_anma`, tavan 1.0.
Bucket'ta valf ayrıca kapı görevi görür — `hiz` boyu, `atim` zamanlamayı verir.

⚠ **SWITCH DryDECK'in 2.23 m'si ISPSC hız tavanını hafif aşıyor** (6.62 > 6.1 m/s).
Katalog bu ürüne de "çocuklar için" diyor. İki okuma: ya sahada 1 bar'ın altında
sürülüyor, ya da "interaktif" sürümü ayrı bir kısıcıyla geliyor. → [ELLE] D5

## 5. ⭐ "2 Different Nozzle Type" ne — çözüldü

Katalog DryDECK'te iki nozul tipi olduğunu söylüyor ama **hangileri olduğunu
yazmıyor.** Kaynak taramasında çıktı 🔬:

**Sektör standardı ikili = düz delik (smooth bore) + köpük (foam jet).**
Delta Fountains dry deck kuyusu montajlarını birebir böyle sayıyor:
*"Pop Jet Assembly with Smooth Bore Nozzle"* / *"Pop Jet Assembly with Foam Jet Nozzle"*.

Aquatronic'in kendi AquaSWITCH tablosu bunu **doğruluyor** ⚠[TÜRETİM]:

| | Ø14 sütunu | Ø16 sütunu |
|---|---|---|
| 2 m'de debi | 58 l/dk | 156 l/dk |
| Torricelli beklentisi | 57.8 ✓ | 75.6 ✗ |
| Sapma | %0 | **+106%** |
| 2 m için gereken basınç | 0.89 bar | **0.44 bar** |

Ø16 sütunu aynı yüksekliği **iki katı debiyle ve YARISI basınçla** veriyor. Düz
delikte bu imkânsızdır (süreklilik ihlali). Havalandırılmış köpük nozulda ise
normaldir: hacme hava karışır, kütle debisi düşer, kayıp azalır.

→ **Ø14 = berrak düz jet · Ø16 = beyaz köpük jet.** Motorda iki ayrı doku demek:
biri damla/yarı-berrak (mevcut `drydeck` dokusu), diğeri `aeration` yüksek beyaz
salkım.

⚠ **ELENEN:** Ø16 sütununun *smooth-bore Ø16* olarak okunması ELENDİ (yukarıdaki
süreklilik ihlali). Sütunun kendisi atılmadı, **köpük nozul olarak yeniden okundu**.

## 6. Nozul çapı — üç kısıt aynı yere bakıyor

Katalog DryDECK nozul çapını **yazmıyor**. Üç bağımsız kısıt:

**① Kod kısıtı** 🔬 — ISPSC 2021 §612.4.3: interaktif nozul ağzına **12.7 mm çubuk
girmemeli**. ⇒ Ø < 12.7 mm. **Ø14 ve Ø16 interaktif drydeck'te kullanılamaz.**

**② Güç bütçesi** ⚠[TÜRETİM] — VARIO DryDECK 1.5 A × 24 V = 36 W; VARIO ailesi
hidrolik verimi %22-25 (VARIO kartı §2③) → P_hid ≈ 8.5 W:
```
Q = 8.5 / (1000·9.81·1.80) = 28.9 l/dk ;  A = Q/v = 8.10×10⁻⁵ m²  →  Ø = 10.2 mm
```

**③ Rakip** 🔬 — Fontana FPK 5000'in en küçük çapı **Ø10**.

→ Üçü de **Ø10** diyor. **Varsayılan: Ø10 düz delik + Ø10 köpük.** → [ELLE] D4

## 7. Işık künyesi — C-tipi, ve bu kanıtlanabilir

Katalogda `DryDECK Option(s) :` satırı **11 armatür sayfasında** geçiyor. Desen kesin:

| Geçiyor | Geçmiyor |
|---|---|
| 106**C** · 112**C** · 206**C** · 306**C** · 312**C** · 406**C** · 412**C** · 512**C** | 106, 112, 206, 306, 312, 406, 412, 512 (C'siz hiçbiri) |
| STARLIGHT 303 (PN 3011, Ø110×62, 9 W, 512 lm, RGB) | |
| STARLIGHT 403 (PN 3003, Ø110×62, 9 W, 1155 lm, RGBW) | |

→ **DryDECK aydınlatması iki biçimde:** (a) nozulun merkez deliğinden geçtiği
**C-tipi halka** (Ø160×70 puck, karakter kartı §IŞIK), (b) plakaya gömülü
**STARLIGHT spotu** (Ø110×62). Katalogun DryDECK sayfası "RGB or RGBW power LED
Light (OPTIONAL)" diyerek ikisini de kapsıyor.

Sahne sonucu: ışık **kolonun dibinden, zemin hizasından** vurur — VARIO'daki
nozul-altı halkayla aynı geometri, ama gövde tümüyle zeminin altında olduğu için
**ışık gölü doğrudan ıslak zemine düşer**, havuz yüzeyine değil. Islak zemin
yansıtıcıdır; VARIO turundaki su-boyama modeli aynen geçerli, taşıyıcı yüzey farklı.

## 8. Simülatörün mevcut hâli ↔ gerçek

`studio/js/motor.js` (OKUNDU, değiştirilmedi) — tek `drydeck` arketipi:
```
speed {a: 4.5, b: 5.8}  life {a: 0.9, b: 1.2}  aeration 0.2  koni 0.04
gol.yariCap 0.9  govdeTip 'drydeck'
```
`studio/js/govde.js:344` `drydeckGovde()` — torus R=0.14 + Ø0.26 ızgara diski.

| Konu | Gerçek | ŞU AN BİZDE | Kod turunda ne olmalı |
|---|---|---|---|
| **Ürün sayısı** | **4 ayrı varyant** (0.3 / 0.5 / 1.0 / 1.0 bar) | **1 preset, hepsi aynı** | 4 künyeden türeyen preset |
| Yükseklik | 1.80 / 3.00 / 2.23 m | v 4.5-5.8 → h **1.03-1.71 m** | künyeden `h = 6.0·bar` |
| Ömür | t toplam 1.21-1.56 s | life 0.9-1.2 s (**kısa**, tepeye varmadan sönüyor) | `2√(2h/g)`'den türet |
| **Valf kapısı 0.1 s** | Bucket'ta var, karakterin özü | **hiç yok** — kolon sürekli | atım/kapanma kanalı + kuyruk kesme |
| Pompa rampası | flush'ta τ≈0.10 s üstel | yok (anlık uniform) | VARIO `varioPresetTuret` deseni |
| **2 nozul tipi** | düz delik + köpük | tek doku | ikinci preset (aeration yüksek) |
| Gövde | 300×300 kare **veya** Ø280 yuvarlak; Bucket Ø280×459 | yalnız Ø280 torus+disk | plaka seçeneği + bucket gövdesi |
| Plaka kalınlığı | 5 mm (ince) / 30 mm (Premium) | 12 mm sabit | künyeden |
| Işık | C-halka **veya** STARLIGHT spot | genel `gol` | C-halka geometrisi (IŞIK turu portu) |
| Zemin sıçraması | ıslak zemin, sıfır su seviyesi | `KopukHalka`/`SicramaTaci` havuz varsayıyor | "dry pool" = su yüzeyi YOK |

⚠ **En büyük sapma yükseklik değil, KONTROL.** Mevcut preset sürekli akan bir kolon;
DryDECK ailesinin tanımlayıcı özelliği ise **kesik, atımlı, keskin başlayıp keskin
biten** su dilimleri. Kod turunda öncelik sırası: ① valf kapısı → ② 4 varyant
ayrımı → ③ iki nozul tipi → ④ gövde/plaka.

⚠ **"Zemin sıçraması/dokusu" (yol haritası TUR 3 su işi) burada patlıyor:** DryDECK'te
**su seviyesi sıfırdır** (✅katalog: "zero water level"). Mevcut zemin efektleri havuz
yüzeyi varsayımıyla yazılmış. Islak-zemin modeli ayrı iş. → [ELLE] D8

---

## 9. ⛔ Kaynak BULUNAMADI — uydurulmadı

| Alan | Durum |
|---|---|
| **DMX kanal haritası** | **YOK.** IŞIK ve VARIO turlarında da bulunamamıştı; **üst üste üçüncü tur.** Aquatronic hiçbir üründe kanal listesi yayınlamıyor. |
| DryDECK ürün numaraları (PN) | YOK — `URUN_KUNYE.md` kendi eksik listesinde ilan ediyor |
| **Maks su yüksekliği** | Dört varyantın **hiçbirinde** yazmıyor. VARIO/SWITCH ana ürünlerinde var, DryDECK'lerde yok. Bu kartın yükseklikleri **basınçtan türetildi**, ölçülmüş değil. |
| DryDECK nozul çapları | "2 Different Nozzle Type" deniyor, **çap verilmiyor** |
| T-SWITCH güç (W) | Künyede satır yok, yalnız 0.8 A |
| Klasik iki-solenoid aç-kapa süresi | 0.1 s'in kıyaslandığı sayı **hiçbir yerde yok** — "daha hızlı" göreli iddiası doğrulanamıyor |
| Hangi plaka hangi üründe standart | Ø280 mi 30×30 mu varsayılan, yazmıyor |
| Işığın gövde içindeki konumu | Yalnız şematik **görselde**; metin katmanında yok |
| Islak zemin yansıtma/sıçrama modeli | Sayısal kaynak yok — kodda [TEMSİLİ] kalacak |
| Debi tablosu (DryDECK'e özel) | Yok; AquaSWITCH tablosundan ve güç bütçesinden türetildi |

## 10. ⚠ ELENEN İDDİALAR

| # | İddia | Neden elendi |
|---|---|---|
| **E1** | Karakter kartı: DryDECK **"maks 1 bar"** | Aşırı genelleme. Dört varyanttan ikisi 1 bar; **VARIO tarafı 0.3 / 0.5 bar**, yani üçte biri. Tek sayı aileyi temsil etmiyor. |
| **E2** | AquaSWITCH **Ø16 sütunu = düz delikli Ø16 nozul** | Süreklilik ihlali: 2 m için Torricelli 75.6 l/dk verirken katalog 156 diyor (**+106%**), üstelik **yarı basınçla**. Düz delikte imkânsız. → köpük/havalandırılmış nozul olarak yeniden okundu (§5). |
| **E3** | **"0.1 s aç-kapa"** = su 0.1 s'te tepede | Valfin süresi, suyun değil (VARIO'daki "20-50 ms" tuzağının aynısı). Gerçek görsel gecikme **0.71-0.88 s** (valf + balistik uçuş). İddia doğru ama anlamı düzeltildi. |
| **E4** | **18 W** DryDECK pompa gücüdür | 24 V'ta 18 W = 0.75 A, künye 1.5 A diyor. İkisi uyuşmuyor; 18 W büyük olasılıkla LED/kontrol tarafı, pompa 36 W. **Çözülmedi, işaretlendi** → [ELLE] D3 |
| **E5** | Katalog s.41 metni (VARIO Bucket'ı **"DryDECK Switch"** diye anlatıyor) | Kopyala-yapıştır hatası; ürün adı yanlış. Teknik iddialar (tek solenoid, 0.1 s) iki sayfada da geçtiği için korundu, ürün adı düzeltildi. |
| **E6** | Mevcut preset'in `speed 4.5-5.8` aralığı doğru mertebede | Kısmen doğru (1.03-1.71 m) ama **yanlış sebepten**: dört ürünün üçünü birden eksik gösteriyor ve `life 0.9-1.2 s` uçuş süresinden (1.21-1.56 s) kısa — parçacık tepeye varmadan ölüyor. |

---

## [ELLE] onay kapısı — Salih'in cevaplaması gerekenler

| # | Soru | Cevap yoksa VARSAYILANIM |
|---|---|---|
| **D1** | Sahada gerçekten **dört ayrı DryDECK** mi satılıyor, yoksa bunlar aynı gövdenin seçenekleri mi? Ekranda dördünü ayrı çizeyim mi? | **Dört ayrı preset** (künye dördünü ayrı ürün gibi listeliyor) |
| ⭐**D2** | Katalog "profesyonel sürüm daha yüksek atar" diyor. Benim okumam: **flush = interaktif 1.8 m · Bucket = şov 3.0 m**. Doğru mu, yoksa profesyonel/interaktif ayrımı başka bir yerden mi geliyor? | Flush=interaktif alçak, Bucket=şov yüksek |
| **D3** | **18 W ↔ 1.5 A çelişkisi**: 18 W ışık mı, pompa mı? Pompa gerçekte kaç W çekiyor? | 1.5 A (36 W) = pompa · 18 W = LED/kontrol |
| **D4** | DryDECK **nozul çapı** kaç? Üç kısıt Ø10 diyor (kod ≤12.7 mm, güç bütçesi 10.2 mm, rakip Ø10). | **Ø10** düz delik + Ø10 köpük |
| **D5** | SWITCH DryDECK 1 bar'da **2.2 m** çıkıyor, bu interaktif hız tavanını (6.1 m/s) hafif aşıyor. Sahada 1 bar'da mı sürülüyor, kısılıyor mu? | 2.23 m, tam basınçta (şov sürümü sayıyorum) |
| ⭐**D6** | **"2 farklı nozul tipi"** gerçekten **berrak düz jet + beyaz köpük jet** mi? (Ø14/Ø16 tablosu ve sektör bunu diyor.) Yoksa başka bir ikili mi? | **Düz delik + köpük** — iki ayrı doku çizeceğim |
| **D7** | **Bucket'ta valf mi pompa mı boyu belirliyor?** Benim modelim: pompa boyu, solenoid zamanlamayı (kapı). Doğru mu? | Pompa = boy · solenoid = kapı/atım |
| ⭐**D8** | DryDECK'te **su seviyesi sıfır**. Mevcut köpük halkası / sıçrama tacı havuz yüzeyi varsayıyor. Islak zemin sıçraması nasıl görünmeli — ince yayvan film mi, dağınık damla mı? | **İnce yayvan ıslak film + geniş alçak saçılma**, havuz dalgacığı YOK |
| **D9** | Varsayılan üst plaka hangisi: **Ø280 ince (5 mm)** mi, **30×30 Premium (30 mm)** mi? | **Ø280 / 5 mm** (mevcut gövde zaten Ø280) |
| **D10** | Kapanışta kolon **kopup uçuyor** mu (valf keser, havadaki dilim yoluna devam eder), yoksa dipten sönerek mi iniyor? | **Kopup uçuyor** (0.1 s valfin görsel karşılığı) |

---

## Sonraki adım

Adım 3 kapısı **SALİH'TE**. Onay gelince adım 4 (KOD): `drydeck` tek preset'i
**künyeden türeyen `drydeckPresetTuret`**'e çevrilecek (VARIO turundaki
`varioPresetTuret` deseni — motorda elle sabit YOK). Kod öncelik sırası §8'de.

---

## KOD adımı sonuçları (2026-07-22, cila turu)

⚠ [ELLE] onay kapısı hâlâ **açık** (D1-D10 cevapsız) — bu KOD adımı görsel karar
GEREKTİRMEYEN, kartın kendi metninden/künyesinden DOĞRUDAN kanıtlanan tek maddeyi
düzeltti: **§3'teki kontrol ayrımı**. Diğer her şey (yükseklik doğruluğu, gövde
ölçüsü, plaka biçimi) önceki bir "zarf" turunda (`studio/data/zarf-urunler.js`,
bu turun dosya kapsamı DIŞINDA) zaten künyeye göre çözülmüştü — bu kart o zaman
"ŞU AN BİZDE" diye yazılan §8 tablosunu güncel render'a göre yeniden denetledi.

**Denetim bulgusu (kart §8 tablosunun render karşılığı, 2026-07-22 itibarıyla):**

| Kart maddesi | Denetim sonucu |
|---|---|
| Yükseklik (1.80/2.23/3.00 m) | ✅ TUTUYOR — `zarf-urunler.js`'te künyeden zaten doğru (bu turdan ÖNCE bir "zarf" turunda çözülmüş, `motor.js` `zarfPresetTuret` + `zarfParca('AquaVARIO DryDECK', ...)` referansı üzerinden ekrana geliyor) |
| Ömür/uçuş süresi | ✅ TUTUYOR — aynı zarf mekanizmasından (`omurPay`/`omurYayilim`) türüyor |
| **Valf kapısı 0.1 s / kontrol ayrımı (§3)** | ❌ TUTMUYORDU — tek `drydeck` preset'i pompa da valf de değildi, kolon sürekli akıyordu, `hiz` kanalı anlık zıplıyordu. **BU TURDA DÜZELTİLDİ.** |
| 2 nozul tipi (§5-6) | ❌ hâlâ tek doku — DOKUNULMADI (kart §8 önceliği ③, görsel-doku işi, D6 [ELLE] açık) |
| Gövde/plaka (kare vs yuvarlak) | ❌ hâlâ tek yuvarlak torus+disk, `zarf-urunler.js`'in "kare 300×300×30" kararını YANSITMIYOR — DOKUNULMADI (kart §8 önceliği ④, D9 [ELLE] açık, ayrıca `zarf-urunler.js` bu turun dosya kapsamı DIŞINDA) |
| Islak zemin / "dry pool" sıçraması (D8) | ❌ hâlâ havuz varsayımlı `KopukHalka`/`SicramaTaci` — DOKUNULMADI (görsel karar, D8 [ELLE] açık) |

**Düzeltme** (`studio/js/motor.js`, yeni `drydeckPresetTuret(temel, kunye)`,
`varioPresetTuret`in yanına eklendi — desen AYNI: ürün adından türet, motorda
"hangi DryDECK hangisi" diye elle sabit yok): künye A1/A3'ün kendi metni ailenin
İKİ kontrol zincirini zaten söylüyor — "**individual 24VDC sub-pump**" (AquaVARIO
DryDECK, flush) = pompa-kontrollü; katalog.js'in kendi `not` alanı "**tek-solenoid**"
(AquaSWITCH DryDECK / T-SWITCH) = valf-kapılı. Fonksiyon `kunye.ad`'de `'SWITCH'`
geçip geçmediğine bakar:

- **`AquaVARIO DryDECK`** → `hizRampaSn: 0.10` (VARIO kartı §6'nın τ'su AİLE
  REFERANSI olarak ödünç alındı — DryDECK'in kendi pompa ataleti hiçbir kaynakta
  YOK, kart §9). `suEkle`'de `hiz` kanalı zaten akıyordu (drydeck `STEP_TURLERI`
  listesinde değil, `proje.js` — DOKUNULMADI); artık o kanal SWITCH kanıtındaki
  VARIO gibi üstel yaklaşımla yürüyor.
- **`AquaSWITCH DryDECK`** → `aniKesme: true` — SWITCH'in ZATEN üretimde çalışan
  mekanizması (`test/switch-kesme.test.mjs`, AIR'in salvo "reload sessizliği"
  deseninden türemişti) BİREBİR yeniden kullanıldı: kapanışta yeni su çıkmaz
  (`uKapali` doğum kapısı), o anda HAVADA olan parçacık kendi ömrünü/sıçramasını
  normalce tamamlar. Kod DEĞİŞMEDİ, yalnız `drydeck` arketipi de bu preset
  bayrağını künyeye göre alabiliyor.

Kanca: `suEkle`'de `if (tur === 'drydeck') p = drydeckPresetTuret(p, kunye);`
— `varioPresetTuret`den sonra, `zarfPresetTuret`den önce (yükseklik/ömür
ölçeklemesi bu bayraklardan habersiz, sıra fark etmiyor ama tutarlılık için
`vario` dalının hemen yanına kondu).

**Test kanıtı** (`test/drydeck-kontrol.test.mjs`, 5 test, YENİ): motor.js modül
düzeyinde `document.createElement` çağırdığı için (sprite dokuları) Node'da
normal `import` edilemiyor — `switch-kesme.test.mjs`/`air-salvo.test.mjs`
deseniyle kaynak metinden okunuyor. Farkla: yalnız regex eşleşmesi değil,
`drydeckPresetTuret`'in GÖVDESİ metinden çıkarılıp `new Function` ile GERÇEKTEN
çalıştırılıyor (saf veri fonksiyonu, THREE/document bağımlılığı yok) — künyesiz
çağrının preset'i DEĞİŞTİRMEDEN döndürdüğü, `AquaVARIO DryDECK`'in rampa ALIP
kesme ALMADIĞI, `AquaSWITCH DryDECK`'in kesme ALIP rampa ALMADIĞI ve `drydeck`
preset'inin LİTERAL bloğunun hiçbir bayrak SIZDIRMADIĞI (ayrışma tamamen
dinamik) doğrulanıyor. Tam süit **489/489** yeşil (484 → +5).

**Kare kanıtıyla DOĞRULANAN** (`studio/ornekler/_test-drydeck.aqshow`,
`bash tools/smoke.sh "studio/index.html#ornek=_test-drydeck&fon=kuru&t=<sn>"`):
her iki preset dalı da (yeni `hizRampaSn` + yeni `aniKesme`) çalışırken sayfa
konsolu TEMİZ, kare siyah/beyaz oranları makul (kırık shader/NaN artefaktı YOK),
`#katalogdemo` regresyonsuz. **Kare kanıtıyla DOĞRULANAMAYAN** (SWITCH turuyla
AYNI ölçüm sınırı, bkz. o kartın "KOD adımı sonuçları" bölümü): T-SWITCH'in
kesim SONRASI 1-2 saniyelik kademeli balistik çözülmesi — headless
`virtual-time-budget` `t=1.9` ve `t=2.03` isteklerinde bile HUD'da neredeyse
aynı kareyi gösterdi (parçacık simülasyonunun kendi `dt` birikimi gerçek
duvar-saatine bağlı, headless'ta pratikte ilerlemiyor). DD2'nin "1-2 sn içinde
doğal biçimde eriyip kayboluyor mu" kısmı CANLI tarayıcıda doğrulanmalı.

**Yapılamayan (dosya kapsamı dışı):**
- T-SWITCH'in kontrol KANALI hâlâ `smooth` (proje.js `STEP_TURLERI` listesinde
  `'drydeck'` yok, yalnız `'switch'` var) — gerçek bir solenoid için "step" daha
  doğru sözleşme olurdu (SWITCH/AIR/STAR/PERDE deseni) ama `proje.js` bu turun
  DOKUNABİLECEĞİ dosya listesinde YOK (paralel ajan kısıtı, SWITCH turunun
  `CIPLAK_TURLER` notuyla AYNI kısıt). `motor.js` tarafındaki `aniKesme`
  mekanizması kanal eğrisinden BAĞIMSIZ çalışıyor (havadaki suyu koruyor), yalnız
  kapanış geçişinin kendisi (step'te ani/smooth'ta kademeli) ideal değil.
  > ⚠**BU MADDEYİ ALAN KİŞİYE (2026-07-23, ana oturum incelemesi): `'drydeck'`i
  > `STEP_TURLERI`'ne EKLEMEK YANLIŞ ÇÖZÜMDÜR.** Liste `tur` bazlı çalışıyor
  > (`proje.js:169 STEP_TURLERI.includes(tur)`), oysa DryDECK'in İKİ ürünü de
  > aynı `tur: 'drydeck'` altında: pompalı flush varyantı smooth+`hiz` İSTER,
  > T-SWITCH step ister. Listeye eklemek pompalı varyantın debi kanalını da
  > öldürür — kartın kendi ⭐bulgusunu (iki ayrı kontrol zinciri) tersine çevirir.
  > Doğru çözüm: step kararı `tur`dan değil ÜRÜN künyesinden okunmalı (motor.js
  > tarafında `drydeckPresetTuret`in `aniKesme` bayrağı zaten bu ayrımı yapıyor —
  > aynı kaynak kanal üretimine de beslenmeli).
  > ⚠GERİYE UYUM RİSKİ: kanal ŞEMASINI değiştirir. Mevcut `.aqshow`'larda
  > drydeck cihazlarının `hiz` kanalı VAR; step'e geçen üründe o kanal artık
  > doğmayacağı için eski dosyalarda öksüz kanal kalır. Yükleme yolunun (öksüz
  > kanalı sessizce atma) davranışı ÖNCE doğrulanmalı. Bu yüzden gece turunda
  > bilerek YAPILMADI — 15 dakikalık iş ama şema kararı, gündüz + kapı ister.
- Gövde/plaka ayrımı (kare vs yuvarlak, `govde.js` `drydeckGovde()` hâlâ
  parametresiz/tek biçim) ve 2. nozul dokusu (§5-6) — kart §8'in ③/④ öncelikleri,
  ikisi de görsel-yargı ağırlıklı ve D6/D9 [ELLE] soruları hâlâ açık; bu turda
  KİLİTLENMEDİ.
- Islak zemin/"dry pool" sıçraması (D8) — `zemin-efekt.js` dokunulabilir listede
  olsa da, D8'in kendisi açıkça görsel-karar maddesi ("ince yayvan film mi,
  dağınık damla mı") ve kart bunu ELLE'ye bırakıyor; bu turda tasarım
  KİLİTLENMEDİ, kabul listesine DD4 olarak yazıldı.
