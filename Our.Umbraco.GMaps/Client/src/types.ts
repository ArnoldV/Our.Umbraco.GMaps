export interface Map {
  address: Address;
  mapconfig: MapConfig;
}

export interface Location {
  lat: number;
  lng: number;
}

export const DEFAULT_LOCATION: Location = {
  lat: 52.379189,
  lng: 4.899431,
};

export type MapType = "roadmap" | "satellite" | "hybrid" | "terrain" | "styled_map";

export interface AddressBase {
  full_address?: string;
  friendlyName?: string;
  streetNumber?: string;
  street?: string;
  postalcode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface Address extends AddressBase {
  coordinates?: Location;
}

type AddressFlags<Type> = {
  [Property in keyof Type]: string[];
};

export type AddressComponents = AddressFlags<AddressBase>


export interface MapConfig {
  zoom?: number | string; //Can apparently be string in old values

  centerCoordinates?: Location;

  maptype?: MapType;
}

export function typedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}


export interface SnazzyMapsResult {
  pagination: Pagination;
  styles: SnazzyMapsStyle[];
}

export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SnazzyMapsStyle {
  colors: string[];
  createdBy: {
    name: string;
    url?: string;
  };
  createdOn?: string;
  description?: string;
  favorites: number;
  id: number;
  imageUrl: string;
  json: string;
  name: string;
  tags: string[];
  url: string;
  views: number;
}

export interface SnazzyMapsValue {
  apiKey?: string;
  selectedstyle?: SnazzyMapsStyle;
  /** Configuration written before 4.0 stored a boolean flag here. */
  customstyle?: string | boolean;
}

export interface GMapsConfig {
  apiKey?: string;
  defaultLocation?: string;
  zoomLevel?: number;
  hideMap?: boolean;
}

/**
 * The map address fields that can be mapped to other properties on the same
 * content node (or the same block). These are the keys of `AddressBase` plus
 * the coordinate accessors, which have no direct `AddressBase` equivalent.
 */
export const ADDRESS_FIELD_KEYS = [
  'full_address',
  'friendlyName',
  'streetNumber',
  'street',
  'postalcode',
  'city',
  'state',
  'country',
  'lat',
  'lng',
  'coordinates',
] as const;

export type AddressFieldKey = (typeof ADDRESS_FIELD_KEYS)[number];

export const ADDRESS_FIELD_LABELS: Record<AddressFieldKey, string> = {
  full_address: 'Full address',
  friendlyName: 'Friendly name',
  streetNumber: 'Street number',
  street: 'Street',
  postalcode: 'Postal code',
  city: 'City',
  state: 'State / region',
  country: 'Country',
  lat: 'Latitude',
  lng: 'Longitude',
  coordinates: 'Coordinates (lat,lng)',
};

/**
 * Which way address data flows between the map and the mapped properties.
 * - `inbound`  Properties -> Map (geocode the address fields, place the pin).
 * - `outbound` Map -> Properties (write the resolved components back out).
 */
export type PropertyMappingMode = 'off' | 'inbound' | 'outbound' | 'both';

export interface PropertyMappingRow {
  field: AddressFieldKey;
  alias: string;
}

export interface PropertyMappingValue {
  mode?: PropertyMappingMode;
  /**
   * Geocode automatically (debounced) when a mapped source property changes.
   * When false, inbound lookups only happen when the editor asks for one.
   */
  autoLookup?: boolean;
  mappings?: PropertyMappingRow[];
}

/** One swatch from the datatype's palette, matching UmbSwatchDetails. */
export interface MarkerColor {
  label: string;
  value: string;
}

/**
 * One pin on a multi-marker map. Fields are flat rather than nested under an
 * `address`, mirroring `Marker : Address` on the server.
 */
export interface Marker extends AddressBase {
  /** Stable identity for reordering and drawer editing. Never an array index. */
  key: string;
  coordinates?: Location;
  description?: string;
  /** Hex value from the datatype palette. The label is resolved server-side. */
  color?: string;
}

/** Many markers sharing one map configuration. */
export interface MultiMap {
  markers: Marker[];
  mapconfig: MapConfig;
}
