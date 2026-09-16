import type { Telemetry } from './types';

/**
 * The link between the simulation and the dashboard.
 *
 * In the production design this is a WebSocket from a server; here it is an
 * in-memory queue with the same contract, so the receiver's logic — the part
 * worth showing — is real: packets carry sequence numbers; a gap is noticed
 * and the missing packets are requested and replayed from the sender's
 * buffer; a packet that arrives late is applied only if nothing newer has
 * been applied, and a duplicate is dropped. Engineering mode can lose or
 * delay packets on purpose to show all of that happening.
 */

export interface LinkStats {
  sent: number;
  delivered: number;
  dropped: number;
  replayed: number;
  outOfOrder: number;
  duplicates: number;
  lastSeq: number;
}

export interface LinkOptions {
  /** Probability a packet is lost on the way (0–1). */
  loss?: number;
  /** Probability a packet is held back one delivery and arrives late. */
  delay?: number;
  random?: () => number;
}

export class Link {
  private buffer = new Map<number, Telemetry>();
  private held: Telemetry | null = null;
  stats: LinkStats = { sent: 0, delivered: 0, dropped: 0, replayed: 0, outOfOrder: 0, duplicates: 0, lastSeq: -1 };
  loss: number;
  delay: number;
  private random: () => number;

  constructor({ loss = 0, delay = 0, random = Math.random }: LinkOptions = {}) {
    this.loss = loss;
    this.delay = delay;
    this.random = random;
  }

  /** The sender's side: keep a copy for replay, then maybe lose or delay it. */
  send(packet: Telemetry): Telemetry[] {
    this.stats.sent += 1;
    this.buffer.set(packet.seq, packet);
    if (this.buffer.size > 200) this.buffer.delete(Math.min(...this.buffer.keys()));
    // A held packet is delivered AFTER the newer one: that is what "late" means.
    const late = this.held;
    this.held = null;
    const out: Telemetry[] = [];
    if (this.random() < this.loss) {
      this.stats.dropped += 1;
    } else if (this.random() < this.delay) {
      this.held = packet;
    } else {
      out.push(packet);
    }
    if (late) out.push(late);
    return out;
  }

  /**
   * The receiver's side. Returns the packets to apply, in order, including
   * any replayed to fill a gap. Late and duplicate packets are counted and
   * not applied.
   */
  receive(packets: Telemetry[]): Telemetry[] {
    const apply: Telemetry[] = [];
    for (const p of packets) {
      if (p.seq <= this.stats.lastSeq) {
        if (this.buffer.has(p.seq) && p.seq === this.stats.lastSeq) this.stats.duplicates += 1;
        else this.stats.outOfOrder += 1;
        continue;
      }
      // A gap: ask the sender for what was missed (it kept a copy).
      for (let seq = this.stats.lastSeq + 1; seq < p.seq; seq++) {
        const missed = this.buffer.get(seq);
        if (missed) {
          apply.push(missed);
          this.stats.replayed += 1;
        }
      }
      apply.push(p);
      this.stats.lastSeq = p.seq;
    }
    this.stats.delivered += apply.length;
    return apply;
  }
}
