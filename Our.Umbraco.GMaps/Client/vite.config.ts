import { defineConfig } from "vite";
import { fileURLToPath } from "url";

export default defineConfig({
    // @googlemaps/js-api-loader v2 reads `process.env.NODE_ENV` at module scope.
    // Vite's library build (unlike its app build) does not replace process.env,
    // so without this the reference reaches the browser and throws
    // "ReferenceError: process is not defined", breaking the property editor.
    define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url))
        }
    },
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