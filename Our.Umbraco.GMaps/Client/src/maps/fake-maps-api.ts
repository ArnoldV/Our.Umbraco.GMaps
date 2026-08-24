/// <reference types='@types/google.maps' />
import type { GeocodeOutcome, GoogleMapsApi } from './maps-api.js';

type Listener = (event?: unknown) => void;

/** A google.maps.Map stand-in that records what was asked of it. */
export class FakeMap {
  center: google.maps.LatLngLiteral;
  zoom: number;
  readonly listeners = new Map<string, Listener[]>();
  readonly fitBoundsCalls: unknown[] = [];

  constructor(center: google.maps.LatLngLiteral, zoom: number) {
    this.center = center;
    this.zoom = zoom;
  }

  addListener(event: string, handler: Listener) {
    const existing = this.listeners.get(event) ?? [];
    existing.push(handler);
    this.listeners.set(event, existing);
    return { remove: () => {} };
  }

  /** Fire a listener the way the SDK would. */
  emit(event: string, payload?: unknown) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }

  setCenter(center: google.maps.LatLngLiteral) {
    this.center = center;
  }

  getCenter() {
    return { lat: () => this.center.lat, lng: () => this.center.lng };
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
  }

  getZoom() {
    return this.zoom;
  }

  getBounds() {
    return undefined;
  }

  fitBounds(bounds: unknown) {
    this.fitBoundsCalls.push(bounds);
  }
}

/** A GoogleMapsApi that never touches the network. */
export class FakeMapsApi implements GoogleMapsApi {
  configuredKey?: string;
  lastMap?: FakeMap;
  readonly geocodeRequests: google.maps.GeocoderRequest[] = [];

  /** Outcomes are consumed in order; the last one repeats once exhausted. */
  #outcomes: GeocodeOutcome[] = [{ results: [], status: 'ZERO_RESULTS' }];

  queueGeocodeOutcomes(...outcomes: GeocodeOutcome[]) {
    this.#outcomes = outcomes;
  }

  configure(key: string): void {
    this.configuredKey = key;
  }

  async createMap(
    _container: HTMLElement,
    options: google.maps.MapOptions,
  ): Promise<google.maps.Map> {
    this.lastMap = new FakeMap(
      (options.center as google.maps.LatLngLiteral) ?? { lat: 0, lng: 0 },
      options.zoom ?? 0,
    );
    return this.lastMap as unknown as google.maps.Map;
  }

  async createMarker(
    options: google.maps.marker.AdvancedMarkerElementOptions,
  ): Promise<google.maps.marker.AdvancedMarkerElement> {
    return {
      position: options.position ?? null,
      addListener: () => ({ remove: () => {} }),
    } as unknown as google.maps.marker.AdvancedMarkerElement;
  }

  async createAutocomplete(): Promise<google.maps.places.PlaceAutocompleteElement> {
    return document.createElement('div') as unknown as google.maps.places.PlaceAutocompleteElement;
  }

  async geocode(request: google.maps.GeocoderRequest): Promise<GeocodeOutcome> {
    this.geocodeRequests.push(request);
    return this.#outcomes.length > 1
      ? (this.#outcomes.shift() as GeocodeOutcome)
      : this.#outcomes[0];
  }
}
