/**
 * mission.test.js — the Mission Control prototype's logic, without its UI.
 *
 * The claims the case study makes are the ones tested: phases cannot happen
 * out of order, a sensor spike is not called an engine failure, agreeing
 * sensors are, a repeated command applies once, and the link replays what it
 * dropped without duplicating anything.
 */
import { describe, it, expect } from 'vitest';
import { createMission, launch, step, apply, injectFault, telemetryFor } from '../lab/mission/sim';
import { assess } from '../lab/mission/anomaly';
import { Link } from '../lab/mission/link';

const DT = 0.75;

/** Run until a predicate holds or the mission ends, keeping a telemetry history for the detector. */
function runUntil(state, pred, maxSeconds = 400) {
  const history = [];
  let s = state;
  while (!pred(s) && s.t < maxSeconds && !s.outcome) {
    s = step(s, DT, history);
    if (s.latest) history.push(s.latest);
    if (!s.running && !s.outcome && !s.awaitingDecision) break;
  }
  return { state: s, history };
}

const ORDER = ['preflight', 'launch', 'ascent', 'separation', 'insertion', 'orbit'];

describe('the mission', () => {
  it('goes through its phases in order and pauses at the sensor disagreement', () => {
    const seen = [];
    let s = launch(createMission());
    const history = [];
    while (!s.awaitingDecision && s.t < 100) {
      s = step(s, DT, history);
      history.push(s.latest);
      if (seen[seen.length - 1] !== s.phase) seen.push(s.phase);
    }
    expect(s.awaitingDecision).toBe(true);
    expect(s.phase).toBe('ascent');
    expect(s.t).toBeGreaterThan(42);
    expect(s.t).toBeLessThan(48);
    expect(seen).toEqual(['preflight', 'launch', 'ascent']);
    // Time stands still while the operator decides.
    expect(step(s, DT, history).t).toBe(s.t);
  });

  it('calls the spike a sensor fault, with evidence, and recommends isolating it', () => {
    const { state } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const a = state.assessment;
    expect(a.hypotheses[0].id).toBe('sensor_fault');
    expect(a.hypotheses[0].confidence).toBeGreaterThan(0.8);
    expect(a.recommendation.action).toBe('switch_sensor');
    expect(a.evidence.map((e) => e.text).join(' ')).toMatch(/disagree/);
    expect(a.evidence.map((e) => e.text).join(' ')).toMatch(/°C\/s/);
  });

  it('switching to the redundant sensor keeps the schedule and reaches orbit', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const decided = apply(paused, { id: 'c1', type: 'switch_sensor' });
    expect(decided.primaryIsolated).toBe(true);
    expect(decided.subsystems.telemetry).toBe('degraded');
    const { state } = runUntil(decided, (s) => s.outcome === 'orbit');
    expect(state.outcome).toBe('orbit');
    expect(state.delay).toBe(0);
    expect(state.events.map((e) => e.text).join(' ')).not.toMatch(/Safe mode/);
  });

  it('trusting the faulty sensor causes an unnecessary shutdown, then recovery, then a late orbit', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const decided = apply(paused, { id: 'c1', type: 'trust_primary' });
    const { state: safe } = runUntil(decided, (s) => s.phase === 'safe_mode');
    expect(safe.phase).toBe('safe_mode');
    expect(safe.subsystems.propulsion).toBe('fault');
    const { state } = runUntil(safe, (s) => s.outcome === 'orbit');
    expect(state.outcome).toBe('orbit');
    expect(state.delay).toBe(25);
    const phases = state.events.map((e) => e.text);
    expect(phases.join(' ')).toMatch(/Recovery/);
    expect(phases[phases.length - 1]).toMatch(/25 s late/);
  });

  it('safe mode by choice protects the vehicle and costs less time than the shutdown', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const { state } = runUntil(apply(paused, { id: 'c1', type: 'safe_mode' }), (s) => s.outcome === 'orbit');
    expect(state.outcome).toBe('orbit');
    expect(state.delay).toBe(15);
  });

  it('never lets a phase run backwards', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const { state, history } = runUntil(apply(paused, { id: 'c1', type: 'trust_primary' }), (s) => s.outcome === 'orbit');
    const rank = (p) => ORDER.indexOf(p);
    let high = -1;
    for (const p of history.map((h) => h.phase)) {
      if (p === 'safe_mode' || p === 'recovery') continue;
      expect(rank(p)).toBeGreaterThanOrEqual(high);
      high = Math.max(high, rank(p));
    }
    expect(state.outcome).toBe('orbit');
  });

  it('a repeated command applies once', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const once = apply(paused, { id: 'retry-me', type: 'safe_mode' });
    const twice = apply(once, { id: 'retry-me', type: 'safe_mode' });
    expect(twice).toBe(once);
    expect(twice.events.filter((e) => /ordered safe mode/.test(e.text))).toHaveLength(1);
  });

  it('enters safe mode on its own when both sensors agree the engine is hot', () => {
    const armed = injectFault(launch(createMission()), 'real_overheat');
    const { state } = runUntil(armed, (s) => s.phase === 'safe_mode');
    expect(state.phase).toBe('safe_mode');
    expect(state.awaitingDecision).toBe(false);
    expect(state.assessment.hypotheses[0].id).toBe('engine_overheat');
    expect(state.events.map((e) => e.text).join(' ')).toMatch(/without waiting/);
  });

  it('telemetry hides the isolated primary sensor', () => {
    const { state: paused } = runUntil(launch(createMission()), (s) => s.awaitingDecision);
    const decided = apply(paused, { id: 'c1', type: 'switch_sensor' });
    expect(Number.isNaN(telemetryFor(decided).tempPrimary)).toBe(true);
    expect(telemetryFor(decided).tempRedundant).toBeLessThan(800);
  });
});

describe('the anomaly assessment', () => {
  const packet = (t, tp, tr, thrust = 100, fuel = 100 - 0.62 * t) => ({
    seq: t, t, phase: 'ascent', altitude: 0, velocity: 0, acceleration: 30, fuel, thrust, tempPrimary: tp, tempRedundant: tr, busVoltage: 28, comms: 98,
  });

  it('is quiet while both sensors are nominal', () => {
    expect(assess([packet(40, 680, 682), packet(41, 681, 683), packet(42, 680, 681)]).detected).toBe(false);
  });

  it('reads an implausible, disagreeing spike as a sensor fault', () => {
    const a = assess([packet(42, 680, 682), packet(43, 870, 683), packet(44, 1060, 684), packet(45, 1240, 684)]);
    expect(a.detected).toBe(true);
    expect(a.hypotheses[0].id).toBe('sensor_fault');
    expect(a.hypotheses[0].confidence).toBeGreaterThan(0.85);
  });

  it('reads agreeing sensors and falling thrust as an overheat', () => {
    const a = assess([packet(42, 900, 890, 90), packet(44, 960, 950, 82), packet(46, 1010, 1000, 74)]);
    expect(a.hypotheses[0].id).toBe('engine_overheat');
    expect(a.recommendation.action).toBe('safe_mode');
  });
});

describe('the link', () => {
  const pkt = (seq) => ({ seq, t: seq, phase: 'ascent', altitude: 0, velocity: 0, acceleration: 0, fuel: 0, thrust: 0, tempPrimary: 0, tempRedundant: 0, busVoltage: 0, comms: 0 });

  it('delivers in order with nothing lost by default', () => {
    const link = new Link();
    const got = [];
    for (let i = 0; i < 20; i++) got.push(...link.receive(link.send(pkt(i))));
    expect(got.map((p) => p.seq)).toEqual([...Array(20).keys()]);
    expect(link.stats).toMatchObject({ dropped: 0, replayed: 0, outOfOrder: 0, duplicates: 0 });
  });

  it('replays what the link dropped, so nothing is missing and nothing repeats', () => {
    const seq = [0.1, 0.9, 0.05, 0.9, 0.9, 0.02, 0.9, 0.9];
    let i = 0;
    const link = new Link({ loss: 0.5, random: () => seq[i++ % seq.length] });
    const got = [];
    for (let n = 0; n < 40; n++) got.push(...link.receive(link.send(pkt(n))));
    expect(link.stats.dropped).toBeGreaterThan(0);
    expect(link.stats.replayed).toBe(link.stats.dropped);
    expect(got.map((p) => p.seq)).toEqual([...Array(40).keys()]);
  });

  it('applies a late packet only if nothing newer has been applied', () => {
    // send() draws twice per packet (loss, then delay); every second packet is held back one delivery.
    const draws = [0.9, 0.9, 0.9, 0.1];
    let i = 0;
    const link = new Link({ delay: 0.5, random: () => draws[i++ % draws.length] });
    const got = [];
    for (let n = 0; n < 12; n++) got.push(...link.receive(link.send(pkt(n))));
    const seqs = got.map((p) => p.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(link.stats.outOfOrder + link.stats.replayed).toBeGreaterThan(0);
  });

  it('drops a duplicate', () => {
    const link = new Link();
    link.receive(link.send(pkt(0)));
    expect(link.receive([pkt(0)])).toEqual([]);
    expect(link.stats.duplicates).toBe(1);
  });
});
