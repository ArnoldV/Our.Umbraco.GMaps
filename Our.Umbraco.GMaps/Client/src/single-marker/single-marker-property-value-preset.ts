import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UmbPropertyValuePreset } from '@umbraco-cms/backoffice/property';
import type { UmbPropertyEditorConfig } from '@umbraco-cms/backoffice/property-editor';
import { GMapsSettingsRepository } from '../repository/settings.repository.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location, Map, MapType } from '../types.js';

function parseCoordinates(value: unknown): Location | undefined {
  const parts = value?.toString().split(',');
  if (parts && parts.length > 1) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  return undefined;
}

/**
 * Seeds a default value for a new Single Marker property.
 *
 * Priority for the default coordinates:
 *   1. The "location" configured on the datatype.
 *   2. The appsettings value (GoogleMaps/DefaultLocation).
 *   3. The hardcoded DEFAULT_LOCATION.
 */
export class GMapsSingleMarkerValuePreset implements UmbPropertyValuePreset<Map, UmbPropertyEditorConfig> {
  #host: UmbControllerHost;

  constructor(host: UmbControllerHost) {
    this.#host = host;
  }

  async processValue(value: Map | undefined, config: UmbPropertyEditorConfig): Promise<Map> {
    // The builder only calls us when the value is undefined, but guard anyway.
    if (value !== undefined) {
      return value;
    }

    let coordinates = parseCoordinates(config.find((x) => x.alias === 'location')?.value);
    if (!coordinates) {
      const settings = await new GMapsSettingsRepository(this.#host).settings();
      coordinates = parseCoordinates(settings.data?.defaultLocation ?? undefined) ?? DEFAULT_LOCATION;
    }

    const zoom = Number(config.find((x) => x.alias === 'zoom')?.value) || 17;
    const maptype = (config.find((x) => x.alias === 'maptype')?.value as MapType) || 'roadmap';

    return {
      address: {
        coordinates,
      },
      mapconfig: {
        zoom,
        maptype,
        centerCoordinates: coordinates,
      },
    };
  }

  destroy(): void {}
}

export { GMapsSingleMarkerValuePreset as api };
