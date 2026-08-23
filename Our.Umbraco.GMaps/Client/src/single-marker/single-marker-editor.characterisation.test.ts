import { expect } from '@open-wc/testing';
import GmapsSingleMarkerElement, {
  describeGeocoderStatus,
  statusFromError,
} from './single-marker-editor.element.js';
import { DEFAULT_LOCATION } from '../types.js';

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
      // The signature says Location, but the body guards for falsy and the
      // callers rely on the undefined return.
      expect(editor.formatCoordinates(undefined as never)).to.equal(undefined);
    });
  });
});

describe('single-marker editor: getAddressObject (characterisation)', () => {
  let editor: GmapsSingleMarkerElement;

  beforeEach(() => {
    editor = new GmapsSingleMarkerElement();
  });

  // google.maps.places.AddressComponent is an interface with more members than
  // the composer reads, so tests build the minimum and cast.
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
      // Never populated by this function - the caller merges formattedAddress in.
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
    // Google routinely returns ['locality', 'political']; the reverse shape is
    // silently dropped. Pinned as-is.
    const result = editor.getAddressObject([component(['political', 'locality'], 'Nowhere')]);

    expect(result?.city).to.equal('');
  });

  it('lets the last matching component win, with no precedence between them', () => {
    // The spec originally described postal_town as taking precedence over
    // locality. It does not: both map to `city` and the later one overwrites.
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

describe('single-marker editor: geocoder status reporting (characterisation)', () => {
  it('treats ZERO_RESULTS as information, not an error', () => {
    const notice = describeGeocoderStatus('ZERO_RESULTS', '"Nowhere"');

    expect(notice.severity).to.equal('info');
    expect(notice.message).to.equal('No location found for "Nowhere".');
  });

  it('explains REQUEST_DENIED as a key/API configuration problem', () => {
    const notice = describeGeocoderStatus('REQUEST_DENIED', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('Geocoding API');
  });

  it('explains OVER_QUERY_LIMIT as a quota problem', () => {
    const notice = describeGeocoderStatus('OVER_QUERY_LIMIT', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('quota');
  });

  it('names the subject when Google rejects the request as invalid', () => {
    const notice = describeGeocoderStatus('INVALID_REQUEST', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('"anywhere"');
  });

  it('reports ERROR and UNKNOWN_ERROR as a connectivity problem', () => {
    for (const status of ['ERROR', 'UNKNOWN_ERROR']) {
      const notice = describeGeocoderStatus(status, '"anywhere"');

      expect(notice.severity).to.equal('error');
      expect(notice.message).to.contain('Could not reach');
    }
  });

  it('includes an unrecognised status in the fallback message', () => {
    const notice = describeGeocoderStatus('SOMETHING_NEW', '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.contain('(SOMETHING_NEW)');
  });

  it('omits the parenthetical when there is no status at all', () => {
    const notice = describeGeocoderStatus(undefined, '"anywhere"');

    expect(notice.severity).to.equal('error');
    expect(notice.message).to.not.contain('(');
  });

  it('recovers a status from an Error message', () => {
    expect(statusFromError(new Error('Geocoding failed: REQUEST_DENIED'))).to.equal(
      'REQUEST_DENIED',
    );
  });

  it('prefers UNKNOWN_ERROR over the ERROR substring it contains', () => {
    expect(statusFromError(new Error('UNKNOWN_ERROR'))).to.equal('UNKNOWN_ERROR');
  });

  it('returns undefined when no known status appears', () => {
    expect(statusFromError(new Error('something else went wrong'))).to.equal(undefined);
    expect(statusFromError(undefined)).to.equal(undefined);
  });
});
