
import { LitElement, html, customElement, property, css } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';


@customElement('gmaps-property-editor-ui')
export default class GmapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
    @property({ type: Object })
    public value: any = {};

    override render() {
        return html`
            <p>Hello from GMaps</p>
        `;
    }

    static override readonly styles = [
        UmbTextStyles,
        css`
              
    
            `,
    ];

}

declare global {
    interface HTMLElementTagNameMap {
        'gmaps-property-editor-ui': GmapsPropertyEditorUiElement;
    }
}