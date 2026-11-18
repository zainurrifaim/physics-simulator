# Usaha dan Energi Simulator Website Plan

Status: implemented in `website/`. The original documents are preserved. See `website/README.md` for local run commands and model limitations.

## Purpose and intended learners

Build an Indonesian-language learning website where students explore work, energy, and power through five everyday situations from the supplied materials. The experience should develop the ability to connect a situation, a vector diagram, a graph, and a calculation. It should support the materials' representational competence objective rather than function only as a calculator.

Working audience assumption: Indonesian secondary-school physics learners. The documents leave the class/semester blank, so this is a design assumption rather than a confirmed grade level. Use accessible explanations, SI units, Indonesian decimal formatting, and g = 10 m/s² in every original-problem preset.

## Review of the available project

- The workspace currently contains only the `materials` directory; there is no existing application, package configuration, or established design system.
- `materials/Soal Fisika Usaha dan Energi.docx` contains five questions, with a stated allocation of 90 minutes. Each asks for a situation sketch, vector diagram, and calculation.
- `materials/Kunci Jawaban dan Rubrik Fisika Usaha Energi.docx` contains worked answers, sketch/vector expectations, and general scoring instructions. It does not supply a complete numeric points table for the individual criteria.
- Both documents are text-only; neither includes embedded illustrations to reuse.
- Preserve both original documents. Store any revised lesson wording separately and make the distinction visible in learning content.

## Review of the visual references

All three Instagram references were inspected in the browser on 18 November 2026 after direct web fetching was throttled. This review covers their visible scenes, captions, and sampled animation frames, not a full audio transcript.

1. [Door and hinge reference](https://www.instagram.com/reel/DfwZHn1hZ6r/): compares pushing a door at different distances from its hinge, using two illustrated situations, dimensions, an equation, and a graph.
2. [Laundry pulley reference](https://www.instagram.com/reel/DfOE-8AjIfD/): presents a familiar household situation with ropes, force labels, a prediction question, and a work graph.
3. [Space telescope thermal reference](https://www.instagram.com/reel/DfhbfulEwNu/): combines an illustrated telescope, an enlarged explanatory diagram, measurements, and a temperature graph.

The useful common pattern is a short question followed by an animated, labeled explanation. Adapt that pattern into experiments students can control. Use original artwork suited to the five supplied scenarios. Door torque, pulley arrangements, and telescope thermal physics are visual references, outside the first release's curriculum scope.

## Proposed learning experience

Use a consistent sequence in every module:

1. **Prediksi**: introduce the everyday problem and ask the learner to predict an outcome before revealing the solution.
2. **Eksperimen**: change parameters and play, pause, replay, or scrub the simulation.
3. **Representasi**: inspect the scene and construct or check vector directions; distinguish forces from velocity and displacement.
4. **Analisis**: connect measured values to a graph, an equation, substitution, units, and an explanation.
5. **Refleksi**: answer a conceptual question, vary one quantity, and explain what changed.

Provide an original-problem preset in each module and an exploration mode with sensible parameter limits. Predictive answers and draft work should remain editable. Reveal worked answers after a learner submits an attempt or explicitly requests the explanation.

## Modules and checked baseline results

| Module | Adjustable quantities | Main representations | Original preset result |
| --- | --- | --- | --- |
| Atlet Angkat Besi | Barbell mass, target height, available mechanical energy | Vertical lifting scene, weight/lifting-force arrows, energy budget | 20 kg lifted 1.5 m requires 300 J; a 500 J mechanical energy budget is sufficient in the ideal model |
| Derek Pengangkat | Load mass, height, requested duration, available mechanical power | Crane scene, tension/weight arrows, work and required-power comparison | 200 kg through 15 m requires 30,000 J; over 50 s the required average power is 600 W, below 20,000 W |
| Lift dan Muatan | Cabin/payload mass, starting/ending height, duration, specified braking-power limit | Elevator shaft, tension/weight arrows, signed work and energy transfer | The supplied key gives 1,500 kg payload = 15,000 N; this needs the explicit revised model described below |
| Uji Sabuk Pengaman | Initial speed, stopping distance, dummy mass, belt-force threshold | Car/dummy scene, velocity and force arrows, speed graph, force comparison | 36 km/h = 10 m/s; acceleration = -100 m/s²; modeled belt force = 6,000 N, below 7,000 N |
| Sepeda Menuruni Bukit | Total mass, hill height, straight slope length | Inclined path, weight/normal-force arrows, velocity/displacement arrows, potential/kinetic energy graph | From rest on a frictionless straight 160 m slope with an 80 m drop: acceleration = 5 m/s², final speed = 40 m/s, time = 8 s |

### Physics decisions before implementation

**Lift:** The original descending-elevator wording does not establish a maximum payload from motor power alone. At constant downward speed, gravity releases potential energy and an upward supporting force does negative work. Counterweights, braking capability, and structural limits matter. This interpretation follows the power relation P = F · v; it is an analysis of the supplied question, not a claim made by its answer key. See [OpenStax on power](https://openstax.org/books/university-physics-volume-1/pages/7-4-power).

For the interactive lesson, explicitly state an ideal uncounterweighted elevator descending at constant speed, with a maximum mechanical braking/energy-absorption power of 10,000 W; ignore other load limits in this teaching model. Then v = 25/100 = 0.25 m/s and P_absorbed = m_total × g × v yields m_total = 4,000 kg and payload = 1,500 kg. Keep the original wording available with a short explanation of the added assumptions. Do not present that result as a real elevator's rated capacity.

**Cycling:** Explicitly specify a start from rest, a straight uniform slope, no pedaling, no friction or air resistance, and a point-mass model that neglects wheel rotational energy. Energy conservation determines final speed; the straight slope makes acceleration constant so the 8 s calculation follows. Hill height and path length alone do not determine travel time for an arbitrary curved hill. See [OpenStax on constant acceleration](https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration). Constrain height to be positive and no greater than path length.

**Seat belt:** Model a constant stopping acceleration and assume the belt supplies the dummy's horizontal stopping force. Show 6,000 N as the force in that model, rather than a real peak-impact measurement. The car's 1,500 kg mass is context; the dummy's 60 kg mass determines this belt-force calculation. At the supplied breaking threshold, use failure for force greater than or equal to 7,000 N. Do not calculate the post-failure dummy trajectory in the first release.

**Weightlifting and crane:** Interpret the provided energy/power as available mechanical output, with ideal efficiency. Sufficient energy or power does not independently establish an athlete's strength or a crane's rated lifting force. Use steady-speed lifting with brief start/stop transitions omitted; show equal upward/downward forces during that idealized motion. If the lifting-energy budget is insufficient, show the reachable height E/(mg) and the unmet target. For insufficient crane power, show a longer minimum ideal lifting time instead of implying that no lift is possible.

**Notation and vectors:** Use F_g for weight and W for work to avoid confusing two meanings of W. Show force vectors in a free-body diagram; put displacement and velocity in a separate motion overlay. Include the normal force for the cyclist and relevant vertical support for the dummy. Explain the chosen sign convention and any vector length scaling.

## Pages and layout

**Beranda / Pilih Simulasi**

- Brief explanation of what students can explore.
- Five illustrated module cards, each with its everyday question, concepts, and learning objective.
- A clear route into the first experiment; avoid a long marketing page before learning starts.

**Simulation workspace**

- Module navigation and a short problem statement.
- Large central illustration with physical quantities anchored to the relevant objects.
- Parameter sliders paired with labeled number inputs and units.
- Play, pause, reset, playback-speed controls, and a scrubber synchronized to physical time.
- Toggles for force diagram, motion vectors, and energy display.
- A compact result panel and tabs for graphs, explanation, and guided student work.
- Desktop: scene and controls alongside one another. Phone: scene first, then controls and analysis; all content usable without horizontal scrolling.

**Ringkasan Konsep**

- Work, gravitational potential energy, kinetic energy, conservation of energy, and power.
- Equations with units, sign conventions, and links back to examples.

**Latihan dan Refleksi**

- Original problem presets and conceptual follow-up questions.
- A small sketch workspace and a vector task with keyboard-accessible direction/length controls as well as dragging.
- Structured numerical answers with unit selection and step-by-step feedback.
- Save draft responses and progress locally; provide a print-friendly learning summary.
- Assess numerical answers and constrained vector tasks automatically. Use a visible self/teacher checklist for free sketches and written reasoning. Do not invent numeric rubric weights or claim reliable automatic grading of arbitrary drawings.

## Visual direction

Create a calm illustrated science workbook: warm off-white background, dark navy text, pale blue scene areas, and one teal accent for controls. Use original SVG scenes with recognizable people and objects, clear dimension lines, and restrained motion. Keep color meanings consistent: orange for forces, blue for velocity, purple for displacement; always pair colors with labels or different line styles.

Use readable typography, visible units, generous space around the scene, and concise Indonesian instructions. Charts need labeled axes, units, a legend, and a numerical summary. Respect reduced-motion preferences, provide keyboard controls, and keep essential explanations available as text.

## Technical approach

Use a static browser application with HTML, CSS, and modular JavaScript ES modules. Render scenes, vectors, and simple charts as SVG. These five constrained systems can use analytical equations; a general rigid-body engine would add complexity without improving this teaching model.

- Separate pure physics functions from lesson data, UI controls, and rendering.
- Drive all scene positions, chart cursors, and result values from the same simulation state and physical time.
- Use requestAnimationFrame for playback; changing playback speed must not change the calculated physical outcome.
- Keep internal calculations in SI units; format values for Indonesian readers at display boundaries.
- Store local progress under a versioned localStorage key and include a clear progress-reset action.
- No account, database, AI grading, or external runtime service is required for the first release.
- Use hash-based module routes so a static host can open a shared experiment without rewrite configuration.

Suggested source structure:

```text
index.html
styles/
  base.css
  workspace.css
src/
  app.js
  lessons/                # Indonesian content and original presets
  physics/                # Pure equations, unit conversion, validation
  simulations/            # Five scene renderers
  components/             # Controls, vectors, charts, guided work
  state/                  # Playback, navigation, local progress
assets/
  scenes/                 # Original SVG artwork
tests/
  physics.test.js
materials/                # Original source documents
PLAN.md
```

For eventual hosting, package application files into `dist` and use a static Sites deployment. Keep source documents out of the deployed bundle unless download access is intentionally included. This planning stage does not create a hosted Site or publish anything.

## Implementation sequence and completion checks

1. **Content and model specification**: record each lesson's assumptions, parameter ranges, formulae, vector definitions, baseline results, and feedback. Resolve the lift wording through the explicit teaching model above.
2. **Shared workspace and first complete module**: implement the home page, Indonesian content system, controls, playback state, and weightlifting module. Complete prediction, simulation, vectors, graph, and reflection before duplicating the pattern.
3. **Remaining simulations**: implement cycling, crane, seat belt, and elevator. Reuse the workspace but give every scenario its own meaningful illustration, graph, and explanation.
4. **Student work and progress**: add sketch/vector tasks, numerical feedback, local persistence, and a print-friendly summary.
5. **Validation and release**: check the physics and all interactions, review desktop/mobile layouts, then package the website for preview and eventual hosting.

Completion criteria:

- All five original presets are available and reproduce the qualified results in this plan.
- Tests cover units, energy conservation, timing, the belt threshold, invalid inputs, and insufficient energy/power. Test below, at, and above relevant thresholds.
- Mass changes cycling energy but does not change travel time in the ideal model; speed changes crash force quadratically at fixed stopping distance.
- Equal-time animation state is independent of monitor frame rate and playback speed.
- Pause freezes physical time; reset restores the preset; editing parameters produces a consistent new experiment without stale graphs or results.
- Long source durations such as the 100 s elevator descent can be accelerated and scrubbed while preserving the physical-time labels.
- Keyboard operation, touch inputs, focus visibility, reduced motion, and readable contrast work throughout the workspace.
- Browser checks cover a narrow phone layout and a desktop layout; the application builds/packages or serves without missing assets or console errors.
- Local progress restores correctly, and clearing progress does not affect the source materials.

## Scope after the first release

Consider teacher-authored numeric scoring rubrics, classroom accounts, English translation, friction/efficiency extensions, exportable reports, and additional physics topics only after the five core learning modules work well. Keep the first release focused on the supplied Usaha dan Energi materials.
