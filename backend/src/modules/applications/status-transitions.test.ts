import { describe, expect, it } from 'vitest';
import { allowedTransitions, isValidTransition } from './status-transitions.js';

describe('status transitions', () => {
  it('allows moving to any different status', () => {
    expect(isValidTransition('discovered', 'applied')).toBe(true);
    expect(isValidTransition('applied', 'recruiter_call')).toBe(true);
    expect(isValidTransition('offer', 'accepted')).toBe(true);
  });

  it('allows moving backwards', () => {
    expect(isValidTransition('applied', 'discovered')).toBe(true);
    expect(isValidTransition('offer', 'final_interview')).toBe(true);
    expect(isValidTransition('recruiter_call', 'applied')).toBe(true);
  });

  it('allows skipping stages', () => {
    expect(isValidTransition('discovered', 'offer')).toBe(true);
    expect(isValidTransition('applied', 'final_interview')).toBe(true);
  });

  it('allows moving out of previously-terminal states', () => {
    expect(isValidTransition('rejected', 'applied')).toBe(true);
    expect(isValidTransition('accepted', 'offer')).toBe(true);
    expect(isValidTransition('withdrawn', 'discovered')).toBe(true);
  });

  it('allows rejecting or withdrawing from any stage', () => {
    for (const from of [
      'discovered',
      'applied',
      'recruiter_call',
      'technical_interview',
      'final_interview',
      'offer',
      'accepted',
    ] as const) {
      expect(isValidTransition(from, 'rejected')).toBe(true);
      expect(isValidTransition(from, 'withdrawn')).toBe(true);
    }
  });

  it('rejects no-op transitions', () => {
    expect(isValidTransition('applied', 'applied')).toBe(false);
    expect(isValidTransition('rejected', 'rejected')).toBe(false);
  });

  it('allowedTransitions excludes the current status', () => {
    const allowed = allowedTransitions('applied');
    expect(allowed).not.toContain('applied');
    expect(allowed).toContain('discovered');
    expect(allowed).toContain('recruiter_call');
    expect(allowed).toContain('rejected');
    expect(allowed).toContain('accepted');
  });
});
