import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('takes the first letter of up to two name parts', () => {
    expect(initialsOf('flavio_trads')).toBe('FT');
    expect(initialsOf('ana.maria-silva')).toBe('AM');
    expect(initialsOf('Ada Lovelace')).toBe('AL');
  });

  it('uses the first two letters of a single-part name', () => {
    expect(initialsOf('qa')).toBe('QA');
    expect(initialsOf('john')).toBe('JO');
  });

  it('ignores a leading @ and surrounding separators', () => {
    expect(initialsOf('@_john_')).toBe('JO');
  });

  it('falls back to a question mark for empty input', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('__')).toBe('?');
  });
});
