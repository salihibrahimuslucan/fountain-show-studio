# Cihaz Render Desenleri — "Başkaları nasıl yapmış, ne kopyalanabilir?"

Tarih: 2026-07-14 (gece) · Yöntem: 4 paralel araştırma ajanı (nozul taksonomisi, emitter
mimarisi, ışık/pan-tilt, VFX reçeteleri); lisanslar GitHub API'den teyitli.
Gerekçe: katalogumuz/cihaz şekillerimiz evrensel değil — kendimiz render edeceğiz;
bu doküman neyi kopyalayıp neyi kendimiz yazacağımızın haritası.
NOT: Public repo öncesi bu dosya ürün adlarından arındırılır ya da dışarıda tutulur.

---

## 0. ANA MİMARİ KARAR — iki render hattı

Bütün üretici katalogları (OASE, Safe-Rain, Crystal Fountains) aynı ikiliğe göre örgütlü,
oyun VFX endüstrisi de aynı ayrımı yapıyor:

| Hat | Su tipi | Görünüm | Render | Işık |
|---|---|---|---|---|
| **A. Aerated (köpüklü)** | geyser, foam jet, comet kuyruğu, splash, mist | mat beyaz, opak, kabarcıklı | **parçacık sprite** (Ders 2 hattımız) | yüzeyinden saçar |
| **B. Laminer / sürekli yüzey** | laminer lance, su çanı, yelpaze filmi, perde, küre | cam gibi şeffaf, damla yok | **mesh + kaydırılan doku + fresnel** (parçacık DEĞİL — delikli ve pahalı görünür) | içinden taşır (fiber gibi) |

Kural: gövde ne kadar "cam", o kadar mesh; ne kadar "köpük", o kadar parçacık.
Her cihaz iki hattın kompozisyonu: mesh gövde + kenar/kopma/serpinti parçacıkları
(Depence dersi: cihaz = tek efekt değil, **bileşen grafiği** — nozul+mover+valf+ışık).

## 1. Nozul taksonomisi → bizim aileler

Endüstri standardı tipler ve görsel imzaları (tam tablo ajan raporunda; buradaki
öz, render stratejisi belirleyen kısım):

| Arketip | Görsel imza | Render reçetesi | Bizim aile |
|---|---|---|---|
| Comet/düz jet | yarı şeffaf kolon, tepede beyazlaşan kuyruk | parçacık, dar koni (<5°), hız-bazlı köpük (Ders 2'de VAR) | düz nozul |
| Geyser/cascade | kalın KAR BEYAZI opak kütle | mesh konik gövde (çift kaydırmalı köpük dokusu, V-ekseni power UV) + çevresinde yoğun iri sprite + taban sıçrama halkası; salt parçacıkla: düşük hız + ÇOK yüksek doğum + iri sprite | geyser |
| Foam jet | geyserin küçüğü, çok stabil | geyser reçetesi küçük ölçek, düşük türbülans | köpük jet |
| Fan/yelpaze | düzlemsel yelpaze, kenarları damlaya ayrılır | üçgen dilim mesh (vertex-color kenar fade + panning doku) + üst kenardan dökülen seyrek parçacık; parçacık-ağırlıklı varyant: TEK DÜZLEMDE geniş açı emisyon | yelpaze |
| Laminer lance/leaper | kesintisiz CAM ÇUBUK parabol | parçacık DEĞİL: parabol boyunca TubeGeometry/ribbon + kırılma/specular; leaper=tüpün baş-son kesme animasyonu; uçta kopma parçacığı | lance |
| Su çanı/bell | kapalı camsı zar | LatheGeometry + fresnel-rim (ucuz: additive fresnel; lüks: MeshPhysicalMaterial transmission) + UV.y akan normal map + etek damla emitter'ı. Hazır three.js örneği YOK — boşluğu biz dolduruyoruz | çan |
| Su perdesi | düzlemsel film (projeksiyon yüzeyi) | tek quad + aynı doku iki ölçek/hızda kaydırılıp toplanır (Valve/Cyanilux reçetesi) + alt çarpma çizgisi splash şeridi | perde |
| Mist/fog | görünmez damla, bulut | Ders 2 sis katmanı (büyük düşük-alfa sprite) + rüzgâr adveksiyonu | mist |
| Air shooter | tek patlama, tepede çiçeklenme | burst emisyonu: ilk 100-200 ms dev doğum + yüksek hız, sonra sıfır | hava topu |
| Moving 2-eksen | ark yönü canlı değişir | dar koni emitter + pan/tilt pivot zinciri; **havadaki parçacıklar ESKİ yönde uçmaya devam eder (kırbaç etkisinin sırrı) → worldSpace şart** | AquaROBO |
| Değişken debi | yükselen/alçalan jet | rate VE speed aynı 0..1 kontrol sinyalinden türetilir (debi ~ hız × kesit) | AquaVARIO |
| Vulkan/taç | kat kat açılan zambak | halka halka açılı emitter setleri (2-4 kademe) | taç |

Simülasyon parametresi olarak akılda: `aeration(0-1)`, `windSensitivity`,
`waterLevelDependent` (cascade tipi su seviyesine bağımlı — Safe-Rain notu).

## 2. Cihaz JSON şeması v0 (three.quarks + nebula sentezi)

Kopyalanan desenler (ikisi de MIT — kod da alınabilir, biz tasarımı alıyoruz):
- **Registry dispatch:** her şey `{type, ...params}` + tip→loader kaydı (quarks `EmitterShape.ts`, `Behavior.ts`).
- **Kesirli emisyon akümülatörü:** `bekleyen += dt*rate; dogacak = floor(bekleyen); bekleyen -= dogacak` — kare hızından bağımsız pürüzsüz debi (quarks `ParticleSystem.emit()`).
- **Parçacık-başı-sabit rastgele:** `range` üreteci değeri parçacık doğumunda BİR KEZ örnekler (quarks `IntervalValue`+`GeneratorMemory`) — titremesiz, tekrarlanabilir önizleme.
- **Pan/tilt transform katmanında yaşar, emitter'da değil** (quarks emitter=Object3D; nebula `emitterBehaviours`) + `worldSpace=true`.
- **Burst yapısı:** `{time, count, cycle, interval, probability}` (air shooter/geyser patlaması).
- **Yelpaze için özel shape şart:** quarks cone'un `arc`ı çevresel dilim, düzlemsel yelpaze VERMEZ → kendi `fan` shape'imiz `{fanAngle, fanThickness}`.
- quarks `spread` kuantalaması = ayrık nozul dizisi (finger jet) taklidi — ileride.

```jsonc
{
  "archetype": "straight_jet | geyser | fan | moving_jet_2axis | variable_jet | ...",
  "shape":    { "type": "point|cone|fan|disc", "radius": 0.0, "angle": 0.05, "fanAngle": 1.4 },
  "kinematics": { "axes": [{ "axis": "pan|tilt", "min": -135, "max": 135, "maxSpeed": 90 }] },
  "emission": { "rate": {"type":"const","value":2600}, "bursts": [] },
  "particle": { "life": {"type":"range","a":1.8,"b":2.3}, "speed": {"type":"range","a":10,"b":12},
                "size": {"type":"const","value":0.07}, "color": "#bfe3ff", "aeration": 0.3 },
  "control":  { "intensity": { "speedMap": "curve", "rateMap": "curve" }, "valveLatency": 0.1 }
}
```
Üreteçler: `const | range | curve(PiecewiseBezier)` — quarks `Generators.ts` deseni.
`control` katmanı kütüphanelerde YOK, bizim farkımız (DMX/timeline girişi buraya bağlanır).

## 3. Işık: RGB projektör + hüzme + suyun boyanması

- **Hüzme malzemesi: drei `SpotLightMaterial` (MIT) AL-KULLAN** — self-contained ShaderMaterial,
  React'siz çalışır; CylinderGeometry(üst dar, alt=angle·7) + `lookAt`, mesafe+açı falloff,
  opsiyonel depth-texture soft intersection (su yüzeyine giren hüzme için birebir; bizim Ders 2
  depth prepass'imiz zaten var!). https://github.com/pmndrs/drei/blob/master/src/materials/SpotLightMaterial.tsx
- **ASLS studio (GPL — sadece fikir, kod KOPYALANMAZ):** (1) hüzme mesh'ine eşlik eden GERÇEK
  `THREE.SpotLight` zemini/suyu boyar — çift kayıt; (2) tek InstancedMesh'te 100 beam,
  per-instance color/angle attribute; (3) vertex-scale ile açı değişimi (geometri rebuild yok);
  (4) `floorFade` — hüzmeyi su yüzeyinde kesme fikri.
- **Hüzme içi duman:** Ashima/stegu webgl-noise simplex (MIT) — al-kullan.
- **Parçacıkların ışıktan renk alması:** hazır repo YOK, ~15 satırlık vertex-shader deseni
  kendimiz yazarız: ışık başına `{pos, dir, cosCone, color, intensity}` uniform'u;
  `inCone = smoothstep(cosCone-0.05, cosCone, dot(L/d, dir))`, `att = I/(1+k·d²)`,
  `vColor = baseColor + light.color·inCone·att` (parçacık başına vertex'te, fragment'ta değil).
  Beyaz doygunluğa karşı HSV-V çarpma hilesi (ASLS fikri).

## 4. Pan/tilt (AquaROBO) rig matematiği

- Hiyerarşi: `base(Object3D) → panPivot(rot.y) → tiltPivot(rot.x) → nozzle`;
  emitter doğum konumu/yönü = `nozzle.getWorldPosition/Direction()`.
- **DMX→derece: QLC+ formülü (Apache-2.0, atıfla kod alınabilir):**
  `deg = maxDeg/65535 · (coarse<<8 | fine)`, merkez ofseti `-maxDeg/2`, inverted bayrakları.
- **Slew-rate şart** (mekanik jet DMX gibi zıplayamaz): `angle += clamp(hedef-angle, ±maxDegPerSec·dt)`.
- Kanal şeması: OFL `capability-types.md` (MIT) — `Pan{angleStart,angleEnd}` + `fineChannelAliases`
  (rapordaki P1 kararıyla aynı; ASLS de OFL JSON'larını aynen kullanıyor = doğrulama).

## 5. Kopya haritası (lisans etiketli)

| Kaynak | Lisans | Etiket | Ne için |
|---|---|---|---|
| drei SpotLightMaterial | MIT | ⭐ al-kullan | hüzme |
| QLC+ qmlui (mainview3d.cpp, Fixture3DItem.qml) | Apache-2.0 | al-kullan (atıfla) | 16-bit pan/tilt eşleme |
| OFL fixture şeması | MIT | al-kullan | kanal/cihaz tanımı |
| webgl-noise (stegu) | MIT | al-kullan | hüzme dumanı, türbülans |
| three.quarks kaynak | MIT | tasarım kopyala | emitter/generator/burst şeması |
| three-nebula | MIT | tasarım kopyala | fromJSON deseni |
| mkkellogg/Photons2 | MIT | al-kullan | flipbook köpük atlası (ileride) |
| Season/RiME/Valve/Cyanilux VFX yazıları | — | öğren-uyarla | mesh su reçeteleri (bkz. ajan raporu URL'leri) |
| ASLS studio | GPL-3.0 | SADECE fikir | beam mimarisi, floorFade |
| stemkoski, piellardj, Shadertoy, TrailRendererJS | lisanssız/CC-NC | uzak dur (kod) | — |

## 6. Ders planı güncellemesi (Salih yönlendirmesi 14.07 gece)

- **Ders 3 — Cihaz kütüphanesi v0 (parçacık hattı):** cihaz=JSON preset mimarisi;
  düz jet + geyser + yelpaze + AquaROBO süpürme tek sahnede; kesirli emisyon akümülatörü,
  parçacık-başı-sabit rastgele, pan/tilt pivot zinciri + kırbaç etkisi.
- **Ders 4 — Laminer/mesh hattı:** lance (tüp parabol) + çan (lathe+fresnel) + perde (quad+scroll).
- **Ders 5 — Işık:** drei SpotLightMaterial + gerçek SpotLight çifti + parçacık boyama shader'ı.
- **Ders 6 — GPU balistik ölçek** (eski Ders 3; kapalı-form avantajı geçerli).
- **Ders 7 — Timeline JSON v0** (cihaz şeması artık hazır olduğundan kanal eşlemesi doğal).
