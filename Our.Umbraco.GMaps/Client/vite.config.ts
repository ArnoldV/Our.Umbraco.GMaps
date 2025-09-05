import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: "src/bundle.manifests.ts", // your web component source file
            fileName: "our-umbraco-gmaps",
            formats: ["es"],
        },
        outDir: "../wwwroot/App_Plugins/Our.Umbraco.GMaps", // all compiled files will be placed here
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            external: [/^@umbraco/], // ignore the Umbraco Backoffice package in the build
        },
    },
    base: "/App_Plugins/Our.Umbraco.GMaps/", // the base path of the app in the browser (used for assets)
});