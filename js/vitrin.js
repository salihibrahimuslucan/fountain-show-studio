// vitrin.js — cihaz denetim tezgahi (#vitrin=<urun>).
//
// NEDEN VAR: cihazlarin hakemi yoktu. UI tarafinda headless kare + etkilesim
// kosucusu kendi hatalarimi yakaliyor; cihaz tarafinda "bu dogru mu" sorusunu
// yalnizca Salih'in gozu cevaplayabiliyordu, bu yuzden her kapi ona geliyordu.
// Bu tezgah 39 cihazi AYNI kosulda yan yana getirir: ayni isik, metre cetveli,
// cihazin KENDI montaj zemini.
//
// ⚠Zemin cihazin montaj sinifindan gelir. Bir DryDECK'i havuzda gostermek
// bastan yanlis olur — o cihaz tanimi geregi kuru, yurunebilir meydan cihazi.
import * as THREE from 'three';
import { urunZarfi } from '../data/zarf.js';

// Cercevenin kapsadigi DUNYA-yuksekligi (metre). ⚠BU FONKSIYON boy-siliniyor
// yanilmasinin duzeltmesi: eskiden kadraj HER cihazin kendi tepesine olceklendigi
// icin 15/25/40 m JET'lerin UCU DE cerceveyi ayni doldururdu → ekran boyu ozdes,
// "JET 1-2-3 fark yok" (Salih). Cozum iki rejim:
//   • YAKIN (tepe ≤ YAKIN_TAVAN): cihaza gore fit — 0.30 m POP, 2 m VARIO gibi
//     kucuk cihazlar cerceveyi doldurur, OKUNUR kalir (sabit uzak olcek onlari
//     gorunmez noktaya dusururdu).
//   • UZAK (tepe > YAKIN_TAVAN): SABIT cerceve (UZAK_CERCEVE). Ayni sabit metre
//     olcegini paylasan JET I/II/III artik gercek oranlarinda cizilir — 40 m,
//     15 m'nin ~2.6 kati GORUNUR. Cetvel de bu cerceveden turedigi icin JET I
//     0..UZAK_CERCEVE seridinde 15 m'de biter, JET III 40 m'de → boy kanit.
// UZAK_CERCEVE en yuksek dik cihaz (JET III 40 m, AquaAIR 35 m) sigacak sekilde
// secildi; pay·40 headroom ikisini de kadrajda tutar.
export function cerceveBoyu(tepeM) {
  const YAKIN_TAVAN = 10;    // m — buna kadar cihaza-gore yakin fit (POP/VARIO okunur)
  const UZAK_CERCEVE = 40;   // m — ustunde sabit cerceve (JET I/II/III ayrisir, AIR sigar)
  const t = Math.max(0.6, tepeM);
  return t <= YAKIN_TAVAN ? t : UZAK_CERCEVE;
}

// Kadraj: cerceveBoyu iki rejimli SABIT metre olcegi verir (yukaridaki not).
export function kadrajHesapla(tepeM, kamera, pay = 1.35) {
  const yukseklik = cerceveBoyu(tepeM) * pay;
  const fovRad = (kamera.fov * Math.PI) / 180;
  const uzaklik = (yukseklik / 2) / Math.tan(fovRad / 2);
  return {
    konum: { x: 0, y: yukseklik * 0.45, z: uzaklik },
    bakis: { x: 0, y: yukseklik * 0.40, z: 0 },
    uzaklik,
  };
}

// Metre cetveli: her 1 m'de çizgi, her 5 m'de kalın. Ust sinir kadrajla AYNI
// cerceveden turer — yoksa uzak rejimde cetvel cihaz boyunda biter, kamera daha
// genis bakar, olcek tutarsizlasirdi.
export function cetvelYap(tepeM) {
  const grup = new THREE.Group();
  const ustSinir = Math.ceil(cerceveBoyu(tepeM) * 1.35);
  const mat = new THREE.LineBasicMaterial({ color: 0x6d747c });
  const matAna = new THREE.LineBasicMaterial({ color: 0xd98e33 });
  for (let m = 0; m <= ustSinir; m++) {
    const uzun = m % 5 === 0;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.0, m, 0),
      new THREE.Vector3(-2.0 + (uzun ? 0.6 : 0.3), m, 0),
    ]);
    grup.add(new THREE.Line(g, uzun ? matAna : mat));
  }
  return grup;
}

// Her montaj sinifi bir GERCEK fon presetine baglanir (studio/js/fon-preset.js).
// Onceki renk/yansima/ripple alanlari OLU idi — ana.js vitrin rotasi zemin'i hic
// okumuyordu, fonSec('sade', 0) sabit kodluydu; bir kuru_meydan cihazi (DryDECK,
// POP JET) sade'nin su bloğu yuzunden SU USTUNDE gorunuyordu (vitrin.js:9 "bastan
// yanlis"). Artik fon adi burada durur, ana.js okur.
//   islak_havuz -> 'sade'  (yildizli gok + su yuzeyi = islak havuz)
//   kuru_meydan -> 'kuru'  (kuru:true → su yuzeyi GIZLI, beton meydan)
//   duvar_perde -> 'sade'  (perde su ustune dokulur → islak zemin dogru)
export const TEZGAH_ZEMIN = {
  islak_havuz: { fon: 'sade' },
  kuru_meydan: { fon: 'kuru' },
  duvar_perde: { fon: 'sade' },
};

export function vitrinKur(urunAd) {
  const z = urunZarfi(urunAd);
  if (!z) return null;
  return {
    zarf: z,
    zemin: TEZGAH_ZEMIN[z.montaj],
    // ⚠mekanizma 28 urunun 26'sinda null — optional chaining SART, yoksa
    // TypeError sayfayi oldurur (denetim uyarisi). Servo/salvo cihazda zaman
    // izgarasi PERIYODA gore; digerlerinde sabit 0/0.2/0.5/1/2/4 s.
    zamanlar: z.mekanizma?.periyotSn > 0
      ? [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((k) => +(k * z.mekanizma.periyotSn).toFixed(3))
      : [0, 0.2, 0.5, 1.0, 2.0, 4.0],
  };
}
