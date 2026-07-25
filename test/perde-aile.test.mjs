// WATER CURTAIN ailesinin (CLASSIC 1270 / LACE 1275 / DIGITAL 1120) ayrışma
// ve render regresyon testleri — v7 PERDE turu, 2026-07-18.
//
// ŞİKÂYET (kare kanıtı _kiyas.local/ajanF_once.png): katalogdaki ÜÇ perde de
// ekranda BİREBİR aynı görünüyordu; üstelik perde "akan su" değil hareketsiz
// buzlu cam gibi okunuyordu ve suyun havuza çarptığı yer hiç belli değildi.
//
// KÖK SEBEPLER (tek değişkenli izolasyonla kanıtlandı):
//  1) AYRIŞMA YOK: proje.js `ekle()` ürün adını alıyor ama motor.suEkle'ye
//     GEÇİRMİYORDU (ışıklarda geçiriyordu — spotEkle(urunBul(urun))). Motor
//     yalnız 'perde' türünü görüyor, tek preset kullanıyordu. Ürün adı görsele
//     hiç ulaşmıyordu.
//  2) SÜREKLİ LEVHA: doğum noktası çizgi boyunca DÜZGÜN rastgeleydi → perde bir
//     su levhası oluyordu. Gerçek ürün bir DELİK DİZİSİDİR (CLASSIC: 30 nozul
//     Ø2 mm ✅künye), yani iplik iplik akar.
//  3) ÇARPMA ÇİZGİSİ YOK: balistik.inisHatti ZATEN bağlıydı (headless probe:
//     3 nokta, pay 0.167 → ripple besleniyordu). Eksik olan ripple DEĞİL, zemin
//     imzasının GEOMETRİSİYDİ: KopukHalka/IsikGolu/SicramaTaci dairesel ve cihaz
//     merkezine sabitti → 2.6 m'lik perdenin altında tek küçük disk kalıyordu.
//  4) AKIŞ YOK: iplikler piksel-düz iniyordu (tel örgü). İlk düzeltme denemem
//     savrulma() alanıydı ve HİÇ İŞE YARAMADI: savrulma().x yalnız p.y/p.z'ye
//     bağlı, p.x'e değil → aynı yükseklikteki tüm iplikler birebir aynı kayıyor,
//     perde tek parça levha gibi salınıyordu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KATALOG, urunBul } from '../studio/data/katalog.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motorKaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');
const govdeKaynak = fs.readFileSync(path.join(KOK, 'studio/js/govde.js'), 'utf8');
const projeKaynak = fs.readFileSync(path.join(KOK, 'studio/js/proje.js'), 'utf8');

// motor.js three'ye bağlı → alev-renk.test.mjs'teki sahte-modül desenini kullanır.
const SAHTE_THREE = `
const _ciz = { createRadialGradient: () => ({ addColorStop(){} }), fillRect(){},
  beginPath(){}, arc(){}, fill(){}, set fillStyle(v){}, get fillStyle(){ return ''; } };
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => _ciz }) };
const THREE = {
  CanvasTexture: class { constructor(c){ this.image = c; } },
  Vector2: class { constructor(x=0,y=0){ this.x=x; this.y=y; } },
  Vector3: class { constructor(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; } },
  Color: class { constructor(){ this.r=0; this.g=0; this.b=0; } },
  AdditiveBlending: 2, FloatType: 'float', DepthFormat: 0, UnsignedIntType: 0
};`;
const bosModul = (adlar) => adlar.map(a => `const ${a} = () => {};`).join('\n');
const kaynak = motorKaynak
  .replace(/^import \* as THREE from 'three';$/m, SAHTE_THREE)
  .replace(/^import \{ GPUComputationRenderer \}[\s\S]*?;$/m, 'const GPUComputationRenderer = class {};')
  .replace(/^import \{ KopukHalka, IsikGolu, SicramaTaci \}.*$/m,
    bosModul(['KopukHalka', 'IsikGolu', 'SicramaTaci']))
  .replace(/^import \{ halkaDisk, switchGovde[\s\S]*?;$/m,
    bosModul(['halkaDisk', 'switchGovde', 'jetGovde', 'roboGovde', 'drydeckGovde', 'airGovde',
      'starGovde', 'torchGovde', 'perdeGovde', 'varioGovde', 'bosGovde']))
  .replace(/^import \{ inisNoktasi, inisHatti.*$/m,
    'const inisNoktasi = () => {}, inisHatti = () => {}, balistikGuc = () => {};')
  .replace(/^import \{ KATMAN \}.*$/m, 'const KATMAN = { SU_HACIM: 0 };')
  .replace(/^import \{ hatKazanclari \}.*$/m, 'const hatKazanclari = () => ({ boyama: 0, boru: 0 });')
  .replace(/^import \{ gpuBaslat, gpuDok \}.*$/m, 'const gpuBaslat = () => ({}), gpuDok = () => {};')
  // v7 ZARF: zarf.js SAF bir modul — STUB'LANMAZ, gercegi yuklenir (preset hizlari
  // ondan turuyor). data: URL'de goreli yol cozulemedigi icin mutlak file:// yapilir.
  .replace(/'\.\.\/data\/zarf\.js'/,
    `'${new URL('../studio/data/zarf.js', import.meta.url).href}'`);
const { PRESETLER, perdePresetTuret } = await import('data:text/javascript;base64,' +
  Buffer.from(kaynak, 'utf8').toString('base64'));

const PERDELER = ['CLASSIC WATER CURTAIN', 'LACE WATER CURTAIN', 'DIGITAL WATER CURTAIN'];
const turet = (ad) => perdePresetTuret(PRESETLER.perde, urunBul(ad));

// --- kök sebep 1: ayrışma -----------------------------------------------------

test('künye: üç perdenin de kendi `perde` bloğu var (ayrışmanın tek veri kaynağı)', () => {
  for (const ad of PERDELER) {
    const k = urunBul(ad);
    assert.ok(k?.perde, `${ad} künyesinde perde bloğu yok — motor ayrıştıramaz`);
    assert.ok(k.perde.nozul > 0, `${ad}: nozul adedi olmalı`);
    assert.ok(k.perde.capMm > 0, `${ad}: nozul çapı olmalı`);
  }
});

test('CLASSIC künyeden BİREBİR: 30 nozul, Ø2 mm (uydurma değil, katalog)', () => {
  const k = urunBul('CLASSIC WATER CURTAIN');
  assert.equal(k.perde.nozul, 30);
  assert.equal(k.perde.capMm, 2.0);
  // teknik.nozul katalog künyesinden geliyor — ikisi çelişmemeli
  assert.equal(k.teknik.nozul, k.perde.nozul, 'künye ile perde bloğu çelişiyor');
});

test('üç perde EKRANDA AYRIŞIR — sütun sayısı ve damla boyu üçünde de farklı', () => {
  const p = PERDELER.map(turet);
  const sutunlar = p.map(x => x.perdeSutun);
  const boylar = p.map(x => x.particle.size);
  assert.equal(new Set(sutunlar).size, 3, `sütun sayıları ayrışmalı, gelen ${sutunlar}`);
  assert.equal(new Set(boylar).size, 3, `damla boyları ayrışmalı, gelen ${boylar}`);
});

test('damla kalınlığı nozul ÇAPIYLA orantılı (dantel ince, digital kalın)', () => {
  const [cls, lace, dig] = PERDELER.map(turet);
  assert.ok(lace.particle.size < cls.particle.size,
    'LACE Ø1.2 < CLASSIC Ø2.0 olmalı — dantel ipliği daha ince');
  assert.ok(dig.particle.size > cls.particle.size,
    'DIGITAL Ø2.5 > CLASSIC Ø2.0 olmalı');
});

test('DIGITAL tek başına solenoid KESİNTİSİ taşır (tanımlayıcı özelliği)', () => {
  const [cls, lace, dig] = PERDELER.map(turet);
  assert.equal(cls.perdeKesinti, 0, 'CLASSIC sürekli akar');
  assert.equal(lace.perdeKesinti, 0, 'LACE sürekli akar');
  assert.ok(dig.perdeKesinti > 0, 'DIGITAL kesintisiz kalırsa CLASSIC ile aynı görünür');
});

test('solenoid kesintisi damla ÖMRÜNDEN uzun sürer (yoksa ekranda görünmez)', () => {
  // Bu tam olarak yaşanan hataydı: kesintiHz 3.2 iken adım 0.31 s, damla ömrü
  // ~0.85 s → kapanan sütun hâlâ eski suyunu gösteriyordu, boşluk hiç açılmadı.
  const dig = turet('DIGITAL WATER CURTAIN');
  const adim = 1 / dig.perdeKesintiHz;
  assert.ok(adim > dig.particle.life.b,
    `solenoid adımı (${adim.toFixed(2)} s) damla ömründen (${dig.particle.life.b} s) ` +
    'uzun olmalı, yoksa kesinti düşen suyun içinde kaybolur');
});

test('künyesiz çağrı eski davranışta kalır (geriye uyum: eski .aqshow)', () => {
  assert.equal(perdePresetTuret(PRESETLER.perde, null), PRESETLER.perde);
  assert.equal(perdePresetTuret(PRESETLER.perde, { ad: 'x' }), PRESETLER.perde);
});

test('perde OLMAYAN ürünlere perde bloğu sızmamış', () => {
  for (const u of KATALOG) {
    if (PERDELER.includes(u.ad)) continue;
    assert.equal(u.perde, undefined, `${u.ad} perde bloğu taşıyor — arketip karışmış`);
  }
});

// --- kök sebep 1'in bağlantısı: künye motora ULAŞMALI -------------------------

test('proje.js künyeyi SUYA da geçirir (ayrışmanın kırıldığı yer burasıydı)', () => {
  assert.match(projeKaynak, /suEkle\([^)]*urunBul\(urun\)/,
    'proje.js suEkle çağrısında urunBul(urun) yoksa motor ürünü göremez → ' +
    'üç perde yine birebir aynı görünür (kök sebep 1)');
});

test('motor.suEkle künyeyi perde presetine uygular', () => {
  assert.match(motorKaynak, /function suEkle\(tur, id, konum, yogunluk = 1, kunye = null\)/);
  assert.match(motorKaynak, /perdePresetTuret\(p, kunye\)/);
});

// --- kök sebep 2: sütunlar ---------------------------------------------------

test('perde doğumu nozul SÜTUNUNA yuvarlanır (sürekli levha değil)', () => {
  assert.match(motorKaynak, /uniform float uSutunSayi;/,
    'uSutunSayi kalkarsa perde yine su levhası olur (kök sebep 2)');
  assert.match(motorKaynak, /floor\(u \* uSutunSayi\)/);
});

test('gövdedeki nozul deliği sayısı ekrandaki sütun sayısıyla AYNI kaynaktan', () => {
  assert.match(motorKaynak, /perdeGovde\(preset\.shape\.length[^)]*preset\.perdeSutun/s,
    'gövde künye nozul adedini almazsa 30 sütun akarken 29 delik çizilir');
  assert.match(govdeKaynak, /perdeGovde\(boy = 2\.6, yukseklik = 2\.5, nozulSayi = 0\)/);
});

// --- kök sebep 3: çarpma çizgisi ---------------------------------------------

test('çizgi kaynaklı cihazın zemin imzası da ÇİZGİ (tek disk değil)', () => {
  assert.match(motorKaynak, /this\.zeminOfset = Array\.from/,
    'zeminOfset kalkarsa perdenin çarpma şeridi tek küçük diske düşer (kök sebep 3)');
  // ripple örnek sayısı zemin diski sayısıyla aynı olmalı (sabit 3 değil)
  assert.match(motorKaynak, /inisHatti\(p, yon, hiz, cizgi, pu\.uYonAci\.value, c\.zeminOfset\.length\)/);
});

test('nokta cihazlarda zemin imzası TEK eleman kalır (jet/geyser etkilenmemeli)', () => {
  // cizgiBoy yoksa zeminOfset = [0] — eski davranışın birebir aynısı.
  assert.match(motorKaynak, /this\.zeminOfset = \[0\];/);
});

// --- kök sebep 4: akış hissi -------------------------------------------------

test('salınım YALNIZ perdede açık — jet/geyser/vario dokunulmamalı', () => {
  assert.match(motorKaynak, /const salinim = cizgiBoy > 0 \? \(preset\.perdeSalinim \?\? [\d.]+\) : 0;/,
    'salinim çizgi kaynağa bağlı değilse tüm su cihazları savrulur (kapsam kaçağı)');
});

test('salınım fazı İPLİĞE (pos.x) bağlı — komşu iplikler ayrışsın', () => {
  // İlk denemede savrulma() kullanıldı ve hiç fark etmedi: savrulma().x p.x'e
  // bağlı DEĞİL → tüm iplikler birlikte kayıyordu (kök sebep 4).
  assert.match(motorKaynak, /float iplik = pos\.x \* [\d.]+;/,
    'faz pos.x\'e bağlanmazsa perde tek parça levha gibi salınır, iplik ayrışmaz');
  // dalga iplik boyunca AŞAĞI yürümeli: pos.y ile t zıt işaretli
  assert.match(motorKaynak, /sin\(iplik \+ pos\.y \* [\d.]+ - t \* [\d.]+\)/);
});

test('düşerken damla irileşir (iplik → boncuk kopması)', () => {
  for (const ad of PERDELER) {
    assert.ok(turet(ad).particle.dusmeBuyume > 1.0,
      `${ad}: dusmeBuyume 1.0'da kalırsa perde donuk buzlu cam gibi okunur`);
  }
});

// --- kök sebep b: üst ray artefaktı ------------------------------------------

test('ray LED şeridi piksel-altı DEĞİL (beyaz kesikli çizgi regresyonu)', () => {
  // Artefaktın kaynağı: 15×15 mm MeshBasicMaterial saf beyaz çubuk, 2.5 m'de
  // ~1 piksele düşüp örtüşüyor ve kesik kesik yanıyordu. Bu kadrajda 1 px ≈ 11 mm.
  const m = govdeKaynak.match(/const serit = new THREE\.Mesh\(new THREE\.BoxGeometry\(boy, ([\d.]+), ([\d.]+)\)/);
  assert.ok(m, 'perde LED şeridi bulunamadı');
  assert.ok(parseFloat(m[1]) >= 0.04,
    `LED şeridi yüksekliği ${m[1]} m — 0.04 m altında yine piksel-altı olur ve kesikli çizgi geri gelir`);
  assert.doesNotMatch(govdeKaynak,
    /const ledMat = new THREE\.MeshBasicMaterial\(\{ color: 0xffffff \}\);\s*\/\/ ray içi LED şeridi/,
    'perde LED şeridi MeshBasic saf beyaza dönmüş — örtüşme artefaktı geri gelir');
});

test('üst ray BORU (gövde gibi okunsun) — ince kutu değil', () => {
  assert.match(govdeKaynak,
    /const ray = new THREE\.Mesh\(new THREE\.CylinderGeometry\(0\.0[4-9]\d*, 0\.0[4-9]\d*, boy \+ 0\.1/,
    'ray tekrar ince kutuya dönerse üst kenar yine tek piksellik çizgi olur');
});
