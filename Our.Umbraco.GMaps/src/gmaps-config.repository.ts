import { UmbRepositoryBase } from "@umbraco-cms/backoffice/repository";
import { GMapsConfig } from "./types";
import { tryExecute } from '@umbraco-cms/backoffice/resources';
import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';


export class GMapsConfigRepository extends UmbRepositoryBase {
    public async getConfig(): Promise<GMapsConfig> {
        const authContext = await this.getContext(UMB_AUTH_CONTEXT);
        const token = await authContext?.getLatestToken();

        const { data } = await tryExecute(this, umbHttpClient.get<GMapsConfig>({
            url: '/umbraco/management/api/v1/gmaps/config',
            auth: () => token,
            security: [
                { scheme: "bearer", in: "header", "type": "apiKey" }
            ]
        }));

        return data ?? {};
    }
}