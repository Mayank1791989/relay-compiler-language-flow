/* @flow */
module.exports = {
  root: true /* restrict to this level */,

  parserOptions: {
    allowImportExportEverywhere: true,
  },

  extends: [
    'plugin:playlyfe/js',
    'plugin:playlyfe/flowtype',
    'plugin:playlyfe/prettier',
    'plugin:playlyfe/testing:jest',
  ],

  plugins: ['eslint-plugin-playlyfe'],

  env: {
    browser: false,
    node: true,
  },

  rules: {
    'prefer-destructuring': 'warn',
    'no-undefined': 'off',
  },
};

