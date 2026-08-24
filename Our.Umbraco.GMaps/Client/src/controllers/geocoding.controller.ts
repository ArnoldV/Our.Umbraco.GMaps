/// <reference types='@types/google.maps' />
import { composeAddress } from '../core/address.js';
import type { GoogleAddressComponent } from '../core/address.js';
import { formatCoordinates } from '../core/coordinates.js';
import { describeGeocoderStatus, statusFromError } from '../core/geocode-status.js';
import type { EditorNotice } from '../core/geocode-status.js';
import type { GeocodeOutcome, GoogleMapsApi } from '../maps/maps-api.js';
import type { Address, Location } from '../types.js';

export interface GeocodeResult {
  location: Location;
  address: Address;
}

/** Geocoder components use long_name/short_name; core/address wants the Places shape. */
function adaptComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): GoogleAddressComponent[] | undefined {
  return components?.map((component) => ({
    longText: component.long_name,
    shortText: component.short_name,
    types: component.types,
  }));
}

/**
 * Geocoding, in both directions, reporting *why* a lookup failed rather than
 * collapsing every failure into "not found".
 *
 * Returns the notice alongside the result rather than reaching into a host to
 * display it, which is what lets both editors share this and lets the tests
 * assert on plain values.
 */
export class GeocodingController {
  #api: GoogleMapsApi;

  constructor(api: GoogleMapsApi) {
    this.#api = api;
  }

  /** Address text to coordinates. */
  async forward(query: string): Promise<{ result?: GeocodeResult; notice?: EditorNotice }> {
    const outcome = await this.#api.geocode({ address: query });
    const result = this.#firstResult(outcome);
    if (!result) return { notice: this.#notice(outcome, `"${query}"`) };

    const location: Location = {
      lat: result.geometry.location.lat(),
      lng: result.geometry.location.lng(),
    };

    return { result: this.#compose(result, location) };
  }

  /**
   * Coordinates to address. The supplied coordinates stay authoritative - the
   * geocoder's own are a snapped approximation, and a failed lookup must not
   * move a pin the editor placed.
   */
  async reverse(coordinates: Location): Promise<{ result?: GeocodeResult; notice?: EditorNotice }> {
    const outcome = await this.#api.geocode({ location: coordinates });
    const result = this.#firstResult(outcome);
    if (!result) {
      const subject = formatCoordinates(coordinates) ?? 'those coordinates';
      return { notice: this.#notice(outcome, subject) };
    }

    return { result: this.#compose(result, coordinates) };
  }

  #firstResult(outcome: GeocodeOutcome): google.maps.GeocoderResult | undefined {
    return outcome.results?.[0];
  }

  #notice(outcome: GeocodeOutcome, subject: string): EditorNotice {
    const status = outcome.status ?? statusFromError(outcome.error);
    const notice = describeGeocoderStatus(status === 'OK' ? 'ZERO_RESULTS' : status, subject);
    if (notice.severity === 'error') {
      console.error('[Our.Umbraco.GMaps] Geocoding failed', outcome);
    }
    return notice;
  }

  #compose(result: google.maps.GeocoderResult, location: Location): GeocodeResult {
    const composed = composeAddress(adaptComponents(result.address_components));
    return {
      location,
      address: { ...composed, full_address: result.formatted_address, coordinates: location },
    };
  }
}
