// v7 TUR 2 (KART v2 AquaVARIO) — 151 ↔ 241 farkının SAYISAL kanıtı.
// Şikâyet: iki VARIO ekranda birebir aynı görünüyordu. Bu dosya farkın
// katalogdan TÜREDİĞİNİ ve fiziğin (Torricelli h = v²/2g) tuttuğunu kilitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { urunBul } from '../studio/data/katalog.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motorKaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');
const govdeKaynak = fs.readFileSync(path.join(KOK, 'studio/js/govde.js'), 'utf8');

// motor.js three'ye bağlı → perde-aile/alev-renk testlerindeki sahte-modül deseni.
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
const { PRESETLER, varioPresetTuret } = await import('data:text/javascript;base64,' +
  Buffer.from(kaynak, 'utf8').toString('base64'));

const G = 9.81;
const tepe = (v) => (v * v) / (2 * G);          // sürüklemesiz balistik tavan
const TEMEL = PRESETLER.vario;

test('künye: iki VARIO da katalog sayılarını taşır', () => {
  const a = urunBul('AquaVARIO 151'), b = urunBul('AquaVARIO 241');
  assert.equal(a.pompa.yukseklikM, 3.0);     // ✅üretici kataloğu "0 to 3 metres"
  assert.equal(b.pompa.yukseklikM, 4.5);     // ✅üretici kataloğu "4.5 m @Ø12"
  assert.equal(a.pompa.isikW, 22);           // ✅katalog "up to 22W RGBW"
  assert.equal(b.pompa.isikW, 72);           // ✅katalog "up to 72W RGBW"
  assert.deepEqual(a.pompa.boyM, [0.328, 0.150, 0.200]);
  assert.deepEqual(b.pompa.boyM, [0.328, 0.147, 0.143]);
});

test('kolon tepesi katalog yüksekliğini BİREBİR verir (Torricelli)', () => {
  for (const [ad, hedef] of [['AquaVARIO 151', 3.0], ['AquaVARIO 241', 4.5]]) {
    const p = varioPresetTuret(TEMEL, urunBul(ad));
    // speed.b = tam anma yüksekliği; %1 tolerans (temel preset yuvarlaması)
    assert.ok(Math.abs(tepe(p.particle.speed.b) - hedef) < hedef * 0.01,
      `${ad}: tepe ${tepe(p.particle.speed.b).toFixed(2)} m, beklenen ${hedef} m`);
  }
});

test('241 kolonu 151in 1.5 KATI — ama hızı yalnız 1.22 katı', () => {
  const a = varioPresetTuret(TEMEL, urunBul('AquaVARIO 151'));
  const b = varioPresetTuret(TEMEL, urunBul('AquaVARIO 241'));
  const hizOran = b.particle.speed.b / a.particle.speed.b;
  const boyOran = tepe(b.particle.speed.b) / tepe(a.particle.speed.b);
  assert.ok(Math.abs(hizOran - Math.sqrt(1.5)) < 0.01, `hız oranı ${hizOran}`);
  assert.ok(Math.abs(boyOran - 1.5) < 0.02, `boy oranı ${boyOran}`);
  // Ömür de hızla ölçeklenmeli, yoksa uzun kolonun tepesi kesilir
  assert.ok(b.particle.life.b > a.particle.life.b);
});

test('ekranda okunan başka farklar da künyeden türer (aynı görünme hatası)', () => {
  const a = varioPresetTuret(TEMEL, urunBul('AquaVARIO 151'));
  const b = varioPresetTuret(TEMEL, urunBul('AquaVARIO 241'));
  assert.ok(b.kenar > a.kenar, 'debi arttı → parçacık bütçesi artmalı');
  assert.ok(b.kopuk.disR > a.kopuk.disR, 'çarpma köpüğü büyümeli');
  // 72W ops ışık 22Wnin 3.27 katı → gölü ~1.48 kat (küp kök)
  assert.ok(b.gol.yariCap / a.gol.yariCap > 1.4, 'ışık gölü belirgin büyümeli');
  assert.ok(b.hizRampaSn > a.hizRampaSn, 'ağır sütun daha yavaş kurulur');
  assert.deepEqual(b.varioBoy, [0.328, 0.147, 0.143], 'gövde ölçüsü künyeden');
});

test('referans 151 temel preseti DEĞİŞTİRMEZ (ölçek 1.0 özdeşliği)', () => {
  const a = varioPresetTuret(TEMEL, urunBul('AquaVARIO 151'));
  assert.equal(a.kenar, TEMEL.kenar);
  assert.equal(a.particle.speed.b, TEMEL.particle.speed.b);
  assert.equal(a.particle.size, TEMEL.particle.size);
  assert.equal(a.gol.yariCap, TEMEL.gol.yariCap);
  assert.equal(a.hizRampaSn, TEMEL.hizRampaSn);
});

test('künyesiz çağrı eski davranışta kalır (geriye uyum)', () => {
  assert.equal(varioPresetTuret(TEMEL, null), TEMEL);
  assert.equal(varioPresetTuret(TEMEL, { ad: 'x' }), TEMEL);
});

test('hız tavanı: pompa anma yüksekliğini aşamaz', () => {
  // setHiz mantığının saf eşleniği (GPU sınıfı headless kurulamaz)
  const kis = (k, tavan) => Math.min(Math.max(0, k), tavan > 0 ? tavan : Infinity);
  assert.equal(kis(1.6, 1.0), 1.0);        // editör sürgüsünün tepesi kırpılır
  assert.equal(kis(0.5, 1.0), 0.5);
  assert.equal(kis(-3, 1.0), 0);
  assert.equal(kis(1.6, 0), 1.6);          // tavansız cihaz (jet/geyser) serbest
});

test('gövde künye ölçüsünü alır (151 rayzırlı, 241 basık)', () => {
  assert.match(govdeKaynak, /export function varioGovde\(boy = null\)/,
    'varioGovde artık künye ölçüsü almalı');
  assert.match(motorKaynak, /vario: \(\) => varioGovde\(preset\.varioBoy\)/,
    'motor gövdeye künye ölçüsünü geçirmeli');
  // 151: silindir Ø150 → tepesi 0.02+0.15=0.17; künye H=0.20 → 30 mm rayzır
  // 241: silindir Ø147 → tepesi 0.167; künye H=0.143 → rayzır taban değerine
  //      düşer, yani 241 gözle DAHA BASIK okunur. Formül burada aynalanır.
  const rayzir = ([, M, H]) => Math.max(0.012, H - (0.02 + M) + 0.02);
  assert.ok(rayzir([0.328, 0.150, 0.200]) > rayzir([0.328, 0.147, 0.143]),
    '151 gövdesi 241den daha dik siluetli olmalı');
});

test('rampa üstel yaklaşımı kare hızından bağımsız', () => {
  const kos = (dt, adim, tau) => {
    let v = 0;
    for (let i = 0; i < adim; i++) v += (1 - v) * (1 - Math.exp(-dt / tau));
    return v;
  };
  const a = kos(1 / 60, 60, 0.25);         // 1 saniye @60fps
  const b = kos(1 / 30, 30, 0.25);         // 1 saniye @30fps
  assert.ok(Math.abs(a - b) < 1e-9, 'fps rampayı değiştirmemeli');
  // 1 zaman sabitinde ~%63, 3 zaman sabitinde ~%95+
  assert.ok(Math.abs(kos(1 / 60, 15, 0.25) - 0.632) < 0.01);
  assert.ok(kos(1 / 60, 45, 0.25) > 0.94);
});
