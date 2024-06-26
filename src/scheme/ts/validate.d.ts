import { Result } from '../result';
import { TypeChatJsonValidator } from "../typechat";
/**
 * Represents an object that can validate JSON strings according to a given TypeScript schema.
 */
export interface TypeScriptJsonValidator<T extends object> extends TypeChatJsonValidator<T> {
    /**
     * Transform JSON into TypeScript code for validation. Returns a `Success<string>` object if the conversion is
     * successful, or an `Error` object if the JSON can't be transformed. The returned TypeScript source code is
     * expected to be an ECMAScript module that imports one or more types from `"./schema"` and combines those
     * types and a representation of the JSON object in a manner suitable for type-checking by the TypeScript compiler.
     */
    createModuleTextFromJson(jsonObject: object): Result<string>;
}
/**
 * Returns a JSON validator for a given TypeScript schema. Validation is performed by an in-memory instance of
 * the TypeScript compiler. The specified type argument `T` must be the same type as `typeName` in the given `schema`.
 * @param schema A string containing the TypeScript source code for the JSON schema.
 * @param typeName The name of the JSON target type in the schema.
 * @returns A `TypeChatJsonValidator<T>` instance.
 */
export declare function createTypeScriptJsonValidator<T extends object = object>(schema: string, typeName: string): TypeScriptJsonValidator<T>;
