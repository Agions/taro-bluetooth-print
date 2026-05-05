module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'prettier', 'sonarjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // SonarJS 规则 (手动添加)
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/no-unused-collection': 'warn',
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-extra-arguments': 'warn',
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-identical-expressions': 'warn',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/no-collapsible-if': 'warn',
    'sonarjs/prefer-single-boolean-return': 'warn',
    'sonarjs/no-collection-size-mischeck': 'warn',
    'sonarjs/no-ignored-return': 'warn',
    'sonarjs/prefer-immediate-return': 'warn',
    'sonarjs/no-nested-template-literals': 'warn',
    'sonarjs/no-small-switch': 'warn',
    'sonarjs/no-useless-catch': 'warn'
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'docs', '*.config.js', '*.config.ts', '*.config.cjs']
};