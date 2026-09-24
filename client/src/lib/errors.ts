const FALLBACK = 'Something went wrong. Please try again.';
const NETWORK = 'Could not reach the server. Check your connection and try again.';

/** Turns an error thrown by api() (whose message is the raw response body) into user-facing text. */
export function errorMessage(err: unknown): string {
  if (err instanceof TypeError) return NETWORK;
  if (!(err instanceof Error)) return FALLBACK;
  const body = err.message.trim();
  if (!body) return FALLBACK;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string' && parsed.error) {
      return parsed.error;
    }
    return FALLBACK;
  } catch {
    return body;
  }
}
