# Ruang Fisika simulation review and improvement plan

Reviewed 18 November 2026 against commit `433a3bc`. The review covered the shared workspace and all five lesson definitions, with fresh visual checks of the lift and cycling experiments. All 68 existing tests passed before any implementation.

## What learners see today

| Concern | Finding |
| --- | --- |
| Logo | The latest change replaced `site/assets/favicon.svg` with a fixed pulley. The browser tab uses it. The two home links in `site/src/app.js` still call `icon('atom')`. |
| Language | The lift prediction gives the distance, time, power limit and two loads before it says what the learner should decide. The cycling live readout asks learners to interpret a full energy equation while watching the bike. |
| Numbers and scales | In the lift, “1.500 kg” appears in the case caption, the scene and the load control. The starting height is repeated at the floor marker and its drag handle. Gauges, a force diagram and a live result also compete for space. On the cycling hill, both the dimension line and its handle label the same length. |
| Starting view | `renderWorkspace` already prepares both cases and opens *Eksperimen*. Its initial `view: 'single'` shows only the active case. A/B already has a shared clock, a two-column desktop layout and stacked phone panels. |

## Implementation order

### 1. Use the pulley wherever the brand appears

Point both brand links in `site/src/app.js` at the existing favicon asset. Size it to fit its portrait aspect ratio in the sidebar and compact header. Keep the adjacent “Ruang Fisika” text as the link’s accessible name and use an empty image alt there. Check the pulley’s rope and weight against the actual header backgrounds and at tab-icon size.

Give the image a dedicated class, explicit dimensions, `object-fit: contain` and `flex-shrink: 0`. The current sizing targets `.icon`, while the new asset has intrinsic dimensions of 220 × 240. Replace the dark `.brand-icon` background with a light or transparent background so the pulley’s dark strokes remain visible. Inspect Home and the opened simulation menu, where the two brand links are visible.

### 2. Design the opening A/B view around one question

Use the lift as the first implementation because it combines the most competing elements observed in this review. Open it on *Eksperimen* with A/B selected. Give each panel a caption naming the changed quantity, a clear view of the moving object and a short result below the drawing. Keep a single playback bar. Use the existing A and B buttons to inspect either case at full size.

Separate the choice of **which case to edit** from **which cases to show**. Selecting B in *Atur* should let a learner change B while watching both cases. On module entry and reload, open in A/B and restore saved parameters, worksheet answers and playback position. Within an open module, respect the learner’s choice of A, B or A/B as they move between steps.

Add a visible question to the experiment itself. Currently `cmp.question` appears only on *Prediksi*. Keep the prediction tied to the original assignment and make the experiment question follow the current settings. When the two cases have independently edited settings, use a question such as “Apa yang berbeda pada hasil A dan B?”

Give phone panels a minimum usable height and allow the experiment region to scroll with playback still reachable. Choose framing and label density from each panel’s available size, including narrow panels on desktop. Update the scene and interaction overlay together when the panel resizes or the view changes, using the same viewBox for both so dragging remains aligned.

### 3. Simplify the Indonesian and choose what each case displays

Start with the question a learner can answer by watching. Name the changed input in the caption and show the outcome in everyday Indonesian. Introduce symbols and calculations in *Penjelasan*. Apply the same vocabulary to controls, hints, feedback and lesson cards. Keep the original assignment wording and grading in *Latihan*. Generate captions and results from the current settings so a preset claim cannot survive an edit that makes it false.

| Experiment | Suggested opening question for the preset | What to watch |
| --- | --- | --- |
| Angkat besi | Barbel mana yang bisa diangkat sampai ke atas kepala? | Label each mass. Show the height reached and whether the bar reaches the target. |
| Derek | Peti mana yang sampai ke atas dalam 50 detik? | Label each mass. Show whether the crate reaches the target in time, including a distinct message if it cannot lift off. |
| Lift | Lift mana yang sampai ke lantai tujuan? | Label the two loads. State the requested descent time in supporting text. Show the cabin’s height and whether it reaches the destination or stops early. |
| Sabuk pengaman | Jika mobil melaju dua kali lebih cepat, berapa kali lipat gaya yang dibutuhkan sabuk? | Label each starting speed in km/jam. At the end, show the required force and whether the belt holds. Explain “dummy” as “boneka uji tabrak” on first use. |
| Sepeda | Jika massa sepeda dan pengendaranya dua kali lipat, siapa yang sampai duluan? | Label each total mass. Show each arrival time so an equal finish is visible. Keep the energy calculation in the explanation. |

Use “Pengaturan lain” for the secondary controls and “Hasil pengaturanmu” for edited results. Describe drag handles by their meaning, such as “penanda tinggi bukit”, and label cycling mass as “Sepeda dan pengendara”. Use *massa* with kg and *gaya berat* with N. Give short supporting conditions where needed, including the shared stopping distance for the belt and starting from rest without friction for cycling. Update “50 detik” and “dua kali lipat” whenever edited settings invalidate them.

Write live status from the sampled phase. Examples include “Tinggi peti 8 m”, “Waktu habis. Peti belum sampai”, and “Rem darurat aktif. Lift berhenti”. Show arrival, belt failure and falling messages when those events occur. Align lift answer choices with reaching the destination, using “Keduanya sampai” and “Keduanya berhenti lebih awal” alongside the A/B options. Explain the cycling preset with “Keduanya sampai bersamaan. Pada bukit yang sama dan tanpa gesekan, massa tidak mengubah waktu tempuh.”

### 4. Remove duplicate measurements and simplify scales

- Use the case caption as the home for the comparison input. Put editing values in *Atur* or expose them when a handle is focused or dragged. Keep keyboard access and the exact value and unit available to assistive technology.
- Put each live result in its own row below the scene. Show time once on the shared playback bar, with per-case times when arrival time is the answer. Use the existing Indonesian formatter and enough precision to distinguish small values.
- Label the ruler unit once. Keep endpoints, the target and only as many intermediate labels as fit in the rendered panel. For example, when two lift floors are close together, label the two floors and omit neighboring tick numbers. Preserve the mapping between height, tick position and drag position.
- Keep comparable scales across A and B wherever learners compare lengths or arrows directly. Retain magnification notes for enlarged objects and the existing indication for capped force arrows when those diagrams are shown.
- Put detailed gauges and force diagrams behind the appropriate control in comparison view. Keep the sampled force diagrams available during playback for learners inspecting a case. Some scene tests currently require a diagram to be always visible. Update those visibility checks for the intended views while retaining the force, scale and geometry assertions.

Connect the existing *Gaya* checkbox to the embedded lift and cycling force panels, which currently sit outside `.layer-forces`. Reclaim the space occupied by hidden panels when choosing the scene framing.

## Release checks

1. Open every module from Home and by direct link, then reload a saved draft. A/B is selected, both captions are readable, and one play, pause or scrub action controls both cases. Switch to B, edit it and return to A/B. A retains its settings.
2. Inspect the initial frame, motion and final result on desktop (1280 × 720) and phone (360 × 800 and 390 × 844). Use actual browser viewport sizes. Check close floor heights, long numeric labels and a case that finishes before its partner. Captions, scale labels, handles and the playback bar must remain readable and reachable. Allow vertical scrolling on short screens.
3. Try a learner walkthrough on a phone. Ask the learner what differs between A and B, what they expect, and what happened after pressing *Jalankan*. Revise any prompt or readout that requires the reviewer to translate symbols before the learner can answer.
4. Add a browser regression check for the opening view and case switching. Run the existing physics, interaction and scene tests, verify a saved worksheet still grades against the original preset, and update the README sentence that currently promises a single opening scene.
5. Check the A/B panels at 200% text zoom. Resize and switch views while interacting to verify handle alignment. Confirm *Gaya* controls the embedded force panels and that visible force values follow playback.
6. Reload a draft saved at the end of playback. Show the completed state with a clear *Putar ulang* action that restarts both cases. Editing either case resets the shared clock. Switching views preserves its position.

## Independent review

Three sub-agents reviewed branding, Indonesian wording and the comparison layout. Their findings are incorporated above. Implementation should start with the logo and lift layout, then apply the verified layout and wording approach across the remaining modules.

## Implementation verification

Implemented across all five modules. Branding, wording and scene cleanup were assigned to three sub-agents. The shared workspace now opens in A/B with panel captions, accessible mass buttons, a visible question, separate result rows and a shared playback bar. Phone panels scroll vertically. Force diagrams are selectable, and drawing and drag overlays use the same camera based on panel dimensions.

All 68 physics, interaction and scene tests pass. Browser checks covered all five modules at 1280 × 720, 390 × 844 and 360 × 800, including playback, saved state, parameter editing, view changes, predictions, graphs, forces, calculations and worksheet sections. Additional checks verified pointer dragging, keyboard edits, worksheet grading and saved answers, print visibility, both logo locations and enlarged text. No browser script errors or horizontal document overflow occurred in these checks. Physical touchscreen use and a student walkthrough remain unverified.

Follow-up playback review found that the reduced-motion preference caused *Jalankan* to seek immediately to the end. Explicit playback now runs under either motion preference. Delayed frames are capped at 0.1 seconds of wall time, and hiding the tab pauses and saves playback. Browser regression checks passed for all five modules under both motion preferences, including intermediate progress, pause, resume and replay. Separate checks simulated a 60-second frame delay and hiding/restoring the page. All 68 existing tests also pass after this correction.
