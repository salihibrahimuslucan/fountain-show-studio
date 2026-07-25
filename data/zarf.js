// zarf.js — cihaz DİNAMİK zarfı: saf (THREE'siz, Node testli) türetme katmanı.
//
// NEDEN VAR: motor.js'teki preset hızları elle uydurulmuş sabitlerdi. Oysa
// balistik jette YÜKSEKLİK İLE TEPEYE ÇIKIŞ SÜRESİ AYNI SAYIDIR:
//     v = √(2gh)      h = v²/2g      t = v/g
// Bağımsız ayarlanamazlar. Salih'in "SWITCH çok hızlı açılıyor" gözlemi ile
// "kolon çok kısa" aynı hatanın iki yüzüydü (kod 2.36 m / 0.69 s, katalog 6 m).
// Bkz. docs/superpowers/specs/2026-07-19-cihaz-zarf-ve-montaj-design.md

import { URUN_ZARFLARI } from './zarf-urunler.js';

export const G_VARSAYILAN = 9.81;

// ⚠GECERSIZ GIRDIDE 0: bu ilkel fonksiyonlar fiziksel OLCUM dondurur, gorsel
// bir carpan degil — sessiz 0, kontakt sayfasinda "0.00 m" olarak basilip
// "veri eksik" ile karisabilir. IKI KATMANLI KORUMA: (1) suZarfi() girisinde
// yukseklik kaynagi ve yasalTavan adi DOGRULANIR, gecersizse PATLAR;
// (2) test/zarf-tablo.test.mjs her urunun turetilmis tepeM/tYukselis > 0
// oldugunu dogrular. Ilkellerin kendisi 0 dondurmeye devam eder (null/NaN
// asagi akista aritmetigi zaten bozar, farki yalnizca gurultunun yeri).

// Tepe yüksekliğinden çıkış hızı: v = √(2gh)
export function tepedenHiz(h, g = G_VARSAYILAN) {
  if (!(h > 0) || !(g > 0)) return 0;
  return Math.sqrt(2 * g * h);
}

// Çıkış hızından tepe yüksekliği: h = v²/2g
export function hizdanTepe(v, g = G_VARSAYILAN) {
  if (!(v > 0) || !(g > 0)) return 0;
  return (v * v) / (2 * g);
}

// Tepeye çıkış süresi: t = v/g
export function yukselisSuresi(v, g = G_VARSAYILAN) {
  if (!(v > 0) || !(g > 0)) return 0;
  return v / g;
}

// Tepeden y=0'a düşüş süresi: t = √(2h/g)
// y=0'dan atılan jette bu yukselisSuresi'ne EŞİTTİR (simetrik parabol).
// Ayrı fonksiyon olmasının sebebi duvar_perde: oradan su y0'dan düşer,
// yükseliş yoktur, yalnız bu terim çalışır.
export function dususSuresi(h, g = G_VARSAYILAN) {
  if (!(h > 0) || !(g > 0)) return 0;
  return Math.sqrt((2 * h) / g);
}

// ISPSC §612.5.3 — yürünebilir su oyun alanında nozul çıkış hızı tavanı.
// 20 ft/s = 6.096 m/s, 6.1'e yuvarlandı (kod metni ft cinsinden verir).
// ⚠Birincil metne erişilemedi (codes.iccsafe.org 403); up.codes üzerinden
// ikincil doğrulandı + Ohio HB 178 aynı limiti tekrarlıyor. Hukuki iddia
// olarak DEĞİL, modelleme tavanı olarak kullanılır.
export const ISPSC_HIZ_TAVANI = 6.1;

export const YASAL_TAVANLAR = new Set(['ispsc_612']);

// Katalog MAKSİMUM verir, tipik çalışma noktası vermez. Varsayılan maksimuma
// kurulursa her cihaz sürekli tavanda çalışıyormuş gibi görünür.
// ⚠KALİBRASYON BORCU, fizik sabiti DEĞİL: elimizdeki tek ölçüm noktası
// SWITCH — Salih gözle 3.1-5.0 m dedi, katalog maks 6.0 m, oran 0.52-0.83,
// orta nokta 0.68. Vitrin turunda başka cihazlar işaretlenince yeniden hesapla.
export const TIPIK_ORAN = 0.70;

// Su zarfı: tepe + çıkış hızı + yükseliş/düşüş süreleri.
//
// girdi:  { maksTepeM, tipikTepeM?, yasalTavan?, montaj?, dokulmeYuksekligiM?, g? }
// çıktı:  { tepeM, hizMs, tYukselis, tDusus, kelepcelendi }
//
// Türetme sırası: katalog tipik > 0.70×maks > yasal tavan kelepçesi.
export function suZarfi({
  maksTepeM = 0, tipikTepeM = null, yasalTavan = null,
  montaj = 'islak_havuz', dokulmeYuksekligiM = 0, g = G_VARSAYILAN,
} = {}) {
  // ⚠SESSIZ KACAK KAPISI: tanınmayan tavan adı kelepçeyi atlatır ve yasal
  // sınırın üstündeki hız `kelepcelendi:false` ile "doğrulanmış" görünür.
  if (yasalTavan != null && !YASAL_TAVANLAR.has(yasalTavan)) {
    throw new Error(`zarf: bilinmeyen yasalTavan "${yasalTavan}" — gecerli: ${[...YASAL_TAVANLAR].join(', ')}`);
  }

  // Perde ailesi yukarı ATMAZ, yukarıdan DÖKÜLÜR — balistik yükseliş terimi
  // yok, tepe = döküldüğü yükseklik. Aynı formülü zorlamak sahte bir çıkış
  // hızı üretirdi.
  if (montaj === 'duvar_perde') {
    return {
      tepeM: dokulmeYuksekligiM,
      hizMs: 0,
      tYukselis: 0,
      tDusus: dususSuresi(dokulmeYuksekligiM, g),
      kelepcelendi: false,
    };
  }

  // duvar_perde disinda yukseklik kaynagi ZORUNLU: sessiz 0 tepe, kontakt
  // sayfasinda gercek bir olcum gibi okunur (bkz. dosya basindaki not).
  if (!(maksTepeM > 0) && !(tipikTepeM > 0)) {
    throw new Error('zarf: yukseklik kaynagi yok — maksTepeM veya tipikTepeM verilmeli');
  }

  const hedefTepe = tipikTepeM ?? TIPIK_ORAN * maksTepeM;
  let v = tepedenHiz(hedefTepe, g);
  let kelepcelendi = false;

  if (yasalTavan === 'ispsc_612' && v > ISPSC_HIZ_TAVANI) {
    v = ISPSC_HIZ_TAVANI;
    kelepcelendi = true;
  }

  // Tepe HER ZAMAN son hızdan geri hesaplanır — kelepçelendiğinde hedef tepe
  // artık geçerli değildir, ikisini ayrı tutmak tutarsızlık üretirdi.
  const tepe = hizdanTepe(v, g);
  return {
    tepeM: tepe,
    hizMs: v,
    tYukselis: yukselisSuresi(v, g),
    tDusus: dususSuresi(tepe, g),
    kelepcelendi,
  };
}

// --- MEKANİZMA ZARFI: suyun değil, CİHAZIN kendi hareketi ------------------

// Salvo (solenoid/atımlı) cihazlar: AIR, POP, SWITCH, DryDECK.
//
// ⚠AIR dersi (93186c1): parçacık ÖMRÜ reload'dan KISA olmalı — değilse bütçe
// uzun bir boruya yayılır ve cihaz ekranda GÖRÜNMEZ olur. Salvo modelinde tüm
// bütçe tek karede doğar (slug).
//
// ⚠ATIM ≠ ÖMÜR: `atimSn` solenoidin AÇIK kaldığı penceredir (AIR'de 0.5 s),
// `omurSn` parçacığın yaşadığı süredir (AIR'de 3.4-4.0 s). Ders ÖMRÜ karşılaştırır.
// İlk sürüm atımı reload ile kıyaslıyordu — neredeyse her zaman trivial doğru
// çıkan, yani hiçbir şeyi korumayan bir koşuldu (kalite denetimi yakaladı).
// `omurSn` verilmezse gecerli:false — sessiz onay vermektense eksik veri de.
export function salvoZarfi({ atimSn = 0, reloadSn = 0, omurSn = 0 } = {}) {
  const periyot = atimSn + reloadSn;
  return {
    atimSn,
    reloadSn,
    omurSn,
    periyotSn: periyot,
    kadansHz: periyot > 0 ? 1 / periyot : 0,
    gecerli: atimSn > 0 && omurSn > 0 && omurSn < reloadSn,
  };
}

// Servo (pan/tilt) cihazlar: ROBO, ROBO-ROLL, SWING, HYDRA.
//
// Nozul dönerken su HAVADADIR — iniş noktası nozulun o anki yönünden değil,
// suyun ATILDIĞI andaki yönden gelir. Aradaki açı farkı uçuş süresi × açısal
// hızdır ve "kuyruklu yıldız" hissinin kaynağıdır. Bugün modellenmiyor.
// balistik.js iniş noktasını zaten hesaplıyor; bağlantı oraya yapılır.
export function servoGecikmeAcisi(acisalHizDerSn, ucusSuresiSn) {
  if (!(acisalHizDerSn > 0) || !(ucusSuresiSn > 0)) return 0;
  return acisalHizDerSn * ucusSuresiSn;
}

// --- ÜRÜN ÇÖZÜCÜSÜ ---------------------------------------------------------
// Bu dosya SAF TÜRETME katmanıdır: ürün TABLOSU burada değil,
// studio/data/zarf-urunler.js'tedir (ham veri ≠ formül; katalog.js ↔ motor.js
// ayrımının aynısı). Buradaki tek şey çözücü ve sınıf enum'u.

export const MONTAJ_SINIFLARI = new Set(['islak_havuz', 'kuru_meydan', 'duvar_perde']);

// Ürün adı → çözülmüş zarf; katalogda/tabloda olmayan üründe null.
//
// ⚠null DÖNER, PATLAMAZ: çağıran (motor.js, vitrin) tanımadığı üründe kendi
// arketip varsayılanına düşebilmeli — spec §T-E ileri uyumluluk. suZarfi()'nin
// kendi patlaması ise korunur: KAYITLI bir üründe bozuk veri sessizce geçmez.
export function urunZarfi(ad) {
  const kayit = URUN_ZARFLARI[ad];
  if (!kayit) return null;
  return {
    ...kayit,
    su: suZarfi({
      maksTepeM: kayit.maksTepeM,
      tipikTepeM: kayit.tipikTepeM,
      yasalTavan: kayit.yasalTavan,
      montaj: kayit.montaj,
      dokulmeYuksekligiM: kayit.dokulmeYuksekligiM ?? 0,
    }),
    mekanizma: kayit.salvo ? salvoZarfi(kayit.salvo) : null,
  };
}
