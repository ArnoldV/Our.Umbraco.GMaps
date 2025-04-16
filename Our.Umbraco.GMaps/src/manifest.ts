
export const manifests: Array<UmbExtensionManifest> = [
    {
        type: "propertyEditorUi",
        alias: "Our.Umbraco.GMaps.PropertyEditorUi",
        name: 'Our.Umbraco.GMaps Property Editor UI',
        element: () => import('./gmaps-editor.element'),
        meta: {
            label: 'Google Maps Single Marker',
            icon: "icon-map-location",
            group: "richContent",
            propertyEditorSchemaAlias: "Our.Umbraco.GMaps",
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
                    }
                ],
                defaultData: [
                    {
                        "alias": "zoom",
                        "value": 15
                    },
                    {
                        "alias": "location",
                        "value": "52.379189, 4.899431"
                    }
                ]
            },
        }
    }
]