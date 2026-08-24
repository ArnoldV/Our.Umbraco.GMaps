/// <reference types='@types/google.maps' />
import { LitElement, html, customElement, property, css, state, nothing } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { Address, DEFAULT_LOCATION, Location, Map, MapType, PropertyMappingValue } from '../types';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { GMapsSettingsContext } from '../contexts/gmaps-settings.context.js';
import { GMapsPropertyMappingController } from './property-mapping/property-mapping.controller.js';
import type { GMapsInboundLookupRequest } from './property-mapping/property-mapping.controller.js';
import { onGoogleMapsAuthFailure } from '../google-maps-auth.js';
import { formatCoordinates, parseCoordinates, toNumber } from '../core/coordinates.js';
import { composeAddress } from '../core/address.js';
import { buildSingleMapValue } from '../core/value.js';
import { readSingleMapValue } from '../core/value.js';
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { GeocodingController } from '../controllers/geocoding.controller.js';
import type { EditorNotice } from '../core/geocode-status.js';


const AUTH_FAILURE_MESSAGE =
  'Google Maps rejected this API key. Check that the key is valid, that billing is enabled, and that the site is allowed by the key\'s HTTP referrer restrictions.';

@customElement('gmaps-single-marker')
export default class GmapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  #settingsContext?: GMapsSettingsContext;
  #propertyMapping: GMapsPropertyMappingController;

  // An inbound lookup can be requested before the map exists (config and value
  // arrive independently of initialisation); hold it and replay after #initialize.
  #pendingInboundLookup?: GMapsInboundLookupRequest;

  #clearValue = false
  #configHasLocation = false
  // The host delivers `value` and `config` as independent reactive properties
  // with no guaranteed order, and either may arrive after the first render. We
  // track that both have been received and defer map initialisation until then
  // (see #tryInitialize) so datatype config (api key, map type, zoom, default
  // location) is always applied.
  #initialValue?: Map
  #valueReceived = false
  #configReceived = false
  #initialized = false
  #value: Map | undefined
  @property({ type: Object })
  public set value(val: Map | undefined) {
    this.#valueReceived = true
    if (!this.#initialValue && val) {
      this.#initialValue = structuredClone(val);
    }
    if (val === undefined) {
      this.#initialValue = undefined;
      this.#clearValue = true
      // Clearing the value must also drop every piece of derived search state.
      // All of it feeds back into setValue(), so anything left behind is written
      // straight into the fresh value by the next map interaction, and the
      // friendly name input keeps rendering the old name until it is reset.
      this._friendlyName = undefined;
      this._address = undefined;
      this._location = undefined;
      this._autoCompleteSearchValue = undefined;
      // The <gmp-place-autocomplete> owns its own text and nothing in this
      // element binds to it, so it has to be cleared directly.
      if (this.#placeAutocomplete) {
        this.#placeAutocomplete.value = '';
      }
      if (this.marker) {
        this.marker.position = { lat: this._defaultLocation.lat, lng: this._defaultLocation.lng ?? 0 }
        if (this.#map) {
          this.#map.setCenter(this.marker.position);
          // Keep the tracked center in step with where the map was just moved:
          // the center_changed handler calls setValue(), which no-ops while
          // #clearValue is set, so it won't update _center itself.
          this._center = { ...this._defaultLocation };
        }
      }
      this.#clearValue = false
    }
    this.#value = val
  }
  public get value(): Map | undefined {
    return this.#value
  }

  @state()
  private _loading: boolean = true;

  @state()
  private _notice?: EditorNotice;

  #disposeAuthFailureListener?: () => void;
  #authFailed = false;

  marker?: google.maps.marker.AdvancedMarkerElement;

  #map?: google.maps.Map;

  #placeAutocomplete?: google.maps.places.PlaceAutocompleteElement;

  // Declaration order matters: the controllers read #api during initialisation.
  #api: GoogleMapsApi = new GoogleMapsApiImpl();
  #mapSurface = new MapSurfaceController(this.#api);
  #geocoding = new GeocodingController(this.#api);

  #ctrlHintTimeout?: number;

  @state()
  private _apiKey?: string;

  private _mapType: MapType = 'roadmap';

  private _hideMap: boolean = false;

  @state()
  private _zoomLevel: number = 17;

  @state()
  private _address?: Address;

  @state()
  private _friendlyName?: string;

  private _enableFriendlyName: boolean = false;

  @state()
  private _location?: Location;

  @state()
  private _center?: Location;

  private _defaultLocation: Location = DEFAULT_LOCATION;

  private _autoCompleteSearchValue?: string;

  // Bumped whenever the mapping controller reports a change (warnings, or a
  // mapped source value) so the lookup button and warnings re-render.
  @state()
  private _mappingRevision = 0;

  @state()
  private _lookupPending = false;

  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {
    this.#configReceived = true;
    this._apiKey = config?.getValueByAlias<string>('apikey');
    this._mapType = config?.getValueByAlias<MapType>('maptype') || 'roadmap';
    this._hideMap = config?.getValueByAlias<boolean>('hideMap') || false;
    this._enableFriendlyName = config?.getValueByAlias<boolean>('enableFriendlyName') || false;
    this._zoomLevel = config?.getValueByAlias<number>('zoom') || 17;
    this.#propertyMapping.setConfig(config?.getValueByAlias<PropertyMappingValue>('propertyMapping'));

    // A default location configured on the datatype takes priority. When it is
    // absent (or empty), #initialize() falls back to the appsettings value
    // (GoogleMaps/DefaultLocation) and finally to DEFAULT_LOCATION. Seeding the
    // value is deferred to #initialize() too, so the resolved appsettings
    // default can be reflected in a brand new value.
    const location = config?.getValueByAlias<string>('location');
    const configLocation = this.parseCoordinates(location?.toString(), false);
    if (configLocation) {
      this.#configHasLocation = true;
      this._defaultLocation = configLocation;
      this._center = configLocation;
    }
  }

  constructor() {
    super();
    this.#settingsContext = new GMapsSettingsContext(this);
    this.#propertyMapping = new GMapsPropertyMappingController(this, {
      onInboundLookup: (request) => this.#applyInboundLookup(request),
      onChange: () => { this._mappingRevision++; },
    });
    // An invalid key never surfaces as a rejected promise; gm_authFailure is the
    // only hook the Maps JS API offers, and it must be installed before it loads.
    this.#disposeAuthFailureListener = onGoogleMapsAuthFailure(() => {
      this.#authFailed = true;
      this._notice = { severity: 'error', message: AUTH_FAILURE_MESSAGE };
      this._loading = false;
    });
  }

  // A rejected API key outranks everything else and stays put: the map is broken
  // until it is fixed, so a geocode that happens to succeed must not clear it.
  #setNotice(notice: EditorNotice | undefined) {
    if (this.#authFailed) return;
    this._notice = notice;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#disposeAuthFailureListener?.();
    this.#disposeAuthFailureListener = undefined;
    this.#mapSurface.destroy();
    globalThis.clearTimeout(this.#ctrlHintTimeout);
  }

  protected override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    // Attempt initialisation on every update cycle; #tryInitialize is idempotent
    // and only proceeds once the host has delivered both value and config and
    // the shadow DOM (the #map container) has rendered.
    void this.#tryInitialize();
  }

  async #tryInitialize() {
    if (this.#initialized) return;
    // Both properties are pushed independently by the host; wait for both so the
    // datatype config is always applied regardless of arrival order.
    if (!this.#valueReceived || !this.#configReceived) return;
    // updated() only runs after a render, so the #map container exists by now.
    this.#initialized = true;
    await this.#initialize();
  }

  async #initialize() {
    if (this.#settingsContext) {
      const serverConfig = await this.#settingsContext.getSettings();
      if (serverConfig) {
        if ((!this._apiKey || this._apiKey === '') && serverConfig.apiKey) {
          this._apiKey = serverConfig.apiKey;
        }
        this._zoomLevel ??= serverConfig.zoomLevel ?? 17;
        // When the datatype config didn't supply a default location, fall back
        // to the appsettings value (GoogleMaps/DefaultLocation).
        if (!this.#configHasLocation) {
          const serverDefaultLocation = this.parseCoordinates(serverConfig.defaultLocation ?? undefined, false);
          if (serverDefaultLocation) {
            this._defaultLocation = serverDefaultLocation;
            this._center = serverDefaultLocation;
          }
        }
      }
    }

    // Ensure a center is available for rendering and value seeding.
    this._center ??= this._defaultLocation;

    // Seed the value from the resolved default location when the content has
    // none yet (e.g. a brand new node without a value preset). Deferred to here
    // rather than the config setter so the appsettings default resolved above
    // is reflected in the seeded value.
    if (!this.#clearValue && !this.value) {
      this.value = {
        address: {
          coordinates: this._defaultLocation
        },
        mapconfig: {
          zoom: this._zoomLevel,
          maptype: this._mapType,
          centerCoordinates: this._center
        }
      };
    }

    // Seed _address and _location from the stored value so that any map
    // interaction (drag, zoom, pan) that triggers setValue() before the user
    // searches a new address preserves the existing address components.
    // Without this, _address is undefined on load and spreading it in
    // setValue() silently replaces the full address object with only { coordinates }.
    const stored = readSingleMapValue(this.value);
    this._address ??= stored.address;
    this._location ??= stored.location;
    this._friendlyName ??= stored.friendlyName;

    // TODO: Check the apiKey is provided - if not, display an error instead of the map.
    this.#api.configure(this._apiKey!);

    if (!this.value) {
      return;
    }

    const map = await this.#mapSurface.create(
      this.shadowRoot?.getElementById('map') as HTMLElement,
      {
        center: {
          lat: this.value?.mapconfig.centerCoordinates?.lat ?? this.value?.address.coordinates?.lat ?? 0,
          lng: this.value?.mapconfig.centerCoordinates?.lng ?? this.value?.address.coordinates?.lng ?? 0
        },
        zoom: this.getAsNumber(this.value.mapconfig.zoom) ?? this._zoomLevel,
        maptype: this._mapType,
        onCenterChanged: (center) => {
          this._center = center;
          this.setValue();
        },
        onZoomChanged: (zoom) => {
          this._zoomLevel = zoom;
          this.setValue();
        },
        onCtrlHintNeeded: () => this.#showCtrlHint(),
      },
    );

    this.marker = await this.#api.createMarker({
      map,
      position: { lat: this.value?.address.coordinates?.lat ?? 0, lng: this.value?.address.coordinates?.lng ?? 0 },
      gmpDraggable: true
    });

    this.marker.addListener('dragend', this.dragend.bind(this));

    const placeAutocomplete = await this.#api.createAutocomplete();
    this.#placeAutocomplete = placeAutocomplete;
    this.shadowRoot?.getElementById('place-autocomplete-container')?.appendChild(placeAutocomplete);

    map.addListener('idle', () => {
      const bounds = map.getBounds();
      if (bounds) {
        placeAutocomplete.locationBias = bounds;
      }
    });

    // Read the current search text. The <gmp-place-autocomplete> exposes a
    // `.value` property; we also fall back to the real <input> in the event's
    // composed path since either can lead depending on timing.
    const currentSearchText = (e?: Event): string | undefined => {
      const fromInput = e?.composedPath().find(
        (el): el is HTMLInputElement => el instanceof HTMLInputElement
      )?.value;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fromInput || (placeAutocomplete as any).value || this._autoCompleteSearchValue;
    };

    placeAutocomplete.addEventListener('input', (e: Event) => {
      const input = e.composedPath().find(
        (el): el is HTMLInputElement => el instanceof HTMLInputElement
      );
      if (input) {
        this._autoCompleteSearchValue = input.value;
      }
    });

    // Handle Enter in the CAPTURE phase: it fires as the event descends
    // host -> shadow input, BEFORE the component's internal handler runs, so we
    // intercept coordinate entry even if the component stops propagation of the
    // bubbling keydown (which is why the earlier bubble-phase handler did
    // nothing). We only swallow the event when the text parses as coordinates,
    // leaving normal prediction selection untouched.
    placeAutocomplete.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== 'Enter') return;
      const coords = this.parseCoordinates(currentSearchText(e), false);
      if (!coords) return;
      ke.preventDefault();
      ke.stopPropagation();
      void this.#applyCoordinateSearch(coords, map);
    }, { capture: true });

    placeAutocomplete.addEventListener('gmp-select', async (event) => {
      const { placePrediction } = event;
      if (!placePrediction) return;

      this.#setNotice(undefined);

      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'location', 'viewport', 'types']
      });

      if (!place.location) return;

      if (this._enableFriendlyName && place.displayName) {
        this._friendlyName = place.displayName;
      }

      if (place.viewport) {
        map.fitBounds(place.viewport);
      } else {
        map.setCenter(place.location);
        map.setZoom(this._zoomLevel ?? 17);
      }

      if (this.marker) {
        this.marker.position = place.location;
        this.updateMarkerAddress(place, place.location);
      }
      this._location = {
        lat: place.location.lat(),
        lng: place.location.lng()
      };
      this.setValue();
      this.#syncMappedProperties();
    });
    this.#map = map;
    this._loading = false;

    const pending = this.#pendingInboundLookup;
    if (pending) {
      this.#pendingInboundLookup = undefined;
      await this.#applyInboundLookup(pending);
    }
  }

  // Property mapping, inbound: the mapped properties describe a location and the
  // pin follows. Deliberately does NOT write back out - data flowing in must not
  // immediately flow out again, even in 'both' mode.
  async #applyInboundLookup(request: GMapsInboundLookupRequest) {
    if (!this.#map) {
      this.#pendingInboundLookup = request;
      return;
    }

    // Coordinates held in properties are authoritative and need no geocoding.
    if (request.coordinates) {
      await this.#applyCoordinateSearch(request.coordinates, this.#map, false);
      return;
    }

    if (!request.query) return;

    this._lookupPending = true;
    const { result, notice } = await this.#geocoding.forward(request.query);
    this._lookupPending = false;

    // The controller reports why - whether that is "no such address" or an API
    // key that cannot use the Geocoding API.
    this.#setNotice(notice);
    if (!result) return;

    this._address = result.address;
    this._location = result.location;
    this._center = result.location;
    this._autoCompleteSearchValue = result.address.full_address ?? this.formatCoordinates(result.location);
    if (this.marker) {
      this.marker.position = result.location;
    }
    if (this.#placeAutocomplete) {
      this.#placeAutocomplete.value = this._autoCompleteSearchValue ?? '';
    }
    this.#map.setCenter(result.location);
    this.#map.setZoom(this._zoomLevel ?? 17);
    this.setValue();
  }

  // Property mapping, outbound: push the resolved address into mapped properties.
  // Only called from the paths that actually change the address.
  #syncMappedProperties() {
    this.#propertyMapping.writeBack(this.value?.address);
  }

  resetView() {
    if (!this.#map) return;

    const savedPinCoordinates = this.#initialValue?.address?.coordinates;
    const targetCenter =
      this.#initialValue?.mapconfig?.centerCoordinates ??
      savedPinCoordinates ??
      this._defaultLocation;

    const targetZoom =
      this.getAsNumber(this.#initialValue?.mapconfig?.zoom) ??
      this._zoomLevel ??
      17;

    // Restore saved address, friendly name, location, and search input text
    if (this.#initialValue?.address) {
      const { coordinates, ...rest } = this.#initialValue.address;
      this._address = structuredClone(rest);
      this._location = coordinates ? { ...coordinates } : undefined;
      this._friendlyName = this.#initialValue.address.friendlyName;
      if (this.#initialValue.address.full_address) {
        this._autoCompleteSearchValue = this.#initialValue.address.full_address;
      } else if (coordinates) {
        this._autoCompleteSearchValue = this.formatCoordinates(coordinates);
      }
    } else {
      this._address = undefined;
      this._location = undefined;
      this._friendlyName = undefined;
      this._autoCompleteSearchValue = undefined;
    }

    // Reset marker position to saved pin coordinates (or default location)
    if (this.marker) {
      const markerLat = this.getAsNumber(savedPinCoordinates?.lat ?? this._defaultLocation.lat) ?? 0;
      const markerLng = this.getAsNumber(savedPinCoordinates?.lng ?? this._defaultLocation.lng) ?? 0;
      this.marker.position = { lat: markerLat, lng: markerLng };
    }

    // Reset map view center to original center coordinates
    if (targetCenter) {
      const lat = this.getAsNumber(targetCenter.lat);
      const lng = this.getAsNumber(targetCenter.lng);
      if (lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        this.#map.setCenter({ lat, lng });
      }
    }

    // Reset map view zoom
    if (targetZoom !== undefined && !Number.isNaN(targetZoom)) {
      this.#map.setZoom(targetZoom);
    }

    // Sync state and notify Umbraco
    const centerLat = this.getAsNumber(targetCenter?.lat ?? this._defaultLocation.lat);
    const centerLng = this.getAsNumber(targetCenter?.lng ?? this._defaultLocation.lng);
    if (centerLat !== undefined && centerLng !== undefined) {
      this._center = { lat: centerLat, lng: centerLng };
    }
    this._zoomLevel = targetZoom;
    this.setValue();
    this.#syncMappedProperties();
  }



  // Places the marker at raw coordinates typed into the search box and, best
  // effort, reverse geocodes them so the saved value carries a readable address
  // (mirroring the place-selection path). Coordinates remain authoritative even
  // if the geocode fails or returns nothing.
  async #applyCoordinateSearch(coords: Location, map: google.maps.Map, syncOutbound = true) {
    this._location = coords;
    this._center = coords;
    if (this.marker) {
      this.marker.position = coords;
    }
    map.setCenter(coords);
    map.setZoom(this._zoomLevel ?? 17);

    // Reverse geocoding is best effort - the coordinates stand either way - but
    // a failure is still reported, since silently dropping the address is how an
    // unauthorised key looks like "this place just has no address".
    const { result, notice } = await this.#geocoding.reverse(coords);
    this.#setNotice(notice);
    const address: Address = result?.address ?? { coordinates: coords };

    this._address = address;
    this._autoCompleteSearchValue = address.full_address ?? this.formatCoordinates(coords);
    this.setValue();
    if (syncOutbound) this.#syncMappedProperties();
  }

  #onFriendlyNameInput(e: Event) {
    const target = e.target as HTMLInputElement | null;
    this._friendlyName = target?.value ?? '';
    this.setValue();
    this.#syncMappedProperties();
  }

  dragend() {
    // console.log('marker', this.marker?.position);
    this._location = {
      lat: this.getAsNumber(this.marker?.position?.lat) ?? 0,
      lng: this.getAsNumber(this.marker?.position?.lng) ?? 0
    }
    this.setValue();
    this.#syncMappedProperties();
  }

  getAsNumber(value: string | number | (() => number) | undefined): number | undefined {
    return toNumber(value);
  }

  parseCoordinates(latLng: string | undefined, fallbackToDefault = true) {
    const parsed = parseCoordinates(latLng);
    if (parsed) return parsed;
    return fallbackToDefault ? this._defaultLocation : undefined;
  }

  updateMarkerAddress(place: google.maps.places.Place | undefined, coordinates: google.maps.LatLng | undefined) {
    if (coordinates === undefined) {
      return;
    }

    this._address = {};
    if (place !== undefined && (!place.types || place.types.indexOf('plus_code') < 0)) {
      const composedAddress = this.getAddressObject(place.addressComponents)
      this._address = { ...composedAddress, ...{ full_address: place.formattedAddress ?? undefined } }
    }

    const lat = this.getAsNumber(coordinates.lat)!
    const lng = this.getAsNumber(coordinates.lng)!
    this._address.coordinates = { lat, lng }

    if (this._address.full_address) {
      this._autoCompleteSearchValue = this._address.full_address
    } else {
      this._autoCompleteSearchValue = this.formatCoordinates(this._address.coordinates)
    }

    this.setValue()
  }

  getAddressObject(
    address_components: google.maps.places.AddressComponent[] | null | undefined,
  ): Address | undefined {
    return composeAddress(address_components);
  }

  formatCoordinates(coordinates: Location) {
    return formatCoordinates(coordinates);
  }

  /** The controller decides *when* the hint is needed; the element owns how it looks. */
  #showCtrlHint() {
    const overlay = this.shadowRoot?.getElementById('ctrlScrollOverlay');
    if (!overlay) return;

    overlay.classList.add('visible');
    globalThis.clearTimeout(this.#ctrlHintTimeout);
    this.#ctrlHintTimeout = globalThis.setTimeout(() => {
      overlay.classList.remove('visible');
    }, 2000);
  }

  setValue() {
    if (this.#clearValue) return;

    this.value = buildSingleMapValue({
      address: this._address,
      friendlyName: this._friendlyName,
      location: this._location,
      center: this._center,
      zoom: this._zoomLevel,
      maptype: this._mapType,
      defaultLocation: this._defaultLocation,
    });

    this.dispatchEvent(new UmbChangeEvent());
  }

  // The controller's state lives outside the element, so Lit has no way to know
  // it changed; bumping _mappingRevision from its onChange callback is what
  // schedules the re-render that keeps this markup current.
  #renderMappingTools() {
    const warnings = this.#propertyMapping.warnings;

    return html`
      ${this.#propertyMapping.inboundEnabled ? html`
        <div class='mapping-actions'>
          <uui-button
            label='Look up from address fields'
            look='secondary'
            ?disabled=${!this.#propertyMapping.canLookup || this._lookupPending}
            @click=${() => this.#propertyMapping.requestLookup()}>
            ${this._lookupPending ? 'Looking up...' : 'Look up from address fields'}
          </uui-button>
        </div>
      ` : nothing}

      ${warnings.length ? html`
        <div class='mapping-warnings'>
          ${warnings.map((warning) => html`<div>${warning}</div>`)}
        </div>
      ` : nothing}
    `;
  }

  // Configuration and quota problems are persistent and actionable, so the
  // notice sits above the map with the search controls rather than below it.
  #renderNotice() {
    if (!this._notice) return nothing;
    const isError = this._notice.severity === 'error';
    return html`
      <div class='notice ${this._notice.severity}' role=${isError ? 'alert' : 'status'}>
        <uui-icon name=${isError ? 'icon-alert' : 'icon-info'}></uui-icon>
        <span>${this._notice.message}</span>
      </div>
    `;
  }

  override render() {
    return html`
            <div class='search'>
                ${this.value?.address.full_address ? html`
                  <div class='saved-address'>
                    <svg class='pin-icon' width='14' height='14' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
                      <path d='M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z'/>
                    </svg>
                    <span>${this.value.address.full_address}</span>
                  </div>
                ` : nothing}
                ${this._enableFriendlyName ? html`
                  <div class='field'>
                    <uui-label for='friendlyName'>Friendly Name</uui-label>
                    <uui-input
                      id='friendlyName'
                      label='Location name'
                      placeholder='Location name'
                      .value=${this._friendlyName ?? ''}
                      @input=${(e: Event) => this.#onFriendlyNameInput(e)}>
                    </uui-input>
                  </div>
                ` : nothing}
                <div id='place-autocomplete-container'></div>

                ${this.#renderMappingTools()}

                ${this.#renderNotice()}
            </div>

            ${this._loading ? html`
              <uui-loader style='color: color: #006eff'></uui-loader>
            ` : nothing}

            <div class='map-container' style="${this._hideMap ? 'display:none;' : ''}">
                <div id='map'></div>
                <div class='ctrl-scroll-overlay' id='ctrlScrollOverlay'>Use ctrl + drag to pan the map</div>
            </div>

            <div class='coordinates' style="${this._hideMap ? 'display:none;' : ''}">
                <div>Pin: ${this.value?.address.coordinates?.lat},${this.value?.address.coordinates?.lng}</div>
                <div>Zoom: ${this.value?.mapconfig.zoom}</div>
                <div>Center: ${this._center?.lat},${this._center?.lng}</div>
            </div>
        `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      .map-container {
        position: relative;
        width: 100%;
        margin-top: 1em;
      }

      #map {
        height: 500px;
        width: 100%;
      }

      .ctrl-scroll-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.55);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: Roboto, Arial, sans-serif;
        font-size: 1.4rem;
        font-weight: 500;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        z-index: 1000;
        pointer-events: none;
        visibility: hidden;
        opacity: 0;
        transition: visibility 0.3s, opacity 0.3s ease-in-out;
      }

      .ctrl-scroll-overlay.visible {
        visibility: visible;
        opacity: 1;
      }

      .coordinates{
        display: flex;
        justify-content: space-between;
        margin-top: .5em;
        font-size: .9em;
        opacity: .8;
      }

      .search {
        display: flex;
        flex-direction: column;
        gap: .75em;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .field uui-input {
        width: 100%;
      }

      .mapping-actions {
        display: flex;
        gap: .5em;
      }

      .mapping-warnings {
        font-size: .9em;
        color: var(--uui-color-warning-emphasis, #d29c00);
      }

      .notice {
        display: flex;
        align-items: flex-start;
        gap: .5em;
        padding: .6em .75em;
        font-size: .9em;
        line-height: 1.4;
        border-radius: 3px;
        background: var(--uui-color-surface-alt, #f3f3f5);
        border-left: 3px solid var(--uui-color-border, #ccc);
      }

      .notice uui-icon {
        flex: 0 0 auto;
        margin-top: .1em;
      }

      .notice.error {
        border-left-color: var(--uui-color-danger, #d42054);
      }

      .notice.error uui-icon {
        color: var(--uui-color-danger, #d42054);
      }

      #place-autocomplete-container {
        width: 100%;
      }

      #place-autocomplete-container gmp-place-autocomplete {
        width: 100%;
        --gmp-mat-color-surface: var(--uui-color-surface, #fff);
        --gmp-mat-color-on-surface: var(--uui-color-text, #000);
        --gmp-mat-color-on-surface-variant: var(--uui-color-text-alt, #666);
        --gmp-mat-color-outline: var(--uui-color-border, #ccc);
        --gmp-mat-color-primary: var(--uui-color-selected, #006eff);
      }

      .saved-address {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: .9em;
        opacity: .8;
      }

      .pin-icon {
        flex: 0 0 auto;
        color: #d64545;
      }
      `,
  ];

}

declare global {
  interface HTMLElementTagNameMap {
    'gmaps-single-marker': GmapsPropertyEditorUiElement;
  }
}