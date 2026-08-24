/// <reference types='@types/google.maps' />
import { LitElement, html, css, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UUIInputElement } from '@umbraco-cms/backoffice/external/uui';
import type { GoogleMapsApi } from '../maps/maps-api.js';
import { GoogleMapsApiImpl } from '../maps/google-maps-api.js';
import { MapSurfaceController } from '../controllers/map-surface.controller.js';
import { formatCoordinates, parseCoordinates, toNumber } from '../core/coordinates.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location } from '../types.js';
import { GMapsSettingsContext } from '../contexts/gmaps-settings.context.js';
import type { GoogleMaps } from '../api/types.gen.js';
import type { ConfigSiblings } from './config-siblings.controller.js';
import { UmbDatasetConfigSiblings } from './config-siblings.controller.js';

/**
 * The site-wide GoogleMaps settings from appsettings, which a datatype's own
 * configuration overrides. Narrowed to the one call this editor makes so tests
 * need no server.
 */
export interface SiteSettingsSource {
  getSettings(): Promise<GoogleMaps | undefined>;
}

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

  /** The site-wide settings this datatype's configuration overrides. */
  @property({ attribute: false })
  public site: SiteSettingsSource = new GMapsSettingsContext(this);

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
  #siteSettings?: GoogleMaps;
  #autocomplete?: google.maps.places.PlaceAutocompleteElement;
  #ctrlHintTimeout?: number;
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
    globalThis.clearTimeout(this.#ctrlHintTimeout);
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
    this.#siteSettings = await this.#readSiteSettings();

    this.#center =
      parseCoordinates(this._value) ??
      parseCoordinates(this.#siteSettings?.defaultLocation ?? undefined) ??
      DEFAULT_LOCATION;
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

  async #readSiteSettings(): Promise<GoogleMaps | undefined> {
    try {
      return await this.site.getSettings();
    } catch {
      // A site with no settings endpoint reachable is not a reason to refuse to
      // render; the datatype's own configuration may be all that is needed.
      return undefined;
    }
  }

  get #apiKey(): string | undefined {
    return this.#siblingApiKey ?? this.#siteSettings?.apiKey ?? undefined;
  }

  get #zoom(): number {
    const level = this.#siblingZoom ?? toNumber(this.#siteSettings?.zoomLevel ?? undefined);
    return level === undefined || Number.isNaN(level) ? FALLBACK_ZOOM : level;
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
        zoom: this.#zoom,
        maptype: 'roadmap',
        onCenterChanged: (center) => this.#setCenter(center),
        onZoomChanged: (zoom) => this.#setZoom(zoom),
        onCtrlHintNeeded: () => this.#showCtrlHint(),
      });

      await this.#createSearch();
    } finally {
      this.#creating = false;
    }
  }

  /**
   * Mounts the Places search box, so a default can be found by name rather than
   * by hunting across the map. Only the picked place's coordinates are kept -
   * this editor stores a centre, not an address.
   */
  async #createSearch() {
    const container = this.shadowRoot?.getElementById('search');
    if (!container || this.#autocomplete) return;

    const autocomplete = await this.api.createAutocomplete();
    this.#autocomplete = autocomplete;
    container.appendChild(autocomplete);

    autocomplete.addEventListener('gmp-select', async (event) => {
      const { placePrediction } = event as unknown as {
        placePrediction?: { toPlace(): google.maps.places.Place };
      };
      if (!placePrediction) return;

      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['location'] });

      const lat = toNumber(place.location?.lat);
      const lng = toNumber(place.location?.lng);
      if (lat === undefined || lng === undefined) return;
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      this.#moveTo({ lat, lng });
    });
  }

  /**
   * Accepts a hand-typed or pasted `lat,lng` pair, moving the map to match.
   * Text that is not a coordinate pair is ignored, so a half-typed entry never
   * throws away the configured location.
   */
  public applyCoordinates(text: string) {
    const coordinates = parseCoordinates(text);
    if (!coordinates) return;

    this.#moveTo(coordinates);
  }

  #moveTo(coordinates: Location) {
    this.#mapSurface?.setCenter(coordinates);
    this.#setCenter(coordinates);
  }

  /**
   * Forgets the datatype's own default so the appsettings default - or the
   * package default - applies again. The map is left where it is; what changes
   * is only whether this datatype overrides the site.
   */
  public clear() {
    this._value = undefined;
    this.dispatchEvent(new UmbChangeEvent());
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

  static override readonly styles = [
    UmbTextStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: .5em;
      }

      .map-container { position: relative; width: 100%; }
      #map { height: 320px; width: 100%; }

      .ctrl-scroll-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,.55); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; z-index: 1000; pointer-events: none;
        visibility: hidden; opacity: 0; transition: visibility .3s, opacity .3s ease-in-out;
      }
      .ctrl-scroll-overlay.visible { visibility: visible; opacity: 1; }

      #search { display: block; }

      .readout {
        display: flex;
        align-items: center;
        gap: .5em;
      }

      #coordinates { flex: 1; }

      .notice {
        padding: .75em;
        border: 1px dashed var(--uui-color-border, #ccc);
        border-radius: 3px;
        opacity: .85;
      }
    `,
  ];

  override render() {
    return html`
      ${this._apiKeyMissing
        ? html`<div class='notice'>
            Enter a Google API key above - or set one in appsettings - to pick the
            default location on a map.
          </div>`
        : html`
            <div id='search'></div>
            <div class='map-container'>
              <div id='map'></div>
              <div class='ctrl-scroll-overlay' id='ctrlScrollOverlay'>
                Use ctrl + drag to pan the map
              </div>
            </div>
          `}

      <div class='readout'>
        <uui-input
          id='coordinates'
          label='Default coordinates'
          placeholder='latitude, longitude'
          .value=${this._value ?? ''}
          @change=${this.#onCoordinatesChange}>
        </uui-input>
        <uui-button
          id='clear'
          label='Clear default coordinates'
          look='secondary'
          .disabled=${!this._value}
          @click=${this.clear}>
          Clear
        </uui-button>
      </div>

      <small>
        Drag the map to choose the centre this datatype opens at, or type a
        <code>latitude, longitude</code> pair. Zooming updates the default zoom
        level. Leave it empty to use the site-wide default.
      </small>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gmaps-default-location-config': GmapsDefaultLocationConfigElement;
  }
}
