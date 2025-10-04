module.exports = {
  // Parser for JavaScript analysis
  parser: 'babel',

  // Basic formatting
  semi: true,
  singleQuote: true,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Line length - matches static analysis plan
  printWidth: 120,

  // Bracket spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'avoid',

  // End of line
  endOfLine: 'lf',

  // Trailing comma
  trailingComma: 'es5',

  // Embedded languages
  embeddedLanguageFormatting: 'auto',

  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',

  // Prose wrap
  proseWrap: 'preserve',

  // Quote props
  quoteProps: 'as-needed',

  // JSX
  jsxSingleQuote: true,

  // Vue
  vueIndentScriptAndStyle: false
};
