export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'propertyEditorUi',
    alias: 'GMaps.PropertyEditorUi.DefaultLocation',
    name: 'Our.Umbraco.GMaps Default Location Configuration UI',
    element: () => import('./default-location-config.element.js'),
    meta: {
      label: 'GMaps Default Location',
      icon: 'icon-map-location',
      group: 'common',
    },
  },
];
