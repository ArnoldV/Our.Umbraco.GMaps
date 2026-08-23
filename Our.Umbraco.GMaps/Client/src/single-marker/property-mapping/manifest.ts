export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'propertyEditorUi',
    alias: 'GMaps.PropertyEditorUi.PropertyMapping',
    name: 'Our.Umbraco.GMaps Property Mapping Configuration UI',
    element: () => import('./property-mapping-config.element.js'),
    meta: {
      label: 'GMaps Property Mapping',
      icon: 'icon-arrow-both',
      group: 'common',
    },
  },
];
