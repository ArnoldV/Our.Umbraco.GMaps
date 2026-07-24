import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type GmapsPropertyEditorUiElement from '../../single-marker-editor.element.js';

export class GMapsPropertyActionReset extends UmbPropertyActionBase {
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

		const editor = this.#propertyContext.getEditor() as GmapsPropertyEditorUiElement | undefined;
		if (editor && typeof editor.resetView === 'function') {
			editor.resetView();
		}
	}
}

export { GMapsPropertyActionReset as api };
