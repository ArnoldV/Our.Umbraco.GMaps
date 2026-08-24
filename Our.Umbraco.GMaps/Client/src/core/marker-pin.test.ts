import { expect } from '@open-wc/testing';
import {
  DEFAULT_PIN_BACKGROUND,
  contrastingTextColor,
  darken,
  normaliseHexColor,
  pinSpecFor,
  pinSpecKey,
} from './marker-pin.js';

describe('core/marker-pin', () => {
  describe('pinSpecFor', () => {
    it('numbers pins from one, not from zero', () => {
      expect(pinSpecFor({}, 0).glyph).to.equal('1');
      expect(pinSpecFor({}, 9).glyph).to.equal('10');
    });

    it("uses the marker's own colour", () => {
      expect(pinSpecFor({ color: '#2d7ef7' }, 0).background).to.equal('#2d7ef7');
    });

    it('falls back to the default colour when the marker has none', () => {
      expect(pinSpecFor({}, 0).background).to.equal(DEFAULT_PIN_BACKGROUND);
    });

    it("adds the hash Umbraco's colour picker leaves off, so the value is valid CSS", () => {
      // The backoffice colour editor stores `e61414`, not `#e61414`.
      expect(pinSpecFor({ color: 'e61414' }, 0).background).to.equal('#e61414');
    });

    it('falls back to the default colour when the stored colour is not a hex value', () => {
      expect(pinSpecFor({ color: 'rebeccapurple' }, 0).background).to.equal(DEFAULT_PIN_BACKGROUND);
    });

    it('outlines the pin in a darker shade of its own colour', () => {
      expect(pinSpecFor({ color: '#ffffff' }, 0).borderColor).to.equal('#b3b3b3');
    });

    it('keeps the number readable on a dark colour', () => {
      expect(pinSpecFor({ color: '#1b3a6b' }, 0).glyphColor).to.equal('#ffffff');
    });

    it('keeps the number readable on a pale colour', () => {
      expect(pinSpecFor({ color: '#ffe066' }, 0).glyphColor).to.equal('#1b1b1b');
    });
  });

  describe('contrastingTextColor', () => {
    it('defaults to white when the colour cannot be read', () => {
      expect(contrastingTextColor(undefined)).to.equal('#ffffff');
      expect(contrastingTextColor('not-a-colour')).to.equal('#ffffff');
    });

    it('accepts shorthand hex', () => {
      expect(contrastingTextColor('#fff')).to.equal('#1b1b1b');
      expect(contrastingTextColor('#000')).to.equal('#ffffff');
    });

    it('accepts a hex value without the hash', () => {
      expect(contrastingTextColor('ffffff')).to.equal('#1b1b1b');
    });
  });

  describe('normaliseHexColor', () => {
    it('adds a missing hash', () => {
      expect(normaliseHexColor('e61414')).to.equal('#e61414');
    });

    it('expands shorthand and lowercases', () => {
      expect(normaliseHexColor('#ABC')).to.equal('#aabbcc');
    });

    it('ignores surrounding whitespace', () => {
      expect(normaliseHexColor('  #e61414 ')).to.equal('#e61414');
    });

    it('returns undefined for anything it cannot read', () => {
      expect(normaliseHexColor('')).to.equal(undefined);
      expect(normaliseHexColor(undefined)).to.equal(undefined);
      expect(normaliseHexColor('rebeccapurple')).to.equal(undefined);
    });
  });

  describe('darken', () => {
    it('scales each channel down', () => {
      expect(darken('#646464', 0.5)).to.equal('#323232');
    });

    it('returns the default colour for anything it cannot parse', () => {
      expect(darken('nonsense')).to.equal(DEFAULT_PIN_BACKGROUND);
    });
  });

  describe('pinSpecKey', () => {
    it('changes when the index changes, so reordering redraws the pins', () => {
      const first = pinSpecKey(pinSpecFor({ color: '#2d7ef7' }, 0));
      const second = pinSpecKey(pinSpecFor({ color: '#2d7ef7' }, 1));

      expect(first).to.not.equal(second);
    });

    it('is stable for an unchanged marker, so pins are not rebuilt needlessly', () => {
      expect(pinSpecKey(pinSpecFor({ color: '#2d7ef7' }, 3))).to.equal(
        pinSpecKey(pinSpecFor({ color: '#2d7ef7' }, 3)),
      );
    });
  });
});
