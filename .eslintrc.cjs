module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
    browser: true
  },
  extends: [], // Start completely clean - no extends
  plugins: [
    'security'  // Only security plugin for critical vulnerabilities
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script' // IBM BPM scripts are typically not modules
  },
  globals: {
    // IBM BPM/TeamWorks globals
    tw: 'readonly',
    bpmext: 'readonly',
    page: 'readonly',
    TWDate: 'readonly',
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
    // === ONLY CRITICAL RUNTIME ERRORS ===

    // Critical Logic Errors & Bugs that cause runtime failures
    'no-undef': 'error',              // Using undefined variables
    'no-dupe-keys': 'error',          // Duplicate object keys
    'no-dupe-args': 'error',          // Duplicate function arguments
    'no-unreachable': 'error',        // Unreachable code after return/throw
    'no-invalid-regexp': 'error',     // Invalid regular expressions
    'no-unsafe-negation': 'error',    // Negating the left operand of relational operators
    'for-direction': 'error',         // Infinite loops
    'no-compare-neg-zero': 'error',   // Comparing against -0
    'no-cond-assign': 'error',        // Assignment in conditional expressions
    'no-constant-condition': 'error', // Constant conditions
    'no-debugger': 'error',           // Debugger statements in production
    'no-empty': 'error',              // Empty block statements
    'no-ex-assign': 'error',          // Assigning to exception parameter
    'no-func-assign': 'error',        // Reassigning functions
    'no-inner-declarations': 'error', // Function declarations in nested blocks
    'no-obj-calls': 'error',          // Calling global objects as functions
    'no-sparse-arrays': 'error',      // Sparse arrays with holes
    'valid-typeof': 'error',          // Invalid typeof comparison

    // === CRITICAL SECURITY ISSUES ===
    'no-eval': 'error',               // Direct eval() usage
    'no-implied-eval': 'error',       // Indirect eval usage
    'no-new-func': 'error',           // Function constructor
    'security/detect-eval-with-expression': 'error',

    // === TURN OFF EVERYTHING ELSE ===
    // Style rules - ALL OFF (Prettier handles these)
    'semi': 'off',
    'quotes': 'off',
    'indent': 'off',
    'comma-dangle': 'off',
    'space-before-blocks': 'off',
    'keyword-spacing': 'off',
    'object-curly-spacing': 'off',
    'array-bracket-spacing': 'off',
    'arrow-spacing': 'off',
    'brace-style': 'off',
    'comma-spacing': 'off',
    'func-call-spacing': 'off',
    'key-spacing': 'off',
    'no-mixed-spaces-and-tabs': 'off',
    'no-multiple-empty-lines': 'off',
    'no-trailing-spaces': 'off',
    'no-whitespace-before-property': 'off',
    'padded-blocks': 'off',
    'space-in-parens': 'off',
    'space-infix-ops': 'off',
    'space-unary-ops': 'off',

    // Best practices that aren't critical - ALL OFF
    'curly': 'off',
    'eqeqeq': 'off',
    'no-var': 'off',
    'prefer-const': 'off',
    'prefer-arrow-callback': 'off',
    'no-console': 'off',
    'no-unused-vars': 'off',
    'camelcase': 'off',
    'consistent-return': 'off',
    'default-case': 'off',
    'dot-notation': 'off',
    'no-else-return': 'off',
    'no-empty-function': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'no-shadow': 'off',
    'no-use-before-define': 'off',
    'prefer-template': 'off',
    'radix': 'off'
  },

  // IBM BAW globals (duplicate section - keeping for compatibility)
  globals: {
    tw: 'readonly',
    bpmext: 'readonly',
    page: 'readonly',
    TWDate: 'readonly',
    system: 'readonly',
    log: 'readonly',
    console: 'readonly',
    window: 'readonly',
    document: 'readonly'
  }
};
