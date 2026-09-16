import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, RotateCcw, Wrench } from 'lucide-react';
import { createMission, launch, step, apply, injectFault, type MissionState } from '../../lab/mission/sim';
import { Link, type LinkStats } from '../../lab/mission/link';
import { PHASE_LABEL, type Command, type Health, type Subsystem, type Telemetry } from '../../lab/mission/types';

/**
 * Mission Control (prototype).
 *
 * The simulation, the anomaly reasoning and the link with sequence numbers
 * are the real modules (src/lab/mission); this page runs them in the browser
 * on a timer and draws the result. In the production design the simulation
 * and the sender's side of the link live on a server and the dashboard
 * receives packets over a WebSocket; the receiver's logic shown here is the
 * same. Engineering mode loses and delays packets on purpose so the replay
 * and ordering can be seen working.
 */

const TICK_MS = 250;
/** Mission seconds per real second. */
const SPEED = 3;
const DT = (TICK_MS / 1000) * SPEED;
const SPARK_POINTS = 40;

const fmtT = (t: number) => {
  const s = Math.max(0, Math.floor(t));
  return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const HEALTH_STYLE: Record<Health, string> = {
  nominal: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  degraded: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  fault: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
};
const LEVEL_STYLE = {
  info: 'text-slate-500 dark:text-slate-400',
  ok: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  critical: 'text-red-700 dark:text-red-400',
};

const Spark = ({ values }: { values: number[] }) => {
  const v = values.filter((x) => Number.isFinite(x)).slice(-SPARK_POINTS);
  if (v.length < 2) return <svg viewBox="0 0 120 28" className="h-7 w-full" aria-hidden="true" />;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const span = max - min || 1;
  const pts = v.map((y, i) => `${(i / (SPARK_POINTS - 1)) * 120},${26 - ((y - min) / span) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-full text-primary" aria-hidden="true" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const Tile = ({ label, value, unit, values, note }: { label: string; value: string; unit: string; values: number[]; note?: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
      {value} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unit}</span>
    </p>
    <Spark values={values} />
    {note && <p className="text-[11px] text-amber-700 dark:text-amber-400">{note}</p>}
  </div>
);

const MissionControlPage = () => {
  const [mission, setMission] = useState<MissionState>(() => createMission());
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [engineering, setEngineering] = useState(false);
  const [loss, setLoss] = useState(0);
  const [delay, setDelay] = useState(0);
  const linkRef = useRef(new Link());
  const simHistoryRef = useRef<Telemetry[]>([]);
  // The clock reads the latest state through a ref so it never restarts.
  const missionRef = useRef(mission);
  useEffect(() => {
    missionRef.current = mission;
  }, [mission]);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    linkRef.current.loss = loss;
    linkRef.current.delay = delay;
  }, [loss, delay]);

  // The clock. Each tick advances the simulation, sends its packet over the
  // link, and applies whatever the receiver accepts.
  useEffect(() => {
    const id = setInterval(() => {
      const current = missionRef.current;
      if (!current.running || current.awaitingDecision || current.outcome) return;
      const next = step(current, DT, simHistoryRef.current);
      if (next.latest) simHistoryRef.current = [...simHistoryRef.current.slice(-30), next.latest];
      const delivered = next.latest ? linkRef.current.receive(linkRef.current.send(next.latest)) : [];
      setMission(next);
      if (delivered.length) setHistory((h) => [...h.slice(-240), ...delivered]);
      setStats({ ...linkRef.current.stats });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [mission.events.length]);

  const reset = useCallback(() => {
    linkRef.current = new Link({ loss, delay });
    simHistoryRef.current = [];
    setHistory([]);
    setStats(null);
    setMission(createMission());
  }, [loss, delay]);

  const decide = (type: Command['type']) => {
    // One id per decision: a double click or a retry applies once.
    const id = `decision-${mission.seq}`;
    setMission((m) => apply(m, { id, type }));
  };

  const shown = history.length ? history[history.length - 1] : mission.latest;
  const series = useMemo(() => {
    const pick = (k: keyof Telemetry) => history.map((p) => p[k] as number);
    return {
      altitude: pick('altitude'),
      velocity: pick('velocity'),
      fuel: pick('fuel'),
      tempP: pick('tempPrimary'),
      tempR: pick('tempRedundant'),
      bus: pick('busVoltage'),
      comms: pick('comms'),
    };
  }, [history]);

  const a = mission.assessment;
  const subsystems: Subsystem[] = ['propulsion', 'navigation', 'telemetry', 'communications'];

  return (
    <main className="min-h-screen bg-white text-slate-800 dark:bg-[#030014] dark:text-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <a href="/lab" className="inline-flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
          <ArrowLeft size={16} aria-hidden="true" /> Back to the lab
        </a>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-widest text-primary">Prototype · simulation runs in your browser</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Mission Control</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Launch a simulated vehicle to orbit. Partway up, a sensor will start lying. The system reasons from several signals,
          recommends a response, and leaves the decision to you — then shows what your decision cost.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMission((m) => launch(m))}
            disabled={mission.running || mission.t > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-5 py-2.5 font-bold text-white shadow-[0_0_20px_rgba(45,212,191,0.3)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Play size={16} aria-hidden="true" /> Launch
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20"
          >
            <RotateCcw size={14} aria-hidden="true" /> Reset
          </button>
          <button
            type="button"
            onClick={() => setEngineering((v) => !v)}
            aria-pressed={engineering}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              engineering ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-slate-300 hover:border-primary dark:border-white/20'
            }`}
          >
            <Wrench size={14} aria-hidden="true" /> Engineering mode
          </button>
          <span className="ml-auto font-mono text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {fmtT(mission.t)} · {PHASE_LABEL[mission.phase]}
          </span>
        </div>

        {engineering && (
          <section className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm" aria-label="Engineering mode">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <label htmlFor="mc-loss">Packet loss</label>
                  <span className="tabular-nums">{Math.round(loss * 100)}%</span>
                </div>
                <input id="mc-loss" type="range" min={0} max={0.5} step={0.05} value={loss} onChange={(e) => setLoss(Number(e.target.value))} className="mt-1 w-full accent-[var(--arc-ai)]" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <label htmlFor="mc-delay">Delayed packets</label>
                  <span className="tabular-nums">{Math.round(delay * 100)}%</span>
                </div>
                <input id="mc-delay" type="range" min={0} max={0.5} step={0.05} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="mt-1 w-full accent-[var(--arc-ai)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fault to arm (before T+42)</p>
                <button
                  type="button"
                  disabled={mission.t >= 40 || mission.faults.includes('real_overheat')}
                  onClick={() => setMission((m) => injectFault(m, 'real_overheat'))}
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-primary disabled:opacity-50 dark:border-white/20"
                >
                  Real engine overheat instead of a sensor spike
                </button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums sm:grid-cols-6">
              {(
                [
                  ['sent', stats?.sent ?? 0],
                  ['delivered', stats?.delivered ?? 0],
                  ['dropped', stats?.dropped ?? 0],
                  ['replayed', stats?.replayed ?? 0],
                  ['late', stats?.outOfOrder ?? 0],
                  ['duplicates', stats?.duplicates ?? 0],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-md bg-white/60 px-2 py-1 dark:bg-black/30">
                  <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Link: in-browser queue with sequence numbers. Dropped packets are replayed from the sender's buffer; a late packet is
              applied only if nothing newer has been.
            </p>
          </section>
        )}

        {mission.awaitingDecision && a && (
          <section className="mt-6 rounded-2xl border-2 border-amber-500/60 bg-amber-500/5 p-5" aria-live="assertive" aria-label="Decision required">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">Decision required · mission holding</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Inconsistent engine temperature detected</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200 list-none p-0">
              {a.evidence.map((e) => (
                <li key={e.text} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {e.text}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {a.hypotheses.map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900 dark:text-white">{h.label}</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">{Math.round(h.confidence * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${h.confidence * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {a.recommendation && (
              <p className="mt-4 text-sm text-slate-800 dark:text-slate-100">
                <span className="font-semibold text-primary">Recommended:</span> {a.recommendation.text} Confidence{' '}
                {Math.round(a.hypotheses[0].confidence * 100)}%. The decision is yours.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['switch_sensor', 'Switch to the redundant sensor', 'Isolates the primary. Trajectory unchanged.'],
                  ['trust_primary', 'Keep the primary sensor', 'If it is wrong, the thermal limit trips and the engine shuts down.'],
                  ['safe_mode', 'Enter safe mode', 'Protects the vehicle now; delays insertion.'],
                ] as const
              ).map(([type, label, hint]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => decide(type)}
                  className={`rounded-xl border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    a.recommendation?.action === type
                      ? 'border-primary bg-primary/10 hover:bg-primary/15'
                      : 'border-slate-300 bg-white/70 hover:border-primary dark:border-white/20 dark:bg-white/[0.03]'
                  }`}
                >
                  <span className="block font-semibold text-slate-900 dark:text-white">{label}</span>
                  <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{hint}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Mission view */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5 lg:col-span-2" aria-label="Mission view">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mission view</h2>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${mission.phase === 'safe_mode' ? HEALTH_STYLE.fault : mission.phase === 'recovery' ? HEALTH_STYLE.degraded : HEALTH_STYLE.nominal}`}>
                {PHASE_LABEL[mission.phase]}
              </span>
            </div>
            <svg viewBox="0 0 600 260" className="mt-3 block h-auto w-full text-slate-400 dark:text-slate-500" role="img" aria-label={`Trajectory: ${shown ? `${Math.round(shown.altitude)} km at ${fmtT(mission.t)}` : 'on the pad'}`}>
              {/* Earth's limb and the target orbit. */}
              <path d="M -100 420 A 520 520 0 0 1 700 420" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
              <path d="M -100 330 A 610 610 0 0 1 700 330" fill="none" stroke="var(--arc-ai)" strokeOpacity="0.35" strokeDasharray="4 6" />
              <text x="560" y="322" fontSize="10" fill="currentColor" textAnchor="end">target orbit · 420 km</text>
              {[1, 2, 3].map((k) => (
                <line key={k} x1="0" x2="600" y1={260 - k * 60} y2={260 - k * 60} stroke="currentColor" strokeOpacity="0.08" />
              ))}
              {/* Altitude against mission time. */}
              {history.length > 1 && (
                <polyline
                  points={history.map((p) => `${(p.t / 150) * 600},${240 - (p.altitude / 420) * 200}`).join(' ')}
                  fill="none"
                  stroke="var(--arc-ai)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              )}
              {shown && (
                <g transform={`translate(${(shown.t / 150) * 600} ${240 - (shown.altitude / 420) * 200})`}>
                  {(mission.phase === 'safe_mode' || mission.phase === 'recovery') && <circle r="14" fill="none" stroke="#ef4444" strokeOpacity="0.6" />}
                  <circle r="5" fill="var(--arc-ai)" className="stroke-white dark:stroke-[#0b0a1a]" strokeWidth="2" />
                </g>
              )}
              <text x="8" y="252" fontSize="10" fill="currentColor">T+0</text>
              <text x="592" y="252" fontSize="10" fill="currentColor" textAnchor="end">T+2:30</text>
            </svg>
          </section>

          {/* Subsystems */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5" aria-label="System status">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">System status</h2>
            <ul className="mt-3 space-y-2 list-none p-0">
              {subsystems.map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-800 dark:text-slate-100">{s}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${HEALTH_STYLE[mission.subsystems[s]]}`}>{mission.subsystems[s]}</span>
                </li>
              ))}
            </ul>
            {mission.outcome && (
              <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                Stable orbit{mission.delay ? `, ${Math.round(mission.delay)} s late` : ' on schedule'}.
                {mission.decision === 'switch_sensor' && ' Switching sensors preserved the trajectory.'}
                {mission.decision === 'trust_primary' && ' Trusting the faulty sensor caused an unnecessary shutdown.'}
                {mission.decision === 'safe_mode' && !mission.faults.includes('real_overheat') && ' Safe mode protected the vehicle but delayed insertion.'}
              </p>
            )}
          </section>

          {/* Telemetry */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2" aria-label="Telemetry">
            <Tile label="Altitude" value={shown ? shown.altitude.toFixed(0) : '—'} unit="km" values={series.altitude} />
            <Tile label="Velocity" value={shown ? shown.velocity.toFixed(0) : '—'} unit="m/s" values={series.velocity} />
            <Tile label="Fuel" value={shown ? shown.fuel.toFixed(0) : '—'} unit="%" values={series.fuel} />
            <Tile
              label="Engine temp · primary"
              value={shown ? (Number.isFinite(shown.tempPrimary) ? shown.tempPrimary.toFixed(0) : 'isolated') : '—'}
              unit={shown && Number.isFinite(shown.tempPrimary) ? '°C' : ''}
              values={series.tempP}
              note={mission.primaryIsolated ? 'Sensor isolated' : undefined}
            />
            <Tile label="Engine temp · redundant" value={shown ? shown.tempRedundant.toFixed(0) : '—'} unit="°C" values={series.tempR} />
            <Tile label="Bus voltage" value={shown ? shown.busVoltage.toFixed(1) : '—'} unit="V" values={series.bus} />
          </section>

          {/* Event log */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5" aria-label="Event log">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Event log</h2>
            <ol ref={logRef} className="custom-scrollbar mt-3 max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs list-none p-0">
              {mission.events.map((e, i) => (
                <li key={`${e.seq}-${i}`} className={`flex gap-3 ${LEVEL_STYLE[e.level]}`}>
                  <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500">{fmtT(e.t)}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary">What this prototype already does</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li>A pure state machine for the mission phases; tests assert a phase can never run backwards.</li>
              <li>Anomaly reasoning from several signals: sensor disagreement, rate of change against thermal mass, thrust and fuel burn. A spike is not called an engine failure; agreeing sensors are.</li>
              <li>A recommendation with its evidence and confidence; the operator decides, and each choice has a modelled consequence.</li>
              <li>A deterministic safety policy that acts without waiting when the evidence agrees.</li>
              <li>Commands carry ids, so a retry applies once.</li>
              <li>Telemetry carries sequence numbers; the receiver replays gaps, ignores late packets and drops duplicates — engineering mode shows the counters.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-primary">What the production version adds</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li>The simulation and the sender's buffer on a server; the dashboard receives over a WebSocket and reconnects with its last sequence number.</li>
              <li>Mission sessions persisted, with structured event logs and completed-mission results.</li>
              <li>Idempotent command handling on the server, rate limits, and connection recovery under real network conditions.</li>
              <li>Observability: event latency, messages processed, replay counts and recovery time, recorded per mission.</li>
              <li>An LLM used only to turn the structured evidence into a readable explanation, never to choose the action.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
};

export default MissionControlPage;
