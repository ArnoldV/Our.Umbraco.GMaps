import type { Location } from '../types.js';

/**
 * Coerce the several shapes a coordinate arrives in - a number, a numeric
 * string, or one of the Google SDK's lat()/lng() accessors - to a number.
 * Non-numeric text yields NaN, matching parseFloat.
 */
export function toNumber(value: string | number | (() => number) | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'function') return value();
  return parseFloat(value.trim());
}

/**
 * Parse a "lat,lng" string. Both parts must be valid numbers in range,
 * otherwise text like "Paris, France" would parse to NaN and be accepted as a
 * broken location.
 */
export function parseCoordinates(latLng: string | undefined): Location | undefined {
  if (!latLng) return undefined;

  const parts = latLng.split(',');
  if (parts.length !== 2) return undefined;

  const lat = toNumber(parts[0]);
  const lng = toNumber(parts[1]);

  if (lat === undefined || lng === undefined) return undefined;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined;
  if (lat < -90 || lat > 90) return undefined;
  if (lng < -180 || lng > 180) return undefined;

  return { lat, lng };
}

export function formatCoordinates(coordinates: Location | undefined): string | undefined {
  if (!coordinates) return undefined;
  return `${coordinates.lat},${coordinates.lng}`;
}
