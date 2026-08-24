import { expect } from '@open-wc/testing';
import {
  addMarker,
  canAddMarker,
  markerLimitsAreSane,
  moveMarker,
  newMarkerKey,
  removeMarker,
  reorderMarkers,
  updateMarker,
} from './marker-collection.js';
import type { Marker } from '../types.js';

const marker = (key: string, friendlyName?: string): Marker => ({ key, friendlyName });

describe('core/marker-collection', () => {
  describe('newMarkerKey', () => {
    it('produces distinct keys', () => {
      const keys = new Set(Array.from({ length: 50 }, () => newMarkerKey()));

      expect(keys.size).to.equal(50);
    });

    it('produces non-empty strings', () => {
      expect(newMarkerKey()).to.be.a('string').with.length.greaterThan(0);
    });
  });

  describe('addMarker', () => {
    it('appends and assigns a key', () => {
      const result = addMarker([], { friendlyName: 'HQ' });

      expect(result).to.have.length(1);
      expect(result[0].friendlyName).to.equal('HQ');
      expect(result[0].key).to.be.a('string').with.length.greaterThan(0);
    });

    it('keeps a key that was supplied', () => {
      expect(addMarker([], { key: 'given', friendlyName: 'HQ' })[0].key).to.equal('given');
    });

    it('does not mutate the input array', () => {
      const original: Marker[] = [marker('a')];
      addMarker(original, { friendlyName: 'HQ' });

      expect(original).to.have.length(1);
    });

    it('refuses to exceed max', () => {
      const full = [marker('a'), marker('b')];

      expect(addMarker(full, { friendlyName: 'HQ' }, 2)).to.deep.equal(full);
    });

    it('treats max 0 as unlimited', () => {
      expect(addMarker([marker('a')], { friendlyName: 'HQ' }, 0)).to.have.length(2);
    });

    it('treats an absent max as unlimited', () => {
      expect(addMarker([marker('a')], { friendlyName: 'HQ' })).to.have.length(2);
    });
  });

  describe('removeMarker', () => {
    it('removes by key', () => {
      const result = removeMarker([marker('a'), marker('b')], 'a');

      expect(result.map((m) => m.key)).to.deep.equal(['b']);
    });

    it('ignores an unknown key', () => {
      const markers = [marker('a')];

      expect(removeMarker(markers, 'nope')).to.deep.equal(markers);
    });
  });

  describe('updateMarker', () => {
    it('patches only the named marker', () => {
      const result = updateMarker([marker('a', 'HQ'), marker('b', 'Depot')], 'b', {
        friendlyName: 'Warehouse',
        description: 'Gate 4',
      });

      expect(result[0].friendlyName).to.equal('HQ');
      expect(result[1].friendlyName).to.equal('Warehouse');
      expect(result[1].description).to.equal('Gate 4');
    });

    it('cannot change the key', () => {
      // `key` is excluded from the patch type, but a caller casting around that
      // must still not be able to break identity.
      const result = updateMarker([marker('a')], 'a', { key: 'hacked' } as never);

      expect(result[0].key).to.equal('a');
    });

    it('ignores an unknown key', () => {
      const markers = [marker('a')];

      expect(updateMarker(markers, 'nope', { friendlyName: 'X' })).to.deep.equal(markers);
    });

    it('does not mutate the input', () => {
      const markers = [marker('a', 'HQ')];
      updateMarker(markers, 'a', { friendlyName: 'Changed' });

      expect(markers[0].friendlyName).to.equal('HQ');
    });
  });

  describe('moveMarker', () => {
    it('moves forwards', () => {
      const result = moveMarker([marker('a'), marker('b'), marker('c')], 0, 2);

      expect(result.map((m) => m.key)).to.deep.equal(['b', 'c', 'a']);
    });

    it('moves backwards', () => {
      const result = moveMarker([marker('a'), marker('b'), marker('c')], 2, 0);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('ignores out-of-range indices', () => {
      const markers = [marker('a'), marker('b')];

      expect(moveMarker(markers, 5, 0)).to.deep.equal(markers);
      expect(moveMarker(markers, 0, 5)).to.deep.equal(markers);
      expect(moveMarker(markers, -1, 0)).to.deep.equal(markers);
    });

    it('is a no-op when the indices match', () => {
      const markers = [marker('a'), marker('b')];

      expect(moveMarker(markers, 1, 1)).to.deep.equal(markers);
    });
  });

  describe('reorderMarkers', () => {
    it('reorders to match the key order', () => {
      const result = reorderMarkers([marker('a'), marker('b'), marker('c')], ['c', 'a', 'b']);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('keeps markers the key list omits, in their original order, at the end', () => {
      // A sorter can report a partial list; dropping the rest would delete data.
      const result = reorderMarkers([marker('a'), marker('b'), marker('c')], ['c']);

      expect(result.map((m) => m.key)).to.deep.equal(['c', 'a', 'b']);
    });

    it('ignores keys that match no marker', () => {
      const result = reorderMarkers([marker('a'), marker('b')], ['ghost', 'b', 'a']);

      expect(result.map((m) => m.key)).to.deep.equal(['b', 'a']);
    });
  });

  describe('canAddMarker', () => {
    it('allows when below max', () => {
      expect(canAddMarker([marker('a')], 2)).to.equal(true);
    });

    it('refuses at max', () => {
      expect(canAddMarker([marker('a'), marker('b')], 2)).to.equal(false);
    });

    it('allows when max is 0, undefined, or negative', () => {
      expect(canAddMarker([marker('a')], 0)).to.equal(true);
      expect(canAddMarker([marker('a')], undefined)).to.equal(true);
      expect(canAddMarker([marker('a')], -1)).to.equal(true);
    });
  });

  describe('markerLimitsAreSane', () => {
    it('accepts a min below the max', () => {
      expect(markerLimitsAreSane(1, 5)).to.equal(true);
    });

    it('accepts equal bounds', () => {
      expect(markerLimitsAreSane(3, 3)).to.equal(true);
    });

    it('accepts an unlimited max', () => {
      expect(markerLimitsAreSane(3, 0)).to.equal(true);
      expect(markerLimitsAreSane(3, undefined)).to.equal(true);
    });

    it('rejects a min above the max', () => {
      expect(markerLimitsAreSane(5, 2)).to.equal(false);
    });
  });
});
