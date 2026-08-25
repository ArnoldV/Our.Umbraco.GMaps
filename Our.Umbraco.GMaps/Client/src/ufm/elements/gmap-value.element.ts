import { html, customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import { Map, Marker, MultiMap } from '../../types';

const elementName = 'ufm-gmap-value'

// Manually reconstructed context token for UFM render context since it's not exported from the public API.
// This provides access to the block's raw data object within UFM (Umbraco Flavored Markdown) components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const UMB_UFM_RENDER_CONTEXT = new UmbContextToken<any>('UmbUfmRenderContext');


/**
 * Read one field out of either map shape, for a block-list label.
 *
 * Exported and pure so it can be tested without a UFM render context - and
 * because the guards matter: a block whose map property was never filled in used
 * to throw here.
 */
export function resolveGmapField(
	value: Map | MultiMap | undefined | null,
	field: string | undefined,
): string | undefined {
	if (!value || !field) return undefined;

	const markers: Marker[] =
		'markers' in value
			? (value.markers ?? [])
			: value.address
				? [{ key: 'single', ...value.address }]
				: [];

	const nameOf = (marker: Marker) => marker.friendlyName || marker.full_address || undefined;

	switch (field) {
		case 'count':
			return String(markers.length);
		case 'names':
			return markers.map(nameOf).filter(Boolean).join(', ');
		case 'address':
		case 'first':
			return markers[0]?.full_address ?? undefined;
		case 'friendlyName':
			return markers[0]?.friendlyName ?? undefined;
		case 'coordinates': {
			const coordinates = markers[0]?.coordinates;
			return coordinates ? `${coordinates.lat}, ${coordinates.lng}` : undefined;
		}
		default:
			return undefined;
	}
}

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

					this._value = resolveGmapField(
						blockData[this.propertyAlias] as Map | MultiMap | undefined,
						this.memberField,
					);
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