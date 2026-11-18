// Cyclist coasting down a straight, frictionless slope.
// The hill is drawn to ONE true scale (`scale` px per metre, from layout()): the start mark is
// the hilltop corner (plateau level = start height) and the finish mark is the foot of the
// slope on the ground, so h and L are exactly what the model uses. The bike and rider are
// drawn enlarged (BIKE_K px per metre) and the scene says so.
// The enlarged bike is a rigid body whose wheels roll on the drawn track (plateau → slope →
// ground): wheel centres follow the track offset by the wheel radius, so at the hilltop corner
// and at the foot the bike pivots over the corner instead of floating or sinking. The point
// midway between the tyre contacts is the model's particle: its distance along the slope from the
// start mark is s.position × scale at every frame.
// Wheels roll without slipping (angle = centre path length / radius); pedals stay still.
// Force and velocity arrows use fixed scales shared by every setup, so A and B compare honestly.
// Everything drawn comes from layout()/geometry(), which tests check directly.
import { arrow, dimV, tag, svg, sub } from './draw.js';
import { twoBone, BODY } from './rig.js';
import { sample, solve } from '../physics/models.js';

export const BIKE_K = 40;          // px per metre for the (enlarged) bike and rider
export const GROUND_Y = 326;       // flat ground at the foot of the hill
const TOP_MIN = 116;               // highest start point (room for the rider and N above it)
const X0 = 180, X1 = 512;          // horizontal room for the slope (start … finish marks)
export const HANDLE_X = 58;        // height handle on the plateau, left of the waiting rider
export const STROBE = 8;           // stroboscope: number of equal time intervals
export const FORCE_K = 0.04;       // px per newton (same for every setup: 800 N = 32 px)
export const V_K = 90 / Math.sqrt(2 * 10 * 150); // px per m/s (90 px at the fastest possible 54,8 m/s)
export const PANEL = { x0: 380, y0: 0, x1: 560, y1: 116 }; // info panel (tags, energy, legend)
export const VIEW = { x: 40, y: 0, w: 520, h: 380 };
const V_INSET = 9;                 // velocity arrow: px inside the slope line
const DEPTH = { vLabel: 25, fgLabel: 39, lLabel: 58, lHandle: 64, lHandleOut: 175 };

// Bike, side view, in metres: x forward along the slope, y up from the slope surface.
const WHEEL_R = 0.34;
const HALF_BASE = 0.52;
const BIKE = {
  rearAxle: { x: -HALF_BASE, y: WHEEL_R },
  frontAxle: { x: HALF_BASE, y: WHEEL_R },
  bb: { x: -0.08, y: 0.28 },
  seatTop: { x: -0.27, y: 0.86 },
  saddle: { x: -0.298, y: 0.945 },
  headTop: { x: 0.4, y: 0.82 },
  headBottom: { x: 0.44, y: 0.62 },
  stem: { x: 0.4, y: 0.95 },
  handlebar: { x: 0.36, y: 1.0 },
  crank: 0.17,
  chainring: 0.1,
};
// Coasting: cranks held level and never turning.
BIKE.pedalNear = { x: BIKE.bb.x + BIKE.crank, y: BIKE.bb.y };
BIKE.pedalFar = { x: BIKE.bb.x - BIKE.crank, y: BIKE.bb.y };

/** Ankle sits this far from the ball of the foot (which rests on the pedal). */
export const ANKLE_OFFSET = { x: -0.07, y: 0.08 };
const TOE = 0.08;
const TORSO_LEAN = (42 * Math.PI) / 180;
const NECK = { x: 0.09, y: 0.19 };
const COM = { x: -0.05, y: 0.9 };  // approximate centre of mass of bike + rider

/** Rider pose in metres (bike frame). Fixed-length limbs via two-bone IK; constant while coasting. */
export function riderPose() {
  const hip = { x: BIKE.saddle.x + 0.02, y: BIKE.saddle.y + 0.07 };
  const shoulder = { x: hip.x + BODY.torso * Math.cos(TORSO_LEAN), y: hip.y + BODY.torso * Math.sin(TORSO_LEAN) };
  const leg = (pedal) => {
    const ankleTarget = { x: pedal.x + ANKLE_OFFSET.x, y: pedal.y + ANKLE_OFFSET.y };
    const ik = twoBone(hip, ankleTarget, BODY.thigh, BODY.shin, 1); // knee forward
    return { hip, knee: ik.joint, ankle: ik.end, ball: { ...pedal }, toe: { x: pedal.x + TOE, y: pedal.y }, reached: ik.reached };
  };
  const arm = () => {
    const ik = twoBone(shoulder, BIKE.handlebar, BODY.upperArm, BODY.forearm, -1); // elbow back/down
    return { shoulder, elbow: ik.joint, hand: ik.end, reached: ik.reached };
  };
  return {
    hip, shoulder,
    head: { x: shoulder.x + NECK.x, y: shoulder.y + NECK.y },
    legNear: leg(BIKE.pedalNear), legFar: leg(BIKE.pedalFar),
    armNear: arm(), armFar: arm(),
  };
}
const POSE = riderPose();

const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Slope layout for the parameters, in px: true scale, start (= hilltop corner) and finish
 * (= foot on the ground), the h dimension, the L handle and the wheel-centre path.
 */
export function layout(p) {
  const sin = Math.min(1, p.height / p.length);
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const theta = Math.asin(sin);
  const u = { x: cos, y: sin };          // down the slope (screen coordinates, y down)
  const n = { x: sin, y: -cos };         // outward normal (away from the hill)
  const room = X1 - X0;
  const scale = Math.min(cos > 1e-9 ? room / (p.length * cos) : Infinity, (GROUND_Y - TOP_MIN) / p.height);
  const width = p.length * cos * scale;
  const lengthPx = p.length * scale;
  // a steep (narrow) slope sits right of the bottom-left corner, which stays free for the ± panel
  const top = { x: X0 + (room - width) * 0.45, y: GROUND_Y - p.height * scale };
  const finish = { x: top.x + width, y: GROUND_Y };
  const R = WHEEL_R * BIKE_K;
  const tanHalf = Math.tan(theta / 2);
  // wheel-centre path: plateau line, arc of radius R round the hilltop corner, slope line,
  // corner at the foot (wheel touching slope and ground), ground line
  const path = { R, arc: R * theta, slope: lengthPx - R * tanHalf, corner: { x: finish.x + R * tanHalf, y: GROUND_Y - R } };
  // L handle: inside the hill below the slope (never on the bike's path); above the path
  // when the hill is too flat to hold it
  const at = add(top, u, 0.55 * lengthPx);
  const inside = add(at, n, -DEPTH.lHandle);
  const lHandle = inside.y + 18 <= 372 ? inside : add(at, n, DEPTH.lHandleOut);
  const dimX = Math.min(top.x - 56, lHandle.x < top.x ? lHandle.x - 30 : Infinity);
  return { sin, cos, theta, u, n, scale, lengthPx, top, finish, crest: top, foot: finish, path, lHandle, dimX };
}

/** Wheel-centre position on the track's offset path at arc length σ (σ = 0 above the corner). */
export function wheelPath(L, sigma) {
  const { R, arc, slope, corner } = L.path, { top, u, n } = L;
  if (sigma <= 0) return { centre: { x: top.x + sigma, y: top.y - R }, contact: { x: top.x + sigma, y: top.y }, on: 'plateau' };
  if (sigma <= arc) {
    const phi = sigma / R;
    return { centre: { x: top.x + R * Math.sin(phi), y: top.y - R * Math.cos(phi) }, contact: { ...top }, on: 'crest' };
  }
  if (sigma <= arc + slope) {
    const c = add(add(top, n, R), u, sigma - arc);
    return { centre: c, contact: add(c, n, -R), on: 'slope' };
  }
  const c = { x: corner.x + (sigma - arc - slope), y: corner.y };
  return { centre: c, contact: { x: c.x, y: GROUND_Y }, on: 'ground' };
}

const alongOf = (L, pt) => (pt.x - L.top.x) * L.u.x + (pt.y - L.top.y) * L.u.y;
const normalOf = (L, pt) => (pt.x - L.top.x) * L.n.x + (pt.y - L.top.y) * L.n.y;

/** Solve f(x) = target for a non-decreasing f; on a flat stretch take its right end (preferRight) or left end. */
function bisect(f, lo, hi, target, preferRight = false, iterations = 60) {
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (preferRight ? f(mid) <= target + 1e-9 : f(mid) < target - 1e-9) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Rigid bike on the track: wheel arc lengths such that the bike's centre (the point midway
 * between the tyre contacts, i.e. one wheel radius below the midpoint of the wheel centres,
 * measured square to the bike) is `along` px down the slope from the start mark.
 */
export function bikeOnTrack(L, along) {
  const W = 2 * HALF_BASE * BIKE_K;
  const front = (sr) => {
    const cr = wheelPath(L, sr).centre;
    return bisect((sf) => dist(wheelPath(L, sf).centre, cr), sr, sr + 2 * W, W);
  };
  const mid = (sr) => {
    const a = wheelPath(L, sr).centre, b = wheelPath(L, front(sr)).centre;
    const ub = { x: (b.x - a.x) / W, y: (b.y - a.y) / W };
    return alongOf(L, { x: (a.x + b.x) / 2 - ub.y * L.path.R, y: (a.y + b.y) / 2 + ub.x * L.path.R });
  };
  const span = 3 * W + L.path.arc + 10;
  // on a vertical wall the centre does not move while the bike rolls on the plateau or the
  // ground: start with the front wheel at the edge, finish with the rear wheel at the foot
  const sigmaRear = bisect(mid, along - span, along + span, along, along < L.lengthPx / 2);
  const sigmaFront = front(sigmaRear);
  return { sigmaRear, sigmaFront, rear: wheelPath(L, sigmaRear), front: wheelPath(L, sigmaFront) };
}

/** Everything drawn for one state, in px (exported so tests check exactly what is drawn). */
export function geometry(p, r, s) {
  const L = layout(p);
  const along = s.position * L.scale;
  const bike = bikeOnTrack(L, along);
  const cr = bike.rear.centre, cf = bike.front.centre;
  const W = dist(cr, cf);
  const ub = { x: (cf.x - cr.x) / W, y: (cf.y - cr.y) / W };   // bike's forward direction
  const nb = { x: ub.y, y: -ub.x };                             // bike's up direction
  const mid = { x: (cr.x + cf.x) / 2, y: (cr.y + cf.y) / 2 };
  const origin = add(mid, nb, -L.path.R);                        // the particle: bike frame origin, between the contacts
  const P = (pt) => add(add(origin, ub, pt.x * BIKE_K), nb, pt.y * BIKE_K);
  const wheelR = L.path.R;
  const leg = (g) => ({ hip: P(g.hip), knee: P(g.knee), ankle: P(g.ankle), ball: P(g.ball), toe: P(g.toe), reached: g.reached });
  const arm = (g) => ({ shoulder: P(g.shoulder), elbow: P(g.elbow), hand: P(g.hand), reached: g.reached });
  const com = P(COM);
  const wLen = r.weight * FORCE_K, nLen = r.normal * FORCE_K;
  const nTip = add(com, L.n, nLen);
  // N label: just beyond the arrow tip, kept out of the info panel and inside the scene
  const normalLabel = (() => {
    let anchor = L.n.x > 0.6 ? 'start' : 'middle';
    let x = Math.min(VIEW.x + VIEW.w - 40, nTip.x + L.n.x * 16), y = nTip.y + L.n.y * 16 + 4;
    if (y - 12 < 2) { anchor = 'end'; x = nTip.x - 8; y = nTip.y + 6; }
    if (nLen < 2) { // N = 0: written under the Fg label (see labels())
      const high = com.y + wLen - 14 < PANEL.y1 + 16;
      anchor = high ? 'middle' : 'start'; x = high ? com.x : com.x + 8;
      y = high ? com.y + wLen + 31 : Math.min(com.y + wLen - 2, 358) + 15;
    }
    // "N = 1.386 N": ≈ 7,5 px per character of the bold 13 px label
    const digits = String(Math.round(r.normal)).length, w = 7.5 * (6 + digits + Math.floor((digits - 1) / 3));
    const lead = anchor === 'start' ? 0 : anchor === 'middle' ? w / 2 : w;
    if (y - 12 < PANEL.y1) x = Math.min(x, PANEL.x0 - 6 - w + lead);
    x = Math.max(Math.min(x, VIEW.x + VIEW.w - 2 - w + lead), VIEW.x + 2 + lead);
    return { x, y, anchor, w };
  })();
  // velocity: length ∝ speed (fixed px per m/s), drawn just inside the slope with its head
  // under the front wheel and the tail trailing uphill, so it never crosses the force arrows
  const vHead = add(add(L.top, L.u, along + 0.6 * BIKE_K), L.n, -V_INSET);
  return {
    layout: L, along, centre: origin, mid, origin, bikeDir: ub, bikeUp: nb, bike,
    contactRear: bike.rear.contact, contactFront: bike.front.contact,
    wheelRear: cr, wheelFront: cf, wheelR,
    wheelAngleRear: bike.sigmaRear / wheelR,                     // rolling without slipping (rad)
    wheelAngleFront: bike.sigmaFront / wheelR,
    crankAngle: 0,                                               // coasting: pedals never turn
    frame: Object.fromEntries(['bb', 'seatTop', 'saddle', 'headTop', 'headBottom', 'stem', 'handlebar', 'pedalNear', 'pedalFar'].map((k) => [k, P(BIKE[k])])),
    chainringR: BIKE.chainring * BIKE_K,
    rider: {
      hip: P(POSE.hip), shoulder: P(POSE.shoulder), head: P(POSE.head), headR: BODY.headR * BIKE_K,
      legNear: leg(POSE.legNear), legFar: leg(POSE.legFar), armNear: arm(POSE.armNear), armFar: arm(POSE.armFar),
    },
    com,
    weight: { from: com, to: { x: com.x, y: com.y + wLen } },
    normal: { from: com, to: nTip },
    normalLabel,
    velocity: { from: add(vHead, L.u, -s.speed * V_K), to: vHead },
  };
}

/** Stroboscope: bike states at equal time steps Δt = duration / STROBE, up to the current time. */
export function strobe(p, r, s) {
  const dt = r.duration / STROBE;
  const out = [];
  for (let i = 0; i < STROBE && i * dt < s.t - 1e-9; i++) out.push(sample('sepeda', p, r, i * dt));
  return { dt, states: out };
}

/** Bike-and-rider drawing magnification relative to the slope's scale. */
export const magnification = (p) => BIKE_K / layout(p).scale;

/** A round scale-bar length (m) that is at most `maxPx` long at this scale. */
function scaleBar(scale, maxPx = 44) {
  const nice = [1, 2, 5, 10, 20, 50, 100, 200];
  return nice.filter((m) => m * scale <= maxPx).pop() ?? 1;
}

const n1 = (v) => Math.round(v * 10) / 10;
const line = (...pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${n1(q.x)} ${n1(q.y)}`).join('');
const TEXT_W = 6.6;                // ≈ px per character of the 11–13 px scene labels

/** Positions of the static and per-frame labels (shared by render, the panel placement and tests). */
export function labels(p, r, s, g = s && geometry(p, r, s)) {
  const L = g.layout, { top, u, n } = L;
  const out = {};
  // L label: inside the hill at 30 % of the slope
  const lAt = add(top, u, 0.3 * L.lengthPx);
  out.l = { at: add(lAt, n, -Math.min(DEPTH.lLabel, (376 - lAt.y) / Math.max(L.cos, 0.01))), anchor: 'middle', text: `L = ${p.length} m` };
  // h label left of the dimension line; scale note under it (or in the sky for a low hill)
  const hPx = GROUND_Y - top.y;
  out.h = { x: L.dimX - 8, y: (top.y + GROUND_Y) / 2 + 4 };
  out.note = hPx >= 90 ? { x: 46, y: out.h.y + 24 } : { x: PANEL.x0 + 6, y: PANEL.y1 + 14 };
  if (!s) return out;
  // v label trails the velocity arrow's tail, inside the hill
  out.v = { at: add(add(g.velocity.from, u, -4), n, -(DEPTH.vLabel - V_INSET)), anchor: 'end' };
  // weight label: along the slope inside the hill (gentle), beside the tip (steep)
  const wt = g.weight;
  if (L.sin <= 0.7) {
    const wLen = wt.to.y - wt.from.y;
    const t = Math.min(wLen, (normalOf(L, wt.from) + DEPTH.fgLabel - 5) / Math.max(L.cos, 0.01));
    const a = alongOf(L, wt.from) + t * L.sin + 6;
    const anchor = a + 85 > L.lengthPx + 30 ? 'end' : 'start';
    out.fg = { at: add(add(top, u, anchor === 'end' ? a - 12 : a), n, -DEPTH.fgLabel), anchor, rotate: true };
  } else {
    // beside the tip; just under it when the tip is up by the info panel (bike at the hilltop)
    const high = wt.to.y - 14 < PANEL.y1 + 16;
    out.fg = high ? { at: { x: wt.to.x, y: wt.to.y + 16 }, anchor: 'middle', rotate: false }
      : { at: { x: wt.to.x + 8, y: Math.min(wt.to.y - 2, 358) }, anchor: 'start', rotate: false };
  }
  return out;
}

function drawBike(g, ghost = false) {
  const fr = g.frame, rd = g.rider, ub = g.bikeDir, nb = g.bikeUp;
  const w = (m) => n1(m * BIKE_K);
  const tilt = Math.atan2(ub.y, ub.x);
  const wheel = (c, angle) => {
    // tyre stroke (3.5 px) is centred on r − 1.75 so its outer edge is the rolling radius
    const rr = g.wheelR - 1.75;
    if (ghost) return `<circle class="tyre" cx="${n1(c.x)}" cy="${n1(c.y)}" r="${n1(rr)}"/>`;
    const base = angle + tilt;
    const spokes = [0, 1, 2].map((j) => {
      const a = base + (j * Math.PI) / 3, dx = Math.cos(a) * (rr - 2), dy = Math.sin(a) * (rr - 2);
      return `M${n1(c.x - dx)} ${n1(c.y - dy)}L${n1(c.x + dx)} ${n1(c.y + dy)}`;
    }).join('');
    const valve = { x: c.x + Math.cos(base) * (rr - 3.5), y: c.y + Math.sin(base) * (rr - 3.5) };
    return `<g class="wheel-set"><circle class="tyre" cx="${n1(c.x)}" cy="${n1(c.y)}" r="${n1(rr)}"/><path class="spoke" d="${spokes}"/><circle class="valve" cx="${n1(valve.x)}" cy="${n1(valve.y)}" r="1.8"/><circle class="hub" cx="${n1(c.x)}" cy="${n1(c.y)}" r="1.6"/></g>`;
  };
  const legPath = (l) => line(l.hip, l.knee, l.ankle);
  const shoe = (l) => `<path class="shoe" style="stroke-width:${w(0.07)}" d="${line(l.ankle, l.ball, l.toe)}"/>`;
  const armPath = (a) => line(a.shoulder, a.elbow, a.hand);
  const frame = line(g.wheelRear, fr.bb, fr.seatTop, g.wheelRear) + line(fr.bb, fr.headBottom) + line(fr.seatTop, fr.headTop) + line(fr.headBottom, fr.headTop, fr.stem, fr.handlebar) + line(fr.headBottom, g.wheelFront) + line(fr.seatTop, fr.saddle);
  const saddle = line(add(fr.saddle, ub, -0.09 * BIKE_K), add(fr.saddle, ub, 0.07 * BIKE_K));
  const hr = rd.headR;
  const hc = add(rd.head, nb, hr * 0.15);
  const ha = add(hc, ub, -hr * 1.2), hb = add(hc, ub, hr * 1.2);
  const helmet = `<path class="helmet" d="M${n1(ha.x)} ${n1(ha.y)}A${n1(hr * 1.2)} ${n1(hr * 1.2)} 0 0 1 ${n1(hb.x)} ${n1(hb.y)}Z"/>`;
  const torso = `<path class="torso" style="stroke-width:${w(0.22)}" d="${line(rd.hip, rd.shoulder)}"/>`;
  const cranks = `<circle class="chainring" cx="${n1(fr.bb.x)}" cy="${n1(fr.bb.y)}" r="${n1(g.chainringR)}"/><path class="crank" d="${line(fr.pedalFar, fr.pedalNear)}"/>`;
  const pedals = [fr.pedalFar, fr.pedalNear].map((q) => `<path class="pedal" d="${line(add(q, ub, -0.05 * BIKE_K), add(q, ub, 0.05 * BIKE_K))}"/>`).join('');
  if (ghost) {
    return `<g class="ghost">${wheel(g.wheelRear)}${wheel(g.wheelFront)}<path class="frame" d="${frame}"/>${torso}<path class="rider-limb" style="stroke-width:${w(0.12)}" d="${legPath(rd.legNear)}"/><circle class="skin" cx="${n1(rd.head.x)}" cy="${n1(rd.head.y)}" r="${n1(hr)}"/></g>`;
  }
  return `<g class="bike">
    ${wheel(g.wheelRear, g.wheelAngleRear)}${wheel(g.wheelFront, g.wheelAngleFront)}
    <path class="rider-limb far" style="stroke-width:${w(0.12)}" d="${legPath(rd.legFar)}"/>${shoe(rd.legFar)}
    <path class="rider-arm-far" style="stroke-width:${w(0.075)}" d="${armPath(rd.armFar)}"/>
    <path class="frame" d="${frame}"/><path class="saddle" d="${saddle}"/>
    ${cranks}${pedals}
    ${torso}
    <path class="rider-limb" style="stroke-width:${w(0.13)}" d="${legPath(rd.legNear)}"/>${shoe(rd.legNear)}
    <circle class="skin" cx="${n1(rd.head.x)}" cy="${n1(rd.head.y)}" r="${n1(hr)}"/>${helmet}
    <path class="rider-arm" style="stroke-width:${w(0.08)}" d="${armPath(rd.armNear)}"/>
    <circle class="skin" cx="${n1(rd.armNear.hand.x)}" cy="${n1(rd.armNear.hand.y)}" r="${w(0.045)}"/>
  </g>`;
}

export function render(p, r, s, f) {
  const g = geometry(p, r, s);
  const L = g.layout;
  const deg = (L.theta * 180) / Math.PI;
  const { top, finish, n, u } = L;
  const lb = labels(p, r, s, g);
  const rotText = (pt, text, cls, anchor = 'middle') => `<text class="${cls}" transform="translate(${n1(pt.x)} ${n1(pt.y)}) rotate(${n1(deg)})" text-anchor="${anchor}">${text}</text>`;

  // stroboscope ghosts (equal time steps)
  const { dt, states: ghosts } = strobe(p, r, s);
  const ghostSvg = ghosts.map((gs) => drawBike(geometry(p, r, gs), true)).join('');
  const ghostDots = ghosts.map((gs) => { const c = add(top, u, gs.position * L.scale); return `<circle class="strobe-dot" cx="${n1(c.x)}" cy="${n1(c.y)}" r="3"/>`; }).join('');

  // energy bar: Ep + Ek = mgh, always the same total
  const E = r.energy, barX = PANEL.x0 + 6, barW = 170, barY = 48;
  const epW = E > 0 ? (barW * Math.max(0, s.potential)) / E : 0;
  const energy = `<g class="energy-bar">
      <text class="energy-text ep" x="${barX}" y="${barY - 5}">E${sub('p')} ${f(Math.max(0, s.potential), 0)} J</text>
      <text class="energy-text ek" x="${barX + barW}" y="${barY - 5}" text-anchor="end">E${sub('k')} ${f(Math.min(E, s.kinetic), 0)} J</text>
      <rect class="energy-track" x="${barX}" y="${barY}" width="${barW}" height="10" rx="3"/>
      <rect class="energy-ep" x="${barX}" y="${barY}" width="${n1(epW)}" height="10"/>
      <rect class="energy-ek" x="${n1(barX + epW)}" y="${barY}" width="${n1(barW - epW)}" height="10"/>
      <text class="energy-total" x="${barX + barW}" y="${barY + 23}" text-anchor="end">E${sub('p')} + E${sub('k')} = ${f(E, 0)} J (tetap)</text>
    </g>`;

  const right = barX + barW;
  const mText = `m = ${f(p.mass)} kg`, fText = 'tanpa gesekan';
  const tw = (t) => t.length * 7 + 16;
  const fX = right - tw(fText) / 2, mX = right - tw(fText) - 6 - tw(mText) / 2;

  const bar = scaleBar(L.scale);
  const mag = magnification(p);
  const vx = g.velocity, wt = g.weight, nf = g.normal, nl = g.normalLabel;
  const nLen = dist(nf.from, nf.to);
  const sMid = add(add(top, u, g.along / 2), n, 7);
  const fgText = `F${sub('g')} = ${f(r.weight)} N`;

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="380"/>
    <circle class="sun" cx="86" cy="44" r="18"/>
    <path class="cloud" d="M236 50a18 18 0 0 1 34-6a14 14 0 0 1 24 10H236Z"/>
    <path class="hill" d="M0 ${n1(top.y)}H${n1(top.x)}L${n1(finish.x)} ${GROUND_Y}H600V380H0Z"/>
    <rect class="ground" x="0" y="${GROUND_Y}" width="600" height="${380 - GROUND_Y}"/>
    <path class="slope-line track" d="M0 ${n1(top.y)}H${n1(top.x)}L${n1(finish.x)} ${GROUND_Y}H600"/>
    <path class="slope-mark" d="${line(add(top, n, 6), add(top, n, -6))}${line(add(finish, n, 6), add(finish, n, -6))}"/>
    <g class="layer layer-motion strobe">${ghostSvg}${ghostDots}</g>
    ${drawBike(g)}
    <g class="layer layer-labels">
      ${dimV(n1(L.dimX), top.y, GROUND_Y, `h = ${f(p.height)} m`, 'left')}
      ${rotText(lb.l.at, `L = ${f(p.length)} m`, 'slope-label')}
      ${tag(mX, 20, mText, 'accent')}
      ${tag(fX, 20, fText)}
      ${energy}
      <g class="scale-note">
        <text x="${lb.note.x}" y="${n1(lb.note.y)}">sepeda ±${f(mag, mag < 10 ? 1 : 0)}×</text>
        <text x="${lb.note.x}" y="${n1(lb.note.y + 13)}">lebih besar</text>
        <path class="scale-bar" d="M${lb.note.x} ${n1(lb.note.y + 22)}h${n1(bar * L.scale)}M${lb.note.x} ${n1(lb.note.y + 18)}v8M${n1(lb.note.x + bar * L.scale)} ${n1(lb.note.y + 18)}v8"/>
        <text x="${n1(lb.note.x + bar * L.scale + 5)}" y="${n1(lb.note.y + 26)}">${f(bar)} m</text>
      </g>
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${n1(g.com.x)}" cy="${n1(g.com.y)}" r="3"/>
      ${arrow(wt.from.x, wt.from.y, wt.to.x, wt.to.y, 'force', '')}
      ${lb.fg.rotate ? rotText(lb.fg.at, fgText, 'vec-label vec-force-text', lb.fg.anchor) : `<text class="vec-label vec-force-text" x="${n1(lb.fg.at.x)}" y="${n1(lb.fg.at.y)}" text-anchor="${lb.fg.anchor}">${fgText}</text>`}
      ${nLen >= 2 ? arrow(nf.from.x, nf.from.y, nf.to.x, nf.to.y, 'force', '') : ''}
      <text class="vec-label vec-force-text" x="${n1(nl.x)}" y="${n1(nl.y)}" text-anchor="${nl.anchor}">N = ${f(r.normal, 0)} N</text>
    </g>
    <g class="layer layer-motion">
      ${g.along > 30 ? arrow(top.x, top.y, top.x + u.x * g.along, top.y + u.y * g.along, 'disp', '', { dashed: true }) : ''}
      ${g.along > 90 ? rotText(sMid, `s = ${f(s.position, 1)} m`, 'disp-label') : ''}
      ${arrow(vx.from.x, vx.from.y, vx.to.x, vx.to.y, 'velocity', '')}
      ${s.speed > 0 ? rotText(lb.v.at, `v = ${f(s.speed, 1)} m/s`, 'vec-label vec-velocity-text', 'end') : ''}
      <g class="strobe-legend">
        <text x="${right}" y="97" text-anchor="end">● jejak tiap Δt = ${f(dt, 2)} s</text>
        <text x="${right}" y="110" text-anchor="end">jaraknya makin lebar → dipercepat</text>
      </g>
    </g>
  `,
    `Pesepeda meluncur tanpa mengayuh menuruni lereng setinggi ${f(p.height)} meter sepanjang ${f(p.length)} meter`
  );
}

// Content always lies in x 40…560 (slope, bike, labels, handles, info panel), so both cameras
// crop the empty side margins; on phones that makes every label ≈ 15 % larger.
export const camera = { desktop: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`, portrait: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}` };

/** Drag handle for an interactive parameter, in scene coordinates (on the drawn geometry). */
export function handle(key, p, portrait = false) {
  const L = layout(p);
  // On the hilltop plateau (the start height), left of the rider waiting at the start.
  if (key === 'height') return { x: HANDLE_X, y: L.top.y, axis: 'y', factor: -1 / L.scale };
  // Inside the hill below the slope (or above the path for a very flat hill): never on the bike's path.
  return { x: L.lHandle.x, y: L.lHandle.y, axis: 'x', factor: 1 / (L.scale * Math.max(L.cos, 0.3)) };
}

// ---------------------------------------------------------------- ± mass panel placement

/** Rectangle of the ± panel drawn by interaction.js (with its hit areas) after an offset. */
export const loadPanelRect = ([dx, dy]) => ({ x0: 174 + dx, y0: 316 + dy, x1: 426 + dx, y1: 378 + dy });

const box = (x0, y0, x1, y1) => ({ x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
const ptBox = (pt, rad = 4) => box(pt.x - rad, pt.y - rad, pt.x + rad, pt.y + rad);
const textBox = (x, y, chars, anchor) => {
  const w = chars * TEXT_W, x0 = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return box(x0, y - 11, x0 + w, y + 3);
};
const rotBox = (L, at, chars, anchor) => {
  const w = chars * TEXT_W, k = anchor === 'end' ? -1 : anchor === 'middle' ? -0.5 : 0;
  const a = add(at, L.u, k * w), b = add(a, L.u, w), c = add(a, L.n, 11), d = add(b, L.n, 11);
  return box(Math.min(a.x, b.x, c.x, d.x), Math.min(a.y, b.y, c.y, d.y), Math.max(a.x, b.x, c.x, d.x), Math.max(a.y, b.y, c.y, d.y));
};
/** Handle circle plus the label interaction.js draws next to it. */
function handleBoxes(h, chars) {
  const right = h.x < VIEW.x + 150, w = chars * 9;
  return [box(h.x - 16, h.y - 16, h.x + 16, h.y + 16), right ? box(h.x + 22, h.y - 31, h.x + 22 + w, h.y - 14) : box(h.x - 22 - w, h.y - 31, h.x - 22, h.y - 14)];
}

/** Everything the ± panel must not cover, over the whole ride (exported for tests). */
export function sceneMarks(p, r, count = 32) {
  const L = layout(p);
  const marks = [box(PANEL.x0, PANEL.y0, PANEL.x1, PANEL.y1)];
  for (let i = 0; i <= 20; i++) marks.push(ptBox(add(L.top, L.u, (L.lengthPx * i) / 20), 3)); // the slope itself
  const st = labels(p, r, null, { layout: L });
  marks.push(textBox(st.h.x, st.h.y, `h = ${p.height} m`.length, 'end'), box(st.note.x, st.note.y - 11, st.note.x + 80, st.note.y + 30));
  marks.push(rotBox(L, st.l.at, `L = ${p.length} m`.length, 'middle'));
  marks.push(...handleBoxes(handle('height', p), 8), ...handleBoxes(handle('length', p), 8));
  for (let i = 0; i <= count; i++) {
    const s = sample('sepeda', p, r, (r.duration * i) / count), g = geometry(p, r, s), lb = labels(p, r, s, g), R = g.rider;
    for (const w of [g.wheelRear, g.wheelFront]) marks.push(ptBox(w, g.wheelR));
    for (const q of [R.head, R.shoulder, R.hip, R.armNear.hand, R.armNear.elbow, R.legNear.knee, R.legFar.knee, g.frame.saddle, g.frame.bb, g.com]) marks.push(ptBox(q, 6));
    marks.push(ptBox(g.weight.to), ptBox(g.normal.to), ptBox(g.velocity.from), ptBox(g.velocity.to));
    marks.push(textBox(g.normalLabel.x, g.normalLabel.y, g.normalLabel.w / TEXT_W, g.normalLabel.anchor));
    marks.push(rotBox(L, lb.v.at, 12, 'end'));
    marks.push(lb.fg.rotate ? rotBox(L, lb.fg.at, 12, lb.fg.anchor) : textBox(lb.fg.at.x, lb.fg.at.y, 12, lb.fg.anchor));
  }
  return marks;
}

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const CANDIDATES = (() => {
  const out = [];
  // bottom rows first, then upwards; within a row the centre, then ever further out
  for (let dy = 0; dy >= -300; dy -= 20) for (let k = 0; k <= 12; k++) out.push([(k % 2 ? -1 : 1) * Math.ceil(k / 2) * 22.5 || 0, dy]);
  return out;
})();

/**
 * Offset [dx, dy] for the ± mass panel: the first spot (bottom first) clear of everything drawn
 * during the whole ride; if none is completely clear, the one covering the fewest marks.
 */
const offsetCache = new Map();
export function loadOffset(p, portrait = false) {
  const key = `${p.mass}|${p.height}|${p.length}`;
  if (!offsetCache.has(key)) {
    if (offsetCache.size > 50) offsetCache.clear();
    offsetCache.set(key, findLoadOffset(p));
  }
  return offsetCache.get(key);
}
function findLoadOffset(p) {
  let r;
  try { r = solve('sepeda', p); } catch { return [-134, 0]; }
  const marks = sceneMarks(p, r);
  let best = [-134, 0], bestHits = Infinity;
  for (const c of CANDIDATES) {
    const rect = loadPanelRect(c);
    if (rect.y1 > VIEW.y + VIEW.h + 2 || rect.y0 < VIEW.y || rect.x0 < VIEW.x || rect.x1 > VIEW.x + VIEW.w) continue;
    const hits = marks.filter((m) => overlaps(m, rect)).length;
    if (hits === 0) return c;
    if (hits < bestHits) { best = c; bestHits = hits; }
  }
  return best;
}
