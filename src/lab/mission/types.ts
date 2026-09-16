/** Mission Control: shared types for the simulation, the link and the UI. */

export type Phase =
  | 'preflight'
  | 'launch'
  | 'ascent'
  | 'separation'
  | 'insertion'
  | 'orbit'
  | 'safe_mode'
  | 'recovery';

export const PHASE_LABEL: Record<Phase, string> = {
  preflight: 'Preflight',
  launch: 'Launch',
  ascent: 'Ascent',
  separation: 'Separation',
  insertion: 'Orbital insertion',
  orbit: 'Stable orbit',
  safe_mode: 'Safe mode',
  recovery: 'Recovery',
};

/** One telemetry packet. `seq` is the ordering key; `t` is mission time in seconds. */
export interface Telemetry {
  seq: number;
  t: number;
  phase: Phase;
  altitude: number; // km
  velocity: number; // m/s
  acceleration: number; // m/s²
  fuel: number; // %
  thrust: number; // % of nominal
  tempPrimary: number; // °C, primary engine temperature sensor
  tempRedundant: number; // °C, redundant sensor
  busVoltage: number; // V
  comms: number; // % link quality
}

export type Level = 'info' | 'ok' | 'warn' | 'critical';

export interface MissionEvent {
  seq: number;
  t: number;
  level: Level;
  text: string;
}

export type Subsystem = 'propulsion' | 'navigation' | 'telemetry' | 'communications';
export type Health = 'nominal' | 'degraded' | 'fault';

export type CommandType = 'switch_sensor' | 'trust_primary' | 'safe_mode';

/** A command carries an id so a retry applies once (idempotent). */
export interface Command {
  id: string;
  type: CommandType;
}

export type FaultKind = 'sensor_spike' | 'real_overheat';
