import { DEFAULT_LOCATION } from '../types.js';
import type { Address, Location, Map, MapType } from '../types.js';

export interface SingleMapValueInput {
  address?: Address;
  friendlyName?: string;
  location?: Location;
  center?: Location;
  zoom: number;
  maptype: MapType;
  defaultLocation: Location;
}

/**
 * Build the Single editor's stored value.
 *
 * Note the asymmetry, inherited from the original setValue() and covered by
 * tests: the pin falls back to the caller's `defaultLocation`, but the map
 * centre falls back to the hardcoded DEFAULT_LOCATION, so a datatype-configured
 * default never reaches mapconfig.centerCoordinates. Preserved deliberately -
 * changing it is a behaviour change, not a refactor.
 */
export function buildSingleMapValue(input: SingleMapValueInput): Map {
  return {
    address: {
      ...input.address,
      // Must stay after the spread: `address` can carry a stale friendlyName,
      // and the live one wins.
      friendlyName: input.friendlyName,
      coordinates: {
        lat: input.location?.lat ?? input.defaultLocation.lat,
        lng: input.location?.lng ?? input.defaultLocation.lng,
      },
    },
    mapconfig: {
      zoom: input.zoom,
      maptype: input.maptype,
      centerCoordinates: input.center ?? DEFAULT_LOCATION,
    },
  };
}

/** Split a stored value back into the pieces the editor holds as state. */
export function readSingleMapValue(value: Map | undefined): {
  address?: Address;
  friendlyName?: string;
  location?: Location;
  center?: Location;
} {
  if (!value) return {};

  const { coordinates, ...address } = value.address ?? {};

  return {
    address,
    friendlyName: value.address?.friendlyName,
    location: coordinates,
    center: value.mapconfig?.centerCoordinates,
  };
}
