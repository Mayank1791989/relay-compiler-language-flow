/* @flow */
import GraphQLCompilerContext from 'graphql-compiler/lib/GraphQLCompilerContext';
import { transformASTSchema } from 'graphql-compiler/lib/ASTConvert';
import RelayRelayDirectiveTransform from 'relay-compiler/lib/RelayRelayDirectiveTransform';

import RelayFlowGenerator from '../RelayFlowGenerator';

import RelayTestSchema from 'relay-test-utils/lib/RelayTestSchema';
import parseGraphQLText from 'relay-test-utils/lib/parseGraphQLText';
import { generateTestsFromFixtures } from 'relay-test-utils/lib/RelayModernTestUtils';
import { type TypeGeneratorOptions } from '../RelayLanguagePluginInterface';

function generate(text, options: TypeGeneratorOptions) {
  const schema = transformASTSchema(RelayTestSchema, [
    RelayRelayDirectiveTransform.SCHEMA_EXTENSION,
    `
      scalar Color
      extend type User {
        color: Color
      }
    `,
  ]);
  const { definitions } = parseGraphQLText(schema, text);
  return new GraphQLCompilerContext(RelayTestSchema, schema)
    .addAll(definitions)
    .applyTransforms(RelayFlowGenerator.transforms)
    .documents()
    .map(doc => RelayFlowGenerator.generate(doc, options))
    .join('\n\n');
}

describe('RelayFlowGenerator', () => {
  generateTestsFromFixtures(`${__dirname}/fixtures/flow-generator`, text =>
    generate(text, {
      customScalars: {},
      enumsHasteModule: null,
      existingFragmentNames: new Set(['PhotoFragment']),
      inputFieldWhiteList: [],
      relayRuntimeModule: 'relay-runtime',
      useHaste: true,
      useSingleArtifactDirectory: false,
      noFutureProofEnums: false,
    }),
  );

  it('does not add `%future added values` when the noFutureProofEnums option is set', () => {
    const text = `
      fragment ScalarField on User {
        traits
      }
    `;
    const types = generate(text, {
      customScalars: {},
      enumsHasteModule: null,
      existingFragmentNames: new Set(['PhotoFragment']),
      inputFieldWhiteList: [],
      relayRuntimeModule: 'relay-runtime',
      useHaste: true,
      useSingleArtifactDirectory: false,
      // This is what's different from the tests above.
      noFutureProofEnums: true,
    });
    // Without the option, PersonalityTraits would be `('CHEERFUL' | ... | '%future added value');`
    expect(types).toContain(
      'export type PersonalityTraits = "CHEERFUL" | "DERISIVE" | "HELPFUL" | "SNARKY";',
    );
  });

  describe('custom scalars', () => {
    const text = `
      fragment ScalarField on User {
        name
        color
      }
    `;
    const generateWithMapping = mapping =>
      generate(text, {
        customScalars: mapping,
        relayRuntimeModule: 'relay-runtime',
        noFutureProofEnums: false,
        enumsHasteModule: null,
        existingFragmentNames: new Set(),
        inputFieldWhiteList: [],
        useHaste: false,
        useSingleArtifactDirectory: false,
      });

    it('maps unspecified types to `any`', () => {
      expect(
        generateWithMapping({
          // empty mapping
        }),
      ).toContain('+color: ?any,');
    });

    it('maps GraphQL types to their Flow representation', () => {
      expect(
        generateWithMapping({
          Color: 'String',
        }),
      ).toContain('+color: ?string,');
    });

    it('import scalars if $module$ passed', () => {
      const types = generateWithMapping({
        // customScalars mapping can override build in types
        $module$: 'package/scalars',
      });
      expect(types).toContain('+color: ?Color,');
      // also include
      expect(types).toContain('import type { Color } from "package/scalars"');
    });

    it('map scalars if mapping present', () => {
      const types = generateWithMapping({
        // customScalars mapping can override build in types
        Color: 'ColorString',
        $module$: 'package/scalars',
      });
      expect(types).toContain('+color: ?ColorString,');
      // also include
      expect(types).toContain(
        'import type { ColorString } from "package/scalars"',
      );
    });
  });

  it('imports fragment refs from siblings in a single artifact dir', () => {
    const text = `
      fragment Picture on Image {
        ...PhotoFragment
      }
    `;
    const types = generate(text, {
      customScalars: {},
      noFutureProofEnums: false,
      enumsHasteModule: null,
      existingFragmentNames: new Set(['PhotoFragment']),
      inputFieldWhiteList: [],
      relayRuntimeModule: 'relay-runtime',
      // This is what's different from the tests above.
      useHaste: false,
      useSingleArtifactDirectory: true,
    });
    expect(types).toContain(
      'import type { PhotoFragment$ref } from "./PhotoFragment.graphql";',
    );
  });
});
