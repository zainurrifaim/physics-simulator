// Lift scene: what is drawn matches the model at one true scale, and the magnified callout
// is honest (human-size passenger, payload as 250 kg blocks, no overlap with the shaft).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { fmt } from '../site/src/format.js';
import {
  render, geometry, insetGeometry, handle, camera, loadOffset, GAUGES, CLOSE, BUFFER_GAP,
  PX_PER_M, GROUND, CABIN_H, CABIN_W, INSET, INSET_SCALE, BLOCK, BLOCK_KG,
} from '../site/src/scenes/lift.js';
import { BODY } from '../site/src/scenes/rig.js';
import { parameterSets, frames } from './helpers.mjs';

const lesson = lessons.find((l) => l.id === 'lift');
const FRAMES = 120;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const inside = (a, b, msg, tol = 1e-6) => assert.ok(
  a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol,
  `${msg}: ${JSON.stringify(a)} not inside ${JSON.stringify(b)}`);
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const box = (vb) => { const [x, y, w, h] = vb.split(' ').map(Number); return { x, y, w, h }; };

test('lift scene: cabin at true scale, floor at the model height, inside the shaft, cable attached', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('lift', p, FRAMES);
    for (const s of states) {
      const g = geometry(p, r, s);
      near(g.cabin.h, CABIN_H * PX_PER_M, 1e-9, `${name}: cabin height`);
      near(g.cabin.w, CABIN_W * PX_PER_M, 1e-9, `${name}: cabin width`);
      assert.ok(CABIN_H >= 2.4 && CABIN_H <= 2.6, 'cabin is a realistic 2,4–2,6 m tall');
      near(g.cabin.floorY, GROUND - s.position * PX_PER_M, 1e-9, `${name} t=${s.t}: cabin floor`);
      near(g.cabin.y + g.cabin.h, g.cabin.floorY, 1e-9, `${name}: floor is the cabin's bottom edge`);
      inside(g.cabin, g.shaft, `${name} t=${s.t}: cabin outside the shaft`);
      assert.ok(g.floors.bufferTop - g.floors.bottom >= BUFFER_GAP * PX_PER_M - 1e-9, `${name}: buffers start below the landing`);
      if (s.phase !== 'buffer') assert.ok(g.cabin.floorY < g.floors.bufferTop, `${name}: cabin sits on the buffer`);
      assert.ok(g.cable.length >= 0, `${name} t=${s.t}: cable length ${g.cable.length}`);
      near(g.cable.y2, g.cabin.y, 1e-9, `${name}: cable attached to the cabin roof`);
      near(g.cable.x, g.cabin.x + g.cabin.w / 2, 1e-9, `${name}: cable at the cabin centre`);
      assert.ok(!overlap(INSET, g.shaft), `${name}: callout overlaps the shaft`);
      assert.ok(!overlap(INSET, g.cabin), `${name}: callout overlaps the cabin`);
    }
    const end = states[FRAMES];
    const gEnd = geometry(p, r, end);
    if (r.ok) near(gEnd.cabin.floorY, gEnd.floors.bottom, 1e-6, `${name}: arrives at the drawn bottom landing`);
    else assert.ok(end.phase === 'buffer' || gEnd.cabin.floorY < gEnd.floors.bottom - 1, `${name}: overloaded cabin drawn at the bottom landing`);
  }
});

test('lift scene: overload looks like failure (brake, tag, red readouts); success shows arrival', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('lift', p, FRAMES);
    const svg = render(p, r, states[FRAMES], fmt);
    if (r.ok) {
      assert.match(svg, /Tiba di h/, `${name}: arrival tag`);
      assert.doesNotMatch(svg, /brake-jaw on|Rem darurat/, `${name}: brakes on a successful run`);
    } else {
      assert.match(svg, /brake-jaw on/, `${name}: safety brake not clamped`);
      assert.match(svg, /Rem darurat aktif/, `${name}: stop tag`);
      assert.ok(svg.includes(`berhenti di ${fmt(r.stopHeight, 2)} m`), `${name}: stop height`);
      assert.match(svg, /lift-gauge warn/, `${name}: readout not flagged`);
      assert.match(svg, /perlu /, `${name}: needed power shown once running`);
      if (r.maxPayload < 0) assert.ok(svg.includes(`tag warn"><rect`) && /class="tag warn">[^]*?>m<tspan class="sub" dy="4">lift/.test(svg), `${name}: cabin alone over the limit but m_lift not flagged`);
    }
    // t = 0 is the prediction preview: identical neutral visuals for success and overload
    const first = render(p, r, states[0], fmt);
    assert.doesNotMatch(first, /class="cabin fail|lift-gauge warn|perlu |tag warn|lift-status warn|brake-jaw on|missed/, `${name}: preview at t = 0 gives the answer away`);
    for (const s of states) {
      const out = render(p, r, s, fmt);
      assert.doesNotMatch(out, /NaN|undefined|Infinity/, `${name} t=${s.t}`);
      if (s.phase === 'descend') assert.doesNotMatch(out, /brake-jaw on/, `${name}: brakes during normal descent`);
    }
  }
  // the pit-buffer outcome is not reachable with the lesson's slider steps; render it synthetically
  const p = lesson.preset;
  const { r, states } = frames('lift', p, 4);
  const svg = render(p, { ...r, ok: false, outcome: 'buffer', impactSpeed: 0.27 }, { ...states[4], phase: 'buffer', speed: 0, drivePower: 0 }, fmt);
  assert.match(svg, /Menghantam peredam/);
  assert.match(svg, /class="impact"/);
});

test('lift scene: callout has a human-size passenger and one 250 kg block per 250 kg of payload', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const ins = insetGeometry(p);
    near(ins.cabin.h, CABIN_H * INSET_SCALE, 1e-9, `${name}: callout cabin height`);
    near(ins.cabin.w, CABIN_W * INSET_SCALE, 1e-9, `${name}: callout cabin width`);
    near(ins.person.h, BODY.stature * INSET_SCALE, 1e-9, `${name}: passenger height`);
    inside(ins.cabin, INSET, `${name}: callout cabin outside the frame`);
    inside(ins.person, ins.inner, `${name}: passenger outside the cabin`);
    assert.equal(ins.blocks.length, Math.max(0, Math.ceil(p.payload / BLOCK_KG - 1e-9)), `${name}: block count`);
    near(ins.blocks.reduce((sum, b) => sum + b.kg, 0), p.payload, 1e-6, `${name}: blocks add up to the payload`);
    for (const b of ins.blocks) {
      near(b.w, BLOCK * INSET_SCALE, 1e-9, `${name}: block footprint`);
      near(b.h / (BLOCK * INSET_SCALE), b.kg / BLOCK_KG, 1e-9, `${name}: block volume ∝ mass`);
      inside(b, ins.inner, `${name}: block outside the cabin`);
      assert.ok(!overlap(b, ins.person), `${name}: block overlaps the passenger`);
    }
    for (let i = 0; i < ins.blocks.length; i++) for (let j = i + 1; j < ins.blocks.length; j++) {
      assert.ok(!overlap(ins.blocks[i], ins.blocks[j]), `${name}: blocks ${i} and ${j} overlap`);
    }
  }
  near(BLOCK ** 3 * 7850, BLOCK_KG, 1e-6, 'a block is a 250 kg steel cube');
});

test('lift scene: drag handles sit on the drawn landings; cameras and the ± panel keep the action visible', () => {
  const panel = { x: 174, y: 308, w: 252, h: 72 };
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('lift', p, 8);
    const g = geometry(p, r, states[0]);
    near(handle('top', p).y, g.floors.top, 1e-9, `${name}: top handle`);
    near(handle('bottom', p).y, g.floors.bottom, 1e-9, `${name}: bottom handle`);
    near(handle('top', p).factor, -1 / PX_PER_M, 1e-12, 'drag factor');
    for (const mode of ['desktop', 'portrait']) {
      const cam = box(camera[mode]);
      const [dx, dy] = loadOffset[mode];
      const moved = { ...panel, x: panel.x + dx, y: panel.y + dy };
      inside(moved, cam, `${mode}: ± panel outside the view`);
      inside(INSET, cam, `${mode}: callout outside the view`);
      const G0 = GAUGES[mode];
      const gaugeBox = { x: G0.x, y: G0.y - 18, w: G0.w, h: G0.dy + 52 };
      inside(gaugeBox, cam, `${mode}: gauges outside the view`);
      assert.ok(!overlap(moved, gaugeBox), `${mode}: ± panel covers the gauges`);
      assert.ok(!overlap(moved, INSET), `${mode}: ± panel covers the callout`);
      for (const s of states) {
        const gs = geometry(p, r, s);
        inside(gs.cabin, cam, `${name} ${mode}: cabin outside the view`);
        assert.ok(!overlap(moved, gs.cabin), `${name} ${mode}: ± panel covers the cabin`);
      }
      for (const key of ['top', 'bottom']) {
        const h = handle(key, p, mode === 'portrait');
        assert.ok(h.x - 15 >= cam.x && h.x + 15 <= cam.x + cam.w, `${mode}: ${key} handle outside the view`);
        assert.ok(!overlap({ x: h.x - 15, y: h.y - 15, w: 30, h: 30 }, moved), `${name} ${mode}: ± panel covers the ${key} marker`);
      }
    }
    // the two handle circles (r = 15) and their labels (right-anchored, ~60 px wide, 14–30 px above) never collide
    const T = handle('top', p), Bh = handle('bottom', p);
    assert.ok(Math.hypot(T.x - Bh.x, T.y - Bh.y) >= 32, `${name}: handle circles touch`);
    const label = (h) => ({ x: h.x - 84, y: h.y - 31, w: 62, h: 17 });
    assert.ok(!overlap(label(T), label(Bh)), `${name}: handle labels overlap`);
    for (const [h, o] of [[T, Bh], [Bh, T]]) {
      assert.ok(label(h).x >= g.shaft.x + g.shaft.w, `${name}: handle label covers the shaft`);
      assert.ok(!overlap(label(h), { x: o.x - 15, y: o.y - 15, w: 30, h: 30 }), `${name}: label covers the other handle`);
    }
    if (p.top - p.bottom >= CLOSE) assert.equal(T.x, Bh.x);
  }
});

test('lift scene: free-body diagram of cabin + payload matches the phase and never overlaps the UI', async () => {
  const { fbdForces, FBD_DESKTOP, FBD_PORTRAIT, TAGS, STATUS, LOAD_PANEL } = await import('../site/src/scenes/lift.js');
  const { SAFETY_DECEL, sample } = await import('../site/src/physics/models.js');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('lift', p, FRAMES);
    for (const s of states) {
      const F = fbdForces(p, r, s);
      const up = F.filter((x) => x.dy < 0).reduce((a, x) => a + x.value, 0);
      const down = F.filter((x) => x.dy > 0).reduce((a, x) => a + x.value, 0);
      near(down, r.totalMass * 10, 1e-6, `${name}: F_g = m_total g`);
      const net = up - down, tol = 1e-6 * down;
      if (['descend', 'arrived', 'stopped', 'buffer'].includes(s.phase)) near(net, 0, tol, `${name} t=${s.t} ${s.phase}: ΣF`);
      else if (s.phase === 'overspeed') assert.ok(net < 0, `${name} t=${s.t}: overspeed needs a net downward force`);
      else if (s.phase === 'braking') near(net, r.totalMass * SAFETY_DECEL, tol, `${name}: braking ΣF = m·a`);
      // ΣF has the sign of −m dv/dt (v is the downward speed)
      if (['overspeed', 'braking'].includes(s.phase)) {
        const later = sample('lift', p, r, s.t + 1e-4);
        if (later.phase === s.phase) assert.ok(Math.sign(later.speed - s.speed) === -Math.sign(net), `${name} t=${s.t}: ΣF sign vs dv/dt`);
      }
      for (const x of F) assert.ok(x.len > 0 && x.len <= FBD_DESKTOP.maxLen, `${name}: arrow length`);
    }
    // one scale for every setup: the same force has the same length
    const B = fbdForces(p, r, states[0]).find((x) => x.key === 'g');
    if (B.scaled) near(B.len, B.value * FBD_DESKTOP.k, 1e-9, `${name}: scale`);
  }
  const p = lesson.preset;
  const { r, states } = frames('lift', p, 2);
  for (const [mode, panel] of [['desktop', FBD_DESKTOP], ['portrait', FBD_PORTRAIT]]) {
    inside(panel, box(camera[mode]), `${mode}: FBD outside the camera`);
    const [dx, dy] = loadOffset[mode];
    const rects = { inset: INSET, status: STATUS, panel: { ...LOAD_PANEL, x: LOAD_PANEL.x + dx, y: LOAD_PANEL.y + dy } };
    for (const m of ['desktop', 'portrait']) { const G0 = GAUGES[m]; rects[`gauges ${m}`] = { x: G0.x, y: G0.y - 18, w: G0.w, h: G0.dy + 52 }; }
    if (mode === 'desktop') rects.tags = TAGS;
    for (const [k, rect] of Object.entries(rects)) assert.ok(!overlap(panel, rect), `${mode}: FBD overlaps ${k}`);
    for (const [, q] of parameterSets(lesson)) {
      const g = geometry(q, r, states[0]);
      assert.ok(!overlap(panel, g.shaft), `${mode}: FBD overlaps the shaft`);
      for (const key of ['top', 'bottom']) {
        const h = handle(key, q);
        assert.ok(!overlap(panel, { x: h.x - 84, y: h.y - 31, w: 99, h: 46 }), `${mode}: FBD overlaps the ${key} handle`);
      }
    }
  }
  // the desktop FBD is not visible in portrait, the portrait one not on desktop
  assert.ok(!overlap(FBD_DESKTOP, box(camera.portrait)) && !overlap(FBD_PORTRAIT, box(camera.desktop)));
});
