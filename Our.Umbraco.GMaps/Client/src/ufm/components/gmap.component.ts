import { UfmToken, UmbUfmComponentBase } from '@umbraco-cms/backoffice/ufm';
import '../elements/gmap-value.element';

export class GMapUfmComponentApi extends UmbUfmComponentBase {
  render(token: UfmToken): string | undefined {
    // Expected syntax: {mnl:propertyAlias.fieldName}
    if (!token.text) return undefined;

    const dotIndex = token.text.indexOf('.');
    if (dotIndex === -1) return undefined;

    const propertyAlias = token.text.substring(0, dotIndex);
    const memberField = token.text.substring(dotIndex + 1);

    if (!propertyAlias || !memberField) return undefined;

    const html = `<ufm-gmap-value property-alias="${propertyAlias}" member-field="${memberField}"></ufm-gmap-value>`
    console.log('[GmapUfm] render() called, token.text:', token.text, '→ returning:', html);
    return html
  }
}

export { GMapUfmComponentApi as api };