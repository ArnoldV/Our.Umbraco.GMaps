import { UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS } from '@umbraco-cms/backoffice/property';

export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'propertyEditorUi',
    alias: 'GMaps.PropertyEditorUi.MultiMap',
    name: 'Our.Umbraco.GMaps Multi Property Editor UI',
    element: () => import('./multi-marker-editor.element.js'),
    meta: {
      label: 'Google Maps Multi Marker',
      icon: 'icon-map-location',
      group: 'richContent',
      propertyEditorSchemaAlias: 'Our.Umbraco.GMaps.Multi',
      settings: {
        properties: [
          {
            alias: 'hideMap',
            label: 'Hide Map',
            description: 'Removes the map from display but maintains all functionality.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Toggle',
          },
          {
            alias: 'enableDescription',
            label: 'Enable description',
            description:
              'Adds a free-text description to each marker, for info windows and captions.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Toggle',
          },
          {
            alias: 'minNumber',
            label: 'Minimum markers',
            description: 'The fewest markers this property will accept. Leave empty for no minimum.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'maxNumber',
            label: 'Maximum markers',
            description: 'The most markers this property will accept. 0 or empty means unlimited.',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'markerColors',
            label: 'Marker colours',
            description:
              'The palette editors can choose from for each marker. Leave empty to hide the colour control. Labels travel to the front-end, so name them for meaning ("Retail") rather than appearance ("Blue").',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.ColorSwatchesEditor',
          },
          {
            alias: 'apikey',
            label: 'Google API Key',
            description: 'Your Google Maps API Key',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
          },
          {
            alias: 'location',
            label: 'Default Location',
            description:
              'The coordinates (lat, long) of the centre this map will show. Example: 52.379189, 4.899431',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
          },
          {
            alias: 'zoom',
            label: 'Default zoom',
            description: 'The default zoom level of the map. Defaults to 12',
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.Integer',
          },
          {
            alias: 'maptype',
            label: 'Map type',
            description: "The type of map to display. Defaults to 'roadmap'.",
            propertyEditorUiAlias: 'Umb.PropertyEditorUi.RadioButtonList',
            config: [
              { alias: 'items', value: ['Roadmap', 'Hybrid', 'Satellite', 'Terrain', 'Styled'] },
            ],
          },
          {
            alias: 'mapstyle',
            label: 'Map style',
            description: 'Style of the map. Enter your SnazzyMaps.com API key to get the styles',
            propertyEditorUiAlias: 'GMaps.PropertyEditorUi.SnazzyMaps',
          },
        ],
        defaultData: [{ alias: 'zoom', value: 12 }],
      },
    },
  },
  {
    type: 'propertyValuePreset',
    alias: 'GMaps.PropertyValuePreset.MultiMap',
    name: 'Our.Umbraco.GMaps Multi Marker Default Value',
    api: () => import('./multi-marker-property-value-preset.js'),
    forPropertyEditorUiAlias: 'GMaps.PropertyEditorUi.MultiMap',
  },
  {
    type: 'modal',
    alias: 'GMaps.Modal.MarkerDrawer',
    name: 'Our.Umbraco.GMaps Marker Drawer',
    element: () => import('./marker-drawer/marker-drawer.element.js'),
  },
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ClearMarkers',
    name: 'GMaps Clear Markers Property Action',
    weight: 20,
    forPropertyEditorUis: ['GMaps.PropertyEditorUi.MultiMap'],
    conditions: [{ alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS }],
    api: () => import('./actions/clear/clear-markers-property-action.api.js'),
    meta: {
      icon: 'icon-badge-remove',
      label: 'Clear all markers',
    },
  },
  {
    type: 'propertyAction',
    kind: 'default',
    alias: 'GMaps.PropertyAction.ResetMultiMapView',
    name: 'GMaps Reset Multi Map View Property Action',
    weight: 10,
    forPropertyEditorUis: ['GMaps.PropertyEditorUi.MultiMap'],
    conditions: [{ alias: UMB_PROPERTY_HAS_VALUE_CONDITION_ALIAS }],
    api: () => import('./actions/reset/reset-property-action.api.js'),
    meta: {
      icon: 'icon-undo',
      label: 'Reset Map View',
    },
  },
];
