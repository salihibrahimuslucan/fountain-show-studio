// vitrin.test.mjs — cihaz denetim tezgahi (#vitrin=<urun>) sozlesmesi.
//
// vitrin.js THREE import eder → Node'da IMPORT EDILEMEZ; kaynagi METIN olarak
// okuyup dogrularız (repo deseni: fon-preset / isik-borusu metin testleri).
// Korunan sozlesmeler:
//   1) uc montaj sinifinin de tezgah zemini tanimli (islak/kuru/perde)
//   2) her montaj sinifi GECERLI bir fon adi tasir + kuru_meydan 'kuru' fonuna
//      gider (su yuzeyi gizli beton meydan; onceki 'sade' sabit kodu DryDECK'i
//      su ustunde gosteriyordu — Task 6 eksigi)
//   3) zaman izgarasi salvo/servo periyodunu okur AMA optional chaining ile —
//      mekanizma 26/28 urunde null; korumasiz okuma sayfayi oldururdu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FONLAR } from '../studio/js/fon-preset.js';   // fon-preset SAF (THREE yok) → gecerli fon adlari kaynagi

// ⚠vitrin.js THREE import eder → Node'da import EDILEMEZ; kaynagi METIN olarak
// okuyup TEZGAH_ZEMIN'in `montaj: { fon: '<ad>' }` satirlarini regexle okuruz.
const kaynak = readFileSync(new URL('../studio/js/vitrin.js', import.meta.url), 'utf8');
const fonAd = (montaj) => {
  const m = kaynak.match(new RegExp(montaj + String.raw`:\s*\{\s*fon:\s*'([^']+)'`));
  return m ? m[1] : null;
};

test('uc montaj sinifinin de tezgah zemini tanimli', () => {
  for (const montaj of ['islak_havuz', 'kuru_meydan', 'duvar_perde']) {
    assert.ok(kaynak.includes(montaj + ':'),
      `TEZGAH_ZEMIN'de ${montaj} zemini yok`);
  }
});

test('her montaj sinifi GECERLI bir fon adi tasir', () => {
  // ⚠ana.js mekan.fonSec(v.zemin.fon, 0) cagirir — fon adi FONLAR'da yoksa
  // mekan tanimadigi fona dusup sessizce varsayilanda kalir. Uc sinif da bagli.
  for (const montaj of ['islak_havuz', 'kuru_meydan', 'duvar_perde']) {
    const fon = fonAd(montaj);
    assert.ok(fon, `${montaj} icin fon alani yok (TEZGAH_ZEMIN[${montaj}].fon)`);
    assert.ok(FONLAR[fon], `${montaj} gecersiz fon adina baglanmis: ${fon}`);
  }
});

test('kuru_meydan KURU fona gider: su yuzeyi gizli (DryDECK/POP su ustunde durmasin)', () => {
  // Task 6 eksigi: onceki 'sade' sabit kodu kuru_meydan cihazini sade'nin su
  // bloğu yuzunden SU USTUNDE gosteriyordu. 'kuru' presetinde kuru:true → yuzey gizli.
  assert.equal(fonAd('kuru_meydan'), 'kuru',
    'kuru_meydan kuru fonuna gitmeli — beton meydan, su yansimasi yok');
  assert.equal(FONLAR.kuru.kuru, true, 'kuru fonu su yuzeyini gizlemeli (kuru:true)');
  // islak/perde ıslak zeminde (sade) kalmali — perde su ustune dokulur
  assert.equal(fonAd('islak_havuz'), 'sade');
  assert.equal(fonAd('duvar_perde'), 'sade');
});

test('zaman izgarasi periyotSn okur (salvo/servo) VE null korumali', () => {
  // periyot kaynagi: salvo/servo cihazda zaman izgarasi periyoda gore
  assert.ok(kaynak.includes('periyotSn'),
    'zaman izgarasi mekanizma.periyotSn kaynagini okumali');
  // ⚠null koruma: 28 urunun 26'sinda mekanizma null → optional chaining SART
  assert.ok(kaynak.includes('mekanizma?.'),
    'mekanizma optional chaining (z.mekanizma?.) ile okunmali — 26 urunde null');
});
