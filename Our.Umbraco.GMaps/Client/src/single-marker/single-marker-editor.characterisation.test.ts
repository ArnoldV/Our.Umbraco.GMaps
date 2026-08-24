import { expect } from '@open-wc/testing';
import GmapsSingleMarkerElement from './single-marker-editor.element.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Address, Location, Map } from '../types.js';

/**
 * Characterisation tests: these pin the editor's behaviour EXACTLY as it is
 * today, correct or not, so the phase 1/2 refactor can be verified. Where the
 * pinned behaviour is arguably wrong, the test says so - but it still asserts
 * what the code does. Changing any of it is a separate, deliberate decision.
 *
 * The element is constructed directly rather than via fixture(): Lit does not
 * render until connected, so no map is created and no API key is needed.
 */
describe('single-marker editor: coordinate helpers (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
  });

  describe('getAsNumber', () => {
    it('returns undefined for undefined', () => {
      expect(editor.getAsNumber(undefined)).to.equal(undefined);
    });

    it('returns a number unchanged', () => {
      expect(editor.getAsNumber(52.379189)).to.equal(52.379189);
    });

    it('invokes a function value', () => {
      expect(editor.getAsNumber(() => 4.899431)).to.equal(4.899431);
    });

    it('parses a string, trimming whitespace', () => {
      expect(editor.getAsNumber('  4.899431 ')).to.equal(4.899431);
    });

    it('yields NaN - not undefined - for non-numeric text', () => {
      expect(editor.getAsNumber('Paris')).to.be.NaN;
    });
  });

  describe('parseCoordinates', () => {
    it('parses a lat,lng pair', () => {
      expect(editor.parseCoordinates('52.379189, 4.899431', false)).to.deep.equal({
        lat: 52.379189,
        lng: 4.899431,
      });
    });

    it('parses negative coordinates', () => {
      expect(editor.parseCoordinates('-37.8136,144.9631', false)).to.deep.equal({
        lat: -37.8136,
        lng: 144.9631,
      });
    });

    it('rejects text that merely contains a comma', () => {
      expect(editor.parseCoordinates('Paris, France', false)).to.equal(undefined);
    });

    it('rejects a latitude outside -90..90', () => {
      expect(editor.parseCoordinates('91, 0', false)).to.equal(undefined);
    });

    it('rejects a longitude outside -180..180', () => {
      expect(editor.parseCoordinates('0, 181', false)).to.equal(undefined);
    });

    it('rejects three parts', () => {
      expect(editor.parseCoordinates('1,2,3', false)).to.equal(undefined);
    });

    it('rejects undefined', () => {
      expect(editor.parseCoordinates(undefined, false)).to.equal(undefined);
    });

    it('falls back to the default location when asked to', () => {
      expect(editor.parseCoordinates('Paris, France')).to.deep.equal(DEFAULT_LOCATION);
    });
  });

  describe('formatCoordinates', () => {
    it('joins lat and lng with a comma and no space', () => {
      expect(editor.formatCoordinates({ lat: -37.8136, lng: 144.9631 })).to.equal(
        '-37.8136,144.9631',
      );
    });

    it('returns undefined when given no coordinates', () => {
      expect(editor.formatCoordinates(undefined as never)).to.equal(undefined);
    });
  });
});

describe('single-marker editor: getAddressObject (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
  });

  const component = (types: string[], longText: string | null) =>
    ({ longText, shortText: longText, types }) as never;

  it('returns undefined when given no components', () => {
    expect(editor.getAddressObject(undefined)).to.equal(undefined);
    expect(editor.getAddressObject(null)).to.equal(undefined);
  });

  it('composes a full address from the usual components', () => {
    const result = editor.getAddressObject([
      component(['street_number'], '88'),
      component(['route'], 'Dock Rd'),
      component(['locality'], 'Port Melbourne'),
      component(['administrative_area_level_1'], 'Victoria'),
      component(['postal_code'], '3207'),
      component(['country'], 'Australia'),
    ]);

    expect(result).to.deep.equal({
      full_address: '',
      streetNumber: '88',
      street: 'Dock Rd',
      postalcode: '3207',
      state: 'Victoria',
      city: 'Port Melbourne',
      country: 'Australia',
    });
  });

  it('only consults types[0], ignoring a matching type later in the array', () => {
    const result = editor.getAddressObject([component(['political', 'locality'], 'Nowhere')]);

    expect(result?.city).to.equal('');
  });

  it('lets the last matching component win, with no precedence between them', () => {
    const localityFirst = editor.getAddressObject([
      component(['locality'], 'Locality'),
      component(['postal_town'], 'Postal Town'),
    ]);
    expect(localityFirst?.city).to.equal('Postal Town');

    const postalTownFirst = editor.getAddressObject([
      component(['postal_town'], 'Postal Town'),
      component(['locality'], 'Locality'),
    ]);
    expect(postalTownFirst?.city).to.equal('Locality');
  });

  it('substitutes an empty string for a null longText', () => {
    const result = editor.getAddressObject([component(['country'], null)]);

    expect(result?.country).to.equal('');
  });

  it('ignores component types it does not recognise', () => {
    const result = editor.getAddressObject([component(['plus_code'], 'ignored')]);

    expect(result).to.deep.equal({
      full_address: '',
      streetNumber: '',
      street: '',
      postalcode: '',
      state: '',
      city: '',
      country: '',
    });
  });
});

/** The private state setValue() reads. Assigning it directly is how these
 *  tests reach behaviour that otherwise only a live map can produce. */
interface EditorInternals {
  _address?: Address;
  _friendlyName?: string;
  _location?: Location;
  _center?: Location;
  _zoomLevel: number;
  _defaultLocation: Location;
  _autoCompleteSearchValue?: string;
  setValue(): void;
}

describe('single-marker editor: setValue (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;
  let internals: EditorInternals;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
    internals = editor as unknown as EditorInternals;
  });

  it('lets the live friendly name override a stale one inside _address', () => {
    internals._address = { friendlyName: 'Stale', city: 'Melbourne' };
    internals._friendlyName = 'Live';
    internals._location = { lat: 1, lng: 2 };

    internals.setValue();

    expect(editor.value?.address.friendlyName).to.equal('Live');
    expect(editor.value?.address.city).to.equal('Melbourne');
  });

  it('clears the friendly name when the live one is undefined', () => {
    internals._address = { friendlyName: 'Stale' };

    internals.setValue();

    expect(editor.value?.address.friendlyName).to.equal(undefined);
  });

  it('falls back to _defaultLocation for the pin coordinates', () => {
    internals._defaultLocation = { lat: 10, lng: 20 };
    internals._location = undefined;

    internals.setValue();

    expect(editor.value?.address.coordinates).to.deep.equal({ lat: 10, lng: 20 });
  });

  it('falls back to the hardcoded DEFAULT_LOCATION for the centre, NOT _defaultLocation', () => {
    internals._defaultLocation = { lat: 10, lng: 20 };
    internals._center = undefined;

    internals.setValue();

    expect(editor.value?.mapconfig.centerCoordinates).to.deep.equal(DEFAULT_LOCATION);
  });

  it('carries zoom, maptype and centre into mapconfig', () => {
    internals._zoomLevel = 12;
    internals._center = { lat: 3, lng: 4 };

    internals.setValue();

    expect(editor.value?.mapconfig.zoom).to.equal(12);
    expect(editor.value?.mapconfig.maptype).to.equal('roadmap');
    expect(editor.value?.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
  });

  it('dispatches a change event', () => {
    let changes = 0;
    editor.addEventListener('change', () => { changes++; });

    internals.setValue();

    expect(changes).to.equal(1);
  });
});

describe('single-marker editor: clearing the value (characterisation)', () => {
  it('drops every piece of derived search state', () => {
    const editor = new GmapsSingleMarkerElement();
    const internals = editor as unknown as EditorInternals;

    editor.value = {
      address: { friendlyName: 'Head Office', city: 'Melbourne', coordinates: { lat: 1, lng: 2 } },
      mapconfig: { zoom: 12 },
    } as Map;
    internals._address = { city: 'Melbourne' };
    internals._friendlyName = 'Head Office';
    internals._location = { lat: 1, lng: 2 };
    internals._autoCompleteSearchValue = '12 Collins St';

    editor.value = undefined;

    expect(internals._address).to.equal(undefined);
    expect(internals._friendlyName).to.equal(undefined);
    expect(internals._location).to.equal(undefined);
    expect(internals._autoCompleteSearchValue).to.equal(undefined);
  });
});
