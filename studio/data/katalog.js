// katalog.js — ürün kataloğu (T-E veri katmanı): kod cihaz TİPİNİ (arketip),
// katalog ÜRÜNÜ tanımlar — yeni ürün eklemek kod değişikliği istemez (spec §T-E).
// v5 F1 (Salih: "birebir katalog uyumu"): 2026 katalog künyesine çekildi —
// kaynak dahili ürün künyesi (katalog PDF "TECHNICAL
// DETAILS" tablolarından). pn/guc/kontrol KÜNYEDEN BİREBİR; künyede olmayan
// değer UYDURULMAZ (yükseklik/debi çoğu üründe katalogda yok — boş kalır,
// AquaAIR'in 30-40m'si gibi yazılı olanlar `teknik`e girer).
// `grup`: palet kategorisi (animasyon/klasik/perde/isik/genel).
// `isikModul` (Faz 1 Task 3, K2 donanım gerçeği): '412C' = nozul-altı halka
// TAKILABİLİR bileşen (proje.js ozIsik toggle bu alanla kapı belirler,
// varsayılan TAKILI — F1-3); 'entegre' = ışık üründe gömülü (DryDECK), panelde
// toggle GÖSTERİLMEZ. Alan yoksa (çoğu klasik/perde/ışık-dışı ürün) jenerik
// tür-yedeği geçerli (proje.js isikModulAlirMi).
// ⚠UI kimlik turu (2026-07-19): `etiket` alanları GLİF ÖNEKİ taşıyordu
// ('🔥 AquaTORCH', '⛲ AquaBLAST', '⏻ AquaSWITCH', '▲ VARIO 151'...). İki ayrı
// sorun vardı: (1) önekler aynı sütunda İKİ FARKLI çizim diline düşüyordu —
// 🔥 ve ⛲ renkli emoji, ⏻ ✷ ♔ tek renk metin glifi; (2) emoji her platformda
// farklı çizilir, taban çizgisine oturmaz ve tek-vurgu disiplinini deler.
// Önek KALDIRILDI, çünkü taşıdığı bilgi zaten iki yerde var: palet `grup`
// başlıkları (ANİMASYON/KLASİK/PERDE/IŞIK/GENEL) ve plan tuvalindeki tür
// başına renk+biçim ayrımı (plan.js CIHAZ_RENK / HALKA_TURLERI).
// --- FAZ 2 (cihaz turu) KÜNYE ALANLARI — spec 2026-07-24 §Faz 2 -------------
// Dört yeni alan. Hepsi VERİ: kod bunları OKUR, tür adına bakmayı bırakır
// (Faz 1'de `isikModul` ile açılan desenin devamı). Alan yoksa kod eski
// tür-tabanlı yedeğine düşer → künyesi doldurulmamış ürün BOZULMAZ.
//
// 1) `kontrol` — KONTROL KARAKTERİ (Faz 4/G1 bunu okuyacak; K4):
//      'surekli'  = değişken debi (pompa/VFD). İfade HIZDA taşınır, master açık
//                   kalabilir. Bestecinin pat-pat kökü buydu: sürekli cihazda
//                   master'ı kesmek fiziksel olarak yanlış.
//      'solenoid' = iki konumlu vana, ARA DEBİ YOK. İfade master'da (step).
//    proje.js kanal doğurmayı buradan okur (STEP_TURLERI artık yalnız yedek).
// 2) `yon` — YÖN YETENEKLERİ (K1): { nozulMm: [seçenekler], pan: [min,maks],
//    tilt: [min,maks] } derece. Eksen YOKSA alan yok (sabit nozul).
//    proje.js pan/tilt kanallarını buradan doğurur (robo/swing tür adı yerine).
// 3) `dmx` — KANAL HARİTASI (K1): { mantiksal: [...], resmi: null|[...] }.
//    `mantiksal` = BİZİM timeline kanallarımız (ürün gerçeği değil, köprünün
//    eşleyeceği liste). `resmi` = üreticinin kanal sırası — spec sheet'ler
//    "DMX-RDM controlled" deyip liste BASMIYOR, o yüzden UYDURULMAZ: null
//    kalır ve eksik-listesinde durur (docs/referans/spec-sheet-eksik-listesi.md).
// 4) `montaj412` — 412 MONTAJ GERÇEĞİ (K2): ışık modülü cihaza NASIL oturur.
//    'nozul-ici-halka' = nozul, C-tipi halkanın merkez deliğinden geçer.
//    'govde-flansi'    = halka GÖVDEYE sabit; hareketli kafa döner, IŞIK DÖNMEZ.
//    'entegre'         = üründe gömülü (DryDECK top plate).
//    ⚠ROBO ailesindeki 'govde-flansi' ÇIKARIM (görsel sonuç doğuruyor: süpüren
//    jet ışık konisinden çıkıyor) → kartlarda [ELLE] sorusu olarak açık.
//
// `arketip`: motor PRESETLER anahtarı. Motorda HENÜZ olmayan arketiple gelen
// ürün paletten otomatik düşer (ana.js MOTOR kapısı) — veri katmanı ileriye
// dönük tam kalır (spec §T-E ileri uyumluluk).
export const KATALOG = [
  // --- ANİMASYON NOZULLARI (künye §1 — DC24, DMX-RDM-combo) ---
  // v7 TUR 2 (KART v2 AquaVARIO): 151 ve 241 ekranda BİREBİR AYNI görünüyordu.
  // Fark artık `pompa` bloğundan TÜRETİLİR (motorda vario sabiti yok, spec §T-E).
  // Değerler katalog s.34-37 TECHNICAL DETAILS + gövde metninden BİREBİR:
  //   151 → 328×150×200 mm, 5.5 A, 7 kg, 120/150 W, 0.5 bar, "0→3 m"
  //   241 → 328×147×143 mm, 10 A, 5 kg, 240 W, 0.5 bar, "4.5 m @Ø12 / 4.35 m @Ø14"
  // Nozul Ø12/14/16 (katalog grafiği); varsayılan Ø12 = katalogun yükseklik verdiği çap.
  { ad: 'AquaVARIO 151', pn: 1050, arketip: 'vario', grup: 'animasyon',
    etiket: 'VARIO 151', teknik: { guc: '120/150 W', maksYukseklik: '3 m', nozul: 'Ø12/14/16' },
    pompa: { yukseklikM: 3.0, nozulMm: 12, gucW: 150, isikW: 22,
             boyM: [0.328, 0.150, 0.200], agirlikKg: 7 },
    isikModul: '412C', kontrol: 'surekli', montaj412: 'nozul-ici-halka',
    yon: { nozulMm: [12, 14, 16] },
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz'], resmi: null },
    not: '24VDC DMX sub-pump — REFERANS (ölçek 1.0); yoğun yarı-berrak kolon (Salih tarifi)' },
  { ad: 'AquaVARIO 241', pn: 1051, arketip: 'vario', grup: 'animasyon',
    etiket: 'VARIO 241', teknik: { guc: '240 W', maksYukseklik: '4.5 m', nozul: 'Ø12/14/16' },
    pompa: { yukseklikM: 4.5, nozulMm: 12, gucW: 240, isikW: 72,
             boyM: [0.328, 0.147, 0.143], agirlikKg: 5 },
    isikModul: '412C', kontrol: 'surekli', montaj412: 'nozul-ici-halka',
    yon: { nozulMm: [12, 14, 16] },
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz'], resmi: null },
    not: 'en güçlü DMX sub-pump — 4.5 m @Ø12 ✅katalog; 151in 1.5× kolonu' },
  { ad: 'AquaVARIO DryDECK', pn: null, arketip: 'drydeck', grup: 'animasyon',
    etiket: 'VARIO DryDECK', teknik: { guc: '18 W' }, isikModul: 'entegre',
    kontrol: 'surekli', montaj412: 'entegre',
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz'], resmi: null },
    not: 'zemin nozulu, insan-açık alan (RCD 30mA)' },
  { ad: 'AquaSWITCH', pn: 1041, arketip: 'switch', grup: 'animasyon',
    etiket: 'AquaSWITCH', teknik: {}, isikModul: '412C',
    kontrol: 'solenoid', montaj412: 'nozul-ici-halka',
    dmx: { mantiksal: ['master', 'hue', 'beyaz'], resmi: null },
    not: 'run-stop solenoid — ani aç/kes; debi kanalı yok' },
  { ad: 'AquaSWITCH DryDECK', pn: null, arketip: 'drydeck', grup: 'animasyon',
    etiket: 'T-SWITCH', teknik: {}, isikModul: 'entegre',
    kontrol: 'solenoid', montaj412: 'entegre',
    dmx: { mantiksal: ['master', 'hue', 'beyaz'], resmi: null },
    not: 'zemin, tek-solenoid, insan-açık' },
  { ad: 'AquaJUMP', pn: 1080, arketip: 'laminer', grup: 'animasyon',
    etiket: 'AquaJUMP', teknik: { guc: '40 W' }, isikModul: '412C',
    kontrol: 'solenoid', montaj412: 'nozul-ici-halka',
    dmx: { mantiksal: ['master', 'hue', 'beyaz'], resmi: null },
    not: 'laminar jumping jet' },
  { ad: 'AquaJUMP GIANT', pn: 1081, arketip: 'laminer', grup: 'animasyon',
    etiket: 'JUMP GIANT', teknik: { guc: '40 W' }, isikModul: '412C',
    kontrol: 'solenoid', montaj412: 'nozul-ici-halka',
    yon: { nozulMm: [12, 16] },
    dmx: { mantiksal: ['master', 'hue', 'beyaz'], resmi: null },
    not: 'RGBW-LED; Ø12/16mm parabol' },
  { ad: 'AquaROBO', pn: 1001, arketip: 'robo', grup: 'animasyon',
    etiket: 'AquaROBO', teknik: { guc: '48 W' }, isikModul: '412C',
    kontrol: 'surekli', montaj412: 'govde-flansi',
    yon: { pan: [-90, 90], tilt: [0, 45] },
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz', 'pan', 'tilt'], resmi: null },
    not: 'servo 2-eksen (pan/tilt), IMU' },
  { ad: 'AquaROBO-ROLL', pn: 1000, arketip: 'robo', grup: 'animasyon',
    etiket: 'ROBO-ROLL', teknik: { guc: '72 W' },
    kontrol: 'surekli', yon: { pan: [-90, 90], tilt: [0, 45] },
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz', 'pan', 'tilt'], resmi: null },
    not: 'servo 3-eksen (X/Y/Z)' },
  { ad: 'AquaSWING', pn: 1002, arketip: 'swing', grup: 'animasyon',
    etiket: 'AquaSWING', teknik: { guc: '24 W' },
    kontrol: 'surekli', yon: { pan: [-90, 90] },
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz', 'pan'], resmi: null },
    not: 'servo 1-eksen 180°' },
  { ad: 'AquaHYDRA', pn: 1007, arketip: 'robo', grup: 'animasyon',
    etiket: 'AquaHYDRA', teknik: { guc: '48 W' },
    kontrol: 'surekli', montaj412: 'govde-flansi',
    yon: { pan: [-180, 180], tilt: [0, 15] },   // ✅kart: 360° yön, YALNIZ 15° eğim
    dmx: { mantiksal: ['master', 'hiz', 'hue', 'beyaz', 'pan', 'tilt'], resmi: null },
    not: '360° yön + 15° tilt; 3× AquaLIGHT' },
  { ad: 'AquaAIR', pn: 1030, arketip: 'air', grup: 'animasyon',
    etiket: 'AquaAIR', teknik: { yukseklik: '30-40 m' }, kontrol: 'solenoid',
    dmx: { mantiksal: ['master'], resmi: null },
    not: 'basınçlı hava patlatma; DMX→solenoid (I–V: inlet 1"–3")' },
  { ad: 'AquaSTAR', pn: 1020, arketip: 'star', grup: 'animasyon',
    etiket: 'AquaSTAR', teknik: { guc: '24 W' }, kontrol: 'solenoid',
    dmx: { mantiksal: ['master', 'hue', 'beyaz'], resmi: null },
    not: 'kolektör + nozul-altı solenoid ON/OFF' },
  // v7 POP turu (KART v2, docs/cihaz-karakter-kartlari.md "AquaPOP JET (1090)"):
  // ⚠ arketip 'switch' İDİ — yani ekranda 2.36 m'lik (6.8²/2g) uzun bir su
  // KOLONU çıkıyordu. Kart bunun tam tersini söylüyor: KOLON YOK, Ø3 mm
  // orifisten 20-40 cm'lik küçük bir SU TOPU / damla demeti fırlar. İki cihaz
  // arasında 6-12 KAT yükseklik farkı vardı, yani ürün ekranda yanlış cihazdı.
  // Kendi 'pop' arketipine alındı; presetin TAMAMI aşağıdaki `pop` bloğundan
  // türer (motor.popPresetTuret — motorda POP sabiti YOK, spec §T-E).
  //   tepeMinM/tepeMaksM : kart "~20-40 cm" → Torricelli ile doğum hızı.
  //   orifisMm           : kart "Ø3 mm orifis" → Rayleigh kırılmasıyla damla boyu.
  //   ledW               : kart "ENTEGRE 3 W RGB Power LED" (flanşta).
  //   flansMm / boyMm    : kart "Ø80 üst flanş ... 287 mm" → gövde ölçüsü.
  // ⚠ Bu blokta OLMAYAN değer uydurulmadı: katalogda POP için LÜMEN BASILI
  //   DEĞİL (ışık ürünlerinin aksine), debi/basınç da yok. Parlaklık bu yüzden
  //   lümenden değil GÜÇTEN türetilir (bkz. popPresetTuret ④).
  { ad: 'AquaPOP JET', pn: 1090, arketip: 'pop', grup: 'animasyon',
    etiket: 'POP JET', teknik: { guc: '24 W' },
    pop: { tepeMinM: 0.20, tepeMaksM: 0.40, orifisMm: 3, ledW: 3,
           flansMm: 80, boyMm: 287 },
    not: 'solenoid + entegre 3W RGB LED; Ø3mm orifisten su topu (kolon DEĞİL)' },
  { ad: 'AquaPULSE', pn: 1095, arketip: 'swing', grup: 'animasyon',
    etiket: 'AquaPULSE', teknik: { guc: '24 W' }, not: 'servo dalga efekti' },
  { ad: 'AquaTORCH', pn: 1125, arketip: 'torch', grup: 'animasyon',
    etiket: 'AquaTORCH', teknik: { guc: '150 W' },
    not: 'su + alev (150W DC sub-pump + gaz ateşleme)' },

  // --- KLASİK NOZULLAR (künye §2 — PASİF hidrolik, harici AC pompa) ---
  { ad: 'AquaJET I', pn: 1230, arketip: 'aquajet', grup: 'klasik',
    etiket: 'AquaJET I', teknik: { flans: '3"' }, not: 'yüksek jet (pasif + ops AquaLIGHT)' },
  { ad: 'AquaJET II', pn: 1231, arketip: 'aquajet', grup: 'klasik',
    etiket: 'AquaJET II', teknik: { flans: '4"' }, not: 'yüksek jet' },
  { ad: 'AquaJET III', pn: 1232, arketip: 'aquajet', grup: 'klasik',
    etiket: 'AquaJET III', teknik: { flans: '6"' }, not: 'en büyük yüksek jet' },
  { ad: 'AquaBLAST', pn: 1226, arketip: 'geyser', grup: 'klasik',
    etiket: 'AquaBLAST', teknik: { cap: 'Ø133 mm' }, not: 'kalın su kolonu' },
  { ad: 'AquaCROWN I', pn: 1220, arketip: 'star', grup: 'klasik',
    etiket: 'AquaCROWN', teknik: { cikis: 20 },
    not: '20 çıkışlı taç (star arketipiyle temsil)' },
  { ad: 'AquaSPIN I', pn: 1200, arketip: 'duz_jet', grup: 'klasik',
    etiket: 'AquaSPIN', teknik: {},
    not: 'spiral nozul (dönüş görseli sonraki dalga); DMX ışık combo' },
  { ad: 'AquaTHRONE I', pn: 1370, arketip: 'geyser', grup: 'klasik',
    etiket: 'AquaTHRONE', teknik: { yukseklik: '5-12 m' }, not: '3 kademe' },

  // --- SU PERDELERİ (künye §1-2) ---
  // v7 PERDE turu: ÜÇÜ DE ekranda birebir aynı görünüyordu — hepsi tek 'perde'
  // arketipine düşüyor, ürün adı görsele hiç yansımıyordu (kök sebep: proje.js
  // ürün adını motora hiç geçirmiyordu, motorda da tek preset vardı).
  // Ayrışma artık KÜNYEDEN türer: `perde` bloğu motor.perdePresetTuret()'in tek
  // veri kaynağıdır (motorda perde sabiti YOK).
  //   nozul   : ray üzerindeki çıkış adedi → ekranda AYRIK damla sütunu sayısı.
  //             Perde bir "cam levha" değil, delik dizisidir; sürekli yaprak
  //             yerine iplik dizisi çizmek hem doğru hem akış hissini verir.
  //   capMm   : nozul çapı → damla kalınlığı (particle.size).
  //   kesinti : sütunların DMX/solenoid ile kapalı kalma oranı (0 = hep açık).
  //   kesintiHz: solenoid adım hızı (kesinti>0 ise anlamlı).
  { ad: 'CLASSIC WATER CURTAIN', pn: 1270, arketip: 'perde', grup: 'perde',
    etiket: 'Classic Perde', teknik: { guc: '15 W/birim', nozul: 30 },
    perde: { nozul: 30, capMm: 2.0, kesinti: 0, kesintiHz: 0 },
    not: '30 nozul pirinç Ø2mm ✅künye; sürekli akış — sütunlar hep açık' },
  { ad: 'LACE WATER CURTAIN', pn: 1275, arketip: 'perde', grup: 'perde',
    etiket: 'Lace Perde', teknik: { guc: '15 W/birim' },
    perde: { nozul: 48, capMm: 1.2, kesinti: 0, kesintiHz: 0 },
    not: 'dantel perde — sık + ince iplik. ⚠nozul/çap TEMSİLİ: künyede sayı YOK, ' +
         '"dantel" tarifinden türetildi (CLASSIC\'ten sık ve ince). Künye gelirse buradan düzeltilir.' },
  { ad: 'DIGITAL WATER CURTAIN', pn: 1120, arketip: 'perde', grup: 'perde',
    teknik: {}, etiket: 'Digital Perde',
    // ⚠kesintiHz 3.2 idi ve ekranda HİÇ kesinti görünmüyordu: damla ömrü ~0.85 s,
    // yani 0.31 s'de bir değişen desen düşen suyun içinde birbirine karışıyordu
    // (kapanan sütun hâlâ eski suyunu gösteriyor). Kesinti damla ömründen UZUN
    // sürmeli ki boşluk gerçekten açılsın → ~0.9 s adım.
    perde: { nozul: 16, capMm: 2.5, kesinti: 0.45, kesintiHz: 1.1 },
    not: 'DMX→solenoid dizisi, RGB+W. Görselde AYRIK sütun + solenoid kesintisi ' +
         '(sütunlar sırayla susar/akar). ⚠Bu bir DESEN MOTORU DEĞİL: gerçek üründe ' +
         'desen koreografiden gelir, burada yalnız "kesintili sütun" karakteri temsil edilir. ' +
         '⚠sütun sayısı/kesinti oranı TEMSİLİ (künyede solenoid adedi yok).' },
  { ad: 'AquaSHIELD I', pn: 1240, arketip: 'yelpaze', grup: 'perde',
    etiket: 'AquaSHIELD', teknik: { basinc: '7-11 bar' },
    not: 'su perdesi ekran (projeksiyon) — yelpaze arketipiyle temsil' },

  // --- AYDINLATMA (künye §4 — "C" eki = merkezli-nozul, elektriksel aynı) ---
  // v7 TUR 1 / KART v2 §1: non-C kayıtları (3025/3026) EKLENDİ — bunlar gerçek
  // ürünler, deliksiz cam + U profil tutucu; C ile ELEKTRİKSEL OLARAK AYNI
  // (fark yalnız mekanik: merkez nozul deliği + 200 g). Işık ürünlerine üç
  // gövde/optik alanı geldi: ledSayisi, merkezDelik (govde.js halkaDisk'e
  // beslenir), lens (KART v2 §2; varsayılan 60° — katalogda basılı iki lensin
  // geniş olanı).
  { ad: 'AquaLIGHT 412', pn: 3026, arketip: 'rgb_spot', grup: 'isik',
    etiket: '412', teknik: { guc: '48 W', lumen: 4620, renk: 'RGB+WW/AA' },
    ledSayisi: 24, merkezDelik: false, lens: 60,
    not: 'deliksiz (nozulsuz) amiral — 412C ile elektriksel aynı; LED 24 ⚠ÇIKARIM (KART v2 S3)' },
  { ad: 'AquaLIGHT 412C', pn: 3046, arketip: 'rgb_spot', grup: 'isik',
    etiket: '412C', teknik: { guc: '48 W', lumen: 4620, renk: 'RGB+WW/AA' },
    ledSayisi: 24, merkezDelik: true, lens: 60,
    not: 'nozul-altı halka — amiral RGBW; parlaklık REFERANSI (1.0)' },
  { ad: 'AquaLIGHT 406', pn: 3025, arketip: 'rgb_spot', grup: 'isik',
    etiket: '406', teknik: { guc: '24 W', lumen: 1746, renk: 'RGB+WW/AA' },
    ledSayisi: 12, merkezDelik: false, lens: 60,
    not: 'deliksiz; 12 LED (6 RGB + 6 natural white) ✅katalog metni' },
  { ad: 'AquaLIGHT 406C', pn: 3045, arketip: 'rgb_spot', grup: 'isik',
    etiket: '406C', teknik: { guc: '24 W', lumen: 1746, renk: 'RGB+WW/AA' },
    ledSayisi: 12, merkezDelik: true, lens: 60,
    not: 'nozul-altı halka; 12 LED ✅katalog metni' },
  { ad: 'AquaLIGHT 512C', pn: 3047, arketip: 'rgb_spot', grup: 'isik',
    etiket: '512C', teknik: { guc: '24 W', lumen: 1746, renk: 'RGB+WA' },
    ledSayisi: 12, merkezDelik: true, lens: 60 },
  { ad: 'AquaLIGHT 312C', pn: 3044, arketip: 'rgb_spot', grup: 'isik',
    etiket: '312C', teknik: { guc: '36 W', lumen: 2050, renk: 'RGB' },
    ledSayisi: 12, merkezDelik: true, lens: 60 },
  { ad: 'AquaLIGHT 306C', pn: 3043, arketip: 'rgb_spot', grup: 'isik',
    etiket: '306C', teknik: { guc: '18 W', lumen: 1025, renk: 'RGB' },
    ledSayisi: 12, merkezDelik: true, lens: 60 },
  { ad: 'AquaLIGHT 206C', pn: 3042, arketip: 'rgb_spot', grup: 'isik',
    etiket: '206C', teknik: { guc: '12 W', lumen: 1440, renk: 'Tunable 2700-6000K' },
    ledSayisi: 12, merkezDelik: true, lens: 60,
    not: 'tunable beyaz — hue kanalı sıcaklık gezinir (temsili)' },
  { ad: 'AquaLIGHT 112C', pn: 3041, arketip: 'rgb_spot', grup: 'isik',
    etiket: '112C', teknik: { guc: '12 W', lumen: 1440, renk: 'beyaz' },
    ledSayisi: 12, merkezDelik: true, lens: 60,
    not: 'tek-renk beyaz — hue etkisiz, beyaz kanal esas' },
  { ad: 'STARLIGHT 403', pn: 3003, arketip: 'rgb_spot', grup: 'isik',
    etiket: 'STARLIGHT 403', teknik: { guc: '9 W', lumen: 1155, renk: 'RGBW' },
    ledSayisi: 12, merkezDelik: true, lens: 60,
    not: 'küçük yıldız spot' },

  // --- GENEL (katalog-dışı yardımcı arketipler — geriye uyum: mevcut
  //     .aqshow'lar ve şablonlar bu adları kullanıyor) ---
  { ad: 'Geyser', pn: null, arketip: 'geyser', grup: 'genel',
    etiket: 'Geyser', teknik: {}, not: 'genel köpüklü kolon (katalog-dışı)' },
  { ad: 'Yelpaze Jet', pn: null, arketip: 'yelpaze', grup: 'genel',
    etiket: 'Yelpaze', teknik: {}, not: 'genel düzlemsel yelpaze (katalog-dışı)' },
];

// --- Parlaklık ölçeği (v7 TUR 1 / KART v2 §7) ---------------------------------
// Şikâyet: "hepsi aynı parlıyor" — lümen şimdiye kadar salt metadata idi, motor
// tüm ışıklara sabit kazanç veriyordu. Oysa künye 412=4620 lm, 406=1746 lm →
// 2.65× gerçek fark. `parlaklikOlcek` bu farkı TÜRETİR (elle yazılmaz ki lümen
// değişince sapmasın): referans amiral 412C = 1.0.
// Lümeni künyede OLMAYAN ürün olursa 1.0 kalır (uydurma yok, spec §T-E) —
// bugün ışık grubunun tamamının lümeni katalogda basılı, yani hepsi türetiliyor.
export const REFERANS_LUMEN = 4620;                 // AquaLIGHT 412/412C, RGB full
for (const u of KATALOG) {
  const lm = u.teknik?.lumen;
  u.parlaklikOlcek = (typeof lm === 'number' && lm > 0) ? lm / REFERANS_LUMEN : 1;
}

// Eski tek-kelime adların yeni künye adlarına köprüsü (geriye uyum: v3 .aqshow
// dosyaları 'AquaVARIO'/'AquaJET'/'DryDECK'/'AquaJUMP' yazar).
const ESKI_AD = {
  'AquaVARIO': 'AquaVARIO 151',
  'AquaJET': 'AquaJET I',
  'DryDECK': 'AquaVARIO DryDECK',
  'AquaJUMP GIANT': 'AquaJUMP GIANT',
  'AquaLIGHT 412C': 'AquaLIGHT 412C',
};

// Ürün adı → arketip; katalogda yoksa null (çağıran arketipe düşer — spec §T-E
// geriye/ileriye uyumluluk kuralı). Eski adlar köprüden çözülür.
export function urunCoz(ad) {
  return urunBul(ad)?.arketip ?? null;
}

// Tam künye kaydı → motor gövde/optik alanlarını (ledSayisi, merkezDelik, lens,
// parlaklikOlcek) buradan okur. Eski adlar aynı köprüden çözülür, bulunamazsa
// null (çağıran arketip varsayılanına düşer — spec §T-E).
export function urunBul(ad) {
  return KATALOG.find(k => k.ad === ad) ||
         KATALOG.find(k => k.ad === ESKI_AD[ad]) || null;
}
