import { DEFAULT_LOCATION } from '../types.js';
import type { Address, Location, Map, MapType, Marker, MultiMap } from '../types.js';
import { newMarkerKey } from './marker-collection.js';

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
 * The pin falls back to the caller's `defaultLocation`, but the map centre
 * falls back to the hardcoded DEFAULT_LOCATION. Asymmetric, inherited from the
 * original setValue(), and preserved deliberately.
 */
export function buildSingleMapValue(input: SingleMapValueInput): Map {
  return {
    address: {
      ...input.address,
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

/**
 * Which centre a freshly-loaded editor should show. A stored centre wins: the
 * configured default exists to frame new content, not to overwrite the framing
 * an editor chose.
 */
export function resolveInitialCenter(
  storedCenter: Location | undefined,
  configuredCenter: Location | undefined,
  defaultLocation: Location,
): Location {
  return storedCenter ?? configuredCenter ?? defaultLocation;
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

export interface MultiMapValueInput {
  markers: Marker[];
  zoom: number;
  maptype: MapType;
  center?: Location;
  defaultLocation: Location;
}

/**
 * Build the Multi editor's stored value. Unlike {@link buildSingleMapValue},
 * the centre falls back to the caller's `defaultLocation`.
 */
export function buildMultiMapValue(input: MultiMapValueInput): MultiMap {
  return {
    markers: input.markers,
    mapconfig: {
      zoom: input.zoom,
      maptype: input.maptype,
      centerCoordinates: input.center ?? input.defaultLocation,
    },
  };
}

/** A stored value in the legacy single-map shape: one address, no marker list. */
function isLegacySingleValue(value: MultiMap | Map): value is Map {
  return 'address' in value && !('markers' in value);
}

/**
 * Split a stored value into the pieces the multi editor holds as state. A legacy
 * single-map value reads as a one-marker list, mirroring
 * MultiMapPropertyValueConverter.Deserialize.
 */
export function readMultiMapValue(value: MultiMap | Map | undefined): {
  markers: Marker[];
  center?: Location;
  zoom?: number;
} {
  if (!value) return { markers: [] };

  if (isLegacySingleValue(value)) {
    const { coordinates, ...rest } = value.address ?? {};
    return {
      markers: [{ ...rest, key: newMarkerKey(), coordinates }],
      center: value.mapconfig?.centerCoordinates,
      zoom: value.mapconfig?.zoom as number | undefined,
    };
  }

  return {
    markers: (value.markers ?? []).map((m) => (m.key ? m : { ...m, key: newMarkerKey() })),
    center: value.mapconfig?.centerCoordinates,
    zoom: value.mapconfig?.zoom as number | undefined,
  };
}
