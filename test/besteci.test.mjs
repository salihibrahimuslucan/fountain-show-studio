import { test } from 'node:test';
// (v3 F6 rol testleri dosya sonunda)
import assert from 'node:assert/strict';
import { analizEt, timelineUret, sentetikPCM, bpmOktav, yuzdelik } from '../studio/js/besteci.js';
import { gercekcilPCM } from './veri/gercekcil-pcm.mjs';

function fakeBuffer(saniye = 16, bpm = 120) {
  const { veri, sr } = sentetikPCM(saniye, bpm);
  return { sampleRate: sr, duration: saniye, numberOfChannels: 1, getChannelData: () => veri };
}
test('sentetik parcada beat sayisi makul (120bpm/16s → 25-40 arasi)', () => {
  const a = analizEt(fakeBuffer());
  assert.ok(a.beatler.length >= 25 && a.beatler.length <= 40, 'beat=' + a.beatler.length);
});
test('drop build sonrasinda bulunur (~8s)', () => {
  const a = analizEt(fakeBuffer());
  assert.ok(a.droplar.some(t => t > 6 && t < 11), JSON.stringify(a.droplar));
});
test('kanallar cihaz listesinden dogar', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [
    { id: 'duz_jet_1', tur: 'duz_jet' }, { id: 'geyser_1', tur: 'geyser' },
    { id: 'laminer_1', tur: 'laminer' }, { id: 'rgb_spot_1', tur: 'rgb_spot' }]);
  const hedefler = c.kanallar.map(k => k.hedef);
  assert.ok(hedefler.includes('duz_jet_1.master') && hedefler.includes('duz_jet_1.hiz'));
  assert.ok(hedefler.includes('geyser_1.master') && hedefler.includes('laminer_1.master'));
  assert.ok(hedefler.includes('rgb_spot_1.hue') && hedefler.includes('rgb_spot_1.parlaklik'));
  assert.ok(!hedefler.some(h => h.includes('laminer_1.hiz')), 'laminerde hiz olmaz');
});
test('ayni turden iki cihaz paylasilan dizi almaz (editor mutasyon korumasi)', () => {
  const c = timelineUret(analizEt(fakeBuffer()), [
    { id: 'duz_jet_1', tur: 'duz_jet' }, { id: 'duz_jet_2', tur: 'duz_jet' }]);
  const j1 = c.kanallar.find(k => k.hedef === 'duz_jet_1.master');
  const j2 = c.kanallar.find(k => k.hedef === 'duz_jet_2.master');
  assert.notEqual(j1.anahtarlar, j2.anahtarlar, 'anahtar dizileri ayni referans olamaz');
  for (const [i, a] of j1.anahtarlar.entries())
    assert.notEqual(a, j2.anahtarlar[i], 'anahtar cifti paylasilamaz [' + i + ']');
});
test('anahtarlar kesin artan', () => {
  const c = timelineUret(analizEt(fakeBuffer()), [{ id: 'duz_jet_1', tur: 'duz_jet' }]);
  for (const k of c.kanallar)
    for (let i = 1; i < k.anahtarlar.length; i++)
      assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i - 1][0], k.hedef);
});

// --- v2 (T-D: FFT + BPM izgarasi + bantlar + bolumler) ---
test('v2: sentetik 120bpm parcada bpm 115-125 araliginda', () => {
  const a = analizEt(fakeBuffer(16, 120));
  assert.ok(a.bpm >= 115 && a.bpm <= 125, 'bpm=' + a.bpm);
});
test('v2: beatIzgara araliklari 60/bpm sabitine yakin', () => {
  const a = analizEt(fakeBuffer(16, 120));
  assert.ok(a.beatIzgara.length >= 8, 'izgara=' + a.beatIzgara.length);
  const periyot = 60 / a.bpm;
  for (let i = 1; i < a.beatIzgara.length; i++)
    assert.ok(Math.abs((a.beatIzgara[i] - a.beatIzgara[i - 1]) - periyot) < 0.02,
      'aralik[' + i + ']=' + (a.beatIzgara[i] - a.beatIzgara[i - 1]));
});
test('v2: bantlar dogru boyda ve 0..1 araliginda', () => {
  const a = analizEt(fakeBuffer());
  assert.ok(a.bantHop > 0 && a.bantHop < 0.1, 'bantHop=' + a.bantHop);
  const boy = a.bantlar.bas.length;
  assert.ok(boy > 100, 'boy=' + boy);
  for (const ad of ['bas', 'orta', 'tiz']) {
    assert.equal(a.bantlar[ad].length, boy, ad + ' boyu farkli');
    for (const v of a.bantlar[ad]) assert.ok(v >= 0 && v <= 1.0001, ad + ' deger=' + v);
  }
});
test('v2: bolumler en az bir drop icerir ve zamanlar tutarli', () => {
  const a = analizEt(fakeBuffer());
  assert.ok(a.bolumler.length >= 2, JSON.stringify(a.bolumler));
  assert.ok(a.bolumler.some(b => b.tip === 'drop'), JSON.stringify(a.bolumler));
  for (const b of a.bolumler) {
    assert.ok(b.t1 > b.t0, JSON.stringify(b));
    assert.ok(['giris', 'verse', 'build', 'drop', 'final'].includes(b.tip), b.tip);
  }
});
test('v2: timelineUret tum kanallarda kesin artan (su renk kanallari dahil)', () => {
  const c = timelineUret(analizEt(fakeBuffer()), [
    { id: 'duz_jet_1', tur: 'duz_jet' }, { id: 'geyser_1', tur: 'geyser' },
    { id: 'laminer_1', tur: 'laminer' }, { id: 'rgb_spot_1', tur: 'rgb_spot' }]);
  const hedefler = c.kanallar.map(k => k.hedef);
  assert.ok(hedefler.includes('duz_jet_1.hue') && hedefler.includes('duz_jet_1.beyaz'));
  assert.ok(hedefler.includes('laminer_1.beyaz'));
  for (const k of c.kanallar)
    for (let i = 1; i < k.anahtarlar.length; i++)
      assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i - 1][0], k.hedef + ' [' + i + ']');
});

// v3 F6: rol bazli koreografi — tum katalog turleri kanal alir, roller karaktere uyar.
test('v3: tum katalog turleri bestele kanali alir, roller dogru', () => {
  const c = timelineUret(analizEt(fakeBuffer()), [
    { id: 'duz_jet_1', tur: 'duz_jet' }, { id: 'switch_1', tur: 'switch' },
    { id: 'switch_2', tur: 'switch' }, { id: 'robo_1', tur: 'robo' },
    { id: 'swing_1', tur: 'swing' }, { id: 'drydeck_1', tur: 'drydeck' },
    { id: 'aquajet_1', tur: 'aquajet' }, { id: 'yelpaze_1', tur: 'yelpaze' }]);
  const h = c.kanallar.map(k => k.hedef);
  for (const id of ['switch_1', 'robo_1', 'swing_1', 'drydeck_1', 'aquajet_1', 'yelpaze_1'])
    assert.ok(h.includes(id + '.master'), id + ' master eksik');
  assert.equal(c.kanallar.find(k => k.hedef === 'switch_1.master').tip, 'step');   // ani ac/kes
  assert.ok(h.includes('robo_1.pan') && h.includes('robo_1.tilt'));                // 2 eksen
  assert.ok(h.includes('swing_1.pan') && !h.includes('swing_1.tilt'));             // 1 eksen
  assert.ok(h.includes('aquajet_1.beyaz'));                                        // renk kanallari
  for (const k of c.kanallar)                                                      // kesin artan
    for (let i = 1; i < k.anahtarlar.length; i++)
      assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i - 1][0], k.hedef + ' [' + i + ']');
});
test('v3: aquajet doruk rolu — drop bolumunde acilir', () => {
  const a = analizEt(fakeBuffer());
  const drop = a.bolumler.find(b => b.tip === 'drop');
  const c = timelineUret(a, [{ id: 'aquajet_1', tur: 'aquajet' }]);
  const m = c.kanallar.find(k => k.hedef === 'aquajet_1.master');
  const dropIci = m.anahtarlar.filter(([t]) => t >= drop.t0 && t < drop.t1);
  assert.ok(dropIci.some(([, v]) => v === 1), 'drop icinde acilmadi: ' + JSON.stringify(m.anahtarlar));
});

// v5 F3: yeni aile rolleri — air/star/torch/perde karakterleri.
test('v5: air/star/torch/perde kanal alir, roller karaktere uyar', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [
    { id: 'air_1', tur: 'air' }, { id: 'star_1', tur: 'star' },
    { id: 'torch_1', tur: 'torch' }, { id: 'perde_1', tur: 'perde' }]);
  const h = c.kanallar.map(k => k.hedef);
  for (const id of ['air_1', 'star_1', 'torch_1', 'perde_1'])
    assert.ok(h.includes(id + '.master'), id + ' master eksik');
  // solenoidliler step (kunye kontrol tipleri)
  for (const id of ['air_1', 'star_1', 'perde_1'])
    assert.equal(c.kanallar.find(k => k.hedef === id + '.master').tip, 'step', id);
  // torch: alev turuncu kalmali — hue/beyaz kanali BESTEDE dogmaz
  assert.ok(!h.includes('torch_1.hue') && !h.includes('torch_1.beyaz'), 'torch renk kanali almamali');
  // air: drop aninda salvo (drop varsa)
  if (a.droplar.length) {
    const m = c.kanallar.find(k => k.hedef === 'air_1.master');
    const dtp = a.droplar[0];
    assert.ok(m.anahtarlar.some(([t, v]) => Math.abs(t - dtp) < 0.1 && v === 1),
      'air drop salvosu yok: ' + JSON.stringify(m.anahtarlar.slice(0, 6)));
  }
  // kesin artan zaman disiplini
  for (const k of c.kanallar)
    for (let i = 1; i < k.anahtarlar.length; i++)
      assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i - 1][0], k.hedef + ' [' + i + ']');
});

// --- v7 GERÇEK MÜZİK (Salih tarayıcı ölçümü: Veridis Quo + TERRITORY sistematik
// çöküyordu). Fikstür test/veri/gercekcil-pcm.mjs: limiter-sıkışık zarf, tek
// crash'in belirlediği tepe, ±18 ms mikro-zamanlama, güçlü backbeat oktav tuzağı.
// analizEt uzun parcada pahali (FFT) — fikstur basina BIR kez cozulur, testler
// paylasir. analizEt saf oldugu icin paylasim guvenli; timelineUret her cagrida
// taze anahtar dizisi uretir (mutasyon korumasi testi bunu ayrica dogrular).
const _onbellek = new Map();
function gercekAnaliz(opt) {
  const anahtar = JSON.stringify(opt);
  if (!_onbellek.has(anahtar)) {
    const { veri, sr } = gercekcilPCM(opt);
    _onbellek.set(anahtar, analizEt({
      sampleRate: sr, duration: veri.length / sr, numberOfChannels: 1, getChannelData: () => veri }));
  }
  return _onbellek.get(anahtar);
}
const GERCEK = [
  ['duzenli house', { saniye: 200, bpm: 110, stil: 'house' }],
  ['guclu backbeat (TERRITORY benzeri)', { saniye: 200, bpm: 120, stil: 'backbeat' }],
  ['limiter-sikisik dinamik', { saniye: 160, bpm: 128, stil: 'sikisik' }],
  // v7.1: DROP'U AZ olan uzun duz parca (Veridis Quo vakasi) — v7 burada
  // 57 drop / 345 sn uretiyordu. Ustteki stiller duzenlenmis drop icerdigi
  // icin bu patolojiyi YAKALAMIYORDU.
  ['duz limiter-li parca (Veridis Quo vakasi)', { saniye: 300, bpm: 110, stil: 'duz' }],
];
// koreografi ust siniri: 5-6 dakikalik parcada tipik 2-8 drop
const dropKota = (sure) => Math.min(8, Math.max(1, Math.round(sure / 50)));

// v7.1 ANA REGRESYON: duz parcada drop ENFLASYONU olmamali. Salih'in tarayici
// olcumu: Veridis Quo (sakin, sabit tempolu house) 57 drop / 345 sn dondu —
// ortalama her 6 saniyede bir renk patlamasi. Gercekte 2-4 civari olmali.
test('v7.1: duz parcada drop sayisi 2-4 civari (57 degil)', () => {
  const a = gercekAnaliz({ saniye: 300, bpm: 110, stil: 'duz' });
  assert.ok(a.droplar.length >= 1 && a.droplar.length <= 4,
    'duz parcada drop=' + a.droplar.length + ' ' + JSON.stringify(a.droplar));
});
test('v7.1: duz parcada bolumler tek blok degil', () => {
  const a = gercekAnaliz({ saniye: 300, bpm: 110, stil: 'duz' });
  const tipler = a.bolumler.map(b => b.tip);
  assert.ok(a.bolumler.length >= 5, 'bolum=' + JSON.stringify(tipler));
  // v7 hatasi: 5 dakikanin ~5 dakikasi tek "verse" blogu
  const enUzun = Math.max(...a.bolumler.map(b => b.t1 - b.t0));
  assert.ok(enUzun < a.sure * 0.5,
    `tek bolum sovun %${(100 * enUzun / a.sure).toFixed(0)}'ini kapliyor`);
});

test('v7: bpmOktav her tempoyu 60-180 araligina indirger', () => {
  assert.ok(Math.abs(bpmOktav(59.8) - 119.6) < 1e-6, 'yarim tempo katlanmali');
  assert.ok(Math.abs(bpmOktav(240) - 120) < 1e-6, 'cift tempo bolunmeli');
  assert.equal(bpmOktav(128), 128);
  assert.equal(bpmOktav(0), 120);        // bozuk girdide guvenli varsayilan
  assert.equal(bpmOktav(NaN), 120);
});

test('v7: yuzdelik siralar, diziyi bozmaz', () => {
  const d = [5, 1, 4, 2, 3];
  assert.equal(yuzdelik(d, 0), 1);
  assert.equal(yuzdelik(d, 1), 5);
  assert.equal(yuzdelik(d, 0.5), 3);
  assert.deepEqual(d, [5, 1, 4, 2, 3], 'giris dizisi degismemeli');
});

test('v7: OKTAV — guclu backbeat parcada yarim tempoya kilitlenmez', () => {
  // Bu tam TERRITORY vakasi: trampet 2/4'te kick'ten guclu → otokorelasyonun
  // GLOBAL tepesi 2 beat'te. Eski kod 120 BPM parcayi 59.8 olcuyordu.
  const a = gercekAnaliz({ saniye: 200, bpm: 120, stil: 'backbeat' });
  assert.ok(a.bpm >= 108 && a.bpm <= 132, 'oktav hatasi, bpm=' + a.bpm);
});

for (const [ad, opt] of GERCEK) {
  test(`v7: ${ad} — bpm makul oktavda`, () => {
    const a = gercekAnaliz(opt);
    assert.ok(a.bpm >= 60 && a.bpm < 180, 'bpm araligi disi: ' + a.bpm);
    const oran = a.bpm / opt.bpm;
    assert.ok(oran > 0.9 && oran < 1.1, `bpm=${a.bpm.toFixed(1)} beklenen~${opt.bpm}`);
  });

  test(`v7: ${ad} — beatler IZGARA, ham onset degil`, () => {
    const a = gercekAnaliz(opt);
    assert.ok(a.onsetler.length > 0, 'ham onsetler ayri alanda kalmali');
    assert.ok(a.beatler.length >= 20, 'beat=' + a.beatler.length);
    const periyot = 60 / a.bpm;
    const ar = [];
    for (let i = 1; i < a.beatler.length; i++) ar.push(a.beatler[i] - a.beatler[i - 1]);
    // Veridis Quo hatasi: 0.416 / 6.432 / 0.18 sn araliklar (6 sn bosluk, cift vurus).
    // TERRITORY hatasi: aralik medyani 0.245 ama BPM 1.003 ima ediyordu (4x uyusmazlik).
    for (const d of ar)
      assert.ok(d > periyot * 0.75 && d < periyot * 1.25,
        `aralik ${d.toFixed(3)} periyot ${periyot.toFixed(3)} disinda`);
    const med = ar.slice().sort((x, y) => x - y)[ar.length >> 1];
    assert.ok(Math.abs(med - periyot) < periyot * 0.08,
      `medyan ${med.toFixed(3)} BPM izgarasina oturmuyor (${periyot.toFixed(3)})`);
  });

  test(`v7: ${ad} — drop bulunur ama ENFLASYON yok`, () => {
    const a = gercekAnaliz(opt);
    assert.ok(a.droplar.length > 0, 'gercek muzikte drop 0 dondu');
    // v7 hatasi: Veridis Quo'da 57 drop / 345 sn (her 6 sn'de bir patlama).
    const kota = dropKota(a.sure);
    assert.ok(a.droplar.length <= kota,
      `drop enflasyonu: ${a.droplar.length} > kota ${kota} (${a.sure.toFixed(0)} sn)`);
    for (let i = 1; i < a.droplar.length; i++)
      assert.ok(a.droplar[i] - a.droplar[i - 1] >= 14.9,
        'droplar arasi min 15 sn: ' + JSON.stringify(a.droplar));
  });

  test(`v7: ${ad} — bolumler tek parca degil, build/drop icerir`, () => {
    const a = gercekAnaliz(opt);
    const tipler = a.bolumler.map(b => b.tip);
    // v7 hatasi: her sarkida 2 bolum, tipler yalnizca ["giris","verse"] —
    // 5.5 dakikanin 5 dakikasi tek blok.
    assert.ok(a.bolumler.length >= 5 && a.bolumler.length <= 12,
      'bolum sayisi makul degil: ' + JSON.stringify(tipler));
    const kume = new Set(tipler);
    assert.ok(kume.size >= 3, 'tip cesitliligi yok: ' + JSON.stringify([...kume]));
    assert.ok(kume.has('drop') || kume.has('build'),
      'enerji yapisi okunamadi: ' + JSON.stringify([...kume]));
    for (const b of a.bolumler) assert.ok(b.t1 > b.t0, JSON.stringify(b));
  });

  test(`v7: ${ad} — drop tespiti ile bolum tespiti KONUSUR`, () => {
    const a = gercekAnaliz(opt);
    // v7 tutarsizligi: 35-57 drop bulunuyordu ama hic 'drop'/'build' tipi bolum
    // yoktu. Her drop, 'drop' tipi bir bolumun basina denk gelmeli.
    for (const t of a.droplar) {
      const b = a.bolumler.find(s => t >= s.t0 && t < s.t1);
      assert.ok(b, `drop ${t} hicbir bolume dusmuyor`);
      assert.equal(b.tip, 'drop', `drop ${t} '${b.tip}' bolumune dustu`);
      assert.ok(Math.abs(b.t0 - t) < 1e-6 || b.t0 === 0,
        `drop ${t} bolum basinda degil (bolum ${b.t0})`);
    }
  });

  test(`v7: ${ad} — hue 0-1 sozlesmesi + renk koreografisi`, () => {
    const a = gercekAnaliz(opt);
    const c = timelineUret(a, [{ id: 'spot_1', tur: 'rgb_spot' }, { id: 'jet_1', tur: 'duz_jet' }]);
    for (const k of c.kanallar.filter(k => k.hedef.endsWith('.hue'))) {
      for (const [t, v] of k.anahtarlar)
        assert.ok(v >= 0 && v <= 1, `${k.hedef} t=${t} hue=${v} (0-1 disi — editor y-araligi tasiyor)`);
      // 5 dk sovda 2 anahtarlik tek rampa degil, gercek koreografi
      assert.ok(k.anahtarlar.length >= 8, k.hedef + ' anahtar=' + k.anahtarlar.length);
    }
  });

  test(`v7: ${ad} — dinamik aralik acik, geyser gorunur, laminer seyrek`, () => {
    const a = gercekAnaliz(opt);
    const c = timelineUret(a, [
      { id: 'jet_1', tur: 'duz_jet' }, { id: 'geyser_1', tur: 'geyser' },
      { id: 'laminer_1', tur: 'laminer' }, { id: 'spot_1', tur: 'rgb_spot' }]);
    const al = (h) => c.kanallar.find(k => k.hedef === h);
    const enb = (k) => Math.max(...k.anahtarlar.map(x => x[1]));
    const enk = (k) => Math.min(...k.anahtarlar.map(x => x[1]));

    const jm = al('jet_1.master');            // eskiden min 0.25 max 0.65 (sikisik)
    assert.ok(enb(jm) >= 0.9, 'jet master doruga cikmiyor: ' + enb(jm));
    assert.ok(enk(jm) <= 0.3, 'jet master sessizde kisilmiyor: ' + enk(jm));

    const pk = al('spot_1.parlaklik');        // eskiden 0.35-0.87
    assert.ok(enb(pk) - enk(pk) >= 0.5, 'parlaklik dinamik araligi dar: ' + (enb(pk) - enk(pk)));

    const gm = al('geyser_1.master');         // eskiden 2 anahtar, min 0 max 0 → gorunmez
    assert.ok(enb(gm) === 1, 'geyser tum sov boyunca kapali (cihaz gorunmez)');
    assert.ok(gm.anahtarlar.length >= 4, 'geyser hic tetiklenmedi: ' + gm.anahtarlar.length);

    const lm = al('laminer_1.master');        // eskiden 498 anahtar → strobe riski
    // v7.1: sinir sureyle olcekli (uzun parcada dogal olarak daha cok gecis olur)
    const lmKota = Math.max(20, Math.round(a.sure * 0.2));
    assert.ok(lm.anahtarlar.length <= lmKota,
      `laminer asiri anahtar: ${lm.anahtarlar.length} > ${lmKota}`);
    for (let i = 2; i < lm.anahtarlar.length - 1; i++)   // min surekli durum
      assert.ok(lm.anahtarlar[i][0] - lm.anahtarlar[i - 1][0] >= 0.25,
        'laminer 0.25 sn alti ac/kapa (strobe): ' + JSON.stringify(lm.anahtarlar.slice(i - 1, i + 1)));
  });

  test(`v7: ${ad} — artan() zaman sirasi tum kanallarda korunur`, () => {
    const a = gercekAnaliz(opt);
    const c = timelineUret(a, [
      { id: 'jet_1', tur: 'duz_jet' }, { id: 'geyser_1', tur: 'geyser' },
      { id: 'laminer_1', tur: 'laminer' }, { id: 'spot_1', tur: 'rgb_spot' },
      { id: 'switch_1', tur: 'switch' }, { id: 'air_1', tur: 'air' },
      { id: 'robo_1', tur: 'robo' }, { id: 'perde_1', tur: 'perde' },
      { id: 'aquajet_1', tur: 'aquajet' }, { id: 'torch_1', tur: 'torch' }]);
    assert.equal(c.sure, a.sure, 'timeline sozlesmesi: sure alani');
    for (const k of c.kanallar) {
      assert.ok(Array.isArray(k.anahtarlar) && k.hedef && k.tip, 'kanal sozlesmesi: ' + JSON.stringify(k.hedef));
      for (let i = 1; i < k.anahtarlar.length; i++)
        assert.ok(k.anahtarlar[i][0] > k.anahtarlar[i - 1][0], k.hedef + ' [' + i + ']');
    }
  });
}
