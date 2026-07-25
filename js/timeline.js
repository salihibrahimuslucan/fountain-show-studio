// Ders 7'nin oynatıcısı; ornekle O(log n)'e alındı (uzun şarkı + binlerce anahtar).
export function yeniCizelge() { return { sure: 16, kanallar: [] }; }

export function ornekle(kanal, t) {
  const a = kanal.anahtarlar;
  if (!a.length) return 0;
  if (t <= a[0][0]) return a[0][1];
  const son = a[a.length - 1];
  if (t >= son[0]) return son[1];
  let lo = 0, hi = a.length - 1;           // değişmez: a[lo][0] <= t < a[hi][0]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (a[mid][0] <= t) lo = mid; else hi = mid;
  }
  const [t0, v0] = a[lo], [t1, v1] = a[hi];
  if (kanal.tip === 'step') return v0;
  let u = (t - t0) / (t1 - t0);
  if (kanal.tip === 'smooth') u = u * u * (3 - 2 * u);
  return v0 + (v1 - v0) * u;
}

export class Zamanlayici {
  constructor(cizelge, kayit) { this.cizelge = cizelge; this.kayit = kayit; }
  uygula(t) {
    for (const kanal of this.cizelge.kanallar) {
      const fn = this.kayit[kanal.hedef];
      if (fn) fn(ornekle(kanal, t));
    }
  }
}
