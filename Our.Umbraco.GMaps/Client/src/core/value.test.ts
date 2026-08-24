import { expect } from '@open-wc/testing';
import { buildSingleMapValue, readSingleMapValue } from './value.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Map } from '../types.js';

const base = {
  zoom: 17,
  maptype: 'roadmap' as const,
  defaultLocation: DEFAULT_LOCATION,
};

describe('core/value', () => {
  describe('buildSingleMapValue', () => {
    it('lets the live friendly name override one inside address', () => {
      const value = buildSingleMapValue({
        ...base,
        address: { friendlyName: 'Stale', city: 'Melbourne' },
        friendlyName: 'Live',
        location: { lat: 1, lng: 2 },
      });

      expect(value.address.friendlyName).to.equal('Live');
      expect(value.address.city).to.equal('Melbourne');
    });

    it('clears the friendly name when there is no live one', () => {
      const value = buildSingleMapValue({ ...base, address: { friendlyName: 'Stale' } });

      expect(value.address.friendlyName).to.equal(undefined);
    });

    it('falls back to the supplied default location for the pin', () => {
      const value = buildSingleMapValue({ ...base, defaultLocation: { lat: 10, lng: 20 } });

      expect(value.address.coordinates).to.deep.equal({ lat: 10, lng: 20 });
    });

    it('falls back to the hardcoded DEFAULT_LOCATION for the centre', () => {
      // Preserved inconsistency - see the module doc comment.
      const value = buildSingleMapValue({ ...base, defaultLocation: { lat: 10, lng: 20 } });

      expect(value.mapconfig.centerCoordinates).to.deep.equal(DEFAULT_LOCATION);
    });

    it('carries zoom, maptype and centre', () => {
      const value = buildSingleMapValue({
        ...base,
        zoom: 12,
        maptype: 'satellite',
        center: { lat: 3, lng: 4 },
      });

      expect(value.mapconfig.zoom).to.equal(12);
      expect(value.mapconfig.maptype).to.equal('satellite');
      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
    });
  });

  describe('readSingleMapValue', () => {
    it('returns empty state for no value', () => {
      expect(readSingleMapValue(undefined)).to.deep.equal({});
    });

    it('splits coordinates out of the address', () => {
      const read = readSingleMapValue({
        address: { city: 'Melbourne', friendlyName: 'HQ', coordinates: { lat: 1, lng: 2 } },
        mapconfig: { zoom: 12, centerCoordinates: { lat: 3, lng: 4 } },
      } as Map);

      expect(read.address).to.deep.equal({ city: 'Melbourne', friendlyName: 'HQ' });
      expect(read.location).to.deep.equal({ lat: 1, lng: 2 });
      expect(read.center).to.deep.equal({ lat: 3, lng: 4 });
      expect(read.friendlyName).to.equal('HQ');
    });
  });

  describe('round trip', () => {
    it('read-then-build reproduces the value, so loading cannot mark a document dirty', () => {
      const stored: Map = {
        address: {
          city: 'Port Melbourne',
          country: 'Australia',
          full_address: '88 Dock Rd, Port Melbourne VIC 3207',
          friendlyName: 'Warehouse',
          postalcode: '3207',
          state: 'Victoria',
          street: 'Dock Rd',
          streetNumber: '88',
          coordinates: { lat: -37.834, lng: 144.926 },
        },
        mapconfig: {
          zoom: 12,
          maptype: 'roadmap',
          centerCoordinates: { lat: -37.8136, lng: 144.9631 },
        },
      };

      const read = readSingleMapValue(stored);
      const rebuilt = buildSingleMapValue({
        ...base,
        address: read.address,
        friendlyName: read.friendlyName,
        location: read.location,
        center: read.center,
        zoom: stored.mapconfig.zoom as number,
        maptype: 'roadmap',
      });

      expect(rebuilt).to.deep.equal(stored);
    });
  });
});
