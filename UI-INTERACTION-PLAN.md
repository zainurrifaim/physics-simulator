# Screen-fitting simulation and interaction plan

Date: 18 November 2026
Scope: implemented in the current `site/` application on 18 November 2026. The sections below record the implementation requirements.

## 1. Findings from the current source

- `site/src/pages/workspace.js` stacks the prediction, A/B scenes, playback, equation, force diagram, graph, parameter controls, worked solution, and worksheet in one document. Reaching the experiment controls and questions requires scrolling.
- `site/styles/layout.css` reserves 248 px for the desktop sidebar, 64 px for the top bar, and substantial main padding. The poster adds more padding and grows with its contents rather than the available screen height.
- The A/B comparison, Indonesian lesson content, original presets, graphs, and shared physics models already exist and can be reused.
- Scene SVGs currently display sampled animation states. They have no scene interaction handlers, and `renderScenes()` replaces their contents on every animation frame.
- The worksheet already supports freehand pointer drawing, numerical answers, vector direction choices, automatic saving, and printing. Keep these capabilities while dividing the worksheet into smaller tasks.
- Worksheet grading currently uses the original problem preset. Keep that context explicit when experimental parameters change.

The supplied door illustration is a visual reference: concise question, clear scene, labeled measurements, blue A/red B, and a focused equation. Its physics content and any text within the image are reference material, not instructions to add a door simulation.

## 2. Layout: one learning step at a time

Replace the long module page with four directly selectable steps:

| Step | Visible content | Main action |
| --- | --- | --- |
| 1. Prediksi | Short comparison question, A/B setup, answer choices | Choose a prediction |
| 2. Eksperimen | Interactive scene, nearby controls, playback, brief live result | Manipulate the setup and run it |
| 3. Penjelasan | Main equation, conclusion, selectable graph/force diagram/worked calculation | Connect the experiment to the explanation |
| 4. Latihan | One worksheet task at a time | Answer, check, and continue |

- Keep a compact module header, step indicator, and `Sebelumnya` / `Berikutnya` navigation in stable positions.
- Open modules at Prediksi and let learners select Eksperimen immediately. Navigation does not depend on a correct prediction or completed playback.
- Keep solutions hidden until an attempt or an explicit reveal request; this must not reserve a large blurred section in the workspace.
- Divide Latihan into Sketsa, Vektor, Perhitungan, and Refleksi. Keep the active prompt, input, and check/continue action together.
- Preserve state across steps: parameters, selected case, prediction, playback position, worksheet drafts, and feedback. Pause playback when leaving the experiment.
- Keep navigation explicit rather than auto-advancing on an answer. Move keyboard focus to the new step heading.

### Desktop and tablet

- Use a compact top navigation with a module selector; move the permanent sidebar into an optional menu in the simulation workspace.
- Size the workspace against the available viewport using `100dvh`, flexible grid rows, and `minmax(0, 1fr)` for the scene region.
- Show A/B scenes beside one another with a narrow controls area or a compact control row, depending on available width.
- Put the primary editable quantities beside the scene. Put secondary parameters behind a clearly labeled disclosure.
- Keep play/pause, reset, and step navigation visible. The timeline remains available for reviewing time.
- On Penjelasan, switch between graph, force diagram, and calculation inside the same region instead of stacking all three.

### Phone and short screens

- Show one scene at a time with labeled A/B controls that preserve both cases' settings and share the same simulation clock.
- Keep a compact A/B value summary so the comparison remains understandable while switching scenes.
- Use shorter prompts and smaller content groups, with controls below the scene inside the active step.
- Keep bottom navigation reachable above safe-area insets. Account for browser bars and the on-screen keyboard.
- When space is unusually limited or text is enlarged, allow the active content region to scroll. Do not crop content or shrink text until it becomes unreadable.

## 3. Visual direction

Aim for a simple illustrated physics worksheet, following the reference's clarity.

- White or lightly off-white background, dark text, thin dividers, restrained corners, and minimal shadows.
- Keep a serif face for the main question and equation; use one plain system sans-serif for controls and instructions.
- Reserve blue for A and red for B throughout the scene, measurements, equation, and graph. Pair colors with letters and labels.
- Make the scene the strongest visual element. Show only the measurements needed for the current task; offer optional force and motion overlays.
- Use one short interaction hint at a time, such as `Seret penanda tinggi` or `Tambahkan beban`.
- Replace decorative badges, oversized headings, floating panels, and confetti with concise text feedback where they do not help the task.
- Simplify the home page to a short introduction and five experiment links with small scene previews. Apply the same typography and controls to concepts and notes.
- Keep all learner-facing copy in Indonesian.

## 4. Direct interaction in every simulation

Scene actions must change the experimental setup and its computed outcome. Merely dragging an object along a prerecorded animation does not satisfy this requirement.

| Module | Primary scene interactions | Visible feedback |
| --- | --- | --- |
| Angkat besi | Add/remove labeled mass plates on the barbell; drag the target-height marker | Total mass, target height, required energy, and reachable height |
| Derek | Add/remove labeled load blocks; drag the lift-height marker | Load mass, work, required power, and attainable lift duration |
| Lift | Add/remove labeled cargo blocks in the cabin; move the start/end height markers | Payload, travel distance, and required braking power against its limit |
| Sabuk pengaman | Drag the stopping-distance handle; drag the tip of the initial-speed arrow | Speed, stopping distance, and calculated belt force against the threshold |
| Sepeda | Drag the hill's height handle and slope-length handle; add/remove labeled rider-load blocks | Height, length, arrival time, and energy; compare mass changes in A/B |

Interaction rules:

- Use visible handles and object labels so interactive targets are discoverable. Include click/tap add/remove alternatives for load blocks.
- Provide labeled numeric fields and keyboard controls for every draggable quantity. Use generous touch targets, aiming for at least 44 × 44 CSS px.
- Map pointer coordinates through the SVG coordinate transform so interactions work at every rendered size.
- Constrain changes to the existing valid ranges. Keep hill height no greater than slope length, and elevator start height above end height. Explain constraints beside the relevant handle.
- Editing pauses playback and resets the run to its initial state; show a live setup/result preview, then let the learner press `Jalankan`. Editing is configuration, not a measurement of the learner's physical effort.
- Editing A changes only A; editing B changes only B. Clearly label any intentionally shared setting. Keep the original A/B preset available through Reset.
- Update the scene, number fields, equation, chart, and result from the same validated parameter state.
- Keep the existing ideal physics models and lesson assumptions, including the lift's braking-power interpretation. These interactions do not require a new rigid-body physics engine.
- Any customized A/B setup must update or hide the preset prediction verdict. The current fixed prediction answer must not be presented as correct for arbitrary new parameters.

## 5. Implementation structure

Keep the existing dependency-free HTML/CSS/JavaScript application.

1. Refactor `site/src/pages/workspace.js` into a persistent module state controller and small step renderers. Avoid recreating worksheet inputs while navigating or updating playback.
2. Add a reusable step-navigation component and a shared scene interaction controller for pointer, touch, keyboard, coordinate conversion, and parameter validation.
3. Extend `site/src/lessons/*.js` with interaction metadata: editable quantity, object/handle, bounds, increment, and hint.
4. Extend `site/src/scenes/*.js` with stable identifiable interaction targets and handles. Avoid replacing a captured pointer target during a drag; use persistent interaction layers and targeted scene updates.
5. Route pointer actions and numeric edits through one update function that validates parameters and calls the existing `solve()` / `sample()` functions.
6. Refactor `site/src/components/worksheet.js` into task views while reusing sketching, checking, and feedback. Keep grading tied to visibly labeled `Soal asli` values; experimental edits do not silently change the assignment.
7. Consolidate overlapping layout rules in `site/styles/layout.css`, `poster.css`, and `workspace.css`; preserve the scene styles needed by existing SVG illustrations.
8. Extend `site/src/state/storage.js` only as needed. Preserve existing saved answers and sketches, default missing navigation fields safely, and distinguish saved navigation state from completed learning tasks.
9. Update print styles so all worksheet tasks print together even though only one task is visible on screen. Keep the notes summary usable.

## 6. Delivery order

1. **Layout and style foundation:** implement the four-step shell, compact navigation, responsive scene region, and simple visual rules. Check the longest prompts before expanding interactions.
2. **Complete one module:** use Angkat besi to validate direct manipulation, keyboard/touch alternatives, A/B synchronization, feedback, and the full worksheet flow.
3. **Apply to the other four:** build the distinct scene interactions using the shared controller, then check module-specific constraints.
4. **Finish supporting pages and persistence:** align home/concepts/notes styling, preserve drafts, and verify printing.
5. **Verify the full experience:** run physics tests and targeted interaction checks, inspect desktop/mobile layouts, and resolve clipping or navigation failures.

## 7. Acceptance criteria

- At 1366 × 768 and 1280 × 720, the experiment scene, primary controls, play/reset, and step navigation are visible without scrolling the document.
- At 390 × 844 and 360 × 800, the active scene, primary interaction, and navigation fit at normal text size. There is no horizontal scrolling. Use A/B switching and task pagination to retain readable labels.
- In each worksheet task, the prompt, main input, and submit/check control appear together. With the mobile keyboard open, the active field and its action remain reachable.
- Each of the five simulations has at least one meaningful direct scene action that changes a parameter and computed outcome without using a slider.
- Mouse, touch, and keyboard can perform equivalent experiment changes. Drag cancellation, reset, resize, and page changes leave valid state and no stuck interaction.
- A/B state, scenes, graphs, equations, and feedback agree after every edit. A preset prediction verdict never describes an unrelated customized comparison.
- Moving between steps and modules preserves saved work; existing saved drafts still load. Resetting experimental parameters does not erase worksheet answers.
- `npm test` continues to pass. Add focused checks for shared interaction-to-parameter mapping, constraints, navigation state, and any changed prediction logic; avoid tests that only duplicate markup.
- Check all modules manually at the listed screen sizes, with enlarged text and reduced motion. No essential content is hidden by fixed navigation.
- Print output includes every worksheet task and saved answer.

Implementation is local in `site/`. See `README.md` for run instructions. No hosted deployment was requested.
