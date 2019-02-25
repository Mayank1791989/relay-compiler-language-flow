/* @flow strict-local */
import RelayFlowGenerator from './RelayFlowGenerator';
import formatGeneratedModule from './formatGeneratedModule';
import { find } from './FindGraphQLTags';
import { type PluginInterface } from './RelayLanguagePluginInterface';

export default function languagePluginFlow(): PluginInterface {
  return {
    inputExtensions: ['js', 'jsx'],
    outputExtension: 'js',
    typeGenerator: RelayFlowGenerator,
    formatModule: formatGeneratedModule,
    findGraphQLTags: find,
  };
}
