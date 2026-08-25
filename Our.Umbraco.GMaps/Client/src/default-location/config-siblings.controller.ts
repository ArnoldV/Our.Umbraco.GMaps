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
  /**
   * Calls back with the current value, and again whenever it changes.
   *
   * The first call is never synchronous - the dataset has to be found and its
   * value observable awaited - so this resolves once that first value has been
   * delivered, letting a caller that needs a sibling value wait for it rather
   * than read `undefined` and carry on with a stale fallback.
   */
  observeValue<T>(alias: string, onChange: (value: T | undefined) => void): Promise<void>;
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
  #delivered = new Map<string, () => void>();

  constructor(host: UmbControllerHost) {
    super(host);

    this.consumeContext(UMB_PROPERTY_DATASET_CONTEXT, (dataset) => {
      this.#dataset = dataset ?? undefined;
      if (!this.#dataset) {
        // Outside a datatype workspace there are no siblings to wait for. Say so
        // rather than leave every waiter hanging on a value that cannot arrive.
        this.#markDelivered();
        return;
      }
      for (const [alias, onChange] of this.#pending) void this.#subscribe(alias, onChange);
    });
  }

  observeValue<T>(alias: string, onChange: (value: T | undefined) => void): Promise<void> {
    const listener = onChange as (value: unknown) => void;
    this.#pending.set(alias, listener);
    const delivered = new Promise<void>((resolve) => this.#delivered.set(alias, resolve));
    if (this.#dataset) void this.#subscribe(alias, listener);
    return delivered;
  }

  #markDelivered(alias?: string) {
    if (alias) {
      this.#delivered.get(alias)?.();
      return;
    }
    for (const resolve of this.#delivered.values()) resolve();
  }

  setValue(alias: string, value: unknown) {
    this.#dataset?.setPropertyValue(alias, value);
  }

  async #subscribe(alias: string, onChange: (value: unknown) => void) {
    const values = await this.#dataset?.propertyValueByAlias<unknown>(alias);
    if (!values) {
      this.#markDelivered(alias);
      return;
    }
    this.observe(values, (value) => onChange(value), `gmapsConfigSibling_${alias}`);
    // observe() reports the current value before returning, so by here the
    // first value has been handed to onChange.
    this.#markDelivered(alias);
  }
}
