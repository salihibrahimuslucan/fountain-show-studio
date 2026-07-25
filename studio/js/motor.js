// Motor — GPU su cihazları + AquaLIGHT halka aydınlatma (Ders 10 portu + v3).
// v3 ışık devrimi (spec 2026-07-16-cihaz-gercekciligi §3): tiyatro spotu + hacimli
// huzme + shader ışık-dizisi KALKTI — Aquatronic gerçeği nozul-altı 412C halka
// LED'dir. Renk per-jet uniform'dan (T-C), halkanın zemine vuran ışığı IsikGolu'dan
// gelir; bağımsız 412C = HalkaIsik cihazı, SAYI SINIRSIZ (per-device, dizi yok).
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { KopukHalka, IsikGolu, SicramaTaci } from './zemin-efekt.js';
import { halkaDisk, switchGovde, jetGovde, roboGovde, drydeckGovde,
         airGovde, starGovde, torchGovde, perdeGovde, varioGovde, bosGovde,
         popGovde } from './govde.js';
import { inisNoktasi, inisHatti, guc as balistikGuc } from './balistik.js';
import { KATMAN } from './katman.js';
import { hatKazanclari } from './isik-borusu.js';
import { gpuBaslat, gpuDok } from './ripple.js';
// v7 ZARF turu: preset hızları artık elle yazılmıyor, ürünün zarfından türüyor.
import { urunZarfi } from '../data/zarf.js';

const G = 9.81;

// GÖRSEL TEŞHİS BAYRAKLARI — motorKur'un 4. argümanından gelir (ana.js hash'ten
// okur: #tani-glowsuz / #tani-golsuz). Amaç: aynı noktada üst üste binen parlak
// katmanları TEK TEK kapatıp artefaktın hangisinden geldiğini izole etmek
// (2026-07-22 "ışık karesi" şikâyeti; Codex'in 4-kare protokolü).
// ⚠location'a motor.js'den DOKUNULMAZ — 9 test dosyası bu modülü node'da
// sahte-THREE ile içe aktarıyor, global `location` orada yok.
let TANI = {};

// --- sprite doku (Ders 10 BLOK 2) ---
function dokuUret(ciz) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  ciz(c.getContext('2d'), 128);
  return new THREE.CanvasTexture(c);
}
const damlaDoku = dokuUret((ctx, S) => {
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
});

// v7 borç: mist ayrı doku. F2'de mist damlaDoku'yu paylaşıyordu — damlanın
// %35'te 0.75'e düşen SERT çekirdeği, 7× büyütülmüş mist sprite'ında disk
// kenarı belli olan "yumurta blob" bırakıyordu (F2 notundaki artefakt; alfa
// düşürmek kenarı değil yalnız yoğunluğu azaltıyordu). Sis çekirdeksizdir:
// gauss benzeri geniş kuyruk, kenarda tam 0 → üst üste binince homojen halı.
// İntegral damlaya yakın tutuldu (tepe 0.85 + geniş etek), yoksa mist sönerdi.
const sisDoku = dokuUret((ctx, S) => {
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.34)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.12)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
});

// Depence md. 3 + referans havuzu §1.1: jet gövdesi "iri damla salkımları" —
// tek yumuşak blob yerine merkez çekirdek + uydu bloblar. Doku bir kez üretilir;
// additive'de komşu parçacıklarla üst üste binince salkım okunur.
const salkimDoku = dokuUret((ctx, S) => {
  const blob = (x, y, r, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.55, `rgba(255,255,255,${(a * 0.5).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  };
  blob(S * 0.5, S * 0.5, S * 0.26, 1.0);                     // çekirdek
  for (let i = 0; i < 7; i++) {                              // uydular
    const a = (i / 7) * 2 * Math.PI + Math.random() * 0.5;
    const d = S * (0.16 + Math.random() * 0.16);
    blob(S * 0.5 + Math.cos(a) * d, S * 0.5 + Math.sin(a) * d,
         S * (0.07 + Math.random() * 0.08), 0.5 + Math.random() * 0.3);
  }
});

// Envanter #2: nozul "kaynak parlaması" — additive radyal glow, Depence'in
// jet dibindeki aşırı parlak kaynak imzası (defter gözlem 2: sualtı kaynak
// daima aşırı parlak). depthWrite:false + AdditiveBlending; boyut ışık
// gölünden KÜÇÜK (kaynak noktası, göl değil). Tek doku ÜRETİLİR, tüm
// cihazlar paylaşır (salkimDoku/damlaDoku deseni) — SpriteMaterial map'i
// olduğu için renk yorumu sRGB'ye sabitlenir (uniform sampler'lardan farkı).
const nozulGlowDoku = dokuUret((ctx, S) => {
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
});
nozulGlowDoku.colorSpace = THREE.SRGBColorSpace;

// --- AquaPOP JET (1090) türetimi -------------------------------------------
// ⚠ NE YANLIŞTI: POP katalogda arketip:'switch' idi. switch preseti speed.b=6.8
// taşır, yani balistik tepesi 6.8²/2g = 2.36 m — ekranda UZUN BİR SU KOLONU.
// Karakter kartı (KART v2) bunun tam tersini söylüyor: "KOLON YOK — Ø3mm
// orifisten küçük su topu / damla demeti (~20-40 cm) fırlar, iri BERRAK
// damlalar, köpük yok". Aradaki fark 6-12 kat; ürün ekranda başka bir cihazdı.
//
// NEDEN BÖYLE DÜZELTİLDİ: sayı jet/vario presetinden ÖLÇEKLENEREK değil, kartın
// verdiği YÜKSEKLİKTEN TÜRETİLİYOR. POP bu motordaki en yavaş doğumlu cihaz
// (≈2 m/s; vario 7.7, aquajet 15.5) — bir jet presetini "biraz küçültmek" bu
// mertebeye asla inmez, karakteri de vermez.
//
// Referans künye = katalog AquaPOP JET `pop` bloğu. Bu değerlerle çağrıldığında
// temel preset AYNEN çıkar (özdeşlik kontrolü: test/pop-arketip.test.mjs).
const POP_REF = { tepeMinM: 0.20, tepeMaksM: 0.40, orifisMm: 3, ledW: 3,
                  flansMm: 80, boyMm: 287 };
// Parlaklık referansı: AquaLIGHT 412C = 48 W / 4620 lm (katalog). POP'un lümeni
// katalogda BASILI DEĞİL, o yüzden UYDURULMAZ — aynı LED etkinliği varsayımıyla
// güç oranı kullanılır (lm/lm = W/W). 3 W → ölçek 0.0625 (412C'nin %6'sı).
const POP_ISIK_REF_W = 48;
function popTuret(s) {
  // ① Yükseklik → doğum hızı: Torricelli h = v²/2g. 20 cm → 1.98 m/s,
  //    40 cm → 2.80 m/s. Motorda sürükleme yok, yani ekranda okunan tepe
  //    KARTIN verdiği tepedir (cetvelli kare kanıtıyla ölçülebilir).
  const vA = Math.sqrt(2 * G * s.tepeMinM);
  const vB = Math.sqrt(2 * G * s.tepeMaksM);
  // ② Ömür = TAM UÇUŞ SÜRESİ 2v/g (0.40 s / 0.57 s). Damla nozul hizasında
  //    doğup nozul hizasına iner; ömür bundan uzun olsa damla yerin altında
  //    yaşamaya devam eder, kısa olsa top havada buharlaşırdı. Sabit yazılmaz,
  //    hızdan türer — yükseklik değişirse ömür kendiliğinden düzelir.
  const omurA = 2 * vA / G, omurB = 2 * vB / G;
  // ③ Atım penceresi: paket kendi TIRMANMA BOYUNDAN uzun olmasın, yoksa ekranda
  //    top değil kısa bir kolon okunur ("kolon değil top" niteliğinin kilidi).
  //    L = v·atim ≤ tepeMin → atim = tepeMin / vMaks = 0.071 s.
  //    ⚠Aile künyesindeki en hızlı belgeli aktüasyon SWITCH DryDECK Bucket'ın
  //    0.1 s aç-kapası; Ø3 mm orifisli bir solenoid ondan hızlıdır, yani 0.071 s
  //    mekanik olarak tutarlı (uydurma bir "ani" değeri değil).
  const atim = s.tepeMinM / vB;
  // ④ Reload: pencerenin SONUNDA doğan en hızlı damla atim + 2v/g anında iner.
  //    AquaAIR salvo kuralı (ömür < reload) burada da geçerli — tetik ancak tüm
  //    paket yere değdikten sonra kabul edilir, yoksa slug bölünür ve yoğunluk
  //    düşer. Periyot = atim + reload ≈ 0.71 s → ~1.4 atım/s. AIR 6.5 s
  //    periyotla 0.15 atım/s atıyordu; POP onun ~9 katı hızlı.
  const reload = atim + omurB;
  // ⑤ Damla boyu: Rayleigh kırılması, serbest jet damla çapı ≈ 1.89 × orifis
  //    çapı → Ø3 mm orifis 5.7 mm damla. Sprite yarıçapı fiziksel çap DEĞİL;
  //    motorun her yerinde aynı görsel şişme var (vario Ø12 nozul → 1.89×12 =
  //    22.7 mm fiziksel damla, preset size 0.04 → kat 1.76). POP'a AYNI kat
  //    uygulanır ki cihazlar arası boy hiyerarşisi bozulmasın.
  const GORSEL_KAT = 0.04 / (1.89 * 0.012);
  const boyut = 1.89 * (s.orifisMm / 1000) * GORSEL_KAT;
  // ⑥ Işık: entegre RGB Power LED, flanşta. Aydınlatılan ALAN akının küp kökü
  //    mertebesinde büyür (vario ④ ile aynı model). 3/48 → 0.397.
  const isikOlcek = Math.cbrt(s.ledW / POP_ISIK_REF_W);
  return {
    // Bütçe. İlk deneme fiziksel damla sayısıydı: orifis debisi A·v·atim =
    // 1.2 mL, Rayleigh damla hacmi 9.5e-8 m³ → paket başına ~13 damla, yani
    // kenar 8 (64 parçacık). Kare kanıtı bunu ÇÜRÜTTÜ (_kiyas.local/pop/
    // sonra_t0.20.png): demet doğru yükseklikteydi ama neredeyse görünmezdi.
    // Ölçüm AIR turunun yoğunluk ölçütüyle yapıldı (test/air-salvo.test.mjs):
    // kenar 8'de POP'un ekran yoğunluğu, görünür cihazların en sönüğü olan
    // aquajet'in 0.33 KATI — AIR'in kaybolma hatasıyla BİREBİR aynı oran.
    // Sebep: sprite tek bir damlayı değil damlayı VE uçuş izini temsil ediyor,
    // yani "fiziksel damla = 1 parçacık" eşlemesi motorun render modeline
    // uymuyor. kenar 16 (256 parçacık) yoğunluğu aquajet'in 1.32 katına
    // çıkarır. Hâlâ motorun EN KÜÇÜK bütçesi (air 320², geyser 196² — iki
    // mertebe fark): ekranda demet okunur, sis okunmaz.
    kenar: 16,
    // Koni switch'ten (0.035) GENİŞ: tek delikten çıkan slug havada dağılır,
    // dar koni onu tekrar ipliğe çevirirdi. Demet ~±3° yayılır.
    shape: { type: 'point', angle: 0.055 },
    salvo: { atimSn: atim, reloadSn: reload },
    particle: {
      speed: { a: vA, b: vB }, life: { a: omurA, b: omurB }, size: boyut,
      // BERRAK damla: kart "köpük YOK" diyor. aeration motorun boyama kazancını
      // sürüyor (su-altı-ışık referansı: hava kabarcığı ışığı saçar, berrak su
      // SOĞURUR — boyanmaz, İLETİR). Motordaki en düşük aeration bu olmalı;
      // switch 0.2 / vario 0.15 ile POP köpüklü görünüyordu.
      color: '#dff1ff', alpha: 0.30, aeration: 0.03, gerdirme: 0.35, mist: 0.0,
      // Tepede büyüme YOK (top dağılmaz, bütün kalır); iniş tacı kartın açıkça
      // istediği şey → dusmeBuyume yüksek.
      tepeBuyume: 1.0, dusmeBuyume: 1.7, doku: 'damla'
    },
    yumusaklik: 0.3,
    // "İnişte taç sıçraması + halka dalgacık": küçük ama belirgin halka.
    // Yarıçap tepe yüksekliğiyle ölçekli (0.4 m'lik top 1.5 m'lik gölet açmaz).
    kopuk: { icR: 0.02, disR: s.tepeMaksM * 0.55, kazanc: 0.55 },
    gol: { yariCap: s.tepeMaksM * 2.2 * isikOlcek, kazanc: 0.5 * isikOlcek,
           renk: '#9fd8ff' },
    govdeTip: 'pop', popBoy: [s.flansMm, s.boyMm]
  };
}
// Künye → preset. Künyesiz çağrıda (eski .aqshow, testler) temel preset döner —
// temel zaten POP_REF'in kendisidir, yani davranış aynı (spec §T-E).
export function popPresetTuret(temel, kunye) {
  const s = kunye?.pop;
  if (!s) return temel;
  return popTuret({ ...POP_REF, ...s });
}

// --- ZARF BAĞLAMA: preset hızları artık zarf.js'ten türer ------------------
//
// NE YANLIŞTI: aşağıdaki presetlerin `speed` değerleri ELLE UYDURULMUŞ sabitti.
// SWITCH 5.5-6.8 m/s → balistik tepe 6.8²/2g = 2.36 m; katalog AquaSWITCH için
// MAKS 6 m diyor. Salih'in "SWITCH çok hızlı açılıyor" ve "kolon çok kısa"
// şikâyetleri aynı sabitin iki yüzüydü (zarf.js dosya başı notu).
//
// ⭐KARAR — HANGİ SAYI NEREDEN GELİR (bu turun tek mimari kararı):
//   • MUTLAK HIZ (m/s) fizikseldir → zarf.js. Presette artık YAZILMAZ.
//   • YAYILIM ve ÖMÜR/UÇUŞ oranları BOYUTSUZ KARAKTERDİR (cihazın tepesi
//     dağılıyor mu, izi ne kadar sürüyor) → preset'te kalır.
// Bu ayrım v7 VARIO turunun dersidir: "eski kodun yanlışı yayılım değil, MUTLAK
// YÜKSEKLİKTİ" (vario preseti içindeki uzun not). Bu yüzden plandaki sabit ±%8
// saçılım KULLANILMADI: %8 → a = 0.852·b, yani VARIO turunda apeksi katı beyaz
// bloğa çeviren 0.88 ile çalıştığı kanıtlanan 0.81 arasına düşüyor — kanıtsız
// bir risk. Bunun yerine her preset KENDİ bugünkü a/b oranını taşır; ekranda
// çalıştığı görülmüş dağılım aynen korunur, yalnız mutlak seviye düzelir.
//
// ⚠GERİ DÜŞÜŞ (plandaki `return { a: 5.0, b: 6.0 }` REDDEDİLDİ): sessiz bir
// varsayılan hız, düzeltmeye çalıştığımız hatanın ta kendisidir. İki katmanlı
// çözüm:
//   (1) MODÜL YÜKÜNDE geri düşüş YOK. Aşağıdaki referans ürün adları sabit;
//       biri zarf tablosundan düşerse `urunZarfi` null döner ve `zarfParca`
//       PATLAR — modül hiç yüklenmez, smoke ilk karede kırmızı olur. Yani
//       "sessizce yanlış hız" fiziksel olarak imkânsız.
//   (2) ÇALIŞMA ANINDA (per-ürün) geri düşüş = AİLE REFERANSI, uydurma sabit
//       değil. Künyesiz çağrı (eski .aqshow, testler) ve zarfı OLMAYAN ürün
//       (AquaPULSE — su atmadığı için SU_URETMEYEN'de ilan edilmiş) referans
//       presete düşer; spec §T-E ileri uyumluluk. console.warn KULLANILMADI:
//       repo politikası sayfa konsolunun SESSİZ olması (smoke bunu kırmızı
//       sayar). Gürültü yerine KAPI: test/zarf-motor.test.mjs bağlı her
//       arketipin her katalog ürününün zarfını çözebildiğini doğrular — boşluk
//       ekrana değil commit'e düşer.
//
// Ürün bazlı farklılaşma: `zarfPresetTuret` künyedeki ÜRÜN ADINDAN çözer, yani
// AquaJET I/II/III aynı preseti paylaşsa da ekranda 15/25/40 m'lik AYRI kolonlar
// olur (perde ve VARIO turlarındaki künye mekanizmasının aynısı).
const ZARF_ARKETIPLERI = new Set([
  'switch', 'drydeck', 'aquajet', 'robo', 'swing', 'star', 'geyser', 'yelpaze',
]);
// Referans ürün: preset'in TEMEL değerini veren aile üyesi. Bu ürünle
// çağrıldığında `zarfPresetTuret` özdeşliktir (ölçek = 1).
function zarfParca(urunAd, { yayilim, omurPay, omurYayilim }) {
  const z = urunZarfi(urunAd);
  // Bilerek PATLAR: bkz. yukarıdaki (1). Sessiz varsayılan yok.
  if (!z || !(z.su.hizMs > 0)) {
    throw new Error(`motor: "${urunAd}" icin su zarfi yok — preset hizi turetilemez`);
  }
  const v = z.su.hizMs;
  const ucus = 2 * v / G;               // tam uçuş süresi (yükseliş + iniş)
  const omur = ucus * omurPay;
  return { speed: { a: v * yayilim, b: v }, life: { a: omur * omurYayilim, b: omur } };
}

// --- su cihazları = veri (Ders 10 BLOK 3; konum yerleşimden gelir) ---
export const PRESETLER = {
  // ⛔ZARFA BAĞLANMADI, gerekçe: bu arketibi paylaşan TEK katalog ürünü
  // AquaSPIN I ve o "köpüklü OPAK kısa kolon" (3 m) — genel düz jetin ailesi
  // değil. Referans alsaydık jeneri jet 12.0 → 6.42 m/s'ye düşerdi, yani bir
  // ürünün karakteri motorun geneline bulaşırdı. Dürüst bir aile referansı
  // çıkana kadar (ya da SPIN kendi arketibini alana kadar) elle kalır.
  duz_jet: { kenar: 176, shape: { type: 'point', angle: 0.05 },
    particle: { speed: { a: 10.0, b: 12.0 }, life: { a: 2.0, b: 2.3 }, size: 0.045,
      color: '#bfe3ff', alpha: 0.08, aeration: 0.35, gerdirme: 1.0,
      tepeBuyume: 1.4, dusmeBuyume: 0.7, doku: 'salkim' }, yumusaklik: 0.4,
    kopuk: { icR: 0.10, disR: 0.75, kazanc: 0.5 },
    gol: { yariCap: 1.6, kazanc: 0.5, renk: '#9fd8ff' }, govdeOlcek: 1 },
  // Referans 'Geyser' (zarf 3.0 m, AquaBLAST'tan 1:1). Aile: AquaBLAST 3 m,
  // AquaTHRONE I 8.5 m — ikisi artık künyeden AYRIŞIR.
  geyser: { kenar: 196, shape: { type: 'disc', radius: 0.28, angle: 0.22 },
    particle: { ...zarfParca('Geyser', { yayilim: 0.786, omurPay: 1.05, omurYayilim: 0.80 }), size: 0.06,
      color: '#e8f4ff', alpha: 0.03, aeration: 0.75, gerdirme: 0.45, mist: 0.10,
      tepeBuyume: 0.9, dusmeBuyume: 0.5, doku: 'salkim' }, yumusaklik: 0.5,
    kopuk: { icR: 0.28, disR: 1.35, kazanc: 0.7 },
    gol: { yariCap: 2.2, kazanc: 0.6, renk: '#bfe8ff' }, govdeOlcek: 1.8 },
  // T-E yelpaze/fan jet: TEK DÜZLEMDE açılan su perdesi (ders/03 `fan` shape,
  // Depence ref md.5). koniYon radyal pasta dilimi verirdi — doğum yönü shader'da
  // uYelpaze dalıyla düzlemsel üretilir; angle = ±açılım (rad), düzlem yönü uYonAci.
  // Referans 'Yelpaze Jet'; aile üyesi AquaSHIELD I (10 m ekran) künyeden ayrışır.
  // ⚠Zarf tablosundaki 'Yelpaze Jet' maks 3.7 m'yi ZATEN bu presetin eski 8.5
  // m/s'sinden okumuştu (zarf-urunler.js gerekçesi) — üstüne TIPIK_ORAN binince
  // hız 8.5 → 7.13'e iner. Kaynaksız bir değerin kalibrasyon borcu; ürünsüz
  // genel arketip olduğu için kabul edildi, gerçek kaynak çıkınca tabloda düzelir.
  yelpaze: { kenar: 160, shape: { type: 'fan', angle: 0.85 },
    particle: { ...zarfParca('Yelpaze Jet', { yayilim: 0.824, omurPay: 0.98, omurYayilim: 0.824 }), size: 0.05,
      color: '#cfe8ff', alpha: 0.06, aeration: 0.5, gerdirme: 0.9,
      tepeBuyume: 1.0, dusmeBuyume: 0.5, doku: 'salkim' }, yumusaklik: 0.45,
    kopuk: { icR: 0.1, disR: 1.0, kazanc: 0.5 },
    gol: { yariCap: 1.8, kazanc: 0.5, renk: '#a8dcff' }, govdeOlcek: 0.9 },
  // --- v3 F3 katalog arketipleri (spec cihaz-gerçekçiliği §2, künye PN'leri) ---
  // AquaSWITCH (1041) — Salih karakter tarifi (2026-07-17): "vario gibi ama daha
  // ince, daha düşük seviyeye atar; kolon düzgün çıkar, TEPEDE DAĞILIR" —
  // damla dokusu, dar koni, düşük aeration, tepeBuyume yüksek (dağılma tepede).
  // Ani aç/kes karakteri master step kanalından (proje.js); hiz kanalı DOĞMAZ.
  // ⭐v7 ZARF: elle yazılı 5.5-6.8 m/s (tepe 2.36 m) KALKTI — katalog maks 6 m,
  // tipik nokta 4.2 m → 9.08 m/s. Salih'in "kolon çok kısa / çok hızlı açılıyor"
  // şikâyetinin kök sebebi buydu. Yayılım (0.81) bugünkü presetin kendisinden.
  // KART v2 AquaSWITCH §3 + envanter #38 (2026-07-22 cila turu): "kesildiğinde
  // kolon havada kalır ve balistik olarak düşer" — kare kanıtı (before-t2.03.png,
  // kapanıştan 30 ms sonra) bunun TUTMADIĞINI gösterdi: uAlfa tek bir global
  // master çarpanıydı, kesim anında havadaki su da parçacık yaşından bağımsız
  // ANINDA yok oluyordu. aniKesme=true → setMaster artık uAlfa'yı master'la
  // SIFIRLAMAZ (sabit baseAlfa) ve doğumu AIR'in salvo "reload sessizliği"
  // deseniyle (uKapali, salvoKapali ile aynı park dalı) durdurur: kapanışta
  // YENİ su çıkmaz ama havada olan parçacık kendi ömrünü/sıçramasını normalce
  // bitirir. Yalnız switch'te — diğer TÜM cihazlarda uKapali varsayılan 0
  // (no-op), VARIO/AIR gibi kapanmış GÖRSEL KAPI'ları bit düzeyinde korunur.
  switch: { kenar: 144, shape: { type: 'point', angle: 0.035 },
    particle: { ...zarfParca('AquaSWITCH', { yayilim: 0.809, omurPay: 1.08, omurYayilim: 0.80 }), size: 0.038,
      color: '#cfe9ff', alpha: 0.07, aeration: 0.2, gerdirme: 1.2,
      tepeBuyume: 1.7, dusmeBuyume: 0.7, doku: 'damla' }, yumusaklik: 0.4,
    kopuk: { icR: 0.08, disR: 0.6, kazanc: 0.5 },
    gol: { yariCap: 1.3, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'switch',
    aniKesme: true },
  // AquaROBO (1001): 2 eksen servo — karakter kartı: İNCE-ORTA BERRAK jet
  // ("kuyruklu yıldız hissi", gövde bütün, tepe hafif damla saçılımı) → damla
  // dokusu + düşük aeration; uNozulYon pan/tilt'le döner.
  // Referans AquaROBO (20 m); aile ROBO-ROLL 7.5 m ve HYDRA 10 m künyeden ayrışır.
  robo: { kenar: 128, shape: { type: 'point', angle: 0.025 },
    particle: { ...zarfParca('AquaROBO', { yayilim: 0.857, omurPay: 0.887, omurYayilim: 0.842 }), size: 0.04,
      color: '#bfe3ff', alpha: 0.07, aeration: 0.18, gerdirme: 1.3,
      tepeBuyume: 1.3, dusmeBuyume: 0.6, doku: 'damla' }, yumusaklik: 0.4,
    kopuk: { icR: 0.06, disR: 0.5, kazanc: 0.4 },
    gol: { yariCap: 1.2, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'robo' },
  // AquaSWING (1002): 1 eksen 180° — kart: ROBO ile AYNI jet (aynı debi tablosu),
  // fark yalnız eksende.
  // ⚠Aile üyesi AquaPULSE'un zarfı YOK (su atmıyor, SU_URETMEYEN'de ilan) →
  // künyeyle gelse bile bu referansa düşer. Doğru değil ama yeni bir hata da
  // değil: PULSE'un jeti hiç yoktu, kendi ripple modelini bekliyor (v6 borcu).
  swing: { kenar: 128, shape: { type: 'point', angle: 0.025 },
    particle: { ...zarfParca('AquaSWING', { yayilim: 0.85, omurPay: 0.883, omurYayilim: 0.833 }), size: 0.04,
      color: '#bfe3ff', alpha: 0.07, aeration: 0.18, gerdirme: 1.3,
      tepeBuyume: 1.3, dusmeBuyume: 0.6, doku: 'damla' }, yumusaklik: 0.4,
    kopuk: { icR: 0.06, disR: 0.5, kazanc: 0.4 },
    gol: { yariCap: 1.2, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'swing' },
  // DryDECK (VARIO/SWITCH DryDECK) — Salih (2026-07-17): "drydeck ya switch'le
  // ya vario ile yapılır, bu ikisi gibi davranır" → vario karakterinin kısası:
  // damla dokusu, yarı-berrak toplu kolon, köpüklü fıskiye DEĞİL.
  // Referans AquaVARIO DryDECK (preset yorumu zaten "vario karakterinin kısası"
  // diyor); AquaSWITCH DryDECK 2.23 m ile künyeden ayrışır.
  drydeck: { kenar: 128, shape: { type: 'point', angle: 0.04 },
    particle: { ...zarfParca('AquaVARIO DryDECK', { yayilim: 0.776, omurPay: 1.015, omurYayilim: 0.75 }), size: 0.04,
      color: '#d6efff', alpha: 0.075, aeration: 0.2, gerdirme: 1.0,
      tepeBuyume: 1.2, dusmeBuyume: 0.6, doku: 'damla' }, yumusaklik: 0.35,
    kopuk: { icR: 0.05, disR: 0.45, kazanc: 0.45 },
    gol: { yariCap: 0.9, kazanc: 0.55, renk: '#bfe8ff' }, govdeTip: 'drydeck' },
  // AquaJET I-III (1230-32): klasik pasif yüksek jet (harici VFD pompa) — en yüksek kolon.
  // ⭐Referans AquaJET I (tipik 15 m). ÜÇ ÜRÜN bu preseti paylaşıyordu ve
  // ekranda BİREBİR aynıydı; artık künyeden 15/25/40 m olarak ayrışırlar.
  aquajet: { kenar: 176, shape: { type: 'point', angle: 0.03 },
    particle: { ...zarfParca('AquaJET I', { yayilim: 0.871, omurPay: 0.886, omurYayilim: 0.857 }), size: 0.05,
      color: '#cfe6ff', alpha: 0.07, aeration: 0.4, gerdirme: 1.1,
      tepeBuyume: 1.5, dusmeBuyume: 0.8, doku: 'salkim' }, yumusaklik: 0.45,
    kopuk: { icR: 0.12, disR: 0.9, kazanc: 0.6 },
    gol: { yariCap: 1.7, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'jet' },
  // AquaVARIO (1050/1051) — Salih'in karakter tarifi (2026-07-17): "saçmıyor,
  // laminer kadar sabit akmıyor ama saçak da değil" → YOĞUN YARI-BERRAK KOLON:
  // dar koni (0.03), düşük aeration (0.15), damla dokusu (salkım pütürü yok),
  // yüksek alfa (yoğunluk sprey kalabalığından değil çekirdek dolgunluğundan).
  // ⚠v7 TUR 2 DÜZELTMESİ: eski hız aralığı 7.6-9.4 idi = 151'in tepesi (3 m) ile
  // 241'in tepesi (4.5 m) TEK preset'in içine sıkıştırılmıştı. Sonuç: her iki
  // ürün de ekranda aynı, hem de tepesi 1.5 m boyunca dağılan bulanık kolon.
  // Temel preset artık REFERANS 151'dir (Ø12, katalog 3.0 m); 241 farkı
  // varioPresetTuret ile künyeden türer. Aralık dar (%5) çünkü karakter
  // "saçmıyor, yoğun kolon" — tepesi belirli olmalı.
  // Torricelli: v = sqrt(2·g·h) → 3.0 m için 7.67 m/s (motorda sürükleme yok,
  // parçacık tam v²/2g'ye çıkar; katalog yüksekliği ekranda birebir okunur).
  // Gövde: YATAY silindirik pompa + üst port nozul + AquaLIGHT-C halka ops.
  vario: { kenar: 168, shape: { type: 'point', angle: 0.03 },
    // ⚠ Aralık %5'e daraltıldığında (ilk deneme, kare kanıtı ajanG_sonra_v1)
    //   TÜM parçacıklar aynı tepeye aynı anda vardı: apeks katı BEYAZ BLOK oldu
    //   (fragment'taki hizKopuk sezgiseli |vy|<0.5'te albedoyu %90 beyaza çeker,
    //   üstüne additive alfa yığıldı). Gerçek kolonun da köpüklü bir tacı var
    //   ama o taç DAĞILIR. a = 0.88·b hâlâ yetmedi (151'in kısa kolonunda blok
    //   sürdü); a = 0.81·b ile ESKİ preset'in BAĞIL yayılımına dönüldü — eski
    //   kodun yanlışı yayılım değil, mutlak yükseklikti (7.6-9.4 = iki ürünün
    //   tepesi tek preset'e sıkışmış). Tepe 0.66h..h → 3 m'de ~1.0 m taç.
    //   b HÂLÂ tam katalog yüksekliğidir; okunan kolon boyu doğru kalır.
    particle: { speed: { a: 6.21, b: 7.67 }, life: { a: 1.6, b: 1.9 }, size: 0.04,
      color: '#cfe6ff', alpha: 0.055, aeration: 0.12, gerdirme: 1.2,   // 0.06 → 0.12: köpük dokusu görünür ama laminer değil (kart §8, hedef kare köpüklü beyaz)
      tepeBuyume: 1.35, dusmeBuyume: 0.75, doku: 'damla' }, yumusaklik: 0.4,   // 1.15 → 1.35 topuz + 0.6 → 0.75 geri düşen mist (kart #12)
    kopuk: { icR: 0.08, disR: 0.6, kazanc: 0.45 },
    gol: { yariCap: 1.5, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'vario',
    // Pompa ataleti (SEKTÖR ÖLÇÜMÜ): OASE Varionaut 150/240 24V-DMX künyesi
    // "0 → tam jet yüksekliği: 1 s" veriyor. Bu sürenin BÜYÜK KISMI uçuştur —
    // 3.0 m'ye çıkış sqrt(2h/g) = 0.78 s ve motorda ZATEN bedava. Geriye kalan
    // saf pompa gecikmesi ~0.22 s; üstel yaklaşımda %95 için 3τ istendiğinden
    // τ = 0.10 s. Böylece toplam 0.30 + 0.78 = 1.08 s ≈ OASE'nin 1 s'i.
    // Katalog "in the blink of an eye" ve Salih'in "geçiş anlık" tarifi de bunu
    // destekler: gecikme VAR ama kısa. [ELLE] V4.
    hizRampaSn: 0.10,
    // Pompa anma yüksekliğinin üstüne çıkamaz — .hiz kanalı 1.0'da tavan yapar.
    // (editör sürgüsü 0-1.6; eskiden 1.6 → 2.56× yükseklik veriyordu = uydurma)
    hizTavan: 1.0 },
  // --- v5 F2 arketipleri (künye §1-2; Salih backlog: perde/AIR/STAR/TORCH) ---
  // AquaAIR (1030): basınçlı hava PATLATMASI — künyede yazılı 30-40m; sahnede
  // aquajet'in ~1.6 katı kolon (kadraj). Solenoid → master step (proje.js),
  // yüksek aeration = köpük topu, tepede geniş çiçeklenme.
  // ⚠v7 AIR TURU KÖK SEBEP (2026-07-18, kare kanıtı ajanH_base.png): cihaz
  // ekranda HİÇ görünmüyordu. Sebep gerdirme DEĞİLDİ (o hipotez çürütüldü:
  // AIR'in vGer'i 3.9, yani vario/aquajet/switch'in oturduğu 7.0 TAVANINDAN
  // düşük — gerdirme AIR'i diğerlerinden AZ cezalandırıyor). Sebep SEYRELME:
  // kolon boyu h = v²/2g = 20.4 m ve koni 0.07 rad → ekranda ~58 m²'lik bir
  // alan; bütçe ise 160² = 25 600, yani vario'nun 0.5 m²'lik kolonuyla neredeyse
  // AYNI parçacık sayısı. Ölçülen parlaklık yoğunluğu vario'nun %3'ü, ekrandaki
  // en sönük görünür cihaz olan aquajet'in bile 1/3'ü; üstüne aeration 0.9
  // boyamaKazanc'ı 1'e çıkarıp taban ışığı 0.55 ile çarpıyor → görünürlük
  // eşiğinin altına düşüyor.
  // DÜZELTME sabit çarpan değil, CİHAZIN KENDİ FİZİĞİ: AquaAIR sürekli akan bir
  // jet değil, solenoidin açtığı BASINÇLI HAVA SALVOSUDUR. Sürekli emisyon
  // modeli bütçeyi 20 m'lik bir boruya yayıyordu; salvo modeli aynı bütçeyi tek
  // bir SLUG'a toplar (aşağıdaki `salvo` alanı) → hem karakter (ani açılış, kısa
  // yoğun atım, reload sessizliği) hem de yoğunluk aynı anda düzelir.
  // ⛔ZARFA BAĞLANMADI (zarfı VAR: 35 m → 26.2 m/s, bugünkü 20.0'ın 1.31 katı).
  // Sebep: bu presetin hızı yalnız yükseklik değil GÖRÜNÜRLÜK kalibrasyonudur —
  // yukarıdaki seyrelme analizinde bütçe/kolon-alanı dengesi 20 m'lik kolona
  // göre kuruldu ve cihaz bir kez zaten ekrandan kaybolmuştu. 35 m'ye çıkarmak
  // aynı bütçeyi %75 daha uzun boruya yayar; salvo ömrü de (5.24 s) reload 6.0'a
  // yaklaşır. Kendi görünürlük turunu ister, bu turda körlemesine bağlanmaz.
  air: { kenar: 320, shape: { type: 'point', angle: 0.07 },
    // Solenoid: atım penceresi + reload. Karakter kartı "reload ≥6 s" diyor.
    // Ömür (≤4.0 s) reload'dan KISA olmalı — yoksa bütçenin bir kısmı hâlâ
    // uçarken pencere açılır ve slug bölünür; 6 s'te tüm parçacıklar ölmüş
    // (park edilmiş) olur, pencere açılınca HEPSİ aynı karede doğar = slug.
    salvo: { atimSn: 0.5, reloadSn: 6.0 },
    particle: { speed: { a: 17.0, b: 20.0 }, life: { a: 3.4, b: 4.0 }, size: 0.07,
      color: '#eef6ff', alpha: 0.25, aeration: 0.9, gerdirme: 0.35, mist: 0.12,
      tepeBuyume: 2.2, dusmeBuyume: 1.0, doku: 'salkim' }, yumusaklik: 0.55,
    kopuk: { icR: 0.22, disR: 1.7, kazanc: 0.8 },
    gol: { yariCap: 2.4, kazanc: 0.6, renk: '#bfe8ff' }, govdeTip: 'air' },
  // AquaSTAR (1020) — karakter kartı DÜZELTMESİ: yıldız SU deseni YOK; tek ince
  // dik kolon (~1-2m), yarı-berrak, tepe hafif tüylü. "Star" adı nozul çevresi
  // ENTEGRE LED HALKASINDAN gelir (gövdede). Sıralı RUN efekti cihazı.
  // Referans AquaSTAR (kart 1-2 m → tipik 1.5); aile üyesi AquaCROWN I (9 m taç)
  // künyeden ayrışır.
  star: { kenar: 128, shape: { type: 'point', angle: 0.03 },
    particle: { ...zarfParca('AquaSTAR', { yayilim: 0.806, omurPay: 1.028, omurYayilim: 0.769 }), size: 0.035,
      color: '#cfe9ff', alpha: 0.07, aeration: 0.2, gerdirme: 1.2,
      tepeBuyume: 1.5, dusmeBuyume: 0.6, doku: 'damla' }, yumusaklik: 0.4,
    kopuk: { icR: 0.06, disR: 0.45, kazanc: 0.45 },
    gol: { yariCap: 1.2, kazanc: 0.6, renk: '#a8dcff' }, govdeTip: 'star' },
  // AquaPOP JET (1090) — v7 POP turu. Tüm sayılar popTuret()'ten gelir; burada
  // elle yazılmış tek bir fizik sabiti YOK (yukarıdaki blok ①-⑥).
  pop: popTuret(POP_REF),
  // AquaTORCH (1125) — karakter kartı DÜZELTMESİ: alev nozuldan çıkmaz, DİK SU
  // JETİNİN (maks 2.5m) TEPESİNDE dans eder. proje.js 'torch' cihazını iki
  // sistemden kurar: torchsu (vario dokulu jet) + torchalev (kaynakY=jet tepesi).
  // ⛔ZARFA BAĞLANMADI (zarfı VAR: 1.75 m → 5.86 m/s, bugünkü 7.0'ın altı).
  // Sebep: aşağıdaki torchalev'in `kaynakY: 2.55` sabiti bu jetin apeksine ELLE
  // oturtulmuş. Yalnız suyu bağlarsak alev 0.8 m boşlukta asılı kalır — iki
  // sistem birlikte türetilmeli (kaynakY = hizdanTepe(v) + pay). Ayrı ve küçük
  // bir tur; yarım bağlamak görünür bir regresyon olurdu.
  // v7 TORCH turu (Salih "alev beyaz"): teshis = beyaz alev ASLINDA su apeksi.
  // ⚠aeration 0.15->0.06, alpha 0.075->0.055: torchsu apeksi kolonun en beyaz
  // yeriydi (uBoyamaKazanc + kopuk apekste doyuyordu); apeks parlakligi B~190'dan
  // ~150'ye dustu, beyaz sutun cok azaldi. torchsu YALNIZ torch'ta kullanilir,
  // baska cihaza sizmaz.
  torchsu: { kenar: 128, shape: { type: 'point', angle: 0.03 },
    particle: { speed: { a: 6.4, b: 7.0 }, life: { a: 1.2, b: 1.5 }, size: 0.04,
      color: '#cfe6ff', alpha: 0.055, aeration: 0.06, gerdirme: 1.2,
      tepeBuyume: 1.1, dusmeBuyume: 0.6, doku: 'damla' }, yumusaklik: 0.4,
    kopuk: { icR: 0.06, disR: 0.45, kazanc: 0.45 },
    gol: { yariCap: 1.1, kazanc: 0.5, renk: '#9fd8ff' }, govdeTip: 'torch' },
  // ⚠kopuklenme:false — ALEVİN BEYAZ ÇIKMASININ KÖK SEBEBİ buydu. Fragment'ta
  // "yavaş hareket eden parçacık = köpük" sezgiseli (hizKopuk) var: |vy|<0.5
  // olan her parçacık albedo'yu %90 BEYAZA çekiyor. Bu su için doğru (jet tepesi
  // gerçekten köpürür) ama alev TANIMI GEREĞİ yavaştır (doğum hızı 1.6-2.6, 0.16 s
  // içinde vy=0) → ömrünün neredeyse tamamında kopuk≈1, yani #ff8b2e turuncusu
  // beyaza boyanıyordu. Master'dan ve .beyaz kanalından bağımsız olmasının
  // sebebi de bu: hizKopuk ikisini de görmez. Alev su değildir, köpürmez.
  // Kanıt: su kapalı + hizKopuk kaldırılmış karede alev tam doygun çıkıyor.
  torchalev: { kenar: 64, shape: { type: 'disc', radius: 0.12, angle: 0.14 },
    // v7 TORCH turu: su apeksi 7.0^2/19.62 = 2.50 m. Alev 2.55'te apeksin TAM
    // icindeydi, suyun beyaz tepesinde kayboluyordu. 2.6'ya (apeksin hemen ustune)
    // alindi + alfa 0.035->0.18: karakter karti "jetin TEPESINDE dans eder". Alev
    // mekanizmasi dogru calisir (dusuk kaynakY'de tam doygun turuncu uretir); apeks
    // hizasinda ise su-apeks parlakligi + vitrin kamerasinin tepe kirpmasi turuncuyu
    // maskeler — o yuzden esas cozum torchsu apeksini KISMAK oldu (yukari bak).
    kaynakY: 2.6, isikSonum: false, kopuklenme: false,   // alev kendi ışığıdır — su sönümü de köpüğü de uygulanmaz
    particle: { speed: { a: 1.6, b: 2.6 }, life: { a: 0.28, b: 0.42 }, size: 0.07,
      color: '#ff8b2e', alpha: 0.18, aeration: 0.0, gerdirme: 0.4, mist: 0.0,
      tepeBuyume: 1.9, dusmeBuyume: 1.1, doku: 'salkim' }, yumusaklik: 0.5,
    kopuk: { icR: 0.05, disR: 0.3, kazanc: 0.0 },
    gol: { yariCap: 1.0, kazanc: 0.4, renk: '#ffb066' }, govdeTip: 'bos' },
  // WATER CURTAIN (1270/1275/1120) — karakter kartı DÜZELTMESİ: ÜÇÜ DE yukarıdan
  // AŞAĞI dökülür (ray/kolektör yüksekte, Ø2mm pirinç nozullar, boncuk iplikleri).
  // Çizgi kaynak kaynakY'de doğar, serbest düşüşle iner (yon:'asagi'); ince
  // berrak iplikler = damla doku + dar koni + düşük başlangıç hızı.
  // ⛔ZARFA BAĞLANMADI: montaj 'duvar_perde' → suZarfi bilerek hizMs = 0 döner
  // (perde atmaz, DÖKÜLÜR). Buradaki 0.3-0.8 balistik çıkış hızı değil, ray
  // ağzındaki damlama hızıdır; zarftan okunsa perde donardı. Perdenin ürün-bazlı
  // farkı zaten perdePresetTuret'te (nozul sayısı/çap) türüyor.
  perde: { kenar: 160, shape: { type: 'line', length: 2.6, angle: 0.015 },
    kaynakY: 2.5, yon: 'asagi',
    particle: { speed: { a: 0.3, b: 0.8 }, life: { a: 0.75, b: 0.9 }, size: 0.028,
      color: '#d8ecff', alpha: 0.08, aeration: 0.08, gerdirme: 1.6, mist: 0.03,
      tepeBuyume: 0.9, dusmeBuyume: 1.0, doku: 'damla' }, yumusaklik: 0.35,
    kopuk: { icR: 0.05, disR: 0.4, kazanc: 0.35 },
    gol: { yariCap: 1.5, kazanc: 0.5, renk: '#a8dcff' }, govdeTip: 'perde' }
};

// v7 ZARF turu: künye (ÜRÜN ADI) → preset. Bir arketibi paylaşan ürünler
// ekranda artık ayrışır: AquaJET I/II/III 15/25/40 m, DryDECK'in VARIO/SWITCH
// varyantları, ROBO ↔ ROBO-ROLL ↔ HYDRA. Motorda "II şu kadar hızlı" diye elle
// yazılmış tek bir sabit YOK — yeni ürün eklemek yalnız zarf tablosu satırı ister.
export function zarfPresetTuret(tur, temel, kunye) {
  if (!ZARF_ARKETIPLERI.has(tur)) return temel;
  const z = kunye?.ad ? urunZarfi(kunye.ad) : null;
  // Künyesiz çağrı / zarfı olmayan ürün → AİLE REFERANSI (uydurma sabit değil).
  if (!z || !(z.su.hizMs > 0)) return temel;
  const p = temel.particle;
  const olcek = z.su.hizMs / p.speed.b;
  if (!(olcek > 0) || Math.abs(olcek - 1) < 1e-9) return temel;   // referans ürün = özdeşlik
  return { ...temel,
    // Bütçe hızla LİNEER: kolon boyu h = v²/2g, koni açılımı boya orantılı →
    // aydınlanan alan ∝ v², parçacık yoğunluğunu sabit tutmak için kenar ∝ v.
    // (AquaAIR dersi: bütçe uzun boruya yayılınca cihaz ekrandan KAYBOLUYOR.)
    // Tavan 320 = motorun bugünkü en büyük bütçesi (air), taban 48 = suEkle'nin
    // seyreltme tabanı; ikisi de yeni sayı değil.
    kenar: Math.min(320, Math.max(48, Math.round(temel.kenar * olcek))),
    particle: { ...p,
      speed: { a: p.speed.a * olcek, b: p.speed.b * olcek },
      // Ömür de ölçeklenmeli: uçuş süresi 2v/g ile lineer, yoksa uzun kolonun
      // tepesi ekranda KESİLİR (varioPresetTuret ① ile aynı gerekçe).
      life: { a: p.life.a * olcek, b: p.life.b * olcek } } };
}

// v7 CIHAZ turu: AİLE-İÇİ KARAKTER AYRIMI. ROBO / ROBO-ROLL / HYDRA ÜÇÜ DE 'robo'
// arketipini, PULSE 'swing'i paylaşıyor. zarfPresetTuret bunları yalnız HIZLA
// ayırıyordu (kolon boyu) — DOKU/KÖPÜK/YELPAZE karakteri özdeşti, Salih "hepsi
// birbirine benziyor" dedi. Bu katman ürün ADINDAN karakteri türetir
// (varioPresetTuret/perdePresetTuret ile aynı desen; motorda ürün sabiti yok).
// Kaynak: docs/cihaz-karakter-kartlari.md SERVO AİLESİ bölümü.
export function cihazKarakter(temel, kunye) {
  switch (kunye?.ad) {
    case 'AquaHYDRA':      return hydraKarakter(temel);
    case 'AquaROBO-ROLL':  return rollKarakter(temel);
    case 'AquaPULSE':      return pulseKarakter(temel);
    default:               return temel;
  }
}
// AquaHYDRA — kart: "KALINCA, DOKULU/YARI-KÖPÜKLÜ tek sütun (içi ışıkla dolu
// renkli yılan)", aeration ~0.5. ROBO'nun İNCE BERRAK jetinin tersi: iri
// parçacık (kalın kolon), yarı-köpüklü salkım dokusu, ağır (az gerdirme),
// geniş köpüklü taban. Tilt zaten 12° (kart 15° tavanına uyar).
function hydraKarakter(temel) {
  const p = temel.particle;
  return { ...temel,
    particle: { ...p,
      size: p.size * 1.8,             // KALIN kolon (robo 0.04 → 0.072)
      aeration: 0.5,                  // kart: yarı-köpüklü ~0.5 (robo 0.18 berrak)
      gerdirme: 0.7,                  // ağır/az gerilmiş (robo 1.3 iplik gibiydi)
      alpha: p.alpha * 1.3,           // çekirdek dolgun (kalın kolon opaklığı)
      tepeBuyume: 1.5, dusmeBuyume: 0.85,
      doku: 'salkim' },               // köpüklü salkım (robo 'damla' idi)
    kopuk: { icR: 0.12, disR: 0.95, kazanc: 0.75 },       // geniş köpüklü taban
    gol: { ...temel.gol, yariCap: temel.gol.yariCap * 1.4, kazanc: 0.6 } };
}
// AquaROBO-ROLL — kart: FAN (geniş yelpaze perdesi) + HEPTA (7 ince paralel jet
// tarağı). ROBO'nun TEK dar jetinden farkı: GENİŞ koni = çok sayıda ince berrak
// iplik yelpazesi. (3. eksen roll + gerçek 7-parmak tarak = sonraki dalga.)
function rollKarakter(temel) {
  const p = temel.particle;
  return { ...temel,
    shape: { ...temel.shape, angle: 0.28 },   // dar jet (0.025) → geniş iplik yelpazesi
    particle: { ...p,
      aeration: 0.1, gerdirme: 1.5,           // berrak, iplik gibi (robo'dan daha ince)
      alpha: p.alpha * 1.15 } };              // yelpaze bütçeyi yayar → görünürlük telafisi
}
// AquaPULSE — kart: "JET YOK — su yüzeyinde EŞMERKEZLİ DALGA HALKALARI üretir;
// sakin, köpüksüz, meditatif". Balistik jet MODELİ TERK EDİLİR: su yalnız birkaç
// cm yükselir (görünür kolon kesildi), asıl efekt carpmaNoktalari'nın nozul
// üstünde PERİYODİK ripple kaynağı olarak beslediği halka dalgalardır (pulseRipple).
// Tam ripple-cihazı ayrı mimari ister; bu, jet olmaktan çıkarıp ripple'a bağlar.
function pulseKarakter(temel) {
  const p = temel.particle;
  return { ...temel,
    pulseRipple: true, pulsePeriyot: 1.3,     // carpmaNoktalari eşmerkezli halka kaynağı
    particle: { ...p,
      speed: { a: 0.3, b: 0.7 },              // JET DEĞİL: su ~2-3 cm çıkıp geri döner
      life: { a: 0.5, b: 0.8 },
      size: p.size * 0.9, alpha: p.alpha * 0.35,
      aeration: 0.1, gerdirme: 0.6, doku: 'damla' } };
}

// v7 PERDE turu: künye → preset. CLASSIC/LACE/DIGITAL ekranda BİREBİR AYNI
// görünüyordu; bu fonksiyon farkı katalogdan TÜRETİR (motorda perde sabiti yok —
// yeni perde ürünü eklemek kod değişikliği istemez, spec §T-E).
// Referans CLASSIC (30 nozul, Ø2.0 mm) = temel preset'in aynısı çıkar.
const PERDE_REF = { nozul: 30, capMm: 2.0 };
export function perdePresetTuret(temel, kunye) {
  const s = kunye?.perde;
  if (!s) return temel;                          // künyesiz/eski .aqshow → eski davranış
  const p = temel.particle;
  // Damla kalınlığı çapla doğru orantılı (Ø1.2 dantel ipliği, Ø2.5 digital boncuğu).
  const boyut = p.size * (s.capMm / PERDE_REF.capMm);
  // Sıklık arttıkça perde doluluğu artar; kare-kök çünkü alfa additive birikir —
  // lineer ölçekte 48 nozullu dantel bembeyaz yanıyordu (ekran kıyası).
  const yogunluk = Math.sqrt((s.nozul || PERDE_REF.nozul) / PERDE_REF.nozul);
  return { ...temel,
    particle: { ...p, size: boyut, alpha: p.alpha * yogunluk,
      // Düşerken damla İRİLEŞİR: ray dibinde iplik, aşağıda boncuk — perdenin
      // "buzlu cam" gibi donuk okunmasının sebebi bu kopmanın hiç olmamasıydı.
      dusmeBuyume: 1.5 },
    perdeSutun: s.nozul || 0, perdeKesinti: s.kesinti || 0, perdeKesintiHz: s.kesintiHz || 0 };
}

// v7 TUR 2 (KART v2 AquaVARIO): künye → preset. VARIO 151 ve 241 ekranda BİREBİR
// AYNI görünüyordu (perde ve ışıkla aynı hata). Fark burada TÜRETİLİR; motorda
// "241 şu kadar hızlı" diye elle yazılmış sabit YOK (spec §T-E) — yeni pompa
// modeli eklemek yalnız katalog satırı ister.
// Referans = AquaVARIO 151 @ Ø12: katalog 3.0 m, 150 W, ops AquaLIGHT-C 22 W.
// Referansla çağrıldığında temel preset AYNEN çıkar (özdeşlik kontrolü: test).
const VARIO_REF = { yukseklikM: 3.0, nozulMm: 12, isikW: 22 };
// Kolonun kırılmış (pütürlü) payı: ilk 100·d berrak kalır (bkz. ⑤). Ø12 → 1.2 m.
function kirilmaPayi(h, capMm) {
  return Math.max(0.05, 1 - (0.1 * capMm) / Math.max(0.01, h));
}
export function varioPresetTuret(temel, kunye) {
  const s = kunye?.pompa;
  if (!s) return temel;                          // künyesiz/eski .aqshow → eski davranış
  const p = temel.particle;
  const h = s.yukseklikM || VARIO_REF.yukseklikM;
  const d = s.nozulMm || VARIO_REF.nozulMm;
  // ① Yükseklik → hız: Torricelli h = v²/2g, yani hız yüksekliğin KAREKÖKÜ ile
  //    ölçeklenir. 4.5/3.0 = 1.5× yükseklik ama yalnız 1.22× hız — 241'in
  //    "%60 daha güçlü" olmasının kolon boyuna yansıması budur, lineer değil.
  const hizOlcek = Math.sqrt(h / VARIO_REF.yukseklikM);
  // ② Nozul çapı → kolon kalınlığı (damla boyu doğrudan çapla).
  const capOlcek = d / VARIO_REF.nozulMm;
  // ③ Debi Q = A·v ∝ d²·v — parçacık bütçesi ve çarpma köpüğü buradan.
  const debiOlcek = capOlcek * capOlcek * hizOlcek;
  // ④ Ops. AquaLIGHT-C gücü (151→22 W, 241→72 W ✅katalog): ışık gölü yarıçapı
  //    akı ile lineer değil, aydınlatılan alan ile → küp kökü mertebesinde.
  const isikOlcek = Math.cbrt((s.isikW || VARIO_REF.isikW) / VARIO_REF.isikW);
  return { ...temel,
    kenar: Math.max(48, Math.round(temel.kenar * Math.sqrt(debiOlcek))),
    particle: { ...p,
      speed: { a: p.speed.a * hizOlcek, b: p.speed.b * hizOlcek },
      // Uçuş süresi hızla lineer (t_toplam = 2v/g) — ömür ölçeklenmezse uzun
      // kolonun tepesi ekranda kesilirdi.
      life: { a: p.life.a * hizOlcek, b: p.life.b * hizOlcek },
      size: p.size * capOlcek,
      // ⑤ Pütürlenme: türbülanslı serbest jet kırılması nozul çapının ~100 katı
      //    mesafede BAŞLAR (ASCE J.Hydraul.Eng. 142(10), 2016). Ø12 → 1.2 m.
      //    Yani kolonun ilk 1.2 m'si berrak, üstü pütürlü — 151'de kolonun
      //    %60'ı, 241'de %73'ü kırılmış olur. aeration/tepe açılımı bu PAYDAN
      //    türer (uydurma katsayı değil; oran 1.22).
      aeration: Math.min(0.6, p.aeration * kirilmaPayi(h, d) / kirilmaPayi(VARIO_REF.yukseklikM, VARIO_REF.nozulMm)),
      tepeBuyume: p.tepeBuyume * kirilmaPayi(h, d) / kirilmaPayi(VARIO_REF.yukseklikM, VARIO_REF.nozulMm) },
    kopuk: { ...temel.kopuk,
      disR: temel.kopuk.disR * Math.sqrt(debiOlcek),
      kazanc: Math.min(1, temel.kopuk.kazanc * Math.sqrt(debiOlcek)) },
    gol: { ...temel.gol,
      yariCap: temel.gol.yariCap * isikOlcek,
      kazanc: Math.min(1, temel.gol.kazanc * isikOlcek) },
    // Ağır/uzun su sütunu daha yavaş kurulur [TÜRETİM] (KART v2 [ELLE] V4).
    hizRampaSn: (temel.hizRampaSn ?? 0) * hizOlcek,
    // Gövde ölçüleri künyeden (L×M×H, m) — 151: 328×150×200, 241: 328×147×143.
    varioBoy: s.boyM || null };
}

// v7 DRYDECK cila turu (KART v2 §3 "⭐Kontrol mimarisi — ailenin ASIL ayrımı burada"):
// DryDECK TEK karakter DEĞİL, aynı 'drydeck' arketipini paylaşan İKİ FARKLI kontrol
// zinciri. Künye kanıtı (docs/cihaz-karti-v2-drydeck.md §1/§3, ham alıntı
// docs/2026-07-19-drydeck-kaynak-taramasi.md §A1/§A3):
//   • AquaVARIO DryDECK (flush): "Each unit's water height is precisely managed
//     by its own individual 24VDC sub-pump" → POMPA-KONTROLLÜ, VARIO gibi üstel
//     rampayla açılır/kapanır. τ DryDECK'in kendi künyesinde YOK (kart §9 "Kaynak
//     BULUNAMADI" listesi) — VARIO kartı §6'nın 0.10 s'si AİLE REFERANSI olarak
//     ödünç alınır (aynı 24VDC sub-pump sınıfı), uydurma sabit değil.
//   • AquaSWITCH DryDECK / T-SWITCH: katalog.js'in KENDİ notu "tek-solenoid" —
//     bu SWITCH'in aniKesme mekanizmasıyla (yukarıda, AIR'in salvo "reload
//     sessizliği" deseninden türetildi) BİREBİR AYNI şey: kesim anında taban
//     temiz, o anda HAVADA olan su kendi ömrünü/balistiğini tamamlar (kart
//     D7/D10 varsayılanı: "pompa=boy, solenoid=kapı" / "kopup uçuyor").
// ŞU AN BİZDE (düzeltmeden ÖNCE): PRESETLER.drydeck TEK preset, ne rampa ne kesme
// taşıyordu — kolon sürekli akıyordu, hiz kanalı anlık zıplıyordu (kart §8 tablosu:
// "en büyük sapma yükseklik değil, KONTROL"). Ayrım ürün ADINDAN okunur —
// varioPresetTuret/zarfParca'nın aynı deseni, motorda elle "hangi DryDECK
// hangi davranışı alır" diye sabit YOK.
// Faz 2 Tur 2/4: ÜST PLAKA (kare 300×300×30 "Premium" ↔ yuvarlak Ø280×5) üçüncü
// parametreyle GELİR, burada aranmaz — bu fonksiyon SAF kalmalı (test gövdesini
// `new Function` ile çalıştırıyor: içeride modül import'u kullanılamaz).
// Çağıran (suEkle) zarf tablosundan çözer; null → govde.js eski çizimi korur.
export function drydeckPresetTuret(temel, kunye, ustPlaka = null) {
  if (!kunye?.ad) return temel;                      // künyesiz/eski .aqshow → eski davranış
  // Faz 2 (K4): karar önce KÜNYE ALANINDAN (`kontrol`) okunur — ürün adında
  // 'SWITCH' geçmesi bir tesadüftü, kontrol karakteri artık veri. Ad kontrolü
  // yedek kalıyor (künyesi güncellenmemiş kopyalar bozulmasın).
  if (kunye.kontrol === 'solenoid' || (!kunye.kontrol && kunye.ad.includes('SWITCH'))) {
    // T-SWITCH / SWITCH D.D Bucket: tek solenoid, valf keser (kart D7/D10).
    return { ...temel, ustPlaka, aniKesme: true };
  }
  // AquaVARIO DryDECK (flush) / Bucket: bireysel sub-pompa, üstel rampayla açılır.
  return { ...temel, ustPlaka, hizRampaSn: temel.hizRampaSn || 0.10 };
}

// v3: ışık-dizisi uniformları kalktı — parçacık rengi tamamen per-jet uRenk'ten
// (412C halka su kütlesini içten boyar); uTabanIsik artık genel kazanç (eski
// 0.30 + vIsik katkısının yerini tek başına tutar, ekran kıyasıyla ayarlandı).
export const ortakUniformlar = {
  uDerinlikDoku: { value: null }, uCozunurluk: { value: new THREE.Vector2() },
  // ⚠ ana.js'teki PerspectiveCamera near/far ile AYNI olmalı — soft-fade derinlik
  // linearizasyonu bunları kullanıyor. v7 G13'te kamera 0.1/100 → 0.3/400 oldu,
  // burası güncellenmezse yumuşak geçiş yanlış derinlikte hesaplanır.
  uKameraYakin: { value: 0.3 }, uKameraUzak: { value: 400 },
  uPixelYariCap: { value: 1 },
  // v7 IŞIK turu: 1.0 idi. Gece çeşmesinde su KENDİ BAŞINA parlamaz — karanlıkta
  // siyahtır, yalnız 412C'nin vurduğu yerde görünür. Beyaz taban 1.0, renkli
  // ışık katkısıyla aynı mertebede olduğu için her şeyi yıkıyor ve kolonlar
  // gri-beyaz kalıyordu (Salih'in 1. şikâyetinin kök sebebi). Taban artık zayıf
  // ortam (ay + şehir ışıması) mertebesinde.
  uTabanIsik: { value: 0.38 }
};
export function katmanUniformlari(ozel) { return { ...ortakUniformlar, ...ozel }; }

export const SOFT_FADE_GLSL = /* glsl */`
  #include <packing>
  uniform sampler2D uDerinlikDoku;
  uniform vec2  uCozunurluk;
  uniform float uKameraYakin;
  uniform float uKameraUzak;
  uniform float uYumusaklik;
  float softFade(float fragViewZ) {
    vec2 uv = gl_FragCoord.xy / uCozunurluk;
    float sahneDerinlik = texture2D(uDerinlikDoku, uv).x;
    float sahneViewZ = perspectiveDepthToViewZ(sahneDerinlik, uKameraYakin, uKameraUzak);
    return smoothstep(0.0, uYumusaklik, fragViewZ - sahneViewZ);
  }
`;

// --- GPU fizik çekirdeği (Ders 10 BLOK 4) ---
const GPU_ORTAK_GLSL = /* glsl */`
  float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float g_seed;
  float rnd(){ g_seed += 1.0; return hash11(g_seed); }
  void cerceve(vec3 n, out vec3 t1, out vec3 t2){
    vec3 up = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    t1 = normalize(cross(up, n));
    t2 = cross(n, t1);
  }
  vec3 koniYon(vec3 eksen, float aciMax){
    vec3 t1, t2; cerceve(eksen, t1, t2);
    float az = rnd() * 6.2831853;
    float po = aciMax * sqrt(rnd());
    return normalize(eksen * cos(po) + (t1 * cos(az) + t2 * sin(az)) * sin(po));
  }
  // v6 F2 mist: parçacık kimliği uv'den DETERMİNİSTİK türetilir — iki compute
  // shader'ı ve render vertex'i (aRef==uv) aynı kararı verir, doku kanalı gerekmez.
  float mistMi(vec2 uv, float oran){
    return step(fract(sin(dot(uv, vec2(91.7, 33.1))) * 43758.5453), oran);
  }
  // v7 AIR: solenoid salvosu. Atım penceresi DIŞINDA doğum yasaktır — parçacık
  // sahnenin altına park edilir ve her karede yeniden dener (perde'nin "kapalı
  // sütun" dalındaki park hilesinin aynısı; softFade zemin derinliğinin
  // arkasındaki parçacığı zaten siler, ekranda iz bırakmaz).
  // Karar SALT ZAMAN fonksiyonudur → konum ve hız shader'ları aynı uTime ile
  // BİREBİR aynı sonucu verir, dosya başındaki ölüm-kararı eşliği bozulmaz.
  // uSalvoAtim = 0 olan TÜM cihazlarda (jet/geyser/vario/laminer/perde...) dal
  // ilk satırda false döner = no-op.
  bool salvoKapali(float t, float t0, float atim, float periyot){
    if (atim <= 0.0) return false;
    float f = t - t0;
    if (f < 0.0) return true;                 // master hiç açılmadı
    return mod(f, periyot) > atim;
  }
  // ucuz divergence-düşük savrulma alanı (sine örgüsü — desen: curl noise'un
  // amacı yönsüz kaotik ama AKIŞKAN sürüklenme; tam simplex curl'e gerek yok)
  vec3 savrulma(vec3 p, float t){
    return vec3(
      sin(p.y * 1.7 + t * 0.8) + sin(p.z * 2.3 + t * 0.5),
      (sin(p.z * 1.9 + t * 0.7) + sin(p.x * 2.1 + t * 0.6)) * 0.35,
      sin(p.x * 1.5 + t * 0.9) + sin(p.y * 2.7 + t * 0.4));
  }
  // ORTAK fizik adımı — konum ve hız shader'ı BİREBİR bunu uygular (ölüm kararı
  // eşliği bozulmasın): mist yüzer (yerçekimi %12), drag'le durulur, savrulur.
  vec3 fizikAdim(vec3 vel, vec3 pos, float mist, float dt, float t, float salinim){
    vel.y -= 9.81 * mix(1.0, 0.12, mist) * dt;
    vel *= mix(1.0, exp(-1.6 * dt), mist);
    vel += savrulma(pos, t) * (0.35 * mist) * dt;
    // v7 PERDE (d): sütunlara geçince iplikler PİKSEL-DÜZ iniyordu — göz bunu
    // akan su değil TEL ÖRGÜ olarak okuyor.
    // ⚠İlk denemem savrulma()'yı kullanmaktı ve EKRANDA HİÇ FARK ETMEDİ. Sebep:
    // savrulma().x yalnız p.y ve p.z'ye bağlı, x'e DEĞİL — perde x ekseninde
    // yattığı için aynı yükseklikteki TÜM iplikler birebir aynı miktarda
    // kayıyordu, yani perde tek parça levha gibi salınıp yerinde duruyordu.
    // Ayrışma için faz İPLİĞE (pos.x) bağlanmalı: 31 rad/m'de komşu iplikler
    // (~87 mm) ~2.7 rad ayrışır. pos.y ve t zıt işaretli girince dalga iplik
    // boyunca AŞAĞI yürür — akış hissini veren asıl ipucu bu.
    // Alan tamamen konum+zaman fonksiyonu (rastgele değil) → konum ve hız
    // shader'ları aynı sonucu üretir, ölüm kararı eşliği (dosya başındaki
    // sözleşme) bozulmaz. salinim=0 olan tüm cihazlarda terim no-op.
    float iplik = pos.x * 31.0;
    vel.x += sin(iplik + pos.y * 3.0 - t * 4.0) * salinim * 1.6 * dt;
    vel.z += cos(iplik * 0.7 + pos.y * 2.4 - t * 3.3) * salinim * dt;
    return vel;
  }
`;

const konumShader = /* glsl */`
  uniform float uDt; uniform float uTime;
  uniform vec3 uNozulPos; uniform vec3 uNozulYon; uniform float uDiskR;
  uniform float uCizgiBoy;  // v5 F2 perde: >0 ise doğum ÇİZGİ kaynaklı (metre)
  uniform float uYonAci;    // çizginin azimutu (rad) — dondur hem bunu hem hız
                            // shader'ının uYonAci'sini günceller (perde döner)
  uniform float uSutunSayi; // v7 perde: >0 ise doğum nozul SÜTUNUNA yuvarlanır (künye nozul adedi)
  uniform float uKesintiOran; // v7 DIGITAL: o an kapalı sütun oranı (0 = hepsi açık)
  uniform float uKesintiHz;   // v7 DIGITAL: solenoid adım hızı (Hz)
  uniform float uMistOran;  // v6 F2: mist parçacık payı (0-0.12)
  uniform float uSalinim;   // v7 perde: yatay salınım şiddeti (0 = diğer tüm cihazlar)
  uniform float uSalvoAtim; // v7 AIR: solenoid atım süresi (0 = salvo yok)
  uniform float uSalvoPeriyot;
  uniform float uSalvoT0;   // master'ın 0→1 kenarı (salvo fazının sıfırı)
  uniform float uKapali;    // KART v2 SWITCH #38: 1 = doğum yasak (setMaster sürer,
                            // aniKesme=false tüm cihazlarda 0 sabit kalır — no-op)
  ${GPU_ORTAK_GLSL}
  void main(){
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 P = texture2D(texturePosition, uv);
    vec4 V = texture2D(textureVelocity, uv);
    vec3 pos = P.xyz;  float yas  = P.w;
    vec3 vel = V.xyz;  float omur = V.w;
    float mist = mistMi(uv, uMistOran);
    vel = fizikAdim(vel, pos, mist, uDt, uTime, uSalinim);
    pos += vel * uDt;
    yas += uDt;
    // v6 F5: omur<0 = SPLASH modu (death→splash state) — iki shader aynı geçiş
    // kararını önceki-kare dokularından türetir, ekstra kanal gerekmez.
    if (yas >= abs(omur) || pos.y < 0.0) {
      bool splashOl = pos.y < 0.0 && omur > 0.0 && vel.y < -1.5 && mist < 0.5;
      if (splashOl) {
        pos.y = 0.02;              // çarpma noktasında kal, x/z korunur
      } else {
        g_seed = dot(uv, vec2(12.9898, 78.233)) + uTime * 7.0 + 3.7;
        if (salvoKapali(uTime, uSalvoT0, uSalvoAtim, uSalvoPeriyot) || uKapali > 0.5) {
          // reload sessizliği (AIR) VEYA KART #38 kapanma kapısı (SWITCH, uKapali):
          // doğum yok, park et (pos.y<0 kaldığı için sonraki karede yeniden dener —
          // pencere/valf açılınca TÜM bütçe aynı karede doğar). uKapali=1 iken
          // HAVADA olan (bu satıra hiç uğramamış, henüz ölmemiş) parçacıklara
          // dokunulmaz — onlar kendi yas/omur döngüsünü normalce sürdürür.
          pos = uNozulPos - vec3(0.0, 60.0, 0.0);
        } else if (uCizgiBoy > 0.0) {
          // perde: nozul dizisi tek çizgi kaynağa yayılır (30 ayrı emitter değil —
          // parçacık bütçesi tek sistemde kalır).
          // v7 PERDE: doğum yeri SÜREKLİ rastgele idi → perde bir "cam levha"ya
          // dönüşüyordu (Salih: buzlu cam/tel örgü). Gerçek ürün delik dizisidir:
          // konum nozul sütununa YUVARLANIR, aralar boş kalır → iplik iplik akar.
          float u = rnd();
          if (uSutunSayi > 0.0) {
            float faz = floor(uTime * max(uKesintiHz, 0.0001));   // solenoid adım fazı
            float sec = -1.0;
            // DIGITAL: sütunların bir kısmı o an KAPALI (DMX→solenoid). Kapalı
            // sütuna düşen parçacık yeniden zar atar — bütçe açık sütunlara
            // kayar, yani kapanan sütun kurur, açık sütun aynı debiyi taşır.
            for (int d = 0; d < 8; d++) {
              float k = floor(u * uSutunSayi);
              if (hash11(k * 7.13 + faz * 3.77) >= uKesintiOran) { sec = (k + 0.5) / uSutunSayi; break; }
              u = rnd();
            }
            u = sec;
          }
          // 8 denemede açık sütun bulunamadı (kesinti yüksekken ~%0.2): parçacığı
          // sahnenin altına park et, sonraki karede yeniden doğsun.
          if (u < 0.0) pos = uNozulPos - vec3(0.0, 60.0, 0.0);
          else pos = uNozulPos + vec3(cos(uYonAci), 0.0, sin(uYonAci)) * (u - 0.5) * uCizgiBoy;
        } else {
          vec3 t1, t2; cerceve(normalize(uNozulYon), t1, t2);
          float az = rnd() * 6.2831853;
          float rr = uDiskR * sqrt(rnd());
          pos = uNozulPos + (t1 * cos(az) + t2 * sin(az)) * rr;
        }
      }
      yas = 0.0;
    }
    gl_FragColor = vec4(pos, yas);
  }
`;

const hizShader = /* glsl */`
  uniform float uDt; uniform float uTime;
  uniform vec3 uNozulYon; uniform float uKoniAci;
  uniform float uHizA; uniform float uHizB; uniform float uOmurA; uniform float uOmurB;
  uniform float uHizScale;
  uniform float uYelpaze;   // 0=koni (radyal), 1=yelpaze (düzlemsel açılım)
  uniform float uYonAci;    // yelpaze düzleminin azimutu (rad)
  uniform float uMistOran;  // v6 F2: mist parçacık payı
  uniform float uSalinim;   // v7 perde: yatay salınım şiddeti (0 = diğer tüm cihazlar)
  // v7 AIR: konum shader'ıyla AYNI salvo uniformları — parçacık park edildiğinde
  // hızı yeniden atanır ama parçacık zaten sahne altında olduğu için görünmez;
  // önemli olan iki shader'ın ölüm/doğum kararında ayrışmamasıdır.
  uniform float uSalvoAtim;
  uniform float uSalvoPeriyot;
  uniform float uSalvoT0;
  // v7 CIHAZ: servo supurme trail (kuyruklu yildiz). Nozul donerken su HAVADADIR;
  // parcacik atildigi andaki yonu tasir, nozul o an daha ileri bakar. Yeni dogan
  // parcacigi supurmenin GERISINE dagit (0..gecikme) → su yayi nozulun ardindan
  // gelir. gecikme = acisal hiz x ucus suresi (zarf.js servoGecikmeAcisi, step'te
  // hesaplanip uniform'a yazilir). Statik nozulda gecikme=0 → dal no-op.
  uniform float uServoGecikme;   // rad
  uniform vec3  uServoEksen;     // supurme donme ekseni (yeni yon -> eski yon)
  ${GPU_ORTAK_GLSL}
  void main(){
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 P = texture2D(texturePosition, uv);
    vec4 V = texture2D(textureVelocity, uv);
    float yas  = P.w;
    vec3 vel = V.xyz;  float omur = V.w;
    float mist = mistMi(uv, uMistOran);
    vec3 yeniVel = fizikAdim(vel, P.xyz, mist, uDt, uTime, uSalinim);
    vec3 yeniPos = P.xyz + yeniVel * uDt;
    float yeniYas = yas + uDt;
    if (yeniYas >= abs(omur) || yeniPos.y < 0.0) {
      g_seed = dot(uv, vec2(12.9898, 78.233)) + uTime * 7.0;
      // v6 F5: çarpan parçacık ölmez, İKİNCİL SIÇRAMAYA döner (omur<0 işareti;
      // konum shader'ı aynı kararı verir) — bütçeden bedava splash katmanı.
      bool splashOl = yeniPos.y < 0.0 && omur > 0.0 && yeniVel.y < -1.5 && mist < 0.5;
      if (splashOl) {
        float az = rnd() * 6.2831853;
        float sacilma = 0.5 + rnd() * 1.1;
        yeniVel = vec3(yeniVel.x * 0.25 + cos(az) * sacilma,
                       -yeniVel.y * (0.20 + rnd() * 0.22),
                       yeniVel.z * 0.25 + sin(az) * sacilma);
        omur = -(0.18 + rnd() * 0.25);
        gl_FragColor = vec4(yeniVel, omur);
        return;
      }
      vec3 yon;
      if (uYelpaze > 0.5) {
        // yelpaze: azimut SABİT (uYonAci düzlemi), açılım ±uKoniAci uniform —
        // dikeyden yana yatan düzlemsel perde (koniYon pasta dilimi keserdi).
        float a = (rnd() * 2.0 - 1.0) * uKoniAci;
        yon = normalize(vec3(cos(uYonAci) * sin(a), cos(a), sin(uYonAci) * sin(a)));
      } else {
        yon = koniYon(normalize(uNozulYon), uKoniAci);
      }
      // servo trail: yogun bas nozul yonunde (rnd^2 ile 0'a kumelenir), incelen
      // kuyruk gerideki eski yonlere kadar → kuyruklu yildiz. Rodrigues donmesi.
      if (uServoGecikme > 0.0001) {
        float trail = uServoGecikme * rnd() * rnd();
        float ct = cos(trail), st = sin(trail);
        yon = yon * ct + cross(uServoEksen, yon) * st + uServoEksen * dot(uServoEksen, yon) * (1.0 - ct);
      }
      float hiz  = (uHizA + rnd() * (uHizB - uHizA)) * uHizScale;
      omur       = uOmurA + rnd() * (uOmurB - uOmurA);
      // v6 F2: mist yavaş doğar (kolonla yükselmez, dibinde/çevresinde süzülür)
      // ve uzun yaşar — az sayıda ama BÜYÜK sprite, fog halısı payı.
      // 0.4 ilk denemede eğik jetlerde (robo yayı) mist'i arc'a uçurup izole
      // dev bloblar bıraktı → 0.18: mist nozul ÇEVRESİNDE kalır (fog halısı).
      hiz  *= mix(1.0, 0.18, mist);
      omur *= mix(1.0, 2.4, mist);
      yeniVel = yon * hiz;
    }
    gl_FragColor = vec4(yeniVel, omur);
  }
`;

const _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
function cerceveJS(n, t1, t2) {
  const up = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  t1.crossVectors(up, n).normalize();
  t2.crossVectors(n, t1);
}
function koniYonJS(eksen, aciMax, hedef) {
  cerceveJS(eksen, _t1, _t2);
  const az = Math.random() * Math.PI * 2;
  const po = aciMax * Math.sqrt(Math.random());
  hedef.copy(eksen).multiplyScalar(Math.cos(po))
    .addScaledVector(_t1, Math.cos(az) * Math.sin(po))
    .addScaledVector(_t2, Math.sin(az) * Math.sin(po));
}
// Prewarm için hizShader'daki yelpaze dalının JS eşleniği (birebir formül) —
// ilk 2 sn'de shader devralınca görsel fark kaybolur, önemli olan NaN üretmemesi.
function yelpazeYonJS(yonAci, aciMax, hedef) {
  const a = (Math.random() * 2 - 1) * aciMax;
  hedef.set(Math.cos(yonAci) * Math.sin(a), Math.cos(a), Math.sin(yonAci) * Math.sin(a)).normalize();
}

// --- GpuParcaSistemi (Ders 10 BLOK 5; konum [x,z] + renderer/scene parametre) ---
const _eksen = new THREE.Vector3(0, 1, 0);
const _v0 = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3();
const _servoAx = new THREE.Vector3();   // v7 CIHAZ: servo trail donme ekseni (gecici)

class GpuParcaSistemi {
  constructor(preset, konum, renderer, scene) {
    this.preset = preset;
    this.renderer = renderer;
    this.scene = scene;
    const W = preset.kenar, H = preset.kenar;
    this.sayi = W * H;
    const p = preset.particle;
    this.baseAlfa = p.alpha;
    this.master = 1;                             // v6 F6: ripple kaynağı gücü için izlenir
    this.ozIsik = true;                          // çıplak cihaz (spec 2026-07-21 §3): varsayılan eski davranış; proje.js doğumda sürer
    // çarpma şiddeti: etkin iniş hızı (perde kaynakY'den düşer, jet balistik döner)
    const etkiHiz = Math.max(p.speed.b, Math.sqrt(2 * G * (preset.kaynakY ?? 0)));
    this.carpmaGuc = preset.isikSonum === false ? 0 : Math.min(1, etkiHiz / 14);
    this.dogalRenk = new THREE.Color(p.color);   // T-C: cihazın doğal preset rengi (beyaz=1 hedefi)
    // v5.5 karakter kartları: kaynakY = doğum yüksekliği (perde rayı, torch alevi
    // jet tepesinde); yon 'asagi' = perde serbest düşüşü (katalog: CLASSIC/LACE/
    // DIGITAL perdelerin ÜÇÜ de yukarıdan aşağı dökülür, yukarı fışkırmaz).
    this.kaynakY = preset.kaynakY ?? 0;
    // v7 TUR 2: pompa hız komutu + ataleti (vario dışı preset'lerde 0 = kapalı)
    this.hizTavan = preset.hizTavan ?? 0;
    this.hizRampaSn = preset.hizRampaSn ?? 0;
    this.hedefHiz = 1;
    // v7 AIR salvosu (preset.salvo). Salvosuz cihazlarda atim=0 → shader dalı
    // no-op, davranış eskisiyle BİREBİR aynı.
    this.salvoAtim = preset.salvo?.atimSn ?? 0;
    this.salvoPeriyot = preset.salvo ? preset.salvo.atimSn + preset.salvo.reloadSn : 0;
    this.salvoT0 = -1e9;      // master hiç açılmadı → shader doğumu kapalı tutar
    this.sonT = 0;
    // KART v2 SWITCH #38 (2026-07-22 cila turu): aniKesme=true olan preset'te
    // (yalnız switch) kesim uAlfa'yı SIFIRLAMAZ — uKapali (yukarıdaki uniform)
    // yeni doğumu durdurur, havadaki parçacık kendi ömrünü tamamlayana kadar
    // görünür kalır. setMaster bu bayrağa bakarak dallanır.
    this.aniKesme = !!preset.aniKesme;
    const nozul = new THREE.Vector3(konum[0], this.kaynakY, konum[1]);
    const yonV = preset.yon === 'asagi' ? new THREE.Vector3(0, -1, 0) : _eksen.clone();
    const diskR = preset.shape.type === 'disc' ? preset.shape.radius : 0.0;
    const koniAci = preset.shape.angle;
    const yelpaze = preset.shape.type === 'fan';   // T-E: düzlemsel doğum dalı
    const cizgiBoy = preset.shape.type === 'line' ? preset.shape.length : 0.0; // v5 perde
    // v7 perde: künyeden gelen nozul sütunu / solenoid kesintisi (perdePresetTuret)
    const sutun = cizgiBoy > 0 ? (preset.perdeSutun ?? 0) : 0;
    const kesinti = cizgiBoy > 0 ? (preset.perdeKesinti ?? 0) : 0;
    // Salınım YALNIZ perdede: jet/geyser/vario dokunulmasın diye çizgi kaynağa bağlı.
    const salinim = cizgiBoy > 0 ? (preset.perdeSalinim ?? 0.42) : 0;
    this.gpu = new GPUComputationRenderer(W, H, renderer);
    this.gpu.setDataType(THREE.FloatType);
    const dtPos = this.gpu.createTexture();
    const dtVel = this.gpu.createTexture();
    const posD = dtPos.image.data, velD = dtVel.image.data;
    for (let i = 0; i < this.sayi; i++) {
      const hiz = p.speed.a + Math.random() * (p.speed.b - p.speed.a);
      const omur = p.life.a + Math.random() * (p.life.b - p.life.a);
      const t0 = Math.random() * omur;
      if (yelpaze) yelpazeYonJS(0, koniAci, _v0);
      else koniYonJS(yonV, koniAci, _v0);
      _v0.multiplyScalar(hiz);
      _p.copy(nozul);
      if (diskR > 0) {
        cerceveJS(yonV, _t1, _t2);
        const a = Math.random() * Math.PI * 2;
        const r = diskR * Math.sqrt(Math.random());
        _p.addScaledVector(_t1, Math.cos(a) * r).addScaledVector(_t2, Math.sin(a) * r);
      }
      if (cizgiBoy > 0) {
        // v5 perde: uYonAci=0 çizgisi +x (shader eşleniği). v7: tohumlama da
        // sütuna yuvarlanır, yoksa ilk ~1 sn boyunca perde sürekli levha görünüp
        // sonra iplikleşiyordu (t=0 karesi yalan söylerdi).
        let u0 = Math.random();
        if (sutun > 0) u0 = (Math.floor(u0 * sutun) + 0.5) / sutun;
        _p.x += (u0 - 0.5) * cizgiBoy;
      }
      _p.addScaledVector(_v0, t0); _p.y -= 0.5 * G * t0 * t0;
      _v.copy(_v0); _v.y -= G * t0;
      const k = i * 4;
      posD[k] = _p.x; posD[k + 1] = _p.y; posD[k + 2] = _p.z; posD[k + 3] = t0;
      velD[k] = _v.x; velD[k + 1] = _v.y; velD[k + 2] = _v.z; velD[k + 3] = omur;
    }
    this.posVar = this.gpu.addVariable('texturePosition', konumShader, dtPos);
    this.velVar = this.gpu.addVariable('textureVelocity', hizShader, dtVel);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
    this.gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    const mistOran = p.mist ?? 0.06;   // v6 F2: mist parçacık payı
    Object.assign(this.posVar.material.uniforms, {
      uDt: { value: 0 }, uTime: { value: 0 }, uNozulPos: { value: nozul.clone() },
      uNozulYon: { value: yonV.clone() }, uDiskR: { value: diskR },
      uCizgiBoy: { value: cizgiBoy }, uYonAci: { value: 0.0 },  // v5 perde çizgisi
      uSutunSayi: { value: sutun }, uKesintiOran: { value: kesinti },
      uKesintiHz: { value: preset.perdeKesintiHz ?? 0 },        // v7 perde sütunları
      uMistOran: { value: mistOran }, uSalinim: { value: salinim },
      uSalvoAtim: { value: this.salvoAtim }, uSalvoPeriyot: { value: this.salvoPeriyot },
      uSalvoT0: { value: this.salvoT0 },
      // KART v2 SWITCH #38: varsayılan 0 (doğum serbest) TÜM cihazlarda —
      // yalnız aniKesme=true olan preset (switch) setMaster'dan sürer.
      uKapali: { value: 0 }
    });
    Object.assign(this.velVar.material.uniforms, {
      uDt: { value: 0 }, uTime: { value: 0 }, uNozulYon: { value: yonV.clone() },
      uKoniAci: { value: koniAci }, uHizA: { value: p.speed.a }, uHizB: { value: p.speed.b },
      uOmurA: { value: p.life.a }, uOmurB: { value: p.life.b }, uHizScale: { value: 1.0 },
      uYelpaze: { value: yelpaze ? 1.0 : 0.0 }, uYonAci: { value: 0.0 },
      uMistOran: { value: mistOran }, uSalinim: { value: salinim },
      uSalvoAtim: { value: this.salvoAtim }, uSalvoPeriyot: { value: this.salvoPeriyot },
      uSalvoT0: { value: this.salvoT0 },
      uServoGecikme: { value: 0.0 }, uServoEksen: { value: new THREE.Vector3(0, 0, 1) }
    });
    // v7 CIHAZ: servo trail — bir onceki karenin nozul yonu (step'te acisal hiz).
    this.oncekiNozulYon = yonV.clone();
    // init() ripple.js'teki ortak sarmalayıcıdan geçer: GPUComputationRenderer'ın
    // closure'da GİZLİ passThruShader'ını yakalar. Yakalamazsak her cihaz
    // siliminde bir derlenmiş program sızar; naif gpu.dispose() ise paylaşımlı
    // FullScreenQuad geometrisini öldürür (ayrıntı ripple.js'te).
    const { hata, passThru } = gpuBaslat(this.gpu, renderer);
    if (hata) throw new Error('GPUComputationRenderer: ' + hata);
    this.passThru = passThru;
    const aRef = new Float32Array(this.sayi * 2);
    const aSize = new Float32Array(this.sayi);
    for (let i = 0; i < this.sayi; i++) {
      aRef[i * 2] = ((i % W) + 0.5) / W;
      aRef[i * 2 + 1] = (Math.floor(i / W) + 0.5) / H;
      aSize[i] = p.size * (0.55 + Math.random() * Math.random() * 1.9);   // kare dağılım: çok küçük + az iri (salkım)
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sayi * 3), 3));
    this.geo.setAttribute('aRef', new THREE.BufferAttribute(aRef, 2));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: katmanUniformlari({
        uPosTex: { value: null }, uVelTex: { value: null },
        uDoku: { value: p.doku === 'salkim' ? salkimDoku : damlaDoku },
        uSisDoku: { value: sisDoku },
        uRenk: { value: new THREE.Color(p.color) }, uAlfa: { value: p.alpha },
        uAeration: { value: p.aeration },
        // Köpüklenme SU'ya özgüdür. Fragment'taki hizKopuk sezgiseli (yavaş
        // parçacık = köpük) su jetinin tepesi için doğru, ama alev tanımı gereği
        // yavaştır → alev ömrü boyunca beyaza boyanıyordu (torchalev notu).
        // preset.kopuklenme:false olan sistemlerde tüm beyazlatma kapanır.
        uKopukPayi: { value: preset.kopuklenme === false ? 0 : 1 },
        // v7 IŞIK: boyama kazanci — arastirma raporu §5.4 paintGain esikleri.
        // ⚠Eskiden burada LİNEER bir kopya vardı, isik-borusu.js ise smoothstep
        // kullanıyordu: aynı eşikler (0.15/0.60), farklı eğri → aeration=0.2'de
        // 3× fark (robo/swing/vario/star fazla renk basıyordu). Tek kaynak artık
        // isik-borusu.hatKazanclari. Denetim 2026-07-18 bulgusu.
        uBoyamaKazanc: { value: hatKazanclari(p.aeration).boyama },
        uYumusaklik: { value: preset.yumusaklik },
        uTepeBuyume: { value: p.tepeBuyume }, uDusmeBuyume: { value: p.dusmeBuyume },
        // v6 F1: hız-gerdirme katsayısı — berrak/laminer karakter yüksek
        // (iplik gibi akar), köpüklü karakter düşük (top top kalır, doğru).
        uGerdirme: { value: p.gerdirme ?? 1.0 },
        uMistOran: { value: mistOran },
        // v6 F3: en yakın 4 bağımsız 412C halkanın konum+rengi (motorKur.adim
        // her kare besler) — SphereMask koni parlatma + rim, ışık-su bağı.
        uHalkaSayi: { value: 0 },
        uHalkaPos: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uHalkaRenk: { value: [new THREE.Color(0,0,0), new THREE.Color(0,0,0), new THREE.Color(0,0,0), new THREE.Color(0,0,0)] },
        // v5.6: ışık erimi — kolon yüksekliğinin ~%55'i (dipten aydınlatma);
        // perde: ray LED'i (üstten, yon:'asagi'); alev (isikSonum:false) muaf.
        uIsikMenzil: { value: preset.isikSonum === false ? 1e3
          : preset.yon === 'asagi' ? (preset.kaynakY ?? 2.5) * 0.6
          : Math.max(0.6, (p.speed.b * p.speed.b) / 19.62 * 0.55) },
        uIsikYon: { value: preset.yon === 'asagi' ? -1 : 1 },
        uIsikKaynakY: { value: preset.kaynakY ?? 0 },
        // Çıplak cihaz (spec 2026-07-21 §3): öz ışık = ops. AquaLIGHT-C modülü.
        // 0 iken kolon kendi RGBW'siyle boyanamaz (fragment: albedo ortam tonuna
        // çöker, taban kısılır); 1 = eski davranış birebir. setOzIsik sürer.
        uOzIsik: { value: 1 },
        // Faz 1.5 — hız→görsel kütle bağı; ikisini de isikTazele TEK yerden sürer.
        // uAkisPayi: canlı parçacık payı (debi kapısı, renderVertex).
        // uIsikOlcek: menzil-üstü doğal ton kararması (fragment).
        uAkisPayi: { value: 1 }, uIsikOlcek: { value: 1 }
      }),
      vertexShader: renderVertex, fragmentShader: renderFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    // v7 G2: sprey additive saydam bandına alınır. Aksi halde saydam kuyruk
    // sıralaması Points orijinini (0,0,0) şehir siluet silindirinin orijiniyle
    // (y≈23 m) kıyaslar, silindir görüş-uzayında YAKIN çıkar ve depthWrite'sız
    // olduğu için kolonu bina silüeti boyunca keser (katman.js'teki gerekçe).
    this.points.renderOrder = KATMAN.SU_HACIM;
    this.scene.add(this.points);
    // Faz 1 (F1-1/F1-4): ışık erimi tabanı — yalnız dipten-aydınlatan su
    // cihazında hızla nefes alır; alev (isikSonum:false) ve perde (asagi) muaf.
    this.isikMenzilTaban = (preset.isikSonum === false || preset.yon === 'asagi')
      ? null : this.mat.uniforms.uIsikMenzil.value;
    // --- zemin imzası (T-B) ---------------------------------------------------
    // v7 PERDE turu kök sebep: KopukHalka/IsikGolu/SicramaTaci DAİRESEL ve cihaz
    // merkezine sabitti. Dik jette doğru, ama 2.6 m'lik perdenin altında Ø0.84 m
    // tek köpük diski kalıyordu — perdenin suya çarptığı YER hiç okunmuyordu
    // (Salih: "çarpma çizgisi yok, sıçrama yok"). balistik.inisHatti ZATEN
    // bağlıydı (probe: 3 nokta, pay 0.167 → ripple besleniyor), yani eksik olan
    // ripple değil ZEMİN GEOMETRİSİYDİ.
    // Çizgi kaynaklı cihazda imza da ÇİZGİDİR: halkalar hat boyunca çoğaltılır,
    // yarıçap daraltılıp kazanç kısılır → toplam köpük kütlesi jetle aynı kalır,
    // yalnız dar bir şeride yayılır (inisHatti'nin güç bölme sözleşmesiyle aynı).
    this.konum = [konum[0], konum[1]];
    this.cizgiBoy = cizgiBoy;
    this.zeminAci = 0;
    let kopukAyar = preset.kopuk, golAyar = preset.gol;
    if (cizgiBoy > 0) {
      const n = Math.min(6, Math.max(3, Math.round(cizgiBoy / 0.55)));
      this.zeminOfset = Array.from({ length: n }, (_, i) => (i / (n - 1) - 0.5) * cizgiBoy);
      // komşu diskler bilerek BİNDİRİR (çap > aralık): kesikli boncuk değil
      // kesintisiz çarpma şeridi okunsun.
      kopukAyar = { ...preset.kopuk, icR: 0.02, disR: (cizgiBoy / n) * 0.72,
        kazanc: preset.kopuk.kazanc * 0.75 };
      golAyar = { ...preset.gol, yariCap: preset.gol.yariCap * 0.62,
        kazanc: preset.gol.kazanc * 0.45 };
    } else {
      this.zeminOfset = [0];
    }
    this.kopuklar = this.zeminOfset.map(() => new KopukHalka(scene, konum, kopukAyar));
    this.goller = TANI.golsuz ? [] : this.zeminOfset.map(() => new IsikGolu(scene, konum, golAyar));
    this.sicramalar = this.zeminOfset.map(() => new SicramaTaci(scene, konum, kopukAyar));
    // Envanter #2 — nozul glow: cihaz başına TEK sprite, master ve öz ışıkla
    // birlikte söner (isikTazele). Ölçek jet çapıyla (particle.size) orantılı;
    // kazanç kısık başlar — C3 [ELLE] sorusu kalibre eder. Su olmayan
    // sistemlerde (torchalev: kopuklenme:false işareti) ÜRETİLMEZ — alev
    // tabanında beyaz su-kaynak parlaması YANLIŞ olur. Çizgi kaynaklı cihazda
    // (perde) sprite cihaz merkezinde kalır — perde kendi turunda ele alınır.
    this.nozulGlow = null;
    if (preset.kopuklenme !== false && !TANI.glowsuz) {
      this.nozulGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: nozulGlowDoku, color: new THREE.Color(p.color),
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
        opacity: 0.0 }));
      // Faz 1.5: TABAN boy saklanır — isikTazele her kütle değişiminde bunun
      // üstünden ölçekler (yoksa ölçek ölçeğin üstüne binip sürüklenirdi).
      this.nozulGlowBoy = Math.max(0.35, p.size * 12);
      this.nozulGlow.scale.setScalar(this.nozulGlowBoy);
      this.nozulGlow.position.set(konum[0], 0.06, konum[1]);
      this.nozulGlow.renderOrder = KATMAN.SU_HACIM;
      scene.add(this.nozulGlow);
      this.isikTazele();   // master=1/ozIsik=true doğumu — uAlfa ile aynı sözleşme
    }
    this.zeminYerlestir();
    // v3 F2/F3: temsili gövde — varsayılan nozul-altı 412C kombinli disk
    // (gerçek ürün: nozul, C-tipi aydınlatmanın merkez deliğinden geçer);
    // F3 arketipleri kendi gövde tipini preset.govdeTip ile seçer.
    const fab = { halka: () => halkaDisk(preset.govdeOlcek ?? 1), switch: switchGovde,
      jet: jetGovde, robo: () => roboGovde(2), swing: () => roboGovde(1),
      // Faz 2 Tur 2/4: plaka künyeden (drydeckPresetTuret koydu)
      drydeck: () => drydeckGovde(preset.ustPlaka),
      air: airGovde, star: starGovde, torch: torchGovde, bos: bosGovde,
      // v7 POP: Ø80 flanş + yan kontrol kutusu; ölçü künyeden (popTuret.popBoy).
      pop: () => popGovde(preset.popBoy),
      // v7 TUR 2: pompa gövdesi künye ölçüsünü yansıtır (151 yüksek rayzırlı,
      // 241 basık) — künyesiz çağrıda varioGovde kendi varsayılanına düşer.
      vario: () => varioGovde(preset.varioBoy),
      // v7 perde: gövdedeki nozul adedi de künyeden — ekrandaki sütun sayısıyla
      // gövdedeki delik sayısı AYNI olmalı (CLASSIC 30, LACE 48, DIGITAL 16).
      perde: () => perdeGovde(preset.shape.length ?? 2.6, preset.kaynakY ?? 2.5,
        preset.perdeSutun ?? 0) };   // v5.5
    this.govde = (fab[preset.govdeTip] ?? fab.halka)();
    this.govde.grup.position.set(konum[0], 0, konum[1]);
    if (TANI.govdesiz) this.govde.grup.visible = false;   // teşhis: su cihazı gövdesi gizli
    scene.add(this.govde.grup);
  }
  setMaster(v) {
    const yeni = Math.max(0, v);
    // v7 AIR: solenoid TETİKLENİR, serbest koşmaz — salvo fazı master'ın 0→1
    // kenarında sıfırlanır. Serbest koşan faz olsaydı atım şovun vuruşuna değil
    // rastgele bir ana denk gelirdi (Salih tetiği çizelgeden verir: step kanalı).
    // ⚠RELOAD KİLİDİ: tetik, önceki atımın üstünden `periyot` geçmeden KABUL
    // EDİLMEZ. Karakter kartı reload ≥6 s diyor — tank o süre içinde basınç
    // toplayamaz. Kilitsizken _test-air'in 1.5/2.0/2.6/3.5 deseni saniyede iki
    // salvo atıyordu, yani ekranda cihaz değil uydurma bir makine vardı.
    // Kilitlenen tetik SESSİZ düşer; şov yazarı reload'a uymak zorundadır.
    if (this.salvoAtim > 0 && yeni > 0 && !(this.master > 0)
        && this.sonT - this.salvoT0 >= this.salvoPeriyot) this.salvoT0 = this.sonT;
    this.master = yeni;
    // KART v2 SWITCH #38: aniKesme cihazında (yalnız switch) uAlfa artık
    // master'la SIFIRLANMAZ — sabit baseAlfa'da kalır, görünürlük uKapali'nin
    // doğum kapısına ve parçacığın kendi ömrüne bırakılır (kesim anında havada
    // olan su ANINDA kaybolmaz, doğal balistiğini/sıçramasını tamamlar).
    // Diğer TÜM cihazlarda eski sözleşme (master*alfa) BİREBİR korunur.
    this.mat.uniforms.uAlfa.value = this.aniKesme ? this.baseAlfa : this.baseAlfa * this.master;
    if (this.aniKesme) this.posVar.material.uniforms.uKapali.value = this.master > 0 ? 0 : 1;
    // GÖRSEL KAPI düzeltmesi (Salih, 2026-07-21): çıplakta taban köpük halkası +
    // sıçrama tacı da kısılır (0.35) — beyaz zemin çalkantısı ışıksız cihazda
    // "LED varmış" gibi okunuyordu. Tam söndürülmez: su çarpıyor, çalkantı var.
    for (const k of this.kopuklar) k.setMaster(this.ozIsik ? v : v * 0.35);
    for (const s of this.sicramalar) s.setMaster(this.ozIsik ? v : v * 0.35);
    // çıplak cihazda ışık gölü YOK (LED yoksa zemine vuran ışıma da yok) —
    // isikTazele goller döngüsünü üstlendi (Faz 1: hız ölçeğiyle birlikte).
    this.isikTazele();
  }
  // Envanter #2 — glow opaklığı TEK yerden sürülür: hem setMaster hem setOzIsik
  // çağırır (yalnız setMaster'da olsaydı öz-ışık toggle'ı bir sonraki master
  // değişimine kadar eski parlaklıkta kalırdı — gecikmeli görünürdü). Çıplak
  // cihazda kaynak sönük ama SIFIR DEĞİL (0.25): LED'siz nozulda da su yüzeyi
  // kırışır, ortam ışığını toplar; tam karartmak kaynağı yok sayardı.
  // Faz 1 (spec 2026-07-24 G4): ışık çıkışı canlı POMPA hızına ölçeklenir —
  // hız düşünce su kütlesi küçülür, ışık da kısılır ("ışık karesi" kökü).
  // Taban 0.35: rölantide LED sönmez, göz almaz. STEP türlerinde (switch/air/
  // star: hız kanalı yok) uHizScale=1 kalır → çarpan 1, davranış birebir eski.
  // Kütle payı — "ekranda ne kadar su var" tek okuması. Hız kanalı olan cihazda
  // pompa hızı (uHizScale); solenoidli SWITCH'te hız kanalı DOĞMAZ (proje.js
  // STEP_TURLERI) → orada master kütle vekilidir. Salih 2026-07-25 şikâyetinde
  // switch de vardı: master 0.2'de su tam (aniKesme sözleşmesi, uAlfa sabit) ama
  // ışık ayak izi tam genişlikte sönük duruyordu. İkisinde de 1.0 → çarpan 1,
  // yani ONAYLI tam-hız görünümü BİREBİR korunur.
  kutlePayi() {
    const h = this.aniKesme ? this.master : this.velVar.material.uniforms.uHizScale.value;
    return Math.min(1, Math.max(0, h));
  }
  // Faz 1.5 (F1-1 kapı düşüşü): eğri LİNEER DEĞİL, taban 0.35→0.15.
  // Gerekçe: gözün gördüğü parlaklık ışığın SAÇILDIĞI su kütlesiyle gider, kütle
  // ise v² ile büyür. Lineer eğri + 0.35 tabanı k=0.3'te %48 ışık bırakıyordu —
  // su neredeyse yokken yarım parlaklık = "göz alan kare". h^1.5 ara eğri:
  // k=0.3 → 0.29 (eski 0.55), k=0.6 → 0.55, k=1 → 1.00 (aynı).
  // Taban 0.15 bilinçli: LED rölantide SÖNMEZ (gerçek cihazda ışık ayrı DMX
  // kanalı), ama göz almaz. Kalibrasyon tek sabittir — kapıda buradan ayarlanır.
  isikOlcek() {
    return 0.15 + 0.85 * Math.pow(this.kutlePayi(), 1.5);
  }
  isikTazele() {
    const olc = this.isikOlcek(), k = this.kutlePayi();
    // Debi kapısı payı ∝ k^1.6 (fizik k², bir tık yumuşatıldı ki alçak kolon
    // seyrek DAMLA yağmuruna dönmesin) — taban 0.12: kısık pompa da görünür bir
    // sızıntı bırakır. Kapının GEREKÇESİ renderVertex'in başında yazılı.
    // ⚠Yalnız POMPA hızından beslenir, master'dan DEĞİL: switch'in "aniKesme"
    // su sözleşmesi (uAlfa sabit, görünürlük uKapali'da) bozulmasın.
    const hizPayi = Math.min(1, Math.max(0, this.velVar.material.uniforms.uHizScale.value));
    this.mat.uniforms.uAkisPayi.value = Math.max(0.12, Math.pow(hizPayi, 1.6));
    this.mat.uniforms.uIsikOlcek.value = olc;
    if (this.nozulGlow) {
      this.nozulGlow.material.opacity = 0.5 * this.master * (this.ozIsik ? 1 : 0.25) * olc;
      // AYAK İZİ de büzülür: ıslak kubbe su kütlesi kadardır. Yalnız opaklığı
      // kısmak yetmiyordu — tam boy sönük halka gözde "ışık plakası" bırakıyor.
      this.nozulGlow.scale.setScalar(this.nozulGlowBoy * (0.55 + 0.45 * k));
    }
    for (const g of this.goller) {
      g.setMaster((this.ozIsik ? this.master : 0) * olc);
      g.setOlcek(0.45 + 0.55 * k);   // zemin gölü de kütleyle büzülür
    }
    if (this.isikMenzilTaban) {
      // kolon boyu v² ile — ışıklanan erim su kütlesini takip eder (F1-4)
      const k = Math.min(1, Math.max(0, this.velVar.material.uniforms.uHizScale.value));
      this.mat.uniforms.uIsikMenzil.value = this.isikMenzilTaban * Math.max(0.15, k * k);
    }
  }
  // Çıplak cihaz (spec 2026-07-21 §3): öz ışık = ops. AquaLIGHT-C modülü.
  // Kapalıyken ışık gölü söner ve malzeme uOzIsik=0 ile ortam tonuna düşer;
  // bağımsız 412C halka katkısı (vEkIsik) bilerek DOKUNULMAZ — ışık cihazı
  // eklenince su yine boyanır. uRenk'e dokunulmaz (hue setterları akmaya devam
  // eder), kısma tamamen shader'da → toggle geri açılınca eski görünüm birebir.
  setOzIsik(v) {
    this.ozIsik = !!v;
    this.mat.uniforms.uOzIsik.value = this.ozIsik ? 1 : 0;
    // görsel kapı düzeltmesi: zemin imzası (köpük + taç) toggle anında da tazelenir
    for (const k of this.kopuklar) k.setMaster(this.ozIsik ? this.master : this.master * 0.35);
    for (const s of this.sicramalar) s.setMaster(this.ozIsik ? this.master : this.master * 0.35);
    // goller isikTazele'de sürülür (Faz 1: hız ölçeğiyle birlikte tazelenir)
    this.isikTazele();   // envanter #2: toggle anında kaynak parlaklığı da tazelenir
  }
  // v7 perde: zemin imzasını hat boyunca (uYonAci ekseninde) dizer. Nokta
  // cihazlarda tek eleman → davranış eskisiyle birebir aynı.
  zeminYerlestir() {
    const [x, z] = this.konum;
    const ex = Math.cos(this.zeminAci), ez = Math.sin(this.zeminAci);
    this.zeminOfset.forEach((s, i) => {
      const px = x + ex * s, pz = z + ez * s;
      this.kopuklar[i].konumla(px, pz);
      this.goller[i].konumla(px, pz);
      this.sicramalar[i].konumla(px, pz);
    });
  }
  // v7 TUR 2 (VARIO): hız kanalı artık POMPA KOMUTU, doğrudan uniform değil.
  // İki gerçek eklendi:
  //  • hizTavan — pompa anma yüksekliğinin üstüne çıkamaz (vario 1.0'da tavan;
  //    tavansız cihazlarda -> sınırsız, eski davranış).
  //  • hizRampaSn — rotor + emiş sütunu ataleti; adım fonksiyonu üstel yaklaşır.
  //    Rampa 0 olan cihazlarda (switch, robo, jet...) kod eskisiyle BİREBİR aynı.
  // ⚠Balistik gecikme bundan AYRI ve zaten bedava: kolonun yeni tepeye ulaşması
  //  v/g kadar sürer (151'de 0.78 s) — rampa onun ÜSTÜNE binen pompa gecikmesi.
  setHiz(k) {
    const tavan = this.hizTavan;
    this.hedefHiz = Math.min(Math.max(0, k), tavan > 0 ? tavan : Infinity);
    if (!(this.hizRampaSn > 0)) this.velVar.material.uniforms.uHizScale.value = this.hedefHiz;
    this.isikTazele();   // Faz 1 (F1-1): hız kanalı ışığı da tazeler (rampasız cihaz anında)
  }
  // T-E yelpaze: düzlem azimutu — cihazYonetici.dondur nesne.dondur varsa çağırır
  // (kayıt açısını da orada günceller). uYelpaze=0 cihazlarda uniform etkisizdir.
  // v5 perde: konum shader'ının çizgi azimutu ve gövde (ray borusu) da döner.
  dondur(deg) {
    const rad = deg * Math.PI / 180;
    this.velVar.material.uniforms.uYonAci.value = rad;
    this.posVar.material.uniforms.uYonAci.value = rad;
    this.zeminAci = rad;                 // v7 perde: çarpma şeridi de döner
    this.zeminYerlestir();
    this.govde.setAci?.(rad);
  }
  // T-C per-jet RGBW: cihaz başına ShaderMaterial → renk = uniform, attribute gerekmez.
  // Işık gölü de aynı renge boyanır (zemin-efekt.js setRenk kancası).
  setRenk(r, g, b) {
    this.mat.uniforms.uRenk.value.setRGB(r, g, b);
    for (const gl of this.goller) gl.setRenk(r, g, b);
    // envanter #2: per-jet RGBW suyu boyarken kaynak parlaması da aynı renkte
    this.nozulGlow?.material.color.setRGB(r, g, b);
    this.govde.setRenk?.(r, g, b);   // LED halkası su ile aynı renkte (412C gerçeği; ledsiz gövdede yok)
  }
  // v3 F3 (AquaROBO/SWING): servo yönü — doğum ekseni uNozulYon her iki compute
  // shader'ında da kullanılır (konum çerçevesi + koni ekseni), yeni doğan parçacık
  // yeni yöne fırlar (jet süpürmesi ~1 parçacık ömründe oturur, fiziksel doğru).
  setPanTilt(panDeg, tiltDeg) {
    const pan = panDeg * Math.PI / 180, tilt = tiltDeg * Math.PI / 180;
    const y = new THREE.Vector3(Math.cos(pan) * Math.sin(tilt), Math.cos(tilt), Math.sin(pan) * Math.sin(tilt));
    this.posVar.material.uniforms.uNozulYon.value.copy(y);
    this.velVar.material.uniforms.uNozulYon.value.copy(y);
    this.govde.setYon?.(pan, tilt);
  }
  konumla(x, z) {
    this.posVar.material.uniforms.uNozulPos.value.set(x, this.kaynakY, z);
    this.konum[0] = x; this.konum[1] = z;
    this.zeminYerlestir();
    this.nozulGlow?.position.set(x, 0.06, z);   // envanter #2: kaynak cihazla taşınır
    this.govde.grup.position.set(x, 0, z);
  }
  sil() {
    // renderTargets + seed DataTexture + compute programları + YAKALANAN
    // passThru shader'ı. FullScreenQuad'a dokunulmaz (paylaşımlı geometri).
    gpuDok([this.posVar, this.velVar], this.passThru);
    this.geo.dispose(); this.mat.dispose();
    this.scene.remove(this.points);
    for (const k of this.kopuklar) k.sil();
    for (const g of this.goller) g.sil();
    for (const s of this.sicramalar) s.sil();
    // envanter #2: material cihaza özel → dispose; nozulGlowDoku PAYLAŞIMLI,
    // dokunulmaz (diğer cihazlar aynı dokuyu kullanmaya devam eder).
    if (this.nozulGlow) {
      this.scene.remove(this.nozulGlow);
      this.nozulGlow.material.dispose();
    }
    this.govde.sil();
  }
  step(dt, t) {
    // v7 TUR 2: pompa rampası — üstel yaklaşım (kare hızından BAĞIMSIZ, dt ile
    // doğru: 60 fps ve 30 fps aynı sürede oturur). Rampasız cihazlarda atlanır.
    if (this.hizRampaSn > 0) {
      const u = this.velVar.material.uniforms.uHizScale;
      const k = 1 - Math.exp(-Math.max(0, dt) / this.hizRampaSn);
      u.value += (this.hedefHiz - u.value) * k;
      if (Math.abs(this.hedefHiz - u.value) < 1e-4) u.value = this.hedefHiz;
      this.isikTazele();   // Faz 1 (F1-1/F1-4): rampalı cihazda ışık her kare hızı takip eder
    }
    // v7 CIHAZ: servo süpürme trail'i (kuyruklu yıldız). Nozul dönüyorsa (robo/
    // swing/hydra pan-tilt) açısal hız × uçuş süresi kadar bir gecikme açısı doğar;
    // hız shader'ı yeni parçacığı bu açı kadar SÜPÜRMENİN GERİSİNE dağıtır. Statik
    // nozulda (diğer tüm cihazlar) uNozulYon değişmez → gecikme 0, dal no-op.
    const vsu = this.velVar.material.uniforms;
    const yonSimdi = vsu.uNozulYon.value;
    if (dt > 0) {
      const dAci = yonSimdi.angleTo(this.oncekiNozulYon);
      if (dAci > 1e-4) {
        const hizB = (vsu.uHizA.value + vsu.uHizB.value) * 0.5 * (vsu.uHizScale.value || 1);
        const ucus = hizB > 0 ? 2 * hizB / G : 0;      // tam uçuş = 2v/g
        vsu.uServoGecikme.value = Math.min((dAci / dt) * ucus, 2.4);   // ~137° kelepçe
        _servoAx.crossVectors(yonSimdi, this.oncekiNozulYon);
        if (_servoAx.lengthSq() > 1e-9) { _servoAx.normalize(); vsu.uServoEksen.value.copy(_servoAx); }
        this.oncekiNozulYon.copy(yonSimdi);
      } else {
        vsu.uServoGecikme.value *= 0.7;                // süpürme durunca kuyruk yumuşakça söner
      }
    }
    for (const k of this.kopuklar) k.tik(t);
    for (const g of this.goller) g.tik(t);
    for (const s of this.sicramalar) s.tik(t);
    this.sonT = t;                                  // v7 AIR: salvo tetiği bu anı damgalar
    for (const v of [this.posVar, this.velVar]) {
      v.material.uniforms.uDt.value = dt;
      v.material.uniforms.uTime.value = t;
      v.material.uniforms.uSalvoT0.value = this.salvoT0;
    }
    this.gpu.compute();
    this.mat.uniforms.uPosTex.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    this.mat.uniforms.uVelTex.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
  }
}

// --- render shader'ları (Ders 10 BLOK 6) ---
// v6 F1 (büyük-animasyoncu raporu): velocity-stretched billboard — çekirdek jeti
// "top top" nokta bulutundan "akan su"ya çeviren tek en önemli hamle. Quad
// geometrisine geçmeden nokta-sprite İÇİNDE: bounding kare hızın ekran izdüşümü
// kadar büyütülür (gl_PointSize), fragment doku örneklemesini hız yönünde
// anizotropik sıkıştırır. İz boyu = 1 kare yolu (1/60 s) × uGerdirme katsayısı.
const renderVertex = /* glsl */`
  attribute vec2  aRef;
  attribute float aSize;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform vec2  uCozunurluk;
  uniform float uPixelYariCap;
  uniform float uTepeBuyume;
  uniform float uDusmeBuyume;
  uniform float uGerdirme;
  uniform float uMistOran;
  uniform int   uHalkaSayi;
  uniform vec3  uHalkaPos[4];
  uniform vec3  uHalkaRenk[4];
  uniform float uAkisPayi;      // Faz 1.5: debi kapısı (1 = tüm parçacıklar canlı)
  varying vec3  vEkIsik;
  varying float vVy;
  varying float vAge;
  varying float vViewZ;
  varying float vYuk;
  varying vec2  vYon;
  varying float vGer;
  varying float vMist;
  varying float vSplash;
  float mistMi(vec2 uv, float oran){
    return step(fract(sin(dot(uv, vec2(91.7, 33.1))) * 43758.5453), oran);
  }
  void main() {
    // ---- DEBİ KAPISI (Faz 1.5, F1-1 kapı düşüşünün KÖKÜ) --------------------
    // Motor sabit N parçacık koşturur (kenar², vario'da 168²=28224). Kolon boyu
    // ise h=v²/2g ile kısalır: hız çarpanı k'da boy k² olur. Sayı sabit kalınca
    // METRE BAŞINA yoğunluk 1/k² büyür — k=0.3'te ONBİR KAT. Additive harmanda
    // bu doğrudan piksel başına toplam parlaklıktır: cihaz dibinde doygun beyaz
    // bir plaka ("kare gibi ışık", Salih 2026-07-25). Faz 1'in ışık ölçeklemesi
    // ışığı kısmıştı, YOĞUNLUĞU değil — o yüzden kapı düştü.
    // Gerçek fizik: debi Q=A·v, uçuş süresi 2v/g → havadaki su kütlesi ∝ v²,
    // yani parçacık SAYISI k² ile düşmeli, yoğunluk SABİT kalmalı. Kapı bunu
    // yapar: per-parçacık STABİL hash (mistMi deseni — aRef'e bağlı, zamana
    // DEĞİL) ile hep AYNI parçacıklar kapanır, kaynama/titreme olmaz.
    // Kapalı parçacık clip dışına atılır → fragment hiç koşmaz (drop'ta FPS artısı).
    if (fract(sin(dot(aRef, vec2(57.31, 11.79))) * 25781.3) > uAkisPayi) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    vec4 P = texture2D(uPosTex, aRef);
    vec4 V = texture2D(uVelTex, aRef);
    vec3 worldPos = P.xyz;
    vVy  = V.y;
    vYuk = worldPos.y;
    vSplash = step(V.w, 0.0);                      // v6 F5: omur<0 = splash modu
    vAge = clamp(P.w / max(abs(V.w), 1e-4), 0.0, 1.0);
    vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
    vViewZ = mvPosition.z;
    // Depence damla dili: tepe (|vy|→0) ve düşüş kolunda (vy<0) damla İRİLEŞİR —
    // salkım dağılması boyutla okunur, parçacık sayısı değişmez.
    float tepe  = 1.0 - smoothstep(0.0, 2.5, abs(V.y));
    float dusme = smoothstep(0.0, 4.0, -V.y);
    float buyume = 1.0 + uTepeBuyume * tepe + uDusmeBuyume * dusme;
    // v6 F2: mist az ama BÜYÜK (rapor: %5-10 pay, dev soft sprite) — boy ~9×,
    // yaşla da şişer (dağılan duman); gerdirme mist'e uygulanmaz.
    vMist = mistMi(aRef, uMistOran);
    float mistBoy = mix(1.0, 7.0 * (0.6 + 0.8 * vAge), vMist);
    float tabanPx = aSize * buyume * mistBoy * (uPixelYariCap / -mvPosition.z);
    tabanPx *= mix(1.0, 0.7, vSplash);             // splash damlası küçük
    // hızın ekran izdüşümü (piksel): bir karelik yol NDC'de nereye düşer
    vec4 clip0 = projectionMatrix * mvPosition;
    vec3 mvVel = (viewMatrix * vec4(V.xyz, 0.0)).xyz;
    vec4 clip1 = projectionMatrix * vec4(mvPosition.xyz + mvVel * 0.0166, 1.0);
    vec2 izPx = (clip1.xy / clip1.w - clip0.xy / clip0.w) * uCozunurluk * 0.5;
    float izBoy = length(izPx);
    vGer = 1.0;
    vYon = vec2(1.0, 0.0);
    if (izBoy > 1e-3 && tabanPx > 1e-3 && vMist < 0.5) {
      vGer = clamp(1.0 + uGerdirme * izBoy / tabanPx, 1.0, 7.0);
      vYon = izPx / izBoy;
    }
    // v6 F3: bağımsız 412C halkalar — ışık YUKARI vurur, yükseldikçe genişleyen
    // koni (SphereMask'ın koniye uyarlanmışı); arkadan aydınlatmada rim boost
    // (pro gözlem #3: backlight'ta kenar parlar). WET: "lights follow water".
    vEkIsik = vec3(0.0);
    vec3 bakis = normalize(worldPos - cameraPosition);
    for (int i = 0; i < 4; i++) {
      if (i >= uHalkaSayi) break;
      vec3 fark = worldPos - uHalkaPos[i];
      float dXZ = length(fark.xz);
      // v7 IŞIK turu: koni yarı-açısı atan(0.4)=21.8°, yani tam açı ~44° —
      // KART v2 §2'deki 60° lensin SUDAKİ karşılığı (2·asin(sin30°/1.333)=44°).
      // Katsayı tesadüfen zaten doğruymuş, değiştirmiyorum; artık gerekçesi yazılı.
      float koniR = 0.45 + fark.y * 0.4;                       // yukarı açılan koni
      // Dikey erim 1.5-5.5 m idi: 4620 lm'lik 412C için fazla kısa, kolonun üst
      // yarısı ışıksız kalıp gri-beyaz kalıyordu. 2.5-9.0 m ile renk kolon
      // boyunca çıkıyor, tepede doğal olarak sönüyor.
      float icinde = (1.0 - smoothstep(koniR * 0.6, koniR, dXZ))
                   * (1.0 - smoothstep(2.5, 9.0, fark.y))       // dikey erim
                   * step(0.0, fark.y);
      // ⚠normalize(fark) SIFIR VEKTÖRDE NaN verir (0/0) — "ışık karesi" hatasının
      // kök sebebi buydu. Kullanıcı 412C'yi su cihazının TAM ÜSTÜNE koyduğunda
      // (gerçek üründe nozul, C-tipi ışığın merkez deliğinden geçer — yani en
      // doğal yerleşim) nozulda doğan parçacığın konumu halka konumuna BİREBİR
      // eşit olur → fark = (0,0,0) → NaN. NaN parçacık rengine, oradan HDR
      // tamponuna yazılır; bloom'un ayrılabilir bulanıklığı NaN'ı yatay+dikey
      // yayar → ekranın büyük bir DİKDÖRTGENİ bozulur. Konsola hiçbir şey
      // düşmez (ne WebGL hatası ne exception) — bu yüzden 469 test yeşilken ve
      // smoke "TEMIZ" derken kare simsiyah kalıyordu.
      // Kanıt: 1 mm kaydırma hatayı yok eder, 1.4 m kaydırmada diskler hâlâ
      // üst üste biner ama hata yoktur → tetikleyici TAM ÇAKIŞMA.
      float uzunluk = length(fark);
      float rim = uzunluk > 1e-5
        ? pow(max(0.0, -dot(bakis, fark / uzunluk)), 4.0)
        : 0.0;                                    // çakışık: yön tanımsız, rim katkısı yok
      vEkIsik += uHalkaRenk[i] * icinde * (1.0 + 1.5 * rim);
    }
    gl_PointSize = tabanPx * vGer;
    gl_Position = clip0;
  }
`;

const renderFragment = /* glsl */`
  uniform sampler2D uDoku;
  uniform sampler2D uSisDoku;   // v7: mist'in çekirdeksiz yumuşak dokusu
  uniform vec3  uRenk;
  uniform float uAlfa;
  uniform float uAeration;
  uniform float uKopukPayi;      // 1 = su (kopuklenir), 0 = alev gibi su-olmayan sistem
  uniform float uBoyamaKazanc;   // v7: aeration'dan turer, 0=laminer 1=kopuk
  uniform float uTabanIsik;
  uniform float uIsikMenzil;   // v5.6: ışığın su içindeki erimi (m)
  uniform float uIsikYon;      // +1 = ışık DİPTE (412C halka), -1 = ışık ÜSTTE (perde rayı)
  uniform float uIsikKaynakY;  // üstten aydınlatmada kaynağın yüksekliği
  uniform float uOzIsik;       // çıplak cihaz (spec 2026-07-21 §3): 0=öz ışık yok, 1=eski davranış
  uniform float uIsikOlcek;    // Faz 1.5: canlı kütle payı (isikOlcek) — 1'de eski davranış
  varying float vVy;
  varying float vAge;
  varying float vViewZ;
  varying float vYuk;
  varying vec2  vYon;
  varying float vGer;
  varying float vMist;
  varying float vSplash;
  varying vec3  vEkIsik;
  ${SOFT_FADE_GLSL}
  void main() {
    // v6 F1: gl_PointCoord'u hız yönüne hizalı çerçevede anizotropik örnekle —
    // bounding kare vGer kat büyüdü, doku enine vGer kat sıkışır = iz (streak).
    // gl_PointCoord y'si aşağı artar, NDC y yukarı → p.y çevrilir.
    vec2 p = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) * 2.0 - 1.0;
    float boyuna = dot(p, vYon);
    float enine  = dot(p, vec2(-vYon.y, vYon.x));
    vec2 q = vec2(boyuna, enine * vGer);
    if (dot(q, q) > 1.0) discard;
    // v7: mist payı kadar sis dokusuna geç (vMist 0/1 gibi davranır, mix güvenli)
    vec2 duv = q * 0.5 + 0.5;
    float doku = mix(texture2D(uDoku, duv).a, texture2D(uSisDoku, duv).a, vMist);
    if (doku < 0.01) discard;
    // v7 APEKS turu: apekste vVy->0 => ham hizKopuk 1.0'a firliyordu; dik cihazda
    // tum parcaciklar tepede birikip additive beyaza doyuyordu. Sezgisel zayiflatildi:
    // ust siniri 3.0->4.5 yumusatildi VE tavan 0.7'ye cekildi (apeks kopugu GERCEK
    // ama artik doymuyor). Egik atan robo/swing/hydra apeksi yaya dagittigi icin
    // zaten bu tavana degmez; onlarin karakteri bozulmaz.
    float hizKopuk = (1.0 - smoothstep(0.5, 4.5, abs(vVy))) * 0.6;
    // uKopukPayi: köpüklenmeyen sistemlerde (alev) TÜM beyazlatma kapanır.
    // Aksi halde "yavaş parçacık = köpük" sezgiseli alevi de beyaza boyuyordu.
    float kopuk = max(max(uAeration, hizKopuk), max(vMist * 0.85, vSplash)) * uKopukPayi;   // F2 mist sütsü + F5 splash köpük
    // Envanter #11: köpük dokusu — iki katman ham hash gürültüsü, eşikleme.
    // Bu KAYAN doku DEĞİL: fract(sin(dot)) per-pixel beyaz gürültüdür; vAge
    // ofseti (1.7/2.9) pürüzsüz kaydırma yapmaz, sıfırdan farklı her değer
    // deseni her karede TAMAMEN dekorele eder → görsel etki zamansal köpük
    // ışıltısı (temporal shimmer). Eşik köpük payıyla düşer: köpüklü bölgede
    // doku beyaz benekli, berrak bölgede etkisiz.
    // (hash tabanlı ucuz noise; ek doku örneklemesi YOK — mevcut uDoku korunur.)
    float n1 = fract(sin(dot(q * 3.1 + vec2(0.0, vAge * 1.7), vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(q * 7.3 - vec2(0.0, vAge * 2.9), vec2(26.651, 37.911))) * 24634.6345);
    float benek = smoothstep(0.55 - 0.35 * kopuk, 0.95, (n1 * 0.6 + n2 * 0.4));
    vec3 albedo = mix(uRenk, vec3(1.0), kopuk * 0.5);
    // v5.6 su altı/su üstü ışık farkı (Salih + WET gözlemi "lights follow water"):
    // 412C dipten boyar — dipte doygun renk, menzil üstünde doğal/soluk;
    // perdede LED rayda — üstte doygun, aşağı süzüldükçe söner.
    float mesafe = uIsikYon > 0.0 ? vYuk : max(uIsikKaynakY - vYuk, 0.0);
    // ⚠SABİT 0.15 m KENARI ORANSAL YAPILDI: uIsikMenzil hızla nefes alıyor
    // (isikTazele) ve düşük presetlerde (POP tabanı 0.6 m → 0.09) sabit kenar
    // menzilin ÜSTÜNE çıkıyordu. GLSL'de smoothstep(edge0 >= edge1) TANIMSIZ:
    // yaygın sürücüde t negatif bölmeden 0'a kırpılır → dip=1 → kolon her yerde
    // TAM doygun boyanır (tam da "göz alan ışık" tarifi). 0.09 çarpanı tam
    // menzilde (1.66 m, vario) 0.15'i BİREBİR verir → tam hızda davranış aynı.
    float dip = 1.0 - smoothstep(uIsikMenzil * 0.09, uIsikMenzil, mesafe);
    // Menzil ÜSTÜ "doğal su" tonu: gece sahnesinde bu ton ışıklı sudan PARLAK
    // olmamalı. Faz 1'de menzil hızla kısalınca kolonun tamamı bu parlak pastele
    // düşüyordu (0.72-0.85 gri-mavi = ekranda beyaz plaka). Artık kütle payıyla
    // birlikte kararır; uIsikOlcek=1'de (tam hız) eski değerin BİREBİR aynısı.
    vec3 disTon = vec3(0.72, 0.78, 0.85) * mix(0.42, 1.0, uIsikOlcek);
    albedo = mix(disTon, albedo, 0.3 + 0.7 * dip);
    // v3: per-jet albedo (kendi 412C'si içten boyar) + v6 F3: bağımsız halka
    // katkısı ÇARPIMSAL modelle (ders05: additive beyazı patlatır, çarpımsal
    // = yansıma — kırmızı ışık kırmızı köpük yapar, ışıksız su karanlık kalır).
    // v7 IŞIK turu — aerated/laminer ayrımı (docs/2026-07-18-su-alti-isik-referansi.md §3):
    // Kabarcıklı (aerated) su çok-saçılımlı, albedo≈1, SOĞURMAZ → ışığın rengini
    // BİREBİR alır. Berrak/laminer su boyanmaz, ışığı İLETİR (o iş laminer.js'in
    // ışık borusunda). uBoyamaKazanc = aeration'dan türer: geyser (0.75) tam
    // boyanır, berrak jet neredeyse hiç. Işık katkısı bu kazançla güçlendirilir,
    // beyaz taban ise boyanan suda BASTIRILIR — yoksa taban rengi yıkıyor.
    // Çıplak cihaz (spec 2026-07-21 §3): öz ışık (ops. AquaLIGHT-C) kapalıyken
    // kolon KENDİ RGBW'siyle boyanamaz — albedo KOYU gece-su tonuna çöker (hue
    // rampası akmaya devam etse de ekrana işlemez, toggle geri açılınca eski
    // görünüm birebir döner) ve dipten aydınlatma tabanı kısılır. GÖRSEL KAPI
    // düzeltmesi (Salih, 2026-07-21: "çıplak değil"): ilk sürüm 0.72-0.85 ortam
    // grisi + 0.35 taban = ışıklı gibi beyaz kolon veriyordu. Gece ışıksız su
    // karanlık SİLUETTİR: ton 0.30-0.40'a, taban 0.12'ye çekildi (tam sıfır
    // değil — su yokmuş gibi olur). Bağımsız 412C halka katkısı (vEkIsik)
    // bilerek DOKUNULMAZ: nötr albedo × halka rengi = ışık eklenince su yine
    // boyanır (çarpımsal yansıma modeli, ders05).
    // (Salih kalibrasyonu 2026-07-21: 0.20-0.28 "hiç belli olmuyor" dedi → bir
    // kademe yukarı; karanlık ama SEÇİLEBİLİR siluet hedefi.)
    albedo = mix(vec3(0.30, 0.34, 0.40), albedo, uOzIsik);
    // Envanter #11 (devam): benek karışımı ışık/dip albedo karışımlarından SONRA
    // uygulanır — köpük benekleri saçılım beyazı, ışık tonlamasının onları griye
    // çekmesine izin verilmez. TEK istisna öz ışık (görsel kapı düzeltmesi):
    // çıplak cihazda saçacak ışık yok, benek beyazı da sönmeli — yoksa karanlık
    // kolon benek benek parlayıp "ışıklı" okunuyor (0.35 payı şehir ortamı).
    // (1.0 - vMist) kapısı — Salih pürüz raporu (2026-07-21): mist savrulma
    // alanıyla tek yöne sürüklenir (F2 tasarımı); benek mist'i de beneklyince
    // o sürüklenme "yanda ikinci bir fışkırtma" gibi KATI okunuyordu. Mist
    // çekirdeksiz yumuşak sis kalır, benek yalnız jet gövdesi + splash'ta.
    albedo = mix(albedo, vec3(1.0), benek * kopuk * 0.6 * (1.0 - vMist) * mix(0.2, 1.0, uOzIsik));
    float taban = uTabanIsik * (0.8 + 0.2 * dip) * (1.0 - 0.45 * uBoyamaKazanc);
    taban *= mix(0.16, 1.0, uOzIsik);
    vec3 renk = albedo * (taban + vEkIsik * (1.0 + 1.7 * uBoyamaKazanc));
    float alfa = uAlfa * doku * mix(1.0, 1.3, kopuk);
    // uKopukPayi kapısı: alev köpürmez — kopuklenme:false sistemlerde kopuk=0
    // olduğundan (1.0-kopuk)=1 ile erozyon TAM güçle alev sprite'larına sızıyordu.
    // Yukarıdaki "köpüklenmeyen sistemlerde TÜM beyazlatma kapanır" dersinin
    // devamı: erozyon da yalnız su sistemlerinde çalışır.
    alfa *= 1.0 - benek * (1.0 - kopuk) * 0.35 * uKopukPayi;       // berrak bölgede erozyon (uçta incelme)
    // Çıplak cihaz (görsel kapı düzeltmesi): additive birikme koyu albedoyu bile
    // beyaza toplar — ışıksız kolonun ALFASI da kısılır ki karanlık siluet kalsın
    // (0.5 yetmedi → 0.32; Salih "hiç belli olmuyor" → 0.45'e esnetildi).
    alfa *= mix(0.45, 1.0, uOzIsik);
    // v6 F1 enerji korunumu: iz vGer kat alana yayıldı → parlaklık bölünür
    // (additive'de komşu izler boyuna üst üste biner, bölmezsek kolon patlar).
    // ⚠TABAN (vitrin denetimi): tam vGer bölmesi yüksek-hızlı jetleri (JET III,
    // vGer≈7) neredeyse GÖRÜNMEZ yapıyordu — kolon 1/7 alfaya düşüyordu. 0.7
    // çarpanı bölmeyi yumuşatır (vGer=7 → /4.9, ~%43 daha parlak), max(1.0,…)
    // tabanı düşük jetleri (vGer≈1) AYNEN bırakır → onların dengesi bozulmaz.
    alfa /= max(1.0, vGer * 0.7);
    // v6 F2: mist alfası ÇOK düşük — ilk denemede 0.07 nozul dibinde patladı
    // (yavaş mist dipte birikir + additive üst üste binme = süt topu tuzağı).
    alfa *= mix(1.0, 0.012, vMist);
    // mist yaşla girer-çıkar (izole "yumurta blob" artefaktına karşı yumuşatma)
    alfa *= mix(1.0, smoothstep(0.0, 0.25, vAge), vMist);
    alfa *= 1.0 - smoothstep(0.75, 1.0, vAge);
    alfa *= softFade(vViewZ);
    gl_FragColor = vec4(renk, alfa);
  }
`;

// --- AquaLIGHT 412C halka aydinlatma (v3 F1) ---------------------------------
// Gercek urun: merkez-delikli disk, LED halkasi RGBW. Sahne karsiligi F1'de
// IsikGolu (zemine vuran isima); F2'de emissive halka govdesi eklenir.
// SpotLight/huzme YOK - sayi SINIRSIZ (per-device, shader dizisi gerekmez).
export const HALKA_PRESET = { golYariCap: 2.4, golKazanc: 0.9, hueBasla: 0.0, hizHue: 0.02 };

class HalkaIsik {
  constructor(preset, konum, scene, kunye = null) {
    this.preset = preset;
    this.renk = new THREE.Color();
    this.hueOverride = null;
    this.parlaklikScale = 1.0;
    // v7 IŞIK turu (KART v2 §7): tüm ışıklar aynı golKazanc ile çiziliyordu —
    // oysa 412C 4620 lm, 406C 1746 lm, yani 2.65× fark var ve sahnede
    // hiyerarşi hiç okunmuyordu. katalog.parlaklikOlcek (lumen/4620) doğrudan
    // ışıma kazancını ölçekler. Künye yoksa 1.0 = eski davranış.
    this.lumenOlcek = kunye?.parlaklikOlcek ?? 1;
    this.gol = new IsikGolu(scene, konum, {
      yariCap: preset.golYariCap * (0.72 + 0.28 * this.lumenOlcek),
      kazanc: preset.golKazanc * this.lumenOlcek, renk: '#ffffff'
    });
    if (TANI.halkaGolsuz) this.gol.mesh.visible = false;   // teşhis: 412'nin kendi gölü gizli
    // C ↔ non-C ve LED sayısı künyeden (406=12, 412=24 ⚠çıkarım — KART S3)
    this.disk = halkaDisk(1, { merkezDelik: kunye?.merkezDelik ?? true,
                               ledSayisi: kunye?.ledSayisi ?? 12 });
    this.disk.grup.position.set(konum[0], 0, konum[1]);
    if (TANI.disksiz) this.disk.grup.visible = false;     // teşhis: 412 halka diski gizli
    scene.add(this.disk.grup);
  }
  setHue(h) { this.hueOverride = ((h % 1) + 1) % 1; }
  // v7 IŞIK turu (KART v2 §4): DMX dimleme LİNEER DEĞİL — sürücü, algıyı
  // lineerleştirmek için çıkışı girişin KARESİYLE üretir (square-law). Timeline
  // 0-1 arası "DMX yüzdesi" gönderiyor; ışık şiddeti onun karesi olmalı, yoksa
  // kısık değerler gerçekte olduğundan çok daha parlak görünür (kamaşma
  // dengesi şikâyetinin sessiz sebeplerinden biri). 16-bit fine kanal yok,
  // kuantalama yapma — float sakla.
  setParlaklik(b) {
    const dmx = Math.max(0, b);
    this.parlaklikScale = dmx * dmx;
    this.gol.setMaster(this.parlaklikScale);
    this.disk.setParlaklik(this.parlaklikScale);
  }
  konumla(x, z) { this.gol.konumla(x, z); this.disk.grup.position.set(x, 0, z); }
  sil() { this.gol.sil(); this.disk.sil(); }
  guncelle(t) {
    const pr = this.preset;
    let hue;
    if (this.hueOverride !== null) hue = this.hueOverride;
    else { hue = (pr.hueBasla + t * pr.hizHue) % 1.0; if (hue < 0) hue += 1.0; }
    this.renk.setHSL(hue, 1.0, 0.55);
    this.gol.setRenk(this.renk.r, this.renk.g, this.renk.b);
    this.disk.setRenk(this.renk.r, this.renk.g, this.renk.b);
    this.gol.tik(t);
  }
}

// --- motor kurulumu: derinlik hedefi + cihaz/spot yönetimi (Ders 10 BLOK 9 uyarlaması) ---
export function motorKur(renderer, scene, camera, tani = {}) {
  TANI = tani;                                     // görsel teşhis bayrakları (bkz. TANI tanımı)
  ortakUniformlar.uKameraYakin.value = camera.near;
  ortakUniformlar.uKameraUzak.value = camera.far;

  const dbBoyut = new THREE.Vector2();
  renderer.getDrawingBufferSize(dbBoyut);
  const depthTarget = new THREE.WebGLRenderTarget(dbBoyut.x, dbBoyut.y, { depthBuffer: true, stencilBuffer: false });
  depthTarget.depthTexture = new THREE.DepthTexture(dbBoyut.x, dbBoyut.y);
  depthTarget.depthTexture.format = THREE.DepthFormat;
  depthTarget.depthTexture.type = THREE.UnsignedIntType;
  ortakUniformlar.uDerinlikDoku.value = depthTarget.depthTexture;

  const suCihazlar = new Map();                    // id -> GpuParcaSistemi
  const halkalar = new Map();                      // id -> HalkaIsik (v3: SINIRSIZ, slot dizisi yok)
  let halkaSayac = 0;                              // hueBasla ofseti için (silinenler boşluk bırakabilir, kabul)
  const gizliKayit = new Set();                    // derinlik ön-geçişinde gizlenecek dış nesneler (ör. laminer grup)

  // yogunluk (v3 F5): kalabalık şablon sahnelerinde parçacık bütçesi —
  // kenar×0.55 → sayı ~%30 (30 cihazlık daire şablonu 60fps kalsın diye).
  // v7 PERDE: kunye (katalog kaydı) artık motora akar — CLASSIC/LACE/DIGITAL
  // farkı buradan türer. kunye null ise (eski .aqshow, testler) davranış aynı.
  function suEkle(tur, id, konum, yogunluk = 1, kunye = null) {
    let p = PRESETLER[tur];
    if (tur === 'perde') p = perdePresetTuret(p, kunye);
    if (tur === 'vario') p = varioPresetTuret(p, kunye);   // v7 TUR 2: 151 ↔ 241
    // v7 DRYDECK cila: aile ikiye bölünür — VARIO adı=pompa rampası, SWITCH adı=valf kesme (kart §3)
    if (tur === 'drydeck') {
      // üst plaka zarf tablosundan (kart §8 önceliği ④: kare plaka kararı vardı,
      // gövde çizimi onu yansıtmıyordu — Faz 2 Tur 2/4 bunu kapatıyor)
      p = drydeckPresetTuret(p, kunye, urunZarfi(kunye?.ad ?? '')?.ustPlaka ?? null);
    }
    if (tur === 'pop') p = popPresetTuret(p, kunye);       // v7 POP: künye → top fiziği
    p = zarfPresetTuret(tur, p, kunye);                    // v7 ZARF: künye → ürün hızı
    p = cihazKarakter(p, kunye);                           // v7 CIHAZ: aile-içi karakter (HYDRA/ROLL/PULSE)

    // ⚠v7 POP: taban 48 idi ve KOŞULSUZDU. POP'un bütçesi kenar=8 (damla demeti,
    // ~13 fiziksel damla) olduğu için kalabalık şablonda "seyreltme" onu 8→48'e
    // ÇIKARIYORDU — yani yoğunluk<1 POP'a 36 KAT parçacık verip demeti sise
    // çeviriyordu. Taban artık presetin KENDİ bütçesini aşamaz; büyük cihazlarda
    // (kenar≥48) davranış bit düzeyinde eskisiyle aynı.
    const preset = yogunluk === 1 ? p
      : { ...p, kenar: Math.min(p.kenar, Math.max(48, Math.round(p.kenar * yogunluk))) };
    const c = new GpuParcaSistemi(preset, konum, renderer, scene);
    suCihazlar.set(id, c);
    return c;
  }
  function suSil(id) {
    const c = suCihazlar.get(id);
    if (!c) return;
    c.sil();
    suCihazlar.delete(id);
  }
  // v3: eski spotEkle/spotSil adları korunur (proje.js sözleşmesi) ama artık
  // 412C halka aydınlatma üretir — sınır yok, null dönüş yalnız teorik.
  function spotEkle(id, konum, kunye = null) {
    const preset = { ...HALKA_PRESET, hueBasla: (halkaSayac++ * 0.13) % 1 };
    const h = new HalkaIsik(preset, konum, scene, kunye);
    h.id = id;
    halkalar.set(id, h);
    return h;
  }
  function spotSil(id) {
    const h = halkalar.get(id);
    if (!h) return;
    h.sil();
    halkalar.delete(id);
  }
  function cihaz(id) {
    return suCihazlar.get(id) || halkalar.get(id) || null;
  }
  // v6 F3: her su cihazına en yakın 4 bağımsız halkanın konum+anlık rengini
  // besle (renk hue döngüsüyle her kare değişir → kopyalanır; 30 cihaz × N
  // halka mesafesi JS'de ucuz). Önce halkalar güncellenir ki renk taze olsun.
  function isikBesle() {
    const liste = [...halkalar.values()];
    for (const c of suCihazlar.values()) {
      if (c.preset.isikSonum === false) continue;   // alev kendi ışığıdır, boyanmaz
      const u = c.mat.uniforms;
      const p = c.posVar.material.uniforms.uNozulPos.value;
      liste.sort((a, b) =>
        a.disk.grup.position.distanceToSquared(p) - b.disk.grup.position.distanceToSquared(p));
      const n = Math.min(4, liste.length);
      u.uHalkaSayi.value = n;
      for (let i = 0; i < n; i++) {
        const h = liste[i];
        u.uHalkaPos.value[i].copy(h.disk.grup.position);
        // v7: lümen ölçeği suyu boyayan katkıya da girer (412 ↔ 406 hiyerarşisi
        // yalnız zemin gölünde değil, su kütlesinde de okunmalı)
        u.uHalkaRenk.value[i].copy(h.renk)
          .multiplyScalar(h.parlaklikScale * 1.3 * (h.lumenOlcek ?? 1));
      }
    }
  }
  function adim(dt, showT) {
    for (const h of halkalar.values()) h.guncelle(showT);
    isikBesle();
    for (const c of suCihazlar.values()) c.step(dt, showT);
  }
  function gizleEkle(obj3d) { gizliKayit.add(obj3d); }
  function gizleCikar(obj3d) { gizliKayit.delete(obj3d); }
  function derinlikOnGecisi() {
    for (const c of suCihazlar.values()) c.points.visible = false;
    // Kayıtlı dış nesneler (laminer grup vb.): önceki görünürlüğü sakla,
    // gizle, geri-açarken zorla true YAPMA — setMaster grup.visible'ı kontrol
    // ediyor, master=0 iken açık bırakmak yanlış olurdu.
    const oncekiGorunur = [];
    for (const o of gizliKayit) { oncekiGorunur.push([o, o.visible]); o.visible = false; }
    renderer.setRenderTarget(depthTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    for (const c of suCihazlar.values()) c.points.visible = true;
    for (const [o, v] of oncekiGorunur) o.visible = v;
  }
  function cozunurlukGuncelle() {
    renderer.getDrawingBufferSize(dbBoyut);
    depthTarget.setSize(dbBoyut.x, dbBoyut.y);
    ortakUniformlar.uCozunurluk.value.copy(dbBoyut);
    ortakUniformlar.uPixelYariCap.value = dbBoyut.y * 0.5;
  }
  function toplamParcacik() {
    let s = 0;
    for (const c of suCihazlar.values()) s += c.sayi;
    return s;
  }
  // v6 F6: ripple sim kaynakları — aktif su cihazlarının çarpma noktaları.
  // v7 borç kapandı: kaynak artık nozul DEĞİL, balistik iniş noktası. Eğik
  // cihazlarda (ROBO pan/tilt, SWING süpürmesi) su metrelerce ötede iner;
  // halkayı nozulda açmak gözle yanlıştı. Yön/hız uniform'ları canlı okunur →
  // servo süpürürken ripple kaynağı da süpürür. Çizgi kaynaklı perde tek nokta
  // değil HAT atar (güç hat boyunca bölünür).
  function carpmaNoktalari() {
    const liste = [];
    for (const c of suCihazlar.values()) {
      if (c.master < 0.02) continue;
      // v7 CIHAZ (PULSE): jet yok — nozul üstünde PERİYODİK tek nokta kaynağı →
      // ripple sim eşmerkezli halka dalgalar üretir (keskin darbe = ayrık halkalar,
      // ~1.5 s sönüm). Balistik iniş dalını ATLAR.
      if (c.preset.pulseRipple) {
        const np = c.posVar.material.uniforms.uNozulPos.value;
        if (!Number.isFinite(np.x) || !Number.isFinite(np.z)) continue;
        const faz = c.sonT / (c.preset.pulsePeriyot || 1.3);
        const darbe = Math.pow(0.5 + 0.5 * Math.sin(faz * 6.2831853), 6);   // keskin periyodik darbe
        const pay = c.master * (0.25 + 0.9 * darbe);
        if (pay >= 0.01) liste.push({ x: np.x, z: np.z, guc: pay });
        continue;
      }
      if (c.carpmaGuc <= 0) continue;
      const pu = c.posVar.material.uniforms, vu = c.velVar.material.uniforms;
      const p = pu.uNozulPos.value;
      const hiz = (vu.uHizA.value + vu.uHizB.value) * 0.5 * vu.uHizScale.value;
      const yon = vu.uNozulYon.value;
      const cizgi = pu.uCizgiBoy.value;
      const noktalar = cizgi > 0
        ? inisHatti(p, yon, hiz, cizgi, pu.uYonAci.value, c.zeminOfset.length)
        : [inisNoktasi(p, yon, hiz)].filter(Boolean);
      if (!noktalar.length) continue;
      // Güç iniş hızından türer (statik carpmaGuc yerine) — setHiz ile jet
      // kısılınca ripple de kısılır. Hat örnekleri toplamı tek jetle eşit.
      const pay = balistikGuc(noktalar[0].inisHizi) * c.master / noktalar.length;
      // ⚠Eşik POZİTİF kurulur (`pay < 0.01` DEĞİL): NaN ile her karşılaştırma
      // false döndüğü için eski hâli NaN'ı ripple alanına GEÇİRİYORDU. Alan
      // kendini besleyen FloatType ping-pong olduğundan tek NaN 128²'ye yayılır
      // ve dönüşü yoktur (ripple.js karantina notu). Koordinatlar da elenir —
      // konumla(NaN,…) veya bozuk uniform buraya sızabilir.
      if (!(pay >= 0.01)) continue;
      for (const n of noktalar) {
        if (!Number.isFinite(n.x) || !Number.isFinite(n.z)) continue;
        liste.push({ x: n.x, z: n.z, guc: pay });
      }
    }
    return liste;
  }

  return { suEkle, suSil, spotEkle, spotSil, cihaz, adim,
    derinlikOnGecisi, cozunurlukGuncelle, ortakUniformlar, toplamParcacik,
    gizleEkle, gizleCikar, carpmaNoktalari };
}
