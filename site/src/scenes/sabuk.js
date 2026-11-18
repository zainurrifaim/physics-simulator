// Seat-belt crash test, side view, drawn to one true scale (100 px = 1 m).
// The car touches the wall at t = 0 and its crumple zone shortens by exactly the sampled
// `position`. The visible dummy is the front-left passenger (right-hand-drive car, as in
// Indonesia), so the obstacle DASH_GAP ahead of the chest is the dashboard. The dummy is a
// fixed-length rig (two-bone IK from rig.js): belted it stays in its seat; with a torn belt
// its chest moves forward by exactly `s.dummyOffset` (hips slide a little, the torso pivots
// at the hips, the head whips forward) until it reaches the dashboard.
import { arrow, tag, svg, sub, vlen } from './draw.js';
import { twoBone, BODY } from './rig.js';
import { DASH_GAP } from '../physics/models.js';

export const PX_PER_M = 100;
export const ROAD = 321;           // road surface; the roof stays below the setup guides (y ≤ 169)
export const WALL_X = 545;           // face of the test wall (px)
const WALL_W = 40;
const WALL_TOP = 150;

const d2r = Math.PI / 180;
/** Readout panel, status tag and left tags: inside the portrait camera (x 10…590). */
export const READOUT = { x: 386, y: 16, w: 196, h: 98 };
export const STATUS = { x: 360, y: 134 };
const TAG_X = 104;
/** Left tags sit below the speed setup guide and its label (y ≈ 40…85). */
export const TAG_Y = [98, 122, 146, 170];
/** Weight and seat normal force: equal arrows (N = m·g, no vertical acceleration). */
const WEIGHT_PX = 34;
/** Speed setup guide: x = 170 + v0 · SPEED_PX (stays left of the readout panel at 120 km/jam). */
export const SPEED_PX = 1.65;
/** Height of the s drag handle: middle of the bonnet / crumple zone. */
export const DISTANCE_HANDLE_Y = ROAD - 0.56 * PX_PER_M;
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Car dimensions in metres (car frame: x forward from the rear bumper, y up from the road).
 * A 4,5 m car. The crumple zone (firewall → front bumper) is 1,7 m: the maximum stopping
 * distance of 1 m plus room for the front wheel pushed back against the firewall, so the
 * cabin is never crushed.
 */
export const CAR = {
  length: 4.5,
  firewall: 2.8,
  wheelR: 0.31,
  rearWheel: 0.85,
  frontWheel: 4.5 - 0.85,  // nominal front axle
  wheelGap: 0.03,          // crushed metal ↔ tyre clearance when the wheel is pushed back
  sill: 0.22,
  floor: 0.25,
  belt: 0.98,              // hood / window line at the firewall
  roof: 1.42,
  roofRear: 2.8 - 1.36,
  roofFront: 2.8 - 0.72,
  rearGlass: 2.8 - 1.8,     // base of the rear window
  cabinRear: 2.8 - 1.6,     // rear edge of the interior cut-away
};
CAR.crumple = CAR.length - CAR.firewall;
/** Furthest back the front wheel can be pushed (tyre touching the firewall). */
export const FRONT_WHEEL_MIN = CAR.firewall + CAR.wheelR + 0.02;

/** Seated dummy layout in the car frame (metres). */
export const SEAT = {
  hip: { x: CAR.firewall - 1.0, y: 0.56 },
  ankle: { x: CAR.firewall - 0.17, y: 0.32 },
  recline: -22 * d2r,      // torso angle from vertical, negative = leaning back
  hipSlide: 0.13,          // hips slide this far forward on the seat when thrown (knees reach the bolster)
  neckFlex: 22 * d2r,      // head whips forward by this much at impact
};
const CHEST_UP = 0.38;     // chest point: along the spine from the hip joint …
const CHEST_FWD = 0.11;    // … and forward to the front surface of the chest
const FOOT = 0.17;

const torsoDir = (th) => ({ x: Math.sin(th), y: Math.cos(th) });
const chestOf = (hip, th) => ({ x: hip.x + CHEST_UP * Math.sin(th) + CHEST_FWD * Math.cos(th), y: hip.y + CHEST_UP * Math.cos(th) - CHEST_FWD * Math.sin(th) });

/** Chest point of the belted dummy (car frame). */
export const CHEST0 = chestOf(SEAT.hip, SEAT.recline);

function torsoAngle(offset) {
  const k = Math.max(0, Math.min(1, offset / DASH_GAP));
  const hip = { x: SEAT.hip.x + SEAT.hipSlide * k, y: SEAT.hip.y };
  const target = CHEST0.x + offset;
  let lo = SEAT.recline - 0.3, hi = 85 * d2r;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (chestOf(hip, m).x < target) lo = m; else hi = m; }
  return { hip, th: offset <= 0 ? SEAT.recline : (lo + hi) / 2, k };
}

/** Dashboard lip: the point the chest reaches at dummyOffset = DASH_GAP (car frame). */
export const DASH = (() => { const { hip, th } = torsoAngle(DASH_GAP); return { x: CHEST0.x + DASH_GAP, y: chestOf(hip, th).y }; })();

/**
 * Side-view seated pose for a forward slide `offset` (m) relative to the seat.
 * offset = 0: belted posture, hands resting on the thighs, feet on the floor.
 * The chest point is exactly CHEST0.x + offset; every limb keeps its length.
 */
export function seatedPose(offset = 0) {
  const { hip, th, k } = torsoAngle(offset);
  const u = torsoDir(th);
  const shoulder = { x: hip.x + BODY.torso * u.x, y: hip.y + BODY.torso * u.y };
  const leg = twoBone(hip, SEAT.ankle, BODY.thigh, BODY.shin, 1);            // knee up
  const toe = { x: SEAT.ankle.x + FOOT * Math.cos(35 * d2r), y: SEAT.ankle.y + FOOT * Math.sin(35 * d2r) };
  // hands rest on the thigh, 45 % of the way to the knee, just above it
  const tx = leg.joint.x - hip.x, ty = leg.joint.y - hip.y, tl = Math.hypot(tx, ty);
  const lap = { x: hip.x + tx * 0.45 - (ty / tl) * 0.07, y: hip.y + ty * 0.45 + (tx / tl) * 0.07 };
  const arm = twoBone(shoulder, lap, BODY.upperArm, BODY.forearm, -1);       // elbow back
  const na = th + SEAT.neckFlex * k;
  const head = { x: shoulder.x + BODY.neck * Math.sin(na), y: shoulder.y + BODY.neck * Math.cos(na) };
  return {
    offset, torsoAngle: th, neckAngle: na, hip, shoulder, head,
    knee: leg.joint, ankle: leg.end, toe, legReached: leg.reached,
    elbow: arm.joint, hand: arm.end, armReached: arm.reached,
    chest: chestOf(hip, th),
  };
}

/** Segment lengths of a seated pose, for invariant tests. */
export function seatedLengths(pose) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  return {
    thigh: d(pose.hip, pose.knee), shin: d(pose.knee, pose.ankle),
    upperArm: d(pose.shoulder, pose.elbow), forearm: d(pose.elbow, pose.hand),
    torso: d(pose.hip, pose.shoulder), neck: d(pose.shoulder, pose.head), foot: d(pose.ankle, pose.toe),
  };
}

/**
 * Everything the scene draws, in pixels, for a sampled state (exported for tests).
 * rear/firewall/front: car x positions; crumplePx: current crumple-zone length.
 */
export function geometry(p, r, s) {
  const S = PX_PER_M;
  const position = s.position;
  const rear = WALL_X - CAR.length * S + position * S;
  const P = (pt) => ({ x: rear + pt.x * S, y: ROAD - pt.y * S });
  const frontCar = CAR.length - position;                     // front bumper in the car frame
  const frontWheelCar = Math.max(FRONT_WHEEL_MIN, Math.min(CAR.frontWheel, frontCar - CAR.wheelR - CAR.wheelGap));
  const offset = s.beltIntact ? 0 : s.dummyOffset;
  const poseM = seatedPose(offset);
  const pose = Object.fromEntries(Object.entries(poseM).map(([k, v]) => [k, v && typeof v === 'object' ? P(v) : v]));
  return {
    rear, P,
    firewall: rear + CAR.firewall * S,
    front: rear + frontCar * S,
    crumplePx: (frontCar - CAR.firewall) * S,
    crumpleFullPx: CAR.crumple * S,
    // wheels roll without slipping: rotation = ground travel of the wheel centre / R
    // (the front wheel stops turning once it is pushed back against the firewall)
    rearWheel: { ...P({ x: CAR.rearWheel, y: CAR.wheelR }), r: CAR.wheelR * S, angle: position / CAR.wheelR },
    frontWheel: { ...P({ x: frontWheelCar, y: CAR.wheelR }), r: CAR.wheelR * S, angle: (position + frontWheelCar - CAR.frontWheel) / CAR.wheelR },
    seatHip: P(SEAT.hip),
    chest0: P(CHEST0),
    dash: P(DASH),
    poseM, pose,
    dummyOffsetPx: pose.chest.x - P(CHEST0).x,
  };
}

// ---------------------------------------------------------------- drawing

const path = (pts, close = false) => pts.map((pt, i) => `${i ? 'L' : 'M'}${r1(pt.x)} ${r1(pt.y)}`).join('') + (close ? 'Z' : '');

/** Crash-test target (yellow/black quadrants) at a pixel point. */
const target = (c, rad) => `<g class="cd-target"><circle cx="${r1(c.x)}" cy="${r1(c.y)}" r="${r1(rad)}"/><path d="M${r1(c.x)} ${r1(c.y)}V${r1(c.y - rad)}A${r1(rad)} ${r1(rad)} 0 0 1 ${r1(c.x + rad)} ${r1(c.y)}ZM${r1(c.x)} ${r1(c.y)}V${r1(c.y + rad)}A${r1(rad)} ${r1(rad)} 0 0 1 ${r1(c.x - rad)} ${r1(c.y)}Z"/></g>`;

/** Side-view crash-test dummy from a metre-space pose, through the pixel mapping P. */
function drawDummy(pm, P, cls = '') {
  const S = PX_PER_M;
  const w = (m) => r1(m * S);
  const th = pm.torsoAngle;
  const u = torsoDir(th), n = { x: Math.cos(th), y: -Math.sin(th) };
  const at = (a, b) => P({ x: pm.hip.x + u.x * a + n.x * b, y: pm.hip.y + u.y * a + n.y * b });
  const torso = path([at(-0.06, -0.1), at(-0.04, 0.1), at(0.2, 0.12), at(CHEST_UP, CHEST_FWD), at(0.5, 0.08), at(0.56, 0.02), at(0.55, -0.08), at(0.3, -0.11)], true);
  const hip = P(pm.hip), knee = P(pm.knee), ankle = P(pm.ankle), toe = P(pm.toe), sh = P(pm.shoulder), el = P(pm.elbow), hand = P(pm.hand), head = P(pm.head);
  const ah = (pm.neckAngle), hr = BODY.headR * S;
  const face = { x: head.x + Math.cos(ah) * hr * 0.55, y: head.y + Math.sin(ah) * hr * 0.55 };
  return `<g class="cdummy${cls}">
    <path class="cd-limb" style="stroke-width:${w(0.11)}" d="${path([hip, knee, ankle])}"/>
    <path class="cd-shoe" style="stroke-width:${w(0.08)}" d="${path([ankle, toe])}"/>
    <circle class="cd-body" cx="${r1(hip.x)}" cy="${r1(hip.y)}" r="${w(0.1)}"/>
    <path class="cd-limb" style="stroke-width:${w(0.07)}" d="${path([sh, head])}"/>
    <path class="cd-body" d="${torso}"/>
    <circle class="cd-body" cx="${r1(head.x)}" cy="${r1(head.y)}" r="${r1(hr)}"/>
    ${cls ? '' : target(face, hr * 0.42)}
    ${cls ? '' : target(hip, w(0.05))}
    <path class="cd-limb" style="stroke-width:${w(0.065)}" d="${path([sh, el, hand])}"/>
    ${cls ? '' : `<circle class="cd-joint" cx="${r1(knee.x)}" cy="${r1(knee.y)}" r="${w(0.025)}"/><circle class="cd-joint" cx="${r1(el.x)}" cy="${r1(el.y)}" r="${w(0.02)}"/>`}
    <circle class="cd-body" cx="${r1(hand.x)}" cy="${r1(hand.y)}" r="${w(0.04)}"/>
  </g>`;
}

function drawHood(g, position) {
  // Uncrushed profile: top falls from the window line to the nose; folds collect at the front.
  const S = PX_PER_M;
  const fw = g.firewall, front = g.front;
  const top = (x) => ROAD - (CAR.belt - 0.16 * Math.min(1, (x - CAR.firewall) / (CAR.crumple - 0.25))) * S;
  const yNose = ROAD - 0.7 * S, yBumper = ROAD - 0.3 * S, ySill = ROAD - CAR.sill * S;
  if (position <= 1e-9) {
    return `<path class="car-body" d="M${r1(fw)} ${r1(top(CAR.firewall))}L${r1(front - 0.25 * S)} ${r1(top(CAR.length - 0.25))}Q${r1(front)} ${r1(top(CAR.length - 0.25))} ${r1(front)} ${r1(yNose)}V${r1(yBumper)}Q${r1(front)} ${r1(ySill)} ${r1(front - 0.2 * S)} ${r1(ySill)}H${r1(fw)}Z"/>`;
  }
  const fold = Math.min(g.crumplePx * 0.6, (0.12 + position * 0.3) * S);
  const n = Math.min(9, Math.max(2, Math.round(2 + position * 3.5)));
  const amp = Math.min(4.5, 2.5 + position * 3);
  const start = front - fold;
  const topStart = top(CAR.firewall + (start - fw) / S);
  const topEnd = ROAD - 0.76 * S;
  const zTop = [], zBot = [];
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const x = start + fold * t;
    const s = i % 2 ? -1 : 1;
    zTop.push(`${r1(x)} ${r1(topStart + (topEnd - topStart) * t + s * amp)}`);
    zBot.push(`${r1(front - fold * t)} ${r1(ySill + (i % 2 ? amp * 0.7 : 0))}`);
  }
  return `<path class="car-body" d="M${r1(fw)} ${r1(top(CAR.firewall))}L${r1(start)} ${r1(topStart)}L${zTop.join('L')}L${r1(front)} ${r1(topEnd)}V${r1(ySill - 4)}L${zBot.join('L')}L${r1(start)} ${r1(ySill)}H${r1(fw)}Z"/>
    <path class="crumple-folds" d="${Array.from({ length: n }, (_, i) => { const x = start + fold * ((i + 1) / (n + 1)); return `M${r1(x)} ${r1(topStart + 6)}L${r1(x + (i % 2 ? 5 : -5))} ${r1((topStart + ySill) / 2)}L${r1(x)} ${r1(ySill - 4)}`; }).join('')}"/>`;
}

function wheel(w, angle) {
  const spokes = [0, 1, 2].map((i) => { const a = angle + (i * 2 * Math.PI) / 3; return `M${r1(w.x)} ${r1(w.y)}L${r1(w.x + Math.cos(a) * w.r * 0.62)} ${r1(w.y + Math.sin(a) * w.r * 0.62)}`; }).join('');
  return `<g class="wheel"><circle cx="${r1(w.x)}" cy="${r1(w.y)}" r="${r1(w.r)}"/><circle class="hub" cx="${r1(w.x)}" cy="${r1(w.y)}" r="${r1(w.r * 0.62)}"/><path class="spokes" d="${spokes}"/></g>`;
}

function readout(p, r, s, f) {
  const x0 = READOUT.x, y0 = READOUT.y, wBar = 92;
  const bar = (y, frac, cls) => `<rect class="ro-track" x="${x0 + 62}" y="${y - 7}" width="${wBar}" height="9" rx="3"/><rect class="ro-bar ${cls}" x="${x0 + 62}" y="${y - 7}" width="${r1(Math.max(0, Math.min(1, frac)) * wBar)}" height="9" rx="3"/>`;
  const vRef = Math.max(r.v0, 1e-9);
  const fRef = Math.max(p.limit, r.force) * 1.08;
  const limX = x0 + 62 + (p.limit / fRef) * wBar;
  const torn = !s.beltIntact;
  const fText = torn ? 'robek' : `${f(s.beltForce)} N`;
  return `<g class="readout">
    <rect class="ro-bg" x="${x0}" y="${y0}" width="${READOUT.w}" height="${READOUT.h}" rx="8"/>
    <text class="ro-label" x="${x0 + 8}" y="${y0 + 22}">v mobil</text>${bar(y0 + 22, s.speed / vRef, 'velocity')}<text class="ro-value" x="${x0 + 188}" y="${y0 + 22}" text-anchor="end">${f(s.speed, 1)}</text>
    <text class="ro-label" x="${x0 + 8}" y="${y0 + 44}">v dummy</text>${bar(y0 + 44, s.dummySpeed / vRef, torn ? 'warn' : 'velocity')}<text class="ro-value" x="${x0 + 188}" y="${y0 + 44}" text-anchor="end">${f(s.dummySpeed, 1)}</text>
    <text class="ro-unit" x="${x0 + 188}" y="${y0 + 56}" text-anchor="end">m/s</text>
    <text class="ro-label" x="${x0 + 8}" y="${y0 + 76}">F sabuk</text>${bar(y0 + 76, s.beltForce / fRef, 'force')}
    <path class="ro-limit" d="M${r1(limX)} ${y0 + 64}V${y0 + 83}"/>
    <text class="ro-value${torn ? ' warn' : ''}" x="${x0 + 188}" y="${y0 + 76}" text-anchor="end">${torn ? '✗' : ''}</text>
    <text class="ro-note${torn ? ' warn' : ''}" x="${x0 + 8}" y="${y0 + 93}">${torn ? `butuh ${f(r.force, 0)} N ≥ ${f(p.limit)} N → ${fText}` : `${fText} · batas ${f(p.limit)} N`}</text>
  </g>`;
}

export function render(p, r, s, f) {
  const S = PX_PER_M;
  const g = geometry(p, r, s);
  const { P, pose, poseM } = g;
  const torn = !s.beltIntact;
  const impact = s.phase === 'impact';

  // ---- car body (rear part is rigid; everything ahead of the firewall is the crumple zone)
  const body = path([
    P({ x: 0, y: 0.3 }), P({ x: 0, y: 0.84 }), P({ x: CAR.rearGlass - 0.1, y: 0.93 }), P({ x: CAR.rearGlass, y: 0.95 }),
    P({ x: CAR.roofRear, y: CAR.roof }), P({ x: CAR.roofFront, y: CAR.roof }), P({ x: CAR.firewall + 0.02, y: CAR.belt }),
    P({ x: CAR.firewall + 0.02, y: CAR.sill }), P({ x: 0.15, y: CAR.sill }),
  ], true);
  const interior = path([
    P({ x: CAR.cabinRear, y: CAR.floor }), P({ x: CAR.cabinRear, y: 0.95 }), P({ x: CAR.roofRear + 0.06, y: CAR.roof - 0.05 }),
    P({ x: CAR.roofFront - 0.02, y: CAR.roof - 0.05 }), P({ x: CAR.firewall - 0.04, y: CAR.belt + 0.01 }), P({ x: CAR.firewall, y: CAR.floor }),
  ], true);
  const windowLine = path([P({ x: CAR.cabinRear, y: 0.95 }), P({ x: CAR.firewall - 0.02, y: 0.95 })]);
  // seat (fixed to the car)
  const u0 = torsoDir(SEAT.recline), n0 = { x: Math.cos(SEAT.recline), y: -Math.sin(SEAT.recline) };
  const sb = (a, b) => P({ x: SEAT.hip.x + u0.x * a + n0.x * b, y: SEAT.hip.y + u0.y * a + n0.y * b });
  const seat = `<g class="seat-parts">
    <path class="seat" d="${path([sb(-0.08, -0.12), sb(0.64, -0.12), sb(0.64, -0.25), sb(-0.08, -0.25)], true)}"/>
    <path class="seat" d="${path([sb(0.68, -0.13), sb(0.84, -0.13), sb(0.84, -0.24), sb(0.68, -0.24)], true)}"/>
    <path class="seat" d="${path([P({ x: SEAT.hip.x - 0.24, y: 0.5 }), P({ x: SEAT.hip.x + 0.34, y: 0.52 }), P({ x: SEAT.hip.x + 0.34, y: 0.42 }), P({ x: SEAT.hip.x - 0.24, y: 0.4 })], true)}"/>
    <path class="seat-rail" d="${path([P({ x: SEAT.hip.x - 0.15, y: 0.4 }), P({ x: SEAT.hip.x - 0.15, y: CAR.floor }), P({ x: SEAT.hip.x + 0.25, y: CAR.floor }), P({ x: SEAT.hip.x + 0.25, y: 0.42 })])}"/>
  </g>`;
  // dashboard: lip at DASH (the 0,45 m gap ends here), knee bolster below, open footwell
  const dash = `<path class="dash" d="${path([
    P(DASH), P({ x: DASH.x + 0.14, y: CAR.belt + 0.01 }), P({ x: CAR.firewall, y: CAR.belt + 0.01 }), P({ x: CAR.firewall, y: 0.52 }),
    P({ x: DASH.x + 0.47, y: 0.52 }), P({ x: DASH.x + 0.02, y: DASH.y - 0.06 }),
  ], true)}"/>`;
  const pillars = `<path class="car-frame" d="${path([P({ x: CAR.rearGlass, y: 0.95 }), P({ x: CAR.roofRear, y: CAR.roof }), P({ x: CAR.roofFront, y: CAR.roof }), P({ x: CAR.firewall + 0.02, y: CAR.belt })])}"/>`;

  // ---- belt
  const th = poseM.torsoAngle, u = torsoDir(th), n = { x: Math.cos(th), y: -Math.sin(th) };
  const onBody = (a, b) => P({ x: poseM.hip.x + u.x * a + n.x * b, y: poseM.hip.y + u.y * a + n.y * b });
  const anchor = sb(0.66, -0.2), lapAnchor = P({ x: SEAT.hip.x - 0.16, y: 0.47 }), buckle = P({ x: SEAT.hip.x + 0.12, y: 0.46 });
  let belt;
  if (!torn) {
    belt = `<path class="belt" d="${path([anchor, onBody(0.54, 0.04), onBody(CHEST_UP - 0.04, CHEST_FWD + 0.005), onBody(0.06, 0.11), buckle])}${path([lapAnchor, onBody(0.02, 0.11), buckle])}"/>`;
  } else {
    // torn ends hang loose from the anchors; their swing follows the dummy's slide
    const k = Math.min(1, s.dummyOffset / DASH_GAP);
    const swing = (35 + 30 * Math.sin(k * Math.PI * 3)) * d2r;
    const end = (a0, len, ang) => ({ x: a0.x + Math.sin(ang) * len * S, y: a0.y + Math.cos(ang) * len * S });
    belt = `<path class="belt broken" d="${path([anchor, end(anchor, 0.22, swing)])}${path([lapAnchor, end(lapAnchor, 0.12, swing * 0.6)])}${path([buckle, end(buckle, 0.1, -swing * 0.5)])}"/>`;
  }

  const ghost = torn ? drawDummy(seatedPose(0), P, ' ghost') : '';
  const bricks = Array.from({ length: Math.floor((ROAD - WALL_TOP) / 20) }, (_, i) => `M${WALL_X} ${WALL_TOP + 20 + i * 20}H${WALL_X + WALL_W}`).join('')
    + Array.from({ length: Math.floor((ROAD - WALL_TOP) / 20) }, (_, i) => `M${WALL_X + (i % 2 ? 13 : 27)} ${WALL_TOP + i * 20}v20`).join('');
  const cracks = s.position > 1e-6 ? `<path class="wall-crack" d="M${WALL_X} ${ROAD - 50}l9 -7l-3 -9l10 -6M${WALL_X} ${ROAD - 32}l12 4l6 -6"/>` : '';

  // ---- annotation
  const dimY = ROAD + 20;
  const sX = WALL_X - p.distance * S;
  const crushedX = WALL_X - s.position * S;
  const zone = s.phase === 'ready' ? `<rect class="crumple-zone" x="${r1(sX)}" y="${r1(ROAD - 0.86 * S)}" width="${r1(p.distance * S)}" height="${r1(0.6 * S)}"/>` : '';
  const gapM = DASH_GAP - (torn ? s.dummyOffset : 0);
  const gapY = ROAD - 1.2 * S;   // above the force arrows, below the roof
  const gapDim = gapM > 0.12
    ? `<g class="gap-dim"><path d="M${r1(pose.chest.x)} ${r1(gapY)}H${r1(g.dash.x)}M${r1(pose.chest.x)} ${r1(gapY - 4)}v8M${r1(g.dash.x)} ${r1(gapY - 4)}v8"/><text x="${r1((pose.chest.x + g.dash.x) / 2)}" y="${r1(gapY - 6)}" text-anchor="middle">${f(gapM, 2)} m</text></g>`
    : '';
  const status = impact ? tag(STATUS.x, STATUS.y, `Membentur dasbor · kecepatan relatif ${f(r.impactSpeed, 1)} m/s`, 'warn')
    : torn ? tag(STATUS.x, STATUS.y, 'SABUK ROBEK!', 'warn')
    : s.phase === 'braking' ? tag(STATUS.x, STATUS.y, 'Sabuk menahan', 'ok')
    : s.phase === 'stopped' ? tag(STATUS.x, STATUS.y, 'Sabuk menahan · dummy aman', 'ok') : '';
  const burst = impact ? (() => {
    const c = g.dash;
    const pts = Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8, rr = i % 2 ? 5 : 12; return { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr }; });
    return `<path class="impact-burst" d="${path(pts, true)}"/>`;
  })() : '';

  const belted = !torn;
  const beltF = belted ? s.beltForce : 0;
  const fx = pose.chest.x, fy = pose.chest.y;
  const speedLen = r.v0 > 0 ? (s.speed / r.v0) * 90 : 0;
  // velocity arrow rides above the hood, ahead of the windscreen (clear of the setup guides)
  const vY = ROAD - (CAR.belt + 0.14) * S;
  const vX = g.firewall + 8;
  const cg = P({ x: poseM.hip.x + 0.1, y: poseM.hip.y + 0.15 });

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="${ROAD}"/>
    <rect class="road" x="0" y="${ROAD}" width="600" height="${380 - ROAD}"/>
    <path class="road-line" d="M20 ${ROAD + 52}H90M140 ${ROAD + 52}H210M260 ${ROAD + 52}H330M380 ${ROAD + 52}H450"/>
    <g class="test-wall"><rect x="${WALL_X}" y="${WALL_TOP}" width="${WALL_W}" height="${ROAD - WALL_TOP}"/><path d="${bricks}"/>${cracks}</g>
    <g class="car sabuk-car">
      <path class="car-body" d="${body}"/>
      ${drawHood(g, s.position)}
      <path class="car-interior" d="${interior}"/>
      <path class="car-window-line" d="${windowLine}"/>
      ${seat}
      ${dash}
      ${ghost}
      ${drawDummy(poseM, P)}
      ${belt}
      ${pillars}
      ${wheel(g.rearWheel, g.rearWheel.angle)}${wheel(g.frontWheel, g.frontWheel.angle)}
      ${burst}
    </g>
    ${zone}
    <g class="layer layer-labels">
      ${tag(TAG_X, TAG_Y[0], `v${sub('0')} = ${f(p.speed)} km/jam (${f(r.v0, 1)} m/s)`, 'accent')}
      ${tag(TAG_X, TAG_Y[1], `m${sub('dummy')} = ${f(p.mass)} kg`)}
      ${tag(TAG_X, TAG_Y[2], `M${sub('mobil')} = ${f(p.carMass)} kg`)}
      ${tag(TAG_X, TAG_Y[3], `Sabuk robek ≥ ${f(p.limit)} N`)}
      ${readout(p, r, s, f)}
      ${status}
      ${gapDim}
      <g class="dim sabuk-dim">
        <path d="M${r1(sX)} ${dimY}H${WALL_X}M${r1(sX)} ${dimY - 6}V${dimY + 6}M${WALL_X} ${dimY - 6}V${dimY + 6}"/>
        ${s.position > 1e-6 ? `<rect class="crushed-bar" x="${r1(crushedX)}" y="${dimY - 3}" width="${r1(s.position * S)}" height="6"/>` : ''}
        <text x="${r1(Math.min(sX + p.distance * S / 2, WALL_X - 60))}" y="${dimY + 18}" text-anchor="middle">s = ${f(p.distance)} m (zona remuk)</text>
      </g>
      <g class="dim sabuk-dim"><path d="M16 ${dimY}H${16 + S}M16 ${dimY - 5}v10M${16 + S} ${dimY - 5}v10"/><text x="${16 + S / 2}" y="${dimY + 18}" text-anchor="middle">1 m</text></g>
    </g>
    <g class="layer layer-forces">
      ${beltF > 0 ? (() => {
        const tip = fx - vlen(beltF, Math.max(p.limit, r.force), 90, 26);
        // label above the arrow, inside the cabin (starts at the cabin's rear edge at the earliest)
        const lx = Math.max(tip, P({ x: CAR.cabinRear + 0.04, y: 0 }).x);
        return `${arrow(fx, fy, tip, fy, 'force', '')}<g class="vec vec-force"><text class="vec-label" x="${r1(lx)}" y="${r1(fy - 9)}">F${sub('sabuk')} = ${f(beltF)} N</text></g>`;
      })() : ''}
      ${arrow(cg.x, cg.y, cg.x, cg.y + WEIGHT_PX, 'force', `F${sub('g')}`)}
      ${arrow(cg.x, cg.y, cg.x, cg.y - WEIGHT_PX, 'force', 'N')}
      <circle class="vec-dot" cx="${r1(cg.x)}" cy="${r1(cg.y)}" r="3"/>
    </g>
    <g class="layer layer-motion">
      ${arrow(vX, vY, vX + speedLen, vY, 'velocity', speedLen > 4 ? `v = ${f(s.speed, 1)} m/s` : '', { labelSide: 'center' })}
      ${speedLen <= 4 ? tag(vX + 30, vY, 'v = 0') : ''}
    </g>
  `,
    `Uji tabrak mobil pada ${f(p.speed)} kilometer per jam; sabuk pengaman ${r.fails ? 'robek dan dummy membentur dasbor' : 'menahan dummy di kursi'}`
  );
}

export const camera = { desktop: '0 0 600 380', portrait: '10 10 580 360' };

/** Drag handle for an interactive parameter, in scene coordinates. */
export function handle(key, p) {
  // distance: on the crumple zone, at the rear end of the strip that will be crushed
  // (true scale; dragging left lengthens s)
  return key === 'distance'
    ? { x: WALL_X - p.distance * PX_PER_M, y: DISTANCE_HANDLE_Y, axis: 'x', factor: -1 / PX_PER_M }
    : { x: 170 + p.speed * SPEED_PX, y: 70, axis: 'x', factor: 1 / SPEED_PX };
}
