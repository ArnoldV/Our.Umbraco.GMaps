export const manifests: Array<UmbExtensionManifest> = [
    {
        type: 'ufmComponent',
        alias: 'GMaps.AddressUfmComponent',
        name: 'Our.Umbraco.GMaps Address UFM Component',
        api: () => import('./components/gmap.component.js'),
        meta: {
            alias: 'gmp'
        }
    }
]