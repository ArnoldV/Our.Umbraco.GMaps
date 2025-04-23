import { UmbRepositoryBase } from "@umbraco-cms/backoffice/repository";
import { tryExecuteAndNotify } from "@umbraco-cms/backoffice/resources";
import { GMapsConfig } from "./types";
import { OpenAPI } from '@umbraco-cms/backoffice/external/backend-api';

export class GMapsConfigRepository extends UmbRepositoryBase {
    public async getConfig(): Promise<GMapsConfig> {
        const tokenPromise = (OpenAPI.TOKEN as any as () => Promise<string>);
        const token = await tokenPromise();

        const { data } = await tryExecuteAndNotify(this, fetch('/umbraco/management/api/v1/gmaps/config', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            })
        );

        return await data?.json() as GMapsConfig;
    }
}