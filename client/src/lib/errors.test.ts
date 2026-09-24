import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('extracts the error field from a JSON API error body', () => {
    expect(errorMessage(new Error('{"error":"invalid credentials"}\n'))).toBe('invalid credentials');
  });

  it('returns plain-text error bodies as they are', () => {
    expect(errorMessage(new Error('rate limited'))).toBe('rate limited');
  });

  it('falls back when the error carries no usable text', () => {
    expect(errorMessage(new Error(''))).toBe('Something went wrong. Please try again.');
    expect(errorMessage(new Error('{"message":"x"}'))).toBe('Something went wrong. Please try again.');
    expect(errorMessage('boom')).toBe('Something went wrong. Please try again.');
  });

  it('maps network failures to a connection message', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toBe('Could not reach the server. Check your connection and try again.');
  });
});
