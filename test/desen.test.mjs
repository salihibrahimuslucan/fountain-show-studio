// desen.test.mjs — T-C renk desen kütüphanesi: format sözleşmesi + kesin artan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEMALAR, rainbow, chase, fade, strobe,
         masterDalga, masterKarsilikli, masterChase, masterMerdiven, masterUnison } from '../studio/js/desen.js';

const IDLER = ['duz_jet_1', 'geyser_1', 'laminer_1'];
const artanMi = (a) => a.every((k, i) => i === 0 || k[0] > a[i - 1][0]);
const aralikta = (a, lo, hi) => a.every(([, v]) => v >= lo && v <= hi);

test('rainbow: her cihaza hue+beyaz, faz ofsetli, kesin artan', () => {
  const k = rainbow(IDLER, 16);
  assert.equal(k.length, IDLER.length * 2);
  for (const c of k) { assert.ok(artanMi(c.anahtarlar)); assert.ok(aralikta(c.anahtarlar, 0, 1)); }
  const hueler = k.filter(c => c.hedef.endsWith('.hue')).map(c => c.anahtarlar[0][1]);
  assert.equal(new Set(hueler.map(h => h.toFixed(3))).size, IDLER.length);   // ofsetler farklı
});
test('chase: beat basina tek cihaz yanar, beyaz step kesin artan', () => {
  const beatler = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const k = chase(IDLER, beatler);
  const beyazlar = k.filter(c => c.hedef.endsWith('.beyaz'));
  assert.equal(beyazlar.length, IDLER.length);
  for (const c of beyazlar) { assert.ok(artanMi(c.anahtarlar)); assert.equal(c.anahtarlar[0][0], 0); }
});
test('fade: sema renkleri arasinda smooth, sure icinde', () => {
  const k = fade(IDLER, 12, SEMALAR.tricolor);
  for (const c of k.filter(c => c.hedef.endsWith('.hue'))) {
    assert.ok(artanMi(c.anahtarlar));
    assert.ok(c.anahtarlar[c.anahtarlar.length - 1][0] <= 12);
  }
});
test('strobe: t0-t1 arasi nabiz, cikista 1e doner, kesin artan', () => {
  const k = strobe(IDLER, 8, 10, 8);
  for (const c of k) {
    assert.ok(artanMi(c.anahtarlar));
    assert.equal(c.anahtarlar[c.anahtarlar.length - 1][1], 1);
    assert.ok(c.anahtarlar[0][0] >= 8 && c.anahtarlar[c.anahtarlar.length - 1][0] <= 10);
  }
});

test('masterKarsilikli tek/cift uyeler zit fazda', () => {
  const k = masterKarsilikli(['a','b'], 8, 2);           // sure 8, periyot 2 s
  const a = k.find(x => x.hedef === 'a.master'), b = k.find(x => x.hedef === 'b.master');
  // t=0'da a tepede b dipte; t=periyot/2'de tersine döner
  assert.ok(a.anahtarlar[0][1] > 0.9 && b.anahtarlar[0][1] < 0.4);
});
test('masterChase her adimda tek uye acik', () => {
  const k = masterChase(['a','b','c'], [0, 1, 2, 3], 'step');
  for (const kn of k) assert.equal(kn.tip, 'step');
});
// t=0'daki beat YUTULMAMALI: ilk sürüm anahtarı `t > b.at(-1)[0]` ile ekliyordu,
// `0 > 0` false olduğu için sıfırıncı vuruş hiçbir kanala işlenmiyor, tüm üyeler
// [0,0] ile başlıyordu — beat ızgarası 0'dan başlayan şovda şovun AÇILIŞ vuruşu
// sessizce düşüyordu (teşhisi zor: "bir cihaz niye sessiz").
test('masterChase t=0 beatini yutmaz — sirasi gelen uye acik baslar', () => {
  const k = masterChase(['a', 'b'], [0, 1, 2]);
  const a = k.find(x => x.hedef === 'a.master'), b = k.find(x => x.hedef === 'b.master');
  assert.deepEqual(a.anahtarlar[0], [0, 1]);          // k=0 → 0 % 2 === 0 → a açık
  assert.deepEqual(b.anahtarlar[0], [0, 0]);          // b kapalı
});
test('masterMerdiven uyeler sirayla katilir ve acik kalir', () => {
  const k = masterMerdiven(['a','b'], 0, 4);
  const b = k.find(x => x.hedef === 'b.master');
  assert.equal(b.anahtarlar[0][1], 0);                    // b başta kapalı
  assert.equal(b.anahtarlar.at(-1)[1], 1);                // sonda açık
});
test('tum master desenleri kesin artan anahtar uretir', () => {
  for (const kanallar of [masterChase(['a','b'], [0,1,2]), masterDalga(['a','b'], 8, 2),
                          masterKarsilikli(['a','b'], 8, 2), masterMerdiven(['a','b'], 0, 4),
                          masterUnison(['a','b'], 0, 4, [0,1,2,3])])
    for (const k of kanallar)
      for (let i = 1; i < k.anahtarlar.length; i++)
        assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i-1][0], k.hedef);
});
