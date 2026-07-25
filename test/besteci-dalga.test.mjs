// besteci-dalga.test.mjs — v8 KONUM-FAZLI DALGA kanıtı (Salih ana şikayeti:
// "tüm cihazlar aynı anda yükselip alçalıyor" — tekdüze). Bu test, cihazların
// KONUMUNA göre master eğrisinin FAZ kaydığını (biri yükselirken biri alçalır)
// KİLİTLER — v7'de aynı-tür iki cihaz birebir aynı master eğrisini alıyordu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizEt, timelineUret, sentetikPCM } from '../studio/js/besteci.js';

function fakeBuffer(saniye = 16, bpm = 120) {
  const { veri, sr } = sentetikPCM(saniye, bpm);
  return { sampleRate: sr, duration: saniye, numberOfChannels: 1, getChannelData: () => veri };
}
const anahtarSerisi = (c, hedef) => c.kanallar.find(k => k.hedef === hedef).anahtarlar;

test('dalga: iki FARKLI konumdaki aynı-tür cihazın master eğrisi FARKLI (faz kayması)', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [
    { id: 'jL', tur: 'duz_jet', x: -3, z: 0 },
    { id: 'jR', tur: 'duz_jet', x: 3, z: 0 },
  ]);
  const mL = anahtarSerisi(c, 'jL.master'), mR = anahtarSerisi(c, 'jR.master');
  assert.equal(mL.length, mR.length, 'aynı örnekleme ızgarası beklenir');
  // en az bir t'de belirgin yükseklik farkı olmalı = biri tepede biri çukurda
  let enFark = 0;
  for (let i = 0; i < mL.length; i++) enFark = Math.max(enFark, Math.abs(mL[i][1] - mR[i][1]));
  assert.ok(enFark > 0.15, 'iki cihaz master farkı çok küçük (tekdüze): enFark=' + enFark.toFixed(3));
});

test('dalga: aynı t\'de bazı cihazlar YÜKSEK bazıları ALÇAK (uzaysal dalga)', () => {
  const a = analizEt(fakeBuffer());
  // bir çizgi üzerinde 8 cihaz — bir anda tepe+çukur birlikte bulunmalı
  const cihazlar = [];
  for (let i = 0; i < 8; i++) cihazlar.push({ id: 'j' + i, tur: 'duz_jet', x: -4 + i, z: 0 });
  const c = timelineUret(a, cihazlar);
  const seriler = cihazlar.map(cc => anahtarSerisi(c, cc.id + '.master'));
  // yüksek-enerjili bir örnek indeksi bul (drop civarı ~ t=10)
  const idx = seriler[0].findIndex(([t]) => t >= 10);
  const anlik = seriler.map(s => s[idx][1]);
  const yayilim = Math.max(...anlik) - Math.min(...anlik);
  assert.ok(yayilim > 0.15,
    'aynı anda cihazlar arası yükseklik yayılımı yok (dalga görünmez): ' + JSON.stringify(anlik.map(v => +v.toFixed(2))));
});

test('dalga: env·wave — sessizlikte (env=0) master ~0 (kapalı cihaz açılmaz)', () => {
  // sentetik parça outro'da (t>14) enerji 0'a iner. Dalga env'i ÇARPTIĞI için
  // master da 0'a inmeli. Eski 0.15 tabanı olsaydı min ≥ 0.15 olurdu.
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [{ id: 'j1', tur: 'duz_jet', x: -3, z: 0 }]);
  const m = anahtarSerisi(c, 'j1.master');
  const enKucuk = Math.min(...m.map(x => x[1]));
  assert.ok(enKucuk < 0.05, 'master sessizde kapanmıyor (dalga env çarpmıyor): min=' + enKucuk.toFixed(3));
});

test('dalga: iki farklı konumlu cihazın hue\'su bir t\'de FARKLI (uzaysal gradyan)', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [
    { id: 'jL', tur: 'duz_jet', x: -3, z: 0 },
    { id: 'jR', tur: 'duz_jet', x: 3, z: 0 },
  ]);
  const hL = anahtarSerisi(c, 'jL.hue'), hR = anahtarSerisi(c, 'jR.hue');
  assert.ok(Math.abs(hL[0][1] - hR[0][1]) > 0.01,
    'konuma göre hue gradyanı yok: hL0=' + hL[0][1] + ' hR0=' + hR[0][1]);
});

test('dalga: konumsuz cihazlarda faz YOK (geriye uyumlu tekdüze)', () => {
  // x,z verilmeyen cihazlar (fakeBuffer testleri) → u=0 → dalga aynı → eski davranış.
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [{ id: 'j1', tur: 'duz_jet' }, { id: 'j2', tur: 'duz_jet' }]);
  const m1 = anahtarSerisi(c, 'j1.master'), m2 = anahtarSerisi(c, 'j2.master');
  for (let i = 0; i < m1.length; i++)
    assert.equal(m1[i][1], m2[i][1], 'konumsuz cihazlar aynı master almalı @' + i);
});

test('dalga: switch fazlı kesme — iki konumdaki switch farklı zamanlarda keser', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [
    { id: 's1', tur: 'switch', x: -4, z: 0 },
    { id: 's2', tur: 'switch', x: 4, z: 0 },
  ]);
  const t1 = anahtarSerisi(c, 's1.master').map(x => x[0]);
  const t2 = anahtarSerisi(c, 's2.master').map(x => x[0]);
  // en az bir açılış anı farkı olmalı (konuma göre gecikme τ)
  const n = Math.min(t1.length, t2.length);
  let farkVar = false;
  for (let i = 1; i < n; i++) if (Math.abs(t1[i] - t2[i]) > 0.01) { farkVar = true; break; }
  assert.ok(farkVar, 'switch kesme anları konuma göre kaymıyor (pat-pat devam)');
});

test('dalga: master doruğa çıkar (env tepesinde dalga tepesi ~ tam env)', () => {
  const a = analizEt(fakeBuffer());
  const c = timelineUret(a, [{ id: 'j1', tur: 'duz_jet', x: -3, z: 0 }]);
  const m = anahtarSerisi(c, 'j1.master');
  const enBuyuk = Math.max(...m.map(x => x[1]));
  assert.ok(enBuyuk >= 0.85, 'master doruğa çıkmıyor (dalga tepe env\'i kısıyor): max=' + enBuyuk.toFixed(3));
  assert.ok(enBuyuk <= 1.0001, 'master 1 sözleşmesini aşıyor: max=' + enBuyuk.toFixed(3));
});
