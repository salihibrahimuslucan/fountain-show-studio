// besteci-uctan-uca.test.mjs — analizEt → timelineUret zincirinin UCTAN UCA
// dayanikligi (2026-07-18 denetim turu). Gercek mp3 Node'da cozulemez, ama
// analizEt yalnizca {sampleRate, numberOfChannels, length, getChannelData}
// arayuzunu kullaniyor — sahte AudioBuffer ile GERCEK kod yolu kosulur.
//
// Gerekce: besteci'nin ciktisi DOGRUDAN timeline'a yaziliyor ve .aqshow'a
// kaydediliyor. Buradan sizan tek bir NaN / ters sirali anahtar / arali disi
// deger, sahnede sessiz olu cihaz ve kalici bozuk dosya demek.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizEt, timelineUret, sentetikPCM } from '../studio/js/besteci.js';

function sahteBuffer(pcm, sr = 44100, kanal = 1) {
  return {
    sampleRate: sr, numberOfChannels: kanal, length: pcm.length,
    duration: pcm.length / sr,
    getChannelData: () => pcm
  };
}
const sessiz = (sn, sr = 44100) => new Float32Array(Math.round(sn * sr));
const gurultu = (sn, sr = 44100) => {
  const a = new Float32Array(Math.round(sn * sr));
  let s = 12345;                                   // deterministik LCG (Math.random yok)
  for (let i = 0; i < a.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; a[i] = (s / 0x3fffffff) - 1; }
  return a;
};
const kirpik = (sn, sr = 44100) => {              // tam doygun kare dalga (en kotu hal)
  const a = new Float32Array(Math.round(sn * sr));
  for (let i = 0; i < a.length; i++) a[i] = i % 200 < 100 ? 1 : -1;
  return a;
};

const CIHAZLAR = [
  { id: 'duz_jet_1', tur: 'duz_jet' }, { id: 'geyser_1', tur: 'geyser' },
  { id: 'switch_1', tur: 'switch' }, { id: 'robo_1', tur: 'robo' },
  { id: 'rgb_spot_1', tur: 'rgb_spot' }, { id: 'vario_1', tur: 'vario' }
];

const ARALIK = { hue: [0, 1], beyaz: [0, 1], master: [0, 1], parlaklik: [0, 1.5],
                 hiz: [0, 1.6], pan: [-90, 90], tilt: [0, 45] };

function cizelgeDenetle(kanallar, sure, etiket) {
  assert.ok(kanallar.length > 0, `${etiket}: hic kanal uretilmedi`);
  for (const k of kanallar) {
    assert.ok(k.anahtarlar.length > 0, `${etiket}/${k.hedef}: bos kanal`);
    let onceki = -Infinity;
    for (const [t, v] of k.anahtarlar) {
      assert.ok(Number.isFinite(t), `${etiket}/${k.hedef}: zaman NaN`);
      assert.ok(Number.isFinite(v), `${etiket}/${k.hedef}: DEGER NaN @${t} (setter sessizce olur)`);
      assert.ok(t >= onceki - 1e-9, `${etiket}/${k.hedef}: sira bozuk @${t} (ornekle ikili aramasi bozulur)`);
      assert.ok(t >= 0 && t <= sure + 1e-3, `${etiket}/${k.hedef}: zaman sure disinda @${t}`);
      const ar = ARALIK[k.hedef.split('.').pop()];
      if (ar) assert.ok(v >= ar[0] - 1e-6 && v <= ar[1] + 1e-6,
        `${etiket}/${k.hedef} @${t} = ${v}, aralik ${ar} disinda (cue serit disina duser)`);
      onceki = t;
    }
  }
}

// sentetikPCM {veri, sr} doner (Float32Array DEGIL) — ana.js onu AudioBuffer'a sarar.
const sent = (sn, bpm = 120, stil = 'enerjik') => {
  const { veri, sr } = sentetikPCM(sn, bpm, stil);
  return sahteBuffer(veri, sr);
};

const zorGirdiler = [
  ['sentetik 16s enerjik', sent(16, 120)],
  ['sentetik 4s',          sent(4, 90)],
  ['TAM SESSIZ 8s',        sahteBuffer(sessiz(8))],
  ['cok kisa 10ms',        sahteBuffer(sessiz(0.01))],
  ['tek ornek',            sahteBuffer(new Float32Array(1))],
  ['beyaz gurultu 6s',     sahteBuffer(gurultu(6))],
  ['kirpik kare dalga 6s', sahteBuffer(kirpik(6))],
  ['stereo sentetik',      (() => { const b = sent(12, 128); return { ...b, numberOfChannels: 2 }; })()],
  ['dusuk ornekleme 8kHz', (() => { const { veri } = sentetikPCM(8, 110, 'enerjik'); return sahteBuffer(veri, 8000); })()],
  ['uzun 5 dakika',        sent(300, 124)]
];

for (const [etiket, buf] of zorGirdiler) {
  test(`analizEt+timelineUret: ${etiket} — NaN/bozuk sira/aralik disi YOK`, () => {
    const a = analizEt(buf);
    assert.ok(Number.isFinite(a.sure) && a.sure >= 0, `${etiket}: sure=${a.sure}`);
    assert.ok(Number.isFinite(a.bpm), `${etiket}: bpm=${a.bpm}`);
    assert.ok(Array.isArray(a.beatler), `${etiket}: beat listesi yok`);
    for (const b of a.beatler) assert.ok(Number.isFinite(b), `${etiket}: beat NaN`);
    const cz = timelineUret(a, CIHAZLAR);          // {sure, kanallar} doner
    assert.ok(Number.isFinite(cz.sure) && cz.sure > 0, `${etiket}: cizelge suresi=${cz.sure}`);
    cizelgeDenetle(cz.kanallar, cz.sure, etiket);
  });
}

test('analizEt: BPM makul bantta (oktav hatasi regresyonu)', () => {
  // v7'de gercek sarkida BPM 59.8 cikiyordu (oktav hatasi, gercegi 120).
  const a = analizEt(sent(24, 120));
  assert.ok(a.bpm >= 60 && a.bpm <= 200, `bpm=${a.bpm} makul bandin disinda`);
});

test('timelineUret: her cihaz en az bir kanal alir (sessiz olu cihaz yok)', () => {
  const a = analizEt(sent(16, 120));
  const { kanallar } = timelineUret(a, CIHAZLAR);
  const hedefli = new Set(kanallar.map(k => k.hedef.split('.')[0]));
  for (const c of CIHAZLAR) assert.ok(hedefli.has(c.id), `${c.id} (${c.tur}) hic kanal almadi`);
});

test('timelineUret: cihaz listesi BOS iken cokmez', () => {
  const a = analizEt(sent(8, 120));
  assert.doesNotThrow(() => timelineUret(a, []));
});

test('timelineUret: TAM SESSIZ parcada bile sov tamamen olu kalmaz VEYA duz kalir (sessizce NaN degil)', () => {
  const a = analizEt(sahteBuffer(sessiz(8)));
  const { kanallar } = timelineUret(a, CIHAZLAR);
  const master = kanallar.filter(k => k.hedef.endsWith('.master'));
  assert.ok(master.length > 0);
  for (const k of master) for (const [, v] of k.anahtarlar) assert.ok(Number.isFinite(v));
});
