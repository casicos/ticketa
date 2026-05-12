import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import boundaries from 'eslint-plugin-boundaries';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.bak/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'scripts/**',
  ]),
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'supabase-admin', pattern: 'lib/supabase/admin.ts', mode: 'file' },
        { type: 'supabase-transaction', pattern: 'lib/supabase/transaction.ts', mode: 'file' },
        { type: 'admin-route', pattern: 'app/(admin)/**' },
        { type: 'admin-domain', pattern: 'lib/domain/admin/**' },
        // auth-domain: 로그인 식별자 → email 룩업 등 cross-user 조회가 필요해
        // service-role 사용을 허용. 'admin' 의미가 아닌 '권한 있는 system' 의미.
        { type: 'auth-domain', pattern: 'lib/domain/auth/**' },
        { type: 'domain', pattern: 'lib/domain/**' },
        { type: 'supabase-other', pattern: 'lib/supabase/{client,server}.ts', mode: 'file' },
        { type: 'app', pattern: ['app/**', 'components/**', 'lib/**'] },
      ],
    },
    rules: {
      // v6 fully object-based selectors (no legacy string syntax)
      // Each rule: from (who is importing) + disallow (what they cannot import)
      // disallow value uses policy object { to: <element-selector> }
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          rules: [
            // supabase-admin: only admin-route and admin-domain may import it
            {
              from: { type: 'app' },
              disallow: { to: { type: 'supabase-admin' } },
            },
            {
              from: { type: 'domain' },
              disallow: { to: { type: 'supabase-admin' } },
            },
            {
              from: { type: 'supabase-other' },
              disallow: { to: { type: 'supabase-admin' } },
            },
            {
              from: { type: 'supabase-transaction' },
              disallow: { to: { type: 'supabase-admin' } },
            },
            // supabase-transaction: only domain may import it
            {
              from: { type: 'app' },
              disallow: { to: { type: 'supabase-transaction' } },
            },
            {
              from: { type: 'admin-route' },
              disallow: { to: { type: 'supabase-transaction' } },
            },
            {
              from: { type: 'admin-domain' },
              disallow: { to: { type: 'supabase-transaction' } },
            },
            {
              from: { type: 'supabase-other' },
              disallow: { to: { type: 'supabase-transaction' } },
            },
            {
              from: { type: 'supabase-admin' },
              disallow: { to: { type: 'supabase-transaction' } },
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
