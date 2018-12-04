module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: ['standard', 'plugin:vue/recommended'],
  plugins: ['html', 'vue'],
  settings: {
    'html/html-extensions': ['.html']
  },
  globals: {
    __static: true
  },
  rules: {
    'comma-dangle': ['error', 'only-multiline'],
    'vue/require-default-prop': 0,
    'vue/order-in-components': 0,
    'arrow-parens': 0,
    'generator-star-spacing': 0,
    'no-use-before-define': 0,
    'no-debugger': 0,
    'no-console': 0
  }
}
