# KART v2 — AquaVARIO 151 / 241

v7 "cihaz birebir" turu, **TUR 2**. Süreç adımı 1 (KAYNAK) + 2 (KART v2) tamam,
adım 4 (KOD) karttaki VARSAYILANLARLA yürütüldü (HIZ MODU: varsayılanla ilerlenir,
Salih [ELLE] kapısında düzeltir → kod o an güncellenir).

Kaynaklar:
- **Yerel (birincil):** `dahili katalog metni` s.34-37
  (AquaVARIO TECHNICAL DETAILS + gövde metni), `URUN_KUNYE.md` §1,
  `docs/cihaz-karakter-kartlari.md` (POMPA ailesi + Salih'in sözlü tarifi)
- **Sektör + fizik (bu tur, 2026-07-18):** aşağıdaki §0 kaynak listesi

Etiketler: ✅ katalogdan doğrulandı · 🔬 bağımsız sektör kaynağı · ⚠ [TÜRETİM]
(fizikle hesaplandı) · [TEMSİLİ] (görsel ayar, fizik sabiti değil) · **[ELLE]** = onay maddesi

---

## 0. KAYNAK adımı — ne bulundu (linkli)

Karar gereği kaynak Salih'in çekimine bağlı DEĞİL. İki bacak:

**A) üretici kataloğu** — TECHNICAL DETAILS tabloları + yükseklik
grafiği (12/14/16 mm eğrileri, 0-4.5 m ekseni) + gövde metni. Metin katmanından
birebir okundu, aşağıdaki §1 tablosu.

**B) Sektör referansı** — sub-pump fiziği ve rakip ürün künyeleri:

| Konu | Bulgu | Kaynak |
|---|---|---|
| Yükseklik ↔ hız | Ölçülmüş üretici tablosundan `h ÷ (v²/2g) = 0.94–1.04` (12 m'ye kadar). Yani **çeşme ölçeğinde hava sürtünmesi ihmal edilebilir** — Torricelli birebir tutuyor | Safe-Rain "Lance Jet I" datasheet, Tem. 2025 — https://saferain.com/wp-content/uploads/2025/07/crystalline_fountain_nozzle_lance-jet-i.pdf |
| Yükseklik ↔ debi ↔ çap | Tabloya ±%2 uyan yasa: **Q[l/dk] = 0.2087 · d[mm]² · √(h[m])** (Cd≈0.97). Ø19@12m: formül 261.0 / tablo 261 | aynı datasheet (hesap: tablodan türetildi) |
| Nozul kaybı | Yükseklik ÷ nozul girişi basıncı ≈ **0.78** (Ø12-14) | aynı datasheet |
| **Pompa rampası** | OASE Varionaut 24V/DMX künyesinde ilan edilmiş: **"0 → tam jet yüksekliği: 90 → 0.6 s, 150 → 1 s, 240 → 1 s"** | https://www.oase-professional.com/en/family/product/p/50665-varionaut-150-24-v-dmx-02-int.html · https://www.oase-professional.com/en/family/product/p/46821-varionaut-240-24-v-dmx-02-int.html |
| Rampa (2. üretici) | Cascade CS 24-150 DMX/PWM: "%10–100 değişim süresi < 1 s" | https://www.cascade.it/en/prodotto/cs-24-150-dmx-pwm/ |
| Güç ↔ yükseklik | 60 W → 2.0 m · **120 W → 3.1 m** · **240 W → 4.8 m** (OASE, nozullu). Kabaca h ∝ P^0.6 | yukarıdaki OASE sayfaları |
| Kolon karakteri | Kristalin (berrak) jet **akış düzleştirici (centrador)** ister; düzleştiricisiz pompa çıkışı çarktan gelen türbülansı taşır → **yarı-berrak/pütürlü** | https://www.saferain.com/en/fountain-equipment/fountain-nozzles/crystalline-fountain-jets/lance-jet-i.html |
| Pütürlenme başlangıcı | Türbülanslı serbest jette kırılma **nozul çapının ~100 katı** mesafede başlar → Ø12 için **1.2 m** | ASCE J. Hydraulic Eng. 142(10), 2016 — https://ascelibrary.org/doi/10.1061/(ASCE)HY.1943-7900.0001188 |

⚠ **Elenen iddialar (kullanılmadı):** ① "DMX pompa tepkisi 20-50 ms" — kaynağın
kendi metni bunun *motorun sinyale tepkisi* olduğunu, su kolonu gecikmesi
olmadığını söylüyor, üstelik satış metni. ② "150 W → 10 m kafa" ilanları —
ρgQH ile 218 W hidrolik çıkıyor, 150 W elektrikten büyük; imkânsız.

⚠ **Kaynak BULUNAMADI (uydurulmadı):** aerasyon hacim oranı sayısı, kolon
çapının yükseklikle büyüme yasası D(z), tepe tacı geometrisi için sayısal model.
Bunlar kodda [TEMSİLİ] görsel ayar olarak duruyor, fizik sabiti gibi davranılmadı.

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Çapraz doğrulama — künye sayıları fizikle TUTUYOR

Bu kartın en güçlü tarafı: üreticinin yayınladığı sayılar üç bağımsız yolla sağlandı.

**① Basınç ↔ yükseklik.** 0.5 bar = 5.10 m su sütunu. Nozul kaybı katsayısı 0.78
(Safe-Rain ölçümü) → görülebilir maks yükseklik `5.10 × 0.78 = 3.98 m`... 241'in
4.5 m'si bunun biraz üstünde, yani 241 kayıpsız nozulla (Ø16 tipi, katsayı ~0.90 →
4.59 m) çalışıyor. **Mertebe tutuyor.**

**② Güç ↔ yükseklik, rakiple.** OASE 24V/DMX ailesi: 120 W → 3.1 m, 240 W → 4.8 m.
üretici: 150 W → 3.0 m, 240 W → 4.5 m. **Aynı sınıf, %6 içinde.** İki bağımsız
üreticinin uyuşması, künyedeki yükseklikleri pazarlama abartısı olmaktan çıkarıyor.

**③ Hidrolik verim.** Ø12 nozulda `Q = 0.2087·144·√h`:
- 151 → 52.1 l/dk @ 3.0 m → P_hidrolik = ρgQH/0.78 = 32.7 W ÷ 150 W = **%22**
- 241 → 63.8 l/dk @ 4.5 m → P_hidrolik = 60.1 W ÷ 240 W = **%25**

İkisi de aynı mertebede — künye kendi içinde tutarlı. (24 V BLDC dalgıç için
%20-45 bandı normal; OASE 240 W için %43 çıkıyor, üretici biraz daha muhafazakâr.)

## 3. Su kolonu karakteri

Salih'in tarifi (2026-07-17): *"saçmıyor, laminer kadar sabit akmıyor ama saçak
değil"* = yoğun yarı-berrak kolon. **Sektör kaynağı bunu AÇIKLIYOR** 🔬: kristalin
(cam gibi) jet, nozul içinde **akış düzleştirici** ister; VARIO doğrudan pompa
çıkışıdır, çarktan gelen dönme/türbülans sönümlenmez. Ne laminer ne köpük — arası.
Salih'in gözlemi fiziğin tam karşılığı.

**Kolon iki bölgeli** 🔬 (yeni bilgi, karakter kartında yoktu):

| | Berrak bölge | Pütürlü bölge |
|---|---|---|
| Nerede | nozuldan **100·d** mesafeye kadar (Ø12 → **1.2 m**) | onun üstü |
| 151'de (3.0 m) | alt %40 | üst **%60** |
| 241'de (4.5 m) | alt %27 | üst **%73** |

→ Yani **241 sadece daha uzun değil, oransal olarak daha PÜTÜRLÜ.** Motorda
`aeration` ve `tepeBuyume` ölçeği bu paydan türetiliyor (oran 1.22), keyfî
katsayıdan değil.

→ **[ELLE] K1:** Sahada 241'in kolonu 151'inkinden gözle daha köpüklü/pütürlü mü
duruyor, yoksa ikisi de aynı dokuda sadece boy mu değişiyor?

Diğerleri karakter kartından, değişmedi: yüzey pütürlü olduğu için ışığı gövde
boyunca taşır (renk TÜM kolonda), saçak YALNIZ tepe tacında; **debi kısılınca
kolon incelmez KISALIR**.

## 4. ⭐ 151 ↔ 241 farkının SAYISAL karşılığı

Şikâyet buydu: ikisi ekranda birebir aynı. Farkın tamamı:

| Büyüklük | 151 | 241 | Oran | Kaynak |
|---|---|---|---|---|
| Anma yüksekliği | 3.0 m | 4.5 m | **1.50×** | ✅katalog |
| **Çıkış hızı** (v=√2gh) | 7.67 m/s | 9.39 m/s | **1.22×** | ⚠[TÜRETİM] Torricelli |
| Debi @Ø12 | 52.1 l/dk | 63.8 l/dk | 1.22× | 🔬Safe-Rain yasası |
| Uçuş süresi (tepeye) | 0.78 s | 0.96 s | 1.22× | ⚠[TÜRETİM] |
| Toplam uçuş (iniş dahil) | 1.56 s | 1.91 s | 1.22× | ⚠[TÜRETİM] |
| Kolon çapı @Ø12 nozul | aynı | aynı | **1.00×** | fizik: aynı nozul = aynı çap |
| Pütürlü kolon payı | %60 | %73 | 1.22× | 🔬100·d kırılma |
| Ops. ışık gücü | 22 W | 72 W | **3.27×** | ✅katalog |
| → ışık gölü yarıçapı | 1.0 | 1.48 | 1.48× | ⚠[TÜRETİM] küp kök (alan) |
| Gövde toplam yüksekliği | 200 mm | 143 mm | **0.72×** | ✅katalog — **241 DAHA BASIK** |
| Gövde uzunluğu | 328 mm | 328 mm | 1.00× | ✅katalog |
| Ağırlık | 7 kg | 5 kg | 0.71× | ✅katalog |

**⚠ Ekranda okunacak asıl fark = BOY (1.5×) ve GÖVDE SİLUETİ.** Kolon KALINLIĞI
aynı nozulda aynıdır — 241'i şişman çizmek YANLIŞ olurdu. Şaşırtıcı ama künye
böyle: 241 daha güçlü ama daha küçük ve hafif gövdeli (5 kg / 143 mm), 151 daha
dik silüetli (7 kg / 200 mm).

→ ❓ **[ELLE] V1:** 241 gerçekten 151'den kısa gövdeli ve hafif mi (katalog öyle
diyor, sezgiye ters)? Ölçüler doğruysa ekranda 241'in kaidesi daha basık çizilecek.

## 5. Hız kanalı → yükseklik eşlemesi

DMX'te tek "speed" kanalı var (sektör standardı 2 ch: on/off + hız 🔬).
`.hiz` kanalı **pompa hız komutu**dur, doğrudan yükseklik değil:

```
v = hiz · v_anma          (pompa devri ∝ debi ∝ çıkış hızı)
h = v² / 2g               (Torricelli — 🔬 çeşme ölçeğinde ±%5 içinde doğrulandı)
⇒ h = hiz² · h_anma       ⭐ KARESEL
```

| `.hiz` | 151 yüksekliği | 241 yüksekliği |
|---|---|---|
| 1.00 | 3.00 m | 4.50 m |
| 0.75 | 1.69 m | 2.53 m |
| 0.50 | **0.75 m** | 1.13 m |
| 0.25 | 0.19 m | 0.28 m |

**Bu sezgiye terstir ve önemlidir:** sürgüyü yarıya çekmek kolonu yarıya değil
**ÇEYREĞE** indirir. Eskiden de böyleydi (motor hızı ölçekliyordu) ama kimse
belgelemedi; kartta artık yazılı.

**⚠ Yeni: HIZ TAVANI.** Editör sürgüsü 0-1.6 aralığındaydı → `hiz = 1.6` uydurma
bir `2.56 × h_anma` (151'de 7.7 m!) veriyordu. Pompa anma yüksekliğinin üstüne
çıkamaz; vario'da tavan 1.0'a kırpıldı.

→ ❓ **[ELLE] V2:** Tavan doğru mu? Yoksa 151'i katalog üstü zorlamak (ör. Ø10
nozul + tam devir) sahada mümkün mü? Varsayılanım: tavan 1.0.

→ ❓ **[ELLE] V3:** Şovlarda `.hiz` yazarken sen "yükseklik yüzdesi" diye mi
düşünüyorsun? Öyleyse kanalı `h = hiz · h_anma` olacak şekilde (v = √hiz)
çevirebilirim — fizik yine doğru kalır, sadece sürgünün anlamı değişir.
Varsayılanım: **pompa devri** semantiği (yukarıdaki tablo).

## 6. Rampa / atalet sabitleri

Katalog *"in the blink of an eye, 0 to 3 metres"* diyor; Salih de "geçiş anlık"
demişti. Sektör bunu SAYIYA çeviriyor 🔬: OASE Varionaut 150/240 künyesi
**"0 → tam jet yüksekliği: 1 s"**.

Ama o 1 s'in büyük kısmı **uçuştur, pompa değil** ⚠[TÜRETİM]:

```
toplam gecikme = pompa rampası + uçuş süresi
1.00 s (OASE 150, 3.1 m)  −  0.78 s (√(2h/g), motorda ZATEN bedava)
                          =  ~0.22 s saf pompa gecikmesi
üstel yaklaşımda %95 için 3τ ⇒ τ = 0.07-0.10 s
```

Uygulanan sabitler:

| | 151 | 241 |
|---|---|---|
| Rampa zaman sabiti τ | **0.10 s** | 0.12 s (τ ∝ √h) |
| %95'e ulaşma (3τ) | 0.30 s | 0.37 s |
| + balistik uçuş | 0.78 s | 0.96 s |
| **Toplam görsel gecikme** | **1.08 s** | **1.33 s** | 

151'in 1.08 s'i OASE'nin ölçtüğü 1 s ile örtüşüyor ✓.

→ ❓ **[ELLE] V4:** τ = 0.10 s doğru mu? Sahada VARIO'yu sıfırdan tam açtığında
kolonun tepesine varması gözle kaç saniye sürüyor? (Bir saniye civarı bekliyorum.)

→ ❓ **[ELLE] V5:** Kapanış açılışla aynı hızda mı? Şu an simetrik. Gerçekte
kapanış daha ani olabilir (pompa durur, kalan su düşer).

## 7. Simülatörün mevcut hâli ↔ gerçek

| Konu | Gerçek | ÖNCE | SONRA |
|---|---|---|---|
| 151 ↔ 241 boyu | 3.0 m ↔ 4.5 m | **ikisi de aynı** (tek preset 7.6-9.4) | ✅ 1.5× fark, künyeden türer |
| Kolon tepesi | tanımlı, taçlı | 1.5 m boyunca dağınık | ✅ katalog yüksekliğinde |
| Hız tavanı | anma yüksekliği | 1.6 → 2.56× uydurma boy | ✅ 1.0'a kırpılı |
| Pompa rampası | ~0.2 s + uçuş | yok (anlık uniform) | ✅ üstel, τ künyeden |
| Gövde ölçüsü | 151≠241 | tek sabit gövde | ✅ künye L×M×H |
| Ops. ışık farkı | 22 W ↔ 72 W | aynı ışık gölü | ✅ 1.48× gölü |
| Debi → parçacık | Q 1.22× | aynı bütçe | ✅ √Q ölçekli |
| Pütürlü/berrak bölge | 100·d'de kırılma | tek tip kolon boyu | ⏭ aeration ORANI alındı, **bölge ayrımı shader işi (sonraki dalga)** |
| Nozul Ø12/14/16 seçimi | üç seçenek | yok | ⏭ veri yolu açık (`pompa.nozulMm`), UI yok |

→ ❓ **[ELLE] V6:** Ø14/Ø16 nozul seçeneği simülatörde sunulsun mu? Sunulacaksa
katalog grafiğindeki Ø16 yükseklikleri lazım (metin katmanından okunamadı; grafik
görsel). Varsayılanım: yalnız Ø12 (katalogun sayı verdiği çap).

---

## [ELLE] onay kapısı — Salih'in cevaplaması gerekenler

| # | Soru | Cevap yoksa varsayılanım (KOD ŞU AN BÖYLE) |
|---|---|---|
| **V0** | Katalog s.36'daki "AquaVARIO 251" ayrı ürün mü, dizgi hatası mı? | 241'in dizgi hatası |
| **V1** | 241 gerçekten 151'den BASIK (143 vs 200 mm) ve HAFİF (5 vs 7 kg) mi? ⭐sezgiye ters | katalog doğru, öyle çizdim |
| **V2** | `.hiz` tavanı 1.0 olsun mu (anma yüksekliği aşılamaz)? | evet, 1.0'a kırpıyorum |
| **V3** | `.hiz` = pompa devri mi (h ∝ hiz²) yoksa yükseklik yüzdesi mi (h ∝ hiz)? | **pompa devri** (karesel) |
| **V4** | Rampa τ=0.10 s doğru mu? Sahada 0→tam kaç saniye? | 0.10 s (toplam ~1.1 s) |
| **V5** | Kapanış açılışla aynı hızda mı? | evet, simetrik |
| **V6** | Ø14/Ø16 nozul seçeneği sunulsun mu? | hayır, yalnız Ø12 |
| **K1** | 241'in kolonu 151'inkinden gözle daha pütürlü mü? | evet (kırılma payı %60→%73) |

Karta katmadığım, boşluk olarak duran değerler: 120 W ve 270 W modellerinin
yükseklikleri (künyede model serisi var, sayı yok), Ø16 yükseklik eğrisi,
DMX kanal haritası, gerçek ölçülmüş debi tablosu (üretici yayınlamıyor —
Safe-Rain yasasıyla türetildi).

---

## 8. Depence cila kartı (2026-07-21 cila turu)

Çıta: Depence² estetiği. Hedef kare: `docs/referans/kare/vario-hedef-1.jpg`
(Bellagio t=125) — "merkez dolgun köpüklü sütun + solda kademeli yükseklik
dalgası; jet gövdesi yarı saydam değil KÖPÜKLÜ BEYAZ; tepe topuzu + geri düşen
mist". Su-özel gözlemler (defter): tepe hiç sivri bitmez; mist jetten doğar;
sualtı ışık jeti İÇERİDEN boyar ve yukarı sönümlenir.

### Bu turda uygulanacak efektler (envanterden)

| Envanter | Efekt | Karedeki karşılığı | Görev |
|---|---|---|---|
| #2 | Nozul glow sprite (additive, depthWrite:false) | jet dibindeki "kaynak parlaması" | Task 4 |
| #11 | Köpük dokusu: UV.y kayan 2 katman noise + eşik + uçta erosion | kolonun köpüklü BEYAZ gövdesi | Task 5 |
| #12 | Tepe topuzu: apekste köpük + saçak + geri düşen mist payı | tepe "topuzu" | Task 5 |
| #1 | HDR emissive + bloom eşik disiplini | glow yalnız parlak öğelerde | Task 6 (kalibrasyon) |

İkinci dalga (bu tur DEĞİL, envanterde bekler): #10 içeriden aydınlanma
(ters fresnel), #8 soft particles, #16 GPGPU; yeni adaylar #35-36 (KAYNAK
tazelemesi 2026-07-21).

### Aydınlatma karakteri (ayrışma kuralı — spec §2 KART v2)

| | VARIO öz ışığı (ops. AquaLIGHT-C) | AL-412 (ayrı cihaz) | DryDECK entegre |
|---|---|---|---|
| Konum | nozul çevresi halka, jetle BİRLİKTE | bağımsız konumlu halka | plaka ızgarasında mini |
| Güç | 151: ≤22 W · 241: ≤72 W (✅künye) | 4620 lm sınıfı (katalog.js) | küçük (18 W ünite) |
| Görsel imza | jet dibini içten boyar + küçük göl | geniş göl + suyu 4-halka mekanizmasıyla boyar | kısa menzilli nokta |
| Varsayılan | **TAKILI/AÇIK** (Faz 1 F1-3, aşağıdaki not) | kullanıcı ekler | entegre, sökülemez |

> ⚠**GÜNCELLEME (Faz 1, 2026-07-24, Salih F1-3 kararı):** bu satır eskiden
> "KAPALI (çıplak cihaz)" idi — spec 2026-07-21 §3'ün "ışık ayrı satılan opsiyon"
> okuması. Salih donanım gerçeğini verdi: 412C modülü fabrikada TAKILI satılıyor,
> müşteri nadiren söküyor → doğum artık TAKILI. Aşağıdaki "Çıplak cihaz ilkesi"
> bölümünün ilk maddesi de bu yüzden GEÇERSİZ (toggle sökülünce olan şeyi anlatır,
> doğum değerini değil). Kod: `proje.js` ekle() + `isikModulAlirMi`.

### Çıplak cihaz ilkesi (spec §3) — VARIO davranışı

- Paletten eklenen YENİ vario: öz ışık KAPALI → ışık gölü yok, kolon ortam
  tonunda (karanlık su), hue rampası suyu boyamaz.
- Salih 412C ekleyince mevcut v6 F3 mekanizması (uHalka, en yakın 4 halka)
  suyu boyar — kod değişikliği gerekmez, bu zaten çalışıyor.
- Sağ panelde "öz ışık (AquaLIGHT-C)" onay kutusu; işaretlenince eski davranış.
- Eski .aqshow: ozIsik alanı OLMAYAN kayıt = AÇIK (mevcut sahne değişmez).

### [ELLE] cila soruları (görsel kapıda sorulacak)

| # | Soru |
|---|---|
| C1 | Kolon beyazlığı hedef karedeki "köpüklü beyaz"a vardı mı, yoksa hâlâ yarı saydam mı? |
| C2 | Tepe topuzu okunuyor mu (topuz + geri düşen mist), yoksa sivri/blok mu? |
| C3 | Nozul glow'u abartılı mı (Depence'te kaynak parlar ama sahneyi yıkamaz)? |
| C4 | Çıplak VARIO (ışıksız) sahnede yeterince görünür mü, yoksa fazla mı karanlık? |
| C5 | Kolaylaştırma bakışı (spec §3): editörde VARIO ile en zahmetli iş ne? (ör. 151/241 arası geçiş, ışık ekleyip hizalama, yükseklik ayarı) — cevabı bu tura küçük bir iş olarak eklenir |

---

## 9. Faz 2 künye alanları (2026-07-25 cihaz turu — VARIO 151/241)

Faz 2'nin her turda işlediği dört alan (spec 2026-07-24 §Faz 2, K1/K2/K4).
Kod artık bunları OKUYOR; tür adına bakan dallar eriyor.

| Alan | VARIO 151 / 241 | Kaynak | Kodda nereye gidiyor |
|---|---|---|---|
| `kontrol` | `'surekli'` — değişken debi DMX sub-pompa | ✅katalog ("DMX sub-pump", 0.5 bar, hız kanalı var) | `proje.js solenoidMi` → smooth master + `.hiz` kanalı; Faz 4'te koreograf desenini `.hiz`'e yazacak (pat-pat kökünün kalıcı çözümü) |
| `yon` | `{ nozulMm: [12,14,16] }` — pan/tilt eksen YOK | ✅katalog nozul grafiği | `yonYetenekleri` → eksen kanalı doğmaz (V6 hâlâ açık: Ø14/Ø16 seçeneği sunulacak mı) |
| `dmx` | mantıksal: master/hiz/hue/beyaz · resmi: **null** | spec sheet "DMX-RDM controlled" der, kanal listesi BASMAZ | köprü (Art-Net) bu listeyi eşleyecek; resmi sıra eksik-listesinde |
| `montaj412` | `'nozul-ici-halka'` — nozul, C-tipi halkanın merkez deliğinden geçer | ✅ürün gerçeği (Salih, K2) | `isikModulAlirMi` (panel toggle) + motor'un çakışma-güvenli ışık matematiği (o çakışma EN DOĞAL yerleşim, bkz. Faz 1.5 notu) |

**Neden `kontrol` bu turda ve neden önemli:** besteci pat-pat sorununun kökü
"sürekli cihazda master'ı kesmek"ti. Doğrudan yolda çözüldü (master açık, ifade
hızda) ama GRUP yolunda hâlâ açık (Faz 4/G1). G1'in okuyacağı gerçek bu alandır —
alan şimdi dolduruldu ki iki iş aynı veriye baksın, ikinci kez tür listesi yazılmasın.

→ **[ELLE] F2-V1:** VARIO'nun DMX kanal sırası elinde var mı (RDM dökümü ya da
Depence fixture kütüphanesinden)? Yoksa köprü turunda kanal sırası müşteriden
istenecek — uydurmuyorum.
