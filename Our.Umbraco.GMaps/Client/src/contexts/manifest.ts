import type { ManifestGlobalContext } from '@umbraco-cms/backoffice/extension-registry';

const contexts: Array<ManifestGlobalContext> = [
  {
    type: 'globalContext',
    alias: 'GMaps.SettingsContext',
    name: 'GMaps Settings Context',
    api: () => import('./gmaps-settings.context.js'),
  },
];

export const manifests = contexts;