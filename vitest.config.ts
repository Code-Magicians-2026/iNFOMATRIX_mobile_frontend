import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'react-native': path.resolve(__dirname, 'test/mocks/react-native.ts'),
      '@react-navigation/native': path.resolve(
        __dirname,
        'test/mocks/react-navigation-native.ts',
      ),
    },
  },
});
