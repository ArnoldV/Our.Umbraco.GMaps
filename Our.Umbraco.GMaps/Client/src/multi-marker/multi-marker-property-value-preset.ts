import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UmbPropertyValuePreset } from '@umbraco-cms/backoffice/property';
import type { UmbPropertyEditorConfig } from '@umbraco-cms/backoffice/property-editor';
import { GMapsSettingsRepository } from '../repository/settings.repository.js';
import { DEFAULT_LOCATION } from '../types.js';
import type { Location, MapType, MultiMap } from '../types.js';
import { parseCoordinates } from '../core/coordinates.js';

/**
 * Seeds an empty multi-marker value so the map can open at the configured centre
 * before anything is placed. The centre comes from the datatype's "location",
 * then appsettings GoogleMaps/DefaultLocation, then {@link DEFAULT_LOCATION}.
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
