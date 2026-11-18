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

/** Lowest bar height (grip centre) a standing lifter reaches without bending the body. */
export const STAND_REACH_LOW = BODY.standShoulder - Math.sqrt((BODY.arm * 0.995) ** 2 - (GRIP_HALF - BODY.shoulderHalf) ** 2);
/** Highest grip height overhead with straight arms. */
export const OVERHEAD_REACH = BODY.standShoulder + Math.sqrt((BODY.arm * 0.999) ** 2 - (GRIP_HALF - BODY.shoulderHalf) ** 2);

/**
 * Front-view weightlifter pose.
 * barY: grip height in metres above the floor. grip = false → hands hang at the sides.
 * Low bars are reached by dropping the hips (knees out) and leaning the torso forward
 * (which shortens the torso in front view), never by lengthening the arms.
 */
export function lifterPose({ barY, grip = true }) {
  const B = BODY;
  const dxArm = GRIP_HALF - B.shoulderHalf;
  let shoulderY = B.standShoulder, hipY = B.standHip, lean = 0;
  if (grip && barY < STAND_REACH_LOW) {
    const need = barY + Math.sqrt((B.arm * 0.995) ** 2 - dxArm ** 2);
    const deficit = B.standShoulder - need;
    hipY = B.standHip - Math.min(deficit * 0.55, 0.36);
    const torsoProj = Math.max(B.torso * Math.cos((80 * Math.PI) / 180), need - hipY);
    lean = Math.acos(Math.min(1, torsoProj / B.torso));
    shoulderY = hipY + torsoProj;
  }
  const pose = { lean, grip, hip: { y: hipY }, shoulderY };
  for (const side of [-1, 1]) {
    const key = side < 0 ? 'L' : 'R';
    const hip = { x: side * B.hipHalf, y: hipY };
    const ankle = { x: side * B.footHalf, y: B.ankleY };
    // knees point outwards (−x for the left leg, +x for the right)
    const leg = twoBone(hip, ankle, B.thigh, B.shin, side < 0 ? -1 : 1);
    const shoulder = { x: side * B.shoulderHalf, y: shoulderY };
    const hand = grip ? { x: side * GRIP_HALF, y: barY } : { x: side * (B.shoulderHalf + 0.06), y: shoulderY - B.arm * 0.99 };
    // elbows point outwards (away from the body)
    const towardDown = hand.y < shoulder.y;
    const bend = side < 0 ? (towardDown ? -1 : 1) : towardDown ? 1 : -1;
    const arm = twoBone(shoulder, hand, B.upperArm, B.forearm, bend);
    pose[key] = { hip, knee: leg.joint, ankle: leg.end, legReached: leg.reached, shoulder, elbow: arm.joint, hand: arm.end, armReached: arm.reached };
  }
  pose.head = { x: 0, y: shoulderY + B.neck * Math.max(0.45, Math.cos(lean)) };
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
  const hr = w(BODY.headR);
  const headSvg = `<circle class="skin" cx="${r1(head.x)}" cy="${r1(head.y)}" r="${hr}"/><path class="hair" d="M${r1(head.x - hr)} ${r1(head.y - hr * 0.1)}Q${r1(head.x - hr * 0.8)} ${r1(head.y - hr * 1.35)} ${r1(head.x + hr * 0.25)} ${r1(head.y - hr * 1.05)}Q${r1(head.x + hr * 1.05)} ${r1(head.y - hr * 0.95)} ${r1(head.x + hr)} ${r1(head.y - hr * 0.25)}Q${r1(head.x)} ${r1(head.y - hr * 0.65)} ${r1(head.x - hr)} ${r1(head.y - hr * 0.1)}Z"/>`;
  const neck = `<path class="limb arm" style="stroke-width:${w(0.09)}" d="M${r1(head.x)} ${r1(head.y + hr * 0.8)}V${r1((shoulderL.y + shoulderR.y) / 2)}"/>`;
  return `<g class="person rig">${legs}${feet}${shorts}${neck}${torso}${headSvg}${arms}${hands}</g>`;
}

/** Every segment length in a pose, for invariant tests. */
export function segmentLengths(pose) {
  const d = (a, b) => hyp(a.x - b.x, a.y - b.y);
  return ['L', 'R'].flatMap((k) => [
    ['thigh', d(pose[k].hip, pose[k].knee)],
    ['shin', d(pose[k].knee, pose[k].ankle)],
    ['upperArm', d(pose[k].shoulder, pose[k].elbow)],
    ['forearm', d(pose[k].elbow, pose[k].hand)],
  ]);
}
