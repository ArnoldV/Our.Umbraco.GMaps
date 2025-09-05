import { manifests as entrypoints } from './entrypoints/manifest';
import { manifests as singleMap } from './single-marker/manifest';
import { manifests as snazzyMaps } from './snazzy-maps/manifest';
import { manifests as repository } from './repository/manifest';
import { manifests as contexts } from './contexts/manifest';

// Job of the bundle is to collate all the manifests from different parts of the extension and load other manifests
// We load this bundle from umbraco-package.json
export const manifests: Array<UmbExtensionManifest> = [
  ...entrypoints,
  ...singleMap,
  ...snazzyMaps,
  ...repository,
  ...contexts,
];
