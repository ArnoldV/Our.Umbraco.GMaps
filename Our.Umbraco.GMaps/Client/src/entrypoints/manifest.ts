export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "GMaps Entrypoint",
    alias: "GMaps.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint"),
  }
];
