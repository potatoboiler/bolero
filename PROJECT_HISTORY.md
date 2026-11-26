# Project History & Architecture Notes

*(Manual context document—not auto-loaded by agent tools. Read on demand when picking up work on `bolero`.)*

---

## 1. Core Constraints & Goals

* **100% in-browser static app:** Vite + Preact + TypeScript + `@strudel/web`, built to `dist/` and deployed to `gh-pages` (`base: './'` in `vite.config.ts`). **No desktop processes, no external DAW, and no local OSC bridge.**
* **Single clock / automatic sync:** Strudel owns the single timeline (`AudioContext.currentTime`) for all layers (`stack(snare, accompaniment, melody)` in `src/bolero.tsx`). Every custom or optional synth must run on Strudel's `AudioContext` (via `registerSound(...)`) so backtrack and synths stay locked with zero drift and no manual sync button.
* **Goal:** Insert arbitrary, optional/lazy-loadable synthesizers (including procedurally generated sounds) into this project so phrases of *Boléro* can be driven by pluggable synth backends controlled by Strudel pattern parameters.

---

## 2. Dependency Update & TypeScript 7 Migration (2026-11-25)

### Updated Packages (`package.json`)
* `preact`: `^10.29.1` → `^11.2.0`
* `preact-iso`: `^2.11.1` → `^2.12.2`
* `preact-render-to-string`: `^6.6.7` → `^6.8.3`
* `@preact/preset-vite`: `^2.10.5` → `^2.10.6`
* `typescript`: `^6.0.3` → `^7.0.2`
* `vite`: `^8.0.9` → `^8.3.8`
* `eslint`: `^9.39.4` → `^9.39.5` *(held on v9 because `eslint-config-preact@2.0.0` peer-requires `eslint ^8.57.1 || ^9.0.0`)*
* `@strudel/web` (`^1.3.0`) and `patch-package` (`^8.0.1`) were already at latest.

### Fixes Applied
* **`tsconfig.json`**: Narrowed `include` to `src/**/*` and `vite.config.ts` and added `exclude: ["dist", "node_modules"]`. Previously `"**/*"` with `checkJs: true` caused `tsc` to hang typechecking the minified `dist/` bundle.
* **`src/types.d.ts`**: Added compile-time ambient declarations for `@strudel/web` (`TS7016`) and `*.css` (`TS2882`, enforced by TS 7 on side-effect imports like `import './style.css'`). Emits no runtime JS.
* **`src/index.tsx`**: Added explicit parameter types for `Resource` and `prerender`, and added a null check on `document.getElementById('app')` before calling `hydrate`.

### Benchmark (`tsc --noEmit`, 3-run average)
* TypeScript `6.0.3`: `~0.49s`
* TypeScript `7.0.2`: `~0.09s` (~5.4× faster)
* `npm run build` (`vite build`): `~280ms` (unchanged; Vite does not invoke `tsc`).

### Known Follow-ups / Unverified Items
* **Preact 10 → 11:** Production build passes, but runtime hydration and Strudel audio playback have not yet been verified in a live browser.
* **ESLint:** `npx eslint src` still fails because ESLint 9+ requires a flat `eslint.config.js` rather than `"eslintConfig"` in `package.json`.
* **Duplicate `initStrudel()`:** Called in both `src/index.tsx` and `src/bolero.tsx` (left untouched to avoid changing existing runtime behavior).

---

## 3. Synth Engine Research (100% Browser)

### Why Native VSTs Are Out
* VST2/VST3 plugins are native C++ binaries (`.vst3`, `.dll`, `.so`) and cannot run inside the browser sandbox (even with WASM `scsynth`).

### Hosting & Lazy-Loading WASM / Synth Assets on `gh-pages`
* Put raw `.wasm`, worklet, or precompiled synth files in `public/` (copied verbatim into `dist/`; relative `./` fetches work with `base: './'`), or use dynamic `import()` / Vite `?url` imports so Vite code-splits them into on-demand chunks.
* **Prefer single-threaded `AudioWorklet` WASM over `SharedArrayBuffer` multi-threaded WASM:**
  * Single-threaded `AudioWorklet` still runs on a dedicated real-time audio thread off the UI thread (no DOM/UI lag; sample-accurate `AudioParam`s; Strudel lookahead scheduling absorbs `postMessage` latency).
  * Multi-threaded WASM (`SharedArrayBuffer`) requires `Cross-Origin-Opener-Policy: same-origin` (`COOP`) and `Cross-Origin-Embedder-Policy: require-corp` (`COEP`) HTTP headers, which GitHub Pages does not serve natively and which can block cross-origin sample fetches (e.g., `strudel.json` GitHub raw URLs).

### Engine Comparison
| Engine | Strengths | Tradeoffs |
| :--- | :--- | :--- |
| **Custom `AudioWorklet` (TS or Rust/C++/Faust WASM) + Web Audio `PeriodicWave`** | Tiny bundle, zero `COOP`/`COEP` friction, direct TS/WASM DSP math and `AudioParam`s | You write/import DSP primitives yourself |
| **`@strudel/csound` (Csound WASM)** | Turing-complete, 1,500+ opcodes (additive, FM, physical modeling, granular, `pvs*` spectral/FFT, `ksmps=1`), bundles compiler + engine (`compileOrc`) for live runtime instrument generation, first-party Strudel integration, works single-threaded | Larger lazy-loaded WASM (~2–4 MB); `.orc` DSL |
| **WASM `scsynth` (`sc.wasm` / SuperSonic)** | Dynamic live node tree (Groups/Synths/Buses) | Cannot compile `SynthDef`s in-browser without `sclang`; threaded builds need `COOP`/`COEP` |

### Live Modular Graph Abstraction Over Csound
* Csound can match `scsynth`'s live modular routing in-browser via:
  1. **TypeScript Graph AST → `csound.compileOrc(...)`**: Topologically sort a typed synth/effect DAG (`series`, `parallel`, `modulate`) and hot-compile new `instr` definitions at runtime.
  2. **Runtime buses (`chnmix`/`chnget`/`chnclear` or `connect`/`inleta`/`outleta`)**: Bucket instrument numbers by topological stage (e.g., `100–199` sources → `200–299` effects → `300+` master) since Csound executes active instruments in ascending instrument-number order.

---

## 4. Procedural / Ad-Hoc Sound Generation Ideas

* **Overtone series / additive synthesis:** Web Audio `ctx.createPeriodicWave(real, imag)` with $1/k^{\alpha}$ spectral roll-off ($\alpha \in [1, 2.5]$), per-partial decay (high partials dying faster), and slight inharmonic stretching ($f_k = k f_0 \sqrt{1 + B k^2}$).
* **Procedural spectrograms:** Rather than baking a buffer and pitch-shifting via `playbackRate` (which stretches time/transients), convert spectrogram slices into a **wavetable stack** (16–64 single-cycle frames) and scrub through them over each note's lifetime at exact `value.freq`.
* **Other high-leverage procedural generators:** Modal resonator banks (filtered noise into parallel tuned bandpass filters), Karplus-Strong waveguides (plucked strings), and randomized 2–3 operator FM with enveloped modulation index.

### Planned Pluggable Interface (`src/synths/`)
```ts
export interface SynthPlugin {
  name: string;
  load(): Promise<void>; // lazy-load WASM, addModule(), init Csound, etc.
  trigger(time: number, value: Record<string, any>, onended: () => void): {
    node: AudioNode;
    stop: (stopTime: number) => void;
  };
}
```
Each plugin registers with Strudel via `registerSound(...)` on `getAudioContext()`, allowing any phrase in `src/bolero.tsx` to swap synths cleanly via `.sound("...")`.

---

## 5. Csound Integration & Procedural Patch Generator (2026-11-26)

### Implemented Architecture (`src/synths/`)
* **Dependencies:** Added `@csound/browser` (`^7.0.0`, lazy-loaded into `dist/assets/csound-*.js` via dynamic `import()`) and updated `vite` to `^8.4.0`.
* **`src/synths/types.ts`:** `SynthPlugin` interface with `routing: 'sample' | 'per-voice' | 'persistent-engine'`, optional `applyToPattern(pattern)`, optional `trigger(ctx, time, value, onended, duration)`, optional `updateSource(source)`, and `[Symbol.asyncDispose]()` (`"ESNext.Disposable"` enabled in `tsconfig.json`).
* **`src/synths/index.ts`:** Replaced `SynthRegistry` with a `const synths = { nee: neeSynth, csound: csoundSynth }` map (`SynthId`, `DEFAULT_SYNTH = 'nee'`), single-map memoized `loadSynth(id)` (with `try / catch` eviction), and `registerSynth` / `registerBuiltInSynths()`.
* **`src/synths/csound.ts`:** Single-threaded `AudioWorklet` Csound backend (`useWorker: false`, no `COOP`/`COEP` needed for `gh-pages`), scheduling notes via `inputMessage` and hot-compiling `.orc` updates via `compileOrc`.
* **`src/synths/csound-generator.ts`:** Generates random, `tanh`-limited Csound 7 instruments across 4 synthesis families: Subtractive (`vco2` + `moogladder`), FM (`foscili`), Additive (`poscil` overtone bank), and Modal/Pluck (`mode` + `pluck`).
* **`src/bolero.tsx`:** Unified melody synth dropdown (`synths`), `melodyCycle` hap tagging (`MELODY_CYCLES = 27` via `withHap`) to auto-randomize Csound on every full *Boléro* melody repeat, patch description readout, and **New Random Sound** button.

### Punted to Branch `synth-sketches` (`2ce8225`)
* `src/synths/overtone.ts`, `src/synths/worklet-wavetable.ts`, `src/synths/scsynth-wasm.ts`, `src/synths/modal-resonator.ts` were committed to branch `synth-sketches` to keep `main` minimal.

### Cleanup Backlog
* Verify live-browser audio playback and Preact 11 hydration (only `tsc --noEmit` and `vite build` have been run so far).
* Decouple Csound-specific UI/subscription logic (`csoundSynth.onPatchChange`, `randomizePatch`, `melodyCycle` tagging) out of `src/bolero.tsx` if generalizing to more synths.
* Remove duplicate `initStrudel()` call (currently in both `src/index.tsx` and `src/bolero.tsx`).
* Migrate `package.json` `"eslintConfig"` to a flat `eslint.config.js` so `npx eslint src` works with ESLint 9.
* Decide whether to merge, expand, or drop the `synth-sketches` branch.

