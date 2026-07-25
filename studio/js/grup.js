// grup.js — cihaz grubu YAZIM KATMANI (spec 2026-07-20 §1): saf modül, DOM/THREE yok.
// Grup motorla hiç konuşmaz — desen üye cihaz kanallarına DERLENİR (grupDerle).
import { MASTER_DESENLER } from './desen.js';

export const ROLLER = ['ritim', 'melodi', 'vurgu', 'ambiyans'];
export const DIZILIMLER = ['halka', 'hat', 'yay', 'serbest'];

export function yeniGrup(id, ad, uyeler, dizilim = 'serbest', rol = 'melodi') {
  return { id, ad, uyeler: [...uyeler], dizilim, rol };
}

// Kayıt yükleme + cihaz silme sonrası: ölü üye budanır, üye TEK grupta kalır
// (ilk görülen kazanır), boş grup düşer. Girdi mutasyona uğramaz.
export function gruplariDogrula(gruplar, cihazIdler) {
  const mevcut = new Set(cihazIdler), gorulen = new Set(), out = [];
  for (const g of gruplar ?? []) {
    if (!g || typeof g.id !== 'string' || !Array.isArray(g.uyeler)) continue;
    const uyeler = g.uyeler.filter(u => mevcut.has(u) && !gorulen.has(u));
    uyeler.forEach(u => gorulen.add(u));
    if (!uyeler.length) continue;
    out.push({ id: g.id, ad: String(g.ad ?? g.id), uyeler,
               dizilim: DIZILIMLER.includes(g.dizilim) ? g.dizilim : 'serbest',
               rol: ROLLER.includes(g.rol) ? g.rol : 'melodi' });
  }
  return out;
}

// Task 3/9 köprüsü: sahneKur dosyadan yüklerken cihaz id'lerini yeniden
// adlandırır (ana.js:942, eski→yeni Map — sayaç hiç sıfırlanmadığı için aynı
// id'ler doğmaz). Grup üyeleri de aynı haritadan geçmezse kaydet→aç sonrası
// gruplar sessizce yok olur (üyeler yeni sahnede var olmayan eski id'lere
// işaret eder, gruplariDogrula onları ölü sanıp buda). harita Map ya da düz
// nesne olabilir (sahneKur bir Map kullanıyor — burada Map desteklenir).
// Haritada karşılığı olmayan üye OLDUĞU GİBİ bırakılır — budama burada değil,
// sonrasında gruplariDogrula'nın işi. Girdi mutasyona uğramaz.
export function gruplarYenidenAdlandir(gruplar, harita) {
  const al = harita instanceof Map ? (id => harita.get(id)) : (id => harita[id]);
  return gruplar.map(g => ({ ...g, uyeler: g.uyeler.map(u => al(u) ?? u) }));
}

// Geometrik dizilim önerisi: merkeze uzaklıklar ~eşitse halka, kolinerse hat.
// Yanılabilir — yalnız ÖNERİ, kullanıcı değiştirir (spec §2).
export function dizilimAlgila(konumlar) {
  if (konumlar.length < 3) return 'hat';
  const cx = ort(konumlar.map(p => p.x)), cz = ort(konumlar.map(p => p.z));
  const r = konumlar.map(p => Math.hypot(p.x - cx, p.z - cz));
  const rOrt = ort(r);
  // 0.10: 3 nokta her zaman bir cember uzerindedir — 0.15 esigi dagimik ucgenleri de halka sayiyordu.
  if (rOrt > 1e-6 && Math.max(...r.map(v => Math.abs(v - rOrt))) / rOrt < 0.10) return 'halka';
  // hat: en büyük yayılım eksenine dik sapma küçükse (PCA'sız kaba yol: uç noktalar doğrusu)
  const [a, b] = ucNoktalar(konumlar);
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  if (L < 1e-6) return 'serbest';
  const sapma = konumlar.map(p =>
    Math.abs((b.x - a.x) * (a.z - p.z) - (a.x - p.x) * (b.z - a.z)) / L);
  return Math.max(...sapma) / L < 0.1 ? 'hat' : 'serbest';
}

// Chase/dalga faz SIRASI dizilimden gelir: halkada açısal, hatta eksen boyunca.
export function uyeSirala(uyeler, konumMap, dizilim) {
  const p = id => konumMap[id] ?? { x: 0, z: 0 };
  if (dizilim === 'halka') {
    const cx = ort(uyeler.map(id => p(id).x)), cz = ort(uyeler.map(id => p(id).z));
    return [...uyeler].sort((A, B) =>
      Math.atan2(p(A).z - cz, p(A).x - cx) - Math.atan2(p(B).z - cz, p(B).x - cx));
  }
  if (dizilim === 'hat' || dizilim === 'yay') {
    const [a, b] = ucNoktalar(uyeler.map(id => p(id)));
    const ux = b.x - a.x, uz = b.z - a.z;
    return [...uyeler].sort((A, B) =>
      (p(A).x * ux + p(A).z * uz) - (p(B).x * ux + p(B).z * uz));
  }
  return [...uyeler];
}

// Grup şeridi desen uygulaması (spec §2): üye SIRASI dizilimden, elle damgalı
// kanal ATLANIR (korunan sayısı UI mesajına gider), üretilen kanallar
// kaynak:'grup' damgası alır. Girdi kanallar mutasyona uğramaz.
export function grupDerle(grup, desenAdi, params, kanallar, konumMap) {
  const fn = MASTER_DESENLER[desenAdi];
  if (!fn) throw new Error('bilinmeyen desen: ' + desenAdi);
  const sira = uyeSirala(grup.uyeler, konumMap, grup.dizilim);
  const uret = desenAdi === 'chase'   ? fn(sira, params.beatler ?? [], params.tip)
             : desenAdi === 'unison'  ? fn(sira, params.t0 ?? 0, params.t1 ?? params.sure, params.beatler ?? [], params.tip)
             : desenAdi === 'merdiven'? fn(sira, params.t0 ?? 0, params.t1 ?? params.sure, params.tip)
             : fn(sira, params.sure, params.periyot, params.taban, params.tip);
  // HAYALET KANAL freni: desen YALNIZ zaten master kanalı OLAN üyeye yazılır.
  // Işık cihazlarının (rgb_spot) master'ı yoktur — onlara kanal üretmek motorun
  // tüketmediği ölü şerit doğuruyordu (.aqshow'a da sızıyordu). Işığın grupta
  // olması meşru (spec §3 ambiyans=ışık grupları), sadece master desenini almaz.
  // Kontrol GİRDİ listesine karşı: önceki kaynak:'grup' kanal da "mevcut" sayılır,
  // böylece yeniden derleme çalışmaya devam eder.
  const mevcutHedefler = new Set(kanallar.map(k => k.hedef));
  const yazilabilir = uret.filter(u => mevcutHedefler.has(u.hedef));
  const atlanan = uret.length - yazilabilir.length;
  let korunan = 0;
  const out = kanallar.filter(k => {
    const yeniVar = yazilabilir.some(u => u.hedef === k.hedef);
    if (!yeniVar) return true;                     // desen bu kanalı üretmiyor → kalsın
    if (k.kaynak === 'elle') { korunan++; return true; }
    return false;                                  // eski grup/oto kanal → yenisiyle değişecek
  });
  for (const u of yazilabilir)
    if (!out.some(k => k.hedef === u.hedef && k.kaynak === 'elle'))
      out.push({ ...u, kaynak: 'grup' });
  return { kanallar: out, korunan, atlanan };
}

// Bestele/şablon çıktısını mevcut çizelgeye ELLE KORUYARAK birleştirir
// (spec §2 "bestele artık yalnız elle olmayan kanalları yazar") — grupDerle'nin
// aynı elle-koruma mantığının bestele tarafındaki eşi. Girdi kanallar mutasyona
// uğramaz.
export function birlestirKoruyarak(mevcut, yeni, kaynak) {
  let korunan = 0;
  const out = mevcut.filter(k => {
    if (k.kaynak === 'elle') { if (yeni.some(u => u.hedef === k.hedef)) korunan++; return true; }
    return !yeni.some(u => u.hedef === k.hedef);
  });
  for (const u of yeni)
    if (!out.some(k => k.hedef === u.hedef && k.kaynak === 'elle'))
      out.push({ ...u, kaynak });
  return { kanallar: out, korunan };
}

// Task 10 "gruba döndür": grup üyelerine ait, ELLE damgalı kanalları bulur.
// Görünürlük kapısı (#gruba-dondur düğmesi — yalnız bu liste doluyken görünür)
// ve temizleme eylemi (kaynak damgasını silme) ikisi de bu tek listeden
// beslenir — cihaz kısmı (hedef.split('.')[0]) grup.uyeler kümesinde mi
// kontrolü başka yerde tekrarlanmasın. Girdi kanallar mutasyona uğramaz.
export function grupElleKanallari(grup, kanallar) {
  const uyeler = new Set(grup.uyeler);
  return kanallar.filter(k => k.kaynak === 'elle' && uyeler.has(k.hedef.split('.')[0]));
}

const ort = d => d.reduce((s, v) => s + v, 0) / d.length;
function ucNoktalar(pts) {
  let a = pts[0], b = pts[0], enB = -1;
  for (const p of pts) for (const q of pts) {
    const d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d > enB) { enB = d; a = p; b = q; }
  }
  return [a, b];
}
