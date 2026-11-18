// Human rig with fixed segment lengths. Poses are solved in metres (x to the right,
// y up from the floor) with two-bone inverse kinematics, so a limb can bend but never
// stretch. Scenes convert a pose to pixels with `toPx`; tests check the invariants
// (segment lengths, hands on the bar, feet on the floor) on the same pose objects.

/** Adult, 1,80 m stature. Front-view proportions (Drillis & Contini segment ratios). */
export const BODY = {
  stature: 1.8,
  ankleY: 0.08,      // ankle joint height above the floor
  thigh: 0.44,
  shin: 0.44,
  hipHalf: 0.09,     // hip joint offset from the centre line
  footHalf: 0.14,    // ankle offset from the centre line (feet about hip-width apart)
  standHip: 0.955,
  torso: 0.51,       // hip line to shoulder line
  shoulderHalf: 0.19,
  upperArm: 0.33,
  forearm: 0.31,     // elbow to the centre of the grip
  neck: 0.2,         // shoulder line to head centre
  headR: 0.115,
};
BODY.arm = BODY.upperArm + BODY.forearm;
BODY.standShoulder = BODY.standHip + BODY.torso;

/** Half the hand spacing on the bar (a normal snatch-to-clean width ≈ 0,6 m). */
export const GRIP_HALF = 0.3;

const hyp = Math.hypot;

/**
 * Two-bone IK in 2-D. Places `joint` so |root-joint| = l1 and |joint-end| = l2.
 * bend = +1 puts the joint on the left of the root→target direction, −1 on the right.
 * If the target is out of reach the limb straightens towards it and reached = false.
 */
export function twoBone(root, target, l1, l2, bend = 1) {
  const dx = target.x - root.x, dy = target.y - root.y;
  const dist = hyp(dx, dy);
  const ux = dist > 1e-9 ? dx / dist : 0, uy = dist > 1e-9 ? dy / dist : -1;
  const max = l1 + l2, min = Math.abs(l1 - l2);
  const reached = dist <= max + 1e-9 && dist >= min - 1e-9;
  const d = Math.max(min + 1e-9, Math.min(max - 1e-9, dist));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const joint = { x: root.x + ux * a - uy * h * bend, y: root.y + uy * a + ux * h * bend };
  const end = reached ? { x: target.x, y: target.y } : { x: root.x + ux * d, y: root.y + uy * d };
  return { joint, end, reached };
}

/** A body with the same proportions scaled to another stature (all lengths in metres). */
export function scaleBody(stature) {
  const k = stature / BODY.stature;
  const out = {};
  for (const [key, v] of Object.entries(BODY)) out[key] = v * k;
  return out;
}

/** Light-weight-class lifter, 1,6 m: the original problem's bar (1,5 m lift) ends above the head. */
export const LIFTER = scaleBody(1.6);
export const LIFTER_GRIP_HALF = 0.28;

/** Lowest grip height reachable standing upright, for a body and grip width. */
export const standReachLow = (B = BODY, grip = GRIP_HALF) => B.standShoulder - Math.sqrt((B.arm * 0.995) ** 2 - (grip - B.shoulderHalf) ** 2);
/** Highest grip height overhead with (almost) straight arms. */
export const overheadReach = (B = BODY, grip = GRIP_HALF) => B.standShoulder + Math.sqrt((B.arm * 0.999) ** 2 - (grip - B.shoulderHalf) ** 2);
export const STAND_REACH_LOW = standReachLow();
export const OVERHEAD_REACH = overheadReach();

const sub3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
const len3 = (v) => Math.hypot(v.x, v.y, v.z ?? 0);

/**
 * Two-bone IK in 3-D. The joint bends towards `pole` (a direction), so elbows and knees can
 * point out of the picture plane and move smoothly; the scene draws the front-view projection.
 */
export function twoBone3(root, target, l1, l2, pole) {
  const d = sub3(target, root);
  const dist = len3(d);
  const u = dist > 1e-9 ? { x: d.x / dist, y: d.y / dist, z: d.z / dist } : { x: 0, y: -1, z: 0 };
  const max = l1 + l2, min = Math.abs(l1 - l2);
  const reached = dist <= max + 1e-9 && dist >= min - 1e-9;
  const dd = Math.max(min + 1e-9, Math.min(max - 1e-9, dist));
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // component of the pole perpendicular to the bone axis
  const pd = pole.x * u.x + pole.y * u.y + pole.z * u.z;
  let px = pole.x - pd * u.x, py = pole.y - pd * u.y, pz = pole.z - pd * u.z;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  const joint = { x: root.x + u.x * a + px * h, y: root.y + u.y * a + py * h, z: (root.z ?? 0) + u.z * a + pz * h };
  const end = reached ? { ...target, z: target.z ?? 0 } : { x: root.x + u.x * dd, y: root.y + u.y * dd, z: (root.z ?? 0) + u.z * dd };
  return { joint, end, reached };
}

/**
 * Front-view weightlifter pose (3-D joints; draw x/y).
 * barY: grip height above the floor (m). grip = false → hands hang at the sides.
 * release 0…1 eases from the gripping posture to standing with hands down (after a drop),
 * so the body never teleports. Low bars are reached by squatting (knees forward and a little
 * out) and leaning the torso forward, never by lengthening the arms.
 */
export function lifterPose({ barY = 0, grip = true, release = 0, body = BODY, gripHalf = GRIP_HALF, barZ = 0.12 } = {}) {
  const B = body;
  const rel = grip ? Math.max(0, Math.min(1, release)) : 1;
  const crouch = 1 - rel;
  const low = standReachLow(B, gripHalf);
  let hipY = B.standHip, lean = 0;
  if (barY < low && crouch > 0) {
    // shoulders must come down by `deficit` so straight arms reach the bar. The torso lean grows
    // linearly with the deficit (smooth, no sudden swing near upright); the hips drop the rest.
    const need = barY + Math.sqrt((B.arm * 0.995) ** 2 - (gripHalf - B.shoulderHalf) ** 2);
    const deficit = (B.standShoulder - need) * crouch;
    lean = Math.min(1.2, (1.07 * deficit) / (0.33 * B.stature));
    hipY = B.standShoulder - deficit - B.torso * Math.cos(lean);
  }
  const shoulderY = hipY + B.torso * Math.cos(lean);
  const shoulderZ = barZ;
  const hipZ = shoulderZ - B.torso * Math.sin(lean);
  const pose = { lean, grip: rel < 1, body: B, hip: { y: hipY }, shoulderY };
  for (const side of [-1, 1]) {
    const key = side < 0 ? 'L' : 'R';
    const hip = { x: side * B.hipHalf, y: hipY, z: hipZ };
    const ankle = { x: side * B.footHalf, y: B.ankleY, z: barZ - 0.05 };
    // knees forward and slightly outward
    const leg = twoBone3(hip, ankle, B.thigh, B.shin, { x: side * 0.35, y: 0, z: 1 });
    const shoulder = { x: side * B.shoulderHalf, y: shoulderY, z: shoulderZ };
    const gripHand = { x: side * gripHalf, y: barY, z: barZ };
    const hang = { x: side * (B.shoulderHalf + 0.05), y: shoulderY - B.arm * 0.99, z: shoulderZ };
    const e = rel * rel * (3 - 2 * rel);
    // released arms swing down in front of the body (an arc), not straight past the shoulder
    const hand = { x: gripHand.x + (hang.x - gripHand.x) * e, y: gripHand.y + (hang.y - gripHand.y) * e, z: barZ + 0.3 * B.arm * Math.sin(Math.PI * e) };
    // elbows out and a little back: never parallel to the arm, so they never flip sides
    const arm = twoBone3(shoulder, hand, B.upperArm, B.forearm, { x: side, y: 0, z: -0.35 });
    pose[key] = { hip, knee: leg.joint, ankle: leg.end, legReached: leg.reached, shoulder, elbow: arm.joint, hand: arm.end, armReached: arm.reached };
  }
  pose.head = { x: 0, y: shoulderY + B.neck * Math.max(0.45, Math.cos(lean)), z: shoulderZ };
  return pose;
}

/** Convert a metre-space point to SVG pixels: origin = (pixel x of centre line, pixel y of floor). */
export const toPx = (pt, ox, oy, scale) => ({ x: ox + pt.x * scale, y: oy - pt.y * scale });

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Draw a front-view pose (from lifterPose) as flat SVG. Limb stroke widths scale with
 * `scale` (px per metre) so proportions match at any zoom.
 */
export function drawFigure(pose, ox, oy, scale, { shirt = 'shirt' } = {}) {
  const P = (pt) => toPx(pt, ox, oy, scale);
  const path = (...pts) => pts.map((pt, i) => `${i ? 'L' : 'M'}${r1(P(pt).x)} ${r1(P(pt).y)}`).join('');
  const L = pose.L, R = pose.R;
  const w = (m) => r1(m * scale);
  const head = P(pose.head);
  const shoulderL = P(L.shoulder), shoulderR = P(R.shoulder), hipL = P(L.hip), hipR = P(R.hip);
  const legs = `<path class="limb" style="stroke-width:${w(0.12)}" d="${path(L.hip, L.knee, L.ankle)}${path(R.hip, R.knee, R.ankle)}"/>`;
  const feet = [L, R].map((s) => { const a = P(s.ankle); const dir = s.ankle.x < 0 ? -1 : 1; return `<path class="shoe" d="M${r1(a.x - dir * w(0.04))} ${r1(oy)}H${r1(a.x + dir * w(0.12))}V${r1(oy - w(0.06))}Q${r1(a.x)} ${r1(oy - w(0.11))} ${r1(a.x - dir * w(0.04))} ${r1(oy - w(0.07))}Z"/>`; }).join('');
  const shorts = `<path class="shorts" d="M${r1(hipL.x - w(0.07))} ${r1(hipL.y - w(0.06))}H${r1(hipR.x + w(0.07))}L${r1(hipR.x + w(0.08))} ${r1(hipR.y + w(0.12))}H${r1(hipL.x - w(0.08))}Z"/>`;
  const torso = `<path class="${shirt}" d="M${r1(shoulderL.x - w(0.04))} ${r1(shoulderL.y)}Q${r1((shoulderL.x + shoulderR.x) / 2)} ${r1(shoulderL.y - w(0.05))} ${r1(shoulderR.x + w(0.04))} ${r1(shoulderR.y)}L${r1(hipR.x + w(0.07))} ${r1(hipR.y - w(0.04))}H${r1(hipL.x - w(0.07))}Z"/>`;
  const arms = `<path class="limb arm" style="stroke-width:${w(0.085)}" d="${path(L.shoulder, L.elbow, L.hand)}${path(R.shoulder, R.elbow, R.hand)}"/>`;
  const hands = [L, R].map((s) => { const h = P(s.hand); return `<circle class="skin" cx="${r1(h.x)}" cy="${r1(h.y)}" r="${w(0.05)}"/>`; }).join('');
  const hr = w((pose.body ?? BODY).headR);
  const headSvg = `<circle class="skin" cx="${r1(head.x)}" cy="${r1(head.y)}" r="${hr}"/><path class="hair" d="M${r1(head.x - hr)} ${r1(head.y - hr * 0.1)}Q${r1(head.x - hr * 0.8)} ${r1(head.y - hr * 1.35)} ${r1(head.x + hr * 0.25)} ${r1(head.y - hr * 1.05)}Q${r1(head.x + hr * 1.05)} ${r1(head.y - hr * 0.95)} ${r1(head.x + hr)} ${r1(head.y - hr * 0.25)}Q${r1(head.x)} ${r1(head.y - hr * 0.65)} ${r1(head.x - hr)} ${r1(head.y - hr * 0.1)}Z"/>`;
  const neck = `<path class="limb arm" style="stroke-width:${w(0.09)}" d="M${r1(head.x)} ${r1(head.y + hr * 0.8)}V${r1((shoulderL.y + shoulderR.y) / 2)}"/>`;
  return `<g class="person rig">${legs}${feet}${shorts}${neck}${torso}${headSvg}${arms}${hands}</g>`;
}

/** Every segment length in a pose, for invariant tests. */
export function segmentLengths(pose) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
  return ['L', 'R'].flatMap((k) => [
    ['thigh', d(pose[k].hip, pose[k].knee)],
    ['shin', d(pose[k].knee, pose[k].ankle)],
    ['upperArm', d(pose[k].shoulder, pose[k].elbow)],
    ['forearm', d(pose[k].elbow, pose[k].hand)],
  ]);
}
