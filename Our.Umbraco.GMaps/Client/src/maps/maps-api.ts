/// <reference types='@types/google.maps' />
import type { ApiKeySource } from '../core/api-key-notices.js';

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
 * A pin's appearance, mirroring the PinElement options this package uses.
 * Declared here rather than taken from the SDK types so callers above the
 * adapter never have to reach into `google.maps`.
 */
export interface PinOptions {
  glyph?: string;
  scale?: number;
  background?: string;
  borderColor?: string;
  glyphColor?: string;
}

/**
 * Every Google Maps SDK call this package makes. Kept deliberately narrow:
 * anything above this interface is testable with FakeMapsApi and needs no
 * API key.
 */
export interface GoogleMapsApi {
  /**
   * Puts a key forward for the page. The Maps API is keyed once per page, so
   * the key offered here may not be the one loaded - see whenKeyResolved.
   */
  configure(key: string, source: ApiKeySource): void;
  /**
   * Deliberately replaces the key the page is using, reloading the API. Only
   * safe where a single map owns the page; it takes every other map with it.
   */
  reconfigure(key: string): void;
  /** Resolves with the key the page actually loaded, which may not be yours. */
  whenKeyResolved(): Promise<string>;
  createMap(container: HTMLElement, options: google.maps.MapOptions): Promise<google.maps.Map>;
  createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement>;
  /** A numbered, coloured pin to hand to a marker as its content. */
  createPin(options: PinOptions): Promise<HTMLElement>;
  createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement>;
  geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome>;
}
