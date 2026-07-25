# KART v2 — STARLIGHT 403

Faz 1 Task 4 (plan: `docs/superpowers/plans/2026-07-24-faz1-isik-temeli.md`).
412/412C amiral kartının (`docs/cihaz-karti-v2-aqualight.md`) kısaltılmış
kardeşi ama farklı gövde ailesinden — 406/412 halka (donut) formunda değil,
**noktasal spot** karakterinde. §5/§6 (su boyama/kamaşma) fiziği ORTAK,
burada tekrar edilmedi; §2/§3 (optik/LED) burada AYRI çünkü gövde farklı.

Veri kaynağı: **YALNIZ** `docs/referans/spec-sheet-ozeti.md` §8 (satır
325-370). Özette olmayan alan burada "PDF'te basılı değil" diye işaretlenir,
uydurulmaz.

Etiketler: ✅ spec-sheet-ozeti'nden doğrulandı · ⚠ çıkarım/tutarsızlık ·
❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Optik — 60°/10° lens ailesiyle aynı formül, farklı menzil bandı

| Mesafe (m) | Geniş lens koni çapı | Dar lens koni çapı |
|---|---|---|
| 2.5 | 2.89 | 0.43 |
| 5.0 | 5.77 | 0.87 |
| 7.5 | 8.66 | 1.31 |
| 10.0 | 11.54 | 1.74 |
| 12.5 | — | 2.18 |

Aynı 60°/10° lens ailesi (`2·d·tan(30°)` / `2·d·tan(5°)` ile tutuyor); büyük
halkaların 80 m bandına karşı küçük gövdede grafik 10-12.5 m'ye kadar
çizilmiş — gövde küçük, atılan ışık da kısa menzilli. Havada/suda ölçüm
sorusu (412 kartı S2) burada da ORTAK.

## 3. LED dizilimi — ⚠ 406/412 halka modelinden TEMELDEN FARKLI

- Spec açıkça: **"4 LED (R, G, B, W) tek gövdede — '4-IN-ONE' renk
  karışımı"**. ✅ Bu, 406/412'nin 12-LED HALKA çemberinin tam tersi: STARLIGHT
  403 **halka değil, noktasal spot**.
- Görselden: ön camda 4 lens (4-in-1 küme) görülüyor — tek merkez lens grubu,
  406/606'nın çok-LED'li halkasından farklı.
- İki fiziksel form: (1) gömme flanşlı puck (montaj delikli yuvarlak plaka),
  (2) yoke braketli yönlendirilebilir mini spot (DryDECK Option sayfasında
  mafsallı braket çizimleri).
- Spec'in kendi "Önizleme motoru notları"nda motor karşılığı zaten net:
  *"Motorda 'point glow' cihazı: tek merkezli emisyon (halka değil), Ø110
  gövde"*.

## 4. Renk ve kontrol

RGBW 4-in-1 — 412/406 ailesiyle aynı 4-kanal RGBW mantığı (hue+beyaz), genel
model 412 kartı §4 ile ORTAK. 1155 lm @ 12 W — 406C'nin ~%66'sı parlaklıkta;
intensity oranı 1155/1746 ≈ 0.66.

## 5-6. Su boyama / kamaşma

Bkz. `docs/cihaz-karti-v2-aqualight.md` §5-§6 — fizik ORTAK.

## 7. Simülatör ↔ gerçek farkları + katalog.js uyum kontrolü — ⚠⚠ EN ÇOK ÇELİŞKİLİ KART

**`studio/data/katalog.js` kaydıyla çapraz kontrol** (satır ~186-189,
`STARLIGHT 403`):

```js
{ ad: 'STARLIGHT 403', pn: 3003, arketip: 'rgb_spot', grup: 'isik',
  etiket: 'STARLIGHT 403', teknik: { guc: '9 W', lumen: 1155, renk: 'RGBW' },
  ledSayisi: 12, merkezDelik: true, lens: 60,
  not: 'küçük yıldız spot' }
```

| Alan | katalog.js | spec-sheet-ozeti §8 | Durum |
|---|---|---|---|
| `pn` | 3003 | 3012 (kendi de şüpheli, 412'yle çakışıyor) | ⚠ farklı, ikisi de belirsiz kaynaklı |
| `teknik.guc` | **'9 W'** | **12 W** | ❌ **ÇELİŞKİ** — 9 W aslında AquaLIGHT 303'ün gücü (spec §11), katalog kaydı muhtemelen 303 ile karışmış |
| `teknik.lumen` | 1155 | 1155 | ✅ uyumlu |
| `teknik.renk` | 'RGBW' | RGBW (4-in-1) | ✅ uyumlu |
| `ledSayisi` | **12** | **4** ("4 LED tek gövdede") | ❌ **ÇELİŞKİ** — katalog 406/412 halkasının 12-LED varsayımını STARLIGHT'a da uygulamış, ama spec açıkça 4 diyor |
| `merkezDelik` | **true** | tanımsız (halka modeli hiç yok — "point glow", "halka değil") | ❌ **MODEL UYUŞMAZLIĞI** — `merkezDelik` alanı 406/412 halka-disk geometrisi için var; STARLIGHT'ın noktasal spot formunda kavramsal karşılığı yok |
| `arketip` | 'rgb_spot' | — (spec: "Ø110 gövde, tek merkezli emisyon") | ⚠ aynı arketip 406/412 (halka) ile STARLIGHT'ı (nokta) TEK render yoluna sokuyor |

**En büyük bulgu:** katalog kaydındaki `guc: '9 W'` neredeyse kesin AquaLIGHT
303'ün güç değeriyle (spec §11, 9W) karışmış — 303 henüz katalogda hiç kayıtlı
değilken (bkz. `-303.md` kartı §7) bu değer buraya sızmış görünüyor. Ayrıca
`ledSayisi: 12` ve `merkezDelik: true`, motorun `rgb_spot` arketipini 406/412
ile aynı **halka-disk** geometrisiyle çiziyor olabilir — spec'in net tarifi
("4 LED, halka değil, tek merkezli emisyon, Ø110 puck/spot gövde") ile
görsel formu birbirinden ayrı iki cihaz gibi tanımlıyor.

## 8. Onay sonrası KOD planı (aşağıdaki [ELLE] onayına bağlı)

1. **`katalog.js` düzeltmesi** — `guc: '9 W'` → `'12 W'`, `ledSayisi: 12` →
   `4`, `merkezDelik: true` alanı kaldırılır veya STARLIGHT'a özgü yeni bir
   gövde-tipi alanına (`govdeTipi: 'nokta'` gibi) taşınır.
2. **Gövde/render** — `rgb_spot` arketipi iki alt-forma ayrılabilir: halka
   (406/412 ailesi) ve nokta/puck (STARLIGHT 403 + AquaLIGHT 303, aynı
   Ø110×62 gövde ailesi — bkz. `-303.md` kartı §1).
3. **`pn` alanı** — spec-sheet-ozeti'nin kendi şüphesi nedeniyle sahadan
   doğrulanmadan sipariş kodunda kullanılmamalı.

---

## [ELLE] onay kapısı

- [ ] **S-403-1 güç değeri düzeltmesi** — katalog.js'teki `guc: '9 W'` yanlış
  görünüyor (spec 12 W diyor, AquaLIGHT 303'ün 9 W'ıyla karışmış olabilir).
  Düzeltilsin mi? Varsayılan: evet, 12 W'a çekerim. **[ELLE — Salih]**
- [ ] **S-403-2 LED sayısı ve gövde formu** — STARLIGHT 403'ün 406/412 gibi
  12-LED halka mı, yoksa spec'in dediği gibi 4-LED noktasal küme mi olduğunu
  doğrular mısın? Bu render'da halka mı puck mı çizileceğini belirliyor.
  Varsayılan: spec'e uyarım (4 LED, halka DEĞİL, `merkezDelik` alanı
  kaldırılır). **[ELLE — Salih]**
- [ ] **S-403-3 model adı** — kart panelinde/palette hangi isim görünsün,
  "STARLIGHT 403" mü "AquaLIGHT 403" mü (PDF'in kendisi ikisini de aynı ürün
  için kullanıyor)? Varsayılan: kapak markası "STARLIGHT 403" kalır (katalog
  zaten öyle), teknik tablodaki "AquaLIGHT 403" adı yalnız kart notunda anılır.
  **[ELLE — Salih]**
