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

/**
 * Which centre a freshly-loaded editor should show.
 *
 * A stored centre wins over any configured default. The default exists to frame
 * *new* content; a stored centre is the framing an editor deliberately chose for
 * this document. Getting the precedence backwards is not merely cosmetic - the
 * editor writes `_center` back on every setValue(), so a configured default
 * winning here means any save that does not pan the map silently overwrites the
 * stored centre, defeating the "centre point saved separately from the marker"
 * feature entirely.
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
 * Build the Multi editor's stored value.
 *
 * Note this deliberately does NOT reproduce the single editor's centre
 * asymmetry: the centre falls back to the caller's `defaultLocation`, not to
 * the hardcoded DEFAULT_LOCATION. There is no back-compatibility reason to
 * carry that bug into a new editor.
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
 * Split a stored value into the pieces the multi editor holds as state.
 *
 * Accepts a legacy single-map value and reads it as a one-marker list, which is
 * what makes switching an existing datatype over to Multi survivable. Mirrors
 * MultiMapPropertyValueConverter.Deserialize server-side.
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
    // Legacy and hand-authored content can lack keys; identity is required.
    markers: (value.markers ?? []).map((m) => (m.key ? m : { ...m, key: newMarkerKey() })),
    center: value.mapconfig?.centerCoordinates,
    zoom: value.mapconfig?.zoom as number | undefined,
  };
}
