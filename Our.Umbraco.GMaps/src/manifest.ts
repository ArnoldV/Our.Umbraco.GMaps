
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
            propertyEditorSchemaAlias: "Umbraco.Plain.String" 
		},
	}
]