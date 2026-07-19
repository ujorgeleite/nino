// eslint.config.js
// Flat config. Extends eslint-config-expo (the SDK 57 baseline) and turns off
// stylistic rules that Prettier owns.

const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'assets/**'],
  },
  {
    rules: {
      // The base rule misreads parameter names inside *type* declarations
      // (e.g. `flipCard: (instanceId: string) => void`) as unused bindings.
      // eslint-config-expo already ships the TS-aware equivalent.
      'no-unused-vars': 'off',
      // Components dual-export (named + default) by convention, so importing
      // the default under its named identifier is intentional here.
      'import/no-named-as-default': 'off',
    },
  },
  {
    // Jest mocks must use require() — the factory runs before ESM imports
    // are hoisted, so import syntax is not an option.
    files: ['jest.setup.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
];

// Conventions NOT enforceable here — policed by the ui-component and
// game-logic-hook skills instead: `type Props` over `interface`, no `React.FC`,
// StyleSheet at file end, no hardcoded pixel values.
