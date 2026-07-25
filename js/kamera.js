// kamera.js — KAMERA DİLİ v2 (2026-07-23).
//
// NEDEN YENİDEN YAZILDI: v1'de "preset" bir POZ'du — tuşa basınca kamera hedef
// noktaya IŞINLANIYOR ve `sabitle()` ile oto-yörünge KALICI olarak donuyordu.
// Salih'in GÖRSEL KAPI reddi aynen: "kamera presetleri kötü, drone çekimleri
// istiyorum veya profesyonel kadraj gerekli, kendiliğinden dönmesi lazım ben
// tuşa basınca." Yani istenen şey pozun tersi: HAREKET.
//
// YENİ MODEL — preset değil ÇEKİM (shot). Her çekim şunu taşır:
//   · varış konumu/hedefi          (kadrajın oturduğu yer)
//   · geçiş süresi + yumuşatma     (ışınlanma YOK, 2-6 sn ease-in-out)
//   · varıştan SONRA devam eden hareket   (kamera varınca DURMAZ)
// Tuş çekimi BAŞLATIR; kamera yumuşakça gider ve gittiği yerde yaşamaya devam eder.
//
// GECİKMELİ BAKIŞ: gerçek drone/vinç çekiminde operatörün bakışı hareketi bir
// tık GEÇ takip eder — hedef anında yapışmaz. `hedefSuan` istenen hedefe zaman
// sabitiyle yaklaşır; kadraja "elle çekilmiş" hissi veren şey budur.
//
// ⚠SCROLL ZOOM HATASI (Salih 2026-07-22 gecesi: "scrolla ayarlamaya çalışıyorum
// olmuyor"): v1'de yörünge yarıçapı SABİT KODLUYDU (r = 11 + sin·2.5). Kullanıcı
// tekerlekle yakınlaşsa bile serbest pencere dolunca tik() kamerayı o sabit
// yarıçapa geri yazıyordu → zoom 20 saniye sonra siliniyordu. Düzeltme:
// kullanıcı dokunduğunda seçtiği MESAFE ORANI (`kullaniciOlcek`) öğrenilir ve
// bundan sonraki tüm çekimlere uygulanır. Kamera artık kullanıcının tercih ettiği
// yakınlıkta yaşar; çekimler o yakınlığa göre ölçeklenir.
import * as THREE from 'three';

// Kübik ease-in-out — hızlanma/yavaşlama simetrik, varışta hız 0'a iner
// (lineer geçiş "kesme" gibi okunur, sinematik değil).
function yumusat(u) {
  const t = Math.min(1, Math.max(0, u));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// GÜVENLİ KADRAJ SINIRLARI — çekim hareketi bunları AŞAMAZ. Amaç: otomatik
// hareket kamerayı suyun altına, zeminin içine ya da gökyüzüne kaçırmasın.
const EN_ALCAK_Y = 1.2;      // su yüzeyi + göz payı
const EN_YUKSEK_Y = 26.0;
const EN_YAKIN = 3.0;        // hedefe minimum mesafe (cihaz içine girmesin)
const EN_UZAK = 46.0;

// --- ÇEKİM KÜTÜPHANESİ -------------------------------------------------------
// `devam(t, taban)` varıştan sonraki hareketi verir: t = çekim başladığından beri
// geçen saniye, taban = çekimin varış konumu/hedefi. MUTLAK konum döndürür.
// Değerler kaba başlangıç — kadraj sağlığı GÖRSEL KAPI'da Salih'in gözüyle kalibre
// edilir (v1'in reddedilme sebebi buydu; bu sefer hareket VAR, ölçü ayarlanacak).
export const KAMERA_CEKIMLER = [
  {
    ad: 'seyirci-alcak',
    // İnsan göz hizası. Havuz kenarında duran birinin gördüğü kadraj.
    varis: { konum: [7.5, 2.5, 9.5], hedef: [0, 2.0, 0] },
    gecisSn: 3.0,
    // Çok yavaş yanal kaydırma (dolly) — seyirci ağır ağır yürüyor gibi.
    // Yükseklik neredeyse sabit: göz hizası çekiminde irtifa oynarsa sahte durur.
    devam: (t, b) => ({
      konum: [b.konum[0] + Math.sin(t * 0.075) * 2.6,
              b.konum[1] + Math.sin(t * 0.05) * 0.18,
              b.konum[2] + Math.cos(t * 0.055) * 1.1],
      hedef: [b.hedef[0] + Math.sin(t * 0.04) * 0.5, b.hedef[1], b.hedef[2]]
    })
  },
  {
    ad: 'drone-genel',
    // ⚠v1'de bu çekim TAM TEPEDEN dik bakıyordu ([0.1, 17, 0.1]) — "drone" diye
    // konan ama aslında kuş bakışı ORTOGRAFİK hissi veren, ölü bir kadrajdı.
    // Gerçek drone genel planı EĞİK bakar: yükseklik var ama ufuk da görünür.
    varis: { konum: [13, 11, 15], hedef: [0, 1.5, 0] },
    gecisSn: 4.5,
    // Drone dili = yavaş yanal yörünge + hafif irtifa nefesi (Codex'in tarifi).
    // Sabit tepeden bakmak drone DEĞİLDİR; hareket paralaksı satar.
    devam: (t, b) => {
      const r = Math.hypot(b.konum[0], b.konum[2]);
      const a = Math.atan2(b.konum[2], b.konum[0]) + t * 0.042;   // ~150 sn/tur
      return {
        konum: [Math.cos(a) * r, b.konum[1] + Math.sin(t * 0.07) * 1.6, Math.sin(a) * r],
        hedef: b.hedef
      };
    }
  },
  {
    ad: 'simetrik-portal',
    // Tam karşıdan, simetrik. Mimari/ürün çekimi dili — kurumsal sunum karesi.
    varis: { konum: [0, 4.5, 17], hedef: [0, 2.5, 0] },
    gecisSn: 3.5,
    // Yavaş içeri itiş (push-in) + geri çekilme: simetriyi BOZMADAN nefes aldırır.
    // Yanal kayma YOK — simetrik çekimin değeri tam da simetriyi korumasında.
    devam: (t, b) => ({
      konum: [0, b.konum[1] + Math.sin(t * 0.06) * 0.6,
              b.konum[2] - 3.2 * (0.5 - 0.5 * Math.cos(t * 0.055))],
      hedef: b.hedef
    })
  },
  {
    ad: 'sahne-yakin',
    // Yakın plan: tek cihazın karakteri okunsun (nozul, köpük, ışık gölü).
    varis: { konum: [3.2, 2.4, 4.6], hedef: [0, 1.8, 0] },
    gecisSn: 2.5,
    // Özne çevresinde kısa yay — yakın planda geniş hareket mideye vurur, dar tutuldu.
    devam: (t, b) => {
      const r = Math.hypot(b.konum[0], b.konum[2]);
      const a = Math.atan2(b.konum[2], b.konum[0]) + Math.sin(t * 0.05) * 0.30;
      return {
        konum: [Math.cos(a) * r, b.konum[1] + Math.sin(t * 0.09) * 0.30, Math.sin(a) * r],
        hedef: b.hedef
      };
    }
  }
];

// Serbest pencere: kullanıcı fare/tekerlekle dokununca otomatik hareket bu kadar
// saniye susar. v1'den korundu (20 sn), ama artık süre dolunca kamera GERİ
// SIÇRAMAZ — bulunduğu yerden mevcut çekimin eğrisine yumuşakça geri bağlanır.
const SERBEST_SN = 20;
const GERI_BAGLANMA_SN = 2.5;

// OTOMATİK ÇERÇEVELEME — "profesyonel kadraj" isteğinin teknik karşılığı.
// Çekim değerleri (yukarıda) BU yarıçaptaki bir yerleşim için ayarlandı. Gerçek
// sahne 37 cihazlık 10 m'lik daire de olabilir, tek cihaz da; kadraj sabit
// kalırsa ilkinde cihazlar karenin dışında, ikincisinde nokta kadar kalır.
// Bu yüzden çekimler sahnenin GERÇEK merkezine taşınır ve yarıçapıyla ölçeklenir.
const REF_YARICAP = 6;
// Ölçek tavanı/tabanı: tek cihazlık sahnede kamera burnuna sokulmasın, dev
// yerleşimde de ufka kaçmasın.
const OLCEK_MIN = 0.55, OLCEK_MAKS = 2.6;

export function kameraKur(camera, controls) {
  let serbestKalan = 0, sabit = false;
  let cekim = null, cekimT = 0, gecisKalan = 0;
  let kullaniciOlcek = 1;                       // scroll zoom tercihi (bkz. başlık notu)
  // Geçiş başlangıcı: çekim başlatıldığı ANDAKİ kamera durumu (ışınlanma yok).
  const basKonum = new THREE.Vector3(), basHedef = new THREE.Vector3();
  const istenenKonum = new THREE.Vector3(), istenenHedef = new THREE.Vector3();
  const hedefSuan = new THREE.Vector3().copy(controls.target);   // gecikmeli bakış
  const gecici = new THREE.Vector3();

  // Sahne çerçevesi: ana.js cihaz listesinden besler (bkz. sahneCercevele).
  let sahneMerkez = [0, 0], sahneOlcek = 1;

  // v1 uyumu: hash demoları (#efektdemo vb.) kıyas açısını dondurmak için çağırır.
  const sabitle = () => { sabit = true; };

  // ana.js çağırır: cihazların yayılımından kadrajı türet. Cihaz yoksa
  // (boş sayfa) referans çerçeve korunur — kamera havuz merkezine bakar.
  function sahneCercevele(merkez, yaricap) {
    if (!Number.isFinite(merkez?.[0]) || !Number.isFinite(merkez?.[1])) return;
    sahneMerkez = [merkez[0], merkez[1]];
    const y = Number.isFinite(yaricap) && yaricap > 0.5 ? yaricap : REF_YARICAP;
    sahneOlcek = Math.min(OLCEK_MAKS, Math.max(OLCEK_MIN, y / REF_YARICAP));
  }

  // Referans uzaydaki (orijin merkezli) çekim noktasını GERÇEK sahneye taşı.
  // y ölçeklenir ama merkez ötelemesi YATAY — yükseklik zemine bağlı kalmalı.
  function sahneyeTasi(v) {
    v.x = sahneMerkez[0] + v.x * sahneOlcek;
    v.z = sahneMerkez[1] + v.z * sahneOlcek;
    v.y = v.y * sahneOlcek;
  }

  // Kullanıcı dokundu → otomatik hareketi sustur.
  controls.addEventListener('start', () => { serbestKalan = SERBEST_SN; });
  // ⚠Zoom oranı 'end' olayında ÖLÇÜLMEZ. OrbitControls tekerlekte start+end'i
  // ARKA ARKAYA yollar (onMouseWheel), ama enableDamping açık olduğu için
  // yakınlaşma o anda daha uygulanmamıştır — damping onu sonraki karelere yayar.
  // 'end'de ölçmek her tıkta eksik bir oran okur. Bunun yerine oran serbest
  // pencere boyunca HER KAREDE tazelenir (aşağıda tik içinde): kullanıcı
  // bırakınca damping oturmuş olur ve son okunan oran doğrudur.

  function cekimBaslat(i) {
    const c = KAMERA_CEKIMLER[i];
    if (!c) return;
    sabit = false;                       // çekim seçmek donmayı KALDIRIR
    cekim = c;
    cekimT = 0;
    gecisKalan = c.gecisSn;
    basKonum.copy(camera.position);      // nereden gelirsek gelelim, oradan başla
    basHedef.copy(hedefSuan);
    serbestKalan = 0;                    // tuş = "otomatiği geri ver" demektir
  }

  // Çekimin o andaki HAM hedefi (kullanıcı zoom'u ve güvenlik sınırları uygulanmadan).
  function cekimDurumu(t) {
    const b = cekim.varis;
    const d = cekim.devam ? cekim.devam(t, b) : { konum: b.konum, hedef: b.hedef };
    return d;
  }

  // Kullanıcının kurduğu mesafe ÷ çekimin o andaki nominal mesafesi.
  // Sahne ölçeği İKİSİNE de uygulandığı için sadeleşir — oran saf "kullanıcı
  // ne kadar yakın istiyor" bilgisidir, yerleşim büyüklüğünden bağımsızdır.
  const _nk = new THREE.Vector3(), _nh = new THREE.Vector3();
  function kullaniciOlcegiOlc() {
    if (!cekim) return;
    const d = cekimDurumu(cekimT);
    _nk.set(...d.konum); _nh.set(...d.hedef);
    sahneyeTasi(_nk); sahneyeTasi(_nh);
    const nominal = _nk.distanceTo(_nh);
    const suan = camera.position.distanceTo(controls.target);
    if (nominal > 1e-3 && suan > 1e-3) {
      kullaniciOlcek = Math.min(3.0, Math.max(0.25, suan / nominal));
    }
  }

  // Güvenli kadraj: yükseklik ve hedefe mesafe sınırlara çekilir.
  function guvenliKadraj(konum, hedef) {
    konum.y = Math.min(EN_YUKSEK_Y, Math.max(EN_ALCAK_Y, konum.y));
    gecici.subVectors(konum, hedef);
    const uz = gecici.length();
    if (uz < 1e-4) { konum.z += EN_YAKIN; return; }
    const kirpik = Math.min(EN_UZAK, Math.max(EN_YAKIN, uz));
    if (kirpik !== uz) konum.copy(hedef).add(gecici.multiplyScalar(kirpik / uz));
  }

  function tik(dt, oynuyor) {
    // !oynuyor kapısı ÖNCE: duraklatma/editörde yörünge de durur, serbest pencere
    // de ERİMEZ (T12 — dt duraklatmada akmaya devam ediyor, dekrement oynatma
    // koşulunun arkasında kalmalı).
    if (sabit || !oynuyor) return;
    if (serbestKalan > 0) {
      serbestKalan -= dt;
      hedefSuan.copy(controls.target);   // kullanıcı sürüklerken bakış onu izlesin
      kullaniciOlcegiOlc();              // scroll zoom tercihini öğren (bkz. 'end' notu)
      return;
    }
    // Hiç çekim seçilmediyse varsayılan drone genel planı — v1'de burada sabit
    // kodlu bir yörünge vardı; artık aynı çekim kütüphanesinden besleniyor ki
    // "otomatik kamera" ile "tuşla seçilen kamera" AYNI dili konuşsun.
    if (!cekim) cekimBaslat(1);

    cekimT += dt;
    const d = cekimDurumu(cekimT);
    istenenKonum.set(...d.konum);
    istenenHedef.set(...d.hedef);
    sahneyeTasi(istenenKonum);          // önce gerçek yerleşime çerçevele…
    sahneyeTasi(istenenHedef);

    // …sonra kullanıcının scroll ile kurduğu yakınlık: hedefe olan vektörü ölçekle.
    if (kullaniciOlcek !== 1) {
      istenenKonum.sub(istenenHedef).multiplyScalar(kullaniciOlcek).add(istenenHedef);
    }
    guvenliKadraj(istenenKonum, istenenHedef);

    if (gecisKalan > 0) {
      // Çekime YUMUŞAK giriş: ışınlanma yok, ease-in-out ile süzül.
      gecisKalan = Math.max(0, gecisKalan - dt);
      const u = yumusat(1 - gecisKalan / cekim.gecisSn);
      camera.position.copy(basKonum).lerp(istenenKonum, u);
      hedefSuan.copy(basHedef).lerp(istenenHedef, u);
    } else {
      camera.position.copy(istenenKonum);
      // Gecikmeli bakış: hedef anında yapışmaz, zaman sabitiyle yaklaşır.
      // Serbest pencereden dönüşte de bu satır "geri sıçrama" yerine geri
      // BAĞLANMA hissi verir (v1'de kamera bir karede zıplıyordu).
      hedefSuan.lerp(istenenHedef, Math.min(1, dt / GERI_BAGLANMA_SN * 2.5));
    }
    controls.target.copy(hedefSuan);
    camera.lookAt(hedefSuan);
  }

  // durum(): kamera neden hareket etmiyor sorusunu SAYIYLA cevaplar. Gece
  // turunda "mesaj düşüyor ama kamera donuk" tuzağı bununla çözüldü.
  const durum = () => ({ sabit, serbestKalan: +serbestKalan.toFixed(1),
    cekim: cekim?.ad ?? null, cekimT: +cekimT.toFixed(1),
    gecisKalan: +gecisKalan.toFixed(1), kullaniciOlcek: +kullaniciOlcek.toFixed(2),
    sahneMerkez, sahneOlcek: +sahneOlcek.toFixed(2) });

  return { tik, sabitle, cekimBaslat, sahneCercevele, durum,
    cekimSayisi: KAMERA_CEKIMLER.length };
}
