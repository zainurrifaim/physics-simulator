// Pure physics models for the five Usaha & Energi modules.
// All inputs and outputs are SI units unless the parameter name says otherwise
// (the seat-belt speed is entered in km/h, like the original problem).
// g = 10 m/s² everywhere, matching the supplied materials.

export const G = 10;

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const kmhToMs = (kmh) => kmh / 3.6;

/** Seconds of steady lifting shown for the weightlifter (the problem gives no time). */
export const LIFT_ANIMATION_SECONDS = 2;

function requirePositive(params) {
  for (const [key, value] of Object.entries(params)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Besaran "${key}" harus bernilai positif.`);
    }
  }
}

/** Weightlifter: is the available energy enough to raise the barbell to the target height? */
export function solveAngkat({ mass, height, energy }) {
  requirePositive({ mass, height, energy });
  const weight = mass * G;
  const work = weight * height;               // Ep = m g h
  const reachable = Math.min(height, energy / weight);
  return {
    weight,
    work,
    reachable,
    ok: energy >= work,
    duration: LIFT_ANIMATION_SECONDS,
    answer: { value: work, unit: 'J' },
  };
}

/** Crane: does the crane's power cover the power needed to lift the box in the requested time? */
export function solveDerek({ mass, height, time, power }) {
  requirePositive({ mass, height, time, power });
  const weight = mass * G;
  const work = weight * height;               // W = F s
  const required = work / time;               // P = W / t
  const minTime = work / power;
  return {
    weight,
    work,
    required,
    minTime,
    ok: power >= required,
    duration: Math.max(time, minTime),        // with too little power the lift just takes longer
    answer: { value: required, unit: 'W' },
  };
}

/**
 * Elevator descending at constant speed. Teaching model: the stated power is the maximum
 * rate at which the drive/brake can absorb the energy released by gravity, P = m_total g v.
 * The answer key's route (W = P t, F = W / s) gives the same number because v = s / t.
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
  return {
    drop,
    speed,
    maxTotalMass,
    maxPayload,
    maxPayloadWeight: Math.max(0, maxPayload) * G,
    totalMass,
    weight,
    absorbed,
    tensionWork: -weight * drop,              // supporting force acts up, motion is down
    ok: absorbed <= power,
    duration: time,
    answer: { value: Math.max(0, maxPayload) * G, unit: 'N' },
  };
}

/** Seat-belt crash test: constant deceleration over the stopping distance. */
export function solveSabuk({ speed, distance, mass, limit, carMass }) {
  requirePositive({ speed, distance, mass, limit, carMass });
  const v0 = kmhToMs(speed);
  const acceleration = -(v0 ** 2) / (2 * distance); // v² = v0² + 2 a s
  const force = mass * Math.abs(acceleration);
  return {
    v0,
    acceleration,
    force,
    kinetic: 0.5 * mass * v0 ** 2,
    carKinetic: 0.5 * carMass * v0 ** 2,
    fails: force >= limit,
    ok: force < limit,
    duration: v0 / Math.abs(acceleration),
    answer: { value: force, unit: 'N' },
  };
}

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

const solvers = {
  angkat: solveAngkat,
  derek: solveDerek,
  lift: solveLift,
  sabuk: solveSabuk,
  sepeda: solveSepeda,
};

export function solve(id, params) {
  const solver = solvers[id];
  if (!solver) throw new RangeError(`Modul tidak dikenal: ${id}`);
  return solver(params);
}

/**
 * State of the system at physical time t (seconds).
 * position: metres along the motion; speed: m/s; energies in J.
 */
export function sample(id, p, r, t) {
  const time = clamp(t, 0, r.duration);
  const q = r.duration > 0 ? time / r.duration : 1;
  switch (id) {
    case 'angkat': {
      const position = r.reachable * q;
      return { t: time, q, position, speed: r.reachable / r.duration, potential: r.weight * position, kinetic: 0 };
    }
    case 'derek': {
      const position = p.height * q;
      return { t: time, q, position, speed: p.height / r.duration, potential: r.weight * position, kinetic: 0 };
    }
    case 'lift': {
      const height = p.top - r.drop * q;
      return {
        t: time, q, position: height, speed: r.speed,
        potential: r.weight * height,
        absorbed: r.weight * (p.top - height),
        kinetic: 0.5 * r.totalMass * r.speed ** 2,
      };
    }
    case 'sabuk': {
      const speed = r.v0 + r.acceleration * time;
      const position = r.v0 * time + 0.5 * r.acceleration * time ** 2;
      return { t: time, q, position, speed, kinetic: 0.5 * p.mass * speed ** 2, potential: 0 };
    }
    case 'sepeda': {
      const position = 0.5 * r.acceleration * time ** 2;
      const speed = r.acceleration * time;
      const kinetic = 0.5 * p.mass * speed ** 2;
      return { t: time, q, position, speed, kinetic, potential: r.energy - kinetic };
    }
    default:
      throw new RangeError(`Modul tidak dikenal: ${id}`);
  }
}

/** Advance playback time; playback speed scales wall-clock time only, never the physics. */
export const advance = (t, wallDeltaSeconds, playbackSpeed, duration) =>
  clamp(t + Math.max(0, wallDeltaSeconds) * playbackSpeed, 0, duration);
