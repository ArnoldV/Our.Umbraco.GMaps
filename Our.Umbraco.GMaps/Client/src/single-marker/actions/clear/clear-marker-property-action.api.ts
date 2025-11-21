import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
// import { DEFAULT_LOCATION } from '../../single-marker-editor.element';

export class GMapsPropertyActionClearMarker extends UmbPropertyActionBase {
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
  // The execute method is called when the user triggers the action.
  async execute() {
    await this.#init;
    if (!this.#propertyContext) throw new Error('Property context not found');

    this.#propertyContext?.clearValue()
  }
}
export { GMapsPropertyActionClearMarker as api };