import antfu from '@antfu/eslint-config';

export default antfu(
  {
    formatters: true,
    gitignore: true,
    ignores: [
      '.husky/**',
      'coverage/**',
      'logs/**',
      'pnpm-lock.yaml',
      '**/*.md',
    ],
    stylistic: {
      braceStyle: '1tbs',
      indent: 2,
      quotes: 'single',
    },
    type: 'lib',
    typescript: true,
  },
  {
    rules: {
      'curly': ['error', 'all'],
      'pnpm/yaml-enforce-settings': 'off',
      'style/max-statements-per-line': ['error', { max: 1 }],
      'style/semi': ['error', 'always'],
    },
  },
  {
    files: ['src/utils/skills.ts'],
    rules: {
      'regexp/no-super-linear-backtracking': 'off',
      'regexp/no-useless-quantifier': 'off',
      'regexp/prefer-w': 'off',
      'regexp/use-ignore-case': 'off',
    },
  },
);
