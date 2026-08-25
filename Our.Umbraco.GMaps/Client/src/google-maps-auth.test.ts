import { expect } from '@open-wc/testing';
import { onGoogleMapsAuthFailure, resetGoogleMapsAuthFailure } from './google-maps-auth.js';

/** Fire the global the Maps API calls when it refuses a key. */
function rejectTheKey() {
  (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();
}

describe('google-maps-auth', () => {
  it('tells a listener registered before the failure', () => {
    let told = false;
    const stop = onGoogleMapsAuthFailure(() => { told = true; });

    rejectTheKey();
    stop();

    expect(told).to.equal(true);
  });

  it('tells a listener that arrived after the failure', () => {
    onGoogleMapsAuthFailure(() => {})();
    rejectTheKey();

    let told = false;
    onGoogleMapsAuthFailure(() => { told = true; })();

    expect(told).to.equal(true);
  });

  it('stops replaying the failure once the api is reloaded', () => {
    onGoogleMapsAuthFailure(() => {})();
    rejectTheKey();

    resetGoogleMapsAuthFailure();
    let told = false;
    onGoogleMapsAuthFailure(() => { told = true; })();

    expect(told).to.equal(false);
  });
});
