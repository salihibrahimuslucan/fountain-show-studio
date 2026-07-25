// Minimal DXF ayrıştırıcı — SADECE LINE, LWPOLYLINE, POLYLINE(+VERTEX), ARC, CIRCLE.
// v2 (T-0): artımlı yapı — dxfAkisiYarat() satır satır beslenir (Web Worker
// File.stream() ile devasa dosyayı tek string'e okumadan ayrıştırır);
// dxfAyristir(metin) eski imzayı ince sarmalayıcı olarak korur.
// Bulge (42) yoksayılır; SEQEND'siz POLYLINE ve eski-stil kapalı bayrağı
// sınırları v1'deki gibidir (dosya başı v1 notlarına bak: git log studio/js/dxf.js).
const BIRIM = { 0: null, 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 };   // INSUNITS → metre

export function dxfAkisiYarat() {
  let bekleyenKod = null, ciftSayisi = 0;
  let insBekle = false, birimOlcek = 1, birimGoruldu = false;
  let entitiesGoruldu = false, icinde = false, bitti = false;
  const parcalar = []; let atlanan = 0;
  let tip = null, noktalar = [], kapali = false, polyIcinde = false;
  const alan = {};

  const seg = (x1, y1, x2, y2) => {
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) return;
    parcalar.push([x1, y1, x2, y2]);
  };
  const yay = (cx, cy, r, a0, a1, n) => {
    for (let i = 0; i < n; i++) {
      const u0 = a0 + (a1 - a0) * (i / n), u1 = a0 + (a1 - a0) * ((i + 1) / n);
      seg(cx + r * Math.cos(u0), cy + r * Math.sin(u0), cx + r * Math.cos(u1), cy + r * Math.sin(u1));
    }
  };
  const entityBitir = () => {
    if (tip === 'LINE' && '10' in alan) seg(+alan['10'], +alan['20'], +alan['11'], +alan['21']);
    else if (tip === 'CIRCLE') yay(+alan['10'], +alan['20'], +alan['40'], 0, 2 * Math.PI, 48);
    else if (tip === 'ARC') {
      let a0 = +alan['50'] * Math.PI / 180, a1 = +alan['51'] * Math.PI / 180;
      if (a1 <= a0) a1 += 2 * Math.PI;
      yay(+alan['10'], +alan['20'], +alan['40'], a0, a1, Math.max(8, Math.ceil((a1 - a0) / (Math.PI / 24))));
    }
    else if (tip === 'LWPOLYLINE' || tip === 'POLYLINE') {
      for (let j = 0; j + 1 < noktalar.length; j++)
        seg(noktalar[j][0], noktalar[j][1], noktalar[j + 1][0], noktalar[j + 1][1]);
      if (kapali && noktalar.length > 2)
        seg(noktalar[noktalar.length - 1][0], noktalar[noktalar.length - 1][1], noktalar[0][0], noktalar[0][1]);
    }
    else if (tip) atlanan++;
    tip = null; noktalar = []; kapali = false;
    for (const k in alan) delete alan[k];
  };
  function tagIsle(k, v) {
    ciftSayisi++;
    if (bitti) return;
    if (insBekle) { birimOlcek = BIRIM[+v] ?? null; birimGoruldu = true; insBekle = false; }
    else if (k === '9' && v === '$INSUNITS' && !birimGoruldu) insBekle = true;
    if (!icinde) {
      if (k === '2' && v === 'ENTITIES') { entitiesGoruldu = true; icinde = true; }
      return;
    }
    if (k === '0') {
      if (v === 'VERTEX') { polyIcinde = true; return; }
      if (v === 'SEQEND') { polyIcinde = false; entityBitir(); return; }
      if (!polyIcinde) entityBitir();
      if (v === 'ENDSEC') { bitti = true; return; }
      if (['LINE', 'CIRCLE', 'ARC', 'LWPOLYLINE', 'POLYLINE'].includes(v)) tip = v;
      else if (!polyIcinde) tip = v;                 // tanınmayan → entityBitir'de atlanan++
      return;
    }
    if (tip === 'LWPOLYLINE' && k === '10') { noktalar.push([+v, 0]); return; }
    if (tip === 'LWPOLYLINE' && k === '20') { noktalar[noktalar.length - 1][1] = +v; return; }
    if (tip === 'LWPOLYLINE' && k === '70') { kapali = (+v & 1) === 1; return; }
    if (tip === 'POLYLINE' && polyIcinde && k === '10') { noktalar.push([+v, 0]); return; }
    if (tip === 'POLYLINE' && polyIcinde && k === '20') { noktalar[noktalar.length - 1][1] = +v; return; }
    alan[k] = v;
  }
  return {
    satirBesle(satir) {
      satir = satir.trim();
      if (bekleyenKod === null) bekleyenKod = satir;
      else { tagIsle(bekleyenKod, satir); bekleyenKod = null; }
    },
    bitir() {
      if (ciftSayisi < 2) throw new Error('bicim: DXF tag akisi yok');
      if (!entitiesGoruldu) throw new Error('bicim: ENTITIES yok');
      if (!bitti) entityBitir();
      return { parcalar, birimOlcek, atlanan };
    }
  };
}

export function dxfAyristir(metin) {                   // eski imza — mevcut testler/çağıranlar değişmez
  const a = dxfAkisiYarat();
  for (const s of metin.split(/\r?\n/)) a.satirBesle(s);
  return a.bitir();
}

// T-0: parça bütçesi — devasa DXF'te çizim/etkileşim kilitlenmesin.
// 1) uçları binde-1 ızgaraya yuvarlayıp sıfır-uzunluk + yön-bağımsız tekrarları ele,
// 2) hâlâ bütçe üstündeyse en uzun `butce` parça kalır (görsel kayıp en az).
export function sadelestir(parcalar, butce = 150000) {
  if (parcalar.length <= butce) return { parcalar, dusen: 0 };
  const gorulen = new Set(); const temiz = [];
  for (const p of parcalar) {
    const ax = Math.round(p[0] * 1000), ay = Math.round(p[1] * 1000);
    const bx = Math.round(p[2] * 1000), by = Math.round(p[3] * 1000);
    if (ax === bx && ay === by) continue;
    const k = (ax < bx || (ax === bx && ay <= by)) ? `${ax},${ay},${bx},${by}` : `${bx},${by},${ax},${ay}`;
    if (gorulen.has(k)) continue;
    gorulen.add(k); temiz.push(p);
  }
  if (temiz.length <= butce) return { parcalar: temiz, dusen: parcalar.length - temiz.length };
  const uz2 = (p) => (p[2] - p[0]) ** 2 + (p[3] - p[1]) ** 2;
  temiz.sort((p, q) => uz2(q) - uz2(p));
  return { parcalar: temiz.slice(0, butce), dusen: parcalar.length - butce };
}
