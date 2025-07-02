/// <reference types="@types/google.maps" />
import { LitElement, html, customElement, property, css, state, nothing, ifDefined } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { Pagination, SnazzyMapsStyle, SnazzyMapsValue } from '../types';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { SnazzyMapsRepository } from './snazzymaps.repository';
import { UUIInputElement, UUIPaginationEvent, UUITextareaElement } from '@umbraco-cms/backoffice/external/uui';
import './snazzymaps-style.element';

type SnazzyApiType = "explore" | "favorites" | "my-styles";

@customElement('snazzymaps-property-editor-ui')
export default class SnazzyMapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  #repo = new SnazzyMapsRepository(this);

  @property({ type: Object })
  public get value(): SnazzyMapsValue | undefined {
    return {
      apiKey: this._apiKey,
      selectedstyle: this._selectedStyle,
      customstyle: this._customStyle
    }
  }

  public set value(v: SnazzyMapsValue | undefined) {
    this._apiKey = v?.apiKey;
    this._selectedStyle = v?.selectedstyle;
    this._customStyle = v?.customstyle;
  }

  @state()
  private _loading: boolean = false;

  @state()
  private _apiKey?: string;

  @state()
  private _styles?: SnazzyMapsStyle[];

  @state()
  private _pagination?: Pagination;

  @state()
  private _currentType: SnazzyApiType = "explore";

  @state()
  private _selectedStyle?: SnazzyMapsStyle;

  @state()
  private _customStyle?: string;
  
  async firstUpdated() {
    await this.loadStyles("explore");
  }

  inputApiKey(e: InputEvent) {
    if (e.target instanceof UUIInputElement)
      this._apiKey = e.target.value.toString();
    
    this.dispatchEvent(new UmbChangeEvent());
  }

  inputCustomStyle(e: InputEvent) {
    if (e.target instanceof UUITextareaElement)
      this._customStyle = e.target.value.toString();
    
    this.dispatchEvent(new UmbChangeEvent());
  }

  async loadStyles(type: SnazzyApiType, page: number = 1) {
    if (!this._apiKey) {
      return;
    }
    this._loading = true;

    const { styles, pagination } = await this.#repo.getMapStyles(this._apiKey, type, page);

    this._styles = styles;
    this._pagination = pagination;
    this._currentType = type;
    this._loading = false;
  }

  async changePage(e: UUIPaginationEvent) {
    await this.loadStyles(this._currentType, e.target.current);
  }

  selectStyle(style: SnazzyMapsStyle) {
    this._selectedStyle = style;
    this.dispatchEvent(new UmbChangeEvent());
  }

  clearSelectedStyle() {
    this._selectedStyle = undefined;
    this.dispatchEvent(new UmbChangeEvent());
  }

  renderSelectedStyle() {
    if (!this._selectedStyle) {
      return;
    }

    return html`
    <div class="selected-style">
        <snazzymaps-style .styleItem=${this._selectedStyle} mode="display"></snazzymaps-style>

        <uui-button 
          .label=${ this.localize.term('snazzyMaps_delete') ?? 'Delete Mapstyle..' }
          type="button" look="primary" color="danger" @click=${ this.clearSelectedStyle }><uui-icon name="delete"></uui-icon><umb-localize key="snazzyMaps_delete">Delete Mapstyle...</umb-localize></uui-button>
    </div>
    <hr />
    `
  }

  renderStyles() {
    if (this._loading) {
      return html`
        <uui-loader style="color: color: #006eff"></uui-loader>
      `;
    }

    if (!this._styles) {
      return nothing;
    }

    return html`
      <div class="styles-grid">
        ${this._styles.map(style => html`
          <snazzymaps-style .styleItem=${style} @click=${ () => this.selectStyle(style) }></snazzymaps-style>
        `)}

        ${this._pagination?.totalItems === 0 ? html`
          <umb-localize key="content_noItemsToShow">There are no items to show</umb-localize>
        `: nothing}
      </div>

      ${this._pagination && this._pagination.totalPages > 1 ? html`
        <uui-pagination total=${this._pagination?.totalPages} current=${this._pagination.currentPage} @change=${this.changePage}></uui-pagination>
      ` : nothing}
    `
  }

  override render() {
    return html`
    ${this.renderSelectedStyle()}

    <div>
        <h3><umb-localize key="snazzyMaps_title">Enter your SnazzyMaps API key</umb-localize></h3>
        <small><umb-localize key="snazzyMaps_help">Choose what map-styles you want to load from your SnazzyMaps account. At <a href="https://snazzymaps.com/" target="_blank">SnazzyMaps.com</a> you can create or explore map styles.</umb-localize></small>
    </div>
    <div class="search-form">
        <uui-input type="text" label="Snazzy Maps API key" class="api-key" placeholder="Enter your SnazzyMaps API key" value=${ifDefined(this._apiKey)} @input=${this.inputApiKey}></uui-input>
        <div class="buttons">
            <uui-button label="Explore Styles" type="button" look="primary" @click=${() => this.loadStyles("explore")}></uui-button>
            <uui-button label="Favorite Styles" type="button" look="secondary" @click=${() => this.loadStyles("favorites")}></uui-button>
            <uui-button label="My Styles" type="button" look="secondary" @click=${() => this.loadStyles("my-styles")}></uui-button>
        </div>
    </div>

    ${this.renderStyles()}

    <hr />
    <div>
        <h3><umb-localize key="snazzyMaps_customTitle">Or enter your custom mapstyle JSON</umb-localize></h3>
        <small><umb-localize key="snazzyMaps_customHelp">Enter your  map style JSON here. You can create them at <a href="https://mapstyle.withgoogle.com/" target="_blank">https://mapstyle.withgoogle.com/</a></umb-localize></small>
    </div>
    <uui-textarea label="Custom map style JSON" class="custom-style" rows="10" value=${ ifDefined(this._customStyle) } @input=${ this.inputCustomStyle } ></uui-textarea>

        `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      
    .api-key {
      width: 100%;
    }
    
    .styles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20em, 1fr));
      gap: 1em;
      margin-bottom: 1em;
    }

    h3{
      margin: 0;
    }

    .selected-style{
      margin-bottom: 1em;
    }

    .search-form{
      margin-bottom: 1em;
    }

    .search-form .api-key{
      margin-bottom: 1em;
    }

    uui-pagination {
      display: block;
      margin-bottom: 2em;
    }

    `,
  ];

}

declare global {
  interface HTMLElementTagNameMap {
    'snazzymaps-property-editor-ui': SnazzyMapsPropertyEditorUiElement;
  }
}