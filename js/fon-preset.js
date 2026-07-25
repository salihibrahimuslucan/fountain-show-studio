// Fon presetleri (SAF VERİ) + presete bağlı saf hesaplar/doku üreticileri.
// mekan.js THREE'ye bağlı; burası DEĞİL — Node testinden birebir koşturulabilsin
// diye ayrıldı (aynı desen: fon-doku.js, gecis.js, serit-duzen.js).
//
// v7 M6 (Salih: "ortam çok karanlık + arka plan çok boş"): M5'te yalnız `meydan`
// zenginleştirilmişti; kanıt kareleri (_kiyas.local/v7-isik-borusu/fon2_*.png)
// diğer presetlerde havuzun SİYAH BOŞLUKTA yüzdüğünü gösterdi. Bu turda her
// presete (a) okunur bir zemin tonu, (b) kendi ufuk olayı, (c) presete oturan
// sis erimi verildi. Zemin diski mekan.js'te KALICI mesh — preset yalnız ton +
// sis söyler, geometri yeniden kurulmaz.
//
// Sözleşme (fon-doku.js ile aynı): her piksel üreticisi {px: Uint8Array RGBA,
// w, h} döner ve ALT-ORİJİN yazar (DataTexture flipY=false).
import { hexRgb, tohumluRastgele } from './fon-doku.js';

// Sis erimi presetten gelmezse bu kullanılır (ana.js'in kurduğu M5 değeri).
export const SIS_VARSAYILAN = [40, 260];

// Preset alanları (mekan.js okur):
//   gok        [üstRenk, altRenk] — kubbe degradesi
//   sis        [near, far] — presete göre sis erimi. ⚠Dar iç mekânda 40-260
//              yanlış: duvar 23 m'de, sis hiç başlamadan bitiyor → düz karton.
//   sisRenk    sis rengi (yoksa gok[1]) — iç mekânda gök alt rengi fazla siyah
//   zeminTon   BÜYÜK zemin diskinin (230 m) ton çarpanı. ⚠Işıksız (Basic)
//              malzeme: sahnede yalnız zayıf AmbientLight var, Standard'da renk
//              ambiyansla ÇARPILIP siyaha düşüyor (M5 dersi).
//   havuzTon   havuz tabanı diski (kuru presette GÖRÜNEN zemin)
//   icMekan    true → gök kubbesi + yıldız gizlenir, oda kabuğu kurulur
//   oda        { en, boy, yukseklik, duvar, tavan, zemin, tavanIsik: [[x,z],..] }
//   tepe       [{ r, yTavan, taban, genlik, renk }] — uzak tepe/kıyı silueti
//   siluet/siluetRenk/agac/pencere/aplikYer/ay/lamba/sehir/... — M1-M5'ten
export const FONLAR = {
  // v7 M6: "sade" = süssüz, boş DEĞİL. Şehir/ağaç yok; okunur bir meydan zemini,
  // hafif samanyolu ve yıldız artışı boşluğu doldurur. Sis erimi kısa (30-170):
  // zemin ufka doğru göğe ERİYOR — kenarı görünen disk gibi durmuyor.
  sade:   { gok: ['#131c30', '#080e1c'], yildiz: 200,
            samanyolu: { guc: 0.26, genislik: 0.2, egim: 0.2, faz: 0.4, renk: '#7f8cb4' },
            sis: [34, 195], zeminTon: 0x333c50, havuzTon: 0x101c2a,
            siluet: [], siluetRenk: 0x080d16, agac: [],
            kenarRenk: 0x2a3c4e, ambiyans: [0x46433c, 0.55],  // v7: soğuk mavi 0x334a63 -> nötr-hafif sıcak (Salih); su/arayüz mavisi öne çıksın, sahne klinik-soğuk olmasın
            su: { derin: 0x061626, parlaklik: 0.85, dalga: 0.05, kirpisma: 0.55 } },
  // v7 M5 (Salih: "ortam çok karanlık, arka plan çok boş"): meydan = amiral fon.
  // 4 elle yazılmış kutu → 3 prosedürel katman (52 bina), yıldız 40→260 +
  // samanyolu bandı, ufkun üstünde şehirden aydınlanan bulut kuşağı, 2→5 lamba.
  meydan: { gok: ['#182042', '#0b1120'], yildiz: 260, ufuk: '#c86f38', ufukGuc: 0.26,
            sis: [40, 260], zeminTon: 0x1e2432, havuzTon: 0x0a1622,
            samanyolu: { guc: 0.34, genislik: 0.17, egim: 0.24, faz: 0.12, renk: '#7d90c8' },
            bulut: { guc: 0.5, taban: 0.545, kalinlik: 0.1, renk: '#2a3050' },
            sehir: { katmanlar: [
              { adet: 34, r: 78,  yAralik: [9, 20],  kuleOran: 0.15, yTavan: 46, dokuW: 4096 },
              { adet: 48, r: 125, yAralik: [8, 17],  kuleOran: 0.12, yTavan: 46 },
              { adet: 62, r: 180, yAralik: [6, 13],  kuleOran: 0.10, yTavan: 46 } ] },
            siluet: [], siluetRenk: 0x0a1020, agac: [[-19,-21,1.3],[17,-22,1.1]],
            pencere: '#ffb35c',                    // uzak şehir: sıcak amber pencereler
            lamba: [[-12, -9], [12, -9], [-19, -13], [19, -13], [0, -15]],
            kenarRenk: 0x3d3a30, ambiyans: [0x36405a, 0.62],
            su: { derin: 0x08192c, parlaklik: 1.0, dalga: 0.055, kirpisma: 0.65 } },
  // v7 M5: park — ağaç hattı ikiye katlandı, uzakta alçak şehir hattı.
  // v7 M6: kanıt karesinde ağaçlar SİYAH ÜZERİNE SİYAHTI (siluet okunmuyordu).
  // Düzeltme: ağaç tonu preset'ten geliyor (agacRenk) ve gökten yeterince ayrık;
  // çim tonlu zemin + ağaç arkasına ılık ufuk bandı siluetleri sırtlıyor.
  park:   { gok: ['#16303c', '#0a1620'], yildiz: 220, ufuk: '#7d8a52', ufukGuc: 0.26,
            sis: [30, 200], zeminTon: 0x27301f, havuzTon: 0x0c1a18,
            samanyolu: { guc: 0.4, genislik: 0.18, egim: 0.22, faz: 0.35, renk: '#88a0b8' },
            sehir: { katmanlar: [
              { adet: 40, r: 130, yAralik: [4, 9], kuleOran: 0.05, yTavan: 22 } ] },
            siluet: [], siluetRenk: 0x0d1a20, agacRenk: '#12241c',
            agac: [[-12,-15,1.4],[-8.5,-17,1.0],[-3,-18,1.2],[9,-16,1.5],[13,-14,1.0],[16,-17,1.2],
                   [-18,-24,1.2],[-14,-26,0.9],[-6,-27,1.1],[3,-26,1.3],[11,-25,1.0],[19,-23,1.2]],
            lamba: [[-11, -8], [0, -12], [11, -8], [-17, -14], [17, -14]],
            kenarRenk: 0x3e4a34, ambiyans: [0x35543f, 0.6],
            su: { derin: 0x071c16, parlaklik: 0.9, dalga: 0.05, kirpisma: 0.5 } },
  // v7 M5: göl = en "güzel" fon — şehir ışığı yok, samanyolu GÜÇLÜ, yıldız iki katı.
  // v7 M6: kutu-bina halkası göl kıyısında YANLIŞTI (gece ufkunda dişli bir
  // duvar). Yerine iki katmanlı TEPE silueti: uzak sırt + yakın kıyı çizgisi.
  // Zemin tonu su-yeşili koyu: havuz "gölün içindeymiş" gibi devam etsin.
  gol:    { gok: ['#0d1a4c', '#050b22'], yildiz: 520,
            sis: [45, 240], zeminTon: 0x121d33, havuzTon: 0x081428,
            samanyolu: { guc: 0.62, genislik: 0.19, egim: 0.3, faz: 0.55, renk: '#8ea0d8' },
            bulut: { guc: 0.22, taban: 0.53, kalinlik: 0.07, renk: '#1a2444' },
            tepe: [{ r: 190, yTavan: 40, taban: 0.30, genlik: 0.34, renk: '#101a35' },
                   { r: 140, yTavan: 22, taban: 0.22, genlik: 0.20, renk: '#080f22' }],
            siluet: [], siluetRenk: 0x070c1c, agacRenk: '#0a1226',
            agac: [[-17,-23,1.1],[-11,-25,0.8],[-5,-26,1.0],[2,-27,0.7],[8,-26,1.0],[14,-24,1.2],[18,-22,0.8]],
            ay: { renk: 0xdfe8f2, poz: [-14, 15, -36], yaricap: 1.6 },
            kenarRenk: 0x3a3428, ambiyans: [0x2b3c64, 0.5],
            su: { derin: 0x061236, parlaklik: 1.05, dalga: 0.06, kirpisma: 0.8 } },
  // v7 M6: kapali ARTIK GERÇEK İÇ MEKÂN. Öncesi: 3 duvar paneli + birkaç aplik,
  // zemin/tavan YOK, üstelik yıldızlı gece göğü görünüyordu (kanıt karesi
  // fon2_kapali.png). Şimdi kapalı kabuk (zemin+4 duvar+tavan), tavan
  // aydınlatması, gök kubbesi ve yıldız KAPALI, sis erimi odaya göre 10-46.
  // sisRenk gök alt renginden ayrı: siyah sis odayı yine void yapıyordu.
  kapali: { gok: ['#191b20', '#0d0e11'], icMekan: true,
            sis: [10, 46], sisRenk: '#1b1f26',
            zeminTon: 0x1a1c20, havuzTon: 0x141a20,
            oda: { en: 46, boy: 46, yukseklik: 11,
                   duvar: 0x3a4048, tavan: 0x2b3038, zemin: 0x585349,
                   tavanIsik: [[-13, -13], [0, -13], [13, -13], [-13, 0], [13, 0],
                               [-13, 13], [0, 13], [13, 13]] },
            // kaldırım/harpuşta oda zeminiyle aynı sıcak taş ailesinde olmalı;
            // preset kenarRenk'i (mavi-gri) iç mekânda yabancı duruyordu
            zeminRenk: 0x6a6455,
            siluet: [], siluetRenk: 0x15181e, agac: [],
            // aplikler artık GERÇEK duvarlarda: [x, y, z, dönüşY]
            aplikRenk: '#ffd9a0',
            aplikYer: [[-8, 4.2, -22.6, 0], [8, 4.2, -22.6, 0],
                       [-22.6, 4.2, -8, Math.PI / 2], [-22.6, 4.2, 8, Math.PI / 2],
                       [22.6, 4.2, -8, -Math.PI / 2], [22.6, 4.2, 8, -Math.PI / 2]],
            kenarRenk: 0x4a5560, ambiyans: [0x4a4638, 0.6],
            // iç mekânda yansıyacak gök yok; su tavan armatürlerini yansıtır —
            // parlaklık biraz yukarı, yoksa havuz ıslak değil KURU okunuyor
            su: { derin: 0x0d1c2c, parlaklik: 0.95, dalga: 0.04, kirpisma: 0.45 } },
  // v3: DryDECK/arı-kovanı sahnesi — havuz YOK, beton meydan. kuru:true → su
  // yüzeyi gizlenir, zemin beton.
  // v7 M6: kanıt karesinde zemin okunmuyordu (beton tonu ambiyansla çarpılıp
  // sönüyordu) ve ufuk bomboştu. havuzTon/zeminTon ışıksız yola geçti, alçak
  // şehir halkası + yıldız artışı ufku kapattı.
  kuru:   { gok: ['#1c212b', '#0e1118'], yildiz: 150, ufuk: '#b06a30', ufukGuc: 0.24,
            sis: [35, 210], zeminTon: 0x4c5058, havuzTon: 0x565b64,
            sehir: { katmanlar: [
              { adet: 44, r: 120, yAralik: [5, 12], kuleOran: 0.08, yTavan: 30 } ] },
            siluet: [], siluetRenk: 0x141922, agacRenk: '#101a18',
            agac: [[-6,-18,1.0],[4,-19,1.2]],
            pencere: '#ffb35c',
            lamba: [[-9, -10], [9, -10], [-17, -15], [17, -15]],
            kuru: true, zeminRenk: 0x565b64,
            kenarRenk: 0x4a4e55, ambiyans: [0x50565f, 0.6] }
};

export const VARSAYILAN_FON = 'meydan';

// Presetin sis erimi — yoksa M5 varsayılanı.
export function sisAralik(f) {
  const s = f?.sis ?? SIS_VARSAYILAN;
  return [s[0], s[1]];
}

// Presetin sis rengi — yoksa gök alt rengi (eski davranış).
export function sisRengi(f) {
  return f?.sisRenk ?? f.gok[1];
}

// BÜYÜK zemin diskinin yarıçapa göre parlaklık sönümü. Kanıt karelerinde zemin
// tek düze bir levha gibiydi; havuzun çevresi biraz aydınlık, ufka doğru sisin
// içine sönen bir gradyan mekânı "yer" yapıyor. Vertex renginde taşınır —
// çalışma zamanı maliyeti SIFIR, disk bir kez kurulur.
// r: metre, R: disk yarıçapı. Dönüş: 0..~1.25 çarpan.
export function zeminSonum(r, R = 230) {
  const t = Math.min(1, Math.max(0, (r - 8) / 82));      // 8 m..90 m arası geçiş
  const s = t * t * (3 - 2 * t);                          // smoothstep
  const uzak = Math.min(1, Math.max(0, (r - 90) / (R - 90)));
  return (1.25 - 0.65 * s) * (1 - 0.45 * uzak);
}

// Uzak tepe/kıyı silueti: 1 boyutlu tohumlu fraktal profil, altı dolu. Şehir
// kutularının aksine YUMUŞAK sırt hattı verir (göl kıyısı bina dizisi olamaz).
// Sarmalıdır: ilk ve son sütun aynı yüksekliği alır, silindire dolandığında
// dikiş görünmez. ALT-ORİJİN.
export function tepePiksel({ w = 1024, h = 128, tohum = 5, renk = '#101a35',
                            taban = 0.3, genlik = 0.35, oktav = 4 }) {
  const R = hexRgb(renk);
  const rnd = tohumluRastgele(tohum);
  // oktav başına sarmalı kontrol noktaları (adet frekansla artar)
  const katmanlar = [];
  for (let o = 0; o < oktav; o++) {
    const n = 3 * (o + 1) + o * o;                        // 3, 7, 13, 21...
    katmanlar.push({ n, g: Float32Array.from({ length: n }, () => rnd()) });
  }
  const profil = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const u = x / w;                                      // [0,1) — sarmalı
    let v = 0, agirlik = 0, kaz = 1;
    for (const { n, g } of katmanlar) {
      const f = u * n, i0 = Math.floor(f) % n, i1 = (i0 + 1) % n, t = f - Math.floor(f);
      const s = t * t * (3 - 2 * t);                      // smoothstep interpolasyon
      v += kaz * (g[i0] * (1 - s) + g[i1] * s);
      agirlik += kaz; kaz *= 0.5;
    }
    profil[x] = taban + (v / agirlik - 0.5) * 2 * genlik;
  }
  const px = new Uint8Array(w * h * 4);                   // alfa 0 başlar
  for (let x = 0; x < w; x++) {
    const yUst = Math.min(h - 1, Math.round(profil[x] * (h - 1)));
    for (let y = 0; y <= yUst; y++) {
      const i = (y * w + x) * 4;
      px[i] = R[0]; px[i + 1] = R[1]; px[i + 2] = R[2]; px[i + 3] = 255;
    }
  }
  return { px, w, h };
}

// İç mekân duvar dokusu: düşey panel bölmeleri + panel başına tohumlu ton
// varyantı + yatay süpürgelik bandı. Döşenebilir (RepeatWrapping).
// Duvarın DÜZ RENK olması odayı karton kutu yapıyordu; panel derzleri kameranın
// yavaş yörüngesinde duvara ölçek/derinlik veriyor.
export function duvarPiksel({ S = 128, renk = '#3a4048', tohum = 11 }) {
  const R = hexRgb(renk);
  const rnd = tohumluRastgele(tohum);
  const ton = Float32Array.from({ length: 8 }, () => 0.86 + rnd() * 0.28);
  const px = new Uint8Array(S * S * 4);
  const panel = S / 8;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const p = Math.floor(x / panel);
    const derz = (x % panel) < 1;
    const supurgelik = y < S * 0.06;                      // alt bant koyu (ALT-ORİJİN)
    let k = derz ? 0.5 : ton[p];
    if (supurgelik) k *= 0.55;
    k *= 0.94 + (y / S) * 0.12;                           // üste doğru hafif açılma
    const i = (y * S + x) * 4;
    px[i] = Math.min(255, R[0] * k); px[i + 1] = Math.min(255, R[1] * k);
    px[i + 2] = Math.min(255, R[2] * k); px[i + 3] = 255;
  }
  return { px, w: S, h: S };
}
