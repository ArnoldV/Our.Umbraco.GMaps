import { manifests as actions } from './actions/clear/manifest';

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
                        alias: "apikey",
                        label: "Google API Key",
                        description: "Your Google Maps API Key",
                        propertyEditorUiAlias: "Umb.PropertyEditorUi.TextBox"
                    },
                    {
                        alias: "location",
                        label: "Default coordinates",
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
                    }
                ],
                defaultData: [
                    {
                        "alias": "zoom",
                        "value": 17
                    },
                    {
                        "alias": "location",
                        "value": "52.379189, 4.899431"
                    }
                ]
            },
        }
    },
    ...actions,
]