import type { Telemetry } from './types';

/**
 * Anomaly reasoning for the engine temperature channel.
 *
 * The point is to reason from several signals rather than shout at the
 * first one. A primary sensor reading 1,240 °C is not, on its own, an engine
 * on fire: if the redundant sensor disagrees, thrust and fuel burn are
 * unchanged, and the reading climbed faster than metal can, the likelier
 * story is a failed sensor. If both sensors agree and thrust is falling, it
 * is the engine. Each hypothesis carries the evidence for and against it,
 * and the confidence is computed from that evidence, deterministically.
 */

export interface Evidence {
  text: string;
  /** Which hypothesis this supports. */
  supports: 'sensor_fault' | 'engine_overheat';
  weight: number;
}

export interface Hypothesis {
  id: 'sensor_fault' | 'engine_overheat';
  label: string;
  confidence: number;
}

export interface Assessment {
  detected: boolean;
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  recommendation: { action: 'switch_sensor' | 'safe_mode'; text: string } | null;
}

/** Physical limits the rules use. */
export const LIMITS = {
  /** Sensors within this many °C of each other agree. */
  agreeWithin: 150,
  /** Thermal mass: a real engine cannot warm faster than this. */
  maxPlausibleRate: 40, // °C per second
  /** Above this the flight software must protect the engine. */
  thermalLimit: 1100,
};

export function assess(window: Telemetry[]): Assessment {
  const none: Assessment = { detected: false, hypotheses: [], evidence: [], recommendation: null };
  if (window.length < 3) return none;
  const last = window[window.length - 1];
  const twoSecondsAgo = window.find((p) => last.t - p.t <= 2) ?? window[0];
  const dt = Math.max(0.25, last.t - twoSecondsAgo.t);
  const rate = (last.tempPrimary - twoSecondsAgo.tempPrimary) / dt;
  const disagreement = Math.abs(last.tempPrimary - last.tempRedundant);
  const hot = last.tempPrimary > 900 || last.tempRedundant > 900;
  if (!hot) return none;

  const evidence: Evidence[] = [];
  if (disagreement > LIMITS.agreeWithin) {
    evidence.push({
      text: `Primary reads ${Math.round(last.tempPrimary)} °C, redundant reads ${Math.round(last.tempRedundant)} °C — they disagree by ${Math.round(disagreement)} °C.`,
      supports: 'sensor_fault',
      weight: 3,
    });
  } else {
    evidence.push({ text: `Both sensors agree (${Math.round(last.tempPrimary)} °C and ${Math.round(last.tempRedundant)} °C).`, supports: 'engine_overheat', weight: 3 });
  }
  if (Math.abs(rate) > LIMITS.maxPlausibleRate) {
    evidence.push({
      text: `The primary rose ${Math.round(rate)} °C/s; an engine's thermal mass allows about ${LIMITS.maxPlausibleRate} °C/s.`,
      supports: 'sensor_fault',
      weight: 2,
    });
  }
  const thrustStable = last.thrust > 95;
  const fuelRate = (twoSecondsAgo.fuel - last.fuel) / dt;
  const burnStable = fuelRate > 0.05 && fuelRate < 1.2;
  if (thrustStable && burnStable) {
    evidence.push({ text: `Thrust is ${Math.round(last.thrust)}% and fuel burn is steady — a real overheat would show in both.`, supports: 'sensor_fault', weight: 2 });
  } else {
    evidence.push({ text: `Thrust is ${Math.round(last.thrust)}% — the engine is not behaving normally.`, supports: 'engine_overheat', weight: 2 });
  }

  const score = (id: Hypothesis['id']) => evidence.filter((e) => e.supports === id).reduce((s, e) => s + e.weight, 0) + 0.5;
  const sf = score('sensor_fault');
  const eo = score('engine_overheat');
  const total = sf + eo;
  const hypotheses: Hypothesis[] = [
    { id: 'sensor_fault', label: 'Primary temperature sensor has failed', confidence: sf / total },
    { id: 'engine_overheat', label: 'Engine is overheating', confidence: eo / total },
  ];
  hypotheses.sort((a, b) => b.confidence - a.confidence);

  const top = hypotheses[0];
  const recommendation =
    top.id === 'sensor_fault'
      ? { action: 'switch_sensor' as const, text: 'Isolate the primary sensor and continue on the redundant one.' }
      : { action: 'safe_mode' as const, text: 'Enter safe mode: cut thrust and protect the engine.' };

  return { detected: true, hypotheses, evidence, recommendation };
}
