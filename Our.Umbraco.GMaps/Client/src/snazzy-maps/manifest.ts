
export const manifests: Array<UmbExtensionManifest> = [
    {
        type: "propertyEditorUi",
        alias: "GMaps.PropertyEditorUi.SnazzyMaps",
        name: 'Our.Umbraco.GMaps Snazzy Maps Property Editor UI',
        element: () => import('./snazzymaps-editor.element'),
        meta: {
            label: 'SnazzyMaps',
            icon: "icon-map-location",
            group: "richContent",
        }
    }
]