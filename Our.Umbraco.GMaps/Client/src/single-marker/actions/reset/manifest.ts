import { UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/property';

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ResetView',
    name: 'GMaps Reset View Property Action',
    weight: 10,
    forPropertyEditorUis: ["GMaps.PropertyEditorUi.SingleMap"],
    conditions: [
      {
        alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS,
      },
    ],
    api: () => import('./reset-property-action.api.js'),
    meta: {
      icon: 'icon-target', // Icon to display in the UI
      label: 'Reset Map View', // Label shown to editors
    },
  },
];
