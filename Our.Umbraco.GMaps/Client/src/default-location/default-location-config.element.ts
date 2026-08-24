/// <reference types='@types/google.maps' />
import { LitElement, html, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UUIInputElement } from '@umbraco-cms/backoffice/external/uui';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { formatCoordinates, parseCoordinates, toNumber } from '../core/coordinates.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location } from '../types.js';
import type { ConfigSiblings } from './config-siblings.controller.js';
import { UmbDatasetConfigSiblings } from './config-siblings.controller.js';

/** Used when neither the datatype nor appsettings names a zoom level. */
const FALLBACK_ZOOM = 17;

/**
 * Picks the datatype's default map centre by browsing a map rather than typing
 * coordinates, and keeps the sibling zoom configuration in step with the view.
 *
 * Stores the same `lat,lng` string the plain text box always stored, so
 * switching a datatype to this editor needs no migration.
 */
@customElement('gmaps-default-location-config')
export default class GmapsDefaultLocationConfigElement
  extends UmbElementMixin(LitElement)
  implements UmbPropertyEditorUiElement
{
  /** The Google Maps SDK adapter. Injectable so tests can supply a fake. */
  @property({ attribute: false })
  public api: GoogleMapsApi = new GoogleMapsApiImpl();

  /** The datatype's other configuration fields. Injectable for the same reason. */
  @property({ attribute: false })
  public siblings: ConfigSiblings = new UmbDatasetConfigSiblings(this);

  /**
   * Requests an update unconditionally: a datatype with no location stored
   * assigns `undefined` over `undefined`, which Lit treats as unchanged, and the
   * update hook that triggers initialisation would then never run.
   */
  @property({ type: String })
  public set value(value: string | undefined) {
    this._value = value;
    this.#valueReceived = true;
    this.requestUpdate();
  }
  public get value(): string | undefined {
    return this._value;
  }

  @state()
  private _value?: string;

  @state()
  private _apiKeyMissing = false;

  #mapSurface?: MapSurfaceController;
  #creating = false;
  #ready = false;
  #siblingApiKey?: string;
  #siblingZoom?: number;
  #center: Location = DEFAULT_LOCATION;
  #initialized = false;
  #valueReceived = false;
  #resolveInitialized!: () => void;

  /** Resolves once initialisation has finished, successfully or not. */
  public readonly whenInitialized = new Promise<void>((resolve) => {
    this.#resolveInitialized = resolve;
  });

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.#mapSurface?.destroy();
  }

  protected override updated(changed: PropertyValues) {
    super.updated(changed);
    void this.#tryInitialize();
  }

  async #tryInitialize() {
    if (this.#initialized) return;
    if (!this.#valueReceived) return;
    this.#initialized = true;
    try {
      await this.#initialize();
    } finally {
      this.#resolveInitialized();
    }
  }

  async #initialize() {
    this.#center = parseCoordinates(this._value) ?? DEFAULT_LOCATION;
    this.#observeSiblings();
    this.#ready = true;

    await this.#createMap();
  }

  #observeSiblings() {
    this.siblings.observeValue<string>('apikey', (key) => {
      this.#siblingApiKey = key || undefined;
      // In the workspace the key arrives after initialisation, so a map that
      // could not be built for the want of one is built now.
      if (this.#ready) void this.#createMap();
    });

    this.siblings.observeValue<number | string>('zoom', (zoom) => {
      const level = toNumber(zoom ?? undefined);
      if (level === undefined || Number.isNaN(level)) return;
      if (level === this.#siblingZoom) return;
      this.#siblingZoom = level;
      this.#mapSurface?.setZoom(level);
    });
  }

  get #apiKey(): string | undefined {
    return this.#siblingApiKey;
  }

  async #createMap() {
    if (this.#mapSurface || this.#creating) return;

    const key = this.#apiKey;
    this._apiKeyMissing = !key;
    if (!key) return;

    this.#creating = true;
    try {
      // The map container is only rendered once a key is known.
      await this.updateComplete;
      const container = this.shadowRoot?.getElementById('map');
      if (!container) return;

      this.api.configure(key);
      this.#mapSurface = new MapSurfaceController(this.api);

      await this.#mapSurface.create(container, {
        center: this.#center,
        zoom: this.#siblingZoom ?? FALLBACK_ZOOM,
        maptype: 'roadmap',
        onCenterChanged: (center) => this.#setCenter(center),
        onZoomChanged: (zoom) => this.#setZoom(zoom),
        onCtrlHintNeeded: () => {},
      });
    } finally {
      this.#creating = false;
    }
  }

  /**
   * Accepts a hand-typed or pasted `lat,lng` pair, moving the map to match.
   * Text that is not a coordinate pair is ignored, so a half-typed entry never
   * throws away the configured location.
   */
  public applyCoordinates(text: string) {
    const coordinates = parseCoordinates(text);
    if (!coordinates) return;

    this.#mapSurface?.setCenter(coordinates);
    this.#setCenter(coordinates);
  }

  #onCoordinatesChange(event: Event) {
    if (!(event.target instanceof UUIInputElement)) return;
    this.applyCoordinates(event.target.value.toString());
  }

  #setZoom(zoom: number) {
    if (zoom === this.#siblingZoom) return;
    this.#siblingZoom = zoom;
    this.siblings.setValue('zoom', zoom);
  }

  #setCenter(center: Location) {
    this.#center = center;
    this._value = formatCoordinates(center);
    this.dispatchEvent(new UmbChangeEvent());
  }

  override render() {
    return html`
      ${this._apiKeyMissing
        ? html`<div class='notice'>
            Enter a Google API key above - or set one in appsettings - to pick the
            default location on a map.
          </div>`
        : html`<div id='map'></div>`}
      <uui-input
        id='coordinates'
        label='Default coordinates'
        placeholder='latitude, longitude'
        .value=${this._value ?? ''}
        @change=${this.#onCoordinatesChange}>
      </uui-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gmaps-default-location-config': GmapsDefaultLocationConfigElement;
  }
}
