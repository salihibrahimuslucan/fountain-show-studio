// zarf-urunler.js — 39 ürünün HAM zarf verisi (montaj sınıfı + yükseklik kaynağı
// + mekanizma). Türetme YOK: her sayı ya bir kaynaktan okunur ya da gerekçesiyle
// ölçeklenir; çözüm `zarf.js` (urunZarfi) tarafında yapılır.
//
// NEDEN AYRI DOSYA: `zarf.js` kendini "saf türetme katmanı" diye tanımlıyor —
// içine ürün tablosu koymak o kimliği bozardı (formül katmanı ürün adı bilmemeli).
// Aynı ayrım katalog.js ↔ motor.js'te zaten var: veri ayrı, çözücü ayrı.
//
// --- TÜRETME PROSEDÜRÜ (her ürün için sırayla, tasarım §"Tipik nokta kuralı") ---
//   1. katalog.js künyesi (teknik.maksYukseklik / teknik.yukseklik / pompa / pop)
//   2. docs/cihaz-karakter-kartlari.md — o ürünün satırı
//   3. kart v2 dosyaları (drydeck / aquavario / aqualight)
//   4. hiçbirinde yoksa AYNI AİLENİN künyeli üyesinden ölçekle → kaynak:'fizik'
//   `gerekce` hangi adımdan geldiğini VE sayının nereden okunduğunu yazar.
//
// --- ARALIK KURALI ---
// Katalog/kart bir ARALIK veriyorsa (AIR 30-40 m, JET I 10-20 m, STAR 1-2 m,
// POP 20-40 cm) `tipikTepeM` = aralığın ORTA NOKTASI, `maksTepeM` = üst uç.
// Sebep: `TIPIK_ORAN` (0.70×maks) tek ölçüm noktasından (SWITCH) kalibre edilmiş
// bir BORÇTUR; ürünün kendi basılı bandı varken onu ezmek bilgi kaybıdır. Geniş
// bantlarda 0.70×üst uç bandın ALTINA düşer (AIR: 0.70×40 = 28 < 30) — yani kural
// katalogla çelişirdi. Yalnız TEK maksimum varsa TIPIK_ORAN devreye girer.
//
// --- SU ÜRETMEYEN ÜRÜNLER ---
// Aşağıdaki tabloda 10 ışık ürünü ve AquaPULSE YOKTUR; hepsi `SU_URETMEYEN`
// listesinde GEREKÇESİYLE ilan edilir. Karar ve sebebi orada.
//
// ⚠ Bu tablo kaynak-eksiği İTİRAF EDER: `salvo` yalnız iki üründe dolu, `servo`
// hiçbirinde dolu değil (bkz. dosya sonu KAYNAK BOŞLUKLARI).
//
// ⚠YASAL TAVAN BUGUN HICBIR URUNDE ATESLENMIYOR (28/28 kelepcelendi:false).
// Sebep: TIPIK_ORAN (0.70) once uygulandigi icin gomme cihazlarda hiz 6.1 m/s'e
// ulasmiyor (VARIO DD 4.97 · SWITCH DD 5.53 · POP 2.43). Tavan GERCEK — kart v2
// (docs/cihaz-karti-v2-drydeck.md:174) tam basincta SWITCH DryDECK'in 6.62 m/s
// ile tavani astigini soyluyor — sadece TIPIK noktada devrede degil. Alan olu
// degil: TIPIK_ORAN yukari kalibre edilirse veya bir urune tam basinc verilirse
// devreye girer. Birim testi test/zarf-balistik.test.mjs kelepceyi dogruluyor.

// Ürün adları katalog.js'teki `ad` ile BİREBİR aynıdır (test bunu doğrular).
export const URUN_ZARFLARI = {

  // --- ANİMASYON: pompa ailesi ---------------------------------------------
  'AquaVARIO 151': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 1: katalog.js pompa.yukseklikM = 3.0 (katalog s.34-37 "0→3 m" @Ø12). Tek maksimum, aralık yok → tipik TIPIK_ORAN ile türetilir.',
  },
  'AquaVARIO 241': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 4.5, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 1: katalog.js pompa.yukseklikM = 4.5 (katalog "4.5 m @Ø12"). Ø14 sütunu 4.35 m verir; varsayılan çap Ø12 olduğu için 4.5 alındı.',
  },
  'AquaVARIO DryDECK': {
    montaj: 'kuru_meydan', gomme: true,
    ustPlaka: { bicim: 'kare', kenarMm: 300, kalinlikMm: 30 },
    yasalTavan: 'ispsc_612',
    maksTepeM: 1.80, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 3: kart v2 drydeck §4 tablosu — 0.3 bar × 6.0 m/bar = 1.80 m (üç bağımsız yol %5 içinde buluşuyor). Plaka: kart D9 (drydeck.md:317) Ø280/5 mm ÖNERİYOR ("mevcut gövde zaten Ø280"); BİLEREK ayrıldık — kare 300×300×30 seçtik çünkü künye gövdesi bu ürün için 300×300×368 mm KARE (kart:54), D9\'un gerekçesi gerçek ürün ölçüsü değil mevcut studio mesh\'i. Salih tersini derse: Ø280/5 mm\'ye çevir.',
  },
  'AquaSWITCH': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 6.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaSWITCH (1041) ... MAKS 6 m" (Ø14 6m→105 l/dk @3.82 bar). Islak havuz cihazı, yasal tavan yok. Salvo: run-stop solenoid ama atım/reload süresi HİÇBİR kaynakta yok → null.',
  },
  'AquaSWITCH DryDECK': {
    montaj: 'kuru_meydan', gomme: true,
    ustPlaka: { bicim: 'kare', kenarMm: 300, kalinlikMm: 30 },
    yasalTavan: 'ispsc_612',
    maksTepeM: 2.23, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 3: kart v2 drydeck §4 — T-SWITCH 1 bar, AquaSWITCH Ø14 debi tablosundan ara değer 2.23 m. Plaka künye gövdesi 300×300×350 mm ile aynı kare. Valf 0.1 s ✅katalog ama TAM salvo üçlüsü (ömür<reload) kurulamıyor → salvo null, bkz. dosya sonu.',
  },

  // --- ANİMASYON: şekil/laminer ---------------------------------------------
  'AquaJUMP': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 1.5, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "JUMP parabol Ø12/16, ~30° gövde eğimi, tepe ~1.5 m". Eğik atış olduğu için gerçek tepe dikey bileşendir; tek sayı verildiği için kartın sayısı doğrudan tepe alındı.',
  },
  'AquaJUMP GIANT': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "GIANT Ø16, 35°, tepe ~3 m / menzil ~5.5 m, maks 0.5 bar".',
  },

  // --- ANİMASYON: servo ailesi ---------------------------------------------
  'AquaROBO': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 20.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı debi tablosunun EN ÜST satırı "20m→550 l/dk @2.9 bar (maks 3.3 bar)" → maks 20 m. Servo hızı (°/s) hiçbir kaynakta yok, yalnız açı sınırı (±90°) var → servo null.',
  },
  'AquaROBO-ROLL': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 7.5, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı iki nozul tipinin EN YÜKSEK satırı — FAN "7.5m→297 l/dk @0.25 bar" (HEPTA 5 m\'de kalıyor) → maks 7.5 m.',
  },
  'AquaSWING': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 20.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaSWING: SU: ROBO ile AYNI jet (aynı debi tablosu); fark eksende" → ROBO\'nun 20 m tavanı BİREBİR geçerli, ölçekleme değil kartın kendi ifadesi.',
  },
  'AquaHYDRA': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 10.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'fizik',
    gerekce: 'Adım 4: künyesi YOK (kartta yükseklik/debi satırı yok). Aynı 48 W servo sınıfındaki AquaROBO\'nun debi tablosunun ORTA noktasından (10m→200-350 l/dk) ölçeklendi; ROBO\'nun 20 m tavanı ALINMADI çünkü kart HYDRA\'yı "kalınca, dokulu/yarı-köpüklü sütun" diye tarif ediyor — havalandırılmış kolon aynı güçte daha alçak atar.',
  },

  // --- ANİMASYON: solenoid/salvo --------------------------------------------
  'AquaAIR': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 40.0, tipikTepeM: 35.0,
    salvo: { atimSn: 0.5, reloadSn: 6.0, omurSn: 4.0 }, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 1: katalog.js teknik.yukseklik "30-40 m" → ARALIK kuralı: maks 40, tipik orta nokta 35. Salvo motor.js:298-306 AquaAIR bloğundan (atım 0.5 s solenoid penceresi, reload 6.0 s ✅kart "atışlar arası 4-32 sn dolum", ömür 4.0 s = particle.life.b). ⚠KALİBRASYON BORCU: karakter kartı varyant tablosunda (cihaz-karakter-kartlari.md:65: I 5-10m · II 10-20m · III 20-30m · IV 40-60m · V 70-100m) 30-40 m aralığı YOK — katalog değeri III (20-30) ile IV (40-60) arasına düşüyor, hangi varyantı temsil ettiği belirsiz. Varyant netleşince düzeltilmeli.',
  },
  'AquaSTAR': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 2.0, tipikTepeM: 1.5, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "TEK İNCE DİK KOLON (~1-2 m görünüm)" → ARALIK kuralı: maks 2.0, tipik orta nokta 1.5. Kart ayrıca "maks 2 bar" diyor, mertebe tutuyor.',
  },
  'AquaPOP JET': {
    montaj: 'kuru_meydan', gomme: true,
    ustPlaka: { bicim: 'daire', capMm: 80, kalinlikMm: 5 },
    yasalTavan: 'ispsc_612',
    maksTepeM: 0.40, tipikTepeM: 0.30,
    salvo: { atimSn: 0.071, reloadSn: 0.643, omurSn: 0.571 }, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 1: katalog.js pop.tepeMinM 0.20 / tepeMaksM 0.40 (kart "~20-40 cm su topu") → ARALIK kuralı: maks 0.40, tipik orta 0.30. Salvo motor.js popTuret aritmetiğinden: atım = tepeMin/v(0.40) = 0.071 s, ömür = 2v/g = 0.571 s, reload = atım+ömür = 0.643 s. Montaj: tasarım §montaj "pop_up_jet = kuru_meydan içindeki bir nozul tipi"; plaka Ø80 üst flanş ✅kart, kalınlık DryDECK ailesinin 5 mm plaka standardından (kart v2 §1) alındı.',
  },
  'AquaTORCH': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 2.5, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "alev ... DİK SU JETİNİN (maks 2.5 m) TEPESİNDE dans eder" → su zarfı jetin kendisi, 2.5 m. Alev katmanı bu tablonun dışında (motor.js kaynakY 2.55 ile jet tepesine oturuyor).',
  },

  // --- KLASİK NOZULLAR ------------------------------------------------------
  'AquaJET I': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 20.0, tipikTepeM: 15.0, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaJET I 10-20 m" → ARALIK kuralı: maks 20, tipik orta 15. katalog.js yalnız flanş çapı (3") veriyor, yükseklik kartta.',
  },
  'AquaJET II': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 30.0, tipikTepeM: 25.0, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaJET II 20-30 m" → maks 30, tipik orta 25.',
  },
  'AquaJET III': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 50.0, tipikTepeM: 40.0, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaJET III 30-50 m (600-3100 l/dk)" → maks 50, tipik orta 40.',
  },
  'AquaBLAST': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaBLAST (1226): Ø133 mm kalın köpük kolonu, maks 3 m, 2 bar". Tek maksimum → tipik TIPIK_ORAN ile.',
  },
  'AquaCROWN I': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 9.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaCROWN I/II: 20/25 çıkış TAÇ ... maks 9 m, ÇOK DÜŞÜK basınç (0.1-0.33 bar)". Taç ipliklerinin dışa kavisi modellenmiyor, dikey tepe alındı.',
  },
  'AquaSPIN I': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaSPIN I/II/III ... KÖPÜKLÜ OPAK kısa kolonlar (3/5/10 m)" → I = 3 m.',
  },
  'AquaTHRONE I': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 12.0, tipikTepeM: 8.5, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 1: katalog.js teknik.yukseklik "5-12 m" (kart "maks 9-12 m" ile uyumlu) → ARALIK kuralı: maks 12, tipik orta 8.5. Sayı merkez Ø20 kademesinin tepesidir; alt kademeler daha alçak.',
  },

  // --- SU PERDELERİ: aşağı DÖKÜLÜR, balistik yükseliş YOK --------------------
  'CLASSIC WATER CURTAIN': {
    montaj: 'duvar_perde', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 0, tipikTepeM: null, dokulmeYuksekligiM: 2.5,
    salvo: null, servo: null, kaynak: 'elle',
    gerekce: 'Adım 2: karakter kartı "ÜÇÜ DE AŞAĞI DÖKÜLÜR" → montaj duvar_perde, yükseklik = RAY yüksekliği. Ray yüksekliği künyede YOK (perde bir ürün değil metrelik ray); sahne değeri motor.js perde presetindeki kaynakY = 2.5 m (ayaklı serbest çerçeve boyu) → kaynak elle.',
  },
  'LACE WATER CURTAIN': {
    montaj: 'duvar_perde', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 0, tipikTepeM: null, dokulmeYuksekligiM: 2.5,
    salvo: null, servo: null, kaynak: 'elle',
    gerekce: 'CLASSIC ile aynı: kart "ray kavisli/düz + AYAKLI serbest çerçeve versiyonu var", ray yüksekliği künyede yok → motor.js perde kaynakY 2.5 m.',
  },
  'DIGITAL WATER CURTAIN': {
    montaj: 'duvar_perde', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 0, tipikTepeM: null, dokulmeYuksekligiM: 2.5,
    salvo: null, servo: null, kaynak: 'elle',
    gerekce: 'CLASSIC ile aynı ray varsayımı (2.5 m, motor.js kaynakY). Solenoid kesintisi mekanizma tarafıdır; künyede solenoid adedi/süresi olmadığı için salvo null.',
  },
  'AquaSHIELD I': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 10.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'katalog',
    gerekce: 'Adım 2: karakter kartı "AquaSHIELD I ~10 m × 28 m ekran; 7-11 bar". YUKARI atan 180° yelpaze (perde DEĞİL, aşağı dökülmüyor) → montaj islak_havuz, tepe = ekran yüksekliği 10 m.',
  },

  // --- GENEL (katalog-dışı yardımcı arketipler) ------------------------------
  'Geyser': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.0, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'fizik',
    gerekce: 'Adım 4: katalog-dışı genel arketip, künyesi YOK. Aynı geyser arketipini paylaşan künyeli üyeden — AquaBLAST maks 3 m — ölçeklendi (1:1, ikisi de kalın köpük kolonu).',
  },
  'Yelpaze Jet': {
    montaj: 'islak_havuz', gomme: false, ustPlaka: null, yasalTavan: null,
    maksTepeM: 3.7, tipikTepeM: null, salvo: null, servo: null,
    kaynak: 'elle',
    gerekce: 'Adım 4 tükendi: katalog-dışı genel arketip, künyesi YOK ve yelpaze ailesinin tek künyeli üyesi AquaSHIELD (10 m × 28 m dev ekran) — ondan ölçeklemek genel nozulu 3 kat büyütürdü. Mevcut motor.js yelpaze presetinin üst hızı 8.5 m/s alındı, h = v²/2g = 3.68 → 3.7 m. Yani bugünkü ekran davranışı korunuyor; ⚠kaynak yok, kalibrasyon borcu.',
  },
};

// --- SU ÜRETMEYEN ÜRÜNLER: bilerek tabloda YOK ------------------------------
//
// ⭐ KARAR (2026-07-19): ışık ürünleri zarf tablosuna GİRMEZ; bunun yerine burada
// ADIYLA ve GEREKÇESİYLE ilan edilirler. Alternatif — kaydı tutup su alanlarını
// null bırakmak — ELENDİ, iki sebeple:
//   (1) `suZarfi()` yükseklik kaynağı yoksa BİLEREK patlıyor (zarf.js:94). Işık
//       ürünlerine sahte bir maksTepeM vermeden kayıt açmak, o korumayı her
//       çağrıda null-kontrolüyle atlatmak demekti; koruma delinirdi.
//       Tablo katmanının vaadi tam tersi: "her kaydın tepeM > 0".
//   (2) Işık ürününün montajı zarfın işi DEĞİL. AquaLIGHT 412C hem havuz
//       dibinde hem DryDECK plakasında hem AquaROBO gimbalinde kullanılır
//       (kart v2 §7: 11 armatür sayfasında "DryDECK Option"). Tek bir `montaj`
//       yazmak üç kullanımdan ikisini YANLIŞ ilan ederdi. Işığın montajı
//       BAĞLANDIĞI cihazdan gelir — ayrı bir alan, ayrı bir tur.
// Bedeli: bu liste elle tutulur. Bütünlük testi bu bedeli ödetiyor — katalogdaki
// her ürün ya tabloda ya BURADA olmak zorunda, ikisinde de yoksa test kırmızı.
export const SU_URETMEYEN = {
  'AquaLIGHT 412':  'armatür — su atmaz; montajı bağlandığı cihazdan gelir',
  'AquaLIGHT 412C': 'armatür — su atmaz; nozul-altı halka, taşıyıcı cihaz montajı belirler',
  'AquaLIGHT 406':  'armatür — su atmaz',
  'AquaLIGHT 406C': 'armatür — su atmaz',
  'AquaLIGHT 512C': 'armatür — su atmaz',
  'AquaLIGHT 312C': 'armatür — su atmaz',
  'AquaLIGHT 306C': 'armatür — su atmaz',
  'AquaLIGHT 206C': 'armatür — su atmaz',
  'AquaLIGHT 112C': 'armatür — su atmaz',
  'STARLIGHT 403':  'armatür — su atmaz; DryDECK plakasına gömülü spot seçeneği (kart v2 §7)',
  // ⚠Işık DEĞİL ama su da ATMIYOR:
  'AquaPULSE': 'karakter kartı: "SU: JET YOK — su yüzeyinde EŞMERKEZLİ DALGA ' +
    'HALKALARI üretir". Balistik tepe kavramı bu cihazda tanımsız; zarfı ' +
    'genlik+periyot ister (v6 ripple işi). Sahte bir tepeM yazmaktansa ilan edildi.',
};

// --- ⛔ KAYNAK BOŞLUKLARI — uydurulmadı, ilan edildi -------------------------
//
// 1. SERVO ZARFI HİÇBİR ÜRÜNDE YOK. Karakter kartları servo cihazların AÇI
//    sınırlarını veriyor (ROBO ±90° iki eksen, ROBO-ROLL X180/Y+90-70/Z360,
//    SWING ±90°, HYDRA 360° + 15° tilt) ama AÇISAL HIZI (°/s) ve süpürme
//    periyodunu HİÇBİR kaynak vermiyor. `servoGecikmeAcisi` çözücüsü hazır,
//    girdisi yok. Uydurulmuş bir 60°/s buraya yazılsaydı motor.js onu "türetilmiş"
//    diye okurdu — sabitin elle yazılmasından daha kötü, çünkü izi kaybolurdu.
// 2. SALVO yalnız AquaAIR ve AquaPOP JET'te dolu — tek belgelenmiş iki üçlü.
//    AquaSWITCH: "run-stop solenoid" niteliksel, süre yok.
//    DryDECK ailesi: valf 0.1 s ✅katalog, AMA `salvoZarfi` sözleşmesi
//    ömür < reload ister; DryDECK'in uçuş süresi 1.21-1.56 s (kart v2 §4) iken
//    Delta Fountains'ın "saniyede 10 pop" periyodu 0.1 s → koşul FİZİKSEL olarak
//    tutmuyor. Bu bir veri hatası değil: DryDECK slug cihazı değil, üst üste
//    binen atımlarla çalışan bir cihaz. Yarım üçlü yazıp testi trivial doğru
//    yapmaktansa null bırakıldı → kendi mekanizma modelini bekliyor (Task 5).
// 3. Perde rayı yüksekliği hiçbir künyede yok (perde metreyle satılıyor); üç
//    perdede de 2.5 m sahne değeri kullanıldı, kaynak:'elle'.
