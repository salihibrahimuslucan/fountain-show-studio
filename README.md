# Show Studio

### ▶ [Live demo](https://salihibrahimuslucan.github.io/fountain-show-studio/)

Browser-based **preview engine for musical fountain shows**. Load a site plan, place real
fountain hardware on it, choreograph the show against music, play it back in 3D, and export
a branded video for the customer — all in a static web page, no install, no GPU workstation.

Built with three.js / WebGL2. No framework, no build step, no CDN — vendor libraries are
local and the whole thing is served as static files.

> Why this exists: in the fountain industry, customers buy from drawings and contracts.
> They don't get to see their fountain until it is built. Commercial show-design suites can
> render this beautifully, but they cost thousands of euros, need a strong GPU, and are aimed
> at the programming phase — not the *quote* phase. Show Studio targets that gap: a fast,
> believable preview a salesperson can send during a proposal.

---

## What it does

**Site & layout**
- Import the customer's real plan — DXF or PNG — and drop devices onto it by click
- Streaming DXF parser in a Web Worker: 2 MB+ files parse without freezing the UI, with
  progress reporting and a part budget; oversized files are rejected with a clear message
  instead of killing the tab

**Devices (modelled from real catalogue hardware)**
- Jets and nozzles with per-device ballistics, flow, and footprint
- 2-axis movable, DMX-controlled heads
- Fast on/off switching devices for staccato patterns
- Ring-mounted under-nozzle LEDs — light enters the water column from inside and casts a
  caustic pool on the floor, rather than the theatrical-spotlight approximation most
  simulators use
- RGBW+ mixing where the white channel screens over the hue instead of washing it out

**Show**
- Timeline with device channels (DMX-like cue model), transport with scrubbing and seeking
- Music analysis: FFT-based BPM grid, frequency bands, section detection
- Choreography generator (`besteci`) that turns an audio track into device patterns
- Effect layers: droplet clusters, foam rings, underwater light pools, volumetric beams,
  laminar thickness profiles
- Five environment presets and procedural water audio (no sample files required)

**Output**
- Live 3D playback with a camera rig built for presentation framing
- Branded `.webm` export to send to the customer
- Shows save/load as a portable JSON format (`.aqshow`)

---

## Architecture

```
studio/
  js/          ~30 modules, ~9.7k lines — engine, no framework
    motor.js       render loop and scene graph
    balistik.js    jet trajectory / particle ballistics
    isik-borusu.js under-nozzle ring light + caustics
    dxf.js         DXF parsing (+ dxf.worker.js for large files)
    besteci.js     music → choreography
    ses.js         FFT analysis, BPM grid, band split
    timeline.js    cue model and playback
    kayit.js       webm capture
  data/        device catalogue (specs drive the simulation, not hand-tuned constants)
  vendor/      three.js, local
test/          ~20 suites — ballistics, colour mixing, choreography, endurance, DXF
tools/         build, smoke tests, screenshot/pixel-diff harness
ders/          10-part walkthrough of how the engine works
docs/          device cards + technical research notes (Turkish)
```

The central design decision was to fix **one timeline JSON format on day one** — device
channel + time + value — so the choreography generator and the 3D stage stay decoupled.
Either half can be replaced without touching the other.

Rendering fidelity is gated by tests rather than by eye: `tools/piksel-kapisi.py` does
pixel-diff comparisons between runs so visual regressions fail loudly.

---

## Running it

```bash
# any static file server works
./tools/sunucu.cmd          # Windows
python -m http.server -d studio 8080

# build the deployable bundle
./tools/build.sh            # → dist/

# tests — 522 passing
node --test test/*.mjs

# full verification: tests + headless smoke frames + pixel gate + build
bash tools/saglik.sh
```

No dependencies to install. Open `studio/index.html` through a server (not `file://`, the
worker and audio need an origin).

---

## Status

Working, actively developed. Device families, light model, and the choreography generator
are implemented and under test; fidelity work is ongoing against real hardware behaviour.

Not a Depence²/Lumeo competitor — those are production show-programming suites. This is the
proposal-stage preview that comes before them.

---

## Author

Salih İbrahim Uslucan — automation & software engineer working in musical fountains and
interactive water features. CAD/DXF automation, industrial control, and the simulation side
of show design.

- [github.com/salihibrahimuslucan](https://github.com/salihibrahimuslucan)
- [n8n-nodes-spec2schematic](https://www.npmjs.com/package/n8n-nodes-spec2schematic) — spec → schematic, published on npm

## License

MIT — see [LICENSE](LICENSE).

Device names and product families referenced in `data/` and `docs/` belong to their
respective manufacturer and are used here to model real hardware behaviour.
