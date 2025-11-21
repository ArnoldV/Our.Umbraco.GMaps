// import { umbExtensionsRegistry } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/property';
export const manifests: Array<UmbExtensionManifest> =
[
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ClearMarker',
    name: 'GMaps Clear Markers Property Action',
    forPropertyEditorUis: ["GMaps.PropertyEditorUi.SingleMap"],
    conditions: [
			{
				alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS,
			},
		],
    api: () => import('./clear-marker-property-action.api.js'),
    meta: { 
      icon: 'icon-badge-remove', // Icon to display in the UI
      label: 'Clear Marker', // Label shown to editors
    }
  }
]
// umbExtensionsRegistry.register(manifests);