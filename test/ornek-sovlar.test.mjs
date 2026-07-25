// ornek-sovlar.test.mjs — SEVKEDILEN ornek .aqshow dosyalarinin kendisini denetler.
// Gerekce: bunlar urunun vitrini (README + #ornek= hash'i + Salih'in gosterdigi
// ilk sey). Bozuk bir kanal hedefi ya da arali disi deger, sahnede sessiz olu
// cihaz demek. 2026-07-18 denetim turu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { aqshowOku } from '../studio/js/proje.js';
import { ornekle } from '../studio/js/timeline.js';
import { urunBul } from '../studio/data/katalog.js';

const dizin = new URL('../studio/ornekler/', import.meta.url);
const dosyalar = readdirSync(dizin).filter(f => f.endsWith('.aqshow') && !f.startsWith('_'));

// editor.js kanalAralik ile AYNI sozlesme (orada DOM'a bagli oldugu icin kopya)
const ARALIK = { hue: [0, 1], beyaz: [0, 1], master: [0, 1], parlaklik: [0, 1.5],
                 hiz: [0, 1.6], pan: [-90, 90], tilt: [0, 45] };

test('en az bir ornek sov sevk ediliyor', () => {
  assert.ok(dosyalar.length >= 3, `ornek sayisi: ${dosyalar.length}`);
});

for (const dosya of dosyalar) {
  const d = aqshowOku(readFileSync(new URL(dosya, dizin), 'utf8'));

  test(`${dosya}: uyarisiz okunuyor`, () => {
    assert.deepEqual(d.uyarilar, [], `uyarilar: ${d.uyarilar.join(' | ')}`);
  });

  test(`${dosya}: her kanalin hedefi VAR OLAN bir cihaza denk geliyor`, () => {
    const idler = new Set(d.cihazlar.map(c => c.id));
    const oksuz = d.cizelge.kanallar.filter(k => !idler.has(k.hedef.split('.')[0]));
    assert.deepEqual(oksuz.map(k => k.hedef), [], 'sahipsiz kanal = sessiz olu kanal');
  });

  test(`${dosya}: her cihazin en az bir kanali var (sessiz olu cihaz yok)`, () => {
    const hedefli = new Set(d.cizelge.kanallar.map(k => k.hedef.split('.')[0]));
    const sessiz = d.cihazlar.filter(c => !hedefli.has(c.id)).map(c => `${c.id}(${c.tur})`);
    assert.deepEqual(sessiz, [], 'kanalsiz cihaz sahnede hic calismaz');
  });

  test(`${dosya}: anahtarlar ARTAN ve sure icinde`, () => {
    for (const k of d.cizelge.kanallar) {
      let onceki = -Infinity;
      for (const [t] of k.anahtarlar) {
        assert.ok(t >= onceki, `${k.hedef}: sira bozuk @${t}`);
        assert.ok(t >= 0 && t <= d.cizelge.sure + 1e-6, `${k.hedef}: zaman sure disinda @${t}`);
        onceki = t;
      }
    }
  });

  test(`${dosya}: degerler kanal araliginda (editorde yakalanabilir)`, () => {
    for (const k of d.cizelge.kanallar) {
      const p = k.hedef.split('.').pop();
      const ar = ARALIK[p];
      if (!ar) continue;
      for (const [t, v] of k.anahtarlar) {
        assert.ok(v >= ar[0] - 1e-6 && v <= ar[1] + 1e-6,
          `${k.hedef} @${t} = ${v}, aralik ${ar[0]}..${ar[1]} disinda (cue serit disina duser)`);
      }
    }
  });

  test(`${dosya}: ornekle sov boyunca sonlu deger donduruyor`, () => {
    for (const k of d.cizelge.kanallar) {
      for (let t = 0; t <= d.cizelge.sure; t += d.cizelge.sure / 40) {
        const v = ornekle(k, t);
        assert.ok(Number.isFinite(v), `${k.hedef} @${t.toFixed(2)} = ${v}`);
      }
    }
  });

  test(`${dosya}: urun adlari katalogda var ve arketiple tutarli`, () => {
    // urunBul ESKI_AD koprusunu de cozer (sevkedilen ornekler 'DryDECK'/'AquaVARIO'
    // gibi eski adlar tasiyor; koprü onlari gecerli kilar — sozlesme budur).
    for (const c of d.cihazlar) {
      if (!c.urun) continue;
      const u = urunBul(c.urun);
      assert.ok(u, `katalogda olmayan urun: ${c.urun}`);
      assert.equal(c.tur, u.arketip, `${c.id}: tur=${c.tur} ama katalog arketipi=${u.arketip}`);
    }
  });

  test(`${dosya}: sov bos baslamiyor (t=0'da en az bir master acik degilse fade var mi)`, () => {
    const masterlar = d.cizelge.kanallar.filter(k => k.hedef.endsWith('.master'));
    assert.ok(masterlar.length > 0, 'hic master kanali yok');
    const erken = masterlar.some(k => ornekle(k, Math.min(2, d.cizelge.sure)) > 0.05);
    assert.ok(erken, 'ilk 2 saniyede hicbir cihaz acilmiyor — sov bos basliyor gibi gorunur');
  });
}
