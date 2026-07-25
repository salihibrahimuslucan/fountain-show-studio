// fon-doku.js — mekân fon katmanlarının SAF piksel üreticileri (THREE YOK — Node testli).
// Sözleşme: her üretici {px: Uint8Array(RGBA), w, h} döner; mekan.js DataTexture'a
// sarar (flipY=false → satır 0 = doku ALTI; üreticiler ALT-ORİJİN yazar).
// Hepsi tohumlu LCG ile DETERMİNİSTİK (headless kare kıyası bozulmasın).

export function tohumluRastgele(tohum) {
  let s = (tohum >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Gece göğü: dikey degrade (smoothstep) + isteğe UFUK IŞIMASI. Doku equirect
// eşlenir → v=0 nadir, v=0.5 UFUK, v=1 zenit; ışıma bandı 0.5'in hemen
// üstünde üstel söner (şehir ışık kirliliği). Yıldız BURADA YOK: equirect
// dokuda nokta yıldız dev lekeye bulanıyor (M1 kare kanıtı) — yildizNoktalari
// ile ayrı THREE.Points katmanı kullanılır. ALT-ORİJİN: y=0 satırı doku altı.
// v7 M5: `samanyolu` ve `bulut` opsiyonel — verilmezse çıktı ESKİSİYLE BİREBİR
// aynı (mevcut testler ve kare hash'leri korunur). Açıldıklarında x ekseni
// artık düz değil, bu yüzden çağıran w'yi büyütmeli (64 → 256).
export function gokPiksel({ w = 64, h = 512, ust, alt, ufuk = null, ufukGuc = 0.30,
                            samanyolu = null, bulut = null, tohum = 11 }) {
  const U = hexRgb(ust), A = hexRgb(alt), F = ufuk ? hexRgb(ufuk) : null;
  const px = new Uint8Array(w * h * 4);
  // Yatay değişen katmanlar için tohumlu toz gürültüsü (samanyolu toz şeritleri
  // + bulut kenarı). Küçük ızgara + bilinear = ucuz ama organik.
  const IZ = 16;
  const rnd = tohumluRastgele(tohum);
  const gurultuIzgara = Float32Array.from({ length: IZ * IZ }, () => rnd());
  const gurultu = (u, v) => {
    const fx = u * IZ, fy = v * IZ;
    const x0 = Math.floor(fx) % IZ, y0 = Math.floor(fy) % IZ;
    const x1 = (x0 + 1) % IZ, y1 = (y0 + 1) % IZ;
    const tx = fx - Math.floor(fx), ty = fy - Math.floor(fy);
    const a = gurultuIzgara[y0 * IZ + x0], b = gurultuIzgara[y0 * IZ + x1];
    const c = gurultuIzgara[y1 * IZ + x0], d = gurultuIzgara[y1 * IZ + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  const SY = samanyolu ? hexRgb(samanyolu.renk ?? '#8899cc') : null;
  const BL = bulut ? hexRgb(bulut.renk ?? '#1a2236') : null;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);                        // 0=nadir, 0.5=ufuk, 1=zenit
    const g = 1 - v * v * (3 - 2 * v);            // g=1 alt (alt renk), g=0 tepe (üst renk)
    const bant = (F && v >= 0.5)
      ? Math.pow(Math.max(0, 1 - (v - 0.5) / 0.09), 2.6) * ufukGuc : 0;
    const taban = [0, 1, 2].map(k => U[k] + (A[k] - U[k]) * g + (F ? F[k] * bant : 0));
    for (let x = 0; x < w; x++) {
      const u = x / w;                            // azimut 0-1 (sarmalı)
      let r = taban[0], gg = taban[1], b = taban[2];
      // Samanyolu: gökte eğik bir büyük daire — merkezi u ile sinüs gibi salınır.
      // Parlaklık merkeze gauss; toz şeritleri gürültüyle OYULUR (kaynakta koyu
      // toz bulutları bandı böler, düz bir şerit sahte görünür).
      if (SY && v > 0.5) {
        const merkez = 0.5 + (samanyolu.egim ?? 0.26) * Math.sin(2 * Math.PI * (u - (samanyolu.faz ?? 0.15)));
        const d = (v - merkez) / (samanyolu.genislik ?? 0.16);
        let parlak = Math.exp(-d * d * 2.2);
        parlak *= 0.45 + 0.55 * gurultu(u * 3.0, v * 3.0);          // toz şeritleri
        parlak *= Math.min(1, (v - 0.5) / 0.12);                    // ufukta erisin
        const k = parlak * (samanyolu.guc ?? 0.5);
        r += SY[0] * k; gg += SY[1] * k; b += SY[2] * k;
      }
      // Bulut bandı: ufkun hemen üstünde yatay uzanan yumuşak kütleler. Gece
      // bulutu şehir ışığından ALTTAN aydınlanır → ufka yakın daha parlak.
      if (BL) {
        const bv = (v - (bulut.taban ?? 0.52)) / (bulut.kalinlik ?? 0.13);
        if (bv > -1 && bv < 1.6) {
          let m = Math.exp(-bv * bv * 1.6);
          m *= Math.max(0, gurultu(u * 2.2 + 0.5, v * 1.4) * 1.5 - 0.42);
          const k = Math.min(1, m) * (bulut.guc ?? 0.7);
          r += BL[0] * k; gg += BL[1] * k; b += BL[2] * k;
        }
      }
      const i = (y * w + x) * 4;
      px[i] = Math.min(255, Math.round(r));
      px[i + 1] = Math.min(255, Math.round(gg));
      px[i + 2] = Math.min(255, Math.round(b));
      px[i + 3] = 255;
    }
  }
  return { px, w, h };
}

// v7 M5: prosedürel şehir hattı. Elle yazılmış 4 kutu yerine tohumlu siluet —
// "arka plan çok boş" şikâyetinin ana kaynağı buydu. Katman fikri: uzak katman
// çok sayıda alçak/soluk bina, yakın katman az sayıda iri bina → atmosferik
// derinlik. Dönüş biçimi siluetPiksel'in beklediği [[x, yükseklik, z, genişlik]].
export function sehirUret({ adet, xAralik = [-30, 30], yAralik = [3, 9],
                            z = -16, tohum = 5, kuleOran = 0.12 }) {
  const rnd = tohumluRastgele(tohum);
  const [x0, x1] = xAralik, [h0, h1] = yAralik;
  const binalar = [];
  // Eşit aralıklı yuvalar + yuva içi kaydırma: tamamen rastgele x üst üste
  // binmiş kümeler ve büyük boşluklar bırakıyordu (ilk denemede yaşandı).
  const yuva = (x1 - x0) / adet;
  for (let i = 0; i < adet; i++) {
    const x = x0 + yuva * (i + 0.5) + (rnd() - 0.5) * yuva * 0.7;
    const kule = rnd() < kuleOran;
    const yuk = kule ? h1 * (1.25 + rnd() * 0.5) : h0 + rnd() * (h1 - h0);
    const gen = kule ? yuva * (0.5 + rnd() * 0.3) : yuva * (0.7 + rnd() * 0.75);
    binalar.push([x, yuk, z + (rnd() - 0.5) * 1.5, gen]);
  }
  return binalar;
}

// Yıldız konumları: üst yarıküre kabuğunda tohumlu dağılım + yıldız başına
// parlaklık. THREE.Points'e beslenir (sizeAttenuation:false → ekranda nokta).
// v7 M5: `kume` verilirse yıldızların bir kısmı samanyolu bandına toplanır
// (düzgün dağılım gerçek gökyüzüne benzemiyor — göz bandı arar) ve her yıldıza
// RENK atanır (sıcak turuncu ↔ mavi-beyaz). `renk` alanı EK — eski çağıranlar
// {poz, parlak} okumaya devam eder.
export function yildizNoktalari({ adet, R = 66, minYOran = 0.10, tohum = 1, kume = null }) {
  const rnd = tohumluRastgele(tohum);
  const poz = new Float32Array(adet * 3);
  const parlak = new Float32Array(adet);
  const renk = new Float32Array(adet * 3);
  for (let i = 0; i < adet; i++) {
    const a = rnd() * Math.PI * 2;
    let y;
    if (kume && rnd() < (kume.oran ?? 0.45)) {
      // Banda topla: gokPiksel'deki samanyolu merkeziyle AYNI eğri (u=a/2π),
      // yoksa yıldız kümesi ile ışıklı bant birbirinden kayar.
      const u = a / (2 * Math.PI);
      const merkez = 0.5 + (kume.egim ?? 0.26) * Math.sin(2 * Math.PI * (u - (kume.faz ?? 0.15)));
      // v (0-1 küre yüksekliği) → y (-1..1): v=0.5 ufuk demek, y = (v-0.5)*2
      const vy = merkez + (rnd() + rnd() - 1) * (kume.genislik ?? 0.16) * 0.9;
      y = Math.max(minYOran, Math.min(0.99, (vy - 0.5) * 2));
    } else {
      y = minYOran + (1 - minYOran) * rnd();
    }
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    poz[i * 3] = Math.cos(a) * r * R;
    poz[i * 3 + 1] = y * R;
    poz[i * 3 + 2] = Math.sin(a) * r * R;
    parlak[i] = 0.35 + rnd() * 0.65;
    // Renk sıcaklığı: çoğu beyazımsı, uçlarda az sayıda sıcak/mavi yıldız.
    const t = rnd() * 2 - 1;                       // -1 sıcak, +1 mavi
    renk[i * 3]     = 1.0 - Math.max(0, t) * 0.22;
    renk[i * 3 + 1] = 1.0 - Math.abs(t) * 0.07;
    renk[i * 3 + 2] = 1.0 + Math.min(0, t) * 0.30;
  }
  return { poz, parlak, renk };
}

// Şehir silueti şeridi: preset `siluet` dizisi ([x,h,z,w] — z bu dokuda
// KULLANILMAZ, katman derinliği mekan.js'te) tek şeride çizilir. ALT-ORİJİN.
// Dünya penceresi xAralik (m), yTavan (m) → doku piksel eşlemesi. Çatı hattı:
// parapet dişleri + seyrek anten; pencereler DOKUDA (ayrı mesh kalabalığı yok).
export function siluetPiksel({ w = 512, h = 128, binalar, renk, pencere = null,
                               tohum = 7, xAralik = [-22, 22], yTavan = 12 }) {
  const px = new Uint8Array(w * h * 4);                    // hepsi alfa 0 başlar
  const R = hexRgb(renk), P = pencere ? hexRgb(pencere) : null;
  const rnd = tohumluRastgele(tohum);
  const X = (dx) => Math.round((dx - xAralik[0]) / (xAralik[1] - xAralik[0]) * (w - 1));
  const Y = (dy) => Math.round(dy / yTavan * (h - 1));
  const doldur = (x0, x1, y0, y1, rgb) => {
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
        const i = (y * w + x) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
      }
  };
  for (const [bx, bh, , bw] of binalar) {
    const x0 = X(bx - bw / 2), x1 = X(bx + bw / 2), yUst = Y(bh);
    doldur(x0, x1, 0, yUst, R);
    for (let x = x0; x <= x1; x += 3 + Math.floor(rnd() * 4))        // parapet dişleri
      if (rnd() < 0.5) doldur(x, Math.min(x + 1, x1), yUst, yUst + 2, R);
    if (rnd() < 0.6) {                                               // seyrek anten
      const ax = x0 + 1 + Math.floor(rnd() * Math.max(1, x1 - x0 - 1));
      doldur(ax, ax, yUst, Math.min(h - 1, yUst + 5 + Math.floor(rnd() * 5)), R);
    }
    if (P) {                                                         // pencere ızgarası
      for (let y = Y(0.6); y < yUst - 2; y += 5) for (let x = x0 + 2; x < x1 - 1; x += 4)
        if (rnd() < 0.30) {
          const k = 0.55 + rnd() * 0.45;
          doldur(x, x, y, y + 1, [P[0] * k | 0, P[1] * k | 0, P[2] * k | 0]);
        }
    }
  }
  return { px, w, h };
}

// Ağaç silueti: 4 tohumlu yumru diskin birleşimi + kenar gürültüsü + gövde
// sütunu. Tek renk koyu, alfa kenarı pürüzlü. ALT-ORİJİN kare doku.
export function agacPiksel({ S = 128, tohum = 1 }) {
  const rnd = tohumluRastgele(tohum);
  const yumrular = [[0.5, 0.55, 0.30], [0.36, 0.45, 0.22], [0.64, 0.47, 0.22], [0.5, 0.78, 0.18]]
    .map(([x, y, r]) => [x + (rnd() - 0.5) * 0.06, y + (rnd() - 0.5) * 0.06, r * (0.9 + rnd() * 0.25)]);
  const izgara = Float32Array.from({ length: 64 }, () => rnd());     // kenar gürültü ızgarası 8×8
  const gurultu = (x, y) => izgara[(Math.floor(Math.abs(y) * 8) % 8) * 8 + (Math.floor(Math.abs(x) * 8) % 8)];
  const px = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / (S - 1), v = y / (S - 1);                          // v alt-orijin
    let icinde = false;
    for (const [cx, cy, r] of yumrular)
      if (Math.hypot(u - cx, v - cy) < r * (0.86 + gurultu(u * 3.7, v * 3.7) * 0.28)) icinde = true;
    if (!icinde && Math.abs(u - 0.5) < 0.03 && v < 0.5) icinde = true;   // gövde
    if (icinde) {
      const i = (y * S + x) * 4;
      px[i] = 5; px[i + 1] = 16; px[i + 2] = 12; px[i + 3] = 255;
    }
  }
  return { px, w: S, h: S };
}

// Kaldırım taşı: 8×8 taş ızgarası, taş başına tohumlu ton varyantı, 1px koyu
// derz. Döşenebilir (RepeatWrapping ile).
export function tasPiksel({ S = 128, renk, tohum = 1 }) {
  const R = hexRgb(renk);
  const rnd = tohumluRastgele(tohum);
  const ton = Float32Array.from({ length: 64 }, () => 0.82 + rnd() * 0.36);
  const px = new Uint8Array(S * S * 4);
  const tasBoy = S / 8;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const tx = Math.floor(x / tasBoy), ty = Math.floor(y / tasBoy);
    const derz = (x % tasBoy < 1) || (y % tasBoy < 1);
    const k = derz ? 0.55 : ton[ty * 8 + tx];
    const i = (y * S + x) * 4;
    px[i] = Math.min(255, R[0] * k); px[i + 1] = Math.min(255, R[1] * k);
    px[i + 2] = Math.min(255, R[2] * k); px[i + 3] = 255;
  }
  return { px, w: S, h: S };
}

// Radyal hale (ay/lamba glow sprite'ı): beyaz RGB, alfa=(1-r)^2.
export function haleAlfa(S = 64) {
  const px = new Uint8Array(S * S * 4);
  const m = (S - 1) / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.hypot(x - m, y - m) / m;
    const a = Math.max(0, 1 - r) ** 2;
    const i = (y * S + x) * 4;
    px[i] = px[i + 1] = px[i + 2] = 255;
    px[i + 3] = Math.round(a * 255);
  }
  return { px, w: S, h: S };
}
