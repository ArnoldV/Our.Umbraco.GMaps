/// <reference types='@types/google.maps' />
import type { GeocodeOutcome, GoogleMapsApi, PinOptions } from './maps-api.js';
import { mapsKeys } from './maps-key-arbiter.js';
import type { ApiKeySource } from '../core/api-key-notices.js';

type LibraryName = Parameters<typeof google.maps.importLibrary>[0];

/**
 * The real Google Maps SDK, behind the narrow interface the rest of the package
 * talks to.
 *
 * Loads the API itself (see maps-bootstrap) rather than through
 * the js-api-loader package, whose `setOptions()` accepts a key once per page:
 * an editor correcting a rejected key could otherwise only be honoured by
 * reloading the backoffice.
 *
 * Not unit tested - it is the seam onto Google's SDK. Everything above it takes
 * a GoogleMapsApi and is tested against FakeMapsApi.
 */
export class GoogleMapsApiImpl implements GoogleMapsApi {
  #geocoder?: google.maps.Geocoder;
  #ready?: Promise<string>;

  configure(key: string, source: ApiKeySource): void {
    // Offer only. Loading is deferred to the first library import, so every
    // editor on the page has had its say before a key is chosen.
    mapsKeys.offer(key, source);
  }

  reconfigure(key: string): void {
    this.#geocoder = undefined;
    this.#ready = mapsKeys.reload(key);
  }

  whenKeyResolved(): Promise<string> {
    return (this.#ready ??= mapsKeys.load());
  }

  /** Waits for the API this adapter was configured with, then takes a library from it. */
  async #library<TName extends LibraryName>(name: TName) {
    await this.whenKeyResolved();
    return google.maps.importLibrary(name) as ReturnType<typeof google.maps.importLibrary>;
  }

  async createMap(
    container: HTMLElement,
    options: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    const { Map } = (await this.#library('maps')) as google.maps.MapsLibrary;
    return new Map(container, options);
  }

  async createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement> {
    const { AdvancedMarkerElement } = (await this.#library('marker')) as google.maps.MarkerLibrary;
    return new AdvancedMarkerElement(options);
  }

  async createPin(options: PinOptions): Promise<HTMLElement> {
    const { PinElement } = (await this.#library('marker')) as google.maps.MarkerLibrary;
    return new PinElement(options).element as HTMLElement;
  }

  async createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement> {
    await this.#library('places');
    return new google.maps.places.PlaceAutocompleteElement({});
  }

  async geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome> {
    if (!this.#geocoder) {
      const { Geocoder } = (await this.#library('geocoding')) as google.maps.GeocodingLibrary;
      this.#geocoder = new Geocoder();
    }

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
