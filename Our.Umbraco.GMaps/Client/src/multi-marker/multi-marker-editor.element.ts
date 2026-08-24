/// <reference types='@types/google.maps' />
import { css, customElement, html, nothing, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import type {
  UmbPropertyEditorConfigCollection,
  UmbPropertyEditorUiElement,
} from '@umbraco-cms/backoffice/property-editor';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbFormControlMixin } from '@umbraco-cms/backoffice/validation';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { UmbSorterController } from '@umbraco-cms/backoffice/sorter';

import { DEFAULT_LOCATION } from '../types.js';
import type { Location, Map, MapType, Marker, MarkerColor, MultiMap } from '../types.js';
import { formatCoordinates, parseCoordinates } from '../core/coordinates.js';
import {
  addMarker,
  canAddMarker,
  markerLimitsAreSane,
  removeMarker as removeFromCollection,
  reorderMarkers,
  updateMarker,
} from '../core/marker-collection.js';
import { buildMultiMapValue, readMultiMapValue } from '../core/value.js';
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { GeocodingController } from '../controllers/geocoding.controller.js';
import type { EditorNotice } from '../core/geocode-status.js';
import { GMAPS_MARKER_DRAWER_MODAL } from './marker-drawer/marker-drawer.token.js';
import { onGoogleMapsAuthFailure } from '../google-maps-auth.js';
import { GMapsSettingsContext } from '../contexts/gmaps-settings.context.js';

const elementName = 'gmaps-multi-marker';

const AUTH_FAILURE_MESSAGE =
  'Google Maps rejected this API key. Check that the key is valid, that billing is enabled, and that the site is allowed by the key\'s HTTP referrer restrictions.';

@customElement(elementName)
export default class GMapsMultiMarkerEditorElement
  // Both type arguments are given deliberately: supplying only the value type
  // lets T fall back to its default and silently drops UmbLitElement's
  // controller-host members, which umbOpenModal needs.
  extends UmbFormControlMixin<MultiMap | undefined, typeof UmbLitElement>(UmbLitElement)
  implements UmbPropertyEditorUiElement
{
  /**
   * Injectable so tests can drive initialisation with FakeMapsApi. The single
   * marker editor hardcodes its api, which is exactly why its initialisation
   * cannot be exercised by a test.
   */
  @property({ attribute: false })
  public api: GoogleMapsApi = new GoogleMapsApiImpl();

  #settingsContext = new GMapsSettingsContext(this);
  #mapSurface?: MapSurfaceController;
  #geocoding?: GeocodingController;
  #markerElements = new window.Map<string, google.maps.marker.AdvancedMarkerElement>();
  #initialValue?: MultiMap | Map;
  #initialized = false;
  #valueReceived = false;
  #configReceived = false;
  #ctrlHintTimeout?: number;
  #resolveInitialized!: () => void;

  /** Resolves once initialisation has finished, successfully or not. Tests await this. */
  public readonly whenInitialized = new Promise<void>((resolve) => {
    this.#resolveInitialized = resolve;
  });

  @state() private _markers: Marker[] = [];
  @state() private _notice?: EditorNotice;
  #authFailed = false;
  @state() private _loading = true;
  @state() private _selectedKey?: string;

  private _apiKey?: string;
  private _mapType: MapType = 'roadmap';
  private _zoomLevel = 12;
  private _center?: Location;
  private _defaultLocation: Location = DEFAULT_LOCATION;
  private _hideMap = false;
  private _enableDescription = false;
  private _palette: MarkerColor[] = [];
  private _min?: number;
  private _max?: number;
  private _limitsSane = true;
  #configHasLocation = false;

  /**
   * Drag-to-reorder over the chips. The stored order drives front-end legends,
   * so it is content rather than presentation.
   */
  #sorter = new UmbSorterController<Marker, HTMLElement>(this, {
    getUniqueOfElement: (element) => element.dataset.key,
    getUniqueOfModel: (marker) => marker.key,
    identifier: 'GMaps.MultiMarker.Chips',
    itemSelector: '.chip:not(.add)',
    containerSelector: '#chips',
    ignorerSelector: 'button',
    handleSelector: '.grip',
    onChange: ({ model }) => this.reorder(model.map((m) => m.key)),
  });

  /** Exposed so tests can assert on the sorter's model without faking drag events. */
  public get sorterForTests(): UmbSorterController<Marker, HTMLElement> {
    return this.#sorter;
  }

  /** The live marker list. Exposed for tests; the value is the public contract. */
  public get markersForTests(): Marker[] {
    return this._markers;
  }

  @property({ attribute: false })
  public override set value(next: MultiMap | undefined) {
    this.#valueReceived = true;
    if (!this.#initialValue && next) this.#initialValue = structuredClone(next);
    super.value = next;
  }
  public override get value(): MultiMap | undefined {
    return super.value;
  }

  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {
    this.#configReceived = true;
    this._apiKey = config?.getValueByAlias<string>('apikey');
    this._mapType = config?.getValueByAlias<MapType>('maptype') || 'roadmap';
    this._hideMap = config?.getValueByAlias<boolean>('hideMap') || false;
    this._zoomLevel = config?.getValueByAlias<number>('zoom') || 12;
    this._enableDescription = config?.getValueByAlias<boolean>('enableDescription') || false;
    this._palette = config?.getValueByAlias<MarkerColor[]>('markerColors') ?? [];
    this._min = config?.getValueByAlias<number>('minNumber') || undefined;
    this._max = config?.getValueByAlias<number>('maxNumber') || undefined;

    this._limitsSane = markerLimitsAreSane(this._min, this._max);
    if (!this._limitsSane) {
      console.warn(
        '[Our.Umbraco.GMaps] Multi Marker is misconfigured: minNumber is greater than maxNumber. Both limits are being ignored.',
        this,
      );
      this._min = undefined;
      this._max = undefined;
    }

    const configured = parseCoordinates(config?.getValueByAlias<string>('location'));
    if (configured) {
      this.#configHasLocation = true;
      this._defaultLocation = configured;
      this._center ??= configured;
    }
  }

  constructor() {
    super();
    this.addValidator(
      'rangeUnderflow',
      () => `At least ${this._min} marker${this._min === 1 ? '' : 's'} required.`,
      () => !!this._min && this._markers.length < this._min,
    );
    this.addValidator(
      'rangeOverflow',
      () => `No more than ${this._max} marker${this._max === 1 ? '' : 's'} allowed.`,
      () => !!this._max && this._markers.length > this._max,
    );
    onGoogleMapsAuthFailure(() => {
      this.#authFailed = true;
      this._notice = { severity: 'error', message: AUTH_FAILURE_MESSAGE };
      this._loading = false;
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#mapSurface?.destroy();
    globalThis.clearTimeout(this.#ctrlHintTimeout);
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    // The sorter tracks its own copy of the list, so it has to be told whenever
    // markers are added, removed or reordered.
    this.#sorter.setModel(this._markers);
    void this.#tryInitialize();
  }

  async #tryInitialize() {
    if (this.#initialized) return;
    // Value and config arrive independently; wait for both so datatype config is
    // always applied regardless of arrival order.
    if (!this.#valueReceived || !this.#configReceived) return;
    this.#initialized = true;
    try {
      await this.#initialize();
    } finally {
      // Resolve even on failure, or an awaiting test hangs until timeout.
      this.#resolveInitialized();
    }
  }

  async #initialize() {
    await this.#applyServerSettings();

    const stored = readMultiMapValue(this.value);
    this._markers = stored.markers;
    // The stored centre and zoom are the framing this document was saved with
    // and beat any configured default, which exists to frame new content.
    this._center = stored.center ?? this._center ?? this._defaultLocation;
    this._zoomLevel = stored.zoom ?? this._zoomLevel;

    this.api.configure(this._apiKey ?? '');
    this.#geocoding = new GeocodingController(this.api);
    this.#mapSurface = new MapSurfaceController(this.api);

    const map = await this.#mapSurface.create(
      this.shadowRoot?.getElementById('map') as HTMLElement,
      {
        center: this._center,
        zoom: this._zoomLevel,
        maptype: this._mapType,
        onCenterChanged: (center) => {
          this._center = center;
          this.#commit();
        },
        onZoomChanged: (zoom) => {
          this._zoomLevel = zoom;
          this.#commit();
        },
        onCtrlHintNeeded: () => this.#showCtrlHint(),
      },
    );

    // Plain click drops a pin: ctrl+drag already owns panning, so a click is free.
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event?.latLng) return;
      void this.#addMarkerAt({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    await this.#syncMarkerElements(map);
    await this.#setupAutocomplete(map);

    // Markers but no stored framing: show them all rather than opening on a
    // configured default that may not contain any of them. A stored centre
    // always wins, so this never moves a framing an editor chose.
    if (!stored.center && this._markers.some((m) => m.coordinates)) {
      this.fitToMarkers();
    }

    this._loading = false;
  }

  /**
   * Fall back to the appsettings values (the GoogleMaps section) for anything
   * the datatype did not specify.
   *
   * Without this the editor configures the SDK with an empty key whenever the
   * datatype has none, and Google answers every request with "Method doesn't
   * allow unregistered callers" - no geocoding, and a dead autocomplete.
   * Configuring the key in appsettings rather than per-datatype is the
   * documented setup, so this is the common path, not the edge case.
   */
  async #applyServerSettings() {
    const serverConfig = await this.#settingsContext.getSettings().catch(() => undefined);
    if (!serverConfig) return;

    if (!this._apiKey) this._apiKey = serverConfig.apiKey ?? undefined;

    if (!this.#configHasLocation) {
      const serverDefault = parseCoordinates(serverConfig.defaultLocation ?? undefined);
      if (serverDefault) {
        this._defaultLocation = serverDefault;
        this._center ??= serverDefault;
      }
    }
  }

  /**
   * A rejected API key outranks everything else and stays put: the map is broken
   * until it is fixed, so a geocode that happens to succeed must not clear it.
   */
  #setNotice(notice: EditorNotice | undefined) {
    if (this.#authFailed) return;
    this._notice = notice;
  }

  // ---- markers -----------------------------------------------------------

  /** Reconcile the pure marker list onto real AdvancedMarkerElements. */
  async #syncMarkerElements(map: google.maps.Map) {
    for (const [key, element] of this.#markerElements) {
      if (!this._markers.some((m) => m.key === key)) {
        element.map = null;
        this.#markerElements.delete(key);
      }
    }

    for (const marker of this._markers) {
      const position = marker.coordinates ?? this._defaultLocation;
      const existing = this.#markerElements.get(marker.key);
      if (existing) {
        existing.position = position;
        continue;
      }

      const element = await this.api.createMarker({ map, position, gmpDraggable: true });
      element.addListener('dragend', () => {
        const p = element.position;
        if (!p) return;
        const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
        const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
        void this.#moveMarker(marker.key, { lat, lng });
      });
      element.addListener('click', () => void this.openDrawer(marker.key));
      this.#markerElements.set(marker.key, element);
    }
  }

  async #addMarkerAt(coordinates: Location) {
    if (!canAddMarker(this._markers, this._max)) return;

    const next = addMarker(this._markers, { coordinates }, this._max);
    const created = next[next.length - 1];
    this._markers = next;
    this.#commit();
    await this.#refreshMarkerElements();

    // Best effort: the coordinates stand either way, but a failure is still
    // reported - silently dropping the address is how an unauthorised key looks
    // like "this place just has no address".
    const { result, notice } = (await this.#geocoding?.reverse(coordinates)) ?? {};
    this.#setNotice(notice);
    if (result) {
      this._markers = updateMarker(this._markers, created.key, {
        ...result.address,
        coordinates,
      });
      this.#commit();
    }
  }

  async #moveMarker(key: string, coordinates: Location) {
    this._markers = updateMarker(this._markers, key, { coordinates });
    this.#commit();

    const { result, notice } = (await this.#geocoding?.reverse(coordinates)) ?? {};
    this.#setNotice(notice);
    if (result) {
      this._markers = updateMarker(this._markers, key, { ...result.address, coordinates });
      this.#commit();
    }
  }

  async #refreshMarkerElements() {
    const map = this.#mapSurface?.map;
    if (map) await this.#syncMarkerElements(map);
  }

  // ---- public operations -------------------------------------------------

  public addMarkerAtCentre() {
    void this.#addMarkerAt(this._center ?? this._defaultLocation);
  }

  public removeMarker(key: string) {
    this._markers = removeFromCollection(this._markers, key);
    if (this._selectedKey === key) this._selectedKey = undefined;
    this.#commit();
    void this.#refreshMarkerElements();
  }

  public reorder(keys: string[]) {
    this._markers = reorderMarkers(this._markers, keys);
    this.#commit();
  }

  public applyMarkerEdit(marker: Marker) {
    const { key, ...patch } = marker;
    this._markers = updateMarker(this._markers, key, patch);
    this.#commit();
    void this.#refreshMarkerElements();
  }

  public async openDrawer(key: string) {
    const marker = this._markers.find((m) => m.key === key);
    if (!marker) return;

    this._selectedKey = key;
    try {
      const edited = await umbOpenModal(this, GMAPS_MARKER_DRAWER_MODAL, {
        data: {
          marker,
          palette: this._palette,
          enableDescription: this._enableDescription,
        },
      });
      this.applyMarkerEdit(edited);
    } catch {
      // Cancelled - umbOpenModal rejects, and abandoning the edit is the point.
    } finally {
      this._selectedKey = undefined;
    }
  }

  /**
   * Frame every marker.
   *
   * The bounds are computed as a plain literal rather than with
   * `new google.maps.LatLngBounds()`, so this stays reachable from tests running
   * against FakeMapsApi - the SDK global does not exist there. `fitBounds`
   * accepts a LatLngBoundsLiteral, so nothing is lost.
   */
  public fitToMarkers() {
    const map = this.#mapSurface?.map;
    const positioned = this._markers.map((m) => m.coordinates).filter((c): c is Location => !!c);
    if (!map || positioned.length === 0) return;

    const lats = positioned.map((c) => c.lat);
    const lngs = positioned.map((c) => c.lng);

    map.fitBounds({
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    });
  }

  public resetView() {
    const restored = readMultiMapValue(this.#initialValue);
    this._markers = restored.markers;
    this._center = restored.center ?? this._defaultLocation;
    this._zoomLevel = restored.zoom ?? this._zoomLevel;
    this.#mapSurface?.setCenter(this._center);
    this.#mapSurface?.setZoom(this._zoomLevel);
    this.#commit();
    void this.#refreshMarkerElements();
  }

  // ---- value -------------------------------------------------------------

  /**
   * Write the current state into the property value.
   *
   * No-ops when nothing actually changed. The real Google map fires
   * center_changed during initialisation, and committing an identical value
   * would dispatch a change event that marks the document dirty the moment it
   * opens.
   */
  #commit() {
    const next = buildMultiMapValue({
      markers: this._markers,
      zoom: this._zoomLevel,
      maptype: this._mapType,
      center: this._center,
      defaultLocation: this._defaultLocation,
    });

    if (JSON.stringify(next) === JSON.stringify(this.value)) return;

    this.value = next;
    this.dispatchEvent(new UmbChangeEvent());
  }

  // ---- search ------------------------------------------------------------

  async #setupAutocomplete(map: google.maps.Map) {
    const autocomplete = await this.api.createAutocomplete();
    this.shadowRoot?.getElementById('place-autocomplete-container')?.appendChild(autocomplete);

    map.addListener('idle', () => {
      const bounds = map.getBounds();
      if (bounds) autocomplete.locationBias = bounds;
    });

    // Coordinates typed into the box are intercepted in the capture phase, before
    // the component's own Enter handling can swallow them.
    autocomplete.addEventListener(
      'keydown',
      (event: Event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter') return;
        // Either source can hold the text depending on how deeply the component
        // nests its input: composedPath() misses it when the real <input> sits
        // below another shadow root, and the component's own `value` is then the
        // only place the typed text appears.
        const fromInput = event
          .composedPath()
          .find((el): el is HTMLInputElement => el instanceof HTMLInputElement)?.value;
        const text = fromInput || autocomplete.value || '';
        const coords = parseCoordinates(text);
        if (!coords) return;
        ke.preventDefault();
        ke.stopPropagation();
        void this.#addMarkerAt(coords);
        autocomplete.value = '';
      },
      { capture: true },
    );

    autocomplete.addEventListener('gmp-select', async (event) => {
      const { placePrediction } = event as unknown as {
        placePrediction?: { toPlace(): google.maps.places.Place };
      };
      if (!placePrediction) return;

      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'location'],
      });
      if (!place.location) return;

      const coordinates = { lat: place.location.lat(), lng: place.location.lng() };
      if (!canAddMarker(this._markers, this._max)) return;

      this._markers = addMarker(
        this._markers,
        {
          coordinates,
          full_address: place.formattedAddress ?? undefined,
          friendlyName: place.displayName ?? undefined,
        },
        this._max,
      );
      this._center = coordinates;
      this.#commit();
      await this.#refreshMarkerElements();
      this.#mapSurface?.setCenter(coordinates);
      autocomplete.value = '';
    });
  }

  #showCtrlHint() {
    const overlay = this.shadowRoot?.getElementById('ctrlScrollOverlay');
    if (!overlay) return;
    overlay.classList.add('visible');
    globalThis.clearTimeout(this.#ctrlHintTimeout);
    this.#ctrlHintTimeout = globalThis.setTimeout(() => {
      overlay.classList.remove('visible');
    }, 2000);
  }

  // ---- render ------------------------------------------------------------

  #countLabel() {
    if (this._max) return `${this._markers.length} of ${this._max}`;
    return `${this._markers.length} marker${this._markers.length === 1 ? '' : 's'}`;
  }

  #chipLabel(marker: Marker) {
    return (
      marker.friendlyName || marker.full_address || formatCoordinates(marker.coordinates) || 'Marker'
    );
  }

  override render() {
    const atMax = !canAddMarker(this._markers, this._max);

    return html`
      <div class='search'>
        <div id='place-autocomplete-container'></div>
        ${this._notice
          ? html`<div
              class='notice ${this._notice.severity}'
              role=${this._notice.severity === 'error' ? 'alert' : 'status'}>
              ${this._notice.message}
            </div>`
          : nothing}
        ${!this._limitsSane
          ? html`<div class='warning'>
              This property is misconfigured: the minimum number of markers is greater than the
              maximum, so both limits are being ignored.
            </div>`
          : nothing}
      </div>

      ${this._loading ? html`<uui-loader></uui-loader>` : nothing}

      <div class='map-container' style=${this._hideMap ? 'display:none;' : ''}>
        <div id='map'></div>
        <div class='ctrl-scroll-overlay' id='ctrlScrollOverlay'>Use ctrl + drag to pan the map</div>
      </div>

      <div class='marker-bar'>
        <span class='count'>${this.#countLabel()}</span>
        <uui-button
          label='Fit to markers'
          look='secondary'
          compact
          ?disabled=${this._markers.length === 0}
          @click=${() => this.fitToMarkers()}>Fit to markers</uui-button>
      </div>

      <div class='chips' id='chips'>
        ${this._markers.map(
          (marker) => html`
            <div
              class='chip ${this._selectedKey === marker.key ? 'selected' : ''}'
              data-key=${marker.key}>
              <span class='grip' title='Drag to reorder'>⠿</span>
              ${marker.color
                ? html`<span class='dot' style='background:${marker.color}'></span>`
                : nothing}
              <button type='button' class='chip-label' @click=${() => this.openDrawer(marker.key)}>
                ${this.#chipLabel(marker)}
              </button>
              <button
                type='button'
                class='chip-remove'
                aria-label='Remove ${this.#chipLabel(marker)}'
                @click=${() => this.removeMarker(marker.key)}>✕</button>
            </div>
          `,
        )}
        <button
          type='button'
          id='add-marker'
          class='chip add'
          ?disabled=${atMax}
          @click=${() => this.addMarkerAtCentre()}>+ Add at centre</button>
      </div>
    `;
  }

  static readonly styles = [
    UmbTextStyles,
    css`
      .search { display: flex; flex-direction: column; gap: .75em; }
      #place-autocomplete-container { width: 100%; }
      .map-container { position: relative; width: 100%; margin-top: 1em; }
      #map { height: 500px; width: 100%; }
      .ctrl-scroll-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,.55); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; z-index: 1000; pointer-events: none;
        visibility: hidden; opacity: 0; transition: visibility .3s, opacity .3s ease-in-out;
      }
      .ctrl-scroll-overlay.visible { visibility: visible; opacity: 1; }
      .marker-bar {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: .75em; font-size: .85em;
      }
      .count { text-transform: uppercase; letter-spacing: .05em; color: var(--uui-color-text-alt, #666); }
      .chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5em; }
      .chip {
        display: inline-flex; align-items: center; gap: .35rem;
        border: 1px solid var(--uui-color-border, #ccc); border-radius: 20px;
        padding: .25rem .55rem; background: var(--uui-color-surface, #fff); font-size: .85em;
      }
      .chip.selected { border-color: var(--uui-color-selected, #006eff); }
      .chip.add { border-style: dashed; cursor: pointer; }
      .chip.add[disabled] { opacity: .5; cursor: not-allowed; }
      .grip { cursor: grab; color: var(--uui-color-text-alt, #999); }
      .dot { width: 11px; height: 11px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); }
      .chip-label, .chip-remove {
        background: none; border: none; padding: 0; cursor: pointer;
        font: inherit; color: inherit;
      }
      .chip-remove { color: var(--uui-color-text-alt, #999); }
      .notice, .warning {
        padding: .6em .75em; font-size: .9em; border-radius: 3px;
        background: var(--uui-color-surface-alt, #f3f3f5);
        border-left: 3px solid var(--uui-color-border, #ccc);
      }
      .notice.error { border-left-color: var(--uui-color-danger, #d42054); }
      .warning { border-left-color: var(--uui-color-warning-emphasis, #d29c00); }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GMapsMultiMarkerEditorElement;
  }
}
