# Eklenebilirler Envanteri — yaşayan dosya (kuruluş: Tur 0, 2026-07-21)

Kural: her cihaz turunun KAYNAK adımında ilgili bölüm tazelenir; kullanılan madde ✔
işaretlenir (Durum sütunu: boşta / ✔ kullanıldı / kontrol edilecek / ileride).
Kod kopyalanmaz, desen alınır (clean-room; GPL/CC-NC kaynaklardan asla kod alınmaz).
Kaynak: 2026-07-21 üç kollu araştırma (A: görünüm teknikleri, B: emsaller, C: ışık karakteri).

## Pazar notu (B kolu, karar girdisi)

- **Tarayıcı tabanlı çeşme previz nişi tamamen boş** — Depence R4 Fountain Module
  11.400 USD/masaüstü; WATERlab bulut ama mühendislik odaklı; açık kaynakta yalnız
  oyuncak demolar. Laminar/jumping jet render eden AÇIK HİÇBİR proje yok → JUMP'ı
  iyi yapan ilk tarayıcı aracı biz oluruz.
- Komut yoğunluğu gerçekliği (Grand Haven sahası): şarkı başına ort. ~1.500, tepe
  6.000 komut — timeline veri modelimizin ölçek hedefi. https://www.ghfountain.org/technical

## A. Sahne geneli cila (her cihaz bedavaya kazanır)

| # | Teknik | Hangi cihaza | Ne katar | Maliyet | Kaynak | Durum |
|---|---|---|---|---|---|---|
| 1 | HDR emissive >1 + ACES + bloom eşik disiplini | sahne | yalnız gerçek parlak öğeler glow alır; Depence monokrom blok hissinin temeli | S | https://threejs.org/docs/pages/UnrealBloomPass.html | kontrol edilecek (VARIO turu kalibrasyonu) |
| 2 | Additive glow sprite (radyal gradyan + AdditiveBlending + depthWrite:false) | tüm su cihazları + ışıklar | nozul/jet ucu "kaynak parlaması"; üst üste binince beyaza toplanır | S | https://stemkoski.github.io/Three.js/Particle-Engine.html | ✔ VARIO turu |
| 3 | FogExp2 + yükseklik/animasyonlu sis (onBeforeCompile) | sahne | gece derinlik hissi | S | https://threejs.org/manual/en/fog.html · https://snayss.medium.com/three-js-fog-hacks-fc0b42f63386 | boşta |
| 4 | Haze kartları (billboard sis sprite, normal blend) | sahne | Depence "nemli hava" katmanı; su hattı üstünde süzülen mist | S | https://medium.com/geekculture/low-poly-smoke-particles-in-three-js-acd3942fd250 | boşta |
| 5 | Planar reflection (THREE.Reflector) — bloom son pass'te yansımaya da işler | havuz yüzeyi | jetlerin sudaki glow'lu yansıması bedavaya | S | https://threejs.org/docs/pages/Reflector.html | kontrol edilecek (motorda kısmen var olabilir) |
| 6 | Yansıma blur/smear (MeshReflectorMaterial deseni, vanilla'ya taşınır) | havuz yüzeyi | referans karelerdeki "dalgacıkla kırılmış dikey ışık şeritleri" görünümü | M | https://drei.docs.pmnd.rs/shaders/mesh-reflector-material · https://discourse.threejs.org/t/blurred-reflections/33296 | boşta |
| 7 | Selective bloom (layers ile iki-geçiş) | sahne | arka plan patlamadan yalnız jet/ışık glow'u | M | https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing/ | boşta |
| 8 | Soft particles (depth fade) | sis/sprey kartları | partiküllerin zemini/jeti sert kesmemesi | M | https://discourse.threejs.org/t/points-transparent-textures-depth-artifacts-soft-particles/5927 | boşta |
| 9 | Screen-space godrays (radial blur) | sahne (büyük tepe anları) | drop anında ışık patlaması draması | M | https://threejs.org/examples/webgl_postprocessing_godrays.html | ileride |

## B. Jet gövdesi (VARIO / SWITCH / geyser)

| # | Teknik | Hangi cihaza | Ne katar | Maliyet | Kaynak | Durum |
|---|---|---|---|---|---|---|
| 10 | Jetin içeriden aydınlanması: ters fresnel (çekirdek parlak) + boyuna emissive falloff | VARIO, SWITCH, tüm jetler | referans karelerdeki "ışık jet gövdesini içeriden boyuyor" görünümü (oase_006) | M | https://stemkoski.github.io/Three.js/Shader-Glow.html · https://github.com/ektogamat/fake-glow-material-threejs | kontrol edilecek (SWITCH turu adayı — switch-hedef-3 LED halkalı içten ışıklı kolon) |
| 11 | Köpüklü jet dokusu: UV.y kayan 2 katman noise + eşikleme + uçta alpha erosion | VARIO, SWITCH | jetler yarı saydam değil köpüklü beyaz — referansların en net dersi | M | https://www.cyanilux.com/tutorials/waterfall-shader-breakdown/ · https://discourse.threejs.org/t/unlit-water-shader-with-foam/11641 | ✔ VARIO turu (SWITCH turu da kullanacak — switch-hedef-2/3 köpüklü/boncuklu kolon) |
| 12 | Jet tepe topuzu: tepe hiç sivri bitmez — köpük + saçak + geri düşen mist | VARIO, geyser, SWITCH, ROBO | bellagio_007/013 tepe karakteri; switch-hedef-1/2 aynı topuzu gösteriyor; robo-hedef-3 "tepe uçları saçaklı" | M | (referans kare gözlemi + #11 aynı doku sistemi) | ✔ VARIO turu (SWITCH, ROBO turları da kullanacak) |
| 13 | Specular glint/twinkle: partikül-id+zaman hash ile HDR>1 parlaklık | sprey partikülleri | damla ışıltısı, bloom'u nokta nokta tetikler | S | https://gpfault.net/posts/webgl2-particles.txt.html | boşta |
| 14 | Shader partikül boyut/twinkle (fireworks deseni) | sprey | mesafe attenuation + per-particle parıltı | M | https://threejs-journey.com/lessons/fireworks-shaders | boşta |
| 15 | Katmanlı efekt mimarisi: ana jet + splash burst + mist + ripple AYRI emitter'lar | tüm su cihazları | Niagara/Epic previz çıtasının yapısal sırrı | M | https://dev.epicgames.com/community/learning/tutorials/Yb9m/unreal-engine-fountain-vfx-simulation | boşta |
| 16 | GPGPU partikül (GPUComputationRenderer, ping-pong FBO) | yoğun jet sahneleri | 100k+ damla; yalnız partikül sayısı yetmezse | L | https://barradeau.com/blog/?p=621 | ileride |
| 17 | Heightfield ripple'a jet çarpma impulsu | havuz yüzeyi | Depence "collision/splash senkronu" hissi | L | https://github.com/jeantimex/webgpu-water (lisans teyit edilecek) | ileride |
| 35 | CustomShaderMaterial ile stilize su/köpük katmanı (onBeforeCompile yerine temiz shader genişletme) | VARIO, SWITCH (#11 destek) | mevcut materyale foam/noise katmanını az kodla eklemenin 2025 deseni | S | https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/ | kontrol edilecek (SWITCH turu adayı, #11 destek) |
| 36 | Voronoi + FBM 3D noise ile "nabız atan" köpük varyasyonu | VARIO, geyser, SWITCH (#11-12 destek) | eşiklenmiş köpüğe zamanla canlı kaynama hissi katan 2026 deseni | S | https://gameidea.org/2026/02/01/creating-a-stylized-3d-water-shader/ | boşta |
| 37 | Solenoid valf tepki süresi: gerçek üründe (Fontana POP Jet) ✅kaynaklı **~20 ms** yüksek hız solenoid | SWITCH | aç/kapa gecikmesini [TÜRETİM] uydurmadan gerçek bir sayıya bağlar | S | https://fontanafountains.com/products/spray-systems/special-water-effects/pop-jets/ (genel sektör bandı: https://tameson.com/pages/solenoid-valve-response-time — direkt-etkili 30 ms, pilotlu 1000 ms+) | boşta |
| 38 | Kesilen jetin BÜTÜN kütle halinde havada kalması: kesme anında taban hemen kuru/temiz olur ama o an havada olan üst kütle ayrı bir "kopuk parça" gibi 1-2 sn uçuşuna devam edip düşer | SWITCH, T-SWITCH/AquaSWITCH DryDECK (aynı tek-solenoid mekanizması) | switch-hedef-2 [GERÇEK] gözlemini ("kesme sonrası kolon havada bütün halinde kopuyor") motora çevirir | M | Kaynak BULUNAMADI (araştırma 2026-07-22) — clean-room orijinal/[TÜRETİM] tasarım gerekir, hazır teknik yok | ✔ SWITCH turu (uygulandı, `motor.js` `aniKesme`/`uKapali`, 2026-07-22) — DryDECK cila turu (2026-07-22) AYNI mekanizmayı `drydeckPresetTuret` ile AquaSWITCH DryDECK'e de bağladı (kart v2 drydeck §3, katalog.js "tek-solenoid" notu) |
| 39 | Kol başına çoklu (12'li) küçük LED halka kümesi (tek torus yerine) | ROBO (aile: SWING/HYDRA da paylaşabilir) | robo-govde-gercek referansındaki gerçek LED halka görünümüne yaklaşır (şu an `govde.js` disk başına yalnız 1 halka çiziyor) | S | (referans kare gözlemi; #21 DryDeck çoklu-emitter deseniyle aynı fikir, farklı cihaza uygulanmış) | boşta (ROBO turu adayı) |

## C. Işık karakteri ayrıştırma (AL-412 / AL-406-412 / DryDeck halka)

Ayrıştırma sinyalleri öncelik sırası (C kolu sentezi): (1) koni açısı + kenar sertliği,
(2) menzil + kanal-bazlı su sönümü, (3) suya/tabana vurduğu desen, (4) beyaz noktası.
Gerçek fotometri çapası: WIBRE sualtı ailesi spot 10° / medium 30° / wide 45° / flood 90°.

| # | Teknik | Hangi cihaza | Ne katar | Maliyet | Kaynak | Durum |
|---|---|---|---|---|---|---|
| 18 | Parametrik volumetrik koni (tek shader: açı, kenar yumuşaklığı, menzil, saçılım) | 412 + 406-412 + DryDeck | üç ışığı TEK kod yolunda parametreyle ayırma | S | https://github.com/jeromeetienne/threex.volumetricspotlight · https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js/ | kontrol edilecek (AL-412/406-412 turu adayı, öncelik 1) |
| 19 | Beam/field çift açı (%50/%10 eşiği): spot'ta beam≈field sert kenar, wash'ta field>>beam yumuşak etek | 412 (sert) vs 406-412 (etekli) | tek parametreyle karakter farkı | S | https://www.vellolight.com/guides/beam-vs-field-angle-stage-lighting-design/ | kontrol edilecek (AL-412/406-412 turu adayı, öncelik 1) |
| 20 | Gerçek açı değerleri: 412 ≈ 10-15°, 406-412 ≈ 45-90° | 412, 406-412 | fark subjektif değil katalog farkı olur | S | https://www.wibre.de/en/produkte-details/product-4-0171.html | ✔ katalogda zaten var (cihaz-karti-v2-aqualight.md §2, 10°/60° lens) |
| 21 | DryDeck = çember üzerinde tekil mini emitter'lar (multi-LED, Depence deseni) + kısa menzil halka ışıma | DryDeck | koni değil halka karakteri; anında ayrışır | S | https://www.syncronorm.com/products/depence2/visualization/lighting · https://fontanafountains.com/products/lighting/fountain-lighting/ulr800/ | boşta |
| 22 | Kanal-bazlı su sönümü: exp(-d·vec3(0.20, 0.05, 0.025)) — uzun huzme ucu camgöbeğine kayar | 412 (uzun), DryDeck (kaymaz) | sualtı fiziği hissi + menzil ayrışması | S | https://manoa.hawaii.edu/exploringourfluidearth/physical/ocean-depths/light-ocean | kontrol edilecek (AL-412/406-412 turu adayı, öncelik 2 — al412-hedef-2 sönümlenme gözlemi) |
| 23 | Sualtı konisi havadakinden "sütlü" (yüksek saçılım katsayısı) | tüm sualtı ışıklar | sualtı vs hava ışığı farkı | S | https://onlinelibrary.wiley.com/doi/10.1111/cgf.15009 | boşta |
| 24 | IES 1D radyal yoğunluk profili (lookup/gradient texture) | üç ışık | düz koniyi "gerçek armatür" huzmesine çevirir — en büyük gerçekçilik sıçraması | M | https://www.gdtf.eu/blog/unleashing-the-full-potential-of-dmx-lighting-in-blenderdmx-with-lasers-gobos-and-ies-photometrics/ | boşta |
| 25 | Taban deseni ayrışması: spot=tek keskin leke, wash=geniş dalgalı kostik, halka=jet dibi çemberi | üç ışık | ışığın "nereye nasıl vurduğu" karakter okutur | M | https://medium.com/@martinRenou/real-time-rendering-of-water-caustics-59cda1d74aa | boşta |
| 26 | CCT beyaz noktası farkı (ör. 412=5700K delici, 406-412=4000K nötr, DryDeck=RGB doygun) | üç ışık | aynı "beyaz" sahnede bile ton farkı | S | https://github.com/mvrdevelopment/spec/blob/main/gdtf-spec.md | kontrol edilecek (AL-412/406-412 turu adayı, öncelik 2) |
| 27 | Koni kalite kademeleri (çizgi → düz koni → sönümlü koni; MA3 deseni) + koni bütçesi: yalnız kahraman armatürlere koni, DryDeck'e emissive halka | performans | zayıf GPU'da bile açı farkı korunur (QLC+ dersi: koni en pahalı öğe) | M | https://help.malighting.com/grandMA3/2.1/HTML/patch_render_quality.html | boşta |

## D. Cihaza özel yeni yetenekler

| # | Teknik | Hangi cihaza | Ne katar | Maliyet | Kaynak | Durum |
|---|---|---|---|---|---|---|
| 28 | Laminar/jumping jet: parabolik yol üstünde extrude tüp mesh + transmission/refraction + baş-son kesim animasyonu | JUMP | cam ark görünümü; nişte İLK olma fırsatı (açık kaynakta hiç yok) | M | https://forums.planetcoaster.com/showthread.php/31328-Laminar-fountains (pazar kanıtı) | kısmen kullanıldı — `laminer.js` tüp/kırılma-noktası ZATEN var (özel ShaderMaterial + ışık-borusu modeli), gerçek PBR transmission/refraction YOK; "boşta" etiketi yanıltıcıydı, JUMP KAYNAK taramasında (2026-07-22) düzeltildi |
| 29 | DryDeck zemin modu: havuz yerine ıslak zemin + kısa ömürlü zemin splash + drenaj ızgarası görseli | DryDeck | kuru plaza sahne kimliği (referans: drydeck-hedef-2-temsili) | M | https://fontanafountains.com/products/spray-systems/dry-deck-fountains/fpk-8000/ | boşta — DryDECK cila turu (2026-07-22) `zemin-efekt.js` (KopukHalka/SicramaTaci) hâlâ havuz varsayımıyla; kart v2 drydeck D8 [ELLE] açık, bu turda görsel karar KİLİTLENMEDİ (kabul-listesi DD4) |
| 30 | img2threejs becerisi: katalog/çekim görselinden prosedürel cihaz gövdesi — editörde seçilip yerleştirilebilir katalog modeli | TÜM cihaz gövdeleri (girdi: `sales/spec sheet` ürün fotoğrafları + saha çekimleri) | görünür cihaz gövdelerinin kaliteli modeli | M | yerel beceri (oturum) | ✔ onaylandı (Salih 2026-07-21) — her cihaz turunun KOD adımında |
| 31 | Islanma alanı / splash zarfı analiz katmanı (WATERlab fikri) | satış özelliği | müşteriye "ıslanma bölgesi" gösterimi | L | https://crystalfountains.com/waterlab/ | ileride |

## E. Mimari desenler (kod değil yapı)

| # | Desen | Nereye | Kaynak | Durum |
|---|---|---|---|---|
| 32 | ASLS Studio: fixture/universe/patch modeli + cue-timeline + viewport/kontrol UI ayrımı (GPL — YALNIZ desen) | timeline/DMX fazı | https://github.com/ASLS-org/studio | ileride |
| 33 | Sequencer UX: fixture seç → track → keyframe akışı (Planet Coaster Display Sequencer) | editör | https://steamcommunity.com/workshop/filedetails/?id=957672076 | ileride |
| 34 | WET "pixelated water display" patent konsepti: jet grid = piksel ekran | besteci desen kütüphanesi | https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11813629 | ileride |

## İlk kullanım önerisi (A kolu öncelik notu)

En yüksek getiri/maliyet: **#1 HDR disiplin → #2 glow sprite → #18-20 parametrik koni →
#3-4 sis/haze → #5 Reflector kontrolü.** Hepsi S; mevcut EffectComposer+UnrealBloom+ACES
pipeline'ına dokunmadan eklenir. İkinci dalga: #8 soft particles, #7 selective bloom,
#10-11 jet gövdesi. VARIO turu KAYNAK adımında bu liste tazelenecek.
