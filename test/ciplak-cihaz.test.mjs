// ciplak-cihaz.test.mjs — takılabilir 412C ışık modülü ilkesi (spec 2026-07-24
// Faz1 Task 3, künye alanı isikModul). Gerçek ürün gerçeği: 412C nozul-altı
// halka ÇOĞU cihaza (VARIO/SWITCH/JUMP/ROBO...) fabrikada TAKILI gelir — modül
// söküleBİLİR ama varsayılan doğum TAKILI'dır (Salih kararı: "çoğu üründe 412
// takılı olsun", kapı maddesi F1-3). Eskiden çıplak türler (vario/switch)
// ozIsik=false doğuyordu; bu test dosyası artık TERSİNİ doğrular. .aqshow
// gidiş-dönüşü ve elle sökülmüş (false) kaydın kalıcılığı hâlâ korunur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cihazYonetici, aqshowYaz, aqshowOku } from '../studio/js/proje.js';

function mockCtx() {
  const nesne = { dogalRenk: { r: 1, g: 1, b: 1 }, setMaster() {}, setHiz() {},
    setRenk() {}, setOzIsik(v) { this.ozIsik = v; }, setPanTilt() {}, konumla() {}, sil() {} };
  // AquaJUMP/GIANT arketipi 'laminer' — cihazYonetici bu türde ctx.LaminerJet'i
  // `new` ile çağırır (proje.js T15 notu: laminer.js three'ye bağlı, testte
  // enjekte edilen sahte sınıf yeter — motor.suEkle mock'uyla aynı rol).
  class LaminerJet {
    constructor() { this.dogalRenk = { r: 1, g: 1, b: 1 }; }
    setMaster() {} setRenk() {} konumla() {} sil() {}
  }
  return { ctx: { motor: { suEkle: () => nesne, suSil() {}, spotEkle: () => null },
    scene: null, cizelge: { kanallar: [], sure: 24 }, kirlet() {}, mesaj() {}, LaminerJet }, nesne };
}

test('paletten eklenen vario TAKILI doğar (ozIsik=true, motora iletilir) — F1-3', () => {
  const { ctx, nesne } = mockCtx();
  const y = cihazYonetici(ctx);
  const id = y.ekle('vario', 0, 0, 'AquaVARIO 151');
  const kayit = y.liste().find(c => c.id === id);
  assert.equal(kayit.ozIsik, true);
  assert.equal(nesne.ozIsik, true);          // setOzIsik(true) çağrıldı
});

test('paletten eklenen SWITCH de TAKILI doğar (künye+jenerik yedek ikisi de kapsıyor)', () => {
  const { ctx, nesne } = mockCtx();
  const y = cihazYonetici(ctx);
  y.ekle('switch', 0, 0, 'AquaSWITCH');
  assert.equal(nesne.ozIsik, true);
});

test('paletten eklenen yeni kapsam cihazı (JUMP/ROBO) da TAKILI doğar', () => {
  const { ctx } = mockCtx();
  const y = cihazYonetici(ctx);
  const idJump = y.ekle('laminer', 0, 0, 'AquaJUMP');
  const idRobo = y.ekle('robo', 1, 1, 'AquaROBO');
  assert.equal(y.liste().find(c => c.id === idJump).ozIsik, true);
  assert.equal(y.liste().find(c => c.id === idRobo).ozIsik, true);
});

test('.aqshow gidiş-dönüş elle sökülmüş (false) ozIsik alanını korur', () => {
  const { ctx } = mockCtx();
  const y = cihazYonetici(ctx);
  const id = y.ekle('vario', 0, 0, 'AquaVARIO 151');
  y.ozIsikAyarla(id, false);                 // elle sök — kayıtlı değer false olmalı
  const metin = aqshowYaz({ cihazlar: y.liste(), cizelge: ctx.cizelge });
  const geri = aqshowOku(metin);
  assert.equal(geri.cihazlar[0].ozIsik, false);
});

test('eski .aqshow (ozIsik alanı YOK) TAKILI açılır — geriye uyum', () => {
  const { ctx } = mockCtx();
  const y = cihazYonetici(ctx);
  y.ekle('vario', 0, 0, 'AquaVARIO 151');
  const eski = JSON.parse(aqshowYaz({ cihazlar: y.liste(), cizelge: ctx.cizelge }));
  for (const c of eski.cihazlar) delete c.ozIsik;   // eski dosya simülasyonu
  const geri = aqshowOku(JSON.stringify(eski));
  assert.equal(geri.cihazlar[0].ozIsik, true);
});

// Editör onay kutusu yolu: kayıt + motor birlikte güncellenir, geri açılınca
// eski görünüm döner (toggle geri-dönüşlü olmalı — görsel kapı Task 8'de).
test('ozIsikAyarla kaydı ve motoru birlikte günceller (geri-dönüşlü)', () => {
  const { ctx, nesne } = mockCtx();
  const y = cihazYonetici(ctx);
  const id = y.ekle('vario', 0, 0, 'AquaVARIO 151');
  y.ozIsikAyarla(id, false);
  assert.equal(y.liste().find(c => c.id === id).ozIsik, false);
  assert.equal(nesne.ozIsik, false);
  y.ozIsikAyarla(id, true);
  assert.equal(y.liste().find(c => c.id === id).ozIsik, true);
  assert.equal(nesne.ozIsik, true);
});
