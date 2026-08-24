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
import { composeAddress } from '../core/address.js';
import { formatCoordinates, parseCoordinates } from '../core/coordinates.js';
import {
  addMarker,
  canAddMarker,
  markerLimitsAreSane,
  removeMarker as removeFromCollection,
  reorderMarkers,
  updateMarker,
} from '../core/marker-collection.js';
import { pinSpecFor, pinSpecKey } from '../core/marker-pin.js';
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

/**
 * The typed text, taken from whichever source holds it: `composedPath()` misses
 * the real input when the component nests it below another shadow root, and the
 * component's own `value` is then the only place the text appears.
 */
function textEnteredInto(
  autocomplete: google.maps.places.PlaceAutocompleteElement,
  event: Event,
): string {
  const fromInput = event
    .composedPath()
    .find((el): el is HTMLInputElement => el instanceof HTMLInputElement)?.value;
  return fromInput || autocomplete.value || '';
}

const AUTH_FAILURE_MESSAGE =
  'Google Maps rejected this API key. Check that the key is valid, that billing is enabled, and that the site is allowed by the key\'s HTTP referrer restrictions.';

@customElement(elementName)
export default class GMapsMultiMarkerEditorElement
  extends UmbFormControlMixin<MultiMap | undefined, typeof UmbLitElement>(UmbLitElement)
  implements UmbPropertyEditorUiElement
{
  /** The Google Maps SDK adapter. Injectable so tests can supply a fake. */
  @property({ attribute: false })
  public api: GoogleMapsApi = new GoogleMapsApiImpl();

  #settingsContext = new GMapsSettingsContext(this);
  #mapSurface?: MapSurfaceController;
  #geocoding?: GeocodingController;
  #markerElements = new window.Map<string, google.maps.marker.AdvancedMarkerElement>();
  #drawnPinKeys = new window.Map<string, string>();
  #syncChain: Promise<void> = Promise.resolve();
  #initialValue?: MultiMap | Map;
  #initialized = false;
  #valueReceived = false;
  #configReceived = false;
  #ctrlHintTimeout?: number;
  #autocomplete?: google.maps.places.PlaceAutocompleteElement;
  #resolveInitialized!: () => void;

  /** Resolves once initialisation has finished, successfully or not. */
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

  /** The chip drag-to-reorder controller. */
  public get sorterForTests(): UmbSorterController<Marker, HTMLElement> {
    return this.#sorter;
  }

  /** The live marker list. `value` is the persisted contract. */
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
    this.#sorter.setModel(this._markers);
    void this.#tryInitialize();
  }

  async #tryInitialize() {
    if (this.#initialized) return;
    if (!this.#valueReceived || !this.#configReceived) return;
    this.#initialized = true;
    try {
      await this.#initialize();
    } finally {
      this.#resolveInitialized();
    }
  }

  async #initialize() {
    await this.#applyServerSettings();

    const stored = readMultiMapValue(this.value);
    this._markers = stored.markers;
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

    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event?.latLng) return;
      void this.#addMarkerAt({ lat: event.latLng.lat(), lng: event.latLng.lng() });
    });

    await this.#queueMarkerSync(map);
    await this.#setupAutocomplete(map);

    if (!stored.center && this._markers.some((m) => m.coordinates)) {
      this.fitToMarkers();
    }

    this._loading = false;
  }

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

  #setNotice(notice: EditorNotice | undefined) {
    if (this.#authFailed) return;
    this._notice = notice;
  }

  #queueMarkerSync(map: google.maps.Map): Promise<void> {
    this.#syncChain = this.#syncChain
      .then(() => this.#reconcileMarkerElements(map))
      .catch((error) => console.error('[Our.Umbraco.GMaps] Failed to draw markers', error));
    return this.#syncChain;
  }

  async #reconcileMarkerElements(map: google.maps.Map) {
    for (const [key, element] of this.#markerElements) {
      if (!this._markers.some((m) => m.key === key)) {
        element.map = null;
        this.#markerElements.delete(key);
        this.#drawnPinKeys.delete(key);
      }
    }

    for (const [index, marker] of this._markers.entries()) {
      const position = marker.coordinates ?? this._defaultLocation;
      const existing = this.#markerElements.get(marker.key);

      if (existing) {
        existing.position = position;
        await this.#applyPin(marker, index, existing);
        continue;
      }

      const element = await this.api.createMarker({ map, position, gmpDraggable: true });
      await this.#applyPin(marker, index, element);
      element.addListener('dragend', () => {
        const p = element.position;
        if (!p) return;
        const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
        const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
        void this.#moveMarker(marker.key, { lat, lng });
      });
      element.addListener('click', () => this.selectMarker(marker.key));
      this.#markerElements.set(marker.key, element);
    }
  }

  async #applyPin(
    marker: Marker,
    index: number,
    element: google.maps.marker.AdvancedMarkerElement,
  ) {
    const spec = pinSpecFor(marker, index, marker.key === this._selectedKey);
    element.title = `${spec.glyph}. ${this.#chipLabel(marker)}`;

    const pinKey = pinSpecKey(spec);
    if (this.#drawnPinKeys.get(marker.key) === pinKey) return;

    element.content = await this.api.createPin(spec);
    this.#drawnPinKeys.set(marker.key, pinKey);
  }

  async #addMarkerAt(coordinates: Location) {
    if (!canAddMarker(this._markers, this._max)) return;
    this.clearSelection();

    const next = addMarker(this._markers, { coordinates }, this._max);
    const created = next[next.length - 1];
    this._markers = next;
    this.#commit();
    await this.#refreshMarkerElements();

    const { result, notice } = (await this.#geocoding?.reverse(coordinates)) ?? {};
    this.#setNotice(notice);
    if (result) {
      this._markers = updateMarker(this._markers, created.key, {
        ...result.address,
        coordinates,
      });
      this.#commit();
      await this.#refreshMarkerElements();
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
      await this.#refreshMarkerElements();
    }

    if (key === this._selectedKey) {
      const moved = this.#selectedMarker;
      if (moved) this.#showInSearchBox(this.#searchTextFor(moved));
    }
  }

  async #refreshMarkerElements() {
    const map = this.#mapSurface?.map;
    if (map) await this.#queueMarkerSync(map);
  }

  public addMarkerAtCentre() {
    void this.#addMarkerAt(this._center ?? this._defaultLocation);
  }

  public removeMarker(key: string) {
    this._markers = removeFromCollection(this._markers, key);
    if (this._selectedKey === key) this.clearSelection();
    this.#commit();
    void this.#refreshMarkerElements();
  }

  /**
   * Select a marker so the search box edits it instead of adding another.
   * Selecting the marker that is already selected clears the selection.
   */
  public selectMarker(key: string) {
    const marker = this._markers.find((m) => m.key === key);
    if (!marker || this._selectedKey === key) {
      this.clearSelection();
      return;
    }

    this._selectedKey = key;
    this.#showInSearchBox(this.#searchTextFor(marker));
    void this.#refreshMarkerElements();
  }

  public clearSelection() {
    if (!this._selectedKey) return;
    this._selectedKey = undefined;
    this.#showInSearchBox('');
    void this.#refreshMarkerElements();
  }

  get #selectedMarker(): Marker | undefined {
    return this._markers.find((m) => m.key === this._selectedKey);
  }

  #searchTextFor(marker: Marker): string {
    return marker.full_address || formatCoordinates(marker.coordinates) || '';
  }

  #showInSearchBox(text: string) {
    if (this.#autocomplete) this.#autocomplete.value = text;
  }

  public reorder(keys: string[]) {
    this._markers = reorderMarkers(this._markers, keys);
    this.#commit();
    void this.#refreshMarkerElements();
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

    if (this._selectedKey !== key) this.selectMarker(key);

    const edited = await umbOpenModal(this, GMAPS_MARKER_DRAWER_MODAL, {
      data: {
        marker,
        palette: this._palette,
        enableDescription: this._enableDescription,
      },
    }).catch(() => undefined);

    if (edited) this.applyMarkerEdit(edited);
  }

  /** Frames every positioned marker. */
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

  async #setupAutocomplete(map: google.maps.Map) {
    const autocomplete = await this.api.createAutocomplete();
    this.#autocomplete = autocomplete;
    this.shadowRoot?.getElementById('place-autocomplete-container')?.appendChild(autocomplete);

    map.addListener('idle', () => {
      const bounds = map.getBounds();
      if (bounds) autocomplete.locationBias = bounds;
    });

    autocomplete.addEventListener(
      'keydown',
      (event: Event) => {
        const ke = event as KeyboardEvent;
        if (ke.key !== 'Enter') return;

        const coords = parseCoordinates(textEnteredInto(autocomplete, event));
        if (!coords) return;

        ke.preventDefault();
        ke.stopPropagation();

        const selected = this.#selectedMarker;
        if (selected) {
          void this.#moveMarker(selected.key, coords);
          return;
        }

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
      const placed = {
        ...composeAddress(place.addressComponents),
        coordinates,
        full_address: place.formattedAddress ?? undefined,
        friendlyName: place.displayName ?? undefined,
      };

      const selected = this.#selectedMarker;
      if (selected) {
        this._markers = updateMarker(this._markers, selected.key, {
          ...placed,
          // A name the editor typed is theirs; only an unnamed pin takes the
          // place's own name.
          friendlyName: selected.friendlyName || placed.friendlyName,
        });
        this.#showInSearchBox(placed.full_address ?? '');
      } else {
        if (!canAddMarker(this._markers, this._max)) return;
        this._markers = addMarker(this._markers, placed, this._max);
        autocomplete.value = '';
      }

      this._center = coordinates;
      this.#commit();
      await this.#refreshMarkerElements();
      this.#mapSurface?.setCenter(coordinates);
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

  #countLabel() {
    if (this._max) return `${this._markers.length} of ${this._max}`;
    return `${this._markers.length} marker${this._markers.length === 1 ? '' : 's'}`;
  }

  #chipLabel(marker: Marker) {
    return (
      marker.friendlyName || marker.full_address || formatCoordinates(marker.coordinates) || 'Marker'
    );
  }

  #renderSelectionBanner() {
    const selected = this.#selectedMarker;
    if (!selected) return nothing;

    const position = this._markers.indexOf(selected) + 1;

    return html`
      <div class='editing' role='status'>
        <span>
          Editing pin ${position} · ${this.#chipLabel(selected)} — search to move it
        </span>
        <button type='button' class='done' @click=${() => this.clearSelection()}>Done ✕</button>
      </div>
    `;
  }

  override render() {
    const atMax = !canAddMarker(this._markers, this._max);

    return html`
      <div class='search'>
        <div id='place-autocomplete-container'></div>
        ${this.#renderSelectionBanner()}
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
        ${this._markers.map((marker, index) => {
          const selected = this._selectedKey === marker.key;
          const pin = pinSpecFor(marker, index, selected);
          const label = this.#chipLabel(marker);
          return html`
            <div class='chip ${selected ? 'selected' : ''}' data-key=${marker.key}>
              <span class='grip' title='Drag to reorder'>⠿</span>
              <span
                class='index'
                aria-hidden='true'
                style='background:${pin.background};color:${pin.glyphColor};border-color:${pin.borderColor}'
                >${pin.glyph}</span
              >
              <button
                type='button'
                class='chip-label'
                aria-pressed=${selected}
                title='Select to move with the search box'
                @click=${() => this.selectMarker(marker.key)}>
                ${label}
              </button>
              <button
                type='button'
                class='chip-edit'
                aria-label='Edit marker ${pin.glyph}, ${label}'
                title='Edit details'
                @click=${() => this.openDrawer(marker.key)}>✎</button>
              <button
                type='button'
                class='chip-remove'
                aria-label='Remove marker ${pin.glyph}, ${label}'
                @click=${() => this.removeMarker(marker.key)}>✕</button>
            </div>
          `;
        })}
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
      .chip.selected {
        border-color: var(--uui-color-selected, #006eff);
        box-shadow: 0 0 0 1px var(--uui-color-selected, #006eff);
      }
      .chip.add { border-style: dashed; cursor: pointer; }
      .chip.add[disabled] { opacity: .5; cursor: not-allowed; }
      .grip { cursor: grab; color: var(--uui-color-text-alt, #999); }
      /* Matches the pin: same number, same colour, so chip and map read as one. */
      .index {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 1.35em; height: 1.35em; padding: 0 .25em;
        border: 1px solid; border-radius: 20px;
        font-size: .8em; font-weight: 700; line-height: 1;
      }
      .editing {
        display: flex; align-items: center; justify-content: space-between; gap: 1em;
        padding: .5em .75em; font-size: .9em; border-radius: 3px;
        background: var(--uui-color-surface-alt, #f3f3f5);
        border-left: 3px solid var(--uui-color-selected, #006eff);
      }
      .done { background: none; border: none; cursor: pointer; font: inherit; color: inherit; }
      .chip-label, .chip-edit, .chip-remove {
        background: none; border: none; padding: 0; cursor: pointer;
        font: inherit; color: inherit;
      }
      .chip-edit, .chip-remove { color: var(--uui-color-text-alt, #999); }
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
