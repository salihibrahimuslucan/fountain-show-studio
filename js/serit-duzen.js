// serit-duzen.js — şerit editörünün SAF düzen hesabı (DOM/canvas yok, Node
// testli). editor.js tüketir: gruplaLaneler + laneYerlestir → çizilecek lane
// listesi; gorunumYarat/zoomla/kaydir → zaman görünüm penceresi (E2 zoom/pan).
export const kanalCihazi = (hedef) => hedef.split('.')[0];
export const parametreAdi = (hedef) => hedef.split('.').pop();

// Parametre filtre kümeleri (E2 çipleri): hue çipi beyazı da kapsar (RGBW dili).
export const FILTRELER = { hue: ['hue', 'beyaz'], master: ['master'], hiz: ['hiz'],
                           parlaklik: ['parlaklik'], servo: ['pan', 'tilt'] };
export const filtreGecer = (hedef, filtre) => !filtre || FILTRELER[filtre].includes(parametreAdi(hedef));

// kanallar → [{tip:'cihaz', cihaz, kanalSayisi, toplamKanal, katli, kanalIdx:[...]},
//             {tip:'kanal', idx, kanal}...] — cihaz sırası ilk görülme sırası.
// Katlı cihaz başlığında kanal laneleri gizlenir (kanalIdx özet zarfı için kalır);
// filtre yalnız kanal lanelerini eler, cihaz başlıkları hep görünür.
// v7 G7: `kanalSayisi` artık FİLTREDEN GEÇEN kanal sayısı — eskiden toplamı
// sayıyordu, "renk" filtresinde başlık "duz_jet_1 · 4" deyip 2 şerit
// gösteriyordu (gerçek tarayıcı bulgusu). Toplam `toplamKanal`'da duruyor;
// katlı başlığın özet zarfı onu kullanmaya devam eder.
//
// Task 8: gerçek cihaz grupları (grup.js → {id, ad, uyeler:[cihazId], dizilim, rol}).
// Önce her grubun başlığı ({tip:'grup', grupId, ad, uyeSayisi, rol, katli, kanalIdx})
// ve ÜYE cihaz blokları (mevcut cihaz-başlığı+kanal mantığının aynısı), sonra gruba
// ait olmayan cihazlar — bugünkü ilk-görülme sırasıyla. Grup katlıysa üye cihaz
// başlıkları VE kanal laneleri gizlenir; grup başlığının kanalIdx'i üyelerin TÜM
// kanal indekslerini birleşik taşır (özet zarfı buna bağlı — cihaz-katlama kalıbının
// aynısı). Katlama anahtarı grup için 'g:'+grupId (cihazlarda düz id).
// FREN 1 (geriye uyum): `gruplar` boş/verilmemişken çıktı bugünküyle BİREBİR AYNI —
// etkileşim koşucusu piksel koordinatlarına dayanıyor.
export function gruplaLaneler(kanallar, katliler, filtre, gruplar = []) {
  // Her cihazın kanal blokları (başlık + görünür kanal laneleri) önceden hesaplanır;
  // grup üyeleri bu bloklardan grup başlığının altına taşınır, kalan sırayla akar.
  const cihazBloklari = new Map();          // cihazId → [lane, lane, ...] (başlık dahil)
  const cihazSirasi = [];
  let aktifCihaz = null, aktifBlok = null;
  kanallar.forEach((kanal, idx) => {
    const cihaz = kanalCihazi(kanal.hedef);
    if (!aktifCihaz || aktifCihaz.cihaz !== cihaz) {
      aktifCihaz = { tip: 'cihaz', cihaz, kanalSayisi: 0, toplamKanal: 0,
                    katli: katliler.has(cihaz), kanalIdx: [] };
      aktifBlok = [aktifCihaz];
      cihazBloklari.set(cihaz, aktifBlok);
      cihazSirasi.push(cihaz);
    }
    aktifCihaz.toplamKanal++;
    aktifCihaz.kanalIdx.push(idx);
    const gecer = filtreGecer(kanal.hedef, filtre);
    if (gecer) aktifCihaz.kanalSayisi++;
    if (!aktifCihaz.katli && gecer) aktifBlok.push({ tip: 'kanal', idx, kanal });
  });

  const gruplananCihazlar = new Set();
  const L = [];
  for (const g of gruplar) {
    const uyeler = g.uyeler.filter(id => cihazBloklari.has(id));
    if (!uyeler.length) { L.push(grupBasligi(g, [], katliler)); continue; }
    uyeler.forEach(id => gruplananCihazlar.add(id));
    const kanalIdx = uyeler.flatMap(id => cihazBloklari.get(id)[0].kanalIdx);
    const grupLane = grupBasligi(g, kanalIdx, katliler);
    L.push(grupLane);
    if (!grupLane.katli) for (const id of uyeler) L.push(...cihazBloklari.get(id));
  }
  for (const cihaz of cihazSirasi)
    if (!gruplananCihazlar.has(cihaz)) L.push(...cihazBloklari.get(cihaz));
  return L;
}

function grupBasligi(g, kanalIdx, katliler) {
  return { tip: 'grup', grupId: g.id, ad: g.ad, uyeSayisi: g.uyeler.length,
           rol: g.rol, katli: katliler.has('g:' + g.id), kanalIdx };
}

// Cihaz başlıkları sabit GRUP_H; kalan yükseklik kanal lanelerine eşit bölünür
// (taban 14px — çok kanalda taşma yerine sıkışma, scroll YOK).
export function laneYerlestir(laneler, H, RULER, GRUP_H = 16) {
  const grupN = laneler.filter(l => l.tip !== 'kanal').length;
  const kanalN = Math.max(1, laneler.length - grupN);
  const kanalH = Math.max(14, (H - RULER - grupN * GRUP_H) / kanalN);
  let y = RULER;
  return laneler.map(l => {
    const laneH = l.tip !== 'kanal' ? GRUP_H : kanalH;
    const yer = { ...l, yTop: y, laneH };
    y += laneH;
    return yer;
  });
}

// --- Katlanmış grup durumunun KALICI biçimi (denetim 2026-07-18 bulgusu) ------
// ⚠ESKİ BİÇİM: `ss-grup-katli` = düz id dizisi (["duz_jet_1", …]). İki ayrı hata:
//   (1) id sayacı her sayfa yüklemesinde sıfırdan başlar, yani `duz_jet_1` her
//       projede VAR — bambaşka bir şovu açan kullanıcının ilk cihazı sebepsiz
//       katlı geliyordu (durum projeler arası SIZIYOR).
//   (2) küme hiç budanmıyordu: silinen cihazların id'leri sonsuza dek birikiyordu.
// YENİ BİÇİM: { [projeAnahtari]: [id…] } — durum projeye bağlı. Üstüne yazarken
// yalnız O AN VAR OLAN cihaz id'leri saklanır (budama), ve en fazla EN_FAZLA_PROJE
// giriş tutulur (en eski düşer) ki localStorage sınırsız büyümesin.
// Eski düz dizi biçimi okunduğunda BİLEREK atılır: hangi projeye ait olduğu
// bilinemez, taşımak (1)'i sürdürmek olurdu.
export const EN_FAZLA_PROJE = 20;

export function katliOku(ham, proje) {
  let j; try { j = JSON.parse(ham ?? 'null'); } catch { j = null; }
  if (!j || Array.isArray(j) || typeof j !== 'object') return new Set();   // eski/bozuk biçim → temiz başla
  const dizi = j[proje];
  return new Set(Array.isArray(dizi) ? dizi.filter(v => typeof v === 'string') : []);
}

// katliler: Set<cihazId>, mevcutCihazlar: iterable<cihazId> (o anki çizelgeden).
// Döner: localStorage'a yazılacak JSON metni.
export function katliYaz(ham, proje, katliler, mevcutCihazlar) {
  let j; try { j = JSON.parse(ham ?? 'null'); } catch { j = null; }
  if (!j || Array.isArray(j) || typeof j !== 'object') j = {};             // eski biçimi migrasyonsuz bırak
  const mevcut = new Set(mevcutCihazlar);
  const kalan = [...katliler].filter(id => mevcut.has(id));                // budama: silinmiş cihazlar birikmesin
  delete j[proje];                                                        // sil+ekle: bu proje anahtar sırasının SONUNA gitsin (LRU)
  if (kalan.length) j[proje] = kalan;
  const anahtarlar = Object.keys(j);
  for (const eski of anahtarlar.slice(0, Math.max(0, anahtarlar.length - EN_FAZLA_PROJE))) delete j[eski];
  return JSON.stringify(j);
}

// --- E2: zaman görünüm penceresi. Değişmez: 0 <= t0 < t1 <= sure, span >= MIN_SPAN.
const MIN_SPAN = 1;
export const gorunumYarat = (sure) => ({ t0: 0, t1: sure });

// İmleç-merkezli zoom: merkezT'nin penceredeki ORANI korunur (imleç altındaki
// zaman sabit kalır); kelepçe [0, sure].
export function zoomla(g, merkezT, carpan, sure) {
  const span = Math.min(sure, Math.max(MIN_SPAN, (g.t1 - g.t0) / carpan));
  let t0 = merkezT - (merkezT - g.t0) * (span / (g.t1 - g.t0));
  t0 = Math.max(0, Math.min(sure - span, t0));
  return { t0, t1: t0 + span };
}

export function kaydir(g, dt, sure) {
  const span = g.t1 - g.t0;
  const t0 = Math.max(0, Math.min(sure - span, g.t0 + dt));
  return { t0, t1: t0 + span };
}
