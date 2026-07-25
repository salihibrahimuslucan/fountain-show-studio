// govde.js — temsili cihaz gövdeleri (v3 F2, spec cihaz-gerçekçiliği §2/§8).
// Referans: product-dev/finished *.png (Salih'in gerçek ürün render'ları — repoya
// girmez, görünüm buradan modellendi). Low-poly prosedürel; her fabrika
// { grup, setRenk?, sil } döner — çağıran konum/rotasyonu grup üstünden verir.
// Gövdeler OPAK → derinlik ön-geçişinde KALIRLAR (parçacık soft-fade doğru çalışır).
import * as THREE from 'three';

const CELIK = () => new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.75, roughness: 0.4 });
const KOYU  = () => new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.3, roughness: 0.7 });

function grupSil(grup) {
  grup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  grup.parent?.remove(grup);
}

// AquaLIGHT 412 / 412C / 406 / 406C — KART v2 §1 künyesi (katalog s.58-62):
// Ø160 × 70 mm basık puck, cıvatalı paslanmaz jant, temperli düz cam, tek
// halkada AYRIK LED (halka çapı = 0.7×gövde çapı → r*0.7 yarıçap), "C"
// versiyonunda merkez ALTIGEN nozul geçişi. Sürekli torus değil ayrık nokta —
// fotoğraflardaki "halka boncuk" görünümü. setRenk timeline'dan.
//
// ÖLÇÜ DÜZELTMESİ (v7 TUR 1): eski model Ø180 × 40 mm idi (kart §7'de "%12
// büyük, yarı yükseklik" olarak işaretli). Künye Ø160 × 70 mm → r=0.08,
// H=0.07. Sahne birimi metre; olcek=1 artık GERÇEK ölçü demek.
//
// secenekler (hepsi opsiyonel — varsayılanlar eski C-tipi davranışı korur):
//   merkezDelik : true=C tipi (merkez altıgen nozul geçişi), false=non-C
//                 (3025/3026 gerçek ürünler) → altıgen yok, düz kapalı cam.
//                 Parça kütüphanesi doğruluyor: delikli cam.png ↔ deliksiz cam.png.
//   ledSayisi   : 406/406C=12 (katalog metni ✅), 412/412C=24 (⚠ ÇIKARIM —
//                 katalogdaki 412C metni 406C kopyala-yapıştırı; güç 2×,
//                 akı 2.65× olduğundan 24 varsayıldı, KART v2 S3 açık sorusu).
export function halkaDisk(olcek = 1, secenekler = {}) {
  const { merkezDelik = true, ledSayisi = 12 } = secenekler;
  const grup = new THREE.Group();
  const r = 0.08 * olcek;                              // yarıçap (Ø160 mm künye)
  const H = 0.07 * olcek;                              // gövde yüksekliği (70 mm künye)
  const jant = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 24), CELIK());
  jant.position.y = H / 2;
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.006, 24),
    new THREE.MeshStandardMaterial({ color: 0x0c1014, metalness: 0.1, roughness: 0.15 }));
  cam.position.y = H + 0.001;                          // camın üst yüzü jant ağzıyla aynı hizada
  grup.add(jant, cam);
  if (merkezDelik) {                                   // yalnız C tipinde nozul altıgeni
    const merkez = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, H * 1.25, 6), KOYU());
    merkez.position.y = H * 0.75;
    grup.add(merkez);
  }
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ledler = new THREE.Group();
  // LED yarıçapı sayıyla küçülür: 24 LED aynı halkaya sığsın, boncuklar
  // birbirine girmesin (halka çevresi sabit, adım yarıya iner).
  const ledR = r * 0.122 * Math.min(1, 12 / ledSayisi);
  for (let i = 0; i < ledSayisi; i++) {                // ayrık LED, Ø0.7×çap halka
    const a = (i / ledSayisi) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(ledR, ledR, 0.008, 8), ledMat);
    led.position.set(Math.cos(a) * r * 0.7, H + 0.005, Math.sin(a) * r * 0.7);
    ledler.add(led);
  }
  grup.add(ledler);
  // v7 IŞIK turu (KART v2 §4): dim İKİLİ aç/kapa idi (`visible = v > 0.02`) —
  // gerçek armatür DMX ile SÜREKLİ kısılır. Renk çarpanıyla sürekli yapıldı;
  // 0.06 taban, kısıkta bile camın arkasında LED'in var olduğunu belli eder
  // (gerçekte de armatür tam kapalıyken cam siyah değil, koyu gri okunur).
  // Kare yasası (dmx²) MOTOR tarafında uygulanıyor — burada gelen değer zaten
  // ışık şiddeti, tekrar kare alma.
  // Renk ve parlaklık AYRI saklanır, ikisi de tek yerde birleşir: aksi hâlde
  // setRenk'in setParlaklik'ten SONRA çağrıldığı sırada kısma silinirdi.
  const ledTemel = new THREE.Color(1, 1, 1);
  let ledK = 1;
  const ledUygula = () => {
    ledler.visible = ledK > 0.002;
    ledMat.color.copy(ledTemel).multiplyScalar(0.06 + 0.94 * ledK);
  };
  return {
    grup, ledSayisi, merkezDelik,                      // motor tarafı künyeyi okuyabilsin
    setRenk: (rr, g, b) => { ledTemel.setRGB(rr, g, b); ledUygula(); },
    setParlaklik: (v) => { ledK = Math.max(0, Math.min(1, v)); ledUygula(); },
    sil: () => grupSil(grup)
  };
}

// Boş gövde: bileşik cihazların ikinci sistemine (torchalev) — görünür parça yok.
export function bosGovde() {
  const grup = new THREE.Group();
  return { grup, sil: () => grupSil(grup) };
}

// AquaVARIO — karakter kartı: YATAY silindirik pompa (termoplastik gövde +
// soğutma kanatlı motor kapağı + sac ayak braketi); su çıkışı gövde ÜSTÜNDE dik
// 1" port + nozul; nozul dibinde opsiyonel AquaLIGHT-C halka (setRenk buradan).
// AquaVARIO 151/241 — YATAY termoplastik pompa silindiri + paslanmaz ayak +
// gövde ÜSTÜNDE dik 1" NPT pirinç çıkış + nozul; ops. AquaLIGHT-C halka.
// v7 TUR 2: ölçüler künyeden BİREBİR gelir (katalog s.34-37, L×M×H metre):
//   151 → [0.328, 0.150, 0.200]   (Ø150 gövde + 50 mm rayzır → daha dik siluet)
//   241 → [0.328, 0.147, 0.143]   (neredeyse yalnız silindir → basık siluet)
// Yani iki modelin gövde farkı UYDURMA DEĞİL: aynı uzunluk, farklı toplam
// yükseklik. boy verilmezse 151 varsayılanına düşer (künyesiz eski .aqshow).
export function varioGovde(boy = null) {
  const [L, M, H] = boy && boy.length === 3 ? boy : [0.328, 0.150, 0.200];
  const R = M / 2;                       // pompa silindiri yarıçapı = gövde eni
  const ayakKal = 0.02;                  // sac ayak kalınlığı
  const eksenY = ayakKal + R;            // yatay silindirin ekseni
  const tepe = eksenY + R;               // silindirin üstü
  // Rayzır = künye toplam yüksekliği eksi silindir tepesi (241'de ~0 çıkar).
  const rayzir = Math.max(0.012, H - tepe + ayakKal);
  const grup = new THREE.Group();
  const pompa = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L * 0.8, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.35, roughness: 0.6 }));
  pompa.rotation.z = Math.PI / 2;
  pompa.position.set(-L * 0.2, eksenY, 0);
  // Soğutma kanatlı motor kapağı (kuyrukta)
  const kapak = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, L * 0.14, 16), KOYU());
  kapak.rotation.z = Math.PI / 2;
  kapak.position.set(-L * 0.2 - L * 0.4 - L * 0.07, eksenY, 0);
  const ayak = new THREE.Mesh(new THREE.BoxGeometry(L * 0.9, ayakKal, M * 0.93), CELIK());
  ayak.position.set(-L * 0.2, ayakKal / 2, 0);
  // 1" NPT pirinç çıkış portu — gövdenin ÜSTÜNDE, dik
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, rayzir, 12), PIRINC());
  port.position.set(0, tepe + rayzir / 2, 0);
  const nozulBoy = 0.05;
  const nozul = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.019, nozulBoy, 12), PIRINC());
  const nozulY = tepe + rayzir + nozulBoy / 2;
  nozul.position.set(0, nozulY, 0);
  grup.add(pompa, kapak, ayak, port, nozul);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });   // AquaLIGHT-C ops
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.007, 8), ledMat);
    led.position.set(Math.cos(a) * 0.055, tepe + rayzir * 0.5, Math.sin(a) * 0.055);
    grup.add(led);
  }
  return { grup, setRenk: (r, g, b) => ledMat.color.setRGB(r, g, b), sil: () => grupSil(grup) };
}

// AquaJUMP: eğik silindir fırlatıcı + sac taban (product-dev: 40°'ye yakın eğim).
// aciDeg = fırlatma açısı (laminer eğrisiyle hizalanır; grup-yerel +x yönü).
export function jumpGovde(aciDeg = 40) {
  const grup = new THREE.Group();
  const taban = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.26), CELIK());
  taban.position.y = 0.015;
  const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 20), CELIK());
  // silindir ekseni +y doğar; +x'e doğru (90°-açı) yatır → çıkış ağzı eğri başına bakar
  govde.rotation.z = -(Math.PI / 2 - THREE.MathUtils.degToRad(aciDeg));
  govde.position.set(0, 0.2, 0);
  const agiz = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), KOYU());
  agiz.rotation.z = govde.rotation.z;
  agiz.position.set(Math.cos(THREE.MathUtils.degToRad(aciDeg)) * 0.23, 0.2 + Math.sin(THREE.MathUtils.degToRad(aciDeg)) * 0.23, 0);
  grup.add(taban, govde, agiz);
  return { grup, sil: () => grupSil(grup) };
}

// AquaSWITCH: dikey kompakt solenoid gövde + üstte ince nozul.
export function switchGovde() {
  const grup = new THREE.Group();
  const govde = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), CELIK());
  govde.position.y = 0.11;
  const nozul = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 10), KOYU());
  nozul.position.y = 0.28;
  grup.add(govde, nozul);
  return { grup, sil: () => grupSil(grup) };
}

// AquaJET: klasik paslanmaz boru nozul (flanşlı).
export function jetGovde() {
  const grup = new THREE.Group();
  const flans = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), CELIK());
  flans.position.y = 0.015;
  const boru = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.3, 14), CELIK());
  boru.position.y = 0.18;
  grup.add(flans, boru);
  return { grup, sil: () => grupSil(grup) };
}

// AquaROBO / AquaSWING: taban plakası + mafsal gövdesi + ince nozul çubuğu +
// yan AquaLIGHT diskleri (ROBO 2, SWING 1 — product-dev görselleri).
// donen alt-grup: pan/tilt F3'te bu grubu döndürür.
export function roboGovde(diskSayisi = 2) {
  const grup = new THREE.Group();
  const taban = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.025, 0.2), CELIK());
  taban.position.y = 0.012;
  grup.add(taban);
  const donen = new THREE.Group();
  // gece polish #4 — ürün görseline yaklaştırma: yatay motor silindiri + mafsal
  // küresi + ince nozul çubuğu (kutu yerine; product-dev robo/swing render'ları)
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 14), CELIK());
  motor.rotation.z = Math.PI / 2;
  motor.position.y = 0.09;
  const gövdeDik = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), CELIK());
  gövdeDik.position.y = 0.15;
  const mafsalKure = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), KOYU());
  mafsalKure.position.y = 0.21;
  const nozul = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.28, 8), KOYU());
  nozul.position.y = 0.36;
  donen.add(motor, gövdeDik, mafsalKure, nozul);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < diskSayisi; i++) {
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 14), CELIK());
    const led = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.008, 6, 20), ledMat);
    led.rotation.x = -Math.PI / 2; led.position.y = 0.012;
    disk.add(led);
    disk.position.set(i === 0 ? -0.13 : 0.13, 0.19, 0);
    donen.add(disk);
  }
  donen.position.y = 0.025;
  grup.add(donen);
  return {
    grup, donen,
    // F3: servo yönü — pan grubu döndürür, tilt nozulu temsili eğer
    setYon: (panRad, tiltRad) => { donen.rotation.y = -panRad; donen.rotation.z = tiltRad * 0.6; },
    setRenk: (r, g, b) => ledMat.color.setRGB(r, g, b),
    sil: () => grupSil(grup)
  };
}

// --- v5 F2 gövdeleri (product-dev: finished aqua air/star; torch/perde temsili) ---

// AquaAIR (1030): dikey basınç tankı + merkez namlu + üstte kollu başlık rozeti
// (product-dev air render'ı: silindir gövde, yatay kollar ucunda küçük kafalar).
export function airGovde() {
  const grup = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.34, 16), CELIK());
  tank.position.y = 0.17;
  const namlu = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.3, 10), KOYU());
  namlu.position.y = 0.48;
  grup.add(tank, namlu);
  for (let i = 0; i < 4; i++) {                       // başlık rozeti: 4 kol + kafa
    const a = i * Math.PI / 2;
    const kol = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), CELIK());
    kol.rotation.z = Math.PI / 2; kol.rotation.y = a;
    kol.position.set(Math.cos(a) * 0.1, 0.42, Math.sin(a) * 0.1);
    const kafa = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), KOYU());
    kafa.position.set(Math.cos(a) * 0.2, 0.42, Math.sin(a) * 0.2);
    grup.add(kol, kafa);
  }
  return { grup, sil: () => grupSil(grup) };
}

const PIRINC = () => new THREE.MeshStandardMaterial({ color: 0x9a7a35, metalness: 0.8, roughness: 0.35 });

// AquaSTAR (1020) — karakter kartı: Ø160 flanş disk + merkez 1" nozul + ENTEGRE
// AquaLIGHT-C halka LED (adı buradan: "star" = ışık halkası, su deseni değil)
// + altta kontrol kartı kutusu + 1" pirinç solenoid (product-dev render'ı).
export function starGovde() {
  const grup = new THREE.Group();
  const flans = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 20), CELIK());
  flans.position.y = 0.2;
  const nozul = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.06, 10), CELIK());
  nozul.position.y = 0.24;
  const kart = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), KOYU());
  kart.position.y = 0.15;
  const valf = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), PIRINC());
  valf.position.y = 0.05;
  grup.add(flans, nozul, kart, valf);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });   // entegre halka LED
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.007, 8), ledMat);
    led.position.set(Math.cos(a) * 0.055, 0.215, Math.sin(a) * 0.055);
    grup.add(led);
  }
  return { grup, setRenk: (r, g, b) => ledMat.color.setRGB(r, g, b), sil: () => grupSil(grup) };
}

// AquaPOP JET (1090) — KART v2: "Ø80 üst flanş + yanda kontrol kutusu, 287 mm".
// ⚠NE YANLIŞTI: POP switch arketipine bağlıydı, yani ekranda switchGovde'nin
// 140×220 mm dikdörtgen bloğu + 280 mm'ye kadar çıkan nozul çubuğu vardı. O
// gövde, cihazın 200-400 mm'lik su topunu FİZİKSEL OLARAK YUTUYORDU (nozul ucu
// topun tepesiyle aynı yükseklikte).
// NEDEN BÖYLE: POP bir GÜVERTE cihazı — dışarıda görünen tek parça Ø80 flanştır,
// 287 mm'lik gövde su seviyesinin ALTINDA kalır. Bu yüzden flanş y=0 çevresine
// oturur (orifis flanşın merkezinde, parçacık doğum noktasıyla aynı yer) ve
// gövde aşağı doğru modellenir; ekranı su topuna bırakır.
// LED entegre: 3 W RGB Power LED flanşta — setRenk timeline'dan sürer, havadaki
// damlaları aydınlatan tek kaynak budur (dış AquaLIGHT yok).
//   boy = [flansMm, toplamBoyMm] — künyeden gelir (motor.popTuret ⑥ sonrası).
export function popGovde(boy = null) {
  const [flansMm, toplamMm] = boy || [80, 287];
  const grup = new THREE.Group();
  const r = flansMm / 2000;                            // Ø80 → 0.04 m yarıçap
  const flansH = 0.012;
  const flans = new THREE.Mesh(new THREE.CylinderGeometry(r, r, flansH, 20), CELIK());
  flans.position.y = flansH / 2 - 0.004;               // üst yüz su yüzeyi hizasında
  // Gövde + alt bağlantı, künyedeki 287 mm'yi flanşla birlikte tam doldurur.
  const govdeH = (toplamMm / 1000 - flansH) * 0.72;
  const baglantiH = (toplamMm / 1000 - flansH) * 0.28;
  const govde = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, govdeH, 14), KOYU());
  govde.position.y = -govdeH / 2 - 0.004;
  const baglanti = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.40, r * 0.40, baglantiH, 12), PIRINC());
  baglanti.position.y = -govdeH - baglantiH / 2 - 0.004;
  // Kartın açıkça saydığı YAN kontrol kutusu (POP'u AquaSTAR'dan ayıran detay).
  const kutu = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, govdeH * 0.5, r * 1.1), KOYU());
  kutu.position.set(r * 1.05, -govdeH * 0.45, 0);
  grup.add(flans, govde, baglanti, kutu);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 6; i++) {                        // flanş üstü entegre RGB LED
    const a = (i / 6) * Math.PI * 2;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.005, 8), ledMat);
    led.position.set(Math.cos(a) * r * 0.62, flansH - 0.003, Math.sin(a) * r * 0.62);
    grup.add(led);
  }
  return { grup, setRenk: (rr, g, b) => ledMat.color.setRGB(rr, g, b), sil: () => grupSil(grup) };
}

// AquaTORCH (1125): koyu boru + üst yakma çanağı (alev preset'in parçacığı).
export function torchGovde() {
  const grup = new THREE.Group();
  const boru = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 12), KOYU());
  boru.position.y = 0.2;
  const canak = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.05, 0.1, 14, 1, true), CELIK());
  canak.position.y = 0.44;
  canak.material.side = THREE.DoubleSide;
  grup.add(boru, canak);
  return { grup, sil: () => grupSil(grup) };
}

// WATER CURTAIN — karakter kartı DÜZELTMESİ: su yukarıdan AŞAĞI dökülür.
// Gövde = ayaklı serbest çerçeve (katalog LACE render'ı): iki dikme + ÜSTTE
// ray/kolektör (yukSeklik=preset.kaynakY) + ray altında aşağı bakan pirinç
// nozul dizisi (Ø2mm, ~30 adet) + ray içinde LED şeridi (ENTEGRE RGB —
// setRenk buradan) + zeminde toplama kanalı. setAci: çizgiyle birlikte döner.
export function perdeGovde(boy = 2.6, yukseklik = 2.5, nozulSayi = 0) {
  const grup = new THREE.Group();
  // v7 PERDE turu (b): üst ray ekranda PARLAK BEYAZ KESİKLİ ÇİZGİ gibi
  // okunuyordu. Kök sebep ray değil, ray önündeki LED şeridiydi: 15×15 mm'lik
  // MeshBasicMaterial (ışıklandırmasız, saf beyaz) çubuk 2.5 m yükseklikte
  // kadraja ~1 piksel düşüyor → örtüşme (aliasing) onu kesik kesik yakıp
  // söndürüyordu. İki taraflı düzeltme:
  //   1) Ray artık kutu değil Ø90 mm BORU (kolektör gerçeği) — birkaç piksel
  //      kalınlık kazanıp gövde gibi okunur, tek piksellik çizgi olmaktan çıkar.
  //   2) LED şeridi rayın ÖN-ALT çeyreğine gömülür ve MeshStandard/emissive olur:
  //      boru kendisi üstten bakışta şeridi gölgeler, saf beyaz yerine ışıyan
  //      renk verir. LED artık "beyaz çizgi" değil, suya vuran ışık kaynağı.
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, boy + 0.1, 14), CELIK());
  ray.rotation.z = Math.PI / 2;                       // boru hat boyunca yatar
  ray.position.y = yukseklik + 0.045;
  grup.add(ray);
  for (const s of [-1, 1]) {                            // dikmeler + taban plakaları
    const dikme = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, yukseklik, 8), CELIK());
    dikme.position.set(s * (boy / 2 + 0.03), yukseklik / 2, 0);
    const taban = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.22), KOYU());
    taban.position.set(s * (boy / 2 + 0.03), 0.01, 0);
    grup.add(dikme, taban);
  }
  // Toplama kanalı: 50 mm yüksek × 160 mm derindi ve KOYU malzeme olduğu için
  // suyun indiği şeridin TAM ÜSTÜNÜ kapatıyordu — köpük halkaları y=0.02'de
  // duruyor, kanalın tepesi 0.05'te kalıyordu, yani çarpma imzası gövdenin
  // arkasına gömülüyordu. Alçaltıldı (tepe 0.036) ve daraltıldı: kanal hâlâ
  // okunur ama köpük şeridi önünden görünür.
  const kanal = new THREE.Mesh(new THREE.BoxGeometry(boy + 0.1, 0.036, 0.11), KOYU());
  kanal.position.y = 0.018;                             // toplama kanalı
  grup.add(kanal);
  // v7 perde: nozul adedi KÜNYEDEN gelir (CLASSIC 30 ✅künye, LACE/DIGITAL
  // temsili) — sudaki sütun sayısıyla gövdedeki delik sayısı aynı olsun diye.
  // Künyesiz çağrıda (eski .aqshow) eski türetme korunur.
  const adet = nozulSayi > 0 ? nozulSayi : Math.max(10, Math.round(boy * 11));
  for (let i = 0; i < adet; i++) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 5), PIRINC());
    n.position.set(-boy / 2 + (i + 0.5) * (boy / adet), yukseklik - 0.015, 0);
    grup.add(n);
  }
  // LED şeridi: emissive (bkz. yukarıdaki ray notu) — MeshBasic saf beyaz DEĞİL.
  // color koyu tutulur, ışıma emissive'den gelir; setRenk ikisini birden sürer ki
  // sönükken bile boru rengini alsın, yanarken piksel taşırmasın.
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x223038, emissive: 0xffffff, emissiveIntensity: 0.3,
    metalness: 0.1, roughness: 0.6 });
  // ⚠BOYUT KRİTİK — ilk denemede 20 mm yaptım, kesikli beyaz çizgi GERİ GELDİ:
  // bu kadraj/mesafede 1 piksel ≈ 11 mm, yani 20 mm hâlâ ~2 px ve örtüşüyor.
  // 50 mm'lik LED kanalı (gerçek kolektörlerde olan ölçü) ~5 px tutar → örtüşme
  // biter, şerit "yanıp sönen çizgi" değil ışıyan bir yüzey olur.
  const serit = new THREE.Mesh(new THREE.BoxGeometry(boy, 0.05, 0.02), ledMat);
  // Rayın ÖN-ALT'ına, boru siluetinin İÇİNE gömülür (y borunun merkezinin
  // altında): kamera yukarıdan baktığı için Ø90 boru şeridi gölgeler, LED
  // gökyüzüne karşı parlayan bir çubuk değil suya vuran ışık olarak okunur.
  serit.position.set(0, yukseklik + 0.022, 0.035);
  grup.add(serit);
  return { grup,
           setRenk: (r, g, b) => { ledMat.emissive.setRGB(r, g, b); ledMat.color.setRGB(r * 0.15, g * 0.15, b * 0.15); },
           setAci: (rad) => { grup.rotation.y = -rad; }, sil: () => grupSil(grup) };
}

// DryDECK: zemine gömülü ızgara halkası (kuru zemin nozulu — insan-açık alan).
// DryDECK üst plakası — Faz 2 Tur 2/4 (2026-07-25).
// NE YANLIŞTI: gövde tek bir Ø280 torus+disk idi; oysa `zarf-urunler.js` iki
// DryDECK ürünü için de **kare 300×300, kalınlık 30 mm** ("Premium") kararını
// künyeden vermiş (gerekçe: künye gövde ölçüsü 300×300×368/350 mm KARE), kart da
// bunu açık borç olarak yazmış (drydeck.md:347 + §8 önceliği ④ + [ELLE] D9).
// Yani ekranda yanlış BİÇİM duruyordu: yuvarlak, ince, kenarsız.
// ⚠"Hemyüz" (flush, sıfır su seviyesi — kart §1) sözleşmesi korunuyor: plaka
// ÜST YÜZÜ zeminle aynı düzlemde, kalınlık AŞAĞI iner (görünmez). Bu yüzden
// 5 mm ↔ 30 mm farkı yükseklikle DEĞİL, kenar payıyla okunur: kalın plakada
// gerçek montajda görünen kenar boşluğu (reveal) var, incede yok.
// ustPlaka = { bicim: 'kare'|'yuvarlak', kenarMm|capMm, kalinlikMm } (künyeden);
// null gelirse (künyesiz/eski .aqshow) ESKİ Ø280 torus+disk birebir korunur.
export function drydeckGovde(ustPlaka = null) {
  const grup = new THREE.Group();
  const HEMYUZ = 0.003;                 // z-fighting payı: plaka üstü zemin hizası
  if (ustPlaka) {
    const kalin = (ustPlaka.kalinlikMm ?? 5) / 1000;
    const kare = ustPlaka.bicim === 'kare';
    const yariBoy = kare ? (ustPlaka.kenarMm ?? 300) / 2000 : (ustPlaka.capMm ?? 280) / 2000;
    // Plaka gövdesi: üst yüz HEMYUZ'de, kalınlık aşağı iner.
    const plakaGeo = kare
      ? new THREE.BoxGeometry(yariBoy * 2, kalin, yariBoy * 2)
      : new THREE.CylinderGeometry(yariBoy, yariBoy, kalin, 32);
    const plaka = new THREE.Mesh(plakaGeo, CELIK());
    plaka.position.y = HEMYUZ - kalin / 2;
    grup.add(plaka);
    // Kenar boşluğu (reveal): kalın Premium plakada montaj derzi GÖRÜNÜR —
    // plakanın 8 mm dışına koyu bir çerçeve. İnce plakada derz yok (≤10 mm).
    if (kalin > 0.010) {
      const d = 0.008, dGeo = kare
        ? new THREE.BoxGeometry((yariBoy + d) * 2, 0.004, (yariBoy + d) * 2)
        : new THREE.CylinderGeometry(yariBoy + d, yariBoy + d, 0.004, 32);
      const derz = new THREE.Mesh(dGeo, KOYU());
      derz.position.y = HEMYUZ - 0.004;   // plakanın hemen altında halka gibi görünür
      grup.add(derz);
    }
    // Nozul ağzı: plakanın ortasındaki ızgara/delik. Plakayla ölçeklenir ama
    // nozul çapı üründen bağımsız küçüktür — plakanın %45'i (kart: "2 farklı
    // nozul tipi", ölçü basılı DEĞİL → [TEMSİLİ], plakayı doldurmaz).
    const agizR = yariBoy * 0.45;
    const agiz = new THREE.Mesh(new THREE.CylinderGeometry(agizR, agizR, 0.010, 20), KOYU());
    agiz.position.y = HEMYUZ + 0.001;
    const bilezik = new THREE.Mesh(new THREE.TorusGeometry(agizR, 0.012, 8, 24), CELIK());
    bilezik.rotation.x = -Math.PI / 2;
    bilezik.position.y = HEMYUZ + 0.004;
    grup.add(agiz, bilezik);
    return { grup, sil: () => grupSil(grup) };
  }
  const cerceve = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 24), CELIK());
  cerceve.rotation.x = -Math.PI / 2;
  cerceve.position.y = 0.008;
  const izgara = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 20), KOYU());
  izgara.position.y = 0.006;
  grup.add(cerceve, izgara);
  return { grup, sil: () => grupSil(grup) };
}
