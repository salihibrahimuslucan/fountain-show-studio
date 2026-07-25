// zarf.js UC BOLUMDEN olusuyor (su zarfi / mekanizma zarfi / montaj sinifi) ve
// her bolum kendi test dosyasini aliyor: zarf-balistik (bu dosya, formul
// katmani) · zarf-tablo (39 urunluk tablo butunlugu) · zarf-motor (motor.js
// baglantisi). Repodaki 1:1 modul-test eslesmesinden (balistik.js <->
// balistik.test.mjs) bilerek sapiliyor — tek dosyada 3 bolumun testi karisirdi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G_VARSAYILAN, tepedenHiz, hizdanTepe, yukselisSuresi, dususSuresi, suZarfi, ISPSC_HIZ_TAVANI, TIPIK_ORAN, salvoZarfi, servoGecikmeAcisi } from '../studio/data/zarf.js';

const yakin = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

test('tepedenHiz ve hizdanTepe birbirinin tersi', () => {
  for (const h of [0.4, 1.8, 3.0, 6.0, 20.4]) {
    yakin(hizdanTepe(tepedenHiz(h)), h);
  }
});

test('yukselisSuresi = v/g', () => {
  yakin(yukselisSuresi(9.81), 1.0);
});

test('y=0 nozulde yukselis ve dusus suresi ESITTIR (simetrik parabol)', () => {
  for (const h of [1.26, 2.1, 4.2]) {
    yakin(dususSuresi(h), yukselisSuresi(tepedenHiz(h)), 1e-9);
  }
});

test('SWITCH katalog maksimumu: 6 m -> 10.85 m/s, 1.11 s', () => {
  const v = tepedenHiz(6.0);
  yakin(v, 10.8499, 1e-3);
  yakin(yukselisSuresi(v), 1.1060, 1e-3);
});

test('gecersiz girdi 0 dondurur, NaN sizdirmaz', () => {
  assert.equal(tepedenHiz(-1), 0);
  assert.equal(hizdanTepe(0), 0);
  assert.equal(yukselisSuresi(-3), 0);
  assert.equal(dususSuresi(-1), 0);
});

test('ISPSC tavani 6.1 m/s (20 ft/s, sect 612.5.3)', () => {
  yakin(ISPSC_HIZ_TAVANI, 6.1);
});

test('tipik nokta = 0.70 x maks — SWITCH Salih penceresine dusuyor', () => {
  // Salih gozle "tepeye 0.8-1.0 s" dedi. Katalog maks 6 m.
  // 0.70 orani BAGIMSIZ olarak 0.925 s veriyor = pencerenin ortasi.
  // Bu testin kirilmasi orani degistirdigimiz anlamina gelir; spec'teki
  // kalibrasyon borcu notu da guncellenmeli.
  const z = suZarfi({ maksTepeM: 6.0 });
  yakin(z.tepeM, 4.2, 1e-9);
  yakin(z.hizMs, 9.0785, 1e-3);
  yakin(z.tYukselis, 0.9254, 1e-3);
  assert.equal(z.kelepcelendi, false);
  assert.ok(z.tYukselis > 0.8 && z.tYukselis < 1.0, 'Salih penceresi disinda');
});

test('katalog tipik verirse 0.70 orani KULLANILMAZ', () => {
  const z = suZarfi({ maksTepeM: 6.0, tipikTepeM: 5.0 });
  yakin(z.tepeM, 5.0, 1e-9);
});

test('yasalTavan ispsc_612 hizi kelepceler ve tepeyi GERI hesaplar', () => {
  const z = suZarfi({ maksTepeM: 6.0, yasalTavan: 'ispsc_612' });
  yakin(z.hizMs, 6.1, 1e-9);
  yakin(z.tepeM, 1.8965, 1e-3);
  yakin(z.tYukselis, 0.6218, 1e-3);
  assert.equal(z.kelepcelendi, true);
});

test('tavan altinda kalan cihaz kelepcelenmez', () => {
  // DryDECK: kart v2 uc bagimsiz yoldan 1.8 m dedi -> tipik 1.26 m -> 4.97 m/s
  const z = suZarfi({ maksTepeM: 1.8, yasalTavan: 'ispsc_612' });
  assert.equal(z.kelepcelendi, false);
  yakin(z.hizMs, 4.9721, 1e-3);
});

test('duvar_perde: yukselis YOK, yalnizca dusus', () => {
  const z = suZarfi({ montaj: 'duvar_perde', dokulmeYuksekligiM: 2.6 });
  assert.equal(z.tYukselis, 0);
  yakin(z.tDusus, 0.7281, 1e-3);
  yakin(z.tepeM, 2.6, 1e-9);
});

test('taninmayan yasalTavan SESSIZCE gecmez, PATLAR', () => {
  // Task 4'te 39 kayit elle girilecek; 'ispsc612' gibi bir yazim hatasi
  // sessizce kelepcesiz gecerse yasal tavanin ustundeki hiz "dogru" gibi
  // raporlanir. Sessiz kacak yerine gurultulu hata.
  assert.throws(() => suZarfi({ maksTepeM: 6.0, yasalTavan: 'ispsc612' }),
    /yasalTavan/);
  // null ve tanimsiz GECERLI — tavani olmayan cihaz cogunluk
  assert.doesNotThrow(() => suZarfi({ maksTepeM: 6.0, yasalTavan: null }));
  assert.doesNotThrow(() => suZarfi({ maksTepeM: 6.0 }));
});

test('yukseklik kaynagi olmayan cagri PATLAR (sessiz 0 tepe uretmez)', () => {
  // `maksTepM:` gibi bir yazim hatasi taninmayan anahtar olarak sessizce
  // dusuyordu -> tepeM 0. Kontakt sayfasinda "0.00 m" ile "veri eksik"
  // ayirt edilemez; tam da bu aracin onlemesi gereken hata sinifi.
  assert.throws(() => suZarfi({ maksTepM: 6.0 }), /yukseklik/i);
  assert.throws(() => suZarfi({}), /yukseklik/i);
  // duvar_perde MUAF — onun yuksekligi dokulmeYuksekligiM'den gelir
  assert.doesNotThrow(() => suZarfi({ montaj: 'duvar_perde', dokulmeYuksekligiM: 2.6 }));
});

test('salvoZarfi: GERCEK AquaAIR yapilandirmasi gecerli', () => {
  // motor.js:298-306 — salvo {atim 0.5, reload 6.0}, particle life 3.4-4.0.
  // AIR dersi (93186c1) OMRU reload ile karsilastirir, atimi DEGIL.
  const z = salvoZarfi({ atimSn: 0.5, reloadSn: 6.0, omurSn: 4.0 });
  yakin(z.periyotSn, 6.5, 1e-9);
  yakin(z.kadansHz, 1 / 6.5, 1e-9);
  assert.equal(z.gecerli, true);
});

test('salvoZarfi: omur reload_u ASARSA gecersiz (AIR gorunmezlik hatasi)', () => {
  // Bu tam olarak AquaAIR'i ekranda GORUNMEZ yapan yapilandirmaydi:
  // omur >= reload -> butce uzun bir boruya yayilir, slug olusmaz.
  const z = salvoZarfi({ atimSn: 0.5, reloadSn: 1.0, omurSn: 3.0 });
  assert.equal(z.gecerli, false);
});

test('salvoZarfi: omur verilmezse gecerli SAYILMAZ (sessiz onay yok)', () => {
  // Eski hata: fonksiyon omru parametre olarak bile almiyordu ve yorum
  // "gecerli bu kurali tasir" diyordu — ad tuketiciye sahte guven veriyordu.
  const z = salvoZarfi({ atimSn: 0.5, reloadSn: 6.0 });
  assert.equal(z.gecerli, false);
});

test('servoGecikmeAcisi: nozul donerken su havada, kaynak KAYAR', () => {
  // 60 der/sn donen nozul, 1.0 s ucus -> su 60 derece GERIDEN iner.
  // "Kuyruklu yildiz" hissinin kaynagi bu.
  yakin(servoGecikmeAcisi(60, 1.0), 60, 1e-9);
  yakin(servoGecikmeAcisi(60, 0.5), 30, 1e-9);
  yakin(servoGecikmeAcisi(0, 1.0), 0, 1e-9);
});
