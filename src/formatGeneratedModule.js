/* @flow */
import { type FormatModule } from './RelayLanguagePluginInterface';

const formatGeneratedModule: FormatModule = ({
  documentType,
  docText,
  concreteText,
  typeText,
  hash,
  relayRuntimeModule,
  sourceHash,
}) => {
  const documentTypeImport = documentType
    ? `import type { ${documentType} } from '${relayRuntimeModule}';`
    : '';
  const docTextComment = docText ? `\n/*\n${docText.trim()}\n*/\n` : '';
  const hashText = hash ? `\n * ${hash}` : '';
  return `/**
 * ${'@'}flow${hashText}
 */

/* eslint-disable */

'use strict';

/*::
${documentTypeImport}
${typeText || ''}
*/

${docTextComment}
const node/*: ${documentType || 'empty'}*/ = ${concreteText};
// prettier-ignore
(node/*: any*/).hash = '${sourceHash}';
module.exports = node;
`;
};

export default formatGeneratedModule;
