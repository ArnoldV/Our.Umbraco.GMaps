/// <reference types='@types/google.maps' />
import type { GoogleMapsApi } from '../maps/maps-api.js';
import type { Location, MapType } from '../types.js';

export interface MapSurfaceOptions {
  center: Location;
  zoom: number;
  maptype: MapType;
  onCenterChanged(center: Location): void;
  onZoomChanged(zoom: number): void;
  /** The map refused a drag; the host should show its "use ctrl + drag" hint. */
  onCtrlHintNeeded(): void;
}

/** Shared by every map this package creates; see the Google Cloud console. */
const MAP_ID = '4504f8b37365c3d0';

/**
 * Owns the map surface: creation, centre and zoom tracking, and the
 * ctrl-to-pan behaviour that stops the map swallowing page scroll.
 *
 * Deliberately knows nothing about markers or addresses, and never touches the
 * host's DOM beyond the container it is given - the host decides how the
 * ctrl hint looks, this only says when one is needed.
 */
export class MapSurfaceController {
  #api: GoogleMapsApi;
  #map?: google.maps.Map;
  #modifierHeld = false;
  #lastCenter?: google.maps.LatLngLiteral;
  #onKeyDown?: (event: KeyboardEvent) => void;
  #onKeyUp?: (event: KeyboardEvent) => void;

  constructor(api: GoogleMapsApi) {
    this.#api = api;
  }

  get map(): google.maps.Map | undefined {
    return this.#map;
  }

  async create(container: HTMLElement, options: MapSurfaceOptions): Promise<google.maps.Map> {
    const map = await this.#api.createMap(container, {
      center: options.center,
      zoom: options.zoom,
      mapTypeId: options.maptype.toString().toLowerCase(),
      mapId: MAP_ID,
      gestureHandling: 'cooperative',
    });

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) options.onCenterChanged({ lat: center.lat(), lng: center.lng() });
    });

    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom();
      if (zoom !== undefined) options.onZoomChanged(zoom);
    });

    this.#trackModifierKeys();

    map.addListener('dragstart', () => {
      const center = map.getCenter();
      this.#lastCenter = center ? { lat: center.lat(), lng: center.lng() } : undefined;
    });

    map.addListener('drag', () => {
      if (this.#modifierHeld || !this.#lastCenter) return;
      map.setCenter(this.#lastCenter);
      options.onCtrlHintNeeded();
    });

    this.#map = map;
    return map;
  }

  setCenter(center: Location) {
    this.#map?.setCenter(center);
  }

  setZoom(zoom: number) {
    this.#map?.setZoom(zoom);
  }

  destroy() {
    if (this.#onKeyDown) globalThis.removeEventListener('keydown', this.#onKeyDown);
    if (this.#onKeyUp) globalThis.removeEventListener('keyup', this.#onKeyUp);
    this.#onKeyDown = undefined;
    this.#onKeyUp = undefined;
    this.#modifierHeld = false;
  }

  #trackModifierKeys() {
    this.#onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') this.#modifierHeld = true;
    };
    this.#onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta') this.#modifierHeld = false;
    };
    globalThis.addEventListener('keydown', this.#onKeyDown);
    globalThis.addEventListener('keyup', this.#onKeyUp);
  }
}
