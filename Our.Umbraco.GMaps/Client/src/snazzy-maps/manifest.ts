
export const manifests: Array<UmbExtensionManifest> = [
    {
        type: "propertyEditorUi",
        alias: "Our.Umbraco.GMaps.SnazzyMapsPropertyEditorUi",
        name: 'Our.Umbraco.GMaps Snazzy Maps Property Editor UI',
        element: () => import('./snazzymaps-editor.element'),
        meta: {
            label: 'SnazzyMaps',
            icon: "icon-map-location",
            group: "richContent",
        }
    }
]