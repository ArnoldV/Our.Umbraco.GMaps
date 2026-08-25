/**
 * The things that can go wrong with the Google Maps API key, worded once so
 * every map editor says the same thing.
 *
 * All of them point at `GoogleMaps:ApiKey` by name where that is the setting at
 * fault: a key set there applies to every datatype at once, and naming it saves
 * a hunt through the docs for where "appsettings" actually means. A rejection
 * says which of the two keys was refused, because the fix is in a different
 * place - and the datatype's own field is not always the one in use.
 */

/** Where the key the SDK was configured with came from. */
export type ApiKeySource = 'datatype' | 'appsettings';

export const MISSING_KEY_MESSAGE =
  'No Google Maps API key is configured. Enter one in the Google API Key field above, ' +
  'or set GoogleMaps:ApiKey in appsettings.json (or user secrets) to use one key across the site.';

/**
 * Shown to an editor whose key is not the one the page loaded. The Maps API is
 * keyed once per page, so the second key was never tried - saying it was
 * "rejected" would send someone hunting for a fault in a perfectly good key.
 */
export const CONFLICTING_KEY_MESSAGE =
  'This page already loaded Google Maps with a different API key. The Maps API allows only ' +
  'one API key per page, so this map cannot use its own. Give every map property on this ' +
  'page the same key, or set one key in GoogleMaps:ApiKey and let them all share it.';

/** The same three things to check whichever key was refused. */
const WHAT_TO_CHECK =
  'Check that the key is valid, that billing is enabled, ' +
  'and that the site is allowed by the key\'s HTTP referrer restrictions.';

/** Explains a `gm_authFailure`, naming the key that has to be fixed. */
export function describeRejectedKey(source: ApiKeySource): string {
  return source === 'appsettings'
    ? `Google Maps rejected the site-wide API key from GoogleMaps:ApiKey in appsettings. ${WHAT_TO_CHECK}`
    : `Google Maps rejected the API key configured on this datatype. ${WHAT_TO_CHECK}`;
}
