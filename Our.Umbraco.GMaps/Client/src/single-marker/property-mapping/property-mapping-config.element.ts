import { LitElement, html, customElement, property, css, state, nothing, repeat } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { UUIBooleanInputElement, UUIInputElement, UUISelectElement } from '@umbraco-cms/backoffice/external/uui';
import { ADDRESS_FIELD_KEYS, ADDRESS_FIELD_LABELS } from '../../types.js';
import type { AddressFieldKey, PropertyMappingMode, PropertyMappingRow, PropertyMappingValue } from '../../types.js';

const MODE_OPTIONS: Array<{ value: PropertyMappingMode; name: string }> = [
  { value: 'off', name: 'Off' },
  { value: 'inbound', name: 'Properties → Map (look up the address fields)' },
  { value: 'outbound', name: 'Map → Properties (write the picked place out)' },
  { value: 'both', name: 'Both directions' },
];

/**
 * Datatype configuration for exchanging address data with other properties.
 *
 * Aliases are free text on purpose: a datatype configuration editor has no
 * knowledge of which document types will end up using the datatype, so there is
 * nothing to offer in a picker. Aliases that turn out not to exist are reported
 * in the property editor itself, where the content type is known.
 */
@customElement('gmaps-property-mapping-config')
export default class GmapsPropertyMappingConfigElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  @property({ type: Object })
  public set value(value: PropertyMappingValue | undefined) {
    this._mode = value?.mode ?? 'off';
    this._autoLookup = value?.autoLookup ?? false;
    this._mappings = (value?.mappings ?? []).map((row) => ({ ...row }));
  }
  public get value(): PropertyMappingValue {
    return {
      mode: this._mode,
      autoLookup: this._autoLookup,
      mappings: this._mappings,
    };
  }

  @state()
  private _mode: PropertyMappingMode = 'off';

  @state()
  private _autoLookup = false;

  @state()
  private _mappings: PropertyMappingRow[] = [];

  get #inboundEnabled(): boolean {
    return this._mode === 'inbound' || this._mode === 'both';
  }

  #dispatch() {
    this.dispatchEvent(new UmbChangeEvent());
  }

  #onModeChange(e: Event) {
    if (!(e.target instanceof UUISelectElement)) return;
    this._mode = e.target.value.toString() as PropertyMappingMode;
    this.#dispatch();
  }

  #onAutoLookupChange(e: Event) {
    if (!(e.target instanceof UUIBooleanInputElement)) return;
    this._autoLookup = e.target.checked;
    this.#dispatch();
  }

  #onFieldChange(index: number, e: Event) {
    if (!(e.target instanceof UUISelectElement)) return;
    this.#updateRow(index, { field: e.target.value.toString() as AddressFieldKey });
  }

  #onAliasChange(index: number, e: Event) {
    if (!(e.target instanceof UUIInputElement)) return;
    this.#updateRow(index, { alias: e.target.value.toString() });
  }

  #updateRow(index: number, patch: Partial<PropertyMappingRow>) {
    this._mappings = this._mappings.map((row, i) => (i === index ? { ...row, ...patch } : row));
    this.#dispatch();
  }

  #addRow() {
    const used = new Set(this._mappings.map((row) => row.field));
    const next = ADDRESS_FIELD_KEYS.find((field) => !used.has(field)) ?? 'full_address';
    this._mappings = [...this._mappings, { field: next, alias: '' }];
    this.#dispatch();
  }

  #removeRow(index: number) {
    this._mappings = this._mappings.filter((_, i) => i !== index);
    this.#dispatch();
  }

  #renderRow(row: PropertyMappingRow, index: number) {
    const options = ADDRESS_FIELD_KEYS.map((field) => ({
      value: field,
      name: ADDRESS_FIELD_LABELS[field],
      selected: field === row.field,
    }));

    return html`
      <div class='row'>
        <uui-select
          label='Map field'
          .options=${options}
          @change=${(e: Event) => this.#onFieldChange(index, e)}>
        </uui-select>
        <uui-input
          label='Property alias'
          placeholder='Property alias, e.g. postCode'
          .value=${row.alias}
          @change=${(e: Event) => this.#onAliasChange(index, e)}>
        </uui-input>
        <uui-button
          label='Remove mapping'
          look='secondary'
          color='danger'
          compact
          @click=${() => this.#removeRow(index)}>
          <uui-icon name='icon-trash'></uui-icon>
        </uui-button>
      </div>
    `;
  }

  override render() {
    return html`
      <div class='field'>
        <uui-label for='mode'>Direction</uui-label>
        <uui-select
          id='mode'
          label='Direction'
          .options=${MODE_OPTIONS.map((option) => ({ ...option, selected: option.value === this._mode }))}
          @change=${this.#onModeChange}>
        </uui-select>
        <small>
          Exchange address data with other properties on the same content item, or
          on the same block when the map sits inside one.
        </small>
      </div>

      ${this._mode === 'off' ? nothing : html`
        ${this.#inboundEnabled ? html`
          <div class='field'>
            <uui-toggle
              label='Look up automatically'
              .checked=${this._autoLookup}
              @change=${this.#onAutoLookupChange}>
              Look up automatically
            </uui-toggle>
            <small>
              Geocode as soon as a mapped property changes. Leave this off to keep
              lookups (and the Google charges for them) under the editor's control
              via the <em>Look up from address fields</em> button.
            </small>
          </div>
        ` : nothing}

        <div class='field'>
          <uui-label>Mappings</uui-label>
          ${this._mappings.length
            ? html`<div class='rows'>
                ${repeat(this._mappings, (_, index) => index, (row, index) => this.#renderRow(row, index))}
              </div>`
            : html`<small class='empty'>No mappings yet.</small>`}
          <uui-button label='Add mapping' look='placeholder' @click=${this.#addRow}>Add mapping</uui-button>
          <small>
            Latitude and longitude are written as numbers. Mapping
            <em>Coordinates</em> instead stores both in one text property as
            <code>lat,lng</code>.
          </small>
        </div>
      `}
    `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 1.25em;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: .35em;
      }

      .rows {
        display: flex;
        flex-direction: column;
        gap: .5em;
        margin-bottom: .5em;
      }

      .row {
        display: grid;
        grid-template-columns: minmax(10em, 1fr) minmax(10em, 1.4fr) auto;
        gap: .5em;
        align-items: center;
      }

      .empty {
        margin-bottom: .5em;
      }

      small {
        opacity: .8;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'gmaps-property-mapping-config': GmapsPropertyMappingConfigElement;
  }
}
