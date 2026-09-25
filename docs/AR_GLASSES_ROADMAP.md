# AR Glasses / Lens OS Roadmap

**Host project:** Terminator New Lens  
**Purpose:** Evolve the existing camera HUD into a modular AR glasses shell that can load useful lenses while preserving a cinematic mode.

## Vision

The glasses experience should feel like a persistent augmented layer over the real world:

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

The shell owns camera/sensors, overlays, permissions, performance, and mode switching. Individual projects remain their own sources of truth.

## Product rule

**Cinematic modes can be fictional. Utility modes must be evidence-based and honest about uncertainty.**

## Cross-project sources of truth

- **Terminator New Lens:** camera runtime, HUD, lens switching, AR anchoring.
- **Angle Detector:** all angle geometry/calibration.
- **Braided Language:** speech/text/visible-text translation.
- **Lana OS Link:** assistant identity, reasoning, permissions, memory, and user interaction.

Do not copy each project's core logic into this repo. Integrate through stable interfaces.

---

## AR-00 — Device Abstraction

Create a hardware-neutral sensor contract:

```ts
interface LensSensors {
  cameraFrame(): Promise<Frame>;
  orientation(): Orientation;
  depth?(): DepthFrame;
  gaze?(): GazeRay;
  microphone?(): AudioStream;
  displayCapabilities(): DisplayCaps;
}
```

Support three tiers:

1. phone camera / browser fallback;
2. Android phone + companion glasses;
3. native AR glasses with camera/IMU/depth/display APIs.

**Gate:** the same lens mode can run in phone fallback without assuming a specific glasses brand.

---

## AR-01 — Lens Runtime

Create one runtime that schedules perception without overloading the device.

Responsibilities:

- frame scheduler;
- sensor synchronization;
- mode lifecycle;
- permission broker;
- local/cloud provider routing;
- overlay compositor;
- thermal/battery performance modes;
- privacy indicators.

Lens manifest example:

```json
{
  "id": "angle",
  "requires": ["camera"],
  "optional": ["imu", "depth"],
  "cadence_hz": 10,
  "privacy": "local",
  "overlay": "world"
}
```

**Gate:** mode switching does not restart the whole camera stack.

---

## AR-02 — Object Lens

Use fast local object detection for:

- object labels;
- confidence;
- tracking IDs;
- persistent anchors;
- optional AI description on demand.

Do not send every frame to a cloud LLM.

**Gate:** tracked labels remain stable through ordinary head movement.

---

## AR-03 — Angle Lens

Consume Angle Detector as the measurement source of truth.

Functions:

- manual three-point measurement;
- automatic edge lock;
- stability indicator;
- apparent vs corrected/world-space angle;
- lock/save measurement;
- optional spoken readout.

```text
edge A
   \
    ● 47.3°
     \
      edge B
```

**Gate:** glasses result matches the validated Angle Detector engine on the same fixture.

---

## AR-04 — OCR Lens

Local-first visible text detection:

- signs;
- labels;
- instructions;
- screens;
- serial numbers.

Output becomes an input to Translate Lens.

**Gate:** OCR result includes screen/world coordinates and confidence.

---

## AR-05 — Translate Lens

Braided Language supplies translation.

Pipeline:

```text
microphone OR OCR
↓
language detection
↓
Braided Language
↓
translated speech/text
↓
AR subtitle anchored near source
```

Modes:

- live spoken subtitles;
- visible-text translation;
- conversation mode;
- transliteration;
- offline language packs where supported.

**Gate:** translation can be disabled independently and clearly indicates local vs cloud processing.

---

## AR-06 — Scene Memory

Short-lived contextual memory for useful continuity:

```text
10:22 — workstation label read
10:23 — angle locked at 42.1°
10:24 — Spanish instruction translated
```

Defaults:

- session-only;
- no raw frame retention;
- explicit opt-in to save photos/measurements;
- sensitive data stays local.

**Gate:** memory can be cleared instantly and is not required for basic lens operation.

---

## AR-07 — Lana Lens

Lana becomes the optional reasoning/interaction layer above the lenses.

Lana may receive structured events:

```json
{
  "type": "angle_measurement",
  "value_deg": 42.1,
  "confidence": 0.94,
  "mode": "plane_corrected"
}
```

or:

```json
{
  "type": "translated_text",
  "source": "es",
  "target": "en",
  "text": "..."
}
```

Lana should not need raw video continuously when structured perception is enough.

Capabilities:

- explain what the lens detected;
- switch modes with permission;
- remember selected useful events;
- warn when a measurement is unstable;
- combine OCR + translation + object context;
- optionally speak through earbuds/glasses audio.

**Gate:** Lana can assist without gaining unrestricted sensor/tool access.

---

## AR-08 — Voice + Hands-Free Control

Commands:

- "angle mode"
- "translate that"
- "read that sign"
- "lock measurement"
- "what am I looking at?"
- "remember this"
- "clear scene memory"

Include push-to-talk or wake control depending hardware/privacy.

**Gate:** critical actions require clear confirmation where appropriate.

---

## AR-09 — World Anchoring

When hardware supports it:

- plane tracking;
- persistent world anchors;
- depth;
- occlusion;
- head pose;
- optional gaze ray.

Phone fallback uses screen-space overlays.

**Gate:** labels/measurements stay attached through normal head motion.

---

## AR-10 — Performance Tiers

### LIGHT
- object detection;
- OCR;
- angle math;
- no large model.

### STANDARD
- local small vision model;
- Braided offline translation;
- Lana via nearby PC/phone.

### FULL
- depth/world anchoring;
- larger local/network model;
- richer Lana scene reasoning.

The glasses should never require the heaviest tier just to function.

---

## AR-11 — Compute Topology

Preferred architecture:

```text
AR GLASSES
camera / display / IMU
      ↓
PHONE COMPANION
fast CV / audio / networking
      ↓
PRIVATE COMPUTE
Lana / larger models / optional heavy inference
```

Keep public/cloud services optional.

This prevents the glasses from needing workstation-class hardware and avoids overloading the primary development PC.

---

## AR-12 — Safety / Privacy

Hard requirements:

- visible camera/recording state;
- explicit local/cloud indicator;
- no hidden face identification;
- no sensitive demographic inference;
- no real-world threat classification from appearance;
- no raw-frame retention by default;
- permission-gated persistent memory;
- utility measurements include confidence and mode;
- user can disable Lana independently of the lens runtime.

---

## AR-13 — Future Modes

Possible later lenses:

- Braided animal/marine research viewer;
- navigation;
- equipment/manual lookup;
- Time Reassignment companion/AR portal concepts;
- AI Cosplay skins;
- custom user-created lens skins.

Do not build these before the core runtime is stable.

---

## Build Order

1. Device abstraction
2. Lens runtime
3. Object lens
4. Angle lens
5. OCR
6. Translate
7. Scene memory
8. Lana integration
9. Hands-free control
10. Native world anchoring
11. hardware-specific optimization

## Resume rule

When AR glasses are purchased, do not restart architecture planning. Identify the device SDK/capabilities, map them to this abstraction, and begin at the first unmet gate.
