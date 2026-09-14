/**
 * jobDescription.test.js — recognising a pasted posting without hijacking questions.
 *
 * A false positive swallows a real question, which is worse than missing a
 * posting (that still gets an ordinary reply). So the negative cases matter as
 * much as the positive ones.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  looksLikeJobDescription,
  postingSignals,
  asksAboutFit,
  wordCount,
  stashFitDraft,
  peekFitDraft,
  clearFitDraft,
  FIT_DRAFT_KEY,
  MIN_POSTING_CHARS,
} from '../utils/jobDescription';

const POSTING = `Machine Learning Engineer, Perception

About the role
We are looking for an ML engineer to join our autonomy team. You will train and deploy perception models.

Responsibilities:
- Train deep learning models for 3D segmentation
- Build data pipelines for point-cloud data
- Optimise models for on-device inference

Requirements:
- 3+ years of experience shipping ML systems
- Strong Python and PyTorch
- Bachelor's in Computer Science or a related field

Nice to have: CUDA, ROS. Full-time, hybrid in Los Angeles. Benefits include equity and 401(k).`;

describe('looksLikeJobDescription', () => {
  it('recognises a real posting', () => {
    expect(looksLikeJobDescription(POSTING)).toBe(true);
  });

  it('still recognises it after a single-line field has flattened the newlines', () => {
    expect(looksLikeJobDescription(POSTING.replace(/\n+/g, ' '))).toBe(true);
  });

  it('recognises a terse posting with bullets and few prose markers', () => {
    const terse = `Senior Backend Engineer (Remote)
Requirements:
• 5+ years experience with Go or Rust
• Distributed systems in production
• Kubernetes, Terraform
• Strong communication
Compensation: $180-220k base plus equity. We are hiring across US time zones for this full-time role and will review applications on a rolling basis starting this month.`;
    expect(terse.length).toBeGreaterThanOrEqual(MIN_POSTING_CHARS);
    expect(looksLikeJobDescription(terse)).toBe(true);
  });

  it('does NOT flag a long, detailed question about the work', () => {
    const question =
      'I read about Project Vimaan and the store-separation study, and I am curious how you decided between ' +
      'quantizing the DistilBERT model and exporting it to ONNX. What did you measure, what surprised you, and ' +
      'if you were starting again today with a larger team and more compute, what would you change about the ' +
      'data pipeline and the evaluation? Also, how did the aerospace background shape the safety guards?';
    expect(question.length).toBeGreaterThan(MIN_POSTING_CHARS);
    expect(looksLikeJobDescription(question)).toBe(false);
  });

  it('does NOT flag a recruiter describing a role in one short message', () => {
    expect(looksLikeJobDescription('We are hiring a remote ML engineer with 3 years of experience — interested?')).toBe(false);
  });

  it('does NOT flag a long message that hits only one or two markers', () => {
    const two = `${'I have a question about your experience. '.repeat(6)}Would you consider a remote role?`;
    expect(postingSignals(two)).toBeLessThan(3);
    expect(looksLikeJobDescription(two)).toBe(false);
  });

  it('handles empty and nullish input', () => {
    expect(looksLikeJobDescription('')).toBe(false);
    expect(looksLikeJobDescription(undefined)).toBe(false);
  });
});

describe('asksAboutFit', () => {
  it('spots questions about fitting a role', () => {
    for (const q of [
      'Is he a good fit for an ML infrastructure role?',
      'Can I paste a job description?',
      'Would Hasnain be a fit for this role?',
      'Does he match the role we have open?',
    ]) {
      expect(asksAboutFit(q), q).toBe(true);
    }
  });

  it('leaves ordinary questions alone', () => {
    for (const q of ['What did you build at Deloitte?', 'Tell me about Project Vimaan', 'fitness tracker ideas?']) {
      expect(asksAboutFit(q), q).toBe(false);
    }
  });
});

describe('the hand-off to /fit', () => {
  beforeEach(() => sessionStorage.clear());

  it('carries the full posting, newlines and all', () => {
    expect(stashFitDraft(POSTING)).toBe(true);
    expect(peekFitDraft()).toBe(POSTING);
  });

  it('peeking is idempotent — a render React discards and retries must see the same posting', () => {
    // The first version read-and-removed during render; under load the
    // discarded attempt consumed the posting and /fit opened empty.
    stashFitDraft(POSTING);
    expect(peekFitDraft()).toBe(POSTING);
    expect(peekFitDraft()).toBe(POSTING);
  });

  it('is cleared explicitly, so a reload of /fit starts clean', () => {
    stashFitDraft(POSTING);
    clearFitDraft();
    expect(peekFitDraft()).toBeNull();
    expect(sessionStorage.getItem(FIT_DRAFT_KEY)).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(stashFitDraft('x')).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('counts words for the stand-in bubble', () => {
    expect(wordCount('one two  three\nfour')).toBe(4);
    expect(wordCount('')).toBe(0);
  });
});
