/// <reference types='@types/google.maps' />

/**
 * The result of a geocode. Deliberately never a rejection: the SDK's promise
 * API rejects on ZERO_RESULTS too, so a rejection carries no information on its
 * own and the real status is only available via the callback.
 */
export interface GeocodeOutcome {
  results?: google.maps.GeocoderResult[];
  status?: string;
  error?: unknown;
}

/**
 * Every Google Maps SDK call this package makes. Kept deliberately narrow:
 * anything above this interface is testable with FakeMapsApi and needs no
 * API key.
 */
export interface GoogleMapsApi {
  configure(key: string): void;
  createMap(container: HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map>;
  createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement>;
  createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement>;
  geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome>;
}
