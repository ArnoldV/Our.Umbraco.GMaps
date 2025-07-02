import { UmbRepositoryBase } from "@umbraco-cms/backoffice/repository";
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { tryExecute } from "@umbraco-cms/backoffice/resources";
import { Settings } from "../api";

export class GMapsSettingsRepository extends UmbRepositoryBase {
  constructor(host: UmbControllerHost) {
    super(host);
  }

    async settings() {

        const { data, error } = await tryExecute(
            this,
            Settings.getSettings({})
        );


        if (data) {
        return { data };
        }

        return { error };
    }
}

export { GMapsSettingsRepository as api };