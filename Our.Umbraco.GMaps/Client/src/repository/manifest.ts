export const manifests: Array<UmbExtensionManifest> = [
  {
    type: 'repository',
    alias: 'GMaps.Repository.Settings',
    name: 'GMaps Settings Repository',
    api: () => import('./settings.repository.js'),
  }
];