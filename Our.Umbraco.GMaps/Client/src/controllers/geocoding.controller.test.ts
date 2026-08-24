/// <reference types='@types/google.maps' />
import { expect } from '@open-wc/testing';
import { GeocodingController } from './geocoding.controller.js';
import { FakeMapsApi } from '../maps/fake-maps-api.js';

/** A minimal GeocoderResult; the controller reads only these members. */
const geocoderResult = (formatted: string, lat: number, lng: number) =>
  ({
    formatted_address: formatted,
    geometry: { location: { lat: () => lat, lng: () => lng } },
    address_components: [
      { long_name: 'Port Melbourne', short_name: 'Port Melbourne', types: ['locality'] },
      { long_name: 'Australia', short_name: 'AU', types: ['country'] },
    ],
  }) as unknown as google.maps.GeocoderResult;

describe('controllers/GeocodingController', () => {
  let api: FakeMapsApi;
  let controller: GeocodingController;

  beforeEach(() => {
    api = new FakeMapsApi();
    controller = new GeocodingController(api);
  });

  describe('forward', () => {
    it('returns the location and a composed address', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('88 Dock Rd, Port Melbourne VIC 3207', -37.834, 144.926)],
        status: 'OK',
      });

      const { result, notice } = await controller.forward('88 Dock Rd');

      expect(notice).to.equal(undefined);
      expect(result?.location).to.deep.equal({ lat: -37.834, lng: 144.926 });
      expect(result?.address.full_address).to.equal('88 Dock Rd, Port Melbourne VIC 3207');
      expect(result?.address.city).to.equal('Port Melbourne');
      expect(result?.address.country).to.equal('Australia');
      expect(result?.address.coordinates).to.deep.equal({ lat: -37.834, lng: 144.926 });
    });

    it('passes the query through as an address request', async () => {
      api.queueGeocodeOutcomes({ results: [geocoderResult('x', 0, 0)], status: 'OK' });

      await controller.forward('88 Dock Rd');

      expect(api.geocodeRequests[0]).to.deep.equal({ address: '88 Dock Rd' });
    });

    it('reports ZERO_RESULTS as information naming the query', async () => {
      api.queueGeocodeOutcomes({ status: 'ZERO_RESULTS' });

      const { result, notice } = await controller.forward('Nowhere');

      expect(result).to.equal(undefined);
      expect(notice?.severity).to.equal('info');
      expect(notice?.message).to.contain('"Nowhere"');
    });

    it('reports REQUEST_DENIED as an error about the API key', async () => {
      api.queueGeocodeOutcomes({ status: 'REQUEST_DENIED' });

      const { notice } = await controller.forward('anywhere');

      expect(notice?.severity).to.equal('error');
      expect(notice?.message).to.contain('Geocoding API');
    });

    it('recovers the status from the error when none was reported', async () => {
      api.queueGeocodeOutcomes({ error: new Error('OVER_QUERY_LIMIT') });

      const { notice } = await controller.forward('anywhere');

      expect(notice?.severity).to.equal('error');
      expect(notice?.message).to.contain('quota');
    });

    it('reports an empty result list as not found', async () => {
      api.queueGeocodeOutcomes({ results: [], status: 'OK' });

      const { result, notice } = await controller.forward('anywhere');

      expect(result).to.equal(undefined);
      expect(notice?.severity).to.equal('info');
    });
  });

  describe('reverse', () => {
    it('requests the location and composes the address', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('88 Dock Rd, Port Melbourne VIC 3207', -37.834, 144.926)],
        status: 'OK',
      });

      const { result } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(api.geocodeRequests[0]).to.deep.equal({
        location: { lat: -37.834, lng: 144.926 },
      });
      expect(result?.address.full_address).to.equal('88 Dock Rd, Port Melbourne VIC 3207');
    });

    it('keeps the requested coordinates authoritative over the geocoded ones', async () => {
      api.queueGeocodeOutcomes({
        results: [geocoderResult('somewhere else', 1, 2)],
        status: 'OK',
      });

      const { result } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(result?.location).to.deep.equal({ lat: -37.834, lng: 144.926 });
      expect(result?.address.coordinates).to.deep.equal({ lat: -37.834, lng: 144.926 });
    });

    it('names the coordinates in a failure notice', async () => {
      api.queueGeocodeOutcomes({ status: 'ZERO_RESULTS' });

      const { notice } = await controller.reverse({ lat: -37.834, lng: 144.926 });

      expect(notice?.message).to.contain('-37.834,144.926');
    });
  });
});
