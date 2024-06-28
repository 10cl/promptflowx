import {ofetch} from "ofetch";
import {Document} from "@langchain/core/documents";
import {VectorStoreRetriever} from "./retriver";
import {RemoteTransformersEmbeddings} from "./transformers";
import {CharacterTextSplitter, RecursiveCharacterTextSplitter, TokenTextSplitter} from "langchain/text_splitter";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import {
  Context, PromptChildDocNode,
  PromptChildEmbeddingNode,
} from "./index";
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {WebPDFLoader} from "langchain/document_loaders/web/pdf";
import {CSVLoader} from "langchain/document_loaders/fs/csv";

export async function loadDocuments(context: Context, url: string, doc: PromptChildDocNode) {
  const extension = extractFileExtension(url)
  try {
    if (context.promptflowx.cacheDoc && context.promptflowx.cacheDoc[url]){
      return context.promptflowx.cacheDoc[url].docs
    }
    let loader;
    let docs = []
    if (extension == "pdf") {
      const blob = await ofetch(url, {responseType: "blob"});
      loader = new WebPDFLoader(blob);
      docs = await loader.load()
    }else if (extension == "csv") {
      const blob = await ofetch(url, {responseType: "blob"});
      loader = new CSVLoader(blob);
      docs = await loader.load()
    } else {
      loader = new CheerioWebBaseLoader(url);
      docs = await loader.load();
    }
    return docs
  } catch (err) {
    throw Error("load document error: " + err)
  }
}


export function extractFileExtension(url: string) {
  const regex = /\.([a-z0-9]+)(?:[\?#]|$)/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function loadTextBySplitter(docs: Document[] | string, doc: PromptChildDocNode): Promise<Document[]> {
  let splitter = undefined

  if (doc.splitter && doc.splitter.name){

    const textSplitterParam = {
      chunkSize: doc.splitter.chunkSize,
      chunkOverlap: doc.splitter.chunkOverlap,
    }

    switch (doc.splitter.name) {
      case "character":
        splitter = new CharacterTextSplitter( {
          ...textSplitterParam,
          separator: doc.splitter.separator,
        });
        break
      case "recursive":
        splitter = new RecursiveCharacterTextSplitter({
          ...textSplitterParam,
          separators: doc.splitter.separators
        });
        break
      case "token":
        splitter = new TokenTextSplitter({
          ...textSplitterParam,
          encodingName: doc.splitter.encodingName,
        });
        break
      case "markdown":
        splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
          ...textSplitterParam,
          separators: doc.splitter.separators
        });
        break
      case "html":
        splitter = RecursiveCharacterTextSplitter.fromLanguage("html", {
          ...textSplitterParam,
          separators: doc.splitter.separators
        });
        break
      case "code":
        if (doc.splitter.language){
          splitter = RecursiveCharacterTextSplitter.fromLanguage(doc.splitter.language, {
            ...textSplitterParam,
            separators: doc.splitter.separators
          });
        }else{
          throw Error("splitter `language` not defined.");
        }
        break
    }
  }
  if (splitter == undefined){
    splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 1024,
      chunkOverlap: 20,
    });
  }
  return typeof docs == "string" ? await splitter.createDocuments([docs]) : await splitter.splitDocuments(docs)
}

export async function retrieveEmbedding(context: Context, embeddingNode: PromptChildEmbeddingNode) {
  const query = embeddingNode.query
  const docs = embeddingNode.doc

  let mark = ""
  if (docs.length > 0){
    mark = docs[0].metadata.mark;
  }

  if (!context.promptflowx.cacheDoc){
    context.promptflowx.cacheDoc = {}
  }

  let embeddingNumbers;
  if (context.promptflowx.cacheDoc[mark]){
    embeddingNumbers = context.promptflowx.cacheDoc[mark].embeddings
  }else{
    embeddingNumbers = await embeddingDocuments(context, docs)
    context.promptflowx.cacheDoc[mark] = {
      docs: docs,
      embeddings: embeddingNumbers
    }
  }

  return await getRetrieveDocuments(context, query, docs, embeddingNumbers)
}

export async function embeddingDocuments(context: Context, docs: Document[]) {
  const embeddingNumbers = [] as number[][]
  if (!context.promptflowx.embeddingRequest) {
    throw Error("Context not defined `embeddingRequest` function")
  }
  const embedding = new RemoteTransformersEmbeddings({}, context.promptflowx.embeddingRequest)

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    const res = await embedding.embedDocuments([doc.pageContent]);
    embeddingNumbers.push(res[0])
  }
  return embeddingNumbers
}

export async function getRetrieveDocuments(context: any, query: string, documents: Document[], embeddingNumbers: number[][]) {
  const vectorStore = new MemoryVectorStore(new RemoteTransformersEmbeddings({}, context.promptflowx.embeddingRequest));
  const retriever = new VectorStoreRetriever({
    vectorStore,
    memoryStream: [],
    searchKwargs: 2,
    k: 2,
  });
  await retriever.addDataSet(documents, embeddingNumbers)
  return await retriever.getRelevantDocuments(query)
}
