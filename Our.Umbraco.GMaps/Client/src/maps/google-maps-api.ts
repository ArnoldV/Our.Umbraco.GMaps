/// <reference types='@types/google.maps' />
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type { GeocodeOutcome, GoogleMapsApi } from './maps-api.js';

/**
 * The real Google Maps SDK, behind the narrow interface the rest of the package
 * talks to.
 *
 * @googlemaps/js-api-loader v2 removed the Loader class in favour of the
 * functional API: configure once with setOptions(), then importLibrary().
 */
export class GoogleMapsApiImpl implements GoogleMapsApi {
  #geocoder?: google.maps.Geocoder;

  configure(key: string): void {
    // setOptions no-ops after the first call, so this is safe per element.
    setOptions({ key, v: 'weekly' });
  }

  async createMap(
    container: HTMLElement,
    options: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    const { Map } = await importLibrary('maps');
    return new Map(container, options);
  }

  async createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement> {
    const { AdvancedMarkerElement } = await importLibrary('marker');
    return new AdvancedMarkerElement(options);
  }

  async createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement> {
    await importLibrary('places');
    return new google.maps.places.PlaceAutocompleteElement({});
  }

  async geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome> {
    if (!this.#geocoder) {
      const { Geocoder } = await importLibrary('geocoding');
      this.#geocoder = new Geocoder();
    }

    // The callback is the only way to see the exact status: the promise rejects
    // with a message that would otherwise have to be parsed, and it rejects on
    // ZERO_RESULTS as well as on real failures.
    let status: string | undefined;
    try {
      const { results } = await this.#geocoder.geocode(request, (_results, reported) => {
        status = reported;
      });
      return { results, status: status ?? 'OK' };
    } catch (error) {
      return { status, error };
    }
  }
}
