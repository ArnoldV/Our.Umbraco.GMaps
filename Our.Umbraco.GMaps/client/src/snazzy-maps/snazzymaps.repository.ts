import { UmbRepositoryBase } from "@umbraco-cms/backoffice/repository";
import { tryExecute } from "@umbraco-cms/backoffice/resources";
import { SnazzyMapsResult } from "../types";

export class SnazzyMapsRepository extends UmbRepositoryBase {
    public async getMapStyles(apiKey: string, method: string = "explore", pageNumber: number = 1): Promise<SnazzyMapsResult> {

        const r = await tryExecute(this, fetch('https://snazzymaps.com/' + method + '.json?key=' + apiKey + '&page=' + pageNumber, {
                method: 'GET',
            })
        );

        return await r?.json() as SnazzyMapsResult;
    }
}