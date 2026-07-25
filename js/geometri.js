// geometri.js — SAF geometri matematiği (three YOK → node --test koşar).
// T-B laminer kalınlık profili: gerçek laminer akışta debi sabittir (A·v=sabit)
// → hızlı bölge ince, tepe (yavaş) kalın. r ∝ 1/√v; v enerji korunumundan:
// v(y) = √(v0² − 2g(y−y0)).
const G = 9.81;

// merkezler = [[x,y,z],...] tüp halka merkezleri; v0 = çıkış hızı (m/s).
// dönüş: halka başına yarıçap çarpanı √(v0/v(y)), [1, 2] aralığına kelepçeli.
export function kalinlikCarpanlari(merkezler, v0) {
  const y0 = merkezler[0][1];
  return merkezler.map(([, y]) => {
    const v2 = Math.max(v0 * v0 - 2 * G * (y - y0), 0.25);   // v→0 tekilliği kelepçesi
    return Math.min(Math.sqrt(v0 / Math.sqrt(v2)), 2);
  });
}

// pozisyon = BufferGeometry position dizisi (Float32Array, xyz ardışık).
// TubeGeometry düzeni: (tubularSegments+1) halka × (radialSegments+1) vertex.
// Her halka vertex'i kendi merkez noktasına göre çarpanla ölçeklenir.
export function tupKalinlikUygula(pozisyon, merkezler, halkaVertexSayisi, carpanlar) {
  for (let h = 0; h < merkezler.length; h++) {
    const [cx, cy, cz] = merkezler[h], k = carpanlar[h];
    for (let j = 0; j < halkaVertexSayisi; j++) {
      const i = (h * halkaVertexSayisi + j) * 3;
      pozisyon[i]     = cx + (pozisyon[i]     - cx) * k;
      pozisyon[i + 1] = cy + (pozisyon[i + 1] - cy) * k;
      pozisyon[i + 2] = cz + (pozisyon[i + 2] - cz) * k;
    }
  }
}

// --- Kamera dili v2: otomatik çerçeveleme (SAF, node testli) ----------------
// "Profesyonel kadraj gerekli" (Salih) isteğinin ölçülebilir kısmı: kadraj
// dünyanın orijinine değil, cihazların GERÇEK yayılımına oturmalı. Kamera
// çekimleri referans bir yarıçapa göre ayarlandı; gerçek sahne 37 cihazlık
// 10 m'lik daire de olabilir, tek cihaz da. Bu fonksiyon o dönüşümün girdisini
// verir. three'ye bağlı olmadığı için burada — kamera.js'te olsaydı test
// edilemezdi (o modül THREE import ediyor).
//
// yariCap: köşegenin yarısı + PAY. Pay şart: cihazın su kolonu ve ışık gölü
// cihaz noktasının ÖTESİNE taşar; sıfır paylı çerçeve tek cihazlık sahnede
// kamerayı jetin içine sokar.
export const CERCEVE_PAY_M = 2.5;

export function sahneCercevesi(cihazlar, pay = CERCEVE_PAY_M) {
  let xMin = Infinity, xMaks = -Infinity, zMin = Infinity, zMaks = -Infinity;
  for (const c of cihazlar ?? []) {
    if (!Number.isFinite(c?.x) || !Number.isFinite(c?.z)) continue;   // bozuk kayıt sahneyi bozmasın
    if (c.x < xMin) xMin = c.x;
    if (c.x > xMaks) xMaks = c.x;
    if (c.z < zMin) zMin = c.z;
    if (c.z > zMaks) zMaks = c.z;
  }
  if (!Number.isFinite(xMin)) return null;        // cihaz yok / hepsi bozuk → çağıran dokunmaz
  return {
    merkez: [(xMin + xMaks) / 2, (zMin + zMaks) / 2],
    yariCap: Math.hypot(xMaks - xMin, zMaks - zMin) / 2 + pay
  };
}
