// Cyclist coasting down a straight, frictionless slope.
// The hill is drawn to ONE true scale (`scale` px per metre, from layout()). The bike and rider
// are drawn enlarged (BIKE_K px per metre) and the scene says so. The bike's centre (midpoint
// between the tyre contact points) is the particle of the model: it is at s.position × scale
// along the slope, measured from the start mark. The slope line extends a little beyond the
// start and finish marks so the enlarged wheels always have track under them.
// Wheels roll without slipping on the drawn slope; the pedals stay still (coasting).
// Everything drawn comes from geometry(), which tests check directly.
import { arrow, dimV, tag, svg, sub } from './draw.js';
import { twoBone, BODY } from './rig.js';
import { sample } from '../physics/models.js';

export const BIKE_K = 40;          // px per metre for the (enlarged) bike and rider
export const GROUND_Y = 326;       // flat ground at the foot of the hill
const TOP_MIN = 116;               // highest start point (room for the rider above it)
const X0 = 150, X1 = 556;          // horizontal room for the slope (start … finish marks)
const DIM_GAP = 56;                // h dimension line sits this far left of the start mark
const HANDLE_X = 34;
export const STROBE = 8;           // stroboscope: number of equal time intervals

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
export const VMAX = 90;            // px for the speed at the foot of the hill
export const FORCE_PX = 70;        // px for the weight
const V_INSET = 9;                 // velocity arrow: px inside the slope line
const DISP_OUT = 84;               // displacement arrow: px outside the slope line (above the bikes)

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

/** Slope layout for the parameters: true scale, start/finish marks and the track ends, in px. */
export function layout(p) {
  const sin = Math.min(1, p.height / p.length);
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const theta = Math.asin(sin);
  const u = { x: cos, y: sin };          // down the slope (screen coordinates, y down)
  const n = { x: sin, y: -cos };         // outward normal (away from the hill)
  // The front wheel must stay tangent to the slope at the concave foot of the hill.
  const extBottom = (HALF_BASE + WHEEL_R * Math.tan(theta / 2)) * BIKE_K + 1;
  const extTop = HALF_BASE * BIKE_K + 4;
  const finishY = GROUND_Y - extBottom * sin;
  const room = X1 - X0;
  const scale = Math.min(cos > 1e-9 ? room / (p.length * cos) : Infinity, (finishY - TOP_MIN) / p.height);
  const width = p.length * cos * scale;
  // a steep (narrow) slope sits left of centre, clear of the info panel on the right
  const top = { x: X0 + (room - width) * 0.1, y: finishY - p.height * scale };
  const finish = { x: top.x + width, y: finishY };
  const crest = { x: top.x - u.x * extTop, y: top.y - u.y * extTop };
  const foot = { x: finish.x + u.x * extBottom, y: finish.y + u.y * extBottom };
  return { sin, cos, theta, u, n, scale, top, finish, crest, foot, dimX: top.x - DIM_GAP };
}

const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });

/** Everything drawn for one state, in px (exported so tests check exactly what is drawn). */
export function geometry(p, r, s) {
  const L = layout(p);
  const along = s.position * L.scale;
  const centre = add(L.top, L.u, along);                       // contact midpoint, on the slope
  const P = (pt) => add(add(centre, L.u, pt.x * BIKE_K), L.n, pt.y * BIKE_K);
  const wheelR = WHEEL_R * BIKE_K;
  const leg = (g) => ({ hip: P(g.hip), knee: P(g.knee), ankle: P(g.ankle), ball: P(g.ball), toe: P(g.toe), reached: g.reached });
  const arm = (g) => ({ shoulder: P(g.shoulder), elbow: P(g.elbow), hand: P(g.hand), reached: g.reached });
  const com = P(COM);
  const forceRef = FORCE_PX;
  return {
    layout: L, along, centre,
    contactRear: P({ x: -HALF_BASE, y: 0 }), contactFront: P({ x: HALF_BASE, y: 0 }),
    wheelRear: P(BIKE.rearAxle), wheelFront: P(BIKE.frontAxle), wheelR,
    wheelAngle: along / wheelR,                                  // rolling without slipping (rad)
    crankAngle: 0,                                               // coasting: pedals never turn
    frame: Object.fromEntries(['bb', 'seatTop', 'saddle', 'headTop', 'headBottom', 'stem', 'handlebar', 'pedalNear', 'pedalFar'].map((k) => [k, P(BIKE[k])])),
    chainringR: BIKE.chainring * BIKE_K,
    rider: {
      hip: P(POSE.hip), shoulder: P(POSE.shoulder), head: P(POSE.head), headR: BODY.headR * BIKE_K,
      legNear: leg(POSE.legNear), legFar: leg(POSE.legFar), armNear: arm(POSE.armNear), armFar: arm(POSE.armFar),
    },
    com,
    weight: { from: com, to: { x: com.x, y: com.y + forceRef } },
    normal: { from: com, to: add(com, L.n, forceRef * (r.weight > 0 ? r.normal / r.weight : 0)) },
    normalLabel: (() => {
      // just beyond the arrow tip; nudged left if it would touch the info panel (x > 412, y < 116)
      const tip = add(com, L.n, forceRef * (r.weight > 0 ? r.normal / r.weight : 0));
      const anchor = L.n.x > 0.6 ? 'start' : 'middle', y = tip.y + L.n.y * 16 + 4;
      const lead = anchor === 'start' ? 0 : 33;               // label is ≈ 65 px wide
      let x = Math.min(560, tip.x + L.n.x * 16);
      if (y - 12 < 116) x = Math.min(x, 408 - 65 + lead);
      return { x, y, anchor };
    })(),
    // velocity: length ∝ speed, drawn just inside the slope with its head under the front
    // wheel and the tail trailing uphill, so it never runs off the scene or crosses the forces
    velocity: (() => { const to = add(P({ x: 0.6, y: 0 }), L.n, -V_INSET); return { from: add(to, L.u, r.speed > 0 ? -(s.speed / r.speed) * VMAX : 0), to }; })(),
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

const n1 = (v) => Math.round(v * 10) / 10;
const line = (...pts) => pts.map((q, i) => `${i ? 'L' : 'M'}${n1(q.x)} ${n1(q.y)}`).join('');

function drawBike(g, ghost = false) {
  const L = g.layout, fr = g.frame, rd = g.rider;
  const w = (m) => n1(m * BIKE_K);
  const wheel = (c) => {
    // tyre stroke (3.5 px) is centred on r − 1.75 so its outer edge is the rolling radius
    const rr = g.wheelR - 1.75;
    if (ghost) return `<circle class="tyre" cx="${n1(c.x)}" cy="${n1(c.y)}" r="${n1(rr)}"/>`;
    const base = g.wheelAngle + L.theta;
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
  const saddle = line(add(fr.saddle, L.u, -0.09 * BIKE_K), add(fr.saddle, L.u, 0.07 * BIKE_K));
  const hr = rd.headR;
  const hc = add(rd.head, L.n, hr * 0.15);
  const ha = add(hc, L.u, -hr * 1.2), hb = add(hc, L.u, hr * 1.2);
  const helmet = `<path class="helmet" d="M${n1(ha.x)} ${n1(ha.y)}A${n1(hr * 1.2)} ${n1(hr * 1.2)} 0 0 1 ${n1(hb.x)} ${n1(hb.y)}Z"/>`;
  const torso = `<path class="torso" style="stroke-width:${w(0.22)}" d="${line(rd.hip, rd.shoulder)}"/>`;
  const cranks = `<circle class="chainring" cx="${n1(fr.bb.x)}" cy="${n1(fr.bb.y)}" r="${n1(g.chainringR)}"/><path class="crank" d="${line(fr.pedalFar, fr.pedalNear)}"/>`;
  const pedals = [fr.pedalFar, fr.pedalNear].map((q) => `<path class="pedal" d="${line(add(q, L.u, -0.05 * BIKE_K), add(q, L.u, 0.05 * BIKE_K))}"/>`).join('');
  if (ghost) {
    return `<g class="ghost">${wheel(g.wheelRear)}${wheel(g.wheelFront)}<path class="frame" d="${frame}"/>${torso}<path class="rider-limb" style="stroke-width:${w(0.12)}" d="${legPath(rd.legNear)}"/><circle class="skin" cx="${n1(rd.head.x)}" cy="${n1(rd.head.y)}" r="${n1(hr)}"/></g>`;
  }
  return `<g class="bike">
    ${wheel(g.wheelRear)}${wheel(g.wheelFront)}
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

/** A round scale-bar length (m) that is at most `maxPx` long at this scale. */
function scaleBar(scale, maxPx = 60) {
  const nice = [1, 2, 5, 10, 20, 50, 100, 200];
  return nice.filter((m) => m * scale <= maxPx).pop() ?? 1;
}

export function render(p, r, s, f) {
  const g = geometry(p, r, s);
  const L = g.layout;
  const deg = (L.theta * 180) / Math.PI;
  const { top, finish, crest, foot, n, u } = L;
  const mid = add(top, u, (p.length * L.scale) / 2);
  const inside = (pt, d) => add(pt, n, -d);
  const rotText = (pt, text, cls) => `<text class="${cls}" transform="translate(${n1(pt.x)} ${n1(pt.y)}) rotate(${n1(deg)})" text-anchor="middle">${text}</text>`;

  // stroboscope ghosts (equal time steps)
  const { dt, states: ghosts } = strobe(p, r, s);
  const ghostGeo = ghosts.map((gs) => geometry(p, r, gs));
  const ghostSvg = ghostGeo.map((gg) => drawBike(gg, true)).join('');
  const ghostDots = ghostGeo.map((gg) => `<circle class="strobe-dot" cx="${n1(gg.centre.x)}" cy="${n1(gg.centre.y)}" r="3"/>`).join('');

  // energy bar: Ep + Ek = mgh, always the same total
  const E = r.energy, barX = 420, barW = 170, barY = 52;
  const epW = E > 0 ? (barW * Math.max(0, s.potential)) / E : 0;
  const energy = `<g class="energy-bar">
      <text class="energy-text ep" x="${barX}" y="${barY - 6}">E${sub('p')} ${f(Math.max(0, s.potential), 0)} J</text>
      <text class="energy-text ek" x="${barX + barW}" y="${barY - 6}" text-anchor="end">E${sub('k')} ${f(Math.min(E, s.kinetic), 0)} J</text>
      <rect class="energy-track" x="${barX}" y="${barY}" width="${barW}" height="11" rx="3"/>
      <rect class="energy-ep" x="${barX}" y="${barY}" width="${n1(epW)}" height="11"/>
      <rect class="energy-ek" x="${n1(barX + epW)}" y="${barY}" width="${n1(barW - epW)}" height="11"/>
      <text class="energy-total" x="${barX + barW}" y="${barY + 22}" text-anchor="end">E${sub('p')} + E${sub('k')} = ${f(E, 0)} J (tetap)</text>
    </g>`;

  const mText = `m = ${f(p.mass)} kg`, fText = 'tanpa gesekan';
  const tw = (t) => t.length * 7 + 16;
  const fX = 590 - tw(fText) / 2, mX = 590 - tw(fText) - 6 - tw(mText) / 2;

  const bar = scaleBar(L.scale);
  const mag = magnification(p);
  const vx = g.velocity, wt = g.weight, nf = g.normal;
  const nLen = Math.hypot(nf.to.x - nf.from.x, nf.to.y - nf.from.y);
  const wAnchor = wt.to.x > 470 ? 'end' : 'start';
  const wLabel = { x: wt.to.x + (wt.to.x > 470 ? -10 : 10), y: Math.min(wt.to.y - 2, 370) };
  const dispFrom = add(top, n, DISP_OUT), dispTo = add(add(g.centre, u, -24), n, DISP_OUT);
  const sLabel = add(add(top, u, (g.along - 24) / 2), n, DISP_OUT + 7);
  const vTail = add(add(vx.from, u, -4), n, -(25 - V_INSET));   // v label trails the arrow's tail

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="380"/>
    <circle class="sun" cx="52" cy="44" r="18"/>
    <path class="cloud" d="M236 50a18 18 0 0 1 34-6a14 14 0 0 1 24 10H236Z"/>
    <path class="hill" d="M0 ${n1(crest.y)}H${n1(crest.x)}L${n1(foot.x)} ${n1(foot.y)}H600V380H0Z"/>
    <rect class="ground" x="0" y="${GROUND_Y}" width="600" height="${380 - GROUND_Y}"/>
    <path class="slope-line track" d="M0 ${n1(crest.y)}H${n1(crest.x)}L${n1(foot.x)} ${n1(foot.y)}H600"/>
    <path class="slope-mark" d="${line(add(top, n, 6), add(top, n, -6))}${line(add(finish, n, 6), add(finish, n, -6))}"/>
    <g class="layer layer-motion strobe">${ghostSvg}${ghostDots}</g>
    ${drawBike(g)}
    <g class="layer layer-labels">
      <path class="target-line" d="M${n1(L.dimX)} ${n1(top.y)}H${n1(top.x)}M${n1(L.dimX)} ${n1(finish.y)}H${n1(finish.x)}"/>
      ${dimV(n1(L.dimX), top.y, finish.y, `h = ${f(p.height)} m`, 'left')}
      ${rotText(inside(mid, Math.min(50, (376 - mid.y) / Math.max(L.cos, 0.01))), `L = ${f(p.length)} m`, 'slope-label')}
      ${tag(mX, 22, mText, 'accent')}
      ${tag(fX, 22, fText)}
      ${energy}
      <g class="scale-note">
        <text x="10" y="${GROUND_Y + 17}">sepeda digambar</text>
        <text x="10" y="${GROUND_Y + 31}">±${f(mag, mag < 10 ? 1 : 0)}× lebih besar</text>
        <path class="scale-bar" d="M10 ${GROUND_Y + 42}h${n1(bar * L.scale)}M10 ${GROUND_Y + 38}v8M${n1(10 + bar * L.scale)} ${GROUND_Y + 38}v8"/>
        <text x="${n1(16 + bar * L.scale)}" y="${GROUND_Y + 46}">${f(bar)} m (bukit)</text>
      </g>
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${n1(g.com.x)}" cy="${n1(g.com.y)}" r="3.5"/>
      ${arrow(wt.from.x, wt.from.y, wt.to.x, wt.to.y, 'force', '')}
      <text class="vec-label vec-force-text" x="${n1(wLabel.x)}" y="${n1(wLabel.y)}" text-anchor="${wAnchor}">F${sub('g')} = ${f(r.weight)} N</text>
      ${nLen >= 2
        ? `${arrow(nf.from.x, nf.from.y, nf.to.x, nf.to.y, 'force', '')}<text class="vec-label vec-force-text" x="${n1(g.normalLabel.x)}" y="${n1(g.normalLabel.y)}" text-anchor="${g.normalLabel.anchor}">N = ${f(r.normal, 0)} N</text>`
        : `<text class="vec-label vec-force-text" x="${n1(wLabel.x)}" y="${n1(wLabel.y - 15)}" text-anchor="${wAnchor}">N = 0 N</text>`}
    </g>
    <g class="layer layer-motion">
      ${g.along > 30 ? arrow(dispFrom.x, dispFrom.y, dispTo.x, dispTo.y, 'disp', '', { dashed: true }) : ''}
      ${g.along > 90 ? rotText(sLabel, `s = ${f(s.position, 1)} m`, 'disp-label') : ''}
      ${arrow(vx.from.x, vx.from.y, vx.to.x, vx.to.y, 'velocity', '')}
      ${s.speed > 0 ? rotText(vTail, `v = ${f(s.speed, 1)} m/s`, 'vec-label vec-velocity-text').replace('text-anchor="middle"', 'text-anchor="end"') : ''}
      <g class="strobe-legend">
        <text x="590" y="97" text-anchor="end">● jejak tiap Δt = ${f(dt, 2)} s</text>
        <text x="590" y="110" text-anchor="end">jaraknya makin lebar → dipercepat</text>
      </g>
    </g>
  `,
    `Pesepeda meluncur tanpa mengayuh menuruni lereng setinggi ${f(p.height)} meter sepanjang ${f(p.length)} meter`
  );
}

// The whole 600 × 380 scene stays in view on phones too: the slope can sit anywhere
// between x = 0 (hilltop plateau, height handle) and 600 depending on h and L.
export const camera = { desktop: '0 0 600 380', portrait: '0 0 600 380' };

/** Drag handle for an interactive parameter, in scene coordinates (on the drawn geometry). */
export function handle(key, p, portrait = false) {
  const L = layout(p);
  // On the hilltop plateau, far enough left that the handle's label (drawn to its right by
  // interaction.js) stays clear of the rider waiting at the start.
  if (key === 'height') return { x: HANDLE_X, y: L.crest.y, axis: 'y', factor: -1 / L.scale };
  const mid = add(L.top, L.u, (p.length * L.scale) / 2);
  return { x: mid.x, y: mid.y, axis: 'x', factor: 1 / (L.scale * Math.max(L.cos, 0.3)) };
}
