// AquaTORCH alevinin BEYAZ çıkması hatasının regresyon testi (2026-07-18).
//
// KÖK SEBEP (kare kanıtıyla izole edildi, _kiyas.local/ajanC_*.png):
//  1) motor.js render fragment'ında "yavaş hareket eden parçacık = köpük"
//     sezgiseli var — hizKopuk = 1 - smoothstep(0.5, 3.0, |vy|) — ve köpük
//     albedo'yu %90 BEYAZA çekiyor. Su jetinin tepesi için doğru; ama alev
//     TANIMI GEREĞİ yavaştır (doğum hızı 1.6-2.6 m/s, ~0.16 s'de vy=0), yani
//     ömrünün neredeyse tamamında kopuk≈1 → #ff8b2e turuncusu beyaza boyanıyordu.
//     master'dan ve .beyaz kanalından bağımsız olmasının sebebi de bu: hizKopuk
//     ikisini de görmez.
//  2) Alev kaynağı 2.1 m idi, oysa torchsu'nun balistik tepesi speed.b²/2g ≈
//     2.50 m → alev jetin İÇİNDE, hem de kolonun en beyaz yeri olan tepe
//     köpüğünün ortasında doğuyordu; (1) düzeltilse bile additive olarak yıkanırdı.
//
// motor.js three'ye bağlı olduğu için Node'da doğrudan import EDİLEMEZ:
// render-hatti-borclari.test.mjs'teki desenle import satırları sahte modüllerle
// değiştirilip data: URL'den yükleniyor — böylece GERÇEK PRESETLER okunur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motorKaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');

// Modül yüklenirken KOŞAN tek three/DOM kodu: dokuUret (canvas) + ortakUniformlar
// (Vector2). Gerisi sınıf/fonksiyon gövdesinde, çağrılmıyor → minik stub yeter.
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
const { PRESETLER } = await import('data:text/javascript;base64,' +
  Buffer.from(kaynak, 'utf8').toString('base64'));

const G = 9.81;

test('torchalev KÖPÜKLENMEZ — alev su değildir, hizKopuk beyazlatması muaf', () => {
  assert.equal(PRESETLER.torchalev.kopuklenme, false,
    'kopuklenme:false kalkarsa alev yine beyaza boyanır (kök sebep 1)');
  // Su cihazları köpüklenmeye DEVAM etmeli — muafiyet aleve özgüdür.
  for (const tur of ['duz_jet', 'geyser', 'air', 'torchsu', 'vario', 'perde']) {
    assert.notEqual(PRESETLER[tur].kopuklenme, false, `${tur} köpüklenmeyi kaybetmiş`);
  }
});

test('alev rengi SICAK kalır — beyaz/nötr preset regresyonu', () => {
  const h = PRESETLER.torchalev.particle.color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  assert.ok(r > g && g > b, `alev rengi sıcak olmalı (r>g>b), gelen #${h}`);
  assert.ok(r - b > 100, `alev rengi doygun turuncu olmalı, gelen #${h}`);
});

test('alev jetin TEPESİNDE doğar — kolonun beyaz apeksinin içinde değil', () => {
  const apeks = Math.pow(PRESETLER.torchsu.particle.speed.b, 2) / (2 * G);
  assert.ok(PRESETLER.torchalev.kaynakY >= apeks,
    `kaynakY (${PRESETLER.torchalev.kaynakY}) torchsu apeksinin (${apeks.toFixed(2)} m) ` +
    'altında → alev jetin beyaz tepe köpüğüne gömülür (kök sebep 2)');
  // Karakter kartı "maks 2.5 m" diyor; alev apeksin hemen üstünde YÜZMELİ,
  // metrelerce yukarıda havada asılı DURMAMALI.
  assert.ok(PRESETLER.torchalev.kaynakY < apeks + 0.5, 'alev jetten kopmuş (çok yüksek)');
});

test('fragment: köpük beyazlatması uKopukPayi ile kapatılabiliyor', () => {
  // GLSL kaynağını doğrudan denetliyoruz: kopuk hesabı uKopukPayi ile
  // ölçeklenmezse preset bayrağı sessizce ETKİSİZ kalır (asıl hata orada).
  const satir = motorKaynak.split('\n').find(s => /float kopuk\s*=/.test(s));
  assert.ok(satir, 'fragment shaderdaki kopuk hesabı bulunamadı');
  assert.match(satir, /\*\s*uKopukPayi/, 'kopuk hesabı uKopukPayi ile ölçeklenmiyor');
  assert.match(motorKaynak, /uniform float uKopukPayi;/, 'uKopukPayi uniformu tanımlı değil');
  assert.match(motorKaynak, /uKopukPayi:\s*\{\s*value:\s*preset\.kopuklenme === false \? 0 : 1\s*\}/,
    'uKopukPayi uniformu preset.kopuklenme bayrağından türetilmiyor');
});
