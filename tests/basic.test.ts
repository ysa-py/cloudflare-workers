import { describe, it, expect } from 'vitest';
import { expiryToISO } from '../src/utils/time';

describe('expiryToISO', () => {
  it('converts date and time to ISO UTC', () => {
    const iso = expiryToISO('2025-12-31', '23:59:59');
    expect(iso).toBe('2025-12-31T23:59:59.000Z');
  });
});
