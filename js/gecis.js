// gecis.js — fon crossfade'inin SAF durum makinesi (THREE yok, Node testli).
// mekan.js tik(dt)'de ilerletir; oran() smoothstep'li 0..1 karışım katsayısıdır.
export function gecisYarat(varsayilanSure = 1.5) {
  let u = 1, sure = varsayilanSure;
  return {
    baslat(s = varsayilanSure) { sure = s; u = s <= 0 ? 1 : 0; },
    tik(dt) { if (u < 1) u = Math.min(1, u + dt / sure); return u; },
    bitti() { return u >= 1; },
    oran() { return u * u * (3 - 2 * u); }
  };
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const renkLerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
