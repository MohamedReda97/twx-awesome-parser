import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import promise from 'eslint-plugin-promise';
import n from 'eslint-plugin-n';

export default [
  js.configs.recommended,
  sonarjs.configs.recommended,
  security.configs.recommended,
  promise.configs.recommended,
  n.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script', // IBM BPM scripts are typically not modules
      globals: {
        // IBM BPM/TeamWorks globals
        tw: 'readonly',
        console: 'readonly',
        // Common browser globals that might be used
        window: 'readonly',
        document: 'readonly',
        // Node.js globals (for some service scripts)
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      // Security rules
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      
      // Promise/Async rules
      'promise/always-return': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/avoid-new': 'off', // Allow new Promise() in BPM context
      
      // SonarJS complexity rules
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicate-string': ['error', 3],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      
      // General JavaScript best practices
      'no-console': 'warn', // BPM has its own logging
      'no-alert': 'error',  // Use BPM notifications instead
      'no-eval': 'error',   // Security risk
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-shadow': 'warn',
      'no-use-before-define': ['error', { 'functions': false }],
      
      // IBM BPM specific adjustments
      'n/no-missing-import': 'off', // BPM doesn't use standard imports
      'n/no-missing-require': 'off', // BPM has custom require behavior
      'n/no-unpublished-require': 'off',
      'n/no-unsupported-features/es-syntax': 'off', // BPM supports various ES versions
      
      // Style preferences (will be handled by Prettier)
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
      'max-len': 'off'
    }
  }
];
