/// <reference types="@types/google.maps" />
import { LitElement, html, customElement, property, css, state, nothing, classMap, ifDefined } from '@umbraco-cms/backoffice/external/lit';

import { UmbTextStyles } from '@umbraco-cms/backoffice/style';
import { SnazzyMapsStyle } from './types';


@customElement('snazzymaps-style')
export default class SnazzyMapsStyleElement extends LitElement {
  @property({ type: Object })
  public styleItem: SnazzyMapsStyle | undefined;

  @property({ type: Boolean })
  public isSelected: boolean = false;

  override render() {
    console.log("hello from child", this.styleItem);

    if (!this.styleItem) {
      return nothing;
    }

    return html`
    <button class=${classMap({ style: true, selected: this.isSelected })} 
          ng-click="clickItem(style, $event, $index)">

      <img src=${this.styleItem.imageUrl} alt=${this.styleItem.name} />

      <div class="details">
        <h3>${this.styleItem.name}</h3>

        <dl>
            <div>
              <dt><umb-localize key="snazzyMaps_description">Description:</umb-localize></dt>
              <dd>${this.styleItem.description}</dd>
            </div>
            <div>
              <dt><umb-localize key="snazzyMaps_tags">Tags:</umb-localize></dt>
              <dd>${this.styleItem.tags.join(', ')}</dd>
            </div>
            <div>
              <dt><umb-localize key="snazzyMaps_author">Author:</umb-localize></dt>
              <dd><a href=${ifDefined(this.styleItem.createdBy.url)} target="_blank">${this.styleItem.createdBy.name}</a></dd>
            </div>
        </dl>
      </div>

    </button>
        `;
  }

  static override readonly styles = [
    UmbTextStyles,
    css`
      
    .style{
      display: flex;
      flex-flow: column;
      background: none;
      overflow: hidden;
      border: solid 1px transparent;
      padding: 0;
      font: inherit;
      text-align: left;
      border-radius: 3px;
      cursor: pointer;
      box-shadow: 0 1px 2px 0 rgba(0,0,0,.16);
      -webkit-user-select: none;
      -moz-user-select: none;
      user-select: none;
      height: 100%;
      transition: background-color ease-in-out .1s, border-color ease-in-out .1s;
    }

    .style:hover{
      background: #f2f2f2;
      border-color: var(--uui-color-interactive);
    }

    img{
      width: 100%;    
    }

    .details {
      padding: 1em;
    }

    dt, dd {
      display: inline;
      margin: 0;
    }

    dt{
      font-weight: bold;
    }

    h3{
      margin: 0;
    }

    `,
  ];

}

declare global {
  interface HTMLElementTagNameMap {
    'snazzymaps-style': SnazzyMapsStyleElement;
  }
}