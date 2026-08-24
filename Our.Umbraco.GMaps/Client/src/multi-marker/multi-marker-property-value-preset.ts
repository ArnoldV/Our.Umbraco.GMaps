import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UmbPropertyValuePreset } from '@umbraco-cms/backoffice/property';
import type { UmbPropertyEditorConfig } from '@umbraco-cms/backoffice/property-editor';
import { GMapsSettingsRepository } from '../repository/settings.repository.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location, MapType, MultiMap } from '../types.js';
import { parseCoordinates } from '../core/coordinates.js';

/**
 * Seeds an empty multi-marker value so the map can open at the configured
 * centre before anything is placed.
 *
 * Note this makes the property non-null with zero markers, which is exactly why
 * the minimum is enforced by the element's own validator rather than by
 * Umbraco's `mandatory` flag.
 *
 * Priority for the default coordinates:
 *   1. The "location" configured on the datatype.
 *   2. The appsettings value (GoogleMaps/DefaultLocation).
 *   3. The hardcoded DEFAULT_LOCATION.
 */
export class GMapsMultiMarkerValuePreset
  implements UmbPropertyValuePreset<MultiMap, UmbPropertyEditorConfig>
{
  #host: UmbControllerHost;

  constructor(host: UmbControllerHost) {
    this.#host = host;
  }

  async processValue(
    value: MultiMap | undefined,
    config: UmbPropertyEditorConfig,
  ): Promise<MultiMap> {
    // The builder only calls us when the value is undefined, but guard anyway.
    if (value !== undefined) return value;

    let coordinates: Location | undefined = parseCoordinates(
      config.find((x) => x.alias === 'location')?.value?.toString(),
    );
    if (!coordinates) {
      const settings = await new GMapsSettingsRepository(this.#host).settings();
      coordinates =
        parseCoordinates(settings.data?.defaultLocation ?? undefined) ?? DEFAULT_LOCATION;
    }

    return {
      markers: [],
      mapconfig: {
        zoom: Number(config.find((x) => x.alias === 'zoom')?.value) || 12,
        maptype: (config.find((x) => x.alias === 'maptype')?.value as MapType) || 'roadmap',
        centerCoordinates: coordinates,
      },
    };
  }

  destroy(): void {}
}

export { GMapsMultiMarkerValuePreset as api };
