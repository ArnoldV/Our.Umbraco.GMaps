import { manifests as clearActions } from './actions/clear/manifest';
import { manifests as resetActions } from './actions/reset/manifest';
import { manifests as propertyMapping } from './property-mapping/manifest';

export const manifests: Array<UmbExtensionManifest> = [
    {
        type: "propertyEditorUi",
        alias: "GMaps.PropertyEditorUi.SingleMap",
        name: 'Our.Umbraco.GMaps Single Property Editor UI',
        element: () => import('./single-marker-editor.element.js'),
        meta: {
            label: 'Google Maps Single Marker',
            icon: "icon-map-location",
            group: "richContent",
            propertyEditorSchemaAlias: "Our.Umbraco.GMaps.Single",
            settings: {    
                properties: [
                    {
                        alias: "hideMap",
                        label: "Hide Map",
                        description: "Removes the map from display but maintains all functionality.",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.Toggle"
                    },
                    {
                        alias: "enableFriendlyName",
                        label: "Enable friendly name",
                        description: "Adds an editable, human-friendly label for the location (e.g. 'Head Office'), auto-filled from the selected place.",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.Toggle"
                    },
                    {
                        alias: "apikey",
                        label: "Google API Key",
                        description: "Your Google Maps API Key",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.TextBox"
                    },
                    {
                        alias: "location",
                        label: "Default Location",
                        description: "The coordinates (lat, long) of the centre this map will show. Example: 52.379189, 4.899431",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.TextBox"
                    },
                    {
                        alias: "zoom",
                        label: "Default zoom",
                        description: "The default zoom level of the map. Defaults to 17",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.Integer"
                    },
                    {
                        alias: "maptype",
                        label: "Map type",
                        description: "The type of map to display. Defaults to 'roadmap'.",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.RadioButtonList",
                        config: [
                            {
                                "alias": "items",
                                "value": ["Roadmap", "Hybrid", "Satellite", "Terrain", "Styled"]
                            }
                        ]
                    },
                    {
                        alias: "mapstyle",
                        label: "Map style",
                        description: "Style of the map. Enter your SnazzyMaps.com API key to get the styles",
                        propertyEditorUiAlias: "GMaps.PropertyEditorUi.SnazzyMaps"
                    },
                    {
                        alias: "propertyMapping",
                        label: "Property mapping",
                        description: "Exchange address data with other properties on the same content item (or the same block).",
                        propertyEditorUiAlias: "GMaps.PropertyEditorUi.PropertyMapping"
                    }
                ],
                defaultData: [
                    {
                        "alias": "zoom",
                        "value": 17
                    }
                ]
            },
        }
    },
    {
        type: "propertyValuePreset",
        alias: "GMaps.PropertyValuePreset.SingleMap",
        name: "Our.Umbraco.GMaps Single Marker Default Value",
        api: () => import('./single-marker-property-value-preset.js'),
        forPropertyEditorUiAlias: "GMaps.PropertyEditorUi.SingleMap",
    },
    ...clearActions,
    ...resetActions,
    ...propertyMapping,
]