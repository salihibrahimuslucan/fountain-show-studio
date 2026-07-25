# Cihaz Karakter Kartları — Katalog PDF Görsel Okuması (2026-07-17, 7 uzman ajan)

Kaynak: `dahili ürün kataloğu (PDF)` (ürün fotoğrafları + TECHNICAL
DETAILS tabloları, ajanlar sayfaları GÖREREK okudu) + Salih'in sözlü tarifleri +
product-dev render'ları. Bu dosya = motor preset'leri ve gövde çizimlerinin TEK
karakter kaynağı. "Belirsiz" = katalogda yazmıyor, UYDURULMAZ.

## Salih'in sözlü tarifleri (2026-07-17, uygulama önceliği)

- **VARIO**: "saçmıyor, laminer kadar sabit akmıyor ama saçak değil" = yoğun
  yarı-berrak kolon. ✅ UYGULANDI (vario arketipi).
- **SWITCH**: "vario gibi ama ince, daha alçak atar, kolon düzgün çıkar tepede
  dağılır." ✅ UYGULANDI. Katalogla doğrulandı (maks 6 m).
- **AIR**: "tek şok köpük sütunu." ✅ Doğrulandı.
- **DryDECK**: "ya switch ya vario ile yapılır, ikisi gibi davranır." ✅ UYGULANDI.
- **Işık çizimleri beğenilmedi** — gövdeler + ışıklar katalogdan fizikle yeniden çizilecek.

## SERVO AİLESİ

### AquaROBO (48W, 2A) — kartı geldi
- SU: tek çıkış, İNCE-ORTA BERRAK jet (kuyruklu yıldız hissi), tepe hafif damla
  saçılımı; gövde boyunca bütünlük. Bizim preset aeration 0.3 → 0.15'e inmeli, damla doku.
- FİZİK: nozul Ø17/20/23; 2m→88-124 l/dk @0.25-0.30 bar; 10m→200-350; 20m→550 @2.9 bar
  (maks 3.3 bar). Boyut 600×727×730, 18 kg.
- GÖVDE: taban plakası + U-yoke gimbal ÇATALI + SAĞ YANDA silindirik servo + gimbal
  iki yanında 2 flanş diski (AquaLIGHT yuvası) + merkez konik nozul borusu. Oran ~1:1.2.
- IŞIK: AquaLIGHT ×2 OPSİYONEL, nozulla BİRLİKTE HAREKET eder (jeti dibinden aydınlatır).
- HAREKET: 2 eksen, her eksen 180° (±90°), IMU; akıcı süpürme.

### AquaROBO-ROLL (72W) — kartı geldi
- SU: İKİ NOZUL TİPİ — FAN: geniş yelpaze perdesi (2m→164 l/dk @0.01 bar; 7.5m→297
  @0.25); HEPTA: 7 ince paralel jet tarağı (2m→248 @0.65; 5m→350 @1.0).
- HAREKET: 3 eksen — X 180°, Y +90/−70°, Z(roll) 360° SINIRSIZ → dönen yelpaze
  kalp/çiçek çizer. Bizde yelpaze+roll kombinasyonu YOK (sonraki dalga).
- GÖVDE: ROBO'nun büyüğü, tepede 7 parmaklı tarak başlığı.

### AquaSWING (24W) — kartı geldi
- SU: ROBO ile AYNI jet (ince berrak laminar, aynı debi tablosu); fark eksende.
- HAREKET: TEK eksen 180° (±90°), sarkaç süpürme.
- GÖVDE: ROBO'dan yalın: tek dikey blok + tek yan servo + 2 flanş disk.

### AquaPULSE (24W) — kartı geldi ⚠ BİZDE TAMAMEN YANLIŞ
- SU: JET YOK — su yüzeyinde EŞMERKEZLİ DALGA HALKALARI üretir (servo dalga).
  Sakin, köpüksüz, meditatif ambiyans cihazı.
- GÖVDE: paslanmaz silindir davul Ø300×287, su altına gizlenir; üstte kapalı tabla,
  altta yarıklar + 3 ayak.
- IŞIK: ENTEGRE AquaLIGHT — dalga halkasını çember olarak aydınlatır.
- STUDIO: swing eşlemesi KALDIRILACAK → v6 ripple simülasyonunun doğal müşterisi
  (dalga kaynağı olarak modellenecek; o zamana dek paletten düşürülebilir).

### AquaHYDRA (48W) — kartı geldi
- SU: KALINCA, DOKULU/YARI-KÖPÜKLÜ tek sütun ("içi ışıkla dolu renkli yılan");
  ROBO'nun ince berrak jetinden FARKLI. 0°=dik dağınık kolon, 15°=kavis.
- HAREKET: mekanik gimbal YOK — 360° elektronik yön + dikeyden 15° eğim; yılansı.
- GÖVDE: silindir davul Ø340×360; üst tablada merkez nozul + çevresinde 3 ışık yuvası.
- IŞIK: 3× AquaLIGHT üst tablada — jeti TAM DİBİNDEN içine ışık basar.
- STUDIO: robo eşlemesi kalabilir ama tilt sınırı 15° (bizde 12 default OK), su
  dokusu ayrı preset ister (hydra: aeration ~0.5, kalın).

## SOLENOID AİLESİ

### AquaAIR I-V (1030-34) — kartı geldi
- SU: TÜM KOLON OPAK SÜT BEYAZI (hava itişli), kalın düzgün silindir, tepede sis
  gibi dağılır. TEK ŞOK atış karakteri (Salih doğru).
- FİZİK: AIR I 5-10m · II 10-20m · III 20-30m · IV 40-60m · V 70-100m! Basınç
  2-13 bar. ⚠ RELOAD: atışlar arası 4-32 sn DOLUM ZORUNLU (besteci spam'lememeli).
- GÖVDE: dikey basınç tankı (I ~720mm → V ~1849mm) + üstte nozul mili + yanda
  PİRİNÇ solenoid (IV-V çift); mil çevresinde örümcek-kol 4'lü halka ışık (ops).
- IŞIK: AquaLIGHT ×2-4 OPSİYONEL (kollarla mile monte).
- STUDIO: preset OK (köpük+tepe çiçeği); besteci airKanal'a reload kısıtı eklenecek.

### AquaSTAR (1020) — kartı geldi ⚠ BİZDE YANLIŞ
- SU: YILDIZ/HALKA SU DESENİ YOK — TEK İNCE DİK KOLON (~1-2m görünüm), yarı-berrak,
  tepe hafif tüylü. "Star" adı NOZUL ÇEVRESİ LED HALKASINDAN geliyor.
  Onlarca ünite sıralı "RUN" (koşu) efekti için tasarlanmış.
- FİZİK: 160×160×265mm, maks 2 bar, 24W, 1 kg.
- GÖVDE: Ø160 flanş disk + merkez 1" nozul + altta kontrol kartı + 1" pirinç solenoid.
- IŞIK: ENTEGRE 1× AquaLIGHT C halka (nozul çevresi) + ×2 ops.
- STUDIO: taç konisi KALDIRILACAK → switch benzeri ince kolon + entegre halka ışık
  (halkaDisk gövdesi + jet tek preset'te — 412C kombinli görünüm).

### AquaSWITCH (1041) — kartı geldi (Salih tarifi doğrulandı)
- FİZİK: Ø14: 2m→58 l/dk @0.89 bar; 6m→105 @3.82. Ø16: 2m→156 @0.44; 6m→244 @1.24.
  MAKS 6 m. 160×200×350mm.
- GÖVDE: dikdörtgen blok + üstten düz boru nozul + yanda kubbe başlıklı ışık ünitesi
  + altta pirinç bağlantı. Bizim switchGovde yakın; kubbe ışık eklenebilir.
- IŞIK: solenoid devresi ışıkla BİRLEŞİK (4.5-56W aralığı), AquaLIGHT C ops.

### AquaSWITCH DryDECK / Bucket — kartı geldi
- ⚠ SOMUT RAKAM: Bucket aç-kapa 0.1 SANİYE — ailenin en hızlısı, canlı animasyon.
- GÖVDE: gömme; üst plaka Ø280 (5mm) veya kare 300×300 (30mm); maks 1 bar.

### AquaPOP JET (1090) — kartı geldi ⚠ BİZDE YANLIŞ
- SU: KOLON YOK — Ø3mm orifisten KÜÇÜK SU TOPU/damla demeti (~20-40cm) fırlar,
  inişte taç sıçraması + halka dalgacık. İri BERRAK damlalar, köpük yok.
- GÖVDE: Ø80 üst flanş + yanda kontrol kutusu, 287mm.
- IŞIK: ENTEGRE 3W RGB Power LED (flanşta, havadaki damlaları aydınlatır).
- STUDIO: switch eşlemesi yanlış → 'pop' arketipi (çok kısa atım, top formu,
  berrak iri damla) sonraki dalga; şimdilik en yakını switch kalabilir AMA hız
  düşük + ömür kısa özel preset daha doğru.

## ATEŞ AİLESİ

### AquaFIRE (1130) — kartı geldi (bizde HİÇ yok)
- ALEV: BÜYÜK ALEV TOPLARI — patlama karakterli, mantar formu, üstte duman; su
  püskürtmez (su şovuyla senkron saf ateş). 4 DMX kanalı, ~2 bar gaz, 2.5L tank.
- GÖVDE: yarıklı kutu (gaz tankı+solenoid) + dar riser + tepede silindirik yanma odası.

### AquaFIRE BOWL (1140) — kartı geldi (bizde HİÇ yok)
- ALEV: SÜREKLİ şömine alevi, çanak içi siyah lav taşı; Ø800 ağız → Ø150 taban,
  200mm derinlik; bakır/antrasit çanak.

### AquaTORCH (1125) — kartı geldi ⚠ BİZDE YANLIŞ
- ALEV KONUMU: alev nozuldan ÇIKMAZ — DİK SU JETİNİN (maks 2.5m) TEPESİNDE dans
  eder; jet eğilince alev savrulur. Su jeti kırmızı aydınlatmalı (fotoğraf).
- GÖVDE: taban plakası + YANDA YATAY VARIO pompa silindiri + ortada dikey torch
  borusu (830mm'nin yarıdan fazlası) + yarıklı kontrol gövdesi.
- IŞIK: boru dibinde 1× AquaLIGHT halka OPSİYONEL.
- STUDIO: torch = SU JETİ (vario karakterli, 2.5m) + TEPEDE alev emitter'ı
  (ikinci parçacık katmanı jet tepesinde doğar) — yeniden yazılacak.

## POMPA (VARIO) AİLESİ

### AquaVARIO 151/241 — kart geldi, Salih tarifi FOTO ile doğrulandı
- SU: yoğun yarı-berrak kolon; yüzey pütürlü (ışığı gövdede taşır — renk tüm
  kolonda), saçak YALNIZ tepe tacında. Debi kısılınca kolon İNCELMEZ KISALIR,
  geçiş anlık. Nozul Ø12/14/16. 151=0-3m, 241=4.5m (Ø12).
- GÖVDE: YATAY silindirik pompa (termoplastik + soğutma kanatlı motor kapağı +
  sac ayak); su çıkışı gövde ÜSTÜNDE dik 1" port+nozul. ✅ varioGovde yazıldı.
- IŞIK: ops AquaLIGHT-C ×1 nozul dibi halka (151→22W, 241→72W RGBW sürebilir).

### VARIO DryDECK/Bucket — kart geldi
- Bucket AÇ-KAPA 0.1 SN (ailenin en hızlısı); üst plaka Ø280/5mm veya 30×30/30mm;
  zeminle hemyüz "kuru havuz". Işık: plakada nozul çevresi RGB halka (dipten boyar).

### AquaVARIABLE JET (1211) / AquaCROWN-VARIABLE (1223/24) — kart geldi (SONRAKI DALGA)
- VARIABLE: iki pompa bağımsız → TEK CİHAZ kolon↔çan arasında MORFLAR (kolon 3m;
  çan 0.6-2m+ genişlik). CROWN-V: + çevre halkada 20/25 taç çıkışı, maks 9m; taç
  jetleri VARIO dokulu, tepede damlaya kırılır. Çan=film mesh işi (BELL ile aynı motor).

### AquaTUBE II/III (1070/71) — kart geldi (SONRAKI DALGA, iç mekan)
- Pleksi tüp İÇİNDE köpük girdabı (su dışarı hiç çıkmaz); Ø160 tüp, 2m/3m;
  AquaLIGHT-C DAHİL dipte. Ayrı render tekniği ister (tüp mesh + iç türbülans).

## ŞEKİL NOZULLARI

### AquaJUMP / GIANT — kart geldi
- SU: TAM LAMİNER cam çubuk, iz boyunca sıfır kopma; Slice özelliği arkı uçan
  parçalara böler (bizde v1'den var!). JUMP parabol Ø12/16, ~30° gövde eğimi,
  tepe ~1.5m; GIANT Ø16, 35°, tepe ~3m / menzil ~5.5m, maks 0.5 bar.
- IŞIK: JUMP IŞIKSIZ (katalogda LED spec yok!); GIANT RGBW-LED ENTEGRE (nozul
  ağzı çevresinden — ark kökü parlar). Bizim laminer eşleşme doğru.
- GÖVDE: eğik silindir namlu + V/A sac şasi (JUMP), GIANT'ta kutu kaide. ~OK.

### AquaBELL (1253) / AquaTULIP (1252) — kart geldi (SONRAKI DALGA — film mesh)
- BELL: 360° TEK kesintisiz cam su ZARI, basık yarımküre; içinden ışık geçer
  (abajur etkisi). TULIP: daha basık, etek İÇE kıvrılır (lale silueti), tek zar.
- İkisi de 328×147×143mm platform, 240W; ışık: BELL ×2 yan, TULIP ×1 MERKEZ
  (zarı ortadan homojen boyar). Parçacık DEĞİL LatheGeometry film (ders/04 çan!).

### AquaFLOWER (1251) — kart geldi (SONRAKI DALGA)
- Tek zar değil: merkez kolon + radyal 4-5 flanşlı nozul → katmanlı taç/piramit
  jet demeti. Gövde: tripod ayaklı, entegre pompa bloklu. Işık ops ×2.

## PERDELER + KLASİKLER

### DIGITAL / CLASSIC / LACE WATER CURTAIN — kart geldi ⚠ ÜÇÜ DE AŞAĞI DÖKÜLÜR
- DIGITAL (1120): metre başına 40 nozul, negatif/pozitif grafik desen (harf/logo);
  RGB+W entegre ray şeridi. CLASSIC (1270): Ø2mm pirinç ×30, boncuk iplikleri;
  LED RGB dizisi veya tek renk ENTEGRE. LACE (1275): dantel, sıçramasız; ray
  kavisli/düz + AYAKLI serbest çerçeve versiyonu var; açı ayarlı LED'ler.
- ✅ UYGULANDI: perde arketipi kaynakY=2.5'ten serbest düşüş + ayaklı çerçeve
  gövde (ray+dikmeler+pirinç nozullar+LED şeridi+toplama kanalı). DIGITAL'in
  desen (piksel perde) özelliği SONRAKİ DALGA (çizgi boyu segment master'ları).

### AquaSHIELD I/II (1240/41) — kart geldi (SONRAKI DALGA — büyük ölçek)
- 180° su EKRANI (projeksiyon): I ~10m × 28m, II ~15m × 46m ekran; 7-11 bar.
- GÖVDE: kuğu boynu S-boru + sehpa. Yelpaze eşleşmesi geçici; gerçek ölçek dev.

### AquaJET I/II/III — kart geldi
- YÜKSEKLİKLER: I 10-20m, II 20-30m, III 30-50m (600-3100 l/dk!). Bizim sahne
  kadrajında ~10-12m temsil ediliyor — göreli sıra doğru, not edildi.
- GÖVDE: konikleşen şişe/kule formu (485-690mm) — jetGovde'ye koniklik eklenebilir.

### AquaSPIN I/II/III — kart geldi (SONRAKI DALGA)
- SPİRAL burgu: 4-6 jet birbirine dolanır, KÖPÜKLÜ OPAK kısa kolonlar (3/5/10m).
  Dönen doğum açısı ister (uYonAci'nin zamanla dönmesi — kolay eklenti).

### AquaBLAST (1226) — kart geldi ✅ geyser eşleşmesi doğru
- Ø133mm kalın köpük kolonu, maks 3m, 2 bar; gövde basık tambur + çift sıra delik.

### AquaCROWN I/II (1220/21) — kart geldi (SONRAKI DALGA — halka doğum)
- 20/25 çıkış TAÇ: ince BERRAK iplikler dışa kavis (ışığı çok iyi geçirir),
  maks 9m, ÇOK DÜŞÜK basınç (0.1-0.33 bar). Halka-doğum shader dalı gerek.

### AquaTHRONE I/II (1370/71) — kart geldi (SONRAKI DALGA)
- 3 kademe: merkez Ø20 dik + 6×Ø13 + 6-12×Ø13 dışa açılı → klasik göl çeşmesi
  silueti; maks 9-12m. Çok-emitter kompoziti (torch bileşik deseni genişler).

## IŞIK AİLESİ — kart geldi ✅ halkaDisk yeniden çizildi
- TEK gövde sınıfı: Ø160×70mm basık puck (106→512 HEPSİ AYNI BOYUT; fark LED
  gücü). LED = dolu yüzey değil 12'Lİ AYRIK HALKA (Ø~112 = 0.7×çap); cıvatalı
  jant, düz cam. C versiyonu: merkez ALTIGEN delik (nozul geçer), Ø~35-45 (tahmin).
- STARLIGHT: Ø110×62 derin spot gövde, 3 LED üçgen. WALLWASHER: 50cm çubuk,
  18 LED tek sıra, çift ayar ayağı.
- HUZME: iki lens — 60° yıkama / 10° dar şaft. 412C 4620 lm = ailenin 2.25×
  parlağı; sahne parlaklık hiyerarşisi buna göre (spotEkle şiddet katsayısı).
- ✅ UYGULANDI: halkaDisk 12 ayrık LED + cam + altıgen merkez; vario/star/perde
  gövdelerine aynı 12-LED halka dili. Wallwasher/StarLIGHT gövdesi SONRAKİ DALGA.

## Uygulama durumu (2026-07-17 v5.5 dalgası)

✅ vario (karakter+hız+gövde) · switch · drydeck · robo/swing (berrak jet) ·
star (tek kolon+entegre halka) · torch (BİLEŞİK: su+tepede alev, kaynakY) ·
perde (aşağı düşüş+çerçeve gövde) · air (reload ≥6s besteci kısıtı) ·
halkaDisk (12 LED puck) · alfa kalibrasyonu (damla dokusu additive dengesi).
⏭ SONRAKİ DALGA: BELL/TULIP film mesh · CROWN halka-doğum · THRONE çok-emitter ·
SPIN dönen doğum · VARIABLE morf · SHIELD dev ekran · DIGITAL desen perdesi ·
TUBE · PULSE ripple (v6 F6'ya bağlanır) · FIRE/BOWL · JUMP GIANT kök LED'i.
⚠ Bilinen sınır: alev bloom'da beyazımsı (v6 F7 kamera paketi çözer).
