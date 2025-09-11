const js = require('@eslint/js');

module.exports = {
  env: {
    es2020: true,
    node: true,
    browser: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script' // IBM BPM scripts are typically not modules
  },
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
  },
  rules: {
    // Critical Security Issues
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Critical Logic Errors
    'no-undef': 'error',
    'no-redeclare': 'error',
    'no-duplicate-case': 'error',
    'no-func-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-obj-calls': 'error',
    'no-unreachable': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-unmodified-loop-condition': 'error',

    // Potential Runtime Errors
    'no-caller': 'error',
    'no-eq-null': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-return-assign': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-with': 'error',
    'eqeqeq': 'error',
    'curly': 'error',

    // IBM BPM Specific Issues
    'no-alert': 'error',  // Use BPM notifications instead
    'no-console': 'off',  // Console is commonly used in BPM scripts

    // Meaningful Warnings (not style issues)
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'no-shadow': 'warn',
    'no-use-before-define': ['warn', { 'functions': false, 'classes': false }],
    'no-empty': 'warn',
    'no-loop-func': 'warn',
    'no-param-reassign': 'warn',
    'no-unused-expressions': 'warn',
    'default-case': 'warn',
    'radix': 'warn',

    // Disable style-related rules that don't affect functionality
    'no-var': 'off',
    'prefer-const': 'off',
    'no-multi-spaces': 'off',
    'no-extra-semi': 'off',
    'no-extra-boolean-cast': 'off',
    'no-floating-decimal': 'off',
    'no-implicit-coercion': 'off',
    'no-magic-numbers': 'off',
    'dot-notation': 'off',
    'no-else-return': 'off',
    'no-empty-function': 'off',
    'no-implicit-globals': 'off',
    'no-new': 'off',
    'no-new-wrappers': 'off',
    'no-useless-call': 'off',
    'no-useless-concat': 'off',
    'no-useless-return': 'off',
    'no-void': 'off',
    'wrap-iife': 'off',
    'yoda': 'off',
    'no-irregular-whitespace': 'off',
    'no-sparse-arrays': 'off',
    'no-inner-declarations': 'off'
  }
};
