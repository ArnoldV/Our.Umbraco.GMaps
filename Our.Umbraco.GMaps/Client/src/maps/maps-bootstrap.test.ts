import { expect } from '@open-wc/testing';
import { mapsScriptUrl, removeMapsScripts, teardownMaps } from './maps-bootstrap.js';
import { onGoogleMapsAuthFailure } from '../google-maps-auth.js';

describe('maps/maps-bootstrap', () => {
  it('asks Google for the key it was given', () => {
    const url = new URL(mapsScriptUrl('a-key'));

    expect(url.searchParams.get('key')).to.equal('a-key');
  });

  it('loads every library this package uses', () => {
    const libraries = new URL(mapsScriptUrl('a-key')).searchParams.get('libraries')!.split(',');

    expect(libraries).to.have.members(['maps', 'marker', 'places', 'geocoding']);
  });

  it('names a callback so the load can be awaited', () => {
    const url = new URL(mapsScriptUrl('a-key'));

    expect(url.searchParams.get('callback')).to.be.a('string').and.not.equal('');
  });

  it('removes a script that is loading the maps api', () => {
    const script = document.createElement('script');
    script.dataset.testScript = 'true';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=stale';
    document.head.append(script);

    removeMapsScripts();

    expect(document.querySelector('script[data-test-script]')).to.equal(null);
  });

  it('leaves unrelated scripts alone', () => {
    const script = document.createElement('script');
    script.dataset.otherScript = 'true';
    script.src = 'https://example.com/thing.js';
    document.head.append(script);

    removeMapsScripts();
    const survived = document.querySelector('script[data-other-script]');
    survived?.remove();

    expect(survived).to.not.equal(null);
  });

  it('forgets that the old key was refused, so a new one is judged afresh', () => {
    onGoogleMapsAuthFailure(() => {})();
    (globalThis as { gm_authFailure?: () => void }).gm_authFailure?.();

    teardownMaps();
    let told = false;
    onGoogleMapsAuthFailure(() => { told = true; })();

    expect(told).to.equal(false);
  });

  it('forgets the loaded api so a new key can bootstrap it again', () => {
    (globalThis as { google?: unknown }).google = { maps: {} };

    teardownMaps();

    expect((globalThis as { google?: unknown }).google).to.equal(undefined);
  });
});
