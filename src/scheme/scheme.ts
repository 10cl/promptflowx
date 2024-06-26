import {error, Result, success} from "./result";
import {createJsonTranslator, TypeChatJsonTranslator} from "./typechat";
import {PromptSection, TypeChatLanguageModel} from "./model";
import {createTypeScriptJsonValidator} from "./ts";
import {Context, PromptFlowNode} from "../index";

export interface Agent<T extends object> {
  handleMessage(message: string): Promise<Result<T>>;
};

interface JsonPrintAgent<T extends object> extends Agent<T> {
  _translator: TypeChatJsonTranslator<T>;
}

function createFetchLanguageModel(context: Context, dagNode: PromptFlowNode): TypeChatLanguageModel {
  const model: TypeChatLanguageModel = {
    complete
  };
  return model;

  async function complete(prompt: string | PromptSection[]) {
    let retryCount = 0;
    const retryMaxAttempts = model.retryMaxAttempts ?? 3;
    const retryPauseMs = model.retryPauseMs ?? 1000;
    let requestPrompt
    if (typeof prompt !== "string") {
      prompt.forEach(value => {
        if (value.role == "user") {
          requestPrompt = value.content
        }
      })
    } else {
      requestPrompt = prompt as string
    }

    if(!requestPrompt){
      return error("prompt undefined");
    }

    while (true) {
      if (!context.promptflowx.request){
        return error("LLM api undefined");
      }
      dagNode.output = await context.promptflowx.request(dagNode, requestPrompt)

      if (dagNode.output != "") {
        console.log("success")
        return success(dagNode.output);
      }

      if (retryCount >= retryMaxAttempts) {
        return error("REST API error");
      }
      await sleep(retryPauseMs);
      retryCount++;
    }

  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createJsonPrintAgent<T extends object>(
  context: Context,
  dagNode: PromptFlowNode,
  schema: string,
  typeName: string
): JsonPrintAgent<T> {
  const model = createFetchLanguageModel(context, dagNode);

  const validator = createTypeScriptJsonValidator<T>(schema, typeName)
  const _translator = createJsonTranslator<T>(model, validator);
  _translator.attemptRepair = true;
  return {
    _translator,
    handleMessage: _handleMessage
  };

  async function _handleMessage(request: string): Promise<Result<T>> {
    const response = await _translator.translate(request);
    if (response.success) {
      console.log("Translation Succeeded! ✅\n")
      console.log("JSON View")
      console.log(JSON.stringify(response.data, undefined, 2))
    } else {
      console.log("Translation Failed ❌")
      console.log(`Context: ${response.message}`)
    }
    return response;
  }
}
