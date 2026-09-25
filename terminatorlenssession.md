# Terminator New Lens — Enhancement Session

**Project:** Terminator New Lens  
**Repository:** `ingenuousmorpheus/Terminator-New-Lens`  
**Status:** Existing cinematic machine-vision HUD; enhancement plan only  
**Primary goal:** Preserve the strong Terminator-style visual experience while turning the underlying lens system into a modular, privacy-aware AR/computer-vision platform for AI Cosplay and future useful lens modes.

---

## 0. What Exists Now

Current app is Vite + React + TypeScript with:

- live camera feed;
- TensorFlow.js + COCO-SSD object detection;
- red cinematic HUD;
- animated scan line / grid / boot sequence / glitches;
- bounding boxes for detected objects;
- person-triggered AI analysis;
- two vision providers:
  - Gemini;
  - local LM Studio vision model;
- persisted provider/model/endpoint settings;
- classic response-selection UI;
- current “threat level” display;
- return link to AI Cosplay Gen;
- custom project branding/logo.

Important files:

- `src/components/TerminatorVision.tsx`
- `src/services/geminiService.ts`
- `src/services/lmStudioService.ts`
- `src/constants.ts`
- `src/types.ts`
- `src/App.tsx`
- `vite.config.ts`

---

## 1. What Is Already Strong

Preserve:

1. **The HUD identity.** It has a recognizable, fun visual personality and works well as an AI Cosplay experience.
2. **Local LM Studio mode.** This is the most strategically valuable technical feature because it enables private/local vision.
3. **Local object detection before LLM analysis.** COCO-SSD provides a useful fast perception layer.
4. **Provider abstraction.** Gemini vs LM Studio is already the start of a modular vision stack.
5. **Settings persistence.** The user does not have to reconfigure the local endpoint every session.
6. **Camera-first interaction.** The lens feels like an actual visual device rather than a normal chatbot.

---

## 2. Main Problems To Fix

### A. Gemini API key is bundled into frontend code

`vite.config.ts` injects `GEMINI_API_KEY` into the browser.

That is not appropriate for a public deployment.

Production Gemini calls should go through a protected backend/proxy. Local LM Studio can remain direct from the user's browser when intentionally configured.

### B. The app presents unreliable person estimates as facts

Current analysis asks for:

- age;
- weight;
- height;
- race;
- mood;
- hair color;
- shirt color.

Several of these cannot be reliably determined from one camera image, and race/ethnicity is a sensitive attribute.

For a public AI Cosplay product, replace this with safer observable/fun scan fields.

Recommended real fields:

- detected objects;
- visible clothing colors;
- pose/activity;
- approximate object location;
- OCR text;
- scene description;
- accessories;
- optional facial-expression description with uncertainty.

Do **not** infer race/ethnicity.

Do not present estimated height/weight as measurements unless there is real calibrated geometry.

### C. “Threat level” currently derives from inferred mood

The code maps words such as angry/hostile to an elevated threat rating.

That should not be presented as a real safety assessment.

Better choices:

- make **CINEMATIC THREAT LEVEL** explicitly fictional/randomized;
- derive it from a user-selected cosplay scenario;
- or replace it with a neutral scan status such as:
  - target tracked;
  - motion level;
  - object count;
  - scene activity.

Never imply the camera can determine whether a person is dangerous from appearance/expression.

### D. Cloud analysis can happen automatically

When COCO detects a person, the app automatically invokes the configured vision provider.

In Gemini mode, this can send camera frames off-device without a deliberate scan press for each target.

Add:
- explicit Cloud Scan consent;
- visible “frame sent to cloud” indicator;
- cooldown/rate limit;
- privacy explanation;
- local-first default where practical.

### E. Object detection loop is too aggressive

`model.detect(video)` is scheduled through `requestAnimationFrame`.

On phones, this can waste CPU/GPU/battery.

Throttle detection to a configurable rate, e.g. 5–10 FPS or adaptive performance.

### F. External global ML scripts

TensorFlow.js and COCO-SSD are loaded through CDN globals in `index.html`.

For a more maintainable production build:
- install/import versioned packages;
- lazy-load the detector;
- cache model assets;
- handle offline/PWA mode.

### G. No tests / performance gates

There are no visible test suites for:
- provider parsing;
- camera state;
- object-coordinate mapping;
- analysis cooldown;
- local endpoint behavior;
- privacy state;
- mobile performance.

### H. Dependencies suggest an unfinished backend

`express`, `dotenv`, and `better-sqlite3` are in `package.json`, but the current checked-in app is frontend-centric.

Either:
- remove unused packages;
- or intentionally build a backend if the app needs cloud API proxying/history/accounts.

### I. Public/commercial branding should be reviewed

The experience intentionally references Terminator/T-800/Cyberdyne/Skynet and includes recognizable movie dialogue.

For a public/commercial AI Cosplay product, preserve the fan/cosplay inspiration carefully and review branding/licensing before monetization. A future generic “Tactical Lens” skin could provide the same technology without depending on one franchise identity.

---

# ENHANCEMENT ROADMAP

## TL-00 — Preserve + Characterize

Before changing the experience:

- preserve current HUD behavior;
- capture desktop/mobile screenshots;
- record current object-detection FPS;
- record Gemini and LM Studio latency;
- test camera permission flows;
- record current bundle size;
- add minimal tests;
- do not redesign the HUD yet.

**Gate:** current visual experience is reproducible and performance is measured.

---

## TL-01 — Privacy + Security Pass

Tasks:

- remove cloud API key from browser bundle;
- add protected backend/proxy for Gemini;
- add explicit cloud-processing indicator;
- add first-use consent text;
- add per-provider privacy label:
  - LOCAL — frame stays on device/network;
  - CLOUD — selected frame sent to Gemini;
- never persist captured frames by default;
- throttle cloud calls;
- sanitize configurable endpoints.

**Gate:** public browser source contains no secret API credential.

---

## TL-02 — Safe Scan Schema

Replace the current person schema with an observable scan schema.

Example:

```json
{
  "objects": ["person", "chair"],
  "clothing": ["black shirt"],
  "accessories": ["glasses"],
  "activity": "standing",
  "expression": "smiling",
  "scene": "indoor room",
  "visible_text": [],
  "confidence": {}
}
```

Remove race/ethnicity inference.

Move height/weight to future calibrated measurement modules only.

Rename `MOOD` to a narrower visible-expression field if retained.

**Gate:** no sensitive demographic guess is presented as a scan result.

---

## TL-03 — Cinematic vs Utility Modes

Split the product into clear modes:

### CINEMATIC
- movie-style HUD;
- fictional system messages;
- optional fictional threat meter;
- dialogue response menu;
- glitch effects;
- AI Cosplay presentation.

### UTILITY
- accurate object detection;
- OCR;
- color detection;
- angle measurement;
- calibrated measurement tools;
- no fictional claims.

This lets AI Cosplay stay fun while real tools stay trustworthy.

**Gate:** the UI makes it obvious which data is entertainment and which data is an actual measurement/detection.

---

## TL-04 — Perception Runtime

Create one reusable perception loop:

```text
camera
↓
frame scheduler
↓
fast local detectors
↓
scene state
↓
optional AI enrichment
↓
HUD render
```

Add:

- adaptive 5–10 FPS object detection;
- one shared frame capture service;
- provider cooldown;
- cancellation when tab is hidden;
- battery/performance mode;
- lazy model loading.

**Gate:** mobile device remains responsive and does not run full inference at display refresh rate.

---

## TL-05 — Lens Plugin Architecture

Turn features into modes/plugins rather than one giant component.

Suggested structure:

```text
src/lens/
  runtime.ts
  frameScheduler.ts
  overlays/
  modes/
    cinematic/
    objects/
    angle/
    ocr/
    color/
    local-ai/
```

Each mode declares:

- required sensors/models;
- processing cadence;
- overlay output;
- settings;
- privacy level.

**Gate:** a new lens mode can be added without editing the central camera loop heavily.

---

## TL-06 — Angle Finder Mode

Integrate the geometry engine from `angle-detector`.

HUD concept:

```text
ANGLE MODE

      edge A
        \
         ● 47.3°
          \
           edge B

[LOCK] [RESET] [AUTO]
```

Preserve the actual angle math in Angle Detector as source of truth; do not duplicate it in this repo.

Support:
- manual 3-point;
- automatic edge mode;
- apparent vs corrected angle label;
- stability/confidence.

**Gate:** Terminator Lens can call the shared angle module and match Angle Detector results on the same fixture.

---

## TL-07 — OCR / Information Mode

Add local-first OCR where practical.

Possible use:
- signs;
- labels;
- serial text;
- screens;
- packaging.

Overlay detected text in the HUD.

Future optional integration:
- Braided Language translation layer can translate visible text.

**Gate:** OCR is independent of the cinematic person scan.

---

## TL-08 — Scene Memory (Session-Only First)

Allow the lens to remember short-lived scene facts:

```text
14:32 — detected chair
14:33 — black backpack entered frame
14:34 — angle measurement locked: 42.1°
```

Default:
- memory lives only in the browser session;
- no raw image retention.

Future opt-in:
- save snapshots/measurements locally.

**Gate:** nothing is uploaded or stored long-term without explicit user action.

---

## TL-09 — Local AI First-Class Mode

Strengthen LM Studio:

- health check;
- model capability test;
- automatic loaded-model discovery;
- vision-capability warning;
- timeout/cancellation;
- structured-schema adapter;
- latency display;
- graceful fallback to fast local detectors.

Do not assume a model name guarantees vision support.

**Gate:** local mode can run the core experience without Gemini.

---

## TL-10 — PWA / Phone Install

Make the AI Cosplay lens installable:

- web app manifest;
- icons;
- service worker;
- cached shell;
- offline cinematic/object modes;
- camera permission onboarding;
- orientation support;
- full-screen immersive mode.

**Gate:** user can install it on Android and launch it like an app.

---

## TL-11 — AR Anchoring

Move overlays from simple screen coordinates toward world/plane tracking where hardware/browser support allows.

Targets:

- persistent labels attached to objects;
- tracked angle vertices;
- world-space measurement;
- device orientation;
- native ARCore path if browser APIs are insufficient.

Keep a browser fallback.

**Gate:** overlay remains attached to a target through modest camera motion.

---

## TL-12 — AI Cosplay Product Integration

Replace the hardcoded return dependency with configuration:

```text
VITE_PARENT_APP_URL
VITE_LENS_SKIN
VITE_PUBLIC_MODE
```

Allow AI Cosplay to launch the lens with a chosen skin/mode.

Possible future skins:
- Terminator-inspired;
- generic tactical;
- sci-fi scanner;
- custom user skins.

**Gate:** deployment does not require editing source code to change the parent website URL.

---

## TL-13 — Future Shared Vision Platform

Optional future reuse with the user's other systems:

```text
camera runtime
├─ AI Cosplay lens
├─ Angle Finder
├─ Braided Language camera translation
└─ Lana AR perception
```

Share low-level perception modules; keep product-specific identity and data boundaries separate.

This should happen only after the individual products are stable.

---

---

## TL-14 — AR Glasses / Lens OS

The long-term wearable plan is now documented in `docs/AR_GLASSES_ROADMAP.md`.

Target shell:

```text
LENS OS
├─ CINEMATIC
├─ OBJECTS
├─ ANGLE
├─ OCR
├─ TRANSLATE
├─ SCENE MEMORY
└─ LANA
```

Terminator New Lens owns the camera/HUD/lens runtime. Angle Detector remains source of truth for measurement geometry, Braided Language supplies translation, and Lana OS Link provides the optional assistant/reasoning layer.

**Gate:** when glasses hardware is acquired, integrate its SDK through the shared device abstraction rather than redesigning the project around one vendor.

# Recommended Order

1. TL-00 baseline.
2. TL-01 privacy/security.
3. TL-02 safe scan schema.
4. TL-04 perception runtime.
5. TL-03 cinematic vs utility modes.
6. TL-05 plugin architecture.
7. TL-06 angle mode.
8. TL-09 stronger local AI.
9. TL-07 OCR.
10. TL-10 PWA.
11. TL-11 AR anchoring.
12. TL-12 AI Cosplay integration cleanup.
13. TL-13 shared platform later.

---

# Do Not Redo

- Keep the current red HUD visual language unless intentionally designing a new skin.
- Keep the provider abstraction.
- Keep LM Studio support.
- Keep fast local object detection.
- Do not rewrite the project just to add backend security.
- Do not merge entertainment “threat” behavior with real safety assessment.
- Do not duplicate Angle Detector geometry.

---

# Core Invariant

**Cinematic mode may pretend to be a sci-fi machine. Utility mode must tell the truth.**

Enhance what exists instead of replacing the current personality of the app.
