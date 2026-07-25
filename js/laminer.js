// laminer.js — mesh laminer lance (Ders 4 "cam su" hattı portu, davranış birebir).
// Ders 4 (ders/04-mesh-su/index.html) üç mesh cihazı (lance · çan · perde) gösterir;
// buraya SADECE lance taşındı (çan/perde/MiniSerpinti = YAGNI). Fark: modülerleşme +
// uMaster kapısı + sabit v0/theta (v1'de eğri statik, θ taraması yok).
//
// Motor'dan içe aktarılan: katmanUniformlari (ortak uniform seti + özel). SOFT_FADE_GLSL
// import EDİLMEDİ: Ders 4'ün su-mesh shader'ı (serpintinin aksine) softFade KULLANMAZ —
// ders yorumu (BLOK 4): "su mesh'leri kullanmaz çünkü zemine değdikleri yerler zaten UV
// alt-fade maskesiyle eriyor". Bu yüzden lance self-soft-fade olmaz; görünmezlik riski yok.
import * as THREE from 'three';
import { katmanUniformlari } from './motor.js';
import { kalinlikCarpanlari, tupKalinlikUygula } from './geometri.js';
import { jumpGovde } from './govde.js';
import { KATMAN } from './katman.js';
import { sizintiKatsayisi, kopmaS, ucGucu, hatKazanclari, GORSEL_TAVAN_M } from './isik-borusu.js';

// --- streak dokusu (Ders 4 BLOK 2 — motorda yok, damlaDoku'dan farklı) --------------
// dokuUret'in boyut parametreli sürümü: cizgiDoku 256 ister (çizgiler 1-3 px, 128'de
// merdivenleşirdi). Motor'daki dokuUret 128 sabit olduğundan buraya birebir kopyalandı.
function dokuUret(ciz, boyut = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = boyut;
  ciz(c.getContext('2d'), boyut);
  return new THREE.CanvasTexture(c);
}

// cizgiDoku (streak): ~40 rastgele dikey parlak segment — laminer suyun "iplik iplik"
// akış imzası. Uçları gradient'le sönen şeritler + dikey/yatay wrap kopyaları (dikişsiz
// döşeme). wrapS=wrapT=RepeatWrapping ŞART. (Ders 4 BLOK 2'den birebir.)
const cizgiDoku = dokuUret((ctx, S) => {
  function serit(x, y0, w, boy, a) {
    const g = ctx.createLinearGradient(0, y0, 0, y0 + boy);
    g.addColorStop(0.0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y0, w, boy);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * S;
    const w = 1 + Math.random() * 2;
    const boy = S * (0.25 + Math.random() * 0.45);
    const y0 = Math.random() * S;
    const alfa = 0.15 + Math.random() * 0.35;
    const kopya = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < kopya; k++) {
      const ox = x + (Math.random() - 0.5) * 3;
      const a = alfa / kopya;
      serit(ox, y0, w, boy, a);
      serit(ox, y0 - S, w, boy, a);
      serit(ox - S, y0, w, boy, a);
      serit(ox - S, y0 - S, w, boy, a);
    }
  }
}, 256);
cizgiDoku.wrapS = cizgiDoku.wrapT = THREE.RepeatWrapping;

// kopma parlaması sprite dokusu (T-B): yumuşak radyal flaş
const parlamaDoku = dokuUret((ctx, S) => {
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
});

// --- kapalı-form eğri (Ders 4 BLOK 3a) ----------------------------------------------
// Ders'in LANCE_POS'u (-6,0.2,0) sahne-yerleşimliydi; burada eğri GRUP-YEREL uzayda
// üretilir (kaynak ~origin), dünya konumu/açısı grup'tan gelir. LANCE_POS.y küçük gövde
// yüksekliği; LANCE_YON +x (grup rotation.y açıyı verir).
const G = 9.81;
const LANCE_POS = new THREE.Vector3(0, 0.2, 0);
const LANCE_YON = new THREE.Vector3(1, 0, 0);
const LANCE_ORNEK = 48;

// p(t) = başlangıç + yön·(v0·cosθ·t) + ŷ·(v0·sinθ·t − ½g·t²). Uçuş süresi de kapalı form.
// (Ders 4'te {egri, inis} dönerdi; inis serpinti bağlama noktasıydı — v1'de serpinti yok,
// sadece egri döner.)
function lanceEgrisiUret(v0, thetaDeg) {
  const theta = THREE.MathUtils.degToRad(thetaDeg);
  const vYatay = v0 * Math.cos(theta);
  const vDikey = v0 * Math.sin(theta);
  const T = (vDikey + Math.sqrt(vDikey * vDikey + 2 * G * LANCE_POS.y)) / G;
  const noktalar = [];
  for (let i = 0; i < LANCE_ORNEK; i++) {
    const t = (i / (LANCE_ORNEK - 1)) * T;
    noktalar.push(new THREE.Vector3(
      LANCE_POS.x + LANCE_YON.x * vYatay * t,
      LANCE_POS.y + vDikey * t - 0.5 * G * t * t,
      LANCE_POS.z + LANCE_YON.z * vYatay * t
    ));
  }
  return { egri: new THREE.CatmullRomCurve3(noktalar) };
}

// TubeGeometry yol eksenini u'ya koyar — bizim UV kanonumuzun tersi. Takas: yeni v = yol
// (0=nozul, 1=iniş) → streak doğru yönde kayar VE uAltFade (vUv.y) iniş ucunda erir.
// (Ders 4 BLOK 3 uvKanonTakas'tan birebir.)
function uvKanonTakas(geo) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, v, u);
  }
}

// --- cam su shader'ı (Ders 4 BLOK 4) ------------------------------------------------
const suVertex = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// suFragment: Ders 4 BLOK 4b'den birebir + SON alfa'ya uMaster kapısı (Task 5 eki).
const suFragment = /* glsl */`
  uniform sampler2D uCizgiDoku;
  uniform vec3  uRenk;
  uniform float uAlfa;
  uniform float uFresnelGuc;
  uniform float uFresnelKatki;
  uniform float uAkisKatki;
  uniform float uOlcek1;
  uniform float uHiz1;
  uniform float uOlcek2;
  uniform float uHiz2;
  uniform float uAltFade;
  uniform float uYanFade;
  uniform float uTime;
  uniform float uMaster;   // Task 5: showT master kapısı (0..1)
  // v7 ŞİKÂYET 2 — ışık borusu (isik-borusu.js ile AYNI formül, GLSL kopyası)
  uniform float uKopmaS;      // kopma noktasının yol konumu (0..1)
  uniform float uSizinti;     // m^-1, yüzey kalitesinden
  uniform float uYolUzunluk;  // m, jetin toplam yol uzunluğu
  uniform float uBoruKazanc;  // aeration çapraz geçişi: 1=cam su, 0=köpük
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    // 1) FRESNEL RIM — dik bakışta ışık geçer (görünmez), kenardan yansır (parlak).
    // abs(dot): DoubleSide iki yüzü tek formülde eşitler (tüp iç yüzeyi de doğru parlar).
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - abs(dot(N, V)), uFresnelGuc);

    // 2) ÇİFT KAYDIRMALI STREAK — tek doku, iki farklı ölçek+hız, tekrar kırıcı.
    // (uTime tik(t) ile akar — çağıran her kare showT verir, streak dersteki gibi canlı.)
    float s1 = texture2D(uCizgiDoku, vUv * uOlcek1 - vec2(0.0, uTime * uHiz1)).a;
    float s2 = texture2D(uCizgiDoku, vUv * uOlcek2 - vec2(0.0, uTime * uHiz2)).a;
    float akis = s1 * 0.6 + s2 * 0.4;

    // 3) KENAR MASKELERİ — iniş ucunda (v=1) incelme; tüp çevresi kapalı → yanFade=0.
    float kenarV = vUv.y + (akis - 0.5) * 0.08;
    float altMaske = 1.0 - smoothstep(1.0 - max(uAltFade, 1e-4), 1.0, kenarV);
    float yanMaske = 1.0;
    if (uYanFade > 0.0) {
      yanMaske = smoothstep(0.0, uYanFade, vUv.x)
               * (1.0 - smoothstep(1.0 - uYanFade, 1.0, vUv.x));
    }

    // 4) IŞIK BORUSU (v7 ŞİKÂYET 2 — referans §3.1/§5.5, saf kopyası isik-borusu.js)
    // Laminer su ışığı BOYANMAZ, TIR ile İLETİR: gövde karanlık kalır, enerji
    // kopma noktasına taşınır ve ORADA patlar. Salih'in "iniş ışık hüzmesi gibi"
    // şikâyetinin kök sebebi gövdenin uç kadar parlak olmasıydı.
    float s = vUv.y;                                   // 0=nozul, 1=iniş (uvKanonTakas)
    float canli = 1.0 - smoothstep(uKopmaS, uKopmaS + 0.02, s); // = isik-borusu.canlilik()
    float T = exp(-uSizinti * s * uYolUzunluk) * canli;         // kopmadan sonra ÖLÜR
    // uç bandı: iletilen enerjinin tamamı dar bir bantta serbest kalır (fiber ucu)
    float ucBant = smoothstep(uKopmaS - 0.14, uKopmaS - 0.01, s) * canli;
    // GÖVDE = TIR rim'i (T·0.25) + suyun GEOMETRİK varlığı (0.16). Taban olmadan
    // streak dokusunun karanlık boşlukları sıfıra iniyor, jet "kesikli boncuk
    // dizisi" gibi okunuyordu. ⚠Taban da canli ile ölür: kopmadan sonra ortada
    // (⚠GLSL bloğu JS template literal'ı: yorumda BACKTICK kullanma, string'i kapatır)
    // cam çubuk YOKTUR (dağılmış damlaları parçacık sistemi çizer) — sabit taban
    // bırakmak jetin son parçasını sönmeyen hayalet kuyruk yapıyordu.
    float govdeKat = 0.25 * T + 0.06 * canli;          // = isik-borusu.govdeKazanci()
    float ucKat    = 3.0 * T * ucBant;
    // aeration çapraz geçişi (§5.6): köpüklü jette boru kapanır, eski boyama döner
    float boruKat  = mix(1.0, govdeKat + ucKat, uBoruKazanc);
    float boruAlfa = mix(1.0, govdeKat * 1.6 + ucKat, uBoruKazanc);

    // 5) TOPLAM — additive'de uAlfa opaklık değil KAZANÇ; 1 civarı normal.
    vec3 renk = uRenk * (fresnel * uFresnelKatki + akis * uAkisKatki) * boruKat;
    float alfa = uAlfa * (fresnel + akis) * altMaske * yanMaske * boruAlfa;
    alfa *= uMaster;
    gl_FragColor = vec4(renk, alfa);
  }
`;

// Malzeme fabrikası (Ders 4 BLOK 4c) — cihaz farkı kod değil VERİ.
function suMalzemesi(o) {
  return new THREE.ShaderMaterial({
    uniforms: katmanUniformlari({
      uCizgiDoku:    { value: cizgiDoku },
      uRenk:         { value: new THREE.Color(o.renk) },
      uAlfa:         { value: o.alfa },
      uFresnelGuc:   { value: o.fresnelGuc },
      uFresnelKatki: { value: o.fresnelKatki },
      uAkisKatki:    { value: o.akisKatki },
      uOlcek1:       { value: o.olcek1 },
      uHiz1:         { value: o.hiz1 },
      uOlcek2:       { value: o.olcek2 },
      uHiz2:         { value: o.hiz2 },
      uAltFade:      { value: o.altFade },
      uYanFade:      { value: o.yanFade },
      // motor.js ortakUniformlar'ında uTime YOK (Ders 4'te vardı) — lokal taşındı.
      uTime:         { value: 0 },
      uMaster:       { value: 1 },  // Task 5: master kapısı
      // v7 ışık borusu — gerçek değerler LaminerJet ctor'ında yol uzunluğundan yazılır
      uKopmaS:       { value: 1 },
      uSizinti:      { value: sizintiKatsayisi(o.yuzeyKalitesi ?? 1) },
      uYolUzunluk:   { value: GORSEL_TAVAN_M },
      uBoruKazanc:   { value: hatKazanclari(o.aeration ?? 0).boru }
    }),
    vertexShader: suVertex,
    fragmentShader: suFragment,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// LANCE parametreleri: Ders 4 lanceMat'tan birebir (renk/fresnel/akış/ölçek/hız/fade).
const LANCE_MAT_AYAR = {
  renk: 0xbfe3ff, alfa: 1.2,
  fresnelGuc: 2.0, fresnelKatki: 1.2, akisKatki: 1.6,
  olcek1: 2.0, hiz1: 0.45, olcek2: 4.0, hiz2: 0.85,
  altFade: 0.12,   // iniş ucunda hafif kopma
  yanFade: 0.0,    // tüp çevresi kapalı: yan fade seam yapar
  // v7 ışık borusu girdileri (KART v2 / referans §5.4 varsayılanları):
  // laminer = cam çubuk → aeration 0.0; nozul temiz ama gerçek kurulumda birazcık
  // kabarcık/kir var → kalite 0.92 (5 m'de exp(-0.056×5)=0.76 iletim).
  yuzeyKalitesi: 0.92,
  aeration: 0.0
};

// --- LaminerJet (plan sözleşmesi) ---------------------------------------------------
export class LaminerJet {
  // ctx = { scene, motor }; konum = [x, z]; aciDeg = grup rotation.y (derece, MUTLAK)
  constructor(ctx, id, konum, aciDeg = 0) {
    this.ctx = ctx;
    this.id = id;
    const [x, z] = konum;

    const { egri } = lanceEgrisiUret(7, 40);   // v0=7 m/s, θ=40° sabit (v1)
    this.geo = new THREE.TubeGeometry(egri, 48, 0.035, 8, false);
    uvKanonTakas(this.geo);
    // T-B kalınlık profili: TubeGeometry sabit yarıçaplı — halka merkezleri
    // eğriden örneklenir, vertexler enerji-korunumu çarpanıyla ölçeklenir
    // (debi sabit: yavaş tepe kalın, hızlı uçlar ince).
    const merkezler = [];
    for (let i = 0; i <= 48; i++) { const p = egri.getPointAt(i / 48); merkezler.push([p.x, p.y, p.z]); }
    tupKalinlikUygula(this.geo.attributes.position.array, merkezler, 9,
      kalinlikCarpanlari(merkezler, 7));
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.mat = suMalzemesi(LANCE_MAT_AYAR);
    this.dogalRenk = new THREE.Color(LANCE_MAT_AYAR.renk);   // T-C: doğal preset rengi (beyaz=1 hedefi)
    this.mesh = new THREE.Mesh(this.geo, this.mat);

    this.grup = new THREE.Group();
    this.grup.add(this.mesh);
    this.grup.position.set(x, 0, z);
    this.grup.rotation.y = THREE.MathUtils.degToRad(aciDeg);
    // v7 G2: yay da additive su bandında — sprey ile aynı gerekçe (katman.js),
    // yoksa yüksek yay tepesi şehir silüetinde aynı şekilde kesilirdi.
    // renderOrder Group'tan MİRAS ALINMAZ (three.js her çizilebiliri kendi
    // renderOrder'ıyla kuyruğa iter) → mesh'in kendisine yazılır.
    this.mesh.renderOrder = KATMAN.SU_HACIM;
    ctx.scene.add(this.grup);

    // v7 ışık borusu: yol uzunluğu (metre) eğrinin GERÇEK yay boyundan — kopma
    // noktası ve sızıntı üsteli metre tabanlı, jet uzadıkça üst kısım kararır.
    const yolUzunluk = egri.getLength();
    const borOpt = { yolUzunluguM: yolUzunluk, yuzeyKalitesi: LANCE_MAT_AYAR.yuzeyKalitesi };
    this.kopmaS = kopmaS(yolUzunluk);
    this.ucGuc = ucGucu(borOpt).T;
    this.mat.uniforms.uKopmaS.value = this.kopmaS;
    this.mat.uniforms.uYolUzunluk.value = yolUzunluk;

    // kopma parlaması (AquaJUMP "jump"): master kenarında iniş ucunda flaş (T-B)
    // v7: artık UÇ PATLAMASI da bu sprite — konumu jetin sonu değil KOPMA NOKTASI
    // (5 m'den uzun jette kopma yolun ortasındadır, patlama orada olur).
    this.ucNokta = egri.getPointAt(this.kopmaS);
    const parlaMat = new THREE.SpriteMaterial({
      map: parlamaDoku, color: 0xdff2ff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.parla = new THREE.Sprite(parlaMat);
    this.parla.position.copy(this.ucNokta);
    this.parla.scale.setScalar(0.9 * (0.75 + 0.45 * this.ucGuc));
    this.parla.renderOrder = KATMAN.SU_HACIM;
    this.grup.add(this.parla);
    this.oncekiMaster = null; this.parlamaBekle = false; this.parlamaT = null;   // null=ilk çağrı kenarsız

    // v7 ÇARPMA HAVUZU (§5.5 üçüncü çıktı): iletilen ışığın son durağı su
    // YÜZEYİdir. Küresel sprite bunu havada asılı bir sis topu gibi gösteriyordu
    // (gerçek tarayıcı turunda görüldü) → yüzeye YATIRILMIŞ disk.
    this.inisNokta = egri.getPointAt(1);
    this.havuz = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 24),
      new THREE.MeshBasicMaterial({
        map: parlamaDoku, color: 0xdff2ff, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    this.havuz.rotation.x = -Math.PI / 2;              // yüzeye yatık
    this.havuz.position.set(this.inisNokta.x, 0.02, this.inisNokta.z);
    this.havuz.renderOrder = KATMAN.SU_ZEMIN;          // ⚠miras alınmaz, tek tek yazılır
    this.grup.add(this.havuz);

    // Derinlik ön-geçişinde gizlenmeli (Ders 4 BLOK 6: yarı-saydam su mesh'i derinlik
    // fotoğrafına girmez — girseydi su cihazlarının parçacıkları ona karşı fade olurdu).
    ctx.motor.gizleEkle(this.grup);

    // v3 F2: AquaJUMP fırlatıcı gövdesi — AYRI grupta (this.grup gizleEkle'de,
    // opak gövde derinlik ön-geçişinde KALMALI); konum/açı senkronu elle.
    this.govde = jumpGovde(40);
    this.govde.grup.position.set(x, 0, z);
    this.govde.grup.rotation.y = THREE.MathUtils.degToRad(aciDeg);
    ctx.scene.add(this.govde.grup);
  }

  setMaster(v) {
    const m = Math.max(0, v);
    // kenar tespiti: akış açıldı VEYA kesildi → kopma anı flaşı (tik'te söner).
    // İLK çağrı kenar SAYILMAZ — sahne kurulumu/scrub, Zamanlayici'nin ilk
    // uygulamasında sahte flaş ateşliyordu (gece polish #5 ekran bulgusu).
    if (this.oncekiMaster === null) this.oncekiMaster = m;
    if ((m > 0.5) !== (this.oncekiMaster > 0.5)) this.parlamaBekle = true;
    this.oncekiMaster = m;
    this.mat.uniforms.uMaster.value = m;
    this.masterDeger = m;
    this.grup.visible = m > 0.02 || this.parlamaBekle || this.parlamaT !== null;
  }

  // Streak akış saati (Ders 4 birebirlik: dokular uTime ile akar; çağıran showT verir).
  tik(t) {
    this.mat.uniforms.uTime.value = t;
    if (this.parlamaBekle) { this.parlamaT = t; this.parlamaBekle = false; }
    // v7: taban = SÜREKLİ uç patlaması (boru boyunca iletilen enerji orada çıkar);
    // kopma flaşı bunun ÜSTÜNE binen geçici tepe (akış açılma/kesilme kenarı).
    const taban = 0.34 * this.ucGuc * (this.masterDeger ?? 1);
    let flas = 0;
    if (this.parlamaT !== null) {
      const gecen = t - this.parlamaT;
      if (gecen < 0 || gecen > 0.45) this.parlamaT = null;
      else flas = 1.6 * (1 - gecen / 0.45);
    }
    this.parla.material.opacity = taban + flas;
    // Çarpma havuzu: uç patlamasıyla aynı iletilen enerji (§5.5 oranı 1.5/3.0=0.5).
    // ⚠0.5 yerine 0.28: bu jette kopma noktası (s=0.87) iniş noktasına çok yakın,
    // uç patlaması ile havuz ÜST ÜSTE biniyor ve additive toplamları far gibi
    // parlıyordu. Ayrık kaldıkları uzun/eğik jetlerde oran zaten §5.5'e döner.
    this.havuz.material.opacity = (taban + flas * 0.6) * 0.28;
  }

  // T-C per-jet RGBW: lance'ın kendi ShaderMaterial'ı var — renk = uniform.
  // v7: uç patlaması TIR ile TAŞINAN ışıktır — gövdeyle aynı rengi taşımalı.
  // (Önceki sabit 0xdff2ff beyazı, kırmızı jetin ucunda beyaz far gibi duruyordu.)
  setRenk(r, g, b) {
    this.mat.uniforms.uRenk.value.setRGB(r, g, b);
    this.parla.material.color.setRGB(0.55 + 0.45 * r, 0.55 + 0.45 * g, 0.55 + 0.45 * b);
    this.havuz.material.color.copy(this.parla.material.color);
  }

  konumla(x, z) { this.grup.position.set(x, 0, z); this.govde.grup.position.set(x, 0, z); }

  dondur(deg) {
    this.grup.rotation.y = THREE.MathUtils.degToRad(deg);
    this.govde.grup.rotation.y = this.grup.rotation.y;
  }

  sil() {
    this.govde.sil();
    this.geo.dispose();
    this.mat.dispose();
    this.parla.material.dispose();
    this.havuz.geometry.dispose();
    this.havuz.material.dispose();
    this.ctx.motor.gizleCikar(this.grup);
    this.ctx.scene.remove(this.grup);
  }
}
