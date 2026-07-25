# KART v2 — AquaJUMP / AquaJUMP GIANT

⚠ **Kapsam notu:** VARIO/DryDECK/AquaLIGHT'ın aksine JUMP'ın daha önce
yazılmış bir v7 "cihaz birebir" kimlik kartı YOK. Bu dosya JUMP cila turunun
HAZIRLIK adımı için açılıyor (SWITCH/ROBO kartlarıyla aynı kapsam): künye +
motorun mevcut hâli + cila kartı. Tam fizik çapraz-doğrulama (VARIO §2-7
gibi) bu turun kapsamı DIŞINDA. Görsel/davranış kararları [ELLE] Salih'te.

⚠ **Karıştırılmasın:** `docs/cihaz-karakter-kartlari.md`'de JUMP'ın hemen
yanında **AquaPOP JET (PN 1090)** var ("⚠ BİZDE YANLIŞ" notuyla) — bu TAMAMEN
AYRI bir cihaz (Ø3mm delikten 20-40cm su topu/damla fırlatan bir efekt, ark
değil, laminer değil). POP JET'in kendi arketip hatası zaten önceden
düzeltilmiş (`katalog.js`'de ayrı `pop` arketipi var). Bu kart yalnız
AquaJUMP / AquaJUMP GIANT'ı kapsar.

Kaynaklar: `docs/referans/spec-sheet-ozeti.md` §13-14 (künye) ·
`studio/data/katalog.js` (PN 1080/1081) · `studio/data/zarf-urunler.js`
(`maksTepeM: 1.5` / `3.0`) · `docs/cihaz-karakter-kartlari.md` ("kartı geldi"
özeti) · `docs/referans/depence-kareler.md` (jump-hedef-1/2-temsili/3-4-gercek) ·
`studio/js/laminer.js`, `isik-borusu.js`, `govde.js`, `besteci.js` (kod taraması).

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Motorun mevcut hâli

- **`motor.js`'te `PRESETLER.jump` YOK** — JUMP kendi ayrı modülünde:
  `studio/js/laminer.js` (327 satır, `LaminerJet` sınıfı) + `studio/js/
  isik-borusu.js` (ışık-boru fizik modeli, Node-test edilebilir saf JS).
  `motor.js:526` yalnız `'laminer'` etiketini geçerli tür kümesine (`MOTORDA`)
  ekliyor.
- **Zaten yapılmış olanlar** (envanter #28'in "boşta" etiketi YANLIŞTI, bu
  taramada düzeltildi):
  - Parabolik yol → `TubeGeometry` (`laminer.js:79-94` `lanceEgrisiUret`,
    `laminer.js:254`) — ✅ var.
  - "Işık borusu" modeli (`isik-borusu.js`): ışık suya BOYANMIYOR, TAŞINIYOR
    (`T = exp(-sızıntı·mesafe)`) ve kırılma noktasında (`uKopmaS`) parlıyor —
    jump-hedef-3-gercek'teki "ışık tüm ark boyunca fiber gibi taşınıyor"
    gözlemiyle birebir. `GORSEL_TAVAN_M = 5.0` (ışık ~5m'de söner, pompa
    gücünden bağımsız).
  - Kırılma anı: `laminer.js:289-301` kopma parlaması (uçan parlak uç) +
    `laminer.js:304-318` "çarpma havuzu" (iniş noktası ışıklı disk) — hem
    jump-hedef-4 (kopan uç) hem jump-hedef-3 (taban ışıklı halka) karşılığı.
  - Besteci rolü: `besteci.js:931-943` — `step` tipi enerji-kapılı master
    kanalı + **lead-in garantisi** (ilk 4 sn taban akış zorunlu, "sov boş
    başlamasın" dersi) — kendi özel ritim mantığı VAR.
- **Gerçek PBR transmission/refraction YOK** — `suMalzemesi()` özel bir
  `ShaderMaterial` (Fresnel + kayan çizgi dokusu), `MeshPhysicalMaterial`
  `transmission` kullanmıyor. Cam-berraklık hissi shader ile taklit ediliyor.
- ⚠ **En büyük boşluk: JUMP ve JUMP GIANT kodda AYRIŞMIYOR.** İkisi de aynı
  `LaminerJet` sınıfını, aynı **hardcoded** başlangıç hızı/açısını kullanıyor
  (`laminer.js:253` `lanceEgrisiUret(7, 40)` — v0=7 m/s, θ=40°, ürüne göre
  DEĞİŞMİYOR) ve aynı **hardcoded** gövdeyi (`laminer.js:326` `jumpGovde(40)`
  — 40°, ne JUMP'ın şema açısı 30°'yi ne GIANT'ın 35°'sini kullanıyor, ne
  boyut farkını yansıtıyor). Künyedeki Ø12/16, 30°/35°, 1.5m/3.0m, 4m/5.5m
  farkları veri katmanında (`zarf-urunler.js`) var ama render koduna
  BAĞLANMAMIŞ. → şu an editörde GIANT seçmek görsel olarak JUMP'la AYNI
  sonucu veriyor. **Bu kartın en somut KOD maddesi.**
- Gövde: `govde.js:136-151` `jumpGovde(aciDeg=40)` — eğik silindir + sac taban,
  JUMP/GIANT için TEK fonksiyon, boyut farkı yok.

## 3. Depence cila kartı — hedef kareler

`docs/referans/depence-kareler.md` satır 48-51:

| Kare | Kaynak | Ne öğretiyor |
|---|---|---|
| `kare/jump-hedef-1.jpg` | OASE t=85 | nokta-nokta ark geometrisi + parlak kırmızı uçlu ince arklar |
| `kare/jump-hedef-2-temsili.jpg` | Higgsfield [TEMSİLİ] | cam boru dokusu: pürüzsüz şeffaf laminer ark, içten tek renk aydınlatma, parlayan nozul tabanı, sprey/köpük YOK |
| `kare/jump-hedef-3-gercek.jpg` | üretici görseli [GERÇEK], jump.mp4 t=37.5 | tam ark fazı: 4 camgöbeği laminer ark X kesişimi; ark gövdesi cam gibi kesintisiz, ışık TÜM ark boyunca taşınıyor (fiber etkisi); nozul diski zeminde aydınlık halka |
| `kare/jump-hedef-4-gercek.jpg` | üretici görseli [GERÇEK], jump.mp4 t=24 | sıçrama/kesme anı: ark ortadan kopmuş, kopan uç parlayarak uçuyor, kuyruk nozula geri çekiliyor — "jumping jet" davranışının tanım karesi |

### Bu turda uygulanacak efektler

| Kaynak | Efekt | Karedeki karşılığı | Durum |
|---|---|---|---|
| envanter #28 | Tüp/kırılma noktası | jump-hedef-3/4 | ✅ zaten kodda (`laminer.js`), yalnız DOĞRULANACAK |
| — | JUMP ↔ GIANT ayrışması (Ø12/16, açı, boy) | iki farklı ürünün ekranda FARKLI görünmesi | **yeni — KOD gerekiyor** (§2'deki en büyük boşluk) |
| — | "Kuyruk nozula geri çekiliyor" (jump-hedef-4) | mevcut kod yalnız opaklık/flash geçişi yapıyor, geometrik büzülme YOK | kontrol edilecek — gerçek retract animasyonu mu gerekiyor, yoksa mevcut flash yeterli mi? [ELLE] J4 |
| — | Kırmızı uçlu ark (jump-hedef-1) | genel `setRenk()` zaten var, özel "kırmızı uç" davranışı yok | muhtemelen gerekmez — jet rengi zaten RGBW kanalından geliyor |

### [ELLE] cila soruları (görsel kapıda sorulacak — KOD sonrası)

| # | Soru |
|---|---|
| J1 | Ark gövdesi jump-hedef-3'teki gibi "cam gibi kesintisiz" mi okunuyor, yoksa parçacık/sprey hissi mi sızıyor? |
| J2 | JUMP ile GIANT ekranda gözle ayrışıyor mu (boy/açı/kalınlık), yoksa hâlâ aynı mı görünüyor? |
| J3 | Kırılma anı (kopan uç + çarpma havuzu ışığı) jump-hedef-4'teki "kopup uçan parlak uç" hissini veriyor mu? |
| J4 | "Kuyruk nozula geri çekiliyor" — bu ayrı bir geometrik animasyon olarak mı görülmeli, yoksa mevcut opaklık geçişi (flash+fade) yeterli mi? |
| J5 | GIANT'ın entegre RGBW ışığı (JUMP'ta yok) sahnede fark yaratıyor mu? |
