import { expect } from '@open-wc/testing';
import GmapsSingleMarkerElement from './single-marker-editor.element.js';
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
