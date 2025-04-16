export interface Map {
    address: Address;
    mapconfig: MapConfig;
}

export interface Location {
    lat: number;
    lng: number;
}

export type MapType = "roadmap" | "satellite" | "hybrid" | "terrain" | "styled_map";

export interface Address {
    coordinates?: Location;
    full_address?: string;
    streetNumber?: string;
    street?: string;
    postalcode?: string;
    city?: string;
    state?: string;
    country?: string;
}

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