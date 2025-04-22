import { UmbRepositoryBase } from "@umbraco-cms/backoffice/repository";
import { tryExecuteAndNotify } from "@umbraco-cms/backoffice/resources";
import { SnazzyMapsResult } from "./types";

export class SnazzyMapsRepository extends UmbRepositoryBase {
    public async getMapStyles(apiKey: string, method: string = "explore", pageNumber: number = 1): Promise<SnazzyMapsResult> {

        const { data } = await tryExecuteAndNotify(this, fetch('https://snazzymaps.com/' + method + '.json?key=' + apiKey + '&page=' + pageNumber, {
                method: 'GET',
            })
        );

        return await data?.json() as SnazzyMapsResult;
    }
}