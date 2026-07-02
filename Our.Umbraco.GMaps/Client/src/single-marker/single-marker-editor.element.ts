/// <reference types='@types/google.maps' />
import { LitElement, html, customElement, property, css, state, nothing } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { Address, AddressBase, AddressComponents, DEFAULT_LOCATION, Location, Map, MapType, typedKeys } from '../types';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { GMapsSettingsContext } from '../contexts/gmaps-settings.context.js';

import { Loader } from '@googlemaps/js-api-loader'

@customElement('gmaps-single-marker')
export default class GmapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  #settingsContext?: GMapsSettingsContext;

  #clearValue = false
  #configHasLocation = false
  // The host delivers `value` and `config` as independent reactive properties
  // with no guaranteed order, and either may arrive after the first render. We
  // track that both have been received and defer map initialisation until then
  // (see #tryInitialize) so datatype config (api key, map type, zoom, default
  // location) is always applied.
  #valueReceived = false
  #configReceived = false
  #initialized = false
  #value: Map | undefined
  @property({ type: Object })
  public set value(val: Map | undefined) {
    this.#valueReceived = true
    if (val === undefined) {
      this.#clearValue = true
      if (this.marker) {
        this.marker.position = { lat: this._defaultLocation.lat, lng: this._defaultLocation.lng ?? 0 }
        if (this.#map) {
          this.#map.setCenter(this.marker.position);
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
  private _error?: string;

  marker?: google.maps.marker.AdvancedMarkerElement;

  #map?: google.maps.Map;

  #geocoder?: google.maps.Geocoder;

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

  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {
    this.#configReceived = true;
    this._apiKey = config?.getValueByAlias<string>('apikey');
    this._mapType = config?.getValueByAlias<MapType>('maptype') || 'roadmap';
    this._hideMap = config?.getValueByAlias<boolean>('hideMap') || false;
    this._enableFriendlyName = config?.getValueByAlias<boolean>('enableFriendlyName') || false;
    this._zoomLevel = config?.getValueByAlias<number>('zoom') || 17;

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
    if (this.value?.address) {
      const { coordinates, ...rest } = this.value.address;
      this._address ??= rest;
      this._location ??= coordinates;
      this._friendlyName ??= this.value.address.friendlyName;
    }

    // TODO: Check the apiKey is provided - if not, display an error instead of the map.
    const loader = new Loader({
      apiKey: this._apiKey!,
      version: 'weekly',
    })

    if (!this.value) {
      return;
    }

    const { Map } = await loader.importLibrary('maps');
    const { AdvancedMarkerElement } = await loader.importLibrary('marker');
    await loader.importLibrary('places');
    const { Geocoder } = await loader.importLibrary('geocoding');
    this.#geocoder = new Geocoder();
    const map = new Map(this.shadowRoot?.getElementById('map') as HTMLElement, {
      center: {
        lat: this.value?.mapconfig.centerCoordinates?.lat ?? this.value?.address.coordinates?.lat ?? 0,
        lng: this.value?.mapconfig.centerCoordinates?.lng ?? this.value?.address.coordinates?.lng ?? 0
      },
      zoom: this.getAsNumber(this.value.mapconfig.zoom) ?? this._zoomLevel,
      mapTypeId: this._mapType.toString().toLowerCase(),
      mapId: '4504f8b37365c3d0',
    });

    this.marker = new AdvancedMarkerElement({
      map,
      position: { lat: this.value?.address.coordinates?.lat ?? 0, lng: this.value?.address.coordinates?.lng ?? 0 },
      gmpDraggable: true
    });

    this.marker.addListener('dragend', this.dragend.bind(this));

    map.addListener('zoom_changed', () => {
      let zoomLevel = map.getZoom();
      console.log('zoom', zoomLevel);
      if (zoomLevel) {
        this._zoomLevel = zoomLevel;
        this.setValue();
      }
    });

    map.addListener('center_changed', () => {
      let center = map.getCenter();
      console.log('center', center);
      if (center) {
        this._center = {
          lat: center.lat(),
          lng: center.lng()
        };
        this.setValue();
      }
    });

    const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({});
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
    });
    this.#map = map;
    this._loading = false;
  }

  // Places the marker at raw coordinates typed into the search box and, best
  // effort, reverse geocodes them so the saved value carries a readable address
  // (mirroring the place-selection path). Coordinates remain authoritative even
  // if the geocode fails or returns nothing.
  async #applyCoordinateSearch(coords: Location, map: google.maps.Map) {
    this._location = coords;
    this._center = coords;
    if (this.marker) {
      this.marker.position = coords;
    }
    map.setCenter(coords);
    map.setZoom(this._zoomLevel ?? 17);

    let address: Address = { coordinates: coords };
    if (this.#geocoder) {
      try {
        const { results } = await this.#geocoder.geocode({ location: coords });
        const result = results?.[0];
        if (result) {
          // Geocoder address components use long_name/short_name; adapt them to
          // the Places AddressComponent shape getAddressObject consumes.
          const composed = this.getAddressObject(
            result.address_components?.map((c) => ({
              longText: c.long_name,
              shortText: c.short_name,
              types: c.types,
            })) as google.maps.places.AddressComponent[]
          );
          address = { ...composed, full_address: result.formatted_address, coordinates: coords };
        }
      } catch {
        // Reverse geocoding is best effort; keep the coordinate-only address.
      }
    }

    this._address = address;
    this._autoCompleteSearchValue = address.full_address ?? this.formatCoordinates(coords);
    this.setValue();
  }

  #onFriendlyNameInput(e: Event) {
    const target = e.target as HTMLInputElement | null;
    this._friendlyName = target?.value ?? '';
    this.setValue();
  }

  dragend() {
    console.log('marker', this.marker?.position);
    this._location = {
      lat: this.getAsNumber(this.marker?.position?.lat) ?? 0,
      lng: this.getAsNumber(this.marker?.position?.lng) ?? 0
    }
    this.setValue();
  }

  getAsNumber(value: string | number | (() => number) | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'function') {
      return value();
    }

    return parseFloat(value.trim());
  }

  parseCoordinates(latLng: string | undefined, fallbackToDefault = true) {
    if (latLng) {
      const lat_lng = latLng.split(',')
      if (lat_lng.length === 2) {
        const latVal = this.getAsNumber(lat_lng[0])
        const lngVal = this.getAsNumber(lat_lng[1])
        // Only treat the input as coordinates when both parts are valid numbers
        // in range; otherwise text like "Paris, France" would parse to NaN and
        // still be accepted as a (broken) location.
        if (
          latVal !== undefined && lngVal !== undefined &&
          !Number.isNaN(latVal) && !Number.isNaN(lngVal) &&
          latVal >= -90 && latVal <= 90 &&
          lngVal >= -180 && lngVal <= 180
        ) {
          return { lat: latVal, lng: lngVal }
        }
      }
    }
    if (fallbackToDefault) {
      return this._defaultLocation;
    }
    return undefined;
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

  getAddressObject(address_components: google.maps.places.AddressComponent[] | null | undefined): Address | undefined {
    if (!address_components) {
      return undefined;
    }

    var ShouldBeComponent: AddressComponents = {
      // street_number indicates the precise street number.
      streetNumber: [
        'street_number'
      ],
      street: [
        // street_address indicates a precise street address.
        'street_address',
        // route indicates a named route (such as 'US 101').
        'route'
      ],
      state: [
        // administrative_area_level_1 indicates a first-order civil entity below the country level. Within the United States, these administrative levels are states.
        // Not all nations exhibit these administrative levels.In most cases, administrative_area_level_1 short names will closely match ISO 3166-2 subdivisions and other widely circulated lists however this is not guaranteed as our geocoding results are based on a variety of signals and location data.
        'administrative_area_level_1',
        // administrative_area_level_2 indicates a second-order civil entity below the country level. Within the United States, these administrative levels are counties. Not all nations exhibit these administrative levels.
        'administrative_area_level_2',
        // administrative_area_level_3 indicates a third-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
        'administrative_area_level_3',
        // administrative_area_level_4 indicates a fourth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
        'administrative_area_level_4',
        // administrative_area_level_5 indicates a fifth-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
        'administrative_area_level_5'
      ],
      city: [
        // Used when postal area is not the same as the other localities. Must be used for proper addresses.
        'postal_town',
        // locality indicates an incorporated city or town political entity.
        'locality',
        // sublocality indicates a first-order civil entity below a locality. For some locations may receive one of the additional types: sublocality_level_1 to sublocality_level_5.
        // Each sublocality level is a civil entity. Larger numbers indicate a smaller geographic area.
        'sublocality',
        'sublocality_level_1',
        'sublocality_level_2',
        'sublocality_level_3',
        'sublocality_level_4',
        'sublocality_level_5'
      ],
      postalcode: ['postal_code'],
      country: ['country']
    }

    var address: AddressBase = {
      full_address: '',
      streetNumber: '',
      street: '',
      postalcode: '',
      state: '',
      city: '',
      country: ''
    }

    address_components.forEach(component => {
      for (const shouldBe of typedKeys(ShouldBeComponent)) {
        if (ShouldBeComponent[shouldBe]?.indexOf(component.types[0]) !== -1) {
          address[shouldBe] = component.longText ?? ''
        }
      }
    })
    return address
  }

  formatCoordinates(coordinates: Location) {
    if (coordinates) {
      return `${coordinates.lat},${coordinates.lng}`
    }
  }

  setValue() {
    if (this.#clearValue) return;

    this.value = {
      address: {
        ...this._address,
        // Must stay after the spread: `_address` can carry a stale friendlyName
        // copy (from the destructure in #initialize), and the live state wins.
        friendlyName: this._friendlyName,
        coordinates: {
          lat: this._location?.lat ?? this._defaultLocation?.lat,
          lng: this._location?.lng ?? this._defaultLocation?.lng
        }
      },
      mapconfig: {
        zoom: this._zoomLevel,
        maptype: this._mapType,
        centerCoordinates: this._center ?? DEFAULT_LOCATION
      }
    }

    this.dispatchEvent(new UmbChangeEvent());
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
            </div>

            ${this._loading ? html`
              <uui-loader style='color: color: #006eff'></uui-loader>
            ` : nothing}

            <div id='map' style="${this._hideMap ? 'display:none;' : ''}"></div>

            ${this._error ? html`
              <div class='error'>${this._error}</div>
            ` : nothing}

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
      #map{
        height: 500px;
        width: 100%;
        margin-top: 1em;
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