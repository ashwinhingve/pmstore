import coreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Next 16 removed `next lint`; this is the same next/core-web-vitals rule set
 * the old .eslintrc.json extended, running through the ESLint CLI.
 * The Expo app under mobile/ has its own tooling and is not linted here.
 */
const eslintConfig = [
  {
    ignores: [
      // Match build output at any depth, not just the repo root — a mis-parsed
      // working-directory path can leave a nested build dir whose minified
      // chunks otherwise get linted and drown real findings.
      '**/.next/**',
      '**/node_modules/**',
      'mobile/**',
      'data/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      // New in react-hooks v6 (arrived with eslint-config-next 16). They flag
      // long-standing intentional patterns — hydration mount-flags, in-effect
      // counters — that predate the rules. Warnings until each site is
      // restructured deliberately; do not silence per-line.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];

export default eslintConfig;
