import type { Address, AddressBase, AddressComponents } from '../types.js';
import { typedKeys } from '../types.js';

/**
 * The subset of a Google address component this package reads. Declared here
 * rather than imported so core/ stays free of the Maps SDK; both
 * google.maps.places.AddressComponent and the adapted geocoder components
 * satisfy it structurally.
 */
export interface GoogleAddressComponent {
  longText: string | null;
  shortText?: string | null;
  types: string[];
}

/**
 * Which Google component types feed which address field.
 *
 * https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingAddressTypes
 */
const COMPONENT_MAP: AddressComponents = {
  // street_number indicates the precise street number.
  streetNumber: ['street_number'],
  street: [
    // street_address indicates a precise street address.
    'street_address',
    // route indicates a named route (such as 'US 101').
    'route',
  ],
  // administrative_area_level_1..5 are civil entities below the country level;
  // in the United States level 1 is the state, level 2 the county. Not all
  // nations exhibit every level.
  state: [
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
  ],
  city: [
    // Used when the postal area differs from the other localities.
    'postal_town',
    // locality indicates an incorporated city or town political entity.
    'locality',
    // sublocality indicates a civil entity below a locality; larger level
    // numbers indicate a smaller geographic area.
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
    'sublocality_level_5',
  ],
  postalcode: ['postal_code'],
  country: ['country'],
};

/**
 * Compose an address from Google's components.
 *
 * Two behaviours are inherited deliberately and are covered by tests: only
 * `types[0]` is consulted, and when several components map to the same field
 * the last one wins - there is no precedence between, say, postal_town and
 * locality. `full_address` is never populated here; the caller merges in the
 * formatted address.
 */
export function composeAddress(
  components: GoogleAddressComponent[] | null | undefined,
): Address | undefined {
  if (!components) return undefined;

  const address: AddressBase = {
    full_address: '',
    streetNumber: '',
    street: '',
    postalcode: '',
    state: '',
    city: '',
    country: '',
  };

  for (const component of components) {
    for (const field of typedKeys(COMPONENT_MAP)) {
      if (COMPONENT_MAP[field]?.includes(component.types[0])) {
        address[field] = component.longText ?? '';
      }
    }
  }

  return address;
}
