module.exports = {
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    node: true,
    mocha: true
  },
  extends: [
    'standard'
  ],
  rules: {
    'promise/catch-or-return': 'error',
    'no-unused-expressions': 0,
    'chai-friendly/no-unused-expressions': 2
  },
  plugins: [
    'mocha',
    'chai-friendly'
  ]
}
