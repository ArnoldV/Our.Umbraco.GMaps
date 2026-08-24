/// <reference types='@types/google.maps' />
import type { GeocodeOutcome, GoogleMapsApi, PinOptions } from './maps-api.js';

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

/**
 * An AdvancedMarkerElement stand-in. Content is a plain property so a test can
 * read back the pin the editor asked for.
 */
export class FakeMarker {
  position: google.maps.LatLngLiteral | google.maps.LatLng | null;
  content: Node | null = null;
  map: unknown = null;
  title = '';
  readonly listeners = new Map<string, Listener[]>();

  constructor(options: google.maps.marker.AdvancedMarkerElementOptions) {
    this.position = (options.position as google.maps.LatLngLiteral) ?? null;
    this.content = (options.content as Node) ?? null;
    this.map = options.map ?? null;
    this.title = options.title ?? '';
  }

  addListener(event: string, handler: Listener) {
    const existing = this.listeners.get(event) ?? [];
    existing.push(handler);
    this.listeners.set(event, existing);
    return { remove: () => {} };
  }

  emit(event: string, payload?: unknown) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }
}

/** A GoogleMapsApi that never touches the network. */
export class FakeMapsApi implements GoogleMapsApi {
  configuredKey?: string;
  lastMap?: FakeMap;
  readonly geocodeRequests: google.maps.GeocoderRequest[] = [];
  readonly markers: FakeMarker[] = [];
  readonly pins: PinOptions[] = [];

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
    const marker = new FakeMarker(options);
    this.markers.push(marker);
    return marker as unknown as google.maps.marker.AdvancedMarkerElement;
  }

  /**
   * A pin as a real element carrying its options as data attributes, so a test
   * can assert on what was drawn without a PinElement.
   */
  async createPin(options: PinOptions): Promise<HTMLElement> {
    const element = document.createElement('div');
    element.className = 'fake-pin';
    element.dataset.glyph = options.glyph ?? '';
    element.dataset.background = options.background ?? '';
    element.dataset.borderColor = options.borderColor ?? '';
    element.dataset.glyphColor = options.glyphColor ?? '';
    this.pins.push(options);
    return element;
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
