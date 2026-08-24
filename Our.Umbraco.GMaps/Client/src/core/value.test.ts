import { expect } from '@open-wc/testing';
import {
  buildMultiMapValue,
  buildSingleMapValue,
  readMultiMapValue,
  readSingleMapValue,
  resolveInitialCenter,
} from './value.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Map, Marker, MultiMap } from '../types.js';

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

  describe('resolveInitialCenter', () => {
    it('prefers the stored centre over a configured default', () => {
      // The bug this guards: a configured default winning here means every save
      // that does not pan the map overwrites the document's stored centre.
      expect(
        resolveInitialCenter({ lat: 1, lng: 2 }, { lat: 10, lng: 20 }, DEFAULT_LOCATION),
      ).to.deep.equal({ lat: 1, lng: 2 });
    });

    it('uses the configured default when nothing is stored', () => {
      expect(resolveInitialCenter(undefined, { lat: 10, lng: 20 }, DEFAULT_LOCATION)).to.deep.equal({
        lat: 10,
        lng: 20,
      });
    });

    it('falls back to the default location when neither is present', () => {
      expect(resolveInitialCenter(undefined, undefined, DEFAULT_LOCATION)).to.deep.equal(
        DEFAULT_LOCATION,
      );
    });

    it('reads the stored centre straight off a loaded value', () => {
      const stored = readSingleMapValue({
        address: { coordinates: { lat: 1, lng: 2 } },
        mapconfig: { zoom: 12, centerCoordinates: { lat: 3, lng: 4 } },
      } as Map);

      expect(resolveInitialCenter(stored.center, { lat: 99, lng: 99 }, DEFAULT_LOCATION)).to.deep.equal(
        { lat: 3, lng: 4 },
      );
    });

    it('does not treat a value without a stored centre as authoritative', () => {
      const stored = readSingleMapValue({
        address: { coordinates: { lat: 1, lng: 2 } },
        mapconfig: { zoom: 12 },
      } as Map);

      expect(resolveInitialCenter(stored.center, { lat: 99, lng: 99 }, DEFAULT_LOCATION)).to.deep.equal(
        { lat: 99, lng: 99 },
      );
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

describe('core/value: multi map', () => {
  const multiBase = {
    zoom: 12,
    maptype: 'roadmap' as const,
    defaultLocation: DEFAULT_LOCATION,
  };

  const marker = (key: string, friendlyName: string): Marker => ({
    key,
    friendlyName,
    coordinates: { lat: 1, lng: 2 },
  });

  describe('buildMultiMapValue', () => {
    it('carries the markers in order', () => {
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [marker('a', 'HQ'), marker('b', 'Depot')],
      });

      expect(value.markers.map((m) => m.friendlyName)).to.deep.equal(['HQ', 'Depot']);
    });

    it('carries zoom, maptype and centre', () => {
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [],
        center: { lat: 3, lng: 4 },
        maptype: 'satellite',
      });

      expect(value.mapconfig.zoom).to.equal(12);
      expect(value.mapconfig.maptype).to.equal('satellite');
      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 3, lng: 4 });
    });

    it('falls back to the supplied default location for the centre', () => {
      // Unlike the single editor, whose centre fallback is the hardcoded
      // DEFAULT_LOCATION, multi honours the caller's default.
      const value = buildMultiMapValue({
        ...multiBase,
        markers: [],
        defaultLocation: { lat: 10, lng: 20 },
      });

      expect(value.mapconfig.centerCoordinates).to.deep.equal({ lat: 10, lng: 20 });
    });

    it('produces an empty marker list rather than omitting the property', () => {
      expect(buildMultiMapValue({ ...multiBase, markers: [] }).markers).to.deep.equal([]);
    });
  });

  describe('readMultiMapValue', () => {
    it('returns an empty list for no value', () => {
      expect(readMultiMapValue(undefined)).to.deep.equal({ markers: [] });
    });

    it('reads markers and centre', () => {
      const read = readMultiMapValue({
        markers: [marker('a', 'HQ')],
        mapconfig: { zoom: 12, centerCoordinates: { lat: 3, lng: 4 } },
      } as MultiMap);

      expect(read.markers).to.have.length(1);
      expect(read.center).to.deep.equal({ lat: 3, lng: 4 });
      expect(read.zoom).to.equal(12);
    });

    it('reads a legacy single-map value as one marker', () => {
      const read = readMultiMapValue({
        address: {
          friendlyName: 'HQ',
          full_address: '12 Collins St',
          city: 'Melbourne',
          coordinates: { lat: 1, lng: 2 },
        },
        mapconfig: { zoom: 15, centerCoordinates: { lat: 3, lng: 4 } },
      } as Map);

      expect(read.markers).to.have.length(1);
      expect(read.markers[0].friendlyName).to.equal('HQ');
      expect(read.markers[0].full_address).to.equal('12 Collins St');
      expect(read.markers[0].city).to.equal('Melbourne');
      expect(read.markers[0].coordinates).to.deep.equal({ lat: 1, lng: 2 });
      expect(read.markers[0].key).to.be.a('string').with.length.greaterThan(0);
      expect(read.zoom).to.equal(15);
    });

    it('gives keyless stored markers a key', () => {
      const read = readMultiMapValue({
        markers: [{ friendlyName: 'HQ' } as Marker],
        mapconfig: { zoom: 12 },
      } as MultiMap);

      expect(read.markers[0].key).to.be.a('string').with.length.greaterThan(0);
    });

    it('round-trips: read then build reproduces the value', () => {
      const stored: MultiMap = {
        markers: [
          {
            key: '8f3c',
            friendlyName: 'Warehouse',
            full_address: '88 Dock Rd',
            description: 'Gate 4',
            color: '#2d7ef7',
            coordinates: { lat: -37.834, lng: 144.926 },
          },
        ],
        mapconfig: {
          zoom: 12,
          maptype: 'roadmap',
          centerCoordinates: { lat: -37.8136, lng: 144.9631 },
        },
      };

      const read = readMultiMapValue(stored);
      const rebuilt = buildMultiMapValue({
        ...multiBase,
        markers: read.markers,
        center: read.center,
        zoom: read.zoom as number,
      });

      expect(rebuilt).to.deep.equal(stored);
    });
  });
});
