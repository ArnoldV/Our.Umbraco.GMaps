import type { Marker } from '../types.js';

/**
 * A max of 0, undefined or negative all mean "no limit" - the datatype config
 * uses 0 for unlimited, matching how core's Multi URL Picker reads maxNumber.
 */
function isUnlimited(max: number | undefined): boolean {
  return max === undefined || max <= 0;
}

/** Stable identity for a new marker. */
export function newMarkerKey(): string {
  return crypto.randomUUID();
}

export function canAddMarker(markers: Marker[], max?: number): boolean {
  return isUnlimited(max) || markers.length < (max as number);
}

/**
 * Append a marker, assigning a key when the caller did not supply one.
 * Returns the original array unchanged when the collection is already at max,
 * so callers can treat "refused" and "no change" identically.
 */
export function addMarker(
  markers: Marker[],
  marker: Omit<Marker, 'key'> & { key?: string },
  max?: number,
): Marker[] {
  if (!canAddMarker(markers, max)) return markers;
  return [...markers, { ...marker, key: marker.key ?? newMarkerKey() }];
}

export function removeMarker(markers: Marker[], key: string): Marker[] {
  const next = markers.filter((m) => m.key !== key);
  return next.length === markers.length ? markers : next;
}

/**
 * Patch one marker. `key` is stripped from the patch even if a caller casts
 * around the type, because identity outliving an edit is what makes reorder and
 * drawer editing safe.
 */
export function updateMarker(
  markers: Marker[],
  key: string,
  patch: Partial<Omit<Marker, 'key'>>,
): Marker[] {
  if (!markers.some((m) => m.key === key)) return markers;

  const { key: _ignored, ...safe } = patch as Partial<Marker>;
  return markers.map((m) => (m.key === key ? { ...m, ...safe, key: m.key } : m));
}

export function moveMarker(markers: Marker[], fromIndex: number, toIndex: number): Marker[] {
  const last = markers.length - 1;
  if (fromIndex < 0 || toIndex < 0 || fromIndex > last || toIndex > last) return markers;
  if (fromIndex === toIndex) return markers;

  const next = [...markers];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Reorder to match a list of keys. Keys naming no marker are ignored, and
 * markers the list omits keep their relative order at the end - a sorter can
 * report a partial list, and dropping the remainder would delete content.
 */
export function reorderMarkers(markers: Marker[], keys: string[]): Marker[] {
  const byKey = new Map(markers.map((m) => [m.key, m]));
  const ordered: Marker[] = [];

  for (const key of keys) {
    const found = byKey.get(key);
    if (found) {
      ordered.push(found);
      byKey.delete(key);
    }
  }

  return [...ordered, ...markers.filter((m) => byKey.has(m.key))];
}

/**
 * Whether the configured bounds make sense. A datatype with min greater than
 * max is a misconfiguration for the editor to report, not a validation failure
 * for the content editor to resolve.
 */
export function markerLimitsAreSane(min?: number, max?: number): boolean {
  if (min === undefined || isUnlimited(max)) return true;
  return min <= (max as number);
}
