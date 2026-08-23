import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  rootDir: '.',
  files: ['./src/**/*.test.ts'],
  // @umbraco-cms/backoffice declares real `exports` for every subpath, so no
  // import-maps plugin is needed - nodeResolve finds dist-cms on its own.
  nodeResolve: {
    browser: true,
    preferBuiltins: false,
  },
  browsers: [playwrightLauncher({ product: 'chromium' })],
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      // Reads experimentalDecorators / useDefineForClassFields, which Lit needs.
      tsconfig: './tsconfig.json',
      // @googlemaps/js-api-loader reads process.env.NODE_ENV at module scope and
      // the editor imports it, so without this every test importing the editor
      // dies with "process is not defined". Same workaround as vite.config.ts.
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    }),
  ],
  testFramework: {
    config: { timeout: '5000' },
  },
};
