/* @flow strict-local */
import * as t from '@babel/types';
import { readOnlyArrayOfType } from './RelayFlowBabelFactories';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  type GraphQLInputType,
  type GraphQLType,
} from 'graphql';
import { type State } from './RelayFlowGenerator';

export type ScalarTypeMapping = {
  [type: string]: string,
};

function getInputObjectTypeIdentifier(type: GraphQLInputObjectType): string {
  return type.name;
}

function transformScalarType(
  type: GraphQLType,
  state: State,
  objectProps?: mixed,
) {
  if (type instanceof GraphQLNonNull) {
    return transformNonNullableScalarType(type.ofType, state, objectProps);
  }
  return t.nullableTypeAnnotation(
    transformNonNullableScalarType(type, state, objectProps),
  );
}

function transformNonNullableScalarType(
  type: GraphQLType,
  state: State,
  objectProps,
) {
  if (type instanceof GraphQLList) {
    return readOnlyArrayOfType(
      transformScalarType(type.ofType, state, objectProps),
    );
  } else if (
    type instanceof GraphQLObjectType ||
    type instanceof GraphQLUnionType ||
    type instanceof GraphQLInterfaceType
  ) {
    return objectProps;
  } else if (type instanceof GraphQLScalarType) {
    return transformGraphQLScalarType(type, state);
  } else if (type instanceof GraphQLEnumType) {
    return transformGraphQLEnumType(type, state);
  }
  throw new Error(`Could not convert from GraphQL type ${type.toString()}`);
}

function transformGraphQLScalarType(type: GraphQLScalarType, state: State) {
  const customType = state.customScalars[type.name];
  const typeName = customType || type.name;
  switch (typeName) {
    case 'String':
      return t.stringTypeAnnotation();
    case 'Float':
    case 'Int':
      return t.numberTypeAnnotation();
    case 'Boolean':
      return t.booleanTypeAnnotation();
    default:
      if (state.customScalarsModule) {
        state.importCustomScalars.add(typeName);
        return t.genericTypeAnnotation(t.identifier(typeName));
      }
      // keep the old any behaviour
      return typeName === 'ID'
        ? t.stringTypeAnnotation()
        : t.anyTypeAnnotation();
  }
}

function transformGraphQLEnumType(type: GraphQLEnumType, state: State) {
  state.usedEnums[type.name] = type;
  return t.genericTypeAnnotation(t.identifier(type.name));
}

function transformInputType(type: GraphQLInputType, state: State) {
  if (type instanceof GraphQLNonNull) {
    return transformNonNullableInputType(type.ofType, state);
  }
  return t.nullableTypeAnnotation(transformNonNullableInputType(type, state));
}

function transformNonNullableInputType(type: GraphQLInputType, state: State) {
  if (type instanceof GraphQLList) {
    return readOnlyArrayOfType(transformInputType(type.ofType, state));
  } else if (type instanceof GraphQLScalarType) {
    return transformGraphQLScalarType(type, state);
  } else if (type instanceof GraphQLEnumType) {
    return transformGraphQLEnumType(type, state);
  } else if (type instanceof GraphQLInputObjectType) {
    const typeIdentifier = getInputObjectTypeIdentifier(type);
    if (state.generatedInputObjectTypes[typeIdentifier]) {
      return t.genericTypeAnnotation(t.identifier(typeIdentifier));
    }
    state.generatedInputObjectTypes[typeIdentifier] = 'pending';
    const fields = type.getFields();
    const props = Object.keys(fields)
      .map(key => fields[key])
      .filter(field => state.inputFieldWhiteList.indexOf(field.name) < 0)
      .map(field => {
        const property = t.objectTypeProperty(
          t.identifier(field.name),
          transformInputType(field.type, state),
        );
        if (!(field.type instanceof GraphQLNonNull)) {
          property.optional = true;
        }
        return property;
      });
    state.generatedInputObjectTypes[typeIdentifier] = t.objectTypeAnnotation(
      props,
    );
    return t.genericTypeAnnotation(t.identifier(typeIdentifier));
  }
  throw new Error(`Could not convert from GraphQL type ${type.toString()}`);
}

export { transformInputType, transformScalarType };
