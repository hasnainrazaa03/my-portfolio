/**
 * vimaanClaims.test.js — the Vimaan rules catch what they were written for.
 *
 * A claim rule that never fires looks identical to one that works. These feed
 * each rule the exact wording the site used to publish, and the wording that
 * replaced it, so a regex that stops matching fails here rather than letting
 * the old claim back in silently.
 */
import { describe, it, expect } from 'vitest';
import { PROHIBITED_CLAIMS, findAssertedClaim } from '../data/claimRules';
import { PROJECTS } from '../constants';

const hits = (text) => PROHIBITED_CLAIMS.map((r) => findAssertedClaim(text, r)).filter(Boolean);

describe('Vimaan claim rules', () => {
  it('catch the retired "inter-process communication" wording', () => {
    const retired =
      'integrated into the X-Plane plugin architecture using a thread-safe inter-process communication layer';
    expect(hits(retired)).toEqual(['inter-process communication']);
    expect(hits('Thread-safe Inter-Process Communication')).toHaveLength(1);
  });

  it('catch INT8 presented as a speed win', () => {
    const retired = 'optimized it using dynamic INT8 quantization for efficient offline inference';
    expect(hits(retired)).toHaveLength(1);
    expect(hits('INT8 quantization made inference 2x faster')).toHaveLength(1);
  });

  it('pass INT8 described as a memory reduction', () => {
    expect(hits('used dynamic INT8 quantization to cut its memory footprint, and exported it to ONNX Runtime')).toEqual([]);
  });

  it('catch UDP, the pre-v11 row count, and an unmeasured latency', () => {
    expect(hits('commands travel over UDP to the plugin')).toHaveLength(1);
    expect(hits('trained on 89,000 examples')).toHaveLength(1);
    expect(hits('sub-500 ms voice-to-command latency')).toHaveLength(1);
  });

  it('allow a denial placed directly before the phrase', () => {
    // findAssertedClaim only excuses a negation IMMEDIATELY before the match,
    // on purpose: "does not use UDP" would need a looser window, and a looser
    // window starts excusing sentences that do make the claim.
    expect(hits('It hands off through a thread-safe queue, not UDP')).toEqual([]);
  });

  it('are satisfied by the published Vimaan entry', () => {
    const vimaan = PROJECTS.find((p) => p.title === 'Project Vimaan');
    const published = [vimaan.description, vimaan.longDescription, ...vimaan.techStack].join(' \n ');
    expect(hits(published)).toEqual([]);
    expect(vimaan.techStack).not.toContain('Thread-safe Inter-Process Communication');
  });
});
