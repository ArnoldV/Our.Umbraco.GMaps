import { UmbPropertyActionArgs, UmbPropertyActionBase } from '@umbraco-cms/backoffice/property-action';
import { UMB_PROPERTY_CONTEXT } from '@umbraco-cms/backoffice/property';
import { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type GMapsMultiMarkerEditorElement from '../../multi-marker-editor.element.js';

export class GMapsPropertyActionResetMultiMap extends UmbPropertyActionBase {
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

    const editor = this.#propertyContext.getEditor() as GMapsMultiMarkerEditorElement | undefined;
    if (editor && typeof editor.resetView === 'function') {
      editor.resetView();
    }
  }
}

export { GMapsPropertyActionResetMultiMap as api };
