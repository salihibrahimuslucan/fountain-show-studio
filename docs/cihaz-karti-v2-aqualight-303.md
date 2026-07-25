# KART v2 — AquaLIGHT 303

Faz 1 Task 4 (plan: `docs/superpowers/plans/2026-07-24-faz1-isik-temeli.md`).
412/412C amiral kartının (`docs/cihaz-karti-v2-aqualight.md`) kısaltılmış
kardeşi ama STARLIGHT 403 ile aynı küçük gövde ailesinden (bkz.
`docs/cihaz-karti-v2-starlight-403.md`) — halka değil noktasal spot. §5/§6
(su boyama/kamaşma) fiziği ORTAK, burada tekrar edilmedi.

Veri kaynağı: **YALNIZ** `docs/referans/spec-sheet-ozeti.md` §11 (satır
506-570). Özette olmayan alan burada "PDF'te basılı değil" diye işaretlenir,
uydurulmaz.

Etiketler: ✅ spec-sheet-ozeti'nden doğrulandı · ⚠ çıkarım/tutarsızlık ·
❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye (✅ spec-sheet-ozeti §11 birebir)

| Alan | Değer |
|---|---|
| Model | AquaLIGHT 303 |
| Boyut (ØxH) | 110 × 62 mm (flanş Ø110, iç gövde Ø79 — çizimden) |
| Voltaj | 24 VDC |
| Güç | 9W (PDF'te böyle, boşluksuz basılı) |
| Akım | 0.4 A |
| Renkler | **RGB (beyaz kanal YOK)** |
| LED tipi | Edison PowerLED, onboard driver, alüminyum PCB |
| Işık akısı | 512 lm (RGB full) |
| Güç & DMX | Combo Cable |
| Kontrol | DMX + RDM |
| Koruma | IP68 |
| Malzeme | Paslanmaz çelik, temperli cam |
| Ağırlık | 1 kg |
| Ürün No | 3019 |
| Simülasyon kütüphanesi | Syncronorm Depence Library mevcut |

Sloganı: *"Illuminate Excellence with AquaLIGHT 303!"* — RGB ana renklerinin
her biri eşit parlaklıkta ölçülmüş, homojen renk karışımı vurgusu. **Gelişmiş
sıcaklık kontrolü + termal koruma** sayesinde kuru ortamda da güvenle monte
edilebilir diye ayrıca belirtilmiş (açık alan çeşmeleri için).

## 2. Optik — STARLIGHT 403 ile BİREBİR AYNI tablo

| Mesafe (m) | Geniş lens koni çapı | Dar lens koni çapı |
|---|---|---|
| 2.5 | 2.89 | 0.43 |
| 5.0 | 5.77 | 0.87 |
| 7.5 | 8.66 | 1.31 |
| 10.0 | 11.54 | 1.74 |
| 12.5 | — | 2.18 |

Spec-sheet-ozeti'nin kendi notu: *"grafikten okundu; sayısal tablo metinde
basılı değil"* — yani bu değerler PDF'in grafiğinden okunmuş (STARLIGHT
403'ünkiyle birebir aynı sayılar ve menzil bandı), doğrudan basılı bir sayısal
tablo DEĞİL. Aynı 60°/10° lens ailesi (`2·d·tan(30°)` / `2·d·tan(5°)` ile
tutuyor).

## 3. LED dizilimi

- PDF LED adedini açıkça basmıyor. ⚠ Aile adlandırma kuralına göre (403 = 4
  renk kanalı, 606 = 6 renk kanalı) **303 = 3 renk kanalı** — bu isimlendirme
  deseni "Renkler: RGB (W yok)" alanıyla TUTARLI ama kesin LED sayısı
  görselden sayılamıyor (spec'in kendi ifadesi).
- Görselden: iki form — (1) gömme flanşlı puck, "Assembly Holes" etiketli
  Ø110 montaj delikli plaka (DryDECK Option), (2) yoke/mafsal braketli
  yönlendirilebilir mini spot. STARLIGHT 403'ün ikili formunun AYNISI.
- Ön camda merkezde küçük çok-lensli küme (halka değil, spot karakteri) —
  STARLIGHT 403 ile aynı gövde ailesi, §7'de detaylandırılan noktasal-spot
  modeli burada da geçerli.
- Şema sayfasında 4 ayrı gövde çizimi: düz puck, braketli, silindirik dik ve
  açılı spot varyantları.

## 4. Renk ve kontrol — ⚠ AİLENİN TEK BEYAZSIZ CİHAZI

**3 DMX renk kanalı (RGB)** — spec kendi notunda vurguluyor: *"ailedeki tek
W'suz cihaz; timeline'da beyaz kanalı olmayan cihaz tipi olarak
modellenmeli"*.

Bu, Faz 1 Task 1'in `rgbwKaris(hueRenk, beyaz, dogal)` fonksiyonuyla doğrudan
kesişiyor: fonksiyon her zaman bir `beyaz` parametresi bekliyor (hue'nun
üstüne screen-karışımıyla biner). AquaLIGHT 303'te donanımsal beyaz LED
YOK — yani bu cihaz için `beyaz` her zaman 0 olmalı (ya da UI'da beyaz
kaydırıcısı hiç gösterilmemeli). Kod tarafında bir kesme YOK (fonksiyon
`beyaz=0` ile zaten "saf doygun hue" veriyor, geriye uyumlu), ama panel
UI'ının 303 için beyaz şeridini gizlemesi/gizlememesi bir tasarım kararı —
§7'de not.

## 5-6. Su boyama / kamaşma

Bkz. `docs/cihaz-karti-v2-aqualight.md` §5-§6 — fizik ORTAK.

## 7. Simülatör ↔ gerçek farkları + katalog.js uyum kontrolü

**`studio/data/katalog.js`'te AquaLIGHT 303 kaydı YOK.** `isik` grubundaki
tüm kayıtlar (satır ~153-189): 412, 412C, 406, 406C, 512C, 312C, 306C, 206C,
112C, STARLIGHT 403 — 303 listede **hiç yok**.

| Konu | Gerçek (spec-sheet-ozeti §11) | Şimdi (katalog.js / motor) | |
|---|---|---|---|
| Katalog kaydı | mevcut ürün, PN 3019 | **kayıt yok** | ❌ |
| Renk kanalı | RGB, beyaz YOK | — (kayıt yoksa `rgbwKaris` hiç çağrılamaz) | ❌ |
| Lümen | 512 lm | — (`parlaklikOlcek` hesaplanamaz, 406C'ye oranı 512/1746≈0.29) | ❌ |
| Gövde | Ø110×62 mm, nokta spot | — | ❌ |

En yakın akrabası STARLIGHT 403 katalogda var ama **o kaydın kendisi de
hatalı** (bkz. `-starlight-403.md` §7: `guc: '9 W'` aslında 303'ün gücü — bu
karışıklık muhtemelen 303'ün hiç eklenmemiş olmasından kaynaklanıyor, biri
303 verisini yanlışlıkla STARLIGHT kaydına yazmış olabilir).

## 8. Onay sonrası KOD planı (aşağıdaki [ELLE] onayına bağlı)

1. **Katalog kaydı eklenir** — `AquaLIGHT 303`, `pn: 3019`, `arketip:
   'rgb_spot'` (veya STARLIGHT ile paylaşılan yeni bir nokta-spot arketipi,
   bkz. `-starlight-403.md` §8 madde 2), `teknik: { guc: '9 W', lumen: 512,
   renk: 'RGB' }`.
2. **Beyaz kanalsız kontrol** — panel UI'ı 303 için beyaz şeridini
   gizleyebilir ya da devre dışı gösterebilir (motor tarafında zorunlu
   değişiklik yok, `beyaz=0` zaten doğru davranıyor).
3. **STARLIGHT 403 kaydının düzeltilmesiyle EŞ ZAMANLI yapılmalı** — aksi
   halde iki kayıt arasındaki güç-değeri karışıklığı (§7) tekrar oluşabilir.

---

## [ELLE] onay kapısı

- [ ] **S-303-1 katalog kaydı eklensin mi** — AquaLIGHT 303 şu an paletten
  hiç eklenemiyor; eklenmesi onaylanıyor mu (STARLIGHT 403 kaydının
  düzeltmesiyle birlikte, §8)? Varsayılan: evet, eklerim. **[ELLE — Salih]**
- [ ] **S-303-2 beyaz kanalsız panel** — 303 için editör panelinde beyaz
  kaydırıcısı gizlensin mi, yoksa görünüp "etkisiz" mi kalsın (RGBW+ modelinde
  beyaz=0 sabit)? Varsayılan: gizlerim (donanıkta yok, UI'da göstermek
  yanıltıcı). **[ELLE — Salih]**
- [ ] **S-303-3 gövde/render paylaşımı** — 303 ve STARLIGHT 403 aynı Ø110×62
  gövde ailesi (nokta spot); render'da tek prefab paylaşsınlar mı (yalnız
  renk/parlaklık farklı), yoksa ayrı mı modellensin? Varsayılan: tek prefab,
  STARLIGHT 403 kartı §8 madde 2 ile birlikte uygularım. **[ELLE — Salih]**
