import { assess, LIMITS, type Assessment } from './anomaly';
import type { Command, FaultKind, Health, MissionEvent, Phase, Subsystem, Telemetry } from './types';

/**
 * The mission: a simulated orbital insertion as a pure state machine.
 *
 * `step(state, dt)` returns the next state; `apply(state, command)` applies a
 * command once by id. Nothing here touches the DOM or a clock, so the same
 * code runs in a test, a Web Worker, or — in the version this prototype
 * stands in for — a server, with the UI receiving packets over a link.
 *
 * Timeline (mission seconds):
 *   0–3 preflight · 3–10 launch · 10–90 ascent · 90–95 separation ·
 *   95–140 insertion · 140+ stable orbit.
 *   At T+42 the primary engine-temperature sensor starts climbing faster than
 *   metal can. At the first assessment that flags it, the mission pauses and
 *   waits for the operator, with the system's own recommendation shown.
 *
 * Decisions and their consequences:
 *   switch_sensor  the primary is isolated, telemetry is degraded, the
 *                  mission continues on schedule.
 *   trust_primary  the false reading crosses the thermal limit; the flight
 *                  software shuts the engine down; safe mode, then recovery,
 *                  then insertion — 25 s late.
 *   safe_mode      thrust cut at once; the engine is checked; recovery and
 *                  insertion — 15 s late.
 * With a REAL overheat injected (engineering mode), both sensors agree and
 * thrust falls; the deterministic safety policy enters safe mode itself.
 */

export interface MissionState {
  t: number;
  seq: number;
  phase: Phase;
  running: boolean;
  awaitingDecision: boolean;
  assessment: Assessment | null;
  decision: Command['type'] | null;
  faults: FaultKind[];
  primaryIsolated: boolean;
  /** Mission seconds lost to safe mode. */
  delay: number;
  /** Seconds spent under thrust: what altitude, velocity and fuel follow. */
  powered: number;
  safeModeEntered: number | null;
  subsystems: Record<Subsystem, Health>;
  events: MissionEvent[];
  appliedCommands: string[];
  latest: Telemetry | null;
  outcome: 'orbit' | null;
}

const SCHEDULE = { launch: 3, ascent: 10, separation: 90, insertion: 95, orbit: 140 };
const NOMINAL_TEMP = 680;
const ANOMALY_AT = 42;

export function createMission(): MissionState {
  return {
    t: 0,
    seq: 0,
    phase: 'preflight',
    running: false,
    awaitingDecision: false,
    assessment: null,
    decision: null,
    faults: ['sensor_spike'],
    primaryIsolated: false,
    delay: 0,
    powered: 0,
    safeModeEntered: null,
    subsystems: { propulsion: 'nominal', navigation: 'nominal', telemetry: 'nominal', communications: 'nominal' },
    events: [{ seq: 0, t: 0, level: 'info', text: 'Vehicle on pad. Awaiting launch.' }],
    appliedCommands: [],
    latest: null,
    outcome: null,
  };
}

const log = (s: MissionState, level: MissionEvent['level'], text: string): MissionEvent[] => [
  ...s.events,
  { seq: s.seq, t: s.t, level, text },
];

/** Where the flight should be at mission time t, ignoring delays. */
function nominalPhase(t: number): Phase {
  if (t < SCHEDULE.launch) return 'preflight';
  if (t < SCHEDULE.ascent) return 'launch';
  if (t < SCHEDULE.separation) return 'ascent';
  if (t < SCHEDULE.insertion) return 'separation';
  if (t < SCHEDULE.orbit) return 'insertion';
  return 'orbit';
}

/** Telemetry for the current state, deterministic in t (small ripple, no RNG). */
export function telemetryFor(s: MissionState): Telemetry {
  const flight = s.powered;
  const inSafeMode = s.phase === 'safe_mode' || s.phase === 'recovery';
  const coasting = s.phase === 'orbit';
  const thrustBase = s.phase === 'preflight' ? 0 : inSafeMode ? 0 : coasting ? 0 : 100;
  // A real overheat builds until safe mode catches it; after recovery the
  // engine runs at reduced thrust and stays cool.
  const engineHot = s.faults.includes('real_overheat') && s.t >= ANOMALY_AT && s.safeModeEntered === null;
  const recoveredOverheat = s.faults.includes('real_overheat') && s.safeModeEntered !== null && !inSafeMode && !coasting && s.phase !== 'preflight';
  const thrust = engineHot && s.phase === 'ascent' ? Math.max(60, 100 - (s.t - ANOMALY_AT) * 6) : recoveredOverheat ? 80 : thrustBase;

  const altitude = Math.min(420, 0.03 * flight * flight * (s.phase === 'preflight' ? 0 : 1) + (coasting ? 0 : 0));
  const velocity = s.phase === 'preflight' ? 0 : Math.min(7660, 2 * flight * flight * 0.5 + 60 * flight);
  const acceleration = s.phase === 'preflight' || inSafeMode || coasting ? 0 : 28 + 12 * Math.min(1, flight / 80);
  const fuel = Math.max(4, 100 - 0.62 * flight - (inSafeMode ? 0 : 0));

  // Engine temperature: nominal, plus the fault.
  let tempPrimary = NOMINAL_TEMP + 4 * Math.sin(s.t / 3);
  let tempRedundant = NOMINAL_TEMP + 3 * Math.sin(s.t / 3 + 1);
  if (s.faults.includes('sensor_spike') && s.t >= ANOMALY_AT && !s.primaryIsolated) {
    // Implausibly fast: +560 °C in three seconds, then it sits there.
    tempPrimary += Math.min(560, (s.t - ANOMALY_AT) * 190);
  }
  if (engineHot) {
    const rise = Math.min(500, (s.t - ANOMALY_AT) * 25);
    tempPrimary += rise;
    tempRedundant += rise * 0.96;
  }
  if (inSafeMode) {
    const cool = Math.min(1, (s.t - (s.safeModeEntered ?? s.t)) / 15);
    tempPrimary = tempPrimary - (tempPrimary - NOMINAL_TEMP) * cool;
    tempRedundant = tempRedundant - (tempRedundant - NOMINAL_TEMP) * cool;
  }

  return {
    seq: s.seq,
    t: s.t,
    phase: s.phase,
    altitude,
    velocity,
    acceleration,
    fuel,
    thrust,
    tempPrimary: s.primaryIsolated ? NaN : tempPrimary,
    tempRedundant,
    busVoltage: 28.1 + 0.2 * Math.sin(s.t / 5) - (inSafeMode ? 0.6 : 0),
    comms: s.subsystems.communications === 'degraded' ? 55 : 98 - 3 * Math.abs(Math.sin(s.t / 7)),
  };
}

/** Advance mission time by dt seconds. No-op while paused for a decision. */
export function step(state: MissionState, dt: number, history: Telemetry[] = []): MissionState {
  if (!state.running || state.awaitingDecision || state.outcome) return state;
  const underPower = state.phase === 'launch' || state.phase === 'ascent' || state.phase === 'separation' || state.phase === 'insertion';
  let s: MissionState = { ...state, t: state.t + dt, seq: state.seq + 1, powered: state.powered + (underPower ? dt : 0) };

  // Phase transitions. Safe mode and recovery are timed detours.
  if (s.phase === 'safe_mode') {
    const hold = s.decision === 'trust_primary' ? 20 : 15;
    if (s.t - (s.safeModeEntered ?? s.t) >= hold) {
      s = { ...s, phase: 'recovery', events: log(s, 'info', 'Recovery: redundant sensor confirms engine temperature nominal. Restarting.') };
    }
  } else if (s.phase === 'recovery') {
    if (s.t - (s.safeModeEntered ?? s.t) >= (s.decision === 'trust_primary' ? 25 : 15) + 2) {
      // Recovery finds the broken sensor and isolates it; otherwise the same
      // false reading would trip the limit again the moment thrust returned.
      const spiked = s.faults.includes('sensor_spike') && !s.primaryIsolated;
      s = {
        ...s,
        phase: 'ascent',
        primaryIsolated: s.primaryIsolated || spiked,
        subsystems: {
          ...s.subsystems,
          propulsion: s.faults.includes('real_overheat') ? 'degraded' : 'nominal',
          telemetry: spiked ? 'degraded' : s.subsystems.telemetry,
        },
        events: log(
          s,
          'ok',
          `${spiked ? 'Primary temperature sensor isolated. ' : ''}Engine restarted${s.faults.includes('real_overheat') ? ' at 80% thrust' : ''}. Resuming ascent, ${Math.round(s.delay)} s behind schedule.`,
        ),
      };
    }
  } else {
    const want = nominalPhase(s.t - s.delay);
    if (want !== s.phase) {
      const texts: Partial<Record<Phase, [MissionEvent['level'], string]>> = {
        launch: ['ok', 'Ignition confirmed. Liftoff.'],
        ascent: ['info', 'Cleared the tower. Ascent guidance active.'],
        separation: ['info', 'Stage separation confirmed.'],
        insertion: ['info', 'Orbital insertion burn started.'],
        orbit: ['ok', `Stable orbit achieved${s.delay ? `, ${Math.round(s.delay)} s late` : ''}. Mission complete.`],
      };
      const [level, text] = texts[want] ?? ['info', want];
      s = { ...s, phase: want, events: log(s, level, text) };
      if (want === 'orbit') s = { ...s, outcome: 'orbit', running: false };
    }
  }

  const packet = telemetryFor(s);
  s = { ...s, latest: packet };

  // The safety policy runs on every packet.
  const primaryHot = !s.primaryIsolated && packet.tempPrimary > LIMITS.thermalLimit;
  const redundantHot = packet.tempRedundant > LIMITS.thermalLimit;
  if ((s.phase === 'ascent' || s.phase === 'insertion') && (primaryHot || redundantHot) && s.decision !== null) {
    // A decision has been made and the limit is still crossed: the flight
    // software protects the engine, whatever the operator chose.
    const reason = redundantHot ? 'Both sensors above the thermal limit.' : 'Primary sensor above the thermal limit (the operator kept trusting it).';
    return enterSafeMode(s, reason, s.decision === 'trust_primary' ? 25 : 15);
  }

  // Anomaly detection, before any decision is made.
  if (s.decision === null && !s.awaitingDecision) {
    const a = assess([...history.slice(-12), packet]);
    if (a.detected) {
      const real = a.hypotheses[0].id === 'engine_overheat';
      if (real) {
        // Deterministic policy: no operator needed when the evidence agrees.
        return enterSafeMode(
          { ...s, decision: 'safe_mode', assessment: a, events: log(s, 'critical', 'Both temperature sensors rising and thrust falling: engine overheat.') },
          'Safety policy entered safe mode without waiting.',
          15,
        );
      }
      return {
        ...s,
        awaitingDecision: true,
        assessment: a,
        subsystems: { ...s.subsystems, telemetry: 'degraded' },
        events: log(s, 'warn', 'Sensor disagreement on engine temperature. Holding for operator decision.'),
      };
    }
  }
  return s;
}

function enterSafeMode(s: MissionState, reason: string, delay: number): MissionState {
  return {
    ...s,
    phase: 'safe_mode',
    safeModeEntered: s.t,
    delay: s.delay + delay,
    subsystems: { ...s.subsystems, propulsion: 'fault' },
    events: log(s, 'critical', `Safe mode: thrust cut. ${reason}`),
  };
}

/** Apply a command once. A repeat of the same id — a retry — changes nothing. */
export function apply(state: MissionState, command: Command): MissionState {
  if (state.appliedCommands.includes(command.id)) return state;
  const s: MissionState = { ...state, appliedCommands: [...state.appliedCommands, command.id] };
  if (!s.awaitingDecision) return s;
  const base = { ...s, awaitingDecision: false, decision: command.type };
  switch (command.type) {
    case 'switch_sensor':
      return {
        ...base,
        primaryIsolated: true,
        events: log(base, 'ok', 'Primary temperature sensor isolated. Redundant telemetry accepted. Trajectory unchanged.'),
      };
    case 'trust_primary':
      return { ...base, events: log(base, 'warn', 'Operator kept the primary sensor. Monitoring against the thermal limit.') };
    case 'safe_mode':
      return enterSafeMode(
        { ...base, subsystems: { ...base.subsystems, propulsion: 'degraded' }, events: log(base, 'warn', 'Operator ordered safe mode.') },
        'Precautionary.',
        15,
      );
  }
}

export function launch(state: MissionState): MissionState {
  if (state.running || state.t > 0) return state;
  return { ...state, running: true, events: log(state, 'info', 'Launch sequence started.') };
}

export function injectFault(state: MissionState, fault: FaultKind): MissionState {
  if (state.faults.includes(fault)) return state;
  // A real overheat replaces the sensor spike: one story per mission.
  const faults = fault === 'real_overheat' ? ['real_overheat' as const] : [...state.faults, fault];
  return { ...state, faults, events: log(state, 'info', `Engineering mode: ${fault === 'real_overheat' ? 'real engine overheat' : 'sensor spike'} armed for T+${ANOMALY_AT}.`) };
}
