import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import { UMB_PROPERTY_DATASET_CONTEXT } from '@umbraco-cms/backoffice/property';
import type { UmbPropertyDatasetContext } from '@umbraco-cms/backoffice/property';

/**
 * The other configuration properties of the datatype being edited.
 *
 * A configuration property editor is handed only its own value and its own
 * manifest config, so a field that needs to cooperate with its neighbours - to
 * borrow the API key, or to keep the zoom level in step - has to reach them
 * through the surrounding dataset. This interface is that reach, narrowed to the
 * two operations needed so the editor can be tested without a datatype
 * workspace.
 */
export interface ConfigSiblings {
  /** Calls back with the current value, and again whenever it changes. */
  observeValue<T>(alias: string, onChange: (value: T | undefined) => void): void;
  setValue(alias: string, value: unknown): void;
}

/**
 * The live implementation, backed by the property dataset the datatype
 * workspace provides. Sits at the seam and so is not unit tested; see
 * FakeConfigSiblings in the editor's tests.
 */
export class UmbDatasetConfigSiblings extends UmbControllerBase implements ConfigSiblings {
  #dataset?: UmbPropertyDatasetContext;
  #pending = new Map<string, (value: unknown) => void>();

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, (dataset) => {
      this.#dataset = dataset ?? undefined;
      if (!this.#dataset) return;
      for (const [alias, onChange] of this.#pending) this.#subscribe(alias, onChange);
    });
  }

  observeValue<T>(alias: string, onChange: (value: T | undefined) => void) {
    const listener = onChange as (value: unknown) => void;
    this.#pending.set(alias, listener);
    if (this.#dataset) this.#subscribe(alias, listener);
  }

  setValue(alias: string, value: unknown) {
    this.#dataset?.setPropertyValue(alias, value);
  }

  async #subscribe(alias: string, onChange: (value: unknown) => void) {
    const values = await this.#dataset?.propertyValueByAlias<unknown>(alias);
    if (!values) return;
    this.observe(values, (value) => onChange(value), `gmapsConfigSibling_${alias}`);
  }
}
