# Açık Kaynak Desen Envanteri — Salih'in repo listesi (2026-07-17)

Tetik: Salih xLights/Vixen/QLC+/Chataigne/LedFx/UE-DMX/blender-dmx listesi verdi,
"buralara bir bak, ileri seviye istiyorum". Araştırma ajanı taradı; kod DEĞİL desen
alındı (clean-room: xLights/QLC+ GPL — kod kopyalanamaz, desen serbest).

## Faz eşlemesi (bizim yol haritasına)

| Kaynak | Bize öğrettiği desen | Faz |
|---|---|---|
| xLights | Efekt = cihaz-bağımsız buffer + mapping; timing track (beat işaretleri ayrı katman, efekt snap'lenir); editör formatı ≠ derlenmiş playback formatı (xsq/fseq) | (b) timeline, (d) DMX |
| Vixen | Elements (mantıksal) / Controllers (fiziksel) / Patching (bağ) üç katmanı; Filter zinciri (element→çıkış dönüşümü) | (b)+(d) |
| QLC+ | Fixture tanımı: Channels (değer aralığı→yetenek), Modes (8ch/20ch varyant), Heads (412C = çok-head tek fixture); engine/plugins ayrığı — çıkış protokolü eklenti | (d); katalog şeması (b) |
| Chataigne | Her şey Module + Router/Mapping; "AquaJET.intensity" BİR kez tanımlanır → hem önizleme hem Art-Net tüketir (iki kod yolu DEĞİL) | (d) omurga |
| LedFx | FFT → mel filterbank → lows/mids/highs; **ExpFilter asimetrik yumuşatma** (hızlı fırla / yavaş sön) — su/ışık hissinin sırrı; özellik çıkarımı ↔ efekt ayrığı | (c) besteci |
| UE DMX+Niagara | Ham DMX → normalize semantik attribute (0-1) → parçacık User Parameter; parçacık DMX'ten habersiz; 8/16-bit fine channel (ROBO pan/tilt için not) | (a)↔(d) köprü |
| blender-dmx | GDTF (kanal→özellik semantiği) + MVR (3D yerleşim alışverişi) endüstri standartları; "önizleyici = DMX tüketicisi" modu | (d), ileride (b) |

## Somut alınacaklar (öncelik sırasıyla)

1. **ŞİMDİ (v4 F1)**: planar reflection (Reflector) + Fresnel + normal-map
   distorsiyon + glint — su yüzeyi. SSR ve Gerstner/FFT okyanusu GEREKSİZ
   (havuz düzlemsel; ajanın teknik özeti planı doğruladı).
2. **v4 sonrası**: çarpma olayı zaten sesi tetikliyor → aynı olay halka dalgacık
   (ripple) tetiklemeli; taban caustics zaten var (IsikGolu).
3. **Besteci v4 (c)**: mel-bantlama + ExpFilter (alpha_rise/alpha_decay) — jet
   yüksekliği=lows, ışık=highs, SWITCH=onset. Web Audio'ya eksik iki parça.
4. **Timeline (b)**: besteci çıktısını xLights tarzı "timing track" olarak ayrı
   katman yap — efektler beat hücrelerine snap'lenir.
5. **DMX çıkışı (d), ileride**: katalog.js'e şimdiden `dmx: { mode, kanallar }`
   alanı düşünülmeli (QLC+ QXF / GDTF semantiği); önizleme+DMX aynı semantik
   attribute akışının iki tüketicisi olacak (Chataigne/Niagara deseni).

Kaynak linkleri ajan raporunda; rapor tamamı bu dosyanın git blame eşleniği
commit mesajında değil — gerekirse yeniden üretilir, desen özü yukarıda.
