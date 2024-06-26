import {Embeddings, type EmbeddingsParams} from "@langchain/core/embeddings";
import {PromptNodeEmbeddingRequest} from "./index";

export class RemoteTransformersEmbeddings extends Embeddings {
  _request: PromptNodeEmbeddingRequest;

  constructor(inputs: EmbeddingsParams, asyncEmbeddingRequest: PromptNodeEmbeddingRequest) {
    super(inputs);
    this._request = asyncEmbeddingRequest
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const tokensArray: number[][] = [];

    for (const text of texts) {
      tokensArray.push(await this.encode(text));
    }

    const embeddings: number[][] = [];

    for (const tokens of tokensArray) {
      const embedArray: number[] = [];

      for (let i = 0; i < tokens.length; i += 1) {
        const nToken: number = +tokens[i];
        embedArray.push(nToken);
      }

      embeddings.push(embedArray);
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const tokens: number[] = [];
    const encodings = await this.encode(text)
    for (let i = 0; i < encodings.length; i += 1) {
      const token: number = +encodings[i];
      tokens.push(token);
    }

    return tokens;
  }

  async encode(text: string) {
    return this.caller.call(async () => {
      try {
        return this._request(text)
      }catch (err){
        throw err
      }
    });
  }

}
