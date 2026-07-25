// sablon.js — hazır yerleşim şablonları (v3 F5, spec cihaz-gerçekçiliği §6).
// SAF modül (three/DOM yok): her üretici deterministik cihaz listesi döner
// [{tur, x, z, aci?, urun}] — çağıran (ana.js şablon menüsü / tools/ornek-uret)
// cihazYonetici.ekle ile döşer. Rastgelelik YOK: şablon = satış-hazır kompozisyon.
import { urunCoz } from '../data/katalog.js';
const Y = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];

// ⚠TUR KATALOGDAN TÜRETİLİR, ELLE YAZILMAZ (denetim 2026-07-18): 'AquaVARIO'
// burada `tur:'duz_jet'` ile eşleniyordu, oysa katalogda arketipi `vario` —
// kayda tur/urun'ü çelişen cihaz giriyordu (motor vario presetini hiç görmüyordu).
// Katalog TEK KAYNAK; künyede olmayan ad için arketipe düşülür (spec §T-E).
const T = (urun, varsayilan) => urunCoz(urun) ?? varsayilan;

// Daire havuz (Salih: "tüm cihazların kullanılabileceği havuz, daire içine"):
// merkez geyser → iç halka AquaVARIO+412C → orta halka AquaSWITCH → dış halka
// AquaJET; karşılıklı 2 ROBO + 2 SWING, kenardan içe bakan 2 AquaJUMP.
export function daire(r = 8) {
  const c = [];
  c.push({ tur: T('Geyser', 'geyser'), x: 0, z: 0, urun: 'Geyser' });
  for (let i = 0; i < 6; i++) {
    const [x, z] = Y((i / 6) * 2 * Math.PI, r * 0.32);
    c.push({ tur: T('AquaVARIO', 'duz_jet'), x, z, urun: 'AquaVARIO' });
    const [hx, hz] = Y((i / 6) * 2 * Math.PI + Math.PI / 6, r * 0.32);
    c.push({ tur: T('AquaLIGHT 412C', 'rgb_spot'), x: hx, z: hz, urun: 'AquaLIGHT 412C' });
  }
  for (let i = 0; i < 8; i++) {
    const [x, z] = Y((i / 8) * 2 * Math.PI + Math.PI / 8, r * 0.58);
    c.push({ tur: T('AquaSWITCH', 'switch'), x, z, urun: 'AquaSWITCH' });
  }
  for (let i = 0; i < 10; i++) {
    const [x, z] = Y((i / 10) * 2 * Math.PI, r * 0.85);
    c.push({ tur: T('AquaJET', 'aquajet'), x, z, urun: 'AquaJET' });
  }
  c.push({ tur: T('AquaROBO', 'robo'), x: -r * 0.7, z: 0, urun: 'AquaROBO' });
  c.push({ tur: T('AquaROBO', 'robo'), x: r * 0.7, z: 0, urun: 'AquaROBO' });
  c.push({ tur: T('AquaSWING', 'swing'), x: 0, z: -r * 0.7, urun: 'AquaSWING' });
  c.push({ tur: T('AquaSWING', 'swing'), x: 0, z: r * 0.7, urun: 'AquaSWING' });
  c.push({ tur: T('AquaJUMP', 'laminer'), x: -r * 0.92, z: -r * 0.5, aci: 25, urun: 'AquaJUMP' });
  c.push({ tur: T('AquaJUMP', 'laminer'), x: r * 0.92, z: r * 0.5, aci: 205, urun: 'AquaJUMP' });
  return c;
}

// Arı kovanı (hex ızgara) — kuru havuz/drydeck alanı: hücre merkezlerinde
// DryDECK, dış çeper hücrelerinde 412C halka (insan-açık interaktif alan).
export function ariKovani(halkaSayisi = 2, adim = 1.6) {
  const c = [{ tur: T('DryDECK', 'drydeck'), x: 0, z: 0, urun: 'DryDECK' }];
  for (let h = 1; h <= halkaSayisi; h++) {
    // aksiyel hex halka yürüyüşü: 6 köşeden başla, kenar boyunca h adım
    let x = h * adim, z = 0;
    const yonler = [[-0.5, 0.866], [-1, 0], [-0.5, -0.866], [0.5, -0.866], [1, 0], [0.5, 0.866]];
    for (const [dx, dz] of yonler) {
      for (let i = 0; i < h; i++) {
        c.push(h === halkaSayisi
          ? { tur: T('AquaLIGHT 412C', 'rgb_spot'), x: +x.toFixed(3), z: +z.toFixed(3), urun: 'AquaLIGHT 412C' }
          : { tur: T('DryDECK', 'drydeck'), x: +x.toFixed(3), z: +z.toFixed(3), urun: 'DryDECK' });
        x += dx * adim; z += dz * adim;
      }
    }
  }
  return c;
}

// Çizgi/kanal: SWITCH dizisi (koşan dalga için) + uçlarda karşılıklı AquaJUMP.
export function cizgi(uzunluk = 12, n = 9) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const x = -uzunluk / 2 + (i / (n - 1)) * uzunluk;
    c.push({ tur: T('AquaSWITCH', 'switch'), x: +x.toFixed(3), z: 0, urun: 'AquaSWITCH' });
    if (i % 2 === 0) c.push({ tur: T('AquaLIGHT 412C', 'rgb_spot'), x: +x.toFixed(3), z: 1.2, urun: 'AquaLIGHT 412C' });
  }
  c.push({ tur: T('AquaJUMP', 'laminer'), x: -uzunluk / 2 - 1.5, z: -1.5, aci: 35, urun: 'AquaJUMP' });
  c.push({ tur: T('AquaJUMP', 'laminer'), x: uzunluk / 2 + 1.5, z: -1.5, aci: 145, urun: 'AquaJUMP' });
  return c;
}

// Izgara: VARIO matrisi + köşelerde ROBO (süpürme çerçevesi).
export function izgara(nx = 4, nz = 4, adim = 2.2) {
  const c = [];
  const x0 = -((nx - 1) * adim) / 2, z0 = -((nz - 1) * adim) / 2;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++)
      c.push({ tur: T('AquaVARIO', 'duz_jet'), x: +(x0 + i * adim).toFixed(3), z: +(z0 + j * adim).toFixed(3), urun: 'AquaVARIO' });
  const kx = x0 - adim, kz = z0 - adim;
  c.push({ tur: T('AquaROBO', 'robo'), x: kx, z: kz, urun: 'AquaROBO' });
  c.push({ tur: T('AquaROBO', 'robo'), x: -kx, z: -kz, urun: 'AquaROBO' });
  return c;
}

export const SABLONLAR = { daire, ariKovani, cizgi, izgara };
