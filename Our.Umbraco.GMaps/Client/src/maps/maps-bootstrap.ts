/// <reference types='@types/google.maps' />

/**
 * Loads the Maps JavaScript API, and - unlike @googlemaps/js-api-loader - lets
 * it be loaded again under a different key.
 *
 * The loader's `setOptions()` latches after its first call and its bootstrap
 * refuses to run once `google.maps.importLibrary` exists, so a key corrected in
 * the backoffice could only ever take effect on a full page reload. Doing the
 * bootstrap here instead means a new key can tear the API down and load it
 * afresh.
 *
 * Reloading the API this way is NOT supported by Google. It works because the
 * script rebuilds `window.google` when it re-executes, but state held in
 * closures from the previous load is beyond our reach. If a re-key ever leaves
 * the API misbehaving, reloading the page is the cure - which is exactly where
 * we would have been without this.
 */

import { resetGoogleMapsAuthFailure } from '../google-maps-auth.js';

const SCRIPT_SELECTOR = 'script[src*="maps.googleapis.com/maps/api/js"]';

/** Every library this package imports; loaded together so a re-key needs one script. */
const LIBRARIES = ['maps', 'marker', 'places', 'geocoding'];

/** Google calls this global once the API is ready; it has to be a global name. */
const CALLBACK = '__ourUmbracoGMapsApiReady';

interface BootstrapGlobal {
  google?: unknown;
  [CALLBACK]?: () => void;
}

/** The key the API is currently loaded under, and the load itself. */
let loadedKey: string | undefined;
let loading: Promise<void> | undefined;

/** The script URL Google is asked for. Separated out so it can be asserted on. */
export function mapsScriptUrl(key: string): string {
  const params = new URLSearchParams({
    key,
    v: 'weekly',
    libraries: LIBRARIES.join(','),
    loading: 'async',
    callback: CALLBACK,
  });
  return `https://maps.googleapis.com/maps/api/js?${params}`;
}

/** Drops any script tag loading the Maps API. Returns how many were removed. */
export function removeMapsScripts(doc: Document = document): number {
  const scripts = [...doc.querySelectorAll(SCRIPT_SELECTOR)];
  for (const script of scripts) script.remove();
  return scripts.length;
}

/** Forgets the loaded API entirely, so the next bootstrap starts from nothing. */
export function teardownMaps(): void {
  removeMapsScripts();
  delete (globalThis as BootstrapGlobal).google;
  loadedKey = undefined;
  loading = undefined;
  // The verdict belonged to the key being torn down, not to whatever loads next.
  resetGoogleMapsAuthFailure();
}

/**
 * Loads the API under `key`, resolving when it is ready to use. Repeated calls
 * with the same key share one load. Deciding *which* key, and when the loaded
 * API may be replaced, is the arbiter's job - see maps-key-arbiter.
 */
export function bootstrapMaps(key: string): Promise<void> {
  const global = globalThis as BootstrapGlobal;

  if (loadedKey === key && loading) return loading;

  loadedKey = key;
  loading = new Promise<void>((resolve, reject) => {
    global[CALLBACK] = () => {
      delete global[CALLBACK];
      resolve();
    };

    const script = document.createElement('script');
    script.src = mapsScriptUrl(key);
    script.async = true;
    script.nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ?? '';
    script.onerror = () => reject(new Error('The Google Maps JavaScript API could not load.'));
    document.head.append(script);
  });

  return loading;
}

