import { Result } from "./result";
import { TypeChatJsonTranslator } from "./typechat";
import { Context, PromptFlowNode } from "../index";
export interface Agent<T extends object> {
    handleMessage(message: string): Promise<Result<T>>;
}
interface JsonPrintAgent<T extends object> extends Agent<T> {
    _translator: TypeChatJsonTranslator<T>;
}
export declare function createJsonPrintAgent<T extends object>(context: Context, dagNode: PromptFlowNode, schema: string, typeName: string): JsonPrintAgent<T>;
export {};
