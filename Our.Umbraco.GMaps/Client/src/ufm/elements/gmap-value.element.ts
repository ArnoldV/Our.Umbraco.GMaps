import { html, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { Map } from '../../types';

const elementName = 'ufm-gmap-value'

// Manually reconstructed context token for UFM render context since it's not exported from the public API.
// This provides access to the block's raw data object within UFM (Umbraco Flavored Markdown) components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UMB_UFM_RENDER_CONTEXT = new UmbContextToken<any>('UmbUfmRenderContext');

/**
 * Custom UFM component that fetches and displays specific member field values.
 * Used within UFM contexts (like block list labels) to show member information.
 */
@customElement(elementName)
export class GmapValueElement extends UmbLitElement {
	/** The property alias from the block data to read the member reference from */
	@property({ attribute: 'property-alias' })
	propertyAlias?: string;

	/** The member field name to fetch and display (e.g., 'firstName', 'email') */
	@property({ attribute: 'member-field' })
	memberField?: string;

	@state()
	private _value?: string;

	override connectedCallback(): void {
		super.connectedCallback();

		// Subscribe to the UFM render context to get block data.
		// This context is provided by umb-ufm-render and contains the block's content data
		// as an observable, similar to how built-in UFM components like {umbValue:alias} work.
		this.consumeContext(UMB_UFM_RENDER_CONTEXT, (context) => {
			if (!context) return;

			// Observe changes to the block's data and extract the member reference
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.observe(
				context.value as any,
				(blockData: Record<string, unknown> | undefined) => {
					if (!blockData || !this.propertyAlias) {
						this._value = undefined;
						return;
					}

                    console.log('gmap.element rawValue', this.propertyAlias, this.memberField,  blockData[this.propertyAlias])
					const rawValue = blockData[this.propertyAlias] as Map;
                    
                    if (this.memberField === 'address') {
                        this._value = rawValue.address.full_address
                    } else if (this.memberField === 'coordinates') {
                        this._value = `${rawValue.address.coordinates?.lat}, ${rawValue.address.coordinates?.lng}`
                    } else {
						this._value = undefined;
					}
				},
				'observeBlockData',
			);
		});
	}

	override render() {
		return html`<span>${this._value ?? ''}</span>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		[elementName]: GmapValueElement;
	}
}