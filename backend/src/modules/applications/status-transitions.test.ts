import { describe, expect, it } from 'vitest';
import { allowedTransitions, isValidTransition } from './status-transitions.js';

describe('status transitions', () => {
  it('allows advancing one stage along the pipeline', () => {
    expect(isValidTransition('discovered', 'applied')).toBe(true);
    expect(isValidTransition('applied', 'recruiter_call')).toBe(true);
    expect(isValidTransition('final_interview', 'offer')).toBe(true);
    expect(isValidTransition('offer', 'accepted')).toBe(true);
  });

  it('forbids skipping stages', () => {
    expect(isValidTransition('discovered', 'recruiter_call')).toBe(false);
    expect(isValidTransition('discovered', 'offer')).toBe(false);
    expect(isValidTransition('applied', 'final_interview')).toBe(false);
  });

  it('forbids moving backwards', () => {
    expect(isValidTransition('applied', 'discovered')).toBe(false);
    expect(isValidTransition('offer', 'final_interview')).toBe(false);
  });

  it('allows rejecting or withdrawing from any active stage', () => {
    for (const from of [
      'discovered',
      'applied',
      'recruiter_call',
      'technical_interview',
      'final_interview',
      'offer',
    ] as const) {
      expect(isValidTransition(from, 'rejected')).toBe(true);
      expect(isValidTransition(from, 'withdrawn')).toBe(true);
    }
  });

  it('treats accepted/rejected/withdrawn as terminal', () => {
    expect(allowedTransitions('accepted')).toEqual([]);
    expect(allowedTransitions('rejected')).toEqual([]);
    expect(allowedTransitions('withdrawn')).toEqual([]);
    expect(isValidTransition('rejected', 'applied')).toBe(false);
  });

  it('rejects no-op transitions', () => {
    expect(isValidTransition('applied', 'applied')).toBe(false);
  });
});
