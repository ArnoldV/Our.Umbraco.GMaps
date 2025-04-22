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


interface MapConfig{
    /**
     * @deprecated The method should not be used
     */
    apikey?: string;

    zoom?: number | string; //Can apparently be string in old values

    centerCoordinates?: Location;

    /**
     * @deprecated The method should not be used
     */
    mapstyle?: string;

    maptype?: MapType;
}

export function typedKeys<T extends object>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>;
  }