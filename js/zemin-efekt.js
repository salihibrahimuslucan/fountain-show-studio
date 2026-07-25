// zemin-efekt.js — su cihazının zemindeki iki imzası (T-B, Depence md. 2-3 +
// referans havuzu §1.4/§2.1): KopukHalka = çarpma köpüğü (nozul çevresinde dışa
// akan beyaz benek halkası), IsikGolu = su altı ışık gölü (kostik benekli ışıma).
// İkisi de additive + depthWrite:false → derinlik ön-geçişini KİRLETMEZ
// (yarı saydamlar depth yazmaz), motor.gizleEkle gerekmez.
import * as THREE from 'three';
import { KATMAN } from './katman.js';

function dokuUret(ciz, boyut = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = boyut;
  ciz(c.getContext('2d'), boyut);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// benekli köpük dokusu: ~90 rastgele küçük beyaz leke (kaynayan yüzey)
const kopukDoku = dokuUret((ctx, S) => {
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const r = 1.5 + Math.random() * 4, a = 0.25 + Math.random() * 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
  }
}, 256);

const halkaVertex = /* glsl */`
  varying vec2 vYerel;
  void main() {
    vYerel = position.xy;              // CircleGeometry düzlem-yerel (rotasyon öncesi)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const halkaFragment = /* glsl */`
  uniform sampler2D uDoku;
  uniform vec3  uRenk;
  uniform float uIcR;
  uniform float uDisR;
  uniform float uKazanc;
  uniform float uMaster;
  uniform float uTime;
  varying vec2 vYerel;
  void main() {
    float d = length(vYerel);
    // halka maskesi: iç yarıçapta doğar, dışta erir (Bellagio tabanı: simit değil
    // dolgun leke — iç geçiş kısa tutuldu, referans havuzu notu)
    float halka = smoothstep(uIcR, mix(uIcR, uDisR, 0.35), d)
                * (1.0 - smoothstep(mix(uIcR, uDisR, 0.55), uDisR, d));
    // polar kaydırma: benekler DIŞA akar (d - t) → köpük yayılma hissi
    float aci = atan(vYerel.y, vYerel.x);
    vec2 uv = vec2(aci / 6.2831853 * 4.0, d * 2.2 - uTime * 0.7);
    float n1 = texture2D(uDoku, uv).a;
    float n2 = texture2D(uDoku, uv * 1.7 + vec2(0.31, uTime * 0.13)).a;
    gl_FragColor = vec4(uRenk, halka * (n1 * 0.7 + n2 * 0.5) * uKazanc * uMaster);
  }
`;

export class KopukHalka {
  // ayar = { icR, disR, kazanc } (metre; kazanç additive katkı)
  constructor(scene, konum, ayar) {
    this.scene = scene;
    this.geo = new THREE.CircleGeometry(ayar.disR * 1.05, 48);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uDoku: { value: kopukDoku }, uRenk: { value: new THREE.Color(0xdcecff) },
        uIcR: { value: ayar.icR }, uDisR: { value: ayar.disR },
        uKazanc: { value: ayar.kazanc }, uMaster: { value: 1 }, uTime: { value: 0 }
      },
      vertexShader: halkaVertex, fragmentShader: halkaFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(konum[0], 0.02, konum[1]);
    // v7 G2: additive zemin imzasi da su bandinda (katman.js gerekcesi)
    this.mesh.renderOrder = KATMAN.SU_ZEMIN;
    scene.add(this.mesh);
  }
  setMaster(v) { this.mat.uniforms.uMaster.value = Math.max(0, v); this.mesh.visible = v > 0.02; }
  tik(t) { this.mat.uniforms.uTime.value = t; }
  konumla(x, z) { this.mesh.position.set(x, 0.02, z); }
  sil() { this.geo.dispose(); this.mat.dispose(); this.scene.remove(this.mesh); }
}

// --- v6 F4: noise-erosion sıçrama tacı ---------------------------------------
// Rapor (büyük-animasyoncu §F4): çarpmada BÜYÜYÜP ERİYEN taç — flipbook yerine
// tek noise dokusu + yaşla yükselen alfa eşiği (erosion). Cihaz başına 2 koni
// faz kaydırmalı döngüde: biri doğarken öteki erir → çarpma sürekli "kaynar".
const tacVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const tacFragment = /* glsl */`
  uniform sampler2D uDoku;
  uniform vec3  uRenk;
  uniform float uYas;      // 0=doğum 1=ölüm
  uniform float uFaz;      // instance doku ofseti (iki taç aynı desende erimesin)
  uniform float uKazanc;
  uniform float uMaster;
  varying vec2 vUv;
  void main() {
    // dışa+yukarı akan benek alanı; erosion = eşik yaşla yükselir, doku yaşla akar
    float n = texture2D(uDoku, vec2(vUv.x * 3.0 + uFaz, vUv.y * 1.4 - uYas * 0.8)).a;
    float esik = mix(0.12, 0.85, uYas);
    float govde = smoothstep(esik, esik + 0.25, n + 0.2);
    // üst kenar tüylü, dip köpük halkasına oturur
    govde *= (1.0 - smoothstep(0.55, 1.0, vUv.y)) * smoothstep(0.0, 0.12, vUv.y);
    gl_FragColor = vec4(uRenk, govde * (1.0 - uYas * uYas * 0.8) * uKazanc * uMaster);
  }
`;

export class SicramaTaci {
  // ayar = { disR, kazanc } (KopukHalka ölçüsünden türetilir); omur saniye
  constructor(scene, konum, ayar, omur = 0.75) {
    this.scene = scene;
    this.omur = omur;
    this.disR = ayar.disR;
    this.grup = new THREE.Group();
    this.grup.position.set(konum[0], 0, konum[1]);
    // üste doğru açılan kısa taç konisi (üst yarıçap 1, alt 0.55, y 0..1)
    this.geo = new THREE.CylinderGeometry(1, 0.55, 1, 24, 1, true);
    this.geo.translate(0, 0.5, 0);
    this.parcalar = [];
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uDoku: { value: kopukDoku }, uRenk: { value: new THREE.Color(0xe4f1ff) },
          uYas: { value: 0 }, uFaz: { value: i * 0.47 },
          uKazanc: { value: ayar.kazanc * 0.55 }, uMaster: { value: 1 }
        },
        vertexShader: tacVertex, fragmentShader: tacFragment,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.renderOrder = KATMAN.SU_ZEMIN;   // Group'tan miras alinmaz
      this.parcalar.push({ mesh, mat, faz: i * 0.5 });
      this.grup.add(mesh);
    }
    scene.add(this.grup);
  }
  setMaster(v) {
    const g = Math.max(0, v);
    for (const p of this.parcalar) p.mat.uniforms.uMaster.value = g;
    this.grup.visible = g > 0.02;
  }
  tik(t) {
    for (const p of this.parcalar) {
      const yas = ((t / this.omur + p.faz) % 1 + 1) % 1;
      p.mat.uniforms.uYas.value = yas;
      // taç yaşla dışa+yukarı büyür (çarpma dalgası)
      const r = this.disR * (0.5 + 0.75 * yas);
      p.mesh.scale.set(r, this.disR * (0.28 + 0.30 * Math.sqrt(yas)), r);
    }
  }
  konumla(x, z) { this.grup.position.set(x, 0, z); }
  sil() {
    this.geo.dispose();
    for (const p of this.parcalar) p.mat.dispose();
    this.scene.remove(this.grup);
  }
}

// kostik doku: ince parlak yaylar — havuz dibi ışık beneği (caustic hissi)
const kostikDoku = dokuUret((ctx, S) => {
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = 0.8 + Math.random() * 1.6;
    ctx.globalAlpha = 0.25 + Math.random() * 0.45;
    ctx.beginPath();
    const x = Math.random() * S, y = Math.random() * S, r = 4 + Math.random() * 14;
    const a0 = Math.random() * 2 * Math.PI;
    ctx.arc(x, y, r, a0, a0 + 1.2 + Math.random() * 1.6);
    ctx.stroke();
  }
}, 256);

const golVertex = halkaVertex;   // aynı yerel-düzlem varying

const golFragment = /* glsl */`
  uniform sampler2D uDoku;
  uniform vec3  uRenk;
  uniform float uYariCap;
  uniform float uKazanc;
  uniform float uMaster;
  uniform float uTime;
  varying vec2 vYerel;
  mat2 dondur(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  void main() {
    float d = length(vYerel);
    float dusum = 1.0 - smoothstep(uYariCap * 0.25, uYariCap, d);
    // iki zıt yönde dönen kostik katmanı — çarpımları girişim benekleri verir
    vec2 uv1 = dondur(uTime * 0.10) * vYerel * 0.55;
    vec2 uv2 = dondur(-uTime * 0.073) * vYerel * 0.72 + vec2(0.37);
    float c = texture2D(uDoku, uv1).a * texture2D(uDoku, uv2).a;
    gl_FragColor = vec4(uRenk, (c * 2.2 + 0.06) * dusum * uKazanc * uMaster);
  }
`;

export class IsikGolu {
  // ayar = { yariCap, kazanc, renk } — T-B'de renk preset su renginden;
  // T-C per-jet RGBW gelince setRenk timeline renk kanalına bağlanır.
  constructor(scene, konum, ayar) {
    this.scene = scene;
    this.geo = new THREE.CircleGeometry(ayar.yariCap, 48);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uDoku: { value: kostikDoku }, uRenk: { value: new THREE.Color(ayar.renk) },
        uYariCap: { value: ayar.yariCap }, uKazanc: { value: ayar.kazanc },
        uMaster: { value: 1 }, uTime: { value: 0 }
      },
      vertexShader: golVertex, fragmentShader: golFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(konum[0], 0.015, konum[1]);
    this.mesh.renderOrder = KATMAN.SU_ZEMIN;
    scene.add(this.mesh);
  }
  // ⚠GÖRÜNÜRLÜK EŞİĞİ 0.02 → 0.002: aynı DMX değerinden beslenen halkaDisk
  // (govde.js) 0.002 eşiğini kullanıyor. Kare yasası (dmx²) yüzünden gölün eşiği
  // dmx=%14'e, diskinkine %4.5'e denk geliyordu → bir 412C'yi %20'den 0'a fade
  // ederken zemindeki ışık gölü ortada bir karede POP yapıp kayboluyor, LED
  // diski sönmeye devam ediyordu (iki ayrı sıçrama). Denetim 2026-07-18 bulgusu.
  setMaster(v) { this.mat.uniforms.uMaster.value = Math.max(0, v); this.mesh.visible = v > 0.002; }
  // Faz 1.5 (F1-1 kapı düşüşü, Salih 2026-07-25 "hız düşükken ışık göz alıyor,
  // kare gibi"): gölün YARIÇAPI da su kütlesini takip eder. Faz 1 yalnız KAZANCI
  // kısmıştı → hız düşükken zeminde TAM GENİŞLİKTE sönük bir disk kalıyordu:
  // ekranda su yok, ışık plakası var. Ölçek mesh'e verilir; falloff yerel
  // koordinatta tanımlı (vYerel/uYariCap) olduğu için desen büzülür, kenar
  // yumuşaklığı ve kostik dokunun karakteri BOZULMAZ. k=1 → birebir eski hâl.
  setOlcek(k) { const s = Math.max(0.05, k); this.mesh.scale.set(s, s, 1); }
  setRenk(r, g, b) { this.mat.uniforms.uRenk.value.setRGB(r, g, b); }   // T-C kancası
  tik(t) { this.mat.uniforms.uTime.value = t; }
  konumla(x, z) { this.mesh.position.set(x, 0.015, z); }
  sil() { this.geo.dispose(); this.mat.dispose(); this.scene.remove(this.mesh); }
}
