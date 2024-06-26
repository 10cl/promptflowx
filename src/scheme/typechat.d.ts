import { Result } from "./result";
import { TypeChatLanguageModel, PromptSection } from "./model";
/**
 * Represents an object that can translate natural language requests in JSON objects of the given type.
 */
export interface TypeChatJsonTranslator<T extends object> {
    /**
     * The associated `TypeChatLanguageModel`.
     */
    model: TypeChatLanguageModel;
    /**
     * The associated `TypeChatJsonValidator<T>`.
     */
    validator: TypeChatJsonValidator<T>;
    /**
     * A boolean indicating whether to attempt repairing JSON objects that fail to validate. The default is `true`,
     * but an application can set the property to `false` to disable repair attempts.
     */
    attemptRepair: boolean;
    /**
     * A boolean indicating whether to delete properties with null values from parsed JSON objects. Some language
     * models (e.g. gpt-3.5-turbo) have a tendency to assign null values to optional properties instead of omitting
     * them. The default for this property is `false`, but an application can set the property to `true` for schemas
     * that don't permit null values.
     */
    stripNulls: boolean;
    /**
     * Creates an AI language model prompt from the given request. This function is called by `completeAndValidate`
     * to obtain the prompt. An application can assign a new function to provide a different prompt.
     * @param request The natural language request.
     * @returns A prompt that combines the request with the schema and type name of the underlying validator.
     */
    createRequestPrompt(request: string): string;
    /**
     * Creates a repair prompt to append to an original prompt/response in order to repair a JSON object that
     * failed to validate. This function is called by `completeAndValidate` when `attemptRepair` is true and the
     * JSON object produced by the original prompt failed to validate. An application can assign a new function
     * to provide a different repair prompt.
     * @param validationError The error message returned by the validator.
     * @returns A repair prompt constructed from the error message.
     */
    createRepairPrompt(validationError: string): string;
    /**
     * Optionally implements additional validation logic beyond what is expressed in the schema. This function is
     * called following successful schema validation of an instance. By default the function just returns a
     * `Success<T>` for the given instance, but an application can assign a new function that implements any
     * additional validation.
     * @param instance The instance to validate.
     * @returns A `Success<T>` with the final validated instance, or an `Error` explaining the validation failure.
     */
    validateInstance(instance: T): Result<T>;
    /**
     * Translates a natural language request into an object of type `T`. If the JSON object returned by
     * the language model fails to validate and the `attemptRepair` property is `true`, a second
     * attempt to translate the request will be made. The prompt for the second attempt will include the
     * diagnostics produced for the first attempt. This often helps produce a valid instance.
     * @param request The natural language request.
     * @param promptPreamble An optional string or array of prompt sections to prepend to the generated
     *   prompt. If a string is specified, it is converted into a single "user" role prompt section.
     * @returns A promise for the resulting object.
     */
    translate(request: string, promptPreamble?: string | PromptSection[]): Promise<Result<T>>;
}
/**
 * An object that represents a TypeScript schema for JSON objects.
 */
export interface TypeChatJsonValidator<T extends object> {
    /**
     * Return a string containing TypeScript source code for the validation schema.
     */
    getSchemaText(): string;
    /**
     * Return the name of the JSON object target type in the schema.
     */
    getTypeName(): string;
    /**
     * Validates the given JSON object according to the associated TypeScript schema. Returns a
     * `Success<T>` object containing the JSON object if validation was successful. Otherwise, returns
     * an `Error` object with a `message` property describing the error.
     * @param jsonText The JSON object to validate.
     * @returns The JSON object or an error message.
     */
    validate(jsonObject: object): Result<T>;
}
/**
 * Creates an object that can translate natural language requests into JSON objects of the given type.
 * The specified type argument `T` must be the same type as `typeName` in the given `schema`. The function
 * creates a `TypeChatJsonValidator<T>` and stores it in the `validator` property of the returned instance.
 * @param model The language model to use for translating requests into JSON.
 * @param validator A string containing the TypeScript source code for the JSON schema.
 * @returns A `TypeChatJsonTranslator<T>` instance.
 */
export declare function createJsonTranslator<T extends object>(model: TypeChatLanguageModel, validator: TypeChatJsonValidator<T>): TypeChatJsonTranslator<T>;
