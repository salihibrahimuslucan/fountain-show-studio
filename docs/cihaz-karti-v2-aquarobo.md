# KART v2 — AquaROBO

⚠ **Kapsam notu:** VARIO/DryDECK/AquaLIGHT'ın aksine ROBO'nun daha önce
yazılmış bir v7 "cihaz birebir" kimlik kartı YOK. Bu dosya ROBO cila turunun
HAZIRLIK adımı için açılıyor (SWITCH kartıyla aynı kapsam): künye + motorun
mevcut hâli + cila kartı. Tam fizik çapraz-doğrulama (VARIO §2-7 gibi) bu
turun kapsamı DIŞINDA. Görsel/davranış kararları [ELLE] Salih'te.

Kaynaklar: `docs/referans/spec-sheet-ozeti.md` §12 (künye) · `studio/data/katalog.js`
(PN 1001) · `studio/data/zarf-urunler.js` (`maksTepeM: 20.0`, `salvo: null`,
`servo: null`) · `docs/cihaz-karakter-kartlari.md` ("kartı geldi" özeti) ·
`docs/referans/depence-kareler.md` (robo-hedef-1/2/3-gercek, robo-govde-gercek) ·
`studio/js/motor.js`, `govde.js`, `besteci.js`, `editor.js`, `proje.js` (kod taraması).

Aile notu: `katalog.js` üç ürünü `arketip: 'robo'` altında topluyor — **AquaROBO**
(pn 1001, hedef bu kart), **AquaROBO-ROLL** (pn 1000, 3 eksen, ayrı künye,
kapsam dışı) ve **AquaHYDRA** (pn 1007, 360° yön + 15° tilt, kalın/dokulu
kolon — ROBO'nun İNCE-BERRAK karakterinin TAM TERSİ, kapsam dışı). Ayrıca
**AquaSWING** (ROBO'yla aynı jet, tek eksen, 1 ışık diski) kod yolunu paylaşıyor
(`govde.js` `roboGovde(1)`) ama ayrı künye/kart — bu turun konusu değil.

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Motorun mevcut hâli

- `PRESETLER.robo` (`motor.js:294-303`): karakter kartından ("İNCE-ORTA BERRAK
  jet, kuyruklu yıldız hissi") türeyen düşük `aeration: 0.18`, `doku: 'damla'`.
  Yükseklik zarfı `zarfParca('AquaROBO', ...)` → künyeden 20 m tavan.
- **2 eksen servo zaten kodda var**: `motor.js:1253-1262` `setPanTilt(panDeg,
  tiltDeg)` — `uNozulYon` yönü hem konum hem hız compute shader'ına geçiyor.
- **"Kuyruklu yıldız" (comet-tail) zaten kodda var**: `motor.js:1296-1304` —
  nozul dönerken (pan/tilt), açısal hız × uçuş süresi kadar bir gecikme açısı
  parçacıkları süpürmenin GERİSİNE dağıtıyor. Karakter kartındaki "kuyruklu
  yıldız hissi" ifadesi bu mekanizmanın karşılığı — **KOD zaten yapılmış**,
  cila turunda yalnız DOĞRULANACAK.
- **Besteci rolü**: `besteci.js:813-826` **"MELODİK SÜPÜRME"** — pan sinüs
  dalgası (bölüme bağlı periyot: build 5s, drop 3.2s, diğer 8s), genlik orta-bant
  enerjisine bağlı (`35 + 35·mid + drop?15`). ROBO ayrıca `.tilt` kanalı da alır
  (`8 + 20·enerji`°) — SWING almaz (tek eksen).
- Gövde: `govde.js:175-214` `roboGovde(2)` — taban plakası + U-yoke mafsal +
  yatay servo silindiri + 2 yan disk, her diskte **1 LED halkası (torus)**.
  ⚠ **Gövde boşluğu:** `robo-govde-gercek.jpg` referansı her kolda **12'li
  LED halkası** gösteriyor; kod yalnız disk başına **1** halka çiziyor —
  görsel sadeleştirme, cila turunun aday konusu.
- ⚠ **Tilt aralığı tutarsızlığı:** künye her eksen için ±90° (180°) diyor,
  ama `editor.js:110-111` tilt'i **0-45°** ile sınırlıyor (`proje.js:180-181`
  varsayılan 26°) + `govde.js:210`'da ekstra `tiltRad·0.6` sönümü var. Yani
  motor künyenin izin verdiğinden çok daha dar bir tilt penceresinde çalışıyor
  — muhtemelen kasıtlı (nozul dümdüz aşağı bakmasın diye), ama künyeyle
  birebir DEĞİL. → [ELLE] R5.

## 3. Depence cila kartı — hedef kareler

`docs/referans/depence-kareler.md` satır 44-47:

| Kare | Kaynak | Ne öğretiyor |
|---|---|---|
| `kare/robo-hedef-1.jpg` | Bellagio t=103 | kavisli süpüren jet yayları ("oarsmen") tam süpürme fazında; yay ucu mist bırakıyor |
| `kare/robo-hedef-2-gercek.jpg` | Aquatronic [GERÇEK] | süpürme fazı: çapraz eğik jetler X kesişen yay ailesi; jet tabanında LED halka parlaması; jet gövdesi ince, damla-dizili; kırmızı monokrom sahne + fasadın aynı renkle yıkanması |
| `kare/robo-hedef-3-gercek.jpg` | Aquatronic [GERÇEK] | dikey faz: çift kolonlu ince jetler hafif eğimle yükseliyor, tepe uçları saçaklı; süpürmeden dik duruşa geçiş — 2 eksen hareket zarfının iki ucu |
| `kare/robo-govde-gercek.jpg` | Aquatronic [GERÇEK] | gövde referansı: merkezde eğimli nozul borusu + iki yana mafsallı kolda **12'li LED halkaları**; sualtı gece çekiminde halkalar aşırı parlak disk |

spec-sheet-ozeti.md §12 (satır 629) bu dört kareyi zaten hareket zarfının iki
ucu (süpürme ↔ dikey) olarak yorumluyor — motor.js'in pan/tilt mekanizması
bu iki ucu ZATEN üretebiliyor, cila turunun işi malzeme/gövde detayı.

### Bu turda uygulanacak efektler

| Kaynak | Efekt | Karedeki karşılığı | Durum |
|---|---|---|---|
| görsel gövde boşluğu | Disk başına 1 → 12 LED halkası (küçük halka kümesi) | robo-govde-gercek | **yeni** — envanterde henüz maddeleşmemiş, KART bunu ilk kez işaretliyor |
| envanter #2 | Nozul glow sprite (tüm su cihazlarında genel yapıldı) | jet dibi kaynak parlaması | ✔ VARIO turu (genel, ROBO'da doğrulanacak) |
| envanter #12 (aday) | Tepe topuzu/saçak (VARIO'da yapıldı) | robo-hedef-3 "tepe uçları saçaklı" | kontrol edilecek (ROBO turu adayı — #12 şu an yalnız VARIO/geyser/SWITCH etiketli) |
| — | Kuyruklu yıldız (comet-tail) süpürme izi | robo-hedef-1/2 (yay/X kesişimi) | ✅ zaten kodda (motor.js:1296-1304), yalnız DOĞRULANACAK |

⚠ #12'nin "Hangi cihaza" listesine ROBO'yu eklemek (envanter güncellemesi)
bu KART yazımının bir parçası — aşağıda uygulanacak.

### [ELLE] cila soruları (görsel kapıda sorulacak — KOD sonrası)

| # | Soru |
|---|---|
| R1 | Süpürme fazı robo-hedef-1/2'deki gibi kavisli/X-kesişen okunuyor mu, yoksa mekanik/robotik mi duruyor? |
| R2 | Dikey faza geçiş (robo-hedef-3) 2 eksenin doğal bir uç noktası gibi mi hissettiriyor? |
| R3 | Jet ince-berrak karakteri (kuyruklu yıldız hissi) VARIO'nun köpüklü kolonundan yeterince AYRIŞIYOR mu? |
| R4 | Gövde detayı: disk başına 12 küçük LED halkası eklensin mi, yoksa mevcut tek-halka sadeleştirme yeterli mi (performans/karmaşıklık dengesi)? |
| R5 | Tilt aralığı (şu an 0-45°, künye ±90° diyor) sahnede yeterince dinamik mi, yoksa künyeye daha yakın açılsın mı? |
