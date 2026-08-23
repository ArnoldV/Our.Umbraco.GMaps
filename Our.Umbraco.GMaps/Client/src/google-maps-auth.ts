/// <reference types='@types/google.maps' />

/**
 * Capture Maps JavaScript API authentication failures.
 *
 * The Maps JS API does not reject a promise or raise an event when the API key
 * itself is rejected (invalid key, referrer not allowed, billing disabled). Its
 * only programmatic hook is a global `gm_authFailure` function, which it calls
 * once and which we therefore have to install before the API loads.
 *
 * Because several map property editors can share a page - and because something
 * else on the page may already have installed a handler - the global is
 * installed once here and fans out to registered listeners, chaining to any
 * pre-existing handler rather than replacing it.
 */

type AuthFailureListener = () => void;

interface AuthFailureGlobal {
  gm_authFailure?: () => void;
}

const listeners = new Set<AuthFailureListener>();
let installed = false;
/** The API calls gm_authFailure once; remember it for editors created later. */
let failed = false;

/**
 * Registers a listener for Maps JS API authentication failure. Fires immediately
 * if the failure already happened before this listener existed.
 * @returns an unsubscribe function.
 */
export function onGoogleMapsAuthFailure(listener: AuthFailureListener): () => void {
  listeners.add(listener);

  if (!installed) {
    installed = true;
    const target = globalThis as AuthFailureGlobal;
    const previous = target.gm_authFailure;
    target.gm_authFailure = () => {
      failed = true;
      previous?.();
      for (const registered of [...listeners]) {
        registered();
      }
    };
  }

  if (failed) {
    listener();
  }

  return () => {
    listeners.delete(listener);
  };
}
