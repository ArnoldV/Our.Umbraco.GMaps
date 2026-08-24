import { expect } from '@open-wc/testing';
import { resolveGmapField } from './gmap-value.element.js';
import type { Map, MultiMap } from '../../types.js';

const single = {
  address: {
    full_address: '12 Collins St, Melbourne',
    friendlyName: 'HQ',
    coordinates: { lat: 1, lng: 2 },
  },
  mapconfig: { zoom: 12 },
} as Map;

const multi = {
  markers: [
    { key: 'a', friendlyName: 'HQ', full_address: '12 Collins St', coordinates: { lat: 1, lng: 2 } },
    { key: 'b', friendlyName: 'Depot', full_address: '88 Dock Rd', coordinates: { lat: 3, lng: 4 } },
  ],
  mapconfig: { zoom: 12 },
} as MultiMap;

describe('ufm/resolveGmapField', () => {
  it('returns undefined when the property has no value', () => {
    expect(resolveGmapField(undefined, 'address')).to.equal(undefined);
    expect(resolveGmapField(null, 'address')).to.equal(undefined);
  });

  it('returns undefined for an unknown field', () => {
    expect(resolveGmapField(single, 'nonsense')).to.equal(undefined);
  });

  describe('single values', () => {
    it('reads the address', () => {
      expect(resolveGmapField(single, 'address')).to.equal('12 Collins St, Melbourne');
    });

    it('reads the friendly name', () => {
      expect(resolveGmapField(single, 'friendlyName')).to.equal('HQ');
    });

    it('reads the coordinates', () => {
      expect(resolveGmapField(single, 'coordinates')).to.equal('1, 2');
    });

    it('reports a count of one', () => {
      expect(resolveGmapField(single, 'count')).to.equal('1');
    });
  });

  describe('multi values', () => {
    it('counts the markers', () => {
      expect(resolveGmapField(multi, 'count')).to.equal('2');
    });

    it('lists the marker names', () => {
      expect(resolveGmapField(multi, 'names')).to.equal('HQ, Depot');
    });

    it('reads the first marker address', () => {
      expect(resolveGmapField(multi, 'first')).to.equal('12 Collins St');
      expect(resolveGmapField(multi, 'address')).to.equal('12 Collins St');
    });

    it('reads the first marker friendly name', () => {
      expect(resolveGmapField(multi, 'friendlyName')).to.equal('HQ');
    });

    it('reads the first marker coordinates', () => {
      expect(resolveGmapField(multi, 'coordinates')).to.equal('1, 2');
    });

    it('handles an empty marker list without throwing', () => {
      const empty = { markers: [], mapconfig: { zoom: 12 } } as unknown as MultiMap;

      expect(resolveGmapField(empty, 'count')).to.equal('0');
      expect(resolveGmapField(empty, 'names')).to.equal('');
      expect(resolveGmapField(empty, 'address')).to.equal(undefined);
    });

    it('falls back to the address when a marker has no friendly name', () => {
      const unnamed = {
        markers: [{ key: 'a', full_address: '88 Dock Rd' }],
        mapconfig: { zoom: 12 },
      } as unknown as MultiMap;

      expect(resolveGmapField(unnamed, 'names')).to.equal('88 Dock Rd');
    });
  });
});
