import { defineConfig } from '@hey-api/openapi-ts';
import { defaultPlugins } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'https://localhost:44325/umbraco/swagger/gmaps/swagger.json',
  output: {
    format: 'prettier',
    lint: 'eslint',
    path: 'src/api'
  },
  plugins: [
    ...defaultPlugins,
		{
			name: '@hey-api/client-fetch',
			exportFromIndex: true,
			throwOnError: true,
		},
		{
			name: '@hey-api/typescript',
			enums: 'typescript',
			readOnlyWriteOnlyBehavior: 'off',
		},
		{
			name: '@hey-api/sdk',
			asClass: true,
		},
  ],
});
