// KART v2 DryDECK cila turu — §3 "⭐Kontrol mimarisi: ailenin ASIL ayrımı burada".
// Kart bulgusu: DryDECK tek karakter DEĞİL, İKİ FARKLI kontrol zinciri paylaşan
// bir aile. Künye kanıtı (docs/cihaz-karti-v2-drydeck.md §1/§3, ham alıntı
// docs/2026-07-19-drydeck-kaynak-taramasi.md §A1/§A3):
//   - AquaVARIO DryDECK (flush): "Each unit's water height is precisely managed
//     by its own individual 24VDC sub-pump" → POMPA-KONTROLLÜ, VARIO'daki gibi
//     üstel rampayla açılır/kapanır (τ≈0.10 s, VARIO kartı §6'dan ödünç — DryDECK'in
//     kendi pompa ataleti hiçbir kaynakta yok, kart §9).
//   - AquaSWITCH DryDECK / T-SWITCH: katalog.js kendi notu "tek-solenoid" — SWITCH'in
//     aniKesme deseniyle AYNI mekanizma (kesim anında taban temiz, havadaki su
//     kendi ömrünü/balistiğini tamamlar; kart D7/D10 varsayılanı: "kopup uçuyor").
//
// ŞU AN BİZDE (düzeltmeden önce): PRESETLER.drydeck TEK preset, ne rampa ne kesme
// taşıyordu — "kolon sürekli / anlık uniform" (kart §8 tablosu). Aile karakterinin
// KENDİSİ (kontrol, yükseklik değil) ekranda yoktu.
//
// motor.js modül düzeyinde document.createElement kullanıyor → Node'da normal
// import edilemez (switch-kesme.test.mjs / air-salvo.test.mjs deseni): kaynak
// metinden okunur; drydeckPresetTuret saf veri fonksiyonu olduğu için gövdesi
// ayrıca gerçek `new Function` ile ÇALIŞTIRILARAK davranış doğrulanır (yalnız
// regex eşleşmesi değil).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kaynak = fs.readFileSync(path.join(KOK, 'studio/js/motor.js'), 'utf8');

function presetBlok(ad) {
  const bas = kaynak.indexOf(`\n  ${ad}: {`);
  assert.ok(bas > 0, `${ad} preseti bulunamadi`);
  let i = kaynak.indexOf('{', bas), derinlik = 0;
  for (let j = i; j < kaynak.length; j++) {
    if (kaynak[j] === '{') derinlik++;
    else if (kaynak[j] === '}' && --derinlik === 0) return kaynak.slice(i, j + 1);
  }
  throw new Error(ad + ' blogu kapanmadi');
}

// drydeckPresetTuret'in GÖVDESİNİ metinden çıkarıp gerçekten çalıştırır — yalnız
// desen eşleşmesi değil, gerçek davranış (varioPresetTuret'in kart D3/D7 emsali).
function drydeckPresetTuretGovde() {
  const bas = kaynak.indexOf('function drydeckPresetTuret(');
  assert.ok(bas > 0, 'drydeckPresetTuret bulunamadi');
  const acilis = kaynak.indexOf('{', bas);
  let i = acilis, derinlik = 0, son = -1;
  for (let j = i; j < kaynak.length; j++) {
    if (kaynak[j] === '{') derinlik++;
    else if (kaynak[j] === '}' && --derinlik === 0) { son = j; break; }
  }
  assert.ok(son > 0, 'drydeckPresetTuret govdesi kapanmadi');
  return kaynak.slice(acilis + 1, son);
}

// Faz 2 Tur 2/4: imza (temel, kunye, ustPlaka) oldu — üst plaka ÇAĞIRANDAN gelir
// (suEkle zarf tablosundan çözer), fonksiyon SAF kalır ki gövdesi burada
// modül import'u olmadan koşabilsin.
function calistir(temel, kunye, ustPlaka = null) {
  const govde = drydeckPresetTuretGovde();
  const fn = new Function('temel', 'kunye', 'ustPlaka', govde);
  return fn(temel, kunye, ustPlaka);
}

test('drydeckPresetTuret tanimli ve suEkle icinde zarfPresetTuret ONCESINDE cagriliyor', () => {
  assert.match(kaynak, /export function drydeckPresetTuret\(temel, kunye, ustPlaka = null\)/);
  const suEkleGovde = kaynak.slice(kaynak.indexOf('function suEkle('), kaynak.indexOf('function suSil('));
  const iDrydeck = suEkleGovde.indexOf("tur === 'drydeck'");
  const iZarf = suEkleGovde.indexOf('zarfPresetTuret(tur');
  assert.ok(iDrydeck > 0, "suEkle icinde tur === 'drydeck' dali yok");
  assert.ok(iZarf > 0, 'suEkle icinde zarfPresetTuret cagrisi yok');
  assert.ok(iDrydeck < iZarf, 'drydeckPresetTuret zarfPresetTuret SONRASINDA cagriliyor (sira onemli degil ama beklenen yerlesim bu)');
});

test('künyesiz çağrı (eski .aqshow/testler): preset DEĞİŞMEDEN döner', () => {
  const temel = { kenar: 1, particle: { speed: { a: 1, b: 2 } }, kopuk: {}, gol: {} };
  const sonuc = calistir(temel, null);
  assert.equal(sonuc, temel, 'kunye yokken drydeckPresetTuret yeni obje/degisiklik uretmemeli');
});

test('AquaVARIO DryDECK (flush, "individual sub-pump" kart §1): pompa rampasi alir, aniKesme YOK', () => {
  const temel = { kenar: 1, particle: { speed: { a: 1, b: 2 } }, kopuk: {}, gol: {} };
  const sonuc = calistir(temel, { ad: 'AquaVARIO DryDECK' });
  assert.ok(sonuc.hizRampaSn > 0, 'flush DryDECK pompa rampasi almiyor (kart §3: pompa-kontrollu)');
  assert.ok(!sonuc.aniKesme, 'flush DryDECK yanlislikla aniKesme aliyor (o SWITCH tarafinin ozelligi)');
});

test('AquaSWITCH DryDECK / T-SWITCH (katalog.js notu "tek-solenoid"): aniKesme alir, rampa YOK', () => {
  const temel = { kenar: 1, particle: { speed: { a: 1, b: 2 } }, kopuk: {}, gol: {} };
  const sonuc = calistir(temel, { ad: 'AquaSWITCH DryDECK' });
  assert.equal(sonuc.aniKesme, true, 'T-SWITCH aniKesme almiyor (kart D7/D10: valf keser, kolon havada kopup ucar)');
  assert.ok(!(sonuc.hizRampaSn > 0), 'T-SWITCH pompa rampasi almamali (valf-kapili, pompa-kontrollu degil)');
});

test('drydeck preset LİTERAL bloğu aniKesme/hizRampaSn taşımıyor — ayrışma tamamen dinamik (künyeden)', () => {
  const blok = presetBlok('drydeck');
  assert.ok(!/aniKesme:/.test(blok), 'drydeck literal blogunda aniKesme sizmis');
  assert.ok(!/hizRampaSn:/.test(blok), 'drydeck literal blogunda hizRampaSn sizmis');
});

// --- Faz 2 Tur 2/4 (2026-07-25): ÜST PLAKA -----------------------------------
// Kartın açık borcu (drydeck.md:347 + §8 önceliği ④): `zarf-urunler.js` iki
// DryDECK ürünü için de "kare 300×300, kalınlık 30 mm" kararını vermişti, ama
// `govde.js drydeckGovde()` hâlâ tek yuvarlak Ø280 torus+disk çiziyordu — yani
// ekrandaki BİÇİM künyeye aykırıydı.
const govdeKaynak = fs.readFileSync(path.join(KOK, 'studio/js/govde.js'), 'utf8');

test('ust plaka preset uzerinden gecer (iki kontrol dalinda da)', () => {
  const plaka = { bicim: 'kare', kenarMm: 300, kalinlikMm: 30 };
  const vario = calistir({ kenar: 128 }, { ad: 'AquaVARIO DryDECK', kontrol: 'surekli' }, plaka);
  const swch = calistir({ kenar: 128 }, { ad: 'AquaSWITCH DryDECK', kontrol: 'solenoid' }, plaka);
  assert.deepEqual(vario.ustPlaka, plaka, 'pompa dalinda plaka kayboluyor');
  assert.deepEqual(swch.ustPlaka, plaka, 'solenoid dalinda plaka kayboluyor');
  assert.equal(swch.aniKesme, true, 'plaka eklenirken kontrol karakteri bozulmamali');
  assert.ok(vario.hizRampaSn > 0, 'plaka eklenirken pompa rampasi bozulmamali');
});

test('plaka zarf tablosundan cozulup govdeye veriliyor (suEkle -> drydeckGovde)', () => {
  const suEkleGovde = kaynak.slice(kaynak.indexOf('function suEkle('), kaynak.indexOf('function suSil('));
  assert.match(suEkleGovde, /drydeckPresetTuret\(p, kunye, urunZarfi\([^)]*\)\?\.ustPlaka \?\? null\)/,
    'ust plaka zarf tablosundan cozulmeli (fonksiyon SAF kalsin)');
  assert.match(kaynak, /drydeck: \(\) => drydeckGovde\(preset\.ustPlaka\)/,
    'govde fabrikasi plakayi almali');
});

test('drydeckGovde: plaka YOKSA eski Ø280 torus+disk BIREBIR korunur', () => {
  const govde = govdeKaynak.slice(govdeKaynak.indexOf('export function drydeckGovde('));
  assert.match(govde, /ustPlaka = null/, 'varsayilan null olmali (eski .aqshow)');
  const yedek = govde.slice(govde.indexOf('const cerceve'));
  assert.match(yedek, /TorusGeometry\(0\.14, 0\.02, 8, 24\)/);
  assert.match(yedek, /CylinderGeometry\(0\.13, 0\.13, 0\.012, 20\)/);
});

test('drydeckGovde: kare/yuvarlak ayrimi + HEMYUZ sozlesmesi (kalinlik ASAGI iner)', () => {
  // drydeckGovde dosyanın SONUNDA (govde.js:397) — sonrasında export yok.
  const govde = govdeKaynak.slice(govdeKaynak.indexOf('export function drydeckGovde('));
  assert.match(govde, /bicim === 'kare'/, 'bicim kunyeden okunmali');
  assert.match(govde, /BoxGeometry/, 'kare plaka box olmali');
  assert.match(govde, /kenarMm \?\? 300/); assert.match(govde, /capMm \?\? 280/);
  // Hemyüz (kart §1 "sıfır su seviyesi / zeminle hemyüz"): plaka ÜST YÜZÜ zemin
  // hizasinda, kalinlik aşağı iner → merkez y = HEMYUZ - kalin/2.
  assert.match(govde, /plaka\.position\.y = HEMYUZ - kalin \/ 2/,
    'kalin plaka zeminden YUKARI cikmamali (hemyuz sozlesmesi)');
  assert.match(govde, /if \(kalin > 0\.010\)/, 'derz yalniz kalin Premium plakada');
});
