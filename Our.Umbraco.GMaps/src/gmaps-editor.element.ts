/// <reference types="@types/google.maps" />
import { LitElement, html, customElement, property, css, state, nothing } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { Address, Location, Map, MapType } from './types';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';


@customElement('gmaps-property-editor-ui')
export default class GmapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  @property({ type: Object })
  public value: Map | undefined;

  @state()
  private _loading: boolean = true;

  @state()
  private _error?: string;

  marker?: google.maps.marker.AdvancedMarkerElement;


  @state()
  private _apiKey?: string;

  private _mapType?: MapType;

  @state()
  private _zoomLevel: number = 10;

  @state()
  private _address?: Address;

  @state()
  private _location?: Location;

  @state()
  private _center?: Location;

  private _autoCompleteSearchValue?: string;

  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {
    this._apiKey = config?.getValueByAlias<string>("apikey");
    this._mapType = config?.getValueByAlias<MapType>("maptype") || "roadmap";
    this._zoomLevel = config?.getValueByAlias<number>("zoom") || 17;

    const location = config?.getValueByAlias<number>("location")
    const lat = location?.toString().split(",")[0].trim();
    const lng = location?.toString().split(",")[1].trim();
    this._location = {
      lat: this.getAsNumber(lat) ?? 52.379189,
      lng: this.getAsNumber(lng) ?? 4.899431
    };
    this._center = {
      lat: this.getAsNumber(lat) ?? 52.379189,
      lng: this.getAsNumber(lng) ?? 4.899431
    };

    if (!this.value) {
      this.value = {
        address: {
          coordinates: this._location
        },
        mapconfig: {
          zoom: this._zoomLevel,
          maptype: this._mapType,
          centerCoordinates: this._center
        }
      }
    }
  }



  async firstUpdated() {

    await import("https://maps.googleapis.com/maps/api/js?key=" + this._apiKey + "&v=beta");

    if (!this.value) {
      return;
    }

    const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    const { Autocomplete } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
    const map = new Map(this.shadowRoot?.getElementById("map") as HTMLElement, {
      center: {
        lat: this.value?.mapconfig.centerCoordinates?.lat ?? this.value?.address.coordinates?.lat ?? 0,
        lng: this.value?.mapconfig.centerCoordinates?.lng ?? this.value?.address.coordinates?.lng ?? 0
      },
      zoom: this.getAsNumber(this.value.mapconfig.zoom) ?? 15,
      mapId: "4504f8b37365c3d0"
    });

    this.marker = new AdvancedMarkerElement({
      map,
      position: { lat: this.value?.address.coordinates?.lat ?? 0, lng: this.value?.address.coordinates?.lng ?? 0 },
      gmpDraggable: true
    });

    this.marker.addListener("dragend", this.dragend.bind(this));

    map.addListener("zoom_changed", () => {
      let zoomLevel = map.getZoom();
      console.log("zoom", zoomLevel);
      if (zoomLevel) {
        this._zoomLevel = zoomLevel;
        this.setValue();
      }
    });

    map.addListener("center_changed", () => {
      let center = map.getCenter();
      console.log("center", center);
      if (center) {
        this._center = {
          lat: center.lat(),
          lng: center.lng()
        };
        this.setValue();
      }
    });

    var autocomplete = new Autocomplete(this.shadowRoot?.getElementById("autocomplete") as HTMLInputElement)
    autocomplete.bindTo('bounds', map)

    autocomplete.setFields(['formatted_address', 'address_components', 'geometry', 'icon', 'name'])

    autocomplete.addListener('place_changed', () => {

      var place = autocomplete.getPlace()
      if (!place.geometry) {
        // User entered the name of a Place that was not suggested and pressed the Enter key, or the Place Details request failed.
        var coordTest = this.parseCoordinates(this._autoCompleteSearchValue)
        if (coordTest) {
          // $scope.address.coordinates = coordTest
          // // Set the map center as well.
          // $scope.mapCenter = coordTest
          // vm.marker.position = $scope.address.coordinates
          // vm.map.setCenter($scope.address.coordinates)
          // actResetCenter.isDisabled = true
        }
        else {
          //initMapMarker($scope.address.coordinates)
        }
        return
      }
      else {

        // If the place has a location, then show it on the map and show that area
        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport)
        } else if (place.geometry.location) {
          map.setCenter(place.geometry.location)
          map.setZoom(this._zoomLevel)
        }
        if (this.marker) {
          this.marker.position = place.geometry.location
          //updateMarkerAddress(place, this.marker?.position)
        }
        this._location = {
          lat: place.geometry.location?.lat() ?? 0,
          lng: place.geometry.location?.lng() ?? 0
        }
        this.setValue()
      }
    })
    this._loading = false;
  }

  dragend() {
    console.log("marker", this.marker?.position);
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

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "function") {
      return value();
    }

    return parseInt(value);
  }

  parseCoordinates(latLng: string | undefined) {
    if (latLng) {
      const lat_lng = latLng.split(',')
      if (lat_lng.length > 1) {
        const latVal = parseFloat(lat_lng[0])
        const lngVal = parseFloat(lat_lng[1])
        return { lat: latVal, lng: lngVal }
      }
    }
    // if (fallbackToDefault) {
    //   return $scope.defaultLocation
    // }
    return null
  }

  updateMarkerAddress(address: google.maps.places.PlaceResult, coordinates: google.maps.LatLng) {
    this._address = {}
    if (address !== null && (!address.types || address.types.indexOf('plus_code') < 0)) {
      const composedAddress = this.getAddressObject(address.address_components)
      this._address = { ...composedAddress, ...{ full_address: address.formatted_address } }
    }
    this._address.coordinates = { lat: coordinates.lat(), lng: coordinates.lng() }

    if (this._address.full_address) {
      this._autoCompleteSearchValue = this._address.full_address
    } else {
      this._autoCompleteSearchValue = this.formatCoordinates(this._address.coordinates)
    }

    this.setValue()
  }

  getAddressObject(address_components: google.maps.GeocoderAddressComponent[] | undefined): Address | undefined {
    if (!address_components) {
      return undefined;
    }

    //TODO: Better typing here
    var ShouldBeComponent: any = {
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
        "postal_town",
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

    var address: any = {
      full_address: '',
      streetNumber: '',
      street: '',
      postalcode: '',
      state: '',
      city: '',
      country: ''
    }

    address_components.forEach(component => {
      for (var shouldBe in ShouldBeComponent) {
        if (ShouldBeComponent[shouldBe].indexOf(component.types[0]) !== -1) {
          address[shouldBe] = component.long_name
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

  autocompleteInput(e: InputEvent) {
    if (e.target instanceof HTMLInputElement)
      this._autoCompleteSearchValue = e.target.value;
  }

  setValue() {
    console.log("setValue called");

    this.value = {
      address: {
        coordinates: {
          lat: this._location?.lat ?? 0,
          lng: this._location?.lng ?? 0
        }
      },
      mapconfig: {
        zoom: this._zoomLevel,
        maptype: this._mapType,
        centerCoordinates: {
          lat: this._center?.lat ?? 0,
          lng: this._center?.lng ?? 0
        }
      }
    }

    this.dispatchEvent(new UmbChangeEvent());
  }

  override render() {
    return html`
            <div class="search">
                <input id="autocomplete" placeholder="Type name, address or geolocation" />

               
            </div>


            ${this._loading ? html`
              <uui-loader style="color: color: #006eff"></uui-loader>
            ` : nothing}

            <div id="map"></div>

            ${this._error ? html`
              <div class="error">${this._error}</div>
            ` : nothing}

            <!-- <pre>
              ${JSON.stringify(this.value, null, 2)}
            </pre> -->

            <div class="coordinates">
                    <div>Pin: ${this.value?.address.coordinates?.lat},${this.value?.address.coordinates?.lng}</div>
                    <div>Zoom: ${this.value?.mapconfig.zoom}</div>
                    <div>Center: ${this._center?.lat},${this._center?.lat}</div>
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

      #autocomplete{
        border: solid 1px var(--uui-color-border);
        padding: 9px;
        width: 100%;
        box-sizing: border-box;
      }

      #autocomplete:focus {
        border-color: var(--uui-color-border-emphasis, #a1a1a1);
      }

    
            `,
  ];

}

declare global {
  interface HTMLElementTagNameMap {
    'gmaps-property-editor-ui': GmapsPropertyEditorUiElement;
  }
}