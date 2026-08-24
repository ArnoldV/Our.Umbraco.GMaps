import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';

export class GMapsPropertyActionClearMarkers extends UmbPropertyActionBase {
  #init: Promise<unknown>;
  #propertyContext?: typeof UMB_PROPERTY_CONTEXT.TYPE;

  constructor(host: UmbControllerHost, args: UmbPropertyActionArgs<never>) {
    super(host, args);

    this.#init = Promise.all([
      this.consumeContext(UMB_PROPERTY_CONTEXT, (context) => {
        this.#propertyContext = context;
      }).asPromise({ preventTimeout: true }),
    ]);
  }

  async execute() {
    await this.#init;
    if (!this.#propertyContext) throw new Error('Property context not found');

    // Clearing the value drops back to the preset, which re-seeds an empty
    // marker list at the configured centre.
    this.#propertyContext.clearValue();
  }
}

export { GMapsPropertyActionClearMarkers as api };
