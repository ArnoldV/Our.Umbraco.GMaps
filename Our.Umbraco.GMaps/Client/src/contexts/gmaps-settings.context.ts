import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
// import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { GMapsSettingsRepository } from "../repository/settings.repository.js";
import type { GoogleMaps } from "../api/types.gen.js";

export class GMapsSettingsContext extends UmbContextBase {
  
  #repository: GMapsSettingsRepository;
  #settings?: GoogleMaps;

  constructor(host: UmbControllerHost) {
    super(host, 'GMapsSettingsContext');
    this.#repository = new GMapsSettingsRepository(host);
  }

  async getSettings(): Promise<GoogleMaps | undefined> {
    if (!this.#settings) {
      const result = await this.#repository.settings();
      if (result.data) {
        this.#settings = result.data;
      }
    }
    return this.#settings;
  }

  async refreshSettings(): Promise<GoogleMaps | undefined> {
    this.#settings = undefined;
    return this.getSettings();
  }
}

export default GMapsSettingsContext;


// export const GMAPS_SETTINGS_CONTEXT = new UmbContextToken<GMapsSettingsContext>(
//   'GMapsSettingsContext'
// );

// export { GMapsSettingsContext as api };