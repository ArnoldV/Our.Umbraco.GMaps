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
    }),
  ],
  testFramework: {
    config: { timeout: '5000' },
  },
};
