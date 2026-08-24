import { expect } from '@open-wc/testing';
import { formatCoordinates, parseCoordinates, toNumber } from './coordinates.js';

describe('core/coordinates', () => {
  describe('toNumber', () => {
    it('returns undefined for undefined', () => {
      expect(toNumber(undefined)).to.equal(undefined);
    });

    it('returns a number unchanged', () => {
      expect(toNumber(52.379189)).to.equal(52.379189);
    });

    it('invokes a function value', () => {
      expect(toNumber(() => 4.899431)).to.equal(4.899431);
    });

    it('parses a string, trimming whitespace', () => {
      expect(toNumber('  4.899431 ')).to.equal(4.899431);
    });

    it('yields NaN for non-numeric text', () => {
      expect(toNumber('Paris')).to.be.NaN;
    });
  });

  describe('parseCoordinates', () => {
    it('parses a lat,lng pair', () => {
      expect(parseCoordinates('52.379189, 4.899431')).to.deep.equal({
        lat: 52.379189,
        lng: 4.899431,
      });
    });

    it('parses negative coordinates', () => {
      expect(parseCoordinates('-37.8136,144.9631')).to.deep.equal({
        lat: -37.8136,
        lng: 144.9631,
      });
    });

    it('accepts the boundary values', () => {
      expect(parseCoordinates('-90,-180')).to.deep.equal({ lat: -90, lng: -180 });
      expect(parseCoordinates('90,180')).to.deep.equal({ lat: 90, lng: 180 });
    });

    it('rejects text that merely contains a comma', () => {
      expect(parseCoordinates('Paris, France')).to.equal(undefined);
    });

    it('rejects out-of-range values', () => {
      expect(parseCoordinates('91, 0')).to.equal(undefined);
      expect(parseCoordinates('0, 181')).to.equal(undefined);
    });

    it('rejects the wrong number of parts', () => {
      expect(parseCoordinates('1,2,3')).to.equal(undefined);
      expect(parseCoordinates('1')).to.equal(undefined);
    });

    it('rejects empty input', () => {
      expect(parseCoordinates(undefined)).to.equal(undefined);
      expect(parseCoordinates('')).to.equal(undefined);
    });
  });

  describe('formatCoordinates', () => {
    it('joins lat and lng with a comma and no space', () => {
      expect(formatCoordinates({ lat: -37.8136, lng: 144.9631 })).to.equal('-37.8136,144.9631');
    });

    it('returns undefined for no coordinates', () => {
      expect(formatCoordinates(undefined)).to.equal(undefined);
    });
  });
});
