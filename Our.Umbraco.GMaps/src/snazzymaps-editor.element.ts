/// <reference types="@types/google.maps" />
import { LitElement, html, customElement, property, css, state, nothing, classMap, ifDefined } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorConfigCollection, UmbPropertyEditorUiElement } from '@umbraco-cms/backoffice/property-editor';

import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { Address, AddressBase, AddressComponents, Location, Map, MapType, Pagination, SnazzyMapsStyle, SnazzyMapsValue, typedKeys } from './types';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';
import { SnazzyMapsRepository } from './snazzymaps.repository';
import { UUIInputElement, UUIPaginationEvent } from '@umbraco-cms/backoffice/external/uui';
import './snazzymaps-style.element';

type SnazzyApiType = "explore" | "favorites" | "my-styles";

@customElement('snazzymaps-property-editor-ui')
export default class SnazzyMapsPropertyEditorUiElement extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  #repo = new SnazzyMapsRepository(this);

  @property({ type: Object })
  public value: SnazzyMapsValue | undefined;

  @state()
  private _loading: boolean = false;

  @state()
  private _error?: string;


  @state()
  private _apiKey?: string = '2f8a09f9-296a-4419-b178-95da8591b120';


  @state()
  private _styles?: SnazzyMapsStyle[];


  @state()
  private _pagination?: Pagination;

  
  @state()
  private _currentType: SnazzyApiType = "explore";


  @property({ attribute: false })
  public set config(config: UmbPropertyEditorConfigCollection) {

  }

  inputApiKey(e: InputEvent) {
    if (e.target instanceof UUIInputElement)
      this._apiKey = e.target.value.toString();
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

  async changePage(e: UUIPaginationEvent){
    await this.loadStyles(this._currentType, e.target.current);
  }

  renderSelectedStyle() {
    if (!this.value?.selectedStyle) {
      return;
    }

    return html`
    <div style="margin-bottom: 1em;" id="selectedStyle">
        <div style="position: relative; max-width: 600px">
            <img ng-if="selectedStyle.imageUrl" src="{{selectedStyle.imageUrl}}" alt="{{selectedStyle.name}}" />
            <div>
                <h5>{{ selectedStyle.name }}</h5>
            </div>
            <div>
                <ul class="umb-content-grid__details-list">
                    <li class="umb-content-grid__details-item">
                        <div class="umb-content-grid__details-label"><umb-localize key="snazzyMaps_description">Description:</umb-localize></div>
                        <div class="umb-content-grid__details-value">{{ selectedStyle.description }}</div>
                    </li>
                    <li class="umb-content-grid__details-item">
                        <div class="umb-content-grid__details-label"><umb-localize key="snazzyMaps_tags">Tags:</umb-localize></div>
                        <div class="umb-content-grid__details-value">{{ selectedStyle.tags.join(', ') }}</div>
                    </li>
                    <li class="umb-content-grid__details-item">
                        <div class="umb-content-grid__details-label"><umb-localize key="snazzyMaps_author">Author:</umb-localize></div>
                        <div class="umb-content-grid__details-value"><a href="{{ selectedStyle.createdBy.url }}" target="_blank">{{ selectedStyle.createdBy.name }}</a></div>
                    </li>
                </ul>
            </div>

            <div class="umb-button" style="display: block; text-align: right">
                <button style="margin-bottom: 1em;" type="button" class="btn umb-button__button btn-action" ng-click="removeSelectedStyle()"> <span class="umb-button__content"> <i class="icon-trash umb-button__icon"></i><localize key="snazzyMaps_delete">Delete Mapstyle...</localize></span> </button>
            </div>

        </div>
    </div>
    <hr />
    `
  }

  renderStyles() {
    if(this._loading){
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
          <snazzymaps-style .styleItem=${style}></snazzymaps-style>
        `)}

        ${this._pagination?.totalItems === 0 ? html`
          <umb-localize key="content_noItemsToShow">There are no items to show</umb-localize>
        `: nothing}
      </div>

      ${this._pagination && this._pagination.totalPages > 1 ? html`
        <uui-pagination total=${this._pagination?.totalPages} current=${this._pagination.currentPage} @change=${ this.changePage }></uui-pagination>
      ` : nothing}
    </umb-pagination>
    `
  }

  override render() {
    return html`
    ${this.renderSelectedStyle()}

    <div style="margin-bottom: 1em;">
        <h5 style="margin: 0"><umb-localize key="snazzyMaps_title">Enter your SnazzyMaps API key</umb-localize></h5>
        <small><umb-localize key="snazzyMaps_help">Choose what map-styles you want to load from your SnazzyMaps account. At <a href="https://snazzymaps.com/" target="_blank">SnazzyMaps.com</a> you can create or explore map styles.</localize></small>
    </div>
    <div class="form-horizontal" style="margin-bottom: 1em;">
        <uui-input type="text" class="api-key" placeholder="Enter your SnazzyMaps API key" value=${ifDefined(this._apiKey)} @input=${this.inputApiKey} style="margin-bottom: 1em;"></uui-input>
        <div class="btn-group umb-button-group">
            <uui-button type="button" look="primary" @click=${ () => this.loadStyles("explore") }>Explore Styles</uui-button>
            <uui-button type="button" look="secondary" @click=${ () => this.loadStyles("favorites") }>Favorite Styles</uui-button>
            <uui-button type="button" look="secondary" @click=${ () => this.loadStyles("my-styles") }>My Styles</uui-button>
        </div>
    </div>

    ${this.renderStyles()}

    <div ng-show="error">{{ error }}</div>

    <hr />
    <div style="margin-bottom: 1em;">
        <h5 style="margin: 0"><umb-localize key="snazzyMaps_customTitle">Or enter your custom mapstyle JSON</umb-localize></h5>
        <small><umb-localize key="snazzyMaps_customHelp">Enter your  map style JSON here. You can create them at <a href="https://mapstyle.withgoogle.com/" target="_blank">https://mapstyle.withgoogle.com/</a></umb-localize></small>
    </div>
    <uui-textarea ng-model="customMapStyle" id="customMapStyle" name="customMapStyle" rows="10" class="umb-property-editor umb-textarea textstring" ng-keyup="customMapChange()"></uui-textarea>

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

    `,
  ];

}

declare global {
  interface HTMLElementTagNameMap {
    'snazzymaps-property-editor-ui': SnazzyMapsPropertyEditorUiElement;
  }
}