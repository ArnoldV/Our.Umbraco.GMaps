export type NoticeSeverity = 'info' | 'error';

export interface EditorNotice {
  severity: NoticeSeverity;
  message: string;
}

/**
 * Turns a geocoder status into something an editor can act on.
 *
 * Only ZERO_RESULTS actually means "that address doesn't exist". The rest are
 * configuration or quota problems on the Google API key, and reporting them as
 * "no location found" sends people looking for a typo in their address instead
 * of at their Cloud console - REQUEST_DENIED in particular is what you get when
 * the Geocoding API simply is not enabled for the key.
 */
export function describeGeocoderStatus(status: string | undefined, subject: string): EditorNotice {
  switch (status) {
    case 'ZERO_RESULTS':
      return { severity: 'info', message: `No location found for ${subject}.` };
    case 'REQUEST_DENIED':
      return {
        severity: 'error',
        message: 'Google refused the geocoding request. The Geocoding API is most likely not enabled for this API key, or the key\'s HTTP referrer restrictions exclude this site.',
      };
    case 'OVER_QUERY_LIMIT':
      return {
        severity: 'error',
        message: 'The Google API key is over its geocoding quota. Check the quota and billing status of the key in the Google Cloud console.',
      };
    case 'INVALID_REQUEST':
      return { severity: 'error', message: `Google rejected the geocoding request for ${subject} as invalid.` };
    case 'ERROR':
    case 'UNKNOWN_ERROR':
      return { severity: 'error', message: 'Could not reach the Google geocoding service. Check your connection and try again.' };
    default:
      return {
        severity: 'error',
        message: `Geocoding failed${status ? ` (${status})` : ''}. Check the browser console for the error Google reported.`,
      };
  }
}

/**
 * Order matters: UNKNOWN_ERROR must be tested before ERROR, which it contains
 * as a substring.
 */
const GEOCODER_STATUSES = [
  'ZERO_RESULTS',
  'REQUEST_DENIED',
  'OVER_QUERY_LIMIT',
  'INVALID_REQUEST',
  'UNKNOWN_ERROR',
  'ERROR',
];

/** Fallback for when the status callback never ran: the rejection carries it in its message. */
export function statusFromError(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return GEOCODER_STATUSES.find((status) => message.includes(status));
}
