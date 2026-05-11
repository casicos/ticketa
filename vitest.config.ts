import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // server-only 패키지는 Next.js 빌드 시 클라이언트 번들 차단용. Vitest(node env) 에선
      // 빈 모듈로 대체해서 import 만 통과시킴.
      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**', 'tests/db/**'],
  },
});
