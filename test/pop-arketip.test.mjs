// pop-arketip.test.mjs — AquaPOP JET (1090) yanlış arketip regresyonu (v7 POP).
//
// NE YANLIŞTI: katalogda `arketip: 'switch'` yazıyordu. switch preseti
// speed.b = 6.8 m/s taşır → balistik tepe 6.8²/2g = 2.36 m, yani ekranda
// 2.4 METRELİK BİR SU KOLONU. Karakter kartı (docs/cihaz-karakter-kartlari.md,
// "AquaPOP JET (1090) — kartı geldi ⚠ BİZDE YANLIŞ") bunun tam tersini
// söylüyor: "KOLON YOK — Ø3mm orifisten KÜÇÜK SU TOPU/damla demeti (~20-40cm)
// fırlar, iri BERRAK damlalar, köpük yok". Ekrandaki cihaz 6-12 kat yanlıştı.
// Kare kanıtı: _kiyas.local/pop/once_switch.png (kolon 1 m'lik kadrajı taşıyor).
//
// NEDEN BÖYLE DÜZELTİLDİ: ayrı 'pop' arketipi + motor.popTuret(). Sayılar
// jet/vario presetinden ölçeklenmedi — kartın YÜKSEKLİĞİNDEN türetildi. Bu
// dosya o türetimi kilitler; biri hızı "biraz artırırsa" test kırmızıya döner.
//
// motor.js three'ye bağlı olduğu için Node'da doğrudan import EDİLEMEZ —
// alev-renk.test.mjs'teki sahte-modül deseniyle data: URL'den yükleniyor,
// böylece GERÇEK PRESETLER + gerçek popPresetTuret okunur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { urunBul } from '../studio/data/katalog.js';
import { urunZarfi } from '../studio/data/zarf.js';   // v7 ZARF: switch hizi artik buradan

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motorKaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');
const govdeKaynak = fs.readFileSync(path.join(KOK, 'studio/js/govde.js'), 'utf8');

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
      'starGovde', 'torchGovde', 'perdeGovde', 'varioGovde', 'bosGovde', 'popGovde']))
  .replace(/^import \{ inisNoktasi, inisHatti.*$/m,
    'const inisNoktasi = () => {}, inisHatti = () => {}, balistikGuc = () => {};')
  .replace(/^import \{ KATMAN \}.*$/m, 'const KATMAN = { SU_HACIM: 0 };')
  .replace(/^import \{ hatKazanclari \}.*$/m, 'const hatKazanclari = () => ({ boyama: 0, boru: 0 });')
  .replace(/^import \{ gpuBaslat, gpuDok \}.*$/m, 'const gpuBaslat = () => ({}), gpuDok = () => {};')
  // v7 ZARF: zarf.js SAF bir modul — STUB'LANMAZ, gercegi yuklenir (preset hizlari
  // ondan turuyor). data: URL'de goreli yol cozulemedigi icin mutlak file:// yapilir.
  .replace(/'\.\.\/data\/zarf\.js'/,
    `'${new URL('../studio/data/zarf.js', import.meta.url).href}'`);
const { PRESETLER, popPresetTuret } = await import('data:text/javascript;base64,' +
  Buffer.from(kaynak, 'utf8').toString('base64'));

const G = 9.81;
const KUNYE = urunBul('AquaPOP JET');
const POP = PRESETLER.pop;
const tepe = (v) => v * v / (2 * G);          // Torricelli h = v²/2g

// ---------------------------------------------------------------- künye kapısı
test('AquaPOP JET artık switch DEĞİL, kendi arketipinde', () => {
  assert.equal(KUNYE.arketip, 'pop',
    'POP yeniden switch-e baglanmis — ekranda 2.36 m kolon demek');
  assert.ok(PRESETLER.pop, 'pop preseti yok');
  assert.ok(KUNYE.pop, 'katalogda pop kunye blogu yok — preset neyden turesin?');
});

test('künye kartın verdiği ölçüleri taşır, uydurma alan yok', () => {
  const s = KUNYE.pop;
  assert.equal(s.tepeMinM, 0.20);            // kart "~20-40 cm"
  assert.equal(s.tepeMaksM, 0.40);
  assert.equal(s.orifisMm, 3);               // kart "Ø3mm orifis"
  assert.equal(s.ledW, 3);                   // kart "ENTEGRE 3W RGB Power LED"
  assert.equal(s.flansMm, 80);               // kart "Ø80 üst flanş"
  assert.equal(s.boyMm, 287);                // kart "287 mm"
  // Lümen katalogda BASILI DEĞİL → uydurulmamalı (parlaklikOlcek 1.0 kalır ve
  // ısık gucten turetilir). Bu satir "eksik veriyi doldurma" refleksinin kilidi.
  assert.equal(KUNYE.teknik.lumen, undefined, 'POP icin uydurma lumen eklenmis');
});

// ------------------------------------------------------- ① yükseklik → hız
test('doğum hızı YÜKSEKLİKTEN türer (Torricelli), presetten kopyalanmaz', () => {
  assert.ok(Math.abs(POP.particle.speed.a - Math.sqrt(2 * G * 0.20)) < 1e-9,
    `hiz.a ${POP.particle.speed.a} != sqrt(2g*0.20) = 1.981`);
  assert.ok(Math.abs(POP.particle.speed.b - Math.sqrt(2 * G * 0.40)) < 1e-9,
    `hiz.b ${POP.particle.speed.b} != sqrt(2g*0.40) = 2.801`);
});

test('POP motorun EN YAVAŞ doğumlu su cihazı — jet ölçeğinden 3-8 kat aşağıda', () => {
  // Bir jet/vario presetini "biraz kucultmek" bu mertebeye inmez; testin varlik
  // sebebi de bu (gorev notu: sayiyi yukseklikten TURET).
  for (const ad of ['switch', 'vario', 'aquajet', 'duz_jet', 'star', 'geyser', 'air'])
    assert.ok(POP.particle.speed.b < PRESETLER[ad].particle.speed.b,
      `pop hizi ${ad}-den yavas degil`);
});

// ------------------------------------------- ② "KOLON DEĞİL TOP" — tepe tavanı
test('tepe tavanı: balistik tepe kartın 20-40 cm penceresinde KALIR', () => {
  const hMin = tepe(POP.particle.speed.a), hMaks = tepe(POP.particle.speed.b);
  assert.ok(Math.abs(hMin - 0.20) < 1e-6, `en dusuk tepe ${hMin.toFixed(3)} m != 0.20`);
  assert.ok(Math.abs(hMaks - 0.40) < 1e-6, `en yuksek tepe ${hMaks.toFixed(3)} m != 0.40`);
  // Asil bekci: yarim metreyi gecen her sey KOLON-dur, POP degildir.
  assert.ok(hMaks <= 0.5, `POP kolona donmus: tepe ${hMaks.toFixed(2)} m`);
});

// Esik 4×: ailenin EN KISA kolonu drydeck (5.8 m/s → 1.71 m) POP-un 4.3 kati.
// Yani "en az 4 kat" motorun bugunku en yakin kolonuna gore bile gecerli, ve
// POP kolon mertebesine tirmanirsa ilk kirilan bu olur.
test('POP her su kolonundan en az 3 KAT alçak (switch regresyonu geri gelmesin)', () => {
  // ⚠v7 ZARF turunda esik 4 → 3'e indi. Sebep bir gevseme DEGIL, bir DUZELME:
  // drydeck'in hizi artik elle yazili 5.8 m/s (1.71 m) degil, AquaVARIO
  // DryDECK'in katalog zarfi (4.97 m/s → 1.26 m). Gomme meydan cihazi ile POP
  // arasindaki GERCEK boy farki 3.15 kat; eski 4 kati elle sabitin sisirdigi
  // bir farkti. Testin asil amaci korunuyor: POP hicbir kolon cihaziyla
  // KARISMAMALI. Ayni turda switch TERSINE buyudu (2.36 → 4.20 m).
  const hPop = tepe(POP.particle.speed.b);
  for (const ad of ['switch', 'vario', 'aquajet', 'star', 'drydeck'])
    assert.ok(tepe(PRESETLER[ad].particle.speed.b) / hPop >= 3,
      `${ad} ile POP arasindaki boy farki kapanmis — POP yine kolon gibi duruyor`);
  // switch artik katalog zarfindan geliyor (tipik 4.2 m). Kayit altinda dursun.
  assert.ok(tepe(PRESETLER.switch.particle.speed.b) > 4,
    'switch preseti degismis; POP kiyasi icin bu kayit guncellenmeli');
});

test('paket kendi tırmanma boyundan uzun DEĞİL — top okunur, kısa kolon değil', () => {
  // Atim penceresi boyunca cikan su sutununun boyu L = v·atim. L, cihazin
  // tirmanma yuksekligini asarsa ekranda yine bir "kisa kolon" olur.
  const L = POP.particle.speed.b * POP.salvo.atimSn;
  assert.ok(L <= 0.20 + 1e-9, `paket boyu ${L.toFixed(3)} m, tepeMin 0.20 m-yi asiyor`);
});

// ----------------------------------------------------- ③ ömür ↔ uçuş süresi
test('ömür TAM uçuş süresidir (2v/g) — damla yerin altında yaşamaz', () => {
  const p = POP.particle;
  assert.ok(Math.abs(p.life.a - 2 * p.speed.a / G) < 1e-9,
    `omur.a ${p.life.a} != 2v/g = ${(2 * p.speed.a / G).toFixed(4)}`);
  assert.ok(Math.abs(p.life.b - 2 * p.speed.b / G) < 1e-9,
    `omur.b ${p.life.b} != 2v/g = ${(2 * p.speed.b / G).toFixed(4)}`);
  // Somut pencere: 0.40 - 0.58 s. Motorun en KISA omurlu su cihazi olmali.
  assert.ok(p.life.b < 0.6, `omur ${p.life.b.toFixed(2)} s — POP icin cok uzun`);
  for (const ad of ['switch', 'vario', 'aquajet', 'drydeck', 'star', 'air'])
    assert.ok(p.life.b < PRESETLER[ad].particle.life.b, `pop omru ${ad}-den kisa degil`);
});

// -------------------------------------------------------------- ④ salvo yeniden kullanımı
test('salvo AquaAIR mekanizmasının aynısı — ama POP çok daha hızlı atar', () => {
  assert.ok(POP.salvo, 'POP salvosuz — atim karakteri kaybolmus');
  const periyot = POP.salvo.atimSn + POP.salvo.reloadSn;
  const airPeriyot = PRESETLER.air.salvo.atimSn + PRESETLER.air.salvo.reloadSn;
  assert.ok(periyot < airPeriyot / 5,
    `POP periyodu ${periyot.toFixed(2)} s — AIR-in (${airPeriyot}) yaninda hizli degil`);
  assert.ok(POP.salvo.atimSn < PRESETLER.air.salvo.atimSn, 'POP atimi AIR-den kisa olmali');
  // AIR salvo sozlesmesi POP-ta da gecerli: omur < reload, yoksa pencere
  // acilirken bir kisim damla hala uctugundan slug bolunur.
  assert.ok(POP.particle.life.b < POP.salvo.reloadSn,
    `omur ${POP.particle.life.b} >= reload ${POP.salvo.reloadSn} — slug bolunur`);
  // Reload turetimi: pencerenin sonunda dogan en hizli damlanin inis ani.
  assert.ok(Math.abs(POP.salvo.reloadSn - (POP.salvo.atimSn + POP.particle.life.b)) < 1e-9,
    'reload atim+ucus suresinden turemiyor');
});

test('salvo uniformları POP için de sıfırdan farklı beslenir (kapı ortak)', () => {
  // Mekanizma yeniden yazilmadi, yeniden KULLANILDI: preset.salvo okuyan tek
  // kapi GpuParcaSistemi ctor-udur, arketipe bakmaz.
  assert.match(kaynak, /this\.salvoAtim = preset\.salvo\?\.atimSn \?\? 0/);
  assert.match(kaynak, /bool salvoKapali\(/);
});

// ------------------------------------------------------ ⑤ berrak iri damla, köpük yok
test('BERRAK damla: aeration motorun en düşüğü, mist ve köpük yok', () => {
  const p = POP.particle;
  assert.ok(p.aeration <= 0.05, `aeration ${p.aeration} — POP kopurmez`);
  for (const ad of ['switch', 'vario', 'aquajet', 'geyser', 'air', 'star', 'drydeck'])
    assert.ok(p.aeration < PRESETLER[ad].particle.aeration,
      `pop aeration-i ${ad}-den dusuk degil (berrak su boyanmaz, iletir)`);
  assert.equal(p.mist ?? 0, 0, 'POP sis uretmez — damla demeti, sprey degil');
  assert.equal(p.doku, 'damla', 'salkim dokusu = kopuk/sprey; POP iri berrak damla');
});

test('damla boyu Ø3mm orifisten Rayleigh ile türer (elle yazılmaz)', () => {
  const gorselKat = 0.04 / (1.89 * 0.012);          // vario Ø12 kalibrasyonu
  assert.ok(Math.abs(POP.particle.size - 1.89 * 0.003 * gorselKat) < 1e-9,
    `size ${POP.particle.size} Rayleigh turetiminden sapmis`);
});

test('bütçe AZ: damla demeti, sis değil', () => {
  assert.ok(POP.kenar <= 16, `kenar ${POP.kenar} — demet degil bulut olur`);
  for (const ad of ['switch', 'vario', 'aquajet', 'geyser', 'air', 'perde'])
    assert.ok(POP.kenar < PRESETLER[ad].kenar, `pop butcesi ${ad}-den kucuk degil`);
});

test('ama GÖRÜNÜR: ekran yoğunluğu aquajet tabanının altına düşmez', () => {
  // AIR turunun kaybolma hatasinin aynisi POP-ta da yasandi: kenar 8 (fiziksel
  // damla sayisi) ile yogunluk aquajet-in 0.33 kati cikti — AIR-in kayboldugu
  // ORANIN AYNISI. Olcut air-salvo.test.mjs-teki formulun ikizi.
  const olcut = (p) => {
    const hizB = p.particle.speed.b, boyut = p.particle.size;
    const h = hizB * hizB / (2 * G);
    const alan = h * 2 * p.shape.angle * h;
    const vGer = Math.min(7, 1 + p.particle.gerdirme
      * (hizB * (1 / 60) / Math.tan(55 * Math.PI / 360) / (boyut * 1.1)));
    return p.kenar * p.kenar * p.particle.alpha * boyut * boyut / alan / vGer;
  };
  assert.ok(olcut(POP) >= olcut(PRESETLER.aquajet),
    `POP yogunlugu aquajet-in altinda: ${olcut(POP).toExponential(2)} < ` +
    `${olcut(PRESETLER.aquajet).toExponential(2)} — cihaz karede kaybolur`);
});

test('seyreltme POP bütçesini BÜYÜTEMEZ (48 tabanı koşullu)', () => {
  // Kalabalik sablonda yogunluk<1 gelir; eski kod Math.max(48, ...) ile POP-u
  // 8 -> 48 kenara CIKARIYORDU (36 kat parcacik, demet siste kaybolurdu).
  assert.match(kaynak, /Math\.min\(p\.kenar, Math\.max\(48,/);
});

// ---------------------------------------------------------------- ⑥ ışık
test('entegre 3W LED 412C referansına göre ölçeklenir (lümen uydurulmadan)', () => {
  const olcek = Math.cbrt(3 / 48);                  // 412C = 48 W / 4620 lm
  assert.ok(Math.abs(POP.gol.kazanc - 0.5 * olcek) < 1e-9, 'isik golu gucten turemiyor');
  // 4620 lm-lik 412C-nin golunun yaninda kucuk kalmali.
  assert.ok(POP.gol.yariCap < PRESETLER.vario.gol.yariCap / 2,
    'POP isik golu 3W bir LED icin cok genis');
});

// ---------------------------------------------------------------- gövde
test('gövde Ø80 flanş + yan kutu, 287 mm — switch bloğu değil', () => {
  assert.equal(POP.govdeTip, 'pop');
  assert.deepEqual(POP.popBoy, [80, 287]);
  assert.match(govdeKaynak, /export function popGovde/);
  // Kritik: govde su topunu yutmamali. switchGovde-nin nozul ucu 0.28+0.06 m,
  // yani POP-un 0.40 m-lik topuyla ayni yukseklikteydi.
  assert.match(govdeKaynak, /popGovde[\s\S]*?flans\.position\.y = flansH \/ 2 - 0\.004/);
});

// ---------------------------------------------------------- türetim sözleşmesi
test('künyesiz çağrı temel preseti döndürür; POP künyesi ÖZDEŞ sonuç verir', () => {
  assert.equal(popPresetTuret(POP, null), POP);
  assert.equal(popPresetTuret(POP, { ad: 'x' }), POP);
  const t = popPresetTuret(POP, KUNYE);
  assert.deepEqual(t.particle.speed, POP.particle.speed);
  assert.deepEqual(t.particle.life, POP.particle.life);
  assert.deepEqual(t.salvo, POP.salvo);
});

test('yükseklik künyeden değişince TÜM zincir kendiliğinden düzelir', () => {
  // Motorda POP sabiti olmadiginin kaniti: tek alan degisti, hiz/omur/salvo/
  // kopuk hepsi takip etti (spec §T-E — yeni POP modeli kod degisikligi istemez).
  const t = popPresetTuret(POP, { pop: { ...KUNYE.pop, tepeMaksM: 0.9 } });
  assert.ok(Math.abs(t.particle.speed.b - Math.sqrt(2 * G * 0.9)) < 1e-9);
  assert.ok(Math.abs(t.particle.life.b - 2 * t.particle.speed.b / G) < 1e-9);
  assert.ok(t.salvo.reloadSn > POP.salvo.reloadSn, 'salvo yukseklikten kopmus');
  assert.ok(t.kopuk.disR > POP.kopuk.disR, 'carpma halkasi yukseklikten kopmus');
});

test('motor pop presetini künyeyle besler (kapı bagli)', () => {
  assert.match(kaynak, /if \(tur === 'pop'\) p = popPresetTuret\(p, kunye\)/);
});

// ------------------------------------------------------------- REGRESYON KAPISI
test('diğer arketipler POP turundan etkilenmedi', () => {
  // Yeni alanlar (salvo/popBoy) yalnizca kendi cihazlarinda olmali.
  for (const [ad, p] of Object.entries(PRESETLER)) {
    if (ad === 'pop') continue;
    assert.equal(p.popBoy, undefined, ad + ' presetine popBoy sizmis');
    if (ad !== 'air') assert.equal(p.salvo, undefined, ad + ' presetine salvo sizmis');
  }
  // Kolon cihazlarinin karakter sayilari yerinde (POP turu onlara dokunmadi).
  // ⚠v7 ZARF: switch'in hizi artik elle sabit DEGIL, AquaSWITCH zarfindan
  // (tipik 4.2 m → 9.0777 m/s). Sayi buraya yazilmadi, ZARFTAN okunuyor —
  // yoksa kaldirdigimiz elle sabiti testin icinde diriltmis olurduk.
  assert.equal(PRESETLER.switch.particle.speed.b, urunZarfi('AquaSWITCH').su.hizMs);
  assert.equal(PRESETLER.vario.particle.speed.b, 7.67);   // vario kendi kunye turetecinde, zarfa BAGLANMADI
  assert.equal(PRESETLER.air.salvo.atimSn, 0.5);
});
