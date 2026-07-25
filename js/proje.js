// proje.js bölüm 1 — cihaz fabrikası + kanal doğurma (plan Task 10) +
// bölüm 2 — .aqshow yaz/oku (plan Task 15, TDD: test/proje.test.mjs).
// cihazYonetici: plan.js'in tükettiği arayüz (liste/ekle/tasi/dondur/sil) +
// Zamanlayici'nin sürdüğü kayitTablosu (hedef adı → setter). Cihaz eklenince
// çizelgeye varsayılan kanallar doğar (T11 editörü bunları düzenleyecek).
// T15 notu: LaminerJet burada import EDİLMEZ, ctx ile enjekte edilir (ana.js) —
// laminer.js three'ye bağlı; statik import modülü Node'da yüklenemez yapardı,
// oysa aqshowYaz/Oku node --test ile koşar (plan dosya haritası: "saf kısım").
import { urunBul } from '../data/katalog.js';        // v7 IŞIK: künye → motor (lümen/LED/delik)
import { HUE_OFSET } from './besteci.js';              // spot sırası → hue (tek kaynak besteci.js — T13 konsolidasyonu)
import { gruplariDogrula } from './grup.js';            // Task 3: .aqshow gruplar serileştirme + geri uyum budama

// v3 F3: katalog arketipleri — switch(AquaSWITCH ani aç/kes), robo(AquaROBO
// pan/tilt), swing(AquaSWING tek eksen), drydeck(zemin nozulu), aquajet(klasik yüksek)
const SU_TURLERI = ['duz_jet', 'vario', 'geyser', 'yelpaze', 'switch', 'robo', 'swing', 'drydeck', 'aquajet',
  'air', 'star', 'perde', 'pop'];   // v5 F2 (torch v5.5'te bileşik cihaz oldu — aşağıda ayrı dal); v7 POP: 95533ed
                                    // arketibi switch→pop yaptı ama whitelist'e eklemeyi unuttu → ekle('pop')
                                    // else return null'a düşüyor, gövde hiç doğmuyordu. pop suEkle yolundan geçer
                                    // (motor.js: tur==='pop' → popPresetTuret); STEP değil, smooth master+hiz +
                                    // salvo mekanizması atımı sürer.
// v5 F2: solenoidli cihazlar — master STEP, ara debi yok (künye kontrol tipleri:
// AIR=DMX→solenoid, STAR=solenoid ON/OFF, CURTAIN=DMX→solenoid dizisi).
const STEP_TURLERI = ['switch', 'air', 'star', 'perde'];
// Faz 1 Task 3 (K2 donanım gerçeği, spec 2026-07-24): "412C takılabilir mi"
// artık sabit tür listesi DEĞİL, KÜNYE bilgisi (katalog.js `isikModul`) —
// 412C nozul-altı halka çoğu cihaza (VARIO/SWITCH/JUMP/ROBO...) fabrikada
// TAKILI gelir, sökülebilir opsiyonel modüldür. urun alanı olmayan/katalogda
// bulunamayan jenerik cihazlarda CIPLAK_TURLER yedek olarak kalır (bu iki
// arketip künyesiz de panel gösterir — eski "çıplak cihaz" mirası).
// ⚠v1→Faz1 KIRIK GEÇİŞ: eski "çıplak cihaz ilkesi" (spec 2026-07-21 §3)
// paletten eklenen vario/switch'i ozIsik=FALSE doğuruyordu ("ışık ayrı satılan
// opsiyon" okuması). Salih F1-3 kararı bunu TERSİNE çevirdi: "çoğu üründe 412
// takılı olsun" — donanım pratiğinde modül fabrikada zaten takılı satılıyor,
// müşteri nadiren söküyor. Doğum artık TAKILI (bkz. ekle() içindeki ozIsik).
// isikModulAlirMi SADECE panel toggle'ının GÖRÜNÜRLÜĞÜNÜ belirler (DryDECK
// 'entegre' → toggle yok, sökülemez); doğum değerini değil.
const CIPLAK_TURLER = ['vario', 'switch'];              // jenerik yedek (künyesiz)
export function isikModulAlirMi(tur, urun) {
  const k = urun && urunBul(urun);
  if (k) return k.isikModul === '412C';
  return CIPLAK_TURLER.includes(tur);
}

// --- FAZ 2 (cihaz turu) — künye alanlarını KOD okur -------------------------
// Aynı desen: künye varsa KÜNYE konuşur, yoksa eski tür listesi YEDEK kalır
// (künyesiz/jenerik cihaz bozulmaz). Tür adına bakan dallar böyle eriyor.

// Kontrol karakteri (künye `kontrol`, K4): 'solenoid' = iki konumlu vana, ara
// debi YOK → master STEP, `.hiz` kanalı DOĞMAZ. 'surekli' = değişken debi →
// smooth master + hız. Faz 4 (G1) koreografın kanal hedefini bu alandan okuyacak;
// alan ŞİMDİ dolduruldu ki iki iş aynı gerçeğe baksın.
export function solenoidMi(tur, urun) {
  const k = urun && urunBul(urun);
  if (k?.kontrol) return k.kontrol === 'solenoid';
  return STEP_TURLERI.includes(tur);
}

// Yön yetenekleri (künye `yon`, K1): hangi eksen VAR ve TAVANI ne.
// pan/tilt kanalı artık 'robo'/'swing' tür adından değil bu alandan doğar;
// künyesiz cihazda eski tür-yedeği ({pan,tilt} robo, {pan} swing) geçerli.
// ⚠Tavan bilgisi kanal doğarken KULLANILIR (varsayılan süpürme genliği künye
// tavanını AŞAMAZ): AquaHYDRA kartı "360° yön ama YALNIZ 15° eğim" diyor —
// ROBO'nun 26°'lik yayını HYDRA'ya vermek cihazı yanlış çizmek olurdu.
export function yonYetenekleri(tur, urun) {
  const k = urun && urunBul(urun);
  if (k?.yon) return k.yon;
  if (tur === 'robo') return { pan: [-90, 90], tilt: [0, 45] };
  if (tur === 'swing') return { pan: [-90, 90] };
  return {};
}

// --- T-C per-jet RGBW renk modeli (spec §T-C, Depence ref md.1) -------------
// Su cihazı/laminer renkleri global spot'tan değil cihaza bağlı RGBW LED'den
// gelir: iki skaler kanal, `${id}.hue` (0..1, step) + `${id}.beyaz` (0..1,
// smooth; 1=hue+doğal-beyaz tepe (parlak pastel), 0=tam doygun hue). Faz 1
// RGBW+ (spec 2026-07-24 K3/G4): beyaz AYRI LED — hue'yu lerp ile SİLMEZ,
// screen karışımıyla üstüne biner: rgbwKaris(hue, beyaz, dogal).
// proje.js SAF kalmalı (node --test doğrudan yükler) → THREE import edilmez;
// hueRgb, THREE.Color.setHSL(h, 1, 0.55) formülünün saf JS eşleniğidir.
// İŞ3 export: editör panelindeki renk karesi (ana.js) aynı formülü kullanır —
// cihazın playhead'deki hue değerini renge çevirir (tek kaynak, kopya formül yok).
export function hueRgb(h) {
  const q = 1.0, p = 0.1;                    // s=1, l=0.55 → q=l+s-l·s=1, p=2l-q=0.1
  const kanal = (t) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [kanal(h + 1 / 3), kanal(h), kanal(h - 1 / 3)];
}
// Faz 1 RGBW+ (spec 2026-07-24 K3/G4): beyaz AYRI LED kanalı — hue rengini
// lerp ile SİLMEZ, screen karışımıyla üstüne biner. beyaz=0 → saf doygun hue
// (eski uçla birebir); beyaz=1 → hue + doğal-beyaz tepe (parlak pastel).
// Screen: 1-(1-a)(1-b) — monoton, [0,1] kapalı, clip'siz.
export function rgbwKaris(hueRenk, beyaz, dogal) {
  // beyaz<=0 kısayolu: matematiksel olarak screen(h,d,0)=h ama kayan-nokta
  // yuvarlaması (1-(1-h)) h'yi bit-birebir vermez → eski uçla tam eşleşme
  // (test: 'beyaz=0 → saf doygun hue') için erken çıkış.
  if (beyaz <= 0) return [hueRenk[0], hueRenk[1], hueRenk[2]];
  const s = (h, d) => 1 - (1 - h) * (1 - d * beyaz);
  return [s(hueRenk[0], dogal.r), s(hueRenk[1], dogal.g), s(hueRenk[2], dogal.b)];
}
// Cihaz başına kapalı-değişken hue/beyaz durumu; her çağrı birleşik rengi
// hesaplayıp nesne.setRenk sürer (nesne.dogalRenk motor/laminer'de saklı).
function renkSetterleri(nesne, hue0) {
  let hue = hue0, beyaz = 1;                 // beyaz=1 → v1 görünümü (geriye uyum)
  const uygula = () => {
    const [R, G, B] = rgbwKaris(hueRgb(hue), beyaz, nesne.dogalRenk);
    nesne.setRenk(R, G, B);
  };
  return { hue: v => { hue = v; uygula(); }, beyaz: v => { beyaz = v; uygula(); } };
}

// elle koruması (spec 2026-07-20 §1): kullanıcının dokunduğu kanal 'elle' damgası
// alır; bestele/şablon/grup derlemesi bu damgaya DOKUNAMAZ. Eski `delete oto`
// çağrılarının tek-kapı halefi. Var olan kaynak (ör. 'grup'/'besteci') varsa
// ÜZERİNE YAZAR — kullanıcı derlenmiş bir kanalı elle bozarsa artık elle sayılır
// (Task 10 "elle rozeti" + "gruba döndür" akışının temeli; damga sessizce
// eskisinde kalırsa koruma zinciri kopar).
export function elleDamgala(kanal) { kanal.kaynak = 'elle'; delete kanal.oto; }

export function cihazYonetici(ctx) {                    // ctx={motor, scene, cizelge, kirlet, mesaj, LaminerJet}
  const kayitTablosu = {};                              // 'id.param' → setter (timeline.Zamanlayici sürer)
  const kayitlar = new Map();                           // id → {tur, nesne, x, z, aci}
  const sayac = {};
  const idUret = (tur) => `${tur}_${sayac[tur] = (sayac[tur] || 0) + 1}`;

  function kanalEkle(hedef, tip, deger) {
    ctx.cizelge.kanallar.push({ hedef, tip, anahtarlar: [[0, deger]] });
  }
  // v5.6 (Salih: "RGBW sürekli döner"): hue varsayılan kanalı SABİT değil DÖNEN
  // rampa — editörde bestelenmemiş cihaz da idle'da renk döngüsü yapar (katalog
  // gerçeği). Sarma setter'da (mod 1), linear ara-değer bozulmaz.
  function hueKanalEkle(hedef, off) {
    const sure = ctx.cizelge.sure ?? 24;
    // oto:true — bu 2-anahtarlı rampa VARSAYILANDIR, elle değişiklik değil.
    // Bayraksız hali besteleTikla'nın elleVar tespitini (anahtar>1) tetikleyip
    // #demo açılışında confirm() soruyordu → headless'ta modal kilit (v5.6 kökü).
    // Editör kanala dokununca bayrağı düşürür (editor.js mutasyon noktaları).
    // ⚠0-1 SÖZLEŞMESİ: ikinci anahtar off + sure·0.045 idi; 5 dakikalık şarkı
    // yüklüyken (sure=345) bu 16.2 çıkıyordu. Editörün .hue şerit aralığı [0,1]
    // olduğu için eğri tuvalin dışına düşüyor, cue yakalanamıyor, yakalanırsa
    // sürükleme sessizce 1'e kelepçeliyordu. Rampa artık 1'de SARILIR: her tur
    // [t,1]+[t+ε,0] çifti eklenir (besteci.js'in hue sarma deseniyle aynı).
    // Denetim 2026-07-18 bulgusu.
    const HIZ = 0.045;                                   // tur/saniye (v5.6 değeri)
    const anahtarlar = [];
    let t = 0, v = off % 1;
    while (t < sure) {
      const kalan = (1 - v) / HIZ;                       // 1'e varmaya kaç saniye
      if (t + kalan >= sure) { anahtarlar.push([t, v], [sure, v + (sure - t) * HIZ]); break; }
      anahtarlar.push([t, v], [t + kalan, 1]);
      t += kalan + 0.001; v = 0;
      anahtarlar.push([t, 0]);
    }
    ctx.cizelge.kanallar.push({ hedef, tip: 'linear', oto: true, anahtarlar });
  }
  // v7 CIHAZ: servo pan VARSAYILAN süpürmesi — üçgen dalga (-A..A..-A), yarı
  // periyot YARIM saniyeden uzun ki okunur/yavaş olsun. oto:true (hueKanalEkle
  // gerekçesi: elle değişiklik SAYILMAZ, besteleTikla confirm sormaz, headless
  // modal kilidi doğmaz). Editör kanala dokununca bayrak düşer (editor.js).
  function panSupurmeEkle(hedef, aralik = null) {
    const sure = ctx.cizelge.sure ?? 24;
    // ±55° süpürme, 4 s yarı periyot (8 s tam). Faz 2 (K1): genlik künye pan
    // ARALIĞINI aşamaz — dar eksenli bir ürün (ör. ±30°) gelirse cihaz kendi
    // sınırının dışına süpürmüş gibi çizilmez. Bugünkü ürünlerin hepsinde
    // aralık ≥ ±90 olduğu için değer 55'te kalır (davranış birebir aynı).
    const A = aralik ? Math.min(55, Math.min(-aralik[0], aralik[1])) : 55, YARI = 4;
    const anahtarlar = [];
    for (let t = 0, isaret = -1; ; t += YARI, isaret = -isaret) {
      if (t >= sure) { anahtarlar.push([sure, isaret * A]); break; }
      anahtarlar.push([t, isaret * A]);
    }
    ctx.cizelge.kanallar.push({ hedef, tip: 'smooth', oto: true, anahtarlar });
  }
  // urun (T-E): katalog ürün adı — görünüm/.aqshow etiketi; motor yalnız tur'u bilir.
  // secenek.yogunluk (v3 F5): şablon döşemede parçacık bütçesi (motor.suEkle'ye akar).
  function ekle(tur, x, z, urun = null, secenek = {}) {
    // v3: ışık sayısı SINIRSIZ (halka modeli per-device — spec cihaz-gerçekçiliği §3)
    const id = idUret(tur);
    let nesne;
    // Faz 1 Task 3 (F1-3, Salih: "çoğu üründe 412 takılı olsun"): doğum artık
    // türden bağımsız TAKILI — 412C modülü fabrikada zaten monte satılıyor.
    // secenek.ozIsik: .aqshow yükleme yolu kayıtlı değeri geri getirir
    // (sahneKur); paletten eklemede alan yok → true (eski "çıplak" davranışın
    // TERSİ — bkz. yukarıdaki CIPLAK_TURLER/isikModulAlirMi notu).
    const ozIsik = secenek.ozIsik ?? true;
    // T-C: hue ofseti spot desenindeki gibi — n = o türden ÖNCEKİ cihaz sayısı
    const n = [...kayitlar.values()].filter(k => k.tur === tur).length;
    if (SU_TURLERI.includes(tur)) {
      // v7 PERDE turu: künye SUYA da geçer (ışıkta zaten geçiyordu — aşağıdaki
      // spotEkle satırı). CLASSIC/LACE/DIGITAL perdelerin ÜÇÜ DE ekranda birebir
      // aynı görünmesinin kök sebebi buydu: ürün adı burada düşüyor, motor yalnız
      // 'perde' türünü görüyordu. motor.suEkle künyesiz çağrıda eski davranışta.
      nesne = ctx.motor.suEkle(tur, id, [x, z], secenek.yogunluk ?? 1, urunBul(urun));
      // Çıplak cihaz: bayrak motora doğumda iner (uOzIsik + ışık gölü — motor.js).
      // Optional chaining: testlerin/eski mockların setOzIsik'siz nesnesi kırılmasın.
      nesne.setOzIsik?.(ozIsik);
      // v3 F4: master düşüş kenarı = akış kesildi → havadaki kütle suya döner,
      // çarpma sesi tetiklenir (ctx.carpma opsiyonel — ana.js balistik gecikmeli
      // kuyruğa alır; testler vermez, saf kalır).
      // ⚠SWITCH "PAT PAT" BUG: oncekiM=1 (cihaz AÇIK varsayımı) yanlıştı — her şov
      // t=0'da TÜM master 0'dan başlar, zamanlayıcının ilk örneklemesi 1→0 SAHTE
      // düşen kenar sanıp çarpma tetikliyordu. Kalabalık switch (8 adet, aynı 0.7s
      // gecikme) tek karede çakışıp toplu "pat" üretiyordu. null tembel başlangıç:
      // ilk gerçek değer kenar SAYILMAZ, sonraki 1→0 kesmeleri hâlâ çalar.
      let oncekiM = null;
      kayitTablosu[`${id}.master`] = v => {
        if (oncekiM !== null && oncekiM > 0.5 && v <= 0.5) ctx.carpma?.(tur);
        oncekiM = v;
        nesne.setMaster(v);
      };
      const rs = renkSetterleri(nesne, HUE_OFSET[n % 4]);
      kayitTablosu[`${id}.hue`] = rs.hue; kayitTablosu[`${id}.beyaz`] = rs.beyaz;
      // Solenoidli türler (SWITCH/AIR/STAR/PERDE): master STEP (ani aç/kes
      // imzası), debi kanalı DOĞMAZ (solenoidde ara debi yok). Diğerleri
      // smooth master + hiz (TORCH'ta hiz = alev boyu/gaz).
      // Faz 2 (K4): karar artık KÜNYEDEN (`kontrol`) — solenoidMi. Tür listesi
      // yalnız künyesiz cihazda yedek. Kazanç: aynı arketipten doğan iki ürün
      // farklı kontrol karakteri taşıyabiliyor (DryDECK ailesi tam bu durum —
      // VARIO DryDECK sürekli, SWITCH DryDECK solenoid, ikisi de arketip 'drydeck').
      if (solenoidMi(tur, urun)) {
        kanalEkle(`${id}.master`, 'step', 1);
      } else {
        kayitTablosu[`${id}.hiz`] = v => nesne.setHiz(v);
        kanalEkle(`${id}.master`, 'smooth', 1); kanalEkle(`${id}.hiz`, 'smooth', 1);
      }
      // AquaROBO/SWING: servo yön kanalları — kapalı-değişken pan/tilt çifti
      // tek setPanTilt'e akar (v2-rgbw.md rezervasyonu burada ödendi).
      // v7 CIHAZ (Salih "su hızlanınca nereye gittiği belli olmuyor"): pan
      // VARSAYILANI ARTIK STATİK 0 DEĞİL, yavaş SÜPÜRME rampası (hueKanalEkle ile
      // aynı gerekçe: bestelenmemiş cihaz da idle'da hareket eder → yön okunur,
      // motor servo trail'iyle kuyruklu yıldız izi doğar). Tilt de artırıldı ki
      // pan süpürmesi dikey kolonu değil GÖRÜNÜR bir yayı taradı. oto:true —
      // besteleTikla elleVar sanmasın (çok-anahtar rampa = varsayılan, confirm YOK).
      // Faz 2 (K1): eksenler KÜNYEDEN (`yon`) — hangi kanal doğacağı tür adına
      // değil cihazın YÖN YETENEĞİNE bağlı. Künyesiz cihazda eski tür-yedeği.
      const yon = yonYetenekleri(tur, urun);
      if (yon.pan || yon.tilt) {
        // Varsayılan süpürme eğimi künye TAVANINI aşamaz: AquaHYDRA kartı
        // "360° yön + YALNIZ 15° eğim" diyor (yılansı, dik kolon) — ROBO'nun
        // 26°'lik yayı ona verilirse cihaz yanlış çizilir. Eski sabitler
        // (robo 26 / hydra 14 / swing 22) TAVANLA KIRPILARAK korunuyor: bugünkü
        // onaylı görünüm birebir aynı, ama tavan artık veriden geliyor.
        const tabanEgim = tur === 'robo' ? (urun === 'AquaHYDRA' ? 14 : 26) : 22;
        const tiltTavan = yon.tilt ? yon.tilt[1] : tabanEgim;
        const tiltVars = Math.min(tabanEgim, tiltTavan);
        let pan = yon.pan ? Math.max(yon.pan[0], -45) : 0, tilt = tiltVars;
        const uygula = () => nesne.setPanTilt(pan, tilt);
        if (yon.pan) {
          kayitTablosu[`${id}.pan`] = v => { pan = v; uygula(); };
          panSupurmeEkle(`${id}.pan`, yon.pan);
        }
        if (yon.tilt) {
          kayitTablosu[`${id}.tilt`] = v => { tilt = v; uygula(); };
          kanalEkle(`${id}.tilt`, 'smooth', tiltVars);
        }
        uygula();                                    // doğuşta eğik + süpürme başında
      }
      hueKanalEkle(`${id}.hue`, HUE_OFSET[n % 4]); kanalEkle(`${id}.beyaz`, 'smooth', 1);
    } else if (tur === 'laminer') {
      nesne = new ctx.LaminerJet({ scene: ctx.scene, motor: ctx.motor }, id, [x, z], 0);
      kayitTablosu[`${id}.master`] = v => nesne.setMaster(v);
      const rs = renkSetterleri(nesne, HUE_OFSET[n % 4]);
      kayitTablosu[`${id}.hue`] = rs.hue; kayitTablosu[`${id}.beyaz`] = rs.beyaz;
      kanalEkle(`${id}.master`, 'step', 1);
      hueKanalEkle(`${id}.hue`, HUE_OFSET[n % 4]); kanalEkle(`${id}.beyaz`, 'smooth', 1);
    } else if (tur === 'torch') {
      // v5.5 karakter kartı: AquaTORCH = BİLEŞİK cihaz — su jeti (torchsu,
      // vario dokusu, maks 2.5m) + jetin TEPESİNDE dans eden alev (torchalev,
      // kaynakY=2.1). Master ikisini birlikte sürer; renk yalnız SUYA işler
      // (alev turuncu kalır). sil() bileşik: else-dalındaki k.nesne.sil() çağırır.
      const su = ctx.motor.suEkle('torchsu', id + '_su', [x, z], secenek.yogunluk ?? 1);
      const alev = ctx.motor.suEkle('torchalev', id + '_alev', [x, z], secenek.yogunluk ?? 1);
      nesne = {
        dogalRenk: su.dogalRenk,
        setMaster: v => { su.setMaster(v); alev.setMaster(v); },
        setHiz: k => { su.setHiz(k); alev.setHiz(k); },
        setRenk: (r, g, b) => su.setRenk(r, g, b),
        konumla: (x2, z2) => { su.konumla(x2, z2); alev.konumla(x2, z2); },
        sil: () => { ctx.motor.suSil(id + '_su'); ctx.motor.suSil(id + '_alev'); }
      };
      let oncekiM = 1;
      kayitTablosu[`${id}.master`] = v => {
        if (oncekiM > 0.5 && v <= 0.5) ctx.carpma?.(tur);   // su kesilince çarpma
        oncekiM = v; nesne.setMaster(v);
      };
      kayitTablosu[`${id}.hiz`] = v => nesne.setHiz(v);
      const rs = renkSetterleri(nesne, HUE_OFSET[n % 4]);
      kayitTablosu[`${id}.hue`] = rs.hue; kayitTablosu[`${id}.beyaz`] = rs.beyaz;
      kanalEkle(`${id}.master`, 'step', 1); kanalEkle(`${id}.hiz`, 'smooth', 1);
      hueKanalEkle(`${id}.hue`, HUE_OFSET[n % 4]); kanalEkle(`${id}.beyaz`, 'smooth', 1);
    } else if (tur === 'rgb_spot') {
      // v7 IŞIK turu: künye motora geçiyor — 412 (4620 lm) ile 406 (1746 lm)
      // aynı parlaklıkta çiziliyordu, oysa aradaki fark 2.65×. LED sayısı ve
      // merkez deliği de (C ↔ non-C) buradan gövdeye iniyor.
      nesne = ctx.motor.spotEkle(id, [x, z], urunBul(urun));   // v3: 412C halka — sınırsız
      if (!nesne) { ctx.mesaj('ışık eklenemedi'); return null; }   // teorik guard
      kayitTablosu[`${id}.hue`] = v => nesne.setHue(v);
      kayitTablosu[`${id}.parlaklik`] = v => nesne.setParlaklik(v);
      // n (yukarıda): bu spot kayitlara EKLENMEDEN önceki spot sayısı (0-tabanlı);
      // sil sonrası boşluk kabul — dizin kaymışsa renkler tekrar edebilir.
      hueKanalEkle(`${id}.hue`, HUE_OFSET[n % 4]); kanalEkle(`${id}.parlaklik`, 'smooth', 0.8);
    } else return null;
    kayitlar.set(id, { tur, nesne, x, z, aci: 0, urun, yogunluk: secenek.yogunluk ?? 1, ozIsik });
    ctx.kirlet();                                        // editör şeritleri yenilensin
    return id;
  }
  function sil(id) {
    const k = kayitlar.get(id); if (!k) return;
    if (SU_TURLERI.includes(k.tur)) ctx.motor.suSil(id);
    else if (k.tur === 'rgb_spot') ctx.motor.spotSil(id);
    else k.nesne.sil();
    for (const h of Object.keys(kayitTablosu)) if (h.startsWith(id + '.')) delete kayitTablosu[h];
    ctx.cizelge.kanallar = ctx.cizelge.kanallar.filter(kn => !kn.hedef.startsWith(id + '.'));
    kayitlar.delete(id); ctx.kirlet();
  }
  function tasi(id, x, z) { const k = kayitlar.get(id); if (!k) return; k.x = x; k.z = z; k.nesne.konumla(x, z); }
  function dondur(id, deg) { const k = kayitlar.get(id); if (!k?.nesne.dondur) return; k.aci = (k.aci + deg) % 360; k.nesne.dondur(k.aci); }
  // ⚠yogunluk DA döner: şablonlar cihazları {yogunluk:0.55} parçacık bütçesiyle
  // döşüyor ama bu alan liste()'de yoktu → .aqshow'a yazılmıyor, açılışta
  // sahneKur varsayılan 1 ile kuruyordu. 30+ cihazlık şablon kaydedilip açılınca
  // sahne ~3× parçacıkla geri geliyordu (60 fps bütçesi kayıp).
  // ozIsik HER ZAMAN yazılır (yogunluk'un "yalnız ≠1'de yaz" cimriliğinin aksine):
  // alanın YOKLUĞU "eski dosya → öz ışıklı aç" geriye-uyum sinyalidir (aqshowOku
  // ?? true). Yeni kayıtta alanı atlarsak vario'nun false'u kaydet→aç turunda
  // sessizce true'ya dönerdi — çıplak cihaz ilkesi (spec 2026-07-21 §3) kaybolur.
  const liste = () => [...kayitlar.entries()].map(([id, k]) => ({
    id, tur: k.tur, x: k.x, z: k.z, aci: k.aci, urun: k.urun ?? null, ozIsik: k.ozIsik,
    ...(k.yogunluk !== undefined && k.yogunluk !== 1 ? { yogunluk: k.yogunluk } : {})
  }));
  // Editör onay kutusu yolu (ana.js sağ panel): kayıt + motor TEK kapıdan
  // güncellenir — kayıt güncellenmezse kaydet→aç bayrağı kaybeder, motor
  // güncellenmezse ekran değişmez. kirlet(): taslak/otokayıt tazelensin.
  function ozIsikAyarla(id, v) {
    const k = kayitlar.get(id); if (!k) return;
    k.ozIsik = !!v;
    k.nesne.setOzIsik?.(!!v);
    ctx.kirlet();
  }
  // Laminer streak saati: uTime her kare showT ile akmalı (laminer.js tik sözleşmesi) —
  // bu bir timeline kanalı değil, render saatidir; o yüzden kayitTablosu'nda değil burada.
  function tik(t) { for (const k of kayitlar.values()) if (k.tur === 'laminer') k.nesne.tik(t); }
  return { ekle, sil, tasi, dondur, liste, tik, ozIsikAyarla, kayitTablosu };
}

// --- bölüm 2: .aqshow yaz/oku (Task 15) -----------------------------------
// Dosya = JSON (surum damgalı). Oku toleranslı: eksik alanlar varsayılanla
// dolar, bozuk parçalar (bilinmeyen tür, sayı-olmayan konum/açı, [t,v] çifti
// olmayan anahtarlar) ayıklanıp uyarilar'a raporlanır (ileri sürüm / elle
// bozulmuş dosya kısmen açılabilsin, sahneye NaN sızmasın — T15 kalite
// bulgusu); surum uyuşmazlığı ve bozuk JSON ise fırlatır.
const GECERLI_TURLER = ['duz_jet', 'vario', 'geyser', 'yelpaze', 'switch', 'robo', 'swing', 'drydeck', 'aquajet',
  'air', 'star', 'torch', 'perde', 'pop', 'laminer', 'rgb_spot'];   // v5 F2; v7 POP: aksi halde kaydedilen POP
                                    // cihazı .aqshow'dan yeniden yüklenirken "bilinmeyen tur" diye sessizce düşerdi
export function aqshowYaz(d) {
  return JSON.stringify({ surum: 1, ad: d.ad, mekan: d.mekan, cihazlar: d.cihazlar,
    cizelge: d.cizelge, muzikAdi: d.muzikAdi ?? null, gruplar: d.gruplar ?? [] }, null, 1);
}
export function aqshowOku(metin) {
  let j; try { j = JSON.parse(metin); } catch { throw new Error('bicim: JSON degil'); }
  if (j.surum !== 1) throw new Error('surum: desteklenmeyen (' + j.surum + ')');
  const uyarilar = [];
  const cihazlar = [];
  for (const c of (j.cihazlar ?? [])) {
    if (!GECERLI_TURLER.includes(c.tur)) { uyarilar.push(`bilinmeyen tur atlandı: ${c.tur} (${c.id})`); continue; }
    const aci = c.aci ?? 0;
    if (![c.x, c.z, aci].every(Number.isFinite)) { uyarilar.push(`bozuk konum/açı atlandı: ${c.id}`); continue; }
    // Faz 1 (F1-3) geriye uyumu: künye-tabanlı 412C alabilen türde (veya
    // künyesiz jenerik yedekte, isikModulAlirMi) alan YOKSA TAKILI (true) —
    // eski dosya bugünkü varsayılan görünümde açılır. isikModulAlirMi FALSE
    // dönen türlere (412C almayan cihazlar) alan ENJEKTE EDİLMEZ: proje.test.mjs
    // gibi ışık-modülsüz türlerin (duz_jet/yelpaze) yaz/oku turu birebir kalır.
    cihazlar.push({ ...c, aci, ...(isikModulAlirMi(c.tur, c.urun) ? { ozIsik: c.ozIsik ?? true } : {}) });
  }
  const cz = j.cizelge ?? {};
  const kanallar = (Array.isArray(cz.kanallar) ? cz.kanallar : []).filter(k => {
    const ok = k && typeof k.hedef === 'string' && Array.isArray(k.anahtarlar) &&
      k.anahtarlar.every(a => Array.isArray(a) && Number.isFinite(a[0]) && Number.isFinite(a[1]));
    if (!ok) uyarilar.push('bozuk kanal atlandı: ' + (k && k.hedef ? k.hedef : '?'));
    return ok;
  }).map(k => {
    // ⚠Zamanlayici.ornekle İKİLİ ARAMA yapar → anahtarlar ARTAN olmak ZORUNDA.
    // Eskiden yalnız sayı olmaları kontrol ediliyordu: sırası bozulmuş bir dosya
    // sessizce yükleniyor, o bölgede anlamsız değerler örnekleniyordu (bozul →
    // kaydet → aç halkası, uyarı yok). Denetim 2026-07-18 bulgusu.
    if (!k.anahtarlar.length) {
      uyarilar.push(`boş kanal (şov boyunca 0 kalır): ${k.hedef}`);
      return k;
    }
    const artan = k.anahtarlar.every((a, i) => i === 0 || a[0] >= k.anahtarlar[i - 1][0]);
    if (!artan) {
      uyarilar.push(`anahtar sırası bozuktu, zamana göre sıralandı: ${k.hedef}`);
      return { ...k, anahtarlar: [...k.anahtarlar].sort((a, b) => a[0] - b[0]) };
    }
    return k;
  });
  return { ad: j.ad ?? 'adsiz', mekan: j.mekan ?? { fon: 'meydan', plan: null },
    cihazlar, cizelge: { sure: Number.isFinite(cz.sure) ? cz.sure : 16, kanallar },
    muzikAdi: j.muzikAdi, gruplar: gruplariDogrula(j.gruplar, cihazlar.map(c => c.id)), uyarilar };
}
