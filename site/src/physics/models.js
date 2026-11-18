// Pure physics models for the five Usaha & Energi modules.
// All inputs and outputs are SI units unless the parameter name says otherwise
// (the seat-belt speed is entered in km/h, like the original problem).
// g = 10 m/s² everywhere, matching the supplied materials.
//
// Each solver returns the verdict (`ok`) AND a complete timeline. `sample()` gives the
// state at any time, including what happens when the verdict is "no": the barbell is
// dropped, the crane runs out of time or stalls, the overloaded lift trips its safety
// brake, the torn belt lets the dummy fly into the dashboard. Scenes only draw these
// states; they never decide physics on their own.

export const G = 10;

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const kmhToMs = (kmh) => kmh / 3.6;

/** Seconds a full planned lift takes (the problem gives no time). */
export const LIFT_ANIMATION_SECONDS = 2;
/** Shortest lift phase, so a tiny lift is still a smooth start-and-stop motion. */
export const MIN_LIFT_SECONDS = 0.8;
/** Athlete holds the barbell at the top (success) or struggles at the limit (failure). */
export const HOLD_SECONDS = 0.6;
/** Barbell centre height when the plates rest on the floor (Ø 450 mm plates). */
export const BAR_REST_HEIGHT = 0.22;
/** After a failed lift the athlete lets go and straightens up over this time. */
export const RELEASE_SECONDS = 0.6;

/** Elevator overspeed governor trips the safety brake at this multiple of rated speed. */
export const OVERSPEED_TRIP = 1.15;
/** Safety-gear deceleration (≈ 0.5 g, within the usual 0.2–1 g range). */
export const SAFETY_DECEL = 5;

/** Free gap between the seated dummy's chest and the dashboard/steering wheel. */
export const DASH_GAP = 0.45;

/** Steepest slope offered in the bicycle lesson (sin θ ≤ 0,7, θ ≈ 44°): steeper is a cliff, not a ride. */
export const MAX_SLOPE_SIN = 0.7;

/**
 * Threshold comparisons get a relative tolerance so a setup exactly at a limit (e.g. the
 * answer-key payload) is never flipped by floating-point rounding (4000.0000000000005 W).
 */
const TOL = 1e-9;
const atMost = (a, limit) => a <= limit * (1 + TOL);

/** Phases that last a tiny fraction of the timeline; playback slows down while they run. */
export const SLOW_PHASES = new Set(['overspeed', 'braking']);

function requirePositive(params) {
  for (const [key, value] of Object.entries(params)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Besaran "${key}" harus bernilai positif.`);
    }
  }
}

// ---------------------------------------------------------------- angkat

/** Weightlifter: is the available energy enough to raise the barbell to the target height? */
export function solveAngkat({ mass, height, energy }) {
  requirePositive({ mass, height, energy });
  const weight = mass * G;
  const work = weight * height;               // Ep = m g h
  const ok = atMost(work, energy);
  const reachable = ok ? height : energy / weight;
  // Smooth start-stop lift (smoothstep). Its duration keeps ½mv² + mgh ≤ E at every instant.
  const liftTime = Math.max(MIN_LIFT_SECONDS, (LIFT_ANIMATION_SECONDS * reachable) / height);
  const holdEnd = liftTime + HOLD_SECONDS;
  // Failed lift: the energy is spent below the target, the athlete releases and the bar falls.
  const dropTime = ok ? 0 : Math.sqrt((2 * reachable) / G);
  const duration = holdEnd + (ok ? 0 : Math.max(dropTime + 0.3, RELEASE_SECONDS));
  return {
    weight,
    work,
    reachable,
    ok,
    liftTime,
    holdEnd,
    dropTime,
    impactSpeed: ok ? 0 : G * dropTime,
    duration,
    answer: { value: work, unit: 'J' },
  };
}

function sampleAngkat(p, r, t) {
  const m = p.mass;
  if (t <= r.liftTime) {
    const u = t / r.liftTime;
    const position = r.reachable * (3 * u * u - 2 * u ** 3);
    const speed = (r.reachable * 6 * u * (1 - u)) / r.liftTime;
    const acceleration = (r.reachable * (6 - 12 * u)) / r.liftTime ** 2;
    const kinetic = 0.5 * m * speed ** 2;
    const potential = r.weight * position;
    // athlete's force on the bar: F − mg = m a
    return { phase: 'lift', position, speed, acceleration, liftForce: m * (G + acceleration), potential, kinetic, athleteWork: potential + kinetic, grip: true };
  }
  const top = { position: r.reachable, speed: 0, acceleration: 0, liftForce: r.weight, potential: r.weight * r.reachable, kinetic: 0, athleteWork: r.weight * r.reachable };
  if (t <= r.holdEnd || r.ok) return { phase: r.ok ? 'hold' : 'struggle', ...top, grip: true };
  const td = Math.min(t - r.holdEnd, r.dropTime);
  const position = Math.max(0, r.reachable - 0.5 * G * td * td);
  const speed = -G * td;
  if (t - r.holdEnd >= r.dropTime) {
    // resting on the floor: the floor's normal force balances the weight
    return { phase: 'dropped', position: 0, speed: 0, acceleration: 0, liftForce: 0, normal: r.weight, potential: 0, kinetic: 0, athleteWork: top.athleteWork, grip: false };
  }
  return { phase: 'drop', position, speed, acceleration: -G, liftForce: 0, potential: r.weight * position, kinetic: 0.5 * m * speed ** 2, athleteWork: top.athleteWork, grip: false };
}

// ---------------------------------------------------------------- derek

/**
 * Crane with two real limits: mechanical power P (sets the fastest steady hoisting speed,
 * v = P / mg) and rated load (largest weight the hoist can pull). The requested time is a
 * hard window: the clock stops at t even if the crate is not yet at the top.
 */
export function solveDerek({ mass, height, time, power, capacity = Infinity }) {
  requirePositive({ mass, height, time, power });
  if (!(capacity > 0)) throw new RangeError('Besaran "capacity" harus bernilai positif.');
  const weight = mass * G;
  const work = weight * height;               // W = F s
  const required = work / time;               // P = W / t
  const minTime = work / power;
  const overload = mass > capacity;
  const powerOk = atMost(required, power);
  const speed = overload ? 0 : powerOk ? height / time : power / weight;
  const reached = Math.min(height, speed * time);
  return {
    weight,
    work,
    required,
    minTime,
    overload,
    powerOk,
    speed,
    reached,
    hoistPower: weight * speed,
    maxForce: capacity * G,
    ok: !overload && powerOk,
    duration: time,
    answer: { value: required, unit: 'W' },
  };
}

function sampleDerek(p, r, t) {
  const position = Math.min(r.reached, r.speed * t);
  const done = t >= r.duration;
  // t = 0: switched on but not yet moving (so a paused/preview frame shows no power used)
  const idle = t <= 0;
  const phase = r.overload ? 'stall' : idle ? 'ready' : done ? (r.ok ? 'arrived' : 'timeout') : 'lift';
  return {
    phase,
    position,
    speed: done || idle || r.overload ? 0 : r.speed,
    potential: r.weight * position,
    kinetic: 0,
    power: done || idle || r.overload ? 0 : r.hoistPower,
    tension: r.overload ? r.maxForce : r.weight,
  };
}

// ---------------------------------------------------------------- lift

/**
 * Elevator descending at constant speed. Teaching model: the stated power is the maximum
 * rate at which the drive/brake can absorb the energy released by gravity, P = m_total g v.
 * The answer key's route (W = P t, F = W / s) gives the same number because v = s / t.
 * If the load needs more than P, the brake force (≤ P / v) is too small, the cabin speeds
 * up, and at OVERSPEED_TRIP × v the governor fires the safety brake. If it reaches the
 * bottom first, it lands on the pit buffer faster than rated speed.
 */
export function solveLift({ cabin, payload, top, bottom, time, power }) {
  requirePositive({ cabin, top, time, power });
  if (!Number.isFinite(payload) || payload < 0) throw new RangeError('Massa muatan tidak boleh negatif.');
  if (!Number.isFinite(bottom) || bottom < 0) throw new RangeError('Ketinggian akhir tidak boleh negatif.');
  if (top <= bottom) throw new RangeError('Ketinggian awal harus lebih besar dari ketinggian akhir.');
  const drop = top - bottom;
  const speed = drop / time;
  const maxTotalMass = power / (G * speed);
  const maxPayload = maxTotalMass - cabin;
  const totalMass = cabin + payload;
  const weight = totalMass * G;
  const absorbed = weight * speed;            // power the brake must absorb
  const ok = atMost(absorbed, power);
  const base = {
    drop,
    speed,
    maxTotalMass,
    maxPayload,
    maxPayloadWeight: Math.max(0, maxPayload) * G,
    totalMass,
    weight,
    absorbed,
    tensionWork: -weight * drop,              // supporting force acts up, motion is down
    ok,
    duration: time,
    answer: { value: Math.max(0, maxPayload) * G, unit: 'N' },
    energy0: weight * top + 0.5 * totalMass * speed ** 2,
  };
  if (ok) return { ...base, outcome: 'arrived', track: null };

  // Overload: integrate m dv/dt = m g − P / v (drive at full power) until trip or bottom.
  const track = [{ t: 0, y: top, v: speed, driveE: 0, safetyE: 0 }];
  const trip = OVERSPEED_TRIP * speed;
  let t = 0, y = top, v = speed, driveE = 0, outcome = 'buffer';
  const dt = Math.min(time / 4000, 0.01);
  while (t < time) {
    // midpoint (RK2) step
    const a1 = G - power / (totalMass * v);
    const vm = v + a1 * dt / 2;
    const a2 = G - power / (totalMass * vm);
    let h = dt, vn = v + a2 * h;
    if (vn >= trip) { h = (trip - v) / a2; vn = trip; outcome = 'safety'; }
    let yn = y - vm * h;
    if (yn <= bottom) {
      h = (y - bottom) / vm; yn = bottom; vn = v + a2 * h; outcome = 'buffer';
      t += h; driveE += power * h; y = yn; v = vn;
      track.push({ t, y, v, driveE, safetyE: 0 });
      break;
    }
    t += h; driveE += power * h; y = yn; v = vn;
    track.push({ t, y, v, driveE, safetyE: 0 });
    if (outcome === 'safety') break;
  }
  if (outcome === 'safety') {
    // safety gear: constant deceleration; it absorbs the rest of the energy
    const stopTime = v / SAFETY_DECEL;
    const stopDist = (v * v) / (2 * SAFETY_DECEL);
    const tripT = t, tripY = y, tripV = v;
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      const tt = (stopTime * i) / steps;
      const vv = tripV - SAFETY_DECEL * tt;
      const yy = tripY - (tripV * tt - 0.5 * SAFETY_DECEL * tt * tt);
      const safetyE = base.energy0 - weight * yy - 0.5 * totalMass * vv * vv - driveE;
      track.push({ t: tripT + tt, y: yy, v: Math.max(0, vv), driveE, safetyE });
    }
    return { ...base, outcome, track, tripTime: tripT, tripHeight: tripY, stopHeight: tripY - stopDist, impactSpeed: 0 };
  }
  return { ...base, outcome, track, impactSpeed: v, stopHeight: bottom };
}

function sampleLift(p, r, t) {
  if (!r.track) {
    const height = p.top - r.speed * t;
    const released = r.weight * (p.top - height);
    const ke = 0.5 * r.totalMass * r.speed ** 2;
    if (t >= r.duration) {
      // stopped at the landing; the drive absorbed the last ½mv² while levelling
      return { phase: 'arrived', position: p.bottom, speed: 0, potential: r.weight * p.bottom, kinetic: 0, absorbed: released + ke, drivePower: 0, safetyEnergy: 0 };
    }
    return {
      phase: 'descend', position: height, speed: r.speed,
      potential: r.weight * height, kinetic: ke,
      absorbed: released, drivePower: r.absorbed, safetyEnergy: 0,
    };
  }
  const tr = r.track;
  const last = tr[tr.length - 1];
  if (t >= last.t) {
    // stopped (safety brake held) or landed on the buffer (buffer absorbs the remaining KE)
    const bufferE = r.outcome === 'buffer' ? 0.5 * r.totalMass * last.v ** 2 : 0;
    return {
      phase: r.outcome === 'safety' ? 'stopped' : 'buffer', position: last.y, speed: 0,
      potential: r.weight * last.y, kinetic: 0, absorbed: last.driveE, drivePower: 0,
      safetyEnergy: last.safetyE + bufferE,
    };
  }
  let lo = 0, hi = tr.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tr[mid].t <= t) lo = mid; else hi = mid; }
  const a = tr[lo], b = tr[hi];
  const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
  const lerp = (k) => a[k] + (b[k] - a[k]) * u;
  const v = lerp('v');
  const tripped = r.outcome === 'safety' && t > r.tripTime;
  return {
    phase: tripped ? 'braking' : 'overspeed', position: lerp('y'), speed: v,
    potential: r.weight * lerp('y'), kinetic: 0.5 * r.totalMass * v * v,
    absorbed: lerp('driveE'), drivePower: tripped ? 0 : p.power, safetyEnergy: lerp('safetyE'),
  };
}

// ---------------------------------------------------------------- sabuk

/**
 * Seat-belt crash test: the car stops with constant deceleration over the crumple distance.
 * A belt that holds pins the dummy to the seat (belt force = m |a|). A belt that would need
 * F ≥ its strength tears at the first instant of braking; the dummy then keeps moving at
 * v0 (seat friction ignored) until it hits the dashboard DASH_GAP ahead, then moves with the car.
 */
export function solveSabuk({ speed, distance, mass, limit, carMass }) {
  requirePositive({ speed, distance, mass, limit, carMass });
  const v0 = kmhToMs(speed);
  const acceleration = -(v0 ** 2) / (2 * distance); // v² = v0² + 2 a s
  const decel = Math.abs(acceleration);
  const force = mass * decel;
  const fails = force >= limit * (1 - TOL);
  const carStop = v0 / decel;
  let hitTime = Infinity, impactSpeed = 0;
  if (fails) {
    // relative forward slide: ½|a|t² while braking (reaches `distance` at carStop), then v0 (t − T) + distance
    if (DASH_GAP <= distance) { hitTime = Math.sqrt((2 * DASH_GAP) / decel); impactSpeed = decel * hitTime; }
    else { hitTime = carStop + (DASH_GAP - distance) / v0; impactSpeed = v0; }
  }
  const end = fails ? Math.max(carStop, hitTime) : carStop;
  return {
    v0,
    acceleration,
    force,
    kinetic: 0.5 * mass * v0 ** 2,
    carKinetic: 0.5 * carMass * v0 ** 2,
    fails,
    ok: !fails,
    carStop,
    hitTime,
    impactSpeed,
    impulse: mass * impactSpeed,               // Δp of the dummy in the dashboard collision (N·s)
    duration: end * (fails ? 1.25 : 1),
    answer: { value: force, unit: 'N' },
  };
}

function sampleSabuk(p, r, t) {
  const a = r.acceleration;
  const tc = Math.min(t, r.carStop);
  const carSpeed = r.v0 + a * tc;
  const position = r.v0 * tc + 0.5 * a * tc * tc;
  if (!r.fails) {
    return {
      phase: t <= 0 ? 'ready' : t >= r.carStop ? 'stopped' : 'braking', position, speed: carSpeed,
      dummySpeed: carSpeed, dummyOffset: 0, beltIntact: true, beltForce: t > 0 && t < r.carStop ? r.force : 0, dashForce: 0,
      kinetic: 0.5 * p.mass * carSpeed ** 2, potential: 0,
    };
  }
  // belt torn at t = 0⁺
  const free = t < r.hitTime;
  const dummyPos = free ? r.v0 * t : null;
  let dummyOffset, dummySpeed;
  if (free) { dummyOffset = dummyPos - position; dummySpeed = r.v0; }
  else { dummyOffset = DASH_GAP; dummySpeed = carSpeed; }
  return {
    phase: t <= 0 ? 'ready' : free ? 'torn' : 'impact', position, speed: carSpeed,
    // after the collision the dashboard pushes the dummy along with the still-braking car
    dummySpeed, dummyOffset, beltIntact: t <= 0, beltForce: 0, dashForce: !free && t < r.carStop ? p.mass * Math.abs(a) : 0,
    kinetic: 0.5 * p.mass * dummySpeed ** 2, potential: 0,
  };
}

// ---------------------------------------------------------------- sepeda

/** Cyclist down a straight frictionless slope, starting from rest. */
export function solveSepeda({ mass, height, length }) {
  requirePositive({ mass, height, length });
  if (height > length) throw new RangeError('Tinggi bukit tidak boleh melebihi panjang lintasan.');
  const speed = Math.sqrt(2 * G * height);    // mgh = ½ m v²
  const acceleration = G * height / length;   // g sin θ
  const sinTheta = height / length;
  return {
    speed,
    acceleration,
    weight: mass * G,
    normal: mass * G * Math.sqrt(1 - sinTheta ** 2),
    energy: mass * G * height,
    angle: Math.asin(sinTheta),
    ok: true,
    duration: 2 * length / speed,             // average speed (0 + v)/2
    answer: { value: 2 * length / speed, unit: 's' },
  };
}

function sampleSepeda(p, r, t) {
  const position = 0.5 * r.acceleration * t ** 2;
  const speed = r.acceleration * t;
  const kinetic = 0.5 * p.mass * speed ** 2;
  return { phase: t >= r.duration ? 'arrived' : 'ride', position, speed, kinetic, potential: r.energy - kinetic };
}

// ---------------------------------------------------------------- dispatch

const solvers = {
  angkat: solveAngkat,
  derek: solveDerek,
  lift: solveLift,
  sabuk: solveSabuk,
  sepeda: solveSepeda,
};

const samplers = {
  angkat: sampleAngkat,
  derek: sampleDerek,
  lift: sampleLift,
  sabuk: sampleSabuk,
  sepeda: sampleSepeda,
};

export function solve(id, params) {
  const solver = solvers[id];
  if (!solver) throw new RangeError(`Modul tidak dikenal: ${id}`);
  return solver(params);
}

/**
 * State of the system at physical time t (seconds).
 * Every state has: t, q (0…1 progress through the timeline), phase, position, speed,
 * potential, kinetic, plus module-specific fields documented in each sampler.
 */
export function sample(id, p, r, t) {
  const sampler = samplers[id];
  if (!sampler) throw new RangeError(`Modul tidak dikenal: ${id}`);
  const time = clamp(t, 0, r.duration);
  const q = r.duration > 0 ? time / r.duration : 1;
  return { t: time, q, ...sampler(p, r, time) };
}

/** Advance playback time; playback speed scales wall-clock time only, never the physics. */
export const advance = (t, wallDeltaSeconds, playbackSpeed, duration) =>
  clamp(t + Math.max(0, wallDeltaSeconds) * playbackSpeed, 0, duration);
