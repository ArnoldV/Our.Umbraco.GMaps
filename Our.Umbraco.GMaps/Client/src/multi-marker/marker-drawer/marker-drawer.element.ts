import { css, customElement, html, nothing, state } from '@umbraco-cms/backoffice/external/lit';
import type { PropertyValues } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import type { Marker } from '../../types.js';
import { normaliseHexColor } from '../../core/marker-pin.js';
import type { GMapsMarkerDrawerData, GMapsMarkerDrawerValue } from './marker-drawer.token.js';

const elementName = 'gmaps-marker-drawer';

/** Edits one marker. Changes reach `value` only on submit, so Cancel abandons them. */
@customElement(elementName)
export default class GMapsMarkerDrawerElement extends UmbModalBaseElement<
  GMapsMarkerDrawerData,
  GMapsMarkerDrawerValue
> {
  @state()
  private _draft: Marker = { key: '' };

  @state()
  private _colourMissingFromPalette = false;

  /** The in-progress edit. Committed to `value` only on submit. */
  public get draft(): Marker {
    return this._draft;
  }

  override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    if (!changed.has('data') || !this.data) return;

    this._draft = { ...this.data.marker };

    const colour = normaliseHexColor(this.data.marker.color);
    this._colourMissingFromPalette =
      !!colour && !this.#usablePalette().some((p) => p.value === colour);
  }

  #patch(patch: Partial<Marker>) {
    this._draft = { ...this._draft, ...patch, key: this._draft.key };
  }

  #onInput(field: 'friendlyName' | 'description', event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    this.#patch({ [field]: target?.value ?? '' });
  }

  #usablePalette() {
    return (this.data?.palette ?? [])
      .map((colour) => ({ ...colour, value: normaliseHexColor(colour.value) }))
      .filter((colour): colour is { label: string; value: string } => !!colour.value);
  }

  #onSwatch(colour: string) {
    const selected = normaliseHexColor(this._draft.color);
    this.#patch({ color: selected === colour ? undefined : colour });
  }

  #submit() {
    this.value = this._draft;
    this._submitModal();
  }

  #renderColours() {
    const palette = this.#usablePalette();
    if (!palette.length) return nothing;

    const selected = normaliseHexColor(this._draft.color);

    return html`
      <div class='field colours'>
        <span class='label'>Colour</span>
        <div class='swatches'>
          ${palette.map(
            (colour) => html`
              <button
                type='button'
                class='swatch ${selected === colour.value ? 'selected' : ''}'
                style='background:${colour.value}'
                title=${colour.label || colour.value}
                aria-label=${colour.label || colour.value}
                aria-pressed=${selected === colour.value}
                @click=${() => this.#onSwatch(colour.value)}></button>
            `,
          )}
        </div>
        ${this._colourMissingFromPalette
          ? html`<div class='warning'>This marker's colour is no longer in the palette.</div>`
          : nothing}
      </div>
    `;
  }

  override render() {
    if (!this.data) return nothing;
    const coordinates = this._draft.coordinates;

    return html`
      <umb-body-layout headline=${this._draft.friendlyName || 'Marker'}>
        <div class='content'>
          <div class='field'>
            <span class='label'>Address</span>
            <div class='readonly'>${this._draft.full_address ?? 'No address resolved'}</div>
            <div class='hint'>
              ${coordinates ? `${coordinates.lat}, ${coordinates.lng}` : 'No coordinates'}
              — drag the pin or search to move it
            </div>
          </div>

          <div class='field'>
            <label class='label' for='friendlyName'>Friendly name</label>
            <input
              id='friendlyName'
              type='text'
              .value=${this._draft.friendlyName ?? ''}
              @input=${(e: Event) => this.#onInput('friendlyName', e)} />
          </div>

          ${this.data.enableDescription
            ? html`
                <div class='field'>
                  <label class='label' for='description'>Description</label>
                  <textarea
                    id='description'
                    rows='3'
                    .value=${this._draft.description ?? ''}
                    @input=${(e: Event) => this.#onInput('description', e)}></textarea>
                </div>
              `
            : nothing}

          ${this.#renderColours()}
        </div>

        <div slot='actions'>
          <uui-button label='Cancel' look='secondary' @click=${() => this._rejectModal()}></uui-button>
          <uui-button
            label='Submit'
            look='primary'
            color='positive'
            @click=${() => this.#submit()}></uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      .content {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: var(--uui-size-layout-1, 1rem);
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--uui-color-text-alt, #666);
      }

      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 0.4rem 0.5rem;
        border: 1px solid var(--uui-color-border, #ccc);
        border-radius: 3px;
        background: var(--uui-color-surface, #fff);
        color: var(--uui-color-text, #000);
        font: inherit;
      }

      .readonly {
        font-size: 0.95em;
      }

      .hint {
        font-size: 0.75rem;
        color: var(--uui-color-text-alt, #666);
      }

      .swatches {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.2);
        cursor: pointer;
        padding: 0;
      }

      .swatch.selected {
        outline: 2px solid var(--uui-color-selected, #006eff);
        outline-offset: 2px;
      }

      .warning {
        font-size: 0.8rem;
        color: var(--uui-color-warning-emphasis, #d29c00);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    [elementName]: GMapsMarkerDrawerElement;
  }
}
