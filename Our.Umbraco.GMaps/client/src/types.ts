export interface Map {
  address: Address;
  mapconfig: MapConfig;
}

export interface Location {
  lat: number;
  lng: number;
}

export type MapType = "roadmap" | "satellite" | "hybrid" | "terrain" | "styled_map";

export interface AddressBase {
  full_address?: string;
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


interface MapConfig {
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
  customstyle?: string;
}

export interface GMapsConfig {
  apiKey?: string;
  defaultLocation?: string;
  zoomLevel?: number;
}