# KART v2 — AquaSWITCH

⚠ **Kapsam notu:** VARIO/DryDECK/AquaLIGHT'ın aksine SWITCH'in daha önce
yazılmış bir v7 "cihaz birebir" kimlik kartı YOK (yalnız
`docs/cihaz-karakter-kartlari.md`'de kısa bir özet var). Bu dosya SWITCH cila
turunun HAZIRLIK adımı için açılıyor: künye + cila kartı (VARIO kartının §8'i
gibi). VARIO'daki gibi tam fizik çapraz-doğrulama (§2-7: sektör kıyası,
rampa sabiti türetimi vb.) bu turun kapsamı DIŞINDA — istenirse ayrı bir
adım olarak sonra eklenir. Görsel/davranış kararları [ELLE] Salih'te.

Kaynaklar: `docs/referans/spec-sheet-ozeti.md` §3 (künye) · `studio/data/katalog.js`
(PN 1041) · `studio/data/zarf-urunler.js` (AquaSWITCH zarfı, `maksTepeM: 6.0`,
`salvo: null`) · `docs/cihaz-karakter-kartlari.md` ("kartı geldi" özeti) ·
`docs/referans/depence-kareler.md` (switch-hedef-1/2/3) · web araştırması
2026-07-22 (SWITCH KAYNAK adımı, envanter #37-38).

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Motorun mevcut hâli (`studio/js/motor.js`)

- `PRESETLER.switch` (motor.js:280-293) zaten var: künyeden türeyen hız
  (`zarfParca('AquaSWITCH', ...)` → 6 m tavan → 9.08 m/s), `govdeTip: 'switch'`.
  Önceki bir turda sabit-hız hatası (5.5-6.8 m/s) düzeltilmiş.
- Ritim: `besteci.js:790-794` SWITCH'e özel besteci rolü var — **"KESKİN
  VURUŞ"**, beat-grid'e bağlı faz-gecikmeli chase. Yalnız açık/kapalı; sürekli
  hız kanalı YOK (`motor.js:284` "hız kanalı DOĞMAZ").
- Gövde: `studio/js/govde.js:154-162` `switchGovde()` — kutu + silindir nozul;
  karakter kartına göre "yakın" ama gerçek üründeki kubbe başlıklı entegre
  ışık ünitesi eksik.
- Envanterden hazır/bedava gelenler: #2 nozul glow sprite (tüm su cihazları
  için VARIO turunda genel yapıldı) — SWITCH'te ayrı iş gerekmeden görünür
  olmalı, cila turunda yalnız DOĞRULANIR.

## 3. Depence cila kartı — hedef kareler

Üç referans (`docs/referans/depence-kareler.md` satır 33-35, `[GERÇEK]`
gözlem satır 74-75):

| Kare | Kaynak | Ne öğretiyor |
|---|---|---|
| `kare/switch-hedef-1.jpg` | Bellagio t=25 | tüm hat aynı anda tam açık; ince, ayrık, keskin dikey sütunlar; staccato "açık faz" netliği; taban ışık şeridi |
| `kare/switch-hedef-2-gercek.jpg` | Aquatronic [GERÇEK], switch test.mp4 t=16 | tam açık faz: üç ince beyaz kolon, köpüklü uç topuzu; **kesme sonrası kolon havada BÜTÜN halinde kopuyor** (üst kütle düşerken taban temiz) — motor için aç-kapa zamanlama referansı |
| `kare/switch-hedef-3-gercek.jpg` | Aquatronic [GERÇEK], drydeck switch2.mp4 t=27 | gece/ışıklı keskin jet: LED halkalı nozuldan tek ince mavi kolon, tabanda mist havuzu; jet gövdesi boncuk boncuk damla dizisine ayrışıyor (laminer değil, darbeli) |

VARIO'dan FARKI: VARIO'nun problemi malzeme/görünüm (yarı saydam → köpüklü
beyaz) idi. **SWITCH'in problemi zamanlama/davranış** — kesme anının kendisi
nasıl göründüğü (kolon tabanı temiz kesiliyor, üst kütle havada bütünlüğünü
koruyarak uçmaya devam ediyor), artı aynı köpük/topuz malzeme dersi.

### Bu turda uygulanacak efektler (envanterden)

| Envanter | Efekt | Karedeki karşılığı | Durum |
|---|---|---|---|
| #11 | Köpüklü jet dokusu (VARIO'da yapıldı, SWITCH'e uygulanacak) | switch-hedef-2/3 köpüklü/boncuklu kolon | ✔ VARIO turu (kod var, SWITCH'e bağlanacak) |
| #12 | Tepe topuzu (VARIO'da yapıldı, SWITCH'e uygulanacak) | switch-hedef-1/2 tepe topuzu | ✔ VARIO turu (kod var, SWITCH'e bağlanacak) |
| #10 | İçeriden aydınlanma (ters fresnel) | switch-hedef-3 LED halkalı içten ışıklı kolon | kontrol edilecek (henüz yapılmadı, SWITCH adayı) |
| #37 | Solenoid tepki süresi ~20 ms (Fontana POP Jet, ✅kaynaklı ama Aquatronic'in kendi ürünü değil) | aç/kapa gecikmesi | boşta — [TÜRETİM] uyarısıyla kullanılabilir |
| #38 | Kesilen kolonun havada bütün kütle halinde kalması | switch-hedef-2 "kolon havada bütün halinde kopuyor" | **kaynak YOK** — [TÜRETİM] tasarım UYGULANDI (2026-07-22 KOD adımı, `motor.js` `aniKesme`/`uKapali`); GÖRSEL KAPI [ELLE] bekliyor, bkz. §"KOD adımı sonuçları" |

⚠ #38 bu kartın en zor maddesi: mevcut jet sistemi muhtemelen anlık
parçacık-emisyon aç/kapa yapıyor (emisyon durunca kolon HEMEN kaybolur).
Gerçek davranış — taban anında temiz ama önceden fırlamış su kütlesi ayrı bir
"kopuk parça" gibi 1-2 sn uçuşuna devam edip düşüyor — parçacık sisteminde
muhtemelen "emisyonu durdur ama var olan parçacıkların ballistik hareketini
KESME" mantığına yakın olabilir (zaten `life`/`speed` zarfı olan bir sistemde
bu şekilde çalışıyor olabilir — motor.js'in emisyon/ömür mekanizması KOD
adımında incelenmeli, bu kart yalnız hedefi tarif ediyor).

### Aydınlatma karakteri

SWITCH'in ops. AquaLIGHTxC'si solenoid devresiyle birleşik (ayrı kontrol
kartı yok) — VARIO'nun "öz ışık" (ops. AquaLIGHT-C) mekanizmasıyla AYNI
ayrışma kuralı geçerli olmalı (bkz. `docs/cihaz-karti-v2-aquavario.md` §8
Aydınlatma karakteri tablosu): varsayılan KAPALI (çıplak cihaz ilkesi),
kullanıcı ekleyince suyu boyar. Yeni kod gerekmeyebilir — VARIO turunda
kurulan `ozIsik` bayrağı (proje.js, motor.js `setOzIsik`) SWITCH'e de
uygulanabilir olmalı; KOD adımında doğrulanacak.

### [ELLE] cila soruları (görsel kapıda sorulacak — SWITCH KOD adımı sonrası)

| # | Soru |
|---|---|
| S1 | Kesme anı gerçekçi mi — taban temiz kesiliyor mu, üst kütle "kopuk parça" gibi havada bütün kalıp düşüyor mu, yoksa tüm kolon aynı anda mı kayboluyor? (envanter #38, en kritik madde) |
| S2 | Köpük/topuz (VARIO'dan taşınan #11-12) SWITCH'in daha ince/boncuklu kolonunda da inandırıcı mı, yoksa VARIO'ya özel mi kalıyor? |
| S3 | Işıklı SWITCH (LED halkalı) switch-hedef-3'teki gibi ince mavi kolonu içeriden mi boyuyor? |
| S4 | Çıplak SWITCH (öz ışık kapalı) sahnede yeterince görünür mü? |
| S5 | Aç-kapa gecikmesi (envanter #37, ~20ms mertebesi) sahnede "ani" hissi veriyor mu, yoksa hâlâ yumuşak/rampa hissi mi var? |

## KOD adımı sonuçları (2026-07-22, cila turu)

Kare kanıtı (`bash tools/smoke.sh "studio/index.html#ornek=_test-switch&t=<sn>"`,
test sahnesi `studio/ornekler/_test-switch.aqshow`: tek switch, master 0.3s'de
açılır, 2.0s'de kapanır) DÜZELTMEDEN ÖNCEKİ hâli SOMUT olarak doğruladı:
kapanıştan 30 ms sonra (t=2.03) ekranda TEK bir su parçacığı bile kalmıyordu
— kesim anında havada olan su da parçacık yaşından bağımsız ANINDA yok
oluyordu. Kök sebep: `setMaster` görünürlüğü TEK bir global çarpanla
(`uAlfa = baseAlfa * master`) sürüyordu; master 1→0 olduğunda TÜM parçacıklar
(yaşları ne olursa olsun) aynı karede saydamlaşıyordu.

**Düzeltme** (`studio/js/motor.js`, yalnız `switch` preseti — preset'e
`aniKesme: true` eklendi): AIR'in zaten çalışan salvo "reload sessizliği"
deseni (`salvoKapali`, konum shader'ındaki park dalı) yeniden kullanıldı.
Yeni bir `uKapali` kapısı (`setMaster`'da `this.master>0` iken kapanırsa 1
olur) konum shader'ının doğum dalına `salvoKapali(...) || uKapali > 0.5`
olarak eklendi — kapanışta YENİ su nozuldan çıkmaz (taban temiz), ama o anda
HAVADA olan (bu dala hiç uğramamış) parçacıklara dokunulmaz; onlar kendi
`yas`/`omur` ve mevcut splash (v6 F5) zincirini normalce tamamlar. `uAlfa`
artık `aniKesme` cihazlarında master'la sıfırlanmıyor (sabit `baseAlfa`) —
görünürlük tamamen "bu parçacık hâlâ hayatta mı" sorusuna bırakıldı. Diğer
TÜM cihazlarda (`uKapali` varsayılan 0, `aniKesme` yalnız switch'te true)
davranış BİREBİR eskisi — 4 yeni test (`test/switch-kesme.test.mjs`) + tam
süit (476/476) bunu kilitler.

Kare kanıtıyla DOĞRULANAN: kesim anından (t=2.0) 30 ms sonra artık kolon
ANINDA kaybolmuyor (`_kiyas.local` yerine oturum scratchpad'i — bkz. rapor).
Kare kanıtıyla DOĞRULANAMAYAN (proje ÇAPINDA bilinen kısıt — bkz.
[[gorsel-is-dogrulama]]/[[chrome-mcp-tuzaklari]]): kesimden sonraki 1-2
saniyelik BALİSTİK ÇÖZÜLME (kütlenin kademeli düşüp erimesi) — headless
`virtual-time-budget` bu sahnede show saatini (`transport.showT`,
`#ornek=...&t=` kancasıyla ANINDA sıçratılabiliyor) ilerletse de, parçacık
GPU simülasyonunun kendi `dt` birikimi gerçek kare zamanına bağlı ve headless
oturumda pratikte ilerlemiyor (bkz. `#katalogdemo` her `virtual-time-budget`
değerinde "0.1/16.0s" göstermesi) — yani t=2.4/3.0/3.8 kareleri de neredeyse
t=1.5 ile AYNI görünüyor (simülasyon dondurulmuş gibi). Bu YALNIZ bu turun
doğrulama YÖNTEMİNİN sınırı; kod tarafında `uKapali` mekanizması AIR'in
ZATEN üretimde çalışan salvo desenini birebir kullanıyor. **S1'in "1-2 sn
havada kalıp düşüyor mu" kısmı CANLI TARAYICIDA (gerçek duvar-saati)
doğrulanmalı** — headless kare bunu kanıtlayamaz.

**Yapılamayan (dosya kapsamı dışı):** Aydınlatma karakteri paragrafındaki öz
ışık ayrışması (SWITCH'in `CIPLAK_TURLER`'a eklenmesi) `studio/js/proje.js`
+ panel onay kutusu `studio/js/ana.js` gerektiriyor — ikisi de bu turun
DOKUNABİLECEĞİ dosya listesinde YOK (paralel ajan kısıtı). `motor.js`
tarafı zaten JENERİK (`JetSistemi.setOzIsik` her `govdeTip` için çalışır,
switch dahil) — yalnız TEK SATIRLIK `CIPLAK_TURLER = ['vario', 'switch']`
eklemesi + panel koşulu eksik. #10 (içeriden aydınlanma/ters fresnel) de
YENİ bir shader tekniği gerektirdiği ve görsel-yargı ağırlıklı olduğu için
bu turda kilitlenmedi (kart hâlâ "kontrol edilecek" diyor) — dokunulmadı.
